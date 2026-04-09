import { useNavigate } from "react-router";
import { Camera, Upload, FileEdit, ChevronLeft } from "lucide-react";
import type { FormData } from "./types";

export function Step0NewOrDraft({
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
