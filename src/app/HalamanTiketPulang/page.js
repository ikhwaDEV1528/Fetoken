'use client'

import { useState,useEffect } from "react"
import { useContext } from "react"
import axios from "axios"
import { Pulang } from "@/Pulang/pulang"


function HalamanTiketPulang(){

    return(
       <div>
        <Pulang/>
       </div>
    )
}

export default HalamanTiketPulang;