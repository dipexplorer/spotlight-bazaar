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

  // 1. Anchor businesses with real GPS coordinates
  for (const b of activeBusinesses) {
    if (typeof b.lat === "number" && typeof b.lon === "number" && b.lat !== 0) {
      const raw3D = projectGpsTo3D({ lat: b.lat, lon: b.lon }, anchor);

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

        // Find matching colony by PIN
        const matchedColony = colonies.find((c) => c.pincode === b.pincode) || colonies[0];

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

  // 2. Official Available / Claimable Commercial Plots for Postal PIN Codes
  // (Ensures each major postal hub has an open plot where users can tap "Claim Plot ₹0")
  const defaultAvailablePlots: {
    colonyName: string;
    pincode: string;
    targetRoadName: string;
    isConstruction?: boolean;
  }[] = [
    {
      colonyName: "GS Road Commercial District",
      pincode: "781005",
      targetRoadName: "GS Road (Paltan - Bhangagarh)",
      isConstruction: true,
    },
    {
      colonyName: "Pan Bazar Riverfront",
      pincode: "781001",
      targetRoadName: "MG Road (Bharalumukh - Pan Bazar)",
    },
    {
      colonyName: "Uzan Bazar Lakefront",
      pincode: "781004",
      targetRoadName: "GNB Road (Dighalipukhuri Lake Promenade)",
    },
    {
      colonyName: "Paltan Bazar Station Road",
      pincode: "781008",
      targetRoadName: "AT Road (Bharalumukh - Paltan Bazar)",
    },
    {
      colonyName: "Dispur Secretariat Avenue",
      pincode: "781006",
      targetRoadName: "GS Road (Dispur Secretariat)",
    },
    {
      colonyName: "Jalukbari Gateway",
      pincode: "781014",
      targetRoadName: "AT Road (Jalukbari - Maligaon)",
    },
    {
      colonyName: "Chandmari & Zoo Road",
      pincode: "781003",
      targetRoadName: "Zoo Road (Chandmari - State Zoo)",
    },
    {
      colonyName: "Ganeshguri Commercial Center",
      pincode: "781005",
      targetRoadName: "GS Road (Ganeshguri Flyover)",
    },
  ];

  for (const ap of defaultAvailablePlots) {
    const road = roads.find((r) => r.name.toLowerCase().includes(ap.targetRoadName.toLowerCase())) || roads[0];
    if (road) {
      // Place midway along the road on the opposite side
      const midPoint: Vector2D = {
        x: (road.x1 + road.x2) / 2,
        z: (road.z1 + road.z2) / 2,
      };
      const dx = road.x2 - road.x1;
      const dz = road.z2 - road.z1;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;

      const offsetDist = road.width / 2 + 5.5;
      const plotX = midPoint.x + nx * offsetDist;
      const plotZ = midPoint.z + nz * offsetDist;

      const toRoadX = midPoint.x - plotX;
      const toRoadZ = midPoint.z - plotZ;
      const rotationY = Math.atan2(toRoadX, toRoadZ);

      placements.push({
        business: null,
        x: Number(plotX.toFixed(2)),
        z: Number(plotZ.toFixed(2)),
        rotationY,
        isLeft: false,
        isConstruction: Boolean(ap.isConstruction),
        isEmptyPlot: !ap.isConstruction,
        colonyName: ap.colonyName,
        pincode: ap.pincode,
        tier: 1,
      });
    }
  }

  return placements;
}
