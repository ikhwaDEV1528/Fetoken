'use client'
import { useEffect,useState } from "react"
import axios from "axios";
import './regis.css'
import { useRouter } from "next/navigation";

function Registrasi(){
    const [username,setusername] = useState('');
    const [password,setpassword] = useState('');
     

    const navigasi = useRouter()
    
    function register(){
       const API = 'http://localhost:5000/api/auth/register';
       axios.post(API,{username:username,password:password},{
        headers:{Authorization:`Bearer ${token}`}
       })
       .then(prev => [prev.data.message,alert(prev.data.message)])
       .catch(function(err){
        alert(err)
       })
    }

    return(
        <div className="flex flex-col gap-8  relative top-50 left-[30] w-[350px]">
            <input placeholder="buat usename" className="input-regis relative p-[10px]  rounded-lg p-2"
            onChange={(e)=> setusername(e.target.value)}
            ></input>
            <input placeholder="buat password" className="input-regis relative p-[10px] rounded-lg p-2"
            onChange={(e)=> setpassword(e.target.value)}
            ></input>
            <button onClick={()=> {register()}} className="relative left-[120px] rounded p-[6px] bg-blue-700 w-[100px] text-white ">Daftar</button>
            <p onClick={()=> navigasi.push('/HalamanLogin')} className="flex justify-center relative left-[140px] border-b w-[70px]">LOGIN</p>
        </div>
    )
}

export default Registrasi;