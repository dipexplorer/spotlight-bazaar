import * as THREE from "three";
import { createTreeMesh, createStreetLightMesh } from "@/components/map/osm3dBuildings";

/**
 * Photorealistic Architectural Terrain Skirt & Landscaped Verge
 * Seamlessly grounds the 3D plot and road connector into the real-world satellite terrain.
 * Eliminates the stark white void at street level with lush turf, roadside trees, and verge lighting.
 */

export interface TerrainApron {
  group: THREE.Group;
  dispose: () => void;
}

export function createPlotTerrainApron(roadLength: number, roadAngle: number): TerrainApron {
  const group = new THREE.Group();
  group.name = "photorealistic_terrain_apron";

  // Shared Materials
  const turfMat = new THREE.MeshStandardMaterial({
    color: 0x223c1d, // Natural dark Indian earth & lawn turf
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  });

  const vergeMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // Roadside gravel & paving verge
    roughness: 0.85,
    metalness: 0.1,
  });

  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x3d3024, // Rich loam soil beds along sidewalk borders
    roughness: 0.95,
  });

  // 1. Manicured Commercial Plot Parcel Skirt (46m x 52m directly framing the villa & courtyard)
  // Perfectly sized to the commercial plot boundary so the surrounding real satellite terrain wraps naturally
  const plotWidth = 48.0;
  const plotLength = 54.0;
  const skirtGeo = new THREE.BoxGeometry(plotWidth, 0.08, plotLength);
  const skirtMesh = new THREE.Mesh(skirtGeo, turfMat);
  skirtMesh.position.set(0, 0.01, 7.0);
  skirtMesh.receiveShadow = true;
  group.add(skirtMesh);

  // Modern perimeter curbing around the commercial parcel
  const curbBoundaryMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const curbBorderGeo = new THREE.BoxGeometry(plotWidth + 0.4, 0.12, 0.3);
  const curbBorderMesh = new THREE.Mesh(curbBorderGeo, curbBoundaryMat);
  curbBorderMesh.position.set(0, 0.04, 7.0 + plotLength / 2);
  group.add(curbBorderMesh);

  // 2. Roadside Soil & Planting Verges Flanking the Sidewalks
  const roadWidth = 5.6;
  const sidewalkWidth = 1.1;
  const curbEdge = roadWidth / 2 + sidewalkWidth + 0.15; // ~4.1m from road center
  const vergeWidth = 2.4;

  for (const side of [-1, 1]) {
    const vergeGeo = new THREE.BoxGeometry(vergeWidth, 0.06, roadLength);
    const vergeMesh = new THREE.Mesh(vergeGeo, vergeMat);
    const vergeX = side * (curbEdge + vergeWidth / 2);
    vergeMesh.position.set(vergeX, -0.01, roadLength / 2);
    group.add(vergeMesh);

    // Soil planting bed along outer edge
    const soilGeo = new THREE.BoxGeometry(1.6, 0.05, roadLength);
    const soilMesh = new THREE.Mesh(soilGeo, soilMat);
    soilMesh.position.set(side * (curbEdge + vergeWidth + 0.8), -0.01, roadLength / 2);
    group.add(soilMesh);
  }

  // 3. Roadside Indian Street Trees Flanking the Avenue
  // Placed every 16-20 meters from Z=18m up to roadLength - 10m
  const treeSpacing = 18.0;
  const startZ = 18.0;
  const endZ = roadLength - 10.0;
  const treeDistanceX = curbEdge + 1.4;

  let treeToggle = 0;
  for (let z = startZ; z <= endZ; z += treeSpacing) {
    for (const side of [-1, 1]) {
      const treeType = treeToggle % 2 === 0 ? "round" : "pine";
      const tree = createTreeMesh(treeType);
      const scale = 0.85 + (Math.sin(z * 1.5) * 0.15);
      tree.scale.set(scale, scale, scale);
      tree.position.set(side * treeDistanceX, 0, z);
      tree.rotation.y = (z * 0.3) % (Math.PI * 2);
      group.add(tree);
      treeToggle++;
    }
  }

  // 4. Roadside Architectural Streetlights lining the avenue
  for (let z = startZ + 8.0; z <= endZ; z += treeSpacing * 1.6) {
    for (const side of [-1, 1]) {
      const lamp = createStreetLightMesh();
      lamp.scale.set(0.9, 0.9, 0.9);
      lamp.position.set(side * (curbEdge + 0.3), 0, z);
      lamp.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
      group.add(lamp);
    }
  }

  // Rotate entire apron to match road connector angle
  group.rotation.y = roadAngle;

  const dispose = () => {
    group.clear();
    skirtGeo.dispose();
    turfMat.dispose();
    vergeMat.dispose();
    soilMat.dispose();
  };

  return { group, dispose };
}
