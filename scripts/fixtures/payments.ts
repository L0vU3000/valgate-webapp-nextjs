import type { Payment } from "@/lib/data/types/payment";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 3, 1); // 2026-04-01

type NewPayment = Omit<Payment, "id">;

export const payments: NewPayment[] = [
  // LEASE-0001 — Boeung Trabek / Rith Consultancy (Paid)
  {
    leaseId: "LEASE-0001",
    date: now - 30 * day,
    kind: "Rent",
    amount: 850,
    method: "ABA Bank",
    status: "Paid",
  },
  {
    leaseId: "LEASE-0001",
    date: now - 1 * day,
    kind: "Rent",
    amount: 850,
    method: "ABA Bank",
    status: "Paid",
  },

  // LEASE-0002 — BKK1 191D / Malis Fashion Co. (Overdue)
  {
    leaseId: "LEASE-0002",
    date: now - 35 * day,
    kind: "Rent",
    amount: 2200,
    method: "Wing",
    status: "Paid",
  },
  {
    leaseId: "LEASE-0002",
    date: now - 5 * day,
    kind: "Rent",
    amount: 2200,
    method: "Wing",
    status: "Overdue",
  },

  // LEASE-0003 — Chak Angre A / Sovann Holdings (Paid)
  {
    leaseId: "LEASE-0003",
    date: now - 30 * day,
    kind: "Rent",
    amount: 1800,
    method: "ABA Bank",
    status: "Paid",
  },
  {
    leaseId: "LEASE-0003",
    date: now,
    kind: "Rent",
    amount: 1800,
    method: "ABA Bank",
    status: "Paid",
  },

  // LEASE-0004 — Chak Angre B / Peng Huot Group (Paid)
  {
    leaseId: "LEASE-0004",
    date: now - 30 * day,
    kind: "Rent",
    amount: 2400,
    method: "Wire transfer",
    status: "Paid",
  },
  {
    leaseId: "LEASE-0004",
    date: now - 2 * day,
    kind: "Rent",
    amount: 2400,
    method: "Wire transfer",
    status: "Paid",
  },

  // LEASE-0005 — Chak Angre Land / Peng Huot Group (Deposit pending)
  {
    leaseId: "LEASE-0005",
    date: now,
    kind: "Deposit",
    amount: 2400,
    method: "Wire transfer",
    status: "Pending",
  },
];
