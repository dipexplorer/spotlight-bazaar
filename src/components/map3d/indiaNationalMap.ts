import * as THREE from "three";
import { City, BusinessStorefront } from "@/types";
import { toWorld } from "./projection";
import { buildRibbonRivers } from "./ribbonRivers";
import { buildTopographyMountains } from "./topographyMountains";
import { buildTopographyBeaches } from "./topographyBeaches";
import { buildProceduralFlora } from "./proceduralFlora";
import { buildHighwayNetwork, HighwayNetworkResult } from "./highwayNetwork";

export interface IndiaLandData {
  source?: string;
  rings: [number, number][][];
}

export interface RiverItem {
  name: string;
  lines: number[][];
}

export interface NationalCityPinObject extends THREE.Group {
  cityData: City;
  storefrontCount: number;
  hitBox: THREE.Mesh;
  pulseRing: THREE.Mesh;
  labelSprite: THREE.Sprite;
}

export interface NationalMapBuildResult {
  group: THREE.Group;
  cityPins: NationalCityPinObject[];
  hitBoxes: THREE.Mesh[];
  update: (delta: number, isNight: boolean, camera: THREE.Camera) => void;
  dispose: () => void;
}

/**
 * Creates clean, high-contrast billboard label for city pins
 * Strictly NO "Plot Available" junk text!
 * Featured cities (Guwahati with Nerqiva Studio) get a spotlight flagship badge.
 * Other cities get a clean, elegant city name pill.
 */
