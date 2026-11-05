'use client'

import { ChevronLeft } from "lucide-react"

export function HeaderPenjualan() {



  return (
    <main className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
    
    {/* Left: Back button + Title */}
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <button
        type="button"
        onClick={() => window.history.back()}
        aria-label="Kembali"
        className="group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 active:scale-95 transition-all duration-150 shrink-0 cursor-pointer border border-slate-200/60"
      >
        <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] text-slate-800 transition-transform group-hover:-translate-x-0.5" />
      </button>

      <div className="hidden sm:block w-px h-8 bg-slate-200 shrink-0" />

      <div className="min-w-0 flex flex-col justify-center">
        <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 truncate leading-snug">
          Form Transaksi Penjualan
        </h1>
        <p className="hidden sm:block text-xs text-slate-500 font-medium truncate mt-0.5">
          Kelola barang dan detail pembayaran transaksi
        </p>
      </div>
    </div>

    {/* Right: Indicator Status Transaksi / Quick Badge (Visual Accent Optional) */}
    <div className="shrink-0 flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs sm:text-sm font-bold">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Kasir Online
      </span>
    </div>

  </div>
</main>
  )
}