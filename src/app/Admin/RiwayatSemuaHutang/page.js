'use client';

import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";
import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { HeaderHutangSupplier } from "./components/headerRiwayatHutang";


// ============================================================================
// HALAMAN: RIWAYAT PEMBAYARAN HUTANG (SEMUA SUPPLIER)
// Endpoint: GET /api-be/SERVER_HUTANG/RIWAYAT_SEMUA_PEMBAYARAN_HUTANG
// Halaman ini TERPISAH, tidak menyentuh halaman HutangSupplier yang lama.
// Tampilan SAMA dengan halaman Riwayat Pembayaran Piutang:
//   1. Kotak filter: cari, tab jenis (garis bawah), tanggal
//   2. Ringkasan 2 angka
//   3. Daftar baris (ledger) per hari: HP = 1 kolom, desktop = berkolom
//   4. Klik baris -> detail di panel samping (drawer dari kanan)
// Semua gaya memakai class Tailwind, tanpa CSS tambahan.
//
// Data: INFINITE SCROLL memakai paging (page/limit) dari BE.
//   - Request lama dibatalkan (AbortController) saat filter berubah / halaman ditutup.
//   - Data ganda (jika ada transaksi baru saat scroll) dibuang berdasarkan nomor dokumen.
//   - Jumlah baris di memori dibatasi MAX_BARIS agar browser tidak berat.
// ============================================================================
const API = '/api-be/SERVER_HUTANG';
const PAGE_SIZE = 20;
const MAX_BARIS = 1000;           // batas baris yang dimuat; lebihnya minta user mempersempit filter
const num = (v) => Number(v) || 0;
const rp = (v) => num(v).toLocaleString('id-ID');
const pesanError = (err, fallback) => err?.response?.data?.message || fallback;

/* ───────────────────────── Tanggal ───────────────────────── */
const hariIni = () => {
    const w = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return w.toISOString().slice(0, 10);
};
const geserHari = (n) => {
    const w = new Date(Date.now() + 7 * 60 * 60 * 1000 - n * 86400000);
    return w.toISOString().slice(0, 10);
};
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const hari = (s) => String(s || '').slice(0, 10);
const jam = (s) => String(s || '').slice(11, 16);
const labelHari = (s) => (DATE_RE.test(s) ? fmtLong.format(parseYmd(s)) : 'Tanggal tidak diketahui');
const labelTgl = (s) => (DATE_RE.test(hari(s)) ? `${fmtShort.format(parseYmd(hari(s)))}, ${jam(s)}` : '-');
const labelMetode = (m) => ({ TUNAI: 'Tunai', TRANSFER: 'Transfer', POTONG_HUTANG: 'Retur barang' }[m] || m || '-');
const kunciBaris = (r) => `${r.jenis}-${r.no_bayar || r.no_retur}`;

const PRESETS = [
    { id: 'all', label: 'Semua tanggal', range: () => ['', ''] },
    { id: 'today', label: 'Hari ini', range: () => [hariIni(), hariIni()] },
    { id: 'yesterday', label: 'Kemarin', range: () => [geserHari(1), geserHari(1)] },
    { id: '7d', label: '7 hari terakhir', range: () => [geserHari(6), hariIni()] },
    { id: '30d', label: '30 hari terakhir', range: () => [geserHari(29), hariIni()] },
    { id: 'month', label: 'Bulan ini', range: () => [`${hariIni().slice(0, 8)}01`, hariIni()] }
];

const JENIS = [
    ['SEMUA', 'Semua'],
    ['PEMBAYARAN', 'Pembayaran'],
    ['RETUR', 'Potong retur']
];

/* ───────────────────────── Jenis transaksi ───────────────────────── */
function infoJenis(r) {
    if (r.jenis === 'RETUR') {
        return { teks: 'Potong retur', retur: true, badge: 'bg-amber-100 text-amber-800', hero: 'bg-amber-600' };
    }
    return { teks: 'Pembayaran', retur: false, badge: 'bg-emerald-100 text-emerald-800', hero: 'bg-emerald-700' };
}

