import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware guards:
 * 1. Admin routes require a valid admin session (Phase 1: basic cookie check;
 *    will upgrade to Supabase Auth session verification when provisioned).
 * 2. Security headers applied to all responses.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin route guard
  if (pathname.startsWith("/admin")) {
    // Phase 1: check for admin session cookie.
    // When Supabase Auth is provisioned, this will verify the JWT and check
    // for the admin role claim in app_metadata.
    const adminSession = request.cookies.get("admin-session");
    if (!adminSession?.value) {
      // Redirect unauthenticated requests to home page.
      // No login page exists yet — admin routes are unlinked and noindex.
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml (static assets)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
