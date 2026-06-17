import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";

// A Client is an owner the professional manager works on behalf of.
// It is an engagement-level entity: properties point at it via
// Property.clientId, and every Pro rollup groups by that link.
// It deliberately does NOT replace the ownership schema
// (OwnershipRecord / CoOwner) — those stay property-level facts.

export const clientTypeSchema = z.enum(["Individual", "Corporate"]);
export type ClientType = z.infer<typeof clientTypeSchema>;

export const ClientSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  name: z.string().min(1),
  clientType: clientTypeSchema,
  initials: z.string().min(1),
  avatarBg: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  preferredContact: z.enum(["Email", "Phone"]).optional(),
  clientSince: timestampSchema,
  managementFeePct: z.number().min(0).max(100).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Client = z.infer<typeof ClientSchema>;
