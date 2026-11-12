import * as THREE from "three";
import { City, BusinessStorefront } from "@/types";
import { toWorld } from "./projection";

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
    // Featured Hub (e.g. Guwahati with Nerqiva Studio)
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer Container Pill
    const x = 12;
    const y = 12;
    const w = 488;
    const h = 136;
    const r = 28;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = "rgba(10, 15, 29, 0.94)";
    ctx.fill();

    // Vibrant Golden Amber Border
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#f59e0b";
    ctx.stroke();

    // City Name
    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(city.name, x + 24, y + 42);

    // Enter Badge in Amber
    const enterText = `${count} Shop · Enter →`;
    ctx.font = "bold 22px 'JetBrains Mono', monospace";
    const enterW = ctx.measureText(enterText).width + 24;
    const enterX = x + w - enterW - 20;
    const enterY = y + 22;

    ctx.beginPath();
    ctx.roundRect(enterX, enterY, enterW, 38, 19);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();

    ctx.fillStyle = "#0a0f1d";
    ctx.textAlign = "center";
    ctx.fillText(enterText, enterX + enterW / 2, enterY + 20);

    // Subtitle: First business name or active status
    ctx.font = "600 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.textAlign = "left";
    const sub = firstShopName ? `🌿 ${firstShopName} · Verified` : "Living 3D High Street";
    ctx.fillText(sub, x + 24, y + 96);
  } else {
    // Clean, Minimal City Pill (ZERO "Plot Available" text)
    canvas.width = 320;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x = 10;
    const y = 10;
    const w = 300;
    const h = 76;
    const r = 24;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fill();

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.stroke();

    // Glowing dot indicator
    ctx.beginPath();
    ctx.arc(x + 28, y + h / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#fbbf24";
    ctx.fill();

    // City Name
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(city.name, x + 46, y + h / 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates pulsating glowing ring texture for ground beacons
 */
function createPulseRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, "rgba(251, 191, 36, 0.95)");
  grad.addColorStop(0.35, "rgba(245, 158, 11, 0.65)");
  grad.addColorStop(0.75, "rgba(217, 119, 6, 0.15)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
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
      points.push(new THREE.Vector3(x, 4.9, z));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeo, outlineMaterial);
    group.add(line);
  }

  // 3. Flowing 3D River Networks (Ganga, Brahmaputra, Yamuna, Godavari, Krishna, Narmada, Kaveri)
  const riverMaterial = new THREE.LineBasicMaterial({
    color: 0x38bdf8, // Vibrant River Blue
    transparent: true,
    opacity: 0.8,
    linewidth: 2.2,
  });

  for (const river of riversData) {
    for (const line of river.lines) {
      if (!line || line.length < 4) continue;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < line.length; i += 2) {
        const lon = line[i];
        const lat = line[i + 1];
        if (lon !== undefined && lat !== undefined) {
          const [x, z] = toWorld(lon, lat);
          points.push(new THREE.Vector3(x, 4.95, z));
        }
      }
      if (points.length >= 2) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMesh = new THREE.Line(lineGeo, riverMaterial);
        group.add(lineMesh);
      }
    }
  }

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

  const pulseRingTexture = createPulseRingTexture();
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
    pinGroup.position.set(x, 5.0, z);

    // Ground Pulse Wave Ring
    const discSize = isFeatured ? 58 : 36;
    const ringGeo = new THREE.PlaneGeometry(discSize, discSize);
    const ringMat = new THREE.MeshBasicMaterial({
      map: pulseRingTexture,
      transparent: true,
      opacity: isFeatured ? 0.95 : 0.7,
      depthWrite: false,
    });
    const pulseRing = new THREE.Mesh(ringGeo, ringMat);
    pulseRing.rotation.x = -Math.PI / 2;
    pinGroup.add(pulseRing);
    pinGroup.pulseRing = pulseRing;

    // Vertical Light Beam / Brass Pin
    const beaconHeight = isFeatured ? 42 : 26;
    const beaconPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, beaconHeight, 0),
    ];
    const beaconGeo = new THREE.BufferGeometry().setFromPoints(beaconPoints);
    const beaconMat = new THREE.LineBasicMaterial({
      color: isFeatured ? 0xf59e0b : 0xfbbf24,
      transparent: true,
      opacity: isFeatured ? 0.95 : 0.8,
      linewidth: isFeatured ? 2.8 : 2.0,
    });
    const beacon = new THREE.Line(beaconGeo, beaconMat);
    pinGroup.add(beacon);

    // Glowing Pinhead Sphere
    const headGeo = new THREE.SphereGeometry(isFeatured ? 5.0 : 3.6, 14, 14);
    const headMat = new THREE.MeshBasicMaterial({
      color: isFeatured ? 0xf59e0b : 0xfef08a,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, beaconHeight, 0);
    pinGroup.add(head);

    // Billboard City Label Sprite (Clean, high-contrast typography, NO "Plot Available")
    const labelTex = createCityLabelTexture(city, count, cityData?.firstShopName);
    const spriteMat = new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, beaconHeight + (isFeatured ? 16 : 10), 0);
    const spriteW = isFeatured ? 88 : 52;
    const aspect = isFeatured ? 160 / 512 : 96 / 320;
    sprite.scale.set(spriteW, spriteW * aspect, 1);
    pinGroup.add(sprite);
    pinGroup.labelSprite = sprite;

    // Click HitBox for Raycasting
    const hitGeo = new THREE.SphereGeometry(isFeatured ? 32 : 24, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.set(0, beaconHeight / 2, 0);
    (hitBox as any).cityData = city;
    pinGroup.add(hitBox);
    pinGroup.hitBox = hitBox;

    group.add(pinGroup);
    cityPins.push(pinGroup);
    hitBoxes.push(hitBox);
  }

  let timer = 0;
  const update = (delta: number, isNight: boolean, camera: THREE.Camera) => {
    timer += delta;
    const ringScale = 1.0 + Math.sin(timer * 3.2) * 0.16;
    const ringOpacity = 0.85 - Math.sin(timer * 3.2) * 0.25;

    for (const pin of cityPins) {
      pin.pulseRing.scale.set(ringScale, ringScale, 1);
      if (pin.pulseRing.material instanceof THREE.MeshBasicMaterial) {
        pin.pulseRing.material.opacity = Math.max(0.3, ringOpacity);
      }
    }
  };

  const dispose = () => {
    topMaterial.dispose();
    sideMaterial.dispose();
    outlineMaterial.dispose();
    riverMaterial.dispose();
  };

  return {
    group,
    cityPins,
    hitBoxes,
    update,
    dispose,
  };
}
