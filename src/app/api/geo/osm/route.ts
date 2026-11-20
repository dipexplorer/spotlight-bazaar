import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface OsmQueryResponse {
  city: string;
  source: "cache" | "overpass" | "procedural_fallback";
  roads: any;
  water?: any;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawSlug = searchParams.get("slug") || searchParams.get("city");
  const slug = (rawSlug || "guwahati").toLowerCase().trim();
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  const radius = parseInt(searchParams.get("radius") || "3000", 10);

  const hasCoords = Boolean(latStr && lonStr);
  const lat = hasCoords ? parseFloat(latStr!) : NaN;
  const lon = hasCoords ? parseFloat(lonStr!) : NaN;

  const geoDir = path.join(process.cwd(), "public", "data", "geo");

  // 1. Try local cached pre-bundled GIS datasets
  // ONLY use local cache if caller explicitly requested city/slug without coordinates
  const targetSlug = (!hasCoords && rawSlug) ? rawSlug.toLowerCase().trim() : null;

  if (targetSlug) {
    const localRoadsFile = path.join(geoDir, `${targetSlug}.roads.json`);
    const localWaterFile = path.join(geoDir, `${targetSlug}.water.json`);

    if (fs.existsSync(localRoadsFile)) {
      try {
        const roadContent = fs.readFileSync(localRoadsFile, "utf-8");
        const roadsJson = JSON.parse(roadContent);
        let waterJson = null;
        if (fs.existsSync(localWaterFile)) {
          waterJson = JSON.parse(fs.readFileSync(localWaterFile, "utf-8"));
        }

        return NextResponse.json({
          city: targetSlug,
          source: "cache",
          roads: roadsJson,
          water: waterJson,
        });
      } catch (err) {
        console.warn(`[OSM API] Failed reading local cache for ${targetSlug}:`, err);
      }
    }
  }

  // 2. If lat/lon provided and not in cache, query OpenStreetMap Overpass API
  if (!isNaN(lat) && !isNaN(lon)) {
    const overpassQuery = `
      [out:json][timeout:15];
      (
        way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|living_street"](around:${radius},${lat},${lon});
        way["natural"="water"](around:${radius},${lat},${lon});
        way["waterway"~"riverbank|river|stream"](around:${radius},${lat},${lon});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SpotlightBazaar/1.0",
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (overpassRes.ok) {
        const rawOsm = await overpassRes.json();
        const geoJson = convertOsmToGeoJson(rawOsm);

        return NextResponse.json({
          city: slug,
          source: "overpass",
          roads: geoJson.roads,
          water: geoJson.water,
        });
      }
    } catch (osmErr) {
      console.warn(`[OSM API] Overpass API query failed or timed out:`, osmErr);
    }
  }

  // 3. Graceful fallback: synthesize GeoJSON based on registered coordinates
  const fallbackRoads = generateSyntheticGeoJson(slug, latStr ? parseFloat(latStr) : 26.1528, lonStr ? parseFloat(lonStr) : 91.7652);
  return NextResponse.json({
    city: slug,
    source: "procedural_fallback",
    roads: fallbackRoads,
  });
}

/**
 * Converts raw Overpass nodes and ways into GeoJSON FeatureCollections
 */
function convertOsmToGeoJson(osmData: any) {
  const nodeMap = new Map<number, [number, number]>();

  for (const el of osmData.elements || []) {
    if (el.type === "node") {
      nodeMap.set(el.id, [el.lon, el.lat]);
    }
  }

  const roadFeatures: any[] = [];
  const waterFeatures: any[] = [];

  for (const el of osmData.elements || []) {
    if (el.type !== "way" || !el.nodes || el.nodes.length < 2) continue;

    const coords: [number, number][] = [];
    for (const nid of el.nodes) {
      const coord = nodeMap.get(nid);
      if (coord) coords.push(coord);
    }
    if (coords.length < 2) continue;

    const tags = el.tags || {};
    if (tags.highway) {
      roadFeatures.push({
        type: "Feature",
        properties: {
          name: tags.name || `${tags.highway.toUpperCase()} Road`,
          highway: tags.highway,
          width: tags.highway === "trunk" || tags.highway === "primary" ? 9.5 : 8.0,
          lanes: tags.lanes ? parseInt(tags.lanes, 10) : 2,
        },
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      });
    } else if (tags.natural === "water" || tags.waterway) {
      waterFeatures.push({
        type: "Feature",
        properties: {
          name: tags.name || "Water Body",
          waterway: tags.waterway || tags.natural,
        },
        geometry: {
          type: coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1] ? "Polygon" : "LineString",
          coordinates: coords[0][0] === coords[coords.length - 1][0] ? [coords] : coords,
        },
      });
    }
  }

  return {
    roads: {
      type: "FeatureCollection",
      features: roadFeatures,
    },
    water: {
      type: "FeatureCollection",
      features: waterFeatures,
    },
  };
}

function generateSyntheticGeoJson(slug: string, lat: number, lon: number) {
  // Generates arterial cross roads around the center coordinate
  const delta = 0.015;
  return {
    type: "FeatureCollection",
    name: `${slug}_synthetic`,
    features: [
      {
        type: "Feature",
        properties: { name: "Main Commercial Avenue", highway: "primary", width: 9.5 },
        geometry: { type: "LineString", coordinates: [[lon - delta, lat], [lon + delta, lat]] },
      },
      {
        type: "Feature",
        properties: { name: "Cross Boulevard", highway: "primary", width: 9.5 },
        geometry: { type: "LineString", coordinates: [[lon, lat - delta], [lon, lat + delta]] },
      },
      {
        type: "Feature",
        properties: { name: "Inner Ring Road", highway: "secondary", width: 8.5 },
        geometry: {
          type: "LineString",
          coordinates: [
            [lon - delta * 0.6, lat - delta * 0.6],
            [lon + delta * 0.6, lat - delta * 0.6],
            [lon + delta * 0.6, lat + delta * 0.6],
            [lon - delta * 0.6, lat + delta * 0.6],
            [lon - delta * 0.6, lat - delta * 0.6],
          ],
        },
      },
    ],
  };
}

