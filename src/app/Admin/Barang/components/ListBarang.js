'use client'

import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";
import { useContext, useEffect, useState } from "react";

export function ListBarang() {


  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [loading, setLoading] = useState(false);



  const {
    setDetailBarang,
    setFormEditBarang,
    setBarang,
    Barang,
    inputCariBarang,
    isCariBarang
  } = useContext(Konteks);

  // 1. FUNGSI FETCH DATA
  async function fetchBarang(currentPage, isNewSearch = false) {
    if (loading) return;
    setLoading(true);

    try {
      const API = '/api-be/SERVER_BARANG/GET_BARANG';
      const ress = await axios.get(API, {
        params: { page: currentPage, search: inputCariBarang },
        withCredentials: true
      });



      const dataBarang = ress.data.barang || [];
      setTotalPage(ress.data.totalPage || 1);

      if (currentPage === 1 || isNewSearch) {
        setBarang(dataBarang);
      } else {
        setBarang(prev => [...prev, ...dataBarang]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Gagal mengambil data barang");
    } finally {
      setLoading(false);
    }
  }

  // 2. EFFECT PADA GANTI PAGE / SEARCH
  useEffect(() => {
    fetchBarang(page);
  }, [page]);

  // Reset ke Page 1 jika pencarian berubah
  useEffect(() => {
    if (isCariBarang) {
      setPage(1);
      fetchBarang(1, true);
    }
  }, [inputCariBarang]);

  // 3. INFINITE SCROLL HANDLER
  useEffect(() => {
    const handleScroll = () => {
      const isBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
      if (isBottom && page < totalPage && !loading) {
        setPage(prev => prev + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, totalPage, loading]);




  // 4. EKO-SYSTEM EDIT BARANG
  function Edit(itemBarang) {
    
    setFormEditBarang({
      kode_barang: itemBarang.kode_barang,
      harga_dasar: itemBarang.harga_dasar,
      harga_jual: itemBarang.harga_jual_produk_ke_pelanggan,
      persentase_diskon_distributor: itemBarang.persentase_diskon_distributor,
      persentase_fee_harga_jual: itemBarang.persentase_fee_harga_jual,
      list_satuan: itemBarang.list_satuan || [] // Menggunakan array satuan baru
    });

    setDetailBarang(prev => ({
      ...prev,
      CloseEdit: true,
      DataBarang: itemBarang
    }));
  }

  return (
    <main className="min-h-screen mt-15 bg-slate-50 py-6 px-4 md:px-8">
      <div className="max-w-md md:max-w-7xl mx-auto space-y-4 md:space-y-0">

        {/* GRID CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Barang.length === 0 && !loading ? (
            <div className="col-span-full py-12 text-center font-semibold text-red-500">
              BARANG TIDAK DITEMUKAN
            </div>
          ) : (
            Barang.map((item, index) => (
              <div
                key={`${item.kode_barang}-${index}`}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Header Card: Nama & Kode */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-slate-800 text-base leading-snug">
                      {item.nama_barang}
                    </h3>
                    <span className="shrink-0 bg-slate-100 text-slate-600 text-xs font-mono font-medium px-2 py-0.5 rounded-md">
                      {item.kode_barang}
                    </span>
                  </div>

                  {/* Section Harga Utama */}
                  <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                    {/* GRID UTAMA: HARGA MODAL & HARGA JUAL */}
                    <div className="grid grid-cols-2 gap-3 text-xs mb-2.5">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Harga Dasar
                        </span>
                        <span className="text-sm font-bold text-slate-700 block">
                          Rp {item.harga_dasar?.toLocaleString('id-ID')}
                        </span>
                        {/* Modal Bersih cukup ditampilkan tipis/subtile saja */}
                        <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                          Modal Bersih: Rp {Math.floor(item.harga_dasar - (item.harga_dasar * ((item.persentase_diskon_distributor || 0) / 100))).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Harga Jual
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 block">
                          Rp {item.harga_jual_produk_ke_pelanggan?.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* MARGIN PROFIT BAR */}
                    <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Margin Profit</span>
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        +Rp {item.margin?.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* TAMPILAN DAFTAR SATUAN BARU */}
                  <div className="mb-3">
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                      Pilihan Satuan & Harga Jual:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.list_satuan && item.list_satuan.map((satuan, idx) => (
                        <div key={idx} className="bg-slate-100 text-slate-700 text-[11px] px-2 py-1 rounded-md border border-slate-200 flex justify-between gap-2 items-center">
                          <span className="font-bold text-slate-800">{satuan.nama_satuan}</span>
                          <span className="text-emerald-700 font-semibold">
                            Rp {satuan.harga_jual?.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Card: Stok & Diskon */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500">Total Stok: </span>
                      <strong className="text-red-500 font-bold">{(() => { const list = item.list_satuan || []; const sat = list[0]; return list.length === 1 && ['KARTON', 'BALL', 'BAL', 'DUS'].includes(sat?.nama_satuan?.toUpperCase()) ? `${Math.floor((item.stok_pcs || 0) / (sat.rasio_ke_pcs || 1))} ${sat.nama_satuan}` : `${item.stok_pcs || 0} PCS`; })()}</strong>
                    </div>
                    <div className="flex gap-1.5 text-[10px]">
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        Disc dist: {item.persentase_diskon_distributor}%
                      </span>
                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                        Profit target: {Number(item.persentase_fee_harga_jual).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tombol Edit */}
                <div className="bt-edit-barang mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => Edit(item)}
                    className="bt-edit-barang  w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 active:bg-emerald-800 text-white text-sm font-semibold rounded-full transition-all duration-150 ease-out"
                  >
                    Edit Barang
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Indikator Loading */}
        {loading && (
          <div className="flex justify-center items-center py-6 gap-2 text-xs text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            Memuat data barang...
          </div>
        )}

        {page >= totalPage && Barang.length > 0 && (
          <p className="text-center text-xs text-slate-400 py-6 font-medium">
            -- Anda sudah melihat semua barang --
          </p>
        )}
      </div>
    </main>
  );
}