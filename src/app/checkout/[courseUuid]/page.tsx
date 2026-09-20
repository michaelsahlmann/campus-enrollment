import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase";
import { DEFAULT_COURSES } from "@/lib/courses";
import { getBankSettings } from "@/lib/settings";
import CheckoutForm from "./checkout-form";

export default async function CheckoutPage(props: { params: Promise<{ courseUuid: string }> }) {
  const { courseUuid: checkoutSlug } = await props.params;
  const supabase = getAdminSupabase();
  const bankSettings = await getBankSettings();

  let resolvedTitle = "";
  let resolvedPrice = 0;
  let resolvedCourse: { name: string; course_uuid: string; description: string | null; price_pyg: number } | null = null;
  let resolvedSlug = checkoutSlug;

  if (supabase) {
    // 1. Try finding custom checkout link by slug
    const { data: checkout } = await supabase
      .from("checkout_links")
      .select("slug, title, price_pyg, courses(name, course_uuid, description)")
      .eq("slug", checkoutSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (checkout) {
      const c = Array.isArray(checkout.courses) ? checkout.courses[0] : checkout.courses;
      if (c) {
        resolvedTitle = checkout.title;
        resolvedPrice = Number(checkout.price_pyg || 0);
        resolvedCourse = {
          name: c.name,
          course_uuid: c.course_uuid,
          description: c.description,
          price_pyg: resolvedPrice,
        };
        resolvedSlug = checkout.slug;
      }
    }

    // 2. If not found in checkout_links, try finding in courses table
    if (!resolvedCourse) {
      const { data: courseDb } = await supabase
        .from("courses")
        .select("name, course_uuid, description, price_pyg")
        .or(`course_uuid.eq.${checkoutSlug},id.eq.${checkoutSlug}`)
        .eq("is_active", true)
        .maybeSingle();

      if (courseDb) {
        resolvedTitle = courseDb.name;
        resolvedPrice = Number(courseDb.price_pyg || 0);
        resolvedCourse = {
          name: courseDb.name,
          course_uuid: courseDb.course_uuid,
          description: courseDb.description,
          price_pyg: resolvedPrice,
        };
      }
    }
  }

  // 3. Fallback to DEFAULT_COURSES if still not resolved
  if (!resolvedCourse) {
    const defaultCourse = DEFAULT_COURSES.find(
      (c) => c.course_uuid === checkoutSlug || c.id === checkoutSlug
    );
    if (defaultCourse) {
      resolvedTitle = defaultCourse.name;
      resolvedPrice = defaultCourse.price_pyg;
      resolvedCourse = {
        name: defaultCourse.name,
        course_uuid: defaultCourse.course_uuid,
        description: defaultCourse.description,
        price_pyg: defaultCourse.price_pyg,
      };
    }
  }

  if (!resolvedCourse) {
    notFound();
  }

  return (
    <CheckoutForm
      course={{
        ...resolvedCourse,
        name: resolvedTitle || resolvedCourse.name,
        price_pyg: resolvedPrice,
      }}
      checkoutSlug={resolvedSlug}
      bankSettings={bankSettings}
    />
  );
}
