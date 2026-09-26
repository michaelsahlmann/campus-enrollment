import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";
import { DEFAULT_COURSES } from "@/lib/courses";

const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const slug = () =>
  Array.from({ length: 8 }, () => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length]).join("");

export async function GET() {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const { data, error } = await supabase
    .from("checkout_links")
    .select("id, slug, title, price_pyg, trial_days, expires_at, is_active, created_at, courses(name, course_uuid)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checkouts: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });

  const body = (await request.json()) as {
    title?: string;
    courseId?: string;
    pricePyg?: number;
    trialDays?: number | null;
    expiresAt?: string | null;
  };
  if (!body.title?.trim() || !body.courseId || !Number.isFinite(Number(body.pricePyg)) || Number(body.pricePyg) < 0) {
    return NextResponse.json({ error: "Completá título, curso y precio válido." }, { status: 400 });
  }

  const rawCourseId = body.courseId.trim();
  let resolvedCourseDbId: string | null = null;

  // 1. Check if rawCourseId is a valid UUID format before querying id column
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCourseId);
  if (isUuid) {
    const { data: cById } = await supabase.from("courses").select("id").eq("id", rawCourseId).maybeSingle();
    if (cById) resolvedCourseDbId = cById.id;
  }

  // 2. Try querying courses table by course_uuid
  if (!resolvedCourseDbId) {
    const { data: cByUuid } = await supabase.from("courses").select("id").eq("course_uuid", rawCourseId).maybeSingle();
    if (cByUuid) resolvedCourseDbId = cByUuid.id;
  }

  // 3. Fallback: Check DEFAULT_COURSES and ensure it is saved in courses table
  if (!resolvedCourseDbId) {
    const defaultCourse = DEFAULT_COURSES.find(
      (c) => c.id === rawCourseId || c.course_uuid === rawCourseId
    );
    if (defaultCourse) {
      const { data: upsertedCourse, error: upsertError } = await supabase
        .from("courses")
        .upsert(
          {
            name: defaultCourse.name,
            course_uuid: defaultCourse.course_uuid,
            description: defaultCourse.description,
            price_pyg: defaultCourse.price_pyg,
            price_usd: defaultCourse.price_usd,
            is_active: true,
          },
          { onConflict: "course_uuid" }
        )
        .select("id")
        .single();

      if (!upsertError && upsertedCourse) {
        resolvedCourseDbId = upsertedCourse.id;
      }
    }
  }

  if (!resolvedCourseDbId) {
    return NextResponse.json({ error: "El curso seleccionado no se encontró en la base de datos." }, { status: 404 });
  }

  const trialDays = body.trialDays ? Number(body.trialDays) : null;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;

  for (let i = 0; i < 5; i += 1) {
    const { data, error } = await supabase
      .from("checkout_links")
      .insert({
        slug: slug(),
        title: body.title.trim(),
        course_id: resolvedCourseDbId,
        price_pyg: Number(body.pricePyg),
        trial_days: trialDays,
        expires_at: expiresAt,
        is_active: true,
      })
      .select("id, slug, title, price_pyg, trial_days, expires_at, is_active")
      .single();

    if (!error) return NextResponse.json({ checkout: data }, { status: 201 });
    if (!error.message.includes("checkout_links_slug_key")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "No se pudo generar una URL única." }, { status: 500 });
}
