import * as THREE from "three";
import { BusinessStorefront, City } from "@/types";
import {
  createRoadTexture,
  createSidewalkTexture,
} from "./streetTextures";
import { toWorld } from "./projection";
import { buildCartoonStorefrontPlot, StorefrontMeshResult } from "./cartoonStorefront";
import { createTrafficSystem, TrafficSystem } from "./trafficSystem";
import { createPedestrianSystem, PedestrianSystem } from "./pedestrianSystem";

export interface BazaarStreetBuildResult {
  group: THREE.Group;
  hitBoxes: THREE.Mesh[];
  traffic: TrafficSystem;
  pedestrians: PedestrianSystem;
  plots: StorefrontMeshResult[];
}

/**
 * Builds the complete 3D Bazaar High-Street & Living Town Environment
 * Incorporates procedural cartoon-block buildings, moving Indian traffic, and animated citizens.
 */
export function buildBazaarStreet(
  city: City,
  storefronts: BusinessStorefront[]
): BazaarStreetBuildResult {
  const group = new THREE.Group();
  group.name = `bazaar_street_${city.slug}`;

  // Center the town street at city's 3D coordinates
  const [originX, originZ] = toWorld(city.lon, city.lat);
  group.position.set(originX, 4.6, originZ);

  // Filter storefronts active in this city
  const cityStorefronts = storefronts.filter(
    (s) =>
      Boolean(s?.city_name) &&
      s.city_name.toLowerCase() === city.name.toLowerCase()
  );

  // If fewer than 4 shops in this city, pad with showcase businesses
  const activeBusinesses =
    cityStorefronts.length >= 2
      ? cityStorefronts
      : [...cityStorefronts, ...storefronts.slice(0, Math.max(0, 4 - cityStorefronts.length))];

  // Total plot slots: active businesses + 1 under construction plot + 1 free claimable plot
  const totalPlots = Math.max(activeBusinesses.length + 2, 8);
  const pairsCount = Math.ceil(totalPlots / 2);
  const plotSpacing = 22;
  const streetLength = (pairsCount + 1) * plotSpacing;

  // Regional City Landscape Theme (Guwahati / Mumbai / Bangalore / Delhi)
  const theme = getCityLandscapeTheme(city.slug || city.name);

  // 1 & 2. Regional Landscape Ground & Periphery (River / Ocean / Botanical / Heritage)
  const regionalLandscape = buildRegionalLandscape(theme, city.name, streetLength, plotSpacing);
  group.add(regionalLandscape);

  // 3. Regional Background (Assam Hills / Coastal Horizon / Glass Tech Towers / Sandstone Ridges)
  const backgroundGroup = buildBackgroundLandscape(theme, streetLength);
  group.add(backgroundGroup);

  // 4. Central Asphalt Road with Indian Yellow Markings
  const roadWidth = 16;
  const roadGeo = new THREE.PlaneGeometry(roadWidth, streetLength);
  const roadMat = new THREE.MeshStandardMaterial({
    map: createRoadTexture(),
    roughness: 0.8,
    metalness: 0.1,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.set(0, 0.06, streetLength / 2 - plotSpacing);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // 5. Quintessential Indian Black-and-Yellow Painted Curbs
  const curbGeo = new THREE.BoxGeometry(0.35, 0.22, streetLength);
  // Procedural yellow/black stripe texture for curbs
  const curbCanvas = document.createElement("canvas");
  curbCanvas.width = 64;
  curbCanvas.height = 128;
  const cctx = curbCanvas.getContext("2d")!;
  cctx.fillStyle = "#facc15"; // Indian highway yellow
  cctx.fillRect(0, 0, 64, 64);
  cctx.fillStyle = "#18181b"; // Charcoal black
  cctx.fillRect(0, 64, 64, 64);
  const curbTex = new THREE.CanvasTexture(curbCanvas);
  curbTex.wrapT = THREE.RepeatWrapping;
  curbTex.repeat.set(1, streetLength / 4);

  const curbMat = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.8 });
  const leftCurb = new THREE.Mesh(curbGeo, curbMat);
  leftCurb.position.set(-(roadWidth / 2 + 0.18), 0.12, streetLength / 2 - plotSpacing);
  group.add(leftCurb);

  const rightCurb = new THREE.Mesh(curbGeo, curbMat);
  rightCurb.position.set(roadWidth / 2 + 0.18, 0.12, streetLength / 2 - plotSpacing);
  group.add(rightCurb);

  // 6. Pedestrian Sidewalks (Left and Right)
  const sidewalkWidth = 8;
  const sidewalkGeo = new THREE.PlaneGeometry(sidewalkWidth, streetLength);
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: createSidewalkTexture(),
    roughness: 0.7,
    metalness: 0.2,
  });

  const leftSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  leftSidewalk.rotation.x = -Math.PI / 2;
  leftSidewalk.position.set(-(roadWidth / 2 + sidewalkWidth / 2 + 0.35), 0.08, streetLength / 2 - plotSpacing);
  leftSidewalk.receiveShadow = true;
  group.add(leftSidewalk);

  const rightSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  rightSidewalk.rotation.x = -Math.PI / 2;
  rightSidewalk.position.set(roadWidth / 2 + sidewalkWidth / 2 + 0.35, 0.08, streetLength / 2 - plotSpacing);
  rightSidewalk.receiveShadow = true;
  group.add(rightSidewalk);

  // 7. Pedestrian Zebra Crossings
  const zebraWidth = 8;
  const zebraLength = roadWidth - 1;
  const zebraGeo = new THREE.PlaneGeometry(zebraLength, zebraWidth);
  const zCanvas = document.createElement("canvas");
  zCanvas.width = 256;
  zCanvas.height = 128;
  const zctx = zCanvas.getContext("2d")!;
  zctx.fillStyle = "#1e293b";
  zctx.fillRect(0, 0, 256, 128);
  zctx.fillStyle = "#f8fafc";
  for (let zx = 10; zx < 256; zx += 36) {
    zctx.fillRect(zx, 10, 20, 108);
  }
  const zTex = new THREE.CanvasTexture(zCanvas);
  const zebraMat = new THREE.MeshStandardMaterial({ map: zTex, roughness: 0.8 });

  for (const zz of [plotSpacing * 0.5, streetLength * 0.5, streetLength - plotSpacing * 0.5]) {
    const zebraMesh = new THREE.Mesh(zebraGeo, zebraMat);
    zebraMesh.rotation.x = -Math.PI / 2;
    zebraMesh.rotation.z = Math.PI / 2;
    zebraMesh.position.set(0, 0.07, zz);
    group.add(zebraMesh);
  }

  // 8. Welcome Street Arch
  const archGroup = buildWelcomeArch(city.name);
  archGroup.position.set(0, 0, -plotSpacing * 0.4);
  group.add(archGroup);

  // 9. Modular Cartoon-Block Storefronts along the street
  const hitBoxes: THREE.Mesh[] = [];
  const plotResults: StorefrontMeshResult[] = [];

  const buildingOffsetDistance = roadWidth / 2 + sidewalkWidth + 7.5;

  for (let i = 0; i < totalPlots; i++) {
    const isLeft = i % 2 === 0;
    const pairIndex = Math.floor(i / 2);
    const zPos = pairIndex * plotSpacing + plotSpacing * 0.5;
    const xPos = isLeft ? -buildingOffsetDistance : buildingOffsetDistance;

    let business: BusinessStorefront | null = null;
    let isConstruction = false;
    let isEmptyPlot = false;

    if (i < activeBusinesses.length) {
      business = activeBusinesses[i];
    } else if (i === activeBusinesses.length) {
      // Under construction plot showing real town growth
      isConstruction = true;
    } else {
      // Free plot for visitors to claim
      isEmptyPlot = true;
    }

    const plotResult = buildCartoonStorefrontPlot(
      business,
      i,
      isLeft,
      xPos,
      zPos,
      isConstruction,
      isEmptyPlot
    );

    group.add(plotResult.mesh);
    group.add(plotResult.hitBox);

    hitBoxes.push(plotResult.hitBox);
    plotResults.push(plotResult);

    // Floating 3D Badge over the building
    const badge = buildInteractivePlotBadge(business, isConstruction, isEmptyPlot);
    badge.position.copy(plotResult.badgePosition);
    group.add(badge);
  }

  // 10. Street Lamps & Neem Trees along both sidewalks
  for (let z = 0; z < streetLength; z += plotSpacing) {
    const leftLamp = buildStreetLamp();
    leftLamp.position.set(-(roadWidth / 2 + 1.2), 0, z);
    group.add(leftLamp);

    const rightLamp = buildStreetLamp();
    rightLamp.position.set(roadWidth / 2 + 1.2, 0, z);
    rightLamp.rotation.y = Math.PI;
    group.add(rightLamp);

    // Trees
    if (z + 11 < streetLength) {
      const leftTree = buildLowPolyTree(theme);
      leftTree.position.set(-(roadWidth / 2 + sidewalkWidth - 1.2), 0, z + 11);
      group.add(leftTree);

      const rightTree = buildLowPolyTree(theme);
      rightTree.position.set(roadWidth / 2 + sidewalkWidth - 1.2, 0, z + 11);
      group.add(rightTree);
    }
  }

  // 11. Interactive Street Landmarks: Cutting Chai Stall & Riverside Cricket Pitch
  const chaiStall = buildCuttingChaiStall(
    -(roadWidth / 2 + sidewalkWidth * 0.45),
    plotSpacing * 0.45
  );
  group.add(chaiStall.group);
  group.add(chaiStall.hitBox);
  hitBoxes.push(chaiStall.hitBox);

  const cricket = buildCricketPitch(
    -(roadWidth / 2 + sidewalkWidth + 28),
    streetLength * 0.42
  );
  group.add(cricket.group);
  group.add(cricket.hitBox);
  hitBoxes.push(cricket.hitBox);

  // 12. Living Traffic Simulation (Auto-Rickshaws, Delivery Scooters, Cabs, Buses)
  const traffic = createTrafficSystem(streetLength);
  group.add(traffic.group);

  // 13. Living Pedestrians Simulation (Citizens & Shoppers walking)
  const pedestrians = createPedestrianSystem(streetLength);
  group.add(pedestrians.group);

  return {
    group,
    hitBoxes,
    traffic,
    pedestrians,
    plots: plotResults,
  };
}

