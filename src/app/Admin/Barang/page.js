'use client'

import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks"
import { EditBarang } from "./components/EditBarang"
import { HeaderBarang } from "./components/header"
import { ListBarang } from "./components/ListBarang"
import { TambahProduk } from "./components/TambahBarang"



export default function Barang () {

    return(
       
        <main>
            <CEK_HAK_AKSES>
            <HeaderBarang/>
            <ListBarang/>
            <EditBarang/>
            <TambahProduk/>
            </CEK_HAK_AKSES>
        </main>
  
    )
}