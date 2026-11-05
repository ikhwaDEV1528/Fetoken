'use client'
import React, { useState, useEffect } from 'react';

const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(val || 0);
};

export default function LaporanPpnPage() {
    // Default rentang tanggal: Tanggal 1 bulan ini s/d Hari ini
    const getInitialDates = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return {
            start: `${year}-${month}-01`,
            end: `${year}-${month}-${day}`
        };
    };

    const initialDates = getInitialDates();
    const [startDate, setStartDate] = useState(initialDates.start);
    const [endDate, setEndDate] = useState(initialDates.end);
    const [loading, setLoading] = useState(false);
    const [dataPpn, setDataPpn] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchRekapPpn = async (start, end) => {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`/api-be/SERVER_PAJAK/REKAP_PAJAK?startDate=${start}&endDate=${end}`);
            const result = await res.json();
            if (result.status) {
                setDataPpn(result.data);
            } else {
                setErrorMsg(result.message || 'Gagal memuat data');
            }
        } catch (err) {
            setErrorMsg('Terjadi kesalahan jaringan atau server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            fetchRekapPpn(startDate, endDate);
        }
    }, [startDate, endDate]);

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* HEADER MENU & FILTER RANGE TANGGAL */}
                <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200 pt-[env(safe-area-inset-top)] mb-6">
                    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">

                        {/* Sisi Kiri: Tombol Back (<) & Judul Header */}
                        <div className="flex items-center gap-3 min-w-0">
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
                            </button>

                            {/* Separator Tipis Desktop */}
                            <div className="hidden sm:block w-px h-8 bg-slate-200/80 shrink-0" />

                            <div className="min-w-0 flex-1">
                                <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight leading-snug truncate">
                                    Rekapitulasi PPN
                                </h1>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate mt-0.5">
                                    Pemeriksaan PPN Masukan & Keluaran Berdasarkan Periode
                                </p>
                            </div>
                        </div>

                        {/* Sisi Kanan: INPUT START & END DATE */}
                        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Mulai:</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-white text-slate-900 text-xs sm:text-sm font-bold px-2.5 py-1.5 sm:py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all cursor-pointer"
                                />
                            </div>
                            <span className="text-slate-400 font-extrabold text-xs px-0.5">s/d</span>
                            <div className="flex items-center gap-1.5">
                                <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Selesai:</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-white text-slate-900 text-xs sm:text-sm font-bold px-2.5 py-1.5 sm:py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all cursor-pointer"
                                />
                            </div>
                        </div>

                    </div>
                </header>

                {/* ERROR STATE */}
                {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium">
                        {errorMsg}
                    </div>
                )}

                {/* LOADING STATE */}
                {loading ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-emerald-100">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
                        <p className="text-sm text-slate-500 mt-3 font-medium">Menghitung Rekapitulasi PPN...</p>
                    </div>
                ) : dataPpn ? (
                    <>
                        {/* CARD UTAMA STATUS SETOR */}
                        <div className={`rounded-2xl p-6 shadow-md border text-white transition-all ${dataPpn.ringkasan.status_pajak === 'KURANG_BAYAR'
                                ? 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 border-emerald-600'
                                : 'bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 border-teal-600'
                            }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <span className="text-xs font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md bg-white/10 text-emerald-100">
                                        Periode: {dataPpn.startDate} s/d {dataPpn.endDate}
                                    </span>

                                    {/* NOMINAL DINAMIS: Tampilkan Kurang Bayar ATAU Saldo Lebih Bayar */}
                                    <h2 className="text-2xl sm:text-3xl font-extrabold mt-3">
                                        {dataPpn.ringkasan.status_pajak === 'KURANG_BAYAR'
                                            ? formatRupiah(dataPpn.ringkasan.total_yang_harus_disetor)
                                            : formatRupiah(Math.abs(dataPpn.ringkasan.selisih))
                                        }
                                    </h2>
                                </div>
                                <div className="sm:text-right mt-2 sm:mt-0">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${dataPpn.ringkasan.status_pajak === 'KURANG_BAYAR'
                                            ? 'bg-amber-400 text-amber-950'
                                            : 'bg-emerald-300 text-emerald-950'
                                        }`}>
                                        {dataPpn.ringkasan.status_pajak === 'KURANG_BAYAR'
                                            ? 'WAJIB DISETOR (KURANG BAYAR)'
                                            : dataPpn.ringkasan.status_pajak === 'LEBIH_BAYAR'
                                                ? 'LEBIH BAYAR (KOMPENSASI)'
                                                : 'NIHIL'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* DETAIL PPN KELUARAN & MASUKAN */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* PPN KELUARAN */}
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 space-y-3">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <h3 className="font-bold text-emerald-900">1. PPN Keluaran (Penjualan)</h3>
                                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                        Penjualan
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-600">
                                        <span>PPN Kotor Penjualan</span>
                                        <span className="font-semibold text-slate-800">{formatRupiah(dataPpn.ppn_keluaran.kotor)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Retur Penjualan</span>
                                        <span className="font-semibold text-rose-600">
                                            - {formatRupiah(dataPpn.ppn_keluaran.retur)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-emerald-950">
                                        <span>PPN Keluaran Bersih</span>
                                        <span className="text-emerald-700">{formatRupiah(dataPpn.ppn_keluaran.bersih)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* PPN MASUKAN */}
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 space-y-3">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <h3 className="font-bold text-emerald-900">2. PPN Masukan (Pembelian)</h3>
                                    <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                                        Restok
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-600">
                                        <span>PPN Kotor Pembelian</span>
                                        <span className="font-semibold text-slate-800">{formatRupiah(dataPpn.ppn_masukan.kotor)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Retur Pembelian</span>
                                        <span className="font-semibold text-rose-600">
                                            - {formatRupiah(dataPpn.ppn_masukan.retur)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-emerald-950">
                                        <span>PPN Masukan Bersih</span>
                                        <span className="text-teal-700">{formatRupiah(dataPpn.ppn_masukan.bersih)}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </>
                ) : null}

            </div>
        </div>
    );
}