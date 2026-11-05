'use client'

import { useEffect, useState } from "react";

function getGreeting(hour) {
  if (hour >= 4 && hour < 11) {
    return { text: "Selamat pagi", icon: "bi-sunrise", color: "text-amber-500" };
  }
  if (hour >= 11 && hour < 15) {
    return { text: "Selamat siang", icon: "bi-sun-fill", color: "text-orange-500" };
  }
  if (hour >= 15 && hour < 19) {
    return { text: "Selamat sore", icon: "bi-cloud-sun-fill", color: "text-orange-400" };
  }
  return { text: "Selamat malam", icon: "bi-moon-stars-fill", color: "text-indigo-400" };
}

function GreetingBadge() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    return <div className="h-7 w-36 rounded-full bg-slate-100 animate-pulse" />;
  }

  const { text, icon, color } = getGreeting(now.getHours());
  const date = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-sm shadow-slate-900/5">
      <span className="w-5 h-5 rounded-full bg-slate-50 grid place-items-center shrink-0">
        <i className={`bi ${icon} text-[11px] ${color}`}></i>
      </span>
      <span className="text-[12.5px] font-semibold text-slate-700 tracking-tight">{text}</span>
      <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block"></span>
      <span className="text-[12px] font-medium text-slate-400 hidden sm:block truncate">{date}</span>
    </div>
  );
}

export function Catatan() {
  return (
    <main className="min-h-screen bg-slate-50/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4 sm:pt-8 sm:pb-6">
        <div className="space-y-4 sm:space-y-5">

          <GreetingBadge />

          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-600 shadow-sm shadow-emerald-900/10 grid place-items-center shrink-0">
              <i className="bi bi-receipt-cutoff text-white text-base sm:text-lg"></i>
            </div>

            <div className="min-w-0 pt-0.5">
              <h1 className="text-[19px] sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                Daftar Pesanan Masuk
              </h1>
              <p className="text-[13px] sm:text-sm text-slate-500 max-w-xl leading-relaxed mt-1">
                Pantau seluruh pesanan yang masuk dan gunakan filter tanggal untuk melihat histori penjualan barang keluar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider tipis pemisah header dari konten, kesan native section separator */}
      <div className="border-b border-slate-200/70"></div>

      {/* Konten selanjutnya (tabel, filter, list pesanan, dll) menyusul di sini */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* ... */}
      </div>
    </main>
  );
}
