import * as THREE from "three";

export interface SkyEnvironmentResult {
  group: THREE.Group;
  sunMesh: THREE.Group;
  moonMesh: THREE.Group;
  oceanMesh: THREE.Mesh;
  starField: THREE.Points;
  dirLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  hemiLight: THREE.HemisphereLight;
  updateLighting: (isNight: boolean, inTown: boolean) => void;
  update: (delta: number) => void;
  dispose: () => void;
}

/**
 * Creates radiant 3D Sun with glowing corona and lens aura
 */
function create3DSun(): THREE.Group {
  const sunGroup = new THREE.Group();
  sunGroup.name = "celestial_sun";

  // Position high in the day sky over India
  sunGroup.position.set(280, 560, -420);

  // 1. Sun Core Sphere
  const sunGeo = new THREE.SphereGeometry(32, 24, 24);
  const sunMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb, // Radiant warm white-gold
  });
  const sunCore = new THREE.Mesh(sunGeo, sunMat);
  sunGroup.add(sunCore);

  // 2. Inner Golden Corona Halo
  const innerCoronaGeo = new THREE.SphereGeometry(44, 20, 20);
  const innerCoronaMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.55,
    side: THREE.BackSide,
  });
  const innerCorona = new THREE.Mesh(innerCoronaGeo, innerCoronaMat);
  sunGroup.add(innerCorona);

  // 3. Outer Solar Flare Glow Sprite
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  grad.addColorStop(0, "rgba(254, 243, 199, 1.0)");
  grad.addColorStop(0.2, "rgba(251, 191, 36, 0.75)");
  grad.addColorStop(0.5, "rgba(245, 158, 11, 0.35)");
  grad.addColorStop(0.8, "rgba(217, 119, 6, 0.1)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const flareTex = new THREE.CanvasTexture(canvas);
  const flareMat = new THREE.SpriteMaterial({
    map: flareTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.85,
  });
  const flareSprite = new THREE.Sprite(flareMat);
  flareSprite.scale.set(160, 160, 1);
  sunGroup.add(flareSprite);

  return sunGroup;
}

/**
 * Creates glowing 3D Moon with soft lunar craters and cyan moonlight aura
 */
function create3DMoon(): THREE.Group {
  const moonGroup = new THREE.Group();
  moonGroup.name = "celestial_moon";

  // Position high in the nocturnal sky over India
  moonGroup.position.set(-260, 520, -380);

  // 1. Moon Lunar Sphere
  const moonGeo = new THREE.SphereGeometry(24, 24, 24);
  const moonMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.9,
    metalness: 0.1,
    emissive: new THREE.Color(0x94a3b8),
    emissiveIntensity: 0.45,
  });
  const moonSphere = new THREE.Mesh(moonGeo, moonMat);
  moonGroup.add(moonSphere);

  // 2. Cyan-Silver Lunar Aura Halo
  const auraGeo = new THREE.SphereGeometry(32, 20, 20);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    side: THREE.BackSide,
  });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  moonGroup.add(aura);

  // 3. Moon Soft Corona Glow Sprite
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, "rgba(224, 242, 254, 0.9)");
  grad.addColorStop(0.3, "rgba(56, 189, 248, 0.45)");
  grad.addColorStop(0.7, "rgba(14, 165, 233, 0.12)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const glowTex = new THREE.CanvasTexture(canvas);
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.75,
  });
  const glowSprite = new THREE.Sprite(glowMat);
  glowSprite.scale.set(130, 130, 1);
  moonGroup.add(glowSprite);

  return moonGroup;
}

/**
 * Builds the complete 3D Sky, Ocean, Sun, Moon, and Dynamic Lighting Environment
 */
