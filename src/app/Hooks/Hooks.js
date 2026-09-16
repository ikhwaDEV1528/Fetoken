'use client'
import { useState ,useEffect, useContext} from "react";
import { usePathname } from "next/navigation";
import axios from "axios";
import { Konteks } from "@/GlobalNilai/Global";
import { Loading } from "@/UI/Loading/Loading";



export function CEK_HAK_AKSES({children}) {

 const [isRender , setIsRender] = useState(false)
 const {setLoading} = useContext(Konteks)
 const pathname = usePathname()


  async function HAK_AKSES() {
      
    try {
      setLoading(prev => ({
        ...prev,
        loadingGlobal:true
      }))
      const API_HAK_AKSES = '/api-be/SERVER_CEK_TOKEN_ROLE/CHECK_ROLE_DAN_TOKEN';
      const ress = await axios.post(API_HAK_AKSES,{headerPath:pathname} , {withCredentials:true})
      setIsRender(true)
    } catch (err) {
        if(err?.response?.status == 401){
          alert('Sesi telah berkahir , Silahkan login kembali!')
            window.location.href = err.response?.data?.navigasi ?? '/'
        } else if(err?.response?.status == 403){
          alert('Sepertinya ada masalah , Silahkan login terlebih dahulu!')
          window.location.href = err.response?.data?.navigasi ?? '/'
          return
        } else{
        alert(err.response?.data?.message ?? 'Sepertinya ada masalah.')
        window.location.href = err.response?.data?.navigasi ?? '/'
        return;
        }
    } finally{
      setLoading(prev => ({
        ...prev,
        loadingGlobal:false
      }))
    }
  }
  
  
  useEffect(()=> {
  
    HAK_AKSES();
  
  }, []);

  if(!isRender) return <Loading/>

  return children;

}