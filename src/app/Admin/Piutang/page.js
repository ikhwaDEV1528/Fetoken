'use client';

import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";
import { Konteks } from "@/GlobalNilai/Global";
import { SubHeader } from "@/UI/Header/subHeader";
import axios from "axios";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// ============================================================================
// HALAMAN PIUTANG PELANGGAN
//   - Daftar pelanggan yang berhutang + ringkasan + pencarian + urutan + paging
//   - Klik pelanggan -> panel detail: faktur belum lunas, bayar PER FAKTUR
//   - Riwayat pembayaran pelanggan
// FE tidak menghitung nominal final. Backend yang memvalidasi & menyimpan.
// Endpoint: /api-be/SERVER_PIUTANG/{DAFTAR_PIUTANG_PELANGGAN, DETAIL_PIUTANG_PELANGGAN,
//                                     BAYAR_PIUTANG, RIWAYAT_PEMBAYARAN}
// ============================================================================
const API = '/api-be/SERVER_PIUTANG';
const num = (v) => Number(v) || 0;
const rp = (v) => num(v).toLocaleString('id-ID');
const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '').slice(0, 12);
const pesanError = (err, fallback) => err?.response?.data?.message || fallback;

// Status jatuh tempo. `selisih` = hari ini - tanggal jatuh tempo
// (positif = sudah telat, 0 = hari ini, negatif = belum jatuh tempo).
const AMBANG_SEGERA = 7; // jatuh tempo <= 7 hari lagi = kuning

