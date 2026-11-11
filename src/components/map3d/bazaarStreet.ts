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

  // 1. Surrounding Landscape Ground (Lush Indian terrain around the town)
  const terrainGeo = new THREE.PlaneGeometry(360, streetLength + 160, 16, 16);
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x11231a, // Dark forest green
    roughness: 0.95,
    metalness: 0.05,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.set(0, 0.01, streetLength / 2 - plotSpacing);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 2. Scenic River along the town periphery (Brahmaputra / Ganga)
  const riverGeo = new THREE.PlaneGeometry(75, streetLength + 220);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x075985, // Deep river blue
    roughness: 0.15,
    metalness: 0.85,
  });
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.rotation.x = -Math.PI / 2;
  riverMesh.position.set(135, 0.02, streetLength / 2 - plotSpacing);
  group.add(riverMesh);

  // River Bank Sand Trim
  const bankGeo = new THREE.PlaneGeometry(8, streetLength + 220);
  const bankMat = new THREE.MeshStandardMaterial({
    color: 0x3f3629,
    roughness: 0.9,
  });
  const bankMesh = new THREE.Mesh(bankGeo, bankMat);
  bankMesh.rotation.x = -Math.PI / 2;
  bankMesh.position.set(94, 0.03, streetLength / 2 - plotSpacing);
  group.add(bankMesh);

  // 3. Background Rolling Low-Poly Hills
  const hillsGroup = buildBackgroundHills(streetLength);
  group.add(hillsGroup);

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
      const leftTree = buildLowPolyTree();
      leftTree.position.set(-(roadWidth / 2 + sidewalkWidth - 1.2), 0, z + 11);
      group.add(leftTree);

      const rightTree = buildLowPolyTree();
      rightTree.position.set(roadWidth / 2 + sidewalkWidth - 1.2, 0, z + 11);
      group.add(rightTree);
    }
  }

  // 11. Living Traffic Simulation (Auto-Rickshaws, Delivery Scooters, Cabs, Buses)
  const traffic = createTrafficSystem(streetLength);
  group.add(traffic.group);

  // 12. Living Pedestrians Simulation (Citizens & Shoppers walking)
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

/**
 * Builds low-poly Indian street trees (Neem / Banyan style)
 */
function buildLowPolyTree(): THREE.Group {
  const tree = new THREE.Group();

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
  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x144e32,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });

  const hillPositions = [
    { x: 170, z: -40, r: 28, h: 24 },
    { x: 190, z: 40, r: 36, h: 28 },
    { x: 165, z: 120, r: 32, h: 22 },
    { x: 185, z: 200, r: 34, h: 26 },
    { x: -130, z: -60, r: 26, h: 20 },
    { x: -150, z: 80, r: 34, h: 24 },
    { x: -140, z: 170, r: 30, h: 22 },
  ];

  hillPositions.forEach((pos) => {
    const coneGeo = new THREE.ConeGeometry(pos.r, pos.h, 7);
    const hillMesh = new THREE.Mesh(coneGeo, hillMat);
    hillMesh.position.set(pos.x, pos.h / 2, pos.z);
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
  const planeGeo = new THREE.PlaneGeometry(6.5, 1.8);
  const planeMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const badgeMesh = new THREE.Mesh(planeGeo, planeMat);
  badgeGroup.add(badgeMesh);

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
