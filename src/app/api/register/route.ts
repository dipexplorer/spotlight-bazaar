import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { addLocalStorefront } from "@/lib/data/seedStorefronts";
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
      starting_price,
      lat,
      lon,
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

    // 2. Slug generation
    const baseSlug = `${name} ${city_name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${randomSuffix}`;

    // 3. Database Insertion (if Supabase is configured)
    const supabase = createServerClient();
    let businessId = `sb-temp-${Date.now()}`;

    if (supabase) {
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .insert({
          slug,
          name: name.trim(),
          tagline: tagline ? tagline.trim() : null,
          description: description ? description.trim() : null,
          category_id,
          city_name: city_name.trim(),
          state_name: state_name ? state_name.trim() : "India",
          pincode: pincode || null,
          lat: Number(lat) || 26.1445,
          lon: Number(lon) || 91.7362,
          whatsapp_phone: cleanPhone,
          instagram_handle: instagram_handle ? instagram_handle.replace(/^@/, "").trim() : null,
          website_url: website_url || null,
          starting_price: starting_price || null,
          logo_url: Array.isArray(portfolio_images) && portfolio_images[0] ? portfolio_images[0] : null,
          is_verified: false,
          is_featured: false,
          status: "active",
        })
        .select("id")
        .single();

      if (businessError) {
        return NextResponse.json({ error: businessError.message }, { status: 500 });
      }

      if (businessData) {
        businessId = businessData.id;

        // Insert portfolio items
        if (Array.isArray(portfolio_images) && portfolio_images.length > 0) {
          const items = portfolio_images.slice(0, 6).map((imgUrl: string, idx: number) => ({
            business_id: businessId,
            image_url: imgUrl,
            sort_order: idx + 1,
          }));
          await supabase.from("portfolio_items").insert(items);
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
      whatsapp_phone: cleanPhone,
      instagram_handle: instagram_handle ? instagram_handle.replace(/^@/, "").trim() : "",
      starting_price: starting_price || "",
      logo_url: Array.isArray(portfolio_images) && portfolio_images[0] ? portfolio_images[0] : "",
      is_verified: true,
      is_featured: true,
      total_views: 1,
      total_leads: 0,
      portfolio: Array.isArray(portfolio_images)
        ? portfolio_images.slice(0, 6).map((imgUrl: string, idx: number) => ({
            id: `p-${businessId}-${idx}`,
            business_id: businessId,
            image_url: imgUrl,
            sort_order: idx + 1,
          }))
        : [],
      created_at: new Date().toISOString(),
    };
    addLocalStorefront(localStorefront);

    return NextResponse.json(
      {
        success: true,
        id: businessId,
        slug,
        message: "Storefront registered successfully!",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

