import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  createSession,
  requireAuth,
  requireSameOrigin,
  verifyPasscode,
} from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { settingsSchema } from "@/lib/validation";
export async function GET() {
  try {
    await requireAuth();
    const { data, error } = await getSupabase()
      .from("application_settings")
      .select(
        "store_name,session_timeout_minutes,barcode_format,label_show_karat,label_show_grams",
      )
      .eq("id", true)
      .single();
    if (error) throw error;
    return NextResponse.json({ settings: data });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    await requireAuth();
    const body = settingsSchema.parse(await request.json());
    const { current_passcode, new_passcode, ...settings } = body;
    const payload: Record<string, unknown> = {
      ...settings,
      updated_at: new Date().toISOString(),
    };
    if (new_passcode) {
      if (!current_passcode || !(await verifyPasscode(current_passcode)))
        return NextResponse.json(
          { error: "Current passcode is incorrect." },
          { status: 400 },
        );
      const { data: current } = await getSupabase()
        .from("application_settings")
        .select("session_version")
        .eq("id", true)
        .single();
      payload.passcode_hash = await bcrypt.hash(new_passcode, 12);
      payload.session_version = (current?.session_version || 1) + 1;
    }
    const { data, error } = await getSupabase()
      .from("application_settings")
      .update(payload)
      .eq("id", true)
      .select(
        "store_name,session_timeout_minutes,barcode_format,label_show_karat,label_show_grams",
      )
      .single();
    if (error) throw error;
    if (new_passcode) await createSession(data.session_timeout_minutes);
    return NextResponse.json({ settings: data });
  } catch (error) {
    return apiError(error);
  }
}
