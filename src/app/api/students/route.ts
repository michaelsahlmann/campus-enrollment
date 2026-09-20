import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getAdminSupabase();

  if (!supabase) {
    return NextResponse.json({
      configured: false,
      students: [],
    });
  }

  try {
    const { data, error } = await supabase
      .from("students")
      .select(`
        id,
        email,
        name,
        phone,
        learnhouse_user_id,
        created_at,
        enrollments (
          id,
          payment_status,
          payment_method,
          amount_paid,
          currency,
          learnhouse_status,
          magic_link,
          created_at,
          courses (
            id,
            name,
            course_uuid
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      configured: true,
      students: data || [],
    });
  } catch (error: unknown) {
    console.error("Error al obtener alumnos:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido.", students: [] },
      { status: 500 }
    );
  }
}
