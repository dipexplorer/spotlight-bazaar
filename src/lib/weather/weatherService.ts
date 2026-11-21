/**
 * Spotlight Bazaar - Real-Time Dynamic Regional Weather Engine
 * Connects Indian cities and 3D commercial plots to live meteorology via Open-Meteo API.
 * Includes graceful seasonal fallback if offline or network throttled.
 */

export interface WeatherTelemetry {
  cityName: string;
  temperature: number; // in Celsius
  apparentTemperature?: number;
  humidity: number; // percentage
  windSpeed: number; // km/h
  weatherCode: number; // WMO standard code
  conditionText: string;
  conditionIcon: "sun" | "moon" | "cloud" | "rain" | "fog" | "storm";
  isDay: boolean;
  isRaining: boolean;
  isFoggy: boolean;
  isOvercast: boolean;
  precipitation: number; // mm
  // Visual lighting parameters for MapLibre & Three.js
  visuals: {
    skyColor: string;
    horizonColor: string;
    fogColor: string;
    sunColor: number;
    sunIntensity: number;
    ambientColor: number;
    ambientIntensity: number;
  };
}

// In-memory 15-minute weather cache
const weatherCache = new Map<string, { data: WeatherTelemetry; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Maps WMO Weather Code to human descriptions and 3D lighting visuals
 */
export function interpretWmoCode(
  code: number,
  isDay: boolean,
  tempC: number
): Pick<WeatherTelemetry, "conditionText" | "conditionIcon" | "isRaining" | "isFoggy" | "isOvercast" | "visuals"> {
  // Clear sky
  if (code === 0 || code === 1) {
    if (!isDay) {
      return {
        conditionText: "Clear Night",
        conditionIcon: "moon",
        isRaining: false,
        isFoggy: false,
        isOvercast: false,
        visuals: {
          skyColor: "#010409",
          horizonColor: "#030c1b",
          fogColor: "#020814",
          sunColor: 0x38bdf8,
          sunIntensity: 0.85,
          ambientColor: 0x1e293b,
          ambientIntensity: 0.65,
        },
      };
    }
    return {
      conditionText: "Clear & Sunny",
      conditionIcon: "sun",
      isRaining: false,
      isFoggy: false,
      isOvercast: false,
      visuals: {
        skyColor: "#0a192f",
        horizonColor: "#1e3a8a",
        fogColor: "#0f2342",
        sunColor: 0xfff7ed,
        sunIntensity: 3.0,
        ambientColor: 0xdbeafe,
        ambientIntensity: 1.6,
      },
    };
  }

  // Partly cloudy / Overcast
  if (code === 2 || code === 3) {
    const isHeavyOvercast = code === 3;
    return {
      conditionText: isHeavyOvercast ? "Overcast" : "Partly Cloudy",
      conditionIcon: "cloud",
      isRaining: false,
      isFoggy: false,
      isOvercast: true,
      visuals: {
        skyColor: isDay ? (isHeavyOvercast ? "#1e293b" : "#172554") : "#090d16",
        horizonColor: isDay ? (isHeavyOvercast ? "#334155" : "#1e3a8a") : "#0f172a",
        fogColor: isDay ? (isHeavyOvercast ? "#1e293b" : "#0f2342") : "#050810",
        sunColor: isDay ? (isHeavyOvercast ? 0xcfd8dc : 0xffedd5) : 0x223249,
        sunIntensity: isDay ? (isHeavyOvercast ? 1.6 : 2.4) : 0.6,
        ambientColor: isDay ? (isHeavyOvercast ? 0x94a3b8 : 0xb0c4de) : 0x151f30,
        ambientIntensity: isDay ? 1.8 : 0.7,
      },
    };
  }

  // Fog & Winter Mist
  if (code === 45 || code === 48) {
    return {
      conditionText: "Misty Fog",
      conditionIcon: "fog",
      isRaining: false,
      isFoggy: true,
      isOvercast: true,
      visuals: {
        skyColor: isDay ? "#334155" : "#090d16",
        horizonColor: isDay ? "#475569" : "#1e293b",
        fogColor: isDay ? "#334155" : "#0f172a",
        sunColor: isDay ? 0xfef3c7 : 0x38bdf8,
        sunIntensity: isDay ? 1.3 : 0.5,
        ambientColor: isDay ? 0x94a3b8 : 0x1e293b,
        ambientIntensity: isDay ? 1.5 : 0.6,
      },
    };
  }

  // Drizzle / Rain / Showers
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    const isHeavy = code === 65 || code === 82;
    const isDrizzle = code >= 51 && code <= 55;
    const isShowers = code >= 80 && code <= 82;
    const conditionText = isHeavy ? "Heavy Rain" : isDrizzle ? "Light Drizzle" : isShowers ? "Passing Showers" : "Rain Showers";
    return {
      conditionText,
      conditionIcon: "rain",
      isRaining: true,
      isFoggy: true,
      isOvercast: true,
      visuals: {
        skyColor: isDay ? "#0f172a" : "#05070e",
        horizonColor: isDay ? "#1e293b" : "#0a0f1d",
        fogColor: isDay ? "#0f172a" : "#050811",
        sunColor: 0x64748b,
        sunIntensity: isDay ? 0.9 : 0.4,
        ambientColor: 0x334155,
        ambientIntensity: isDay ? 1.2 : 0.5,
      },
    };
  }

  // Thunderstorm
  if (code >= 95) {
    return {
      conditionText: "Thunderstorm",
      conditionIcon: "storm",
      isRaining: true,
      isFoggy: true,
      isOvercast: true,
      visuals: {
        skyColor: "#050810",
        horizonColor: "#0f172a",
        fogColor: "#05070e",
        sunColor: 0x475569,
        sunIntensity: 0.6,
        ambientColor: 0x1e293b,
        ambientIntensity: 0.9,
      },
    };
  }

  // Fallback
  return {
    conditionText: isDay ? "Fair" : "Clear Night",
    conditionIcon: isDay ? "sun" : "moon",
    isRaining: false,
    isFoggy: false,
    isOvercast: false,
    visuals: {
      skyColor: isDay ? "#0a192f" : "#010409",
      horizonColor: isDay ? "#1e3a8a" : "#030c1b",
      fogColor: isDay ? "#0f2342" : "#020814",
      sunColor: isDay ? 0xfff7ed : 0x38bdf8,
      sunIntensity: isDay ? 3.0 : 0.85,
      ambientColor: isDay ? 0xdbeafe : 0x1e293b,
      ambientIntensity: isDay ? 1.6 : 0.65,
    },
  };
}

