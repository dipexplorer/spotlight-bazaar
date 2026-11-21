import * as THREE from "three";
import { createTreeMesh, createStreetLightMesh } from "@/components/map/osm3dBuildings";

/**
 * GTA VI-Style Realistic 3D Street Neighborhood Environment
 * Features:
 * - Volumetric 3D modern buildings with dynamic interior window illumination
 * - Night streetlights with warm volumetric light cones and pavement light pools
 * - Rooftop aviation warning beacons
 * - Asphalt road with painted yellow dashed centerlines and pedestrian zebra crossing
 * - Manicured green lawns and roadside Indian trees
 */

export interface StreetNeighborhood {
  group: THREE.Group;
  setNightMode: (isDark: boolean) => void;
  update: (delta: number) => void;
  dispose: () => void;
}

export function createStreetNeighborhood(
  roadLength: number,
  roadAngle: number,
  initialDark = false
): StreetNeighborhood {
  const group = new THREE.Group();
  group.name = "gta_street_neighborhood";

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // 1. PBR Materials for Neighborhood Buildings & Ambient Greenery
  const turfMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialDark ? 0x0f291e : 0x245838,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true,
    })
  );

  const concreteDarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialDark ? 0x1e2530 : 0x334155,
      roughness: 0.75,
      metalness: 0.15,
    })
  );

  const limestoneWarmMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialDark ? 0x333842 : 0xe2e8f0,
      roughness: 0.85,
      metalness: 0.05,
    })
  );

  const woodAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.65,
      metalness: 0.05,
    })
  );

  // Dynamic Building Windows: Day (Reflective Blue Sky) / Night (Warm Golden Interior Glow)
  const glassWindowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialDark ? 0xfef08a : 0x38bdf8,
      roughness: initialDark ? 0.4 : 0.15,
      metalness: initialDark ? 0.2 : 0.85,
      emissive: new THREE.Color(initialDark ? 0xfde047 : 0x0369a1),
      emissiveIntensity: initialDark ? 1.6 : 0.15,
    })
  );

  const roofEquipmentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.6,
      metalness: 0.4,
    })
  );

  const wallBoundaryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialDark ? 0x1e293b : 0x64748b,
      roughness: 0.8,
      metalness: 0.1,
    })
  );

  // Streetlight Night Lighting Materials
  const lightConeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: initialDark ? 0.22 : 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const lightPoolMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: initialDark ? 0.28 : 0.0,
      depthWrite: false,
    })
  );

  const beaconRedMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
    })
  );

  // Road Corridor Alignment: Road surface is rendered directly by the OpenStreetMap vector layers,
  // perfectly synced and identical to all neighboring OSM streets (no over-crafted artificial boxes).
  const roadCorridorHalfWidth = 3.2; // 6.4m corridor matching OpenStreetMap minor street

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PROCEDURAL 3D NEIGHBORING BUILDINGS
  // ───────────────────────────────────────────────────────────────────────────
  const beaconLights: THREE.Mesh[] = [];

  function createNeighborBuilding(
    width: number,
    depth: number,
    height: number,
    floors = 2,
    hasBalcony = true
  ): THREE.Group {
    const bGroup = new THREE.Group();

    const bodyGeo = trackGeo(new THREE.BoxGeometry(width, height, depth));
    const bodyMesh = new THREE.Mesh(bodyGeo, limestoneWarmMat);
    bodyMesh.position.set(0, height / 2, 0);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bGroup.add(bodyMesh);

    const frameGeo = trackGeo(new THREE.BoxGeometry(width * 0.92, height * 0.88, 0.4));
    const frameMesh = new THREE.Mesh(frameGeo, concreteDarkMat);
    frameMesh.position.set(0, height / 2, depth / 2 + 0.15);
    bGroup.add(frameMesh);

    const floorH = height / floors;
    for (let f = 0; f < floors; f++) {
      const winGeo = trackGeo(new THREE.BoxGeometry(width * 0.78, floorH * 0.48, 0.5));
      const winMesh = new THREE.Mesh(winGeo, glassWindowMat);
      winMesh.position.set(0, (f + 0.55) * floorH, depth / 2 + 0.2);
      bGroup.add(winMesh);

      if (f === 1) {
        const slatGeo = trackGeo(new THREE.BoxGeometry(width * 0.35, floorH * 0.52, 0.55));
        const slatMesh = new THREE.Mesh(slatGeo, woodAccentMat);
        slatMesh.position.set(width * 0.25, (f + 0.55) * floorH, depth / 2 + 0.22);
        bGroup.add(slatMesh);
      }
    }

    if (hasBalcony) {
      const balcGeo = trackGeo(new THREE.BoxGeometry(width * 0.5, 0.9, 1.4));
      const balcMesh = new THREE.Mesh(balcGeo, glassWindowMat);
      balcMesh.position.set(-width * 0.15, floorH + 0.45, depth / 2 + 0.7);
      bGroup.add(balcMesh);
    }

    const parapetGeo = trackGeo(new THREE.BoxGeometry(width + 0.2, 0.6, depth + 0.2));
    const parapetMesh = new THREE.Mesh(parapetGeo, concreteDarkMat);
    parapetMesh.position.set(0, height + 0.3, 0);
    bGroup.add(parapetMesh);

    // Rooftop Mechanical Units
    const tankGeo = trackGeo(new THREE.CylinderGeometry(1.2, 1.2, 2.0, 16));
    const tank = new THREE.Mesh(tankGeo, roofEquipmentMat);
    tank.position.set(-width * 0.25, height + 1.2, -depth * 0.2);
    bGroup.add(tank);

    const acGeo = trackGeo(new THREE.BoxGeometry(1.4, 1.1, 1.4));
    const ac = new THREE.Mesh(acGeo, roofEquipmentMat);
    ac.position.set(width * 0.25, height + 0.7, -depth * 0.15);
    bGroup.add(ac);

    // Rooftop Blinking Aviation Warning Beacon
    const beaconGeo = trackGeo(new THREE.SphereGeometry(0.24, 8, 8));
    const beacon = new THREE.Mesh(beaconGeo, beaconRedMat);
    beacon.position.set(0, height + 1.8, 0);
    bGroup.add(beacon);
    beaconLights.push(beacon);

    return bGroup;
  }

  // Left Building (X = -26m, Z = 6m)
  const leftBuilding = createNeighborBuilding(16.0, 14.0, 9.5, 2, true);
  leftBuilding.position.set(-26.0, 0, 6.0);
  group.add(leftBuilding);

  const leftWallGeo = trackGeo(new THREE.BoxGeometry(16.0, 1.4, 0.3));
  const leftWall = new THREE.Mesh(leftWallGeo, wallBoundaryMat);
  leftWall.position.set(-26.0, 0.7, 14.5);
  group.add(leftWall);

  // Right Building (X = +26m, Z = 6m)
  const rightBuilding = createNeighborBuilding(16.0, 14.0, 10.0, 2, false);
  rightBuilding.position.set(26.0, 0, 6.0);
  group.add(rightBuilding);

  const rightWallGeo = trackGeo(new THREE.BoxGeometry(16.0, 1.4, 0.3));
  const rightWall = new THREE.Mesh(rightWallGeo, wallBoundaryMat);
  rightWall.position.set(26.0, 0.7, 14.5);
  group.add(rightWall);

  const hedgeGeo = trackGeo(new THREE.BoxGeometry(15.0, 0.8, 0.5));
  const hedge = new THREE.Mesh(hedgeGeo, turfMat);
  hedge.position.set(26.0, 0.4, 15.0);
  group.add(hedge);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ROADSIDE 3D TREES & STREETLIGHTS (Flanking the OSM Street Corridor)
  // ───────────────────────────────────────────────────────────────────────────
  const treeSpacing = 16.0;
  const startZ = 16.0;
  const endZ = roadLength - 6.0;
  const treeX = roadCorridorHalfWidth + 1.6;

  let treeCount = 0;
  for (let z = startZ; z <= endZ; z += treeSpacing) {
    for (const side of [-1, 1]) {
      if (side === 0 || (z >= 18 && z <= 26 && side === 1)) continue;
      const treeType = treeCount % 2 === 0 ? "round" : "pine";
      const tree = createTreeMesh(treeType);
      const scale = 0.95 + Math.sin(z * 1.8) * 0.15;
      tree.scale.set(scale, scale, scale);
      tree.position.set(side * treeX, 0, z);
      tree.rotation.y = (z * 0.4) % (Math.PI * 2);
      group.add(tree);
      treeCount++;
    }
  }

  // Modern Architectural Streetlights with Volumetric Cones and Ground Pools
  const coneHeight = 5.8;
  const coneRadius = 2.4;
  // Three.js ConeGeometry has apex at +H/2 (top) and base at -H/2 (bottom) - exactly what we want for downward lighting!
  const coneGeo = trackGeo(new THREE.ConeGeometry(coneRadius, coneHeight, 14, 1, true));
  const poolGeo = trackGeo(new THREE.CircleGeometry(coneRadius, 16));
  poolGeo.rotateX(-Math.PI / 2);

  for (let z = startZ + 6.0; z <= endZ; z += treeSpacing * 1.6) {
    for (const side of [-1, 1]) {
      const lamp = createStreetLightMesh();
      lamp.scale.set(0.95, 0.95, 0.95);
      const lampX = side * (roadCorridorHalfWidth + 0.4);
      lamp.position.set(lampX, 0, z);
      
      // Orient the overhanging lantern arm towards the road (road is at X = 0):
      // createStreetLightMesh has arm extending along +X in local space.
      // - Left side (side = -1): road is towards +X -> rotation.y = 0 points arm into road.
      // - Right side (side = 1): road is towards -X -> rotation.y = Math.PI points arm into road.
      lamp.rotation.y = side === 1 ? Math.PI : 0;
      group.add(lamp);

      // Overhanging lantern head world X position (arm length is ~1.14m inward)
      const bulbX = lampX - side * 1.14;

      // Downward Volumetric Light Cone emanating from lantern head down to pavement
      const cone = new THREE.Mesh(coneGeo, lightConeMat);
      cone.position.set(bulbX, coneHeight / 2, z);
      group.add(cone);

      // Warm Ground Light Pool on Road Surface directly below lantern head
      const pool = new THREE.Mesh(poolGeo, lightPoolMat);
      pool.position.set(bulbX, 0.04, z);
      group.add(pool);
    }
  }

  // Dynamic Day/Night Mode Switcher
  const setNightMode = (isDark: boolean) => {
    turfMat.color.setHex(isDark ? 0x0f291e : 0x245838);
    concreteDarkMat.color.setHex(isDark ? 0x1e2530 : 0x334155);
    limestoneWarmMat.color.setHex(isDark ? 0x333842 : 0xe2e8f0);
    wallBoundaryMat.color.setHex(isDark ? 0x1e293b : 0x64748b);

    // Building Window Lighting: Warm golden glow at night
    glassWindowMat.color.setHex(isDark ? 0xfef08a : 0x38bdf8);
    glassWindowMat.roughness = isDark ? 0.35 : 0.15;
    glassWindowMat.metalness = isDark ? 0.2 : 0.85;
    glassWindowMat.emissive.setHex(isDark ? 0xfde047 : 0x0369a1);
    glassWindowMat.emissiveIntensity = isDark ? 1.6 : 0.15;

    // Streetlight Glow
    lightConeMat.opacity = isDark ? 0.22 : 0.0;
    lightPoolMat.opacity = isDark ? 0.28 : 0.0;
  };

  let elapsed = 0;
  const update = (delta: number) => {
    elapsed += delta;
    // Pulse rooftop aviation red beacons
    const pulse = 0.5 + Math.sin(elapsed * 4.0) * 0.5;
    beaconRedMat.opacity = pulse > 0.4 ? 1.0 : 0.2;
  };

  const dispose = () => {
    for (const m of materials) m.dispose();
    for (const g of geometries) g.dispose();
    group.clear();
  };

  return { group, setNightMode, update, dispose };
}
