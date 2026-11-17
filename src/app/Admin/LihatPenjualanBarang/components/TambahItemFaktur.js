'use client';
import { useContext, useState } from 'react';
import axios from 'axios';
import { Konteks } from '@/GlobalNilai/Global';

const rp = (n) => (Number(n) || 0).toLocaleString('id-ID');
const satuanAktif = (row) => row.list_satuan.find((s) => s.nama_satuan === row.satuan);
const hargaRow = (row) => Number(satuanAktif(row)?.harga_jual) || 0;
const rasioRow = (row) => Number(satuanAktif(row)?.rasio_ke_pcs) || 1;
const maxQty = (row, satuan = satuanAktif(row)) =>
    Math.floor((Number(row.stok_pcs) || 0) / (Number(satuan?.rasio_ke_pcs) || 1));
const subtotalRow = (row) => (Number(row.jumlah) || 0) * hargaRow(row);

export function TambahItemFaktur({ open, setOpen, no_faktur, onSaved }) {
    const [cari, setCari] = useState('');
    const [hasil, setHasil] = useState([]);
    const [loadingCari, setLoadingCari] = useState(false);
    const [list, setList] = useState([]);
    const [saving, setSaving] = useState(false);
    const { setLoading } = useContext(Konteks)

    const tutup = () => { setOpen(false); setCari(''); setHasil([]); setList([]); };
    const update = (idx, patch) => setList((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

    async function cariBarang() {
        if (!cari.trim()) return alert('Ketik nama/kode barang!');
        try {
            setLoadingCari(true);
            const res = await axios.get('/api-be/SERVER_JUAL_BARANG/JUAL_BARANG', { params: { input: cari.trim() } });
            const data = Array.isArray(res.data?.Search) ? res.data.Search : [];
            if (data.length === 0) alert('Barang tidak ditemukan');
            setHasil(data);
        } catch (err) {
            alert(err?.response?.data?.message || 'Terjadi kesalahan server, coba lagi!');
        } finally {
            setLoadingCari(false);
        }
    }

    function pilihBarang(b) {
        const stok = Number(b.stok_pcs) || 0;
        if (stok <= 0) return alert('Stok barang ini habis!');
        if (list.some((r) => r.kode_barang === b.kode_barang)) return alert('Barang sudah ada di list!');

        const sats = b.list_satuan || [];
        const awal = sats.find((s) => stok >= (Number(s.rasio_ke_pcs) || 1)) || sats[sats.length - 1];
        if (!awal) return alert('Barang ini belum punya satuan!');

        setList((p) => [...p, {
            kode_barang: b.kode_barang, nama_barang: b.nama_barang,
            stok_pcs: stok, list_satuan: sats,
            satuan: awal.nama_satuan, jumlah: 1, diskon: 0,
        }]);
        setHasil([]); setCari('');
    }

    function ubahSatuan(idx, nama) {
        const row = list[idx];
        const sat = row.list_satuan.find((s) => s.nama_satuan === nama);
        if (!sat) return;
        const mx = maxQty(row, sat);
        if (mx < 1) return alert(`Stok tidak cukup untuk satuan ${nama}.`);
        const jumlah = Math.min(Math.max(1, Number(row.jumlah) || 1), mx);
        const sub = jumlah * (Number(sat.harga_jual) || 0);
        update(idx, { satuan: nama, jumlah, diskon: Math.min(Number(row.diskon) || 0, sub) });
    }

    function ubahJumlah(idx, val) {
        const row = list[idx];
        if (val === '') return update(idx, { jumlah: '' });
        let q = Math.floor(Number(val));
        if (!Number.isFinite(q) || q < 1) q = 1;
        const mx = maxQty(row);
        if (q > mx) { alert(`Stok tidak cukup. Maksimal ${mx} ${row.satuan}.`); q = mx; }
        const sub = q * hargaRow(row);
        update(idx, { jumlah: q, diskon: Math.min(Number(row.diskon) || 0, sub) });
    }

    function ubahDiskonRp(idx, val) {
        const sub = subtotalRow(list[idx]);
        let d = Math.floor(Number(val));
        if (!Number.isFinite(d) || d < 0) d = 0;
        update(idx, { diskon: Math.min(d, sub) });
    }

    function ubahDiskonPersen(idx, val) {
        let p = Number(val);
        if (!Number.isFinite(p) || p < 0) p = 0;
        if (p > 100) p = 100;
        update(idx, { diskon: Math.round((subtotalRow(list[idx]) * p) / 100) });
    }

    const totalSemua = list.reduce((a, r) => a + Math.max(0, subtotalRow(r) - (Number(r.diskon) || 0)), 0);

    async function simpan() {
        if (list.length === 0) return alert('List item masih kosong!');
        if (list.some((r) => !Number(r.jumlah) || Number(r.jumlah) < 1)) return alert('Ada jumlah yang belum diisi!');
        try {
            setSaving(true);
            const res = await axios.post('/api-be/SERVER_FAKTUR/TAMBAH_ITEM_FAKTUR', {
                no_faktur,
                items: list.map((r) => ({
                    kode_barang: r.kode_barang,
                    satuan: r.satuan,
                    jumlah_keluar: Number(r.jumlah),
                    diskon: Number(r.diskon) || 0,
                })),
            });
          
            tampilkanToast(res.data.message , 'success')
            tutup();
            onSaved?.();
        } catch (err) {
           
            tampilkanToast(err?.response?.data?.message , "error")
        } finally {
            setSaving(false);
        }
    }




    // TOAST //

    function tampilkanToast(message, typeResponse) {
        setLoading(prev => ({
            ...prev,
            toast: true,
            toastMessage: message,
            toastType: typeResponse
        }));

        setTimeout(() => {
          setLoading(prev => ({
            ...prev,
            toast:false
          }))
        }, 3000)
    }

    return (
        <main className={`${open ? 'flex' : 'hidden'} fixed inset-0 z-50 items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm`}>
            <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-visible">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h2 className="text-base font-extrabold text-slate-800">Tambah Item ke Faktur</h2>
                        <p className="text-xs text-slate-400">{no_faktur}</p>
                    </div>
                    <button type="button" onClick={tutup} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Cari barang */}
                    <div className="relative">
                        <div className="flex gap-2">
                            <input
                                value={cari}
                                onChange={(e) => setCari(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && cariBarang()}
                                placeholder="Cari barang berdasarkan nama..."
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                            />
                            <button type="button" onClick={cariBarang} disabled={loadingCari}
                                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                                {loadingCari ? '...' : 'Cari'}
                            </button>
                        </div>
                        {hasil.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-[999] mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl divide-y divide-slate-100">
                                {hasil.map((b) => (
                                    <div key={b.kode_barang} onClick={() => pilihBarang(b)}
                                        className="cursor-pointer p-3 hover:bg-indigo-50 flex items-center justify-between">
                                        <div>
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 mr-2">{b.kode_barang}</span>
                                            <span className="text-sm font-extrabold text-slate-800">{b.nama_barang}</span>
                                        </div>
                                        <span className={`text-xs font-bold ${Number(b.stok_pcs) <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {Number(b.stok_pcs) <= 0 ? 'Stok habis' : `Stok: ${rp(b.stok_pcs)} pcs`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* List item yang akan ditambahkan */}
                    {list.length === 0 && (
                        <p className="text-center text-sm text-slate-400 py-6">Belum ada item. Cari dan pilih barang di atas.</p>
                    )}
                    <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                        {list.map((row, idx) => (
                            <div key={row.kode_barang} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[11px] font-bold mb-1">{row.kode_barang}</span>
                                        <h3 className="text-sm font-black text-slate-800 uppercase">{row.nama_barang}</h3>
                                        <p className="text-xs font-bold text-emerald-600">Stok: {rp(row.stok_pcs)} pcs</p>
                                    </div>
                                    <button type="button" onClick={() => setList((p) => p.filter((_, i) => i !== idx))}
                                        className="text-xs font-bold text-red-500 hover:text-red-700">Hapus</button>
                                </div>

                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <select value={row.satuan} onChange={(e) => ubahSatuan(idx, e.target.value)}
                                        className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-slate-800">
                                        {row.list_satuan.map((s) => (
                                            <option key={s.nama_satuan} value={s.nama_satuan}>
                                                {s.nama_satuan} ({s.rasio_ke_pcs} PCS) - Rp {rp(s.harga_jual)}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flex items-end gap-3 flex-wrap">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Harga (@)</label>
                                            <div className="w-24 rounded-xl border border-slate-200 bg-slate-100 p-2 text-center text-xs font-bold text-slate-600">
                                                {rp(hargaRow(row))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Jumlah</label>
                                            <input type="number" min="1" value={row.jumlah}
                                                onChange={(e) => ubahJumlah(idx, e.target.value)}
                                                className="w-16 rounded-xl border border-slate-300 bg-white p-2 text-center text-sm font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-red-500 mb-0.5">Diskon (%)</label>
                                            <input type="number" min="0" max="100" placeholder="0"
                                                onChange={(e) => ubahDiskonPersen(idx, e.target.value)}
                                                className="w-16 rounded-xl border border-red-200 bg-white p-1.5 text-center text-xs font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-red-500 mb-0.5">Diskon (Rp)</label>
                                            <input type="number" min="0" value={row.diskon}
                                                onChange={(e) => ubahDiskonRp(idx, e.target.value)}
                                                className="w-24 rounded-xl border border-red-200 bg-white p-1.5 text-center text-xs font-bold" />
                                        </div>
                                        <div className="text-right pl-2">
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase">Subtotal</span>
                                            <span className="text-sm font-black text-slate-800">
                                                Rp {rp(Math.max(0, subtotalRow(row) - (Number(row.diskon) || 0)))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-sm font-bold text-slate-700">Total item yang ditambahkan</span>
                        <span className="text-2xl font-black text-emerald-600">Rp {rp(totalSemua)}</span>
                    </div>
                </div>

                <div className="flex justify-end gap-2 bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-100">
                    <button type="button" onClick={tutup}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Batal</button>
                    <button type="button" onClick={simpan} disabled={saving || list.length === 0}
                        className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {saving ? 'Menyimpan...' : 'Tambahkan ke Faktur'}
                    </button>
                </div>
            </div>
        </main>
    );
}