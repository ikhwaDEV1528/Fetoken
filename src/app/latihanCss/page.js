'use client' 

import { useState, useEffect, useRef, cloneElement } from "react";

import { doc,setDoc,collection,addDoc,getDoc,getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Cactus_Classical_Serif } from "next/font/google";
import { isCSSVariableName } from "motion";
import { isCancel } from "axios";
import ShinyText from './ShinyText.js';





export default function Css(){

    // variabel state
    const [username , setUsername] = useState('');
    const [password , setPassword] = useState('');
    const [inputCari , setInputCari] = useState('');
    const [data , setData] = useState([]); // get data user 
    const [listData , setListData] = useState([]) // render list chat data user
    const [HasilSearch , setHailSeacrh] = useState([]);
    const [isActive , setIsActive] = useState(false);


    // const no state
    const cahtRef = useRef(null);
    let DaftarChatUser = []; // lokal lisdata user


    function Login(){
      try{
        async function sendDataUser(params) {
          if(username == "" && password == ""){
              alert('username/password tidak boleh kosong!')
          }
          else{
              const ref = doc(db,'userLogin',username);
              const ress = await setDoc(ref,{
                  username:username,
                  password:password
              })
              // console.log(ress);
          }
       }
    
       sendDataUser()
      }
      catch(err){
        alert('gagal kirim data , coba lagi!')
      };
    }


    function Chat(){
       cahtRef.current.scrollIntoView({behavior:'smooth'});
       
    }

    // efect ambil data user//

    useEffect(()=> {
        async function getData(params) {
            try{
                const refGetData = collection(db,'userLogin');
                const ress = await getDocs(refGetData);

                ress.forEach((doc)=> {
                    setData(prev => [...prev,{nama:doc.id}])
                    // console.log(JSON.stringify(data))
                })
                // alert('berhasil')
            }
            catch(err){
                alert('error ambil data')
            }
        }
        getData()
    },[])

    function cari(){
      const find = data.find(item => item.nama == inputCari);

      if(find){
        setHailSeacrh(data.filter(item => item.nama == inputCari))
      }

      else if(inputCari == ""){
        alert('input kolom pencarian') 
        setHailSeacrh([])
      };
    }


    function ruang(){
       setListData(prev => [...prev,{nama:HasilSearch.nama}])
       setIsActive(true)
    };

    


    return(
       <main className="min-h-screen  bg-blue-50 p-4 flex flex-col items-center gap-6">

  <button className="border-2 rounded-2xl p-[1vh] bg-black pl-[-10px]">
    <ShinyText 
     text="Dashboard Reksrim Bangli" 
     disabled={false} 
     speed={3} 
     className='custom-class' 
    />
  </button> 

  {/* Login Form */}
  <div className="bg-green-200 flex flex-col items-center w-full gap-2">
    <input
      className="border-black border-2 w-full rounded-sm p-2"
      placeholder="Username"
      onChange={(e) => setUsername(e.target.value)}
    />
    <input
      className="border-black border-2 w-full rounded-sm p-2"
      placeholder="Password"
      onChange={(e) => setPassword(e.target.value)}
    />
    <button
      className="border border-black bg-blue-400 text-white rounded-sm w-[50%] p-2"
      onClick={() => Login()}
    >
      Klik
    </button>
  </div>

  {/* Menu Chat */}
  <div className="flex gap-4 bg-black p-3 rounded-md w-[80vw] justify-center">
    {["chat", "chat", "chat"].map((item, idx) => (
      <p
        key={idx}
        className="bg-white w-[60px] text-center rounded-sm cursor-pointer"
        onClick={() => Chat()}
      >
        {item}
      </p>
    ))}
  </div>

  <div className="relative left-30">
   <p className="absolute left-[-50vw]">abxjsax</p>
     <p>sbxsjbxs</p>
       <p>sbxsjbxs</p>
  </div>


  
  {/* Room Chat */}
  <div ref={cahtRef} className="relative top-10 flex flex-col w-[90vw] h-[70vh] bg-blue-100 rounded-md overflow-hidden shadow-md">

    {/* Header */}
    <div className="bg-red-200 flex justify-center items-center p-2 relative">
      <p className="bg-white border-2 w-full text-center p-2 rounded-sm">username</p>
    </div>

    {/* Isi Chat */}
    <div className="flex-1 bg-red-100 p-2 overflow-auto rounded-b-md">
      <p>m</p>
    </div>

    {/* Input Text Chat */}
    {isActive && (
      <div className="flex gap-2 p-2 bg-gray-200">
        <input
          className="flex-1 border-2 border-black rounded-sm p-2"
          placeholder="Text chat"
        />
        <button className="bg-green-500 text-white p-2 rounded-sm">Kirim Pesan</button>
      </div>
    )}

    {/* Panel List Chat */}
    {!isActive && (
      <div className="flex flex-col p-2 gap-2 overflow-auto h-[20vh] bg-blue-200 rounded-b-md">
        <div className="flex gap-2">
          <input
            placeholder="Search"
            className="flex-1 border-2 border-black p-1 rounded-sm"
            onChange={(e) => setInputCari(e.target.value)}
          />
          <button onClick={() => cari()} className="bg-gray-300 p-1 rounded-sm">Cari</button>
        </div>

        {HasilSearch.map((item, idx) => (
          <p
            key={idx}
            className="bg-white p-2 rounded-sm cursor-pointer"
            onClick={() => ruang()}
          >
            {item.nama}
          </p>
        ))}

        {listData.length === 0 && (
          <p className="bg-white p-2 rounded-sm text-center">BELUM ADA KONTAK</p>
        )}

        {listData.map((item, idx) => (
          <p
            key={idx}
            className="bg-red-100 p-2 rounded-sm"
          >
            {item.nama}
          </p>
        ))}
      </div>
    )}

  </div>
</main>


    )
}