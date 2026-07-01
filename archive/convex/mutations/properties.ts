import { v } from "convex/values";
import { mutationWithRLS } from "../rls";
import { mutation } from "../_generated/server";
import { parseNumericString } from "../lib/numeric";

// Property CRUD
export const createProperty = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    data: v.object({
      status: v.string(),
      code: v.optional(v.string()),
      name: v.string(),
      type: v.union(
        v.literal("building"),
        v.literal("house"),
        v.literal("unit"),
        v.literal("land"),
      ),
      riskStatus: v.optional(v.union(
        v.literal("high"),
        v.literal("moderate"),
        v.literal("safe")
      )),
      size: v.optional(v.object({ value: v.number(), unit: v.string(), display: v.string() })),
      valuation: v.optional(v.object({ estimated: v.number(), purchase: v.optional(v.number()), display: v.string() })),
    }),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const row = { 
      ...args.data, 
      riskStatus: (args.data as any).riskStatus ?? "safe",
      orgId: args.orgId, 
      documentCount: 0, 
      version: 1, 
      createdAt: now, 
      updatedAt: now 
    } as any;
    const id = await ctx.db.insert("property", row);
    return { id } as any;
  },
});

export const updateProperty = mutationWithRLS({
  args: { id: v.id("property"), updates: v.any() },
  handler: async (ctx, args) => {
    const found = await ctx.db.get(args.id);
    if (!found) throw new Error("Not found");
    if (args.updates && Object.prototype.hasOwnProperty.call(args.updates as any, "type")) {
      const t = (args.updates as any).type;
      const allowed = ["building", "house", "unit", "land"];
      if (!allowed.includes(t)) throw new Error("Invalid property type");
    }
    const now = new Date().toISOString();
    const willBump = ["status", "code", "name", "type", "size", "valuation"].some((k) => k in (args.updates ?? {}));
    const version = ((found as any).version ?? 0) + (willBump ? 1 : 0);
    await ctx.db.patch(args.id, { ...(args.updates as any), version, updatedAt: now } as any);
    return { id: args.id } as any;
  },
});

// export const deleteProperty = mutationWithRLS({
//   args: { id: v.id("property") },
//   handler: async (ctx, args) => {
//     await ctx.db.delete(args.id);
//     return { ok: true } as any;
//   },
// });

