"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ImagePlus,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants/categories";
import { CATEGORY_PLOT_SPECS } from "@/lib/constants/categoryPlots";
import { INITIAL_CITIES } from "@/lib/constants/initialCities";
import { BusinessStorefront, CategoryId } from "@/types";
import { compressImage } from "@/lib/utils/compressImage";
import { saveLocalStorefront } from "@/lib/utils/localStorefront";
import { supabase } from "@/lib/supabase/client";
import { OwnerAuthCard } from "@/components/auth/OwnerAuthCard";
import { ShareCardModal } from "@/components/onboarding/ShareCardModal";
import { CategoryDropdown } from "@/components/register/CategoryDropdown";
import {
  LocationMapPicker,
  PickedLocation,
} from "@/components/register/LocationMapPicker";

const STEPS = [
  { id: 1, label: "Plot & Location" },
  { id: 2, label: "Rates & Contact" },
  { id: 3, label: "Photos" },
  { id: 4, label: "Publish" },
] as const;

export default function RegisterPage() {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1 — Identity, Category & Exact India Coordinates
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState<CategoryId>("creative-weddings");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [pinLookupLoading, setPinLookupLoading] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [facingBearing, setFacingBearing] = useState<number | undefined>(undefined);
  const [roadAnchorLat, setRoadAnchorLat] = useState<number | undefined>(undefined);
  const [roadAnchorLon, setRoadAnchorLon] = useState<number | undefined>(undefined);
  const [connectorType, setConnectorType] = useState<
    "osm_road" | "colony_branch" | "frontage" | undefined
  >(undefined);
  const [locationLabel, setLocationLabel] = useState("");
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
    key: number;
  } | null>(null);

  // Step 2 — Pricing & Direct Contact
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [startingPrice, setStartingPrice] = useState("");

  // Step 3 — Portfolio Photos
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);

  // Step 4 — Consent, Owner Session & Confirmation
  const [consent, setConsent] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [showInlineAuth, setShowInlineAuth] = useState(false);
  const [createdStorefront, setCreatedStorefront] =
    useState<BusinessStorefront | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Sync current Supabase owner session so registered plots automatically attach to owner_id
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        setOwnerToken(data.session.access_token);
        setOwnerEmail(data.session.user.email || null);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_ev, sess) => {
      if (sess?.access_token) {
        setOwnerToken(sess.access_token);
        setOwnerEmail(sess.user.email || null);
        setShowInlineAuth(false);
      } else {
        setOwnerToken(null);
        setOwnerEmail(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Optional URL deep-link pre-fill (e.g. /register?city=mumbai)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get("city");
    if (cityParam && cityParam.toLowerCase() !== "all") {
      const matched = INITIAL_CITIES.find(
        (c) =>
          c.slug.toLowerCase() === cityParam.toLowerCase() ||
          c.name.toLowerCase() === cityParam.toLowerCase()
      );
      if (matched) {
        setCity(matched.name);
        setStateName(matched.state);
        setLat(matched.lat);
        setLon(matched.lon);
        setLocationLabel(`${matched.name}, ${matched.state}`);
        setFlyTarget({ lat: matched.lat, lon: matched.lon, zoom: 13.5, key: Date.now() });
      }
    }
  }, []);

  // When user types a valid 6-digit Indian PIN code, automatically locate it on the mini-map
  const handlePincodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setPincode(digits);

    if (/^[1-9]\d{5}$/.test(digits)) {
      setPinLookupLoading(true);
      fetch(`/api/geo/search?q=${digits}`)
        .then((r) => r.json())
        .then((d) => {
          const hit = Array.isArray(d?.results) ? d.results[0] : null;
          if (hit && typeof hit.lat === "number" && typeof hit.lon === "number") {
            setLat(Number(hit.lat.toFixed(6)));
            setLon(Number(hit.lon.toFixed(6)));
            setFlyTarget({
              lat: hit.lat,
              lon: hit.lon,
              zoom: hit.zoom || 15,
              key: Date.now(),
            });
            const parts = String(hit.subtitle || "")
              .split(/[·,]/)
              .map((p) => p.trim())
              .filter((p) => p && p.toLowerCase() !== "india");
            if (parts.length >= 2) {
              setCity(parts[parts.length - 2]);
              setStateName(parts[parts.length - 1]);
            } else if (parts[0]) {
              setCity(parts[0]);
            }
            setLocationLabel(hit.subtitle ? `${hit.name}, ${hit.subtitle}` : hit.name);
          }
        })
        .catch(() => {})
        .finally(() => setPinLookupLoading(false));
    }
  };

  // Sync location picked from the interactive mini-map (search, GPS, click, or pin drag)
  const handleMapPick = useCallback((loc: PickedLocation) => {
    setLat(loc.lat);
    setLon(loc.lon);
    if (typeof loc.facingBearing === "number") setFacingBearing(loc.facingBearing);
    if (typeof loc.roadAnchorLat === "number") setRoadAnchorLat(loc.roadAnchorLat);
    if (typeof loc.roadAnchorLon === "number") setRoadAnchorLon(loc.roadAnchorLon);
    if (loc.connectorType) setConnectorType(loc.connectorType);
    if (loc.city) setCity(loc.city);
    if (loc.state) setStateName(loc.state);
    if (loc.pincode) setPincode(loc.pincode);
    if (loc.label) setLocationLabel(loc.label);
  }, []);

  // Step Validations
  const hasPinnedCoords = typeof lat === "number" && typeof lon === "number";
  const canProceedStep1 =
    name.trim().length >= 2 &&
    tagline.trim().length >= 5 &&
    city.trim().length >= 2 &&
    hasPinnedCoords;

  const cleanPhone = whatsapp.replace(/[^0-9]/g, "").slice(-10);
  const isValidPhone = /^[6-9]\d{9}$/.test(cleanPhone);
  const canProceedStep2 = isValidPhone && startingPrice.trim().length > 0;

  const canProceedStep3 = portfolio.length >= 1;

  const selectedCategoryObj =
    CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const selectedPlotSpec = CATEGORY_PLOT_SPECS[category];

  // Step 1 missing-item hint so users are never left guessing why Continue is disabled
  const step1MissingHint = !name.trim() || name.trim().length < 2
    ? "Enter your business name to continue."
    : tagline.trim().length < 5
      ? "Add a short one-line description of what you offer."
      : !hasPinnedCoords
        ? "Drop a pin on the India mini-map (search, GPS, or tap the map) so we can place your 3D plot."
        : city.trim().length < 2
          ? "Enter your city or town name."
          : null;

  // Image Upload Handler with client-side compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (portfolio.length + files.length > 6) {
      setErrorMsg("You can upload up to 6 photos per storefront.");
      return;
    }

    setCompressing(true);
    setErrorMsg(null);

    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        newImages.push(compressed);
      }
      setPortfolio((prev) => [...prev, ...newImages]);
    } catch {
      setErrorMsg("Could not process one of those images. Please try JPG or PNG files.");
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setPortfolio((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submission Handler
  const handleSubmit = async () => {
    if (!consent) {
      setErrorMsg("Please confirm directory listing consent to publish your plot.");
      return;
    }
    if (!hasPinnedCoords) {
      setErrorMsg("Please pin your plot location on the map first.");
      setStep(1);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const normalizedWebsite = websiteUrl.trim()
      ? /^https?:\/\//i.test(websiteUrl.trim())
        ? websiteUrl.trim()
        : `https://${websiteUrl.trim()}`
      : undefined;

    const normalizedGoogleMaps = googleMapsUrl.trim()
      ? /^https?:\/\//i.test(googleMapsUrl.trim())
        ? googleMapsUrl.trim()
        : `https://${googleMapsUrl.trim()}`
      : undefined;

    const payload = {
      name: name.trim(),
      tagline: tagline.trim(),
      category_id: category,
      city_name: city.trim(),
      state_name: stateName.trim() || "India",
      pincode: pincode.trim() || undefined,
      whatsapp_phone: cleanPhone,
      instagram_handle: instagram.replace(/^@/, "").trim() || undefined,
      website_url: normalizedWebsite,
      google_maps_url: normalizedGoogleMaps,
      starting_price: startingPrice.trim(),
      lat,
      lon,
      facing_bearing: facingBearing,
      road_anchor_lat: roadAnchorLat,
      road_anchor_lon: roadAnchorLon,
      connector_type: connectorType,
      portfolio_images: portfolio,
    };

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (ownerToken) {
        headers.Authorization = `Bearer ${ownerToken}`;
      }
      const res = await fetch("/api/register", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed. Please try again.");
      }

      const finalPortfolioUrls: string[] =
        Array.isArray(data.portfolio_urls) && data.portfolio_urls.length > 0
          ? data.portfolio_urls
          : portfolio;

      const newStorefront: BusinessStorefront = {
        id: data.id || `sb-${Date.now()}`,
        slug: data.slug,
        name: payload.name,
        tagline: payload.tagline,
        category_id: payload.category_id,
        city_name: payload.city_name,
        state_name: payload.state_name,
        pincode: payload.pincode,
        lat: payload.lat,
        lon: payload.lon,
        facing_bearing: payload.facing_bearing,
        road_anchor_lat: payload.road_anchor_lat,
        road_anchor_lon: payload.road_anchor_lon,
        connector_type: payload.connector_type,
        whatsapp_phone: payload.whatsapp_phone,
        instagram_handle: payload.instagram_handle,
        website_url: payload.website_url,
        google_maps_url: payload.google_maps_url,
        starting_price: payload.starting_price,
        logo_url: data.logo_url || finalPortfolioUrls[0] || "",
        is_verified: false,
        is_featured: false,
        total_views: 1,
        total_leads: 0,
        portfolio: finalPortfolioUrls.map((url, i) => ({
          id: `p-${i}`,
          business_id: data.id,
          image_url: url,
          sort_order: i + 1,
        })),
        created_at: new Date().toISOString(),
      };

      saveLocalStorefront(newStorefront);
      setCreatedStorefront(newStorefront);
      setIsShareModalOpen(true);

      confetti({
        particleCount: 90,
        spread: 68,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#fbbf24", "#10b981", "#ffffff"],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col">
      {/* Top Navigation & Progress Header */}
      <header className="sticky top-0 z-30 bg-[#09090b]/92 backdrop-blur-md border-b border-neutral-800/80">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 min-h-[44px] -ml-2 px-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to India Map</span>
            </Link>

            <span className="text-xs font-medium text-neutral-400 tabular-nums">
              Step {step} of {STEPS.length}
            </span>
          </div>

          {/* 4-Step Segmented Progress Bar */}
          <nav aria-label="Registration steps" className="pb-3.5">
            <ol className="grid grid-cols-4 gap-2">
              {STEPS.map((s) => {
                const isCompleted = s.id < step;
                const isCurrent = s.id === step;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={!isCompleted}
                      onClick={() => {
                        if (isCompleted) {
                          setErrorMsg(null);
                          setStep(s.id);
                        }
                      }}
                      className={`w-full text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded ${
                        isCompleted ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <div
                        className={`h-1 rounded-full transition-colors duration-200 ${
                          isCurrent || isCompleted ? "bg-amber-500" : "bg-neutral-800"
                        }`}
                      />
                      <span
                        className={`mt-1.5 block text-[11px] font-medium truncate transition-colors ${
                          isCurrent
                            ? "text-amber-400"
                            : isCompleted
                              ? "text-neutral-300 group-hover:text-white"
                              : "text-neutral-500"
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </header>

      {/* Main Form Workspace */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-7 sm:py-10">
        {errorMsg && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/35 text-sm text-red-200 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ==================== STEP 1: PLOT IDENTITY & LOCATION ==================== */}
        {step === 1 && (
          <section aria-labelledby="step1-heading" className="space-y-6">
            <div className="space-y-1.5">
              <h1
                id="step1-heading"
                className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight"
              >
                Claim your 3D business plot
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-[60ch]">
                Your category selects your base 3D building architecture and your map pin places it directly on India&apos;s live street map.
              </p>
            </div>

            <div className="space-y-5 pt-1">
              {/* Business Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="business-name"
                  className="block text-sm font-medium text-neutral-100"
                >
                  Business Name <span className="text-amber-400">*</span>
                </label>
                <input
                  id="business-name"
                  type="text"
                  required
                  aria-required="true"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kashi Roasters, Studio Aarav"
                  maxLength={70}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>

              {/* One-Line Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="business-tagline"
                    className="block text-sm font-medium text-neutral-100"
                  >
                    One-Line Description <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[11px] text-neutral-400 tabular-nums">
                    {tagline.length}/120
                  </span>
                </div>
                <input
                  id="business-tagline"
                  type="text"
                  required
                  aria-required="true"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Specialty pour-over coffee & artisanal bakes"
                  maxLength={120}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>

              {/* Category (Open Elective) Dropdown */}
              <div className="space-y-1.5">
                <label
                  htmlFor="business-category"
                  className="block text-sm font-medium text-neutral-100"
                >
                  Category (Open Elective) <span className="text-amber-400">*</span>
                </label>
                <CategoryDropdown
                  id="business-category"
                  value={category}
                  onChange={setCategory}
                />
              </div>

              {/* Divider separating identity from location */}
              <hr className="border-neutral-800/80" />

              {/* Interactive All-India Mini-Map Picker */}
              <LocationMapPicker
                lat={lat}
                lon={lon}
                selectedLabel={locationLabel}
                externalFlyTarget={flyTarget}
                onChange={handleMapPick}
              />

              {/* City / Town & Optional Pin Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label
                    htmlFor="business-city"
                    className="block text-sm font-medium text-neutral-100"
                  >
                    City / Town <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="business-city"
                    type="text"
                    required
                    aria-required="true"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Auto-fills from map or type city/town"
                    maxLength={60}
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="business-pincode"
                      className="block text-sm font-medium text-neutral-100"
                    >
                      Pin Code{" "}
                      <span className="text-xs font-normal text-neutral-400">
                        (Optional)
                      </span>
                    </label>
                    {pinLookupLoading && (
                      <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    )}
                  </div>
                  <input
                    id="business-pincode"
                    type="text"
                    inputMode="numeric"
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="e.g. 400050"
                    maxLength={6}
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white font-mono tabular-nums placeholder:font-sans placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Primary Step Action */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={!canProceedStep1}
                onClick={() => {
                  setErrorMsg(null);
                  setStep(2);
                }}
                className="w-full min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-400 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span>Continue to Rates &amp; Contact</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {!canProceedStep1 && step1MissingHint && (
                <p className="text-xs text-neutral-400 text-center">
                  {step1MissingHint}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ==================== STEP 2: RATES & DIRECT CONTACT ==================== */}
        {step === 2 && (
          <section aria-labelledby="step2-heading" className="space-y-6">
            <div className="space-y-1.5">
              <h1
                id="step2-heading"
                className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight"
              >
                Rates &amp; direct customer contact
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-[60ch]">
                Zero commission, zero middlemen. Visitors reach your business directly on WhatsApp.
              </p>
            </div>

            <div className="space-y-5 pt-1">
              {/* Starting Price */}
              <div className="space-y-1.5">
                <label
                  htmlFor="starting-price"
                  className="block text-sm font-medium text-neutral-100"
                >
                  Starting Price / Rate <span className="text-amber-400">*</span>
                </label>
                <input
                  id="starting-price"
                  type="text"
                  required
                  aria-required="true"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  placeholder="e.g. Starts ₹499, ₹15,000 / day, Consultation ₹300"
                  maxLength={40}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-1.5">
                <label
                  htmlFor="whatsapp-phone"
                  className="block text-sm font-medium text-neutral-100"
                >
                  WhatsApp Number (India) <span className="text-amber-400">*</span>
                </label>
                <div className="flex items-stretch">
                  <span className="inline-flex items-center px-3.5 rounded-l-xl bg-[#18181c] border border-r-0 border-neutral-800 text-sm text-neutral-300 font-mono tabular-nums">
                    +91
                  </span>
                  <input
                    id="whatsapp-phone"
                    type="tel"
                    inputMode="numeric"
                    required
                    aria-required="true"
                    value={whatsapp}
                    onChange={(e) =>
                      setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="9876543210"
                    className="flex-1 min-h-[46px] px-3.5 rounded-r-xl bg-[#121215] border border-neutral-800 text-sm text-white font-mono tabular-nums placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                  />
                </div>
                {whatsapp.length > 0 && !isValidPhone && (
                  <p className="text-xs text-amber-400">
                    Enter a valid 10-digit Indian mobile number starting with 6–9.
                  </p>
                )}
              </div>

              {/* Instagram + Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="instagram-handle"
                    className="block text-sm font-medium text-neutral-100"
                  >
                    Instagram{" "}
                    <span className="text-xs font-normal text-neutral-400">
                      (Optional)
                    </span>
                  </label>
                  <div className="flex items-stretch">
                    <span className="inline-flex items-center px-3 rounded-l-xl bg-[#18181c] border border-r-0 border-neutral-800 text-sm text-neutral-400">
                      @
                    </span>
                    <input
                      id="instagram-handle"
                      type="text"
                      value={instagram}
                      onChange={(e) =>
                        setInstagram(e.target.value.replace(/^@/, ""))
                      }
                      placeholder="yourbusiness"
                      maxLength={35}
                      className="flex-1 min-h-[46px] px-3 rounded-r-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="website-url"
                    className="block text-sm font-medium text-neutral-100"
                  >
                    Official Website{" "}
                    <span className="text-xs font-normal text-neutral-400">
                      (Optional)
                    </span>
                  </label>
                  <input
                    id="website-url"
                    type="text"
                    inputMode="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourbusiness.in"
                    maxLength={160}
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                  />
                </div>
              </div>

              {/* Official Google Maps Link */}
              <div className="space-y-1.5">
                <label
                  htmlFor="google-maps-url"
                  className="block text-sm font-medium text-neutral-100"
                >
                  Official Google Maps Link{" "}
                  <span className="text-xs font-normal text-neutral-400">
                    (Optional)
                  </span>
                </label>
                <input
                  id="google-maps-url"
                  type="text"
                  inputMode="url"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... (for direct Google Maps & reviews)"
                  maxLength={300}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep(1);
                }}
                className="min-h-[48px] px-5 rounded-xl bg-[#121215] hover:bg-neutral-800 border border-neutral-800 text-sm font-medium text-neutral-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canProceedStep2}
                onClick={() => {
                  setErrorMsg(null);
                  setStep(3);
                }}
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-400 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span>Continue to Photos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ==================== STEP 3: PORTFOLIO PHOTOS ==================== */}
        {step === 3 && (
          <section aria-labelledby="step3-heading" className="space-y-6">
            <div className="space-y-1.5">
              <h1
                id="step3-heading"
                className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight"
              >
                Add storefront photos
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-[60ch]">
                Upload 1 to 6 photos of your shop, workspace, or work samples. The first photo becomes your storefront cover.
              </p>
            </div>

            {/* Upload Dropzone */}
            <label
              htmlFor="portfolio-upload"
              className="flex flex-col items-center justify-center w-full min-h-[168px] px-4 py-6 rounded-2xl border border-dashed border-neutral-700 hover:border-amber-500/60 bg-[#121215]/70 hover:bg-[#121215] cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-amber-400"
            >
              {compressing ? (
                <div className="flex flex-col items-center gap-2 text-amber-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-medium">Optimizing images…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300">
                    <ImagePlus className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-neutral-100">
                    Choose photos from your device
                  </div>
                  <p className="text-xs text-neutral-400">
                    JPG, PNG, or WebP · Automatically optimized ({portfolio.length}/6 uploaded)
                  </p>
                </div>
              )}
              <input
                id="portfolio-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={compressing || portfolio.length >= 6}
                className="sr-only"
              />
            </label>

            {/* Preview Grid */}
            {portfolio.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portfolio.map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`${name || "Business"} preview ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[11px] font-semibold text-amber-400">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep(2);
                }}
                className="min-h-[48px] px-5 rounded-xl bg-[#121215] hover:bg-neutral-800 border border-neutral-800 text-sm font-medium text-neutral-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canProceedStep3}
                onClick={() => {
                  setErrorMsg(null);
                  setStep(4);
                }}
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-400 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span>Review Plot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ==================== STEP 4: REVIEW & PUBLISH ==================== */}
        {step === 4 && (
          <section aria-labelledby="step4-heading" className="space-y-6">
            <div className="space-y-1.5">
              <h1
                id="step4-heading"
                className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight"
              >
                Review &amp; spawn your 3D plot
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-[60ch]">
                Double-check your storefront details before placing your base 3D building on the live India map.
              </p>
            </div>

            {/* Clean Structured Review Sheet */}
            <div className="rounded-2xl bg-[#121215] border border-neutral-800 divide-y divide-neutral-800/80 overflow-hidden">
              {/* Top Identity Row */}
              <div className="p-4 sm:p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0">
                  {portfolio[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={portfolio[0]}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                      <Upload className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white truncate">{name}</h2>
                  <p className="text-xs text-neutral-300 line-clamp-2 mt-0.5">
                    {tagline}
                  </p>
                </div>
              </div>

              {/* 3D Plot Architecture Row */}
              <div className="p-4 sm:px-5 flex items-start justify-between gap-4 text-sm">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium text-neutral-100">
                      {selectedPlotSpec.plotName}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {selectedCategoryObj.name} · {selectedPlotSpec.footprintLabel}
                    </div>
                  </div>
                </div>
                <div className="flex items-center -space-x-1 shrink-0 pt-1" aria-hidden="true">
                  {selectedPlotSpec.palette.map((hex, i) => (
                    <span
                      key={i}
                      style={{ backgroundColor: hex }}
                      className="w-3.5 h-3.5 rounded-full border border-[#121215]"
                    />
                  ))}
                </div>
              </div>

              {/* Location & Contact Details */}
              <dl className="p-4 sm:px-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <dt className="text-neutral-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Pinned Location
                  </dt>
                  <dd className="text-neutral-100 font-medium">
                    {[city, stateName, pincode ? `PIN ${pincode}` : ""]
                      .filter(Boolean)
                      .join(", ")}
                  </dd>
                  {hasPinnedCoords && (
                    <dd className="font-mono text-[11px] text-neutral-400 tabular-nums">
                      {lat.toFixed(5)}° N, {lon.toFixed(5)}° E
                    </dd>
                  )}
                </div>

                <div className="space-y-1">
                  <dt className="text-neutral-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Direct Contact &amp; Rate
                  </dt>
                  <dd className="text-neutral-100 font-medium tabular-nums">
                    +91 {cleanPhone}
                  </dd>
                  <dd className="text-emerald-400 font-medium">{startingPrice}</dd>
                </div>
              </dl>
            </div>

            {/* Owner Account Attachment (lets owner log in anytime to edit/manage their 3D plot) */}
            {ownerEmail ? (
              <div className="px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-neutral-200 truncate">
                    Claiming as <strong className="text-white">{ownerEmail}</strong> · Manage anytime in My Business
                  </span>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            ) : (
              <div className="rounded-2xl bg-[#121215] border border-neutral-800 p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-white">
                      Link Owner Account{" "}
                      <span className="text-xs font-normal text-amber-400">(Recommended)</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Sign in so you can edit rates, upload photos, and view leads in My Business later.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInlineAuth((v) => !v)}
                    className="min-h-[38px] px-3.5 rounded-xl bg-amber-500/12 hover:bg-amber-500/20 border border-amber-500/35 text-xs font-semibold text-amber-300 transition-colors"
                  >
                    {showInlineAuth ? "Hide Sign-In" : "Sign In / Create Account"}
                  </button>
                </div>

                {showInlineAuth && (
                  <div className="pt-2 border-t border-neutral-800/80">
                    <OwnerAuthCard
                      compact
                      redirectNext="/register"
                      onAuthenticated={(u) => {
                        setOwnerToken(u.accessToken);
                        setOwnerEmail(u.email);
                        setShowInlineAuth(false);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Directory Listing Consent */}
            <label className="flex items-start gap-3 p-4 rounded-xl bg-[#121215]/70 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-neutral-600 bg-neutral-900 accent-amber-500 cursor-pointer shrink-0"
              />
              <span className="text-xs text-neutral-300 leading-relaxed">
                I confirm I am authorized to list this business on Spotlight Bazaar&apos;s public All-India directory and display this WhatsApp contact for direct customer inquiries.
              </span>
            </label>

            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setErrorMsg(null);
                  setStep(3);
                }}
                className="min-h-[48px] px-5 rounded-xl bg-[#121215] hover:bg-neutral-800 border border-neutral-800 text-sm font-medium text-neutral-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!consent || submitting}
                onClick={handleSubmit}
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-400 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Spawning 3D Plot…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Claim &amp; Place 3D Plot</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Post-Registration Share & Fly-To Modal */}
      {createdStorefront && (
        <ShareCardModal
          storefront={createdStorefront}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}
