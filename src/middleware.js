import { NextResponse } from "next/server";

export async function middleware(request) {
    const credential = request.headers.get('cookie') || '';
    const pathname = request.nextUrl.pathname;

    // 💡 Pakai URL Origin Frontend kamu sendiri (Otomatis menyesuaikan saat Local maupun Vercel)
    const origin = request.nextUrl.origin;
    const API = `${origin}/server_login/CHECKING_ADMIN`;

    try {
        const RES = await fetch(API, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': credential,
            },
            body: JSON.stringify({ headerPath: pathname })
        });

        if (!RES.ok) {
            return NextResponse.redirect(new URL('/Home', request.url));
        }

        const response = NextResponse.next();

        // Pass cookie baru kalau ada auto-refresh token
        const setCookieHeader = RES.headers.get('set-cookie');
        if (setCookieHeader) {
            response.headers.set('set-cookie', setCookieHeader);
        }

        return response;

    } catch (err) {
        console.error("[MIDDLEWARE ERROR]:", err.message);
        return NextResponse.redirect(new URL('/Home', request.url));
    }
}

export const config = {
    matcher: [
        '/Admin/Dashboard/:path*',
        '/User/Home/:path*',
        '/User/Checkout/:path*',
        '/Admin/Stok/:path*'
    ]
};