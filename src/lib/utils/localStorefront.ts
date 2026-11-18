import { BusinessStorefront } from "@/types";

const LOCAL_STORAGE_KEY = "sb-my-storefront";
const LOCAL_LIST_KEY = "sb-my-storefronts";

/**
 * Saves newly registered storefront to client localStorage for optimistic instant 3D rendering
 */
export function saveLocalStorefront(storefront: BusinessStorefront): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storefront));
    const existing = getLocalStorefronts();
    const deduped = [
      storefront,
      ...existing.filter((s) => s.slug !== storefront.slug && s.id !== storefront.id),
    ].slice(0, 25);
    localStorage.setItem(LOCAL_LIST_KEY, JSON.stringify(deduped));
  } catch {
    // Handle private browsing quota limits silently
  }
}

/**
 * Retrieves the most recently registered local storefront if available
 */
export function getLocalStorefront(): BusinessStorefront | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Retrieves all locally registered storefronts for instant All-India 3D map rendering
 */
export function getLocalStorefronts(): BusinessStorefront[] {
  if (typeof window === "undefined") return [];
  try {
    const listRaw = localStorage.getItem(LOCAL_LIST_KEY);
    const list: BusinessStorefront[] = listRaw ? JSON.parse(listRaw) : [];
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
    const single = getLocalStorefront();
    return single ? [single] : [];
  } catch {
    return [];
  }
}

/**
 * Clears locally registered storefronts
 */
export function clearLocalStorefront(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LOCAL_LIST_KEY);
  } catch {
    // Ignore
  }
}
