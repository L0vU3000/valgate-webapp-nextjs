"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Lock, ArrowRight, ShieldCheck,
  Home, Building2, Store, LandPlot, Factory, HardHat, MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion, animate, useAnimate } from "motion/react";
import type { FormData } from "./types";
import { env } from "@/lib/env";
import { Spinner } from "@/components/ui/spinner";


const DEFAULT_CENTER: [number, number] = [104.9282, 11.5564];
const easeOutQuint = [0.22, 1, 0.36, 1] as const;

// ─── Property type placeholder ────────────────────────────────────────────────

type PropertyTypeConfig = {
  Icon: LucideIcon;
  gradient: string;
  glowColor: string;
  iconColor: string;
};

const PROPERTY_TYPE_IMAGE_CONFIG: Record<string, PropertyTypeConfig> = {
  residential: {
    Icon: Home,
    gradient: "linear-gradient(135deg, #ff6b6b 0%, #ff8c42 50%, #ffd23f 100%)",
    glowColor: "rgba(255, 180, 50, 0.5)",
    iconColor: "rgba(255, 255, 255, 0.62)",
  },
  commercial: {
    Icon: Building2,
    gradient: "linear-gradient(135deg, #1e3799 0%, #0652dd 50%, #1289a7 100%)",
    glowColor: "rgba(100, 190, 255, 0.35)",
    iconColor: "rgba(255, 255, 255, 0.65)",
  },
  "multi-unit": {
    Icon: Building2,
    gradient: "linear-gradient(135deg, #6c2bd9 0%, #a855f7 50%, #ec4899 100%)",
    glowColor: "rgba(220, 100, 230, 0.4)",
    iconColor: "rgba(255, 255, 255, 0.65)",
  },
  retail: {
    Icon: Store,
    gradient: "linear-gradient(135deg, #f72585 0%, #ff6b35 50%, #ffd60a 100%)",
    glowColor: "rgba(255, 140, 50, 0.4)",
    iconColor: "rgba(255, 255, 255, 0.65)",
  },
  land: {
    Icon: LandPlot,
    gradient: "linear-gradient(135deg, #1a7a4a 0%, #22c55e 50%, #a3e635 100%)",
    glowColor: "rgba(100, 235, 100, 0.38)",
    iconColor: "rgba(255, 255, 255, 0.65)",
  },
  industrial: {
    Icon: Factory,
    gradient: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #67e8f9 100%)",
    glowColor: "rgba(100, 225, 255, 0.35)",
    iconColor: "rgba(255, 255, 255, 0.65)",
  },
  construction: {
    Icon: HardHat,
    gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fde047 100%)",
    glowColor: "rgba(255, 205, 50, 0.45)",
    iconColor: "rgba(255, 255, 255, 0.62)",
  },
  other: {
    Icon: MoreHorizontal,
    gradient: "linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)",
    glowColor: "rgba(100, 160, 255, 0.35)",
    iconColor: "rgba(255, 255, 255, 0.65)",
  },
};

const DEFAULT_IMAGE_CONFIG: PropertyTypeConfig = {
  Icon: Home,
  gradient: "linear-gradient(135deg, #475569 0%, #64748b 50%, #94a3b8 100%)",
  glowColor: "rgba(200, 215, 230, 0.3)",
  iconColor: "rgba(255, 255, 255, 0.6)",
};

// ─── Checkmark sparkles ────────────────────────────────────────────────────────

const SPARKLE_DATA = [0, 60, 120, 180, 240, 300].map((deg, i) => {
  const rad = (deg * Math.PI) / 180;
  const dist = 34 + (i % 2) * 10;
  return {
    id: i,
    x: Math.cos(rad) * dist,
    y: Math.sin(rad) * dist,
    color: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#10b981" : "#2563eb",
    size: i % 2 === 0 ? 5 : 4,
    delay: 1.95 + i * 0.045,
  };
});

