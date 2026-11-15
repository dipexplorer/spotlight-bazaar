import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BusinessStorefront } from "@/types";
import { buildCartoonStorefrontPlot, StorefrontMeshResult } from "./cartoonStorefront";
import { createStripedCurbTexture } from "./streetTextures";
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
    name: "GS Road & Christian Basti",
    pincode: "781005",
    zone: "Modern Commercial Flagship",
    x: 105,
    z: 88,
    description: "Flagship business boulevard & home of Nerqiva Studio",
  },
  {
    name: "Pan Bazar Riverfront",
    pincode: "781001",
    zone: "Commercial Heritage Hub",
    x: 35,
    z: -26,
    description: "Brahmaputra riverfront, Cotton University & historic publishing district",
  },
  {
    name: "Uzan Bazar Lakefront",
    pincode: "781004",
    zone: "Lakeside Cultural District",
    x: 65,
    z: -10,
    description: "Dighalipukhuri heritage lake, Assam State Museum & artisanal cafes",
  },
  {
    name: "Paltan Bazar & Station Road",
    pincode: "781008",
    zone: "Transit & Wholesale Hub",
    x: 15,
    z: 30,
    description: "Guwahati Railway Junction, transit hub & commercial trading center",
  },
  {
    name: "Ganeshguri Commercial Center",
    pincode: "781005",
    zone: "Central Flyover Retail District",
    x: 135,
    z: 115,
    description: "Ganeshguri flyover junction, lifestyle retail & vibrant eateries",
  },
  {
    name: "Dispur Secretariat Avenue",
    pincode: "781006",
    zone: "Capital Commercial District",
    x: 165,
    z: 140,
    description: "Government Secretariat, tea auction center & premier retail",
  },
  {
    name: "Chandmari & Zoo Road",
    pincode: "781003",
    zone: "Media & Commercial Arts Hub",
    x: 135,
    z: -10,
    description: "Assam State Zoo, media houses & premier shopping promenade",
  },
  {
    name: "Jalukbari & Saraighat Bridge",
    pincode: "781014",
    zone: "University & Gateway Hub",
    x: -135,
    z: 35,
    description: "Gateway rotary, Gauhati University & Saraighat Bridge approach",
  },
  {
    name: "Beltola & Jayanagar",
    pincode: "781028",
    zone: "Historic Market & Residential Hub",
    x: 135,
    z: 170,
    description: "Bi-weekly traditional Beltola market, lifestyle cafes & residential hub",
  },
  {
    name: "Six Mile & VIP Road",
    pincode: "781022",
    zone: "Modern Healthcare & Retail Corridor",
    x: 220,
    z: 172,
    description: "Super specialty hospitals, premier retail complexes & Silsako lake link",
  },
  {
    name: "Bharalumukh & Shantipur",
    pincode: "781009",
    zone: "Riverfront Promenade & Commerce",
    x: -25,
    z: 25,
    description: "Bharalu river discharge, riverfront walkways & traditional commerce",
  },
  {
    name: "Maligaon Commercial Center",
    pincode: "781011",
    zone: "NFR Headquarters & Transit",
    x: -85,
    z: 35,
    description: "Northeast Frontier Railway HQ, bustling markets & Kamakhya approach",
  },
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
 * Organic parametric S-curve of the Brahmaputra South Bank at Guwahati (matching Google Maps reality).
 * Traces authentically along the southern shore:
 * - West / Pandu approach (x = -340 to -135): widens southwards into Pandu/Azara basin
 * - Saraighat bottleneck (x = -135): narrowest gorge in Assam (z = -6.0)
 * - Kamakhya foothill & Nilachal ridge (x = -85 to -55): bends gently north around the mountain
 * - Bharalumukh & Fancy Bazar riverfront (x = -25 to 0): z = -22 to -28
 * - Pan Bazar & Sukreswar Promenade (x = 35 to 85): z = -35 to -44
 * - Kharghuli bend (x = 160): curves sharply Northeast to z = -68
 * - Noonmati & Ramsa Foothill (x = 240): sweeps Northeast to z = -115
 * - Panikhaiti & Kurua East (x = 340+): sweeps Northeast to z = -175 to -210
 */
export function getRiverSouthBankZ(x: number): number {
  if (x < -135) {
    const t = Math.min(1, (-135 - x) / 220);
    return -6.0 + t * 24.0 + Math.sin(x * 0.015) * 2.5;
  }
  if (x < -25) {
    const t = (x - -135) / 110;
    return -6.0 + t * (-22.0 - -6.0) + Math.sin(t * Math.PI) * 2.5;
  }
  if (x < 85) {
    const t = (x - -25) / 110;
    return -22.0 + t * (-44.0 - -22.0) + Math.sin(t * Math.PI) * 3.0;
  }
  if (x < 180) {
    const t = (x - 85) / 95;
    return -44.0 + t * (-80.0 - -44.0) + Math.sin(t * Math.PI) * 3.5;
  }
  if (x < 340) {
    const t = (x - 180) / 160;
    return -80.0 + t * (-175.0 - -80.0) + Math.sin(t * Math.PI) * 4.0;
  }
  return -175.0 - (x - 340) * 0.45;
}

/**
 * Organic parametric curve of the Brahmaputra North Bank across from Guwahati (matching Google Maps reality):
 * Forms the wide northern shoreline passing through:
 * - Saraighat North abutment (x = -135, z = -135.0, river width = 129m)
 * - Agiyathuri & Changsari western basin (x < -135, z curves to -160)
 * - Amingaon North bay (x = -70 to 0, widens dramatically to z = -180 to -195)
 * - IIT Guwahati South riverbank (x = 75, z = -225)
 * - Dirgheswari & Kurua East (x = 180 to 340, sweeps northeast to z = -265 to -340)
 */
export function getRiverNorthBankZ(x: number): number {
  if (x < -135) {
    const t = Math.min(1, (-135 - x) / 220);
    return -135.0 - t * 35.0 + Math.cos(x * 0.015) * 3.0;
  }
  if (x < -25) {
    const t = (x - -135) / 110;
    return -135.0 + t * (-180.0 - -135.0) + Math.sin(t * Math.PI) * 4.0;
  }
  if (x < 85) {
    const t = (x - -25) / 110;
    return -180.0 + t * (-225.0 - -180.0) + Math.sin(t * Math.PI) * 4.5;
  }
  if (x < 180) {
    const t = (x - 85) / 95;
    return -225.0 + t * (-265.0 - -225.0) + Math.sin(t * Math.PI) * 4.0;
  }
  if (x < 340) {
    const t = (x - 180) / 160;
    return -265.0 + t * (-340.0 - -265.0) + Math.sin(t * Math.PI) * 4.5;
  }
  return -340.0 - (x - 340) * 0.55;
}

export interface RoadDef {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  name: string;
}

