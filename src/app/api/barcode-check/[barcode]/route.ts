import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  try {
    await requireAuth();
    const barcode = decodeURIComponent((await params).barcode).toUpperCase();
    const { data, error } = await getSupabase()
      .from("inventory_items")
      .select("barcode")
      .eq("barcode", barcode)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ exists: Boolean(data) });
  } catch (error) {
    return apiError(error);
  }
}
