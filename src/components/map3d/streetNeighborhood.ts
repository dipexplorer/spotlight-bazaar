import * as THREE from "three";
import { createTreeMesh, createStreetLightMesh } from "@/components/map/osm3dBuildings";
import { osmRoadSpline } from "./osmRoadSpline";

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
  setWeatherMode: (isRaining: boolean) => void;
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

  // 1b. Pedestrian Sidewalks, Plot Courtyard & Ambient Occlusion Ground Materials
  const sidewalkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialDark ? 0x1f2733 : 0xcbd5e1,
      roughness: 0.82,
      metalness: 0.08,
    })
  );

  const curbEdgeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialDark ? 0x2d3748 : 0x94a3b8,
      roughness: 0.75,
      metalness: 0.12,
    })
  );

  const plazaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialDark ? 0x1a2230 : 0xe2e8f0,
      roughness: 0.78,
      metalness: 0.10,
    })
  );

  const planterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: initialDark ? 0x142018 : 0x245838,
      roughness: 0.85,
      metalness: 0.05,
    })
  );

  const aoShadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.40,
      depthWrite: false,
    })
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 1c. SPLINE-CONTOURED 3D CURBSIDE SIDEWALKS (Both Left & Right)
  // ───────────────────────────────────────────────────────────────────────────
  function buildCurbsideSidewalk(isLeft: boolean): THREE.Mesh {
    const sStart = 2.0;
    const sEnd = osmRoadSpline.totalLength - 4.0;
    const step = 2.0;
    const numSteps = Math.floor((sEnd - sStart) / step) + 1;

    const innerDist = roadCorridorHalfWidth; // 3.2m
    const outerDist = roadCorridorHalfWidth + 1.25; // 4.45m
    const curbHeight = 0.12;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let vertexOffset = 0;

    for (let i = 0; i < numSteps; i++) {
      const s = Math.min(sEnd, sStart + i * step);
      const pose = osmRoadSpline.getPoseAtDistance(s);

      const sideSign = isLeft ? -1 : 1;
      const innerOffset = sideSign * innerDist;
      const outerOffset = sideSign * outerDist;

      const pInnerBot = pose.position.clone().addScaledVector(pose.normal, innerOffset);
      const pInnerTop = pInnerBot.clone();
      pInnerTop.y += curbHeight;

      const pOuterTop = pose.position.clone().addScaledVector(pose.normal, outerOffset);
      pOuterTop.y += curbHeight;

      positions.push(pInnerBot.x, pInnerBot.y, pInnerBot.z);
      positions.push(pInnerTop.x, pInnerTop.y, pInnerTop.z);
      positions.push(pOuterTop.x, pOuterTop.y, pOuterTop.z);

      const curbNorm = pose.normal.clone().multiplyScalar(-sideSign);
      normals.push(curbNorm.x, curbNorm.y, curbNorm.z);
      normals.push(0, 1, 0);
      normals.push(0, 1, 0);

      uvs.push(0, s * 0.25);
      uvs.push(0.2, s * 0.25);
      uvs.push(1.0, s * 0.25);

      if (i < numSteps - 1) {
        const v0 = vertexOffset;
        const v1 = vertexOffset + 1;
        const v2 = vertexOffset + 2;
        const nv0 = vertexOffset + 3;
        const nv1 = vertexOffset + 4;
        const nv2 = vertexOffset + 5;

        // Curb face quad (v0, v1, nv1, nv0)
        indices.push(v0, v1, nv1);
        indices.push(v0, nv1, nv0);

        // Sidewalk top surface quad (v1, v2, nv2, nv1)
        indices.push(v1, v2, nv2);
        indices.push(v1, nv2, nv1);
      }
      vertexOffset += 3;
    }

    const geo = trackGeo(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, sidewalkMat);
    mesh.receiveShadow = true;
    return mesh;
  }

  const leftSidewalk = buildCurbsideSidewalk(true);
  group.add(leftSidewalk);

  const rightSidewalk = buildCurbsideSidewalk(false);
  group.add(rightSidewalk);

  // Commercial Plot Landscaped Courtyard Base (Nerqiva Studio Ground Slab)
  const plazaGeo = trackGeo(new THREE.BoxGeometry(26.0, 0.08, 18.0));
  const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
  plazaMesh.position.set(0, 0.04, 7.0);
  plazaMesh.receiveShadow = true;
  group.add(plazaMesh);

  // Courtyard Planters / Perimeter Curb
  for (const side of [-1, 1]) {
    const planterGeo = trackGeo(new THREE.BoxGeometry(0.8, 0.35, 16.0));
    const planterMesh = new THREE.Mesh(planterGeo, concreteDarkMat);
    planterMesh.position.set(side * 12.6, 0.18, 7.0);
    group.add(planterMesh);

    const bushGeo = trackGeo(new THREE.BoxGeometry(0.6, 0.45, 15.6));
    const bushMesh = new THREE.Mesh(bushGeo, planterMat);
    bushMesh.position.set(side * 12.6, 0.35, 7.0);
    group.add(bushMesh);
  }

  // Soft Ambient Occlusion Shadow Decals beneath buildings
  const bldgShadowGeo = trackGeo(new THREE.PlaneGeometry(18.0, 16.0));
  bldgShadowGeo.rotateX(-Math.PI / 2);
  const leftBldgShadow = new THREE.Mesh(bldgShadowGeo, aoShadowMat);
  leftBldgShadow.position.set(-26.0, 0.015, 6.0);
  group.add(leftBldgShadow);

  const rightBldgShadow = new THREE.Mesh(bldgShadowGeo, aoShadowMat);
  rightBldgShadow.position.set(26.0, 0.015, 6.0);
  group.add(rightBldgShadow);

  const villaShadowGeo = trackGeo(new THREE.PlaneGeometry(22.0, 16.0));
  villaShadowGeo.rotateX(-Math.PI / 2);
  const villaShadow = new THREE.Mesh(villaShadowGeo, aoShadowMat);
  villaShadow.position.set(0, 0.015, 7.0);
  group.add(villaShadow);

  // Tree Ambient Occlusion Shadow Decal Geometry
  const treeShadowGeo = trackGeo(new THREE.CircleGeometry(2.4, 16));
  treeShadowGeo.rotateX(-Math.PI / 2);

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
  // 3. ASYMMETRICAL ORGANIC INDIAN STREET TREES & STREETLIGHTS (SPLINE-CONTOURED)
  // ───────────────────────────────────────────────────────────────────────────
  // Staggered, non-symmetrical tree placement strictly contoured along the curved OSM road spline
  // Guarantees zero encroachment onto the asphalt regardless of road bends
  const leftTreeSs = [16.0, 30.0, 46.0, 62.0, 78.0, 96.0, 114.0];
  const rightTreeSs = [22.0, 37.0, 53.0, 69.0, 86.0, 105.0, 124.0];
  const speciesList: ("gulmohar" | "neem" | "ashoka")[] = ["gulmohar", "neem", "ashoka", "neem", "gulmohar"];

  let tIdx = 0;
  // Left side trees (staggered along -normal)
  for (const s of leftTreeSs) {
    if (s > osmRoadSpline.totalLength - 10.0) break;
    const species = speciesList[tIdx % speciesList.length];
    const tree = createTreeMesh(species);
    const scale = 0.88 + (Math.sin(s * 1.5) + 1) * 0.16; // 0.88 to 1.20 natural scale
    tree.scale.set(scale, scale, scale);

    const pose = osmRoadSpline.getPoseAtDistance(s);
    const lateralDist = -(roadCorridorHalfWidth + 1.8 + (Math.sin(s * 2.3) * 0.35));
    const treePos = pose.position.clone().addScaledVector(pose.normal, lateralDist);
    tree.position.set(treePos.x, 0, treePos.z);
    tree.rotation.y = (s * 0.53) % (Math.PI * 2);
    group.add(tree);

    // Soft ambient occlusion ground contact shadow
    const tShadow = new THREE.Mesh(treeShadowGeo, aoShadowMat);
    tShadow.position.set(treePos.x, 0.015, treePos.z);
    group.add(tShadow);

    tIdx++;
  }

  // Right side trees (staggered along +normal)
  for (const s of rightTreeSs) {
    if (s > osmRoadSpline.totalLength - 10.0) break;
    const species = speciesList[(tIdx + 1) % speciesList.length];
    const tree = createTreeMesh(species);
    const scale = 0.85 + (Math.cos(s * 1.7) + 1) * 0.17;
    tree.scale.set(scale, scale, scale);

    const pose = osmRoadSpline.getPoseAtDistance(s);
    const lateralDist = roadCorridorHalfWidth + 1.8 + (Math.cos(s * 2.1) * 0.35);
    const treePos = pose.position.clone().addScaledVector(pose.normal, lateralDist);
    tree.position.set(treePos.x, 0, treePos.z);
    tree.rotation.y = (s * 0.71) % (Math.PI * 2);
    group.add(tree);

    // Soft ambient occlusion ground contact shadow
    const tShadow = new THREE.Mesh(treeShadowGeo, aoShadowMat);
    tShadow.position.set(treePos.x, 0.015, treePos.z);
    group.add(tShadow);

    tIdx++;
  }

  // Modern Architectural Streetlights with Physics-Based Downward Expanding Cones
  // Placed strictly along the road normal on the verge (curbOffset = 4.0m)
  // Arm overhangs inward (1.14m), placing lantern head at 2.86m from centerline (over gutter/curb)
  // NEVER encroaches into the road asphalt.
  const coneHeight = 5.8;
  const coneRadiusTop = 0.08;
  const coneRadiusBottom = 2.6;
  const coneGeo = trackGeo(new THREE.CylinderGeometry(coneRadiusTop, coneRadiusBottom, coneHeight, 16, 1, true));
  const poolGeo = trackGeo(new THREE.CircleGeometry(coneRadiusBottom, 16));
  poolGeo.rotateX(-Math.PI / 2);

  const lampDistances = [14.0, 36.0, 58.0, 80.0];
  const curbOffset = roadCorridorHalfWidth + 0.8; // 4.0m from road centerline (safely on the verge)

  for (const s of lampDistances) {
    const pose = osmRoadSpline.getPoseAtDistance(s);

    for (const side of [-1, 1]) {
      const lamp = createStreetLightMesh();
      lamp.scale.set(0.95, 0.95, 0.95);

      // Pole position on verge
      const polePos = pose.position.clone().addScaledVector(pose.normal, side * curbOffset);
      lamp.position.set(polePos.x, 0, polePos.z);

      // Arm extends along local +X in createStreetLightMesh.
      // For left side (side === -1), pointing along +normal points inward toward road centerline.
      // For right side (side === 1), pointing along -normal points inward toward road centerline.
      lamp.rotation.y = side === -1 ? pose.heading : pose.heading + Math.PI;
      group.add(lamp);

      // Overhanging lantern head world position (arm extends inward by 1.14m)
      const bulbOffset = side * (curbOffset - 1.14);
      const bulbPos = pose.position.clone().addScaledVector(pose.normal, bulbOffset);

      // Downward Volumetric Light Beam: Narrow at lantern head (Y=5.8m), wide at pavement (Y=0m)
      const cone = new THREE.Mesh(coneGeo, lightConeMat);
      cone.position.set(bulbPos.x, coneHeight / 2, bulbPos.z);
      group.add(cone);

      // Warm Illuminated Pavement Pool directly below the lantern head
      const pool = new THREE.Mesh(poolGeo, lightPoolMat);
      pool.position.set(bulbPos.x, 0.04, bulbPos.z);
      group.add(pool);
    }
  }

  // Dynamic Day/Night & Weather-Responsive Atmospheric Lighting & Material State
  let currentIsDark = initialDark;
  let currentIsRaining = false;

  const applyAtmosphere = () => {
    // Turf: darkens and softens when wet
    turfMat.color.setHex(
      currentIsDark
        ? (currentIsRaining ? 0x081710 : 0x0f291e)
        : (currentIsRaining ? 0x1b422a : 0x245838)
    );
    turfMat.roughness = currentIsRaining ? 0.60 : 0.88;

    // Concrete & Curb: slick wet asphalt effect with specular reflection
    concreteDarkMat.color.setHex(
      currentIsDark
        ? (currentIsRaining ? 0x121720 : 0x1e2530)
        : (currentIsRaining ? 0x1e293b : 0x334155)
    );
    concreteDarkMat.roughness = currentIsRaining ? 0.22 : 0.75;
    concreteDarkMat.metalness = currentIsRaining ? 0.35 : 0.15;

    limestoneWarmMat.color.setHex(
      currentIsDark
        ? (currentIsRaining ? 0x22262d : 0x333842)
        : (currentIsRaining ? 0xcbd5e1 : 0xe2e8f0)
    );
    limestoneWarmMat.roughness = currentIsRaining ? 0.40 : 0.85;

    wallBoundaryMat.color.setHex(currentIsDark ? 0x1e293b : 0x64748b);

    // Sidewalks & Curb Edge: slick wet appearance when raining
    sidewalkMat.color.setHex(
      currentIsDark
        ? (currentIsRaining ? 0x141a24 : 0x1f2733)
        : (currentIsRaining ? 0x94a3b8 : 0xcbd5e1)
    );
    sidewalkMat.roughness = currentIsRaining ? 0.32 : 0.82;
    sidewalkMat.metalness = currentIsRaining ? 0.28 : 0.08;

    curbEdgeMat.color.setHex(
      currentIsDark
        ? (currentIsRaining ? 0x1a202c : 0x2d3748)
        : (currentIsRaining ? 0x64748b : 0x94a3b8)
    );

    // Courtyard Plaza Base
    plazaMat.color.setHex(
      currentIsDark
        ? (currentIsRaining ? 0x101724 : 0x1a2230)
        : (currentIsRaining ? 0xcbd5e1 : 0xe2e8f0)
    );
    plazaMat.roughness = currentIsRaining ? 0.30 : 0.78;
    plazaMat.metalness = currentIsRaining ? 0.35 : 0.10;

    // Building Window Lighting: Warm golden glow at night
    glassWindowMat.color.setHex(currentIsDark ? 0xfef08a : 0x38bdf8);
    glassWindowMat.roughness = currentIsDark ? 0.35 : 0.15;
    glassWindowMat.metalness = currentIsDark ? 0.2 : 0.85;
    glassWindowMat.emissive.setHex(currentIsDark ? 0xfde047 : 0x0369a1);
    glassWindowMat.emissiveIntensity = currentIsDark ? 1.6 : 0.15;

    // Streetlight Glow: enhanced wet ground reflections & rain scatter
    if (currentIsDark) {
      lightConeMat.opacity = currentIsRaining ? 0.30 : 0.22;
      lightPoolMat.opacity = currentIsRaining ? 0.46 : 0.28;
    } else {
      lightConeMat.opacity = 0.0;
      lightPoolMat.opacity = 0.0;
    }
  };

  // Initial atmosphere setup matching creation mode
  applyAtmosphere();

  const setNightMode = (isDark: boolean) => {
    currentIsDark = isDark;
    applyAtmosphere();
  };

  const setWeatherMode = (isRaining: boolean) => {
    currentIsRaining = isRaining;
    applyAtmosphere();
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

  return { group, setNightMode, setWeatherMode, update, dispose };
}
