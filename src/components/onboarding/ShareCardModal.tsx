"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { Store, MapPin, Share2, ArrowRight, X, Sparkles, CheckCircle2 } from "lucide-react";
import { BusinessStorefront } from "@/types";
import { CATEGORY_MAP } from "@/lib/constants/categories";

interface ShareCardModalProps {
  storefront: BusinessStorefront;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareCardModal({ storefront, isOpen, onClose }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const category = CATEGORY_MAP.get(storefront.category_id);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/b/${storefront.slug}`
    : `https://spotlight.nerqiva.com/b/${storefront.slug}`;

  const handleWhatsAppShare = () => {
    const text = `🎉 We just claimed our official digital storefront on Spotlight Bazaar! Check out our portfolio & rates here: ${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-neutral-950 border border-neutral-800 p-6 flex flex-col items-center shadow-2xl shadow-rose-950/20">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Header */}
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Storefront Claimed!</h2>
        <p className="text-xs text-neutral-400 text-center mb-5">
          Your digital storefront is officially live on India&apos;s open business map.
        </p>

        {/* 9:16 Instagram Story Preview Card */}
        <div
          ref={cardRef}
          className="w-full aspect-[9/14] rounded-2xl bg-neutral-900 border border-rose-500/30 p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-rose-600/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Card Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-medium text-rose-400">
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>OFFICIAL STOREFRONT</span>
            </div>
            <span className="text-[10px] font-medium tracking-wider uppercase text-neutral-400">
              SPOTLIGHT
            </span>
          </div>

          {/* Card Middle: Business Name & Details */}
          <div className="my-auto py-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mb-3 overflow-hidden shadow-md">
              {storefront.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storefront.logo_url}
                  alt={storefront.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-6 h-6 text-neutral-400" />
              )}
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight leading-snug mb-1">
              {storefront.name}
            </h3>

            {storefront.tagline && (
              <p className="text-xs text-neutral-300 line-clamp-2 mb-3 leading-relaxed">
                {storefront.tagline}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-300">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800">
                <MapPin className="w-3 h-3 text-rose-400" />
                {storefront.city_name}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800">
                {category?.name || "Business"}
              </span>
              {storefront.starting_price && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium tabular-nums">
                  {storefront.starting_price}
                </span>
              )}
            </div>
          </div>

          {/* Card Bottom: Branding Footer */}
          <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400 font-mono tracking-wider">
            <span>spotlight.nerqiva.com</span>
            <span className="text-neutral-300 font-sans">by @nq_insta</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="w-full flex flex-col gap-2 mt-5">
          <Link
            href={`/b/${storefront.slug}?new=true`}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-950/40"
          >
            <span>View My Live Storefront</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={handleWhatsAppShare}
            className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] border border-neutral-800 text-neutral-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Share on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
