"use client";

import React, { useState, useEffect } from "react";
import { HeaderBelanjaBarang } from "./Components/HeaderBelanjaBarang";
import { DataFakturBelanja } from "./Components/DataFakturBelanja";
import { InputBarangBelanja } from "./Components/InputBarangBelanja";
import { ListBelanjaBarang } from "./Components/ListBelanjaBarang";
import { TambahProduk } from "./Components/TambahBarang";
import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";

export default function FormBelanjaPage() {
  const [IsScroll, setIsScroll] = useState(false);

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
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-gray-50 min-h-screen">
      <CEK_HAK_AKSES>
        <HeaderBelanjaBarang />
        {/* HEADER FAKTUR */}
        <DataFakturBelanja />
        <InputBarangBelanja />
        <ListBelanjaBarang IsScroll={IsScroll} />
        <TambahProduk />
      </CEK_HAK_AKSES>
    </div>
  );
}