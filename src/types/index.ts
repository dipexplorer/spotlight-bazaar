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
  whatsapp_phone: string;
  instagram_handle?: string;
  website_url?: string;
  starting_price?: string;
  logo_url?: string;
  is_verified: boolean;
  is_featured: boolean;
  total_views: number;
  total_leads: number;
  portfolio?: PortfolioItem[];
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

