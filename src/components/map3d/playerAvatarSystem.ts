import * as THREE from "three";

/**
 * Controllable 3D Player Character & Avatar System
 * Handcrafted for Spotlight Bazaar (inspired by indiaagain.live's walking character mechanics).
 *
 * Features:
 * - Low-poly procedural Indian character avatar with responsive walking animation.
 * - Smooth leg stride, arm counter-swing, and hip bobbing physics.
 * - Overhead username badge with clean typography and verification badge.
 * - Overhead 3D speech bubble for "Quick Talk" dialogue and emoji reactions.
 * - Direction-aligned rotational slerp facing movement vector.
 * - Third-person camera tracking hook.
 */

// Shared Materials Cache
const avatarMatCache = new Map<string, THREE.MeshLambertMaterial>();
function getAvatarMat(hex: string): THREE.MeshLambertMaterial {
  if (!avatarMatCache.has(hex)) {
    avatarMatCache.set(
      hex,
      new THREE.MeshLambertMaterial({ color: hex, flatShading: true })
    );
  }
  return avatarMatCache.get(hex)!;
}

const capGeo = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 2, 6);

const AvatarGeos = {
  thigh: capGeo(0.085, 0.24),
  shin: capGeo(0.07, 0.22),
  shoe: new THREE.BoxGeometry(0.15, 0.09, 0.26),
  waist: new THREE.CylinderGeometry(0.15, 0.17, 0.18, 8),
  belly: new THREE.CylinderGeometry(0.14, 0.16, 0.16, 8),
  chest: capGeo(0.16, 0.18),
  head: new THREE.IcosahedronGeometry(0.19, 1),
  hairCap: new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
  armUpper: capGeo(0.05, 0.2),
  armFore: capGeo(0.045, 0.2),
  shadowBlob: new THREE.CircleGeometry(0.42, 16),
};

const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x070b14,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
});

export interface PlayerAvatarInput {
  forward: number; // 1 (up/W), -1 (down/S), 0
  strafe: number;  // 1 (right/D), -1 (left/A), 0
  sprint: boolean;
  cameraYaw: number;
}

export interface PlayerAvatarSystem {
  group: THREE.Group;
  update: (delta: number, input: PlayerAvatarInput) => void;
  say: (text: string) => void;
  getPosition: () => THREE.Vector3;
  setPosition: (x: number, y: number, z: number) => void;
  setUsername: (name: string) => void;
  dispose: () => void;
}

