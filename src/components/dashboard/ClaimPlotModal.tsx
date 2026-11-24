"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  city_name: string;
  category_id: string;
  masked_phone: string;
  is_claimed: boolean;
  is_verified: boolean;
  status: string;
}

interface ClaimPlotModalProps {
  accessToken: string;
  onClose: () => void;
  onPlotClaimed: (business: Record<string, unknown>) => void;
}

export function ClaimPlotModal({ accessToken, onClose, onPlotClaimed }: ClaimPlotModalProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected for claim step
  const [selectedTarget, setSelectedTarget] = useState<SearchResult | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [claimNotes, setClaimNotes] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/dashboard/claim?q=${encodeURIComponent(query.trim())}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");

      setResults(data.results || []);
      setHasSearched(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search failed.";
      setErrorMsg(msg);
    } finally {
      setSearching(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;

    const cleanPhone = phoneInput.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg("Please enter the valid 10-digit Indian WhatsApp mobile number registered with this plot.");
      return;
    }

    setClaiming(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/dashboard/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          business_id: selectedTarget.id,
          whatsapp_phone: cleanPhone,
          claim_notes: claimNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed.");

      setSuccessMsg(data.message || "Business plot claimed successfully!");
      if (data.business) {
        setTimeout(() => {
          onPlotClaimed(data.business);
          onClose();
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Claim request failed.";
      setErrorMsg(msg);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Claim Business Plot"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="max-w-xl w-full bg-[#0a0c10]/95 backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 max-h-[88vh] overflow-y-auto no-scrollbar shadow-[0_30px_70px_rgba(0,0,0,0.85),0_0_1px_rgba(255,255,255,0.15)_inset]">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2.5 sm:hidden shrink-0" aria-hidden="true" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Claim Existing 3D Business Plot
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                Link a registered storefront to your owner console using your registered WhatsApp number.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close claim dialog"
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* STEP 1: SEARCH FOR PLOT */}
        {!selectedTarget ? (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="space-y-2">
              <label htmlFor="claim-search-input" className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">
                Search by Business Name or WhatsApp Digits
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="claim-search-input"
                    type="text"
                    required
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Nerqiva, Kamakhya, or 9864…"
                    className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0 shadow-sm"
                >
                  {searching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Search</span>
                </button>
              </div>
            </form>

            {/* Results List */}
            {hasSearched && (
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
                  Search Results ({results.length})
                </span>

                {results.length === 0 ? (
                  <div className="py-8 text-center rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1 text-xs">
                    <p className="text-neutral-300 font-medium">No matching business plots found.</p>
                    <p className="text-neutral-500 text-[11px]">
                      Check the spelling or register a new plot directly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto no-scrollbar">
                    {results.map((biz) => (
                      <div
                        key={biz.id}
                        className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 flex items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">{biz.name}</span>
                            {biz.is_verified && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/25 text-amber-400 font-mono">
                                <ShieldCheck className="w-3 h-3 text-amber-400" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-400" />
                              <span>{biz.city_name}</span>
                            </span>
                            <span className="text-neutral-600">·</span>
                            <span className="flex items-center gap-1 font-mono text-neutral-400">
                              <Phone className="w-3 h-3 text-neutral-500" />
                              <span>{biz.masked_phone}</span>
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {biz.is_claimed ? (
                            <span className="text-[11px] px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-500 font-mono font-medium">
                              Already Claimed
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTarget(biz);
                                setErrorMsg(null);
                              }}
                              className="min-h-[40px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-bold text-xs transition-all shadow-sm"
                            >
                              Claim This Plot
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: CONFIRM PHONE MATCH & CLAIM */
          <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
              <span className="text-neutral-400 text-[10px] uppercase font-mono tracking-widest block">
                Target Business Plot
              </span>
              <div className="text-base font-bold text-white tracking-tight">{selectedTarget.name}</div>
              <div className="text-xs text-neutral-400">
                {selectedTarget.city_name} · Registered Phone: <span className="font-mono text-amber-300">{selectedTarget.masked_phone}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="claim-phone-verify" className="text-neutral-200 font-semibold block">
                Enter Full Registered WhatsApp Phone (10 digits) *
              </label>
              <div className="flex items-stretch">
                <span className="inline-flex items-center px-3.5 rounded-l-xl bg-white/[0.06] border border-r-0 border-white/10 text-neutral-300 font-mono text-xs">
                  +91
                </span>
                <input
                  id="claim-phone-verify"
                  type="tel"
                  required
                  autoFocus
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  className="flex-1 min-h-[44px] px-3.5 rounded-r-xl bg-white/[0.04] border border-white/10 text-white font-mono focus:outline-none focus:border-amber-400/60"
                />
              </div>
              <p className="text-[11px] text-neutral-400">
                Security check: The 10-digit number must match the one provided during registration.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="claim-notes" className="text-neutral-200 font-semibold block">
                Additional Note or Ownership Proof (Optional)
              </label>
              <input
                id="claim-notes"
                type="text"
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                placeholder="e.g. Founder name, registered street address, or GSTIN"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/60 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setSelectedTarget(null);
                  setErrorMsg(null);
                }}
                className="text-neutral-400 hover:text-white transition-colors text-xs font-medium"
              >
                ← Back to search
              </button>

              <button
                type="submit"
                disabled={claiming || phoneInput.length < 10}
                className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying &amp; Linking…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm &amp; Claim Plot</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
