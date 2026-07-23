'use client'

import { useEffect, useState } from "react"
import axios from "axios";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from 'firebase/firestore';

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


   return (
    <main>
      CEHECKOUT
    </main>
   )
}


  // seiIkhwan login ke 2
  



