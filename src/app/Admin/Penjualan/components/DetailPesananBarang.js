'use client'

import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";
import { useContext, useState } from "react";

export function DetailPesananBarang() {
  const { dataInputBarang, setDataInputBarang, setLoading } = useContext(Konteks);

  const [inputNominalPelanggan, setInputNominalPelanggan] = useState('');
  
  const [inputCariPelanggan, setInputCariPelanggan] = useState({
    nama_pelanggan: '',
    kode_pelanggan: ''
  });

  const [listPelanggan, setListPelanggan] = useState([]);
  const [inputDate, setInputDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);




  // 1. CARI DATA PELANGGAN
  async function cariPelanggan() {

    if (!inputCariPelanggan.nama_pelanggan.trim()) {
      return alert('Isi nama/kode pelanggan terlebih dahulu!');
    }
    try {
      setLoading(prev => ({
        ...prev,
        loadingRequest: true
      }))
      const API = '/api-be/SERVER_PELANGGAN/CARI_PELANGGAN';
      const ress = await axios.get(API, {
        params: { inputCariPelanggan: inputCariPelanggan.nama_pelanggan }
      });
      setListPelanggan(ress?.data?.data || []);
      tampilkanToast(ress?.data?.message, 'success')

    } catch (err) {
      tampilkanToast(err?.response?.data?.message || 'Ada Kesalahan', 'error')
    } finally {
      setLoading(prev => ({
        ...prev,
        loadingRequest: false
      }))
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
    }, 2500);
  }

  // 2. HITUNG RANGKUMAN TRANSAKSI (MULTI-SATUAN COMPATIBLE)
  const totalBelanja = (dataInputBarang?.ListPesanan || []).reduce((acc, item) => {
    return acc + (Number(item.subtotal) || (Number(item.harga_satuan || 0) * Number(item.jumlah || 0)));
  }, 0);

  const nominalBayar = Number(inputNominalPelanggan) || 0;
  const selisih = nominalBayar - totalBelanja;

  const sisaPiutang = selisih < 0 ? Math.abs(selisih) : 0;
  const nominalKembalian = selisih > 0 ? selisih : 0;





  // 3. PROSES PENJUALAN KE BACKEND
  async function proses() {
    const dataListBarang = dataInputBarang?.ListPesanan || [];
    const { nama_pelanggan, kode_pelanggan } = inputCariPelanggan;

    if (dataListBarang.length === 0) {
      return alert('Daftar pesanan masih kosong!');
    }
    if (!nama_pelanggan.trim()) {
      return alert('Nama pelanggan wajib diisi!');
    }
    if (sisaPiutang > 0 && !inputDate) {
      return alert('Pembayaran kurang/piutang! Wajib mengisi tanggal tenggat piutang.');
    }

    // Merapikan payload item pesanan untuk BE
    const payloadItems = dataListBarang.map(item => ({
      kode_barang: item.kode_barang,
      nama_barang: item.nama_barang,
      id_satuan: item.id_satuan,
      nama_satuan: item.nama_satuan,
      harga_satuan: Number(item.harga_satuan),
      rasio_ke_pcs: Number(item.rasio_ke_pcs),
      jumlah: Number(item.jumlah),
      total_pcs: Number(item.jumlah) * Number(item.rasio_ke_pcs), // Total potongan ke stok_pcs
      subtotal: Number(item.subtotal)
    }));

    try {
      setIsLoading(true);
      const API = '/api-be/SERVER_JUAL_BARANG/PROSES_PENJUALAN';

      const ress = await axios.post(API, {
        dataListBarang: payloadItems,
        nama_pelanggan,
        kode_pelanggan,
        tenggat_hutang: inputDate || null,
        total_belanja: totalBelanja,
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
      setInputDate('');
      setInputCariPelanggan({ nama_pelanggan: '', kode_pelanggan: '' });
      setDataInputBarang(prev => ({ ...prev, ItemBarang: [], ListPesanan: [] }));
      tampilkanToast(ress.data.message || 'Berhasil Proses Penjualan!', 'success')
    } catch (err) {
      tampilkanToast(err?.response?.data?.message, 'error')
      if (err.response.status == 401) {
        window.location.href = err?.response?.data?.navigasi
        return
      }
    } finally {
      setIsLoading(false);
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
    }, 2500);
  }

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800">Detail Pesanan Pelanggan</h1>
            <p className="text-xs text-slate-500 mt-0.5">Informasi pembayaran & status transaksi</p>
          </div>
        </div>

        <div className="p-5 space-y-6">

          {/* Section Pelanggan & Tenggat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* PELANGGAN DATA */}
            <div className="w-full relative space-y-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600 transition-all">
                <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block mb-1">
                  Pelanggan
                </span>
                <div className="flex items-center gap-2">
                  <input
                    value={inputCariPelanggan.nama_pelanggan}
                    onChange={(e) => setInputCariPelanggan(prev => ({ ...prev, nama_pelanggan: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && cariPelanggan()}
                    type="text"
                    placeholder="Cari Kode atau Nama Pelanggan..."
                    className="w-full bg-transparent text-sm font-medium text-slate-800 focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    onClick={cariPelanggan}
                    type="button"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    Cari
                  </button>
                </div>
              </div>

              {/* Dropdown Hasil Pencarian */}
              {listPelanggan.length > 0 && (
                <div className="absolute z-50 w-full left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
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
                      className="p-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {item.nama_pelanggan} ({item.kode_pelanggan})
                      </span>
                      {item.id_pelanggan && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                          #{item.id_pelanggan}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TENGGAT PIUTANG */}
            <div className="flex flex-col justify-center">
              <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-1">
                Tenggat Piutang Pelanggan {sisaPiutang > 0 && <span className="text-red-500">*</span>}
              </label>
              <input
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                type="date"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Grid Ringkasan Pembayaran & Input Bayar */}
          <div className={`${dataInputBarang.ListPesanan.length == 0 ? 'hidden' : 'block'} grid grid-cols-1 sm:grid-cols-2 gap-4`}>

            {/* Total Ringkasan */}
            <div className="p-4 bg-slate-900 rounded-xl text-white flex flex-col justify-between space-y-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Ringkasan Pembayaran
              </span>
              <div className="space-y-2">
                <span className="text-2xl font-extrabold text-emerald-400 tracking-tight block">
                  Rp {totalBelanja.toLocaleString('id-ID')}
                </span>
                <span className="inline-flex px-2.5 py-1 text-xs font-bold text-indigo-300 bg-slate-800 border border-slate-700 rounded-md">
                  Jumlah barang: {dataInputBarang?.ListPesanan?.length || 0} item
                </span>
              </div>
            </div>

            {/* Input Nominal Bayar */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-center">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Total Dibayarkan Pelanggan
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
                <input
                  value={inputNominalPelanggan}
                  onChange={(e) => setInputNominalPelanggan(e.target.value)}
                  type="number"
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 text-base font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

          </div>

          {/* Status Piutang & Kembalian */}
          <div className={`${nominalBayar == 0 ? 'hidden' : 'block'} p-4 rounded-xl border border-slate-200  flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
            <div className={``}>
              <span className={`${nominalKembalian > 0 ? 'bg-orange-100 text-orange-600 rounded-lg px-2 py-1 flex justify-center items-center' : 'bg-red-100 text-red-600 rounded-lg px-2 py-1'} text-xs font-medium flex justify-items items-center  block`}>
                {nominalKembalian > 0 ? 'Kembalian' : 'Sisa Piutang'}
              </span>
              <p className={`text-lg font-bold ${nominalKembalian > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                Rp {(nominalKembalian > 0 ? nominalKembalian : sisaPiutang).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Status:</span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${sisaPiutang === 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                {sisaPiutang === 0 ? 'LUNAS' : 'BELUM LUNAS (PIUTANG)'}
              </span>
            </div>
          </div>

        </div>
      </div>

      <button
        disabled={isLoading}
        onClick={proses}
        type="button"
        className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>{isLoading ? 'Memproses...' : 'Proses Transaksi'}</span>
      </button>
    </main>
  );
}