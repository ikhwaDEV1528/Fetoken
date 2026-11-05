import React from 'react';

export  function HeaderStok({ title = "Riwayat Stok Barang", subtitle = "Catatan mutasi masuk, keluar & koreksi stok" }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
        
        {/* SISI KIRI: Tombol Back & Judul Halaman */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Kembali"
            className="group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 active:scale-95 transition-all duration-150 shrink-0 cursor-pointer border border-slate-200/60"
          >
            <svg 
              className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] text-slate-800 transition-transform group-hover:-translate-x-0.5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Separator Tipis (Hanya Muncul di Tablet & Laptop) */}
          <div className="hidden sm:block w-px h-8 bg-slate-200 shrink-0" />

          {/* Text Title & Subtitle */}
          <div className="min-w-0 flex flex-col justify-center">
            <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 truncate leading-snug">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* SISI KANAN: Status Badge / Indikator (Opsional) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>

      </div>
    </header>
  );
}