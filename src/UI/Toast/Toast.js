"use client";

import { Konteks } from "@/GlobalNilai/Global";
import { useContext, useEffect } from "react";

const AUTO_DISMISS_MS = 3500;

export function Toast() {
  const { loading, setLoading } = useContext(Konteks);
  const isVisible = Boolean(loading?.toast);
  const isSuccess = loading?.toastType === "success";

  // Auto-dismiss
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      setLoading?.((prev) => ({ ...prev, toast: false }));
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isVisible, loading?.toastMessage, setLoading]);

  const title = isSuccess ? "Berhasil" : "Gagal";
  const message = isSuccess
    ? loading?.toastMessage
    : `${loading?.toastMessage} — silakan coba lagi`;

  return (
    <div
      aria-live="assertive"
      role="status"
      className={`fixed z-50 left-4 right-4 top-4 sm:left-1/2 sm:right-auto sm:top-5 sm:-translate-x-1/2 sm:w-full sm:max-w-sm transition-all duration-300 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-3 pointer-events-none"
      }`}
    >
      <div
        className={`relative overflow-hidden flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-lg shadow-black/10 backdrop-blur-md ${
          isSuccess
            ? "bg-white border-emerald-100"
            : "bg-white border-red-100"
        }`}
      >
        {/* Icon badge */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isSuccess ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {isSuccess ? (
            <svg
              className="h-5 w-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className={`text-[13px] font-semibold leading-tight ${
              isSuccess ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {title}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-slate-700 break-words">
            {message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={() => setLoading?.((prev) => ({ ...prev, toast: false }))}
          aria-label="Tutup notifikasi"
          className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:scale-95"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Auto-dismiss progress bar */}
        {isVisible && (
          <div
            className={`absolute bottom-0 left-0 h-0.5 ${isSuccess ? "bg-emerald-500" : "bg-red-500"}`}
            style={{
              animation: `toast-progress ${AUTO_DISMISS_MS}ms linear forwards`,
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}