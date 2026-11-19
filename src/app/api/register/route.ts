import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";
import { uploadStorefrontImage } from "@/lib/supabase/storage";
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
      portfolio_images,
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

    // 3. Database & Authentication Verification
    const supabase = createServerClient();
    const authUser = await getAuthenticatedUserFromRequest(req);

    if (!authUser || !authUser.id) {
      return NextResponse.json(
        {
          error:
            "Owner account required. You must create or sign in to an owner account to register a 3D business plot. No unowned plots are permitted.",
        },
        { status: 401 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Database service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    let businessId = `sb-temp-${Date.now()}`;
    let persistedToDb = false;

    const rawImages: string[] = Array.isArray(portfolio_images)
      ? portfolio_images.slice(0, 6).filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];

    let storedImageUrls = rawImages;

    if (supabase) {
      // Upload base64 portfolio photos to Supabase Storage CDN bucket (`storefront-media`)
      if (rawImages.length > 0) {
        storedImageUrls = await Promise.all(
          rawImages.map((img, idx) => uploadStorefrontImage(supabase, slug, img, idx))
        );
      }

      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .insert({
          slug,
          owner_id: authUser.id,
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
          logo_url: storedImageUrls[0] || null,
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

        // Insert portfolio items using CDN Storage URLs
        if (storedImageUrls.length > 0) {
          const items = storedImageUrls.map((imgUrl: string, idx: number) => ({
            business_id: businessId,
            image_url: imgUrl,
            sort_order: idx + 1,
          }));
          const { error: portfolioError } = await supabase.from("portfolio_items").insert(items);
          if (portfolioError) {
            console.error("[/api/register] portfolio_items insert error:", portfolioError.message);
          }
        }
      }
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
      logo_url: storedImageUrls[0] || "",
      is_verified: false,
      is_featured: false,
      total_views: 1,
      total_leads: 0,
      portfolio: storedImageUrls.map((imgUrl: string, idx: number) => ({
        id: `p-${businessId}-${idx}`,
        business_id: businessId,
        image_url: imgUrl,
        sort_order: idx + 1,
      })),
      created_at: new Date().toISOString(),
    };
    addLocalStorefront(localStorefront);

    return NextResponse.json(
      {
        success: true,
        persisted_to_db: persistedToDb,
        id: businessId,
        slug,
        logo_url: storedImageUrls[0] || "",
        portfolio_urls: storedImageUrls,
        message: "Storefront registered successfully!",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
