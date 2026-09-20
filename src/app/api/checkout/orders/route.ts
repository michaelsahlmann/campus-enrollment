import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_PROOF_SIZE = 5 * 1024 * 1024;

function value(formData: FormData, field: string) {
  const item = formData.get(field);
  return typeof item === "string" ? item.trim() : "";
}

export async function POST(request: NextRequest) {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Checkout no configurado." }, { status: 503 });

  try {
    const formData = await request.formData();
    const courseUuid = value(formData, "course_uuid");
    const name = value(formData, "name");
    const email = value(formData, "email").toLowerCase();
    const phone = value(formData, "phone");
    const paymentMethod = value(formData, "payment_method");
    const proof = formData.get("payment_proof");

    if (!courseUuid || !name || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Nombre, correo válido y curso son obligatorios." }, { status: 400 });
    }
    if (paymentMethod !== "transfer" && paymentMethod !== "cash") {
      return NextResponse.json({ error: "Método de pago inválido." }, { status: 400 });
    }
    if (proof instanceof File && (proof.size > MAX_PROOF_SIZE || !ALLOWED_TYPES.has(proof.type))) {
      return NextResponse.json({ error: "El comprobante debe ser JPG, PNG o PDF y pesar hasta 5 MB." }, { status: 400 });
    }

    const { data: course, error: courseError } = await supabase
      .from("courses").select("id").eq("course_uuid", courseUuid).eq("is_active", true).maybeSingle();
    if (courseError) throw courseError;
    if (!course) return NextResponse.json({ error: "El curso no está disponible." }, { status: 404 });

    const reference = `CE-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      reference, course_id: course.id, customer_name: name, customer_email: email,
      customer_phone: phone || null, payment_method: paymentMethod,
    }).select("id, reference").single();
    if (orderError) throw orderError;

    if (proof instanceof File && proof.size > 0) {
      const extension = proof.type === "application/pdf" ? "pdf" : proof.type === "image/png" ? "png" : "jpg";
      const path = `${order.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, proof, { contentType: proof.type });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from("orders").update({ payment_proof_path: path }).eq("id", order.id);
      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true, reference: order.reference });
  } catch (error: unknown) {
    console.error("Error al crear orden:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar el pago." }, { status: 500 });
  }
}
