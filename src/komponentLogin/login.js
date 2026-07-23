"use client"
import { useState,useEffect } from "react"
import './login.css'
import { useRouter } from 'next/navigation'
import axios from "axios"




export  function Login(){
 
    const [username , setusername] = useState('');
    const [password , setpassword] = useState(123);

    const router = useRouter()


    async function login(){

     try{
      const API = 'http://localhost:5000/api/auth/login';
      const ress = await axios.post(API,{username:username,password:password})
      alert(ress.data.message)
      router.push('/PilihLokasi')
     }
     catch(err){
      alert(err?.response?.data?.message)
      router.push('/PilihLokasi')
     }
    }
    
   

    return(
        <main>
           <div className="container-input flex flex-col gap-5  w-90 h-100  justify-center items-center relative top-40 left-5 sm:w-400 sm:left-[-380px] ">

              <input className="input relative sm:left-[200px] w-70 rounded-lg  border  p-2 sm:rounded-2xl placeholder-black sm:w-[600px] sm:p-5  "placeholder="username"
               onChange={(e)=> setusername(e.target.value)}
              ></input>

              <input className="input relative sm:left-[200px] w-70 rounded-lg p-2 sm:rounded-2xl placeholder-black sm:w-[600px] sm:p-5" placeholder="password"
               onChange={(e)=> setpassword(e.target.value)}
              ></input>

              <button className="bt-login border border-red-500 rounded-lg w-50 p-2 relative" onClick={()=> {login()}}>Loginn</button>
      
              <div className="relative">
                 <p className="relative top-[40px] text-[15px]">Belum Punya Akun?</p>
                 <p className=" regis relative flex justify-center top-[47px] left-[0px] border-b text-[18px] " onClick={()=> {router.push('/registrasi')}}>Registrasi</p>
              </div>
           </div>
        </main>
    )
}