'use client'

import { DetailPesananBarang } from "./components/DetailPesananBarang"
import { HeaderPenjualan } from "./components/headerPenjualan"
import { InputBarang } from "./components/InputBarang"
import { ListPesanan } from "./components/ListPesanan"


export default function Penjualan () {


  return (
    <main>
       <HeaderPenjualan/>
       <InputBarang/>
       <ListPesanan/>
       <DetailPesananBarang/>
    </main>
  )
}