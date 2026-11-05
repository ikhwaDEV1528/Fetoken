'use client'

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PusatKewajibanRefundPage() {
    const [listRefund, setListRefund] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchRefundData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api-be/SERVER_FAKTUR/REFUND');
            if (res.data.success) {
                setListRefund(res.data.data);
            }
        } catch (err) {
            console.error('Gagal mengambil data refund:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefundData();
    }, []);

    const handleSelesaikanRefund = async () => {
        if (!selectedItem) return;
        setIsSubmitting(true);

        try {
            const res = await axios.post('/api-be/SERVER_FAKTUR/selesaikan-refund', {
                no_referensi: selectedItem.no_referensi,
                tipe_transaksi: selectedItem.tipe_transaksi
            });

            if (res.data.success) {
                alert(res.data.message);
                setSelectedItem(null);
                fetchRefundData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal memproses transaksi refund');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalKewajiban = listRefund.reduce((acc, curr) => acc + Number(curr.nominal_refund), 0);

    return (
        <div className="min-h-screen bg-slate-900/5 antialiased selection:bg-emerald-500 selection:text-white pb-12">

            {/* Header Navigation & Back Button */}
            <header className="sticky top-0 z-30 bg-emerald-600 text-white backdrop-blur-md border-b border-emerald-650/10 px-4 sm:px-8 py-3.5 shadow-2xs transition-all">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.history.back()}
                            className="group flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 active:scale-95 transition-all duration-200 cursor-pointer border border-slate-200/80 hover:border-emerald-200"
                            title="Kembali"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                                    Manajemen Refund & Kembalian
                                </h1>
                            </div>
                            <p className="text-[11px] sm:text-xs text-white font-medium mt-1">
                                Pencairan Uang Kasir (Edit Faktur & Retur Barang)
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={fetchRefundData}
                       
                        className="flex items-center gap-2 bg-white hover:bg-emerald-50/60 text-emerald-800 hover:text-emerald-900 font-semibold px-3.5 py-2 rounded-xl text-xs border border-emerald-200/80 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="hidden sm:inline">Refresh Data</span>
                    </button>
                </div>
            </header>

            {/* Container Utama */}
            <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">

                {/* Hero Banner Widget Emerald */}
                <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8 bg-gradient-to-br from-emerald-600 via-emerald-600 to-slate-600 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-emerald-750/10 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 backdrop-blur-md uppercase tracking-wider">
                                    Total Kas Harus Dikeluarkan
                                </span>
                                <p className="text-3xl sm:text-4xl font-black tracking-tight mt-3 text-white">
                                    Rp {totalKewajiban.toLocaleString('id-ID')}
                                </p>
                            </div>
                            
                        </div>

                        <p className="text-xs text-emerald-200/70 font-medium relative z-10 mt-4">
                            Wajib diserahkan langsung kepada pelanggan dari laci kasir aktif.
                        </p>
                    </div>

                    <div className="md:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Antrean Refund Status</span>
                            <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-3xl font-black text-slate-800">{listRefund.length}</span>
                                <span className="text-sm font-semibold text-slate-500">Transaksi Pending</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>Status Sistem</span>
                            <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Terhubung
                            </span>
                        </div>
                    </div>
                </section>

                {/* Layout Tabel Laptop & Card Mobile Responsive */}
                <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">

                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Daftar Penyerahan Uang
                        </h2>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            {listRefund.length} Dokumen
                        </span>
                    </div>

                    {/* View Laptop / Desktop */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                                    <th className="py-3.5 px-6">No. Dokumen</th>
                                    <th className="py-3.5 px-4">Jenis Transaksi</th>
                                    <th className="py-3.5 px-4">Faktur Asal</th>
                                    <th className="py-3.5 px-4">Pelanggan</th>
                                    <th className="py-3.5 px-4">Nominal Uang</th>
                                    <th className="py-3.5 px-4">Keterangan</th>
                                    <th className="py-3.5 px-6 text-right">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-slate-400 font-medium animate-pulse">
                                            Memuat data refund...
                                        </td>
                                    </tr>
                                ) : listRefund.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-16 text-center">
                                            <div className="max-w-xs mx-auto space-y-2">
                                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                                                <p className="text-sm font-bold text-slate-800">Semua Uang Refund Selesai</p>
                                                <p className="text-xs text-slate-400">Tidak ada kewajiban refund pending saat ini.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    listRefund.map((item) => (
                                        <tr key={item.no_referensi} className="hover:bg-emerald-50/30 transition-colors duration-150">
                                            <td className="py-4 px-6 font-mono font-bold text-slate-800">
                                                {item.no_referensi}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${item.tipe_transaksi === 'EDIT_FAKTUR'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    <span>{item.tipe_transaksi === 'EDIT_FAKTUR' ? '✏️' : '📦'}</span>
                                                    <span>{item.tipe_transaksi === 'EDIT_FAKTUR' ? 'Dari Faktur' : 'Retur Barang'}</span>
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 font-mono text-slate-500 text-[11px]">
                                                {item.no_faktur_asal}
                                            </td>
                                            <td className="py-4 px-4 font-medium text-slate-700">
                                                {item.kode_pelanggan || '-'}
                                            </td>
                                            <td className="py-4 px-4 font-black text-emerald-700 text-sm">
                                                Rp {Number(item.nominal_refund).toLocaleString('id-ID')}
                                            </td>
                                            <td className="py-4 px-4 text-slate-500 max-w-xs truncate">
                                                {item.keterangan}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => setSelectedItem(item)}
                                                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs hover:shadow-md hover:shadow-emerald-600/20 transition-all cursor-pointer"
                                                >
                                                    <span>💵 Serahkan Uang</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* View Mobile & Tablet */}
                    <div className="block lg:hidden divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400 font-medium animate-pulse text-xs">
                                Memuat data...
                            </div>
                        ) : listRefund.length === 0 ? (
                            <div className="p-8 text-center space-y-2">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-lg font-bold">✓</div>
                                <p className="text-xs font-bold text-slate-800">Antrean Kosong</p>
                            </div>
                        ) : (
                            listRefund.map((item) => (
                                <div key={item.no_referensi} className="p-5 space-y-3.5 hover:bg-slate-50/60 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="font-mono text-xs font-bold text-slate-900 block">
                                                {item.no_referensi}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                Faktur: {item.no_faktur_asal}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.tipe_transaksi === 'EDIT_FAKTUR'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                            {item.tipe_transaksi === 'EDIT_FAKTUR' ? 'Dari Faktur' : 'Retur Barang'}
                                        </span>
                                    </div>

                                    <div className="flex items-baseline justify-between pt-1">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Pelanggan</span>
                                            <span className="text-xs font-semibold text-slate-700">{item.kode_pelanggan || '-'}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Nominal Refund</span>
                                            <span className="text-base font-black text-emerald-700">
                                                Rp {Number(item.nominal_refund).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-500 border border-slate-100">
                                        {item.keterangan}
                                    </div>

                                    <button
                                        onClick={() => setSelectedItem(item)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <span>💵 Serahkan Uang</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                </section>
            </main>

            {/* Modal Dialog Konfirmasi */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4 transition-all animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-5 duration-200">

                        <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
                            <div>
                                <h3 className="font-bold text-base text-white tracking-tight">💵 Konfirmasi Bayar Refund</h3>
                                <p className="text-[11px] text-emerald-400 font-medium">Lakukan verifikasi sebelum serahkan uang</p>
                            </div>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                                disabled={isSubmitting}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">No. Dokumen:</span>
                                    <span className="font-mono font-bold text-slate-800">{selectedItem.no_referensi}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Sumber:</span>
                                    <span className="font-medium text-slate-700">
                                        {selectedItem.tipe_transaksi === 'EDIT_FAKTUR' ? 'Edit Faktur Penjualan' : 'Dokumen Retur Barang'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Pelanggan:</span>
                                    <span className="font-semibold text-slate-800">{selectedItem.kode_pelanggan || '-'}</span>
                                </div>
                            </div>

                            <div className="bg-emerald-50/80 border border-emerald-200/80 p-5 rounded-2xl text-center">
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">Uang Tunai Dikeluarkan</span>
                                <p className="text-3xl font-black text-emerald-700 mt-1 tracking-tight">
                                    Rp {Number(selectedItem.nominal_refund).toLocaleString('id-ID')}
                                </p>
                            </div>

                            <p className="text-[11px] text-slate-500 text-center italic">
                                Klik tombol di bawah setelah uang diserahkan ke pelanggan. Sistem akan mencatat transaksi ini telah selesai (Sisa/Refund = 0).
                            </p>
                        </div>

                        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedItem(null)}
                                disabled={isSubmitting}
                                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSelesaikanRefund}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        <span>Memproses...</span>
                                    </>
                                ) : (
                                    <span>✓ Selesaikan & Bayar</span>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}