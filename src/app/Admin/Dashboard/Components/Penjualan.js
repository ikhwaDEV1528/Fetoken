'use client'

import React from 'react';

// Sample Data dari Spreadsheet Anda
const salesData = [
  {
    noFaktur: "NO FAKTUR",
    tanggal: "09 May 2026",
    kodeBarang: "PBB027K",
    satuan: "KARTON",
    namaBarang: "POTABEE REGULAR BBQ BEEF 15GR",
    idSales: "ADMIN01",
    kodePelanggan: "ADMIN01",
    namaPelanggan: "ADMIN",
    jumlahKeluar: 1,
    sisaStok: 9,
    harga: "Rp0",
    totalHarga: "Rp0"
  },
  {
    noFaktur: "BRS00146151",
    tanggal: "09 May 2026",
    kodeBarang: "PBB050P",
    satuan: "PAC",
    namaBarang: "POTABEE REGULER BBQ BEFF",
    idSales: "BRS001",
    kodePelanggan: "BRS001",
    namaPelanggan: "LILI BULIK",
    jumlahKeluar: 1,
    sisaStok: 5,
    harga: "Rp17.316",
    totalHarga: "Rp17.316"
  },
  {
    noFaktur: "Bbrs00246153ar",
    tanggal: "11 May 2026",
    kodeBarang: "CRCN035K",
    satuan: "KARTON",
    namaBarang: "CIK CIK ROASTED CORN 4X10",
    idSales: "haryono umar",
    kodePelanggan: "Bbrs002",
    namaPelanggan: "zainal",
    jumlahKeluar: 1,
    sisaStok: 9,
    harga: "Rp68.752",
    totalHarga: "Rp68.752"
  }
];

// Mapping Header
const fields = [
  { key: "noFaktur", label: "NO FAKTUR" },
  { key: "tanggal", label: "Tanggal Faktur" },
  { key: "kodeBarang", label: "KODE BARANG" },
  { key: "satuan", label: "SATUAN" },
  { key: "namaBarang", label: "NAMA BARANG" },
  { key: "idSales", label: "ID SALES" },
  { key: "kodePelanggan", label: "Kode Pelanggan" },
  { key: "namaPelanggan", label: "Nama Pelanggan" },
  { key: "jumlahKeluar", label: "JUMLAH KELUAR" },
  { key: "sisaStok", label: "SISA STOK" },
  { key: "harga", label: "HARGA" },
  { key: "totalHarga", label: "TOTAL HARGA" }
];

export  function Penjualan() {
  return (
    <div className="w-full p-4 antialiased">
      {/* Wrapper Scroll Horizontal */}
      <div className="relative overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <div className="inline-flex min-w-full">
          
          {/* KOLOM KIRI (HEADER / FIELD LABEL) - STICKY */}
          <div className="sticky left-0 z-10 bg-slate-100 border-r border-slate-200 divide-y divide-slate-200/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
            {fields.map((field) => (
              <div 
                key={field.key} 
                className="h-12 px-4 flex items-center font-semibold text-xs text-slate-700 tracking-wider uppercase whitespace-nowrap"
              >
                {field.label}
              </div>
            ))}
          </div>

          {/* KOLOM KANAN (VALUE / BARIS DATA) - SCROLL HORIZONTAL */}
          <div className="flex divide-x divide-slate-100">
            {salesData.map((row, index) => (
              <div 
                key={index} 
                className="w-64 min-w-[256px] divide-y divide-slate-100 hover:bg-blue-50/30 transition-colors"
              >
                {fields.map((field) => (
                  <div 
                    key={field.key} 
                    className="h-12 px-4 flex items-center text-xs text-slate-800 font-medium truncate"
                  >
                    {/* Visual Badge Khusus Untuk Total Harga */}
                    {field.key === "totalHarga" ? (
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {row[field.key]}
                      </span>
                    ) : (
                      row[field.key]
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

        </div>
      </div>
      
      {/* Petunjuk UX */}
      <p className="text-[11px] text-slate-400 mt-2 text-right italic">
        &rarr; Geser ke samping untuk melihat transaksi selanjutnya
      </p>
    </div>
  );
}