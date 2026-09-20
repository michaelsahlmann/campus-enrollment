import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { DEFAULT_COURSES } from "@/lib/courses";
import { learnhouse, type LearnHouseCourse } from "@/lib/learnhouse";

type StoredCourse = {
  course_uuid: string;
  price_pyg: number | null;
  price_usd: number | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido.";
}

export async function GET() {
  const supabase = getAdminSupabase();

  if (!supabase) {
    return NextResponse.json({
      fromDb: false,
      courses: DEFAULT_COURSES,
    });
  }

  try {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        fromDb: false,
        courses: DEFAULT_COURSES,
      });
    }

    return NextResponse.json({
      fromDb: true,
      courses: data,
    });
  } catch {
    return NextResponse.json({
      fromDb: false,
      courses: DEFAULT_COURSES,
    });
  }
}

export async function POST() {
  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase no está configurado; no se puede guardar la sincronización." },
      { status: 503 }
    );
  }

  try {
    const remoteCourses = await learnhouse.listCourses();
    const { data: storedCourses, error: storedError } = await supabase
      .from("courses")
      .select("course_uuid, price_pyg, price_usd");

    if (storedError) throw storedError;

    const storedByUuid = new Map(
      ((storedCourses || []) as StoredCourse[]).map((course) => [course.course_uuid, course])
    );
    const coursesToUpsert = remoteCourses.map((course: LearnHouseCourse) => {
      const stored = storedByUuid.get(course.course_uuid);
      return {
        course_uuid: course.course_uuid,
        name: course.name,
        description: course.description,
        is_active: course.published,
        price_pyg: stored?.price_pyg ?? 0,
        price_usd: stored?.price_usd ?? 0,
      };
    });

    if (coursesToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("courses")
        .upsert(coursesToUpsert, { onConflict: "course_uuid" });
      if (upsertError) throw upsertError;
    }

    const remoteCourseUuids = new Set(remoteCourses.map((course) => course.course_uuid));
    const coursesToDeactivate = ((storedCourses || []) as StoredCourse[])
      .filter((course) => !remoteCourseUuids.has(course.course_uuid))
      .map((course) => course.course_uuid);

    if (coursesToDeactivate.length > 0) {
      const { error: deactivateError } = await supabase
        .from("courses")
        .update({ is_active: false })
        .in("course_uuid", coursesToDeactivate);
      if (deactivateError) throw deactivateError;
    }

    return NextResponse.json({
      success: true,
      synced: coursesToUpsert.length,
      deactivated: coursesToDeactivate.length,
      courses: coursesToUpsert,
    });
  } catch (error: unknown) {
    console.error("Error al sincronizar cursos:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 502 });
  }
}
