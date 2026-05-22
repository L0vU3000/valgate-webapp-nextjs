import type { NewOwnershipDocument } from "@/lib/data/db/ownership-documents";
import type { NewOwnershipHistory } from "@/lib/data/db/ownership-history";

const now = Date.UTC(2026, 3, 1);

export const ownership: NewOwnershipDocument[] = [
  // --- BKK1 flagship properties ---
  {
    propertyId: "PROP-0001",
    name: "Hard Title — Boeung Trabek Building",
    type: "Hard Title",
    documentDate: Date.UTC(2020, 2, 1),
    ownershipRecordId: "OREC-0001",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0010",
    name: "Hard Title — BKK1 Building 191D",
    type: "Hard Title",
    documentDate: Date.UTC(2022, 2, 4),
    ownershipRecordId: "OREC-0002",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0011",
    name: "Hard Title — BKK1 Corner Residence No.35",
    type: "Hard Title",
    documentDate: Date.UTC(2018, 0, 1),
    ownershipRecordId: "OREC-0003",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0012",
    name: "Hard Title — BKK1 Family Home No.223",
    type: "Hard Title",
    documentDate: Date.UTC(2018, 6, 1),
    ownershipRecordId: "OREC-0004",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0013",
    name: "Hard Title — Chak Angre Building A",
    type: "Hard Title",
    documentDate: Date.UTC(2021, 0, 1),
    ownershipRecordId: "OREC-0005",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0020",
    name: "Hard Title — Chroy Changvar Bridge Land",
    type: "Hard Title",
    documentDate: Date.UTC(2024, 0, 17),
    ownershipRecordId: "OREC-0006",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },

  // --- Olympic cluster ---
  {
    propertyId: "PROP-0002",
    name: "Hard Title — Olympic Flat 172AE1",
    type: "Hard Title",
    documentDate: Date.UTC(2019, 3, 15),
    ownershipRecordId: "OREC-0007",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0003",
    name: "Hard Title — Olympic Studio 172BEo",
    type: "Hard Title",
    documentDate: Date.UTC(2019, 3, 15),
    ownershipRecordId: "OREC-0008",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0004",
    name: "Hard Title — Olympic Unit 172BE1",
    type: "Hard Title",
    documentDate: Date.UTC(2019, 3, 15),
    ownershipRecordId: "OREC-0009",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0005",
    name: "Hard Title — Olympic Shop 172CDE0",
    type: "Hard Title",
    documentDate: Date.UTC(2019, 3, 15),
    ownershipRecordId: "OREC-0010",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0006",
    name: "Hard Title — Olympic Flat 172CE1",
    type: "Hard Title",
    documentDate: Date.UTC(2019, 3, 15),
    ownershipRecordId: "OREC-0011",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0007",
    name: "Hard Title — Olympic Unit 172DE1",
    type: "Hard Title",
    documentDate: Date.UTC(2019, 3, 15),
    ownershipRecordId: "OREC-0012",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0008",
    name: "Hard Title — Olympic Studio 172EE0",
    type: "Hard Title",
    documentDate: Date.UTC(2019, 3, 15),
    ownershipRecordId: "OREC-0013",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0009",
    name: "Hard Title — Olympic Flat 172EE1",
    type: "Hard Title",
    documentDate: Date.UTC(2019, 3, 15),
    ownershipRecordId: "OREC-0014",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },

  // --- Remaining Chak Angre / Meanchey ---
  {
    propertyId: "PROP-0014",
    name: "Hard Title — Chak Angre Building B",
    type: "Hard Title",
    documentDate: Date.UTC(2021, 5, 1),
    ownershipRecordId: "OREC-0015",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0015",
    name: "Soft Title — Chak Angre Land Plot",
    type: "Soft Title",
    documentDate: Date.UTC(2022, 0, 1),
    ownershipRecordId: "OREC-0016",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0016",
    name: "Hard Title — Tuol Roka Land",
    type: "Hard Title",
    documentDate: Date.UTC(2023, 0, 1),
    ownershipRecordId: "OREC-0017",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },

  // --- BKK1 Villa, Condos, Chroy Changvar ---
  {
    propertyId: "PROP-0017",
    name: "Hard Title — BKK1 Villa No.158",
    type: "Hard Title",
    documentDate: Date.UTC(2019, 8, 1),
    ownershipRecordId: "OREC-0018",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0018",
    name: "Hard Title — Camko City Condo A105",
    type: "Hard Title",
    documentDate: Date.UTC(2020, 0, 1),
    ownershipRecordId: "OREC-0019",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0019",
    name: "Hard Title — Samdech Pan Condo F21",
    type: "Hard Title",
    documentDate: Date.UTC(2021, 0, 1),
    ownershipRecordId: "OREC-0020",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0021",
    name: "Hard Title — Prek Leab Shophouse F153",
    type: "Hard Title",
    documentDate: Date.UTC(2023, 5, 1),
    ownershipRecordId: "OREC-0021",
    status: "Current",
    createdAt: now,
    updatedAt: now,
  },
];

