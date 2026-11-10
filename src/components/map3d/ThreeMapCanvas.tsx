"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { City, BusinessStorefront } from "@/types";
import { buildIndiaLandMeshes, buildRiversMeshes } from "./indiaGeometry";
import { buildCityPins, CityPinObject } from "./cityPins";
import { toWorld } from "./projection";
import { Sun, Moon, Compass, RotateCcw, Sparkles } from "lucide-react";

interface ThreeMapCanvasProps {
  cities: City[];
  storefronts: BusinessStorefront[];
  selectedCity: City | null;
  onCitySelect: (city: City) => void;
  onStorefrontSelect?: (storefront: BusinessStorefront) => void;
}

export function ThreeMapCanvas({
  cities,
  storefronts,
  selectedCity,
  onCitySelect,
}: ThreeMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [isNight, setIsNight] = useState(true);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cityPinsRef = useRef<CityPinObject[]>([]);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Animation Tween State
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  // Smooth FlyTo Camera Action
  const flyToCity = useCallback((city: City) => {
    const [x, z] = toWorld(city.lon, city.lat);
    targetCamPosRef.current = new THREE.Vector3(x, 140, z + 160);
    targetLookAtRef.current = new THREE.Vector3(x, 5, z);
  }, []);

  // Reset to Macro View of India
  const resetCamera = useCallback(() => {
    targetCamPosRef.current = new THREE.Vector3(0, 560, 520);
    targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
  }, []);

  // Synchronize when selectedCity changes from parent UI
  useEffect(() => {
    if (selectedCity) {
      flyToCity(selectedCity);
    } else {
      resetCamera();
    }
  }, [selectedCity, flyToCity, resetCamera]);

  // Toggle Day/Night Lighting
  const toggleLighting = useCallback(() => {
    setIsNight((prev) => {
      const next = !prev;
      if (dirLightRef.current && ambientLightRef.current) {
        if (next) {
          // Night Mode: Moody indigo, cyan moonlight
          dirLightRef.current.intensity = 0.65;
          dirLightRef.current.color.setHex(0x38bdf8);
          ambientLightRef.current.intensity = 0.55;
          ambientLightRef.current.color.setHex(0x0f172a);
        } else {
          // Day Mode: Warm golden daylight
          dirLightRef.current.intensity = 1.6;
          dirLightRef.current.color.setHex(0xfff7ed);
          ambientLightRef.current.intensity = 0.9;
          ambientLightRef.current.color.setHex(0x334155);
        }
      }
      return next;
    });
  }, []);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let isDisposed = false;
    let animId: number;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x070a13);
    scene.fog = new THREE.FogExp2(0x070a13, 0.0006);

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, aspect, 2, 4000);
    camera.position.set(0, 560, 520);
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
    controls.maxPolarAngle = Math.PI / 2.15; // Prevent camera sinking under the ocean
    controls.minDistance = 60;
    controls.maxDistance = 1200;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0x0f172a, 0.55);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    dirLight.position.set(180, 450, 200);
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

    // 6. Deep Ocean Floor Mesh with subtle radial grid
    const oceanGeo = new THREE.PlaneGeometry(3500, 3500);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x050914,
      roughness: 0.95,
      metalness: 0.1,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.5;
    ocean.receiveShadow = true;
    scene.add(ocean);

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

        // Build City Hotspots
        const { group: pinsGroup, cityPins } = buildCityPins(cities, storefronts);
        scene.add(pinsGroup);
        cityPinsRef.current = cityPins;

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Spotlight 3D map data:", err);
        setLoading(false);
      });

    // 8. Raycasting for City Taps
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hitTargets = cityPinsRef.current.map((pin) => pin.getObjectByName("hit_target")!).filter(Boolean);
      const intersects = raycaster.intersectObjects(hitTargets, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const parentPin = hit.object.parent as CityPinObject;
        if (parentPin && parentPin.cityData) {
          onCitySelect(parentPin.cityData);
        }
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);

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

      // Smooth Camera Interpolation (flyTo)
      if (targetCamPosRef.current && targetLookAtRef.current) {
        const factor = Math.min(delta * 3.5, 1);
        camera.position.lerp(targetCamPosRef.current, factor);
        controls.target.lerp(targetLookAtRef.current, factor);

        // Settle when close enough
        if (camera.position.distanceTo(targetCamPosRef.current) < 2) {
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
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      controls.dispose();
      renderer.dispose();
    };
  }, [cities, storefronts, onCitySelect]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px] overflow-hidden bg-[#070a13]">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing touch-none" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070a13] z-20 transition-opacity duration-500">
          <div className="w-12 h-12 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin mb-3" />
          <p className="text-xs text-neutral-400 font-mono tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>INITIALIZING 3D INDIA TERRAIN...</span>
          </p>
        </div>
      )}

      {/* Floating 3D HUD Navigation Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 z-10">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-950/85 backdrop-blur-md border border-neutral-800 shadow-2xl">
          {/* Day/Night Mode */}
          <button
            type="button"
            onClick={toggleLighting}
            title={isNight ? "Switch to Day Sunlight" : "Switch to Night Cyber Lights"}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            {isNight ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Reset India View */}
          <button
            type="button"
            onClick={resetCamera}
            title="Reset to Full India View"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-neutral-300" />
          </button>
        </div>

        {/* Interaction Hint */}
        <div className="px-3 py-1.5 rounded-xl bg-neutral-950/70 backdrop-blur-md border border-neutral-800/60 text-[10px] text-neutral-400 font-mono flex items-center gap-2 shadow-lg">
          <Compass className="w-3 h-3 text-rose-500" />
          <span>DRAG TO ORBIT · SCROLL TO ZOOM · TAP ANY CITY PIN</span>
        </div>
      </div>
    </div>
  );
}

