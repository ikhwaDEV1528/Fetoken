import { NextResponse } from "next/server";

export async function middleware(request) {
    // 💡 Ambil semua cookie dari domain Frontend
    const credential = request.cookies.toString() || request.headers.get('cookie') || '';
    const pathname = request.nextUrl.pathname;

    // Tembak Backend langsung dengan membawa cookie yang sudah tersimpan di domain FE
    const API = `https://token-phi-dun.vercel.app/server_login/CHECKING_ADMIN`;

    try {
        const RES = await fetch(API, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': credential, // <-- Cookie domain FE terikut otomatis ke BE
                'x-path': pathname
            },
            body: JSON.stringify({ headerPath: pathname })
        });

        // Jika status bukan 200 (Token invalid / expired / unauthorized)
        if (!RES.ok) {
            console.log(`[MIDDLEWARE] Akses ditolak (${RES.status}) untuk path: ${pathname}`);
            
            // Mencegah Infinite Loop jika halaman tujuan redirect sama dengan halaman saat ini
            if (pathname !== '/Home' && pathname !== '/login') {
                return NextResponse.redirect(new URL('/login', request.url));
            }
            return NextResponse.next();
        }

        const response = NextResponse.next();

        // Pass cookie baru kalau ada auto-refresh token dari BE
        const setCookieHeader = RES.headers.get('set-cookie');
        if (setCookieHeader) {
            response.headers.set('set-cookie', setCookieHeader);
        }

        return response;

    } catch (err) {
        console.error("[MIDDLEWARE ERROR]:", err.message);
        return NextResponse.redirect(new URL('/login', request.url));
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