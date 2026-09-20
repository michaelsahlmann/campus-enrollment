import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  const courseUuid = request.nextUrl.searchParams.get("course_uuid");
  const checkoutSlug = request.nextUrl.searchParams.get("checkout_slug");
  const supabase = getAdminSupabase();
  if (!supabase || !code || !courseUuid) return NextResponse.json({ error: "Cupón o curso inválido." }, { status: 400 });
  const [{ data: coupon }, { data: course }, { data: checkout }] = await Promise.all([
    supabase.from("coupons").select("id, code, name, discount_type, discount_value").eq("code", code).eq("is_active", true).maybeSingle(),
    supabase.from("courses").select("price_pyg").eq("course_uuid", courseUuid).eq("is_active", true).maybeSingle(),
    supabase.from("checkout_links").select("price_pyg").eq("slug", checkoutSlug || "").eq("is_active", true).maybeSingle(),
  ]);
  if (!coupon || !course) return NextResponse.json({ error: "Cupón inválido o inactivo." }, { status: 404 });
  const price = Number(checkout?.price_pyg ?? course.price_pyg ?? 0);
  const discount = Math.min(price, coupon.discount_type === "percentage" ? price * Number(coupon.discount_value) / 100 : Number(coupon.discount_value));
  return NextResponse.json({ coupon: { code: coupon.code, name: coupon.name }, discount, amountDue: price - discount });
}
