import * as THREE from "three";
import { toWorld } from "./projection";

export interface IndiaLandData {
  source?: string;
  rings: [number, number][][];
}

/**
 * Builds the golden sandy beach shelf and shallow turquoise coastal water gradient
 * running along India's coastline (Gujarat, Konkan, Malabar, Coromandel, Odisha, Bengal).
 */
export function buildTopographyBeaches(landData: IndiaLandData): THREE.Group {
  const group = new THREE.Group();
  group.name = "india_beaches_group";

  // Beach sand material
  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xf1dfaa, // Warm golden beach sand
    roughness: 0.9,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  // Shallow turquoise ocean shelf material
  const reefMat = new THREE.MeshBasicMaterial({
    color: 0x0891b2, // Vibrant cyan-turquoise shallow reef
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const SAND_WIDTH = 4.2;
  const REEF_WIDTH = 14.0;
  const SAND_Y = 5.92;
  const REEF_Y = 5.4;

  const sandPositions: number[] = [];
  const sandIndices: number[] = [];
  let sandOffset = 0;

  const reefPositions: number[] = [];
  const reefIndices: number[] = [];
  let reefOffset = 0;

  for (const ring of landData.rings) {
    if (!ring || ring.length < 10) continue;

    // Convert boundary ring to world coordinates
    const worldRing: { x: number; z: number }[] = [];
    for (const [lon, lat] of ring) {
      // Focus beaches primarily on southern coastal latitudes (below 25°N or coastal Gujarat)
      const [x, z] = toWorld(lon, lat);
      worldRing.push({ x, z });
    }

    // Only process coastline segments where lat < 24.5 or lon < 74 (coastal states)
    for (let i = 0; i < worldRing.length - 1; i++) {
      const origLat = ring[i][1];
      const origLon = ring[i][0];

      // Filter: only apply beach shelf to sea-facing coastlines
      const isCoast =
        origLat < 23.5 ||
        (origLat < 25.0 && origLon < 71.5) || // Gujarat coast / Gulf of Kutch
        (origLat < 24.0 && origLon > 87.0);   // Bengal Sundarbans

      if (!isCoast) continue;

      const p1 = worldRing[i];
      const p2 = worldRing[i + 1];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;

      // Normal facing outwards
      const nx = -dz / len;
      const nz = dx / len;

      // 1. Golden Sand Band
      sandPositions.push(
        p1.x, SAND_Y, p1.z,
        p1.x + nx * SAND_WIDTH, SAND_Y, p1.z + nz * SAND_WIDTH,
        p2.x, SAND_Y, p2.z,
        p2.x + nx * SAND_WIDTH, SAND_Y, p2.z + nz * SAND_WIDTH
      );
      sandIndices.push(
        sandOffset, sandOffset + 2, sandOffset + 1,
        sandOffset + 1, sandOffset + 2, sandOffset + 3
      );
      sandOffset += 4;

      // 2. Turquoise Shallow Water Shelf
      reefPositions.push(
        p1.x + nx * SAND_WIDTH, REEF_Y, p1.z + nz * SAND_WIDTH,
        p1.x + nx * (SAND_WIDTH + REEF_WIDTH), REEF_Y, p1.z + nz * (SAND_WIDTH + REEF_WIDTH),
        p2.x + nx * SAND_WIDTH, REEF_Y, p2.z + nz * SAND_WIDTH,
        p2.x + nx * (SAND_WIDTH + REEF_WIDTH), REEF_Y, p2.z + nz * (SAND_WIDTH + REEF_WIDTH)
      );
      reefIndices.push(
        reefOffset, reefOffset + 2, reefOffset + 1,
        reefOffset + 1, reefOffset + 2, reefOffset + 3
      );
      reefOffset += 4;
    }
  }

  if (sandPositions.length > 0) {
    const sandGeo = new THREE.BufferGeometry();
    sandGeo.setAttribute("position", new THREE.Float32BufferAttribute(sandPositions, 3));
    sandGeo.setIndex(sandIndices);
    sandGeo.computeVertexNormals();
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.receiveShadow = true;
    group.add(sandMesh);
  }

  if (reefPositions.length > 0) {
    const reefGeo = new THREE.BufferGeometry();
    reefGeo.setAttribute("position", new THREE.Float32BufferAttribute(reefPositions, 3));
    reefGeo.setIndex(reefIndices);
    const reefMesh = new THREE.Mesh(reefGeo, reefMat);
    group.add(reefMesh);
  }

  return group;
}
