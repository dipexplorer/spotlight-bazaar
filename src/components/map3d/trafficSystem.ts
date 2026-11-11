import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Living Indian Traffic Simulation System
 * Reverse-engineered from indiaagain.live's high-performance InstancedMesh vehicle engine.
 * Renders dozens of moving Auto-Rickshaws, Delivery Scooters, Cabs and Buses
 * along road lanes with only 4 drawcalls total at buttery 60 FPS.
 */

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

// 1. Procedural Auto-Rickshaw (Iconic Indian 3-Wheeler)
function buildAutoRickshawGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Chassis
  parts.push(box(1.45, 0.08, 2.6, "#1e293b", 0, 0.1, 0));
  // Green lower body
  parts.push(box(1.3, 0.65, 2.3, "#16a34a", 0, 0.18, 0));
  parts.push(box(1.3, 0.65, 0.8, "#16a34a", 0, 0.85, 0.75));
  // Yellow canvas canopy roof
  parts.push(box(1.36, 0.1, 2.0, "#facc15", 0, 1.85, -0.2));
  // Windshield & dashboard
  parts.push(box(1.2, 0.45, 0.06, "#38bdf8", 0, 1.15, 1.1));
  // Front pillar support bars
  parts.push(box(0.08, 0.9, 0.08, "#1e293b", -0.6, 0.95, -0.9));
  parts.push(box(0.08, 0.9, 0.08, "#1e293b", 0.6, 0.95, -0.9));
  // Headlight
  parts.push(box(0.2, 0.18, 0.1, "#fef08a", 0, 0.6, 1.25));
  // Front wheel (centered)
  parts.push(box(0.14, 0.48, 0.48, "#09090b", 0, 0.02, 0.95));
  // Rear wheels (left & right)
  parts.push(box(0.14, 0.48, 0.48, "#09090b", -0.66, 0.02, -0.75));
  parts.push(box(0.14, 0.48, 0.48, "#09090b", 0.66, 0.02, -0.75));

  const geo = mergeGeometries(parts, false);
  geo.computeVertexNormals();
  return geo;
}

// 2. Procedural Delivery Scooter (Zomato / Swiggy / Dunzo style)
function buildDeliveryScooterGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Scooter Body
  parts.push(box(0.42, 0.38, 1.4, "#ea580c", 0, 0.25, 0));
  // Rear delivery hot-bag box
  parts.push(box(0.65, 0.55, 0.55, "#f97316", 0, 0.75, -0.4));
  parts.push(box(0.5, 0.12, 0.02, "#ffffff", 0, 1.0, -0.12)); // White brand strip
  // Handlebar & fork
  parts.push(box(0.08, 0.6, 0.08, "#1e293b", 0, 0.55, 0.55));
  parts.push(box(0.7, 0.06, 0.06, "#1e293b", 0, 1.15, 0.55));
  // Rider (Stylized low-poly helmet & jacket)
  parts.push(box(0.45, 0.55, 0.3, "#0f172a", 0, 0.95, 0.05)); // Jacket
  parts.push(box(0.35, 0.35, 0.35, "#facc15", 0, 1.55, 0.05)); // Yellow safety helmet
  // Wheels
  parts.push(box(0.12, 0.45, 0.45, "#09090b", 0, 0.02, 0.58));
  parts.push(box(0.12, 0.45, 0.45, "#09090b", 0, 0.02, -0.58));

  const geo = mergeGeometries(parts, false);
  geo.computeVertexNormals();
  return geo;
}

// 3. Procedural Classic Indian Sedan / Taxi
function buildSedanGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Chassis
  parts.push(box(1.9, 0.08, 3.9, "#1e293b", 0, 0.08, 0));
  // Lower body (clean white)
  parts.push(box(1.8, 0.55, 3.7, "#f8fafc", 0, 0.25, 0));
  // Cabin greenhouse & tinted windows
  parts.push(box(1.55, 0.5, 1.9, "#1e293b", 0, 0.8, -0.2));
  parts.push(box(1.58, 0.06, 1.9, "#f8fafc", 0, 1.3, -0.2));
  // Yellow taxi roof indicator
  parts.push(box(0.35, 0.12, 0.18, "#f59e0b", 0, 1.36, -0.2));
  // Headlights & Taillights
  parts.push(box(0.3, 0.12, 0.05, "#fef08a", -0.65, 0.55, 1.86));
  parts.push(box(0.3, 0.12, 0.05, "#fef08a", 0.65, 0.55, 1.86));
  parts.push(box(0.3, 0.12, 0.05, "#dc2626", -0.65, 0.55, -1.86));
  parts.push(box(0.3, 0.12, 0.05, "#dc2626", 0.65, 0.55, -1.86));
  // 4 Wheels
  for (const x of [-0.92, 0.92]) {
    for (const z of [-1.15, 1.15]) {
      parts.push(box(0.16, 0.52, 0.52, "#09090b", x, 0.02, z));
    }
  }

  const geo = mergeGeometries(parts, false);
  geo.computeVertexNormals();
  return geo;
}

