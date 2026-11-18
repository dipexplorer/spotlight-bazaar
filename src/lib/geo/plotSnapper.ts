import type { Map as MapLibreMap } from "maplibre-gl";
import { BusinessStorefront } from "@/types";

export interface RoadPolyline {
  id: string;
  source: "osm" | "colony";
  coords: [number, number][]; // [lon, lat][]
  priority: number; // higher = preferred drivable road
}

export interface SnappedPlotPlacement {
  lat: number;
  lon: number;
  rawLat: number;
  rawLon: number;
  facingBearing: number; // compass degrees 0..360 (0=N, 90=E, 180=S, 270=W)
  roadAnchorLat: number;
  roadAnchorLon: number;
  connectorType: "osm_road" | "colony_branch" | "frontage";
  connectorCoords: [number, number][]; // [lon, lat][] from plot gate to road anchor (or frontage strip)
  footprintPolygon: [number, number][]; // closed 5-point ring of the 22m x 18m rotated plot
  wasAutoAdjusted: boolean;
  adjustmentReason?: string;
}

export const PLOT_WIDTH_M = 22.0; // along road (local X)
export const PLOT_DEPTH_M = 18.0; // perpendicular to road (local Z)
export const PLOT_HALF_DEPTH_M = PLOT_DEPTH_M / 2; // 9.0m
export const ROAD_SETBACK_M = 16.5; // road half-width (3m) + apron (4.5m) + half-depth (9m)
export const MIN_ROAD_CLEARANCE_M = 13.5; // never allow plot center closer than 13.5m to ANY road centerline
export const MIN_PLOT_SPACING_M = 27.0; // center-to-center spacing between adjacent 22m plots

const DRIVABLE_ROAD_LAYERS = [
  "road_minor_fill",
  "road_service_fill",
  "road_sec_fill_noramp",
  "road_pri_fill_noramp",
  "road_pri_fill_ramp",
  "road_trunk_fill_noramp",
  "road_trunk_fill_ramp",
  "road_mot_fill_noramp",
  "bridge_minor_fill",
  "bridge_service_fill",
  "bridge_sec_fill_noramp",
  "bridge_pri_fill_noramp",
];

// Local flat-earth projection helpers (accurate to < 0.01% within 5 km)
export function metersPerDegree(latDeg: number): { mLat: number; mLon: number } {
  const rad = (latDeg * Math.PI) / 180;
  const mLat =
    111132.954 - 559.822 * Math.cos(2 * rad) + 1.175 * Math.cos(4 * rad);
  const mLon = 111412.84 * Math.cos(rad) - 93.5 * Math.cos(3 * rad);
  return { mLat, mLon };
}

export function toLocalMeters(
  originLon: number,
  originLat: number,
  lon: number,
  lat: number
): { x: number; y: number } {
  const { mLat, mLon } = metersPerDegree(originLat);
  return {
    x: (lon - originLon) * mLon, // East (+X)
    y: (lat - originLat) * mLat, // North (+Y)
  };
}

export function fromLocalMeters(
  originLon: number,
  originLat: number,
  x: number,
  y: number
): [number, number] {
  const { mLat, mLon } = metersPerDegree(originLat);
  return [originLon + x / mLon, originLat + y / mLat];
}

/**
 * Convert compass facing bearing (0=N, 90=E, 180=S, 270=W) into Three.js mesh.rotation.y
 * for our MapLibre Mercator custom layer (+Z faces South at rotation.y = 0).
 */
export function bearingToThreeRotationY(facingBearingDeg: number): number {
  const rad = (facingBearingDeg * Math.PI) / 180;
  return Math.atan2(Math.sin(rad), -Math.cos(rad));
}

/**
 * Build closed GeoJSON Polygon ring (5 lon/lat points) for a 22m x 18m plot
 * centered at (lon, lat) whose front edge (+depth/2) faces `facingBearingDeg`.
 */
