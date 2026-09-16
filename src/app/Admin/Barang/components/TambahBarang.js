'use client'

import { Konteks } from "@/GlobalNilai/Global"
import axios from "axios"
import { useContext, useState } from "react"



export function TambahProduk() {
  const { DetailBarang, setDetailBarang, setLoading } = useContext(Konteks)

  const [formTambahBarang, setFormTambahBarang] = useState({
    nama_barang: "",
    satuan: "",
    harga_dasar: "",
    persentase_diskon_distributor: '',
    persentase_fee_harga_jual: ""
  })


  async function SimpanTambahProduk(params) {

    try {
      setLoading(prev => ({
        ...prev,
        loadingRequest: true
      }))
      const API = '/api-be/SERVER_BARANG/TAMBAH_BARANG';
      const ress = await axios.post(API, {
        nama_barang: formTambahBarang.nama_barang,
        satuan: formTambahBarang.satuan,
        harga_dasar: formTambahBarang.harga_dasar,
        persentase_diskon_distributor: formTambahBarang.persentase_diskon_distributor,
        persentase_fee_harga_jual: formTambahBarang.persentase_fee_harga_jual
      })
      alert('Berhasil')
      window.location.reload()
    } catch (err) {
      alert(err)
    } finally {
      setLoading(prev => ({
        ...prev,
        loadingRequest: false
      }))
    }
  }




  return (
    <main className={` ${DetailBarang.CloseTambahBarang ? 'block' : 'hidden'} fixed inset-0 min-h-screen bg-slate-100/80 pt-20 pb-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-2xl mx-auto">

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden transition-all">

          {/* Header */}
          <header className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-emerald-600 font-bold border border-green-100">
                <i className="bi bi-box-seam text-lg"></i>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                  Tambah Barang Baru
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi formulir di bawah ini untuk menambahkan komoditas ke sistem.
                </p>
              </div>
            </div>
          </header>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-6">

            {/* Informasi Utama Produk */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Barang <span className="text-red-500">*</span>
                </label>
                <input
                  onChange={(e) => setFormTambahBarang(prev => ({ ...prev, nama_barang: e.target.value }))}
                  type="text"
                  placeholder="Contoh: ALE-ALE ORANGE CUP 180ML"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Satuan <span className="text-red-500">*</span>
                </label>
                <input
                  onChange={(e) => setFormTambahBarang(prev => ({ ...prev, satuan: e.target.value }))}
                  type="text"
                  placeholder="Contoh: KARTON, DUS, PCS"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium uppercase"
                />
              </div>
            </div>

            <div className="h-px w-full bg-slate-100" />

            {/* Kalkulasi Parameter Harga */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Harga Dasar <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <span className="text-xs font-semibold text-slate-400">Rp</span>
                  </div>
                  <input
                    onChange={(e) => setFormTambahBarang(prev => ({ ...prev, harga_dasar: e.target.value }))}
                    type="number"
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Diskon Distributor
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      onChange={(e) => setFormTambahBarang(prev => ({ ...prev, persentase_diskon_distributor: e.target.value }))}
                      type="number"
                      step="any"
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 pl-4 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Diskon Fee
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      onChange={(e) => setFormTambahBarang(prev => ({ ...prev, persentase_fee_harga_jual: e.target.value }))}
                      type="number"
                      step="any"
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 pl-4 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer / Submit Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-8">
            <button
              onClick={() => setDetailBarang(prev => ({ ...prev, CloseTambahBarang: false }))}
              type="button"
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200/60 active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={() => SimpanTambahProduk()}
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/30 transition-all hover:bg-emerald-700 active:scale-95"
            >
              Simpan Produkk
            </button>
          </div>

        </div>
      </div>
    </main>
  )
}