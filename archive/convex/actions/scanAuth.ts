"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { jwtDecrypt } from "jose";
import { createHash } from "node:crypto";
import crypto from "node:crypto";

export const decryptScanToken = action({
  args: {
    token: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("AUTH_JWT_SECRET is not configured");
    }

    try {
      // Derive a 32-byte key for A256GCM decryption using SHA-256
      // This matches the encryption key derivation in createScanJWT
      const keyBuffer = createHash("sha256").update(secret).digest();
      const keyMaterial = new Uint8Array(keyBuffer);
      const { payload } = await jwtDecrypt(args.token, keyMaterial);
      return payload;
    } catch (err) {
      console.error("Error decrypting token", err);
      throw new Error("Invalid or expired token");
    }
  },
});

export const generateUUID = action({
  args: {},
  returns: v.string(),
  handler: async () => {
    return crypto.randomUUID();
  },
});

