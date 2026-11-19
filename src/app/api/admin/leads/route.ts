import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { evaluateNerqivaLead } from "@/lib/constants/leadCrm";
import { normalizeExternalUrl } from "@/lib/utils";
import { BusinessPost } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/leads
 * Fetches all registered businesses with their real-time telemetry, lead qualification scores,
 * active street broadcasts, and outreach intelligence.
 */
export async function GET(req: NextRequest) {
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

  try {
    const [{ data: businesses, error: bErr }, { data: events }, { data: posts }] =
      await Promise.all([
        supabase
          .from("businesses")
          .select(`
            id, slug, name, tagline, description, category_id, city_name, state_name, pincode,
            lat, lon, whatsapp_phone, instagram_handle, website_url, google_maps_url,
            starting_price, logo_url, is_verified, is_featured, status,
            verification_status, verification_notes, verification_document_url, verification_requested_at,
            total_views, total_leads, plot_level, bazaar_coins, plot_config, owner_id, created_at, updated_at
          `)
          .order("created_at", { ascending: false }),
        supabase.from("lead_events").select("business_id, event_type"),
        supabase
          .from("business_posts")
          .select("id, business_id, post_type, title, details, coupon_code, cta_label, expires_at, clicks, created_at")
          .order("created_at", { ascending: false }),
      ]);

    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    const wavesByBiz = new Map<string, number>();
    for (const ev of events || []) {
      if (ev.event_type === "wave") {
        wavesByBiz.set(ev.business_id, (wavesByBiz.get(ev.business_id) || 0) + 1);
      }
    }

    const postsByBiz = new Map<string, BusinessPost[]>();
    for (const p of ((posts as unknown) as BusinessPost[]) || []) {
      const list = postsByBiz.get(p.business_id) || [];
      list.push(p);
      postsByBiz.set(p.business_id, list);
    }

    const rawList = businesses || [];
    const evaluatedLeads = rawList.map((b) => {
      const bizPosts = postsByBiz.get(b.id) || [];
      const waves = wavesByBiz.get(b.id) || 0;
      return evaluateNerqivaLead(b, bizPosts, waves);
    });

    // Default sort: highest opportunity lead score first, then newest
    evaluatedLeads.sort((a, b) => {
      if (b.leadScore !== a.leadScore) return b.leadScore - a.leadScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Telemetry summary
    const totalStorefronts = evaluatedLeads.length;
    const verifiedCount = evaluatedLeads.filter((l) => l.isVerified).length;
    const missingWebsiteCount = evaluatedLeads.filter((l) => !l.hasWebsite).length;
    const hotNeedsCount = evaluatedLeads.filter((l) => l.activeNeedsService.length > 0).length;
    const totalViews = evaluatedLeads.reduce((sum, l) => sum + l.totalViews, 0);
    const totalLeads = evaluatedLeads.reduce((sum, l) => sum + l.totalLeads, 0);

    return NextResponse.json({
      success: true,
      authMethod: auth.method,
      adminEmail: auth.email,
      metrics: {
        totalStorefronts,
        verifiedCount,
        missingWebsiteCount,
        hotNeedsCount,
        totalViews,
        totalLeads,
      },
      leads: evaluatedLeads,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load lead intelligence.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/leads
 * Direct business onboarding from Admin console.
 */
export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const {
      name,
      tagline,
      description,
      category_id,
      city_name,
      state_name,
      pincode,
      whatsapp_phone,
      instagram_handle,
      website_url,
      google_maps_url,
      starting_price,
      lat,
      lon,
      plot_level,
      bazaar_coins,
      is_verified,
      is_featured,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Business name must be at least 2 characters." }, { status: 400 });
    }

    if (!category_id) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }

    if (!city_name) {
      return NextResponse.json({ error: "City is required." }, { status: 400 });
    }

    const cleanPhone = (whatsapp_phone || "").replace(/[^0-9]/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian WhatsApp mobile number." },
        { status: 400 }
      );
    }

    const baseSlug = `${name} ${city_name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${randomSuffix}`;

    const { data: newBiz, error } = await supabase
      .from("businesses")
      .insert({
        slug,
        name: name.trim(),
        tagline: tagline ? tagline.trim() : null,
        description: description ? description.trim() : null,
        category_id,
        city_name: city_name.trim(),
        state_name: state_name ? state_name.trim() : "India",
        pincode: pincode ? pincode.trim() : null,
        lat: typeof lat === "number" && !isNaN(lat) ? lat : 26.1445,
        lon: typeof lon === "number" && !isNaN(lon) ? lon : 91.7362,
        whatsapp_phone: cleanPhone,
        instagram_handle: instagram_handle ? instagram_handle.replace(/^@/, "").trim() : null,
        website_url: normalizeExternalUrl(website_url) || null,
        google_maps_url: normalizeExternalUrl(google_maps_url) || null,
        starting_price: starting_price ? starting_price.trim() : null,
        is_verified: typeof is_verified === "boolean" ? is_verified : true,
        is_featured: typeof is_featured === "boolean" ? is_featured : false,
        status: "active",
        plot_level: plot_level === 3 ? 3 : plot_level === 2 ? 2 : 1,
        bazaar_coins: typeof bazaar_coins === "number" ? Math.max(0, bazaar_coins) : 50,
        plot_config: {},
      })
      .select(`
        id, slug, name, tagline, description, category_id, city_name, state_name, pincode,
        lat, lon, whatsapp_phone, instagram_handle, website_url, google_maps_url,
        starting_price, logo_url, is_verified, is_featured, status,
        total_views, total_leads, plot_level, bazaar_coins, plot_config, owner_id, created_at, updated_at
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      business: newBiz,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create business.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
