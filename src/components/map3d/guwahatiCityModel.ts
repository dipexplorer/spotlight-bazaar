import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BusinessStorefront } from "@/types";
import { buildCartoonStorefrontPlot, StorefrontMeshResult } from "./cartoonStorefront";
import { createRoadTexture, createSidewalkTexture, createStripedCurbTexture } from "./streetTextures";

export interface ColonyDefinition {
  name: string;
  pincode: string;
  zone: string;
  x: number;
  z: number;
  description: string;
}

export const GUWAHATI_COLONIES: ColonyDefinition[] = [
  {
    name: "GS Road & Christian Basti",
    pincode: "781005",
    zone: "Modern Commercial Flagship",
    x: 60,
    z: 15,
    description: "Flagship business boulevard & home of Nerqiva Studio",
  },
  {
    name: "Pan Bazar Riverfront",
    pincode: "781001",
    zone: "Commercial Heritage Hub",
    x: -25,
    z: -24,
    description: "Brahmaputra riverfront, Cotton University & historic publishing district",
  },
  {
    name: "Uzan Bazar Lakefront",
    pincode: "781004",
    zone: "Lakeside Cultural District",
    x: 65,
    z: -10,
    description: "Dighalipukhuri heritage lake, Assam State Museum & artisanal cafes",
  },
  {
    name: "Paltan Bazar & Station Road",
    pincode: "781008",
    zone: "Transit & Wholesale Hub",
    x: 15,
    z: 45,
    description: "Guwahati Railway Junction, transit hub & commercial trading center",
  },
  {
    name: "Dispur Secretariat Avenue",
    pincode: "781006",
    zone: "Capital Commercial District",
    x: 160,
    z: 140,
    description: "Government Secretariat, tea auction center & premier retail",
  },
  {
    name: "Jalukbari & Saraighat Bridge",
    pincode: "781014",
    zone: "University & Gateway Hub",
    x: -130,
    z: 45,
    description: "Gateway rotary, Gauhati University & Saraighat Bridge approach",
  },
  {
    name: "Chandmari & Zoo Road",
    pincode: "781003",
    zone: "Media & Commercial Arts Hub",
    x: 175,
    z: 15,
    description: "Assam State Zoo, media houses & premier shopping promenade",
  },
  {
    name: "Ganeshguri Commercial Center",
    pincode: "781005",
    zone: "Central Flyover Retail District",
    x: 125,
    z: 90,
    description: "Ganeshguri flyover junction, lifestyle retail & vibrant eateries",
  },
];

export interface GuwahatiCityResult {
  group: THREE.Group;
  hitBoxes: THREE.Mesh[];
  plots: StorefrontMeshResult[];
  colonies: ColonyDefinition[];
  update: (delta: number) => void;
  dispose: () => void;
}

/**
 * Organic parametric S-curve of the Brahmaputra South Bank at Guwahati.
 * Traces through Saraighat gorge (x = -130, z = -29), Bharalumukh (x = -60, z = -26),
 * Pan Bazar (x = -25, z = -24), Uzan Bazar (x = 65, z = -26), and Kharghuli (x = 180, z = -32).
 */
export function getRiverSouthBankZ(x: number): number {
  const baseCurve = -26.0 + Math.sin((x + 50) * 0.005) * 5.0;
  const eastBend = Math.max(0, (x - 80) * 0.045);
  const westBend = Math.max(0, (-100 - x) * 0.035);
  return baseCurve - eastBend - westBend;
}

/**
 * Organic parametric curve of the Brahmaputra North Bank across from Guwahati.
 * Forms the northern shoreline passing through Saraighat North (x = -130, z = -149),
 * Amingaon (x = 60, z = -147), and Dirgheswari / IIT approach (x = 180, z = -153).
 */
export function getRiverNorthBankZ(x: number): number {
  const baseCurve = -148.0 + Math.cos((x - 20) * 0.005) * 6.0;
  const eastBend = Math.max(0, (x - 80) * 0.04);
  const westBend = Math.max(0, (-100 - x) * 0.03);
  return baseCurve - eastBend - westBend;
}

/**
 * Builds the complete, geographically accurate 3D city of Guwahati:
 * - Expansive natural Assam valley terrain (3600 x 3200) with seamless downward horizon skirt
 * - Majestic curving Brahmaputra River following authentic geography
 * - Umananda (Peacock Island) with its golden temple spire and natural river sandbars (chars)
 * - Deepor Beel wetland lake in southwest & Dighalipukhuri heritage lake in Uzan Bazar
 * - Continuous Bharalu urban stream flowing from southern foothills into the Brahmaputra
 * - Iconic 3D Saraighat Double-Deck Truss Bridge bridging South and North Guwahati
 * - Fully interconnected road network (MG Road, AT Road, GS Road, Zoo Road, GNB Road, North Highway)
 * - Flagship Nerqiva Studio at GS Road, Christian Basti (PIN 781005)
 * - Zero filler houses: strictly authentic verified businesses and official claimable plots
 * - Calibrated peaceful traffic (Auto, ASTC bus, Sedan, City bus) cruising road waypoints
 */
