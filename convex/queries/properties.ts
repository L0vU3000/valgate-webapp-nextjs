import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { queryWithRLS } from "../rls";

// Properties: list with optional filters/sorting & pagination
export const listProperties = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(v.string()),
    code: v.optional(v.string()),
    query: v.optional(v.string()),
    sort: v.optional(v.object({ field: v.string(), direction: v.string() })),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = Math.max(1, Math.floor(args.page ?? 1));
    const pageSize = Math.max(1, Math.floor(args.pageSize ?? Number.MAX_SAFE_INTEGER));

    let base = args.status
      ? ctx.db.query("property").withIndex("by_org_status", (q: any) => q.eq("orgId", args.orgId).eq("status", args.status))
      : ctx.db.query("property").withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId));

    //console.log("base",base)
    if (args.code) base = (base as any).withIndex("by_org_code", (q: any) => q.eq("orgId", args.orgId).eq("code", args.code));
    if (args.query && args.query.trim()) {
      const qtext = args.query.trim().toLowerCase();
      base = (base as any).filter((q: any) =>
        q.or(
          q.contains(q.lower(q.field("name")), qtext),
          q.contains(q.lower(q.field("type")), qtext)
        )
      );
    }

    const all = await (base as any).collect();

    const field = args.sort?.field ?? "updatedAt";
    const dir = (args.sort?.direction ?? "desc").toLowerCase();
    const mul = dir === "asc" ? 1 : -1;
    const ordered = all.sort((a: any, b: any) => (a[field] === b[field] ? 0 : (a[field] > b[field] ? 1 : -1) * mul));

    const total = ordered.length;
    const start = (page - 1) * pageSize;
    const items = ordered.slice(start, start + pageSize);
    return { items, total, page, pageSize } as any;
  },
});

export const getProperty = queryWithRLS({
  args: { id: v.id("property") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    return doc ?? null;
  },
});

// Locations for a given property
export const listLocationsForProperty = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("property_location")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .collect();
    return rows as any[];
  },
});

export const getLocationDetails = queryWithRLS({
  args: { locationId: v.id("property_location") },
  handler: async (ctx, args) => {
    const base = await ctx.db.get(args.locationId);
    if (!base) return null;
    const [point, boundary, feature, polygon] = await Promise.all([
      ctx.db.query("property_location_point").withIndex("by_location", (q: any) => q.eq("locationId", args.locationId)).first(),
      ctx.db.query("property_location_boundary").withIndex("by_location", (q: any) => q.eq("locationId", args.locationId)).first(),
      ctx.db.query("property_location_feature").withIndex("by_location", (q: any) => q.eq("locationId", args.locationId)).first(),
      ctx.db.query("property_location_polygon").withIndex("by_location", (q: any) => q.eq("locationId", args.locationId)).first(),
    ]);
    // Prefer base.coordinates when present; else fallback to point.coordinates
    const coordinates = (base as any).coordinates ?? (point as any)?.coordinates ?? undefined;
    return { base: { ...base, coordinates }, point, boundary, feature, polygon } as any;
  },
});

// Expanded locations for a given property (details for each location)
export const listLocationDetailsForProperty = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property") },
  handler: async (ctx, args) => {
    const locations = await ctx.db
      .query("property_location")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .collect();

    const expanded = await Promise.all(
      locations.map(async (loc: any) => {
        const [point, boundary, feature, polygon] = await Promise.all([
          ctx.db.query("property_location_point").withIndex("by_location", (q: any) => q.eq("locationId", loc._id)).first(),
          ctx.db.query("property_location_boundary").withIndex("by_location", (q: any) => q.eq("locationId", loc._id)).first(),
          ctx.db.query("property_location_feature").withIndex("by_location", (q: any) => q.eq("locationId", loc._id)).first(),
          ctx.db.query("property_location_polygon").withIndex("by_location", (q: any) => q.eq("locationId", loc._id)).first(),
        ]);
        const coordinates = (loc as any).coordinates ?? (point as any)?.coordinates ?? undefined;
        return { base: { ...loc, coordinates }, point, boundary, feature, polygon } as any;
      })
    );

    return expanded as any[];
  },
});

