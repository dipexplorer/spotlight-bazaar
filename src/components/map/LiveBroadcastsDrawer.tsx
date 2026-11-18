"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Calendar,
  Check,
  Clock,
  Code2,
  Copy,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  Radio,
  Tag,
  X,
} from "lucide-react";
import { BroadcastType, BusinessPost, BusinessStorefront } from "@/types";
import {
  BROADCAST_TYPES,
  BROADCAST_TYPE_MAP,
  buildBroadcastWhatsAppUrl,
  formatTimeRemaining,
} from "@/lib/constants/broadcasts";

const FILTER_ICONS: Record<BroadcastType, React.ComponentType<{ className?: string }>> = {
  deal: Tag,
  need: Code2,
  hiring: Briefcase,
  event: Calendar,
};

export interface LiveBroadcastEntry {
  post: BusinessPost;
  storefront: BusinessStorefront;
}

interface LiveBroadcastsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LiveBroadcastEntry[];
  onFlyToStorefront: (storefront: BusinessStorefront) => void;
}

export function LiveBroadcastsDrawer({
  isOpen,
  onClose,
  entries,
  onFlyToStorefront,
}: LiveBroadcastsDrawerProps) {
  const [filter, setFilter] = useState<"all" | BroadcastType>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => e.post.post_type === filter);
  }, [entries, filter]);

  if (!isOpen) return null;

  const trackClick = (postId: string) => {
    try {
      fetch(`/api/posts/${postId}/click`, { method: "POST", keepalive: true });
    } catch {
      // Non-blocking
    }
  };

  const handleCopyCoupon = (postId: string, code: string) => {
    trackClick(postId);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedId(postId);
      setTimeout(() => setCopiedId((curr) => (curr === postId ? null : curr)), 2200);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs"
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Live street broadcasts across India"
        className="fixed z-50 inset-x-0 bottom-0 sm:inset-y-0 sm:left-auto sm:right-0 w-full sm:max-w-md max-h-[82dvh] sm:max-h-none bg-[#09090b] border-t sm:border-t-0 sm:border-l border-neutral-800 rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3.5 border-b border-neutral-800/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/12 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                Live Street Broadcasts
              </h2>
              <p className="text-[11px] text-neutral-400 tabular-nums">
                {entries.length} active across India · Auto-expiring
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close live broadcasts"
            className="w-9 h-9 rounded-full bg-[#121215] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="px-5 py-3 border-b border-neutral-800/70 flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`min-h-[32px] px-2.5 rounded-full text-[11px] font-semibold border transition-colors ${
              filter === "all"
                ? "bg-amber-500 text-neutral-950 border-amber-500"
                : "bg-[#121215] border-neutral-800 text-neutral-300 hover:text-white"
            }`}
          >
            All ({entries.length})
          </button>
          {BROADCAST_TYPES.map((t) => {
            const Icon = FILTER_ICONS[t.id];
            const count = entries.filter((e) => e.post.post_type === t.id).length;
            const active = filter === t.id;
            const chipLabel = t.id === "event" ? "EVENT" : t.shortTag;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`min-h-[32px] px-2.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1 transition-colors ${
                  active
                    ? `${t.badgeBg} ${t.badgeBorder} ${t.badgeText}`
                    : "bg-[#121215] border-neutral-800 text-neutral-300 hover:text-white"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{chipLabel}</span>
                <span className="opacity-75 tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Broadcast List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="mx-auto w-11 h-11 rounded-2xl bg-[#121215] border border-neutral-800 flex items-center justify-center text-neutral-400">
                <Radio className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  No live broadcasts in this filter yet
                </p>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
                  Business owners can post live deals, coupons, hiring alerts, or service needs from their Owner Dashboard.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post a Broadcast from Dashboard</span>
              </Link>
            </div>
          ) : (
            filtered.map(({ post, storefront }) => {
              const meta = BROADCAST_TYPE_MAP.get(post.post_type) || BROADCAST_TYPES[0];
              const waUrl = buildBroadcastWhatsAppUrl({
                phone: storefront.whatsapp_phone,
                businessName: storefront.name,
                postType: post.post_type,
                title: post.title,
                couponCode: post.coupon_code,
              });

              return (
                <article
                  key={post.id}
                  className="p-4 rounded-2xl bg-[#121215] border border-neutral-800/90 space-y-3"
                >
                  {/* Top Meta */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                      {meta.shortTag}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 tabular-nums">
                      <Clock className="w-3 h-3" />
                      {formatTimeRemaining(post.expires_at)}
                    </span>
                  </div>

                  {/* Headline & Details */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {post.title}
                    </h3>
                    {post.details && (
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {post.details}
                      </p>
                    )}
                    <div className="text-xs text-neutral-400 flex items-center gap-1.5 pt-0.5">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="font-medium text-neutral-200 truncate">
                        {storefront.name}
                      </span>
                      <span>·</span>
                      <span className="truncate">{storefront.city_name}</span>
                    </div>
                  </div>

                  {/* Optional Coupon Copy Row */}
                  {post.coupon_code && (
                    <button
                      type="button"
                      onClick={() => handleCopyCoupon(post.id, post.coupon_code!)}
                      className="w-full min-h-[38px] px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-dashed border-emerald-500/40 flex items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <span className="font-mono font-bold tracking-wider text-emerald-300">
                        CODE: {post.coupon_code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-200">
                        {copiedId === post.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </span>
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onFlyToStorefront(storefront);
                      }}
                      className="flex-1 min-h-[40px] px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-100 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5 text-amber-400" />
                      <span>Fly to 3D Plot</span>
                    </button>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackClick(post.id)}
                      className="flex-1 min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
