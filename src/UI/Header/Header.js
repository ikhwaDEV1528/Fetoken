'use client'

import Image from "next/image"

export function Header () {

    const icon = [
    <i class="bi bi-house-door-fill"></i>,
    <i class="bi bi-shop"></i>,
    <i class="bi bi-info-circle"></i>,
    <i class="bi bi-person-circle"></i>
]

    return (
        <main className="w-full border-b-1 py-2 flex flex-col gap-3">

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
                     <p className="font-bold text-[20px] ">{item}</p>
                   </div>
                ))}
            </div>

        </main>
    )
}