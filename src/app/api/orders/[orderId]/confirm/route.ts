import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { learnhouse } from "@/lib/learnhouse";

export async function POST(_request: Request, props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  try {
    const { data: order, error } = await supabase.from("orders").select("id, status, customer_name, customer_email, customer_phone, payment_method, course_id, courses(name, course_uuid)").eq("id", orderId).single();
    if (error || !order) return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ success: true, alreadyConfirmed: true });
    const course = Array.isArray(order.courses) ? order.courses[0] : order.courses;
    if (!course) return NextResponse.json({ error: "Curso de la orden no encontrado." }, { status: 422 });

    const result = await learnhouse.provisionAndEnroll({ name: order.customer_name, email: order.customer_email, courseUuid: course.course_uuid });
    const { data: student, error: studentError } = await supabase.from("students").upsert({ email: order.customer_email, name: order.customer_name, phone: order.customer_phone || null, learnhouse_user_id: result.user.id, learnhouse_user_uuid: result.user.user_uuid, updated_at: new Date().toISOString() }, { onConflict: "email" }).select("id").single();
    if (studentError || !student) throw studentError || new Error("No se pudo guardar el alumno.");
    const { data: enrollment, error: enrollmentError } = await supabase.from("enrollments").upsert({ student_id: student.id, course_id: order.course_id, payment_status: "paid", payment_method: order.payment_method, learnhouse_status: "enrolled", magic_link: result.magicLink, notes: `Orden ${order.id}` }, { onConflict: "student_id,course_id" }).select("id").single();
    if (enrollmentError || !enrollment) throw enrollmentError || new Error("No se pudo guardar la matrícula.");
    const { error: updateError } = await supabase.from("orders").update({ status: "paid", reviewed_at: new Date().toISOString(), enrollment_id: enrollment.id }).eq("id", order.id);
    if (updateError) throw updateError;
    return NextResponse.json({ success: true, magicLink: result.magicLink, student: result.user, course });
  } catch (cause: unknown) {
    console.error("Error al confirmar orden:", cause);
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "No se pudo confirmar la orden." }, { status: 500 });
  }
}
