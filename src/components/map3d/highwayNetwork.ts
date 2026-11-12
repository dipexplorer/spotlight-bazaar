import * as THREE from "three";
import { City } from "@/types";
import { toWorld } from "./projection";

export interface HighwayNetworkResult {
  group: THREE.Group;
  update: (delta: number) => void;
  dispose: () => void;
}

/**
 * Builds clean, subtle national highway connectors (Golden Quadrilateral & National Corridors)
 * connecting commercial hubs with refined asphalt road ribbons.
 * NO distracting floating balls or confusing moving spheres!
 */
export function buildHighwayNetwork(cities: City[]): HighwayNetworkResult {
  const group = new THREE.Group();
  group.name = "india_highways_group";

  const cityMap = new Map<string, { x: number; z: number }>();
  for (const c of cities) {
    const [x, z] = toWorld(c.lon, c.lat);
    cityMap.set(c.name.toLowerCase(), { x, z });
    cityMap.set(c.slug.toLowerCase(), { x, z });
  }

  // Major National Highway Arteries
  const highwayConnections: [string, string, string][] = [
    // NH-27 / NH-19 East-West Trunk
    ["NH-27 East", "guwahati", "kolkata"],
    ["NH-19 Gangetic", "kolkata", "varanasi"],
    ["NH-19 Awadh", "varanasi", "lucknow"],
    ["Yamuna Expressway", "lucknow", "delhi ncr"],

    // NH-48 Western Trunk
    ["NH-48 Rajputana", "delhi ncr", "jaipur"],
    ["NH-48 Gujarat", "jaipur", "ahmedabad"],
    ["NH-48 Coastal", "ahmedabad", "mumbai"],
    ["Mumbai-Pune Expressway", "mumbai", "pune"],
    ["NH-66 Konkan", "pune", "goa"],
    ["NH-66 Malabar", "goa", "kochi"],
    ["NH-44 South", "kochi", "bangalore"],

    // Central & Southern Connectors
    ["NH-44 Deccan", "bangalore", "hyderabad"],
    ["NH-44 Central", "hyderabad", "indore"],
    ["NH-52 Malwa", "indore", "jaipur"],

    // Eastern Coastal Highway
    ["NH-16 South Coast", "bangalore", "chennai"],
    ["NH-16 Andhra", "chennai", "hyderabad"],
    ["NH-16 Kalinga", "hyderabad", "kolkata"],

    // Northern Corridors
    ["Grand Trunk North", "delhi ncr", "chandigarh"],
  ];

  const ROAD_Y = 6.06;
  const ROAD_WIDTH = 1.6;

  const roadPositions: number[] = [];
  const roadIndices: number[] = [];
  let roadOffset = 0;

  for (const [name, fromCity, toCity] of highwayConnections) {
    const p1 = cityMap.get(fromCity);
    const p2 = cityMap.get(toCity);
    if (!p1 || !p2) continue;

    // Slight curvature to follow natural topography
    const midX = (p1.x + p2.x) / 2 + (p2.z - p1.z) * 0.05;
    const midZ = (p1.z + p2.z) / 2 - (p2.x - p1.x) * 0.05;

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(p1.x, ROAD_Y, p1.z),
      new THREE.Vector3(midX, ROAD_Y, midZ),
      new THREE.Vector3(p2.x, ROAD_Y, p2.z),
    ]);

    const numPoints = 20;
    const pts = curve.getPoints(numPoints);
    const halfWidth = ROAD_WIDTH / 2;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.001) continue;

      const nx = -dz / len;
      const nz = dx / len;

      roadPositions.push(
        a.x + nx * halfWidth, ROAD_Y, a.z + nz * halfWidth,
        a.x - nx * halfWidth, ROAD_Y, a.z - nz * halfWidth,
        b.x + nx * halfWidth, ROAD_Y, b.z + nz * halfWidth,
        b.x - nx * halfWidth, ROAD_Y, b.z - nz * halfWidth
      );

      roadIndices.push(
        roadOffset, roadOffset + 2, roadOffset + 1,
        roadOffset + 1, roadOffset + 2, roadOffset + 3
      );

      roadOffset += 4;
    }
  }

  // Refined, subtle asphalt road ribbon
  const roadMat = new THREE.MeshBasicMaterial({
    color: 0x334155, // Clean slate highway ribbon
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setIndex(roadIndices);

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  group.add(roadMesh);

  const update = (_delta: number) => {
    // Clean static road ribbon - zero distracting moving balls
  };

  const dispose = () => {
    roadGeo.dispose();
    roadMat.dispose();
  };

  return { group, update, dispose };
}
