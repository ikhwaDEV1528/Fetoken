'use client'
import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";
import { useContext, useEffect, useState } from "react"



export function DataFakturBelanja() {

  const { inputCariSuplier, setInputCariSuplier } = useContext(Konteks)

  const { faktur, setFaktur, setLoading } = useContext(Konteks)

  const [formatRupiah, setFormatRupiah] = useState({
    diskon_faktur: ""
  })


  const [ppn, setPpn] = useState(0)




  async function cariSuplier() {
    if (inputCariSuplier == "") return;

    try {
      setLoading(prev => ({
        ...prev,
        loadingRequest: true
      }))
      const API = '/api-be/SERVER_SUPLIER/CARI_SUPLIER';
      const ress = await axios.get(API, {
        params: {
          inputCariSuplier: inputCariSuplier
        },
        withCredentials: true
      })
      setFaktur(prev => ({
        ...prev,
        dataCariSupplier: ress.data.data
      }))

      tampilkanToast(ress.data.message, 'success');

    } catch (err) {
      alert(err?.response?.data?.message)
      tampilkanToast(err?.response?.data?.message, 'error');
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


  function PilihSupplier(item) {

    setInputCariSuplier(item.nama_supplier)

    setFaktur(prev => ({
      ...prev,
      dataSupplier: item
    }))

    setFaktur(prev => ({
      ...prev,
      dataCariSupplier: []
    }))
  }


  function handleDiskonFaktur(e) {
    // 1. Ambil ketikan & buang semua titik/huruf (sisa angka murni)
    const angkaMurni = e.target.value.replace(/\D/g, "");

    if (!angkaMurni) {
      setFormatRupiah(prev => ({ ...prev, diskon_faktur: "" }));
      setFaktur(prev => ({ ...prev, diskon_faktur: 0 }));
      return;
    }

    // 2. Format untuk tampilan UI (misal: 2000 -> "2.000")
    const formattedUI = Number(angkaMurni).toLocaleString('id-ID');

    setFormatRupiah(prev => ({
      ...prev,
      diskon_faktur: formattedUI
    }));

    // 3. Simpan angka murni (2000) ke state utama
    setFaktur(prev => ({
      ...prev,
      diskon_faktur: Number(angkaMurni),
    }));
  }


  function handlePpn(e) {

    if (!e.target.value || e.target.value == '') {
      return alert('ISI')
    }

    setPpn(e.target.value)

    setFaktur(prev => ({
      ...prev,
      ppn: e.target.value
    }));

  }

  useEffect(() => {
    if (inputCariSuplier == "") {
      setInputCariSuplier("")
    }
  }, [inputCariSuplier])


  return (
    <div className="w-full max-w-6xl mx-auto bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">

      {/* No. Faktur Supplier */}
      <div className="flex flex-col space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          No. Faktur Supplier
        </label>
        <input
          onChange={(e) => setFaktur(prev => ({
            ...prev,
            no_faktur: e.target.value
          }))}
          value={faktur.no_faktur}
          type="text"
          placeholder="INV/2026/001"
          className="w-full h-12 px-4 bg-slate-50/80 border border-slate-300 rounded-xl text-base sm:text-sm font-semibold text-slate-900 placeholder-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
        />
      </div>

      {/* Nama Supplier / Sales with Auto-suggestion */}
      <div className="flex flex-col relative space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Nama Supplier / Sales
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputCariSuplier}
            placeholder="PT. Sumber Makmur"
            onChange={(e) => setInputCariSuplier(e.target.value)}
            className="w-full h-12 pl-4 pr-20 bg-slate-50/80 border border-slate-300 rounded-xl text-base sm:text-sm font-semibold text-slate-900 placeholder-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
          <button
            type="button"
            onClick={() => cariSuplier()}
            className="absolute right-1.5 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-lg transition-all duration-150 shadow-xs cursor-pointer shrink-0"
          >
            Cari
          </button>
        </div>

        {/* Suggestion Dropdown */}
        {faktur?.dataCariSupplier?.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto z-30 divide-y divide-slate-100">
            {faktur?.dataCariSupplier.map((item, index) => (
              <div
                key={index}
                onClick={() => PilihSupplier(item)}
                className="px-4 py-3.5 text-sm font-semibold text-slate-800 hover:bg-indigo-50/70 hover:text-indigo-700 cursor-pointer transition-colors duration-150 flex items-center justify-between"
              >
                <span>{item.nama_supplier}</span>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  #{item.id_supplier}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diskon Faktur */}
      <div className="flex flex-col space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Diskon Faktur
        </label>
        <input
          onChange={(e) => handleDiskonFaktur(e)}
          value={formatRupiah?.diskon_faktur || ''}
          type="text"
          placeholder="CONTOH: RP.1.400"
          className="w-full h-12 px-4 bg-slate-50/80 border border-slate-300 rounded-xl text-base sm:text-sm font-bold text-rose-600 placeholder-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
        />
      </div>

      {/* PPN */}
      <div className="flex flex-col space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          PPN
        </label>
        <input
          onChange={(e) => handlePpn(e)}
          value={ppn || ''}
          type="text"
          placeholder="11%"
          className="w-full h-12 px-4 bg-slate-50/80 border border-slate-300 rounded-xl text-base sm:text-sm font-bold text-rose-600 placeholder-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
        />
      </div>

      {/* Tanggal Belanja */}
      <div className="flex flex-col space-y-1.5 sm:col-span-2 lg:col-span-1">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Tanggal Belanja
        </label>
        <input
          onChange={(e) => setFaktur(prev => ({
            ...prev,
            tanggal_belanja: e.target.value
          }))}
          value={faktur.tanggal_belanja}
          type="date"
          className="w-full h-12 px-4 bg-slate-50/80 border border-slate-300 rounded-xl text-base sm:text-sm font-semibold text-slate-900 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
        />
      </div>

    </div>
  )
}