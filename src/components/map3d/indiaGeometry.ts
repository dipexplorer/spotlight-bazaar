import * as THREE from "three";
import { toWorld } from "./projection";

interface IndiaLandData {
  source?: string;
  rings: [number, number][][];
}

interface RiverItem {
  name: string;
  lines: number[][];
}

/**
 * Builds the extruded 3D geometry of India from polygon rings
 */
export function buildIndiaLandMeshes(landData: IndiaLandData): THREE.Group {
  const group = new THREE.Group();
  group.name = "india_land_group";

  // Top surface material (Dark Cyber-Obsidian / Slate)
  const topMaterial = new THREE.MeshStandardMaterial({
    color: 0x111927,
    roughness: 0.7,
    metalness: 0.15,
  });

  // Bevel & side walls material (Dark Charcoal border with slight sheen)
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0x090f18,
    roughness: 0.85,
    metalness: 0.3,
  });

  const materials = [topMaterial, sideMaterial];

  for (const ring of landData.rings) {
    if (!ring || ring.length < 3) continue;

    const shape = new THREE.Shape();
    const [startLon, startLat] = ring[0];
    const [startX, startZ] = toWorld(startLon, startLat);
    shape.moveTo(startX, -startZ);

    for (let i = 1; i < ring.length; i++) {
      const [lon, lat] = ring[i];
      const [x, z] = toWorld(lon, lat);
      shape.lineTo(x, -z);
    }

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 4.5,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.8,
      bevelThickness: 1.2,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Rotate so Z becomes the horizontal ground and Y faces up
    geometry.rotateX(-Math.PI / 2);
    // Recompute normals for accurate lighting
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  }

  // Glowing Coastline Contour Outline
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0x06b6d4, // Cyan glow
    transparent: true,
    opacity: 0.65,
    linewidth: 1.5,
  });

  for (const ring of landData.rings) {
    if (!ring || ring.length < 3) continue;
    const points: THREE.Vector3[] = [];
    for (const [lon, lat] of ring) {
      const [x, z] = toWorld(lon, lat);
      points.push(new THREE.Vector3(x, 4.6, z)); // Slightly above land surface
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeo, outlineMaterial);
    group.add(line);
  }

  return group;
}

/**
 * Builds 3D river curves across India
 */
export function buildRiversMeshes(riversData: RiverItem[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "india_rivers_group";

  const riverMaterial = new THREE.LineBasicMaterial({
    color: 0x38bdf8, // Vibrant River Blue
    transparent: true,
    opacity: 0.75,
    linewidth: 2,
  });

  for (const river of riversData) {
    for (const line of river.lines) {
      if (!line || line.length < 4) continue;
      const points: THREE.Vector3[] = [];
      // Line is a flat array: [lon1, lat1, lon2, lat2, ...]
      for (let i = 0; i < line.length; i += 2) {
        const lon = line[i];
        const lat = line[i + 1];
        if (lon !== undefined && lat !== undefined) {
          const [x, z] = toWorld(lon, lat);
          points.push(new THREE.Vector3(x, 4.65, z)); // Flush on top of land
        }
      }
      if (points.length >= 2) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMesh = new THREE.Line(lineGeo, riverMaterial);
        group.add(lineMesh);
      }
    }
  }

  return group;
}