export const listDocumentsForProperty = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), category: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let base = ctx.db
      .query("document")
      .withIndex("by_org_property_category", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId));
    if (args.category) base = (base as any).withIndex("by_org_property_category", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId).eq("category", args.category));
    const docs = await (base as any).collect();
    docs.sort((a: any, b: any) => (a.createdAt > b.createdAt ? -1 : 1));
    return typeof args.limit === "number" ? docs.slice(0, Math.max(0, args.limit)) : docs;
  },
});

export const listImagesForProperty = queryWithRLS({
  args: { 
    orgId: v.id("orgs"), 
    propertyId: v.id("property"), 
    imageType: v.optional(v.union(v.literal("main"), v.literal("secondary"))) 
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("property_image")
      .withIndex("by_org_property_type", (q) => {
        const baseQuery = (q as any).eq("orgId", args.orgId).eq("propertyId", args.propertyId);
        return args.imageType ? baseQuery.eq("imageType", args.imageType) : baseQuery;
      });
    
    const imgs = await query.collect();
    imgs.sort((a, b) => a.displayOrder - b.displayOrder);
    return imgs;
  },
});

export const listOwnersForProperty = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property") },
  handler: async (ctx, args) => {
    const owners = await ctx.db
      .query("property_owner")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .collect();
    return owners as any[];
  },
});

export const listOwnersForOrg = queryWithRLS({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const owners = await ctx.db
      .query("property_owner")
      .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId))
      .collect();
    return owners as any[];
  },
});

// Unique provinces for all properties in an org (based on locations)
export const listProvincesForOrg = queryWithRLS({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const seen = new Set<string>();
    const locations = ctx.db
      .query("property_location")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId));

    // Stream over all locations for the org and collect distinct non-empty province names.
    for await (const loc of locations as any) {
      const prov = String((loc as any).province || "").trim();
      if (prov) seen.add(prov);
    }

    return Array.from(seen).sort() as any[];
  },
});


// =============================
// Per-type details fetcher
// =============================
export const getPropertyTypeDetails = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property") },
  handler: async (ctx, args) => {
    const prop = await ctx.db.get(args.propertyId);
    if (!prop) return null;
    const type = (prop as any).type as string;
    if (type === "building") {
      const detail = await ctx.db
        .query("property_type_building")
        .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
        .first();
      return { type, detail } as any;
    }
    if (type === "house") {
      const detail = await ctx.db
        .query("property_type_house")
        .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
        .first();
      return { type, detail } as any;
    }
    if (type === "unit") {
      const detail = await ctx.db
        .query("property_type_unit")
        .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
        .first();
      return { type, detail } as any;
    }
    if (type === "land") {
      const detail = await ctx.db
        .query("property_type_land")
        .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
        .first();
      return { type, detail } as any;
    }
    return { type, detail: null } as any;
  },
});

// Finance fetcher
export const getPropertyFinance = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("property_finance")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    return row ?? null;
  },
});

// Registry fetcher
export const getPropertyInfo = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("property_registry")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    if (!row) return null;
    // Ensure callers always see the full shape with explicit nulls for missing optional fields
    const defaults = {
      titleType: null,
      titleTypeOther: null,
      parcelCodeDocuments: null,
      issueDate: null,
      referenceCode: null,
      sizeArea: null,
      customJson: null,
    } as const;
    return { ...defaults, ...row } as any;
  },
});

// Preferences fetcher
export const getPropertyPreferences = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("property_preferences")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .first();
    return row ?? null;
  },
});

