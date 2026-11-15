



import * as THREE from "three";
import { BusinessStorefront, City } from "@/types";
import { buildCartoonStorefrontPlot, StorefrontMeshResult } from "./cartoonStorefront";
import { createStripedCurbTexture } from "./streetTextures";
import { computeDynamicStorefrontPlacements } from "./dynamicStorefrontPlacement";
import { buildGuwahatiCity } from "./guwahatiCityModel";
import { getCityGeoConfig, CityGeoConfig } from "@/lib/geo/cityGeoRegistry";
import { TrafficSystem } from "./trafficSystem";
import { PedestrianSystem } from "./pedestrianSystem";
import { BazaarStreetBuildResult } from "./bazaarStreet";

export interface RoadSegmentDef {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  name: string;
}

export const MUMBAI_ROADS: RoadSegmentDef[] = [
  { x1: 0.0, z1: -180.0, x2: 0.0, z2: -120.0, width: 10.0, name: "Western Express Highway (Andheri)" },
  { x1: 0.0, z1: -120.0, x2: 0.0, z2: -60.0, width: 10.0, name: "Western Express Highway (Santacruz)" },
  { x1: 0.0, z1: -60.0, x2: 0.0, z2: -0.0, width: 10.0, name: "Western Express Highway (Bandra Kalanagar)" },
  { x1: 0.0, z1: -0.0, x2: 15.0, z2: 45.0, width: 10.0, name: "Sion-Bandra Link Road" },
  { x1: -30.0, z1: -40.0, x2: -55.0, z2: -0.0, width: 9.5, name: "Bandra Sea Link Approach" },
  { x1: -55.0, z1: -0.0, x2: -45.0, z2: 55.0, width: 10.0, name: "Bandra-Worli Sea Link" },
  { x1: -45.0, z1: 55.0, x2: -20.0, z2: 65.0, width: 9.5, name: "Worli Sea Face Connector" },
  { x1: -45.0, z1: -160.0, x2: -45.0, z2: -90.0, width: 8.5, name: "SV Road (Andheri - Juhu Link)" },
  { x1: -45.0, z1: -90.0, x2: -30.0, z2: -40.0, width: 8.5, name: "SV Road (Santacruz - Bandra)" },
  { x1: -30.0, z1: -40.0, x2: -10.0, z2: -0.0, width: 8.5, name: "SV Road Bandra Terminus" },
  { x1: -30.0, z1: -40.0, x2: -40.0, z2: -25.0, width: 8.0, name: "Linking Road (Bandra Shopping High Street)" },
  { x1: -40.0, z1: -25.0, x2: -35.0, z2: 10.0, width: 8.0, name: "Linking Road South" },
  { x1: -40.0, z1: -25.0, x2: -55.0, z2: -25.0, width: 7.5, name: "Hill Road Bandra West" },
  { x1: -55.0, z1: -25.0, x2: -65.0, z2: -15.0, width: 7.5, name: "Bandstand Promenade Drive" },
  { x1: 0.0, z1: -0.0, x2: 45.0, z2: -25.0, width: 9.5, name: "BKC Connector Boulevard" },
  { x1: 45.0, z1: -25.0, x2: 90.0, z2: -25.0, width: 9.5, name: "BKC Avenue 1 (Finance Center)" },
  { x1: 45.0, z1: -25.0, x2: 45.0, z2: 20.0, width: 9.0, name: "BKC G-Block Main Road" },
  { x1: 45.0, z1: 20.0, x2: 90.0, z2: 20.0, width: 9.0, name: "BKC Bharat Diamond Bourse Link" },
  { x1: 90.0, z1: -25.0, x2: 90.0, z2: 20.0, width: 8.5, name: "BKC East Avenue" },
  { x1: -20.0, z1: 65.0, x2: -20.0, z2: 110.0, width: 9.5, name: "Dr. Annie Besant Road (Worli)" },
  { x1: -20.0, z1: 110.0, x2: -20.0, z2: 150.0, width: 9.5, name: "Marine Drive (Queen's Necklace)" },
  { x1: -20.0, z1: 150.0, x2: -10.0, z2: 180.0, width: 9.5, name: "Nariman Point Promenade" },
  { x1: -20.0, z1: 150.0, x2: 15.0, z2: 150.0, width: 8.5, name: "Churchgate Station Road" },
  { x1: 15.0, z1: 150.0, x2: 15.0, z2: 120.0, width: 8.5, name: "Fort & Kala Ghoda Heritage Avenue" },
];

