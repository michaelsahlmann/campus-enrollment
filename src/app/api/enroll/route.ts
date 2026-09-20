import { NextRequest, NextResponse } from "next/server";
import { learnhouse } from "@/lib/learnhouse";
import { getAdminSupabase } from "@/lib/supabase";
import { DEFAULT_COURSES } from "@/lib/courses";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      course_uuid,
      payment_method = "manual",
      amount_paid = 0,
      notes = "",
    } = body;

    if (!email || !course_uuid) {
      return NextResponse.json(
        { error: "Correo electrónico y curso son obligatorios." },
        { status: 400 }
      );
    }

    const studentName = (name || email.split("@")[0]).trim();
    const studentEmail = email.trim().toLowerCase();

    // 1. Matricular en LearnHouse (API en vivo)
    const lhResult = await learnhouse.provisionAndEnroll({
      name: studentName,
      email: studentEmail,
      courseUuid: course_uuid,
    });

    // 2. Persistir en Supabase (si está configurado)
    let supabaseRecord = null;
    const supabase = getAdminSupabase();

    if (supabase) {
      try {
        // Upsert alumno en tabla students
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .upsert(
            {
              email: studentEmail,
              name: studentName,
              phone: phone || null,
              learnhouse_user_id: lhResult.user.id,
              learnhouse_user_uuid: lhResult.user.user_uuid,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" }
          )
          .select()
          .single();

        if (!studentError && studentData) {
          // Buscar el curso en Supabase o crear vínculo
          const { data: courseData } = await supabase
            .from("courses")
            .select("id, name")
            .eq("course_uuid", course_uuid)
            .maybeSingle();

          let courseId = courseData?.id;
          let resolvedCourseName = courseData?.name;

          if (!courseId) {
            const courseMeta = DEFAULT_COURSES.find(
              (c) => c.course_uuid === course_uuid
            );
            resolvedCourseName = courseMeta?.name || "Curso LearnHouse";
            const { data: newCourse } = await supabase
              .from("courses")
              .insert({
                name: resolvedCourseName,
                course_uuid: course_uuid,
                price_pyg: courseMeta?.price_pyg || 0,
                price_usd: courseMeta?.price_usd || 0,
              })
              .select("id, name")
              .single();
            courseId = newCourse?.id;
            if (newCourse?.name) resolvedCourseName = newCourse.name;
          }

          if (courseId) {
            const { data: enrollmentData } = await supabase
              .from("enrollments")
              .insert({
                student_id: studentData.id,
                course_id: courseId,
                payment_status: "paid",
                payment_method: payment_method,
                amount_paid: amount_paid,
                learnhouse_status: "enrolled",
                magic_link: lhResult.magicLink,
                notes: notes,
              })
              .select()
              .single();

            supabaseRecord = {
              student: studentData,
              enrollment: enrollmentData,
              courseName: resolvedCourseName,
            };
          }
        }
      } catch (dbErr) {
        console.error("Error al persistir en Supabase:", dbErr);
        // Continuamos: la matrícula en LearnHouse ya fue exitosa
      }
    }

    const courseInfo = DEFAULT_COURSES.find(
      (c) => c.course_uuid === course_uuid
    );

    const finalCourseName =
      (supabaseRecord as { courseName?: string } | null)?.courseName ||
      courseInfo?.name ||
      "Curso";

    return NextResponse.json({
      success: true,
      message: lhResult.isNewUser
        ? "Alumno creado y matriculado con éxito."
        : "Alumno existente matriculado con éxito.",
      data: {
        student: {
          id: lhResult.user.id,
          name: studentName,
          email: studentEmail,
          phone: phone || "",
          isNewUser: lhResult.isNewUser,
          tempPassword: lhResult.tempPassword,
        },
        tempPassword: lhResult.tempPassword,
        course: {
          uuid: course_uuid,
          name: finalCourseName,
        },
        magicLink: lhResult.magicLink,
        supabaseRecord,
      },
    });
  } catch (error: unknown) {
    console.error("Error en /api/enroll:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno al procesar la matrícula." },
      { status: 500 }
    );
  }
}
