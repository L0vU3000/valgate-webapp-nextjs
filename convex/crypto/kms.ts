"use node";

import { webcrypto as nodeWebcrypto, randomBytes } from "node:crypto";
import { Logger } from "@/lib/utils/logger";
import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from "@aws-sdk/client-kms";

const cryptoImpl: Crypto = (globalThis as any).crypto ?? (nodeWebcrypto as unknown as Crypto);

export type EnvelopeAlgo = "AES-256-GCM";

export type Envelope = {
  algo: EnvelopeAlgo;
  ivB64: string;
  aadV: number;
  dekCiphertextB64: string;
  ciphertextB64: string;
};

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function jsonUtf8(input: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(input ?? {}));
}

function toBufferSource(u8: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(u8.length);
  copy.set(u8);
  return copy.buffer;
}

async function importAesGcmKey(rawKey: Uint8Array) {
  return await cryptoImpl.subtle.importKey(
    "raw",
    toBufferSource(rawKey),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function randomBytesUint8(length: number): Uint8Array {
  if ((cryptoImpl as any).getRandomValues) {
    const buf = new Uint8Array(length);
    (cryptoImpl as any).getRandomValues(buf);
    return buf;
  }
  return new Uint8Array(randomBytes(length));
}

// DEV fallback for KMS wrapping: stores plaintext DEK as base64 with a prefix.
// In production with KMS configured, you must replace these with actual KMS calls.
async function kmsWrapKeyLocal(devKey: Uint8Array): Promise<string> {
  return "dev:" + toBase64(devKey);
}

async function kmsUnwrapKeyLocal(wrappedB64: string): Promise<Uint8Array> {
  if (!wrappedB64.startsWith("dev:")) throw new Error("Unsupported KMS ciphertext in dev mode");
  return fromBase64(wrappedB64.slice(4));
}

export type EncryptParams = {
  plaintext: string | Uint8Array;
  aad: Record<string, unknown>; // must be reproduced identically for decryption
  aadVersion?: number; // default 1
};

export async function encryptEnvelope(params: EncryptParams): Promise<Envelope> {
  const { plaintext, aad, aadVersion = 1 } = params;
  const dek = randomBytesUint8(32);
  const iv = randomBytesUint8(12);
  const key = await importAesGcmKey(dek);
  const ptBytes = typeof plaintext === "string" ? new TextEncoder().encode(plaintext) : plaintext;
  const additionalData = jsonUtf8(aad);
  const ciphertext = new Uint8Array(
    await cryptoImpl.subtle.encrypt({ name: "AES-GCM", iv: toBufferSource(iv), additionalData: toBufferSource(additionalData), tagLength: 128 }, key, toBufferSource(ptBytes)),
  );

  const kmsKeyArn = process.env.KMS_KEY_ARN;
  let dekCiphertextB64: string;
  if (kmsKeyArn) {
    try {
      const region = process.env.KMS_REGION || process.env.AWS_REGION || "us-east-1";
      const kms = new KMSClient({ region });
      const encContext: Record<string, string> = {};
      try {
        // Flatten AAD keys into strings for EncryptionContext
        for (const [k, v] of Object.entries(aad)) encContext[k] = String(v);
      } catch {}
      // Generate a fresh DEK wrapped by KMS; prefer GenerateDataKey for envelope pattern
      const gdk = await kms.send(new GenerateDataKeyCommand({
        KeyId: kmsKeyArn,
        KeySpec: "AES_256",
        EncryptionContext: encContext,
      }));
      const plain = gdk.Plaintext;
      const wrapped = gdk.CiphertextBlob;
      if (!plain || !wrapped) throw new Error("KMS GenerateDataKey missing outputs");
      // Overwrite locally generated dek with KMS-provided plaintext DEK
      const dekFromKms = new Uint8Array(plain as Uint8Array);
      const kmsKey = await importAesGcmKey(dekFromKms);
      const ciphertext = new Uint8Array(
        await cryptoImpl.subtle.encrypt({ name: "AES-GCM", iv: toBufferSource(iv), additionalData: toBufferSource(additionalData), tagLength: 128 }, kmsKey, toBufferSource(ptBytes)),
      );
      return {
        algo: "AES-256-GCM",
        ivB64: toBase64(iv),
        aadV: aadVersion,
        dekCiphertextB64: toBase64(new Uint8Array(wrapped as Uint8Array)),
        ciphertextB64: toBase64(ciphertext),
      };
    } catch (e: any) {
      Logger.error("KMS GenerateDataKey failed; falling back to dev local key wrap", e);
      dekCiphertextB64 = await kmsWrapKeyLocal(dek);
    }
  } else {
    dekCiphertextB64 = await kmsWrapKeyLocal(dek);
  }

  return {
    algo: "AES-256-GCM",
    ivB64: toBase64(iv),
    aadV: aadVersion,
    dekCiphertextB64,
    ciphertextB64: toBase64(ciphertext),
  };
}

export type DecryptParams = {
  envelope: Envelope;
  aad: Record<string, unknown>; // same structure used during encryption
};

// export async function decryptEnvelope(params: DecryptParams): Promise<Uint8Array> {
//   const { envelope, aad } = params;
//   if (envelope.algo !== "AES-256-GCM") throw new Error("Unsupported algorithm");

//   const kmsKeyArn = process.env.KMS_KEY_ARN;
//   let dek: Uint8Array;
//   if (kmsKeyArn) {
//     try {
//       const region = process.env.KMS_REGION || process.env.AWS_REGION || "us-east-1";
//       const kms = new KMSClient({ region });
//       const encContext: Record<string, string> = {};
//       try { for (const [k, v] of Object.entries(aad)) encContext[k] = String(v); } catch {}
//       const res = await kms.send(new DecryptCommand({
//         CiphertextBlob: fromBase64(envelope.dekCiphertextB64),
//         EncryptionContext: encContext,
//         KeyId: kmsKeyArn,
//       }));
//       const plain = res.Plaintext;
//       if (!plain) throw new Error("KMS Decrypt returned no plaintext");
//       dek = new Uint8Array(plain as Uint8Array);
//     } catch (e: any) {
//       Logger.error("KMS Decrypt failed; attempting dev local unwrap", e);
//       dek = await kmsUnwrapKeyLocal(envelope.dekCiphertextB64);
//     }
//   } else {
//     dek = await kmsUnwrapKeyLocal(envelope.dekCiphertextB64);
//   }

//   const key = await importAesGcmKey(dek);
//   const iv = fromBase64(envelope.ivB64);
//   const additionalData = jsonUtf8(aad);
//   const ct = fromBase64(envelope.ciphertextB64);
//   const plaintext = new Uint8Array(
//     await cryptoImpl.subtle.decrypt({ name: "AES-GCM", iv: toBufferSource(iv), additionalData: toBufferSource(additionalData), tagLength: 128 }, key, toBufferSource(ct)),
//   );
//   return plaintext;
// }

function normalizeAad(aad: Record<string, unknown> = {}): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(aad).sort()) sorted[key] = aad[key];
  return sorted;
}

