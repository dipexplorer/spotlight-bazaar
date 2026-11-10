import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/constants/categories";
import { SEED_STOREFRONTS } from "@/lib/data/seedStorefronts";
import { createServerClient } from "@/lib/supabase/server";
import { BootPayload, BusinessStorefront } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerClient();
  let storefrontsList = SEED_STOREFRONTS;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          id, slug, name, category_id, city_name, state_name, lat, lon, whatsapp_phone,
          starting_price, logo_url, is_verified, is_featured, total_views, total_leads, created_at,
          portfolio:portfolio_items(id, business_id, image_url, sort_order)
        `)
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        storefrontsList = (data as unknown) as BusinessStorefront[];
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

  // Compact payload structure inspired by India Again's low-bandwidth schema
  const payload: BootPayload = {
    day: 1,
    total_storefronts: storefrontsList.length,
    total_cities: distinctCities,
    categories,
    featured_ids: storefrontsList.filter((s) => s.is_featured).map((s) => s.id),
    storefronts: storefrontsList.map((s) => [
      s.id,
      s.slug,
      s.name,
      s.category_id,
      s.city_name,
      s.lat,
      s.lon,
      s.starting_price || "",
      s.logo_url || (s.portfolio && s.portfolio[0]?.image_url) || "",
      s.is_verified,
      new Date(s.created_at).getTime(),
    ]),
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

