'use client'

import { Konteks } from "@/GlobalNilai/Global";
import { LoadingRequest } from "@/UI/Loading/LoadingRequest";
import { TimeoutNotif } from "@/UI/timeoutNotif/timeoutNotif";
import axios from "axios";
import { useContext, useState, useRef } from "react";

export function DetailPesananBarang() {
  const { dataInputBarang, setDataInputBarang, setLoading, loading } = useContext(Konteks);

  const [inputNominalPelanggan, setInputNominalPelanggan] = useState('');
  const [inputDiskonGlobal, setInputDiskonGlobal] = useState(''); // STATE DISKON GLOBAL FAKTUR
  const [ppn, setPpn] = useState(0);
  const [inputCariPelanggan, setInputCariPelanggan] = useState({
    nama_pelanggan: '',
    kode_pelanggan: ''
  });

  const [inputCariSales, setInputCariSales] = useState({
    nama_sales: '',
    id: ''
  });

  const [listPelanggan, setListPelanggan] = useState([]);
  const [listSales, setListSales] = useState([]);
  const [inputDate, setInputDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // STATE & REF KHUSUS FITUR DRAG BOTTOM SHEET (TIDAK MENGANGGU LOGIKA PENJUALAN)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);


  // 1. CARI DATA PELANGGAN
  async function cariPelanggan() {
    if (!inputCariPelanggan.nama_pelanggan.trim()) {
      return alert('Isi nama/kode pelanggan terlebih dahulu!');
    }
    try {
      setLoading(prev => ({
        ...prev,
        loadingRequest: true
      }));
      const API = '/api-be/SERVER_PELANGGAN/CARI_PELANGGAN';
      const ress = await axios.get(API, {
        params: { inputCariPelanggan: inputCariPelanggan.nama_pelanggan }
      });
      setListPelanggan(ress?.data?.data || []);
      tampilkanToast(ress?.data?.message, 'success');

    } catch (err) {
      tampilkanToast(err?.response?.data?.message || 'Ada Kesalahan', 'error');
    } finally {
      setLoading(prev => ({
        ...prev,
        loadingRequest: false
      }));
    }
  }


  async function cariSales() {
    const nama_sales = inputCariSales.nama_sales;
    const id_sales = inputCariSales.id;

    if (!nama_sales || nama_sales === "") {
      return alert('Sales wajib di inputkan untuk penjualan ini!');
    }

    try {
      const API = '/api-be/SERVER_SALES/CARI_SALES';
      const ress = await axios.get(API, {
        params: { nama_sales: nama_sales, id_sales: id_sales }
      });

      setListSales(ress?.data?.sales || []);

    } catch (err) {
      alert(err?.response?.data?.message || 'Gagal mencari sales');
    }
  }


  function tampilkanToast(message, type) {
    setLoading(prev => ({
      ...prev,
      toast: true,
      toastMessage: message,
      toastType: type
    }));

    setTimeout(() => {
      setLoading(prev => ({ ...prev, toast: false }));
    }, 7000);
  }

  // 2. HITUNG RANGKUMAN TRANSAKSI (MULTI-SATUAN & DISKON GLOBAL COMPATIBLE)
  const totalBelanja = (dataInputBarang?.ListPesanan || []).reduce((acc, item) => {
    return acc + (Number(item.subtotal) || ((Number(item.harga_satuan) || 0) * (Number(item.jumlah) || 0)));
  }, 0);

  const diskonGlobal = Number(inputDiskonGlobal) || 0;
  const totalAkhir = Math.max(0, totalBelanja - diskonGlobal); // Total belanja setelah diskon global (DPP)
  const nominalPPN = Math.round((totalAkhir * (Number(ppn) || 0)) / 100);
  const finalTotalAkhirDenganPPN = totalAkhir + nominalPPN;

  const nominalBayar = Number(inputNominalPelanggan) || 0;
  const selisih = nominalBayar - finalTotalAkhirDenganPPN;

  const sisaPiutang = selisih < 0 ? Math.abs(selisih) : 0;
  const nominalKembalian = selisih > 0 ? selisih : 0;


  // 3. PROSES PENJUALAN KE BACKEND
  async function proses() {
    const dataListBarang = dataInputBarang?.ListPesanan || [];
    const { nama_pelanggan, kode_pelanggan } = inputCariPelanggan;
    const { nama_sales, id } = inputCariSales;

    if (dataListBarang.length === 0) {
      return alert('Daftar pesanan masih kosong!');
    }
    if (!nama_pelanggan.trim()) {
      return alert('Nama pelanggan wajib diisi!');
    }
    if (sisaPiutang > 0 && !inputDate) {
      return alert('Pembayaran kurang/piutang! Wajib mengisi tanggal tenggat piutang.');
    }

    // Merapikan payload item pesanan untuk BE (Di-split jika ada bonus fleksibel)
    const payloadItems = [];

    dataListBarang.forEach(item => {
      const qtyBeli = Number(item.jumlah || item.qty || 0);
      const qtyBonus = Number(item.qty_bonus || 0);
      const rasio = Number(item.rasio_ke_pcs || 1);

      // BARIS 1: Item Beli Utama (Jika jumlah beli > 0)
      if (qtyBeli > 0) {
        payloadItems.push({
          kode_barang: item.kode_barang,
          nama_barang: item.nama_barang,
          id_satuan: item.id_satuan,
          nama_satuan: item.nama_satuan,
          harga_satuan: Number(item.harga_satuan || 0),
          diskon: Number(item.diskon || 0),
          rasio_ke_pcs: rasio,
          jumlah: qtyBeli,
          qty_bonus: 0, // Dikosongkan karena bonus dipisah ke baris tersendiri
          total_pcs: qtyBeli * rasio,
          subtotal: Number(item.subtotal || 0),
          hpp_per_unit: Number(item.hpp_per_unit || item.harga_dasar || 0)
        });
      }

      // BARIS 2: Item Bonus Fleksibel (Jika qty_bonus > 0)
      if (qtyBonus > 0) {
        const rasioBonus = Number(item.rasio_bonus_ke_pcs || item.rasio_ke_pcs || 1);
        const namaSatuanBonus = item.nama_satuan_bonus || item.nama_satuan;
        const idSatuanBonus = item.id_satuan_bonus || item.id_satuan;

        payloadItems.push({
          kode_barang: item.kode_barang,
          nama_barang: item.nama_barang,
          id_satuan: idSatuanBonus,
          nama_satuan: namaSatuanBonus,
          harga_satuan: 0, // Bonus = Gratis Rp 0
          diskon: 0,
          rasio_ke_pcs: rasioBonus,
          jumlah: 0, // Beli = 0
          qty_bonus: qtyBonus,
          total_pcs: qtyBonus * rasioBonus,
          subtotal: 0,
          hpp_per_unit: Number(item.hpp_per_unit || item.harga_dasar || 0)
        });
      }
    });


    try {
      setLoading(prev => ({
        ...prev,
        loadingRequest: true
      }));

      const API = '/api-be/SERVER_JUAL_BARANG/PROSES_PENJUALAN';

      const ress = await axios.post(API, {
        dataListBarang: payloadItems,
        nama_pelanggan,
        kode_pelanggan,
        nama_sales,
        id, // id seles
        tenggat_hutang: inputDate || null, // tanggal_pengiriman
        tanggal_pengiriman: inputDate || null,
        diskon_global: diskonGlobal, // Kirim Diskon Global Faktur
        ppn: Number(ppn) || 0, // Tarif PPN (%)
        ppn_nominal: nominalPPN, // Nominal Rupiah PPN
        grand_total: finalTotalAkhirDenganPPN, // Total include PPN
        total_belanja: totalAkhir,
        total_dibayarkan_pelanggan: nominalBayar,
        sisa_piutang: sisaPiutang,
        kembalian: nominalKembalian,
        status_pembayaran: sisaPiutang === 0 ? 'LUNAS' : 'PIUTANG'
      }, {
        withCredentials: true
      });

      alert('Berhasil memproses pesanan!');

      // Reset Form State
      setInputNominalPelanggan('');
      setInputDiskonGlobal('');
      setInputDate('');
      setPpn(0);
      setInputCariPelanggan({ nama_pelanggan: '', kode_pelanggan: '' });
      setInputCariSales({ nama_sales: '', id: '' });
      setDataInputBarang(prev => ({ ...prev, ItemBarang: [], ListPesanan: [] }));
      tampilkanToast(ress?.data?.message || 'Berhasil Proses Penjualan!', 'success');
    } catch (err) {

      tampilkanToast(err?.response?.data?.message || 'Ada kesalahan saat memproses pesanan', 'error');
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setLoading(prev => ({
          ...prev,
          timeout: true
        }));
        window.location.href = err?.response?.data?.navigasi || '/';
        return;
      }

    } finally {
      setLoading(prev => ({
        ...prev,
        loadingRequest: false
      }));
    }
  }


  // HANDLER EVENT TOUCH DRAG
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;

    if (!isCollapsed && deltaY > 0) setDragY(deltaY);
    if (isCollapsed && deltaY < 0) setDragY(deltaY);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (dragY > 40) setIsCollapsed(true);
    if (dragY < -40) setIsCollapsed(false);
    setDragY(0);
  };


  if (loading.timeout) return <TimeoutNotif isActive={true} />;


  return (
    <main className="w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 pb-52 sm:pb-40">

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Detail Pesanan Pelanggan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Informasi pembayaran & status transaksi
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">

          {/* Section Pelanggan, Sales & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* PELANGGAN DATA */}
            <div className="w-full relative space-y-1">
              <div className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600 transition-all">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                  Pelanggan
                </span>
                <div className="flex items-center gap-2">
                  <input
                    value={inputCariPelanggan.nama_pelanggan}
                    onChange={(e) => setInputCariPelanggan(prev => ({ ...prev, nama_pelanggan: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && cariPelanggan()}
                    type="text"
                    placeholder="Cari Kode atau Nama Pelanggan..."
                    className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 focus:outline-none placeholder:text-slate-400 placeholder:font-normal h-8"
                  />
                  <button
                    onClick={cariPelanggan}
                    type="button"
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer flex items-center justify-center"
                  >
                    Cari
                  </button>
                </div>
              </div>

              {/* Dropdown Hasil Pencarian */}
              {listPelanggan.length > 0 && (
                <div className="absolute z-50 w-full left-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {listPelanggan.map((item, index) => (
                    <div
                      key={item.id_pelanggan || index}
                      onClick={() => {
                        setInputCariPelanggan({
                          nama_pelanggan: item.nama_pelanggan,
                          kode_pelanggan: item.kode_pelanggan
                        });
                        setListPelanggan([]);
                      }}
                      className="p-3.5 hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {item.nama_pelanggan} ({item.kode_pelanggan})
                      </span>
                      {item.id_pelanggan && (
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-lg">
                          #{item.id_pelanggan}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DATA SALES */}
            <div className="w-full relative space-y-1">
              <div className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600 transition-all">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                  Sales
                </span>
                <div className="flex items-center gap-2">
                  <input
                    value={inputCariSales?.nama_sales}
                    onChange={(e) => setInputCariSales(prev => ({ ...prev, nama_sales: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && cariSales()}
                    type="text"
                    placeholder="Cari Kode atau Nama Sales..."
                    className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 focus:outline-none placeholder:text-slate-400 placeholder:font-normal h-8"
                  />
                  <button
                    onClick={() => cariSales()}
                    type="button"
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer flex items-center justify-center"
                  >
                    Cari
                  </button>
                </div>
              </div>

              {/* Dropdown Hasil Pencarian */}
              {listSales.length > 0 && (
                <div className="absolute z-50 w-full left-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {listSales.map((item, index) => (
                    <div
                      key={item?.id_admin || index}
                      onClick={() => {
                        setInputCariSales({
                          nama_sales: item?.username, // nama seles
                          id: item?.id_admin // id seles
                        });
                        setListSales([]);
                      }}
                      className="p-3.5 hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {item.username} ({item.id_admin}) {item.role}
                      </span>
                      {item.id_admin && (
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-lg">
                          #{item.id_admin}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TENGGAT PIUTANG / TANGGAL PENGIRIMAN */}
            <div className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600 transition-all flex flex-col justify-center sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5 block">
                Tanggal pengiriman {sisaPiutang > 0 && <span className="text-rose-500 font-bold">*</span>}
              </label>
              <input
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                type="date"
                className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 focus:outline-none cursor-pointer h-8"
              />
            </div>
          </div>

          {/* Grid Ringkasan Pembayaran & Input Bayar */}
          <div className={`${(dataInputBarang?.ListPesanan || []).length === 0 ? 'hidden' : 'block'} space-y-4`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* INPUT DISKON GLOBAL (FAKTUR) */}
              <div className="p-4 bg-rose-50/40 border border-rose-200/80 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
                  Diskon Global / Potongan (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-base font-bold text-rose-500">Rp</span>
                  <input
                    value={inputDiskonGlobal}
                    onChange={(e) => setInputDiskonGlobal(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full pl-11 pr-3 h-12 text-lg sm:text-xl font-black text-rose-700 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>

              {/* PPN */}
              <div className="p-4 bg-rose-50/40 border border-rose-200/80 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
                  PPN (%)
                </label>
                <div className="relative flex items-center">
                  <input
                    value={ppn}
                    onChange={(e) => setPpn(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full pl-4 pr-10 h-12 text-lg sm:text-xl font-black text-rose-700 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                  <span className="absolute right-3.5 text-base font-bold text-rose-500">%</span>
                </div>
              </div>

              {/* Input Nominal Bayar */}
              <div className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Total Dibayarkan Pelanggan
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-base font-bold text-slate-500">Rp</span>
                  <input
                    value={inputNominalPelanggan}
                    onChange={(e) => setInputNominalPelanggan(e.target.value)}
                    type="number"
                    placeholder="0"
                    className="w-full pl-11 pr-3 h-12 text-lg sm:text-xl font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Status Piutang & Kembalian */}
          <div className={`${nominalBayar === 0 ? 'hidden' : 'flex'} p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/70 flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
            <div>
              <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-lg mb-1.5 ${nominalKembalian > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                {nominalKembalian > 0 ? 'Kembalian' : 'Sisa Piutang'}
              </span>
              <p className={`text-2xl sm:text-3xl font-black ${nominalKembalian > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                Rp {(nominalKembalian > 0 ? nominalKembalian : sisaPiutang).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs sm:text-sm font-semibold text-slate-500">Status:</span>
              <span className={`px-4 py-1.5 text-xs sm:text-sm font-extrabold rounded-full border ${sisaPiutang === 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300/80'
                  : 'bg-amber-50 text-amber-800 border-amber-300/80'
                }`}>
                {sisaPiutang === 0 ? 'LUNAS' : 'BELUM LUNAS (PIUTANG)'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Fixed Bottom Action Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 p-0 sm:p-4 transition-all duration-300 ease-out transform ${(dataInputBarang?.ListPesanan || []).length === 0
            ? 'translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100 pointer-events-auto'
          }`}
      >
        <div className="mx-auto w-full max-w-lg pointer-events-auto">
          <div
            style={{ transform: `translateY(${dragY}px)` }}
            className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-t-3xl sm:rounded-3xl shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.15)] px-5 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 transition-all"
          >
            {/* Drag handle */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full py-2 flex flex-col items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing touch-none group"
            >
              <div className="h-1.5 w-14 rounded-full bg-slate-300 group-hover:bg-emerald-500 transition-colors" />

              {/* TULISAN ANIMASI PULSE SAAT DISUSUTKAN */}
              {isCollapsed && (
                <span className="text-xs font-bold text-emerald-600 animate-pulse tracking-wide select-none">
                  Tarik / Klik untuk membuka
                </span>
              )}
            </div>

            {/* KONTEN UTAMA */}
            <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-64 opacity-100 mt-2'
              }`}>
              <div className="flex flex-col gap-3.5">
                {/* Ringkasan Box */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ringkasan Pembayaran
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Rp {finalTotalAkhirDenganPPN.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="px-3.5 py-1.5 bg-white rounded-full border border-slate-200 shadow-xs">
                    <span className="text-xs sm:text-sm font-bold text-slate-700">
                      {dataInputBarang?.ListPesanan?.length || 0} item
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={proses}
                  className="w-full h-14 relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-base sm:text-lg font-extrabold text-white shadow-lg shadow-emerald-600/30 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Proses Pesanan</span>
                  <svg
                    className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}