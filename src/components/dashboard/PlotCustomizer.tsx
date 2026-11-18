"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpCircle,
  Check,
  CheckCircle2,
  Coins,
  ExternalLink,
  Layers,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { FacadeTheme, PlotConfig } from "@/types";
import {
  ACCENT_COLOR_PRESETS,
  CoinAuditResult,
  FACADE_THEME_PRESETS,
  PLOT_LEVEL_TIERS,
} from "@/lib/constants/plotUpgrades";

interface PlotCustomizerProps {
  businessId: string;
  businessName: string;
  businessSlug: string;
  plotName: string;
  currentLevel: 1 | 2 | 3;
  bazaarCoins: number;
  plotConfig: PlotConfig;
  coinAudit: CoinAuditResult;
  accessToken: string;
  onBusinessUpdated: (updated: Record<string, unknown>) => void;
  onNavigateTab: (tab: "details" | "broadcasts" | "photos") => void;
}

export function PlotCustomizer({
  businessId,
  businessName,
  businessSlug,
  plotName,
  currentLevel,
  bazaarCoins,
  plotConfig,
  coinAudit,
  accessToken,
  onBusinessUpdated,
  onNavigateTab,
}: PlotCustomizerProps) {
  const [facadeTheme, setFacadeTheme] = useState<FacadeTheme>(
    plotConfig?.facadeTheme || "default"
  );
  const [accentColor, setAccentColor] = useState<string>(
    plotConfig?.accentColor || "#f59e0b"
  );
  const [roofSignText, setRoofSignText] = useState<string>(
    plotConfig?.roofSignText || ""
  );
  const [previewLevel, setPreviewLevel] = useState<1 | 2 | 3>(currentLevel);

  const [savingStyle, setSavingStyle] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setFacadeTheme(plotConfig?.facadeTheme || "default");
    setAccentColor(plotConfig?.accentColor || "#f59e0b");
    setRoofSignText(plotConfig?.roofSignText || "");
    setPreviewLevel(currentLevel);
  }, [businessId, plotConfig, currentLevel]);

  const savedTheme = plotConfig?.facadeTheme || "default";
  const savedAccent = plotConfig?.accentColor || "#f59e0b";
  const savedTag = plotConfig?.roofSignText || "";
  const hasUnsavedChanges =
    facadeTheme !== savedTheme ||
    accentColor !== savedAccent ||
    roofSignText.trim() !== savedTag;

  const activeFacadePreset =
    FACADE_THEME_PRESETS.find((t) => t.id === facadeTheme) || FACADE_THEME_PRESETS[0];
  const currentTierSpec =
    PLOT_LEVEL_TIERS.find((t) => t.level === currentLevel) || PLOT_LEVEL_TIERS[0];

  const canUpgradeLevel: 2 | 3 | null =
    currentLevel < 3 && coinAudit.eligibleLevel > currentLevel
      ? ((currentLevel + 1) as 2 | 3)
      : null;

  const nextTierForUpgrade = canUpgradeLevel
    ? PLOT_LEVEL_TIERS.find((t) => t.level === canUpgradeLevel) || null
    : null;

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => {
      setStatusMsg((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const handleSaveStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStyle(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/dashboard/businesses/${businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plot_config: {
            facadeTheme,
            accentColor,
            roofSignText: roofSignText.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not update 3D plot appearance.");
      }
      if (data.business) {
        onBusinessUpdated(data.business);
      }
      showStatus("3D plot style applied live on India's map.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save 3D plot style.");
    } finally {
      setSavingStyle(false);
    }
  };

  const handleUpgradeBuilding = async (targetLevel: 2 | 3) => {
    setUpgrading(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/dashboard/businesses/${businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          upgrade_to_level: targetLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Could not upgrade to Level ${targetLevel}.`);
      }
      if (data.business) {
        onBusinessUpdated(data.business);
      }
      setPreviewLevel(targetLevel);
      showStatus(`Upgraded to Level ${targetLevel}! New 3D architecture is now live on the map.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Upgrade failed.");
    } finally {
      setUpgrading(false);
    }
  };

  const getChecklistAction = (
    itemId: string
  ): { label: string; tab: "details" | "broadcasts" | "photos" } | null => {
    if (itemId === "photos_1" || itemId === "photos_3") {
      return { label: "Add Photos", tab: "photos" };
    }
    if (itemId === "broadcast") {
      return { label: "Post Broadcast", tab: "broadcasts" };
    }
    if (
      itemId === "website" ||
      itemId === "gmaps" ||
      itemId === "description" ||
      itemId === "instagram"
    ) {
      return { label: "Update Details", tab: "details" };
    }
    return null;
  };

  const displayTag = roofSignText.trim() || businessName.slice(0, 18);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/35 text-sm text-red-200 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-sm text-emerald-200 flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 1. BAZAAR COINS & BUILDING TIER PROGRESSION */}
      <section
        aria-label="Building level and Bazaar Coins"
        className="rounded-2xl bg-[#121215] border border-neutral-800/90 overflow-hidden"
      >
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/35 text-amber-300 tabular-nums">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Level {currentLevel}</span>
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {currentTierSpec.name}
                </h2>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {currentTierSpec.architecturePerks}
              </p>
            </div>

            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-neutral-800 shrink-0 self-start sm:self-center">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="leading-tight">
                <div className="text-lg font-bold text-white tabular-nums">
                  {bazaarCoins.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-neutral-400">Bazaar Coins</div>
              </div>
            </div>
          </div>

          {/* Progress toward next tier */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              {coinAudit.nextLevel ? (
                <>
                  <span className="text-neutral-300 font-medium">
                    Next: Level {coinAudit.nextLevel.level} · {coinAudit.nextLevel.name}
                  </span>
                  <span className="text-neutral-400 tabular-nums">
                    {coinAudit.coinsToNextLevel > 0
                      ? `${coinAudit.coinsToNextLevel} more coins needed`
                      : "Threshold reached — ready to upgrade"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-emerald-300 font-medium">
                    Maximum Landmark Flagship tier active
                  </span>
                  <span className="text-neutral-400 tabular-nums">
                    Level 3 of 3
                  </span>
                </>
              )}
            </div>
            <div
              role="progressbar"
              aria-valuenow={coinAudit.progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress toward next building level"
              className="h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800"
            >
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${coinAudit.progressPct}%` }}
              />
            </div>
          </div>

          {/* 1-Click Architectural Upgrade Action when eligible */}
          {canUpgradeLevel && nextTierForUpgrade && (
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/35">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Level {nextTierForUpgrade.level} ({nextTierForUpgrade.name}) is unlocked
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Adds {nextTierForUpgrade.architecturePerks.toLowerCase()} and boosts your visibility across India.
                </p>
              </div>
              <button
                type="button"
                disabled={upgrading}
                onClick={() => handleUpgradeBuilding(canUpgradeLevel)}
                className="shrink-0 min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60 text-neutral-950 font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                {upgrading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Upgrading…</span>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>Upgrade to Level {canUpgradeLevel}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 3-Tier Architectural Roadmap Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800/80 border-t border-neutral-800/80 bg-[#0e0e11]">
          {PLOT_LEVEL_TIERS.map((tier) => {
            const isUnlocked = currentLevel >= tier.level;
            const isEligible = bazaarCoins >= tier.minCoins;
            return (
              <div key={tier.level} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">
                    Lv.{tier.level} · {tier.name}
                  </span>
                  {isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </span>
                  ) : isEligible ? (
                    <span className="text-[11px] font-semibold text-amber-400">
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 tabular-nums">
                      <Lock className="w-3 h-3" />
                      <span>{tier.minCoins} coins</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  {tier.visibilityPerks}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. ARCHITECTURAL CUSTOMIZER + LIVE ELEVATION PREVIEW */}
      <form
        onSubmit={handleSaveStyle}
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
      >
        {/* Left: Interactive Live Elevation Preview */}
        <div className="lg:col-span-5 rounded-2xl bg-[#121215] border border-neutral-800/90 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {plotName}
              </div>
              <div className="text-[11px] text-neutral-400">
                Architectural elevation preview
              </div>
            </div>

            {/* Level Preview Toggle so Level 1 owners can inspect Lv.2 / Lv.3 upgrades */}
            <div
              role="group"
              aria-label="Preview building level"
              className="inline-flex items-center rounded-lg bg-[#09090b] border border-neutral-800 p-0.5 shrink-0"
            >
              {([1, 2, 3] as const).map((lvl) => {
                const active = previewLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPreviewLevel(lvl)}
                    className={`min-h-[30px] px-2 rounded-md text-[11px] font-semibold tabular-nums transition-colors ${
                      active
                        ? "bg-amber-500 text-neutral-950"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    L{lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Authored Architectural SVG Schematic */}
          <div className="relative bg-[#09090b] p-4 flex flex-col items-center justify-center">
            <svg
              viewBox="0 0 360 225"
              className="w-full max-w-[340px] h-auto"
              role="img"
              aria-label={`Level ${previewLevel} architectural preview with ${activeFacadePreset.name} finish and ${accentColor} accent`}
            >
              <defs>
                <pattern
                  id="plotDraftGrid"
                  width="18"
                  height="18"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 18 0 L 0 0 0 18"
                    fill="none"
                    stroke="#1c1c22"
                    strokeWidth="0.7"
                  />
                </pattern>
                <filter id="accentGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Drafting background */}
              <rect width="360" height="225" fill="url(#plotDraftGrid)" rx="10" />

              {/* Ground shadow */}
              <ellipse cx="180" cy="186" rx="134" ry="16" fill="#000000" opacity="0.55" />

              {/* Base Plinth & Apron reacting to Facade Theme */}
              <rect
                x="46"
                y="168"
                width="268"
                height="16"
                rx="3"
                fill={activeFacadePreset.swatches[0]}
                stroke="#334155"
                strokeWidth="1"
              />
              <rect
                x="56"
                y="163"
                width="248"
                height="6"
                rx="1.5"
                fill={activeFacadePreset.swatches[1]}
                opacity="0.9"
              />

              {/* Level 2+: Glowing Perimeter Runway LEDs + Corner Bollards + Courtyard Trees */}
              {previewLevel >= 2 && (
                <g>
                  {/* Rear Ornamental Courtyard Trees */}
                  <g>
                    <rect x="65" y="138" width="4" height="25" fill="#78350f" />
                    <circle cx="67" cy="130" r="13" fill="#15803d" />
                    <circle cx="63" cy="126" r="9" fill="#16a34a" />
                  </g>
                  <g>
                    <rect x="291" y="138" width="4" height="25" fill="#78350f" />
                    <circle cx="293" cy="130" r="13" fill="#15803d" />
                    <circle cx="297" cy="126" r="9" fill="#16a34a" />
                  </g>

                  {/* Perimeter Runway LED Strip */}
                  <rect
                    x="48"
                    y="167"
                    width="264"
                    height="2.8"
                    rx="1.4"
                    fill={accentColor}
                    filter="url(#accentGlow)"
                  />

                  {/* Corner Bollard Lights */}
                  {[58, 92, 268, 302].map((bx) => (
                    <g key={bx}>
                      <rect x={bx - 2} y="152" width="4" height="12" rx="1" fill="#1e293b" />
                      <rect
                        x={bx - 2.4}
                        y="149"
                        width="4.8"
                        height="3.6"
                        rx="1"
                        fill={accentColor}
                        filter="url(#accentGlow)"
                      />
                    </g>
                  ))}
                </g>
              )}

              {/* Main Category Building Massing */}
              <rect
                x="100"
                y="88"
                width="160"
                height="75"
                rx="3"
                fill={facadeTheme === "obsidian" ? "#18181b" : facadeTheme === "terracotta" ? "#451a03" : "#1e293b"}
                stroke="#475569"
                strokeWidth="1.2"
              />
              {/* Upper Architectural Trim Band */}
              <rect
                x="96"
                y="82"
                width="168"
                height="9"
                rx="2"
                fill={activeFacadePreset.swatches[1]}
              />

              {/* Ground Floor Glass Showroom & Doorway */}
              <rect x="112" y="122" width="48" height="36" rx="2" fill="#0f172a" stroke="#334155" />
              <rect x="166" y="126" width="28" height="37" rx="2" fill="#020617" stroke={accentColor} strokeWidth="1.2" />
              <rect x="200" y="122" width="48" height="36" rx="2" fill="#0f172a" stroke="#334155" />
              {/* Warm Interior Glow */}
              <rect x="115" y="125" width="42" height="30" rx="1" fill="#fef3c7" opacity="0.16" />
              <rect x="203" y="125" width="42" height="30" rx="1" fill="#fef3c7" opacity="0.16" />

              {/* Storefront Fascia Accent LED Bar */}
              <rect
                x="104"
                y="113"
                width="152"
                height="3.2"
                rx="1.6"
                fill={accentColor}
                filter="url(#accentGlow)"
              />

              {/* Upper Windows */}
              <rect x="114" y="96" width="38" height="12" rx="1.5" fill="#38bdf8" opacity="0.28" />
              <rect x="161" y="96" width="38" height="12" rx="1.5" fill="#38bdf8" opacity="0.28" />
              <rect x="208" y="96" width="38" height="12" rx="1.5" fill="#38bdf8" opacity="0.28" />

              {/* Level 3: Sky-Terrace Crown Pergola + Solar Canopy + Vertical Beacon Fins */}
              {previewLevel >= 3 && (
                <g>
                  {/* Twin Vertical Corner Beacon Fins */}
                  <rect
                    x="95"
                    y="92"
                    width="3"
                    height="64"
                    rx="1.5"
                    fill={accentColor}
                    filter="url(#accentGlow)"
                  />
                  <rect
                    x="262"
                    y="92"
                    width="3"
                    height="64"
                    rx="1.5"
                    fill={accentColor}
                    filter="url(#accentGlow)"
                  />

                  {/* Steel Sky-Terrace Columns */}
                  <rect x="118" y="56" width="4" height="26" fill="#334155" />
                  <rect x="238" y="56" width="4" height="26" fill="#334155" />

                  {/* Cantilevered Sky-Terrace Canopy Rim */}
                  <rect
                    x="104"
                    y="49"
                    width="152"
                    height="9"
                    rx="2"
                    fill="#0f172a"
                    stroke="#475569"
                    strokeWidth="1"
                  />

                  {/* Rooftop Solar Skylight Panels */}
                  <polygon points="122,49 156,42 162,49" fill="#1d4ed8" opacity="0.9" />
                  <polygon points="164,49 198,42 204,49" fill="#1d4ed8" opacity="0.9" />
                  <polygon points="206,49 240,42 246,49" fill="#1d4ed8" opacity="0.9" />

                  {/* Glowing Brand Marquee Crown Halo */}
                  <rect
                    x="102"
                    y="53"
                    width="156"
                    height="3"
                    rx="1.5"
                    fill={accentColor}
                    filter="url(#accentGlow)"
                  />
                </g>
              )}

              {/* Rooftop Tag Pill */}
              <g transform={previewLevel >= 3 ? "translate(180, 24)" : "translate(180, 62)"}>
                <rect
                  x="-76"
                  y="-12"
                  width="152"
                  height="22"
                  rx="11"
                  fill="#09090b"
                  stroke={accentColor}
                  strokeWidth="1.2"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {displayTag}
                </text>
              </g>
            </svg>

            {previewLevel > currentLevel && (
              <p className="mt-2 text-[11px] text-amber-300/90 text-center">
                Previewing Level {previewLevel} upgrade ({PLOT_LEVEL_TIERS[previewLevel - 1].minCoins} coins required)
              </p>
            )}
          </div>

          <div className="px-4 py-3 border-t border-neutral-800/80 flex items-center justify-between gap-2 text-xs">
            <span className="text-neutral-400">
              Live tier: <strong className="text-neutral-200">Level {currentLevel}</strong>
            </span>
            <Link
              href={`/?shop=${businessSlug}`}
              className="inline-flex items-center gap-1.5 font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>Inspect in 3D Map</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Material, Accent Glow & Rooftop Tag Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* Facade Material Finish */}
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold text-white">
              Facade &amp; Plinth Material Finish
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FACADE_THEME_PRESETS.map((theme) => {
                const selected = facadeTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFacadeTheme(theme.id)}
                    className={`min-h-[68px] p-3.5 rounded-xl border text-left transition-colors flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      selected
                        ? "bg-amber-500/10 border-amber-500/60"
                        : "bg-[#121215] border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                      <span
                        className="w-5 h-3.5 rounded-sm border border-white/15"
                        style={{ backgroundColor: theme.swatches[0] }}
                      />
                      <span
                        className="w-5 h-2 rounded-sm border border-white/15"
                        style={{ backgroundColor: theme.swatches[1] }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>{theme.name}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-snug mt-0.5">
                        {theme.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Brand Accent LED Color */}
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold text-white">
              Brand Accent Glow &amp; Beacon Color
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACCENT_COLOR_PRESETS.map((preset) => {
                const selected = accentColor === preset.hex;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAccentColor(preset.hex)}
                    className={`min-h-[44px] px-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      selected
                        ? "bg-neutral-900 border-amber-500/70 text-white"
                        : "bg-[#121215] border-neutral-800 text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white/15"
                      style={{
                        backgroundColor: preset.hex,
                        boxShadow: `0 0 10px ${preset.hex}88`,
                      }}
                    />
                    <span className="truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Optional Rooftop Marquee Tag */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="plot-roof-tag"
                className="block text-sm font-semibold text-white"
              >
                Rooftop Marquee Tag{" "}
                <span className="text-xs font-normal text-neutral-400">(Optional)</span>
              </label>
              <span className="text-[11px] text-neutral-400 tabular-nums">
                {roofSignText.length}/18
              </span>
            </div>
            <input
              id="plot-roof-tag"
              type="text"
              maxLength={18}
              value={roofSignText}
              onChange={(e) => setRoofSignText(e.target.value)}
              placeholder="e.g. ROASTERY, STUDIO, OPEN 24x7"
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
            />
            <p className="text-xs text-neutral-400">
              Shown as a compact accent tag on your 3D plot badge and India-wide search results.
            </p>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">
              {hasUnsavedChanges
                ? "Unsaved changes ready to publish."
                : "Your 3D plot matches your live map style."}
            </span>
            <button
              type="submit"
              disabled={savingStyle || !hasUnsavedChanges}
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              {savingStyle ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <span>Apply to Live 3D Map</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* 3. TRANSPARENT ANTI-CHEAT COIN CHECKLIST */}
      <section
        aria-label="How to earn Bazaar Coins"
        className="rounded-2xl bg-[#121215] border border-neutral-800/90 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Earn Bazaar Coins to Upgrade Your Building
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Server-verified from your real storefront completeness, live broadcasts, and genuine visitor engagement.
            </p>
          </div>
          <span className="text-[11px] text-neutral-300 bg-[#09090b] border border-neutral-800 px-2.5 py-1 rounded-lg self-start sm:self-center whitespace-nowrap">
            +2/view · +5/wave · +15/lead · +35/broadcast
          </span>
        </div>

        <ul className="divide-y divide-neutral-800/70">
          {coinAudit.checklist.map((item) => {
            const action = !item.earned ? getChecklistAction(item.id) : null;
            return (
              <li
                key={item.id}
                className="px-5 py-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                      item.earned
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-neutral-900 border-neutral-700 text-neutral-500"
                    }`}
                  >
                    {item.earned ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium ${
                        item.earned ? "text-neutral-200" : "text-white"
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-xs text-neutral-400">{item.hint}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      item.earned ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    +{item.coins}
                  </span>
                  {action && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab(action.tab)}
                      className="min-h-[34px] px-2.5 rounded-lg bg-[#09090b] hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 inline-flex items-center gap-1 transition-colors"
                    >
                      <span>{action.label}</span>
                      <ArrowRight className="w-3 h-3 text-amber-400" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
