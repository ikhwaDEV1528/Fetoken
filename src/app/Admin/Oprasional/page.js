'use client';

import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";
import { SubHeader } from "@/UI/Header/subHeader";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// BEBAN OPERASIONAL TOKO
//   - Catat beban (form dengan validasi yang sama ketatnya dengan backend)
//   - Ringkasan periode + komposisi beban per kategori (klik untuk menyaring)
//   - Riwayat dengan pencarian, filter, pagination, dan pembatalan beralasan
//
// Backend yang menentukan nominal, tanggal, dan kategori final. Validasi di sini
// hanya agar admin tahu kesalahannya sebelum menyimpan.
// Endpoint: /api-be/SERVER_OPERASIONAL/{KATEGORI_OPERASIONAL, TAMBAH_OPERASIONAL,
//           DAFTAR_OPERASIONAL, RINGKASAN_OPERASIONAL, BATALKAN_OPERASIONAL}
// ============================================================================
const API = '/api-be/SERVER_OPRASIONAL';

// <<HELPERS
const BATAS_DEFAULT = {
    max_nominal: 2_000_000_000,
    max_keterangan: 255,
    max_no_bukti: 50,
    max_backdate_hari: 366,
    min_alasan_batal: 5,
    max_alasan_batal: 255
};

const num = (v) => Number(v) || 0;
const rp = (v) => num(v).toLocaleString('id-ID');
const digitsOnly = (s, maks = 10) => String(s ?? '').replace(/\D/g, '').slice(0, maks);
const pad = (n) => String(n).padStart(2, '0');
const pesanError = (err, fallback) => err?.response?.data?.message || fallback;

