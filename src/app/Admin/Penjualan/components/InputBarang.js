'use client'

import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";
import { useContext, useEffect } from "react";

export function InputBarang() {
  const { dataInputBarang, setDataInputBarang, inputCariBarang, setInputCariBarang, setLoading } = useContext(Konteks);

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
      tampilkanToast(err?.response?.data?.message || 'Terjadi Kesalahan!', 'error')
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

      // Satuan Aktif
      id_satuan: satuanDefault.id_satuan,
      nama_satuan: satuanDefault.nama_satuan,
      harga_satuan: satuanDefault.harga_jual,
      rasio_ke_pcs: satuanDefault.rasio_ke_pcs,

      jumlah: 1,
      subtotal: satuanDefault.harga_jual * 1
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

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header & Search Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Input Barang</h1>
          <p className="text-xs text-slate-500 mt-1">Cari dan tambahkan barang ke daftar penjualan</p>
        </div>

        {/* Form Cari */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              placeholder="Masukkan nama barang... (Contoh: ALE-ALE Orange)"
              value={inputCariBarang}
              onChange={(e) => setInputCariBarang(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cari()}
              type="text"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={cari}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
          >
            Cari
          </button>
        </div>
      </div>

      {/* Hasil Filter Barang */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Hasil Pencarian
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {dataInputBarang?.ItemBarang?.length || 0} Barang Ditemukan
          </span>
        </div>

        {/* Container Scrollable */}
        <div className="max-h-[450px] overflow-y-auto p-4 divide-y divide-slate-100">
          {dataInputBarang?.ItemBarang?.length > 0 ? (
            dataInputBarang.ItemBarang.map((item, index) => {
              // Kalkulasi range harga satuan untuk display UI
              const listHarga = item.list_satuan?.map(s => s.harga_jual) || [0];
              const minHarga = Math.min(...listHarga);
              const maxHarga = Math.max(...listHarga);

              return (
                <div
                  key={item.kode_barang || index}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-3 rounded-lg transition-colors"
                >
                  {/* Informasi Barang */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                        {item.kode_barang}
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-slate-800 leading-snug">
                      {item.nama_barang}
                    </h2>

                    {/* Display Range Harga Satuan */}
                    <p className="text-xs font-bold text-indigo-600">
                      {minHarga === maxHarga
                        ? `Rp ${minHarga.toLocaleString('id-ID')}`
                        : `Rp ${minHarga.toLocaleString('id-ID')} - Rp ${maxHarga.toLocaleString('id-ID')}`
                      }
                      <span className="text-[10px] font-normal text-slate-400 ml-1">
                        ({item.list_satuan?.map(s => s.nama_satuan).join(', ')})
                      </span>
                    </p>

                    <p className="text-xs font-semibold text-slate-500">
                      Stok Fisik: <span className="text-emerald-600 font-bold">{item.stok_pcs} PCS</span>
                    </p>
                  </div>

                  {/* Aksi */}
                  <div className="flex sm:flex-col justify-end">
                    <button
                      onClick={() => tambah_pesanan(item)}
                      className="w-full sm:w-auto px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400 font-medium">Belum ada data barang yang ditampilkan</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}