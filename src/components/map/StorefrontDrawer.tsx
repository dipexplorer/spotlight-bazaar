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
  Heart,
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
      particleCount: 35,
      spread: 55,
      origin: { y: 0.75 },
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
        SPATIAL BUSINESS INSPECTOR (Zero full-screen blur, 100% visible crystal-clear 3D world).
        On Desktop (sm+): Elegantly docked to the top-left below the navbar, leaving the center 3D camera, buildings, and streets completely open.
        On Mobile: Elegantly anchored to the bottom with safe-area spacing without whole-screen obscuration.
      */}
      <aside
        aria-label={`Storefront dossier for ${storefront.name}`}
        className="fixed z-30 pointer-events-auto transition-all duration-300 ease-out
          inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:top-20 sm:left-5 sm:w-[390px]
          max-h-[80vh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar"
      >
        <div className="w-full rounded-3xl bg-neutral-950/80 hover:bg-neutral-950/90 backdrop-blur-2xl backdrop-saturate-150 p-4 sm:p-5 shadow-[0_24px_60px_rgba(0,0,0,0.65)] flex flex-col gap-3.5 transition-all">
          {/* Header Row: Illuminated Medallion + Brand Soul + Action Controls */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Illuminated 3D Logo / Storefront Medallion */}
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/25 via-neutral-900/90 to-black p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0 overflow-hidden flex items-center justify-center mt-0.5">
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
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {storefront.name}
                  </h3>
                  {storefront.is_verified && (
                    <span title="Verified Business Studio" className="inline-flex items-center">
                      <ShieldCheck className="w-4 h-4 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] shrink-0" />
                    </span>
                  )}
                  {storefront.is_featured && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold shrink-0">
                      Featured
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-300 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 shrink-0 text-amber-300/90 font-medium">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    {storefront.city_name}
                  </span>
                  <span className="text-neutral-500">•</span>
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
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-neutral-300 hover:text-white flex items-center justify-center transition-all"
                aria-label="Share 3D Street Link"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-neutral-300 hover:text-white flex items-center justify-center transition-all"
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

          {/* Active Live Broadcast Banner (Deals, Coupons, Urgent Services, Hiring, Events) */}
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
              <div className={`p-3 rounded-2xl ${bMeta.badgeBg} space-y-2 backdrop-blur-md`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${bMeta.badgeText}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${bMeta.dotColor}`} />
                    {bMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-neutral-300 tabular-nums">
                    <Clock className="w-3 h-3" />
                    {formatTimeRemaining(activePost.expires_at)}
                  </span>
                </div>
                <div className="text-xs font-bold text-white leading-snug">{activePost.title}</div>
                {activePost.details && (
                  <p className="text-[11px] text-neutral-200/90 leading-relaxed">{activePost.details}</p>
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
                      className="px-2.5 py-1.5 rounded-lg bg-black/45 hover:bg-black/65 text-[11px] font-mono font-bold text-emerald-300 inline-flex items-center gap-1.5 transition-colors"
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
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white inline-flex items-center gap-1 transition-colors"
                  >
                    <span>{bMeta.defaultCta}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Rate & Live Wave Bar — Pure Seamless Frosted Pill */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.04] backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Starting Rate</span>
              <span className="text-sm font-extrabold text-amber-400 tabular-nums drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]">
                {storefront.starting_price || "Rates on Request"}
              </span>
            </div>

            {/* Social Wave / Like Button (Exponential ease scale micro-interaction, zero tacky bounce) */}
            <button
              type="button"
              onClick={handleWave}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 duration-200 ${
                hasWaved
                  ? "bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  : "bg-white/[0.08] hover:bg-white/[0.15] text-white"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  hasWaved ? "fill-rose-400 text-rose-400" : "text-neutral-300"
                }`}
              />
              <span>{hasWaved ? "Waved!" : "Wave"}</span>
              <span className="text-[11px] font-mono text-neutral-300 tabular-nums">
                ({wavesCount})
              </span>
            </button>
          </div>

          {/* Direct Verified Business Channels — Symmetrical, Responsive Grid */}
          {(normalizeExternalUrl(storefront.website_url) ||
            getInstagramUrl(storefront.instagram_handle) ||
            getGoogleMapsUrl(storefront)) && (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {normalizeExternalUrl(storefront.website_url) ? (
                <a
                  href={normalizeExternalUrl(storefront.website_url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Visit ${formatWebsiteDisplay(storefront.website_url)}`}
                  className="py-2 px-1.5 sm:px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 font-semibold text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-colors shadow-sm min-w-0"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Website</span>
                  <ExternalLink className="w-3 h-3 text-amber-400/80 shrink-0 hidden xs:inline" />
                </a>
              ) : <div />}

              {getInstagramUrl(storefront.instagram_handle) ? (
                <a
                  href={getInstagramUrl(storefront.instagram_handle)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow on Instagram"
                  className="py-2 px-1.5 sm:px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 font-medium text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-colors min-w-0"
                >
                  <InstagramIcon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate sm:inline hidden">Instagram</span>
                  <span className="truncate sm:hidden inline">Insta</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0 hidden xs:inline" />
                </a>
              ) : <div />}

              {getGoogleMapsUrl(storefront) ? (
                <a
                  href={getGoogleMapsUrl(storefront)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Get Directions on Google Maps"
                  className="py-2 px-1.5 sm:px-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-sky-200 font-medium text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-colors min-w-0"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate sm:inline hidden">Directions</span>
                  <span className="truncate sm:hidden inline">Maps</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0 hidden xs:inline" />
                </a>
              ) : <div />}
            </div>
          )}

          {/* Portfolio Showcase Mini-Strip */}
          {storefront.portfolio && storefront.portfolio.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-0.5">
                <span className="font-medium text-neutral-300">Selected Work</span>
                <Link
                  href={`/b/${storefront.slug}`}
                  className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
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
                    className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-white/5 hover:border-amber-500/40 transition-colors group"
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

          {/* Primary High-Conversion Dual CTAs: Full Showroom + WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <Link
              href={`/b/${storefront.slug}`}
              className="h-11 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.99] text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all shadow-sm border border-white/5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Full Showroom &amp; Work</span>
              <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0" />
            </Link>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-11 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition-all focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <MessageCircle className="w-4 h-4 fill-white/25 shrink-0" />
              <span>Chat on WhatsApp</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
