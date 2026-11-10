import * as THREE from "three";
import { BusinessStorefront, City } from "@/types";
import {
  createRoadTexture,
  createSidewalkTexture,
  createNeonSignTexture,
  createWindowDisplayTexture,
} from "./streetTextures";
import { toWorld } from "./projection";

export interface BazaarStorefrontMesh extends THREE.Group {
  storefrontData: BusinessStorefront;
}

/**
 * Builds the complete 3D Bazaar High-Street & surrounding town environment
 * Inspired by indiaagain.live with scenic terrain, river, foliage, and modular shops
 */
export function buildBazaarStreet(
  city: City,
  storefronts: BusinessStorefront[]
): { group: THREE.Group; storefrontMeshes: BazaarStorefrontMesh[] } {
  const group = new THREE.Group();
  group.name = `bazaar_street_${city.slug}`;

  // Position street centered at city's 3D coordinates
  const [originX, originZ] = toWorld(city.lon, city.lat);
  group.position.set(originX, 4.6, originZ);

  const storefrontMeshes: BazaarStorefrontMesh[] = [];

  // Filter businesses in this city
  const cityStorefronts = storefronts.filter(
    (s) => s.city_name && s.city_name.toLowerCase() === city.name.toLowerCase()
  );

  // If fewer than 4 shops in this city, pad with showcase businesses
  const activeBusinesses =
    cityStorefronts.length >= 2
      ? cityStorefronts
      : [...cityStorefronts, ...storefronts.slice(0, Math.max(0, 4 - cityStorefronts.length))];

  const plotCount = Math.max(activeBusinesses.length, 6);
  const pairsCount = Math.ceil(plotCount / 2);
  const plotSpacing = 24;
  const streetLength = (pairsCount + 1) * plotSpacing;

  // 1. Surrounding Landscape Ground (Lush Indian terrain around the town)
  const terrainGeo = new THREE.PlaneGeometry(360, streetLength + 160, 32, 32);
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x11231a, // Rich dark forest green
    roughness: 0.95,
    metalness: 0.05,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.set(0, 0.01, streetLength / 2 - plotSpacing);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 2. Scenic River along the town periphery (like Brahmaputra for Guwahati, Ganga for Varanasi/Kolkata)
  const riverGeo = new THREE.PlaneGeometry(70, streetLength + 200);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x075985, // Deep river blue
    roughness: 0.15,
    metalness: 0.85,
  });
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.rotation.x = -Math.PI / 2;
  riverMesh.position.set(130, 0.02, streetLength / 2 - plotSpacing);
  riverMesh.receiveShadow = true;
  group.add(riverMesh);

  // River Bank Sand Trim
  const bankGeo = new THREE.PlaneGeometry(8, streetLength + 200);
  const bankMat = new THREE.MeshStandardMaterial({
    color: 0x3f3629, // Riverbank silt/sand
    roughness: 0.9,
  });
  const bankMesh = new THREE.Mesh(bankGeo, bankMat);
  bankMesh.rotation.x = -Math.PI / 2;
  bankMesh.position.set(92, 0.03, streetLength / 2 - plotSpacing);
  group.add(bankMesh);

  // 3. Background Rolling Low-Poly Hills (as seen in indiaagain.live Guwahati view)
  const hillsGroup = buildBackgroundHills(streetLength);
  group.add(hillsGroup);

  // 4. Central Asphalt Road
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

  // 5. Pedestrian Sidewalks (Left and Right)
  const sidewalkWidth = 8;
  const sidewalkGeo = new THREE.PlaneGeometry(sidewalkWidth, streetLength);
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: createSidewalkTexture(),
    roughness: 0.7,
    metalness: 0.2,
  });

  const leftSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  leftSidewalk.rotation.x = -Math.PI / 2;
  leftSidewalk.position.set(-(roadWidth / 2 + sidewalkWidth / 2), 0.08, streetLength / 2 - plotSpacing);
  leftSidewalk.receiveShadow = true;
  group.add(leftSidewalk);

  const rightSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  rightSidewalk.rotation.x = -Math.PI / 2;
  rightSidewalk.position.set(roadWidth / 2 + sidewalkWidth / 2, 0.08, streetLength / 2 - plotSpacing);
  rightSidewalk.receiveShadow = true;
  group.add(rightSidewalk);

  // 6. Welcome Street Arch
  const archGroup = buildWelcomeArch(city.name);
  archGroup.position.set(0, 0, -plotSpacing * 0.4);
  group.add(archGroup);

  // 7. Construct Storefronts along the street
  for (let i = 0; i < activeBusinesses.length; i++) {
    const business = activeBusinesses[i];
    const isLeft = i % 2 === 0;
    const pairIndex = Math.floor(i / 2);
    const zPos = pairIndex * plotSpacing + plotSpacing * 0.5;

    const bldgWidth = 15;
    const bldgHeight = 16;
    const bldgDepth = 14;

    const shopGroup = new THREE.Group() as BazaarStorefrontMesh;
    shopGroup.storefrontData = business;

    // Building Position
    const xPos = isLeft
      ? -(roadWidth / 2 + sidewalkWidth + bldgDepth / 2)
      : roadWidth / 2 + sidewalkWidth + bldgDepth / 2;
    shopGroup.position.set(xPos, bldgHeight / 2, zPos);
    // Face the street
    shopGroup.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;

    // Main Building Structure
    const bldgGeo = new THREE.BoxGeometry(bldgWidth, bldgHeight, bldgDepth);
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x141b26, // Sleek architectural obsidian
      roughness: 0.75,
      metalness: 0.2,
    });
    const bldgMesh = new THREE.Mesh(bldgGeo, bldgMat);
    bldgMesh.castShadow = true;
    bldgMesh.receiveShadow = true;
    shopGroup.add(bldgMesh);

    // Front Glass Facade
    const glassGeo = new THREE.PlaneGeometry(bldgWidth - 1, bldgHeight - 2);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      roughness: 0.3,
      metalness: 0.6,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, 0, bldgDepth / 2 + 0.05);
    shopGroup.add(glassMesh);

    // Awning Canopy
    const awningGeo = new THREE.BoxGeometry(bldgWidth - 2, 0.4, 3.5);
    const awningMat = new THREE.MeshStandardMaterial({
      color: business.is_featured ? 0xe11d48 : 0x0284c7, // Crimson or Sapphire awning
      roughness: 0.5,
      metalness: 0.2,
    });
    const awningMesh = new THREE.Mesh(awningGeo, awningMat);
    awningMesh.position.set(0, 2, bldgDepth / 2 + 1.8);
    awningMesh.rotation.x = 0.15; // Subtle tilt downward
    shopGroup.add(awningMesh);

    // Illuminated Neon Signboard
    const signTex = createNeonSignTexture(business, business.is_featured);
    const signGeo = new THREE.PlaneGeometry(12, 3);
    const signMat = new THREE.MeshBasicMaterial({
      map: signTex,
      transparent: true,
    });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, 4.8, bldgDepth / 2 + 0.2);
    shopGroup.add(signMesh);

    // Shop Window Portfolio Display (Backlit)
    const coverPhoto = business.portfolio?.[0]?.image_url || business.logo_url;
    const windowTex = createWindowDisplayTexture(coverPhoto);
    const windowGeo = new THREE.PlaneGeometry(8, 6);
    const windowMat = new THREE.MeshBasicMaterial({
      map: windowTex,
      transparent: true,
    });
    const windowMesh = new THREE.Mesh(windowGeo, windowMat);
    windowMesh.position.set(-2, -2, bldgDepth / 2 + 0.15);
    shopGroup.add(windowMesh);

    // Entrance Glass Door
    const doorGeo = new THREE.PlaneGeometry(3.5, 7);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.8,
    });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(4, -2.5, bldgDepth / 2 + 0.15);
    shopGroup.add(doorMesh);

    // Floating 3D Badge (Rates / Verified) over roof
    const badgeMesh = buildFloatingShopBadge(business);
    badgeMesh.position.set(0, bldgHeight / 2 + 2, 0);
    shopGroup.add(badgeMesh);

    // Raycasting Target Box (Transparent so Raycaster detects it reliably)
    const hitGeo = new THREE.BoxGeometry(bldgWidth + 2, bldgHeight + 4, bldgDepth + 4);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.name = "storefront_hit_target";
    shopGroup.add(hitBox);

    group.add(shopGroup);
    storefrontMeshes.push(shopGroup);
  }

  // 8. Street Lamps & Trees along both sidewalks
  for (let z = 0; z < streetLength; z += plotSpacing) {
    // Lamps
    const leftLamp = buildStreetLamp();
    leftLamp.position.set(-(roadWidth / 2 + 1.5), 0, z);
    group.add(leftLamp);

    const rightLamp = buildStreetLamp();
    rightLamp.position.set(roadWidth / 2 + 1.5, 0, z);
    rightLamp.rotation.y = Math.PI;
    group.add(rightLamp);

    // Trees (placed slightly behind lamp along curb)
    if (z + 12 < streetLength) {
      const leftTree = buildLowPolyTree();
      leftTree.position.set(-(roadWidth / 2 + sidewalkWidth - 1.5), 0, z + 12);
      group.add(leftTree);

      const rightTree = buildLowPolyTree();
      rightTree.position.set(roadWidth / 2 + sidewalkWidth - 1.5, 0, z + 12);
      group.add(rightTree);
    }
  }

  return { group, storefrontMeshes };
}

