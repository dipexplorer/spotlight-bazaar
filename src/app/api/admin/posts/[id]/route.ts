import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/posts/[id]
 * Moderation endpoint for admins to remove any spam or expired street broadcast.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
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

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Post ID is required." }, { status: 400 });
  }

  try {
    const { error } = await supabase.from("business_posts").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedPostId: id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete broadcast.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

