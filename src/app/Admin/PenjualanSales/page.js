'use client'

import { CEK_HAK_AKSES } from '@/app/Hooks/Hooks'
import React, { useState } from 'react'

export default function PenjualanSalesPage() {
  const [namaSales, setNamaSales] = useState('')
  const [tanggalStart, setTanggalStart] = useState('')
  const [tanggalEnd, setTanggalEnd] = useState('')
  const [isActive, setIsActive] = useState(false)

  const [data, setData] = useState([])
  const [summary, setSummary] = useState({ total_jumlah_barang_pcs: 0, total_jumlah_bulat: 0, grand_total_harga: 0 })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFilter = async (e) => {
    e.preventDefault()
    if (!namaSales || !tanggalStart || !tanggalEnd) {
      setErrorMsg('Harap isi Nama Sales dan Range Tanggal!')
      return
    }

    setErrorMsg('')
    setLoading(true)

    try {
      const response = await fetch('/api-be/SERVER_SALES/penjualan-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_sales: namaSales,
          tanggalstart: tanggalStart,
          tanggalend: tanggalEnd
        })
      })

      const result = await response.json()

      if (response.ok && result.status === 200) {
        setData(result.data || [])
        setSummary(result.summary || { total_jumlah_barang_pcs: 0, total_jumlah_bulat: 0, grand_total_harga: 0 })
        setIsActive(true)
      } else {
        setErrorMsg(result.message || 'Gagal mengambil data')
        setData([])
        setSummary({ total_jumlah_barang_pcs: 0, total_jumlah_bulat: 0, grand_total_harga: 0 })
        setIsActive(false)
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi ke server.')
      setIsActive(false)
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(number || 0)
  }

  // Helper Breakdown Satuan Bertingkat (Karton -> Pack -> Pcs)
  const renderQtyBreakdown = (totalPcs, rasioKarton = 0, rasioPack = 0, totalReturPcs = 0, totalQtyBulat = 0) => {
    const isAdaRetur = totalReturPcs > 0

    if (!totalPcs || totalPcs <= 0) {
      return (
        <div className="flex flex-col items-center">
          <div className="font-bold text-slate-800">0 Pcs</div>
          {isAdaRetur && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
              ⚠️ Habis Diretur ({totalReturPcs} Pcs)
            </span>
          )}
        </div>
      )
    }

    let sisa = totalPcs
    let karton = 0
    let pack = 0

    // 1. Hitung Karton dulu jika ada rasionya
    if (rasioKarton > 1 && sisa >= rasioKarton) {
      karton = Math.floor(sisa / rasioKarton)
      sisa = sisa % rasioKarton
    }

    // 2. Hitung Pack dari sisanya jika ada rasionya
    if (rasioPack > 1 && sisa >= rasioPack) {
      pack = Math.floor(sisa / rasioPack)
      sisa = sisa % rasioPack
    }

    const pcs = sisa

    // Format teks utama
    const partsMain = []
    if (karton > 0) partsMain.push(`${karton} Karton`)
    if (pack > 0) partsMain.push(`${pack} Pack`)
    if (pcs > 0 || partsMain.length === 0) partsMain.push(`${pcs} Pcs`)

    const mainText = partsMain.join(' ')

    // Format subteks breakdown detail
    const partsSub = []
    if (rasioKarton > 1) partsSub.push(`${karton} Karton`)
    if (rasioPack > 1) partsSub.push(`${pack} Pack`)
    partsSub.push(`${pcs} Pcs`)

    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="font-bold text-slate-900 text-sm lg:text-base">{mainText}</div>
        <div className="text-[11px] lg:text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/80">
          ({partsSub.join(', ')}) — <span className="text-emerald-700 font-extrabold">Total: {totalPcs} Pcs</span>
        </div>

        {/* Tampilan Jumlah Bulat / Unit Input Pas Transaksi */}
        {totalQtyBulat > 0 && (
          <div className="text-[11px] lg:text-xs font-semibold text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
            Total Unit Input: <span className="text-slate-900 font-extrabold">{totalQtyBulat}x</span>
          </div>
        )}

        {/* Badge Retur */}
        {isAdaRetur && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 border border-rose-200 shadow-2xs">
            Ada Retur: {totalReturPcs} Pcs
          </span>
        )}
      </div>
    )
  }

  return (
    <CEK_HAK_AKSES>
      <main className="min-h-screen bg-slate-50 antialiased selection:bg-emerald-500 selection:text-white pb-20 font-sans">

        {/* HEADER STICKY PUTIH CLEAN GLASSMORPHISM */}
        <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200 pt-[env(safe-area-inset-top)]">
          <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">

            {/* Tombol Back (<) & Judul Halaman */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => window.history.back()}
                aria-label="Kembali"
                className="group flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-800 border border-slate-200/60 transition-all hover:bg-slate-200/80 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-slate-800 transition-transform group-hover:-translate-x-0.5"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="hidden text-sm font-extrabold text-slate-800 sm:inline">Kembali</span>
              </button>

              {/* Separator Tipis Desktop */}
              <div className="hidden sm:block w-px h-8 bg-slate-200/80 shrink-0" />

              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl lg:text-2xl font-black uppercase tracking-tight text-slate-900 leading-snug truncate">
                  Laporan Penjualan Sales
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate mt-0.5 hidden sm:block">
                  Rekapitulasi Kuantitas & Nilai Penjualan Per Sales
                </p>
              </div>
            </div>

          </div>
        </header>

        {/* MAIN CONTAINER CONTENT */}
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* FILTER SECTION */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs">
            <form onSubmit={handleFilter} className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-4 md:items-end">

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Nama Sales
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama sales..."
                  value={namaSales}
                  onChange={(e) => setNamaSales(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50/80 px-4 text-base sm:text-sm font-semibold text-slate-900 outline-none transition-all focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={tanggalStart}
                  onChange={(e) => setTanggalStart(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50/80 px-4 text-base sm:text-sm font-semibold text-slate-900 outline-none transition-all focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={tanggalEnd}
                  onChange={(e) => setTanggalEnd(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50/80 px-4 text-base sm:text-sm font-semibold text-slate-900 outline-none transition-all focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-xs sm:text-sm font-extrabold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center"
                >
                  {loading ? 'Memuat Data...' : 'Cari Data'}
                </button>
              </div>
            </form>

            {errorMsg && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs sm:text-sm font-bold text-rose-700 flex items-center gap-2">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}
          </section>

          {/* FILTER ACTIVE STATUS BANNER */}
          <div className={`items-center justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 text-xs sm:text-sm text-emerald-950 shadow-xs gap-3 ${isActive ? 'flex flex-col sm:flex-row' : 'hidden'}`}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Menampilkan hasil penjualan untuk sales <strong className="font-black text-emerald-900 uppercase text-sm sm:text-base">{namaSales}</strong>
              </span>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-extrabold text-emerald-900 shadow-xs shrink-0">
              {tanggalStart} s/d {tanggalEnd}
            </div>
          </div>

          {/* DATA TABLE / CARDS SECTION */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">

            {/* Desktop View (Tabel Clean) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/80 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-600">
                    <th className="px-6 py-4 text-center w-16">No</th>
                    <th className="px-6 py-4">Nama Barang</th>
                    <th className="px-6 py-4 text-center">Jumlah (Qty)</th>
                    <th className="px-6 py-4 text-right">Total Harga</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-semibold text-slate-800">
                  {data.length > 0 ? (
                    data.map((item, index) => (
                      <tr key={index} className="transition-colors hover:bg-emerald-50/50 group">
                        <td className="px-6 py-4 text-center font-bold text-slate-400 group-hover:text-emerald-700">{index + 1}</td>
                        <td className="px-6 py-4 font-extrabold text-slate-900 text-sm sm:text-base">{item.nama_barang}</td>
                        <td className="px-6 py-4 text-center">
                          {renderQtyBreakdown(item.jumlah_barang_pcs, item.rasio_karton, item.rasio_pack, item.total_qty_retur_pcs, item.total_qty_bulat)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 text-base sm:text-lg">
                          {formatRupiah(Number(item.total_harga))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold text-sm">
                        {loading ? 'Sedang mengambil data...' : 'Tidak ada data penjualan untuk filter ini.'}
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="border-t-2 border-slate-800 bg-slate-900 text-white">
                  <tr>
                    <td colSpan={2} className="px-6 py-5 uppercase tracking-wider text-xs sm:text-sm font-black text-slate-300">
                      Total Keseluruhan
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-base sm:text-lg font-black block text-emerald-400">
                        Total {summary.total_jumlah_barang_pcs} Pcs
                      </span>
                      <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                        Jumlah Produk Input: <strong className="text-white font-bold">{summary.total_jumlah_bulat}x</strong>
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right text-lg sm:text-2xl font-black text-emerald-400">
                      {formatRupiah(Number(summary.grand_total_harga))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile View (Native Cards) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {data.length > 0 ? (
                data.map((item, index) => (
                  <div key={index} className="p-4 space-y-3 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-start justify-between gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0 border border-slate-200/60">
                        {index + 1}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-base flex-1 leading-snug">{item.nama_barang}</h3>
                    </div>

                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 flex items-center justify-center">
                      {renderQtyBreakdown(item.jumlah_barang_pcs, item.rasio_karton, item.rasio_pack, item.total_qty_retur_pcs, item.total_qty_bulat)}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">Total Nilai</span>
                      <span className="font-black text-slate-900 text-base sm:text-lg">
                        {formatRupiah(Number(item.total_harga))}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 font-bold text-xs">
                  {loading ? 'Sedang mengambil data...' : 'Tidak ada data penjualan untuk filter ini.'}
                </div>
              )}

              {/* Grand Total Footer Mobile */}
              <div className="p-5 bg-slate-900 text-white space-y-2">
                <span className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block">Grand Total Keseluruhan</span>
                <div className="flex justify-between items-end gap-2">
                  <div>
                    <span className="text-sm font-black text-emerald-400 block">Total {summary.total_jumlah_barang_pcs} Pcs</span>
                    <span className="text-xs text-slate-300 font-medium">Input Produk: {summary.total_jumlah_bulat}x unit</span>
                  </div>
                  <span className="text-lg sm:text-xl font-black text-emerald-400 text-right">
                    {formatRupiah(Number(summary.grand_total_harga))}
                  </span>
                </div>
              </div>
            </div>

          </section>
        </div>

      </main>
    </CEK_HAK_AKSES>
  )
}