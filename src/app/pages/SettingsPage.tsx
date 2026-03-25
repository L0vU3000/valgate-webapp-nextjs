import { useState } from "react";
import { Check, Smartphone, Download } from "lucide-react";

type NotifChannels = { email: boolean; slack: boolean; sms: boolean };

const NOTIFICATION_ROWS: { key: string; label: string; description: string }[] = [
  { key: "valuationUpdates", label: "Property Valuation Updates", description: "When an asset value changes significantly" },
  { key: "teamComments", label: "Team Comments", description: "When a team member mentions you" },
  { key: "marketInsights", label: "Market Insights", description: "Weekly summary of market trends" },
];

export function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notifications, setNotifications] = useState<Record<string, NotifChannels>>({
    valuationUpdates: { email: true, slack: true, sms: false },
    teamComments: { email: true, slack: true, sms: true },
    marketInsights: { email: true, slack: false, sms: false },
  });

  const [dashboardView, setDashboardView] = useState("portfolio-overview");
  const [language, setLanguage] = useState("en-US");
  const [timezone, setTimezone] = useState("America/New_York");

  const toggleNotif = (key: string, channel: keyof NotifChannels) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] },
    }));
  };

  return (
    <div className="h-full overflow-y-auto bg-[#f8f9ff]">
      <div className="max-w-[1200px] mx-auto p-8 flex flex-col gap-8">

        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <h1 className="font-display font-extrabold text-[30px] leading-[36px] tracking-[-0.75px] text-foreground">
            Account Settings
          </h1>
          <p className="font-sans text-[18px] leading-[28px] text-secondary">
            Manage your personal information, security preferences, and notification settings.
          </p>
        </div>

        {/* Security Section */}
        <section className="grid grid-cols-3 gap-8 pb-8 border-b border-[#e8eaed]">
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[20px] leading-[28px] text-foreground">Security</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Keep your account secure by updating your credentials and enabling multi-factor authentication.
            </p>
          </div>
          <div className="col-span-2 flex flex-col gap-6">
            {/* Update Password Card */}
            <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px] flex flex-col gap-4">
              <h3 className="font-display font-semibold text-[16px] leading-[24px] text-[#121c28]">Update Password</h3>
              <div className="flex flex-col gap-4">
                <PasswordField label="Current Password" value={currentPassword} onChange={setCurrentPassword} />
                <div className="grid grid-cols-2 gap-4">
                  <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} />
                  <PasswordField label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} />
                </div>
                <div className="flex justify-end pt-2">
                  <button className="bg-[#2563eb] text-white font-sans font-medium text-[14px] leading-[20px] px-6 py-2 rounded-[8px] hover:bg-blue-700 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>
            </div>

            {/* MFA Card */}
            <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px] flex flex-col gap-4">
              <h3 className="font-display font-semibold text-[16px] leading-[24px] text-[#121c28]">Multi-Factor Authentication</h3>
              <div className="flex flex-col gap-4">
                {/* Authenticator App — enabled */}
                <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-[12px] p-[17px] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#059669] rounded-full size-[40px] flex items-center justify-center shrink-0">
                      <Check className="text-white w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="font-sans font-semibold text-[14px] leading-[20px] text-[#065f46]">Authenticator App</p>
                      <p className="font-sans text-[12px] leading-[16px] text-[#065f46] opacity-80">Enabled &amp; Verified</p>
                    </div>
                  </div>
                  <button className="font-sans font-semibold text-[14px] leading-[20px] text-[#065f46] hover:underline">Manage</button>
                </div>
                {/* SMS Recovery — not configured */}
                <div className="bg-[#f5f6f7] border border-[#d1d5db] rounded-[12px] p-[17px] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#d1d5db] rounded-full size-[40px] flex items-center justify-center shrink-0">
                      <Smartphone className="text-white w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-sans font-semibold text-[14px] leading-[20px] text-foreground">SMS Recovery</p>
                      <p className="font-sans text-[12px] leading-[16px] text-tertiary">Not configured</p>
                    </div>
                  </div>
                  <button className="font-sans font-semibold text-[14px] leading-[20px] text-[#2563eb] hover:underline">Setup</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="grid grid-cols-3 gap-8 pb-8 border-b border-[#e8eaed]">
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[20px] leading-[28px] text-foreground">Notifications</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Choose how you want to be notified about activity in your portfolio.
            </p>
          </div>
          <div className="col-span-2 bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Table Header */}
            <div className="bg-[#f5f6f7] border-b border-[#d1d5db] grid grid-cols-12 px-6 py-3">
              <div className="col-span-6 font-sans font-semibold text-[12px] leading-[16px] tracking-[0.6px] uppercase text-tertiary">Event Activity</div>
              <div className="col-span-2 font-sans font-semibold text-[12px] leading-[16px] tracking-[0.6px] uppercase text-tertiary text-center">Email</div>
              <div className="col-span-2 font-sans font-semibold text-[12px] leading-[16px] tracking-[0.6px] uppercase text-tertiary text-center">Slack</div>
              <div className="col-span-2 font-sans font-semibold text-[12px] leading-[16px] tracking-[0.6px] uppercase text-tertiary text-center">SMS</div>
            </div>
            {/* Table Rows */}
            {NOTIFICATION_ROWS.map((row, i) => (
              <div
                key={row.key}
                className={`grid grid-cols-12 items-center px-6 py-4 ${i > 0 ? "border-t border-[#e8eaed]" : ""}`}
              >
                <div className="col-span-6">
                  <p className="font-sans font-medium text-[14px] leading-[20px] text-foreground">{row.label}</p>
                  <p className="font-sans text-[12px] leading-[16px] text-tertiary">{row.description}</p>
                </div>
                {(["email", "slack", "sms"] as const).map((channel) => (
                  <div key={channel} className="col-span-2 flex justify-center">
                    <NotifCheckbox
                      checked={notifications[row.key][channel]}
                      onChange={() => toggleNotif(row.key, channel)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Preferences Section */}
        <section className="grid grid-cols-3 gap-8 pb-8 border-b border-[#e8eaed]">
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[20px] leading-[28px] text-foreground">Preferences</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Customize your interface experience and regional settings.
            </p>
          </div>
          <div className="col-span-2 bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="grid grid-cols-2 gap-6">
              <SelectField
                label="Default Dashboard View"
                value={dashboardView}
                onChange={setDashboardView}
                options={[
                  { value: "portfolio-overview", label: "Portfolio Overview" },
                  { value: "analytics", label: "Analytics" },
                  { value: "map", label: "Map View" },
                ]}
              />
              <SelectField
                label="Preferred Language"
                value={language}
                onChange={setLanguage}
                options={[
                  { value: "en-US", label: "English (US)" },
                  { value: "km", label: "Khmer" },
                  { value: "zh", label: "Chinese" },
                ]}
              />
              <div className="col-span-2">
                <SelectField
                  label="Timezone"
                  value={timezone}
                  onChange={setTimezone}
                  options={[
                    { value: "America/New_York", label: "(GMT-05:00) Eastern Time (US & Canada)" },
                    { value: "America/Chicago", label: "(GMT-06:00) Central Time (US & Canada)" },
                    { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)" },
                    { value: "Asia/Phnom_Penh", label: "(GMT+07:00) Phnom Penh" },
                    { value: "Asia/Singapore", label: "(GMT+08:00) Singapore" },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Data & Privacy Section */}
        <section className="grid grid-cols-3 gap-8 pb-8 border-b border-[#e8eaed]">
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[20px] leading-[28px] text-foreground">Data &amp; Privacy</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Manage your data exports and historical activity logs.
            </p>
          </div>
          <div className="col-span-2 bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="font-display font-semibold text-[16px] leading-[24px] text-[#121c28]">Export Activity Log</h3>
                <p className="font-sans text-[14px] leading-[20px] text-tertiary">
                  Download a full history of your account actions in CSV format.
                </p>
              </div>
              <button className="flex items-center gap-2 border border-[#d1d5db] rounded-[8px] px-[17px] py-[9px] font-sans font-medium text-[14px] leading-[20px] text-[#121c28] hover:bg-[#f5f6f7] transition-colors shrink-0">
                <Download className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone Section */}
        <section className="grid grid-cols-3 gap-8 pb-12">
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-[20px] leading-[28px] text-[#e11d48]">Danger Zone</h2>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Irreversible actions regarding your account and stored data.
            </p>
          </div>
          <div className="col-span-2 bg-[#fff1f2] border border-[#fecdd3] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="font-display font-semibold text-[16px] leading-[24px] text-[#881337]">Delete Account</h3>
                <p className="font-sans text-[14px] leading-[20px] text-[#881337] opacity-80">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
              <button className="bg-[#e11d48] text-white font-sans font-medium text-[14px] leading-[20px] px-10 py-2 rounded-[8px] hover:bg-red-700 transition-colors shrink-0">
                Delete<br />Account
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="font-sans font-medium text-[14px] leading-[20px] text-foreground">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="bg-[#f5f6f7] border border-[#d1d5db] rounded-[8px] px-[17px] py-[10px] font-sans text-[14px] text-[#6b7280] outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition-shadow"
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
        className="bg-[#f5f6f7] border border-[#d1d5db] rounded-[8px] px-4 h-[38px] font-sans text-[14px] text-[#121c28] outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] transition-shadow appearance-none cursor-pointer"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function NotifCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`w-[22px] h-[22px] rounded-[4px] flex items-center justify-center border transition-colors shrink-0 ${
        checked
          ? "bg-[#2563eb] border-[#2563eb]"
          : "bg-white border-[#d1d5db]"
      }`}
    >
      {checked && <Check className="text-white w-[14px] h-[14px]" strokeWidth={3} />}
    </button>
  );
}
