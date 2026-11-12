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
          id, slug, name, category_id, city_name, state_name, lat, lon, whatsapp_phone,
          starting_price, logo_url, is_verified, is_featured, total_views, total_leads, created_at,
          portfolio:portfolio_items(id, business_id, image_url, sort_order)
        `)
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        // Exclude legacy mock dev placeholders
        const filtered = ((data as unknown) as BusinessStorefront[]).filter(
          (b) =>
            b.slug !== "studio-prism-guwahati" &&
            b.slug !== "northeast-brew-lab-guwahati" &&
            b.slug !== "brahmaputra-weaves-guwahati" &&
            b.slug !== "bandra-brew-lab-mumbai"
        );
        const hasNerqiva = filtered.some((b) => b.slug === "nerqiva-studio");
        storefrontsList = hasNerqiva ? filtered : [...getStorefronts(), ...filtered];
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

