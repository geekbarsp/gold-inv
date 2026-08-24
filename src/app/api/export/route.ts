import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { apiError } from "@/lib/api";
const csv = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const p = request.nextUrl.searchParams;
    let q = getSupabase()
      .from("inventory_items")
      .select(
        "barcode,item_name,category,karat,grams,status,description,supplier,design_code,notes,created_at,sold_at",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50000);
    const search = (p.get("q") || "").replace(/[(),.%]/g, " ").trim();
    if (search)
      q = q.or(
        `barcode.ilike.%${search}%,item_name.ilike.%${search}%,category.ilike.%${search}%,karat.ilike.%${search}%,description.ilike.%${search}%,status.ilike.%${search}%`,
      );
    if (p.get("status")) q = q.eq("status", p.get("status")!);
    if (p.get("category")) q = q.eq("category", p.get("category")!);
    if (p.get("karat")) q = q.eq("karat", p.get("karat")!);
    if (p.get("minGrams")) q = q.gte("grams", Number(p.get("minGrams")));
    if (p.get("maxGrams")) q = q.lte("grams", Number(p.get("maxGrams")));
    if (p.get("from")) q = q.gte("created_at", `${p.get("from")}T00:00:00`);
    if (p.get("to")) q = q.lte("created_at", `${p.get("to")}T23:59:59.999`);
    const { data, error } = await q;
    if (error) throw error;
    const columns = [
      "barcode",
      "item_name",
      "category",
      "karat",
      "grams",
      "status",
      "description",
      "supplier",
      "design_code",
      "notes",
      "created_at",
      "sold_at",
    ];
    const body =
      "\uFEFF" +
      [
        columns.join(","),
        ...(data || []).map((row) =>
          columns.map((key) => csv(row[key as keyof typeof row])).join(","),
        ),
      ].join("\r\n");
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ngj-inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
