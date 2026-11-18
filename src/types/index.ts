export type CategoryId =
  | "creative-weddings"
  | "beauty-wellness"
  | "food-hospitality"
  | "tech-freelance"
  | "home-services"
  | "coaching-education"
  | "artisan-retail"
  | "other-business";

export interface Category {
  id: CategoryId;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
}

export interface City {
  id: number;
  name: string;
  state: string;
  lat: number;
  lon: number;
  slug: string;
}

export type BroadcastType = "deal" | "need" | "hiring" | "event";

export type FacadeTheme = "default" | "obsidian" | "limestone" | "terracotta";

export interface PlotConfig {
  accentColor?: string;
  facadeTheme?: FacadeTheme;
  roofSignText?: string;
}

export interface BusinessPost {
  id: string;
  business_id: string;
  post_type: BroadcastType;
  title: string;
  details?: string | null;
  coupon_code?: string | null;
  cta_label?: string | null;
  expires_at: string;
  clicks: number;
  created_at: string;
}

export interface BusinessPostWithStorefront extends BusinessPost {
  business?: {
    id: string;
    slug: string;
    name: string;
    city_name: string;
    state_name: string;
    pincode?: string | null;
    lat: number;
    lon: number;
    whatsapp_phone: string;
    category_id: CategoryId;
    logo_url?: string | null;
  };
}

export interface BusinessStorefront {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  category_id: CategoryId;
  city_name: string;
  state_name: string;
  pincode?: string;
  lat: number;
  lon: number;
  facing_bearing?: number;
  road_anchor_lat?: number;
  road_anchor_lon?: number;
  connector_type?: "osm_road" | "colony_branch" | "frontage";
  whatsapp_phone: string;
  instagram_handle?: string;
  website_url?: string;
  google_maps_url?: string;
  starting_price?: string;
  logo_url?: string;
  is_verified: boolean;
  is_featured: boolean;
  status?: "active" | "pending" | "suspended";
  owner_id?: string | null;
  total_views: number;
  total_leads: number;
  plot_level?: 1 | 2 | 3;
  bazaar_coins?: number;
  plot_config?: PlotConfig | null;
  portfolio?: PortfolioItem[];
  active_posts?: BusinessPost[];
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  business_id: string;
  image_url: string;
  caption?: string;
  sort_order: number;
}

export interface BootPayload {
  day: number;
  total_storefronts: number;
  total_cities: number;
  categories: {
    id: CategoryId;
    name: string;
    icon: string;
    count: number;
  }[];
  featured_ids: string[];
  storefronts: BusinessStorefront[];
}

