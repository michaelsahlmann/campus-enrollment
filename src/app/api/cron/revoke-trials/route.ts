import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { learnhouse } from "@/lib/learnhouse";

export async function GET(request: NextRequest) {
  return handleRevoke(request);
}

export async function POST(request: NextRequest) {
  return handleRevoke(request);
}

async function handleRevoke(request: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada." }, { status: 503 });
  }

  // Opcional: Proteger con CRON_SECRET si está definido en variables de entorno
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const nowIso = new Date().toISOString();

    // Buscar matrículas vencidas que aún no hayan sido revocadas
    const { data: expiredEnrollments, error } = await supabase
      .from("enrollments")
      .select(`
        id,
        expires_at,
        is_revoked,
        student_id,
        course_id,
        students (
          id,
          name,
          email,
          learnhouse_user_id
        ),
        courses (
          id,
          name,
          course_uuid
        )
      `)
      .not("expires_at", "is", null)
      .lte("expires_at", nowIso)
      .or("is_revoked.is.null,is_revoked.eq.false");

    if (error) {
      console.error("Error al buscar trials expirados:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!expiredEnrollments || expiredEnrollments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay accesos de prueba (trials) pendientes de revocación.",
        revokedCount: 0,
      });
    }

    const results = [];

    for (const item of expiredEnrollments) {
      const student = Array.isArray(item.students) ? item.students[0] : item.students;
      const course = Array.isArray(item.courses) ? item.courses[0] : item.courses;

      if (!student?.learnhouse_user_id || !course?.course_uuid) {
        continue;
      }

      try {
        // Ejecutar desmatriculación en LearnHouse
        await learnhouse.unenrollUser(student.learnhouse_user_id, course.course_uuid);

        // Actualizar registro en Supabase
        await supabase
          .from("enrollments")
          .update({
            is_revoked: true,
            learnhouse_status: "trial_expired",
            notes: `Trial revocado automáticamente el ${new Date().toLocaleDateString("es-PY")}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          enrollmentId: item.id,
          studentName: student.name,
          studentEmail: student.email,
          courseName: course.name,
          expiredAt: item.expires_at,
          status: "revoked",
        });
      } catch (err: unknown) {
        console.error(`Error al revocar trial para ${student.email}:`, err);
        results.push({
          enrollmentId: item.id,
          studentEmail: student.email,
          status: "error",
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

    return NextResponse.json({
      success: true,
      revokedCount: results.filter((r) => r.status === "revoked").length,
      processed: results,
    });
  } catch (cause: unknown) {
    console.error("Error en cron de revocación de trials:", cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Error al procesar revocaciones." },
      { status: 500 }
    );
  }
}
