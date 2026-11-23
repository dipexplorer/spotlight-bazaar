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
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 bg-neutral-950/95 backdrop-blur-2xl border-t border-neutral-800 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        {/* Left Info: Starting Price */}
        <div className="hidden sm:flex flex-col">
          <span className="text-xs text-neutral-400">
            Starting Package
          </span>
          <span className="text-base font-bold text-amber-400 tabular-nums">
            {startingPrice || "Rates on Request"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleShare}
            className="p-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] border border-neutral-800 text-neutral-300 hover:text-white transition-all focus-visible:ring-2 focus-visible:ring-amber-500"
            title="Share storefront"
            aria-label="Share storefront link"
          >
            {copied ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={handleWhatsAppClick}
            className="flex-1 sm:flex-none sm:px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-950/50 focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <MessageCircle className="w-5 h-5 fill-white/20" />
            <span>Chat on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
