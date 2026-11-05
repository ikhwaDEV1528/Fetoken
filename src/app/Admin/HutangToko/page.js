'use client';

import axios from "axios";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { HeaderHutangSupplier } from "./Components/Header";
import { Konteks } from "@/GlobalNilai/Global";
import { LoadingRequest } from "@/UI/Loading/LoadingRequest";

// ============================================================================
// HALAMAN HUTANG SUPPLIER (hutang toko ke supplier)
//   - Daftar supplier yang masih dihutangi + ringkasan + cari + urutan + paging
//   - Klik supplier -> panel: faktur belanja belum lunas, bayar PER FAKTUR
//   - Riwayat pembayaran supplier (dengan "muat lebih banyak")
// FE tidak menghitung nominal final. Backend yang memvalidasi & menyimpan;
// validasi di sini hanya mencerminkan aturan BE agar admin cepat tahu salahnya.
// Endpoint: /api-be/SERVER_HUTANG/{DAFTAR_HUTANG_SUPPLIER, DETAIL_HUTANG_SUPPLIER,
//                                   BAYAR_HUTANG, RIWAYAT_PEMBAYARAN_HUTANG}
// ============================================================================
const API = '/api-be/SERVER_HUTANG';
const LIMIT_DAFTAR = 20;
const LIMIT_RIWAYAT = 10;
const MAX_ITEMS_BAYAR = 50;                 // sama dengan BE
const MAX_NOMINAL = 100_000_000_000;        // sama dengan BE
const METODE = ['TUNAI', 'TRANSFER'];
const NO_CACHE = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };

const num = (v) => Number(v) || 0;
const rp = (v) => num(v).toLocaleString('id-ID');
const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '').slice(0, 12);
const pesanError = (err, fallback) => err?.response?.data?.message || fallback;

