"use node";

import { jwtDecrypt, type JWTPayload } from "jose";
import { createHash } from "node:crypto";

export type { JWTPayload };

export const decryptToken = async (token: string, secret: string) => {
  if (!token) {
    throw new Error("Token is required");
  }

  if (!secret || secret.length < 32) {
    throw new Error("Valid secret is required");
  }

  try {
    // Derive a 32-byte key for A256GCM decryption using SHA-256
    // This matches the encryption key derivation in createScanJWT
    const keyBuffer = createHash("sha256").update(secret).digest();
    const keyMaterial = new Uint8Array(keyBuffer);
    const { payload } = await jwtDecrypt(token, keyMaterial);
    return payload;
  } catch (err) {
    console.error("Error decrypting token", err);
    throw new Error("Invalid or expired token");
  }
};

