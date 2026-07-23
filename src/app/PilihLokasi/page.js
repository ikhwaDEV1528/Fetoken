
'use client'
import axios from "axios";
import { Alumni_Sans } from "next/font/google";
import { useContext, useEffect,useState } from "react";
import './pilihlokasi.css'
import Head from "next/head";
import { Router, useRouter } from "next/navigation";
import { Konteks } from "@/GlobalNilai/Global";
import Lottie from "lottie-react";


export default function Pembayaran(){

  const navigasi = useRouter()
  let {indikator,setindikator} = useContext(Konteks)

const droplink =  [
  {lokasi:'asal kota'},
  { lokasi: "Bekasi" },
  {  lokasi: "Semarang" },
  { lokasi: "Surabaya" },
  { lokasi: "Jakarta" },
  { lokasi: "Bandung" },
  { lokasi: "Yogyakarta" },
  { lokasi: "Solo" },
  { lokasi: "Malang" },
  { lokasi: "Tegal" },
  {lokasi:'Cirebon'}
]


const droplinkk =  [
  {lokasi:'tujuan kota'},
  { lokasi: "Bekasi" },
  {  lokasi: "Semarang" },
  { lokasi: "Surabaya" },
  { lokasi: "Jakarta" },
  { lokasi: "Bandung" },
  { lokasi: "Yogyakarta" },
  { lokasi: "Solo" },
  { lokasi: "Malang" },
  { lokasi: "Tegal" },
  {lokasi:'Cirebon'}
]

  
let {asalkota,setasalkota,tujuankota,settujuakota} = useContext(Konteks)


  

const [data,setdata] = useState([])
const [datadrop,setdatadrop] = useState([])



useEffect(()=> {
  const APIlink =  `http://localhost:5000/api/tiket`
  axios.get(APIlink)
  .then(ress => {
   const arayfilter = ress.data.datafull.map(item => [item.asal,item])
   const hasilaray = [...new Map(arayfilter).values()]
   setdatadrop(hasilaray)
   console.log(hasilaray)
  })
  .catch(err=> [
    alert(err)
  ])
},[])


function cariTiket(){
 if(asalkota =='' || asalkota =='asal kota'){
  alert('pilih asal kota')
 }

 else if(tujuankota =='' || tujuankota =='tujuan kota'){
  alert('pilih tujuan kota')
 }

 else if(tujuankota == asalkota || asalkota == tujuankota){
  alert('tidak boleh sama')
 }

 else{
  navigasi.push('/tiket')
 }
}




    return(

  <div className="container-main bg-blue-50 min-h-screen">
      
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

   
      <div className="header h-50 flex justify-center">
        <p className="">KERETA ANTAR KOTA</p>
      </div>

    <div className="container-select relative top-[-50px] left-[18px] bg-white flex flex-col items-center gap-4 h-100 rounded-md w-90">

        <div className="select flex flex-col relative top-[10px]">
          <select className="border p-3 rounded-t-lg w-[330px] relative  font-bold " onChange={(e) => setasalkota(e.target.value)}>
          {droplink.map((item, index) => (
            <option value={item.lokasi} key={index}>Dari:{item.lokasi}</option>
          ))}
          </select>
         
          <select className="border p-3 rounded-b-lg w-[330px] relative  font-bold" onChange={(e) => settujuakota(e.target.value)}>
          {droplinkk.map((item, index) => (
            <option value={item.lokasi} key={index}>Tujuan:{item.lokasi}</option>
          ))}
         </select>
       </div>

     
        <div className="flex relative gap-2 top-[25px] left-[100px]">
          <input type="checkbox" value={indikator}  className=""  onChange={(e)=> setindikator(e.target.checked)}/>
          <p className="">Pulang Pergi</p>
        </div>
       <button className="bg-blue-700 w-80 text-white p-2 rounded-lg relative top-[80px]" onClick={()=> {cariTiket()}}>Cari Tiket</button>
      
   </div>
</div>


    )
}
