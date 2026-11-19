import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_ADMIN_PASSKEY, verifyAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const passkey = typeof body.passkey === "string" ? body.passkey.trim() : "";
    const configuredKey = process.env.ADMIN_SECRET_KEY || DEFAULT_ADMIN_PASSKEY;

    if (passkey && passkey === configuredKey) {
      return NextResponse.json({
        success: true,
        method: "passkey",
        admin_key: passkey,
      });
    }

    // Also support active session auth check
    const authResult = await verifyAdminRequest(req);
    if (authResult.authorized) {
      return NextResponse.json({
        success: true,
        method: authResult.method || "session",
        email: authResult.email,
        admin_key: configuredKey,
      });
    }

    return NextResponse.json(
      { error: "Invalid Nerqiva Admin passkey or unauthorized session." },
      { status: 401 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

