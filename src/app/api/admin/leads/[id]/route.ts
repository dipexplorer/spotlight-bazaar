import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { normalizeExternalUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/leads/[id]
 * Full admin update for any business profile attributes:
 * - name, tagline, description, category_id
 * - city_name, state_name, pincode, lat, lon
 * - whatsapp_phone, instagram_handle, website_url, google_maps_url, starting_price
 * - plot_level, bazaar_coins, plot_config
 * - is_verified, is_featured, status
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || "Nerqiva Admin authorization required." },
      { status: 401 }
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Business ID is required." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    // String fields
    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      updates.name = body.name.trim();
    }
    if (typeof body.tagline === "string") {
      updates.tagline = body.tagline.trim() || null;
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim() || null;
    }
    if (typeof body.category_id === "string" && body.category_id.trim().length > 0) {
      updates.category_id = body.category_id.trim();
    }
    if (typeof body.city_name === "string" && body.city_name.trim().length > 0) {
      updates.city_name = body.city_name.trim();
    }
    if (typeof body.state_name === "string" && body.state_name.trim().length > 0) {
      updates.state_name = body.state_name.trim();
    }
    if (typeof body.pincode === "string") {
      updates.pincode = body.pincode.replace(/\D/g, "").slice(0, 6) || null;
    }

    // Phone & Handles
    if (typeof body.whatsapp_phone === "string") {
      const clean = body.whatsapp_phone.replace(/\D/g, "").slice(-10);
      if (clean.length === 10) {
        updates.whatsapp_phone = clean;
      }
    }
    if (typeof body.instagram_handle === "string") {
      updates.instagram_handle = body.instagram_handle.replace(/^@/, "").trim() || null;
    }
    if (typeof body.website_url === "string") {
      updates.website_url = normalizeExternalUrl(body.website_url) || null;
    }
    if (typeof body.google_maps_url === "string") {
      updates.google_maps_url = normalizeExternalUrl(body.google_maps_url) || null;
    }
    if (typeof body.starting_price === "string") {
      updates.starting_price = body.starting_price.trim() || null;
    }

    // Coordinates
    if (typeof body.lat === "number" && !isNaN(body.lat)) {
      updates.lat = body.lat;
    }
    if (typeof body.lon === "number" && !isNaN(body.lon)) {
      updates.lon = body.lon;
    }

    // 3D & Gamification
    if (body.plot_level === 1 || body.plot_level === 2 || body.plot_level === 3) {
      updates.plot_level = body.plot_level;
    }
    if (typeof body.bazaar_coins === "number" && !isNaN(body.bazaar_coins)) {
      updates.bazaar_coins = Math.max(0, Math.floor(body.bazaar_coins));
    }
    if (body.plot_config && typeof body.plot_config === "object") {
      updates.plot_config = body.plot_config;
    }

    // Badges & Status
    if (typeof body.is_verified === "boolean") {
      updates.is_verified = body.is_verified;
    }
    if (typeof body.is_featured === "boolean") {
      updates.is_featured = body.is_featured;
    }
    if (
      body.status === "active" ||
      body.status === "pending" ||
      body.status === "suspended"
    ) {
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided to update." }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", id)
      .select(`
        id, slug, name, tagline, description, category_id, city_name, state_name, pincode,
        lat, lon, whatsapp_phone, instagram_handle, website_url, google_maps_url,
        starting_price, logo_url, is_verified, is_featured, status,
        total_views, total_leads, plot_level, bazaar_coins, plot_config, updated_at
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      business: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update business.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/leads/[id]
 * Permanently deletes a business and all cascaded data (posts, leads, portfolio).
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || "Nerqiva Admin authorization required." },
      { status: 401 }
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Business ID is required." }, { status: 400 });
  }

  try {
    // Delete business (PostgreSQL CASCADE foreign keys remove portfolio_items, lead_events, business_posts)
    const { error } = await supabase.from("businesses").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete business.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
