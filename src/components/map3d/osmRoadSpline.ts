import * as THREE from "three";

/**
 * OpenStreetMap Road Spline & Trajectory Model for North Guwahati Commercial Corridor
 *
 * Models the exact, continuous road trajectory from the Nerqiva Studio plot gate (Z = 10m)
 * through the driveway, connector curve, OpenStreetMap residential junction (pRoad, Z = 89.35m),
 * and continuing along the real-world street network (pPrev to T-junction, Z = 185m).
 */

export interface RoadPose {
  /** 3D position (X, 0, Z) in local road coordinates */
  position: THREE.Vector3;
  /** Unit tangent vector pointing in the forward direction of traffic (+s) */
  tangent: THREE.Vector3;
  /** Unit normal vector pointing to the right-hand side of the road */
  normal: THREE.Vector3;
  /** Forward heading angle in radians (for vehicle and prop Y-rotation) */
  heading: number;
}

export class OsmRoadSpline {
  private curve: THREE.CatmullRomCurve3;
  public readonly totalLength: number;

  constructor() {
    // Exact surveyed waypoints from plot entrance gate down to the main street junction
    // Coordinates are in local meters aligned with the studio driveway orientation
    const points = [
      new THREE.Vector3(0, 0, 8.0),      // Plot Gate entrance
      new THREE.Vector3(0, 0, 45.0),     // Straight driveway avenue
      new THREE.Vector3(-2.05, 0, 71.6), // Connector curve inflection point
      new THREE.Vector3(-1.69, 0, 81.6), // Approach to OSM street junction
      new THREE.Vector3(0, 0, 89.35),    // Junction node with OpenStreetMap residential street (pRoad)
      new THREE.Vector3(18.74, 0, 145.1),// Real-world OSM residential bend (pPrev)
      new THREE.Vector3(30.27, 0, 185.1),// Continuation to North Guwahati secondary street T-junction
    ];

    // Centripetal Catmull-Rom curve guarantees no overshoot, kinks, or self-intersection
    this.curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.35);
    this.totalLength = this.curve.getLength();
  }

  /**
   * Samples a pose at arc distance `distance` (meters) along the road corridor.
   * Clamped safely between 0 and totalLength.
   */
  public getPoseAtDistance(distance: number): RoadPose {
    const clampedDist = Math.max(0, Math.min(this.totalLength, distance));
    const u = clampedDist / this.totalLength;

    const position = this.curve.getPointAt(u);
    const tangent = this.curve.getTangentAt(u).normalize();
    // Canonical right-hand normal perpendicular to forward tangent on the X-Z ground plane (+X when tangent is +Z)
    const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    const heading = Math.atan2(tangent.x, tangent.z);

    return { position, tangent, normal, heading };
  }

  /**
   * Computes a point offset laterally from the road centerline.
   * @param distance Distance along the road (m)
   * @param lateralOffset Offset in meters (+ for right-hand side, - for left-hand side)
   */
  public getOffsetPosition(distance: number, lateralOffset: number): THREE.Vector3 {
    const pose = this.getPoseAtDistance(distance);
    return pose.position.clone().addScaledVector(pose.normal, lateralOffset);
  }
}

export const osmRoadSpline = new OsmRoadSpline();

