import * as THREE from "three";
import { createTreeMesh, createStreetLightMesh } from "@/components/map/osm3dBuildings";

/**
 * GTA VI-Style Realistic 3D Street Neighborhood Environment
 * Replaces flat 2D satellite photo clutter with procedural 3D architectural
 * buildings, manicured lawns, asphalt roads with painted zebra crossings,
 * 3D roadside trees, modern streetlights, and compound boundary walls.
 */

export interface StreetNeighborhood {
  group: THREE.Group;
  dispose: () => void;
}

export function createStreetNeighborhood(
  roadLength: number,
  roadAngle: number,
  isDark = false
): StreetNeighborhood {
  const group = new THREE.Group();
  group.name = "gta_street_neighborhood";

  // Reusable Shared PBR Materials
  const materials: THREE.Material[] = [];
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Turf / Lawn Materials (Lush manicured grass, clean architectural tone)
  const lawnColor = isDark ? 0x143422 : 0x1e4630; // Rich emerald lawn
  const turfMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: lawnColor,
      roughness: 0.90,
      metalness: 0.04,
      flatShading: true,
    })
  );

  // Roadside Asphalt & Concrete Pavements
  const asphaltMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isDark ? 0x18202c : 0x2b3544, // Sleek dark asphalt
      roughness: 0.82,
      metalness: 0.12,
    })
  );

  const sidewalkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isDark ? 0x334155 : 0x94a3b8, // Concrete paver slabs
      roughness: 0.78,
      metalness: 0.08,
    })
  );

  const curbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0x64748b, // Granite curbstones
      roughness: 0.7,
      metalness: 0.15,
    })
  );

  const whiteRoadMarkingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.45,
      metalness: 0.05,
    })
  );

  const yellowRoadMarkingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Traffic yellow
      roughness: 0.45,
      metalness: 0.05,
    })
  );

  // Architectural Building Materials (GTA VI Modern Indian Commercial / Studio Aesthetic)
  const concreteDarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e2530 : 0x334155, // Dark precast concrete
      roughness: 0.75,
      metalness: 0.15,
    })
  );

  const limestoneWarmMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isDark ? 0x333842 : 0xe2e8f0, // Clean light architectural masonry
      roughness: 0.85,
      metalness: 0.05,
    })
  );

  const woodAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb45309, // Warm teak wood louvers & pergola accents
      roughness: 0.65,
      metalness: 0.05,
    })
  );

  const glassWindowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isDark ? 0x0284c7 : 0x38bdf8,
      roughness: 0.15,
      metalness: 0.85,
      emissive: isDark ? new THREE.Color(0x075985) : new THREE.Color(0x0369a1),
      emissiveIntensity: isDark ? 0.45 : 0.15,
    })
  );

  const roofEquipmentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x475569, // Metal HVAC, solar panels, and water storage
      roughness: 0.6,
      metalness: 0.4,
    })
  );

  const wallBoundaryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0x64748b,
      roughness: 0.8,
      metalness: 0.1,
    })
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 1. MANICURED URBAN PARCEL APRON
  // Covers the commercial block (villa + flanking buildings + front court).
  // ───────────────────────────────────────────────────────────────────────────
  const parcelWidth = 76.0;
  const parcelLength = 48.0;
  const groundGeo = new THREE.BoxGeometry(parcelWidth, 0.08, parcelLength);
  const groundMesh = new THREE.Mesh(groundGeo, turfMat);
  groundMesh.position.set(0, 0.01, 7.0);
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // Perimeter Curbstone around the parcel
  const parcelCurbGeo = new THREE.BoxGeometry(parcelWidth + 0.4, 0.14, 0.3);
  const parcelCurb = new THREE.Mesh(parcelCurbGeo, curbMat);
  parcelCurb.position.set(0, 0.05, 7.0 + parcelLength / 2);
  group.add(parcelCurb);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. 3D ASPHALT ROADWAY WITH MARKINGS & SIDEWALKS
  // ───────────────────────────────────────────────────────────────────────────
  const roadWidth = 5.8;
  const sidewalkWidth = 1.4;
  const curbEdge = roadWidth / 2 + sidewalkWidth; // 4.3m from road centerline

  // Road surface from Z = 14m to roadLength
  const effectiveRoadLen = Math.max(20, roadLength - 14.0);
  const roadCenterZ = 14.0 + effectiveRoadLen / 2;

  const roadSurfaceGeo = new THREE.BoxGeometry(roadWidth, 0.08, effectiveRoadLen);
  const roadSurface = new THREE.Mesh(roadSurfaceGeo, asphaltMat);
  roadSurface.position.set(0, 0.02, roadCenterZ);
  roadSurface.receiveShadow = true;
  group.add(roadSurface);

  // Sidewalks Flanking Both Sides of Roadway
  for (const side of [-1, 1]) {
    const walkGeo = new THREE.BoxGeometry(sidewalkWidth, 0.14, effectiveRoadLen);
    const walk = new THREE.Mesh(walkGeo, sidewalkMat);
    walk.position.set(side * (roadWidth / 2 + sidewalkWidth / 2), 0.05, roadCenterZ);
    walk.receiveShadow = true;
    group.add(walk);

    // Curbstones
    const curbGeo = new THREE.BoxGeometry(0.18, 0.18, effectiveRoadLen);
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(side * (roadWidth / 2 + 0.09), 0.07, roadCenterZ);
    group.add(curb);

    // Green Planting Verge alongside sidewalk
    const vergeGeo = new THREE.BoxGeometry(2.0, 0.06, effectiveRoadLen);
    const verge = new THREE.Mesh(vergeGeo, turfMat);
    verge.position.set(side * (curbEdge + 1.0), 0.01, roadCenterZ);
    group.add(verge);
  }

  // Dashed Yellow Center Line along the Roadway
  const dashSpacing = 5.0;
  const dashLength = 2.8;
  for (let z = 16.0; z < roadLength - 4.0; z += dashSpacing) {
    const dashGeo = new THREE.BoxGeometry(0.18, 0.02, dashLength);
    const dash = new THREE.Mesh(dashGeo, yellowRoadMarkingMat);
    dash.position.set(0, 0.065, z + dashLength / 2);
    group.add(dash);
  }

  // Solid White Road Edge Shoulder Lines
  for (const side of [-1, 1]) {
    const lineGeo = new THREE.BoxGeometry(0.14, 0.02, effectiveRoadLen);
    const line = new THREE.Mesh(lineGeo, whiteRoadMarkingMat);
    line.position.set(side * (roadWidth / 2 - 0.22), 0.065, roadCenterZ);
    group.add(line);
  }

  // Pedestrian Zebra Crossing in front of the Storefront Entrance (Z = 16.5m to 20m)
  const zebraZ = 18.2;
  for (let x = -roadWidth / 2 + 0.5; x <= roadWidth / 2 - 0.5; x += 0.85) {
    const barGeo = new THREE.BoxGeometry(0.50, 0.02, 3.2);
    const bar = new THREE.Mesh(barGeo, whiteRoadMarkingMat);
    bar.position.set(x, 0.066, zebraZ);
    group.add(bar);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. PROCEDURAL 3D NEIGHBORING BUILDINGS & COMPOUNDS (GTA VI Streetscape)
  // Replaces flat 2D photo roofs with volumetric 3D architectural structures.
  // ───────────────────────────────────────────────────────────────────────────

  function createNeighborBuilding(
    width: number,
    depth: number,
    height: number,
    floors = 2,
    hasBalcony = true
  ): THREE.Group {
    const bGroup = new THREE.Group();

    // Main structural volume
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const bodyMesh = new THREE.Mesh(bodyGeo, limestoneWarmMat);
    bodyMesh.position.set(0, height / 2, 0);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bGroup.add(bodyMesh);

    // Accent framing panel (dark concrete frame on facade)
    const frameGeo = new THREE.BoxGeometry(width * 0.92, height * 0.88, 0.4);
    const frameMesh = new THREE.Mesh(frameGeo, concreteDarkMat);
    frameMesh.position.set(0, height / 2, depth / 2 + 0.15);
    bGroup.add(frameMesh);

    // Glass Window Bands per floor
    const floorH = height / floors;
    for (let f = 0; f < floors; f++) {
      const winGeo = new THREE.BoxGeometry(width * 0.78, floorH * 0.48, 0.5);
      const winMesh = new THREE.Mesh(winGeo, glassWindowMat);
      winMesh.position.set(0, (f + 0.55) * floorH, depth / 2 + 0.2);
      bGroup.add(winMesh);

      // Louver / architectural slat accent
      if (f === 1) {
        const slatGeo = new THREE.BoxGeometry(width * 0.35, floorH * 0.52, 0.55);
        const slatMesh = new THREE.Mesh(slatGeo, woodAccentMat);
        slatMesh.position.set(width * 0.25, (f + 0.55) * floorH, depth / 2 + 0.22);
        bGroup.add(slatMesh);
      }
    }

    // Optional Modern Glass Balcony
    if (hasBalcony) {
      const balcGeo = new THREE.BoxGeometry(width * 0.5, 0.9, 1.4);
      const balcMesh = new THREE.Mesh(balcGeo, glassWindowMat);
      balcMesh.position.set(-width * 0.15, floorH + 0.45, depth / 2 + 0.7);
      bGroup.add(balcMesh);
    }

    // Rooftop Parapet
    const parapetGeo = new THREE.BoxGeometry(width + 0.2, 0.6, depth + 0.2);
    const parapetMesh = new THREE.Mesh(parapetGeo, concreteDarkMat);
    parapetMesh.position.set(0, height + 0.3, 0);
    bGroup.add(parapetMesh);

    // Rooftop Mechanical Units (Water tank, AC condensers, solar array)
    const tankGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.0, 16);
    const tank = new THREE.Mesh(tankGeo, roofEquipmentMat);
    tank.position.set(-width * 0.25, height + 1.2, -depth * 0.2);
    bGroup.add(tank);

    const acGeo = new THREE.BoxGeometry(1.4, 1.1, 1.4);
    const ac = new THREE.Mesh(acGeo, roofEquipmentMat);
    ac.position.set(width * 0.25, height + 0.7, -depth * 0.15);
    bGroup.add(ac);

    // Solar Panel Array
    const solarGeo = new THREE.BoxGeometry(4.0, 0.1, 2.5);
    const solar = new THREE.Mesh(solarGeo, glassWindowMat);
    solar.rotation.x = 0.22;
    solar.position.set(0, height + 0.8, depth * 0.15);
    bGroup.add(solar);

    return bGroup;
  }

  // Building 1: Left Neighbor Commercial / Office Block (X = -26m, Z = 6m)
  const leftBuilding = createNeighborBuilding(16.0, 14.0, 9.5, 2, true);
  leftBuilding.position.set(-26.0, 0, 6.0);
  group.add(leftBuilding);

  // Left Compound Boundary Wall & Gate
  const leftWallGeo = new THREE.BoxGeometry(16.0, 1.4, 0.3);
  const leftWall = new THREE.Mesh(leftWallGeo, wallBoundaryMat);
  leftWall.position.set(-26.0, 0.7, 14.5);
  group.add(leftWall);

  // Building 2: Right Neighbor Contemporary Villa / Studio (X = +26m, Z = 6m)
  const rightBuilding = createNeighborBuilding(16.0, 14.0, 10.0, 2, false);
  rightBuilding.position.set(26.0, 0, 6.0);
  group.add(rightBuilding);

  // Right Compound Boundary Wall & Landscaped Hedge
  const rightWallGeo = new THREE.BoxGeometry(16.0, 1.4, 0.3);
  const rightWall = new THREE.Mesh(rightWallGeo, wallBoundaryMat);
  rightWall.position.set(26.0, 0.7, 14.5);
  group.add(rightWall);

  const hedgeGeo = new THREE.BoxGeometry(15.0, 0.8, 0.5);
  const hedge = new THREE.Mesh(hedgeGeo, turfMat);
  hedge.position.set(26.0, 0.4, 15.0);
  group.add(hedge);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ROADSIDE 3D INDIAN TREES & MODERN STREETLIGHTS
  // ───────────────────────────────────────────────────────────────────────────
  const treeSpacing = 16.0;
  const startZ = 16.0;
  const endZ = roadLength - 6.0;
  const treeX = curbEdge + 1.2;

  let treeCount = 0;
  for (let z = startZ; z <= endZ; z += treeSpacing) {
    for (const side of [-1, 1]) {
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

  // Modern Architectural Streetlights Flanking the Avenue
  for (let z = startZ + 6.0; z <= endZ; z += treeSpacing * 1.6) {
    for (const side of [-1, 1]) {
      const lamp = createStreetLightMesh();
      lamp.scale.set(0.95, 0.95, 0.95);
      lamp.position.set(side * (curbEdge - 0.25), 0, z);
      lamp.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
      group.add(lamp);
    }
  }

  // Dispose cleanup helper
  const dispose = () => {
    for (const mat of materials) {
      mat.dispose();
    }
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      }
    });
  };

  return { group, dispose };
}
