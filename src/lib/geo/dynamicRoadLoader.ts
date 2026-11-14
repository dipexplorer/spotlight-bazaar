import {
  projectGpsTo3D,
  CityGeoAnchor,
  DEFAULT_CITY_ANCHORS,
} from "./geoProjection";

export interface GeoJsonRoadFeature {
  type: "Feature";
  properties: {
    name?: string;
    highway?: string;
    width?: number;
    isBridge?: boolean;
    lanes?: number;
    surface?: string;
  };
  geometry: {
    type: "LineString" | "MultiLineString";
    coordinates: number[][] | number[][][];
  };
}

export interface GeoJsonRoadCollection {
  type: "FeatureCollection";
  name?: string;
  features: GeoJsonRoadFeature[];
}

export interface RoadSegment2D {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  name: string;
  highway?: string;
  isBridge?: boolean;
}

// In-memory cache for loaded GIS road networks
const roadCache = new Map<string, RoadSegment2D[]>();

/**
 * Parses a GeoJSON FeatureCollection into 3D Cartesian road segments using the city's GPS anchor.
 */
export function parseGeoJsonToRoads(
  geoJson: GeoJsonRoadCollection,
  anchor: CityGeoAnchor
): RoadSegment2D[] {
  const segments: RoadSegment2D[] = [];

  for (const f of geoJson.features) {
    if (!f.geometry || !f.geometry.coordinates) continue;

    const props = f.properties || {};
    const roadName = props.name || "Commercial Road";
    const width = props.width || (props.highway === "primary" ? 10.0 : props.highway === "secondary" ? 8.5 : 7.5);
    const isBridge = Boolean(props.isBridge);
    const highway = props.highway || "residential";

    const lines: number[][][] =
      f.geometry.type === "LineString"
        ? [f.geometry.coordinates as number[][]]
        : (f.geometry.coordinates as number[][][]);

    for (const coords of lines) {
      if (coords.length < 2) continue;

      for (let i = 0; i < coords.length - 1; i++) {
        const [lon1, lat1] = coords[i];
        const [lon2, lat2] = coords[i + 1];

        if (lon1 === undefined || lat1 === undefined || lon2 === undefined || lat2 === undefined) continue;

        const p1 = projectGpsTo3D({ lat: lat1, lon: lon1 }, anchor);
        const p2 = projectGpsTo3D({ lat: lat2, lon: lon2 }, anchor);

        const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        if (len < 0.5) continue; // Skip degenerate segments

        segments.push({
          x1: p1.x,
          z1: p1.z,
          x2: p2.x,
          z2: p2.z,
          width,
          name: roadName,
          highway,
          isBridge,
        });
      }
    }
  }

  return segments;
}

/**
 * Registers pre-bundled GIS road segments for a city
 */
export function registerCityRoads(citySlug: string, roads: RoadSegment2D[]): void {
  const key = citySlug.toLowerCase().trim();
  roadCache.set(key, roads);
}

/**
 * Gets the active GIS road segments for a given city
 */
export function getLoadedCityRoads(citySlug: string): RoadSegment2D[] | null {
  const key = citySlug.toLowerCase().trim();
  return roadCache.get(key) || null;
}

/**
 * Dynamically fetches and parses a city's GeoJSON road vector dataset from /data/geo/{citySlug}.roads.json
 */
export async function fetchCityRoadsGeoJson(
  citySlug: string,
  anchor: CityGeoAnchor = DEFAULT_CITY_ANCHORS[citySlug] || DEFAULT_CITY_ANCHORS.guwahati
): Promise<RoadSegment2D[]> {
  const key = citySlug.toLowerCase().trim();
  if (roadCache.has(key)) {
    return roadCache.get(key)!;
  }

  try {
    const res = await fetch(`/data/geo/${key}.roads.json`);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status} loading roads for ${key}`);
    }
    const data: GeoJsonRoadCollection = await res.json();
    const segments = parseGeoJsonToRoads(data, anchor);
    roadCache.set(key, segments);
    return segments;
  } catch (err) {
    console.warn(`[DynamicRoadLoader] Failed to fetch dynamic GeoJSON for ${citySlug}, using fallback:`, err);
    return [];
  }
}