export const deleteProperty = mutationWithRLS({
  args: { id: v.id("property") },
  handler: async (ctx, args) => {
    const propertyId = args.id;

    const property = await ctx.db.get(propertyId);
    if (!property) {
      return { ok: true } as any;
    }
    const orgId = (property as any).orgId;

    // Lease domain cleanup (lease, parties, payments, lease documents)
    try {
      const leases = await ctx.db
        .query("lease")
        .withIndex("by_org_property", (q: any) => q.eq("orgId", orgId).eq("propertyId", propertyId))
        .collect();

      const leaseDocIds: string[] = [];

      for (const lease of leases) {
        const leaseId = (lease as any)?._id;
        if (!leaseId) continue;

        const payments = await ctx.db
          .query("lease_payment")
          .filter((q: any) => q.eq(q.field("leaseId"), leaseId))
          .collect();
        for (const p of payments) {
          await ctx.db.delete((p as any)._id);
        }

        const parties = await ctx.db
          .query("lease_party")
          .filter((q: any) => q.eq(q.field("leaseId"), leaseId))
          .collect();
        for (const lp of parties) {
          await ctx.db.delete((lp as any)._id);
        }

        const leaseDocs = await ctx.db
          .query("lease_document")
          .filter((q: any) => q.eq(q.field("leaseId"), leaseId))
          .collect();
        for (const ld of leaseDocs) {
          const docId = (ld as any)?.propertyDocumentId;
          if (docId) leaseDocIds.push(String(docId));
          await ctx.db.delete((ld as any)._id);
        }

        await ctx.db.delete(leaseId);
      }

      // Remove documents referenced by leases (and their files/folder links)
      if (leaseDocIds.length) {
        const uniqueDocIds = Array.from(new Set(leaseDocIds));
        for (const docId of uniqueDocIds) {
          try {
            const files = await ctx.db
              .query("document_files")
              .withIndex("by_document_page", (q: any) => q.eq("documentId", docId as any))
              .collect();
            for (const f of files) {
              await ctx.db.delete((f as any)._id);
            }

            const links = await ctx.db
              .query("document_folder_links")
              .withIndex("by_org_document", (q: any) => (q as any).eq("orgId", orgId).eq("documentId", docId as any))
              .collect();
            for (const l of links) {
              await ctx.db.delete((l as any)._id);
            }

            await ctx.db.delete(docId as any);
          } catch (error) {
            console.log("Skipping lease-linked document", { docId, error });
          }
        }
      }
    } catch (error) {
      console.log("Skipping lease cleanup", error);
    }

    // Remove documents tied directly to the property (and their files/folder links)
    try {
      const docs = await ctx.db
        .query("document")
        .withIndex("by_org_property_category", (q: any) => (q as any).eq("orgId", orgId).eq("propertyId", propertyId))
        .collect();
      const docIds = Array.isArray(docs) ? docs.map((d: any) => (d as any)?._id).filter(Boolean) : [];

      for (const docId of docIds) {
        try {
          const files = await ctx.db
            .query("document_files")
            .withIndex("by_document_page", (q: any) => q.eq("documentId", docId as any))
            .collect();
          for (const f of files) {
            await ctx.db.delete((f as any)._id);
          }

          const links = await ctx.db
            .query("document_folder_links")
            .withIndex("by_org_document", (q: any) => (q as any).eq("orgId", orgId).eq("documentId", docId as any))
            .collect();
          for (const l of links) {
            await ctx.db.delete((l as any)._id);
          }

          await ctx.db.delete(docId as any);
        } catch (error) {
          console.log("Skipping property document", { docId, error });
        }
      }
    } catch (error) {
      console.log("Skipping property document cleanup", error);
    }

    // Remove property-scoped folders and their links
    try {
      const folders = await ctx.db
        .query("document_folders")
        .filter((q: any) => q.eq(q.field("propertyId"), propertyId))
        .collect();
      for (const folder of folders) {
        const folderId = (folder as any)?._id;
        if (!folderId) continue;

        const links = await ctx.db
          .query("document_folder_links")
          .withIndex("by_org_folder", (q: any) => (q as any).eq("orgId", orgId).eq("folderId", folderId))
          .collect();
        for (const l of links) {
          await ctx.db.delete((l as any)._id);
        }

        await ctx.db.delete(folderId);
      }
    } catch (error) {
      console.log("Skipping property folder cleanup", error);
    }

    // Remove property images and underlying storage files
    try {
      const images = await ctx.db
        .query("property_image")
        .withIndex("by_org_property_type", (q: any) => (q as any).eq("orgId", orgId).eq("propertyId", propertyId))
        .collect();
      for (const img of images) {
        const storageId = (img as any)?.metadata?.storageId;
        if (storageId) {
          try {
            await ctx.storage.delete(storageId);
          } catch (error) {
            console.log("Skipping image storage delete", { storageId, error });
          }
        }
        await ctx.db.delete((img as any)._id);
      }
    } catch (error) {
      console.log("Skipping property image cleanup", error);
    }

    // List of related tables to cascade delete with their respective query methods
    const relatedTables = [
      { name: "property_location", hasIndex: true },
      { name: "property_location_point", hasIndex: true },
      { name: "property_location_boundary", hasIndex: true },
      { name: "property_location_feature", hasIndex: true },
      { name: "property_location_polygon", hasIndex: true },
      { name: "property_document", hasIndex: true },
      { name: "upload_session", hasIndex: true },
      { name: "upload_session_doc", hasIndex: true },
      { name: "property_preferences", hasIndex: true },
      { name: "property_owner", hasIndex: true },
      { name: "property_owner_membership", hasIndex: true },
      { name: "property_ownership_transaction", hasIndex: true },
      { name: "property_finance", hasIndex: true },
      { name: "property_type_building", hasIndex: true },
      { name: "property_type_house", hasIndex: true },
      { name: "property_type_unit", hasIndex: true },
      { name: "property_type_land", hasIndex: true },
      { name: "property_registry", hasIndex: true },
    ];

    for (const table of relatedTables) {
      try {
        let docs;
        if (table.hasIndex) {
          // Try to query with index first
          try {
            docs = await ctx.db
              .query(table.name)
              .withIndex("propertyId", (q: any) => q.eq("propertyId", propertyId))
              .collect();
          } catch (indexError) {
            // If index doesn't exist, fall back to full table scan
            docs = await ctx.db
              .query(table.name)
              .filter((q: any) => q.eq(q.field("propertyId"), propertyId))
              .collect();
          }
        } else {
          // Query without index
          docs = await ctx.db
            .query(table.name)
            .filter((q: any) => q.eq(q.field("propertyId"), propertyId))
            .collect();
        }
        
        // Delete all found documents
        for (const doc of docs) {
          await ctx.db.delete(doc._id);
        }
      } catch (error) {
        // If table doesn't exist or any other error, just continue
        console.log(`Skipping table ${table.name} due to error:`, error);
        continue;
      }
    }

    // Delete the property itself
    await ctx.db.delete(propertyId);

    return { ok: true } as any;
  },
});

