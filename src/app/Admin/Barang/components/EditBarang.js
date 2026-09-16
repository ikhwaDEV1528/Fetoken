

'use client'

import { Konteks } from "@/GlobalNilai/Global"
import { LoadingRequest } from "@/UI/Loading/LoadingRequest";
import axios from "axios";
import { useContext } from "react";

export function EditBarang() {
  const { DetailBarang, setDetailBarang, formEditBarang, setFormEditBarang, setBarang, setLoading } = useContext(Konteks);

  // ==========================================
  // KALKULASI REAL-TIME HPP & MODAL SATUAN
  // ==========================================
  const hargaDasar = parseFloat(formEditBarang.harga_dasar) || 0;
  const discDist = parseFloat(formEditBarang.persentase_diskon_distributor) || 0;

  // 1. Modal Bersih Karton (setelah diskon distributor)
  const modalBersihKarton = hargaDasar - (hargaDasar * (discDist / 100));

  // 2. Ambil total isi karton (default ke 1 jika tidak ada)
  const totalPcsPerKarton = parseFloat(formEditBarang.list_satuan?.[0]?.rasio_ke_pcs) || 1;

  // 3. HPP per PCS
  const hppPerPcs = totalPcsPerKarton > 0 ? modalBersihKarton / totalPcsPerKarton : 0;

  // 4. Cari Item PACK & PCS dari list_satuan
  const packItem = formEditBarang.list_satuan?.find((item) => item?.level === 2 || item?.nama_satuan === 'PACK');
  const pcsItem = formEditBarang.list_satuan?.find((item) => item?.level === 1 || item?.nama_satuan === 'PCS');

  // 5. Hitung Modal per Satuan & Status Rugi Real-Time
  const rasioPack = parseFloat(packItem?.rasio_ke_pcs) || 10; // Default rasio pack (misal 10 pcs)
  const modalPack = hppPerPcs * rasioPack;
  const isPackRugi = packItem?.harga_jual > 0 && packItem?.harga_jual < modalPack;

  const rasioPcs = parseFloat(pcsItem?.rasio_ke_pcs) || 1;
  const modalPcs = hppPerPcs * rasioPcs;
  const isPcsRugi = pcsItem?.harga_jual > 0 && pcsItem?.harga_jual < modalPcs;

  // ==========================================
  // FUNGSI SIMPAN
  // ==========================================
  async function Simpan() {
    if (!DetailBarang?.DataBarang) {
      return alert('Sepertinya ada masalah: Data barang tidak ditemukan');
    }

    const fee = parseFloat(formEditBarang.persentase_fee_harga_jual) || 0;
    const modalBersih = hargaDasar - (hargaDasar * (discDist / 100));
    const hargaJualHitung = Math.round(modalBersih * (1 + (fee / 100)));
    const marginHitung = Math.round(hargaJualHitung - modalBersih);

    const payloadFormUser = {
      ...formEditBarang,
      harga_jual: hargaJualHitung,
      margin: marginHitung
    };

    try {
      setLoading(prev => ({ ...prev, loadingRequest: true }));

      const API = '/api-be/SERVER_BARANG/UPDATE_BARANG';
      const ress = await axios.put(
        API,
        { dataBarang: DetailBarang.DataBarang, formUser: payloadFormUser },
        { withCredentials: true }
      );

      // Update State Barang
      setBarang(prev => prev.map((item) => {
        if (item.kode_barang === DetailBarang?.DataBarang?.kode_barang) {
          return {
            ...item,
            harga_dasar: payloadFormUser.harga_dasar,
            harga_jual_produk_ke_pelanggan: payloadFormUser.harga_jual,
            margin: payloadFormUser.margin,
            persentase_diskon_distributor: payloadFormUser.persentase_diskon_distributor,
            persentase_fee_harga_jual: payloadFormUser.persentase_fee_harga_jual,
            list_satuan: formEditBarang.list_satuan?.map(satuan => {
              if (satuan.level === 3 || satuan.nama_satuan === 'KARTON') {
                return { ...satuan, harga_jual: hargaJualHitung };
              }
              return satuan;
            }) || []
          };
        }
        return item;
      }));

      // Reset Form & Tutup Modal
      setFormEditBarang({
        kode_barang: DetailBarang?.DataBarang?.kode_barang || "",
        harga_dasar: "",
        harga_jual: "",
        margin: "",
        persentase_diskon_distributor: "",
        persentase_fee_harga_jual: "",
        list_satuan: []
      });

      setDetailBarang(prev => ({ ...prev, CloseEdit: false }));

      // Set pesan sukses ke state toast (jika state toast kamu menyimpan pesan)
      const pesanSukses = 'Berhasil edit barang' + (ress.data.warning ? `\n${ress.data.warning}` : '');
      tampilkanToast(pesanSukses, 'success');

    } catch (err) {
      const pesanGagal = err?.response?.data?.message || 'Internal server bermasalah coba lagi!';
      tampilkanToast(pesanGagal, 'error');
    } finally {
      // Matikan loading request
      setLoading(prev => ({ ...prev, loadingRequest: false }));
    }
  }

  // Helper Function untuk Handle Timer Toast secara terpisah
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
    <>
      <LoadingRequest />
      <main className={`${DetailBarang.CloseEdit ? 'flex' : 'hidden'} fixed inset-0 z-50 items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-300`}>
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 transition-all">

          {/* Header */}
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Edit Data
                </span>
                <h1 className="mt-1 text-lg font-bold text-slate-800 tracking-tight">
                  {DetailBarang?.DataBarang?.nama_barang || "Edit Barang"}
                </h1>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Perbarui parameter harga dan potongan distributor barang.
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Harga Dasar Karton<span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <span className="text-xs font-semibold text-slate-400">Rp</span>
                  </div>
                  <input
                    onChange={(e) => setFormEditBarang(prev => ({ ...prev, harga_dasar: e.target.value }))}
                    type="number"
                    value={formEditBarang.harga_dasar || ""}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-medium"
                  />
                </div>
              </div>

              {/* <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Satuan <span className="text-red-500">*</span>
              </label>
              <input 
                onChange={(e)=> setFormEditBarang(prev => ({...prev, satuan: e.target.value}))}
                type="text" 
                value={formEditBarang.satuan || ""}
                placeholder="Contoh: KARTON, PCS, DUS" 
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-medium uppercase"
              />
            </div> */}
            </div>

            <div className="h-px w-full bg-slate-100" />

            {/* Discount & Fee Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Diskon Distributor
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    onChange={(e) => setFormEditBarang(prev => ({ ...prev, persentase_diskon_distributor: e.target.value }))}
                    type="number"
                    step="any"
                    value={formEditBarang.persentase_diskon_distributor || ""}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 pl-4 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-medium"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                    <span className="text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Fee
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    onChange={(e) => setFormEditBarang(prev => ({ ...prev, persentase_fee_harga_jual: e.target.value }))}
                    type="number"
                    step="any"
                    value={formEditBarang.persentase_fee_harga_jual || ""}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 pl-4 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-medium"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                    <span className="text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 font-sans">
              {/* Header & Informasi Karton */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Isi per Karton
                </span>
                <span className="text-sm font-extrabold text-slate-800 bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-200/60">
                  {totalPcsPerKarton} PCS
                </span>
              </div>

              {/* Info Box: Modal per PCS */}
              <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800">
                    Harga Modal per PCS
                  </span>
                  <span className="text-base font-extrabold text-emerald-700">
                    Rp {Math.round(hppPerPcs).toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-600/80 leading-tight">
                  *Dihitung otomatis dari harga dasar karton dikurangi diskon distributor dibagi jumlah PCS.
                </p>
              </div>

              {/* Dynamic Inputs: Harga Eceran (Pack & PCS) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Set Harga Jual Eceran
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Input Pack (Level 2) */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Harga jual per Pack</span>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={packItem?.harga_jual || ''}
                        onChange={(e) => setFormEditBarang(prev => ({
                          ...prev,
                          list_satuan: (prev.list_satuan || []).map(item => {
                            if (!item) return item;
                            if (item.level === 2 || item.nama_satuan === 'PACK') {
                              return { ...item, harga_jual: Number(e.target.value) || 0 };
                            }
                            return item;
                          })
                        }))}
                        className={`w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-800 border rounded-xl outline-none transition-all ${isPackRugi
                            ? 'bg-red-50 border-red-400 text-red-900 focus:ring-2 focus:ring-red-200'
                            : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                          }`}
                      />
                    </div>
                    {/* Warning Real-time PACK */}
                    {isPackRugi && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 animate-pulse">
                        ⚠️ Di bawah modal (Min: Rp {Math.ceil(modalPack).toLocaleString('id-ID')})
                      </p>
                    )}
                  </div>

                  {/* Input PCS (Level 1) */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Harga jual per PCS</span>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={pcsItem?.harga_jual || ''}
                        onChange={(e) => setFormEditBarang(prev => ({
                          ...prev,
                          list_satuan: (prev.list_satuan || []).map(item => {
                            if (!item) return item;
                            if (item.level === 1 || item.nama_satuan === 'PCS') {
                              return { ...item, harga_jual: Number(e.target.value) || 0 };
                            }
                            return item;
                          })
                        }))}
                        className={`w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-800 border rounded-xl outline-none transition-all ${isPcsRugi
                            ? 'bg-red-50 border-red-400 text-red-900 focus:ring-2 focus:ring-red-200'
                            : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                          }`}
                      />
                    </div>
                    {/* Warning Real-time PCS */}
                    {isPcsRugi && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 animate-pulse">
                        ⚠️ Di bawah modal (Min: Rp {Math.ceil(modalPcs).toLocaleString('id-ID')})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <button
              onClick={() => setDetailBarang(prev => ({ ...prev, CloseEdit: false }))}
              type="button"
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200/60 active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={() => Simpan()}
              type="button"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-green-500/30 transition-all hover:bg-green-700 active:scale-95"
            >
              Simpan Perubahan
            </button>
          </div>

        </div>
      </main>
    </>
  )
}