'use client'

import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks"
import { EditPelanggan } from "./components/editPelanggan"
import { HeaderPelanggan } from "./components/header"
import { TablePelanggan } from "./components/table_pelanggan"
import { TambahPelanggan } from "./components/tambahPelanggan"



export default function Pelanggan () {


    return (
        <main>
            <CEK_HAK_AKSES>
            <HeaderPelanggan/>
            <TablePelanggan/>
            <TambahPelanggan/>
            <EditPelanggan/>
            </CEK_HAK_AKSES>
        </main>
    )
}