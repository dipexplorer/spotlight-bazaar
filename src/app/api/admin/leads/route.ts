import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { evaluateNerqivaLead } from "@/lib/constants/leadCrm";
import { BusinessPost } from "@/types";

export const dynamic = "force-dynamic";

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
            total_views, total_leads, plot_level, bazaar_coins, plot_config, owner_id, created_at, updated_at
          `)
          .order("created_at", { ascending: false }),
        supabase.from("lead_events").select("business_id, event_type"),
        supabase
          .from("business_posts")
          .select("id, business_id, post_type, title, description, coupon_code, cta_label, expires_at, is_active, created_at")
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
