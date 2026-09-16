'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';
import { CEK_HAK_AKSES } from '@/app/Hooks/Hooks';

// Komponen Card Faktur Fisik Penjualan (UI Desain Faktur Fisik Perusahaan)
function FakturPenjualanCard({ faktur }) {
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Faktur-Penjualan-${faktur.no_faktur}`,
  });

  return (
 
    <div className="bg-white border-2 border-slate-300 rounded-lg shadow-md hover:shadow-xl transition relative overflow-hidden my-6">
      {/* Aksesori Visual Kertas Dot-Matrix / Continuous Form Top Bar */}
      <div className="h-3 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 w-full flex items-center justify-between px-2">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
        </div>
        <span className="text-[9px] font-mono text-emerald-100 tracking-widest uppercase">ORIGINAL INVOICE</span>
      </div>

      {/* Area yang dicetak ke printer */}
      <div ref={printRef} className="p-8 bg-white print:p-6 text-slate-900 font-sans">
        {/* Kop Faktur Perusahaan & Header Dokumen */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-4 mb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-black text-slate-900 tracking-tight">CV. PUTRA BAKHTI PRATAMA</span>
              <span className="text-[10px] bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded uppercase">FAKTUR</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">l Letjen Sutoyo No.8, RT.001/RW.15, Brebes Tengah, Brebes, Kec. Brebes, Kabupaten Brebes, Jawa Tengah</p>
            <p className="text-[11px] text-slate-600">Telp/WA: 081399549218 | Email: ikhwan123@gmail.com</p>
          </div>

          <div className="text-left sm:text-right border-l-2 sm:border-l-0 border-slate-300 pl-3 sm:pl-0 w-full sm:w-auto">
            <h2 className="text-xl font-black text-emerald-800 tracking-wider uppercase underline decoration-2 underline-offset-4 mb-1">
              FAKTUR PENJUALAN
            </h2>
            <p className="text-xs font-mono font-bold text-slate-800">
              NO: <span className="bg-slate-100 px-2 py-0.5 border border-slate-300 rounded">{faktur.no_faktur}</span>
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Tanggal: <strong className="text-slate-800">{new Date(faktur.tgl_faktur).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
            </p>
          </div>
        </div>

        {/* Informasi Kepada Pelanggan & Admin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs bg-slate-50 p-3 rounded border border-slate-200">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Kepada Yth / Pelanggan:</span>
            <p className="font-bold text-slate-900 text-sm uppercase">{faktur.nama_pelanggan}</p>
            <p className="font-mono text-slate-500 text-[11px]">Kode Cust: {faktur.kode_pelanggan || '-'}</p>
          </div>
          <div className="sm:text-right flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Petugas / Kasir:</span>
              <p className="font-semibold text-slate-800">{faktur.nama_admin}</p>
            </div>
            {faktur.jatuhtempo_faktur && (
              <p className="text-[11px] text-slate-600 mt-1">
                Jatuh Tempo: <strong className="text-rose-700">{new Date(faktur.jatuhtempo_faktur).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Tabel Fisik Rincian Barang */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs border-collapse border border-slate-800">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-800 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2 px-3 border-r border-slate-800 w-12 text-center">No</th>
                <th className="py-2 px-3 border-r border-slate-800">Kode & Nama Barang</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Harga Satuan</th>
                <th className="py-2 px-3 border-r border-slate-800 text-center w-16">QTY</th>
                <th className="py-2 px-3 border-r border-slate-800 text-center w-16">Satuan</th>
                <th className="py-2 px-3 text-right">Total Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {faktur.items?.map((item, idx) => (
                <tr key={item.id_detail || idx} className="hover:bg-slate-50">
                  <td className="py-2 px-3 border-r border-slate-300 text-center font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-300">
                    <span className="font-bold text-slate-900 block">{item.nama_barang}</span>
                    <span className="font-mono text-[10px] text-slate-500">{item.kode_barang}</span>
                  </td>
                  <td className="py-2 px-3 border-r border-slate-300 text-right font-mono">
                    Rp {Number(item.harga_jual).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-slate-900">{item.jumlah_keluar}</td>
                  <td className="py-2 px-3 border-r border-slate-300 text-center uppercase text-[10px] text-slate-600">{item.satuan}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    Rp {Number(item.total_harga).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ringkasan Pembayaran & Tanda Tangan Dokumen */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-2">
          {/* Kolom Keterangan & Garis Tanda Tangan */}
          <div className="sm:col-span-7 space-y-4">
            <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="font-bold text-slate-700 block mb-0.5">Catatan / Keterangan:</span>
              <p className="text-slate-600 italic text-[11px]">{faktur.keterangan || 'Tidak ada catatan tambahan.'}</p>
            </div>

            {/* Bagian Tanda Tangan Fisik Faktur */}
            <div className="grid grid-cols-2 gap-4 text-center text-[11px] pt-2 print:flex print:justify-between">
              <div>
                <p className="text-slate-500 mb-10">Tanda Terima,</p>
                <p className="font-bold text-slate-900 underline uppercase">( {faktur.nama_pelanggan} )</p>
              </div>
              <div>
                <p className="text-slate-500 mb-10">Hormat Kami,</p>
                <p className="font-bold text-slate-900 underline uppercase">( {faktur.nama_admin} )</p>
              </div>
            </div>
          </div>

          {/* Kolom Subtotal / Pembayaran / Piutang */}
          <div className="sm:col-span-5 w-full bg-slate-50 p-3 rounded-lg border-2 border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center text-slate-700 border-b border-slate-200 pb-1.5">
              <span>Status Faktur:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${faktur?.status?.trim()?.toUpperCase() === 'LUNAS'  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                {faktur.status}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-700 pt-1">
              <span className='text-xs '>Total Belanja Pelanggan:</span>
              <span className="font-bold text-orange-400 text-xs">Rp {Number(faktur.items.reduce((acc,item)=> acc + item.total_harga , 0)).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 pt-1">
              <span>Pembayaran (DP/Cash):</span>
              <span className="font-bold text-emerald-700 text-xs">Rp {Number(faktur.pembayaran).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-900 font-bold border-t border-slate-300 pt-1.5 text-sm">
              <span>Sisa Piutang:</span>
              <span
               className={`font-semibold px-2 py-0.5 rounded-full text-xs inline-block ${
                Number(faktur.sisa_piutang) === 0
                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                : "bg-rose-50 text-rose-700 border border-rose-200"
               }`}
              > {Number(faktur.sisa_piutang) === 0 ? `Rp.${Number(faktur.sisa_piutang).toLocaleString("id-ID")} LUNAS` : `Rp ${Number(faktur.sisa_piutang).toLocaleString("id-ID")}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tombol Print Outside Sheet */}
      <div className="p-3 bg-slate-100 border-t border-slate-300 flex justify-end print:hidden">
        <button
          onClick={() => handlePrint()}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded transition flex items-center gap-2 shadow"
        >
          <span>🖨️ Cetak Nota/Faktur Penjualan</span>
        </button>
      </div>
    </div>
  
  );
}

