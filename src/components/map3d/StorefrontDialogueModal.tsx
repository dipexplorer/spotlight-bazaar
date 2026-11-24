"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BusinessStorefront } from "@/types";
import {
  X,
  MessageCircle,
  ExternalLink,
  Sparkles,
  MapPin,
  ShieldCheck,
  Check,
  ArrowRight,
  TrendingUp,
  Store,
  Navigation,
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

interface StorefrontDialogueModalProps {
  storefront: BusinessStorefront | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullProfile?: (storefront: BusinessStorefront) => void;
}

export function StorefrontDialogueModal({
  storefront,
  isOpen,
  onClose,
  onOpenFullProfile,
}: StorefrontDialogueModalProps) {
  const [hasWaved, setHasWaved] = useState(false);
  const [waveCount, setWaveCount] = useState<number>(
    storefront?.total_views ? storefront.total_views + 14 : 48
  );

  if (!isOpen || !storefront) return null;

  const handleWave = () => {
    if (!hasWaved) {
      setHasWaved(true);
      setWaveCount((prev: number) => prev + 1);
    }
  };

  const founderGreeting = `Namaste! Welcome to ${storefront.name}. We specialize in ${
    storefront.tagline || "handcrafted excellence in " + (storefront.city_name || "Guwahati")
  }. How can we help you today?`;

  const whatsappMessage = encodeURIComponent(
    `Hi ${storefront.name}! Found your 3D storefront on Spotlight Bazaar. I'd love to inquire about your services!`
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Conversation with ${storefront.name}`}
      className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Dialogue HUD Card (Zero Full-Screen Blur · Pure Obsidian Spatial Glass) */}
      <div className="relative w-full max-w-lg bg-[#0a0c10]/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/10 border-t-white/20 shadow-[0_30px_70px_rgba(0,0,0,0.85),0_0_1px_rgba(255,255,255,0.15)_inset] pointer-events-auto overflow-hidden p-5 sm:p-6 text-white max-h-[85vh] overflow-y-auto no-scrollbar">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2.5 sm:hidden shrink-0" aria-hidden="true" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-neutral-900 border border-white/10 p-0.5 shadow-md shrink-0 overflow-hidden flex items-center justify-center mt-0.5">
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
                <span className="font-mono text-xs font-semibold text-amber-400">
                  @{storefront.slug || storefront.name.toLowerCase().replace(/\s+/g, "")}
                </span>
                {storefront.is_verified && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-400/10 text-amber-400 border border-amber-400/25">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    Verified
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5 truncate">{storefront.name}</h2>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {storefront.city_name || "Guwahati"}, {storefront.state_name || "Assam"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
            aria-label="Close conversation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Storefront Activity & Wave Status */}
        <div className="mt-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-neutral-300">
              Open on 3D High Street
            </span>
          </div>
          <button
            type="button"
            onClick={handleWave}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
              hasWaved
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                : "bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-200"
            }`}
          >
            <span>{hasWaved ? "✨ Waved!" : "👋 Wave"}</span>
            <span className="text-[11px] font-mono text-neutral-400 tabular-nums">({waveCount})</span>
          </button>
        </div>

        {/* Founder Dialogue Box */}
        <div className="mt-3.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">
                Founder Message
              </span>
              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed italic">
                &ldquo;{founderGreeting}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-4 space-y-2">
          {/* WhatsApp Direct Connect */}
          {storefront.whatsapp_phone && (
            <a
              href={`https://wa.me/${storefront.whatsapp_phone.replace(/\D/g, "")}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 sm:h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] font-bold text-xs text-white flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-white/20" />
              <span>Inquire on WhatsApp ({storefront.whatsapp_phone})</span>
            </a>
          )}

          {/* Enter 3D Showroom */}
          <Link
            href={`/b/${storefront.slug}`}
            className="w-full h-11 sm:h-12 px-4 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] active:scale-[0.98] border border-white/10 font-semibold text-xs text-white flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Enter Full Digital Showroom</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          </Link>

          {/* Quick Channels Strip */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {storefront.website_url ? (
              <a
                href={storefront.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all truncate"
              >
                <span>Website</span>
                <ExternalLink className="w-3 h-3 text-neutral-500" />
              </a>
            ) : <div />}

            {storefront.instagram_handle ? (
              <a
                href={`https://instagram.com/${storefront.instagram_handle.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all truncate"
              >
                <InstagramIcon className="w-3.5 h-3.5 text-rose-400" />
                <span>Insta</span>
                <ExternalLink className="w-3 h-3 text-neutral-500" />
              </a>
            ) : <div />}

            {storefront.google_maps_url ? (
              <a
                href={storefront.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all truncate"
              >
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                <span>Maps</span>
                <ExternalLink className="w-3 h-3 text-neutral-500" />
              </a>
            ) : <div />}
          </div>
        </div>

        {/* Microcopy note */}
        <p className="mt-3.5 text-center text-[11px] text-neutral-400 font-mono">
          Direct connection · Your contact is shared only upon starting a WhatsApp inquiry.
        </p>
      </div>
    </div>
  );
}
