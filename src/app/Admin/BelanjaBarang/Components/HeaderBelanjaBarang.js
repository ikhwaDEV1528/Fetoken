'use client'

import { Konteks } from "@/GlobalNilai/Global"
import { set } from "firebase/database";
import { useContext } from "react"
import { ChevronLeft } from "lucide-react";



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
    <div className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">

    {/* LEFT SECTION: BACK BUTTON & TITLE */}
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      {/* Tombol Back */}
      <button
        onClick={() => window.location.href = '/Admin/Dashboard'}
        className="group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 active:scale-95 transition-all duration-150 shrink-0 cursor-pointer border border-slate-200/60"
        title="Kembali"
      >
        <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] text-slate-800 transition-transform group-hover:-translate-x-0.5" />
      </button>

      <div className="hidden sm:block w-px h-8 bg-slate-200 shrink-0" />

      {/* TEXT SECTION */}
      <div className="min-w-0 flex flex-col justify-center">
        <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 truncate leading-snug">
          Form Belanja Barang
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-0.5">
          Pencatatan barang masuk
        </p>
      </div>
    </div>

    {/* RIGHT SECTION: BUTTON ADD BARANG */}
    <button
      onClick={() => OpenTambahBarang()}
      className="h-11 sm:h-12 px-4 sm:px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer group shrink-0"
    >
      <svg
        className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:rotate-90 stroke-[2.5]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
      </svg>
      <span className="whitespace-nowrap">
        <span className="inline sm:hidden"> Barang</span>
        <span className="hidden sm:inline">Tambah Barang Baru</span>
      </span>
    </button>

  </div>
</div>
    )
}