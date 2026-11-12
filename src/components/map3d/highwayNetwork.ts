import * as THREE from "three";
import { City } from "@/types";
import { toWorld } from "./projection";

export interface HighwayNetworkResult {
  group: THREE.Group;
  update: (delta: number) => void;
  dispose: () => void;
}

interface HighwaySegment {
  name: string;
  from: string;
  to: string;
  curve: THREE.CatmullRomCurve3;
}

/**
 * Builds the National Highway Spine (Golden Quadrilateral & Corridors)
 * connecting India's major commercial hubs with 3D asphalt ribbons
 * and animated golden commercial energy pulses.
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

  const ROAD_Y = 6.14;
  const ROAD_WIDTH = 4.2;
  const segments: HighwaySegment[] = [];

  const roadPositions: number[] = [];
  const roadIndices: number[] = [];
  let roadOffset = 0;

  for (const [name, fromCity, toCity] of highwayConnections) {
    const p1 = cityMap.get(fromCity);
    const p2 = cityMap.get(toCity);
    if (!p1 || !p2) continue;

    // Slight curvature to follow natural Indian topography
    const midX = (p1.x + p2.x) / 2 + (p2.z - p1.z) * 0.08;
    const midZ = (p1.z + p2.z) / 2 - (p2.x - p1.x) * 0.08;

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(p1.x, ROAD_Y, p1.z),
      new THREE.Vector3(midX, ROAD_Y, midZ),
      new THREE.Vector3(p2.x, ROAD_Y, p2.z),
    ]);

    segments.push({ name, from: fromCity, to: toCity, curve });

    // Generate quad strip
    const points = curve.getPoints(24);
    const halfWidth = ROAD_WIDTH / 2;

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];

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

  // Asphalt road mesh
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Asphalt slate dark grey
    roughness: 0.85,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // Animated Golden Energy Pulses along highways (Commerce Traffic)
  const pulseCount = segments.length * 2;
  const pulseGeo = new THREE.SphereGeometry(2.4, 8, 8);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24, // Glowing warm amber commerce spark
  });

  const pulseInst = new THREE.InstancedMesh(pulseGeo, pulseMat, pulseCount);
  group.add(pulseInst);

  const dummy = new THREE.Object3D();
  let progress = 0;

  const update = (delta: number) => {
    progress += delta * 0.18; // Speed of commerce flow
    if (progress > 1) progress -= 1;

    let instIdx = 0;
    for (const seg of segments) {
      // Pulse 1
      const t1 = (progress + (instIdx * 0.23)) % 1;
      const pt1 = seg.curve.getPoint(t1);
      dummy.position.set(pt1.x, ROAD_Y + 0.8, pt1.z);
      dummy.scale.set(1.1, 1.1, 1.1);
      dummy.updateMatrix();
      pulseInst.setMatrixAt(instIdx++, dummy.matrix);

      // Pulse 2 (Reverse or offset)
      const t2 = (1.0 - ((progress + (instIdx * 0.31)) % 1)) % 1;
      const pt2 = seg.curve.getPoint(t2);
      dummy.position.set(pt2.x, ROAD_Y + 0.8, pt2.z);
      dummy.scale.set(0.9, 0.9, 0.9);
      dummy.updateMatrix();
      pulseInst.setMatrixAt(instIdx++, dummy.matrix);
    }
    pulseInst.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    roadMat.dispose();
    roadGeo.dispose();
    pulseMat.dispose();
    pulseGeo.dispose();
  };

  return {
    group,
    update,
    dispose,
  };
}
