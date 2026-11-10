/**
 * Geographic projection utilities for Spotlight 3D
 * Projects Indian GPS coordinates (lat/lon) into 3D world space (x, z)
 */

export const SCALE = 40;
export const CENTER_LON = 82.75;
export const CENTER_LAT = 22.5;

/**
 * Spherical Mercator latitude projection
 */
export function mercatorLat(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return (Math.log(Math.tan(Math.PI / 4 + rad / 2)) * 180) / Math.PI;
}

/**
 * Converts longitude & latitude to 3D world coordinates [x, z]
 * India's geographic center (82.75° E, 22.5° N) is anchored at (0, 0)
 */
export function toWorld(lon: number, lat: number): [number, number] {
  const x = (lon - CENTER_LON) * SCALE;
  const z = -(mercatorLat(lat) - mercatorLat(CENTER_LAT)) * SCALE;
  return [x, z];
}

/**
 * Inverse conversion: 3D world coordinates [x, z] to [lon, lat]
 */
export function toGeo(x: number, z: number): [number, number] {
  const lon = x / SCALE + CENTER_LON;
  const mercY = mercatorLat(CENTER_LAT) - z / SCALE;
  const rad = 2 * Math.atan(Math.exp((mercY * Math.PI) / 180)) - Math.PI / 2;
  const lat = (rad * 180) / Math.PI;
  return [lon, lat];
}

