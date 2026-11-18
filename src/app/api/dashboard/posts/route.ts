import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["deal", "need", "hiring", "event"]);

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "business_id is required." }, { status: 400 });
  }

  // Verify ownership
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .single();

  if (!biz || biz.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data: posts, error } = await supabase
    .from("business_posts")
    .select("id, business_id, post_type, title, details, coupon_code, cta_label, expires_at, clicks, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: posts || [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { business_id, post_type, title, details, coupon_code, duration_days } = body;

    if (!business_id || typeof business_id !== "string") {
      return NextResponse.json({ error: "business_id is required." }, { status: 400 });
    }
    if (!post_type || !ALLOWED_TYPES.has(post_type)) {
      return NextResponse.json({ error: "Invalid broadcast type." }, { status: 400 });
    }
    if (!title || typeof title !== "string" || title.trim().length < 4) {
      return NextResponse.json(
        { error: "Broadcast headline must be at least 4 characters." },
        { status: 400 }
      );
    }

    // Verify business ownership
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", business_id)
      .single();

    if (!biz || biz.owner_id !== user.id) {
      return NextResponse.json({ error: "You do not own this business plot." }, { status: 403 });
    }

    // Enforce max 3 concurrent active broadcasts per business (keeps street clean & spam-free)
    const { count: activeCount } = await supabase
      .from("business_posts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business_id)
      .gt("expires_at", new Date().toISOString());

    if ((activeCount || 0) >= 3) {
      return NextResponse.json(
        { error: "You can have up to 3 active broadcasts at once. End an older one to post a new broadcast." },
        { status: 400 }
      );
    }

    const daysNum = Number(duration_days);
    const safeDays = daysNum === 1 || daysNum === 3 || daysNum === 7 ? daysNum : 7;
    const expiresAt = new Date(Date.now() + safeDays * 86400000).toISOString();

    const cleanCoupon =
      post_type === "deal" && typeof coupon_code === "string" && coupon_code.trim()
        ? coupon_code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24)
        : null;

    const { data: created, error: insertErr } = await supabase
      .from("business_posts")
      .insert({
        business_id,
        post_type,
        title: title.trim().slice(0, 100),
        details: typeof details === "string" && details.trim() ? details.trim().slice(0, 300) : null,
        coupon_code: cleanCoupon,
        expires_at: expiresAt,
      })
      .select("id, business_id, post_type, title, details, coupon_code, cta_label, expires_at, clicks, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to publish broadcast.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

