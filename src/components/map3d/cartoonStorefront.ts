import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BusinessStorefront } from "@/types";

/**
 * Procedural Cartoon-Block Storefront Builder
 * Inspired by indiaagain.live's high-performance vertex-colored merged geometry architecture,
 * elevated with modern architectural villa design, cantilevered balconies, teak wood louvers,
 * rooftop pergolas, black Sintex water tanks, paved driveways, and parked modern cars.
 * Renders complete commercial street plots with zero heavy GLTF overhead at 60 FPS.
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

// Low-poly modern sedan / SUV parked on the plot driveway
function buildParkedCar(
  parts: THREE.BufferGeometry[],
  cx: number,
  cy: number,
  cz: number,
  bodyColor = "#f8fafc"
) {
  // Lower body chassis
  parts.push(box(2.1, 0.55, 4.4, bodyColor, cx, cy + 0.35, cz));
  // Aerodynamic cabin greenhouse
  parts.push(box(1.75, 0.65, 2.3, "#0f172a", cx, cy + 0.9, cz - 0.2));
  // Windshield & rear window tint
  parts.push(box(1.68, 0.52, 0.08, "#38bdf8", cx, cy + 0.95, cz + 0.95));
  parts.push(box(1.68, 0.52, 0.08, "#38bdf8", cx, cy + 0.95, cz - 1.35));
  // Side window tints
  parts.push(box(0.08, 0.5, 2.15, "#38bdf8", cx - 0.88, cy + 0.95, cz - 0.2));
  parts.push(box(0.08, 0.5, 2.15, "#38bdf8", cx + 0.88, cy + 0.95, cz - 0.2));
  // 4 Black rubber tires with silver alloy hubs
  for (const side of [-1, 1]) {
    for (const axial of [-1.3, 1.3]) {
      const tireX = cx + side * 1.0;
      const tireZ = cz + axial;
      parts.push(box(0.28, 0.68, 0.68, "#18181b", tireX, cy, tireZ));
      parts.push(box(0.06, 0.36, 0.36, "#cbd5e1", tireX + side * 0.16, cy + 0.16, tireZ));
    }
  }
  // Headlights (warm golden glow)
  parts.push(box(0.42, 0.18, 0.08, "#fef08a", cx - 0.68, cy + 0.55, cz + 2.22));
  parts.push(box(0.42, 0.18, 0.08, "#fef08a", cx + 0.68, cy + 0.55, cz + 2.22));
  // Tail lights (clean crimson red)
  parts.push(box(0.42, 0.18, 0.08, "#ef4444", cx - 0.68, cy + 0.55, cz - 2.22));
  parts.push(box(0.42, 0.18, 0.08, "#ef4444", cx + 0.68, cy + 0.55, cz - 2.22));
  // Side mirrors
  parts.push(box(0.22, 0.15, 0.22, bodyColor, cx - 1.08, cy + 0.95, cz + 0.8));
  parts.push(box(0.22, 0.15, 0.22, bodyColor, cx + 1.08, cy + 0.95, cz + 0.8));
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
 * Builds an authentic architectural commercial plot:
 * - Flagship Studio: Modern 2-story luxury architectural villa / digital studio with
 *   teak wood louvers, glass cantilevered balcony, rooftop pergola, Sintex water tank,
 *   paved driveway with parked sedan, and illuminated business facade.
 * - Under Construction Plot: Concrete plinth, column rebar cages, exposed brickwork,
 *   scaffolding & yellow crane.
 * - Empty Plot: Manicured lawn, boundary pegs, neat fencing, "Claim Plot ₹0".
 */
