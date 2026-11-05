'use client'
import { Konteks } from "@/GlobalNilai/Global"
import { useContext, useState } from "react"
import axios from "axios"
import { ChevronLeft } from 'lucide-react';

export function HeaderBarang() {
  const [CloseCari, setCloseCari] = useState(false)

  const { setBarang, inputCariBarang, setInputCariBarang, setLoading } = useContext(Konteks)

  async function cari() {
    // 1. Cek dulu sebelum set loading
    if (!inputCariBarang || inputCariBarang.trim() === "") {
      return alert('Tidak boleh kosong!');
    }

    try {
      setLoading(prev => ({ ...prev, loadingRequest: true }))

      const API = '/api-be/SERVER_JUAL_BARANG/JUAL_BARANG';
      const ress = await axios.get(API, { params: { input: inputCariBarang } })

      setBarang(ress.data.Search)

      // 2. Deklarasikan pesan suksesnya
      const pesanSukses = `Ditemukan ${ress.data.Search?.length || 0} barang`;
      tampilkanToast(pesanSukses, 'success');

    } catch (err) {
      const pesanGagal = err?.response?.data?.message || 'Gagal mencari barang!';
      tampilkanToast(pesanGagal, 'error');
    } finally {
      // 3. Matikan loading (diubah ke false)
      setLoading(prev => ({ ...prev, loadingRequest: false }))
    }
  }

  function tampilkanToast(message, type) {
    setLoading(prev => ({
      ...prev,
      toast: true,
      toastMessage: message,
      toastType: type
    }));

    setTimeout(() => {
      setLoading(prev => ({ ...prev, toast: false }));
    }, 3000);
  }

  function openFiturCari() {
    setCloseCari(true)
  }

  return (
    <header className="fixed items-center justify-center top-0 left-0 right-0 z-50 bg-white/95 p-4 backdrop-blur-md border-b border-slate-200/80 px-3.5 lg:px-8 py-5 shadow-xs transition-all duration-200 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto flex pt-4 items-center justify-between gap-3">

        {/* Sisi Kiri: Tombol Back & Judul Halaman */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            onClick={() => window.location.href = '/Admin/Dashboard'}
            type="button"
            className="group flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-800 border border-slate-200/60 transition-all hover:bg-slate-200/80 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 cursor-pointer"
            aria-label="Kembali"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5] text-slate-800 transition-transform group-hover:-translate-x-0.5" />
          </button>

          {/* Separator Tipis Desktop */}
          <div className="hidden sm:block w-px h-8 bg-slate-200/80 shrink-0" />

          <div className="flex flex-col min-w-0 justify-center">
            <span className="hidden sm:block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Admin Panel
            </span>
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug truncate">
              Daftar Barang
            </h1>
          </div>
        </div>

        {/* Sisi Kanan: Action Buttons & Smooth Search Bar */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${CloseCari
              ? 'max-w-xs sm:max-w-sm opacity-100 space-x-2'
              : 'max-w-0 opacity-0 pointer-events-none'
              }`}
          >
            <input
              type="text"
              value={inputCariBarang}
              onChange={(e) => setInputCariBarang(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cari()}
              placeholder="Cari nama barang..."
              className="w-full h-11 sm:h-12 pl-4 pr-4 text-base sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 placeholder:font-normal font-semibold transition-all duration-200 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={cari}
              aria-label="Cari Barang"
              className="w-11 h-11 sm:w-12 sm:h-12 grid place-items-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white active:scale-95 rounded-xl shadow-xs transition-all duration-150 cursor-pointer shrink-0"
            >
              <i className="bi bi-search text-base"></i>
            </button>
          </div>

          <button
            onClick={openFiturCari}
            className={`${CloseCari ? 'hidden' : 'flex'} w-11 h-11 sm:w-12 sm:h-12 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-800 border border-slate-200/60 hover:bg-slate-200/80 active:scale-95 transition-all cursor-pointer`}
            aria-label="Fitur Cari"
          >
            <i className="bi bi-search text-lg sm:text-base"></i>
          </button>
        </div>

      </div>
    </header>
  )
}