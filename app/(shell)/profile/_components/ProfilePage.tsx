"use client";

import { User, Shield, Bell, Pencil, Mail, Phone, MapPin, Info } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import type { ProfilePageData, ProfileFieldWithIcon } from "../queries";

const CONTACT_ICONS: Record<ProfileFieldWithIcon["iconKey"], React.ElementType> = {
  Mail,
  Phone,
  MapPin,
};

export function ProfilePage({ data }: { data: ProfilePageData }) {
  return (
    <div className="h-full flex flex-col bg-background">
      <AppHeader />
      <div className="flex-1 overflow-auto">
      <div className="flex gap-6 p-8 items-start">
        {/* Aside */}
        <div className="flex flex-col gap-6 shrink-0 w-[234px]">
          {/* Profile card */}
          <div className="bg-card border border-border rounded-xl relative">
            <div className="flex flex-col items-center pt-6 pb-0">
              {/* Avatar */}
              <div className="size-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mb-4">
                <span className="font-display font-extrabold text-[30px] text-[--val-primary-dark]">{data.initials}</span>
              </div>
              {/* Name */}
              <h2 className="font-display font-bold text-[20px] text-foreground leading-7">{data.fullName}</h2>
              {/* Role badge */}
              <span className="mt-1 mb-0 px-3 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[12px] font-medium text-[--val-primary-dark]">
                {data.role}
              </span>
            </div>
            {/* Meta */}
            <div className="border-t border-border mt-5 mx-6 pt-5 pb-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-muted-foreground">Member since</span>
                <span className="text-[14px] font-medium text-foreground">{data.memberSince}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-muted-foreground">Last Login</span>
                <span className="text-[14px] font-medium text-foreground">{data.lastLogin}</span>
              </div>
            </div>
          </div>

          {/* Sub-nav */}
          <nav className="flex flex-col gap-1">
            <NavLink icon={<User className="w-4 h-4" />} label="Profile" active />
            <NavLink icon={<Shield className="w-4 h-4" />} label="Security" />
            <NavLink icon={<Bell className="w-4 h-4" />} label="Notifications" />
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Profile</span>
              </div>
              <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">My Profile</h1>
              <p className="text-slate-500 text-base mt-2">
                Manage your account settings and personal information.
              </p>
            </div>
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-primary/90 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
              Edit profile
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {/* Personal Info */}
            <InfoCard title="Personal Info">
              <div className="grid grid-cols-2 gap-6 p-6">
                {data.personalInfo.map((field) => (
                  <Field key={field.label} label={field.label} value={field.value} />
                ))}
              </div>
            </InfoCard>

            {/* Contact & Emails */}
            <InfoCard title="Contact & Emails">
              <div className="grid grid-cols-2 gap-6 p-6">
                {data.contactFields.map((field, i) => {
                  const IconComp = CONTACT_ICONS[field.iconKey];
                  const isFullWidth = i === 0;
                  return (
                    <div key={field.label} className={isFullWidth ? "col-span-2" : ""}>
                      <FieldWithIcon
                        label={field.label}
                        value={field.value}
                        icon={<IconComp className={`${field.iconKey === "MapPin" ? "w-3 h-3.5" : field.iconKey === "Phone" ? "w-3.5 h-3.5" : "w-4 h-4"} text-muted-foreground shrink-0`} />}
                      />
                    </div>
                  );
                })}
              </div>
            </InfoCard>

            {/* Preferences */}
            <InfoCard title="Preferences">
              <div className="grid grid-cols-3 gap-6 p-6">
                {data.preferences.map((field) => (
                  <Field key={field.label} label={field.label} value={field.value} />
                ))}
              </div>
            </InfoCard>

            {/* Security recommendation banner */}
            <div className="flex gap-4 p-[17px] bg-status-info-bg border border-status-info-border rounded-xl">
              <Info className="w-5 h-5 text-status-info shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-[#0c4a6e]">Security Recommendation</p>
                <p className="text-[14px] text-[#075985] mt-0.5 leading-5">
                  {data.securityNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function NavLink({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-[14px] transition-colors text-left ${
        active
          ? "bg-accent text-primary font-semibold"
          : "text-muted-foreground hover:bg-accent/50 font-normal"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="bg-surface-tint border-b border-border px-6 py-4">
        <h3 className="text-[18px] font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-[0.6px]">{label}</span>
      <div className="bg-surface-elevated border border-border rounded-lg px-[17px] py-[13px] text-[16px] font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function FieldWithIcon({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-[0.6px]">{label}</span>
      <div className="bg-surface-elevated border border-border rounded-lg px-[17px] py-[13px] flex items-center gap-3 text-[16px] font-medium text-foreground">
        {icon}
        {value}
      </div>
    </div>
  );
}