export type CityLandscapeTheme = "river_hills" | "coastal_ocean" | "garden_tech" | "heritage_sandstone";

export function getCityLandscapeTheme(slugOrName: string): CityLandscapeTheme {
  const s = slugOrName.toLowerCase();
  if (s.includes("mumbai") || s.includes("goa") || s.includes("kochi") || s.includes("chennai")) {
    return "coastal_ocean";
  }
  if (s.includes("bangalore") || s.includes("bengaluru") || s.includes("pune") || s.includes("hyderabad")) {
    return "garden_tech";
  }
  if (
    s.includes("delhi") ||
    s.includes("jaipur") ||
    s.includes("lucknow") ||
    s.includes("chandigarh") ||
    s.includes("ahmedabad") ||
    s.includes("indore")
  ) {
    return "heritage_sandstone";
  }
  return "river_hills";
}

/**
 * Builds regional landscape grounds & periphery features (River, Ocean, Botanical Park, Heritage Canal)
 */
function buildRegionalLandscape(
  theme: CityLandscapeTheme,
  cityName: string,
  streetLength: number,
  plotSpacing: number
): THREE.Group {
  const env = new THREE.Group();

  // 1. Terrain Ground
  let terrainColor = 0x2d6a3f; // river_hills: Assam tea green
  if (theme === "coastal_ocean") terrainColor = 0x1e293b; // Marine Drive slate
  else if (theme === "garden_tech") terrainColor = 0x2d6a4f; // Lalbagh park lawn
  else if (theme === "heritage_sandstone") terrainColor = 0x7c2d12; // Delhi red sandstone

  const terrainGeo = new THREE.PlaneGeometry(550, streetLength + 350, 16, 16);
  const terrainMat = new THREE.MeshStandardMaterial({
    color: terrainColor,
    roughness: 0.9,
    metalness: 0.05,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.set(0, 0.01, streetLength / 2 - plotSpacing);
  terrainMesh.receiveShadow = true;
  env.add(terrainMesh);

  // 2. Periphery feature (River vs Ocean vs Botanical Park vs Mughal Canal)
  if (theme === "river_hills") {
    // Scenic River (Brahmaputra / Ganga)
    const riverGeo = new THREE.PlaneGeometry(130, streetLength + 450);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x1d609a,
      roughness: 0.15,
      metalness: 0.75,
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.position.set(155, 0.02, streetLength / 2 - plotSpacing);
    env.add(riverMesh);

    // River Bank Sand Trim
    const bankGeo = new THREE.PlaneGeometry(16, streetLength + 450);
    const bankMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.95,
    });
    const bankMesh = new THREE.Mesh(bankGeo, bankMat);
    bankMesh.rotation.x = -Math.PI / 2;
    bankMesh.position.set(88, 0.03, streetLength / 2 - plotSpacing);
    env.add(bankMesh);
  } else if (theme === "coastal_ocean") {
    // Arabian Sea / Bay of Bengal Ocean
    const oceanGeo = new THREE.PlaneGeometry(160, streetLength + 450);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x093557, // Deep oceanic blue
      roughness: 0.1,
      metalness: 0.85,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(168, 0.02, streetLength / 2 - plotSpacing);
    env.add(oceanMesh);

    // Shoreline White Sea Foam / Wave Crest Line
    const foamGeo = new THREE.PlaneGeometry(8, streetLength + 450);
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.85 });
    const foamMesh = new THREE.Mesh(foamGeo, foamMat);
    foamMesh.rotation.x = -Math.PI / 2;
    foamMesh.position.set(84, 0.03, streetLength / 2 - plotSpacing);
    env.add(foamMesh);

    // Marine Drive Sea Wall Parapet
    const wallGeo = new THREE.BoxGeometry(1.2, 1.4, streetLength + 200);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(80, 0.7, streetLength / 2 - plotSpacing);
    wallMesh.castShadow = true;
    env.add(wallMesh);

    // Concrete Tetrapods along the sea wall edge
    const tetrapodMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    for (let tz = 0; tz < streetLength; tz += 24) {
      const tetrapod = new THREE.Group();
      tetrapod.position.set(84, 0.6, tz);
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 2.2, 5), tetrapodMat);
        leg.rotation.x = i === 0 ? 0.6 : -0.6;
        leg.rotation.z = i % 2 === 0 ? 0.6 : -0.6;
        tetrapod.add(leg);
      }
      env.add(tetrapod);
    }
  } else if (theme === "garden_tech") {
    // Lalbagh / Cubbon Park Botanical Promenade Strip
    const parkLawnGeo = new THREE.PlaneGeometry(130, streetLength + 400);
    const parkLawnMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Lush manicured grass
      roughness: 0.9,
    });
    const parkLawn = new THREE.Mesh(parkLawnGeo, parkLawnMat);
    parkLawn.rotation.x = -Math.PI / 2;
    parkLawn.position.set(150, 0.02, streetLength / 2 - plotSpacing);
    env.add(parkLawn);

    // Winding red terracotta gravel trail
    const trailGeo = new THREE.PlaneGeometry(12, streetLength + 400);
    const trailMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.95,
    });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.rotation.x = -Math.PI / 2;
    trail.position.set(88, 0.03, streetLength / 2 - plotSpacing);
    env.add(trail);

    // Alternating marigold and bougainvillea flower beds
    const flowerMat1 = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.8 }); // Marigold
    const flowerMat2 = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.8 }); // Bougainvillea
    for (let fz = 0; fz < streetLength; fz += 22) {
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.25, 12),
        fz % 44 === 0 ? flowerMat1 : flowerMat2
      );
      bed.position.set(96, 0.12, fz + 6);
      env.add(bed);
    }
  } else if (theme === "heritage_sandstone") {
    // Mughal Charbagh Sandstone Canal & Reflective Plaza
    const plazaGeo = new THREE.PlaneGeometry(130, streetLength + 400);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // Rich terracotta sandstone terrace
      roughness: 0.8,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(150, 0.02, streetLength / 2 - plotSpacing);
    env.add(plaza);

    // Central reflective water canal
    const canalGeo = new THREE.PlaneGeometry(28, streetLength + 400);
    const canalMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Reflective azure pool water
      roughness: 0.1,
      metalness: 0.8,
    });
    const canal = new THREE.Mesh(canalGeo, canalMat);
    canal.rotation.x = -Math.PI / 2;
    canal.position.set(100, 0.03, streetLength / 2 - plotSpacing);
    env.add(canal);

    // Red sandstone canal curbs & fountain plinths
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
    for (let fz = 0; fz < streetLength; fz += 30) {
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 1.2, 8), curbMat);
      plinth.position.set(100, 0.6, fz + 10);
      env.add(plinth);
      const sprout = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xbae6fd })
      );
      sprout.position.set(100, 1.4, fz + 10);
      env.add(sprout);
    }
  }

  return env;
}

