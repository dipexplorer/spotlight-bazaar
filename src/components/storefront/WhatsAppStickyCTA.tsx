"use client";

import React, { useState } from "react";
import { MessageCircle, Share2, Check } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/utils";

interface WhatsAppStickyCTAProps {
  storefrontId: string;
  businessName: string;
  whatsappPhone: string;
  startingPrice?: string;
  slug: string;
}

export function WhatsAppStickyCTA({
  storefrontId,
  businessName,
  whatsappPhone,
  startingPrice,
  slug,
}: WhatsAppStickyCTAProps) {
  const [copied, setCopied] = useState(false);

  const handleWhatsAppClick = () => {
    try {
      fetch("/api/analytics/lead-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storefront_id: storefrontId }),
        keepalive: true,
      });
    } catch {
      // Ignore
    }

    const url = getWhatsAppUrl(whatsappPhone, businessName);
    window.open(url, "_blank");
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/b/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} on Spotlight Bazaar`,
          text: `Check out ${businessName} on India's 3D Business Map:`,
          url,
        });
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-3.5 py-2.5 sm:px-6 sm:py-3.5 bg-[#09090c]/95 backdrop-blur-2xl border-t border-white/[0.08] pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(0,0,0,0.85)]">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        {/* Left Info: Starting Price (Visible on both mobile & desktop) */}
        <div className="flex flex-col min-w-0 shrink-0">
          <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
            Starting Rate
          </span>
          <span className="text-xs sm:text-base font-bold text-amber-400 tabular-nums truncate max-w-[150px] sm:max-w-none">
            {startingPrice || "On Request"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-xl bg-[#141419] hover:bg-[#1d1d25] active:scale-95 border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Share storefront"
            aria-label="Share storefront link"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleWhatsAppClick}
            className="flex-1 sm:flex-initial sm:px-7 h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <MessageCircle className="w-4 h-4 fill-white/20 shrink-0" />
            <span className="truncate">Chat on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
