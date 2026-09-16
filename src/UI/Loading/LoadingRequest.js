'use client'

import { Konteks } from "@/GlobalNilai/Global"
import { useContext } from "react"

export function LoadingRequest() {
  const { loading } = useContext(Konteks)

  if (!loading?.loadingRequest) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-all">
      {/* Container Spinner */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/90 p-5 shadow-xl backdrop-blur-md">
        {/* Border-[3px] untuk menggantikan border-3 yang invalid */}
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-600" />
        
        <span className="text-xs font-semibold text-emerald-950/80 tracking-wide">
          Memuat...
        </span>
      </div>
    </div>
  )
}