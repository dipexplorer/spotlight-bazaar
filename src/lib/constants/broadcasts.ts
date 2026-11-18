import { BroadcastType } from "@/types";

export interface BroadcastTypeMeta {
  id: BroadcastType;
  label: string;
  shortTag: string;
  defaultCta: string;
  placeholderTitle: string;
  placeholderDetails: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  hexAccent: string;
}

export const BROADCAST_TYPES: BroadcastTypeMeta[] = [
  {
    id: "deal",
    label: "Deal / Coupon",
    shortTag: "DEAL",
    defaultCta: "Claim Deal on WhatsApp",
    placeholderTitle: "e.g. 20% Off Pour-Over Coffee Today",
    placeholderDetails: "Valid on walk-ins and direct WhatsApp orders.",
    badgeBg: "bg-emerald-500/15",
    badgeBorder: "border-emerald-500/40",
    badgeText: "text-emerald-300",
    dotColor: "bg-emerald-400",
    hexAccent: "#10b981",
  },
  {
    id: "need",
    label: "Need Service / Dev",
    shortTag: "NEED HELP",
    defaultCta: "Offer Service on WhatsApp",
    placeholderTitle: "e.g. Looking for a Next.js Website Developer",
    placeholderDetails: "Need a fast booking site + WhatsApp automation for our studio.",
    badgeBg: "bg-sky-500/15",
    badgeBorder: "border-sky-500/40",
    badgeText: "text-sky-300",
    dotColor: "bg-sky-400",
    hexAccent: "#38bdf8",
  },
  {
    id: "hiring",
    label: "Hiring",
    shortTag: "HIRING",
    defaultCta: "Apply on WhatsApp",
    placeholderTitle: "e.g. Hiring Barista & Front-Desk Lead",
    placeholderDetails: "Full-time role · Share your CV or intro directly on WhatsApp.",
    badgeBg: "bg-violet-500/15",
    badgeBorder: "border-violet-500/40",
    badgeText: "text-violet-300",
    dotColor: "bg-violet-400",
    hexAccent: "#a78bfa",
  },
  {
    id: "event",
    label: "Event / Drop",
    shortTag: "LIVE EVENT",
    defaultCta: "RSVP on WhatsApp",
    placeholderTitle: "e.g. Saturday Acoustic Coffee Session · 6 PM",
    placeholderDetails: "Free entry · Limited rooftop seating.",
    badgeBg: "bg-amber-500/15",
    badgeBorder: "border-amber-500/40",
    badgeText: "text-amber-300",
    dotColor: "bg-amber-400",
    hexAccent: "#f59e0b",
  },
];

export const BROADCAST_TYPE_MAP = new Map<BroadcastType, BroadcastTypeMeta>(
  BROADCAST_TYPES.map((t) => [t.id, t])
);

export function formatTimeRemaining(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return "Expired";
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    return `${mins}m left`;
  }
  if (hours < 24) {
    return `${hours}h left`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h left` : `${days}d left`;
}

export function buildBroadcastWhatsAppUrl(params: {
  phone: string;
  businessName: string;
  postType: BroadcastType;
  title: string;
  couponCode?: string | null;
}): string {
  const cleanPhone = (params.phone || "").replace(/[^0-9]/g, "").slice(-10);
  const couponNote = params.couponCode ? ` (Code: ${params.couponCode})` : "";
  const prefixByType: Record<BroadcastType, string> = {
    deal: `Hi ${params.businessName}, I saw your live deal on Spotlight Bazaar: "${params.title}"${couponNote}. I'd like to claim it!`,
    need: `Hi ${params.businessName}, I saw your request on Spotlight Bazaar: "${params.title}". I can help with this — can we connect?`,
    hiring: `Hi ${params.businessName}, I saw your hiring post on Spotlight Bazaar: "${params.title}". I'd like to apply!`,
    event: `Hi ${params.businessName}, I saw your event on Spotlight Bazaar: "${params.title}". I'd like to RSVP / know more!`,
  };
  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(prefixByType[params.postType])}`;
}

