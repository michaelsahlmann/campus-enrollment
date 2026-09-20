import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase";
import CheckoutForm from "./checkout-form";

export default async function CheckoutPage(props: { params: Promise<{ courseUuid: string }> }) {
  const { courseUuid: checkoutSlug } = await props.params;
  const supabase = getAdminSupabase();
  if (!supabase) notFound();

  const { data: checkout } = await supabase.from("checkout_links").select("slug, title, price_pyg, courses(name, course_uuid, description)").eq("slug", checkoutSlug).eq("is_active", true).maybeSingle();
  const course = Array.isArray(checkout?.courses) ? checkout.courses[0] : checkout?.courses;
  if (!checkout || !course) notFound();

  return <CheckoutForm course={{ ...course, name: checkout.title, price_pyg: Number(checkout.price_pyg || 0) }} checkoutSlug={checkout.slug} />;
}