// Location root
export const createPropertyLocation = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    kind: v.optional(v.union(v.literal("none"), v.literal("point"), v.literal("boundary"), v.literal("feature"), v.literal("polygon"))),
    mappingStatus: v.optional(v.union(
      v.literal("provided"),
      v.literal("none"),
      v.literal("progress")
    )),
    coordinates: v.optional(v.object({ lon: v.number(), lat: v.number() })),
    address: v.optional(v.string()),
    street: v.optional(v.string()),
    country: v.optional(v.string()),
    province: v.optional(v.string()),
    district: v.optional(v.string()),
    sangkat: v.optional(v.string()),
    phum: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    accuracy: v.optional(v.number()),
    precision: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("property_location", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const patchPropertyLocation = mutationWithRLS({
  args: { id: v.id("property_location"), updates: v.any() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.id, { ...(args.updates as any), updatedAt: now } as any);
    return { id: args.id } as any;
  },
});

export const deletePropertyLocation = mutationWithRLS({
  args: { id: v.id("property_location") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true } as any;
  },
});

// Location detail records
export const upsertLocationPoint = mutationWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), locationId: v.id("property_location"), coordinates: v.object({ lon: v.number(), lat: v.number() }) },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db.query("property_location_point").withIndex("by_location", (q: any) => q.eq("locationId", args.locationId)).first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { coordinates: args.coordinates, updatedAt: now } as any);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_location_point", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const upsertLocationBoundary = mutationWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), locationId: v.id("property_location"), boundaryRef: v.object({ level: v.union(v.literal("ADM0"), v.literal("ADM1"), v.literal("ADM2"), v.literal("ADM3")), code: v.string(), name: v.optional(v.string()) }) },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db.query("property_location_boundary").withIndex("by_location", (q: any) => q.eq("locationId", args.locationId)).first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { boundaryRef: args.boundaryRef, updatedAt: now } as any);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_location_boundary", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const upsertLocationFeature = mutationWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), locationId: v.id("property_location"), featureInfo: v.object({ id: v.union(v.number(), v.string()), target: v.object({ featuresetId: v.string(), importId: v.string() }), namespace: v.optional(v.string()), mapbox_id: v.optional(v.string()), source_layer: v.optional(v.string()), admin_level: v.optional(v.number()) }) },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db.query("property_location_feature").withIndex("by_location", (q: any) => q.eq("locationId", args.locationId)).first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { featureInfo: args.featureInfo, updatedAt: now } as any);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_location_feature", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const upsertLocationPolygon = mutationWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), locationId: v.id("property_location"), geometryRef: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db.query("property_location_polygon").withIndex("by_location", (q: any) => q.eq("locationId", args.locationId)).first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { geometryRef: args.geometryRef, updatedAt: now } as any);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_location_polygon", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

