import { NextRequest, NextResponse } from "next/server";

export interface GeoSearchItem {
  id: string;
  name: string;
  subtitle: string;
  kind: "pincode" | "state" | "city" | "area";
  lat: number;
  lon: number;
  zoom: number;
}

const searchCache = new Map<string, { ts: number; results: GeoSearchItem[] }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const USER_AGENT = "SpotlightBazaar/1.0 (https://github.com/dipexplorer/spotlight-bazaar)";

async function fetchJsonWithTimeout(url: string, timeoutMs = 3500): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function inferPhotonKindAndZoom(props: any): { kind: GeoSearchItem["kind"]; zoom: number } {
  const t = String(props.type || "").toLowerCase();
  const val = String(props.osm_value || "").toLowerCase();
  if (t === "state" || val === "state") return { kind: "state", zoom: 6.9 };
  if (t === "city" || val === "city" || val === "town" || t === "county" || t === "district") {
    return { kind: "city", zoom: 12.2 };
  }
  if (t === "street" || t === "house" || props.osm_key === "highway") {
    return { kind: "area", zoom: 16.0 };
  }
  return { kind: "area", zoom: 14.8 };
}

function inferNominatimKindAndZoom(item: any, isPinQuery: boolean): { kind: GeoSearchItem["kind"]; zoom: number } {
  const addrType = String(item.addresstype || item.type || "").toLowerCase();
  if (isPinQuery || addrType === "postcode") return { kind: "pincode", zoom: 14.8 };
  if (addrType === "state" || addrType === "region") return { kind: "state", zoom: 6.9 };
  if (addrType === "city" || addrType === "town" || addrType === "municipality" || addrType === "state_district") {
    return { kind: "city", zoom: 12.2 };
  }
  if (addrType === "road" || addrType === "residential" || addrType === "building") {
    return { kind: "area", zoom: 16.0 };
  }
  return { kind: "area", zoom: 14.8 };
}

async function queryPhotonIndia(query: string, limit = 6): Promise<GeoSearchItem[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=68.0,6.5,97.5,37.5&limit=${limit}&lang=en`;
  const data = await fetchJsonWithTimeout(url, 3200);
  const features = Array.isArray(data?.features) ? data.features : [];

  const items: GeoSearchItem[] = [];
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const props = f?.properties || {};
    const coords = f?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    // Strictly restrict to India
    const cc = String(props.countrycode || "").toUpperCase();
    const country = String(props.country || "").toLowerCase();
    if (cc !== "IN" && country !== "india") continue;

    const [lon, lat] = coords;
    const { kind, zoom } = inferPhotonKindAndZoom(props);
    const primary = props.name || props.street || props.locality || props.city || props.district || props.state;
    if (!primary) continue;

    const subParts = [
      props.locality,
      props.district && props.district !== props.city ? props.district : null,
      props.city,
      props.county,
      props.state,
      props.postcode ? `PIN ${props.postcode}` : null,
    ].filter((p, idx, arr) => Boolean(p) && p !== primary && arr.indexOf(p) === idx);

    items.push({
      id: `photon-${props.osm_type || "n"}-${props.osm_id || i}`,
      name: primary,
      subtitle: subParts.slice(0, 3).join(", ") || "India",
      kind,
      lat: Number(lat),
      lon: Number(lon),
      zoom,
    });
  }
  return items;
}

async function queryNominatimIndia(query: string, isPinQuery = false, limit = 5): Promise<GeoSearchItem[]> {
  const url = isPinQuery
    ? `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(query)}&countrycodes=in&format=json&addressdetails=1&limit=${limit}`
    : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&addressdetails=1&limit=${limit}`;

  const raw = await fetchJsonWithTimeout(url, 3500);
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item?.lat && item?.lon)
    .map((item, idx) => {
      const { kind, zoom } = inferNominatimKindAndZoom(item, isPinQuery);
      const addr = item.address || {};
      const primary =
        (isPinQuery ? `PIN ${query}` : null) ||
        item.name ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.city ||
        addr.town ||
        addr.village ||
        addr.state ||
        query;

      const parts = [
        addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.village || addr.state_district,
        addr.state,
        addr.postcode && !isPinQuery ? `PIN ${addr.postcode}` : null,
      ].filter((p, i, arr) => Boolean(p) && p !== primary && arr.indexOf(p) === i);

      return {
        id: `osm-${item.place_id || idx}`,
        name: primary,
        subtitle: parts.slice(0, 3).join(", ") || "India",
        kind,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        zoom,
      };
    });
}

