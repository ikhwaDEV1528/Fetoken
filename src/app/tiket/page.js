'use client'  


import { Konteks } from "@/GlobalNilai/Global"
import { useState,useEffect, useContext } from "react"
import axios from "axios"
import './tiket.css'
import { useRouter } from "next/navigation"
import { Pulang } from "@/Pulang/pulang"
import Head from "next/head"
import { useFormStatus } from "react-dom"
import Lottie from "lottie-react"
import loading from './loading.json'
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";



function Latihan(){
  const [cari , setcari]= useState('')
   
// MOCK DUMMMYYYYYY  
const tiket = [
  
  {
    id: 102, asal: "Bekasi", tujuan: "Semarang", kereta: "Tawang Jaya",
    namaKereta: "Tawang Jay",
    kelas: "Ekonomi", harga: 180000,tanggal: new Date(),
    jadwal: { berangkat: "18:45", tiba: "00:20" },
    habis: false
  },
  {
    id: 103, asal: "Surabaya", tujuan: "Semarang", kereta: "Bima",
    namaKereta: "Bima",
    kelas: "Eksekutif", harga: 400000,tanggal: new Date(),
    jadwal: { berangkat: "19:22", tiba: "22:12" },
    habis: true
  },
  {
    id: 104, asal: "Surabaya", tujuan: "Bekasi", kereta: "Gumarang",
    namaKereta: "Gumarang",
    kelas: "Bisnis", harga: 300000,tanggal: new Date(),
    jadwal: { berangkat: "09:31", tiba: "15:39" },
    habis: false
  },
  {
    id: 105, asal: "Jakarta", tujuan: "Bandung", kereta: "Parahyangan",
    namaKereta: "Parahyangan",
    kelas: "Eksekutif", harga: 200000,tanggal: new Date(),
    jadwal: { berangkat: "05:10", tiba: "11:09" },
    habis: false
  },
  {
    id: 106, asal: "Yogyakarta", tujuan: "Jakarta", kereta: "Gajah Mada",
    namaKereta: "Gajah Mada",
    kelas: "Eksekutif", harga: 38000,tanggal:new Date(),
    jadwal: { berangkat: "11:00", tiba: "22:00" },
    habis: true
  },
  {
    id: 107, asal: "Bandung", tujuan: "Semarang", kereta: "Harina",
    namaKereta: "Harina",
    kelas: "Ekonomi", harga: 190000,tanggal:new Date(),
    jadwal: { berangkat: "14:00", tiba: "19:09" },
    habis: false
  },
  {
    id: 108, asal: "Solo", tujuan: "Jakarta", kereta: "Senja Utama",
    namaKereta: "Senja Utama",
    kelas: "Bisnis", harga: 310000,tanggal:new Date(),
    jadwal: { berangkat: "09:39", tiba: "16:58" },
    habis: false
  },
  {
    id: 109, asal: "Malang", tujuan: "Surabaya", kereta: "Penataran",
    namaKereta: "Penataran",
    kelas: "Ekonomi", harga: 90000,tanggal: new Date(),
    jadwal: { berangkat: "22:42", tiba: "04:11" },
    habis: false
  },
  {
    id: 110, asal: "Semarang", tujuan: "Bekasi", kereta: "Kaligung",
    namaKereta: "Kaligung",
    kelas: "Ekonomi", harga: 75000,tanggal: new Date(),
    jadwal: { berangkat: "18:47", tiba: "00:20" },
    habis: true
  },
  {
    id: 110, asal: "Malang", tujuan: "Surabaya", kereta: "Penataran",
    namaKereta: "Penataran",
    kelas: "Ekonomi", harga: 90000,tanggal: new Date(),
    jadwal: { berangkat: "15:56", tiba: "21:12" },
    habis: false
  },
  {
    id: 111, asal: "Alam surya", tujuan: "Surabaya", kereta: "Penataran",
    namaKereta: "Penataran",
    kelas: "Ekonomi", harga: 90000,tanggal:new Date(),
    jadwal: { berangkat: "07:12", tiba: "12:43" },
    habis: false
  },
  {
    id: 112, asal: "Malang", tujuan: "Surabaya", kereta: "Penataran",
    namaKereta: "Klaigung",
    kelas: "Ekonomi", harga: 90000,tanggal:new Date(),
    jadwal: { berangkat: "08:35", tiba: "15:12" },
    habis: false
  },
  {
    id: 113, asal: "Malang", tujuan: "Surabaya", kereta: "Penataran",
    namaKereta: "Jaya pura",
    kelas: "Ekonomi", harga: 90000,tanggal:new Date(),
    jadwal: { berangkat: "11:49", tiba: "17:45" },
    habis: true
  },
];




   let {asalkota,tujuankota,TiketDibeli,setTiketDibeli,indikator,setindikator,tambahtiket} = useContext(Konteks)
   const [dataa,setdata] = useState([])

   const [datatanggal ,setdatatanggal] = useState([]);
   const navigasi = useRouter();
   const today = new Date();
   const containerDate = [];
   const [triger,setTriger] = useState(false)
   let i = 0;
   const [riwayat,setriwayat] = useState([])
   const [getdata,setgetdata] = useState([])
   
 

   

   for(;i < 100; i++){
      today.setDate(today.getDate() + 1);
      if(today.getMonth() > 9){
         let format = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
         containerDate.push({tanggal:format})
      }
      else{
         let format = `${today.getFullYear()}-0${today.getMonth() + 1}-${today.getDate()}`;
         containerDate.push({tanggal:format})
      }
   };

   useEffect(()=> {
      setdatatanggal(containerDate)
   },[])

   useEffect(()=> {
      try{
         async function getTiket(){
          setdata(tiket)
          setgetdata(tiket)
          const API = `http://localhost:5000/api/tiket`;
          const ress = await axios.get(API)
          
         
         }
         getTiket()
      }
      catch(err){
         alert(err?.response?.data?.message)
      }
   },[]);

const list = [{user:{username:'ikhwan',cart:{TotalCart:[new Array(10).fill(0) ]}}}]
   
const [cek,setcek] = useState(false)


 function pesanTiket(kelas, harga, nama, berangkat, tiba) {

  const listDataTiket = {class:kelas , price:harga, name:nama , otw:berangkat , tiba:tiba};
  setTiketDibeli(prev => [...prev , {listDataTiket}])
  const alamat = doc(db,"Tickets",'allTickets');
  updateDoc(alamat,{TiketDibel: arrayUnion(listDataTiket)}).catch(async (ress)=> {
    alert('gagal kirim data')
  })
  
  const API = doc(db,'user',cari)
  setDoc(API,{dataUser:[{username:'aini',password:'gemoy'}]})



  if (indikator) {
    setTriger(true);
    setTimeout(() => {
      navigasi.push("HalamanTiketPulang");
      setTriger(false);
    }, 5000);
  } else {
    navigasi.push("/pembayaran");
  }
}

   
   function carri(){
    const lower = cari.toLowerCase()
    setdata(getdata.filter(item => item.namaKereta?.toLowerCase().includes(lower)))
    setriwayat(prev => [...prev,cari])
    setcek(false)

   }

   const low = cari.toLowerCase();

   useEffect(()=> {
     if(cari == ""){
       setcek(false)
     }
   },[cek])

   function pilih(nama){
    const name = nama.toLowerCase()
    setdata(getdata.filter(item => item.namaKereta?.toLowerCase().includes(name)))
   }


    return(

    <div className="min-w-screen">

         <Head>
            <meta name="viewport" content="width=device-width, initial-scale=0.8"></meta>
         </Head>

         <div className="navbar bg-white h-30">

            <input placeholder="search" onChange={(e)=> {setcari(e.target.value); setcek(true)}}></input>
            <button onClick={()=> carri()}>cari</button>

           <div style={{display:cek ? "block":'none'}}>
             {riwayat.filter(item => item.toLowerCase().includes(low)).map((item,index)=> (
              <div style={{display:cari !=='' ? 'block':'none'}} key={index}>
                <p onClick={()=> pilih(item)} style={{display:cari !=='' ? 'block':'none'}}>{item}</p>
              </div>
             ))}
           </div>

            <p className="relative top-[10px] left-[140px] font-bold text-[20px]">{`Kota ${asalkota}`} {">"} Kota {tujuankota}</p>
            <div className="wadahtanggal relative top-[50px]  flex gap-5 overflow-auto w-[520px] ">
               {datatanggal.map((item,index)=> (
                    <div key={index} className=" tanggal flex justify-center relative top-[0px] bg-blue-50 rounded-lg min-w-[100px] ">
                      <p className="font-bold">{item.tanggal}</p> 
                     </div>
               ))}
            </div>

         </div>

         <div className="container-tiket h-210 bg-blue-50 relative top-[0px] overflow-y-auto overflow-x-hidden flex flex-col items-center gap-4 w-[542px] ">

           {triger ? <p>Mohon Tunggu...</p> : <p className="font-bold">Pilih Kereta Berangkat</p>}
            
            <div className=" w-[70px] absolute top-[-5px]" style={{display:triger? "block":'none', position:'absolute'}}>
              <Lottie 
              animationData={loading}
              />
          </div>
            
           {dataa.map((item,index)=> (
              <div key={index} className="cart bg-white  w-[470px]  rounded-lg pl-[10px]">
                <p className="text-blue-700 font-bold relative top-2">{item.namaKereta}</p>
                <div className="relative flex flex-col">
                  { item.habis ? "" : <p className="relative left-[270px]  text-green-900">harga tersedia mulai dari</p>}
                  { item.habis ? "" : <p className="relative left-[360px] font-bold">Rp:{item.harga}K</p>}
                </div>
               <div className=" realtive flex flex-col gap-4">
                 <p className="relative top-[10px]">{item.jadwal.berangkat} {item.asal}</p>
                 <p className="relative text-[13px]">6jm 33mnt</p>
                 <p className="relative">{item.jadwal.tiba}  {item.tujuan}</p>
               </div>
                {item.habis ? <p className="text-red-800 font-bold relative text-[20px] top-[-100px] left-[370px]">HABIS</p>:<p className=" text-green-500 text-[13px] relative top-[10px]">TERSEDIA</p>}
               {item.habis ? "":<button onClick={()=> {pesanTiket(item.kelas,item.harga,item.namaKereta,item.jadwal.berangkat,item.jadwal.tiba)}} className="bg-blue-700 text-white rounded-lg w-50 relative top-7">PESAN</button>}
              </div> 
              ))}
          </div>
      
    </div>
    ) 
}


export function TiketPulang(){

  

   return(
     <>
     
     </>
   )
}







export default Latihan;