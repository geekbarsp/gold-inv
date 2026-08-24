import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireSameOrigin } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const q = (request.nextUrl.searchParams.get("q") || "")
      .replace(/[(),.%]/g, " ")
      .trim();
    let query = getSupabase()
      .from("inventory_items")
      .select("*", { count: "exact" })
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(500);
    if (q)
      query = query.or(
        `barcode.ilike.%${q}%,item_name.ilike.%${q}%,category.ilike.%${q}%`,
      );
    const { data, count, error } = await query;
    if (error) throw error;
    return NextResponse.json({ items: data, count: count || 0 });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    await requireAuth();
    const { barcode } = z
      .object({ barcode: z.string().min(1).max(100) })
      .parse(await request.json());
    const { data, error } = await getSupabase()
      .from("inventory_items")
      .update({ deleted_at: null })
      .eq("barcode", barcode.toUpperCase())
      .not("deleted_at", "is", null)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { error: "Deleted item not found." },
        { status: 404 },
      );
    return NextResponse.json({ item: data });
  } catch (error) {
    return apiError(error);
  }
}
