"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { City, BusinessStorefront } from "@/types";
import { buildIndiaLandMeshes, buildRiversMeshes } from "./indiaGeometry";
import { buildCityPins, CityPinObject } from "./cityPins";
import { buildBazaarStreet } from "./bazaarStreet";
import { TrafficSystem } from "./trafficSystem";
import { PedestrianSystem } from "./pedestrianSystem";
import { StorefrontMeshResult } from "./cartoonStorefront";
import { toWorld } from "./projection";
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
} from "lucide-react";
import { VirtualJoystick } from "./VirtualJoystick";
import { ChaiStallModal } from "./ChaiStallModal";
import { CricketGameModal } from "./CricketGameModal";
import { StorefrontCustomizerModal } from "./StorefrontCustomizerModal";
import { bazaarAudio } from "@/lib/audio/bazaarAudio";

interface ThreeMapCanvasProps {
  cities: City[];
  storefronts: BusinessStorefront[];
  selectedCity: City | null;
  activeStorefront?: BusinessStorefront | null;
  onCitySelect: (city: City | null) => void;
  onStorefrontSelect?: (storefront: BusinessStorefront) => void;
}

export function ThreeMapCanvas({
  cities,
  storefronts,
  selectedCity,
  activeStorefront,
  onCitySelect,
  onStorefrontSelect,
}: ThreeMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [isNight, setIsNight] = useState(false); // Default to radiant daylight like India Again
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

  const speedBoostUntilRef = useRef(0);
  speedBoostUntilRef.current = speedBoostUntil;

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
  const cityPinsRef = useRef<CityPinObject[]>([]);
  const pinsGroupRef = useRef<THREE.Group | null>(null);
  const currentBazaarGroupRef = useRef<THREE.Group | null>(null);
  const trafficRef = useRef<TrafficSystem | null>(null);
  const pedestriansRef = useRef<PedestrianSystem | null>(null);
  const hitBoxesRef = useRef<THREE.Mesh[]>([]);
  const plotsRef = useRef<StorefrontMeshResult[]>([]);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const oceanMeshRef = useRef<THREE.Mesh | null>(null);

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

  // Smooth Camera FlyTo: Drone Street View vs National Orbit
  const flyToCityStreet = useCallback((city: City, walk: boolean = false) => {
    const [x, z] = toWorld(city.lon, city.lat);
    const streetBaseY = 6.2;
    if (walk) {
      // First-person street level on sidewalk
      targetCamPosRef.current = new THREE.Vector3(x - 11, streetBaseY + 1.8, z + 12);
      targetLookAtRef.current = new THREE.Vector3(x - 11, streetBaseY + 1.8, z + 65);
    } else {
      // Atmospheric drone high-street view: elevated to cleanly look down the central boulevard
      targetCamPosRef.current = new THREE.Vector3(x, streetBaseY + 22, z - 24);
      targetLookAtRef.current = new THREE.Vector3(x, streetBaseY + 2, z + 38);
    }
  }, []);

  const resetCamera = useCallback(() => {
    targetCamPosRef.current = new THREE.Vector3(0, 1380, 780);
    targetLookAtRef.current = new THREE.Vector3(0, 0, 20);
    setIsWalkMode(false);
  }, []);

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

  // Auto-focus storefront when passed via prop (e.g. from deep-link ?shop=slug)
  useEffect(() => {
    if (activeStorefront && selectedCity && plotsRef.current.length > 0) {
      focusStorefront(activeStorefront);
    }
  }, [activeStorefront, selectedCity, focusStorefront]);

  // Toggle First-Person Street Walk Mode
  const toggleWalkMode = useCallback(() => {
    if (!selectedCity) return;
    setIsWalkMode((prev) => {
      const next = !prev;
      flyToCityStreet(selectedCity, next);
      return next;
    });
  }, [selectedCity, flyToCityStreet]);

  // Space-to-Street Cinematic 10-Second Fly-In Sweep (Inspired by India Again)
  const playCinematicFlyIn = useCallback(() => {
    if (!selectedCity) return;
    setIsCinematicPlaying(true);
    setIsWalkMode(false);

    const [x, z] = toWorld(selectedCity.lon, selectedCity.lat);
    const streetBaseY = 6.2;

    // Phase 1: High Orbit over India (0s)
    targetCamPosRef.current = new THREE.Vector3(x * 0.25, 950, 480);
    targetLookAtRef.current = new THREE.Vector3(x * 0.2, 0, 0);

    // Phase 2: Hypersonic dive into cloud layer above city (1.8s)
    setTimeout(() => {
      targetCamPosRef.current = new THREE.Vector3(x, streetBaseY + 60, z - 95);
      targetLookAtRef.current = new THREE.Vector3(x, streetBaseY + 8, z + 25);
    }, 1800);

    // Phase 3: High-speed street sweep past moving traffic (3.8s)
    setTimeout(() => {
      targetCamPosRef.current = new THREE.Vector3(x, streetBaseY + 22, z - 24);
      targetLookAtRef.current = new THREE.Vector3(x, streetBaseY + 2, z + 38);
    }, 3800);

    // Phase 4: Focus on first business plot and fire celebration confetti (6.5s)
    setTimeout(() => {
      const firstShop = cityStorefronts[0];
      if (firstShop) {
        focusStorefront(firstShop);
      }
      setIsCinematicPlaying(false);
      import("canvas-confetti").then((m) => {
        m.default({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      });
    }, 6500);
  }, [selectedCity, cityStorefronts, focusStorefront]);

  // Update physical environmental lighting & streetlamps (Genuine Indian Day vs Night simulation)
  const updateEnvironmentLighting = useCallback((night: boolean) => {
    if (dirLightRef.current && ambientLightRef.current && sceneRef.current) {
      if (night) {
        // Night Mode: Atmospheric deep Indian midnight, warm streetlamps, cyan moonlight
        dirLightRef.current.intensity = 0.35;
        dirLightRef.current.color.setHex(0x38bdf8);
        ambientLightRef.current.intensity = 0.25;
        ambientLightRef.current.color.setHex(0x0a101f);
        sceneRef.current.background = new THREE.Color(0x080d1a);
        if (sceneRef.current.fog) {
          (sceneRef.current.fog as THREE.FogExp2).color.setHex(0x050914);
        }
        if (oceanMeshRef.current) {
          (oceanMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0x040812);
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.intensity = 0.15;
        }
      } else {
        // Day Mode: Warm Indian morning sun, radiant sky inspired by India Again
        dirLightRef.current.intensity = 2.4;
        dirLightRef.current.color.setHex(0xfff7ed);
        ambientLightRef.current.intensity = 1.05;
        ambientLightRef.current.color.setHex(0xdbeafe);
        sceneRef.current.background = new THREE.Color(0x38bdf8);
        if (sceneRef.current.fog) {
          (sceneRef.current.fog as THREE.FogExp2).color.setHex(0xbae6fd);
        }
        if (oceanMeshRef.current) {
          (oceanMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0x0f4068);
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.intensity = 0.75;
        }
      }
    }

    // Toggle warm tungsten streetlamp illumination on high street
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
  }, []);

  // Synchronize when selectedCity changes or scene becomes ready: Spawn / Remove 3D Bazaar Street
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isSceneReady) return;

    // Clean up existing bazaar street & traffic simulations
    if (trafficRef.current) {
      trafficRef.current.dispose();
      trafficRef.current = null;
    }
    if (pedestriansRef.current) {
      pedestriansRef.current.dispose();
      pedestriansRef.current = null;
    }
    if (currentBazaarGroupRef.current) {
      scene.remove(currentBazaarGroupRef.current);
      currentBazaarGroupRef.current = null;
      hitBoxesRef.current = [];
      plotsRef.current = [];
    }

    // Hide macro city pins when viewing high street so beacons don't block the town
    if (pinsGroupRef.current) {
      pinsGroupRef.current.visible = !selectedCity;
    }

    if (selectedCity) {
      try {
        console.log("[Spotlight 3D] Building Bazaar Street for:", selectedCity.name);
        const { group: bazaarGroup, hitBoxes, traffic, pedestrians, plots } = buildBazaarStreet(
          selectedCity,
          storefronts
        );
        console.log("[Spotlight 3D] Bazaar Street built successfully with", plots.length, "plots");
        scene.add(bazaarGroup);
        currentBazaarGroupRef.current = bazaarGroup;
        trafficRef.current = traffic;
        pedestriansRef.current = pedestrians;
        hitBoxesRef.current = hitBoxes;
        plotsRef.current = plots;

        updateEnvironmentLighting(isNightRef.current);
        flyToCityStreet(selectedCity, isWalkModeRef.current);
      } catch (err) {
        console.error("[Spotlight 3D] Failed to build Bazaar Street:", err);
      }
    } else {
      resetCamera();
    }
  }, [selectedCity, storefronts, isSceneReady, flyToCityStreet, resetCamera, updateEnvironmentLighting]);

  // Synchronize City Hotspot Pins on national map when storefronts or active status changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isSceneReady || selectedCity) return;

    if (pinsGroupRef.current) {
      scene.remove(pinsGroupRef.current);
      pinsGroupRef.current = null;
    }

    const { group: pinsGroup, cityPins } = buildCityPins(cities, storefronts);
    pinsGroup.visible = true;
    scene.add(pinsGroup);
    pinsGroupRef.current = pinsGroup;
    cityPinsRef.current = cityPins;
  }, [storefronts, selectedCity, isSceneReady, cities]);

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

    // 1. Scene: Atmospheric sunny sky horizon (India Again aesthetic)
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.00035);

    // 2. Camera: Position at selected city if deep-linked, or national orbit
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, aspect, 2, 4000);
    if (selectedCityRef.current) {
      const [initX, initZ] = toWorld(selectedCityRef.current.lon, selectedCityRef.current.lat);
      camera.position.set(initX, 28.2, initZ - 24);
    } else {
      camera.position.set(0, 1380, 780);
    }
    cameraRef.current = camera;

    if (typeof window !== "undefined") {
      (window as any).__scene = scene;
      (window as any).__camera = camera;
    }

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
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 6;
    controls.maxDistance = 3000;
    if (selectedCityRef.current) {
      const [initX, initZ] = toWorld(selectedCityRef.current.lon, selectedCityRef.current.lat);
      controls.target.set(initX, 6, initZ + 38);
    } else {
      controls.target.set(0, 0, 20);
    }
    controlsRef.current = controls;

    if (typeof window !== "undefined") {
      (window as any).__controls = controls;
    }

    // 5. Lights (Calibrated for warm Indian daylight radiant illumination)
    const ambientLight = new THREE.AmbientLight(0xbae6fd, 0.95);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x365314, 0.65);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    dirLight.position.set(220, 500, 240);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 100;
    dirLight.shadow.camera.far = 1200;
    dirLight.shadow.camera.left = -500;
    dirLight.shadow.camera.right = 500;
    dirLight.shadow.camera.top = 500;
    dirLight.shadow.camera.bottom = -500;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // 6. Deep Ocean Floor Mesh (Rich Marine Blue inspired by India Again)
    const oceanGeo = new THREE.PlaneGeometry(3500, 3500);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0f4068,
      roughness: 0.35,
      metalness: 0.4,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.5;
    ocean.receiveShadow = true;
    scene.add(ocean);
    oceanMeshRef.current = ocean;

    // 7. Load India Land & Rivers Data
    Promise.all([
      fetch("/data/india-land.json").then((r) => r.json()),
      fetch("/data/rivers.json").then((r) => r.json()),
    ])
      .then(([landData, riversData]) => {
        if (isDisposed) return;

        // Build Land Meshes
        const landGroup = buildIndiaLandMeshes(landData);
        scene.add(landGroup);

        // Build Rivers Meshes
        const riversGroup = buildRiversMeshes(riversData);
        scene.add(riversGroup);

        // Build City Hotspots (hidden if already in a city street)
        const { group: pinsGroup, cityPins } = buildCityPins(citiesRef.current, storefrontsRef.current);
        pinsGroup.visible = !selectedCityRef.current;
        scene.add(pinsGroup);
        pinsGroupRef.current = pinsGroup;
        cityPinsRef.current = cityPins;

        setIsSceneReady(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Spotlight 3D map data:", err);
        setLoading(false);
      });

    // 8. Raycasting for City Taps & 3D Storefront Clicks (Separates drag from tap)
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

      // Check Storefront hits first (direct check against invisible hit boxes)
      if (hitBoxesRef.current.length > 0) {
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

          if (hit.storefrontData && onStorefrontSelectRef.current) {
            bazaarAudio.playStorefrontChime();
            onStorefrontSelectRef.current(hit.storefrontData);
            return;
          }

          if (hit.name && hit.name.includes("plot_")) {
            // Free plot clicked -> take to registration
            window.location.href = "/register";
            return;
          }
        }
      }

      // Check City Pin hits
      if (cityPinsRef.current.length > 0) {
        const pinIntersects = raycaster.intersectObjects(cityPinsRef.current, true);
        if (pinIntersects.length > 0) {
          let obj: THREE.Object3D | null = pinIntersects[0].object;
          while (obj && !("cityData" in obj) && obj.parent) {
            obj = obj.parent;
          }
          if (obj && "cityData" in obj) {
            const pinObj = obj as unknown as CityPinObject;
            if (pinObj?.cityData && onCitySelectRef.current) {
              onCitySelectRef.current(pinObj.cityData);
              return;
            }
          }
        }
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);

    // 9. Keyboard WASD Listener for Street Walk
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // 10. Resize Listener
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 11. Animation Loop with Traffic & Pedestrian Updates
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update Living Traffic Simulation (Moving Autos, Scooters, Cars)
      if (trafficRef.current) {
        trafficRef.current.update(delta);
      }

      // Update Living Pedestrians Simulation (Walking Citizens & Shoppers)
      if (pedestriansRef.current) {
        pedestriansRef.current.update(delta);
      }

      // WASD Walking Physics when in street view
      if (selectedCityRef.current) {
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

        if (forward !== 0 || strafe !== 0) {
          const isShift = keys["ShiftLeft"] || keys["ShiftRight"];
          const isBoosted = Date.now() < speedBoostUntilRef.current;
          const speed = (isShift ? 24 : 12) * (isBoosted ? 2.0 : 1.0) * delta;

          // Camera forward vector projected on horizontal plane
          const dir = new THREE.Vector3();
          camera.getWorldDirection(dir);
          dir.y = 0;
          dir.normalize();

          // Camera right vector
          const right = new THREE.Vector3();
          right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

          // Move camera & controls target together
          const moveVec = new THREE.Vector3()
            .addScaledVector(dir, forward * speed)
            .addScaledVector(right, strafe * speed);

          camera.position.add(moveVec);
          controls.target.add(moveVec);
        }
      }

      // Gently pulse glowing golden city discs on macro India map (inspired by India Again bubbles)
      if (!selectedCityRef.current && cityPinsRef.current.length > 0) {
        const pulse = 1 + Math.sin(now * 0.0035) * 0.12;
        cityPinsRef.current.forEach((pin) => {
          const disc = pin.children[0];
          if (disc) {
            disc.scale.set(pulse, pulse, 1);
          }
        });
      }

      // Smooth Camera Interpolation (flyTo)
      if (targetCamPosRef.current && targetLookAtRef.current) {
        const factor = Math.min(delta * 3.5, 1);
        camera.position.lerp(targetCamPosRef.current, factor);
        controls.target.lerp(targetLookAtRef.current, factor);

        // Settle when close enough
        if (camera.position.distanceTo(targetCamPosRef.current) < 1.5) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      isDisposed = true;
      setIsSceneReady(false);
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Autocomplete search filtering safely guarded against missing fields
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

  // Mobile directional touch walk triggers
  const handleMobileWalk = (fwd: number, str: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !selectedCity) return;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVec = new THREE.Vector3()
      .addScaledVector(dir, fwd * 4)
      .addScaledVector(right, str * 4);

    camera.position.add(moveVec);
    controls.target.add(moveVec);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#38bdf8]"
    >
      <canvas
        ref={canvasRef}
        role="region"
        aria-label="Spotlight 3D Interactive India Business Map"
        tabIndex={0}
        className="w-full h-full block cursor-grab active:cursor-grabbing touch-none focus:outline-none"
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e2439] z-20 transition-opacity duration-500">
          <div className="w-12 h-12 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin mb-3" />
          <p className="text-xs text-neutral-400 font-mono tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>INITIALIZING 3D INDIA TERRAIN & LIVING STREETS...</span>
          </p>
        </div>
      )}

      {/* TOP BAR: Back Button + Omnibox Search + Day/Night Toggle */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Return to India Orbit button when city is open */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {selectedCity ? (
            <button
              type="button"
              onClick={() => onCitySelect(null)}
              className="px-3.5 py-2 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800/90 text-white text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-xl transition-all group focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
              <span>See all of India</span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-neutral-950/80 backdrop-blur-xl border border-neutral-800 text-xs font-semibold text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>India 3D Open Street</span>
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
              placeholder="Search city, shop, or category... (e.g. Guwahati, Studio Prism)"
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800/90 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/80 shadow-2xl transition-all"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {searchOpen && searchQuery.trim() && (
            <div className="absolute top-full mt-2 inset-x-0 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl p-2 max-h-72 overflow-y-auto no-scrollbar z-30 flex flex-col gap-1">
              {/* City Matches */}
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

              {/* Shop Matches */}
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
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-neutral-900 flex items-center justify-between text-xs transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white group-hover:text-rose-400 font-medium truncate">
                          {s.name}
                        </span>
                        {s.is_verified && (
                          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-amber-400 font-mono shrink-0 ml-2">
                        {s.starting_price || "Direct WhatsApp"}
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

        {/* Right: Day/Night Mode & Full India Reset */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800/90 shadow-2xl">
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
              title={
                isNight ? "Switch to Sunny Day" : "Switch to Indian Night"
              }
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
              title="Reset to Full India View"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-neutral-300" />
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM CENTER: Town Card & Walk Mode Bar */}
      <div className="absolute bottom-3 sm:bottom-4 inset-x-4 z-20 flex flex-col items-center gap-2 pointer-events-none">
        {selectedCity ? (
          isWalkMode ? (
            /* First-Person Walk Mode Compact Floating HUD */
            <div className="flex items-center gap-3 p-2 px-4 rounded-2xl bg-neutral-950/90 backdrop-blur-2xl border border-neutral-800 shadow-2xl pointer-events-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <span>Walking {selectedCity.name} High Street</span>
                {Date.now() < speedBoostUntil && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                    2x Pace
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={toggleWalkMode}
                className="ml-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white text-xs font-semibold transition-all border border-neutral-700"
              >
                Exit Walk
              </button>
            </div>
          ) : (
            /* City Street Level Card (Modeled after India Again town view) */
            <div className="w-full max-w-lg p-3 sm:p-3.5 rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex flex-col gap-2.5 pointer-events-auto">
              {/* Top Info Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white tracking-tight">
                        {selectedCity.name} High Street
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400">
                      {cityStorefronts.length} verified businesses · Clear {isNight ? "night" : "day"}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 font-medium">
                  <span>{isNight ? "Night Mode" : "Day Mode"}</span>
                </div>
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
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      alert("3D Bazaar Street link copied!");
                    }
                  }}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors border border-neutral-800 font-medium"
                >
                  <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetShop = activeStorefront || cityStorefronts[0];
                    if (targetShop) {
                      setCustomizingStorefront(targetShop);
                    }
                  }}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-colors border border-neutral-800 font-medium"
                >
                  <Paintbrush className="w-3.5 h-3.5 text-amber-400" />
                  <span>Paint</span>
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
          /* National Orbit Level Card (Modeled after India Again macro view) */
          <div className="p-3 px-5 rounded-3xl bg-neutral-950/90 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex flex-col sm:flex-row items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-neutral-300 font-medium">
                Tap any glowing amber hub to explore its Living 3D High Street
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

        {/* Controls HUD Tooltip & Speed Boost Indicator */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950/70 backdrop-blur-md border border-neutral-800/60 text-[10px] text-neutral-400 font-mono flex items-center gap-2 shadow-lg">
            <span>WASD move · Drag look 360° · Scroll zoom · Shift faster</span>
          </div>
          {speedBoostUntil > Date.now() && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold shadow-lg shadow-amber-500/20">
              <span>Chai speed boost active</span>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE VIRTUAL JOYSTICK (Smooth analog thumbstick in Walk Mode) */}
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
                  setShowShopsDrawer(false);
                }}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 hover:border-rose-500/50 flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-white group-hover:text-rose-400 truncate">
                    {shop.name}
                  </span>
                  {shop.is_verified && (
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[11px] font-semibold text-amber-400 font-mono">
                    {shop.starting_price || "WhatsApp"}
                  </span>
                  <ChevronRight className="w-3 h-3 text-neutral-500 group-hover:text-white" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
