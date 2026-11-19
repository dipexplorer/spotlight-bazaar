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
  Globe,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Store,
  UserCheck,
} from "lucide-react";

function InstagramIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
import { CATEGORIES } from "@/lib/constants/categories";
import { CATEGORY_PLOT_SPECS } from "@/lib/constants/categoryPlots";
import { INITIAL_CITIES } from "@/lib/constants/initialCities";
import { BusinessStorefront, CategoryId } from "@/types";
import { saveLocalStorefront } from "@/lib/utils/localStorefront";
import { supabase } from "@/lib/supabase/client";
import { ShareCardModal } from "@/components/onboarding/ShareCardModal";
import { CategoryDropdown } from "@/components/register/CategoryDropdown";
import {
  LocationMapPicker,
  PickedLocation,
} from "@/components/register/LocationMapPicker";

const STEPS = [
  { id: 1, label: "Plot & Location" },
  { id: 2, label: "Rates & Contact" },
  { id: 3, label: "Review & Claim" },
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

  // Step 2 — Pricing, Direct Channels & Owner Email
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [ownerEmailInput, setOwnerEmailInput] = useState("");

  // Step 3 — Consent, Owner Session & Confirmation
  const [consent, setConsent] = useState(false);
  const [ownerSessionEmail, setOwnerSessionEmail] = useState<string | null>(null);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [createdStorefront, setCreatedStorefront] =
    useState<BusinessStorefront | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Check if current user is already logged in to pre-fill owner email
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        setOwnerToken(data.session.access_token);
        setOwnerSessionEmail(data.session.user.email);
        setOwnerEmailInput((prev) => (prev ? prev : data.session?.user.email || ""));
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_ev, sess) => {
      if (sess?.user?.email) {
        setOwnerToken(sess.access_token);
        setOwnerSessionEmail(sess.user.email);
        setOwnerEmailInput((prev) => (prev ? prev : sess.user.email || ""));
      } else {
        setOwnerToken(null);
        setOwnerSessionEmail(null);
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
  const isValidEmail = (em: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim());
  const canProceedStep2 =
    isValidPhone &&
    startingPrice.trim().length > 0 &&
    isValidEmail(ownerEmailInput);

  const selectedCategoryObj =
    CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const selectedPlotSpec = CATEGORY_PLOT_SPECS[category];

  // Step 1 missing-item hint
  const step1MissingHint = !name.trim() || name.trim().length < 2
    ? "Enter your business name to continue."
    : tagline.trim().length < 5
      ? "Add a short one-line description of what you offer."
      : !hasPinnedCoords
        ? "Drop a pin on the India mini-map (search, GPS, or tap the map) so we can place your 3D plot."
        : city.trim().length < 2
          ? "Enter your city or town name."
          : null;

  // Submission Handler
  const handleSubmit = async () => {
    if (!consent) {
      setErrorMsg("Please confirm directory listing consent to publish your plot.");
      return;
    }
    const cleanEmail = ownerEmailInput.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setErrorMsg("A valid owner email address is required to claim this plot.");
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
      owner_email: cleanEmail,
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

      const newStorefront: BusinessStorefront = {
        id: data.id || `sb-${Date.now()}`,
        slug: data.slug,
        name: payload.name,
        tagline: payload.tagline,
        category_id: payload.category_id,
        city_name: payload.city_name,
        state_name: payload.state_name,
        pincode: payload.pincode,
        lat: payload.lat!,
        lon: payload.lon!,
        facing_bearing: payload.facing_bearing,
        road_anchor_lat: payload.road_anchor_lat,
        road_anchor_lon: payload.road_anchor_lon,
        connector_type: payload.connector_type,
        whatsapp_phone: payload.whatsapp_phone,
        instagram_handle: payload.instagram_handle,
        website_url: payload.website_url,
        google_maps_url: payload.google_maps_url,
        starting_price: payload.starting_price,
        is_verified: false,
        is_featured: false,
        total_views: 1,
        total_leads: 0,
        owner_email: cleanEmail,
        portfolio: [],
        created_at: new Date().toISOString(),
      };

      saveLocalStorefront(newStorefront);
      setCreatedStorefront(newStorefront);

      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
      });

      setIsShareModalOpen(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col antialiased">
      {/* Top Navigation & Stepper Header */}
      <header className="sticky top-0 z-20 border-b border-neutral-800/80 bg-[#09090b]/92 backdrop-blur-md">
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

          {/* 3-Step Segmented Progress Bar */}
          <nav aria-label="Registration steps" className="pb-3.5">
            <ol className="grid grid-cols-3 gap-2">
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
                  placeholder="e.g. Brahmaputra Artisanal Bakes"
                  maxLength={60}
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
                  placeholder="e.g. Specialty pour-over coffee & artisanal sourdough bakes"
                  maxLength={120}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1.5">
                <label
                  htmlFor="business-category"
                  className="block text-sm font-medium text-neutral-100"
                >
                  Category (3D Building Archetype) <span className="text-amber-400">*</span>
                </label>
                <CategoryDropdown
                  id="business-category"
                  value={category}
                  onChange={setCategory}
                />
              </div>

              {/* Divider separating identity from location */}
              <hr className="border-neutral-800/80" />

              {/* Interactive Location & Mini-Map Picker */}
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
                    placeholder="e.g. Guwahati"
                    maxLength={40}
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="business-pincode"
                    className="block text-sm font-medium text-neutral-100"
                  >
                    PIN Code{" "}
                    <span className="text-xs font-normal text-neutral-400">
                      (Optional)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="business-pincode"
                      type="text"
                      inputMode="numeric"
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="e.g. 781001"
                      maxLength={6}
                      className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white font-mono tabular-nums placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                    />
                    {pinLookupLoading && (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1 Completion Footer */}
            <div className="pt-2 space-y-3">
              {step1MissingHint && (
                <p className="text-xs text-amber-400/90 leading-relaxed">
                  {step1MissingHint}
                </p>
              )}
              <button
                type="button"
                disabled={!canProceedStep1}
                onClick={() => {
                  setErrorMsg(null);
                  setStep(2);
                }}
                className="w-full min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span>Continue to Rates &amp; Contact</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ==================== STEP 2: RATES, DIRECT CHANNELS & OWNER EMAIL ==================== */}
        {step === 2 && (
          <section aria-labelledby="step2-heading" className="space-y-6">
            <div className="space-y-1.5">
              <h1
                id="step2-heading"
                className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight"
              >
                Rates, direct contact &amp; owner claim
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-[60ch]">
                Direct customer inquiries without middleman commissions. Enter your business channels and owner email to claim this plot.
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
                  placeholder="e.g. Starts ₹499, ₹15,000 / day, ₹180 per loaf"
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
                    Instagram Profile{" "}
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
                  placeholder="https://maps.app.goo.gl/... (for direct directions & reviews)"
                  maxLength={300}
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                />
              </div>

              {/* Business Owner Email (Required for plot claim & passwordless login) */}
              <div className="space-y-1.5 pt-3 border-t border-neutral-800/80">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="owner-email"
                    className="block text-sm font-medium text-neutral-100"
                  >
                    Business Owner Email <span className="text-amber-400">*</span>
                  </label>
                  {ownerSessionEmail && (
                    <span className="text-[11px] text-emerald-400 font-medium">
                      Signed in
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="owner-email"
                    type="email"
                    required
                    aria-required="true"
                    value={ownerEmailInput}
                    onChange={(e) => setOwnerEmailInput(e.target.value)}
                    placeholder="owner@yourbusiness.com"
                    className="w-full min-h-[46px] pl-10 pr-3.5 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/75 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                  />
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Ownership of this 3D plot is linked directly to this email. You can log into your Owner Dashboard anytime via passwordless Email OTP or password.
                </p>
                {ownerEmailInput.length > 0 && !isValidEmail(ownerEmailInput) && (
                  <p className="text-xs text-amber-400">
                    Please enter a valid email address.
                  </p>
                )}
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
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span>Continue to Review &amp; Claim</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ==================== STEP 3: REVIEW & CLAIM PLOT ==================== */}
        {step === 3 && (
          <section aria-labelledby="step3-heading" className="space-y-6">
            <div className="space-y-1.5">
              <h1
                id="step3-heading"
                className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight"
              >
                Review &amp; claim your 3D plot
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-[60ch]">
                Double-check your storefront details before placing your 3D building on India&apos;s open business map.
              </p>
            </div>

            {/* Clean Structured Review Sheet */}
            <div className="rounded-2xl bg-[#121215] border border-neutral-800 divide-y divide-neutral-800/80 overflow-hidden">
              {/* Top Identity Row */}
              <div className="p-4 sm:p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                  <Store className="w-6 h-6" />
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
                    Direct WhatsApp &amp; Rate
                  </dt>
                  <dd className="text-neutral-100 font-medium tabular-nums">
                    +91 {cleanPhone}
                  </dd>
                  <dd className="text-emerald-400 font-medium">{startingPrice}</dd>
                </div>
              </dl>

              {/* External Channels (Website, Instagram, Google Maps) */}
              {(websiteUrl || instagram || googleMapsUrl) && (
                <div className="p-4 sm:px-5 flex flex-wrap gap-2 text-xs">
                  {websiteUrl && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
                      <Globe className="w-3 h-3 text-amber-400" />
                      Website linked
                    </span>
                  )}
                  {instagram && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
                      <InstagramIcon className="w-3 h-3 text-rose-400" />
                      @{instagram.replace(/^@/, "")}
                    </span>
                  )}
                  {googleMapsUrl && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
                      <Navigation className="w-3 h-3 text-sky-400" />
                      Google Maps linked
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Owner Account Claim Card */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Plot Ownership Claim</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                      Claim Ready
                    </span>
                  </div>
                  <p className="text-neutral-300 truncate mt-0.5">
                    Claiming under <strong className="text-white">{ownerEmailInput.trim()}</strong>.
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                    Every plot on Spotlight Bazaar is owned and managed. You can log into your Owner Dashboard anytime via passwordless Email OTP or password.
                  </p>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>

            {/* Directory Listing Consent */}
            <label className="flex items-start gap-3 p-4 rounded-xl bg-[#121215]/70 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-neutral-600 bg-neutral-900 accent-amber-500 cursor-pointer shrink-0"
              />
              <span className="text-xs text-neutral-300 leading-relaxed">
                I confirm I am authorized to list this business on Spotlight Bazaar&apos;s open 3D map and display this WhatsApp contact for direct customer inquiries.
              </span>
            </label>

            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                disabled={submitting}
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
                disabled={!consent || submitting || !canProceedStep2}
                onClick={handleSubmit}
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Spawning 3D Plot &amp; Claiming…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Spawn 3D Plot &amp; Claim Ownership</span>
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
