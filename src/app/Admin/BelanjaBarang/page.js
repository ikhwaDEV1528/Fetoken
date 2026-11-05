"use client";

import React, { useState, useEffect, useContext } from "react";
import { HeaderBelanjaBarang } from "./Components/HeaderBelanjaBarang";
import { DataFakturBelanja } from "./Components/DataFakturBelanja";
import { InputBarangBelanja } from "./Components/InputBarangBelanja";
import { ListBelanjaBarang } from "./Components/ListBelanjaBarang";
import { TambahProduk } from "./Components/TambahBarang";
import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";
import { Konteks } from "@/GlobalNilai/Global";

export default function FormBelanjaPage() {
  const [IsScroll, setIsScroll] = useState(false);
  const {setDataInputBarang} = useContext(Konteks)

  useEffect(()=> {
    setDataInputBarang(prev => ({
      ...prev,
      ListPesanan:[]
    }))
  },[])

  useEffect(() => {
    let timeoutId = null;

    const handleScroll = () => {
      // 1. Set ke true saat user sedang scroll
      setIsScroll(true);

      // 2. Batalkan timer sebelumnya agar tidak saling bentrok
      if (timeoutId) clearTimeout(timeoutId);

      // 3. Set timer baru: jika user berhenti scroll selama 500ms, kembalikan ke false
      timeoutId = setTimeout(() => {
        setIsScroll(false);
      }, 400); // 500ms lebih pas & responsif dibanding 1000ms
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className="min-h-screen min-w-screen bg-slate-50 font-sans antialiased text-slate-800">
  <HeaderBelanjaBarang />
  {/* Menggunakan max-w-full agar memenuhi seluruh layar */}
  <div className="min-w-full max-w-full mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-10 space-y-4 sm:space-y-6">
    <CEK_HAK_AKSES>
      {/* HEADER FAKTUR */}
      <DataFakturBelanja />
      <InputBarangBelanja />
      <ListBelanjaBarang IsScroll={IsScroll} />
      <TambahProduk />
    </CEK_HAK_AKSES>
  </div>
</main>
  );
}