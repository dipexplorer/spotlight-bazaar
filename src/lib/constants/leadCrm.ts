import { BusinessStorefront, CategoryId } from "@/types";
import { BusinessPost } from "@/types";

export type LeadPriority = "HOT" | "HIGH" | "MEDIUM" | "LOW";

export type OpportunityKind =
  | "need"
  | "no_website"
  | "no_gmaps"
  | "high_engagement"
  | "general_optimization";

export interface EvaluatedLead {
  businessId: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  pincode: string;
  category: CategoryId;
  phone: string;
  cleanPhone: string;
  instagram: string;
  website: string | null;
  googleMaps: string | null;
  plotLevel: 1 | 2 | 3;
  bazaarCoins: number;
  totalViews: number;
  totalLeads: number;
  wavesCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  status: "active" | "pending" | "suspended";
  createdAt: string;

  // Intelligence
  hasWebsite: boolean;
  hasGoogleMaps: boolean;
  hasInstagram: boolean;
  activeNeedsService: BusinessPost[];
  activePosts: BusinessPost[];

  leadScore: number;
  leadPriority: LeadPriority;
  opportunityKind: OpportunityKind;
  opportunitySummary: string;
  suggestedService: string;
  suggestedPriceFormatted: string;

  // Brutally honest 2-message script
  outreachMessage1: string;
  outreachMessage2: string;
  combinedScript: string;
  whatsAppClickUrl: string;
  instagramDirectUrl: string;
}

const CATEGORY_PRICING: Record<CategoryId, { price: string; service: string }> = {
  "food-hospitality": {
    price: "₹6,800",
    service: "Single-page visual menu + direct WhatsApp takeaway ordering system",
  },
  "creative-weddings": {
    price: "₹8,400",
    service: "Editorial photography portfolio + date availability inquiry funnel",
  },
  "artisan-retail": {
    price: "₹7,200",
    service: "Curated product catalog + WhatsApp checkout without marketplace cuts",
  },
  "tech-freelance": {
    price: "₹9,600",
    service: "High-conversion agency landing page with live interactive case studies",
  },
  "beauty-wellness": {
    price: "₹6,400",
    service: "Service rate card + 1-click slot booking page",
  },
  "coaching-education": {
    price: "₹8,900",
    service: "Course curriculum overview + student enrollment inquiry page",
  },
  "home-services": {
    price: "₹5,800",
    service: "Service area rate card + instant call/WhatsApp lead capture page",
  },
  "other-business": {
    price: "₹6,500",
    service: "Fast, branded single-page website with instant WhatsApp contact",
  },
};

/**
 * Evaluates a registered business using Nerqiva's lead qualification matrix
 * and crafts an objective, brutally honest 2-message cold outreach script.
 */
