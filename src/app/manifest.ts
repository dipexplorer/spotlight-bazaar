import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spotlight Bazaar · India's 3D Business Map",
    short_name: "Spotlight Bazaar",
    description:
      "Discover verified local merchants, explore real rate cards, and stroll 3D open commercial high streets across India.",
    start_url: "/",
    display: "standalone",
    background_color: "#070a13",
    theme_color: "#09090b",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/mascot-avatar.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "shopping", "navigation", "lifestyle"],
  };
}
