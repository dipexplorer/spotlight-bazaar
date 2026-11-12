import * as THREE from "three";
import { toWorld } from "./projection";

export interface RiverItem {
  name: string;
  lines: number[][];
}

/**
 * Builds geographically accurate 3D ribbon river waterways
 * (Ganga, Yamuna, Brahmaputra, Godavari, Krishna, Narmada, Mahanadi, Kaveri)
 * with natural winding geometry and sky-reflective water material.
 */
export function buildRibbonRivers(riversData: RiverItem[]): THREE.Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const RIVER_SURFACE_Y = 6.04;

  // Natural river widths calibrated for authentic scale
  const getRiverWidth = (name: string): number => {
    const n = (name || "").toLowerCase();
    if (n.includes("brahmaputra") || n.includes("ganga") || n.includes("ganges")) {
      return 3.2;
    }
    if (
      n.includes("godavari") ||
      n.includes("krishna") ||
      n.includes("narmada") ||
      n.includes("yamuna") ||
      n.includes("indus") ||
      n.includes("mahanadi")
    ) {
      return 2.6;
    }
    return 2.0;
  };

  let vertexOffset = 0;

  for (const river of riversData) {
    const halfWidth = getRiverWidth(river.name) / 2;

    for (const line of river.lines) {
      if (!line || line.length < 4) continue;

      // Extract coordinates
      const pts: { x: number; z: number }[] = [];
      for (let i = 0; i < line.length; i += 2) {
        const lon = line[i];
        const lat = line[i + 1];
        if (lon !== undefined && lat !== undefined) {
          const [x, z] = toWorld(lon, lat);
          pts.push({ x, z });
        }
      }

      if (pts.length < 2) continue;

      // Build ribbon quad strips with upward normals
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.001) continue;

        // Perpendicular on XZ ground plane
        const nx = -dz / len;
        const nz = dx / len;

        // Quad vertices: P1-Left, P1-Right, P2-Left, P2-Right
        const x1L = p1.x + nx * halfWidth;
        const z1L = p1.z + nz * halfWidth;
        const x1R = p1.x - nx * halfWidth;
        const z1R = p1.z - nz * halfWidth;

        const x2L = p2.x + nx * halfWidth;
        const z2L = p2.z + nz * halfWidth;
        const x2R = p2.x - nx * halfWidth;
        const z2R = p2.z - nz * halfWidth;

        positions.push(
          x1L, RIVER_SURFACE_Y, z1L,
          x1R, RIVER_SURFACE_Y, z1R,
          x2L, RIVER_SURFACE_Y, z2L,
          x2R, RIVER_SURFACE_Y, z2R
        );

        normals.push(
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0
        );

        uvs.push(
          0, 0,
          1, 0,
          0, 1,
          1, 1
        );

        // Counter-clockwise upward winding
        indices.push(
          vertexOffset, vertexOffset + 2, vertexOffset + 1,
          vertexOffset + 1, vertexOffset + 2, vertexOffset + 3
        );

        vertexOffset += 4;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  // Natural reflective river water material
  const material = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Natural Deep Sky River Blue
    roughness: 0.22,
    metalness: 0.15,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "volumetric_ribbon_rivers";
  return mesh;
}
