import { NextResponse } from "next/server";
import { auth } from "@/auth";

const protectedPathPrefixes = ["/dashboard", "/settings", "/posts"];
const authPaths = ["/login", "/register"];

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const signedIn = Boolean(request.auth?.user?.id);
  if (protectedPathPrefixes.some((path) => pathname.startsWith(path)) && !signedIn) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (signedIn && authPaths.includes(pathname)) return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  return NextResponse.next();
});

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
