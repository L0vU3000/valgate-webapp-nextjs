import type { Payment } from "@/lib/data/types/payment";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 3, 1); // 2026-04-01

type NewPayment = Omit<Payment, "id">;

export const payments: NewPayment[] = [
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
  {
    leaseId: "LEASE-0002",
    date: now - 35 * day,
    kind: "Rent",
    amount: 1200,
    method: "Wing",
    status: "Paid",
  },
  {
    leaseId: "LEASE-0002",
    date: now - 5 * day,
    kind: "Rent",
    amount: 1200,
    method: "Wing",
    status: "Overdue",
  },
  {
    leaseId: "LEASE-0003",
    date: now,
    kind: "Deposit",
    amount: 5000,
    method: "Wire transfer",
    status: "Pending",
  },
];
