'use client'
import { Konteks } from "@/GlobalNilai/Global"
import { useContext, useState } from "react"
import axios from "axios"

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
    }, 2500);
  }

  function openFiturCari() {
    setCloseCari(true)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Sisi Kiri: Tombol Back & Judul Halaman */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => window.location.href = '/Admin/Dashboard'}
            type="button" 
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all duration-150"
            aria-label="Kembali"
          >
            <i className="bi bi-arrow-left text-lg"></i>
          </button>

          <div className="flex flex-col">
            <span className="hidden sm:block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Admin Panel
            </span>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              Daftar Barang
            </h1>
          </div>
        </div>
        
        {/* Sisi Kanan: Action Buttons & Smooth Search Bar */}
        <div className="flex items-center gap-2">
          <div 
            className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
              CloseCari 
                ? 'max-w-xs opacity-100 space-x-2' 
                : 'max-w-0 opacity-0 pointer-events-none'
            }`}
          >
            <input 
              value={inputCariBarang}
              onChange={(e) => setInputCariBarang(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cari()}
              className="w-48 sm:w-64 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 transition-all" 
              placeholder="CONTOH: ALE ALE"
            />
            <button 
              onClick={cari}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-medium rounded-lg transition-all"
            >
              Cari
            </button>
          </div>

          <button 
            onClick={openFiturCari}
            className={`${CloseCari ? 'hidden' : 'block'} w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all`}
            aria-label="Fitur Cari"
          >
            <i className="bi bi-search text-base"></i>
          </button>
        </div>

      </div>
    </header>
  )
}