// =============================
// Aggregated org metrics
// =============================
export const orgMetrics = queryWithRLS({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Load org-scoped datasets using indexes to avoid table scans
    const [properties, locations, docs, finances] = await Promise.all([
      ctx.db
        .query("property")
        .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId))
        .collect(),
      ctx.db
        .query("property_location")
        .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId))
        .collect(),
      ctx.db
        .query("document")
        .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId))
        .collect(),
      ctx.db
        .query("property_finance")
        .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId))
        .collect(),
    ]);

    const totalProps = properties.length;

    // Progress average (rounded) — weighted pillar completeness score
    const progressAvg = totalProps > 0
      ? Math.round(
          properties.reduce((sum: number, p: any) => sum + (typeof p.progress === "number" ? p.progress : 0), 0) /
            totalProps,
        )
      : 0;

    // Mapping status counts from locations
    const mappingCounts = { provided: 0, none: 0, progress: 0 } as Record<string, number>;
    for (const loc of locations as any[]) {
      const ms = String((loc as any).mappingStatus || "").toLowerCase();
      if (ms === "provided") mappingCounts.provided += 1;
      else if (ms === "progress") mappingCounts.progress += 1;
      else mappingCounts.none += 1;
    }

    // Risk counts from property.riskStatus
    const riskCounts = { high: 0, moderate: 0 } as Record<string, number>;
    for (const p of properties as any[]) {
      const rs = (p as any).riskStatus as string | undefined;
      if (rs === "high") riskCounts.high += 1;
      if (rs === "moderate") riskCounts.moderate += 1;
    }

    // Valuation total from property.valuation.estimated, fallback to finance.lastValuation.amount
    const propertyIdToFinance = new Map<string, any>();
    for (const f of finances as any[]) propertyIdToFinance.set(String((f as any).propertyId), f);
    let totalEstimatedValuation = 0;
    for (const p of properties as any[]) {
      const v = (p as any).valuation;
      if (v && typeof v.estimated === "number") {
        totalEstimatedValuation += v.estimated;
        continue;
      }
      const fin = propertyIdToFinance.get(String((p as any)._id));
      const lv = fin?.lastValuation;
      if (lv && typeof lv.amount === "number") totalEstimatedValuation += lv.amount;
    }

    // Documentation coverage
    const validStatuses = new Set(["uploaded", "ocr_done", "redacted", "model_done", "committed"]);
    const propertyIdToCats = new Map<string, Array<string>>();
    for (const d of docs as any[]) {
      if (!validStatuses.has(String((d as any).status || "").toLowerCase())) continue;
      const pid = String((d as any).propertyId || "");
      if (!pid) continue;
      const arr = propertyIdToCats.get(pid) ?? [];
      arr.push(String((d as any).category || ""));
      propertyIdToCats.set(pid, arr);
    }

    let documentedAllRequired = 0;
    let onlyTitleRequired = 0;
    let allExceptTitleRequired = 0;
    let noneRequiredDocs = 0;
    const isTitle = (cat: string) => {
      const c = cat.toLowerCase();
      return c.includes("title") || c === "hardtitle" || c === "softtitle" || c === "solftitle";
    };
    const isTax = (cat: string) => cat.toLowerCase().includes("tax");
    const isSaleAgreement = (cat: string) => {
      const c = cat.toLowerCase();
      return (
        c.includes("sale agreement") ||
        c.includes("sales agreement") ||
        c.includes("sale-agreement") ||
        c.includes("sales-agreement") ||
        c.includes("sale") ||
        c === "agreement"
      );
    };
    for (const p of properties as any[]) {
      const pid = String((p as any)._id);
      const cats = propertyIdToCats.get(pid) ?? [];
      let hasTitle = false, hasTax = false, hasSale = false;
      for (const cat of cats) {
        if (isTitle(cat)) hasTitle = true;
        if (isTax(cat)) hasTax = true;
        if (isSaleAgreement(cat)) hasSale = true;
      }
      if (hasTitle && hasTax && hasSale) documentedAllRequired += 1;
      else if (hasTitle && !hasTax && !hasSale) onlyTitleRequired += 1;
      else if (!hasTitle && (hasTax || hasSale)) allExceptTitleRequired += 1;
      else if (!hasTitle && !hasTax && !hasSale) noneRequiredDocs += 1;
    }

    const weightedScore = documentedAllRequired * 1 + onlyTitleRequired * 0.75 + allExceptTitleRequired * 0.5;
    const documentedRequiredPercent = totalProps > 0 ? Math.round((weightedScore / totalProps) * 100) : 0;
    const onlyTitlePercent = totalProps > 0 ? Math.round((onlyTitleRequired / totalProps) * 100) : 0;
    const allExceptTitlePercent = totalProps > 0 ? Math.round((allExceptTitleRequired / totalProps) * 100) : 0;
    const noneRequiredPercent = totalProps > 0 ? Math.round((noneRequiredDocs / totalProps) * 100) : 0;

    return {
      totals: { properties: totalProps },
      valuation: { totalEstimated: totalEstimatedValuation, percentValuated: 0 }, // percent placeholder (soon)
      portfolio: { progressAvg },
      mappingStatus: mappingCounts,
      documents: {
        required: {
          total: totalProps,
          documentedCount: documentedAllRequired,
          documentedPercent: documentedRequiredPercent,
          onlyTitleCount: onlyTitleRequired,
          onlyTitlePercent,
          allExceptTitleCount: allExceptTitleRequired,
          allExceptTitlePercent,
          noneRequiredCount: noneRequiredDocs,
          noneRequiredPercent,
        },
      },
      risk: riskCounts,
      addedPercent: 0, // placeholder (soon)
    } as any;
  },
});