// Documents
export const addPropertyDocument = mutationWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), category: v.string(), s3Key: v.string(), s3Bucket: v.string(), s3VersionId: v.optional(v.string()), mimeType: v.string(), sizeBytes: v.optional(v.number()), title: v.optional(v.string()), metadata: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("property_document", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const deletePropertyDocument = mutationWithRLS({
  args: { id: v.id("property_document") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true } as any;
  },
});

// Images
export const addPropertyImage = mutationWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), imageUrl: v.string(), imageType: v.union(v.literal("main"), v.literal("secondary")), title: v.optional(v.string()), description: v.optional(v.string()), displayOrder: v.number(), metadata: v.object({ fileName: v.string(), fileSize: v.number(), mimeType: v.string(), uploadedAt: v.string(), dimensions: v.optional(v.object({ width: v.number(), height: v.number() })), storageId: v.optional(v.string()), derivatives: v.optional(v.object({ thumbUrl: v.optional(v.string()), previewUrl: v.optional(v.string()), originalUrl: v.optional(v.string()) })), alt: v.optional(v.string()) }) },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("property_image", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const updatePropertyImageOrder = mutationWithRLS({
  args: { id: v.id("property_image"), displayOrder: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { displayOrder: args.displayOrder } as any);
    return { id: args.id } as any;
  },
});

export const deletePropertyImage = mutationWithRLS({
  args: { id: v.id("property_image") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true } as any;
  },
});

// Delete a property image record and its underlying Convex storage file (when present)
export const removePropertyImage = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    imageId: v.optional(v.id("property_image")),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let image: any | null = null;
    if (args.imageId) {
      image = await ctx.db.get(args.imageId);
    }
    if (!image) {
      // Fallback: scan images for this property and match by storageId or imageUrl
      const imgs = await ctx.db
        .query("property_image")
        .withIndex("by_org_property_type", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
        .collect();
      image = imgs.find((it: any) => {
        const sid = (it as any)?.metadata?.storageId;
        return (args.storageId && String(sid) === String(args.storageId)) ||
               (args.imageUrl && String((it as any).imageUrl) === String(args.imageUrl));
      }) || null;
    }

    if (!image) {
      return { ok: true } as any;
    }

    const storageId = (image as any)?.metadata?.storageId || args.storageId;
    if (storageId) {
      try { await ctx.storage.delete(storageId); } catch {}
    }

    const toDeleteId = (image as any)._id || (image as any).id;
    if (toDeleteId) {
      await ctx.db.delete(toDeleteId);
    }

    // Resequence secondary images displayOrder
    const gallery = await ctx.db
      .query("property_image")
      .withIndex("by_org_property_type", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId).eq("imageType", "secondary"))
      .collect();
    gallery.sort((a: any, b: any) => ((a as any).displayOrder - (b as any).displayOrder));
    const now = new Date().toISOString();
    for (let i = 0; i < gallery.length; i++) {
      const it = gallery[i];
      if ((it as any).displayOrder !== i) {
        await ctx.db.patch((it as any)._id, { displayOrder: i, updatedAt: now } as any);
      }
    }

    return { ok: true } as any;
  },
});

export const setMainPropertyImage = mutationWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), imageId: v.id("property_image") },
  handler: async (ctx, args) => {
    const imgs = await ctx.db
      .query("property_image")
      .withIndex("by_org_property_type", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId).eq("imageType", "main"))
      .collect();
    // Demote existing main to secondary
    for (const img of imgs) {
      if (String((img as any)._id) !== String(args.imageId)) {
        await ctx.db.patch((img as any)._id, { imageType: "secondary" } as any);
      }
    }
    await ctx.db.patch(args.imageId, { imageType: "main" } as any);
    return { ok: true } as any;
  },
});

