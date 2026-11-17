'use client'

import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks"
import { DCRManagementContent } from "./LaporanSalesContent.js"
import { SubHeader } from "@/UI/Header/subHeader.js"



export default function LaporanSalesPage(){

    return(
        <CEK_HAK_AKSES>
            <SubHeader/>
            <DCRManagementContent/>
        </CEK_HAK_AKSES>
    )
}