import * as THREE from "three";
import { CategoryId, FacadeTheme } from "@/types";
import { FACADE_THEME_PRESETS } from "@/lib/constants/plotUpgrades";

/**
 * Contact shadow plane helper to give tangible grounding to 3D objects
 */
export function createGroundShadow(width: number, length: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, length);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(geo, mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  return shadow;
}

/**
 * Builds authentic paved 3D asphalt avenue with sidewalks, painted curbs,
 * dashed centerline, and zebra crossings connecting the town street.
 */
export function createPavedStreetMesh(length = 280, roadWidth = 10, sidewalkWidth = 3.5): THREE.Group {
  const street = new THREE.Group();
  street.name = "high_street_paved_avenue";

  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }); // Dark slate asphalt
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 }); // Concrete pavers
  const yellowCurbMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 }); // Safety yellow
  const blackCurbMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 }); // Black curb
  const whitePaintMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const turfMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.88 }); // Lush lawn green

  // 0. High Street Manicured Turf Corridor (spans the commercial district only, preserving authentic OSM everywhere else)
  const corridorTurf = new THREE.Mesh(
    new THREE.BoxGeometry(length + 30, 0.04, roadWidth + sidewalkWidth * 2 + 52),
    turfMat
  );
  corridorTurf.position.set(0, 0.02, 0);
  street.add(corridorTurf);

  // 1. Asphalt Road Surface (slight elevation y = 0.08 above terrain)
  const roadGeo = new THREE.BoxGeometry(length, 0.16, roadWidth);
  const road = new THREE.Mesh(roadGeo, asphaltMat);
  road.position.set(0, 0.08, 0);
  street.add(road);

  // 2. Dashed White Center Line
  const dashCount = Math.floor(length / 6);
  for (let i = 0; i < dashCount; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, 0.22), whitePaintMat);
    dash.position.set(-length / 2 + 3.0 + i * 6.0, 0.17, 0);
    street.add(dash);
  }

  // 3. Yellow/Black Checkered Curbs along both edges
  const curbSegments = Math.floor(length / 2);
  for (const side of [-1, 1]) {
    const curbZ = side * (roadWidth / 2 + 0.18);
    for (let i = 0; i < curbSegments; i++) {
      const curbMat = i % 2 === 0 ? yellowCurbMat : blackCurbMat;
      const curb = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.36), curbMat);
      curb.position.set(-length / 2 + 1.0 + i * 2.0, 0.12, curbZ);
      street.add(curb);
    }

    // 4. Concrete Sidewalk / Footpath on each side
    const walkZ = side * (roadWidth / 2 + 0.36 + sidewalkWidth / 2);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, sidewalkWidth), sidewalkMat);
    walk.position.set(0, 0.1, walkZ);
    street.add(walk);
  }

  // 5. Zebra Pedestrian Crossing near the center (X = 0)
  for (let s = -3; s <= 3; s++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, roadWidth - 1.2), whitePaintMat);
    stripe.position.set(s * 1.4, 0.17, 0);
    street.add(stripe);
  }

  // 6. Smooth rounded cul-de-sac transition caps at both ends
  for (const endSign of [-1, 1]) {
    const endCap = new THREE.Mesh(
      new THREE.CylinderGeometry(roadWidth / 2 + sidewalkWidth, roadWidth / 2 + sidewalkWidth, 0.16, 24, 1, false, 0, Math.PI),
      asphaltMat
    );
    endCap.rotation.z = Math.PI / 2;
    endCap.rotation.x = endSign === 1 ? -Math.PI / 2 : Math.PI / 2;
    endCap.position.set(endSign * (length / 2), 0.08, 0);
    street.add(endCap);
  }

  return street;
}

/**
 * Helper to construct bold, glowing 3D architectural letters for "NERQIVA"
 */
function createLetter3D(char: string, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const d = 0.18; // Dimensional depth
  const t = 0.09; // Clean architectural stroke thickness
  const h = 0.90; // Letter height
  const w = 0.54; // Letter width

  const addBar = (bx: number, by: number, bw: number, bh: number, rotZ = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, d), mat);
    mesh.position.set(bx, by, 0);
    if (rotZ !== 0) mesh.rotation.z = rotZ;
    g.add(mesh);
  };

  switch (char) {
    case "N": {
      // Clean left & right vertical uprights
      addBar(-w / 2 + t / 2, h / 2, t, h);
      addBar(w / 2 - t / 2, h / 2, t, h);
      // Diagonal from top-left to bottom-right (\ slope, positive rotation in Three.js)
      const spanW = w - t;
      const diagLenN = Math.hypot(spanW, h);
      const angleN = Math.atan2(spanW, h);
      addBar(0, h / 2, t, diagLenN, angleN);
      break;
    }
    case "E": {
      addBar(-w / 2 + t / 2, h / 2, t, h);
      addBar(t / 2, h - t / 2, w - t, t);
      addBar(0, h * 0.5, w * 0.72, t);
      addBar(t / 2, t / 2, w - t, t);
      break;
    }
    case "R": {
      // Left vertical stem
      addBar(-w / 2 + t / 2, h / 2, t, h);
      // Upper loop (top, right, bottom)
      addBar(t / 2, h - t / 2, w - t, t);
      addBar(w / 2 - t / 2, h * 0.72, t, h * 0.44);
      addBar(t / 2, h * 0.5, w - t, t);
      // Diagonal leg from loop junction to bottom right (\ slope, positive rotation)
      const legW = w * 0.48;
      const legH = h * 0.48;
      const diagLenR = Math.hypot(legW, legH);
      const angleR = Math.atan2(legW, legH);
      addBar(w * 0.20, h * 0.24, t, diagLenR, angleR);
      break;
    }
    case "Q": {
      // O-ring bounds
      addBar(-w / 2 + t / 2, h / 2, t, h);
      addBar(w / 2 - t / 2, h / 2, t, h);
      addBar(0, h - t / 2, w, t);
      addBar(0, t / 2, w, t);
      // Clean architectural Q tail breaking through bottom-right (\ slope, positive rotation)
      addBar(w * 0.25, t * 0.3, t * 1.1, h * 0.38, Math.PI / 4);
      break;
    }
    case "I": {
      addBar(0, h / 2, t, h);
      addBar(0, h - t / 2, w * 0.7, t);
      addBar(0, t / 2, w * 0.7, t);
      break;
    }
    case "V": {
      const diagLenV = Math.hypot(w / 2, h);
      const angleV = Math.atan2(w / 2, h);
      addBar(-w / 4, h / 2, t, diagLenV, angleV);
      addBar(w / 4, h / 2, t, diagLenV, -angleV);
      break;
    }
    case "A": {
      const diagLenA = Math.hypot(w / 2, h);
      const angleA = Math.atan2(w / 2, h);
      addBar(-w / 4, h / 2, t, diagLenA, -angleA);
      addBar(w / 4, h / 2, t, diagLenA, angleA);
      addBar(0, h * 0.38, w * 0.55, t);
      break;
    }
  }
  return g;
}

/**
 * Builds automated dynamic access road / commercial driveway connecting
 * Nerqiva Studio directly to the nearest mapped OpenStreetMap road network.
 * Features smooth alignment curvature (-18.65° bend) and width narrowing (5.6m to 3.6m)
 * that perfectly lines up with the OpenStreetMap road lines, feathering height and color
 * directly into the 2D basemap street corridor with ZERO breaking points and ZERO open cuts.
 */
/**
 * Builds automated, seamlessly blended access road connecting Nerqiva Studio directly to OpenStreetMap.
 * Features:
 * - Mathematical monotonic cubic Bezier transition curve aligning heading directly with the OSM street.
 * - Width smoothly narrows from 5.6m (studio gateway) to 3.6m (OSM street casing spacing).
 * - Height feathers down to 0.0001m (flush with terrain plane).
 * - 4-component RGBA vertex color and alpha dissolution: seamlessly dissolves into the underlying vector street.
 * - Continuous dual casing borders matching OpenStreetMap casing lines with zero visible seam or open cut.
 * - Raised granite curbs, light sidewalks, and modern architectural streetlights near the studio grounds.
 */
export function createAccessRoadConnectorMesh(
  totalLength = 89.35,
  startOffset = 14.0,
  roadWidth = 5.6,
  sidewalkWidth = 1.1,
  isDark = false
): THREE.Group {
  const roadGroup = new THREE.Group();
  roadGroup.name = "automated_road_connector";

  const curbMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x475569 : 0x64748b, roughness: 0.8 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x1e293b : 0xe2e8f0, roughness: 0.75 });

  // 1. Driveway Entrance Apron at Gateway (14m)
  const apronGeo = new THREE.BoxGeometry(roadWidth + 2.0, 0.10, 2.5);
  const apronMesh = new THREE.Mesh(
    apronGeo,
    new THREE.MeshStandardMaterial({ color: isDark ? 0x0f172a : 0x1e293b, roughness: 0.85 })
  );
  apronMesh.position.set(0, 0.05, startOffset);
  roadGroup.add(apronMesh);

  // 2. Gateway Entrance Curbs & Modern Streetlights Framing the Studio Portal
  const gatewaySpan = 6.0;
  const gatewayCenterZ = startOffset + gatewaySpan / 2;

  for (const side of [-1, 1]) {
    const curbX = side * (roadWidth / 2 + 0.12);
    const curbGeo = new THREE.BoxGeometry(0.24, 0.14, gatewaySpan);
    const curbMesh = new THREE.Mesh(curbGeo, curbMat);
    curbMesh.position.set(curbX, 0.07, gatewayCenterZ);
    roadGroup.add(curbMesh);

    const walkX = side * (roadWidth / 2 + 0.24 + sidewalkWidth / 2);
    const walkGeo = new THREE.BoxGeometry(sidewalkWidth, 0.12, gatewaySpan);
    const walkMesh = new THREE.Mesh(walkGeo, sidewalkMat);
    walkMesh.position.set(walkX, 0.06, gatewayCenterZ);
    roadGroup.add(walkMesh);

    // Modern Streetlight at the entrance gateway
    const lamp = createStreetLightMesh();
    lamp.scale.set(0.9, 0.9, 0.9);
    lamp.position.set(side * (roadWidth / 2 + sidewalkWidth + 0.3), 0, startOffset + 3.0);
    lamp.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    roadGroup.add(lamp);
  }

  return roadGroup;
}

/**
 * Builds authentic Ultra-Premium Architectural Flagship Pavilion for NERQIVA Studio.
 * Flagship Business Pavilion of Nerqiva Studio in North Guwahati, Assam.
 * Features:
 * - Cantilevered 2-story glass & composite architecture
 * - Luminous 3D dimensional "NERQIVA" architectural signage
 * - Floor-to-ceiling panoramic showroom with glowing workstation screens
 * - Reflecting water pool with stepping stones
 * - Runway LED ground strip lights
 * - Sculpted electric sports coupe in private carport
 * - Rooftop sky-terrace with teak pergola, lounge, & solar canopy
 */
