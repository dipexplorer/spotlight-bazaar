import L from "leaflet";
import { CategoryId } from "@/types";

interface PinStyle {
  bg: string;
  glow: string;
  iconColor: string;
}

const CATEGORY_COLORS: Record<CategoryId, PinStyle> = {
  "creative-weddings": { bg: "#f43f5e", glow: "rgba(244, 63, 94, 0.4)", iconColor: "#ffffff" },
  "beauty-wellness": { bg: "#ec4899", glow: "rgba(236, 72, 153, 0.4)", iconColor: "#ffffff" },
  "food-hospitality": { bg: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", iconColor: "#ffffff" },
  "tech-freelance": { bg: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)", iconColor: "#ffffff" },
  "home-services": { bg: "#10b981", glow: "rgba(16, 185, 129, 0.4)", iconColor: "#ffffff" },
  "coaching-education": { bg: "#8b5cf6", glow: "rgba(139, 92, 246, 0.4)", iconColor: "#ffffff" },
  "artisan-retail": { bg: "#f97316", glow: "rgba(249, 115, 22, 0.4)", iconColor: "#ffffff" },
  "other-business": { bg: "#71717a", glow: "rgba(113, 113, 122, 0.4)", iconColor: "#ffffff" },
};

export function createStorefrontIcon(categoryId: CategoryId, isFeatured = false): L.DivIcon {
  const colors = CATEGORY_COLORS[categoryId] || CATEGORY_COLORS["other-business"];
  const size = isFeatured ? 36 : 30;

  const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      <div class="animate-pulse-glow" style="
        position: absolute;
        inset: -5px;
        border-radius: 9999px;
        background: ${colors.glow};
        filter: blur(5px);
        pointer-events: none;
      "></div>
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        border-radius: ${isFeatured ? "14px" : "11px"};
        background: #121215;
        border: 2px solid ${colors.bg};
        box-shadow: 0 4px 16px rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${colors.bg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-storefront-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
