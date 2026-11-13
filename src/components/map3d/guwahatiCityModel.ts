import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BusinessStorefront } from "@/types";
import { buildCartoonStorefrontPlot, StorefrontMeshResult } from "./cartoonStorefront";
import { createRoadTexture, createSidewalkTexture, createStripedCurbTexture } from "./streetTextures";
import { computeDynamicStorefrontPlacements } from "./dynamicStorefrontPlacement";
import { DEFAULT_CITY_ANCHORS } from "@/lib/geo/geoProjection";

export interface ColonyDefinition {
  name: string;
  pincode: string;
  zone: string;
  x: number;
  z: number;
  description: string;
}

export const GUWAHATI_COLONIES: ColonyDefinition[] = [
  {
    "name": "GS Road & Christian Basti",
    "pincode": "781005",
    "zone": "Modern Commercial Flagship",
    "x": 60,
    "z": 15,
    "description": "Flagship business boulevard & home of Nerqiva Studio"
  },
  {
    "name": "Pan Bazar Riverfront",
    "pincode": "781001",
    "zone": "Commercial Heritage Hub",
    "x": -25,
    "z": -24,
    "description": "Brahmaputra riverfront, Cotton University & historic publishing district"
  },
  {
    "name": "Uzan Bazar Lakefront",
    "pincode": "781004",
    "zone": "Lakeside Cultural District",
    "x": 65,
    "z": -10,
    "description": "Dighalipukhuri heritage lake, Assam State Museum & artisanal cafes"
  },
  {
    "name": "Paltan Bazar & Station Road",
    "pincode": "781008",
    "zone": "Transit & Wholesale Hub",
    "x": 15,
    "z": 45,
    "description": "Guwahati Railway Junction, transit hub & commercial trading center"
  },
  {
    "name": "Ganeshguri Commercial Center",
    "pincode": "781005",
    "zone": "Central Flyover Retail District",
    "x": 125,
    "z": 90,
    "description": "Ganeshguri flyover junction, lifestyle retail & vibrant eateries"
  },
  {
    "name": "Dispur Secretariat Avenue",
    "pincode": "781006",
    "zone": "Capital Commercial District",
    "x": 160,
    "z": 140,
    "description": "Government Secretariat, tea auction center & premier retail"
  },
  {
    "name": "Chandmari & Zoo Road",
    "pincode": "781003",
    "zone": "Media & Commercial Arts Hub",
    "x": 175,
    "z": 15,
    "description": "Assam State Zoo, media houses & premier shopping promenade"
  },
  {
    "name": "Jalukbari & Saraighat Bridge",
    "pincode": "781014",
    "zone": "University & Gateway Hub",
    "x": -130,
    "z": 45,
    "description": "Gateway rotary, Gauhati University & Saraighat Bridge approach"
  },
  {
    "name": "Beltola & Jayanagar",
    "pincode": "781028",
    "zone": "Historic Market & Residential Hub",
    "x": 135,
    "z": 165,
    "description": "Bi-weekly traditional Beltola market, lifestyle cafes & residential hub"
  },
  {
    "name": "Six Mile & VIP Road",
    "pincode": "781022",
    "zone": "Modern Healthcare & Retail Corridor",
    "x": 220,
    "z": 175,
    "description": "Super specialty hospitals, premier retail complexes & Silsako lake link"
  },
  {
    "name": "Bharalumukh & Shantipur",
    "pincode": "781009",
    "zone": "Riverfront Promenade & Commerce",
    "x": -60,
    "z": -26,
    "description": "Bharalu river discharge, riverfront walkways & traditional commerce"
  },
  {
    "name": "Maligaon Commercial Center",
    "pincode": "781011",
    "zone": "NFR Headquarters & Transit",
    "x": -80,
    "z": 45,
    "description": "Northeast Frontier Railway HQ, bustling markets & Kamakhya approach"
  }
];

export interface GuwahatiCityResult {
  group: THREE.Group;
  hitBoxes: THREE.Mesh[];
  plots: StorefrontMeshResult[];
  colonies: ColonyDefinition[];
  update: (delta: number) => void;
  dispose: () => void;
}

/**
 * Organic parametric S-curve of the Brahmaputra South Bank at Guwahati.
 * Traces through Saraighat gorge (x = -130, z = -29), Bharalumukh (x = -60, z = -26),
 * Pan Bazar (x = -25, z = -24), Uzan Bazar (x = 65, z = -26), and Kharghuli (x = 180, z = -32).
 */
export function getRiverSouthBankZ(x: number): number {
  const baseCurve = -26.0 + Math.sin((x + 50) * 0.005) * 5.0;
  const eastBend = Math.max(0, (x - 80) * 0.045);
  const westBend = Math.max(0, (-100 - x) * 0.035);
  return baseCurve - eastBend - westBend;
}

/**
 * Organic parametric curve of the Brahmaputra North Bank across from Guwahati.
 * Forms the northern shoreline passing through Saraighat North (x = -130, z = -149),
 * Amingaon (x = 60, z = -147), and Dirgheswari / IIT approach (x = 180, z = -153).
 */
export function getRiverNorthBankZ(x: number): number {
  const baseCurve = -148.0 + Math.cos((x - 20) * 0.005) * 6.0;
  const eastBend = Math.max(0, (x - 80) * 0.04);
  const westBend = Math.max(0, (-100 - x) * 0.03);
  return baseCurve - eastBend - westBend;
}

interface RoadDef {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  name: string;
}

