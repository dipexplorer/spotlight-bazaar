import { NextRequest } from "next/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth";

export const DEFAULT_ADMIN_PASSKEY = "nerqiva-admin-2026";

export const ADMIN_EMAILS = new Set([
  "nerqivastudio@gmail.com",
  "nerqiva.studio@gmail.com",
  "admin@nerqivastudio.in",
  "contact@nerqivastudio.in",
  "dipankarmahato10@gmail.com",
]);

export interface AdminAuthResult {
  authorized: boolean;
  email?: string;
  method?: "passkey" | "session";
  error?: string;
}

/**
 * Server-side admin authorization check.
 * Accepts:
 * 1. Header `x-admin-key` matching ADMIN_SECRET_KEY env or DEFAULT_ADMIN_PASSKEY.
 * 2. Supabase Bearer JWT if user's email is in ADMIN_EMAILS or ends with @nerqivastudio.in.
 */
export async function verifyAdminRequest(req: NextRequest): Promise<AdminAuthResult> {
  const configuredKey = process.env.ADMIN_SECRET_KEY || DEFAULT_ADMIN_PASSKEY;

  // 1. Check Passkey Header
  const headerKey = req.headers.get("x-admin-key");
  if (headerKey && headerKey.trim() === configuredKey.trim()) {
    return { authorized: true, method: "passkey" };
  }

  // 2. Check Supabase User Session
  const user = await getAuthenticatedUserFromRequest(req);
  if (user && user.email) {
    const emailLower = user.email.toLowerCase().trim();
    const envAdminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (
      ADMIN_EMAILS.has(emailLower) ||
      (envAdminEmail && emailLower === envAdminEmail) ||
      emailLower.endsWith("@nerqivastudio.in")
    ) {
      return { authorized: true, email: user.email, method: "session" };
    }
  }

  return {
    authorized: false,
    error: "Unauthorized. Nerqiva Admin privileges required.",
  };
}

