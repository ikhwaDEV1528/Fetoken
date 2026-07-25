'use client'
import { useState ,useEffect} from "react";
import { usePathname } from "next/navigation";
import axios from "axios";
import { useRouter } from "next/router";


export function CEK_HAK_AKSES({children}) {

 const [isRender , setIsRender] = useState(false)
 const pathname = usePathname()


  async function HAK_AKSES() {
      
      try {
        const API_HAK_AKSES = 'http://localhost:4000/server_login/CHECKING_ADMIN';
        const ress = await axios.post(API_HAK_AKSES,{headerPath:pathname} , {withCredentials:true})
        alert('CEK HAK AKSES SUKSES')
        setIsRender(true)
      } catch (err) {
        // alert(err.response?.data?.message)
        window.location.href = err.response?.data?.navigasi
        return;
      }
    }
  
  
    useEffect(()=> {
  
      HAK_AKSES();
  
    }, []);

    if(!isRender) return null

    return children;

}