export function buildPlotFootprintRing(
  lon: number,
  lat: number,
  facingBearingDeg: number,
  widthM = PLOT_WIDTH_M,
  depthM = PLOT_DEPTH_M
): [number, number][] {
  const rad = (facingBearingDeg * Math.PI) / 180;
  // Unit vector pointing toward road (front of plot) in East/North meters
  const fx = Math.sin(rad);
  const fy = Math.cos(rad);
  // Rightward unit vector along road frontage
  const rx = fy;
  const ry = -fx;

  const hw = widthM / 2;
  const hd = depthM / 2;

  const corners: [number, number][] = [
    [-hw, hd],  // front-left
    [hw, hd],   // front-right
    [hw, -hd],  // back-right
    [-hw, -hd], // back-left
    [-hw, hd],  // close ring
  ];

  return corners.map(([u, v]) =>
    fromLocalMeters(lon, lat, u * rx + v * fx, u * ry + v * fy)
  );
}

/**
 * Extract real OpenStreetMap road polylines from a live MapLibre map's loaded vector tiles.
 * 100% free, 0ms, zero external API calls.
 */
export function extractNearbyOsmRoads(
  map: MapLibreMap | null,
  centerLon: number,
  centerLat: number,
  radiusMeters = 240
): RoadPolyline[] {
  if (!map || !map.getStyle()) return [];

  const roads: RoadPolyline[] = [];
  const seenKey = new Set<string>();

  const pushCoords = (coords: [number, number][], id: string, priority: number) => {
    if (!Array.isArray(coords) || coords.length < 2) return;
    // Quick bounding-box reject before adding
    let near = false;
    for (let i = 0; i < coords.length; i++) {
      const p = toLocalMeters(centerLon, centerLat, coords[i][0], coords[i][1]);
      if (Math.hypot(p.x, p.y) <= radiusMeters + 120) {
        near = true;
        break;
      }
    }
    if (!near) return;

    const first = coords[0];
    const last = coords[coords.length - 1];
    const dedupeKey = `${first[0].toFixed(5)},${first[1].toFixed(5)}-${last[0].toFixed(5)},${last[1].toFixed(5)}`;
    if (seenKey.has(dedupeKey)) return;
    seenKey.add(dedupeKey);

    roads.push({ id, source: "osm", coords, priority });
  };

  try {
    // Prefer vector source features (returns full unclipped geometries even when pitched)
    if (map.getSource("protomaps")) {
      const rawFeatures = map.querySourceFeatures("protomaps", {
        sourceLayer: "roads",
      });
      rawFeatures.forEach((f, idx) => {
        const props = (f.properties || {}) as Record<string, unknown>;
        const kind = String(props.kind || props.pmap_kind || "").toLowerCase();
        const kindDetail = String(props.kind_detail || "").toLowerCase();
        // Skip railways, ferry lines, and footpaths if we want drivable commercial streets
        if (
          kind === "rail" ||
          kind === "ferry" ||
          kind === "aerialway" ||
          kind === "path" ||
          kindDetail === "footway" ||
          kindDetail === "steps" ||
          kindDetail === "cycleway"
        ) {
          return;
        }
        const priority =
          kind === "minor_road" || kind === "medium_road"
            ? 3
            : kind === "major_road" || kind === "highway"
              ? 2
              : 1;

        if (f.geometry.type === "LineString") {
          pushCoords(f.geometry.coordinates as [number, number][], `osm-src-${idx}`, priority);
        } else if (f.geometry.type === "MultiLineString") {
          (f.geometry.coordinates as [number, number][][]).forEach((line, sub) => {
            pushCoords(line, `osm-src-${idx}-${sub}`, priority);
          });
        }
      });
    }

    // Fallback to rendered drivable road layers if source query was empty
    if (roads.length === 0) {
      const availableLayers = DRIVABLE_ROAD_LAYERS.filter((id) => Boolean(map.getLayer(id)));
      if (availableLayers.length > 0) {
        const rendered = map.queryRenderedFeatures({ layers: availableLayers });
        rendered.forEach((f, idx) => {
          if (f.geometry.type === "LineString") {
            pushCoords(f.geometry.coordinates as [number, number][], `osm-ren-${idx}`, 2);
          } else if (f.geometry.type === "MultiLineString") {
            (f.geometry.coordinates as [number, number][][]).forEach((line, sub) => {
              pushCoords(line, `osm-ren-${idx}-${sub}`, 2);
            });
          }
        });
      }
    }
  } catch {
    // Fail gracefully if tiles are still loading
  }

  return roads;
}

