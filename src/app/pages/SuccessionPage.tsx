import { useState } from "react";
import { Users, Clock } from "lucide-react";

const comingFeatures = [
  "Organize heirs and beneficiaries",
  "Structure ownership transfers",
  "Store legal succession documents",
  "Track inheritance tax obligations",
  "Generate succession reports",
];

export function SuccessionPage() {
  const [email, setEmail] = useState("");

  return (
    <div className="h-full flex items-center justify-center font-['Inter',sans-serif]">
      <div className="w-[448px] flex flex-col items-center gap-6">
        {/* Icon */}
        <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center">
          <Users className="w-10 h-10 text-primary" />
        </div>

        {/* Soon badge */}
        <div className="bg-accent rounded-full px-3 py-1.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-[14px] text-primary" style={{ fontWeight: 500 }}>Soon</span>
        </div>

        {/* Title */}
        <h1 className="text-[30px] text-foreground text-center font-['Plus_Jakarta_Sans',sans-serif]" style={{ fontWeight: 600 }}>
          Succession Planning
        </h1>

        {/* Description */}
        <p className="text-[16px] text-muted-foreground text-center max-w-[385px]">
          Plan and organize property transfers, heirs, and legal documentation for a smooth succession.
          Ensure your property portfolio is properly structured for the next generation.
        </p>

        {/* Email input */}
        <div className="flex gap-3 w-full h-9">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 h-full bg-muted rounded-lg px-3 text-[14px] text-foreground placeholder:text-muted-foreground border border-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <button className="bg-primary text-primary-foreground rounded-lg px-4 text-[14px] h-full hover:bg-primary/90 transition-colors" style={{ fontWeight: 500 }}>
            Get notified
          </button>
        </div>

        {/* Coming Features */}
        <div className="w-full flex flex-col gap-4">
          <p className="text-[14px] text-foreground text-center" style={{ fontWeight: 600 }}>
            Coming Features
          </p>
          <div className="flex flex-col gap-3">
            {comingFeatures.map((feature) => (
              <div key={feature} className="bg-background rounded-xl h-11 flex items-center gap-3 px-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                <span className="text-[14px] text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
