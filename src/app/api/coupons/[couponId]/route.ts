import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function PUT(request: NextRequest, props: { params: Promise<{ couponId: string }> }) {
  const { couponId } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const body = (await request.json()) as {
    code?: string;
    name?: string;
    discountType?: string;
    discountValue?: number;
    applicableCheckoutIds?: string[] | null;
    isActive?: boolean;
  };
  const updateData: Record<string, unknown> = {};
  if (body.code !== undefined) {
    const code = body.code.trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "El código no puede estar vacío." }, { status: 400 });
    updateData.code = code;
  }
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "El nombre no puede estar vacío." }, { status: 400 });
    updateData.name = name;
  }
  if (body.discountType !== undefined) {
    if (!['percentage', 'fixed'].includes(body.discountType)) {
      return NextResponse.json({ error: "Tipo de descuento inválido." }, { status: 400 });
    }
    updateData.discount_type = body.discountType;
  }
  if (body.discountValue !== undefined) {
    const value = Number(body.discountValue);
    if (!Number.isFinite(value) || value <= 0 || (body.discountType === "percentage" && value > 100)) {
      return NextResponse.json({ error: "Valor de descuento inválido." }, { status: 400 });
    }
    updateData.discount_value = value;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    updateData.is_active = body.isActive;
  }
  if (body.applicableCheckoutIds !== undefined) {
    updateData.applicable_checkout_ids = Array.isArray(body.applicableCheckoutIds) && body.applicableCheckoutIds.length > 0
      ? body.applicableCheckoutIds
      : null;
  }
  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
  if (body.discountType === "percentage" && body.discountValue === undefined) {
    const { data: current, error: currentError } = await supabase
      .from("coupons")
      .select("discount_value")
      .eq("id", couponId)
      .maybeSingle();
    if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "Cupón no encontrado." }, { status: 404 });
    if (Number(current.discount_value) > 100) {
      return NextResponse.json({ error: "El porcentaje no puede superar el 100%." }, { status: 400 });
    }
  }

  const { data, error } = await supabase.from("coupons").update(updateData).eq("id", couponId).select("id").maybeSingle();
  if (error) {
    if (error.message.includes("coupons_code_key")) {
      return NextResponse.json({ error: `El código "${body.code}" ya está en uso.` }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Cupón no encontrado." }, { status: 404 });
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