// 4. Procedural City Mini-Bus
function buildBusGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Chassis
  parts.push(box(2.5, 0.1, 8.2, "#1e293b", 0, 0.1, 0));
  // Main blue body
  parts.push(box(2.4, 1.9, 8.0, "#0284c7", 0, 0.35, 0));
  // Window strip (dark)
  parts.push(box(2.44, 0.55, 7.6, "#0f172a", 0, 1.45, 0));
  // Cream roof
  parts.push(box(2.35, 0.1, 7.8, "#f1f5f9", 0, 2.25, 0));
  // Headlights
  parts.push(box(0.4, 0.2, 0.05, "#fef08a", -0.85, 0.7, 4.02));
  parts.push(box(0.4, 0.2, 0.05, "#fef08a", 0.85, 0.7, 4.02));
  // 4 Wheels
  for (const x of [-1.22, 1.22]) {
    for (const z of [-2.6, 2.6]) {
      parts.push(box(0.18, 0.68, 0.68, "#09090b", x, 0.02, z));
    }
  }

  const geo = mergeGeometries(parts, false);
  geo.computeVertexNormals();
  return geo;
}

interface TrafficEntity {
  type: "auto" | "scooter" | "car" | "bus";
  instanceIndex: number;
  laneX: number;
  z: number;
  speed: number;
  direction: number; // 1: Northbound (+z), -1: Southbound (-z)
  minZ: number;
  maxZ: number;
}

export interface TrafficSystem {
  group: THREE.Group;
  update: (delta: number) => void;
  dispose: () => void;
}

/**
 * Creates and initializes the high-performance living traffic system
 */
export function createTrafficSystem(streetLength: number): TrafficSystem {
  const group = new THREE.Group();
  group.name = "living_traffic_system";

  const roadHalfWidth = 8;
  const laneNorth = -3.8; // Left lane going +Z
  const laneSouth = 3.8;  // Right lane going -Z

  const minZ = -20;
  const maxZ = streetLength + 30;

  // Counts of each vehicle type
  const autoCount = 8;
  const scooterCount = 10;
  const carCount = 8;
  const busCount = 2;

  // Standard Material supporting vertex colors for all vehicles
  const vehicleMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.2,
  });

  // Instanced Meshes
  const autoMesh = new THREE.InstancedMesh(buildAutoRickshawGeometry(), vehicleMaterial, autoCount);
  const scooterMesh = new THREE.InstancedMesh(buildDeliveryScooterGeometry(), vehicleMaterial, scooterCount);
  const carMesh = new THREE.InstancedMesh(buildSedanGeometry(), vehicleMaterial, carCount);
  const busMesh = new THREE.InstancedMesh(buildBusGeometry(), vehicleMaterial, busCount);

  autoMesh.castShadow = true;
  scooterMesh.castShadow = true;
  carMesh.castShadow = true;
  busMesh.castShadow = true;

  group.add(autoMesh);
  group.add(scooterMesh);
  group.add(carMesh);
  group.add(busMesh);

  const entities: TrafficEntity[] = [];

  // Helper to spawn entities
  const spawnEntity = (
    type: "auto" | "scooter" | "car" | "bus",
    instanceIndex: number,
    baseSpeed: number
  ) => {
    const isNorth = Math.random() > 0.5;
    const direction = isNorth ? 1 : -1;
    const laneX = isNorth ? laneNorth : laneSouth;
    const z = minZ + Math.random() * (maxZ - minZ);
    const speed = baseSpeed * (0.85 + Math.random() * 0.3);

    entities.push({
      type,
      instanceIndex,
      laneX,
      z,
      speed,
      direction,
      minZ,
      maxZ,
    });
  };

  // Populate vehicle fleets
  for (let i = 0; i < autoCount; i++) spawnEntity("auto", i, 11);
  for (let i = 0; i < scooterCount; i++) spawnEntity("scooter", i, 16);
  for (let i = 0; i < carCount; i++) spawnEntity("car", i, 13);
  for (let i = 0; i < busCount; i++) spawnEntity("bus", i, 8);

  const dummy = new THREE.Object3D();

  // Animation Update Loop
  const update = (delta: number) => {
    const clampedDelta = Math.min(delta, 0.1);

    for (const e of entities) {
      // Advance vehicle position along road lane
      e.z += e.speed * e.direction * clampedDelta;

      // Loop around when passing street boundary
      if (e.direction === 1 && e.z > e.maxZ) {
        e.z = e.minZ;
      } else if (e.direction === -1 && e.z < e.minZ) {
        e.z = e.maxZ;
      }

      // Compose instance matrix
      dummy.position.set(e.laneX, 0.1, e.z);
      dummy.rotation.y = e.direction === 1 ? 0 : Math.PI;
      dummy.updateMatrix();

      // Update target InstancedMesh
      if (e.type === "auto") {
        autoMesh.setMatrixAt(e.instanceIndex, dummy.matrix);
      } else if (e.type === "scooter") {
        scooterMesh.setMatrixAt(e.instanceIndex, dummy.matrix);
      } else if (e.type === "car") {
        carMesh.setMatrixAt(e.instanceIndex, dummy.matrix);
      } else if (e.type === "bus") {
        busMesh.setMatrixAt(e.instanceIndex, dummy.matrix);
      }
    }

    autoMesh.instanceMatrix.needsUpdate = true;
    scooterMesh.instanceMatrix.needsUpdate = true;
    carMesh.instanceMatrix.needsUpdate = true;
    busMesh.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    autoMesh.geometry.dispose();
    scooterMesh.geometry.dispose();
    carMesh.geometry.dispose();
    busMesh.geometry.dispose();
    vehicleMaterial.dispose();
  };

  return { group, update, dispose };
}
