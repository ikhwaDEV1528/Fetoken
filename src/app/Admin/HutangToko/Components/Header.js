"use client"

import { useRouter } from "next/navigation"

export function HeaderHutang() {
    const router = useRouter()

    return (
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-100 bg-white/85 px-4 backdrop-blur-md">
            {/* Kiri: Back Button + Judul Halaman */}
            <div onClick={() => router.back()} className="flex items-center gap-1.5">
                <button
                    type="button"
                    // onClick={() => router.back()}
                    aria-label="Kembali"
                    className="group -ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-800 transition-all active:scale-90 active:bg-slate-100"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 transition-transform group-active:-translate-x-0.5"
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>

                <h1 className="text-base font-bold tracking-tight text-slate-900">
                    Hutang
                </h1>
            </div>

            {/* Kanan: Pill Action Button */}
            <button
                type="button"
                onClick={() => router.push("/Admin/RiwayatSemuaHutang")}
                className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all active:scale-95 active:bg-emerald-700"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M12 7v5l4 2" />
                </svg>
                <span>Semua Riwayat</span>
            </button>
        </header>
    )
}