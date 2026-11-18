import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";
import { uploadStorefrontImage } from "@/lib/supabase/storage";
import { normalizeExternalUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Business ID is required." }, { status: 400 });
  }

  // Strict server-side ownership verification
  const { data: existing, error: fetchErr } = await supabase
    .from("businesses")
    .select("id, slug, owner_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }
  if (existing.owner_id !== user.id) {
    return NextResponse.json({ error: "You do not own this business plot." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (trimmed.length < 2) {
        return NextResponse.json({ error: "Business name must be at least 2 characters." }, { status: 400 });
      }
      updates.name = trimmed;
    }

    if (typeof body.tagline === "string") {
      updates.tagline = body.tagline.trim() || null;
    }

    if (typeof body.description === "string") {
      updates.description = body.description.trim() || null;
    }

    if (typeof body.category_id === "string" && body.category_id.trim()) {
      updates.category_id = body.category_id.trim();
    }

    if (typeof body.city_name === "string") {
      const trimmed = body.city_name.trim();
      if (trimmed.length < 2) {
        return NextResponse.json({ error: "City / Town is required." }, { status: 400 });
      }
      updates.city_name = trimmed;
    }

    if (typeof body.state_name === "string") {
      updates.state_name = body.state_name.trim() || "India";
    }

    if (typeof body.pincode === "string") {
      const digits = body.pincode.replace(/\D/g, "").slice(0, 6);
      updates.pincode = digits || null;
    }

    if (typeof body.starting_price === "string") {
      updates.starting_price = body.starting_price.trim() || null;
    }

    if (typeof body.whatsapp_phone === "string") {
      const cleanPhone = body.whatsapp_phone.replace(/[^0-9]/g, "").slice(-10);
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return NextResponse.json(
          { error: "Please enter a valid 10-digit Indian WhatsApp mobile number." },
          { status: 400 }
        );
      }
      updates.whatsapp_phone = cleanPhone;
    }

    if (typeof body.instagram_handle === "string") {
      updates.instagram_handle = body.instagram_handle.replace(/^@/, "").trim() || null;
    }

    if (typeof body.website_url === "string") {
      updates.website_url = normalizeExternalUrl(body.website_url);
    }

    if (typeof body.google_maps_url === "string") {
      updates.google_maps_url = normalizeExternalUrl(body.google_maps_url);
    }

    if (body.status === "active" || body.status === "pending") {
      updates.status = body.status;
    }

    // Optional portfolio images update (uploads new base64 photos to Supabase Storage CDN)
    let uploadedUrls: string[] | null = null;
    if (Array.isArray(body.portfolio_images)) {
      const rawList = body.portfolio_images
        .slice(0, 6)
        .filter((x: unknown): x is string => typeof x === "string" && x.length > 0);

      uploadedUrls = await Promise.all(
        rawList.map((img: string, idx: number) =>
          uploadStorefrontImage(supabase, existing.slug, img, idx)
        )
      );
      updates.logo_url = uploadedUrls[0] || null;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from("businesses")
        .update(updates)
        .eq("id", id)
        .eq("owner_id", user.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }

    if (uploadedUrls !== null) {
      await supabase.from("portfolio_items").delete().eq("business_id", id);
      if (uploadedUrls.length > 0) {
        const rows = uploadedUrls.map((url, idx) => ({
          business_id: id,
          image_url: url,
          sort_order: idx + 1,
        }));
        const { error: pErr } = await supabase.from("portfolio_items").insert(rows);
        if (pErr) {
          return NextResponse.json({ error: pErr.message }, { status: 500 });
        }
      }
    }

    const { data: refreshed } = await supabase
      .from("businesses")
      .select(`
        id, slug, name, tagline, description, category_id, city_name, state_name, pincode,
        lat, lon, facing_bearing, road_anchor_lat, road_anchor_lon, connector_type,
        whatsapp_phone, instagram_handle, website_url, google_maps_url,
        starting_price, logo_url, is_verified, is_featured, status,
        total_views, total_leads, owner_id, created_at, updated_at,
        portfolio:portfolio_items(id, business_id, image_url, caption, sort_order)
      `)
      .eq("id", id)
      .single();

    return NextResponse.json({ success: true, business: refreshed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update business.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Business ID is required." }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }
  if (existing.owner_id !== user.id) {
    return NextResponse.json({ error: "You do not own this business plot." }, { status: 403 });
  }

  const { error: delErr } = await supabase
    .from("businesses")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted_id: id });
}

