import { getAdminSupabase } from "@/lib/supabase";
import CheckoutManager from "./checkout-manager";

export default async function CheckoutsPage() {
  const supabase = getAdminSupabase();
  if (!supabase) return <main>Supabase no configurado.</main>;
  const [{ data: courses }, { data: checkouts }, { data: coupons }] = await Promise.all([
    supabase.from("courses").select("id, name, price_pyg").eq("is_active", true).order("name"),
    supabase.from("checkout_links").select("id, slug, title, price_pyg, is_active, courses(name)").order("created_at", { ascending: false }),
    supabase.from("coupons").select("id, code, name, discount_type, discount_value, is_active").order("created_at", { ascending: false }),
  ]);
  return <CheckoutManager courses={courses || []} initialCheckouts={checkouts || []} initialCoupons={coupons || []} />;
}
