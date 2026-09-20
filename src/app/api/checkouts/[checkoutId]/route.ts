import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function PUT(request: NextRequest, props: { params: Promise<{ checkoutId: string }> }) {
  const { checkoutId } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const body = (await request.json()) as { title?: string; pricePyg?: number; isActive?: boolean };
  const { error } = await supabase
    .from("checkout_links")
    .update({
      title: body.title?.trim(),
      price_pyg: Number(body.pricePyg),
      is_active: body.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkoutId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
