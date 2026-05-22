import type { NewTenant } from "@/lib/data/db/tenants";

export const tenants: NewTenant[] = [
  {
    propertyId: "PROP-0001",
    name: "Rith Consultancy",
    unit: "Ground Floor",
    rent: 850,
    status: "Paid",
    email: "contact@rithconsultancy.com.kh",
    phone: "+855 23 456 111",
  },
  {
    propertyId: "PROP-0010",
    name: "Malis Fashion Co.",
    unit: "Full Building",
    rent: 2200,
    status: "Overdue",
    email: "malis.fashion@gmail.com",
    phone: "+855 12 678 900",
  },
  {
    propertyId: "PROP-0013",
    name: "Sovann Holdings",
    unit: "Full Building",
    rent: 1800,
    status: "Paid",
    email: "admin@sovannholdings.kh",
    phone: "+855 23 555 234",
  },
  {
    propertyId: "PROP-0014",
    name: "Peng Huot Group",
    unit: "Full Building",
    rent: 2400,
    status: "Paid",
    email: "info@penghuot.com.kh",
    phone: "+855 23 333 999",
  },
  {
    propertyId: "PROP-0015",
    name: "Peng Huot Group",
    unit: "Full Plot",
    rent: 1200,
    status: "Pending",
    email: "info@penghuot.com.kh",
    phone: "+855 23 333 999",
  },
];