/**
 * Builds regional background landscape (Assam hills / Glass Tech Towers / Coastal Lighthouse / Sandstone Ridges)
 */
function buildBackgroundLandscape(theme: CityLandscapeTheme, streetLength: number): THREE.Group {
  const bg = new THREE.Group();

  if (theme === "garden_tech") {
    // Modern Glass Tech Towers & Cyber Skyline (Bangalore / Hyderabad / Pune)
    const towerMat1 = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8,
    });
    const towerMat2 = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.7,
    });
    const towerMat3 = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.85,
    });

    const towerPositions = [
      { x: 220, z: -60, w: 20, d: 20, h: 58, mat: towerMat1 },
      { x: 245, z: 30, w: 24, d: 22, h: 72, mat: towerMat2 },
      { x: 215, z: 120, w: 18, d: 18, h: 48, mat: towerMat3 },
      { x: 250, z: 200, w: 22, d: 20, h: 64, mat: towerMat1 },
      { x: 225, z: 290, w: 26, d: 24, h: 80, mat: towerMat2 },
      { x: 260, z: 380, w: 20, d: 18, h: 54, mat: towerMat3 },
      { x: -180, z: -70, w: 18, d: 18, h: 50, mat: towerMat2 },
      { x: -205, z: 50, w: 22, d: 20, h: 68, mat: towerMat1 },
      { x: -185, z: 170, w: 20, d: 18, h: 55, mat: towerMat3 },
      { x: -210, z: 280, w: 24, d: 22, h: 75, mat: towerMat2 },
    ];

    towerPositions.forEach((tp) => {
      const towerMesh = new THREE.Mesh(new THREE.BoxGeometry(tp.w, tp.h, tp.d), tp.mat);
      towerMesh.position.set(tp.x, tp.h / 2, tp.z);
      towerMesh.castShadow = true;
      bg.add(towerMesh);

      // Rooftop spire with aircraft beacon
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.4, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
      );
      spire.position.set(tp.x, tp.h + 4, tp.z);
      bg.add(spire);

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      beacon.position.set(tp.x, tp.h + 8.2, tp.z);
      bg.add(beacon);
    });

    return bg;
  }

  if (theme === "coastal_ocean") {
    // Coastal Horizon: Distant Western Ghats & Coastal Lighthouse
    const hillPositions = [
      { x: -170, z: -70, r: 42, h: 26, color: 0x1e3a5f },
      { x: -190, z: 70, r: 52, h: 32, color: 0x224a73 },
      { x: -180, z: 190, r: 46, h: 28, color: 0x1e3a5f },
      { x: -200, z: 310, r: 54, h: 34, color: 0x162f4d },
    ];

    hillPositions.forEach((pos) => {
      const domeGeo = new THREE.SphereGeometry(pos.r, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
      domeGeo.scale(1, pos.h / pos.r, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: pos.color,
        roughness: 0.9,
        flatShading: true,
      });
      const hillMesh = new THREE.Mesh(domeGeo, mat);
      hillMesh.position.set(pos.x, 0, pos.z);
      bg.add(hillMesh);
    });

    // Coastal Lighthouse out at sea
    const lighthouseGroup = new THREE.Group();
    lighthouseGroup.position.set(230, 0, streetLength * 0.5);
    const lhBase = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 5, 22, 10),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 })
    );
    lhBase.position.y = 11;
    lighthouseGroup.add(lhBase);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(4.1, 4.3, 5, 10),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 })
    );
    stripe.position.y = 12;
    lighthouseGroup.add(stripe);

    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 4, 8),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    lantern.position.y = 23;
    lighthouseGroup.add(lantern);

    bg.add(lighthouseGroup);
    return bg;
  }

  if (theme === "heritage_sandstone") {
    // Red Sandstone Aravalli rocky ridges
    const ridgePositions = [
      { x: 210, z: -50, r: 44, h: 28, color: 0x78350f },
      { x: 230, z: 50, r: 50, h: 32, color: 0x92400e },
      { x: 210, z: 160, r: 46, h: 30, color: 0x78350f },
      { x: 235, z: 270, r: 52, h: 34, color: 0x451a03 },
      { x: -170, z: -60, r: 42, h: 26, color: 0x78350f },
      { x: -190, z: 80, r: 48, h: 30, color: 0x92400e },
      { x: -180, z: 200, r: 44, h: 28, color: 0x78350f },
      { x: -200, z: 320, r: 50, h: 32, color: 0x451a03 },
    ];

    ridgePositions.forEach((pos) => {
      const domeGeo = new THREE.SphereGeometry(pos.r, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
      domeGeo.scale(1, pos.h / pos.r, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: pos.color,
        roughness: 0.95,
        flatShading: true,
      });
      const hillMesh = new THREE.Mesh(domeGeo, mat);
      hillMesh.position.set(pos.x, 0, pos.z);
      bg.add(hillMesh);
    });

    return bg;
  }

  // Default: river_hills (Guwahati, Assam, Kolkata, Varanasi)
  return buildBackgroundHills(streetLength);
}

