'use client';

import { CEK_HAK_AKSES } from '@/app/Hooks/Hooks';
import axios from 'axios';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// HALAMAN RIWAYAT BARANG RUSAK
//   - Ringkasan: total kerugian, jumlah barang rusak, status klaim, barang terbanyak
//   - Daftar kartu dikelompokkan per hari, infinite scroll (cursor dari BE)
//   - Cari (kode/nama barang, no retur, no faktur), pilihan cepat periode, filter lanjutan
// Mobile-first (rasa aplikasi), tetap rapi di tablet & desktop.
// Endpoint: /api-be/SERVER_RUSAK/{RIWAYAT_BARANG_RUSAK, RINGKASAN_BARANG_RUSAK, OPSI_FILTER_BARANG_RUSAK}
// FE hanya menampilkan; semua angka dihitung & divalidasi di backend.
// ============================================================================
const API = '/api-be/SERVER_RUSAK';
const LIMIT = 20;
const MAX_ITEM_DI_MEMORI = 1000;           // pengaman: lebih dari ini minta admin mempersempit filter
const NO_CACHE = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Bahasa sehari-hari untuk nilai dari database. Nilai yang belum terdaftar tetap tampil rapi.
const LABEL_SUMBER = {
    RETUR_PENJUALAN: 'Dikembalikan pelanggan',
    STOK_OPNAME: 'Ketahuan saat hitung stok',
    BARANG_RUSAK: 'Rusak di toko / gudang',
    KADALUARSA: 'Kedaluwarsa'
};
const LABEL_STATUS = {
    TIDAK_BISA_DIKLAIM: 'Tidak bisa diklaim',
    BELUM_DIKLAIM: 'Belum diklaim',
    SUDAH_DIKLAIM: 'Sudah diklaim',
    DIKLAIM: 'Sudah diklaim',
    DIPROSES: 'Klaim diproses',
    PROSES: 'Klaim diproses',
    DIGANTI: 'Sudah diganti supplier',
    DITERIMA: 'Sudah diganti supplier',
    DITOLAK: 'Klaim ditolak'
};

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------
const num = (v) => Number(v) || 0;
const rp = (v) => `Rp ${num(v).toLocaleString('id-ID')}`;
const pesanError = (err, fallback) => err?.response?.data?.message || fallback;
const p2 = (n) => String(n).padStart(2, '0');
const ymdLokal = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

