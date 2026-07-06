"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Smartphone,
  Download,
  User,
  Shield,
  BadgeCheck,
  Users,
  Database,
  AlertTriangle,
  Bell,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { RequiredMark } from "@/components/ui/required-mark";
import { AppHeader } from "@/components/layout/AppHeader";
import type { SettingsPageData, NotifChannels } from "../queries";
import type { ProfilePageData } from "../../profile/queries";
import { saveNotificationPreference, saveUserPreferences, setManagerMode } from "../actions";
import { ManagersSection } from "./ManagersSection";
import { ConnectClaudeSection } from "./ConnectClaudeSection";
import { ProfileSection } from "./ProfileSection";

// Section identifiers. `group` splits the left-nav into Account (the user) and
// App (app setup); `adminOnly` items (Managers) render only when the data is
// present (owner/admin org role).
type SectionId =
  | "profile"
  | "security"
  | "account-type"
  | "managers"
  | "data-privacy"
  | "danger"
  | "notifications"
  | "preferences"
  | "connect-claude";

type NavItem = {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  group: "account" | "app";
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "Profile", icon: User, group: "account" },
  { id: "security", label: "Security", icon: Shield, group: "account" },
  { id: "account-type", label: "Account type", icon: BadgeCheck, group: "account" },
  { id: "managers", label: "Managers", icon: Users, group: "account", adminOnly: true },
  { id: "data-privacy", label: "Data & Privacy", icon: Database, group: "account" },
  { id: "danger", label: "Danger zone", icon: AlertTriangle, group: "account" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "app" },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal, group: "app" },
  { id: "connect-claude", label: "Connect Claude", icon: Sparkles, group: "app" },
];

