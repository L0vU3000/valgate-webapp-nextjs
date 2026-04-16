export type StatusVariant = "rented" | "vacant";
export type TitleVariant = "hard" | "soft" | "none";

export interface Property {
  id: number;
  name: string;
  code: string;
  type: "Land" | "House" | "Building";
  province: string;
  status: "Rented" | "Vacant";
  statusVariant: StatusVariant;
  size: string;
  buy: string;
  buyNumeric: number;
  title: string;
  titleVariant: TitleVariant;
  health: number;
  lat: number;
  lng: number;
}

export const properties: Property[] = [
  { id: 1,  name: "Land near river",              code: "PP00016 PH",       type: "House",    province: "Phnom Penh",      status: "Rented", statusVariant: "rented", size: "850",   buy: "$1,278,000", buyNumeric: 1278000, title: "Hard title", titleVariant: "hard", health: 100, lat: 11.5564, lng: 104.9282 },
  { id: 2,  name: "Siem Reap Land Plot",           code: "SR00015 Land",     type: "Land",     province: "Siem Reap",       status: "Vacant", statusVariant: "vacant", size: "1,200", buy: "$456,000",   buyNumeric: 456000,  title: "Soft title", titleVariant: "soft", health: 28,  lat: 13.3633, lng: 103.8600 },
  { id: 3,  name: "Kampong Chhnang Parcel",        code: "KPC00013",         type: "Land",     province: "Kampong Chhnang", status: "Vacant", statusVariant: "vacant", size: "2,500", buy: "$125,000",   buyNumeric: 125000,  title: "Hard title", titleVariant: "hard", health: 43,  lat: 12.2520, lng: 104.6680 },
  { id: 4,  name: "Angkor Heritage Plot",          code: "SR00007 Land",     type: "Land",     province: "Siem Reap",       status: "Vacant", statusVariant: "vacant", size: "900",   buy: "$234,000",   buyNumeric: 234000,  title: "Soft title", titleVariant: "soft", health: 67,  lat: 13.4125, lng: 103.8670 },
  { id: 5,  name: "Temple View Land",              code: "SR00006 Land",     type: "Land",     province: "Siem Reap",       status: "Vacant", statusVariant: "vacant", size: "1,100", buy: "$345,000",   buyNumeric: 345000,  title: "Hard title", titleVariant: "hard", health: 82,  lat: 13.4360, lng: 103.8660 },
  { id: 6,  name: "Central Siem Reap Plot",        code: "SR00005 Land",     type: "Land",     province: "Siem Reap",       status: "Rented", statusVariant: "rented", size: "750",   buy: "$567,000",   buyNumeric: 567000,  title: "Hard title", titleVariant: "hard", health: 95,  lat: 13.3622, lng: 103.8597 },
  { id: 7,  name: "Pub Street Commerce Block",     code: "SR00004 Building", type: "Building", province: "Siem Reap",       status: "Rented", statusVariant: "rented", size: "450",   buy: "$890,000",   buyNumeric: 890000,  title: "Hard title", titleVariant: "hard", health: 88,  lat: 13.3610, lng: 103.8558 },
  { id: 8,  name: "Prey Veng Agricultural Land",   code: "PV00002 Land",     type: "Land",     province: "Prey Veng",       status: "Vacant", statusVariant: "vacant", size: "5,000", buy: "$180,000",   buyNumeric: 180000,  title: "Soft title", titleVariant: "soft", health: 34,  lat: 11.4828, lng: 105.3246 },
  { id: 9,  name: "Mekong Riverside Plot",         code: "PV00001 Land",     type: "Land",     province: "Prey Veng",       status: "Vacant", statusVariant: "vacant", size: "3,200", buy: "$156,000",   buyNumeric: 156000,  title: "\u2014",     titleVariant: "none", health: 22,  lat: 11.5200, lng: 105.4500 },
  { id: 10, name: "Toul Kork Urban Parcel",        code: "PP00033 Land",     type: "Land",     province: "Phnom Penh",      status: "Vacant", statusVariant: "vacant", size: "600",   buy: "$980,000",   buyNumeric: 980000,  title: "Hard title", titleVariant: "hard", health: 75,  lat: 11.5750, lng: 104.9210 },
  { id: 11, name: "BKK1 Prime Land",               code: "PP00032 Land",     type: "Land",     province: "Phnom Penh",      status: "Rented", statusVariant: "rented", size: "480",   buy: "$1,450,000", buyNumeric: 1450000, title: "Hard title", titleVariant: "hard", health: 100, lat: 11.5520, lng: 104.9220 },
  { id: 12, name: "Baray Warehouse Complex",       code: "GEN00012",         type: "Building", province: "Prey Veng",       status: "Vacant", statusVariant: "vacant", size: "4,325", buy: "$1,232,356", buyNumeric: 1232356, title: "\u2014",     titleVariant: "none", health: 12,  lat: 11.4900, lng: 105.3500 },
  { id: 13, name: "Kampot Riverside Villa",        code: "GEN00013",         type: "House",    province: "Kampot",          status: "Vacant", statusVariant: "vacant", size: "3,806", buy: "$356,146",   buyNumeric: 356146,  title: "Soft title", titleVariant: "soft", health: 19,  lat: 10.6100, lng: 104.1800 },
  { id: 14, name: "Prey Veng Family Residence",    code: "GEN00014",         type: "House",    province: "Prey Veng",       status: "Rented", statusVariant: "rented", size: "4,119", buy: "$405,484",   buyNumeric: 405484,  title: "Hard title", titleVariant: "hard", health: 10,  lat: 11.4700, lng: 105.3100 },
  { id: 15, name: "Toul Tom Poung Parcel",         code: "GEN00015",         type: "Land",     province: "Phnom Penh",      status: "Rented", statusVariant: "rented", size: "2,256", buy: "$955,491",   buyNumeric: 955491,  title: "Soft title", titleVariant: "soft", health: 33,  lat: 11.5480, lng: 104.9190 },
  { id: 16, name: "Chamkar Mon Lot",               code: "GEN00016",         type: "Land",     province: "Phnom Penh",      status: "Rented", statusVariant: "rented", size: "4,917", buy: "$1,179,626", buyNumeric: 1179626, title: "\u2014",     titleVariant: "none", health: 24,  lat: 11.5530, lng: 104.9270 },
];
