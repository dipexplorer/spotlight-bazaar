import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(`
      id, slug, name, tagline, description, category_id, city_name, state_name, pincode,
      lat, lon, facing_bearing, road_anchor_lat, road_anchor_lon, connector_type,
      whatsapp_phone, instagram_handle, website_url, google_maps_url,
      starting_price, logo_url, is_verified, is_featured, status,
      total_views, total_leads, owner_id, created_at, updated_at,
      portfolio:portfolio_items(id, business_id, image_url, caption, sort_order)
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const businessList = businesses || [];
  const businessIds = businessList.map((b) => b.id);

  // Aggregate real lead_events analytics (waves, whatsapp clicks, 7-day events) per owned business
  const statsByBiz = new Map<
    string,
    { waves: number; whatsapp_clicks: number; events_7d: number }
  >();

  if (businessIds.length > 0) {
    const { data: events } = await supabase
      .from("lead_events")
      .select("business_id, event_type, created_at")
      .in("business_id", businessIds);

    const sevenDaysAgo = Date.now() - 7 * 86400000;
    for (const ev of events || []) {
      const entry = statsByBiz.get(ev.business_id) || {
        waves: 0,
        whatsapp_clicks: 0,
        events_7d: 0,
      };
      if (ev.event_type === "wave") entry.waves += 1;
      if (ev.event_type === "whatsapp_click") entry.whatsapp_clicks += 1;
      if (ev.created_at && new Date(ev.created_at).getTime() >= sevenDaysAgo) {
        entry.events_7d += 1;
      }
      statsByBiz.set(ev.business_id, entry);
    }
  }

  const enriched = businessList.map((b) => {
    const sortedPortfolio = Array.isArray(b.portfolio)
      ? [...b.portfolio].sort((a, c) => (a.sort_order || 0) - (c.sort_order || 0))
      : [];
    const evStats = statsByBiz.get(b.id) || {
      waves: 0,
      whatsapp_clicks: 0,
      events_7d: 0,
    };
    return {
      ...b,
      portfolio: sortedPortfolio,
      analytics: evStats,
    };
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email || "",
    },
    businesses: enriched,
  });
}

