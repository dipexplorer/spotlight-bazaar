export interface IndiaPlaceEntry {
  id: string;
  name: string;
  subtitle: string;
  kind: "state" | "city" | "area";
  lat: number;
  lon: number;
  zoom: number;
  aliases?: string[];
}

/**
 * Lightweight instant (0ms) index of Indian States, Union Territories, and major cities.
 * Paired with /api/geo/search (Nominatim countrycodes=in) for any 6-digit PIN code or locality.
 */
export const INDIA_PLACES_INDEX: IndiaPlaceEntry[] = [
  // Featured Launch Region & Northeast
  { id: "city-guwahati", name: "Guwahati", subtitle: "Assam · Live Hub", kind: "city", lat: 26.1833, lon: 91.7462, zoom: 12.5, aliases: ["gauhati", "781001", "781030"] },
  { id: "area-north-guwahati", name: "North Guwahati", subtitle: "Guwahati, Assam · PIN 781030", kind: "area", lat: 26.20624, lon: 91.72925, zoom: 15.6, aliases: ["781030", "iit guwahati", "amingaon"] },
  { id: "city-shillong", name: "Shillong", subtitle: "Meghalaya", kind: "city", lat: 25.5788, lon: 91.8933, zoom: 12.5 },
  { id: "city-dibrugarh", name: "Dibrugarh", subtitle: "Assam", kind: "city", lat: 27.4728, lon: 94.912, zoom: 12.5 },
  { id: "city-silchar", name: "Silchar", subtitle: "Assam", kind: "city", lat: 24.8333, lon: 92.7789, zoom: 12.5 },
  { id: "city-jorhat", name: "Jorhat", subtitle: "Assam", kind: "city", lat: 26.7509, lon: 94.2037, zoom: 12.5 },
  { id: "city-agartala", name: "Agartala", subtitle: "Tripura", kind: "city", lat: 23.8315, lon: 91.2868, zoom: 12.5 },
  { id: "city-imphal", name: "Imphal", subtitle: "Manipur", kind: "city", lat: 24.817, lon: 93.9368, zoom: 12.5 },
  { id: "city-gangtok", name: "Gangtok", subtitle: "Sikkim", kind: "city", lat: 27.3389, lon: 88.6065, zoom: 12.8 },

  // Major Indian Metros & Tier-1/2 Cities
  { id: "city-mumbai", name: "Mumbai", subtitle: "Maharashtra", kind: "city", lat: 19.076, lon: 72.8777, zoom: 11.8, aliases: ["bombay"] },
  { id: "city-delhi", name: "New Delhi", subtitle: "Delhi NCR", kind: "city", lat: 28.6139, lon: 77.209, zoom: 11.8, aliases: ["delhi", "ncr"] },
  { id: "city-bengaluru", name: "Bengaluru", subtitle: "Karnataka", kind: "city", lat: 12.9716, lon: 77.5946, zoom: 11.8, aliases: ["bangalore", "blr"] },
  { id: "city-hyderabad", name: "Hyderabad", subtitle: "Telangana", kind: "city", lat: 17.385, lon: 78.4867, zoom: 11.8 },
  { id: "city-chennai", name: "Chennai", subtitle: "Tamil Nadu", kind: "city", lat: 13.0827, lon: 80.2707, zoom: 11.8, aliases: ["madras"] },
  { id: "city-kolkata", name: "Kolkata", subtitle: "West Bengal", kind: "city", lat: 22.5726, lon: 88.3639, zoom: 11.8, aliases: ["calcutta"] },
  { id: "city-pune", name: "Pune", subtitle: "Maharashtra", kind: "city", lat: 18.5204, lon: 73.8567, zoom: 12.0 },
  { id: "city-ahmedabad", name: "Ahmedabad", subtitle: "Gujarat", kind: "city", lat: 23.0225, lon: 72.5714, zoom: 12.0 },
  { id: "city-jaipur", name: "Jaipur", subtitle: "Rajasthan", kind: "city", lat: 26.9124, lon: 75.7873, zoom: 12.2 },
  { id: "city-lucknow", name: "Lucknow", subtitle: "Uttar Pradesh", kind: "city", lat: 26.8467, lon: 80.9462, zoom: 12.2 },
  { id: "city-kochi", name: "Kochi", subtitle: "Kerala", kind: "city", lat: 9.9312, lon: 76.2673, zoom: 12.2, aliases: ["cochin"] },
  { id: "city-chandigarh", name: "Chandigarh", subtitle: "Union Territory", kind: "city", lat: 30.7333, lon: 76.7794, zoom: 12.5 },
  { id: "city-indore", name: "Indore", subtitle: "Madhya Pradesh", kind: "city", lat: 22.7196, lon: 75.8577, zoom: 12.2 },
  { id: "city-patna", name: "Patna", subtitle: "Bihar", kind: "city", lat: 25.5941, lon: 85.1376, zoom: 12.2 },
  { id: "city-bhubaneswar", name: "Bhubaneswar", subtitle: "Odisha", kind: "city", lat: 20.2961, lon: 85.8245, zoom: 12.2 },
  { id: "city-surat", name: "Surat", subtitle: "Gujarat", kind: "city", lat: 21.1702, lon: 72.8311, zoom: 12.2 },
  { id: "city-nagpur", name: "Nagpur", subtitle: "Maharashtra", kind: "city", lat: 21.1458, lon: 79.0882, zoom: 12.2 },
  { id: "city-bhopal", name: "Bhopal", subtitle: "Madhya Pradesh", kind: "city", lat: 23.2599, lon: 77.4126, zoom: 12.2 },
  { id: "city-srinagar", name: "Srinagar", subtitle: "Jammu & Kashmir", kind: "city", lat: 34.0837, lon: 74.7973, zoom: 12.2 },
  { id: "city-leh", name: "Leh", subtitle: "Ladakh", kind: "city", lat: 34.1526, lon: 77.5771, zoom: 12.2 },
  { id: "city-dehradun", name: "Dehradun", subtitle: "Uttarakhand", kind: "city", lat: 30.3165, lon: 78.0322, zoom: 12.4 },
  { id: "city-siliguri", name: "Siliguri", subtitle: "West Bengal", kind: "city", lat: 26.7271, lon: 88.3953, zoom: 12.5 },
  { id: "city-noida", name: "Noida", subtitle: "Uttar Pradesh · NCR", kind: "city", lat: 28.5355, lon: 77.391, zoom: 12.4 },
  { id: "city-gurugram", name: "Gurugram", subtitle: "Haryana · NCR", kind: "city", lat: 28.4595, lon: 77.0266, zoom: 12.4, aliases: ["gurgaon"] },
  { id: "city-visakhapatnam", name: "Visakhapatnam", subtitle: "Andhra Pradesh", kind: "city", lat: 17.6868, lon: 83.2185, zoom: 12.2, aliases: ["vizag"] },
  { id: "city-coimbatore", name: "Coimbatore", subtitle: "Tamil Nadu", kind: "city", lat: 11.0168, lon: 76.9558, zoom: 12.2 },

  // All 28 Indian States + Union Territories
  { id: "state-assam", name: "Assam", subtitle: "State · India", kind: "state", lat: 26.2006, lon: 92.9376, zoom: 7.4 },
  { id: "state-arunachal", name: "Arunachal Pradesh", subtitle: "State · India", kind: "state", lat: 28.218, lon: 94.7278, zoom: 7.2 },
  { id: "state-andhra", name: "Andhra Pradesh", subtitle: "State · India", kind: "state", lat: 15.9129, lon: 79.74, zoom: 6.8 },
  { id: "state-bihar", name: "Bihar", subtitle: "State · India", kind: "state", lat: 25.0961, lon: 85.3131, zoom: 7.2 },
  { id: "state-chhattisgarh", name: "Chhattisgarh", subtitle: "State · India", kind: "state", lat: 21.2787, lon: 81.8661, zoom: 7.0 },
  { id: "state-goa", name: "Goa", subtitle: "State · India", kind: "state", lat: 15.2993, lon: 74.124, zoom: 9.5 },
  { id: "state-gujarat", name: "Gujarat", subtitle: "State · India", kind: "state", lat: 22.2587, lon: 71.1924, zoom: 6.8 },
  { id: "state-haryana", name: "Haryana", subtitle: "State · India", kind: "state", lat: 29.0588, lon: 76.0856, zoom: 7.6 },
  { id: "state-himachal", name: "Himachal Pradesh", subtitle: "State · India", kind: "state", lat: 31.1048, lon: 77.1734, zoom: 7.5 },
  { id: "state-jharkhand", name: "Jharkhand", subtitle: "State · India", kind: "state", lat: 23.6102, lon: 85.2799, zoom: 7.4 },
  { id: "state-karnataka", name: "Karnataka", subtitle: "State · India", kind: "state", lat: 15.3173, lon: 75.7139, zoom: 6.8 },
  { id: "state-kerala", name: "Kerala", subtitle: "State · India", kind: "state", lat: 10.8505, lon: 76.2711, zoom: 7.5 },
  { id: "state-mp", name: "Madhya Pradesh", subtitle: "State · India", kind: "state", lat: 22.9734, lon: 78.6569, zoom: 6.6 },
  { id: "state-maharashtra", name: "Maharashtra", subtitle: "State · India", kind: "state", lat: 19.7515, lon: 75.7139, zoom: 6.6 },
  { id: "state-manipur", name: "Manipur", subtitle: "State · India", kind: "state", lat: 24.6637, lon: 93.9063, zoom: 8.2 },
  { id: "state-meghalaya", name: "Meghalaya", subtitle: "State · India", kind: "state", lat: 25.467, lon: 91.3662, zoom: 8.2 },
  { id: "state-mizoram", name: "Mizoram", subtitle: "State · India", kind: "state", lat: 23.1645, lon: 92.9376, zoom: 8.2 },
  { id: "state-nagaland", name: "Nagaland", subtitle: "State · India", kind: "state", lat: 26.1584, lon: 94.5624, zoom: 8.2 },
  { id: "state-odisha", name: "Odisha", subtitle: "State · India", kind: "state", lat: 20.9517, lon: 85.0985, zoom: 7.0, aliases: ["orissa"] },
  { id: "state-punjab", name: "Punjab", subtitle: "State · India", kind: "state", lat: 31.1471, lon: 75.3412, zoom: 7.6 },
  { id: "state-rajasthan", name: "Rajasthan", subtitle: "State · India", kind: "state", lat: 27.0238, lon: 74.2179, zoom: 6.4 },
  { id: "state-sikkim", name: "Sikkim", subtitle: "State · India", kind: "state", lat: 27.533, lon: 88.5122, zoom: 8.8 },
  { id: "state-tamilnadu", name: "Tamil Nadu", subtitle: "State · India", kind: "state", lat: 11.1271, lon: 78.6569, zoom: 6.9 },
  { id: "state-telangana", name: "Telangana", subtitle: "State · India", kind: "state", lat: 18.1124, lon: 79.0193, zoom: 7.2 },
  { id: "state-tripura", name: "Tripura", subtitle: "State · India", kind: "state", lat: 23.9408, lon: 91.9882, zoom: 8.4 },
  { id: "state-up", name: "Uttar Pradesh", subtitle: "State · India", kind: "state", lat: 26.8467, lon: 80.9462, zoom: 6.6, aliases: ["up"] },
  { id: "state-uttarakhand", name: "Uttarakhand", subtitle: "State · India", kind: "state", lat: 30.0668, lon: 79.0193, zoom: 7.6 },
  { id: "state-wb", name: "West Bengal", subtitle: "State · India", kind: "state", lat: 22.9868, lon: 87.855, zoom: 7.0 },
  { id: "ut-jk", name: "Jammu & Kashmir", subtitle: "Union Territory · India", kind: "state", lat: 33.7782, lon: 76.5762, zoom: 7.2, aliases: ["kashmir", "jammu", "j&k"] },
  { id: "ut-ladakh", name: "Ladakh", subtitle: "Union Territory · India", kind: "state", lat: 34.2268, lon: 77.5619, zoom: 7.0 },
  { id: "ut-andaman", name: "Andaman & Nicobar", subtitle: "Union Territory · India", kind: "state", lat: 11.7401, lon: 92.6586, zoom: 7.6 },
  { id: "ut-lakshadweep", name: "Lakshadweep", subtitle: "Union Territory · India", kind: "state", lat: 10.5667, lon: 72.6417, zoom: 8.4 },
  { id: "ut-puducherry", name: "Puducherry", subtitle: "Union Territory · India", kind: "city", lat: 11.9416, lon: 79.8083, zoom: 12.2, aliases: ["pondicherry"] },
];

export function searchLocalIndiaPlaces(query: string): IndiaPlaceEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return INDIA_PLACES_INDEX.filter((p) => {
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.subtitle.toLowerCase().includes(q)) return true;
    if (p.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
    return false;
  }).slice(0, 6);
}

