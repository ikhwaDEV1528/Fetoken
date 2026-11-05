'use client';

import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";
import { Konteks } from "@/GlobalNilai/Global";
import { KonteksOprasional } from "@/GlobalNilai/GlobalOprasional";
import axios from "axios";
import { useContext, useCallback, useState, useMemo, useEffect } from "react";

// ============================================================================
// HELPER HITUNG (murni). BACKEND (ProsesRetur.js) TETAP YANG MENENTUKAN
// nominal final; angka di sini hanya PREVIEW dengan rumus yang sama:
//   nilai = round(netto * (pcsSudahRetur + pcsRetur) / totalBeliPcs) - nominalSudahRetur
// Retur terakhir otomatis ambil sisa (6.751 -> 2.250, 2.250, 2.251).
// ============================================================================
const num = (v) => Number(v) || 0;
const rp = (v) => num(v).toLocaleString('id-ID');

function hitungNilaiRetur({ netto, totalBeliPcs, sudahPcs, sudahNominal, qtyPcs }) {
    if (!(totalBeliPcs > 0) || !(qtyPcs > 0)) return 0;
    const kumulatif = Math.round((netto * (sudahPcs + qtyPcs)) / totalBeliPcs);
    return Math.max(0, kumulatif - sudahNominal);
}

// Harga 1 satuan retur (informasi tampilan saja)
function hargaPerSatuan(netto, totalBeliPcs, rasioRetur) {
    return totalBeliPcs > 0 ? Math.round((netto * rasioRetur) / totalBeliPcs) : 0;
}

