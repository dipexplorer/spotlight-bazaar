"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  Loader2,
  MousePointerClick,
  Radio,
  Tag,
  Trash2,
} from "lucide-react";
import { BroadcastType, BusinessPost } from "@/types";
import {
  BROADCAST_TYPES,
  BROADCAST_TYPE_MAP,
  formatTimeRemaining,
} from "@/lib/constants/broadcasts";

const TYPE_ICONS: Record<BroadcastType, React.ComponentType<{ className?: string }>> = {
  deal: Tag,
  need: Code2,
  hiring: Briefcase,
  event: Calendar,
};

interface BroadcastManagerProps {
  businessId: string;
  businessName: string;
  accessToken: string;
}

export function BroadcastManager({
  businessId,
  businessName,
  accessToken,
}: BroadcastManagerProps) {
  const [posts, setPosts] = useState<BusinessPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Composer State
  const [postType, setPostType] = useState<BroadcastType>("deal");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [durationDays, setDurationDays] = useState<1 | 3 | 7>(7);

  const selectedMeta = BROADCAST_TYPE_MAP.get(postType) || BROADCAST_TYPES[0];

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/dashboard/posts?business_id=${encodeURIComponent(businessId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load broadcasts.");
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load broadcasts.");
    } finally {
      setLoading(false);
    }
  }, [businessId, accessToken]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const nowMs = Date.now();
  const activePosts = posts.filter((p) => new Date(p.expires_at).getTime() > nowMs);
  const expiredPosts = posts.filter((p) => new Date(p.expires_at).getTime() <= nowMs);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 4) {
      setErrorMsg("Enter a headline of at least 4 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/dashboard/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          business_id: businessId,
          post_type: postType,
          title: title.trim(),
          details: details.trim() || undefined,
          coupon_code: postType === "deal" ? couponCode.trim() || undefined : undefined,
          duration_days: durationDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not publish broadcast.");

      if (data.post) {
        setPosts((prev) => [data.post, ...prev]);
      }
      setTitle("");
      setDetails("");
      setCouponCode("");
      setSuccessMsg(
        `Broadcast is now live above ${businessName}'s 3D building on the India map.`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/dashboard/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not end broadcast.");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to remove broadcast.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-7">
      {errorMsg && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/35 text-sm text-red-200 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-sm text-emerald-200 flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Composer Form */}
      <form onSubmit={handlePublish} className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">
            Publish a live street broadcast
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Active broadcasts float as a live sky-badge above your 3D building and appear in the India-wide Live Pulse feed until they auto-expire.
          </p>
        </div>

        {/* 4 Broadcast Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="radiogroup" aria-label="Broadcast type">
          {BROADCAST_TYPES.map((t) => {
            const Icon = TYPE_ICONS[t.id];
            const selected = postType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPostType(t.id)}
                className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  selected
                    ? `${t.badgeBg} ${t.badgeBorder} text-white`
                    : "bg-[#121215] border-neutral-800 text-neutral-300 hover:border-neutral-700"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${selected ? t.badgeText : "text-neutral-400"}`} />
                <span className="text-xs font-semibold truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Headline + Optional Coupon Code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={postType === "deal" ? "sm:col-span-2 space-y-1.5" : "sm:col-span-3 space-y-1.5"}>
            <div className="flex items-center justify-between">
              <label htmlFor="broadcast-title" className="block text-sm font-medium text-neutral-100">
                Headline <span className="text-amber-400">*</span>
              </label>
              <span className="text-[11px] text-neutral-400 tabular-nums">
                {title.length}/100
              </span>
            </div>
            <input
              id="broadcast-title"
              type="text"
              required
              minLength={4}
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedMeta.placeholderTitle}
              className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {postType === "deal" && (
            <div className="space-y-1.5">
              <label htmlFor="broadcast-coupon" className="block text-sm font-medium text-neutral-100">
                Coupon Code{" "}
                <span className="text-xs font-normal text-neutral-400">(Optional)</span>
              </label>
              <input
                id="broadcast-coupon"
                type="text"
                maxLength={24}
                value={couponCode}
                onChange={(e) =>
                  setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
                }
                placeholder="e.g. SAVE20"
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-emerald-300 font-mono uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-400/80 focus:outline-none focus:border-emerald-500/75 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
        </div>

        {/* Optional Details */}
        <div className="space-y-1.5">
          <label htmlFor="broadcast-details" className="block text-sm font-medium text-neutral-100">
            Short Details{" "}
            <span className="text-xs font-normal text-neutral-400">(Optional)</span>
          </label>
          <textarea
            id="broadcast-details"
            rows={2}
            maxLength={300}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={selectedMeta.placeholderDetails}
            className="w-full p-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 resize-none"
          />
        </div>

        {/* Duration + Live Sky-Badge Preview + Submit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Auto-expires in:</span>
            <div className="inline-flex rounded-xl bg-[#121215] border border-neutral-800 p-1">
              {([1, 3, 7] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationDays(d)}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-colors ${
                    durationDays === d
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {d === 1 ? "24 Hours" : `${d} Days`}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || activePosts.length >= 3 || title.trim().length < 4}
            className="min-h-[46px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-400 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing…</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                <span>Go Live on 3D Map</span>
              </>
            )}
          </button>
        </div>

        {/* Quiet 3D Sky-Badge Preview */}
        <div className="px-3.5 py-2.5 rounded-xl bg-[#0e0e11] border border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-neutral-400">3D Map Sky-Badge Preview:</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${selectedMeta.badgeBg} ${selectedMeta.badgeBorder} ${selectedMeta.badgeText}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${selectedMeta.dotColor}`} />
            <span>{selectedMeta.shortTag}</span>
            <span className="text-white font-semibold truncate max-w-[200px]">
              {title.trim() || selectedMeta.placeholderTitle.replace(/^e\.g\.\s*/i, "")}
            </span>
            {postType === "deal" && couponCode.trim() && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-emerald-200">
                {couponCode.trim()}
              </span>
            )}
          </span>
        </div>
      </form>

      <hr className="border-neutral-800/80" />

      {/* Active Broadcasts List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Active on Map ({activePosts.length}/3)
          </h3>
          {activePosts.length >= 3 && (
            <span className="text-xs text-amber-400">Limit reached · End one to post more</span>
          )}
        </div>

        {loading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-neutral-400">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Loading broadcasts…</span>
          </div>
        ) : activePosts.length === 0 ? (
          <p className="text-xs text-neutral-400 py-5 px-4 rounded-xl bg-[#121215]/50 border border-neutral-800/70">
            No active broadcasts right now. Publish a deal, coupon, hiring alert, or service request above to light up your 3D building.
          </p>
        ) : (
          <div className="space-y-2.5">
            {activePosts.map((p) => {
              const meta = BROADCAST_TYPE_MAP.get(p.post_type) || BROADCAST_TYPES[0];
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-[#121215] border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                        {meta.shortTag}
                      </span>
                      {p.coupon_code && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono font-semibold text-emerald-300">
                          {p.coupon_code}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 tabular-nums">
                        <Clock className="w-3 h-3" />
                        {formatTimeRemaining(p.expires_at)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral-300 tabular-nums">
                        <MousePointerClick className="w-3 h-3 text-amber-400" />
                        {p.clicks || 0} clicks
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">{p.title}</div>
                    {p.details && (
                      <p className="text-xs text-neutral-400 leading-relaxed">{p.details}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={deletingId === p.id}
                    onClick={() => handleDelete(p.id)}
                    className="shrink-0 min-h-[40px] px-3.5 rounded-xl bg-neutral-900 hover:bg-red-500/15 border border-neutral-800 hover:border-red-500/35 text-xs font-medium text-neutral-300 hover:text-red-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {deletingId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>End Early</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Expired History (quiet, compact) */}
      {expiredPosts.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-neutral-400">
            Past Broadcasts ({expiredPosts.length})
          </h3>
          <div className="divide-y divide-neutral-800/70 rounded-xl border border-neutral-800/70 bg-[#121215]/40">
            {expiredPosts.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-neutral-400"
              >
                <span className="truncate">{p.title}</span>
                <span className="shrink-0 tabular-nums">{p.clicks || 0} clicks · Expired</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

