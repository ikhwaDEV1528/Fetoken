'use client'

import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";
import { useContext, useEffect, useState } from "react";

export function InputBarang() {
  const { dataInputBarang, setDataInputBarang, inputCariBarang, setInputCariBarang, setLoading } = useContext(Konteks);
  
  // State lokal untuk kontrol Popup Modal Panel Overlay
  const [showModal, setShowModal] = useState(false);

  // FUNGSI CARI BARANG
  async function cari() {
    if (!inputCariBarang.trim()) return alert('Tidak boleh kosong!');

    try {
      setLoading(prev => ({
        ...prev,
        loadingRequest: true
      }))
      const API = '/api-be/SERVER_JUAL_BARANG/JUAL_BARANG';
      const ress = await axios.get(API, { params: { input: inputCariBarang } });

      const hasilCari = ress.data?.Search || [];
      if (hasilCari.length === 0) alert('Barang tidak ditemukan');

      setDataInputBarang(prev => ({ ...prev, ItemBarang: hasilCari }));

      tampilkanToast(ress.data.message, 'success')
      
    } catch (err) {
      tampilkanToast(err?.response?.data?.message || 'Terjadi kesalah server, Coba lagi!', 'error')
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
    }, 3000);
  }

  // FUNGSI TAMBAH KE PESANAN / KERANJANG
  function tambah_pesanan(barang) {
    const existPesanan = dataInputBarang.ListPesanan.some(item => item.kode_barang === barang.kode_barang);
    if (existPesanan) return alert('Barang sudah ada di daftar pesanan!');

    const listSatuan = barang.list_satuan || [];
    

    // Pilih satuan default (prioritas PCS / level 1, jika tidak ada ambil index pertama)
    const satuanDefault = listSatuan.find(s => s.level === 1 || s.nama_satuan === 'PCS') || listSatuan[0] || {
      id_satuan: null,
      nama_satuan: 'PCS',
      harga_jual: 0,
      rasio_ke_pcs: 1
    };

    // Susun payload item yang masuk ke keranjang
    const itemPesanan = {
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      stok_pcs: barang.stok_pcs,
      list_satuan: listSatuan, // Simpan array semua pilihan satuan untuk dipasang dropdown di UI Kasir
      ada_fitur_bonus:barang.ada_fitur_bonus,
      // Satuan Aktif
      id_satuan: satuanDefault.id_satuan,
      nama_satuan: satuanDefault.nama_satuan,
      harga_satuan: satuanDefault.harga_jual,
      rasio_ke_pcs: satuanDefault.rasio_ke_pcs,

      jumlah: 1,
      subtotal: satuanDefault.harga_jual
    };

    setDataInputBarang(prev => ({
      ...prev,
      ListPesanan: [...prev.ListPesanan, itemPesanan],
      ItemBarang: prev.ItemBarang.filter(item => item.kode_barang !== barang.kode_barang)
    }));
  }

  useEffect(() => {
    if (inputCariBarang === "") {
      setDataInputBarang(prev => ({ ...prev, ItemBarang: [] }));
    }
  }, [inputCariBarang, setDataInputBarang]);

  // Otomatis BUKA modal popup saat berhasil memuat data pencarian barang
  useEffect(() => {
    if (dataInputBarang?.ItemBarang?.length > 0) {
      setShowModal(true);
    }
  }, [dataInputBarang?.ItemBarang]);

  return (
    <main className="w-full max-w-6xl mx-auto p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 font-sans text-slate-800 antialiased pb-20">
      
      {/* HEADER & SEARCH SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            Input Barang
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Cari dan tambahkan barang ke daftar penjualan
          </p>
        </div>

        {/* Form Cari */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <input
              placeholder="Masukkan nama barang... (Contoh: ALE-ALE Orange)"
              value={inputCariBarang}
              onChange={(e) => setInputCariBarang(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cari()}
              type="text"
              className="w-full h-12 px-4 text-base sm:text-sm bg-slate-50/80 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={cari}
            className="w-full sm:w-auto h-12 px-7 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            Cari
          </button>
        </div>

        {/* Tombol Buka Modal Kembali (Tampil jika sudah ada hasil tapi modal ditutup) */}
        {dataInputBarang?.ItemBarang?.length > 0 && !showModal && (
          <div className="pt-2">
            <button
              onClick={() => setShowModal(true)}
              className="w-full h-11 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Klik untuk lihat Hasil Pencarian ({dataInputBarang.ItemBarang.length} Barang)</span>
            </button>
          </div>
        )}
      </div>

      {/* POPUP MODAL OVERLAY (FIXED INSET-0) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200">
          
          {/* Backdrop Click to Close */}
          <div 
            className="absolute inset-0" 
            onClick={() => setShowModal(false)} 
          />

          {/* Modal Card Panel Box */}
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col z-10">
            
            {/* Header Popup Panel */}
            <div className="px-4 sm:px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Hasil Pencarian Barang
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  Ditemukan {dataInputBarang?.ItemBarang?.length || 0} barang dari kata kunci
                </p>
              </div>

              {/* Tombol Close Popup */}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-black flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body Grid Cards (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50/50 flex-1">
              {dataInputBarang?.ItemBarang?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                  {dataInputBarang.ItemBarang.map((item, index) => {
                    // Kalkulasi range harga satuan untuk display UI
                    const listHarga = item.list_satuan?.map(s => s.harga_jual) || [0];
                    const minHarga = Math.min(...listHarga);
                    const maxHarga = Math.max(...listHarga);

                    return (
                      <div
                        key={item.kode_barang || index}
                        className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/60 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                      >
                        {/* Informasi Barang */}
                        <div className="space-y-2 min-w-0">
                          {/* Kode & Stok */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 truncate">
                              {item.kode_barang}
                            </span>
                            <span className={`${item.stok_pcs == 0 ? 'bg-red-50 text-red-800': 'text-emerald-800 bg-emerald-50'} text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 shrink-0`}>
                              {item.stok_pcs == 0 ? 'Habis':item.stok_pcs + ' PCS'} 
                            </span>
                          </div>

                          {/* Nama Barang */}
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-emerald-700 transition-colors">
                            {item.nama_barang}
                          </h3>

                          {/* Display Range Harga Satuan */}
                          <div className="space-y-0.5 pt-1.5 border-t border-slate-100">
                            <p className="text-base font-black text-emerald-600 truncate">
                              {minHarga === maxHarga
                                ? `Rp ${minHarga.toLocaleString('id-ID')}`
                                : `Rp ${minHarga.toLocaleString('id-ID')} - Rp ${maxHarga.toLocaleString('id-ID')}`
                              }
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 truncate">
                              Satuan: ({item.list_satuan?.map(s => s.nama_satuan).join(', ')})
                            </p>
                          </div>
                        </div>

                        {/* Tombol Aksi */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => tambah_pesanan(item)}
                            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span className="text-lg leading-none">+</span> Tambah
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2 bg-white rounded-2xl border border-slate-200/80 p-6">
                  <p className="text-sm sm:text-base text-slate-700 font-extrabold">Belum ada data barang yang ditampilkan</p>
                  <p className="text-xs text-slate-400 font-medium">Gunakan kolom pencarian di atas untuk menemukan barang</p>
                </div>
              )}
            </div>

            {/* Footer Modal Popup */}
            <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-11 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Tutup Panel
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}