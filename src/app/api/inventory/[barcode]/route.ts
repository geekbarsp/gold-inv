import { NextResponse } from "next/server";
import { requireAuth, requireSameOrigin } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { updateItemSchema } from "@/lib/validation";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  try {
    await requireAuth();
    const barcode = decodeURIComponent((await params).barcode).toUpperCase();
    const db = getSupabase();
    const { data: item, error } = await db
      .from("inventory_items")
      .select("*")
      .eq("barcode", barcode)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!item)
      return NextResponse.json(
        { error: `No inventory item found for barcode ${barcode}.` },
        { status: 404 },
      );
    const { data: history, error: historyError } = await db
      .from("inventory_history")
      .select("*")
      .eq("inventory_item_id", item.id)
      .order("created_at", { ascending: false });
    if (historyError) throw historyError;
    return NextResponse.json({ item, history });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  try {
    requireSameOrigin(request);
    await requireAuth();
    const barcode = decodeURIComponent((await params).barcode).toUpperCase();
    const body = updateItemSchema.parse(await request.json());
    const payload = {
      ...body,
      ...(body.status
        ? { sold_at: body.status === "sold" ? new Date().toISOString() : null }
        : {}),
    };
    const { data, error } = await getSupabase()
      .from("inventory_items")
      .update(payload)
      .eq("barcode", barcode)
      .is("deleted_at", null)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { error: "Inventory item not found." },
        { status: 404 },
      );
    return NextResponse.json({ item: data });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  try {
    requireSameOrigin(request);
    await requireAuth();
    const barcode = decodeURIComponent((await params).barcode).toUpperCase();
    const { confirm } = await request.json();
    if (confirm !== barcode)
      return NextResponse.json(
        { error: `Type ${barcode} to confirm.` },
        { status: 400 },
      );
    const { data, error } = await getSupabase()
      .from("inventory_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("barcode", barcode)
      .is("deleted_at", null)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { error: "Inventory item not found." },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
