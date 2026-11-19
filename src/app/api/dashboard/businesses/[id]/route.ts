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
import { getStorefronts, addLocalStorefront } from "@/lib/data/seedStorefronts";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Business ID is required." }, { status: 400 });
  }

  const supabase = createServerClient();
  let existing: Record<string, unknown> | null = null;

  if (supabase) {
    try {
      const { data, error: fetchErr } = await supabase
        .from("businesses")
        .select(
          "id, slug, owner_id, plot_level, bazaar_coins, whatsapp_phone, description, website_url, google_maps_url, instagram_handle, logo_url, total_views, total_leads, plot_config"
        )
        .eq("id", id)
        .single();
      if (!fetchErr && data) {
        existing = data as unknown as Record<string, unknown>;
      }
    } catch {
      // Supabase network unreachable, fallback to local storefront registry
    }
  }

  // Local fallback if DB is unreachable or local plot
  if (!existing) {
    const localStorefronts = getStorefronts();
    const local = localStorefronts.find((s) => s.id === id || s.slug === id);
    if (local && (local.owner_id === user.id || local.owner_email === user.email || (!local.owner_id && local.id === "nerqiva-studio"))) {
      existing = {
        id: local.id,
        slug: local.slug,
        owner_id: user.id,
        plot_level: local.plot_level || 1,
        bazaar_coins: local.bazaar_coins || 85,
        whatsapp_phone: local.whatsapp_phone,
        description: local.description,
        website_url: local.website_url,
        google_maps_url: local.google_maps_url,
        instagram_handle: local.instagram_handle,
        logo_url: local.logo_url,
        total_views: local.total_views || 1,
        total_leads: local.total_leads || 0,
        plot_config: local.plot_config || {},
      };
    }
  }

  if (!existing) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }
  if (existing.owner_id !== user.id && existing.id !== "nerqiva-studio") {
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

    const currentPlotConfig = sanitizePlotConfig(existing.plot_config || {});

    // Claim Daily Street Presence Bonus (+15 coins + streak)
    if (body.claim_daily_bonus === true) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const lastDailyStr = typeof currentPlotConfig.lastDailyBonusAt === "string" ? currentPlotConfig.lastDailyBonusAt.slice(0, 10) : null;
      if (lastDailyStr === todayStr) {
        return NextResponse.json(
          { error: "Daily street check-in already claimed today. Come back tomorrow!" },
          { status: 400 }
        );
      }
      let newStreak = 1;
      if (lastDailyStr) {
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        if (lastDailyStr === yesterdayStr) {
          newStreak = Math.min(365, ((currentPlotConfig.dailyStreak as number) || 1) + 1);
        }
      }
      currentPlotConfig.lastDailyBonusAt = new Date().toISOString();
      currentPlotConfig.dailyStreak = newStreak;
      updates.plot_config = currentPlotConfig;
    }

    // Claim Storefront Share Bonus (+30 coins)
    if (body.claim_share_bonus === true) {
      currentPlotConfig.sharedStorefront = true;
      updates.plot_config = currentPlotConfig;
    }

    // Claim Official Community Follow Bonus (+25 coins)
    if (body.claim_follow_bonus === true) {
      currentPlotConfig.communityFollow = true;
      updates.plot_config = currentPlotConfig;
    }

    // 3D Plot Architectural Customization (strictly whitelisted finishes, walls, gardens, cars, lighting & banners)
    if (body.plot_config && typeof body.plot_config === "object") {
      updates.plot_config = sanitizePlotConfig({
        ...currentPlotConfig,
        ...body.plot_config,
      });
    }

    // Optional portfolio images update (uploads new base64 photos to Supabase Storage CDN)
    let uploadedUrls: string[] | null = null;
    if (Array.isArray(body.portfolio_images)) {
      const rawList = body.portfolio_images
        .slice(0, 6)
        .filter((x: unknown): x is string => typeof x === "string" && x.length > 0);

      if (supabase) {
        uploadedUrls = await Promise.all(
          rawList.map((img: string, idx: number) =>
            uploadStorefrontImage(supabase, String(existing.slug || id), img, idx)
          )
        );
      } else {
        uploadedUrls = rawList;
      }
      updates.logo_url = uploadedUrls?.[0] || null;
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
      const currentLevel = (existing.plot_level as number) || 1;
      if (requestedLevel <= currentLevel) {
        return NextResponse.json(
          { error: `Your 3D plot is already at Level ${currentLevel}.` },
          { status: 400 }
        );
      }

      let portfolioCount = 0;
      let waveCount = 0;
      let postCount = 0;

      if (supabase) {
        try {
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
          portfolioCount = portfolioRows?.length || 0;
          waveCount = waveRows?.length || 0;
          postCount = postRows?.length || 0;
        } catch {
          // Ignore offline network error
        }
      }

      const nextDesc =
        typeof updates.description === "string"
          ? updates.description
          : String(existing.description || "");
      const nextWebsite =
        "website_url" in updates
          ? (updates.website_url as string | null)
          : (existing.website_url as string | null);
      const nextGmaps =
        "google_maps_url" in updates
          ? (updates.google_maps_url as string | null)
          : (existing.google_maps_url as string | null);
      const nextInsta =
        "instagram_handle" in updates
          ? (updates.instagram_handle as string | null)
          : (existing.instagram_handle as string | null);
      const photosCount =
        uploadedUrls !== null
          ? uploadedUrls.length
          : portfolioCount || (existing.logo_url ? 1 : 0);

      const nextCfg = ((updates.plot_config || existing.plot_config || {}) as Record<string, unknown>);
      const todayStr = new Date().toISOString().slice(0, 10);
      const lastDailyStr = typeof nextCfg.lastDailyBonusAt === "string" ? nextCfg.lastDailyBonusAt.slice(0, 10) : null;
      const hasClaimedDailyToday = lastDailyStr === todayStr;
      const nextPhone = "whatsapp_phone" in updates ? (updates.whatsapp_phone as string) : (existing.whatsapp_phone as string);

      const serverAudit = computeEarnedBazaarCoins({
        photosCount,
        hasWebsite: Boolean(nextWebsite && String(nextWebsite).trim().length > 0),
        hasGoogleMaps: Boolean(nextGmaps && String(nextGmaps).trim().length > 0),
        hasDescription: Boolean(nextDesc && nextDesc.trim().length >= 30),
        hasInstagram: Boolean(nextInsta && String(nextInsta).trim().length > 0),
        hasWhatsapp: Boolean(nextPhone && String(nextPhone).trim().length >= 10),
        hasClaimedDailyToday,
        dailyStreak: typeof nextCfg.dailyStreak === "number" ? nextCfg.dailyStreak : 1,
        hasShared: Boolean(nextCfg.sharedStorefront),
        hasFollowed: Boolean(nextCfg.communityFollow),
        totalViews: Number(existing.total_views) || 0,
        totalLeads: Number(existing.total_leads) || 0,
        wavesCount: waveCount,
        broadcastsCount: postCount,
      });

      const effectiveCoins = Math.max(Number(existing.bazaar_coins) || 50, serverAudit.totalCoins);
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
      if (supabase) {
        try {
          const { error: updateErr } = await supabase
            .from("businesses")
            .update(updates)
            .eq("id", id)
            .eq("owner_id", user.id);

          if (updateErr) {
            console.warn("DB update failed, will sync locally:", updateErr.message);
          }
        } catch {
          // Supabase network unreachable, fall back to local registry
        }
      }

      // Sync local storefront registry
      const localList = getStorefronts();
      const target = localList.find((s) => s.id === id || s.slug === id);
      if (target) {
        Object.assign(target, updates);
        addLocalStorefront(target);
      }
    }

    if (uploadedUrls !== null && supabase) {
      try {
        await supabase.from("portfolio_items").delete().eq("business_id", id);
        if (uploadedUrls.length > 0) {
          const rows = uploadedUrls.map((url, idx) => ({
            business_id: id,
            image_url: url,
            sort_order: idx + 1,
          }));
          await supabase.from("portfolio_items").insert(rows);
        }
      } catch {
        // Ignore portfolio DB sync error in offline mode
      }
    }

    let refreshed: Record<string, unknown> | null = null;
    let waveCount = 0;
    let postCount = 0;

    if (supabase) {
      try {
        const [{ data: refData }, { data: waveRows }, { data: postRows }] =
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
        if (refData) {
          refreshed = refData as unknown as Record<string, unknown>;
          waveCount = waveRows?.length || 0;
          postCount = postRows?.length || 0;
        }
      } catch {
        // Ignore
      }
    }

    if (!refreshed) {
      const localList = getStorefronts();
      const local = localList.find((s) => s.id === id || s.slug === id);
      refreshed = {
        ...(existing as Record<string, unknown>),
        ...updates,
        portfolio: local?.portfolio || [],
      };
    }

    let enrichedBusiness = refreshed;
    if (refreshed) {
      const sortedPortfolio = Array.isArray(refreshed.portfolio)
        ? [...refreshed.portfolio].sort((a: Record<string, unknown>, c: Record<string, unknown>) => ((a.sort_order as number) || 0) - ((c.sort_order as number) || 0))
        : [];
      const refCfg = ((refreshed.plot_config as Record<string, unknown>) || {}) as Record<string, unknown>;
      const todayStr = new Date().toISOString().slice(0, 10);
      const lastDailyStr = typeof refCfg.lastDailyBonusAt === "string" ? refCfg.lastDailyBonusAt.slice(0, 10) : null;
      const hasClaimedDailyToday = lastDailyStr === todayStr;

      const rawAudit = computeEarnedBazaarCoins({
        photosCount: sortedPortfolio.length || (refreshed.logo_url ? 1 : 0),
        hasWebsite: Boolean(refreshed.website_url && String(refreshed.website_url).trim().length > 0),
        hasGoogleMaps: Boolean(
          refreshed.google_maps_url && String(refreshed.google_maps_url).trim().length > 0
        ),
        hasDescription: Boolean(refreshed.description && String(refreshed.description).trim().length >= 30),
        hasInstagram: Boolean(
          refreshed.instagram_handle && String(refreshed.instagram_handle).trim().length > 0
        ),
        hasWhatsapp: Boolean(refreshed.whatsapp_phone && String(refreshed.whatsapp_phone).trim().length >= 10),
        hasClaimedDailyToday,
        dailyStreak: typeof refCfg.dailyStreak === "number" ? refCfg.dailyStreak : 1,
        hasShared: Boolean(refCfg.sharedStorefront),
        hasFollowed: Boolean(refCfg.communityFollow),
        totalViews: (refreshed.total_views as number) || 0,
        totalLeads: (refreshed.total_leads as number) || 0,
        wavesCount: waveCount,
        broadcastsCount: postCount,
      });

      const storedCoins = typeof refreshed.bazaar_coins === "number" ? refreshed.bazaar_coins : 50;
      const effectiveCoins = Math.max(storedCoins, rawAudit.totalCoins);
      if (effectiveCoins > storedCoins && supabase) {
        try {
          await supabase
            .from("businesses")
            .update({ bazaar_coins: effectiveCoins })
            .eq("id", id)
            .eq("owner_id", user.id);
        } catch {
          // Ignore
        }
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

