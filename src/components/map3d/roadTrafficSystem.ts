import * as THREE from "three";
import { osmRoadSpline } from "./osmRoadSpline";

/**
 * Living Indian Road Traffic System with Dynamic Day/Night Headlight Beams
 * Features:
 * - 1 Authentic Bajaj RE-style Green/Yellow Auto-Rickshaw (Outbound Lane)
 * - 1 Modern White Compact Cab (Inbound Lane)
 * - Dynamic night headlight beams projecting forward onto the road
 * - Exact navigation along the curved OpenStreetMap road network via OsmRoadSpline
 */

export interface RoadTrafficSystem {
  group: THREE.Group;
  update: (delta: number) => void;
  setNightMode: (isDark: boolean) => void;
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

// Volumetric Headlight Beams Material
const beamMat = new THREE.MeshBasicMaterial({
  color: 0xfef08a,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  side: THREE.DoubleSide,
});

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
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.55, 1.3), yellowMat);
  cabin.position.set(0, 0.8, -0.2);
  group.add(cabin);

  // Black canvas top
  const canvasTop = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.12, 1.9), blackMat);
  canvasTop.position.set(0, 1.12, 0.05);
  group.add(canvasTop);

  // Windshield glass
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.38, 0.06), glassMat);
  windshield.position.set(0, 0.88, 0.72);
  windshield.rotation.x = -0.25;
  group.add(windshield);

  // Front Headlight (Apex of beam starts here)
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.05), headlightMat);
  light.position.set(0, 0.48, 1.16);
  group.add(light);

  // Volumetric Headlight Beam (+Z forward towards destination)
  // CylinderGeometry(radiusTop, radiusBottom, height) guarantees:
  // - radiusTop (0.08m): narrow source directly at the headlight (Z = 1.16m)
  // - radiusBottom (2.2m): wide expanding pool projected forward onto the street (Z = 8.8m)
  const beamLength = 7.6;
  const beamRadiusTop = 0.08;
  const beamRadiusBottom = 2.2;
  const beamGeo = new THREE.CylinderGeometry(beamRadiusTop, beamRadiusBottom, beamLength, 14, 1, true);
  beamGeo.rotateX(-Math.PI / 2); // Rotates top (radius 0.08m) to -Z (headlight) and bottom (radius 2.2m) to +Z (forward)
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 0.36, 1.16 + beamLength / 2);
  beam.rotation.x = 0.035; // Gentle downward pitch illuminating road surface ahead
  group.add(beam);

  // Road Surface Illumination Pool in front of vehicle
  const carPoolGeo = new THREE.CircleGeometry(2.0, 14);
  carPoolGeo.rotateX(-Math.PI / 2);
  const carPool = new THREE.Mesh(carPoolGeo, beamMat);
  carPool.position.set(0, 0.03, 5.6);
  group.add(carPool);

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

  // Front Headlights (+Z forward towards destination)
  for (const side of [-1, 1]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.12, 0.04), headlightMat);
    light.position.set(side * 0.62, 0.46, 1.81);
    group.add(light);

    // Volumetric Headlight Beams (+Z forward)
    // CylinderGeometry: radiusTop (0.08m) at headlight, radiusBottom (1.8m) on road
    const beamLength = 7.0;
    const beamGeo = new THREE.CylinderGeometry(0.08, 1.8, beamLength, 12, 1, true);
    beamGeo.rotateX(-Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(side * 0.55, 0.38, 1.81 + beamLength / 2);
    beam.rotation.x = 0.035;
    group.add(beam);
  }

  // Rear Taillights (-Z rear)
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

export function createRoadTrafficSystem(roadLength: number, roadAngle: number, initialDark = false): RoadTrafficSystem {
  const group = new THREE.Group();
  group.name = "living_road_traffic_system";

  // Navigation bounds along the continuous surveyed OSM road spline (0 to totalLength ~180m)
  const minS = 4.0;
  const maxS = osmRoadSpline.totalLength - 4.0;
  const laneOffset = 1.25; // Standard Indian lane offset from centerline (m)

  // 1. Outbound Vehicle: Authentic Bajaj RE Auto-Rickshaw (cruising from studio towards OSM street)
  const auto = createAutoRickshaw();
  group.add(auto.group);

  // 2. Inbound Vehicle: Modern White Indian Compact Cab (cruising from OSM street towards studio)
  const cab = createCompactCar();
  group.add(cab.group);

  const autoSpeed = 5.6; // ~20 km/h calm cruising speed
  const cabSpeed = 6.8;  // ~24 km/h
  let autoS = minS + 12.0;
  let cabS = maxS - 14.0;

  // Align whole traffic system to road corridor orientation
  group.rotation.y = roadAngle;

  beamMat.opacity = initialDark ? 0.14 : 0.0;

  const setNightMode = (isDark: boolean) => {
    beamMat.opacity = isDark ? 0.14 : 0.0;
  };

  const update = (delta: number) => {
    // 1. Move Auto-Rickshaw Outbound along the exact curved OSM road
    autoS += autoSpeed * delta;
    if (autoS > maxS) {
      autoS = minS;
    }
    const autoPose = osmRoadSpline.getPoseAtDistance(autoS);
    // Left-hand drive: left lane is along -normal
    auto.group.position.copy(autoPose.position).addScaledVector(autoPose.normal, -laneOffset);
    auto.group.rotation.y = autoPose.heading;

    // Smooth distance scale fade at distant horizons so vehicle never abruptly pops
    const autoDistFade =
      Math.min(1.0, Math.max(0.0, (autoS - minS) / 10.0)) *
      Math.min(1.0, Math.max(0.0, (maxS - autoS) / 14.0));
    const autoScale = Math.max(0.001, autoDistFade);
    auto.group.scale.set(autoScale, autoScale, autoScale);

    // Rotate Auto wheels
    for (const w of auto.wheels) {
      w.rotation.x -= autoSpeed * delta * 4.2;
    }

    // 2. Move Compact Cab Inbound along the exact curved OSM road
    cabS -= cabSpeed * delta;
    if (cabS < minS) {
      cabS = maxS;
    }
    const cabPose = osmRoadSpline.getPoseAtDistance(cabS);
    // Inbound left-hand drive: inbound left lane is along +normal
    cab.group.position.copy(cabPose.position).addScaledVector(cabPose.normal, laneOffset);
    // Heading rotated 180 degrees to face inbound towards studio
    cab.group.rotation.y = cabPose.heading + Math.PI;

    const cabDistFade =
      Math.min(1.0, Math.max(0.0, (cabS - minS) / 10.0)) *
      Math.min(1.0, Math.max(0.0, (maxS - cabS) / 14.0));
    const cabScale = Math.max(0.001, cabDistFade);
    cab.group.scale.set(cabScale, cabScale, cabScale);

    // Rotate Cab wheels
    for (const w of cab.wheels) {
      w.rotation.x -= cabSpeed * delta * 3.8;
    }
  };

  const dispose = () => {
    group.clear();
  };

  return { group, update, setNightMode, dispose };
}
