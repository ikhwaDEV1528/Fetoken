"use client";
import { getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, setDoc, doc,exists } from "firebase/firestore";
import BlurText from "@/komponentLogin/BlurText"
import SplitText from "./SplitText";
import ProfileCard from './ProfileCard'
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Arya } from "next/font/google";
import { Swiper,SwiperSlide } from "swiper/react";
import 'swiper/css'
import 'swiper/css/navigation'
import { Navigation } from "swiper/modules";
import axios from "axios";
import './swiper1.css'
import { scale } from "motion";




export default function Halamanbaru1(){
  const [usernameLogin , setUserNameLogin] = useState('');
  const [usernameRegis , setUsernameRegis] = useState('');
  const [data , setdata] = useState(new Array(10).fill({nama:'ikhwan'}))
  const [isPanahBack , setIsPanahBack] = useState(false);
  const [isPanahNext , setIsPanahNext] = useState(false);
  const [isData , setIsData] = useState(0)
  const [hasilData , setHasildata] = useState()
  const [hasil , setHasil] = useState(0)
  const navigasi = useRouter()
  
  function regis(){
   setDoc(doc(db,'user',usernameRegis),{dataUser:[{username:usernameRegis}]}); 
  };

  async function Login(){
    const API = doc(db,'user',usernameLogin)
    const ress = await  getDoc(API)

    if(ress.exists){
     const data = ress.data();
     const userdata = data.dataUser;
     const find = userdata.find(item => item.username == usernameLogin);
     if(find){
       
        setDoc(doc(db,'produk',usernameLogin),{
          totalMenu:new Array(10).fill(0),
          totalCart: new Array(10).fill(0),
        })
        alert('berhasil')
        navigasi.push('/pembayaran');
     }
     else{
      alert('username salah , regis dulu');
     };
    }
    else{
      alert('id ga ada');
    }
  }


  useEffect(()=> {
    axios.get('http://localhost:5000/api/daftar')
    .then(ress => {
    //  setdata(ress.data)
    })
    .catch(err => {
    //  alert('gagal ambil data')
    })
  },[])


  function dataswipe(){
    // alert('hellow')
  }


  function PanahBack(){
    if(!isPanahBack){
      setIsPanahBack(true)
    }
    else{
      setIsPanahBack(false)
    }
  }


  function panahNext(){
    if(!isPanahNext){
      setIsPanahNext(true)
    }
    else{
      setIsPanahNext(false)
    }
   
    

  }

  db.user.updateOne({_id:'ikhwan'},{$set:{role:'admin'}})

  return(

    <div>
{/* 
     <div>
       <input placeholder="username regis"  onChange={(e)=> setUsernameRegis(e.target.value)}></input>
       <button onClick={()=> regis()}>regis</button>
       <input placeholder="username login" onChange={(e)=> setUserNameLogin(e.target.value)}></input>
       <button onClick={()=> Login()}>login</button>
     </div> */}

    <div className="container-swiper relative flex gap-[100px] opacity-100 scale-100 transition-all duration-700">
      <p className="absolute">saldo</p>
      <Swiper 
       modules={[Navigation]}
       navigation={{prevEl:'.backBt', nextEl:'.nextBt'}}
       spaceBetween={1}
       slidesPerView={2}
       allowTouchMove={false} 
       className="swiper absolute top-50 left-[5px] h-100 min-w-100 flex flex-col gap-30 sm:w-[1500px] xl:w-[800px] xl:top-[100px]"
       >
          {data.map((item,index)=> (
           <p><SwiperSlide style={{transform:isData == index  ? 'scale(1)':'scale(0.9)', marginLeft:isData == 9 ? '1000px':"0px"}} onClick={()=> dataswipe()} key={index} className="cart-swiper absolute top-30 flex left-[-3px] bg-white max-h-[150px] max-w-[] text-center pt-[40px] ml-2 rounded-lg xl:left-[10px] xl:bg-blue-100">{item.nama}</SwiperSlide></p>
          ))}

      </Swiper>
    </div>

      <div className="arrow-navigation">
        <button style={{color:isPanahBack ? "grey":'black'}} onClick={()=> {PanahBack(); setIsData(prev => Math.max(prev -= 1 , 0))}} className="backBt absolute top-[500px] left-[000px] z-99 text-[50px] xl:left-[330px]"><i class="bi bi-caret-left-fill"></i></button>
        <button style={{color:isPanahNext ? "grey":'black'}} onClick={()=>  {panahNext(); setIsData(prev => prev + 1)}} className="nextBt absolute top-[500px] left-[350px] z-90 text-[50px] xl:left-[1100px]"><i class="bi bi-caret-right-fill"></i></button>
      </div>


    </div>
  )
}