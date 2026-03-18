import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Camera,
  Upload,
  FileEdit,
  ChevronLeft,
  Home,
  Building2,
  Warehouse,
  Store,
  LandPlot,
  Factory,
  HardHat,
  MoreHorizontal,
  MapPin,
  Info,
  DollarSign,
  X,
  Plus,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const stepLabels = [
  "Start",
  "Property Type",
  "Basic Information",
  "Financial Information",
  "Photos & Documents",
  "Review & Submit",
  "Success",
];

interface FormData {
  method: string;
  propertyType: string;
  propertyName: string;
  propertyId: string;
  addressLine: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  yearBuilt: string;
  totalArea: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  storageUnit: string;
  purchasePrice: string;
  purchaseDate: string;
  currentMarketValue: string;
  ownershipStatus: string;
  outstandingMortgage: string;
  monthlyPayment: string;
  interestRate: string;
  annualPropertyTax: string;
  taxAssessmentValue: string;
  annualInsurance: string;
  photos: string[];
  documents: string[];
}

const defaultForm: FormData = {
  method: "",
  propertyType: "",
  propertyName: "Sunset Villa",
  propertyId: "SR00015",
  addressLine: "#24, Street 337, Sangkat Boeung Kak",
  addressLine2: "",
  city: "Phnom Penh",
  state: "",
  zip: "",
  country: "Cambodia",
  yearBuilt: "2018",
  totalArea: "2,450",
  bedrooms: "3",
  bathrooms: "2",
  parkingSpaces: "2",
  storageUnit: "1",
  purchasePrice: "$250,000",
  purchaseDate: "Jan 15, 2024",
  currentMarketValue: "$275,000",
  ownershipStatus: "Financed",
  outstandingMortgage: "$180,000",
  monthlyPayment: "$1,234",
  interestRate: "4.5%",
  annualPropertyTax: "$3,200",
  taxAssessmentValue: "$240,000",
  annualInsurance: "$1,800",
  photos: ["123.jpg", "123.jpg", "123.jpg", "123.jpg", "123.jpg", "123.jpg", "123.jpg"],
  documents: ["Title_Deed_SR00015.pdf", "Property_Inspection_Report.pdf", "Purchase_Agreement_2024.pdf"],
};

