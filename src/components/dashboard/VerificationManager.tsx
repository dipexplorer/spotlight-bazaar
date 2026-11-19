"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  ImagePlus,
  Loader2,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { compressImage } from "@/lib/utils/compressImage";

interface VerificationManagerProps {
  businessId: string;
  businessName: string;
  businessSlug: string;
  isVerified: boolean;
  verificationStatus?: "none" | "pending" | "verified" | "rejected";
  verificationNotes?: string | null;
  verificationDocumentUrl?: string | null;
  verificationRequestedAt?: string | null;
  accessToken: string;
  onVerificationSubmitted?: (updatedStatus: "pending", notes: string) => void;
}

export function VerificationManager({
  businessId,
  businessName,
  businessSlug,
  isVerified,
  verificationStatus = "none",
  verificationNotes,
  verificationDocumentUrl,
  verificationRequestedAt,
  accessToken,
  onVerificationSubmitted,
}: VerificationManagerProps) {
  const [docNotes, setDocNotes] = useState("");
  const [docImage, setDocImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  const status = isVerified ? "verified" : verificationStatus;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setDocImage(compressed);
      setErrorMsg(null);
    } catch {
      setErrorMsg("Failed to process document photo. Please choose a JPG, PNG, or WebP image.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNotes.trim() || docNotes.trim().length < 5) {
      setErrorMsg("Please provide your official business registration details or license number.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/dashboard/businesses/${businessId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          document_notes: docNotes.trim(),
          document_image: docImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit verification request.");
      }

      setSuccessMsg(data.message || "Verification request submitted successfully!");
      onVerificationSubmitted?.("pending", docNotes.trim());
      setShowResubmitForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. VERIFIED STATE */}
      {status === "verified" && (
        <section
          aria-label="Verification Status: Verified"
          className="p-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/35 space-y-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono">
                  OFFICIAL VERIFIED BADGE
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {businessName} is Verified
                </h2>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-lg">
                  Your business plot carries the official cyan verification shield on India&apos;s 3D street map,
                  giving local customers, corporate clients, and tourists full authenticity confidence.
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-xs font-semibold text-cyan-300">
              Active on Map
            </span>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-cyan-500/20">
            <div className="p-3 rounded-xl bg-[#09090b]/60 border border-cyan-500/20 space-y-1">
              <span className="text-neutral-400 font-medium">3D Sky Badge</span>
              <p className="text-neutral-100 font-semibold">Cyan Shield over Plot</p>
            </div>
            <div className="p-3 rounded-xl bg-[#09090b]/60 border border-cyan-500/20 space-y-1">
              <span className="text-neutral-400 font-medium">Search Ranking</span>
              <p className="text-neutral-100 font-semibold">Priority Omnibox Placement</p>
            </div>
            <div className="p-3 rounded-xl bg-[#09090b]/60 border border-cyan-500/20 space-y-1">
              <span className="text-neutral-400 font-medium">WhatsApp Leads</span>
              <p className="text-neutral-100 font-semibold">Verified Merchant Tag</p>
            </div>
          </div>
        </section>
      )}

      {/* 2. PENDING REVIEW STATE */}
      {status === "pending" && !showResubmitForm && (
        <section
          aria-label="Verification Status: Pending Review"
          className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/35 space-y-4 shadow-xl"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono">
                UNDER REVIEW · 2-4 HOURS
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Verification Request Under Review
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-lg">
                We have received your verification request for <strong className="text-white">{businessName}</strong>.
                Our regional verification team is reviewing your submitted registration details.
              </p>
            </div>
          </div>

          {verificationNotes && (
            <div className="p-3.5 rounded-xl bg-[#09090b]/70 border border-amber-500/20 text-xs space-y-1">
              <span className="text-neutral-400 font-medium">Submitted Details:</span>
              <p className="text-neutral-200 font-mono leading-relaxed">{verificationNotes}</p>
            </div>
          )}

          {verificationDocumentUrl && (
            <div className="text-xs">
              <a
                href={verificationDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-medium"
              >
                <span>View Submitted Document Photo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-xs text-neutral-400 border-t border-amber-500/20">
            <span>
              {verificationRequestedAt
                ? `Submitted on ${new Date(verificationRequestedAt).toLocaleDateString()}`
                : "Submitted recently"}
            </span>
            <button
              type="button"
              onClick={() => setShowResubmitForm(true)}
              className="text-amber-400 hover:underline font-medium"
            >
              Update submitted details
            </button>
          </div>
        </section>
      )}

      {/* 3. REJECTED STATE */}
      {status === "rejected" && !showResubmitForm && (
        <section
          aria-label="Verification Status: Action Needed"
          className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/35 space-y-4 shadow-xl"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono">
                ACTION NEEDED
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Verification Details Need Update
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-lg">
                Your previous verification submission could not be verified.
                {verificationNotes && ` Reviewer note: "${verificationNotes}"`}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowResubmitForm(true)}
              className="min-h-[42px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              <span>Resubmit with Correct Proof</span>
            </button>
          </div>
        </section>
      )}

      {/* 4. SUBMIT / RESUBMIT APPLICATION FORM */}
      {(status === "none" || showResubmitForm) && (
        <section aria-label="Request Verification" className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#121215] border border-neutral-800 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Request Verified Checkmark Badge
                  </h2>
                  <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
                    Get an official cyan badge pinned to your 3D building on India&apos;s map. Verified storefronts
                    gain trust, priority ranking in city searches, and direct buyer credibility.
                  </p>
                </div>
              </div>

              {showResubmitForm && (
                <button
                  type="button"
                  onClick={() => setShowResubmitForm(false)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Verification Benefits Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3.5 rounded-xl bg-[#09090b] border border-neutral-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>3.4x Higher Inquiries</span>
                </span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Shoppers and business partners prioritize verified pins over unverified listings.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#09090b] border border-neutral-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>3D Map Sky-Badge</span>
                </span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Floating 3D verified badge visible directly from high street and aerial zoom tiers.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#09090b] border border-neutral-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Permanent Immunity</span>
                </span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Verified storefront plots are permanently safeguarded against claim disputes.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/35 text-xs text-red-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs text-emerald-200 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Application Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
              <div className="space-y-1.5">
                <label htmlFor="verify-notes" className="text-neutral-200 font-semibold block">
                  Official Business Registration / License Number *
                </label>
                <textarea
                  id="verify-notes"
                  rows={3}
                  required
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="Enter your GSTIN, MSME Udyam No., Trade License, or Shop & Establishment Act registration. If you are an artisan/home maker, describe your workshop location and years in business."
                  className="w-full p-3.5 rounded-xl bg-[#09090b] border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500/75 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Document Photo Upload */}
              <div className="space-y-1.5">
                <label className="text-neutral-200 font-semibold block">
                  Storefront Signage Board or Business Document Photo (Optional)
                </label>

                {docImage ? (
                  <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 max-w-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={docImage} alt="Verification document preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setDocImage(null)}
                      aria-label="Remove document photo"
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="verify-doc-upload"
                    className="flex flex-col items-center justify-center w-full min-h-[110px] p-4 rounded-xl border border-dashed border-neutral-700 hover:border-cyan-500/60 bg-[#09090b] cursor-pointer transition-colors text-center"
                  >
                    <ImagePlus className="w-5 h-5 text-neutral-400 mb-1" />
                    <span className="text-xs font-semibold text-neutral-200">
                      Upload Storefront Signage or Registration Document
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Photo of your physical store board, visiting card, or certificate (JPG, PNG, WebP)
                    </span>
                    <input
                      id="verify-doc-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[46px] px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-cyan-950/50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting for Review…</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Verification Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
