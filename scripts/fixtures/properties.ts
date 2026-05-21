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
}));

const soldAndArchived: NewProperty[] = [
  {
    name: "Daun Penh Corner Shop",
    type: "commercial",
    status: "Sold",
    lat: 11.5694,
    lng: 104.9282,
    province: "Phnom Penh",
    totalArea: "280",
    buyNumeric: 620000,
    title: "Hard title",
  },
  {
    name: "Sihanoukville Beach Plot",
    type: "land",
    status: "Sold",
    lat: 10.6277,
    lng: 103.5230,
    province: "Sihanoukville",
    totalArea: "1,400",
    buyNumeric: 870000,
    title: "Soft title",
  },
  {
    name: "Battambang Shophouse",
    type: "retail",
    status: "Vacant",
    isArchived: true,
    lat: 13.0957,
    lng: 103.2022,
    province: "Battambang",
    totalArea: "320",
    buyNumeric: 185000,
    title: "Hard title",
  },
  {
    name: "Kampong Cham River View",
    type: "residential",
    status: "Rented",
    isArchived: true,
    lat: 12.0000,
    lng: 105.4609,
    province: "Kampong Cham",
    totalArea: "2,100",
    buyNumeric: 310000,
    title: "Soft title",
  },
];

export const properties: NewProperty[] = [...mapped, ...soldAndArchived];
