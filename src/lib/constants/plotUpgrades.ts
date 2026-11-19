import { FacadeTheme, PlotConfig } from "@/types";

export interface AccentColorPreset {
  id: string;
  name: string;
  hex: string;
  hexNum: number;
}

export const ACCENT_COLOR_PRESETS: AccentColorPreset[] = [
  { id: "amber", name: "Amber Gold", hex: "#f59e0b", hexNum: 0xf59e0b },
  { id: "emerald", name: "Emerald Mint", hex: "#10b981", hexNum: 0x10b981 },
  { id: "cyan", name: "Cyan Neon", hex: "#38bdf8", hexNum: 0x38bdf8 },
  { id: "rose", name: "Rose Quartz", hex: "#f43f5e", hexNum: 0xf43f5e },
  { id: "violet", name: "Royal Violet", hex: "#a78bfa", hexNum: 0xa78bfa },
  { id: "terracotta", name: "Sunset Copper", hex: "#fb923c", hexNum: 0xfb923c },
  { id: "lime", name: "Electric Lime", hex: "#84cc16", hexNum: 0x84cc16 },
  { id: "white", name: "Arctic Ice", hex: "#f8fafc", hexNum: 0xf8fafc },
];

export const ALLOWED_ACCENT_HEXES = new Set(ACCENT_COLOR_PRESETS.map((c) => c.hex));

export interface FacadeThemePreset {
  id: FacadeTheme;
  name: string;
  description: string;
  swatches: [string, string]; // [plinth, facade]
  plinthHex: number;
  trimHex: number;
}

export const FACADE_THEME_PRESETS: FacadeThemePreset[] = [
  {
    id: "default",
    name: "Category Native",
    description: "Original architectural materials designed for your category",
    swatches: ["#1e293b", "#e2e8f0"],
    plinthHex: 0x1e293b,
    trimHex: 0xe2e8f0,
  },
  {
    id: "obsidian",
    name: "Obsidian Slate",
    description: "Matte charcoal basalt plinth with dark architectural trim",
    swatches: ["#090d16", "#27272a"],
    plinthHex: 0x090d16,
    trimHex: 0x27272a,
  },
  {
    id: "limestone",
    name: "Warm Limestone",
    description: "Sunlit travertine stone plinth with crisp ivory accents",
    swatches: ["#d6c5b3", "#f8fafc"],
    plinthHex: 0xd6c5b3,
    trimHex: 0xf8fafc,
  },
  {
    id: "terracotta",
    name: "Heritage Terracotta",
    description: "Warm Indian sandstone & roasted brick plinth finish",
    swatches: ["#7c2d12", "#fde68a"],
    plinthHex: 0x7c2d12,
    trimHex: 0xfde68a,
  },
];

export const ALLOWED_FACADE_THEMES = new Set<FacadeTheme>(
  FACADE_THEME_PRESETS.map((t) => t.id)
);

export interface PlotLevelSpec {
  level: 1 | 2 | 3;
  name: string;
  minCoins: number;
  architecturePerks: string;
  visibilityPerks: string;
}

export const PLOT_LEVEL_TIERS: PlotLevelSpec[] = [
  {
    level: 1,
    name: "Base Plot",
    minCoins: 0,
    architecturePerks: "Category base 3D building + custom accent glow & facade finish",
    visibilityPerks: "Live on India's OSM street map & searchable by city/PIN",
  },
  {
    level: 2,
    name: "Active Storefront",
    minCoins: 250,
    architecturePerks: "Illuminated perimeter runway LEDs, 4 corner bollard lights & courtyard trees",
    visibilityPerks: "Larger glowing national beacon + LVL 2 badge in search results",
  },
  {
    level: 3,
    name: "Landmark Flagship",
    minCoins: 750,
    architecturePerks: "Elevated Sky-Terrace crown pergola, rooftop solar canopy & glowing beacon fins",
    visibilityPerks: "Largest golden beacon across India + top priority in city/PIN search",
  },
];

export interface CoinBreakdownItem {
  id: string;
  label: string;
  coins: number;
  earned: boolean;
  hint: string;
}

export interface CoinAuditResult {
  totalCoins: number;
  eligibleLevel: 1 | 2 | 3;
  nextLevel: PlotLevelSpec | null;
  coinsToNextLevel: number;
  progressPct: number;
  checklist: CoinBreakdownItem[];
}

