import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";
import { computeEarnedBazaarCoins, PLOT_LEVEL_TIERS } from "@/lib/constants/plotUpgrades";
import { getStorefronts } from "@/lib/data/seedStorefronts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = createServerClient();
  let businesses: Record<string, unknown>[] | null = null;
  let fetchError: string | null = null;

  if (supabase) {
    try {
      const res = await supabase
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
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (res.error) {
        fetchError = res.error.message;
      } else {
        businesses = (res.data as unknown) as Record<string, unknown>[];
      }
    } catch (err) {
      fetchError = err instanceof Error ? err.message : "Database fetch failed";
    }
  }

  // If DB query yielded 0 or failed due to offline/sandboxed network, match local registry
  if (!businesses || businesses.length === 0) {
    const localStorefronts = getStorefronts();
    const matched = localStorefronts.filter(
      (b) =>
        b.owner_id === user.id ||
        (b.owner_email && b.owner_email.toLowerCase() === (user.email || "").toLowerCase()) ||
        (!b.owner_id && b.id === "nerqiva-studio")
    );

    if (matched.length > 0) {
      businesses = matched.map((b) => ({
        ...b,
        status: "active",
        plot_level: b.plot_level || 1,
        bazaar_coins: b.bazaar_coins || 85,
        plot_config: b.plot_config || {
          facadeTheme: "default",
          accentColor: "#f59e0b",
          roofSignText: "",
        },
        portfolio: b.portfolio || [],
      })) as Record<string, unknown>[];
    } else if (fetchError && !supabase) {
      return NextResponse.json({ error: fetchError }, { status: 500 });
    }
  }

  const businessList = businesses || [];
  const businessIds = businessList.map((b) => b.id as string);

  // Aggregate real lead_events analytics & live broadcasts count per owned business
  const statsByBiz = new Map<
    string,
    { waves: number; whatsapp_clicks: number; events_7d: number }
  >();
  const broadcastsByBiz = new Map<string, number>();

  if (businessIds.length > 0 && supabase) {
    try {
      const [{ data: events }, { data: posts }] = await Promise.all([
        supabase
          .from("lead_events")
          .select("business_id, event_type, created_at")
          .in("business_id", businessIds),
        supabase
          .from("business_posts")
          .select("business_id")
          .in("business_id", businessIds),
      ]);

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

      for (const p of posts || []) {
        broadcastsByBiz.set(p.business_id, (broadcastsByBiz.get(p.business_id) || 0) + 1);
      }
    } catch {
      // Ignore offline network error
    }
  }

  const coinSyncUpdates: { id: string; coins: number }[] = [];

  const enriched = (businessList as Record<string, unknown>[]).map((b) => {
    const bId = String(b.id || "");
    const portfolioArr = Array.isArray(b.portfolio) ? (b.portfolio as Record<string, unknown>[]) : [];
    const sortedPortfolio = [...portfolioArr].sort(
      (a, c) => ((a.sort_order as number) || 0) - ((c.sort_order as number) || 0)
    );
    const evStats = statsByBiz.get(bId) || {
      waves: 0,
      whatsapp_clicks: 0,
      events_7d: 0,
    };
    const broadcastsCount = broadcastsByBiz.get(bId) || 0;

    const rawAudit = computeEarnedBazaarCoins({
      photosCount: sortedPortfolio.length || (b.logo_url ? 1 : 0),
      hasWebsite: Boolean(b.website_url && String(b.website_url).trim().length > 0),
      hasGoogleMaps: Boolean(b.google_maps_url && String(b.google_maps_url).trim().length > 0),
      hasDescription: Boolean(b.description && String(b.description).trim().length >= 30),
      hasInstagram: Boolean(b.instagram_handle && String(b.instagram_handle).trim().length > 0),
      totalViews: Number(b.total_views) || 0,
      totalLeads: Number(b.total_leads) || 0,
      wavesCount: evStats.waves,
      broadcastsCount,
    });

    const storedCoins = typeof b.bazaar_coins === "number" ? b.bazaar_coins : 50;
    const effectiveCoins = Math.max(storedCoins, rawAudit.totalCoins);
    if (effectiveCoins > storedCoins) {
      coinSyncUpdates.push({ id: bId, coins: effectiveCoins });
    }

    const eligibleLevel: 1 | 2 | 3 =
      effectiveCoins >= 750 ? 3 : effectiveCoins >= 250 ? 2 : 1;
    const currentLevel: 1 | 2 | 3 =
      b.plot_level === 3 ? 3 : b.plot_level === 2 ? 2 : 1;
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

    return {
      ...b,
      plot_level: currentLevel,
      bazaar_coins: effectiveCoins,
      plot_config: b.plot_config || {},
      portfolio: sortedPortfolio,
      analytics: evStats,
      coin_audit: {
        ...rawAudit,
        totalCoins: effectiveCoins,
        eligibleLevel,
        nextLevel: nextTier,
        coinsToNextLevel,
        progressPct,
      },
    };
  });

  // Auto-sync earned Bazaar Coins into Supabase in the background
  if (coinSyncUpdates.length > 0 && supabase) {
    try {
      await Promise.all(
        coinSyncUpdates.map((u) =>
          supabase
            .from("businesses")
            .update({ bazaar_coins: u.coins })
            .eq("id", u.id)
            .eq("owner_id", user.id)
        )
      );
    } catch {
      // Ignore background sync error in offline mode
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email || "",
    },
    businesses: enriched,
  });
}

