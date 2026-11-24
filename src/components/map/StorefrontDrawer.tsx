"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Store,
  MapPin,
  ShieldCheck,
  MessageCircle,
  X,
  Share2,
  Check,
  Globe,
  ExternalLink,
  Navigation,
  Copy,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

function InstagramIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

import { BusinessStorefront } from "@/types";
import { CATEGORY_MAP } from "@/lib/constants/categories";
import {
  BROADCAST_TYPES,
  BROADCAST_TYPE_MAP,
  buildBroadcastWhatsAppUrl,
  formatTimeRemaining,
} from "@/lib/constants/broadcasts";
import {
  formatWebsiteDisplay,
  getGoogleMapsUrl,
  getInstagramUrl,
  getWhatsAppUrl,
  normalizeExternalUrl,
} from "@/lib/utils";

interface StorefrontDrawerProps {
  storefront: BusinessStorefront | null;
  onClose: () => void;
}

export function StorefrontDrawer({ storefront, onClose }: StorefrontDrawerProps) {
  const [wavesCount, setWavesCount] = useState<number>(0);
  const [hasWaved, setHasWaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  // Sync waves count on storefront change
  useEffect(() => {
    if (storefront) {
      setWavesCount(storefront.total_views || 1);
      setHasWaved(false);
      setCopiedLink(false);
    }
  }, [storefront]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!storefront) return null;

  const category = CATEGORY_MAP.get(storefront.category_id);

  const handleWhatsApp = () => {
    try {
      fetch("/api/analytics/lead-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storefront_id: storefront.id }),
        keepalive: true,
      });
    } catch {
      // Ignore beacon failures
    }
    const url = getWhatsAppUrl(storefront.whatsapp_phone, storefront.name);
    window.open(url, "_blank");
  };

  const handleWave = () => {
    if (hasWaved) return;
    setHasWaved(true);
    setWavesCount((prev) => prev + 1);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });

    try {
      fetch("/api/analytics/lead-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storefront_id: storefront.id,
          event_type: "wave",
        }),
        keepalive: true,
      });
    } catch {
      // Ignore
    }
  };

  const handleShareLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const citySlug = storefront.city_name ? storefront.city_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "all";
    const shareUrl = `${origin}/?city=${citySlug}&shop=${storefront.slug}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <>
      {/* 
        SPATIAL BUSINESS DOSSIER (Pure Obsidian Glass HUD · Zero Full-Screen Blur · 100% Interactive 3D World)
        - Desktop: Elegantly docked at top-left below the omnibar, keeping center 3D camera & street fully visible.
        - Mobile: Floating tactile bottom sheet with clear drag handle and safe-area geometry.
      */}
      <aside
        aria-label={`Storefront dossier for ${storefront.name}`}
        className="fixed z-30 pointer-events-auto transition-all duration-300 ease-out
          inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:top-20 sm:left-5 sm:w-[400px]
          max-h-[82vh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar"
      >
        <div className="w-full rounded-3xl bg-[#0a0c10]/94 hover:bg-[#0a0c10]/98 backdrop-blur-2xl backdrop-saturate-150 p-4 sm:p-5 border border-white/10 border-t-white/20 shadow-[0_30px_70px_rgba(0,0,0,0.85),0_0_1px_rgba(255,255,255,0.15)_inset] flex flex-col gap-3.5 transition-all">
          {/* Mobile Sheet Visual Indicator */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 sm:hidden shrink-0" aria-hidden="true" />

          {/* Header Row: Hallmark Medallion + Brand Identity + Action Controls */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Architectural Medallion Logo */}
              <div className="relative w-12 h-12 rounded-2xl bg-neutral-900 border border-white/10 p-0.5 shadow-lg shrink-0 overflow-hidden flex items-center justify-center mt-0.5">
                {storefront.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={storefront.logo_url === "/mascot.jpg" ? "/mascot-avatar.png" : storefront.logo_url}
                    alt={storefront.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-400">
                    <Store className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                    {storefront.name}
                  </h3>
                  {storefront.is_verified && (
                    <span title="Verified 3D Storefront" className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-400/90 bg-amber-400/10 px-1.5 py-0.5 rounded-md border border-amber-400/25 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Verified</span>
                    </span>
                  )}
                  {storefront.is_featured && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-neutral-300 font-semibold shrink-0">
                      Featured
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 shrink-0 text-amber-300/90 font-medium">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    {storefront.city_name}
                  </span>
                  <span className="text-neutral-600">·</span>
                  <span className="text-neutral-300 font-medium">{category?.name || "Open Business"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              {/* Copy Shareable 3D Street Link */}
              <button
                type="button"
                onClick={handleShareLink}
                title="Copy 3D Street Link"
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
                aria-label="Share 3D Street Link"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
                aria-label="Close storefront inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tagline / Business Focus */}
          {storefront.tagline && (
            <p className="text-xs text-neutral-300/90 leading-relaxed font-normal">
              {storefront.tagline}
            </p>
          )}

          {/* Active Live Broadcast Banner (Deals, Announcements, Urgent Bookings) */}
          {(() => {
            const activePost = (storefront.active_posts || []).find(
              (p) => new Date(p.expires_at).getTime() > Date.now()
            );
            if (!activePost) return null;
            const bMeta = BROADCAST_TYPE_MAP.get(activePost.post_type) || BROADCAST_TYPES[0];
            const postWaUrl = buildBroadcastWhatsAppUrl({
              phone: storefront.whatsapp_phone,
              businessName: storefront.name,
              postType: activePost.post_type,
              title: activePost.title,
              couponCode: activePost.coupon_code,
            });
            return (
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 backdrop-blur-md">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider ${bMeta.badgeText}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${bMeta.dotColor}`} />
                    {bMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 font-mono tabular-nums">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    {formatTimeRemaining(activePost.expires_at)}
                  </span>
                </div>
                <div className="text-xs font-bold text-white leading-snug">{activePost.title}</div>
                {activePost.details && (
                  <p className="text-[11px] text-neutral-300 leading-relaxed">{activePost.details}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {activePost.coupon_code && (
                    <button
                      type="button"
                      onClick={() => {
                        fetch(`/api/posts/${activePost.id}/click`, { method: "POST", keepalive: true }).catch(() => {});
                        navigator.clipboard?.writeText(activePost.coupon_code!);
                        setCopiedCoupon(true);
                        setTimeout(() => setCopiedCoupon(false), 2200);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 text-[11px] font-mono font-bold text-emerald-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>{activePost.coupon_code}</span>
                      {copiedCoupon ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                  <a
                    href={postWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      fetch(`/api/posts/${activePost.id}/click`, { method: "POST", keepalive: true }).catch(() => {});
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-[11px] font-semibold text-white inline-flex items-center gap-1 transition-colors"
                  >
                    <span>{bMeta.defaultCta}</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Rate & Live Wave Instrument — Unified Obsidian Card */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block mb-0.5">Starting Rate</span>
              <span className="text-sm font-bold font-mono text-amber-300 tabular-nums">
                {storefront.starting_price || "Custom Quote"}
              </span>
            </div>

            {/* Social Wave Micro-Interaction */}
            <button
              type="button"
              onClick={handleWave}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 duration-200 ${
                hasWaved
                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-200 hover:text-white"
              }`}
            >
              <span>{hasWaved ? "✨ Waved!" : "👋 Wave"}</span>
              <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                ({wavesCount})
              </span>
            </button>
          </div>

          {/* Direct Verified Business Channels — Disciplined Obsidian Trio (No Rainbow Pills) */}
          {(normalizeExternalUrl(storefront.website_url) ||
            getInstagramUrl(storefront.instagram_handle) ||
            getGoogleMapsUrl(storefront)) && (
            <div className="grid grid-cols-3 gap-2">
              {normalizeExternalUrl(storefront.website_url) ? (
                <a
                  href={normalizeExternalUrl(storefront.website_url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Visit ${formatWebsiteDisplay(storefront.website_url)}`}
                  className="py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/[0.08] hover:border-white/20 text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all group min-w-0"
                >
                  <Globe className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-400 shrink-0 transition-colors" />
                  <span className="truncate">Website</span>
                  <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 shrink-0 hidden xs:inline transition-colors" />
                </a>
              ) : <div />}

              {getInstagramUrl(storefront.instagram_handle) ? (
                <a
                  href={getInstagramUrl(storefront.instagram_handle)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow on Instagram"
                  className="py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/[0.08] hover:border-white/20 text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all group min-w-0"
                >
                  <InstagramIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-rose-400 shrink-0 transition-colors" />
                  <span className="truncate sm:inline hidden">Instagram</span>
                  <span className="truncate sm:hidden inline">Insta</span>
                  <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 shrink-0 hidden xs:inline transition-colors" />
                </a>
              ) : <div />}

              {getGoogleMapsUrl(storefront) ? (
                <a
                  href={getGoogleMapsUrl(storefront)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Get Directions on Google Maps"
                  className="py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/[0.08] hover:border-white/20 text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all group min-w-0"
                >
                  <Navigation className="w-3.5 h-3.5 text-neutral-400 group-hover:text-sky-400 shrink-0 transition-colors" />
                  <span className="truncate sm:inline hidden">Directions</span>
                  <span className="truncate sm:hidden inline">Maps</span>
                  <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 shrink-0 hidden xs:inline transition-colors" />
                </a>
              ) : <div />}
            </div>
          )}

          {/* Portfolio Showcase Mini-Strip */}
          {storefront.portfolio && storefront.portfolio.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px] px-0.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Selected Work</span>
                <Link
                  href={`/b/${storefront.slug}`}
                  className="text-amber-400 hover:text-amber-300 font-medium text-xs flex items-center gap-1 transition-colors"
                >
                  <span>All {storefront.portfolio.length} Projects</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {storefront.portfolio.slice(0, 3).map((item, idx) => (
                  <Link
                    key={item.id || idx}
                    href={`/b/${storefront.slug}`}
                    className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-white/10 hover:border-amber-400/50 transition-colors group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.caption || "Portfolio preview"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Primary Dual CTAs: Full Showroom & WhatsApp Inquiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <Link
              href={`/b/${storefront.slug}`}
              className="h-11 sm:h-12 px-4 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] active:scale-[0.98] border border-white/10 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Enter Showroom</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            </Link>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-11 sm:h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <MessageCircle className="w-4 h-4 fill-white/20 shrink-0" />
              <span>Inquire on WhatsApp</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
