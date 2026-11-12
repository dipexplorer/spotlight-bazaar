import * as THREE from "three";
import { toWorld } from "./projection";

interface MountainDef {
  lat: number;
  lon: number;
  radius: number;
  height: number;
  isSnow?: boolean;
}

/**
 * Geographically accurate 3D Indian Mountain Topography:
 * - High Northern Himalayas: Ladakh, Himachal, Uttarakhand, Sikkim, Arunachal (Snow-capped)
 * - Western Ghats (Sahyadris): Lush green ridges running along Maharashtra, Goa, Karnataka, Nilgiris & Kerala
 * - Vindhya & Satpura Ranges: Central India (MP) green plateau ridges
 * - Aravalli Range: Rajasthan to Delhi
 * - Eastern Ghats: Odisha & Andhra coastal hills
 * - Shillong Plateau (Garo & Khasi Hills): Lush green rainforest hills in Meghalaya (NO snow)
 */
export function buildTopographyMountains(): THREE.Group {
  const group = new THREE.Group();
  group.name = "india_mountains_group";

  const mountains: MountainDef[] = [];

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
      const lat = startLat + (endLat - startLat) * t + Math.sin(i * 11.3) * 0.22;
      const lon = startLon + (endLon - startLon) * t + Math.cos(i * 13.7) * 0.22;
      const scaleVariation = 0.8 + Math.abs(Math.sin(i * 6.3)) * 0.45;

      mountains.push({
        lat,
        lon,
        radius: baseRadius * scaleVariation,
        height: baseHeight * scaleVariation,
        isSnow,
      });
    }
  };

  // 1. WESTERN GHATS (Sahyadris: Lush green forested ridges parallel to Arabian Sea)
  addRidge(20.2, 73.6, 17.0, 73.8, 12, 8.5, 14); // Maharashtra Sahyadris
  addRidge(16.8, 74.0, 13.5, 75.2, 10, 9.0, 16); // Goa & Karnataka Ghats
  addRidge(13.2, 75.5, 10.5, 76.8, 10, 9.5, 18); // Coorg, Wayanad & Nilgiris
  addRidge(10.2, 77.0, 8.5, 77.4, 8, 9.0, 17);  // Anamudi & Kerala Cardamom Hills

  // 2. HIGH HIMALAYAN NORTHERN BOUNDARY (Organic terraced snow peaks strictly on northern crest)
  addRidge(34.8, 76.2, 32.8, 78.4, 8, 7.5, 12, true); // Ladakh / Zanskar
  addRidge(32.4, 78.2, 30.2, 80.6, 8, 7.5, 12, true); // Himachal & Uttarakhand Nanda Devi
  addRidge(27.8, 88.2, 27.9, 88.7, 3, 7.0, 11, true);  // Sikkim Kanchenjunga
  addRidge(28.4, 93.2, 28.6, 96.5, 7, 7.0, 11, true); // Arunachal High Crest

  // 3. VINDHYA & SATPURA RANGES (Central India green plateau hills)
  addRidge(23.2, 75.5, 23.8, 81.8, 12, 7.5, 11); // Vindhya (North of Narmada)
  addRidge(21.8, 75.8, 22.2, 80.5, 10, 7.0, 10); // Satpura (South of Narmada)

  // 4. ARAVALLI RANGE (Rajasthan to Haryana)
  addRidge(24.5, 73.2, 28.0, 76.5, 8, 6.5, 9); // Mount Abu to Delhi

  // 5. EASTERN GHATS (Odisha & Andhra Pradesh coastal hills)
  addRidge(19.2, 83.5, 16.5, 81.0, 8, 7.0, 11); // Araku Valley to Krishna basin

  // 6. SHILLONG PLATEAU (Meghalaya Khasi & Garo Hills: 100% LUSH GREEN, NO snow)
  addRidge(25.3, 90.6, 25.6, 92.8, 7, 7.5, 12, false);

  // Separate green hills from northern snow crests
  const greenHills = mountains.filter((m) => !m.isSnow);
  const snowPeaks = mountains.filter((m) => m.isSnow);

  // Green Hills: Low-poly faceted domes (matching IndiaAgain's charming tilt-shift terrain)
  const domeGeo = new THREE.DodecahedronGeometry(1, 1);
  domeGeo.translate(0, 0.7, 0); // Sit on ground

  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x1b4d2e, // Deep organic Indian forest green
    roughness: 0.88,
    metalness: 0.05,
    flatShading: true,
  });

  if (greenHills.length > 0) {
    const greenInst = new THREE.InstancedMesh(domeGeo, greenMat, greenHills.length);
    greenInst.receiveShadow = true;
    greenInst.castShadow = true;

    const dummy = new THREE.Object3D();
    greenHills.forEach((p, idx) => {
      const [x, z] = toWorld(p.lon, p.lat);
      dummy.position.set(x, 5.96, z);
      dummy.scale.set(p.radius, p.height, p.radius);
      dummy.rotation.y = (idx * 1.4) % (Math.PI * 2);
      dummy.updateMatrix();
      greenInst.setMatrixAt(idx, dummy.matrix);
    });
    greenInst.instanceMatrix.needsUpdate = true;
    group.add(greenInst);
  }

  // Northern Himalayas: Natural low-poly faceted snow massifs
  const snowPeakGeo = new THREE.DodecahedronGeometry(1, 0);
  snowPeakGeo.translate(0, 0.7, 0);

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Crisp Himalayan snow crest
    roughness: 0.75,
    metalness: 0.08,
    flatShading: true,
  });

  if (snowPeaks.length > 0) {
    const snowInst = new THREE.InstancedMesh(snowPeakGeo, snowMat, snowPeaks.length);
    snowInst.receiveShadow = true;
    snowInst.castShadow = true;

    const dummy = new THREE.Object3D();
    snowPeaks.forEach((p, idx) => {
      const [x, z] = toWorld(p.lon, p.lat);
      dummy.position.set(x, 5.96, z);
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
