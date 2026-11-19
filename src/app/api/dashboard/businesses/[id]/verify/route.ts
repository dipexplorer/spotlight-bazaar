import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";
import { uploadStorefrontImage } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/dashboard/businesses/[id]/verify
 * Allows a business owner to submit verification proof (GSTIN/MSME, storefront signage photo, or trade license)
 * to request an official Verified Checkmark badge on India's 3D map.
 */
export async function POST(req: NextRequest, context: RouteContext) {
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

  // Verify ownership
  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, slug, name, owner_id, is_verified, verification_status")
    .eq("id", id)
    .single();

  if (bErr || !business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  if (business.owner_id !== user.id) {
    return NextResponse.json({ error: "You do not own this business plot." }, { status: 403 });
  }

  if (business.is_verified) {
    return NextResponse.json(
      { message: "This business is already verified with an official checkmark on the 3D map." },
      { status: 200 }
    );
  }

  try {
    const body = await req.json();
    const { document_notes, document_image } = body;

    if (!document_notes || typeof document_notes !== "string" || document_notes.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide official business details (e.g. GSTIN, MSME Udyam, shop address, or license info)." },
        { status: 400 }
      );
    }

    let documentUrl: string | null = null;
    if (document_image && typeof document_image === "string" && document_image.startsWith("data:image")) {
      documentUrl = await uploadStorefrontImage(supabase, `${business.slug}-verification`, document_image, 99);
    }

    const requestedAt = new Date().toISOString();
    const { data: updated, error: uErr } = await supabase
      .from("businesses")
      .update({
        verification_status: "pending",
        verification_notes: document_notes.trim(),
        verification_document_url: documentUrl,
        verification_requested_at: requestedAt,
        updated_at: requestedAt,
      })
      .eq("id", id)
      .select(`
        id, slug, name, is_verified, verification_status, verification_notes,
        verification_document_url, verification_requested_at
      `)
      .single();

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Verification request submitted! Our review team will verify your business details within 2-4 hours.",
      business: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit verification request.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
