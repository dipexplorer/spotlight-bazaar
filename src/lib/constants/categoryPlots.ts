import { CategoryId } from "@/types";

export interface CategoryPlotSpec {
  id: CategoryId;
  plotName: string;
  architecturalStyle: string;
  summary: string;
  palette: [string, string, string]; // [primary, facade, accent]
  footprintLabel: string;
}

export const CATEGORY_PLOT_SPECS: Record<CategoryId, CategoryPlotSpec> = {
  "creative-weddings": {
    id: "creative-weddings",
    plotName: "Glass Atelier & Studio",
    architecturalStyle: "North-light cyclorama skylight, frameless gallery glazing & champagne gold fascia",
    summary: "Two-story studio pavilion with sunlit gallery windows and warm architectural lighting.",
    palette: ["#1e293b", "#f8fafc", "#eab308"],
    footprintLabel: "22m × 18m Atelier",
  },
  "beauty-wellness": {
    id: "beauty-wellness",
    plotName: "Botanical Spa Pavilion",
    architecturalStyle: "Travertine cream overhang, arched frosted glass bays & reflecting water basin",
    summary: "Serene horizontal sanctuary with bamboo courtyard planters and warm amber lounge glow.",
    palette: ["#f5f0e6", "#d6c5b3", "#fb7185"],
    footprintLabel: "22m × 18m Pavilion",
  },
  "food-hospitality": {
    id: "food-hospitality",
    plotName: "Artisanal Café & Roastery",
    architecturalStyle: "Terracotta brick facade, striped canopy awning & timber bistro patio deck",
    summary: "Street-facing café with outdoor umbrella tables, warm Edison interior & roaster vent.",
    palette: ["#9a3412", "#fef3c7", "#f59e0b"],
    footprintLabel: "22m × 18m Café Deck",
  },
  "tech-freelance": {
    id: "tech-freelance",
    plotName: "Modern Tech & Dev Studio",
    architecturalStyle: "Cantilevered graphite volume, cyan ribbon glazing & rooftop solar array",
    summary: "Sharp contemporary workspace with glowing dual-screen studio interior and steel fins.",
    palette: ["#0f172a", "#334155", "#38bdf8"],
    footprintLabel: "22m × 18m Tech Lab",
  },
  "home-services": {
    id: "home-services",
    plotName: "Service & Trade Hub",
    architecturalStyle: "Architectural concrete workshop, high-clearance service bay & utility forecourt",
    summary: "Clean customer reception paired with a ribbed service bay and parked utility van.",
    palette: ["#334155", "#e2e8f0", "#f59e0b"],
    footprintLabel: "22m × 18m Service Hub",
  },
  "coaching-education": {
    id: "coaching-education",
    plotName: "Contemporary Academy Hall",
    architecturalStyle: "Warm academic brick, wide classroom ribbon windows & pillared entrance porch",
    summary: "Two-story study campus with courtyard reading benches and rooftop crest parapet.",
    palette: ["#7c2d12", "#f8fafc", "#3b82f6"],
    footprintLabel: "22m × 18m Academy",
  },
  "artisan-retail": {
    id: "artisan-retail",
    plotName: "Flagship Boutique & Craft House",
    architecturalStyle: "Sandstone ochre facade, teak timber louvers & spotlighted display windows",
    summary: "Editorial street showroom with illuminated window pedestals and rooftop terrace.",
    palette: ["#78350f", "#fde68a", "#d97706"],
    footprintLabel: "22m × 18m Boutique",
  },
  "other-business": {
    id: "other-business",
    plotName: "Urban Commercial Flagship",
    architecturalStyle: "Dark basalt plinth, crisp white upper volume & wrap-around glass storefront",
    summary: "Clean modern streetfront building with cantilevered canopy and glowing brand fascia.",
    palette: ["#18181b", "#f4f4f5", "#f59e0b"],
    footprintLabel: "22m × 18m Flagship",
  },
};

