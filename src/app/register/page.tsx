"use client";

import React, { useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MapPin,
  Upload,
  X,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants/categories";
import { INITIAL_CITIES } from "@/lib/constants/initialCities";
import { CategoryId, BusinessStorefront } from "@/types";
import { compressImage } from "@/lib/utils/compressImage";
import { saveLocalStorefront } from "@/lib/utils/localStorefront";
import { ShareCardModal } from "@/components/onboarding/ShareCardModal";

export default function RegisterPage() {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState<CategoryId>("creative-weddings");
  const [city, setCity] = useState("Guwahati");
  const [pincode, setPincode] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [consent, setConsent] = useState(false);

  // Success Modal State
  const [createdStorefront, setCreatedStorefront] = useState<BusinessStorefront | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Read pre-selected city from URL params (e.g. /register?city=guwahati&plot=2)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get("city");
    if (cityParam) {
      const matched = INITIAL_CITIES.find(
        (c) =>
          c.slug.toLowerCase() === cityParam.toLowerCase() ||
          c.name.toLowerCase() === cityParam.toLowerCase()
      );
      if (matched) {
        setCity(matched.name);
      }
    }
  }, []);

  // Step 1 Validation
  const canProceedStep1 = name.trim().length >= 2 && city.trim().length > 0;

  // Step 2 Validation (Indian 10-digit phone regex)
  const cleanPhone = whatsapp.replace(/[^0-9]/g, "").slice(-10);
  const isValidPhone = /^[6-9]\d{9}$/.test(cleanPhone);
  const canProceedStep2 = isValidPhone && startingPrice.trim().length > 0;

  // Step 3 Validation (at least 1 image)
  const canProceedStep3 = portfolio.length >= 1;

  // Image Upload Handler with client-side compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (portfolio.length + files.length > 6) {
      setErrorMsg("Maximum 6 portfolio photos allowed.");
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
      setErrorMsg("Failed to process images. Please try different photos.");
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (idx: number) => {
    setPortfolio((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submission Handler
  const handleSubmit = async () => {
    if (!consent) {
      setErrorMsg("Please accept the directory listing consent to proceed.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const selectedCity = INITIAL_CITIES.find(
      (c) => c.name.toLowerCase() === city.toLowerCase()
    );

    const payload = {
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      category_id: category,
      city_name: city.trim(),
      pincode: pincode.trim() || undefined,
      whatsapp_phone: cleanPhone,
      instagram_handle: instagram.replace(/^@/, "").trim() || undefined,
      starting_price: startingPrice.trim(),
      lat: selectedCity ? selectedCity.lat : 26.1445,
      lon: selectedCity ? selectedCity.lon : 91.7362,
      portfolio_images: portfolio,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Optimistic local storefront object
      const newStorefront: BusinessStorefront = {
        id: data.id || `sb-${Date.now()}`,
        slug: data.slug,
        name: payload.name,
        tagline: payload.tagline,
        category_id: payload.category_id,
        city_name: payload.city_name,
        state_name: selectedCity?.state || "India",
        pincode: payload.pincode,
        lat: payload.lat,
        lon: payload.lon,
        whatsapp_phone: payload.whatsapp_phone,
        instagram_handle: payload.instagram_handle,
        starting_price: payload.starting_price,
        logo_url: portfolio[0] || "",
        is_verified: false,
        is_featured: false,
        total_views: 1,
        total_leads: 0,
        portfolio: portfolio.map((url, i) => ({
          id: `p-${i}`,
          business_id: data.id,
          image_url: url,
          sort_order: i + 1,
        })),
        created_at: new Date().toISOString(),
      };

      // Save to localStorage for instant local preview
      saveLocalStorefront(newStorefront);
      setCreatedStorefront(newStorefront);

      // Trigger Confetti Blast
      confetti({
        particleCount: 90,
        spread: 65,
        origin: { y: 0.6 },
        colors: ["#f43f5e", "#f59e0b", "#10b981", "#ffffff"],
      });

      // Open Story Share Card Modal
      setIsShareModalOpen(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col items-center justify-between p-4 md:p-8">
      {/* Top Header */}
      <header className="w-full max-w-xl flex items-center justify-between py-4 border-b border-neutral-850">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Map</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono tabular-nums">
          <span>{step} of 4</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full max-w-xl h-1 bg-neutral-900 overflow-hidden my-3 rounded-full">
        <div
          className="h-full bg-rose-600 transition-all duration-300 ease-out"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Form Container */}
      <div className="w-full max-w-xl flex-1 flex flex-col justify-center my-4">
        <div className="rounded-3xl bg-neutral-950 border border-neutral-800 p-6 md:p-8 shadow-2xl">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  What is your business called?
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Claim your storefront name and category on India&apos;s open business map.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Business Name *
                </label>
                <input
                  type="text"
                  autoComplete="organization"
                  autoCapitalize="words"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Studio Prism, Cafe Nirvana, Rohan Photography"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 text-sm text-white placeholder:text-neutral-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  One-Line Description
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Candid Wedding Photography across Assam"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 text-sm text-white placeholder:text-neutral-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-2">
                  Category (Open Elective) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2 ${
                        category === cat.id
                          ? "bg-rose-500/10 border-rose-500 text-white shadow-sm"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${category === cat.id ? "text-rose-400" : "text-neutral-500"}`} />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    City / Town *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 text-sm text-white"
                  >
                    {INITIAL_CITIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Pin Code (Optional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 781001"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 text-sm text-white placeholder:text-neutral-500 tabular-nums"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
                className="w-full mt-2 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-950/40"
              >
                <span>Continue to Rates & Contact</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: CONTACT & RATES */}
          {step === 2 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  How should clients reach you?
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Inquiries are delivered directly to your WhatsApp. No middleman, no telemarketers.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  WhatsApp Business Number *
                </label>
                <div className="flex items-center rounded-xl bg-neutral-900 border border-neutral-800 focus-within:border-rose-500 overflow-hidden">
                  <span className="px-3 py-3 text-xs text-neutral-400 font-mono border-r border-neutral-800 bg-neutral-950">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={10}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="9864012345"
                    className="w-full px-4 py-3 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none tabular-nums"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Never shared with cold-call centers. Used solely for 1-tap client chat.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Starting Package / Rate *
                </label>
                <input
                  type="text"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  placeholder="e.g. Starts ₹25,000 / day, or Coffee from ₹150"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 text-sm text-white placeholder:text-neutral-500"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Transparent starting prices filter out tire-kickers and bring qualified buyers.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Instagram Handle (Optional)
                </label>
                <div className="flex items-center rounded-xl bg-neutral-900 border border-neutral-800 focus-within:border-rose-500 overflow-hidden">
                  <span className="px-3 py-3 text-xs text-neutral-400 font-mono border-r border-neutral-800 bg-neutral-950">
                    @
                  </span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="yourstudiocraft"
                    className="w-full px-4 py-3 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-950/40"
                >
                  <span>Continue to Portfolio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PORTFOLIO */}
          {step === 3 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Upload your best work
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Upload 1 to 6 photos. Compressed automatically in your browser for instant loading.
                </p>
              </div>

              {/* Upload Dropzone */}
              {portfolio.length < 6 && (
                <label className="border-2 border-dashed border-neutral-800 hover:border-rose-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-neutral-900/40">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={compressing}
                    className="hidden"
                  />
                  {compressing ? (
                    <div className="flex items-center gap-2 text-xs text-rose-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Optimizing image resolution...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-rose-600/10 flex items-center justify-center text-rose-500">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-white">Tap to upload photos</span>
                      <span className="text-[11px] text-neutral-400">JPG, PNG, WebP (Max 6 photos)</span>
                    </>
                  )}
                </label>
              )}

              {/* Previews Grid */}
              {portfolio.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {portfolio.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] uppercase bg-rose-600 text-white font-semibold">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep3 || compressing}
                  onClick={() => setStep(4)}
                  className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-950/40"
                >
                  <span>Review & Claim</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {step === 4 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Ready to claim your storefront?
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Review your listing details before going live on the map.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Business:</span>
                  <span className="font-semibold text-white">{name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Location:</span>
                  <span className="text-neutral-200">{city} {pincode ? `(${pincode})` : ""}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="text-neutral-400">WhatsApp:</span>
                  <span className="font-mono text-emerald-400 tabular-nums">+91 {cleanPhone}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Starting Price:</span>
                  <span className="font-semibold text-amber-400 tabular-nums">{startingPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Photos:</span>
                  <span className="text-neutral-200">{portfolio.length} uploaded</span>
                </div>
              </div>

              {/* Mandatory DPDP Consent */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-700 text-rose-600 focus:ring-0"
                />
                <span className="text-[11px] text-neutral-300 leading-relaxed">
                  I consent to publicly listing my business details (Name, City, Category, Portfolio, and WhatsApp number) on Spotlight Bazaar for direct client discovery under India&apos;s DPDP Act standards.
                </span>
              </label>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={submitting}
                  className="py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!consent || submitting}
                  onClick={handleSubmit}
                  className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-950/40"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Erecting Your Storefront...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Claim My Storefront Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Card Modal on Success */}
      {createdStorefront && (
        <ShareCardModal
          storefront={createdStorefront}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </main>
  );
}
