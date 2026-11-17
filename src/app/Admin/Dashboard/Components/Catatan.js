"use client";

import { useEffect, useState } from "react";

function getGreeting(hour) {
  if (hour >= 4 && hour < 11) {
    return { text: "Selamat pagi", icon: "bi-sunrise", color: "text-amber-600" };
  }
  if (hour >= 11 && hour < 15) {
    return { text: "Selamat siang", icon: "bi-sun-fill", color: "text-orange-600" };
  }
  if (hour >= 15 && hour < 19) {
    return { text: "Selamat sore", icon: "bi-cloud-sun-fill", color: "text-orange-500" };
  }
  return { text: "Selamat malam", icon: "bi-moon-stars-fill", color: "text-indigo-500" };
}

function GreetingBar() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-10 items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-5">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  const { text, icon, color } = getGreeting(now.getHours());
  const date = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex w-full h-10  items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-5 text-sm">
      <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800">
        <i className={`bi ${icon} text-base leading-none ${color}`} aria-hidden="true"></i>
        <span className="truncate">{text}</span>
      </span>
      <span className="shrink-0 text-slate-500">{date}</span>
    </div>
  );
}

export function Catatan() {
  return (
    <section className="w-full ">
      
      {/* HAPUS sm:px-6 dan lg:px-8 DI SINI SUPAYA KARTU HIJAU SEPANJANG MERAH */}
      <div className="w-full pb-3 pt-4">
        {/* Jika ingin ujungnya benar-benar nempel siku (bukan lengkung), hapus juga `rounded-xl` */}
        <div className="w-full overflow-hidden border-b border-slate-200">
          <GreetingBar />
        </div>
      </div>

      <div className="w-full">
        {/* Konten tabel/filter kamu selanjutnya */}
      </div>
    </section>
  );
}