/**
 * Builds low-poly Indian street trees with regional variations
 */
function buildLowPolyTree(theme: CityLandscapeTheme = "river_hills"): THREE.Group {
  const tree = new THREE.Group();

  if (theme === "coastal_ocean") {
    // Coastal Coconut Palm Tree
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.45, 9, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 4.5;
    trunk.rotation.z = 0.08;
    tree.add(trunk);

    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.8,
      flatShading: true,
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const frondGeo = new THREE.ConeGeometry(0.7, 4.2, 4);
      const frond = new THREE.Mesh(frondGeo, frondMat);
      frond.position.set(Math.cos(angle) * 1.6, 8.8, Math.sin(angle) * 1.6);
      frond.rotation.z = Math.PI / 2.8;
      frond.rotation.y = angle;
      tree.add(frond);
    }
    return tree;
  }

  if (theme === "garden_tech") {
    // Jacaranda Flowering Tree (Lilac/Purple canopy)
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3;
    tree.add(trunk);

    const crownColor = Math.random() > 0.4 ? 0x818cf8 : 0xa78bfa;
    const leafMat = new THREE.MeshStandardMaterial({
      color: crownColor,
      roughness: 0.8,
      flatShading: true,
    });
    const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), leafMat);
    crown1.position.y = 6.6;
    tree.add(crown1);

    const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), leafMat);
    crown2.position.set(0.3, 8.4, -0.2);
    tree.add(crown2);
    return tree;
  }

  if (theme === "heritage_sandstone") {
    // Slender Columnar Ornamental Cypress
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 3.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.75;
    tree.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.85,
      flatShading: true,
    });
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5.5, 6), leafMat);
    cone1.position.y = 5.5;
    tree.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.2, 6), leafMat);
    cone2.position.y = 8.2;
    tree.add(cone2);
    return tree;
  }

  // Default: Classic Neem / Banyan Tree
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 6, 6);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.9,
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 3;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Lush emerald
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
  });

  const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), leafMat);
  crown1.position.y = 6.6;
  crown1.castShadow = true;
  tree.add(crown1);

  const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), leafMat);
  crown2.position.set(0.3, 8.4, -0.2);
  crown2.castShadow = true;
  tree.add(crown2);

  return tree;
}