function CheckmarkSparkles({ reduced, mapLoaded }: { reduced: boolean | null; mapLoaded: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
      {SPARKLE_DATA.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rotate-45"
          style={{
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            top: "50%",
            left: "50%",
            marginTop: -s.size / 2,
            marginLeft: -s.size / 2,
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={mapLoaded ? {
            x: reduced ? 0 : s.x,
            y: reduced ? 0 : s.y,
            scale: reduced ? 0 : [0, 1.3, 1, 0],
            opacity: reduced ? 0 : [0, 1, 1, 0],
          } : { x: 0, y: 0, scale: 0, opacity: 0 }}
          transition={{ duration: 0.65, delay: (s.delay - 1.95) + 1.1, ease: easeOutQuint }}
        />
      ))}
    </div>
  );
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(rawValue: string, delayMs: number, reduced: boolean | null, gate = true): string {
  const num = Number(String(rawValue ?? "").replace(/[^0-9.]/g, ""));
  const [count, setCount] = useState(0);
  const ctrlRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!gate || !num || isNaN(num)) return;
    if (reduced) { setCount(num); return; }

    const t = setTimeout(() => {
      ctrlRef.current = animate(0, num, {
        duration: 1.1,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (v) => setCount(Math.round(v)),
      });
    }, delayMs);

    return () => { clearTimeout(t); ctrlRef.current?.stop(); };
  }, [num, delayMs, reduced, gate]);

  if (!num || isNaN(num)) return rawValue || "—";
  return `$${count.toLocaleString()}`;
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────

function useTypewriter(text: string, delayMs: number, reduced: boolean | null, charMs = 52, gate = true): string {
  const [out, setOut] = useState("");

  useEffect(() => {
    if (!gate) return;
    if (reduced) { setOut(text); return; }
    let i = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      intervalId = setInterval(() => {
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length) clearInterval(intervalId);
      }, charMs);
    }, delayMs);

    return () => { clearTimeout(t); clearInterval(intervalId); };
  }, [text, delayMs, reduced, charMs, gate]);

  return out;
}

// ─── Card shimmer ─────────────────────────────────────────────────────────────

function CardShimmer() {
  return (
    <motion.div
      className="absolute inset-0 z-10 pointer-events-none"
      style={{
        background:
          "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)",
      }}
      initial={{ x: "-100%" }}
      animate={{ x: "150%" }}
      transition={{ duration: 0.75, ease: "easeInOut", delay: 2.8 }}
    />
  );
}

// ─── Sonar pulse ──────────────────────────────────────────────────────────────

function SonarPulse({ reduced }: { reduced: boolean | null }) {
  if (reduced) return null;
  return (
    <motion.div
      className="absolute rounded-full border-2 border-[#2563eb] pointer-events-none"
      style={{ width: 48, height: 48, top: 0, left: "50%", marginLeft: -24 }}
      initial={{ scale: 1, opacity: 0 }}
      animate={{ scale: [1, 3.4], opacity: [0, 0.55, 0] }}
      transition={{
        duration: 1.8,
        ease: "easeOut",
        delay: 4.0,
        repeat: Infinity,
        repeatDelay: 1.2,
        times: [0, 0.18, 1],
      }}
    />
  );
}

// ─── Jiggle lock ──────────────────────────────────────────────────────────────

function JiggleLock({ reduced, colorClass }: { reduced: boolean | null; colorClass?: string }) {
  const [scope, animateFn] = useAnimate();

  function handleHover() {
    if (reduced || !scope.current) return;
    animateFn(scope.current, { rotate: [0, -15, 11, -8, 5, 0] }, { duration: 0.45, ease: "easeOut" });
  }

  return (
    <span ref={scope} onMouseEnter={handleHover} className="shrink-0 inline-flex">
      <Lock className={`w-[9px] h-[11px] ${colorClass ?? "text-slate-400"}`} />
    </span>
  );
}

// ─── Feature pill ─────────────────────────────────────────────────────────────

