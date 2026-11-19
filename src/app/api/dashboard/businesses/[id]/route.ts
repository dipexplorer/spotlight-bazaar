import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";
import { uploadStorefrontImage } from "@/lib/supabase/storage";
import { normalizeExternalUrl } from "@/lib/utils";
import {
  computeEarnedBazaarCoins,
  PLOT_LEVEL_TIERS,
  sanitizePlotConfig,
} from "@/lib/constants/plotUpgrades";

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
    .select(
      "id, slug, owner_id, plot_level, bazaar_coins, description, website_url, google_maps_url, instagram_handle, logo_url, total_views, total_leads"
    )
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

    // 3D Plot Architectural Customization (strictly whitelisted colors, finishes & roof tag)
    if (body.plot_config && typeof body.plot_config === "object") {
      updates.plot_config = sanitizePlotConfig(body.plot_config);
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

    // Anti-cheat server-side Bazaar Coin verification for Level 2 / Level 3 architectural upgrades
    const requestedLevel =
      typeof body.upgrade_to_level === "number" ? body.upgrade_to_level : null;
    if (requestedLevel !== null) {
      if (requestedLevel !== 2 && requestedLevel !== 3) {
        return NextResponse.json(
          { error: "Invalid upgrade level. Only Level 2 or Level 3 upgrades are supported." },
          { status: 400 }
        );
      }
      const currentLevel = existing.plot_level || 1;
      if (requestedLevel <= currentLevel) {
        return NextResponse.json(
          { error: `Your 3D plot is already at Level ${currentLevel}.` },
          { status: 400 }
        );
      }

      const [{ data: portfolioRows }, { data: waveRows }, { data: postRows }] =
        await Promise.all([
          supabase.from("portfolio_items").select("id").eq("business_id", id),
          supabase
            .from("lead_events")
            .select("id")
            .eq("business_id", id)
            .eq("event_type", "wave"),
          supabase.from("business_posts").select("id").eq("business_id", id),
        ]);

      const nextDesc =
        typeof updates.description === "string"
          ? updates.description
          : existing.description || "";
      const nextWebsite =
        "website_url" in updates
          ? (updates.website_url as string | null)
          : existing.website_url;
      const nextGmaps =
        "google_maps_url" in updates
          ? (updates.google_maps_url as string | null)
          : existing.google_maps_url;
      const nextInsta =
        "instagram_handle" in updates
          ? (updates.instagram_handle as string | null)
          : existing.instagram_handle;
      const photosCount =
        uploadedUrls !== null
          ? uploadedUrls.length
          : (portfolioRows?.length || 0) || (existing.logo_url ? 1 : 0);

      const serverAudit = computeEarnedBazaarCoins({
        photosCount,
        hasWebsite: Boolean(nextWebsite && nextWebsite.trim().length > 0),
        hasGoogleMaps: Boolean(nextGmaps && nextGmaps.trim().length > 0),
        hasDescription: Boolean(nextDesc && nextDesc.trim().length >= 30),
        hasInstagram: Boolean(nextInsta && nextInsta.trim().length > 0),
        totalViews: existing.total_views || 0,
        totalLeads: existing.total_leads || 0,
        wavesCount: waveRows?.length || 0,
        broadcastsCount: postRows?.length || 0,
      });

      const effectiveCoins = Math.max(existing.bazaar_coins || 50, serverAudit.totalCoins);
      const targetTier = PLOT_LEVEL_TIERS.find((t) => t.level === requestedLevel);
      const requiredCoins = targetTier ? targetTier.minCoins : 999999;

      if (effectiveCoins < requiredCoins) {
        return NextResponse.json(
          {
            error: `You need ${requiredCoins - effectiveCoins} more Bazaar Coins (${effectiveCoins}/${requiredCoins}) to unlock Level ${requestedLevel}.`,
          },
          { status: 400 }
        );
      }

      updates.plot_level = requestedLevel;
      updates.bazaar_coins = effectiveCoins;
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

    const [{ data: refreshed }, { data: waveRows }, { data: postRows }] =
      await Promise.all([
        supabase
          .from("businesses")
          .select(`
            id, slug, name, tagline, description, category_id, city_name, state_name, pincode,
            lat, lon, facing_bearing, road_anchor_lat, road_anchor_lon, connector_type,
            whatsapp_phone, instagram_handle, website_url, google_maps_url,
            starting_price, logo_url, is_verified, is_featured, status,
            verification_status, verification_notes, verification_document_url, verification_requested_at,
            total_views, total_leads, owner_id, created_at, updated_at,
            plot_level, bazaar_coins, plot_config,
            portfolio:portfolio_items(id, business_id, image_url, caption, sort_order)
          `)
          .eq("id", id)
          .single(),
        supabase
          .from("lead_events")
          .select("id")
          .eq("business_id", id)
          .eq("event_type", "wave"),
        supabase.from("business_posts").select("id").eq("business_id", id),
      ]);

    let enrichedBusiness = refreshed;
    if (refreshed) {
      const sortedPortfolio = Array.isArray(refreshed.portfolio)
        ? [...refreshed.portfolio].sort((a, c) => (a.sort_order || 0) - (c.sort_order || 0))
        : [];
      const rawAudit = computeEarnedBazaarCoins({
        photosCount: sortedPortfolio.length || (refreshed.logo_url ? 1 : 0),
        hasWebsite: Boolean(refreshed.website_url && refreshed.website_url.trim().length > 0),
        hasGoogleMaps: Boolean(
          refreshed.google_maps_url && refreshed.google_maps_url.trim().length > 0
        ),
        hasDescription: Boolean(refreshed.description && refreshed.description.trim().length >= 30),
        hasInstagram: Boolean(
          refreshed.instagram_handle && refreshed.instagram_handle.trim().length > 0
        ),
        totalViews: refreshed.total_views || 0,
        totalLeads: refreshed.total_leads || 0,
        wavesCount: waveRows?.length || 0,
        broadcastsCount: postRows?.length || 0,
      });

      const storedCoins = typeof refreshed.bazaar_coins === "number" ? refreshed.bazaar_coins : 50;
      const effectiveCoins = Math.max(storedCoins, rawAudit.totalCoins);
      if (effectiveCoins > storedCoins) {
        await supabase
          .from("businesses")
          .update({ bazaar_coins: effectiveCoins })
          .eq("id", id)
          .eq("owner_id", user.id);
      }

      const eligibleLevel: 1 | 2 | 3 =
        effectiveCoins >= 750 ? 3 : effectiveCoins >= 250 ? 2 : 1;
      const currentLevel: 1 | 2 | 3 =
        refreshed.plot_level === 3 ? 3 : refreshed.plot_level === 2 ? 2 : 1;
      const nextTier =
        currentLevel === 1
          ? PLOT_LEVEL_TIERS[1]
          : currentLevel === 2
            ? PLOT_LEVEL_TIERS[2]
            : null;
      const coinsToNextLevel = nextTier
        ? Math.max(0, nextTier.minCoins - effectiveCoins)
        : 0;
      const progressPct = nextTier
        ? Math.min(100, Math.round((effectiveCoins / nextTier.minCoins) * 100))
        : 100;

      enrichedBusiness = {
        ...refreshed,
        plot_level: currentLevel,
        bazaar_coins: effectiveCoins,
        plot_config: refreshed.plot_config || {},
        portfolio: sortedPortfolio,
        coin_audit: {
          ...rawAudit,
          totalCoins: effectiveCoins,
          eligibleLevel,
          nextLevel: nextTier,
          coinsToNextLevel,
          progressPct,
        },
      } as typeof refreshed & { coin_audit: unknown };
    }

    return NextResponse.json({ success: true, business: enrichedBusiness });
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

