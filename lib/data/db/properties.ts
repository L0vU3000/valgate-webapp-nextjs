import "server-only";
import { z } from "zod";
import {
  collectionDir,
  recordDir,
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { PropertySchema } from "../types/property";
import type {
  Property,
  PropertyCore,
  PropertyLocation,
  PropertyFinance,
  PropertyMedia,
} from "../types/property";

const COLLECTION = "properties";
const ID_PREFIX = "PROP";

export async function list(userId: string): Promise<Property[]> {
  const records = await listMergedRecords<unknown>(userId, COLLECTION);
  return records.map((r) => PropertySchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Property | null> {
  const record = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return record ? PropertySchema.parse(record) : null;
}

export type NewProperty = Omit<Property, "id" | "userId" | "code" | "createdAt" | "updatedAt"> &
  Partial<Pick<Property, "createdAt" | "updatedAt">>;

const nameSchema = z.string().min(1, "Property name cannot be blank").trim();

export async function create(
  userId: string,
  data: NewProperty,
): Promise<Property> {
  nameSchema.parse(data.name);
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const now = Date.now();
  const merged: Property = {
    ...(data as Property),
    id,
    userId,
    code: id,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
  const validated = PropertySchema.parse(merged);
  await writeRecord(userId, COLLECTION, id, splitProperty(validated));
  return validated;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Property>,
): Promise<Property | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const merged: Property = {
    ...current,
    ...patch,
    id: current.id,
    userId: current.userId,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  };
  const validated = PropertySchema.parse(merged);
  await writeRecord(userId, COLLECTION, id, splitProperty(validated));
  return validated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}

function splitProperty(p: Property): Record<string, Record<string, unknown>> {
  const core: PropertyCore = {
    id: p.id,
    userId: p.userId,
    name: p.name,
    code: p.code,
    type: p.type,
    status: p.status,
    lat: p.lat,
    lng: p.lng,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    ...(p.isArchived !== undefined && { isArchived: p.isArchived }),
  };
  const location: PropertyLocation = {
    addressLine: p.addressLine,
    addressLine2: p.addressLine2,
    city: p.city,
    zip: p.zip,
    country: p.country,
    province: p.province,
  };
  const finance: PropertyFinance = {
    purchasePrice: p.purchasePrice,
    purchaseDate: p.purchaseDate,
    currentMarketValue: p.currentMarketValue,
    outstandingMortgage: p.outstandingMortgage,
    monthlyPayment: p.monthlyPayment,
    interestRate: p.interestRate,
    annualPropertyTax: p.annualPropertyTax,
    taxAssessmentValue: p.taxAssessmentValue,
    annualInsurance: p.annualInsurance,
    ownershipStatus: p.ownershipStatus,
    buyNumeric: p.buyNumeric,
  };
  const media: PropertyMedia = {
    photoStorageIds: p.photoStorageIds,
    documentStorageIds: p.documentStorageIds,
    totalArea: p.totalArea,
    yearBuilt: p.yearBuilt,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parkingSpaces: p.parkingSpaces,
    storageUnit: p.storageUnit,
    title: p.title,
  };
  return {
    core: stripUndefined(core as unknown as Record<string, unknown>),
    location: stripUndefined(location as unknown as Record<string, unknown>),
    finance: stripUndefined(finance as unknown as Record<string, unknown>),
    media: stripUndefined(media as unknown as Record<string, unknown>),
  };
}

function stripUndefined(
  o: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export { collectionDir, recordDir };
