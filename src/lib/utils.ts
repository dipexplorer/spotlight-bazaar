import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Indian Currency (INR)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generates direct WhatsApp click-to-chat URL with pre-filled high-intent message
 */
export function getWhatsAppUrl(phone: string, businessName: string, serviceName?: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
  const text = `Hi ${businessName}, I found your storefront on Spotlight Bazaar! I would like to inquire about ${serviceName || "your services and availability"}.`;
  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Safely normalizes a user-supplied external URL (adds https:// if omitted, blocks non-http schemes)
 */
export function normalizeExternalUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Formats a clean display host/path for an official website URL
 */
export function formatWebsiteDisplay(raw?: string | null): string {
  const safe = normalizeExternalUrl(raw);
  if (!safe) return "";
  return safe.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

/**
 * Returns the business's official Google Maps link if provided, or falls back to exact lat/lon Google Maps directions
 */
export function getGoogleMapsUrl(storefront: {
  google_maps_url?: string | null;
  lat?: number;
  lon?: number;
  name?: string;
}): string | null {
  const official = normalizeExternalUrl(storefront.google_maps_url);
  if (official) return official;
  if (typeof storefront.lat === "number" && typeof storefront.lon === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${storefront.lat},${storefront.lon}`;
  }
  return null;
}

/**
 * Returns a clean Instagram profile URL from handle or link
 */
export function getInstagramUrl(handle?: string | null): string | null {
  if (!handle || typeof handle !== "string") return null;
  const trimmed = handle.trim();
  if (!trimmed) return null;
  if (/^https?:\/\/(www\.)?instagram\.com\//i.test(trimmed)) {
    return normalizeExternalUrl(trimmed);
  }
  const clean = trimmed.replace(/^@+/, "").replace(/[^a-zA-Z0-9._]/g, "");
  if (!clean) return null;
  return `https://instagram.com/${clean}`;
}

