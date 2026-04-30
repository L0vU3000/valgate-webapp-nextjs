import "server-only";
import {
  collectionDir,
  recordDir,
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
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
  return listMergedRecords<Property>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<Property | null> {
  return readMergedRecord<Property>(userId, COLLECTION, id);
}

export type NewProperty = Omit<Property, "id" | "userId" | "createdAt" | "updatedAt"> &
  Partial<Pick<Property, "createdAt" | "updatedAt">>;

export async function create(
  userId: string,
  data: NewProperty,
): Promise<Property> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const now = Date.now();
  const merged: Property = {
    ...(data as Property),
    id,
    userId,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
  await writeRecord(userId, COLLECTION, id, splitProperty(merged));
  return merged;
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
  await writeRecord(userId, COLLECTION, id, splitProperty(merged));
  return merged;
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
    health: p.health,
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
    stateProv: p.stateProv,
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
    buy: p.buy,
    buyNumeric: p.buyNumeric,
  };
  const media: PropertyMedia = {
    photoStorageIds: p.photoStorageIds,
    documentStorageIds: p.documentStorageIds,
    size: p.size,
    yearBuilt: p.yearBuilt,
    totalArea: p.totalArea,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parkingSpaces: p.parkingSpaces,
    storageUnit: p.storageUnit,
    title: p.title,
    titleVariant: p.titleVariant,
    propertyType: p.propertyType,
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
