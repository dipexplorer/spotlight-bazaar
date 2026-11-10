import * as THREE from "three";
import { BusinessStorefront } from "@/types";

/**
 * Creates high-resolution procedural road texture with road markings
 */
export function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Dark asphalt base
  ctx.fillStyle = "#14171f";
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.08;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Dashed center road lane line
  ctx.strokeStyle = "rgba(245, 158, 11, 0.75)"; // Warm Indian yellow road marking
  ctx.lineWidth = 10;
  ctx.setLineDash([36, 28]);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  // White side curb lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 6;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(24, 512);
  ctx.moveTo(488, 0);
  ctx.lineTo(488, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

/**
 * Creates pedestrian sidewalk stone paver texture
 */
export function createSidewalkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Base stone tone
  ctx.fillStyle = "#1a2130";
  ctx.fillRect(0, 0, 256, 256);

  // Paver tile grid
  ctx.strokeStyle = "#111722";
  ctx.lineWidth = 3;

  const tileSize = 64;
  for (let x = 0; x <= 256; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 8);
  return texture;
}

/**
 * Generates an illuminated 3D neon shop signboard texture
 */
export function createNeonSignTexture(
  business: BusinessStorefront,
  isFeatured: boolean = false
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, 512, 128);

  // Signboard backing
  ctx.fillStyle = "#0c1017";
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 16);
  ctx.fill();

  // Neon illuminated border
  ctx.lineWidth = 4;
  ctx.strokeStyle = isFeatured ? "#fb7185" : "#38bdf8";
  ctx.shadowColor = isFeatured ? "#e11d48" : "#0284c7";
  ctx.shadowBlur = 12;
  ctx.stroke();

  // Reset shadow for crisp text
  ctx.shadowBlur = 0;

  // Business Name
  ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const displayName =
    business.name.length > 20 ? business.name.slice(0, 19) + "…" : business.name;
  ctx.fillText(displayName, 256, 48);

  // Starting Price / Rate Bar
  ctx.font = "600 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#fbbf24"; // Warm Amber
  const priceText = business.starting_price || "Direct WhatsApp";
  ctx.fillText(priceText, 256, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates window display texture using the business's portfolio photo
 */
export function createWindowDisplayTexture(imageUrl?: string): THREE.Texture {
  if (!imageUrl) {
    // Elegant illuminated dark showcase fallback
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#1e293b");
    grad.addColorStop(1, "#090d16");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 240, 240);

    return new THREE.CanvasTexture(canvas);
  }

  const loader = new THREE.TextureLoader();
  const texture = loader.load(imageUrl);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