export function evaluateNerqivaLead(
  business: BusinessStorefront & {
    status?: "active" | "pending" | "suspended";
    owner_id?: string | null;
  },
  activePosts: BusinessPost[] = [],
  wavesCount: number = 0
): EvaluatedLead {
  const hasWebsite = Boolean(business.website_url && business.website_url.trim().length > 0);
  const hasGoogleMaps = Boolean(
    business.google_maps_url && business.google_maps_url.trim().length > 0
  );
  const hasInstagram = Boolean(
    business.instagram_handle && business.instagram_handle.trim().length > 0
  );

  const cleanPhone = (business.whatsapp_phone || "").replace(/\D/g, "").slice(-10);
  const rawCity = business.city_name || "India";
  const city = rawCity.replace(/\s*\([^)]*\)/g, "").trim(); // "North Guwahati (Pt)" -> "North Guwahati"

  const now = Date.now();
  const validActivePosts = activePosts.filter(
    (p) => new Date(p.expires_at).getTime() > now
  );
  const activeNeedsService = validActivePosts.filter((p) => p.post_type === "need");

  const pricing = CATEGORY_PRICING[business.category_id] || CATEGORY_PRICING["other-business"];

  // 1. Determine Opportunity & Score
  let leadScore = 40;
  let leadPriority: LeadPriority = "LOW";
  let opportunityKind: OpportunityKind = "general_optimization";
  let opportunitySummary = "Established web setup; potential for performance or 3D upgrade.";

  if (activeNeedsService.length > 0) {
    // Highest intent: they posted an active request on the 3D map asking for a developer/service!
    leadScore = 95;
    leadPriority = "HOT";
    opportunityKind = "need";
    const postTitle = activeNeedsService[0].title;
    opportunitySummary = `Posted live street broadcast requesting: "${postTitle}". Active immediate intent.`;
  } else if (!hasWebsite && hasInstagram && cleanPhone.length === 10) {
    // Transacting purely through Instagram DMs / WhatsApp without an owned website
    leadScore = 86;
    leadPriority = "HOT";
    opportunityKind = "no_website";
    opportunitySummary = `Takes bookings/orders via Instagram (@${business.instagram_handle}) and WhatsApp, with zero owned website.`;
  } else if (!hasWebsite) {
    leadScore = 76;
    leadPriority = "HIGH";
    opportunityKind = "no_website";
    opportunitySummary = "Registered high-street plot on Spotlight Bazaar but has no official website URL.";
  } else if (!hasGoogleMaps) {
    leadScore = 64;
    leadPriority = "MEDIUM";
    opportunityKind = "no_gmaps";
    opportunitySummary = "Has website but missing verified Google Business Profile link for local map searches.";
  } else if ((business.total_leads || 0) >= 3 || (business.total_views || 0) >= 20) {
    leadScore = 68;
    leadPriority = "MEDIUM";
    opportunityKind = "high_engagement";
    opportunitySummary = "High organic engagement on Spotlight Bazaar; strong candidate for digital retainers.";
  }

  // 2. Draft Brutally Honest 2-Message Outreach Script (Nerqiva framework: 40-70 words total, zero fluff)
  let outreachMessage1 = "";
  let outreachMessage2 = "";

  if (opportunityKind === "need") {
    const postTitle = activeNeedsService[0]?.title || "web services";
    outreachMessage1 = `Hi, I saw your live post on Spotlight Bazaar looking for ${postTitle} for ${business.name} in ${city}.`;
    outreachMessage2 = `We build custom web systems and digital products at Nerqiva Studio. It usually runs around ${pricing.price} one-time. Can I send you a quick 2-minute demo link to look at?`;
  } else if (opportunityKind === "no_website") {
    if (hasInstagram) {
      outreachMessage1 = `Hi, I noticed you're handling customer orders and inquiries for ${business.name} in ${city} through Instagram and WhatsApp, without an official website.`;
    } else {
      outreachMessage1 = `Hi, I came across ${business.name} in ${city} on Spotlight Bazaar and saw you're taking customer inquiries purely through WhatsApp.`;
    }
    outreachMessage2 = `At Nerqiva, we build clean, fast websites that put your rates, photos, and direct WhatsApp orders in one place. It usually runs around ${pricing.price} one-time. Would you like to see a quick demo?`;
  } else if (opportunityKind === "no_gmaps") {
    outreachMessage1 = `Hi, I noticed ${business.name} has an active website, but your official Google Maps business profile isn't linked for local searchers in ${city}.`;
    outreachMessage2 = `We help local businesses set up verified Google Map listings and local SEO at Nerqiva. It usually runs around ₹3,800 one-time. Can I share a quick breakdown if you'd like to see it?`;
  } else {
    outreachMessage1 = `Hi, I came across ${business.name} on Spotlight Bazaar — great to see your 3D plot active in ${city}.`;
    outreachMessage2 = `At Nerqiva, we engineer high-performance web infrastructure and 3D digital storefronts for growing businesses. Let me know if you'd like to see a quick demo of how we upgrade digital conversions.`;
  }

  const combinedScript = `${outreachMessage1}\n\n${outreachMessage2}`;
  const encodedText = encodeURIComponent(combinedScript);
  const whatsAppClickUrl = cleanPhone.length === 10 ? `https://wa.me/91${cleanPhone}?text=${encodedText}` : "";
  const instagramDirectUrl = business.instagram_handle
    ? `https://instagram.com/${business.instagram_handle.replace(/^@/, "")}`
    : "";

  return {
    businessId: business.id,
    slug: business.slug,
    name: business.name,
    city: business.city_name || "India",
    state: business.state_name || "India",
    pincode: business.pincode || "",
    category: business.category_id,
    phone: business.whatsapp_phone,
    cleanPhone,
    instagram: business.instagram_handle || "",
    website: business.website_url || null,
    googleMaps: business.google_maps_url || null,
    plotLevel: (business.plot_level === 3 ? 3 : business.plot_level === 2 ? 2 : 1) as 1 | 2 | 3,
    bazaarCoins: business.bazaar_coins || 50,
    totalViews: business.total_views || 0,
    totalLeads: business.total_leads || 0,
    wavesCount,
    isVerified: Boolean(business.is_verified),
    isFeatured: Boolean(business.is_featured),
    status: (business.status as "active" | "pending" | "suspended") || "active",
    createdAt: business.created_at || new Date().toISOString(),

    hasWebsite,
    hasGoogleMaps,
    hasInstagram,
    activeNeedsService,
    activePosts: validActivePosts,

    leadScore,
    leadPriority,
    opportunityKind,
    opportunitySummary,
    suggestedService: pricing.service,
    suggestedPriceFormatted: pricing.price,

    outreachMessage1,
    outreachMessage2,
    combinedScript,
    whatsAppClickUrl,
    instagramDirectUrl,
  };
}
