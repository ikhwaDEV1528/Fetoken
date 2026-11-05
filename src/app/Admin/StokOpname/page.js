'use client';
import { useState } from "react";
import axios from "axios";
import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";

export default function PageStokOpname() {
    // State Pencarian
    const [inputCari, setInputCari] = useState('');
    const [hasilCari, setHasilCari] = useState([]);
    const [loadingCari, setLoadingCari] = useState(false);

    // State Daftar Barang yang Di-Opname
    const [listOpname, setListOpname] = useState([]);
    const [catatanGlobal, setCatatanGlobal] = useState('');
    const [loadingSimpan, setLoadingSimpan] = useState(false);

    // 1. CARI BARANG BERDASARKAN NAMA / KODE
    async function handleCariBarang(e) {
        if (e) e.preventDefault();
        if (!inputCari.trim()) return alert("Masukkan nama atau kode barang!");

        try {
            setLoadingCari(true);
            const res = await axios.get('/api-be/SERVER_JUAL_BARANG/JUAL_BARANG', {
                params: { input: inputCari.trim() }
            });

            let data = [];
            if (Array.isArray(res.data?.Search)) data = res.data.Search;
            else if (Array.isArray(res.data?.data)) data = res.data.data;
            else if (Array.isArray(res.data)) data = res.data;

            if (data.length === 0) alert("Barang tidak ditemukan!");
            setHasilCari(data);
        } catch (err) {
            console.error("Error Cari Barang:", err);
            alert("Gagal mengambil data barang.");
        } finally {
            setLoadingCari(false);
        }
    }

    // 2. PILIH BARANG & MASUKKAN KE DAFTAR OPNAME
    function handlePilihBarang(barang) {
        if (listOpname.some(item => item.kode_barang === barang.kode_barang)) {
            return alert("Barang ini sudah ada di dalam daftar stok opname!");
        }

        const stokSistemPcs = Number(barang.stok_pcs) || 0;

        const itemBaru = {
            kode_barang: barang.kode_barang,
            nama_barang: barang.nama_barang,
            stok_sistem_pcs: stokSistemPcs,  // Stok Awal di Sistem
            stok_fisik_pcs: stokSistemPcs,   // Stok Hasil Hitung Fisik (default sama dulu)
            keterangan: 'Penyesuaian Stok Fisik'
        };

        setListOpname([itemBaru, ...listOpname]);
        setHasilCari([]);
        setInputCari('');
    }

    // 3. UBAH JUMLAH STOK FISIK NYATA
    function handleUbahStokFisik(index, val) {
        const updatedList = [...listOpname];
        if (val === '') {
            updatedList[index].stok_fisik_pcs = '';
        } else {
            const num = parseInt(val, 10);
            updatedList[index].stok_fisik_pcs = isNaN(num) || num < 0 ? 0 : num;
        }
        setListOpname(updatedList);
    }

    // 4. UBAH KETERANGAN ALASAN
    function handleUbahKeterangan(index, val) {
        const updatedList = [...listOpname];
        updatedList[index].keterangan = val;
        setListOpname(updatedList);
    }

    // 5. HAPUS ITEM DARI DAFTAR
    function handleHapusItem(index) {
        setListOpname(listOpname.filter((_, i) => i !== index));
    }




    // 6. SIMPAN & SINKRONKAN KE DATABASE
    async function handleSimpanOpname() {
        if (listOpname.length === 0) {
            return alert("Daftar stok opname masih kosong! Cari dan pilih barang terlebih dahulu.");
        }

        // Cek jika ada input stok fisik yang kosong
        const adaKosong = listOpname.some(i => i.stok_fisik_pcs === '');
        if (adaKosong) {
            return alert("Harap isi nilai stok fisik untuk semua barang!");
        }

        if (!confirm("Apakah Anda yakin ingin menyimpan penyesuaian stok opname ini? Stok di database akan langsung ter-update.")) {
            return;
        }

        try {
            setLoadingSimpan(true);
            const res = await axios.post('/api-be/SERVER_STOK_OPNAME/SIMPAN', {
                catatan: catatanGlobal,
                dibuat_oleh: 'ADMIN',
                items: listOpname
            });

            alert(res.data.message || "Stok Opname Berhasil Disimpan!");
            setListOpname([]);
            setCatatanGlobal('');
        } catch (err) {
            console.error("Error Simpan Opname:", err);
            alert(err?.response?.data?.message || "Gagal menyimpan stok opname.");
        } finally {
            setLoadingSimpan(false);
        }
    }

    return (
        <CEK_HAK_AKSES>
            <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased pb-20">

                {/* HEADER PUTIH STICKY RESPONSIF & ANIMASI */}
                <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200">
                    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">

                        {/* Left Section: Back Button & Title */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => window.history.back()}
                                aria-label="Kembali"
                                className="group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 active:scale-95 transition-all duration-150 shrink-0 cursor-pointer border border-slate-200/60"
                            >
                                <svg className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] text-slate-800 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <div className="hidden sm:block w-px h-8 bg-slate-200 shrink-0" />

                            <div className="min-w-0 flex flex-col justify-center">
                                <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 truncate leading-snug">
                                    Stok Opname Barang
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-0.5">
                                    Form audit pencocokan stok fisik gudang
                                </p>
                            </div>
                        </div>

                        {/* Right Section: Header Actions */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => { setListOpname([]); setCatatanGlobal(''); }}
                                className="h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-all cursor-pointer active:scale-95"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={handleSimpanOpname}
                                disabled={loadingSimpan || listOpname.length === 0}
                                className="h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {loadingSimpan ? 'Proses...' : 'Simpan & Update'}
                            </button>
                        </div>

                    </div>
                </header>

                {/* CONTAINER UTAMA */}
                <main className="max-w-6xl mx-auto px-2.5 py-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">

                    {/* Form Pencarian Barang */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sm:space-y-4">
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                            Cari Barang Yang Mau Di-Opname
                        </label>

                        <form onSubmit={handleCariBarang} className="relative flex flex-col sm:flex-row gap-2.5">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={inputCari}
                                    onChange={(e) => setInputCari(e.target.value)}
                                    placeholder="Ketik Nama Barang / Kode Barang..."
                                    className="w-full h-12 px-4 text-base sm:text-sm font-semibold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loadingCari}
                                className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer shrink-0 flex items-center justify-center"
                            >
                                {loadingCari ? 'Mencari...' : 'Cari Barang'}
                            </button>

                            {/* Dropdown List Hasil Cari */}
                            {hasilCari.length > 0 && (
                                <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl divide-y divide-slate-100">
                                    {hasilCari.map((barang, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handlePilihBarang(barang)}
                                            className="p-3.5 sm:p-4 hover:bg-indigo-50/70 cursor-pointer flex justify-between items-center transition-colors gap-3"
                                        >
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="inline-block bg-slate-100 font-mono text-slate-700 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">
                                                        {barang.kode_barang}
                                                    </span>
                                                </div>
                                                <p className="text-sm sm:text-base font-bold text-slate-900 truncate">{barang.nama_barang}</p>
                                            </div>
                                            <div className="text-xs sm:text-sm font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg shrink-0 border border-indigo-100">
                                                Stok: {barang.stok_pcs ?? 0} PCS
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Tabel & List Barang Opname */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/80 flex justify-between items-center">
                            <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                                Daftar Penyesuaian Stok ({listOpname.length} Item)
                            </h2>
                        </div>

                        {/* 1. MOBILE VIEW (CARD LAYOUT LEBAAR & NATIVE) */}
                        <div className="block lg:hidden divide-y divide-slate-100 p-3 sm:p-4 space-y-3.5 sm:space-y-0">
                            {listOpname.length === 0 ? (
                                <div className="py-12 text-center space-y-2">
                                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-base font-bold">
                                        0
                                    </div>
                                    <p className="text-sm sm:text-base font-bold text-slate-600">Belum ada barang dipilih</p>
                                    <p className="text-xs text-slate-400">Silakan cari barang di atas lalu klik untuk meng-opname</p>
                                </div>
                            ) : (
                                listOpname.map((item, idx) => {
                                    const stokFisik = item.stok_fisik_pcs === '' ? 0 : Number(item.stok_fisik_pcs);
                                    const selisih = stokFisik - item.stok_sistem_pcs;

                                    return (
                                        <div key={idx} className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
                                            {/* Row Top: Info Barang & Hapus */}
                                            <div className="flex justify-between items-start gap-2.5">
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <span className="text-xs font-mono font-bold text-slate-400 px-2 py-0.5 bg-slate-100 rounded border border-slate-200 inline-block">
                                                        #{item.kode_barang}
                                                    </span>
                                                    <h3 className="font-bold text-slate-900 text-base leading-snug break-words">{item.nama_barang}</h3>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleHapusItem(idx)}
                                                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 active:bg-rose-50 rounded-xl border border-slate-200/60 transition-colors shrink-0 cursor-pointer text-sm font-bold"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {/* Grid Stok Sistem & Physical Input */}
                                            <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                                                <div className="space-y-1 flex flex-col justify-center">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Stok Sistem</span>
                                                    <span className="text-base sm:text-lg font-black text-slate-800">{item.stok_sistem_pcs} PCS</span>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">Stok Fisik</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.stok_fisik_pcs}
                                                        onChange={(e) => handleUbahStokFisik(idx, e.target.value)}
                                                        className="w-full h-12 text-center text-base sm:text-lg font-black p-2 border-2 border-indigo-400 rounded-xl focus:border-indigo-600 outline-none bg-white text-slate-900 shadow-xs"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row Status Selisih */}
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-xs font-bold text-slate-500 uppercase">Indikator Selisih:</span>
                                                {selisih === 0 ? (
                                                    <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-extrabold border border-slate-200">
                                                        0 (Sesuai)
                                                    </span>
                                                ) : selisih > 0 ? (
                                                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                                                        +{selisih} PCS (Surplus)
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-xl bg-rose-100 text-rose-800 text-xs font-extrabold border border-rose-200">
                                                        {selisih} PCS (Kurang)
                                                    </span>
                                                )}
                                            </div>

                                            {/* Input Keterangan */}
                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    value={item.keterangan}
                                                    onChange={(e) => handleUbahKeterangan(idx, e.target.value)}
                                                    placeholder="Alasan selisih (misal: Rusak / Hilang)"
                                                    className="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50"
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* 2. DESKTOP VIEW (DESKTOP TABLE) */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Kode & Nama Barang</th>
                                        <th className="p-4 text-center">Stok Awal (Sistem)</th>
                                        <th className="p-4 text-center w-40">Stok Fisik Nyata</th>
                                        <th className="p-4 text-center">Selisih</th>
                                        <th className="p-4">Keterangan / Alasan</th>
                                        <th className="p-4 text-center w-16">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                                    {listOpname.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-14 text-center text-slate-400 font-medium">
                                                Belum ada barang dipilih. Silakan cari barang di atas lalu klik barang untuk memasukkannya ke daftar ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        listOpname.map((item, idx) => {
                                            const stokFisik = item.stok_fisik_pcs === '' ? 0 : Number(item.stok_fisik_pcs);
                                            const selisih = stokFisik - item.stok_sistem_pcs;

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                    {/* Nama Barang */}
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-900 text-base leading-snug">{item.nama_barang}</div>
                                                        <div className="text-xs font-mono font-medium text-slate-400 mt-0.5">#{item.kode_barang}</div>
                                                    </td>

                                                    {/* Stok Sistem */}
                                                    <td className="p-4 text-center font-extrabold text-slate-700 text-base">
                                                        {item.stok_sistem_pcs} PCS
                                                    </td>

                                                    {/* Input Stok Fisik */}
                                                    <td className="p-4 text-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.stok_fisik_pcs}
                                                            onChange={(e) => handleUbahStokFisik(idx, e.target.value)}
                                                            className="w-28 h-11 text-center text-base font-black p-2 border-2 border-indigo-400 rounded-xl focus:border-indigo-600 outline-none bg-indigo-50/30 text-slate-900"
                                                        />
                                                    </td>

                                                    {/* UI Indikator Selisih */}
                                                    <td className="p-4 text-center font-extrabold text-sm">
                                                        {selisih === 0 ? (
                                                            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                                                                0 (Sesuai)
                                                            </span>
                                                        ) : selisih > 0 ? (
                                                            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                +{selisih} PCS (Surplus)
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
                                                                {selisih} PCS (Kurang)
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Keterangan */}
                                                    <td className="p-4">
                                                        <input
                                                            type="text"
                                                            value={item.keterangan}
                                                            onChange={(e) => handleUbahKeterangan(idx, e.target.value)}
                                                            placeholder="Alasan selisih (misal: Rusak / Hilang)"
                                                            className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                                                        />
                                                    </td>

                                                    {/* Hapus */}
                                                    <td className="p-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleHapusItem(idx)}
                                                            className="w-8 h-8 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer font-bold"
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Catatan Dokumen */}
                        {listOpname.length > 0 && (
                            <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-200/80 space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Catatan Tambahan Opname (Opsional)</label>
                                <textarea
                                    value={catatanGlobal}
                                    onChange={(e) => setCatatanGlobal(e.target.value)}
                                    rows="2"
                                    placeholder="Catatan umum transaksi opname ini..."
                                    className="w-full p-3.5 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                                ></textarea>
                            </div>
                        )}
                    </div>

                </main>
            </div>
        </CEK_HAK_AKSES>
    );
}