function aadToEncryptionContext(aad: Record<string, unknown>): Record<string, string> {
  const ctx: Record<string, string> = {};
  for (const [k, v] of Object.entries(aad)) ctx[k] = String(v);
  return ctx;
}

export async function decryptEnvelope(params: DecryptParams): Promise<Uint8Array> {
  const { envelope, aad } = params;
  if (envelope.algo !== "AES-256-GCM") throw new Error("Unsupported algorithm");

  const normalizedAad = normalizeAad(aad);
  const kmsKeyArn = process.env.KMS_KEY_ARN;
  let dek: Uint8Array;

  if (kmsKeyArn) {
    try {
      const region = process.env.KMS_REGION || process.env.AWS_REGION || "us-east-1";
      const kms = new KMSClient({ region });
      const res = await kms.send(new DecryptCommand({
        CiphertextBlob: fromBase64(envelope.dekCiphertextB64),
        EncryptionContext: aadToEncryptionContext(normalizedAad),
        KeyId: kmsKeyArn,
      }));
      const plain = res.Plaintext;
      if (!plain) throw new Error("KMS Decrypt returned no plaintext");
      dek = new Uint8Array(plain as Uint8Array);
    } catch (err) {
      Logger.error("KMS Decrypt failed; attempting dev local unwrap", err);
      dek = await kmsUnwrapKeyLocal(envelope.dekCiphertextB64);
    }
  } else {
    dek = await kmsUnwrapKeyLocal(envelope.dekCiphertextB64);
  }

  const key = await importAesGcmKey(dek);
  const iv = fromBase64(envelope.ivB64);
  const additionalData = jsonUtf8(normalizedAad);
  const ct = fromBase64(envelope.ciphertextB64);

  try {
    return new Uint8Array(
      await cryptoImpl.subtle.decrypt(
        { name: "AES-GCM", iv: toBufferSource(iv), additionalData: toBufferSource(additionalData), tagLength: 128 },
        key,
        toBufferSource(ct),
      ),
    );
  } catch (err) {
    Logger.error("AES-GCM decrypt failed", err);
    throw err;
  }
}

