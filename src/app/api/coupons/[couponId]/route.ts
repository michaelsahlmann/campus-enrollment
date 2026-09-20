import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function PUT(request: NextRequest, props: { params: Promise<{ couponId: string }> }) {
  const { couponId } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const body = (await request.json()) as {
    name?: string;
    discountType?: string;
    discountValue?: number;
    isActive?: boolean;
  };
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.discountType !== undefined) updateData.discount_type = body.discountType;
  if (body.discountValue !== undefined) updateData.discount_value = Number(body.discountValue);
  if (body.isActive !== undefined) updateData.is_active = body.isActive;

  const { error } = await supabase.from("coupons").update(updateData).eq("id", couponId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ couponId: string }> }) {
  const { couponId } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  const { error } = await supabase.from("coupons").delete().eq("id", couponId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