/**
 * Builds background rolling low-poly hills
 */
function buildBackgroundHills(streetLength: number): THREE.Group {
  const hills = new THREE.Group();

  const hillPositions = [
    { x: 210, z: -50, r: 42, h: 26, color: 0x255d37 },
    { x: 230, z: 40, r: 48, h: 32, color: 0x2d6a3f },
    { x: 205, z: 140, r: 44, h: 28, color: 0x387a4a },
    { x: 225, z: 230, r: 46, h: 30, color: 0x255d37 },
    { x: 250, z: 320, r: 52, h: 34, color: 0x1e4a2c },
    { x: -170, z: -70, r: 40, h: 24, color: 0x2d6a3f },
    { x: -190, z: 70, r: 48, h: 30, color: 0x387a4a },
    { x: -180, z: 190, r: 44, h: 28, color: 0x255d37 },
    { x: -200, z: 310, r: 50, h: 32, color: 0x1e4a2c },
  ];

  hillPositions.forEach((pos) => {
    // Low-poly hemisphere dome for smooth organic Indian rolling hills
    const domeGeo = new THREE.SphereGeometry(pos.r, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    domeGeo.scale(1, pos.h / pos.r, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: pos.color,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    });
    const hillMesh = new THREE.Mesh(domeGeo, mat);
    hillMesh.position.set(pos.x, 0, pos.z);
    hills.add(hillMesh);
  });

  return hills;
}

