'use client'

import { useState,useEffect } from "react"


export default function Headers(){
 
  const [isSearch , set_isSearch] = useState(false)

  function Search_products(){
    set_isSearch(true);
  }

  

    return(
       <div className="flex gap-1 fixed z-200 w-full bg-white justify-between items-center px-4 py-4 shadow-md  border-gray-100">
          <div className={`flex gap-4 ${isSearch ? 'hidden':'block'}`}>
             <p className="bg-gray-100 w-7 h-7 flex justify-center items-center rounded-full font-bold"><i class="bi bi-arrow-left font-bold text-[20px]"></i></p>
             <p className="font-bold">jog Ocean Kenthu</p>
          </div>  

          <div className={`flex gap-6 ${isSearch ? 'hidden':'block'}`}>
             <p onClick={()=> Search_products()}><i className="bi bi-search"></i></p>
             <p><i className="bi bi-heart-fill text-red-500"></i></p>
             <p><i class="bi bi-share-fill"></i></p>
          </div>

          <div className={`flex justify-between w-full ${isSearch ? 'block':'hidden'} `}>
             <p onClick={()=> set_isSearch(false)}><i class="bi bi-arrow-left font-bold text-[20px]"></i></p>
             <input className="border-1 py-1 px-2 rounded-xl" placeholder="Cari products..."></input>
             <button className="bg-green-600 text-white px-3 rounded-lg font-bold">Cari</button>
          </div>
       </div>
    )
}