export function createNerqivaVillaMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = "nerqiva_3d_villa";

  // Luxury Architectural Materials
  const basaltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 }); // Charcoal basalt plinth
  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 }); // Emerald turf
  const drivewayMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 }); // Honed dark slate pavers
  const titaniumWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.1 }); // White composite panels
  const teakMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 }); // Golden architectural teak
  const darkFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 }); // Charcoal framing
  const showroomGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.05,
    metalness: 0.3,
    transparent: true,
    opacity: 0.86,
  }); // Cyan showroom glass
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.82,
  }); // Reflecting water pool
  const amberNeonMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 2.8,
  }); // Glowing amber neon for NERQIVA signage & cove lights
  const runwayLedMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: new THREE.Color(0xfbbf24),
    emissiveIntensity: 2.2,
  }); // Runway ground linear LED strips
  const cyanScreenMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 2.2,
  }); // Interior developer monitor screens
  const sportsCarMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.15,
    metalness: 0.7,
  }); // Iridescent pearl white finish
  const carGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.9,
  }); // Dark panoramic glass canopy
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: new THREE.Color(0xdc2626),
    emissiveIntensity: 2.5,
  }); // Full-width red LED lightbar
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 3.0,
  }); // Front LED headlights
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.2,
    metalness: 0.85,
  }); // Sapphire solar photovoltaic array
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: new THREE.Color(0xd97706),
    emissiveIntensity: 1.6,
    transparent: true,
    opacity: 0.65,
  }); // Base landmark beacon ring
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 2.0,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.35,
    metalness: 0.8,
  }); // Carbon fiber aero trim / chassis
  const serverGreenMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: new THREE.Color(0x16a34a),
    emissiveIntensity: 2.8,
  }); // Enterprise server green activity LEDs
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.3,
    metalness: 0.4,
  }); // Brembo-style red brake calipers
  const turbineRimMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.2,
    metalness: 0.85,
  }); // Turbine alloy rims
  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.85,
    metalness: 0.1,
  }); // Matte black tire rubber
  const whiteMarkingMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.4,
  }); // Parking bay alignment lines
  const clearShowroomGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.06,
    metalness: 0.25,
    transparent: true,
    opacity: 0.30,
  }); // Crystal-clear architectural showroom glass so real interior shines through
  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.7,
    metalness: 0.2,
  }); // Dark obsidian studio interior backdrop

  // =========================================================================
  // ARCHITECTURAL SITE PLAN (Plot: x ∈ [-13, +13] = 26m, z ∈ [-10, +10] = 20m)
  // Every footprint verified with non-overlapping bounding boxes on all sides:
  //   • Ground Floor Studio:   x ∈ [-9.5, +4.5],  z ∈ [-8.2, +1.8]
  //   • Upper Executive Wing:  x ∈ [-10.0, +5.5], z ∈ [-8.2, +3.4]
  //   • Executive Carport+Car: x ∈ [+6.6, +11.4], z ∈ [-0.4, +6.0] (2.1m clear of building!)
  //   • Reflecting Water Pool: x ∈ [-10.5, -5.9], z ∈ [+3.8, +8.2] (2.0m clear of building!)
  //   • Arrival Forecourt:     x ∈ [-4.2, +4.2],  z ∈ [+1.8, +10.0] + carport turn-in apron
  // =========================================================================

  // 0. Soft Ground Contact Shadow
  group.add(createGroundShadow(30, 24));

  // 1. Charcoal Basalt Plinth Base (26m x 20m, y: 0 -> 0.35)
  const plinthGeo = new THREE.BoxGeometry(26, 0.35, 20);
  const plinth = new THREE.Mesh(plinthGeo, basaltMat);
  plinth.position.set(0, 0.175, 0);
  group.add(plinth);

  // Architectural Perimeter Plinth Accent Lighting Ring
  const beaconGeo = new THREE.BoxGeometry(26.4, 0.08, 20.4);
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 0.04, 0);
  group.add(beacon);

  // 2. Manicured Emerald Lawn Inset (sits cleanly on plinth: y: 0.35 -> 0.40)
  const lawnGeo = new THREE.BoxGeometry(25.3, 0.05, 19.3);
  const lawn = new THREE.Mesh(lawnGeo, lawnMat);
  lawn.position.set(0, 0.375, 0);
  group.add(lawn);

  // 3. Honed Slate Arrival Driveway & Carport Turn-In Apron (y: 0.40 -> 0.44)
  // Main arrival court connecting front gate (z=+10.0) directly to studio entrance (z=+1.8)
  const drive = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.04, 8.2), drivewayMat);
  drive.position.set(0, 0.42, 5.9);
  group.add(drive);

  // Paved turn-in apron connecting main arrival court seamlessly to the right-side carport bay
  const carportApron = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.04, 3.2), drivewayMat);
  carportApron.position.set(7.8, 0.42, 7.6);
  group.add(carportApron);

  // Runway linear LED ground strips flanking the main driveway (clear of turn-in apron)
  for (let r = 0; r < 4; r++) {
    const ledL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 1.1), runwayLedMat);
    ledL.position.set(-4.08, 0.455, 3.2 + r * 1.85);
    group.add(ledL);
  }
  for (let r = 0; r < 2; r++) {
    const ledR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 1.1), runwayLedMat);
    ledR.position.set(4.08, 0.455, 3.2 + r * 1.85);
    group.add(ledR);
  }

  // 4. Architectural Reflecting Water Pool (Front-Left Forecourt: x ∈ [-10.5, -5.9], z ∈ [+3.8, +8.2])
  const poolGroup = new THREE.Group();
  poolGroup.position.set(-8.2, 0.40, 6.0);

  const poolBorder = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.24, 4.4), basaltMat);
  poolBorder.position.y = 0.12;
  poolGroup.add(poolBorder);

  const water = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 4.0), waterMat);
  water.position.y = 0.18;
  poolGroup.add(water);

  // Floating honed slate stepping stones across water
  for (let s = -1; s <= 1; s++) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.85), drivewayMat);
    stone.position.set(s * 1.25, 0.22, 0);
    poolGroup.add(stone);
  }
  group.add(poolGroup);

  // 5. Dedicated Executive Carport & Sculpted Electric Cyber Coupe
  // Placed cleanly in Right Courtyard: x ∈ [+6.6, +11.4], z ∈ [-0.4, +6.0] (2.1m clear of ground floor, 1.1m clear of upper wing!)
  const carGroup = new THREE.Group();
  carGroup.position.set(9.0, 0.40, 2.8);

  // 5a. Honed Basalt Parking Pad with Bay Guide Lines & Rear Wheel Stops
  const parkingPad = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 6.4), basaltMat);
  parkingPad.position.set(0, 0.03, 0);
  carGroup.add(parkingPad);

  for (const bx of [-1.85, 1.85]) {
    const bayStripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 5.2), whiteMarkingMat);
    bayStripe.position.set(bx, 0.07, 0);
    carGroup.add(bayStripe);
  }

  // Rear wheel stops (car faces +Z toward front gate)
  for (const wx of [-0.95, 0.95]) {
    const wheelStop = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.20), darkFrameMat);
    wheelStop.position.set(wx, 0.12, -2.35);
    carGroup.add(wheelStop);
  }

  // 5b. Open Cantilevered Architectural Canopy (pylons on outer-right side so building-side & front are 100% open)
  for (const pz of [-2.2, 2.0]) {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.30, 3.30, 0.42), darkFrameMat);
    pylon.position.set(2.15, 1.65, pz);
    carGroup.add(pylon);

    // Glowing vertical cyan LED accent on inner pylon face
    const pylonLed = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.20, 0.05), cyanScreenMat);
    pylonLed.position.set(1.98, 1.65, pz);
    carGroup.add(pylonLed);

    // Structural cantilever beam spanning cleanly across the bay
    const beam = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.20, 0.26), darkFrameMat);
    beam.position.set(0.08, 3.22, pz);
    carGroup.add(beam);
  }

  // Slim cantilevered aero roof slab with solar photovoltaic glass inlay
  const carportRoof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.14, 6.4), darkFrameMat);
  carportRoof.position.set(0, 3.38, 0);
  carGroup.add(carportRoof);

  const carportSolar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 5.8), solarMat);
  carportSolar.position.set(0, 3.47, 0);
  carGroup.add(carportSolar);

  // Flush warm amber underside LED downlights illuminating the sports coupe
  for (const lz of [-1.6, 0, 1.6]) {
    for (const lx of [-0.85, 0.85]) {
      const downlight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.24), amberNeonMat);
      downlight.position.set(lx, 3.29, lz);
      carGroup.add(downlight);
    }
  }

  // 5c. Sculpted Modern Electric Cyber / Sports Coupe (sits cleanly on pad top y = 0.06, facing +Z)
  const coupeGroup = new THREE.Group();
  coupeGroup.position.set(0, 0.06, 0.05);

  // Carbon lower underbody & aerodynamic side skirts
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.18, 4.4), carbonMat);
  chassis.position.set(0, 0.26, 0);
  coupeGroup.add(chassis);

  // Rear aerodynamic diffuser fins
  for (const dfx of [-0.55, 0, 0.55]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.42), carbonMat);
    fin.position.set(dfx, 0.18, -2.08);
    coupeGroup.add(fin);
  }

  // Front aerodynamic splitter
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.06, 0.46), carbonMat);
  splitter.position.set(0, 0.18, 2.08);
  coupeGroup.add(splitter);

  // Sloping sculpted front hood wedge (positive rotation.x lowers the +Z nose!)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.28, 1.65), sportsCarMat);
  hood.rotation.x = 0.08;
  hood.position.set(0, 0.49, 1.32);
  coupeGroup.add(hood);

  // Sculpted mid-body doors & side aero intakes
  const midBody = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.40, 1.75), sportsCarMat);
  midBody.position.set(0, 0.56, -0.15);
  coupeGroup.add(midBody);

  for (const sx of [-1.02, 1.02]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.20, 0.55), carbonMat);
    intake.position.set(sx, 0.52, -0.55);
    coupeGroup.add(intake);
  }

  // Sculpted rear decklid & active ducktail aero spoiler
  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.36, 1.30), sportsCarMat);
  rearDeck.position.set(0, 0.58, -1.42);
  coupeGroup.add(rearDeck);

  const ducktail = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.08, 0.24), sportsCarMat);
  ducktail.rotation.x = -0.18;
  ducktail.position.set(0, 0.80, -1.98);
  coupeGroup.add(ducktail);

  // Solid dark cockpit cabin core (prevents hollow see-through gaps from any angle)
  const cabinCore = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.42, 1.55), carbonMat);
  cabinCore.position.set(0, 0.92, -0.22);
  coupeGroup.add(cabinCore);

  // Teardrop panoramic glass greenhouse (correct Three.js X-rotation signs!)
  // Front windshield slopes UP from +Z hood to roof (+rotation.x lowers +Z edge)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.07, 1.05), carGlassMat);
  windshield.rotation.x = 0.54;
  windshield.position.set(0, 0.90, 0.62);
  coupeGroup.add(windshield);

  // Panoramic gloss roof glass
  const roofGlass = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.08, 1.10), carGlassMat);
  roofGlass.position.set(0, 1.15, -0.18);
  coupeGroup.add(roofGlass);

  // Fastback sloping rear window (-rotation.x lowers -Z rear edge toward decklid)
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.07, 1.15), carGlassMat);
  rearGlass.rotation.x = -0.44;
  rearGlass.position.set(0, 0.94, -1.04);
  coupeGroup.add(rearGlass);

  // Side cabin windows & sleek digital camera side mirrors with amber turn LEDs
  for (const cx of [-0.82, 0.82]) {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 1.38), carGlassMat);
    sideGlass.position.set(cx, 0.94, -0.22);
    coupeGroup.add(sideGlass);

    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.06, 0.12), darkFrameMat);
    mirror.position.set(cx > 0 ? cx + 0.12 : cx - 0.12, 0.84, 0.55);
    coupeGroup.add(mirror);

    const mirrorLed = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.08), amberNeonMat);
    mirrorLed.position.set(cx > 0 ? cx + 0.22 : cx - 0.22, 0.84, 0.55);
    coupeGroup.add(mirrorLed);
  }

  // Razor-Sharp Front Blade LED Headlights & Rear Horizon Crimson Taillight Bar
  const frontBlade = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.06, 0.06), headlightMat);
  frontBlade.position.set(0, 0.46, 2.16);
  coupeGroup.add(frontBlade);

  for (const hx of [-0.82, 0.82]) {
    const eyeBrow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.32), headlightMat);
    eyeBrow.position.set(hx, 0.50, 2.00);
    coupeGroup.add(eyeBrow);
  }

  const rearBlade = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.06, 0.06), taillightMat);
  rearBlade.position.set(0, 0.72, -2.10);
  coupeGroup.add(rearBlade);

  // Turbine Alloy Wheels with High-Performance Red Brake Calipers (tucked cleanly in fenders)
  for (const wx of [-1.02, 1.02]) {
    for (const wz of [-1.32, 1.38]) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20), rubberMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, 0.34, wz);
      coupeGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.26, 12), turbineRimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.34, wz);
      coupeGroup.add(rim);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.28, 8), darkFrameMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, 0.34, wz);
      coupeGroup.add(hub);

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.10), caliperMat);
      caliper.position.set(wx > 0 ? wx - 0.07 : wx + 0.07, 0.39, wz + 0.09);
      coupeGroup.add(caliper);
    }
  }

  carGroup.add(coupeGroup);

  // 5d. Modern EV Fast-Charging Pedestal (inner-left corner of bay, clear of car doors & building)
  const chargerPost = new THREE.Mesh(new THREE.BoxGeometry(0.30, 1.35, 0.24), darkFrameMat);
  chargerPost.position.set(-2.05, 0.73, 1.9);
  carGroup.add(chargerPost);

  const chargerScreen = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.30, 0.04), cyanScreenMat);
  chargerScreen.position.set(-2.05, 1.08, 2.03);
  carGroup.add(chargerScreen);

  group.add(carGroup);

  // 6. Main Ground Floor Technical Studio Showroom — REAL HOLLOW INTERIOR!
  // Footprint: x ∈ [-9.5, +4.5] (14.0m wide, center -2.5), z ∈ [-8.2, +1.8] (10.0m deep, center -3.2)
  const gPlinth = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.30, 10.4), basaltMat);
  gPlinth.position.set(-2.5, 0.55, -3.2);
  group.add(gPlinth);

  // Interior Dark Slate Showroom Floor
  const showroomFloor = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.08, 9.6), interiorWallMat);
  showroomFloor.position.set(-2.5, 0.74, -3.2);
  group.add(showroomFloor);

  // Structural Perimeter Walls (Hollow room so interior tech setup is genuinely visible through front glass!)
  // Rear Wall (z = -8.0)
  const gfBackWall = new THREE.Mesh(new THREE.BoxGeometry(14.0, 3.95, 0.40), titaniumWhiteMat);
  gfBackWall.position.set(-2.5, 2.675, -8.0);
  group.add(gfBackWall);

  // Rear exterior architectural ribbon window (polished back elevation)
  const gfBackGlass = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.9, 0.10), showroomGlassMat);
  gfBackGlass.position.set(-2.5, 2.75, -8.22);
  group.add(gfBackGlass);

  // Interior Dark Tech Feature Wall with Cyan LED Strip (visible straight through showroom glass!)
  const interiorBackdrop = new THREE.Mesh(new THREE.BoxGeometry(13.2, 3.7, 0.08), interiorWallMat);
  interiorBackdrop.position.set(-2.5, 2.65, -7.74);
  group.add(interiorBackdrop);

  const interiorLedBar = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 0.06), cyanScreenMat);
  interiorLedBar.position.set(-2.5, 3.45, -7.68);
  group.add(interiorLedBar);

  // Left Wall (x = -9.3) + Left Side Window
  const gfLeftWall = new THREE.Mesh(new THREE.BoxGeometry(0.40, 3.95, 10.0), titaniumWhiteMat);
  gfLeftWall.position.set(-9.3, 2.675, -3.2);
  group.add(gfLeftWall);

  const gfLeftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.0, 5.2), showroomGlassMat);
  gfLeftGlass.position.set(-9.52, 2.75, -3.2);
  group.add(gfLeftGlass);

  // Right Wall (x = +4.3) + Architectural Glass Window Facing Carport
  const gfRightWall = new THREE.Mesh(new THREE.BoxGeometry(0.40, 3.95, 10.0), titaniumWhiteMat);
  gfRightWall.position.set(4.3, 2.675, -3.2);
  group.add(gfRightWall);

  const gfRightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.2, 5.0), showroomGlassMat);
  gfRightGlass.position.set(4.52, 2.75, -3.2);
  group.add(gfRightGlass);

  // Ground Floor Ceiling Slab
  const gfCeiling = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.20, 10.0), titaniumWhiteMat);
  gfCeiling.position.set(-2.5, 4.55, -3.2);
  group.add(gfCeiling);

  // Front-Left Solid Wall Accent (x ∈ [-9.5, -6.3], behind golden teak louvers)
  const gfFrontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.95, 0.35), titaniumWhiteMat);
  gfFrontLeftWall.position.set(-7.9, 2.675, 1.62);
  group.add(gfFrontLeftWall);

  // Vertical Architectural Golden Teak Louvers (Left Front Facade)
  for (let s = 0; s < 7; s++) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.75, 0.20), teakMat);
    louver.position.set(-9.15 + s * 0.44, 2.68, 1.88);
    group.add(louver);
  }

  // 6a. High-Tech Enterprise Server Rack (100% Visible Inside Showroom!)
  const serverRack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.7, 0.85), carbonMat);
  serverRack.position.set(-5.0, 2.13, -3.2);
  group.add(serverRack);

  const rackGlass = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.5, 0.04), clearShowroomGlassMat);
  rackGlass.position.set(-5.0, 2.13, -2.75);
  group.add(rackGlass);

  for (let u = 0; u < 7; u++) {
    const slotY = 1.05 + u * 0.34;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.20, 0.04), darkFrameMat);
    blade.position.set(-5.0, slotY, -2.78);
    group.add(blade);

    for (let ledI = 0; ledI < 4; ledI++) {
      const ledM = ledI === 0 ? serverGreenMat : ledI === 1 ? cyanScreenMat : ledI === 2 ? serverGreenMat : amberNeonMat;
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), ledM);
      led.position.set(-5.36 + ledI * 0.24, slotY, -2.74);
      group.add(led);
    }
  }

  // 6b. Holographic Architecture Display Podium (Right inside front panoramic glass)
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.85, 16), darkFrameMat);
  podium.position.set(-1.8, 1.20, -0.2);
  group.add(podium);

  const holoBase = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.05, 16), cyanScreenMat);
  holoBase.position.set(-1.8, 1.65, -0.2);
  group.add(holoBase);

  const holoPrism = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), cyanScreenMat);
  holoPrism.position.set(-1.8, 2.02, -0.2);
  group.add(holoPrism);

  // 6c. Interior Ultrawide Developer Workstations (Clearly visible through front glass)
  for (let d = 0; d < 2; d++) {
    const wx = -2.8 + d * 2.4;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.85), darkFrameMat);
    desk.position.set(wx, 1.55, -3.2);
    group.add(desk);

    // Desk legs
    for (const lx of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.77, 0.75), darkFrameMat);
      leg.position.set(wx + lx, 1.16, -3.2);
      group.add(leg);
    }

    // Ultrawide glowing developer monitor
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.48, 0.05), cyanScreenMat);
    monitor.position.set(wx, 2.05, -3.35);
    group.add(monitor);
  }

  // 6d. Panoramic Floor-to-Ceiling Showroom Glass Front (x ∈ [-6.3, +1.0], z = +1.76)
  const glassW = 7.3;
  const glassH = 3.55;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(glassW, glassH, 0.08), clearShowroomGlassMat);
  glass.position.set(-2.65, 2.60, 1.76);
  group.add(glass);

  // Architectural dark steel frame & vertical mullions
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(glassW + 0.16, 0.12, 0.22), darkFrameMat);
  frameTop.position.set(-2.65, 4.40, 1.76);
  group.add(frameTop);

  const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(glassW + 0.16, 0.12, 0.22), darkFrameMat);
  frameBottom.position.set(-2.65, 0.80, 1.76);
  group.add(frameBottom);

  for (const mx of [-6.3, -3.87, -1.43, 1.0]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.10, glassH + 0.08, 0.18), darkFrameMat);
    mullion.position.set(mx, 2.60, 1.76);
    group.add(mullion);
  }

  // 6e. Cantilevered Black Steel Entrance Portal & Double Glass Doors (x ∈ [+1.0, +4.5], center +2.75)
  const portalL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 3.65, 0.42), darkFrameMat);
  portalL.position.set(1.20, 2.62, 1.84);
  group.add(portalL);

  const portalR = new THREE.Mesh(new THREE.BoxGeometry(0.38, 3.65, 0.42), darkFrameMat);
  portalR.position.set(4.30, 2.62, 1.84);
  group.add(portalR);

  const portalTop = new THREE.Mesh(new THREE.BoxGeometry(3.48, 0.35, 0.42), darkFrameMat);
  portalTop.position.set(2.75, 4.30, 1.84);
  group.add(portalTop);

  const doubleDoors = new THREE.Mesh(new THREE.BoxGeometry(2.72, 3.30, 0.08), clearShowroomGlassMat);
  doubleDoors.position.set(2.75, 2.45, 1.84);
  group.add(doubleDoors);

  // Teak Architectural Door Handles
  for (const hx of [2.52, 2.98]) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.14), teakMat);
    handle.position.set(hx, 2.25, 1.94);
    group.add(handle);
  }

  // Entrance Canopy Overhang with Recessed Warm Downlights
  const entranceCanopy = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.18, 2.0), darkFrameMat);
  entranceCanopy.position.set(2.75, 4.42, 2.70);
  group.add(entranceCanopy);

  for (const lx of [1.85, 3.65]) {
    const downlight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.24), amberNeonMat);
    downlight.position.set(lx, 4.31, 2.85);
    group.add(downlight);
  }

  // 7. Floating Upper Executive Studio Wing (Cantilevered 1.6m Forward)
  // Footprint: x ∈ [-10.0, +5.5] (15.5m wide, center -2.25), z ∈ [-8.2, +3.4] (11.6m deep, center -2.4)
  const upperFloorW = 15.5;
  const upperFloorD = 11.6;
  const upperCenterX = -2.25;
  const upperCenterZ = -2.4;
  const upperFloor = new THREE.Mesh(new THREE.BoxGeometry(upperFloorW, 3.6, upperFloorD), titaniumWhiteMat);
  upperFloor.position.set(upperCenterX, 6.45, upperCenterZ);
  group.add(upperFloor);

  // Continuous Recessed Warm Amber LED Cove Light cleanly under the cantilever lip
  const coveLed = new THREE.Mesh(new THREE.BoxGeometry(upperFloorW - 0.5, 0.08, 0.12), amberNeonMat);
  coveLed.position.set(upperCenterX, 4.61, 3.28);
  group.add(coveLed);

  // Upper Floor Architectural Ribbon Windows on ALL FOUR SIDES (ZERO overlap with signage!)
  // Front-Left Ribbon Glass (x ∈ [-9.5, -2.5], 0.73m clear gap before NERQIVA sign!)
  const upperGlassFront = new THREE.Mesh(new THREE.BoxGeometry(7.0, 2.1, 0.10), showroomGlassMat);
  upperGlassFront.position.set(-6.0, 6.45, 3.45);
  group.add(upperGlassFront);

  const upperGlassFrameF = new THREE.Mesh(new THREE.BoxGeometry(7.16, 2.24, 0.06), darkFrameMat);
  upperGlassFrameF.position.set(-6.0, 6.45, 3.42);
  group.add(upperGlassFrameF);

  // Left Wrap Ribbon Glass (x = -10.05)
  const upperGlassLeft = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.1, 7.2), showroomGlassMat);
  upperGlassLeft.position.set(-10.05, 6.45, -0.4);
  group.add(upperGlassLeft);

  // Right Executive Window (x = +5.55)
  const upperGlassRight = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.1, 6.2), showroomGlassMat);
  upperGlassRight.position.set(5.55, 6.45, -2.6);
  group.add(upperGlassRight);

  // Rear Ribbon Window (z = -8.25)
  const upperGlassRear = new THREE.Mesh(new THREE.BoxGeometry(10.6, 2.0, 0.10), showroomGlassMat);
  upperGlassRear.position.set(upperCenterX, 6.45, -8.25);
  group.add(upperGlassRear);

  // 8. 3D Illuminated Dimensional Architectural Signage: "NERQIVA"
  // Cleanly mounted on the Right Front Fascia (x ∈ [-1.7, +4.9], center +1.6) — ZERO overlap, ZERO Z-fighting!
  const signCenterX = 1.6;
  const signHalo = new THREE.Mesh(new THREE.BoxGeometry(6.74, 1.56, 0.04), amberNeonMat);
  signHalo.position.set(signCenterX, 6.45, 3.43);
  group.add(signHalo);

  const signFascia = new THREE.Mesh(new THREE.BoxGeometry(6.56, 1.40, 0.10), darkFrameMat);
  signFascia.position.set(signCenterX, 6.45, 3.48);
  group.add(signFascia);

  const signGroup = new THREE.Group();
  // createLetter3D extends from y=0..0.72, so offset by -0.36 to dead-center vertically inside the fascia
  signGroup.position.set(signCenterX, 6.09, 3.57);

  const signLetters = ["N", "E", "R", "Q", "I", "V", "A"];
  const letterSpacing = 0.62;
  const startX = -((signLetters.length - 1) * letterSpacing) / 2;

  signLetters.forEach((char, idx) => {
    const letterMesh = createLetter3D(char, amberNeonMat);
    letterMesh.position.set(startX + idx * letterSpacing, 0, 0);
    signGroup.add(letterMesh);
  });
  group.add(signGroup);

  // 9. Rooftop Sky-Terrace Lounge & Solar Architecture (strictly inside x ∈ [-9.8, +5.3], z ∈ [-8.0, +3.2])
  const roofSlateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(upperFloorW - 0.5, 0.14, upperFloorD - 0.5), roofSlateMat);
  deck.position.set(upperCenterX, 8.32, upperCenterZ);
  group.add(deck);

  // 4-Sided Glass Balustrades with Illuminated Amber Handrail around entire roof perimeter
  const balustradeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    transparent: true,
    opacity: 0.65,
  });

  // Front & Rear Balustrades
  for (const bz of [3.15, -7.95]) {
    const bal = new THREE.Mesh(new THREE.BoxGeometry(upperFloorW - 0.7, 0.85, 0.08), balustradeMat);
    bal.position.set(upperCenterX, 8.80, bz);
    group.add(bal);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(upperFloorW - 0.7, 0.06, 0.10), amberNeonMat);
    rail.position.set(upperCenterX, 9.24, bz);
    group.add(rail);
  }
  // Left & Right Balustrades
  for (const bx of [-9.75, 5.25]) {
    const bal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, upperFloorD - 0.7), balustradeMat);
    bal.position.set(bx, 8.80, upperCenterZ);
    group.add(bal);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, upperFloorD - 0.7), amberNeonMat);
    rail.position.set(bx, 9.24, upperCenterZ);
    group.add(rail);
  }

  // Dedicated Elevated Warm Teak Wood Lounge Island under Pergola (Left-Front of Roof)
  const teakIsland = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.12, 4.6), teakMat);
  teakIsland.position.set(-6.0, 8.45, -0.3);
  group.add(teakIsland);

  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.34, 1.1), darkFrameMat);
  sofaBase.position.set(-6.0, 8.68, -0.8);
  group.add(sofaBase);

  const sofaCushion = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 1.0), titaniumWhiteMat);
  sofaCushion.position.set(-6.0, 8.92, -0.8);
  group.add(sofaCushion);

  const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.24, 0.75), darkFrameMat);
  coffeeTable.position.set(-6.0, 8.63, 0.8);
  group.add(coffeeTable);

  // Modern Rooftop Pergola with 7 Cantilevered Teak Rafters
  const pergolaGroup = new THREE.Group();
  pergolaGroup.position.set(-6.0, 8.39, -0.3);

  for (let r = 0; r < 7; r++) {
    const rafter = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 0.14), teakMat);
    rafter.position.set(0, 2.75, -1.95 + r * 0.65);
    pergolaGroup.add(rafter);
  }
  for (const px of [-2.4, 2.4]) {
    for (const pz of [-1.8, 1.8]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.75, 0.16), darkFrameMat);
      col.position.set(px, 1.375, pz);
      pergolaGroup.add(col);
    }
  }
  group.add(pergolaGroup);

  // Modern Photovoltaic Solar Array (Rear-Right of Roof, well inside balustrades)
  const solarGroup = new THREE.Group();
  solarGroup.position.set(1.6, 8.80, -5.2);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 1.1), solarMat);
      panel.rotation.x = 0.22;
      panel.position.set(-2.2 + col * 1.48, row * 0.30, -0.7 + row * 1.35);
      solarGroup.add(panel);
    }
  }
  group.add(solarGroup);

  // Architectural Rooftop Lightwell Skylight
  const skylight = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.30, 2.2), showroomGlassMat);
  skylight.position.set(-1.3, 8.54, -1.6);
  group.add(skylight);

  // 10. Low Minimalist Compound Wall with Grand 8.6m Open Gateway
  const wallH = 0.85;
  const wallMat = basaltMat;
  // Left wall (x = -13)
  const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallH, 20), wallMat);
  lWall.position.set(-13, wallH / 2 + 0.35, 0);
  group.add(lWall);

  // Right wall (x = +13)
  const rWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallH, 20), wallMat);
  rWall.position.set(13, wallH / 2 + 0.35, 0);
  group.add(rWall);

  // Rear wall (z = -10)
  const bkWall = new THREE.Mesh(new THREE.BoxGeometry(26, wallH, 0.35), wallMat);
  bkWall.position.set(0, wallH / 2 + 0.35, -10);
  group.add(bkWall);

  // Front wall segments flanking the grand 8.6m central gateway
  const fWallL = new THREE.Mesh(new THREE.BoxGeometry(8.7, wallH, 0.35), wallMat);
  fWallL.position.set(-8.65, wallH / 2 + 0.35, 10);
  group.add(fWallL);

  const fWallR = new THREE.Mesh(new THREE.BoxGeometry(8.7, wallH, 0.35), wallMat);
  fWallR.position.set(8.65, wallH / 2 + 0.35, 10);
  group.add(fWallR);

  // Gate Pillars with Glowing Architectural Sconces
  for (const px of [-4.3, 4.3]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), basaltMat);
    pillar.position.set(px, 0.8 + 0.35, 10);
    group.add(pillar);

    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), lampMat);
    lamp.position.set(px, 1.78 + 0.35, 10);
    group.add(lamp);
  }

  return group;
}

