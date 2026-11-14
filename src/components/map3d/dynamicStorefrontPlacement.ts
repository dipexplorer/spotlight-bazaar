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

  // 2. Official Available / Claimable Commercial Plots for Postal PIN Codes
  // (Ensures each major postal hub has an open plot where users can tap "Claim Plot ₹0")
  const defaultAvailablePlots: {
    colonyName: string;
    pincode: string;
    targetRoadName: string;
    isConstruction?: boolean;
  }[] = cityLower.includes("mumbai")
    ? [
        { colonyName: "Bandra West Linking Road", pincode: "400050", targetRoadName: "Linking Road" },
        { colonyName: "BKC Financial Center", pincode: "400051", targetRoadName: "BKC Avenue" },
        { colonyName: "Marine Drive Promenade", pincode: "400020", targetRoadName: "Marine Drive" },
        { colonyName: "Andheri West Commercial", pincode: "400053", targetRoadName: "Western Express" },
        { colonyName: "Worli Sea Face", pincode: "400018", targetRoadName: "Worli" },
      ]
    : cityLower.includes("bangalore") || cityLower.includes("bengaluru")
    ? [
        { colonyName: "MG Road Central Promenade", pincode: "560001", targetRoadName: "Mahatma Gandhi Road" },
        { colonyName: "Indiranagar 100ft High Street", pincode: "560038", targetRoadName: "100 Feet Road" },
        { colonyName: "Koramangala 80ft Food Street", pincode: "560034", targetRoadName: "80 Feet Road" },
        { colonyName: "Brigade Road Commercial Walk", pincode: "560025", targetRoadName: "Brigade Road" },
        { colonyName: "HSR Layout Sector 1", pincode: "560102", targetRoadName: "HSR 27th Main" },
      ]
    : cityLower.includes("delhi")
    ? [
        { colonyName: "Connaught Place Inner Circle", pincode: "110001", targetRoadName: "Connaught Place" },
        { colonyName: "Janpath Heritage Boulevard", pincode: "110001", targetRoadName: "Janpath Avenue" },
        { colonyName: "Hauz Khas Village High Street", pincode: "110016", targetRoadName: "Hauz Khas" },
        { colonyName: "South Extension Part 1", pincode: "110049", targetRoadName: "Ring Road" },
        { colonyName: "Cyber City Corporate Strip", pincode: "122002", targetRoadName: "Cyber Hub" },
      ]
    : [
        {
          colonyName: "GS Road & Christian Basti",
          pincode: "781005",
          targetRoadName: "GS Road (Ulubari - Christian Basti Flagship)",
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
          targetRoadName: "AT Road (Machkhowa - Paltan Bazar)",
        },
        {
          colonyName: "Dispur Secretariat Avenue",
          pincode: "781006",
          targetRoadName: "GS Road (Ganeshguri - Dispur Secretariat)",
        },
        {
          colonyName: "Ganeshguri Commercial Center",
          pincode: "781005",
          targetRoadName: "GS Road (Walford - Ganeshguri Flyover)",
        },
        {
          colonyName: "Jalukbari & Saraighat Gateway",
          pincode: "781014",
          targetRoadName: "AT Road (Jalukbari - Maligaon)",
        },
        {
          colonyName: "Chandmari & Zoo Road",
          pincode: "781003",
          targetRoadName: "Zoo Road (Zoo Tiniali - Assam State Zoo)",
        },
        {
          colonyName: "Six Mile Commercial Corridor",
          pincode: "781022",
          targetRoadName: "GS Road (Downtown - Six Mile Flyover)",
        },
        {
          colonyName: "Beltola Historic Market",
          pincode: "781028",
          targetRoadName: "Beltola Bazar Chariali",
        },
        {
          colonyName: "Uzan Bazar Riverfront",
          pincode: "781004",
          targetRoadName: "MG Road (Uzan Bazar Riverfront)",
        },
        {
          colonyName: "Kharghuli Scenic Boulevard",
          pincode: "781004",
          targetRoadName: "Kharghuli - Ramsa Hill Road",
        },
      ];

  for (const ap of defaultAvailablePlots) {
    const road =
      roads.find((r) => r.name.toLowerCase().includes(ap.targetRoadName.toLowerCase())) ||
      roads.find((r) => r.name.toLowerCase().includes(ap.colonyName.split(" ")[0].toLowerCase())) ||
      roads[Math.min(placements.length, roads.length - 1)];
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

