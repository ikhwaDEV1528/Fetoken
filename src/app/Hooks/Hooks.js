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
        const API_HAK_AKSES = '/api-be/SERVER_CEK_TOKEN_ROLE/CHECK_ROLE_DAN_TOKEN';
        const ress = await axios.post(API_HAK_AKSES,{headerPath:pathname} , {withCredentials:true})
        // alert(ress.data.message)
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