const metaText = (r, j) => (j.retur
    ? `${jam(r.tanggal_bayar)} · Faktur ${r.no_faktur_retur || '-'}`
    : `${jam(r.tanggal_bayar)} · ${labelMetode(r.metode)}${r.dibuat_oleh ? ` · ${r.dibuat_oleh}` : ''}`);

/* ───────────────────────── Kelas Tailwind yang dipakai berulang ───────────────────────── */
const INPUT = 'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200';
const LABEL = 'mb-1 block text-xs font-semibold text-slate-600';
// Kolom baris daftar di layar md ke atas (judul kolom dan baris harus sama)
const KOLOM = 'md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_16px]';

/* ───────────────────────── Komponen kecil ───────────────────────── */
function Badge({ j }) {
    return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${j.badge}`}>{j.teks}</span>;
}

function Row({ k, v }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
            <dt className="shrink-0 text-slate-500">{k}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-slate-900">{v}</dd>
        </div>
    );
}

/* ───────────────────────── Isi panel detail ───────────────────────── */
function DetailBody({ r }) {
    const j = infoJenis(r);
    const isRetur = j.retur;
    const rincian = r.rincian || [];
    const noDok = r.no_bayar || r.no_retur;

    return (
        <div className="space-y-5">
            {/* angka utama */}
            <div className={`rounded-xl p-4 text-white ${j.hero}`}>
                <p className="text-sm text-white/80">{isRetur ? 'Total potong retur' : 'Total dibayar'}</p>
                <p className="mt-0.5 text-3xl font-bold tabular-nums">Rp {rp(r.total_bayar)}</p>
                <p className="mt-2 text-sm font-medium text-white/90">{r.nama_supplier}</p>
            </div>

            {/* info utama */}
            <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                <Row k="Jenis" v={j.teks} />
                <Row k="Tanggal" v={labelTgl(r.tanggal_bayar)} />
                <Row k={isRetur ? 'No. retur' : 'No. pembayaran'} v={<span className="break-all font-mono text-xs">{noDok}</span>} />
                {!isRetur && <Row k="Metode" v={labelMetode(r.metode)} />}
                {r.dibuat_oleh && <Row k="Dibuat oleh" v={r.dibuat_oleh} />}
            </dl>

            {r.catatan && (
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catatan</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-800">{r.catatan}</p>
                </div>
            )}

            {/* faktur */}
            <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">
                    {isRetur ? 'Faktur yang dipotong' : 'Faktur yang dibayar'} ({rincian.length})
                </h3>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {rincian.map((d, i) => {
                        const adaSisa = d.sisa_sebelum !== null && d.sisa_sebelum !== undefined;
                        return (
                            <li key={`${d.no_faktur}-${i}`} className="px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 break-all font-mono text-sm font-semibold text-slate-900">{d.no_faktur || '-'}</p>
                                    <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">Rp {rp(d.jumlah)}</p>
                                </div>
                                {adaSisa && (
                                    <p className="mt-1 text-xs tabular-nums text-slate-500">
                                        Sisa hutang {rp(d.sisa_sebelum)} → <span className="font-semibold text-slate-700">{rp(d.sisa_sesudah)}</span>
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* rincian pajak (khusus retur) */}
            {isRetur && (
                <div className="space-y-1.5 rounded-xl bg-emerald-50 p-4 text-sm tabular-nums">
                    <div className="flex justify-between gap-3">
                        <span className="text-slate-600">DPP</span>
                        <span className="whitespace-nowrap font-medium text-slate-900">Rp {rp(r.dpp_total)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span className="text-slate-600">PPN {num(r.ppn_persen)}%</span>
                        <span className="whitespace-nowrap font-medium text-slate-900">Rp {rp(r.ppn_nominal)}</span>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-emerald-200 pt-2 text-base font-bold text-emerald-800">
                        <span>Total potong retur</span>
                        <span className="whitespace-nowrap">Rp {rp(r.total_bayar)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ───────────────────────── Halaman ───────────────────────── */
export default function RiwayatSemuaPembayaranHutang() {
    const { setLoading } = useContext(Konteks);

    // filter
    const [q, setQ] = useState('');
    const [qAktif, setQAktif] = useState('');
    const [preset, setPreset] = useState('all');
    const [tglAwal, setTglAwal] = useState('');
    const [tglAkhir, setTglAkhir] = useState('');
    const [jenis, setJenis] = useState('SEMUA');

    // data
    const [rows, setRows] = useState([]);
    const [ringkasan, setRingkasan] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingFirst, setLoadingFirst] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [err, setErr] = useState('');
    const [errMore, setErrMore] = useState('');

    // panel detail
    const [sel, setSel] = useState(null);
    const [panelBuka, setPanelBuka] = useState(false);

    // ref untuk kontrol request & infinite scroll
    const reqId = useRef(0);
    const ctrlRef = useRef(null);
    const halamanBerikutRef = useRef(1);
    const busyRef = useRef(false);
    const hasMoreRef = useRef(false);
    const jumlahRef = useRef(0);
    const sentinelRef = useRef(null);
    const ambilLagiRef = useRef(null);
    const setLoadingRef = useRef(setLoading);
    useEffect(() => { setLoadingRef.current = setLoading; }, [setLoading]);

    const tglSalah = !!(tglAwal && tglAkhir && tglAwal > tglAkhir);

    // debounce pencarian
    useEffect(() => {
        const t = setTimeout(() => setQAktif(q.trim()), 400);
        return () => clearTimeout(t);
    }, [q]);

    // pemuat data: pertama = reset (halaman 1), selanjutnya = halaman berikutnya
    const ambil = useCallback(async (pertama) => {
        if (tglSalah) return; // jangan menembak server dengan rentang terbalik
        if (!pertama && (busyRef.current || !hasMoreRef.current || jumlahRef.current >= MAX_BARIS)) return;

        const setGlobal = (v) => setLoadingRef.current?.((prev) => ({ ...prev, loadingRequest: v }));
        const id = pertama ? ++reqId.current : reqId.current;
        if (pertama) {
            ctrlRef.current?.abort();          // batalkan request lama
            halamanBerikutRef.current = 1;
            hasMoreRef.current = false;
            jumlahRef.current = 0;
            setRows([]);
            setHasMore(false);
            setErr('');
            setErrMore('');
            setLoadingFirst(true);
            setGlobal(true);
        } else {
            setErrMore('');
            setLoadingMore(true);
        }

        const ctrl = new AbortController();
        ctrlRef.current = ctrl;
        busyRef.current = true;

        try {
            const ress = await axios.get(`${API}/RIWAYAT_SEMUA_PEMBAYARAN_HUTANG`, {
                params: {
                    q: qAktif || undefined,
                    tgl_awal: tglAwal || undefined,
                    tgl_akhir: tglAkhir || undefined,
                    jenis,
                    page: halamanBerikutRef.current,
                    limit: PAGE_SIZE,
                    _t: Date.now()
                },
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
                signal: ctrl.signal
            });
            if (id !== reqId.current) return;

            const d = ress.data.data;
            const baru = d.riwayat || [];
            const lagi = d.paging.page < d.paging.total_page;
            halamanBerikutRef.current = d.paging.page + 1;
            hasMoreRef.current = lagi;
            setHasMore(lagi);
            if (pertama) setRingkasan(d.ringkasan || null);

            setRows((prev) => {
                const dasar = pertama ? [] : prev;
                const ada = new Set(dasar.map(kunciBaris));
                const tambah = baru.filter((r) => !ada.has(kunciBaris(r)));
                const gabung = dasar.concat(tambah);
                jumlahRef.current = gabung.length;
                return gabung;
            });
        } catch (e) {
            if (axios.isCancel(e) || id !== reqId.current) return;
            if (pertama) setErr(pesanError(e, 'Gagal memuat riwayat pembayaran.'));
            else setErrMore(pesanError(e, 'Gagal memuat data berikutnya.'));
        } finally {
            if (id === reqId.current) {
                busyRef.current = false;
                setLoadingFirst(false);
                setLoadingMore(false);
                if (pertama) setGlobal(false);
            }
        }
    }, [qAktif, tglAwal, tglAkhir, jenis, tglSalah]);

    // filter berubah -> muat ulang dari awal
    useEffect(() => { ambil(true); }, [ambil]);

    // halaman ditutup -> batalkan request yang masih jalan + matikan loading global
    useEffect(() => () => {
        ctrlRef.current?.abort();
        setLoadingRef.current?.((prev) => ({ ...prev, loadingRequest: false }));
    }, []);

    // infinite scroll: muat berikutnya saat sentinel mendekati layar
    useEffect(() => { ambilLagiRef.current = () => ambil(false); }, [ambil]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return undefined;
        const io = new IntersectionObserver((es) => {
            if (es.some((e) => e.isIntersecting)) ambilLagiRef.current?.();
        }, { rootMargin: '500px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // layar tinggi / daftar pendek: sentinel sudah terlihat tapi observer tidak menembak lagi
    useEffect(() => {
        if (!hasMore || loadingFirst || loadingMore || errMore) return;
        const el = sentinelRef.current;
        if (el && el.getBoundingClientRect().top < window.innerHeight + 500) ambilLagiRef.current?.();
    }, [rows, hasMore, loadingFirst, loadingMore, errMore]);

    // panel detail: tutup dengan Esc, kunci scroll halaman saat terbuka
    const tutupPanel = useCallback(() => setPanelBuka(false), []);
    useEffect(() => {
        if (!panelBuka) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') tutupPanel(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [panelBuka, tutupPanel]);

    function bukaDetail(r) {
        setSel(r);
        setPanelBuka(true);
    }

    function pilihPreset(id) {
        if (id === 'custom') { setPreset('custom'); return; }
        const p = PRESETS.find((x) => x.id === id);
        const [a, b] = p.range();
        setPreset(id);
        setTglAwal(a);
        setTglAkhir(b);
    }

    function ubahTanggal(setter) {
        return (v) => { setter(v); setPreset('custom'); };
    }

    function reset() {
        setQ(''); setQAktif('');
        setPreset('all'); setTglAwal(''); setTglAkhir('');
        setJenis('SEMUA');
    }

    const adaFilter = !!(qAktif || tglAwal || tglAkhir || jenis !== 'SEMUA');
    const batas = hasMore && rows.length >= MAX_BARIS;

    // kelompokkan per hari
    const grup = [];
    rows.forEach((r) => {
        const h = hari(r.tanggal_bayar);
        const last = grup[grup.length - 1];
        if (last && last.hari === h) last.items.push(r);
        else grup.push({ hari: h, items: [r] });
    });

    const selJenis = sel ? infoJenis(sel) : null;

    return (
        <CEK_HAK_AKSES>
            <div className="p-0 md:p-6 pb-24">

                <div className="mx-auto w-full max-w-6xl space-y-5 p-4">
                   <HeaderHutangSupplier/>

                    {/* ============ JUDUL ============ */}
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Riwayat Pembayaran Hutang</h1>
                        <p className="mt-1 text-sm text-slate-600">Semua pembayaran dan potongan retur ke seluruh supplier.</p>
                    </div>

                    {/* ============ FILTER ============ */}
                    <section className="rounded-xl border border-slate-200 bg-white" aria-label="Filter">
                        <div className="p-4">
                            <label htmlFor="cari" className="sr-only">Cari supplier atau nomor faktur</label>
                            <div className="relative">
                                <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                                </svg>
                                <input
                                    id="cari"
                                    type="search"
                                    maxLength={100}
                                    autoComplete="off"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Cari nama supplier atau no. faktur"
                                    className={`${INPUT} pl-10 pr-10`}
                                />
                                {q && (
                                    <button
                                        type="button"
                                        onClick={() => setQ('')}
                                        aria-label="Hapus pencarian"
                                        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100"
                                    >×</button>
                                )}
                            </div>
                        </div>

                        {/* tab jenis */}
                        <div className="flex border-y border-slate-200 px-2" role="tablist" aria-label="Jenis transaksi">
                            {JENIS.map(([k, label]) => (
                                <button
                                    key={k}
                                    type="button"
                                    role="tab"
                                    aria-selected={jenis === k}
                                    onClick={() => setJenis(k)}
                                    className={`-mb-px flex-1 border-b-2 px-3 py-3 text-sm font-semibold transition sm:flex-none sm:px-6 ${jenis === k
                                        ? 'border-emerald-600 text-emerald-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                >{label}</button>
                            ))}
                        </div>

                        {/* tanggal */}
                        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
                            <div className="col-span-2 md:col-span-1">
                                <label htmlFor="rentang" className={LABEL}>Rentang tanggal</label>
                                <select
                                    id="rentang"
                                    value={preset}
                                    onChange={(e) => pilihPreset(e.target.value)}
                                    className={INPUT}
                                >
                                    {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                                    {preset === 'custom' && <option value="custom">Tanggal manual</option>}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="tgl-awal" className={LABEL}>Dari tanggal</label>
                                <input
                                    id="tgl-awal"
                                    type="date"
                                    value={tglAwal}
                                    max={tglAkhir || undefined}
                                    onChange={(e) => ubahTanggal(setTglAwal)(e.target.value)}
                                    className={INPUT}
                                />
                            </div>
                            <div>
                                <label htmlFor="tgl-akhir" className={LABEL}>Sampai tanggal</label>
                                <input
                                    id="tgl-akhir"
                                    type="date"
                                    value={tglAkhir}
                                    min={tglAwal || undefined}
                                    onChange={(e) => ubahTanggal(setTglAkhir)(e.target.value)}
                                    className={INPUT}
                                />
                            </div>
                            {adaFilter && (
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="col-span-2 h-11 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:col-span-1"
                                >Reset</button>
                            )}
                            {tglSalah && (
                                <p role="alert" className="col-span-2 text-sm font-semibold text-red-600 md:col-span-4">Tanggal awal tidak boleh lebih besar dari tanggal akhir.</p>
                            )}
                        </div>
                    </section>

                    {/* ============ RINGKASAN ============ */}
                    <section className="grid grid-cols-2 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white" aria-label="Ringkasan">
                        <div className="min-w-0 p-4 md:p-5">
                            <p className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                                Total dibayarkan
                            </p>
                            <p className="mt-1 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl md:text-2xl">Rp {rp(ringkasan?.total_pembayaran)}</p>
                            <p className="text-xs text-slate-500 sm:text-sm">{rp(ringkasan?.jumlah_pembayaran)} transaksi</p>
                        </div>
                        <div className="min-w-0 p-4 md:p-5">
                            <p className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
                                Potong retur
                            </p>
                            <p className="mt-1 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl md:text-2xl">Rp {rp(ringkasan?.total_retur)}</p>
                            <p className="text-xs text-slate-500 sm:text-sm">{rp(ringkasan?.jumlah_retur)} retur</p>
                        </div>
                    </section>

                    {/* ============ ERROR (halaman pertama) ============ */}
                    {err && (
                        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                            <p className="font-semibold text-red-700">Data gagal dimuat</p>
                            <p className="mt-1 text-sm text-red-600">{err}</p>
                            <button type="button" onClick={() => ambil(true)} className="mt-3 h-10 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800">Coba lagi</button>
                        </div>
                    )}

                    {/* ============ DAFTAR ============ */}
                    <section aria-label="Daftar riwayat" aria-busy={loadingFirst || loadingMore}>
                        {loadingFirst && rows.length === 0 && !err && (
                            <div className="space-y-2" aria-hidden="true">
                                {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200" />)}
                            </div>
                        )}

                        {!loadingFirst && !err && rows.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
                                <p className="text-base font-semibold text-slate-800">Tidak ada riwayat</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {adaFilter ? 'Tidak ada data untuk filter ini. Coba ubah tanggal atau kata kunci.' : 'Belum ada pembayaran hutang.'}
                                </p>
                                {adaFilter && (
                                    <button type="button" onClick={reset} className="mt-4 h-10 rounded-lg bg-emerald-50 px-5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">Atur ulang filter</button>
                                )}
                            </div>
                        )}

                        {rows.length > 0 && (
                            <>
                                {/* judul kolom (desktop) */}
                                <div className={`hidden gap-4 px-[21px] pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid ${KOLOM}`}>
                                    <span>Supplier / No. dokumen</span>
                                    <span>Jenis</span>
                                    <span>Jam · Keterangan</span>
                                    <span className="text-right">Total</span>
                                    <span />
                                </div>

                                <div className="space-y-5">
                                    {grup.map((g) => (
                                        <div key={g.hari}>
                                            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <span className="h-4 w-1 rounded bg-emerald-500" aria-hidden="true" />
                                                {labelHari(g.hari)}
                                            </h2>
                                            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                {g.items.map((r) => {
                                                    const j = infoJenis(r);
                                                    const noDok = r.no_bayar || r.no_retur;
                                                    return (
                                                        <li key={kunciBaris(r)}>
                                                            <button
                                                                type="button"
                                                                onClick={() => bukaDetail(r)}
                                                                aria-label={`Lihat detail ${j.teks} ${noDok}`}
                                                                className={`grid w-full grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-x-4 px-4 py-3.5 text-left transition hover:bg-emerald-50/60 active:bg-emerald-50 md:px-5 ${KOLOM}`}
                                                            >
                                                                {/* supplier + nomor */}
                                                                <span className="min-w-0">
                                                                    <span className="block truncate text-base font-semibold text-slate-900">{r.nama_supplier}</span>
                                                                    <span className="block truncate font-mono text-xs text-slate-500">{noDok}</span>
                                                                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 md:hidden">
                                                                        <Badge j={j} />
                                                                        <span className="text-xs text-slate-500">{metaText(r, j)}</span>
                                                                    </span>
                                                                </span>

                                                                {/* desktop: jenis & keterangan */}
                                                                <span className="hidden md:block"><Badge j={j} /></span>
                                                                <span className="hidden truncate text-sm text-slate-600 md:block">{metaText(r, j)}</span>

                                                                {/* nominal */}
                                                                <span className="whitespace-nowrap text-right text-base font-bold tabular-nums text-slate-900 md:text-lg">Rp {rp(r.total_bayar)}</span>

                                                                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <path d="M7 4l6 6-6 6" />
                                                                </svg>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* status di bawah daftar (infinite scroll) */}
                        {loadingMore && (
                            <div className="flex justify-center py-6" role="status" aria-label="Memuat data berikutnya">
                                <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
                            </div>
                        )}

                        {errMore && (
                            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                                <p className="text-sm font-semibold text-red-700">{errMore}</p>
                                <button type="button" onClick={() => ambil(false)} className="mt-3 h-10 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800">Coba lagi</button>
                            </div>
                        )}

                        {batas && !errMore && (
                            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800">
                                Menampilkan {rp(rows.length)} data terbaru. Persempit tanggal atau kata kunci untuk melihat data lainnya.
                            </p>
                        )}

                        {!hasMore && !loadingFirst && !loadingMore && !err && rows.length > 0 && (
                            <p className="py-6 text-center text-sm text-slate-500">Semua {rp(rows.length)} data sudah ditampilkan</p>
                        )}

                        {/* penanda untuk memuat halaman berikutnya */}
                        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                    </section>
                </div>

                {/* ============ PANEL DETAIL (drawer dari kanan) ============ */}
                <div
                    onClick={tutupPanel}
                    className={`fixed inset-0 z-[1000] bg-slate-900/50 transition-opacity duration-300 ${panelBuka ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                />
                <aside
                    role="dialog"
                    aria-modal="true"
                    aria-hidden={!panelBuka}
                    aria-label="Detail transaksi"
                    className={`fixed inset-y-0 right-0 z-[1001] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${panelBuka ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
                        <h2 className="text-lg font-bold text-slate-900">{selJenis?.retur ? 'Detail potong retur' : 'Detail pembayaran'}</h2>
                        <button
                            type="button"
                            onClick={tutupPanel}
                            tabIndex={panelBuka ? 0 : -1}
                            aria-label="Tutup"
                            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-500 hover:bg-slate-100"
                        >×</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5">
                        {sel && <DetailBody r={sel} />}
                    </div>
                    <div className="border-t border-slate-200 p-4">
                        <button
                            type="button"
                            onClick={tutupPanel}
                            tabIndex={panelBuka ? 0 : -1}
                            className="h-11 w-full rounded-lg bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800"
                        >Tutup</button>
                    </div>
                </aside>
            </div>
        </CEK_HAK_AKSES>
    );
}
