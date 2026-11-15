import { CityGeoAnchor, DEFAULT_CITY_ANCHORS } from "./geoProjection";
import { ColonyDefinition, GUWAHATI_COLONIES } from "@/components/map3d/guwahatiCityModel";

export type CityLandscapeType =
  | "valley_river"        // Guwahati (Brahmaputra Valley & Hills)
  | "coastal_peninsula"   // Mumbai (Arabian Sea, Marine Drive, Coastline)
  | "plateau_lakes"       // Bangalore (Deccan Plateau, Lakes, Cubbon Park)
  | "river_plain"         // Delhi (Yamuna River, Ring Roads, Aravalli Ridge)
  | "mountain_highland"   // Shillong (Pine Hills, Ward's Lake, Serpentine Ridges)
  | "heritage_delta";     // Kolkata (Hooghly River & Delta)

export interface WaterBodyConfig {
  type: "river" | "ocean" | "lake" | "stream";
  name: string;
  x: number;
  z: number;
  width: number;
  length: number;
  rotationY?: number;
  color?: number;
}

export interface CityGeoConfig {
  slug: string;
  cityName: string;
  state: string;
  anchor: CityGeoAnchor;
  landscapeType: CityLandscapeType;
  colonies: ColonyDefinition[];
  waterBodies: WaterBodyConfig[];
  droneCamera: {
    pos: [number, number, number];
    target: [number, number, number];
  };
  roadsGeoJsonPath: string;
}

