import { NextResponse } from "next/server";

export async function middleware(request) {

    const credential = request.headers.get('cookie') || '';
    const pathname = request.nextUrl.pathname;

    console.log('Middleware Next.js Jalan untuk path:', pathname);

    try {
        // 💡 FIXED: URL dibetulkan (tanpa double quote & sesuaikan endpoint express)
        const API = "https://token-mm5ffamz1-ikhwan-mardityas-projects.vercel.app/server_login/CHECKING_ADMIN";

        const RES = await fetch(API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'cookie': credential,
                'path': pathname
            },
            // 💡 Tambahkan cache no-store agar Vercel Next.js tidak nge-cache respon fetch
            cache: 'no-store' 
        });

        if (!RES.ok) {
            const errorData = await RES.json().catch(() => ({}));
            
            // Jika ada rekomendasi navigasi dari backend
            if (errorData.navigasi) {
                return NextResponse.redirect(new URL(errorData.navigasi, request.url));
            }

            // Jika ditolak, lempar ke halaman Login
            console.log("Akses Ditolak Express:", errorData.error || errorData.message);
            return NextResponse.redirect(new URL('/Login', request.url));
        }

        // ✅ 1. Bikin object response SATU KALI SAJA di sini
        const response = NextResponse.next();

        // ✅ 2. Oper Set-Cookie jika Express menerbitkan token baru (Auto Refresh)
        const setCookieHeader = RES.headers.get('set-cookie');
        
        if (setCookieHeader) {
            response.headers.set('set-cookie', setCookieHeader);
        }

        // ✅ 3. Tempelkan Header Anti-Cache
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        // ✅ 4. Return response
        return response;

    } catch (err) {
        console.log("Middleware Error System:", err.message);
        // Jika sistem error, kembalikan ke /Login
        return NextResponse.redirect(new URL('/Login', request.url));
    }
}

export const config = {
    matcher: [
        '/Admin/Dashboard/:path*',
        '/User/Home/:path*',
        '/User/Checkout/:path*',
        '/Admin/Stok/:path*'
    ]
}