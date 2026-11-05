'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function SuratJalanPage() {
    const getTodayString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [startDate, setStartDate] = useState(getTodayString());
    const [endDate, setEndDate] = useState(getTodayString());
    
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const observer = useRef();

    const fetchSuratJalan = async (start, end, pageNum, isNewSearch = false) => {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(
                `/api-be/SERVER_SURAT_JALAN/SURAT_JALAN?startDate=${start}&endDate=${end}&page=${pageNum}&limit=20`
            );
            const result = await res.json();

            if (result.status) {
                if (isNewSearch) {
                    setItems(result.data);
                } else {
                    setItems((prev) => [...prev, ...result.data]);
                }
                setHasMore(result.meta.hasMore);
            } else {
                setErrorMsg(result.message || 'Gagal memuat data');
            }
        } catch (err) {
            setErrorMsg('Terjadi kesalahan koneksi server');
        } finally {
            setLoading(false);
        }
    };

    // Auto Fetch saat tanggal diubah
    useEffect(() => {
        if (startDate && endDate) {
            setPage(1);
            fetchSuratJalan(startDate, endDate, 1, true);
        }
    }, [startDate, endDate]);

    // Infinite Scroll Ref Callback
    const lastElementRef = useCallback((node) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore) {
                setPage((prevPage) => {
                    const nextPage = prevPage + 1;
                    fetchSuratJalan(startDate, endDate, nextPage, false);
                    return nextPage;
                });
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore, startDate, endDate]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-neutral-100 text-neutral-900 font-mono p-0 sm:p-6 print:bg-white print:p-0">
            
            {/* TOP NAVIGATION HEADER */}
            <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 py-3 sm:px-6 shadow-sm print:hidden mb-4 sm:mb-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {/* ICON BACK */}
                        <button 
                            onClick={() => window.history.back()}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                            title="Kembali"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-neutral-100 rounded-md text-neutral-700 hidden sm:block">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider font-sans text-neutral-900 leading-none">
                                    Surat Jalan Pengiriman
                                </h1>
                                <p className="text-[11px] font-sans text-neutral-500 mt-0.5">
                                    Rekapitulasi Barang Muatan Logistik
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* BUTTON CETAK SURAT JALAN */}
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 text-white font-sans text-xs uppercase tracking-wider font-bold hover:bg-emerald-500 rounded transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span className="hidden sm:inline">Cetak Surat Jalan</span>
                    </button>
                </div>
            </header>

            {/* AREA DOKUMEN SURAT JALAN */}
            <div className="max-w-4xl mx-auto bg-white border-x sm:border border-neutral-300 p-4 sm:p-8 shadow-sm print:shadow-none print:border-none">
                
                {/* FILTER RENTANG TANGGAL */}
                <div className="mb-6 pb-4 border-b border-neutral-300 print:hidden space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-neutral-700">Mulai:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-neutral-50 border border-neutral-300 px-2 py-1 rounded text-xs font-mono"
                            />
                        </div>
                        <span className="text-neutral-400">s/d</span>
                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-neutral-700">Selesai:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-neutral-50 border border-neutral-300 px-2 py-1 rounded text-xs font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* ERROR MESSAGE */}
                {errorMsg && (
                    <div className="mb-4 p-3 bg-neutral-100 border border-neutral-400 text-xs text-neutral-800 font-sans print:hidden">
                        {errorMsg}
                    </div>
                )}

                {/* KOP SURAT RESMI */}
                <div className="border-b-2 border-neutral-900 pb-4 mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-bold uppercase tracking-wider">SURAT JALAN PENGIRIMAN</h2>
                            <p className="text-xs text-neutral-600 mt-0.5">Dokumen Resmi Bawaan Kurir / Armada Logistik</p>
                        </div>
                        <div className="text-right text-xs">
                            <p className="font-bold">PERIODE KIRIM</p>
                            <p className="text-neutral-700">{startDate} s/d {endDate}</p>
                        </div>
                    </div>
                </div>

                {/* INFORMASI LOGISTIK FORMAL */}
                <div className="grid grid-cols-2 gap-4 text-xs mb-6 border-b border-neutral-200 pb-4">
                    <div>
                        <p className="text-neutral-500">EKSPEDISI / ARMADA:</p>
                        <p className="font-bold">.........................................</p>
                        <p className="text-neutral-500 mt-2">NO. POLISI VEHICLE:</p>
                        <p className="font-bold">.........................................</p>
                    </div>
                    <div>
                        <p className="text-neutral-500">NAMA DRIVER / KURIR:</p>
                        <p className="font-bold">.........................................</p>
                        <p className="text-neutral-500 mt-2">STATUS MUATAN:</p>
                        <p className="font-bold uppercase">SIAP DIKIRIM (REGULER)</p>
                    </div>
                </div>

                {/* TABEL BARANG (DESKTOP & PRINT) */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-y-2 border-neutral-900 bg-neutral-50">
                                <th className="py-2 px-2 border-r border-neutral-300 text-center w-10">NO</th>
                                <th className="py-2 px-2 border-r border-neutral-300">KODE & NAMA BARANG</th>
                                <th className="py-2 px-2 border-r border-neutral-300 text-right">TOTAL QTY (PCS)</th>
                                <th className="py-2 px-2 border-r border-neutral-300 text-center">JUMLAH MUATAN</th>
                                {/* <th className="py-2 px-2 border-r border-neutral-300">REF FAKTUR / PELANGGAN</th> */}
                                <th className="py-2 px-2 text-center w-16">CHECK</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {items.length > 0 ? (
                                items.map((item, idx) => {
                                    const isLast = idx === items.length - 1;
                                    return (
                                        <tr key={`${item.kode_barang}-${idx}`} ref={isLast ? lastElementRef : null} className="align-top">
                                            <td className="py-2.5 px-2 border-r border-neutral-200 text-center">{idx + 1}</td>
                                            <td className="py-2.5 px-2 border-r border-neutral-200">
                                                <div className="font-bold text-neutral-900">{item.nama_barang}</div>
                                                <div className="text-[10px] text-neutral-500 font-mono">#{item.kode_barang}</div>
                                            </td>
                                            <td className="py-2.5 px-2 border-r border-neutral-200 text-right font-bold">
                                                {item.total_qty_pcs} PCS
                                            </td>
                                            <td className="py-2.5 px-2 border-r border-neutral-200 text-center font-bold text-emerald-800 bg-neutral-50">
                                                {item.format_pengiriman}
                                            </td>
                                            {/* <td className="py-2.5 px-2 border-r border-neutral-200 text-[11px] text-neutral-700 leading-relaxed">
                                                <div><span className="font-bold">Faktur:</span> {item.daftar_faktur}</div>
                                                <div><span className="font-bold">Cust:</span> {item.daftar_pelanggan}</div>
                                            </td> */}
                                            {/* CHECKBOX / KOTAK CEKLIS */}
                                            <td className="py-2.5 px-2 text-center">
                                                <div className="w-5 h-5 border-2 border-neutral-800 mx-auto rounded-sm"></div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : !loading ? (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-neutral-500 italic">
                                        Tidak ada jadwal pengiriman barang pada rentang tanggal ini.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                {/* TAMPILAN MOBILE-NATIVE */}
                <div className="sm:hidden space-y-3 print:hidden">
                    {items.length > 0 ? (
                        items.map((item, idx) => {
                            const isLast = idx === items.length - 1;
                            return (
                                <div
                                    key={`mob-${item.kode_barang}-${idx}`}
                                    ref={isLast ? lastElementRef : null}
                                    className="border border-neutral-300 p-3 bg-white space-y-2 text-xs"
                                >
                                    <div className="flex justify-between items-start border-b border-neutral-200 pb-2">
                                        <div>
                                            <span className="text-[10px] text-neutral-500 block">PRODUK</span>
                                            <span className="font-bold text-sm block leading-snug">{item.nama_barang}</span>
                                            <span className="text-[10px] text-neutral-500 font-mono">#{item.kode_barang}</span>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <span className="text-[10px] text-neutral-500 block">CHECK</span>
                                            <div className="w-6 h-6 border-2 border-neutral-800 ml-auto rounded-sm"></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2 border border-neutral-200 rounded">
                                        <div>
                                            <span className="text-[10px] text-neutral-500 block">TOTAL PCS</span>
                                            <span className="font-bold text-xs">{item.total_qty_pcs} PCS</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-neutral-500 block">MUATAN KIRIM</span>
                                            <span className="font-bold text-xs text-emerald-800">{item.format_pengiriman}</span>
                                        </div>
                                    </div>
                                    {/* <div className="text-[11px] text-neutral-600 space-y-1 pt-1">
                                        <p><span className="font-semibold text-neutral-900">Ref Faktur:</span> {item.daftar_faktur}</p>
                                        <p><span className="font-semibold text-neutral-900">Pelanggan:</span> {item.daftar_pelanggan}</p>
                                    </div> */}
                                </div>
                            );
                        })
                    ) : !loading ? (
                        <div className="py-8 text-center text-neutral-500 text-xs italic border border-neutral-300">
                            Tidak ada pengiriman barang pada tanggal ini.
                        </div>
                    ) : null}
                </div>

                {/* LOADING INDICATOR */}
                {loading && (
                    <div className="py-4 text-center text-xs font-sans font-semibold text-neutral-600">
                        Memuat daftar barang...
                    </div>
                )}

                {/* KOLOM TANDA TANGAN FORMAL LOGISTIK */}
                <div className="mt-12 pt-4 border-t-2 border-neutral-900 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="space-y-12">
                        <p className="font-bold">PETUGAS GUDANG</p>
                        <p>( ................................ )</p>
                    </div>
                    <div className="space-y-12">
                        <p className="font-bold">DRIVER / KURIR</p>
                        <p>( ................................ )</p>
                    </div>
                    <div className="space-y-12">
                        <p className="font-bold">PENERIMA / POS</p>
                        <p>( ................................ )</p>
                    </div>
                </div>

            </div>
        </div>
    );
}