'use client'

import { Konteks } from "@/GlobalNilai/Global";
import { useContext, useEffect, useState } from "react";
import axios from "axios";







export function InputBarangBelanja() {


  const { dataInputBarang, setDataInputBarang, inputCariBarang, setInputCariBarang, setLoading } = useContext(Konteks);

  async function cari() {
    if (inputCariBarang == "") return;

    try {
      setLoading(prev => ({
        ...prev,
        loadingRequest: true
      }))
      const API = '/api-be/SERVER_JUAL_BARANG/JUAL_BARANG';
      const ress = await axios.get(API, { params: { input: inputCariBarang } })
      setDataInputBarang(prev => ({ ...prev, ItemBarang: ress.data.Search }))
      tampilkanToast(ress.data.message, 'success')
    } catch (err) {
      tampilkanToast(err?.response?.data?.message, 'error')
    } finally {
      setLoading(prev => ({
        ...prev,
        loadingRequest: false
      }))
    }
  }

  function tampilkanToast(message, type) {
    setLoading(prev => ({
      ...prev,
      toast: true,
      toastMessage: message,
      toastType: type
    }));

    setTimeout(() => {
      setLoading(prev => ({ ...prev, toast: false }));
    }, 3000);
  }



  function tambahBarangBelanja(itemBarangBelanja) {
    if (dataInputBarang.ListPesanan.some(item => item.kode_barang == itemBarangBelanja.kode_barang)) {
      return alert('Barang sudah ada di list')
    }
    
    // alert(JSON.stringify({ ...itemBarangBelanja, status: 'RESTOK' }))

    setDataInputBarang(prev => ({
      ...prev,
      ListPesanan: [...prev.ListPesanan, { ...itemBarangBelanja, status: 'RESTOK' }]
    }))


    setDataInputBarang(prev => ({
      ...prev,
      ItemBarang: prev.ItemBarang.filter(item => item.kode_barang !== itemBarangBelanja.kode_barang)
    }))

  }

  useEffect(() => {
    if (inputCariBarang == "") {
      setDataInputBarang(prev => ({
        ...prev,
        ItemBarang: []
      }))
    }
  }, [inputCariBarang])

  return (
    <section className="w-full max-w-6xl mx-auto bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 mb-6">
      {/* ROW SEARCH & TOMBOL TAMBAH */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        {/* Input Cari & Button */}
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <input
              onChange={(e) => setInputCariBarang(e.target.value)}
              placeholder="Cari barang (contoh: ALE-ALE)..."
              className="w-full h-12 px-4 text-base sm:text-sm font-semibold bg-slate-50/80 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => cari()}
            className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-xs shrink-0 cursor-pointer flex items-center justify-center"
          >
            Cari
          </button>
        </div>

        {/* Tombol Barang Baru (Jika Ditambahkan Nanti) */}
      </div>

      {/* RESULT LIST BARANG */}
      {dataInputBarang?.ItemBarang?.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Hasil Pencarian (Klik untuk menambah ke list):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
            {dataInputBarang.ItemBarang.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => tambahBarangBelanja(item)}
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/60 active:bg-emerald-100/80 border border-slate-200/80 hover:border-emerald-300 rounded-xl text-left transition-all duration-150 group cursor-pointer"
              >
                <div className="truncate mr-3 min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-800 truncate">
                    {item.nama_barang}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    Kode: <span className="font-mono text-slate-600 font-bold">{item.kode_barang}</span>
                  </p>
                </div>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100/80 group-hover:bg-emerald-600 group-hover:text-white px-2.5 py-1 rounded-lg transition-all shrink-0">
                  + Pilih
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}