export function InputHeaderRetur() {
    const { dataInputRetur, setDataInputRetur, setDataRetur, dataRetur } = useContext(KonteksOprasional);
    const { inputCariBarang, setInputCariBarang } = useContext(Konteks);

    const [listBarangSearch, setListBarangSearch] = useState([]);
    const [listBarangManual, setListBarangManual] = useState([]); // barang dari faktur lain / manual
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchingBarang, setIsSearchingBarang] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    useEffect(() => {
        const noFakturAktif = dataRetur?.listRetur?.no_faktur;
        if (noFakturAktif && listBarangManual.length > 0) {
            // KUNCI PERBAIKAN 2: Otomatis buang barang jika faktur asalnya sama dengan faktur aktif
            setListBarangManual(prev =>
                prev.filter(item => item.no_faktur_asal !== noFakturAktif)
            );
        }
    }, [dataRetur?.listRetur?.no_faktur]);

    // ------------------------------------------------------------------
    // Fetch faktur utama (faktur tujuan)
    // ------------------------------------------------------------------
    const cari = useCallback(async (noFakturOverride) => {
        const noFaktur = (noFakturOverride ?? dataInputRetur?.input_no_faktur ?? '').trim();
        if (!noFaktur) {
            alert('No faktur wajib diisi!');
            return null;
        }

        setIsSearching(true);
        try {
            const ress = await axios.get('/api-be/SERVER_RETUR/CARI_FAKTUR', {
                params: { input_no_faktur: noFaktur, _t: Date.now() },
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });

            const rawFaktur = ress.data.faktur;
            const normalizedFaktur = rawFaktur ? {
                ...rawFaktur,
                items: (rawFaktur.items || []).map(it => ({
                    ...it,
                    satuan: it.satuan ?? it.satuan_beli,
                    qty_sisa_pcs: it.qty_sisa_pcs ?? it.sisa_retur_pcs,
                    qty_sudah_retur_pcs: it.qty_sudah_retur_pcs ?? it.total_sudah_retur_pcs,
                }))
            } : rawFaktur;

            setDataRetur(prev => ({
                ...prev,
                listRetur: normalizedFaktur,
                metode_penyelesaian: 'POTONG_PIUTANG',
                catatan: ''
            }));
            return normalizedFaktur;
        } catch (err) {
            alert(err?.response?.data?.message || 'Faktur tidak ditemukan!');
            return null;
        } finally {
            setIsSearching(false);
        }
    }, [dataInputRetur, setDataRetur]);

    // ------------------------------------------------------------------
    // ITEM FAKTUR INI
    // ------------------------------------------------------------------
    const handleItemChange = useCallback((index, field, value) => {
        setDataRetur(prev => {
            const updatedItems = [...(prev.listRetur?.items || [])];
            updatedItems[index] = { ...updatedItems[index], [field]: value };
            return { ...prev, listRetur: { ...prev.listRetur, items: updatedItems } };
        });
    }, [setDataRetur]);

    /**
     * Hitungan item faktur ini.
     * Sumber netto (urutan prioritas):
     *   1. item.netto_baris  (SANGAT DISARANKAN: kirim dari CARI_FAKTUR, hasil bruto - diskon item - porsi diskon global)
     *   2. item.total_harga - porsi diskon global (fallback; TANPA angka 1000 hardcode lagi)
     */
    const getHitunganHargaRetur = useCallback((item, selectedSatuanName) => {
        if (!item) return { rasioRetur: 1, rasioBeli: 1, totalBeliPcs: 0, maxQtyInPcs: 0, maxQtyAllowed: 0, netto: 0, sudahPcs: 0, sudahNominal: 0 };

        const satuanBeliObj = item.satuans?.find(s => s.nama_satuan === item.satuan);
        const rasioBeli = num(satuanBeliObj?.rasio_ke_pcs) || 1;
        const totalBeliPcs = num(item.qty_beli) * rasioBeli;
        const sudahPcs = num(item.qty_sudah_retur_pcs ?? item.total_sudah_retur_pcs);

        const sisaDariServer = item.qty_sisa_pcs ?? item.sisa_retur_pcs;
        const maxQtyInPcs = sisaDariServer !== undefined && sisaDariServer !== null
            ? num(sisaDariServer)
            : Math.max(0, totalBeliPcs - sudahPcs);

        const satuanReturObj = item.satuans?.find(s => s.nama_satuan === selectedSatuanName);
        const rasioRetur = num(satuanReturObj?.rasio_ke_pcs) || 1;

        const netto = item.netto_baris !== undefined && item.netto_baris !== null
            ? num(item.netto_baris)
            : Math.max(0, num(item.total_harga) - num(item.porsi_diskon_global));

        // kalau server belum kirim nominal yang sudah diretur, perkirakan proporsional
        const sudahNominal = item.sudah_retur_nominal !== undefined && item.sudah_retur_nominal !== null
            ? num(item.sudah_retur_nominal)
            : (totalBeliPcs > 0 ? Math.round((netto * sudahPcs) / totalBeliPcs) : 0);

        return {
            rasioRetur, rasioBeli, totalBeliPcs, maxQtyInPcs, netto, sudahPcs, sudahNominal,
            maxQtyAllowed: Math.floor(maxQtyInPcs / rasioRetur)
        };
    }, []);

    const hitungSubtotalItemAsli = useCallback((item) => {
        const satuan = item.satuan_retur || item.satuan;
        const h = getHitunganHargaRetur(item, satuan);
        const qty = num(item.qty_retur);
        return hitungNilaiRetur({
            netto: h.netto, totalBeliPcs: h.totalBeliPcs,
            sudahPcs: h.sudahPcs, sudahNominal: h.sudahNominal,
            qtyPcs: qty * h.rasioRetur
        });
    }, [getHitunganHargaRetur]);

    const handleToggleRetur = useCallback((index, item, filteredSatuans, isChecked) => {
        const defaultSatuanValid = filteredSatuans.some(s => s.nama_satuan === item.satuan);
        const fallbackSatuan = defaultSatuanValid ? item.satuan : (filteredSatuans[0]?.nama_satuan || item.satuan);

        setDataRetur(prev => {
            const updatedItems = [...(prev.listRetur?.items || [])];
            updatedItems[index] = {
                ...updatedItems[index],
                is_retur: isChecked,
                qty_retur: isChecked ? (updatedItems[index].qty_retur || 1) : updatedItems[index].qty_retur,
                satuan_retur: updatedItems[index].satuan_retur || fallbackSatuan
            };
            return { ...prev, listRetur: { ...prev.listRetur, items: updatedItems } };
        });
    }, [setDataRetur]);

    const handleChangeSatuanRetur = useCallback((index, item, newSatuan) => {
        const newCalc = getHitunganHargaRetur(item, newSatuan);
        const currentQty = num(item.qty_retur);
        const validQty = currentQty > newCalc.maxQtyAllowed ? Math.min(1, newCalc.maxQtyAllowed) : currentQty;

        setDataRetur(prev => {
            const updatedItems = [...(prev.listRetur?.items || [])];
            updatedItems[index] = { ...updatedItems[index], satuan_retur: newSatuan, qty_retur: validQty };
            return { ...prev, listRetur: { ...prev.listRetur, items: updatedItems } };
        });
    }, [getHitunganHargaRetur, setDataRetur]);

    // ------------------------------------------------------------------
    // BARANG DARI FAKTUR LAIN
    // ------------------------------------------------------------------
    async function cariBarang() {
        const keywordTrimmed = (inputCariBarang || '').trim();

        if (!keywordTrimmed) {
            alert('Ketik kata kunci pencarian terlebih dahulu!');
            return;
        }

        if (isSearchingBarang) return;
        setIsSearchingBarang(true);

        setListBarangManual([]);
        setListBarangSearch([]);

        try {
            const noFakturTujuan = dataRetur?.listRetur?.no_faktur || '';

            const ress = await axios.get('/api-be/SERVER_RETUR/CARI_BARANG_FAKTUR_LAIN', {
                params: {
                    input: keywordTrimmed,
                    no_faktur_sekarang: noFakturTujuan
                }
            });

            const hasilData = ress.data.Search || [];
            console.log('HASIL DARI BACKEND:', hasilData); // Cek F12 Console Browser

            if (hasilData.length === 0) {
                alert('Barang tidak ditemukan atau sudah habis diretur!');
            }

            setListBarangSearch(hasilData);
        } catch (err) {
            console.error('Error Cari Barang:', err);
            alert(err?.response?.data?.message || 'Gagal mencari barang');
        } finally {
            setIsSearchingBarang(false);
        }
    }

    function handlePilihBarang(params) {
        if (params.data_satuan_valid === false) {
            alert('Data satuan barang ini tidak lengkap di master. Hubungi admin.');
            return;
        }
        if (num(params.sisa_retur_pcs) <= 0) {
            alert('Barang ini sudah habis diretur seluruhnya!');
            return;
        }
        const isExist = listBarangManual.some(
            it => it.id_detail_penjualan && it.id_detail_penjualan === params.id_detail_penjualan
        );
        if (isExist) {
            alert('Barang dari riwayat faktur ini sudah dimasukkan ke daftar!');
            return;
        }

        const listSatuan = params.list_satuan || [];
        const satuanBeli = params.satuan_beli || listSatuan[0]?.nama_satuan || 'PCS';

        setListBarangManual(prev => [{
            id_manual: `manual-${Date.now()}`,
            id_detail_penjualan: params.id_detail_penjualan || null,
            no_faktur_asal: params.no_faktur_asal || '',
            sales_asal: params.sales_asal || '',
            kode_barang: params.kode_barang,
            nama_barang: params.nama_barang,
            is_retur: true,
            satuan_beli: satuanBeli,
            satuan_retur: satuanBeli,
            qty_retur: 1,
            // data dari server (hasil hitung backend, JANGAN dihitung ulang di FE)
            qty_beli: num(params.qty_beli),
            harga_jual: num(params.harga_jual),
            netto_baris: num(params.netto_baris),
            harga_bersih: num(params.harga_bersih),
            total_beli_pcs: num(params.total_beli_pcs),
            sudah_retur_pcs: num(params.sudah_retur_pcs),
            sudah_retur_nominal: num(params.sudah_retur_nominal),
            sisa_retur_pcs: num(params.sisa_retur_pcs),
            list_satuan: listSatuan,
            kondisi: 'BAGUS',
            alasan: params.no_faktur_asal
                ? `Retur dari Faktur ${params.no_faktur_asal}${params.sales_asal ? ` (${params.sales_asal})` : ''}`
                : 'Retur dari faktur lain'
        }, ...prev]);

        setListBarangSearch([]);
        setInputCariBarang('');
    }

    function handleManualItemChange(index, field, value) {
        setListBarangManual(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    function handleHapusItemManual(index) {
        setListBarangManual(prev => prev.filter((_, i) => i !== index));
    }

    /**
     * Hitungan barang faktur lain.
     * - Punya id_detail_penjualan -> nilai dari netto baris faktur asal (diskon item + diskon global sudah masuk)
     * - Tanpa id_detail (manual murni) -> harga master satuan retur
     */
    const getHitunganManualBarang = useCallback((item) => {
        const listSatuan = item.list_satuan || [];
        const objSatuanBeli = listSatuan.find(s => s.nama_satuan === item.satuan_beli) || listSatuan[0] || { level: 1, rasio_ke_pcs: 1, harga_jual: 0 };
        const dariFaktur = !!item.id_detail_penjualan;

        // hanya satuan <= satuan beli, dan masih ada sisa untuk satuan tsb
        const filteredSatuanRetur = listSatuan.filter(s => {
            if (s.level > objSatuanBeli.level) return false;
            if (!dariFaktur) return true;
            return Math.floor(item.sisa_retur_pcs / (num(s.rasio_ke_pcs) || 1)) > 0;
        });

        // Satuan retur EFEKTIF: kalau pilihan tersimpan sudah tidak valid (mis. sisa < 1 PACK),
        // pakai satuan terbesar yang masih tersedia. Select, label, max, harga, dan payload
        // semuanya memakai nilai ini supaya tampilan = perhitungan = yang dikirim.
        const objSatuanRetur =
            filteredSatuanRetur.find(s => s.nama_satuan === item.satuan_retur) ||
            filteredSatuanRetur[0] ||
            objSatuanBeli;
        const satuanReturEfektif = objSatuanRetur.nama_satuan || item.satuan_retur;
        const rasioRetur = num(objSatuanRetur.rasio_ke_pcs) || 1;

        const maxQtyAllowed = dariFaktur
            ? Math.floor(item.sisa_retur_pcs / rasioRetur)
            : Infinity;

        const qty = num(item.qty_retur);
        let subtotal;
        let hargaSatuan;

        if (dariFaktur) {
            subtotal = hitungNilaiRetur({
                netto: item.netto_baris,
                totalBeliPcs: item.total_beli_pcs,
                sudahPcs: item.sudah_retur_pcs,
                sudahNominal: item.sudah_retur_nominal,
                qtyPcs: qty * rasioRetur
            });
            hargaSatuan = hargaPerSatuan(item.netto_baris, item.total_beli_pcs, rasioRetur);
        } else {
            hargaSatuan = num(objSatuanRetur.harga_jual);
            subtotal = Math.round(hargaSatuan * qty);
        }

        return { objSatuanBeli, filteredSatuanRetur, satuanReturEfektif, hargaSatuan, subtotal, maxQtyAllowed, rasioRetur };
    }, []);

    // ------------------------------------------------------------------
    // TOTAL PREVIEW (seluruh item terpilih)
    // ------------------------------------------------------------------
    const totalPreview = useMemo(() => {
        const asli = (dataRetur?.listRetur?.items || [])
            .filter(i => i.is_retur)
            .reduce((a, i) => a + hitungSubtotalItemAsli(i), 0);
        const manual = listBarangManual
            .filter(i => i.is_retur)
            .reduce((a, i) => a + getHitunganManualBarang(i).subtotal, 0);
        return asli + manual;
    }, [dataRetur, listBarangManual, hitungSubtotalItemAsli, getHitunganManualBarang]);

    // ------------------------------------------------------------------
    // SIMPAN — FE TIDAK MENGIRIM NOMINAL UANG; BACKEND YANG MENGHITUNG
    // ------------------------------------------------------------------
    async function simpanRetur() {
        if (isSaving) return;

        const itemsFakturAsli = [];
        for (const item of (dataRetur?.listRetur?.items || []).filter(i => i.is_retur)) {
            const satuan = item.satuan_retur || item.satuan;
            const h = getHitunganHargaRetur(item, satuan);
            const qty = num(item.qty_retur);
            if (!Number.isInteger(qty) || qty < 1) return alert(`Qty retur ${item.nama_barang} tidak valid!`);
            if (qty > h.maxQtyAllowed) return alert(`Qty retur ${item.nama_barang} melebihi maksimal (${h.maxQtyAllowed} ${satuan})!`);

            itemsFakturAsli.push({
                id_detail: item.id_detail,
                kode_barang: item.kode_barang,
                qty_retur: qty,
                satuan_retur: satuan,
                kondisi: item.kondisi || 'BAGUS',
                alasan: item.alasan || '',
                is_manual: false
            });
        }

        const itemsManual = [];
        for (const item of listBarangManual.filter(i => i.is_retur)) {
            const h = getHitunganManualBarang(item);
            const qty = num(item.qty_retur);
            if (!Number.isInteger(qty) || qty < 1) return alert(`Qty retur ${item.nama_barang} tidak valid!`);
            if (qty > h.maxQtyAllowed) return alert(`Qty retur ${item.nama_barang} melebihi maksimal (${h.maxQtyAllowed} ${h.satuanReturEfektif})!`);

            itemsManual.push({
                id_detail: item.id_detail_penjualan || null,
                kode_barang: item.kode_barang,
                qty_retur: qty,
                satuan_retur: h.satuanReturEfektif,
                kondisi: item.kondisi || 'BAGUS',
                alasan: item.alasan || '',
                is_manual: !item.id_detail_penjualan
            });
        }

        const combinedItems = [...itemsFakturAsli, ...itemsManual];
        if (combinedItems.length === 0) {
            return alert('Pilih minimal 1 barang (dari faktur atau faktur lain) untuk diretur!');
        }

        setIsSaving(true);
        const noFakturLain = listBarangManual.length > 0 ? (listBarangManual[0].no_faktur_asal || null) : null;

        try {
            const ress = await axios.post('/api-be/SERVER_RETUR/PROSES_RETUR', {
                no_faktur: dataRetur.listRetur.no_faktur, // INI FAKTUR ASLIII NYA TAIII
                no_faktur_lain: noFakturLain, // INI FAKTUR NUMPANGG ANJINGG ASTAGA
                metode_penyelesaian: dataRetur.metode_penyelesaian || 'POTONG_PIUTANG',
                catatan: dataRetur.catatan || '',
                items: combinedItems
            });

            const d = ress?.data?.data;
            alert(`Retur berhasil disimpan!${d ? `\nNo Retur: ${d.no_retur}\nTotal: Rp ${rp(d.total_refund)}` : ''}`);
            setListBarangManual([]);
            await cari(dataRetur.listRetur.no_faktur);
        } catch (err) {
            alert(err?.response?.data?.message || 'Gagal menyimpan retur');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <CEK_HAK_AKSES>
            <main className="max-w-5xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-slate-200 my-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-3">
                    Cari Faktur Retur
                </h2>

                <div className="flex items-center gap-3 mb-6">
                    <input
                        onChange={(e) => setDataInputRetur(prev => ({ ...prev, input_no_faktur: e.target.value }))}
                        value={dataInputRetur?.input_no_faktur || ''}
                        type="text"
                        placeholder="Masukkan no faktur yang ingin di retur..."
                        disabled={isSearching}
                        onKeyDown={(e) => { if (e.key === 'Enter') cari(); }}
                        className="flex-1 px-5 py-3 border-2 border-slate-300 rounded-xl text-base font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                        onClick={() => cari()}
                        type="button"
                        disabled={isSearching}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                    >
                        {isSearching ? 'Mencari...' : 'Cari'}
                    </button>
                </div>

                {dataRetur?.listRetur && (
                    <div className="space-y-6 border-t-2 border-slate-100 pt-6">
                        {/* Header Faktur */}
                        <div className="bg-slate-50 p-5 rounded-xl text-sm md:text-base text-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 border border-slate-200 font-medium">
                            <div>
                                <span className="text-slate-500 block text-xs uppercase font-semibold">No Faktur</span>
                                <strong className="text-slate-900">{dataRetur.listRetur.no_faktur}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs uppercase font-semibold">Tanggal</span>
                                <strong className="text-slate-900">{dataRetur.listRetur.tgl_faktur}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs uppercase font-semibold">Pelanggan</span>
                                <strong className="text-slate-900">{dataRetur.listRetur.nama_pelanggan}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs uppercase font-semibold">Sales</span>
                                <strong className="text-slate-900">{dataRetur.listRetur.nama_sales}</strong>
                            </div>
                        </div>

                        {/* Pengaturan Retur Header */}
                        <div className="bg-slate-50 p-5 rounded-xl text-sm space-y-4 border border-slate-200">
                            <p className="font-bold text-slate-900 text-base border-b pb-2">Pengaturan Retur Header</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-600 block font-bold mb-1 uppercase">Metode Penyelesaian</label>
                                    <select
                                        value={dataRetur.metode_penyelesaian || 'POTONG_PIUTANG'}
                                        onChange={(e) => setDataRetur(prev => ({ ...prev, metode_penyelesaian: e.target.value }))}
                                        className="w-full p-3 border-2 rounded-xl bg-white text-sm font-bold text-slate-900 border-slate-300"
                                    >
                                        <option value="POTONG_PIUTANG">POTONG_PIUTANG (Potong Tagihan)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 block font-bold mb-1 uppercase">Catatan Retur</label>
                                    <input
                                        type="text"
                                        maxLength={500}
                                        placeholder="Contoh: Barang rusak..."
                                        value={dataRetur.catatan || ''}
                                        onChange={(e) => setDataRetur(prev => ({ ...prev, catatan: e.target.value }))}
                                        className="w-full p-3 border-2 rounded-xl bg-white text-sm text-slate-900 border-slate-300"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CARI BARANG DARI FAKTUR LAIN */}
                        <div className="p-4 bg-amber-50/60 border-2 border-amber-300 rounded-xl space-y-3">
                            <h3 className="text-sm font-bold text-amber-900">Cari & Tambah Barang dari Faktur Lain:</h3>
                            <div className="flex items-center gap-3 max-w-md">
                                <input
                                    value={inputCariBarang || ''}
                                    onChange={(e) => setInputCariBarang(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') cariBarang(); }}
                                    type="text"
                                    placeholder="No faktur / nama / kode barang..."
                                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 bg-white"
                                />
                                <button
                                    onClick={() => cariBarang()}
                                    type="button"
                                    disabled={isSearchingBarang}
                                    className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shrink-0 cursor-pointer disabled:opacity-50"
                                >
                                    {isSearchingBarang ? '...' : 'Cari'}
                                </button>
                            </div>

                            {listBarangSearch.length > 0 && (
                                <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto divide-y divide-gray-100">
                                    {listBarangSearch.map((item, index) => {
                                        const habis = num(item.sisa_retur_pcs) <= 0;
                                        return (
                                            <div
                                                key={item.id_detail_penjualan || `${item.kode_barang}-${index}`}
                                                onClick={() => !habis && handlePilihBarang(item)}
                                                className={`p-3 transition flex justify-between items-center group ${habis ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-50 cursor-pointer'}`}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-gray-800 group-hover:text-amber-700">
                                                            {item.nama_barang}
                                                        </p>
                                                        {(item.is_bonus || Number(item.harga_jual || 0) === 0) && (
                                                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded border border-emerald-300">
                                                                BONUS
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        Faktur <span className="font-mono">{item.no_faktur_asal}</span> • Kode: <span className="font-mono">{item.kode_barang}</span>
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Beli {item.qty_beli} {item.satuan_beli} • Harga bersih: <strong>Rp {rp(item.harga_bersih)}</strong> / {item.satuan_beli} • Sisa retur: {item.sisa_retur_pcs} PCS
                                                    </p>
                                                </div>
                                                <span className="text-xs font-bold text-amber-600 group-hover:underline shrink-0 ml-3">
                                                    {habis ? 'Habis diretur' : '+ Pilih Barang'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* SECTION 1: BARANG DARI FAKTUR LAIN */}
                        {listBarangManual.length > 0 && (
                            <div className="space-y-4 border-l-4 border-amber-500 pl-4 py-2 bg-amber-50/20 rounded-r-xl">
                                <h3 className="text-base font-bold text-amber-900">Barang dari Faktur Lain:</h3>
                                {listBarangManual.map((item, index) => {
                                    const { filteredSatuanRetur, satuanReturEfektif, hargaSatuan, subtotal, maxQtyAllowed } = getHitunganManualBarang(item);
                                    const dariFaktur = !!item.id_detail_penjualan;

                                    return (
                                        <div key={item.id_manual || index} className="p-5 border-2 border-amber-400 bg-white rounded-xl space-y-4 shadow-sm">
                                            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!item.is_retur}
                                                        onChange={(e) => handleManualItemChange(index, 'is_retur', e.target.checked)}
                                                        className="w-5 h-5 text-amber-600 rounded cursor-pointer"
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-slate-900 text-base">{item.nama_barang}</h4>
                                                            {(item.is_bonus || Number(item.harga_jual || 0) === 0) && (
                                                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-300">
                                                                    BONUS
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-amber-700 font-medium">
                                                            Kode: <span className="font-mono">{item.kode_barang}</span>
                                                            {item.no_faktur_asal && <> • Faktur asal: <span className="font-mono">{item.no_faktur_asal}</span></>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleHapusItemManual(index)}
                                                    className="text-xs font-bold text-red-500 hover:text-red-700 underline cursor-pointer"
                                                >
                                                    Hapus Item
                                                </button>
                                            </div>

                                            {item.is_retur && (
                                                <div className="space-y-4 pt-1">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-700 block mb-1">Satuan Saat Beli</label>
                                                            {dariFaktur ? (
                                                                <div className="w-full p-2.5 border-2 border-slate-200 rounded-lg bg-slate-50 text-sm font-bold text-slate-900">
                                                                    {item.satuan_beli} <span className="text-xs font-medium text-slate-500">(sesuai faktur asal)</span>
                                                                </div>
                                                            ) : (
                                                                <select
                                                                    value={item.satuan_beli}
                                                                    onChange={(e) => {
                                                                        handleManualItemChange(index, 'satuan_beli', e.target.value);
                                                                        handleManualItemChange(index, 'satuan_retur', e.target.value);
                                                                    }}
                                                                    className="w-full p-2.5 border-2 border-amber-300 rounded-lg bg-white text-sm font-bold text-slate-900"
                                                                >
                                                                    {item.list_satuan?.map((s, idx) => (
                                                                        <option key={idx} value={s.nama_satuan}>
                                                                            {s.nama_satuan} (Rp {rp(s.harga_jual)})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-bold text-slate-700 block mb-1">Satuan Retur</label>
                                                            <select
                                                                value={satuanReturEfektif}
                                                                onChange={(e) => {
                                                                    const baru = e.target.value;
                                                                    handleManualItemChange(index, 'satuan_retur', baru);
                                                                    handleManualItemChange(index, 'qty_retur', 1);
                                                                }}
                                                                className="w-full p-2.5 border-2 border-amber-300 rounded-lg bg-white text-sm font-bold text-emerald-900"
                                                            >
                                                                {filteredSatuanRetur.map((s, idx) => (
                                                                    <option key={idx} value={s.nama_satuan}>{s.nama_satuan}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                                                                <span>Qty Retur</span>
                                                                {Number.isFinite(maxQtyAllowed) && <span className="text-slate-500">Maksimal: {maxQtyAllowed}</span>}
                                                            </div>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={Number.isFinite(maxQtyAllowed) ? maxQtyAllowed : undefined}
                                                                value={item.qty_retur ?? ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '') return handleManualItemChange(index, 'qty_retur', '');
                                                                    const n = Number(val);
                                                                    if (Number.isNaN(n)) return;
                                                                    if (n < 1) return handleManualItemChange(index, 'qty_retur', 1);
                                                                    if (n > maxQtyAllowed) {
                                                                        alert(`Maksimal retur untuk satuan ${satuanReturEfektif} adalah ${maxQtyAllowed}`);
                                                                        return handleManualItemChange(index, 'qty_retur', maxQtyAllowed);
                                                                    }
                                                                    handleManualItemChange(index, 'qty_retur', Math.floor(n));
                                                                }}
                                                                className="w-full p-2.5 border-2 border-amber-300 rounded-lg bg-white text-sm font-bold text-slate-900"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-700 block mb-1">Kondisi Barang</label>
                                                            <select
                                                                value={item.kondisi || 'BAGUS'}
                                                                onChange={(e) => handleManualItemChange(index, 'kondisi', e.target.value)}
                                                                className="w-full p-2.5 border-2 border-slate-300 rounded-lg bg-white text-sm font-semibold"
                                                            >
                                                                <option value="BAGUS">BAGUS (Masuk Stok)</option>
                                                                <option value="RUSAK">RUSAK (BS/Afkir)</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-700 block mb-1">Alasan Retur</label>
                                                            <input
                                                                type="text"
                                                                maxLength={255}
                                                                placeholder="Sebab retur..."
                                                                value={item.alasan || ''}
                                                                onChange={(e) => handleManualItemChange(index, 'alasan', e.target.value)}
                                                                className="w-full p-2.5 border-2 border-slate-300 rounded-lg bg-white text-sm"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="bg-emerald-100/80 p-3 rounded-lg border-2 border-emerald-300 text-sm space-y-1 font-semibold">
                                                        {dariFaktur && (
                                                            <div className="flex justify-between items-center text-slate-600 text-xs">
                                                                <span>Harga bersih faktur asal ({item.qty_beli} {item.satuan_beli}):</span>
                                                                <span>Rp {rp(item.netto_baris)}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-center text-slate-700">
                                                            <span>Harga per {satuanReturEfektif}:</span>
                                                            <span>Rp {rp(hargaSatuan)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-emerald-900 font-bold text-base border-t border-emerald-200 pt-1">
                                                            <span>Subtotal Item:</span>
                                                            <span>Rp {rp(subtotal)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* SECTION 2: BARANG ASLI FAKTUR INI */}
                       <div className="space-y-4">
    <h3 className="text-base font-bold text-slate-800">Barang Asli Faktur Ini:</h3>
    {dataRetur.listRetur.items?.map((item, index) => {
        const selectedSatuanName = item.satuan_retur || item.satuan;
        const h = getHitunganHargaRetur(item, selectedSatuanName);
        const { maxQtyAllowed, maxQtyInPcs, sudahPcs, rasioRetur, netto, totalBeliPcs } = h;

        const hargaSatuanRetur = hargaPerSatuan(netto, totalBeliPcs, rasioRetur);
        const subtotalRetur = hitungSubtotalItemAsli(item);

        const satuanBeliObj = item.satuans?.find(s => s.nama_satuan === item.satuan);
        const maxLevel = satuanBeliObj?.level || 1;
        const filteredSatuans = (item.satuans?.filter(s => s.level <= maxLevel) || [])
            .filter(s => Math.floor(maxQtyInPcs / (s.rasio_ke_pcs || 1)) > 0);

        // 1. UBAHAN: Cek barang bonus & gabung kondisi disabled
        const isBonus = item.is_bonus || Number(item.harga_jual_kotor || item.harga_jual || 0) === 0;
        const sudahHabisDiretur = maxQtyInPcs <= 0;
        const isDisabled = isBonus || sudahHabisDiretur; // Kunci jika bonus ATAU habis

        return (
            <div 
                key={item.id_detail ?? index} 
                className={`p-5 border-2 rounded-xl text-sm space-y-4 transition ${
                    isDisabled
                        ? 'bg-slate-100/70 border-slate-200 opacity-60' // 2. UBAHAN: Efek redup & terkunci
                        : item.is_retur 
                            ? 'bg-emerald-50/70 border-emerald-400 shadow-sm' 
                            : 'bg-white border-slate-200'
                }`}
            >
                <div className="flex items-center justify-between border-b pb-3">
                    <label className={`flex items-center gap-3 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                            type="checkbox"
                            checked={!isBonus && !!item.is_retur} // 3. UBAHAN: Jangan sampai tercentang jika bonus
                            disabled={isDisabled} // 4. UBAHAN: Checkbox terkunci
                            onChange={(e) => handleToggleRetur(index, item, filteredSatuans, e.target.checked)}
                            className="w-5 h-5 text-emerald-600 rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900">{item.nama_barang}</h3>
                                {isBonus && (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-300">
                                        BONUS
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 font-medium">
                                Dipesan: <strong className="text-slate-900">{item.qty_beli} {item.satuan}</strong> | Sisa: <strong className={sudahHabisDiretur ? 'text-red-600' : 'text-emerald-800'}>{maxQtyInPcs} PCS</strong>
                                {sudahPcs > 0 && ` (Pernah retur: ${sudahPcs} PCS)`}
                            </p>
                        </div>
                    </label>
                    <div className="text-right">
                        <p className="text-slate-700 font-bold text-sm">Rp {rp(hargaSatuanRetur)} / {selectedSatuanName}</p>
                    </div>
                </div>

                {/* 5. UBAHAN: Pesan peringatan jika barang bonus */}
                {isBonus && (
                    <p className="text-xs text-amber-700 italic font-medium">
                        * Barang bonus tidak dapat diretur pada metode Potong Piutang.
                    </p>
                )}

                {item.is_retur && !isDisabled && (
                    <div className="space-y-4 pt-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Satuan Retur</label>
                                <select
                                    value={selectedSatuanName}
                                    onChange={(e) => handleChangeSatuanRetur(index, item, e.target.value)}
                                    className="w-full p-2.5 border-2 rounded-lg bg-white text-sm font-bold text-emerald-900 border-emerald-400"
                                >
                                    {filteredSatuans.length > 0 ? (
                                        filteredSatuans.map((s, idx) => (
                                            <option key={idx} value={s.nama_satuan}>{s.nama_satuan}</option>
                                        ))
                                    ) : (
                                        <option value={item.satuan}>{item.satuan}</option>
                                    )}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                                    <span>Qty Retur</span>
                                    <span className="text-slate-500">Maksimal: {maxQtyAllowed}</span>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max={maxQtyAllowed}
                                    value={item.qty_retur ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') return handleItemChange(index, 'qty_retur', '');
                                        const numVal = Number(val);
                                        if (Number.isNaN(numVal)) return;
                                        if (numVal < 1) return handleItemChange(index, 'qty_retur', 1);
                                        if (numVal > maxQtyAllowed) {
                                            alert(`Maksimal retur untuk satuan ${selectedSatuanName} adalah ${maxQtyAllowed}`);
                                            return handleItemChange(index, 'qty_retur', maxQtyAllowed);
                                        }
                                        handleItemChange(index, 'qty_retur', Math.floor(numVal));
                                    }}
                                    className="w-full p-2.5 border-2 border-slate-300 rounded-lg bg-white text-sm font-bold text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Kondisi Barang</label>
                                <select
                                    value={item.kondisi || 'BAGUS'}
                                    onChange={(e) => handleItemChange(index, 'kondisi', e.target.value)}
                                    className="w-full p-2.5 border-2 border-slate-300 rounded-lg bg-white text-sm font-semibold text-slate-900"
                                >
                                    <option value="BAGUS">BAGUS (Masuk Stok)</option>
                                    <option value="RUSAK">RUSAK (BS/Afkir)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Alasan Retur</label>
                                <input
                                    type="text"
                                    maxLength={255}
                                    placeholder="Sebab retur..."
                                    value={item.alasan || ''}
                                    onChange={(e) => handleItemChange(index, 'alasan', e.target.value)}
                                    className="w-full p-2.5 border-2 border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="bg-emerald-100/80 p-3 rounded-lg border-2 border-emerald-300 text-sm space-y-1 font-semibold">
                            <div className="flex justify-between items-center text-slate-700">
                                <span>Harga per {selectedSatuanName}:</span>
                                <span>Rp {rp(hargaSatuanRetur)}</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-900 font-bold text-base border-t border-emerald-200 pt-1">
                                <span>Subtotal Item:</span>
                                <span>Rp {rp(subtotalRetur)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    })}
</div>

                        {/* Total preview */}
                        <div className="flex justify-between items-center bg-slate-900 text-white rounded-xl px-5 py-4 font-bold">
                            <span>Total Retur (perkiraan)</span>
                            <span className="text-xl">Rp {rp(totalPreview)}</span>
                        </div>

                        <button
                            onClick={simpanRetur}
                            disabled={isSaving}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
                        >
                            {isSaving ? 'Menyimpan Retur...' : 'Simpan Retur'}
                        </button>
                    </div>
                )}
            </main>
        </CEK_HAK_AKSES>
    );
}