/**
 * Builds floating interactive 3D badge above the building
 */
function buildInteractivePlotBadge(
  business: BusinessStorefront | null,
  isConstruction: boolean,
  isEmptyPlot: boolean
): THREE.Group {
  const badgeGroup = new THREE.Group();

  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;

  // Dark badge pill background
  ctx.fillStyle = "rgba(9, 13, 22, 0.94)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 292, 72, 18);
  ctx.fill();

  let borderColor = "#38bdf8";
  let title = "STOREFRONT";
  let sub = "VERIFIED";

  if (isEmptyPlot) {
    borderColor = "#f59e0b";
    title = "+ CLAIM FREE PLOT";
    sub = "START ONBOARDING";
  } else if (isConstruction) {
    borderColor = "#eab308";
    title = "UNDER CONSTRUCTION";
    sub = "OPENING SOON";
  } else if (business) {
    borderColor = business.is_verified ? "#10b981" : "#e11d48";
    title = business.name.length > 18 ? business.name.slice(0, 17) + "…" : business.name;
    sub = business.starting_price || "DIRECT WHATSAPP";
  }

  // Border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Title
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(title, 150, 36);

  // Subtitle / Price
  ctx.font = "600 18px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = borderColor;
  ctx.fillText(sub, 150, 62);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Use THREE.Sprite so the badge always faces the camera directly with no mirroring
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });

  const badgeSprite = new THREE.Sprite(spriteMat);
  badgeSprite.scale.set(7.5, 2.0, 1);
  badgeGroup.add(badgeSprite);

  return badgeGroup;
}

