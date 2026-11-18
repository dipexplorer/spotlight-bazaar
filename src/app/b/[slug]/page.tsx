import { Metadata } from "next";
import { Suspense } from "react";
import { getStorefronts } from "@/lib/data/seedStorefronts";
import { createServerClient } from "@/lib/supabase/server";
import { BusinessStorefront } from "@/types";
import { StorefrontView } from "@/components/storefront/StorefrontView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getStorefront(slug: string): Promise<BusinessStorefront | null> {
  const supabase = createServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          id, slug, name, tagline, description, category_id, city_name, state_name,
          pincode, lat, lon, facing_bearing, road_anchor_lat, road_anchor_lon, connector_type,
          whatsapp_phone, instagram_handle, website_url, google_maps_url,
          starting_price, logo_url, is_verified, is_featured, total_views, total_leads, created_at,
          portfolio:portfolio_items(id, business_id, image_url, caption, sort_order),
          active_posts:business_posts(id, business_id, post_type, title, details, coupon_code, cta_label, expires_at, clicks, created_at)
        `)
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      if (!error && data) {
        const nowMs = Date.now();
        const rawItem = (data as unknown) as BusinessStorefront;
        const item: BusinessStorefront = {
          ...rawItem,
          active_posts: Array.isArray(rawItem.active_posts)
            ? rawItem.active_posts.filter((p) => new Date(p.expires_at).getTime() > nowMs)
            : [],
        };
        if (item.slug === "nerqiva-studio") {
          return {
            ...item,
            lat: 26.20624167049662,
            lon: 91.72925728895483,
            pincode: "781030",
            website_url: "https://www.nerqivastudio.in/",
          };
        }
        return item;
      }
    } catch {
      // Fallback to seeds
    }
  }

  // Fallback to in-memory/seed data
  const seed = getStorefronts().find((s) => s.slug === slug);
  return seed || null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await getStorefront(slug);

  if (!storefront) {
    return {
      title: "Storefront | Spotlight Bazaar",
      description: "Discover businesses on India's open business street.",
    };
  }

  const title = `${storefront.name} | ${storefront.city_name} on Spotlight Bazaar`;
  const description = storefront.tagline || `${storefront.name} in ${storefront.city_name}. View portfolio, rates, and connect on WhatsApp.`;
  const ogImage = storefront.logo_url || (storefront.portfolio && storefront.portfolio[0]?.image_url);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  const storefront = await getStorefront(slug);

  // LocalBusiness Schema.org JSON-LD
  const jsonLd = storefront
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: storefront.name,
        description: storefront.description || storefront.tagline,
        address: {
          "@type": "PostalAddress",
          addressLocality: storefront.city_name,
          addressRegion: storefront.state_name,
          postalCode: storefront.pincode,
          addressCountry: "IN",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: storefront.lat,
          longitude: storefront.lon,
        },
        telephone: `+91${storefront.whatsapp_phone}`,
        priceRange: storefront.starting_price,
        image: storefront.logo_url || storefront.portfolio?.[0]?.image_url,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center text-xs text-neutral-500">Loading storefront...</div>}>
        <StorefrontView initialStorefront={storefront} slug={slug} />
      </Suspense>
    </>
  );
}

