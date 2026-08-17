'use client'

import { useEffect, useState } from "react"
import axios from "axios";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from 'firebase/firestore';
import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";
import { Header } from "@/UI/Header/Header";
import YouTube from 'react-youtube';

export default function Home () {


  const navigasi = useRouter()
   
//  useEffect(() => {
//     // 1. Tentukan Collection & Document ID yang mau didengerin
//     // Contoh: Collection "users", Document ID "doc1"
//     const docRef = doc(db, "sesion_user", '123_ikhwan');

//     // 2. Pasang Listener Realtime
//     const unsubscribe = onSnapshot(docRef, 
//     (snapshot) => {
//        if(!snapshot.exists) {
//          return alert('SESI GAADA')
//        }
//        alert('KELUAR DARI SESI')

//        navigasi.push('/')
//     }, 
    
//     (error) => {
//       console.error("Error onSnapshot:", error);
//     });

//     // 3. Wajib dimatiin pas unmount/pindah halaman biar gak leak RAM!
//     return () => unsubscribe();
//   }, []);

const videoId = "AP0NACavjfk";

const opts = {
    height: '390',
    width: '640',
    playerVars: {
      autoplay: 0,
      controls: 1,       // Boleh 0 kalau mau sembunyiin bar kontrol penuh
      modestbranding: 1, // Sembunyikan logo YouTube besar
      rel: 0,            // Jangan tampilkan rekomendasi video lain
      showinfo: 0,       // Sembunyikan judul (di player versi lama)
      fs: 0,             // Sembunyikan tombol fullscreen
    },
  };


   return (
    <CEK_HAK_AKSES>
       <main>
         <Header/>
          <YouTube videoId="AP0NACavjfk" opts={opts} />;
      </main>
    </CEK_HAK_AKSES>
   )
}


  // seiIkhwan login ke 2
  



