// Static mock data for Valgate Professional.
//
// Everything under /pro/* reads from this file until Convex Pro queries ship.

// ───────────────────────────────────────────────────────────────────────────
// Shared types
// ───────────────────────────────────────────────────────────────────────────

export type Severity = "urgent" | "warning" | "info" | "ok" | "neutral";

export type ClientHealth = "healthy" | "needs-attention" | "critical";

export type AssetType = "property" | "vehicle" | "equipment";

export type AssetStatus =
  | "Active"
  | "Vacant"
  | "Under Maintenance"
  | "Pending Sale"
  | "Non-Performing";

export type WorkOrderPriority = "urgent" | "high" | "normal" | "low";

export type WorkOrderStatus = "Open" | "In Progress";

export type ActivityCategory = "payment" | "maintenance" | "lease" | "client";

export type ComplianceStatus = "On Track" | "Due Soon" | "Overdue";

// ───────────────────────────────────────────────────────────────────────────
// KPI banner — five top-of-page stat cards.
// ───────────────────────────────────────────────────────────────────────────

export const mockKpis = {
  portfolioValue: {
    value: "$12.4M",
    label: "Total Portfolio Value",
    deltaLabel: "3.2% vs. last quarter",
    deltaDirection: "up" as const,
  },
  aum: {
    value: "47",
    label: "Assets Under Management",
    deltaLabel: "2 new this month",
    deltaDirection: "up" as const,
  },
  activeClients: {
    value: "9",
    label: "Active Clients",
    deltaLabel: "Stable",
    deltaDirection: "flat" as const,
  },
  portfolioRoi: {
    value: "8.6%",
    label: "Portfolio ROI",
    deltaLabel: "0.4pp vs. prior period",
    deltaDirection: "up" as const,
  },
  noi: {
    value: "$94,200",
    label: "Net Operating Income",
    deltaLabel: "This month",
    deltaDirection: "flat" as const,
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Alerts strip — horizontal chips just below the KPI banner.
// ───────────────────────────────────────────────────────────────────────────

export type Alert = {
  id: string;
  severity: Severity; // controls chip colour
  label: string;
};

export const mockAlerts: Alert[] = [
  { id: "a1", severity: "warning", label: "3 leases expiring in 30 days" },
  { id: "a2", severity: "urgent", label: "2 missed rent payments" },
  { id: "a3", severity: "urgent", label: "Fire inspection overdue — Oakwood Apt." },
  {
    id: "a4",
    severity: "warning",
    label: "Insurance renewal due in 14 days — Client: J. Morris",
  },
  { id: "a5", severity: "info", label: "4 work orders awaiting approval" },
];

// ───────────────────────────────────────────────────────────────────────────
// Clients — left column "Clients" table.
// ───────────────────────────────────────────────────────────────────────────

export type Client = {
  id: string;
  name: string;
  clientType: "Individual" | "Corporate";
  initials: string;
  avatarColor: string; // tailwind bg-* class for the initial chip
  assetCount: number;
  activeAssetPct: number; // 0-100 — drives the portfolio progress bar
  totalValue: string;
  health: ClientHealth;
  lastActivity: string;
};

export const mockClients: Client[] = [
  {
    id: "c1",
    name: "J. Morris",
    clientType: "Individual",
    initials: "JM",
    avatarColor:
      "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
    assetCount: 6,
    activeAssetPct: 100,
    totalValue: "$2.1M",
    health: "healthy",
    lastActivity: "2 days ago",
  },
  {
    id: "c2",
    name: "Tanaka Holdings",
    clientType: "Corporate",
    initials: "TH",
    avatarColor:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    assetCount: 12,
    activeAssetPct: 92,
    totalValue: "$4.1M",
    health: "healthy",
    lastActivity: "Yesterday",
  },
  {
    id: "c3",
    name: "R. Vasquez",
    clientType: "Individual",
    initials: "RV",
    avatarColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    assetCount: 4,
    activeAssetPct: 75,
    totalValue: "$1.4M",
    health: "needs-attention",
    lastActivity: "5 days ago",
  },
  {
    id: "c4",
    name: "The Delacroix Group",
    clientType: "Corporate",
    initials: "DG",
    avatarColor:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    assetCount: 9,
    activeAssetPct: 100,
    totalValue: "$2.6M",
    health: "healthy",
    lastActivity: "Today",
  },
  {
    id: "c5",
    name: "Pinnacle Assets LLC",
    clientType: "Corporate",
    initials: "PA",
    avatarColor:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    assetCount: 8,
    activeAssetPct: 50,
    totalValue: "$0.7M",
    health: "critical",
    lastActivity: "12 days ago",
  },
  {
    id: "c6",
    name: "Hartwell Family Trust",
    clientType: "Corporate",
    initials: "HT",
    avatarColor:
      "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
    assetCount: 5,
    activeAssetPct: 100,
    totalValue: "$1.9M",
    health: "healthy",
    lastActivity: "3 days ago",
  },
  {
    id: "c7",
    name: "M. Okafor",
    clientType: "Individual",
    initials: "MO",
    avatarColor:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
    assetCount: 3,
    activeAssetPct: 100,
    totalValue: "$0.9M",
    health: "healthy",
    lastActivity: "1 week ago",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Assets — left column "All Assets" table.
// ───────────────────────────────────────────────────────────────────────────

export type Asset = {
  id: string;
  name: string;
  addressOrDescription: string;
  type: AssetType;
  clientName: string;
  currentValue: string;
  status: AssetStatus;
  lastUpdated: string;
};

export const mockAssets: Asset[] = [
  {
    id: "as1",
    name: "Oakwood Apartments",
    addressOrDescription: "412 Oakwood Ln, Tacoma WA",
    type: "property",
    clientName: "J. Morris",
    currentValue: "$1.8M",
    status: "Active",
    lastUpdated: "2 hrs ago",
  },
  {
    id: "as2",
    name: "Harbor View Building",
    addressOrDescription: "88 Pier St, Seattle WA",
    type: "property",
    clientName: "Tanaka Holdings",
    currentValue: "$2.4M",
    status: "Active",
    lastUpdated: "Yesterday",
  },
  {
    id: "as3",
    name: "Cedar Hollow Unit 3B",
    addressOrDescription: "120 Cedar Hollow, Bellevue WA",
    type: "property",
    clientName: "R. Vasquez",
    currentValue: "$420K",
    status: "Vacant",
    lastUpdated: "3 days ago",
  },
  {
    id: "as4",
    name: "Fleet Van #4",
    addressOrDescription: "2021 Ford Transit",
    type: "vehicle",
    clientName: "Tanaka Holdings",
    currentValue: "$28K",
    status: "Active",
    lastUpdated: "1 week ago",
  },
  {
    id: "as5",
    name: "Industrial Generator A",
    addressOrDescription: "Kohler 350kW",
    type: "equipment",
    clientName: "The Delacroix Group",
    currentValue: "$54K",
    status: "Under Maintenance",
    lastUpdated: "Today",
  },
  {
    id: "as6",
    name: "Maplewood Triplex",
    addressOrDescription: "9 Maplewood Cres, Portland OR",
    type: "property",
    clientName: "Pinnacle Assets LLC",
    currentValue: "$680K",
    status: "Non-Performing",
    lastUpdated: "Yesterday",
  },
  {
    id: "as7",
    name: "Riverside Lot 12",
    addressOrDescription: "Vacant parcel · 0.4 acres",
    type: "property",
    clientName: "The Delacroix Group",
    currentValue: "$310K",
    status: "Pending Sale",
    lastUpdated: "4 days ago",
  },
  {
    id: "as8",
    name: "Tesla Model 3 — Exec.",
    addressOrDescription: "2023 LR AWD",
    type: "vehicle",
    clientName: "M. Okafor",
    currentValue: "$41K",
    status: "Active",
    lastUpdated: "Yesterday",
  },
  {
    id: "as9",
    name: "Brentwood Office Suite",
    addressOrDescription: "Suite 4, 200 Brentwood Ave",
    type: "property",
    clientName: "Hartwell Family Trust",
    currentValue: "$960K",
    status: "Active",
    lastUpdated: "2 days ago",
  },
  {
    id: "as10",
    name: "HVAC Rooftop Unit B",
    addressOrDescription: "Carrier 50T · Harbor View",
    type: "equipment",
    clientName: "Tanaka Holdings",
    currentValue: "$18K",
    status: "Active",
    lastUpdated: "1 day ago",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Work order status widget — right column summary table.
// ───────────────────────────────────────────────────────────────────────────

export type WorkOrderStatusRow = {
  label: string;
  count: number;
  severity: Severity;
};

export const mockWorkOrderStatus: WorkOrderStatusRow[] = [
  { label: "Open", count: 5, severity: "urgent" },
  { label: "In Progress", count: 4, severity: "warning" },
  { label: "Awaiting Approval", count: 3, severity: "info" },
  { label: "Scheduled", count: 6, severity: "neutral" },
  { label: "Completed (this month)", count: 18, severity: "ok" },
];

// ───────────────────────────────────────────────────────────────────────────
// Financials widget — collection bar + cashflow line chart.
// ───────────────────────────────────────────────────────────────────────────

export const mockFinancials = {
  collected: 87400,
  expected: 102000,
  outstanding: 14600,
  // 8 evenly-spaced cashflow data points across the period.
  // Each item is a number for a recharts LineChart.
  cashflowSeries: [
    { week: "W1", value: 9200 },
    { week: "W2", value: 11400 },
    { week: "W3", value: 10800 },
    { week: "W4", value: 13100 },
    { week: "W5", value: 12200 },
    { week: "W6", value: 14400 },
    { week: "W7", value: 13800 },
    { week: "W8", value: 15500 },
  ],
};

// ───────────────────────────────────────────────────────────────────────────
// Occupancy widget — donut chart values.
// ───────────────────────────────────────────────────────────────────────────

export const mockOccupancy = {
  occupiedUnits: 41,
  vacantUnits: 6,
  leasesExpiringSoon: 5,
};

// ───────────────────────────────────────────────────────────────────────────
// Maintenance queue widget — 4-5 most urgent open work orders.
// ───────────────────────────────────────────────────────────────────────────

export type MaintenanceItem = {
  id: string;
  priority: WorkOrderPriority;
  assetName: string;
  clientName: string;
  status: WorkOrderStatus;
  vendor: string | null;
};

export const mockMaintenance: MaintenanceItem[] = [
  {
    id: "m1",
    priority: "urgent",
    assetName: "Oakwood Apartments — Unit 4B",
    clientName: "J. Morris",
    status: "Open",
    vendor: null,
  },
  {
    id: "m2",
    priority: "high",
    assetName: "Industrial Generator A",
    clientName: "The Delacroix Group",
    status: "In Progress",
    vendor: "Kohler Field Services",
  },
  {
    id: "m3",
    priority: "high",
    assetName: "Maplewood Triplex — Roof",
    clientName: "Pinnacle Assets LLC",
    status: "Open",
    vendor: null,
  },
  {
    id: "m4",
    priority: "normal",
    assetName: "HVAC Rooftop Unit B",
    clientName: "Tanaka Holdings",
    status: "In Progress",
    vendor: "Northwest HVAC",
  },
  {
    id: "m5",
    priority: "low",
    assetName: "Brentwood Office Suite — Lobby",
    clientName: "Hartwell Family Trust",
    status: "Open",
    vendor: "Aspen Janitorial",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Compliance & Deadlines — bottom-row table.
// ───────────────────────────────────────────────────────────────────────────

export type ComplianceItem = {
  id: string;
  itemName: string;
  assetName: string;
  clientInitials: string;
  clientColor: string; // bg-* class for the small initial chip
  dueLabel: string; // "in 7 days" or "Aug 12"
  status: ComplianceStatus;
};

export const mockCompliance: ComplianceItem[] = [
  {
    id: "co1",
    itemName: "Fire Safety Inspection",
    assetName: "Oakwood Apartments",
    clientInitials: "JM",
    clientColor:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    dueLabel: "Overdue 4 days",
    status: "Overdue",
  },
  {
    id: "co2",
    itemName: "Public Liability Insurance",
    assetName: "Harbor View Building",
    clientInitials: "TH",
    clientColor:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    dueLabel: "in 7 days",
    status: "Due Soon",
  },
  {
    id: "co3",
    itemName: "Annual Boiler Certification",
    assetName: "Brentwood Office Suite",
    clientInitials: "HT",
    clientColor:
      "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
    dueLabel: "in 14 days",
    status: "Due Soon",
  },
  {
    id: "co4",
    itemName: "Building Licence Renewal",
    assetName: "Maplewood Triplex",
    clientInitials: "PA",
    clientColor:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    dueLabel: "in 21 days",
    status: "On Track",
  },
  {
    id: "co5",
    itemName: "Smoke Detector Audit",
    assetName: "Cedar Hollow Unit 3B",
    clientInitials: "RV",
    clientColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    dueLabel: "Aug 12",
    status: "On Track",
  },
  {
    id: "co6",
    itemName: "Tenant Insurance Review",
    assetName: "Oakwood Apartments",
    clientInitials: "JM",
    clientColor:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    dueLabel: "Aug 19",
    status: "On Track",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Activity feed — bottom-row chronological feed.
// ───────────────────────────────────────────────────────────────────────────

export type ActivityItem = {
  id: string;
  category: ActivityCategory;
  description: string;
  clientName: string;
  assetName: string;
  timestamp: string; // relative — "3 hrs ago"
};

export const mockActivity: ActivityItem[] = [
  {
    id: "ev1",
    category: "payment",
    description: "Rent collected — $2,400",
    clientName: "J. Morris",
    assetName: "Oakwood Apt, Unit 4B",
    timestamp: "3 hrs ago",
  },
  {
    id: "ev2",
    category: "maintenance",
    description: "Work order created — Roof leak",
    clientName: "Pinnacle Assets LLC",
    assetName: "Maplewood Triplex",
    timestamp: "5 hrs ago",
  },
  {
    id: "ev3",
    category: "lease",
    description: "Lease signed — 12-month term",
    clientName: "Tanaka Holdings",
    assetName: "Harbor View, Suite 12",
    timestamp: "Yesterday",
  },
  {
    id: "ev4",
    category: "client",
    description: "New client onboarded",
    clientName: "M. Okafor",
    assetName: "Initial intake",
    timestamp: "2 days ago",
  },
  {
    id: "ev5",
    category: "payment",
    description: "Payment overdue — $1,850",
    clientName: "R. Vasquez",
    assetName: "Cedar Hollow Unit 3B",
    timestamp: "2 days ago",
  },
  {
    id: "ev6",
    category: "maintenance",
    description: "Work order completed — HVAC service",
    clientName: "Tanaka Holdings",
    assetName: "Harbor View Building",
    timestamp: "3 days ago",
  },
  {
    id: "ev7",
    category: "lease",
    description: "Lease renewal sent for signature",
    clientName: "The Delacroix Group",
    assetName: "Brentwood Office Suite",
    timestamp: "3 days ago",
  },
  {
    id: "ev8",
    category: "payment",
    description: "Quarterly statement issued",
    clientName: "Hartwell Family Trust",
    assetName: "Portfolio summary",
    timestamp: "4 days ago",
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Client portfolio — scoped overview data + helpers.
// ───────────────────────────────────────────────────────────────────────────

export type ClientAsset = {
  id: string;
  name: string;
  addressOrDescription: string;
  type: AssetType;
  currentValue: string;
  status: AssetStatus;
  occupancy: string;
  lastUpdated: string;
};

export type ClientContact = {
  name: string;
  email: string;
  phone: string;
  preferredContact: string;
};

export type ClientKpi = {
  value: string;
  label: string;
  deltaLabel: string;
  deltaDirection: "up" | "down" | "flat";
};

export type ClientOverview = {
  clientSince: string;
  kpis: ClientKpi[];
  alerts: Alert[];
  assets: ClientAsset[];
  workOrders: MaintenanceItem[];
  financials: {
    collected: number;
    expected: number;
    outstanding: number;
    cashflowSeries: { month: string; value: number }[];
  };
  occupancy: {
    occupiedUnits: number;
    vacantUnits: number;
    leasesExpiringSoon: number;
  };
  compliance: ComplianceItem[];
  contact: ClientContact;
  activity: ActivityItem[];
};

const jMorrisOverview: ClientOverview = {
  clientSince: "Jan 2023",
  kpis: [
    {
      value: "$2.1M",
      label: "Total Asset Value",
      deltaLabel: "4.1% vs. last quarter",
      deltaDirection: "up",
    },
    {
      value: "6",
      label: "Assets Under Management",
      deltaLabel: "4 properties · 1 vehicle · 1 equipment",
      deltaDirection: "flat",
    },
    {
      value: "92%",
      label: "Occupancy Rate",
      deltaLabel: "2pp vs. prior period",
      deltaDirection: "up",
    },
    {
      value: "$18,400",
      label: "Net Operating Income",
      deltaLabel: "This month",
      deltaDirection: "flat",
    },
    {
      value: "5 Active · 1 Needs Attention",
      label: "Portfolio Health",
      deltaLabel: "Summary count",
      deltaDirection: "flat",
    },
  ],
  alerts: [
    {
      id: "ca1",
      severity: "warning",
      label: "Lease expiring in 22 days — Oakwood Apt, Unit 4B",
    },
    {
      id: "ca2",
      severity: "warning",
      label: "Insurance renewal due in 14 days",
    },
    {
      id: "ca3",
      severity: "urgent",
      label: "1 missed rent payment — Riverfront Condo",
    },
    {
      id: "ca4",
      severity: "info",
      label: "2 work orders awaiting approval",
    },
  ],
  assets: [
    {
      id: "ca-as1",
      name: "Oakwood Apartments",
      addressOrDescription: "412 Oakwood Ln, Tacoma WA",
      type: "property",
      currentValue: "$840,000",
      status: "Active",
      occupancy: "96% occupied",
      lastUpdated: "2 hrs ago",
    },
    {
      id: "ca-as2",
      name: "Riverfront Condo",
      addressOrDescription: "88 Riverfront Dr, Tacoma WA",
      type: "property",
      currentValue: "$520,000",
      status: "Active",
      occupancy: "100% occupied",
      lastUpdated: "Yesterday",
    },
    {
      id: "ca-as3",
      name: "14 Commerce Unit B",
      addressOrDescription: "14 Commerce St, Tacoma WA",
      type: "property",
      currentValue: "$380,000",
      status: "Vacant",
      occupancy: "0% occupied",
      lastUpdated: "3 days ago",
    },
    {
      id: "ca-as4",
      name: "Morris Family Home",
      addressOrDescription: "220 Cedar Ave, Tacoma WA",
      type: "property",
      currentValue: "$290,000",
      status: "Active",
      occupancy: "Owner-occupied",
      lastUpdated: "1 week ago",
    },
    {
      id: "ca-as5",
      name: "2021 BMW X5",
      addressOrDescription: "2021 BMW X5 xDrive40i",
      type: "vehicle",
      currentValue: "$42,000",
      status: "Active",
      occupancy: "Leased",
      lastUpdated: "4 days ago",
    },
    {
      id: "ca-as6",
      name: "Commercial HVAC Unit",
      addressOrDescription: "Carrier 50T · Oakwood rooftop",
      type: "equipment",
      currentValue: "$28,000",
      status: "Under Maintenance",
      occupancy: "N/A",
      lastUpdated: "Today",
    },
  ],
  workOrders: [
    {
      id: "cwo1",
      priority: "urgent",
      assetName: "HVAC compressor failure",
      clientName: "Commercial HVAC Unit",
      status: "Open",
      vendor: null,
    },
    {
      id: "cwo2",
      priority: "high",
      assetName: "Bathroom leak repair",
      clientName: "Oakwood Apt, Unit 2A",
      status: "In Progress",
      vendor: "Apex Plumbing",
    },
    {
      id: "cwo3",
      priority: "normal",
      assetName: "Annual fire inspection",
      clientName: "Oakwood Apartments",
      status: "Open",
      vendor: "SafeGuard Inc.",
    },
  ],
  financials: {
    collected: 16200,
    expected: 18400,
    outstanding: 2200,
    cashflowSeries: [
      { month: "Dec", value: 14200 },
      { month: "Jan", value: 15800 },
      { month: "Feb", value: 15100 },
      { month: "Mar", value: 16900 },
      { month: "Apr", value: 17400 },
      { month: "May", value: 16200 },
    ],
  },
  occupancy: {
    occupiedUnits: 11,
    vacantUnits: 1,
    leasesExpiringSoon: 1,
  },
  compliance: [
    {
      id: "cc1",
      itemName: "Public Liability Insurance",
      assetName: "Oakwood Apartments",
      clientInitials: "JM",
      clientColor:
        "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
      dueLabel: "in 14 days",
      status: "Due Soon",
    },
    {
      id: "cc2",
      itemName: "Fire Safety Certificate",
      assetName: "Oakwood Apartments",
      clientInitials: "JM",
      clientColor:
        "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
      dueLabel: "in 45 days",
      status: "On Track",
    },
    {
      id: "cc3",
      itemName: "Vehicle Registration",
      assetName: "2021 BMW X5",
      clientInitials: "JM",
      clientColor:
        "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
      dueLabel: "in 62 days",
      status: "On Track",
    },
    {
      id: "cc4",
      itemName: "Electrical Inspection",
      assetName: "14 Commerce Unit B",
      clientInitials: "JM",
      clientColor:
        "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
      dueLabel: "Overdue",
      status: "Overdue",
    },
  ],
  contact: {
    name: "James Morris",
    email: "j.morris@email.com",
    phone: "+1 (555) 234-8901",
    preferredContact: "Email",
  },
  activity: [
    {
      id: "ce1",
      category: "payment",
      description: "Rent collected — $1,850",
      clientName: "J. Morris",
      assetName: "Oakwood Apt, Unit 4B",
      timestamp: "3 hrs ago",
    },
    {
      id: "ce2",
      category: "maintenance",
      description: "Work order created — HVAC compressor failure",
      clientName: "J. Morris",
      assetName: "Commercial HVAC Unit",
      timestamp: "1 day ago",
    },
    {
      id: "ce3",
      category: "lease",
      description: "Lease renewal sent",
      clientName: "J. Morris",
      assetName: "Riverfront Condo",
      timestamp: "2 days ago",
    },
    {
      id: "ce4",
      category: "client",
      description: "Insurance document uploaded",
      clientName: "J. Morris",
      assetName: "Oakwood Apartments",
      timestamp: "4 days ago",
    },
    {
      id: "ce5",
      category: "client",
      description: "New asset added — 2021 BMW X5",
      clientName: "J. Morris",
      assetName: "2021 BMW X5",
      timestamp: "1 week ago",
    },
    {
      id: "ce6",
      category: "payment",
      description: "Rent collected — $1,650",
      clientName: "J. Morris",
      assetName: "Oakwood Apt, Unit 2A",
      timestamp: "1 week ago",
    },
    {
      id: "ce7",
      category: "maintenance",
      description: "Work order completed — gutter cleaning",
      clientName: "J. Morris",
      assetName: "Morris Family Home",
      timestamp: "2 weeks ago",
    },
  ],
};

function occupancyLabelForStatus(status: AssetStatus): string {
  if (status === "Vacant") {
    return "0% occupied";
  }
  if (status === "Active") {
    return "100% occupied";
  }
  if (status === "Under Maintenance") {
    return "Temporarily offline";
  }
  if (status === "Pending Sale") {
    return "Pending sale";
  }
  return "Non-performing";
}

function healthSummaryForClient(client: Client): string {
  if (client.health === "healthy") {
    return `${client.assetCount} Active · All clear`;
  }
  if (client.health === "needs-attention") {
    return `${Math.max(client.assetCount - 1, 1)} Active · 1 Needs Attention`;
  }
  return `${Math.floor(client.assetCount / 2)} Active · ${Math.ceil(client.assetCount / 2)} At Risk`;
}

function buildClientOverview(client: Client): ClientOverview {
  const assets: ClientAsset[] = mockAssets
    .filter((asset) => asset.clientName === client.name)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      addressOrDescription: asset.addressOrDescription,
      type: asset.type,
      currentValue: asset.currentValue,
      status: asset.status,
      occupancy: occupancyLabelForStatus(asset.status),
      lastUpdated: asset.lastUpdated,
    }));

  const workOrders = mockMaintenance.filter(
    (item) => item.clientName === client.name,
  );

  const compliance = mockCompliance.filter(
    (item) => item.clientInitials === client.initials,
  );

  const activity = mockActivity.filter(
    (item) => item.clientName === client.name,
  );

  const collected = Math.round(client.assetCount * 3200 + 4000);
  const expected = Math.round(collected * 1.12);
  const outstanding = expected - collected;

  const alertSeverity: Severity =
    client.health === "critical"
      ? "urgent"
      : client.health === "needs-attention"
        ? "warning"
        : "info";

  const alerts: Alert[] =
    client.health === "healthy"
      ? [
          {
            id: `${client.id}-a1`,
            severity: "info",
            label: `${workOrders.length || 1} open work order${workOrders.length === 1 ? "" : "s"} in queue`,
          },
        ]
      : [
          {
            id: `${client.id}-a1`,
            severity: alertSeverity,
            label:
              client.health === "critical"
                ? "Portfolio performance below target — review required"
                : "1 asset needs attention — review occupancy and payments",
          },
          {
            id: `${client.id}-a2`,
            severity: "warning",
            label: `${compliance.filter((item) => item.status !== "On Track").length || 1} compliance item${compliance.length === 1 ? "" : "s"} due soon`,
          },
        ];

  return {
    clientSince:
      client.id === "c2"
        ? "Mar 2022"
        : client.id === "c3"
          ? "Aug 2023"
          : client.id === "c4"
            ? "Nov 2021"
            : client.id === "c5"
              ? "Jun 2024"
              : client.id === "c6"
                ? "Feb 2022"
                : "Sep 2023",
    kpis: [
      {
        value: client.totalValue,
        label: "Total Asset Value",
        deltaLabel: "vs. last quarter",
        deltaDirection:
          client.health === "critical"
            ? "down"
            : client.health === "healthy"
              ? "up"
              : "flat",
      },
      {
        value: String(client.assetCount),
        label: "Assets Under Management",
        deltaLabel: `${client.activeAssetPct}% active`,
        deltaDirection: "flat",
      },
      {
        value: `${client.activeAssetPct}%`,
        label: "Occupancy Rate",
        deltaLabel: "Portfolio average",
        deltaDirection:
          client.activeAssetPct >= 90
            ? "up"
            : client.activeAssetPct >= 75
              ? "flat"
              : "down",
      },
      {
        value: `$${Math.round(collected / 100) * 100}`,
        label: "Net Operating Income",
        deltaLabel: "This month",
        deltaDirection: "flat",
      },
      {
        value: healthSummaryForClient(client),
        label: "Portfolio Health",
        deltaLabel: "Summary count",
        deltaDirection: "flat",
      },
    ],
    alerts,
    assets,
    workOrders,
    financials: {
      collected,
      expected,
      outstanding,
      cashflowSeries: [
        { month: "Dec", value: Math.round(collected * 0.88) },
        { month: "Jan", value: Math.round(collected * 0.94) },
        { month: "Feb", value: Math.round(collected * 0.91) },
        { month: "Mar", value: Math.round(collected * 0.97) },
        { month: "Apr", value: Math.round(collected * 1.02) },
        { month: "May", value: collected },
      ],
    },
    occupancy: {
      occupiedUnits: Math.max(
        1,
        Math.round((client.activeAssetPct / 100) * client.assetCount),
      ),
      vacantUnits: Math.max(
        0,
        client.assetCount -
          Math.round((client.activeAssetPct / 100) * client.assetCount),
      ),
      leasesExpiringSoon: client.health === "healthy" ? 1 : 2,
    },
    compliance,
    contact: {
      name: client.clientType === "Corporate" ? client.name : client.name,
      email: `${client.initials.toLowerCase()}@example.com`,
      phone: "+1 (555) 000-0000",
      preferredContact: client.clientType === "Corporate" ? "Email" : "Phone",
    },
    activity:
      activity.length > 0
        ? activity
        : [
            {
              id: `${client.id}-ev1`,
              category: "client",
              description: "Portfolio review completed",
              clientName: client.name,
              assetName: "Portfolio summary",
              timestamp: client.lastActivity,
            },
          ],
  };
}

const tanakaHoldingsOverview: ClientOverview = {
  ...buildClientOverview(mockClients.find((client) => client.id === "c2")!),
  clientSince: "Mar 2022",
  kpis: [
    {
      value: "$4.1M",
      label: "Total Asset Value",
      deltaLabel: "5.8% vs. last quarter",
      deltaDirection: "up",
    },
    {
      value: "12",
      label: "Assets Under Management",
      deltaLabel: "3 properties · 6 vehicles · 3 equipment",
      deltaDirection: "flat",
    },
    {
      value: "92%",
      label: "Occupancy Rate",
      deltaLabel: "1pp vs. prior period",
      deltaDirection: "up",
    },
    {
      value: "$38,600",
      label: "Net Operating Income",
      deltaLabel: "This month",
      deltaDirection: "up",
    },
    {
      value: "11 Active · 1 Under Maintenance",
      label: "Portfolio Health",
      deltaLabel: "Summary count",
      deltaDirection: "flat",
    },
  ],
  alerts: [
    {
      id: "c2-a1",
      severity: "info",
      label: "HVAC service in progress — Harbor View Building",
    },
    {
      id: "c2-a2",
      severity: "warning",
      label: "Insurance renewal due in 7 days — Harbor View",
    },
    {
      id: "c2-a3",
      severity: "info",
      label: "1 work order awaiting vendor assignment",
    },
  ],
  contact: {
    name: "Yuki Tanaka",
    email: "y.tanaka@tanakaholdings.com",
    phone: "+1 (555) 412-7700",
    preferredContact: "Email",
  },
};

const rVasquezOverview: ClientOverview = {
  ...buildClientOverview(mockClients.find((client) => client.id === "c3")!),
  clientSince: "Aug 2023",
  kpis: [
    {
      value: "$1.4M",
      label: "Total Asset Value",
      deltaLabel: "1.2% vs. last quarter",
      deltaDirection: "flat",
    },
    {
      value: "4",
      label: "Assets Under Management",
      deltaLabel: "3 properties · 1 vehicle",
      deltaDirection: "flat",
    },
    {
      value: "75%",
      label: "Occupancy Rate",
      deltaLabel: "3pp vs. prior period",
      deltaDirection: "down",
    },
    {
      value: "$9,800",
      label: "Net Operating Income",
      deltaLabel: "This month",
      deltaDirection: "down",
    },
    {
      value: "3 Active · 1 Vacant",
      label: "Portfolio Health",
      deltaLabel: "Summary count",
      deltaDirection: "flat",
    },
  ],
  alerts: [
    {
      id: "c3-a1",
      severity: "urgent",
      label: "Payment overdue — Cedar Hollow Unit 3B ($1,850)",
    },
    {
      id: "c3-a2",
      severity: "warning",
      label: "Unit vacant 18 days — Cedar Hollow Unit 3B",
    },
    {
      id: "c3-a3",
      severity: "info",
      label: "Smoke detector audit scheduled for Aug 12",
    },
  ],
  contact: {
    name: "Rosa Vasquez",
    email: "r.vasquez@email.com",
    phone: "+1 (555) 876-2210",
    preferredContact: "Phone",
  },
};

const CLIENT_OVERVIEWS: Record<string, ClientOverview> = {
  c1: jMorrisOverview,
  c2: tanakaHoldingsOverview,
  c3: rVasquezOverview,
};

export function getClientById(id: string): Client | undefined {
  return mockClients.find((client) => client.id === id);
}

export function getClientOverview(clientId: string): ClientOverview | undefined {
  if (CLIENT_OVERVIEWS[clientId]) {
    return CLIENT_OVERVIEWS[clientId];
  }

  const client = getClientById(clientId);
  if (!client) {
    return undefined;
  }

  return buildClientOverview(client);
}

export const HEALTH_DOT: Record<ClientHealth, string> = {
  healthy: "bg-emerald-500",
  "needs-attention": "bg-amber-500",
  critical: "bg-red-500",
};

export const sidebarClients = mockClients.slice(0, 5);