export function buildSkyEnvironment(scene: THREE.Scene): SkyEnvironmentResult {
  const group = new THREE.Group();
  group.name = "sky_land_environment";

  // 1. Directional Sun/Moon Light
  const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
  dirLight.position.set(280, 560, -420);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 100;
  dirLight.shadow.camera.far = 1600;
  dirLight.shadow.camera.left = -700;
  dirLight.shadow.camera.right = 700;
  dirLight.shadow.camera.top = 700;
  dirLight.shadow.camera.bottom = -700;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // 2. Ambient & Hemisphere Lights
  const ambientLight = new THREE.AmbientLight(0xdbeafe, 1.05);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x14532d, 0.65);
  scene.add(hemiLight);

  // 3. 3D Sun & 3D Moon in the sky
  const sunMesh = create3DSun();
  group.add(sunMesh);

  const moonMesh = create3DMoon();
  moonMesh.visible = false;
  group.add(moonMesh);

  // 4. Nocturnal Starfield (Only visible during night mode)
  const starCount = 650;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * (Math.PI / 2.3); // upper celestial hemisphere
    const r = 1400 + Math.random() * 800;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.max(180, r * Math.cos(phi)); // in upper sky
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    transparent: true,
    opacity: 0, // hidden during day
  });
  const starField = new THREE.Points(starGeo, starMat);
  group.add(starField);

  // 5. Vast Oceanic Water Surface
  const oceanGeo = new THREE.PlaneGeometry(6000, 6000);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0f4068, // Marine oceanic blue
    roughness: 0.32,
    metalness: 0.35,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.y = -0.6;
  oceanMesh.receiveShadow = true;
  group.add(oceanMesh);

  scene.add(group);

  // Update Lighting and Environment between Day and Night
  const updateLighting = (isNight: boolean, inTown: boolean) => {
    if (inTown) {
      // In Town View: local street lighting with visible celestial Sun / Moon
      oceanMesh.visible = false;
      starField.visible = isNight;

      if (isNight) {
        scene.background = new THREE.Color(0x060d1f);
        scene.fog = new THREE.Fog(0x060d1f, 420, 1800);
        sunMesh.visible = false;
        moonMesh.visible = true;
        moonMesh.position.set(120, 240, -180);

        dirLight.intensity = 0.55;
        dirLight.color.setHex(0x38bdf8);
        ambientLight.intensity = 0.42;
        ambientLight.color.setHex(0x0c1b33);
        hemiLight.intensity = 0.28;
      } else {
        scene.background = new THREE.Color(0x38bdf8);
        scene.fog = new THREE.Fog(0xbae6fd, 480, 2200);
        sunMesh.visible = true;
        moonMesh.visible = false;
        sunMesh.position.set(160, 320, -280);

        dirLight.intensity = 2.4;
        dirLight.color.setHex(0xfff7ed);
        ambientLight.intensity = 1.15;
        ambientLight.color.setHex(0xdbeafe);
        hemiLight.intensity = 0.75;
      }
      return;
    }

    // In National 3D India Map View
    oceanMesh.visible = true;

    if (isNight) {
      // Night Mode: Midnight indigo sky, visible glowing Moon, stars, silvery cyan light
      scene.background = new THREE.Color(0x060d1f);
      scene.fog = new THREE.Fog(0x060d1f, 1500, 3600);

      sunMesh.visible = false;
      moonMesh.visible = true;
      (starMat as THREE.PointsMaterial).opacity = 0.75;

      dirLight.position.set(-260, 520, -380);
      dirLight.color.setHex(0x38bdf8);
      dirLight.intensity = 0.55;

      ambientLight.color.setHex(0x0c1b33);
      ambientLight.intensity = 0.38;

      hemiLight.color.setHex(0x1e3a8a);
      hemiLight.groundColor.setHex(0x064e3b);
      hemiLight.intensity = 0.25;

      (oceanMat as THREE.MeshStandardMaterial).color.setHex(0x051329);
    } else {
      // Day Mode: Sunny daytime sky, visible glowing Sun, warm golden sunlight
      scene.background = new THREE.Color(0x38bdf8);
      scene.fog = new THREE.Fog(0xbae6fd, 1600, 3800);

      sunMesh.visible = true;
      moonMesh.visible = false;
      (starMat as THREE.PointsMaterial).opacity = 0;

      dirLight.position.set(280, 560, -420);
      dirLight.color.setHex(0xfff7ed);
      dirLight.intensity = 2.4;

      ambientLight.color.setHex(0xdbeafe);
      ambientLight.intensity = 1.05;

      hemiLight.color.setHex(0xdbeafe);
      hemiLight.groundColor.setHex(0x14532d);
      hemiLight.intensity = 0.65;

      (oceanMat as THREE.MeshStandardMaterial).color.setHex(0x0f4068);
    }
  };

  let pulseTime = 0;
  const update = (delta: number) => {
    pulseTime += delta;
    // Gentle solar corona flare breathing
    if (sunMesh.visible) {
      const s = 1.0 + Math.sin(pulseTime * 2.0) * 0.05;
      sunMesh.children[1].scale.set(s, s, s);
    }
    // Gentle lunar aura breathing
    if (moonMesh.visible) {
      const m = 1.0 + Math.sin(pulseTime * 1.5) * 0.04;
      moonMesh.children[1].scale.set(m, m, m);
    }
  };

  const dispose = () => {
    oceanGeo.dispose();
    oceanMat.dispose();
    starGeo.dispose();
    starMat.dispose();
  };

  return {
    group,
    sunMesh,
    moonMesh,
    oceanMesh,
    starField,
    dirLight,
    ambientLight,
    hemiLight,
    updateLighting,
    update,
    dispose,
  };
}

