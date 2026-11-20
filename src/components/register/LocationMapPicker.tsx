"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import { config, Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Crosshair,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { searchLocalIndiaPlaces, lookupIndianPincode } from "@/lib/geo/indiaPlaces";
import {
  computeSnappedPlotPlacement,
  extractNearbyOsmRoads,
  RoadPolyline,
  SnappedPlotPlacement,
} from "@/lib/geo/plotSnapper";
import { getLocalStorefronts } from "@/lib/utils/localStorefront";
import { SEED_STOREFRONTS } from "@/lib/data/seedStorefronts";

if (typeof window !== "undefined") {
  config.WORKER_URL = "/maplibre-gl-worker.mjs";
}

const CARTO_VOYAGER_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const OSM_RASTER_FALLBACK: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
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
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const INDIA_CENTER: [number, number] = [80.8, 22.0];
const INDIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [58.0, 0.5],
  [108.0, 42.5],
];

interface GeoSuggestion {
  id: string;
  name: string;
  subtitle: string;
  kind: "pincode" | "state" | "city" | "area";
  lat: number;
  lon: number;
  zoom: number;
  pincode?: string;
}

export interface PickedLocation {
  lat: number;
  lon: number;
  facingBearing?: number;
  roadAnchorLat?: number;
  roadAnchorLon?: number;
  connectorType?: "osm_road" | "colony_branch" | "frontage";
  city?: string;
  state?: string;
  pincode?: string;
  label?: string;
}

interface LocationMapPickerProps {
  lat: number | null;
  lon: number | null;
  selectedLabel?: string;
  externalFlyTarget?: { lat: number; lon: number; zoom?: number; key: number } | null;
  onChange: (location: PickedLocation) => void;
}

function createPinElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "flex flex-col items-center cursor-grab active:cursor-grabbing select-none";
  el.innerHTML = `
    <div style="
      width: 32px;
      height: 32px;
      border-radius: 9999px;
      background: #f59e0b;
      border: 3px solid #09090b;
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.45), 0 10px 25px rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 10px; height: 10px; border-radius: 9999px; background: #09090b;"></div>
    </div>
    <div style="
      width: 3px;
      height: 10px;
      background: #09090b;
      border-radius: 2px;
      margin-top: -1px;
    "></div>
    <div style="
      width: 12px;
      height: 4px;
      border-radius: 9999px;
      background: rgba(9, 9, 11, 0.6);
      margin-top: -1px;
    "></div>
  `;
  return el;
}

