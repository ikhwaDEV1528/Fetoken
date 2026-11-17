'use client';

import { Konteks } from "@/GlobalNilai/Global";
import { useContext, useState } from "react";
import axios from "axios";

const API = '/api-be/SERVER_JUAL_BARANG/JUAL_BARANG';

export function ListPesanan() {
  const { dataInputBarang, setDataInputBarang } = useContext(Konteks);

  // ==========================================
  // STATE MODAL POPUP OVERLAY & PENCARIAN BARANG
  // ==========================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputCari, setInputCari] = useState('');
  const [hasilCari, setHasilCari] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // ==========================================
  // FUNGSI CARI BARANG SESUAI RESPONSE BACKEND (Search & input)
  // ==========================================
  const handleCariBarang = async () => {
    if (!inputCari.trim()) return alert('Ketik nama atau kode barang terlebih dahulu!');
    setIsSearching(true);
    try {
      // Backend menerima query param 'input'
      const res = await axios.get(API, { params: { input: inputCari } });

      // Backend mengembalikan array barang di 'res.data?.Search'
      const items = res.data?.Search || [];

      if (items.length === 0) {
        alert('Barang tidak ditemukan di database');
      }

      setHasilCari(items);
    } catch (err) {
      console.error('Gagal cari barang:', err);
      alert(err?.response?.data?.message || 'Gagal mengambil data barang dari server');
    } finally {
      setIsSearching(false);
    }
  };

  // ==========================================
  // FUNGSI PILIH BARANG -> MASUK SEBAGAI ITEM BONUS
  // ==========================================
  const tambahBarangBonusManual = (barangSelected) => {
    const barangAda = dataInputBarang?.ListPesanan?.find(
      (item) => item.kode_barang === barangSelected.kode_barang
    );

    const isBonus = barangSelected?.ada_fitur_bonus

    if (isBonus == 0) {
      return alert('Barang ini belum di jadikan sebagai bonus! , pergi ke detail barang > edit > Terapkan bonus.')
    }

    if (barangAda) {
      // Jika barang sudah ada, cukup tambahkan qty_bonus +1
      updateItemPesanan(barangSelected.kode_barang, {
        qty_bonus: Number(barangAda.qty_bonus || 0) + 1,
        ada_fitur_bonus: 1
      });
    } else {
      const listSatuan = barangSelected.list_satuan || [];
      const satuanDefault = listSatuan.find(s => s.level === 1 || s.nama_satuan === 'PCS') || listSatuan[0] || {
        id_satuan: null,
        nama_satuan: 'PCS',
        harga_jual: 0,
        rasio_ke_pcs: 1
      };

      // Format payload barang bonus (Harga = 0, Subtotal = 0, Qty Beli = 0, Qty Bonus = 1)
      const itemBonusBaru = {
        kode_barang: barangSelected.kode_barang,
        nama_barang: barangSelected.nama_barang,
        stok_pcs: Number(barangSelected.stok_pcs || 0),
        list_satuan: listSatuan,
        ada_fitur_bonus: barangSelected.ada_fitur_bonus ?? 1,

        // Satuan Aktif
        id_satuan: satuanDefault.id_satuan,
        nama_satuan: satuanDefault.nama_satuan,
        rasio_ke_pcs: Number(satuanDefault.rasio_ke_pcs || 1),

        // Nominal Diberi Rp 0
        harga_satuan: 0,
        harga_jual: 0,
        subtotal: 0,
        diskon: 0,
        diskon_persen: '',

        // Qty Beli = 0 & Qty Bonus = 1
        jumlah: 0,
        qty: 0,
        qty_bonus: 1,

        // Satuan Bonus Default
        id_satuan_bonus: satuanDefault.id_satuan,
        nama_satuan_bonus: satuanDefault.nama_satuan,
        rasio_bonus_ke_pcs: Number(satuanDefault.rasio_ke_pcs || 1),
        is_bonus_luar: true
      };

      setDataInputBarang((prev) => ({
        ...prev,
        ListPesanan: [...(prev.ListPesanan || []), itemBonusBaru]
      }));
    }

    // Tutup popup modal & reset input
    setIsModalOpen(false);
    setHasilCari([]);
    setInputCari('');
  };

  // ==========================================
  // HELPER UNIVERSAL UNTUK UPDATE ITEM
  // ==========================================
  const updateItemPesanan = (kodeBarang, payloadBaru) => {
    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === kodeBarang) {
          const itemUpdated = { ...item, ...payloadBaru };

          const harga = Number(itemUpdated.harga_satuan || itemUpdated.harga_jual || 0);
          const qty = Number(itemUpdated.jumlah || itemUpdated.qty || 0);
          const diskonVal = Number(itemUpdated.diskon || 0);
          const totalHargaKotor = harga * qty;

          itemUpdated.subtotal = Math.max(0, totalHargaKotor - diskonVal);
          return itemUpdated;
        }
        return item;
      })
    }));
  };

  const getRasioBonus = (item) => {
    if (item.id_satuan_bonus) {
      const sb = item.list_satuan?.find((s) => Number(s.id_satuan || s.id) === Number(item.id_satuan_bonus));
      if (sb) return Number(sb.rasio_ke_pcs || 1);
    }
    return Number(item.rasio_ke_pcs || 1);
  };

  function ganti_satuan(idSatuanBaru, itemPesanan) {
    const satuanTerpilih = itemPesanan.list_satuan?.find(
      (s) => Number(s.id_satuan || s.id) === Number(idSatuanBaru)
    );

    if (!satuanTerpilih) return;

    const rasioUtamaBaru = Number(satuanTerpilih.rasio_ke_pcs || 1);
    const rasioBonus = getRasioBonus(itemPesanan);

    const pcsBeli = Number(itemPesanan.jumlah || 0) * rasioUtamaBaru;
    const pcsBonus = Number(itemPesanan.qty_bonus || 0) * rasioBonus;
    const totalPcsDibutuhkan = pcsBeli + pcsBonus;

    if (totalPcsDibutuhkan > Number(itemPesanan.stok_pcs)) {
      alert(`Stok tidak mencukupi! Stok fisik tersedia: ${itemPesanan.stok_pcs} PCS.`);
      return;
    }

    const hargaBaru = Number(satuanTerpilih.harga_jual) || 0;

    updateItemPesanan(itemPesanan.kode_barang, {
      id_satuan: satuanTerpilih.id_satuan || satuanTerpilih.id,
      nama_satuan: satuanTerpilih.nama_satuan,
      harga_satuan: hargaBaru,
      harga_jual: hargaBaru,
      rasio_ke_pcs: rasioUtamaBaru
    });
  }

  function edit_jumlah_pesanan(e, itemPesanan) {
    const inputVal = e.target.value;
    const jumlahBaru = inputVal === "" ? "" : Number(inputVal);

    if (jumlahBaru !== "" && jumlahBaru === 0 && Number(itemPesanan.qty_bonus || 0) === 0) {
      return hapus(itemPesanan);
    }

    const rasioUtama = Number(itemPesanan.rasio_ke_pcs || 1);
    const rasioBonus = getRasioBonus(itemPesanan);

    const pcsBeli = Number(jumlahBaru || 0) * rasioUtama;
    const pcsBonus = Number(itemPesanan.qty_bonus || 0) * rasioBonus;
    const totalPcsDibutuhkan = pcsBeli + pcsBonus;

    if (jumlahBaru !== "" && totalPcsDibutuhkan > Number(itemPesanan.stok_pcs)) {
      alert(`Jumlah melebihi stok! Total butuh ${totalPcsDibutuhkan} PCS, stok tersedia ${itemPesanan.stok_pcs} PCS.`);
      return;
    }

    let diskonBaru = itemPesanan.diskon;
    if (itemPesanan.diskon_persen && Number(itemPesanan.diskon_persen) > 0) {
      const hargaSatuan = Number(itemPesanan.harga_satuan || itemPesanan.harga_jual || 0);
      const kotor = hargaSatuan * Number(jumlahBaru || 0);
      diskonBaru = Math.round((kotor * Number(itemPesanan.diskon_persen)) / 100);
    }

    updateItemPesanan(itemPesanan.kode_barang, {
      jumlah: jumlahBaru,
      qty: jumlahBaru,
      diskon: diskonBaru
    });
  }

  const handleDiskonPersenChange = (itemPesanan, valuePersen) => {
    const persen = parseFloat(valuePersen) || 0;
    const hargaSatuan = Number(itemPesanan.harga_satuan || itemPesanan.harga_jual || 0);
    const qty = Number(itemPesanan.jumlah || itemPesanan.qty || 1);
    const totalHargaKotor = hargaSatuan * qty;
    const nilaiRupiah = Math.round((totalHargaKotor * persen) / 100);

    if (nilaiRupiah > totalHargaKotor) {
      alert(`Diskon tidak boleh melebihi harga total item (Rp ${totalHargaKotor.toLocaleString('id-ID')})!`);
      return;
    }

    updateItemPesanan(itemPesanan.kode_barang, {
      diskon_persen: valuePersen,
      diskon: nilaiRupiah
    });
  };

  const handleDiskonRupiahChange = (itemPesanan, valueRupiah) => {
    const inputVal = valueRupiah === "" ? "" : Number(valueRupiah);
    const diskonVal = Number(inputVal || 0);
    const hargaSatuan = Number(itemPesanan.harga_satuan || itemPesanan.harga_jual || 0);
    const qty = Number(itemPesanan.jumlah || itemPesanan.qty || 1);
    const totalHargaKotor = hargaSatuan * qty;

    if (diskonVal > totalHargaKotor) {
      alert(`Diskon tidak boleh melebihi harga total item (Rp ${totalHargaKotor.toLocaleString('id-ID')})!`);
      return;
    }

    updateItemPesanan(itemPesanan.kode_barang, {
      diskon_persen: '',
      diskon: inputVal
    });
  };

  const handleBonusChange = (itemPesanan, valueQty) => {
    const bonus = valueQty === "" ? "" : Math.max(0, Math.floor(Number(valueQty)));
    const rasioUtama = Number(itemPesanan.rasio_ke_pcs || 1);
    const rasioBonus = getRasioBonus(itemPesanan);

    const pcsBeli = Number(itemPesanan.jumlah || itemPesanan.qty || 0) * rasioUtama;
    const pcsBonus = Number(bonus || 0) * rasioBonus;
    const totalPcs = pcsBeli + pcsBonus;

    if (bonus !== "" && totalPcs > Number(itemPesanan.stok_pcs)) {
      alert(`Stok tidak cukup! Beli + bonus butuh ${totalPcs} PCS, stok tersedia ${itemPesanan.stok_pcs} PCS.`);
      return;
    }

    updateItemPesanan(itemPesanan.kode_barang, { qty_bonus: bonus });
  };

  const handleSatuanBonusChange = (idSatuanBonus, itemPesanan) => {
    const satuanBonusTerpilih = itemPesanan.list_satuan?.find(
      (s) => Number(s.id_satuan || s.id) === Number(idSatuanBonus)
    );

    if (!satuanBonusTerpilih) return;

    const rasioUtama = Number(itemPesanan.rasio_ke_pcs || 1);
    const rasioBonusBaru = Number(satuanBonusTerpilih.rasio_ke_pcs || 1);

    const pcsBeli = Number(itemPesanan.jumlah || itemPesanan.qty || 0) * rasioUtama;
    const pcsBonus = Number(itemPesanan.qty_bonus || 0) * rasioBonusBaru;
    const totalPcs = pcsBeli + pcsBonus;

    if (totalPcs > Number(itemPesanan.stok_pcs)) {
      alert(`Stok tidak cukup dengan satuan bonus ini! Total butuh ${totalPcs} PCS, stok tersedia ${itemPesanan.stok_pcs} PCS.`);
      return;
    }

    updateItemPesanan(itemPesanan.kode_barang, {
      id_satuan_bonus: satuanBonusTerpilih.id_satuan || satuanBonusTerpilih.id,
      nama_satuan_bonus: satuanBonusTerpilih.nama_satuan,
      rasio_bonus_ke_pcs: rasioBonusBaru
    });
  };

  function hapus(itemParams) {
    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.filter(
        (item) => item.kode_barang !== itemParams.kode_barang
      )
    }));
  }

  const totalSeluruhPesanan = dataInputBarang?.ListPesanan?.reduce(
    (acc, item) => acc + (Number(item.subtotal) || 0), 0
  ) || 0;

  return (
    <main className="w-full max-w-6xl mx-auto p-4 -mt-15 sm:p-6 md:p-8 space-y-5 sm:space-y-6">

      {/* DAFTAR PESANAN CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* HEADER SECTION & TOMBOL BUKA MODAL */}
        <div className="px-4 sm:px-6 py-4 border-b border-emerald-100 bg-emerald-50/60 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                Daftar Pesanan
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
                Atur satuan dan jumlah barang transaksi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none h-11 sm:h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Tambah Bonus Barang Luar</span>
            </button>

            <span className="shrink-0 h-11 sm:h-10 px-3.5 inline-flex items-center text-sm font-semibold bg-white text-emerald-700 rounded-xl border border-emerald-200">
              {dataInputBarang?.ListPesanan?.length ?? 0} Item
            </span>
          </div>
        </div>

        {/* LIST ITEMS (scroll internal hanya di layar besar, di mobile ikut scroll halaman) */}
        <div className={`${dataInputBarang?.ListPesanan?.length === 0 ? 'hidden' : 'flex'} flex-col gap-3 lg:max-h-[630px] lg:overflow-y-auto p-3 sm:p-5 bg-slate-50/50`}>
          {dataInputBarang?.ListPesanan?.length > 0 ? (
            dataInputBarang.ListPesanan.map((item, index) => (
              <div
                key={item.kode_barang || index}
                className={`${item.is_bonus_luar ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:border-emerald-300'} p-4 sm:p-5 rounded-xl border shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-8`}
              >

                {/* ===== KIRI: INFO BARANG ===== */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200 shrink-0">
                      {item.kode_barang}
                    </span>
                    {item.is_bonus_luar && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                        Bonus Luar (HANYA BONUS!)
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug break-words">
                      {item.nama_barang}
                    </h3>
                    <div className="mt-1.5 flex items-center text-xs sm:text-sm">
                      {item.stok_pcs > 10 ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          Stok: {item.stok_pcs} pcs
                        </span>
                      ) : item.stok_pcs == 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                          Stok habis, Tidak bisa proses barang ini!
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          Stok: {item.stok_pcs} pcs (Segera Restok)
                        </span>
                      )}
                    </div>
                  </div>

                  {!item.is_bonus_luar && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                      <label className="text-xs sm:text-sm font-medium text-slate-600">Satuan Beli</label>
                      <select
                        value={item.id_satuan ?? ''}
                        onChange={(e) => ganti_satuan(e.target.value, item)}
                        className="w-full sm:w-auto sm:min-w-[260px] h-11 sm:h-10 px-3 text-base sm:text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all cursor-pointer"
                      >
                        {item.list_satuan?.map((satuan) => (
                          <option
                            key={satuan.id_satuan || satuan.id}
                            value={satuan.id_satuan || satuan.id}
                            disabled={satuan.is_active_satuan == 0}
                          >
                            {satuan.nama_satuan} ({satuan.jumlah_konversi || satuan.rasio_ke_pcs || 1} PCS) - Rp {Number(satuan.harga_jual).toLocaleString('id-ID')}
                            {satuan.is_active_satuan == 0 ? ' (Nonaktif)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* BONUS FLEKSIBEL */}
                  {item?.ada_fitur_bonus == 1 && (
                    <div
                      className={`flex items-center gap-2 flex-wrap p-3 rounded-xl border transition-colors ${Number(item.qty_bonus) > 0
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-slate-50 border-slate-200'
                        }`}
                    >
                      <label className="flex-1 text-xs sm:text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                        Bonus
                      </label>

                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-amber-800 border border-amber-200">
                        Gratis · Rp 0
                      </span>

                      <div className="w-full flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          placeholder="0"
                          value={item.qty_bonus ?? ''}
                          onChange={(e) => handleBonusChange(item, e.target.value)}
                          className="w-20 h-11 sm:h-10 px-2 text-base sm:text-sm font-semibold text-center text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                        />

                        <select
                          value={item.id_satuan_bonus || item.id_satuan}
                          onChange={(e) => handleSatuanBonusChange(e.target.value, item)}
                          className="flex-1 min-w-0 sm:flex-none sm:w-44 h-11 sm:h-10 px-2 text-base sm:text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 cursor-pointer"
                        >
                          {item.list_satuan?.map((satuan) => (
                            <option
                              key={satuan.id_satuan || satuan.id}
                              value={satuan.id_satuan || satuan.id}
                              disabled={satuan.is_active_satuan == 0}
                            >
                              {satuan.nama_satuan} ({satuan.rasio_ke_pcs || 1} PCS)
                              {satuan.is_active_satuan == 0 ? ' (Nonaktif)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* ===== KANAN: QTY, DISKON, SUBTOTAL, HAPUS ===== */}
                {!item.is_bonus_luar && (
                  <div className="flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-8 lg:w-[22rem] shrink-0">
                    <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2.5">
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-slate-600 mb-1">Qty Beli</label>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={item.jumlah ?? item.qty ?? 0}
                          onChange={(e) => edit_jumlah_pesanan(e, item)}
                          className="w-full h-11 px-2 text-base font-semibold text-center text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-slate-600 mb-1">Disk (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            inputMode="decimal"
                            placeholder="0"
                            value={item.diskon_persen ?? ''}
                            onChange={(e) => handleDiskonPersenChange(item, e.target.value)}
                            className="w-full h-11 pl-2 pr-6 text-base font-semibold text-right text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-slate-600 mb-1">Disk (Rp)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">Rp</span>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            placeholder="0"
                            value={item.diskon ?? ''}
                            onChange={(e) => handleDiskonRupiahChange(item, e.target.value)}
                            className="w-full h-11 pl-8 pr-2 text-base font-semibold text-right text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs text-slate-500 block">Subtotal</span>
                        <span className="text-lg sm:text-xl font-bold text-slate-900 block truncate tabular-nums">
                          Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}
                        </span>
                        {Number(item.qty_bonus) > 0 && (
                          <span className="text-xs font-medium text-amber-700 block">
                            + {Number(item.qty_bonus)} {item.nama_satuan_bonus || item.nama_satuan} bonus
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => hapus(item)}
                        className="h-11 px-4 text-sm font-semibold text-rose-600 bg-white hover:bg-rose-50 active:bg-rose-100 border border-rose-200 rounded-lg shrink-0 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
                        </svg>
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-16 text-center space-y-2">
              <p className="text-base font-semibold text-slate-600">Belum ada pesanan</p>
            </div>
          )}
        </div>

        {/* FOOTER SUMMARY */}
        {dataInputBarang?.ListPesanan?.length > 0 && (
          <div className="px-4 sm:px-6 py-4 border-t border-emerald-100 bg-emerald-50/60 flex items-center justify-between gap-4">
            <span className="text-sm sm:text-base font-semibold text-slate-700">Total Pembayaran</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-700 tabular-nums">
              Rp {totalSeluruhPesanan.toLocaleString('id-ID')}
            </span>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* POPUP MODAL PENCARIAN BARANG (bottom sheet di mobile) */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] pb-[env(safe-area-inset-bottom)] animate-in fade-in zoom-in-95 duration-150">

            {/* Handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-2 shrink-0">
              <span className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/60 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                  Cari & Tambah Barang Bonus
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih barang dari master database untuk dijadikan bonus
                </p>
              </div>

              <button
                type="button"
                aria-label="Tutup"
                onClick={() => {
                  setIsModalOpen(false);
                  setHasilCari([]);
                  setInputCari('');
                }}
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-emerald-100 active:bg-emerald-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Form Input Cari dalam Modal */}
            <div className="p-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Ketik nama atau kode barang..."
                  value={inputCari}
                  onChange={(e) => setInputCari(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCariBarang();
                    }
                  }}
                  className="flex-1 min-w-0 h-11 px-3.5 text-base sm:text-sm font-medium border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                />
                <button
                  type="button"
                  onClick={handleCariBarang}
                  disabled={isSearching}
                  className="px-5 h-11 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                >
                  {isSearching ? 'Mencari...' : 'Cari'}
                </button>
              </div>
            </div>

            {/* List Hasil Pencarian dalam Modal */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {hasilCari.length > 0 ? (
                hasilCari.map((barang, idx) => (
                  <div
                    key={barang.kode_barang || idx}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-emerald-50/50 px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {barang.kode_barang}
                        </span>
                        <span className="text-xs font-medium text-emerald-700">
                          Stok: {barang.stok_pcs || 0} PCS
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-800 text-sm mt-1 truncate">
                        {barang.nama_barang}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => tambahBarangBonusManual(barang)}
                      className="h-10 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-lg transition-colors shrink-0 cursor-pointer"
                    >
                      + Pilih Sebagai Bonus
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-1">
                  <p className="text-sm font-medium">
                    {isSearching ? 'Sedang memuat data...' : 'Ketik nama barang dan klik Cari'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setHasilCari([]);
                  setInputCari('');
                }}
                className="h-11 sm:h-10 px-5 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                Batal
              </button>
            </div>

          </div>
        </div>
      )}

    </main>

  );
}