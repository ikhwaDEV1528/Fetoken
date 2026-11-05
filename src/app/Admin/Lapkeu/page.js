'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { SubHeader } from '@/UI/Header/subHeader';
import { CEK_HAK_AKSES } from '@/app/Hooks/Hooks';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const nf2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const tglPanjang = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d} ${BULAN[Number(m) - 1]} ${y}`;
};

const formatAngka = (n) => {
  const v = Number(n) || 0;
  return (Math.round(v * 100) % 100 === 0 ? nf0 : nf2).format(v === 0 ? 0 : v);
};

function susunBaris(l) {
  return [
    { t: 'head', label: 'PENDAPATAN' },
    { t: 'sub', label: 'Pendapatan Operasional' },
    { t: 'item2', label: 'Penjualan', val: l.pendapatan.penjualan },
    { t: 'item2', label: 'Diskon Penjualan', val: l.pendapatan.diskon_penjualan },
    { t: 'item2', label: 'Retur Penjualan', val: l.pendapatan.retur_penjualan },
    { t: 'total', label: 'Jumlah Pendapatan', val: l.pendapatan.jumlah_pendapatan },
    { t: 'gap' },
    { t: 'head', label: 'BEBAN POKOK PENJUALAN' },
    { t: 'item', label: 'Beban Pokok Penjualan', val: l.beban_pokok_penjualan },
    { t: 'total', label: 'Jumlah Beban Pokok Penjualan', val: l.beban_pokok_penjualan },
    { t: 'gap' },
    { t: 'major', label: 'LABA KOTOR', val: l.laba_kotor },
    { t: 'gap' },
    { t: 'head', label: 'BEBAN OPERASIONAL' },
    ...l.beban_operasional.rincian.map((r) => ({ t: 'item', label: r.kategori_beban, val: r.total_biaya })),
    { t: 'total', label: 'Jumlah Beban Operasional', val: l.beban_operasional.total },
    { t: 'gap' },
    { t: 'major', label: 'PENDAPATAN OPERASIONAL', val: l.pendapatan_operasional },
    { t: 'gap' },
    { t: 'head', label: 'PENDAPATAN DAN BEBAN NON OPERASIONAL' },
    { t: 'sub', label: 'Pendapatan Non Operasional' },
    { t: 'total', label: 'Jumlah Pendapatan Non Operasional', val: l.non_operasional.total_pendapatan },
    { t: 'sub', label: 'Beban Non Operasional' },
    ...l.non_operasional.rincian_beban.map((r) => ({ t: 'item2', label: r.kategori_beban, val: r.total_biaya })),
    { t: 'total', label: 'Jumlah Beban Non Operasional', val: l.non_operasional.total_beban },
    { t: 'total', label: 'Jumlah Pendapatan dan Beban Non Operasional', val: l.non_operasional.total },
    { t: 'gap' },
    { t: 'grand', label: 'LABA BERSIH', val: l.laba_bersih },
  ];
}

const STYLE_BARIS = {
  head: { th: 'pt-1', td: '' },
  sub: { th: 'pl-4', td: '' },
  item: { th: 'pl-4', td: '' },
  item2: { th: 'pl-8', td: '' },
  total: { th: 'font-medium', td: 'font-medium border-t border-gray-800' },
  major: { th: 'py-2', td: 'py-2 border-t border-gray-800' },
  grand: { th: 'py-2 font-semibold', td: 'py-2 font-semibold border-t border-gray-800 border-b-4 border-double' },
};

function LaporanLabaRugiContent() {
  const [mounted, setMounted] = useState(false);
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [periode, setPeriode] = useState({ mulai: '', selesai: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dataLaporan, setDataLaporan] = useState(null);
  const abortRef = useRef(null);

  // Inisialisasi tanggal hanya di client side untuk mencegah Hydration Mismatch
  useEffect(() => {
    const now = new Date();
    const start = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = ymd(now);
    setTglMulai(start);
    setTglSelesai(end);
    setPeriode({ mulai: start, selesai: end });
    setMounted(true);
  }, []);

  const fetchLaporan = useCallback(async (mulai, selesai) => {
    if (!mulai || !selesai) return setErrorMsg('Isi tanggal mulai dan tanggal selesai.');
    if (mulai > selesai) return setErrorMsg('Tanggal mulai tidak boleh melebihi tanggal selesai.');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErrorMsg('');
    try {
      const response = await axios.get('/api-be/SERVER_LAPKEU/GET_LAPKEU', {
        params: { tgl_mulai: mulai, tgl_selesai: selesai },
        signal: controller.signal,
      });
      if (response.data?.status) {
        setDataLaporan(response.data.laporan);
        setPeriode({ mulai, selesai });
      } else {
        setErrorMsg(response.data?.message || 'Gagal memuat data laporan.');
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Terjadi kesalahan koneksi ke server.');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && tglMulai && tglSelesai) {
      fetchLaporan(tglMulai, tglSelesai);
    }
    return () => abortRef.current?.abort();
  }, [mounted, fetchLaporan]);

  if (!mounted) return null; // Mencegah SSR render beda HTML dari Client

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLaporan(tglMulai, tglSelesai);
  };

  const [sy, sm, sd] = periode.mulai ? periode.mulai.split('-') : ['', '', ''];
  const [ey, em] = periode.selesai ? periode.selesai.split('-') : ['', ''];
  const headKolom =
    sy === ey && sm === em
      ? `${Number(sd)} - ${tglPanjang(periode.selesai).replace(/^0/, '')}`
      : `${tglPanjang(periode.mulai)} - ${tglPanjang(periode.selesai)}`;

  const baris = dataLaporan ? susunBaris(dataLaporan) : [];

  return (

    <div className="max-w-6xl mx-auto bg-slate-50 space-y-4 sm:space-y-6 min-h-screen pb-20 print:bg-white print:p-0 print:pb-0">
      <div className="print:hidden">
        <SubHeader />
      </div>

      <div className="px-3.5 sm:px-6 lg:px-8 py-2 sm:py-4 space-y-4 sm:space-y-6">

        {/* FILTER FORM (RESPONSIF & TOUCH FRIENDLY) */}
        <form onSubmit={handleFilterSubmit} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <div>
              <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                Dari tanggal
              </label>
              <input
                type="date"
                value={tglMulai}
                max={tglSelesai}
                onChange={(e) => setTglMulai(e.target.value)}
                className="w-full h-12 px-3.5 border border-slate-300 rounded-xl text-base sm:text-sm font-semibold text-slate-900 bg-slate-50/80 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                Sampai tanggal
              </label>
              <input
                type="date"
                value={tglSelesai}
                min={tglMulai}
                onChange={(e) => setTglSelesai(e.target.value)}
                className="w-full h-12 px-3.5 border border-slate-300 rounded-xl text-base sm:text-sm font-semibold text-slate-900 bg-slate-50/80 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                required
              />
            </div>
          </div>

          <div className="flex gap-2.5 shrink-0 pt-1 sm:pt-0">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none h-12 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-extrabold disabled:opacity-50 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {loading ? 'Memuat...' : 'Tampilkan laporan'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!dataLaporan || loading}
              className="h-12 px-5 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-800 rounded-xl text-sm font-extrabold disabled:opacity-40 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              Cetak
            </button>
          </div>
        </form>

        {errorMsg && (
          <div role="alert" className="bg-rose-50 border border-rose-200/80 text-rose-700 p-4 rounded-2xl text-sm font-bold shadow-xs print:hidden">
            {errorMsg}
          </div>
        )}

        {/* LEMBAR LAPORAN (CLEAN & LEGIBLE TABLE) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs px-4 sm:px-8 py-6 sm:py-8 print:border-0 print:p-0 print:shadow-none">
          <div className="text-center mb-6 sm:mb-8 pb-5 border-b border-slate-100">
            <p className="font-mono text-xs sm:text-sm font-bold tracking-widest text-slate-500 uppercase">
              CV. PUTRA BAKTI PRATAMA
            </p>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Laba/Rugi (Standar)
            </h1>
            <p className="font-mono text-xs sm:text-sm font-semibold text-slate-500 mt-1.5">
              Dari {tglPanjang(periode.mulai)} s/d {tglPanjang(periode.selesai)}
            </p>
          </div>

          {!dataLaporan && loading && (
            <p className="text-center text-slate-500 py-12 text-sm font-bold">Memuat laporan...</p>
          )}

          {dataLaporan && (
            <div className="overflow-x-auto">
              <table className={`w-full text-xs sm:text-sm tabular-nums ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                <thead>
                  <tr className="border-b-2 border-slate-800">
                    <th className="text-left font-black text-slate-900 pb-2.5 uppercase tracking-wider">
                      Deskripsi
                    </th>
                    <th className="text-right font-black text-slate-900 pb-2.5 pl-4 whitespace-nowrap uppercase tracking-wider">
                      {headKolom}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {baris.map((r, i) =>
                    r.t === 'gap' ? (
                      <tr key={i} aria-hidden="true"><td colSpan={2} className="h-4" /></tr>
                    ) : (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <th scope="row" className={`text-left font-semibold py-2.5 ${STYLE_BARIS[r.t].th}`}>
                          {r.label}
                        </th>
                        <td className={`${r.val < 0 ? 'text-rose-600 font-bold' : 'text-slate-900'} text-right py-2.5 pl-4 whitespace-nowrap font-semibold ${STYLE_BARIS[r.t].td}`}>
                          {r.val === undefined ? '' : formatAngka(r.val)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>

  );
}



// PAGE //

export default function LaporanLabaRugiPage(){

  return(
    <CEK_HAK_AKSES>
       <LaporanLabaRugiContent/>
    </CEK_HAK_AKSES>
  )
}



