import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function PUT(request: NextRequest, props: { params: Promise<{ checkoutId: string }> }) {
  const { checkoutId } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const body = (await request.json()) as { title?: string; pricePyg?: number; isActive?: boolean };
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "El título no puede estar vacío." }, { status: 400 });
    updateData.title = title;
  }
  if (body.pricePyg !== undefined) {
    const price = Number(body.pricePyg);
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Precio inválido." }, { status: 400 });
    updateData.price_pyg = price;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    updateData.is_active = body.isActive;
  }
  if (Object.keys(updateData).length === 1) return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
  const { data, error } = await supabase
    .from("checkout_links")
    .update(updateData)
    .eq("id", checkoutId)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Checkout no encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ checkoutId: string }> }) {
  const { checkoutId } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  const { error } = await supabase.from("checkout_links").delete().eq("id", checkoutId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
