import * as THREE from "three";

/**
 * Realistic Living Water, Wildlife & River/Ocean System
 * Features:
 * - Animated undulating water surface with dynamic wave displacement & specular sheen
 * - 3D Jumping Indian Mahseer / River Carp leaping out of the water with splash rings & spray
 * - Procedural flocking river birds (flapping wings, double-sided plumage, banking flight paths)
 * - Shoreline foam line, riverbank rocks, and wetland reeds
 */

export interface WaterSystem {
  group: THREE.Group;
  update: (delta: number, isDark?: boolean) => void;
  dispose: () => void;
}

export function createWaterSystem(riverDistanceZ = -38.0, riverWidth = 120.0, riverLength = 320.0): WaterSystem {
  const group = new THREE.Group();
  group.name = "living_water_and_wildlife_system";

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  // 1. Dynamic Water Surface Mesh
  const segmentsX = 48;
  const segmentsZ = 64;
  const waterGeo = new THREE.PlaneGeometry(riverLength, riverWidth, segmentsX, segmentsZ);
  waterGeo.rotateX(-Math.PI / 2);
  geometries.push(waterGeo);

  // Store original vertex Y values for multi-harmonic wave simulation
  const posAttr = waterGeo.attributes.position;
  const originalY = new Float32Array(posAttr.count);
  for (let i = 0; i < posAttr.count; i++) {
    originalY[i] = posAttr.getY(i);
  }

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.15,
    metalness: 0.88,
    flatShading: true,
    transparent: true,
    opacity: 0.90,
  });
  materials.push(waterMat);

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, -0.28, riverDistanceZ);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // Deep River Bed (prevents seeing through to bottom void)
  const bedGeo = new THREE.PlaneGeometry(riverLength * 1.05, riverWidth * 1.05);
  bedGeo.rotateX(-Math.PI / 2);
  geometries.push(bedGeo);
  const bedMat = new THREE.MeshBasicMaterial({ color: 0x031826 });
  materials.push(bedMat);
  const bedMesh = new THREE.Mesh(bedGeo, bedMat);
  bedMesh.position.set(0, -0.65, riverDistanceZ);
  group.add(bedMesh);

  // Riverbank Foam & Sand Verge
  const bankZ = riverDistanceZ + riverWidth / 2;
  const bankGeo = new THREE.BoxGeometry(riverLength, 0.14, 4.2);
  geometries.push(bankGeo);
  const bankMat = new THREE.MeshStandardMaterial({
    color: 0x2e251b,
    roughness: 0.92,
  });
  materials.push(bankMat);
  const bankMesh = new THREE.Mesh(bankGeo, bankMat);
  bankMesh.position.set(0, -0.16, bankZ);
  group.add(bankMesh);

  // Coastal White Foam Line
  const foamGeo = new THREE.PlaneGeometry(riverLength, 1.4);
  foamGeo.rotateX(-Math.PI / 2);
  geometries.push(foamGeo);
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.55,
  });
  materials.push(foamMat);
  const foamMesh = new THREE.Mesh(foamGeo, foamMat);
  foamMesh.position.set(0, -0.24, bankZ - 0.7);
  group.add(foamMesh);

  // Wetland Reeds along the riverbank
  const reedMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8 });
  materials.push(reedMat);
  const reedGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.6, 4);
  geometries.push(reedGeo);
  for (let i = 0; i < 28; i++) {
    const rx = (Math.random() - 0.5) * (riverLength * 0.85);
    const rz = bankZ + (Math.random() - 0.5) * 1.8;
    const reed = new THREE.Mesh(reedGeo, reedMat);
    reed.position.set(rx, 0.65, rz);
    reed.rotation.z = (Math.random() - 0.5) * 0.25;
    reed.rotation.x = (Math.random() - 0.5) * 0.25;
    group.add(reed);
  }

  // Riverside Boulders / Stones
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
  materials.push(rockMat);
  const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
  geometries.push(rockGeo);
  for (let i = 0; i < 14; i++) {
    const rx = (Math.random() - 0.5) * (riverLength * 0.8);
    const rz = bankZ - 0.5 + (Math.random() - 0.5) * 2.2;
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const s = 0.5 + Math.random() * 0.8;
    rock.scale.set(s * 1.4, s * 0.6, s);
    rock.position.set(rx, -0.1, rz);
    rock.rotation.y = Math.random() * Math.PI;
    group.add(rock);
  }

  // 2. Animated 3D Leaping Fish (Indian Golden Mahseer / River Carp)
  interface LeapingFish {
    group: THREE.Group;
    bodyMesh: THREE.Mesh;
    tailMesh: THREE.Mesh;
    leapTimer: number;
    leapDuration: number;
    leapCooldown: number;
    startX: number;
    startZ: number;
    peakHeight: number;
    jumpDirection: number;
    rippleMesh: THREE.Mesh;
  }

  const fishCount = 5;
  const leapingFishList: LeapingFish[] = [];

  const fishBodyMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x78350f,
    emissiveIntensity: 0.35,
  });
  const fishSilverMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.90,
    roughness: 0.15,
  });
  materials.push(fishBodyMat, fishSilverMat);

  const fishBodyGeo = new THREE.ConeGeometry(0.24, 1.4, 6);
  fishBodyGeo.rotateZ(Math.PI / 2);
  geometries.push(fishBodyGeo);

  const fishTailGeo = new THREE.BufferGeometry();
  const tailVerts = new Float32Array([
    0, 0, 0,
    -0.45, 0.35, 0,
    -0.45, -0.35, 0,
  ]);
  fishTailGeo.setAttribute("position", new THREE.BufferAttribute(tailVerts, 3));
  fishTailGeo.computeVertexNormals();
  geometries.push(fishTailGeo);

  // Splash Ripple Geometry
  const splashRingGeo = new THREE.RingGeometry(0.2, 0.45, 16);
  splashRingGeo.rotateX(-Math.PI / 2);
  geometries.push(splashRingGeo);

  const splashMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(splashMat);

  for (let i = 0; i < fishCount; i++) {
    const fGroup = new THREE.Group();
    fGroup.name = `leaping_fish_${i}`;

    const isGolden = i % 2 === 0;
    const body = new THREE.Mesh(fishBodyGeo, isGolden ? fishBodyMat : fishSilverMat);
    fGroup.add(body);

    const tail = new THREE.Mesh(fishTailGeo, isGolden ? fishBodyMat : fishSilverMat);
    tail.position.set(-0.7, 0, 0);
    fGroup.add(tail);

    fGroup.scale.set(1.4, 1.4, 1.4);
    fGroup.position.set(0, -2.0, 0); // submerged initially
    group.add(fGroup);

    // Dedicated splash ring for each fish
    const rMesh = new THREE.Mesh(splashRingGeo, splashMat.clone());
    materials.push(rMesh.material as THREE.Material);
    rMesh.position.set(0, -0.22, 0);
    rMesh.visible = false;
    group.add(rMesh);

    leapingFishList.push({
      group: fGroup,
      bodyMesh: body,
      tailMesh: tail,
      leapTimer: 0,
      leapDuration: 1.4 + Math.random() * 0.6,
      leapCooldown: 2.0 + Math.random() * 4.5 + i * 1.5,
      startX: (Math.random() - 0.5) * (riverLength * 0.7),
      startZ: riverDistanceZ + (Math.random() - 0.5) * (riverWidth * 0.6),
      peakHeight: 1.8 + Math.random() * 1.4,
      jumpDirection: (Math.random() - 0.5) * Math.PI,
      rippleMesh: rMesh,
    });
  }

  // 3. Majestic Flocking 3D River Birds (Cranes / River Terns)
  interface Bird {
    group: THREE.Group;
    leftWing: THREE.Mesh;
    rightWing: THREE.Mesh;
    flapSpeed: number;
    flapPhase: number;
    speed: number;
    radiusX: number;
    radiusZ: number;
    angle: number;
    baseAltitude: number;
  }

  const birds: Bird[] = [];
  const birdCount = 7;

  const birdPlumageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });
  const birdTipMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const birdBeakMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.3,
  });
  materials.push(birdPlumageMat, birdTipMat, birdBeakMat);

  function createMajesticBird(): { group: THREE.Group; leftWing: THREE.Mesh; rightWing: THREE.Mesh } {
    const bGroup = new THREE.Group();

    // Streamlined Bird Torso (length 2.2m)
    const bodyGeo = new THREE.ConeGeometry(0.32, 2.2, 6);
    bodyGeo.rotateX(Math.PI / 2);
    geometries.push(bodyGeo);
    const body = new THREE.Mesh(bodyGeo, birdPlumageMat);
    bGroup.add(body);

    // Golden Beak
    const beakGeo = new THREE.ConeGeometry(0.12, 0.65, 4);
    beakGeo.rotateX(Math.PI / 2);
    geometries.push(beakGeo);
    const beak = new THREE.Mesh(beakGeo, birdBeakMat);
    beak.position.set(0, 0, 1.4);
    bGroup.add(beak);

    // Left Wing (wingspan ~3.2m with tapered black wingtip)
    const wingGeo = new THREE.PlaneGeometry(1.65, 0.75);
    geometries.push(wingGeo);
    const leftWing = new THREE.Mesh(wingGeo, birdPlumageMat);
    leftWing.position.set(-0.95, 0.08, 0.05);
    leftWing.rotation.x = Math.PI / 2;

    const tipGeo = new THREE.PlaneGeometry(0.55, 0.45);
    geometries.push(tipGeo);
    const leftTip = new THREE.Mesh(tipGeo, birdTipMat);
    leftTip.position.set(-0.95, 0, 0);
    leftWing.add(leftTip);
    bGroup.add(leftWing);

    // Right Wing
    const rightWing = new THREE.Mesh(wingGeo, birdPlumageMat);
    rightWing.position.set(0.95, 0.08, 0.05);
    rightWing.rotation.x = Math.PI / 2;

    const rightTip = new THREE.Mesh(tipGeo, birdTipMat);
    rightTip.position.set(0.95, 0, 0);
    rightWing.add(rightTip);
    bGroup.add(rightWing);

    return { group: bGroup, leftWing, rightWing };
  }

  for (let i = 0; i < birdCount; i++) {
    const { group: bGroup, leftWing, rightWing } = createMajesticBird();
    const altitude = 22.0 + Math.random() * 16.0;
    const radiusX = 45.0 + Math.random() * 55.0;
    const radiusZ = 25.0 + Math.random() * 35.0;
    const angle = (i / birdCount) * Math.PI * 2;
    bGroup.position.set(
      Math.cos(angle) * radiusX,
      altitude,
      riverDistanceZ + Math.sin(angle) * radiusZ
    );
    bGroup.scale.set(1.6, 1.6, 1.6); // Prominently visible in camera!
    group.add(bGroup);

    birds.push({
      group: bGroup,
      leftWing,
      rightWing,
      flapSpeed: 6.0 + Math.random() * 2.0,
      flapPhase: Math.random() * Math.PI * 2,
      speed: 14.0 + Math.random() * 4.0,
      radiusX,
      radiusZ,
      angle,
      baseAltitude: altitude,
    });
  }

  let elapsed = 0;

  const update = (delta: number, isDark = false) => {
    elapsed += delta;

    // Day / Night water appearance
    if (isDark) {
      waterMat.color.setHex(0x03243d);
      waterMat.roughness = 0.20;
      waterMat.metalness = 0.92;
      foamMat.opacity = 0.28;
    } else {
      waterMat.color.setHex(0x0284c7);
      waterMat.roughness = 0.14;
      waterMat.metalness = 0.88;
      foamMat.opacity = 0.65;
    }

    // Foam line gentle shore breathing
    foamMesh.position.z = bankZ - 0.7 + Math.sin(elapsed * 1.8) * 0.35;

    // 1. Undulate water surface vertices (rich multi-harmonic waves)
    const positions = waterGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const u = positions.getX(i);
      const v = positions.getZ(i);
      const wave1 = Math.sin(u * 0.08 + elapsed * 2.4) * 0.22;
      const wave2 = Math.cos(v * 0.12 + elapsed * 1.7) * 0.16;
      const wave3 = Math.sin((u + v) * 0.06 + elapsed * 3.1) * 0.09;
      positions.setY(i, originalY[i] + wave1 + wave2 + wave3);
    }
    positions.needsUpdate = true;
    waterGeo.computeVertexNormals();

    // 2. Animate 3D Leaping Fish & Splashes
    for (const fish of leapingFishList) {
      if (fish.leapTimer < fish.leapDuration) {
        fish.leapTimer += delta;
        const progress = Math.min(1.0, fish.leapTimer / fish.leapDuration);

        // Parabolic trajectory: starts at water level, arcs up, dives down
        const arcY = -0.28 + Math.sin(progress * Math.PI) * fish.peakHeight;
        const moveDist = (progress - 0.5) * 4.5;
        const curX = fish.startX + Math.sin(fish.jumpDirection) * moveDist;
        const curZ = fish.startZ + Math.cos(fish.jumpDirection) * moveDist;

        fish.group.position.set(curX, arcY, curZ);

        // Pitch aligns with trajectory tangent (nose points up then down)
        const tangentY = Math.cos(progress * Math.PI) * 1.4;
        fish.group.rotation.y = fish.jumpDirection + Math.PI / 2;
        fish.group.rotation.z = tangentY * 0.8;

        // Tail wiggle
        fish.tailMesh.rotation.y = Math.sin(elapsed * 24.0) * 0.45;

        // Splash ripple animation at emergence & plunge
        if (progress > 0.05 && progress < 0.95) {
          fish.rippleMesh.visible = true;
          const rScale = 0.5 + progress * 2.2;
          fish.rippleMesh.position.set(curX, -0.24, curZ);
          fish.rippleMesh.scale.set(rScale, rScale, rScale);
          (fish.rippleMesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.8;
        } else {
          fish.rippleMesh.visible = false;
        }
      } else {
        // Submerged resting cooldown
        fish.group.position.y = -3.0;
        fish.rippleMesh.visible = false;
        fish.leapCooldown -= delta;
        if (fish.leapCooldown <= 0) {
          // Trigger next leap
          fish.leapTimer = 0;
          fish.leapCooldown = 3.0 + Math.random() * 5.5;
          fish.startX = (Math.random() - 0.5) * (riverLength * 0.7);
          fish.startZ = riverDistanceZ + (Math.random() - 0.5) * (riverWidth * 0.6);
          fish.jumpDirection = (Math.random() - 0.5) * Math.PI * 2;
        }
      }
    }

    // 3. Animate Flocking Birds (flapping wings, banking curves, gliding loops)
    for (const b of birds) {
      b.angle += (b.speed / b.radiusX) * delta * 0.45;
      const nextX = Math.cos(b.angle) * b.radiusX;
      const nextZ = riverDistanceZ + Math.sin(b.angle) * b.radiusZ;
      const nextY = b.baseAltitude + Math.sin(elapsed * 1.1 + b.flapPhase) * 2.2;

      const dx = nextX - b.group.position.x;
      const dz = nextZ - b.group.position.z;
      const heading = Math.atan2(dx, dz);

      b.group.position.set(nextX, nextY, nextZ);
      b.group.rotation.y = heading;

      // Banking into the turn
      b.group.rotation.z = Math.sin(elapsed * 1.4 + b.flapPhase) * 0.22;

      // Realistic wing flap cycle with gliding pauses
      const flapCycle = Math.sin(elapsed * b.flapSpeed + b.flapPhase);
      const isGliding = Math.sin(elapsed * 0.6 + b.flapPhase) > 0.4;
      const flapAmount = isGliding ? 0.05 * flapCycle : 0.55 * flapCycle;

      b.leftWing.rotation.y = flapAmount;
      b.rightWing.rotation.y = -flapAmount;
    }
  };

  const dispose = () => {
    for (const m of materials) m.dispose();
    for (const g of geometries) g.dispose();
    group.clear();
  };

  return { group, update, dispose };
}
