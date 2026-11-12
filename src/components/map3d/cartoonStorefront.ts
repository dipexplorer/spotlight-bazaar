import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BusinessStorefront } from "@/types";

/**
 * Procedural Cartoon-Block Storefront Builder
 * Inspired by indiaagain.live's high-performance vertex-colored merged geometry architecture.
 * Renders complete Indian commercial street plots with zero heavy GLTF overhead at 60 FPS.
 */

// Helper to paint vertices of a geometry with a specific hex color
function paint(geo: THREE.BufferGeometry, hex: string | number): THREE.BufferGeometry {
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
}

// Box primitive with translation & vertex paint
function box(
  w: number,
  h: number,
  d: number,
  hex: string | number,
  x = 0,
  y = 0,
  z = 0
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return paint(g, hex);
}

// Cylinder / Cone primitive with translation, rotation & paint
function cylinder(
  rt: number,
  rb: number,
  h: number,
  segments: number,
  hex: string | number,
  x = 0,
  y = 0,
  z = 0
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, h, segments);
  g.translate(x, y + h / 2, z);
  return paint(g, hex);
}

// Pitched Gable Roof with triangle gable ends
function gable(
  w: number,
  d: number,
  h: number,
  hex: string | number,
  x = 0,
  y = 0,
  z = 0
): THREE.BufferGeometry {
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
  return paint(g, hex);
}

export interface StorefrontMeshResult {
  mesh: THREE.Mesh;
  hitBox: THREE.Mesh;
  badgePosition: THREE.Vector3;
  storefrontData?: BusinessStorefront;
  isConstruction?: boolean;
  isEmptyPlot?: boolean;
}

/**
 * Builds an authentic Indian Cartoon-Block Commercial Plot
 * Style 0: Traditional Indian Bazaar Shop (Terracotta roof, wooden counter, brass bells)
 * Style 1: Modern Urban Studio (Flat roof, Sintex water tank, glass facade, illuminated sign)
 * Style 2: Street Cafe & Verandah (Striped awning, outdoor seating, blackboard menu)
 * Style 3: Under Construction Plot (Wooden scaffolding, crane, progress badge)
 * Style 4: Empty "Claim Free Plot" slot
 */
