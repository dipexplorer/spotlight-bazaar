"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { City, BusinessStorefront } from "@/types";
import { buildIndiaGlobe, GlobeBuildResult } from "./globeIndia";
import { buildBazaarStreet } from "./bazaarStreet";
import { TrafficSystem } from "./trafficSystem";
import { PedestrianSystem } from "./pedestrianSystem";
import { StorefrontMeshResult } from "./cartoonStorefront";
import {
  Sun,
  Moon,
  RotateCcw,
  Sparkles,
  Store,
  ShieldCheck,
  Search,
  ArrowLeft,
  Footprints,
  Eye,
  ChevronRight,
  Plus,
  Rocket,
  Volume2,
  VolumeX,
  Paintbrush,
  Coffee,
  Trophy,
  Share2,
  MessageSquare,
  Box,
  Layers,
  Grid,
  Globe,
} from "lucide-react";
import { VirtualJoystick } from "./VirtualJoystick";
import { ChaiStallModal } from "./ChaiStallModal";
import { CricketGameModal } from "./CricketGameModal";
import { StorefrontCustomizerModal } from "./StorefrontCustomizerModal";
import { QuickTalkModal } from "./QuickTalkModal";
import { StorefrontDialogueModal } from "./StorefrontDialogueModal";
import { createPlayerAvatarSystem, PlayerAvatarSystem } from "./playerAvatarSystem";
import { bazaarAudio } from "@/lib/audio/bazaarAudio";

interface ThreeMapCanvasProps {
  cities: City[];
  storefronts: BusinessStorefront[];
  selectedCity: City | null;
  activeStorefront?: BusinessStorefront | null;
  onCitySelect: (city: City | null) => void;
  onStorefrontSelect?: (storefront: BusinessStorefront) => void;
  viewMode?: "3d" | "2d" | "grid";
  onViewModeChange?: (mode: "3d" | "2d" | "grid") => void;
}