export const CITY_GEO_REGISTRY: Record<string, CityGeoConfig> = {
  guwahati: {
    slug: "guwahati",
    cityName: "Guwahati",
    state: "Assam",
    anchor: DEFAULT_CITY_ANCHORS.guwahati,
    landscapeType: "valley_river",
    colonies: GUWAHATI_COLONIES,
    waterBodies: [
      { type: "river", name: "Brahmaputra River", x: 0, z: -88, width: 3600, length: 120, color: 0x0284c7 },
      { type: "lake", name: "Deepor Beel", x: -190, z: 125, width: 120, length: 80, color: 0x0284c7 },
      { type: "lake", name: "Dighalipukhuri", x: 65, z: -10, width: 56, length: 22, color: 0x0ea5e9 },
      { type: "lake", name: "Silpukhuri", x: 150, z: -15, width: 36, length: 22, color: 0x0ea5e9 },
      { type: "lake", name: "Borsola Beel", x: 15, z: 75, width: 48, length: 24, color: 0x0284c7 },
      { type: "lake", name: "Silsako Beel", x: 185, z: 110, width: 60, length: 28, color: 0x0284c7 },
    ],
    droneCamera: {
      pos: [50, 240, 290],
      target: [15, 0, 35],
    },
    roadsGeoJsonPath: "/data/geo/guwahati.roads.json",
  },
  mumbai: {
    slug: "mumbai",
    cityName: "Mumbai",
    state: "Maharashtra",
    anchor: DEFAULT_CITY_ANCHORS.mumbai,
    landscapeType: "coastal_peninsula",
    colonies: [
      { name: "Bandra West & Linking Road", pincode: "400050", zone: "Retail & Cultural Flagship", x: -30, z: -40, description: "Premier fashion boulevard & lifestyle hub" },
      { name: "BKC (Bandra Kurla Complex)", pincode: "400051", zone: "International Financial Center", x: 45, z: -25, description: "Financial headquarters, consulates & luxury dining" },
      { name: "South Mumbai & Marine Drive", pincode: "400020", zone: "Heritage Commercial Waterfront", x: -20, z: 120, description: "Queen's Necklace, Nariman Point & art deco promenade" },
      { name: "Andheri West & Lokhandwala", pincode: "400053", zone: "Entertainment & Commerce", x: -45, z: -140, description: "Media studios, shopping high street & cafes" },
      { name: "Juhu Beachfront", pincode: "400049", zone: "Coastal Hospitality & Retail", x: -75, z: -90, description: "Iconic Arabian Sea beachfront & luxury hospitality" },
      { name: "Lower Parel & Phoenix Mills", pincode: "400013", zone: "Corporate Mill District", x: 0, z: 60, description: "High Street Phoenix, corporate parks & nightlife" },
    ],
    waterBodies: [
      { type: "ocean", name: "Arabian Sea", x: -250, z: 0, width: 500, length: 3200, color: 0x0284c7 },
      { type: "river", name: "Mithi River", x: 15, z: -35, width: 220, length: 18, color: 0x0284c7 },
    ],
    droneCamera: {
      pos: [30, 220, 280],
      target: [0, 2, 0],
    },
    roadsGeoJsonPath: "/data/geo/mumbai.roads.json",
  },
  bangalore: {
    slug: "bangalore",
    cityName: "Bangalore",
    state: "Karnataka",
    anchor: DEFAULT_CITY_ANCHORS.bangalore,
    landscapeType: "plateau_lakes",
    colonies: [
      { name: "Indiranagar 100ft Road", pincode: "560038", zone: "Lifestyle & Startup Promenade", x: 65, z: -15, description: "Craft breweries, indie boutiques & tech studios" },
      { name: "Koramangala 80ft Road", pincode: "560095", zone: "Startup Capital & Dining Hub", x: 45, z: 75, description: "Vibrant culinary scene & tech venture flagship" },
      { name: "MG Road & Brigade Road", pincode: "560001", zone: "Heritage Central Commercial Hub", x: 0, z: 0, description: "CBD retail, metro boulevard & historic high street" },
      { name: "HSR Layout Sector 1-7", pincode: "560102", zone: "Modern Tech District", x: 75, z: 140, description: "Premier tech founder hub & lifestyle avenues" },
      { name: "Whitefield ITPL Main Road", pincode: "560066", zone: "International Tech Corridor", x: 190, z: -30, description: "Global IT parks, shopping complexes & transit" },
    ],
    waterBodies: [
      { type: "lake", name: "Ulsoor Lake", x: 35, z: -30, width: 85, length: 55, color: 0x0284c7 },
      { type: "lake", name: "Bellandur Lake", x: 120, z: 90, width: 140, length: 70, color: 0x0284c7 },
      { type: "lake", name: "Agara Lake", x: 65, z: 110, width: 75, length: 45, color: 0x0284c7 },
    ],
    droneCamera: {
      pos: [50, 210, 260],
      target: [25, 2, 20],
    },
    roadsGeoJsonPath: "/data/geo/bangalore.roads.json",
  },
  "delhi-ncr": {
    slug: "delhi-ncr",
    cityName: "Delhi NCR",
    state: "Delhi",
    anchor: DEFAULT_CITY_ANCHORS.delhi,
    landscapeType: "river_plain",
    colonies: [
      { name: "Connaught Place (CP Radial)", pincode: "110001", zone: "Colonnaded Heritage CBD", x: 0, z: 0, description: "Iconic circular high street, flagship showrooms & cafes" },
      { name: "Hauz Khas Village & Market", pincode: "110016", zone: "Heritage Design & Bohemian Hub", x: -15, z: 95, description: "Medieval reservoir, art galleries & rooftop dining" },
      { name: "Khan Market", pincode: "110003", zone: "Premier Luxury Retail Hub", x: 25, z: 45, description: "India's highest-rental boutique retail high street" },
      { name: "South Extension & Ring Road", pincode: "110049", zone: "Fashion & Wedding Hub", x: 20, z: 85, description: "Bridal couture, jewellery flagship stores & lifestyle" },
      { name: "Cyber City & Golf Course Rd", pincode: "122002", zone: "Cyber Hub & Corporate Corridor", x: -120, z: 180, description: "Fortune 500 tech parks & premier lifestyle promenade" },
    ],
    waterBodies: [
      { type: "river", name: "Yamuna River", x: 110, z: 0, width: 90, length: 3200, color: 0x0284c7 },
      { type: "lake", name: "Hauz Khas Tank", x: -20, z: 105, width: 60, length: 35, color: 0x0ea5e9 },
    ],
    droneCamera: {
      pos: [20, 230, 290],
      target: [0, 2, 30],
    },
    roadsGeoJsonPath: "/data/geo/delhi.roads.json",
  },
  shillong: {
    slug: "shillong",
    cityName: "Shillong",
    state: "Meghalaya",
    anchor: DEFAULT_CITY_ANCHORS.shillong,
    landscapeType: "mountain_highland",
    colonies: [
      { name: "Police Bazar Commercial Circle", pincode: "793001", zone: "Retail & Cultural Hub", x: 0, z: 0, description: "Heart of Shillong, bustling bazaars, street cafes & handicraft emporiums" },
      { name: "Laitumkhrah Main High Street", pincode: "793003", zone: "Academic & Gourmet Corridor", x: 45, z: 25, description: "Vibrant indie cafes, bakeries & student avenue" },
      { name: "Ward's Lake & Botanical Gardens", pincode: "793001", zone: "Heritage Lakefront", x: 10, z: -25, description: "Horseshoe lake, wooden bridges & cherry blossoms" },
      { name: "Polo Grounds & Sports Enclave", pincode: "793001", zone: "Sports & Traditional Markets", x: -25, z: -45, description: "Stadiums, archery grounds & local produce bazars" },
      { name: "Upper Shillong & Peak Road", pincode: "793005", zone: "Highland Tea & Pine Ridge", x: -60, z: 75, description: "Panoramic valley viewpoints & pine-covered ridges" },
    ],
    waterBodies: [
      { type: "lake", name: "Ward's Lake", x: 10, z: -25, width: 48, length: 26, color: 0x0ea5e9 },
    ],
    droneCamera: {
      pos: [35, 190, 240],
      target: [0, 2, 0],
    },
    roadsGeoJsonPath: "/data/geo/shillong.roads.json",
  },
};

/**
 * Returns the geographical configuration for any city slug or name.
 * Defaults cleanly to Guwahati if not explicitly registered.
 */
export function getCityGeoConfig(citySlugOrName: string): CityGeoConfig {
  const norm = (citySlugOrName || "guwahati").toLowerCase().replace(/\s+/g, "-");
  return (
    CITY_GEO_REGISTRY[norm] ||
    Object.values(CITY_GEO_REGISTRY).find(
      (c) => c.cityName.toLowerCase() === norm || c.slug === norm
    ) ||
    CITY_GEO_REGISTRY.guwahati
  );
}
