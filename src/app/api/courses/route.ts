import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { DEFAULT_COURSES } from "@/lib/courses";

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
  } catch (err: any) {
    return NextResponse.json({
      fromDb: false,
      courses: DEFAULT_COURSES,
    });
  }
}
