import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase";
import { DEFAULT_COURSES } from "@/lib/courses";
import { getBankSettings } from "@/lib/settings";
import CheckoutForm from "./checkout-form";

interface ResolvedCheckout {
  title: string;
  price: number;
  course: {
    name: string;
    course_uuid: string;
    description: string | null;
    price_pyg: number;
  };
  slug: string;
}

async function resolveCheckoutData(checkoutSlug: string): Promise<ResolvedCheckout | null> {
  const supabase = getAdminSupabase();

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
        const resolvedPrice = Number(checkout.price_pyg || 0);
        return {
          title: checkout.title,
          price: resolvedPrice,
          course: {
            name: c.name,
            course_uuid: c.course_uuid,
            description: c.description,
            price_pyg: resolvedPrice,
          },
          slug: checkout.slug,
        };
      }
    }

    // 2. If not found in checkout_links, try finding in courses table
    const { data: courseDb } = await supabase
      .from("courses")
      .select("name, course_uuid, description, price_pyg")
      .or(`course_uuid.eq.${checkoutSlug},id.eq.${checkoutSlug}`)
      .eq("is_active", true)
      .maybeSingle();

    if (courseDb) {
      const resolvedPrice = Number(courseDb.price_pyg || 0);
      return {
        title: courseDb.name,
        price: resolvedPrice,
        course: {
          name: courseDb.name,
          course_uuid: courseDb.course_uuid,
          description: courseDb.description,
          price_pyg: resolvedPrice,
        },
        slug: checkoutSlug,
      };
    }
  }

  // 3. Fallback to DEFAULT_COURSES if still not resolved
  const defaultCourse = DEFAULT_COURSES.find(
    (c) => c.course_uuid === checkoutSlug || c.id === checkoutSlug
  );
  if (defaultCourse) {
    return {
      title: defaultCourse.name,
      price: defaultCourse.price_pyg,
      course: {
        name: defaultCourse.name,
        course_uuid: defaultCourse.course_uuid,
        description: defaultCourse.description,
        price_pyg: defaultCourse.price_pyg,
      },
      slug: checkoutSlug,
    };
  }

  return null;
}

export async function generateMetadata(props: {
  params: Promise<{ courseUuid: string }>;
}): Promise<Metadata> {
  const { courseUuid } = await props.params;
  const data = await resolveCheckoutData(courseUuid);

  if (!data) {
    return {
      title: "Checkout de Matrícula | Campus Michael Sahlmann",
      description: "Portal oficial de matriculación y pago de cursos.",
    };
  }

  const formattedPrice = Number(data.price || 0).toLocaleString("es-PY");
  const title = `${data.title} | Inscripción`;
  const description = `Completa tu inscripción a ${data.title}. Inversión: ${formattedPrice} PYG. Acceso inmediato al Campus Virtual tras confirmación.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "es_PY",
      siteName: "Campus Michael Sahlmann",
    },
    alternates: {
      canonical: `/checkout/${data.slug}`,
    },
  };
}

export default async function CheckoutPage(props: { params: Promise<{ courseUuid: string }> }) {
  const { courseUuid: checkoutSlug } = await props.params;
  const [data, bankSettings] = await Promise.all([
    resolveCheckoutData(checkoutSlug),
    getBankSettings(),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <CheckoutForm
      course={{
        ...data.course,
        name: data.title || data.course.name,
        price_pyg: data.price,
      }}
      checkoutSlug={data.slug}
      bankSettings={bankSettings}
    />
  );
}
