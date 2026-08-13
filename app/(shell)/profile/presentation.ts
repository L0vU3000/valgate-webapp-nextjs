// Pure presentation shaping for the consumer Profile section. No B2B/employer
// fields here — this is an owner-facing profile, not an employee directory
// record — and no invented dates or compliance claims in the security copy.

export type ProfileField = {
  label: string;
  value: string;
};

export type ProfileFieldWithIcon = ProfileField & {
  iconKey: "Mail" | "Phone" | "MapPin";
};

export type ProfilePresentationInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  language?: string | null;
  timezone?: string | null;
  currency?: string | null;
};

export type ProfilePresentation = {
  personalInfo: ProfileField[];
  contactFields: ProfileFieldWithIcon[];
  preferences: ProfileField[];
  securityNote: string;
};

const EMPTY = "—";

export function buildProfilePresentation(input: ProfilePresentationInput): ProfilePresentation {
  return {
    personalInfo: [
      { label: "First Name", value: input.firstName || EMPTY },
      { label: "Last Name", value: input.lastName || EMPTY },
    ],
    contactFields: [
      { label: "Email Address", value: input.email || EMPTY, iconKey: "Mail" },
      { label: "Phone Number", value: input.phone || EMPTY, iconKey: "Phone" },
    ],
    preferences: [
      { label: "Language", value: input.language || EMPTY },
      { label: "Timezone", value: input.timezone || EMPTY },
      { label: "Currency", value: input.currency || EMPTY },
    ],
    securityNote: "For your security, use a strong, unique password and avoid reusing it across other sites.",
  };
}
