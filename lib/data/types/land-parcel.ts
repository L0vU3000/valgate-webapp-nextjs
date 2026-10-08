import { z } from "zod";
import { idSchema, propertyIdSchema } from "./_common";

export const TerrainTypeSchema = z.enum(["Flat", "Rolling", "Hilly", "Mountainous", "Mixed"]);
export type TerrainType = z.infer<typeof TerrainTypeSchema>;

// A land boundary is GeoJSON geometry: a Polygon (what a KMZ import produces today) or a
// MultiPolygon (a hand-drawn or multi-part parcel later). Only the two members are accepted —
// a Point or LineString has no interior, so it cannot be a boundary.
export const BoundaryGeometrySchema = z.object({
  type: z.enum(["Polygon", "MultiPolygon"]),
  coordinates: z.array(z.unknown()),
});
export type BoundaryGeometry = z.infer<typeof BoundaryGeometrySchema>;

export const LandParcelSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  sizeM2: z.number().nonnegative(),
  widthM: z.number().nonnegative().optional(),
  lengthM: z.number().nonnegative().optional(),
  zoningCode: z.string().optional(),
  zoningClass: z.string().optional(),
  developmentPotential: z.array(z.string()).optional(),
  // Measured boundary + provenance. sizeM2 above is the MEASURED area when a boundary exists
  // (properties.totalArea stays the officially-declared figure); both are shown, never merged.
  boundary: BoundaryGeometrySchema.optional(),
  // Where the ring came from. 'cadastre' is the French official parcel (hover-and-pick);
  // 'kmz' is an uploaded survey file; 'manual' is drawn in-app, still unwired.
  boundarySource: z.enum(["kmz", "manual", "cadastre"]).optional(),
  // The cadastral parcel this boundary was taken from, e.g. '75101000AJ0002'. Provenance only —
  // kept so a re-import can tell WHICH parcel the ring came from, which is unrecoverable from the
  // geometry alone.
  cadastreRef: z.string().optional(),
  elevationM: z.number().optional(),
  slopeAngleDeg: z.number().optional(),
  terrainType: TerrainTypeSchema.optional(),
});

export type LandParcel = z.infer<typeof LandParcelSchema>;

export const NewLandParcelSchema = LandParcelSchema.omit({ id: true });
export type NewLandParcel = z.infer<typeof NewLandParcelSchema>;
export const LandParcelPatchSchema = NewLandParcelSchema.partial();
export type LandParcelPatch = z.infer<typeof LandParcelPatchSchema>;
