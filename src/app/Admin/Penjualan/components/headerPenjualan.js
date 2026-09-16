'use client'

export function HeaderPenjualan() {



  return (
    <main className="sticky top-0 z-10 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      {/* Left: Back button + Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Kembali"
          className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all duration-150 shrink-0"
        >
          <svg
            className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-150 group-hover:-translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="hidden sm:block w-px h-8 bg-slate-200 shrink-0" />

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-[0.08em] text-emerald-700 uppercase">
              Point of Sale
            </span>
          </div>
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 truncate">
            Form Transaksi Penjualan
          </h1>
        </div>
      </div>

      {/* Right: User info */}
      <div className="flex items-center gap-2.5 sm:gap-3 pl-3 sm:pl-4 border-l border-slate-200 shrink-0">
        <div className="hidden sm:block text-right leading-tight">
          <p className="text-[11px] text-slate-400 font-medium">Administrator</p>
          <p className="text-sm font-semibold text-slate-800">Hanafi</p>
        </div>
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-900 text-white font-semibold text-sm flex items-center justify-center shrink-0">
          H
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
      </div>
    </main>
  )
}