/**
 * Builds authentic Indian Bungalow House with sloping terracotta hip roof (IndiaAgain style)
 */
export function createIndianBungalowMesh(options: {
  roofColor?: number;
  wallColor?: number;
  hasCar?: boolean;
} = {}): THREE.Group {
  const {
    roofColor = 0xc2410c, // Terracotta burnt orange
    wallColor = 0xfef3c7, // Warm ivory/cream stucco
    hasCar = true,
  } = options;

  const group = new THREE.Group();
  group.name = "indian_bungalow_house";

  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const sintexMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });

  // 0. Contact Shadow
  group.add(createGroundShadow(20, 18));

  // 1. Garden Plot Base (18m x 16m)
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 16), lawnMat);
  lawn.position.set(0, 0.1, 0);
  group.add(lawn);

  // 2. Concrete Plinth / Foundation with Front Veranda Steps
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(13, 0.5, 11), plinthMat);
  plinth.position.set(-1, 0.45, 0);
  group.add(plinth);

  const steps = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.25, 1.8), plinthMat);
  steps.position.set(-1, 0.22, 6.0);
  group.add(steps);

  // 3. House Walls
  const houseBody = new THREE.Mesh(new THREE.BoxGeometry(12, 3.4, 9), wallMat);
  houseBody.position.set(-1, 2.4, -0.5);
  group.add(houseBody);

  // 4. Veranda / Front Porch with 2 White Classical Pillars
  for (const px of [-3.2, 1.2]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.2, 10), wallMat);
    pillar.position.set(px, 2.3, 4.6);
    group.add(pillar);
  }

  // Veranda canopy roof
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.3, 2.6), roofMat);
  porchRoof.position.set(-1, 3.95, 4.4);
  group.add(porchRoof);

  // 5. Traditional Terracotta Hip/Pyramid Roof with overhanging eaves
  const roofGeo = new THREE.ConeGeometry(8.6, 3.2, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.15, 1.0, 0.9);
  roof.position.set(-1, 5.4, -0.5);
  group.add(roof);

  // 6. Rooftop Sintex Water Tank
  const sintex = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.3, 12), sintexMat);
  sintex.position.set(2.4, 5.8, -2.4);
  group.add(sintex);

  // 7. Wooden Front Door & Windows
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.1), woodMat);
  door.position.set(-1, 1.9, 4.05);
  group.add(door);

  for (const wx of [-4.5, 2.5]) {
    const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 0.1), glassMat);
    windowGlass.position.set(wx, 2.4, 4.05);
    group.add(windowGlass);

    const sill = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.2), plinthMat);
    sill.position.set(wx, 1.55, 4.1);
    group.add(sill);
  }

  // 8. Low Compound Wall with Gate Opening
  const wallMatStucco = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
  const wallH = 1.0;
  // Left wall
  const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallH, 16), wallMatStucco);
  lWall.position.set(-9, wallH / 2 + 0.2, 0);
  group.add(lWall);
  // Right wall
  const rWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallH, 16), wallMatStucco);
  rWall.position.set(9, wallH / 2 + 0.2, 0);
  group.add(rWall);
  // Rear wall
  const bkWall = new THREE.Mesh(new THREE.BoxGeometry(18, wallH, 0.3), wallMatStucco);
  bkWall.position.set(0, wallH / 2 + 0.2, -8);
  group.add(bkWall);
  // Front wall segments
  const fWallL = new THREE.Mesh(new THREE.BoxGeometry(7, wallH, 0.3), wallMatStucco);
  fWallL.position.set(-5.5, wallH / 2 + 0.2, 8);
  group.add(fWallL);

  // 9. Optional Parked Hatchback / Sedan in Driveway
  if (hasCar) {
    const carMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }); // Red car
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 4.0), carMat);
    carBody.position.set(6.2, 0.8, 1.5);
    group.add(carBody);

    const carTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glassMat);
    carTop.position.set(6.2, 1.45, 1.2);
    group.add(carTop);
  }

  return group;
}