export function buildGuwahatiCity(
  storefronts: BusinessStorefront[]
): GuwahatiCityResult {
  const group = new THREE.Group();
  group.name = "guwahati_city_system";

  const hitBoxes: THREE.Mesh[] = [];
  const plots: StorefrontMeshResult[] = [];
  const disposables: { dispose: () => void }[] = [];

  // Filter storefronts active in Guwahati
  const guwahatiStorefronts = storefronts.filter(
    (s) => !s?.city_name || s.city_name.toLowerCase() === "guwahati"
  );

  // 1. EXPANSIVE ASSAM VALLEY NATURAL TERRAIN (3600 x 3200)
  const terrainWidth = 3600;
  const terrainHeight = 3200;
  const segX = 120;
  const segZ = 100;
  const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainHeight, segX, segZ);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const radialDist = Math.hypot(x, z);

    const zS = getRiverSouthBankZ(x);
    const zN = getRiverNorthBankZ(x);

    let elev = 0;

    // A. Brahmaputra River Basin depression along the north
    if (z >= zN - 6 && z <= zS + 6 && Math.abs(x) < 1750) {
      elev = -0.95; // River water level sits cleanly at Y = 0.04
    } else if (x >= -280 && x <= 260 && z >= zS + 4 && z <= 175) {
      // B. Urban City Corridor: STRICTLY FLAT at Y = 0.0!
      elev = 0.0;
    } else {
      // C. Surrounding Natural Hills (Strictly OUTSIDE the road network)
      // 1. Nilachal / Kamakhya Hills in the West (X < -220, Z: -20 to 110)
      const distKamakhya = Math.hypot(x - -280, z - 25);
      if (distKamakhya < 140) {
        const kFactor = (1 + Math.cos((distKamakhya / 140) * Math.PI)) * 0.5;
        elev = Math.max(elev, kFactor * 58);
      }
      const distKamakhya2 = Math.hypot(x - -230, z - 80);
      if (distKamakhya2 < 105) {
        const kFactor2 = (1 + Math.cos((distKamakhya2 / 105) * Math.PI)) * 0.5;
        elev = Math.max(elev, kFactor2 * 42);
      }

      // 2. Meghalaya / Khasi Foothills in the South (Z > 175)
      if (z > 175) {
        const southGrad = Math.min((z - 175) / 450, 1.0);
        elev = Math.max(elev, southGrad * southGrad * 62 + Math.sin(x * 0.012) * 8);
      }

      // 3. Sarania, Kharghuli & Narengi Hills in the East (X > 240)
      const distSarania = Math.hypot(x - 290, z - 45);
      if (distSarania < 115) {
        const sFactor = (1 + Math.cos((distSarania / 115) * Math.PI)) * 0.5;
        elev = Math.max(elev, sFactor * 38);
      }
      const distKharghuli = Math.hypot(x - 220, z - -30);
      if (distKharghuli < 95) {
        const khFactor = (1 + Math.cos((distKharghuli / 95) * Math.PI)) * 0.5;
        elev = Math.max(elev, khFactor * 46);
      }

      // 4. North Guwahati Rolling Dome Hills across the Brahmaputra (Z < zN - 15)
      if (z < zN - 15) {
        const northGrad = Math.min((zN - 15 - z) / 450, 1.0);
        elev = northGrad * northGrad * 32;

        const domeHills = [
          { cx: -240, cz: -230, r: 120, h: 58 },
          { cx: -110, cz: -250, r: 130, h: 68 },
          { cx: 50, cz: -235, r: 125, h: 64 },
          { cx: 200, cz: -220, r: 115, h: 56 },
          { cx: 340, cz: -240, r: 110, h: 52 },
        ];
        for (const dh of domeHills) {
          const d = Math.hypot(x - dh.cx, z - dh.cz);
          if (d < dh.r) {
            const factor = (1 + Math.cos((d / dh.r) * Math.PI)) * 0.5;
            elev = Math.max(elev, factor * dh.h);
          }
        }
      }
    }

    // D. Outer Horizon Skirt: Curves down into horizon fog to eliminate square plane corners
    if (radialDist > 1250) {
      const skirtFactor = Math.min((radialDist - 1250) / 400, 1.0);
      elev = elev * (1 - skirtFactor) - skirtFactor * 18.0;
    }

    posAttr.setY(i, elev);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x247a3e, // Lush Assam Valley emerald green
    roughness: 0.88,
    metalness: 0.04,
    flatShading: false,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 2. THE MAJESTIC CURVING BRAHMAPUTRA RIVER
  const riverSteps = 120;
  const riverXMin = -1800;
  const riverXMax = 1800;
  const riverGeo = new THREE.BufferGeometry();
  const riverPositions: number[] = [];
  const riverUVs: number[] = [];
  const riverIndices: number[] = [];

  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zS = getRiverSouthBankZ(rx);
    const zN = getRiverNorthBankZ(rx);

    riverPositions.push(rx, 0.04, zS);
    riverUVs.push(u, 0);

    riverPositions.push(rx, 0.04, zN);
    riverUVs.push(u, 1);
  }

  for (let s = 0; s < riverSteps; s++) {
    const p0 = s * 2;
    const p1 = s * 2 + 1;
    const p2 = (s + 1) * 2;
    const p3 = (s + 1) * 2 + 1;

    riverIndices.push(p0, p2, p1);
    riverIndices.push(p1, p2, p3);
  }

  riverGeo.setAttribute("position", new THREE.Float32BufferAttribute(riverPositions, 3));
  riverGeo.setAttribute("uv", new THREE.Float32BufferAttribute(riverUVs, 2));
  riverGeo.setIndex(riverIndices);
  riverGeo.computeVertexNormals();

  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Reflective deep sky blue river water
    roughness: 0.16,
    metalness: 0.38,
    transparent: true,
    opacity: 0.94,
  });
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.receiveShadow = true;
  group.add(riverMesh);
  disposables.push(riverGeo, riverMat);

  // Sandy Riverbanks
  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xf1dfaa, // Golden silt river sand
    roughness: 0.92,
  });
  disposables.push(beachMat);

  // South Beach Ribbon (Width: 12m)
  const southBeachGeo = new THREE.BufferGeometry();
  const southBeachPos: number[] = [];
  const southBeachUVs: number[] = [];
  const southBeachIdx: number[] = [];

  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zS = getRiverSouthBankZ(rx);

    southBeachPos.push(rx, 0.048, zS);
    southBeachUVs.push(u, 0);

    southBeachPos.push(rx, 0.05, zS + 12.0);
    southBeachUVs.push(u, 1);
  }

  for (let s = 0; s < riverSteps; s++) {
    const p0 = s * 2;
    const p1 = s * 2 + 1;
    const p2 = (s + 1) * 2;
    const p3 = (s + 1) * 2 + 1;

    southBeachIdx.push(p0, p2, p1);
    southBeachIdx.push(p1, p2, p3);
  }

  southBeachGeo.setAttribute("position", new THREE.Float32BufferAttribute(southBeachPos, 3));
  southBeachGeo.setAttribute("uv", new THREE.Float32BufferAttribute(southBeachUVs, 2));
  southBeachGeo.setIndex(southBeachIdx);
  southBeachGeo.computeVertexNormals();

  const southBeach = new THREE.Mesh(southBeachGeo, beachMat);
  southBeach.receiveShadow = true;
  group.add(southBeach);
  disposables.push(southBeachGeo);

  // North Beach Ribbon (Width: 14m)
  const northBeachGeo = new THREE.BufferGeometry();
  const northBeachPos: number[] = [];
  const northBeachUVs: number[] = [];
  const northBeachIdx: number[] = [];

  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zN = getRiverNorthBankZ(rx);

    northBeachPos.push(rx, 0.05, zN - 14.0);
    northBeachUVs.push(u, 0);

    northBeachPos.push(rx, 0.048, zN);
    northBeachUVs.push(u, 1);
  }

  for (let s = 0; s < riverSteps; s++) {
    const p0 = s * 2;
    const p1 = s * 2 + 1;
    const p2 = (s + 1) * 2;
    const p3 = (s + 1) * 2 + 1;

    northBeachIdx.push(p0, p2, p1);
    northBeachIdx.push(p1, p2, p3);
  }

  northBeachGeo.setAttribute("position", new THREE.Float32BufferAttribute(northBeachPos, 3));
  northBeachGeo.setAttribute("uv", new THREE.Float32BufferAttribute(northBeachUVs, 2));
  northBeachGeo.setIndex(northBeachIdx);
  northBeachGeo.computeVertexNormals();

  const northBeach = new THREE.Mesh(northBeachGeo, beachMat);
  northBeach.receiveShadow = true;
  group.add(northBeach);
  disposables.push(northBeachGeo);

  // 3. PEACOCK ISLAND (UMANANDA) & RIVER SANDBARS (CHARS)
  const umanandaGroup = new THREE.Group();
  umanandaGroup.name = "umananda_peacock_island";

  const rockGeo = new THREE.CylinderGeometry(14, 18, 2.4, 14);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Weathered grey Brahmaputra granite
    roughness: 0.94,
    flatShading: true,
  });
  const rockMesh = new THREE.Mesh(rockGeo, rockMat);
  rockMesh.position.set(55, 0.9, -96);
  rockMesh.receiveShadow = true;
  umanandaGroup.add(rockMesh);

  const islandBeachGeo = new THREE.RingGeometry(14, 21, 16);
  islandBeachGeo.rotateX(-Math.PI / 2);
  const islandBeach = new THREE.Mesh(islandBeachGeo, beachMat);
  islandBeach.position.set(55, 0.06, -96);
  umanandaGroup.add(islandBeach);

  const templeSanctumGeo = new THREE.BoxGeometry(4.2, 3.6, 4.2);
  const templeSanctumMat = new THREE.MeshStandardMaterial({
    color: 0xb45309, // Terracotta temple stone
    roughness: 0.75,
  });
  const templeSanctum = new THREE.Mesh(templeSanctumGeo, templeSanctumMat);
  templeSanctum.position.set(55, 3.2, -96);
  templeSanctum.castShadow = true;
  umanandaGroup.add(templeSanctum);

  const spireGeo = new THREE.ConeGeometry(2.0, 5.5, 8);
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Radiant golden amber
    metalness: 0.65,
    roughness: 0.35,
  });
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(55, 7.5, -96);
  spire.castShadow = true;
  umanandaGroup.add(spire);

  const islandTreeGeo = new THREE.DodecahedronGeometry(1.6, 0);
  const islandTreeMat = new THREE.MeshStandardMaterial({
    color: 0x14532d, // Deep temple grove emerald
    roughness: 0.9,
    flatShading: true,
  });
  for (const [tx, tz] of [
    [-6, -4],
    [-7, 5],
    [5, -6],
    [6, 5],
    [-4, 8],
    [7, 1],
  ]) {
    const tMesh = new THREE.Mesh(islandTreeGeo, islandTreeMat);
    tMesh.position.set(55 + tx, 2.8, -96 + tz);
    tMesh.scale.set(1.1, 1.3, 1.1);
    tMesh.castShadow = true;
    umanandaGroup.add(tMesh);
  }

  group.add(umanandaGroup);
  disposables.push(rockGeo, rockMat, islandBeachGeo, templeSanctumGeo, templeSanctumMat, spireGeo, spireMat, islandTreeGeo, islandTreeMat);

  // Natural River Sandbars (Chars / Alluvial sandbanks)
  const sandbarMat = new THREE.MeshStandardMaterial({ color: 0xeadbb6, roughness: 0.9 });
  disposables.push(sandbarMat);

  const char1Geo = new THREE.CylinderGeometry(26, 34, 0.4, 16);
  char1Geo.scale(2.2, 1, 0.65);
  const char1 = new THREE.Mesh(char1Geo, sandbarMat);
  char1.position.set(-40, 0.1, -88);
  char1.rotation.y = 0.06;
  group.add(char1);

  const char2Geo = new THREE.CylinderGeometry(20, 26, 0.4, 14);
  char2Geo.scale(2.0, 1, 0.55);
  const char2 = new THREE.Mesh(char2Geo, sandbarMat);
  char2.position.set(-260, 0.1, -94);
  char2.rotation.y = -0.04;
  group.add(char2);
  disposables.push(char1Geo, char2Geo);

  // 4. WATER BODIES: DEEPOR BEEL WETLAND & DIGHALIPUKHURI HERITAGE LAKE
  // A. Deepor Beel Wetland Lake (Southwest Guwahati, natural elliptical wetland)
  const beelGeo = new THREE.CylinderGeometry(55, 65, 0.4, 24);
  beelGeo.scale(1.2, 1.0, 0.65);
  const beelMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Deep wetland sky reflection
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.92,
  });
  const beelMesh = new THREE.Mesh(beelGeo, beelMat);
  beelMesh.position.set(-190, 0.05, 115);
  beelMesh.rotation.y = 0.15;
  group.add(beelMesh);

  // Deepor Beel Marshy Wetland Shore (Zero sharp corners)
  const beelShoreGeo = new THREE.CylinderGeometry(62, 74, 0.3, 24);
  beelShoreGeo.scale(1.2, 1.0, 0.65);
  const beelShoreMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Lush marshy wetland reeds & embankment
    roughness: 0.92,
  });
  const beelShore = new THREE.Mesh(beelShoreGeo, beelShoreMat);
  beelShore.position.set(-190, 0.04, 115);
  beelShore.rotation.y = 0.15;
  group.add(beelShore);
  disposables.push(beelGeo, beelMat, beelShoreGeo, beelShoreMat);

  // B. Dighalipukhuri Heritage Lake (Uzan Bazar / Heritage District, 54m x 22m)
  const lakeW = 54;
  const lakeL = 22;
  const lakeGeo = new THREE.PlaneGeometry(lakeW, lakeL);
  lakeGeo.rotateX(-Math.PI / 2);
  const lakeMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9, // Reflective cyan-blue lake water
    roughness: 0.12,
    metalness: 0.32,
    transparent: true,
    opacity: 0.94,
  });
  const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
  lakeMesh.position.set(65, 0.05, -10);
  group.add(lakeMesh);

  const lakeBorderGeo = new THREE.PlaneGeometry(lakeW + 6, lakeL + 6);
  lakeBorderGeo.rotateX(-Math.PI / 2);
  const lakeBorderMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1, // Paved stone jogging path
    roughness: 0.82,
  });
  const lakeBorder = new THREE.Mesh(lakeBorderGeo, lakeBorderMat);
  lakeBorder.position.set(65, 0.045, -10);
  group.add(lakeBorder);
  disposables.push(lakeGeo, lakeMat, lakeBorderGeo, lakeBorderMat);

  // 5. CONTINUOUS BHARALU URBAN STREAM (Winding from southern foothills into Brahmaputra)
  const canalPoints: [number, number][] = [
    [70, 165],   // Southern Foothills origin
    [95, 130],   // Dispur / Bhangagarh upstream
    [45, 80],    // Arya Nagar
    [0, 55],     // South Paltan
    [-30, 48],   // AT Road approach
    [-60, 45],   // Bharalumukh South
    [-58, 12],   // Mid canal
    [-60, -26],  // Discharge into Brahmaputra River at Bharalumukh
  ];
  const canalMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  disposables.push(canalMat);

  for (let c = 0; c < canalPoints.length - 1; c++) {
    const p1 = canalPoints[c];
    const p2 = canalPoints[c + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const cGeo = new THREE.PlaneGeometry(6.5, len + 0.5);
    cGeo.rotateX(-Math.PI / 2);
    cGeo.rotateY(angle);
    const cMesh = new THREE.Mesh(cGeo, canalMat);
    cMesh.position.set((p1[0] + p2[0]) / 2, 0.04, (p1[1] + p2[1]) / 2);
    group.add(cMesh);
    disposables.push(cGeo);
  }

  // 6. SARAIGHAT BRIDGE (Iconic Double-Deck Steel Truss Bridge across Brahmaputra)
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = "saraighat_bridge";

  const bridgeX = -130;
  const bridgeDeckW = 9.4;
  const bridgeDeckL = 120; // River span from Z = -29 to Z = -149
  const bridgeDeckY = 4.8;

  const bridgeDeckMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Asphalt & concrete slate
    roughness: 0.72,
    metalness: 0.2,
  });
  const trussMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c, // Classic Indian red-primer steel truss
    metalness: 0.45,
    roughness: 0.55,
  });
  const pierMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Weathered concrete slate
    roughness: 0.88,
  });

  // Main Bridge Road Deck
  const bridgeDeckGeo = new THREE.BoxGeometry(bridgeDeckW, 1.2, bridgeDeckL);
  const bridgeDeck = new THREE.Mesh(bridgeDeckGeo, bridgeDeckMat);
  bridgeDeck.position.set(bridgeX, bridgeDeckY - 0.6, -89);
  bridgeDeck.receiveShadow = true;
  bridgeDeck.castShadow = true;
  bridgeGroup.add(bridgeDeck);

  // 6 Heavy Concrete Caisson Piers deep in Riverbed
  for (const pz of [-44, -64, -84, -104, -124, -144]) {
    const pierGeo = new THREE.CylinderGeometry(2.8, 3.6, 12.0, 16);
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.set(bridgeX, 1.0, pz);
    pier.receiveShadow = true;
    bridgeGroup.add(pier);
  }

  // South & North Concrete Abutment Portal Towers
  for (const portalZ of [-29, -149]) {
    for (const side of [-1, 1]) {
      const postGeo = new THREE.BoxGeometry(1.6, 8.5, 3.2);
      const post = new THREE.Mesh(postGeo, pierMat);
      post.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.6), 4.25, portalZ);
      post.castShadow = true;
      bridgeGroup.add(post);
    }
    const lintelGeo = new THREE.BoxGeometry(bridgeDeckW + 3.0, 1.6, 3.2);
    const lintel = new THREE.Mesh(lintelGeo, pierMat);
    lintel.position.set(bridgeX, 8.8, portalZ);
    bridgeGroup.add(lintel);
  }

  // Steel Truss Superstructure running strictly between South & North Abutments
  for (const side of [-1, 1]) {
    const trussBarGeo = new THREE.BoxGeometry(0.5, 4.4, bridgeDeckL);
    const truss = new THREE.Mesh(trussBarGeo, trussMat);
    truss.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.25), bridgeDeckY + 2.2, -89);
    truss.castShadow = true;
    bridgeGroup.add(truss);

    for (let bz = -141; bz <= -37; bz += 12) {
      const topBeamGeo = new THREE.BoxGeometry(bridgeDeckW + 0.6, 0.45, 0.45);
      const topBeam = new THREE.Mesh(topBeamGeo, trussMat);
      topBeam.position.set(bridgeX, bridgeDeckY + 4.4, bz);
      bridgeGroup.add(topBeam);
    }
  }

  // South Approach Ramp (Connecting Bridge Deck Z = -29, Y = 4.8 down to Ground Road Z = -8, Y = 0.32)
  const rampSouthLen = 21.0;
  const rampAngle = Math.atan2(bridgeDeckY - 0.32, rampSouthLen);
  const rampSouthGeo = new THREE.BoxGeometry(bridgeDeckW, 0.8, rampSouthLen + 0.5);
  rampSouthGeo.rotateX(-rampAngle);
  const rampSouth = new THREE.Mesh(rampSouthGeo, bridgeDeckMat);
  rampSouth.position.set(bridgeX, (bridgeDeckY + 0.32) / 2 - 0.1, -18.5);
  rampSouth.receiveShadow = true;
  bridgeGroup.add(rampSouth);

  // South Ramp Retaining Side Walls
  for (const side of [-1, 1]) {
    const wallGeo = new THREE.BoxGeometry(0.8, 1.8, rampSouthLen);
    wallGeo.rotateX(-rampAngle);
    const wall = new THREE.Mesh(wallGeo, pierMat);
    wall.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.4), (bridgeDeckY + 0.32) / 2 + 0.4, -18.5);
    bridgeGroup.add(wall);
  }

  // North Approach Ramp (Connecting Bridge Deck Z = -149, Y = 4.8 down to North Highway Z = -170, Y = 0.32)
  const rampNorthGeo = new THREE.BoxGeometry(bridgeDeckW, 0.8, rampSouthLen + 0.5);
  rampNorthGeo.rotateX(rampAngle);
  const rampNorth = new THREE.Mesh(rampNorthGeo, bridgeDeckMat);
  rampNorth.position.set(bridgeX, (bridgeDeckY + 0.32) / 2 - 0.1, -159.5);
  rampNorth.receiveShadow = true;
  bridgeGroup.add(rampNorth);

  // North Ramp Retaining Side Walls
  for (const side of [-1, 1]) {
    const wallGeo = new THREE.BoxGeometry(0.8, 1.8, rampSouthLen);
    wallGeo.rotateX(rampAngle);
    const wall = new THREE.Mesh(wallGeo, pierMat);
    wall.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.4), (bridgeDeckY + 0.32) / 2 + 0.4, -159.5);
    bridgeGroup.add(wall);
  }

  group.add(bridgeGroup);
  disposables.push(bridgeDeckGeo, bridgeDeckMat, pierMat, trussMat);

  // 7. FULLY CONNECTED SOLID 3D ROAD NETWORK (Authentic Guwahati Grid)
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark Asphalt slate
    roughness: 0.82,
    metalness: 0.08,
  });
  disposables.push(roadMat);

  interface RoadDef {
    x1: number;
    z1: number;
    x2: number;
    z2: number;
    width: number;
    name: string;
  }

  const roads: RoadDef[] = [
    // 1. MG Road (Brahmaputra Riverfront Boulevard hugging the river curvature)
    { x1: -130, z1: -8, x2: -60, z2: -26, width: 9.0, name: "MG Road Riverfront West" },
    { x1: -60, z1: -26, x2: -25, z2: -24, width: 9.0, name: "MG Road (Bharalumukh - Pan Bazar)" },
    { x1: -25, z1: -24, x2: 35, z2: -28, width: 9.0, name: "MG Road (Sukreswar Ghat)" },
    { x1: 35, z1: -28, x2: 65, z2: -34, width: 9.0, name: "MG Road (Uzan Bazar Riverfront)" },
    { x1: 65, z1: -34, x2: 180, z2: -42, width: 9.0, name: "MG Road (Kharghuli Riverfront)" },

    // 2. North Guwahati Highway (Amingaon to Dirgheswari across Saraighat Bridge)
    { x1: -240, z1: -170, x2: -130, z2: -170, width: 8.5, name: "North Highway West" },
    { x1: -130, z1: -170, x2: 60, z2: -170, width: 8.5, name: "North Highway (Amingaon)" },
    { x1: 60, z1: -170, x2: 180, z2: -170, width: 8.5, name: "North Highway (IIT Approach)" },

    // 3. Saraighat Approach Highway (NH-27 from Jalukbari Rotary to Bridge South Ramp)
    { x1: -130, z1: -8, x2: -130, z2: 45, width: 9.0, name: "NH-27 Saraighat Approach" },

    // 4. AT Road (Assam Trunk Road) connecting Jalukbari, Maligaon, Bharalumukh & Paltan Bazar
    { x1: -130, z1: 45, x2: -80, z2: 45, width: 8.5, name: "AT Road (Jalukbari - Maligaon)" },
    { x1: -80, z1: 45, x2: -60, z2: 45, width: 8.5, name: "AT Road (Maligaon - Bharalumukh)" },
    { x1: -60, z1: 45, x2: 15, z2: 45, width: 8.5, name: "AT Road (Bharalumukh - Paltan Bazar)" },

    // 5. GS Road (Guwahati-Shillong Commercial Highway Spine)
    { x1: 15, z1: 45, x2: 35, z2: 25, width: 9.0, name: "GS Road (Paltan - Bhangagarh)" },
    { x1: 35, z1: 25, x2: 60, z2: 15, width: 9.5, name: "GS Road (Christian Basti Flagship)" },
    { x1: 60, z1: 15, x2: 95, z2: 50, width: 9.0, name: "GS Road (Walford)" },
    { x1: 95, z1: 50, x2: 125, z2: 90, width: 9.5, name: "GS Road (Ganeshguri Flyover)" },
    { x1: 125, z1: 90, x2: 160, z2: 140, width: 9.5, name: "GS Road (Dispur Secretariat)" },
    { x1: 160, z1: 140, x2: 210, z2: 175, width: 9.0, name: "GS Road (Khanapara Foothills)" },

    // 6. Zoo Road (R.G. Baruah Road) creating the iconic commercial loop with GS Road!
    { x1: 180, z1: -42, x2: 175, z2: 15, width: 8.5, name: "Zoo Road (Chandmari - State Zoo)" },
    { x1: 175, z1: 15, x2: 155, z2: 55, width: 8.5, name: "Zoo Road (Commerce Hub)" },
    { x1: 155, z1: 55, x2: 125, z2: 90, width: 8.5, name: "Zoo Road to Ganeshguri Junction" },

    // 7. GNB Road & Dighalipukhuri Heritage Lake Promenade
    { x1: -25, z1: -24, x2: 35, z2: -10, width: 8.0, name: "GNB Road (Cotton University)" },
    { x1: 35, z1: -10, x2: 65, z2: -10, width: 8.0, name: "GNB Road (Dighalipukhuri Lake Promenade)" },
    { x1: 65, z1: -10, x2: 110, z2: -15, width: 8.0, name: "GNB Road (Ambari & Museum)" },
    { x1: 110, z1: -15, x2: 150, z2: -15, width: 8.0, name: "GNB Road (Ambari - Silpukhuri)" },
    { x1: 150, z1: -15, x2: 180, z2: -42, width: 8.0, name: "Silpukhuri to Chandmari Junction" },

    // 8. Christian Basti & Central City Connectors
    { x1: 35, z1: -28, x2: 35, z2: -10, width: 7.5, name: "Nehru Park West" },
    { x1: 35, z1: -10, x2: 35, z2: 25, width: 7.5, name: "Nehru Park to Bhangagarh" },
    { x1: 60, z1: 15, x2: 65, z2: -10, width: 7.0, name: "Christian Basti to Lake Link" },
    { x1: 60, z1: 15, x2: 110, z2: 15, width: 7.0, name: "Christian Basti East Avenue" },
    { x1: 110, z1: 15, x2: 150, z2: -15, width: 7.0, name: "Silpukhuri Connector" },

    // 9. Rehabari & Station Road Loop
    { x1: 15, z1: 45, x2: 15, z2: 90, width: 7.5, name: "Station Road South" },
    { x1: 15, z1: 90, x2: 70, z2: 90, width: 7.5, name: "Rehabari - Arya Nagar Loop" },
    { x1: 70, z1: 90, x2: 95, z2: 50, width: 7.5, name: "Arya Nagar to Walford Link" },

    // 10. Bharalumukh River Link (Connecting AT Road directly to MG Road)
    { x1: -60, z1: 45, x2: -60, z2: -26, width: 8.0, name: "Bharalumukh River Link" },

    // 11. Deepor Beel Scenic Highway (Connecting Jalukbari to Deepor Beel)
    { x1: -130, z1: 45, x2: -180, z2: 90, width: 8.0, name: "Deepor Beel North Highway" },
    { x1: -180, z1: 90, x2: -180, z2: 145, width: 8.0, name: "Deepor Beel Lakefront Drive" },
  ];

  interface JunctionNode {
    x: number;
    z: number;
    radius: number;
  }

  const junctions: JunctionNode[] = [
    { x: -130, z: -8, radius: 8.5 },    // Saraighat South Ramp Merge
    { x: -130, z: -170, radius: 9.0 },  // Saraighat North Ramp Merge
    { x: -80, z: 45, radius: 8.0 },     // Maligaon Junction
    { x: -60, z: 45, radius: 8.5 },     // Bharalumukh South
    { x: -60, z: -26, radius: 8.5 },    // Bharalumukh Riverfront
    { x: -25, z: -24, radius: 8.5 },    // Pan Bazar Riverfront
    { x: 35, z: -28, radius: 8.0 },     // Nehru Park Riverfront
    { x: 35, z: -10, radius: 8.0 },     // Nehru Park / Cotton Univ
    { x: 35, z: 25, radius: 8.0 },      // Nehru Park South / Bhangagarh
    { x: 65, z: -34, radius: 8.5 },     // Uzan Bazar Ghat
    { x: 65, z: -10, radius: 7.5 },     // Dighalipukhuri Lake
    { x: 60, z: 15, radius: 9.5 },      // Christian Basti (Nerqiva Studio)
    { x: 110, z: 15, radius: 7.5 },     // Christian Basti East
    { x: 110, z: -15, radius: 8.0 },    // Ambari / State Museum
    { x: 150, z: -15, radius: 8.0 },    // Silpukhuri Junction
    { x: 180, z: -42, radius: 9.0 },    // Chandmari Junction
    { x: 175, z: 15, radius: 8.0 },     // Zoo Tiniali
    { x: 155, z: 55, radius: 8.0 },     // Zoo Road Mid
    { x: 125, z: 90, radius: 9.5 },     // Ganeshguri Flyover
    { x: 95, z: 50, radius: 8.5 },      // Walford
    { x: 15, z: 45, radius: 9.0 },      // Paltan Bazar Junction
    { x: 15, z: 90, radius: 7.5 },      // Station Road South
    { x: 70, z: 90, radius: 7.5 },      // Rehabari / Arya Nagar
    { x: 210, z: 175, radius: 8.5 },    // Khanapara
    { x: -240, z: -170, radius: 8.0 },  // North Highway West
    { x: 60, z: -170, radius: 8.0 },    // Amingaon
    { x: 180, z: -170, radius: 8.0 },   // Dirgheswari East
    { x: -180, z: 90, radius: 8.0 },    // Deepor Beel North
    { x: -180, z: 145, radius: 8.0 },   // Deepor Beel South
  ];

  // Seamless rounded asphalt junction discs at Y = 0.16 (height 0.32)
  for (const j of junctions) {
    const jGeo = new THREE.CylinderGeometry(j.radius, j.radius, 0.32, 28);
    const jMesh = new THREE.Mesh(jGeo, roadMat);
    jMesh.position.set(j.x, 0.16, j.z);
    jMesh.receiveShadow = true;
    group.add(jMesh);
    disposables.push(jGeo);
  }

  // Jalukbari Rotary Roundabout (-130, 45, radius: 18)
  const rotaryAsphaltGeo = new THREE.CylinderGeometry(18, 18, 0.32, 32);
  const rotaryAsphalt = new THREE.Mesh(rotaryAsphaltGeo, roadMat);
  rotaryAsphalt.position.set(-130, 0.16, 45);
  rotaryAsphalt.receiveShadow = true;
  group.add(rotaryAsphalt);

  const rotaryIslandGeo = new THREE.CylinderGeometry(9, 9, 0.5, 32);
  const rotaryIslandMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
  const rotaryIsland = new THREE.Mesh(rotaryIslandGeo, rotaryIslandMat);
  rotaryIsland.position.set(-130, 0.25, 45);
  rotaryIsland.receiveShadow = true;
  group.add(rotaryIsland);

  // Terracotta rotary monument
  const rotaryMonGeo = new THREE.CylinderGeometry(0.8, 1.4, 4.2, 8);
  const rotaryMonMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
  const rotaryMon = new THREE.Mesh(rotaryMonGeo, rotaryMonMat);
  rotaryMon.position.set(-130, 2.6, 45);
  group.add(rotaryMon);
  disposables.push(rotaryAsphaltGeo, rotaryIslandGeo, rotaryIslandMat, rotaryMonGeo, rotaryMonMat);

  // Dispur Secretariat Roundabout (160, 140, radius: 16)
  const dispurAsphaltGeo = new THREE.CylinderGeometry(16, 16, 0.32, 32);
  const dispurAsphalt = new THREE.Mesh(dispurAsphaltGeo, roadMat);
  dispurAsphalt.position.set(160, 0.16, 140);
  dispurAsphalt.receiveShadow = true;
  group.add(dispurAsphalt);

  const dispurIslandGeo = new THREE.CylinderGeometry(7.5, 7.5, 0.5, 32);
  const dispurIsland = new THREE.Mesh(dispurIslandGeo, rotaryIslandMat);
  dispurIsland.position.set(160, 0.25, 140);
  dispurIsland.receiveShadow = true;
  group.add(dispurIsland);
  disposables.push(dispurAsphaltGeo, dispurIslandGeo);

  // Build each solid 3D road segment with Indian black-and-white striped curbs
  for (const r of roads) {
    const dx = r.x2 - r.x1;
    const dz = r.z2 - r.z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const midX = (r.x1 + r.x2) / 2;
    const midZ = (r.z1 + r.z2) / 2;

    const roadGeo = new THREE.BoxGeometry(r.width, 0.32, len);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(midX, 0.16, midZ);
    roadMesh.rotation.y = angle;
    roadMesh.receiveShadow = true;
    group.add(roadMesh);
    disposables.push(roadGeo);

    // Calculate junction insets
    let startInset = 0;
    for (const j of junctions) {
      if (Math.hypot(r.x1 - j.x, r.z1 - j.z) <= j.radius + 1.2) {
        startInset = Math.max(startInset, j.radius);
      }
    }
    if (Math.hypot(r.x1 - -130, r.z1 - 45) <= 19.5) {
      startInset = Math.max(startInset, 18.0);
    }
    if (Math.hypot(r.x1 - 160, r.z1 - 140) <= 17.5) {
      startInset = Math.max(startInset, 16.0);
    }

    let endInset = 0;
    for (const j of junctions) {
      if (Math.hypot(r.x2 - j.x, r.z2 - j.z) <= j.radius + 1.2) {
        endInset = Math.max(endInset, j.radius);
      }
    }
    if (Math.hypot(r.x2 - -130, r.z2 - 45) <= 19.5) {
      endInset = Math.max(endInset, 18.0);
    }
    if (Math.hypot(r.x2 - 160, r.z2 - 140) <= 17.5) {
      endInset = Math.max(endInset, 16.0);
    }

    const curbLen = len - startInset - endInset;
    if (curbLen > 1.5) {
      const startParam = startInset / len;
      const endParam = 1.0 - endInset / len;
      const midParam = (startParam + endParam) / 2;
      const curbCenterX = r.x1 + dx * midParam;
      const curbCenterZ = r.z1 + dz * midParam;

      const curbW = 1.35;
      const curbTex = createStripedCurbTexture();
      curbTex.repeat.set(1, Math.max(2, Math.round(curbLen / 2.0)));
      const stripedCurbMat = new THREE.MeshStandardMaterial({
        map: curbTex,
        roughness: 0.8,
        metalness: 0.08,
      });
      disposables.push(stripedCurbMat, curbTex);

      // Left & Right Striped Curbs
      for (const side of [-1, 1]) {
        const curbGeo = new THREE.BoxGeometry(curbW, 0.44, curbLen);
        const curbMesh = new THREE.Mesh(curbGeo, stripedCurbMat);
        const perpDist = (r.width / 2 + curbW / 2) * side;
        const perpX = Math.cos(angle) * perpDist;
        const perpZ = -Math.sin(angle) * perpDist;
        curbMesh.position.set(curbCenterX + perpX, 0.22, curbCenterZ + perpZ);
        curbMesh.rotation.y = angle;
        curbMesh.receiveShadow = true;
        group.add(curbMesh);
        disposables.push(curbGeo);
      }

      // Yellow Center Dashed Line
      const lineStart = new THREE.Vector3(
        r.x1 + dx * startParam,
        0.335,
        r.z1 + dz * startParam
      );
      const lineEnd = new THREE.Vector3(
        r.x1 + dx * endParam,
        0.335,
        r.z1 + dz * endParam
      );
      const dashLine = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([lineStart, lineEnd]),
        new THREE.LineDashedMaterial({
          color: 0xfacc15,
          dashSize: 3.2,
          gapSize: 2.2,
          linewidth: 2,
        })
      );
      dashLine.computeLineDistances();
      group.add(dashLine);
    }
  }

  // 8. COMMERCIAL PLOTS & VERIFIED BUSINESS BLOCKS
  const nerqivaBusiness =
    guwahatiStorefronts.find((s) => s.slug === "nerqiva-studio") ||
    guwahatiStorefronts[0] ||
    null;

  interface PlotPlacement {
    business: BusinessStorefront | null;
    x: number;
    z: number;
    isLeft: boolean;
    isConstruction?: boolean;
    colonyName: string;
    pincode: string;
    tier: number;
  }

  const plotPlacements: PlotPlacement[] = [
    // Flagship 1: Nerqiva Studio at Christian Basti Boulevard (781005)
    {
      business: nerqivaBusiness,
      x: 74,
      z: 2,
      isLeft: true,
      colonyName: "GS Road & Christian Basti",
      pincode: "781005",
      tier: 2,
    },
    // Plot 2: Under Construction Commercial Plot on GS Road
    {
      business: null,
      x: 34,
      z: 36,
      isLeft: false,
      isConstruction: true,
      colonyName: "GS Road Commercial District",
      pincode: "781005",
      tier: 1,
    },
    // Plot 3: Riverside Commercial Space (781001)
    {
      business: null,
      x: -25,
      z: -24,
      isLeft: true,
      colonyName: "Pan Bazar Riverfront",
      pincode: "781001",
      tier: 1,
    },
    // Plot 4: Dighalipukhuri Lakeside Studio (781004)
    {
      business: null,
      x: 65,
      z: -10,
      isLeft: false,
      colonyName: "Uzan Bazar Lakefront",
      pincode: "781004",
      tier: 1,
    },
    // Plot 5: Paltan Bazar Wholesale / Transit Hub (781008)
    {
      business: null,
      x: 15,
      z: 45,
      isLeft: true,
      colonyName: "Paltan Bazar Station Road",
      pincode: "781008",
      tier: 1,
    },
    // Plot 6: Dispur Secretariat Avenue (781006)
    {
      business: null,
      x: 160,
      z: 140,
      isLeft: false,
      colonyName: "Dispur Secretariat Avenue",
      pincode: "781006",
      tier: 1,
    },
    // Plot 7: Jalukbari & Saraighat Bridge Gateway (781014)
    {
      business: null,
      x: -130,
      z: 45,
      isLeft: true,
      colonyName: "Jalukbari Gateway",
      pincode: "781014",
      tier: 1,
    },
    // Plot 8: Ganeshguri Retail & Dining Plot (781005)
    {
      business: null,
      x: 125,
      z: 90,
      isLeft: false,
      colonyName: "Ganeshguri Commercial Center",
      pincode: "781005",
      tier: 1,
    },
    // Plot 9: Chandmari & Zoo Road Plot (781003)
    {
      business: null,
      x: 175,
      z: 15,
      isLeft: true,
      colonyName: "Chandmari & Zoo Road",
      pincode: "781003",
      tier: 1,
    },
  ];

  plotPlacements.forEach((p, idx) => {
    const isConstruction = Boolean(p.isConstruction);
    const isEmptyPlot = !p.business && !isConstruction;

    const plotResult = buildCartoonStorefrontPlot(
      p.business,
      idx,
      p.isLeft,
      p.x,
      p.z,
      isConstruction,
      isEmptyPlot
    );

    plotResult.mesh.position.y = 0.32;
    plotResult.hitBox.position.y = 0.32;

    group.add(plotResult.mesh);
    group.add(plotResult.hitBox);

    hitBoxes.push(plotResult.hitBox);
    plots.push(plotResult);

    // Floating Colony PIN Code Badge & Verified Business Banner
    const canvas = document.createElement("canvas");
    canvas.width = 380;
    canvas.height = 115;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 380, 115);

    ctx.beginPath();
    ctx.roundRect(8, 8, 364, 99, 22);
    ctx.fillStyle = p.business ? "rgba(10, 15, 29, 0.94)" : "rgba(15, 23, 42, 0.88)";
    ctx.fill();
    ctx.lineWidth = p.business ? 3.0 : 1.5;
    ctx.strokeStyle = p.business ? "#f59e0b" : "rgba(148, 163, 184, 0.4)";
    ctx.stroke();

    const title = p.business ? p.business.name : p.colonyName;
    ctx.font = "bold 23px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = p.business ? "#ffffff" : "#f1f5f9";
    ctx.textAlign = "left";
    ctx.fillText(title, 24, 46);

    const sub = p.business
      ? `🌿 PIN ${p.pincode} · ${p.business.starting_price || "Verified Flagship"}`
      : `📍 PIN ${p.pincode} · Claim Plot ₹0`;
    ctx.font = "600 16px 'JetBrains Mono', monospace";
    ctx.fillStyle = p.business ? "#fbbf24" : "#94a3b8";
    ctx.fillText(sub, 24, 80);

    const badgeTex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: badgeTex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    const badgeScale = p.business ? 12 : 8.5;
    sprite.position.set(p.x, plotResult.badgePosition.y, p.z);
    sprite.scale.set(badgeScale, badgeScale * (115 / 380), 1);
    group.add(sprite);
  });

  // 9. PROCEDURAL FLORA (Lush Neem, Banyan & Bamboo along River, Lakes and Roads)
  const treeGeo = new THREE.DodecahedronGeometry(1.8, 0);
  treeGeo.translate(0, 2.2, 0);
  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x166534, // Assam deep tea-garden green
    roughness: 0.88,
    flatShading: true,
  });
  const treeInst = new THREE.InstancedMesh(treeGeo, treeMat, 80);

  const treeDummy = new THREE.Object3D();
  let tIdx = 0;

  // Along Dighalipukhuri Lake
  for (let lx = 42; lx <= 88; lx += 8) {
    for (const lz of [-23, 3]) {
      if (Math.hypot(lx - 74, lz - 2) < 12) continue; // Keep Nerqiva Studio entrance unobstructed
      treeDummy.position.set(lx + Math.sin(tIdx) * 1.5, 0.32, lz);
      const s = 1.0 + Math.sin(tIdx * 2.1) * 0.25;
      treeDummy.scale.set(s, s * 1.25, s);
      treeDummy.rotation.y = tIdx * 1.3;
      treeDummy.updateMatrix();
      treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
    }
  }

  // Along Curved Brahmaputra Riverfront Park (following getRiverSouthBankZ)
  for (let rx = -220; rx <= 220; rx += 18) {
    if (Math.abs(rx - -130) < 22) continue; // Skip Saraighat bridge
    const rz = getRiverSouthBankZ(rx) + 6.0;
    treeDummy.position.set(rx, 0.32, rz);
    const s = 1.2 + Math.cos(tIdx * 1.8) * 0.3;
    treeDummy.scale.set(s, s * 1.3, s);
    treeDummy.rotation.y = tIdx * 1.5;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // Along Deepor Beel Shoreline
  for (let bx = -240; bx <= -140; bx += 20) {
    treeDummy.position.set(bx, 0.1, 145);
    const s = 1.1 + Math.sin(tIdx) * 0.2;
    treeDummy.scale.set(s, s * 1.2, s);
    treeDummy.rotation.y = tIdx;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  treeInst.instanceMatrix.needsUpdate = true;
  group.add(treeInst);
  disposables.push(treeGeo, treeMat);

  // 10. REALISTIC, PEACEFUL TRAFFIC (Cruising smoothly on road waypoints)
  interface CityVehicle {
    mesh: THREE.Group;
    waypoints: [number, number, number][]; // [x, y, z] strictly on road centerlines
    currentWp: number;
    t: number;
    speed: number;
  }

  const vehicles: CityVehicle[] = [];

  const buildAuto = () => {
    const v = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x16a34a })
    );
    body.position.y = 0.8;
    v.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.3, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xfacc15 })
    );
    roof.position.y = 1.55;
    v.add(roof);
    return v;
  };

  const buildBus = (colorHex: number = 0xb91c1c) => {
    const v = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, 8.0),
      new THREE.MeshStandardMaterial({ color: colorHex }) // ASTC Red or Green Bus
    );
    body.position.y = 1.3;
    v.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.3, 7.8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    roof.position.y = 2.5;
    v.add(roof);
    return v;
  };

  const buildCar = () => {
    const v = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.9, 3.8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    body.position.y = 0.65;
    v.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
    );
    cabin.position.set(0, 1.45, -0.3);
    v.add(cabin);
    return v;
  };

  // Vehicle 1: Auto-Rickshaw touring MG Riverfront, Pan Bazar, Dighalipukhuri & GNB Road
  const auto = buildAuto();
  group.add(auto);
  vehicles.push({
    mesh: auto,
    waypoints: [
      [-60, 0.32, -26],   // Bharalumukh Riverfront
      [-25, 0.32, -24],   // Pan Bazar Riverfront
      [35, 0.32, -28],    // Sukreswar Ghat / Nehru Park
      [65, 0.32, -34],    // Uzan Bazar Ghat
      [180, 0.32, -42],   // Chandmari Riverfront
      [150, 0.32, -15],   // Silpukhuri
      [110, 0.32, -15],   // Ambari & State Museum
      [65, 0.32, -10],    // Dighalipukhuri Lake Promenade
      [35, 0.32, -10],    // Cotton University
      [-25, 0.32, -24],   // Pan Bazar
      [-60, 0.32, -26],   // Back to Bharalumukh
    ],
    currentWp: 0,
    t: 0,
    speed: 4.2,
  });

  // Vehicle 2: ASTC Red Bus Crossing Saraighat Bridge seamlessly
  const bus = buildBus(0xb91c1c);
  group.add(bus);
  vehicles.push({
    mesh: bus,
    waypoints: [
      [-130, 0.32, 45],    // Jalukbari Rotary
      [-130, 0.32, -8],    // NH-27 Approach Foot
      [-130, 2.56, -18.5], // South Ramp Mid
      [-130, 4.8, -29],    // South Abutment Bridge Deck
      [-130, 4.8, -89],    // Saraighat Bridge Mid River
      [-130, 4.8, -149],   // North Abutment Bridge Deck
      [-130, 2.56, -159.5],// North Ramp Mid
      [-130, 0.32, -170],  // North Highway Foot
      [0, 0.32, -170],     // North Highway Amingaon
      [-130, 0.32, -170],  // North Highway Return
      [-130, 2.56, -159.5],// North Ramp Ascend
      [-130, 4.8, -149],   // North Abutment
      [-130, 4.8, -89],    // Mid River
      [-130, 4.8, -29],    // South Abutment
      [-130, 2.56, -18.5], // South Ramp Descend
      [-130, 0.32, -8],    // NH-27 Foot
      [-130, 0.32, 45],    // Jalukbari Rotary
    ],
    currentWp: 0,
    t: 0.25,
    speed: 3.8,
  });

  // Vehicle 3: White Sedan on GS Road Commercial Highway (Paltan to Dispur)
  const car = buildCar();
  group.add(car);
  vehicles.push({
    mesh: car,
    waypoints: [
      [15, 0.32, 45],    // Paltan Bazar Junction
      [35, 0.32, 25],    // Bhangagarh
      [60, 0.32, 15],    // Christian Basti (Nerqiva Studio)
      [95, 0.32, 50],    // Walford
      [125, 0.32, 90],   // Ganeshguri Flyover
      [160, 0.32, 140],  // Dispur Secretariat Roundabout
      [125, 0.32, 90],   // Ganeshguri
      [95, 0.32, 50],    // Walford
      [60, 0.32, 15],    // Christian Basti
      [35, 0.32, 25],    // Bhangagarh
      [15, 0.32, 45],    // Paltan Bazar
    ],
    currentWp: 0,
    t: 0.6,
    speed: 4.8,
  });

  // Vehicle 4: Green City Bus on the Zoo Road - GS Road Commercial Loop
  const greenBus = buildBus(0x059669);
  group.add(greenBus);
  vehicles.push({
    mesh: greenBus,
    waypoints: [
      [125, 0.32, 90],   // Ganeshguri Junction
      [155, 0.32, 55],   // Zoo Road Commerce
      [175, 0.32, 15],   // Zoo Tiniali
      [180, 0.32, -42],  // Chandmari Junction
      [150, 0.32, -15],  // Silpukhuri
      [110, 0.32, 15],   // Christian Basti East
      [60, 0.32, 15],    // Christian Basti (Nerqiva Studio)
      [95, 0.32, 50],    // Walford
      [125, 0.32, 90],   // Ganeshguri Flyover
    ],
    currentWp: 0,
    t: 0.1,
    speed: 4.0,
  });

  // Animation Update: Physical 3D interpolation along asphalt waypoints
  const update = (delta: number) => {
    const dt = Math.min(delta, 0.1);

    for (const v of vehicles) {
      const p1 = v.waypoints[v.currentWp];
      const nextIdx = (v.currentWp + 1) % v.waypoints.length;
      const p2 = v.waypoints[nextIdx];

      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const dz = p2[2] - p1[2];
      const horizontalDist = Math.hypot(dx, dz);
      const totalDist = Math.hypot(dx, dy, dz);

      v.t += (v.speed * dt) / Math.max(totalDist, 1);
      if (v.t >= 1) {
        v.t = 0;
        v.currentWp = nextIdx;
      }

      const curX = p1[0] + dx * v.t;
      const curY = p1[1] + dy * v.t;
      const curZ = p1[2] + dz * v.t;
      v.mesh.position.set(curX, curY, curZ);

      const yawAngle = Math.atan2(dx, dz);
      v.mesh.rotation.y = yawAngle;

      if (horizontalDist > 0.1) {
        v.mesh.rotation.x = -Math.atan2(dy, horizontalDist);
      } else {
        v.mesh.rotation.x = 0;
      }
    }
  };

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  return {
    group,
    hitBoxes,
    plots,
    colonies: GUWAHATI_COLONIES,
    update,
    dispose,
  };
}