/**
 * Deterministic, anti-cheat Bazaar Coins & Plot Level calculator.
 * Every coin is earned from real storefront completeness, broadcasts, or genuine visitor engagement.
 */
export function computeEarnedBazaarCoins(input: {
  photosCount: number;
  hasWebsite: boolean;
  hasGoogleMaps: boolean;
  hasDescription: boolean;
  hasInstagram: boolean;
  totalViews: number;
  totalLeads: number;
  wavesCount: number;
  broadcastsCount: number;
}): CoinAuditResult {
  const checklist: CoinBreakdownItem[] = [
    {
      id: "claim",
      label: "Claim 3D Business Plot",
      coins: 50,
      earned: true,
      hint: "Awarded automatically on registration",
    },
    {
      id: "photos_1",
      label: "Upload Storefront Cover Photo",
      coins: 40,
      earned: input.photosCount >= 1,
      hint: "Add at least 1 photo in Photos tab",
    },
    {
      id: "photos_3",
      label: "Upload 3+ Portfolio Photos",
      coins: 40,
      earned: input.photosCount >= 3,
      hint: "Showcase your shop or best work",
    },
    {
      id: "website",
      label: "Link Official Website",
      coins: 50,
      earned: input.hasWebsite,
      hint: "Add your website in Details tab",
    },
    {
      id: "gmaps",
      label: "Link Official Google Maps",
      coins: 50,
      earned: input.hasGoogleMaps,
      hint: "Add your Google Maps link in Details tab",
    },
    {
      id: "description",
      label: "Write About Your Business",
      coins: 30,
      earned: input.hasDescription,
      hint: "Add 30+ characters in Details tab",
    },
    {
      id: "instagram",
      label: "Connect Instagram Handle",
      coins: 20,
      earned: input.hasInstagram,
      hint: "Add @handle in Details tab",
    },
    {
      id: "broadcast",
      label: "Publish a Live Street Broadcast",
      coins: 35,
      earned: input.broadcastsCount >= 1,
      hint: "Post a Deal, Coupon, Hiring, or Need in Broadcasts tab (+35 per post)",
    },
  ];

  const milestoneCoins = checklist.reduce((sum, c) => sum + (c.earned ? c.coins : 0), 0);
  const extraBroadcastCoins = Math.max(0, input.broadcastsCount - 1) * 35;
  const activityCoins =
    Math.max(0, input.totalViews) * 2 +
    Math.max(0, input.totalLeads) * 15 +
    Math.max(0, input.wavesCount) * 5;

  const totalCoins = milestoneCoins + extraBroadcastCoins + activityCoins;

  const eligibleLevel: 1 | 2 | 3 = totalCoins >= 750 ? 3 : totalCoins >= 250 ? 2 : 1;
  const nextLevel =
    eligibleLevel === 1
      ? PLOT_LEVEL_TIERS[1]
      : eligibleLevel === 2
        ? PLOT_LEVEL_TIERS[2]
        : null;

  const coinsToNextLevel = nextLevel ? Math.max(0, nextLevel.minCoins - totalCoins) : 0;
  const progressPct = nextLevel
    ? Math.min(100, Math.round((totalCoins / nextLevel.minCoins) * 100))
    : 100;

  return {
    totalCoins,
    eligibleLevel,
    nextLevel,
    coinsToNextLevel,
    progressPct,
    checklist,
  };
}

export function sanitizePlotConfig(raw: unknown): PlotConfig {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: PlotConfig = {};
  if (
    typeof obj.accentColor === "string" &&
    (ALLOWED_ACCENT_HEXES.has(obj.accentColor) || /^#[0-9a-fA-F]{6}$/i.test(obj.accentColor))
  ) {
    out.accentColor = obj.accentColor.toLowerCase();
  }
  if (
    typeof obj.facadeTheme === "string" &&
    ALLOWED_FACADE_THEMES.has(obj.facadeTheme as FacadeTheme)
  ) {
    out.facadeTheme = obj.facadeTheme as FacadeTheme;
  }
  if (typeof obj.roofSignText === "string") {
    const clean = obj.roofSignText.trim().slice(0, 18);
    if (clean) out.roofSignText = clean;
  }
  return out;
}