/**
 * Builds authentic Indian Kirana / General Store with red & white striped canopy
 */
export function createGeneralStoreMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = "general_store_kirana";

  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
  const stuccoMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const goldSignMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: new THREE.Color(0xd97706),
    emissiveIntensity: 0.4,
  });

  // Contact shadow
  group.add(createGroundShadow(19, 17));

  // Plot Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(17, 0.2, 15), lawnMat);
  base.position.set(0, 0.1, 0);
  group.add(base);

  // Concrete Pavement Shopfront
  const pavedPavement = new THREE.Mesh(new THREE.BoxGeometry(15, 0.22, 6), plinthMat);
  pavedPavement.position.set(0, 0.11, 4.5);
  group.add(pavedPavement);

  // Shop Main Building Body (13m wide, 4.2m high, 8m deep)
  const shopBody = new THREE.Mesh(new THREE.BoxGeometry(13, 4.2, 8), stuccoMat);
  shopBody.position.set(0, 2.3, -1.5);
  group.add(shopBody);

  // Shop Roof parapet with accent band
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.5, 8.4), redMat);
  parapet.position.set(0, 4.5, -1.5);
  group.add(parapet);

  // Large Panoramic Display Glass Front
  const storefrontGlass = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.8, 0.15), glassMat);
  storefrontGlass.position.set(-1.8, 2.0, 2.55);
  group.add(storefrontGlass);

  // Shop Entrance Door
  const shopDoor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.15), woodMat);
  shopDoor.position.set(3.8, 2.0, 2.55);
  group.add(shopDoor);

  // Red & White Striped Awning (Canopy) projecting 2.8m over the shop entrance
  const awningGroup = new THREE.Group();
  awningGroup.position.set(0, 3.6, 2.6);
  awningGroup.rotation.x = 0.25; // Sloping downwards

  const numStripes = 12;
  const stripeWidth = 12.0 / numStripes;
  for (let i = 0; i < numStripes; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(stripeWidth, 0.08, 2.6),
      i % 2 === 0 ? redMat : whiteMat
    );
    stripe.position.set(-6.0 + (i + 0.5) * stripeWidth, 0, 1.3);
    awningGroup.add(stripe);
  }
  group.add(awningGroup);

  // Store Signboard above awning: "GENERAL STORE"
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.9, 0.2), goldSignMat);
  signBoard.position.set(0, 4.15, 2.6);
  group.add(signBoard);

  // Wooden Crates of fresh vegetables/produce outside
  const crateColors = [0x16a34a, 0xea580c, 0xfacc15];
  for (let c = 0; c < 3; c++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), woodMat);
    crate.position.set(-4.5 + c * 1.4, 0.5, 4.2);
    group.add(crate);

    // Produce tops
    const produce = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.3, 0.6),
      new THREE.MeshStandardMaterial({ color: crateColors[c] })
    );
    produce.position.set(-4.5 + c * 1.4, 0.85, 4.2);
    group.add(produce);
  }

  return group;
}