function FeaturePill({
  feature, reduced, mapLoaded, delay,
}: {
  feature: typeof FEATURE_PILLS[number];
  reduced: boolean | null;
  mapLoaded: boolean;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className={`flex items-center gap-[7px] px-[15px] py-[9px] rounded-[14px] cursor-default transition-colors duration-200 ${
        hovered ? feature.bg : "bg-slate-100"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: mapLoaded ? 1 : 0, y: mapLoaded ? 0 : (reduced ? 0 : 8) }}
      transition={{ duration: 0.6, ease: easeOutQuint, delay }}
    >
      <JiggleLock reduced={reduced} colorClass={hovered ? feature.lock : "text-slate-400"} />
      <span className={`text-[12px] font-semibold transition-colors duration-200 ${
        hovered ? feature.text : "text-slate-500"
      }`}>
        {feature.label}
      </span>
    </motion.div>
  );
}

// ─── Property card image ──────────────────────────────────────────────────────

function PropertyCardImage({ propertyType, photos }: { propertyType: string; photos: string[] }) {
  if (photos && photos.length > 0) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <CardShimmer />
      </>
    );
  }

  const config = PROPERTY_TYPE_IMAGE_CONFIG[propertyType] ?? DEFAULT_IMAGE_CONFIG;
  const { Icon, gradient, glowColor, iconColor } = config;

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: gradient }}>
        <div
          className="absolute size-32 rounded-full"
          style={{ background: glowColor, filter: "blur(24px)" }}
        />
        <Icon className="relative z-10 w-16 h-16" style={{ color: iconColor }} strokeWidth={1.5} />
      </div>
      <CardShimmer />
    </>
  );
}

// ─── Map background ───────────────────────────────────────────────────────────

function SuccessMapBackground({
  center,
  reduced,
  onLoad,
}: {
  center?: [number, number];
  reduced: boolean | null;
  onLoad?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [lng, lat] = center ?? DEFAULT_CENTER;
  const src = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${lng},${lat},14,0/1280x420@2x?access_token=${env.NEXT_PUBLIC_MAPBOX_TOKEN}`;

  function handleLoad() {
    setLoaded(true);
    onLoad?.();
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src={src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        onLoad={handleLoad}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.9, ease: "easeOut" }}
      />
      {/* Spinner at pin location — fades out as pin drops in */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "calc(50% - 60px)",
          left: "50%",
          transform: "translate(-50%, -50%)",
          "--foreground": "#2563eb",
        } as React.CSSProperties}
        initial={{ opacity: 1 }}
        animate={{ opacity: loaded ? 0 : 1 }}
        transition={{ duration: reduced ? 0 : 0.4, ease: "easeOut", delay: loaded ? 0 : 0 }}
      >
        <Spinner size={48} thickness={0.14} />
      </motion.div>
    </>
  );
}

function formatCurrency(value: string) {
  const num = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!num || isNaN(num)) return value || "—";
  return `$${num.toLocaleString()}`;
}

const FEATURE_PILLS: { label: string; bg: string; text: string; lock: string }[] = [
  { label: "Equity Tracking",      bg: "bg-blue-50",    text: "text-blue-700",    lock: "text-blue-400"    },
  { label: "Cash-Flow Reports",    bg: "bg-emerald-50", text: "text-emerald-700", lock: "text-emerald-400" },
  { label: "Lease Management",     bg: "bg-indigo-50",  text: "text-indigo-700",  lock: "text-indigo-400"  },
  { label: "Document Vault",       bg: "bg-amber-50",   text: "text-amber-700",   lock: "text-amber-400"   },
  { label: "Security Monitoring",  bg: "bg-teal-50",    text: "text-teal-700",    lock: "text-teal-400"    },
];

