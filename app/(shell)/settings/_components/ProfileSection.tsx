"use client";

import { useState, useTransition } from "react";
import { Pencil, Mail, Phone, MapPin, Info, Save, X, Loader2 } from "lucide-react";
import type { ProfilePageData, ProfileFieldWithIcon } from "../../profile/queries";
import { saveProfileInfo } from "../../profile/actions";
import { useRouter } from "next/navigation";

// Profile section of /settings (Account group). This is the former standalone
// /profile page, minus its own AppHeader / aside sub-nav / page breadcrumb —
// the settings shell now provides the chrome and navigation.

const CONTACT_ICONS: Record<ProfileFieldWithIcon["iconKey"], React.ElementType> = {
  Mail,
  Phone,
  MapPin,
};

export function ProfileSection({ data }: { data: ProfilePageData }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formState, setFormState] = useState({
    firstName: data.rawProfile.firstName || "",
    lastName: data.rawProfile.lastName || "",
    jobTitle: data.rawProfile.jobTitle || "",
    employeeId: data.rawProfile.employeeId || "",
    email: data.rawProfile.email || "",
    phone: data.rawProfile.phone || "",
    officeLocation: data.rawProfile.officeLocation || "",
    language: data.rawProfile.language || "",
    timezone: data.rawProfile.timezone || "",
    currency: data.rawProfile.currency || "",
  });

  const handleSave = () => {
    startTransition(async () => {
      await saveProfileInfo(formState);
      setIsEditing(false);
      router.refresh();
    });
  };

  const handleCancel = () => {
    setFormState({
      firstName: data.rawProfile.firstName || "",
      lastName: data.rawProfile.lastName || "",
      jobTitle: data.rawProfile.jobTitle || "",
      employeeId: data.rawProfile.employeeId || "",
      email: data.rawProfile.email || "",
      phone: data.rawProfile.phone || "",
      officeLocation: data.rawProfile.officeLocation || "",
      language: data.rawProfile.language || "",
      timezone: data.rawProfile.timezone || "",
      currency: data.rawProfile.currency || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Section header + edit controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="font-display font-bold text-[20px] sm:text-[24px] leading-tight text-foreground">Profile</h2>
          <p className="font-sans text-[14px] leading-[20px] text-tertiary">
            Your personal information and identity on the platform.
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 shrink-0 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-blue-700 active:scale-[0.97] transition-all duration-150"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit profile
          </button>
        ) : (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center gap-2 border border-[#d1d5db] text-val-heading px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#f5f6f7] transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save changes
            </button>
          </div>
        )}
      </div>

      {/* Identity card */}
      <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="size-[64px] rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-display font-bold text-[24px] shrink-0">
            {data.initials}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-[15px] sm:text-[18px] text-val-heading">{data.fullName}</h3>
              {data.role && (
                <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {data.role}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-8 sm:gap-10">
          <div className="flex flex-col">
            <span className="text-[12px] text-tertiary">Member since</span>
            <span className="text-[14px] font-medium text-foreground">{data.memberSince}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] text-tertiary">Last login</span>
            <span className="text-[14px] font-medium text-foreground">{data.lastLogin}</span>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <InfoCard title="Personal Info">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
          <Field label="First Name" value={isEditing ? formState.firstName : data.personalInfo[0].value} isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, firstName: v }))} />
          <Field label="Last Name" value={isEditing ? formState.lastName : data.personalInfo[1].value} isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, lastName: v }))} />
          <Field label="Job Title" value={isEditing ? formState.jobTitle : data.personalInfo[2].value} isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, jobTitle: v }))} />
          <Field label="Employee ID" value={isEditing ? formState.employeeId : data.personalInfo[3].value} isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, employeeId: v }))} />
        </div>
      </InfoCard>

      {/* Contact & Emails */}
      <InfoCard title="Contact & Emails">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
          <div className="sm:col-span-2">
            <FieldWithIcon label="Email Address" value={isEditing ? formState.email : data.contactFields[0].value} iconKey="Mail" isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, email: v }))} />
          </div>
          <FieldWithIcon label="Phone Number" value={isEditing ? formState.phone : data.contactFields[1].value} iconKey="Phone" isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, phone: v }))} />
          <FieldWithIcon label="Office Location" value={isEditing ? formState.officeLocation : data.contactFields[2].value} iconKey="MapPin" isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, officeLocation: v }))} />
        </div>
      </InfoCard>

      {/* Preferences (personal profile fields) */}
      <InfoCard title="Preferences">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6">
          <Field label="Language" value={isEditing ? formState.language : data.preferences[0].value} isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, language: v }))} />
          <Field label="Timezone" value={isEditing ? formState.timezone : data.preferences[1].value} isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, timezone: v }))} />
          <Field label="Currency" value={isEditing ? formState.currency : data.preferences[2].value} isEditing={isEditing} onChange={(v) => setFormState((s) => ({ ...s, currency: v }))} />
        </div>
      </InfoCard>

      {/* Security recommendation banner */}
      <div className="flex gap-4 p-[17px] bg-status-info-bg border border-status-info-border rounded-xl">
        <Info className="w-5 h-5 text-status-info shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] font-semibold text-[#0c4a6e]">Security Recommendation</p>
          <p className="text-[14px] text-[#075985] mt-0.5 leading-5">{data.securityNote}</p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#d1d5db] rounded-[12px] overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <div className="bg-[#f5f6f7] border-b border-[#d1d5db] px-6 py-4">
        <h3 className="text-[16px] sm:text-[18px] font-semibold text-val-heading">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, isEditing, onChange }: { label: string; value: string; isEditing?: boolean; onChange?: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-tertiary uppercase tracking-[0.6px]">{label}</span>
      {isEditing ? (
        <input
          value={value === "—" ? "" : value}
          onChange={(e) => onChange?.(e.target.value)}
          className="bg-[#f5f6f7] border border-[#d1d5db] rounded-lg px-[17px] py-[12px] text-[15px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white w-full transition-all duration-150"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <div className="bg-white border border-[#e8eaed] rounded-lg px-[17px] py-[13px] text-[15px] font-medium text-foreground">{value}</div>
      )}
    </div>
  );
}

function FieldWithIcon({ label, value, iconKey, isEditing, onChange }: { label: string; value: string; iconKey: "Mail" | "Phone" | "MapPin"; isEditing?: boolean; onChange?: (v: string) => void }) {
  const IconComp = CONTACT_ICONS[iconKey];
  const icon = <IconComp className="w-4 h-4 text-tertiary shrink-0" />;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-tertiary uppercase tracking-[0.6px]">{label}</span>
      {isEditing ? (
        <div className="relative">
          <div className="absolute left-[17px] top-1/2 -translate-y-1/2 flex items-center justify-center">{icon}</div>
          <input
            value={value === "—" ? "" : value}
            onChange={(e) => onChange?.(e.target.value)}
            className="bg-[#f5f6f7] border border-[#d1d5db] rounded-lg pl-[46px] pr-[17px] py-[12px] text-[15px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white w-full transition-all duration-150"
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </div>
      ) : (
        <div className="bg-white border border-[#e8eaed] rounded-lg px-[17px] py-[13px] flex items-center gap-3 text-[15px] font-medium text-foreground">
          {icon}
          {value}
        </div>
      )}
    </div>
  );
}
