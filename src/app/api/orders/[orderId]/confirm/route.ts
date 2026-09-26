import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { learnhouse } from "@/lib/learnhouse";

export async function POST(_request: Request, props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, customer_name, customer_email, customer_phone, payment_method, course_id, checkout_link_id, courses(name, course_uuid)")
      .eq("id", orderId)
      .single();
    if (error || !order) return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ success: true, alreadyConfirmed: true });
    const course = Array.isArray(order.courses) ? order.courses[0] : order.courses;
    if (!course) return NextResponse.json({ error: "Curso de la orden no encontrado." }, { status: 422 });

    // Calcular expiración si la orden provino de un checkout con vigencia o trial
    let calculatedExpiresAt: string | null = null;
    let resolvedTrialDays: number | null = null;
    if (order.checkout_link_id) {
      const { data: cl } = await supabase
        .from("checkout_links")
        .select("trial_days, expires_at")
        .eq("id", order.checkout_link_id)
        .maybeSingle();

      if (cl) {
        if (cl.expires_at) {
          calculatedExpiresAt = new Date(cl.expires_at).toISOString();
        } else if (cl.trial_days && cl.trial_days > 0) {
          resolvedTrialDays = cl.trial_days;
          calculatedExpiresAt = new Date(Date.now() + cl.trial_days * 24 * 60 * 60 * 1000).toISOString();
        }
      }
    }

    const result = await learnhouse.provisionAndEnroll({ name: order.customer_name, email: order.customer_email, courseUuid: course.course_uuid });
    const { data: student, error: studentError } = await supabase.from("students").upsert({ email: order.customer_email, name: order.customer_name, phone: order.customer_phone || null, learnhouse_user_id: result.user.id, learnhouse_user_uuid: result.user.user_uuid, updated_at: new Date().toISOString() }, { onConflict: "email" }).select("id").single();
    if (studentError || !student) throw studentError || new Error("No se pudo guardar el alumno.");
    const { data: enrollment, error: enrollmentError } = await supabase.from("enrollments").upsert({
      student_id: student.id,
      course_id: order.course_id,
      payment_status: "paid",
      payment_method: order.payment_method,
      learnhouse_status: "enrolled",
      magic_link: result.magicLink,
      trial_days: resolvedTrialDays,
      expires_at: calculatedExpiresAt,
      is_revoked: false,
      notes: `Orden ${order.id}${calculatedExpiresAt ? ` - Vigencia hasta ${new Date(calculatedExpiresAt).toLocaleDateString("es-PY")}` : ""}`
    }, { onConflict: "student_id,course_id" }).select("id").single();
    if (enrollmentError || !enrollment) throw enrollmentError || new Error("No se pudo guardar la matrícula.");
    const { error: updateError } = await supabase.from("orders").update({ status: "paid", reviewed_at: new Date().toISOString(), enrollment_id: enrollment.id }).eq("id", order.id);
    if (updateError) throw updateError;
    return NextResponse.json({
      success: true,
      student: {
        ...result.user,
        name: order.customer_name,
        phone: order.customer_phone || "",
        isNewUser: result.isNewUser,
      },
      isNewUser: result.isNewUser,
      course,
    });
  } catch (cause: unknown) {
    console.error("Error al confirmar orden:", cause);
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "No se pudo confirmar la orden." }, { status: 500 });
  }
}
