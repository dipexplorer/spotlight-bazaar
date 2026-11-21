import * as THREE from "three";

/**
 * Procedural Living Indian Road Traffic System
 * Renders 2 authentic moving Indian vehicles (Auto-Rickshaw & Compact Cab)
 * driving smoothly along designated road connector lanes at 60 FPS.
 */

export interface RoadTrafficSystem {
  group: THREE.Group;
  update: (delta: number) => void;
  dispose: () => void;
}

// Low-poly materials cache
const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });
const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
const whiteCarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.2 });
const blackMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.7 });
const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

function createWheel(): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12), rubberMat);
  tire.rotation.z = Math.PI / 2;
  g.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.15, 8), rimMat);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

/**
 * Authentic Indian Auto-Rickshaw (3-Wheeler)
 */
function createAutoRickshaw(): { group: THREE.Group; wheels: THREE.Group[] } {
  const group = new THREE.Group();
  group.name = "auto_rickshaw";
  const wheels: THREE.Group[] = [];

  // Lower green chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 2.3), greenMat);
  chassis.position.y = 0.36;
  group.add(chassis);

  // Upper yellow passenger cabin & windshield cowl
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.55, 1.4), yellowMat);
  cabin.position.set(0, 0.8, -0.2);
  group.add(cabin);

  // Front slope cowl
  const frontCowl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.62, 0.55, 4), yellowMat);
  frontCowl.rotation.y = Math.PI / 4;
  frontCowl.position.set(0, 0.76, 0.75);
  group.add(frontCowl);

  // Black canvas top
  const canvasTop = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.12, 1.9), blackMat);
  canvasTop.position.set(0, 1.12, 0.05);
  group.add(canvasTop);

  // Windshield glass
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.38, 0.06), glassMat);
  windshield.position.set(0, 0.88, 0.72);
  windshield.rotation.x = -0.25;
  group.add(windshield);

  // Front Headlight
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.05), headlightMat);
  light.position.set(0, 0.48, 1.16);
  group.add(light);

  // Rear Taillights
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.04), taillightMat);
    tail.position.set(side * 0.48, 0.45, -1.16);
    group.add(tail);
  }

  // Wheels: 1 front, 2 rear
  const frontWheel = createWheel();
  frontWheel.position.set(0, 0.24, 0.85);
  group.add(frontWheel);
  wheels.push(frontWheel);

  for (const side of [-1, 1]) {
    const rearWheel = createWheel();
    rearWheel.position.set(side * 0.62, 0.24, -0.65);
    group.add(rearWheel);
    wheels.push(rearWheel);
  }

  return { group, wheels };
}

/**
 * Modern Compact Indian Sedan / Cab
 */
function createCompactCar(): { group: THREE.Group; wheels: THREE.Group[] } {
  const group = new THREE.Group();
  group.name = "compact_car";
  const wheels: THREE.Group[] = [];

  // Lower Car Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.45, 3.6), whiteCarMat);
  body.position.y = 0.38;
  group.add(body);

  // Upper Greenhouse (Cabin)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.52, 2.0), glassMat);
  cabin.position.set(0, 0.82, -0.15);
  group.add(cabin);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 1.7), whiteCarMat);
  roof.position.set(0, 1.1, -0.15);
  group.add(roof);

  // Front Headlights
  for (const side of [-1, 1]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.12, 0.04), headlightMat);
    light.position.set(side * 0.62, 0.46, 1.81);
    group.add(light);
  }

  // Rear Taillights
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.04), taillightMat);
    tail.position.set(side * 0.62, 0.48, -1.81);
    group.add(tail);
  }

  // 4 Wheels
  for (const side of [-1, 1]) {
    for (const frontBack of [-1, 1]) {
      const wheel = createWheel();
      wheel.position.set(side * 0.82, 0.26, frontBack * 1.15);
      group.add(wheel);
      wheels.push(wheel);
    }
  }

  return { group, wheels };
}

export function createRoadTrafficSystem(roadLength: number, roadAngle: number): RoadTrafficSystem {
  const group = new THREE.Group();
  group.name = "living_road_traffic_system";

  const minZ = 16.0;
  const maxZ = Math.max(minZ + 20, roadLength);
  const laneLeftX = -1.35; // Inbound lane
  const laneRightX = 1.35; // Outbound lane

  // Vehicle 1: Auto-Rickshaw (heading toward gate +Z)
  const auto = createAutoRickshaw();
  auto.group.position.set(laneLeftX, 0, minZ + 8.0);
  auto.group.rotation.y = 0; // facing +Z
  group.add(auto.group);

  // Vehicle 2: Compact Car (heading away from gate -Z)
  const car = createCompactCar();
  car.group.position.set(laneRightX, 0, maxZ - 12.0);
  car.group.rotation.y = Math.PI; // facing -Z
  group.add(car.group);

  const autoSpeed = 8.5; // ~30 km/h
  const carSpeed = 10.5; // ~38 km/h

  let autoZ = minZ + 8.0;
  let carZ = maxZ - 12.0;

  // Align whole traffic system to road connector orientation
  group.rotation.y = roadAngle;

  const update = (delta: number) => {
    const clampedDelta = Math.min(delta, 0.05);

    // Auto-rickshaw moving forward (+Z)
    autoZ += autoSpeed * clampedDelta;
    if (autoZ > maxZ) {
      autoZ = minZ;
    }
    auto.group.position.z = autoZ;
    // Rotate wheels
    for (const w of auto.wheels) {
      w.rotation.x += autoSpeed * clampedDelta * 4.0;
    }

    // Car moving in reverse direction (-Z)
    carZ -= carSpeed * clampedDelta;
    if (carZ < minZ) {
      carZ = maxZ;
    }
    car.group.position.z = carZ;
    // Rotate wheels
    for (const w of car.wheels) {
      w.rotation.x -= carSpeed * clampedDelta * 4.0;
    }
  };

  const dispose = () => {
    group.clear();
  };

  return { group, update, dispose };
}

