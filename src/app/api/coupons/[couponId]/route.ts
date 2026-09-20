import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function PUT(request: NextRequest, props: { params: Promise<{ couponId: string }> }) {
  const { couponId } = await props.params; const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const body = await request.json() as { name?: string; discountType?: string; discountValue?: number; isActive?: boolean };
  const { error } = await supabase.from("coupons").update({ name: body.name?.trim(), discount_type: body.discountType, discount_value: Number(body.discountValue), is_active: body.isActive }).eq("id", couponId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
