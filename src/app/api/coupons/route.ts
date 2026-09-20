import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

const ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length: number) {
  return Array.from({ length }, () => ALPHANUMERIC[crypto.getRandomValues(new Uint32Array(1))[0] % ALPHANUMERIC.length]).join("");
}

export async function GET() {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const { data, error } = await supabase
    .from("coupons")
    .select("id, code, name, discount_type, discount_value, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupons: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const body = (await request.json()) as {
      name?: string;
      code?: string;
      discountType?: string;
      discountValue?: number;
      length?: number;
    };
    const name = body.name?.trim();
    const value = Number(body.discountValue);
    const customCode = body.code?.trim().toUpperCase();
    const length = body.length === 4 ? 4 : body.length === 6 ? 6 : 6;

    if (!name || !Number.isFinite(value) || value <= 0 || !["percentage", "fixed"].includes(body.discountType || "")) {
      return NextResponse.json({ error: "Completá nombre, tipo de descuento y valor válidos." }, { status: 400 });
    }
    if (body.discountType === "percentage" && value > 100) {
      return NextResponse.json({ error: "El porcentaje no puede superar el 100%." }, { status: 400 });
    }

    if (customCode) {
      const { data, error } = await supabase
        .from("coupons")
        .insert({
          code: customCode,
          name,
          discount_type: body.discountType,
          discount_value: value,
          is_active: true,
        })
        .select()
        .single();
      if (error) {
        if (error.message.includes("coupons_code_key")) {
          return NextResponse.json({ error: `El código "${customCode}" ya existe.` }, { status: 400 });
        }
        throw error;
      }
      return NextResponse.json({ coupon: data }, { status: 201 });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCode(length);
      const { data, error } = await supabase
        .from("coupons")
        .insert({
          code,
          name,
          discount_type: body.discountType,
          discount_value: value,
          is_active: true,
        })
        .select()
        .single();
      if (!error) return NextResponse.json({ coupon: data }, { status: 201 });
      if (!error.message.includes("coupons_code_key")) throw error;
    }
    throw new Error("No se pudo generar un código único. Intentá de nuevo.");
  } catch (cause: unknown) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "No se pudo crear el cupón." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  const onlyInactive = request.nextUrl.searchParams.get("onlyInactive") === "true";
  let query = supabase.from("coupons").delete();
  if (onlyInactive) {
    query = query.eq("is_active", false);
  } else {
    query = query.neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
