"use client";

import dynamic from "next/dynamic";
import { BusinessStorefront } from "@/types";

const InteractiveCanvas = dynamic(
  () => import("@/components/map/InteractiveCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[75vh] bg-[#09090b] flex flex-col items-center justify-center text-xs text-neutral-500 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
        <span>Loading India&apos;s Open Business Map...</span>
      </div>
    ),
  }
);

export function MapWrapper({ storefronts }: { storefronts: BusinessStorefront[] }) {
  return <InteractiveCanvas initialStorefronts={storefronts} />;
}

