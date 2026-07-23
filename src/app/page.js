'use client'

import { useState , useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Login () {

   const [Form , setForm] = useState({
      username:'',
      email:''
   });


   const Navigasi = useRouter();

   async function login () {
  try {
    const API = "https://token-awyaiyz75-ikhwan-mardityas-projects.vercel.app/server_login/login";
    const RES = await axios.post(API, {
      username: Form.username,
      email: Form.email,
    }, {
      withCredentials: true
    });
    
    Navigasi.push(RES.data.navigasi);
      
  } catch (err) {
    // 💡 Cari key 'message', kalau gak ada cari 'error', kalau gak ada baru pesan bawaan
    const pesanError = err.response?.data?.message || err.response?.data?.error || err.message || "Gagal terhubung ke server";
    alert(pesanError);
  }
}


       
   return (
      <main>
         {['username', 'email'].map((item,index)=> (
            <div key={index}>
               <input 
                 placeholder = {`Masukan ${item}`} 
                 onChange={(e) => setForm(prev => item == 'username' ? ({...prev,username:e.target.value}) : ({...prev , email:e.target.value}))}>  
               </input>
            </div>
         ))}

         <button onClick={login}>Login</button>
      </main>
   )
}