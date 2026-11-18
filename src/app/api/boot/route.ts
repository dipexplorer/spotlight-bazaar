import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/constants/categories";
import { getStorefronts } from "@/lib/data/seedStorefronts";
import { createServerClient } from "@/lib/supabase/server";
import { BootPayload, BusinessStorefront } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerClient();
  let storefrontsList = getStorefronts();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          id, slug, name, tagline, description, category_id, city_name, state_name, pincode,
          lat, lon, facing_bearing, road_anchor_lat, road_anchor_lon, connector_type,
          whatsapp_phone, instagram_handle, website_url, google_maps_url,
          starting_price, logo_url, is_verified, is_featured, total_views, total_leads,
          plot_level, bazaar_coins, plot_config, created_at,
          portfolio:portfolio_items(id, business_id, image_url, sort_order),
          active_posts:business_posts(id, business_id, post_type, title, details, coupon_code, cta_label, expires_at, clicks, created_at)
        `)
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const nowMs = Date.now();
        // Exclude legacy mock dev placeholders & prune any expired broadcasts
        const filtered = ((data as unknown) as BusinessStorefront[])
          .filter(
            (b) =>
              b.slug !== "studio-prism-guwahati" &&
              b.slug !== "northeast-brew-lab-guwahati" &&
              b.slug !== "brahmaputra-weaves-guwahati" &&
              b.slug !== "bandra-brew-lab-mumbai"
          )
          .map((b) => ({
            ...b,
            active_posts: Array.isArray(b.active_posts)
              ? b.active_posts
                  .filter((p) => new Date(p.expires_at).getTime() > nowMs)
                  .sort(
                    (a, c) =>
                      new Date(c.created_at).getTime() - new Date(a.created_at).getTime()
                  )
              : [],
          }));
        const hasNerqiva = filtered.some((b) => b.slug === "nerqiva-studio");
        storefrontsList = hasNerqiva
          ? filtered.map((b) =>
              b.slug === "nerqiva-studio"
                ? {
                    ...b,
                    lat: 26.20624167049662,
                    lon: 91.72925728895483,
                    pincode: "781030",
                    website_url: "https://www.nerqivastudio.in/",
                  }
                : b
            )
          : [...getStorefronts(), ...filtered];
      }
    } catch {
      // Fallback to seed data seamlessly if DB is unreachable
    }
  }

  // Calculate distinct cities count
  const distinctCities = new Set(storefrontsList.map((s) => s.city_name)).size;

  // Calculate counts per category
  const categoryCounts = new Map<string, number>();
  for (const s of storefrontsList) {
    categoryCounts.set(s.category_id, (categoryCounts.get(s.category_id) || 0) + 1);
  }

  const categories = CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    count: categoryCounts.get(c.id) || 0,
  }));

  // Return full business storefronts so drawers and 3D street have complete data
  const payload = {
    day: 1,
    total_storefronts: storefrontsList.length,
    total_cities: distinctCities,
    categories,
    featured_ids: storefrontsList.filter((s) => s.is_featured).map((s) => s.id),
    storefronts: storefrontsList,
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