// Semua tanggal memakai WIB (UTC+7) agar sama dengan server, apapun zona waktu perangkat.
const wibNow = () => new Date(Date.now() + 7 * 60 * 60 * 1000);
const fmtTgl = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const hariIni = () => fmtTgl(wibNow());
const inputSekarang = () => {
    const d = wibNow();
    return `${fmtTgl(d)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const pecahTgl = (t) => t.split('-').map(Number);
const geser = (tgl, n) => {
    const [y, m, d] = pecahTgl(tgl);
    return fmtTgl(new Date(Date.UTC(y, m - 1, d + n)));
};
const awalBulan = (tgl, offset = 0) => {
    const [y, m] = pecahTgl(tgl);
    return fmtTgl(new Date(Date.UTC(y, m - 1 + offset, 1)));
};
const akhirBulan = (tgl, offset = 0) => {
    const [y, m] = pecahTgl(tgl);
    return fmtTgl(new Date(Date.UTC(y, m + offset, 0)));
};

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function tampilTanggal(tgl) {
    if (!tgl) return '-';
    const [y, m, d] = pecahTgl(String(tgl).slice(0, 10));
    return `${d} ${BULAN[m - 1]} ${y}`;
}
const tampilJam = (dt) => (dt ? String(dt).slice(11, 16) : '');

function msInput(v) {
    const mt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v || '');
    if (!mt) return NaN;
    const [y, m, d, h, mi] = [mt[1], mt[2], mt[3], mt[4], mt[5]].map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, h, mi));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d || h > 23 || mi > 59) return NaN;
    return dt.getTime();
}

const REGEX_NO_BUKTI = /^[A-Za-z0-9][A-Za-z0-9 ._\-/]*$/;

function validasiForm(f, batas) {
    const e = {};
    if (!f.kategori_beban) e.kategori_beban = 'Pilih kategori beban.';

    const jumlah = Number(f.jumlah_biaya);
    if (!f.jumlah_biaya || !Number.isSafeInteger(jumlah) || jumlah <= 0) {
        e.jumlah_biaya = 'Isi jumlah biaya lebih dari 0.';
    } else if (jumlah > batas.max_nominal) {
        e.jumlah_biaya = `Maksimal Rp ${rp(batas.max_nominal)} per catatan.`;
    }

    const ms = msInput(f.tanggal);
    const sekarang = msInput(inputSekarang());
    if (Number.isNaN(ms)) {
        e.tanggal = 'Isi tanggal dan jam yang valid.';
    } else if (ms > sekarang + 5 * 60_000) {
        e.tanggal = 'Tanggal tidak boleh di masa depan.';
    } else if (ms < sekarang - batas.max_backdate_hari * 86_400_000) {
        e.tanggal = `Maksimal ${batas.max_backdate_hari} hari ke belakang.`;
    }

    const ket = (f.keterangan || '').trim();
    if (ket.length > batas.max_keterangan) e.keterangan = `Maksimal ${batas.max_keterangan} karakter.`;
    if (f.kategori_beban === 'LAINNYA' && ket.length < 3) {
        e.keterangan = 'Kategori Lainnya wajib diisi keterangan (minimal 3 karakter).';
    }

    const nb = (f.no_bukti || '').trim();
    if (nb && (nb.length > batas.max_no_bukti || !REGEX_NO_BUKTI.test(nb))) {
        e.no_bukti = 'Hanya huruf, angka, spasi, titik, minus, dan garis miring.';
    }
    return e;
}

function buatUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const h = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return `${h(8)}-${h(4)}-4${h(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${h(3)}-${h(12)}`;
}

const PERIODE = [
    { key: 'hari_ini', label: 'Hari ini', hitung: (t) => ({ dari: t, sampai: t }) },
    { key: '7_hari', label: '7 hari', hitung: (t) => ({ dari: geser(t, -6), sampai: t }) },
    { key: 'bulan_ini', label: 'Bulan ini', hitung: (t) => ({ dari: awalBulan(t), sampai: akhirBulan(t) }) },
    { key: 'bulan_lalu', label: 'Bulan lalu', hitung: (t) => ({ dari: awalBulan(t, -1), sampai: akhirBulan(t, -1) }) },
    { key: 'tahun_ini', label: 'Tahun ini', hitung: (t) => ({ dari: `${t.slice(0, 4)}-01-01`, sampai: `${t.slice(0, 4)}-12-31` }) },
    { key: 'kustom', label: 'Pilih tanggal', hitung: null }
];

const WARNA_KATEGORI = ['#0E9F6E', '#3B6EA5', '#C28A1E', '#B4535A', '#7C5DA8', '#0F766E', '#65A30D', '#0284C7', '#9A6B4B', '#6B7F78', '#8A4FFF'];
const WARNA_LAIN = '#6B7280';

function warnaKategori(kode, daftarKategori) {
    const i = (daftarKategori || []).findIndex((k) => k.kode === kode);
    return i >= 0 ? WARNA_KATEGORI[i % WARNA_KATEGORI.length] : WARNA_LAIN;
}

// jendela nomor halaman: 1 ... 4 5 [6] 7 8 ... 20
function nomorHalaman(page, total) {
    const set = new Set([1, total, page - 1, page, page + 1]);
    const urut = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const hasil = [];
    urut.forEach((n, i) => {
        if (i > 0 && n - urut[i - 1] > 1) hasil.push('...');
        hasil.push(n);
    });
    return hasil;
}
// HELPERS>>

const FORM_KOSONG = () => ({
    kategori_beban: '',
    jumlah_biaya: '',
    tanggal: inputSekarang(),
    metode_bayar: 'TUNAI',
    keterangan: '',
    no_bukti: ''
});

// ----------------------------------------------------------------------------
// KOMPONEN KECIL
// ----------------------------------------------------------------------------
function Ikon({ nama, className = 'w-4 h-4' }) {
    const jalur = {
        cari: 'M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z',
        tutup: 'M6 6l12 12M18 6L6 18',
        tambah: 'M12 5v14M5 12h14',
        naik: 'M5 15l7-7 7 7',
        turun: 'M19 9l-7 7-7-7',
        batal: 'M18.4 5.6a8 8 0 11-12.8 0M12 3v9'
    };
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <path d={jalur[nama]} />
        </svg>
    );
}

function Modal({ judul, onClose, terkunci, children, lebar = 'max-w-lg' }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !terkunci) onClose(); };
        document.addEventListener('keydown', onKey);
        const awal = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = awal;
        };
    }, [onClose, terkunci]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#06241B]/60 p-0 sm:p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !terkunci) onClose(); }}
        >
            <div role="dialog" aria-modal="true" aria-label={judul} className={`w-full ${lebar} max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl`}>
                {children}
            </div>
        </div>
    );
}

function Field({ label, error, bantuan, children }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-[#14231D] mb-1">{label}</label>
            {children}
            {error ? (
                <p className="mt-1 text-xs font-semibold text-rose-700" role="alert">{error}</p>
            ) : bantuan ? (
                <p className="mt-1 text-xs text-[#5B6F66]">{bantuan}</p>
            ) : null}
        </div>
    );
}

const inputCls = (adaError) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm bg-white text-[#14231D] placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
        adaError ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-300 focus:ring-emerald-400 focus:border-emerald-500'
    }`;

// ----------------------------------------------------------------------------
// content
// ----------------------------------------------------------------------------
function OperasionalTokoContent() {
    // ---------- meta (kategori & batas dari backend) ----------
    const [meta, setMeta] = useState(null);
    const [errMeta, setErrMeta] = useState('');
    const batas = meta?.batas || BATAS_DEFAULT;
    const kategoriList = meta?.kategori || [];

    const muatMeta = useCallback(async () => {
        setErrMeta('');
        try {
            const ress = await axios.get(`${API}/KATEGORI_OPERASIONAL`, { params: { _t: Date.now() } });
            setMeta(ress.data.data);
        } catch (err) {
            setErrMeta(pesanError(err, 'Gagal memuat daftar kategori.'));
        }
    }, []);
    useEffect(() => { muatMeta(); }, [muatMeta]);

    // ---------- filter ----------
    const [periode, setPeriode] = useState('bulan_ini');
    const [rentang, setRentang] = useState(() => PERIODE[2].hitung(hariIni()));
    const [q, setQ] = useState('');
    const [qAktif, setQAktif] = useState('');
    const [kategori, setKategori] = useState('');
    const [metode, setMetode] = useState('');
    const [status, setStatus] = useState('AKTIF');
    const [sort, setSort] = useState('terbaru');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    useEffect(() => {
        const t = setTimeout(() => {
            setQAktif(q.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [q]);

    const errRentang = useMemo(() => {
        if (!rentang.dari || !rentang.sampai) return 'Isi tanggal awal dan akhir.';
        if (rentang.dari > rentang.sampai) return 'Tanggal awal tidak boleh melewati tanggal akhir.';
        return '';
    }, [rentang]);

    const paramFilter = useMemo(() => {
        const p = {};
        if (!errRentang) {
            p.dari = rentang.dari;
            p.sampai = rentang.sampai;
        }
        if (qAktif) p.q = qAktif;
        if (kategori) p.kategori = kategori;
        if (metode) p.metode = metode;
        return p;
    }, [errRentang, rentang, qAktif, kategori, metode]);
    const filterKey = JSON.stringify(paramFilter);

    function pilihPeriode(key) {
        setPeriode(key);
        const p = PERIODE.find((x) => x.key === key);
        if (p?.hitung) setRentang(p.hitung(hariIni()));
        setPage(1);
    }

    function ubahFilter(setter, nilai) {
        setter(nilai);
        setPage(1);
    }

    function resetFilter() {
        setQ('');
        setQAktif('');
        setKategori('');
        setMetode('');
        setStatus('AKTIF');
        setPage(1);
    }

    const adaFilterAktif = !!(qAktif || kategori || metode || status !== 'AKTIF');

    // ---------- data ----------
    const [daftar, setDaftar] = useState(null);
    const [loadingDaftar, setLoadingDaftar] = useState(false);
    const [errDaftar, setErrDaftar] = useState('');
    const reqDaftar = useRef(0);

    const [ringkasan, setRingkasan] = useState(null);
    const [errRingkasan, setErrRingkasan] = useState('');
    const reqRingkasan = useRef(0);

    const muatDaftar = useCallback(async () => {
        if (errRentang) return;
        const id = ++reqDaftar.current;
        setLoadingDaftar(true);
        setErrDaftar('');
        try {
            const ress = await axios.get(`${API}/DAFTAR_OPERASIONAL`, {
                params: { ...JSON.parse(filterKey), status, sort, page, limit, _t: Date.now() },
                headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
            });
            if (id !== reqDaftar.current) return;
            setDaftar(ress.data.data);
        } catch (err) {
            if (id !== reqDaftar.current) return;
            setErrDaftar(pesanError(err, 'Gagal memuat riwayat beban.'));
        } finally {
            if (id === reqDaftar.current) setLoadingDaftar(false);
        }
    }, [errRentang, filterKey, status, sort, page, limit]);

    const muatRingkasan = useCallback(async () => {
        if (errRentang) return;
        const id = ++reqRingkasan.current;
        setErrRingkasan('');
        try {
            const ress = await axios.get(`${API}/RINGKASAN_OPERASIONAL`, {
                params: { ...JSON.parse(filterKey), _t: Date.now() },
                headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
            });
            if (id !== reqRingkasan.current) return;
            setRingkasan(ress.data.data);
        } catch (err) {
            if (id !== reqRingkasan.current) return;
            setErrRingkasan(pesanError(err, 'Gagal memuat ringkasan.'));
        }
    }, [errRentang, filterKey]);

    useEffect(() => { muatDaftar(); }, [muatDaftar]);
    useEffect(() => { muatRingkasan(); }, [muatRingkasan]);

    function segarkan(keHalamanPertama) {
        if (keHalamanPertama && page !== 1) setPage(1);
        else muatDaftar();
        muatRingkasan();
    }

    // ---------- layar ----------
    const [isDesktop, setIsDesktop] = useState(null);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const set = () => setIsDesktop(mq.matches);
        set();
        mq.addEventListener('change', set);
        return () => mq.removeEventListener('change', set);
    }, []);
    const [formTerbuka, setFormTerbuka] = useState(false);

    // ---------- form ----------
    const [form, setForm] = useState(FORM_KOSONG);
    const [errForm, setErrForm] = useState({});
    const [errSimpan, setErrSimpan] = useState('');
    const [menyimpan, setMenyimpan] = useState(false);
    const requestId = useRef(buatUUID());
    const refField = useRef({});

    const errBerjalan = useMemo(() => validasiForm(form, batas), [form, batas]);

    function ubahForm(nama, nilai) {
        setForm((prev) => ({ ...prev, [nama]: nilai }));
        setErrSimpan('');
        if (errForm[nama]) setErrForm((prev) => ({ ...prev, [nama]: undefined }));
    }

    function kosongkanForm() {
        setForm((prev) => ({ ...FORM_KOSONG(), metode_bayar: prev.metode_bayar }));
        setErrForm({});
        setErrSimpan('');
    }

    const [toast, setToast] = useState(null);
    const timerToast = useRef(null);
    function tampilToast(pesan, jenis = 'ok') {
        setToast({ pesan, jenis });
        clearTimeout(timerToast.current);
        timerToast.current = setTimeout(() => setToast(null), 4500);
    }
    useEffect(() => () => clearTimeout(timerToast.current), []);

    async function simpan(e) {
        e?.preventDefault();
        if (menyimpan) return;

        const e2 = validasiForm(form, batas);
        setErrForm(e2);
        const pertama = Object.keys(e2)[0];
        if (pertama) {
            refField.current[pertama]?.focus();
            return;
        }

        setMenyimpan(true);
        setErrSimpan('');
        try {
            const ress = await axios.post(`${API}/TAMBAH_OPERASIONAL`, {
                kategori_beban: form.kategori_beban,
                jumlah_biaya: Number(form.jumlah_biaya),
                tanggal: form.tanggal,
                metode_bayar: form.metode_bayar,
                keterangan: form.keterangan.trim(),
                no_bukti: form.no_bukti.trim(),
                request_id: requestId.current
            });

            const hasil = ress.data.data;
            const tglCatat = form.tanggal.slice(0, 10);
            const diLuar = !errRentang && (tglCatat < rentang.dari || tglCatat > rentang.sampai);

            requestId.current = buatUUID();
            kosongkanForm();
            setFormTerbuka(false);

            if (hasil?.duplikat) tampilToast('Beban ini sudah tercatat sebelumnya.', 'info');
            else if (diLuar) tampilToast('Beban dicatat. Tanggalnya di luar periode yang sedang ditampilkan.', 'info');
            else tampilToast('Beban dicatat.');

            segarkan(sort === 'terbaru');
        } catch (err) {
            // request_id sengaja dipertahankan: mengulang simpan tidak akan membuat catatan ganda
            setErrSimpan(pesanError(err, 'Tidak dapat terhubung ke server. Coba simpan lagi.'));
        } finally {
            setMenyimpan(false);
        }
    }

    // ---------- batalkan ----------
    const [target, setTarget] = useState(null);
    const [alasan, setAlasan] = useState('');
    const [errAlasan, setErrAlasan] = useState('');
    const [membatalkan, setMembatalkan] = useState(false);

    function bukaBatal(row) {
        setTarget(row);
        setAlasan('');
        setErrAlasan('');
    }

    async function konfirmasiBatal() {
        if (membatalkan || !target) return;
        const teks = alasan.trim();
        if (teks.length < batas.min_alasan_batal) {
            return setErrAlasan(`Alasan minimal ${batas.min_alasan_batal} karakter.`);
        }
        setMembatalkan(true);
        setErrAlasan('');
        try {
            await axios.post(`${API}/BATALKAN_OPERASIONAL`, {
                id_operasional: target.id_operasional,
                alasan: teks
            });
            setTarget(null);
            tampilToast('Beban dibatalkan.');
            segarkan(false);
        } catch (err) {
            setErrAlasan(pesanError(err, 'Gagal membatalkan. Coba lagi.'));
            if (err?.response?.status === 409 || err?.response?.status === 404) segarkan(false);
        } finally {
            setMembatalkan(false);
        }
    }

    // ---------- turunan tampilan ----------
    const rows = daftar?.operasional || [];
    const paging = daftar?.paging;

    // Halaman yang sedang dibuka bisa hilang (mis. data dibatalkan/difilter): mundur ke halaman terakhir
    useEffect(() => {
        if (paging && page > paging.total_page) setPage(paging.total_page);
    }, [paging, page]);
    const [semuaKategori, setSemuaKategori] = useState(false);
    const perKategori = ringkasan?.per_kategori || [];
    const tampilKategori = semuaKategori ? perKategori : perKategori.slice(0, 6);
    const pembanding = ringkasan?.pembanding;
    const perubahan = pembanding?.perubahan_persen;
    const metodeTotal = (m) => num((ringkasan?.per_metode || []).find((x) => x.metode_bayar === m)?.total);

    // ======================================================================
    // FORM (dirender sekali: sebagai kolom di desktop, atau lembar di ponsel)
    // ======================================================================
    function renderForm() {
        const tampilErr = (k) => errForm[k] || undefined;
        const sisaKet = batas.max_keterangan - form.keterangan.length;
        const siapSimpan = Object.keys(errBerjalan).length === 0;

        return (
            <form onSubmit={simpan} noValidate className="space-y-4">
                {errMeta && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">
                        {errMeta}{' '}
                        <button type="button" onClick={muatMeta} className="font-bold underline">Muat ulang</button>
                    </div>
                )}

                <Field label="Kategori beban" error={tampilErr('kategori_beban')}>
                    <select
                        ref={(el) => { refField.current.kategori_beban = el; }}
                        value={form.kategori_beban}
                        onChange={(e) => ubahForm('kategori_beban', e.target.value)}
                        aria-invalid={!!errForm.kategori_beban}
                        className={inputCls(errForm.kategori_beban)}
                    >
                        <option value="">Pilih kategori</option>
                        {kategoriList.map((k) => <option key={k.kode} value={k.kode}>{k.label}</option>)}
                    </select>
                </Field>

                <Field label="Jumlah biaya" error={tampilErr('jumlah_biaya')}>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-800">Rp</span>
                        <input
                            ref={(el) => { refField.current.jumlah_biaya = el; }}
                            inputMode="numeric"
                            autoComplete="off"
                            value={form.jumlah_biaya === '' ? '' : rp(form.jumlah_biaya)}
                            onChange={(e) => ubahForm('jumlah_biaya', digitsOnly(e.target.value))}
                            placeholder="0"
                            aria-invalid={!!errForm.jumlah_biaya}
                            className={`${inputCls(errForm.jumlah_biaya)} pl-10 text-right font-bold tabular-nums`}
                        />
                    </div>
                </Field>

                <Field label="Tanggal dan jam" error={tampilErr('tanggal')}>
                    <input
                        ref={(el) => { refField.current.tanggal = el; }}
                        type="datetime-local"
                        value={form.tanggal}
                        max={inputSekarang()}
                        onChange={(e) => ubahForm('tanggal', e.target.value)}
                        aria-invalid={!!errForm.tanggal}
                        className={inputCls(errForm.tanggal)}
                    />
                </Field>

                <Field label="Dibayar lewat">
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Metode bayar">
                        {[['TUNAI', 'Tunai'], ['TRANSFER', 'Transfer']].map(([k, label]) => (
                            <button
                                key={k}
                                type="button"
                                role="radio"
                                aria-checked={form.metode_bayar === k}
                                onClick={() => ubahForm('metode_bayar', k)}
                                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                                    form.metode_bayar === k
                                        ? 'bg-emerald-700 border-emerald-700 text-white'
                                        : 'bg-white border-slate-300 text-slate-700 hover:bg-emerald-50'
                                }`}
                            >{label}</button>
                        ))}
                    </div>
                </Field>

                <Field
                    label="Keterangan"
                    error={tampilErr('keterangan')}
                    bantuan={form.kategori_beban === 'LAINNYA' ? 'Wajib diisi untuk kategori Lainnya.' : 'Opsional. Contoh: token listrik gudang bulan Oktober.'}
                >
                    <textarea
                        ref={(el) => { refField.current.keterangan = el; }}
                        rows={3}
                        value={form.keterangan}
                        onChange={(e) => ubahForm('keterangan', e.target.value.slice(0, batas.max_keterangan + 20))}
                        aria-invalid={!!errForm.keterangan}
                        className={`${inputCls(errForm.keterangan)} resize-none`}
                    />
                    <p className={`mt-1 text-right text-xs tabular-nums ${sisaKet < 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}`}>
                        {sisaKet} karakter tersisa
                    </p>
                </Field>

                <Field label="No bukti (nota atau kwitansi)" error={tampilErr('no_bukti')}>
                    <input
                        ref={(el) => { refField.current.no_bukti = el; }}
                        type="text"
                        value={form.no_bukti}
                        maxLength={batas.max_no_bukti}
                        onChange={(e) => ubahForm('no_bukti', e.target.value)}
                        placeholder="Opsional"
                        aria-invalid={!!errForm.no_bukti}
                        className={inputCls(errForm.no_bukti)}
                    />
                </Field>

                {errSimpan && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm font-semibold text-rose-800" role="alert">
                        {errSimpan}
                    </div>
                )}

                <div className="flex gap-2 pt-1">
                    <button
                        type="submit"
                        disabled={menyimpan || !meta}
                        className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            siapSimpan ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-emerald-700/70 hover:bg-emerald-700'
                        }`}
                    >
                        {menyimpan ? 'Menyimpan...' : 'Simpan beban'}
                    </button>
                    <button
                        type="button"
                        onClick={kosongkanForm}
                        disabled={menyimpan}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >Kosongkan</button>
                </div>
            </form>
        );
    }

    // ======================================================================
    // RENDER
    // ======================================================================
    return (
        <div className="min-h-full bg-emarald-600 text-[#14231D]">
            <SubHeader bg = {'emerald'}/>
            {/* ===== KEPALA: periode + angka utama ===== */}
            <header className="bg-emerald-600 text-white px-3 py-3">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                       
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Beban operasional</h1>
                            <p className="mt-1 text-sm text-emerald-100/80 max-w-xl">
                                Catat pengeluaran harian toko. Data ini menjadi dasar laporan keuangan, jadi kesalahan input dibatalkan, bukan dihapus.
                            </p>
                        </div>
                        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
                            <div className="inline-flex rounded-xl bg-black/20 p-1 whitespace-nowrap" role="tablist" aria-label="Periode">
                                {PERIODE.map((p) => (
                                    <button
                                        key={p.key}
                                        role="tab"
                                        aria-selected={periode === p.key}
                                        onClick={() => pilihPeriode(p.key)}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                                            periode === p.key ? 'bg-white text-[#0B3D2E]' : 'text-emerald-50 hover:bg-white/10'
                                        }`}
                                    >{p.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {periode === 'kustom' && (
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-white mb-1">Dari tanggal</label>
                                <input type="date" value={rentang.dari} max={rentang.sampai || undefined}
                                    onChange={(e) => { setRentang((r) => ({ ...r, dari: e.target.value })); setPage(1); }}
                                    className="rounded-lg border-0 px-3 py-2 text-sm text-white font-bold focus:ring-2 " />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-emerald-100 mb-1">Sampai tanggal</label>
                                <input type="date" value={rentang.sampai} min={rentang.dari || undefined}
                                    onChange={(e) => { setRentang((r) => ({ ...r, sampai: e.target.value })); setPage(1); }}
                                    className="rounded-lg border-0 px-3 py-2 text-sm text-white font-bold focus:ring-2 " />
                            </div>
                            {errRentang && <p className="text-sm font-semibold text-amber-200">{errRentang}</p>}
                        </div>
                    )}

                    <div className="mt-6 grid gap-4 lg:grid-cols-12">
                        <div className="lg:col-span-5 rounded-2xl bg-emerald-600/25 ring-1 ring-emerald-300/30 p-5">
                            <p className="text-sm text-emerald-100">Total beban pada periode ini</p>
                            <p className="mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight">
                                Rp {rp(ringkasan?.total)}
                            </p>
                            <div className="mt-2 min-h-[1.5rem] text-sm">
                                {errRingkasan ? (
                                    <span className="text-amber-200">{errRingkasan}</span>
                                ) : pembanding && perubahan !== null && perubahan !== undefined ? (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${
                                        perubahan > 0 ? 'bg-rose-500/25 text-rose-100' : perubahan < 0 ? 'bg-emerald-400/25 text-emerald-100' : 'bg-white/10 text-white'
                                    }`}>
                                        {perubahan !== 0 && <Ikon nama={perubahan > 0 ? 'naik' : 'turun'} className="w-3.5 h-3.5" />}
                                        {perubahan === 0 ? 'Sama dengan' : `${Math.abs(perubahan)}% ${perubahan > 0 ? 'lebih tinggi dari' : 'lebih rendah dari'}`} periode sebelumnya
                                    </span>
                                ) : pembanding ? (
                                    <span className="text-emerald-100/70">Periode sebelumnya belum ada data.</span>
                                ) : null}
                            </div>
                        </div>

                        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                ['Jumlah catatan', rp(ringkasan?.jumlah_transaksi)],
                                ['Rata-rata per catatan', `Rp ${rp(ringkasan?.rata_rata)}`],
                                ['Terbesar', `Rp ${rp(ringkasan?.tertinggi)}`],
                                ['Tunai / transfer', `${rp(metodeTotal('TUNAI'))} / ${rp(metodeTotal('TRANSFER'))}`]
                            ].map(([label, nilai]) => (
                                <div key={label} className="rounded-xl bg-black/20 p-3">
                                    <p className="text-xs text-emerald-100/80">{label}</p>
                                    <p className="mt-1 text-sm sm:text-base font-bold tabular-nums break-words">{nilai}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== ISI ===== */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-6 min-w-0">
                    {/* --- Komposisi --- */}
                    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-900/10">
                        <div className="flex items-baseline justify-between gap-3">
                            <h2 className="text-lg font-bold">Komposisi beban</h2>
                            {kategori && (
                                <button onClick={() => ubahFilter(setKategori, '')} className="text-xs font-semibold text-emerald-800 underline">
                                    Tampilkan semua kategori
                                </button>
                            )}
                        </div>

                        {perKategori.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-500">Belum ada beban aktif pada periode dan filter ini.</p>
                        ) : (
                            <>
                                <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Proporsi beban per kategori">
                                    {perKategori.map((k) => (
                                        <button
                                            key={k.kategori_beban}
                                            type="button"
                                            title={`${k.kategori_label}: ${k.persen}%`}
                                            onClick={() => ubahFilter(setKategori, kategori === k.kategori_beban ? '' : k.kategori_beban)}
                                            style={{ width: `${Math.max(k.persen, 0.8)}%`, backgroundColor: warnaKategori(k.kategori_beban, kategoriList) }}
                                            className="h-full border-r border-white/70 last:border-r-0 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                        />
                                    ))}
                                </div>
                                <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                                    {tampilKategori.map((k) => (
                                        <li key={k.kategori_beban}>
                                            <button
                                                type="button"
                                                onClick={() => ubahFilter(setKategori, kategori === k.kategori_beban ? '' : k.kategori_beban)}
                                                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                                                    kategori === k.kategori_beban ? 'bg-emerald-50 ring-1 ring-emerald-300' : ''
                                                }`}
                                            >
                                                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: warnaKategori(k.kategori_beban, kategoriList) }} />
                                                <span className="min-w-0 flex-1 truncate font-medium">{k.kategori_label}</span>
                                                <span className="tabular-nums text-slate-500">{k.persen}%</span>
                                                <span className="w-28 text-right font-bold tabular-nums">Rp {rp(k.total)}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                {perKategori.length > 6 && (
                                    <button onClick={() => setSemuaKategori((v) => !v)} className="mt-2 text-xs font-semibold text-emerald-800 underline">
                                        {semuaKategori ? 'Ringkas daftar' : `Tampilkan ${perKategori.length - 6} kategori lainnya`}
                                    </button>
                                )}
                            </>
                        )}
                    </section>

                    {/* --- Riwayat --- */}
                    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-emerald-900/10">
                        <div className="p-5 pb-4 border-b border-slate-100">
                            <div className="flex items-baseline justify-between gap-3">
                                <h2 className="text-lg font-bold">Riwayat beban</h2>
                                {paging && <span className="text-sm text-slate-500 tabular-nums">{rp(paging.total)} catatan</span>}
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-12">
                                <div className="relative sm:col-span-2 xl:col-span-4">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Ikon nama="cari" /></span>
                                    <input
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        maxLength={100}
                                        placeholder="Cari keterangan, kategori, no bukti"
                                        aria-label="Cari beban"
                                        className={`${inputCls(false)} pl-9`}
                                    />
                                </div>
                                <select value={kategori} onChange={(e) => ubahFilter(setKategori, e.target.value)} aria-label="Filter kategori" className={`${inputCls(false)} xl:col-span-3`}>
                                    <option value="">Semua kategori</option>
                                    {kategoriList.map((k) => <option key={k.kode} value={k.kode}>{k.label}</option>)}
                                    {(meta?.kategori_lama || []).map((k) => <option key={`lama-${k}`} value={k}>{k} (data lama)</option>)}
                                </select>
                                <select value={metode} onChange={(e) => ubahFilter(setMetode, e.target.value)} aria-label="Filter metode bayar" className={`${inputCls(false)} xl:col-span-2`}>
                                    <option value="">Semua metode</option>
                                    <option value="TUNAI">Tunai</option>
                                    <option value="TRANSFER">Transfer</option>
                                </select>
                                <select value={status} onChange={(e) => ubahFilter(setStatus, e.target.value)} aria-label="Filter status" className={`${inputCls(false)} xl:col-span-3`}>
                                    <option value="AKTIF">Hanya yang aktif</option>
                                    <option value="BATAL">Hanya yang dibatalkan</option>
                                    <option value="SEMUA">Aktif dan dibatalkan</option>
                                </select>
                                <select value={sort} onChange={(e) => ubahFilter(setSort, e.target.value)} aria-label="Urutan" className={`${inputCls(false)} xl:col-span-3`}>
                                    <option value="terbaru">Terbaru dulu</option>
                                    <option value="terlama">Terlama dulu</option>
                                    <option value="terbesar">Nominal terbesar</option>
                                    <option value="terkecil">Nominal terkecil</option>
                                </select>
                            </div>
                            {adaFilterAktif && (
                                <button onClick={resetFilter} className="mt-2 text-xs font-semibold text-emerald-800 underline">Hapus semua filter</button>
                            )}
                        </div>

                        {errDaftar && (
                            <div className="m-5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">
                                {errDaftar}{' '}
                                <button onClick={() => segarkan(false)} className="font-bold underline">Coba lagi</button>
                            </div>
                        )}

                        {/* tabel (tablet ke atas) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-500 border-b border-slate-100">
                                        <th className="px-5 py-2.5 font-semibold w-36">Tanggal</th>
                                        <th className="px-3 py-2.5 font-semibold">Beban</th>
                                        <th className="px-3 py-2.5 font-semibold w-24">Metode</th>
                                        <th className="px-3 py-2.5 font-semibold text-right w-40">Jumlah</th>
                                        <th className="px-5 py-2.5 w-24" />
                                    </tr>
                                </thead>
                                <tbody className={loadingDaftar ? 'opacity-50' : ''}>
                                    {rows.map((r) => {
                                        const batal = r.status === 'BATAL';
                                        return (
                                            <tr key={r.id_operasional} className={`border-b border-slate-100 align-top ${batal ? 'bg-slate-50 text-slate-500' : 'hover:bg-emerald-50/40'}`}>
                                                <td className="px-5 py-3 relative">
                                                    <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: batal ? '#CBD5E1' : warnaKategori(r.kategori_beban, kategoriList) }} />
                                                    <p className="font-semibold">{tampilTanggal(r.tanggal)}</p>
                                                    <p className="text-xs text-slate-400 tabular-nums">{tampilJam(r.tanggal)} WIB</p>
                                                </td>
                                                <td className="px-3 py-3 min-w-0">
                                                    <p className="font-semibold">{r.kategori_label}</p>
                                                    {r.keterangan && <p className="text-slate-600 break-words">{r.keterangan}</p>}
                                                    {r.no_bukti && <p className="text-xs text-slate-400">Bukti {r.no_bukti}</p>}
                                                    {batal && (
                                                        <p className="mt-1 text-xs font-semibold text-rose-700">
                                                            Dibatalkan oleh {r.dibatalkan_oleh || '-'} pada {tampilTanggal(r.dibatalkan_pada)}. Alasan: {r.alasan_batal}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${r.metode_bayar === 'TRANSFER' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {r.metode_bayar === 'TRANSFER' ? 'Transfer' : 'Tunai'}
                                                    </span>
                                                </td>
                                                <td className={`px-3 py-3 text-right font-bold tabular-nums ${batal ? 'line-through' : ''}`}>Rp {rp(r.jumlah_biaya)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    {!batal && (
                                                        <button onClick={() => bukaBatal(r)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300">
                                                            <Ikon nama="batal" className="w-3.5 h-3.5" /> Batalkan
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* kartu (ponsel) */}
                        <ul className={`md:hidden divide-y divide-slate-100 ${loadingDaftar ? 'opacity-50' : ''}`}>
                            {rows.map((r) => {
                                const batal = r.status === 'BATAL';
                                return (
                                    <li key={r.id_operasional} className={`relative p-4 pl-5 ${batal ? 'bg-slate-50 text-slate-500' : ''}`}>
                                        <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: batal ? '#CBD5E1' : warnaKategori(r.kategori_beban, kategoriList) }} />
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold">{r.kategori_label}</p>
                                                <p className="text-xs text-slate-400 tabular-nums">{tampilTanggal(r.tanggal)}, {tampilJam(r.tanggal)} WIB</p>
                                            </div>
                                            <p className={`font-bold tabular-nums whitespace-nowrap ${batal ? 'line-through' : ''}`}>Rp {rp(r.jumlah_biaya)}</p>
                                        </div>
                                        {r.keterangan && <p className="mt-1 text-sm text-slate-600 break-words">{r.keterangan}</p>}
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-xs text-slate-400">
                                                {r.metode_bayar === 'TRANSFER' ? 'Transfer' : 'Tunai'}{r.no_bukti ? `, bukti ${r.no_bukti}` : ''}
                                            </span>
                                            {!batal && (
                                                <button onClick={() => bukaBatal(r)} className="text-xs font-semibold text-rose-700 underline">Batalkan</button>
                                            )}
                                        </div>
                                        {batal && (
                                            <p className="mt-1 text-xs font-semibold text-rose-700">Dibatalkan oleh {r.dibatalkan_oleh || '-'}. Alasan: {r.alasan_batal}</p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        {!loadingDaftar && !errDaftar && rows.length === 0 && (
                            <div className="px-5 py-12 text-center">
                                <p className="font-semibold">
                                    {adaFilterAktif ? 'Tidak ada beban yang cocok dengan filter.' : 'Belum ada beban pada periode ini.'}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {adaFilterAktif ? 'Ubah atau hapus filter untuk melihat data lain.' : 'Catat beban pertama lewat formulir pencatatan.'}
                                </p>
                                {adaFilterAktif && (
                                    <button onClick={resetFilter} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">Hapus filter</button>
                                )}
                            </div>
                        )}

                        {/* pagination */}
                        {paging && paging.total > 0 && (
                            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <span className="tabular-nums">Menampilkan {rp(paging.dari)} sampai {rp(paging.sampai)} dari {rp(paging.total)}</span>
                                    <select
                                        value={limit}
                                        onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                        aria-label="Jumlah baris per halaman"
                                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                                    >
                                        {[10, 20, 50].map((n) => <option key={n} value={n}>{n} per halaman</option>)}
                                    </select>
                                </div>
                                {paging.total_page > 1 && (
                                    <nav className="flex flex-wrap items-center gap-1" aria-label="Halaman">
                                        <button disabled={page <= 1 || loadingDaftar} onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Sebelumnya</button>
                                        {nomorHalaman(paging.page, paging.total_page).map((n, i) =>
                                            n === '...' ? (
                                                <span key={`g${i}`} className="px-1 text-slate-400">...</span>
                                            ) : (
                                                <button key={n} disabled={loadingDaftar} onClick={() => setPage(n)} aria-current={n === paging.page ? 'page' : undefined}
                                                    className={`min-w-[2.25rem] rounded-md px-2 py-1.5 text-sm font-semibold tabular-nums ${
                                                        n === paging.page ? 'bg-emerald-700 text-white' : 'border border-slate-300 bg-white hover:bg-emerald-50'
                                                    }`}>{n}</button>
                                            )
                                        )}
                                        <button disabled={page >= paging.total_page || loadingDaftar} onClick={() => setPage((p) => p + 1)}
                                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Berikutnya</button>
                                    </nav>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* --- Kolom form (desktop) --- */}
                {isDesktop && (
                    <aside className="lg:col-span-4">
                        <div className="lg:sticky lg:top-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-900/10">
                            <h2 className="text-lg font-bold">Catat beban baru</h2>
                            <p className="mb-4 mt-0.5 text-sm text-slate-500">Isi sesuai nota. Nominal tidak bisa diubah setelah disimpan.</p>
                            {renderForm()}
                        </div>
                    </aside>
                )}
            </div>

            {/* --- Tombol & lembar form (ponsel/tablet) --- */}
            {isDesktop === false && (
                <>
                    <button
                        onClick={() => setFormTerbuka(true)}
                        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2"
                    >
                        <Ikon nama="tambah" /> Catat beban
                    </button>
                    {formTerbuka && (
                        <Modal judul="Catat beban baru" onClose={() => setFormTerbuka(false)} terkunci={menyimpan}>
                            <div className="p-5">
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold">Catat beban baru</h2>
                                        <p className="text-sm text-slate-500">Nominal tidak bisa diubah setelah disimpan.</p>
                                    </div>
                                    <button onClick={() => setFormTerbuka(false)} disabled={menyimpan} aria-label="Tutup" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
                                        <Ikon nama="tutup" className="w-5 h-5" />
                                    </button>
                                </div>
                                {renderForm()}
                            </div>
                        </Modal>
                    )}
                </>
            )}

            {/* --- Batalkan --- */}
            {target && (
                <Modal judul="Batalkan beban" onClose={() => setTarget(null)} terkunci={membatalkan}>
                    <div className="p-5">
                        <h2 className="text-lg font-bold">Batalkan beban ini?</h2>
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                            <p className="font-semibold">{target.kategori_label}</p>
                            <p className="text-slate-600">{tampilTanggal(target.tanggal)}, Rp {rp(target.jumlah_biaya)}</p>
                            {target.keterangan && <p className="text-slate-500 break-words">{target.keterangan}</p>}
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                            Catatan tidak dihapus. Statusnya menjadi dibatalkan dan tidak dihitung di laporan. Jika nominalnya salah, catat ulang dengan angka yang benar.
                        </p>
                        <div className="mt-4">
                            <Field label="Alasan pembatalan" error={errAlasan}>
                                <textarea
                                    rows={3}
                                    value={alasan}
                                    onChange={(e) => { setAlasan(e.target.value.slice(0, batas.max_alasan_batal)); setErrAlasan(''); }}
                                    placeholder="Contoh: salah input nominal, seharusnya 150.000"
                                    autoFocus
                                    className={`${inputCls(errAlasan)} resize-none`}
                                />
                            </Field>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setTarget(null)} disabled={membatalkan} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Kembali</button>
                            <button onClick={konfirmasiBatal} disabled={membatalkan} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">
                                {membatalkan ? 'Membatalkan...' : 'Batalkan beban'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* --- Pemberitahuan --- */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
                        toast.jenis === 'info' ? 'bg-sky-700 text-white' : 'bg-emerald-800 text-white'
                    }`}
                >
                    {toast.pesan}
                </div>
            )}
        </div>
    );
}



export default function OperasionalTokoPage(){

    return(
        <CEK_HAK_AKSES>
            <OperasionalTokoContent/>
        </CEK_HAK_AKSES>
    )
}
