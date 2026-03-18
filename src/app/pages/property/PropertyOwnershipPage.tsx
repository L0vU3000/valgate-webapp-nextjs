import { PropertyLayout } from "../../components/property/PropertyLayout";
import { Check, Mail, Phone, MapPin, FileText, Upload } from "lucide-react";

export function PropertyOwnershipPage() {
  return (
    <PropertyLayout activeTab="ownership">
      <div className="p-6 space-y-6 max-w-[1160px] mx-auto w-full">
        {/* KPI Stats Row */}
        <div className="grid grid-cols-4 gap-6">
          <KpiStat label="OWNERSHIP TYPE" value="Tenancy in Common" sub="Joint ownership" />
          <KpiStat label="TOTAL OWNERS" value="2" sub="Co-owners" />
          <KpiStat label="ACQUISITION PRICE" value="$485,000" sub="Mar 2021" />
          <KpiStat label="HOLDING PERIOD" value="4 yrs 3 mos" sub="Since Mar 2021" />
        </div>

        {/* Equity & Financial + Ownership Split */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7 bg-card border border-border rounded-xl p-6">
            <h3 className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>EQUITY & FINANCIAL POSITION</h3>
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-[12px] text-muted-foreground">Current Estimated Value</p>
                <p className="text-[30px] text-foreground" style={{ fontWeight: 700 }}>$612,000</p>
                <p className="text-[12px] text-[#059669]">▲ +26.2% since purchase</p>
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground">Remaining Mortgage</p>
                <p className="text-[30px] text-foreground" style={{ fontWeight: 700 }}>$341,200</p>
                <p className="text-[12px] text-muted-foreground">Fixed 30yr @ 3.875%</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-[12px] text-muted-foreground mb-1">Equity Bar</p>
              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                <div className="bg-foreground h-full" style={{ width: "44%" }} />
              </div>
              <p className="text-[14px] text-foreground mt-1">$270,800 (44.2%)</p>
            </div>
            <div className="flex gap-8 text-[14px]">
              <div>
                <p className="text-muted-foreground text-[12px]">LTV Ratio</p>
                <p className="text-foreground" style={{ fontWeight: 600 }}>55.8%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[12px]">Monthly P/I</p>
                <p className="text-foreground" style={{ fontWeight: 600 }}>$1,612/mo</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[12px]">Next Payment Due</p>
                <p className="text-foreground" style={{ fontWeight: 600 }}>Feb 01, 2026</p>
              </div>
            </div>
          </div>

          <div className="col-span-5 bg-card border border-border rounded-xl p-6">
            <h3 className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>OWNERSHIP SPLIT</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-[140px] h-[140px]">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#E8EAED" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#14181B" strokeWidth="12"
                    strokeDasharray={`${60 * 2.51} ${100 * 2.51}`} />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#059669" strokeWidth="12"
                    strokeDasharray={`${40 * 2.51} ${100 * 2.51}`} strokeDashoffset={`${-60 * 2.51}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>60% • 40%</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-[14px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-foreground rounded-full" />
                <span className="text-foreground">J. Smith 60%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#059669] rounded-full" />
                <span className="text-foreground">M. Jones 40%</span>
              </div>
            </div>
            <button className="text-primary text-[14px] mt-3">Edit Split</button>
          </div>
        </div>

        {/* Owner Cards */}
        <div className="grid grid-cols-2 gap-6">
          <OwnerCard
            initials="JS"
            name="James Smith"
            badge="Primary Owner"
            badgeColor="#059669"
            share={60}
            equity="$162,480"
            email="james.smith@email.com"
            phone="(312) 555-0147"
            address="456 Owner Ave, Chicago IL 60601"
            ssn="••••-••-4832"
            entity="Individual"
            status="On file (2024)"
          />
          <OwnerCard
            initials="MJ"
            name="Maria Jones"
            badge="Minor"
            badgeColor="#059669"
            share={40}
            equity="$108,320"
            email="m.jones@email.com"
            phone="(312) 555-0192"
            address="789 Partner St, Chicago IL 60602"
            ssn="••••-••-7710"
            entity="LLC — Jones Prop Holdings"
            status="On file (2024)"
          />
        </div>

        {/* Acquisition Details + Income Distribution */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>Acquisition Details</h3>
            <div className="space-y-3 text-[14px]">
              {[
                ["Purchase Price", "$485,000"],
                ["Down Payment", "$97,000 (20%)"],
                ["Closing Costs", "$9,200"],
                ["Total Acquisition", "$106,200 cash deployed"],
                ["Lender", "First Midwest Bank"],
                ["Loan Amount", "$388,000"],
                ["Interest Rate", "3.875% Fixed"],
                ["Loan Term", "30 Years"],
                ["Origination Date", "Mar 15, 2021"],
                ["Maturity Date", "Mar 15, 2051"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground" style={{ fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>Income & Expense Distribution</h3>
            <div className="mb-4">
              <p className="text-[12px] text-muted-foreground mb-2">Distribution Method</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-[14px] text-foreground">
                  <div className="w-4 h-4 border-2 border-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  Pro-Rata by Share
                </label>
                <label className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-border rounded-full" />
                  Custom
                </label>
              </div>
            </div>
            <div className="space-y-4 text-[14px]">
              <div>
                <p className="text-muted-foreground text-[12px] mb-1">Rent Income Split</p>
                <div className="flex justify-between">
                  <span className="text-foreground">J. Smith 60%</span>
                  <span className="text-foreground">$1,080/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">M. Jones 40%</span>
                  <span className="text-foreground">$720/mo</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-[12px] mb-1">Expense Responsibility</p>
                <div className="flex justify-between">
                  <span className="text-foreground">J. Smith 60%</span>
                  <span className="text-muted-foreground">shared costs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">M. Jones 40%</span>
                  <span className="text-muted-foreground">shared costs</span>
                </div>
              </div>
              <button className="text-primary text-[14px]">Edit Distribution Rules</button>
            </div>
          </div>
        </div>

        {/* Ownership Documents */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] text-foreground" style={{ fontWeight: 600 }}>Ownership Documents</h3>
            <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[14px] flex items-center gap-2 hover:bg-primary/90">
              <Upload className="w-4 h-4" />
              Upload Doc
            </button>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-muted-foreground text-[12px] border-b border-border">
                <th className="text-left pb-2">NAME</th>
                <th className="text-left pb-2">TYPE</th>
                <th className="text-left pb-2">DATE</th>
                <th className="text-left pb-2">OWNER</th>
                <th className="text-left pb-2">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Property Deed", type: "Title Document", date: "Mar 2021", owner: "Both", status: "Current" },
                { name: "Purchase Agreement", type: "Contract", date: "Feb 2021", owner: "Both", status: "Current" },
                { name: "Mortgage Note", type: "Loan Document", date: "Mar 2021", owner: "Both", status: "Current" },
                { name: "Co-Owner Agreement", type: "Legal Agreement", date: "Mar 2021", owner: "Both", status: "Current" },
              ].map((doc) => (
                <tr key={doc.name} className="border-b border-border">
                  <td className="py-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {doc.name}
                  </td>
                  <td className="py-3 text-muted-foreground">{doc.type}</td>
                  <td className="py-3 text-muted-foreground">{doc.date}</td>
                  <td className="py-3 text-muted-foreground">{doc.owner}</td>
                  <td className="py-3"><span className="text-[#059669]">{doc.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ownership History & Activity */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>Ownership History & Activity</h3>
          <div className="space-y-4">
            {[
              { date: "Jan 15, 2026", icon: "📄", text: "1099 forms generated and sent to both owners", color: "#2563EB" },
              { date: "Dec 01, 2025", icon: "🔔", text: "Annual equity statement distributed", color: "#F59E0B" },
              { date: "Mar 15, 2021", icon: "🏠", text: "Property acquired — Tenancy in Common established", color: "#059669" },
              { date: "Mar 15, 2021", icon: "📋", text: "Deed recorded with Cook County", color: "#515D66" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-[14px] text-muted-foreground w-[120px] shrink-0">{item.date}</span>
                <span className="text-[16px]">{item.icon}</span>
                <span className="text-[14px] text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PropertyLayout>
  );
}

function KpiStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[10px] text-muted-foreground tracking-wider mb-1">{label}</p>
      <p className="text-[20px] text-foreground" style={{ fontWeight: 700 }}>{value}</p>
      <p className="text-[12px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function OwnerCard({ initials, name, badge, badgeColor, share, equity, email, phone, address, ssn, entity, status }: {
  initials: string; name: string; badge: string; badgeColor: string; share: number; equity: string;
  email: string; phone: string; address: string; ssn: string; entity: string; status: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-[14px]">
            {initials}
          </div>
          <p className="text-[18px] text-foreground" style={{ fontWeight: 600 }}>{name}</p>
        </div>
        <span className="text-white text-[12px] px-3 py-1 rounded-full" style={{ backgroundColor: badgeColor }}>
          {badge}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-muted-foreground">Ownership Share</span>
          <span className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>{share}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
        </div>
      </div>
      <p className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>Equity Value: {equity}</p>

      <div className="space-y-2 text-[14px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="w-4 h-4" />
          {email}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-4 h-4" />
          {phone}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          {address}
        </div>
      </div>

      <div className="border-t border-border mt-4 pt-4 space-y-2 text-[14px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">SSN / EIN</span>
          <span className="text-foreground">{ssn}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax Entity</span>
          <span className="text-foreground">{entity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">1099 Status</span>
          <span className="text-[#059669] flex items-center gap-1">
            <Check className="w-3 h-3" /> {status}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button className="text-primary text-[14px]">Edit Owner</button>
        {share === 60 && (
          <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[14px]">Save changes</button>
        )}
        {share === 40 && (
          <button className="text-primary text-[14px]">View Documents</button>
        )}
      </div>
    </div>
  );
}