export const ownershipHistory: NewOwnershipHistory[] = [
  // PROP-0001 — Boeung Trabek
  {
    propertyId: "PROP-0001",
    eventDate: Date.UTC(2020, 2, 1),
    text: "Acquired from previous owner — hard title registered at Chamkar Mon Land Office.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0001",
    eventDate: Date.UTC(2023, 6, 1),
    text: "Lease renewed and title updated following boundary survey.",
    color: "#2563eb",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0002 to PROP-0009 — Olympic cluster batch acquisition
  {
    propertyId: "PROP-0002",
    eventDate: Date.UTC(2019, 3, 15),
    text: "Batch acquisition of 8 Olympic complex units — hard titles registered simultaneously.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0004",
    eventDate: Date.UTC(2019, 3, 15),
    text: "Part of Olympic complex batch acquisition — title exchanged from previous holder 172AE1.",
    color: "#f59e0b",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0010 — BKK1 191D
  {
    propertyId: "PROP-0010",
    eventDate: Date.UTC(2022, 2, 4),
    text: "Purchased via direct sale — hard title transferred to David Lee.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },
  {
    propertyId: "PROP-0010",
    eventDate: Date.UTC(2024, 8, 1),
    text: "Title updated following internal restructuring — ownership confirmed under personal name.",
    color: "#2563eb",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0011 — BKK1 Corner No.35
  {
    propertyId: "PROP-0011",
    eventDate: Date.UTC(2018, 0, 1),
    text: "Family home acquired — hard title registered. Primary residence of David Lee.",
    color: "#2563eb",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0012 — BKK1 Family Home No.223
  {
    propertyId: "PROP-0012",
    eventDate: Date.UTC(2018, 6, 1),
    text: "Second BKK1 residence acquired — hard title registered.",
    color: "#2563eb",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0013 — Chak Angre A
  {
    propertyId: "PROP-0013",
    eventDate: Date.UTC(2021, 0, 1),
    text: "Commercial building acquired in Chak Angre — hard title registered at Meanchey Land Office.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0014 — Chak Angre B
  {
    propertyId: "PROP-0014",
    eventDate: Date.UTC(2021, 5, 1),
    text: "Adjacent Chak Angre building acquired — hard title registered. Peng Huot group tenant.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0015 — Chak Angre Land
  {
    propertyId: "PROP-0015",
    eventDate: Date.UTC(2022, 0, 1),
    text: "Soft title land plot acquired near overpass — pending hard title upgrade.",
    color: "#f59e0b",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0016 — Tuol Roka Land
  {
    propertyId: "PROP-0016",
    eventDate: Date.UTC(2023, 0, 1),
    text: "Hard title land parcel acquired in Tuol Roka, Chak Angre — registered at Meanchey Land Office.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0017 — BKK1 Villa No.158
  {
    propertyId: "PROP-0017",
    eventDate: Date.UTC(2019, 8, 1),
    text: "BKK1 villa acquired — large residential plot with hard title. Currently vacant, listed for rental.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0018 — Camko City Condo
  {
    propertyId: "PROP-0018",
    eventDate: Date.UTC(2020, 0, 1),
    text: "Camko City condo unit purchased from developer — strata/hard title issued.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0019 — Samdech Pan Condo
  {
    propertyId: "PROP-0019",
    eventDate: Date.UTC(2021, 0, 1),
    text: "Samdech Pan condo unit acquired — hard title registered, Daun Penh district.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0020 — Chroy Changvar Land
  {
    propertyId: "PROP-0020",
    eventDate: Date.UTC(2024, 0, 17),
    text: "Large land parcel acquired near Chroy Changvar Bridge — hard title completed at Chroy Changvar Land Office.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },

  // PROP-0021 — Prek Leab Shophouse
  {
    propertyId: "PROP-0021",
    eventDate: Date.UTC(2023, 5, 1),
    text: "Prek Leab shophouse acquired — hard title registered. Ground floor commercial, upper floors residential.",
    color: "#22c55e",
    createdAt: now,
    updatedAt: now,
  },
];
