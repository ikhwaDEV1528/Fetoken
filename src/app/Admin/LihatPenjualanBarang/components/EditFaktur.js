'use client';
import { useState, useEffect } from "react";
import axios from "axios";

export function EditFaktur({ faktur, open, setOpen, no_faktur }) {
    // State Pencarian
    const [inputCariBarang, setInputCariBarang] = useState('');
    const [listHasilCari, setListHasilCari] = useState([]);
    const [loadingCari, setLoadingCari] = useState(false);

    // State Barang Terpilih & Detail Formulir
    const [selectedBarang, setSelectedBarang] = useState(null);
    const [selectedSatuanObj, setSelectedSatuanObj] = useState(null);
    const [inputJumlah, setInputJumlah] = useState(1);
    const [inputHargaJual, setInputHargaJual] = useState(0);
    const [diskonPersen, setDiskonPersen] = useState('');
    const [diskonRp, setDiskonRp] = useState(0);

    // Set Data Awal pas Modal Dibuka
    useEffect(() => {
        if (faktur && open) {
            const barangAwal = {
                kode_barang: faktur.kode_barang,
                nama_barang: faktur.nama_barang,
                stok_pcs: Number(faktur.stok_pcs) || 0,
                list_satuan: faktur.list_satuan || [
                    {
                        nama_satuan: faktur.satuan || 'PCS',
                        harga_jual: Number(faktur.harga_jual) || 0,
                        rasio_ke_pcs: 1
                    }
                ]
            };

            setSelectedBarang(barangAwal);
            setInputCariBarang(faktur.nama_barang || '');

            const satuanAktif = barangAwal.list_satuan.find(s => s.nama_satuan === faktur.satuan) || barangAwal.list_satuan[0];
            setSelectedSatuanObj(satuanAktif);

            setInputJumlah(Math.max(1, Number(faktur.jumlah_keluar) || 1));
            setInputHargaJual(Math.max(0, Number(faktur.harga_jual) || Number(satuanAktif?.harga_jual) || 0));
            setDiskonRp(Math.max(0, Number(faktur.diskon) || 0));
            setDiskonPersen('');
            setListHasilCari([]);
        }
    }, [faktur, open]);

    // Helper untuk hitung total stok nyata (Jika stok_pcs dari BE sudah merupakan sisa riil di gudang tanpa alokasi lama, langsung gunakan stok_pcs)
    const getStokEfektif = (barang, satuanObj) => {
        const stokSisa = Number(barang?.stok_pcs) || 0;
        
        // Jika dari backend nilai stok_pcs sudah mencerminkan sisa riil gudang saat ini, 
        // kita langsung kembalikan stokSisa tanpa menambahkannya dengan pcsLama
        return stokSisa;
    };

    // FUNGSI CARI BARANG
    async function cariBarang() {
        if (!inputCariBarang || !inputCariBarang.trim()) {
            return alert('Ketik nama/kode barang!');
        }

        try {
            setLoadingCari(true);
            const API = '/api-be/SERVER_JUAL_BARANG/JUAL_BARANG';
            const ress = await axios.get(API, { params: { input: inputCariBarang.trim() } });

            let hasilCari = [];
            if (Array.isArray(ress.data?.Search)) {
                hasilCari = ress.data.Search;
            } else if (Array.isArray(ress.data?.search)) {
                hasilCari = ress.data.search;
            } else if (Array.isArray(ress.data?.data)) {
                hasilCari = ress.data.data;
            } else if (Array.isArray(ress.data)) {
                hasilCari = ress.data;
            }

            if (hasilCari.length === 0) {
                alert('Barang tidak ditemukan');
            }

            setListHasilCari(hasilCari);
        } catch (err) {
            console.error("Error pencarian:", err);
            alert(err?.response?.data?.message || 'Terjadi kesalahan server, Coba lagi!');
        } finally {
            setLoadingCari(false);
        }
    }

    // FUNGSI PILIH BARANG
    // FUNGSI PILIH BARANG
    const handlePilihBarang = (barangBaru) => {
        if (!barangBaru) {
            return alert('Item tidak ada!');
        }

        const stokTersedia = getStokEfektif(barangBaru);

        // VALIDASI KETAT: Mencegah pemilahan barang stok 0/minus
        if (isNaN(stokTersedia) || stokTersedia <= 0) {
            return alert('Stok barang ini habis / tidak mencukupi!');
        }

        setSelectedBarang(barangBaru);
        setInputCariBarang(barangBaru.nama_barang || '');
        setListHasilCari([]);

        const listSatuan = barangBaru.list_satuan || [];
        
        // Cari satuan terbesar yang stok tersedianya mencukupi (stokTersedia >= rasio_ke_pcs)
        // Jika tidak ada yang cocok, gunakan satuan paling kecil (biasanya index terakhir/PCS)
        const satuanValiddanCukup = listSatuan.find(s => stokTersedia >= (Number(s.rasio_ke_pcs) || 1));
        const satuanTerpilih = satuanValiddanCukup || listSatuan[listSatuan.length - 1] || { nama_satuan: 'PCS', harga_jual: 0, rasio_ke_pcs: 1 };

        setSelectedSatuanObj(satuanTerpilih);
        setInputHargaJual(Math.max(0, Number(satuanTerpilih.harga_jual) || 0));
        setInputJumlah(1);

        setDiskonPersen('');
        setDiskonRp(0);
    };

    // FUNGSI UBAH SATUAN DROPDOWN
    const handleSatuanChange = (namaSatuan) => {
        const itemSatuan = selectedBarang?.list_satuan?.find(s => s.nama_satuan === namaSatuan);
        if (itemSatuan) {
            const rasio = Number(itemSatuan.rasio_ke_pcs) || 1;
            const stokTersedia = getStokEfektif(selectedBarang, itemSatuan);

            // VALIDASI: Tolak jika stok tersisa lebih kecil dari rasio minimal 1 unit satuan yang dipilih
            if (stokTersedia < rasio) {
                alert(`Stok tidak mencukupi untuk memilih satuan ${itemSatuan.nama_satuan}! Minimal butuh ${rasio} pcs, sedangkan stok tersisa hanya ${stokTersedia} pcs.`);
                return;
            }

            setSelectedSatuanObj(itemSatuan);
            const hargaBaru = Math.max(0, Number(itemSatuan.harga_jual) || 0);
            setInputHargaJual(hargaBaru);

            // Validasi kecukupan stok terhadap jumlah input yang sedang diisi
            const totalPcsDibutuhkan = (Number(inputJumlah) || 1) * rasio;

            if (stokTersedia > 0 && totalPcsDibutuhkan > stokTersedia) {
                const maxQty = Math.floor(stokTersedia / rasio);
                alert(`Stok tidak mencukupi untuk jumlah tersebut dalam satuan ${itemSatuan.nama_satuan}! Jumlah otomatis disesuaikan ke maksimal ${maxQty}.`);
                setInputJumlah(Math.max(1, maxQty));
            }

            // Hitung ulang diskon Rp jika diskon persen sedang aktif
            const numPersen = Number(diskonPersen) || 0;
            const qtyAktif = Math.max(1, Number(inputJumlah) || 1);
            const subtotal = qtyAktif * hargaBaru;

            if (numPersen > 0) {
                setDiskonRp(Math.round((subtotal * numPersen) / 100));
            } else {
                // Batasi diskon Rp agar tidak melebihi subtotal baru
                if (diskonRp > subtotal) setDiskonRp(subtotal);
            }
        }
    };

    // Handler Perubahan Jumlah Input
    const handleJumlahChange = (val) => {
        // Jika input dikosongkan sementara oleh user saat mengetik
        if (val === '') {
            setInputJumlah('');
            return;
        }

        const numVal = Number(val);

        // VALIDASI KETAT: Input jumlah aneh (NaN/Infinite/Minus)
        if (isNaN(numVal) || !isFinite(numVal) || numVal <= 0) {
            alert('Jumlah barang harus berupa angka bulat positif lebih dari 0!');
            setInputJumlah(1);
            return;
        }

        const qty = Math.floor(numVal);

        // Check Stok berdasarkan rasio satuan & stok efektif
        const rasio = Number(selectedSatuanObj?.rasio_ke_pcs) || 1;
        const totalPcsDibutuhkan = qty * rasio;
        const stokTersedia = getStokEfektif(selectedBarang, selectedSatuanObj);

        if (stokTersedia > 0 && totalPcsDibutuhkan > stokTersedia) {
            const maxBeli = Math.floor(stokTersedia / rasio);
            alert(`Stok tidak mencukupi! Maksimal pembelian untuk satuan ini adalah ${maxBeli} ${selectedSatuanObj?.nama_satuan || 'item'}.`);
            setInputJumlah(maxBeli > 0 ? maxBeli : 1);
            return;
        }

        setInputJumlah(qty);

        const hargaAktif = Number(inputHargaJual) || 0;
        const subtotal = qty * hargaAktif;
        const numPersen = Number(diskonPersen) || 0;

        if (numPersen > 0) {
            setDiskonRp(Math.round((subtotal * numPersen) / 100));
        } else if (diskonRp > subtotal) {
            setDiskonRp(subtotal);
        }
    };

    // Handler Perubahan Harga Jual Manual
    const handleHargaJualChange = (val) => {
        const numHarga = Number(val);

        // VALIDASI KETAT: Harga tidak valid/minus/aneh
        if (val !== '' && (isNaN(numHarga) || !isFinite(numHarga) || numHarga < 0)) {
            alert('Harga jual tidak valid / tidak boleh negatif!');
            setInputHargaJual(0);
            return;
        }

        const harga = Math.max(0, numHarga || 0);
        setInputHargaJual(harga);

        const qty = Number(inputJumlah) || 0;
        const subtotal = qty * harga;
        const numPersen = Number(diskonPersen) || 0;

        if (numPersen > 0) {
            setDiskonRp(Math.round((subtotal * numPersen) / 100));
        } else if (diskonRp > subtotal) {
            setDiskonRp(subtotal);
        }
    };

    // Handler Diskon Persen Input
    const handleDiskonPersenChange = (val) => {
        const numPersen = Number(val);

        // VALIDASI KETAT: Diskon persen aneh/negatif/lebih dari 100%
        if (val !== '' && (isNaN(numPersen) || !isFinite(numPersen))) {
            alert('Nilai diskon persen tidak valid!');
            setDiskonPersen('');
            setDiskonRp(0);
            return;
        }

        // 1. Buang semua karakter selain angka (menghilangkan 'bava', '%', dll)
        const cleanedVal = String(val).replace(/[^0-9]/g, '');

        // 2. Jika hasil pembersihan kosong, reset state
        if (cleanedVal === '') {
            setDiskonPersen('');
            setDiskonRp(0);
            return;
        }

        let persen = numPersen || 0;

        if (persen < 0) {
            alert('Diskon persen tidak boleh minus!');
            persen = 0;
        }

        if (persen > 100) {
            alert('Diskon persen tidak boleh lebih dari 100%');
            persen = 100;
        }

        setDiskonPersen(val === '' ? '' : persen);

        const subtotal = (Number(inputJumlah) || 0) * (Number(inputHargaJual) || 0);
        const rpHitung = Math.round((subtotal * persen) / 100);
        setDiskonRp(rpHitung);
    };

    // Handler Diskon Nominal Input
    const handleDiskonRpChange = (val) => {
        const numRp = Number(val);

        // VALIDASI KETAT: Diskon Rp aneh/NaN/negatif
        if (val !== '' && (isNaN(numRp) || !isFinite(numRp))) {
            alert('Nilai diskon rupiah tidak valid!');
            setDiskonRp(0);
            return;
        }

        let rp = numRp || 0;

        if (rp < 0) {
            alert('Diskon rupiah tidak boleh minus!');
            rp = 0;
        }

        const subtotal = (Number(inputJumlah) || 0) * (Number(inputHargaJual) || 0);

        if (rp > subtotal) {
            alert(`Diskon rupiah (Rp ${rp.toLocaleString('id-ID')}) tidak boleh melebihi total harga item (Rp ${subtotal.toLocaleString('id-ID')})`);
            rp = subtotal;
        }

        setDiskonRp(rp);
        setDiskonPersen('');
    };

    // Subtotal Realtime & Net Akhir (Ketat Mencegah Minus)
    const subtotalRealtime = Math.max(0, (Number(inputJumlah) || 0) * (Number(inputHargaJual) || 0));
    const subtotalAkhir = Math.max(0, subtotalRealtime - (Number(diskonRp) || 0));

    // FUNGSI HAPUS ITEM
    async function hapusItemFaktur() {
        if (!faktur) return alert('Data item tidak ditemukan');
        if (!no_faktur) return alert('Nomor faktur tidak terdeteksi');

        if (!confirm(`Yakin ingin menghapus item "${faktur.nama_barang || ''}" dari faktur?`)) return;

        try {
            const API = '/api-be/SERVER_FAKTUR/HAPUS_FAKTUR';
            const ress = await axios.post(API, {
                faktur: faktur,
                no_faktur: no_faktur
            });

            alert(ress.data.message || 'Berhasil menghapus item');
            setOpen(false);
            window.location.reload();
        } catch (err) {
            alert(err?.response?.data?.message || 'Gagal menghapus item');
        }
    }

    // SIMPAN PERUBAHAN
    async function simpanEditItem() {
        if (!faktur) return alert('Data item tidak ditemukan!');
        if (!no_faktur) return alert('Nomor faktur tidak terdeteksi!');
        if (!selectedBarang) return alert('Barang belum dipilih!');

        const qty = Number(inputJumlah);
        const harga = Number(inputHargaJual);
        const diskon = Number(diskonRp);
        const rasio = Number(selectedSatuanObj?.rasio_ke_pcs) || 1;
        const stokTersedia = getStokEfektif(selectedBarang, selectedSatuanObj);

        // 1. VALIDASI KETAT: Tipe & Nilai Angka (Pencegahan NaN, Infinity, Negative)
        if (isNaN(qty) || !isFinite(qty) || qty <= 0) {
            return alert('Jumlah barang tidak valid! Harus angka positif minimal 1.');
        }

        if (isNaN(harga) || !isFinite(harga) || harga < 0) {
            return alert('Harga jual tidak valid! Tidak boleh bernilai negatif atau format tidak sesuai.');
        }

        if (isNaN(diskon) || !isFinite(diskon) || diskon < 0) {
            return alert('Nilai diskon tidak valid! Tidak boleh bernilai negatif.');
        }

        // 2. VALIDASI KETAT: Batas Ketersediaan Stok
        const totalPcsDibutuhkan = qty * rasio;
        if (stokTersedia > 0 && totalPcsDibutuhkan > stokTersedia) {
            const maxQty = Math.floor(stokTersedia / rasio);
            return alert(`Transaksi ditolak! Stok tidak mencukupi. Maksimal jumlah untuk satuan ${selectedSatuanObj?.nama_satuan || ''} adalah ${maxQty}.`);
        }

        // 3. VALIDASI KETAT: Total Subtotal & Diskon Melebihi Harga
        const totalGross = qty * harga;
        if (diskon > totalGross) {
            return alert(`Nilai diskon (Rp ${diskon.toLocaleString('id-ID')}) melebihi total harga belanja (Rp ${totalGross.toLocaleString('id-ID')})!`);
        }

        try {
            const API = '/api-be/SERVER_FAKTUR/EDIT_FAKTUR';

            const response = await axios.put(API, {
                no_faktur: no_faktur,
                faktur: {
                    id_detail: faktur?.id_detail,
                    kode_barang: selectedBarang?.kode_barang || faktur?.kode_barang,
                    satuan: selectedSatuanObj?.nama_satuan || faktur?.satuan,
                    jumlah_keluar: qty,
                    harga_jual: harga,
                    diskon: diskon
                }
            });

            alert(response.data.message || 'Berhasil mengedit item');
            setOpen(false);
            window.location.reload();
        } catch (err) {
            alert(err?.response?.data?.message || 'Gagal menyimpan perubahan');
        }
    }

    return (
        <main className={`${open ? 'flex' : 'hidden'} fixed inset-0 z-50 items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm`}>
            <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-visible">

                {/* Header */}
                <div className="flex items-center justify-between bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl">
                    <div>
                        <h2 className="text-base font-extrabold text-slate-800">Edit Pesanan Item</h2>
                        <p className="text-xs text-slate-400">Atur satuan, harga, dan jumlah barang transaksi</p>
                    </div>
                    <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">

                    {/* BAR CARI BARANG */}
                    <div className="relative">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputCariBarang}
                                onChange={(e) => setInputCariBarang(e.target.value)}
                                placeholder="Cari barang pengganti berdasarkan nama / kode..."
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={cariBarang}
                                disabled={loadingCari}
                                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loadingCari ? '...' : 'Cari'}
                            </button>
                        </div>

                        {/* DROPDOWN HASIL PENCARIAN */}
                        {listHasilCari.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-[999] mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl divide-y divide-slate-100">
                                {listHasilCari.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handlePilihBarang(item)}
                                        className="cursor-pointer p-3 hover:bg-indigo-50 transition-colors flex items-center justify-between"
                                    >
                                        <div>
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 mr-2">
                                                {item.kode_barang}
                                            </span>
                                            <span className="text-sm font-extrabold text-slate-800">{item.nama_barang}</span>
                                        </div>
                                        <div className="text-right text-xs">
                                            <span className="text-emerald-600 font-bold">
                                                {Number(item.stok_pcs) <= 0 ? <p className="text-red-500 font-bold">Stok habis</p> : 'Stok: ' + item.stok_pcs + " pcs"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* KARTU DAFTAR BARANG TERPILIH */}
                    {selectedBarang && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-4">
                            <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[11px] font-bold tracking-wider mb-1">
                                    {selectedBarang.kode_barang}
                                </span>
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                                    {selectedBarang.nama_barang}
                                </h3>
                                <p className="text-xs font-bold text-emerald-500 mt-0.5 flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full inline-block ${Number(selectedBarang.stok_pcs) <= 0 ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                    Stok: {Number(selectedBarang.stok_pcs) <= 0 ? 'Stok habis' : `${selectedBarang.stok_pcs} pcs`}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                {/* Dropdown Satuan */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">Satuan:</span>
                                    <select
                                        value={selectedSatuanObj?.nama_satuan || ''}
                                        onChange={(e) => handleSatuanChange(e.target.value)}
                                        className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    >
                                        {selectedBarang.list_satuan?.map((sat, idx) => (
                                            <option key={idx} value={sat.nama_satuan}>
                                                {sat.nama_satuan} ({sat.rasio_ke_pcs} PCS) - Rp {Number(sat.harga_jual || 0).toLocaleString('id-ID')}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Inputs Harga Jual, Qty, Diskon, Subtotal */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Harga Jual (@)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={inputHargaJual}
                                            onChange={(e) => handleHargaJualChange(e.target.value)}
                                            className="w-28 rounded-xl border border-slate-300 bg-white p-2 text-center text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Jumlah</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={inputJumlah}
                                            onChange={(e) => handleJumlahChange(e.target.value)}
                                            className="w-16 rounded-xl border border-slate-300 bg-white p-2 text-center text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="text-center">
                                        <label className="block text-[10px] font-bold text-red-500 mb-0.5">Diskon (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder="0"
                                            value={diskonPersen}
                                            onChange={(e) => handleDiskonPersenChange(e.target.value)}
                                            className="w-16 rounded-xl border border-red-200 bg-white p-1.5 text-center text-xs font-bold text-slate-800 outline-none focus:border-red-400"
                                        />
                                    </div>

                                    <div className="text-center">
                                        <label className="block text-[10px] font-bold text-red-500 mb-0.5">Diskon (Rp)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={diskonRp}
                                            onChange={(e) => handleDiskonRpChange(e.target.value)}
                                            className="w-24 rounded-xl border border-red-200 bg-white p-1.5 text-center text-xs font-bold text-slate-800 outline-none focus:border-red-400"
                                        />
                                    </div>

                                    <div className="text-right pl-2">
                                        <span className="block text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">SUBTOTAL</span>
                                        <span className="text-base font-black text-slate-800">
                                            Rp {subtotalAkhir.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Total Penjualan Ringkasan Bawah */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-sm font-bold text-slate-700">Total Tagihan Item</span>
                        <span className="text-2xl font-black text-emerald-600">
                            Rp {subtotalAkhir.toLocaleString('id-ID')}
                        </span>
                    </div>

                </div>

                {/* Footer Modal (Tombol Hapus + Batal + Simpan) */}
                <div className="flex items-center justify-between bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-100">
                    <button
                        type="button"
                        onClick={hapusItemFaktur}
                        className="rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-600 transition-all active:scale-95 cursor-pointer"
                    >
                        Hapus Item
                    </button>

                    <div className="flex gap-2">
                       
                        <button
                            type="button"
                            onClick={simpanEditItem}
                            className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700"
                        >
                            Simpan Perubahan
                        </button>
                    </div>
                </div>

            </div>
        </main>
    );
}