export const BANGALORE_ROADS: RoadSegmentDef[] = [
  { x1: -45.0, z1: -0.0, x2: 0.0, z2: -0.0, width: 9.5, name: "Mahatma Gandhi Road West (Trinity to Anil Kumble)" },
  { x1: 0.0, z1: -0.0, x2: 45.0, z2: -0.0, width: 9.5, name: "MG Road East (Boulevard & Metro)" },
  { x1: 0.0, z1: -0.0, x2: 0.0, z2: 45.0, width: 8.5, name: "Brigade Road Commercial Promenade" },
  { x1: 0.0, z1: 45.0, x2: 0.0, z2: 85.0, width: 8.5, name: "Hosur Road (Richmond to Dairy Circle)" },
  { x1: -45.0, z1: -0.0, x2: -45.0, z2: 45.0, width: 8.5, name: "Residency Road Commercial Avenue" },
  { x1: -45.0, z1: 45.0, x2: 0.0, z2: 45.0, width: 8.5, name: "Commissariat Road Link" },
  { x1: 45.0, z1: -0.0, x2: 65.0, z2: -15.0, width: 9.0, name: "Old Airport Road (Domlur Flyover)" },
  { x1: 65.0, z1: -15.0, x2: 65.0, z2: -75.0, width: 9.0, name: "100 Feet Road (Indiranagar High Street)" },
  { x1: 65.0, z1: -75.0, x2: 45.0, z2: -75.0, width: 8.0, name: "CMH Road Indiranagar" },
  { x1: 45.0, z1: -75.0, x2: 45.0, z2: -0.0, width: 8.5, name: "Old Madras Road Connector" },
  { x1: 65.0, z1: -45.0, x2: 95.0, z2: -45.0, width: 7.5, name: "12th Main Road Gourmet Street" },
  { x1: 0.0, z1: 85.0, x2: 45.0, z2: 75.0, width: 9.0, name: "Intermediate Ring Road (Domlur to Koramangala)" },
  { x1: 45.0, z1: 75.0, x2: 45.0, z2: 110.0, width: 9.0, name: "80 Feet Road (Koramangala 4th Block)" },
  { x1: 45.0, z1: 110.0, x2: 85.0, z2: 110.0, width: 8.5, name: "Koramangala 100ft Inner Ring" },
  { x1: 45.0, z1: 110.0, x2: 0.0, z2: 110.0, width: 8.5, name: "Sony World Junction Avenue" },
  { x1: 45.0, z1: 75.0, x2: 95.0, z2: 45.0, width: 10.0, name: "Outer Ring Road (Embassy GolfLinks)" },
  { x1: 95.0, z1: 45.0, x2: 135.0, z2: 75.0, width: 10.0, name: "Outer Ring Road (Bellandur EcoSpace)" },
  { x1: 135.0, z1: 75.0, x2: 160.0, z2: 110.0, width: 10.0, name: "Outer Ring Road (Marathahalli Flyover)" },
  { x1: 85.0, z1: 110.0, x2: 135.0, z2: 75.0, width: 8.5, name: "Sarjapur Road Link" },
  { x1: 85.0, z1: 110.0, x2: 75.0, z2: 140.0, width: 8.5, name: "HSR Layout Sector 1 Main Road" },
  { x1: 75.0, z1: 140.0, x2: 45.0, z2: 140.0, width: 8.5, name: "HSR 27th Main Commercial High Street" },
];

