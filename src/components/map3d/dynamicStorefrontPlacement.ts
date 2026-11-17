import { BusinessStorefront } from "@/types";
import {
  projectGpsTo3D,
  getNearestPointOnSegment,
  DEFAULT_CITY_ANCHORS,
  CityGeoAnchor,
  Vector2D,
} from "@/lib/geo/geoProjection";
import { ColonyDefinition } from "./guwahatiCityModel";

export interface RoadSegment2D {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  name: string;
}

export interface DynamicPlotPlacement {
  business: BusinessStorefront | null;
  x: number;
  z: number;
  rotationY: number;
  isLeft: boolean;
  isConstruction?: boolean;
  isEmptyPlot?: boolean;
  isResidential?: boolean;
  colonyName: string;
  pincode: string;
  tier: number;
}

/**
 * Dynamically maps registered businesses to 3D roadside plots based on real GPS coordinates.
 * Automatically computes closest road edge, offsets building to sidewalk, and rotates
 * facade to face the road.
 */
export function computeDynamicStorefrontPlacements(
  storefronts: BusinessStorefront[],
  roads: RoadSegment2D[],
  colonies: ColonyDefinition[],
  anchor: CityGeoAnchor = DEFAULT_CITY_ANCHORS.guwahati
): DynamicPlotPlacement[] {
  const placements: DynamicPlotPlacement[] = [];

  // Filter storefronts active in current city
  const cityLower = anchor.cityName.toLowerCase();
  const activeBusinesses = storefronts.filter(
    (s) => !s?.city_name || s.city_name.toLowerCase() === cityLower
  );

  // 1. Anchor businesses with real GPS coordinates or Colony Postal Fallback
  for (const b of activeBusinesses) {
    let raw3D: Vector2D | null = null;
    const matchedColony =
      colonies.find((c) => c.pincode === b.pincode) ||
      colonies.find((c) => b.description?.toLowerCase().includes(c.name.toLowerCase())) ||
      colonies[0];

    if (typeof b.lat === "number" && typeof b.lon === "number" && b.lat !== 0) {
      raw3D = projectGpsTo3D({ lat: b.lat, lon: b.lon }, anchor);
    } else if (matchedColony) {
      // Graceful Postal / Colony fallback: anchor at colony center
      raw3D = { x: matchedColony.x, z: matchedColony.z };
    }

    if (raw3D) {
      // Find closest road segment
      let bestDist = Infinity;
      let bestRoad: RoadSegment2D | null = null;
      let bestSnap: ReturnType<typeof getNearestPointOnSegment> | null = null;

      for (const r of roads) {
        const snap = getNearestPointOnSegment(
          raw3D,
          { x: r.x1, z: r.z1 },
          { x: r.x2, z: r.z2 }
        );
        if (snap.distance < bestDist) {
          bestDist = snap.distance;
          bestRoad = r;
          bestSnap = snap;
        }
      }

      if (bestRoad && bestSnap) {
        // Offset plot to roadside sidewalk (road width / 2 + plot margin)
        const sideMultiplier = bestSnap.isLeft ? 1 : -1;
        const offsetDist = bestRoad.width / 2 + 5.5;
        const plotX = bestSnap.point.x + bestSnap.normal.x * offsetDist * sideMultiplier;
        const plotZ = bestSnap.point.z + bestSnap.normal.z * offsetDist * sideMultiplier;

        // Rotate facade (local +Z) to face towards road point
        const toRoadX = bestSnap.point.x - plotX;
        const toRoadZ = bestSnap.point.z - plotZ;
        const rotationY = Math.atan2(toRoadX, toRoadZ);

        placements.push({
          business: b,
          x: Number(plotX.toFixed(2)),
          z: Number(plotZ.toFixed(2)),
          rotationY,
          isLeft: bestSnap.isLeft,
          colonyName: matchedColony?.name || "Commercial Boulevard",
          pincode: b.pincode || matchedColony?.pincode || "781005",
          tier: 2,
        });
      }
    }
  }

  // 2. Add Exactly ONE Authentic Free Commercial Plot for New Businesses (India Again Style)
  // Placed right beside the primary commercial avenue so new users can claim and build their shop
  if (placements.length > 0 && roads.length > 0) {
    const primaryRoad = roads.find((r) => r.name.toLowerCase().includes("gs road")) || roads[0];
    const dx = primaryRoad.x2 - primaryRoad.x1;
    const dz = primaryRoad.z2 - primaryRoad.z1;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const offsetDist = primaryRoad.width / 2 + 5.5;

    // Place 18 meters down the road from the first registered business
    const firstBusiness = placements[0];
    const plotX = firstBusiness.x + (dx / len) * 18.0;
    const plotZ = firstBusiness.z + (dz / len) * 18.0;

    placements.push({
      business: null,
      x: Number(plotX.toFixed(2)),
      z: Number(plotZ.toFixed(2)),
      rotationY: firstBusiness.rotationY,
      isLeft: firstBusiness.isLeft,
      isEmptyPlot: true,
      colonyName: "GS Road Commercial Strip",
      pincode: "781005",
      tier: 1,
    });
  }

  // ZERO fake residential cottages or filler blocks. ONLY real business plots and connected roads.
  return placements;
}

