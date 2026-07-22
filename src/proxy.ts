import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proteção de primeira linha das rotas internas (convenção "proxy" do Next 16).
 * A autorização real (permissões e escopo de organização) acontece sempre
 * no servidor, dentro das actions e páginas — nunca apenas aqui.
 */
export function proxy(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
