'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { CEK_HAK_AKSES } from '@/app/Hooks/Hooks';

export default function FakturList() {
  // State Management
  const [tanggalMulai, setTanggalMulai] = useState('2026-09-01');
  const [tanggalSelesai, setTanggalSelesai] = useState('2026-09-30');
  const [fakturList, setFakturList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  

  // Ref untuk elemen pemicu scroll di paling bawah
  const observerRef = useRef(null);

  // Fungsi Fetch Data menggunakan Axios
  const fetchFaktur = useCallback(async (isInitial = false) => {
    if (loading) return;
    setLoading(true);

    const currentPage = isInitial ? 1 : page;

    try {
      // Sesuaikan URL ini dengan endpoint Express JS milikmu
       setLoading(prev => ({
          ...prev,
          loadingRequest:true
        }))
      const response = await axios.get('/api-be/SERVER_BELANJA_BARANG/FAKTUR_BELANJA', {
        params: {
          tanggalMulai,
          tanggalSelesai,
          page: currentPage,
        },
      });

      alert(JSON.stringify(response.data.data))

      if (response.data?.success) {
        const newData = response.data.data || [];

        // Jika data yang diterima < 10, berarti sudah habis (halaman terakhir)
        if (newData.length < 10) {
          setHasMore(false);
        }

        setFakturList((prev) => (isInitial ? newData : [...prev, ...newData]));
        setPage((prevPage) => (isInitial ? 2 : prevPage + 1));
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Gagal mengambil data faktur:', error?.response?.data || error.message);
      // PENTING: Matikan observer jika terjadi 404/500 agar TIDAK INFINITE LOOP!
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [tanggalMulai, tanggalSelesai, page, loading]);

  // Trigger saat user menekan tombol Filter
  const handleFilter = (e) => {
    e.preventDefault();
    setHasMore(true);
    setFakturList([]);
    fetchFaktur(true); // Reset paksa ke page 1
  };

  // Logic Infinite Scroll via Intersection Observer
  useEffect(() => {
    const targetNode = observerRef.current;
    if (!targetNode || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchFaktur(false);
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(targetNode);

    return () => observer.disconnect();
  }, [fetchFaktur, hasMore, loading]);

 return (
  <CEK_HAK_AKSES>
  <div className="max-w-5xl mx-auto p-6 bg-slate-100 min-h-screen">
   <div className="mb-6 sm:mb-8">
  <div className="flex items-center gap-2 mb-3 sm:mb-4">
    <button
      onClick={() => window.history.back()}
      className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-emerald-700 transition-colors duration-150 cursor-pointer -ml-1 px-1 py-1 rounded-md hover:bg-emerald-50/80"
    >
      <svg
        className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
      </svg>
      Kembali
    </button>
    <span className="text-slate-300 text-xs">/</span>
    <span className="text-xs sm:text-sm text-slate-400 font-medium">Laporan Pembelian</span>
  </div>

  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
    <div className="flex gap-3 sm:gap-4 min-w-0">
      <div className="w-1 rounded-full bg-emerald-500 shrink-0" />
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-800 tracking-tight leading-tight">
          FAKTUR BELANJA BARANG
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Laporan transaksi belanja barang masuk
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2 pl-4 sm:pl-0">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100/80">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-[11px] sm:text-xs font-semibold text-emerald-700">
          Daftar faktur belanja CV Putra Bakhti Pratama
        </span>
      </div>
    </div>
  </div>
</div>

    {/* Form Filter Tanggal */}
    <form onSubmit={handleFilter} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Tanggal Mulai</label>
        <input
          type="date"
          value={tanggalMulai}
          onChange={(e) => setTanggalMulai(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-blue-600 font-medium text-slate-700"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Tanggal Selesai</label>
        <input
          type="date"
          value={tanggalSelesai}
          onChange={(e) => setTanggalSelesai(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-blue-600 font-medium text-slate-700"
          required
        />
      </div>
      <button
        type="submit"
        className="bg-emerald-600 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition shadow-sm"
      >
        Cari Faktur
      </button>
    </form>

    {/* UI List Card Faktur Fisik */}
    <div className="space-y-8">
      {fakturList.map((faktur) => {
        // Kalkulasi rincian nominal faktur
        const subtotalKotor = Number(faktur.total_harga) + Number(faktur.diskon);
        const diskon = Number(faktur.diskon);
        const totalAkhir = Number(faktur.total_harga);

        return (
          <div 
            key={faktur.id} 
            className="bg-white border-2 border-green-600 rounded-lg shadow-md hover:shadow-lg transition relative overflow-hidden"
          >
            {/* Aksesori Garis Faktur Kertas (Atas) */}
            <div className="h-2 bg-green-600 w-full" />

            <div className="p-6">
              {/* Header Faktur Fisik */}
              <div className="flex justify-between items-start border-b-2 border-dashed border-slate-200 pb-4 mb-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">
                    SUPPLIER / VENDOR
                  </span>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">
                    {faktur.nama_supplier}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ID Supplier: #{faktur.supplier_id}</p>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-100 border border-slate-300 px-3 py-1 rounded text-xs font-mono font-bold text-slate-800 mb-1">
                    {faktur.no_faktur}
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    TGL BELANJA: <strong className="text-slate-700">{new Date(faktur.tanggal_belanja).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                  </span>
                </div>
              </div>

              {/* Tabel Rincian Barang Fisik */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y-2 border-slate-800 text-slate-800 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Kode Barang</th>
                      <th className="py-2.5 px-3">Nama Barang</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-center">QTY</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                    {faktur.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{item.kode_barang}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-xs text-slate-700">{item.nama_barang}</td>
                        <td className="py-2.5 px-3 text-right font-mono">Rp {Number(item.harga_satuan).toLocaleString('id-ID')}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.jumlah}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          Rp {Number(item.subtotal).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="bg-slate-100 border border-slate-300 text-slate-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Faktur / Rincian Kalkulasi Harga */}
              <div className="flex flex-col sm:flex-row justify-between items-end gap-4 pt-2">
                <div className="text-[11px] text-slate-400 font-mono">
                  Dibuat pada: {new Date(faktur.created_at).toLocaleString('id-ID')}
                </div>

                {/* Box Ringkasan Total Nota */}
                <div className="w-full sm:w-72 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Barang:</span>
                    <span className="font-bold">Rp {subtotalKotor.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Potongan Diskon:</span>
                    <span className="font-bold">- Rp {diskon.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-1.5 flex justify-between items-center font-sans">
                    <span className="font-bold text-slate-800 text-sm">TOTAL AKHIR:</span>
                    <span className="font-black text-emerald-700 text-lg font-mono">
                      Rp {totalAkhir.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {/* Sentinel Element (Pemicu Infinite Scroll) */}
    <div ref={observerRef} className="py-8 text-center text-sm font-medium text-slate-500">
      {loading && <p className="animate-pulse">Memuat faktur fisik berikutnya...</p>}
      {!hasMore && fakturList.length > 0 && <p className="text-xs text-slate-400 uppercase tracking-widest">— Akhir Dari Dokumen Faktur —</p>}
      {!loading && fakturList.length === 0 && <p>Data faktur tidak ditemukan.</p>}
    </div>
  </div>
  </CEK_HAK_AKSES>
);
}