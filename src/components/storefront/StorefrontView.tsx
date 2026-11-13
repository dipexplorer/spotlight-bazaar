"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Store,
  MapPin,
  ShieldCheck,
  Eye,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { BusinessStorefront } from "@/types";
import { CATEGORY_MAP } from "@/lib/constants/categories";
import { getLocalStorefront } from "@/lib/utils/localStorefront";
import { PortfolioLightbox } from "@/components/storefront/PortfolioLightbox";
import { WhatsAppStickyCTA } from "@/components/storefront/WhatsAppStickyCTA";

function InstagramIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface StorefrontViewProps {
  initialStorefront: BusinessStorefront | null;
  slug: string;
}

export function StorefrontView({ initialStorefront, slug }: StorefrontViewProps) {
  const [storefront, setStorefront] = useState<BusinessStorefront | null>(initialStorefront);
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";

  // Check client localStorage fallback if not found in server seed/DB
  useEffect(() => {
    if (!storefront) {
      const local = getLocalStorefront();
      if (local && local.slug === slug) {
        setStorefront(local);
      }
    }
  }, [storefront, slug]);

  if (!storefront) {
    return (
      <main className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 text-neutral-500">
          <Store className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Storefront Not Found</h1>
        <p className="text-xs text-neutral-400 max-w-sm mb-6">
          This business may not have claimed a storefront yet, or the link may be outdated.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-xs font-medium text-white transition-colors"
        >
          Explore All Businesses on Map
        </Link>
      </main>
    );
  }

  const category = CATEGORY_MAP.get(storefront.category_id);

  return (
    <main className="min-h-screen bg-[#09090b] text-neutral-100 pb-36">
      {/* Newly Claimed Celebration Alert */}
      {isNew && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-center">
          <p className="text-xs text-amber-300 font-medium flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Congratulations! Your storefront is officially live on the map.</span>
          </p>
        </div>
      )}

      {/* Top Navigation */}
      <header className="max-w-3xl mx-auto p-4 flex items-center justify-between border-b border-neutral-850">
        <Link
          href={`/?city=${storefront.city_name.toLowerCase()}&shop=${storefront.slug}`}
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {storefront.city_name} 3D Street</span>
        </Link>

        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/mascot.jpg"
            alt="Spotlight"
            className="w-5 h-5 rounded-md object-cover border border-neutral-700"
          />
          <span className="text-xs text-neutral-400 font-mono">
            {storefront.city_name} High Street
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-8">
        {/* Hero Header Section */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-4">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 shadow-xl shadow-black/80">
            {storefront.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storefront.logo_url}
                alt={storefront.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <Store className="w-8 h-8" />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {storefront.name}
              </h1>
              {storefront.is_verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-medium text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Studio</span>
                </span>
              )}
            </div>

            {storefront.tagline && (
              <p className="text-sm text-neutral-300 font-normal leading-relaxed">
                {storefront.tagline}
              </p>
            )}

            {/* Badges / Metadata */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-neutral-300">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{storefront.city_name}</span>
                {storefront.pincode && <span className="text-neutral-400 font-mono">({storefront.pincode})</span>}
              </span>

              <span className="px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300">
                {category?.name || "Business"}
              </span>

              {storefront.instagram_handle && (
                <a
                  href={`https://instagram.com/${storefront.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors"
                >
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                  <span>@{storefront.instagram_handle}</span>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Rate Card & Discovery Activity */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Starting Rate Card */}
          <div className="p-5 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between shadow-lg">
            <span className="text-xs text-neutral-400">
              Starting Package
            </span>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400 tabular-nums">
                {storefront.starting_price || "Rates on Request"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Transparent rate tier. Direct client booking with zero middleman commissions.
            </p>
          </div>

          {/* Social Discovery Proof */}
          <div className="p-5 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between shadow-lg">
            <span className="text-xs text-neutral-400">
              Activity & Discovery
            </span>
            <div className="my-2 flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-bold text-white tabular-nums">
                {storefront.total_views || 1}
              </span>
              <span className="text-xs text-neutral-400">clients viewed this month</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Inquiries are routed directly to the business owner on WhatsApp.
            </p>
          </div>
        </section>

        {/* About Business Section */}
        {storefront.description && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              About the Business
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line p-5 rounded-3xl bg-neutral-950 border border-neutral-800 shadow-md">
              {storefront.description}
            </p>
          </section>
        )}

        {/* Portfolio Showcase Gallery */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Selected Work ({storefront.portfolio?.length || 0})
            </h2>
            <span className="text-xs text-neutral-400">Tap to enlarge</span>
          </div>

          <PortfolioLightbox
            portfolio={storefront.portfolio || []}
            businessName={storefront.name}
          />
        </section>

        {/* Trust Guarantee Banner */}
        <section className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3 text-xs text-neutral-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-emerald-300">Direct Client Guarantee</span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              When you message this business, your inquiry is sent directly and exclusively to their official WhatsApp. We never sell your contact info to call centers or competitors.
            </p>
          </div>
        </section>
      </div>

      {/* Sticky Bottom Action Bar */}
      <WhatsAppStickyCTA
        storefrontId={storefront.id}
        businessName={storefront.name}
        whatsappPhone={storefront.whatsapp_phone}
        startingPrice={storefront.starting_price}
        slug={storefront.slug}
      />
    </main>
  );
}
