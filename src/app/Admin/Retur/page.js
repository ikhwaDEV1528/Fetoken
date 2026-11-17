'use client'

import { SubHeader } from "@/UI/Header/subHeader"
import { InputHeaderRetur } from "./components/inputHeader"
import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks"




export default function Retur(){



    return(
        <CEK_HAK_AKSES>
        <>
          <SubHeader/>
          <InputHeaderRetur/>
        </>
        </CEK_HAK_AKSES>
    )
}