export const GUWAHATI_ROADS: RoadDef[] = [
  // 1. Riverfront MG Road & Western River Approaches (Following true South Bank)
  { x1: -240.0, z1: 10.0, x2: -180.0, z2: 4.0, width: 8.5, name: "Pandu River Approach West" },
  { x1: -180.0, z1: 4.0, x2: -135.0, z2: -4.0, width: 9.0, name: "Pandu Port to Saraighat South" },
  { x1: -135.0, z1: -4.0, x2: -85.0, z2: -12.0, width: 9.0, name: "MG Road (Saraighat - Kamakhya Ghat)" },
  { x1: -85.0, z1: -12.0, x2: -25.0, z2: -20.0, width: 9.0, name: "MG Road (Kamakhya - Bharalumukh)" },
  { x1: -25.0, z1: -20.0, x2: 35.0, z2: -26.0, width: 9.0, name: "MG Road (Bharalumukh - Pan Bazar Promenade)" },
  { x1: 35.0, z1: -26.0, x2: 85.0, z2: -35.0, width: 9.0, name: "MG Road (Pan Bazar - Uzan Bazar Ghat)" },
  { x1: 85.0, z1: -35.0, x2: 160.0, z2: -65.0, width: 9.0, name: "MG Road (Uzan Bazar - Kharghuli Bend)" },
  { x1: 160.0, z1: -65.0, x2: 240.0, z2: -115.0, width: 8.5, name: "MG Road (Kharghuli - Ramsa Riverfront)" },

  // 2. Saraighat Bridge South Approach (Jalukbari Rotary to Bridge Ramp)
  { x1: -135.0, z1: 12.0, x2: -135.0, z2: 35.0, width: 9.5, name: "NH-27 Saraighat South Highway" },

  // 3. North Highway Network (Seamlessly connected to Saraighat Bridge at Amingaon)
  { x1: -135.0, z1: -150.0, x2: -190.0, z2: -155.0, width: 8.5, name: "North Highway (Amingaon to Agiyathuri)" },
  { x1: -190.0, z1: -155.0, x2: -250.0, z2: -145.0, width: 8.5, name: "North Highway West (Changsari Approach)" },
  { x1: -135.0, z1: -150.0, x2: -70.0, z2: -165.0, width: 8.5, name: "North Highway (Amingaon East)" },
  { x1: -70.0, z1: -165.0, x2: 0.0, z2: -178.0, width: 8.5, name: "North Highway (IIT Guwahati South Approach)" },
  { x1: 0.0, z1: -178.0, x2: 75.0, z2: -195.0, width: 8.5, name: "North Highway (IIT Guwahati Main Campus)" },
  { x1: 75.0, z1: -195.0, x2: 150.0, z2: -215.0, width: 8.5, name: "North Highway (Dirgheswari Temple Approach)" },
  { x1: 75.0, z1: -195.0, x2: 35.0, z2: -225.0, width: 7.5, name: "IIT Guwahati North Campus Crescent" },
  { x1: 35.0, z1: -225.0, x2: -25.0, z2: -220.0, width: 7.5, name: "IIT Guwahati Tech Park Promenade" },
  { x1: -25.0, z1: -220.0, x2: -70.0, z2: -165.0, width: 7.5, name: "IIT West Gate to Amingaon Loop" },

  // 4. AT Road Corridor (Jalukbari -> Maligaon -> Bharalumukh -> Paltan Bazar)
  { x1: -135.0, z1: 35.0, x2: -85.0, z2: 35.0, width: 9.0, name: "AT Road (Jalukbari - Maligaon Railway HQ)" },
  { x1: -85.0, z1: 35.0, x2: -55.0, z2: 30.0, width: 9.0, name: "AT Road (Maligaon - Kamakhya Foothill)" },
  { x1: -55.0, z1: 30.0, x2: -25.0, z2: 25.0, width: 9.0, name: "AT Road (Kamakhya Foothill - Bharalumukh)" },
  { x1: -25.0, z1: 25.0, x2: -5.0, z2: 28.0, width: 9.0, name: "AT Road (Bharalumukh - Machkhowa)" },
  { x1: -5.0, z1: 28.0, x2: 15.0, z2: 30.0, width: 9.0, name: "AT Road (Machkhowa - Paltan Bazar Station)" },
  { x1: -25.0, z1: 25.0, x2: -25.0, z2: -20.0, width: 8.0, name: "Bharalumukh River Link" },

  // 4.1 Kamakhya Mountain Switchbacks (Nilachal Ridge Drive)
  { x1: -55.0, z1: 30.0, x2: -75.0, z2: 20.0, width: 7.5, name: "Kamakhya Foothill Ascent" },
  { x1: -75.0, z1: 20.0, x2: -95.0, z2: 10.0, width: 7.5, name: "Kamakhya Mid Switchback" },
  { x1: -95.0, z1: 10.0, x2: -95.0, z2: -8.0, width: 8.0, name: "Kamakhya Temple Complex Promenade" },
  { x1: -95.0, z1: -8.0, x2: -85.0, z2: -12.0, width: 8.0, name: "Kamakhya North Descent to Ghat" },

  // 5. GS Road Commercial Flagship Spine (Smooth Diagonal Arterial from Paltan Bazar to Khanapara)
  { x1: 15.0, z1: 30.0, x2: 45.0, z2: 45.0, width: 9.5, name: "GS Road (Paltan Bazar - Ulubari Flyover)" },
  { x1: 45.0, z1: 45.0, x2: 75.0, z2: 65.0, width: 10.0, name: "GS Road (Ulubari - Bhangagarh Commercial)" },
  { x1: 75.0, z1: 65.0, x2: 105.0, z2: 88.0, width: 10.0, name: "GS Road (Bhangagarh - Christian Basti Flagship)" },
  { x1: 105.0, z1: 88.0, x2: 120.0, z2: 102.0, width: 9.5, name: "GS Road (Christian Basti - Walford)" },
  { x1: 120.0, z1: 102.0, x2: 135.0, z2: 115.0, width: 10.0, name: "GS Road (Walford - Ganeshguri Flyover)" },
  { x1: 135.0, z1: 115.0, x2: 165.0, z2: 140.0, width: 10.0, name: "GS Road (Ganeshguri - Dispur Secretariat)" },
  { x1: 165.0, z1: 140.0, x2: 195.0, z2: 160.0, width: 9.5, name: "GS Road (Dispur - Down Town Hospital)" },
  { x1: 195.0, z1: 160.0, x2: 220.0, z2: 172.0, width: 9.5, name: "GS Road (Down Town - Six Mile Flyover)" },
  { x1: 220.0, z1: 172.0, x2: 240.0, z2: 180.0, width: 9.5, name: "GS Road (Six Mile - Khanapara Gateway Interchange)" },

  // 6. Zoo Road Corridor (RG Baruah Road: Chandmari -> State Zoo -> Ganeshguri)
  { x1: 135.0, z1: -10.0, x2: 145.0, z2: 25.0, width: 9.0, name: "Zoo Road (Chandmari - Commerce College)" },
  { x1: 145.0, z1: 25.0, x2: 145.0, z2: 65.0, width: 9.0, name: "Zoo Road (Zoo Tiniali - Assam State Zoo)" },
  { x1: 145.0, z1: 65.0, x2: 140.0, z2: 92.0, width: 9.0, name: "Zoo Road (State Zoo - Sundarpur)" },
  { x1: 140.0, z1: 92.0, x2: 135.0, z2: 115.0, width: 9.0, name: "Zoo Road (Sundarpur - Ganeshguri Flyover)" },

  // 7. GNB Road Cultural Corridor (Pan Bazar -> Cotton Univ -> Dighalipukhuri -> Ambari -> Chandmari)
  { x1: 35.0, z1: -26.0, x2: 65.0, z2: -10.0, width: 8.5, name: "GNB Road (Pan Bazar - Cotton University)" },
  { x1: 65.0, z1: -10.0, x2: 95.0, z2: -12.0, width: 8.5, name: "GNB Road (Dighalipukhuri - State Museum)" },
  { x1: 95.0, z1: -12.0, x2: 135.0, z2: -10.0, width: 8.5, name: "GNB Road (Ambari - Chandmari Flyover)" },
  { x1: 65.0, z1: -10.0, x2: 85.0, z2: -35.0, width: 8.0, name: "Latasil Field to Uzan Bazar Ghat Link" },

  // 8. B. Baruah Road & Nehru Stadium Links
  { x1: 35.0, z1: -26.0, x2: 45.0, z2: 5.0, width: 8.0, name: "Nehru Park to Stadium Approach" },
  { x1: 45.0, z1: 5.0, x2: 45.0, z2: 45.0, width: 8.0, name: "B. Baruah Road (Nehru Stadium to Ulubari)" },

  // 9. Rajgarh Road (Connecting Chandmari to Bhangagarh)
  { x1: 135.0, z1: -10.0, x2: 105.0, z2: 30.0, width: 8.0, name: "Rajgarh Road North (Chandmari Link)" },
  { x1: 105.0, z1: 30.0, x2: 75.0, z2: 65.0, width: 8.0, name: "Rajgarh Road South (Bhangagarh Link)" },

  // 10. NH-27 Southern Bypass Expressway (The Grand Southern Arc on Google Maps)
  { x1: -135.0, z1: 35.0, x2: -160.0, z2: 75.0, width: 9.5, name: "NH-27 Jalukbari to Boragaon Eco Junction" },
  { x1: -160.0, z1: 75.0, x2: -175.0, z2: 115.0, width: 10.0, name: "NH-27 Boragaon (Deepor Beel East Shore)" },
  { x1: -175.0, z1: 115.0, x2: -150.0, z2: 150.0, width: 10.0, name: "NH-27 Deepor Beel South to Gorchuk Approach" },
  { x1: -150.0, z1: 150.0, x2: -105.0, z2: 168.0, width: 10.0, name: "NH-27 Gorchuk Junction" },
  { x1: -105.0, z1: 168.0, x2: -30.0, z2: 180.0, width: 10.0, name: "NH-27 Gorchuk to Lokhra ISBT" },
  { x1: -30.0, z1: 180.0, x2: 40.0, z2: 188.0, width: 10.0, name: "NH-27 Lokhra to Betkuchi / Lalmati" },
  { x1: 40.0, z1: 188.0, x2: 120.0, z2: 192.0, width: 10.0, name: "NH-27 Betkuchi to Basistha Chariali" },
  { x1: 120.0, z1: 192.0, x2: 180.0, z2: 188.0, width: 10.0, name: "NH-27 Basistha to Khanapara West" },
  { x1: 180.0, z1: 188.0, x2: 240.0, z2: 180.0, width: 10.0, name: "NH-27 Khanapara Gateway Interchange" },
  { x1: 240.0, z1: 180.0, x2: 300.0, z2: 205.0, width: 10.0, name: "NH-27 Khanapara to Jorabat Expressway" },

  // 11. Deepor Beel Scenic Shore Drive & Borjhar Airport Highway
  { x1: -160.0, z1: 75.0, x2: -215.0, z2: 85.0, width: 8.5, name: "Borjhar Airport Highway West" },
  { x1: -215.0, z1: 85.0, x2: -240.0, z2: 120.0, width: 8.0, name: "Deepor Beel West Shore Drive" },
  { x1: -240.0, z1: 120.0, x2: -210.0, z2: 155.0, width: 8.0, name: "Deepor Beel South Shore Drive" },
  { x1: -210.0, z1: 155.0, x2: -150.0, z2: 150.0, width: 8.0, name: "Deepor Beel South to NH-27 Link" },

  // 12. Beltola & Jayanagar High Street
  { x1: 135.0, z1: 115.0, x2: 135.0, z2: 145.0, width: 8.5, name: "Beltola Tiniali Road" },
  { x1: 135.0, z1: 145.0, x2: 135.0, z2: 170.0, width: 8.5, name: "Beltola Bazar Chariali" },
  { x1: 135.0, z1: 170.0, x2: 120.0, z2: 192.0, width: 8.5, name: "Beltola to Basistha Chariali Link" },
  { x1: 135.0, z1: 170.0, x2: 240.0, z2: 180.0, width: 8.0, name: "Beltola to Khanapara Link" },
  { x1: 165.0, z1: 140.0, x2: 135.0, z2: 145.0, width: 8.0, name: "Dispur Last Gate to Beltola Link" },

  // 13. VIP Road & Eastern Wetlands (Six Mile -> Chachal -> Narengi)
  { x1: 220.0, z1: 172.0, x2: 215.0, z2: 130.0, width: 8.5, name: "Six Mile to Chachal / Silsako Beel" },
  { x1: 215.0, z1: 130.0, x2: 215.0, z2: 80.0, width: 8.5, name: "VIP Road Borbari" },
  { x1: 215.0, z1: 80.0, x2: 220.0, z2: 35.0, width: 8.5, name: "VIP Road Hengrabari" },
  { x1: 220.0, z1: 35.0, x2: 235.0, z2: -10.0, width: 8.5, name: "VIP Road to Narengi Tiniali" },
  { x1: 235.0, z1: -10.0, x2: 240.0, z2: -115.0, width: 8.0, name: "Narengi to Ramsa River Link" },
  { x1: 235.0, z1: -10.0, x2: 180.0, z2: -15.0, width: 8.5, name: "Noonmati Refinery Road" },
  { x1: 180.0, z1: -15.0, x2: 135.0, z2: -10.0, width: 8.5, name: "Bamunimaidam to Chandmari Junction" },
  { x1: 145.0, z1: 25.0, x2: 220.0, z2: 35.0, width: 8.0, name: "Mother Teresa Road (Zoo Tiniali to Narengi)" },

  // 14. South Central Commercial & Residential Grid
  { x1: 15.0, z1: 30.0, x2: 15.0, z2: 75.0, width: 7.5, name: "Station Road South / Solapara" },
  { x1: 15.0, z1: 75.0, x2: 60.0, z2: 75.0, width: 7.5, name: "Rehabari Commercial Drive" },
  { x1: 60.0, z1: 75.0, x2: 105.0, z2: 88.0, width: 7.5, name: "Arya Nagar to Christian Basti Link" },
  { x1: 15.0, z1: 75.0, x2: -25.0, z2: 75.0, width: 7.5, name: "Arya Nagar West Drive" },
  { x1: -25.0, z1: 75.0, x2: -25.0, z2: 25.0, width: 7.5, name: "Fatasil to Bharalumukh Link" },
  { x1: -25.0, z1: 75.0, x2: -30.0, z2: 180.0, width: 8.0, name: "Fatasil South to Lokhra ISBT Bypass Link" },

  // 15. Dispur Capital Complex & Assam Secretariat Enclave
  { x1: 165.0, z1: 140.0, x2: 180.0, z2: 115.0, width: 8.0, name: "Assam Assembly Avenue" },
  { x1: 180.0, z1: 115.0, x2: 140.0, z2: 92.0, width: 7.5, name: "Assembly to Zoo Road Link" },
  { x1: 180.0, z1: 115.0, x2: 195.0, z2: 160.0, width: 7.5, name: "MLA Hostel Drive" },
];

