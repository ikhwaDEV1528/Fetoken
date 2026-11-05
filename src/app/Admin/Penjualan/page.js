'use client'

import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks"
import { DetailPesananBarang } from "./components/DetailPesananBarang"
import { HeaderPenjualan } from "./components/headerPenjualan"
import { InputBarang } from "./components/InputBarang"
import { ListPesanan } from "./components/ListPesanan"
import { useContext, useEffect } from "react"
import { Konteks } from "@/GlobalNilai/Global"


export default function Penjualan() {

  const {setDataInputBarang} = useContext(Konteks)

  useEffect(()=> {
    setDataInputBarang(prev => ({
      ...prev,
      ListPesanan:[]
    }))
  },[])

  return (
    <main>
      <CEK_HAK_AKSES>
        <HeaderPenjualan />
        <InputBarang />
        <ListPesanan />
        <DetailPesananBarang />
      </CEK_HAK_AKSES>
    </main>
  )
}