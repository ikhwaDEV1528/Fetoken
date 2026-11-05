'use client';

import React, { useState, useMemo } from 'react';
import axios from 'axios';

export default function ReturBelanjaPage() {
    const [noFakturInput, setNoFakturInput] = useState('');
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [fakturData, setFakturData] = useState(null);
    const [selectedItems, setSelectedItems] = useState({});
    const [catatan, setCatatan] = useState('');

    const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

    const handleCariFaktur = async (e) => {
        e.preventDefault();
        if (!noFakturInput.trim()) return alert("Masukkan Nomor Faktur Pembelian!");

        setLoadingSearch(true);
        try {
            const res = await axios.get(`/api-be/SERVER_RETUR_BELANJA/CARI_FAKTUR_BELANJA?input_no_faktur=${encodeURIComponent(noFakturInput.trim())}`);
            if (res.data?.status) {
                setFakturData(res.data.faktur);
                setSelectedItems({});
            }
        } catch (err) {
            alert(err.response?.data?.message || "Faktur Pembelian tidak ditemukan!");
            setFakturData(null);
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleToggleCheck = (item) => {
        const id = item.id_detail;
        if (selectedItems[id]) {
            const copy = { ...selectedItems };
            delete copy[id];
            setSelectedItems(copy);
        } else {
            // Tapis satuan yang muat dengan sisa_retur_pcs sahaja
            const validSatuans = item.satuans?.filter(s => Number(s.rasio_ke_pcs) <= item.sisa_retur_pcs) || [];
            const defaultSatuanObj = validSatuans.find(s => s.nama_satuan === item.satuan_beli) || validSatuans[validSatuans.length - 1] || { nama_satuan: 'PCS', rasio_ke_pcs: 1 };

            const defaultSatuan = defaultSatuanObj.nama_satuan;
            const defaultRasio = Number(defaultSatuanObj.rasio_ke_pcs) || 1;
            const hargaUnit = Math.round(item.harga_retur_pcs * defaultRasio);

            setSelectedItems({
                ...selectedItems,
                [id]: {
                    id_detail_pembelian: item.id_detail,
                    kode_barang: item.kode_barang,
                    nama_barang: item.nama_barang,
                    satuan_retur: defaultSatuan,
                    rasio_pcs: defaultRasio,
                    qty_input: 1,
                    qty_retur_pcs: 1 * defaultRasio,
                    harga_unit: hargaUnit,
                    harga_retur_pcs: item.harga_retur_pcs,
                    max_sisa_pcs: item.sisa_retur_pcs,
                    kondisi_barang: 'BAGUS',
                    alasan_retur: '',
                    subtotal_retur: Math.round(1 * defaultRasio * item.harga_retur_pcs)
                }
            });
        }
    };

    const handleItemChange = (id, field, value, itemOriginal) => {
        const current = selectedItems[id];
        if (!current) return;

        let updated = { ...current, [field]: value };

        if (field === 'satuan_retur') {
            const selectedOpt = itemOriginal.satuans.find(s => s.nama_satuan === value);
            const rasio = selectedOpt ? Number(selectedOpt.rasio_ke_pcs) : 1;

            updated.rasio_pcs = rasio;
            updated.harga_unit = Math.round(itemOriginal.harga_retur_pcs * rasio);

            const maxQtyUnit = Math.floor(current.max_sisa_pcs / rasio);
            let qtyNum = Math.max(1, Number(updated.qty_input) || 1);
            if (qtyNum > maxQtyUnit) qtyNum = maxQtyUnit;

            updated.qty_input = qtyNum;
            updated.qty_retur_pcs = qtyNum * rasio;
        }

        if (field === 'qty_input') {
            const maxQtyUnit = Math.floor(current.max_sisa_pcs / current.rasio_pcs);
            let qtyNum = Number(value);

            if (qtyNum > maxQtyUnit) {
                alert(`Maksimal retur untuk ${current.satuan_retur} adalah ${maxQtyUnit}!`);
                qtyNum = maxQtyUnit;
            } else if (qtyNum < 1 && value !== '') {
                qtyNum = 1;
            }

            updated.qty_input = value === '' ? '' : qtyNum;
            updated.qty_retur_pcs = (Number(updated.qty_input) || 0) * current.rasio_pcs;
        }

        updated.subtotal_retur = Math.round(updated.qty_retur_pcs * updated.harga_retur_pcs);
        setSelectedItems({ ...selectedItems, [id]: updated });
    };

    const totalGrandRetur = useMemo(() => Object.values(selectedItems).reduce((acc, curr) => acc + (curr.subtotal_retur || 0), 0), [selectedItems]);

    const handleSubmitRetur = async () => {
        const itemList = Object.values(selectedItems);
        if (itemList.length === 0) return alert("Pilih minimal 1 barang untuk diretur!");

        for (const item of itemList) {
            if (item.qty_retur_pcs <= 0) return alert(`Qty retur ${item.nama_barang} harus > 0!`);
            if (item.qty_retur_pcs > item.max_sisa_pcs) {
                const maxUnitStr = Math.floor(item.max_sisa_pcs / item.rasio_pcs);
                return alert(`Qty retur ${item.nama_barang} (${item.qty_input} ${item.satuan_retur}) melebihi sisa yang bisa diretur (Maksimal ${maxUnitStr} ${item.satuan_retur})!`);
            }
        }

        if (!window.confirm(`Proses Retur Belanja senilai ${formatIDR(totalGrandRetur)}? Sisa utang toko akan dipotong.`)) return;

        setLoadingSubmit(true);
        try {
            const payload = {
                no_faktur: fakturData.no_faktur,
                id_supplier: fakturData.id_supplier,
                catatan,
                dibuat_oleh: 'ADMIN',
                items: itemList.map(i => ({
                    id_detail_pembelian: i.id_detail_pembelian,
                    kode_barang: i.kode_barang,
                    qty_retur_input: Number(i.qty_input),
                    satuan_retur: i.satuan_retur,
                    rasio_pcs: i.rasio_pcs,
                    qty_retur_pcs: i.qty_retur_pcs,
                    harga_retur_pcs: i.harga_retur_pcs,
                    subtotal_retur: i.subtotal_retur,
                    kondisi_barang: i.kondisi_barang, // Kirim kondisi_barang secara langsung
                    sumber_stok: i.kondisi_barang,
                    alasan_retur: i.alasan_retur
                }))
            };

            const res = await axios.post('/api-be/SERVER_RETUR_BELANJA/PROSES_RETUR_BELANJA', payload);
            if (res.data?.status) {
                alert(`RETUR BERHASIL!\nNo Retur: ${res.data.no_retur}\nPotongan Utang: ${formatIDR(res.data.total_potongan_utang)}\nSisa Utang Faktur: ${formatIDR(res.data.sisa_utang_sekarang)}`);
                setFakturData(null);
                setSelectedItems({});
                setNoFakturInput('');
                setCatatan('');
            }
        } catch (err) {
            alert(err.response?.data?.message || "Gagal memproses retur.");
        } finally {
            setLoadingSubmit(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased pb-20">

            {/* HEADER STICKY PUTIH CLEAN (MOBILE-FIRST & GLASSMORPHISM) */}
            <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200 pt-[env(safe-area-inset-top)] mb-4 sm:mb-6">
                <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">

                    {/* Sisi Kiri: Tombol Back (<) & Judul Halaman */}
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

                        {/* Title & Subtitle */}
                        <div className="min-w-0 flex flex-col justify-center">
                            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug truncate">
                                RETUR BELANJA BARANG MULTI-SATUAN
                            </h1>
                            <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate mt-0.5">
                                Pengembalian barang ke supplier & pemotongan utang nota
                            </p>
                        </div>
                    </div>

                </div>
            </header>

            {/* MAIN CONTAINER CONTENT */}
            <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">

                {/* FORM CARI FAKTUR */}
                <form onSubmit={handleCariFaktur} className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        className="flex-1 h-12 px-4 text-base sm:text-sm font-semibold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                        placeholder="Masukkan Nomor Faktur Pembelian..."
                        value={noFakturInput}
                        onChange={(e) => setNoFakturInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loadingSearch}
                        className="h-12 px-6 sm:px-8 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center"
                    >
                        {loadingSearch ? "Memuat..." : "Cari Faktur"}
                    </button>
                </form>

                {/* DETAIL FAKTUR & ITEM LIST */}
                {fakturData && (
                    <div className="space-y-4 sm:space-y-6">

                        {/* INFO SUMMARY FAKTUR */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="space-y-0.5">
                                <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-slate-400 block">
                                    No Faktur Pembelian
                                </span>
                                <h2 className="text-lg sm:text-xl font-black text-slate-900">{fakturData.no_faktur}</h2>
                                <p className="text-xs sm:text-sm font-medium text-slate-600">
                                    Supplier: <span className="font-extrabold text-slate-900">{fakturData.nama_supplier}</span>
                                </p>
                            </div>
                            <div className="self-start sm:self-auto">
                                <span className="text-xs sm:text-sm bg-amber-50 text-amber-900 border border-amber-200/80 px-3.5 py-1.5 rounded-xl font-extrabold block">
                                    Sisa Utang: {formatIDR(fakturData.sisa_utang_faktur)}
                                </span>
                            </div>
                        </div>

                        {/* DAFTAR ITEM BARANG */}
                        <div className="space-y-3.5">
                            {fakturData.items.map((item) => {
                                const isChecked = !!selectedItems[item.id_detail];
                                const curItem = selectedItems[item.id_detail];

                                // Hanya tampilkan satuan yang muat dengan sisa_retur_pcs
                                const validSatuans = item.satuans?.filter(s => Number(s.rasio_ke_pcs) <= item.sisa_retur_pcs) || [];

                                return (
                                    <div
                                        key={item.id_detail}
                                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${isChecked
                                                ? 'bg-emerald-50/50 border-emerald-500/80 shadow-xs'
                                                : 'bg-white border-slate-200/80 shadow-xs'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3.5">
                                            <input
                                                type="checkbox"
                                                disabled={item.is_fully_returned}
                                                checked={isChecked}
                                                onChange={() => handleToggleCheck(item)}
                                                className="mt-1 w-5 h-5 text-emerald-600 rounded-lg border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                                            />
                                            <div className="flex-1 min-w-0 space-y-3">

                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                                    <div className="min-w-0">
                                                        <h4 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug break-words">
                                                            {item.nama_barang}
                                                        </h4>
                                                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                                                            Belanja: <span className="font-bold text-slate-700">{item.qty_beli} {item.satuan_beli}</span> ({formatIDR(item.harga_dasar_transaksi)}/{item.satuan_beli})
                                                        </p>
                                                    </div>
                                                    <div className="sm:text-right shrink-0">
                                                        <span className="font-black text-emerald-700 block text-sm sm:text-base">
                                                            {formatIDR(item.harga_retur_pcs)} / PCS
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-400">
                                                            Sisa Retur: {item.sisa_retur_pcs} PCS
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* FORM ITEM RETUR (EXPANDABLE) */}
                                                {isChecked && curItem && (
                                                    <div className="pt-3.5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3.5">

                                                        <div>
                                                            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                                                                Satuan Retur
                                                            </label>
                                                            <select
                                                                value={curItem.satuan_retur}
                                                                onChange={(e) => handleItemChange(item.id_detail, 'satuan_retur', e.target.value, item)}
                                                                className="w-full h-11 px-3 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                                                            >
                                                                {validSatuans.map((s, idx) => (
                                                                    <option key={idx} value={s.nama_satuan}>
                                                                        {s.nama_satuan} (Isi {s.rasio_ke_pcs} PCS)
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                                                                Qty Retur (Maks: {Math.floor(curItem.max_sisa_pcs / curItem.rasio_pcs)} {curItem.satuan_retur})
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={Math.floor(curItem.max_sisa_pcs / curItem.rasio_pcs)}
                                                                value={curItem.qty_input}
                                                                onChange={(e) => handleItemChange(item.id_detail, 'qty_input', e.target.value, item)}
                                                                className="w-full h-11 px-3 border border-slate-300 rounded-xl font-extrabold text-slate-900 text-xs sm:text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                                                                Kondisi Barang
                                                            </label>
                                                            <select
                                                                value={curItem.kondisi_barang}
                                                                onChange={(e) => handleItemChange(item.id_detail, 'kondisi_barang', e.target.value, item)}
                                                                className="w-full h-11 px-3 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                                                            >
                                                                <option value="BAGUS">Potong Stok dari Master Barang</option>
                                                                <option value="RUSAK">Potong Stok dari Barang Rusak</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                                                                Alasan Retur
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="Sebab retur..."
                                                                value={curItem.alasan_retur}
                                                                onChange={(e) => handleItemChange(item.id_detail, 'alasan_retur', e.target.value, item)}
                                                                className="w-full h-11 px-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                                                            />
                                                        </div>

                                                        {/* RINGKASAN SUB-TOTAL ITEM */}
                                                        <div className="sm:col-span-2 bg-emerald-100/70 border border-emerald-200/80 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                            <div>
                                                                <span className="text-xs font-extrabold text-emerald-900 block">
                                                                    Harga Retur per {curItem.satuan_retur}: <span className="font-black">{formatIDR(curItem.harga_unit)}</span>
                                                                </span>
                                                                <span className="text-[11px] text-emerald-800 font-bold">
                                                                    Konversi total: {curItem.qty_input || 0} {curItem.satuan_retur} = {curItem.qty_retur_pcs} PCS
                                                                </span>
                                                            </div>
                                                            <div className="sm:text-right self-end sm:self-auto">
                                                                <span className="text-xs text-emerald-800 block font-bold">Subtotal Item:</span>
                                                                <span className="text-lg sm:text-xl font-black text-emerald-950">{formatIDR(curItem.subtotal_retur)}</span>
                                                            </div>
                                                        </div>

                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* SUBMIT FORM & CATATAN */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <textarea
                                rows="2"
                                className="w-full p-3.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/80 placeholder:text-slate-400 placeholder:font-normal"
                                placeholder="Catatan retur..."
                                value={catatan}
                                onChange={(e) => setCatatan(e.target.value)}
                            />
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-3 border-t border-slate-200/80 gap-3">
                                <div>
                                    <span className="text-xs uppercase font-extrabold text-slate-400 block">
                                        Total Potongan Utang:
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                                        {formatIDR(totalGrandRetur)}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSubmitRetur}
                                    disabled={loadingSubmit}
                                    className="h-12 px-8 sm:px-10 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center shrink-0"
                                >
                                    {loadingSubmit ? "Memproses..." : "Simpan & Terapkan Retur"}
                                </button>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}