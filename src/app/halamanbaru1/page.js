"use client";
export const dynamic = 'force-dynamic'; // 👈 Mencegah Next.js prerender error

import { getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, setDoc, doc, exists } from "firebase/firestore";
import BlurText from "@/komponentLogin/BlurText"
import SplitText from "./SplitText";
import ProfileCard from './ProfileCard'
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Arya } from "next/font/google";
import { Swiper, SwiperSlide } from "swiper/react";
import 'swiper/css'
import 'swiper/css/navigation'
import { Navigation } from "swiper/modules";
import axios from "axios";
import './swiper1.css'
import { scale } from "motion";

export default function Halamanbaru1() {
  const [usernameLogin, setUserNameLogin] = useState('');
  const [usernameRegis, setUsernameRegis] = useState('');
  const [data, setdata] = useState(new Array(10).fill({ nama: 'ikhwan' }));
  const [isPanahBack, setIsPanahBack] = useState(false);
  const [isPanahNext, setIsPanahNext] = useState(false);
  const [isData, setIsData] = useState(0);
  const [hasilData, setHasildata] = useState();
  const [hasil, setHasil] = useState(0);
  const navigasi = useRouter();

  function regis() {
    setDoc(doc(db, 'user', usernameRegis), { dataUser: [{ username: usernameRegis }] });
  }

  async function Login() {
    const API = doc(db, 'user', usernameLogin);
    const ress = await getDoc(API);

    if (ress.exists) {
      const data = ress.data();
      const userdata = data.dataUser;
      const find = userdata.find(item => item.username == usernameLogin);
      if (find) {
        setDoc(doc(db, 'produk', usernameLogin), {
          totalMenu: new Array(10).fill(0),
          totalCart: new Array(10).fill(0),
        });
        alert('berhasil');
        navigasi.push('/pembayaran');
      } else {
        alert('username salah , regis dulu');
      }
    } else {
      alert('id ga ada');
    }
  }

  useEffect(() => {
    // axios.get('http://localhost:5000/api/daftar')
  }, []);

  function dataswipe() {}

  function PanahBack() {
    if (!isPanahBack) {
      setIsPanahBack(true);
    } else {
      setIsPanahBack(false);
    }
  }

  function panahNext() {
    if (!isPanahNext) {
      setIsPanahNext(true);
    } else {
      setIsPanahNext(false);
    }
  }

  // 💡 BARIS PERINTAH db.user.updateOne TADI SUDAH DIHAPUS DARI SINI

  return (
    <div>
      <div className="container-swiper relative flex gap-[100px] opacity-100 scale-100 transition-all duration-700">
        <p className="absolute">saldo</p>
        <Swiper
          modules={[Navigation]}
          navigation={{ prevEl: '.backBt', nextEl: '.nextBt' }}
          spaceBetween={1}
          slidesPerView={2}
          allowTouchMove={false}
          className="swiper absolute top-50 left-[5px] h-100 min-w-100 flex flex-col gap-30 sm:w-[1500px] xl:w-[800px] xl:top-[100px]"
        >
          {data.map((item, index) => (
            <SwiperSlide
              key={index}
              style={{
                transform: isData == index ? 'scale(1)' : 'scale(0.9)',
                marginLeft: isData == 9 ? '1000px' : "0px"
              }}
              onClick={() => dataswipe()}
              className="cart-swiper absolute top-30 flex left-[-3px] bg-white max-h-[150px] text-center pt-[40px] ml-2 rounded-lg xl:left-[10px] xl:bg-blue-100"
            >
              {item.nama}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="arrow-navigation">
        <button
          style={{ color: isPanahBack ? "grey" : 'black' }}
          onClick={() => { PanahBack(); setIsData(prev => Math.max(prev - 1, 0)) }}
          className="backBt absolute top-[500px] left-[0px] z-99 text-[50px] xl:left-[330px]"
        >
          <i className="bi bi-caret-left-fill"></i>
        </button>
        <button
          style={{ color: isPanahNext ? "grey" : 'black' }}
          onClick={() => { panahNext(); setIsData(prev => prev + 1) }}
          className="nextBt absolute top-[500px] left-[350px] z-90 text-[50px] xl:left-[1100px]"
        >
          <i className="bi bi-caret-right-fill"></i>
        </button>
      </div>
    </div>
  );
}