/**
 * Deterministic seasonal climate calculation for offline or instantaneous fallback
 */
export function getSeasonalFallbackWeather(lat: number, lon: number, cityName: string): WeatherTelemetry {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan, 10 = Nov
  const hour = now.getHours();
  const isDay = hour >= 6 && hour < 18;

  // Approximate regional temperatures across India by latitude & season
  let baseTemp = 24;
  let code = 0; // Clear

  if (month >= 10 || month <= 1) {
    // Winter (Nov - Feb)
    if (lat > 25) {
      // North & Northeast India (Delhi, UP, Assam, Bihar)
      baseTemp = isDay ? 23 : 13;
      code = hour < 9 ? 45 : 1; // Morning mist or pleasant clear sun
    } else {
      // Peninsular India (Mumbai, Bengaluru, Chennai)
      baseTemp = isDay ? 29 : 21;
      code = 1;
    }
  } else if (month >= 5 && month <= 8) {
    // Monsoon (Jun - Sep)
    baseTemp = isDay ? 29 : 25;
    code = 61; // Rain
  } else {
    // Summer (Mar - May)
    baseTemp = isDay ? 34 : 26;
    code = 0;
  }

  const interpreted = interpretWmoCode(code, isDay, baseTemp);

  return {
    cityName,
    temperature: baseTemp,
    humidity: interpreted.isRaining ? 88 : interpreted.isFoggy ? 75 : 55,
    windSpeed: 8.5,
    weatherCode: code,
    precipitation: interpreted.isRaining ? 3.2 : 0,
    isDay,
    ...interpreted,
  };
}

/**
 * Fetch real-time live regional weather from Open-Meteo with caching and graceful fallback
 */
export async function fetchRegionalWeather(
  lat: number,
  lon: number,
  cityName: string
): Promise<WeatherTelemetry> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data, cityName };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const json = await res.json();
    const cur = json.current;

    const isDay = cur.is_day === 1;
    const tempC = Math.round(cur.temperature_2m);
    const code = cur.weather_code ?? 0;
    const humidity = cur.relative_humidity_2m ?? 60;
    const windSpeed = Math.round(cur.wind_speed_10m ?? 8);
    const precipitation = cur.precipitation ?? 0;

    const interpreted = interpretWmoCode(code, isDay, tempC);

    const result: WeatherTelemetry = {
      cityName,
      temperature: tempC,
      apparentTemperature: Math.round(cur.apparent_temperature ?? tempC),
      humidity,
      windSpeed,
      weatherCode: code,
      precipitation,
      isDay,
      ...interpreted,
    };

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn(`[WeatherService] Fallback to seasonal climate for ${cityName}:`, err);
    const fallback = getSeasonalFallbackWeather(lat, lon, cityName);
    weatherCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
    return fallback;
  }
}
