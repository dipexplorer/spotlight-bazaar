import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";
import { getStorefronts } from "@/lib/data/seedStorefronts";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Broadcast ID required." }, { status: 400 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    // Local in-memory registry deletion
    const all = getStorefronts();
    for (const b of all) {
      if (b.active_posts) {
        b.active_posts = b.active_posts.filter((p) => p.id !== id);
      }
    }
    return NextResponse.json({ success: true, deleted_id: id });
  }

  const { data: post } = await supabase
    .from("business_posts")
    .select("id, business_id, business:businesses!inner(owner_id)")
    .eq("id", id)
    .single();

  const bizOwner =
    post && post.business && !Array.isArray(post.business)
      ? (post.business as { owner_id?: string | null }).owner_id
      : null;

  if (!post || bizOwner !== user.id) {
    // Fallback check
    const all = getStorefronts();
    for (const b of all) {
      if (b.active_posts && b.active_posts.some((p) => p.id === id)) {
        b.active_posts = b.active_posts.filter((p) => p.id !== id);
        return NextResponse.json({ success: true, deleted_id: id });
      }
    }
    return NextResponse.json({ error: "Broadcast not found or access denied." }, { status: 403 });
  }

  const { error } = await supabase.from("business_posts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted_id: id });
}
