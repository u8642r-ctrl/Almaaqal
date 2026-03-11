import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // مسارات المدير فقط
    if (
      (pathname.startsWith("/admin-dashboard") ||
        pathname.startsWith("/students") ||
        pathname.startsWith("/teachers") ||
        pathname.startsWith("/courses") ||
        pathname.startsWith("/barcode-cards")) &&
      token?.role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // مسارات الطالب فقط
    if (pathname.startsWith("/student-dashboard") && token?.role !== "student") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // مسارات الأستاذ فقط
    if (pathname.startsWith("/teacher-dashboard") && token?.role !== "teacher") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin-dashboard/:path*",
    "/student-dashboard/:path*",
    "/teacher-dashboard/:path*",
    "/students/:path*",
    "/teachers/:path*",
    "/courses/:path*",
    "/barcode-cards/:path*",
  ],
};