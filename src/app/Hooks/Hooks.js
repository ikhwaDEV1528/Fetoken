'use client'
import { useState, useEffect, useContext } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";
import { Konteks } from "@/GlobalNilai/Global";
import { Loading } from "@/UI/Loading/Loading";
import { TimeoutNotif } from "@/UI/timeoutNotif/timeoutNotif";

export function CEK_HAK_AKSES({ children }) {
  const [isRender, setIsRender] = useState(false);
  const [isAuthtorize , setAuthhtorize] = useState(false)
  const { setLoading } = useContext(Konteks);
  const pathname = usePathname();

  async function HAK_AKSES() {
    try {
      setLoading(prev => ({
        ...prev,
        loadingGlobal: true
      }));

      const API_HAK_AKSES = '/api-be/SERVER_CEK_TOKEN_ROLE/CHECK_ROLE_DAN_TOKEN';
      const ress = await axios.post(API_HAK_AKSES, { headerPath: pathname }, { withCredentials: true });

      // 1. Set header CSRF TERLEBIH DAHULU
      if (ress.data?.csrfToken) {
        axios.defaults.headers.common['x-csrf-token'] = ress.data.csrfToken;
      }

      // 2. Baru izinkan komponen anak di-render
      setIsRender(true);

    } catch (err) {
      if (err?.response?.status == 401 || 403) {
       setAuthhtorize(true)
        // window.location.href = err.response?.data?.navigasi ?? '/';
      
      } else if (err?.response?.status == 403 || 401) {
        // window.location.href = err.response?.data?.navigasi ?? '/';
       setAuthhtorize(true)
      } else {
        alert(err.response?.data?.message ?? 'Sepertinya ada masalah.');
        window.location.href = err.response?.data?.navigasi ?? '/';
        return;
      }
    } finally {
      setTimeout(()=> {
        
      })
      setLoading(prev => ({
        ...prev,
        loadingGlobal: false
      }));
    }
  }

  useEffect(() => {
    HAK_AKSES();
  }, [pathname]); // 3. Masukkan pathname agar re-check otomatis tiap pindah halaman

  if (!isRender) {
    return (
      <>
       <Loading/>
       <TimeoutNotif isActive={isAuthtorize}/>
      </>
    )
  }

  return children;
}