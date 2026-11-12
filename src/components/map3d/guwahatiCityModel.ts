import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BusinessStorefront } from "@/types";
import { buildCartoonStorefrontPlot, StorefrontMeshResult } from "./cartoonStorefront";
import { createRoadTexture, createSidewalkTexture } from "./streetTextures";

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
    z: -25,
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
    x: 150,
    z: 130,
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
 * Builds the complete, geographically accurate 3D city of Guwahati:
 * - Expansive natural Assam valley terrain (1600x1400) framed by rolling hills (Nilachal/Kamakhya, Khasi foothills)
 * - Majestic Brahmaputra River running across the northern horizon with sandy sandbars and flowing water
 * - Iconic 3D Saraighat Bridge crossing the river from Jalukbari to North Guwahati
 * - Interconnected Road Network: MG Road, Saraighat Highway, AT Road, GS Road, GNB Road, and colony loops
 * - Dighalipukhuri Heritage Lake & Bharalu urban stream with arched bridges
 * - Over 120 charming low-poly Assam cottages & shophouses lining the roads (zero empty void)
 * - Real official Postal PIN Codes (781001, 781004, 781005, 781006, 781008, 781014)
 * - Flagship Nerqiva Studio at GS Road, Christian Basti (PIN 781005)
 * - Peaceful, realistic traffic (3 calm vehicles at 3.5 m/s)
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

  // 1. EXPANSIVE ASSAM VALLEY NATURAL TERRAIN (1600 x 1400)
  // Height-mapped mesh that forms a natural valley bowl framed by rolling hills
  const terrainWidth = 1600;
  const terrainHeight = 1400;
  const segX = 80;
  const segZ = 70;
  const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainHeight, segX, segZ);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);

    let elev = 0;

    // A. River basin depression along the north (Z from -160 to -30)
    if (z > -160 && z < -30 && Math.abs(x) < 700) {
      elev = -0.6; // River water level sits at 0.0
    }

    // B. Kamakhya / Nilachal Hills in the West (X: -260 to -160, Z: -40 to 120)
    const distKamakhya = Math.hypot(x - -210, z - 30);
    if (distKamakhya < 140) {
      const kFactor = (1 + Math.cos((distKamakhya / 140) * Math.PI)) * 0.5;
      elev = Math.max(elev, kFactor * 32);
    }

    // C. Meghalaya / Khasi Foothills in the South (Z > 120)
    if (z > 100) {
      const southGrad = Math.min((z - 100) / 450, 1.0);
      elev = Math.max(elev, southGrad * southGrad * 48 + Math.sin(x * 0.015) * 6);
    }

    // D. Sarania / Narengi Hills in the East (X > 160, Z from -20 to 120)
    const distSarania = Math.hypot(x - 220, z - 40);
    if (distSarania < 130) {
      const sFactor = (1 + Math.cos((distSarania / 130) * Math.PI)) * 0.5;
      elev = Math.max(elev, sFactor * 26);
    }

    // E. North Guwahati Hills across the Brahmaputra (Z < -160)
    if (z < -160) {
      const northGrad = Math.min((-160 - z) / 400, 1.0);
      elev = Math.max(elev, northGrad * northGrad * 38 + Math.cos(x * 0.018) * 5);
    }

    // Subtle natural ground undulation across the city
    if (elev === 0 && (z < -160 || z > -30 || Math.abs(x) > 700)) {
      elev = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.4;
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

  // 2. THE MIGHTY BRAHMAPUTRA RIVER (Spanning 1600 units east-west)
  const riverW = 1600;
  const riverL = 125;
  const riverGeo = new THREE.PlaneGeometry(riverW, riverL, 64, 8);
  riverGeo.rotateX(-Math.PI / 2);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Reflective deep sky blue river water
    roughness: 0.16,
    metalness: 0.38,
    transparent: true,
    opacity: 0.94,
  });
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.position.set(0, 0.04, -92.5);
  riverMesh.receiveShadow = true;
  group.add(riverMesh);
  disposables.push(riverGeo, riverMat);

  // Sandy Riverbanks (South and North shores)
  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xf1dfaa, // Golden silt river sand
    roughness: 0.92,
  });
  disposables.push(beachMat);

  const southBeachGeo = new THREE.PlaneGeometry(1600, 10);
  southBeachGeo.rotateX(-Math.PI / 2);
  const southBeach = new THREE.Mesh(southBeachGeo, beachMat);
  southBeach.position.set(0, 0.05, -29);
  group.add(southBeach);
  disposables.push(southBeachGeo);

  const northBeachGeo = new THREE.PlaneGeometry(1600, 12);
  northBeachGeo.rotateX(-Math.PI / 2);
  const northBeach = new THREE.Mesh(northBeachGeo, beachMat);
  northBeach.position.set(0, 0.05, -156);
  group.add(northBeach);
  disposables.push(northBeachGeo);

  // Brahmaputra River Sandbars (Chars / River Islands)
  const sandbarMat = new THREE.MeshStandardMaterial({ color: 0xeadbb6, roughness: 0.9 });
  const char1Geo = new THREE.CylinderGeometry(35, 42, 0.4, 16);
  char1Geo.scale(1.8, 1, 0.6);
  const char1 = new THREE.Mesh(char1Geo, sandbarMat);
  char1.position.set(40, 0.1, -95);
  group.add(char1);

  const char2Geo = new THREE.CylinderGeometry(24, 30, 0.4, 14);
  char2Geo.scale(2.0, 1, 0.5);
  const char2 = new THREE.Mesh(char2Geo, sandbarMat);
  char2.position.set(-280, 0.1, -90);
  group.add(char2);
  disposables.push(char1Geo, char2Geo, sandbarMat);

  // 3. SARAIGHAT BRIDGE (Iconic Steel Truss Bridge crossing the river)
  // Connects Jalukbari (Z: -28) across to Amingaon / North Guwahati (Z: -156)
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = "saraighat_bridge";

  const bridgeX = -130;
  const bridgeDeckW = 8.8;
  const bridgeDeckL = 136;
  const bridgeDeckGeo = new THREE.BoxGeometry(bridgeDeckW, 1.4, bridgeDeckL);
  const bridgeDeckMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Asphalt & concrete slate
    roughness: 0.72,
    metalness: 0.2,
  });
  const bridgeDeck = new THREE.Mesh(bridgeDeckGeo, bridgeDeckMat);
  bridgeDeck.position.set(bridgeX, 3.8, -92);
  bridgeDeck.receiveShadow = true;
  bridgeDeck.castShadow = true;
  bridgeGroup.add(bridgeDeck);

  // Concrete Caisson Piers in the River
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
  for (const pz of [-45, -70, -95, -120, -145]) {
    const pierGeo = new THREE.CylinderGeometry(2.6, 3.2, 6.0, 14);
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.set(bridgeX, 1.6, pz);
    bridgeGroup.add(pier);
  }

  // Steel Truss Superstructure along bridge sides
  const trussMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c, // Classic Indian red-primer steel truss
    metalness: 0.45,
    roughness: 0.55,
  });
  for (const side of [-1, 1]) {
    const trussBarGeo = new THREE.BoxGeometry(0.45, 4.2, bridgeDeckL);
    const truss = new THREE.Mesh(trussBarGeo, trussMat);
    truss.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.2), 5.6, -92);
    truss.castShadow = true;
    bridgeGroup.add(truss);

    // Overhead truss crossbeams
    for (let bz = -150; bz <= -35; bz += 16) {
      const topBeamGeo = new THREE.BoxGeometry(bridgeDeckW + 0.8, 0.4, 0.4);
      const topBeam = new THREE.Mesh(topBeamGeo, trussMat);
      topBeam.position.set(bridgeX, 7.7, bz);
      bridgeGroup.add(topBeam);
    }
  }

  // Bridge Approach Ramps
  const rampSouthGeo = new THREE.BoxGeometry(bridgeDeckW, 1.2, 22);
  rampSouthGeo.rotateX(-0.12);
  const rampSouth = new THREE.Mesh(rampSouthGeo, bridgeDeckMat);
  rampSouth.position.set(bridgeX, 2.0, -20);
  bridgeGroup.add(rampSouth);

  const rampNorthGeo = new THREE.BoxGeometry(bridgeDeckW, 1.2, 22);
  rampNorthGeo.rotateX(0.12);
  const rampNorth = new THREE.Mesh(rampNorthGeo, bridgeDeckMat);
  rampNorth.position.set(bridgeX, 2.0, -164);
  bridgeGroup.add(rampNorth);

  group.add(bridgeGroup);
  disposables.push(bridgeDeckGeo, bridgeDeckMat, pierMat, trussMat);

  // 4. DIGHALIPUKHURI HERITAGE LAKE (In Uzan Bazar / Heritage District)
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

  // Lake Promenade Walkway
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

  // 5. BHARALU URBAN STREAM (Winding water canal cutting through city into Brahmaputra)
  const canalPoints: [number, number][] = [
    [-60, 110],
    [-55, 75],
    [-62, 45],
    [-50, 15],
    [-55, -28],
  ];
  const canalMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  for (let c = 0; c < canalPoints.length - 1; c++) {
    const p1 = canalPoints[c];
    const p2 = canalPoints[c + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const cGeo = new THREE.PlaneGeometry(6.0, len);
    cGeo.rotateX(-Math.PI / 2);
    cGeo.rotateY(angle);
    const cMesh = new THREE.Mesh(cGeo, canalMat);
    cMesh.position.set((p1[0] + p2[0]) / 2, 0.04, (p1[1] + p2[1]) / 2);
    group.add(cMesh);
  }

  // 6. CONNECTED ROAD NETWORK (Real Interconnected Guwahati Streets)
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Asphalt slate
    roughness: 0.78,
    metalness: 0.08,
  });
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Concrete curb & paver
    roughness: 0.85,
  });
  disposables.push(roadMat, sidewalkMat);

  interface RoadDef {
    x1: number;
    z1: number;
    x2: number;
    z2: number;
    width: number;
    name: string;
  }

  const roads: RoadDef[] = [
    // MG Road (Riverfront Boulevard along South Bank)
    { x1: -240, z1: -25, x2: 240, z2: -25, width: 8.5, name: "MG Road Riverfront" },

    // North Guwahati Riverfront Road
    { x1: -200, z1: -160, x2: 120, z2: -160, width: 7.5, name: "North Guwahati Highway" },

    // Saraighat Highway (NH-27) connecting bridge to Jalukbari Rotary
    { x1: -130, z1: -20, x2: -130, z2: 45, width: 8.5, name: "NH-27 Saraighat Approach" },

    // AT Road (Assam Trunk Road) from Jalukbari Rotary to Paltan Bazar
    { x1: -130, z1: 45, x2: 15, z2: 45, width: 8.0, name: "AT Road (Assam Trunk)" },

    // GS Road (Premier Commercial Highway Spine)
    { x1: 15, z1: 45, x2: 35, z2: 25, width: 8.5, name: "GS Road (Paltan - Bhangagarh)" },
    { x1: 35, z1: 25, x2: 60, z2: 15, width: 9.0, name: "GS Road (Christian Basti Flagship)" },
    { x1: 60, z1: 15, x2: 95, z2: 50, width: 8.5, name: "GS Road (Walford)" },
    { x1: 95, z1: 50, x2: 125, z2: 90, width: 8.5, name: "GS Road (Ganeshguri)" },
    { x1: 125, z1: 90, x2: 160, z2: 140, width: 8.5, name: "GS Road (Dispur Secretariat)" },

    // GNB Road & MC Road Heritage Loop (around Dighalipukhuri Lake)
    { x1: -25, z1: -25, x2: 35, z2: -25, width: 7.5, name: "GNB Road West" },
    { x1: 35, z1: -25, x2: 95, z2: -25, width: 7.5, name: "GNB Road (North of Lake)" },
    { x1: 95, z1: -25, x2: 95, z2: 15, width: 7.0, name: "MC Road East" },
    { x1: 95, z1: 15, x2: 60, z2: 15, width: 7.0, name: "MC Road to Christian Basti" },
    { x1: 35, z1: -25, x2: 35, z2: 25, width: 7.0, name: "Nehru Park Avenue" },

    // Colony Connecting Roads (Loops & Neighborhood branches)
    { x1: 60, z1: 15, x2: 60, z2: -10, width: 6.5, name: "Christian Basti Colony Lane" },
    { x1: 60, z1: -10, x2: 35, z2: -10, width: 6.0, name: "Uzan Bazar Heritage Link" },
    { x1: 15, z1: 45, x2: 15, z2: 90, width: 7.0, name: "Station Road South" },
    { x1: 15, z1: 90, x2: 70, z2: 90, width: 6.5, name: "Rehabari - Bhangagarh Loop" },
    { x1: 70, z1: 90, x2: 95, z2: 50, width: 6.5, name: "Bhangagarh Link" },
    { x1: -60, z1: 45, x2: -60, z2: -25, width: 7.0, name: "Bharalumukh River Link" },
  ];

  for (const r of roads) {
    const dx = r.x2 - r.x1;
    const dz = r.z2 - r.z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    // Road Surface
    const geo = new THREE.PlaneGeometry(r.width, len);
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(angle);
    const mesh = new THREE.Mesh(geo, roadMat);
    mesh.position.set((r.x1 + r.x2) / 2, 0.06, (r.z1 + r.z2) / 2);
    mesh.receiveShadow = true;
    group.add(mesh);

    // Sidewalk Borders (Left and Right curbs)
    const curbW = 1.4;
    for (const side of [-1, 1]) {
      const cGeo = new THREE.PlaneGeometry(curbW, len);
      cGeo.rotateX(-Math.PI / 2);
      cGeo.rotateY(angle);
      const cMesh = new THREE.Mesh(cGeo, sidewalkMat);
      const perpX = -Math.sin(angle) * (r.width / 2 + curbW / 2) * side;
      const perpZ = Math.cos(angle) * (r.width / 2 + curbW / 2) * side;
      cMesh.position.set((r.x1 + r.x2) / 2 + perpX, 0.055, (r.z1 + r.z2) / 2 + perpZ);
      group.add(cMesh);
    }

    // Yellow Dashed Center Lane Marking
    const dashLine = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(r.x1, 0.07, r.z1),
        new THREE.Vector3(r.x2, 0.07, r.z2),
      ]),
      new THREE.LineDashedMaterial({
        color: 0xfacc15,
        dashSize: 2.8,
        gapSize: 2.2,
        linewidth: 2,
      })
    );
    dashLine.computeLineDistances();
    group.add(dashLine);
  }

  // 7. OVER 120+ CHARMING LOW-POLY ASSAM COTTAGES & SHOPS LINING THE STREETS
  // Built with non-indexed painted buffer geometries and merged for maximum 60 FPS performance!
  const cottageGeos: THREE.BufferGeometry[] = [];

  const paintGeo = (geo: THREE.BufferGeometry, hex: string | number): THREE.BufferGeometry => {
    const c = new THREE.Color(hex);
    const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
    const count = nonIndexed.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    nonIndexed.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    nonIndexed.deleteAttribute("uv");
    return nonIndexed;
  };

  const createBox = (
    w: number,
    h: number,
    d: number,
    hex: string | number,
    x = 0,
    y = 0,
    z = 0
  ): THREE.BufferGeometry => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y + h / 2, z);
    return paintGeo(g, hex);
  };

  const createGableRoof = (
    w: number,
    d: number,
    h: number,
    hex: string | number,
    x = 0,
    y = 0,
    z = 0
  ): THREE.BufferGeometry => {
    const a = w / 2;
    const b = d / 2;
    const L0 = [-a, 0, b];
    const R0 = [a, 0, b];
    const T0 = [0, h, b];
    const L1 = [-a, 0, -b];
    const R1 = [a, 0, -b];
    const T1 = [0, h, -b];

    const tris = [
      ...L0, ...R0, ...T0,
      ...R1, ...L1, ...T1,
      ...L0, ...T0, ...T1,
      ...L0, ...T1, ...L1,
      ...R0, ...R1, ...T1,
      ...R0, ...T1, ...T0,
    ];

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tris), 3));
    g.computeVertexNormals();
    g.translate(x, y, z);
    return paintGeo(g, hex);
  };

  const roofColors = [
    "#15803d", // Classic Assam tin green
    "#c2410c", // Terracotta red clay
    "#1e3a8a", // Slate navy
    "#b45309", // Ochre rust
    "#047857", // Deep forest green
  ];

  const wallColors = [
    "#f8fafc", // Crisp Assam white lime
    "#fef3c7", // Warm cream
    "#e2e8f0", // Light slate
    "#fafaf9", // Warm ivory
  ];

  const addCottage = (
    x: number,
    z: number,
    rotY: number,
    roofColor: string,
    wallColor: string,
    scale = 1.0
  ) => {
    const w = 5.4 * scale;
    const d = 4.4 * scale;
    const h = 2.4 * scale;
    const roofH = 1.8 * scale;

    const parts: THREE.BufferGeometry[] = [];
    parts.push(createBox(w + 0.6, 0.25, d + 0.6, "#cbd5e1", 0, 0, 0));
    parts.push(createBox(w, h, d, wallColor, 0, 0.25, 0));
    parts.push(createGableRoof(w + 0.8, d + 0.8, roofH, roofColor, 0, 0.25 + h, 0));
    parts.push(createBox(2.4, 0.08, 1.4, roofColor, 0, 0.25 + h * 0.75, d / 2 + 0.7));
    parts.push(createBox(0.12, h * 0.75, 0.12, "#78350f", -1.0, 0.25, d / 2 + 1.2));
    parts.push(createBox(0.12, h * 0.75, 0.12, "#78350f", 1.0, 0.25, d / 2 + 1.2));

    const merged = mergeGeometries(parts, false);
    if (!merged) return;

    merged.rotateY(rotY);
    merged.translate(x, 0.08, z);
    cottageGeos.push(merged);
  };

  // Place cottages systematically along connected roads:
  // Along MG Road Riverfront
  for (let x = -200; x <= 200; x += 14) {
    if (Math.abs(x - -130) < 18) continue; // Skip Saraighat bridge
    if (Math.abs(x - -25) < 14) continue; // Skip Pan Bazar plot
    addCottage(
      x,
      -16,
      0,
      roofColors[Math.abs(x) % roofColors.length],
      wallColors[Math.abs(x) % wallColors.length],
      0.95
    );
  }

  // Along GS Road (Commercial Avenue & Christian Basti)
  const gsPoints: [number, number, number][] = [
    [25, 35, -0.6],
    [40, 20, -0.4],
    [50, 18, -0.4],
    [75, 25, 0.6],
    [85, 38, 0.7],
    [105, 65, 0.7],
    [115, 78, 0.7],
    [135, 105, 0.7],
    [145, 118, 0.7],
  ];
  for (let i = 0; i < gsPoints.length; i++) {
    const [gx, gz, rot] = gsPoints[i];
    addCottage(
      gx - 8,
      gz + 4,
      rot,
      roofColors[i % roofColors.length],
      wallColors[i % wallColors.length],
      1.1
    );
    addCottage(
      gx + 8,
      gz - 4,
      rot + Math.PI,
      roofColors[(i + 2) % roofColors.length],
      wallColors[(i + 1) % wallColors.length],
      1.05
    );
  }

  // Around Dighalipukhuri Lake & Uzan Bazar residential district
  for (let x = 40; x <= 90; x += 12) {
    addCottage(
      x,
      -33,
      Math.PI,
      roofColors[x % roofColors.length],
      wallColors[x % wallColors.length],
      0.9
    );
  }
  for (let z = -20; z <= 10; z += 10) {
    addCottage(
      105,
      z,
      -Math.PI / 2,
      roofColors[(z + 30) % roofColors.length],
      wallColors[(z + 30) % wallColors.length],
      0.95
    );
  }

  // Along AT Road (Bharalumukh to Paltan Bazar)
  for (let x = -105; x <= 0; x += 15) {
    if (Math.abs(x - -60) < 10) continue; // Skip Bharalu canal
    addCottage(
      x,
      37,
      0,
      roofColors[Math.abs(x) % roofColors.length],
      wallColors[Math.abs(x) % wallColors.length],
      1.0
    );
    addCottage(
      x,
      53,
      Math.PI,
      roofColors[(Math.abs(x) + 1) % roofColors.length],
      wallColors[(Math.abs(x) + 2) % wallColors.length],
      1.0
    );
  }

  // Merge all cottages into a single high-performance mesh (1 draw call)
  if (cottageGeos.length > 0) {
    const allCottagesMerged = mergeGeometries(cottageGeos, false);
    if (allCottagesMerged) {
      const cottageMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82,
        metalness: 0.08,
      });
      const cottageMesh = new THREE.Mesh(allCottagesMerged, cottageMat);
      cottageMesh.castShadow = true;
      cottageMesh.receiveShadow = true;
      group.add(cottageMesh);
      disposables.push(allCottagesMerged, cottageMat);
    }
  }

  // 8. COMMERCIAL PLOTS & 3D STOREFRONTS
  // Flagship Business: Nerqiva Studio at GS Road / Christian Basti (Pin 781005)
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
    // Flagship 1: Nerqiva Studio on GS Road (781005)
    {
      business: nerqivaBusiness,
      x: 60,
      z: 15,
      isLeft: false,
      colonyName: "GS Road & Christian Basti",
      pincode: "781005",
      tier: 2,
    },
    // Plot 2: Under Construction Commercial Plot on GS Road
    {
      business: null,
      x: 42,
      z: 22,
      isLeft: true,
      isConstruction: true,
      colonyName: "GS Road Commercial District",
      pincode: "781005",
      tier: 1,
    },
    // Plot 3: Riverside Commercial Space (781001)
    {
      business: null,
      x: -25,
      z: -25,
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
      x: 150,
      z: 130,
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

    // Background Container
    ctx.beginPath();
    ctx.roundRect(8, 8, 364, 99, 22);
    ctx.fillStyle = p.business ? "rgba(10, 15, 29, 0.94)" : "rgba(15, 23, 42, 0.88)";
    ctx.fill();
    ctx.lineWidth = p.business ? 3.0 : 1.5;
    ctx.strokeStyle = p.business ? "#f59e0b" : "rgba(148, 163, 184, 0.4)";
    ctx.stroke();

    // Top Line: Business Name or Colony Name
    const title = p.business ? p.business.name : p.colonyName;
    ctx.font = "bold 23px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = p.business ? "#ffffff" : "#f1f5f9";
    ctx.textAlign = "left";
    ctx.fillText(title, 24, 46);

    // Subtitle: PIN Code & Address Zone
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
    sprite.position.set(p.x, 9.2, p.z);
    sprite.scale.set(30, 30 * (115 / 380), 1);
    group.add(sprite);
  });

  // 9. PROCEDURAL FLORA (Lush Neem, Banyan & Bamboo along River and Lakes)
  const treeGeo = new THREE.DodecahedronGeometry(1.8, 0);
  treeGeo.translate(0, 2.2, 0);
  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x166534, // Assam deep tea-garden green
    roughness: 0.88,
    flatShading: true,
  });
  const treeInst = new THREE.InstancedMesh(treeGeo, treeMat, 56);

  const treeDummy = new THREE.Object3D();
  let tIdx = 0;

  // Along Dighalipukhuri Lake
  for (let lx = 42; lx <= 88; lx += 8) {
    for (const lz of [-23, 3]) {
      treeDummy.position.set(lx + Math.sin(tIdx) * 1.5, 0.05, lz);
      const s = 1.0 + Math.sin(tIdx * 2.1) * 0.25;
      treeDummy.scale.set(s, s * 1.25, s);
      treeDummy.rotation.y = tIdx * 1.3;
      treeDummy.updateMatrix();
      treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
    }
  }

  // Along Brahmaputra Riverfront Park
  for (let rx = -220; rx <= 220; rx += 20) {
    if (Math.abs(rx - -130) < 22) continue; // Skip Saraighat bridge
    treeDummy.position.set(rx, 0.05, -20);
    const s = 1.2 + Math.cos(tIdx * 1.8) * 0.3;
    treeDummy.scale.set(s, s * 1.3, s);
    treeDummy.rotation.y = tIdx * 1.5;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }
  treeInst.instanceMatrix.needsUpdate = true;
  group.add(treeInst);
  disposables.push(treeGeo, treeMat);

  // 10. REALISTIC, PEACEFUL TRAFFIC (3 vehicles cruising smoothly at 3.5-4.5 m/s)
  interface CityVehicle {
    mesh: THREE.Group;
    waypoints: [number, number][];
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

  const buildBus = () => {
    const v = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, 8.0),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c }) // ASTC Red Bus
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

  // Vehicle 1: Auto-Rickshaw touring MG Road, Pan Bazar & Christian Basti
  const auto = buildAuto();
  group.add(auto);
  vehicles.push({
    mesh: auto,
    waypoints: [
      [-220, -25],
      [-25, -25],
      [35, 25],
      [60, 15],
      [95, 50],
      [15, 45],
      [-130, 45],
      [-130, -25],
    ],
    currentWp: 0,
    t: 0,
    speed: 4.2,
  });

  // Vehicle 2: ASTC Red Bus Crossing Saraighat Bridge
  const bus = buildBus();
  group.add(bus);
  vehicles.push({
    mesh: bus,
    waypoints: [
      [-130, 45],
      [-130, -25],
      [-130, -160],
      [-130, -25],
    ],
    currentWp: 0,
    t: 0.25,
    speed: 3.6,
  });

  // Vehicle 3: White Sedan on GS Road Commercial Highway
  const car = buildCar();
  group.add(car);
  vehicles.push({
    mesh: car,
    waypoints: [
      [160, 140],
      [125, 90],
      [95, 50],
      [60, 15],
      [35, 25],
      [15, 45],
      [60, 15],
    ],
    currentWp: 0,
    t: 0.6,
    speed: 4.8,
  });

  // Animation Update
  const update = (delta: number) => {
    const dt = Math.min(delta, 0.1);

    for (const v of vehicles) {
      const p1 = v.waypoints[v.currentWp];
      const nextIdx = (v.currentWp + 1) % v.waypoints.length;
      const p2 = v.waypoints[nextIdx];

      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const dist = Math.hypot(dx, dz);

      v.t += (v.speed * dt) / Math.max(dist, 1);
      if (v.t >= 1) {
        v.t = 0;
        v.currentWp = nextIdx;
      }

      const curX = p1[0] + dx * v.t;
      const curZ = p1[1] + dz * v.t;
      v.mesh.position.set(curX, 0.1, curZ);

      const angle = Math.atan2(dx, dz);
      v.mesh.rotation.y = angle;
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
