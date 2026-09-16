'use client'

import { Konteks } from "@/GlobalNilai/Global"
import { useContext } from "react"

export function Loading() {
  const { loading } = useContext(Konteks)

  if (!loading?.loadingGlobal) return null;

  return (
    <main className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/30 ">
      {/* Card Container: Dibuat solid, tajam, dan elegan */}
      <div className="flex w-72 flex-col items-center gap-5 rounded-2xl bg-white p-6  ring-1 ring-slate-100">

        {/* Loader Minimalis: Menggunakan ring murni tanpa ambient glow berlebih */}
        <div className="relative flex h-10 w-10 items-center justify-center">
          {/* Track Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-100" />
          {/* Active Spinner */}
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-600" />
        </div>

        {/* Text & Status */}
        <div className="space-y-1 text-center">
          <h3 className="text-sm font-medium text-slate-800">
            Memverifikasi
          </h3>
          <p className="text-xs text-slate-500">
            Mohon tunggu sebentar...
          </p>
        </div>
      </div>
    </main>
  )
}