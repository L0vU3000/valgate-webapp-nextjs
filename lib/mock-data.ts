export interface Property {
  id: number;
  name: string;
  code: string;
  type: "residential" | "commercial" | "multi-unit" | "retail" | "land" | "industrial" | "construction" | "other";
  province: string;
  status: "Rented" | "Vacant";
  totalArea: string;
  buyNumeric: number;
  title: string;
  health: number;
  lat: number;
  lng: number;
}

export const properties: Property[] = [
  { id: 1,  name: "Land near river",              code: "PP00016 PH",       type: "residential",    province: "Phnom Penh",      status: "Rented", totalArea: "850",   buyNumeric: 1278000, title: "Hard title", health: 100, lat: 11.5564, lng: 104.9282 },
  { id: 2,  name: "Siem Reap Land Plot",           code: "SR00015 Land",     type: "land",     province: "Siem Reap",       status: "Vacant", totalArea: "1,200", buyNumeric: 456000,  title: "Soft title", health: 28,  lat: 13.3633, lng: 103.8600 },
  { id: 3,  name: "Kampong Chhnang Parcel",        code: "KPC00013",         type: "land",     province: "Kampong Chhnang", status: "Vacant", totalArea: "2,500", buyNumeric: 125000,  title: "Hard title", health: 43,  lat: 12.2520, lng: 104.6680 },
  { id: 4,  name: "Angkor Heritage Plot",          code: "SR00007 Land",     type: "land",     province: "Siem Reap",       status: "Vacant", totalArea: "900",   buyNumeric: 234000,  title: "Soft title", health: 67,  lat: 13.4125, lng: 103.8670 },
  { id: 5,  name: "Temple View Land",              code: "SR00006 Land",     type: "land",     province: "Siem Reap",       status: "Vacant", totalArea: "1,100", buyNumeric: 345000,  title: "Hard title", health: 82,  lat: 13.4360, lng: 103.8660 },
  { id: 6,  name: "Central Siem Reap Plot",        code: "SR00005 Land",     type: "land",     province: "Siem Reap",       status: "Rented", totalArea: "750",   buyNumeric: 567000,  title: "Hard title", health: 95,  lat: 13.3622, lng: 103.8597 },
  { id: 7,  name: "Pub Street Commerce Block",     code: "SR00004 Building", type: "commercial", province: "Siem Reap",       status: "Rented", totalArea: "450",   buyNumeric: 890000,  title: "Hard title", health: 88,  lat: 13.3610, lng: 103.8558 },
  { id: 8,  name: "Prey Veng Agricultural Land",   code: "PV00002 Land",     type: "land",     province: "Prey Veng",       status: "Vacant", totalArea: "5,000", buyNumeric: 180000,  title: "Soft title", health: 34,  lat: 11.4828, lng: 105.3246 },
  { id: 9,  name: "Mekong Riverside Plot",         code: "PV00001 Land",     type: "land",     province: "Prey Veng",       status: "Vacant", totalArea: "3,200", buyNumeric: 156000,  title: "—",          health: 22,  lat: 11.5200, lng: 105.4500 },
  { id: 10, name: "Toul Kork Urban Parcel",        code: "PP00033 Land",     type: "land",     province: "Phnom Penh",      status: "Vacant", totalArea: "600",   buyNumeric: 980000,  title: "Hard title", health: 75,  lat: 11.5750, lng: 104.9210 },
  { id: 11, name: "BKK1 Prime Land",               code: "PP00032 Land",     type: "land",     province: "Phnom Penh",      status: "Rented", totalArea: "480",   buyNumeric: 1450000, title: "Hard title", health: 100, lat: 11.5520, lng: 104.9220 },
  { id: 12, name: "Baray Warehouse Complex",       code: "GEN00012",         type: "commercial", province: "Prey Veng",       status: "Vacant", totalArea: "4,325", buyNumeric: 1232356, title: "—",          health: 12,  lat: 11.4900, lng: 105.3500 },
  { id: 13, name: "Kampot Riverside Villa",        code: "GEN00013",         type: "residential",    province: "Kampot",          status: "Vacant", totalArea: "3,806", buyNumeric: 356146,  title: "Soft title", health: 19,  lat: 10.6100, lng: 104.1800 },
  { id: 14, name: "Prey Veng Family Residence",    code: "GEN00014",         type: "residential",    province: "Prey Veng",       status: "Rented", totalArea: "4,119", buyNumeric: 405484,  title: "Hard title", health: 10,  lat: 11.4700, lng: 105.3100 },
  { id: 15, name: "Toul Tom Poung Parcel",         code: "GEN00015",         type: "land",     province: "Phnom Penh",      status: "Rented", totalArea: "2,256", buyNumeric: 955491,  title: "Soft title", health: 33,  lat: 11.5480, lng: 104.9190 },
  { id: 16, name: "Chamkar Mon Lot",               code: "GEN00016",         type: "land",     province: "Phnom Penh",      status: "Rented", totalArea: "4,917", buyNumeric: 1179626, title: "—",          health: 24,  lat: 11.5530, lng: 104.9270 },
];