export function SettingsPage({
  data,
  mcpUrl,
  profileData,
}: {
  data: SettingsPageData;
  mcpUrl: string;
  profileData: ProfilePageData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Which sections actually exist for this user (Managers is owner/admin only).
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || data.managersData);

  // Seed the active section from ?section=, falling back to Profile if the
  // param is missing or points at a section this user can't see.
  const requested = searchParams.get("section") as SectionId | null;
  const initial = items.some((i) => i.id === requested) ? (requested as SectionId) : "profile";
  const [active, setActive] = useState<SectionId>(initial);

  const selectSection = (id: SectionId) => {
    setActive(id);
    // Keep the URL shareable/deep-linkable without a scroll jump.
    router.replace(`${pathname}?section=${id}`, { scroll: false });
  };

  const accountItems = items.filter((i) => i.group === "account");
  const appItems = items.filter((i) => i.group === "app");

  return (
    <div className="h-full flex flex-col bg-val-bg-page-alt">
      <AppHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-full sm:max-w-[1200px] mx-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
          {/* Page header */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark]">Valgate</span>
              <span className="text-[11px] text-slate-300">/</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Settings</span>
            </div>
            <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">
              Settings
            </h1>
            <p className="text-[14px] sm:text-[15px] text-slate-500 mt-2">
              Manage your account, security, and app preferences.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
            {/* Left nav — grouped rail on desktop, horizontal scroll on mobile */}
            <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0 lg:w-[232px] lg:shrink-0 lg:sticky lg:top-0 lg:self-start">
              <NavGroup label="Account" items={accountItems} active={active} onSelect={selectSection} />
              <NavGroup label="App" items={appItems} active={active} onSelect={selectSection} />
            </nav>

            {/* Panel — remounts on section change for a light fade-in */}
            <div key={active} className="flex-1 min-w-0" style={{ animation: "fade-slide-up 0.3s ease-out both" }}>
              {active === "profile" && <ProfileSection data={profileData} />}
              {active === "security" && <SecuritySection />}
              {active === "account-type" && <AccountTypeSection initialIsManager={data.isManager} />}
              {active === "managers" && data.managersData && <ManagersSection initialData={data.managersData} />}
              {active === "data-privacy" && <DataPrivacySection />}
              {active === "danger" && <DangerZoneSection />}
              {active === "notifications" && (
                <NotificationsSection rows={data.notificationRows} defaultNotifications={data.defaultNotifications} />
              )}
              {active === "preferences" && (
                <PreferencesSection
                  defaults={data.defaults}
                  dashboardViewOptions={data.dashboardViewOptions}
                  languageOptions={data.languageOptions}
                  timezoneOptions={data.timezoneOptions}
                />
              )}
              {active === "connect-claude" && <ConnectClaudeSection mcpUrl={mcpUrl} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Left nav ──────────────────────────────────────────────────────────── */

function NavGroup({
  label,
  items,
  active,
  onSelect,
}: {
  label: string;
  items: NavItem[];
  active: string;
  onSelect: (id: SectionId) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-1 lg:flex-col lg:gap-0.5 lg:mb-4">
      <p className="hidden lg:block px-3 mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
        {label}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        const isDanger = item.id === "danger";
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2.5 h-10 px-3 rounded-lg text-[14px] whitespace-nowrap transition-colors duration-150 shrink-0 ${
              isActive
                ? isDanger
                  ? "bg-[#fff1f2] text-[#e11d48] font-semibold"
                  : "bg-[#eef1f6] text-foreground font-semibold"
                : isDanger
                  ? "text-[#e11d48]/80 hover:bg-[#fff1f2]"
                  : "text-slate-500 hover:bg-[#f5f6f7] hover:text-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Section wrapper ───────────────────────────────────────────────────── */

function SectionHeader({ title, description, danger = false }: { title: string; description: string; danger?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className={`font-display font-bold text-[20px] sm:text-[24px] leading-tight ${danger ? "text-[#e11d48]" : "text-foreground"}`}>
        {title}
      </h2>
      <p className="font-sans text-[14px] leading-[20px] text-tertiary">{description}</p>
    </div>
  );
}

/* ─── Security ──────────────────────────────────────────────────────────── */

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Security"
        description="Keep your account secure by updating your credentials and enabling multi-factor authentication."
      />
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
  );
}

/* ─── Account type (Standard | Pro) ─────────────────────────────────────── */

function AccountTypeSection({ initialIsManager }: { initialIsManager: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [isManager, setIsManager] = useState(initialIsManager);

  // Standard ⇄ Pro. "Pro" == the is_manager flag underneath; it unlocks the Pro
  // cockpit (sidebar item, header pill, /pro route). Optimistic + self-serve:
  // flip immediately, persist in the background, roll back if the write fails.
  const handleAccountTypeChange = (nextIsPro: boolean) => {
    if (nextIsPro === isManager) return;
    setIsManager(nextIsPro);
    startTransition(() =>
      void setManagerMode(nextIsPro).then((result) => {
        if (!result.ok) {
          setIsManager(!nextIsPro); // roll back the optimistic flip
          return;
        }
        // Downgrade guard: if we just left Pro while inside the cockpit, move
        // out to a Standard-safe route. No-op today (this control lives in
        // /settings) but preserves the invariant if surfaced elsewhere.
        if (!nextIsPro && pathname.startsWith("/pro")) {
          router.push("/");
        }
      }),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Account type"
        description="Choose the experience that fits how you use Valgate. You can switch at any time."
      />
      <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-sans font-medium text-[14px] leading-[20px] text-foreground">
            {isManager ? "Pro" : "Standard"}
          </p>
          <p className="font-sans text-[13px] leading-[18px] text-tertiary max-w-[520px]">
            Standard is the owner experience for managing your own portfolio. Pro unlocks the
            Pro cockpit for managing portfolios on behalf of owners, and adds a Pro entry point
            to your sidebar and header.
          </p>
        </div>
        <AccountTypeControl isPro={isManager} onChange={handleAccountTypeChange} />
      </div>
    </div>
  );
}

/**
 * Standard | Pro segmented control. Two visible options; the selected one is
 * filled white with the label in brand blue (blue stays precious — it only
 * marks the active choice). Reads as "choose who you are", not a feature toggle.
 */
function AccountTypeControl({ isPro, onChange }: { isPro: boolean; onChange: (nextIsPro: boolean) => void }) {
  const options: { label: string; value: boolean }[] = [
    { label: "Standard", value: false },
    { label: "Pro", value: true },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Account type"
      className="inline-flex shrink-0 items-center gap-1 rounded-[10px] border border-[#d1d5db] bg-[#f5f6f7] p-1"
    >
      {options.map((opt) => {
        const selected = opt.value === isPro;
        return (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`h-9 rounded-[7px] px-5 font-sans text-[14px] font-medium transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] ${
              selected
                ? "bg-white text-[#2563eb] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Notifications ─────────────────────────────────────────────────────── */

function NotificationsSection({
  rows,
  defaultNotifications,
}: {
  rows: SettingsPageData["notificationRows"];
  defaultNotifications: Record<string, NotifChannels>;
}) {
  const [, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<Record<string, NotifChannels>>(defaultNotifications);
  const [flashRow, setFlashRow] = useState<string | null>(null);

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
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Notifications"
        description="Choose how you want to be notified about activity in your portfolio."
      />
      <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="bg-[#f5f6f7] border-b border-[#d1d5db] grid grid-cols-12 px-6 py-3">
          <div className="col-span-6 font-sans font-semibold text-[11px] leading-[16px] tracking-[0.05em] uppercase text-slate-500">Event Activity</div>
          <div className="col-span-2 font-sans font-semibold text-[11px] leading-[16px] tracking-[0.05em] uppercase text-slate-500 text-center">Email</div>
          <div className="col-span-2 font-sans font-semibold text-[11px] leading-[16px] tracking-[0.05em] uppercase text-slate-500 text-center">Slack</div>
          <div className="col-span-2 font-sans font-semibold text-[11px] leading-[16px] tracking-[0.05em] uppercase text-slate-500 text-center">SMS</div>
        </div>
        {rows.map((row, i) => (
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
    </div>
  );
}

/* ─── Preferences ───────────────────────────────────────────────────────── */

function PreferencesSection({
  defaults,
  dashboardViewOptions,
  languageOptions,
  timezoneOptions,
}: {
  defaults: SettingsPageData["defaults"];
  dashboardViewOptions: SettingsPageData["dashboardViewOptions"];
  languageOptions: SettingsPageData["languageOptions"];
  timezoneOptions: SettingsPageData["timezoneOptions"];
}) {
  const [, startTransition] = useTransition();
  const [dashboardView, setDashboardView] = useState(defaults.dashboardView);
  const [language, setLanguage] = useState(defaults.language);
  const [timezone, setTimezone] = useState(defaults.timezone);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Preferences" description="Customize your interface experience and regional settings." />
      <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <SelectField
            label="Default Dashboard View"
            value={dashboardView}
            onChange={(v) => {
              setDashboardView(v);
              startTransition(() => void saveUserPreferences({ dashboardView: v }));
            }}
            options={dashboardViewOptions}
          />
          <SelectField
            label="Preferred Language"
            value={language}
            onChange={(v) => {
              setLanguage(v);
              startTransition(() => void saveUserPreferences({ language: v }));
            }}
            options={languageOptions}
          />
          <div className="col-span-2">
            <SelectField
              label="Timezone"
              value={timezone}
              onChange={(v) => {
                setTimezone(v);
                startTransition(() => void saveUserPreferences({ timezone: v }));
              }}
              options={timezoneOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Data & Privacy ────────────────────────────────────────────────────── */

function DataPrivacySection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Data & Privacy" description="Manage your data exports and historical activity logs." />
      <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px]">
        <div className="flex items-center justify-between gap-4">
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
    </div>
  );
}

/* ─── Danger zone ───────────────────────────────────────────────────────── */

function DangerZoneSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Danger zone" description="Irreversible actions regarding your account and stored data." danger />
      <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px]">
        <div className="flex items-center justify-between gap-4">
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
    </div>
  );
}

/* ─── Shared field primitives ───────────────────────────────────────────── */

function PasswordField({ label, required, value, onChange }: { label: string; required?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="font-sans font-medium text-[14px] leading-[20px] text-foreground flex items-center">
        {label}
        {required && <RequiredMark />}
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
        <Check className="text-white w-[13px] h-[13px]" strokeWidth={3} style={{ animation: "scale-in 0.15s ease-out both" }} />
      )}
    </button>
  );
}
