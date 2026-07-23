import { NextResponse } from "next/server";

export async function middleware(request) {
    // 💡 Fix 1: Ambil cookie pakai helper resmi Next.js biar gak hilang di Vercel
    const credential = request.headers.get('cookie') || '';
    const pathname = request.nextUrl.pathname;

    console.log(`[MIDDLEWARE] Checking path: ${pathname}`);

    try {
        const API = `https://token-phi-dun.vercel.app/server_login/CHECKING_ADMIN`;

        const RES = await fetch(API, {
            method: 'POST',
            // 💡 Fix 2: Wajib 'no-store' biar Next.js gak ngasal nge-cache respon backend
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': credential, // Pake 'Cookie' diawali kapital
            },
            body:JSON.stringify({headerPath:pathname})
        });

        // 💡 Fix 3: Parse JSON dengan aman dulu sebelum dicek
        const data = await RES.json().catch(() => ({}));

        if (!RES.ok) {
            console.log(`[MIDDLEWARE REJECTED] Status: ${RES.status}`, data);

            // Kalau backend ngirim instruksi redirect/navigasi (contoh: status 302 atau 401)
            if (RES.status === 302 && data.navigasi) {
                return NextResponse.redirect(new URL(data.navigasi, request.url));
            }

            // Fallback kalau akses ditolak biasa
            return NextResponse.redirect(new URL('/Home', request.url));
        }

        // ✅ Response sukses
        const response = NextResponse.next();

        // Oper Set-Cookie jika Express menerbitkan token baru
        const setCookieHeader = RES.headers.get('set-cookie');
        if (setCookieHeader) {
            response.headers.set('set-cookie', setCookieHeader);
        }

        // Header Anti-Cache
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;

    } catch (err) {
        console.error("[MIDDLEWARE FATAL ERROR]:", err.message);
        // Jika jaringan down / backend mati, redirect aman ke Home
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