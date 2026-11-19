import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";
import { addLocalStorefront } from "@/lib/data/seedStorefronts";
import { normalizeExternalUrl } from "@/lib/utils";
import { BusinessStorefront } from "@/types";

export async function POST(req: NextRequest) {
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
      facing_bearing,
      road_anchor_lat,
      road_anchor_lon,
      connector_type,
      owner_email,
    } = body;

    // 1. Validation
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

    // Owner email is required so no plot is ever an unowned ghost plot
    const normalizedOwnerEmail =
      typeof owner_email === "string" ? owner_email.trim().toLowerCase() : "";
    if (!normalizedOwnerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedOwnerEmail)) {
      return NextResponse.json(
        { error: "A valid business owner email address is required to claim this 3D plot." },
        { status: 400 }
      );
    }

    const validConnectorType =
      connector_type === "osm_road" ||
      connector_type === "colony_branch" ||
      connector_type === "frontage"
        ? connector_type
        : null;

    const safeWebsiteUrl = normalizeExternalUrl(website_url);
    const safeGoogleMapsUrl = normalizeExternalUrl(google_maps_url);

    // 2. Slug generation
    const baseSlug = `${name} ${city_name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${randomSuffix}`;

    // 3. Database & Authentication Setup
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // 4. Resolve or create Owner User in Supabase Auth
    let ownerId: string | null = null;
    const authUser = await getAuthenticatedUserFromRequest(req);

    if (authUser && authUser.id && (authUser.email || "").toLowerCase() === normalizedOwnerEmail) {
      ownerId = authUser.id;
    } else {
      try {
        // Attempt to create user with email confirmed for instant OTP / Magic Link signin
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          email: normalizedOwnerEmail,
          email_confirm: true,
        });

        if (created?.user?.id) {
          ownerId = created.user.id;
        } else {
          // If already registered, fetch user by email
          const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const existing = listData?.users?.find(
            (u) => (u.email || "").toLowerCase() === normalizedOwnerEmail
          );
          if (existing?.id) {
            ownerId = existing.id;
          }
        }
      } catch (authErr) {
        console.error("[/api/register] admin auth error:", authErr);
      }
    }

    if (!ownerId) {
      return NextResponse.json(
        { error: "Could not link owner account. Please verify your email address." },
        { status: 400 }
      );
    }

    let businessId = `sb-temp-${Date.now()}`;
    let persistedToDb = false;

    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .insert({
        slug,
        owner_id: ownerId,
        owner_email: normalizedOwnerEmail,
        name: name.trim(),
        tagline: tagline ? tagline.trim() : null,
        description: description ? description.trim() : null,
        category_id,
        city_name: city_name.trim(),
        state_name: state_name ? state_name.trim() : "India",
        pincode: pincode || null,
        lat: Number(lat) || 26.1445,
        lon: Number(lon) || 91.7362,
        facing_bearing: typeof facing_bearing === "number" ? facing_bearing : null,
        road_anchor_lat: typeof road_anchor_lat === "number" ? road_anchor_lat : null,
        road_anchor_lon: typeof road_anchor_lon === "number" ? road_anchor_lon : null,
        connector_type: validConnectorType,
        whatsapp_phone: cleanPhone,
        instagram_handle: instagram_handle ? instagram_handle.replace(/^@/, "").trim() : null,
        website_url: safeWebsiteUrl,
        google_maps_url: safeGoogleMapsUrl,
        starting_price: starting_price || null,
        logo_url: null,
        is_verified: false,
        is_featured: false,
        verification_status: "none",
        status: "active",
      })
      .select("id")
      .single();

    if (businessError) {
      return NextResponse.json({ error: businessError.message }, { status: 500 });
    }

    if (businessData) {
      businessId = businessData.id;
      persistedToDb = true;
    }

    // Keep in local registry for immediate 3D High Street live rendering
    const localStorefront: BusinessStorefront = {
      id: businessId,
      slug,
      name: name.trim(),
      tagline: tagline ? tagline.trim() : "",
      description: description ? description.trim() : "",
      category_id,
      city_name: city_name.trim(),
      state_name: state_name ? state_name.trim() : "India",
      pincode: pincode || "",
      lat: Number(lat) || 26.1445,
      lon: Number(lon) || 91.7362,
      facing_bearing: typeof facing_bearing === "number" ? facing_bearing : undefined,
      road_anchor_lat: typeof road_anchor_lat === "number" ? road_anchor_lat : undefined,
      road_anchor_lon: typeof road_anchor_lon === "number" ? road_anchor_lon : undefined,
      connector_type: validConnectorType || undefined,
      whatsapp_phone: cleanPhone,
      instagram_handle: instagram_handle ? instagram_handle.replace(/^@/, "").trim() : "",
      website_url: safeWebsiteUrl || undefined,
      google_maps_url: safeGoogleMapsUrl || undefined,
      starting_price: starting_price || "",
      logo_url: undefined,
      owner_id: ownerId,
      owner_email: normalizedOwnerEmail,
      is_verified: false,
      is_featured: false,
      total_views: 1,
      total_leads: 0,
      portfolio: [],
      created_at: new Date().toISOString(),
    };
    addLocalStorefront(localStorefront);

    return NextResponse.json(
      {
        success: true,
        persisted_to_db: persistedToDb,
        id: businessId,
        slug,
        owner_email: normalizedOwnerEmail,
        message: "Storefront plot registered & claimed successfully!",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
