"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { City, BusinessStorefront } from "@/types";
import { buildSkyEnvironment, SkyEnvironmentResult } from "./skyEnvironment";
import {
  buildIndiaNationalMap,
  NationalMapBuildResult,
} from "./indiaNationalMap";
import { buildUniversalCity } from "./universalCityModel";
import { GUWAHATI_COLONIES, ColonyDefinition } from "./guwahatiCityModel";
import { getCityGeoConfig } from "@/lib/geo/cityGeoRegistry";
import { fetchCityRoadsGeoJson } from "@/lib/geo/dynamicRoadLoader";
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
  ChevronRight,
  Plus,
  Volume2,
  VolumeX,
  Share2,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { VirtualJoystick } from "./VirtualJoystick";
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
  onToggleOsmMap?: () => void;
}

export function ThreeMapCanvas({
  cities,
  storefronts,
  selectedCity,
  activeStorefront,
  onCitySelect,
  onStorefrontSelect,
  onToggleOsmMap,
}: ThreeMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [isNight, setIsNight] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [isWalkMode, setIsWalkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(bazaarAudio.getMuted());
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
  const skyEnvRef = useRef<SkyEnvironmentResult | null>(null);
  const nationalMapRef = useRef<NationalMapBuildResult | null>(null);
  const currentBazaarGroupRef = useRef<THREE.Group | null>(null);
  const trafficRef = useRef<TrafficSystem | null>(null);
  const pedestriansRef = useRef<PedestrianSystem | null>(null);
  const hitBoxesRef = useRef<THREE.Mesh[]>([]);
  const plotsRef = useRef<StorefrontMeshResult[]>([]);

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

  // Smooth Camera: Town High-Street View vs National 3D India Isometric Perspective
  const flyToCityStreet = useCallback((city: City, walk: boolean = false) => {
    const geoConfig = getCityGeoConfig(city?.slug || city?.name);

    if (walk) {
      if (playerAvatarRef.current) {
        const p = playerAvatarRef.current.getPosition();
        targetCamPosRef.current = new THREE.Vector3(p.x - 7, p.y + 4.0, p.z + 8.5);
        targetLookAtRef.current = new THREE.Vector3(p.x, p.y + 1.8, p.z);
      } else {
        targetCamPosRef.current = new THREE.Vector3(0, 4.4, 15);
        targetLookAtRef.current = new THREE.Vector3(0, 1.8, 5);
      }
    } else {
      // Dynamic High-Street View: Frame the business plot and Free Plot at street level (India Again style)
      if (plotsRef.current.length > 0) {
        const mainPlot = plotsRef.current[0];
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(mainPlot.mesh.quaternion);
        targetCamPosRef.current = mainPlot.mesh.position
          .clone()
          .add(forward.clone().multiplyScalar(22))
          .add(new THREE.Vector3(-14, 13.5, 0));
        targetLookAtRef.current = mainPlot.mesh.position
          .clone()
          .add(new THREE.Vector3(0, 2.2, 0));
      } else {
        targetCamPosRef.current = new THREE.Vector3(...geoConfig.droneCamera.pos);
        targetLookAtRef.current = new THREE.Vector3(...geoConfig.droneCamera.target);
      }
    }
  }, []);

  const resetCamera = useCallback(() => {
    if (selectedCityRef.current) {
      flyToCityStreet(selectedCityRef.current, isWalkModeRef.current);
    } else {
      // Perfectly frame 3D India with visible Sun/Moon in the sky above
      targetCamPosRef.current = new THREE.Vector3(0, 840, 720);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 30);
      setIsWalkMode(false);
    }
  }, [flyToCityStreet]);

  // Focus a specific colony or Postal PIN Code location
  const focusColony = useCallback(
    (colony: ColonyDefinition) => {
      const guwahatiCity = cities.find(
        (c) => c.slug === "guwahati" || c.name.toLowerCase() === "guwahati"
      );
      if (
        guwahatiCity &&
        (!selectedCityRef.current || selectedCityRef.current.slug !== "guwahati")
      ) {
        onCitySelect(guwahatiCity);
      }

      targetCamPosRef.current = new THREE.Vector3(colony.x - 12, 32, colony.z + 48);
      targetLookAtRef.current = new THREE.Vector3(colony.x, 2, colony.z);
      showToast(`📍 Focused on ${colony.name} (PIN ${colony.pincode})`);
    },
    [cities, onCitySelect, showToast]
  );

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
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(plot.mesh.quaternion);

        targetCamPosRef.current = worldPos
          .clone()
          .add(forward.clone().multiplyScalar(18))
          .add(new THREE.Vector3(0, 4.8, 0));
        targetLookAtRef.current = worldPos
          .clone()
          .add(new THREE.Vector3(0, 2.5, 0));
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


  // Update physical environmental lighting & connected Sun/Moon
  const updateEnvironmentLighting = useCallback((night: boolean) => {
    if (skyEnvRef.current) {
      skyEnvRef.current.updateLighting(night, Boolean(selectedCityRef.current));
    }

    // Streetlamp illumination in Town view
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

  // Synchronize when selectedCity changes: Switch National 3D Map vs Town Street
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isSceneReady) return;

    // Clean up existing town street & simulations
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

    let isCancelled = false;

    if (selectedCity) {
      // Hide National Map in Town view
      if (nationalMapRef.current) {
        nationalMapRef.current.group.visible = false;
      }

      const loadCityEnvironment = async () => {
        try {
          console.log("[Spotlight 3D] Dynamically building City 3D Map for:", selectedCity.name);
          const cityGeo = getCityGeoConfig(selectedCity.slug || selectedCity.name);

          let dynamicRoads = undefined;
          try {
            const loadedRoads = await fetchCityRoadsGeoJson(
              selectedCity.slug || selectedCity.name,
              cityGeo.anchor
            );
            if (loadedRoads && loadedRoads.length > 0) {
              dynamicRoads = loadedRoads;
              console.log(
                `[Spotlight 3D] Loaded ${loadedRoads.length} dynamic OSM road segments for ${selectedCity.name}`
              );
            }
          } catch (geoErr) {
            console.warn(`[Spotlight 3D] Dynamic road fetch fallback:`, geoErr);
          }

          if (isCancelled) return;

          const { group: bazaarGroup, hitBoxes, traffic, pedestrians, plots } = buildUniversalCity(
            selectedCity,
            storefronts,
            dynamicRoads
          );

          if (isCancelled) return;

          scene.add(bazaarGroup);
          currentBazaarGroupRef.current = bazaarGroup;
          trafficRef.current = traffic;
          pedestriansRef.current = pedestrians;
          hitBoxesRef.current = hitBoxes;
          plotsRef.current = plots;

          // Instantiate controllable 3D Player Avatar right in front of primary business on asphalt road
          let avatarSpawnX = 0;
          let avatarSpawnZ = 0;
          if (plots.length > 0 && plots[0]) {
            const mainPlot = plots[0];
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(mainPlot.mesh.quaternion);
            avatarSpawnX = mainPlot.mesh.position.x + forward.x * 7.5;
            avatarSpawnZ = mainPlot.mesh.position.z + forward.z * 7.5;
          } else {
            const isGuwahati = selectedCity.slug === "guwahati" || selectedCity.name.toLowerCase() === "guwahati";
            avatarSpawnX = isGuwahati ? 100 : -8.2;
            avatarSpawnZ = isGuwahati ? 84 : 16;
          }

          const playerAvatar = createPlayerAvatarSystem(
            avatarSpawnX,
            0.44,
            avatarSpawnZ,
            "@spotlight.bazaar"
          );
          scene.add(playerAvatar.group);
          playerAvatarRef.current = playerAvatar;

          // OPTIMAL ORBIT & STREET VIEWPORT CONTROLS:
          // Clamped bounds to guarantee the street stays in full, crisp view
          if (controlsRef.current) {
            controlsRef.current.minDistance = 6;
            controlsRef.current.maxDistance = 580;
            controlsRef.current.minPolarAngle = Math.PI / 12;
            controlsRef.current.maxPolarAngle = Math.PI / 2.12;
            if (plots.length > 0 && plots[0]) {
              controlsRef.current.target.set(plots[0].mesh.position.x, 2.2, plots[0].mesh.position.z);
            } else {
              const targetCoords = cityGeo.droneCamera.target;
              controlsRef.current.target.set(targetCoords[0], targetCoords[1], targetCoords[2]);
            }
            controlsRef.current.screenSpacePanning = false;
          }

          updateEnvironmentLighting(isNightRef.current);
          flyToCityStreet(selectedCity, isWalkModeRef.current);
        } catch (err) {
          console.error("[Spotlight 3D] Failed to build Town Street:", err);
        }
      };

      loadCityEnvironment();
    } else {
      // 3D India National Map Mode: Restore national orbit limits
      if (nationalMapRef.current) {
        nationalMapRef.current.group.visible = true;
      }

      if (controlsRef.current) {
        controlsRef.current.minDistance = 35;
        controlsRef.current.maxDistance = 2400;
        controlsRef.current.maxPolarAngle = Math.PI / 2.05;
        controlsRef.current.target.set(0, 0, 30);
        controlsRef.current.enablePan = true;
        controlsRef.current.screenSpacePanning = false;
      }

      updateEnvironmentLighting(isNightRef.current);
      resetCamera();
    }

    return () => {
      isCancelled = true;
    };
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

    // 1. Scene: Radiant sunny day sky by default
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.Fog(0xbae6fd, 1600, 3800);

    // 2. Camera: Positioned to frame India prominently at initial load
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, aspect, 2, 8000);
    const currentGeoConfig = selectedCityRef.current
      ? getCityGeoConfig(selectedCityRef.current.slug || selectedCityRef.current.name)
      : null;

    if (currentGeoConfig) {
      camera.position.set(...currentGeoConfig.droneCamera.pos);
    } else {
      // Heroic isometric 3D framing of India with sky and Sun above
      camera.position.set(0, 840, 720);
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

    // 4. Orbit Controls (Unlocked Google Earth style spatial navigation)
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = true;

    if (selectedCityRef.current && currentGeoConfig) {
      controls.minDistance = 15;
      controls.maxDistance = 580;
      controls.minPolarAngle = Math.PI / 8;
      controls.maxPolarAngle = Math.PI / 2.18;
      controls.target.set(...currentGeoConfig.droneCamera.target);
      controls.screenSpacePanning = false;
    } else {
      // National Map: Unlocked deep zoom down to regional level
      controls.minDistance = 35;
      controls.maxDistance = 1800;
      controls.maxPolarAngle = Math.PI / 2.1;
      controls.target.set(0, 0, 30);
    }

    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
    controlsRef.current = controls;

    if (typeof window !== "undefined") {
      (window as any).__controls = controls;
      (window as any).__camera = camera;
    }

    // 5. Build Sky & Ocean Environment with 3D Sun and Moon
    const skyEnv = buildSkyEnvironment(scene);
    skyEnvRef.current = skyEnv;

    // 6. Build 3D India National Relief Map
    Promise.all([
      fetch("/data/india-land.json").then((r) => r.json()),
      fetch("/data/rivers.json").then((r) => r.json()),
    ])
      .then(([landData, riversData]) => {
        if (isDisposed) return;

        const nationalMap = buildIndiaNationalMap(
          landData,
          riversData,
          citiesRef.current,
          storefrontsRef.current
        );
        nationalMap.group.visible = !selectedCityRef.current;
        scene.add(nationalMap.group);
        nationalMapRef.current = nationalMap;

        skyEnv.updateLighting(isNightRef.current, Boolean(selectedCityRef.current));

        setIsSceneReady(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to build 3D India National Map:", err);
        setLoading(false);
      });

    // 7. Raycasting: City Hotspots & Town Storefronts
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

      // In Town View: Check Storefront hitboxes
      if (selectedCityRef.current && hitBoxesRef.current.length > 0) {
        const sfIntersects = raycaster.intersectObjects(hitBoxesRef.current, false);
        if (sfIntersects.length > 0) {
          const hit = sfIntersects[0].object as THREE.Mesh & {
            storefrontData?: BusinessStorefront;
          };

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

      // In National Map View: Check City Beacon Hitboxes
      if (!selectedCityRef.current && nationalMapRef.current) {
        const pinIntersects = raycaster.intersectObjects(
          nationalMapRef.current.hitBoxes,
          false
        );
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

    // Double-Click on National Map to smooth-focus and zoom into any region
    const handleDblClick = (event: MouseEvent) => {
      if (selectedCityRef.current) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      if (nationalMapRef.current) {
        const intersects = raycaster.intersectObjects(
          nationalMapRef.current.group.children,
          true
        );
        if (intersects.length > 0) {
          const hitPoint = intersects[0].point;
          bazaarAudio.playStorefrontChime();
          targetLookAtRef.current = new THREE.Vector3(hitPoint.x, 0, hitPoint.z);
          targetCamPosRef.current = new THREE.Vector3(hitPoint.x, 85, hitPoint.z + 60);
        }
      }
    };

    canvas.addEventListener("dblclick", handleDblClick);

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

      // Update Sky & Sun/Moon animation
      if (skyEnvRef.current) {
        skyEnvRef.current.update(delta);
      }

      // Update National Map beacons animation
      if (!selectedCityRef.current && nationalMapRef.current) {
        nationalMapRef.current.update(delta, isNightRef.current, camera);
      }

      // Update Town Traffic & Pedestrians
      if (trafficRef.current) {
        trafficRef.current.update(delta);
      }
      if (pedestriansRef.current) {
        pedestriansRef.current.update(delta);
      }

      // Free Spatial Pan (WASD & Arrow Keys) in both National and Town Overview
      if (!isWalkModeRef.current) {
        const keys = keysDownRef.current;
        let moveX = 0;
        let moveZ = 0;

        if (keys["KeyW"] || keys["ArrowUp"]) moveZ -= 1;
        if (keys["KeyS"] || keys["ArrowDown"]) moveZ += 1;
        if (keys["KeyA"] || keys["ArrowLeft"]) moveX -= 1;
        if (keys["KeyD"] || keys["ArrowRight"]) moveX += 1;

        if (moveX !== 0 || moveZ !== 0) {
          const isShift = Boolean(keys["ShiftLeft"] || keys["ShiftRight"]);
          const camDist = camera.position.distanceTo(controls.target);
          const panSpeed =
            Math.max(camDist * 0.75, selectedCityRef.current ? 35 : 55) *
            (isShift ? 2.5 : 1.0) *
            delta;

          const forward = new THREE.Vector3();
          camera.getWorldDirection(forward);
          forward.y = 0;
          forward.normalize();

          const right = new THREE.Vector3();
          right.crossVectors(forward, camera.up).normalize();

          const panDelta = new THREE.Vector3();
          panDelta.addScaledVector(forward, -moveZ * panSpeed);
          panDelta.addScaledVector(right, moveX * panSpeed);

          camera.position.add(panDelta);
          controls.target.add(panDelta);
        }
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
          controls.target.set(newPos.x, newPos.y + 1.8, newPos.z);
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

      // Cinematic Drone Fly Mode (WASD / Arrow navigation when in City view)
      if (!isWalkModeRef.current && selectedCityRef.current) {
        const keys = keysDownRef.current;
        const isShift = Boolean(keys["ShiftLeft"] || keys["ShiftRight"]);
        const speed = (isShift ? 220 : 85) * delta;

        const forwardDir = new THREE.Vector3();
        camera.getWorldDirection(forwardDir);
        forwardDir.y = 0;
        forwardDir.normalize();

        const rightDir = new THREE.Vector3().crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();
        const moveVec = new THREE.Vector3();

        if (keys["KeyW"] || keys["ArrowUp"]) moveVec.addScaledVector(forwardDir, speed);
        if (keys["KeyS"] || keys["ArrowDown"]) moveVec.addScaledVector(forwardDir, -speed);
        if (keys["KeyD"] || keys["ArrowRight"]) moveVec.addScaledVector(rightDir, speed);
        if (keys["KeyA"] || keys["ArrowLeft"]) moveVec.addScaledVector(rightDir, -speed);

        if (moveVec.lengthSq() > 0) {
          camera.position.add(moveVec);
          controls.target.add(moveVec);
        }

        // Q / E Smooth Camera Yaw Rotation
        if (keys["KeyQ"]) {
          const offset = camera.position.clone().sub(controls.target);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), 1.6 * delta);
          camera.position.copy(controls.target).add(offset);
        }
        if (keys["KeyE"]) {
          const offset = camera.position.clone().sub(controls.target);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -1.6 * delta);
          camera.position.copy(controls.target).add(offset);
        }
      }

      // Smooth Camera Tween
      if (targetCamPosRef.current && targetLookAtRef.current) {
        const factor = Math.min(delta * 3.5, 1);
        camera.position.lerp(targetCamPosRef.current, factor);
        controls.target.lerp(targetLookAtRef.current, factor);

        if (camera.position.distanceTo(targetCamPosRef.current) < 1.5) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      if (selectedCityRef.current) {
        // Firm bounds clamping on controls.target to keep city in view and prevent sky blow-out
        controls.target.x = THREE.MathUtils.clamp(controls.target.x, -280, 280);
        controls.target.z = THREE.MathUtils.clamp(controls.target.z, -220, 220);
        controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 25);
        camera.position.y = Math.max(camera.position.y, 5.0);
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
      canvas.removeEventListener("dblclick", handleDblClick);
      if (skyEnvRef.current) {
        skyEnvRef.current.dispose();
      }
      if (nationalMapRef.current) {
        nationalMapRef.current.dispose();
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

  const searchResultsColonies = q
    ? GUWAHATI_COLONIES.filter(
        (col) =>
          col.pincode.includes(q) ||
          col.name.toLowerCase().includes(q) ||
          col.zone.toLowerCase().includes(q) ||
          col.description.toLowerCase().includes(q)
      )
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
      className="relative w-full h-full overflow-hidden bg-[#38bdf8]"
    >
      <canvas
        ref={canvasRef}
        role="region"
        aria-label="Spotlight 3D Interactive India Map and Living Bazaar Street"
        tabIndex={0}
        className="w-full h-full block cursor-grab active:cursor-grabbing touch-none focus:outline-none"
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#071322] z-30 transition-opacity duration-500">
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin mb-3" />
          <p className="text-xs text-neutral-400 font-mono tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>INITIALIZING 3D INDIA RELIEF & LIVING STREETS...</span>
          </p>
        </div>
      )}

      {/* UNIFIED TOP BAR: Mascot + Back Button + Omnibox Search + View Modes & Actions */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Mascot Brand & Mode Badge / Return to India Map */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-neutral-950/40 hover:bg-neutral-950/50 backdrop-blur-xl backdrop-saturate-150 border border-white/15 shadow-2xl transition-all">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/25 via-neutral-900 to-black p-0.5 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)] shrink-0 overflow-hidden flex items-center justify-center">
              <img
                src="/mascot-avatar.png"
                alt="Spotlight Mascot"
                className="w-full h-full object-cover rounded-md scale-105"
              />
            </div>
            <span className="hidden sm:inline text-xs font-bold text-white tracking-wide">
              Spotlight <span className="text-amber-400 font-extrabold">Bazaar</span>
            </span>
          </div>

          {selectedCity ? (
            isWalkMode ? (
              <button
                type="button"
                onClick={toggleWalkMode}
                aria-label="Stop walking mode"
                className="px-2.5 sm:px-3 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-2xl transition-all"
              >
                <span>← <span className="hidden sm:inline">Stop </span>walking</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCitySelect(null)}
                aria-label="Return to India Map"
                title="Return to India Map"
                className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-amber-500/60 text-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-xl transition-all group shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
                <span className="sm:hidden">← India</span>
                <span className="hidden sm:inline">← Return to India Map</span>
              </button>
            )
          ) : null}

          {/* Toggle Live OpenStreetMap (City GIS) */}
          {onToggleOsmMap && (
            <button
              type="button"
              onClick={onToggleOsmMap}
              aria-label="Switch to Live OpenStreetMap View"
              title="Switch to Live OpenStreetMap View"
              className="px-2.5 sm:px-3 py-1.5 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-emerald-500/60 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-xl transition-all group shrink-0"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="hidden sm:inline">🗺️ Live OSM Map</span>
              <span className="sm:hidden">🗺️ OSM</span>
            </button>
          )}
        </div>

        {/* Center: Omnibox Search Bar */}
        <div className="relative flex-1 max-w-md pointer-events-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-neutral-300 pointer-events-none" />
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
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-neutral-700/80 text-white text-xs font-medium placeholder:text-neutral-300 placeholder:opacity-100 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 shadow-2xl transition-all"
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

              {searchResultsColonies.length > 0 && (
                <div className="mb-1">
                  <span className="text-[10px] font-mono text-neutral-500 px-2 py-0.5 uppercase tracking-wider block">
                    Colonies & Postal PIN Codes
                  </span>
                  {searchResultsColonies.map((col) => (
                    <button
                      key={col.pincode}
                      type="button"
                      onClick={() => {
                        focusColony(col);
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-neutral-900 flex items-center justify-between text-xs text-white transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-white group-hover:text-amber-300 truncate">
                            {col.name}
                          </span>
                          <span className="text-[10px] text-neutral-400 truncate">
                            {col.description}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md shrink-0 ml-2">
                        PIN {col.pincode}
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
                searchResultsColonies.length === 0 &&
                searchResultsShops.length === 0 && (
                  <div className="py-4 text-center text-xs text-neutral-500">
                    No results for &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Right: Sound + Day/Night + Recenter + CTA */}
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          {/* Sound, Lighting & Recenter Controls */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                const muted = bazaarAudio.toggleMute();
                setIsSoundMuted(muted);
              }}
              aria-label={isSoundMuted ? "Unmute Indian Bazaar Ambience" : "Mute Sound"}
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
              aria-label={isNight ? "Switch to Sunny Day" : "Switch to Indian Night"}
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
              aria-label="Recenter Camera View"
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

      {/* MOBILE WALK MODE FLOATING TOP STATUS PILL (Zero bottom collision) */}
      {selectedCity && isWalkMode && (
        <div className="sm:hidden absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-amber-500/40 shadow-2xl">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Walking {selectedCity.name}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const targetShop = nearbyStorefront || activeStorefront || cityStorefronts[0] || storefronts[0];
              if (targetShop) {
                setActiveDialogueStorefront(targetShop);
              } else {
                setShowQuickTalkModal(true);
              }
            }}
            className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 active:scale-95"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Talk</span>
          </button>
          <button
            type="button"
            onClick={toggleWalkMode}
            className="px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-semibold active:scale-95 border border-neutral-700"
          >
            Exit
          </button>
        </div>
      )}

      {/* BOTTOM CENTER: Town Street Card / National Map Card */}
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
            /* First-Person / Avatar Walk Mode Bar (Desktop only, mobile rendered at top) */
            <div className="hidden sm:flex items-center gap-2 p-2 px-3.5 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl pointer-events-auto flex-wrap justify-center">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Walking {selectedCity.name}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const targetShop = nearbyStorefront || activeStorefront || cityStorefronts[0] || storefronts[0];
                  if (targetShop) {
                    setActiveDialogueStorefront(targetShop);
                  } else {
                    setShowQuickTalkModal(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Talk to Owner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    showToast("🔗 3D High Street link copied!");
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
                Exit Walk (Esc)
              </button>
            </div>
          ) : (
            /* City High Street Level Card - Clean, purposeful, zero-slop */
            <div className="w-full max-w-lg p-3.5 sm:p-4 rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex flex-col gap-3 pointer-events-auto">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {selectedCity.name} High Street
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {cityStorefronts.length} verified {cityStorefronts.length === 1 ? "business" : "businesses"} · Clear {isNight ? "night" : "day"}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-medium text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Bazaar</span>
                </div>
              </div>

              {/* Clean Action Row */}
              <div className="flex items-center gap-2">
                <a
                  href={selectedCity ? `/register?city=${selectedCity.slug}` : "/register"}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Open a Shop · Claim Plot</span>
                </a>

                <button
                  type="button"
                  onClick={toggleWalkMode}
                  className="py-2.5 px-3.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 active:scale-[0.98]"
                >
                  <Footprints className="w-4 h-4 text-amber-400" />
                  <span>Walk (WASD)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const shop = nearbyStorefront || activeStorefront || cityStorefronts[0];
                    if (shop) {
                      setActiveDialogueStorefront(shop);
                    } else {
                      setShowQuickTalkModal(true);
                    }
                  }}
                  className="py-2.5 px-3.5 rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800"
                  title="Talk to Verified Business"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Talk</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      showToast("🔗 High Street link copied!");
                    }
                  }}
                  className="p-2.5 rounded-2xl text-xs font-medium flex items-center justify-center transition-all bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800"
                  title="Share High Street Link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        ) : (
          /* National 3D Map Helper Card */
          <div className="p-3 px-5 rounded-3xl bg-neutral-950/90 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex flex-col sm:flex-row items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-neutral-300 font-medium">
                Tap Guwahati or any city hub to explore its Living 3D High Street
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

        {/* Controls HUD Tooltip (Desktop only) */}
        <div className="hidden md:flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950/70 backdrop-blur-md border border-neutral-800/60 text-[10px] text-neutral-400 font-mono flex items-center gap-2 shadow-lg">
            <span>
              {isWalkMode
                ? "W A S D walk · Shift sprint · [E] talk · Esc exit walk"
                : "W A S D fly · Drag look 360° · Scroll zoom · Q / E turn · Shift faster"}
            </span>
          </div>
        </div>
      </div>

      {/* MOBILE VIRTUAL JOYSTICK (Clean bottom-8 placement with zero HUD overlap) */}
      {selectedCity && isWalkMode && (
        <div className="absolute bottom-8 left-6 z-30 pointer-events-auto">
          <VirtualJoystick
            onMove={(vec) => {
              joystickVecRef.current = vec;
            }}
          />
        </div>
      )}

      {/* REAL-TIME OPENSTREETMAP MINI-RADAR PIP (Picture-in-Picture) */}
      {selectedCity && onToggleOsmMap && !isWalkMode && (
        <div className="hidden lg:block absolute bottom-8 right-6 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleOsmMap}
            className="group p-2 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 shadow-2xl backdrop-blur-xl transition-all flex flex-col items-start text-left cursor-pointer"
            title="Click to view full Live OpenStreetMap"
          >
            <div className="flex items-center justify-between w-full gap-2 mb-1 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Live OSM GPS
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono group-hover:underline">
                Expand ↗
              </span>
            </div>
            <div className="relative w-44 h-24 rounded-xl overflow-hidden border border-neutral-800 bg-[#071322]">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=91.75%2C26.14%2C91.79%2C26.17&layer=mapnik&marker=26.1550%2C91.7750"
                className="w-full h-full border-0 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity"
                title="OpenStreetMap Mini-Radar"
              />
              <div className="absolute inset-0 bg-transparent group-hover:bg-emerald-500/5 transition-colors" />
            </div>
            <p className="text-[9px] text-neutral-400 mt-1 px-1 font-mono">
              GS Road, Christian Basti
            </p>
          </button>
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
