"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Globe,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants/categories";
import { EvaluatedLead, LeadPriority } from "@/lib/constants/leadCrm";
import { supabase } from "@/lib/supabase/client";

function InstagramIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface AdminMetrics {
  totalStorefronts: number;
  verifiedCount: number;
  missingWebsiteCount: number;
  hotNeedsCount: number;
  totalViews: number;
  totalLeads: number;
}

type FilterTab = "all" | "hot_needs" | "missing_website" | "unverified" | "verified" | "featured";

export default function AdminLeadsPage() {
  // Auth state
  const [adminKey, setAdminKey] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [passkeyInput, setPasskeyInput] = useState<string>("");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<boolean>(false);
  const [showPasskey, setShowPasskey] = useState<boolean>(false);

  // Data state
  const [loading, setLoading] = useState<boolean>(false);
  const [leads, setLeads] = useState<EvaluatedLead[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalStorefronts: 0,
    verifiedCount: 0,
    missingWebsiteCount: 0,
    hotNeedsCount: 0,
    totalViews: 0,
    totalLeads: 0,
  });

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Drawer & Outreach modal state
  const [activeLead, setActiveLead] = useState<EvaluatedLead | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  // Fetch leads from backend
  const fetchLeads = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        "x-admin-key": key,
      };

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          headers["Authorization"] = `Bearer ${data.session.access_token}`;
        }
      }

      const res = await fetch("/api/admin/leads", {
        headers,
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthorized(false);
          sessionStorage.removeItem("nerqiva_admin_passkey");
          return;
        }
        throw new Error(data.error || "Failed to load leads.");
      }

      setLeads(data.leads || []);
      if (data.metrics) setMetrics(data.metrics);
      setIsAuthorized(true);
    } catch (err: unknown) {
      console.error("[AdminLeadsPage] fetch error:", err);
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  }, []);

  // Initial auth verification on mount
  useEffect(() => {
    const savedKey = typeof window !== "undefined" ? sessionStorage.getItem("nerqiva_admin_passkey") || "" : "";

    const checkInitialAuth = async () => {
      // 1. Check if Supabase session is an admin email
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          const res = await fetch("/api/admin/auth/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
          });
          const body = await res.json();
          if (res.ok && body.success) {
            const keyToUse = body.admin_key || savedKey || "nerqiva-admin-2026";
            setAdminKey(keyToUse);
            sessionStorage.setItem("nerqiva_admin_passkey", keyToUse);
            setIsAuthorized(true);
            fetchLeads(keyToUse);
            return;
          }
        }
      }

      // 2. Fallback to saved passkey in sessionStorage
      if (savedKey) {
        const res = await fetch("/api/admin/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passkey: savedKey }),
        });
        const body = await res.json();
        if (res.ok && body.success) {
          setAdminKey(savedKey);
          setIsAuthorized(true);
          fetchLeads(savedKey);
          return;
        }
      }

      setCheckingAuth(false);
    };

    checkInitialAuth();
  }, [fetchLeads]);

  // Handle manual passkey submit
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyInput.trim()) return;

    setUnlocking(true);
    setPasskeyError(null);

    try {
      const res = await fetch("/api/admin/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: passkeyInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPasskeyError(data.error || "Invalid master passkey.");
        return;
      }

      const key = passkeyInput.trim();
      setAdminKey(key);
      sessionStorage.setItem("nerqiva_admin_passkey", key);
      setIsAuthorized(true);
      fetchLeads(key);
    } catch {
      setPasskeyError("Connection failed. Please retry.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleLockCrm = () => {
    sessionStorage.removeItem("nerqiva_admin_passkey");
    setAdminKey("");
    setIsAuthorized(false);
    setPasskeyInput("");
  };

  // 1-Click Verification Toggle
  const handleToggleVerified = async (lead: EvaluatedLead) => {
    const nextVal = !lead.isVerified;
    setUpdatingId(lead.businessId);

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.businessId === lead.businessId ? { ...l, isVerified: nextVal } : l))
    );

    try {
      const res = await fetch(`/api/admin/leads/${lead.businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ is_verified: nextVal }),
      });

      if (!res.ok) throw new Error("Failed to update verification status.");
      showToast(nextVal ? `Verified badge granted to ${lead.name}` : `Verified badge revoked from ${lead.name}`);
    } catch {
      // Revert on failure
      setLeads((prev) =>
        prev.map((l) => (l.businessId === lead.businessId ? { ...l, isVerified: !nextVal } : l))
      );
      showToast("Update failed. Please retry.");
    } finally {
      setUpdatingId(null);
    }
  };

  // 1-Click Featured Toggle
  const handleToggleFeatured = async (lead: EvaluatedLead) => {
    const nextVal = !lead.isFeatured;
    setUpdatingId(lead.businessId);

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.businessId === lead.businessId ? { ...l, isFeatured: nextVal } : l))
    );

    try {
      const res = await fetch(`/api/admin/leads/${lead.businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ is_featured: nextVal }),
      });

      if (!res.ok) throw new Error("Failed to update featured status.");
      showToast(nextVal ? `${lead.name} pinned as Featured Spotlight` : `${lead.name} removed from Featured`);
    } catch {
      setLeads((prev) =>
        prev.map((l) => (l.businessId === lead.businessId ? { ...l, isFeatured: !nextVal } : l))
      );
      showToast("Update failed. Please retry.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Status Change (active / pending / suspended)
  const handleChangeStatus = async (lead: EvaluatedLead, status: "active" | "pending" | "suspended") => {
    setUpdatingId(lead.businessId);

    setLeads((prev) =>
      prev.map((l) => (l.businessId === lead.businessId ? { ...l, status } : l))
    );

    try {
      const res = await fetch(`/api/admin/leads/${lead.businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update status.");
      showToast(`Status updated to ${status} for ${lead.name}`);
    } catch {
      showToast("Status change failed.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter & Search computation
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Tab filter
      if (activeTab === "hot_needs" && lead.activeNeedsService.length === 0) return false;
      if (activeTab === "missing_website" && lead.hasWebsite) return false;
      if (activeTab === "unverified" && lead.isVerified) return false;
      if (activeTab === "verified" && !lead.isVerified) return false;
      if (activeTab === "featured" && !lead.isFeatured) return false;

      // Category filter
      if (selectedCategory !== "all" && lead.category !== selectedCategory) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesCity = lead.city.toLowerCase().includes(q);
        const matchesPin = lead.pincode.toLowerCase().includes(q);
        const matchesPhone = lead.cleanPhone.includes(q);
        const matchesCategory = lead.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesPin && !matchesPhone && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [leads, activeTab, selectedCategory, searchQuery]);

  // Copy Cold Script with Toast
  const handleCopyScript = (script: string) => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(script).then(() => {
      setCopiedScript(true);
      showToast("Brutally honest outreach script copied to clipboard.");
      setTimeout(() => setCopiedScript(false), 2400);
    });
  };

  // Loading Screen
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#09090b] text-neutral-300 flex items-center justify-center gap-3 text-sm">
        <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span>Verifying Nerqiva Admin credentials…</span>
      </div>
    );
  }

  // 1. PASSKEY GATE (Locked State)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col">
        <header className="border-b border-neutral-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 min-h-[44px] -ml-2 px-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to India 3D Map</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/35 text-amber-300">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>NERQIVA COMMAND</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Admin Lead CRM
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-sm mx-auto">
                Protected console for reviewing incoming high-street registrations, issuing verified checkmarks, and managing client outreach.
              </p>
            </div>

            {passkeyError && (
              <div
                role="alert"
                className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/35 text-sm text-red-200 flex items-start gap-2.5 text-left"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{passkeyError}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4 pt-1">
              <div className="space-y-1.5 text-left">
                <label htmlFor="admin-passkey" className="block text-xs font-medium text-neutral-300">
                  Master Passkey
                </label>
                <div className="relative">
                  <input
                    id="admin-passkey"
                    type={showPasskey ? "text" : "password"}
                    required
                    autoFocus
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                    placeholder="Enter passkey…"
                    className="w-full min-h-[48px] px-3.5 pr-16 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasskey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    {showPasskey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={unlocking}
                className="w-full min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-60"
              >
                {unlocking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                    <span>Unlocking…</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Unlock Admin CRM</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-xs text-neutral-500">
              Authorized Nerqiva team access only · IP &amp; session audited
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 2. UNLOCKED ADMIN CRM CONSOLE
  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-neutral-950/95 border border-amber-500/40 text-xs text-amber-200 shadow-2xl flex items-center gap-2.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2"
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </aside>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#09090b]/92 backdrop-blur-md border-b border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 min-h-[44px] -ml-2 px-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">3D Map</span>
            </Link>
            <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-white tracking-tight truncate">
                NERQIVA LEAD CRM
              </span>
              <span className="hidden md:inline text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono">
                Live Operations
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-[#121215] hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Owner Console</span>
            </Link>

            <button
              type="button"
              onClick={handleLockCrm}
              aria-label="Lock CRM and sign out"
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-[#121215] hover:bg-red-500/15 border border-neutral-800 hover:border-red-500/35 text-xs font-medium text-neutral-300 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Metric Telemetry Cards */}
        <section aria-label="Lead Telemetry" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-neutral-800/90 flex flex-col justify-between gap-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Total Registered</span>
              <Store className="w-4 h-4 text-neutral-300" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {metrics.totalStorefronts}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">3D High-Street Plots</div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-neutral-800/90 flex flex-col justify-between gap-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Verified Checkmarks</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-cyan-400 tabular-nums">
                {metrics.verifiedCount}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {metrics.totalStorefronts > 0
                  ? `${Math.round((metrics.verifiedCount / metrics.totalStorefronts) * 100)}% verified on map`
                  : "0% verified"}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-neutral-800/90 flex flex-col justify-between gap-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Missing Website Leads</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums">
                {metrics.missingWebsiteCount}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Prime agency opportunities</div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-neutral-800/90 flex flex-col justify-between gap-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Hot Service Requests</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-rose-400 tabular-nums">
                {metrics.hotNeedsCount}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Live broadcast leads</div>
            </div>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section aria-label="Search and Filters" className="space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search business, city, state, PIN, or WhatsApp…"
                className="w-full min-h-[46px] pl-10 pr-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by business category"
                className="w-full md:w-auto min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-xs font-medium text-neutral-200 focus:outline-none focus:border-amber-500/75"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter leads by status"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs"
          >
            {(
              [
                { id: "all", label: `All (${leads.length})` },
                { id: "hot_needs", label: `🔥 Hot Needs (${metrics.hotNeedsCount})` },
                { id: "missing_website", label: `⚡ No Website (${metrics.missingWebsiteCount})` },
                { id: "unverified", label: `⏳ Pending Review (${leads.filter((l) => !l.isVerified).length})` },
                { id: "verified", label: `✓ Verified (${metrics.verifiedCount})` },
                { id: "featured", label: `⭐ Featured (${leads.filter((l) => l.isFeatured).length})` },
              ] as const
            ).map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(t.id)}
                  className={`shrink-0 min-h-[36px] px-3.5 rounded-xl border font-semibold transition-colors ${
                    active
                      ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                      : "bg-[#121215] border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Leads Table / Responsive List */}
        <section aria-label="Businesses and Leads" className="rounded-2xl border border-neutral-800/90 bg-[#121215] overflow-hidden shadow-2xl">
          {filteredLeads.length === 0 ? (
            <div className="py-14 text-center space-y-3 px-4">
              <Store className="w-8 h-8 text-neutral-600 mx-auto" />
              <div className="text-sm font-semibold text-white">No businesses match current filters</div>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Try clearing your search query or selecting &quot;All Leads&quot;.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< md) */}
              <div className="block md:hidden divide-y divide-neutral-800/80">
                {filteredLeads.map((lead) => {
                  const isUpdating = updatingId === lead.businessId;
                  const priorityColor =
                    lead.leadPriority === "HOT"
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                      : lead.leadPriority === "HIGH"
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                        : lead.leadPriority === "MEDIUM"
                          ? "text-sky-400 bg-sky-500/10 border-sky-500/30"
                          : "text-neutral-400 bg-neutral-900 border-neutral-800";

                  return (
                    <article key={`mobile-${lead.businessId}`} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">{lead.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                              Lv.{lead.plotLevel}
                            </span>
                            {lead.isVerified && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 font-semibold">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{lead.city}</span>
                            <span>·</span>
                            <span>{lead.category}</span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border tabular-nums shrink-0 ${priorityColor}`}
                        >
                          <span>{lead.leadScore}</span>
                          <span className="text-[10px]">· {lead.leadPriority}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {lead.hasWebsite ? (
                          <a
                            href={lead.website!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300"
                          >
                            <Globe className="w-3 h-3" />
                            <span>Website</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 font-medium">
                            <Zap className="w-3 h-3" />
                            <span>Missing Website</span>
                          </span>
                        )}

                        {lead.hasGoogleMaps && (
                          <a
                            href={lead.googleMaps!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Maps</span>
                          </a>
                        )}

                        <Link
                          href={`/?shop=${lead.slug}`}
                          className="inline-flex items-center gap-1 text-[11px] text-amber-400 pl-1"
                        >
                          <span>3D Map</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-neutral-800/60">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleVerified(lead)}
                            title={lead.isVerified ? "Revoke Verified Badge" : "Grant Verified Badge"}
                            className={`min-h-[38px] min-w-[38px] p-2 rounded-xl border inline-flex items-center justify-center transition-colors ${
                              lead.isVerified
                                ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-400"
                                : "bg-[#09090b] border-neutral-800 text-neutral-500"
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleFeatured(lead)}
                            title={lead.isFeatured ? "Unpin Featured" : "Pin Featured"}
                            className={`min-h-[38px] min-w-[38px] p-2 rounded-xl border inline-flex items-center justify-center transition-colors ${
                              lead.isFeatured
                                ? "bg-amber-500/15 border-amber-500/50 text-amber-400"
                                : "bg-[#09090b] border-neutral-800 text-neutral-500"
                            }`}
                          >
                            <Star className={`w-4 h-4 ${lead.isFeatured ? "fill-amber-400" : ""}`} />
                          </button>

                          <select
                            value={lead.status}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleChangeStatus(lead, e.target.value as "active" | "pending" | "suspended")
                            }
                            aria-label={`Status for ${lead.name}`}
                            className="px-2 py-1.5 rounded-lg text-xs font-semibold border bg-[#09090b] border-neutral-800 text-neutral-300"
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveLead(lead)}
                          className="min-h-[38px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Outreach</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#09090b]/80 text-xs font-semibold text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="py-3.5 px-4">Business</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Digital Presence</th>
                      <th className="py-3.5 px-4 text-center">Score</th>
                      <th className="py-3.5 px-4 text-center">Verified</th>
                      <th className="py-3.5 px-4 text-center">Featured</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Outreach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredLeads.map((lead) => {
                      const isUpdating = updatingId === lead.businessId;
                      const priorityColor =
                        lead.leadPriority === "HOT"
                          ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                          : lead.leadPriority === "HIGH"
                            ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                            : lead.leadPriority === "MEDIUM"
                              ? "text-sky-400 bg-sky-500/10 border-sky-500/30"
                              : "text-neutral-400 bg-neutral-900 border-neutral-800";

                      return (
                        <tr key={lead.businessId} className="hover:bg-neutral-900/40 transition-colors">
                          {/* Business Identity */}
                          <td className="py-3.5 px-4 min-w-[220px]">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-sm">{lead.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                                  Lv.{lead.plotLevel}
                                </span>
                                {lead.activeNeedsService.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/35 text-rose-300 font-bold">
                                    <Flame className="w-2.5 h-2.5" />
                                    <span>Needs Dev</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                                <span>{lead.category}</span>
                                <span>·</span>
                                <Link
                                  href={`/?shop=${lead.slug}`}
                                  className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5"
                                >
                                  <span>3D Map</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-neutral-200">
                              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{lead.city}</span>
                            </div>
                            {lead.pincode && (
                              <div className="text-[10px] text-neutral-500 font-mono">
                                PIN {lead.pincode}
                              </div>
                            )}
                          </td>

                          {/* Presence Indicators */}
                          <td className="py-3.5 px-4 min-w-[190px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              {lead.hasWebsite ? (
                                <a
                                  href={lead.website!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:text-white transition-colors"
                                >
                                  <Globe className="w-3 h-3" />
                                  <span>Site</span>
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 font-medium">
                                  <Zap className="w-3 h-3" />
                                  <span>No Site</span>
                                </span>
                              )}

                              {lead.hasGoogleMaps ? (
                                <a
                                  href={lead.googleMaps!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300 hover:text-white transition-colors"
                                >
                                  <MapPin className="w-3 h-3" />
                                  <span>Maps</span>
                                </a>
                              ) : (
                                <span className="text-[10px] text-neutral-500">No Maps</span>
                              )}

                              {lead.instagram && (
                                <a
                                  href={lead.instagramDirectUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-pink-400 transition-colors"
                                >
                                  <InstagramIcon className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Opportunity Score */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border tabular-nums ${priorityColor}`}
                            >
                              <span>{lead.leadScore}</span>
                              <span className="text-[10px]">· {lead.leadPriority}</span>
                            </span>
                          </td>

                          {/* 1-Click Verified Toggle */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleToggleVerified(lead)}
                              title={lead.isVerified ? "Revoke Verified Badge" : "Grant Verified Badge"}
                              className={`min-h-[36px] min-w-[36px] p-1.5 rounded-xl border inline-flex items-center justify-center transition-colors ${
                                lead.isVerified
                                  ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/25"
                                  : "bg-[#09090b] border-neutral-800 text-neutral-600 hover:text-neutral-400 hover:border-neutral-700"
                              }`}
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          </td>

                          {/* 1-Click Featured Toggle */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleToggleFeatured(lead)}
                              title={lead.isFeatured ? "Unpin from Featured" : "Pin as Featured Spotlight"}
                              className={`min-h-[36px] min-w-[36px] p-1.5 rounded-xl border inline-flex items-center justify-center transition-colors ${
                                lead.isFeatured
                                  ? "bg-amber-500/15 border-amber-500/50 text-amber-400 hover:bg-amber-500/25"
                                  : "bg-[#09090b] border-neutral-800 text-neutral-600 hover:text-neutral-400 hover:border-neutral-700"
                              }`}
                            >
                              <Star className={`w-4 h-4 ${lead.isFeatured ? "fill-amber-400" : ""}`} />
                            </button>
                          </td>

                          {/* Status Selector */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <select
                              value={lead.status}
                              disabled={isUpdating}
                              onChange={(e) =>
                                handleChangeStatus(lead, e.target.value as "active" | "pending" | "suspended")
                              }
                              aria-label={`Update listing status for ${lead.name}`}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold border bg-[#09090b] focus:outline-none ${
                                lead.status === "active"
                                ? "text-emerald-400 border-emerald-500/30"
                                : lead.status === "pending"
                                  ? "text-amber-400 border-amber-500/30"
                                  : "text-red-400 border-red-500/30"
                            }`}
                            >
                              <option value="active">Active</option>
                              <option value="pending">Pending</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          </td>

                          {/* Outreach Button */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setActiveLead(lead)}
                              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Outreach</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      {/* 3. NERQIVA LEAD INTELLIGENCE & COLD OUTREACH DRAWER */}
      {activeLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Lead Intelligence for ${activeLead.name}`}
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-xl h-full bg-[#121215] border-l border-neutral-800 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 tracking-wider uppercase font-mono">
                      Nerqiva Outreach Intel
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        activeLead.leadPriority === "HOT"
                          ? "text-rose-300 bg-rose-500/15 border-rose-500/35"
                          : activeLead.leadPriority === "HIGH"
                            ? "text-amber-300 bg-amber-500/15 border-amber-500/35"
                            : "text-sky-300 bg-sky-500/15 border-sky-500/35"
                      }`}
                    >
                      {activeLead.leadScore}/100 · {activeLead.leadPriority} LEAD
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{activeLead.name}</h2>
                  <p className="text-xs text-neutral-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {activeLead.city}, {activeLead.state}
                    </span>
                    <span>·</span>
                    <span>{activeLead.category}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveLead(null)}
                  aria-label="Close outreach drawer"
                  className="min-h-[38px] min-w-[38px] rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Verified Contact Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#09090b] border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>WhatsApp Mobile</span>
                  </span>
                  <div className="font-mono text-neutral-100 font-semibold">
                    {activeLead.phone || "Not provided"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#09090b] border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-500 flex items-center gap-1">
                    <InstagramIcon className="w-3 h-3" />
                    <span>Instagram</span>
                  </span>
                  <div className="font-mono text-neutral-100 font-semibold truncate">
                    {activeLead.instagram ? `@${activeLead.instagram}` : "Not connected"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#09090b] border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-500 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>Official Website</span>
                  </span>
                  <div className="truncate">
                    {activeLead.hasWebsite ? (
                      <a
                        href={activeLead.website!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span className="truncate">{activeLead.website}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-amber-400 font-medium">None (Prime Target)</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#09090b] border border-neutral-800/80 space-y-1">
                  <span className="text-neutral-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>Google Maps Link</span>
                  </span>
                  <div className="truncate">
                    {activeLead.hasGoogleMaps ? (
                      <a
                        href={activeLead.googleMaps!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <span>Verified Map Pin</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-neutral-500">Unlinked</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Objective Opportunity Diagnosis */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>OBJECTIVE OPPORTUNITY</span>
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed">
                  {activeLead.opportunitySummary}
                </p>
                <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Suggested solution: <strong className="text-white">{activeLead.suggestedService}</strong></span>
                  <span className="text-amber-300 font-mono font-bold">{activeLead.suggestedPriceFormatted}</span>
                </div>
              </div>

              {/* The Brutally Honest 2-Message Cold Outreach Script */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase font-mono flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Brutally Honest 2-Message Script</span>
                  </h3>
                  <span className="text-[11px] text-neutral-500">Zero fluff · Concrete price</span>
                </div>

                {/* Message Bubble 1 */}
                <div className="p-3.5 rounded-2xl bg-[#09090b] border border-neutral-800 space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Message 1 (The Observation)
                  </span>
                  <p className="text-xs text-neutral-100 leading-relaxed font-sans">
                    {activeLead.outreachMessage1}
                  </p>
                </div>

                {/* Message Bubble 2 */}
                <div className="p-3.5 rounded-2xl bg-[#09090b] border border-neutral-800 space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Message 2 (Solution + Price + Low-Pressure Question)
                  </span>
                  <p className="text-xs text-neutral-100 leading-relaxed font-sans">
                    {activeLead.outreachMessage2}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => handleCopyScript(activeLead.combinedScript)}
                className="w-full sm:flex-1 min-h-[46px] px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied Script</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy 2-Message Script</span>
                  </>
                )}
              </button>

              {activeLead.cleanPhone.length === 10 ? (
                <a
                  href={activeLead.whatsAppClickUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 min-h-[46px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/50"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Open WhatsApp Direct</span>
                </a>
              ) : activeLead.instagram ? (
                <a
                  href={activeLead.instagramDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 min-h-[46px] px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <InstagramIcon className="w-4 h-4" />
                  <span>Open Instagram DM</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
