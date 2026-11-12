import * as THREE from "three";
import { toWorld } from "./projection";

interface TreePlacement {
  lat: number;
  lon: number;
  scale: number;
}

/**
 * Builds geographically authentic instanced miniature trees across India's forest reserves:
 * - Western Ghats rainforest belt (Kerala, Kodagu, Konkan)
 * - Assam & Brahmaputra valley (Guwahati, Kaziranga, Tezpur)
 * - Sundarbans & Bengal delta
 * - Satpura & Vindhya central forest sanctuaries
 * - Terai foothills along the Himalayas
 * 
 * 100% natural forest greens - ZERO red dots or floating bowls!
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
      const scale = 0.9 + Math.abs(Math.sin(i * 7.7)) * 0.45;

      trees.push({ lat, lon, scale });
    }
  };

  // 1. Assam & Brahmaputra Valley (near Guwahati / Tezpur / Dibrugarh)
  addTreeCluster(26.2, 91.8, 25, 1.1);
  addTreeCluster(26.6, 92.9, 20, 1.2);
  addTreeCluster(26.8, 94.2, 20, 1.2);

  // 2. Gangetic & Bengal Forest Belts (Sundarbans & Terai foothills)
  addTreeCluster(22.4, 88.6, 25, 1.4); // Sundarbans Delta
  addTreeCluster(25.4, 85.2, 18, 1.2); // Bihar plains
  addTreeCluster(26.5, 81.2, 18, 1.3); // Awadh river belt

  // 3. Western Ghats Rainforest Corridor (Maharashtra -> Goa -> Karnataka -> Kerala)
  addTreeCluster(9.8, 76.5, 25, 1.1);  // Kerala Cardamom & Periyar
  addTreeCluster(12.4, 75.8, 20, 1.1); // Coorg / Kodagu
  addTreeCluster(15.3, 74.2, 18, 1.0); // Goa Ghats
  addTreeCluster(19.2, 73.3, 18, 1.1); // Sahyadri forests

  // 4. Central Indian Forest Belt (Satpura & Kanha/Bandhavgarh)
  addTreeCluster(22.5, 77.2, 20, 1.2); // Satpura reserve
  addTreeCluster(23.5, 80.5, 20, 1.3); // Jabalpur/Bandhavgarh belt

  // Compound Tree Geometry: Low-poly faceted canopy
  const foliageGeo = new THREE.DodecahedronGeometry(1.2, 0);
  foliageGeo.translate(0, 1.4, 0); // Sits on trunk

  // 100% Natural Lush Forest Green Materials - ZERO random red dots!
  const deepForestMat = new THREE.MeshStandardMaterial({
    color: 0x14532d, // Deep Indian jungle green
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  const inst = new THREE.InstancedMesh(foliageGeo, deepForestMat, trees.length);
  inst.receiveShadow = true;
  inst.castShadow = true;

  const dummy = new THREE.Object3D();
  trees.forEach((t, i) => {
    const [x, z] = toWorld(t.lon, t.lat);
    dummy.position.set(x, 5.98, z);
    const s = t.scale * 1.5;
    dummy.scale.set(s, s * 1.2, s);
    dummy.rotation.y = (i * 1.5) % (Math.PI * 2);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  });

  inst.instanceMatrix.needsUpdate = true;
  group.add(inst);

  return group;
}