function rapikan(v) {
    const s = String(v ?? '').replace(/_/g, ' ').trim().toLowerCase();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
const labelSumber = (v) => (v ? LABEL_SUMBER[v] || rapikan(v) : 'Penyebab belum dicatat');
const labelStatus = (v) => (v ? LABEL_STATUS[v] || rapikan(v) : 'Belum ditentukan');

function nadaStatus(v) {
    const s = String(v || '').toUpperCase();
    if (!s) return 'slate';
    if (s.includes('TIDAK') || s.includes('TOLAK')) return 'rose';
    if (s.includes('BELUM')) return 'amber';
    if (s.includes('PROSES')) return 'sky';
    if (s.includes('SUDAH') || s.includes('DIGANTI') || s.includes('TERIMA') || s === 'DIKLAIM') return 'emerald';
    return 'slate';
}
const NADA = {
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200'
};

// "2026-10-18 19:00:32" -> tanggal & jam tanpa lewat Date (bebas masalah zona waktu)
const pisahWaktu = (s) => ({ tgl: String(s || '').slice(0, 10), jam: String(s || '').slice(11, 16) });
function tglPendek(tgl) {
    const [y, m, d] = String(tgl || '').split('-').map(Number);
    if (!y || !m || !d) return '-';
    return `${d} ${BULAN[m - 1]} ${y}`;
}
function labelHari(tgl, hariIni, kemarin) {
    if (tgl === hariIni) return 'Hari ini';
    if (tgl === kemarin) return 'Kemarin';
    const [y, m, d] = String(tgl).split('-').map(Number);
    if (!y || !m || !d) return '-';
    return `${HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${tglPendek(tgl)}`;
}
function namaPencatat(v) {
    if (!v) return '-';
    return /^\d+$/.test(v) ? `Admin #${v}` : v;
}

// Rentang tanggal dari pilihan cepat
function hitungRentang(periode, tglMulai, tglSelesai) {
    const now = new Date();
    if (periode === 'HARI_INI') return { mulai: ymdLokal(now), selesai: ymdLokal(now) };
    if (periode === '7_HARI') {
        const a = new Date(now);
        a.setDate(a.getDate() - 6);
        return { mulai: ymdLokal(a), selesai: ymdLokal(now) };
    }
    if (periode === 'BULAN_INI') {
        return { mulai: `${now.getFullYear()}-${p2(now.getMonth() + 1)}-01`, selesai: ymdLokal(now) };
    }
    if (periode === 'KUSTOM') return { mulai: tglMulai || '', selesai: tglSelesai || '' };
    return { mulai: '', selesai: '' };
}

// ---------------------------------------------------------------------------
// IKON (inline, tanpa library)
// ---------------------------------------------------------------------------
function Ikon({ d, className = 'w-5 h-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <path d={d} />
        </svg>
    );
}
const IKON = {
    cari: 'M21 21l-4.3-4.3M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z',
    saring: 'M3 5h18M6 12h12M10 19h4',
    segar: 'M21 12a9 9 0 11-3-6.7M21 4v5h-5',
    tutup: 'M6 6l12 12M18 6L6 18',
    panah: 'M6 9l6 6 6-6',
    atas: 'M12 19V5M5 12l7-7 7 7',
    kotak: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8'
};

// ---------------------------------------------------------------------------
// KOMPONEN KECIL
// ---------------------------------------------------------------------------
function Lencana({ nada, children }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full border whitespace-nowrap ${NADA[nada] || NADA.slate}`}>
            {children}
        </span>
    );
}

function KartuRingkasan({ label, nilai, sub, tone = 'slate' }) {
    const tones = {
        rose: 'border-rose-200 bg-rose-50 text-rose-900',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        slate: 'border-slate-200 bg-white text-slate-900'
    };
    return (
        <div className={`snap-start shrink-0 w-[70%] sm:w-auto sm:shrink p-4 rounded-2xl border ${tones[tone]}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
            <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight break-words">{nilai}</p>
            {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
        </div>
    );
}

function KerangkaKartu() {
    return (
        <div className="p-4 rounded-2xl border border-slate-200 bg-white animate-pulse space-y-3">
            <div className="flex justify-between gap-3">
                <div className="space-y-2 flex-1">
                    <div className="h-4 w-2/3 rounded bg-slate-200" />
                    <div className="h-3 w-1/3 rounded bg-slate-100" />
                </div>
                <div className="h-5 w-20 rounded bg-slate-200" />
            </div>
            <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-100" />
                <div className="h-5 w-28 rounded-full bg-slate-100" />
            </div>
        </div>
    );
}

function Baris({ label, children, penuh = false }) {
    if (children === null || children === undefined || children === '') return null;
    return (
        <div className={penuh ? 'col-span-2' : ''}>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-800 break-words">{children}</dd>
        </div>
    );
}

// Satu kartu barang rusak. memo + content-visibility: ratusan kartu tetap ringan di browser.
const KartuRusak = memo(function KartuRusak({ item }) {
    const [buka, setBuka] = useState(false);
    const { jam } = pisahWaktu(item.tanggal);
    const nada = nadaStatus(item.status_klaim);
    const nama = item.nama_barang || item.kode_barang;

    return (
        <li className="[content-visibility:auto] [contain-intrinsic-size:auto_132px]">
            <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <Ikon d={IKON.kotak} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 leading-snug break-words">{nama}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                <span className="font-mono">{item.kode_barang}</span> · pukul {jam || '-'}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="font-black text-rose-600 leading-tight">{rp(item.subtotal_hpp)}</p>
                            <p className="text-[11px] text-slate-400">perkiraan rugi</p>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <Lencana nada="rose">Total pcs rusak: {item.qty_pcs.toLocaleString('id-ID')}</Lencana>
                        <Lencana nada="green">Sisa jumlah pcs: {item?.qty_sisa.toLocaleString('id-ID')}</Lencana>
                        <Lencana nada="green">Sudah keluar: {Math.max(item.qty_pcs - item.qty_sisa, 0)}</Lencana>
                        <Lencana className="text-orange-300">{labelSumber(item.sumber_kerusakan)}</Lencana>
                        {/* <Lencana nada={nada}>{labelStatus(item.status_klaim)}</Lencana> */}
                    </div>

                    <button
                        type="button"
                        onClick={() => setBuka((v) => !v)}
                        aria-expanded={buka}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 active:text-emerald-900"
                    >
                        {buka ? 'Sembunyikan detail' : 'Lihat detail'}
                        <Ikon d={IKON.panah} className={`w-4 h-4 transition-transform ${buka ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {buka && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pb-4 pt-3 border-t border-slate-100 bg-slate-50/60">
                        <Baris label="Pelanggan">{item.nama_pelanggan}</Baris>
                        <Baris label="Faktur penjualan">{item.no_faktur_asal}</Baris>
                        <Baris label="No. retur">{item.no_ref_retur}</Baris>
                        <Baris label="Modal per pcs">{rp(item.hpp_per_pcs)}</Baris>
                        <Baris label="Supplier">{item.nama_supplier || (item.id_supplier ? `Supplier #${item.id_supplier}` : null)}</Baris>
                        <Baris label="Dicatat oleh">{namaPencatat(item.dibuat_oleh)}</Baris>
                        <Baris label="Catatan" penuh>{item.keterangan}</Baris>
                    </dl>
                )}
            </article>
        </li>
    );
});

