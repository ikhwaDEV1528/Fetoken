
import { NextResponse } from "next/server";

export async function middleware(request) {
   
    return NextResponse.redirect(new URL('/VERCEL_KONTOL', request.url))
}

export const config = {
    matcher: [
        '/Admin/Dashboard/:path*',
        '/User/Home/:path*',
        '/User/Checkout/:path*',
        '/Admin/Stok/:path*'
    ]
};