'use client'

import { ListPesanan } from "@/app/Admin/Penjualan/components/ListPesanan"
import { useState,useEffect } from "react"
import { createContext } from "react"


export const Konteks = createContext()

function Global({children}){

  // AUTH //
  

  // STATE BARANG //
  const [DetailBarang , setDetailBarang] = useState({
    DataBarang:null,
    CloseEdit:false,
    CloseTambahBarang:false
  }) 

  const [Barang , setBarang] = useState([]); // data barang di listbarang
   
   // STATE FORM EDIT DATA BARANG.JS //
  const [formEditBarang , setFormEditBarang] = useState({
    harga_dasar:"",
    harga_jual:"",
    persentase_diskon_distributor:"",
    persentase_fee_harga_jual:'',
  })



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
    loadingGlobal:false,
    loadingRequest:false,
    toast:false
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
        setLoading
       
      }
      }>
      {children}      
    </Konteks.Provider>
  )
}


export default Global;