import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";
import { getStorefronts } from "@/lib/data/seedStorefronts";
import { BusinessPost } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["deal", "need", "hiring", "event"]);

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const businessId = req.nextUrl.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "business_id is required." }, { status: 400 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    const all = getStorefronts();
    const found = all.find((b) => b.id === businessId || b.slug === businessId);
    return NextResponse.json({ posts: found?.active_posts || [] });
  }

  // Verify ownership
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .single();

  if (!biz || biz.owner_id !== user.id) {
    // If not found in DB, check local registry for demo fallback
    const all = getStorefronts();
    const found = all.find((b) => b.id === businessId || b.slug === businessId);
    if (found) {
      return NextResponse.json({ posts: found.active_posts || [] });
    }
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

    const supabase = createServerClient();
    if (!supabase) {
      const all = getStorefronts();
      const found = all.find((b) => b.id === business_id || b.slug === business_id);
      if (!found) {
        return NextResponse.json({ error: "Business not found." }, { status: 404 });
      }
      const newPost: BusinessPost = {
        id: `post-local-${Date.now()}`,
        business_id,
        post_type,
        title: title.trim(),
        details: details ? details.trim() : "",
        coupon_code: coupon_code ? coupon_code.trim().toUpperCase() : undefined,
        cta_label: "Avail Offer",
        expires_at: new Date(Date.now() + (duration_days || 7) * 86400000).toISOString(),
        clicks: 0,
        created_at: new Date().toISOString(),
      };
      found.active_posts = [newPost, ...(found.active_posts || [])];
      return NextResponse.json({ success: true, post: newPost }, { status: 201 });
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

    const expiresAt = new Date(
      Date.now() + (Number(duration_days) || 7) * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: post, error } = await supabase
      .from("business_posts")
      .insert({
        business_id,
        post_type,
        title: title.trim(),
        details: details ? details.trim() : null,
        coupon_code: coupon_code ? coupon_code.trim().toUpperCase() : null,
        expires_at: expiresAt,
        cta_label: "Avail Offer",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
