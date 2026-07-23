'use client'

import { Konteks } from "@/GlobalNilai/Global"
import { useState,useEffect } from "react"
import { useContext } from "react"
import './pembayaran.css'
import Lottie from "lottie-react"
import loading from './loading.json'
import { db, } from "@/lib/firebase"
import { collection, addDoc,getDoc, setDoc ,doc} from "firebase/firestore";


function Pembayaran(){
    
    const [saldo, setsaldo] = useState(1000000);
    let {TiketDibeli,tambahtiket,setTiketDibeli,triger,settriger} = useContext(Konteks);
    const [nilai1,setnilai1] = useState(0)

    const hitung = TiketDibeli.map(item => item.price);
    const hasil = hitung.reduce((acc,curr) => acc + curr , 0)
    const [loadingg,setLoading] = useState(false)

    function bayar(){

    if(saldo > hasil){
        setLoading(true);
        setTimeout(() => {
            setLoading(false)
            const kurang = Math.max(saldo - hasil , 0);
            setsaldo(kurang);
        }, 5000);
    }

    else {
            alert('saldo tidak cukup')
    }
        
    };
    
    const [datafiree,setdatafiree] = useState([])

    useEffect(()=> {
    async function getfire(){
        const API = doc(db,'user','gemoy aini');
        const ress = await getDoc(API);
        

        if(ress.exists()){
            const databaru = ress.data().dataUser
            setdatafiree(databaru)
        }

        else{
            alert('data tida di temukan')
        }

        }
        getfire()
    },[])
  
   


    return(
        <div>

            
          <div className="relative top-[10] left-[10] font-bold">
             <p>SALDO: Rp {saldo}k</p>
            <p className="relative top-[0px]">nilai:{nilai1}</p>
           </div>
         

            <div className="wadah-cartTiketBayar relative top-10 left-4 overflow-y-auto flex flex-col rounded-lg items-center w-135">
           {datafiree.map((item,index)=> (
                <div key={index} className="cartTiketBayar relative top-3 mb-10 pl-3 pt-2 bg-white h-30 w-100 rounded-lg">
                    <p className="absolute top-1 text-blue-800 font-bold">{item.name}</p>
                    <p className="absolute top-9">RP {item.username}K</p>
                    <p className="absolute top-16">{item.password} -- {item.tiba}</p>
                    <p className="absolute top-23">{item.class}</p>
                </div>
           ))}
           </div>

           
             <p className="absolute top-[500px] left-[100px] bg-blue-50 flex flex-col items-center gap-10 w-[300px]">Total : {hasil}K 
             <button className="bg-blue-700 w-50 rounded-lg p-2 text-white" onClick={()=> bayar()}>bayar</button></p>

                 <div style={{display:loadingg ? 'block':'none'}} className="sukses relative top-[-300px] left-[13px]  w-136 h-200 bg-blue-100">
                  
                 </div>

                <div style={{display:loadingg ? 'block':'none'}} className="relative top-[-950px] left-[190px]" >
                  <p className="w-26 relative left-6"><Lottie animationData={loading}/></p>
                  <p className="font-bold text-[40px]">loading...</p>
                </div>
            
             </div>
    )

}

export default Pembayaran;