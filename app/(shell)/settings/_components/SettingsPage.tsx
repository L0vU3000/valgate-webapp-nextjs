"use client";

import { useState, useTransition } from "react";
import { Check, Smartphone, Download } from "lucide-react";
import { RequiredMark } from "@/components/ui/required-mark";
import { AppHeader } from "@/components/layout/AppHeader";
import type { SettingsPageData, NotifChannels } from "../queries";
import { saveNotificationPreference, saveUserPreferences, setManagerMode } from "../actions";
import { ManagersSection } from "./ManagersSection";
import { ConnectClaudeSection } from "./ConnectClaudeSection";

/* Staggered section entrance — reusable inline style helper */
function sectionStyle(i: number): React.CSSProperties {
  return {
    animation: "fade-slide-up 0.45s ease-out both",
    animationDelay: `${i * 90}ms`,
  };
}

export function SettingsPage({ data, mcpUrl }: { data: SettingsPageData; mcpUrl: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [, startTransition] = useTransition();

  const [notifications, setNotifications] = useState<Record<string, NotifChannels>>(
    data.defaultNotifications,
  );

  const [flashRow, setFlashRow] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState(data.defaults.dashboardView);
  const [language, setLanguage] = useState(data.defaults.language);
  const [timezone, setTimezone] = useState(data.defaults.timezone);
  // Optimistic local state for the manager mode toggle — avoids a full round-trip
  // before the UI reflects the change.
  const [isManager, setIsManager] = useState(data.isManager);

  const toggleNotif = (key: string, channel: keyof NotifChannels) => {
    setNotifications((prev) => {
      const updatedChannels = { ...prev[key], [channel]: !prev[key][channel] };
      startTransition(() => void saveNotificationPreference(key, updatedChannels));
      return { ...prev, [key]: updatedChannels };
    });
    setFlashRow(key);
    setTimeout(() => setFlashRow(null), 350);
  };

  return (
    <div className="h-full flex flex-col bg-val-bg-page-alt">
      <AppHeader />
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-full sm:max-w-[1200px] mx-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">

        {/* Page Header */}
        <div className="flex flex-col gap-1" style={sectionStyle(0)}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark]">Valgate</span>
            <span className="text-[11px] text-slate-300">/</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Settings</span>
          </div>
          <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">
            Account Settings
          </h1>
          <p className="text-[14px] sm:text-[15px] text-slate-500 mt-2">
            Manage your personal information, security preferences, and notification settings.
          </p>
        </div>

        {/* Profile Section */}
        {data.profile && (
          <section
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pb-6 sm:pb-8 border-b border-[#e8eaed]"
            style={sectionStyle(1)}
          >
            <div className="flex flex-col gap-2">
              <h2 className="font-display font-bold text-[18px] sm:text-[24px] leading-tight text-foreground">Profile</h2>
              <p className="font-sans text-[14px] leading-[20px] text-tertiary">
                Your personal information and identity on the platform.
              </p>
            </div>
            <div className="col-span-1 sm:col-span-2 bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="size-[64px] rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-display font-bold text-[24px]">
                  {data.profile.firstName[0]}{data.profile.lastName[0]}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-[15px] sm:text-[18px] text-val-heading">
                      {data.profile.firstName} {data.profile.lastName}
                    </h3>
                    {data.profile.role && (
                      <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {data.profile.role}
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-[14px] text-tertiary">
                    {data.profile.jobTitle} • {data.profile.email}
                  </p>
                </div>
              </div>
              <button disabled className="border border-[#d1d5db] rounded-[8px] px-[17px] py-[9px] font-sans font-medium text-[14px] leading-[20px] text-val-heading bg-[#f5f6f7] cursor-not-allowed opacity-50">
                Edit Profile
              </button>
            </div>
          </section>
        )}

        {/* Security Section */}
        <section
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pb-6 sm:pb-8 border-b border-[#e8eaed]"
          style={sectionStyle(2)}
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[18px] sm:text-[24px] leading-tight text-foreground">Security</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Keep your account secure by updating your credentials and enabling multi-factor authentication.
            </p>
          </div>
          <div className="col-span-2 flex flex-col gap-6">
            {/* Update Password Card */}
            <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-4">
              <h3 className="font-display font-semibold text-[15px] sm:text-[18px] text-val-heading">Update Password</h3>
              <div className="flex flex-col gap-4">
                <PasswordField label="Current Password" required value={currentPassword} onChange={setCurrentPassword} />
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                  <PasswordField label="New Password" required value={newPassword} onChange={setNewPassword} />
                  <PasswordField label="Confirm New Password" required value={confirmPassword} onChange={setConfirmPassword} />
                </div>
                <div className="flex justify-end pt-2">
                  <button className="bg-[#2563eb] text-white font-sans font-medium text-[14px] leading-[20px] px-6 py-2 rounded-[8px] hover:bg-blue-700 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] transition-all duration-150 cursor-pointer">
                    Update Password
                  </button>
                </div>
              </div>
            </div>

            {/* MFA Card */}
            <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-4">
              <h3 className="font-display font-semibold text-[15px] sm:text-[18px] text-val-heading">Multi-Factor Authentication</h3>
              <div className="flex flex-col gap-3">
                {/* Authenticator App — enabled */}
                <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-[12px] p-[17px] flex items-center justify-between transition-colors duration-150 hover:bg-[#d1fae5]">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#059669] rounded-full size-[40px] flex items-center justify-center shrink-0">
                      <Check className="text-white w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="font-sans font-semibold text-[14px] leading-[20px] text-[#065f46]">Authenticator App</p>
                      <p className="font-sans text-[12px] leading-[16px] text-[#065f46]/70">Enabled &amp; Verified</p>
                    </div>
                  </div>
                  <button className="font-sans font-semibold text-[14px] leading-[20px] text-[#065f46] hover:text-[#047857] underline-offset-2 hover:underline active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669] rounded transition-all duration-150 cursor-pointer">
                    Manage
                  </button>
                </div>
                {/* SMS Recovery — not configured */}
                <div className="bg-[#f5f6f7] border border-[#d1d5db] rounded-[12px] p-[17px] flex items-center justify-between transition-colors duration-150 hover:bg-[#edf0f3]">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#d1d5db] rounded-full size-[40px] flex items-center justify-center shrink-0">
                      <Smartphone className="text-white w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-sans font-semibold text-[14px] leading-[20px] text-foreground">SMS Recovery</p>
                      <p className="font-sans text-[12px] leading-[16px] text-tertiary">Not configured</p>
                    </div>
                  </div>
                  <button className="font-sans font-semibold text-[14px] leading-[20px] text-[#2563eb] hover:text-blue-700 underline-offset-2 hover:underline active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] rounded transition-all duration-150 cursor-pointer">
                    Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pb-6 sm:pb-8 border-b border-[#e8eaed]"
          style={sectionStyle(3)}
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[18px] sm:text-[24px] leading-tight text-foreground">Notifications</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Choose how you want to be notified about activity in your portfolio.
            </p>
          </div>
          <div className="col-span-2 bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Table Header */}
            <div className="bg-[#f5f6f7] border-b border-[#d1d5db] grid grid-cols-12 px-6 py-3">
              <div className="col-span-6 font-sans font-semibold text-[11px] leading-[16px] tracking-[0.05em] uppercase text-slate-500">Event Activity</div>
              <div className="col-span-2 font-sans font-semibold text-[11px] leading-[16px] tracking-[0.05em] uppercase text-slate-500 text-center">Email</div>
              <div className="col-span-2 font-sans font-semibold text-[11px] leading-[16px] tracking-[0.05em] uppercase text-slate-500 text-center">Slack</div>
              <div className="col-span-2 font-sans font-semibold text-[11px] leading-[16px] tracking-[0.05em] uppercase text-slate-500 text-center">SMS</div>
            </div>
            {/* Table Rows */}
            {data.notificationRows.map((row, i) => (
              <div
                key={row.key}
                className={`grid grid-cols-12 items-center px-6 py-4 transition-colors duration-300 ${
                  i > 0 ? "border-t border-[#e8eaed]" : ""
                } ${flashRow === row.key ? "bg-blue-50" : "hover:bg-[#fafbff]"}`}
              >
                <div className="col-span-6">
                  <p className="font-sans font-medium text-[14px] sm:text-[15px] leading-[20px] text-foreground">{row.label}</p>
                  <p className="font-sans text-[12px] leading-[16px] text-tertiary">{row.description}</p>
                </div>
                {(["email", "slack", "sms"] as const).map((channel) => (
                  <div key={channel} className="col-span-2 flex justify-center">
                    <NotifCheckbox
                      checked={notifications[row.key][channel]}
                      onChange={() => toggleNotif(row.key, channel)}
                      label={`${row.label} via ${channel}`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Preferences Section */}
        <section
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pb-6 sm:pb-8 border-b border-[#e8eaed]"
          style={sectionStyle(4)}
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[18px] sm:text-[24px] leading-tight text-foreground">Preferences</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Customize your interface experience and regional settings.
            </p>
          </div>
          <div className="col-span-2 bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <SelectField
                label="Default Dashboard View"
                value={dashboardView}
                onChange={(v) => {
                  setDashboardView(v);
                  startTransition(() => void saveUserPreferences({ dashboardView: v }));
                }}
                options={data.dashboardViewOptions}
              />
              <SelectField
                label="Preferred Language"
                value={language}
                onChange={(v) => {
                  setLanguage(v);
                  startTransition(() => void saveUserPreferences({ language: v }));
                }}
                options={data.languageOptions}
              />
              <div className="col-span-2">
                <SelectField
                  label="Timezone"
                  value={timezone}
                  onChange={(v) => {
                    setTimezone(v);
                    startTransition(() => void saveUserPreferences({ timezone: v }));
                  }}
                  options={data.timezoneOptions}
                />
              </div>
            </div>

            {/* Property manager mode toggle */}
            <div className="border-t border-[#e8eaed] pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="font-sans font-medium text-[14px] leading-[20px] text-foreground">
                    Property manager mode
                  </p>
                  <p className="font-sans text-[13px] leading-[18px] text-tertiary">
                    Enable to access the Pro cockpit and manage portfolios on behalf of owners.
                    Turning this on adds a Pro ⇄ My portfolio switch in the header.
                  </p>
                </div>
                {/* Toggle switch — optimistic: flips immediately, fires the action in the background */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isManager}
                  aria-label="Property manager mode"
                  onClick={() => {
                    const next = !isManager;
                    setIsManager(next);
                    startTransition(() =>
                      void setManagerMode(next).then((result) => {
                        // Roll back the optimistic update if the action failed.
                        if (!result.ok) setIsManager(!next);
                      }),
                    );
                  }}
                  className={`relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 ${
                    isManager ? "bg-[#2563eb]" : "bg-[#d1d5db]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-[20px] w-[20px] rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                      isManager ? "translate-x-[20px]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Managers Section — owners/admins only */}
        {data.managersData && (
          <ManagersSection initialData={data.managersData} />
        )}

        {/* Connect Claude Section — in-app entry point for the Valgate MCP connector */}
        <ConnectClaudeSection mcpUrl={mcpUrl} style={sectionStyle(5)} />

        {/* Data & Privacy Section */}
        <section
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pb-6 sm:pb-8 border-b border-[#e8eaed]"
          style={sectionStyle(6)}
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[18px] sm:text-[24px] leading-tight text-foreground">Data &amp; Privacy</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Manage your data exports and historical activity logs.
            </p>
          </div>
          <div className="col-span-2 bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="font-display font-semibold text-[15px] sm:text-[18px] text-val-heading">Export Activity Log</h3>
                <p className="font-sans text-[14px] leading-[20px] text-tertiary">
                  Download a full history of your account actions in CSV format.
                </p>
              </div>
              <button className="flex items-center gap-2 border border-[#d1d5db] rounded-[8px] px-[17px] py-[9px] font-sans font-medium text-[14px] leading-[20px] text-val-heading hover:bg-[#f5f6f7] hover:border-[#b0b8c4] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] transition-all duration-150 shrink-0 cursor-pointer">
                <Download className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone Section */}
        <section
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pb-8 sm:pb-12"
          style={sectionStyle(7)}
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[18px] sm:text-[24px] leading-tight text-[#e11d48]">Danger Zone</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Irreversible actions regarding your account and stored data.
            </p>
          </div>
          <div className="col-span-2 bg-[#fff1f2] border border-[#fecdd3] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="font-display font-semibold text-[15px] sm:text-[18px] text-[#881337]">Delete Account</h3>
                <p className="font-sans text-[14px] leading-[20px] text-[#9f1239]/75">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
              <button className="bg-[#e11d48] text-white font-sans font-medium text-[14px] leading-[20px] px-6 py-2 rounded-[8px] hover:bg-[#be123c] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d48] transition-all duration-150 shrink-0 whitespace-nowrap cursor-pointer">
                Delete Account
              </button>
            </div>
          </div>
        </section>

      </div>
      </div>
    </div>
  );
}

function PasswordField({ label, required, value, onChange }: { label: string; required?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="font-sans font-medium text-[14px] leading-[20px] text-foreground flex items-center">
        {label}{required && <RequiredMark />}
      </label>
      <input
        type="password"
        aria-required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="bg-[#f5f6f7] border border-[#d1d5db] rounded-[8px] px-[17px] py-[10px] font-sans text-[14px] text-foreground placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white hover:border-[#b0b8c4] transition-all duration-150"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="font-sans font-medium text-[14px] leading-[20px] text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#f5f6f7] border border-[#d1d5db] rounded-[8px] px-4 h-[38px] font-sans text-[14px] text-val-heading outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white hover:border-[#b0b8c4] transition-all duration-150 appearance-none cursor-pointer"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function NotifCheckbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`w-[22px] h-[22px] rounded-[5px] flex items-center justify-center border transition-all duration-150 shrink-0 cursor-pointer active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] ${
        checked
          ? "bg-[#2563eb] border-[#2563eb] hover:bg-blue-700 hover:border-blue-700 shadow-[0_1px_3px_rgba(37,99,235,0.4)]"
          : "bg-white border-[#d1d5db] hover:border-[#2563eb]"
      }`}
    >
      {checked && (
        <Check
          className="text-white w-[13px] h-[13px]"
          strokeWidth={3}
          style={{ animation: "scale-in 0.15s ease-out both" }}
        />
      )}
    </button>
  );
}
