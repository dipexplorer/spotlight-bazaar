import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/claim?q=...
 * Search unclaimed or matching businesses for the authenticated user to claim.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  try {
    let query = supabase
      .from("businesses")
      .select("id, slug, name, city_name, category_id, whatsapp_phone, owner_id, is_verified, status")
      .limit(10);

    if (q) {
      const cleanDigits = q.replace(/\D/g, "");
      if (cleanDigits.length >= 4) {
        // Search by phone digits or name
        query = query.or(`whatsapp_phone.ilike.%${cleanDigits}%,name.ilike.%${q}%`);
      } else {
        query = query.ilike("name", `%${q}%`);
      }
    } else {
      // Show recently registered businesses without an owner
      query = query.is("owner_id", null).order("created_at", { ascending: false });
    }

    const { data: results, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mask phone numbers for privacy (show last 4 digits only)
    const masked = (results || []).map((b) => {
      const p = (b.whatsapp_phone || "").replace(/\D/g, "").slice(-10);
      const maskedPhone = p.length === 10 ? `******${p.slice(-4)}` : "Not provided";
      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        city_name: b.city_name,
        category_id: b.category_id,
        masked_phone: maskedPhone,
        is_claimed: Boolean(b.owner_id),
        is_verified: Boolean(b.is_verified),
        status: b.status,
      };
    });

    return NextResponse.json({ success: true, results: masked });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/dashboard/claim
 * Claim ownership of a registered business plot using WhatsApp phone verification or claim proof.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required to claim a business plot." }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { business_id, whatsapp_phone, claim_notes } = body;

    if (!business_id) {
      return NextResponse.json({ error: "Business ID is required." }, { status: 400 });
    }

    // 1. Fetch current business
    const { data: business, error: bErr } = await supabase
      .from("businesses")
      .select("id, slug, name, whatsapp_phone, owner_id, is_verified")
      .eq("id", business_id)
      .single();

    if (bErr || !business) {
      return NextResponse.json({ error: "Business plot not found." }, { status: 404 });
    }

    // 2. Check if already claimed by another user
    if (business.owner_id && business.owner_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "This business plot has already been claimed by another account. If you believe this is an error, please reach out to admin support.",
        },
        { status: 409 }
      );
    }

    // 3. Match WhatsApp Phone
    const inputClean = (whatsapp_phone || "").replace(/\D/g, "").slice(-10);
    const existingClean = (business.whatsapp_phone || "").replace(/\D/g, "").slice(-10);

    const isDirectPhoneMatch = inputClean.length === 10 && existingClean.length === 10 && inputClean === existingClean;

    if (isDirectPhoneMatch || !business.owner_id) {
      // Link owner_id to current user
      const { data: updated, error: uErr } = await supabase
        .from("businesses")
        .update({
          owner_id: user.id,
          verification_notes: claim_notes ? claim_notes.trim() : business.whatsapp_phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", business.id)
        .select(`
          id, slug, name, tagline, description, category_id, city_name, state_name, pincode,
          lat, lon, whatsapp_phone, instagram_handle, website_url, google_maps_url,
          starting_price, logo_url, is_verified, is_featured, status,
          verification_status, verification_notes, verification_document_url, verification_requested_at,
          total_views, total_leads, owner_id, plot_level, bazaar_coins, plot_config, created_at, updated_at
        `)
        .single();

      if (uErr) {
        return NextResponse.json({ error: uErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Congratulations! ${business.name} is now linked to your owner console.`,
        business: updated,
      });
    }

    // If phone didn't match and someone wants to request manual claim
    return NextResponse.json(
      {
        error:
          "The provided WhatsApp phone does not match the registered number on file for this business. Please provide the exact number used during registration.",
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Claim request failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

