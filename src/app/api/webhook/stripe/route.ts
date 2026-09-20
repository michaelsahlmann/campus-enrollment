import { NextRequest, NextResponse } from "next/server";
import { learnhouse } from "@/lib/learnhouse";
import { getAdminSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    // Verificamos si es un evento checkout.session.completed de Stripe
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || "Alumno";
      const courseUuid =
        session.metadata?.course_uuid ||
        "course_8bbc2b81-c213-4c9d-86f2-ce613dc6cdac"; // Default Bolsa de Valores
      const amount = (session.amount_total || 0) / 100;
      const currency = (session.currency || "usd").toUpperCase();

      if (!customerEmail) {
        return NextResponse.json(
          { error: "No customer email found in session" },
          { status: 400 }
        );
      }

      // Matricular en LearnHouse
      const lhResult = await learnhouse.provisionAndEnroll({
        name: customerName,
        email: customerEmail,
        courseUuid,
      });

      // Guardar en Supabase
      const supabase = getAdminSupabase();
      if (supabase) {
        const { data: student } = await supabase
          .from("students")
          .upsert(
            {
              email: customerEmail.toLowerCase(),
              name: customerName,
              learnhouse_user_id: lhResult.user.id,
              learnhouse_user_uuid: lhResult.user.user_uuid,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          )
          .select()
          .single();

        if (student) {
          const { data: course } = await supabase
            .from("courses")
            .select("id")
            .eq("course_uuid", courseUuid)
            .maybeSingle();

          if (course) {
            await supabase.from("enrollments").insert({
              student_id: student.id,
              course_id: course.id,
              payment_status: "paid",
              payment_method: "stripe",
              amount_paid: amount,
              currency,
              learnhouse_status: "enrolled",
              magic_link: lhResult.magicLink,
              notes: `Stripe Session: ${session.id}`,
            });
          }
        }
      }

      return NextResponse.json({
        received: true,
        enrolled: true,
        studentEmail: customerEmail,
        magicLink: lhResult.magicLink,
      });
    }

    return NextResponse.json({ received: true, ignored: true });
  } catch (err: any) {
    console.error("Error en webhook de Stripe:", err);
    return NextResponse.json(
      { error: err.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
