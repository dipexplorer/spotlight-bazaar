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
  ChevronRight,
  TrendingUp,
  Share2,
} from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden p-6 text-white max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-amber-400">
                @{storefront.slug || storefront.name.toLowerCase().replace(/\s+/g, "")}
              </span>
              {storefront.is_verified && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1">{storefront.name}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {storefront.city_name || "Guwahati"}, {storefront.state_name || "Assam"} • {storefront.pincode ? `PIN ${storefront.pincode}` : "North Guwahati"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Growth & Streak Card (indiaagain style) */}
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wide uppercase text-amber-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Storefront Status: Floor 1 Active
            </span>
            <p className="text-xs text-slate-300 mt-0.5">
              3 more visitor check-ins to unlock Floor 2 terrace studio.
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-amber-400 font-mono">{waveCount}</span>
            <span className="text-[10px] block text-slate-400 uppercase tracking-wider">
              Waves
            </span>
          </div>
        </div>

        {/* Founder Dialogue Box */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 relative">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 text-lg flex-shrink-0">
              🏪
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Owner Message
              </span>
              <p className="text-sm text-slate-200 leading-relaxed italic">
                &ldquo;{founderGreeting}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-4 space-y-2.5">
          {/* Wave Button */}
          <button
            onClick={handleWave}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              hasWaved
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.99]"
            }`}
          >
            {hasWaved ? (
              <>
                <Check className="w-4 h-4" />
                You waved! Owner will see this on check-in
              </>
            ) : (
              <>
                <span className="text-base">👋</span>
                Wave at Storefront ({waveCount} waves)
              </>
            )}
          </button>

          {/* WhatsApp Direct Connect */}
          {storefront.whatsapp_phone && (
            <a
              href={`https://wa.me/${storefront.whatsapp_phone.replace(/\D/g, "")}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 font-medium text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp ({storefront.whatsapp_phone})
            </a>
          )}

          {/* Official Website Link */}
          {storefront.website_url && (
            <a
              href={storefront.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 font-bold text-xs text-slate-950 flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/40"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Visit Official Website ({storefront.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")})</span>
            </a>
          )}

          {/* Full Profile & Portfolio */}
          <Link
            href={`/b/${storefront.slug}`}
            onClick={() => {
              onClose();
              if (onOpenFullProfile) {
                onOpenFullProfile(storefront);
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 font-medium text-xs text-amber-300 hover:text-amber-200 flex items-center justify-center gap-2 transition-all shadow-md group"
          >
            <span>View Full Services & Portfolio</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Microcopy note */}
        <p className="mt-4 text-center text-[11px] text-slate-400">
          They see how many people waved when they next open their storefront. Your contact is shared only if you start a WhatsApp chat.
        </p>
      </div>
    </div>
  );
}
