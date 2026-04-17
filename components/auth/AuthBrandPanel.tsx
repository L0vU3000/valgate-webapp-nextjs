import Image from "next/image";

/**
 * Shared left-panel used across all auth screens.
 * Matches Figma: "Section - Brand Panel (Left/Top)"
 */
export function AuthBrandPanel() {
  return (
    <div
      className="auth-brand-panel hidden lg:flex w-[427px] shrink-0 flex-col justify-between overflow-hidden px-12 py-12 relative"
      style={{
        background: "linear-gradient(180deg, var(--val-primary-dark) 0%, #1a2f6e 100%)",
      }}
    >
      {/* Identity row */}
      <div className="relative flex items-center gap-2 shrink-0">
        <Image src="/valgate-icon.svg" width={32} height={32} alt="" />
        <span className="text-2xl font-extrabold text-white font-display tracking-[-0.6px]">
          Valgate
        </span>
      </div>

      {/* Framed product preview */}
      <div className="relative flex-1 flex items-center justify-center py-8">
        <div
          className="w-full rounded-2xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden relative"
          style={{ aspectRatio: "4/5", maxHeight: "380px" }}
        >
          {/* Mini map SVG */}
          <svg
            viewBox="0 0 320 360"
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="320" height="360" fill="url(#map-grid)" />

            {/* Neighborhood blob */}
            <path
              d="M60 120 Q100 80 160 90 Q220 100 250 150 Q280 200 240 240 Q200 280 150 270 Q100 260 70 220 Q40 180 60 120Z"
              fill="rgba(96,130,255,0.12)"
              stroke="rgba(120,150,255,0.2)"
              strokeWidth="1"
            />
            <path
              d="M40 200 Q70 180 90 210 Q110 240 80 260 Q50 280 35 250 Q20 220 40 200Z"
              fill="rgba(96,130,255,0.08)"
              stroke="rgba(120,150,255,0.15)"
              strokeWidth="1"
            />

            {/* Streets */}
            <line x1="0" y1="180" x2="320" y2="180" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <line x1="160" y1="0" x2="160" y2="360" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <line x1="80" y1="0" x2="80" y2="360" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="240" y1="0" x2="240" y2="360" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="0" y1="100" x2="320" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1="0" y1="260" x2="320" y2="260" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </svg>

          {/* Pins */}
          <div className="absolute inset-0">
            <div
              className="absolute size-3 rounded-full bg-interactive-primary anim-dot-glow anim-enter"
              style={{ left: "48%", top: "34%", animationDelay: "700ms" }}
            />
            <div
              className="absolute size-3 rounded-full bg-interactive-primary opacity-70 anim-enter"
              style={{ left: "28%", top: "55%", animationDelay: "850ms" }}
            />
            <div
              className="absolute size-3 rounded-full bg-interactive-primary opacity-70 anim-enter"
              style={{ left: "68%", top: "48%", animationDelay: "950ms" }}
            />
            <div
              className="absolute size-2.5 rounded-full bg-interactive-primary opacity-50 anim-enter"
              style={{ left: "58%", top: "65%", animationDelay: "1050ms" }}
            />

            {/* Floating data card */}
            <div className="anim-enter absolute bottom-6 right-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2">
              <p className="text-[10px] font-semibold text-white leading-tight">127 active listings</p>
              <p className="text-[10px] text-white/60 mt-0.5">94% occupancy</p>
              <svg width="80" height="18" viewBox="0 0 80 18" className="mt-1" aria-hidden="true">
                <polyline
                  points="0,14 13,10 26,12 39,6 52,8 65,4 80,2"
                  fill="none"
                  stroke="rgba(96,165,250,0.8)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="relative shrink-0">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/60 text-center">
          SOC 2 Type II · 500+ portfolios · 99.9% uptime
        </p>
      </div>
    </div>
  );
}
