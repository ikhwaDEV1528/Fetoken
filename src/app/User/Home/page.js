'use client'

import { useEffect, useState } from "react"
import axios from "axios";
import { useRouter , usePathname } from "next/navigation";
import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";
import { Header } from "@/UI/Header/Header";
import { Berita } from "./components/Berita";
import { Catatan } from "./components/Catatan";


export default function Home () {
   
  const Redirect = useRouter();
  

 



  return (
    <CEK_HAK_AKSES>
      <main>
        <Header/>
        <Catatan/>
        <div className="mt-2">
          <Berita/>
        </div>

      </main>
    </CEK_HAK_AKSES>
  )
}