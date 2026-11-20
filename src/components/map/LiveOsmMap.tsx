"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  RotateCcw,
  Globe2,
  X,
  Navigation,
  ExternalLink,
  Radio,
  ShieldCheck,
} from "lucide-react";
import {
  formatWebsiteDisplay,
  getGoogleMapsUrl,
  normalizeExternalUrl,
} from "@/lib/utils";
import {
  BROADCAST_TYPE_MAP,
  BROADCAST_TYPES,
} from "@/lib/constants/broadcasts";
import {
  LiveBroadcastEntry,
  LiveBroadcastsDrawer,
} from "@/components/map/LiveBroadcastsDrawer";
import { searchLocalIndiaPlaces, IndiaPlaceEntry } from "@/lib/geo/indiaPlaces";
import { INITIAL_CITIES } from "@/lib/constants/initialCities";
import { getLocalStorefronts } from "@/lib/utils/localStorefront";
import {
  bearingToThreeRotationY,
  extractNearbyOsmRoads,
  resolveAllStorefrontPlacements,
  SnappedPlotPlacement,
} from "@/lib/geo/plotSnapper";
import { QuickTalkModal } from "@/components/map3d/QuickTalkModal";
import { StorefrontDialogueModal } from "@/components/map3d/StorefrontDialogueModal";
import { bazaarAudio } from "@/lib/audio/bazaarAudio";
import * as THREE from "three";
import {
  createNerqivaVillaMesh,
  createCategoryPlotMesh,
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

// MapTiler & Fallback High-Powered Realism Satellite & 3D Terrain Configuration
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

// Satellite Tile Source (MapTiler Satellite with Esri World Imagery fallback)
const SATELLITE_TILE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`
  : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

// Terrain-RGB Raster-DEM Tile Source (MapTiler terrain-rgb-v2 with AWS Terrarium fallback)
const TERRAIN_TILE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=${MAPTILER_KEY}`
  : "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

const TERRAIN_ENCODING: "mapbox" | "terrarium" = MAPTILER_KEY ? "mapbox" : "terrarium";
const TERRAIN_TILE_SIZE = MAPTILER_KEY ? 512 : 256;
const TERRAIN_MAX_ZOOM = MAPTILER_KEY ? 14 : 15;

// Major Metros National HUD Coordinates (Image 3 Inspiration)
const MAJOR_INDIA_HUBS_GEOJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "New Delhi", tag: "Capital", zoom: 12.8, pitch: 52, bearing: -5 }, geometry: { type: "Point", coordinates: [77.2090, 28.6139] } },
    { type: "Feature", properties: { name: "Mumbai", tag: "Financial Hub", zoom: 12.8, pitch: 54, bearing: 15 }, geometry: { type: "Point", coordinates: [72.8777, 19.0760] } },
    { type: "Feature", properties: { name: "Bengaluru", tag: "Tech Silicon Hub", zoom: 12.8, pitch: 50, bearing: 10 }, geometry: { type: "Point", coordinates: [77.5946, 12.9716] } },
    { type: "Feature", properties: { name: "Chennai", tag: "Coastal Hub", zoom: 12.8, pitch: 50, bearing: 20 }, geometry: { type: "Point", coordinates: [80.2707, 13.0827] } },
    { type: "Feature", properties: { name: "Kolkata", tag: "Eastern Hub", zoom: 12.8, pitch: 52, bearing: -10 }, geometry: { type: "Point", coordinates: [88.3639, 22.5726] } },
  ],
};

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

// India-only hard bounds & national 3D island view constants
const INDIA_CENTER: [number, number] = [81.5, 20.6];
const INDIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [58.0, 0.5],
  [108.0, 42.5],
];
const INDIA_MIN_ZOOM = 3.9;

interface IndiaGeoData {
  landGeoJSON: GeoJSON.Feature<GeoJSON.MultiPolygon>;
  oceanMaskGeoJSON: GeoJSON.Feature<GeoJSON.Polygon>;
}

let cachedIndiaGeoDataPromise: Promise<IndiaGeoData | null> | null = null;

function ringSignedArea(ring: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return area / 2;
}

function normalizeClosedRing(raw: [number, number][], wantCCW: boolean): [number, number][] {
  const pts: [number, number][] = raw.map(([lon, lat]) => [lon, lat]);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    pts.push([first[0], first[1]]);
  }
  const isCCW = ringSignedArea(pts) > 0;
  if (isCCW !== wantCCW) {
    pts.reverse();
  }
  return pts;
}