// UUID untuk request_id (anti dobel simpan). randomUUID hanya ada di HTTPS/localhost,
// jadi ada cadangan agar tetap jalan di HTTP jaringan lokal.
function buatRequestId() {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch { /* lanjut ke cadangan */ }
    const b = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// hari = hari menuju jatuh tempo (negatif = telat, null = tidak ada jatuh tempo)
function BadgeTempo({ hari }) {
    if (hari === null || hari === undefined) {
        return <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full border bg-slate-50 text-slate-500 border-slate-200">Tanpa jatuh tempo</span>;
    }
    let cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let teks = `${hari} hari lagi`;
    if (hari < 0) { cls = 'bg-rose-50 text-rose-700 border-rose-200'; teks = `Telat ${-hari} hari`; }
    else if (hari === 0) { cls = 'bg-amber-50 text-amber-800 border-amber-300'; teks = 'Jatuh tempo hari ini'; }
    else if (hari <= 3) { cls = 'bg-amber-50 text-amber-800 border-amber-200'; }
    return <span className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded-full border whitespace-nowrap ${cls}`}>{teks}</span>;
}

// Bagi uang ke faktur TERLAMA dulu (urutan dari BE sudah terlama -> terbaru).
function alokasiTerlamaDulu(uang, fakturs) {
    let sisaUang = uang;
    const hasil = {};
    for (const f of fakturs) {
        if (sisaUang <= 0) break;
        const bayar = Math.min(sisaUang, num(f.sisa_hutang));
        if (bayar > 0) hasil[f.id_pembelian] = String(bayar);
        sisaUang -= bayar;
    }
    return hasil;
}

function KartuRingkasan({ label, nilai, sub, tone = 'slate' }) {
    const tones = {
        amber: 'border-amber-200 bg-amber-50 text-amber-900',
        rose: 'border-rose-200 bg-rose-50 text-rose-900',
        slate: 'border-slate-200 bg-white text-slate-900'
    };
    return (
        <div className={`p-4 rounded-2xl border ${tones[tone]}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
            <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight break-words">{nilai}</p>
            {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
        </div>
    );
}


function BadgeMetode({ tipe, metode }) {
    if (tipe === 'RETUR' || metode === 'POTONG_HUTANG') {
        return <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-purple-100 text-purple-700 border border-purple-200 uppercase">Potong Retur</span>;
    }
    if (metode === 'TRANSFER') {
        return <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-blue-100 text-blue-700 border border-blue-200 uppercase">Transfer</span>;
    }
    return <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">Tunai</span>;
}

export default function HutangSupplier() {
    // ---------------- daftar ----------------
    const [q, setQ] = useState('');
    const [qAktif, setQAktif] = useState('');
    const [sort, setSort] = useState('total_desc');
    const [page, setPage] = useState(1);
    const [daftar, setDaftar] = useState(null);
    const [loadingDaftar, setLoadingDaftar] = useState(false);
    const [errDaftar, setErrDaftar] = useState('');
    const reqDaftar = useRef(0);
    const {setLoading} = useContext(Konteks)

    useEffect(() => {
        const t = setTimeout(() => {
            setQAktif(q.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [q]);

    const muatDaftar = useCallback(async () => {
        const id = ++reqDaftar.current;
        setLoadingDaftar(true);
        setErrDaftar('');
        setLoading(prev => ({
            ...prev,
            loadingRequest:true
        }))
        try {
            const ress = await axios.get(`${API}/DAFTAR_HUTANG_SUPPLIER`, {
                params: { q: qAktif, sort, page, limit: LIMIT_DAFTAR, _t: Date.now() },
                headers: NO_CACHE
            });
            if (id !== reqDaftar.current) return; // hasil basi, abaikan
            setDaftar(ress.data.data);
        } catch (err) {
            if (id !== reqDaftar.current) return;
            setErrDaftar(pesanError(err, 'Gagal memuat daftar hutang.'));
        } finally {
            if (id === reqDaftar.current) setLoadingDaftar(false);
            setLoading(prev => ({
            ...prev,
            loadingRequest:false
        }))
        }
    }, [qAktif, sort, page]);

    useEffect(() => { muatDaftar(); }, [muatDaftar]);

    // setelah ada yang lunas, jumlah halaman bisa berkurang -> jangan tersangkut di halaman kosong
    useEffect(() => {
        const tp = daftar?.paging?.total_page;
        if (tp && page > tp) setPage(tp);
    }, [daftar, page]);

    // ---------------- detail / bayar ----------------
    const [terpilih, setTerpilih] = useState(null); // { supplier_id, nama_supplier }
    const [tab, setTab] = useState('faktur');
    const [detail, setDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [errDetail, setErrDetail] = useState('');
    const [bayar, setBayar] = useState({});            // { id_pembelian: "digit string" }
    const [uangDibayar, setUangDibayar] = useState('');
    const [infoBagi, setInfoBagi] = useState('');
    const [metode, setMetode] = useState('TUNAI');
    const [catatan, setCatatan] = useState('');
    const [saving, setSaving] = useState(false);
    const [hasil, setHasil] = useState(null);
    const [errBayar, setErrBayar] = useState('');
    const [riwayat, setRiwayat] = useState(null);      // { items, page, totalPage, loading, error }
    const reqDetail = useRef(0);
    const reqRiwayat = useRef(0);
    const savingRef = useRef(false);
    const requestIdRef = useRef(null);

    // data form berubah -> request_id lama tidak boleh dipakai ulang untuk isi yang berbeda
    useEffect(() => { requestIdRef.current = null; }, [bayar, metode, catatan]);

    const muatDetail = useCallback(async (supplierId) => {
        const id = ++reqDetail.current;
        setLoadingDetail(true);
        setErrDetail('');
        try {
            const ress = await axios.get(`${API}/DETAIL_HUTANG_SUPPLIER`, {
                params: { supplier_id: supplierId, _t: Date.now() },
                headers: NO_CACHE
            });
            if (id !== reqDetail.current) return;
            setDetail(ress.data.data);
        } catch (err) {
            if (id !== reqDetail.current) return;
            setErrDetail(pesanError(err, 'Gagal memuat detail hutang.'));
        } finally {
            if (id === reqDetail.current) setLoadingDetail(false);
        }
    }, []);

    const muatRiwayat = useCallback(async (supplierId, halaman = 1) => {
        const id = ++reqRiwayat.current;
        setRiwayat((prev) => ({
            items: halaman > 1 && prev ? prev.items : [],
            page: halaman,
            totalPage: prev?.totalPage || 1,
            loading: true,
            error: ''
        }));
        try {
            const ress = await axios.get(`${API}/RIWAYAT_PEMBAYARAN_HUTANG`, {
                params: { supplier_id: supplierId, page: halaman, limit: LIMIT_RIWAYAT, _t: Date.now() },
                headers: NO_CACHE
            });
            if (id !== reqRiwayat.current) return;
            const d = ress.data.data;
            setRiwayat((prev) => ({
                items: halaman > 1 && prev ? [...prev.items, ...d.riwayat] : d.riwayat,
                page: d.paging.page,
                totalPage: d.paging.total_page,
                loading: false,
                error: ''
            }));
        } catch (err) {
            if (id !== reqRiwayat.current) return;
            setRiwayat((prev) => ({
                items: prev?.items || [],
                page: halaman,
                totalPage: prev?.totalPage || 1,
                loading: false,
                error: pesanError(err, 'Gagal memuat riwayat pembayaran.')
            }));
        }
    }, []);

    function bukaSupplier(s) {
        reqDetail.current++;
        reqRiwayat.current++;
        setTerpilih({ supplier_id: s.supplier_id, nama_supplier: s.nama_supplier });
        setTab('faktur');
        setDetail(null);
        setRiwayat(null);
        setBayar({});
        setUangDibayar('');
        setInfoBagi('');
        setMetode('TUNAI');
        setCatatan('');
        setHasil(null);
        setErrBayar('');
        setErrDetail('');
        muatDetail(s.supplier_id);
    }

    const tutupPanel = useCallback(() => {
        if (savingRef.current) return;
        reqDetail.current++;
        reqRiwayat.current++;
        setTerpilih(null);
        setDetail(null);
        setRiwayat(null);
    }, []);

    // Esc menutup panel + kunci scroll halaman di belakang panel
    useEffect(() => {
        if (!terpilih) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') tutupPanel(); };
        window.addEventListener('keydown', onKey);
        const overflowLama = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflowLama;
        };
    }, [terpilih, tutupPanel]);

    function pindahTab(t) {
        setTab(t);
        if (t === 'riwayat' && terpilih && !riwayat) muatRiwayat(terpilih.supplier_id, 1);
    }

    const fakturs = detail?.faktur || [];

    const totalBayar = useMemo(
        () => fakturs.reduce((a, f) => a + num(bayar[f.id_pembelian]), 0),
        [fakturs, bayar]
    );
    const jumlahDiisi = useMemo(
        () => fakturs.filter((f) => num(bayar[f.id_pembelian]) > 0).length,
        [fakturs, bayar]
    );

    const salahInput = useMemo(() => {
        for (const f of fakturs) {
            const v = num(bayar[f.id_pembelian]);
            if (v > num(f.sisa_hutang)) return `Bayar faktur ${f.no_faktur} melebihi sisa (Rp ${rp(f.sisa_hutang)}).`;
            if (v > MAX_NOMINAL) return `Jumlah bayar faktur ${f.no_faktur} terlalu besar.`;
        }
        if (jumlahDiisi > MAX_ITEMS_BAYAR) return `Maksimal ${MAX_ITEMS_BAYAR} faktur dalam satu kali pembayaran.`;
        return '';
    }, [fakturs, bayar, jumlahDiisi]);

    const selisihUang = uangDibayar === '' ? null : num(uangDibayar) - totalBayar;

    function ubahBayar(idPembelian, nilai) {
        setBayar((prev) => ({ ...prev, [idPembelian]: digitsOnly(nilai) }));
        setInfoBagi('');
    }

    function lunasi(f) {
        setBayar((prev) => ({ ...prev, [f.id_pembelian]: String(num(f.sisa_hutang)) }));
        setInfoBagi('');
    }

    function bagiOtomatis() {
        const uang = num(uangDibayar);
        if (uang <= 0) return setInfoBagi('Isi dulu jumlah uang yang akan dibayarkan.');
        const alok = alokasiTerlamaDulu(uang, fakturs);
        setBayar(alok);
        const terpakai = Object.values(alok).reduce((a, v) => a + num(v), 0);
        setInfoBagi(
            terpakai < uang
                ? `Uang lebih besar dari total hutang. Hanya Rp ${rp(terpakai)} yang bisa dialokasikan.`
                : `Rp ${rp(terpakai)} dibagi ke faktur terlama lebih dulu.`
        );
    }

    async function simpanBayar() {
        if (savingRef.current) return;
        setErrBayar('');

        const items = fakturs
            .filter((f) => num(bayar[f.id_pembelian]) > 0)
            .map((f) => ({ id_pembelian: f.id_pembelian, jumlah: num(bayar[f.id_pembelian]) }));

        if (items.length === 0) return setErrBayar('Isi jumlah bayar minimal di 1 faktur.');
        if (salahInput) return setErrBayar(salahInput);
        if (!METODE.includes(metode)) return setErrBayar('Metode pembayaran tidak valid.');
        if (catatan.length > 500) return setErrBayar('Catatan maksimal 500 karakter.');

        const ok = window.confirm(
            `Catat pembayaran ${metode} Rp ${rp(totalBayar)} ke ${terpilih.nama_supplier} ` +
            `untuk ${items.length} faktur?\n\nPembayaran tidak bisa diubah setelah disimpan.`
        );
        if (!ok) return;

        savingRef.current = true;
        setSaving(true);
        if (!requestIdRef.current) requestIdRef.current = buatRequestId();
        const requestId = requestIdRef.current;

        try {
            const ress = await axios.post(`${API}/BAYAR_HUTANG`, {
                supplier_id: terpilih.supplier_id,
                metode,
                catatan: catatan.trim(),
                request_id: requestId,
                items
            });
            setHasil({ ...ress.data.data, duplikat: !!ress.data.duplikat });
            setBayar({});
            setUangDibayar('');
            setInfoBagi('');
            setCatatan('');
            setRiwayat(null);
            await Promise.all([muatDetail(terpilih.supplier_id), muatDaftar()]);
        } catch (err) {
            setErrBayar(pesanError(err, 'Gagal menyimpan pembayaran. Cek koneksi lalu coba lagi.'));
            // data bisa sudah berubah -> muat ulang supaya angka akurat
            muatDetail(terpilih.supplier_id);
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    const ringkasan = daftar?.ringkasan;
    const paging = daftar?.paging;
    const listSupplier = daftar?.supplier || [];

    // ======================================================================
    // RENDER
    // ======================================================================
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased pb-20">
            <HeaderHutangSupplier />

            <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">

                {/* Header Section */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                    <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                        Hutang Supplier
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                        Supplier yang masih dihutangi toko. Klik supplier untuk melihat faktur dan mencatat pembayaran.
                    </p>
                </div>

                {/* RINGKASAN CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    <KartuRingkasan tone="amber" label="Total Hutang" nilai={`Rp ${rp(ringkasan?.total_hutang)}`} />
                    <KartuRingkasan label="Supplier Dihutangi" nilai={rp(ringkasan?.jumlah_supplier)} />
                    <KartuRingkasan label="Faktur Belum Lunas" nilai={rp(ringkasan?.jumlah_faktur)} />
                    <KartuRingkasan
                        tone={num(ringkasan?.faktur_lewat_tempo) > 0 ? 'rose' : 'slate'}
                        label="Lewat Jatuh Tempo"
                        nilai={`Rp ${rp(ringkasan?.total_lewat_tempo)}`}
                        sub={`${rp(ringkasan?.faktur_lewat_tempo)} faktur`}
                    />
                </div>

                {/* PENCARIAN & FILTER */}
                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            type="text"
                            maxLength={100}
                            placeholder="Cari nama supplier / no faktur..."
                            className="w-full h-12 px-4 text-base sm:text-sm font-semibold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                        />
                    </div>
                    <select
                        value={sort}
                        onChange={(e) => { setSort(e.target.value); setPage(1); }}
                        className="h-12 px-4 text-base sm:text-sm border border-slate-300 rounded-xl bg-slate-50/80 font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer shrink-0"
                    >
                        <option value="total_desc">Hutang terbesar</option>
                        <option value="total_asc">Hutang terkecil</option>
                        <option value="jatuh_tempo">Jatuh tempo terdekat</option>
                        <option value="terlama">Faktur terlama</option>
                        <option value="nama">Nama A-Z</option>
                    </select>
                </div>

                {errDaftar && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-sm text-rose-700 font-bold shadow-xs">
                        {errDaftar}
                    </div>
                )}

                {/* DAFTAR — MOBILE (NATIVE CARDS) */}
                <div className={`md:hidden space-y-3 ${loadingDaftar ? 'opacity-50 pointer-events-none' : ''}`}>
                    {listSupplier.map((s) => (
                        <button
                            key={s.supplier_id}
                            type="button"
                            onClick={() => bukaSupplier(s)}
                            className="w-full text-left bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs active:scale-[0.98] transition-all space-y-3 cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                    <p className="font-extrabold text-slate-900 text-base leading-snug break-words">
                                        {s.nama_supplier}
                                    </p>
                                    <span className="inline-block px-2 py-0.5 text-[11px] font-mono font-bold text-slate-500 bg-slate-100 rounded border border-slate-200">
                                        ID {s.supplier_id}
                                    </span>
                                </div>
                                <p className="shrink-0 font-black text-amber-700 text-base sm:text-lg">
                                    Rp {rp(s.total_hutang)}
                                </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                                <span>
                                    {s.jumlah_faktur} faktur{s.faktur_tertua ? ` • sejak ${s.faktur_tertua}` : ''}
                                </span>
                                <BadgeTempo hari={s.hari_ke_jatuh_tempo} />
                            </div>
                        </button>
                    ))}
                </div>

                {/* DAFTAR — DESKTOP (TABEL CLEAN) */}
                <div className={`hidden md:block overflow-hidden border border-slate-200/80 rounded-2xl bg-white shadow-xs ${loadingDaftar ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3.5">Supplier</th>
                                    <th className="text-center px-4 py-3.5">Faktur</th>
                                    <th className="text-right px-4 py-3.5">Total Hutang</th>
                                    <th className="text-center px-4 py-3.5">Faktur Tertua</th>
                                    <th className="text-center px-4 py-3.5">Jatuh Tempo</th>
                                    <th className="px-4 py-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                                {listSupplier.map((s) => (
                                    <tr
                                        key={s.supplier_id}
                                        onClick={() => bukaSupplier(s)}
                                        className="hover:bg-emerald-50/60 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-4">
                                            <p className="font-extrabold text-slate-900 text-base leading-snug">{s.nama_supplier}</p>
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">ID {s.supplier_id}</p>
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-700">{s.jumlah_faktur}</td>
                                        <td className="px-4 py-4 text-right font-black text-amber-700 text-base">Rp {rp(s.total_hutang)}</td>
                                        <td className="px-4 py-4 text-center text-xs text-slate-500 font-medium">{s.faktur_tertua || '-'}</td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <BadgeTempo hari={s.hari_ke_jatuh_tempo} />
                                                {s.faktur_lewat_tempo > 0 && (
                                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                        {s.faktur_lewat_tempo} faktur telat
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="inline-flex items-center text-xs sm:text-sm font-extrabold text-emerald-700 hover:text-emerald-800">
                                                Lihat / Bayar →
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* KONDISI KOSONG */}
                {!loadingDaftar && listSupplier.length === 0 && !errDaftar && (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-2">
                        <p className="text-base font-bold text-slate-700">
                            {qAktif ? 'Tidak ada supplier berhutang yang cocok dengan pencarian.' : 'Tidak ada hutang. Semua faktur belanja sudah lunas.'}
                        </p>
                    </div>
                )}

                {/* PAGING RESPONSIF */}
                {paging && paging.total_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm pt-2">
                        <span className="text-slate-500 font-medium text-center sm:text-left">
                            Hal. {paging.page} / {paging.total_page} ({paging.total} supplier)
                        </span>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                disabled={page <= 1 || loadingDaftar}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="flex-1 sm:flex-none h-11 px-4 border border-slate-300 rounded-xl bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Sebelumnya
                            </button>
                            <button
                                disabled={page >= paging.total_page || loadingDaftar}
                                onClick={() => setPage((p) => p + 1)}
                                className="flex-1 sm:flex-none h-11 px-4 border border-slate-300 rounded-xl bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                )}

                {/* PANEL DETAIL (SLIDE-OVER / BOTTOM SHEET MOBILE) */}
                {terpilih && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={tutupPanel}>
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-label={`Hutang ${terpilih.nama_supplier}`}
                            className="w-full max-w-2xl h-full bg-slate-50 shadow-2xl flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header Panel */}
                            <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-start justify-between gap-3 shrink-0">
                                <div className="min-w-0 space-y-0.5">
                                    <h2 className="text-base sm:text-xl font-black text-slate-900 leading-snug break-words">
                                        {terpilih.nama_supplier}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-mono">ID {terpilih.supplier_id}</p>
                                    {detail && (
                                        <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
                                            Total hutang: <strong className="text-amber-700 font-black">Rp {rp(detail.ringkasan.total_hutang)}</strong>
                                            {' '}({detail.ringkasan.jumlah_faktur} faktur)
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={tutupPanel}
                                    disabled={saving}
                                    aria-label="Tutup"
                                    className="shrink-0 w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xl font-bold transition-all disabled:opacity-40 cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="bg-white px-4 sm:px-6 flex gap-2 border-b border-slate-200 shrink-0">
                                {[['faktur', 'Faktur Belum Lunas'], ['riwayat', 'Riwayat Pembayaran']].map(([k, label]) => (
                                    <button
                                        key={k}
                                        onClick={() => pindahTab(k)}
                                        className={`py-3 text-xs sm:text-sm font-extrabold border-b-2 -mb-px transition-colors cursor-pointer ${tab === k ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Isi Panel (Scrollable Body) */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                                {errDetail && (
                                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs sm:text-sm text-rose-700 font-bold">
                                        {errDetail}
                                    </div>
                                )}

                                {hasil && tab === 'faktur' && (
                                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs sm:text-sm space-y-2">
                                        <p className="font-extrabold text-emerald-900">
                                            {hasil.duplikat ? 'Pembayaran ini sudah tercatat sebelumnya: ' : 'Pembayaran berhasil dicatat: '}
                                            {hasil.no_bayar} Rp {rp(hasil.total_bayar)} ({hasil.metode})
                                        </p>
                                        <ul className="text-emerald-900 text-xs space-y-1 border-t border-emerald-200/60 pt-2">
                                            {hasil.rincian.map((r) => (
                                                <li key={r.id_pembelian} className="flex justify-between gap-2 font-medium">
                                                    <span className="font-mono break-all">{r.no_faktur}</span>
                                                    <span className="shrink-0">
                                                        Rp {rp(r.jumlah)} → {r.lunas ? <strong className="font-black text-emerald-800">LUNAS</strong> : <>sisa Rp {rp(r.sisa_sesudah)}</>}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {tab === 'faktur' && (
                                    <>
                                        {loadingDetail && !detail && <p className="text-sm font-semibold text-slate-500 py-6 text-center">Memuat...</p>}

                                        {detail && fakturs.length === 0 && (
                                            <p className="py-12 text-center text-sm font-semibold text-slate-500">Semua faktur supplier ini sudah lunas.</p>
                                        )}

                                        {detail?.terpotong && (
                                            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800 font-bold">
                                                Hanya faktur tertua yang ditampilkan. Lunasi dulu, lalu faktur berikutnya akan muncul.
                                            </div>
                                        )}

                                        {fakturs.length > 0 && (
                                            <>
                                                {/* Pembagian Otomatis */}
                                                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                                                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">
                                                        Uang yang dibayarkan (opsional)
                                                    </label>
                                                    <div className="flex flex-col sm:flex-row gap-2.5">
                                                        <div className="flex-1 flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-slate-50/80">
                                                            <span className="bg-slate-100 px-3.5 py-3 text-xs font-bold text-slate-600 border-r border-slate-300">Rp</span>
                                                            <input
                                                                inputMode="numeric"
                                                                value={uangDibayar === '' ? '' : rp(uangDibayar)}
                                                                onChange={(e) => { setUangDibayar(digitsOnly(e.target.value)); setInfoBagi(''); }}
                                                                placeholder="Contoh: 50.000"
                                                                className="w-full h-12 px-3 text-base sm:text-sm font-extrabold text-slate-900 outline-none bg-transparent"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={bagiOtomatis}
                                                            className="h-12 px-5 text-xs sm:text-sm font-extrabold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer shrink-0"
                                                        >
                                                            Bagi ke faktur terlama
                                                        </button>
                                                    </div>
                                                    {infoBagi && <p className="text-xs font-bold text-slate-600">{infoBagi}</p>}
                                                </div>

                                                {/* Daftar Faktur */}
                                                <div className="space-y-3.5">
                                                    {fakturs.map((f) => {
                                                        const nilai = bayar[f.id_pembelian] ?? '';
                                                        const lebih = num(nilai) > num(f.sisa_hutang);
                                                        return (
                                                            <div key={f.id_pembelian} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3.5">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <p className="font-mono font-extrabold text-slate-900 text-sm break-all">{f.no_faktur}</p>
                                                                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                                                                            Belanja {f.tanggal_belanja || '-'}
                                                                            {f.jatuh_tempo ? ` • Tempo ${f.jatuh_tempo}` : ''}
                                                                        </p>
                                                                    </div>
                                                                    <BadgeTempo hari={f.hari_ke_jatuh_tempo} />
                                                                </div>

                                                                {/* Grid Detail Harga */}
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                                                    <div className="p-2.5 rounded-xl bg-slate-50">
                                                                        <p className="text-slate-500 font-medium">Subtotal</p>
                                                                        <p className="font-bold text-slate-900 mt-0.5">Rp {rp(f.subtotal)}</p>
                                                                    </div>
                                                                    <div className="p-2.5 rounded-xl bg-slate-50">
                                                                        <p className="text-slate-500 font-medium">Diskon Faktur</p>
                                                                        <p className="font-bold text-slate-900 mt-0.5">Rp {rp(f.diskon)}</p>
                                                                    </div>

                                                                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                                                                        <p className="text-blue-600 font-extrabold uppercase text-[10px]">PPN ({f.ppn_persen || 0}%)</p>
                                                                        <p className="font-extrabold text-blue-900 mt-0.5">Rp {rp(f.ppn_nominal || 0)}</p>
                                                                    </div>

                                                                    <div className="p-2.5 rounded-xl bg-slate-50">
                                                                        <p className="text-slate-500 font-medium">Total belanja</p>
                                                                        <p className="font-bold text-slate-900 mt-0.5">Rp {rp(f.grand_total || f.total_harga)}</p>
                                                                    </div>
                                                                    <div className="p-2.5 rounded-xl bg-slate-50">
                                                                        <p className="text-slate-500 font-medium">Dibayar awal</p>
                                                                        <p className="font-bold text-slate-900 mt-0.5">Rp {rp(f.dibayar_di_awal)}</p>
                                                                    </div>
                                                                    <div className="p-2.5 rounded-xl bg-slate-50">
                                                                        <p className="text-slate-500 font-medium">Sudah dicicil</p>
                                                                        <p className="font-bold text-slate-900 mt-0.5">Rp {rp(f.cicilan)}</p>
                                                                    </div>
                                                                    <div className="p-2.5 rounded-xl bg-slate-50">
                                                                        <p className="text-[10px] text-slate-900 font-extrabold uppercase">Dipotong Retur</p>
                                                                        <p className="font-extrabold text-slate-900 mt-0.5">Rp {rp(f.dipotong_retur || 0)}</p>
                                                                    </div>
                                                                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                                                                        <p className="text-amber-800 font-bold uppercase text-[10px]">SISA HUTANG</p>
                                                                        <p className="font-black text-amber-900 mt-0.5">Rp {rp(f.sisa_hutang)}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Form Input Pembayaran Per Faktur */}
                                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-1">
                                                                    <div className="flex-1 min-w-0">
                                                                        <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                                                                            Bayar faktur ini
                                                                        </label>
                                                                        <div className={`flex items-center border rounded-xl overflow-hidden ${lebih ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-slate-50/80'}`}>
                                                                            <span className="bg-slate-100 px-3.5 py-3 text-xs font-bold text-slate-600 border-r border-slate-300">Rp</span>
                                                                            <input
                                                                                inputMode="numeric"
                                                                                value={nilai === '' ? '' : rp(nilai)}
                                                                                onChange={(e) => ubahBayar(f.id_pembelian, e.target.value)}
                                                                                placeholder="0"
                                                                                className="w-full min-w-0 h-12 px-3 text-base sm:text-sm font-extrabold text-slate-900 outline-none bg-transparent"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2 shrink-0">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => lunasi(f)}
                                                                            className="h-12 px-4 text-xs font-extrabold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
                                                                        >
                                                                            Lunasi
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => ubahBayar(f.id_pembelian, '')}
                                                                            className="h-12 px-3.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                                                                        >
                                                                            Kosongkan
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {lebih && <p className="text-xs font-bold text-rose-600">Melebihi sisa hutang faktur ini.</p>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Form Metode & Catatan */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                                    <div>
                                                        <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Metode</label>
                                                        <select
                                                            value={metode}
                                                            onChange={(e) => setMetode(e.target.value)}
                                                            className="w-full h-12 px-3.5 border border-slate-300 rounded-xl text-base sm:text-sm font-bold bg-slate-50/80 text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                                                        >
                                                            <option value="TUNAI">Tunai</option>
                                                            <option value="TRANSFER">Transfer</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1">Catatan (opsional)</label>
                                                        <input
                                                            value={catatan}
                                                            maxLength={500}
                                                            onChange={(e) => setCatatan(e.target.value)}
                                                            placeholder="Contoh: transfer BCA a.n. owner"
                                                            className="w-full h-12 px-3.5 border border-slate-300 rounded-xl text-base sm:text-sm font-semibold bg-slate-50/80 text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {tab === 'riwayat' && (
                                    <div className="space-y-3">
                                        {riwayat?.error && (
                                            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs sm:text-sm text-rose-700 font-bold">
                                                {riwayat.error}
                                            </div>
                                        )}
                                        {(!riwayat || (riwayat.loading && riwayat.items.length === 0)) && (
                                            <p className="text-sm font-semibold text-slate-500 py-6 text-center">Memuat...</p>
                                        )}
                                        {riwayat && !riwayat.loading && !riwayat.error && riwayat.items.length === 0 && (
                                            <p className="py-12 text-center text-sm font-semibold text-slate-500">Belum ada riwayat pembayaran.</p>
                                        )}
                                        {(riwayat?.items || []).map((r) => (
                                            <div key={r.no_bayar} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2.5">
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-mono font-extrabold text-sm text-slate-900">{r.no_bayar}</p>
                                                            <BadgeMetode tipe={r.tipe_transaksi} metode={r.metode} />
                                                        </div>
                                                        <p className="text-xs font-medium text-slate-500">
                                                            {r.tanggal_bayar} oleh <span className="font-bold text-slate-800">{r.dibuat_oleh}</span>
                                                        </p>
                                                    </div>
                                                    <p className="shrink-0 font-black text-emerald-700 text-base">Rp {rp(r.total_bayar)}</p>
                                                </div>

                                                {r.catatan && <p className="text-xs text-slate-600 italic font-medium break-words">"{r.catatan}"</p>}

                                                <ul className="text-xs text-slate-700 space-y-1 pt-2 border-t border-slate-100 font-medium">
                                                    {r.rincian.map((d) => (
                                                        <li key={`${r.no_bayar}-${d.id_pembelian}`} className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                                                            <span className="font-mono text-slate-900 font-bold break-all">{d.no_faktur}</span>
                                                            <span>Rp {rp(d.jumlah)} <span className="text-slate-400">(sisa {rp(d.sisa_sebelum)} → {rp(d.sisa_sesudah)})</span></span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                        {riwayat && riwayat.page < riwayat.totalPage && (
                                            <button
                                                type="button"
                                                disabled={riwayat.loading}
                                                onClick={() => muatRiwayat(terpilih.supplier_id, riwayat.page + 1)}
                                                className="w-full h-12 text-xs sm:text-sm font-extrabold rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                                            >
                                                {riwayat.loading ? 'Memuat...' : 'Muat lebih banyak'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer Panel (Action Simpan) */}
                            {tab === 'faktur' && fakturs.length > 0 && (
                                <div className="bg-white border-t border-slate-200 p-4 sm:p-5 space-y-3 shrink-0">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span className="text-xs sm:text-sm font-bold text-slate-600">Total dibayar sekarang</span>
                                        <span className="text-lg sm:text-xl font-black text-emerald-700">Rp {rp(totalBayar)}</span>
                                    </div>
                                    {selisihUang !== null && selisihUang !== 0 && (
                                        <p className={`text-xs font-bold ${selisihUang > 0 ? 'text-amber-700' : 'text-rose-600'}`}>
                                            {selisihUang > 0
                                                ? `Uang yang dibayarkan lebih Rp ${rp(selisihUang)} dari yang dialokasikan ke faktur.`
                                                : `Uang yang dibayarkan kurang Rp ${rp(-selisihUang)} dari total yang diisi.`}
                                        </p>
                                    )}
                                    {(errBayar || salahInput) && (
                                        <p className="text-xs sm:text-sm font-bold text-rose-600">{errBayar || salahInput}</p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={simpanBayar}
                                        disabled={saving || totalBayar <= 0 || !!salahInput}
                                        className="w-full h-12 rounded-xl font-extrabold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                                    >
                                        {saving ? 'Menyimpan...' : 'Simpan Pembayaran'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
