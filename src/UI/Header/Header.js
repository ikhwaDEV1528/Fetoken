'use client'

import Image from "next/image";
import axios from "axios";
import YouTube from 'react-youtube';

export function Header () {

  const icon = [
    {icon:<i class="bi bi-house-door-fill"></i> , path:'/User/Home'},
    {icon:<i class="bi bi-shop"></i> , path:'/User/Checkout'},
    {icon:<i class="bi bi-info-circle"></i> , path:'/User/informasi'},
    {icon:<i class="bi bi-person-circle"></i> , path:'/User/profile'}
 ]
    

  async function navigasi(valueRoute) {
  
    try {
      const API = '/api-be/server_login/CHECKING_ROUTE';
      const RES = await axios.post(API ,
        { route: valueRoute},{withCredentials:true}
      );
    
      window.location.href = RES.data.navigasi

    } catch (err) {
      Redirect.push(err)
      alert(err.response?.data?.message)
    }
  }
    
  return (
        <main className="w-full border-b-1 py-2 flex flex-col gap-0">

            <div className="container-logo-name-search-message flex justify-between px-4 py-4">
               <div className="flex gap-2 ">
                  <Image alt="pp" className="rounded-full" width={30} height={10} src ={'/tujuh.jpeg'}/>
                  <p className="text-pink-400 font-extrabold text-[20px]">Roustz</p>
               </div>

               <div className="flex gap-7 text-[20px] text-pink-500">
                  <p><i class="bi bi-search "></i></p>
                  <p><i class="bi bi-chat-dots-fill"></i></p>
               </div>
            </div>

            <div className="flex gap-15 justify-center text-pink-500">
               {icon.map((item,index)=> (
                   <div className="" key={index}>
                     <p onClick={()=> navigasi(item.path)} className="font-bold text-[23px] ">{item.icon}</p>
                   </div>
                ))}
            </div>

        </main>
    )
}