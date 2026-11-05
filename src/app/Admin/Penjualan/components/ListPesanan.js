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

    if(isBonus == 0) {
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
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* HEADER SECTION & TOMBOL BUKA MODAL */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              Daftar Pesanan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
              Atur satuan dan jumlah barang transaksi
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Tambah Bonus Barang Luar</span>
            </button>

            <span className="shrink-0 px-3 py-1 text-xs sm:text-sm font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              {dataInputBarang?.ListPesanan?.length ?? 0} Item
            </span>
          </div>
        </div>

        {/* SCROLLABLE LIST ITEMS */}
        <div className={`${dataInputBarang?.ListPesanan?.length === 0 ? 'hidden' : 'block'} flex flex-col gap-10 max-h-[630px] overflow-y-auto divide-y divide-slate-100 p-3 sm:p-5 space-y-4 sm:space-y-0`}>
          {dataInputBarang?.ListPesanan?.length > 0 ? (
            dataInputBarang.ListPesanan.map((item, index) => (
              <div
                key={item.kode_barang || index}
                className={`${item.is_bonus_luar ? 'bg-purple-50':'bg-white'} p-3.5 sm:p-4 rounded-xl hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-200/60 lg:border-transparent my-2 sm:my-0`}
              >
                
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200 shrink-0">
                      {item.kode_barang}
                    </span>
                    {item.is_bonus_luar && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-800 rounded-md border border-violet-200 uppercase">
                        Bonus Luar (HANYA BONUS!)
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
                    {item.nama_barang}
                    <div className="mt-1.5 flex items-center text-xs sm:text-sm">
                      {item.stok_pcs > 10 ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          Stok: {item.stok_pcs} pcs
                        </span>
                      ) : item.stok_pcs == 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold animate-pulse">
                          Stok habis, Tidak bisa proses barang ini!
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-1.5 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          Stok: {item.stok_pcs} pcs (Segera Restok)
                        </span>
                      )}
                    </div>
                  </h3>

                  <div className={` ${item.is_bonus_luar ? 'hidden':'block'} flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 pt-1`}>
                    <label className="text-xs sm:text-sm font-semibold text-slate-500">Satuan Beli:</label>
                    <select
                      value={item.id_satuan ?? ''}
                      onChange={(e) => ganti_satuan(e.target.value, item)}
                      className="w-full sm:w-auto h-10 px-3 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                    >
                      {item.list_satuan?.map((satuan) => (
                        <option key={satuan.id_satuan || satuan.id} value={satuan.id_satuan || satuan.id}>
                          {satuan.nama_satuan} ({satuan.jumlah_konversi || satuan.rasio_ke_pcs || 1} PCS) - Rp {Number(satuan.harga_jual).toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* BONUS FLEKSIBEL */}
                  <div
                    className={`${item?.ada_fitur_bonus == 1 ? 'block' : 'hidden'} mt-2 flex items-center gap-2 flex-wrap p-2.5 rounded-xl border transition-colors ${
                      Number(item.qty_bonus) > 0
                        ? 'bg-violet-50 border-violet-300'
                        : 'bg-violet-50/40 border-violet-200/70'
                    }`}
                  >
                    <label className="text-xs sm:text-sm font-bold text-violet-700 flex items-center gap-1.5">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                      Bonus:
                    </label>

                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.qty_bonus ?? ''}
                      onChange={(e) => handleBonusChange(item, e.target.value)}
                      className="w-16 h-9 px-2 text-sm font-bold text-center text-violet-800 bg-white border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                    />

                    <select
                      value={item.id_satuan_bonus || item.id_satuan}
                      onChange={(e) => handleSatuanBonusChange(e.target.value, item)}
                      className="h-9 px-2 text-xs font-bold text-violet-800 bg-white border border-violet-300 rounded-lg focus:outline-none cursor-pointer"
                    >
                      {item.list_satuan?.map((satuan) => (
                        <option key={satuan.id_satuan || satuan.id} value={satuan.id_satuan || satuan.id}>
                          {satuan.nama_satuan} ({satuan.rasio_ke_pcs || 1} PCS)
                        </option>
                      ))}
                    </select>

                    <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                      Gratis · Rp 0
                    </span>
                  </div>
                </div>

                <div className={`${item.is_bonus_luar ? 'hidden':'block'} flex flex-col sm:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-3 sm:gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0`}>
                  <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3">
                    <div className={`  flex flex-col items-start sm:items-center`}>
                      <label className="text-xs font-bold text-slate-600 mb-1">Qty Beli</label>
                      <input
                        type="number"
                        min="0"
                        value={item.jumlah ?? item.qty ?? 0}
                        onChange={(e) => edit_jumlah_pesanan(e, item)}
                        className="w-full sm:w-20 h-10 px-2 text-sm sm:text-base font-bold text-center text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className={`${item.is_bonus_luar ? 'hidden':'block'} flex flex-col items-start sm:items-center`}>
                      <label className="text-xs font-bold text-rose-600 mb-1">Disk (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={item.diskon_persen ?? ''}
                        onChange={(e) => handleDiskonPersenChange(item, e.target.value)}
                        className="w-full sm:w-16 h-10 p-1 text-center text-xs sm:text-sm font-bold text-rose-700 bg-rose-50/50 border border-rose-300 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className={`${item.is_bonus_luar ? 'hidden':'block'} flex flex-col items-start sm:items-center`}>
                      <label className="text-xs font-bold text-rose-600 mb-1">Disk (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.diskon ?? ''}
                        onChange={(e) => handleDiskonRupiahChange(item, e.target.value)}
                        className="w-full sm:w-24 h-10 p-1 text-center text-xs sm:text-sm font-bold text-rose-700 bg-rose-50/50 border border-rose-300 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right min-w-[100px]">
                      <span className="text-[11px] text-slate-400 block uppercase font-semibold">Subtotal</span>
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 block truncate">
                        Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}
                      </span>
                      {Number(item.qty_bonus) > 0 && (
                        <span className="text-[11px] font-bold text-violet-600 block">
                          + {Number(item.qty_bonus)} {item.nama_satuan_bonus || item.nama_satuan} bonus
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => hapus(item)}
                      className="h-10 px-3.5 text-xs sm:text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg shrink-0 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center space-y-2">
              <p className="text-base font-bold text-slate-600">Belum ada pesanan</p>
            </div>
          )}
        </div>

        {/* FOOTER SUMMARY */}
        {dataInputBarang?.ListPesanan?.length > 0 && (
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-4">
            <span className="text-sm sm:text-base font-bold text-slate-700">Total Pembayaran</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600">
              Rp {totalSeluruhPesanan.toLocaleString('id-ID')}
            </span>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* FIXED INSET-0 POPUP MODAL PENCARIAN BARANG */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Cari & Tambah Barang Bonus
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih barang dari master database untuk dijadikan bonus
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setHasilCari([]);
                  setInputCari('');
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer font-bold"
              >
                ✕
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
                  className="flex-1 h-11 px-3.5 text-sm font-semibold border border-slate-300 rounded-xl bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                />
                <button
                  type="button"
                  onClick={handleCariBarang}
                  disabled={isSearching}
                  className="px-6 h-11 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center"
                >
                  {isSearching ? 'Mencari...' : 'Cari'}
                </button>
              </div>
            </div>

            {/* List Hasil Pencarian dalam Modal */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {hasilCari.length > 0 ? (
                hasilCari.map((barang, idx) => (
                  <div
                    key={barang.kode_barang || idx}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-violet-50/50 px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {barang.kode_barang}
                        </span>
                        <span className="text-xs font-semibold text-emerald-700">
                          Stok: {barang.stok_pcs || 0} PCS
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mt-1 truncate">
                        {barang.nama_barang}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => tambahBarangBonusManual(barang)}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition-all shrink-0 active:scale-95 cursor-pointer shadow-xs"
                    >
                      + Pilih Sebagai Bonus
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-1">
                  <p className="text-sm font-semibold">
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
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
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