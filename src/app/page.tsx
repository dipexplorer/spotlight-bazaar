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
          pincode, lat, lon, whatsapp_phone, starting_price, logo_url, is_verified, is_featured,
          total_views, total_leads, created_at
        `)
        .eq("status", "active")
        .order("is_featured", { ascending: false });

      if (!error && data && data.length > 0) {
        return (data as unknown) as BusinessStorefront[];
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
