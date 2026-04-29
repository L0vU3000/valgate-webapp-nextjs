import "server-only";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";

export type PropertyStatus = "complete" | "pending" | "action" | "draft";

export type EstateStat = {
  label: string;
  value: string;
  sub: string | null;
  subVariant?: "danger" | "neutral" | "primary";
  progress: number | null;
  accent: boolean;
};

export type EstateProperty = {
  id: number;
  name: string;
  address: string;
  status: PropertyStatus;
  initials: string;
  color: string;
};

export type SuccessorRole = "primary" | "contingent";

export type Successor = {
  initials: string;
  name: string;
  relation: string;
  role: SuccessorRole;
  share: string;
  verified: boolean;
};

export type EstateDocument = {
  name: string;
  meta: string;
  iconBg: string;
};

export type TimelineItem = {
  title: string;
  time: string;
  desc: string;
  active: boolean;
};

export type EstatePlanningPageData = {
  stats: EstateStat[];
  properties: EstateProperty[];
  successors: Successor[];
  documents: EstateDocument[];
  timeline: TimelineItem[];
};

export async function getEstatePlanningPageData(): Promise<EstatePlanningPageData> {
  const userId = getCurrentUserId();
  const dbSuccessors = await db.successors.list(userId);

  const successors: Successor[] = dbSuccessors.map((s) => ({
    initials: s.initials,
    name: s.name,
    relation: s.relation,
    role: s.role,
    share: `${s.share.toFixed(2)}%`,
    verified: s.verified,
  }));

  return {
    stats: [
      {
        label: "Plan Completion",
        value: "84.5%",
        sub: null,
        progress: 84.5,
        accent: true,
      },
      {
        label: "Pending Reviews",
        value: "12",
        sub: "Needs Immediate Attention",
        subVariant: "danger",
        progress: null,
        accent: false,
      },
      {
        label: "Named Beneficiaries",
        value: "48",
        sub: "Verified across 32 properties in Cambodia",
        subVariant: "neutral",
        progress: null,
        accent: false,
      },
      {
        label: "Protected Documents",
        value: "156",
        sub: "All encrypted & backed up",
        subVariant: "primary",
        progress: null,
        accent: true,
      },
    ],
    properties: [
      {
        id: 1,
        name: "BKK1 Residence",
        address: "No. 12, Street 302, BKK1, Phnom Penh",
        status: "complete",
        initials: "BK",
        color: "#d8e3f4",
      },
      {
        id: 2,
        name: "Tonle Bassac Villa",
        address: "No. 45, Sothearos Blvd, Chamkarmorn, Phnom Penh",
        status: "pending",
        initials: "TB",
        color: "#d8e3f4",
      },
      {
        id: 3,
        name: "Mekong View Loft",
        address: "Unit 14, Sisowath Quay, Daun Penh, Phnom Penh",
        status: "action",
        initials: "MV",
        color: "#d8e3f4",
      },
      {
        id: 4,
        name: "Kampot Heritage House",
        address: "No. 8, River Road, Kampot",
        status: "draft",
        initials: "KH",
        color: "#d8e3f4",
      },
    ],
    successors: successors.length > 0 ? successors : [
      {
        initials: "SC",
        name: "Sophea Chan",
        relation: "Spouse",
        role: "primary",
        share: "75.00%",
        verified: true,
      },
      {
        initials: "DC",
        name: "Dara Chan",
        relation: "Child",
        role: "contingent",
        share: "12.50%",
        verified: true,
      },
      {
        initials: "CC",
        name: "Chenda Chan",
        relation: "Child",
        role: "contingent",
        share: "12.50%",
        verified: true,
      },
    ],
    documents: [
      {
        name: "Will & Testament",
        meta: "Oct 12, 2023 • PDF • 2.4 MB",
        iconBg: "#ffdad6",
      },
      {
        name: "Estate Transfer Deed",
        meta: "Sept 05, 2023 • PDF • 1.1 MB",
        iconBg: "#c3c7cd",
      },
    ],
    timeline: [
      {
        title: "Estate Plan Finalized",
        time: "Today, 2:45 PM",
        desc: "Legal review completed by Ratanak Ly, Portfolio Manager.",
        active: true,
      },
      {
        title: "Beneficiary ID Verified",
        time: "Yesterday, 10:15 AM",
        desc: "KYC verification approved for Dara Chan.",
        active: false,
      },
      {
        title: "Document Uploaded",
        time: "Oct 14, 2023",
        desc: "New 'Estate Transfer Deed' signed and archived.",
        active: false,
      },
    ],
  };
}
