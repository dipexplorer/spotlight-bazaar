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

