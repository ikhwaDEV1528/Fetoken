"use client";

import { Konteks } from "@/GlobalNilai/Global";
import { useContext } from "react";

export function Toast() {
  const { loading, setLoading } = useContext(Konteks);
  const isVisible = Boolean(loading?.toast);

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm transition-all duration-300 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-6 pointer-events-none"
      }`}
    >
      <div className="flex items-center justify-between gap-3.5 px-4 py-3 rounded-2xl bg-slate-900/95 border border-slate-700/80 text-slate-100 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] shrink-0 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide truncate">
            {loading?.toastMessage || "Berhasil!"}
          </span>
        </div>

        <button
          onClick={() => setLoading?.((prev) => ({ ...prev, toast: false }))}
          className="text-slate-400 hover:text-white p-1 transition-colors -mr-1 rounded-lg hover:bg-slate-800"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}