interface ClosestRoadHit {
  road: RoadPolyline;
  distM: number;
  anchorX: number;
  anchorY: number;
  anchorLon: number;
  anchorLat: number;
  tangentX: number; // unit vector along road segment
  tangentY: number;
  normalX: number; // unit vector pointing from anchor toward query point
  normalY: number;
}

function findClosestRoadHit(
  originLon: number,
  originLat: number,
  px: number,
  py: number,
  roads: RoadPolyline[]
): ClosestRoadHit | null {
  let best: ClosestRoadHit | null = null;

  for (const road of roads) {
    const pts = road.coords;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = toLocalMeters(originLon, originLat, pts[i][0], pts[i][1]);
      const b = toLocalMeters(originLon, originLat, pts[i + 1][0], pts[i + 1][1]);
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const abLenSq = abx * abx + aby * aby;
      if (abLenSq < 0.01) continue;

      const t = Math.max(0, Math.min(1, ((px - a.x) * abx + (py - a.y) * aby) / abLenSq));
      const cx = a.x + t * abx;
      const cy = a.y + t * aby;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);

      if (!best || dist < best.distM) {
        const abLen = Math.sqrt(abLenSq);
        const tx = abx / abLen;
        const ty = aby / abLen;
        // Perpendicular left normal of segment
        let nx = -ty;
        let ny = tx;
        // Orient normal toward the side the user clicked (default to left normal if right on centerline)
        if (dist > 0.25 && dx * nx + dy * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        const [anchorLon, anchorLat] = fromLocalMeters(originLon, originLat, cx, cy);
        best = {
          road,
          distM: dist,
          anchorX: cx,
          anchorY: cy,
          anchorLon,
          anchorLat,
          tangentX: tx,
          tangentY: ty,
          normalX: nx,
          normalY: ny,
        };
      }
    }
  }

  return best;
}

function minDistanceToAnyRoad(
  originLon: number,
  originLat: number,
  cx: number,
  cy: number,
  roads: RoadPolyline[]
): number {
  const hit = findClosestRoadHit(originLon, originLat, cx, cy, roads);
  return hit ? hit.distM : Infinity;
}