export const GUWAHATI_ROADS: RoadDef[] = [
    { x1: -240.0, z1: -8.0, x2: -190.0, z2: -8.0, width: 8.5, name: "Pandu River Approach" },
    { x1: -190.0, z1: -8.0, x2: -130.0, z2: -8.0, width: 9.0, name: "Saraighat South Approach Road" },
    { x1: -130.0, z1: -8.0, x2: -80.0, z2: -18.0, width: 9.0, name: "MG Road (Pandu - Kamakhya Ghat)" },
    { x1: -80.0, z1: -18.0, x2: -60.0, z2: -26.0, width: 9.0, name: "MG Road (Kamakhya - Bharalumukh)" },
    { x1: -60.0, z1: -26.0, x2: -25.0, z2: -24.0, width: 9.0, name: "MG Road (Bharalumukh - Pan Bazar)" },
    { x1: -25.0, z1: -24.0, x2: 35.0, z2: -28.0, width: 9.0, name: "MG Road (Sukreswar Ghat Promenade)" },
    { x1: 35.0, z1: -28.0, x2: 65.0, z2: -34.0, width: 9.0, name: "MG Road (Uzan Bazar Riverfront)" },
    { x1: 65.0, z1: -34.0, x2: 120.0, z2: -38.0, width: 9.0, name: "MG Road (Uzan Bazar - Kharghuli West)" },
    { x1: 120.0, z1: -38.0, x2: 180.0, z2: -42.0, width: 9.0, name: "MG Road (Kharghuli Riverfront East)" },
    { x1: 180.0, z1: -42.0, x2: 240.0, z2: -46.0, width: 8.5, name: "Kharghuli - Ramsa Hill Road" },
    { x1: -130.0, z1: -8.0, x2: -130.0, z2: 45.0, width: 9.5, name: "NH-27 Saraighat South Highway" },
    { x1: -240.0, z1: -170.0, x2: -130.0, z2: -170.0, width: 8.5, name: "North Highway West" },
    { x1: -130.0, z1: -170.0, x2: 0.0, z2: -170.0, width: 8.5, name: "North Highway (Amingaon)" },
    { x1: 0.0, z1: -170.0, x2: 90.0, z2: -170.0, width: 8.5, name: "North Highway (IIT Guwahati Approach)" },
    { x1: 90.0, z1: -170.0, x2: 180.0, z2: -170.0, width: 8.5, name: "North Highway (Dirgheswari Approach)" },
    { x1: 0.0, z1: -170.0, x2: 0.0, z2: -210.0, width: 7.5, name: "Amingaon North Cross" },
    { x1: 90.0, z1: -170.0, x2: 90.0, z2: -215.0, width: 8.0, name: "IIT Guwahati Main Campus Avenue" },
    { x1: -130.0, z1: -170.0, x2: -130.0, z2: -210.0, width: 8.0, name: "Saraighat North Rotary Link" },
    { x1: -130.0, z1: 45.0, x2: -80.0, z2: 45.0, width: 9.0, name: "AT Road (Jalukbari - Maligaon)" },
    { x1: -80.0, z1: 45.0, x2: -60.0, z2: 45.0, width: 9.0, name: "AT Road (Maligaon - Bharalumukh)" },
    { x1: -60.0, z1: 45.0, x2: -25.0, z2: 45.0, width: 9.0, name: "AT Road (Bharalumukh - Machkhowa)" },
    { x1: -25.0, z1: 45.0, x2: 15.0, z2: 45.0, width: 9.0, name: "AT Road (Machkhowa - Paltan Bazar)" },
    { x1: -80.0, z1: 45.0, x2: -80.0, z2: -18.0, width: 7.5, name: "Kamakhya Temple Foothill Road" },
    { x1: -60.0, z1: 45.0, x2: -60.0, z2: -26.0, width: 8.0, name: "Bharalumukh River Link" },
    { x1: -25.0, z1: 45.0, x2: -25.0, z2: 10.0, width: 7.5, name: "Fancy Bazar Cross Link" },
    { x1: -25.0, z1: 10.0, x2: 15.0, z2: 10.0, width: 7.5, name: "Hem Baruah Road" },
    { x1: -25.0, z1: 10.0, x2: -25.0, z2: -24.0, width: 7.5, name: "Machkhowa River Link" },
    { x1: 15.0, z1: 45.0, x2: 35.0, z2: 25.0, width: 9.5, name: "GS Road (Paltan Bazar - Ulubari)" },
    { x1: 35.0, z1: 25.0, x2: 60.0, z2: 15.0, width: 10.0, name: "GS Road (Ulubari - Christian Basti Flagship)" },
    { x1: 60.0, z1: 15.0, x2: 95.0, z2: 50.0, width: 9.5, name: "GS Road (Christian Basti - Walford)" },
    { x1: 95.0, z1: 50.0, x2: 125.0, z2: 90.0, width: 10.0, name: "GS Road (Walford - Ganeshguri Flyover)" },
    { x1: 125.0, z1: 90.0, x2: 160.0, z2: 140.0, width: 10.0, name: "GS Road (Ganeshguri - Dispur Secretariat)" },
    { x1: 160.0, z1: 140.0, x2: 190.0, z2: 160.0, width: 9.5, name: "GS Road (Dispur - Downtown Hospital)" },
    { x1: 190.0, z1: 160.0, x2: 220.0, z2: 175.0, width: 9.5, name: "GS Road (Downtown - Six Mile Flyover)" },
    { x1: 220.0, z1: 175.0, x2: 255.0, z2: 185.0, width: 9.5, name: "GS Road (Six Mile - Khanapara Gateway)" },
    { x1: 180.0, z1: -42.0, x2: 175.0, z2: 15.0, width: 9.0, name: "Zoo Road (Chandmari - Commerce College)" },
    { x1: 175.0, z1: 15.0, x2: 165.0, z2: 45.0, width: 9.0, name: "Zoo Road (Zoo Tiniali - Assam State Zoo)" },
    { x1: 165.0, z1: 45.0, x2: 145.0, z2: 70.0, width: 9.0, name: "Zoo Road (State Zoo - Sundarpur)" },
    { x1: 145.0, z1: 70.0, x2: 125.0, z2: 90.0, width: 9.0, name: "Zoo Road (Sundarpur - Ganeshguri Flyover)" },
    { x1: -25.0, z1: -24.0, x2: 35.0, z2: -10.0, width: 8.5, name: "GNB Road (Pan Bazar - Cotton University)" },
    { x1: 35.0, z1: -10.0, x2: 65.0, z2: -10.0, width: 8.5, name: "GNB Road (Dighalipukhuri Lake Promenade)" },
    { x1: 65.0, z1: -10.0, x2: 110.0, z2: -15.0, width: 8.5, name: "GNB Road (Ambari - State Museum)" },
    { x1: 110.0, z1: -15.0, x2: 150.0, z2: -15.0, width: 8.5, name: "GNB Road (Guwahati Club - Silpukhuri)" },
    { x1: 150.0, z1: -15.0, x2: 180.0, z2: -42.0, width: 8.5, name: "Silpukhuri to Chandmari Flyover" },
    { x1: 35.0, z1: -28.0, x2: 35.0, z2: -10.0, width: 7.5, name: "Nehru Park West Link" },
    { x1: 35.0, z1: -10.0, x2: 35.0, z2: 25.0, width: 7.5, name: "Nehru Park South to Ulubari Link" },
    { x1: 65.0, z1: -34.0, x2: 65.0, z2: -10.0, width: 7.5, name: "Latasil Field to Uzan Bazar Link" },
    { x1: 65.0, z1: -10.0, x2: 60.0, z2: 15.0, width: 7.5, name: "Christian Basti - Dighalipukhuri Heritage Link" },
    { x1: 110.0, z1: -15.0, x2: 110.0, z2: 15.0, width: 7.5, name: "Ambari South Avenue" },
    { x1: 110.0, z1: 15.0, x2: 60.0, z2: 15.0, width: 7.5, name: "Christian Basti East Avenue" },
    { x1: 110.0, z1: 15.0, x2: 150.0, z2: -15.0, width: 7.5, name: "Silpukhuri Link" },
    { x1: 110.0, z1: 15.0, x2: 95.0, z2: 50.0, width: 7.5, name: "Christian Basti to Walford Link" },
    { x1: 150.0, z1: -15.0, x2: 115.0, z2: 30.0, width: 7.5, name: "Rajgarh Road North" },
    { x1: 115.0, z1: 30.0, x2: 60.0, z2: 15.0, width: 7.5, name: "Rajgarh to Christian Basti Link" },
    { x1: 115.0, z1: 30.0, x2: 95.0, z2: 50.0, width: 7.5, name: "Rajgarh South Link" },
    { x1: 175.0, z1: 15.0, x2: 115.0, z2: 30.0, width: 7.5, name: "Zoo Tiniali to Rajgarh Link" },
    { x1: -130.0, z1: 45.0, x2: -180.0, z2: 90.0, width: 9.5, name: "NH-27 Jalukbari to Deepor Beel Eco Junction" },
    { x1: -180.0, z1: 90.0, x2: -120.0, z2: 125.0, width: 10.0, name: "NH-27 Deepor Beel to Gorchuk" },
    { x1: -120.0, z1: 125.0, x2: -50.0, z2: 145.0, width: 10.0, name: "NH-27 Gorchuk to Lokhra (ISBT)" },
    { x1: -50.0, z1: 145.0, x2: 25.0, z2: 160.0, width: 10.0, name: "NH-27 Lokhra to Betkuchi" },
    { x1: 25.0, z1: 160.0, x2: 100.0, z2: 175.0, width: 10.0, name: "NH-27 Betkuchi to Basistha Chariali" },
    { x1: 100.0, z1: 175.0, x2: 175.0, z2: 185.0, width: 10.0, name: "NH-27 Basistha to Khanapara" },
    { x1: 175.0, z1: 185.0, x2: 255.0, z2: 185.0, width: 10.0, name: "NH-27 Khanapara East" },
    { x1: -180.0, z1: 90.0, x2: -195.0, z2: 125.0, width: 8.0, name: "Deepor Beel North Shore Drive" },
    { x1: -195.0, z1: 125.0, x2: -190.0, z2: 165.0, width: 8.0, name: "Deepor Beel South Shore Drive" },
    { x1: -190.0, z1: 165.0, x2: -120.0, z2: 125.0, width: 8.0, name: "Deepor Beel to Gorchuk Connector" },
    { x1: -180.0, z1: 90.0, x2: -240.0, z2: 110.0, width: 9.0, name: "Borjhar Airport Highway West" },
    { x1: 15.0, z1: 45.0, x2: 15.0, z2: 80.0, width: 7.5, name: "Station Road South / Solapara" },
    { x1: 15.0, z1: 80.0, x2: 60.0, z2: 80.0, width: 7.5, name: "Rehabari Commercial Drive" },
    { x1: 60.0, z1: 80.0, x2: 95.0, z2: 50.0, width: 7.5, name: "Arya Nagar to Walford Link" },
    { x1: 15.0, z1: 80.0, x2: -25.0, z2: 80.0, width: 7.5, name: "Arya Nagar West Drive" },
    { x1: -25.0, z1: 80.0, x2: -60.0, z2: 45.0, width: 7.5, name: "Fatasil to Bharalumukh Link" },
    { x1: -25.0, z1: 80.0, x2: -50.0, z2: 145.0, width: 8.0, name: "Fatasil South to Lokhra Bypass Link" },
    { x1: 125.0, z1: 90.0, x2: 130.0, z2: 130.0, width: 8.5, name: "Beltola Tiniali Road" },
    { x1: 130.0, z1: 130.0, x2: 135.0, z2: 165.0, width: 8.5, name: "Beltola Bazar Chariali" },
    { x1: 135.0, z1: 165.0, x2: 100.0, z2: 175.0, width: 8.5, name: "Beltola to Basistha Chariali Link" },
    { x1: 135.0, z1: 165.0, x2: 175.0, z2: 185.0, width: 8.0, name: "Beltola to Khanapara Link" },
    { x1: 160.0, z1: 140.0, x2: 130.0, z2: 130.0, width: 8.0, name: "Dispur Last Gate to Beltola Link" },
    { x1: 220.0, z1: 175.0, x2: 210.0, z2: 130.0, width: 8.5, name: "Six Mile to Chachal / Silsako Beel" },
    { x1: 210.0, z1: 130.0, x2: 215.0, z2: 80.0, width: 8.5, name: "VIP Road Borbari" },
    { x1: 215.0, z1: 80.0, x2: 225.0, z2: 25.0, width: 8.5, name: "VIP Road Hengrabari" },
    { x1: 225.0, z1: 25.0, x2: 240.0, z2: -10.0, width: 8.5, name: "VIP Road to Narengi Tiniali" },
    { x1: 240.0, z1: -10.0, x2: 240.0, z2: -46.0, width: 8.0, name: "Narengi to Ramsa River Link" },
    { x1: 240.0, z1: -10.0, x2: 205.0, z2: -20.0, width: 8.5, name: "Noonmati Refinery Road" },
    { x1: 205.0, z1: -20.0, x2: 180.0, z2: -42.0, width: 8.5, name: "Bamunimaidam to Chandmari Junction" },
    { x1: 175.0, z1: 15.0, x2: 225.0, z2: 25.0, width: 8.0, name: "Mother Teresa Road (Zoo Tiniali to Narengi)" },
    { x1: -25.0, z1: 10.0, x2: -25.0, z2: -24.0, width: 7.5, name: "Pan Bazar Church Road" },
    { x1: -25.0, z1: 10.0, x2: 35.0, z2: 10.0, width: 7.0, name: "Don Bosco School Road" },
    { x1: 35.0, z1: 10.0, x2: 35.0, z2: 25.0, width: 7.0, name: "Nehru Stadium Approach" },
    { x1: 35.0, z1: 10.0, x2: 60.0, z2: 15.0, width: 7.0, name: "Bhangagarh Link Road" },
    { x1: 65.0, z1: -10.0, x2: 65.0, z2: -34.0, width: 7.5, name: "Latasil Field Avenue" },
    { x1: 35.0, z1: -28.0, x2: 65.0, z2: -10.0, width: 7.0, name: "Dighalipukhuri West Bank" },
    { x1: 65.0, z1: -10.0, x2: 90.0, z2: -25.0, width: 7.0, name: "Lamb Road Cultural Promenade" },
    { x1: 90.0, z1: -25.0, x2: 110.0, z2: -15.0, width: 7.0, name: "State Museum Link" },
    { x1: 90.0, z1: -25.0, x2: 120.0, z2: -38.0, width: 7.0, name: "Kharghuli Foothill Cross" },
    { x1: 60.0, z1: 15.0, x2: 75.0, z2: 35.0, width: 7.5, name: "Tarun Nagar Road" },
    { x1: 75.0, z1: 35.0, x2: 95.0, z2: 50.0, width: 7.5, name: "Walford East Link" },
    { x1: 75.0, z1: 35.0, x2: 115.0, z2: 30.0, width: 7.0, name: "Rajgarh South Cross" },
    { x1: 60.0, z1: 15.0, x2: 45.0, z2: 45.0, width: 7.0, name: "Lachit Nagar Avenue" },
    { x1: 45.0, z1: 45.0, x2: 35.0, z2: 25.0, width: 7.0, name: "Lachit Nagar to Ulubari" },
    { x1: 45.0, z1: 45.0, x2: 15.0, z2: 45.0, width: 7.0, name: "Lachit Nagar to Paltan Bazar" },
    { x1: -80.0, z1: 45.0, x2: -105.0, z2: 20.0, width: 7.5, name: "Maligaon Stadium Road" },
    { x1: -105.0, z1: 20.0, x2: -130.0, z2: 45.0, width: 7.5, name: "Railway HQ Gateway" },
    { x1: -105.0, z1: 20.0, x2: -80.0, z2: -18.0, width: 7.0, name: "Pandu Port Road" },
    { x1: -130.0, z1: 45.0, x2: -155.0, z2: 15.0, width: 8.0, name: "Gauhati University Main Avenue" },
    { x1: -155.0, z1: 15.0, x2: -180.0, z2: 90.0, width: 8.0, name: "University Campus South Link" },
    { x1: -155.0, z1: 15.0, x2: -130.0, z2: -8.0, width: 8.0, name: "Jalukbari North Promenade" },
    { x1: 160.0, z1: 140.0, x2: 175.0, z2: 115.0, width: 8.0, name: "Assam Assembly Avenue" },
    { x1: 175.0, z1: 115.0, x2: 145.0, z2: 70.0, width: 7.5, name: "Assembly to Zoo Road Link" },
    { x1: 175.0, z1: 115.0, x2: 190.0, z2: 160.0, width: 7.5, name: "MLA Hostel Drive" },
    { x1: 160.0, z1: 140.0, x2: 185.0, z2: 150.0, width: 7.5, name: "Tea Auction Centre Road" },
    { x1: 185.0, z1: 150.0, x2: 220.0, z2: 175.0, width: 7.5, name: "Super Market Flyover Approach" },
    { x1: 130.0, z1: 130.0, x2: 155.0, z2: 145.0, width: 7.5, name: "Survey Building Road" },
    { x1: 155.0, z1: 145.0, x2: 135.0, z2: 165.0, width: 7.5, name: "Survey to Beltola Bazar" },
    { x1: 135.0, z1: 165.0, x2: 155.0, z2: 175.0, width: 7.5, name: "Jayanagar Main Road" },
    { x1: 155.0, z1: 175.0, x2: 175.0, z2: 185.0, width: 7.5, name: "Jayanagar to Khanapara Link" },
    { x1: 155.0, z1: 175.0, x2: 100.0, z2: 175.0, width: 7.5, name: "Jayanagar to Basistha Link" },
];

