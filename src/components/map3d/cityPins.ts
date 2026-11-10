import * as THREE from "three";
import { City, BusinessStorefront } from "@/types";
import { toWorld } from "./projection";

export interface CityPinObject extends THREE.Group {
  cityData: City;
  storefrontCount: number;
}

/**
 * Creates high-resolution canvas texture for city label sprite
 */
function createCityLabelTexture(
  cityName: string,
  count: number,
  isFeatured: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background pill container
  ctx.beginPath();
  const radius = 36;
  const x = 30;
  const y = 30;
  const w = 452;
  const h = 100;
  ctx.roundRect(x, y, w, h, radius);

  // Pill fill & border
  ctx.fillStyle = isFeatured ? "rgba(225, 29, 72, 0.92)" : "rgba(15, 23, 42, 0.88)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = isFeatured ? "#fb7185" : "rgba(56, 189, 248, 0.6)";
  ctx.stroke();

  // City Name Text
  ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(cityName, x + 36, y + h / 2);

  // Storefront Count Badge
  if (count > 0) {
    const badgeText = `${count}`;
    ctx.font = "bold 32px 'JetBrains Mono', monospace";
    const badgeMetrics = ctx.measureText(badgeText);
    const badgeWidth = Math.max(badgeMetrics.width + 24, 48);
    const badgeX = x + w - badgeWidth - 20;
    const badgeY = y + (h - 48) / 2;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, 48, 24);
    ctx.fillStyle = isFeatured ? "#ffffff" : "#0284c7";
    ctx.fill();

    ctx.fillStyle = isFeatured ? "#e11d48" : "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 25);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates pulsating glowing ring texture on ground
 */
function createGroundGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  gradient.addColorStop(0, "rgba(56, 189, 248, 0.95)");
  gradient.addColorStop(0.35, "rgba(14, 165, 233, 0.6)");
  gradient.addColorStop(0.7, "rgba(6, 182, 212, 0.2)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Builds all 3D interactive city pins
 */
export function buildCityPins(
  cities: City[],
  storefronts: BusinessStorefront[]
): { group: THREE.Group; cityPins: CityPinObject[] } {
  const group = new THREE.Group();
  group.name = "city_pins_group";

  // Calculate storefront counts per city
  const countsByCity = new Map<string, number>();
  for (const s of storefronts) {
    if (s?.city_name) {
      const key = s.city_name.toLowerCase();
      countsByCity.set(key, (countsByCity.get(key) || 0) + 1);
    }
  }

  const glowTexture = createGroundGlowTexture();
  const cityPins: CityPinObject[] = [];

  for (const city of cities) {
    const [x, z] = toWorld(city.lon, city.lat);
    const count = countsByCity.get(city.name.toLowerCase()) || 0;
    const isFeatured = count > 0;

    const pinGroup = new THREE.Group() as CityPinObject;
    pinGroup.cityData = city;
    pinGroup.storefrontCount = count;
    pinGroup.position.set(x, 4.7, z);

    // 1. Ground Glowing Disc
    const groundGeo = new THREE.PlaneGeometry(16, 16);
    const groundMat = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      opacity: isFeatured ? 0.9 : 0.6,
      depthWrite: false,
    });
    const groundDisc = new THREE.Mesh(groundGeo, groundMat);
    groundDisc.rotation.x = -Math.PI / 2;
    pinGroup.add(groundDisc);

    // 2. Vertical Light Beacon Pillar
    const beaconHeight = isFeatured ? 22 : 14;
    const beaconPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, beaconHeight, 0),
    ];
    const beaconGeo = new THREE.BufferGeometry().setFromPoints(beaconPoints);
    const beaconMat = new THREE.LineBasicMaterial({
      color: isFeatured ? 0xf43f5e : 0x38bdf8,
      transparent: true,
      opacity: isFeatured ? 0.85 : 0.5,
      linewidth: 2,
    });
    const beacon = new THREE.Line(beaconGeo, beaconMat);
    pinGroup.add(beacon);

    // 3. Floating Billboarding City Label Sprite
    const labelTex = createCityLabelTexture(city.name, count, isFeatured);
    const spriteMat = new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, beaconHeight + 6, 0);
    sprite.scale.set(22, 7.5, 1);
    pinGroup.add(sprite);

    // 4. Invisible Click Target Sphere for fast Raycasting
    const hitGeo = new THREE.SphereGeometry(10, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitSphere = new THREE.Mesh(hitGeo, hitMat);
    hitSphere.position.set(0, beaconHeight / 2, 0);
    hitSphere.name = "hit_target";
    pinGroup.add(hitSphere);

    group.add(pinGroup);
    cityPins.push(pinGroup);
  }

  return { group, cityPins };
}

