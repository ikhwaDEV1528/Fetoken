'use client'

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";
import { Header } from "@/UI/Header/Header";
import { Berita } from "@/app/User/Home/components/Berita";
import { Catatan } from "./Components/Catatan";
import { Penjualan } from "./Components/Penjualan";
import { TimeoutNotif } from "@/UI/timeoutNotif/timeoutNotif";


export default function Dashboard () {
    const Navigasi = useRouter();

    async function requestAdmin(params) {

        try {

           const API = 'https://token-phi-dun.vercel.app/server_login/test';
           const RES = await axios.get(API, {withCredentials:true});
           alert(JSON.stringify(RES.data.message));

        } catch (err) {

           if(err.response.status == 404) {
             alert('Silahkan login kembali!');
             return Navigasi.push('/')
           };

           alert(err.response.data.error)
        };
    };




    return (
     
          <main>
        
            <Header/>
            <Catatan/>
            <Penjualan/>
            <TimeoutNotif/>
         
          </main>

    )
}