import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_PROOF_SIZE = 5 * 1024 * 1024;
type Coupon = { id: string; code: string; discount_type: "percentage" | "fixed"; discount_value: number };

function value(formData: FormData, field: string) {
  const item = formData.get(field);
  return typeof item === "string" ? item.trim() : "";
}

export async function POST(request: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Checkout no configurado." }, { status: 503 });

  try {
    const formData = await request.formData();
    const courseUuid = value(formData, "course_uuid");
    const checkoutSlug = value(formData, "checkout_slug");
    const name = value(formData, "name");
    const email = value(formData, "email").toLowerCase();
    const phone = value(formData, "phone");
    const paymentMethod = value(formData, "payment_method");
    const couponCode = value(formData, "coupon_code").toUpperCase();
    const proof = formData.get("payment_proof");

    if (!courseUuid || !name || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Nombre, correo válido y curso son obligatorios." }, { status: 400 });
    }
    if (paymentMethod !== "transfer" && paymentMethod !== "cash") {
      return NextResponse.json({ error: "Método de pago inválido." }, { status: 400 });
    }
    if (proof instanceof File && (proof.size > MAX_PROOF_SIZE || !ALLOWED_TYPES.has(proof.type))) {
      return NextResponse.json({ error: "El comprobante debe ser JPG, PNG o PDF y pesar hasta 5 MB." }, { status: 400 });
    }

    let checkoutId: string | null = null;
    let courseId: string | null = null;
    let originalAmount = 0;

    // 1. Try finding checkout link
    const { data: checkout } = await supabase
      .from("checkout_links")
      .select("id, course_id, price_pyg")
      .eq("slug", checkoutSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (checkout) {
      checkoutId = checkout.id;
      courseId = checkout.course_id;
      originalAmount = Number(checkout.price_pyg || 0);
    } else {
      // 2. Direct course checkout fallback
      const targetIdentifier = courseUuid || checkoutSlug;
      const { data: directCourse } = await supabase
        .from("courses")
        .select("id, price_pyg, course_uuid")
        .or(`course_uuid.eq.${targetIdentifier},id.eq.${targetIdentifier}`)
        .eq("is_active", true)
        .maybeSingle();

      if (directCourse) {
        courseId = directCourse.id;
        originalAmount = Number(directCourse.price_pyg || 0);
      }
    }

    if (!courseId) {
      return NextResponse.json({ error: "El curso no está disponible." }, { status: 404 });
    }

    let coupon: Coupon | null = null;
    if (couponCode) {
      const { data } = await supabase.from("coupons").select("id, code, discount_type, discount_value").eq("code", couponCode).eq("is_active", true).maybeSingle();
      coupon = data as Coupon | null;
      if (!coupon) return NextResponse.json({ error: "El cupón no es válido o ya no está activo." }, { status: 400 });
    }

    const discountAmount = coupon ? Math.min(originalAmount, coupon.discount_type === "percentage" ? (originalAmount * Number(coupon.discount_value)) / 100 : Number(coupon.discount_value)) : 0;
    const reference = `CE-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      reference,
      course_id: courseId,
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      payment_method: paymentMethod,
      coupon_id: coupon?.id || null,
      coupon_code: coupon?.code || null,
      checkout_link_id: checkoutId,
      amount_original: originalAmount,
      discount_amount: discountAmount,
      amount_due: originalAmount - discountAmount,
    }).select("id, reference").single();
    if (orderError) throw orderError;

    if (proof instanceof File && proof.size > 0) {
      const extension = proof.type === "application/pdf" ? "pdf" : proof.type === "image/png" ? "png" : "jpg";
      const path = `${order.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, proof, { contentType: proof.type });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from("orders").update({ payment_proof_path: path }).eq("id", order.id);
      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true, reference: order.reference });
  } catch (error: unknown) {
    console.error("Error al crear orden:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar el pago." }, { status: 500 });
  }
}
