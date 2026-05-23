/** Shared inline glass styles from the original AI overlay shell. */

export const glassIconBox = {
  background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(34,211,238,0.1))",
  border: "1px solid rgba(37,99,235,0.15)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
} as const;

export const glassCloseButton = {
  background: "rgba(255,255,255,0.3)",
  border: "1px solid rgba(255,255,255,0.4)",
} as const;

export const glassToolbarButton = {
  background: "rgba(255,255,255,0.3)",
  border: "1px solid rgba(255,255,255,0.35)",
} as const;

export const glassShareButton = {
  background: "rgba(255,255,255,0.25)",
  border: "1px solid rgba(255,255,255,0.3)",
} as const;

export const glassHeaderBadge = {
  background: "linear-gradient(135deg, rgba(172,191,255,0.6), rgba(172,191,255,0.35))",
  border: "1px solid rgba(172,191,255,0.5)",
  color: "#394c84",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
} as const;

export const glassUserBubble = {
  background:
    "linear-gradient(135deg, var(--interactive-primary), color-mix(in srgb, var(--interactive-primary) 85%, #22d3ee))",
  boxShadow:
    "0 4px 16px color-mix(in srgb, var(--interactive-primary) 25%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)",
} as const;

export const glassUserAvatar = {
  background: "linear-gradient(135deg, rgba(232,234,237,0.8), rgba(209,213,219,0.5))",
  border: "1px solid rgba(255,255,255,0.5)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.06)",
} as const;

export const glassArtifactIcon = {
  background: "linear-gradient(135deg, rgba(236,254,255,0.8), rgba(207,250,254,0.5))",
  border: "1px solid rgba(207,250,254,0.7)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
} as const;

export const glassFilterChipInactive = {
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.5)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
} as const;

export const glassYieldIcon = {
  background: "linear-gradient(135deg, rgba(255,247,237,0.8), rgba(255,237,213,0.5))",
  border: "1px solid rgba(234,88,12,0.15)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
} as const;

export const glassDocIcon = {
  background: "linear-gradient(135deg, rgba(239,246,255,0.8), rgba(219,234,254,0.5))",
  border: "1px solid rgba(37,99,235,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
} as const;

export const glassTrendIcon = {
  background: "linear-gradient(135deg, rgba(250,245,255,0.8), rgba(243,232,255,0.5))",
  border: "1px solid rgba(147,51,234,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
} as const;

export const glassProgressTrack = {
  background: "rgba(241,245,249,0.7)",
  border: "1px solid rgba(255,255,255,0.4)",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
} as const;

export const glassProgressFill = {
  background:
    "linear-gradient(90deg, #22d3ee, color-mix(in srgb, #22d3ee 70%, var(--interactive-primary)))",
  boxShadow: "0 0 8px rgba(34,211,238,0.3)",
} as const;

export const glassChartArea = {
  background: "linear-gradient(180deg, rgba(248,250,252,0.5), rgba(241,245,249,0.3))",
  border: "1px solid rgba(255,255,255,0.4)",
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
} as const;

export const glassStorageTrack = {
  background: "rgba(226,232,240,0.5)",
  border: "1px solid rgba(255,255,255,0.4)",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
} as const;

export const glassStorageFill = {
  background:
    "linear-gradient(90deg, var(--interactive-primary), color-mix(in srgb, var(--interactive-primary) 80%, #22d3ee))",
  boxShadow: "0 0 8px color-mix(in srgb, var(--interactive-primary) 30%, transparent)",
} as const;

export const glassUpgradeButton = {
  background: "rgba(255,255,255,0.5)",
  border: "2px solid var(--interactive-primary)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
} as const;

export const glassModalOverlay = {
  background: "rgba(10, 14, 28, 0.55)",
  backdropFilter: "blur(12px)",
} as const;

export const glassModalPanel = {
  background:
    "linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(239,246,255,0.88) 50%, rgba(224,242,254,0.85) 100%)",
  border: "1px solid rgba(255,255,255,0.45)",
  boxShadow:
    "0 32px 80px rgba(10,14,28,0.22), 0 8px 24px rgba(37,99,235,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
} as const;

export const MARKET_BARS = [
  { h: 45, bg: "linear-gradient(180deg, #a5f3fc, rgba(165,243,252,0.6))" },
  { h: 68, bg: "linear-gradient(180deg, #67e8f9, rgba(103,232,249,0.6))" },
  { h: 62, bg: "linear-gradient(180deg, #22d3ee, rgba(34,211,238,0.6))" },
  { h: 96, bg: "linear-gradient(180deg, var(--val-primary-dark), rgba(0,74,198,0.7))" },
  { h: 79, bg: "linear-gradient(180deg, rgba(0,74,198,0.7), rgba(0,74,198,0.35))" },
] as const;
