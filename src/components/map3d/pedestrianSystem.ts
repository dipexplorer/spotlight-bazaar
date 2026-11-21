import * as THREE from "three";

/**
 * Living Pedestrian & Citizen Simulation System
 * Reverse-engineered from indiaagain.live's procedural character bones & trigonometric walk cycles.
 * Renders diverse Indian citizens and shoppers strolling down high-street sidewalks at 60 FPS.
 */

// Shared Materials Cache for Pedestrians
const materialsCache = new Map<string, THREE.MeshLambertMaterial>();
function getMat(hex: string): THREE.MeshLambertMaterial {
  if (!materialsCache.has(hex)) {
    materialsCache.set(
      hex,
      new THREE.MeshLambertMaterial({ color: hex, flatShading: true })
    );
  }
  return materialsCache.get(hex)!;
}

// Low-poly character primitives
const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 2, 6);
const CharGeos = {
  thigh: cap(0.08, 0.22),
  shin: cap(0.065, 0.2),
  shoe: new THREE.BoxGeometry(0.14, 0.08, 0.24),
  waist: new THREE.CylinderGeometry(0.14, 0.16, 0.16, 8),
  belly: new THREE.CylinderGeometry(0.13, 0.15, 0.14, 8),
  chest: cap(0.15, 0.15),
  head: new THREE.IcosahedronGeometry(0.18, 1),
  hairCap: new THREE.SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
  armUpper: cap(0.048, 0.18),
  armFore: cap(0.042, 0.18),
  shadowBlob: new THREE.CircleGeometry(0.38, 12),
};

const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x090d16,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
});

interface CharacterParts {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
}

interface Pedestrian {
  parts: CharacterParts;
  x: number;
  z: number;
  speed: number;
  direction: number; // 1 or -1
  phase: number;
  minZ: number;
  maxZ: number;
  isWindowShopping: boolean;
  shopTimer: number;
}

export interface PedestrianSystem {
  group: THREE.Group;
  update: (delta: number) => void;
  dispose: () => void;
}

// Indian clothing palettes (Kurtas, Sarees, Shirts, Jeans)
const CLOTHING_COLORS = [
  { top: "#2563eb", bottom: "#d97706", skin: "#c68642", hair: "#18181b" }, // Blue kurta, beige pyjama
  { top: "#e11d48", bottom: "#0f172a", skin: "#e0ac69", hair: "#18181b" }, // Crimson top, dark jeans
  { top: "#059669", bottom: "#f8fafc", skin: "#8d5524", hair: "#18181b" }, // Emerald kurta, white pyjama
  { top: "#f59e0b", bottom: "#334155", skin: "#f1c27d", hair: "#18181b" }, // Mustard yellow, slate
  { top: "#7c3aed", bottom: "#fef08a", skin: "#c68642", hair: "#18181b" }, // Purple & gold
  { top: "#0284c7", bottom: "#1e293b", skin: "#e0ac69", hair: "#18181b" }, // Sky blue, denim
  { top: "#ea580c", bottom: "#475569", skin: "#8d5524", hair: "#18181b" }, // Saffron shirt, grey trousers
];

