import * as THREE from "three";
import { BusinessStorefront, City } from "@/types";
import { TrafficSystem } from "./trafficSystem";
import { PedestrianSystem } from "./pedestrianSystem";
import { StorefrontMeshResult } from "./cartoonStorefront";
import { buildUniversalCity } from "./universalCityModel";

export interface BazaarStreetBuildResult {
  group: THREE.Group;
  hitBoxes: THREE.Mesh[];
  traffic: TrafficSystem;
  pedestrians: PedestrianSystem;
  plots: StorefrontMeshResult[];
}

export type CityLandscapeTheme =
  | "river_hills"
  | "coastal_ocean"
  | "garden_tech"
  | "heritage_sandstone";

export function getCityLandscapeTheme(slugOrName: string): CityLandscapeTheme {
  const s = (slugOrName || "").toLowerCase();
  if (s.includes("mumbai") || s.includes("goa") || s.includes("kochi") || s.includes("chennai")) {
    return "coastal_ocean";
  }
  if (s.includes("bangalore") || s.includes("bengaluru") || s.includes("pune") || s.includes("hyderabad")) {
    return "garden_tech";
  }
  if (
    s.includes("delhi") ||
    s.includes("jaipur") ||
    s.includes("lucknow") ||
    s.includes("chandigarh") ||
    s.includes("ahmedabad") ||
    s.includes("indore")
  ) {
    return "heritage_sandstone";
  }
  return "river_hills";
}

/**
 * Builds the complete 3D Bazaar Environment for any Indian city
 * Integrates real GIS geography wrapped with 3D graphics, real main roads,
 * moving regional traffic, and dynamic GPS storefront placement.
 */
export function buildBazaarStreet(
  city: City,
  storefronts: BusinessStorefront[]
): BazaarStreetBuildResult {
  return buildUniversalCity(city, storefronts);
}
