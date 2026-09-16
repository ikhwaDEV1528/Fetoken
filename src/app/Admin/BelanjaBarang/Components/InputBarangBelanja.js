'use client'

import { Konteks } from "@/GlobalNilai/Global";
import { useContext, useEffect, useState } from "react";
import axios from "axios";







export function InputBarangBelanja() {
    

    const {dataInputBarang , setDataInputBarang,inputCariBarang,setInputCariBarang,setLoading} = useContext(Konteks);

    async function cari () {
      if(inputCariBarang == "") return;
     
      try {
        setLoading(prev => ({
          ...prev,
          loadingRequest:true
        }))
        const API = '/api-be/SERVER_JUAL_BARANG/JUAL_BARANG';
        const ress = await axios.get(API , {params:{input:inputCariBarang}})
        setDataInputBarang(prev => ({...prev,ItemBarang:ress.data.Search}))
        tampilkanToast(ress.data.message , 'success')
      } catch (err) {
        tampilkanToast(err?.response?.data?.message, 'error')
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



    function tambahBarangBelanja (itemBarangBelanja) {
      if(dataInputBarang.ListPesanan.some(item => item.kode_barang == itemBarangBelanja.kode_barang)){
        return alert('Barang sudah ada di list')
      }
      // alert(JSON.stringify({...itemBarangBelanja,status:'RESTOK'}))

      setDataInputBarang(prev => ({
        ...prev,
        ListPesanan:[...prev.ListPesanan,{...itemBarangBelanja,status:'RESTOK'}]
      }))


      setDataInputBarang(prev => ({
        ...prev,
        ItemBarang: prev.ItemBarang.filter(item => item.kode_barang !==itemBarangBelanja.kode_barang)
      }))

    }

    useEffect(()=> {
        if(inputCariBarang == "") {
          setDataInputBarang(prev => ({
            ...prev,
            ItemBarang:[]
          }))
        }
    },[inputCariBarang])

    return (
       <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4 mb-6">
  {/* ROW SEARCH & TOMBOL TAMBAH */}
  <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
    {/* Input Cari & Button */}
    <div className="flex items-center gap-2 flex-1 max-w-lg">
      <div className="relative flex-1">
        <input
          onChange={(e) => setInputCariBarang(e.target.value)}
          placeholder="Cari barang (contoh: ALE-ALE)..."
          className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-700 placeholder-gray-400"
        />
      </div>
      <button
        onClick={() => cari()}
        className="px-4 py-2 bg-emerald-600 hover:bg-green-400 text-white font-semibold rounded-lg text-sm transition shadow-sm active:scale-95"
      >
        Cari
      </button>
    </div>

    {/* Tombol Barang Baru */}
   
  </div>

  {/* RESULT LIST BARANG */}
  {dataInputBarang?.ItemBarang?.length > 0 && (
    <div className="pt-2 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Hasil Pencarian (Klik untuk menambah ke list):
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
        {dataInputBarang.ItemBarang.map((item, index) => (
          <button
            key={index}
            onClick={() => tambahBarangBelanja(item)}
            className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-left transition group"
          >
            <div className="truncate mr-2">
              <p className="text-xs font-bold text-gray-700 group-hover:text-blue-700 truncate">
                {item.nama_barang}
              </p>
              <p className="text-[11px] text-gray-400">
                Kode: {item.kode_barang}
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition">
              + Pilih
            </span>
          </button>
        ))}
      </div>
    </div>
  )}
</section>
    )
}