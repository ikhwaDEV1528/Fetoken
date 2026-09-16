'use client'
import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";
import { useContext, useEffect, useState } from "react"



export function DataFakturBelanja(){

    const {inputCariSuplier , setInputCariSuplier} = useContext(Konteks)

    const {faktur , setFaktur ,setLoading} = useContext(Konteks)

    const [formatRupiah , setFormatRupiah] = useState({
      diskon_faktur:""
    })


    async function cariSuplier() {
       if(inputCariSuplier == "") return;

       try {
         setLoading(prev => ({
          ...prev,
          loadingRequest:true
        }))
         const API = '/api-be/SERVER_SUPLIER/CARI_SUPLIER';
         const ress = await axios.get(API , {params:{
           inputCariSuplier:inputCariSuplier
         },
        withCredentials:true
        })
        setFaktur(prev => ({
            ...prev,
            dataCariSupplier:ress.data.data
        }))

        tampilkanToast(ress.data.message, 'success');
    
       } catch (err) {
          alert(err?.response?.data?.message)
          tampilkanToast(err?.response?.data?.message, 'error');
       } finally{
         setLoading(prev => ({
          ...prev,
          loadingRequest:false
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


    function PilihSupplier (item) {
      
        setInputCariSuplier(item.nama_supplier)

        setFaktur(prev => ({
            ...prev,
            dataSupplier:item
        }))

        setFaktur(prev => ({
            ...prev,
            dataCariSupplier:[]
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
       diskon_faktur: Number(angkaMurni)
      }));
    }

    useEffect(()=> {
        if(inputCariSuplier == "") {
            setInputCariSuplier("")
        }
    },[inputCariSuplier])


    return(
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50 grid grid-cols-1 md:grid-cols-3 gap-5">
  {/* No. Faktur Supplier */}
  <div className="flex flex-col">
    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
      No. Faktur Supplier
    </label>
    <input
      onChange={(e)=> setFaktur(prev => ({
        ...prev,
        no_faktur:e.target.value
      }))}
      value={faktur.no_faktur}
      type="text"
      placeholder="INV/2026/001"
      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    />
  </div>

  {/* Nama Supplier / Sales with Auto-suggestion */}
  <div className="flex flex-col relative">
    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
      Nama Supplier / Sales
    </label>
    <div className="relative flex items-center">
      <input
        type="text"
        value={inputCariSuplier}
        placeholder="PT. Sumber Makmur"
        onChange={(e) => setInputCariSuplier(e.target.value)}
        className="w-full pl-3.5 pr-16 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
      />
      <button
        onClick={() => cariSuplier()}
        className="absolute right-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-green-400 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all duration-150 shadow-sm shadow-indigo-200"
      >
        Cari
      </button>
    </div>

    {/* Suggestion Dropdown */}
    {faktur?.dataCariSupplier?.length > 0 && (
      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 max-h-48 overflow-y-auto z-20 divide-y divide-slate-50">
        {faktur?.dataCariSupplier.map((item, index) => (
          <div
            key={index}
            onClick={() => 
              PilihSupplier(item)   
            }
            className="px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 cursor-pointer transition-colors duration-150"
          >
            {item.nama_supplier} ({item.id_supplier})
          </div>
        ))}
      </div>
    )}
  </div>

  <div className="flex flex-col">
    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
      Diskon faktur
    </label>
    <input
      onChange={(e) => handleDiskonFaktur(e)}
      value={formatRupiah?.diskon_faktur || ''}
      type="text"
      placeholder="CONTOH: RP.1.400"
      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    />
  </div>

  {/* Tanggal Belanja */}
  <div className="flex flex-col">
    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
      Tanggal Belanja
    </label>
    <input
      onChange={(e) => setFaktur(prev => ({
        ...prev,
        tanggal_belanja:e.target.value
      }))}
      value={faktur.tanggal_belanja}
      type="date"
      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
    />
  </div>
  {/* <button onClick={()=> gas()}>gas</button> */}
</div>

    )
}