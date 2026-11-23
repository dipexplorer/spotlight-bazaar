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
  Globe,
  Navigation,
  ExternalLink,
  Clock,
  Copy,
  Check,
  MessageCircle,
  Compass,
  ArrowRight,
} from "lucide-react";
import { BusinessStorefront } from "@/types";
import { CATEGORY_MAP } from "@/lib/constants/categories";
import {
  BROADCAST_TYPES,
  BROADCAST_TYPE_MAP,
  buildBroadcastWhatsAppUrl,
  formatTimeRemaining,
} from "@/lib/constants/broadcasts";
import { getLocalStorefront } from "@/lib/utils/localStorefront";
import {
  formatWebsiteDisplay,
  getGoogleMapsUrl,
  normalizeExternalUrl,
} from "@/lib/utils";
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
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
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
      <header className="sticky top-0 z-20 bg-[#09090b]/92 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href={`/?city=${storefront.city_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}&shop=${storefront.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition-colors truncate min-w-0"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="truncate">Back to <strong className="text-white font-semibold">{storefront.city_name} Street</strong></span>
          </Link>

          <Link
            href={`/?city=${storefront.city_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}&shop=${storefront.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm shrink-0 active:scale-95"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>View on 3D Map</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto p-4 sm:p-6 flex flex-col gap-6 sm:gap-8">
        {/* Hero Header Section */}
        <section className="flex flex-col gap-3.5 pt-1">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500/25 via-neutral-900 to-black p-0.5 shadow-[0_0_24px_rgba(245,158,11,0.2)] shrink-0 overflow-hidden flex items-center justify-center">
              {storefront.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storefront.logo_url === "/mascot.jpg" ? "/mascot-avatar.png" : storefront.logo_url}
                  alt={storefront.name}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-amber-400">
                  <Store className="w-7 h-7" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
                  {storefront.name}
                </h1>
                {storefront.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400 shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified Studio</span>
                  </span>
                )}
              </div>

              {storefront.tagline && (
                <p className="text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed mt-1">
                  {storefront.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Badges / Micro Channels in a clean horizontal wrap */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111116] border border-white/10 text-neutral-200">
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="font-semibold">{storefront.city_name}</span>
              {storefront.pincode && <span className="text-neutral-400 font-mono text-[11px]">({storefront.pincode})</span>}
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-[#111116] border border-white/10 text-neutral-300 font-medium">
              {category?.name || "Business"}
            </span>

            {storefront.instagram_handle && (
              <a
                href={`https://instagram.com/${storefront.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111116] border border-white/10 hover:border-pink-500/40 text-neutral-300 hover:text-white transition-colors"
              >
                <InstagramIcon className="w-3 h-3 text-pink-400" />
                <span>@{storefront.instagram_handle}</span>
              </a>
            )}

            {normalizeExternalUrl(storefront.website_url) && (
              <a
                href={normalizeExternalUrl(storefront.website_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/12 border border-amber-500/35 hover:bg-amber-500/20 text-amber-300 transition-colors"
              >
                <Globe className="w-3 h-3 text-amber-400" />
                <span>{formatWebsiteDisplay(storefront.website_url)}</span>
                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
              </a>
            )}

            {getGoogleMapsUrl(storefront) && (
              <a
                href={getGoogleMapsUrl(storefront)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-300 transition-colors"
              >
                <Navigation className="w-3 h-3 text-sky-400" />
                <span>Directions</span>
                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
              </a>
            )}
          </div>
        </section>

        {/* Active Live Street Broadcasts */}
        {(() => {
          const livePosts = (storefront.active_posts || []).filter(
            (p) => new Date(p.expires_at).getTime() > Date.now()
          );
          if (livePosts.length === 0) return null;
          return (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Live Broadcasts ({livePosts.length})
              </h2>
              <div className="space-y-3">
                {livePosts.map((p) => {
                  const meta = BROADCAST_TYPE_MAP.get(p.post_type) || BROADCAST_TYPES[0];
                  const waUrl = buildBroadcastWhatsAppUrl({
                    phone: storefront.whatsapp_phone,
                    businessName: storefront.name,
                    postType: p.post_type,
                    title: p.title,
                    couponCode: p.coupon_code,
                  });
                  return (
                    <div
                      key={p.id}
                      className={`p-4 sm:p-5 rounded-2xl border ${meta.badgeBg} ${meta.badgeBorder} space-y-2.5`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${meta.badgeText}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                          {meta.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-300 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTimeRemaining(p.expires_at)}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{p.title}</h3>
                      {p.details && (
                        <p className="text-xs text-neutral-200 leading-relaxed">{p.details}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {p.coupon_code && (
                          <button
                            type="button"
                            onClick={() => {
                              fetch(`/api/posts/${p.id}/click`, { method: "POST", keepalive: true }).catch(() => {});
                              navigator.clipboard?.writeText(p.coupon_code!);
                              setCopiedPostId(p.id);
                              setTimeout(() => setCopiedPostId(null), 2200);
                            }}
                            className="min-h-[38px] px-3 rounded-xl bg-black/50 hover:bg-black/70 border border-emerald-400/40 text-xs font-mono font-bold text-emerald-200 inline-flex items-center gap-1.5 transition-colors"
                          >
                            <span>CODE: {p.coupon_code}</span>
                            {copiedPostId === p.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            fetch(`/api/posts/${p.id}/click`, { method: "POST", keepalive: true }).catch(() => {});
                          }}
                          className="min-h-[38px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{meta.defaultCta}</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Rate Card & Discovery Activity: Side-by-side on mobile! */}
        <section className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {/* Starting Rate Card */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-[#0c0c10] border border-white/10 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Starting Package
            </span>
            <div className="my-1.5">
              <span className="text-sm sm:text-2xl font-bold text-amber-400 tabular-nums leading-snug">
                {storefront.starting_price || "Rates on Request"}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-neutral-400 line-clamp-1">
              Zero middleman commissions
            </p>
          </div>

          {/* Social Discovery Proof */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-[#0c0c10] border border-white/10 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Activity &amp; Discovery
            </span>
            <div className="my-1.5 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-sm sm:text-2xl font-bold text-white tabular-nums leading-snug">
                {storefront.total_views || 1}
              </span>
              <span className="text-[10px] sm:text-xs text-neutral-400 truncate">views</span>
            </div>
            <p className="text-[10px] sm:text-xs text-neutral-400 line-clamp-1">
              Direct owner inquiries
            </p>
          </div>
        </section>

        {/* Immersive 3D Street Location Banner */}
        <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0c0c10] via-[#121218] to-amber-950/20 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                Located on {storefront.city_name} 3D High Street
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5 line-clamp-1">
                Explore surrounding shops and walkable spatial architecture.
              </p>
            </div>
          </div>
          <Link
            href={`/?city=${storefront.city_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}&shop=${storefront.slug}`}
            className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
          >
            <span>Fly to 3D Plot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* About Business Section */}
        {storefront.description && (
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">
              About the Business
            </h2>
            <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line p-4 sm:p-5 rounded-2xl bg-[#0c0c10] border border-white/10 shadow-sm">
              {storefront.description}
            </p>
          </section>
        )}

        {/* Portfolio Showcase Gallery */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">
              Selected Work ({storefront.portfolio?.length || 0})
            </h2>
            <span className="text-[11px] text-neutral-400">Tap to enlarge</span>
          </div>

          <PortfolioLightbox
            portfolio={storefront.portfolio || []}
            businessName={storefront.name}
          />
        </section>

        {/* Trust Guarantee Banner */}
        <section className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 text-xs text-neutral-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-emerald-300">Direct Client Guarantee</span>
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