function BadgeTempo({ selisih }) {
    if (selisih === null || selisih === undefined) return <span className="text-slate-400">-</span>;
    let teks;
    let cls;
    if (selisih > 0) {
        teks = `Telat ${selisih} hari`;
        cls = 'bg-red-100 text-red-700 border-red-300';
    } else if (selisih === 0) {
        teks = 'Jatuh tempo hari ini';
        cls = 'bg-amber-100 text-amber-800 border-amber-300';
    } else {
        teks = `${-selisih} hari lagi`;
        cls = -selisih <= AMBANG_SEGERA
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-emerald-100 text-emerald-700 border-emerald-300';
    }
    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full border ${cls}`}>
            {teks}
        </span>
    );
}

// Bagi uang diterima ke faktur TERLAMA dulu (urutan dari BE sudah terlama -> terbaru).
function alokasiTerlamaDulu(uang, fakturs) {
    let sisaUang = uang;
    const hasil = {};
    for (const f of fakturs) {
        if (sisaUang <= 0) break;
        const bayar = Math.min(sisaUang, num(f.sisa_piutang));
        if (bayar > 0) hasil[f.no_faktur] = String(bayar);
        sisaUang -= bayar;
    }
    return hasil;
}

export default function PiutangPelanggan() {
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

    // debounce pencarian
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
            const ress = await axios.get(`${API}/DAFTAR_PIUTANG_PELANGGAN`, {
                params: { q: qAktif, sort, page, limit: 20, _t: Date.now() },
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            if (id !== reqDaftar.current) return; // hasil basi, abaikan
            setDaftar(ress.data.data);
        } catch (err) {
            alert(err.response.data.message)
            if (id !== reqDaftar.current) return;
            setErrDaftar(pesanError(err, 'Gagal memuat daftar piutang.'));
        } finally {
            if (id === reqDaftar.current) setLoadingDaftar(false);
            setLoading(prev => ({
            ...prev,
            loadingRequest:false
        }))
        }
    }, [qAktif, sort, page]);

    useEffect(() => { muatDaftar(); }, [muatDaftar]);

    // ---------------- detail / bayar ----------------
    const [terpilih, setTerpilih] = useState(null); // { kode_pelanggan, nama_pelanggan }
    const [tab, setTab] = useState('faktur');
    const [detail, setDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [errDetail, setErrDetail] = useState('');
    const [bayar, setBayar] = useState({});          // { no_faktur: "digit string" }
    const [uangDiterima, setUangDiterima] = useState('');
    const [metode, setMetode] = useState('TUNAI');
    const [catatan, setCatatan] = useState('');
    const [saving, setSaving] = useState(false);
    const [hasil, setHasil] = useState(null);
    const [errBayar, setErrBayar] = useState('');
    const [riwayat, setRiwayat] = useState(null);
    const [loadingRiwayat, setLoadingRiwayat] = useState(false);

    const muatDetail = useCallback(async (kode) => {
        setLoadingDetail(true);
        setErrDetail('');
        try {
            const ress = await axios.get(`${API}/DETAIL_PIUTANG_PELANGGAN`, {
                params: { kode_pelanggan: kode, _t: Date.now() },
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            setDetail(ress.data.data);
        } catch (err) {
            setErrDetail(pesanError(err, 'Gagal memuat detail piutang.'));
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    const muatRiwayat = useCallback(async (kode) => {
        setLoadingRiwayat(true);
        try {
            const ress = await axios.get(`${API}/RIWAYAT_PEMBAYARAN`, {
                params: { kode_pelanggan: kode, limit: 20, _t: Date.now() },
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            setRiwayat(ress.data.data.riwayat);
        } catch (err) {
            setRiwayat([]);
        } finally {
            setLoadingRiwayat(false);
        }
    }, []);

    function bukaPelanggan(p) {
        setTerpilih({ kode_pelanggan: p.kode_pelanggan, nama_pelanggan: p.nama_pelanggan });
        setTab('faktur');
        setDetail(null);
        setRiwayat(null);
        setBayar({});
        setUangDiterima('');
        setMetode('TUNAI');
        setCatatan('');
        setHasil(null);
        setErrBayar('');
        muatDetail(p.kode_pelanggan);
    }

    function tutupPanel() {
        if (saving) return;
        setTerpilih(null);
        setDetail(null);
    }

    function pindahTab(t) {
        setTab(t);
        if (t === 'riwayat' && terpilih) muatRiwayat(terpilih.kode_pelanggan);
    }

    const fakturs = detail?.faktur || [];

    const totalBayar = useMemo(
        () => fakturs.reduce((a, f) => a + num(bayar[f.no_faktur]), 0),
        [fakturs, bayar]
    );

    const salahInput = useMemo(() => {
        for (const f of fakturs) {
            if (num(bayar[f.no_faktur]) > num(f.sisa_piutang)) {
                return `Bayar faktur ${f.no_faktur} melebihi sisa (Rp ${rp(f.sisa_piutang)}).`;
            }
        }
        return '';
    }, [fakturs, bayar]);

    const selisihUang = uangDiterima === '' ? null : num(uangDiterima) - totalBayar;

    function ubahBayar(noFaktur, nilai) {
        setBayar((prev) => ({ ...prev, [noFaktur]: digitsOnly(nilai) }));
    }

    function lunasi(f) {
        setBayar((prev) => ({ ...prev, [f.no_faktur]: String(num(f.sisa_piutang)) }));
    }

    function bagiOtomatis() {
        const uang = num(uangDiterima);
        if (uang <= 0) return alert('Isi dulu jumlah uang yang diterima.');
        const alok = alokasiTerlamaDulu(uang, fakturs);
        setBayar(alok);
        const terpakai = Object.values(alok).reduce((a, v) => a + num(v), 0);
        if (terpakai < uang) {
            alert(`Uang diterima lebih besar dari total hutang. Hanya Rp ${rp(terpakai)} yang bisa dialokasikan.`);
        }
    }

    async function simpanBayar() {
        if (saving) return;
        setErrBayar('');
        const items = fakturs
            .filter((f) => num(bayar[f.no_faktur]) > 0)
            .map((f) => ({ no_faktur: f.no_faktur, jumlah: num(bayar[f.no_faktur]) }));

        if (items.length === 0) return setErrBayar('Isi jumlah bayar minimal di 1 faktur.');
        if (salahInput) return setErrBayar(salahInput);

        const ok = window.confirm(
            `Catat pembayaran ${metode} Rp ${rp(totalBayar)} dari ${terpilih.nama_pelanggan} ` +
            `untuk ${items.length} faktur?\n\nPembayaran tidak bisa diubah setelah disimpan.`
        );
        if (!ok) return;

        setSaving(true);
        try {
            const ress = await axios.post(`${API}/BAYAR_PIUTANG`, {
                kode_pelanggan: terpilih.kode_pelanggan,
                metode,
                catatan: catatan.trim(),
                items
            });
            setHasil(ress.data.data);
            setBayar({});
            setUangDiterima('');
            setCatatan('');
            setRiwayat(null);
            await Promise.all([muatDetail(terpilih.kode_pelanggan), muatDaftar()]);
        } catch (err) {
            setErrBayar(pesanError(err, 'Gagal menyimpan pembayaran.'));
            // data bisa sudah berubah (mis. retur masuk) -> muat ulang supaya angka akurat
            muatDetail(terpilih.kode_pelanggan);
        } finally {
            setSaving(false);
        }
    }

    const ringkasan = daftar?.ringkasan;
    const paging = daftar?.paging;

    // ======================================================================
    // RENDER
    // ======================================================================
    return (
        <CEK_HAK_AKSES>
        <div className="p-0 md:p-6 space-y-5">
            <SubHeader />
            <div className="p-4 space-y-5">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Piutang Pelanggan</h1>
                    <p className="text-sm text-slate-500">Daftar pelanggan yang masih punya hutang. Klik pelanggan untuk melihat faktur dan mencatat pembayaran.</p>
                </div>

                {/* RINGKASAN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50">
                        <p className="text-xs font-bold text-red-700 uppercase">Total Piutang</p>
                        <p className="text-2xl font-extrabold text-red-800">Rp {rp(ringkasan?.total_piutang)}</p>
                    </div>
                    <div className="p-4 rounded-xl border-2 border-slate-200 bg-white">
                        <p className="text-xs font-bold text-slate-500 uppercase">Pelanggan Berhutang</p>
                        <p className="text-2xl font-extrabold text-slate-900">{rp(ringkasan?.jumlah_pelanggan)}</p>
                    </div>
                    <div className="p-4 rounded-xl border-2 border-slate-200 bg-white">
                        <p className="text-xs font-bold text-slate-500 uppercase">Faktur Belum Lunas</p>
                        <p className="text-2xl font-extrabold text-slate-900">{rp(ringkasan?.jumlah_faktur)}</p>
                    </div>
                </div>

                {/* PENCARIAN */}
                <div className="flex flex-col md:flex-row gap-3">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        type="text"
                        maxLength={100}
                        placeholder="Cari nama pelanggan / kode pelanggan / no faktur..."
                        className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 bg-white"
                    />
                    <select
                        value={sort}
                        onChange={(e) => { setSort(e.target.value); setPage(1); }}
                        className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                        <option value="total_desc">Hutang terbesar</option>
                        <option value="total_asc">Hutang terkecil</option>
                        <option value="terlama">Jatuh tempo terdekat / telat</option>
                        <option value="nama">Nama A-Z</option>
                    </select>
                </div>

                {errDaftar && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-sm text-red-700 font-semibold">{errDaftar}</div>
                )}

                {/* TABEL DAFTAR */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700">
                            <tr>
                                <th className="text-left px-4 py-3 font-bold">Pelanggan</th>
                                <th className="text-center px-4 py-3 font-bold">Faktur</th>
                                <th className="text-right px-4 py-3 font-bold">Total Hutang</th>
                                <th className="text-center px-4 py-3 font-bold">Jatuh Tempo</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className={loadingDaftar ? 'opacity-50' : ''}>
                            {(daftar?.pelanggan || []).map((p) => (
                                <tr
                                    key={p.kode_pelanggan}
                                    onClick={() => bukaPelanggan(p)}
                                    className="border-t border-slate-100 hover:bg-sky-50 cursor-pointer"
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-slate-900">{p.nama_pelanggan}</p>
                                        <p className="text-xs text-slate-500 font-mono">{p.kode_pelanggan}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold">{p.jumlah_faktur}</td>
                                    <td className="px-4 py-3 text-right font-extrabold text-red-700">Rp {rp(p.total_piutang)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <p className="text-xs text-slate-500 mb-0.5">{p.jatuh_tempo_terawal || '-'}</p>
                                        <BadgeTempo selisih={p.terlambat_hari} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-xs font-bold text-sky-700 underline">Lihat / Bayar</span>
                                    </td>
                                </tr>
                            ))}
                            {!loadingDaftar && (daftar?.pelanggan || []).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                        {qAktif ? 'Tidak ada pelanggan berhutang yang cocok dengan pencarian.' : 'Tidak ada piutang. Semua faktur lunas.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGING */}
                {paging && paging.total_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Halaman {paging.page} dari {paging.total_page} ({paging.total} pelanggan)</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page <= 1 || loadingDaftar}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-3 py-1.5 border rounded-lg bg-white font-semibold disabled:opacity-40"
                            >Sebelumnya</button>
                            <button
                                disabled={page >= paging.total_page || loadingDaftar}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1.5 border rounded-lg bg-white font-semibold disabled:opacity-40"
                            >Berikutnya</button>
                        </div>
                    </div>
                )}

                {/* PANEL DETAIL */}
                {terpilih && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={tutupPanel}>
                        <div
                            className="w-full max-w-3xl h-full bg-white shadow-2xl overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-start justify-between z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{terpilih.nama_pelanggan}</h2>
                                    <p className="text-xs text-slate-500 font-mono">{terpilih.kode_pelanggan}</p>
                                    {detail && (
                                        <p className="mt-1 text-sm">
                                            Total hutang: <strong className="text-red-700">Rp {rp(detail.ringkasan.total_piutang)}</strong>
                                            {' '}({detail.ringkasan.jumlah_faktur} faktur)
                                        </p>
                                    )}
                                </div>
                                <button onClick={tutupPanel} className="text-slate-500 hover:text-slate-900 text-2xl leading-none px-2">×</button>
                            </div>

                            <div className="px-4 pt-3 flex gap-2 border-b border-slate-200">
                                {[['faktur', 'Faktur Belum Lunas'], ['riwayat', 'Riwayat Pembayaran']].map(([k, label]) => (
                                    <button
                                        key={k}
                                        onClick={() => pindahTab(k)}
                                        className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 ${tab === k ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500'}`}
                                    >{label}</button>
                                ))}
                            </div>

                            <div className="p-4 space-y-4">
                                {errDetail && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-sm text-red-700 font-semibold">{errDetail}</div>
                                )}

                                {hasil && tab === 'faktur' && (
                                    <div className="p-3 rounded-lg bg-emerald-50 border-2 border-emerald-300 text-sm">
                                        <p className="font-bold text-emerald-800">
                                            Pembayaran {hasil.no_bayar} berhasil dicatat: Rp {rp(hasil.total_bayar)} ({hasil.metode})
                                        </p>
                                        <ul className="mt-1 text-emerald-900 list-disc pl-5">
                                            {hasil.rincian.map((r) => (
                                                <li key={r.no_faktur}>
                                                    <span className="font-mono">{r.no_faktur}</span>: Rp {rp(r.jumlah)} {' → '}
                                                    {r.lunas ? <strong>LUNAS</strong> : <>sisa Rp {rp(r.sisa_sesudah)}</>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {tab === 'faktur' && (
                                    <>
                                        {loadingDetail && !detail && <p className="text-sm text-slate-500">Memuat...</p>}

                                        {detail && fakturs.length === 0 && (
                                            <p className="py-8 text-center text-slate-500">Pelanggan ini tidak punya faktur yang belum lunas.</p>
                                        )}

                                        {fakturs.length > 0 && (
                                            <>
                                                {/* bantu: bagi otomatis */}
                                                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-end">
                                                    <div className="flex-1">
                                                        <label className="text-xs font-bold text-slate-700 block mb-1">Uang diterima (opsional)</label>
                                                        <input
                                                            inputMode="numeric"
                                                            value={uangDiterima === '' ? '' : rp(uangDiterima)}
                                                            onChange={(e) => setUangDiterima(digitsOnly(e.target.value))}
                                                            placeholder="Contoh: 50.000"
                                                            className="w-full p-2.5 border-2 border-slate-300 rounded-lg text-sm font-bold"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={bagiOtomatis}
                                                        className="px-4 py-2.5 text-sm font-bold rounded-lg bg-emerald-600 text-white hover:bg-sky-700"
                                                    >Bagi ke faktur terlama</button>
                                                </div>

                                                {/* daftar faktur */}
                                                <div className="space-y-3">
                                                    {fakturs.map((f) => {
                                                        const nilai = bayar[f.no_faktur] ?? '';
                                                        const lebih = num(nilai) > num(f.sisa_piutang);
                                                        return (
                                                            <div key={f.no_faktur} className="p-4 border-2 border-slate-200 rounded-xl space-y-3">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div>
                                                                        <p className="font-mono font-bold text-slate-900 text-sm">{f.no_faktur}</p>
                                                                        <p className="text-xs text-slate-500">
                                                                            Faktur {f.tgl_faktur || '-'} • Jatuh tempo {f.jatuh_tempo || '-'}{f.sales ? ` • Sales: ${f.sales}` : ''}
                                                                        </p>
                                                                    </div>
                                                                    <BadgeTempo selisih={f.terlambat_hari} />
                                                                </div>

                                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                                                    <div className="p-2 rounded bg-slate-50"><p className="text-slate-500">Tagihan</p><p className="font-bold">Rp {rp(f.total_tagihan)}</p></div>
                                                                    <div className="p-2 rounded bg-slate-50"><p className="text-slate-500">Dibayar di awal</p><p className="font-bold">Rp {rp(f.dibayar_di_awal)}</p></div>
                                                                    <div className="p-2 rounded bg-slate-50"><p className="text-slate-500">Potong retur</p><p className="font-bold">Rp {rp(f.potongan_retur)}</p></div>
                                                                    <div className="p-2 rounded bg-slate-50"><p className="text-slate-500">Sudah dicicil</p><p className="font-bold">Rp {rp(f.pembayaran_piutang)}</p></div>
                                                                    <div className="p-2 rounded bg-red-50 border border-red-200"><p className="text-red-700">SISA HUTANG</p><p className="font-extrabold text-red-800">Rp {rp(f.sisa_piutang)}</p></div>
                                                                </div>

                                                                <div className="flex items-end gap-2">
                                                                    <div className="flex-1">
                                                                        <label className="text-xs font-bold text-slate-700 block mb-1">Bayar faktur ini (Rp)</label>
                                                                        <input
                                                                            inputMode="numeric"
                                                                            value={nilai === '' ? '' : rp(nilai)}
                                                                            onChange={(e) => ubahBayar(f.no_faktur, e.target.value)}
                                                                            placeholder="0"
                                                                            className={`w-full p-2.5 border-2 rounded-lg text-sm font-bold ${lebih ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => lunasi(f)}
                                                                        className="px-3 py-2.5 text-xs font-bold rounded-lg border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                                                                    >Lunasi</button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => ubahBayar(f.no_faktur, '')}
                                                                        className="px-3 py-2.5 text-xs font-bold rounded-lg border-2 border-slate-300 text-slate-600 hover:bg-slate-50"
                                                                    >Kosongkan</button>
                                                                </div>
                                                                {lebih && <p className="text-xs font-bold text-red-600">Melebihi sisa hutang faktur ini.</p>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* metode & catatan */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 block mb-1">Metode</label>
                                                        <select
                                                            value={metode}
                                                            onChange={(e) => setMetode(e.target.value)}
                                                            className="w-full p-2.5 border-2 border-slate-300 rounded-lg text-sm font-semibold bg-white"
                                                        >
                                                            <option value="TUNAI">Tunai</option>
                                                            <option value="TRANSFER">Transfer</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 block mb-1">Catatan (opsional)</label>
                                                        <input
                                                            value={catatan}
                                                            maxLength={500}
                                                            onChange={(e) => setCatatan(e.target.value)}
                                                            placeholder="Contoh: dibayar oleh istri"
                                                            className="w-full p-2.5 border-2 border-slate-300 rounded-lg text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* total & simpan */}
                                                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 space-y-1">
                                                    <div className="flex justify-between font-extrabold text-emerald-900 text-lg">
                                                        <span>Total dibayar sekarang</span>
                                                        <span>Rp {rp(totalBayar)}</span>
                                                    </div>
                                                    {selisihUang !== null && selisihUang !== 0 && (
                                                        <p className={`text-xs font-bold ${selisihUang > 0 ? 'text-amber-700' : 'text-red-600'}`}>
                                                            {selisihUang > 0
                                                                ? `Uang diterima lebih Rp ${rp(selisihUang)} dari yang dialokasikan (kembalikan / alokasikan).`
                                                                : `Uang diterima kurang Rp ${rp(-selisihUang)} dari total yang diisi.`}
                                                        </p>
                                                    )}
                                                    {errBayar && <p className="text-sm font-bold text-red-600">{errBayar}</p>}
                                                    <button
                                                        type="button"
                                                        onClick={simpanBayar}
                                                        disabled={saving || totalBayar <= 0 || !!salahInput}
                                                        className="mt-2 w-full py-3 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        {saving ? 'Menyimpan...' : 'Simpan Pembayaran'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {tab === 'riwayat' && (
                                    <div className="space-y-3">
                                        {loadingRiwayat && <p className="text-sm text-slate-500">Memuat...</p>}
                                        {!loadingRiwayat && riwayat && riwayat.length === 0 && (
                                            <p className="py-8 text-center text-slate-500">Belum ada riwayat pembayaran.</p>
                                        )}

                                        {/**START */}
                                        {(riwayat || []).map((r, idx) => {
                                            const isRetur = r.jenis === 'RETUR';

                                            // Tema warna per tipe (UI saja, logika tetap)
                                            const theme = isRetur
                                                ? r.is_retur_silang
                                                    ? { accent: 'border-l-amber-500', iconBg: 'bg-amber-100', badge: 'bg-amber-100 text-amber-900 ring-amber-300', nominalBox: 'bg-amber-50 ring-amber-200', nominalText: 'text-amber-700', icon: '⚠️' }
                                                    : { accent: 'border-l-orange-500', iconBg: 'bg-orange-100', badge: 'bg-orange-100 text-orange-800 ring-orange-300', nominalBox: 'bg-orange-50 ring-orange-200', nominalText: 'text-amber-700', icon: '🔄' }
                                                : { accent: 'border-l-emerald-500', iconBg: 'bg-emerald-100', badge: 'bg-emerald-100 text-emerald-800 ring-emerald-300', nominalBox: 'bg-emerald-50 ring-emerald-200', nominalText: 'text-emerald-700', icon: '💳' };

                                            return (
                                                <article
                                                    key={r.no_bayar || r?.no_retur || idx}
                                                    className={`w-full overflow-hidden rounded-2xl border border-slate-200 border-l-[6px] ${theme.accent} bg-white shadow-sm transition active:scale-[0.99] sm:hover:shadow-md`}
                                                >
                                                    <div className="space-y-4 p-4 sm:p-5">

                                                        {/* 1. HEADER: ikon + status + nomor + tanggal */}
                                                        <header className="flex items-start gap-3">

                                                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${theme.iconBg}`}>
                                                                {theme.icon}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                    {isRetur ? (
                                                                        r.is_retur_silang ? (
                                                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ring-1 ${theme.badge}`}>
                                                                                RETUR LINTAS FAKTUR
                                                                            </span>
                                                                        ) : (
                                                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ring-1 ${theme.badge}`}>
                                                                                RETUR FAKTUR
                                                                            </span>
                                                                        )
                                                                    ) : (
                                                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ring-1 ${theme.badge}`}>
                                                                            PEMBAYARAN PIUTANG
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <p className="mt-1.5 break-all font-mono text-sm font-bold text-slate-900 sm:text-base">
                                                                    {r.no_bayar || r.no_retur}
                                                                </p>

                                                                <p className="mt-0.5 text-sm font-medium text-slate-500">
                                                                    {r.tanggal_bayar}
                                                                </p>
                                                            </div>
                                                        </header>

                                                        {/* 2. NOMINAL (besar, jadi fokus utama) */}
                                                        {/* 2. NOMINAL (besar + breakdown PPN transparan) */}
                                                        <div className={`rounded-2xl px-4 py-3.5 ring-1 ${theme.nominalBox}`}>
                                                            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                                Total Potong / Bayar
                                                            </p>
                                                            <p className={`mt-0.5 text-2xl font-extrabold leading-tight sm:text-3xl ${theme.nominalText}`}>
                                                                Rp {rp(r.total_bayar)}
                                                            </p>

                                                            {/* RINCIAN PPN KHUSUS KARTU RETUR */}
                                                            {isRetur && (
                                                                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-600">
                                                                    <span>Harga Retur (DPP): <strong className="text-slate-900">Rp {rp(r.dpp_total || 0)}</strong></span>
                                                                    <span>•</span>
                                                                    <span>PPN ({r.ppn_persen || 0}%): <strong className="text-slate-900">Rp {rp(r.ppn_nominal || 0)}</strong></span>
                                                                </div>
                                                            )}
                                                        </div>



                                                        {/* 3. METODE & OLEH (chip) */}
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm text-slate-600">
                                                                Metode:
                                                                <strong className="text-slate-900">{r.metode || '-'}</strong>
                                                            </span>
                                                            {r.dibuat_oleh && (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm text-slate-600">
                                                                    Oleh:
                                                                    <strong className="text-slate-900">{r.dibuat_oleh}</strong>
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* PENJELASAN KETERANGAN DARI ADMIN */}
                                                        {isRetur && (
                                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                                                <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
                                                                    {r.is_retur_silang ? (
                                                                        <span>
                                                                            Piutang faktur saat ini: <strong className="break-all font-mono text-slate-900">{r.no_faktur_asli}</strong> dipotong dari retur barang faktur <strong className="break-all font-mono text-amber-800">{r.no_faktur_lain}</strong>.
                                                                        </span>
                                                                    ) : (
                                                                        <span>
                                                                            Pemotongan piutang murni dari retur barang faktur ini sendiri (<strong className="break-all font-mono text-slate-900">{r.no_faktur_asli}</strong>).
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* 4. CATATAN */}
                                                        {r.catatan && (
                                                            <div className="flex gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3.5">
                                                                <span className="text-lg leading-none">💬</span>
                                                                <p className="text-sm italic leading-relaxed text-slate-700 sm:text-base">
                                                                    "{r.catatan}"
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* 5. RINCIAN ALOKASI FAKTUR */}
                                                        {/* 5. RINCIAN ALOKASI FAKTUR */}
                                                        <section>
                                                            <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                                                                {isRetur ? 'Faktur Yang Dipotong Piutangnya' : 'Rincian Faktur Yang Dibayar'}
                                                            </h4>

                                                            <ul className="space-y-2">
                                                                {/* LOGIKA PERBAIKAN: Jika rincian kosong, paksa buat 1 item dari data root */}
                                                                {((r.rincian && r.rincian.length > 0)
                                                                    ? r.rincian
                                                                    : [{ no_faktur: r.no_faktur_asli || r.no_faktur_lain || r.no_faktur, jumlah: r.total_bayar }]
                                                                ).map((d, dIdx) => (
                                                                    <li
                                                                        key={dIdx}
                                                                        className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                                                                    >
                                                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                                                            <span className="break-all font-mono text-sm font-bold text-sky-700 sm:text-base">
                                                                                • Faktur: {d.no_faktur || r.no_faktur_asli || r.no_faktur_lain || '-'}
                                                                            </span>
                                                                            <span className="text-base font-extrabold text-slate-800 sm:shrink-0">
                                                                                Rp {rp(d.jumlah || r.total_bayar)}
                                                                            </span>
                                                                        </div>

                                                                        {!isRetur && d.sisa_sebelum !== null && d.sisa_sebelum !== undefined && (
                                                                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-white px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200">
                                                                                <span>Sisa</span>
                                                                                <span className="font-semibold text-slate-700">{rp(d.sisa_sebelum)}</span>
                                                                                <span className="text-slate-400">→</span>
                                                                                <span className="font-semibold text-slate-900">{rp(d.sisa_sesudah)}</span>
                                                                            </div>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </section>

                                                    </div>
                                                </article>
                                            );
                                        })}


                                        {/**EMD */}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </CEK_HAK_AKSES>
    );
}
