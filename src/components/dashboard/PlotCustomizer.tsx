"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpCircle,
  Building2,
  Car,
  Check,
  CheckCircle2,
  Coins,
  ExternalLink,
  Flag,
  Flame,
  Layers,
  Lightbulb,
  Loader2,
  Lock,
  Palette,
  Share2,
  Sparkles,
  Trees,
} from "lucide-react";
import {
  BannerStyle,
  CategoryId,
  DrivewayVehicle,
  FacadeTheme,
  GardenStyle,
  LightingStyle,
  PlotConfig,
  WallAccent,
} from "@/types";
import {
  ACCENT_COLOR_PRESETS,
  BANNER_STYLE_PRESETS,
  CoinAuditResult,
  DRIVEWAY_VEHICLE_PRESETS,
  FACADE_THEME_PRESETS,
  GARDEN_STYLE_PRESETS,
  LIGHTING_STYLE_PRESETS,
  PLOT_LEVEL_TIERS,
  WALL_ACCENT_PRESETS,
} from "@/lib/constants/plotUpgrades";
import { PlotLive3DViewer } from "./PlotLive3DViewer";

interface PlotCustomizerProps {
  businessId: string;
  businessName: string;
  businessSlug: string;
  categoryId?: CategoryId;
  plotName: string;
  currentLevel: 1 | 2 | 3;
  bazaarCoins: number;
  plotConfig: PlotConfig;
  coinAudit: CoinAuditResult;
  accessToken: string;
  onBusinessUpdated: (updated: Record<string, unknown>) => void;
  onNavigateTab: (tab: "details" | "broadcasts") => void;
}

type CustomizerTab =
  | "finishes"
  | "walls"
  | "garden"
  | "vehicles"
  | "lighting"
  | "banners";

