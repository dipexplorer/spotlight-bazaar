"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import { config, Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

if (typeof window !== "undefined") {
  config.WORKER_URL = "/maplibre-gl-worker.mjs";
}

import { City, BusinessStorefront } from "@/types";
import {
  Compass,
  Layers,
  MapPin,
  Search,
  Sparkles,
  Sun,
  Moon,
  Plus,
  ArrowLeft,
  Store,
  Footprints,
  MessageSquare,
  Share2,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { QuickTalkModal } from "@/components/map3d/QuickTalkModal";
import { StorefrontDialogueModal } from "@/components/map3d/StorefrontDialogueModal";
import { bazaarAudio } from "@/lib/audio/bazaarAudio";
import * as THREE from "three";
import {
  createNerqivaVillaMesh,
  createAccessRoadConnectorMesh,
  createTreeMesh,
  createStreetLightMesh,
  createPlayerCharacter3D,
} from "./osm3dBuildings";

interface LiveOsmMapProps {
  cities: City[];
  storefronts: BusinessStorefront[];
  selectedCity: City | null;
  activeStorefront?: BusinessStorefront | null;
  onCitySelect: (city: City | null) => void;
  onStorefrontSelect?: (storefront: BusinessStorefront) => void;
  onToggle3DMap?: () => void;
}

// Open-source MapLibre Vector Style with OpenStreetMap data
const CARTO_VOYAGER_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const CARTO_DARK_MATTER_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Fallback pure OpenStreetMap raster style (zero external dependencies)
const OSM_RASTER_STYLE = {
  version: 8 as const,
  sources: {
    "osm-tiles": {
      type: "raster" as const,
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster" as const,
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Real Google Maps Location for NERQIVA Studio (North Guwahati)
const NERQIVA_COORDS: [number, number] = [91.72925728895483, 26.20624167049662];
// Nearest mapped OpenStreetMap residential road junction in North Guwahati
const NEAREST_ROAD_COORDS: [number, number] = [91.72838062047958, 26.206399578544207];

// Procedural calculation connecting any business plot to nearest OpenStreetMap road
function computeRoadConnector(
  plotLngLat: [number, number],
  roadLngLat: [number, number],
  theta = 0.25
) {
  const latRad = (plotLngLat[1] * Math.PI) / 180;
  const mPerDegLat = 111132.954 - 559.822 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const mPerDegLng = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);

  const dx = (roadLngLat[0] - plotLngLat[0]) * mPerDegLng;
  const dz = -(roadLngLat[1] - plotLngLat[1]) * mPerDegLat;

  // Invert 2x2 rotation matrix for Three.js rotationY(theta)
  const targetX = dx * Math.cos(theta) - dz * Math.sin(theta);
  const targetZ = dx * Math.sin(theta) + dz * Math.cos(theta);

  const length = Math.hypot(targetX, targetZ);
  const angle = Math.atan2(targetX, targetZ);

  return { length, angle, targetX, targetZ };
}

// Converts local Three.js coordinates (X, Z in meters from Nerqiva Studio) to real Mercator GPS coordinates
function localToLngLat(x: number, z: number): [number, number] {
  const coord = maplibregl.MercatorCoordinate.fromLngLat(NERQIVA_COORDS, 0);
  const scale = coord.meterInMercatorCoordinateUnits();
  const angle = 0.25; // Aligned with the local street in North Guwahati
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const localX = x * cosA + z * sinA;
  const localZ = -x * sinA + z * cosA;
  const mercX = coord.x + localX * scale;
  const mercY = coord.y + localZ * scale;
  const lngLat = new maplibregl.MercatorCoordinate(mercX, mercY, 0).toLngLat();
  return [lngLat.lng, lngLat.lat];
}

// Generates seamless, continuous OpenStreetMap road coordinates connecting Nerqiva Studio to the road network
function getConnectorRoadCoordinates(): [number, number][] {
  const pPrev: [number, number] = [91.72779858112335, 26.20633219646298];
  const pRoad: [number, number] = NEAREST_ROAD_COORDS; // [91.72838062047958, 26.206399578544207]
  const { length: totalLength, angle: roadAngle } = computeRoadConnector(NERQIVA_COORDS, NEAREST_ROAD_COORDS);

  const startOffset = 10.0;
  const curveStartM = 45.0;
  const curveLen = totalLength - curveStartM;
  const delta = 18.605 * (Math.PI / 180);
  const S = curveLen * Math.tan(delta);

  function getRoadCenterline(zCurr: number) {
    if (zCurr <= curveStartM) {
      return { x: 0, z: zCurr };
    }
    const u = Math.min(1.0, Math.max(0.0, (zCurr - curveStartM) / curveLen));
    const x = S * u * u * (u - 1);
    const z = (1 - u) * curveStartM + u * totalLength;
    return { x, z };
  }

  function roadLocalToLngLat(xM: number, zM: number): [number, number] {
    const colX = xM * Math.cos(roadAngle) + zM * Math.sin(roadAngle);
    const colZ = -xM * Math.sin(roadAngle) + zM * Math.cos(roadAngle);
    return localToLngLat(colX, colZ);
  }

  // Starts from pPrev and passes through pRoad, creating an unbroken join at the junction node
  const coords: [number, number][] = [pPrev, pRoad];
  const steps = 40;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const zCurr = totalLength - t * (totalLength - startOffset);
    const pt = getRoadCenterline(zCurr);
    coords.push(roadLocalToLngLat(pt.x, pt.z));
  }
  return coords;
}

export function LiveOsmMap({
  cities,
  storefronts,
  selectedCity,
  activeStorefront,
  onCitySelect,
  onStorefrontSelect,
  onToggle3DMap,
}: LiveOsmMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const playerMarkerRef = useRef<Marker | null>(null);

  const [is3DMode, setIs3DMode] = useState(true);
  const isFlightActiveRef = useRef(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const isNightModeRef = useRef(isNightMode);
  useEffect(() => {
    isNightModeRef.current = isNightMode;
  }, [isNightMode]);
  const [isWalkMode, setIsWalkMode] = useState(false);
  const isWalkModeRef = useRef(isWalkMode);
  useEffect(() => {
    isWalkModeRef.current = isWalkMode;
  }, [isWalkMode]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Proximity Talk Modals
  const [showQuickTalkModal, setShowQuickTalkModal] = useState(false);
  const [dialogueStorefront, setDialogueStorefront] = useState<BusinessStorefront | null>(null);

  // 3D Player Avatar Position on approach road outside Nerqiva Studio front gate, facing the studio
  const initRoadAngle = -2.0179;
  const initX = 18.5 * Math.sin(initRoadAngle);
  const initZ = 18.5 * Math.cos(initRoadAngle);
  const playerLocalPosRef = useRef<{ x: number; z: number; heading: number }>({
    x: initX,
    z: initZ,
    heading: Math.atan2(-initX, -initZ), // Face directly toward Nerqiva Studio front gate
  });
  const playerPosRef = useRef<[number, number]>(localToLngLat(initX, initZ));
  const isWalkingRef = useRef<boolean>(false);
  const [isWalking, setIsWalking] = useState(false);
  const [isSprint, setIsSprint] = useState(false);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const shiftHeldRef = useRef<boolean>(false);
  const walkBearingRef = useRef<number>(101.293);
  const isProgrammaticCamRef = useRef<boolean>(false);
  const walkRafRef = useRef<number | null>(null);
  const lastWalkFrameRef = useRef<number>(0);

  // 3rd-person over-the-shoulder eye-view camera constants
  const WALK_ZOOM = 21.3;
  const WALK_PITCH = 80;
  const WALK_LOOKAHEAD = 3.8;

  // Convert MapLibre compass bearing (deg) -> exact Three.js character heading (back to camera, eyes ahead)
  const bearingToHeading = useCallback((bearingDeg: number): number => {
    const rad = (bearingDeg * Math.PI) / 180;
    const fwdMercX = Math.sin(rad);
    const fwdMercY = -Math.cos(rad);
    const angle = 0.25;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const fwdColX = fwdMercX * cosA - fwdMercY * sinA;
    const fwdColZ = fwdMercX * sinA + fwdMercY * cosA;
    return Math.atan2(fwdColX, fwdColZ);
  }, []);

  // Convert Three.js character heading (rad) -> exact MapLibre compass bearing (deg) behind character's back
  const headingToBearing = useCallback((heading: number): number => {
    const fwdColX = Math.sin(heading);
    const fwdColZ = Math.cos(heading);
    const angle = 0.25;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const fwdMercX = fwdColX * cosA + fwdColZ * sinA;
    const fwdMercY = -fwdColX * sinA + fwdColZ * cosA;
    return (Math.atan2(fwdMercX, -fwdMercY) * 180) / Math.PI;
  }, []);

  // Compute 3rd-person game camera look-ahead target (camera sits behind character's back following eye view)
  const getThirdPersonCenter = useCallback((px: number, pz: number, bearingDeg: number, lookAheadM = 3.8): [number, number] => {
    const rad = (bearingDeg * Math.PI) / 180;
    const fwdMercX = Math.sin(rad);
    const fwdMercY = -Math.cos(rad);
    const angle = 0.25;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const fwdColX = fwdMercX * cosA - fwdMercY * sinA;
    const fwdColZ = fwdMercX * sinA + fwdMercY * cosA;
    return localToLngLat(px + lookAheadM * fwdColX, pz + lookAheadM * fwdColZ);
  }, []);

  // Compute compass bearing looking from (px, pz) straight toward Nerqiva Studio (0, 0)
  const getBearingToStudio = useCallback((px: number, pz: number): number => {
    const dx = -px;
    const dz = -pz;
    const angle = 0.25;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const vx = dx * cosA + dz * sinA;
    const vy = -dx * sinA + dz * cosA;
    return (Math.atan2(vx, -vy) * 180) / Math.PI;
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  // Enter true 3rd-person over-the-shoulder eye-view camera behind the character's back
  const enterThirdPersonWalkMode = useCallback(
    (faceStudio = false) => {
      if (!mapRef.current) return;
      setIsWalkMode(true);
      isWalkModeRef.current = true;
      const { x, z, heading } = playerLocalPosRef.current;
      const targetBearing = faceStudio ? getBearingToStudio(x, z) : headingToBearing(heading);
      walkBearingRef.current = targetBearing;
      playerLocalPosRef.current.heading = bearingToHeading(targetBearing);

      markersRef.current.forEach((m) => {
        const el = m.getElement();
        if (el) {
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
        }
      });

      isProgrammaticCamRef.current = true;
      mapRef.current.easeTo({
        center: getThirdPersonCenter(x, z, targetBearing, WALK_LOOKAHEAD),
        zoom: WALK_ZOOM,
        pitch: WALK_PITCH,
        bearing: targetBearing,
        duration: 750,
      });
      mapRef.current.once("moveend", () => {
        isProgrammaticCamRef.current = false;
      });
    },
    [bearingToHeading, getBearingToStudio, getThirdPersonCenter, headingToBearing]
  );

  // Advance one smooth 3rd-person frame: camera ALWAYS stays behind the character's back following eye view
  const stepThirdPersonFrame = useCallback(
    (dt: number) => {
      const map = mapRef.current;
      if (!map) return;

      const keys = pressedKeysRef.current;
      const forward = keys.has("KeyW") || keys.has("ArrowUp");
      const backward = keys.has("KeyS") || keys.has("ArrowDown");
      const turnLeft = keys.has("KeyA") || keys.has("ArrowLeft") || keys.has("KeyQ");
      const turnRight = keys.has("KeyD") || keys.has("ArrowRight") || keys.has("KeyE");

      if (!forward && !backward && !turnLeft && !turnRight) {
        if (isWalkingRef.current) {
          isWalkingRef.current = false;
          setIsWalking(false);
        }
        return;
      }

      const MAX_RADIUS = 160;
      const isRun = shiftHeldRef.current || isSprint;
      const moveSpeed = isRun ? 11.5 : 6.2; // meters/sec
      const turnSpeed = isRun ? 120 : 92; // deg/sec

      // Keep camera bearing synced if user previously orbited with mouse
      let nextBearing = map.getBearing();
      if (turnLeft) nextBearing -= turnSpeed * dt;
      if (turnRight) nextBearing += turnSpeed * dt;
      walkBearingRef.current = nextBearing;

      // Character heading ALWAYS matches camera bearing (back to camera, eyes pointing straight ahead!)
      const nextHeading = bearingToHeading(nextBearing);

      let nextX = playerLocalPosRef.current.x;
      let nextZ = playerLocalPosRef.current.z;

      if (forward || backward) {
        const dirSign = forward ? 1 : -1;
        const fwdColX = Math.sin(nextHeading);
        const fwdColZ = Math.cos(nextHeading);
        const candX = nextX + dirSign * moveSpeed * dt * fwdColX;
        const candZ = nextZ + dirSign * moveSpeed * dt * fwdColZ;

        if (Math.hypot(candX, candZ) <= MAX_RADIUS) {
          nextX = candX;
          nextZ = candZ;
        } else {
          showToast("📍 Reached colony perimeter (160m) · Active 3D zone around Nerqiva Studio");
        }
      }

      playerLocalPosRef.current = { x: nextX, z: nextZ, heading: nextHeading };
      const [newLon, newLat] = localToLngLat(nextX, nextZ);
      playerPosRef.current = [newLon, newLat];

      if (!isWalkingRef.current) {
        isWalkingRef.current = true;
        setIsWalking(true);
      }

      if (playerMarkerRef.current) {
        playerMarkerRef.current.setLngLat([newLon, newLat]);
      }

      // Smoothly converge zoom & pitch to eye-view 3rd-person POV while staying locked behind character's back
      const currZoom = map.getZoom();
      const currPitch = map.getPitch();
      const lerpAlpha = Math.min(1, dt * 7);
      const nextZoom = currZoom + (WALK_ZOOM - currZoom) * lerpAlpha;
      const nextPitch = currPitch + (WALK_PITCH - currPitch) * lerpAlpha;

      isProgrammaticCamRef.current = true;
      map.jumpTo({
        center: getThirdPersonCenter(nextX, nextZ, nextBearing, WALK_LOOKAHEAD),
        bearing: nextBearing,
        zoom: nextZoom,
        pitch: nextPitch,
      });
      isProgrammaticCamRef.current = false;
    },
    [bearingToHeading, getThirdPersonCenter, isSprint, showToast]
  );

  const handleStopMove = useCallback(() => {
    pressedKeysRef.current.clear();
    if (walkRafRef.current !== null) {
      cancelAnimationFrame(walkRafRef.current);
      walkRafRef.current = null;
    }
    isWalkingRef.current = false;
    setIsWalking(false);
  }, []);

  // Active city resolution: Defaults to Guwahati
  const currentCity =
    selectedCity ||
    cities.find((c) => c.slug === "guwahati" || c.name.toLowerCase() === "guwahati") ||
    cities[0];

  // Sole verified real listing: Nerqiva Studio
  const nerqivaBusiness: BusinessStorefront =
    storefronts.find((b) => b.slug === "nerqiva-studio") || {
      id: "nerqiva-studio",
      slug: "nerqiva-studio",
      name: "Nerqiva Studio",
      tagline: "Ultra-Premium Digital Products & Web Infrastructure",
      description: "North Guwahati digital engineering studio crafting high-speed, conversion-optimized digital showrooms, web infrastructure, and mobile-first products.",
      category_id: "tech-freelance",
      city_name: "Guwahati",
      state_name: "Assam",
      pincode: "781030",
      lat: 26.20624167049662,
      lon: 91.72925728895483,
      whatsapp_phone: "9864012345",
      instagram_handle: "nerqivastudio",
      website_url: "https://www.nerqivastudio.in/",
      starting_price: "Builds from ₹11,000",
      is_verified: true,
      is_featured: true,
      total_views: 48,
      total_leads: 12,
      created_at: new Date().toISOString(),
    };

  // Initialize MapLibre GL Map with 3D Drone Perspective over real OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Start directly focused on Nerqiva Studio at exact GPS coordinates
    const initialCenter: [number, number] = NERQIVA_COORDS;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: isNightMode ? CARTO_DARK_MATTER_STYLE : CARTO_VOYAGER_STYLE,
      center: initialCenter,
      zoom: 18.2,
      pitch: 56,
      bearing: 35,
      maxPitch: 85,
      maxZoom: 22,
      attributionControl: false,
    });
    (window as any).__maplibreMap = map;

    map.on("error", (e: any) => {
      if (e?.error?.message?.includes("style")) {
        console.warn("[LiveOsmMap] Switching to fallback OSM raster tiles");
        map.setStyle(OSM_RASTER_STYLE);
      }
    });

    // True 3D Three.js Custom Building Layer (Nerqiva Studio Villa & Free Plot)
    const custom3DLayer: maplibregl.CustomLayerInterface = {
      id: "nerqiva-3d-commercial-layer",
      type: "custom",
      renderingMode: "3d",
      onAdd(m: MapLibreMap, gl: any) {
        console.log("[LiveOsmMap] custom3DLayer onAdd called!", gl);
        try {
          const camera = new THREE.Camera();
          const scene = new THREE.Scene();

          // Warm radiant sunlight from southwest
          const sun = new THREE.DirectionalLight(0xfff7ed, 3.0);
          sun.position.set(50, 120, 50).normalize();
          scene.add(sun);

          // Ambient light so all facades glow bright and clear
          const amb = new THREE.AmbientLight(0xdbeafe, 1.6);
          scene.add(amb);

          (this as any).sun = sun;
          (this as any).amb = amb;

          // 3D ARCHITECTURAL GROUP (Nerqiva Studio Flagship Business Plot)
          const colonyGroup = new THREE.Group();
          colonyGroup.name = "business_3d_colony";

          // 1. Automated Road Connector Mesh
          // Dynamically connects from the entrance gate of Nerqiva Studio directly to the mapped OpenStreetMap road
          const { length: roadLength, angle: roadAngle } = computeRoadConnector(NERQIVA_COORDS, NEAREST_ROAD_COORDS);

          const connectorRoad = createAccessRoadConnectorMesh(roadLength, 14.0, 5.6, 1.1, isNightModeRef.current);
          connectorRoad.position.set(0, 0, 0);
          connectorRoad.rotation.y = roadAngle;
          colonyGroup.add(connectorRoad);

          // 2. Nerqiva Studio Flagship 3D Villa (@nerqiva.studio ★ 4.9)
          const villa = createNerqivaVillaMesh();
          villa.scale.set(1.4, 1.4, 1.4);
          villa.position.set(0, 0, 0);
          villa.rotation.y = roadAngle; // Perfectly aligned with the road and driveway!
          colonyGroup.add(villa);

          // 3. Tasteful garden landscaping cleanly inside Nerqiva Studio compound lawn (ZERO wall clipping!)
          const gardenTrees: { pos: [number, number, number]; type: "pine" | "round" | "flowering"; s: number }[] = [
            { pos: [-11.3, 0.4, -8.2], type: "flowering", s: 1.05 },
            { pos: [-11.4, 0.4, -1.6], type: "round", s: 1.0 },
            { pos: [-11.5, 0.4, 8.7], type: "pine", s: 0.95 },
            { pos: [11.2, 0.4, -8.0], type: "pine", s: 1.05 },
            { pos: [7.8, 0.4, -8.0], type: "flowering", s: 1.0 },
            { pos: [11.0, 0.4, -3.8], type: "round", s: 0.95 },
          ];
          gardenTrees.forEach(({ pos, type, s }) => {
            const t = createTreeMesh(type);
            t.position.set(pos[0], pos[1], pos[2]);
            t.scale.set(s, s, s);
            villa.add(t);
          });

          // 6. Controllable 3D Player Character Avatar outside Nerqiva Studio
          const player3D = createPlayerCharacter3D();
          player3D.group.position.set(playerLocalPosRef.current.x, 0, playerLocalPosRef.current.z);
          player3D.group.scale.set(1.25, 1.25, 1.25);
          colonyGroup.add(player3D.group);
          (this as any).player3D = player3D;

          scene.add(colonyGroup);
          (this as any).colonyGroup = colonyGroup;

          // Disable frustum culling so Three.js doesn't cull Mercator projected objects
          scene.traverse((o) => {
            if ((o as any).isMesh) {
              o.frustumCulled = false;
            }
          });

          (this as any).camera = camera;
          (this as any).scene = scene;
          (this as any).renderer = new THREE.WebGLRenderer({
            canvas: m.getCanvas(),
            context: gl,
            antialias: true,
          });
          (this as any).renderer.autoClear = false;
          console.log("[LiveOsmMap] custom3DLayer onAdd success!");
          (window as any).__custom3DSuccess = true;
          (window as any).__mapInstance = m;
        } catch (onAddErr) {
          console.error("[LiveOsmMap] Error inside onAdd:", onAddErr);
          (window as any).__onAddErr = String(onAddErr);
        }
      },
      render(gl: any, options: any) {
        (window as any).__renderCalls = ((window as any).__renderCalls || 0) + 1;
        (window as any).__lastRenderOptions = options;

        // In MapLibre GL v5, defaultProjectionData.mainMatrix is the Mercator-to-clip matrix
        const rawMatrix =
          options?.defaultProjectionData?.mainMatrix ||
          (Array.isArray(options) ? options : options?.matrix) ||
          options?.modelViewProjectionMatrix;

        if (!rawMatrix) {
          (window as any).__missingMatrix = true;
          return;
        }
        const matrix = Array.isArray(rawMatrix) ? rawMatrix : Array.from(rawMatrix);
        if (matrix.length < 16) return;

        (window as any).__matrixOk = true;

        // Update Three.js lighting in real-time to match Day/Night mode
        const sunLight = (this as any).sun as THREE.DirectionalLight | undefined;
        const ambLight = (this as any).amb as THREE.AmbientLight | undefined;
        if (sunLight && ambLight) {
          if (isNightModeRef.current) {
            sunLight.color.setHex(0x38bdf8);
            sunLight.intensity = 0.85;
            ambLight.color.setHex(0x1e293b);
            ambLight.intensity = 0.65;
          } else {
            sunLight.color.setHex(0xfff7ed);
            sunLight.intensity = 3.0;
            ambLight.color.setHex(0xdbeafe);
            ambLight.intensity = 1.6;
          }
        }

        // Smooth dynamic 3D <-> 2D altitude/zoom scaling (IndiaAgain contract)
        const currentZoom = map.getZoom();
        const colony = (this as any).colonyGroup as THREE.Group | undefined;
        if (colony) {
          // Between zoom 14.5 and 16.2, smoothly scale only the architectural villa and character avatar;
          // the access road connector connects real-world GPS coordinates and must stay 1:1 scale so it never pulls back or breaks
          const zoomFactor = Math.max(0, Math.min(1, (currentZoom - 14.5) / 1.7));
          const villa = colony.children.find((c) => c.name === "nerqiva_3d_villa");
          if (villa) {
            villa.scale.set(1.4 * zoomFactor, 1.4 * zoomFactor, 1.4 * zoomFactor);
          }
          const p3d = (this as any).player3D;
          if (p3d?.group) {
            p3d.group.scale.set(1.25 * zoomFactor, 1.25 * zoomFactor, 1.25 * zoomFactor);
          }
        }

        // Update 3D player walk cycle and position
        const p3d = (this as any).player3D;
        if (p3d) {
          const t = performance.now() * 0.001;
          p3d.updateWalk(t, isWalkingRef.current);
          p3d.group.position.set(playerLocalPosRef.current.x, 0, playerLocalPosRef.current.z);
          p3d.group.rotation.y = playerLocalPosRef.current.heading;
        }

        const coord = maplibregl.MercatorCoordinate.fromLngLat(NERQIVA_COORDS, 0);
        const scale = coord.meterInMercatorCoordinateUnits();

        const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        const rotationY = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), 0.25);

        const m4 = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
          .makeTranslation(coord.x, coord.y, coord.z)
          .scale(new THREE.Vector3(scale, -scale, scale))
          .multiply(rotationX)
          .multiply(rotationY);

        const cam = (this as any).camera;
        cam.projectionMatrix = m4.multiply(l);
        cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

        const ren = (this as any).renderer;
        if (ren) {
          ren.resetState();
          ren.render((this as any).scene, cam);
        }
        map.triggerRepaint();
      },
    };

    // Function to ensure 3D extrusions, sky atmosphere, road styling, and Three.js layers persist across style changes (Day/Night)
    const setup3DOnMap = () => {
      if (!map) return;

      const isDark = map.getStyle()?.name?.toLowerCase().includes("dark") || isNightMode;

      // 1. Permanent Sky & Atmospheric Horizon (ZERO ground fog so terrain and roads are 100% visible)
      try {
        if (!isDark) {
          map.setSky({
            "sky-color": "#38bdf8",
            "sky-horizon-blend": 0.4,
            "horizon-color": "#bae6fd",
            "horizon-fog-blend": 0.5,
            "fog-color": "#bae6fd",
            "fog-ground-blend": 0.0, // FIX: Ground is crystal clear, no whiteout
          });
        } else {
          map.setSky({
            "sky-color": "#020617",
            "sky-horizon-blend": 0.5,
            "horizon-color": "#0f172a",
            "horizon-fog-blend": 0.6,
            "fog-color": "#020617",
            "fog-ground-blend": 0.0,
          });
        }
      } catch (e) {
        console.warn("[LiveOsmMap] setSky warning:", e);
      }

      // 2. High-Contrast Production Road & Basemap Styling (Fixes washed-out / invisible roads in Day theme)
      try {
        if (!isDark) {
          if (map.getLayer("background")) {
            map.setPaintProperty("background", "background-color", "#f8fafc");
          }
          if (map.getLayer("water")) {
            map.setPaintProperty("water", "fill-color", "#38bdf8");
            map.setPaintProperty("water", "fill-opacity", 0.95);
          }
          if (map.getLayer("landcover")) {
            map.setPaintProperty("landcover", "fill-color", "#dcfce7");
            map.setPaintProperty("landcover", "fill-opacity", 0.65);
          }
          if (map.getLayer("landuse_residential")) {
            map.setPaintProperty("landuse_residential", "fill-color", "#f1f5f9");
            map.setPaintProperty("landuse_residential", "fill-opacity", 0.85);
          }

          // Physically accurate zoom-adaptive width matching 3.0m fill and 3.76m casing across all zooms
          const minorCaseWidth: any = [
            "interpolate", ["exponential", 2], ["zoom"],
            14, 2.5,
            15, 3.2,
            16, 4.5,
            17, 6.5,
            18, 10.5,
            19, 18.0,
            20, 32.5,
            21, 63.0,
            22, 125.0
          ];
          const minorFillWidth: any = [
            "interpolate", ["exponential", 2], ["zoom"],
            14, 1.5,
            15, 2.0,
            16, 3.0,
            17, 4.5,
            18, 7.5,
            19, 13.0,
            20, 24.5,
            21, 47.5,
            22, 95.0
          ];
          const secCaseWidth: any = ["interpolate", ["linear"], ["zoom"], 14, 4, 16, 8, 18, 18];
          const secFillWidth: any = ["interpolate", ["linear"], ["zoom"], 14, 2.5, 16, 6, 18, 14];

          if (map.getLayer("road_minor_case")) {
            map.setLayoutProperty("road_minor_case", "line-cap", "round");
            map.setPaintProperty("road_minor_case", "line-color", "#64748b");
            map.setPaintProperty("road_minor_case", "line-width", minorCaseWidth);
            map.setPaintProperty("road_minor_case", "line-opacity", 1.0);
          }
          if (map.getLayer("road_minor_fill")) {
            map.setLayoutProperty("road_minor_fill", "line-cap", "round");
            map.setPaintProperty("road_minor_fill", "line-color", "#ffffff");
            map.setPaintProperty("road_minor_fill", "line-width", minorFillWidth);
            map.setPaintProperty("road_minor_fill", "line-opacity", 1.0);
          }
          if (map.getLayer("road_service_case")) {
            map.setLayoutProperty("road_service_case", "line-cap", "round");
            map.setPaintProperty("road_service_case", "line-color", "#94a3b8");
            map.setPaintProperty("road_service_case", "line-width", minorCaseWidth);
            map.setPaintProperty("road_service_case", "line-opacity", 0.9);
          }
          if (map.getLayer("road_service_fill")) {
            map.setLayoutProperty("road_service_fill", "line-cap", "round");
            map.setPaintProperty("road_service_fill", "line-color", "#ffffff");
            map.setPaintProperty("road_service_fill", "line-width", minorFillWidth);
            map.setPaintProperty("road_service_fill", "line-opacity", 1.0);
          }
          if (map.getLayer("road_path")) {
            map.setPaintProperty("road_path", "line-color", "#94a3b8");
            map.setPaintProperty("road_path", "line-width", 2.2);
          }
          if (map.getLayer("road_sec_case_noramp")) {
            map.setPaintProperty("road_sec_case_noramp", "line-color", "#334155");
            map.setPaintProperty("road_sec_case_noramp", "line-width", secCaseWidth);
          }
          if (map.getLayer("road_sec_fill_noramp")) {
            map.setPaintProperty("road_sec_fill_noramp", "line-color", "#fed7aa");
            map.setPaintProperty("road_sec_fill_noramp", "line-width", secFillWidth);
          }
          if (map.getLayer("road_pri_case_noramp")) {
            map.setPaintProperty("road_pri_case_noramp", "line-color", "#1e293b");
            map.setPaintProperty("road_pri_case_noramp", "line-width", secCaseWidth);
          }
          if (map.getLayer("road_pri_fill_noramp")) {
            map.setPaintProperty("road_pri_fill_noramp", "line-color", "#fef08a");
            map.setPaintProperty("road_pri_fill_noramp", "line-width", secFillWidth);
          }
        } else {
          // Night mode: maintain butt line-cap, matching width stops, and dark slate colors
          const minorCaseWidthNight: any = [
            "interpolate", ["exponential", 2], ["zoom"],
            14, 2.5,
            15, 3.2,
            16, 4.5,
            17, 6.5,
            18, 10.5,
            19, 18.0,
            20, 32.5,
            21, 63.0,
            22, 125.0
          ];
          const minorFillWidthNight: any = [
            "interpolate", ["exponential", 2], ["zoom"],
            14, 1.5,
            15, 2.0,
            16, 3.0,
            17, 4.5,
            18, 7.5,
            19, 13.0,
            20, 24.5,
            21, 47.5,
            22, 95.0
          ];

          if (map.getLayer("road_minor_case")) {
            map.setLayoutProperty("road_minor_case", "line-cap", "round");
            map.setPaintProperty("road_minor_case", "line-color", "#1e293b");
            map.setPaintProperty("road_minor_case", "line-width", minorCaseWidthNight);
          }
          if (map.getLayer("road_minor_fill")) {
            map.setLayoutProperty("road_minor_fill", "line-cap", "round");
            map.setPaintProperty("road_minor_fill", "line-color", "#0f172a");
            map.setPaintProperty("road_minor_fill", "line-width", minorFillWidthNight);
          }
          if (map.getLayer("road_service_case")) {
            map.setLayoutProperty("road_service_case", "line-cap", "round");
            map.setPaintProperty("road_service_case", "line-width", minorCaseWidthNight);
          }
          if (map.getLayer("road_service_fill")) {
            map.setLayoutProperty("road_service_fill", "line-cap", "round");
            map.setPaintProperty("road_service_fill", "line-width", minorFillWidthNight);
          }
          if (map.getLayer("road_sec_case_noramp")) {
            map.setPaintProperty("road_sec_case_noramp", "line-color", "#38bdf8");
          }
          if (map.getLayer("road_sec_fill_noramp")) {
            map.setPaintProperty("road_sec_fill_noramp", "line-color", "#0369a1");
          }
        }
      } catch (roadErr) {
        console.warn("[LiveOsmMap] Road contrast enhance:", roadErr);
      }

      // 3. Automated Seamless OSM Connector Road
      // Directly connects Nerqiva Studio to the OpenStreetMap residential road with 100% native zoom adaptivity
      try {
        const connectorCoords = getConnectorRoadCoordinates();
        if (map.getSource("nerqiva-connector")) {
          (map.getSource("nerqiva-connector") as maplibregl.GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: connectorCoords },
          });
        } else {
          map.addSource("nerqiva-connector", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: connectorCoords },
            },
          });
        }

        const caseColor = !isDark ? "#64748b" : "#1e293b";
        const fillColor = !isDark ? "#ffffff" : "#0f172a";
        const caseWidth = !isDark ? [
          "interpolate", ["exponential", 2], ["zoom"],
          14, 2.5,
          15, 3.2,
          16, 4.5,
          17, 6.5,
          18, 10.5,
          19, 18.0,
          20, 32.5,
          21, 63.0,
          22, 125.0
        ] : [
          "interpolate", ["exponential", 2], ["zoom"],
          14, 2.5,
          15, 3.2,
          16, 4.5,
          17, 6.5,
          18, 10.5,
          19, 18.0,
          20, 32.5,
          21, 63.0,
          22, 125.0
        ];
        const fillWidth = !isDark ? [
          "interpolate", ["exponential", 2], ["zoom"],
          14, 1.5,
          15, 2.0,
          16, 3.0,
          17, 4.5,
          18, 7.5,
          19, 13.0,
          20, 24.5,
          21, 47.5,
          22, 95.0
        ] : [
          "interpolate", ["exponential", 2], ["zoom"],
          14, 1.5,
          15, 2.0,
          16, 3.0,
          17, 4.5,
          18, 7.5,
          19, 13.0,
          20, 24.5,
          21, 47.5,
          22, 95.0
        ];

        if (!map.getLayer("nerqiva-connector-case")) {
          map.addLayer(
            {
              id: "nerqiva-connector-case",
              type: "line",
              source: "nerqiva-connector",
              layout: {
                "line-cap": "round",
                "line-join": "round",
              },
              paint: {
                "line-color": caseColor,
                "line-width": caseWidth as any,
                "line-opacity": 1.0,
              },
            },
            map.getLayer("road_minor_case") ? "road_minor_case" : undefined
          );
        } else {
          map.setPaintProperty("nerqiva-connector-case", "line-color", caseColor);
          map.setPaintProperty("nerqiva-connector-case", "line-width", caseWidth as any);
        }

        if (!map.getLayer("nerqiva-connector-fill")) {
          map.addLayer(
            {
              id: "nerqiva-connector-fill",
              type: "line",
              source: "nerqiva-connector",
              layout: {
                "line-cap": "round",
                "line-join": "round",
              },
              paint: {
                "line-color": fillColor,
                "line-width": fillWidth as any,
                "line-opacity": 1.0,
              },
            },
            map.getLayer("road_minor_fill") ? "road_minor_fill" : undefined
          );
        } else {
          map.setPaintProperty("nerqiva-connector-fill", "line-color", fillColor);
          map.setPaintProperty("nerqiva-connector-fill", "line-width", fillWidth as any);
        }
      } catch (connErr) {
        console.warn("[LiveOsmMap] Connector road setup error:", connErr);
      }



      // 4. Add 3D Building Extrusions from Carto vector tiles for surrounding city context
      try {
        if (!map.getLayer("3d-city-buildings") && map.getSource("protomaps")) {
          const layers = map.getStyle().layers;
          let labelLayerId: string | undefined;
          for (let i = 0; i < (layers?.length || 0); i++) {
            if (layers![i].type === "symbol" && (layers![i].layout as any)?.["text-field"]) {
              labelLayerId = layers![i].id;
              break;
            }
          }
          map.addLayer(
            {
              id: "3d-city-buildings",
              source: "protomaps",
              "source-layer": "buildings",
              type: "fill-extrusion",
              minzoom: 15,
              paint: {
                "fill-extrusion-color": [
                  "interpolate",
                  ["linear"],
                  ["coalesce", ["get", "render_height"], ["get", "height"], 10],
                  0, "#f8fafc",
                  15, "#e2e8f0",
                  35, "#cbd5e1"
                ],
                "fill-extrusion-height": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  15, 0,
                  16, ["coalesce", ["get", "render_height"], ["get", "height"], 12]
                ],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
                "fill-extrusion-opacity": 0.65,
              },
            },
            labelLayerId
          );
        }
      } catch (e) {
        console.warn("[LiveOsmMap] 3D extrusion warning:", e);
      }

      // 5. Add True 3D Three.js Custom Building Layer (Nerqiva Studio Villa, Free Plots, Trees, Streetlights)
      if (!map.getLayer("nerqiva-3d-commercial-layer")) {
        try {
          map.addLayer(custom3DLayer);
        } catch (err) {
          console.error("[LiveOsmMap] Custom 3D Layer error:", err);
        }
      }
    };

    map.on("load", () => {
      setMapLoaded(true);
      (window as any).__map = map;

      // Add navigation controls (zoom, compass)
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      map.addControl(
        new maplibregl.AttributionControl({ compact: true, customAttribution: "OpenStreetMap · Spotlight Bazaar" }),
        "bottom-left"
      );

      // Smooth dynamic 3D Drone Perspective <-> 2D Regional Map Transition + close-up card fade
      map.on("zoom", () => {
        const z = map.getZoom();
        // Smoothly hide HTML floating card when zoomed ultra-close / 3rd-person so 3D "NERQIVA" facade signage stays unobstructed
        markersRef.current.forEach((m) => {
          const el = m.getElement();
          if (el) {
            const hide = isWalkModeRef.current || z >= 19.9;
            el.style.visibility = hide ? "hidden" : "visible";
            el.style.pointerEvents = hide ? "none" : "auto";
          }
        });

        if (isFlightActiveRef.current) return;
        if (z < 15.6) {
          if (is3DMode) {
            setIs3DMode(false);
            map.easeTo({ pitch: 0, bearing: 0, duration: 400 });
          }
        } else if (z >= 16.5) {
          if (!is3DMode) {
            setIs3DMode(true);
            map.easeTo({ pitch: 58, bearing: 25, duration: 400 });
          }
        }
      });

      // Keep character aligned to camera eye view when user drags/rotates in 3rd-person walk mode
      map.on("rotate", () => {
        if (!isWalkModeRef.current || isProgrammaticCamRef.current) return;
        const b = map.getBearing();
        walkBearingRef.current = b;
        playerLocalPosRef.current.heading = bearingToHeading(b);
        const { x, z } = playerLocalPosRef.current;
        isProgrammaticCamRef.current = true;
        map.setCenter(getThirdPersonCenter(x, z, b, WALK_LOOKAHEAD));
        isProgrammaticCamRef.current = false;
      });

      // Proximity-based click detection on Nerqiva Studio 3D model and street walk
      map.on("click", (e) => {
        const clickLng = e.lngLat.lng;
        const clickLat = e.lngLat.lat;

        // Haversine distance in meters
        const getDistMeters = (lon1: number, lat1: number, lon2: number, lat2: number) => {
          const dLat = (lat2 - lat1) * (Math.PI / 180);
          const dLon = (lon2 - lon1) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const distToNerqiva = getDistMeters(clickLng, clickLat, NERQIVA_COORDS[0], NERQIVA_COORDS[1]);

        if (distToNerqiva <= 24) {
          if (onStorefrontSelect) onStorefrontSelect(nerqivaBusiness);
          bazaarAudio.playStorefrontChime();
          showToast("✨ Nerqiva Studio · North Guwahati Flagship");
          return;
        }

        // Click-to-walk within 80m of Nerqiva Studio
        if (distToNerqiva <= 80) {
          playerPosRef.current = [clickLng, clickLat];
          playerMarkerRef.current?.setLngLat([clickLng, clickLat]);
          isWalkingRef.current = true;
          setIsWalking(true);
          setTimeout(() => {
            isWalkingRef.current = false;
            setIsWalking(false);
          }, 300);
          map.easeTo({ center: [clickLng, clickLat], duration: 250 });
        }
      });

      setup3DOnMap();
    });

    map.on("style.load", () => {
      setup3DOnMap();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync Camera when selected city changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (currentCity.slug === "guwahati" || currentCity.name.toLowerCase() === "guwahati") {
      mapRef.current.flyTo({
        center: NERQIVA_COORDS,
        zoom: 18.2,
        pitch: is3DMode ? 58 : 0,
        bearing: is3DMode ? 25 : 0,
        speed: 1.2,
        essential: true,
      });
    } else {
      mapRef.current.flyTo({
        center: [currentCity.lon, currentCity.lat],
        zoom: 14.2,
        pitch: is3DMode ? 52 : 0,
        bearing: is3DMode ? 25 : 0,
        speed: 1.4,
        essential: true,
      });
    }
  }, [currentCity, mapLoaded, is3DMode]);

  // Sync 3D Drone Mode (Tilt between 58° and 0°)
  const toggle3DDrone = useCallback(() => {
    if (!mapRef.current) return;
    const next3D = !is3DMode;
    setIs3DMode(next3D);
    mapRef.current.easeTo({
      pitch: next3D ? 58 : 0,
      bearing: next3D ? 25 : 0,
      duration: 1000,
    });
  }, [is3DMode]);

  // Sync Night / Day Mode
  const toggleNightMode = useCallback(() => {
    if (!mapRef.current) return;
    const nextNight = !isNightMode;
    setIsNightMode(nextNight);
    mapRef.current.setStyle(nextNight ? CARTO_DARK_MATTER_STYLE : CARTO_VOYAGER_STYLE);
  }, [isNightMode]);

  // Reset Camera View to Nerqiva Studio
  const handleResetCamera = useCallback(() => {
    if (!mapRef.current) return;
    isFlightActiveRef.current = true;
    setIsWalkMode(false);
    isWalkModeRef.current = false;
    setIs3DMode(true);
    markersRef.current.forEach((m) => {
      const el = m.getElement();
      if (el) {
        el.style.visibility = "visible";
        el.style.pointerEvents = "auto";
      }
    });
    mapRef.current.flyTo({
      center: NERQIVA_COORDS,
      zoom: 18.2,
      pitch: 58,
      bearing: 25,
      essential: true,
    });
    mapRef.current.once("moveend", () => {
      isFlightActiveRef.current = false;
    });
    showToast("📍 Focused on Nerqiva Studio · North Guwahati (PIN 781030)");
  }, [showToast]);

  // Smooth 60fps 3rd-Person Game Navigation (WASD / Arrows / Q-E) — Camera ALWAYS stays behind character's back following eye view
  useEffect(() => {
    const MOVE_KEYS = new Set([
      "KeyW",
      "KeyS",
      "KeyA",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyQ",
      "KeyE",
    ]);

    const startWalkLoop = () => {
      if (walkRafRef.current !== null) return;
      lastWalkFrameRef.current = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.05, Math.max(0.004, (now - lastWalkFrameRef.current) / 1000));
        lastWalkFrameRef.current = now;
        stepThirdPersonFrame(dt);
        if (pressedKeysRef.current.size > 0) {
          walkRafRef.current = requestAnimationFrame(tick);
        } else {
          walkRafRef.current = null;
          isWalkingRef.current = false;
          setIsWalking(false);
        }
      };
      walkRafRef.current = requestAnimationFrame(tick);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!mapRef.current) return;

      shiftHeldRef.current = e.shiftKey;
      if (!MOVE_KEYS.has(e.code)) return;

      if (e.code.startsWith("Arrow")) {
        e.preventDefault();
      }

      // Automatically enter 3rd-person behind-the-back POV when starting to walk
      if (!isWalkModeRef.current) {
        setIsWalkMode(true);
        isWalkModeRef.current = true;
        const { x, z, heading } = playerLocalPosRef.current;
        const behindBearing = headingToBearing(heading);
        walkBearingRef.current = behindBearing;
        markersRef.current.forEach((m) => {
          const el = m.getElement();
          if (el) {
            el.style.visibility = "hidden";
            el.style.pointerEvents = "none";
          }
        });
        isProgrammaticCamRef.current = true;
        mapRef.current.jumpTo({
          center: getThirdPersonCenter(x, z, behindBearing, WALK_LOOKAHEAD),
          bearing: behindBearing,
          zoom: Math.max(mapRef.current.getZoom(), WALK_ZOOM),
          pitch: Math.max(mapRef.current.getPitch(), WALK_PITCH),
        });
        isProgrammaticCamRef.current = false;
      }

      const wasEmpty = pressedKeysRef.current.size === 0;
      pressedKeysRef.current.add(e.code);

      // Immediate responsive micro-step on initial tap + continuous 60fps loop while held
      if (wasEmpty) {
        stepThirdPersonFrame(0.032);
      }
      startWalkLoop();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      shiftHeldRef.current = e.shiftKey;
      if (MOVE_KEYS.has(e.code)) {
        pressedKeysRef.current.delete(e.code);
        if (pressedKeysRef.current.size === 0) {
          handleStopMove();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleStopMove);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleStopMove);
      handleStopMove();
    };
  }, [getThirdPersonCenter, handleStopMove, headingToBearing, stepThirdPersonFrame]);

  // RENDER SOLE REAL BUSINESS LISTING: NERQIVA STUDIO
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (playerMarkerRef.current) {
      playerMarkerRef.current.remove();
      playerMarkerRef.current = null;
    }

    // 1. Nerqiva Studio Flagship Business Plot: Clean Glassmorphic Studio Card (no unverified badges or locations)
    const cardEl = document.createElement("div");
    cardEl.className = "cursor-pointer select-none relative group pointer-events-auto flex flex-col items-center";
    cardEl.innerHTML = `
      <div class="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#080B12]/95 border border-amber-500/75 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl hover:scale-105 hover:border-amber-400 transition-all">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div class="flex flex-col text-left">
          <div class="flex items-center gap-2">
            <span class="text-xs font-black text-white tracking-tight">Nerqiva Studio</span>
            <span class="text-[10px] font-medium text-amber-400/90">nerqivastudio.in</span>
          </div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-[10px] text-neutral-300 font-medium">Digital Products &amp; Web Infrastructure</span>
            <span class="text-neutral-500 text-[10px]">·</span>
            <span class="text-[10px] text-neutral-400">North Guwahati</span>
          </div>
        </div>
      </div>
      <div class="w-2.5 h-2.5 -mt-1 bg-[#080B12] rotate-45 border-r border-b border-amber-500/75"></div>
    `;
    cardEl.addEventListener("click", () => {
      if (onStorefrontSelect) onStorefrontSelect(nerqivaBusiness);
      bazaarAudio.playStorefrontChime();
    });
    const studioMarker = new maplibregl.Marker({
      element: cardEl,
      anchor: "bottom",
      offset: [0, -125],
    })
      .setLngLat(NERQIVA_COORDS)
      .addTo(mapRef.current!);
    markersRef.current.push(studioMarker);

  }, [mapLoaded, currentCity, nerqivaBusiness, onStorefrontSelect, showToast]);

  // Autocomplete search filtering
  const q = (searchQuery || "").trim().toLowerCase();
  const searchResults = q
    ? storefronts.filter((s) => {
        const nameMatch = Boolean(s?.name) && s.name.toLowerCase().includes(q);
        const taglineMatch = Boolean(s?.tagline) && s.tagline!.toLowerCase().includes(q);
        const cityMatch = Boolean(s?.city_name) && s.city_name!.toLowerCase().includes(q);
        return nameMatch || taglineMatch || cityMatch;
      })
    : [];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a1120]">
      {/* 1. MAPLIBRE GL CONTAINER — REAL OPENSTREETMAP BASE (IMAGE 1 BASED) */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2. TOP UNIFIED BAR (INDIA AGAIN STYLE) */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Brand + See All of India Button */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 shadow-2xl">
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

          <button
            type="button"
            onClick={() => {
              if (mapRef.current) {
                isFlightActiveRef.current = true;
                setIs3DMode(false);
                mapRef.current.flyTo({
                  center: [78.9629, 22.5937],
                  zoom: 4.8,
                  pitch: 0,
                  bearing: 0,
                  duration: 1400,
                });
                mapRef.current.once("moveend", () => {
                  isFlightActiveRef.current = false;
                });
                onCitySelect(null);
                showToast("🇮🇳 Viewing India National Map");
              }
            }}
            className="px-3 py-1.5 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-amber-500/60 text-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">See all of India</span>
            <span className="sm:hidden">India</span>
          </button>
        </div>

        {/* Center: Omnibox Search Bar */}
        <div className="relative flex-1 max-w-md pointer-events-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-neutral-300 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${nerqivaBusiness.name}, Guwahati, or services...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              onFocus={() => setSearchFocused(true)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-neutral-700/80 text-white text-xs font-medium placeholder:text-neutral-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 shadow-2xl transition-all"
            />
          </div>

          {/* Autocomplete Results */}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 inset-x-0 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl p-2 max-h-60 overflow-y-auto z-30">
              {searchResults.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSearchFocused(false);
                    setSearchQuery("");
                    if (onStorefrontSelect) onStorefrontSelect(b);
                    if (b.lat && b.lon && mapRef.current) {
                      mapRef.current.flyTo({ center: [b.lon, b.lat], zoom: 16.6, pitch: 58 });
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-900 flex items-center justify-between text-xs text-white transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold">{b.name}</span>
                    <span className="text-[10px] text-neutral-400">{b.tagline || b.city_name}</span>
                  </div>
                  <span className="text-[11px] text-amber-400 font-mono">{b.starting_price || "Studio"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Controls & CTA */}
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          {onToggle3DMap && (
            <button
              type="button"
              onClick={onToggle3DMap}
              title="Switch to 3D Town View"
              className="px-2.5 py-1.5 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-amber-500/50 text-amber-400 text-xs font-bold flex items-center gap-1 shadow-2xl backdrop-blur-xl transition-all"
            >
              <span>🏢 3D Town</span>
            </button>
          )}

          <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 shadow-2xl">
            {/* 3D Drone Perspective Toggle */}
            <button
              onClick={toggle3DDrone}
              title={is3DMode ? "Switch to 2D Top-Down View" : "Switch to 3D Drone View"}
              className={`p-2 rounded-xl text-xs font-semibold transition-all ${
                is3DMode ? "text-amber-400 bg-amber-500/15" : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <Compass className="w-4 h-4" />
            </button>

            {/* Day / Night Theme */}
            <button
              onClick={toggleNightMode}
              title="Toggle Map Style"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              {isNightMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Recenter on Nerqiva Studio */}
            <button
              onClick={handleResetCamera}
              title="Recenter on Nerqiva Studio · North Guwahati"
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-neutral-300" />
            </button>
          </div>

          <Link
            href={`/register?city=${currentCity.slug}`}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-2xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Open a Shop</span>
          </Link>
        </div>
      </div>

      {/* TOAST PILL */}
      {toastMessage && (
        <div className="absolute top-20 inset-x-0 z-40 flex justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="px-4 py-2 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-2xl">
            {toastMessage}
          </div>
        </div>
      )}



      {/* 3. BOTTOM FLOATING CONTROLS CARD */}
      <div className="absolute bottom-6 inset-x-4 z-20 flex flex-col items-center gap-2 pointer-events-none">
        <div className="w-full max-w-lg p-3 sm:p-4 rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex flex-col gap-3 pointer-events-auto">
          {/* Status Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight">
                    Nerqiva Studio
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Studio Active
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400">
                  North Guwahati, Assam · PIN 781030 · Clear {isNightMode ? "night" : "day"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-medium text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>nerqivastudio.in</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onStorefrontSelect) onStorefrontSelect(nerqivaBusiness);
                bazaarAudio.playStorefrontChime();
              }}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ View Nerqiva Studio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nextWalk = !isWalkMode;
                if (nextWalk) {
                  enterThirdPersonWalkMode(true);
                  showToast("🚶 3rd-Person POV · W/S move · A/D turn · Shift sprint");
                } else {
                  handleStopMove();
                  handleResetCamera();
                }
              }}
              className={`py-2.5 px-3.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                isWalkMode
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-lg shadow-amber-500/20"
                  : "bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800"
              }`}
            >
              <Footprints className="w-4 h-4 text-amber-400" />
              <span>Walk (WASD)</span>
            </button>

            <button
              type="button"
              onClick={() => setDialogueStorefront(nerqivaBusiness)}
              className="py-2.5 px-3.5 rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800"
              title="Talk to Nerqiva Studio"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Talk</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  showToast("🔗 Nerqiva Studio map link copied!");
                }
              }}
              className="p-2.5 rounded-2xl text-xs font-medium flex items-center justify-center transition-all bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800"
              title="Share Link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Keyboard Controls Hint Pill (India Again Style) */}
        <div className="hidden md:flex items-center gap-2 pointer-events-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950/80 backdrop-blur-md border border-neutral-800/70 text-[10px] text-neutral-300 font-mono flex items-center gap-2 shadow-lg">
            <span>W A S D walk · Drag look 360° · Scroll zoom · Q / E turn · Shift faster</span>
          </div>
        </div>
      </div>

      {/* QUICK TALK & DIALOGUE MODALS */}
      <QuickTalkModal
        isOpen={showQuickTalkModal}
        onClose={() => setShowQuickTalkModal(false)}
        onSelectPhrase={(phrase) => {
          showToast(`💬 "${phrase}"`);
          bazaarAudio.playStorefrontChime();
        }}
      />

      <StorefrontDialogueModal
        storefront={dialogueStorefront}
        isOpen={Boolean(dialogueStorefront)}
        onClose={() => setDialogueStorefront(null)}
        onOpenFullProfile={(shop) => {
          if (onStorefrontSelect) onStorefrontSelect(shop);
        }}
      />
    </div>
  );
}
