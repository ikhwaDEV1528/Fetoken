'use client'

import { useEffect, useState } from "react"
import axios from "axios";
import { redirect, useRouter } from "next/navigation";

export default function Home () {
   
 const Redirect = useRouter();

 async function Checkout (valueRoute) {

    try {

       const API = 'http://localhost:4000/server_login/CHECKING_ROUTE';
       const RES = await axios.post(API ,
         {
           route: valueRoute,
         },
         {
            withCredentials:true
         }
       );

       alert('HOME TRUE')
       Redirect.push(RES.data.navigasi)

    } catch (err) {
      Redirect.push(err)
      alert(err.message)
    }
 }

   return (
    <main>
        Halaman User (pp)
        <button onClick={()=> Checkout('/User/Checkout')}>Co</button>
    </main>
   )
}