/**
 * Builds authentic Roadside Chai & Tea Stall Kiosk with benches and kettle
 */
export function createChaiStallMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = "chai_tea_stall";

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.6 }); // Emerald green tin roof
  const kettleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });

  group.add(createGroundShadow(8, 7));

  // Small concrete platform
  const plat = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 5.5), new THREE.MeshStandardMaterial({ color: 0x475569 }));
  plat.position.set(0, 0.1, 0);
  group.add(plat);

  // Wooden Stall Kiosk structure
  const stall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 2.6), woodMat);
  stall.position.set(0, 1.4, -0.8);
  group.add(stall);

  // Front service counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 0.8), counterMat);
  counter.position.set(0, 0.7, 0.8);
  group.add(counter);

  // Slanted tin awning roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 3.8), roofMat);
  roof.rotation.x = 0.2;
  roof.position.set(0, 2.9, 0.4);
  group.add(roof);

  // Stainless steel Chai kettle on counter
  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.6, 10), kettleMat);
  kettle.position.set(-0.8, 1.45, 0.8);
  group.add(kettle);

  // Wooden customer bench
  const bench = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 0.6), woodMat);
  bench.position.set(0, 0.4, 2.2);
  group.add(bench);

  return group;
}

/**
 * Builds School Under Construction with scaffolding and a working Yellow Crane (IndiaAgain style)
 */
export function createSchoolConstructionMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = "school_construction_with_crane";

  const groundMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
  const brickMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.95 }); // Red brick
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.4, roughness: 0.4 }); // Construction yellow
  const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.3 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 }); // Safety orange

  group.add(createGroundShadow(26, 22));

  // 1. Excavated Ground Site Base (24m x 20m)
  const base = new THREE.Mesh(new THREE.BoxGeometry(24, 0.2, 20), groundMat);
  base.position.set(0, 0.1, 0);
  group.add(base);

  // 2. Concrete Plinth / Foundations
  const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 12), concreteMat);
  slab.position.set(-2, 0.5, -2);
  group.add(slab);

  // 3. Unfinished Brick Walls (Ground Floor & Half of 1st floor)
  const brickGround = new THREE.Mesh(new THREE.BoxGeometry(15, 3.2, 11), brickMat);
  brickGround.position.set(-2, 2.4, -2);
  group.add(brickGround);

  const middleSlab = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.4, 11.4), concreteMat);
  middleSlab.position.set(-2, 4.2, -2);
  group.add(middleSlab);

  const partialUpper = new THREE.Mesh(new THREE.BoxGeometry(8, 2.0, 11), brickMat);
  partialUpper.position.set(-5.5, 5.4, -2);
  group.add(partialUpper);

  // 4. Scaffolding on the right side
  for (let sx = 0; sx < 3; sx++) {
    for (let sz = 0; sz < 2; sz++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.5, 6), scaffoldMat);
      pole.position.set(3.5 + sx * 1.5, 3.8, -4 + sz * 3.5);
      group.add(pole);
    }
  }

  // 5. Yellow Tower Construction Crane
  const crane = new THREE.Group();
  crane.position.set(8.5, 0, 3.0);

  // Vertical Crane Mast (13m high)
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.8, 13.0, 0.8), craneMat);
  mast.position.y = 6.5;
  crane.add(mast);

  // Horizontal Boom Arm (14m long)
  const boom = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.6, 0.6), craneMat);
  boom.position.set(-3.0, 13.0, 0);
  crane.add(boom);

  // Counterweight Block
  const counterweight = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 1.4, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  counterweight.position.set(3.0, 13.0, 0);
  crane.add(counterweight);

  // Dangling Hook Cable
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 4), scaffoldMat);
  cable.position.set(-6.5, 10.5, 0);
  crane.add(cable);

  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.4), craneMat);
  hook.position.set(-6.5, 8.0, 0);
  crane.add(hook);

  group.add(crane);

  // 6. Stacks of Red Bricks and Safety Cones
  for (let b = 0; b < 4; b++) {
    const brickStack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.4), brickMat);
    brickStack.position.set(-8.5 + b * 2.0, 0.65, 6.0);
    group.add(brickStack);
  }

  // Safety Cones
  for (let c = 0; c < 3; c++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), coneMat);
    cone.position.set(2.0 + c * 1.5, 0.5, 7.5);
    group.add(cone);
  }

  return group;
}

/**
 * Builds Classic Indian 3-Wheeled Auto Rickshaw (Tuk-Tuk) in Green & Yellow
 */
export function createAutoRickshawMesh(): THREE.Group {
  const auto = new THREE.Group();
  auto.name = "indian_auto_rickshaw";

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }); // Yellow top
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 }); // Green lower body
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    transparent: true,
    opacity: 0.8,
  });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: new THREE.Color(0xfbbf24),
    emissiveIntensity: 2.0,
  });

  // Contact shadow
  auto.add(createGroundShadow(2.4, 3.6));

  // Lower Green Body
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.6), greenMat);
  lowerBody.position.y = 0.6;
  auto.add(lowerBody);

  // Upper Yellow Curved Canopy Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.4), yellowMat);
  roof.position.set(0, 1.6, 0.1);
  auto.add(roof);

  // Front Windshield
  const windscreen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.08), glassMat);
  windscreen.position.set(0, 1.3, 1.25);
  auto.add(windscreen);

  // Slender Black Support Pillars
  for (const px of [-0.7, 0.7]) {
    for (const pz of [-1.0, 0.2, 1.2]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), blackMat);
      pillar.position.set(px, 1.25, pz);
      auto.add(pillar);
    }
  }

  // 3 Wheels (1 front, 2 rear)
  const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 10), wheelMat);
  fWheel.rotation.z = Math.PI / 2;
  fWheel.position.set(0, 0.28, 1.2);
  auto.add(fWheel);

  for (const rx of [-0.75, 0.75]) {
    const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 10), wheelMat);
    rWheel.rotation.z = Math.PI / 2;
    rWheel.position.set(rx, 0.28, -0.8);
    auto.add(rWheel);
  }

  // Round Front Headlight
  const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 10), lampMat);
  headlamp.rotation.x = Math.PI / 2;
  headlamp.position.set(0, 0.8, 1.35);
  auto.add(headlamp);

  return auto;
}

/**
 * Builds Red City Transit Bus (ASTC Guwahati Red Bus)
 */
export function createBusMesh(): THREE.Group {
  const bus = new THREE.Group();
  bus.name = "guwahati_city_bus";

  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

  bus.add(createGroundShadow(3.2, 9.6));

  // Main Bus Body (9m long, 2.5m wide, 2.6m high)
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 9.0), redMat);
  body.position.y = 1.4;
  bus.add(body);

  // Cream color roof & upper panel
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 9.0), creamMat);
  roof.position.y = 2.6;
  bus.add(roof);

  // Front Windshield
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.2, 0.1), glassMat);
  frontGlass.position.set(0, 2.1, 4.52);
  bus.add(frontGlass);

  // Side Passenger Windows Strip
  for (const side of [-1.26, 1.26]) {
    for (let w = 0; w < 5; w++) {
      const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 1.3), glassMat);
      windowMesh.position.set(side, 2.2, -2.8 + w * 1.5);
      bus.add(windowMesh);
    }
  }

  // 4 Big Double Bus Wheels
  for (const wx of [-1.2, 1.2]) {
    for (const wz of [-2.6, 2.6]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.35, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.48, wz);
      bus.add(wheel);
    }
  }

  // Destination Signboard: "GUWAHATI CITY"
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.35, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xfacc15 })
  );
  sign.position.set(0, 2.85, 4.54);
  bus.add(sign);

  return bus;
}

/**
 * Builds 3D Free Commercial Plot with boundary stakes, fence, and cyan survey caps
 */
export function createFreePlotMesh(plotNum = "1"): THREE.Group {
  const group = new THREE.Group();
  group.name = `free_plot_3d_${plotNum}`;

  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 }); // Emerald green turf
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const cyanCapMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.3 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });

  group.add(createGroundShadow(17, 17));

  // 1. Manicured Turf (16m x 16m)
  const lawnGeo = new THREE.BoxGeometry(16, 0.2, 16);
  const lawn = new THREE.Mesh(lawnGeo, lawnMat);
  lawn.position.set(0, 0.1, 0);
  group.add(lawn);

  // 2. 4 Corner Wooden Boundary Stakes with Cyan Caps
  for (const sx of [-7.2, 7.2]) {
    for (const sz of [-7.2, 7.2]) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.3, 8), woodMat);
      stake.position.set(sx, 0.65 + 0.2, sz);
      group.add(stake);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.28, 8), cyanCapMat);
      cap.position.set(sx, 1.35 + 0.2, sz);
      group.add(cap);
    }
  }

  // 3. Post-and-rail low boundary perimeter fence
  for (const side of [-1, 1]) {
    const railX = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.08, 0.08), railMat);
    railX.position.set(0, 0.9, side * 7.2);
    group.add(railX);

    const railZ = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 14.4), railMat);
    railZ.position.set(side * 7.2, 0.9, 0);
    group.add(railZ);
  }

  // 4. Center Survey Marker Peg & Signboard
  const centerPeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8, 6), woodMat);
  centerPeg.position.set(0, 0.9 + 0.2, 0);
  group.add(centerPeg);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.9, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0284c7 })
  );
  sign.position.set(0, 1.6 + 0.2, 0);
  group.add(sign);

  return group;
}

/**
 * Builds charming low-poly trees: Pine, Round Deciduous, or Flowering Gulmohar
 */
export function createTreeMesh(type: "pine" | "round" | "flowering" = "pine"): THREE.Group {
  const tree = new THREE.Group();
  tree.name = "roadside_tree";

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  const foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 });
  const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75 });
  const foliageMat3 = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.75 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.7 }); // Orange flowering

  // Contact shadow
  tree.add(createGroundShadow(3.0, 3.0));

  // Trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.0, 7), trunkMat);
  trunk.position.y = 1.0;
  tree.add(trunk);

  if (type === "pine") {
    // 3-tiered low-poly pine tree
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.2, 7), foliageMat1);
    cone1.position.y = 2.4;
    tree.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.9, 7), foliageMat2);
    cone2.position.y = 3.6;
    tree.add(cone2);

    const cone3 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.5, 7), foliageMat3);
    cone3.position.y = 4.6;
    tree.add(cone3);
  } else if (type === "flowering") {
    // Lush architectural canopy shade tree (layered emerald & sage foliage)
    const sphere1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65, 1), foliageMat1);
    sphere1.position.set(0, 2.7, 0);
    tree.add(sphere1);

    const sphere2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25, 1), foliageMat2);
    sphere2.position.set(0.35, 3.4, -0.2);
    tree.add(sphere2);

    const sphere3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 1), foliageMat3);
    sphere3.position.set(-0.25, 3.9, 0.2);
    tree.add(sphere3);
  } else {
    // Stylized rounded deciduous tree
    const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), foliageMat1);
    sphere.position.y = 2.8;
    tree.add(sphere);

    const topFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 1), foliageMat2);
    topFoliage.position.set(0.3, 3.8, 0.2);
    tree.add(topFoliage);
  }

  return tree;
}

/**
 * Builds a modern street lamp with warm glowing lantern head
 */
export function createStreetLightMesh(): THREE.Group {
  const lamp = new THREE.Group();
  lamp.name = "street_lamp";

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
  const lightHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: new THREE.Color(0xfbbf24),
    emissiveIntensity: 3.0,
    roughness: 0.1,
  });

  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8), poleMat);
  base.position.y = 0.25;
  lamp.add(base);

  // Vertical pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6.0, 8), poleMat);
  pole.position.y = 3.25;
  lamp.add(pole);

  // Overhanging arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.1), poleMat);
  arm.position.set(0.65, 6.2, 0);
  lamp.add(arm);

  // Lamp casing
  const casing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.35), poleMat);
  casing.position.set(1.2, 6.25, 0);
  lamp.add(casing);

  // Glowing lantern bulb
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.25), lightHeadMat);
  bulb.position.set(1.2, 6.15, 0);
  lamp.add(bulb);

  return lamp;
}

