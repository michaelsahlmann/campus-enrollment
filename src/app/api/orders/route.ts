import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getAdminSupabase();
  if (!supabase) return NextResponse.json({ configured: false, orders: [] });
  const { data, error } = await supabase.from("orders").select("id, reference, customer_name, customer_email, customer_phone, payment_method, status, payment_proof_path, created_at, courses(name, course_uuid)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message, orders: [] }, { status: 500 });
  const orders = await Promise.all((data || []).map(async (order) => {
    if (!order.payment_proof_path) return order;
    const { data: signedProof } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(order.payment_proof_path, 60 * 10);
    return { ...order, proof_url: signedProof?.signedUrl || null };
  }));
  return NextResponse.json({ configured: true, orders });
}
