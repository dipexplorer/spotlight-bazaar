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
import { searchLocalIndiaPlaces } from "@/lib/geo/indiaPlaces";
import {
  computeSnappedPlotPlacement,
  extractNearbyOsmRoads,
  getColonySeedRoads,
  SnappedPlotPlacement,
} from "@/lib/geo/plotSnapper";
import { getLocalStorefronts } from "@/lib/utils/localStorefront";
import { SEED_STOREFRONTS } from "@/lib/data/seedStorefronts";

if (typeof window !== "undefined") {
  config.WORKER_URL = "/maplibre-gl-worker.mjs";
}

const CARTO_VOYAGER_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const MAP_THEMES: Record<
  "streets" | "satellite",
  { id: "streets" | "satellite"; label: string; style: maplibregl.StyleSpecification }
> = {
  streets: {
    id: "streets",
    label: "Streets",
    style: {
      version: 8,
      sources: {
        "osm-tiles": {
          type: "raster",
          tiles: [
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
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
    },
  },
  satellite: {
    id: "satellite",
    label: "Satellite",
    style: {
      version: 8,
      sources: {
        "esri-satellite": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Esri",
        },
      },
      layers: [
        {
          id: "esri-satellite-layer",
          type: "raster",
          source: "esri-satellite",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
};

type MapThemeKey = keyof typeof MAP_THEMES;

const OSM_RASTER_FALLBACK = MAP_THEMES.streets.style;

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
    .filter((p) => p && p.toLowerCase() !== "india" && !/^\d{6}$/.test(p));

  if (s.kind === "city") {
    return {
      city: s.name,
      state: parts[0] || undefined,
      pincode: pinMatch,
    };
  }
  if (s.kind === "pincode") {
    const cleanName = s.name.replace(/^PIN\s*\d{6}\s*[·-]?\s*/i, "").trim();
    const cityPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || cleanName;
    const statePart = parts.length >= 2 ? parts[parts.length - 1] : undefined;
    return {
      city: cityPart || undefined,
      state: statePart,
      pincode: pinMatch,
    };
  }
  if (s.kind === "area") {
    const cityPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || s.name;
    const statePart = parts.length >= 2 ? parts[parts.length - 1] : undefined;
    return {
      city: cityPart,
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

  const [activeTheme, setActiveTheme] = useState<MapThemeKey>("streets");
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

  // Ensure preview overlay layers exist on the mini-map
  const ensurePreviewLayers = useCallback((map: MapLibreMap) => {
    try {
      // Show existing colony seed spine road (e.g. Nerqiva access road) on mini-map
      const seedRoads = getColonySeedRoads();
      if (!map.getSource("mini-colony-seeds")) {
        map.addSource("mini-colony-seeds", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: seedRoads.map((r) => ({
              type: "Feature",
              properties: { id: r.id },
              geometry: { type: "LineString", coordinates: r.coords },
            })),
          },
        });
        map.addLayer({
          id: "mini-colony-seeds-line",
          type: "line",
          source: "mini-colony-seeds",
          paint: {
            "line-color": "#64748b",
            "line-width": 4,
            "line-opacity": 0.75,
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

  // Snap raw pin cleanly off nearby OSM/colony roads, face street, and draw live footprint preview
  const snapAndPlacePin = useCallback(
    (
      rawLon: number,
      rawLat: number,
      extraMeta?: { city?: string; state?: string; pincode?: string; label?: string }
    ): SnappedPlotPlacement => {
      const map = mapRef.current;
      const osmRoads = extractNearbyOsmRoads(map, rawLon, rawLat, 240);
      const colonyRoads = getColonySeedRoads();
      const existingStorefronts = [...SEED_STOREFRONTS, ...getLocalStorefronts()].map((s) => ({
        lat: s.lat,
        lon: s.lon,
        slug: s.slug,
      }));

      // Also include previously generated connectors from local storefronts in the road graph
      const localConnectors = getLocalStorefronts()
        .filter((s) => typeof s.road_anchor_lat === "number" && typeof s.road_anchor_lon === "number")
        .map((s) => ({
          id: `local-conn-${s.slug}`,
          source: "colony" as const,
          coords: [
            [s.lon, s.lat] as [number, number],
            [s.road_anchor_lon!, s.road_anchor_lat!] as [number, number],
          ],
          priority: 2,
        }));

      const snapped = computeSnappedPlotPlacement({
        rawLat,
        rawLon,
        roads: [...osmRoads, ...colonyRoads, ...localConnectors],
        existingPlots: existingStorefronts,
      });

      lastPlacementRef.current = snapped;
      placeMarker(snapped.lon, snapped.lat);
      renderPlotPreviewOverlay(snapped);

      if (snapped.connectorType === "colony_branch") {
        setSnapBadge("Snapped beside colony road · Auto-connected");
      } else if (snapped.connectorType === "osm_road") {
        setSnapBadge(
          snapped.wasAutoAdjusted
            ? "Auto-set back off road · Facing street"
            : "Connected to nearby OSM road"
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

  // Switch map view style (High-contrast streets vs. satellite)
  const handleSwitchTheme = useCallback(
    (nextTheme: MapThemeKey) => {
      setActiveTheme(nextTheme);
      const map = mapRef.current;
      if (!map) return;
      map.setStyle(MAP_THEMES[nextTheme].style);
      map.once("styledata", () => {
        ensurePreviewLayers(map);
        if (lastPlacementRef.current) {
          renderPlotPreviewOverlay(lastPlacementRef.current);
        }
      });
    },
    [ensurePreviewLayers, renderPlotPreviewOverlay]
  );

  // Initialize MapLibre mini-map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const hasInitial = typeof lat === "number" && typeof lon === "number";
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_THEMES.streets.style,
      center: hasInitial ? [lon, lat] : INDIA_CENTER,
      zoom: hasInitial ? 16 : 3.05,
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

    map.on("error", (e: { error?: { message?: string } }) => {
      if (e?.error?.message?.toLowerCase().includes("style")) {
        map.setStyle(OSM_RASTER_FALLBACK);
      }
    });

    map.on("load", () => {
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

  // Debounced India geo search (PIN codes, areas, towns, streets)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/geo/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && Array.isArray(d?.results)) {
            setRemoteResults(d.results);
          }
        })
        .catch(() => {
          if (!cancelled) setRemoteResults([]);
        })
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
              setSearchQuery(e.target.value);
              setSearchOpen(true);
              setActiveIdx(-1);
            }}
            onKeyDown={(e) => {
              if (!searchOpen || combinedSuggestions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((prev) => (prev + 1) % combinedSuggestions.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((prev) =>
                  prev <= 0 ? combinedSuggestions.length - 1 : prev - 1
                );
              } else if (e.key === "Enter" && activeIdx >= 0) {
                e.preventDefault();
                handleSelectSuggestion(combinedSuggestions[activeIdx]);
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
                      <div className="text-xs font-semibold truncate">{item.name}</div>
                      {item.subtitle && (
                        <div className="text-[11px] text-neutral-400 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
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

        {/* Style Switcher & Zoom Controls */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {/* Layer switcher: Streets vs. Satellite */}
          <div className="flex items-center rounded-xl overflow-hidden border border-neutral-800/90 bg-[#09090b]/92 backdrop-blur-md p-0.5 shadow-lg">
            <button
              type="button"
              onClick={() => handleSwitchTheme("streets")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                activeTheme === "streets"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              Streets
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTheme("satellite")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                activeTheme === "satellite"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              Satellite
            </button>
          </div>

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
