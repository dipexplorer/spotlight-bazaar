"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Store, MapPin, ShieldCheck, ArrowRight, MessageCircle, X } from "lucide-react";
import { BusinessStorefront } from "@/types";
import { CATEGORY_MAP } from "@/lib/constants/categories";
import { getWhatsAppUrl } from "@/lib/utils";

interface StorefrontDrawerProps {
  storefront: BusinessStorefront | null;
  onClose: () => void;
}

export function StorefrontDrawer({ storefront, onClose }: StorefrontDrawerProps) {
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
                    <MapPin className="w-3 h-3 text-rose-500" />
                    {storefront.city_name}
                  </span>
                  <span className="text-neutral-600">•</span>
                  <span className="truncate">{category?.name || "Business"}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
              aria-label="Close storefront preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tagline */}
          {storefront.tagline && (
            <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
              {storefront.tagline}
            </p>
          )}

          {/* Rate Highlight Card */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800/90">
            <span className="text-xs text-neutral-400">
              Starting Package
            </span>
            <span className="text-sm font-semibold text-amber-400 tabular-nums">
              {storefront.starting_price || "Rates on Request"}
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 pt-1">
            <Link
              href={`/b/${storefront.slug}`}
              className="flex-1 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-100 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <span>View Portfolio</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
            </Link>

            <button
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