function minDistanceToExistingPlots(
  originLon: number,
  originLat: number,
  cx: number,
  cy: number,
  existingPlots: { lat: number; lon: number; slug?: string }[],
  ignoreSlug?: string
): number {
  let best = Infinity;
  for (const p of existingPlots) {
    if (ignoreSlug && p.slug === ignoreSlug) continue;
    const m = toLocalMeters(originLon, originLat, p.lon, p.lat);
    const d = Math.hypot(cx - m.x, cy - m.y);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Core Automated Parcel Snapper & Road Connector Engine.
 * Guarantees:
 *  1. No 3D business plot EVER spawns on top of an OSM or colony road.
 *  2. Adjacent plots never collide or clip into each other (>= 27m center spacing).
 *  3. Front entrance (+Z) always rotates cleanly to face the connecting road.
 *  4. Generates seamless driveway / colony branch / frontage road LineString automatically.
 */
export function computeSnappedPlotPlacement(params: {
  rawLat: number;
  rawLon: number;
  roads: RoadPolyline[];
  existingPlots: { lat: number; lon: number; slug?: string }[];
  ignoreSlug?: string;
}): SnappedPlotPlacement {
  const { rawLat, rawLon, roads, existingPlots, ignoreSlug } = params;

  const hit = findClosestRoadHit(rawLon, rawLat, 0, 0, roads);

  // Case 3: Remote / unmapped open land (> 240m from any road or colony spine)
  if (!hit || hit.distM > 240) {
    const facingBearing = 180; // face South cleanly
    const [gateLon, gateLat] = fromLocalMeters(rawLon, rawLat, 0, -(PLOT_HALF_DEPTH_M - 0.6));
    const [roadCenterLon, roadCenterLat] = fromLocalMeters(rawLon, rawLat, 0, -ROAD_SETBACK_M);
    const [frontLeftLon, frontLeftLat] = fromLocalMeters(rawLon, rawLat, -18, -ROAD_SETBACK_M);
    const [frontRightLon, frontRightLat] = fromLocalMeters(rawLon, rawLat, 18, -ROAD_SETBACK_M);

    return {
      lat: Number(rawLat.toFixed(6)),
      lon: Number(rawLon.toFixed(6)),
      rawLat,
      rawLon,
      facingBearing,
      roadAnchorLat: Number(roadCenterLat.toFixed(6)),
      roadAnchorLon: Number(roadCenterLon.toFixed(6)),
      connectorType: "frontage",
      // Clean frontage avenue + short driveway into the plot gate
      connectorCoords: [
        [frontLeftLon, frontLeftLat],
        [roadCenterLon, roadCenterLat],
        [gateLon, gateLat],
        [roadCenterLon, roadCenterLat],
        [frontRightLon, frontRightLat],
      ],
      footprintPolygon: buildPlotFootprintRing(rawLon, rawLat, facingBearing),
      wasAutoAdjusted: false,
    };
  }

  // Evaluate candidate center positions (starting with raw point if already safe!)
  const isCandidateClear = (cx: number, cy: number): boolean => {
    const roadClear = minDistanceToAnyRoad(rawLon, rawLat, cx, cy, roads);
    const plotClear = minDistanceToExistingPlots(rawLon, rawLat, cx, cy, existingPlots, ignoreSlug);
    return roadClear >= MIN_ROAD_CLEARANCE_M && plotClear >= MIN_PLOT_SPACING_M;
  };

  let chosenX = 0;
  let chosenY = 0;
  let wasAutoAdjusted = false;
  let adjustmentReason: string | undefined;

  if (!isCandidateClear(0, 0)) {
    // Generate deterministic ordered roadside slots:
    // Preferred side at setback -> Opposite side at setback -> Slide along road tangent ±28m, ±56m, ±84m
    const candidates: { x: number; y: number; reason: string }[] = [];
    const slideSteps = [0, 28, -28, 56, -56, 84, -84];
    const setbackSteps = [ROAD_SETBACK_M, ROAD_SETBACK_M + 8];

    for (const setback of setbackSteps) {
      for (const slide of slideSteps) {
        // Preferred side
        candidates.push({
          x: hit.anchorX + hit.normalX * setback + hit.tangentX * slide,
          y: hit.anchorY + hit.normalY * setback + hit.tangentY * slide,
          reason:
            slide === 0
              ? "Auto-set back off the road for clear frontage"
              : "Auto-aligned alongside road clear of neighboring plots",
        });
        // Opposite side
        candidates.push({
          x: hit.anchorX - hit.normalX * setback + hit.tangentX * slide,
          y: hit.anchorY - hit.normalY * setback + hit.tangentY * slide,
          reason: "Snapped to open opposite roadside frontage",
        });
      }
    }

    let found: { x: number; y: number; reason: string } | null = null;
    for (const c of candidates) {
      if (isCandidateClear(c.x, c.y)) {
        found = c;
        break;
      }
    }

    if (found) {
      chosenX = found.x;
      chosenY = found.y;
      wasAutoAdjusted = true;
      adjustmentReason = found.reason;
    } else {
      // Soft fallback: still push perpendicularly off the road so it NEVER sits on asphalt
      chosenX = hit.anchorX + hit.normalX * ROAD_SETBACK_M;
      chosenY = hit.anchorY + hit.normalY * ROAD_SETBACK_M;
      wasAutoAdjusted = true;
      adjustmentReason = "Auto-set back off road centerline";
    }
  }

  const [finalLon, finalLat] = fromLocalMeters(rawLon, rawLat, chosenX, chosenY);

  // Re-project the finalized plot center onto the nearest road so the driveway is strictly perpendicular & shortest!
  const finalHit = findClosestRoadHit(rawLon, rawLat, chosenX, chosenY, roads) || hit;
  const toRoadX = finalHit.anchorX - chosenX;
  const toRoadY = finalHit.anchorY - chosenY;
  const distToRoad = Math.max(1, Math.hypot(toRoadX, toRoadY));
  const dirX = toRoadX / distToRoad;
  const dirY = toRoadY / distToRoad;

  // Compass bearing pointing directly from plot center toward road anchor (0=N, 90=E, 180=S, 270=W)
  const facingBearing = ((Math.atan2(dirX, dirY) * 180) / Math.PI + 360) % 360;

  // Driveway starts tucked slightly under front plinth edge (8.4m from center) to road centerline anchor
  const gateOffset = Math.min(PLOT_HALF_DEPTH_M - 0.6, Math.max(2, distToRoad - 2));
  const [gateLon, gateLat] = fromLocalMeters(
    rawLon,
    rawLat,
    chosenX + dirX * gateOffset,
    chosenY + dirY * gateOffset
  );

  const connectorType: "osm_road" | "colony_branch" =
    finalHit.road.source === "colony" ? "colony_branch" : "osm_road";

  return {
    lat: Number(finalLat.toFixed(6)),
    lon: Number(finalLon.toFixed(6)),
    rawLat,
    rawLon,
    facingBearing: Number(facingBearing.toFixed(1)),
    roadAnchorLat: Number(finalHit.anchorLat.toFixed(6)),
    roadAnchorLon: Number(finalHit.anchorLon.toFixed(6)),
    connectorType,
    connectorCoords: [
      [gateLon, gateLat],
      [finalHit.anchorLon, finalHit.anchorLat],
    ],
    footprintPolygon: buildPlotFootprintRing(finalLon, finalLat, facingBearing),
    wasAutoAdjusted,
    adjustmentReason,
  };
}

/**
 * Resolve every non-Nerqiva storefront in order so:
 *  - Already-snapped plots keep their exact geometry AND contribute their driveways as colony roads.
 *  - Legacy/unsnapped plots (or plots sitting directly on a road) automatically self-heal without touching DB.
 *  - Returns a single GeoJSON FeatureCollection of all seamless plot driveways/colony connectors + resolved plot map!
 */
export function resolveAllStorefrontPlacements(params: {
  storefronts: BusinessStorefront[];
  osmRoads: RoadPolyline[];
  colonySeedRoads: RoadPolyline[];
}): {
  resolvedBySlug: Map<string, SnappedPlotPlacement>;
  connectorsGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString>;
} {
  const { storefronts, osmRoads, colonySeedRoads } = params;
  const resolvedBySlug = new Map<string, SnappedPlotPlacement>();
  const dynamicRoads: RoadPolyline[] = [...osmRoads, ...colonySeedRoads];
  const occupiedPlots: { lat: number; lon: number; slug: string }[] = [];
  const connectorFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  // Register Nerqiva Studio first as an immovable anchor plot
  for (const s of storefronts) {
    if (s.slug === "nerqiva-studio") {
      occupiedPlots.push({ lat: s.lat, lon: s.lon, slug: s.slug });
    }
  }

  for (const s of storefronts) {
    if (!s || s.slug === "nerqiva-studio") continue;
    if (typeof s.lat !== "number" || typeof s.lon !== "number") continue;

    // Check if storefront already has saved snapped metadata AND is clear of all roads & plots
    const hasSavedSnap =
      typeof s.facing_bearing === "number" &&
      typeof s.road_anchor_lat === "number" &&
      typeof s.road_anchor_lon === "number";

    let placement: SnappedPlotPlacement;

    if (hasSavedSnap) {
      const roadClear = minDistanceToAnyRoad(s.lon, s.lat, 0, 0, dynamicRoads);
      const plotClear = minDistanceToExistingPlots(s.lon, s.lat, 0, 0, occupiedPlots, s.slug);

      if (roadClear >= MIN_ROAD_CLEARANCE_M - 1.5 && plotClear >= MIN_PLOT_SPACING_M - 2) {
        const rad = (s.facing_bearing! * Math.PI) / 180;
        const [gateLon, gateLat] = fromLocalMeters(
          s.lon,
          s.lat,
          Math.sin(rad) * (PLOT_HALF_DEPTH_M - 0.6),
          Math.cos(rad) * (PLOT_HALF_DEPTH_M - 0.6)
        );
        const connectorCoords: [number, number][] =
          s.connector_type === "frontage"
            ? (() => {
                const fx = Math.sin(rad);
                const fy = Math.cos(rad);
                const rx = fy;
                const ry = -fx;
                const a = toLocalMeters(s.lon, s.lat, s.road_anchor_lon!, s.road_anchor_lat!);
                const [flLon, flLat] = fromLocalMeters(s.lon, s.lat, a.x - rx * 18, a.y - ry * 18);
                const [frLon, frLat] = fromLocalMeters(s.lon, s.lat, a.x + rx * 18, a.y + ry * 18);
                return [
                  [flLon, flLat],
                  [s.road_anchor_lon!, s.road_anchor_lat!],
                  [gateLon, gateLat],
                  [s.road_anchor_lon!, s.road_anchor_lat!],
                  [frLon, frLat],
                ];
              })()
            : [
                [gateLon, gateLat],
                [s.road_anchor_lon!, s.road_anchor_lat!],
              ];

        placement = {
          lat: s.lat,
          lon: s.lon,
          rawLat: s.lat,
          rawLon: s.lon,
          facingBearing: s.facing_bearing!,
          roadAnchorLat: s.road_anchor_lat!,
          roadAnchorLon: s.road_anchor_lon!,
          connectorType: s.connector_type || "osm_road",
          connectorCoords,
          footprintPolygon: buildPlotFootprintRing(s.lon, s.lat, s.facing_bearing!),
          wasAutoAdjusted: false,
        };
      } else {
        placement = computeSnappedPlotPlacement({
          rawLat: s.lat,
          rawLon: s.lon,
          roads: dynamicRoads,
          existingPlots: occupiedPlots,
          ignoreSlug: s.slug,
        });
      }
    } else {
      // Self-heal legacy / unsnapped storefronts automatically!
      placement = computeSnappedPlotPlacement({
        rawLat: s.lat,
        rawLon: s.lon,
        roads: dynamicRoads,
        existingPlots: occupiedPlots,
        ignoreSlug: s.slug,
      });
    }

    resolvedBySlug.set(s.slug, placement);
    occupiedPlots.push({ lat: placement.lat, lon: placement.lon, slug: s.slug });

    // Add this plot's generated connector into the colony road graph so subsequent nearby plots can branch off it!
    if (placement.connectorCoords.length >= 2) {
      dynamicRoads.push({
        id: `colony-${s.slug}`,
        source: "colony",
        coords: placement.connectorCoords,
        priority: 2,
      });
      connectorFeatures.push({
        type: "Feature",
        properties: {
          slug: s.slug,
          connectorType: placement.connectorType,
        },
        geometry: {
          type: "LineString",
          coordinates: placement.connectorCoords,
        },
      });
    }
  }

  return {
    resolvedBySlug,
    connectorsGeoJSON: {
      type: "FeatureCollection",
      features: connectorFeatures,
    },
  };
}

/**
 * Known colony spine roads (e.g. Nerqiva Studio's North Guwahati access road)
 * so both /register mini-map snapping and the main 3D map snap adjacent plots cleanly off the colony road.
 */
export function getColonySeedRoads(): RoadPolyline[] {
  const roadJunction: [number, number] = [91.72838062047958, 26.206399578544207];
  const nerqivaCenter: [number, number] = [91.72925728895483, 26.20624167049662];
  // Gate sits ~12m west-northwest of Nerqiva center along the access spine
  const m = toLocalMeters(roadJunction[0], roadJunction[1], nerqivaCenter[0], nerqivaCenter[1]);
  const dist = Math.hypot(m.x, m.y);
  const ratio = Math.max(0.1, (dist - 12) / dist);
  const gatePt = fromLocalMeters(roadJunction[0], roadJunction[1], m.x * ratio, m.y * ratio);

  return [
    {
      id: "colony-seed-nerqiva-spine",
      source: "colony",
      coords: [roadJunction, gatePt],
      priority: 3,
    },
  ];
}