export function buildCartoonStorefrontPlot(
  business: BusinessStorefront | null,
  plotIndex: number,
  isLeft: boolean,
  xOffset: number,
  zOffset: number,
  isConstruction = false,
  isEmptyPlot = false
): StorefrontMeshResult {
  const parts: THREE.BufferGeometry[] = [];

  // Plot Dimensions (aligned with road and sidewalk)
  const plotW = 16;
  const plotD = 15;
  const rotationY = isLeft ? Math.PI / 2 : -Math.PI / 2;

  // 1. Base Plot Ground (Green lawn, front stone pavers, compound wall)
  parts.push(box(plotW, 0.08, plotD, "#16281e", 0, 0, 0)); // Grassy lawn
  parts.push(box(3.2, 0.1, 5.0, "#d8d0be", 0, 0, plotD / 2 - 2.5)); // Entrance pathway

  // Compound Wall & Pillars
  parts.push(box(plotW - 4.5, 0.8, 0.25, "#e2d9cc", -(plotW / 2 - (plotW - 4.5) / 2), 0, plotD / 2 - 0.2));
  parts.push(box(4.5, 0.8, 0.25, "#e2d9cc", plotW / 2 - 2.25, 0, plotD / 2 - 0.2));
  parts.push(box(0.5, 1.2, 0.5, "#d1c7b7", -1.8, 0, plotD / 2 - 0.2)); // Left gate pillar
  parts.push(box(0.5, 1.2, 0.5, "#d1c7b7", 1.8, 0, plotD / 2 - 0.2)); // Right gate pillar

  // Potted Tulsi/Neem Plants at gate
  parts.push(cylinder(0.2, 0.14, 0.35, 6, "#c0623a", -2.4, 0, plotD / 2 - 0.6));
  parts.push(box(0.35, 0.35, 0.35, "#15803d", -2.4, 0.35, plotD / 2 - 0.6));
  parts.push(cylinder(0.2, 0.14, 0.35, 6, "#c0623a", 2.4, 0, plotD / 2 - 0.6));
  parts.push(box(0.35, 0.35, 0.35, "#15803d", 2.4, 0.35, plotD / 2 - 0.6));

  let badgeY = 9;

  if (isEmptyPlot) {
    // Clean landscaped open commercial plot - no tacky billboard clutter
    parts.push(box(12, 0.1, 10, "#14532d", 0, 0.05, 0)); // Fresh mowed green lawn
    parts.push(box(0.4, 0.6, 0.4, "#d1c7b7", -5, 0, -4)); // Survey boundary stone
    parts.push(box(0.4, 0.6, 0.4, "#d1c7b7", 5, 0, -4));
    parts.push(box(0.4, 0.6, 0.4, "#d1c7b7", -5, 0, 4));
    parts.push(box(0.4, 0.6, 0.4, "#d1c7b7", 5, 0, 4));
    badgeY = 2.0;
  } else if (isConstruction) {
    // UNDER CONSTRUCTION PLOT: Showing real-world growth
    // Unfinished red brick walls
    parts.push(box(11, 2.5, 8, "#9a3412", 0, 0.3, -1.5));
    // Concrete foundation plinth
    parts.push(box(12, 0.4, 9, "#cbd5e1", 0, 0, -1.5));
    // Wooden Scaffolding Poles
    const scaffoldColor = "#78350f";
    for (const x of [-5.5, 0, 5.5]) {
      for (const z of [-5.5, 2.5]) {
        parts.push(cylinder(0.08, 0.08, 6.5, 6, scaffoldColor, x, 0, z));
      }
    }
    // Cross beams
    parts.push(box(12, 0.1, 0.1, scaffoldColor, 0, 3.2, 2.5));
    parts.push(box(12, 0.1, 0.1, scaffoldColor, 0, 5.8, 2.5));
    // Yellow Construction Crane Tower
    parts.push(box(0.6, 12, 0.6, "#facc15", 4.5, 0, -4.5));
    parts.push(box(8, 0.5, 0.5, "#facc15", 1.5, 12, -4.5));
    badgeY = 8.5;
  } else {
    // FULLY BUILT CARTOON-BLOCK STOREFRONT
    const style = plotIndex % 3; // 0: Traditional, 1: Modern Studio, 2: Street Cafe

    // Plinth
    const plinthW = 12;
    const plinthD = 9;
    const plinthH = 0.4;
    parts.push(box(plinthW, plinthH, plinthD, "#cbd5e1", 0, 0, -1.5));
    parts.push(box(2.2, 0.2, 0.8, "#94a3b8", 0, 0, 3.2)); // Front steps

    const bldgW = 11;
    const bldgD = 8;
    const bldgH = 4.2;

    if (style === 0) {
      // STYLE 0: TRADITIONAL INDIAN BAZAAR SHOP
      // Main shop walls (warm ochre / cream)
      parts.push(box(bldgW, bldgH, bldgD, "#fef3c7", 0, plinthH, -1.5));

      // Terracotta Clay Hip/Gable Roof
      parts.push(gable(bldgW + 1.6, bldgD + 1.4, 2.6, "#b9583c", 0, plinthH + bldgH, -1.5));

      // Verandah Porch Pillars
      parts.push(cylinder(0.18, 0.22, bldgH - 0.2, 6, "#78350f", -4.8, plinthH, 2.2));
      parts.push(cylinder(0.18, 0.22, bldgH - 0.2, 6, "#78350f", 4.8, plinthH, 2.2));
      parts.push(cylinder(0.18, 0.22, bldgH - 0.2, 6, "#78350f", 0, plinthH, 2.2));

      // Porch Awning
      parts.push(box(bldgW + 0.8, 0.25, 2.4, "#b9583c", 0, plinthH + bldgH - 0.2, 1.2));

      // Wooden Display Counter & Hanging Brass Bell
      parts.push(box(4.5, 1.2, 1.2, "#92400e", 1.5, plinthH, 2.2));
      parts.push(cylinder(0.08, 0.12, 0.25, 6, "#fbbf24", 0, plinthH + 2.8, 2.2)); // Bell

      // Large Shop Window with warm illuminated interior
      parts.push(box(3.8, 2.2, 0.1, "#fef08a", -2.4, plinthH + 1.2, 2.52));
      parts.push(box(4.0, 2.4, 0.05, "#78350f", -2.4, plinthH + 1.1, 2.5));

      badgeY = plinthH + bldgH + 3.2;
    } else if (style === 1) {
      // STYLE 1: MODERN ARCHITECTURAL STUDIO / TECH HUB
      // Main obsidian & deep slate walls
      parts.push(box(bldgW, bldgH + 1.2, bldgD, "#1e293b", 0, plinthH, -1.5));

      // Rooftop Parapet Border
      parts.push(box(bldgW + 0.4, 0.6, 0.25, "#334155", 0, plinthH + bldgH + 1.2, 2.4));
      parts.push(box(bldgW + 0.4, 0.6, 0.25, "#334155", 0, plinthH + bldgH + 1.2, -5.4));
      parts.push(box(0.25, 0.6, bldgD + 0.4, "#334155", -(bldgW / 2), plinthH + bldgH + 1.2, -1.5));
      parts.push(box(0.25, 0.6, bldgD + 0.4, "#334155", bldgW / 2, plinthH + bldgH + 1.2, -1.5));

      // Rooftop Stair Mumty (Door to roof)
      parts.push(box(2.8, 2.2, 3.0, "#0f172a", -3.2, plinthH + bldgH + 1.2, -3.2));

      // Black Rooftop Water Tank (Classic Sintex Indian style)
      parts.push(cylinder(0.7, 0.7, 1.4, 12, "#18181b", 3.2, plinthH + bldgH + 1.4, -3.2));

      // Huge Tempered Glass Display Window
      parts.push(box(6.2, 3.2, 0.1, "#38bdf8", -1.2, plinthH + 0.8, 2.52));
      // Aluminum Framing
      parts.push(box(6.4, 3.4, 0.05, "#0f172a", -1.2, plinthH + 0.7, 2.5));

      // Glass Entrance Door
      parts.push(box(2.2, 3.4, 0.1, "#0284c7", 3.2, plinthH + 0.6, 2.52));

      // Sleek Modern Signboard Backing
      parts.push(box(8.5, 1.2, 0.3, "#090d16", 0, plinthH + bldgH + 0.2, 2.7));
      parts.push(box(8.7, 1.4, 0.1, "#38bdf8", 0, plinthH + bldgH + 0.1, 2.65));

      badgeY = plinthH + bldgH + 2.8;
    } else {
      // STYLE 2: STREET CAFE / BOUTIQUE WITH AWNING
      // Pastel mint/terracotta shop walls
      parts.push(box(bldgW, bldgH, bldgD, "#f0fdf4", 0, plinthH, -1.5));

      // Flat Roof with decorative cornice
      parts.push(box(bldgW + 0.6, 0.35, bldgD + 0.6, "#cbd5e1", 0, plinthH + bldgH, -1.5));

      // Striped Fabric Awning (Crimson & Cream)
      const awningW = bldgW - 1.0;
      const awningD = 2.4;
      parts.push(box(awningW, 0.18, awningD, "#e11d48", 0, plinthH + bldgH - 0.8, 2.8));
      // Awning side triangles
      parts.push(box(0.1, 0.6, awningD, "#be123c", -(awningW / 2), plinthH + bldgH - 1.1, 2.8));
      parts.push(box(0.1, 0.6, awningD, "#be123c", awningW / 2, plinthH + bldgH - 1.1, 2.8));

      // Outdoor Cafe Table & Two Stools
      parts.push(cylinder(0.65, 0.65, 0.08, 10, "#475569", -2.8, plinthH + 0.9, 3.4)); // Table top
      parts.push(cylinder(0.08, 0.08, 0.9, 6, "#0f172a", -2.8, plinthH, 3.4)); // Table leg
      parts.push(cylinder(0.28, 0.28, 0.5, 8, "#d97706", -2.8, plinthH, 2.5)); // Stool 1
      parts.push(cylinder(0.28, 0.28, 0.5, 8, "#d97706", -2.8, plinthH, 4.3)); // Stool 2

      // Chalkboard Menu Signboard
      parts.push(box(0.8, 1.4, 0.08, "#18181b", 3.2, plinthH, 3.5));
      parts.push(box(0.9, 1.5, 0.05, "#78350f", 3.2, plinthH, 3.48));

      badgeY = plinthH + bldgH + 2.4;
    }
  }

  // Merge all geometric parts into a single buffer geometry
  const mergedGeo = mergeGeometries(parts, false);
  mergedGeo.computeVertexNormals();

  // Create single Standard Material supporting vertex colors
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0.15,
  });

  const mesh = new THREE.Mesh(mergedGeo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(xOffset, 0, zOffset);
  mesh.rotation.y = rotationY;

  // Invisible Raycasting Hit Box for Clicks
  const hitBoxGeo = new THREE.BoxGeometry(plotW + 2, 12, plotD + 2);
  const hitBoxMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
  hitBox.position.set(xOffset, 6, zOffset);
  hitBox.name = `storefront_hit_${business?.id || `plot_${plotIndex}`}`;

  // Attach data to hitBox
  if (business) {
    (hitBox as unknown as { storefrontData: BusinessStorefront }).storefrontData = business;
  }

  const badgePosition = new THREE.Vector3(xOffset, badgeY, zOffset);

  return {
    mesh,
    hitBox,
    badgePosition,
    storefrontData: business || undefined,
    isConstruction,
    isEmptyPlot,
  };
}
