import * as THREE from "three";
import { toWorld } from "./projection";

interface TreePlacement {
  lat: number;
  lon: number;
  scale: number;
  colorType: "green" | "lime" | "flower";
}

/**
 * Builds instanced miniature low-poly trees and flowering shrubs
 * across India's fertile river basins and coastal belts.
 */
export function buildProceduralFlora(): THREE.Group {
  const group = new THREE.Group();
  group.name = "india_flora_group";

  const trees: TreePlacement[] = [];

  const addTreeCluster = (centerLat: number, centerLon: number, count: number, radius: number) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.sin(i * 3.4) * 0.5;
      const r = (Math.sin(i * 5.7) * 0.5 + 0.5) * radius;
      const lat = centerLat + Math.sin(angle) * r;
      const lon = centerLon + Math.cos(angle) * r;
      const scale = 0.8 + Math.abs(Math.sin(i * 8.2)) * 0.5;

      // Color variation: 75% lush green, 15% lime, 10% flowering gulmohar coral
      const rand = Math.sin(i * 13.9) * 0.5 + 0.5;
      const colorType: "green" | "lime" | "flower" =
        rand > 0.88 ? "flower" : rand > 0.72 ? "lime" : "green";

      trees.push({ lat, lon, scale, colorType });
    }
  };

  // 1. Brahmaputra Valley & Assam Plains (near Guwahati / Shillong)
  addTreeCluster(26.2, 91.8, 30, 1.2);
  addTreeCluster(26.6, 92.9, 25, 1.4);
  addTreeCluster(26.8, 94.2, 25, 1.5);

  // 2. Gangetic Plains (Uttar Pradesh, Bihar, West Bengal)
  addTreeCluster(25.6, 85.1, 35, 1.8); // Patna basin
  addTreeCluster(25.3, 83.0, 30, 1.5); // Varanasi
  addTreeCluster(26.8, 80.9, 28, 1.6); // Lucknow / Awadh
  addTreeCluster(22.6, 88.4, 40, 1.8); // Bengal Delta

  // 3. Coastal Kerala & Konkan (Lush Western Belt)
  addTreeCluster(9.9, 76.3, 30, 1.2);  // Kochi / Backwaters
  addTreeCluster(15.3, 74.0, 25, 1.1); // Goa coast
  addTreeCluster(19.1, 73.0, 25, 1.3); // Mumbai / Thane green belt

  // 4. Coromandel & Deccan (Tamil Nadu & Telangana)
  addTreeCluster(13.1, 80.2, 25, 1.4); // Chennai
  addTreeCluster(17.4, 78.5, 25, 1.5); // Hyderabad

  // 5. Central India & Narmada Valley (Madhya Pradesh)
  addTreeCluster(22.7, 75.8, 25, 1.3); // Indore
  addTreeCluster(23.2, 77.4, 25, 1.4); // Bhopal

  // Compound Tree Geometry: Trunk + Low-poly faceted canopy
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.2, 5);
  trunkGeo.translate(0, 1.1, 0);

  const foliageGeo = new THREE.DodecahedronGeometry(1.5, 0);
  foliageGeo.translate(0, 3.2, 0);

  // Tree Canopy Materials
  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Lush Indian Neem green
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  const limeMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d, // Warm golden lime
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  const flowerMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48, // Flowering Gulmohar crimson
    roughness: 0.8,
    metalness: 0.08,
    flatShading: true,
  });

  // Separate trees by material for instancing
  const groups: Record<"green" | "lime" | "flower", TreePlacement[]> = {
    green: trees.filter((t) => t.colorType === "green"),
    lime: trees.filter((t) => t.colorType === "lime"),
    flower: trees.filter((t) => t.colorType === "flower"),
  };

  const matMap: Record<"green" | "lime" | "flower", THREE.Material> = {
    green: greenMat,
    lime: limeMat,
    flower: flowerMat,
  };

  const dummy = new THREE.Object3D();

  for (const key of ["green", "lime", "flower"] as const) {
    const subset = groups[key];
    if (subset.length === 0) continue;

    const inst = new THREE.InstancedMesh(foliageGeo, matMap[key], subset.length);
    inst.receiveShadow = true;
    inst.castShadow = true;

    subset.forEach((t, i) => {
      const [x, z] = toWorld(t.lon, t.lat);
      dummy.position.set(x, 5.98, z);
      const s = t.scale * 2.2;
      dummy.scale.set(s, s, s);
      dummy.rotation.y = (i * 1.5) % (Math.PI * 2);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });

    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  }

  return group;
}
