
const pipelineStages = [
    {
      label: "Approaching",
      count: 12,
      color: "text-slate-400",
      countBg: "bg-slate-200 text-slate-600",
      cards: [
        { unit: "Unit 402B", detail: "Exp: 14 Days" },
        { unit: "Unit 115A", detail: "Exp: 19 Days" },
      ],
      borderColor: "",
    },
    {
      label: "Offered",
      count: 8,
      color: "text-blue-600",
      countBg: "bg-blue-100 text-blue-600",
      cards: [{ unit: "Unit 809", detail: "Sent: 2 Days ago" }],
      borderColor: "border-l-blue-500",
    },
    {
      label: "Signed",
      count: 24,
      color: "text-green-600",
      countBg: "bg-green-100 text-green-600",
      cards: [{ unit: "Unit 202", detail: "Effective: Oct 1" }],
      borderColor: "border-l-green-500",
    },
    {
      label: "Declined",
      count: 3,
      color: "text-red-700",
      countBg: "bg-red-100 text-red-700",
      cards: [{ unit: "Unit 501", detail: "Moving: Sept 30", faded: true }],
      borderColor: "",
    },
  ];
  
  const arrearsBuckets = [
    { label: "0-30d", amount: "$12,400", width: "60%", color: "bg-blue-700" },
    { label: "31-60d", amount: "$4,120", width: "33%", color: "bg-amber-400" },
    { label: "61-90d", amount: "$1,850", width: "12%", color: "bg-red-700" },
  ];
  
  const maintenanceItems = [
    { label: "Emergency", count: 2, color: "bg-red-700" },
    { label: "Urgent", count: 5, color: "bg-amber-500" },
    { label: "Standard", count: 14, color: "bg-slate-300" },
  ];
  
  const upcomingEvents = [
    {
      time: "Today • 14:00",
      timeColor: "text-blue-600",
      title: "Lease Signing: Unit 402B",
      detail: "Tenant: Meas Sokha (Borey Tonle Bassac)",
      dotColor: "bg-blue-500",
      active: true,
    },
    {
      time: "Tomorrow • 09:30",
      timeColor: "text-slate-400",
      title: "AC Inspection (All Bldgs)",
      detail: "Vendor: Phnom Penh Cool Air",
      dotColor: "bg-slate-300",
    },
    {
      time: "Friday • 16:00",
      timeColor: "text-slate-400",
      title: "Move-out Inspection: Unit A2",
      detail: "Staff: Sopheak Chhun",
      dotColor: "bg-slate-300",
    },
  ];
  