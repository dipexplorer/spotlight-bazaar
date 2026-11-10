import { Category } from "@/types";

export const CATEGORIES: Category[] = [
  {
    id: "creative-weddings",
    name: "Creative & Weddings",
    slug: "creative-weddings",
    icon: "Camera",
    sort_order: 1,
  },
  {
    id: "beauty-wellness",
    name: "Beauty & Wellness",
    slug: "beauty-wellness",
    icon: "Sparkles",
    sort_order: 2,
  },
  {
    id: "food-hospitality",
    name: "Food & Cafes",
    slug: "food-hospitality",
    icon: "Coffee",
    sort_order: 3,
  },
  {
    id: "tech-freelance",
    name: "Tech & Freelancers",
    slug: "tech-freelance",
    icon: "Laptop",
    sort_order: 4,
  },
  {
    id: "home-services",
    name: "Home & Local Services",
    slug: "home-services",
    icon: "Wrench",
    sort_order: 5,
  },
  {
    id: "coaching-education",
    name: "Coaching & Education",
    slug: "coaching-education",
    icon: "GraduationCap",
    sort_order: 6,
  },
  {
    id: "artisan-retail",
    name: "Artisans & Boutiques",
    slug: "artisan-retail",
    icon: "ShoppingBag",
    sort_order: 7,
  },
  {
    id: "other-business",
    name: "Other Businesses",
    slug: "other-business",
    icon: "Store",
    sort_order: 8,
  },
];

export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

