import * as THREE from "three";
import { toWorld } from "./projection";

export interface IndiaLandData {
  source?: string;
  rings: [number, number][][];
}

/**
 * Builds the golden sandy beach shelf and shallow turquoise coastal water gradient
 * running along India's coastline (Gujarat, Konkan, Malabar, Coromandel, Odisha, Bengal).
 *
 * Uses continuous vertex-shared ribbon geometry with miter-averaged normals
 * to guarantee zero disjoint spiky mesh fins.
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

  const SAND_WIDTH = 1.8;
  const REEF_WIDTH = 4.8;
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

    // Convert coastal points to world coordinates and collect contiguous chains
    const chains: { x: number; z: number }[][] = [];
    let currentChain: { x: number; z: number }[] = [];

    for (let i = 0; i < ring.length; i++) {
      const origLon = ring[i][0];
      const origLat = ring[i][1];

      // Filter: only apply beach shelf to sea-facing coastlines
      const isCoast =
        origLat < 23.5 ||
        (origLat < 25.0 && origLon < 71.5) || // Gujarat coast / Gulf of Kutch
        (origLat < 24.0 && origLon > 87.0);   // Bengal Sundarbans

      if (isCoast) {
        const [x, z] = toWorld(origLon, origLat);
        currentChain.push({ x, z });
      } else {
        if (currentChain.length >= 3) {
          chains.push(currentChain);
        }
        currentChain = [];
      }
    }
    if (currentChain.length >= 3) {
      chains.push(currentChain);
    }

    // Build smooth, contiguous ribbons with averaged vertex normals
    for (const chain of chains) {
      const n = chain.length;
      if (n < 2) continue;

      // Compute per-vertex averaged normals
      const normals: { nx: number; nz: number }[] = [];

      for (let i = 0; i < n; i++) {
        const pPrev = chain[Math.max(0, i - 1)];
        const pCurr = chain[i];
        const pNext = chain[Math.min(n - 1, i + 1)];

        // Tangent vector
        const dx = pNext.x - pPrev.x;
        const dz = pNext.z - pPrev.z;
        const len = Math.hypot(dx, dz);

        let nx = 0;
        let nz = 1;
        if (len > 0.001) {
          nx = -dz / len;
          nz = dx / len;
        }

        // Orient normal outward towards sea (away from central landmass)
        // Central India is roughly at x: 10, z: 20
        const toCenterDistX = pCurr.x - 10;
        const toCenterDistZ = pCurr.z - 20;
        if (nx * toCenterDistX + nz * toCenterDistZ < 0) {
          nx = -nx;
          nz = -nz;
        }

        normals.push({ nx, nz });
      }

      // 1. Build continuous Sand Ribbon (shared vertices along chain)
      const chainSandStart = sandOffset;
      for (let i = 0; i < n; i++) {
        const p = chain[i];
        const norm = normals[i];

        // Inner vertex (at coastline boundary)
        sandPositions.push(p.x, SAND_Y, p.z);
        // Outer vertex (sand extent)
        sandPositions.push(p.x + norm.nx * SAND_WIDTH, SAND_Y, p.z + norm.nz * SAND_WIDTH);
        sandOffset += 2;
      }

      for (let i = 0; i < n - 1; i++) {
        const i0 = chainSandStart + i * 2;
        const o0 = chainSandStart + i * 2 + 1;
        const i1 = chainSandStart + (i + 1) * 2;
        const o1 = chainSandStart + (i + 1) * 2 + 1;

        sandIndices.push(i0, i1, o0);
        sandIndices.push(o0, i1, o1);
      }

      // 2. Build continuous Turquoise Shallow Water Shelf
      const chainReefStart = reefOffset;
      for (let i = 0; i < n; i++) {
        const p = chain[i];
        const norm = normals[i];

        // Inner reef vertex (starts at sand edge)
        reefPositions.push(p.x + norm.nx * SAND_WIDTH, REEF_Y, p.z + norm.nz * SAND_WIDTH);
        // Outer reef vertex (ocean gradient extent)
        reefPositions.push(
          p.x + norm.nx * (SAND_WIDTH + REEF_WIDTH),
          REEF_Y,
          p.z + norm.nz * (SAND_WIDTH + REEF_WIDTH)
        );
        reefOffset += 2;
      }

      for (let i = 0; i < n - 1; i++) {
        const r_i0 = chainReefStart + i * 2;
        const r_o0 = chainReefStart + i * 2 + 1;
        const r_i1 = chainReefStart + (i + 1) * 2;
        const r_o1 = chainReefStart + (i + 1) * 2 + 1;

        reefIndices.push(r_i0, r_i1, r_o0);
        reefIndices.push(r_o0, r_i1, r_o1);
      }
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