/**
 * Builds low-poly Indian neem / banyan style street trees
 */
function buildLowPolyTree(): THREE.Group {
  const tree = new THREE.Group();

  // Wood Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 6, 6);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.9,
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 3;
  trunk.castShadow = true;
  tree.add(trunk);

  // Stylized Foliage Clusters
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Lush emerald tree green
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
  });

  const mainCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 1), leafMat);
  mainCrown.position.y = 6.8;
  mainCrown.castShadow = true;
  tree.add(mainCrown);

  const topCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), leafMat);
  topCrown.position.set(0.3, 8.6, -0.2);
  topCrown.castShadow = true;
  tree.add(topCrown);

  return tree;
}

/**
 * Builds background rolling low-poly hills (as seen in indiaagain.live Guwahati vista)
 */
function buildBackgroundHills(streetLength: number): THREE.Group {
  const hills = new THREE.Group();
  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x164e32, // Distant green hill shade
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });

  // Series of low-poly rolling hills behind the river
  const hillPositions = [
    { x: 160, z: -40, r: 28, h: 22 },
    { x: 180, z: 40, r: 35, h: 26 },
    { x: 155, z: 110, r: 30, h: 20 },
    { x: 175, z: 180, r: 32, h: 24 },
    { x: -120, z: -60, r: 26, h: 18 },
    { x: -140, z: 80, r: 32, h: 22 },
    { x: -130, z: 160, r: 28, h: 19 },
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
 * Builds a floating 3D badge above the building
 */
function buildFloatingShopBadge(business: BusinessStorefront): THREE.Group {
  const badgeGroup = new THREE.Group();

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext("2d")!;

  // Dark badge pill background
  ctx.fillStyle = "rgba(10, 15, 26, 0.92)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 64, 16);
  ctx.fill();

  ctx.strokeStyle = business.is_verified ? "#10b981" : "#f59e0b";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Price or Verification text
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const label = business.is_verified
    ? `✓ ${business.starting_price || "VERIFIED"}`
    : business.starting_price || "OPEN NOW";

  ctx.fillText(label, 128, 36);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const planeGeo = new THREE.PlaneGeometry(6, 1.8);
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
 * Builds a modern Indian street lamp post
 */
function buildStreetLamp(): THREE.Group {
  const lamp = new THREE.Group();

  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 10, 8);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.6,
    metalness: 0.8,
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 5;
  lamp.add(pole);

  // Horizontal arm
  const armGeo = new THREE.BoxGeometry(1.8, 0.15, 0.15);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.set(0.9, 9.8, 0);
  lamp.add(arm);

  // Lamp Head
  const headGeo = new THREE.ConeGeometry(0.6, 0.5, 8);
  const head = new THREE.Mesh(headGeo, poleMat);
  head.position.set(1.6, 9.6, 0);
  lamp.add(head);

  // Light Bulb (Warm Amber)
  const bulbGeo = new THREE.SphereGeometry(0.25, 8, 8);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(1.6, 9.3, 0);
  lamp.add(bulb);

  // Local Point Light (Warm Street Glow)
  const pointLight = new THREE.PointLight(0xf59e0b, 1.2, 28);
  pointLight.position.set(1.6, 9.1, 0);
  lamp.add(pointLight);

  return lamp;
}

/**
 * Builds a modern street entrance welcome arch
 */
function buildWelcomeArch(cityName: string): THREE.Group {
  const arch = new THREE.Group();

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.3,
  });

  // Left & Right Pillars
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 2), pillarMat);
  leftPillar.position.set(-11, 7, 0);
  arch.add(leftPillar);

  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 2), pillarMat);
  rightPillar.position.set(11, 7, 0);
  arch.add(rightPillar);

  // Overhead Crossbeam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 3, 2.5), pillarMat);
  beam.position.set(0, 13.5, 0);
  arch.add(beam);

  // Welcome Sign Banner
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = "#e11d48";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.font = "bold 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${cityName.toUpperCase()} BAZAAR`, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  const bannerGeo = new THREE.PlaneGeometry(22, 2.8);
  const bannerMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 13.5, 1.3);
  arch.add(banner);

  return arch;
}
