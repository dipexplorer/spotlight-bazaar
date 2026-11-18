"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Store,
  MapPin,
  ShieldCheck,
  ArrowRight,
  MessageCircle,
  X,
  Heart,
  Share2,
  Check,
  Globe,
  ExternalLink,
  Navigation,
} from "lucide-react";
import { BusinessStorefront } from "@/types";
import { CATEGORY_MAP } from "@/lib/constants/categories";
import {
  formatWebsiteDisplay,
  getGoogleMapsUrl,
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
      origin: { y: 0.8 },
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
      {/* Invisible backdrop to dismiss on click outside */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Floating Bottom Sheet Card */}
      <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-5 pointer-events-none pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 p-5 shadow-2xl shadow-black pointer-events-auto flex flex-col gap-4 transition-transform duration-300 ease-out">
          {/* Subtle Mobile Drag Indicator */}
          <div className="w-10 h-1 rounded-full bg-neutral-800 mx-auto -mt-1 sm:hidden" />

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 shadow-md">
                {storefront.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={storefront.logo_url}
                    alt={storefront.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <Store className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-white tracking-tight truncate">
                    {storefront.name}
                  </h3>
                  {storefront.is_verified && (
                    <span title="Verified Studio">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5 truncate">
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    {storefront.city_name}
                  </span>
                  <span className="text-neutral-600">•</span>
                  <span className="truncate">{category?.name || "Business"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Copy Shareable 3D Street Link */}
              <button
                type="button"
                onClick={handleShareLink}
                title="Copy 3D Street Link"
                className="p-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                aria-label="Share 3D Street Link"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                aria-label="Close storefront preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tagline */}
          {storefront.tagline && (
            <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
              {storefront.tagline}
            </p>
          )}

          {/* Rate & Live Wave Bar */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800/90">
            <div className="flex flex-col">
              <span className="text-[11px] text-neutral-400">Starting Rate</span>
              <span className="text-sm font-semibold text-amber-400 tabular-nums">
                {storefront.starting_price || "Rates on Request"}
              </span>
            </div>

            {/* Social Wave / Like Button */}
            <button
              type="button"
              onClick={handleWave}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                hasWaved
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : "bg-neutral-800 hover:bg-neutral-750 border-neutral-700 text-white"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  hasWaved ? "fill-rose-500 text-rose-500 animate-bounce" : "text-neutral-400"
                }`}
              />
              <span>{hasWaved ? "Waved!" : "Wave"}</span>
              <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                ({wavesCount})
              </span>
            </button>
          </div>

          {/* Official Website & Google Maps Links */}
          {(normalizeExternalUrl(storefront.website_url) || getGoogleMapsUrl(storefront)) && (
            <div className="flex flex-wrap items-center gap-2">
              {normalizeExternalUrl(storefront.website_url) && (
                <a
                  href={normalizeExternalUrl(storefront.website_url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[160px] py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-amber-950/30"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{formatWebsiteDisplay(storefront.website_url)}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}

              {getGoogleMapsUrl(storefront) && (
                <a
                  href={getGoogleMapsUrl(storefront)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[130px] py-2.5 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{storefront.google_maps_url ? "Google Maps" : "Directions"}</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0" />
                </a>
              )}
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex items-center gap-2 pt-1">
            <Link
              href={`/b/${storefront.slug}`}
              className="flex-1 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-100 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span>Full Portfolio</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
            </Link>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-950/40 focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <MessageCircle className="w-4 h-4 fill-white/20" />
              <span>Chat on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