// Create a property image record from Convex Storage by storageId
export const addPropertyImageFromStorage = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    storageId: v.string(),
    fileName: v.string(),
    imageType: v.union(v.literal("main"), v.literal("secondary")),
    displayOrder: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dimensions: v.optional(v.object({ width: v.number(), height: v.number() })),
  },
  handler: async (ctx, args) => {
    const meta = await ctx.storage.getMetadata(args.storageId);
    if (!meta) throw new Error("Invalid storageId");
    const mimeType = (meta as any).contentType || "";
    const fileSize = (meta as any).size ?? 0;
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Failed to resolve file URL");
    const now = new Date().toISOString();
    const doc: any = {
      orgId: args.orgId,
      propertyId: args.propertyId,
      imageUrl: url,
      imageType: args.imageType,
      title: args.title,
      description: args.description,
      displayOrder: args.displayOrder,
      metadata: {
        fileName: args.fileName,
        fileSize,
        mimeType,
        uploadedAt: now,
        dimensions: args.dimensions,
        storageId: args.storageId,
        derivatives: { thumbUrl: url, previewUrl: url, originalUrl: url },
      },
      createdAt: now,
      updatedAt: now,
    };
    const id = await ctx.db.insert("property_image", doc);
    return { id } as any;
  },
});

// Generate Convex storage upload URL for property media (images/video/3D/LiDAR)
export const generatePropertyMediaUploadUrl = mutationWithRLS({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // RLS wrapper ensures the caller is an active member of args.orgId
    const postUrl = await ctx.storage.generateUploadUrl();
    return { postUrl } as any;
  },
});

// Owners
export const addPropertyOwner = mutationWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), ownerType: v.union(v.literal("person"), v.literal("company")), firstName: v.optional(v.string()), lastName: v.optional(v.string()), displayName: v.optional(v.string()), dateOfBirth: v.optional(v.string()), nationalId: v.optional(v.string()), email: v.optional(v.string()), phone: v.optional(v.string()), address: v.optional(v.string()), companyName: v.optional(v.string()), registrationNumber: v.optional(v.string()), relationship: v.optional(v.string()), share: v.optional(v.number()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("property_owner", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const updatePropertyOwner = mutationWithRLS({
  args: { id: v.id("property_owner"), updates: v.any() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.patch(args.id, { ...(args.updates as any), updatedAt: now } as any);
    return { id: args.id } as any;
  },
});

export const deletePropertyOwner = mutationWithRLS({
  args: { id: v.id("property_owner") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true } as any;
  },
});


// =============================
// Per-type detail upserts
// =============================

export const upsertPropertyTypeBuilding = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    floors: v.optional(v.number()),
    elevators: v.optional(v.number()),
    grossFloorAreaSqm: v.optional(v.number()),
    netFloorAreaSqm: v.optional(v.number()),
    parkingSpaces: v.optional(v.number()),
    yearBuilt: v.optional(v.string()),
    amenities: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const prop = await ctx.db.get(args.propertyId);
    if (!prop) throw new Error("Property not found");
    if ((prop as any).type !== "building") throw new Error("Property type mismatch: expected building");
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("property_type_building")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { ...args, updatedAt: now } as any);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_type_building", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

