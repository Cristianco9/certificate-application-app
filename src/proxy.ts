import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "authentication";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Only run on protected prefixes. Public routes (/, /welcome, /login,
  // /forgot-password, /unauthorized) never hit this.
  matcher: ["/dashboard/:path*"],
};
