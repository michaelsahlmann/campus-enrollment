import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase";
import CheckoutForm from "./checkout-form";

export default async function CheckoutPage(props: { params: Promise<{ courseUuid: string }> }) {
  const { courseUuid } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("name, course_uuid, description, price_pyg")
    .eq("course_uuid", courseUuid)
    .eq("is_active", true)
    .maybeSingle();
  if (!course) notFound();

  return <CheckoutForm course={{ ...course, price_pyg: Number(course.price_pyg || 0) }} />;
}
