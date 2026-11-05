'use client'
import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Tambah_karyawan } from "./tambah_karyawan"

export function HeaderStaf({ onSuccess }) {
    const navigasi = useRouter()
    const [openTambah, setOpenTambah] = useState(false)

    return (
        <>
            <header className="sticky top-0 w-full bg-white/95 z-10 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200 pt-[env(safe-area-inset-top)]">
                <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">

                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={() => navigasi.push('/Admin/Dashboard')}
                            aria-label="Kembali ke dashboard"
                            className="group flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-800 border border-slate-200/60 transition-all hover:bg-slate-200/80 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 cursor-pointer"
                        >
                            <ChevronLeft className="w-6 h-6 stroke-[2.5] text-slate-800 transition-transform group-hover:-translate-x-0.5" />
                        </button>

                        <div className="hidden sm:block w-px h-8 bg-slate-200/80 shrink-0" />

                        <div className="min-w-0 flex flex-col justify-center">
                            <span className="text-[10px] sm:text-[11px] uppercase font-mono tracking-wider text-slate-400 font-extrabold block truncate">
                                Data Master
                            </span>
                            <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 leading-snug truncate mt-0.5 sm:mt-0">
                                Karyawan / Staf
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shrink-0">
                        <button
                            type="button"
                            onClick={() => setOpenTambah(true)}
                            className="font-bold text-green-900"
                        >
                            Tambah Karyawan
                        </button>
                    </div>
                </div>
            </header>

            <Tambah_karyawan
                isOpen={openTambah}
                setIsOpen={setOpenTambah}
                onSuccess={onSuccess}
            />
        </>
    )
}