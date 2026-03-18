import { useState } from "react";
import {
  User,
  Users,
  Shield,
  Bell,
  FileText,
  Trash2,
} from "lucide-react";

export function SettingsPage() {
  const [fullName, setFullName] = useState("Jon Doe");
  const [email, setEmail] = useState("jon.doe@example.com");
  const [workspaceName, setWorkspaceName] = useState("KLYP estate");
  const [twoFactor, setTwoFactor] = useState(false);
  const [taxReminders, setTaxReminders] = useState(true);
  const [valuationUpdates, setValuationUpdates] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  return (
    <div className="h-full overflow-auto font-['Inter',sans-serif]">
      <div className="p-6 max-w-[1160px] mx-auto">
        <h1 className="text-[20px] text-foreground mb-1" style={{ fontWeight: 600 }}>Settings</h1>
        <p className="text-[14px] text-muted-foreground mb-6">Manage your account and workspace preferences</p>

        <div className="space-y-6">
          {/* Profile */}
          <SettingsCard icon={<User className="w-5 h-5" />} title="Profile">
            <div className="space-y-4">
              <FormField label="Full Name" value={fullName} onChange={setFullName} />
              <FormField label="Email" value={email} onChange={setEmail} />
              <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[14px] hover:bg-primary/90 transition-colors" style={{ fontWeight: 500 }}>
                Save Changes
              </button>
            </div>
          </SettingsCard>

          {/* Workspace */}
          <SettingsCard icon={<Users className="w-5 h-5" />} title="Workspace">
            <div className="space-y-4">
              <FormField label="Workspace Name" value={workspaceName} onChange={setWorkspaceName} />
              <div>
                <p className="text-foreground text-[14px] mb-1" style={{ fontWeight: 600 }}>Members</p>
                <p className="text-muted-foreground text-[14px] mb-2">3 members in this</p>
                <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50 transition-colors" style={{ fontWeight: 500 }}>
                  Manage Members
                </button>
              </div>
            </div>
          </SettingsCard>

          {/* Security */}
          <SettingsCard icon={<Shield className="w-5 h-5" />} title="Security">
            <div className="space-y-4">
              <div>
                <p className="text-foreground text-[14px] mb-2" style={{ fontWeight: 600 }}>Change Password</p>
                <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50 transition-colors" style={{ fontWeight: 500 }}>
                  Update Password
                </button>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground text-[14px]" style={{ fontWeight: 600 }}>Two-Factor Authentication</p>
                    <p className="text-muted-foreground text-[14px]">Add an extra layer of security</p>
                  </div>
                  <Toggle enabled={twoFactor} onChange={setTwoFactor} />
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* Notifications */}
          <SettingsCard icon={<Bell className="w-5 h-5" />} title="Notifications">
            <div className="space-y-0">
              <ToggleRow
                title="Tax Reminders"
                description="Get notified about upcoming tax payments"
                enabled={taxReminders}
                onChange={setTaxReminders}
              />
              <ToggleRow
                title="Valuation Updates"
                description="Receive property valuation changes"
                enabled={valuationUpdates}
                onChange={setValuationUpdates}
                border
              />
              <ToggleRow
                title="System Alerts"
                description="Important system notifications"
                enabled={systemAlerts}
                onChange={setSystemAlerts}
                border
              />
            </div>
          </SettingsCard>

          {/* Data & Privacy */}
          <SettingsCard icon={<FileText className="w-5 h-5" />} title="Data & Privacy">
            <div className="space-y-4">
              <div>
                <p className="text-foreground text-[14px]" style={{ fontWeight: 600 }}>Export Data</p>
                <p className="text-muted-foreground text-[14px] mb-2">Download all your property data</p>
                <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50 transition-colors" style={{ fontWeight: 500 }}>
                  Export Portfolio Data
                </button>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-destructive text-[14px]" style={{ fontWeight: 600 }}>Delete Account</p>
                <p className="text-muted-foreground text-[14px] mb-2">Permanently delete your account and all data</p>
                <button className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-[14px] flex items-center gap-2 hover:bg-destructive/90 transition-colors" style={{ fontWeight: 500 }}>
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-foreground">{icon}</span>
        <h2 className="text-[18px] text-foreground" style={{ fontWeight: 600 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-foreground text-[14px] mb-1 block" style={{ fontWeight: 600 }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-foreground text-card rounded-lg px-3 py-2 text-[14px] border border-border outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? "bg-primary" : "bg-muted"}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${
          enabled ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ToggleRow({ title, description, enabled, onChange, border = false }: {
  title: string; description: string; enabled: boolean; onChange: (v: boolean) => void; border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 ${border ? "border-t border-border" : ""}`}>
      <div>
        <p className="text-foreground text-[14px]" style={{ fontWeight: 600 }}>{title}</p>
        <p className="text-muted-foreground text-[14px]">{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}