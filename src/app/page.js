'use client'

import { useState } from "react";
import axios from "axios";
import { User_not_found } from "@/UI/Alert/user-not-found";

export default function Login(value_kompo) {
  const [Form, setForm] = useState({
    username: '',
    email: ''
  });

  const [Option , setOption] = useState({
    isloading:false,
    isAlert:false,
  })

  async function login(e) {
    if (e) e.preventDefault();

    try {
      const API = "/api-be/server_login/login";
      
      const RES = await axios.post(API, {
        username: Form.username,
        email: Form.email,
      }, {
        withCredentials: true
      });

      // 💡 Gunakan jalur huruf kecil untuk route standar Next.js
      const targetNavigasi = RES.data.navigasi 

      // 💡 HARD REDIRECT: Memaksa browser pindah halaman + membawa cookie login terbaru
      window.location.href = targetNavigasi;

    } catch (err) {
      if(err.response?.data?.status == 404) {
        setOption(prev => ({...prev , isAlert:true}))
        return;
      }
      const pesanError = err.response?.data?.message || err.response?.data?.error || err.message || "Gagal terhubung ke server";
      alert(pesanError);
    }
  }

 

  return (
    <main className="main-container min-h-screen flex flex-col justify-center items-center items-center">
      <h1 className="font-extrabold text-blue-600">Silahkan Login!!</h1>
      <div className="flex flex-col  min-w-sm  lg:min-w-lg h-80  gap-2 p-10">
        <div className="flex flex-col  gap-5">
          {['username','email'].map((item,index)=> (
            <input onChange={(e) => setForm(prev => ({...prev , [item]:e.target.value}))} key={index} className="border-1 px-2 py-3 rounded-4xl" placeholder={`Masukan ${item} anda...`}></input>
          ))}
        </div>

        <div className="flex flex-col justify-center items-center gap-4 w-full ">
          <button onClick={(e)=> login(e)} className="bg-blue-600 text-white p-2 rounded-4xl w-full font-bold">Login</button>
          <p className="text-[12px] italic text-red-500 border-b-1 border-red-400 ">Lupa password?</p>
        </div>

      </div>

      <div className={`${Option.isAlert ? 'block':'hidden'}`}>
        <User_not_found params={Option.isAlert} state={setOption}/>
      </div>


    </main>
  );
}