// =============================
// Property summaries for first paint
// =============================
export const listPropertySummaries = queryWithRLS({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const [properties, locations, images, finances, docs, registries] = await Promise.all([
      ctx.db
        .query("property")
        .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId))
        .collect(),
      ctx.db
        .query("property_location")
        .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId))
        .collect(),
      ctx.db
        .query("property_image")
        .withIndex("by_org_property_type", (q: any) => (q as any).eq("orgId", args.orgId))
        .collect(),
      ctx.db
        .query("property_finance")
        .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId))
        .collect(),
      ctx.db
        .query("document")
        .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId))
        .collect(),
      ctx.db
        .query("property_registry")
        .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId))
        .collect(),
    ]);

    // Group helpers
    const byProp = <T extends { propertyId: string }>(rows: any[]): Map<string, any[]> => {
      const m = new Map<string, any[]>();
      for (const r of rows as any[]) {
        const pid = String((r as any).propertyId || "");
        if (!pid) continue;
        const arr = m.get(pid) ?? [];
        arr.push(r);
        m.set(pid, arr);
      }
      return m;
    };
    const locByProp = byProp(locations as any[]);
    const imgByProp = byProp(images as any[]);
    const finByProp = byProp(finances as any[]);
    const docByProp = byProp(docs as any[]);
    const registryByProp = byProp(registries as any[]);

    const validStatuses = new Set(["uploaded", "ocr_done", "redacted", "model_done", "committed"]);
    const result: any[] = [];
    for (const p of properties as any[]) {
      const pid = String((p as any)._id);
      const locs = locByProp.get(pid) ?? [];
      // Choose a representative location: prefer one with coordinates
      let chosen: any | null = null;
      for (const l of locs) {
        if (l && (l as any).coordinates && typeof (l as any).coordinates.lon === "number") {
          chosen = l;
          break;
        }
      }
      if (!chosen) chosen = locs[0] || null;
      const coordinates = (chosen as any)?.coordinates ?? undefined;
      const mappingStatus = (chosen as any)?.mappingStatus ?? "none";
      const address = (chosen as any)?.address ?? undefined;
      const precision = (chosen as any)?.precision ?? undefined;
      const street = (chosen as any)?.street ?? undefined;
      const province = (chosen as any)?.province ?? undefined;
      const district = (chosen as any)?.district ?? undefined;
      const sangkat = (chosen as any)?.sangkat ?? undefined;

      // Images
      const imgs = imgByProp.get(pid) ?? [];
      imgs.sort((a: any, b: any) => (a.displayOrder - b.displayOrder));
      const main = imgs.find((im: any) => im.imageType === "main") || imgs[0] || null;
      const gallery = imgs.filter((im: any) => im.imageType === "secondary");

      // Valuation & purchase price (from finance)
      const valuation = (() => {
        const fin = (finByProp.get(pid) ?? [])[0];
        const lv = fin?.lastValuation;
        if (lv && typeof lv.amount === "number") {
          const currency = lv.currency || "USD";
          const display = `${currency} ${Number(lv.amount).toLocaleString()}`;
          return { estimated: lv.amount, display };
        }
        return undefined;
      })();

      const purchasePrice = (() => {
        const fin = (finByProp.get(pid) ?? [])[0];
        const pp = fin?.purchasePrice;
        if (pp && typeof pp.amount === "number") {
          const currency = pp.currency || "USD";
          const display = `${currency} ${Number(pp.amount).toLocaleString()}`;
          return { amount: pp.amount, currency, date: pp.date, display };
        }
        return undefined;
      })();

      // Docs coverage & count
      const dlist = (docByProp.get(pid) ?? []).filter((d: any) => validStatuses.has(String((d as any).status || "").toLowerCase()));
      const categories = dlist.map((d: any) => String((d as any).category || "")).filter(Boolean);
      const isTitle = (cat: string) => {
        const c = cat.toLowerCase();
        return c.includes("title") || c === "hardtitle" || c === "softtitle" || c === "solftitle";
      };
      const isTax = (cat: string) => cat.toLowerCase().includes("tax");
      const isSaleAgreement = (cat: string) => {
        const c = cat.toLowerCase();
        return (
          c.includes("sale agreement") ||
          c.includes("sales agreement") ||
          c.includes("sale-agreement") ||
          c.includes("sales-agreement") ||
          c.includes("sale") ||
          c === "agreement"
        );
      };
      let hasTitle = false, hasTax = false, hasSale = false;
      for (const cat of categories) {
        if (isTitle(cat)) hasTitle = true;
        if (isTax(cat)) hasTax = true;
        if (isSaleAgreement(cat)) hasSale = true;
      }
      const docCoverage = hasTitle && hasTax && hasSale
        ? "full"
        : hasTitle && !hasTax && !hasSale
        ? "onlyTitle"
        : !hasTitle && (hasTax || hasSale)
        ? "partialNoTitle"
        : "none";

      const registry = (registryByProp.get(pid) ?? [])[0];
      const titleType = registry?.titleType ?? (p as any).titleType;
      const referenceCode = registry?.referenceCode ?? (p as any).referenceCode;
      result.push({
        _id: pid,
        name: (p as any).name,
        code: (p as any).code,
        type: (p as any).type,
        titleType,
        referenceCode,
        status: (p as any).status,
        rentStatus: (p as any).rentStatus,
        size: (p as any).size,
        valuation,
        purchasePrice,
        documentCount: (p as any).documentCount,
        progressPercent: typeof (p as any).progress === "number" ? Math.max(0, Math.min(100, Math.round((p as any).progress))) : 0,
        riskAssessment: (p as any).riskAssessment,
        location: {
          mappingStatus,
          coordinates,
          address,
          street,
          province,
          district,
          sangkat,
          precision,
        },
        images: {
          main: main ? { url: main.imageUrl, thumb: main?.metadata?.derivatives?.thumbUrl ?? undefined } : undefined,
          gallery: gallery.map((g: any) => ({ url: g.imageUrl, thumb: g?.metadata?.derivatives?.thumbUrl ?? undefined })),
        },
        docCoverage,
      });
    }

    return { items: result } as any;
  },
});

