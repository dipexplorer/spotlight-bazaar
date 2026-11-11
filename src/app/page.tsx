import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { SEED_STOREFRONTS } from "@/lib/data/seedStorefronts";
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
  return SEED_STOREFRONTS;
}

export default async function Home() {
  const storefronts = await getInitialStorefronts();

  return (
    <main className="flex h-[100dvh] max-h-[100dvh] flex-col bg-[#09090b] text-neutral-100 overflow-hidden">
      {/* Top Navbar */}
      <header className="w-full h-14 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-500/40 shadow-sm shadow-amber-950/30 shrink-0 bg-neutral-900 flex items-center justify-center">
            <Image
              src="/brand/mascot.jpg"
              alt="Spotlight Bazaar Mascot"
              width={32}
              height={32}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              priority
            />
          </div>
          <span className="font-bold tracking-tight text-white text-sm sm:text-base">
            Spotlight <span className="text-amber-500 font-semibold">Bazaar</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/30 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Open a Shop</span>
          </Link>
        </div>
      </header>

      {/* Main Interactive Map Container */}
      <div className="flex-1 w-full relative h-[calc(100dvh-3.5rem)] overflow-hidden">
        <MapWrapper storefronts={storefronts} />
      </div>
    </main>
  );
}