/**
 * Builds an authentic 3D Indian Streetwear Character for live walking on GS Road
 */
export function createPlayerCharacter3D(): {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  updateWalk: (time: number, isWalking: boolean) => void;
} {
  const group = new THREE.Group();
  group.name = "player_character_3d";

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }); // Ochre amber jacket
  const denimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }); // Navy jeans
  const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }); // White sneakers

  // Contact shadow
  group.add(createGroundShadow(1.2, 1.2));

  // 1. Head & Hair
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), skinMat);
  head.position.y = 2.45;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.35, 0.74), hairMat);
  hair.position.set(0, 2.7, -0.02);
  group.add(hair);

  // Stylish dark visor/shades on front face (+Z)
  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.08), hairMat);
  shades.position.set(0, 2.48, 0.34);
  group.add(shades);

  // 2. Torso with amber jacket + minimalist dark studio backpack on back (-Z)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.6), jacketMat);
  torso.position.y = 1.55;
  group.add(torso);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.28), denimMat);
  backpack.position.set(0, 1.62, -0.40);
  group.add(backpack);

  // 3. Left Arm & Right Arm (pivoted from shoulder)
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.0, 0.28), jacketMat);
  leftArm.position.set(-0.68, 1.45, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.0, 0.28), jacketMat);
  rightArm.position.set(0.68, 1.45, 0);
  group.add(rightArm);

  // 4. Left Leg & Right Leg with white sneakers (pivoted from hip)
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.0, 0.32), denimMat);
  leftLeg.position.set(-0.25, 0.65, 0);
  group.add(leftLeg);

  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.5), sneakerMat);
  leftShoe.position.set(-0.25, 0.11, 0.08);
  group.add(leftShoe);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.0, 0.32), denimMat);
  rightLeg.position.set(0.25, 0.65, 0);
  group.add(rightLeg);

  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.5), sneakerMat);
  rightShoe.position.set(0.25, 0.11, 0.08);
  group.add(rightShoe);

  // Walking cycle animation function
  const updateWalk = (time: number, isWalking: boolean) => {
    if (isWalking) {
      const swing = Math.sin(time * 10) * 0.45;
      leftLeg.rotation.x = swing;
      leftShoe.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      rightShoe.rotation.x = -swing;
      leftArm.rotation.x = -swing * 0.8;
      rightArm.rotation.x = swing * 0.8;
      torso.position.y = 1.55 + Math.abs(Math.sin(time * 10)) * 0.05;
      head.position.y = 2.45 + Math.abs(Math.sin(time * 10)) * 0.05;
    } else {
      leftLeg.rotation.x = 0;
      leftShoe.rotation.x = 0;
      rightLeg.rotation.x = 0;
      rightShoe.rotation.x = 0;
      leftArm.rotation.x = 0;
      rightArm.rotation.x = 0;
      torso.position.y = 1.55;
      head.position.y = 2.45;
    }
  };

  return { group, leftLeg, rightLeg, leftArm, rightArm, updateWalk };
}

/**
 * Shared architectural plot plinth & streetfront apron (22m x 18m)
 * Guarantees every category base plot sits cleanly grounded at y = 0 with zero floating or z-fighting.
 */
function createCategoryBasePlinth(
  group: THREE.Group,
  plinthColor: number,
  apronColor: number,
  accentColor: number
) {
  group.add(createGroundShadow(24.5, 20.5));

  const plinthMat = new THREE.MeshStandardMaterial({ color: plinthColor, roughness: 0.85 });
  const apronMat = new THREE.MeshStandardMaterial({ color: apronColor, roughness: 0.78 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 1.5,
  });

  // Main architectural base slab (y: 0 -> 0.36)
  const base = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.36, 18.0), plinthMat);
  base.name = "plot_base_plinth";
  base.position.set(0, 0.18, 0);
  group.add(base);

  // Front paved pedestrian apron (+Z entrance forecourt, y: 0.36 -> 0.42)
  const apron = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.06, 6.2), apronMat);
  apron.name = "plot_apron";
  apron.position.set(0, 0.39, 5.6);
  group.add(apron);

  // Subtle recessed architectural LED trim along front entrance edge
  const edgeStrip = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.05, 0.16), accentMat);
  edgeStrip.name = "plot_accent_led";
  edgeStrip.position.set(0, 0.43, 8.7);
  group.add(edgeStrip);
}

/**
 * Helper to add a crisp planter box with sculpted greenery safely positioned away from walls
 */
function addArchitecturalPlanter(
  group: THREE.Group,
  x: number,
  z: number,
  potColor = 0x1e293b,
  foliageColor = 0x15803d
) {
  const potMat = new THREE.MeshStandardMaterial({ color: potColor, roughness: 0.75 });
  const leafMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.82 });

  const pot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 1.4), potMat);
  pot.position.set(x, 0.74, z);
  group.add(pot);

  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 10), leafMat);
  bush.scale.set(1.0, 1.15, 1.0);
  bush.position.set(x, 1.52, z);
  group.add(bush);
}

/**
 * 1. Creative & Weddings — Glass Atelier & Studio
 * Pitched north-light cyclorama skylight, frameless exhibition glazing, gallery frames & champagne gold fascia.
 */
function buildCreativeAtelierPlot(): THREE.Group {
  const g = new THREE.Group();
  g.name = "category_plot_creative_weddings";
  createCategoryBasePlinth(g, 0x0f172a, 0x334155, 0xeab308);

  const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.35 });
  const limestoneMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38 });
  const champagneMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.25,
    metalness: 0.75,
  });
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 1.85,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.06,
    metalness: 0.25,
    transparent: true,
    opacity: 0.78,
  });

  // Main Atelier Volume (centered at z = -1.8, depth = 10.4 -> front wall at z = +3.4)
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(16.0, 6.2, 10.4), obsidianMat);
  mainBody.position.set(0, 3.46, -1.8);
  g.add(mainBody);

  // White Architectural Frame Portal around front facade
  const leftPier = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.5, 1.6), limestoneMat);
  leftPier.position.set(-7.6, 3.61, 3.2);
  g.add(leftPier);

  const rightPier = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.5, 1.6), limestoneMat);
  rightPier.position.set(7.6, 3.61, 3.2);
  g.add(rightPier);

  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(16.6, 1.1, 2.2), limestoneMat);
  topBeam.position.set(0, 6.65, 3.3);
  g.add(topBeam);

  // Luminous Champagne Gold Atelier Fascia Signboard
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.76, 0.22), obsidianMat);
  signBack.position.set(0, 6.65, 4.42);
  g.add(signBack);

  const signGlow = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.32, 0.12), warmGlowMat);
  signGlow.position.set(0, 6.65, 4.54);
  g.add(signGlow);

  // Double-Height Exhibition Glass Curtain Wall & Warm Studio Interior Backing
  const interiorBack = new THREE.Mesh(new THREE.BoxGeometry(13.2, 5.2, 0.25), warmGlowMat);
  interiorBack.position.set(0, 3.1, 2.55);
  g.add(interiorBack);

  // Gallery Exhibition Frames visible behind glass
  for (const fx of [-4.2, 0, 4.2]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.0, 0.14), champagneMat);
    frame.position.set(fx, 3.2, 2.78);
    g.add(frame);
    const canvas = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.5, 0.16), limestoneMat);
    canvas.position.set(fx, 3.2, 2.81);
    g.add(canvas);
  }

  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(13.6, 5.4, 0.14), glassMat);
  frontGlass.position.set(0, 3.16, 3.45);
  g.add(frontGlass);

  // Slim Champagne Mullions
  for (const mx of [-4.5, 0, 4.5]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5.4, 0.22), champagneMat);
    mullion.position.set(mx, 3.16, 3.48);
    g.add(mullion);
  }

  // Sawtooth North-Light Cyclorama Skylight Roof (Signature Studio Silhouette)
  for (let i = 0; i < 3; i++) {
    const skylightBase = new THREE.Mesh(new THREE.BoxGeometry(14.8, 1.35, 2.6), limestoneMat);
    skylightBase.position.set(0, 7.25, -5.2 + i * 3.1);
    skylightBase.rotation.x = 0.22;
    g.add(skylightBase);

    const skylightGlass = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.95, 0.16), glassMat);
    skylightGlass.position.set(0, 7.38, -3.9 + i * 3.1);
    g.add(skylightGlass);
  }

  // Front Sandstone Steps & Sculpted Planters
  const step = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.24, 1.8), limestoneMat);
  step.position.set(0, 0.52, 4.4);
  g.add(step);

  addArchitecturalPlanter(g, -6.4, 5.4, 0x1e293b, 0x166534);
  addArchitecturalPlanter(g, 6.4, 5.4, 0x1e293b, 0x166534);

  return g;
}

/**
 * 2. Beauty & Wellness — Botanical Spa Pavilion
 * Travertine cream stone overhang, arched frosted glass bays, zen reflecting water basin & bamboo planters.
 */
function buildBeautySpaPlot(): THREE.Group {
  const g = new THREE.Group();
  g.name = "category_plot_beauty_wellness";
  createCategoryBasePlinth(g, 0x292524, 0xe7e5e4, 0xfb7185);

  const travertineMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.45 });
  const warmSandMat = new THREE.MeshStandardMaterial({ color: 0xd6c5b3, roughness: 0.6 });
  const roseGoldMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.28, metalness: 0.65 });
  const sanctuaryGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe4e6,
    emissive: new THREE.Color(0xfb7185),
    emissiveIntensity: 1.45,
  });
  const frostedGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfff1f2,
    roughness: 0.15,
    transparent: true,
    opacity: 0.72,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.08,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const teakMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 });

  // Ground Pavilion Body
  const pavilion = new THREE.Mesh(new THREE.BoxGeometry(16.4, 4.6, 10.0), travertineMat);
  pavilion.position.set(0, 2.66, -1.8);
  g.add(pavilion);

  // Deep Cantilevered Floating Roof Slab
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(19.0, 0.65, 13.0), travertineMat);
  roofSlab.position.set(0, 5.28, -0.8);
  g.add(roofSlab);

  const roseTrim = new THREE.Mesh(new THREE.BoxGeometry(19.1, 0.14, 13.1), roseGoldMat);
  roseTrim.position.set(0, 5.02, -0.8);
  g.add(roseTrim);

  // Rooftop Zen Timber Pergola
  for (let i = -3; i <= 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 7.6), teakMat);
    slat.position.set(i * 1.9, 6.25, -1.8);
    g.add(slat);
  }
  for (const px of [-6.0, 6.0]) {
    for (const pz of [-5.2, 1.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.0, 0.32), teakMat);
      post.position.set(px, 5.85, pz);
      g.add(post);
    }
  }

  // Three Illuminated Frosted-Glass Spa Bays with Warm Arch Header
  for (const bx of [-4.6, 0, 4.6]) {
    const glow = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.6, 0.2), sanctuaryGlowMat);
    glow.position.set(bx, 2.35, 3.12);
    g.add(glow);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.8, 0.14), frostedGlassMat);
    glass.position.set(bx, 2.35, 3.28);
    g.add(glass);

    const archTop = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.35, 20, 1, false, 0, Math.PI), warmSandMat);
    archTop.rotation.z = Math.PI / 2;
    archTop.rotation.y = Math.PI / 2;
    archTop.position.set(bx, 4.05, 3.26);
    g.add(archTop);
  }

  // Glowing Rose-Gold Fascia Sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.42, 0.18), sanctuaryGlowMat);
  sign.position.set(0, 5.28, 5.75);
  g.add(sign);

  // Tranquil Front Reflecting Water Basin + Stepping Stone Walkway
  const basinFrame = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.32, 3.0), warmSandMat);
  basinFrame.position.set(0, 0.56, 5.7);
  g.add(basinFrame);

  const pool = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.26, 2.3), waterMat);
  pool.position.set(0, 0.62, 5.7);
  g.add(pool);

  for (const sz of [4.8, 5.7, 6.6]) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.34, 0.68), travertineMat);
    stone.position.set(0, 0.61, sz);
    g.add(stone);
  }

  addArchitecturalPlanter(g, -8.2, 5.2, 0xd6c5b3, 0x22c55e);
  addArchitecturalPlanter(g, 8.2, 5.2, 0xd6c5b3, 0x22c55e);

  return g;
}