// =============================
// Property summaries ordered by updatedAt with cursor pagination
// =============================
export const listPropertySummariesUpdateAt = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    paginationOpts: paginationOptsValidator,
  },
  // NOTE: We keep the same summary shape as listPropertySummaries but wrapped
  // in Convex's PaginationResult so callers can use cursor-based pagination.
  handler: async (ctx, { orgId, paginationOpts }) => {
    // Page properties by orgId ordered by updatedAt (most recent first).
    const propertiesPage = await ctx.db
      .query("property")
      .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", orgId))
      .order("desc")
      .paginate(paginationOpts);

    const properties = propertiesPage.page;
    // Load related tables for the org once; we still scope by orgId to stay
    // index-friendly, then join in-memory to just the current page's properties.
    const [locations, images, finances, docs, registries] = await Promise.all([
      ctx.db
        .query("property_location")
        .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("property_image")
        .withIndex("by_org_property_type", (q: any) => (q as any).eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("property_finance")
        .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("document")
        .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", orgId))
        .collect(),
      ctx.db
        .query("property_registry")
        .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", orgId))
        .collect(),
    ]);

    // Group helpers
    const byProp = <T extends { propertyId: string }>(rows: any[]): Map<string, any[]> => {
      const m = new Map<string, any[]>();
      for (const r of rows as any[]) {
        const pid = String((r as any).propertyId || "");
        if (!pid) continue;
        const arr = m.get(pid) ?? [];
        arr.push(r);
        m.set(pid, arr);
      }
      return m;
    };
    const locByProp = byProp(locations as any[]);
    const imgByProp = byProp(images as any[]);
    const finByProp = byProp(finances as any[]);
    const docByProp = byProp(docs as any[]);
    const registryByProp = byProp(registries as any[]);

    const validStatuses = new Set(["uploaded", "ocr_done", "redacted", "model_done", "committed"]);
    const result: any[] = [];
    for (const p of properties as any[]) {
      const pid = String((p as any)._id);
      const locs = locByProp.get(pid) ?? [];
      // Choose a representative location: prefer one with coordinates
      let chosen: any | null = null;
      for (const l of locs) {
        if (l && (l as any).coordinates && typeof (l as any).coordinates.lon === "number") {
          chosen = l;
          break;
        }
      }
      if (!chosen) chosen = locs[0] || null;
      const coordinates = (chosen as any)?.coordinates ?? undefined;
      const mappingStatus = (chosen as any)?.mappingStatus ?? "none";
      const address = (chosen as any)?.address ?? undefined;
      const precision = (chosen as any)?.precision ?? undefined;
      const street = (chosen as any)?.street ?? undefined;
      const province = (chosen as any)?.province ?? undefined;
      const district = (chosen as any)?.district ?? undefined;
      const sangkat = (chosen as any)?.sangkat ?? undefined;

      // Images
      const imgs = imgByProp.get(pid) ?? [];
      imgs.sort((a: any, b: any) => (a.displayOrder - b.displayOrder));
      const main = imgs.find((im: any) => im.imageType === "main") || imgs[0] || null;
      const gallery = imgs.filter((im: any) => im.imageType === "secondary");

      // Valuation & purchase price (from finance)
      const valuation = (() => {
        const fin = (finByProp.get(pid) ?? [])[0];
        const lv = fin?.lastValuation;
        if (lv && typeof lv.amount === "number") {
          const currency = lv.currency || "USD";
          const display = `${currency} ${Number(lv.amount).toLocaleString()}`;
          return { estimated: lv.amount, display };
        }
        return undefined;
      })();

      const purchasePrice = (() => {
        const fin = (finByProp.get(pid) ?? [])[0];
        const pp = fin?.purchasePrice;
        if (pp && typeof pp.amount === "number") {
          const currency = pp.currency || "USD";
          const display = `${currency} ${Number(pp.amount).toLocaleString()}`;
          return { amount: pp.amount, currency, date: pp.date, display };
        }
        return undefined;
      })();

      // Docs coverage & count
      const dlist = (docByProp.get(pid) ?? []).filter((d: any) =>
        validStatuses.has(String((d as any).status || "").toLowerCase()),
      );
      const categories = dlist.map((d: any) => String((d as any).category || "")).filter(Boolean);
      const isTitle = (cat: string) => {
        const c = cat.toLowerCase();
        return c.includes("title") || c === "hardtitle" || c === "softtitle" || c === "solftitle";
      };
      const isTax = (cat: string) => cat.toLowerCase().includes("tax");
      const isSaleAgreement = (cat: string) => {
        const c = cat.toLowerCase();
        return (
          c.includes("sale agreement") ||
          c.includes("sales agreement") ||
          c.includes("sale-agreement") ||
          c.includes("sales-agreement") ||
          c.includes("sale") ||
          c === "agreement"
        );
      };
      let hasTitle = false,
        hasTax = false,
        hasSale = false;
      for (const cat of categories) {
        if (isTitle(cat)) hasTitle = true;
        if (isTax(cat)) hasTax = true;
        if (isSaleAgreement(cat)) hasSale = true;
      }
      const docCoverage =
        hasTitle && hasTax && hasSale
          ? "full"
          : hasTitle && !hasTax && !hasSale
          ? "onlyTitle"
          : !hasTitle && (hasTax || hasSale)
          ? "partialNoTitle"
          : "none";

      const registry = (registryByProp.get(pid) ?? [])[0];
      const titleType = registry?.titleType ?? (p as any).titleType;
      const referenceCode = registry?.referenceCode ?? (p as any).referenceCode;
      result.push({
        _id: pid,
        name: (p as any).name,
        code: (p as any).code,
        type: (p as any).type,
        titleType,
        referenceCode,
        status: (p as any).status,
        rentStatus: (p as any).rentStatus,
        size: (p as any).size,
        valuation,
        purchasePrice,
        documentCount: (p as any).documentCount,
        progressPercent:
          typeof (p as any).progress === "number"
            ? Math.max(0, Math.min(100, Math.round((p as any).progress)))
            : 0,
        riskAssessment: (p as any).riskAssessment,
        location: {
          mappingStatus,
          coordinates,
          address,
          street,
          province,
          district,
          sangkat,
          precision,
        },
        images: {
          main: main
            ? { url: main.imageUrl, thumb: main?.metadata?.derivatives?.thumbUrl ?? undefined }
            : undefined,
          gallery: gallery.map((g: any) => ({
            url: g.imageUrl,
            thumb: g?.metadata?.derivatives?.thumbUrl ?? undefined,
          })),
        },
        docCoverage,
      });
    }

    // Return the Convex pagination envelope but with our summary page.
    return {
      ...propertiesPage,
      page: result,
    } as any;
  },
});
