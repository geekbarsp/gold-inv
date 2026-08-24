import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireSameOrigin } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { itemSchema } from "@/lib/validation";

const sortable = new Set([
  "barcode",
  "item_name",
  "category",
  "karat",
  "grams",
  "status",
  "created_at",
]);
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const p = request.nextUrl.searchParams;
    const db = getSupabase();
    const page = Math.max(1, Number(p.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(10, Number(p.get("pageSize") || 20)),
    );
    let query = db
      .from("inventory_items")
      .select("*", { count: "exact" })
      .is("deleted_at", null);
    const search = (p.get("q") || "").replace(/[(),.%]/g, " ").trim();
    if (search)
      query = query.or(
        `barcode.ilike.%${search}%,item_name.ilike.%${search}%,category.ilike.%${search}%,karat.ilike.%${search}%,description.ilike.%${search}%,status.ilike.%${search}%`,
      );
    if (p.get("status")) query = query.eq("status", p.get("status")!);
    if (p.get("category")) query = query.eq("category", p.get("category")!);
    if (p.get("karat")) query = query.eq("karat", p.get("karat")!);
    if (p.get("minGrams"))
      query = query.gte("grams", Number(p.get("minGrams")));
    if (p.get("maxGrams"))
      query = query.lte("grams", Number(p.get("maxGrams")));
    if (p.get("from"))
      query = query.gte("created_at", `${p.get("from")}T00:00:00`);
    if (p.get("to"))
      query = query.lte("created_at", `${p.get("to")}T23:59:59.999`);
    const sort = sortable.has(p.get("sort") || "")
      ? p.get("sort")!
      : "created_at";
    const { data, count, error } = await query
      .order(sort, { ascending: p.get("dir") === "asc" })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    const { data: stats, error: statsError } = await db.rpc("inventory_stats");
    if (statsError) throw statsError;
    const { data: breakdowns, error: breakdownError } = await db.rpc(
      "inventory_breakdowns",
    );
    if (breakdownError) throw breakdownError;
    return NextResponse.json({
      items: data,
      count: count || 0,
      page,
      pageSize,
      stats,
      breakdowns,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireAuth();
    const body = itemSchema.parse(await request.json());
    const payload = {
      ...body,
      barcode: body.barcode.toUpperCase(),
      sold_at: body.status === "sold" ? new Date().toISOString() : null,
    };
    const { data, error } = await getSupabase()
      .from("inventory_items")
      .insert(payload)
      .select()
      .single();
    if (error?.code === "23505")
      return NextResponse.json(
        {
          error: "This barcode is already assigned to another inventory item.",
          existingBarcode: payload.barcode,
        },
        { status: 409 },
      );
    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
