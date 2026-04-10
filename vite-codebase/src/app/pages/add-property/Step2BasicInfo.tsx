import { useNavigate } from "react-router";
import { ChevronLeft, Info, MapPin } from "lucide-react";
import type { FormData } from "./types";
import { FormField } from "./FormField";

export function Step2BasicInfo({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
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