/**
 * Distance from point (px, pz) to 2D line segment (x1, z1)-(x2, z2).
 */
function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

/**
 * Builds the complete, geographically accurate 3D city of Guwahati:
 * - Expansive natural Assam valley terrain (3600 x 3200) with seamless downward horizon skirt
 * - Majestic curving Brahmaputra River following authentic geography with sandbars (chars) and Umananda Island
 * - Deepor Beel, Dighalipukhuri, Silpukhuri, Borsola Beel, Silsako Beel & continuous Bharalu urban stream
 * - Iconic 3D Saraighat Double-Deck Truss Bridge bridging South and North Guwahati
 * - 117 interconnected GIS-accurate road segments covering all arterial & neighborhood avenues
 * - Low-poly rolling hills (Kamakhya Nilachal, Sarania Gandhi Mandap, Fatasil, North Guwahati, Khasi Foothills)
 * - 400 instanced lush low-poly trees distributed across hills, riverfronts, and lakes
 * - 12 official commercial colonies & verified flagship storefronts dynamically facing the road
 * - Calibrated peaceful traffic (Auto, ASTC bus, City bus, Sedan, Delivery Van) cruising road waypoints
 */
export function buildGuwahatiCity(
  storefronts: BusinessStorefront[]
): GuwahatiCityResult {
  const group = new THREE.Group();
  group.name = "guwahati_city_system";

  const hitBoxes: THREE.Mesh[] = [];
  const plots: StorefrontMeshResult[] = [];
  const disposables: { dispose: () => void }[] = [];

  // Filter storefronts active in Guwahati
  const guwahatiStorefronts = storefronts.filter(
    (s) => !s?.city_name || s.city_name.toLowerCase() === "guwahati"
  );

  const roads = GUWAHATI_ROADS;

  // 1. EXPANSIVE ASSAM VALLEY NATURAL TERRAIN (3600 x 3200)
  const terrainWidth = 3600;
  const terrainHeight = 3200;
  const segX = 140;
  const segZ = 120;

  const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainHeight, segX, segZ);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const radialDist = Math.hypot(x, z);

    const zS = getRiverSouthBankZ(x);
    const zN = getRiverNorthBankZ(x);

    let elev = 0;

    // A. Brahmaputra River Basin depression along the north
    if (z >= zN - 6 && z <= zS + 6 && Math.abs(x) < 1750) {
      elev = -0.95; // River water level sits cleanly at Y = 0.04
    } else {
      // Calculate clearance to the nearest road corridor
      let minRoadDist = Infinity;
      let matchingRoadWidth = 8.5;
      for (let r = 0; r < roads.length; r++) {
        const rd = roads[r];
        // Bounding box pre-check
        const minX = Math.min(rd.x1, rd.x2) - 15;
        const maxX = Math.max(rd.x1, rd.x2) + 15;
        const minZ = Math.min(rd.z1, rd.z2) - 15;
        const maxZ = Math.max(rd.z1, rd.z2) + 15;
        if (x < minX || x > maxX || z < minZ || z > maxZ) continue;

        const d = distToSegment(x, z, rd.x1, rd.z1, rd.x2, rd.z2);
        if (d < minRoadDist) {
          minRoadDist = d;
          matchingRoadWidth = rd.width;
        }
      }

      // Strictly flat along all road corridors and storefront plots
      const safeFlatMargin = matchingRoadWidth / 2 + 5.5;
      let roadClearanceFactor = 1.0;
      if (minRoadDist <= safeFlatMargin) {
        roadClearanceFactor = 0.0;
      } else if (minRoadDist < safeFlatMargin + 18.0) {
        const t = (minRoadDist - safeFlatMargin) / 18.0;
        roadClearanceFactor = t * t;
      }

      // B. Surrounding Natural Hills
      // 1. Nilachal / Kamakhya Hills (x = -85, z = 12)
      const distKamakhya = Math.hypot(x - -85, z - 12);
      if (distKamakhya < 62) {
        const kFactor = (1 + Math.cos((distKamakhya / 62) * Math.PI)) * 0.5;
        elev = Math.max(elev, kFactor * 52 * roadClearanceFactor);
      }

      // 2. Sarania Hill (Gandhi Mandap) in Central Guwahati (x = 85, z = 20)
      const distSarania = Math.hypot(x - 85, z - 20);
      if (distSarania < 52) {
        const sFactor = (1 + Math.cos((distSarania / 52) * Math.PI)) * 0.5;
        elev = Math.max(elev, sFactor * 42 * roadClearanceFactor);
      }

      // 3. Fatasil / Naranarayan Hills in the South-Central (x = -45, z = 115)
      const distFatasil = Math.hypot(x - -45, z - 115);
      if (distFatasil < 65) {
        const fFactor = (1 + Math.cos((distFatasil / 65) * Math.PI)) * 0.5;
        elev = Math.max(elev, fFactor * 48 * roadClearanceFactor);
      }

      // 4. Kharghuli & Narengi River Hills (x = 220, z = -35)
      const distKharghuli = Math.hypot(x - 220, z - -35);
      if (distKharghuli < 58) {
        const khFactor = (1 + Math.cos((distKharghuli / 58) * Math.PI)) * 0.5;
        elev = Math.max(elev, khFactor * 46 * roadClearanceFactor);
      }

      // 5. Meghalaya / Khasi Foothills in the far South (z > 190)
      if (z > 190) {
        const southGrad = Math.min((z - 190) / 420, 1.0);
        elev = Math.max(elev, southGrad * southGrad * 72 + Math.sin(x * 0.012) * 8);
      }

      // 6. North Guwahati Rolling Dome Hills across the Brahmaputra (z < zN - 15)
      if (z < zN - 15) {
        const northGrad = Math.min((zN - 15 - z) / 420, 1.0);
        elev = northGrad * northGrad * 36;

        const domeHills = [
          { cx: -240, cz: -230, r: 120, h: 58 },
          { cx: -110, cz: -250, r: 130, h: 68 },
          { cx: 50, cz: -235, r: 125, h: 64 },
          { cx: 200, cz: -220, r: 115, h: 56 },
          { cx: 340, cz: -240, r: 110, h: 52 },
        ];
        for (const dh of domeHills) {
          const d = Math.hypot(x - dh.cx, z - dh.cz);
          if (d < dh.r) {
            const factor = (1 + Math.cos((d / dh.r) * Math.PI)) * 0.5;
            elev = Math.max(elev, factor * dh.h);
          }
        }
      }
    }

    // C. Outer Horizon Skirt: Curves down into horizon fog to eliminate square plane corners
    if (radialDist > 1250) {
      const skirtFactor = Math.min((radialDist - 1250) / 400, 1.0);
      elev = elev * (1 - skirtFactor) - skirtFactor * 18.0;
    }

    posAttr.setY(i, elev);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x247a3e, // Lush Assam Valley emerald green
    roughness: 0.88,
    metalness: 0.04,
    flatShading: false,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 2. THE MAJESTIC CURVING BRAHMAPUTRA RIVER
  const riverSteps = 120;
  const riverXMin = -1800;
  const riverXMax = 1800;
  const riverGeo = new THREE.BufferGeometry();
  const riverPositions: number[] = [];
  const riverUVs: number[] = [];
  const riverIndices: number[] = [];

  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zS = getRiverSouthBankZ(rx);
    const zN = getRiverNorthBankZ(rx);

    riverPositions.push(rx, 0.04, zS);
    riverUVs.push(u, 0);

    riverPositions.push(rx, 0.04, zN);
    riverUVs.push(u, 1);
  }

  for (let s = 0; s < riverSteps; s++) {
    const p0 = s * 2;
    const p1 = s * 2 + 1;
    const p2 = (s + 1) * 2;
    const p3 = (s + 1) * 2 + 1;

    riverIndices.push(p0, p2, p1);
    riverIndices.push(p1, p2, p3);
  }

  riverGeo.setAttribute("position", new THREE.Float32BufferAttribute(riverPositions, 3));
  riverGeo.setAttribute("uv", new THREE.Float32BufferAttribute(riverUVs, 2));
  riverGeo.setIndex(riverIndices);
  riverGeo.computeVertexNormals();

  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Reflective deep sky blue river water
    roughness: 0.16,
    metalness: 0.38,
    transparent: true,
    opacity: 0.94,
  });
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.receiveShadow = true;
  group.add(riverMesh);
  disposables.push(riverGeo, riverMat);

  // Sandy Riverbanks
  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xf1dfaa, // Golden silt river sand
    roughness: 0.92,
  });
  disposables.push(beachMat);

  // South Beach Ribbon (Width: 12m)
  const southBeachGeo = new THREE.BufferGeometry();
  const southBeachPos: number[] = [];
  const southBeachUVs: number[] = [];
  const southBeachIdx: number[] = [];

  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zS = getRiverSouthBankZ(rx);

    southBeachPos.push(rx, 0.048, zS);
    southBeachUVs.push(u, 0);

    southBeachPos.push(rx, 0.05, zS + 12.0);
    southBeachUVs.push(u, 1);
  }

  for (let s = 0; s < riverSteps; s++) {
    const p0 = s * 2;
    const p1 = s * 2 + 1;
    const p2 = (s + 1) * 2;
    const p3 = (s + 1) * 2 + 1;

    southBeachIdx.push(p0, p2, p1);
    southBeachIdx.push(p1, p2, p3);
  }

  southBeachGeo.setAttribute("position", new THREE.Float32BufferAttribute(southBeachPos, 3));
  southBeachGeo.setAttribute("uv", new THREE.Float32BufferAttribute(southBeachUVs, 2));
  southBeachGeo.setIndex(southBeachIdx);
  southBeachGeo.computeVertexNormals();

  const southBeach = new THREE.Mesh(southBeachGeo, beachMat);
  southBeach.receiveShadow = true;
  group.add(southBeach);
  disposables.push(southBeachGeo);

  // North Beach Ribbon (Width: 14m)
  const northBeachGeo = new THREE.BufferGeometry();
  const northBeachPos: number[] = [];
  const northBeachUVs: number[] = [];
  const northBeachIdx: number[] = [];

  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zN = getRiverNorthBankZ(rx);

    northBeachPos.push(rx, 0.05, zN - 14.0);
    northBeachUVs.push(u, 0);

    northBeachPos.push(rx, 0.048, zN);
    northBeachUVs.push(u, 1);
  }

  for (let s = 0; s < riverSteps; s++) {
    const p0 = s * 2;
    const p1 = s * 2 + 1;
    const p2 = (s + 1) * 2;
    const p3 = (s + 1) * 2 + 1;

    northBeachIdx.push(p0, p2, p1);
    northBeachIdx.push(p1, p2, p3);
  }

  northBeachGeo.setAttribute("position", new THREE.Float32BufferAttribute(northBeachPos, 3));
  northBeachGeo.setAttribute("uv", new THREE.Float32BufferAttribute(northBeachUVs, 2));
  northBeachGeo.setIndex(northBeachIdx);
  northBeachGeo.computeVertexNormals();

  const northBeach = new THREE.Mesh(northBeachGeo, beachMat);
  northBeach.receiveShadow = true;
  group.add(northBeach);
  disposables.push(northBeachGeo);

  // 3. PEACOCK ISLAND (UMANANDA) & RIVER SANDBARS (CHARS)
  const umanandaGroup = new THREE.Group();
  umanandaGroup.name = "umananda_peacock_island";

  const rockGeo = new THREE.CylinderGeometry(14, 18, 2.4, 14);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Weathered grey Brahmaputra granite
    roughness: 0.94,
    flatShading: true,
  });
  const rockMesh = new THREE.Mesh(rockGeo, rockMat);
  rockMesh.position.set(55, 0.9, -96);
  rockMesh.receiveShadow = true;
  umanandaGroup.add(rockMesh);

  const islandBeachGeo = new THREE.RingGeometry(14, 21, 16);
  islandBeachGeo.rotateX(-Math.PI / 2);
  const islandBeach = new THREE.Mesh(islandBeachGeo, beachMat);
  islandBeach.position.set(55, 0.06, -96);
  umanandaGroup.add(islandBeach);

  const templeSanctumGeo = new THREE.BoxGeometry(4.2, 3.6, 4.2);
  const templeSanctumMat = new THREE.MeshStandardMaterial({
    color: 0xb45309, // Terracotta temple stone
    roughness: 0.75,
  });
  const templeSanctum = new THREE.Mesh(templeSanctumGeo, templeSanctumMat);
  templeSanctum.position.set(55, 3.2, -96);
  templeSanctum.castShadow = true;
  umanandaGroup.add(templeSanctum);

  const spireGeo = new THREE.ConeGeometry(2.0, 5.5, 8);
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Radiant golden amber
    metalness: 0.65,
    roughness: 0.35,
  });
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(55, 7.5, -96);
  spire.castShadow = true;
  umanandaGroup.add(spire);

  const islandTreeGeo = new THREE.DodecahedronGeometry(1.6, 0);
  const islandTreeMat = new THREE.MeshStandardMaterial({
    color: 0x14532d, // Deep temple grove emerald
    roughness: 0.9,
    flatShading: true,
  });
  for (const [tx, tz] of [
    [-6, -4],
    [-7, 5],
    [5, -6],
    [6, 5],
    [-4, 8],
    [7, 1],
  ]) {
    const tMesh = new THREE.Mesh(islandTreeGeo, islandTreeMat);
    tMesh.position.set(55 + tx, 2.8, -96 + tz);
    tMesh.scale.set(1.1, 1.3, 1.1);
    tMesh.castShadow = true;
    umanandaGroup.add(tMesh);
  }

  group.add(umanandaGroup);
  disposables.push(rockGeo, rockMat, islandBeachGeo, templeSanctumGeo, templeSanctumMat, spireGeo, spireMat, islandTreeGeo, islandTreeMat);

  // Natural River Sandbars (Chars / Alluvial sandbanks)
  const sandbarMat = new THREE.MeshStandardMaterial({ color: 0xeadbb6, roughness: 0.9 });
  disposables.push(sandbarMat);

  const char1Geo = new THREE.CylinderGeometry(26, 34, 0.4, 16);
  char1Geo.scale(2.2, 1, 0.65);
  const char1 = new THREE.Mesh(char1Geo, sandbarMat);
  char1.position.set(-40, 0.1, -88);
  char1.rotation.y = 0.06;
  group.add(char1);

  const char2Geo = new THREE.CylinderGeometry(20, 26, 0.4, 14);
  char2Geo.scale(2.0, 1, 0.55);
  const char2 = new THREE.Mesh(char2Geo, sandbarMat);
  char2.position.set(-260, 0.1, -94);
  char2.rotation.y = -0.04;
  group.add(char2);

  const char3Geo = new THREE.CylinderGeometry(22, 30, 0.4, 14);
  char3Geo.scale(2.4, 1, 0.6);
  const char3 = new THREE.Mesh(char3Geo, sandbarMat);
  char3.position.set(120, 0.1, -92);
  char3.rotation.y = 0.05;
  group.add(char3);
  disposables.push(char1Geo, char2Geo, char3Geo);

  // 4. WATER BODIES: DEEPOR BEEL, DIGHALIPUKHURI, SILPUKHURI, BORSOLA BEEL & SILSAKO BEEL
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Deep water reflection
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.92,
  });
  const lakeBorderMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1, // Paved stone jogging path
    roughness: 0.82,
  });
  const marshShoreMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Lush marshy wetland reeds & embankment
    roughness: 0.92,
  });
  disposables.push(waterMat, lakeBorderMat, marshShoreMat);

  // A. Deepor Beel Wetland Lake (Southwest Guwahati)
  const beelGeo = new THREE.CylinderGeometry(55, 65, 0.4, 24);
  beelGeo.scale(1.2, 1.0, 0.65);
  const beelMesh = new THREE.Mesh(beelGeo, waterMat);
  beelMesh.position.set(-190, 0.05, 125);
  beelMesh.rotation.y = 0.15;
  group.add(beelMesh);

  const beelShoreGeo = new THREE.CylinderGeometry(62, 74, 0.3, 24);
  beelShoreGeo.scale(1.2, 1.0, 0.65);
  const beelShore = new THREE.Mesh(beelShoreGeo, marshShoreMat);
  beelShore.position.set(-190, 0.04, 125);
  beelShore.rotation.y = 0.15;
  group.add(beelShore);
  disposables.push(beelGeo, beelShoreGeo);

  // B. Dighalipukhuri Heritage Lake (Uzan Bazar / Heritage District, 54m x 22m)
  const lakeW = 54;
  const lakeL = 22;
  const lakeGeo = new THREE.PlaneGeometry(lakeW, lakeL);
  lakeGeo.rotateX(-Math.PI / 2);
  const lakeMesh = new THREE.Mesh(lakeGeo, waterMat);
  lakeMesh.position.set(65, 0.05, -10);
  group.add(lakeMesh);

  const lakeBorderGeo = new THREE.PlaneGeometry(lakeW + 6, lakeL + 6);
  lakeBorderGeo.rotateX(-Math.PI / 2);
  const lakeBorder = new THREE.Mesh(lakeBorderGeo, lakeBorderMat);
  lakeBorder.position.set(65, 0.045, -10);
  group.add(lakeBorder);
  disposables.push(lakeGeo, lakeBorderGeo);

  // C. Silpukhuri Heritage Pond (Chandmari, 36m x 22m)
  const silW = 36;
  const silL = 22;
  const silGeo = new THREE.PlaneGeometry(silW, silL);
  silGeo.rotateX(-Math.PI / 2);
  const silMesh = new THREE.Mesh(silGeo, waterMat);
  silMesh.position.set(150, 0.05, -15);
  group.add(silMesh);

  const silBorderGeo = new THREE.PlaneGeometry(silW + 5, silL + 5);
  silBorderGeo.rotateX(-Math.PI / 2);
  const silBorder = new THREE.Mesh(silBorderGeo, lakeBorderMat);
  silBorder.position.set(150, 0.045, -15);
  group.add(silBorder);
  disposables.push(silGeo, silBorderGeo);

  // D. Borsola Beel (South Paltan / Solapara, 48m x 24m)
  const borGeo = new THREE.CylinderGeometry(24, 28, 0.35, 18);
  borGeo.scale(1.4, 1.0, 0.65);
  const borMesh = new THREE.Mesh(borGeo, waterMat);
  borMesh.position.set(15, 0.05, 75);
  group.add(borMesh);
  disposables.push(borGeo);

  // E. Silsako Beel (Six Mile / Chachal, 60m x 26m)
  const silsakoGeo = new THREE.CylinderGeometry(30, 36, 0.35, 20);
  silsakoGeo.scale(1.5, 1.0, 0.6);
  const silsakoMesh = new THREE.Mesh(silsakoGeo, waterMat);
  silsakoMesh.position.set(185, 0.05, 110);
  silsakoMesh.rotation.y = -0.15;
  group.add(silsakoMesh);
  disposables.push(silsakoGeo);

  // 5. CONTINUOUS BHARALU URBAN STREAM (Winding from southern foothills into Brahmaputra)
  const canalPoints: [number, number][] = [
    [70, 165],   // Southern Foothills origin
    [95, 130],   // Dispur / Bhangagarh upstream
    [45, 80],    // Arya Nagar
    [0, 55],     // South Paltan
    [-30, 48],   // AT Road approach
    [-60, 45],   // Bharalumukh South
    [-58, 12],   // Mid canal
    [-60, -26],  // Discharge into Brahmaputra River at Bharalumukh
  ];
  for (let c = 0; c < canalPoints.length - 1; c++) {
    const p1 = canalPoints[c];
    const p2 = canalPoints[c + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const cGeo = new THREE.PlaneGeometry(6.5, len + 0.5);
    cGeo.rotateX(-Math.PI / 2);
    cGeo.rotateY(angle);
    const cMesh = new THREE.Mesh(cGeo, waterMat);
    cMesh.position.set((p1[0] + p2[0]) / 2, 0.04, (p1[1] + p2[1]) / 2);
    group.add(cMesh);
    disposables.push(cGeo);
  }

  // 6. SARAIGHAT BRIDGE (Iconic Double-Deck Steel Truss Bridge across Brahmaputra)
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = "saraighat_bridge";

  const bridgeX = -130;
  const bridgeDeckW = 9.4;
  const bridgeDeckL = 120; // River span from Z = -29 to Z = -149
  const bridgeDeckY = 4.8;

  const bridgeDeckMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Asphalt & concrete slate
    roughness: 0.72,
    metalness: 0.2,
  });
  const trussMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c, // Classic Indian red-primer steel truss
    metalness: 0.45,
    roughness: 0.55,
  });
  const pierMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Weathered concrete slate
    roughness: 0.88,
  });

  // Main Bridge Road Deck
  const bridgeDeckGeo = new THREE.BoxGeometry(bridgeDeckW, 1.2, bridgeDeckL);
  const bridgeDeck = new THREE.Mesh(bridgeDeckGeo, bridgeDeckMat);
  bridgeDeck.position.set(bridgeX, bridgeDeckY - 0.6, -89);
  bridgeDeck.receiveShadow = true;
  bridgeDeck.castShadow = true;
  bridgeGroup.add(bridgeDeck);

  // 6 Heavy Concrete Caisson Piers deep in Riverbed
  for (const pz of [-44, -64, -84, -104, -124, -144]) {
    const pierGeo = new THREE.CylinderGeometry(2.8, 3.6, 12.0, 16);
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.set(bridgeX, 1.0, pz);
    pier.receiveShadow = true;
    bridgeGroup.add(pier);
  }

  // South & North Concrete Abutment Portal Towers
  for (const portalZ of [-29, -149]) {
    for (const side of [-1, 1]) {
      const postGeo = new THREE.BoxGeometry(1.6, 8.5, 3.2);
      const post = new THREE.Mesh(postGeo, pierMat);
      post.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.6), 4.25, portalZ);
      post.castShadow = true;
      bridgeGroup.add(post);
    }
    const lintelGeo = new THREE.BoxGeometry(bridgeDeckW + 3.0, 1.6, 3.2);
    const lintel = new THREE.Mesh(lintelGeo, pierMat);
    lintel.position.set(bridgeX, 8.8, portalZ);
    bridgeGroup.add(lintel);
  }

  // Steel Truss Superstructure running strictly between South & North Abutments
  for (const side of [-1, 1]) {
    const trussBarGeo = new THREE.BoxGeometry(0.5, 4.4, bridgeDeckL);
    const truss = new THREE.Mesh(trussBarGeo, trussMat);
    truss.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.25), bridgeDeckY + 2.2, -89);
    truss.castShadow = true;
    bridgeGroup.add(truss);

    for (let bz = -141; bz <= -37; bz += 12) {
      const topBeamGeo = new THREE.BoxGeometry(bridgeDeckW + 0.6, 0.45, 0.45);
      const topBeam = new THREE.Mesh(topBeamGeo, trussMat);
      topBeam.position.set(bridgeX, bridgeDeckY + 4.4, bz);
      bridgeGroup.add(topBeam);
    }
  }

  // South Approach Ramp (Connecting Bridge Deck Z = -29, Y = 4.8 down to Ground Road Z = -8, Y = 0.32)
  const rampSouthLen = 21.0;
  const rampAngle = Math.atan2(bridgeDeckY - 0.32, rampSouthLen);
  const rampSouthGeo = new THREE.BoxGeometry(bridgeDeckW, 0.8, rampSouthLen + 0.5);
  rampSouthGeo.rotateX(-rampAngle);
  const rampSouth = new THREE.Mesh(rampSouthGeo, bridgeDeckMat);
  rampSouth.position.set(bridgeX, (bridgeDeckY + 0.32) / 2 - 0.1, -18.5);
  rampSouth.receiveShadow = true;
  bridgeGroup.add(rampSouth);

  // South Ramp Retaining Side Walls
  for (const side of [-1, 1]) {
    const wallGeo = new THREE.BoxGeometry(0.8, 1.8, rampSouthLen);
    wallGeo.rotateX(-rampAngle);
    const wall = new THREE.Mesh(wallGeo, pierMat);
    wall.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.4), (bridgeDeckY + 0.32) / 2 + 0.4, -18.5);
    bridgeGroup.add(wall);
  }

  // North Approach Ramp (Connecting Bridge Deck Z = -149, Y = 4.8 down to North Highway Z = -170, Y = 0.32)
  const rampNorthGeo = new THREE.BoxGeometry(bridgeDeckW, 0.8, rampSouthLen + 0.5);
  rampNorthGeo.rotateX(rampAngle);
  const rampNorth = new THREE.Mesh(rampNorthGeo, bridgeDeckMat);
  rampNorth.position.set(bridgeX, (bridgeDeckY + 0.32) / 2 - 0.1, -159.5);
  rampNorth.receiveShadow = true;
  bridgeGroup.add(rampNorth);

  // North Ramp Retaining Side Walls
  for (const side of [-1, 1]) {
    const wallGeo = new THREE.BoxGeometry(0.8, 1.8, rampSouthLen);
    wallGeo.rotateX(rampAngle);
    const wall = new THREE.Mesh(wallGeo, pierMat);
    wall.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.4), (bridgeDeckY + 0.32) / 2 + 0.4, -159.5);
    bridgeGroup.add(wall);
  }

  group.add(bridgeGroup);
  disposables.push(bridgeDeckGeo, bridgeDeckMat, pierMat, trussMat);

  // 7. FULLY CONNECTED SOLID 3D ROAD NETWORK
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark Asphalt slate
    roughness: 0.82,
    metalness: 0.08,
  });
  disposables.push(roadMat);

  // Automatically compute all unique junction nodes and maximum road widths
  const junctionMap = new Map<string, { x: number; z: number; maxRadius: number }>();
  for (const r of roads) {
    for (const pt of [{ x: r.x1, z: r.z1 }, { x: r.x2, z: r.z2 }]) {
      const key = `${pt.x.toFixed(1)},${pt.z.toFixed(1)}`;
      const existing = junctionMap.get(key);
      const rad = r.width * 0.62;
      if (!existing) {
        junctionMap.set(key, { x: pt.x, z: pt.z, maxRadius: rad });
      } else {
        existing.maxRadius = Math.max(existing.maxRadius, rad);
      }
    }
  }

  // Place seamless rounded asphalt junction discs at Y = 0.16
  for (const j of junctionMap.values()) {
    const jGeo = new THREE.CylinderGeometry(j.maxRadius, j.maxRadius, 0.32, 24);
    const jMesh = new THREE.Mesh(jGeo, roadMat);
    jMesh.position.set(j.x, 0.16, j.z);
    jMesh.receiveShadow = true;
    group.add(jMesh);
    disposables.push(jGeo);
  }

  // Landmark Roundabouts
  const rotaryIslandMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
  const rotaryMonMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
  disposables.push(rotaryIslandMat, rotaryMonMat);

  // A. Jalukbari Rotary Roundabout (-130, 45, radius: 18)
  const jalukbariIslandGeo = new THREE.CylinderGeometry(9, 9, 0.5, 32);
  const jalukbariIsland = new THREE.Mesh(jalukbariIslandGeo, rotaryIslandMat);
  jalukbariIsland.position.set(-130, 0.25, 45);
  jalukbariIsland.receiveShadow = true;
  group.add(jalukbariIsland);

  const rotaryMonGeo = new THREE.CylinderGeometry(0.8, 1.4, 4.2, 8);
  const rotaryMon = new THREE.Mesh(rotaryMonGeo, rotaryMonMat);
  rotaryMon.position.set(-130, 2.6, 45);
  group.add(rotaryMon);
  disposables.push(jalukbariIslandGeo, rotaryMonGeo);

  // B. Dispur Secretariat Roundabout (160, 140, radius: 16)
  const dispurIslandGeo = new THREE.CylinderGeometry(7.5, 7.5, 0.5, 32);
  const dispurIsland = new THREE.Mesh(dispurIslandGeo, rotaryIslandMat);
  dispurIsland.position.set(160, 0.25, 140);
  dispurIsland.receiveShadow = true;
  group.add(dispurIsland);
  disposables.push(dispurIslandGeo);

  // C. Khanapara Gateway Rotary (255, 185, radius: 14)
  const khanaparaIslandGeo = new THREE.CylinderGeometry(6.5, 6.5, 0.5, 28);
  const khanaparaIsland = new THREE.Mesh(khanaparaIslandGeo, rotaryIslandMat);
  khanaparaIsland.position.set(255, 0.25, 185);
  khanaparaIsland.receiveShadow = true;
  group.add(khanaparaIsland);
  disposables.push(khanaparaIslandGeo);

  // Build each solid 3D road segment with Indian black-and-white striped curbs & dashed centerline
  for (const r of roads) {
    const dx = r.x2 - r.x1;
    const dz = r.z2 - r.z1;
    const len = Math.hypot(dx, dz);
    if (len < 1.0) continue;
    const angle = Math.atan2(dx, dz);
    const midX = (r.x1 + r.x2) / 2;
    const midZ = (r.z1 + r.z2) / 2;

    const roadGeo = new THREE.BoxGeometry(r.width, 0.32, len);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(midX, 0.16, midZ);
    roadMesh.rotation.y = angle;
    roadMesh.receiveShadow = true;
    group.add(roadMesh);
    disposables.push(roadGeo);

    // Calculate safe junction insets to guarantee clean, unblocked intersections
    const startJunction = junctionMap.get(`${r.x1.toFixed(1)},${r.z1.toFixed(1)}`);
    const endJunction = junctionMap.get(`${r.x2.toFixed(1)},${r.z2.toFixed(1)}`);
    const startInset = Math.max(
      r.width * 0.75,
      startJunction ? startJunction.maxRadius * 1.15 : 0
    );
    const endInset = Math.max(
      r.width * 0.75,
      endJunction ? endJunction.maxRadius * 1.15 : 0
    );

    const curbLen = len - startInset - endInset;
    // Only place side curbs on major arterial avenues and longer road spans
    const isMajorBoulevard = r.width >= 8.5 || r.name.includes("GS Road") || r.name.includes("MG Road") || r.name.includes("Zoo Road") || r.name.includes("Highway");
    if (curbLen > 4.0 && isMajorBoulevard) {
      const startParam = startInset / len;
      const endParam = 1.0 - endInset / len;
      const midParam = (startParam + endParam) / 2;
      const curbCenterX = r.x1 + dx * midParam;
      const curbCenterZ = r.z1 + dz * midParam;

      const curbW = 0.55;
      const curbH = 0.18;
      const curbTex = createStripedCurbTexture();
      curbTex.repeat.set(1, Math.max(2, Math.round(curbLen / 2.5)));
      const stripedCurbMat = new THREE.MeshStandardMaterial({
        map: curbTex,
        roughness: 0.8,
        metalness: 0.08,
      });
      disposables.push(stripedCurbMat, curbTex);

      // Left & Right Sleek Striped Curbs
      for (const side of [-1, 1]) {
        const curbGeo = new THREE.BoxGeometry(curbW, curbH, curbLen);
        const curbMesh = new THREE.Mesh(curbGeo, stripedCurbMat);
        const perpDist = (r.width / 2 + curbW / 2) * side;
        const perpX = Math.cos(angle) * perpDist;
        const perpZ = -Math.sin(angle) * perpDist;
        curbMesh.position.set(curbCenterX + perpX, 0.22, curbCenterZ + perpZ);
        curbMesh.rotation.y = angle;
        curbMesh.receiveShadow = true;
        group.add(curbMesh);
        disposables.push(curbGeo);
      }
    }

    // Yellow / White Center Dashed Line along the road
    const lineInset = Math.min(len * 0.2, 5.0);
    if (len > lineInset * 2 + 2.0) {
      const startParam = lineInset / len;
      const endParam = 1.0 - lineInset / len;
      const lineStart = new THREE.Vector3(
        r.x1 + dx * startParam,
        0.335,
        r.z1 + dz * startParam
      );
      const lineEnd = new THREE.Vector3(
        r.x1 + dx * endParam,
        0.335,
        r.z1 + dz * endParam
      );
      const dashLine = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([lineStart, lineEnd]),
        new THREE.LineDashedMaterial({
          color: 0xfacc15,
          dashSize: 3.2,
          gapSize: 2.2,
          linewidth: 2,
        })
      );
      dashLine.computeLineDistances();
      group.add(dashLine);
    }
  }

  // 8. DYNAMIC GIS-ANCHORED COMMERCIAL PLOTS & VERIFIED BUSINESS BLOCKS
  const plotPlacements = computeDynamicStorefrontPlacements(
    guwahatiStorefronts,
    roads,
    GUWAHATI_COLONIES,
    DEFAULT_CITY_ANCHORS.guwahati
  );

  plotPlacements.forEach((p, idx) => {
    const isConstruction = Boolean(p.isConstruction);
    const isEmptyPlot = !p.business && !isConstruction;

    const plotResult = buildCartoonStorefrontPlot(
      p.business,
      idx,
      p.isLeft,
      p.x,
      p.z,
      isConstruction,
      isEmptyPlot,
      p.rotationY
    );

    plotResult.mesh.position.y = 0.32;
    plotResult.hitBox.position.y = 0.32;

    group.add(plotResult.mesh);
    group.add(plotResult.hitBox);

    hitBoxes.push(plotResult.hitBox);
    plots.push(plotResult);

    // Floating Colony PIN Code Badge & Verified Business Banner
    const canvas = document.createElement("canvas");
    canvas.width = 380;
    canvas.height = 115;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 380, 115);

    ctx.beginPath();
    ctx.roundRect(8, 8, 364, 99, 22);
    ctx.fillStyle = p.business ? "rgba(10, 15, 29, 0.94)" : "rgba(15, 23, 42, 0.88)";
    ctx.fill();
    ctx.lineWidth = p.business ? 3.0 : 1.5;
    ctx.strokeStyle = p.business ? "#f59e0b" : "rgba(148, 163, 184, 0.4)";
    ctx.stroke();

    const title = p.business ? p.business.name : p.colonyName;
    ctx.font = "bold 23px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = p.business ? "#ffffff" : "#f1f5f9";
    ctx.textAlign = "left";
    ctx.fillText(title, 24, 46);

    const sub = p.business
      ? `🌿 PIN ${p.pincode} · ${p.business.starting_price || "Verified Flagship"}`
      : `📍 PIN ${p.pincode} · Claim Plot ₹0`;
    ctx.font = "600 16px 'JetBrains Mono', monospace";
    ctx.fillStyle = p.business ? "#fbbf24" : "#94a3b8";
    ctx.fillText(sub, 24, 80);

    const badgeTex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: badgeTex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    const badgeScale = p.business ? 12 : 8.5;
    sprite.position.set(p.x, plotResult.badgePosition.y, p.z);
    sprite.scale.set(badgeScale, badgeScale * (115 / 380), 1);
    group.add(sprite);
  });

  // 9. PROCEDURAL FLORA (400 Instanced Lush Trees across Hills, Lakes & Riverfront)
  const treeGeo = new THREE.DodecahedronGeometry(1.8, 0);
  treeGeo.translate(0, 2.2, 0);
  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x166534, // Assam deep tea-garden green
    roughness: 0.88,
    flatShading: true,
  });
  const totalTrees = 400;
  const treeInst = new THREE.InstancedMesh(treeGeo, treeMat, totalTrees);

  const treeDummy = new THREE.Object3D();
  let tIdx = 0;

  const isTreeClear = (tx: number, tz: number) => {
    for (const p of plotPlacements) {
      if (Math.hypot(tx - p.x, tz - p.z) < 22) return false;
    }
    for (const rd of roads) {
      if (distToSegment(tx, tz, rd.x1, rd.z1, rd.x2, rd.z2) < rd.width / 2 + 3.8) return false;
    }
    return true;
  };

  // A. Kamakhya / Nilachal Hill Groves
  for (let a = 0; a < Math.PI * 2 && tIdx < 80; a += 0.18) {
    const r = 18 + (Math.sin(a * 4) + 1) * 16;
    const tx = -85 + Math.cos(a) * r;
    const tz = 12 + Math.sin(a) * r;
    if (!isTreeClear(tx, tz)) continue;
    treeDummy.position.set(tx, 14 + Math.sin(a * 2) * 8, tz);
    const s = 1.1 + Math.sin(tIdx) * 0.3;
    treeDummy.scale.set(s, s * 1.3, s);
    treeDummy.rotation.y = tIdx * 1.2;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // B. Sarania Hill Groves (Gandhi Mandap)
  for (let a = 0; a < Math.PI * 2 && tIdx < 150; a += 0.22) {
    const r = 14 + (Math.cos(a * 3) + 1) * 14;
    const tx = 85 + Math.cos(a) * r;
    const tz = 20 + Math.sin(a) * r;
    if (!isTreeClear(tx, tz)) continue;
    treeDummy.position.set(tx, 12 + Math.cos(a * 2) * 6, tz);
    const s = 1.0 + Math.sin(tIdx * 1.4) * 0.25;
    treeDummy.scale.set(s, s * 1.25, s);
    treeDummy.rotation.y = tIdx * 1.4;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // C. Brahmaputra Riverfront Park (MG Road promenade)
  for (let rx = -220; rx <= 220 && tIdx < 230; rx += 8) {
    if (Math.abs(rx - -130) < 18) continue; // Skip Saraighat bridge
    const rz = getRiverSouthBankZ(rx) + 6.0;
    if (!isTreeClear(rx, rz)) continue;
    treeDummy.position.set(rx, 0.32, rz);
    const s = 1.2 + Math.cos(tIdx * 1.8) * 0.3;
    treeDummy.scale.set(s, s * 1.3, s);
    treeDummy.rotation.y = tIdx * 1.5;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // D. Dighalipukhuri & Silpukhuri Heritage Promenades
  for (let lx = 40; lx <= 90 && tIdx < 275; lx += 6) {
    for (const lz of [-24, 4]) {
      if (!isTreeClear(lx, lz)) continue;
      treeDummy.position.set(lx + Math.sin(tIdx) * 1.5, 0.32, lz);
      const s = 1.0 + Math.sin(tIdx * 2.1) * 0.25;
      treeDummy.scale.set(s, s * 1.25, s);
      treeDummy.rotation.y = tIdx * 1.3;
      treeDummy.updateMatrix();
      treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
    }
  }

  // E. Deepor Beel Wetland Embankment
  for (let a = 0; a < Math.PI * 2 && tIdx < 330; a += 0.25) {
    const bx = -190 + Math.cos(a) * 64;
    const bz = 125 + Math.sin(a) * 44;
    if (!isTreeClear(bx, bz)) continue;
    treeDummy.position.set(bx, 0.1, bz);
    const s = 1.1 + Math.sin(tIdx) * 0.2;
    treeDummy.scale.set(s, s * 1.2, s);
    treeDummy.rotation.y = tIdx;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // F. North Bank Dome Hills
  for (let nx = -200; nx <= 220 && tIdx < totalTrees; nx += 16) {
    const nz = getRiverNorthBankZ(nx) - 25 - Math.sin(tIdx) * 35;
    if (!isTreeClear(nx, nz)) continue;
    treeDummy.position.set(nx, 16 + Math.cos(tIdx) * 8, nz);
    const s = 1.3 + Math.sin(tIdx * 1.7) * 0.35;
    treeDummy.scale.set(s, s * 1.3, s);
    treeDummy.rotation.y = tIdx * 0.8;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  treeInst.instanceMatrix.needsUpdate = true;
  group.add(treeInst);
  disposables.push(treeGeo, treeMat);

  // 10. REALISTIC TRAFFIC (6 Vehicles cruising on expanded road waypoints)
  interface CityVehicle {
    mesh: THREE.Group;
    waypoints: [number, number, number][]; // [x, y, z] strictly on road centerlines
    currentWp: number;
    t: number;
    speed: number;
  }

  const vehicles: CityVehicle[] = [];

  const buildAuto = () => {
    const v = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x16a34a })
    );
    body.position.y = 0.8;
    v.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.3, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xfacc15 })
    );
    roof.position.y = 1.55;
    v.add(roof);
    return v;
  };

  const buildBus = (colorHex: number = 0xb91c1c) => {
    const v = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, 8.0),
      new THREE.MeshStandardMaterial({ color: colorHex }) // ASTC Red or Green City Bus
    );
    body.position.y = 1.3;
    v.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.3, 7.8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    roof.position.y = 2.5;
    v.add(roof);
    return v;
  };

  const buildCar = (colorHex: number = 0xf8fafc) => {
    const v = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.9, 3.8),
      new THREE.MeshStandardMaterial({ color: colorHex })
    );
    body.position.y = 0.65;
    v.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
    );
    cabin.position.set(0, 1.45, -0.3);
    v.add(cabin);
    return v;
  };

  // Vehicle 1: Auto-Rickshaw touring MG Riverfront, Pan Bazar, Dighalipukhuri & GNB Road
  const auto = buildAuto();
  group.add(auto);
  vehicles.push({
    mesh: auto,
    waypoints: [
      [-60, 0.32, -26],
      [-25, 0.32, -24],
      [35, 0.32, -28],
      [65, 0.32, -34],
      [120, 0.32, -38],
      [180, 0.32, -42],
      [150, 0.32, -15],
      [110, 0.32, -15],
      [65, 0.32, -10],
      [35, 0.32, -10],
      [-25, 0.32, -24],
      [-60, 0.32, -26],
    ],
    currentWp: 0,
    t: 0,
    speed: 4.2,
  });

  // Vehicle 2: ASTC Red Bus Crossing Saraighat Bridge seamlessly
  const bus = buildBus(0xb91c1c);
  group.add(bus);
  vehicles.push({
    mesh: bus,
    waypoints: [
      [-130, 0.32, 45],
      [-130, 0.32, -8],
      [-130, 2.56, -18.5],
      [-130, 4.8, -29],
      [-130, 4.8, -89],
      [-130, 4.8, -149],
      [-130, 2.56, -159.5],
      [-130, 0.32, -170],
      [0, 0.32, -170],
      [-130, 0.32, -170],
      [-130, 2.56, -159.5],
      [-130, 4.8, -149],
      [-130, 4.8, -89],
      [-130, 4.8, -29],
      [-130, 2.56, -18.5],
      [-130, 0.32, -8],
      [-130, 0.32, 45],
    ],
    currentWp: 0,
    t: 0.25,
    speed: 3.8,
  });

  // Vehicle 3: White Sedan on GS Road Commercial Highway (Paltan to Khanapara)
  const car = buildCar(0xf8fafc);
  group.add(car);
  vehicles.push({
    mesh: car,
    waypoints: [
      [15, 0.32, 45],
      [35, 0.32, 25],
      [60, 0.32, 15],
      [95, 0.32, 50],
      [125, 0.32, 90],
      [160, 0.32, 140],
      [190, 0.32, 160],
      [220, 0.32, 175],
      [255, 0.32, 185],
      [220, 0.32, 175],
      [190, 0.32, 160],
      [160, 0.32, 140],
      [125, 0.32, 90],
      [95, 0.32, 50],
      [60, 0.32, 15],
      [35, 0.32, 25],
      [15, 0.32, 45],
    ],
    currentWp: 0,
    t: 0.6,
    speed: 5.2,
  });

  // Vehicle 4: Green City Bus on the Zoo Road - GS Road Commercial Loop
  const greenBus = buildBus(0x059669);
  group.add(greenBus);
  vehicles.push({
    mesh: greenBus,
    waypoints: [
      [125, 0.32, 90],
      [145, 0.32, 70],
      [165, 0.32, 45],
      [175, 0.32, 15],
      [180, 0.32, -42],
      [150, 0.32, -15],
      [110, 0.32, -15],
      [60, 0.32, 15],
      [95, 0.32, 50],
      [125, 0.32, 90],
    ],
    currentWp: 0,
    t: 0.1,
    speed: 4.0,
  });

  // Vehicle 5: Delivery Van on Southern Bypass Highway NH-27
  const van = buildCar(0xf59e0b);
  group.add(van);
  vehicles.push({
    mesh: van,
    waypoints: [
      [-130, 0.32, 45],
      [-180, 0.32, 90],
      [-120, 0.32, 125],
      [-50, 0.32, 145],
      [25, 0.32, 160],
      [100, 0.32, 175],
      [175, 0.32, 185],
      [255, 0.32, 185],
      [175, 0.32, 185],
      [100, 0.32, 175],
      [25, 0.32, 160],
      [-50, 0.32, 145],
      [-120, 0.32, 125],
      [-180, 0.32, 90],
      [-130, 0.32, 45],
    ],
    currentWp: 0,
    t: 0.45,
    speed: 5.6,
  });

  // Vehicle 6: Blue Hatchback on AT Road through Maligaon & Bharalumukh
  const blueCar = buildCar(0x0284c7);
  group.add(blueCar);
  vehicles.push({
    mesh: blueCar,
    waypoints: [
      [-130, 0.32, 45],
      [-80, 0.32, 45],
      [-60, 0.32, 45],
      [-25, 0.32, 45],
      [15, 0.32, 45],
      [-25, 0.32, 45],
      [-60, 0.32, 45],
      [-80, 0.32, 45],
      [-130, 0.32, 45],
    ],
    currentWp: 0,
    t: 0.8,
    speed: 4.5,
  });

  // Animation Update: Physical 3D interpolation along asphalt waypoints
  const update = (delta: number) => {
    const dt = Math.min(delta, 0.1);

    for (const v of vehicles) {
      const p1 = v.waypoints[v.currentWp];
      const nextIdx = (v.currentWp + 1) % v.waypoints.length;
      const p2 = v.waypoints[nextIdx];

      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const dz = p2[2] - p1[2];
      const horizontalDist = Math.hypot(dx, dz);
      const totalDist = Math.hypot(dx, dy, dz);

      v.t += (v.speed * dt) / Math.max(totalDist, 1);
      if (v.t >= 1) {
        v.t = 0;
        v.currentWp = nextIdx;
      }

      const curX = p1[0] + dx * v.t;
      const curY = p1[1] + dy * v.t;
      const curZ = p1[2] + dz * v.t;
      v.mesh.position.set(curX, curY, curZ);

      const yawAngle = Math.atan2(dx, dz);
      v.mesh.rotation.y = yawAngle;

      if (horizontalDist > 0.1) {
        v.mesh.rotation.x = -Math.atan2(dy, horizontalDist);
      } else {
        v.mesh.rotation.x = 0;
      }
    }
  };

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  return {
    group,
    hitBoxes,
    plots,
    colonies: GUWAHATI_COLONIES,
    update,
    dispose,
  };
}
