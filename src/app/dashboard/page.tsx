"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  ImagePlus,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  Star,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { BusinessStorefront, CategoryId } from "@/types";
import { CATEGORY_PLOT_SPECS } from "@/lib/constants/categoryPlots";
import { CategoryDropdown } from "@/components/register/CategoryDropdown";
import { compressImage } from "@/lib/utils/compressImage";

interface OwnedBusiness extends BusinessStorefront {
  status: "active" | "pending" | "suspended";
  analytics: {
    waves: number;
    whatsapp_clicks: number;
    events_7d: number;
  };
}

type DashboardTab = "details" | "photos" | "settings";

export default function DashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<OwnedBusiness[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("details");

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState(false);

  // Editable form state synced to selected business
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryId>("other-business");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const selectedBiz = useMemo(
    () => businesses.find((b) => b.id === selectedId) || businesses[0] || null,
    [businesses, selectedId]
  );

  // Hydrate form inputs whenever selected business changes
  useEffect(() => {
    if (!selectedBiz) return;
    setName(selectedBiz.name || "");
    setTagline(selectedBiz.tagline || "");
    setDescription(selectedBiz.description || "");
    setCategory(selectedBiz.category_id || "other-business");
    setCity(selectedBiz.city_name || "");
    setStateName(selectedBiz.state_name || "");
    setPincode(selectedBiz.pincode || "");
    setStartingPrice(selectedBiz.starting_price || "");
    setWhatsapp(selectedBiz.whatsapp_phone || "");
    setInstagram(selectedBiz.instagram_handle || "");
    setWebsiteUrl(selectedBiz.website_url || "");
    setGoogleMapsUrl(selectedBiz.google_maps_url || "");
    const existingPhotos =
      selectedBiz.portfolio && selectedBiz.portfolio.length > 0
        ? selectedBiz.portfolio.map((p) => p.image_url).filter(Boolean)
        : selectedBiz.logo_url
          ? [selectedBiz.logo_url]
          : [];
    setPhotos(existingPhotos);
    setDeleteConfirmName("");
  }, [selectedBiz]);

  const fetchOwnedBusinesses = useCallback(async (token: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/dashboard/businesses", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.status === 401) {
        setAccessToken(null);
        setBusinesses([]);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || "Could not load your businesses.");
      }
      const list: OwnedBusiness[] = Array.isArray(data.businesses) ? data.businesses : [];
      setBusinesses(list);
      setSelectedId((prev) =>
        prev && list.some((b) => b.id === prev) ? prev : list[0]?.id || null
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Check Supabase auth session on mount + subscribe to auth changes
  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sess = data.session;
      setAuthChecked(true);
      if (sess?.access_token) {
        setAccessToken(sess.access_token);
        setUserEmail(sess.user.email || "");
        fetchOwnedBusinesses(sess.access_token);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (sess?.access_token) {
        setAccessToken(sess.access_token);
        setUserEmail(sess.user.email || "");
        fetchOwnedBusinesses(sess.access_token);
      } else {
        setAccessToken(null);
        setUserEmail("");
        setBusinesses([]);
        setLoading(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [fetchOwnedBusinesses]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/");
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz || !accessToken) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/dashboard/businesses/${selectedBiz.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          tagline,
          description,
          category_id: category,
          city_name: city,
          state_name: stateName,
          pincode,
          starting_price: startingPrice,
          whatsapp_phone: whatsapp,
          instagram_handle: instagram,
          website_url: websiteUrl,
          google_maps_url: googleMapsUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not save changes.");
      }

      if (data.business) {
        setBusinesses((prev) =>
          prev.map((b) =>
            b.id === selectedBiz.id
              ? { ...b, ...data.business, analytics: b.analytics }
              : b
          )
        );
      }
      showSuccess("Plot details saved and updated live on India's map.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedBiz || !accessToken) return;
    if (photos.length + files.length > 6) {
      setErrorMsg("Maximum 6 photos allowed per storefront.");
      return;
    }

    setUploadingPhoto(true);
    setErrorMsg(null);
    try {
      const compressed: string[] = [];
      for (let i = 0; i < files.length; i++) {
        compressed.push(await compressImage(files[i]));
      }
      const nextPhotos = [...photos, ...compressed];
      await persistPhotos(nextPhotos);
    } catch {
      setErrorMsg("Failed to upload photo. Please try JPG, PNG, or WebP.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const persistPhotos = async (nextPhotos: string[]) => {
    if (!selectedBiz || !accessToken) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/dashboard/businesses/${selectedBiz.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ portfolio_images: nextPhotos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update photos.");

      if (data.business) {
        setBusinesses((prev) =>
          prev.map((b) =>
            b.id === selectedBiz.id
              ? { ...b, ...data.business, analytics: b.analytics }
              : b
          )
        );
      }
      showSuccess("Storefront photos updated in CDN storage.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update photos.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetCover = (idx: number) => {
    if (idx <= 0 || idx >= photos.length) return;
    const reordered = [photos[idx], ...photos.filter((_, i) => i !== idx)];
    setPhotos(reordered);
    persistPhotos(reordered);
  };

  const handleRemovePhoto = (idx: number) => {
    const nextPhotos = photos.filter((_, i) => i !== idx);
    setPhotos(nextPhotos);
    persistPhotos(nextPhotos);
  };

  const handleToggleStatus = async () => {
    if (!selectedBiz || !accessToken) return;
    const nextStatus = selectedBiz.status === "active" ? "pending" : "active";
    setTogglingStatus(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/dashboard/businesses/${selectedBiz.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update plot visibility.");

      setBusinesses((prev) =>
        prev.map((b) => (b.id === selectedBiz.id ? { ...b, status: nextStatus } : b))
      );
      showSuccess(
        nextStatus === "active"
          ? "Your 3D plot is now live on India's map."
          : "Plot paused and hidden from the public map."
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleDeletePlot = async () => {
    if (!selectedBiz || !accessToken) return;
    if (deleteConfirmName.trim().toLowerCase() !== selectedBiz.name.trim().toLowerCase()) {
      setErrorMsg(`Type "${selectedBiz.name}" exactly to confirm deletion.`);
      return;
    }

    setDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/dashboard/businesses/${selectedBiz.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete business plot.");

      const remaining = businesses.filter((b) => b.id !== selectedBiz.id);
      setBusinesses(remaining);
      setSelectedId(remaining[0]?.id || null);
      setActiveTab("details");
      showSuccess("Business plot permanently removed.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete plot.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyShare = () => {
    if (!selectedBiz || typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/?shop=${selectedBiz.slug}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2400);
    });
  };

  // Loading state while verifying session
  if (!authChecked || (accessToken && loading)) {
    return (
      <div className="min-h-screen bg-[#09090b] text-neutral-300 flex items-center justify-center gap-3 text-sm">
        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
        <span>Loading your business dashboard…</span>
      </div>
    );
  }

  // Signed-out gate
  if (!accessToken) {
    return (
      <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col">
        <header className="border-b border-neutral-800/80">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 min-h-[44px] -ml-2 px-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to India Map</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full space-y-5 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/12 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Store className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Owner Dashboard
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Sign in with your business email to update rates, manage photos, change your 3D plot category, and track customer inquiries.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link
                href="/login?next=/dashboard"
                className="w-full sm:w-auto min-h-[46px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm flex items-center justify-center transition-colors"
              >
                Sign In to Dashboard
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto min-h-[46px] px-5 rounded-xl bg-[#121215] hover:bg-neutral-800 border border-neutral-800 text-neutral-100 font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Claim a New Plot</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentPlotSpec = selectedBiz
    ? CATEGORY_PLOT_SPECS[selectedBiz.category_id]
    : null;

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#09090b]/92 backdrop-blur-md border-b border-neutral-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-[44px] -ml-2 px-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to India Map</span>
            <span className="sm:hidden">Map</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="hidden md:inline text-xs text-neutral-400 truncate max-w-[200px]">
              {userEmail}
            </span>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Plot</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-[#121215] hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-6">
        {/* Status Alerts */}
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

        {/* Empty State (Signed in, 0 owned plots yet) */}
        {!selectedBiz ? (
          <section className="py-14 text-center space-y-5 border border-neutral-800/80 rounded-2xl bg-[#121215]/50 px-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/12 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h1 className="text-xl font-bold text-white">No 3D business plots linked yet</h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Signed in as <span className="text-neutral-200">{userEmail}</span>. Claim your first 3D storefront on India&apos;s map and manage it directly from here.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Claim Your First 3D Plot</span>
            </Link>
          </section>
        ) : (
          <>
            {/* Multi-Plot Switcher (only shown if owner has 2+ plots) */}
            {businesses.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {businesses.map((b) => {
                  const active = b.id === selectedBiz.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(b.id);
                        setErrorMsg(null);
                      }}
                      className={`shrink-0 min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                        active
                          ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                          : "bg-[#121215] border-neutral-800 text-neutral-300 hover:border-neutral-700"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          b.status === "active" ? "bg-emerald-400" : "bg-neutral-500"
                        }`}
                      />
                      <span>{b.name}</span>
                      <span className="text-neutral-400 font-normal">· {b.city_name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Business Header + Quick Live Links */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white truncate">
                    {selectedBiz.name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      selectedBiz.status === "active"
                        ? "bg-emerald-500/12 border-emerald-500/35 text-emerald-300"
                        : "bg-neutral-800 border-neutral-700 text-neutral-300"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedBiz.status === "active" ? "bg-emerald-400" : "bg-neutral-400"
                      }`}
                    />
                    {selectedBiz.status === "active" ? "Live on Map" : "Paused"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 flex flex-wrap items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedBiz.city_name}
                    {selectedBiz.state_name ? `, ${selectedBiz.state_name}` : ""}
                    {selectedBiz.pincode ? ` · PIN ${selectedBiz.pincode}` : ""}
                  </span>
                  {currentPlotSpec && (
                    <>
                      <span className="text-neutral-600">·</span>
                      <span className="text-neutral-300">{currentPlotSpec.plotName}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href={`/?shop=${selectedBiz.slug}`}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl bg-[#121215] hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-100 transition-colors"
                >
                  <span>View in 3D</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </Link>
                <Link
                  href={`/b/${selectedBiz.slug}`}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl bg-[#121215] hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-100 transition-colors"
                >
                  <span>Portfolio</span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                </Link>
                <button
                  type="button"
                  onClick={handleCopyShare}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl bg-[#121215] hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-100 transition-colors"
                >
                  {copiedSlug ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Share Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Real Analytics Strip (Strictly live Supabase counters) */}
            <section
              aria-label="Storefront performance"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <div className="p-4 rounded-2xl bg-[#121215] border border-neutral-800/90 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Plot Views</span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {selectedBiz.total_views || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-neutral-800/90 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp Leads</span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {selectedBiz.total_leads || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-neutral-800/90 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>Waves</span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {selectedBiz.analytics?.waves || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#121215] border border-neutral-800/90 flex flex-col justify-between gap-2">
                <span className="text-xs text-neutral-400">Map Visibility</span>
                <button
                  type="button"
                  disabled={togglingStatus}
                  onClick={handleToggleStatus}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors text-left disabled:opacity-50"
                >
                  {togglingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : selectedBiz.status === "active" ? (
                    <PauseCircle className="w-4 h-4" />
                  ) : (
                    <PlayCircle className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>
                    {selectedBiz.status === "active" ? "Pause Listing" : "Resume Live"}
                  </span>
                </button>
              </div>
            </section>

            {/* Section Tabs */}
            <div
              role="tablist"
              aria-label="Manage business sections"
              className="flex items-center gap-1 border-b border-neutral-800"
            >
              {(
                [
                  { id: "details", label: "Details & Links" },
                  { id: "photos", label: `Photos (${photos.length}/6)` },
                  { id: "settings", label: "Settings" },
                ] as const
              ).map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setActiveTab(t.id);
                      setErrorMsg(null);
                    }}
                    className={`min-h-[44px] px-3.5 sm:px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                      active
                        ? "border-amber-500 text-amber-400"
                        : "border-transparent text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: DETAILS & LINKS */}
            {activeTab === "details" && (
              <form onSubmit={handleSaveDetails} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="dash-name" className="block text-sm font-medium text-neutral-100">
                      Business Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      id="dash-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={70}
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dash-price" className="block text-sm font-medium text-neutral-100">
                      Starting Price / Rate
                    </label>
                    <input
                      id="dash-price"
                      type="text"
                      value={startingPrice}
                      onChange={(e) => setStartingPrice(e.target.value)}
                      placeholder="e.g. Starts ₹499"
                      maxLength={40}
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="dash-tagline" className="block text-sm font-medium text-neutral-100">
                      One-Line Description
                    </label>
                    <span className="text-[11px] text-neutral-400 tabular-nums">
                      {tagline.length}/120
                    </span>
                  </div>
                  <input
                    id="dash-tagline"
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    maxLength={120}
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="dash-category" className="block text-sm font-medium text-neutral-100">
                    Category &amp; Base 3D Building Architecture
                  </label>
                  <CategoryDropdown
                    id="dash-category"
                    value={category}
                    onChange={setCategory}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="dash-description" className="block text-sm font-medium text-neutral-100">
                    About Your Business{" "}
                    <span className="text-xs font-normal text-neutral-400">(Shown on full portfolio page)</span>
                  </label>
                  <textarea
                    id="dash-description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Share your services, timings, specialties, or service areas…"
                    maxLength={800}
                    className="w-full p-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 resize-y"
                  />
                </div>

                <hr className="border-neutral-800/80" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="dash-whatsapp" className="block text-sm font-medium text-neutral-100">
                      WhatsApp Number (India) <span className="text-amber-400">*</span>
                    </label>
                    <div className="flex items-stretch">
                      <span className="inline-flex items-center px-3.5 rounded-l-xl bg-[#18181c] border border-r-0 border-neutral-800 text-sm text-neutral-300 font-mono">
                        +91
                      </span>
                      <input
                        id="dash-whatsapp"
                        type="tel"
                        inputMode="numeric"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="flex-1 min-h-[46px] px-3.5 rounded-r-xl bg-[#121215] border border-neutral-800 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dash-instagram" className="block text-sm font-medium text-neutral-100">
                      Instagram Handle
                    </label>
                    <div className="flex items-stretch">
                      <span className="inline-flex items-center px-3 rounded-l-xl bg-[#18181c] border border-r-0 border-neutral-800 text-sm text-neutral-400">
                        @
                      </span>
                      <input
                        id="dash-instagram"
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                        placeholder="yourbusiness"
                        className="flex-1 min-h-[46px] px-3 rounded-r-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="dash-website" className="block text-sm font-medium text-neutral-100">
                      Official Website
                    </label>
                    <input
                      id="dash-website"
                      type="text"
                      inputMode="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourbusiness.in"
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dash-gmaps" className="block text-sm font-medium text-neutral-100">
                      Official Google Maps Link
                    </label>
                    <input
                      id="dash-gmaps"
                      type="text"
                      inputMode="url"
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="dash-city" className="block text-sm font-medium text-neutral-100">
                      City / Town <span className="text-amber-400">*</span>
                    </label>
                    <input
                      id="dash-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dash-state" className="block text-sm font-medium text-neutral-100">
                      State
                    </label>
                    <input
                      id="dash-state"
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dash-pin" className="block text-sm font-medium text-neutral-100">
                      Pin Code
                    </label>
                    <input
                      id="dash-pin"
                      type="text"
                      inputMode="numeric"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60 text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: PHOTOS */}
            {activeTab === "photos" && (
              <div className="space-y-5">
                <label
                  htmlFor="dash-photo-upload"
                  className="flex flex-col items-center justify-center w-full min-h-[140px] px-4 py-5 rounded-2xl border border-dashed border-neutral-700 hover:border-amber-500/60 bg-[#121215]/70 hover:bg-[#121215] cursor-pointer transition-colors"
                >
                  {uploadingPhoto || saving ? (
                    <div className="flex items-center gap-2 text-sm text-amber-400 font-medium">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading to CDN storage…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <ImagePlus className="w-5 h-5 text-neutral-300" />
                      <span className="text-sm font-semibold text-neutral-100">
                        Upload new storefront photos
                      </span>
                      <span className="text-xs text-neutral-400">
                        JPG, PNG, or WebP · Stored on Supabase CDN ({photos.length}/6 used)
                      </span>
                    </div>
                  )}
                  <input
                    id="dash-photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingPhoto || saving || photos.length >= 6}
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>

                {photos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {photos.map((url, idx) => (
                      <div
                        key={`${url.slice(0, 32)}-${idx}`}
                        className="rounded-2xl overflow-hidden bg-[#121215] border border-neutral-800 flex flex-col"
                      >
                        <div className="relative aspect-[4/3] bg-neutral-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`${selectedBiz.name} photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {idx === 0 && (
                            <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-black/80 text-[11px] font-semibold text-amber-400">
                              Cover
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 flex items-center justify-between gap-2">
                          {idx > 0 ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleSetCover(idx)}
                              className="min-h-[36px] px-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 flex items-center gap-1.5 transition-colors"
                            >
                              <Star className="w-3.5 h-3.5 text-amber-400" />
                              <span>Set Cover</span>
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-400 pl-1">Primary cover</span>
                          )}

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleRemovePhoto(idx)}
                            aria-label={`Remove photo ${idx + 1}`}
                            className="min-h-[36px] min-w-[36px] rounded-lg bg-neutral-900 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-300 flex items-center justify-center transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400 text-center py-6">
                    No photos uploaded yet. Add at least 1 photo to make your storefront stand out.
                  </p>
                )}
              </div>
            )}

            {/* TAB 3: SETTINGS & DANGER ZONE */}
            {activeTab === "settings" && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-[#121215] border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-white">
                      Public Map Visibility
                    </h2>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Pause your listing to temporarily hide your 3D building from India&apos;s map without deleting your data.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={togglingStatus}
                    onClick={handleToggleStatus}
                    className="shrink-0 min-h-[44px] px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                  >
                    {togglingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : selectedBiz.status === "active" ? (
                      <>
                        <PauseCircle className="w-4 h-4 text-amber-400" />
                        <span>Pause Plot</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 text-emerald-400" />
                        <span>Make Live Again</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/25 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-red-300">
                      Permanently Delete Business Plot
                    </h2>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      This removes <strong className="text-white">{selectedBiz.name}</strong>, its 3D building, and all linked analytics permanently. Type the exact business name below to confirm.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder={`Type "${selectedBiz.name}" to confirm`}
                      aria-label="Confirm business name for deletion"
                      className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#09090b] border border-red-500/30 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-400"
                    />
                    <button
                      type="button"
                      disabled={
                        deleting ||
                        deleteConfirmName.trim().toLowerCase() !==
                          selectedBiz.name.trim().toLowerCase()
                      }
                      onClick={handleDeletePlot}
                      className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {deleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>Delete Plot Permanently</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
