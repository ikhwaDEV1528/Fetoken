'use client'

import { ListPesanan } from "@/app/Admin/Penjualan/components/ListPesanan"
import { useState,useEffect } from "react"
import { createContext } from "react"


export const Konteks = createContext()

function Global({children}){

  // AUTH //
  const [auth , setAuth] = useState({
    csrfToken:null,
    username:''
  })

  // STATE BARANG //
  const [DetailBarang , setDetailBarang] = useState({
    DataBarang:null,
    CloseEdit:false,
    CloseTambahBarang:false
  }) 

  const [Barang , setBarang] = useState([]); // data barang di listbarang
  
  const [dataPelanggan , setDataPelanggan] = useState({
    masterPelanggan:[],
    filterPelanggan:[]
  }) // untuk simpan data pelanggan di menu pelanggan;
  
   
   // STATE FORM EDIT DATA BARANG.JS //
  const [formEditBarang , setFormEditBarang] = useState({
    harga_dasar:"",
    harga_jual:"",
    persentase_diskon_distributor:"",
    persentase_fee_harga_jual:'',
  })


  const [formPelanggan, setFormPelanggan] = useState({
        nama_pelanggan: '',
        no_hp: '',
        alamat: '',
        kode_pelanggan:''
  });



 // STATE INPUT BARANG  untuk Penjualan.js dan Belanja.js//
 const [dataInputBarang , setDataInputBarang] = useState({
    ListPesanan:[], // Simpan data barang yang di tambahkan dari hasil pencarian barang
    ItemBarang:[]  // simpan data hasil pencarian Barang 
 })



 //  FAKTUR  UNTUK VALUE BELANJA BARANG//
  const [faktur , setFaktur] = useState({
         dataCariSupplier:[],
         dataSupplier:null,
         tanggal_belanja:"",
         no_faktur:'',
         diskon_faktur:0
     })

  const [inputCariSuplier , setInputCariSuplier] = useState('')
  const [inputCariBarang , setInputCariBarang] = useState('')
 

  ////
  const [loading , setLoading] = useState({
    loadingGlobal:false, // buat loading verivikasi token hak akses
    loadingRequest:false, // buat loading setiap request
    toast:false, // buat notif toast //
    timeout:false, // buat timeout loading,
    isTambahPelanggan:false,
    isEditPelanggan:false // triger panel tambah pelanggan
  })
 


   

  return(
    <Konteks.Provider value={
      { DetailBarang,
        setDetailBarang,
        formEditBarang,
        setFormEditBarang,
        Barang,
        setBarang,
        dataInputBarang,
        setDataInputBarang,
        faktur,
        setFaktur,
        inputCariSuplier,
        setInputCariSuplier,
        inputCariBarang,
        setInputCariBarang,
        loading,
        setLoading,
        auth,
        setAuth,
        dataPelanggan,
        setDataPelanggan,
        setFormPelanggan,
        formPelanggan
      }
      }>
      {children}      
    </Konteks.Provider>
  )
}


export default Global;