function loadIndiaBoundaryData(): Promise<IndiaGeoData | null> {
  if (cachedIndiaGeoDataPromise) return cachedIndiaGeoDataPromise;
  cachedIndiaGeoDataPromise = fetch("/data/india-land.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data: { rings?: [number, number][][] }) => {
      if (!data?.rings || data.rings.length === 0) return null;

      // MultiPolygon of official Survey of India landmass + Andaman & Nicobar + Lakshadweep (CCW exterior rings)
      const multiPolyCoords = data.rings
        .filter((r) => r.length >= 3)
        .map((r) => [normalizeClosedRing(r, true)]);

      const landGeoJSON: GeoJSON.Feature<GeoJSON.MultiPolygon> = {
        type: "Feature",
        properties: { name: "India" },
        geometry: {
          type: "MultiPolygon",
          coordinates: multiPolyCoords,
        },
      };

      // Inverted globe ocean mask: outer globe ring CCW + all official India rings as CW holes
      const outerGlobeRing: [number, number][] = [
        [-180, -85],
        [180, -85],
        [180, 85],
        [-180, 85],
        [-180, -85],
      ];
      const holeRings = data.rings
        .filter((r) => r.length >= 3)
        .map((r) => normalizeClosedRing(r, false));

      const oceanMaskGeoJSON: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature",
        properties: { name: "Ocean Mask" },
        geometry: {
          type: "Polygon",
          coordinates: [outerGlobeRing, ...holeRings],
        },
      };

      return { landGeoJSON, oceanMaskGeoJSON };
    })
    .catch((err) => {
      console.warn("[LiveOsmMap] Failed to load india-land.json:", err);
      cachedIndiaGeoDataPromise = null;
      return null;
    });
  return cachedIndiaGeoDataPromise;
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
  const markersBySlugRef = useRef<Map<string, Marker>>(new Map());
  const playerMarkerRef = useRef<Marker | null>(null);
  const guwahatiBeaconMarkerRef = useRef<Marker | null>(null);
  const resolvedPlacementsRef = useRef<Map<string, SnappedPlotPlacement>>(new Map());
  const dynamicConnectorsGeoJSONRef = useRef<GeoJSON.FeatureCollection<GeoJSON.LineString>>({
    type: "FeatureCollection",
    features: [],
  });

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

  // Dynamic View Context (3-State Bottom Dock + 4-Tier LOD Markers + Hybrid Search)
  const [mapZoom, setMapZoom] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("city") || p.get("shop")) return 18.2;
    }
    return 4.3;
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const shopSlug = p.get("shop")?.toLowerCase();
      if (shopSlug) {
        const localMatch = getLocalStorefronts().find(
          (s) => s.slug.toLowerCase() === shopSlug
        );
        if (localMatch && typeof localMatch.lon === "number" && typeof localMatch.lat === "number") {
          return [localMatch.lon, localMatch.lat];
        }
        if (shopSlug === "nerqiva-studio") return NERQIVA_COORDS;
      }
      if (p.get("city")?.toLowerCase() === "guwahati") return NERQIVA_COORDS;
    }
    return INDIA_CENTER;
  });
  const [focusedRegion, setFocusedRegion] = useState<{
    name: string;
    subtitle: string;
    kind: "pincode" | "state" | "city" | "area";
    lat: number;
    lon: number;
  } | null>(null);
  const focusedRegionRef = useRef(focusedRegion);
  useEffect(() => {
    focusedRegionRef.current = focusedRegion;
  }, [focusedRegion]);
  const [focusedStorefront, setFocusedStorefront] = useState<BusinessStorefront | null>(null);
  const [remoteGeoResults, setRemoteGeoResults] = useState<
    { id: string; name: string; subtitle: string; kind: "pincode" | "state" | "city" | "area"; lat: number; lon: number; zoom: number }[]
  >([]);
  const [isSearchingGeo, setIsSearchingGeo] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number>(-1);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const searchPinMarkerRef = useRef<Marker | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Proximity Talk & Live Broadcasts Drawer
  const [showQuickTalkModal, setShowQuickTalkModal] = useState(false);
  const [dialogueStorefront, setDialogueStorefront] = useState<BusinessStorefront | null>(null);
  const [showBroadcastsDrawer, setShowBroadcastsDrawer] = useState(false);

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

  // Sole verified real listing fallback: Nerqiva Studio
  const nerqivaBusiness: BusinessStorefront = useMemo(
    () =>
      storefronts.find((b) => b.slug === "nerqiva-studio") || {
        id: "nerqiva-studio",
        slug: "nerqiva-studio",
        name: "Nerqiva Studio",
        tagline: "Digital Products & Web Infrastructure",
        description:
          "North Guwahati digital engineering studio crafting high-speed, conversion-optimized digital showrooms, web infrastructure, and mobile-first products.",
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
      },
    [storefronts]
  );

  // Normalized list of all real live storefronts on the map (scales automatically as new businesses join!)
  const allLiveStorefronts: BusinessStorefront[] = useMemo(() => {
    const valid = storefronts.filter((b) => typeof b.lat === "number" && typeof b.lon === "number");
    const hasNerqiva = valid.some((b) => b.slug === "nerqiva-studio");
    return hasNerqiva ? valid : [nerqivaBusiness, ...valid];
  }, [storefronts, nerqivaBusiness]);

  // Flatten all currently active (non-expired) live street broadcasts across India
  const liveBroadcastEntries: LiveBroadcastEntry[] = useMemo(() => {
    const nowMs = Date.now();
    const list: LiveBroadcastEntry[] = [];
    for (const s of allLiveStorefronts) {
      for (const post of s.active_posts || []) {
        if (new Date(post.expires_at).getTime() > nowMs) {
          list.push({ post, storefront: s });
        }
      }
    }
    return list.sort(
      (a, b) => new Date(b.post.created_at).getTime() - new Date(a.post.created_at).getTime()
    );
  }, [allLiveStorefronts]);

  const allLiveStorefrontsRef = useRef<BusinessStorefront[]>(allLiveStorefronts);
  useEffect(() => {
    allLiveStorefrontsRef.current = allLiveStorefronts;
  }, [allLiveStorefronts]);

  // Automatically snap & interconnect every registered business plot with strictly real OSM street roads
  const recomputePlotPlacements = useCallback((map: MapLibreMap | null) => {
    if (!map || !map.getStyle()) return;
    const center = map.getCenter();
    const osmRoads =
      map.getZoom() >= 13.0
        ? extractNearbyOsmRoads(map, center.lng, center.lat, 650)
        : [];

    const { resolvedBySlug, connectorsGeoJSON } = resolveAllStorefrontPlacements({
      storefronts: allLiveStorefrontsRef.current,
      osmRoads,
    });

    resolvedPlacementsRef.current = resolvedBySlug;
    dynamicConnectorsGeoJSONRef.current = connectorsGeoJSON;

    const connSrc = map.getSource("dynamic-plot-connectors") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (connSrc) {
      connSrc.setData(connectorsGeoJSON);
    }

    // Keep floating storefront cards centered directly above each snapped 3D plot
    resolvedBySlug.forEach((placement, slug) => {
      const m = markersBySlugRef.current.get(slug);
      if (m) {
        m.setLngLat([placement.lon, placement.lat]);
      }
    });
  }, []);

  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      recomputePlotPlacements(mapRef.current);
    }
  }, [mapLoaded, allLiveStorefronts, recomputePlotPlacements]);

  // Dynamic active cities summary for All-India National Explorer bar
  const activeCityGroups = useMemo(() => {
    const groups = new Map<string, { city: string; state: string; count: number; lat: number; lon: number; storefronts: BusinessStorefront[] }>();
    for (const s of allLiveStorefronts) {
      const cityKey = (s.city_name || "Guwahati").trim();
      const existing = groups.get(cityKey);
      if (existing) {
        existing.count += 1;
        existing.storefronts.push(s);
      } else {
        groups.set(cityKey, {
          city: cityKey,
          state: s.state_name || "India",
          count: 1,
          lat: s.lat,
          lon: s.lon,
          storefronts: [s],
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [allLiveStorefronts]);

  // GeoJSON FeatureCollection for native MapLibre WebGL clustering & glowing national beacons
  const storefrontsGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: allLiveStorefronts.map((s) => ({
        type: "Feature",
        properties: {
          id: s.id,
          slug: s.slug,
          name: s.name,
          city: s.city_name || "",
          state: s.state_name || "",
          pincode: s.pincode || "",
          tagline: s.tagline || "",
          plot_level: s.plot_level || 1,
          accent_color: s.plot_config?.accentColor || "#f59e0b",
        },
        geometry: {
          type: "Point",
          coordinates: [s.lon, s.lat],
        },
      })),
    }),
    [allLiveStorefronts]
  );

  const storefrontsGeoJSONRef = useRef(storefrontsGeoJSON);
  useEffect(() => {
    storefrontsGeoJSONRef.current = storefrontsGeoJSON;
    const src = mapRef.current?.getSource("storefronts-cluster-source") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(storefrontsGeoJSON);
    }
  }, [storefrontsGeoJSON]);

  // Haversine distance in kilometers
  const getDistanceKm = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // Debounced live India geocoder for any 6-digit PIN code or locality
  useEffect(() => {
    const qTrim = searchQuery.trim();
    if (qTrim.length < 2) {
      setRemoteGeoResults([]);
      setIsSearchingGeo(false);
      return;
    }

    let cancelled = false;
    setIsSearchingGeo(true);
    const timer = setTimeout(() => {
      fetch(`/api/geo/search?q=${encodeURIComponent(qTrim)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && Array.isArray(d?.results)) {
            setRemoteGeoResults(d.results);
          }
        })
        .catch(() => {
          if (!cancelled) setRemoteGeoResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearchingGeo(false);
        });
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Reset keyboard selection index whenever query changes
  useEffect(() => {
    setActiveSuggestionIdx(-1);
  }, [searchQuery]);

  // Dismiss search dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Initialize MapLibre GL Map locked strictly to India (3D India Island -> Real OSM Street View)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const urlShopSlug = params?.get("shop")?.toLowerCase() || "";
    const urlCityParam = params?.get("city")?.toLowerCase() || "";
    const matchedDeepLinkShop = urlShopSlug
      ? [...allLiveStorefrontsRef.current, ...getLocalStorefronts()].find(
          (s) => s.slug.toLowerCase() === urlShopSlug
        )
      : undefined;
    const matchedCity = urlCityParam
      ? INITIAL_CITIES.find(
          (c) =>
            c.slug.toLowerCase() === urlCityParam ||
            c.name.toLowerCase() === urlCityParam
        )
      : undefined;
    const urlPlace = params?.get("place") || params?.get("pin");
    const urlLat = params?.get("lat") ? parseFloat(params.get("lat")!) : NaN;
    const urlLon = params?.get("lon") ? parseFloat(params.get("lon")!) : NaN;
    const urlZoom = params?.get("z") ? parseFloat(params.get("z")!) : NaN;
    const hasPlaceDeepLink = Boolean(urlPlace && Number.isFinite(urlLat) && Number.isFinite(urlLon));

    // Cinematic GTA 6 Oblique Perspective (Towering Himalayas + 3D Terrain + Coastlines)
    let initialCenter: [number, number] = [81.5, 21.0];
    let initialZoom = 4.5;
    let initialPitch = 56;
    let initialBearing = -8;

    if (matchedDeepLinkShop) {
      initialCenter = [matchedDeepLinkShop.lon, matchedDeepLinkShop.lat];
      initialZoom = 18.2;
      initialPitch = 58;
      initialBearing = 22;
      setFocusedStorefront(matchedDeepLinkShop);
      setMapZoom(initialZoom);
      setMapCenter(initialCenter);
    } else if (urlShopSlug === "nerqiva-studio") {
      initialCenter = NERQIVA_COORDS;
      initialZoom = 18.2;
      initialPitch = 56;
      initialBearing = 35;
    } else if (matchedCity) {
      initialCenter = [matchedCity.lon, matchedCity.lat];
      initialZoom = 12;
      initialPitch = 48;
      initialBearing = 0;
      setFocusedRegion({
        name: matchedCity.name,
        subtitle: "India",
        kind: "city",
        lat: matchedCity.lat,
        lon: matchedCity.lon,
      });
      setMapZoom(initialZoom);
      setMapCenter(initialCenter);
    } else if (hasPlaceDeepLink) {
      initialCenter = [urlLon, urlLat];
      initialZoom = Number.isFinite(urlZoom) ? Math.max(INDIA_MIN_ZOOM, Math.min(20, urlZoom)) : 12.5;
      initialPitch = initialZoom >= 14 ? 52 : 44;
      initialBearing = 0;
      const isPinParam = Boolean(params?.get("pin"));
      setFocusedRegion({
        name: isPinParam ? `PIN ${urlPlace}` : urlPlace!,
        subtitle: "India",
        kind: isPinParam ? "pincode" : initialZoom <= 8 ? "state" : initialZoom <= 13 ? "city" : "area",
        lat: urlLat,
        lon: urlLon,
      });
      setMapZoom(initialZoom);
      setMapCenter(initialCenter);
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: isNightMode ? CARTO_DARK_MATTER_STYLE : CARTO_VOYAGER_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      pitch: initialPitch,
      bearing: initialBearing,
      minZoom: INDIA_MIN_ZOOM,
      maxBounds: INDIA_MAX_BOUNDS,
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
          const villa = createCategoryPlotMesh("tech-freelance", {
            plotLevel: 1,
            facadeTheme: "default",
            accentColor: "#f59e0b",
          });
          villa.name = "nerqiva_3d_villa";
          villa.scale.set(1.4, 1.4, 1.4);
          villa.position.set(0, 0, 0);
          villa.rotation.y = roadAngle; // Perfectly aligned with the road and driveway!
          colonyGroup.add(villa);

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
          (this as any).categoryPlots = new Map<
            string,
            {
              categoryId: string;
              scene: THREE.Scene;
              sun: THREE.DirectionalLight;
              amb: THREE.AmbientLight;
              mesh: THREE.Group;
            }
          >();
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

          // Dynamically sync Nerqiva Studio customizations from allLiveStorefronts
          const nqStorefront = allLiveStorefrontsRef.current.find((s) => s?.slug === "nerqiva-studio");
          const pLevel = (nqStorefront?.plot_level === 3 ? 3 : nqStorefront?.plot_level === 2 ? 2 : 1) as 1 | 2 | 3;
          const pTheme = nqStorefront?.plot_config?.facadeTheme || "default";
          const pAccent = nqStorefront?.plot_config?.accentColor || "";
          const pGarden = nqStorefront?.plot_config?.gardenStyle || "none";
          const pVehicle = nqStorefront?.plot_config?.drivewayVehicle || "none";
          const pLighting = nqStorefront?.plot_config?.lightingStyle || "neon";
          const pBanner = nqStorefront?.plot_config?.bannerStyle || "none";
          const pWall = nqStorefront?.plot_config?.wallAccent || "standard";
          const nqKey = `${pLevel}|${pTheme}|${pAccent}|${pGarden}|${pVehicle}|${pLighting}|${pBanner}|${pWall}`;

          if ((this as any).lastNerqivaKey !== nqKey) {
            (this as any).lastNerqivaKey = nqKey;
            const currentVilla = colony.children.find((c) => c.name === "nerqiva_3d_villa");
            if (currentVilla) {
              colony.remove(currentVilla);
            }
            const updatedVilla = createCategoryPlotMesh("tech-freelance", {
              plotLevel: pLevel,
              facadeTheme: pTheme,
              accentColor: pAccent || undefined,
              gardenStyle: pGarden,
              drivewayVehicle: pVehicle,
              lightingStyle: pLighting,
              bannerStyle: pBanner,
              wallAccent: pWall,
            });
            updatedVilla.name = "nerqiva_3d_villa";
            const { angle: roadAngle } = computeRoadConnector(NERQIVA_COORDS, NEAREST_ROAD_COORDS);
            updatedVilla.rotation.y = roadAngle;
            updatedVilla.position.set(0, 0, 0);
            colony.add(updatedVilla);
          }

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

        const nqElev = (map as any).queryTerrainElevation ? ((map as any).queryTerrainElevation(NERQIVA_COORDS) || 0) : 0;
        const coord = maplibregl.MercatorCoordinate.fromLngLat(NERQIVA_COORDS, nqElev);
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
        cam.projectionMatrix = m4.clone().multiply(l);
        cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

        const ren = (this as any).renderer;
        if (ren) {
          ren.resetState();
          ren.render((this as any).scene, cam);

          // Render dynamic Category-Based 3D Plots for all other registered businesses across India (within ~4km of viewport)
          if (currentZoom >= 14.3) {
            const plotCache = (this as any).categoryPlots as Map<
              string,
              {
                visualKey: string;
                scene: THREE.Scene;
                sun: THREE.DirectionalLight;
                amb: THREE.AmbientLight;
                mesh: THREE.Group;
              }
            >;
            const viewCenter = map.getCenter();
            const zoomFactor = Math.max(0, Math.min(1, (currentZoom - 14.5) / 1.7));
            const baseScale = 1.0 * zoomFactor;

            if (plotCache && baseScale > 0.01) {
              for (const s of allLiveStorefrontsRef.current) {
                if (!s || s.slug === "nerqiva-studio") continue;
                if (typeof s.lat !== "number" || typeof s.lon !== "number") continue;

                const resolved = resolvedPlacementsRef.current.get(s.slug);
                const plotLat = resolved ? resolved.lat : s.lat;
                const plotLon = resolved ? resolved.lon : s.lon;
                const facingBearing = resolved
                  ? resolved.facingBearing
                  : typeof s.facing_bearing === "number"
                    ? s.facing_bearing
                    : 180;

                if (
                  Math.abs(plotLat - viewCenter.lat) > 0.045 ||
                  Math.abs(plotLon - viewCenter.lng) > 0.045
                ) {
                  continue;
                }

                const pLevel = (s.plot_level === 3 ? 3 : s.plot_level === 2 ? 2 : 1) as 1 | 2 | 3;
                const pTheme = s.plot_config?.facadeTheme || "default";
                const pAccent = s.plot_config?.accentColor || "";
                const pGarden = s.plot_config?.gardenStyle || "none";
                const pVehicle = s.plot_config?.drivewayVehicle || "none";
                const pLighting = s.plot_config?.lightingStyle || "neon";
                const pBanner = s.plot_config?.bannerStyle || "none";
                const pWall = s.plot_config?.wallAccent || "standard";
                const visualKey = `${s.category_id}|${pLevel}|${pTheme}|${pAccent}|${pGarden}|${pVehicle}|${pLighting}|${pBanner}|${pWall}`;

                let entry = plotCache.get(s.slug);
                if (!entry || entry.visualKey !== visualKey) {
                  const plotScene = new THREE.Scene();
                  const pSun = new THREE.DirectionalLight(0xfff7ed, 3.0);
                  pSun.position.set(50, 120, 50).normalize();
                  plotScene.add(pSun);
                  const pAmb = new THREE.AmbientLight(0xdbeafe, 1.6);
                  plotScene.add(pAmb);

                  const plotMesh = createCategoryPlotMesh(s.category_id, {
                    plotLevel: pLevel,
                    facadeTheme: pTheme,
                    accentColor: pAccent || undefined,
                    gardenStyle: pGarden,
                    drivewayVehicle: pVehicle,
                    lightingStyle: pLighting,
                    bannerStyle: pBanner,
                    wallAccent: pWall,
                  });
                  plotMesh.traverse((o) => {
                    if ((o as any).isMesh) o.frustumCulled = false;
                  });
                  plotScene.add(plotMesh);
                  entry = {
                    visualKey,
                    scene: plotScene,
                    sun: pSun,
                    amb: pAmb,
                    mesh: plotMesh,
                  };
                  plotCache.set(s.slug, entry);
                }

                if (isNightModeRef.current) {
                  entry.sun.color.setHex(0x38bdf8);
                  entry.sun.intensity = 0.85;
                  entry.amb.color.setHex(0x1e293b);
                  entry.amb.intensity = 0.65;
                } else {
                  entry.sun.color.setHex(0xfff7ed);
                  entry.sun.intensity = 3.0;
                  entry.amb.color.setHex(0xdbeafe);
                  entry.amb.intensity = 1.6;
                }

                entry.mesh.scale.set(baseScale, baseScale, baseScale);
                entry.mesh.rotation.y = bearingToThreeRotationY(facingBearing);

                const pElev = (map as any).queryTerrainElevation ? ((map as any).queryTerrainElevation([plotLon, plotLat]) || 0) : 0;
                const pCoord = maplibregl.MercatorCoordinate.fromLngLat([plotLon, plotLat], pElev);
                const pScale = pCoord.meterInMercatorCoordinateUnits();
                const pMatrix = new THREE.Matrix4()
                  .makeTranslation(pCoord.x, pCoord.y, pCoord.z)
                  .scale(new THREE.Vector3(pScale, -pScale, pScale))
                  .multiply(rotationX);

                cam.projectionMatrix = m4.clone().multiply(pMatrix);
                cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
                gl.clear(gl.DEPTH_BUFFER_BIT);
                ren.resetState();
                ren.render(entry.scene, cam);
              }
            }
          }
        }
        map.triggerRepaint();
      },
    };

    // Function to ensure 3D extrusions, sky atmosphere, road styling, and Three.js layers persist across style changes (Day/Night)
    const setup3DOnMap = () => {
      if (!map) return;

      const isDark = map.getStyle()?.name?.toLowerCase().includes("dark") || isNightMode;

      // 1. Permanent GPU Sky & Atmospheric Horizon (GTA 6-grade horizon depth & haze)
      try {
        if (!isDark) {
          map.setSky({
            "sky-color": "#1e3a8a",
            "sky-horizon-blend": 0.45,
            "horizon-color": "#93c5fd",
            "horizon-fog-blend": 0.6,
            "fog-color": "#bae6fd",
            "fog-ground-blend": 0.0,
          });
          (map as any).setFog?.({
            range: [0.5, 14],
            color: "#bae6fd",
            "horizon-blend": 0.35,
            "high-color": "#1e3a8a",
            "space-color": "#020617",
            "star-intensity": 0.0,
          });
        } else {
          map.setSky({
            "sky-color": "#020617",
            "sky-horizon-blend": 0.5,
            "horizon-color": "#091428",
            "horizon-fog-blend": 0.65,
            "fog-color": "#020617",
            "fog-ground-blend": 0.0,
          });
          (map as any).setFog?.({
            range: [0.5, 12],
            color: "#040d1a",
            "horizon-blend": 0.45,
            "high-color": "#020617",
            "space-color": "#010409",
            "star-intensity": 0.75,
          });
        }
      } catch (e) {
        console.warn("[LiveOsmMap] setSky/setFog warning:", e);
      }

      // 1b. DEM 3D Elevation Terrain (Himalayas, Western Ghats, Deccan Plateau elevation)
      try {
        if (!map.getSource("elevation-terrain-source")) {
          map.addSource("elevation-terrain-source", {
            type: "raster-dem",
            tiles: [TERRAIN_TILE_URL],
            tileSize: TERRAIN_TILE_SIZE,
            maxzoom: TERRAIN_MAX_ZOOM,
            encoding: TERRAIN_ENCODING,
          });
        }
        map.setTerrain({
          source: "elevation-terrain-source",
          exaggeration: 1.65,
        });
      } catch (demErr) {
        console.warn("[LiveOsmMap] DEM setTerrain warning:", demErr);
      }

      // 1c. Photorealistic Satellite Landcover Layer (Below roads & buildings)
      try {
        if (!map.getSource("satellite-imagery-source")) {
          map.addSource("satellite-imagery-source", {
            type: "raster",
            tiles: [SATELLITE_TILE_URL],
            tileSize: 256,
            attribution: MAPTILER_KEY ? "© MapTiler © OpenStreetMap contributors" : "© Esri World Imagery",
          });
        }
        const styleLayers = map.getStyle().layers || [];
        const roadBeforeLayer = styleLayers.find((l) =>
          l.id.startsWith("road_") || l.id.startsWith("bridge_") || l.id.startsWith("tunnel_") || l.id === "3d-city-buildings"
        )?.id;

        if (!map.getLayer("satellite-imagery-layer")) {
          map.addLayer(
            {
              id: "satellite-imagery-layer",
              type: "raster",
              source: "satellite-imagery-source",
              minzoom: 0,
              maxzoom: 20,
              paint: {
                "raster-opacity": [
                  "interpolate", ["linear"], ["zoom"],
                  3.5, 0.95,
                  15.0, 0.85,
                  18.0, 0.55,
                  19.5, 0.15,
                ],
                "raster-contrast": 0.12,
                "raster-saturation": 0.08,
              },
            },
            roadBeforeLayer || undefined
          );
        }
      } catch (satErr) {
        console.warn("[LiveOsmMap] Satellite layer warning:", satErr);
      }

      // 2. High-Contrast Production Road & Basemap Styling (Fixes washed-out / invisible roads in Day theme)
      try {
        if (!isDark) {
          if (map.getLayer("background")) {
            map.setPaintProperty("background", "background-color", "#04152d");
          }
          if (map.getLayer("water")) {
            map.setPaintProperty("water", "fill-color", [
              "interpolate", ["linear"], ["zoom"],
              4.0, "#04152d",
              9.5, "#04152d",
              12.0, "#0284c7",
            ] as any);
            map.setPaintProperty("water", "fill-opacity", 1.0);
          }
          if (map.getLayer("landcover")) {
            map.setPaintProperty("landcover", "fill-opacity", 0.0);
          }
          if (map.getLayer("landuse_residential")) {
            map.setPaintProperty("landuse_residential", "fill-opacity", 0.15);
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
          if (map.getLayer("background")) {
            map.setPaintProperty("background", "background-color", "#020b18");
          }
          if (map.getLayer("water")) {
            map.setPaintProperty("water", "fill-color", [
              "interpolate", ["linear"], ["zoom"],
              4.0, "#020b18",
              9.5, "#020b18",
              12.0, "#0c243d",
            ] as any);
          }
          if (map.getLayer("landcover")) {
            map.setPaintProperty("landcover", "fill-opacity", 0.0);
          }
          if (map.getLayer("landuse_residential")) {
            map.setPaintProperty("landuse_residential", "fill-opacity", 0.15);
          }

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

        // Dynamic Automated Driveways & Colony Interconnect Roads for ALL Registered Plots Across India
        if (!map.getSource("dynamic-plot-connectors")) {
          map.addSource("dynamic-plot-connectors", {
            type: "geojson",
            data: dynamicConnectorsGeoJSONRef.current,
          });
        }
        if (!map.getLayer("dynamic-plot-connectors-case")) {
          map.addLayer(
            {
              id: "dynamic-plot-connectors-case",
              type: "line",
              source: "dynamic-plot-connectors",
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
          map.setPaintProperty("dynamic-plot-connectors-case", "line-color", caseColor);
          map.setPaintProperty("dynamic-plot-connectors-case", "line-width", caseWidth as any);
        }
        if (!map.getLayer("dynamic-plot-connectors-fill")) {
          map.addLayer(
            {
              id: "dynamic-plot-connectors-fill",
              type: "line",
              source: "dynamic-plot-connectors",
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
          map.setPaintProperty("dynamic-plot-connectors-fill", "line-color", fillColor);
          map.setPaintProperty("dynamic-plot-connectors-fill", "line-width", fillWidth as any);
        }

        recomputePlotPlacements(map);
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
              minzoom: 13.5,
              paint: {
                "fill-extrusion-color": [
                  "interpolate",
                  ["linear"],
                  ["coalesce", ["get", "render_height"], ["get", "height"], 12],
                  0, "#e2e8f0",
                  15, "#cbd5e1",
                  35, "#94a3b8",
                  70, "#64748b"
                ],
                "fill-extrusion-height": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13.5, 0,
                  15.0, ["coalesce", ["get", "render_height"], ["get", "height"], 12]
                ],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
                "fill-extrusion-opacity": 0.82,
              },
            },
            labelLayerId
          );
        }
      } catch (e) {
        console.warn("[LiveOsmMap] 3D extrusion warning:", e);
      }

      // 4b. India-Only 3D Sculpted Continent & Pure Ocean Mask (Preserves 100% Real OpenStreetMap Inside India)
      try {
        const oceanColor = isDark ? "#040d1e" : "#0284c7";
        const shadowColor = isDark ? "#000000" : "#075985";
        const continentColor = isDark ? "#0f293a" : "#16a34a";
        const rimColor = isDark ? "#f59e0b" : "#fde68a";

        // Sync Night-mode water color so Bay of Bengal, Arabian Sea, and outer ocean mask are 100% seamless
        if (isDark && map.getLayer("water")) {
          map.setPaintProperty("water", "fill-color", [
            "interpolate", ["linear"], ["zoom"],
            9.5, "#040d1e",
            12.0, "#0c243d",
          ] as any);
        }

        // Suppress CARTO's disputed dotted country border lines at national zoom (replaced by official Survey of India outline)
        for (const bLayer of ["boundary_country_outline", "boundary_country_inner"]) {
          if (map.getLayer(bLayer)) {
            map.setPaintProperty(bLayer, "line-opacity", [
              "interpolate", ["linear"], ["zoom"],
              10.5, 0,
              12.5, 0.5,
            ] as any);
          }
        }

        // Smooth CARTO's default city labels at national zoom so our sleek HUD tags shine cleanly without overlap
        const cartoCityLayers = [
          "place_city_r6", "place_city_r5", "place_city_dot_r7", "place_city_dot_r4",
          "place_city_dot_r2", "place_city_dot_z7", "place_capital_dot_z7"
        ];
        for (const cLayer of cartoCityLayers) {
          if (map.getLayer(cLayer)) {
            map.setPaintProperty(cLayer, "text-opacity", [
              "interpolate", ["linear"], ["zoom"],
              8.8, 0.0,
              9.8, 1.0,
            ] as any);
            try {
              map.setPaintProperty(cLayer, "icon-opacity", [
                "interpolate", ["linear"], ["zoom"],
                8.8, 0.0,
                9.8, 1.0,
              ] as any);
            } catch (e) {}
          }
        }

        // Directional 3D sunlight for dramatic terrain relief & coastal highlights
        map.setLight({
          anchor: "viewport",
          color: isDark ? "#7dd3fc" : "#fffbeb",
          intensity: isDark ? 0.42 : 0.65,
          position: [1.4, 210, 42],
        });

        loadIndiaBoundaryData().then((geo) => {
          if (!geo || !mapRef.current || mapRef.current !== map) return;
          if (!map.getStyle()) return;

          const darkNow = isNightModeRef.current || Boolean(map.getStyle()?.name?.toLowerCase().includes("dark"));
          const liveOcean = darkNow ? "#020b18" : "#04152d";
          const liveShadow = darkNow ? "#000000" : "#010814";

          if (!map.getSource("india-ocean-mask-source")) {
            map.addSource("india-ocean-mask-source", {
              type: "geojson",
              data: geo.oceanMaskGeoJSON,
            });
          }
          if (!map.getSource("india-land-source")) {
            map.addSource("india-land-source", {
              type: "geojson",
              data: geo.landGeoJSON,
            });
          }

          const beforeCustom3D = map.getLayer("nerqiva-3d-commercial-layer")
            ? "nerqiva-3d-commercial-layer"
            : undefined;

          // Layer A: Pure Ocean Mask covering everything outside official Survey of India borders
          if (!map.getLayer("india-ocean-mask")) {
            map.addLayer(
              {
                id: "india-ocean-mask",
                type: "fill",
                source: "india-ocean-mask-source",
                paint: {
                  "fill-color": liveOcean,
                  "fill-opacity": [
                    "interpolate", ["linear"], ["zoom"],
                    8.2, 1.0,
                    9.6, 0.0,
                  ],
                },
              },
              beforeCustom3D
            );
          } else {
            map.setPaintProperty("india-ocean-mask", "fill-color", liveOcean);
          }

          // Layer B: Ocean Contact Shadow cast beneath the raised 3D India landmass
          if (!map.getLayer("india-island-shadow")) {
            map.addLayer(
              {
                id: "india-island-shadow",
                type: "fill",
                source: "india-land-source",
                paint: {
                  "fill-color": liveShadow,
                  "fill-translate": [12, 16],
                  "fill-translate-anchor": "viewport",
                  "fill-opacity": [
                    "interpolate", ["linear"], ["zoom"],
                    4.0, 0.45,
                    7.5, 0.2,
                    9.5, 0.0,
                  ],
                },
              },
              beforeCustom3D
            );
          } else {
            map.setPaintProperty("india-island-shadow", "fill-color", liveShadow);
          }

          // Layer C1: Outer Coastal Bathymetry Reef (Deep Cyan Glow fringing coastline & islands)
          if (!map.getLayer("india-coastal-shelf-outer")) {
            map.addLayer(
              {
                id: "india-coastal-shelf-outer",
                type: "line",
                source: "india-land-source",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                  "line-color": "#0891b2",
                  "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    3.5, 24,
                    6.5, 18,
                    9.0, 10,
                    11.0, 0,
                  ],
                  "line-blur": 14,
                  "line-opacity": [
                    "interpolate", ["linear"], ["zoom"],
                    3.5, 0.5,
                    8.5, 0.3,
                    10.5, 0,
                  ],
                },
              },
              beforeCustom3D
            );
          }

          // Layer C2: Mid-Shelf Coastal Bathymetry (Tropical Turquoise Shelf)
          if (!map.getLayer("india-coastal-shelf-mid")) {
            map.addLayer(
              {
                id: "india-coastal-shelf-mid",
                type: "line",
                source: "india-land-source",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                  "line-color": "#06b6d4",
                  "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    3.5, 12,
                    6.5, 8,
                    9.0, 4,
                    11.0, 0,
                  ],
                  "line-blur": 6,
                  "line-opacity": [
                    "interpolate", ["linear"], ["zoom"],
                    3.5, 0.7,
                    8.5, 0.45,
                    10.5, 0,
                  ],
                },
              },
              beforeCustom3D
            );
          }

          // Layer C3: Radiant Inner Surf / Coral Shoreline (Crisp Seafoam Aqua Rim)
          if (!map.getLayer("india-coastal-surf-inner")) {
            map.addLayer(
              {
                id: "india-coastal-surf-inner",
                type: "line",
                source: "india-land-source",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                  "line-color": "#67e8f9",
                  "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    3.5, 4.0,
                    6.5, 3.0,
                    9.0, 1.8,
                    11.0, 0,
                  ],
                  "line-blur": 2.0,
                  "line-opacity": [
                    "interpolate", ["linear"], ["zoom"],
                    3.5, 0.88,
                    8.5, 0.6,
                    10.5, 0,
                  ],
                },
              },
              beforeCustom3D
            );
          }

          // Remove old flat cartoon green slab so real DEM elevation & Himalayas shine unobstructed!
          if (map.getLayer("india-3d-continent-extrusion")) {
            map.removeLayer("india-3d-continent-extrusion");
          }

          // Layer D: Major Indian Metros National HUD (New Delhi, Mumbai, Bengaluru, Chennai, Kolkata)
          if (!map.getSource("major-city-hubs-source")) {
            map.addSource("major-city-hubs-source", {
              type: "geojson",
              data: MAJOR_INDIA_HUBS_GEOJSON,
            });
          }

          if (!map.getLayer("major-city-hubs-halo")) {
            map.addLayer(
              {
                id: "major-city-hubs-halo",
                type: "circle",
                source: "major-city-hubs-source",
                maxzoom: 10.5,
                paint: {
                  "circle-color": "#38bdf8",
                  "circle-radius": 14,
                  "circle-opacity": 0.25,
                  "circle-blur": 0.5,
                },
              },
              beforeCustom3D
            );
          }

          if (!map.getLayer("major-city-hubs-dot")) {
            map.addLayer(
              {
                id: "major-city-hubs-dot",
                type: "circle",
                source: "major-city-hubs-source",
                maxzoom: 10.5,
                paint: {
                  "circle-color": "#ffffff",
                  "circle-radius": 4.5,
                  "circle-stroke-width": 2.0,
                  "circle-stroke-color": "#080B12",
                },
              },
              beforeCustom3D
            );
          }

          if (!map.getLayer("major-city-hubs-label")) {
            map.addLayer(
              {
                id: "major-city-hubs-label",
                type: "symbol",
                source: "major-city-hubs-source",
                maxzoom: 10.5,
                layout: {
                  "text-field": "{name}",
                  "text-size": 11,
                  "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                  "text-offset": [0, -1.2],
                  "text-anchor": "bottom",
                  "text-allow-overlap": true,
                },
                paint: {
                  "text-color": "#ffffff",
                  "text-halo-color": "rgba(8,11,18,0.95)",
                  "text-halo-width": 2.5,
                },
              },
              beforeCustom3D
            );
          }

          // Layer D2: Guwahati Golden Beacon with Animated Concentric Sonar Pulse Rings
          if (!guwahatiBeaconMarkerRef.current) {
            const beaconEl = document.createElement("div");
            beaconEl.className = "guwahati-flagship-beacon pointer-events-auto cursor-pointer select-none flex flex-col items-center";
            beaconEl.innerHTML = `
              <div style="position:relative;display:flex;align-items:center;justify-content:center;width:64px;height:64px;">
                <div style="position:absolute;width:60px;height:60px;border-radius:9999px;border:2px solid rgba(245,158,11,0.85);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
                <div style="position:absolute;width:40px;height:40px;border-radius:9999px;border:1.5px solid rgba(251,191,36,0.6);animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite;"></div>
                <div style="width:20px;height:20px;border-radius:9999px;background:#f59e0b;border:2.5px solid #ffffff;box-shadow:0 0 24px #f59e0b, 0 0 10px #f59e0b;display:flex;align-items:center;justify-content:center;z-index:2;">
                  <div style="width:6px;height:6px;border-radius:9999px;background:#080b12;"></div>
                </div>
              </div>
              <div style="margin-top:-6px;padding:3px 10px;border-radius:9999px;background:rgba(8,11,18,0.95);border:1px solid rgba(245,158,11,0.8);box-shadow:0 8px 24px rgba(0,0,0,0.85);display:flex;align-items:center;gap:6px;backdrop-filter:blur(8px);z-index:3;">
                <span style="width:6px;height:6px;border-radius:9999px;background:#f59e0b;animation:pulse 1.5s infinite;"></span>
                <span style="font-size:11px;font-weight:900;color:#fef08a;letter-spacing:0.02em;">Guwahati</span>
                <span style="font-size:9px;font-weight:800;padding:1px 5px;border-radius:9999px;background:rgba(245,158,11,0.25);color:#fde047;border:1px solid rgba(245,158,11,0.4);">L1</span>
              </div>
            `;
            beaconEl.onclick = () => {
              if (onStorefrontSelect) onStorefrontSelect(nerqivaBusiness);
              flyToStorefront(nerqivaBusiness);
            };
            guwahatiBeaconMarkerRef.current = new maplibregl.Marker({
              element: beaconEl,
              anchor: "center",
            })
              .setLngLat(NERQIVA_COORDS)
              .addTo(map);
          }

          // Layer E (Tier 1 LOD — National View zoom < 9.8): Native WebGL Clustered Beacons (Scales to 100k+ Businesses!)
          if (!map.getSource("storefronts-cluster-source")) {
            map.addSource("storefronts-cluster-source", {
              type: "geojson",
              data: storefrontsGeoJSONRef.current,
              cluster: true,
              clusterMaxZoom: 9,
              clusterRadius: 42,
            });
          }

          if (!map.getLayer("storefront-cluster-halo")) {
            map.addLayer(
              {
                id: "storefront-cluster-halo",
                type: "circle",
                source: "storefronts-cluster-source",
                maxzoom: 9.8,
                filter: ["has", "point_count"],
                paint: {
                  "circle-color": "#f59e0b",
                  "circle-radius": ["step", ["get", "point_count"], 20, 10, 25, 50, 31],
                  "circle-opacity": 0.25,
                  "circle-blur": 0.5,
                },
              },
              beforeCustom3D
            );
          }

          if (!map.getLayer("storefront-cluster-circle")) {
            map.addLayer(
              {
                id: "storefront-cluster-circle",
                type: "circle",
                source: "storefronts-cluster-source",
                maxzoom: 9.8,
                filter: ["has", "point_count"],
                paint: {
                  "circle-color": "#f59e0b",
                  "circle-radius": ["step", ["get", "point_count"], 12, 10, 15, 50, 19],
                  "circle-stroke-width": 2.5,
                  "circle-stroke-color": "#080B12",
                },
              },
              beforeCustom3D
            );
          }

          if (!map.getLayer("storefront-cluster-count")) {
            map.addLayer(
              {
                id: "storefront-cluster-count",
                type: "symbol",
                source: "storefronts-cluster-source",
                maxzoom: 9.8,
                filter: ["has", "point_count"],
                layout: {
                  "text-field": "{point_count_abbreviated}",
                  "text-size": 11,
                  "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                },
                paint: {
                  "text-color": "#080B12",
                },
              },
              beforeCustom3D
            );
          }

          if (!map.getLayer("storefront-beacon-halo")) {
            map.addLayer(
              {
                id: "storefront-beacon-halo",
                type: "circle",
                source: "storefronts-cluster-source",
                maxzoom: 9.8,
                filter: ["!", ["has", "point_count"]],
                paint: {
                  "circle-color": ["coalesce", ["get", "accent_color"], "#fbbf24"],
                  "circle-radius": [
                    "interpolate", ["linear"], ["zoom"],
                    4.0, ["match", ["get", "plot_level"], 3, 24, 2, 19, 15],
                    9.0, ["match", ["get", "plot_level"], 3, 32, 2, 26, 21],
                  ],
                  "circle-opacity": ["match", ["get", "plot_level"], 3, 0.48, 2, 0.40, 0.32],
                  "circle-blur": 0.65,
                },
              },
              beforeCustom3D
            );
          }

          if (!map.getLayer("storefront-beacon-dot")) {
            map.addLayer(
              {
                id: "storefront-beacon-dot",
                type: "circle",
                source: "storefronts-cluster-source",
                maxzoom: 9.8,
                filter: ["!", ["has", "point_count"]],
                paint: {
                  "circle-color": ["coalesce", ["get", "accent_color"], "#f59e0b"],
                  "circle-radius": [
                    "interpolate", ["linear"], ["zoom"],
                    4.0, ["match", ["get", "plot_level"], 3, 9.2, 2, 7.6, 6.2],
                    9.0, ["match", ["get", "plot_level"], 3, 11.4, 2, 9.4, 8.0],
                  ],
                  "circle-stroke-width": 2.4,
                  "circle-stroke-color": "#ffffff",
                },
              },
              beforeCustom3D
            );
          }
        });
      } catch (indiaErr) {
        console.warn("[LiveOsmMap] India 3D island mask setup warning:", indiaErr);
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

      // Interactive hover & click handlers for National 3D India Clustered Beacons (Tier 1 LOD)
      map.on("mouseenter", "storefront-beacon-dot", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const feat = e.features?.[0];
        if (!feat || feat.geometry.type !== "Point") return;
        const coords = feat.geometry.coordinates as [number, number];
        const props = feat.properties || {};
        if (hoverPopupRef.current) hoverPopupRef.current.remove();
        hoverPopupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          className: "spotlight-beacon-popup",
        })
          .setLngLat(coords)
          .setHTML(
            `<div style="background:#080B12;color:#fff;padding:6px 10px;border-radius:10px;border:1px solid rgba(245,158,11,0.55);font-size:11px;font-weight:700;box-shadow:0 10px 25px rgba(0,0,0,0.65);white-space:nowrap;">
              <span style="color:#fbbf24;">●</span> ${props.name || "Live Business"} <span style="color:#94a3b8;font-weight:500;">· ${props.city || "India"}</span>
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "storefront-beacon-dot", () => {
        map.getCanvas().style.cursor = "";
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
      });

      map.on("click", "storefront-beacon-dot", (e) => {
        const feat = e.features?.[0];
        if (!feat || feat.geometry.type !== "Point") return;
        const coords = feat.geometry.coordinates as [number, number];
        const slug = feat.properties?.slug;
        const matched = allLiveStorefrontsRef.current.find((s) => s.slug === slug);
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
        setFocusedRegion(null);
        if (matched) setFocusedStorefront(matched);
        isFlightActiveRef.current = true;
        setIs3DMode(true);
        map.flyTo({
          center: coords,
          zoom: 18.2,
          pitch: 58,
          bearing: 25,
          duration: 1600,
        });
        map.once("moveend", () => {
          isFlightActiveRef.current = false;
        });
        bazaarAudio.playStorefrontChime();
      });

      map.on("mouseenter", "storefront-cluster-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "storefront-cluster-circle", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "storefront-cluster-circle", (e) => {
        const feat = e.features?.[0];
        if (!feat || feat.geometry.type !== "Point") return;
        const clusterId = feat.properties?.cluster_id;
        const src = map.getSource("storefronts-cluster-source") as maplibregl.GeoJSONSource | undefined;
        if (!src || clusterId == null) return;
        src.getClusterExpansionZoom(clusterId).then((targetZoom) => {
          map.easeTo({
            center: feat.geometry.type === "Point" ? (feat.geometry.coordinates as [number, number]) : INDIA_CENTER,
            zoom: Math.min(targetZoom + 1.5, 14),
            pitch: 45,
            duration: 900,
          });
        }).catch(() => {});
      });

      // Interactive hover & click handlers for Major Indian Metros National HUD
      for (const hubLayer of ["major-city-hubs-dot", "major-city-hubs-label"]) {
        map.on("mouseenter", hubLayer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", hubLayer, () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("click", hubLayer, (e) => {
          const feat = e.features?.[0];
          if (!feat || feat.geometry.type !== "Point") return;
          const coords = feat.geometry.coordinates as [number, number];
          const props = feat.properties || {};
          isFlightActiveRef.current = true;
          setIs3DMode(true);
          map.flyTo({
            center: coords,
            zoom: props.zoom || 12.8,
            pitch: props.pitch || 52,
            bearing: props.bearing || 0,
            duration: 1600,
          });
          map.once("moveend", () => {
            isFlightActiveRef.current = false;
          });
          bazaarAudio.playStorefrontChime();
          showToast(`📍 ${props.name}`);
        });
      }

      // Helper to apply 4-Tier LOD marker visibility & compact vs flagship styling cleanly on every zoom
      const syncMarkerLOD = (z: number) => {
        if (guwahatiBeaconMarkerRef.current) {
          const bel = guwahatiBeaconMarkerRef.current.getElement();
          if (bel) {
            if (z >= 11.5 || isWalkModeRef.current) {
              bel.style.display = "none";
            } else {
              bel.style.display = "flex";
            }
          }
        }

        markersRef.current.forEach((m) => {
          const el = m.getElement();
          if (!el) return;
          const compactEl = el.querySelector<HTMLElement>("[data-lod='compact']");
          const fullEl = el.querySelector<HTMLElement>("[data-lod='full']");

          // Tier 1 (< 9.5): WebGL beacons only — hide HTML card completely!
          // Tier 4 (>= 19.9 or Walk Mode): Hide HTML card so 3D architectural facade signage shines unobstructed!
          if (z < 9.5 || z >= 19.9 || isWalkModeRef.current) {
            el.style.visibility = "hidden";
            el.style.pointerEvents = "none";
          } else if (z < 14.8) {
            // Tier 2 (9.5 – 14.8): Compact sleek mini-pill
            el.style.visibility = "visible";
            el.style.pointerEvents = "auto";
            m.setOffset([0, -14]);
            if (compactEl) compactEl.style.display = "flex";
            if (fullEl) fullEl.style.display = "none";
          } else {
            // Tier 3 (14.8 – 19.8): In multi-plot colonies, use crisp compact roof pills to prevent overlapping cards (expands on hover!)
            el.style.visibility = "visible";
            el.style.pointerEvents = "auto";
            const isCrowded = el.dataset.crowded === "1";
            const isHovered = el.dataset.hovered === "1";
            if (isCrowded && !isHovered) {
              m.setOffset([0, -54]);
              if (compactEl) compactEl.style.display = "flex";
              if (fullEl) fullEl.style.display = "none";
            } else {
              m.setOffset([0, -96]);
              if (compactEl) compactEl.style.display = "none";
              if (fullEl) fullEl.style.display = "flex";
            }
          }
        });
      };

      // Smooth dynamic 3D Street Perspective <-> Regional OSM <-> 3D India Island + 4-Tier LOD Sync
      let lastReportedZoomBucket = Math.round(map.getZoom() * 2) / 2;
      map.on("zoom", () => {
        const z = map.getZoom();
        syncMarkerLOD(z);

        const bucket = Math.round(z * 2) / 2;
        if (bucket !== lastReportedZoomBucket) {
          lastReportedZoomBucket = bucket;
          setMapZoom(z);
        }

        if (isFlightActiveRef.current) return;
        if (z < 9.5) {
          if (map.getPitch() < 28) {
            map.easeTo({ pitch: 42, bearing: -6, duration: 450 });
          }
        } else if (z >= 16.5) {
          if (!is3DMode) {
            setIs3DMode(true);
            map.easeTo({ pitch: 58, bearing: 25, duration: 400 });
          }
        }
      });

      map.on("moveend", () => {
        const z = map.getZoom();
        const c = map.getCenter();
        setMapZoom(z);
        setMapCenter([c.lng, c.lat]);
        syncMarkerLOD(z);
        const fr = focusedRegionRef.current;
        if (z < 7.5) {
          setFocusedRegion(null);
        } else if (fr) {
          const maxDriftKm = fr.kind === "state" ? 380 : 80;
          if (getDistanceKm(c.lat, c.lng, fr.lat, fr.lon) > maxDriftKm) {
            setFocusedRegion(null);
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

        // Check proximity click on any other registered 3D business plot across India
        for (const s of allLiveStorefrontsRef.current) {
          if (!s || s.slug === "nerqiva-studio") continue;
          if (typeof s.lat !== "number" || typeof s.lon !== "number") continue;
          const resolved = resolvedPlacementsRef.current.get(s.slug);
          const pLon = resolved ? resolved.lon : s.lon;
          const pLat = resolved ? resolved.lat : s.lat;
          if (getDistMeters(clickLng, clickLat, pLon, pLat) <= 24) {
            setFocusedStorefront(s);
            if (onStorefrontSelect) onStorefrontSelect(s);
            bazaarAudio.playStorefrontChime();
            showToast(`📍 ${s.name} · ${s.city_name || "India"}`);
            return;
          }
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

      // Re-run automated OSM road snapping & colony connectors once street vector tiles settle
      map.on("idle", () => {
        if (map.getZoom() >= 13.5) {
          recomputePlotPlacements(map);
        }
      });
    });

    map.on("style.load", () => {
      setup3DOnMap();
    });

    mapRef.current = map;

    return () => {
      if (guwahatiBeaconMarkerRef.current) {
        guwahatiBeaconMarkerRef.current.remove();
        guwahatiBeaconMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync Camera when deep-linked directly to a specific storefront (e.g. ?shop=<slug>&new=1 after registration)
  const lastFlownShopRef = useRef<string | null>(null);
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !activeStorefront) return;
    if (lastFlownShopRef.current === activeStorefront.slug) return;
    lastFlownShopRef.current = activeStorefront.slug;
    setFocusedRegion(null);
    setFocusedStorefront(activeStorefront);
    isFlightActiveRef.current = true;
    setIs3DMode(true);
    mapRef.current.flyTo({
      center: [activeStorefront.lon, activeStorefront.lat],
      zoom: 18.2,
      pitch: 58,
      bearing: 22,
      duration: 1500,
      essential: true,
    });
    mapRef.current.once("moveend", () => {
      isFlightActiveRef.current = false;
    });
  }, [activeStorefront, mapLoaded]);

  // Sync Camera ONLY when a specific city is explicitly selected (never hijack root "/" 3D India Island view!)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedCity) return;
    if (selectedCity.slug === "guwahati" || selectedCity.name.toLowerCase() === "guwahati") {
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
        center: [selectedCity.lon, selectedCity.lat],
        zoom: 14.2,
        pitch: is3DMode ? 52 : 0,
        bearing: is3DMode ? 25 : 0,
        speed: 1.4,
        essential: true,
      });
    }
  }, [selectedCity, mapLoaded]);

  // Sync 3D Drone Mode (Cinematic GTA 6 Oblique / Street Perspective <-> 2D Top-Down View)
  const toggle3DDrone = useCallback(() => {
    if (!mapRef.current) return;
    const next3D = !is3DMode;
    setIs3DMode(next3D);
    const z = mapRef.current.getZoom();
    const targetPitch = next3D ? (z < 9.5 ? 56 : 58) : 0;
    const targetBearing = next3D ? (z < 9.5 ? -8 : 25) : 0;
    mapRef.current.easeTo({
      pitch: targetPitch,
      bearing: targetBearing,
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

  // Clear temporary searched-location pin
  const clearSearchPin = useCallback(() => {
    if (searchPinMarkerRef.current) {
      searchPinMarkerRef.current.remove();
      searchPinMarkerRef.current = null;
    }
  }, []);

  // Drop a crisp target pin on any searched PIN code, locality, city, or state
  const placeSearchPin = useCallback(
    (name: string, lat: number, lon: number) => {
      clearSearchPin();
      if (!mapRef.current) return;
      const pinEl = document.createElement("div");
      pinEl.className = "pointer-events-none select-none flex flex-col items-center";
      pinEl.innerHTML = `
        <div class="px-2.5 py-1 rounded-full bg-[#080B12]/95 border border-sky-400/80 shadow-[0_8px_24px_rgba(0,0,0,0.7)] flex items-center gap-1.5 backdrop-blur-md">
          <span class="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
          <span class="text-[11px] font-bold text-white tracking-tight whitespace-nowrap">${name}</span>
        </div>
        <div class="w-1.5 h-1.5 -mt-0.5 bg-[#080B12] rotate-45 border-r border-b border-sky-400/80"></div>
        <div class="w-3 h-3 mt-0.5 rounded-full bg-sky-400 border-2 border-white shadow-[0_0_12px_rgba(56,189,248,0.9)]"></div>
      `;
      searchPinMarkerRef.current = new maplibregl.Marker({
        element: pinEl,
        anchor: "bottom",
        offset: [0, 6],
      })
        .setLngLat([lon, lat])
        .addTo(mapRef.current);
    },
    [clearSearchPin]
  );

  // Fly cleanly to any specific business plot (switches bottom dock to State C: Street Business View)
  const flyToStorefront = useCallback(
    (b: BusinessStorefront) => {
      if (!mapRef.current) return;
      clearSearchPin();
      handleStopMove();
      setIsWalkMode(false);
      isWalkModeRef.current = false;
      setFocusedRegion(null);
      setFocusedStorefront(b);
      isFlightActiveRef.current = true;
      setIs3DMode(true);
      mapRef.current.flyTo({
        center: [b.lon, b.lat],
        zoom: 18.2,
        pitch: 58,
        bearing: 25,
        duration: 1400,
      });
      mapRef.current.once("moveend", () => {
        isFlightActiveRef.current = false;
      });
      bazaarAudio.playStorefrontChime();
    },
    [clearSearchPin, handleStopMove]
  );

  // Fly cleanly to any Indian State, City, Area, or 6-digit PIN code (switches bottom dock to State B: Region View)
  const flyToPlace = useCallback(
    (place: { name: string; subtitle: string; kind: "pincode" | "state" | "city" | "area"; lat: number; lon: number; zoom: number }) => {
      if (!mapRef.current) return;
      handleStopMove();
      setIsWalkMode(false);
      isWalkModeRef.current = false;
      setFocusedStorefront(null);
      setFocusedRegion({
        name: place.name,
        subtitle: place.subtitle,
        kind: place.kind,
        lat: place.lat,
        lon: place.lon,
      });
      placeSearchPin(place.name, place.lat, place.lon);
      isFlightActiveRef.current = true;
      mapRef.current.flyTo({
        center: [place.lon, place.lat],
        zoom: place.zoom,
        pitch: place.zoom >= 14 ? 54 : 44,
        bearing: place.zoom >= 14 ? 20 : -4,
        duration: 1350,
      });
      mapRef.current.once("moveend", () => {
        isFlightActiveRef.current = false;
      });
      showToast(`📍 ${place.name}`);
    },
    [handleStopMove, placeSearchPin, showToast]
  );

  // RENDER 4-TIER LOD HTML MARKERS FOR ALL LIVE STOREFRONTS (Hidden at zoom < 9.5 where WebGL clustered beacons handle National View!)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markersBySlugRef.current.clear();
    if (playerMarkerRef.current) {
      playerMarkerRef.current.remove();
      playerMarkerRef.current = null;
    }

    const currZoom = mapRef.current.getZoom();

    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    allLiveStorefronts.forEach((b) => {
      const domain = b.website_url ? b.website_url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "";
      const areaLabel = b.slug === "nerqiva-studio" ? "North Guwahati" : b.city_name || "India";
      const taglineShort = b.tagline || "Local Business";
      const safeName = escapeHtml(b.name);
      const safeTagline = escapeHtml(taglineShort);
      const safeArea = escapeHtml(areaLabel);
      const safeDomain = escapeHtml(domain);
      const plotLevel = b.plot_level === 3 ? 3 : b.plot_level === 2 ? 2 : 1;
      const rawAccent = b.plot_config?.accentColor;
      const accentHex =
        typeof rawAccent === "string" && /^#[0-9a-fA-F]{6}$/.test(rawAccent)
          ? rawAccent
          : "#f59e0b";
      const roofTag = b.plot_config?.roofSignText
        ? escapeHtml(b.plot_config.roofSignText.slice(0, 18))
        : "";
      const levelBadgeHtml =
        plotLevel >= 2
          ? `<span style="font-size:9px;font-weight:800;letter-spacing:0.04em;padding:1px 6px;border-radius:9999px;background:${accentHex}22;color:${accentHex};border:1px solid ${accentHex}66;flex-shrink:0;">LVL ${plotLevel}</span>`
          : "";
      const roofTagHtml = roofTag
        ? `<span style="font-size:9px;font-weight:700;letter-spacing:0.03em;padding:1px 6px;border-radius:9999px;background:rgba(255,255,255,0.08);color:#e5e7eb;flex-shrink:0;">${roofTag}</span>`
        : "";
      const verifiedBadgeHtml = b.is_verified
        ? `<span title="Verified by Nerqiva" style="font-size:9px;font-weight:700;display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:9999px;background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.4);flex-shrink:0;">
            <svg style="width:10px;height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            <span>Verified</span>
          </span>`
        : "";
      const featuredBadgeHtml = b.is_featured
        ? `<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:9999px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);flex-shrink:0;">★ Featured</span>`
        : "";

      // Active Live Broadcast Sky-Badge (floating above roof when business has an active Deal/Need/Hiring/Event!)
      const activeBroadcast = (b.active_posts || []).find(
        (p) => new Date(p.expires_at).getTime() > Date.now()
      );
      const bMeta = activeBroadcast
        ? BROADCAST_TYPE_MAP.get(activeBroadcast.post_type) || BROADCAST_TYPES[0]
        : null;
      const skyBadgeHtml =
        activeBroadcast && bMeta
          ? `<div style="margin-bottom:5px;padding:3px 9px;border-radius:9999px;background:#080B12;border:1px solid ${bMeta.hexAccent};box-shadow:0 6px 18px rgba(0,0,0,0.65);display:inline-flex;align-items:center;gap:5px;max-width:210px;">
              <span style="width:6px;height:6px;border-radius:9999px;background:${bMeta.hexAccent};flex-shrink:0;"></span>
              <span style="font-size:9px;font-weight:800;letter-spacing:0.04em;color:${bMeta.hexAccent};flex-shrink:0;">${bMeta.shortTag}</span>
              <span style="font-size:10px;font-weight:700;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(activeBroadcast.coupon_code ? `${activeBroadcast.title} · ${activeBroadcast.coupon_code}` : activeBroadcast.title)}</span>
            </div>`
          : "";

      const cardEl = document.createElement("div");
      cardEl.className = "cursor-pointer select-none relative group pointer-events-auto flex flex-col items-center";
      cardEl.innerHTML = `
        <!-- Tier 2 (zoom 9.5 – 14.8) & Colony Compact Roof Pill -->
        <div data-lod="compact" class="flex-col items-center" style="display:none;">
          ${skyBadgeHtml}
          <div style="border-color:${accentHex}bf;" class="px-2.5 py-1 rounded-full bg-[#080B12]/95 border shadow-xl flex items-center gap-1.5 backdrop-blur-md hover:scale-105 transition-all">
            <span style="background:${accentHex};" class="w-2 h-2 rounded-full"></span>
            <span class="text-[11px] font-bold text-white tracking-tight whitespace-nowrap">${safeName}</span>
            ${verifiedBadgeHtml}
            ${levelBadgeHtml}
          </div>
          <div style="border-color:${accentHex}bf;" class="w-1.5 h-1.5 -mt-0.5 bg-[#080B12] rotate-45 border-r border-b"></div>
        </div>

        <!-- Tier 3 (zoom 14.8 – 19.8): Flagship Glassmorphic Card -->
        <div data-lod="full" class="flex-col items-center" style="display:none;">
          ${skyBadgeHtml}
          <div style="border-color:${accentHex}bf;" class="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#080B12]/95 border shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl hover:scale-105 transition-all">
            <div style="border-color:${accentHex}80;color:${accentHex};background:${accentHex}1f;" class="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-inner">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div class="flex flex-col text-left">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-black text-white tracking-tight">${safeName}</span>
                ${verifiedBadgeHtml}
                ${featuredBadgeHtml}
                ${levelBadgeHtml}
                ${roofTagHtml}
                ${safeDomain ? `<span class="text-[10px] font-medium text-amber-400/90">${safeDomain}</span>` : ""}
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] text-neutral-300 font-medium">${safeTagline}</span>
                <span class="text-neutral-500 text-[10px]">·</span>
                <span class="text-[10px] text-neutral-400">${safeArea}</span>
              </div>
            </div>
          </div>
          <div style="border-color:${accentHex}bf;" class="w-2.5 h-2.5 -mt-1 bg-[#080B12] rotate-45 border-r border-b"></div>
        </div>
      `;

      // Detect if neighboring plots sit within 120m (prevents overlapping giant cards in active colonies!)
      const hasCloseNeighbor = allLiveStorefronts.some(
        (other) =>
          other.slug !== b.slug &&
          getDistanceKm(b.lat, b.lon, other.lat, other.lon) < 0.14
      );
      cardEl.dataset.slug = b.slug;
      cardEl.dataset.crowded = hasCloseNeighbor ? "1" : "0";
      cardEl.dataset.hovered = "0";

      // Apply exact initial LOD state before attaching to map
      const compactEl = cardEl.querySelector<HTMLElement>("[data-lod='compact']");
      const fullEl = cardEl.querySelector<HTMLElement>("[data-lod='full']");
      let initOffsetY = hasCloseNeighbor ? -54 : -96;
      if (currZoom < 9.5 || currZoom >= 19.9 || isWalkModeRef.current) {
        cardEl.style.visibility = "hidden";
        cardEl.style.pointerEvents = "none";
      } else if (currZoom < 14.8) {
        initOffsetY = -14;
        if (compactEl) compactEl.style.display = "flex";
      } else if (hasCloseNeighbor) {
        initOffsetY = -54;
        if (compactEl) compactEl.style.display = "flex";
      } else {
        initOffsetY = -96;
        if (fullEl) fullEl.style.display = "flex";
      }

      const resolvedPos = resolvedPlacementsRef.current.get(b.slug);
      const marker = new maplibregl.Marker({
        element: cardEl,
        anchor: "bottom",
        offset: [0, initOffsetY],
      })
        .setLngLat([resolvedPos ? resolvedPos.lon : b.lon, resolvedPos ? resolvedPos.lat : b.lat])
        .addTo(mapRef.current!);

      // Expand compact colony pill smoothly into full card on hover
      cardEl.addEventListener("mouseenter", () => {
        if (!mapRef.current || mapRef.current.getZoom() < 14.8 || mapRef.current.getZoom() >= 19.9) return;
        cardEl.dataset.hovered = "1";
        cardEl.style.zIndex = "50";
        marker.setOffset([0, -88]);
        if (compactEl) compactEl.style.display = "none";
        if (fullEl) fullEl.style.display = "flex";
      });
      cardEl.addEventListener("mouseleave", () => {
        cardEl.dataset.hovered = "0";
        cardEl.style.zIndex = "";
        if (!mapRef.current || mapRef.current.getZoom() < 14.8) return;
        if (cardEl.dataset.crowded === "1") {
          marker.setOffset([0, -54]);
          if (compactEl) compactEl.style.display = "flex";
          if (fullEl) fullEl.style.display = "none";
        }
      });

      cardEl.addEventListener("click", () => {
        if (mapRef.current && mapRef.current.getZoom() < 15.2) {
          flyToStorefront(b);
          return;
        }
        setFocusedStorefront(b);
        if (onStorefrontSelect) onStorefrontSelect(b);
        bazaarAudio.playStorefrontChime();
      });

      markersRef.current.push(marker);
      markersBySlugRef.current.set(b.slug, marker);
    });
  }, [mapLoaded, allLiveStorefronts, onStorefrontSelect, flyToStorefront]);

  // Hybrid Omnibox Search: Instant Businesses + Instant Indian States/Cities + Debounced Live PIN/Area Geocoder
  const q = (searchQuery || "").trim().toLowerCase();
  const businessSearchResults = useMemo(() => {
    if (!q) return [];
    return allLiveStorefronts
      .filter((s) => {
        return (
          (Boolean(s?.name) && s.name.toLowerCase().includes(q)) ||
          (Boolean(s?.tagline) && s.tagline!.toLowerCase().includes(q)) ||
          (Boolean(s?.city_name) && s.city_name!.toLowerCase().includes(q)) ||
          (Boolean(s?.state_name) && s.state_name!.toLowerCase().includes(q)) ||
          (Boolean(s?.pincode) && s.pincode!.toLowerCase().includes(q)) ||
          (Boolean(s?.instagram_handle) && s.instagram_handle!.toLowerCase().includes(q)) ||
          (Boolean(s?.plot_config?.roofSignText) &&
            s.plot_config!.roofSignText!.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const lvlDiff = (b.plot_level || 1) - (a.plot_level || 1);
        if (lvlDiff !== 0) return lvlDiff;
        return (b.total_views || 0) - (a.total_views || 0);
      });
  }, [q, allLiveStorefronts]);

  const placeSearchResults = useMemo(() => {
    if (!q) return [];
    const localPlaces: { id: string; name: string; subtitle: string; kind: "pincode" | "state" | "city" | "area"; lat: number; lon: number; zoom: number }[] =
      searchLocalIndiaPlaces(q).map((p: IndiaPlaceEntry) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle,
        kind: p.kind,
        lat: p.lat,
        lon: p.lon,
        zoom: p.zoom,
      }));
    const seen = new Set(localPlaces.map((p) => p.name.toLowerCase()));
    const merged = [...localPlaces];
    for (const r of remoteGeoResults) {
      if (!seen.has(r.name.toLowerCase())) {
        seen.add(r.name.toLowerCase());
        merged.push(r);
      }
    }
    return merged.slice(0, 6);
  }, [q, remoteGeoResults]);

  // Compute nearest business to current map center & dynamic 3-state view level ("india" | "region" | "street")
  const nearestToCenter = useMemo(() => {
    let best: { storefront: BusinessStorefront; distKm: number } | null = null;
    for (const s of allLiveStorefronts) {
      const d = getDistanceKm(mapCenter[1], mapCenter[0], s.lat, s.lon);
      if (!best || d < best.distKm) {
        best = { storefront: s, distKm: d };
      }
    }
    return best;
  }, [allLiveStorefronts, mapCenter, getDistanceKm]);

  const nearbyCount = useMemo(() => {
    const refLat = focusedRegion ? focusedRegion.lat : mapCenter[1];
    const refLon = focusedRegion ? focusedRegion.lon : mapCenter[0];
    const radiusKm = focusedRegion?.kind === "state" ? 280 : focusedRegion?.kind === "city" ? 35 : 15;
    return allLiveStorefronts.filter((s) => getDistanceKm(refLat, refLon, s.lat, s.lon) <= radiusKm).length;
  }, [allLiveStorefronts, focusedRegion, mapCenter, getDistanceKm]);

  const activeStreetBusiness: BusinessStorefront | null = useMemo(() => {
    if (mapZoom < 15.2) return null;
    if (focusedStorefront && getDistanceKm(mapCenter[1], mapCenter[0], focusedStorefront.lat, focusedStorefront.lon) <= 3.0) {
      return focusedStorefront;
    }
    if (nearestToCenter && nearestToCenter.distKm <= 2.5) {
      return nearestToCenter.storefront;
    }
    return null;
  }, [mapZoom, focusedStorefront, nearestToCenter, mapCenter, getDistanceKm]);

  const viewLevel: "india" | "region" | "street" =
    mapZoom >= 15.2 ? "street" : mapZoom >= 9.2 || Boolean(focusedRegion) ? "region" : "india";

  // Dynamic Recenter & Reset: Resets view to active storefront, focused region, nearest plot, or National India Overview
  const handleDynamicResetView = useCallback(() => {
    if (!mapRef.current) return;

    // 1. If currently viewing / focused on a business, re-center on this active business
    const currentShop = activeStreetBusiness || focusedStorefront;
    if (currentShop) {
      flyToStorefront(currentShop);
      showToast(`📍 Recenter: ${currentShop.name}`);
      return;
    }

    // 2. If currently focused on a region/city/PIN, re-center on this region
    if (focusedRegion) {
      flyToPlace({
        name: focusedRegion.name,
        subtitle: focusedRegion.subtitle,
        kind: focusedRegion.kind,
        lat: focusedRegion.lat,
        lon: focusedRegion.lon,
        zoom: mapZoom >= 13 ? 14 : 11.5,
      });
      return;
    }

    // 3. If there is a live registered storefront nearby in current camera view
    if (nearestToCenter && nearestToCenter.distKm < 60) {
      flyToStorefront(nearestToCenter.storefront);
      showToast(`📍 Nearest Plot: ${nearestToCenter.storefront.name}`);
      return;
    }

    // 4. Otherwise, reset to National All-India Overview (GTA 6 Oblique Perspective)
    clearSearchPin();
    handleStopMove();
    setIsWalkMode(false);
    isWalkModeRef.current = false;
    setFocusedStorefront(null);
    setFocusedRegion(null);
    setIs3DMode(true);
    isFlightActiveRef.current = true;
    mapRef.current.flyTo({
      center: [81.5, 21.0],
      zoom: 4.5,
      pitch: 56,
      bearing: -8,
      duration: 1200,
    });
    mapRef.current.once("moveend", () => {
      isFlightActiveRef.current = false;
    });
    showToast("🇮🇳 India Overview");
  }, [
    activeStreetBusiness,
    focusedStorefront,
    focusedRegion,
    nearestToCenter,
    mapZoom,
    flyToStorefront,
    flyToPlace,
    clearSearchPin,
    handleStopMove,
    showToast,
  ]);

  // Automatically clear search target pin when returning to All-India or clearing region
  useEffect(() => {
    if (!focusedRegion) {
      clearSearchPin();
    }
  }, [focusedRegion, clearSearchPin]);

  // Dynamic Browser URL Address Bar & Document Title Bar synced to live map context
  useEffect(() => {
    if (typeof window === "undefined") return;

    let nextTitle = "Spotlight Bazaar — 3D Business Map of India";
    let nextUrl = "/";

    if (viewLevel === "street" && activeStreetBusiness) {
      const citySlug = (activeStreetBusiness.city_name || "guwahati").toLowerCase().replace(/\s+/g, "-");
      const modeParam = isWalkMode ? "&mode=walk" : "";
      nextUrl = `/?city=${encodeURIComponent(citySlug)}&shop=${encodeURIComponent(activeStreetBusiness.slug)}${modeParam}`;
      nextTitle = `${activeStreetBusiness.name} · ${activeStreetBusiness.city_name || "India"} | Spotlight Bazaar`;
    } else if (focusedRegion) {
      const latStr = focusedRegion.lat.toFixed(4);
      const lonStr = focusedRegion.lon.toFixed(4);
      const zStr = mapZoom.toFixed(1);
      if (focusedRegion.kind === "pincode") {
        const pinCode = focusedRegion.name.replace(/^PIN\s*/i, "").split(/\s+/)[0];
        nextUrl = `/?pin=${encodeURIComponent(pinCode)}&lat=${latStr}&lon=${lonStr}&z=${zStr}`;
        nextTitle = `${focusedRegion.name} · Spotlight Bazaar`;
      } else {
        const slug = focusedRegion.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        nextUrl = `/?place=${encodeURIComponent(slug || focusedRegion.name)}&lat=${latStr}&lon=${lonStr}&z=${zStr}`;
        nextTitle = `${focusedRegion.name} · Spotlight Bazaar`;
      }
    } else if (viewLevel === "region") {
      const nearCity = nearestToCenter && nearestToCenter.distKm < 45 ? nearestToCenter.storefront.city_name : null;
      if (nearCity) {
        nextUrl = `/?city=${encodeURIComponent(nearCity.toLowerCase().replace(/\s+/g, "-"))}`;
        nextTitle = `${nearCity} · Spotlight Bazaar`;
      } else {
        nextUrl = `/?lat=${mapCenter[1].toFixed(4)}&lon=${mapCenter[0].toFixed(4)}&z=${mapZoom.toFixed(1)}`;
        nextTitle = `Exploring India · Spotlight Bazaar`;
      }
    }

    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (currentFull !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [viewLevel, activeStreetBusiness, focusedRegion, isWalkMode, mapZoom, mapCenter, nearestToCenter]);

  // Flat list of all visible Omnibox suggestions for ArrowUp/ArrowDown/Enter keyboard selection
  const flatSuggestions = useMemo(
    () => [
      ...businessSearchResults.map((b) => ({ type: "business" as const, data: b })),
      ...placeSearchResults.map((p) => ({ type: "place" as const, data: p })),
    ],
    [businessSearchResults, placeSearchResults]
  );

  const selectSuggestion = useCallback(
    (item: (typeof flatSuggestions)[number]) => {
      setSearchFocused(false);
      setSearchQuery("");
      setActiveSuggestionIdx(-1);
      if (item.type === "business") {
        flyToStorefront(item.data);
      } else {
        flyToPlace(item.data);
      }
    },
    [flyToPlace, flyToStorefront]
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a1120]">
      {/* 1. MAPLIBRE GL CONTAINER — REAL OPENSTREETMAP BASE (IMAGE 1 BASED) */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2. TOP UNIFIED BAR */}
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

          {viewLevel !== "india" && (
            <button
              type="button"
              onClick={() => {
                if (mapRef.current) {
                  clearSearchPin();
                  handleStopMove();
                  setIsWalkMode(false);
                  isWalkModeRef.current = false;
                  setFocusedRegion(null);
                  setFocusedStorefront(null);
                  isFlightActiveRef.current = true;
                  setIs3DMode(true);
                  mapRef.current.flyTo({
                    center: [81.5, 21.0],
                    zoom: 4.5,
                    pitch: 56,
                    bearing: -8,
                    duration: 1400,
                  });
                  mapRef.current.once("moveend", () => {
                    isFlightActiveRef.current = false;
                  });
                  onCitySelect(null);
                  showToast("🇮🇳 Viewing 3D India Map");
                }
              }}
              className="px-3 py-1.5 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-amber-500/60 text-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-xl transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">See all of India</span>
              <span className="sm:hidden">India</span>
            </button>
          )}

          {/* Live Street Broadcasts Pulse Trigger */}
          <button
            type="button"
            onClick={() => setShowBroadcastsDrawer(true)}
            title="Live deals, coupons, hiring & service requests across India"
            className="px-3 py-1.5 rounded-2xl bg-neutral-950/92 hover:bg-neutral-900 border border-emerald-500/45 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xl backdrop-blur-xl transition-all"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Live Pulse</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-[10px] font-mono tabular-nums text-emerald-300">
              {liveBroadcastEntries.length}
            </span>
          </button>
        </div>

        {/* Center: Dynamic Hybrid Omnibox Search (Businesses + States + Cities + Areas + 6-Digit PIN Codes) */}
        <div ref={searchBoxRef} className="relative flex-1 max-w-md pointer-events-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-neutral-300 pointer-events-none" />
            <input
              id="spotlight-bazaar-search"
              name="searchQuery"
              type="text"
              aria-label="Search business, city, state, area, or PIN code"
              placeholder="Search business, city, state, area, or PIN code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchFocused(false);
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveSuggestionIdx((prev) =>
                    flatSuggestions.length === 0 ? -1 : (prev + 1) % flatSuggestions.length
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveSuggestionIdx((prev) =>
                    flatSuggestions.length === 0 ? -1 : prev <= 0 ? flatSuggestions.length - 1 : prev - 1
                  );
                } else if (e.key === "Enter" && flatSuggestions.length > 0) {
                  e.preventDefault();
                  const chosen = flatSuggestions[activeSuggestionIdx >= 0 ? activeSuggestionIdx : 0];
                  if (chosen) selectSuggestion(chosen);
                }
              }}
              className="w-full pl-10 pr-9 py-2 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-neutral-700/80 text-white text-xs font-medium placeholder:text-neutral-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 shadow-2xl transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setRemoteGeoResults([]);
                  setActiveSuggestionIdx(-1);
                }}
                className="absolute right-2.5 p-1 rounded-full text-neutral-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grouped Autocomplete Results + Live Status / Empty Feedback */}
          {searchFocused && q.length >= 2 && (
            <div className="absolute top-full mt-2 inset-x-0 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl p-2 max-h-72 overflow-y-auto z-30 flex flex-col gap-1.5">
              {businessSearchResults.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                    Live Businesses
                  </div>
                  {businessSearchResults.map((b, idx) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selectSuggestion({ type: "business", data: b })}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs text-white transition-colors ${
                        activeSuggestionIdx === idx ? "bg-neutral-800/90" : "hover:bg-neutral-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate">
                            {b.name}
                            {b.plot_config?.roofSignText ? ` · ${b.plot_config.roofSignText}` : ""}
                          </span>
                          <span className="text-[10px] text-neutral-400 truncate">
                            {b.city_name}{b.pincode ? ` · PIN ${b.pincode}` : ""} · {b.tagline || "Live Plot"}
                          </span>
                        </div>
                      </div>
                      {(b.plot_level || 1) >= 3 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shrink-0 tabular-nums">
                          LVL 3
                        </span>
                      ) : (b.plot_level || 1) === 2 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shrink-0 tabular-nums">
                          LVL 2
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shrink-0">
                          3D Plot
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {placeSearchResults.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400/80">
                    Places, States &amp; PIN Codes
                  </div>
                  {placeSearchResults.map((p, idx) => {
                    const flatIdx = businessSearchResults.length + idx;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectSuggestion({ type: "place", data: p })}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs text-white transition-colors ${
                          activeSuggestionIdx === flatIdx ? "bg-neutral-800/90" : "hover:bg-neutral-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold truncate">{p.name}</span>
                            <span className="text-[10px] text-neutral-400 truncate">{p.subtitle}</span>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-neutral-400 font-mono shrink-0">
                          {p.kind}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {isSearchingGeo && (
                <div className="px-3 py-2 text-[11px] text-neutral-400 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  <span>Searching India places &amp; PIN codes...</span>
                </div>
              )}

              {!isSearchingGeo && businessSearchResults.length === 0 && placeSearchResults.length === 0 && (
                <div className="px-3 py-2.5 text-xs text-neutral-400">
                  No exact match found in India for <span className="text-white font-semibold">&ldquo;{searchQuery.trim()}&rdquo;</span>.
                  {/^\d{6}$/.test(searchQuery.trim()) && (
                    <span className="block text-[10px] text-neutral-500 mt-0.5">
                      Verify the 6-digit Indian PIN code or try searching the town/district name.
                    </span>
                  )}
                </div>
              )}
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
              aria-label={is3DMode ? "Switch to 2D Top-Down View" : "Switch to 3D Drone View"}
              className={`min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] p-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                is3DMode ? "text-amber-400 bg-amber-500/15" : "text-neutral-300 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <Compass className="w-4 h-4" />
            </button>

            {/* Day / Night Theme */}
            <button
              onClick={toggleNightMode}
              title="Toggle Map Style"
              aria-label="Toggle Day / Night Map Theme"
              className="min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center justify-center transition-colors"
            >
              {isNightMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Dynamic Recenter & Reset */}
            <button
              onClick={handleDynamicResetView}
              title={
                activeStreetBusiness || focusedStorefront
                  ? `Recenter on ${(activeStreetBusiness || focusedStorefront)?.name}`
                  : focusedRegion
                  ? `Recenter on ${focusedRegion.name}`
                  : nearestToCenter && nearestToCenter.distKm < 60
                  ? `Focus on nearest plot (${nearestToCenter.storefront.name})`
                  : "Reset to India Overview"
              }
              aria-label="Reset or recenter map view"
              className="min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center justify-center transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-neutral-200" />
            </button>
          </div>

          <Link
            href="/dashboard"
            title="Manage your registered business plot"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white font-semibold text-xs shadow-2xl backdrop-blur-xl transition-all"
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>My Business</span>
          </Link>

          <Link
            href="/register"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-2xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open a Shop</span>
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

      {/* 3. DYNAMIC 3-STATE CONTEXT-AWARE BOTTOM NAVIGATION BAR */}
      <div className="absolute bottom-5 inset-x-4 z-20 flex flex-col items-center gap-2 pointer-events-none">
        {/* STATE A: ALL-INDIA NATIONAL VIEW — Sleek compact 1-row bar (zero Nerqiva hardcoding, zero southern India overlap!) */}
        {viewLevel === "india" && (
          <div className="px-3.5 py-2 rounded-full bg-neutral-950/92 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Globe2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-white">India Map</span>
                <span className="text-neutral-600">·</span>
                <span className="text-emerald-400 font-semibold">
                  {allLiveStorefronts.length} Live {allLiveStorefronts.length === 1 ? "Business" : "Businesses"}
                </span>
                <span className="hidden sm:inline text-neutral-600">·</span>
                <span className="hidden sm:inline text-neutral-400">
                  {activeCityGroups.length} {activeCityGroups.length === 1 ? "City" : "Cities"}
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

            {/* Dynamic Active City Quick-Jump Chips */}
            <div className="flex items-center gap-1.5">
              {activeCityGroups.slice(0, 3).map((grp) => (
                <button
                  key={grp.city}
                  type="button"
                  onClick={() => {
                    if (grp.count === 1) {
                      flyToStorefront(grp.storefronts[0]);
                    } else {
                      flyToPlace({
                        name: grp.city,
                        subtitle: grp.state,
                        kind: "city",
                        lat: grp.lat,
                        lon: grp.lon,
                        zoom: 12.6,
                      });
                    }
                  }}
                  className="px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>{grp.city}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">({grp.count})</span>
                </button>
              ))}
            </div>

            <Link
              href="/register"
              className="px-3 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] flex items-center gap-1 transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>Claim Plot</span>
            </Link>
          </div>
        )}

        {/* STATE B: REGION / STATE / CITY / PIN CODE CONTEXT VIEW */}
        {viewLevel === "region" && (
          <div className="w-full max-w-lg px-4 py-3 rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/35 flex items-center justify-center text-sky-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight truncate">
                    {focusedRegion ? focusedRegion.name : nearestToCenter && nearestToCenter.distKm < 40 ? nearestToCenter.storefront.city_name || "Guwahati" : "Exploring India"}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${
                      nearbyCount > 0
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-neutral-800 text-neutral-300 border-neutral-700"
                    }`}
                  >
                    {nearbyCount > 0 ? `${nearbyCount} Live Here` : "Open Area"}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 truncate">
                  {focusedRegion
                    ? focusedRegion.subtitle
                    : nearbyCount > 0
                    ? "Zoom in or tap a plot to explore in 3D street view"
                    : "No plots claimed here yet · Be the first business in this area"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {nearbyCount > 0 && nearestToCenter ? (
                <button
                  type="button"
                  onClick={() => flyToStorefront(nearestToCenter.storefront)}
                  className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Visit {nearestToCenter.storefront.name}</span>
                </button>
              ) : (
                <Link
                  href="/register"
                  className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Claim First Plot</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* STATE C: STREET / SINGLE BUSINESS PLOT VIEW (Dynamic for whichever business is focused — never falsely shows Nerqiva in another city!) */}
        {viewLevel === "street" && activeStreetBusiness && (
          <>
            <div className="w-full max-w-lg p-3 sm:p-4 rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex flex-col gap-3 pointer-events-auto">
              {/* Status Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white tracking-tight truncate">
                        {activeStreetBusiness.name}
                      </span>
                      {activeStreetBusiness.is_verified && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-1 shrink-0">
                          <ShieldCheck className="w-3 h-3 text-cyan-400" />
                          <span>Verified</span>
                        </span>
                      )}
                      {activeStreetBusiness.is_featured && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                          ★ Featured
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Plot
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 truncate">
                      {activeStreetBusiness.slug === "nerqiva-studio" ? "North Guwahati" : activeStreetBusiness.city_name}
                      {activeStreetBusiness.state_name ? `, ${activeStreetBusiness.state_name}` : ""}
                      {activeStreetBusiness.pincode ? ` · PIN ${activeStreetBusiness.pincode}` : ""} · Clear {isNightMode ? "night" : "day"}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {normalizeExternalUrl(activeStreetBusiness.website_url) && (
                    <a
                      href={normalizeExternalUrl(activeStreetBusiness.website_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Visit ${formatWebsiteDisplay(activeStreetBusiness.website_url)}`}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 text-[11px] font-medium text-amber-300 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="max-w-[140px] truncate">
                        {formatWebsiteDisplay(activeStreetBusiness.website_url)}
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  )}
                  {getGoogleMapsUrl(activeStreetBusiness) && (
                    <a
                      href={getGoogleMapsUrl(activeStreetBusiness)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Google Maps"
                      aria-label={`Open ${activeStreetBusiness.name} in Google Maps`}
                      className="p-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Action Row */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onStorefrontSelect) onStorefrontSelect(activeStreetBusiness);
                    bazaarAudio.playStorefrontChime();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>View {activeStreetBusiness.name}</span>
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
                  onClick={() => setDialogueStorefront(activeStreetBusiness)}
                  className="py-2.5 px-3.5 rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800"
                  title={`Talk to ${activeStreetBusiness.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Talk</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      showToast(`🔗 ${activeStreetBusiness.name} map link copied!`);
                    }
                  }}
                  className="p-2.5 rounded-2xl text-xs font-medium flex items-center justify-center transition-all bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800"
                  title="Share Link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Keyboard Controls Hint Pill — ONLY shown at street level */}
            <div className="hidden md:flex items-center gap-2 pointer-events-auto">
              <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950/80 backdrop-blur-md border border-neutral-800/70 text-[10px] text-neutral-300 font-mono flex items-center gap-2 shadow-lg">
                <span>W A S D walk · Drag look 360° · Scroll zoom · Q / E turn · Shift faster</span>
              </div>
            </div>
          </>
        )}

        {/* STATE C2: STREET LEVEL ON AN UNCLAIMED AREA (e.g. searched PIN 400001 / Mumbai street) */}
        {viewLevel === "street" && !activeStreetBusiness && (
          <div className="w-full max-w-lg px-4 py-3 rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800/90 shadow-2xl flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-sm font-bold text-white truncate">
                  {focusedRegion ? focusedRegion.name : "Open Street Plot"}
                </span>
                <span className="text-[11px] text-neutral-400 truncate">
                  No 3D business claimed on this street yet
                </span>
              </div>
            </div>
            <Link
              href="/register"
              className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Claim First Plot</span>
            </Link>
          </div>
        )}
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

      <LiveBroadcastsDrawer
        isOpen={showBroadcastsDrawer}
        onClose={() => setShowBroadcastsDrawer(false)}
        entries={liveBroadcastEntries}
        onFlyToStorefront={(shop) => flyToStorefront(shop)}
      />
    </div>
  );
}