export default function LihatPenjualanBarang() {
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [fakturList, setFakturList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const observerRef = useRef(null);

  const fetchFaktur = useCallback(async (isNewFilter = false) => {
    if (!tanggalMulai || !tanggalSelesai) return;
    if (loading) return;

    setLoading(true);
    const currentPage = isNewFilter ? 1 : page;

    try {
      const response = await axios.get('/api-be/SERVER_JUAL_BARANG/AMBIL_FAKTUR_PENJUALAN', {
        params: {
          tanggalMulai,
          tanggalSelesai,
          page: currentPage,
        },
      });

      const newItems = response.data.data || [];

      if (isNewFilter) {
        setFakturList(newItems);
        setPage(2);
      } else {
        setFakturList((prev) => [...prev, ...newItems]);
        setPage((prev) => prev + 1);
      }

      if (newItems.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (error) {
      console.error('Gagal mengambil data faktur penjualan:', error?.response?.data || error.message);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [tanggalMulai, tanggalSelesai, page, loading]);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchFaktur(true);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchFaktur(false);
        }
      },
      { threshold: 0.5 }
    );

    if (observerRef.current) observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [fetchFaktur, hasMore, loading]);

  return (
    <CEK_HAK_AKSES>
    <div className="max-w-5xl mx-auto p-6 bg-slate-100 min-h-screen">
    <div className="mb-6 sm:mb-8 flex items-start gap-3 sm:gap-4">
  {/* Tombol Back */}
  <button
    onClick={() => window.history.back()}
    className="group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50/60 active:scale-95 transition-all duration-150 shrink-0 mt-0.5 cursor-pointer"
    title="Kembali"
  >
    <svg
      className="w-4.5 h-4.5 transition-transform duration-200 group-hover:-translate-x-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
    </svg>
  </button>

  {/* Icon Badge + Title */}
  <div className="flex items-start gap-3 min-w-0 flex-1">
    <div className="hidden xs:flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>

    <div className="min-w-0 space-y-0.5">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight leading-tight">
          FAKTUR PENJUALAN BARANG
        </h1>
        <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
          Laporan
        </span>
      </div>
      <p className="text-xs sm:text-sm text-slate-500">
        Laporan data penjualan dan piutang pelanggan
      </p>
    </div>
  </div>
</div>

      <form onSubmit={handleFilter} className="bg-white p-4 rounded-xl shadow-sm border border-slate-300 mb-8 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Tanggal Mulai</label>
          <input
            type="date"
            value={tanggalMulai}
            onChange={(e) => setTanggalMulai(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-emerald-600 font-medium text-slate-700"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Tanggal Selesai</label>
          <input
            type="date"
            value={tanggalSelesai}
            onChange={(e) => setTanggalSelesai(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-emerald-600 font-medium text-slate-700"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition shadow-sm"
        >
          Cari Penjualan
        </button>
      </form>

      <div className="space-y-8">
        {fakturList.map((faktur) => (
          <FakturPenjualanCard key={faktur.no_faktur} faktur={faktur} />
        ))}
      </div>

      <div ref={observerRef} className="py-8 text-center text-sm font-medium text-slate-500">
        {loading && <p className="animate-pulse">Memuat faktur penjualan berikutnya...</p>}
        {!hasMore && fakturList.length > 0 && <p className="text-xs text-slate-400 uppercase tracking-widest">— Akhir Dari Dokumen Penjualan —</p>}
        {!loading && fakturList.length === 0 && <p className="text-slate-500">Pilih rentang tanggal dan klik cari untuk menampilkan data.</p>}
      </div>
    </div>
    </CEK_HAK_AKSES>
  );
}