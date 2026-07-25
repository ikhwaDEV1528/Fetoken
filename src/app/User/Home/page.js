'use client'

import { useEffect, useState } from "react"
import axios from "axios";
import { useRouter , usePathname } from "next/navigation";
import { CEK_HAK_AKSES } from "@/Hak_akses";
import { Header } from "@/UI/Header/Header";
import { Berita } from "./components/Berita";
import { Catatan } from "./components/Catatan";


export default function Home () {
   
  const Redirect = useRouter();
  

 

  async function Checkout (valueRoute) {
    
    try {
      const API = '/api-be/server_login/CHECKING_ROUTE';
      const RES = await axios.post(API ,
        { route: valueRoute},{withCredentials:true}
      );

      Redirect.push(RES.data.navigasi)

    } catch (err) {
      Redirect.push(err)
      alert(err.response?.data?.message)
    }
  }




  return (
    <CEK_HAK_AKSES>
      <main>
        <Header/>
        <Catatan/>
        <div className="mt-2">
          <Berita/>
        </div>

        <button onClick={()=> Checkout('/User/Checkout')}>Co</button>
      </main>
    </CEK_HAK_AKSES>
  )
}