// =============================
// Finance upsert
// =============================
export const upsertPropertyFinance = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    purchaseAmount: v.optional(v.string()),
    purchaseCurrency: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    lastValuationAmount: v.optional(v.string()),
    lastValuationCurrency: v.optional(v.string()),
    lastValuationDate: v.optional(v.string()),
    valuationBy: v.optional(v.string()),
    taxAmount: v.optional(v.string()),
    taxCurrency: v.optional(v.string()),
    taxPeriod: v.optional(v.string()),
    taxStatus: v.optional(v.string()),
    status: v.optional(v.string()),
    rentalIncomeAmount: v.optional(v.string()),
    rentalIncomeCurrency: v.optional(v.string()),
    rentalIncomePeriod: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceCoverageAmount: v.optional(v.string()),
    insuranceCoverageCurrency: v.optional(v.string()),
    insuranceExpiryDate: v.optional(v.string()),
    insurancePremiumAmount: v.optional(v.string()),
    insurancePremiumCurrency: v.optional(v.string()),
    insurancePremiumPeriod: v.optional(v.string()),
    notes: v.optional(v.string()),
    customJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    // Use parseNumericString which sanitizes and returns undefined for invalid/NaN values
    const parseNum = (s?: string) => parseNumericString(s);
    const purchasePrice =
      args.purchaseAmount || args.purchaseCurrency || args.purchaseDate
        ? { amount: parseNum(args.purchaseAmount) ?? 0, currency: args.purchaseCurrency ?? "", date: args.purchaseDate }
        : undefined;
    const lastValuation =
      args.lastValuationAmount || args.lastValuationCurrency || args.lastValuationDate
        ? { amount: parseNum(args.lastValuationAmount) ?? 0, currency: args.lastValuationCurrency ?? "", date: args.lastValuationDate ?? "" }
        : undefined;
    const taxAmount =
      args.taxAmount || args.taxCurrency || args.taxPeriod
        ? { amount: parseNum(args.taxAmount) ?? 0, currency: args.taxCurrency ?? "", period: args.taxPeriod }
        : undefined;
    const rentalIncome =
      args.rentalIncomeAmount || args.rentalIncomeCurrency || args.rentalIncomePeriod
        ? { amount: parseNum(args.rentalIncomeAmount) ?? 0, currency: args.rentalIncomeCurrency ?? "", period: args.rentalIncomePeriod ?? "" }
        : undefined;

    const row = {
      orgId: args.orgId,
      propertyId: args.propertyId,
      purchasePrice,
      lastValuation,
      valuationBy: args.valuationBy ?? undefined,
      taxAmount,
      taxStatus: args.taxStatus as any ?? undefined,
      status: args.status as any ?? undefined,
      rentalIncome,
      insuranceProvider: args.insuranceProvider ?? undefined,
      insurancePolicyNumber: args.insurancePolicyNumber ?? undefined,
      insuranceCoverage: args.insuranceCoverageAmount || args.insuranceCoverageCurrency ? { amount: parseNum(args.insuranceCoverageAmount) ?? 0, currency: args.insuranceCoverageCurrency ?? undefined } : undefined,
      insuranceExpiryDate: args.insuranceExpiryDate ?? undefined,
      insurancePremium: args.insurancePremiumAmount || args.insurancePremiumCurrency || args.insurancePremiumPeriod ? { amount: parseNum(args.insurancePremiumAmount) ?? 0, currency: args.insurancePremiumCurrency ?? undefined, period: args.insurancePremiumPeriod } : undefined,
      notes: args.notes ?? undefined,
      updatedAt: now,
      createdAt: now,
    } as any;

    const existing = await ctx.db
      .query("property_finance")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, row);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_finance", row);
    return { id } as any;
  },
});

