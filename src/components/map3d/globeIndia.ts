import * as THREE from "three";
import { City, BusinessStorefront } from "@/types";

export interface IndiaLandData {
  source?: string;
  rings: [number, number][][];
}

export interface RiverItem {
  name: string;
  lines: number[][];
}

export interface GlobeCityPinObject {
  group: THREE.Group;
  city: City;
  hitBox: THREE.Mesh;
  pulseRing: THREE.Mesh;
  badge: THREE.Group;
}

export interface GlobeBuildResult {
  group: THREE.Group;
  cityPins: GlobeCityPinObject[];
  update: (delta: number, isNight: boolean, camera: THREE.Camera) => void;
  dispose: () => void;
}

/**
 * Projects latitude (-90..+90) and longitude (-180..+180) onto a 3D sphere surface of given radius.
 * Rotated so that India's geographic meridian (~82.5°E) centers directly facing the +Z camera axis.
 */
export function latLonToSphere(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon - 82.5) * (Math.PI / 180);
  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.cos(theta);
  return new THREE.Vector3(x, y, z);
}

/**
 * Procedural Earth Texture Generator
 * Generates an atmospheric canvas texture of the Earth with oceans, continents, and subtle lat/lon grid.
 */
function createEarthTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Deep oceanic blue gradient (day/night calibrated)
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, "#081d33");
  oceanGrad.addColorStop(0.3, "#0b2e52");
  oceanGrad.addColorStop(0.5, "#0d3b68");
  oceanGrad.addColorStop(0.7, "#0b2e52");
  oceanGrad.addColorStop(1, "#081d33");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle geographic grid lines (equator, tropics, meridians)
  ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
  ctx.lineWidth = 1;
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Draw broad global landmasses (Eurasia, Africa, Americas, Australia)
  ctx.fillStyle = "#143a29";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
  ctx.lineWidth = 1.5;

  function toCanvas(lon: number, lat: number): [number, number] {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  }

  function drawContinent(points: [number, number][]) {
    if (points.length < 3) return;
    ctx.beginPath();
    const [sx, sy] = toCanvas(points[0][0], points[0][1]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < points.length; i++) {
      const [px, py] = toCanvas(points[i][0], points[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // African continent
  drawContinent([
    [-17, 30], [-5, 36], [12, 38], [32, 31], [43, 12], [51, 12],
    [41, -10], [35, -24], [28, -34], [19, -34], [14, -22], [9, 4],
    [-14, 11], [-17, 21],
  ]);

  // Eurasian landmass
  drawContinent([
    [-9, 36], [-9, 44], [-4, 48], [5, 54], [10, 58], [28, 71],
    [45, 68], [75, 73], [105, 77], [140, 72], [170, 66], [142, 53],
    [130, 42], [121, 31], [108, 22], [100, 14], [99, 1], [105, -7],
    [90, 22], [70, 24], [55, 25], [36, 31], [27, 41], [14, 44],
  ]);

  // Australia
  drawContinent([
    [113, -22], [115, -34], [128, -32], [138, -38], [150, -37],
    [153, -28], [145, -14], [136, -12], [122, -18],
  ]);

  // North America
  drawContinent([
    [-168, 65], [-140, 70], [-100, 74], [-64, 60], [-53, 47],
    [-75, 35], [-81, 25], [-97, 26], [-105, 20], [-90, 16],
    [-105, 23], [-117, 32], [-124, 48], [-141, 60],
  ]);

  // South America
  drawContinent([
    [-80, 9], [-60, 10], [-50, 0], [-35, -5], [-39, -18],
    [-48, -28], [-58, -38], [-68, -54], [-75, -45], [-72, -30],
    [-81, -5],
  ]);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Builds the Interactive 3D Earth Globe featuring detailed topographical relief of India,
 * glowing coastlines, river networks, atmospheric aura, and interactive city pins.
 */
export function buildIndiaGlobe(
  landData: IndiaLandData,
  riversData: RiverItem[],
  cities: City[],
  storefronts: BusinessStorefront[]
): GlobeBuildResult {
  const group = new THREE.Group();
  group.name = "india_3d_globe_root";

  const GLOBE_RADIUS = 100;

  // 1. Earth Ocean & Continents Sphere
  const earthTexture = createEarthTexture();
  const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
  const earthMat = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.45,
    metalness: 0.15,
  });
  const earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthMesh.receiveShadow = true;
  group.add(earthMesh);

  // 2. High-Precision 3D Spherical Relief for India
  // Triangulates polygon rings and maps them onto the globe surface
  const indiaLandGroup = new THREE.Group();
  indiaLandGroup.name = "india_spherical_land";

  const landMaterial = new THREE.MeshStandardMaterial({
    color: 0x16a34a, // Vibrant lush Indian emerald green
    roughness: 0.75,
    metalness: 0.1,
    flatShading: true,
  });

  const coastlineMaterial = new THREE.LineBasicMaterial({
    color: 0x38bdf8, // Radiant cyan coastline outline
    transparent: true,
    opacity: 0.85,
    linewidth: 2,
  });

  for (const ring of landData.rings) {
    if (!ring || ring.length < 3) continue;

    // A. Triangulated Spherical Mesh
    try {
      const vec2Points = ring.map((p) => new THREE.Vector2(p[0], p[1]));
      const triangleIndices = THREE.ShapeUtils.triangulateShape(vec2Points, []);

      if (triangleIndices.length > 0) {
        const positions: number[] = [];
        for (const [i1, i2, i3] of triangleIndices) {
          const pt1 = latLonToSphere(ring[i1][1], ring[i1][0], GLOBE_RADIUS + 0.8);
          const pt2 = latLonToSphere(ring[i2][1], ring[i2][0], GLOBE_RADIUS + 0.8);
          const pt3 = latLonToSphere(ring[i3][1], ring[i3][0], GLOBE_RADIUS + 0.8);

          positions.push(pt1.x, pt1.y, pt1.z);
          positions.push(pt2.x, pt2.y, pt2.z);
          positions.push(pt3.x, pt3.y, pt3.z);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, landMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        indiaLandGroup.add(mesh);
      }
    } catch {
      // Ignore individual malformed ring errors gracefully
    }

    // B. Glowing Coastline Line
    const linePoints: THREE.Vector3[] = [];
    for (const [lon, lat] of ring) {
      linePoints.push(latLonToSphere(lat, lon, GLOBE_RADIUS + 1.2));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMesh = new THREE.Line(lineGeo, coastlineMaterial);
    indiaLandGroup.add(lineMesh);
  }
  group.add(indiaLandGroup);

  // 3. Curved 3D Rivers across India
  const riversGroup = new THREE.Group();
  riversGroup.name = "india_spherical_rivers";

  const riverMaterial = new THREE.LineBasicMaterial({
    color: 0x06b6d4, // Cyan blue river glow
    transparent: true,
    opacity: 0.9,
    linewidth: 2,
  });

  for (const river of riversData) {
    for (const line of river.lines) {
      if (!line || line.length < 4) continue;
      const rPoints: THREE.Vector3[] = [];
      for (let i = 0; i < line.length; i += 2) {
        const lon = line[i];
        const lat = line[i + 1];
        if (lon !== undefined && lat !== undefined) {
          rPoints.push(latLonToSphere(lat, lon, GLOBE_RADIUS + 1.3));
        }
      }
      if (rPoints.length >= 2) {
        const rGeo = new THREE.BufferGeometry().setFromPoints(rPoints);
        const rMesh = new THREE.Line(rGeo, riverMaterial);
        riversGroup.add(rMesh);
      }
    }
  }
  group.add(riversGroup);

  // 4. Glowing Atmosphere Rim
  const atmosphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 4.5, 48, 48);
  const atmosphereMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide,
  });
  const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
  group.add(atmosphereMesh);

  // 5. Interactive City Pins on Globe
  const cityPins: GlobeCityPinObject[] = [];
  const cityPinsGroup = new THREE.Group();
  cityPinsGroup.name = "globe_city_pins";

  for (const city of cities) {
    const pinPos = latLonToSphere(city.lat, city.lon, GLOBE_RADIUS + 1.2);
    const normal = pinPos.clone().normalize();

    const pinGroup = new THREE.Group();
    pinGroup.position.copy(pinPos);

    // Filter verified storefronts in this city
    const verifiedCount = storefronts.filter(
      (s) =>
        s.city_name &&
        city.name &&
        s.city_name.toLowerCase() === city.name.toLowerCase()
    ).length;

    // Pin Stem: radiating outward from the sphere
    const stemLength = 6.0;
    const stemGeo = new THREE.CylinderGeometry(0.35, 0.35, stemLength, 8);
    const stemMat = new THREE.MeshStandardMaterial({
      color: verifiedCount > 0 ? 0xf59e0b : 0x94a3b8,
      metalness: 0.6,
      roughness: 0.3,
    });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    // Align cylinder with normal
    stemMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    stemMesh.position.copy(normal.clone().multiplyScalar(stemLength / 2));
    pinGroup.add(stemMesh);

    // Glowing Pin Beacon Head
    const headRadius = verifiedCount > 0 ? 1.6 : 1.1;
    const headGeo = new THREE.SphereGeometry(headRadius, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: verifiedCount > 0 ? 0xfbbf24 : 0xcbd5e1,
      emissive: verifiedCount > 0 ? 0xd97706 : 0x64748b,
      emissiveIntensity: verifiedCount > 0 ? 0.9 : 0.3,
      roughness: 0.2,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.copy(normal.clone().multiplyScalar(stemLength + headRadius * 0.5));
    pinGroup.add(headMesh);

    // Pulsing Circular Wave on Globe Surface
    const ringGeo = new THREE.RingGeometry(1.2, 2.8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: verifiedCount > 0 ? 0xf59e0b : 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const pulseRing = new THREE.Mesh(ringGeo, ringMat);
    pulseRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    pulseRing.position.copy(normal.clone().multiplyScalar(0.2));
    pinGroup.add(pulseRing);

    // Floating 3D City Tag Billboard (Canvas Sprite / 3D Label)
    const labelGroup = new THREE.Group();
    labelGroup.position.copy(normal.clone().multiplyScalar(stemLength + headRadius + 4.5));

    const lCanvas = document.createElement("canvas");
    lCanvas.width = 256;
    lCanvas.height = 72;
    const lctx = lCanvas.getContext("2d")!;

    // Pill background
    lctx.fillStyle = verifiedCount > 0 ? "rgba(10, 15, 26, 0.94)" : "rgba(15, 23, 42, 0.88)";
    lctx.beginPath();
    lctx.roundRect(4, 4, 248, 64, 16);
    lctx.fill();

    // Border
    lctx.strokeStyle = verifiedCount > 0 ? "#f59e0b" : "#475569";
    lctx.lineWidth = verifiedCount > 0 ? 3 : 1.5;
    lctx.stroke();

    // City Name
    lctx.fillStyle = "#ffffff";
    lctx.font = "bold 24px Inter, system-ui, sans-serif";
    lctx.fillText(city.name, 16, 36);

    // Shop Count or Status
    lctx.fillStyle = verifiedCount > 0 ? "#fbbf24" : "#94a3b8";
    lctx.font = "bold 16px monospace";
    const subText = verifiedCount > 0 ? `${verifiedCount} Shop · Enter →` : "Plot Available";
    lctx.fillText(subText, 16, 56);

    const lTex = new THREE.CanvasTexture(lCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: lTex, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(12, 3.4, 1);
    labelGroup.add(sprite);

    pinGroup.add(labelGroup);

    // Invisible Raycast HitBox for mouse clicks
    const hitGeo = new THREE.SphereGeometry(6.5, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.copy(normal.clone().multiplyScalar(stemLength));
    (hitBox as any).cityData = city;
    (pinGroup as any).cityData = city;
    pinGroup.add(hitBox);

    cityPinsGroup.add(pinGroup);

    cityPins.push({
      group: pinGroup,
      city,
      hitBox,
      pulseRing,
      badge: labelGroup,
    });
  }
  group.add(cityPinsGroup);

  // 6. Deep Space Starfield Background for Globe View
  const starCount = 1200;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 400 + Math.random() * 800;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.8,
    transparent: true,
    opacity: 0.65,
  });
  const starField = new THREE.Points(starGeo, starMat);
  group.add(starField);

  let pulseTimer = 0;

  // Animation Update function
  const update = (delta: number, isNight: boolean, camera: THREE.Camera) => {
    pulseTimer += delta;

    // Pulse the amber city rings
    const ringScale = 1.0 + 0.6 * Math.sin(pulseTimer * 3.5);
    const ringOpacity = 0.85 - 0.45 * Math.sin(pulseTimer * 3.5);

    for (const pin of cityPins) {
      pin.pulseRing.scale.set(ringScale, ringScale, ringScale);
      if (pin.pulseRing.material instanceof THREE.MeshBasicMaterial) {
        pin.pulseRing.material.opacity = Math.max(0.2, ringOpacity);
      }
      // Orient labels towards camera
      pin.badge.quaternion.copy(camera.quaternion);
    }
  };

  const dispose = () => {
    earthGeo.dispose();
    earthMat.dispose();
    earthTexture.dispose();
    atmosphereGeo.dispose();
    atmosphereMat.dispose();
    starGeo.dispose();
    starMat.dispose();
  };

  return {
    group,
    cityPins,
    update,
    dispose,
  };
}