export async function resolveIndianPincode(pin: string): Promise<{
  pincode: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  zoom: number;
} | null> {
  const cleanPin = pin.replace(/\D/g, "").slice(0, 6);
  if (!/^[1-9]\d{5}$/.test(cleanPin)) return null;

  // 1. Instant check in deterministic local postal index (0ms)
  const direct = lookupIndianPincode(cleanPin);
  if (direct) {
    return direct;
  }

  const localHits = searchLocalIndiaPlaces(cleanPin);
  const exactLocal =
    localHits.find(
      (h) =>
        h.pincode === cleanPin ||
        h.aliases?.includes(cleanPin) ||
        h.name.includes(cleanPin) ||
        h.subtitle.includes(cleanPin)
    );

  if (exactLocal) {
    const parts = exactLocal.subtitle
      .split(/[·,]/)
      .map((p) => p.trim())
      .filter((p) => p && p.toLowerCase() !== "india" && !/^(pin\s*)?[1-9]\d{5}$/i.test(p));
    const stateName = parts.length >= 1 ? parts[parts.length - 1] : "Assam";
    const cleanName = exactLocal.name.replace(/\s*\(.*?\)/g, "").trim();
    const cityName = cleanName || (parts.length >= 2 ? parts[parts.length - 2] : parts[0]);
    return {
      pincode: cleanPin,
      name: exactLocal.name,
      city: cityName,
      state: stateName,
      lat: exactLocal.lat,
      lon: exactLocal.lon,
      zoom: exactLocal.zoom || 16.5,
    };
  }

  // 2. Client-side fetch from India Post / postalpincode.in in browser
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
    if (res.ok) {
      const data = await res.json();
      const poList = data?.[0]?.PostOffice;
      if (Array.isArray(poList) && poList.length > 0) {
        const po = poList[0];
        const poName = po.Name || "";
        const district = po.District || "";
        const state = po.State || "";
        const city = poName || district;

        // Try direct Nominatim coordinate lookup
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${cleanPin}&country=india&format=jsonv2&limit=1`
          );
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (Array.isArray(nomData) && nomData.length > 0) {
              const nLat = parseFloat(nomData[0].lat);
              const nLon = parseFloat(nomData[0].lon);
              if (!isNaN(nLat) && !isNaN(nLon)) {
                return {
                  pincode: cleanPin,
                  name: `${poName} (PIN ${cleanPin})`,
                  city,
                  state,
                  lat: nLat,
                  lon: nLon,
                  zoom: 16.5,
                };
              }
            }
          }
        } catch {}

        // Fallback geocode by district + state
        try {
          const fbRes = await fetch(
            `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(district || city)}&state=${encodeURIComponent(state)}&country=india&format=jsonv2&limit=1`
          );
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            if (Array.isArray(fbData) && fbData.length > 0) {
              const fLat = parseFloat(fbData[0].lat);
              const fLon = parseFloat(fbData[0].lon);
              if (!isNaN(fLat) && !isNaN(fLon)) {
                return {
                  pincode: cleanPin,
                  name: `${poName} (PIN ${cleanPin})`,
                  city,
                  state,
                  lat: fLat,
                  lon: fLon,
                  zoom: 15.5,
                };
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  // 3. Fallback to /api/geo/search
  try {
    const sRes = await fetch(`/api/geo/search?q=${cleanPin}`);
    if (sRes.ok) {
      const sData = await sRes.json();
      const hit = sData?.results?.[0];
      if (hit && typeof hit.lat === "number" && typeof hit.lon === "number") {
        const parts = String(hit.subtitle || "").split(/[·,]/).map((p) => p.trim());
        return {
          pincode: cleanPin,
          name: hit.name,
          city: parts.length >= 2 ? parts[parts.length - 2] : hit.name,
          state: parts[parts.length - 1] || "India",
          lat: hit.lat,
          lon: hit.lon,
          zoom: hit.zoom || 16.5,
        };
      }
    }
  } catch {}

  return null;
}

function parseCityStateFromSuggestion(s: GeoSuggestion): {
  city?: string;
  state?: string;
  pincode?: string;
} {
  const pinMatch =
    s.pincode ||
    s.name.match(/\b([1-9]\d{5})\b/)?.[1] ||
    s.subtitle.match(/\b([1-9]\d{5})\b/)?.[1];

  const parts = s.subtitle
    .split(/[·,]/)
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "india" && !/^(pin\s*)?[1-9]\d{5}$/i.test(p));

  const cleanName = s.name
    .replace(/^PIN\s*[1-9]\d{5}\s*[·-]?\s*/i, "")
    .replace(/\s*\(.*?\)/g, "")
    .trim();

  if (s.kind === "city") {
    return {
      city: s.name,
      state: parts.length >= 1 ? parts[parts.length - 1] : undefined,
      pincode: pinMatch,
    };
  }
  if (s.kind === "pincode" || s.kind === "area") {
    const statePart = parts.length >= 1 ? parts[parts.length - 1] : undefined;
    const districtPart = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    const cityPart = cleanName || districtPart || parts[0];
    return {
      city: cityPart || undefined,
      state: statePart,
      pincode: pinMatch,
    };
  }
  return {
    state: s.name,
    pincode: pinMatch,
  };
}

export function LocationMapPicker({
  lat,
  lon,
  selectedLabel,
  externalFlyTarget,
  onChange,
}: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const lastPlacementRef = useRef<SnappedPlotPlacement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [mapReady, setMapReady] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [snapBadge, setSnapBadge] = useState<string | null>(null);

  // Search box state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<GeoSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Render live 22m x 18m rotated plot footprint + driveway preview on mini-map
  const renderPlotPreviewOverlay = useCallback((placement: SnappedPlotPlacement | null) => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;

    const polySrc = map.getSource("plot-footprint-preview") as maplibregl.GeoJSONSource | undefined;
    const connSrc = map.getSource("plot-driveway-preview") as maplibregl.GeoJSONSource | undefined;

    if (!placement) {
      polySrc?.setData({ type: "FeatureCollection", features: [] });
      connSrc?.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    polySrc?.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [placement.footprintPolygon],
          },
        },
      ],
    });

    connSrc?.setData({
      type: "FeatureCollection",
      features:
        placement.connectorCoords.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: placement.connectorCoords,
                },
              },
            ]
          : [],
    });
  }, []);

  // Ensure preview overlay layers & real OSM vector road sources exist on the mini-map
  const ensurePreviewLayers = useCallback((map: MapLibreMap) => {
    try {
      // 1. Add Carto OpenStreetMap Vector source so extractNearbyOsmRoads queries real OSM road geometry in 0ms anywhere in India!
      if (!map.getSource("protomaps")) {
        map.addSource("protomaps", {
          type: "vector",
          tiles: [
            "https://tiles.basemaps.cartocdn.com/v/20261118-01/vectortiles/carto.streets/v2/{z}/{x}/{y}.mvt",
          ],
          minzoom: 0,
          maxzoom: 15,
        });
        map.addLayer({
          id: "osm-vector-roads-query-layer",
          type: "line",
          source: "protomaps",
          "source-layer": "roads",
          paint: {
            "line-opacity": 0.01,
            "line-color": "#f59e0b",
          },
        });
      }

      if (!map.getSource("plot-driveway-preview")) {
        map.addSource("plot-driveway-preview", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "plot-driveway-preview-line",
          type: "line",
          source: "plot-driveway-preview",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#f59e0b",
            "line-width": 4,
            "line-dasharray": [1.5, 1.2],
          },
        });
      }

      if (!map.getSource("plot-footprint-preview")) {
        map.addSource("plot-footprint-preview", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "plot-footprint-preview-fill",
          type: "fill",
          source: "plot-footprint-preview",
          paint: {
            "fill-color": "#f59e0b",
            "fill-opacity": 0.28,
          },
        });
        map.addLayer({
          id: "plot-footprint-preview-stroke",
          type: "line",
          source: "plot-footprint-preview",
          paint: {
            "line-color": "#d97706",
            "line-width": 2.2,
          },
        });
      }
    } catch {
      // Ignore if style is still transitioning
    }
  }, []);

  // Snap raw pin cleanly off real OSM street roads, face street, and draw live footprint preview
  const snapAndPlacePin = useCallback(
    (
      rawLon: number,
      rawLat: number,
      extraMeta?: { city?: string; state?: string; pincode?: string; label?: string }
    ): SnappedPlotPlacement => {
      const map = mapRef.current;
      // Extract strictly real OSM vector roads from the loaded map tiles (no hardcoded colonies!)
      const osmRoads = extractNearbyOsmRoads(map, rawLon, rawLat, 350);
      const existingStorefronts = [...SEED_STOREFRONTS, ...getLocalStorefronts()].map((s) => ({
        lat: s.lat,
        lon: s.lon,
        slug: s.slug,
      }));

      const snapped = computeSnappedPlotPlacement({
        rawLat,
        rawLon,
        roads: osmRoads,
        existingPlots: existingStorefronts,
      });

      lastPlacementRef.current = snapped;
      placeMarker(snapped.lon, snapped.lat);
      renderPlotPreviewOverlay(snapped);

      if (snapped.connectorType === "osm_road") {
        setSnapBadge(
          snapped.wasAutoAdjusted
            ? "Snapped beside street · Auto-set back"
            : "Connected to OSM street"
        );
      } else {
        setSnapBadge("Open land · Frontage avenue created");
      }

      onChangeRef.current({
        lat: snapped.lat,
        lon: snapped.lon,
        facingBearing: snapped.facingBearing,
        roadAnchorLat: snapped.roadAnchorLat,
        roadAnchorLon: snapped.roadAnchorLon,
        connectorType: snapped.connectorType,
        ...extraMeta,
      });

      // If vector tiles were still loading during a jump, retry extraction after 320ms so it snaps cleanly to real street
      if (osmRoads.length === 0) {
        setTimeout(() => {
          const liveMap = mapRef.current;
          if (!liveMap) return;
          const retryRoads = extractNearbyOsmRoads(liveMap, rawLon, rawLat, 350);
          if (retryRoads.length > 0) {
            const reSnapped = computeSnappedPlotPlacement({
              rawLat,
              rawLon,
              roads: retryRoads,
              existingPlots: existingStorefronts,
            });

            lastPlacementRef.current = reSnapped;
            placeMarker(reSnapped.lon, reSnapped.lat);
            renderPlotPreviewOverlay(reSnapped);

            setSnapBadge(
              reSnapped.connectorType === "osm_road"
                ? reSnapped.wasAutoAdjusted
                  ? "Snapped beside street · Auto-set back"
                  : "Connected to OSM street"
                : "Open land · Frontage avenue created"
            );

            onChangeRef.current({
              lat: reSnapped.lat,
              lon: reSnapped.lon,
              facingBearing: reSnapped.facingBearing,
              roadAnchorLat: reSnapped.roadAnchorLat,
              roadAnchorLon: reSnapped.roadAnchorLon,
              connectorType: reSnapped.connectorType,
              ...extraMeta,
            });
          }
        }, 320);
      }

      return snapped;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [renderPlotPreviewOverlay]
  );

  // Place or move draggable marker cleanly on the mini-map
  const placeMarker = useCallback((nextLon: number, nextLat: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      const marker = new maplibregl.Marker({
        element: createPinElement(),
        anchor: "bottom",
        draggable: true,
      })
        .setLngLat([nextLon, nextLat])
        .addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        const snapped = snapAndPlacePin(pos.lng, pos.lat);
        reverseGeocode(snapped.lat, snapped.lon);
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([nextLon, nextLat]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gentle reverse geocoder (fills city/state/pincode when user clicks/drags pin or uses GPS)
  const reverseGeocode = useCallback(async (targetLat: number, targetLon: number) => {
    setReverseLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLon}&zoom=16&addressdetails=1&accept-language=en`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const data = await res.json();
      const addr = data?.address || {};
      if (addr.country_code && addr.country_code.toLowerCase() !== "in") {
        setStatusMessage("Please place your pin inside India.");
        return;
      }
      const detectedCity =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        addr.state_district ||
        "";
      const detectedState = addr.state || "";
      const rawPin = typeof addr.postcode === "string" ? addr.postcode.replace(/\D/g, "") : "";
      const detectedPin = /^[1-9]\d{5}$/.test(rawPin) ? rawPin : undefined;
      const areaBit = addr.road || addr.neighbourhood || addr.suburb || "";
      const label = [areaBit, detectedCity, detectedState].filter(Boolean).join(", ");

      setStatusMessage(null);
      onChangeRef.current({
        lat: Number(targetLat.toFixed(6)),
        lon: Number(targetLon.toFixed(6)),
        city: detectedCity || undefined,
        state: detectedState || undefined,
        pincode: detectedPin,
        label: label || undefined,
      });
    } catch {
      // Exact coordinates are already saved; fail silently if reverse-geocode is offline
    } finally {
      setReverseLoading(false);
    }
  }, []);

  // Initialize MapLibre mini-map once with high-contrast, crystal-clear OpenStreetMap style (zero over-whiting)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const hasInitial = typeof lat === "number" && typeof lon === "number";
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTO_VOYAGER_STYLE,
      center: hasInitial ? [lon, lat] : INDIA_CENTER,
      zoom: hasInitial ? 16.5 : 3.05,
      minZoom: 2.7,
      maxZoom: 19.5,
      maxBounds: INDIA_MAX_BOUNDS,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(mapContainerRef.current);

    const applyHighContrastStyle = () => {
      try {
        if (map.getLayer("background")) {
          map.setPaintProperty("background", "background-color", "#f8fafc");
        }
        if (map.getLayer("water")) {
          map.setPaintProperty("water", "fill-color", "#0284c7");
          map.setPaintProperty("water", "fill-opacity", 1.0);
        }
        if (map.getLayer("landcover")) {
          map.setPaintProperty("landcover", "fill-color", "#dcfce7");
          map.setPaintProperty("landcover", "fill-opacity", 0.65);
        }
        if (map.getLayer("landuse_residential")) {
          map.setPaintProperty("landuse_residential", "fill-color", "#f1f5f9");
          map.setPaintProperty("landuse_residential", "fill-opacity", 0.85);
        }

        const casingLayers = [
          "road_minor_case", "road_service_case", "road_sec_case_noramp", "road_sec_case_ramp",
          "road_pri_case_noramp", "road_pri_case_ramp", "road_trunk_case_noramp", "road_trunk_case_ramp",
          "road_mot_case_noramp", "road_mot_case_ramp",
          "bridge_minor_case", "bridge_service_case", "bridge_sec_case_noramp", "bridge_pri_case_noramp",
          "tunnel_minor_case", "tunnel_sec_case_noramp", "tunnel_pri_case_noramp",
          "road_minor_casing", "road_service_casing", "road_sec_casing",
          "road_pri_casing", "road_trunk_casing", "road_mot_casing",
        ];
        for (const id of casingLayers) {
          if (map.getLayer(id)) {
            map.setPaintProperty(id, "line-color", "#64748b");
            map.setPaintProperty(id, "line-opacity", 1.0);
          }
        }

        const fillLayers = [
          "road_minor_fill", "road_service_fill", "road_sec_fill_noramp",
          "road_pri_fill_noramp", "road_trunk_fill_noramp", "road_mot_fill_noramp",
          "bridge_minor_fill", "bridge_service_fill", "bridge_sec_fill_noramp", "bridge_pri_fill_noramp",
          "tunnel_minor_fill", "tunnel_sec_fill_noramp", "tunnel_pri_fill_noramp",
        ];
        for (const id of fillLayers) {
          if (map.getLayer(id)) {
            map.setPaintProperty(id, "line-color", "#ffffff");
            map.setPaintProperty(id, "line-opacity", 1.0);
          }
        }
      } catch {}
    };

    map.on("error", (e: { error?: { message?: string } }) => {
      if (e?.error?.message?.toLowerCase().includes("style")) {
        map.setStyle(OSM_RASTER_FALLBACK);
      }
    });

    map.on("load", () => {
      applyHighContrastStyle();
      ensurePreviewLayers(map);
      setMapReady(true);
      if (hasInitial) {
        snapAndPlacePin(lon, lat);
      }
    });

    map.on("click", (e) => {
      const clickLat = Number(e.lngLat.lat.toFixed(6));
      const clickLon = Number(e.lngLat.lng.toFixed(6));
      setStatusMessage(null);

      if (map.getZoom() < 14.5) {
        // Zoom into street level first so vector road tiles load, then snap cleanly off the road!
        placeMarker(clickLon, clickLat);
        map.easeTo({ center: [clickLon, clickLat], zoom: 16.5, duration: 600 });
        map.once("idle", () => {
          const snapped = snapAndPlacePin(clickLon, clickLat);
          reverseGeocode(snapped.lat, snapped.lon);
        });
      } else {
        const snapped = snapAndPlacePin(clickLon, clickLat);
        reverseGeocode(snapped.lat, snapped.lon);
      }
    });

    mapRef.current = map;
    if (mapContainerRef.current) {
      (mapContainerRef.current as any)._mapLibre = map;
    }

    return () => {
      ro.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to external coordinate fly triggers (e.g. user typed a 6-digit Indian PIN code above)
  useEffect(() => {
    if (!externalFlyTarget || !mapRef.current || !mapReady) return;
    const { lat: fLat, lon: fLon, zoom = 16 } = externalFlyTarget;
    const map = mapRef.current;
    placeMarker(fLon, fLat);
    map.flyTo({
      center: [fLon, fLat],
      zoom: Math.max(zoom, 16),
      duration: 950,
      essential: true,
    });
    map.once("idle", () => {
      snapAndPlacePin(fLon, fLat);
    });
  }, [externalFlyTarget, mapReady, placeMarker, snapAndPlacePin]);

  // Close search dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced India geo search (PIN codes, areas, towns, streets) with direct client-side fallback
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    // If query contains a 6-digit Indian PIN code, resolve it immediately via client India Post index
    const pinMatch = q.match(/\b([1-9]\d{5})\b/)?.[1];
    if (pinMatch) {
      resolveIndianPincode(pinMatch).then((res) => {
        if (!cancelled && res) {
          setRemoteResults((prev) => [
            {
              id: `pincode-${res.pincode}`,
              name: res.name,
              subtitle: `${res.city}, ${res.state} · PIN ${res.pincode}`,
              kind: "pincode",
              lat: res.lat,
              lon: res.lon,
              zoom: res.zoom,
              pincode: res.pincode,
            },
            ...prev.filter((p) => p.id !== `pincode-${res.pincode}`),
          ]);
          setSearching(false);
        }
      });
    }

    const timer = setTimeout(() => {
      fetch(`/api/geo/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && Array.isArray(d?.results) && d.results.length > 0) {
            setRemoteResults((prev) => {
              const seen = new Set(d.results.map((r: GeoSuggestion) => r.name.toLowerCase()));
              const preserved = prev.filter((p) => !seen.has(p.name.toLowerCase()));
              return [...preserved, ...d.results];
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Merge instant local India places + live geocoder results
  const combinedSuggestions: GeoSuggestion[] = React.useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return [];
    const local: GeoSuggestion[] = searchLocalIndiaPlaces(q).map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle,
      kind: p.kind,
      lat: p.lat,
      lon: p.lon,
      zoom: p.zoom,
    }));
    const seen = new Set(local.map((p) => p.name.toLowerCase()));
    const merged = [...local];
    for (const r of remoteResults) {
      if (!seen.has(r.name.toLowerCase())) {
        seen.add(r.name.toLowerCase());
        merged.push(r);
      }
    }
    return merged.slice(0, 6);
  }, [searchQuery, remoteResults]);

  const handleSelectSuggestion = (s: GeoSuggestion) => {
    setSearchOpen(false);
    setSearchQuery(s.name);
    setActiveIdx(-1);
    setStatusMessage(null);

    const parsed = parseCityStateFromSuggestion(s);
    const nextZoom = Math.max(s.zoom || 15.5, s.kind === "state" ? 8.5 : 16.5);
    const label = s.subtitle ? `${s.name}, ${s.subtitle}` : s.name;

    const map = mapRef.current;
    placeMarker(s.lon, s.lat);
    onChange({
      lat: Number(s.lat.toFixed(6)),
      lon: Number(s.lon.toFixed(6)),
      city: parsed.city,
      state: parsed.state,
      pincode: parsed.pincode,
      label,
    });

    if (map) {
      map.flyTo({
        center: [s.lon, s.lat],
        zoom: nextZoom,
        duration: 950,
        essential: true,
      });
      if (s.kind !== "state") {
        map.once("idle", () => {
          snapAndPlacePin(s.lon, s.lat, {
            city: parsed.city,
            state: parsed.state,
            pincode: parsed.pincode,
            label,
          });
        });
      }
    }
  };

  const handleUseGPS = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatusMessage("GPS is unavailable in this browser. Search or click the map instead.");
      return;
    }

    setLocatingGps(true);
    setStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gpsLat = Number(pos.coords.latitude.toFixed(6));
        const gpsLon = Number(pos.coords.longitude.toFixed(6));
        const map = mapRef.current;
        placeMarker(gpsLon, gpsLat);
        if (map) {
          map.flyTo({
            center: [gpsLon, gpsLat],
            zoom: 17.2,
            duration: 1000,
            essential: true,
          });
          map.once("idle", () => {
            const snapped = snapAndPlacePin(gpsLon, gpsLat);
            reverseGeocode(snapped.lat, snapped.lon);
          });
        } else {
          onChange({ lat: gpsLat, lon: gpsLon });
          reverseGeocode(gpsLat, gpsLon);
        }
        setLocatingGps(false);
      },
      () => {
        setStatusMessage("Location permission denied. Search your area or tap directly on the map.");
        setLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  const handleZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ zoom: Math.min(19.5, Math.max(2.7, map.getZoom() + delta)), duration: 240 });
  };

  const hasPinned = typeof lat === "number" && typeof lon === "number";

  return (
    <div className="space-y-3">
      {/* Header row + Use My GPS */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label
            htmlFor="mini-map-search"
            className="block text-sm font-medium text-neutral-100"
          >
            Pin Exact Plot Location on India Map <span className="text-amber-400">*</span>
          </label>
          <p className="text-xs text-neutral-400 mt-0.5">
            Plots automatically set back off the road, rotate to face traffic, and connect their driveway.
          </p>
        </div>

        <button
          type="button"
          onClick={handleUseGPS}
          disabled={locatingGps}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-amber-500/12 hover:bg-amber-500/20 border border-amber-500/35 text-xs font-semibold text-amber-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-60"
        >
          {locatingGps ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5" />
          )}
          <span>{locatingGps ? "Locating…" : "Use My GPS"}</span>
        </button>
      </div>

      {/* All-India Search Bar for jumping the mini-map */}
      <div ref={searchWrapRef} className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
          <input
            id="mini-map-search"
            type="text"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              setSearchOpen(true);
              setActiveIdx(-1);

              const cleanDigits = val.trim().replace(/\D/g, "");
              if (cleanDigits.length === 6 && /^[1-9]\d{5}$/.test(cleanDigits)) {
                resolveIndianPincode(cleanDigits).then((res) => {
                  if (res) {
                    handleSelectSuggestion({
                      id: `pincode-${res.pincode}`,
                      name: res.name,
                      subtitle: `${res.city}, ${res.state} · PIN ${res.pincode}`,
                      kind: "pincode",
                      lat: res.lat,
                      lon: res.lon,
                      zoom: res.zoom,
                      pincode: res.pincode,
                    });
                  }
                });
              }
            }}
            onKeyDown={async (e) => {
              if (e.key === "ArrowDown") {
                if (!searchOpen || combinedSuggestions.length === 0) return;
                e.preventDefault();
                setActiveIdx((prev) => (prev + 1) % combinedSuggestions.length);
              } else if (e.key === "ArrowUp") {
                if (!searchOpen || combinedSuggestions.length === 0) return;
                e.preventDefault();
                setActiveIdx((prev) =>
                  prev <= 0 ? combinedSuggestions.length - 1 : prev - 1
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (activeIdx >= 0 && combinedSuggestions[activeIdx]) {
                  handleSelectSuggestion(combinedSuggestions[activeIdx]);
                } else if (combinedSuggestions.length > 0) {
                  // User typed query and pressed Enter directly without down-arrow: pick top result
                  handleSelectSuggestion(combinedSuggestions[0]);
                } else {
                  // Check if query is a 6-digit Indian PIN code and resolve immediately!
                  const rawQ = searchQuery.trim();
                  const pinMatch = rawQ.match(/\b([1-9]\d{5})\b/)?.[1] || rawQ.replace(/\D/g, "");
                  if (/^[1-9]\d{5}$/.test(pinMatch)) {
                    setSearching(true);
                    const res = await resolveIndianPincode(pinMatch);
                    setSearching(false);
                    if (res) {
                      handleSelectSuggestion({
                        id: `pincode-${res.pincode}`,
                        name: res.name,
                        subtitle: `${res.city}, ${res.state} · PIN ${res.pincode}`,
                        kind: "pincode",
                        lat: res.lat,
                        lon: res.lon,
                        zoom: res.zoom,
                        pincode: res.pincode,
                      });
                    }
                  } else if (rawQ.length >= 2) {
                    setSearching(true);
                    try {
                      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(rawQ)}`);
                      if (res.ok) {
                        const d = await res.json();
                        if (Array.isArray(d?.results) && d.results.length > 0) {
                          handleSelectSuggestion(d.results[0]);
                        }
                      }
                    } catch {}
                    setSearching(false);
                  }
                }
              } else if (e.key === "Escape") {
                setSearchOpen(false);
              }
            }}
            placeholder="Search any Indian city, area, or 6-digit PIN…"
            autoComplete="off"
            className="w-full min-h-[44px] pl-10 pr-10 rounded-xl bg-[#121215] border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-400/80 focus:outline-none focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/20 transition-colors"
          />
          {searching ? (
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3.5" />
          ) : (
            searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setRemoteResults([]);
                }}
                aria-label="Clear map search"
                className="absolute right-2 p-2 text-neutral-400 hover:text-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Autosuggestions Popover */}
        {searchOpen && combinedSuggestions.length > 0 && (
          <ul
            role="listbox"
            aria-label="Location suggestions"
            className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl bg-[#121215] border border-neutral-700/90 shadow-2xl overflow-hidden divide-y divide-neutral-800/80"
          >
            {combinedSuggestions.map((item, idx) => (
              <li key={item.id} role="option" aria-selected={idx === activeIdx}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                    idx === activeIdx
                      ? "bg-amber-500/15 text-white"
                      : "hover:bg-neutral-800/70 text-neutral-100"
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                      {item.subtitle && (
                        <div className="text-[11px] text-neutral-300 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    {item.kind}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Interactive MapLibre Mini-Map Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-[#0d1117] shadow-xl">
        <div
          ref={mapContainerRef}
          style={{ height: 380 }}
          className="w-full h-[360px] sm:h-[400px] min-h-[360px]"
          aria-label="Interactive India map for selecting business coordinates"
        />

        {/* Zoom Controls */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <div className="flex flex-col rounded-xl overflow-hidden border border-neutral-800/90 bg-[#09090b]/90 backdrop-blur-md shadow-lg">
            <button
              type="button"
              onClick={() => handleZoom(1.4)}
              aria-label="Zoom in map"
              className="w-8 h-8 flex items-center justify-center text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors border-b border-neutral-800/90"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-1.4)}
              aria-label="Zoom out map"
              className="w-8 h-8 flex items-center justify-center text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Snap Status Pill inside map */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none px-2.5 py-1 rounded-lg bg-[#09090b]/88 border border-neutral-800/90 backdrop-blur-md text-[11px] font-medium text-neutral-100 max-w-[260px] truncate">
          {snapBadge || (hasPinned ? "Drag pin or click to refine" : "Click anywhere in India to drop pin")}
        </div>

        {/* Bottom Coordinate Bar */}
        <div className="px-3.5 py-2.5 bg-[#0e0e11] border-t border-neutral-800/90 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                hasPinned ? "bg-emerald-400" : "bg-neutral-600"
              }`}
            />
            {hasPinned ? (
              <span className="font-mono text-[11px] text-neutral-200 tabular-nums">
                {lat.toFixed(5)}° N, {lon.toFixed(5)}° E
              </span>
            ) : (
              <span className="text-neutral-400">No plot coordinates pinned yet</span>
            )}
          </div>

          <div className="text-[11px] text-neutral-400 truncate max-w-[230px] sm:max-w-[260px]">
            {reverseLoading ? (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Resolving address…
              </span>
            ) : (
              selectedLabel || (hasPinned ? "Exact 3D building spot locked" : "All India supported")
            )}
          </div>
        </div>
      </div>

      {statusMessage && (
        <p role="status" className="text-xs text-amber-300">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
