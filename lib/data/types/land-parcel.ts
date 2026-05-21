import { z } from "zod";
import { idSchema, propertyIdSchema } from "./_common";

export const TerrainTypeSchema = z.enum(["Flat", "Rolling", "Hilly", "Mountainous", "Mixed"]);
export type TerrainType = z.infer<typeof TerrainTypeSchema>;

export const LandParcelSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  sizeM2: z.number().nonnegative(),
  widthM: z.number().nonnegative().optional(),
  lengthM: z.number().nonnegative().optional(),
  zoningCode: z.string().optional(),
  zoningClass: z.string().optional(),
  developmentPotential: z.array(z.string()).optional(),
  elevationM: z.number().optional(),
  slopeAngleDeg: z.number().optional(),
  terrainType: TerrainTypeSchema.optional(),
});

export type LandParcel = z.infer<typeof LandParcelSchema>;
