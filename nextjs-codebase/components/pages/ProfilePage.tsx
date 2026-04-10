"use client";

import { User, Shield, Bell, Pencil, Mail, Phone, MapPin, Info } from "lucide-react";

export function ProfilePage() {
  return (
    <div className="h-full overflow-auto bg-background">
      <div className="flex gap-6 p-8 h-full items-start">
        {/* Aside */}
        <div className="flex flex-col gap-6 shrink-0 w-[234px]">
          {/* Profile card */}
          <div className="bg-card border border-border rounded-xl relative">
            <div className="flex flex-col items-center pt-6 pb-0">
              {/* Avatar */}
              <div className="size-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mb-4">
                <span className="font-display font-extrabold text-[30px] text-[--val-primary-dark]">SM</span>
              </div>
              {/* Name */}
              <h2 className="font-display font-bold text-[20px] text-foreground leading-7">Samuel Miller</h2>
              {/* Role badge */}
              <span className="mt-1 mb-0 px-3 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[12px] font-medium text-[--val-primary-dark]">
                Administrator
              </span>
            </div>
            {/* Meta */}
            <div className="border-t border-border mt-5 mx-6 pt-5 pb-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-muted-foreground">Member since</span>
                <span className="text-[14px] font-medium text-foreground">Oct 12, 2021</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-muted-foreground">Last Login</span>
                <span className="text-[14px] font-medium text-foreground">2 hours ago</span>
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
              <h1 className="font-display font-bold text-[30px] leading-9 text-foreground">My Profile</h1>
              <p className="text-[16px] text-muted-foreground mt-1">
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
                <Field label="First Name" value="Samuel" />
                <Field label="Last Name" value="Miller" />
                <Field label="Job Title" value="Senior Asset Manager" />
                <Field label="Employee ID" value="VAL-88291" />
              </div>
            </InfoCard>

            {/* Contact & Emails */}
            <InfoCard title="Contact & Emails">
              <div className="grid grid-cols-2 gap-6 p-6">
                <div className="col-span-2">
                  <FieldWithIcon
                    label="Email Address"
                    value="s.miller@valgate-pm.com"
                    icon={<Mail className="w-4 h-4 text-muted-foreground shrink-0" />}
                  />
                </div>
                <FieldWithIcon
                  label="Phone Number"
                  value="+1 (555) 234-5678"
                  icon={<Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                />
                <FieldWithIcon
                  label="Office Location"
                  value="London HQ, Floor 12"
                  icon={<MapPin className="w-3 h-3.5 text-muted-foreground shrink-0" />}
                />
              </div>
            </InfoCard>

            {/* Preferences */}
            <InfoCard title="Preferences">
              <div className="grid grid-cols-3 gap-6 p-6">
                <Field label="Language" value="English (UK)" />
                <Field label="Timezone" value="(GMT+00:00) London" />
                <Field label="Currency" value="GBP (£)" />
              </div>
            </InfoCard>

            {/* Security recommendation banner */}
            <div className="flex gap-4 p-[17px] bg-status-info-bg border border-status-info-border rounded-xl">
              <Info className="w-5 h-5 text-status-info shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-[#0c4a6e]">Security Recommendation</p>
                <p className="text-[14px] text-[#075985] mt-0.5 leading-5">
                  Your profile is currently secure. To maintain high account safety, we recommend changing your
                  password every 90 days. Next change suggested by Jan 15, 2024.
                </p>
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
