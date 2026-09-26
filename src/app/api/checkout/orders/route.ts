import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { learnhouse } from "@/lib/learnhouse";

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
    const paymentMethod = value(formData, "payment_method") || "transfer";
    const couponCode = value(formData, "coupon_code").toUpperCase();
    const trialDaysParam = value(formData, "trial_days");
    const proof = formData.get("payment_proof");

    if (!courseUuid || !name || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Nombre, correo válido y curso son obligatorios." }, { status: 400 });
    }

    let checkoutId: string | null = null;
    let courseId: string | null = null;
    let resolvedCourseUuid = courseUuid;
    let originalAmount = 0;

    // 1. Buscar en checkout_links
    const { data: checkout } = await supabase
      .from("checkout_links")
      .select("id, course_id, price_pyg, courses(id, course_uuid, price_pyg)")
      .eq("slug", checkoutSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (checkout) {
      checkoutId = checkout.id;
      courseId = checkout.course_id;
      originalAmount = Number(checkout.price_pyg || 0);
      const c = Array.isArray(checkout.courses) ? checkout.courses[0] : checkout.courses;
      if (c?.course_uuid) resolvedCourseUuid = c.course_uuid;
    } else {
      // 2. Fallback directo a courses
      const targetIdentifier = courseUuid || checkoutSlug;
      const { data: directCourse } = await supabase
        .from("courses")
        .select("id, price_pyg, course_uuid")
        .or(`course_uuid.eq.${targetIdentifier},id.eq.${targetIdentifier}`)
        .eq("is_active", true)
        .maybeSingle();

      if (directCourse) {
        courseId = directCourse.id;
        resolvedCourseUuid = directCourse.course_uuid;
        originalAmount = Number(directCourse.price_pyg || 0);
      }
    }

    if (!courseId) {
      return NextResponse.json({ error: "El curso no está disponible." }, { status: 404 });
    }

    let coupon: Coupon | null = null;
    if (couponCode) {
      const { data } = await supabase
        .from("coupons")
        .select("id, code, discount_type, discount_value")
        .eq("code", couponCode)
        .eq("is_active", true)
        .maybeSingle();
      coupon = data as Coupon | null;
      if (!coupon) return NextResponse.json({ error: "El cupón no es válido o ya no está activo." }, { status: 400 });
    }

    const discountAmount = coupon
      ? Math.min(
          originalAmount,
          coupon.discount_type === "percentage"
            ? (originalAmount * Number(coupon.discount_value)) / 100
            : Number(coupon.discount_value)
        )
      : 0;

    const amountDue = Math.max(0, originalAmount - discountAmount);
    const isFreeOrFullDiscount = amountDue === 0;

    if (!isFreeOrFullDiscount && paymentMethod !== "transfer" && paymentMethod !== "cash") {
      return NextResponse.json({ error: "Método de pago inválido." }, { status: 400 });
    }

    let proofPath: string | null = null;
    if (!isFreeOrFullDiscount && proof instanceof File && proof.size > 0) {
      if (proof.size > MAX_PROOF_SIZE || !ALLOWED_TYPES.has(proof.type)) {
        return NextResponse.json({ error: "El comprobante debe ser JPG, PNG o PDF y pesar hasta 5 MB." }, { status: 400 });
      }
      const extension = proof.type === "application/pdf" ? "pdf" : proof.type === "image/png" ? "png" : "jpg";
      proofPath = `pending/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(proofPath, proof, { contentType: proof.type });
      if (uploadError) throw uploadError;
    }

    // Cálculo de fecha de expiración si es trial (7, 15, 30 días)
    const trialDays = trialDaysParam ? parseInt(trialDaysParam, 10) : 0;
    const expiresAt = trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const reference = `CE-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;

    // Si el acceso es 100% gratuito (cupón 100% o beca), matriculamos de inmediato en LearnHouse
    if (isFreeOrFullDiscount) {
      const enrollResult = await learnhouse.provisionAndEnroll({
        name,
        email,
        courseUuid: resolvedCourseUuid,
      });

      const { data: student } = await supabase
        .from("students")
        .upsert(
          {
            email,
            name,
            phone: phone || null,
            learnhouse_user_id: enrollResult.user.id,
            learnhouse_user_uuid: enrollResult.user.user_uuid,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        )
        .select("id")
        .single();

      const { data: enrollment } = await supabase
        .from("enrollments")
        .upsert(
          {
            student_id: student?.id,
            course_id: courseId,
            payment_status: "paid",
            payment_method: "coupon_100",
            learnhouse_status: "enrolled",
            magic_link: enrollResult.magicLink,
            expires_at: expiresAt,
            notes: `Cupón 100% / Gratuito (${coupon?.code || "BECA"})${trialDays > 0 ? ` - Trial ${trialDays} días` : ""}`,
          },
          { onConflict: "student_id,course_id" }
        )
        .select("id")
        .single();

      const { data: order } = await supabase
        .from("orders")
        .insert({
          reference,
          course_id: courseId,
          customer_name: name,
          customer_email: email,
          customer_phone: phone || null,
          payment_method: "coupon_100",
          coupon_id: coupon?.id || null,
          coupon_code: coupon?.code || null,
          checkout_link_id: checkoutId,
          amount_original: originalAmount,
          discount_amount: discountAmount,
          amount_due: 0,
          status: "paid",
          reviewed_at: new Date().toISOString(),
          enrollment_id: enrollment?.id || null,
        })
        .select("id, reference")
        .single();

      return NextResponse.json({
        success: true,
        reference: order?.reference || reference,
        autoEnrolled: true,
        magicLink: enrollResult.magicLink,
        tempPassword: enrollResult.tempPassword,
        isNewUser: enrollResult.isNewUser,
        student: {
          name,
          email,
          phone: phone || "",
        },
      });
    }

    // Flujo normal de pago con transferencia bancaria (requiere revisión o comprobante)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
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
        amount_due: amountDue,
        payment_proof_path: proofPath,
      })
      .select("id, reference")
      .single();

    if (orderError) {
      if (proofPath) await supabase.storage.from("payment-proofs").remove([proofPath]);
      throw orderError;
    }

    return NextResponse.json({ success: true, reference: order.reference });
  } catch (error: unknown) {
    console.error("Error al crear orden:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo registrar el pago." },
      { status: 500 }
    );
  }
}
