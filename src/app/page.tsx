import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { getStorefronts } from "@/lib/data/seedStorefronts";
import { createServerClient } from "@/lib/supabase/server";
import { BusinessStorefront } from "@/types";
import { MapWrapper } from "@/components/map/MapWrapper";

async function getInitialStorefronts(): Promise<BusinessStorefront[]> {
  const supabase = createServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select(`
          id, slug, name, tagline, description, category_id, city_name, state_name,
          pincode, lat, lon, facing_bearing, road_anchor_lat, road_anchor_lon, connector_type,
          whatsapp_phone, instagram_handle, website_url, google_maps_url, starting_price, logo_url, is_verified, is_featured,
          total_views, total_leads, plot_level, bazaar_coins, plot_config, created_at,
          active_posts:business_posts(id, business_id, post_type, title, details, coupon_code, cta_label, expires_at, clicks, created_at)
        `)
        .eq("status", "active")
        .order("is_featured", { ascending: false });

      if (!error && data && data.length > 0) {
        const nowMs = Date.now();
        // Exclude legacy mock dev placeholders & prune expired broadcasts
        const filtered = ((data as unknown) as BusinessStorefront[])
          .filter(
            (b) =>
              b.slug !== "studio-prism-guwahati" &&
              b.slug !== "northeast-brew-lab-guwahati" &&
              b.slug !== "brahmaputra-weaves-guwahati" &&
              b.slug !== "bandra-brew-lab-mumbai"
          )
          .map((b) => ({
            ...b,
            active_posts: Array.isArray(b.active_posts)
              ? b.active_posts.filter((p) => new Date(p.expires_at).getTime() > nowMs)
              : [],
          }));
        const hasNerqiva = filtered.some((b) => b.slug === "nerqiva-studio");
        return hasNerqiva
          ? filtered.map((b) =>
              b.slug === "nerqiva-studio"
                ? {
                    ...b,
                    lat: 26.20624167049662,
                    lon: 91.72925728895483,
                    pincode: "781030",
                    website_url: "https://www.nerqivastudio.in/",
                  }
                : b
            )
          : [...getStorefronts(), ...filtered];
      }
    } catch {
      // Fallback to seeds
    }
  }
  return getStorefronts();
}

export default async function Home() {
  const storefronts = await getInitialStorefronts();

  return (
    <main className="flex h-[100dvh] max-h-[100dvh] w-full flex-col bg-[#070a13] text-neutral-100 overflow-hidden">
      <div className="w-full h-full relative overflow-hidden">
        <MapWrapper storefronts={storefronts} />
      </div>
    </main>
  );
}
