import * as THREE from "three";
import { toWorld } from "./projection";

interface MountainPeakDef {
  lat: number;
  lon: number;
  radius: number;
  height: number;
  isSnow?: boolean;
}

/**
 * Procedurally generates India's iconic 3D mountain ranges:
 * - Western Ghats (Sahyadris running down to Kerala)
 * - Himalayas & Northern Snow Ridges
 * - Vindhya & Satpura Ranges (Central India)
 * - Eastern Ghats (Odisha & Andhra)
 * - Aravalli Range (Rajasthan)
 * - Shillong Plateau (Meghalaya / Assam)
 */
export function buildTopographyMountains(): THREE.Group {
  const group = new THREE.Group();
  group.name = "india_mountains_group";

  const peaks: MountainPeakDef[] = [];

  // Helper to add a cluster along a ridge line
  const addRidge = (
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    count: number,
    baseRadius: number,
    baseHeight: number,
    isSnow = false
  ) => {
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const lat = startLat + (endLat - startLat) * t + (Math.sin(i * 12.5) * 0.28);
      const lon = startLon + (endLon - startLon) * t + (Math.cos(i * 14.2) * 0.28);
      const scaleVariation = 0.75 + Math.abs(Math.sin(i * 7.1)) * 0.55;

      peaks.push({
        lat,
        lon,
        radius: baseRadius * scaleVariation,
        height: baseHeight * scaleVariation,
        isSnow,
      });
    }
  };

  // 1. WESTERN GHATS (Sahyadris: Maharashtra -> Goa -> Karnataka -> Kerala Nilgiris)
  addRidge(19.8, 73.6, 15.4, 74.2, 14, 11, 24);
  addRidge(15.2, 74.3, 11.5, 75.8, 12, 12, 28);
  addRidge(11.4, 76.1, 8.6, 77.2, 10, 13, 32); // High Nilgiris & Anamudi

  // 2. HIMALAYAN NORTHERN RIDGE (Snow-dusted lofty peaks)
  addRidge(34.2, 75.8, 31.8, 77.9, 12, 16, 44, true); // Ladakh / Kashmir
  addRidge(31.6, 78.1, 29.8, 80.4, 10, 15, 42, true); // Uttarakhand
  addRidge(27.8, 88.2, 27.6, 89.1, 6, 14, 40, true);  // Sikkim / Kanchenjunga
  addRidge(28.2, 92.5, 28.5, 96.2, 12, 15, 38, true); // Arunachal Himalayas

  // 3. VINDHYA & SATPURA RANGES (Central India plateau hills)
  addRidge(22.6, 74.8, 23.4, 82.2, 14, 10, 18);
  addRidge(21.8, 75.2, 22.4, 81.6, 12, 9, 16);

  // 4. ARAVALLI RANGE (Rajasthan to Delhi)
  addRidge(24.6, 73.2, 28.2, 76.8, 10, 8, 15);

  // 5. EASTERN GHATS (Odisha & Coastal Andhra)
  addRidge(19.2, 83.8, 15.6, 80.2, 12, 9, 17);

  // 6. SHILLONG PLATEAU (Garo, Khasi, Jaintia hills in Meghalaya/Assam)
  addRidge(25.4, 90.4, 25.7, 93.4, 8, 11, 22);

  // Split into Green Mountain Peaks vs Snow Peaks
  const greenPeaks = peaks.filter((p) => !p.isSnow);
  const snowPeaks = peaks.filter((p) => p.isSnow);

  // Low-poly faceted cone geometry (6 sides gives the charming tilt-shift look of IndiaAgain)
  const coneGeo = new THREE.ConeGeometry(1, 1, 6);
  coneGeo.translate(0, 0.5, 0); // Ground pivot

  // Material for Forest Green Mountains
  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x1f663b, // Deep Indian mountain emerald
    roughness: 0.82,
    metalness: 0.1,
    flatShading: true,
  });

  // Material for Snow-capped Himalayas
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Snow white/slate
    roughness: 0.75,
    metalness: 0.15,
    flatShading: true,
  });

  // Instanced Mesh 1: Green Mountains
  if (greenPeaks.length > 0) {
    const greenInst = new THREE.InstancedMesh(coneGeo, greenMat, greenPeaks.length);
    greenInst.receiveShadow = true;
    greenInst.castShadow = true;

    const dummy = new THREE.Object3D();
    greenPeaks.forEach((p, idx) => {
      const [x, z] = toWorld(p.lon, p.lat);
      dummy.position.set(x, 5.95, z);
      dummy.scale.set(p.radius, p.height, p.radius);
      dummy.rotation.y = (idx * 1.3) % (Math.PI * 2);
      dummy.updateMatrix();
      greenInst.setMatrixAt(idx, dummy.matrix);
    });
    greenInst.instanceMatrix.needsUpdate = true;
    group.add(greenInst);
  }

  // Instanced Mesh 2: Snow Peaks
  if (snowPeaks.length > 0) {
    const snowInst = new THREE.InstancedMesh(coneGeo, snowMat, snowPeaks.length);
    snowInst.receiveShadow = true;
    snowInst.castShadow = true;

    const dummy = new THREE.Object3D();
    snowPeaks.forEach((p, idx) => {
      const [x, z] = toWorld(p.lon, p.lat);
      dummy.position.set(x, 5.95, z);
      dummy.scale.set(p.radius, p.height, p.radius);
      dummy.rotation.y = (idx * 1.7) % (Math.PI * 2);
      dummy.updateMatrix();
      snowInst.setMatrixAt(idx, dummy.matrix);
    });
    snowInst.instanceMatrix.needsUpdate = true;
    group.add(snowInst);
  }

  return group;
}
