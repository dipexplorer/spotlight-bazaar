import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storefront_id } = body;

    if (!storefront_id) {
      return NextResponse.json({ error: "storefront_id is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    if (supabase) {
      try {
        // 1. Record lead event
        await supabase.from("lead_events").insert({
          business_id: storefront_id,
          event_type: "whatsapp_click",
          referrer: req.headers.get("referer") || null,
        });

        // 2. Increment total_leads count
        const { error: rpcError } = await supabase.rpc("increment_leads", { business_id: storefront_id });
        if (rpcError) {
          await supabase
            .from("businesses")
            .update({ total_leads: 1 })
            .eq("id", storefront_id);
        }
      } catch {
        // Non-blocking analytics
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    // Non-blocking analytics: always return 200 to not disrupt user redirection
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