// Lembar filter: dari bawah di HP (seperti aplikasi), jadi kotak di tengah di layar lebar
function LembarFilter({ buka, onTutup, awal, opsi, onTerapkan }) {
    const [sumber, setSumber] = useState('');
    const [status, setStatus] = useState('');
    const [mulai, setMulai] = useState('');
    const [selesai, setSelesai] = useState('');
    const [galat, setGalat] = useState('');
    const tombolTutup = useRef(null);

    useEffect(() => {
        if (!buka) return;
        setSumber(awal.sumber);
        setStatus(awal.status);
        setMulai(awal.periode === 'KUSTOM' ? awal.tglMulai : '');
        setSelesai(awal.periode === 'KUSTOM' ? awal.tglSelesai : '');
        setGalat('');
        tombolTutup.current?.focus();
    }, [buka, awal]);

    useEffect(() => {
        if (!buka) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => { if (e.key === 'Escape') onTutup(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [buka, onTutup]);

    if (!buka) return null;

    const terapkan = () => {
        if (mulai && selesai && mulai > selesai) {
            setGalat('Tanggal "dari" tidak boleh lebih besar dari tanggal "sampai".');
            return;
        }
        onTerapkan({ sumber, status, mulai, selesai });
    };

    const pilihan = (nilai, setNilai, daftar, labelFn) => (
        <div className="flex flex-wrap gap-2">
            {[{ v: '', l: 'Semua' }, ...daftar.map((v) => ({ v, l: labelFn(v) }))].map((o) => (
                <button
                    key={o.v || 'semua'}
                    type="button"
                    onClick={() => setNilai(o.v)}
                    aria-pressed={nilai === o.v}
                    className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition active:scale-95 ${nilai === o.v
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                        }`}
                >
                    {o.l}
                </button>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" role="dialog" aria-modal="true" aria-label="Filter riwayat barang rusak">
            <button type="button" aria-label="Tutup" className="absolute inset-0 bg-slate-900/50" onClick={onTutup} tabIndex={-1} />
            <div className="relative w-full md:max-w-lg max-h-[88dvh] flex flex-col bg-white rounded-t-3xl md:rounded-3xl shadow-2xl">
                <div className="md:hidden pt-2.5 flex justify-center"><span className="w-10 h-1.5 rounded-full bg-slate-300" /></div>
                <div className="flex items-center justify-between px-5 pt-3 pb-2">
                    <h2 className="text-lg font-black text-slate-900">Saring daftar</h2>
                    <button ref={tombolTutup} type="button" onClick={onTutup} aria-label="Tutup" className="p-2 -mr-2 rounded-full text-slate-500 hover:bg-slate-100">
                        <Ikon d={IKON.tutup} />
                    </button>
                </div>

                <div className="px-5 pb-4 overflow-y-auto space-y-6">
                    <section>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Tanggal sendiri</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs font-semibold text-slate-500">
                                Dari
                                <input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)}
                                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </label>
                            <label className="block text-xs font-semibold text-slate-500">
                                Sampai
                                <input type="date" value={selesai} onChange={(e) => setSelesai(e.target.value)}
                                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                            </label>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">Kosongkan jika ingin memakai pilihan cepat di halaman utama.</p>
                    </section>

                    <section>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Kenapa barang ini rusak?</h3>
                        {pilihan(sumber, setSumber, opsi.sumber, labelSumber)}
                    </section>

                    <section>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Status klaim ke supplier</h3>
                        {pilihan(status, setStatus, opsi.status, labelStatus)}
                    </section>

                    {galat && <p role="alert" className="text-sm font-semibold text-rose-600">{galat}</p>}
                </div>

                <div className="flex gap-3 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100">
                    <button type="button" onClick={() => { setSumber(''); setStatus(''); setMulai(''); setSelesai(''); setGalat(''); }}
                        className="px-5 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 active:scale-95 transition">
                        Hapus pilihan
                    </button>
                    <button type="button" onClick={terapkan}
                        className="flex-1 px-5 py-3 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition">
                        Tampilkan
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// HALAMAN UTAMA
// ---------------------------------------------------------------------------
const PERIODE_CEPAT = [
    { k: 'SEMUA', l: 'Semua' },
    { k: 'HARI_INI', l: 'Hari ini' },
    { k: '7_HARI', l: '7 hari terakhir' },
    { k: 'BULAN_INI', l: 'Bulan ini' }
];
const FILTER_AWAL = { periode: 'SEMUA', tglMulai: '', tglSelesai: '', sumber: '', status: '' };

function RiwayatBarangRusakContent() {
    // ---------------- filter ----------------
    const [q, setQ] = useState('');
    const [qAktif, setQAktif] = useState('');
    const [filter, setFilter] = useState(FILTER_AWAL);
    const [lembar, setLembar] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setQAktif(q.trim()), 400);
        return () => clearTimeout(t);
    }, [q]);

    // Parameter query untuk BE. Hanya berubah kalau isi filter benar-benar berubah.
    const paramsKey = useMemo(() => {
        const r = hitungRentang(filter.periode, filter.tglMulai, filter.tglSelesai);
        const p = {};
        if (qAktif) p.q = qAktif;
        if (filter.sumber) p.sumber = filter.sumber;
        if (filter.status) p.status = filter.status;
        if (r.mulai) p.tgl_mulai = r.mulai;
        if (r.selesai) p.tgl_selesai = r.selesai;
        return JSON.stringify(p);
    }, [qAktif, filter]);
    const paramsFilter = useMemo(() => JSON.parse(paramsKey), [paramsKey]);

    // ---------------- opsi filter (sekali saja) ----------------
    const [opsi, setOpsi] = useState({ sumber: [], status: [] });
    useEffect(() => {
        const ctrl = new AbortController();
        axios.get(`${API}/OPSI_FILTER_BARANG_RUSAK`, { headers: NO_CACHE, signal: ctrl.signal })
            .then((r) => {
                const d = r.data?.data;
                if (d) setOpsi({ sumber: d.sumber || [], status: d.status || [] });
            })
            .catch(() => { /* pilihan filter bukan hal kritis */ });
        return () => ctrl.abort();
    }, []);

    // ---------------- ringkasan ----------------
    const [ringkasan, setRingkasan] = useState(null);
    const [loadingRingkasan, setLoadingRingkasan] = useState(true);
    const [errRingkasan, setErrRingkasan] = useState('');
    const [rincianBuka, setRincianBuka] = useState(false);
    const reqRingkasan = useRef(0);
    const ctrlRingkasan = useRef(null);

    const muatRingkasan = useCallback(async () => {
        ctrlRingkasan.current?.abort();
        const ctrl = new AbortController();
        ctrlRingkasan.current = ctrl;
        const id = ++reqRingkasan.current;
        setLoadingRingkasan(true);
        setErrRingkasan('');
        try {
            const res = await axios.get(`${API}/RINGKASAN_BARANG_RUSAK`, { params: paramsFilter, headers: NO_CACHE, signal: ctrl.signal });
            if (id !== reqRingkasan.current) return;
            setRingkasan(res.data?.data || null);
        } catch (err) {
            if (axios.isCancel(err) || id !== reqRingkasan.current) return;
            setErrRingkasan(pesanError(err, 'Ringkasan gagal dimuat.'));
        } finally {
            if (id === reqRingkasan.current) setLoadingRingkasan(false);
        }
    }, [paramsFilter]);

    // ---------------- daftar (infinite scroll) ----------------
    const [items, setItems] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingAwal, setLoadingAwal] = useState(true);
    const [loadingLagi, setLoadingLagi] = useState(false);
    const [err, setErr] = useState('');
    const cursorRef = useRef(null);
    const sedangMuat = useRef(false);
    const reqList = useRef(0);
    const ctrlList = useRef(null);
    const sentinel = useRef(null);

    const muatHalaman = useCallback(async (ulang) => {
        if (ulang) ctrlList.current?.abort();
        else if (sedangMuat.current || !cursorRef.current) return;

        const ctrl = new AbortController();
        ctrlList.current = ctrl;
        const id = ++reqList.current;
        sedangMuat.current = true;
        if (ulang) {
            cursorRef.current = null;
            setItems([]);
            setHasMore(false);
            setLoadingAwal(true);
        } else {
            setLoadingLagi(true);
        }
        setErr('');

        try {
            const params = { ...paramsFilter, limit: LIMIT };
            if (!ulang) params.cursor = cursorRef.current;
            const res = await axios.get(`${API}/RIWAYAT_BARANG_RUSAK`, { params, headers: NO_CACHE, signal: ctrl.signal });
            if (id !== reqList.current) return;
            const d = res.data?.data || {};
            const baru = Array.isArray(d.items) ? d.items : [];
            setItems((prev) => {
                const dasar = ulang ? [] : prev;
                const ada = new Set(dasar.map((x) => x.id_afkir));
                return [...dasar, ...baru.filter((x) => !ada.has(x.id_afkir))];
            });
            cursorRef.current = d.has_more && d.next_cursor ? d.next_cursor : null;
            setHasMore(Boolean(cursorRef.current));
        } catch (e) {
            if (axios.isCancel(e) || id !== reqList.current) return;
            setErr(pesanError(e, 'Daftar gagal dimuat. Periksa koneksi lalu coba lagi.'));
        } finally {
            if (id === reqList.current) {
                sedangMuat.current = false;
                setLoadingAwal(false);
                setLoadingLagi(false);
            }
        }
    }, [paramsFilter]);

    // filter berubah -> mulai dari awal. Permintaan lama dibatalkan agar tidak menimpa hasil baru.
    useEffect(() => {
        muatHalaman(true);
        muatRingkasan();
        return () => {
            ctrlList.current?.abort();
            ctrlRingkasan.current?.abort();
        };
    }, [muatHalaman, muatRingkasan]);

    const batasTercapai = items.length >= MAX_ITEM_DI_MEMORI;

    // muat otomatis saat penanda di dasar daftar mendekati layar
    useEffect(() => {
        const el = sentinel.current;
        if (!el || !hasMore || err || batasTercapai) return undefined;
        const io = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) muatHalaman(false); },
            { rootMargin: '600px 0px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [hasMore, err, batasTercapai, items.length, muatHalaman]);

    // tombol "ke atas"
    const [tampilAtas, setTampilAtas] = useState(false);
    useEffect(() => {
        let tunggu = false;
        const onScroll = () => {
            if (tunggu) return;
            tunggu = true;
            requestAnimationFrame(() => {
                setTampilAtas(window.scrollY > 900);
                tunggu = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // ---------------- turunan tampilan ----------------
    const { hariIni, kemarin } = useMemo(() => {
        const n = new Date();
        const k = new Date(n);
        k.setDate(k.getDate() - 1);
        return { hariIni: ymdLokal(n), kemarin: ymdLokal(k) };
    }, []);

    const kelompok = useMemo(() => {
        const out = [];
        let cur = null;
        for (const it of items) {
            const tgl = String(it.tanggal).slice(0, 10);
            if (!cur || cur.tgl !== tgl) {
                cur = { tgl, items: [] };
                out.push(cur);
            }
            cur.items.push(it);
        }
        return out;
    }, [items]);

    const adaFilter = Boolean(qAktif || filter.periode !== 'SEMUA' || filter.sumber || filter.status);
    const jumlahFilterLanjut = (filter.sumber ? 1 : 0) + (filter.status ? 1 : 0) + (filter.periode === 'KUSTOM' ? 1 : 0);

    const resetSemua = () => { setQ(''); setQAktif(''); setFilter(FILTER_AWAL); };
    const muatUlangSemua = () => { muatHalaman(true); muatRingkasan(); };

    const terapkanLembar = useCallback(({ sumber, status, mulai, selesai }) => {
        setFilter((f) => ({
            ...f,
            sumber,
            status,
            ...(mulai || selesai
                ? { periode: 'KUSTOM', tglMulai: mulai, tglSelesai: selesai }
                : f.periode === 'KUSTOM'
                    ? { periode: 'SEMUA', tglMulai: '', tglSelesai: '' }
                    : {})
        }));
        setLembar(false);
    }, []);
    const tutupLembar = useCallback(() => setLembar(false), []);

    const statusRincian = ringkasan?.per_status || [];
    const topBarang = ringkasan?.top_barang || [];

    return (
     
            <div className="min-h-screen bg-slate-50 text-slate-900">
                {/* ---------- bilah atas (menempel) ---------- */}
                <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200 pt-[env(safe-area-inset-top)]">
                    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">

                        {/* Baris Atas: Tombol Back (<), Judul & Tombol Muat Ulang */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">

                                {/* Tombol Back (<) Mobile-First Touch Friendly */}
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    aria-label="Kembali"
                                    className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-800 border border-slate-200/60 transition-all hover:bg-slate-200/80 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:h-12 sm:w-auto sm:gap-2 sm:rounded-2xl sm:pl-3.5 sm:pr-4 cursor-pointer"
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

                                {/* Judul & Subtitle */}
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 leading-snug truncate">
                                        Barang Rusak
                                    </h1>
                                    <p className="text-xs sm:text-sm font-medium text-slate-500 truncate mt-0.5">
                                        Barang yang sudah tidak bisa dijual lagi
                                    </p>
                                </div>
                            </div>

                            {/* Tombol Muat Ulang */}
                            <button
                                type="button"
                                onClick={muatUlangSemua}
                                aria-label="Muat ulang"
                                className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/60 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                            >
                                <Ikon d={IKON.segar} className={`w-5 h-5 sm:w-6 sm:h-6 ${loadingAwal ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Baris Tengah: Input Pencarian & Tombol Saring */}
                        <div className="flex items-center gap-2.5">
                            <label className="relative flex-1 min-w-0">
                                <span className="sr-only">Cari barang rusak</span>
                                <Ikon d={IKON.cari} className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="search"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value.slice(0, 100))}
                                    placeholder="Cari nama barang, no. retur, no. faktur"
                                    autoComplete="off"
                                    enterKeyHint="search"
                                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-50/80 border border-slate-300 text-base sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 placeholder:font-normal"
                                />
                            </label>

                            <button
                                type="button"
                                onClick={() => setLembar(true)}
                                className="relative shrink-0 h-12 px-4 rounded-xl bg-white border border-slate-300 text-sm font-extrabold text-slate-800 flex items-center gap-2 active:scale-95 transition-all hover:bg-slate-50 hover:border-emerald-500 cursor-pointer"
                            >
                                <Ikon d={IKON.saring} className="w-4 h-4 text-slate-600" />
                                <span className="hidden sm:inline">Saring</span>
                                {jumlahFilterLanjut > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[1.35rem] h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                                        {jumlahFilterLanjut}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Baris Bawah: Quick Filter Period Chips */}
                        <div className="-mx-3.5 px-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-0.5">
                            {PERIODE_CEPAT.map((p) => (
                                <button
                                    key={p.k}
                                    type="button"
                                    onClick={() => setFilter((f) => ({ ...f, periode: p.k, tglMulai: '', tglSelesai: '' }))}
                                    aria-pressed={filter.periode === p.k}
                                    className={`shrink-0 px-4 h-9 rounded-full text-xs sm:text-sm font-extrabold border transition-all active:scale-95 cursor-pointer flex items-center justify-center ${filter.periode === p.k
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-slate-50/80 text-slate-700 border-slate-200/90 hover:bg-slate-100 hover:border-slate-300'
                                        }`}
                                >
                                    {p.l}
                                </button>
                            ))}

                            {filter.periode === 'KUSTOM' && (
                                <span className="shrink-0 px-4 h-9 rounded-full text-xs sm:text-sm font-extrabold bg-emerald-600 text-white border border-emerald-600 flex items-center justify-center shadow-xs">
                                    {filter.tglMulai ? tglPendek(filter.tglMulai) : 'Awal'} – {filter.tglSelesai ? tglPendek(filter.tglSelesai) : 'Sekarang'}
                                </span>
                            )}
                        </div>

                    </div>
                </header>

                <main className="max-w-5xl mx-auto px-4 py-5 space-y-5 pb-24">
                    {/* ---------- ringkasan ---------- */}
                    <section aria-label="Ringkasan">
                        {loadingRingkasan && !ringkasan ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-pulse">
                                {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
                            </div>
                        ) : errRingkasan ? (
                            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center justify-between gap-3">
                                <span>{errRingkasan}</span>
                                <button type="button" onClick={muatRingkasan} className="font-bold underline shrink-0">Coba lagi</button>
                            </div>
                        ) : ringkasan ? (
                            <div className={`transition-opacity ${loadingRingkasan ? 'opacity-60' : ''}`}>
                                <div className="-mx-4 px-5 ml-1  sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    <KartuRingkasan tone="rose" label="Perkiraan kerugian" nilai={rp(ringkasan.total_kerugian)} sub="dihitung dari harga modal barang" />
                                    <KartuRingkasan tone="slate" label="Barang rusak" nilai={`${num(ringkasan.total_pcs).toLocaleString('id-ID')} pcs`} sub="total semua barang rusak" />
                                    <KartuRingkasan tone="emerald" label="Jumlah catatan" nilai={num(ringkasan.total_catatan).toLocaleString('id-ID')} sub="kejadian barang rusak" />
                                </div>

                                {(statusRincian.length > 0 || topBarang.length > 0) && (
                                    <div className="mt-3">
                                        <button type="button" onClick={() => setRincianBuka((v) => !v)} aria-expanded={rincianBuka}
                                            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                                            {rincianBuka ? 'Tutup rincian' : 'Lihat rincian'}
                                            <Ikon d={IKON.panah} className={`w-4 h-4 transition-transform ${rincianBuka ? 'rotate-180' : ''}`} />
                                        </button>
                                        {rincianBuka && (
                                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                                                    <h3 className="text-sm font-bold text-slate-800">Sudah diklaim ke supplier?</h3>
                                                    <ul className="mt-2 divide-y divide-slate-100">
                                                        {statusRincian.map((s) => (
                                                            <li key={s.status_klaim ?? 'kosong'} className="py-2 flex items-center justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <Lencana nada={nadaStatus(s.status_klaim)}>{labelStatus(s.status_klaim)}</Lencana>
                                                                    <p className="text-xs text-slate-400 mt-1">{num(s.pcs).toLocaleString('id-ID')} pcs · {num(s.jumlah)} catatan</p>
                                                                </div>
                                                                <p className="font-bold text-slate-800 shrink-0">{rp(s.nilai)}</p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                                                    <h3 className="text-sm font-bold text-slate-800">Paling sering rusak</h3>
                                                    <ol className="mt-2 divide-y divide-slate-100">
                                                        {topBarang.map((b, i) => (
                                                            <li key={b.kode_barang} className="py-2 flex items-center gap-3">
                                                                <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">{i + 1}</span>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-semibold text-slate-800 truncate">{b.nama_barang || b.kode_barang}</p>
                                                                    <p className="text-xs text-slate-400">{num(b.pcs).toLocaleString('id-ID')} pcs rusak</p>
                                                                </div>
                                                                <p className="text-sm font-bold text-rose-600 shrink-0">{rp(b.nilai)}</p>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </section>

                    {/* ---------- daftar ---------- */}
                    <section aria-label="Daftar barang rusak" aria-busy={loadingAwal}>
                        {adaFilter && (
                            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-slate-500">Sedang disaring.</span>
                                {filter.sumber && <Lencana nada="slate">{labelSumber(filter.sumber)}</Lencana>}
                                {filter.status && <Lencana nada={nadaStatus(filter.status)}>{labelStatus(filter.status)}</Lencana>}
                                <button type="button" onClick={resetSemua} className="font-bold text-emerald-700 underline">Tampilkan semua</button>
                            </div>
                        )}

                        {loadingAwal ? (
                            <div className="grid gap-3 lg:grid-cols-2">
                                {[0, 1, 2, 3].map((i) => <KerangkaKartu key={i} />)}
                            </div>
                        ) : err && items.length === 0 ? (
                            <div className="p-6 rounded-2xl bg-white border border-rose-200 text-center space-y-3">
                                <p className="font-semibold text-rose-700">{err}</p>
                                <button type="button" onClick={() => muatHalaman(true)}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold active:scale-95 transition">Coba lagi</button>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="py-14 text-center space-y-3">
                                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Ikon d={IKON.kotak} className="w-8 h-8" />
                                </div>
                                <p className="font-bold text-slate-800">{adaFilter ? 'Tidak ada hasil' : 'Belum ada barang rusak'}</p>
                                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                    {adaFilter
                                        ? 'Coba ubah kata pencarian atau pilihan saringan.'
                                        : 'Barang rusak dari retur pelanggan akan muncul di sini secara otomatis.'}
                                </p>
                                {adaFilter && (
                                    <button type="button" onClick={resetSemua} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold active:scale-95 transition">
                                        Tampilkan semua
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {kelompok.map((g) => (
                                    <div key={g.tgl}>
                                        <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">{labelHari(g.tgl, hariIni, kemarin)}</h2>
                                        <ul className="grid gap-3 lg:grid-cols-2">
                                            {g.items.map((it) => <KartuRusak key={it.id_afkir} item={it} />)}
                                        </ul>
                                    </div>
                                ))}

                                {/* penanda untuk infinite scroll */}
                                <div ref={sentinel} className="h-px" aria-hidden="true" />

                                {loadingLagi && (
                                    <div className="grid gap-3 lg:grid-cols-2"><KerangkaKartu /><KerangkaKartu /></div>
                                )}
                                {err && (
                                    <div className="p-4 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
                                        <p className="text-sm font-semibold text-rose-700">{err}</p>
                                        <button type="button" onClick={() => muatHalaman(false)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Coba lagi</button>
                                    </div>
                                )}
                                {batasTercapai && hasMore && (
                                    <p className="text-center text-sm text-slate-500 py-3">
                                        Sudah menampilkan {MAX_ITEM_DI_MEMORI.toLocaleString('id-ID')} catatan. Pakai pencarian atau saringan untuk melihat yang lebih lama.
                                    </p>
                                )}
                                {!hasMore && !err && (
                                    <p className="text-center text-xs text-slate-400 py-3">Sudah sampai data paling lama</p>
                                )}
                            </div>
                        )}
                    </section>
                </main>

                {tampilAtas && (
                    <button type="button" aria-label="Kembali ke atas" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 p-3.5 rounded-full bg-emerald-600 text-white shadow-lg active:scale-90 transition">
                        <Ikon d={IKON.atas} />
                    </button>
                )}

                <LembarFilter buka={lembar} onTutup={tutupLembar} awal={filter} opsi={opsi} onTerapkan={terapkanLembar} />
            </div>
        
    );
}



export default function RiwayatBarangRusakPage(){

    return (
        <CEK_HAK_AKSES>
            <RiwayatBarangRusakContent/>
        </CEK_HAK_AKSES>
    )
}