export function createPlayerAvatarSystem(
  initialX: number = 0,
  initialY: number = 0.44,
  initialZ: number = 20,
  username: string = "@spotlight.bazaar"
): PlayerAvatarSystem {
  const group = new THREE.Group();
  group.name = "player_avatar_system";
  group.position.set(initialX, initialY, initialZ);
  // Human-proportioned scale (approx 2.4m tall) so character is clearly visible in street view
  group.scale.set(1.85, 1.85, 1.85);

  // Character hierarchy
  const root = new THREE.Group();
  group.add(root);

  const body = new THREE.Group();
  root.add(body);

  const hips = new THREE.Group();
  body.add(hips);
  hips.position.y = 0.68;

  // Modern Indian streetwear: Ochre/Amber jacket, navy denim pants, warm skin
  const palette = {
    top: "#f59e0b",      // Warm ochre amber jacket
    bottom: "#1e293b",   // Deep navy denim trousers
    skin: "#d97706",     // Warm Indian skin tone
    hair: "#0f172a",     // Jet black hair
    shoes: "#ffffff",    // Clean white sneakers
  };

  // Waist & Belly
  const waistMesh = new THREE.Mesh(AvatarGeos.waist, getAvatarMat(palette.bottom));
  waistMesh.position.y = 0.04;
  hips.add(waistMesh);

  const bellyMesh = new THREE.Mesh(AvatarGeos.belly, getAvatarMat(palette.top));
  bellyMesh.position.y = 0.19;
  hips.add(bellyMesh);

  // Torso
  const torso = new THREE.Group();
  hips.add(torso);
  torso.position.y = 0.1;
  const chestMesh = new THREE.Mesh(AvatarGeos.chest, getAvatarMat(palette.top));
  chestMesh.position.y = 0.3;
  chestMesh.castShadow = true;
  torso.add(chestMesh);

  // Head & Hair
  const head = new THREE.Group();
  torso.add(head);
  head.position.y = 0.64;
  const headMesh = new THREE.Mesh(AvatarGeos.head, getAvatarMat(palette.skin));
  headMesh.castShadow = true;
  head.add(headMesh);

  const hairMesh = new THREE.Mesh(AvatarGeos.hairCap, getAvatarMat(palette.hair));
  hairMesh.position.set(0, 0.02, -0.02);
  hairMesh.rotation.x = -0.2;
  head.add(hairMesh);

  // Arms
  const buildArm = (side: number) => {
    const a = new THREE.Group();
    a.position.set(side * 0.23, 0.44, 0);
    torso.add(a);
    const upper = new THREE.Mesh(AvatarGeos.armUpper, getAvatarMat(palette.top));
    upper.position.y = -0.12;
    upper.castShadow = true;
    a.add(upper);
    const fore = new THREE.Mesh(AvatarGeos.armFore, getAvatarMat(palette.skin));
    fore.position.y = -0.32;
    fore.castShadow = true;
    a.add(fore);
    return a;
  };

  // Legs
  const buildLeg = (side: number) => {
    const l = new THREE.Group();
    l.position.set(side * 0.1, 0.02, 0);
    hips.add(l);
    const thigh = new THREE.Mesh(AvatarGeos.thigh, getAvatarMat(palette.bottom));
    thigh.position.y = -0.16;
    thigh.castShadow = true;
    l.add(thigh);
    const shin = new THREE.Mesh(AvatarGeos.shin, getAvatarMat(palette.bottom));
    shin.position.y = -0.44;
    shin.castShadow = true;
    l.add(shin);
    const shoe = new THREE.Mesh(AvatarGeos.shoe, getAvatarMat(palette.shoes));
    shoe.position.set(0, -0.6, 0.04);
    shoe.castShadow = true;
    l.add(shoe);
    return l;
  };

  const armL = buildArm(-1);
  const armR = buildArm(1);
  const legL = buildLeg(-1);
  const legR = buildLeg(1);

  // Ground Contact Shadow Blob
  const shadow = new THREE.Mesh(AvatarGeos.shadowBlob, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // -------------------------------------------------------------
  // OVERHEAD USERNAME BADGE (Canvas Texture Sprite)
  // -------------------------------------------------------------
  let currentUsername = username;
  const usernameCanvas = document.createElement("canvas");
  usernameCanvas.width = 512;
  usernameCanvas.height = 128;
  const usernameCtx = usernameCanvas.getContext("2d")!;
  const usernameTexture = new THREE.CanvasTexture(usernameCanvas);
  usernameTexture.minFilter = THREE.LinearFilter;
  const usernameMat = new THREE.SpriteMaterial({
    map: usernameTexture,
    transparent: true,
    depthTest: false,
  });
  const usernameSprite = new THREE.Sprite(usernameMat);
  usernameSprite.scale.set(2.4, 0.6, 1);
  usernameSprite.position.set(0, 2.05, 0);
  group.add(usernameSprite);

  function renderUsernameBadge(name: string) {
    usernameCtx.clearRect(0, 0, 512, 128);

    // Pill background
    const pillW = Math.min(name.length * 20 + 80, 480);
    const pillH = 54;
    const pillX = (512 - pillW) / 2;
    const pillY = (128 - pillH) / 2;
    const radius = 27;

    usernameCtx.fillStyle = "rgba(15, 23, 42, 0.88)";
    usernameCtx.beginPath();
    usernameCtx.roundRect(pillX, pillY, pillW, pillH, radius);
    usernameCtx.fill();

    usernameCtx.strokeStyle = "rgba(245, 158, 11, 0.7)";
    usernameCtx.lineWidth = 3;
    usernameCtx.stroke();

    // Text
    usernameCtx.font = "bold 26px sans-serif";
    usernameCtx.fillStyle = "#ffffff";
    usernameCtx.textAlign = "center";
    usernameCtx.textBaseline = "middle";
    usernameCtx.fillText(name, 256, 64);

    usernameTexture.needsUpdate = true;
  }

  renderUsernameBadge(currentUsername);

  // -------------------------------------------------------------
  // OVERHEAD SPEECH BUBBLE (Canvas Texture Sprite)
  // -------------------------------------------------------------
  const speechCanvas = document.createElement("canvas");
  speechCanvas.width = 512;
  speechCanvas.height = 256;
  const speechCtx = speechCanvas.getContext("2d")!;
  const speechTexture = new THREE.CanvasTexture(speechCanvas);
  speechTexture.minFilter = THREE.LinearFilter;
  const speechMat = new THREE.SpriteMaterial({
    map: speechTexture,
    transparent: true,
    opacity: 0,
    depthTest: false,
  });
  const speechSprite = new THREE.Sprite(speechMat);
  speechSprite.scale.set(3.6, 1.8, 1);
  speechSprite.position.set(0, 2.9, 0);
  group.add(speechSprite);

  let activeSpeech = "";
  let speechTimer = 0; // in seconds
  const SPEECH_DURATION = 6.0;

  function renderSpeechBubble(text: string) {
    speechCtx.clearRect(0, 0, 512, 256);

    const padX = 24;
    const padY = 16;
    speechCtx.font = "bold 30px sans-serif";
    const textMetrics = speechCtx.measureText(text);
    const boxW = Math.max(textMetrics.width + padX * 2, 140);
    const boxH = 68;
    const boxX = (512 - boxW) / 2;
    const boxY = 70;
    const radius = 20;

    // Outer glow / shadow
    speechCtx.shadowColor = "rgba(0, 0, 0, 0.4)";
    speechCtx.shadowBlur = 12;

    // Bubble body (bright amber/white modern comic bubble)
    speechCtx.fillStyle = "#ffffff";
    speechCtx.beginPath();
    speechCtx.roundRect(boxX, boxY, boxW, boxH, radius);
    speechCtx.fill();

    // Bubble pointer tail
    speechCtx.beginPath();
    speechCtx.moveTo(256 - 12, boxY + boxH);
    speechCtx.lineTo(256, boxY + boxH + 18);
    speechCtx.lineTo(256 + 12, boxY + boxH);
    speechCtx.closePath();
    speechCtx.fill();

    speechCtx.shadowColor = "transparent";

    // Border
    speechCtx.strokeStyle = "#f59e0b";
    speechCtx.lineWidth = 4;
    speechCtx.beginPath();
    speechCtx.roundRect(boxX, boxY, boxW, boxH, radius);
    speechCtx.stroke();

    // Speech text
    speechCtx.fillStyle = "#0f172a";
    speechCtx.textAlign = "center";
    speechCtx.textBaseline = "middle";
    speechCtx.fillText(text, 256, boxY + boxH / 2 + 1);

    speechTexture.needsUpdate = true;
  }

  // -------------------------------------------------------------
  // ANIMATION & PHYSICS STATE
  // -------------------------------------------------------------
  let walkPhase = 0;
  let currentRotation = 0;
  let targetRotation = 0;
  const WALK_SPEED = 11.0;
  const SPRINT_SPEED = 20.0;
  const ROTATION_LERP = 14.0;

  let baseOriginX = initialX;
  let baseOriginZ = initialZ;

  const sayMethod = (text: string) => {
    activeSpeech = text;
    speechTimer = SPEECH_DURATION;
    renderSpeechBubble(text);
    speechMat.opacity = 1;
  };

  group.userData.say = sayMethod;

  return {
    group,

    say: sayMethod,

    getPosition() {
      return group.position;
    },

    setPosition(x: number, y: number, z: number) {
      group.position.set(x, y, z);
      baseOriginX = x;
      baseOriginZ = z;
    },

    setUsername(name: string) {
      currentUsername = name;
      renderUsernameBadge(name);
    },

    update(delta: number, input: PlayerAvatarInput) {
      // 1. Process movement inputs
      const { forward, strafe, sprint, cameraYaw } = input;
      const isMoving = forward !== 0 || strafe !== 0;

      if (isMoving) {
        // Calculate move vector in camera-relative space
        const moveAngle = Math.atan2(strafe, forward);
        const worldAngle = cameraYaw + moveAngle;
        targetRotation = worldAngle;

        // Smooth rotation slerp
        let diff = targetRotation - currentRotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        currentRotation += diff * Math.min(delta * ROTATION_LERP, 1);
        root.rotation.y = currentRotation;

        // Move speed
        const speed = (sprint ? SPRINT_SPEED : WALK_SPEED) * delta;
        const vx = Math.sin(worldAngle) * speed;
        const vz = Math.cos(worldAngle) * speed;

        group.position.x += vx;
        group.position.z += vz;

        // Expanded citywide exploration bounds: Allows freely walking across Guwahati,
        // visiting Christian Basti, Paltan Bazar, Dispur, and crossing Saraighat Bridge
        group.position.x = Math.max(-250, Math.min(230, group.position.x));
        group.position.z = Math.max(-175, Math.min(155, group.position.z));

        // Dynamic 3D elevation tracking: Ramps & Saraighat Bridge Deck
        let targetY = 0.44; // Default elevated sidewalk height
        if (Math.abs(group.position.x - -130) < 6.5) {
          const z = group.position.z;
          if (z <= -30 && z >= -150) {
            targetY = 5.24; // Walking on Saraighat Bridge deck walkway
          } else if (z > -30 && z <= -8) {
            // South Approach Ramp
            const t = (-8 - z) / 22;
            targetY = 0.44 + t * (5.24 - 0.44);
          } else if (z < -150 && z >= -172) {
            // North Approach Ramp
            const t = (z - -172) / 22;
            targetY = 0.44 + t * (5.24 - 0.44);
          }
        }
        group.position.y += (targetY - group.position.y) * Math.min(delta * 10, 1.0);

        // Advance walk animation cycle
        const strideRate = sprint ? 16.0 : 10.0;
        walkPhase += delta * strideRate;

        // Limbs swing
        const legSwing = Math.sin(walkPhase) * (sprint ? 0.75 : 0.55);
        legL.rotation.x = legSwing;
        legR.rotation.x = -legSwing;

        const armSwing = Math.sin(walkPhase) * (sprint ? 0.65 : 0.45);
        armL.rotation.x = -armSwing;
        armR.rotation.x = armSwing;

        // Hip & Torso dynamic bobbing
        hips.position.y = 0.68 + Math.abs(Math.sin(walkPhase)) * 0.06;
        torso.rotation.x = (sprint ? 0.15 : 0.08); // Slight forward lean when walking
        torso.rotation.y = Math.sin(walkPhase) * 0.06;
      } else {
        // Return smoothly to idle stance
        legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, 0, delta * 8);
        legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, 0, delta * 8);
        armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0, delta * 8);
        armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0, delta * 8);
        torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0, delta * 8);
        torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, 0, delta * 8);

        // Subtle idle breathing
        const idleTime = performance.now() * 0.002;
        hips.position.y = 0.68 + Math.sin(idleTime) * 0.015;
      }

      // 2. Process speech bubble fade timer
      if (speechTimer > 0) {
        speechTimer -= delta;
        if (speechTimer <= 0.6) {
          speechMat.opacity = Math.max(0, speechTimer / 0.6);
        } else {
          speechMat.opacity = 1;
        }
      }
    },

    dispose() {
      usernameTexture.dispose();
      speechTexture.dispose();
      usernameMat.dispose();
      speechMat.dispose();
    },
  };
}