/**
 * 3. Food & Cafes — Artisanal Café & Roastery
 * Terracotta brick facade, striped canopy awning, timber bistro deck with umbrella tables & copper roaster vent.
 */
function buildFoodCafePlot(): THREE.Group {
  const g = new THREE.Group();
  g.name = "category_plot_food_hospitality";
  createCategoryBasePlinth(g, 0x1c1917, 0x78350f, 0xf59e0b);

  const brickMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.78 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.45 });
  const espressoMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.6 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.75 });
  const warmEdisonMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 2.1,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    roughness: 0.08,
    transparent: true,
    opacity: 0.68,
  });

  // Main Brick Roastery Volume
  const body = new THREE.Mesh(new THREE.BoxGeometry(15.6, 5.2, 9.2), brickMat);
  body.position.set(0, 2.96, -2.6);
  g.add(body);

  // Dark Espresso Roof Parapet + Copper Roaster Chimney Stack
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.75, 9.8), espressoMat);
  parapet.position.set(0, 5.88, -2.6);
  g.add(parapet);

  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 2.6, 16), copperMat);
  chimney.position.set(5.4, 7.2, -4.4);
  g.add(chimney);

  const chimneyCap = new THREE.Mesh(new THREE.ConeGeometry(0.92, 0.55, 16), espressoMat);
  chimneyCap.position.set(5.4, 8.65, -4.4);
  g.add(chimneyCap);

  // Glowing Café Storefront Window & Espresso Counter
  const interior = new THREE.Mesh(new THREE.BoxGeometry(12.8, 3.4, 0.2), warmEdisonMat);
  interior.position.set(0, 2.25, 1.88);
  g.add(interior);

  const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(13.2, 3.6, 0.14), glassMat);
  windowGlass.position.set(0, 2.25, 2.08);
  g.add(windowGlass);

  // Striped Café Awning Canopy (9 alternating terracotta & cream ribs)
  for (let i = -4; i <= 4; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.16, 2.6),
      i % 2 === 0 ? brickMat : creamMat
    );
    stripe.position.set(i * 1.48, 4.35, 3.15);
    stripe.rotation.x = 0.28;
    g.add(stripe);
  }

  // Warm Glowing Roastery Fascia Board
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.72, 0.22), espressoMat);
  signBoard.position.set(0, 5.85, 2.38);
  g.add(signBoard);

  const signTextBar = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.26, 0.1), warmEdisonMat);
  signTextBar.position.set(0, 5.85, 2.52);
  g.add(signTextBar);

  // Outdoor Timber Bistro Patio with 3 Umbrella Tables (positioned at z = 5.8, well clear of awning & walls)
  for (const tx of [-5.2, 0, 5.2]) {
    const tablePost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0, 10), espressoMat);
    tablePost.position.set(tx, 0.92, 5.8);
    g.add(tablePost);

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.1, 16), creamMat);
    tableTop.position.set(tx, 1.42, 5.8);
    g.add(tableTop);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8), copperMat);
    pole.position.set(tx, 2.35, 5.8);
    g.add(pole);

    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.62, 12), tx === 0 ? brickMat : creamMat);
    umbrella.position.set(tx, 3.55, 5.8);
    g.add(umbrella);
  }

  addArchitecturalPlanter(g, -8.4, 4.6, 0x292524, 0x15803d);
  addArchitecturalPlanter(g, 8.4, 4.6, 0x292524, 0x15803d);

  return g;
}

/**
 * 4. Tech & Freelancers — Modern Tech & Dev Studio
 * Cantilevered graphite volume, cyan ribbon glazing, glowing dual-monitor studio & rooftop solar panels.
 */
function buildTechStudioPlot(): THREE.Group {
  const g = new THREE.Group();
  g.name = "category_plot_tech_freelance";
  createCategoryBasePlinth(g, 0x090d16, 0x1e293b, 0x38bdf8);

  const graphiteMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.45 });
  const titaniumMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.25 });
  const cyanGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 2.2,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.06,
    metalness: 0.35,
    transparent: true,
    opacity: 0.75,
  });
  const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.22, metalness: 0.65 });

  // Ground Floor Core
  const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(14.8, 3.4, 9.6), graphiteMat);
  groundFloor.position.set(-0.6, 2.06, -1.8);
  g.add(groundFloor);

  // Upper Cantilevered Titanium & Graphite Volume (shifted +X and +Z for bold architectural overhang)
  const upperVolume = new THREE.Mesh(new THREE.BoxGeometry(16.8, 3.4, 10.6), titaniumMat);
  upperVolume.position.set(0.6, 5.5, -1.0);
  g.add(upperVolume);

  // Recessed Dark Band + Cyan Ribbon Window on Upper Floor
  const upperGlow = new THREE.Mesh(new THREE.BoxGeometry(14.8, 1.8, 0.2), cyanGlowMat);
  upperGlow.position.set(0.6, 5.5, 4.18);
  g.add(upperGlow);

  const upperGlass = new THREE.Mesh(new THREE.BoxGeometry(15.2, 2.0, 0.14), glassMat);
  upperGlass.position.set(0.6, 5.5, 4.35);
  g.add(upperGlass);

  // Vertical Architectural Fin Louvers on Left Wing
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.65), graphiteMat);
    fin.position.set(-6.4 + i * 1.1, 5.5, 4.45);
    g.add(fin);
  }

  // Ground Floor Showroom Glass + Glowing Monitor Screens
  const groundGlass = new THREE.Mesh(new THREE.BoxGeometry(12.4, 2.7, 0.14), glassMat);
  groundGlass.position.set(-0.6, 1.85, 3.05);
  g.add(groundGlass);

  for (const sx of [-3.6, -0.6, 2.4]) {
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 0.12), cyanGlowMat);
    screen.position.set(sx, 1.9, 2.4);
    g.add(screen);
  }

  // Cantilever Support Column on Right Side
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.4, 0.65), graphiteMat);
  col.position.set(7.8, 2.06, 3.2);
  g.add(col);

  // Rooftop Angled Solar Array
  for (const sx of [-4.2, 0.6, 5.4]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 2.8), solarMat);
    panel.position.set(sx, 7.75, -1.6);
    panel.rotation.x = 0.24;
    g.add(panel);
  }

  // Cyan Architectural Edge Beacon Bar
  const neonBar = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.24, 0.18), cyanGlowMat);
  neonBar.position.set(0.6, 7.05, 4.36);
  g.add(neonBar);

  addArchitecturalPlanter(g, -7.8, 5.2, 0x0f172a, 0x16a34a);
  addArchitecturalPlanter(g, 7.8, 5.6, 0x0f172a, 0x16a34a);

  return g;
}

/**
 * 5. Home & Local Services — Service & Trade Hub
 * Architectural concrete workshop, glazed customer reception, high-clearance ribbed service bay & parked utility van.
 */
function buildHomeServicesPlot(): THREE.Group {
  const g = new THREE.Group();
  g.name = "category_plot_home_services";
  createCategoryBasePlinth(g, 0x1e293b, 0x475569, 0xf59e0b);

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.45 });
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: new THREE.Color(0xd97706),
    emissiveIntensity: 1.4,
  });
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 1.6,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.1,
    transparent: true,
    opacity: 0.72,
  });

  // Main Service Center Volume
  const mainHub = new THREE.Mesh(new THREE.BoxGeometry(16.8, 5.2, 9.6), concreteMat);
  mainHub.position.set(0, 2.96, -2.4);
  g.add(mainHub);

  // High-Visibility Amber Fascia Band wrapping roofline
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.95, 10.2), steelMat);
  fascia.position.set(0, 5.85, -2.4);
  g.add(fascia);

  const amberStrip = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.28, 0.22), amberMat);
  amberStrip.position.set(0, 5.85, 2.72);
  g.add(amberStrip);

  // Left Side: Glazed Customer Reception Desk
  const receptionGlow = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.2, 0.2), warmGlowMat);
  receptionGlow.position.set(-4.2, 2.1, 2.28);
  g.add(receptionGlow);

  const receptionGlass = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.4, 0.14), glassMat);
  receptionGlass.position.set(-4.2, 2.1, 2.46);
  g.add(receptionGlass);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.24, 2.0), steelMat);
  canopy.position.set(-4.2, 4.0, 3.3);
  g.add(canopy);

  // Right Side: Ribbed Service Bay Shutter Door
  const bayDoor = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.8, 0.22), steelMat);
  bayDoor.position.set(4.1, 2.26, 2.44);
  g.add(bayDoor);

  for (let r = 0; r < 5; r++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.1, 0.28), concreteMat);
    rib.position.set(4.1, 0.9 + r * 0.68, 2.48);
    g.add(rib);
  }

  // Compact White Service Utility Van parked cleanly in front of service bay (z = 5.8, ZERO building overlap!)
  const vanBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.45, 4.0), concreteMat);
  vanBody.position.set(4.1, 1.32, 5.7);
  g.add(vanBody);

  const vanStripe = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.26, 3.6), amberMat);
  vanStripe.position.set(4.1, 1.25, 5.7);
  g.add(vanStripe);

  const vanWindshield = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.65, 0.14), steelMat);
  vanWindshield.position.set(4.1, 1.62, 7.68);
  g.add(vanWindshield);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  for (const wx of [3.05, 5.15]) {
    for (const wz of [4.4, 6.9]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.74, wz);
      g.add(wheel);
    }
  }

  addArchitecturalPlanter(g, -8.2, 5.2, 0x334155, 0x15803d);

  return g;
}

/**
 * 6. Coaching & Education — Contemporary Academy Hall
 * Warm academic brick, wide classroom ribbon windows, pillared entrance porch & rooftop crest parapet.
 */
function buildAcademyPlot(): THREE.Group {
  const g = new THREE.Group();
  g.name = "category_plot_coaching_education";
  createCategoryBasePlinth(g, 0x1e293b, 0xcbd5e1, 0x3b82f6);

  const brickMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.75 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42 });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const studyGlowMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: new THREE.Color(0x60a5fa),
    emissiveIntensity: 1.65,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbfdbfe,
    roughness: 0.08,
    transparent: true,
    opacity: 0.72,
  });

  // 2-Story Academic Hall Block
  const hall = new THREE.Mesh(new THREE.BoxGeometry(16.6, 6.8, 9.8), brickMat);
  hall.position.set(0, 3.76, -2.0);
  g.add(hall);

  // Crisp White Horizontal Cornices (Mid + Roofline)
  const midBand = new THREE.Mesh(new THREE.BoxGeometry(17.1, 0.36, 10.2), trimMat);
  midBand.position.set(0, 3.76, -2.0);
  g.add(midBand);

  const roofCornice = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.55, 10.4), trimMat);
  roofCornice.position.set(0, 7.25, -2.0);
  g.add(roofCornice);

  // Illuminated Classroom Ribbon Windows (Ground & Upper Floors)
  for (const wy of [2.15, 5.45]) {
    const glow = new THREE.Mesh(new THREE.BoxGeometry(14.4, 1.75, 0.2), studyGlowMat);
    glow.position.set(0, wy, 2.8);
    g.add(glow);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(14.6, 1.85, 0.14), glassMat);
    glass.position.set(0, wy, 2.94);
    g.add(glass);
  }

  // Welcoming Pillared Academic Entrance Porch
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.45, 2.8), trimMat);
  porchRoof.position.set(0, 3.92, 4.1);
  g.add(porchRoof);

  for (const px of [-2.8, 2.8]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.3, 14), trimMat);
    pillar.position.set(px, 2.02, 5.1);
    g.add(pillar);
  }

  // Architectural Rooftop Crest / Clock Parapet
  const crest = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.35, 0.7), slateMat);
  crest.position.set(0, 8.15, 2.7);
  g.add(crest);

  const clockDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.16, 20), studyGlowMat);
  clockDisc.rotation.x = Math.PI / 2;
  clockDisc.position.set(0, 8.15, 3.08);
  g.add(clockDisc);

  // Courtyard Reading Benches & Shade Planters
  for (const bx of [-5.8, 5.8]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.72), trimMat);
    bench.position.set(bx, 0.65, 5.8);
    g.add(bench);
  }

  addArchitecturalPlanter(g, -8.4, 4.6, 0x1e293b, 0x166534);
  addArchitecturalPlanter(g, 8.4, 4.6, 0x1e293b, 0x166534);

  return g;
}