export const upsertPropertyTypeHouse = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    variant: v.union(v.literal("house"), v.literal("shophouse")),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    stories: v.optional(v.number()),
    houseAreaSqm: v.optional(v.number()),
    lotAreaSqm: v.optional(v.number()),
    parkingSpaces: v.optional(v.number()),
    yearBuilt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const prop = await ctx.db.get(args.propertyId);
    if (!prop) throw new Error("Property not found");
    if ((prop as any).type !== "house") throw new Error("Property type mismatch: expected house");
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("property_type_house")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { ...args, updatedAt: now } as any);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_type_house", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const upsertPropertyTypeUnit = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    variant: v.union(v.literal("apartment"), v.literal("condo")),
    buildingName: v.optional(v.string()),
    unitNumber: v.optional(v.string()),
    floor: v.optional(v.number()),
    buildingType: v.optional(v.string()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    areaSqm: v.optional(v.number()),
    orientation: v.optional(v.string()),
    hoaFeeAmount: v.optional(v.number()),
    hoaFeeCurrency: v.optional(v.string()),
    yearBuilt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const prop = await ctx.db.get(args.propertyId);
    if (!prop) throw new Error("Property not found");
    if ((prop as any).type !== "unit") throw new Error("Property type mismatch: expected unit");
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("property_type_unit")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { ...args, updatedAt: now } as any);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_type_unit", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const upsertPropertyTypeLand = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    lotAreaSqm: v.optional(v.number()),
    zoning: v.optional(v.string()),
    frontageMeters: v.optional(v.number()),
    depthMeters: v.optional(v.number()),
    services: v.optional(v.array(v.string())),
    parcelId: v.optional(v.string()),
    titleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const prop = await ctx.db.get(args.propertyId);
    if (!prop) throw new Error("Property not found");
    if ((prop as any).type !== "land") throw new Error("Property type mismatch: expected land");
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("property_type_land")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { ...args, updatedAt: now } as any);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_type_land", { ...args, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

// Registry/title and base info upsert
export const savePropertyInfo = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    titleType: v.optional(v.union(v.literal("soft"), v.literal("hard"), v.literal("strata"), v.literal("other"))),
    titleTypeOther: v.optional(v.string()),
    parcelCodeDocuments: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    referenceCode: v.optional(v.string()),
    sizeArea: v.optional(v.string()),
    customJson: v.optional(v.string()),
    // Also allow bumping base property fields
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    size: v.optional(v.object({ value: v.number(), unit: v.string(), display: v.string() })),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    if (args.name || args.code || args.size) {
      const will: any = {};
      if (args.name) will.name = args.name;
      if (args.code) will.code = args.code;
      if (args.size) will.size = args.size;
      const found = await ctx.db.get(args.propertyId);
      if (found) {
        const version = ((found as any).version ?? 0) + 1;
        await ctx.db.patch(args.propertyId, { ...will, version, updatedAt: now } as any);
      }
    }
    const payloadBase = {
      orgId: args.orgId,
      propertyId: args.propertyId,
      updatedAt: now,
    } as any;
    const optionalFields: any = {};
    if (typeof args.titleType !== 'undefined') optionalFields.titleType = args.titleType;
    if (typeof args.titleTypeOther !== 'undefined') optionalFields.titleTypeOther = args.titleTypeOther;
    if (typeof args.parcelCodeDocuments !== 'undefined') optionalFields.parcelCodeDocuments = args.parcelCodeDocuments;
    if (typeof args.issueDate !== 'undefined') optionalFields.issueDate = args.issueDate;
    if (typeof args.referenceCode !== 'undefined') optionalFields.referenceCode = args.referenceCode;
    if (typeof args.sizeArea !== 'undefined') optionalFields.sizeArea = args.sizeArea;
    if (typeof args.customJson !== 'undefined') optionalFields.customJson = args.customJson;
    const payload = { ...payloadBase, ...optionalFields } as any;
    const existing = await ctx.db
      .query("property_registry")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    if (existing) {
      // Preserve original createdAt on update
      await ctx.db.patch((existing as any)._id, payload);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_registry", { ...payload, createdAt: now });
    return { id } as any;
  },
});

// Preferences upsert
export const upsertPropertyPreferences = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    taxReminders: v.optional(v.boolean()),
    valuationUpdate: v.optional(v.boolean()),
    succession: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("property_preferences")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    const row = {
      orgId: args.orgId,
      propertyId: args.propertyId,
      taxReminders: args.taxReminders,
      valuationUpdate: args.valuationUpdate,
      succession: args.succession,
      updatedAt: now,
      createdAt: now,
    } as any;
    if (existing) {
      await ctx.db.patch((existing as any)._id, row);
      return { id: (existing as any)._id } as any;
    }
    const id = await ctx.db.insert("property_preferences", row);
    return { id } as any;
  },
});
