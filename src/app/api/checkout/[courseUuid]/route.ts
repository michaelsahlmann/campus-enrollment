import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function GET(_request: Request, props: { params: Promise<{ courseUuid: string }> }) {
  const { courseUuid } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Checkout no configurado." }, { status: 503 });

  const { data, error } = await supabase
    .from("courses")
    .select("id, name, course_uuid, description, price_pyg, price_usd")
    .eq("course_uuid", courseUuid)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Curso no disponible." }, { status: 404 });
  return NextResponse.json({ course: data });
}
