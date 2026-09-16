'use client'

import { Konteks } from "@/GlobalNilai/Global"
import { set } from "firebase/database";
import { useContext } from "react"




export function HeaderBelanjaBarang () {

  const {setDetailBarang,setFaktur,setInputCariSuplier} = useContext(Konteks);

  function OpenTambahBarang () {
     setDetailBarang(prev => ({
      ...prev,
      CloseTambahBarang:true
     }))

    //  setInputCariSuplier('')

    //  setFaktur(prev => ({
    //   ...prev,
    //   no_faktur:'',
    //   diskon_faktur:0,
    //   tanggal_belanja:''
    //  }))
  }


    return (
    <div className="sticky top-0 z-30 left-0 right-0 w-screen ml-[calc(50%-50vw)] -mt-4 sm:-mt-6 px-4 sm:px-6 py-3 sm:py-4 bg-white/85 backdrop-blur-md border-b border-slate-200/70 transition-all duration-200">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4">

    {/* LEFT SECTION: BACK BUTTON & TITLE */}
    <div className="flex items-start sm:items-center gap-3 min-w-0">
      {/* Tombol Back */}
      <button
        onClick={() => window.location.href = '/Admin/Dashboard'}
        className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all duration-150 shrink-0 cursor-pointer"
        title="Kembali"
      >
        <svg
          className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="hidden sm:block w-px h-9 bg-slate-200 shrink-0" />

      {/* TEXT SECTION */}
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
            Form Belanja Barang (Faktur)
          </h1>
        </div>
        <p className="text-[11px] sm:text-sm text-slate-500 font-medium truncate">
          Pencatatan barang masuk dan pengeluaran kas toko
        </p>
      </div>
    </div>

    {/* RIGHT SECTION: BUTTON ADD */}
    <button
      onClick={() => OpenTambahBarang()}
      className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] text-white font-semibold rounded-lg text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer group shrink-0"
    >
      <svg
        className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
      </svg>
      <span className="whitespace-nowrap">Tambah Barang Baru</span>
    </button>

  </div>
</div>
    )
}