/**
 * 7. Artisans & Boutiques — Flagship Boutique & Craft House
 * Sandstone ochre facade, teak timber louvers, deep spotlighted display windows & rooftop terrace.
 */
function buildArtisanBoutiquePlot(): THREE.Group {
  const g = new THREE.Group();
  g.name = "category_plot_artisan_retail";
  createCategoryBasePlinth(g, 0x292524, 0xd6d3d1, 0xd97706);

  const sandstoneMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.62 });
  const teakMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.58 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.75 });
  const boutiqueGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 1.9,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.06,
    transparent: true,
    opacity: 0.65,
  });

  // Main Sandstone Flagship Shell
  const shell = new THREE.Mesh(new THREE.BoxGeometry(16.0, 6.2, 10.0), sandstoneMat);
  shell.position.set(0, 3.46, -1.8);
  g.add(shell);

  // Upper Teak Timber Louver Screen (Editorial Craft Signature)
  for (let i = -7; i <= 7; i++) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.4, 0.52), teakMat);
    louver.position.set(i * 0.96, 5.15, 3.35);
    g.add(louver);
  }

  // Two Deep Ground-Floor Showcase Display Windows flanking Central Alcove Entrance
  for (const wx of [-4.6, 4.6]) {
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.2, 0.2), boutiqueGlowMat);
    backWall.position.set(wx, 2.05, 2.5);
    g.add(backWall);

    // Illuminated Craft Pedestal + Sculptural Vase inside display window
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), sandstoneMat);
    pedestal.position.set(wx, 0.95, 2.85);
    g.add(pedestal);

    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, 0.95, 14), brassMat);
    vase.position.set(wx, 1.95, 2.85);
    g.add(vase);

    const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.3, 0.14), glassMat);
    windowGlass.position.set(wx, 2.05, 3.28);
    g.add(windowGlass);
  }

  // Central Teak Portal Doorway
  const portal = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.3, 0.3), teakMat);
  portal.position.set(0, 2.05, 3.18);
  g.add(portal);

  // Brass Boutique Signboard
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.55, 0.22), brassMat);
  sign.position.set(0, 6.72, 3.32);
  g.add(sign);

  // Rooftop Terrace Parapet Railings
  const terraceRail = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.7, 0.24), teakMat);
  terraceRail.position.set(0, 6.9, 3.0);
  g.add(terraceRail);

  addArchitecturalPlanter(g, -7.2, 5.2, 0x78350f, 0x15803d);
  addArchitecturalPlanter(g, 7.2, 5.2, 0x78350f, 0x15803d);

  return g;
}

/**
 * 8. Other Businesses — Urban Commercial Flagship
 * Dark basalt plinth, crisp white upper volume, wrap-around glass storefront & glowing amber brand fascia.
 */
function buildCommercialFlagshipPlot(): THREE.Group {
  const g = new THREE.Group();
  g.name = "category_plot_other_business";
  createCategoryBasePlinth(g, 0x18181b, 0x3f3f46, 0xf59e0b);

  const basaltMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65 });
  const whiteStuccoMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.42 });
  const amberGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 2.0,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.08,
    metalness: 0.25,
    transparent: true,
    opacity: 0.72,
  });

  // Ground Commercial Retail Base
  const lower = new THREE.Mesh(new THREE.BoxGeometry(15.2, 3.6, 9.4), basaltMat);
  lower.position.set(0, 2.16, -2.0);
  g.add(lower);

  // Crisp White Upper Architectural Volume
  const upper = new THREE.Mesh(new THREE.BoxGeometry(16.2, 2.9, 10.2), whiteStuccoMat);
  upper.position.set(0, 5.4, -1.8);
  g.add(upper);

  // Wrap-Around Glowing Storefront
  const glow = new THREE.Mesh(new THREE.BoxGeometry(12.8, 2.8, 0.2), amberGlowMat);
  glow.position.set(0, 1.95, 2.55);
  g.add(glow);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(13.2, 3.0, 0.14), glassMat);
  glass.position.set(0, 1.95, 2.78);
  g.add(glass);

  // Cantilevered Entrance Canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.28, 2.2), basaltMat);
  canopy.position.set(0, 3.85, 3.6);
  g.add(canopy);

  // Illuminated Brand Fascia Bar on Upper Volume
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.5, 0.2), amberGlowMat);
  fascia.position.set(0, 5.55, 3.38);
  g.add(fascia);

  addArchitecturalPlanter(g, -7.2, 5.2, 0x18181b, 0x16a34a);
  addArchitecturalPlanter(g, 7.2, 5.2, 0x18181b, 0x16a34a);

  return g;
}

export interface CategoryPlotVisualOptions {
  accentColor?: string;
  facadeTheme?: FacadeTheme;
  plotLevel?: 1 | 2 | 3;
}

/**
 * Level 2 Upgrade (Active Storefront):
 * Glowing perimeter runway LED strips, 4 illuminated architectural garden bollards & dual courtyard trees.
 */
function addLevel2ArchitecturalUpgrade(group: THREE.Group, accentColorNum: number) {
  const ledMat = new THREE.MeshStandardMaterial({
    color: accentColorNum,
    emissive: new THREE.Color(accentColorNum),
    emissiveIntensity: 2.2,
  });
  const bollardBodyMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.5,
  });

  // Illuminated left & right plinth runway strips
  for (const sx of [-10.75, 10.75]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 16.4), ledMat);
    strip.position.set(sx, 0.41, 0);
    group.add(strip);
  }

  // 4 Architectural Bollard Lights along front courtyard perimeter
  const bollardCoords: [number, number][] = [
    [-9.8, 8.1],
    [9.8, 8.1],
    [-9.8, 3.2],
    [9.8, 3.2],
  ];
  for (const [bx, bz] of bollardCoords) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.15, 10), bollardBodyMat);
    post.position.set(bx, 0.94, bz);
    group.add(post);

    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.28, 10), ledMat);
    bulb.position.set(bx, 1.62, bz);
    group.add(bulb);
  }

  // 2 Sculpted Ornamental Courtyard Trees cleanly anchored at rear plinth corners (ZERO wall clipping)
  for (const tx of [-9.4, 9.4]) {
    const tree = createTreeMesh("round");
    tree.position.set(tx, 0.36, -7.3);
    tree.scale.set(0.85, 0.85, 0.85);
    group.add(tree);
  }
}

/**
 * Level 3 Upgrade (Landmark Flagship):
 * Elevated Sky-Terrace Crown Pergola, glowing rooftop marquee halo, solar skylight canopy & vertical beacon fins.
 */
function addLevel3LandmarkCrown(group: THREE.Group, accentColorNum: number) {
  const crownFrameMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.65,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentColorNum,
    emissive: new THREE.Color(accentColorNum),
    emissiveIntensity: 2.6,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.2,
    metalness: 0.7,
  });

  // Compute safe roof height dynamically from existing building geometry so crown sits cleanly above any category
  const box = new THREE.Box3().setFromObject(group);
  const roofTopY = Math.max(6.2, Math.min(8.6, box.max.y));
  const crownBaseY = roofTopY + 0.15;
  const crownTopY = crownBaseY + 2.15;

  // 4 Sleek Steel Sky-Terrace Columns
  for (const cx of [-5.8, 5.8]) {
    for (const cz of [-4.6, 1.0]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.2, 0.32), crownFrameMat);
      col.position.set(cx, crownBaseY + 1.1, cz);
      group.add(col);
    }
  }

  // Cantilevered Sky-Terrace Canopy Rim
  const canopyRim = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.42, 6.8), crownFrameMat);
  canopyRim.position.set(0, crownTopY, -1.8);
  group.add(canopyRim);

  // Glowing Brand Accent Marquee Halo wrapping the Sky-Terrace Crown
  const frontHalo = new THREE.Mesh(new THREE.BoxGeometry(13.36, 0.16, 0.16), glowMat);
  frontHalo.position.set(0, crownTopY, 1.62);
  group.add(frontHalo);

  const backHalo = new THREE.Mesh(new THREE.BoxGeometry(13.36, 0.16, 0.16), glowMat);
  backHalo.position.set(0, crownTopY, -5.22);
  group.add(backHalo);

  // Angled Rooftop Solar Skylight Panels atop Sky-Terrace
  for (const sx of [-3.6, 0, 3.6]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 4.4), solarMat);
    panel.position.set(sx, crownTopY + 0.38, -1.8);
    panel.rotation.x = 0.14;
    group.add(panel);
  }

  // Twin Glowing Front Corner Vertical Beacon Fins
  for (const fx of [-8.3, 8.3]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.4, 0.24), glowMat);
    fin.position.set(fx, 2.6, 3.35);
    group.add(fin);
  }
}

/**
 * Factory returning a distinct, premium architectural base 3D plot for every registered business category,
 * dynamically enhanced with owner facade theme, brand accent glow, and Level 2 / Level 3 upgrades.
 */
export function createCategoryPlotMesh(
  categoryId: CategoryId,
  options?: CategoryPlotVisualOptions
): THREE.Group {
  let group: THREE.Group;
  switch (categoryId) {
    case "creative-weddings":
      group = buildCreativeAtelierPlot();
      break;
    case "beauty-wellness":
      group = buildBeautySpaPlot();
      break;
    case "food-hospitality":
      group = buildFoodCafePlot();
      break;
    case "tech-freelance":
      group = buildTechStudioPlot();
      break;
    case "home-services":
      group = buildHomeServicesPlot();
      break;
    case "coaching-education":
      group = buildAcademyPlot();
      break;
    case "artisan-retail":
      group = buildArtisanBoutiquePlot();
      break;
    case "other-business":
    default:
      group = buildCommercialFlagshipPlot();
      break;
  }

  // Apply Owner Facade Theme Finish (if non-default selected)
  if (options?.facadeTheme && options.facadeTheme !== "default") {
    const preset = FACADE_THEME_PRESETS.find((t) => t.id === options.facadeTheme);
    if (preset) {
      const plinth = group.getObjectByName("plot_base_plinth") as THREE.Mesh | undefined;
      if (plinth && plinth.material instanceof THREE.MeshStandardMaterial) {
        const mat = plinth.material.clone();
        mat.color.setHex(preset.plinthHex);
        plinth.material = mat;
      }
      const apron = group.getObjectByName("plot_apron") as THREE.Mesh | undefined;
      if (apron && apron.material instanceof THREE.MeshStandardMaterial) {
        const mat = apron.material.clone();
        mat.color.setHex(preset.trimHex);
        apron.material = mat;
      }
    }
  }

  // Apply Owner Brand Accent Glow Color
  const accentHexNum = options?.accentColor
    ? parseInt(options.accentColor.replace("#", ""), 16)
    : 0xf59e0b;
  const safeAccentNum = Number.isFinite(accentHexNum) ? accentHexNum : 0xf59e0b;

  if (options?.accentColor) {
    const led = group.getObjectByName("plot_accent_led") as THREE.Mesh | undefined;
    if (led && led.material instanceof THREE.MeshStandardMaterial) {
      const mat = led.material.clone();
      mat.color.setHex(safeAccentNum);
      mat.emissive.setHex(safeAccentNum);
      mat.emissiveIntensity = 2.0;
      led.material = mat;
    }
  }

  // Apply Earned Level 2 & Level 3 3D Architectural Upgrades
  const level = options?.plotLevel || 1;
  if (level >= 2) {
    addLevel2ArchitecturalUpgrade(group, safeAccentNum);
  }
  if (level >= 3) {
    addLevel3LandmarkCrown(group, safeAccentNum);
  }

  return group;
}
