import { BusinessStorefront } from "@/types";

const LOCAL_STORAGE_KEY = "sb-my-storefront";

/**
 * Saves newly registered storefront to client localStorage for optimistic instant preview
 */
export function saveLocalStorefront(storefront: BusinessStorefront): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storefront));
  } catch {
    // Handle private browsing quota limits silently
  }
}

/**
 * Retrieves the locally registered storefront if available
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
 * Clears locally registered storefront
 */
export function clearLocalStorefront(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

