import { BusinessStorefront } from "@/types";

export const SEED_STOREFRONTS: BusinessStorefront[] = [
  {
    id: "nerqiva-studio",
    slug: "nerqiva-studio",
    name: "Nerqiva Studio",
    tagline: "Ultra-Premium Digital Products & Web Infrastructure",
    description: "Guwahati-based digital engineering studio crafting high-speed, conversion-optimized digital showrooms, web infrastructure, and mobile-first products (like LabLink Guwahati and the Luxury Bridal Engine) that replace clunky websites with luxury digital experiences.",
    category_id: "tech-freelance",
    city_name: "Guwahati",
    state_name: "Assam",
    pincode: "781001",
    lat: 26.1445,
    lon: 91.7362,
    whatsapp_phone: "9864012345",
    instagram_handle: "nq_insta",
    website_url: "https://nerqiva.com",
    starting_price: "Builds from ₹11,000",
    logo_url: "/mascot.jpg",
    is_verified: true,
    is_featured: true,
    total_views: 48,
    total_leads: 12,
    portfolio: [
      {
        id: "nq-p1",
        business_id: "nerqiva-studio",
        image_url: "/portfolio/nerqiva/lablink-guwahati.png",
        caption: "LabLink Guwahati — Mobile-First Diagnostic Booking Portal with Live Pincode Routing",
        sort_order: 1,
      },
      {
        id: "nq-p2",
        business_id: "nerqiva-studio",
        image_url: "/portfolio/nerqiva/luxury-bridal.png",
        caption: "The Luxury Bridal Engine — Kinetic Glassmorphism Editorial Showcase & Booking Funnel",
        sort_order: 2,
      },
      {
        id: "nq-p3",
        business_id: "nerqiva-studio",
        image_url: "/mascot.jpg",
        caption: "Spotlight Bazaar — Real-Time 3D Interactive High Street for Indian Commerce",
        sort_order: 3,
      },
    ],
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export const STOREFRONTS_REGISTRY: BusinessStorefront[] = [...SEED_STOREFRONTS];

export function getStorefronts(): BusinessStorefront[] {
  return STOREFRONTS_REGISTRY;
}

export function addLocalStorefront(storefront: BusinessStorefront) {
  const existingIndex = STOREFRONTS_REGISTRY.findIndex(
    (s) => s.id === storefront.id || s.slug === storefront.slug
  );
  if (existingIndex >= 0) {
    STOREFRONTS_REGISTRY[existingIndex] = storefront;
  } else {
    STOREFRONTS_REGISTRY.unshift(storefront);
  }
}
