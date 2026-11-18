import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Verifies the Bearer JWT sent from the browser Supabase session on the server.
 * Always verifies via supabase.auth.getUser(token) — never trusts unverified client IDs.
 */
export async function getAuthenticatedUserFromRequest(
  req: NextRequest
): Promise<User | null> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  if (!token) return null;

  const supabase = createServerClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