function buildCharacter(palette: typeof CLOTHING_COLORS[0]): CharacterParts {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const hips = new THREE.Group();
  const torso = new THREE.Group();
  const head = new THREE.Group();

  root.add(body);
  body.add(hips);
  hips.position.y = 0.65;

  // Waist & Belly
  const waistMesh = new THREE.Mesh(CharGeos.waist, getMat(palette.bottom));
  waistMesh.position.y = 0.04;
  hips.add(waistMesh);

  const bellyMesh = new THREE.Mesh(CharGeos.belly, getMat(palette.top));
  bellyMesh.position.y = 0.18;
  hips.add(bellyMesh);

  // Torso
  hips.add(torso);
  torso.position.y = 0.1;
  const chestMesh = new THREE.Mesh(CharGeos.chest, getMat(palette.top));
  chestMesh.position.y = 0.28;
  torso.add(chestMesh);

  // Head & Hair
  torso.add(head);
  head.position.y = 0.6;
  const headMesh = new THREE.Mesh(CharGeos.head, getMat(palette.skin));
  head.add(headMesh);

  const hairMesh = new THREE.Mesh(CharGeos.hairCap, getMat(palette.hair));
  hairMesh.position.set(0, 0.02, -0.015);
  hairMesh.rotation.x = -0.25;
  head.add(hairMesh);

  // Left & Right Arms
  const buildArm = (side: number) => {
    const a = new THREE.Group();
    a.position.set(side * 0.22, 0.42, 0);
    torso.add(a);
    const upper = new THREE.Mesh(CharGeos.armUpper, getMat(palette.top));
    upper.position.y = -0.12;
    a.add(upper);
    const fore = new THREE.Mesh(CharGeos.armFore, getMat(palette.skin));
    fore.position.y = -0.32;
    a.add(fore);
    return a;
  };

  // Left & Right Legs
  const buildLeg = (side: number) => {
    const l = new THREE.Group();
    l.position.set(side * 0.09, 0.02, 0);
    hips.add(l);
    const thigh = new THREE.Mesh(CharGeos.thigh, getMat(palette.bottom));
    thigh.position.y = -0.15;
    l.add(thigh);
    const shin = new THREE.Mesh(CharGeos.shin, getMat(palette.bottom));
    shin.position.y = -0.42;
    l.add(shin);
    const shoe = new THREE.Mesh(CharGeos.shoe, getMat("#18181b"));
    shoe.position.set(0, -0.58, 0.04);
    l.add(shoe);
    return l;
  };

  const armL = buildArm(-1);
  const armR = buildArm(1);
  const legL = buildLeg(-1);
  const legR = buildLeg(1);

  // Ground Contact Shadow Blob
  const shadow = new THREE.Mesh(CharGeos.shadowBlob, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  return { root, body, hips, torso, head, armL, armR, legL, legR };
}

/**
 * Creates the animated pedestrian crowd simulation along street sidewalks and business frontage
 */
export function createPedestrianSystem(
  streetLength: number = 89.35,
  sidewalkOffset: number = 3.35,
  startZ: number = 18.0
): PedestrianSystem {
  const group = new THREE.Group();
  group.name = "living_pedestrian_system";

  const minZ = Math.max(16.0, startZ);
  const maxZ = Math.max(minZ + 15, streetLength - 6.0);

  // Calm, authentic citizen presence (2 well-spaced citizens on sidewalk)
  const pedestrianCount = 2;
  const pedestrians: Pedestrian[] = [];

  for (let i = 0; i < pedestrianCount; i++) {
    const palette = CLOTHING_COLORS[i % CLOTHING_COLORS.length];
    const parts = buildCharacter(palette);

    const isLeftSidewalk = i % 2 === 0;
    // Strict sidewalk positioning so NPCs walk strictly along designated sidewalk
    const lateralJitter = (Math.random() - 0.5) * 0.10;
    const x = (isLeftSidewalk ? -sidewalkOffset : sidewalkOffset) + lateralJitter;
    // Evenly distribute along the road length
    const segment = (maxZ - minZ) / pedestrianCount;
    const z = minZ + (i * segment) + Math.random() * (segment * 0.5);
    const direction = i % 2 === 0 ? 1 : -1;
    const speed = 1.4 + Math.random() * 0.4; // Relaxed pedestrian stroll

    parts.root.position.set(x, 0.02, z);
    parts.root.rotation.y = direction === 1 ? 0 : Math.PI;

    group.add(parts.root);

    pedestrians.push({
      parts,
      x,
      z,
      speed,
      direction,
      phase: Math.random() * Math.PI * 2,
      minZ,
      maxZ,
      isWindowShopping: false,
      shopTimer: 0,
    });
  }

  // Animation Loop
  const update = (delta: number) => {
    const clampedDelta = Math.min(delta, 0.1);

    for (const p of pedestrians) {
      if (p.isWindowShopping) {
        // Paused looking at shop display window
        p.shopTimer -= clampedDelta;
        if (p.shopTimer <= 0) {
          p.isWindowShopping = false;
          // Resume walking, restore forward facing rotation
          p.parts.root.rotation.y = p.direction === 1 ? 0 : Math.PI;
        }
        continue;
      }

      // Random chance to pause and window shop
      if (Math.random() < 0.002) {
        p.isWindowShopping = true;
        p.shopTimer = 3.0 + Math.random() * 4.0;
        // Turn facing towards the shop facade
        p.parts.root.rotation.y = p.x < 0 ? -Math.PI / 2 : Math.PI / 2;
        continue;
      }

      // Move along sidewalk
      p.z += p.speed * p.direction * clampedDelta;
      p.phase += p.speed * 3.5 * clampedDelta;

      // Loop around at street ends
      if (p.direction === 1 && p.z > p.maxZ) {
        p.z = p.minZ;
      } else if (p.direction === -1 && p.z < p.minZ) {
        p.z = p.maxZ;
      }

      p.parts.root.position.z = p.z;

      // Trigonometric Walking Animation Cycles
      const s = Math.sin(p.phase);
      p.parts.legL.rotation.x = -s * 0.55;
      p.parts.legR.rotation.x = s * 0.55;

      p.parts.armL.rotation.x = s * 0.45;
      p.parts.armR.rotation.x = -s * 0.45;

      // Subtle natural hip sway & head bob
      p.parts.body.position.y = Math.abs(Math.cos(p.phase)) * 0.04;
      p.parts.head.rotation.y = Math.sin(p.phase * 0.5) * 0.08;
    }
  };

  const dispose = () => {
    // Clean up pedestrian geometries & materials
    group.clear();
  };

  return { group, update, dispose };
}
