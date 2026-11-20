"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Compass,
  Eye,
  Layers,
  Maximize2,
  Moon,
  RotateCcw,
  Sun,
  Video,
} from "lucide-react";
import {
  BannerStyle,
  CategoryId,
  DrivewayVehicle,
  FacadeTheme,
  GardenStyle,
  LightingStyle,
  WallAccent,
} from "@/types";
import { createCategoryPlotMesh } from "@/components/map/osm3dBuildings";

interface PlotLive3DViewerProps {
  categoryId: CategoryId;
  plotLevel: 1 | 2 | 3;
  facadeTheme: FacadeTheme;
  accentColor: string;
  signText?: string;
  gardenStyle?: GardenStyle;
  drivewayVehicle?: DrivewayVehicle;
  lightingStyle?: LightingStyle;
  bannerStyle?: BannerStyle;
  wallAccent?: WallAccent;
  businessName: string;
  className?: string;
}

export function PlotLive3DViewer({
  categoryId,
  plotLevel,
  facadeTheme,
  accentColor,
  signText,
  gardenStyle = "none",
  drivewayVehicle = "none",
  lightingStyle = "neon",
  bannerStyle = "none",
  wallAccent = "standard",
  businessName,
  className = "",
}: PlotLive3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    keyLight: THREE.DirectionalLight;
    fillLight: THREE.DirectionalLight;
    ambientLight: THREE.AmbientLight;
    buildingGroup: THREE.Group | null;
    animId: number | null;
  } | null>(null);

  const [isNightMode, setIsNightMode] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [activePreset, setActivePreset] = useState<"hero" | "front" | "top">("hero");
  const [webGlReady, setWebGlReady] = useState(false);

  // Initialize Three.js scene once
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 360;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isNightMode ? 0x05070e : 0x0d1117);

    // 2. Camera (focused on 22m x 18m building)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 300);
    camera.position.set(22, 15, 26);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't go below ground
    controls.minDistance = 12;
    controls.maxDistance = 55;
    controls.target.set(0, 4.5, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    keyLight.position.set(30, 45, 25);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 120;
    keyLight.shadow.camera.left = -25;
    keyLight.shadow.camera.right = 25;
    keyLight.shadow.camera.top = 25;
    keyLight.shadow.camera.bottom = -25;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    fillLight.position.set(-25, 20, -20);
    scene.add(fillLight);

    // 6. Ground Apron & Architectural Plot Grid
    const groundGeo = new THREE.BoxGeometry(32, 0.8, 28);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.88,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.4;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Entrance curb line
    const curbGeo = new THREE.BoxGeometry(32, 0.15, 0.4);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.7 });
    const curbMesh = new THREE.Mesh(curbGeo, curbMat);
    curbMesh.position.set(0, 0.08, 13.8);
    scene.add(curbMesh);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      keyLight,
      fillLight,
      ambientLight,
      buildingGroup: null,
      animId,
    };

    setWebGlReady(true);

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!container || !threeRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      curbGeo.dispose();
      curbMat.dispose();
      threeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update 3D Building Geometry whenever Category, Level, Theme, or Accent changes
  useEffect(() => {
    const inst = threeRef.current;
    if (!inst) return;

    // Remove previous building group
    if (inst.buildingGroup) {
      inst.scene.remove(inst.buildingGroup);
      inst.buildingGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      inst.buildingGroup = null;
    }

    // Build fresh procedural 3D category building with level upgrades and custom styles
    const newGroup = createCategoryPlotMesh(categoryId, {
      plotLevel,
      facadeTheme,
      accentColor,
      gardenStyle,
      drivewayVehicle,
      lightingStyle,
      bannerStyle,
      wallAccent,
    });

    newGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    inst.scene.add(newGroup);
    inst.buildingGroup = newGroup;
  }, [
    categoryId,
    plotLevel,
    facadeTheme,
    accentColor,
    gardenStyle,
    drivewayVehicle,
    lightingStyle,
    bannerStyle,
    wallAccent,
  ]);

  // Day / Night lighting toggle effect
  useEffect(() => {
    const inst = threeRef.current;
    if (!inst) return;

    if (isNightMode) {
      inst.scene.background = new THREE.Color(0x060913);
      inst.ambientLight.color.setHex(0x1e293b);
      inst.ambientLight.intensity = 0.55;
      inst.keyLight.color.setHex(0x38bdf8);
      inst.keyLight.intensity = 0.65;
      inst.fillLight.color.setHex(0x0284c7);
      inst.fillLight.intensity = 0.45;
    } else {
      inst.scene.background = new THREE.Color(0x0d1117);
      inst.ambientLight.color.setHex(0xdbeafe);
      inst.ambientLight.intensity = 1.4;
      inst.keyLight.color.setHex(0xfff7ed);
      inst.keyLight.intensity = 2.8;
      inst.fillLight.color.setHex(0x38bdf8);
      inst.fillLight.intensity = 1.0;
    }
  }, [isNightMode]);

  // Auto-turntable spin toggle
  useEffect(() => {
    if (threeRef.current) {
      threeRef.current.controls.autoRotate = isAutoRotate;
    }
  }, [isAutoRotate]);

  // Camera POV Preset handler
  const handleSelectPreset = (preset: "hero" | "front" | "top") => {
    const inst = threeRef.current;
    if (!inst) return;
    setActivePreset(preset);

    if (preset === "hero") {
      inst.camera.position.set(22, 15, 26);
      inst.controls.target.set(0, 4.5, 0);
    } else if (preset === "front") {
      inst.camera.position.set(0, 7, 32);
      inst.controls.target.set(0, 4.5, 0);
    } else if (preset === "top") {
      inst.camera.position.set(24, 28, 24);
      inst.controls.target.set(0, 3, 0);
    }
    inst.controls.update();
  };

  const handleReset = () => {
    handleSelectPreset("hero");
    setIsAutoRotate(true);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[360px] sm:h-[440px] rounded-2xl overflow-hidden border border-neutral-800 bg-[#0d1117] shadow-2xl select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        aria-label="Interactive 3D building plot preview"
      />

      {/* Top Left: Camera Angle Presets */}
      <div className="absolute top-3 left-3 z-10 flex items-center rounded-xl overflow-hidden border border-neutral-800/90 bg-[#09090b]/90 backdrop-blur-md p-0.5 shadow-lg">
        <button
          type="button"
          onClick={() => handleSelectPreset("hero")}
          title="3/4 Street View"
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            activePreset === "hero"
              ? "bg-amber-500 text-neutral-950 shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Street
        </button>
        <button
          type="button"
          onClick={() => handleSelectPreset("front")}
          title="Front Elevation"
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            activePreset === "front"
              ? "bg-amber-500 text-neutral-950 shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Front
        </button>
        <button
          type="button"
          onClick={() => handleSelectPreset("top")}
          title="Top Isometric"
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            activePreset === "top"
              ? "bg-amber-500 text-neutral-950 shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Top 45°
        </button>
      </div>

      {/* Top Right: Studio & Turntable Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {/* Day / Night Studio Lighting */}
        <button
          type="button"
          onClick={() => setIsNightMode((prev) => !prev)}
          title={isNightMode ? "Switch to Daytime Sun" : "Switch to Midnight Neon"}
          className={`p-2 rounded-xl border backdrop-blur-md transition-all shadow-md ${
            isNightMode
              ? "bg-sky-500/15 border-sky-500/40 text-sky-400"
              : "bg-[#09090b]/90 border-neutral-800 text-neutral-300 hover:text-white"
          }`}
        >
          {isNightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>

        {/* 360° Auto-Turntable */}
        <button
          type="button"
          onClick={() => setIsAutoRotate((prev) => !prev)}
          title={isAutoRotate ? "Pause 360° Rotation" : "Auto-Rotate 360°"}
          className={`p-2 rounded-xl border backdrop-blur-md transition-all shadow-md ${
            isAutoRotate
              ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
              : "bg-[#09090b]/90 border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          <Compass className={`w-3.5 h-3.5 ${isAutoRotate ? "animate-spin" : ""}`} />
        </button>

        {/* Reset Camera */}
        <button
          type="button"
          onClick={handleReset}
          title="Reset Camera Angle"
          className="p-2 rounded-xl bg-[#09090b]/90 border border-neutral-800 text-neutral-400 hover:text-white backdrop-blur-md transition-colors shadow-md"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Center: Interactive 3D Gesture Hint */}
      <div className="absolute bottom-3 inset-x-0 z-10 pointer-events-none flex items-center justify-center">
        <span className="px-3 py-1 rounded-full bg-[#09090b]/85 border border-neutral-800/90 backdrop-blur-md text-[10px] font-medium text-neutral-300 flex items-center gap-1.5 shadow-lg">
          <Eye className="w-3 h-3 text-amber-400" />
          <span>Drag to orbit 360° · Scroll to zoom</span>
        </span>
      </div>

      {/* Bottom Left: Live Level & Construction Badge */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-[#09090b]/90 border border-neutral-800/90 backdrop-blur-md text-[11px] font-medium text-neutral-200">
          <strong className="text-amber-400">Level {plotLevel}</strong> Architecture
        </span>
      </div>
    </div>
  );
}

