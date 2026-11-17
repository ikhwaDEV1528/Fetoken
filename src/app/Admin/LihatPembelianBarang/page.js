'use client'

import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks"
import { FakturListContent } from "./FakturPembeianContent"




export default function FakturPembelianPage(){

    return(
       <CEK_HAK_AKSES>
          <FakturListContent/>
       </CEK_HAK_AKSES>
    )
}