function createCityLabelTexture(
  city: City,
  count: number,
  firstShopName?: string
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const isFeatured = count > 0;

  if (isFeatured) {
    // Featured Flagship Hub (Guwahati with Nerqiva Studio)
    canvas.width = 460;
    canvas.height = 140;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x = 10;
    const y = 10;
    const w = 440;
    const h = 120;
    const r = 26;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = "rgba(10, 15, 29, 0.94)";
    ctx.fill();

    // Vibrant Golden Amber Border
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#f59e0b";
    ctx.stroke();

    // City Name
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(city.name, x + 24, y + 38);

    // Enter Badge in Amber
    const enterText = `${count} Shop · Enter →`;
    ctx.font = "bold 20px 'JetBrains Mono', monospace";
    const enterW = ctx.measureText(enterText).width + 22;
    const enterX = x + w - enterW - 16;
    const enterY = y + 20;

    ctx.beginPath();
    ctx.roundRect(enterX, enterY, enterW, 36, 18);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();

    ctx.fillStyle = "#0a0f1d";
    ctx.textAlign = "center";
    ctx.fillText(enterText, enterX + enterW / 2, enterY + 19);

    // Subtitle: Nerqiva Studio · Verified Flagship
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.textAlign = "left";
    const sub = firstShopName ? `🌿 ${firstShopName} · Verified` : "Living 3D High Street";
    ctx.fillText(sub, x + 24, y + 86);
  } else {
    // Clean, crisp white pill (matching IndiaAgain's clean tag style)
    canvas.width = 240;
    canvas.height = 70;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x = 6;
    const y = 6;
    const w = 228;
    const h = 58;
    const r = 20;

    // White Pill
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
    ctx.stroke();

    // Dot indicator
    ctx.beginPath();
    ctx.arc(x + 22, y + h / 2, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#64748b";
    ctx.fill();

    // City Name
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(city.name, x + 36, y + h / 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}



/**
 * Builds the complete 3D India National Relief Map
 */
export function buildIndiaNationalMap(
  landData: IndiaLandData,
  riversData: RiverItem[],
  cities: City[],
  storefronts: BusinessStorefront[]
): NationalMapBuildResult {
  const group = new THREE.Group();
  group.name = "india_national_map";

  // 1. Extruded 3D Land Topography of India
  const topMaterial = new THREE.MeshStandardMaterial({
    color: 0x237344, // Lush Indian topography emerald green
    roughness: 0.82,
    metalness: 0.08,
  });

  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0x144227, // Coastal rock slate cliff bevel
    roughness: 0.9,
    metalness: 0.15,
  });

  const landMaterials = [topMaterial, sideMaterial];

  for (const ring of landData.rings) {
    if (!ring || ring.length < 3) continue;

    const shape = new THREE.Shape();
    const [startLon, startLat] = ring[0];
    const [startX, startZ] = toWorld(startLon, startLat);
    shape.moveTo(startX, -startZ);

    for (let i = 1; i < ring.length; i++) {
      const [lon, lat] = ring[i];
      const [x, z] = toWorld(lon, lat);
      shape.lineTo(x, -z);
    }

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 4.8,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.8,
      bevelThickness: 1.2,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, landMaterials);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  }

  // 2. Glowing Cyan Coastline Outline Contour
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0x06b6d4, // Cyan glow
    transparent: true,
    opacity: 0.75,
    linewidth: 2,
  });

  for (const ring of landData.rings) {
    if (!ring || ring.length < 3) continue;
    const points: THREE.Vector3[] = [];
    for (const [lon, lat] of ring) {
      const [x, z] = toWorld(lon, lat);
      points.push(new THREE.Vector3(x, 6.02, z));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeo, outlineMaterial);
    group.add(line);
  }

  // 3. Volumetric Ribbon Rivers (Wide 3D strips visible from orbit to ground)
  const ribbonRivers = buildRibbonRivers(riversData);
  group.add(ribbonRivers);

  // 4. Golden Beach Coastline & Shallow Turquoise Ocean Reef Shelf
  const beaches = buildTopographyBeaches(landData);
  group.add(beaches);

  // 5. Procedural 3D Mountain Topography (Himalayas, Western Ghats, Vindhyas, Satpuras, Shillong)
  const mountains = buildTopographyMountains();
  group.add(mountains);

  // 6. Instanced Flora and Tree Clusters across fertile river basins
  const flora = buildProceduralFlora();
  group.add(flora);

  // 7. National Highway Spine & Commercial Energy Pulses
  const highways: HighwayNetworkResult = buildHighwayNetwork(cities);
  group.add(highways.group);

  // 4. Clean, Handcrafted City Hotspots (NO "Plot Available" text)
  const countsByCity = new Map<string, { count: number; firstShopName?: string }>();
  for (const s of storefronts) {
    if (s?.city_name) {
      const key = s.city_name.toLowerCase();
      const current = countsByCity.get(key) || { count: 0 };
      current.count += 1;
      if (!current.firstShopName) current.firstShopName = s.name;
      countsByCity.set(key, current);
    }
  }

  const cityPins: NationalCityPinObject[] = [];
  const hitBoxes: THREE.Mesh[] = [];

  for (const city of cities) {
    const [x, z] = toWorld(city.lon, city.lat);
    const cityData = countsByCity.get(city.name.toLowerCase());
    const count = cityData?.count || 0;
    const isFeatured = count > 0;

    const pinGroup = new THREE.Group() as NationalCityPinObject;
    pinGroup.cityData = city;
    pinGroup.storefrontCount = count;
    pinGroup.position.set(x, 6.06, z);

    // 1. Clean Circular Ground Marker (NO giant yellow beams or spheres)
    const markerGeo = new THREE.CircleGeometry(isFeatured ? 3.5 : 2.0, 24);
    const markerMat = new THREE.MeshBasicMaterial({
      color: isFeatured ? 0xf59e0b : 0xffffff,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const markerMesh = new THREE.Mesh(markerGeo, markerMat);
    markerMesh.rotation.x = -Math.PI / 2;
    markerMesh.position.y = 0.02;
    pinGroup.add(markerMesh);
    pinGroup.pulseRing = markerMesh;

    // 2. Crisp Floating City Pill Tag floating cleanly near ground
    const labelTex = createCityLabelTexture(city, count, cityData?.firstShopName);
    const spriteMat = new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    const labelY = isFeatured ? 9.5 : 6.8;
    sprite.position.set(0, labelY, 0);
    const spriteW = isFeatured ? 52 : 32;
    const aspect = isFeatured ? 140 / 460 : 70 / 240;
    sprite.scale.set(spriteW, spriteW * aspect, 1);
    pinGroup.add(sprite);
    pinGroup.labelSprite = sprite;

    // 3. Click HitBox for Raycasting
    const hitGeo = new THREE.SphereGeometry(isFeatured ? 24 : 16, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.set(0, labelY / 2, 0);
    (hitBox as any).cityData = city;
    pinGroup.add(hitBox);
    pinGroup.hitBox = hitBox;

    group.add(pinGroup);
    cityPins.push(pinGroup);
    hitBoxes.push(hitBox);
  }

  const update = (delta: number, _isNight: boolean, _camera: THREE.Camera) => {
    highways.update(delta);
  };

  const dispose = () => {
    topMaterial.dispose();
    sideMaterial.dispose();
    outlineMaterial.dispose();
    highways.dispose();
    ribbonRivers.geometry.dispose();
    if (ribbonRivers.material instanceof THREE.Material) {
      ribbonRivers.material.dispose();
    }
  };

  return {
    group,
    cityPins,
    hitBoxes,
    update,
    dispose,
  };
}
