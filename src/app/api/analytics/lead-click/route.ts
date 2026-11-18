import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const ALLOWED_EVENT_TYPES = new Set(["whatsapp_click", "wave", "view", "website_click"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storefront_id, event_type } = body;

    if (!storefront_id || typeof storefront_id !== "string") {
      return NextResponse.json({ error: "storefront_id is required" }, { status: 400 });
    }

    const safeEventType =
      typeof event_type === "string" && ALLOWED_EVENT_TYPES.has(event_type)
        ? event_type
        : "whatsapp_click";

    const supabase = createServerClient();
    if (supabase) {
      try {
        await supabase.from("lead_events").insert({
          business_id: storefront_id,
          event_type: safeEventType,
          referrer: req.headers.get("referer") || null,
        });

        if (safeEventType === "whatsapp_click") {
          await supabase.rpc("increment_leads", { business_id: storefront_id });
        } else if (safeEventType === "view" || safeEventType === "wave") {
          await supabase.rpc("increment_views", { business_id: storefront_id });
        }
      } catch {
        // Non-blocking analytics
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