/**
 * Builds an authentic Indian street lamp post
 */
function buildStreetLamp(): THREE.Group {
  const lamp = new THREE.Group();

  const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 9, 8);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.6,
    metalness: 0.8,
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 4.5;
  lamp.add(pole);

  // Horizontal arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.14), poleMat);
  arm.position.set(0.8, 8.8, 0);
  lamp.add(arm);

  // Head
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.45, 8), poleMat);
  head.position.set(1.4, 8.6, 0);
  lamp.add(head);

  // Bulb
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  bulb.position.set(1.4, 8.35, 0);
  lamp.add(bulb);

  // Warm Amber Point Light
  const pointLight = new THREE.PointLight(0xf59e0b, 1.2, 26);
  pointLight.position.set(1.4, 8.2, 0);
  lamp.add(pointLight);

  return lamp;
}

/**
 * Builds welcome street arch
 */
function buildWelcomeArch(cityName: string): THREE.Group {
  const arch = new THREE.Group();
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.3,
  });

  // Pillars
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 13, 1.8), pillarMat);
  leftPillar.position.set(-10, 6.5, 0);
  arch.add(leftPillar);

  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 13, 1.8), pillarMat);
  rightPillar.position.set(10, 6.5, 0);
  arch.add(rightPillar);

  // Crossbeam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(24, 2.6, 2.2), pillarMat);
  beam.position.set(0, 12.5, 0);
  arch.add(beam);

  // Banner
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#e11d48";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.font = "bold 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${cityName.toUpperCase()} BAZAAR`, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 2.4),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  banner.position.set(0, 12.5, 1.15);
  arch.add(banner);

  return arch;
}

/**
 * Builds the Famous Indian Cutting Chai Stall
 */
