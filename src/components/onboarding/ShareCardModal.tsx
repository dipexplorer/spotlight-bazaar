"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  Store,
  MapPin,
  Share2,
  X,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Compass,
} from "lucide-react";
import { BusinessStorefront } from "@/types";
import { CATEGORY_MAP } from "@/lib/constants/categories";

interface ShareCardModalProps {
  storefront: BusinessStorefront;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareCardModal({ storefront, isOpen, onClose }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const category = CATEGORY_MAP.get(storefront.category_id);
  const citySlug = storefront.city_name
    ? storefront.city_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : "";
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?${citySlug ? `city=${citySlug}&` : ""}shop=${storefront.slug}`
      : `https://spotlightbazaar.com/?shop=${storefront.slug}`;

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      }
    } catch (e) {
      console.warn("Failed to copy link:", e);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `🎉 We just claimed our official 3D spatial storefront on Spotlight Bazaar! View our plot & rates here: ${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const plotCode = (storefront.slug || "deed").slice(-6).toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deed-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-sm rounded-[28px] bg-[#0a0c10]/95 backdrop-blur-2xl border border-white/10 p-5 sm:p-6 flex flex-col items-center shadow-[0_24px_64px_rgba(0,0,0,0.85)] max-h-[92dvh] overflow-y-auto">
        {/* Mobile Drag Pill */}
        <div className="w-10 h-1 rounded-full bg-white/20 mb-3 sm:hidden" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-400 hover:text-white border border-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Hallmark Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono font-semibold tracking-wider uppercase mb-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Plot Claimed &amp; Verified</span>
        </div>

        <h2
          id="deed-modal-title"
          className="text-lg sm:text-xl font-serif font-bold text-white tracking-tight text-center leading-snug"
        >
          Deed of Spatial Plot
        </h2>
        <p className="text-xs text-neutral-400 text-center mt-1 mb-4 leading-relaxed">
          Your 3D digital storefront is officially anchored to India&apos;s OpenStreetMap spatial grid.
        </p>

        {/* 9:16 Instagram Story & Architectural Deed Card */}
        <div
          ref={cardRef}
          className="w-full rounded-2xl bg-gradient-to-b from-[#13151f] via-[#0d0f15] to-[#07080b] border border-amber-400/30 p-5 flex flex-col justify-between relative overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
        >
          {/* Subtle Ambient Gold Glow */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Architectural Gold Corner Accents */}
          <div className="absolute top-2.5 left-2.5 w-2 h-2 border-t border-l border-amber-400/50 pointer-events-none" />
          <div className="absolute top-2.5 right-2.5 w-2 h-2 border-t border-r border-amber-400/50 pointer-events-none" />
          <div className="absolute bottom-2.5 left-2.5 w-2 h-2 border-b border-l border-amber-400/50 pointer-events-none" />
          <div className="absolute bottom-2.5 right-2.5 w-2 h-2 border-b border-r border-amber-400/50 pointer-events-none" />

          {/* Card Top: Hallmark Badge & Network */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] font-mono font-semibold text-amber-300 tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>DEED #{plotCode}</span>
            </div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 font-medium">
              SPOTLIGHT BAZAAR
            </span>
          </div>

          {/* Card Middle: Storefront Identity */}
          <div className="py-4">
            <div className="w-12 h-12 rounded-xl bg-[#161822] border border-amber-400/30 flex items-center justify-center mb-3 overflow-hidden shadow-inner">
              {storefront.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storefront.logo_url}
                  alt={storefront.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-6 h-6 text-amber-400/90" />
              )}
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight leading-snug mb-1">
              {storefront.name}
            </h3>

            {storefront.tagline && (
              <p className="text-xs text-neutral-300 line-clamp-2 mb-3 leading-relaxed">
                {storefront.tagline}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-300">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-neutral-200">
                <MapPin className="w-3 h-3 text-amber-400" />
                {storefront.city_name}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-neutral-300">
                {category?.name || "Boutique & Retail"}
              </span>
              {storefront.starting_price && (
                <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/25 text-amber-300 font-mono font-medium tabular-nums">
                  {storefront.starting_price}
                </span>
              )}
            </div>

            {/* GPS Spatial Anchor Stamp */}
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
              <Compass className="w-3 h-3 text-amber-400/70" />
              <span>
                {Number(storefront.lat).toFixed(4)}°N, {Number(storefront.lon).toFixed(4)}°E · OSM High Street
              </span>
            </div>
          </div>

          {/* Card Bottom: Spatial Ledger Signature */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-neutral-400 font-mono tracking-wide">
            <span>OFFICIAL 3D PLOT</span>
            <span className="text-amber-400/80 font-sans font-medium">spotlightbazaar.com</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="w-full flex flex-col gap-2 mt-5">
          {/* 1. Fly to 3D Bazaar Street (Hero Gold CTA) */}
          <Link
            href={`/?shop=${storefront.slug}&new=1`}
            className="w-full min-h-[46px] py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-105 active:scale-[0.99] text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/40"
          >
            <MapPin className="w-4 h-4 text-neutral-950" />
            <span>Fly to My 3D Plot on India Map</span>
          </Link>

          {/* 2. 1-Click Copy Storefront Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={`w-full min-h-[44px] py-2.5 rounded-xl border transition-all active:scale-[0.99] font-medium text-xs flex items-center justify-center gap-2 ${
              copied
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/30"
                : "bg-white/[0.05] hover:bg-white/[0.09] border-white/10 text-neutral-200 hover:text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">Link Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-400" />
                <span>Copy Storefront Link</span>
              </>
            )}
          </button>

          {/* 3 & 4. Dual Secondary Actions: WhatsApp & Dashboard */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 text-neutral-200 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <Link
              href="/dashboard"
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 text-neutral-200 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
