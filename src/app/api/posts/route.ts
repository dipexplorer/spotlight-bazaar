import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["deal", "need", "hiring", "event"]);

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ posts: [] }, { status: 200 });
  }

  const typeParam = req.nextUrl.searchParams.get("type");
  const businessId = req.nextUrl.searchParams.get("business_id");

  let query = supabase
    .from("business_posts")
    .select(`
      id, business_id, post_type, title, details, coupon_code, cta_label, expires_at, clicks, created_at,
      business:businesses!inner(
        id, slug, name, city_name, state_name, pincode, lat, lon, whatsapp_phone, category_id, logo_url, status
      )
    `)
    .gt("expires_at", new Date().toISOString())
    .eq("business.status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  if (typeParam && ALLOWED_TYPES.has(typeParam)) {
    query = query.eq("post_type", typeParam);
  }
  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message, posts: [] }, { status: 500 });
  }

  return NextResponse.json(
    { posts: data || [] },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}

