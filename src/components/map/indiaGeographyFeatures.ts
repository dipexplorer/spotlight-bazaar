/**
 * India's 7 Primary Physiographic & Topographic Regions
 * Transforms flat satellite maps into an authentic 3D geographical digital replica
 */

export interface GeoTerrainFeature {
  id: string;
  name: string;
  zone: string;
  elevation: string;
  coordinates: [number, number]; // [lng, lat]
  description: string;
  icon: string;
  zoom: number;
  pitch: number;
  bearing: number;
}

export const MAJOR_INDIA_GEOGRAPHY_REGIONS: GeoTerrainFeature[] = [
  {
    id: "himalayas",
    name: "The Great Himalayas",
    zone: "Northern Mountain Wall",
    elevation: "8,848m Peak",
    coordinates: [78.6, 30.6],
    description: "Towering glaciated ranges, deep river gorges & snowcapped peaks",
    icon: "🏔️",
    zoom: 6.8,
    pitch: 65,
    bearing: -20,
  },
  {
    id: "kangchenjunga",
    name: "Kangchenjunga & Eastern Ranges",
    zone: "Eastern Himalayas",
    elevation: "8,586m Peak",
    coordinates: [88.15, 27.7],
    description: "Sikkim massif, rugged Arunachal ridges & Brahmaputra gorge",
    icon: "🏔️",
    zoom: 6.9,
    pitch: 62,
    bearing: 15,
  },
  {
    id: "indo-gangetic",
    name: "Indo-Gangetic Basin",
    zone: "Northern Alluvial Plains",
    elevation: "200m Plains",
    coordinates: [81.5, 26.2],
    description: "Vast fertile alluvial plain formed by the sacred Ganga and Yamuna river systems",
    icon: "🌾",
    zoom: 6.2,
    pitch: 45,
    bearing: 0,
  },
  {
    id: "thar-desert",
    name: "Thar Desert (Marusthali)",
    zone: "Great Indian Arid Zone",
    elevation: "250m Dunes",
    coordinates: [71.4, 26.8],
    description: "Rolling sand dunes, arid salt basins & ancient Precambrian bedrock",
    icon: "🏜️",
    zoom: 6.5,
    pitch: 52,
    bearing: -10,
  },
  {
    id: "deccan-plateau",
    name: "Deccan Plateau",
    zone: "Peninsular Basalt Tableland",
    elevation: "600m - 900m",
    coordinates: [76.5, 17.5],
    description: "Ancient volcanic basalt tablelands and river valleys bounded by the Ghats",
    icon: "⛰️",
    zoom: 6.2,
    pitch: 48,
    bearing: 5,
  },
  {
    id: "western-ghats",
    name: "Western Ghats (Sahyadri)",
    zone: "Coastal Mountain Escarpment",
    elevation: "2,695m Anamudi",
    coordinates: [74.2, 14.8],
    description: "1,600 km continuous biodiversity mountain escarpment along the Arabian Sea",
    icon: "🌿",
    zoom: 6.8,
    pitch: 64,
    bearing: 18,
  },
  {
    id: "eastern-ghats",
    name: "Eastern Ghats",
    zone: "Dissected Highlands",
    elevation: "1,680m Peak",
    coordinates: [82.8, 18.2],
    description: "Ancient weathered hills and river deltas along the Bay of Bengal coastline",
    icon: "🌄",
    zoom: 6.5,
    pitch: 50,
    bearing: -15,
  },
];

export const INDIA_GEOGRAPHY_REGIONS_GEOJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: "FeatureCollection",
  features: MAJOR_INDIA_GEOGRAPHY_REGIONS.map((region) => ({
    type: "Feature",
    properties: {
      id: region.id,
      name: region.name,
      zone: region.zone,
      elevation: region.elevation,
      description: region.description,
      icon: region.icon,
      zoom: region.zoom,
      pitch: region.pitch,
      bearing: region.bearing,
    },
    geometry: {
      type: "Point",
      coordinates: region.coordinates,
    },
  })),
};
