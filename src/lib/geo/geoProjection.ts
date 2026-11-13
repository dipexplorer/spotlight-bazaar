/**
 * Geo-to-Cartesian Coordinate Projection Engine
 * Translates real-world WGS84 GPS coordinates (lat, lon) to local Three.js (x, z) space
 * and vice-versa, using local equidistant Mercator projection.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Vector2D {
  x: number;
  z: number;
}

export interface CityGeoAnchor {
  cityName: string;
  centerLat: number;
  centerLon: number;
  scaleFactor: number; // 3D units per real-world meter
}

// Earth's mean radius in meters (WGS84)
const EARTH_RADIUS_METERS = 6378137.0;

export const DEFAULT_CITY_ANCHORS: Record<string, CityGeoAnchor> = {
  guwahati: {
    cityName: "Guwahati",
    centerLat: 26.1528, // Near GS Road / Christian Basti commercial corridor
    centerLon: 91.7652,
    scaleFactor: 0.025, // 1 unit in 3D ≈ 40 meters in real world
  },
  mumbai: {
    cityName: "Mumbai",
    centerLat: 19.0596,
    centerLon: 72.8295,
    scaleFactor: 0.025,
  },
  bangalore: {
    cityName: "Bangalore",
    centerLat: 12.9716,
    centerLon: 77.5946,
    scaleFactor: 0.025,
  },
  delhi: {
    cityName: "Delhi",
    centerLat: 28.6139,
    centerLon: 77.209,
    scaleFactor: 0.025,
  },
};

/**
 * Projects a GPS coordinate (lat, lon) into local 3D coordinates (x, z).
 * Note: In Three.js:
 * - Positive X = East, Negative X = West
 * - Positive Z = South, Negative Z = North
 */
export function projectGpsTo3D(
  point: GeoPoint,
  anchor: CityGeoAnchor = DEFAULT_CITY_ANCHORS.guwahati
): Vector2D {
  const latRad = (point.lat * Math.PI) / 180;
  const lonRad = (point.lon * Math.PI) / 180;
  const centerLatRad = (anchor.centerLat * Math.PI) / 180;
  const centerLonRad = (anchor.centerLon * Math.PI) / 180;

  // Meters displacement from city center
  const dX = EARTH_RADIUS_METERS * (lonRad - centerLonRad) * Math.cos(centerLatRad);
  const dZ = -EARTH_RADIUS_METERS * (latRad - centerLatRad);

  return {
    x: Number((dX * anchor.scaleFactor).toFixed(2)),
    z: Number((dZ * anchor.scaleFactor).toFixed(2)),
  };
}

/**
 * Unprojects a local 3D coordinate (x, z) back to real GPS (lat, lon).
 */
export function unproject3DToGps(
  vec: Vector2D,
  anchor: CityGeoAnchor = DEFAULT_CITY_ANCHORS.guwahati
): GeoPoint {
  const dX = vec.x / anchor.scaleFactor;
  const dZ = -vec.z / anchor.scaleFactor;

  const centerLatRad = (anchor.centerLat * Math.PI) / 180;
  const centerLonRad = (anchor.centerLon * Math.PI) / 180;

  const latRad = centerLatRad + dZ / EARTH_RADIUS_METERS;
  const lonRad = centerLonRad + dX / (EARTH_RADIUS_METERS * Math.cos(centerLatRad));

  return {
    lat: Number(((latRad * 180) / Math.PI).toFixed(6)),
    lon: Number(((lonRad * 180) / Math.PI).toFixed(6)),
  };
}

/**
 * Calculates the perpendicular projection of point P onto line segment AB.
 * Returns the closest point on segment and the normalized normal vector.
 */
export function getNearestPointOnSegment(
  p: Vector2D,
  a: Vector2D,
  b: Vector2D
): { point: Vector2D; t: number; normal: Vector2D; distance: number; isLeft: boolean } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;

  let t = 0;
  if (lenSq > 0.0001) {
    t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq));
  }

  const projX = a.x + t * dx;
  const projZ = a.z + t * dz;

  const len = Math.sqrt(lenSq);
  // Unit normal pointing to the left of the road (looking from A to B)
  const nx = -dz / (len || 1);
  const nz = dx / (len || 1);

  // Signed cross product to check which side of the road P is on
  const cross = dx * (p.z - a.z) - dz * (p.x - a.x);
  const isLeft = cross > 0;

  const dist = Math.hypot(p.x - projX, p.z - projZ);

  return {
    point: { x: projX, z: projZ },
    t,
    normal: { x: nx, z: nz },
    distance: dist,
    isLeft,
  };
}