const OWNERSHIP_BADGE: Record<string, { label: string; color: string }> = {
  "fully-owned": { label: "Owned", color: "#10b981" },
  mortgaged: { label: "Mortgaged", color: "#f59e0b" },
  leased: { label: "Leased", color: "#10b981" },
  "under-construction": { label: "Under Construction", color: "#8b5cf6" },
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  "multi-unit": "Multi-Unit",
  retail: "Retail",
  land: "Land",
  industrial: "Industrial",
  construction: "Construction",
  other: "Other",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Step6Success({ form }: { form: FormData }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [mapLoaded, setMapLoaded] = useState(false);

  const propertyName = form.propertyName || "Your Property";
  const propertyId = form.propertyId || "PR00001";
  const rawPriceStr = form.currentMarketValue || form.purchasePrice;
  const priceFallback = formatCurrency(rawPriceStr);
  const animatedPrice = useCountUp(rawPriceStr, 800, reduced, mapLoaded);
  const animatedId = useTypewriter(`ID: ${propertyId}`, 1000, reduced, 52, mapLoaded);
  const location = [form.city, form.state].filter(Boolean).join(", ");
  const ownership = OWNERSHIP_BADGE[form.ownershipStatus] ?? { label: "Listed", color: "#10b981" };
  const typeLabel = PROPERTY_TYPE_LABELS[form.propertyType] ?? "Property";
  const tooltipText = [propertyName, priceFallback !== "—" ? priceFallback : null]
    .filter(Boolean)
    .join(" · ");

  const fadeUp = {
    hidden: { opacity: 0, y: reduced ? 0 : 20 },
    show: { opacity: 1, y: 0 },
  };

  const pinDrop = {
    hidden: { opacity: 0, y: reduced ? 0 : -28, scale: reduced ? 1 : 0.85 },
    show: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <div className="flex flex-col items-center pb-28 w-full bg-[#f8f9ff]">
        {/* Map Hero */}
        <motion.div
          className="relative w-full h-[420px] mb-[-64px] overflow-hidden shrink-0 bg-[#e4e2dc]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <SuccessMapBackground
            center={form.mapCenter}
            reduced={reduced}
            onLoad={() => setMapLoaded(true)}
          />

          <div
            className="absolute flex flex-col items-center"
            style={{ top: "50%", left: "50%", transform: "translate(-50%, -100%)" }}
          >
            <motion.div
              className="flex flex-col items-center"
              variants={pinDrop}
              initial="hidden"
              animate={mapLoaded ? "show" : "hidden"}
              transition={{ duration: 0.65, ease: easeOutQuint, delay: 0.15 }}
            >
              {/* Tooltip */}
              <motion.div
                className="relative z-20 mb-2 shrink-0"
                initial={{ opacity: 0, y: reduced ? 0 : -8 }}
                animate={{ opacity: mapLoaded ? 1 : 0, y: mapLoaded ? 0 : (reduced ? 0 : -8) }}
                transition={{ duration: 0.45, ease: easeOutQuint, delay: 0.55 }}
              >
                <div className="bg-[#1a1c1c] text-white text-[16px] font-medium leading-6 px-5 py-2.5 rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] whitespace-nowrap">
                  {tooltipText}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-[10px] flex items-center justify-center size-[20px]">
                  <div className="rotate-45 size-[14px] bg-[#1a1c1c]" />
                </div>
              </motion.div>

              {/* Pin + sonar */}
              <div className="mt-[10px] relative z-10 flex flex-col items-center">
                <SonarPulse reduced={reduced} />
                <div className="size-14 rounded-full bg-[#2563eb] border-[3px] border-white flex items-center justify-center shadow-[0px_4px_12px_0px_rgba(37,99,235,0.4)]">
                  <svg width="23" height="25" viewBox="0 0 16 20" fill="none">
                    <path
                      d="M8 0C3.589 0 0 3.589 0 8c0 5.25 7.125 11.438 7.438 11.703a.75.75 0 0 0 1.124 0C8.875 19.438 16 13.25 16 8c0-4.411-3.589-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
                      fill="#fff"
                    />
                  </svg>
                </div>
                <div
                  style={{
                    width: 20,
                    height: 15,
                    marginTop: -1,
                    clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)",
                    background: "#2563eb",
                  }}
                />
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8f9ff] to-transparent" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-[768px] px-6 mx-auto">
          {/* Success icon + sparkles */}
          <div className="relative mb-4" style={{ overflow: "visible" }}>
            <CheckmarkSparkles reduced={reduced} mapLoaded={mapLoaded} />
            <motion.div
              className="bg-white p-4 rounded-full shadow-[0px_2px_16px_0px_rgba(16,185,129,0.14),0px_0px_0px_8px_rgba(16,185,129,0.07)]"
              initial={{ opacity: 0, scale: reduced ? 1 : 0.6 }}
              animate={{ opacity: mapLoaded ? 1 : 0, scale: mapLoaded ? 1 : (reduced ? 1 : 0.6) }}
              transition={{ duration: 0.5, ease: easeOutQuint, delay: 0.9 }}
            >
              <div className="bg-[#d1fae5] size-16 rounded-full flex items-center justify-center">
                <motion.svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: mapLoaded ? 1 : 0, opacity: mapLoaded ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: easeOutQuint, delay: 1.15 }}
                >
                  <motion.path
                    d="M6 16L13 23L26 9"
                    stroke="#059669"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: mapLoaded ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.5, ease: easeOutQuint, delay: 1.15 }}
                  />
                </motion.svg>
              </div>
            </motion.div>
          </div>

          {/* Heading */}
          <motion.h1
            className="text-[44px] font-extrabold text-[#0d1117] tracking-[-1.1px] leading-[1.15] text-center mb-3"
            variants={fadeUp}
            initial="hidden"
            animate={mapLoaded ? "show" : "hidden"}
            transition={{ duration: 0.8, ease: easeOutQuint, delay: 1.4 }}
          >
            Your property is on Valgate.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            className="text-[16px] text-[#5b5f62] leading-6 text-center mb-10"
            variants={fadeUp}
            initial="hidden"
            animate={mapLoaded ? "show" : "hidden"}
            transition={{ duration: 0.8, ease: easeOutQuint, delay: 1.55 }}
          >
            Live, secured, and ready to manage.
          </motion.p>

          {/* Property Card Preview */}
          <motion.div
            className="w-full max-w-[576px] mb-12"
            variants={fadeUp}
            initial="hidden"
            animate={mapLoaded ? "show" : "hidden"}
            transition={{ duration: 0.8, ease: easeOutQuint, delay: 1.7 }}
          >
            <div className="bg-white rounded-[20px] overflow-hidden shadow-[0px_0px_0px_1px_rgba(0,0,0,0.02),0px_2px_6px_0px_rgba(0,0,0,0.04),0px_4px_8px_0px_rgba(0,0,0,0.1)] pb-7">
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <PropertyCardImage propertyType={form.propertyType} photos={form.photos} />
                <div className="absolute top-4 left-4 flex gap-2 z-20">
                  <div className="backdrop-blur-[2px] bg-[rgba(255,255,255,0.9)] flex items-center gap-1.5 px-3 py-[5.5px] rounded-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: ownership.color }} />
                    <span className="text-[12px] font-semibold text-[#1a1c1c] leading-4">{ownership.label}</span>
                  </div>
                  <div className="backdrop-blur-[2px] bg-[rgba(255,255,255,0.9)] flex items-center px-3 py-[6px] rounded-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <span className="text-[12px] font-semibold text-[#1a1c1c] leading-4">{typeLabel}</span>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="flex items-start justify-between px-5 pt-5">
                <div className="flex flex-col gap-1">
                  <p className="text-[22px] font-semibold text-[#1a1c1c] leading-[26px]">{propertyName}</p>
                  {location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-[10.667px] h-[13.333px] text-[#5b5f62] shrink-0" />
                      <span className="text-[14px] text-[#5b5f62] leading-5">{location}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                  <p className="text-[21px] font-bold text-[#1a1c1c] leading-[31.5px]">{animatedPrice}</p>
                  <p className="text-[12px] font-medium text-[#737686] uppercase tracking-[0.6px] leading-4 min-h-[16px]">
                    {animatedId}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature Unlock Strip */}
          <motion.div
            className="w-full max-w-[672px] mb-12"
            variants={fadeUp}
            initial="hidden"
            animate={mapLoaded ? "show" : "hidden"}
            transition={{ duration: 0.8, ease: easeOutQuint, delay: 1.95 }}
          >
            <div className="bg-[#eef4ff] border border-[rgba(37,99,235,0.1)] rounded-xl p-[25px] flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="bg-emerald-100 rounded-2xl p-3 self-start">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-[22px] font-extrabold text-[#1a1c1c] leading-tight tracking-[-0.4px]">
                    Complete your property profile
                  </p>
                  <p className="text-[14px] text-[#5b5f62] leading-relaxed max-w-[480px]">
                    These features unlock automatically as you fill in more details — equity tracking, cash flow, and more.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {FEATURE_PILLS.map((feature, i) => (
                  <FeaturePill
                    key={feature.label}
                    feature={feature}
                    reduced={reduced}
                    mapLoaded={mapLoaded}
                    delay={2.05 + i * 0.09}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="w-full max-w-[448px] flex flex-col items-center gap-4"
            variants={fadeUp}
            initial="hidden"
            animate={mapLoaded ? "show" : "hidden"}
            transition={{ duration: 0.8, ease: easeOutQuint, delay: 2.4 }}
          >
            <motion.button
              onClick={() => router.push("/portfolio")}
              className="w-full text-white text-[16px] font-semibold leading-6 py-4 px-6 rounded-[8px] hover:opacity-90 active:scale-[0.97] transition-all duration-150 text-center"
              style={{
                background: "linear-gradient(168deg, #004ac6 0%, #2563eb 100%)",
                boxShadow: "0 4px 6px -1px rgba(0,74,198,0.28), 0 2px 4px -2px rgba(0,74,198,0.18)",
              }}
              whileHover={reduced ? {} : { scale: 1.025 }}
              whileTap={reduced ? {} : { scale: 0.975 }}
              transition={{ duration: 0.15, ease: easeOutQuint }}
            >
              Go to My Portfolio
            </motion.button>
            <motion.button
              onClick={() => router.back()}
              className="flex items-center gap-1 py-2 text-[#004ac6] text-[14px] font-medium leading-5 hover:text-[#003a9e] transition-colors"
              whileHover={reduced ? {} : { x: 2 }}
              transition={{ duration: 0.15, ease: easeOutQuint }}
            >
              Add more details
              <ArrowRight className="w-[10.667px] h-[10.667px] shrink-0" />
            </motion.button>
          </motion.div>
        </div>
      </div>
  );
}
