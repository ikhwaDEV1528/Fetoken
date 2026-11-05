'use client'
import { createContext, useState } from "react"

// 1. Buat Context dengan default value null atau objek kosong
export const KonteksOprasional = createContext(null)

// 2. Tangkap parameter ({ children }) dengan c kecil
export function GlobalOprasional({ children }) {

    const [dataInputRetur, setDataInputRetur] = useState({
        input_no_faktur: ''
    });

    const [dataRetur , setDataRetur] = useState({
        listRetur:[]
    })


    return (
        <KonteksOprasional.Provider value={{
            dataInputRetur,
            setDataInputRetur,
            dataRetur,
            setDataRetur
        }}>
          {/* 3. Render prop {children} dengan c kecil */}
          {children}
        </KonteksOprasional.Provider>
    )
}