export function buildCartoonStorefrontPlot(
  business: BusinessStorefront | null,
  plotIndex: number,
  isLeft: boolean,
  xOffset: number,
  zOffset: number,
  isConstruction = false,
  isEmptyPlot = false,
  customRotationY?: number
): StorefrontMeshResult {
  const parts: THREE.BufferGeometry[] = [];

  // Plot Dimensions (18m wide x 18m deep)
  const plotW = 18;
  const plotD = 18;
  // Positive Z (facade/entrance) faces the street:
  // When isLeft is true (plot on right/east side of street at x=74, street at x=60),
  // facade must face West (-X), so rotationY = -Math.PI / 2.
  const rotationY = customRotationY !== undefined ? customRotationY : (isLeft ? -Math.PI / 2 : Math.PI / 2);

  // 1. Plot Base Grounds (Lush Green Lawn)
  parts.push(box(plotW, 0.08, plotD, "#15803d", 0, 0, 0));

  let badgeY = 9.5;

  if (isEmptyPlot) {
    // CLEAN LANDSCAPED OPEN COMMERCIAL PLOT ("Claim Plot ₹0")
    // Lush manicured turf
    parts.push(box(plotW - 1.0, 0.1, plotD - 1.0, "#166534", 0, 0.04, 0));

    // Survey boundary corner posts
    for (const sx of [-7.5, 7.5]) {
      for (const sz of [-7.5, 7.5]) {
        parts.push(box(0.4, 0.8, 0.4, "#f1f5f9", sx, 0, sz));
        parts.push(box(0.48, 0.15, 0.48, "#38bdf8", sx, 0.8, sz));
      }
    }

    // Low wooden post-and-rail perimeter boundary fence
    for (const side of [-1, 1]) {
      parts.push(box(0.12, 0.65, plotD - 3, "#d97706", side * 7.5, 0, 0));
      parts.push(box(plotW - 3, 0.65, 0.12, "#d97706", 0, 0, side * 7.5));
    }

    // Centered survey peg & marker
    parts.push(cylinder(0.08, 0.08, 1.4, 6, "#cbd5e1", 0, 0, 0));
    parts.push(box(0.8, 0.4, 0.05, "#38bdf8", 0.4, 1.0, 0));

    badgeY = 2.4;
  } else if (isConstruction) {
    // UNDER CONSTRUCTION PLOT: Concrete foundations, rebar columns, scaffolding, crane
    // Concrete foundation plinth
    parts.push(box(13, 0.4, 11, "#cbd5e1", -1, 0, -1));

    // Exposed red brick masonry wall segments
    parts.push(box(11.5, 2.2, 0.4, "#b91c1c", -1, 0.4, 4.2));
    parts.push(box(0.4, 2.2, 9.5, "#b91c1c", -6.5, 0.4, -0.5));
    parts.push(box(4.5, 2.2, 0.4, "#991b1b", 2.5, 0.4, -5.2));

    // 8 Reinforced concrete columns with protruding rebar steel cages
    for (const cx of [-6, -2, 2, 5]) {
      for (const cz of [-5, 4]) {
        parts.push(box(0.55, 4.2, 0.55, "#94a3b8", cx, 0.4, cz));
        // Steel rebar extending out top
        for (let r = 0; r < 4; r++) {
          const rox = (r % 2 === 0 ? -0.15 : 0.15);
          const roz = (r < 2 ? -0.15 : 0.15);
          parts.push(cylinder(0.02, 0.02, 1.2, 4, "#ea580c", cx + rox, 4.6, cz + roz));
        }
      }
    }

    // Timber Scaffolding Poles & Crossbeams
    const scaffoldColor = "#78350f";
    for (const sx of [-6.8, -1.5, 3.8]) {
      for (const sz of [-5.8, 4.8]) {
        parts.push(cylinder(0.07, 0.07, 6.2, 6, scaffoldColor, sx, 0, sz));
      }
    }
    parts.push(box(11, 0.1, 0.1, scaffoldColor, -1.5, 3.0, 4.8));
    parts.push(box(11, 0.1, 0.1, scaffoldColor, -1.5, 5.2, 4.8));

    // Yellow Construction Crane Mast & Jib
    parts.push(box(0.65, 13.5, 0.65, "#facc15", 6.2, 0, -5.5));
    parts.push(box(9.5, 0.55, 0.55, "#facc15", 2.5, 13.5, -5.5));
    parts.push(cylinder(0.04, 0.04, 4.5, 4, "#334155", 0.5, 9.0, -5.5)); // Cable

    badgeY = 8.6;
  } else {
    // FULLY BUILT MODERN LUXURY ARCHITECTURAL VILLA / DIGITAL STUDIO
    // (Nerqiva Studio Flagship and premier commercial studios)

    // 1. Concrete Paved Driveway on right side (5m wide x 16m deep)
    parts.push(box(4.8, 0.1, plotD - 1.5, "#94a3b8", 5.8, 0, 0.2));

    // 2. Parked Modern 3D Sedan / SUV on Driveway!
    buildParkedCar(parts, 5.8, 0.1, 1.2, "#f8fafc");

    // 3. Entrance Stone Pathway from gate to front entry
    parts.push(box(3.2, 0.1, 6.0, "#e2e8f0", -1.0, 0, plotD / 2 - 3.0));

    // 4. Stepping Stones across lawn
    parts.push(box(0.9, 0.1, 0.9, "#f1f5f9", -4.8, 0, 2.5));
    parts.push(box(0.9, 0.1, 0.9, "#f1f5f9", -4.8, 0, 0.8));
    parts.push(box(0.9, 0.1, 0.9, "#f1f5f9", -4.8, 0, -1.0));

    // 5. Modern Low Perimeter Boundary Wall & Coping
    const wallColor = "#f8fafc";
    const wallCoping = "#334155";
    // Front wall left section
    parts.push(box(plotW - 6.2, 0.75, 0.25, wallColor, -2.6, 0, plotD / 2 - 0.15));
    parts.push(box(plotW - 6.0, 0.1, 0.35, wallCoping, -2.6, 0.75, plotD / 2 - 0.15));

    // Side & rear boundary walls
    parts.push(box(0.25, 0.75, plotD - 0.5, wallColor, -plotW / 2 + 0.15, 0, 0));
    parts.push(box(0.35, 0.1, plotD - 0.3, wallCoping, -plotW / 2 + 0.15, 0.75, 0));
    parts.push(box(plotW - 0.5, 0.75, 0.25, wallColor, 0, 0, -plotD / 2 + 0.15));
    parts.push(box(plotW - 0.3, 0.1, 0.35, wallCoping, 0, 0.75, -plotD / 2 + 0.15));

    // Entry Gate Pillars with Warm Sconce Lamps
    const pillarColor = "#f8fafc";
    // Left pedestrian gate pillar
    parts.push(box(0.7, 1.3, 0.7, pillarColor, -1.4, 0, plotD / 2 - 0.15));
    parts.push(box(0.8, 0.12, 0.8, wallCoping, -1.4, 1.3, plotD / 2 - 0.15));
    parts.push(box(0.18, 0.25, 0.18, "#f59e0b", -1.4, 0.85, plotD / 2 + 0.25)); // Lamp

    // Driveway left pillar
    parts.push(box(0.7, 1.3, 0.7, pillarColor, 3.2, 0, plotD / 2 - 0.15));
    parts.push(box(0.8, 0.12, 0.8, wallCoping, 3.2, 1.3, plotD / 2 - 0.15));
    parts.push(box(0.18, 0.25, 0.18, "#f59e0b", 3.2, 0.85, plotD / 2 + 0.25));

    // Driveway right pillar
    parts.push(box(0.7, 1.3, 0.7, pillarColor, 8.4, 0, plotD / 2 - 0.15));
    parts.push(box(0.8, 0.12, 0.8, wallCoping, 8.4, 1.3, plotD / 2 - 0.15));
    parts.push(box(0.18, 0.25, 0.18, "#f59e0b", 8.4, 0.85, plotD / 2 + 0.25));

    // Potted Ornamental Shrubs along entry wall
    for (const px of [-6.2, -4.2, -2.4]) {
      parts.push(cylinder(0.25, 0.18, 0.45, 6, "#c2410c", px, 0, plotD / 2 - 0.7));
      parts.push(box(0.55, 0.55, 0.55, "#15803d", px, 0.45, plotD / 2 - 0.7));
    }

    // 6. MAIN BUILDING: 2-STORY MODERN ARCHITECTURAL VILLA / STUDIO
    const plinthH = 0.45;
    const gH = 3.8;
    const fH = 3.2;

    // Foundation Plinth
    parts.push(box(11.5, plinthH, 10.5, "#cbd5e1", -2.2, 0, -2.0));
    // Front entrance stone steps
    parts.push(box(2.8, 0.22, 1.0, "#94a3b8", -1.0, 0, 3.5));

    // Ground Floor Main Volume (width 10.8, depth 9.8, height 3.8)
    const stuccoWhite = "#f8fafc";
    parts.push(box(10.8, gH, 9.8, stuccoWhite, -2.2, plinthH, -2.0));

    // Teak Wood Vertical Slat Feature Wall on left facade
    const teakColor = "#b45309";
    const darkTeak = "#78350f";
    parts.push(box(3.2, gH, 0.08, darkTeak, -5.6, plinthH, 2.92));
    for (let s = 0; s < 8; s++) {
      parts.push(box(0.16, gH - 0.2, 0.12, teakColor, -6.8 + s * 0.42, plinthH + 0.1, 2.98));
    }

    // Large Floor-to-Ceiling Showroom Window (Panoramic glass)
    const glassCyan = "#38bdf8";
    const warmInterior = "#fef08a";
    const charcoalFrame = "#0f172a";
    // Warm golden illuminated interior
    parts.push(box(4.8, 2.6, 0.06, warmInterior, -0.6, plinthH + 0.6, 2.91));
    // Tinted exterior glass
    parts.push(box(4.8, 2.6, 0.1, glassCyan, -0.6, plinthH + 0.6, 2.93));
    // Aluminum frames / mullions
    parts.push(box(5.0, 0.12, 0.14, charcoalFrame, -0.6, plinthH + 0.54, 2.95));
    parts.push(box(5.0, 0.12, 0.14, charcoalFrame, -0.6, plinthH + 3.2, 2.95));
    parts.push(box(0.12, 2.78, 0.14, charcoalFrame, -3.1, plinthH + 0.54, 2.95));
    parts.push(box(0.12, 2.78, 0.14, charcoalFrame, 1.9, plinthH + 0.54, 2.95));
    parts.push(box(0.12, 2.78, 0.14, charcoalFrame, -0.6, plinthH + 0.54, 2.95));

    // Recessed Entrance Portal & Glass Door
    parts.push(box(2.2, 3.2, 0.15, charcoalFrame, 2.4, plinthH, 2.9));
    parts.push(box(1.8, 2.9, 0.08, glassCyan, 2.4, plinthH + 0.15, 2.92));
    parts.push(cylinder(0.04, 0.04, 0.8, 4, "#fbbf24", 3.1, plinthH + 1.2, 2.98)); // Brass handle

    // 7. CANTILEVERED FIRST FLOOR (Second Story)
    const fY = plinthH + gH; // 4.25
    // Cantilever Overhang (width 10.2, depth 8.8) extending forward over ground floor
    parts.push(box(10.2, fH, 8.8, stuccoWhite, -2.2, fY, -1.8));

    // Cantilever Underside Recessed LED Downlight Strip
    parts.push(box(8.2, 0.08, 0.18, "#fef08a", -2.2, fY - 0.04, 2.6));

    // Corner Picture Window on upper floor
    parts.push(box(3.6, 2.2, 0.1, glassCyan, -4.8, fY + 0.5, 2.62));
    parts.push(box(3.8, 0.1, 0.14, charcoalFrame, -4.8, fY + 0.45, 2.64));
    parts.push(box(3.8, 0.1, 0.14, charcoalFrame, -4.8, fY + 2.7, 2.64));

    // Walk-out Cantilevered Balcony Terrace
    const balconyW = 5.4;
    const balconyD = 2.4;
    // Balcony slab
    parts.push(box(balconyW, 0.25, balconyD, "#e2e8f0", 0.6, fY, 2.6));
    // Glass Balustrade (Translucent tinted cyan glass)
    parts.push(box(balconyW, 0.95, 0.06, "#7dd3fc", 0.6, fY + 0.25, 3.8));
    // Stainless steel top handrail
    parts.push(box(balconyW + 0.08, 0.08, 0.12, "#cbd5e1", 0.6, fY + 1.2, 3.8));
    // Side glass rail
    parts.push(box(0.06, 0.95, balconyD, "#7dd3fc", 3.3, fY + 0.25, 2.6));
    parts.push(box(0.12, 0.08, balconyD + 0.08, "#cbd5e1", 3.3, fY + 1.2, 2.6));
    // Balcony sliding glass door
    parts.push(box(2.8, 2.4, 0.1, glassCyan, 0.6, fY + 0.25, 1.42));

    // 8. ROOFTOP TERRACE & OPEN LOUNGE
    const rY = fY + fH; // 7.45
    // Roof deck
    parts.push(box(10.2, 0.2, 8.8, "#cbd5e1", -2.2, rY, -1.8));

    // Parapet Perimeter Border Walls (0.65m high)
    parts.push(box(10.4, 0.65, 0.22, stuccoWhite, -2.2, rY + 0.2, 2.6));
    parts.push(box(10.4, 0.65, 0.22, stuccoWhite, -2.2, rY + 0.2, -6.2));
    parts.push(box(0.22, 0.65, 9.0, stuccoWhite, -7.3, rY + 0.2, -1.8));
    parts.push(box(0.22, 0.65, 9.0, stuccoWhite, 2.9, rY + 0.2, -1.8));

    // Rooftop Staircase Mumty (Penthouse door box)
    parts.push(box(2.8, 2.2, 3.2, "#1e293b", -4.8, rY + 0.2, -3.8));
    parts.push(box(1.1, 1.8, 0.08, "#b45309", -4.8, rY + 0.2, -2.18)); // Door

    // Wooden Rooftop Pergola Canopy (Teak wood louvers over 4 columns)
    const pergH = 2.4;
    parts.push(cylinder(0.08, 0.08, pergH, 6, darkTeak, -1.0, rY + 0.2, -1.0));
    parts.push(cylinder(0.08, 0.08, pergH, 6, darkTeak, 2.2, rY + 0.2, -1.0));
    parts.push(cylinder(0.08, 0.08, pergH, 6, darkTeak, -1.0, rY + 0.2, 1.6));
    parts.push(cylinder(0.08, 0.08, pergH, 6, darkTeak, 2.2, rY + 0.2, 1.6));
    // 5 Slatted Pergola horizontal beams
    for (const bz of [-1.0, -0.35, 0.3, 0.95, 1.6]) {
      parts.push(box(3.8, 0.12, 0.12, teakColor, 0.6, rY + 0.2 + pergH, bz));
    }

    // Classic Black Cylindrical Sintex Indian Water Tank (Indian rooftop staple!)
    parts.push(cylinder(0.68, 0.68, 1.5, 14, "#18181b", -5.5, rY + 0.2, 0.6));
    parts.push(cylinder(0.32, 0.32, 0.16, 8, "#27272a", -5.5, rY + 0.2 + 1.5, 0.6)); // Top lid
    parts.push(cylinder(0.71, 0.71, 0.08, 14, "#27272a", -5.5, rY + 0.2 + 0.5, 0.6)); // Ring 1
    parts.push(cylinder(0.71, 0.71, 0.08, 14, "#27272a", -5.5, rY + 0.2 + 1.0, 0.6)); // Ring 2

    // HVAC Condenser Unit
    parts.push(box(1.2, 0.85, 0.65, "#64748b", -2.8, rY + 0.2, -4.5));
    parts.push(cylinder(0.28, 0.28, 0.05, 8, "#334155", -2.8, rY + 0.62, -4.16));

    // 9. ILLUMINATED FACADE BUSINESS SIGNBOARD (Sleek minimalist panel with amber glow)
    const signW = 7.2;
    const signH = 1.15;
    // Obsidian backplate panel
    parts.push(box(signW, signH, 0.25, "#090d16", -0.8, plinthH + gH - 0.7, 3.1));
    // Glowing amber border trim
    parts.push(box(signW + 0.2, signH + 0.2, 0.08, "#f59e0b", -0.8, plinthH + gH - 0.8, 3.02));
    // Top LED light strip wash
    parts.push(box(signW + 0.4, 0.08, 0.35, "#fbbf24", -0.8, plinthH + gH - 0.1, 3.15));

    badgeY = rY + 4.0;
  }

  // Merge all geometric parts into a single buffer geometry
  const mergedGeo = mergeGeometries(parts, false);
  mergedGeo.computeVertexNormals();

  // Create single Standard Material supporting vertex colors
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.65,
    metalness: 0.18,
  });

  const mesh = new THREE.Mesh(mergedGeo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(xOffset, 0, zOffset);
  mesh.rotation.y = rotationY;

  // Invisible Raycasting Hit Box for Clicks
  const hitBoxGeo = new THREE.BoxGeometry(plotW + 2, 14, plotD + 2);
  const hitBoxMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
  hitBox.position.set(xOffset, 7, zOffset);
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