export function AddPropertyPage() {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const navigate = useNavigate();

  const goNext = () => setStep((s) => Math.min(s + 1, 6) as Step);
  const goBack = () => setStep((s) => Math.max(s - 1, 0) as Step);

  const progressPercent = step === 0 ? 0 : (step / 6) * 100;

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header - only show for steps 1-5 */}
      {step >= 1 && step <= 5 && (
        <div className="px-8 pt-8 pb-0 shrink-0">
          <div className="max-w-[1160px] mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-[30px] text-[#6B7684] font-['Plus_Jakarta_Sans',sans-serif]" style={{ fontWeight: 600 }}>
                Add New Property
              </h1>
              <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50">
                Save as Draft
              </button>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-[#E8EAED] rounded-full mb-2">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-primary text-[14px] mb-6" style={{ fontWeight: 500 }}>
              Step {step} of 6: {stepLabels[step]}
            </p>
          </div>
        </div>
      )}

      {/* Step 0: Title only */}
      {step === 0 && (
        <div className="px-8 pt-8 shrink-0">
          <div className="max-w-[1160px] mx-auto">
            <h1 className="text-[30px] text-[#6B7684] font-['Plus_Jakarta_Sans',sans-serif]" style={{ fontWeight: 600 }}>
              Add New Property
            </h1>
          </div>
        </div>
      )}

      {/* Step 6: Title only */}
      {step === 6 && (
        <div className="px-8 pt-8 shrink-0">
          <div className="max-w-[1160px] mx-auto">
            <h1 className="text-[30px] text-[#6B7684] font-['Plus_Jakarta_Sans',sans-serif]" style={{ fontWeight: 600 }}>
              Add New Property
            </h1>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-8 pb-4 overflow-auto">
        <div className="max-w-[1160px] mx-auto">
        {step === 0 && <Step0NewOrDraft form={form} setForm={setForm} onContinue={goNext} />}
        {step === 1 && <Step1PropertyType form={form} setForm={setForm} />}
        {step === 2 && <Step2BasicInfo form={form} setForm={setForm} />}
        {step === 3 && <Step3Financial form={form} setForm={setForm} />}
        {step === 4 && <Step4PhotosDocs form={form} setForm={setForm} />}
        {step === 5 && <Step5Review form={form} />}
        {step === 6 && <Step6Success />}
        </div>
      </div>

      {/* Footer - steps 1-5 */}
      {step >= 1 && step <= 5 && (
        <div className="px-8 py-4 border-t border-border shrink-0">
          <div className="max-w-[1160px] mx-auto flex items-center justify-between">
            <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground hover:bg-accent/50">
              Save as Draft
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={goBack}
                className="border border-border rounded-lg px-6 py-2 text-[14px] text-foreground hover:bg-accent/50"
              >
                Go Back
              </button>
              <button
                onClick={goNext}
                className="bg-primary text-white rounded-lg px-6 py-2 text-[14px] hover:bg-primary/90"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────── Step 0: New or Draft ────────── */
function Step0NewOrDraft({
  form,
  setForm,
  onContinue,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  onContinue: () => void;
}) {
  const navigate = useNavigate();
  const methods = [
    {
      key: "photo",
      badge: "Fastest",
      badgeColor: "#2563EB",
      icon: Camera,
      iconBg: "#EFF6FF",
      iconColor: "#2563EB",
      title: "Take a photo",
      desc: "Start by taking a photo of your property document",
    },
    {
      key: "upload",
      badge: "Faster",
      badgeColor: "#059669",
      icon: Upload,
      iconBg: "#ECFDF5",
      iconColor: "#059669",
      title: "Upload document",
      desc: "Start by uploading your property document",
    },
    {
      key: "manual",
      badge: "If no document",
      badgeColor: "#6B7684",
      icon: FileEdit,
      iconBg: "#F3F4F6",
      iconColor: "#6B7684",
      title: "Manual input",
      desc: "Enter property information manually",
    },
  ];

  return (
    <div className="max-w-[800px] mx-auto">
      <button
        onClick={() => navigate("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        Add property
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Create new record or continue from draft
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {methods.map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setForm({ ...form, method: m.key });
              onContinue();
            }}
            className={`text-left border rounded-xl p-5 hover:border-primary transition-colors ${
              form.method === m.key ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <span
              className="text-[12px] px-2 py-0.5 rounded-full inline-block mb-4"
              style={{
                color: m.badgeColor,
                backgroundColor: m.badgeColor + "15",
              }}
            >
              {m.badge}
            </span>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: m.iconBg }}
            >
              <m.icon className="w-5 h-5" style={{ color: m.iconColor }} />
            </div>
            <p className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
              {m.title}
            </p>
            <p className="text-[14px] text-muted-foreground">{m.desc}</p>
          </button>
        ))}
      </div>

      <p className="text-[14px] text-foreground mb-3" style={{ fontWeight: 500 }}>
        Or continue from drafts
      </p>
      <div className="border border-border rounded-xl p-8 flex items-center justify-center">
        <p className="text-[14px] text-muted-foreground">No draft</p>
      </div>
    </div>
  );
}

/* ────────── Step 1: Property Type ────────── */
const propertyTypes = [
  { key: "residential", icon: Home, label: "Residential House", sub: "Single family detached" },
  { key: "commercial", icon: Building2, label: "Commercial Building", sub: "Office or mixed use" },
  { key: "multi-unit", icon: Building2, label: "Multi-Unit Complex", sub: "Apartments, condos" },
  { key: "retail", icon: Store, label: "Retail Space", sub: "Shop or storefront" },
  { key: "land", icon: LandPlot, label: "Land", sub: "Vacant plot or lot" },
  { key: "industrial", icon: Factory, label: "Industrial", sub: "Warehouse or factory" },
  { key: "construction", icon: HardHat, label: "Under Construction", sub: "Development project" },
  { key: "other", icon: MoreHorizontal, label: "Other", sub: "Custom type" },
];

function Step1PropertyType({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-[800px] mx-auto">
      <button
        onClick={() => navigate("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        What type of property are you adding?
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Select the category that best describes your property
      </p>

      <div className="grid grid-cols-4 gap-4">
        {propertyTypes.map((t) => (
          <button
            key={t.key}
            onClick={() => setForm({ ...form, propertyType: t.key })}
            className={`flex flex-col items-center text-center border rounded-xl p-5 hover:border-primary transition-colors ${
              form.propertyType === t.key ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] flex items-center justify-center mb-3">
              <t.icon className="w-6 h-6 text-primary" />
            </div>
            <p className="text-[14px] text-foreground mb-0.5" style={{ fontWeight: 600 }}>
              {t.label}
            </p>
            <p className="text-[12px] text-muted-foreground">{t.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ────────── Step 2: Basic Information ────────── */
function Step2BasicInfo({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const navigate = useNavigate();
  const update = (key: keyof FormData, val: string) => setForm({ ...form, [key]: val });

  return (
    <div className="max-w-[1000px] mx-auto">
      <button
        onClick={() => navigate("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        Basic Property Information
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Enter the essential details about your property
      </p>

      <div className="flex gap-6">
        {/* Left: Form */}
        <div className="flex-1 border border-border rounded-xl p-6">
          {/* Dimensions */}
          <p className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
            Dimensions
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Set the dimensions for the layer.
          </p>

          <div className="space-y-4">
            <FormField label="Property Name" value={form.propertyName} onChange={(v) => update("propertyName", v)} />
            <FormField label="Property ID" value={form.propertyId} onChange={(v) => update("propertyId", v)} />
          </div>

          {/* Location */}
          <p className="text-[16px] text-foreground mt-6 mb-1" style={{ fontWeight: 600 }}>
            Location
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Set the dimensions for the layer.
          </p>
          <div className="space-y-4">
            <FormField label="Address Line" value={form.addressLine} onChange={(v) => update("addressLine", v)} />
            <FormField label="Address Line 2" value={form.addressLine2} onChange={(v) => update("addressLine2", v)} placeholder="Apartment, suite, etc." />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="City" value={form.city} onChange={(v) => update("city", v)} />
              <FormField label="State/Province" value={form.state} onChange={(v) => update("state", v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="ZIP/Postal Code" value={form.zip} onChange={(v) => update("zip", v)} />
              <FormField label="Country" value={form.country} onChange={(v) => update("country", v)} />
            </div>
          </div>

          {/* Property Details */}
          <p className="text-[16px] text-foreground mt-6 mb-1" style={{ fontWeight: 600 }}>
            Property Details
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Set the dimensions for the layer.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Year Built" value={form.yearBuilt} onChange={(v) => update("yearBuilt", v)} />
              <FormField label="Total Area" value={form.totalArea} onChange={(v) => update("totalArea", v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Bedrooms" value={form.bedrooms} onChange={(v) => update("bedrooms", v)} />
              <FormField label="Bathrooms" value={form.bathrooms} onChange={(v) => update("bathrooms", v)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Parking Spaces" value={form.parkingSpaces} onChange={(v) => update("parkingSpaces", v)} />
              <FormField label="Storage Unit" value={form.storageUnit} onChange={(v) => update("storageUnit", v)} />
            </div>
          </div>
        </div>

        {/* Right: Tips + Map */}
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-muted-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Tips
              </p>
            </div>
            <ul className="space-y-1.5 text-[14px] text-muted-foreground list-disc pl-4">
              <li>Use a memorable property name</li>
              <li>Double-check address for accuracy</li>
              <li>Year built affects tax calculations</li>
              <li>Leave optional fields blank if not</li>
            </ul>
          </div>
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Location Preview
              </p>
            </div>
            <div className="w-full h-[160px] bg-[#E8EAED] rounded-lg flex items-center justify-center">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────── Step 3: Financial Information ────────── */
function Step3Financial({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const navigate = useNavigate();
  const update = (key: keyof FormData, val: string) => setForm({ ...form, [key]: val });

  const ownershipOptions = [
    "Fully owned (No Mortgage)",
    "Financed (Mortgage/Loan)",
    "Leased",
    "Other",
  ];

  return (
    <div className="max-w-[1000px] mx-auto">
      <button
        onClick={() => navigate("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        Financial Information
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Enter purchase details and ongoing expenses
      </p>

      <div className="flex gap-6">
        {/* Left: Form */}
        <div className="flex-1 border border-border rounded-xl p-6">
          <p className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
            Purchase Information
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Set the dimensions for the layer.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Purchase Price" value={form.purchasePrice} onChange={(v) => update("purchasePrice", v)} />
              <FormField label="Purchase Date" value={form.purchaseDate} onChange={(v) => update("purchaseDate", v)} />
            </div>
            <FormField label="Current Market Value (Optional)" value={form.currentMarketValue} onChange={(v) => update("currentMarketValue", v)} />
          </div>

          <p className="text-[16px] text-foreground mt-6 mb-1" style={{ fontWeight: 600 }}>
            Ownership & Financing
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Set the dimensions for the layer.
          </p>
          <div className="mb-4">
            <p className="text-[14px] text-foreground mb-2" style={{ fontWeight: 500 }}>
              Ownership Status
            </p>
            <div className="space-y-2">
              {ownershipOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      form.ownershipStatus === opt ||
                      (opt === "Fully owned (No Mortgage)" && form.ownershipStatus === "Financed")
                        ? opt === "Fully owned (No Mortgage)" && form.ownershipStatus !== "Fully owned (No Mortgage)"
                          ? "border-border"
                          : "border-primary"
                        : "border-border"
                    }`}
                  >
                    {((opt === "Fully owned (No Mortgage)" && form.ownershipStatus === "Fully owned (No Mortgage)") ||
                      (opt === "Financed (Mortgage/Loan)" && form.ownershipStatus === "Financed") ||
                      form.ownershipStatus === opt) && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                  <span className="text-[14px] text-foreground">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Outstanding Mortgage" value={form.outstandingMortgage} onChange={(v) => update("outstandingMortgage", v)} />
              <FormField label="Monthly Payment" value={form.monthlyPayment} onChange={(v) => update("monthlyPayment", v)} />
            </div>
          </div>

          <p className="text-[16px] text-foreground mt-6 mb-1" style={{ fontWeight: 600 }}>
            Property Taxes & Insurance
          </p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Set the dimensions for the layer.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Annual Property Tax" value={form.annualPropertyTax} onChange={(v) => update("annualPropertyTax", v)} />
              <FormField label="Tax Assessment Value" value={form.taxAssessmentValue} onChange={(v) => update("taxAssessmentValue", v)} />
            </div>
            <FormField label="Annual Insurance Premium" value={form.annualInsurance} onChange={(v) => update("annualInsurance", v)} />
          </div>
        </div>

        {/* Right: Summary + Tips */}
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Financial Summary
              </p>
            </div>
            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchase Price</span>
                <span className="text-foreground">$250,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding mortgage</span>
                <span className="text-foreground">$180,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Equity</span>
                <span className="text-[#059669]" style={{ fontWeight: 600 }}>$70,000</span>
              </div>
            </div>
            <div className="border-t border-border mt-3 pt-3 space-y-2 text-[14px]">
              <p className="text-muted-foreground text-[12px]">Monthly Expenses</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mortgage</span>
                <span className="text-foreground">$250,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (monthly)</span>
                <span className="text-foreground">$180,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Insurance</span>
                <span className="text-[#059669]">$70,000</span>
              </div>
            </div>
            <div className="border-t border-border mt-3 pt-3">
              <div className="flex justify-between text-[14px]">
                <span className="text-muted-foreground">Total</span>
                <span className="text-[#059669]" style={{ fontWeight: 600 }}>$70,000</span>
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-muted-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Financial Tips
              </p>
            </div>
            <ul className="space-y-1.5 text-[14px] text-muted-foreground list-disc pl-4">
              <li>Use a memorable property name</li>
              <li>Double-check address for accuracy</li>
              <li>Year built affects tax calculations</li>
              <li>Leave optional fields blank if not</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────── Step 4: Photos & Documents ────────── */
function Step4PhotosDocs({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const navigate = useNavigate();

  return (
    <div className="max-w-[800px] mx-auto">
      <button
        onClick={() => navigate("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        Photos & Documents
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Upload images and important documents for your property
      </p>

      {/* Property Photos */}
      <p className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
        Property Photos
      </p>
      <div className="border-b-2 border-primary w-full mb-4" />
      <p className="text-[14px] text-muted-foreground mb-3">
        Upload photos to help with identification and documentation
      </p>

      {/* Drop zone */}
      <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center mb-4">
        <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-[14px] text-foreground mb-1">Drag & Drop Photos Here</p>
        <p className="text-[12px] text-muted-foreground mb-3">or</p>
        <button className="bg-primary text-white rounded-lg px-4 py-2 text-[14px] hover:bg-primary/90">
          Browse Files
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {form.photos.slice(0, 5).map((p, i) => (
          <div
            key={i}
            className="w-[100px] h-[100px] border border-border rounded-xl flex flex-col items-center justify-center"
          >
            <Camera className="w-6 h-6 text-primary mb-1" />
            <p className="text-[12px] text-muted-foreground">{p}</p>
          </div>
        ))}
        <button className="w-[100px] h-[100px] border border-dashed border-border rounded-xl flex items-center justify-center hover:border-primary transition-colors">
          <Plus className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      {/* Property Documents */}
      <p className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
        Property Photos
      </p>
      <p className="text-[14px] text-muted-foreground mb-3">
        Upload photos to help with identification and documentation
      </p>

      <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center mb-4">
        <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-[14px] text-foreground mb-1">Drag & Drop Photos Here</p>
        <p className="text-[12px] text-muted-foreground mb-3">or</p>
        <button className="bg-primary text-white rounded-lg px-4 py-2 text-[14px] hover:bg-primary/90">
          Browse Files
        </button>
      </div>

      {/* Uploaded docs list */}
      <div className="space-y-0">
        {form.documents.map((doc, i) => (
          <div
            key={i}
            className="flex items-center justify-between border border-border rounded-xl px-4 py-3 mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[14px] text-foreground">{doc}</p>
                <p className="text-[12px] text-muted-foreground">Uploaded 2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-muted-foreground">123.jpg</span>
              <button className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────── Step 5: Review ────────── */
function Step5Review({ form }: { form: FormData }) {
  const navigate = useNavigate();

  const completionItems = [
    "Property Type",
    "Basic Info",
    "Financial Info",
    "Photos",
    "Documents",
  ];

  return (
    <div className="max-w-[1000px] mx-auto">
      <button
        onClick={() => navigate("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        Review Property Details
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Please review all information before submitting
      </p>

      <div className="flex gap-6">
        {/* Left: Review cards */}
        <div className="flex-1 space-y-4">
          {/* Property Overview */}
          <div className="border border-border rounded-xl p-6">
            <p className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>
              Property Overview
            </p>
            <div className="space-y-2 text-[14px]">
              {[
                ["Purchase Price", form.propertyName],
                ["Property Type", "Residential House"],
                ["Property ID", form.propertyId],
                ["Address", `${form.addressLine}, ${form.city}`],
                ["Year Built", form.yearBuilt],
                ["Bedrooms", form.bedrooms],
                ["Bathrooms", form.bathrooms],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground" style={{ fontWeight: 500 }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Information */}
          <div className="border border-border rounded-xl p-6">
            <p className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>
              Financial Information
            </p>
            <div className="space-y-2 text-[14px]">
              {[
                ["Purchase Price", form.purchasePrice],
                ["purchase Date", form.purchaseDate],
                ["Current Market Value", form.currentMarketValue],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground" style={{ fontWeight: 500 }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-3 pt-3 space-y-2 text-[14px]">
              {[
                ["Ownership Status", form.ownershipStatus],
                ["Outstanding Mortgage", form.outstandingMortgage],
                ["Monthly Payment", form.monthlyPayment],
                ["Interest Rate", form.interestRate],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground" style={{ fontWeight: 500 }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Photos and Documents */}
          <div className="border border-border rounded-xl p-6">
            <p className="text-[16px] text-foreground mb-4" style={{ fontWeight: 600 }}>
              Photos and Documents
            </p>
            <p className="text-[14px] text-muted-foreground mb-3">
              Photos Uploaded: {form.photos.length} photos
            </p>
            <div className="flex gap-3 mb-4">
              {form.photos.slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className="w-[90px] h-[90px] border border-border rounded-xl flex flex-col items-center justify-center"
                >
                  <Camera className="w-5 h-5 text-primary mb-1" />
                  <p className="text-[12px] text-muted-foreground">{p}</p>
                </div>
              ))}
              {form.photos.length > 3 && (
                <div className="w-[90px] h-[90px] bg-[#F3F4F6] rounded-xl flex items-center justify-center">
                  <p className="text-[14px] text-muted-foreground">
                    +{form.photos.length - 3} more
                  </p>
                </div>
              )}
            </div>
            <p className="text-[14px] text-muted-foreground mb-1">
              Documents Uploaded: {form.documents.length} documents
            </p>
            {form.documents.map((d, i) => (
              <p key={i} className="text-[14px] text-foreground">
                {d}
              </p>
            ))}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Property Summary
              </p>
            </div>
            <p className="text-[#059669] text-[14px] mb-1" style={{ fontWeight: 600 }}>
              Status: Ready to Submit
            </p>
            <p className="text-[12px] text-muted-foreground mb-2">Completion: 100%</p>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
              <div className="h-full bg-[#059669] rounded-full w-full" />
            </div>

            <div className="space-y-1.5 text-[14px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required Fields:</span>
              </div>
              {completionItems.map((item) => (
                <div key={item} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{item}:</span>
                  <span className="text-[#059669] flex items-center gap-1 text-[12px]">
                    <CheckCircle className="w-3 h-3" /> Completed
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border mt-4 pt-4">
              <p className="text-[12px] text-muted-foreground mb-1">Estimated Value</p>
              <p className="text-[30px] text-foreground" style={{ fontWeight: 700 }}>
                $70,000
              </p>
            </div>
          </div>

          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-muted-foreground" />
              <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
                Next Steps
              </p>
            </div>
            <p className="text-[14px] text-muted-foreground mb-2">After submission:</p>
            <ul className="space-y-1 text-[14px] text-muted-foreground list-disc pl-4">
              <li>1. Property added to portfolio</li>
              <li>2. Generate property reports</li>
              <li>3. Set up rent collection</li>
              <li>4. Add maintenance schedule</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────── Step 6: Success ────────── */
function Step6Success() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center h-full">
      <div className="border border-border rounded-xl shadow-lg p-10 max-w-[500px] w-full text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-[53px] h-[53px] text-[#059669]" />
        </div>
        <h2 className="text-[30px] text-foreground mb-1 font-['Plus_Jakarta_Sans',sans-serif]" style={{ fontWeight: 600 }}>
          Property Added Successfully!
        </h2>
        <p className="text-[14px] text-muted-foreground mb-4">
          Sunset Villa has been added to your Profile
        </p>

        <div className="border-t border-border" />
        <p className="text-[12px] text-muted-foreground my-2" style={{ fontWeight: 500 }}>
          Property ID: SR00015
        </p>
        <div className="border-t border-border mb-6" />

        <p className="text-[14px] text-foreground mb-3" style={{ fontWeight: 500 }}>
          What would you like to do next?
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate("/property/SR00015/ownership")}
            className="bg-primary text-white rounded-lg px-6 py-2 text-[14px] hover:bg-primary/90"
          >
            View Property Details
          </button>
          <button
            onClick={() => navigate("/add-property")}
            className="border border-border rounded-lg px-6 py-2 text-[14px] text-foreground hover:bg-accent/50"
          >
            Add Another Property
          </button>
          <button
            onClick={() => navigate("/portfolio")}
            className="text-primary text-[14px]"
          >
            Go to Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────── Shared Components ────────── */
function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[14px] text-foreground mb-1 block" style={{ fontWeight: 500 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        className="w-full border border-border rounded-lg px-3 py-2 text-[14px] text-foreground bg-background focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}