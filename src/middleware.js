import { NextResponse } from "next/server";

export async function middleware(request) {

    const credential = request.headers.get('cookie') || '';
    const pathname = request.nextUrl.pathname;

    console.log('Middleware Jalan!');

    try {
        const API = `https://token-alvtafeh9-ikhwan-mardityas-projects.vercel.app/server_login/CHECKING_ADMIN`;

        const RES = await fetch(API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'cookie': credential,
                'path': pathname
            },
        });

        if (!RES.ok) {
        
            if(RES.status == 302) {
                throw new Error(await RES.json().navigasi)
            }

            throw new Error('Akses ditolak oleh Server Express!');
        }
        

        // ✅ 1. Bikin object response SATU KALI SAJA di sini
        const response = NextResponse.next();

        // ✅ 2. Oper Set-Cookie jika Express menerbitkan token baru (Auto Refresh)
        const setCookieHeader = RES.headers.get('set-cookie');
        
        if (setCookieHeader) {
            response.headers.set('set-cookie', setCookieHeader);
        }

        // ✅ 3. Tempelkan Header Anti-Cache ke object response YANG SAMA
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        // ✅ 4. Return object response ini!
        return response;

    } catch (err) {
        console.log("Middleware Error:", err);
        return NextResponse.redirect(new URL('/', request.url));
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