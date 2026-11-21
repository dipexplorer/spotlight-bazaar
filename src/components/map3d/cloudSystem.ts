import * as THREE from "three";
import { WeatherTelemetry } from "@/lib/weather/weatherService";

/**
 * Procedural 3D Volumetric Cloud & Atmospheric Fog System
 * Creates realistic drifting cumulus cloud clusters at altitude
 * and rolling seasonal ground fog/mist for winter and overcast weather.
 */

export interface CloudSystem {
  group: THREE.Group;
  update: (delta: number, weather?: WeatherTelemetry | null, isDark?: boolean) => void;
  dispose: () => void;
}

export function createCloudSystem(boundRadius = 260): CloudSystem {
  const group = new THREE.Group();
  group.name = "volumetric_cloud_system";

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  // Cloud puff materials
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.88,
    flatShading: true,
    depthWrite: false,
  });
  materials.push(cloudMat);

  // Ground Fog / Winter Mist Material
  const fogMat = new THREE.MeshBasicMaterial({
    color: 0xf1f5f9,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(fogMat);

  // Helper to build a majestic fluffy cumulus cloud cluster
  function createCloudCluster(scale = 1.0): THREE.Group {
    const cluster = new THREE.Group();
    const puffCount = 8 + Math.floor(Math.random() * 6);
    const basePuffGeo = new THREE.DodecahedronGeometry(6.5 * scale, 1);
    geometries.push(basePuffGeo);

    for (let i = 0; i < puffCount; i++) {
      const puff = new THREE.Mesh(basePuffGeo, cloudMat);
      const angle = (i / puffCount) * Math.PI * 2;
      const dist = (Math.random() * 8.0 + 3.0) * scale;
      puff.position.set(
        Math.cos(angle) * dist,
        (Math.random() * 3.5 - 1.2) * scale,
        Math.sin(angle) * dist
      );
      const s = 0.8 + Math.random() * 0.7;
      puff.scale.set(s, s * 0.75, s);
      cluster.add(puff);
    }
    return cluster;
  }

  // 1. Altitude Cloud Layer (drifting high in the sky at Y = 75m - 130m)
  const clouds: { group: THREE.Group; speed: number; baseAltitude: number }[] = [];
  const cloudCount = 12;

  for (let i = 0; i < cloudCount; i++) {
    const scale = 1.1 + Math.random() * 0.9;
    const c = createCloudCluster(scale);
    const altitude = 75.0 + Math.random() * 45.0;

    // Keep clear corridor over the immediate building & street so clouds never block storefront view
    let cx = (Math.random() - 0.5) * boundRadius * 2;
    let cz = (Math.random() - 0.5) * boundRadius * 2;
    if (Math.hypot(cx, cz) < 65) {
      cx += cx >= 0 ? 65 : -65;
      cz += cz >= 0 ? 65 : -65;
    }

    c.position.set(cx, altitude, cz);
    group.add(c);
    clouds.push({
      group: c,
      speed: 1.4 + Math.random() * 1.4,
      baseAltitude: altitude,
    });
  }

  // 2. Winter Ground Mist & Atmospheric Fog Planes (Y = 1.0m - 4.5m)
  const fogPlanes: { mesh: THREE.Mesh; speedX: number; speedZ: number; baseAltitude: number }[] = [];
  const fogGeo = new THREE.PlaneGeometry(360, 360);
  geometries.push(fogGeo);

  for (let f = 0; f < 4; f++) {
    const fogMesh = new THREE.Mesh(fogGeo, fogMat);
    fogMesh.rotation.x = -Math.PI / 2;
    const baseAlt = 1.2 + f * 1.3;
    fogMesh.position.set(0, baseAlt, 20.0);
    group.add(fogMesh);
    fogPlanes.push({
      mesh: fogMesh,
      speedX: 0.6 + f * 0.35,
      speedZ: 0.4 + f * 0.25,
      baseAltitude: baseAlt,
    });
  }

  let elapsed = 0;

  const update = (delta: number, weather?: WeatherTelemetry | null, isDark = false) => {
    elapsed += delta;

    // Adjust cloud material colors based on Day / Night and Weather
    if (isDark) {
      cloudMat.color.setHex(0x1e293b);
      cloudMat.opacity = 0.55;
      fogMat.color.setHex(0x0f172a);
      fogMat.opacity = 0.22;
    } else {
      const isOvercast = weather?.isOvercast || weather?.isRaining;
      if (isOvercast) {
        cloudMat.color.setHex(0x94a3b8);
        cloudMat.opacity = 0.94;
        fogMat.color.setHex(0xcbd5e1);
        fogMat.opacity = 0.45;
      } else {
        cloudMat.color.setHex(0xffffff);
        cloudMat.opacity = 0.88;
        fogMat.color.setHex(0xf1f5f9);
        fogMat.opacity = 0.26;
      }
    }

    // Winter / Foggy condition check
    const isDenseFog = Boolean(
      weather?.isFoggy ||
      (weather && weather.weatherCode >= 45 && weather.weatherCode <= 48)
    );
    const showGroundFog = Boolean(isDenseFog || weather?.isOvercast || weather?.isRaining);

    for (const fp of fogPlanes) {
      fp.mesh.visible = showGroundFog;
      if (fp.mesh.visible) {
        fp.mesh.position.x = Math.sin(elapsed * 0.06 * fp.speedX) * 18.0;
        fp.mesh.position.z = 25.0 + Math.cos(elapsed * 0.05 * fp.speedZ) * 12.0;
        fp.mesh.position.y = fp.baseAltitude + Math.sin(elapsed * 0.4) * 0.25;
      }
    }

    // Drift altitude clouds smoothly across the sky
    const halfBound = boundRadius;
    for (const c of clouds) {
      c.group.position.x += c.speed * delta;
      c.group.position.z += c.speed * 0.35 * delta;

      // Wrap around boundary seamlessly
      if (c.group.position.x > halfBound) {
        c.group.position.x = -halfBound;
      }
      if (c.group.position.z > halfBound) {
        c.group.position.z = -halfBound;
      }
    }
  };

  const dispose = () => {
    for (const m of materials) m.dispose();
    for (const g of geometries) g.dispose();
    group.clear();
  };

  return { group, update, dispose };
}