/**
 * Creates an authentic Low-Poly Faceted Hill Mesh with sharp triangular faces and flat shading,
 * exactly matching the iconic visual style of indiaagain.live.
 */
function createLowPolyFacetedHill(
  radius: number,
  height: number,
  color: number = 0x2e7d32,
  segments: number = 8
): THREE.Mesh {
  const geo = new THREE.ConeGeometry(radius, height, segments, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < -height / 2 + 0.1) {
      // Base sits flush at ground level
      pos.setY(i, -height / 2);
    } else if (y > height / 2 - 0.1) {
      // Apex point
      pos.setY(i, height / 2);
    } else {
      // Middle ring: introduce organic asymmetry for faceted natural look
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const perturb = (Math.sin(x * 0.15) + Math.cos(z * 0.15)) * 0.12 * radius;
      pos.setX(i, x * (1.06 + Math.sin(z * 0.08) * 0.08));
      pos.setZ(i, z * (0.94 + Math.cos(x * 0.08) * 0.08));
      pos.setY(i, y + perturb);
    }
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds the complete, geographically accurate 3D city of Guwahati:
 * - Expansive natural Assam valley terrain with seamless downward horizon skirt
 * - Majestic curving Brahmaputra River following authentic geography with sandbars (chars) and Umananda Island
 * - Iconic Low-Poly Faceted Hills across North Guwahati and city landmarks (Kamakhya, Sarania, Kharghuli)
 * - Deepor Beel, Dighalipukhuri, Silpukhuri, Borsola Beel, Silsako Beel & continuous Bharalu urban stream
 * - Iconic 3D Saraighat Double-Deck Truss Bridge bridging South and North Guwahati
 * - Fully interconnected GIS-accurate road network covering all arterial & neighborhood avenues
 * - 1,200 instanced lush low-poly trees distributed across hills, riverfronts, and lakes
 * - 12 official commercial colonies & verified flagship storefronts dynamically facing the road
 * - Calibrated peaceful traffic cruising road waypoints and across Saraighat Bridge
 */
export function buildGuwahatiCity(
  storefronts: BusinessStorefront[]
): GuwahatiCityResult {
  const group = new THREE.Group();
  group.name = "guwahati_city_system";

  const hitBoxes: THREE.Mesh[] = [];
  const plots: StorefrontMeshResult[] = [];
  const disposables: { dispose: () => void }[] = [];

  const guwahatiStorefronts = storefronts.filter(
    (s) => !s?.city_name || s.city_name.toLowerCase() === "guwahati"
  );

  const roads = GUWAHATI_ROADS;

  // 1. EXPANSIVE ASSAM VALLEY NATURAL TERRAIN (3600 x 3200)
  const terrainWidth = 3600;
  const terrainHeight = 3200;
  const segX = 100;
  const segZ = 90;

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

    // Brahmaputra River Basin depression along the north
    if (z >= zN - 6 && z <= zS + 6 && Math.abs(x) < 1750) {
      elev = -0.95; // River water level sits cleanly at Y = 0.04
    }

    // Outer Horizon Skirt: Curves down into horizon fog to eliminate square plane corners
    if (radialDist > 1350) {
      const skirtFactor = Math.min((radialDist - 1350) / 380, 1.0);
      elev = elev * (1 - skirtFactor) - skirtFactor * 22.0;
    }

    posAttr.setY(i, elev);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d32, // Vibrant Assam Valley emerald green
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 2. THE MAJESTIC CURVING BRAHMAPUTRA RIVER
  const riverSteps = 140;
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

  // Sandy Riverbanks framing both shores
  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xf1dfaa, // Golden silt river sand
    roughness: 0.92,
  });
  disposables.push(beachMat);

  // South Beach Ribbon (Width: 10m)
  const southBeachGeo = new THREE.BufferGeometry();
  const southBeachPos: number[] = [];
  const southBeachUVs: number[] = [];
  const southBeachIdx: number[] = [];

  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zS = getRiverSouthBankZ(rx);

    southBeachPos.push(rx, 0.045, zS);
    southBeachUVs.push(u, 0);
    southBeachPos.push(rx, 0.05, zS + 10.0);
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
  const southBeachMesh = new THREE.Mesh(southBeachGeo, beachMat);
  southBeachMesh.receiveShadow = true;
  group.add(southBeachMesh);
  disposables.push(southBeachGeo);

  // North Beach Ribbon (Width: 12m)
  const northBeachGeo = new THREE.BufferGeometry();
  const northBeachPos: number[] = [];
  const northBeachUVs: number[] = [];
  const northBeachIdx: number[] = [];

  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zN = getRiverNorthBankZ(rx);

    northBeachPos.push(rx, 0.05, zN - 12.0);
    northBeachUVs.push(u, 0);
    northBeachPos.push(rx, 0.045, zN);
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
  const northBeachMesh = new THREE.Mesh(northBeachGeo, beachMat);
  northBeachMesh.receiveShadow = true;
  group.add(northBeachMesh);
  disposables.push(northBeachGeo);

  // Vibrant Cartoon Shallow Water Cyan Rims (The Signature Look of IndiaAgain)
  const shallowCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // Vibrant electric sky cyan
    roughness: 0.16,
    metalness: 0.28,
    transparent: true,
    opacity: 0.95,
  });
  disposables.push(shallowCyanMat);

  // South Shallow Cyan Ribbon (7m wide along South Shore into water)
  const southShallowGeo = new THREE.BufferGeometry();
  const southShallowPos: number[] = [];
  const southShallowUVs: number[] = [];
  const southShallowIdx: number[] = [];
  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zS = getRiverSouthBankZ(rx);
    southShallowPos.push(rx, 0.046, zS - 7.0);
    southShallowUVs.push(u, 0);
    southShallowPos.push(rx, 0.046, zS);
    southShallowUVs.push(u, 1);
  }
  for (let s = 0; s < riverSteps; s++) {
    const p0 = s * 2;
    const p1 = s * 2 + 1;
    const p2 = (s + 1) * 2;
    const p3 = (s + 1) * 2 + 1;
    southShallowIdx.push(p0, p2, p1);
    southShallowIdx.push(p1, p2, p3);
  }
  southShallowGeo.setAttribute("position", new THREE.Float32BufferAttribute(southShallowPos, 3));
  southShallowGeo.setAttribute("uv", new THREE.Float32BufferAttribute(southShallowUVs, 2));
  southShallowGeo.setIndex(southShallowIdx);
  southShallowGeo.computeVertexNormals();
  const southShallowMesh = new THREE.Mesh(southShallowGeo, shallowCyanMat);
  group.add(southShallowMesh);
  disposables.push(southShallowGeo);

  // North Shallow Cyan Ribbon (7m wide along North Shore into water)
  const northShallowGeo = new THREE.BufferGeometry();
  const northShallowPos: number[] = [];
  const northShallowUVs: number[] = [];
  const northShallowIdx: number[] = [];
  for (let s = 0; s <= riverSteps; s++) {
    const u = s / riverSteps;
    const rx = riverXMin + u * (riverXMax - riverXMin);
    const zN = getRiverNorthBankZ(rx);
    northShallowPos.push(rx, 0.046, zN);
    northShallowUVs.push(u, 0);
    northShallowPos.push(rx, 0.046, zN + 7.0);
    northShallowUVs.push(u, 1);
  }
  for (let s = 0; s < riverSteps; s++) {
    const p0 = s * 2;
    const p1 = s * 2 + 1;
    const p2 = (s + 1) * 2;
    const p3 = (s + 1) * 2 + 1;
    northShallowIdx.push(p0, p2, p1);
    northShallowIdx.push(p1, p2, p3);
  }
  northShallowGeo.setAttribute("position", new THREE.Float32BufferAttribute(northShallowPos, 3));
  northShallowGeo.setAttribute("uv", new THREE.Float32BufferAttribute(northShallowUVs, 2));
  northShallowGeo.setIndex(northShallowIdx);
  northShallowGeo.computeVertexNormals();
  const northShallowMesh = new THREE.Mesh(northShallowGeo, shallowCyanMat);
  group.add(northShallowMesh);
  disposables.push(northShallowGeo);

  // 3. GENTLE DISTANT NORTH HORIZON HILLS (Matching indiaagain.live background aesthetic)
  // City floor is completely flat, open & lush green — hills are placed strictly far across the river on the north horizon.
  const hillsGroup = new THREE.Group();
  hillsGroup.name = "guwahati_faceted_hills";

  const northHillsDef = [
    { cx: -280, cz: -320, r: 85, h: 22, color: 0x2e7d32 },
    { cx: -150, cz: -340, r: 95, h: 25, color: 0x1b5e20 },
    { cx: -20, cz: -360, r: 105, h: 28, color: 0x2e7d32 },
    { cx: 110, cz: -370, r: 110, h: 26, color: 0x388e3c },
    { cx: 240, cz: -390, r: 100, h: 24, color: 0x2e7d32 },
    { cx: 370, cz: -410, r: 90, h: 22, color: 0x1b5e20 },
  ];
  for (const h of northHillsDef) {
    const hillMesh = createLowPolyFacetedHill(h.r, h.h, h.color, 8);
    hillMesh.position.set(h.cx, h.h / 2, h.cz);
    hillsGroup.add(hillMesh);
    disposables.push(hillMesh.geometry, hillMesh.material as THREE.Material);
  }
  group.add(hillsGroup);

  // 5. WATER BODIES: DEEPOR BEEL, DIGHALIPUKHURI, SILPUKHURI, BORSOLA BEEL & SILSAKO BEEL
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Reflective deep sky blue water
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.94,
  });
  const cyanLakeRimMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // Vibrant cartoon cyan shallow shoreline rim (matching indiaagain)
    roughness: 0.15,
    metalness: 0.25,
    transparent: true,
    opacity: 0.95,
  });
  const marshShoreMat = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Lush marshy wetland reeds
    roughness: 0.92,
  });
  disposables.push(waterMat, cyanLakeRimMat, marshShoreMat);

  // A. Organic Deepor Beel Wetland Lake (Nestled southwest of Boragaon and Gorchuk, matching Google Maps)
  const beelShape = new THREE.Shape();
  beelShape.moveTo(-165, -85);
  beelShape.bezierCurveTo(-180, -78, -210, -82, -235, -95);
  beelShape.bezierCurveTo(-255, -110, -250, -138, -232, -155);
  beelShape.bezierCurveTo(-215, -170, -185, -165, -165, -145);
  beelShape.bezierCurveTo(-150, -130, -150, -100, -165, -85);

  const beelGeo = new THREE.ShapeGeometry(beelShape, 24);
  beelGeo.rotateX(-Math.PI / 2);
  const beelMesh = new THREE.Mesh(beelGeo, waterMat);
  beelMesh.position.set(0, 0.05, 0);
  group.add(beelMesh);

  // Cyan shallow shoreline rim around Deepor Beel (Signature cartoon look matching indiaagain.live)
  const beelCyanShape = new THREE.Shape();
  beelCyanShape.moveTo(-163, -82);
  beelCyanShape.bezierCurveTo(-180, -74, -213, -78, -240, -92);
  beelCyanShape.bezierCurveTo(-262, -108, -256, -142, -236, -160);
  beelCyanShape.bezierCurveTo(-217, -176, -183, -171, -161, -149);
  beelCyanShape.bezierCurveTo(-145, -132, -145, -98, -163, -82);

  const beelCyanGeo = new THREE.ShapeGeometry(beelCyanShape, 24);
  beelCyanGeo.rotateX(-Math.PI / 2);
  const beelCyanMesh = new THREE.Mesh(beelCyanGeo, cyanLakeRimMat);
  beelCyanMesh.position.set(0, 0.046, 0);
  group.add(beelCyanMesh);

  // Lush marshy wetland reeds outer ring
  const beelShoreShape = new THREE.Shape();
  beelShoreShape.moveTo(-160, -78);
  beelShoreShape.bezierCurveTo(-180, -70, -216, -74, -245, -88);
  beelShoreShape.bezierCurveTo(-268, -105, -262, -146, -240, -165);
  beelShoreShape.bezierCurveTo(-219, -182, -181, -177, -157, -153);
  beelShoreShape.bezierCurveTo(-140, -134, -140, -95, -160, -78);

  const beelShoreGeo = new THREE.ShapeGeometry(beelShoreShape, 24);
  beelShoreGeo.rotateX(-Math.PI / 2);
  const beelShore = new THREE.Mesh(beelShoreGeo, marshShoreMat);
  beelShore.position.set(0, 0.04, 0);
  group.add(beelShore);
  disposables.push(beelGeo, beelCyanGeo, beelShoreGeo);

  // B. Dighalipukhuri Heritage Lake (Uzan Bazar / Heritage District, 54m x 22m)
  const lakeW = 54;
  const lakeL = 22;
  const lakeGeo = new THREE.PlaneGeometry(lakeW, lakeL);
  lakeGeo.rotateX(-Math.PI / 2);
  const lakeMesh = new THREE.Mesh(lakeGeo, waterMat);
  lakeMesh.position.set(65, 0.05, -10);
  group.add(lakeMesh);

  const lakeBorderGeo = new THREE.PlaneGeometry(lakeW + 7, lakeL + 7);
  lakeBorderGeo.rotateX(-Math.PI / 2);
  const lakeBorder = new THREE.Mesh(lakeBorderGeo, cyanLakeRimMat);
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

  const silBorderGeo = new THREE.PlaneGeometry(silW + 6, silL + 6);
  silBorderGeo.rotateX(-Math.PI / 2);
  const silBorder = new THREE.Mesh(silBorderGeo, cyanLakeRimMat);
  silBorder.position.set(150, 0.045, -15);
  group.add(silBorder);
  disposables.push(silGeo, silBorderGeo);

  // D. Borsola Beel (South Paltan / Solapara, 48m x 24m)
  const borGeo = new THREE.CylinderGeometry(24, 28, 0.35, 20);
  borGeo.scale(1.4, 1.0, 0.65);
  const borMesh = new THREE.Mesh(borGeo, waterMat);
  borMesh.position.set(15, 0.05, 75);
  group.add(borMesh);

  const borCyanGeo = new THREE.CylinderGeometry(27, 31, 0.32, 20);
  borCyanGeo.scale(1.4, 1.0, 0.65);
  const borCyanMesh = new THREE.Mesh(borCyanGeo, cyanLakeRimMat);
  borCyanMesh.position.set(15, 0.046, 75);
  group.add(borCyanMesh);
  disposables.push(borGeo, borCyanGeo);

  // E. Silsako Beel (Six Mile / Chachal, 60m x 26m)
  const silsakoGeo = new THREE.CylinderGeometry(30, 36, 0.35, 22);
  silsakoGeo.scale(1.5, 1.0, 0.6);
  const silsakoMesh = new THREE.Mesh(silsakoGeo, waterMat);
  silsakoMesh.position.set(185, 0.05, 110);
  silsakoMesh.rotation.y = -0.15;
  group.add(silsakoMesh);

  const silsakoCyanGeo = new THREE.CylinderGeometry(33, 39, 0.32, 22);
  silsakoCyanGeo.scale(1.5, 1.0, 0.6);
  const silsakoCyanMesh = new THREE.Mesh(silsakoCyanGeo, cyanLakeRimMat);
  silsakoCyanMesh.position.set(185, 0.046, 110);
  silsakoCyanMesh.rotation.y = -0.15;
  group.add(silsakoCyanMesh);
  disposables.push(silsakoGeo, silsakoCyanGeo);

  // F. Continuous Bharalu Urban Stream (From Dispur/Ulubari through Bharalumukh into Brahmaputra)
  const bharaluPts: [number, number][] = [
    [105, 135],
    [70, 75],
    [35, 48],
    [5, 36],
    [-20, 20],
    [-28, -5],
    [-28, -26],
  ];
  for (let b = 0; b < bharaluPts.length - 1; b++) {
    const p1 = bharaluPts[b];
    const p2 = bharaluPts[b + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    // Deep water ribbon
    const cGeo = new THREE.PlaneGeometry(6.5, len + 0.5);
    cGeo.rotateX(-Math.PI / 2);
    const cMesh = new THREE.Mesh(cGeo, waterMat);
    cMesh.position.set((p1[0] + p2[0]) / 2, 0.045, (p1[1] + p2[1]) / 2);
    cMesh.rotation.y = angle;
    group.add(cMesh);

    // Cyan shallow edge
    const cRimGeo = new THREE.PlaneGeometry(9.5, len + 0.5);
    cRimGeo.rotateX(-Math.PI / 2);
    const cRimMesh = new THREE.Mesh(cRimGeo, cyanLakeRimMat);
    cRimMesh.position.set((p1[0] + p2[0]) / 2, 0.042, (p1[1] + p2[1]) / 2);
    cRimMesh.rotation.y = angle;
    group.add(cRimMesh);
    disposables.push(cGeo, cRimGeo);
  }

  // G. Historic Nehru Stadium / Judge's Field Cricket Oval (Western Open Meadow, matching indiaagain)
  const cricketOvalGeo = new THREE.CylinderGeometry(28, 28, 0.15, 32);
  const cricketOvalMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.88 });
  const cricketOval = new THREE.Mesh(cricketOvalGeo, cricketOvalMat);
  cricketOval.position.set(-85, 0.08, 85);
  group.add(cricketOval);

  const pitchGeo = new THREE.PlaneGeometry(4.5, 18);
  pitchGeo.rotateX(-Math.PI / 2);
  const pitchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.95 });
  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.position.set(-85, 0.16, 85);
  group.add(pitch);

  const chalkRingGeo = new THREE.RingGeometry(25.5, 26.2, 32);
  chalkRingGeo.rotateX(-Math.PI / 2);
  const chalkRingMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide });
  const chalkRing = new THREE.Mesh(chalkRingGeo, chalkRingMat);
  chalkRing.position.set(-85, 0.162, 85);
  group.add(chalkRing);
  disposables.push(cricketOvalGeo, cricketOvalMat, pitchGeo, pitchMat, chalkRingGeo, chalkRingMat);

  // 6. SARAIGHAT BRIDGE (Iconic Double-Deck Steel Truss Bridge across Brahmaputra)
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = "saraighat_bridge";

  const bridgeX = -135;
  const bridgeDeckW = 9.4;
  const bridgeDeckL = 131; // River span from South bank Z = -4 to North bank Z = -135
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
  bridgeDeck.position.set(bridgeX, bridgeDeckY - 0.6, -69.5);
  bridgeDeck.receiveShadow = true;
  bridgeDeck.castShadow = true;
  bridgeGroup.add(bridgeDeck);

  // 6 Heavy Concrete Caisson Piers deep in Riverbed
  for (const pz of [-20, -42, -64, -86, -108, -128]) {
    const pierGeo = new THREE.CylinderGeometry(2.8, 3.6, 12.0, 16);
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.set(bridgeX, 1.0, pz);
    pier.receiveShadow = true;
    bridgeGroup.add(pier);
  }

  // South & North Concrete Abutment Portal Towers
  for (const portalZ of [-4, -135]) {
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
    truss.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.25), bridgeDeckY + 2.2, -69.5);
    truss.castShadow = true;
    bridgeGroup.add(truss);

    for (let bz = -128; bz <= -10; bz += 12) {
      const topBeamGeo = new THREE.BoxGeometry(bridgeDeckW + 0.6, 0.45, 0.45);
      const topBeam = new THREE.Mesh(topBeamGeo, trussMat);
      topBeam.position.set(bridgeX, bridgeDeckY + 4.4, bz);
      bridgeGroup.add(topBeam);
    }
  }

  // South Approach Ramp (Connecting Bridge Deck Z = -4, Y = 4.8 down to Ground Road Z = 12, Y = 0.32)
  const rampSouthLen = 16.0;
  const rampAngle = Math.atan2(bridgeDeckY - 0.32, rampSouthLen);
  const rampSouthGeo = new THREE.BoxGeometry(bridgeDeckW, 0.8, rampSouthLen + 0.5);
  rampSouthGeo.rotateX(-rampAngle);
  const rampSouth = new THREE.Mesh(rampSouthGeo, bridgeDeckMat);
  rampSouth.position.set(bridgeX, (bridgeDeckY + 0.32) / 2 - 0.1, 4.0);
  rampSouth.receiveShadow = true;
  bridgeGroup.add(rampSouth);

  // South Ramp Retaining Side Walls
  for (const side of [-1, 1]) {
    const wallGeo = new THREE.BoxGeometry(0.8, 1.8, rampSouthLen);
    wallGeo.rotateX(-rampAngle);
    const wall = new THREE.Mesh(wallGeo, pierMat);
    wall.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.4), (bridgeDeckY + 0.32) / 2 + 0.4, 4.0);
    bridgeGroup.add(wall);
  }

  // North Approach Ramp (Connecting Bridge Deck Z = -135, Y = 4.8 down to North Highway Z = -150, Y = 0.32)
  const rampNorthLen = 15.0;
  const rampNorthAngle = Math.atan2(bridgeDeckY - 0.32, rampNorthLen);
  const rampNorthGeo = new THREE.BoxGeometry(bridgeDeckW, 0.8, rampNorthLen + 0.5);
  rampNorthGeo.rotateX(rampNorthAngle);
  const rampNorth = new THREE.Mesh(rampNorthGeo, bridgeDeckMat);
  rampNorth.position.set(bridgeX, (bridgeDeckY + 0.32) / 2 - 0.1, -142.5);
  rampNorth.receiveShadow = true;
  bridgeGroup.add(rampNorth);

  // North Ramp Retaining Side Walls
  for (const side of [-1, 1]) {
    const wallGeo = new THREE.BoxGeometry(0.8, 1.8, rampNorthLen);
    wallGeo.rotateX(rampNorthAngle);
    const wall = new THREE.Mesh(wallGeo, pierMat);
    wall.position.set(bridgeX + side * (bridgeDeckW / 2 + 0.4), (bridgeDeckY + 0.32) / 2 + 0.4, -142.5);
    bridgeGroup.add(wall);
  }

  group.add(bridgeGroup);
  disposables.push(bridgeDeckGeo, bridgeDeckMat, pierMat, trussMat);

  // 7. FULLY CONNECTED SOLID 3D ROAD NETWORK
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e2430, // Solid dark slate/charcoal asphalt
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

  // A. Jalukbari Rotary Roundabout (-135, 35, radius: 18)
  const jalukbariIslandGeo = new THREE.CylinderGeometry(9, 9, 0.5, 32);
  const jalukbariIsland = new THREE.Mesh(jalukbariIslandGeo, rotaryIslandMat);
  jalukbariIsland.position.set(-135, 0.25, 35);
  jalukbariIsland.receiveShadow = true;
  group.add(jalukbariIsland);

  const rotaryMonGeo = new THREE.CylinderGeometry(0.8, 1.4, 4.2, 8);
  const rotaryMon = new THREE.Mesh(rotaryMonGeo, rotaryMonMat);
  rotaryMon.position.set(-135, 2.6, 35);
  group.add(rotaryMon);
  disposables.push(jalukbariIslandGeo, rotaryMonGeo);

  // B. Dispur Secretariat Roundabout (165, 140, radius: 16)
  const dispurIslandGeo = new THREE.CylinderGeometry(7.5, 7.5, 0.5, 32);
  const dispurIsland = new THREE.Mesh(dispurIslandGeo, rotaryIslandMat);
  dispurIsland.position.set(165, 0.25, 140);
  dispurIsland.receiveShadow = true;
  group.add(dispurIsland);
  disposables.push(dispurIslandGeo);

  // C. Khanapara Gateway Rotary (240, 180, radius: 14)
  const khanaparaIslandGeo = new THREE.CylinderGeometry(6.5, 6.5, 0.5, 28);
  const khanaparaIsland = new THREE.Mesh(khanaparaIslandGeo, rotaryIslandMat);
  khanaparaIsland.position.set(240, 0.25, 180);
  khanaparaIsland.receiveShadow = true;
  group.add(khanaparaIsland);
  disposables.push(khanaparaIslandGeo);

  // Build physical 3D roads with concrete sidewalks & clean white dashed centerlines
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8, // Paved light concrete sidewalk
    roughness: 0.78,
  });
  const whiteStripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const whiteDashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  disposables.push(sidewalkMat, whiteStripeMat, whiteDashMat);

  for (const r of roads) {
    const dx = r.x2 - r.x1;
    const dz = r.z2 - r.z1;
    const len = Math.hypot(dx, dz);
    if (len < 1.0) continue;
    const angle = Math.atan2(dx, dz);
    const midX = (r.x1 + r.x2) / 2;
    const midZ = (r.z1 + r.z2) / 2;

    // 1. Solid Dark Asphalt Road Bed (Y = 0.16)
    const roadGeo = new THREE.BoxGeometry(r.width, 0.32, len);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(midX, 0.16, midZ);
    roadMesh.rotation.y = angle;
    roadMesh.receiveShadow = true;
    group.add(roadMesh);
    disposables.push(roadGeo);

    // 2. Safe Junction Insets
    const startJunction = junctionMap.get(`${r.x1.toFixed(1)},${r.z1.toFixed(1)}`);
    const endJunction = junctionMap.get(`${r.x2.toFixed(1)},${r.z2.toFixed(1)}`);
    const startInset = Math.max(r.width * 0.65, startJunction ? startJunction.maxRadius * 1.05 : 0);
    const endInset = Math.max(r.width * 0.65, endJunction ? endJunction.maxRadius * 1.05 : 0);
    const curbLen = len - startInset - endInset;

    // 3. Continuous Paved Sidewalk Curbs framing BOTH sides of EVERY road
    if (curbLen > 2.5) {
      const startParam = startInset / len;
      const endParam = 1.0 - endInset / len;
      const midParam = (startParam + endParam) / 2;
      const curbCenterX = r.x1 + dx * midParam;
      const curbCenterZ = r.z1 + dz * midParam;

      const curbW = 1.0;
      const curbH = 0.22;
      const isMajorBoulevard =
        r.width >= 9.0 ||
        r.name.includes("GS Road") ||
        r.name.includes("MG Road") ||
        r.name.includes("Zoo Road") ||
        r.name.includes("Highway");

      let currentCurbMat = sidewalkMat;
      if (isMajorBoulevard) {
        const curbTex = createStripedCurbTexture();
        curbTex.repeat.set(1, Math.max(2, Math.round(curbLen / 2.5)));
        currentCurbMat = new THREE.MeshStandardMaterial({
          map: curbTex,
          roughness: 0.8,
          metalness: 0.08,
        });
        disposables.push(currentCurbMat, curbTex);
      }

      for (const side of [-1, 1]) {
        const curbGeo = new THREE.BoxGeometry(curbW, curbH, curbLen);
        const curbMesh = new THREE.Mesh(curbGeo, currentCurbMat);
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

    const isArterialMarked =
      r.width >= 8.5 ||
      r.name.includes("GS Road") ||
      r.name.includes("MG Road") ||
      r.name.includes("Zoo Road") ||
      r.name.includes("Highway") ||
      r.name.includes("AT Road") ||
      r.name.includes("VIP Road");

    // 4. Clean White Road Shoulder Stripes (Only on major arterials & boulevards)
    if (curbLen > 4.0 && isArterialMarked) {
      const startParam = startInset / len;
      const endParam = 1.0 - endInset / len;
      const midParam = (startParam + endParam) / 2;
      const stripeCenterX = r.x1 + dx * midParam;
      const stripeCenterZ = r.z1 + dz * midParam;
      const stripeW = 0.20;

      for (const side of [-1, 1]) {
        const stripeGeo = new THREE.BoxGeometry(stripeW, 0.015, curbLen);
        const stripeMesh = new THREE.Mesh(stripeGeo, whiteStripeMat);
        const perpDist = (r.width / 2 - stripeW * 1.2) * side;
        const perpX = Math.cos(angle) * perpDist;
        const perpZ = -Math.sin(angle) * perpDist;
        stripeMesh.position.set(stripeCenterX + perpX, 0.328, stripeCenterZ + perpZ);
        stripeMesh.rotation.y = angle;
        group.add(stripeMesh);
        disposables.push(stripeGeo);
      }
    }

    // 5. Clean, Thin White Dashed Centerlines (Matching indiaagain.live)
    if (len >= 16.0 && isArterialMarked) {
      const dashW = 0.22;
      const dashLen = 2.2;
      const gapLen = 2.2;
      const period = dashLen + gapLen;
      const numDashes = Math.floor(len / period);
      const minInset = Math.max(r.width * 0.9, 7.0);
      const minParam = minInset / len;
      const maxParam = 1.0 - minInset / len;

      for (let d = 0; d < numDashes; d++) {
        const tCenter = ((d + 0.5) * period) / len;
        if (tCenter < minParam || tCenter > maxParam) continue;
        const posX = r.x1 + dx * tCenter;
        const posZ = r.z1 + dz * tCenter;

        const dashGeo = new THREE.BoxGeometry(dashW, 0.015, dashLen);
        const dashMesh = new THREE.Mesh(dashGeo, whiteDashMat);
        dashMesh.position.set(posX, 0.328, posZ);
        dashMesh.rotation.y = angle;
        group.add(dashMesh);
        disposables.push(dashGeo);
      }
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
    const isEmptyPlot = !p.business && !isConstruction && !p.isResidential;

    const plotResult = buildCartoonStorefrontPlot(
      p.business,
      idx,
      p.isLeft,
      p.x,
      p.z,
      isConstruction,
      isEmptyPlot,
      p.rotationY,
      Boolean(p.isResidential)
    );

    plotResult.mesh.position.y = 0.32;
    plotResult.hitBox.position.y = 0.32;

    group.add(plotResult.mesh);
    group.add(plotResult.hitBox);

    hitBoxes.push(plotResult.hitBox);
    plots.push(plotResult);

    // Floating Verified Business Beacon Banner (Only on active registered businesses like Nerqiva Studio)
    if (p.business) {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 400, 120);

      ctx.beginPath();
      ctx.roundRect(8, 8, 384, 104, 24);
      ctx.fillStyle = "rgba(10, 15, 29, 0.94)";
      ctx.fill();
      ctx.lineWidth = 3.0;
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();

      const title = p.business.name;
      ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(title, 24, 48);

      const subtitle = `★ 4.9 · PIN ${p.pincode} · ${p.business.category_id || "Studio"}`;
      ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(subtitle, 24, 88);

      const badgeTex = new THREE.CanvasTexture(canvas);
      badgeTex.colorSpace = THREE.SRGBColorSpace;
      const badgeMat = new THREE.SpriteMaterial({
        map: badgeTex,
        transparent: true,
        depthWrite: false,
      });
      const badgeSprite = new THREE.Sprite(badgeMat);
      badgeSprite.position.set(p.x, 9.5, p.z);
      badgeSprite.scale.set(12, 3.6, 1);
      group.add(badgeSprite);

      disposables.push(badgeTex, badgeMat);
    }
  });

  // 9. INSTANCED PROCEDURAL FLORA (Natural Low-Poly Trees Clustered across Riverfront, Parks & Open Valley)
  const totalTrees = 800;
  const treeGeo = new THREE.ConeGeometry(2.4, 6.2, 7);
  treeGeo.translate(0, 3.1, 0);

  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x166534, // Lush Assam deep forest green
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });
  disposables.push(treeGeo, treeMat);

  const treeInst = new THREE.InstancedMesh(treeGeo, treeMat, totalTrees);

  const treeDummy = new THREE.Object3D();
  let tIdx = 0;

  const isTreeClear = (tx: number, tz: number) => {
    for (const p of plotPlacements) {
      if (Math.hypot(tx - p.x, tz - p.z) < 18) return false;
    }
    if (Math.hypot(tx - -85, tz - 85) < 32) return false; // Keep cricket outfield clear
    for (const rd of roads) {
      const dx = rd.x2 - rd.x1;
      const dz = rd.z2 - rd.z1;
      const lenSq = dx * dx + dz * dz;
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((tx - rd.x1) * dx + (tz - rd.z1) * dz) / lenSq));
      const px = rd.x1 + t * dx;
      const pz = rd.z1 + t * dz;
      if (Math.hypot(tx - px, tz - pz) < rd.width / 2 + 3.8) return false;
    }
    return true;
  };

  // A. North Bank Distant Horizon Groves (280 trees)
  for (const nh of northHillsDef) {
    for (let a = 0; a < Math.PI * 2 && tIdx < 280; a += 0.25) {
      const r = nh.r * (0.45 + (Math.sin(a * 3) + 1) * 0.25);
      const tx = nh.cx + Math.cos(a) * r;
      const tz = nh.cz + Math.sin(a) * r;
      if (!isTreeClear(tx, tz)) continue;
      const hillDist = Math.hypot(tx - nh.cx, tz - nh.cz);
      const hillY = Math.max(0, (1 - hillDist / nh.r) * nh.h * 0.75);
      treeDummy.position.set(tx, hillY, tz);
      const s = 1.2 + Math.sin(tIdx * 1.3) * 0.4;
      treeDummy.scale.set(s, s * 1.3, s);
      treeDummy.rotation.y = tIdx * 1.2;
      treeDummy.updateMatrix();
      treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
    }
  }

  // B. Western Valley Park Groves (160 trees)
  for (let a = 0; a < Math.PI * 2 && tIdx < 440; a += 0.08) {
    const r = 16 + (Math.sin(a * 4) + 1) * 20;
    const tx = -88 + Math.cos(a) * r;
    const tz = 8 + Math.sin(a) * r;
    if (!isTreeClear(tx, tz)) continue;
    treeDummy.position.set(tx, 0.05, tz);
    const s = 1.1 + Math.sin(tIdx) * 0.35;
    treeDummy.scale.set(s, s * 1.35, s);
    treeDummy.rotation.y = tIdx * 1.2;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // C. Central Green Belt Groves (140 trees)
  for (let a = 0; a < Math.PI * 2 && tIdx < 580; a += 0.09) {
    const r = 10 + (Math.cos(a * 3) + 1) * 18;
    const tx = 75 + Math.cos(a) * r;
    const tz = 25 + Math.sin(a) * r;
    if (!isTreeClear(tx, tz)) continue;
    treeDummy.position.set(tx, 0.05, tz);
    const s = 1.0 + Math.sin(tIdx * 1.4) * 0.3;
    treeDummy.scale.set(s, s * 1.3, s);
    treeDummy.rotation.y = tIdx * 1.4;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // D. Brahmaputra Riverfront Park along MG Road (180 trees)
  for (let rx = -240; rx <= 240 && tIdx < 760; rx += 3.8) {
    if (Math.abs(rx - -130) < 18) continue; // Skip Saraighat bridge
    const rz = getRiverSouthBankZ(rx) + 6.0;
    if (!isTreeClear(rx, rz)) continue;
    treeDummy.position.set(rx, 0.32, rz);
    const s = 1.2 + Math.cos(tIdx * 1.8) * 0.35;
    treeDummy.scale.set(s, s * 1.35, s);
    treeDummy.rotation.y = tIdx * 1.5;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // E. Dighalipukhuri & Silpukhuri Heritage Promenades (140 trees)
  for (let lx = 35; lx <= 95 && tIdx < 840; lx += 3.8) {
    for (const lz of [-24, 4]) {
      if (!isTreeClear(lx, lz)) continue;
      treeDummy.position.set(lx, 0.32, lz);
      const s = 0.95 + Math.sin(tIdx * 2.1) * 0.25;
      treeDummy.scale.set(s, s * 1.2, s);
      treeDummy.rotation.y = tIdx * 1.1;
      treeDummy.updateMatrix();
      treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
    }
  }
  for (let sx = 130; sx <= 170 && tIdx < 900; sx += 4) {
    for (const sz of [-28, -2]) {
      if (!isTreeClear(sx, sz)) continue;
      treeDummy.position.set(sx, 0.32, sz);
      const s = 0.95 + Math.cos(tIdx * 1.7) * 0.25;
      treeDummy.scale.set(s, s * 1.2, s);
      treeDummy.rotation.y = tIdx * 1.3;
      treeDummy.updateMatrix();
      treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
    }
  }

  // F. Deepor Beel Eco Wetland Shore (120 trees)
  for (let a = 0; a < Math.PI * 2 && tIdx < 1020; a += 0.12) {
    const r = 58 + (Math.sin(a * 5) + 1) * 8;
    const tx = -190 + Math.cos(a) * r * 1.2;
    const tz = 125 + Math.sin(a) * r * 0.65;
    if (!isTreeClear(tx, tz)) continue;
    treeDummy.position.set(tx, 0.32, tz);
    const s = 1.05 + Math.sin(tIdx * 1.9) * 0.3;
    treeDummy.scale.set(s, s * 1.25, s);
    treeDummy.rotation.y = tIdx * 1.7;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // G. Southern Horizon Forest (Planted along Z > 220, flush at ground Y = 0.05)
  for (let sx = -180; sx <= 260 && tIdx < totalTrees; sx += 12) {
    const tz = 230 + (Math.sin(sx * 0.04) + 1) * 15;
    if (!isTreeClear(sx, tz)) continue;
    treeDummy.position.set(sx, 0.05, tz);
    const s = 1.25 + Math.sin(tIdx * 1.1) * 0.35;
    treeDummy.scale.set(s, s * 1.4, s);
    treeDummy.rotation.y = tIdx * 1.8;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  // H. Eastern Hengrabari Reserve Forest Dense Canopy (Matching Image 1 & 2)
  for (let f = 0; f < 220 && tIdx < totalTrees; f++) {
    const fx = 180 + Math.sin(f * 2.3) * 36;
    const fz = 45 + Math.cos(f * 3.7) * 38;
    if (!isTreeClear(fx, fz)) continue;
    const s = 1.05 + (f % 5) * 0.12;
    treeDummy.position.set(fx, 0.32, fz);
    treeDummy.scale.set(s, s * 1.35, s);
    treeDummy.rotation.y = f * 1.1;
    treeDummy.updateMatrix();
    treeInst.setMatrixAt(tIdx++, treeDummy.matrix);
  }

  treeInst.count = tIdx;
  treeInst.instanceMatrix.needsUpdate = true;
  treeInst.castShadow = true;
  treeInst.receiveShadow = true;
  group.add(treeInst);
  disposables.push(treeInst);

  // 10. CALIBRATED REALISTIC TRAFFIC (Auto, City Bus, ASTC Bus, Hatchback, Van, Saraighat Bridge Transit)
  interface VehicleEntry {
    mesh: THREE.Group;
    waypoints: [number, number, number][];
    currentWp: number;
    t: number;
    speed: number;
  }

  const vehicles: VehicleEntry[] = [];

  const buildAuto = () => {
    const v = new THREE.Group();
    const yellowRoof = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.3, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xfacc15 })
    );
    yellowRoof.position.y = 1.4;
    v.add(yellowRoof);
    const greenBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x15803d })
    );
    greenBody.position.y = 0.5;
    v.add(greenBody);
    return v;
  };

  const buildBus = (colorHex: number = 0xb91c1c) => {
    const v = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.2, 7.8),
      new THREE.MeshStandardMaterial({ color: colorHex })
    );
    body.position.y = 1.5;
    v.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.25, 7.6),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    roof.position.y = 2.7;
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
    speed: 5.2,
  });

  // Vehicle 2: Red Hatchback on GS Road (Paltan Bazar -> Christian Basti -> Ganeshguri -> Dispur -> Khanapara)
  const redCar = buildCar(0xef4444);
  group.add(redCar);
  vehicles.push({
    mesh: redCar,
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
    t: 0.3,
    speed: 6.8,
  });

  // Vehicle 3: City Bus crossing Saraighat Bridge between South (Jalukbari) and North Highway (Amingaon)
  const bridgeBus = buildBus(0xb91c1c);
  group.add(bridgeBus);
  vehicles.push({
    mesh: bridgeBus,
    waypoints: [
      [-130, 0.32, 45],     // Jalukbari Rotary
      [-130, 0.32, -8],     // Saraighat South Approach Road
      [-130, 2.56, -14],    // South Ramp climbing to bridge deck
      [-130, 4.8, -20],     // South Portal Pier
      [-130, 4.8, -84],     // Mid-Span over Brahmaputra River
      [-130, 4.8, -148],    // North Portal Pier
      [-130, 2.56, -158],   // North Ramp descending to ground
      [-130, 0.32, -168],   // North Highway Junction
      [0, 0.32, -168],      // North Highway Amingaon
      [-130, 0.32, -168],   // Return to North Highway Junction
      [-130, 2.56, -158],   // Ramp up
      [-130, 4.8, -148],    // North Portal
      [-130, 4.8, -84],     // Mid-Span
      [-130, 4.8, -20],     // South Portal
      [-130, 2.56, -14],    // South Ramp down
      [-130, 0.32, -8],     // South Approach Road
      [-130, 0.32, 45],     // Jalukbari Rotary
    ],
    currentWp: 0,
    t: 0.2,
    speed: 4.8,
  });

  // Vehicle 4: Green ASTC Bus on Zoo Road (Chandmari -> State Zoo -> Ganeshguri)
  const greenBus = buildBus(0x15803d);
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
