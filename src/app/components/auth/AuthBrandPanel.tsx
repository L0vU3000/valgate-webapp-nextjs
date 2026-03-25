// NOTE: testimonialAvatarSrc is a Figma asset URL — valid ~7 days from export
const testimonialAvatarSrc =
  "https://www.figma.com/api/mcp/asset/d9bb7888-f7f4-4908-a3d3-e071ea8b3e7d";

function ValgateBuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="6" width="8" height="12" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="10" y="0" width="10" height="18" rx="1" fill="currentColor" />
      <rect x="2" y="8" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
      <rect x="2" y="12" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
      <rect x="12" y="2" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
      <rect x="16" y="2" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
      <rect x="12" y="6" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
      <rect x="16" y="6" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
      <rect x="12" y="10" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
      <rect x="16" y="10" width="2" height="2" rx="0.5" fill="white" opacity="0.6" />
    </svg>
  );
}

/**
 * Shared left-panel used across all auth screens.
 * Matches Figma: "Section - Brand Panel (Left/Top)"
 */
export function AuthBrandPanel() {
  return (
    <div
      className="hidden lg:flex w-[427px] shrink-0 flex-col justify-between overflow-hidden px-12 py-12 relative"
      style={{
        background: "linear-gradient(180deg, #2563EB 0%, #004AC6 55%, #1E3A8A 100%)",
      }}
    >
      {/* Decorative: bottom-left glow — "Decorative Elements" */}
      <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-white/10 blur-[32px] pointer-events-none" />
      {/* Decorative: mid-right glow — "Overlay+Blur" */}
      <div className="absolute top-[calc(50%+4rem)] right-0 size-32 rounded-full bg-[rgba(180,197,255,0.2)] blur-[20px] pointer-events-none" />

      {/* Logo — "Branding > Container" */}
      <div className="relative flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center size-8 bg-white rounded-lg shrink-0">
          <ValgateBuildingIcon className="size-[18px] text-[#004AC6]" />
        </div>
        <span className="text-2xl font-extrabold text-white font-display tracking-[-0.6px]">
          Valgate
        </span>
      </div>

      {/* Headline + tagline — "Branding > Container" */}
      <div className="relative flex flex-col gap-6 max-w-[320px]">
        <h1 className="text-[48px] font-extrabold text-white font-display leading-[1.2] tracking-tight">
          Seamless
          <br />
          Property
          <br />
          Management.
        </h1>
        <p className="text-lg text-[#eeefff]/90 leading-relaxed">
          Join thousands of property owners who trust Valgate to automate their
          operations and maximize growth.
        </p>
      </div>

      {/* Testimonial card — "Footer Quote/Trust" with "Overlay+Border+OverlayBlur" */}
      <div className="relative shrink-0">
        <div className="backdrop-blur-[6px] bg-white/10 border border-white/20 rounded-xl p-6 flex flex-col gap-2">
          {/* Stars */}
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-yellow-300 text-xs leading-none">
                ★
              </span>
            ))}
          </div>
          {/* Quote */}
          <p className="text-sm text-white leading-5">
            "Valgate transformed how we handle our portfolio. The automation
            tools are world-class."
          </p>
          {/* Attribution */}
          <div className="flex items-center gap-3 pt-2">
            <div className="size-10 rounded-full bg-[#d8e3f4] border-2 border-white/20 overflow-hidden shrink-0">
              <img
                src={testimonialAvatarSrc}
                alt="James Wilson"
                className="size-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">James Wilson</p>
              <p className="text-[10px] tracking-[0.5px] uppercase text-white/60">
                Apex Properties Group
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
