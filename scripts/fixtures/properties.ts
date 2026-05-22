import type { NewProperty } from "@/lib/data/db/properties";
import { properties as mockProperties } from "@/lib/mock-data";
import type { PropertyTitle } from "@/lib/data/types/property";

const mapped: NewProperty[] = mockProperties.map((p) => ({
  name: p.name,
  code: p.code,
  type: p.type,
  status: p.status,
  lat: p.lat,
  lng: p.lng,
  province: p.province,
  totalArea: p.totalArea,
  buyNumeric: p.buyNumeric,
  title: p.title as PropertyTitle,
  // Location
  ...(p.addressLine  && { addressLine: p.addressLine }),
  ...(p.addressLine2 && { addressLine2: p.addressLine2 }),
  ...(p.city         && { city: p.city }),
  ...(p.country      && { country: p.country }),
  // Finance
  ...(p.purchasePrice      && { purchasePrice: p.purchasePrice }),
  ...(p.purchaseDate       !== undefined && { purchaseDate: p.purchaseDate }),
  ...(p.currentMarketValue !== undefined && { currentMarketValue: p.currentMarketValue }),
  ...(p.annualPropertyTax  !== undefined && { annualPropertyTax: p.annualPropertyTax }),
  ...(p.annualInsurance    !== undefined && { annualInsurance: p.annualInsurance }),
  ...(p.ownershipStatus    && { ownershipStatus: p.ownershipStatus }),
  // Media
  ...(p.yearBuilt     && { yearBuilt: p.yearBuilt }),
  ...(p.bedrooms      && { bedrooms: p.bedrooms }),
  ...(p.bathrooms     && { bathrooms: p.bathrooms }),
  ...(p.parkingSpaces && { parkingSpaces: p.parkingSpaces }),
}));

const soldAndArchived: NewProperty[] = [
  {
    name: "Toul Tom Poung Shophouse",
    type: "retail",
    status: "Sold",
    lat: 11.5477,
    lng: 104.9155,
    province: "Phnom Penh",
    totalArea: "210",
    buyNumeric: 420000,
    title: "Hard title",
    addressLine: "No. 45, Street 163, Toul Tom Poung 1, Chamkar Mon",
    city: "Phnom Penh",
    country: "Cambodia",
    purchasePrice: "$420,000",
    purchaseDate: Date.UTC(2017, 4, 1),
    currentMarketValue: 520000,
    yearBuilt: "2009",
    bedrooms: "2",
    bathrooms: "2",
    parkingSpaces: "1",
  },
  {
    name: "Daun Penh Riverside Unit",
    type: "residential",
    status: "Sold",
    lat: 11.5694,
    lng: 104.9282,
    province: "Phnom Penh",
    totalArea: "95",
    buyNumeric: 185000,
    title: "Hard title",
    addressLine: "No. 12, Street 106, Phsar Kandal 2, Daun Penh",
    city: "Phnom Penh",
    country: "Cambodia",
    purchasePrice: "$185,000",
    purchaseDate: Date.UTC(2016, 8, 1),
    currentMarketValue: 230000,
    yearBuilt: "2006",
    bedrooms: "2",
    bathrooms: "1",
  },
];

export const properties: NewProperty[] = [...mapped, ...soldAndArchived];
