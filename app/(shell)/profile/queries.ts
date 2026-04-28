export type ProfileField = {
  label: string;
  value: string;
};

export type ProfileFieldWithIcon = ProfileField & {
  iconKey: "Mail" | "Phone" | "MapPin";
};

export type ProfilePageData = {
  initials: string;
  fullName: string;
  role: string;
  memberSince: string;
  lastLogin: string;
  personalInfo: ProfileField[];
  contactFields: ProfileFieldWithIcon[];
  preferences: ProfileField[];
  securityNote: string;
};

export async function getProfilePageData(): Promise<ProfilePageData> {
  return {
    initials: "SM",
    fullName: "Samuel Miller",
    role: "Administrator",
    memberSince: "Oct 12, 2021",
    lastLogin: "2 hours ago",
    personalInfo: [
      { label: "First Name", value: "Samuel" },
      { label: "Last Name", value: "Miller" },
      { label: "Job Title", value: "Senior Asset Manager" },
      { label: "Employee ID", value: "VAL-88291" },
    ],
    contactFields: [
      { label: "Email Address", value: "s.miller@valgate-pm.com", iconKey: "Mail" },
      { label: "Phone Number", value: "+1 (555) 234-5678", iconKey: "Phone" },
      { label: "Office Location", value: "London HQ, Floor 12", iconKey: "MapPin" },
    ],
    preferences: [
      { label: "Language", value: "English (UK)" },
      { label: "Timezone", value: "(GMT+00:00) London" },
      { label: "Currency", value: "GBP (£)" },
    ],
    securityNote: "Your profile is currently secure. To maintain high account safety, we recommend changing your password every 90 days. Next change suggested by Jan 15, 2024.",
  };
}