async function resolveIndianPincode(pin: string): Promise<GeoSearchItem[]> {
  const [indiaPostData, nomResults] = await Promise.all([
    fetchJsonWithTimeout(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`, 3200),
    queryNominatimIndia(pin, true, 3),
  ]);

  const postOffices: any[] =
    Array.isArray(indiaPostData) && indiaPostData[0]?.Status === "Success" && Array.isArray(indiaPostData[0]?.PostOffice)
      ? indiaPostData[0].PostOffice
      : [];

  // Case 1: Nominatim already returned exact coordinates for this PIN
  if (nomResults.length > 0) {
    if (postOffices.length > 0) {
      const po = postOffices[0];
      const poNames = postOffices.slice(0, 2).map((p) => p.Name).join(", ");
      const enrichedSub = [poNames, po.District, po.State].filter(Boolean).join(" · ");
      return [
        {
          ...nomResults[0],
          name: `PIN ${pin}`,
          subtitle: enrichedSub || nomResults[0].subtitle,
          kind: "pincode",
          zoom: 14.8,
        },
        ...nomResults.slice(1),
      ];
    }
    return nomResults;
  }

  // Case 2: India Post knows this PIN (covers all 155,000+ Indian PIN codes!) — geocode its exact Post Office / Block / District
  if (postOffices.length > 0) {
    const po = postOffices[0];
    const queriesToTry = [
      [po.Name, po.District, po.State].filter(Boolean).join(", "),
      [po.Block !== "NA" ? po.Block : null, po.District, po.State].filter(Boolean).join(", "),
      [po.District, po.State].filter(Boolean).join(", "),
    ].filter(Boolean);

    for (const geoQ of queriesToTry) {
      const photonHits = await queryPhotonIndia(geoQ, 2);
      const best = photonHits[0] || (await queryNominatimIndia(geoQ, false, 1))[0];
      if (best) {
        const poList = postOffices.slice(0, 3).map((p) => p.Name).join(", ");
        return [
          {
            id: `pin-${pin}`,
            name: `PIN ${pin} · ${po.Name}`,
            subtitle: [poList, po.District, po.State].filter(Boolean).join(" · "),
            kind: "pincode",
            lat: best.lat,
            lon: best.lon,
            zoom: 14.5,
          },
        ];
      }
    }
  }

  // Case 3: Fallback free-text search in case PIN exists as a substring in OSM
  return await queryPhotonIndia(`${pin} India`, 3);
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = q.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.results });
  }

  let results: GeoSearchItem[] = [];

  if (/^\d{6}$/.test(q)) {
    results = await resolveIndianPincode(q);
  } else {
    // Fast prefix autosuggest via Photon India + Nominatim fallback for exact localities
    const photonResults = await queryPhotonIndia(q, 7);
    results = photonResults;
    if (results.length < 3) {
      const nomResults = await queryNominatimIndia(q, false, 4);
      const seen = new Set(results.map((r) => `${r.name.toLowerCase()}|${r.subtitle.toLowerCase()}`));
      for (const nr of nomResults) {
        const k = `${nr.name.toLowerCase()}|${nr.subtitle.toLowerCase()}`;
        if (!seen.has(k)) {
          seen.add(k);
          results.push(nr);
        }
      }
    }
  }

  results = results.slice(0, 7);
  searchCache.set(cacheKey, { ts: Date.now(), results });
  return NextResponse.json({ results });
}
