"use client";

import React, { useState, useEffect } from "react";
import { BusinessStorefront, City } from "@/types";
import { INITIAL_CITIES } from "@/lib/constants/initialCities";
import { getLocalStorefronts } from "@/lib/utils/localStorefront";
import { StorefrontDrawer } from "@/components/map/StorefrontDrawer";
import { LiveOsmMap } from "@/components/map/LiveOsmMap";

function mergeStorefronts(base: BusinessStorefront[], extras: BusinessStorefront[]): BusinessStorefront[] {
  const bySlug = new Map<string, BusinessStorefront>();
  for (const s of base) {
    bySlug.set(s.slug, s);
  }
  for (const s of extras) {
    if (!bySlug.has(s.slug)) {
      bySlug.set(s.slug, s);
    }
  }
  return Array.from(bySlug.values());
}

interface InteractiveCanvasProps {
  initialStorefronts: BusinessStorefront[];
}

export default function InteractiveCanvas({ initialStorefronts }: InteractiveCanvasProps) {
  const [storefronts, setStorefronts] = useState<BusinessStorefront[]>(initialStorefronts);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [activeStorefront, setActiveStorefront] = useState<BusinessStorefront | null>(null);
  const [viewMode, setViewMode] = useState<"3d" | "osm">("3d");

  // Merge any locally registered storefronts immediately on mount and refresh from /api/boot
  useEffect(() => {
    const localList = getLocalStorefronts();
    if (localList.length > 0) {
      setStorefronts((prev) => mergeStorefronts(prev, localList));
    }

    fetch("/api/boot")
      .then((res) => res.json())
      .then((data) => {
        if (data.storefronts && Array.isArray(data.storefronts) && data.storefronts.length > 0) {
          if (typeof data.storefronts[0] === "object" && !Array.isArray(data.storefronts[0])) {
            setStorefronts(mergeStorefronts(data.storefronts, getLocalStorefronts()));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Capture initial deep-link ?shop= once before map URL sync runs
  const initialShopSlugRef = React.useRef<string | null>(null);
  const hasCelebratedNewRef = React.useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!initialShopSlugRef.current && params.get("shop")) {
      initialShopSlugRef.current = params.get("shop");
    }
    const cityParam = params.get("city");
    const shopSlug = initialShopSlugRef.current || params.get("shop");
    const isNew = params.get("new");
    const viewParam = params.get("view");

    if (viewParam === "osm") {
      setViewMode("osm");
    } else {
      setViewMode("3d");
    }

    if (cityParam && !shopSlug) {
      const matched = INITIAL_CITIES.find(
        (c) =>
          c.slug.toLowerCase() === cityParam.toLowerCase() ||
          c.name.toLowerCase() === cityParam.toLowerCase()
      );
      if (matched) {
        setSelectedCity(matched.name);
      }
    }

    if (shopSlug && storefronts.length > 0) {
      const targetShop = storefronts.find(
        (s) => s.slug.toLowerCase() === shopSlug.toLowerCase()
      );
      if (targetShop) {
        setActiveStorefront(targetShop);
      }
    }

    if (isNew === "1" && !hasCelebratedNewRef.current) {
      hasCelebratedNewRef.current = true;
      import("canvas-confetti").then((m) => {
        m.default({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      });
    }
  }, [storefronts]);

  const selectedCityObject =
    selectedCity === "all"
      ? null
      : INITIAL_CITIES.find(
          (c) => c.name && c.name.toLowerCase() === selectedCity.toLowerCase()
        ) || null;

  const handleCitySelectFrom3D = (city: City | null) => {
    if (city?.name) {
      setSelectedCity(city.name);
    } else {
      setSelectedCity("all");
    }
  };

  const handleStorefrontClick = (storefront: BusinessStorefront) => {
    setActiveStorefront(storefront);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#030712] overflow-hidden">
      {/* 100% REAL LIVE OPENSTREETMAP BASE WITH TRUE 3D ARCHITECTURAL BUILDINGS */}
      <div className="w-full h-full relative overflow-hidden">
        <LiveOsmMap
          cities={INITIAL_CITIES}
          storefronts={storefronts}
          selectedCity={selectedCityObject}
          activeStorefront={activeStorefront}
          onCitySelect={handleCitySelectFrom3D}
          onStorefrontSelect={handleStorefrontClick}
        />
      </div>

      {/* Storefront Slide-Over Drawer */}
      <StorefrontDrawer
        storefront={activeStorefront}
        onClose={() => setActiveStorefront(null)}
      />
    </div>
  );
}
