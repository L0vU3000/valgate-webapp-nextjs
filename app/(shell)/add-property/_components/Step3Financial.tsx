"use client";

import { useState } from "react";
import type { FormData } from "./types";

export function Step3Financial({
  form,
  setForm,
  goNext,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  goNext?: () => void;
}) {
  const [displayValue, setDisplayValue] = useState(
    form.currentMarketValue
      ? Number(form.currentMarketValue).toLocaleString()
      : ""
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setDisplayValue(raw ? Number(raw).toLocaleString() : "");
    setForm({ ...form, currentMarketValue: raw });
  }

  function handleSkip() {
    setForm({ ...form, currentMarketValue: "" });
    goNext?.();
  }

  return (
    <div className="flex flex-col gap-10 items-start pb-8 w-full max-w-[600px] mx-auto">
      {/* Heading */}
      <div className="flex flex-col gap-[11px] items-center w-full">
        <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
          What is this property worth?
        </h2>
        <p className="text-[16px] text-[#5b5f62] text-center leading-[1.43]">
          Your best estimate is fine — purchase price or market value, whichever you know.
        </p>
      </div>

      {/* Card */}
      <div className="flex flex-col gap-4 items-start p-6 rounded-2xl border border-border w-full">
        {/* Dollar input */}
        <div className="relative w-full">
          <div className="border border-border rounded-xl pl-[65px] pr-6 py-[22px] focus-within:border-primary transition-colors">
            <input
              type="text"
              inputMode="numeric"
              value={displayValue}
              onChange={handleChange}
              placeholder="0"
              className="w-full text-[32px] font-semibold text-foreground placeholder:text-muted-foreground bg-transparent outline-none leading-normal"
            />
          </div>
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[32px] font-medium text-foreground pointer-events-none select-none">
            $
          </span>
        </div>

        {/* Label + skip link */}
        <div className="flex items-center justify-between w-full">
          <span className="text-[14px] text-muted-foreground leading-5">
            Estimated market value
          </span>
          <button
            onClick={handleSkip}
            className="text-[14px] font-medium text-primary leading-5 hover:underline"
          >
            I&apos;ll add this later
          </button>
        </div>
      </div>
    </div>
  );
}