function buildCuttingChaiStall(
  x: number,
  z: number
): { group: THREE.Group; hitBox: THREE.Mesh } {
  const stallGroup = new THREE.Group();
  stallGroup.position.set(x, 0, z);

  // Cart body
  const cartGeo = new THREE.BoxGeometry(3.2, 1.4, 2.2);
  const cartMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Sky blue Indian wooden cart
    roughness: 0.8,
  });
  const cartMesh = new THREE.Mesh(cartGeo, cartMat);
  cartMesh.position.y = 1.4;
  cartMesh.castShadow = true;
  stallGroup.add(cartMesh);

  // 4 Legs
  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
  [
    [-1.3, -0.9],
    [1.3, -0.9],
    [-1.3, 0.9],
    [1.3, 0.9],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, 0.35, lz);
    stallGroup.add(leg);
  });

  // 2 Large wheels
  const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.15, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
  const w1 = new THREE.Mesh(wheelGeo, wheelMat);
  w1.rotation.z = Math.PI / 2;
  w1.position.set(-1.65, 0.7, 0);
  stallGroup.add(w1);
  const w2 = new THREE.Mesh(wheelGeo, wheelMat);
  w2.rotation.z = Math.PI / 2;
  w2.position.set(1.65, 0.7, 0);
  stallGroup.add(w2);

  // Samovar / Brass Kettle
  const kettleGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.9, 10);
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Golden brass
    roughness: 0.35,
    metalness: 0.85,
  });
  const kettle = new THREE.Mesh(kettleGeo, brassMat);
  kettle.position.set(-0.6, 2.55, 0.2);
  stallGroup.add(kettle);

  // Glasses / Tumblers
  const glassGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.2, 8);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.75,
  });
  for (let gx = 0; gx < 3; gx++) {
    for (let gz = 0; gz < 2; gz++) {
      const g = new THREE.Mesh(glassGeo, glassMat);
      g.position.set(0.3 + gx * 0.22, 2.2, -0.4 + gz * 0.25);
      stallGroup.add(g);
    }
  }

  // Striped Awning Top
  const awningGeo = new THREE.ConeGeometry(2.4, 0.8, 4);
  const awningMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Warm marigold
    roughness: 0.8,
  });
  const awning = new THREE.Mesh(awningGeo, awningMat);
  awning.rotation.y = Math.PI / 4;
  awning.position.set(0, 3.8, 0);
  stallGroup.add(awning);

  // Canopy support poles
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
  [
    [-1.2, -0.8],
    [1.2, -0.8],
    [-1.2, 0.8],
    [1.2, 0.8],
  ].forEach(([px, pz]) => {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(px, 2.8, pz);
    stallGroup.add(pole);
  });

  // Floating billboarding badge sprite
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 292, 72, 18);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("☕ CUTTING CHAI", 150, 36);
  ctx.font = "600 18px ui-monospace, monospace";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("TAP FOR 2X SPEED", 150, 62);

  const tex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(0, 5.4, 0);
  sprite.scale.set(7.5, 2.0, 1);
  stallGroup.add(sprite);

  // Invisible hit box
  const hitGeo = new THREE.BoxGeometry(4.5, 5, 3.5);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  const hitBox = new THREE.Mesh(hitGeo, hitMat);
  hitBox.name = "landmark_chai_stall";
  hitBox.position.set(x, 2.5, z);

  return { group: stallGroup, hitBox };
}

/**
 * Builds the Riverside Community Cricket Pitch
 */
function buildCricketPitch(
  x: number,
  z: number
): { group: THREE.Group; hitBox: THREE.Mesh } {
  const pitchGroup = new THREE.Group();
  pitchGroup.position.set(x, 0, z);

  // 1. Clay / Turf Pitch Strip
  const pitchGeo = new THREE.PlaneGeometry(5, 24);
  const pitchMat = new THREE.MeshStandardMaterial({
    color: 0xc89666, // Light dusty clay pitch
    roughness: 0.95,
  });
  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.rotation.x = -Math.PI / 2;
  pitchMesh.position.y = 0.05;
  pitchMesh.receiveShadow = true;
  pitchGroup.add(pitchMesh);

  // 2. White Crease lines
  const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-9, 9].forEach((cz) => {
    const creaseGeo = new THREE.PlaneGeometry(4, 0.25);
    const crease = new THREE.Mesh(creaseGeo, creaseMat);
    crease.rotation.x = -Math.PI / 2;
    crease.position.set(0, 0.06, cz);
    pitchGroup.add(crease);
  });

  // 3. Wooden Stumps & Bails on both ends
  const stumpGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6);
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  [-9.5, 9.5].forEach((sz) => {
    [-0.2, 0, 0.2].forEach((sx) => {
      const stump = new THREE.Mesh(stumpGeo, stumpMat);
      stump.position.set(sx, 0.45, sz);
      pitchGroup.add(stump);
    });
  });

  // 4. Floating billboarding badge sprite
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 312, 72, 18);
  ctx.fill();
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("🏏 COMMUNITY CRICKET", 160, 36);
  ctx.font = "600 18px ui-monospace, monospace";
  ctx.fillStyle = "#34d399";
  ctx.fillText("HIT A SIX ACROSS RIVER!", 160, 62);

  const tex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(0, 4.2, 0);
  sprite.scale.set(8.2, 2.05, 1);
  pitchGroup.add(sprite);

  // Invisible hit box
  const hitGeo = new THREE.BoxGeometry(8, 5, 26);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  const hitBox = new THREE.Mesh(hitGeo, hitMat);
  hitBox.name = "landmark_cricket_pitch";
  hitBox.position.set(x, 2.5, z);

  return { group: pitchGroup, hitBox };
}
