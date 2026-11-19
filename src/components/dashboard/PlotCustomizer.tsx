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
  onNavigateTab: (tab: "details" | "broadcasts" | "photos") => void;
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
  ): { label: string; tab: "details" | "broadcasts" | "photos" } | null => {
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
    if (itemId === "portfolio_photos") {
      return { label: "Upload", tab: "photos" };
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
                      : "Unlocked"}
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

        {/* Right: Architectural Customizer Tabs & Visual Controls */}
        <div className="lg:col-span-5 space-y-3">
          {/* Sub-Category Nav Pills */}
          <div className="grid grid-cols-6 gap-1 p-1 bg-[#121215] border border-neutral-800/90 rounded-xl">
            {customizerTabs.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`min-h-[34px] rounded-lg text-[11px] font-semibold inline-flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors ${
                    active
                      ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: FINISHES & GLOW */}
          {activeTab === "finishes" && (
            <div className="space-y-3.5 rounded-2xl bg-[#121215] border border-neutral-800/90 p-4">
              {/* Facade Material Finish */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Facade &amp; Plinth Finish
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
                        className={`min-h-[52px] p-2.5 rounded-xl border text-left transition-colors flex items-center gap-2.5 ${
                          selected
                            ? "bg-amber-500/10 border-amber-500/60"
                            : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex flex-col gap-1 shrink-0">
                          <span
                            className="w-4 h-3 rounded-sm border border-white/15"
                            style={{ backgroundColor: theme.swatches[0] }}
                          />
                          <span
                            className="w-4 h-1.5 rounded-sm border border-white/15"
                            style={{ backgroundColor: theme.swatches[1] }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white flex items-center gap-1 truncate">
                            <span>{theme.name}</span>
                            {selected && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Brand Accent LED Color */}
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Brand Accent LED
                </legend>
                <div className="grid grid-cols-3 gap-1.5">
                  {ACCENT_COLOR_PRESETS.map((preset) => {
                    const selected = accentColor === preset.hex;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setAccentColor(preset.hex)}
                        className={`min-h-[36px] px-2 rounded-lg border flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                          selected
                            ? "bg-neutral-900 border-amber-500/70 text-white"
                            : "bg-[#09090b] border-neutral-800 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: preset.hex,
                            boxShadow: `0 0 6px ${preset.hex}`,
                          }}
                        />
                        <span className="truncate">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Rooftop Marquee Tag */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="plot-roof-tag"
                    className="block text-xs font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    Roof Marquee Tag
                  </label>
                  <span className="text-[11px] text-neutral-500 tabular-nums">
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

          {/* TAB 2: WALLS */}
          {activeTab === "walls" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 pb-1">
                Wall Architectural Accents
              </div>
              <div className="grid grid-cols-2 gap-2">
                {WALL_ACCENT_PRESETS.map((preset) => {
                  const selected = wallAccent === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setWallAccent(preset.id)}
                      className={`min-h-[56px] p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/60"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                          {preset.description}
                        </div>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: GARDEN */}
          {activeTab === "garden" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 pb-1">
                Courtyard Landscaping
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GARDEN_STYLE_PRESETS.map((preset) => {
                  const selected = gardenStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setGardenStyle(preset.id)}
                      className={`min-h-[56px] p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/60"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                          {preset.description}
                        </div>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: VEHICLES */}
          {activeTab === "vehicles" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 pb-1">
                Driveway Vehicles &amp; Arrivals
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DRIVEWAY_VEHICLE_PRESETS.map((preset) => {
                  const selected = drivewayVehicle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDrivewayVehicle(preset.id)}
                      className={`min-h-[56px] p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/60"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                          {preset.description}
                        </div>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: LIGHTING */}
          {activeTab === "lighting" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 pb-1">
                Exterior Lighting
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LIGHTING_STYLE_PRESETS.map((preset) => {
                  const selected = lightingStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setLightingStyle(preset.id)}
                      className={`min-h-[56px] p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/60"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                          {preset.description}
                        </div>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: SIGNAGE */}
          {activeTab === "banners" && (
            <div className="space-y-2 rounded-2xl bg-[#121215] border border-neutral-800/90 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 pb-1">
                Sidewalk Signage &amp; Banners
              </div>
              <div className="grid grid-cols-2 gap-2">
                {BANNER_STYLE_PRESETS.map((preset) => {
                  const selected = bannerStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setBannerStyle(preset.id)}
                      className={`min-h-[56px] p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/60"
                          : "bg-[#09090b] border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                          {preset.description}
                        </div>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dedicated Publish Action Bar */}
          <div className="p-3 rounded-2xl bg-[#121215] border border-neutral-800/90 flex items-center justify-between gap-2 shadow-lg">
            <span className="text-[11px] text-neutral-400">
              {hasUnsavedChanges ? "Changes ready" : "Saved"}
            </span>
            <button
              type="submit"
              disabled={savingStyle || !hasUnsavedChanges}
              className="min-h-[40px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
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
