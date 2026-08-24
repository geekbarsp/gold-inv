import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
export async function GET() {
  try {
    await requireAuth();
    const { data, error } = await getSupabase()
      .from("inventory_history")
      .select("*, inventory_items(barcode,item_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ activity: data });
  } catch (error) {
    return apiError(error);
  }
}