export const DELHI_ROADS: RoadSegmentDef[] = [
  { x1: -25.0, z1: -0.0, x2: 0.0, z2: -25.0, width: 9.0, name: "Connaught Place Inner Circle NW" },
  { x1: 0.0, z1: -25.0, x2: 25.0, z2: -0.0, width: 9.0, name: "Connaught Place Inner Circle NE" },
  { x1: 25.0, z1: -0.0, x2: 0.0, z2: 25.0, width: 9.0, name: "Connaught Place Inner Circle SE" },
  { x1: 0.0, z1: 25.0, x2: -25.0, z2: -0.0, width: 9.0, name: "Connaught Place Inner Circle SW" },
  { x1: 0.0, z1: 25.0, x2: 0.0, z2: 65.0, width: 9.5, name: "Janpath Avenue (Central Cottage to Windsor)" },
  { x1: 25.0, z1: -0.0, x2: 70.0, z2: -0.0, width: 9.5, name: "Barakhamba Road (Mandi House Link)" },
  { x1: -25.0, z1: -0.0, x2: -70.0, z2: -0.0, width: 9.5, name: "Baba Kharak Singh Marg" },
  { x1: 0.0, z1: -25.0, x2: 0.0, z2: -70.0, width: 9.5, name: "Minto Road to New Delhi Railway" },
  { x1: 0.0, z1: 65.0, x2: 25.0, z2: 45.0, width: 9.0, name: "Ashoka Road to India Gate" },
  { x1: 25.0, z1: 45.0, x2: 25.0, z2: 85.0, width: 9.0, name: "Shahjahan Road (Khan Market Approach)" },
  { x1: 25.0, z1: 85.0, x2: 45.0, z2: 85.0, width: 8.5, name: "Khan Market High Street Lane" },
  { x1: -80.0, z1: 85.0, x2: 0.0, z2: 85.0, width: 10.0, name: "Mahatma Gandhi Ring Road (AIIMS)" },
  { x1: 0.0, z1: 85.0, x2: 70.0, z2: 85.0, width: 10.0, name: "Ring Road (South Extension Part 1 & 2)" },
  { x1: 70.0, z1: 85.0, x2: 130.0, z2: 85.0, width: 10.0, name: "Ring Road (Lajpat Nagar / Ashram)" },
  { x1: 0.0, z1: 85.0, x2: -15.0, z2: 120.0, width: 8.5, name: "Sri Aurobindo Marg (Hauz Khas Approach)" },
  { x1: -15.0, z1: 120.0, x2: -35.0, z2: 145.0, width: 8.0, name: "Hauz Khas Village Road" },
  { x1: -80.0, z1: 85.0, x2: -120.0, z2: 140.0, width: 10.0, name: "NH-48 Delhi-Gurgaon Expressway" },
  { x1: -120.0, z1: 140.0, x2: -120.0, z2: 180.0, width: 10.0, name: "Cyber Hub & Golf Course Road" },
];

export const SHILLONG_ROADS: RoadSegmentDef[] = [
  { x1: -40.0, z1: 0.0, x2: 0.0, z2: 0.0, width: 9.0, name: "Police Bazar Commercial Circle" },
  { x1: 0.0, z1: 0.0, x2: 30.0, z2: -15.0, width: 8.5, name: "Ward's Lake Promenade" },
  { x1: 0.0, z1: 0.0, x2: 45.0, z2: 25.0, width: 9.0, name: "Laitumkhrah Main High Street" },
  { x1: 45.0, z1: 25.0, x2: 85.0, z2: 40.0, width: 8.5, name: "Don Bosco / Cathedral Avenue" },
  { x1: 0.0, z1: 0.0, x2: -25.0, z2: -45.0, width: 8.5, name: "Polo Ground Sports Boulevard" },
  { x1: -25.0, z1: -45.0, x2: 20.0, z2: -65.0, width: 8.0, name: "Golf Links Scenic Drive" },
  { x1: -40.0, z1: 0.0, x2: -50.0, z2: 35.0, width: 8.5, name: "GS Road Shillong Gateway" },
  { x1: -50.0, z1: 35.0, x2: -65.0, z2: 80.0, width: 9.0, name: "Upper Shillong & Peak Road" },
  { x1: -65.0, z1: 80.0, x2: -110.0, z2: 120.0, width: 8.5, name: "Elephant Falls Approach" },
];

/**
 * Returns the road segments for a given city slug.
 */
export function getCityRoads(slug: string): RoadSegmentDef[] {
  const s = slug.toLowerCase();
  if (s.includes("mumbai")) return MUMBAI_ROADS;
  if (s.includes("bangalore") || s.includes("bengaluru")) return BANGALORE_ROADS;
  if (s.includes("delhi")) return DELHI_ROADS;
  if (s.includes("shillong")) return SHILLONG_ROADS;
  // Default regional arterial grid for other cities
  return [
    { x1: -120, z1: 0, x2: 120, z2: 0, width: 9.5, name: "Grand Trunk Commercial Boulevard" },
    { x1: 0, z1: -100, x2: 0, z2: 100, width: 9.5, name: "High Street Central Avenue" },
    { x1: -60, z1: -50, x2: 60, z2: -50, width: 8.5, name: "Heritage Market Promenade" },
    { x1: -60, z1: 50, x2: 60, z2: 50, width: 8.5, name: "Station Road Link" },
    { x1: -60, z1: -50, x2: -60, z2: 50, width: 8.0, name: "West Ring Avenue" },
    { x1: 60, z1: -50, x2: 60, z2: 50, width: 8.0, name: "East Ring Avenue" },
  ];
}

