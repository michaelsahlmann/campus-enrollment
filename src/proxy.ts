import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/checkout/") ||
    pathname === "/api/checkout/orders" ||
    pathname === "/api/checkout/coupons" ||
    /^\/api\/checkout\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/vercel.svg") ||
    pathname.startsWith("/next.svg")
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next({ request: req });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => req.cookies.set(name, value));
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  return supabase.auth.getClaims().then(async ({ data }) => {
    const userId = data?.claims?.sub;
    if (userId) {
      const { data: admin } = await supabase.from("admin_users").select("id").eq("id", userId).maybeSingle();
      if (admin) return response;
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
