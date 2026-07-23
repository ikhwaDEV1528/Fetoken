'use client'

import { useState,useEffect } from "react"
import { createContext } from "react"


export const Konteks = createContext()

function Global({children}){
    const [nilai,setnilai] = useState(10);
    const [asalkota,setasalkota] = useState('');
    const [tujuankota , settujuakota] = useState('')
    const [TiketDibeli,setTiketDibeli] = useState([])
    const [indikator ,setindikator] = useState(false);
    const [username, setUsername] = useState('')
    const [password , setPassword] = useState('')
    


   

    return(
        <Konteks.Provider value={{nilai,setnilai,asalkota,setasalkota,tujuankota,settujuakota
            ,TiketDibeli,setTiketDibeli,indikator,setindikator,username,password,setUsername,setPassword
        }}>
           {children}
          
        </Konteks.Provider>
    )
}


export default Global;