/**
 * Universal Dynamic 3D City Builder Engine
 * Dynamically constructs authentic 3D city environments for any Indian location:
 * - Real GIS road network with dark asphalt ribbons and seamless junction nodes
 * - Authentic landscape features (Arabian Sea & Marine Drive for Mumbai, Lakes for Bangalore, Yamuna for Delhi)
 * - Dynamic GPS placement of registered businesses and official claimable plots
 * - Regional animated traffic (Autos, Taxis, City buses)
 */
export function buildUniversalCity(
  city: City,
  storefronts: BusinessStorefront[],
  dynamicRoads?: RoadSegmentDef[]
): BazaarStreetBuildResult {
  const slug = (city.slug || city.name).toLowerCase();

  // Guwahati has a dedicated, handcrafted GIS 3D model with Saraighat Bridge,
  // Brahmaputra S-curve, Umananda Island, Nilachal/Kamakhya hills & Google Maps road network.
  if (slug === "guwahati") {
    const guwahati = buildGuwahatiCity(storefronts);
    return {
      group: guwahati.group,
      hitBoxes: guwahati.hitBoxes,
      plots: guwahati.plots,
      traffic: {
        group: new THREE.Group(),
        update: (delta) => guwahati.update(delta),
        dispose: () => guwahati.dispose(),
      },
      pedestrians: {
        group: new THREE.Group(),
        update: () => {},
        dispose: () => {},
      },
    };
  }

  const group = new THREE.Group();
  group.name = `city_system_${slug}`;

  const hitBoxes: THREE.Mesh[] = [];
  const plots: StorefrontMeshResult[] = [];
  const disposables: { dispose: () => void }[] = [];

  const config: CityGeoConfig = getCityGeoConfig(slug);
  const roads = dynamicRoads && dynamicRoads.length > 0 ? dynamicRoads : getCityRoads(slug);

  // 1. TERRAIN & NATURAL LANDSCAPE
  const terrainGeo = new THREE.PlaneGeometry(3200, 2800, 80, 70);
  terrainGeo.rotateX(-Math.PI / 2);

  // Topographical styling based on city landscape type
  const isCoastal = config.landscapeType === "coastal_peninsula"; // Mumbai
  const isPlateau = config.landscapeType === "plateau_lakes";     // Bangalore
  const isRiverPlain = config.landscapeType === "river_plain";    // Delhi
  const isMountain = config.landscapeType === "mountain_highland"; // Shillong

  const groundColor = isCoastal
    ? 0x2e7d32 // Coastal lush palm green
    : isPlateau
    ? 0x15803d // Garden City emerald green
    : isRiverPlain
    ? 0x3f6212 // Gangetic plain olive green
    : isMountain
    ? 0x1b4332 // Alpine pine mountain green
    : 0x247a3e;

  const terrainMat = new THREE.MeshStandardMaterial({
    color: groundColor,
    roughness: 0.88,
    metalness: 0.04,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 2. WATER BODIES (Arabian Sea, Yamuna, Ulsoor Lake, etc.)
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.16,
    metalness: 0.38,
    transparent: true,
    opacity: 0.94,
  });
  const cyanRimMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // Signature cartoon cyan shallow water rim (matching indiaagain)
    roughness: 0.15,
    metalness: 0.25,
    transparent: true,
    opacity: 0.95,
  });
  disposables.push(waterMat, cyanRimMat);

  for (const wb of config.waterBodies) {
    const wGeo = new THREE.PlaneGeometry(wb.width, wb.length);
    wGeo.rotateX(-Math.PI / 2);
    if (wb.rotationY) wGeo.rotateY(wb.rotationY);
    const wMesh = new THREE.Mesh(wGeo, waterMat);
    wMesh.position.set(wb.x, 0.04, wb.z);
    wMesh.receiveShadow = true;
    group.add(wMesh);

    // Cyan shallow water border rim
    const rimGeo = new THREE.PlaneGeometry(wb.width + 8, wb.length + 8);
    rimGeo.rotateX(-Math.PI / 2);
    if (wb.rotationY) rimGeo.rotateY(wb.rotationY);
    const rimMesh = new THREE.Mesh(rimGeo, cyanRimMat);
    rimMesh.position.set(wb.x, 0.038, wb.z);
    group.add(rimMesh);

    disposables.push(wGeo, rimGeo);

    // Sandy coast/beach for oceans & lakes
    if (wb.type === "ocean" || wb.type === "lake") {
      const sandGeo = new THREE.PlaneGeometry(wb.width + 18, wb.length + 18);
      sandGeo.rotateX(-Math.PI / 2);
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xf1dfaa, roughness: 0.9 });
      const sandMesh = new THREE.Mesh(sandGeo, sandMat);
      sandMesh.position.set(wb.x, 0.035, wb.z);
      sandMesh.receiveShadow = true;
      group.add(sandMesh);
      disposables.push(sandGeo, sandMat);
    }
  }

  // Faceted Mountain Ridge Hills for Highland landscapes (Shillong)
  if (isMountain) {
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x1b4332,
      roughness: 0.88,
      flatShading: true,
    });
    disposables.push(hillMat);
    const hillOffsets = [
      { x: -140, z: -160, r: 80, h: 55 },
      { x: 0, z: -200, r: 95, h: 65 },
      { x: 150, z: -170, r: 85, h: 60 },
      { x: -180, z: 80, r: 90, h: 60 },
      { x: 160, z: 120, r: 85, h: 58 },
      { x: -90, z: 200, r: 100, h: 70 },
      { x: 90, z: 210, r: 95, h: 68 },
    ];
    for (const ho of hillOffsets) {
      const hGeo = new THREE.ConeGeometry(ho.r, ho.h, 7);
      const hMesh = new THREE.Mesh(hGeo, hillMat);
      hMesh.position.set(ho.x, ho.h / 2, ho.z);
      group.add(hMesh);
      disposables.push(hGeo);
    }
  }

  // 3. 3D SOLID ASPHALT ROADS & JUNCTION NODES
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.82,
    metalness: 0.08,
  });
  disposables.push(roadMat);

  // Unique junction map for seamless circular discs
  const junctionMap = new Map<string, { x: number; z: number; maxRadius: number }>();
  for (const r of roads) {
    for (const pt of [{ x: r.x1, z: r.z1 }, { x: r.x2, z: r.z2 }]) {
      const key = `${pt.x.toFixed(1)},${pt.z.toFixed(1)}`;
      const existing = junctionMap.get(key);
      const rad = r.width * 0.6;
      if (!existing) {
        junctionMap.set(key, { x: pt.x, z: pt.z, maxRadius: rad });
      } else {
        existing.maxRadius = Math.max(existing.maxRadius, rad);
      }
    }
  }

  // Rounded junction discs at Y = 0.16
  for (const j of junctionMap.values()) {
    const jGeo = new THREE.CylinderGeometry(j.maxRadius, j.maxRadius, 0.32, 24);
    const jMesh = new THREE.Mesh(jGeo, roadMat);
    jMesh.position.set(j.x, 0.16, j.z);
    jMesh.receiveShadow = true;
    group.add(jMesh);
    disposables.push(jGeo);
  }

  // Materials for physical road details
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.78,
  });
  const whiteStripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const yellowDashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const whiteDashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  disposables.push(sidewalkMat, whiteStripeMat, yellowDashMat, whiteDashMat);

  // Extrude each road segment with sidewalks, shoulder lines and center dashes
  for (const r of roads) {
    const dx = r.x2 - r.x1;
    const dz = r.z2 - r.z1;
    const len = Math.hypot(dx, dz);
    if (len < 1.0) continue;
    const angle = Math.atan2(dx, dz);
    const midX = (r.x1 + r.x2) / 2;
    const midZ = (r.z1 + r.z2) / 2;

    // 1. Asphalt Road Bed
    const roadGeo = new THREE.BoxGeometry(r.width, 0.32, len);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(midX, 0.16, midZ);
    roadMesh.rotation.y = angle;
    roadMesh.receiveShadow = true;
    group.add(roadMesh);
    disposables.push(roadGeo);

    // 2. Safe Junction Insets & Continuous Concrete Sidewalks on BOTH sides
    const startJunction = junctionMap.get(`${r.x1.toFixed(1)},${r.z1.toFixed(1)}`);
    const endJunction = junctionMap.get(`${r.x2.toFixed(1)},${r.z2.toFixed(1)}`);
    const startInset = Math.max(r.width * 0.65, startJunction ? startJunction.maxRadius * 1.05 : 0);
    const endInset = Math.max(r.width * 0.65, endJunction ? endJunction.maxRadius * 1.05 : 0);
    const curbLen = len - startInset - endInset;

    if (curbLen > 2.5) {
      const startParam = startInset / len;
      const endParam = 1.0 - endInset / len;
      const midParam = (startParam + endParam) / 2;
      const curbCenterX = r.x1 + dx * midParam;
      const curbCenterZ = r.z1 + dz * midParam;

      const curbW = 1.1;
      const curbH = 0.22;
      for (const side of [-1, 1]) {
        const curbGeo = new THREE.BoxGeometry(curbW, curbH, curbLen);
        const curbMesh = new THREE.Mesh(curbGeo, sidewalkMat);
        const perpDist = (r.width / 2 + curbW / 2) * side;
        const perpX = Math.cos(angle) * perpDist;
        const perpZ = -Math.sin(angle) * perpDist;
        curbMesh.position.set(curbCenterX + perpX, 0.22, curbCenterZ + perpZ);
        curbMesh.rotation.y = angle;
        curbMesh.receiveShadow = true;
        group.add(curbMesh);
        disposables.push(curbGeo);
      }
    }

    const isArterialMarked =
      r.width >= 8.5 ||
      r.name.includes("Highway") ||
      r.name.includes("Road") ||
      r.name.includes("Avenue") ||
      r.name.includes("Drive");

    // 3. Painted Solid White Road Shoulder Stripes (Inset from junctions)
    if (curbLen > 4.0 && isArterialMarked) {
      const startParam = startInset / len;
      const endParam = 1.0 - endInset / len;
      const midParam = (startParam + endParam) / 2;
      const stripeCenterX = r.x1 + dx * midParam;
      const stripeCenterZ = r.z1 + dz * midParam;
      const stripeW = 0.22;

      for (const side of [-1, 1]) {
        const stripeGeo = new THREE.BoxGeometry(stripeW, 0.015, curbLen);
        const stripeMesh = new THREE.Mesh(stripeGeo, whiteStripeMat);
        const perpDist = (r.width / 2 - stripeW * 1.2) * side;
        const perpX = Math.cos(angle) * perpDist;
        const perpZ = -Math.sin(angle) * perpDist;
        stripeMesh.position.set(stripeCenterX + perpX, 0.328, stripeCenterZ + perpZ);
        stripeMesh.rotation.y = angle;
        group.add(stripeMesh);
        disposables.push(stripeGeo);
      }
    }

    // 4. Physical 3D Painted Dashed Centerline (Clean, thin white dashes matching indiaagain.live)
    if (len >= 16.0 && isArterialMarked) {
      const dashW = 0.22;
      const dashLen = 2.2;
      const gapLen = 2.2;
      const period = dashLen + gapLen;
      const numDashes = Math.floor(len / period);
      const activeDashMat = whiteDashMat;
      const minInset = Math.max(r.width * 0.9, 7.0);
      const minParam = minInset / len;
      const maxParam = 1.0 - minInset / len;

      for (let d = 0; d < numDashes; d++) {
        const tCenter = ((d + 0.5) * period) / len;
        if (tCenter < minParam || tCenter > maxParam) continue;
        const posX = r.x1 + dx * tCenter;
        const posZ = r.z1 + dz * tCenter;

        const dashGeo = new THREE.BoxGeometry(dashW, 0.015, dashLen);
        const dashMesh = new THREE.Mesh(dashGeo, activeDashMat);
        dashMesh.position.set(posX, 0.328, posZ);
        dashMesh.rotation.y = angle;
        group.add(dashMesh);
        disposables.push(dashGeo);
      }
    }
  }

  // 4. DYNAMIC GPS STOREFRONT PLACEMENT & CLAIMABLE PLOTS
  const cityStorefronts = storefronts.filter(
    (s) => !s?.city_name || s.city_name.toLowerCase() === city.name.toLowerCase()
  );

  const plotPlacements = computeDynamicStorefrontPlacements(
    cityStorefronts,
    roads,
    config.colonies,
    config.anchor
  );

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
      isEmptyPlot,
      p.rotationY
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

  // 5. REGIONAL VEGETATION & CANOPY (Instanced Trees with Zero Road Clipping)
  const treeGeo = new THREE.DodecahedronGeometry(1.8, 0);
  treeGeo.translate(0, 2.2, 0);
  const treeMat = new THREE.MeshStandardMaterial({
    color: groundColor,
    roughness: 0.88,
    flatShading: true,
  });
  const totalTrees = 160;
  const treeInst = new THREE.InstancedMesh(treeGeo, treeMat, totalTrees);
  const treeDummy = new THREE.Object3D();
  let tIdx = 0;

  for (let i = 0; i < totalTrees; i++) {
    const angle = (i / totalTrees) * Math.PI * 2 * 6;
    const radius = 25 + (i % 20) * 8;
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius;

    // Road & plot clearance check
    let clear = true;
    for (const p of plotPlacements) {
      if (Math.hypot(tx - p.x, tz - p.z) < 20) {
        clear = false;
        break;
      }
    }
    if (clear) {
      for (const rd of roads) {
        const dx = rd.x2 - rd.x1;
        const dz = rd.z2 - rd.z1;
        const lenSq = dx * dx + dz * dz;
        const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((tx - rd.x1) * dx + (tz - rd.z1) * dz) / lenSq));
        const px = rd.x1 + t * dx;
        const pz = rd.z1 + t * dz;
        if (Math.hypot(tx - px, tz - pz) < rd.width / 2 + 4.0) {
          clear = false;
          break;
        }
      }
    }

    if (!clear) continue;

    treeDummy.position.set(tx, 0.2, tz);
    const s = 1.0 + (i % 5) * 0.15;
    treeDummy.scale.set(s, s * 1.3, s);
    treeDummy.rotation.y = i * 0.7;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  treeInst.count = tIdx;
  treeInst.instanceMatrix.needsUpdate = true;
  group.add(treeInst);
  disposables.push(treeGeo, treeMat);

  // 6. ANIMATED REGIONAL TRAFFIC
  const vehicles: { mesh: THREE.Group; waypoints: [number, number, number][]; wp: number; t: number; speed: number }[] = [];
  
  if (roads.length >= 2) {
    const busMesh = new THREE.Group();
    const busBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, 7.5),
      new THREE.MeshStandardMaterial({ color: isCoastal ? 0xb91c1c : isPlateau ? 0x0284c7 : 0x16a34a })
    );
    busBody.position.y = 1.3;
    busMesh.add(busBody);
    group.add(busMesh);

    const r0 = roads[0];
    const r1 = roads[1];
    vehicles.push({
      mesh: busMesh,
      waypoints: [
        [r0.x1, 0.32, r0.z1],
        [r0.x2, 0.32, r0.z2],
        [r1.x1, 0.32, r1.z1],
        [r1.x2, 0.32, r1.z2],
      ],
      wp: 0,
      t: 0,
      speed: 4.5,
    });
  }

  const update = (delta: number) => {
    const dt = Math.min(delta, 0.1);
    for (const v of vehicles) {
      const p1 = v.waypoints[v.wp];
      const nextIdx = (v.wp + 1) % v.waypoints.length;
      const p2 = v.waypoints[nextIdx];
      const dx = p2[0] - p1[0];
      const dz = p2[2] - p1[2];
      const dist = Math.hypot(dx, dz);
      v.t += (v.speed * dt) / Math.max(dist, 1);
      if (v.t >= 1) {
        v.t = 0;
        v.wp = nextIdx;
      }
      v.mesh.position.set(p1[0] + dx * v.t, 0.32, p1[2] + dz * v.t);
      v.mesh.rotation.y = Math.atan2(dx, dz);
    }
  };

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  const traffic: TrafficSystem = {
    group: new THREE.Group(),
    update,
    dispose,
  };

  const pedestrians: PedestrianSystem = {
    group: new THREE.Group(),
    update: () => {},
    dispose: () => {},
  };

  return {
    group,
    hitBoxes,
    traffic,
    pedestrians,
    plots,
  };
}
