import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const slug = () => Array.from({ length: 8 }, () => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length]).join("");

export async function GET() {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const { data, error } = await supabase.from("checkout_links").select("id, slug, title, price_pyg, is_active, created_at, courses(name, course_uuid)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checkouts: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const body = await request.json() as { title?: string; courseId?: string; pricePyg?: number };
  if (!body.title?.trim() || !body.courseId || !Number.isFinite(Number(body.pricePyg)) || Number(body.pricePyg) < 0) return NextResponse.json({ error: "Completá título, curso y precio." }, { status: 400 });
  for (let i = 0; i < 5; i += 1) {
    const { data, error } = await supabase.from("checkout_links").insert({ slug: slug(), title: body.title.trim(), course_id: body.courseId, price_pyg: Number(body.pricePyg) }).select("id, slug, title, price_pyg, is_active").single();
    if (!error) return NextResponse.json({ checkout: data }, { status: 201 });
    if (!error.message.includes("checkout_links_slug_key")) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "No se pudo generar una URL única." }, { status: 500 });
}
