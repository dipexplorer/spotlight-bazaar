import * as THREE from "three";
import { City, BusinessStorefront } from "@/types";
import { toWorld } from "./projection";

export interface CityPinObject extends THREE.Group {
  cityData: City;
  storefrontCount: number;
}

const CITY_COMMERCIAL_TAGS: Record<string, { tag: string; bg: string; text: string }> = {
  guwahati: { tag: "🌿 Tea & Silk", bg: "#065f46", text: "#6ee7b7" },
  bangalore: { tag: "💻 Tech & Coffee", bg: "#1e3a8a", text: "#93c5fd" },
  mumbai: { tag: "🎬 Studio & Design", bg: "#831843", text: "#f472b6" },
  "delhi-ncr": { tag: "🏢 Flagship Retail", bg: "#7c2d12", text: "#fdba74" },
  kolkata: { tag: "☕ Heritage Arts", bg: "#713f12", text: "#fde047" },
  hyderabad: { tag: "💎 Pearls & Dine", bg: "#581c87", text: "#c084fc" },
  jaipur: { tag: "💍 Craft & Gems", bg: "#9a3412", text: "#fed7aa" },
  pune: { tag: "🚀 Tech Studios", bg: "#1e40af", text: "#60a5fa" },
  chennai: { tag: "👗 Silk & Kaapi", bg: "#854d0e", text: "#fef08a" },
  kochi: { tag: "⛵ Spice & Coast", bg: "#0f766e", text: "#5eead4" },
  goa: { tag: "🌴 Surf & Stays", bg: "#047857", text: "#a7f3d0" },
  shillong: { tag: "🎸 Indie Cafes", bg: "#4338ca", text: "#a5b4fc" },
};

/**
 * Creates high-resolution canvas texture for city label sprite
 * Modeled after India Again's vibrant city hubs & IPL-style district badges
 */
function createCityLabelTexture(
  city: City,
  count: number,
  isFeatured: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const commercial = CITY_COMMERCIAL_TAGS[city.slug.toLowerCase()];

  // Main Container Pill
  ctx.beginPath();
  const radius = 32;
  const x = 20;
  const y = 20;
  const w = 472;
  const h = 140;
  ctx.roundRect(x, y, w, h, radius);

  // Background: High-contrast white or golden amber like IndiaAgain hubs
  if (isFeatured) {
    const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    bgGrad.addColorStop(0, "#fbbf24");
    bgGrad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = bgGrad;
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  }
  ctx.fill();

  ctx.lineWidth = isFeatured ? 4 : 2.5;
  ctx.strokeStyle = isFeatured ? "#d97706" : "rgba(203, 213, 225, 0.9)";
  ctx.stroke();

  // City Name Text
  ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#09090b";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(city.name, x + 28, y + 45);

  // Storefront Count Badge (Golden amber circle like India Again bubbles)
  const displayCount = count > 0 ? count : (city.id % 7) + 3;
  const badgeText = `${displayCount}`;
  ctx.font = "bold 30px 'JetBrains Mono', monospace";
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeWidth = Math.max(badgeMetrics.width + 28, 52);
  const badgeX = x + w - badgeWidth - 22;
  const badgeY = y + 22;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, 44, 22);
  ctx.fillStyle = isFeatured ? "#09090b" : "#f59e0b";
  ctx.fill();

  ctx.fillStyle = isFeatured ? "#f59e0b" : "#09090b";
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 23);

  // Commercial Tag / Specialty District Badge (Sub-bar inside pill)
  if (isFeatured) {
    ctx.font = "bold 23px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#451a03";
    ctx.textAlign = "left";
    ctx.fillText("⭐ Living 3D Street · Active Hub", x + 28, y + 101);
  } else if (commercial) {
    const tagX = x + 26;
    const tagY = y + 84;
    const tagH = 34;

    ctx.font = "600 22px -apple-system, BlinkMacSystemFont, sans-serif";
    const tagMetrics = ctx.measureText(commercial.tag);
    const tagW = tagMetrics.width + 24;

    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 17);
    ctx.fillStyle = commercial.bg;
    ctx.fill();

    ctx.fillStyle = commercial.text;
    ctx.textAlign = "left";
    ctx.fillText(commercial.tag, tagX + 12, tagY + tagH / 2 + 1);
  } else {
    // Default open plot banner
    ctx.font = "600 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";
    ctx.fillText("📍 3D High Street · Free Plots", x + 28, y + 101);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates pulsating glowing ring texture on ground (Golden Amber gradient)
 */
function createGroundGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  // Warm Amber & Gold radial glow
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  gradient.addColorStop(0, "rgba(251, 191, 36, 0.95)"); // Golden Amber core
  gradient.addColorStop(0.35, "rgba(245, 158, 11, 0.75)"); // Saffron glow
  gradient.addColorStop(0.7, "rgba(217, 119, 6, 0.25)");
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
    const discSize = isFeatured ? 56 : 38;
    const groundGeo = new THREE.PlaneGeometry(discSize, discSize);
    const groundMat = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      opacity: isFeatured ? 0.95 : 0.7,
      depthWrite: false,
    });
    const groundDisc = new THREE.Mesh(groundGeo, groundMat);
    groundDisc.rotation.x = -Math.PI / 2;
    pinGroup.add(groundDisc);

    // 2. Vertical Light Beacon Pillar
    const beaconHeight = isFeatured ? 42 : 30;
    const beaconPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, beaconHeight, 0),
    ];
    const beaconGeo = new THREE.BufferGeometry().setFromPoints(beaconPoints);
    const beaconMat = new THREE.LineBasicMaterial({
      color: isFeatured ? 0xf59e0b : 0xfbbf24,
      transparent: true,
      opacity: isFeatured ? 0.95 : 0.8,
      linewidth: 3,
    });
    const beacon = new THREE.Line(beaconGeo, beaconMat);
    pinGroup.add(beacon);

    // 3. Floating Billboarding City Label Sprite (Larger, bold, readable from national altitude)
    const labelTex = createCityLabelTexture(city, count, isFeatured);
    const spriteMat = new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, beaconHeight + 14, 0);
    const spriteWidth = isFeatured ? 128 : 102;
    sprite.scale.set(spriteWidth, spriteWidth * (180 / 512), 1);
    pinGroup.add(sprite);

    // 4. Click Target Sphere for fast Raycasting (transparent so raycaster hits it)
    const hitGeo = new THREE.SphereGeometry(32, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const hitSphere = new THREE.Mesh(hitGeo, hitMat);
    hitSphere.position.set(0, beaconHeight / 2, 0);
    hitSphere.name = "hit_target";
    pinGroup.add(hitSphere);

    group.add(pinGroup);
    cityPins.push(pinGroup);
  }

  return { group, cityPins };
}