export function ThreeMapCanvas({
  cities,
  storefronts,
  selectedCity,
  activeStorefront,
  onCitySelect,
  onStorefrontSelect,
  viewMode = "3d",
  onViewModeChange,
}: ThreeMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [isNight, setIsNight] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [isWalkMode, setIsWalkMode] = useState(false);
  const [isCinematicPlaying, setIsCinematicPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showShopsDrawer, setShowShopsDrawer] = useState(false);
  const [showChaiModal, setShowChaiModal] = useState(false);
  const [showCricketModal, setShowCricketModal] = useState(false);
  const [customizingStorefront, setCustomizingStorefront] = useState<BusinessStorefront | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState(bazaarAudio.getMuted());
  const [speedBoostUntil, setSpeedBoostUntil] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  // Quick Talk & Proximity Dialogue
  const [showQuickTalkModal, setShowQuickTalkModal] = useState(false);
  const [activeDialogueStorefront, setActiveDialogueStorefront] = useState<BusinessStorefront | null>(null);
  const [nearbyStorefront, setNearbyStorefront] = useState<BusinessStorefront | null>(null);
  const nearbyStorefrontRef = useRef<BusinessStorefront | null>(null);
  nearbyStorefrontRef.current = nearbyStorefront;

  const [userCoins] = useState(10);
  const [dayNumber] = useState(7);
  const playerAvatarRef = useRef<PlayerAvatarSystem | null>(null);

  const isNightRef = useRef(isNight);
  isNightRef.current = isNight;

  const joystickVecRef = useRef({ forward: 0, strafe: 0 });

  // Fresh callback references for event listeners
  const onCitySelectRef = useRef(onCitySelect);
  onCitySelectRef.current = onCitySelect;
  const onStorefrontSelectRef = useRef(onStorefrontSelect);
  onStorefrontSelectRef.current = onStorefrontSelect;
  const citiesRef = useRef(cities);
  citiesRef.current = cities;
  const storefrontsRef = useRef(storefronts);
  storefrontsRef.current = storefronts;

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeResultRef = useRef<GlobeBuildResult | null>(null);
  const currentBazaarGroupRef = useRef<THREE.Group | null>(null);
  const trafficRef = useRef<TrafficSystem | null>(null);
  const pedestriansRef = useRef<PedestrianSystem | null>(null);
  const hitBoxesRef = useRef<THREE.Mesh[]>([]);
  const plotsRef = useRef<StorefrontMeshResult[]>([]);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  // Animation & Camera Tween State
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  // Keyboard navigation state for WASD walk
  const keysDownRef = useRef<{ [key: string]: boolean }>({});
  const isWalkModeRef = useRef(isWalkMode);
  isWalkModeRef.current = isWalkMode;
  const selectedCityRef = useRef(selectedCity);
  selectedCityRef.current = selectedCity;

  // Active storefronts in selected city
  const cityStorefronts = selectedCity?.name
    ? storefronts.filter(
        (s) =>
          Boolean(s?.city_name) &&
          s.city_name.toLowerCase() === selectedCity.name.toLowerCase()
      )
    : [];

  // Smooth Camera: Town High-Street View vs 3D Globe India Center
  const flyToCityStreet = useCallback((city: City, walk: boolean = false) => {
    if (walk) {
      // Behind controllable avatar promenade
      targetCamPosRef.current = new THREE.Vector3(-8.2, 3.2, 7.5);
      targetLookAtRef.current = new THREE.Vector3(-8.2, 1.8, 26);
    } else {
      // Drone high-street overview: angled down central boulevard
      targetCamPosRef.current = new THREE.Vector3(0, 24, -18);
      targetLookAtRef.current = new THREE.Vector3(0, 3, 38);
    }
  }, []);

  const resetCamera = useCallback(() => {
    if (selectedCityRef.current) {
      flyToCityStreet(selectedCityRef.current, isWalkModeRef.current);
    } else {
      // Re-center India on the 3D Earth Globe
      targetCamPosRef.current = new THREE.Vector3(0, 42, 245);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
      setIsWalkMode(false);
    }
  }, [flyToCityStreet]);

  // Frame a specific storefront in the 3D high street
  const focusStorefront = useCallback(
    (storefront: BusinessStorefront) => {
      if (!selectedCity) return;
      const plot = plotsRef.current.find(
        (p) => p.storefrontData?.id === storefront.id
      );

      if (plot) {
        const worldPos = new THREE.Vector3();
        plot.mesh.getWorldPosition(worldPos);
        const isLeft = plot.mesh.position.x < 0;

        targetCamPosRef.current = new THREE.Vector3(
          worldPos.x + (isLeft ? 8 : -8),
          worldPos.y + 2.5,
          worldPos.z
        );
        targetLookAtRef.current = new THREE.Vector3(
          worldPos.x,
          worldPos.y + 1.2,
          worldPos.z
        );
      }

      if (onStorefrontSelectRef.current) {
        onStorefrontSelectRef.current(storefront);
      }
    },
    [selectedCity]
  );

  // Auto-focus storefront when passed via prop
  useEffect(() => {
    if (activeStorefront && selectedCity && plotsRef.current.length > 0) {
      focusStorefront(activeStorefront);
    }
  }, [activeStorefront, selectedCity, focusStorefront]);

  // Toggle Street Walk Mode
  const toggleWalkMode = useCallback(() => {
    if (!selectedCity) return;
    setIsWalkMode((prev) => {
      const next = !prev;
      flyToCityStreet(selectedCity, next);
      return next;
    });
  }, [selectedCity, flyToCityStreet]);

  // Town Cinematic Tour Sweep
  const playCinematicFlyIn = useCallback(() => {
    if (!selectedCity) return;
    setIsCinematicPlaying(true);
    setIsWalkMode(false);

    // Phase 1: High Drone Overview
    targetCamPosRef.current = new THREE.Vector3(0, 52, -45);
    targetLookAtRef.current = new THREE.Vector3(0, 3, 30);

    // Phase 2: Sweep Down Boulevard
    setTimeout(() => {
      targetCamPosRef.current = new THREE.Vector3(-4, 12, 10);
      targetLookAtRef.current = new THREE.Vector3(0, 3, 38);
    }, 2200);

    // Phase 3: Settle at Street Level
    setTimeout(() => {
      targetCamPosRef.current = new THREE.Vector3(0, 24, -18);
      targetLookAtRef.current = new THREE.Vector3(0, 3, 38);
      setIsCinematicPlaying(false);
      import("canvas-confetti").then((m) => {
        m.default({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      });
    }, 4500);
  }, [selectedCity]);

  // Update physical environmental lighting
  const updateEnvironmentLighting = useCallback((night: boolean) => {
    if (!dirLightRef.current || !ambientLightRef.current || !sceneRef.current) return;

    if (selectedCityRef.current) {
      // In Town View: Day vs Night high-street lighting
      if (night) {
        dirLightRef.current.intensity = 0.45;
        dirLightRef.current.color.setHex(0x38bdf8);
        ambientLightRef.current.intensity = 0.35;
        ambientLightRef.current.color.setHex(0x0a101f);
        sceneRef.current.background = new THREE.Color(0x080d1a);
        sceneRef.current.fog = new THREE.Fog(0x050914, 45, 220);
        if (hemiLightRef.current) hemiLightRef.current.intensity = 0.2;
      } else {
        dirLightRef.current.intensity = 2.4;
        dirLightRef.current.color.setHex(0xfff7ed);
        ambientLightRef.current.intensity = 1.1;
        ambientLightRef.current.color.setHex(0xdbeafe);
        sceneRef.current.background = new THREE.Color(0x38bdf8);
        sceneRef.current.fog = new THREE.Fog(0xbae6fd, 55, 260);
        if (hemiLightRef.current) hemiLightRef.current.intensity = 0.75;
      }

      // Streetlamp illumination
      if (currentBazaarGroupRef.current) {
        currentBazaarGroupRef.current.traverse((child) => {
          if (child instanceof THREE.PointLight && child.name === "lamp_light") {
            child.intensity = night ? 2.0 : 0;
          }
          if (child instanceof THREE.Mesh && child.name === "lamp_bulb") {
            if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.emissiveIntensity = night ? 2.2 : 0.15;
            }
          }
        });
      }
    } else {
      // In 3D Earth Globe View: Deep cosmos background, no ground fog
      sceneRef.current.fog = null;
      sceneRef.current.background = night
        ? new THREE.Color(0x02040a)
        : new THREE.Color(0x030712);
      dirLightRef.current.intensity = night ? 1.8 : 2.6;
      dirLightRef.current.color.setHex(0xffffff);
      ambientLightRef.current.intensity = night ? 0.35 : 0.65;
      ambientLightRef.current.color.setHex(0x38bdf8);
      if (hemiLightRef.current) hemiLightRef.current.intensity = 0.4;
    }
  }, []);

  // Synchronize when selectedCity changes: Switch Globe vs Town Street
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isSceneReady) return;

    // Clean up town street & avatar simulations
    if (trafficRef.current) {
      trafficRef.current.dispose();
      trafficRef.current = null;
    }
    if (pedestriansRef.current) {
      pedestriansRef.current.dispose();
      pedestriansRef.current = null;
    }
    if (playerAvatarRef.current) {
      playerAvatarRef.current.dispose();
      scene.remove(playerAvatarRef.current.group);
      playerAvatarRef.current = null;
    }
    if (currentBazaarGroupRef.current) {
      scene.remove(currentBazaarGroupRef.current);
      currentBazaarGroupRef.current = null;
      hitBoxesRef.current = [];
      plotsRef.current = [];
    }

    if (selectedCity) {
      // Hide 3D Globe in Town view
      if (globeResultRef.current) {
        globeResultRef.current.group.visible = false;
      }

      try {
        console.log("[Spotlight 3D] Building Town High-Street for:", selectedCity.name);
        const { group: bazaarGroup, hitBoxes, traffic, pedestrians, plots } = buildBazaarStreet(
          selectedCity,
          storefronts
        );
        scene.add(bazaarGroup);
        currentBazaarGroupRef.current = bazaarGroup;
        trafficRef.current = traffic;
        pedestriansRef.current = pedestrians;
        hitBoxesRef.current = hitBoxes;
        plotsRef.current = plots;

        // Instantiate controllable 3D Player Avatar
        const playerAvatar = createPlayerAvatarSystem(-8.2, 0.1, 16, "@spotlight.bazaar");
        scene.add(playerAvatar.group);
        playerAvatarRef.current = playerAvatar;

        // STRICT CAMERA CLAMPING IN TOWN VIEW:
        // User CANNOT zoom out into empty space / see cut-off edges.
        // Maximum distance is clamped to 65 (high drone overview).
        if (controlsRef.current) {
          controlsRef.current.minDistance = 3.2;
          controlsRef.current.maxDistance = 65;
          controlsRef.current.maxPolarAngle = Math.PI / 2.05;
          controlsRef.current.target.set(0, 3, 35);
        }

        updateEnvironmentLighting(isNightRef.current);
        flyToCityStreet(selectedCity, isWalkModeRef.current);
      } catch (err) {
        console.error("[Spotlight 3D] Failed to build Town Street:", err);
      }
    } else {
      // 3D Earth Globe Mode: Restore full spherical orbit limits
      if (globeResultRef.current) {
        globeResultRef.current.group.visible = true;
      }

      if (controlsRef.current) {
        controlsRef.current.minDistance = 140;
        controlsRef.current.maxDistance = 380;
        controlsRef.current.maxPolarAngle = Math.PI;
        controlsRef.current.target.set(0, 0, 0);
      }

      updateEnvironmentLighting(isNightRef.current);
      resetCamera();
    }
  }, [selectedCity, storefronts, isSceneReady, flyToCityStreet, resetCamera, updateEnvironmentLighting]);

  // Toggle Day/Night Lighting
  const toggleLighting = useCallback(() => {
    setIsNight((prev) => {
      const next = !prev;
      updateEnvironmentLighting(next);
      return next;
    });
  }, [updateEnvironmentLighting]);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let isDisposed = false;
    let animId: number;

    // 1. Scene: Deep cosmic navy by default for 3D Globe
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x030712);

    // 2. Camera: Positioned to face India on Globe or in Town
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, aspect, 1, 2500);
    if (selectedCityRef.current) {
      camera.position.set(0, 24, -18);
    } else {
      camera.position.set(0, 42, 245);
    }
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    if (selectedCityRef.current) {
      controls.minDistance = 3.2;
      controls.maxDistance = 65;
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.target.set(0, 3, 35);
    } else {
      controls.minDistance = 140;
      controls.maxDistance = 380;
      controls.maxPolarAngle = Math.PI;
      controls.target.set(0, 0, 0);
    }
    controlsRef.current = controls;

    if (typeof window !== "undefined") {
      (window as any).__controls = controls;
      (window as any).__camera = camera;
    }

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.65);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.5);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(160, 180, 220);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 800;
    dirLight.shadow.camera.left = -200;
    dirLight.shadow.camera.right = 200;
    dirLight.shadow.camera.top = 200;
    dirLight.shadow.camera.bottom = -200;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // 6. Build 3D Earth Globe with India & Spherical City Beacons
    Promise.all([
      fetch("/data/india-land.json").then((r) => r.json()),
      fetch("/data/rivers.json").then((r) => r.json()),
    ])
      .then(([landData, riversData]) => {
        if (isDisposed) return;

        const globeResult = buildIndiaGlobe(
          landData,
          riversData,
          citiesRef.current,
          storefrontsRef.current
        );
        globeResult.group.visible = !selectedCityRef.current;
        scene.add(globeResult.group);
        globeResultRef.current = globeResult;

        setIsSceneReady(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to build 3D India Globe:", err);
        setLoading(false);
      });

    // 7. Raycasting: Globe City Pins & Town Storefronts
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (event: PointerEvent) => {
      downX = event.clientX;
      downY = event.clientY;
    };

    const handlePointerUp = (event: PointerEvent) => {
      const dragDist = Math.hypot(event.clientX - downX, event.clientY - downY);
      if (dragDist > 8) return;

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      // In Town View: Check Storefront hitboxes, Chai Stall, Cricket Pitch
      if (selectedCityRef.current && hitBoxesRef.current.length > 0) {
        const sfIntersects = raycaster.intersectObjects(hitBoxesRef.current, false);
        if (sfIntersects.length > 0) {
          const hit = sfIntersects[0].object as THREE.Mesh & {
            storefrontData?: BusinessStorefront;
          };

          if (hit.name === "landmark_chai_stall") {
            bazaarAudio.playChaiPour();
            setSpeedBoostUntil(Date.now() + 60000);
            setShowChaiModal(true);
            return;
          }

          if (hit.name === "landmark_cricket_pitch") {
            setShowCricketModal(true);
            return;
          }

          if (hit.storefrontData) {
            bazaarAudio.playStorefrontChime();
            setActiveDialogueStorefront(hit.storefrontData);
            if (onStorefrontSelectRef.current) {
              onStorefrontSelectRef.current(hit.storefrontData);
            }
            return;
          }

          if (hit.name && hit.name.includes("plot_")) {
            window.location.href = "/register";
            return;
          }
        }
      }

      // In Globe View: Check Spherical City Pins
      if (!selectedCityRef.current && globeResultRef.current) {
        const pinHitBoxes = globeResultRef.current.cityPins.map((p) => p.hitBox);
        const pinIntersects = raycaster.intersectObjects(pinHitBoxes, false);
        if (pinIntersects.length > 0) {
          const hit = pinIntersects[0].object as THREE.Mesh & { cityData?: City };
          if (hit.cityData && onCitySelectRef.current) {
            bazaarAudio.playStorefrontChime();
            onCitySelectRef.current(hit.cityData);
            return;
          }
        }
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);

    // 8. Keyboard WASD Listener for Avatar Walk
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = true;
      if (e.code === "KeyE" && nearbyStorefrontRef.current) {
        bazaarAudio.playStorefrontChime();
        setActiveDialogueStorefront(nearbyStorefrontRef.current);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // 9. Resize Listener
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 10. Animation Loop
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update Globe animations (pulsing city beacon rings, billboard rotation)
      if (!selectedCityRef.current && globeResultRef.current) {
        globeResultRef.current.update(delta, isNightRef.current, camera);
      }

      // Update Town Traffic & Pedestrians
      if (trafficRef.current) {
        trafficRef.current.update(delta);
      }
      if (pedestriansRef.current) {
        pedestriansRef.current.update(delta);
      }

      // Avatar Walk Physics & Camera Follow
      if (selectedCityRef.current && playerAvatarRef.current) {
        const keys = keysDownRef.current;
        const joy = joystickVecRef.current;
        let forward =
          keys["KeyW"] || keys["ArrowUp"] ? 1 : keys["KeyS"] || keys["ArrowDown"] ? -1 : 0;
        let strafe =
          keys["KeyD"] || keys["ArrowRight"] ? 1 : keys["KeyA"] || keys["ArrowLeft"] ? -1 : 0;

        if (joy.forward !== 0 || joy.strafe !== 0) {
          forward += joy.forward;
          strafe += joy.strafe;
        }

        const isShift = Boolean(keys["ShiftLeft"] || keys["ShiftRight"]);

        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();
        const cameraYaw = Math.atan2(dir.x, dir.z);

        const prevPos = playerAvatarRef.current.getPosition().clone();
        playerAvatarRef.current.update(delta, {
          forward,
          strafe,
          sprint: isShift,
          cameraYaw,
        });
        const newPos = playerAvatarRef.current.getPosition();

        if (isWalkModeRef.current) {
          const moveDelta = newPos.clone().sub(prevPos);
          camera.position.add(moveDelta);
          controls.target.add(moveDelta);
        }

        // Proximity detection for storefront dialogue trigger
        if (plotsRef.current.length > 0) {
          let closest: BusinessStorefront | null = null;
          let minDist = 7.5;
          for (const plot of plotsRef.current) {
            if (plot.storefrontData) {
              const dist = newPos.distanceTo(plot.badgePosition);
              if (dist < minDist) {
                minDist = dist;
                closest = plot.storefrontData;
              }
            }
          }
          setNearbyStorefront(closest);
        }
      }

      // Smooth Camera Tween
      if (targetCamPosRef.current && targetLookAtRef.current) {
        const factor = Math.min(delta * 3.5, 1);
        camera.position.lerp(targetCamPosRef.current, factor);
        controls.target.lerp(targetLookAtRef.current, factor);

        if (camera.position.distanceTo(targetCamPosRef.current) < 1.2) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      isDisposed = true;
      setIsSceneReady(false);
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      if (globeResultRef.current) {
        globeResultRef.current.dispose();
      }
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Autocomplete search filtering
  const q = (searchQuery || "").trim().toLowerCase();

  const searchResultsCities = q
    ? cities.filter((c) => Boolean(c?.name) && c.name.toLowerCase().includes(q))
    : [];

  const searchResultsShops = q
    ? storefronts.filter((s) => {
        const nameMatch = Boolean(s?.name) && s.name.toLowerCase().includes(q);
        const taglineMatch =
          Boolean(s?.tagline) && s.tagline!.toLowerCase().includes(q);
        const cityMatch =
          Boolean(s?.city_name) && s.city_name!.toLowerCase().includes(q);
        return nameMatch || taglineMatch || cityMatch;
      })
    : [];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#030712]"
    >
      <canvas
        ref={canvasRef}
        role="region"
        aria-label="Spotlight 3D Interactive India Globe and Living Bazaar Street"
        tabIndex={0}
        className="w-full h-full block cursor-grab active:cursor-grabbing touch-none focus:outline-none"
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030712] z-30 transition-opacity duration-500">
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin mb-3" />
          <p className="text-xs text-neutral-400 font-mono tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>INITIALIZING 3D INDIA GLOBE & LIVING STREETS...</span>
          </p>
        </div>
      )}

      {/* UNIFIED TOP BAR: Mascot + Back to Globe + Omnibox Search + View Modes & Actions */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Mascot Brand & Mode Badge / Return to Globe */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot.jpg"
              alt="Spotlight Mascot"
              className="w-6 h-6 rounded-lg object-cover border border-amber-500/40"
            />
            <span className="hidden sm:inline text-xs font-bold text-white tracking-wide">
              Spotlight <span className="text-amber-400">Bazaar</span>
            </span>
          </div>

          {selectedCity ? (
            isWalkMode ? (
              <button
                type="button"
                onClick={toggleWalkMode}
                className="px-3 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-2xl transition-all"
              >
                <span>← Stop walking</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCitySelect(null)}
                title="Return to 3D India Globe"
                className="px-3.5 py-1.5 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-amber-500/60 text-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-xl transition-all group"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
                <span>← Return to India Globe</span>
              </button>
            )
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-neutral-950/80 backdrop-blur-xl border border-neutral-800 text-xs font-semibold text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>3D Earth Globe</span>
            </div>
          )}
        </div>

        {/* Center: Omnibox Search Bar */}
        <div className="relative flex-1 max-w-md pointer-events-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              id="bazaar-search-input"
              name="bazaarSearch"
              aria-label="Search city, shop, or category"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search Nerqiva Studio, Guwahati, or services..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800/90 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 shadow-2xl transition-all"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {searchOpen && searchQuery.trim() && (
            <div className="absolute top-full mt-2 inset-x-0 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl p-2 max-h-72 overflow-y-auto no-scrollbar z-30 flex flex-col gap-1">
              {searchResultsCities.length > 0 && (
                <div className="mb-1">
                  <span className="text-[10px] font-mono text-neutral-500 px-2 py-0.5 uppercase tracking-wider block">
                    Cities
                  </span>
                  {searchResultsCities.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onCitySelect(c);
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-neutral-900 flex items-center justify-between text-xs text-white transition-colors"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-[11px] text-neutral-400">
                        {c.state}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResultsShops.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 px-2 py-0.5 uppercase tracking-wider block">
                    Storefronts
                  </span>
                  {searchResultsShops.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        const targetCity = cities.find(
                          (c) =>
                            Boolean(c?.name) &&
                            Boolean(s?.city_name) &&
                            c.name.toLowerCase() === s.city_name!.toLowerCase()
                        );
                        if (targetCity) {
                          onCitySelect(targetCity);
                        }
                        focusStorefront(s);
                        setActiveDialogueStorefront(s);
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-neutral-900 flex items-center justify-between text-xs transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white group-hover:text-amber-400 font-medium truncate">
                          {s.name}
                        </span>
                        {s.is_verified && (
                          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-amber-400 font-mono shrink-0 ml-2">
                        {s.starting_price || "Direct"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResultsCities.length === 0 &&
                searchResultsShops.length === 0 && (
                  <div className="py-4 text-center text-xs text-neutral-500">
                    No results for &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Right: View Modes + Sound + Day/Night + CTA */}
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          {/* View Mode Switcher */}
          <div className="hidden lg:flex items-center p-1 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 shadow-2xl gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (selectedCity) onCitySelect(null);
                onViewModeChange?.("3d");
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "3d" && !selectedCity
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              <span>3D Globe</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange?.("2d")}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "2d"
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Map</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange?.("grid")}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "grid"
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Directory</span>
            </button>
          </div>

          {/* Sound, Lighting & Recenter Controls */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                const muted = bazaarAudio.toggleMute();
                setIsSoundMuted(muted);
              }}
              title={isSoundMuted ? "Unmute Indian Bazaar Ambience" : "Mute Sound"}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              {isSoundMuted ? (
                <VolumeX className="w-4 h-4 text-neutral-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleLighting}
              title={isNight ? "Switch to Sunny Day" : "Switch to Indian Night"}
              className="px-2.5 py-1.5 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
            >
              {isNight ? (
                <>
                  <Moon className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline text-[11px] font-medium text-cyan-300">Night</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-[11px] font-medium text-amber-300">Day</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={resetCamera}
              title="Recenter Camera"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-neutral-300" />
            </button>
          </div>

          {/* Open a Shop CTA */}
          <a
            href={selectedCity ? `/register?city=${selectedCity.slug}` : "/register"}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-2xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Open a Shop</span>
          </a>
        </div>
      </div>

      {/* TOAST NOTIFICATION PILL */}
      {toastMessage && (
        <div className="absolute top-20 inset-x-0 z-40 flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-2xl flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* BOTTOM CENTER: Town Street Card / Globe Helper Card */}
      <div className="absolute bottom-3 sm:bottom-4 inset-x-4 z-20 flex flex-col items-center gap-2 pointer-events-none">
        {/* Nearby Storefront Proximity Trigger */}
        {nearbyStorefront && isWalkMode && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-3 px-4 py-2 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-amber-500/50 shadow-2xl pointer-events-auto">
            <span className="text-lg">🏪</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">
                {nearbyStorefront.name}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                Near storefront entrance · Press [E] or tap to talk
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveDialogueStorefront(nearbyStorefront);
                bazaarAudio.playStorefrontChime();
              }}
              className="ml-2 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-transform active:scale-95 shadow-md shadow-amber-500/20"
            >
              Talk to Owner
            </button>
          </div>
        )}

        {selectedCity ? (
          isWalkMode ? (
            /* First-Person / Avatar Walk Mode Bar */
            <div className="flex items-center gap-2 p-2 px-3 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl pointer-events-auto flex-wrap justify-center">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Walking {selectedCity.name}</span>
                {Date.now() < speedBoostUntil && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                    2x Pace
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowQuickTalkModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Quick Talk</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCricketModal(true)}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Cricket</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  bazaarAudio.playChaiPour();
                  setSpeedBoostUntil(Date.now() + 60000);
                  setShowChaiModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-amber-400 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Chai</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetShop = nearbyStorefront || activeStorefront || cityStorefronts[0] || storefronts[0];
                  if (targetShop) {
                    setCustomizingStorefront(targetShop);
                  } else {
                    showToast("No storefront available to paint");
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-amber-400 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>Paint</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    showToast("🔗 3D Bazaar Street link copied!");
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={toggleWalkMode}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white text-xs font-semibold transition-all border border-neutral-700"
              >
                Exit Walk
              </button>
            </div>
          ) : (
            /* City High Street Level Card */
            <div className="w-full max-w-lg p-3 sm:p-3.5 rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex flex-col gap-2.5 pointer-events-auto">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {selectedCity.name} High Street
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {cityStorefronts.length} verified businesses · Clear {isNight ? "night" : "day"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onCitySelect(null)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-amber-400 font-semibold transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Return to Globe</span>
                </button>
              </div>

              {/* Primary Action Row */}
              <div className="flex items-center gap-2">
                <a
                  href={`/register?city=${selectedCity.slug}`}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Open a Shop · Claim Plot</span>
                </a>

                <button
                  type="button"
                  onClick={toggleWalkMode}
                  className="py-2.5 px-3.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800"
                >
                  <Footprints className="w-4 h-4 text-neutral-400" />
                  <span>Walk (WASD)</span>
                </button>
              </div>

              {/* Secondary Actions Row */}
              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-neutral-800/80 text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowQuickTalkModal(true)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-colors border border-neutral-800 font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Talk</span>
                </button>

                <button
                  type="button"
                  onClick={playCinematicFlyIn}
                  disabled={isCinematicPlaying}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors border border-neutral-800 font-medium"
                >
                  <Rocket className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{isCinematicPlaying ? "Touring" : "Tour"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowShopsDrawer(!showShopsDrawer)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors border border-neutral-800 font-medium"
                >
                  <Eye className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Directory ({cityStorefronts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    bazaarAudio.playChaiPour();
                    setSpeedBoostUntil(Date.now() + 60000);
                    setShowChaiModal(true);
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-colors border border-neutral-800 font-medium"
                  title="Cutting Chai Stall (2x Speed Boost)"
                >
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCricketModal(true)}
                  className="py-1.5 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors border border-neutral-800 font-medium"
                  title="Community Cricket Pitch"
                >
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cricket</span>
                </button>
              </div>
            </div>
          )
        ) : (
          /* Globe Orbit Level Card */
          <div className="p-3 px-5 rounded-3xl bg-neutral-950/90 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex flex-col sm:flex-row items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-neutral-300 font-medium">
                Rotate 3D Earth Globe and tap any glowing beacon to enter its Living High Street
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href="/register"
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Claim Plot ₹0</span>
              </a>
            </div>
          </div>
        )}

        {/* Controls HUD Tooltip */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950/70 backdrop-blur-md border border-neutral-800/60 text-[10px] text-neutral-400 font-mono flex items-center gap-2 shadow-lg">
            <span>
              {selectedCity
                ? "WASD move · Drag look 360° · Scroll zoom (clamped) · [E] talk"
                : "Drag to rotate 3D Globe · Scroll zoom · Tap city beacon"}
            </span>
          </div>
          {speedBoostUntil > Date.now() && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold shadow-lg shadow-amber-500/20">
              <span>Chai speed boost active</span>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE VIRTUAL JOYSTICK */}
      {selectedCity && isWalkMode && (
        <div className="absolute bottom-28 left-6 z-30 pointer-events-auto">
          <VirtualJoystick
            onMove={(vec) => {
              joystickVecRef.current = vec;
            }}
          />
        </div>
      )}

      {/* CUTTING CHAI STALL MODAL */}
      <ChaiStallModal
        isOpen={showChaiModal}
        onClose={() => setShowChaiModal(false)}
        cityName={selectedCity?.name || "Bazaar"}
      />

      {/* COMMUNITY CRICKET MINI-GAME MODAL */}
      <CricketGameModal
        isOpen={showCricketModal}
        onClose={() => setShowCricketModal(false)}
        cityName={selectedCity?.name || "Bazaar"}
      />

      {/* STOREFRONT CUSTOMIZER MODAL */}
      {customizingStorefront && (
        <StorefrontCustomizerModal
          storefront={customizingStorefront}
          isOpen={Boolean(customizingStorefront)}
          onClose={() => setCustomizingStorefront(null)}
          onApply={(customs) => {
            const plot = plotsRef.current.find(
              (p) => p.storefrontData?.id === customizingStorefront.id
            );
            if (plot) {
              plot.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                  if (
                    child.material instanceof THREE.MeshStandardMaterial &&
                    child.material.color.getHex() !== 0x1f2937
                  ) {
                    child.material.color.set(customs.facadeColor);
                  }
                }
              });
            }
            import("canvas-confetti").then((m) => {
              m.default({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
            });
          }}
        />
      )}

      {/* QUICK SHOPS POPUP DRAWER */}
      {selectedCity && showShopsDrawer && cityStorefronts.length > 0 && (
        <div className="absolute top-20 right-4 z-20 w-80 max-h-[60vh] rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 p-3 shadow-2xl flex flex-col gap-2 overflow-y-auto no-scrollbar pointer-events-auto">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="text-xs font-semibold text-white">
              Shops in {selectedCity.name}
            </span>
            <button
              type="button"
              onClick={() => setShowShopsDrawer(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {cityStorefronts.map((shop) => (
              <button
                key={shop.id}
                type="button"
                onClick={() => {
                  focusStorefront(shop);
                  setActiveDialogueStorefront(shop);
                  setShowShopsDrawer(false);
                }}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 hover:border-amber-500/50 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-white group-hover:text-amber-400 truncate">
                    {shop.name}
                  </span>
                  {shop.is_verified && (
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[11px] font-semibold text-amber-400 font-mono">
                    {shop.starting_price || "Direct"}
                  </span>
                  <ChevronRight className="w-3 h-3 text-neutral-500 group-hover:text-white" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* QUICK TALK SPEECH BUBBLE MODAL */}
      <QuickTalkModal
        isOpen={showQuickTalkModal}
        onClose={() => setShowQuickTalkModal(false)}
        onSelectPhrase={(phrase) => {
          playerAvatarRef.current?.say(phrase);
          bazaarAudio.playStorefrontChime();
        }}
      />

      {/* STOREFRONT INTERACTIVE DIALOGUE MODAL */}
      <StorefrontDialogueModal
        storefront={activeDialogueStorefront}
        isOpen={Boolean(activeDialogueStorefront)}
        onClose={() => setActiveDialogueStorefront(null)}
        onOpenFullProfile={(shop) => {
          if (onStorefrontSelectRef.current) {
            onStorefrontSelectRef.current(shop);
          }
        }}
      />
    </div>
  );
}