export function PlotCustomizer({
  businessId,
  businessName,
  businessSlug,
  categoryId = "other-business",
  plotName,
  currentLevel,
  bazaarCoins,
  plotConfig,
  coinAudit,
  accessToken,
  onBusinessUpdated,
  onNavigateTab,
}: PlotCustomizerProps) {
  // 3D Architectural Customization State
  const [facadeTheme, setFacadeTheme] = useState<FacadeTheme>(
    plotConfig?.facadeTheme || "default"
  );
  const [accentColor, setAccentColor] = useState<string>(
    plotConfig?.accentColor || "#f59e0b"
  );
  const [roofSignText, setRoofSignText] = useState<string>(
    plotConfig?.roofSignText || ""
  );
  const [gardenStyle, setGardenStyle] = useState<GardenStyle>(
    plotConfig?.gardenStyle || "none"
  );
  const [drivewayVehicle, setDrivewayVehicle] = useState<DrivewayVehicle>(
    plotConfig?.drivewayVehicle || "none"
  );
  const [lightingStyle, setLightingStyle] = useState<LightingStyle>(
    plotConfig?.lightingStyle || "neon"
  );
  const [bannerStyle, setBannerStyle] = useState<BannerStyle>(
    plotConfig?.bannerStyle || "none"
  );
  const [wallAccent, setWallAccent] = useState<WallAccent>(
    plotConfig?.wallAccent || "standard"
  );

  const [previewLevel, setPreviewLevel] = useState<1 | 2 | 3>(currentLevel);
  const [activeTab, setActiveTab] = useState<CustomizerTab>("finishes");

  // Server Action States
  const [savingStyle, setSavingStyle] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [claimingShare, setClaimingShare] = useState(false);
  const [claimingFollow, setClaimingFollow] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setFacadeTheme(plotConfig?.facadeTheme || "default");
    setAccentColor(plotConfig?.accentColor || "#f59e0b");
    setRoofSignText(plotConfig?.roofSignText || "");
    setGardenStyle(plotConfig?.gardenStyle || "none");
    setDrivewayVehicle(plotConfig?.drivewayVehicle || "none");
    setLightingStyle(plotConfig?.lightingStyle || "neon");
    setBannerStyle(plotConfig?.bannerStyle || "none");
    setWallAccent(plotConfig?.wallAccent || "standard");
    setPreviewLevel(currentLevel);
  }, [businessId, plotConfig, currentLevel]);

  const savedTheme = plotConfig?.facadeTheme || "default";
  const savedAccent = plotConfig?.accentColor || "#f59e0b";
  const savedTag = plotConfig?.roofSignText || "";
  const savedGarden = plotConfig?.gardenStyle || "none";
  const savedVehicle = plotConfig?.drivewayVehicle || "none";
  const savedLighting = plotConfig?.lightingStyle || "neon";
  const savedBanner = plotConfig?.bannerStyle || "none";
  const savedWall = plotConfig?.wallAccent || "standard";

  const hasUnsavedChanges =
    facadeTheme !== savedTheme ||
    accentColor !== savedAccent ||
    roofSignText.trim() !== savedTag ||
    gardenStyle !== savedGarden ||
    drivewayVehicle !== savedVehicle ||
    lightingStyle !== savedLighting ||
    bannerStyle !== savedBanner ||
    wallAccent !== savedWall;

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
    }, 4500);
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
            ...plotConfig,
            facadeTheme,
            accentColor,
            roofSignText: roofSignText.trim(),
            gardenStyle,
            drivewayVehicle,
            lightingStyle,
            bannerStyle,
            wallAccent,
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
      showStatus("3D plot architecture applied live to map.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save style.");
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
      showStatus(`Level ${targetLevel} unlocked and active.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Upgrade failed.");
    } finally {
      setUpgrading(false);
    }
  };

  // Bazaar Coins Engagement Action Handlers
  const handleClaimDailyBonus = async () => {
    setClaimingDaily(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/dashboard/businesses/${businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ claim_daily_bonus: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim daily bonus.");
      if (data.business) onBusinessUpdated(data.business);
      showStatus("Daily check-in claimed (+15 coins).");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to claim check-in.");
    } finally {
      setClaimingDaily(false);
    }
  };

  const handleSharePlot = async () => {
    setClaimingShare(true);
    setErrorMsg(null);
    setStatusMsg(null);
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/?shop=${businessSlug}`
        : `https://spotlight.nerqivastudio.in/?shop=${businessSlug}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator
          .share({
            title: `${businessName} on Spotlight Bazaar`,
            text: `Visit our 3D storefront on India's High Street`,
            url: shareUrl,
          })
          .catch(() => {
            if (navigator.clipboard) navigator.clipboard.writeText(shareUrl);
          });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Ignore
    }

    try {
      const res = await fetch(`/api/dashboard/businesses/${businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ claim_share_bonus: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register share.");
      if (data.business) onBusinessUpdated(data.business);
      showStatus("Link copied & +30 coins claimed.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to register share.");
    } finally {
      setClaimingShare(false);
    }
  };

  const handleFollowNetwork = async () => {
    setClaimingFollow(true);
    setErrorMsg(null);
    setStatusMsg(null);

    if (typeof window !== "undefined") {
      window.open("https://instagram.com/nerqiva", "_blank", "noopener,noreferrer");
    }

    try {
      const res = await fetch(`/api/dashboard/businesses/${businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ claim_follow_bonus: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim community bonus.");
      if (data.business) onBusinessUpdated(data.business);
      showStatus("Network followed (+25 coins).");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to claim community bonus.");
    } finally {
      setClaimingFollow(false);
    }
  };

  const getChecklistAction = (
    itemId: string
  ): { label: string; tab: "details" | "broadcasts" } | null => {
    if (itemId === "broadcast") {
      return { label: "Post", tab: "broadcasts" };
    }
    if (
      itemId === "website" ||
      itemId === "gmaps" ||
      itemId === "description" ||
      itemId === "instagram" ||
      itemId === "whatsapp_line"
    ) {
      return { label: "Edit", tab: "details" };
    }
    return null;
  };

  const customizerTabs: { id: CustomizerTab; label: string; icon: React.ElementType }[] = [
    { id: "finishes", label: "Finishes", icon: Palette },
    { id: "walls", label: "Walls", icon: Building2 },
    { id: "garden", label: "Garden", icon: Trees },
    { id: "vehicles", label: "Driveway", icon: Car },
    { id: "lighting", label: "Lighting", icon: Lightbulb },
    { id: "banners", label: "Signage", icon: Flag },
  ];

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div
          role="alert"
          className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/35 text-xs text-red-200 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div
          role="status"
          className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 1. BAZAAR COINS & TIER PROGRESSION */}
      <section
        aria-label="Building level and Bazaar Coins"
        className="rounded-2xl bg-[#121215] border border-neutral-800/90 overflow-hidden"
      >
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/35 text-amber-300 tabular-nums">
                <Layers className="w-3.5 h-3.5" />
                <span>Level {currentLevel}</span>
              </span>
              <h2 className="text-base font-bold text-white">
                {currentTierSpec.name}
              </h2>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#09090b] border border-neutral-800 shrink-0 self-start sm:self-center">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-white tabular-nums">
                  {bazaarCoins.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-neutral-400">coins</span>
              </div>
            </div>
          </div>

          {/* Progress toward next tier */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              {coinAudit.nextLevel ? (
                <>
                  <span className="text-neutral-300 font-medium">
                    Next: Lv.{coinAudit.nextLevel.level} ({coinAudit.nextLevel.name})
                  </span>
                  <span className="text-neutral-400 tabular-nums">
                    {coinAudit.coinsToNextLevel > 0
                      ? `${coinAudit.coinsToNextLevel} coins needed`
                      : "Threshold reached"}
                  </span>
                </>
              ) : (
                <span className="text-emerald-300 font-medium">
                  Landmark Flagship (Max Tier)
                </span>
              )}
            </div>
            <div
              role="progressbar"
              aria-valuenow={coinAudit.progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800"
            >
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${coinAudit.progressPct}%` }}
              />
            </div>
          </div>

          {/* Upgrade Action */}
          {canUpgradeLevel && nextTierForUpgrade && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/35">
              <div className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Level {nextTierForUpgrade.level} ({nextTierForUpgrade.name}) ready</span>
              </div>
              <button
                type="button"
                disabled={upgrading}
                onClick={() => handleUpgradeBuilding(canUpgradeLevel)}
                className="shrink-0 min-h-[36px] px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60 text-neutral-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                {upgrading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                )}
                <span>Upgrade</span>
              </button>
            </div>
          )}
        </div>

        {/* 3-Tier Strip */}
        <div className="grid grid-cols-3 divide-x divide-neutral-800/80 border-t border-neutral-800/80 bg-[#0e0e11]">
          {PLOT_LEVEL_TIERS.map((tier) => {
            const isUnlocked = currentLevel >= tier.level;
            const isEligible = bazaarCoins >= tier.minCoins;
            return (
              <div key={tier.level} className="p-3 text-center">
                <div className="text-xs font-semibold text-white">
                  Lv.{tier.level}
                </div>
                <div className="text-[11px] mt-0.5">
                  {isUnlocked ? (
                    <span className="text-emerald-400 font-medium">Active</span>
                  ) : isEligible ? (
                    <span className="text-amber-400 font-medium">Ready</span>
                  ) : (
                    <span className="text-neutral-500 tabular-nums">{tier.minCoins}c</span>
                  )}
                </div>
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
        {/* Left: Interactive Live 3D WebGL POV Viewer */}
        <div className="lg:col-span-7 rounded-2xl bg-[#121215] border border-neutral-800/90 overflow-hidden shadow-2xl flex flex-col">
          <div className="px-4 py-2.5 border-b border-neutral-800/80 flex items-center justify-between gap-2 bg-[#0d0e12]">
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-xs font-semibold text-white truncate">{plotName}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                3D POV
              </span>
            </div>

            {/* Level Toggle */}
            <div
              role="group"
              aria-label="Preview level"
              className="inline-flex items-center rounded-lg bg-[#09090b] border border-neutral-800 p-0.5 shrink-0"
            >
              {([1, 2, 3] as const).map((lvl) => {
                const active = previewLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPreviewLevel(lvl)}
                    className={`min-h-[26px] px-2 rounded text-[10px] font-bold tabular-nums transition-colors ${
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

          {/* Interactive Three.js WebGL POV Canvas */}
          <div className="relative bg-[#09090b] flex-1">
            <PlotLive3DViewer
              categoryId={categoryId}
              plotLevel={previewLevel}
              facadeTheme={facadeTheme}
              accentColor={accentColor}
              signText={roofSignText}
              gardenStyle={gardenStyle}
              drivewayVehicle={drivewayVehicle}
              lightingStyle={lightingStyle}
              bannerStyle={bannerStyle}
              wallAccent={wallAccent}
              businessName={businessName}
              className="w-full h-[380px] sm:h-[440px] rounded-none border-0"
            />
          </div>

          <div className="px-4 py-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-2 text-xs bg-[#0e0f13]">
            <span className="text-neutral-400">
              Active: <strong className="text-neutral-200">Level {currentLevel}</strong>
            </span>
            <Link
              href={`/?shop=${businessSlug}`}
              className="inline-flex items-center gap-1 font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>View Map</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Right: Architectural Customizer Visual Controls */}
        <div className="lg:col-span-5 space-y-3">
          {/* Sub-Category Pills (Balanced 3x2 / 6x1 Grid - All Visible, Zero Text Truncation) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-[#121215] border border-neutral-800/90 rounded-xl">
            {customizerTabs.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1 transition-all ${
                    active
                      ? "bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-950/20"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: FINISHES & GLOW */}
          {activeTab === "finishes" && (
            <div className="space-y-3 rounded-2xl bg-[#121215] border border-neutral-800/90 p-3.5">
              <fieldset className="space-y-2">
                <legend className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Facade &amp; Plinth Materials
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {FACADE_THEME_PRESETS.map((theme) => {
                    const selected = facadeTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setFacadeTheme(theme.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                          selected
                            ? "bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/30"
                            : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        {/* Visual 3D-effect Material Swatch */}
                        <div className="h-10 w-full rounded-lg overflow-hidden border border-white/10 flex flex-col shadow-inner">
                          <div
                            className="flex-1 w-full"
                            style={{ backgroundColor: theme.swatches[0] }}
                          />
                          <div
                            className="h-3.5 w-full border-t border-black/30"
                            style={{ backgroundColor: theme.swatches[1] }}
                          />
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-white truncate">
                            {theme.name}
                          </span>
                          {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Brand Accent LED Color — Luminous Color Gems (No Truncated Text) */}
              <fieldset className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <legend className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Brand LED Glow &amp; Beacons
                  </legend>
                  <span className="text-[11px] font-mono text-amber-400">
                    {ACCENT_COLOR_PRESETS.find((c) => c.hex === accentColor)?.name || accentColor}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                  {ACCENT_COLOR_PRESETS.map((preset) => {
                    const selected = accentColor === preset.hex;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={selected}
                        title={preset.name}
                        onClick={() => setAccentColor(preset.hex)}
                        className={`h-11 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          selected
                            ? "bg-neutral-900 border-amber-400 ring-2 ring-amber-400/30 scale-105 shadow-md shadow-amber-950/30"
                            : "bg-[#09090b] border-neutral-800 hover:border-neutral-700 hover:scale-102"
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full transition-transform"
                          style={{
                            backgroundColor: preset.hex,
                            boxShadow: selected
                              ? `0 0 12px ${preset.hex}, 0 0 4px ${preset.hex}`
                              : `0 0 6px ${preset.hex}`,
                          }}
                        />
                        <span className="text-[9px] font-mono font-medium text-neutral-400 truncate max-w-[44px]">
                          {preset.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Rooftop Marquee Tag Input */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  <label htmlFor="plot-roof-tag">Rooftop Marquee Tag</label>
                  <span className="text-[11px] font-normal text-neutral-500 tabular-nums">
                    {roofSignText.length}/18
                  </span>
                </div>
                <input
                  id="plot-roof-tag"
                  type="text"
                  maxLength={18}
                  value={roofSignText}
                  onChange={(e) => setRoofSignText(e.target.value)}
                  placeholder="e.g. STUDIO, OPEN 24x7"
                  className="w-full min-h-[40px] px-3 rounded-xl bg-[#09090b] border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/75"
                />
              </div>
            </div>
          )}

          {/* TAB 2: WALLS & FACADE ACCENTS (Visual Preview Cards) */}
          {activeTab === "walls" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-3.5">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Wall Architectural Treatments
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {WALL_ACCENT_PRESETS.map((preset) => {
                  const selected = wallAccent === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setWallAccent(preset.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/30"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {/* Visual Graphic Representation */}
                      <div className="h-12 w-full rounded-lg bg-[#0e1017] border border-white/10 flex items-center justify-center p-1.5 relative overflow-hidden">
                        {preset.id === "standard" && (
                          <div className="w-full h-full rounded bg-gradient-to-r from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                              MONOLITH
                            </span>
                          </div>
                        )}
                        {preset.id === "wood_louvres" && (
                          <div className="w-full h-full flex justify-between items-stretch gap-1 px-1">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                              <div
                                key={i}
                                className="flex-1 rounded-sm bg-gradient-to-b from-[#b45309] to-[#78350f] shadow-sm"
                              />
                            ))}
                          </div>
                        )}
                        {preset.id === "glass_curtain" && (
                          <div className="w-full h-full rounded bg-gradient-to-tr from-[#0284c7] via-[#38bdf8]/60 to-[#e0f2fe]/40 border border-cyan-400/30 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)]" />
                            <div className="w-full h-full grid grid-cols-3 divide-x divide-cyan-900/40" />
                          </div>
                        )}
                        {preset.id === "metal_ribs" && (
                          <div className="w-full h-full flex justify-around items-stretch px-1">
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="w-1.5 rounded-sm bg-gradient-to-b from-slate-400 to-slate-600 relative flex items-center justify-center shadow"
                              >
                                <span className="w-0.5 h-3/4 rounded-full bg-amber-400 shadow-[0_0_4px_#f59e0b]" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-white truncate">
                          {preset.name}
                        </span>
                        {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: COURTYARD GARDEN (Visual Preview Cards) */}
          {activeTab === "garden" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-3.5">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Courtyard &amp; Landscaping
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {GARDEN_STYLE_PRESETS.map((preset) => {
                  const selected = gardenStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setGardenStyle(preset.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/30"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {/* Visual Graphic Representation */}
                      <div className="h-12 w-full rounded-lg bg-[#0e1017] border border-white/10 flex items-center justify-center p-1.5 relative overflow-hidden">
                        {preset.id === "none" && (
                          <div className="w-full h-full rounded bg-neutral-800 border border-neutral-700 grid grid-cols-4 grid-rows-2 gap-0.5 p-0.5">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className="bg-neutral-700 rounded-xs" />
                            ))}
                          </div>
                        )}
                        {preset.id === "minimal" && (
                          <div className="w-full h-full rounded bg-[#15803d] border border-emerald-400/30 flex items-center justify-center shadow-inner relative">
                            <div className="w-full h-2 bg-[#166534] absolute bottom-0 border-t border-black/20" />
                            <span className="text-[11px] font-bold text-emerald-100">TURF LAWN</span>
                          </div>
                        )}
                        {preset.id === "zen" && (
                          <div className="w-full h-full rounded bg-[#1e293b] border border-slate-700 flex items-center justify-center gap-2 px-2">
                            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-600 shrink-0" />
                            <span className="w-3 h-3 rounded-full bg-slate-900 border border-slate-600 shrink-0" />
                            <div className="flex gap-0.5 h-full items-end pb-1">
                              <span className="w-1 h-7 rounded-t bg-emerald-600" />
                              <span className="w-1 h-5 rounded-t bg-emerald-500" />
                            </div>
                          </div>
                        )}
                        {preset.id === "palms" && (
                          <div className="w-full h-full rounded bg-gradient-to-b from-[#064e3b] to-[#022c22] border border-emerald-500/30 flex items-center justify-center gap-2">
                            <span className="text-xl">🌴</span>
                            <span className="text-[10px] font-bold text-emerald-200">PALMS</span>
                          </div>
                        )}
                        {preset.id === "planters" && (
                          <div className="w-full h-full rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center gap-2 px-1">
                            <div className="w-full h-6 rounded bg-stone-800 border border-stone-600 flex items-center justify-center gap-1.5 shadow">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-sm" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-white truncate">
                          {preset.name}
                        </span>
                        {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: VEHICLES (Visual Preview Cards) */}
          {activeTab === "vehicles" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-3.5">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Driveway Vehicles &amp; Arrivals
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {DRIVEWAY_VEHICLE_PRESETS.map((preset) => {
                  const selected = drivewayVehicle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDrivewayVehicle(preset.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/30"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {/* Visual Graphic Representation */}
                      <div className="h-12 w-full rounded-lg bg-[#0e1017] border border-white/10 flex items-center justify-center p-1.5 relative overflow-hidden">
                        {preset.id === "none" && (
                          <div className="w-full h-full rounded border border-dashed border-neutral-700 flex items-center justify-center">
                            <span className="text-[10px] font-mono text-neutral-400">OPEN COURT</span>
                          </div>
                        )}
                        {preset.id === "scooter" && (
                          <div className="w-full h-full flex items-center justify-center gap-2">
                            <span className="text-2xl">🛵</span>
                            <span className="text-[10px] font-bold text-amber-300">EXPRESS</span>
                          </div>
                        )}
                        {preset.id === "sedan" && (
                          <div className="w-full h-full flex items-center justify-center gap-2">
                            <span className="text-2xl">🚗</span>
                            <span className="text-[10px] font-bold text-slate-300">EXECUTIVE</span>
                          </div>
                        )}
                        {preset.id === "cyber" && (
                          <div className="w-full h-full rounded bg-gradient-to-r from-neutral-900 via-cyan-950/40 to-neutral-900 border border-cyan-500/40 flex items-center justify-center gap-2 shadow-inner">
                            <span className="text-xl">🏎️</span>
                            <span className="text-[10px] font-mono font-bold text-cyan-300">CYBER EV</span>
                          </div>
                        )}
                        {preset.id === "bikestand" && (
                          <div className="w-full h-full flex items-center justify-center gap-2">
                            <span className="text-2xl">🚲</span>
                            <span className="text-[10px] font-bold text-emerald-300">BIKE RACK</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-white truncate">
                          {preset.name}
                        </span>
                        {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: LIGHTING (Visual Preview Cards) */}
          {activeTab === "lighting" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-3.5">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Exterior Lighting Atmosphere
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {LIGHTING_STYLE_PRESETS.map((preset) => {
                  const selected = lightingStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setLightingStyle(preset.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/30"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {/* Visual Graphic Representation */}
                      <div className="h-12 w-full rounded-lg bg-[#0e1017] border border-white/10 flex items-center justify-center p-1.5 relative overflow-hidden">
                        {preset.id === "neon" && (
                          <div className="w-full h-full flex justify-between items-center px-4">
                            <div className="w-1.5 h-full rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b]" />
                            <span className="text-[10px] font-bold text-amber-300 tracking-wider">RUNWAY</span>
                            <div className="w-1.5 h-full rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b]" />
                          </div>
                        )}
                        {preset.id === "warm_festoon" && (
                          <div className="w-full h-full flex items-center justify-around px-2 relative">
                            <div className="absolute top-2 left-2 right-2 h-0.5 bg-neutral-700" />
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_8px_#f59e0b] relative z-10"
                              />
                            ))}
                          </div>
                        )}
                        {preset.id === "uplights" && (
                          <div className="w-full h-full flex justify-around items-end pb-1">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="flex flex-col items-center">
                                <div className="w-3 h-5 bg-gradient-to-t from-cyan-400/80 to-transparent clip-triangle" />
                                <div className="w-2.5 h-1 rounded bg-slate-700 border border-cyan-400" />
                              </div>
                            ))}
                          </div>
                        )}
                        {preset.id === "pathlights" && (
                          <div className="w-full h-full flex justify-around items-end pb-1">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="w-2 h-7 rounded-t bg-neutral-700 flex flex-col justify-start items-center">
                                <span className="w-2.5 h-1 rounded-xs bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-white truncate">
                          {preset.name}
                        </span>
                        {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: SIGNAGE (Visual Preview Cards) */}
          {activeTab === "banners" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-3.5">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Sidewalk Signage &amp; Banners
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {BANNER_STYLE_PRESETS.map((preset) => {
                  const selected = bannerStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setBannerStyle(preset.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/30"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {/* Visual Graphic Representation */}
                      <div className="h-12 w-full rounded-lg bg-[#0e1017] border border-white/10 flex items-center justify-center p-1.5 relative overflow-hidden">
                        {preset.id === "none" && (
                          <div className="w-full h-full rounded border border-dashed border-neutral-700 flex items-center justify-center">
                            <span className="text-[10px] font-mono text-neutral-400">CLEAN FACADE</span>
                          </div>
                        )}
                        {preset.id === "pennant" && (
                          <div className="w-full h-full flex items-center justify-center gap-1.5">
                            <div className="w-0.5 h-8 bg-slate-400" />
                            <div className="w-4 h-6 bg-gradient-to-b from-amber-500 to-amber-600 rounded-r shadow" />
                            <span className="text-[10px] font-bold text-amber-300">PENNANT</span>
                          </div>
                        )}
                        {preset.id === "totem" && (
                          <div className="w-full h-full flex items-center justify-center gap-2">
                            <div className="w-4 h-7 rounded-sm bg-neutral-900 border border-amber-400/80 flex flex-col p-0.5 shadow">
                              <div className="w-full h-1 bg-amber-400 rounded-2xs mb-0.5" />
                              <div className="w-full h-0.5 bg-neutral-700 rounded-2xs mb-0.5" />
                              <div className="w-full h-0.5 bg-neutral-700 rounded-2xs" />
                            </div>
                            <span className="text-[10px] font-bold text-white">TOTEM</span>
                          </div>
                        )}
                        {preset.id === "arch" && (
                          <div className="w-full h-full flex items-center justify-center gap-2">
                            <div className="w-9 h-7 rounded-t border-2 border-amber-400 border-b-0 shadow-[0_0_8px_#f59e0b] flex items-center justify-center">
                              <span className="text-[8px] font-bold text-amber-300">ENTRY</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-white truncate">
                          {preset.name}
                        </span>
                        {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dedicated Publish Action Bar */}
          <div className="p-3 rounded-2xl bg-[#121215] border border-neutral-800/90 flex items-center justify-between gap-2 shadow-lg">
            <span className="text-[11px] font-medium text-neutral-400">
              {hasUnsavedChanges ? "Changes ready" : "Saved"}
            </span>
            <button
              type="submit"
              disabled={savingStyle || !hasUnsavedChanges}
              className="min-h-[40px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              {savingStyle ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Apply to Live Map</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* 3. COIN MILESTONES & ENGAGEMENT REWARDS */}
      <section
        aria-label="How to earn Bazaar Coins"
        className="rounded-2xl bg-[#121215] border border-neutral-800/90 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-neutral-800/80 flex items-center justify-between gap-2 bg-[#0e0f13]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Earn Bazaar Coins</span>
          </h3>
          <span className="text-[10px] text-neutral-400 tabular-nums">
            +2/view · +5/wave · +15/lead
          </span>
        </div>

        <ul className="divide-y divide-neutral-800/70">
          {coinAudit.checklist.map((item) => {
            const isDaily = item.id === "daily_checkin";
            const isShare = item.id === "share_plot";
            const isFollow = item.id === "follow_network";
            const isWhatsapp = item.id === "whatsapp_line";
            const navAction = !item.earned ? getChecklistAction(item.id) : null;

            return (
              <li
                key={item.id}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-neutral-900/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                      item.earned
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-neutral-900 border-neutral-700 text-neutral-500"
                    }`}
                  >
                    {item.earned ? (
                      <Check className="w-2.5 h-2.5" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-neutral-600" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <span
                      className={`text-xs font-medium truncate block ${
                        item.earned ? "text-neutral-300" : "text-white"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] text-neutral-500 truncate block">
                      {item.hint}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      item.earned ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    +{item.coins}
                  </span>

                  {/* Daily Check-in */}
                  {isDaily && !item.earned && (
                    <button
                      type="button"
                      disabled={claimingDaily}
                      onClick={handleClaimDailyBonus}
                      className="min-h-[30px] px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-neutral-950 font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                    >
                      {claimingDaily ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Flame className="w-3 h-3 text-neutral-950" />
                      )}
                      <span>Claim</span>
                    </button>
                  )}
                  {isDaily && item.earned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                      <Flame className="w-2.5 h-2.5 text-amber-400" />
                      <span>{plotConfig?.dailyStreak || 1}d</span>
                    </span>
                  )}

                  {/* Share */}
                  {isShare && !item.earned && (
                    <button
                      type="button"
                      disabled={claimingShare}
                      onClick={handleSharePlot}
                      className="min-h-[30px] px-2.5 rounded-lg bg-[#09090b] hover:bg-neutral-800 border border-amber-500/40 text-amber-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                    >
                      {claimingShare ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Share2 className="w-3 h-3 text-amber-400" />
                      )}
                      <span>Share</span>
                    </button>
                  )}
                  {isShare && item.earned && (
                    <span className="text-[10px] font-medium text-emerald-400">
                      Shared
                    </span>
                  )}

                  {/* Follow */}
                  {isFollow && !item.earned && (
                    <button
                      type="button"
                      disabled={claimingFollow}
                      onClick={handleFollowNetwork}
                      className="min-h-[30px] px-2.5 rounded-lg bg-[#09090b] hover:bg-neutral-800 border border-amber-500/40 text-amber-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                    >
                      {claimingFollow ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-amber-400" />
                      )}
                      <span>Follow</span>
                    </button>
                  )}
                  {isFollow && item.earned && (
                    <span className="text-[10px] font-medium text-emerald-400">
                      Joined
                    </span>
                  )}

                  {/* WhatsApp */}
                  {isWhatsapp && !item.earned && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab("details")}
                      className="min-h-[30px] px-2 rounded-lg bg-[#09090b] hover:bg-neutral-800 border border-neutral-800 text-[11px] font-medium text-neutral-300 inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Connect</span>
                      <ArrowRight className="w-2.5 h-2.5 text-emerald-400" />
                    </button>
                  )}

                  {/* Remaining unearned items */}
                  {navAction && !isDaily && !isShare && !isFollow && !isWhatsapp && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab(navAction.tab)}
                      className="min-h-[30px] px-2 rounded-lg bg-[#09090b] hover:bg-neutral-800 border border-neutral-800 text-[11px] font-medium text-neutral-300 inline-flex items-center gap-1 transition-colors"
                    >
                      <span>{navAction.label}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-amber-400" />
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
