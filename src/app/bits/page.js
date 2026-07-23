'use client'

import { useState , useEffect, cloneElement } from "react"
import ShinyText from "../latihanCss/ShinyText"
import AnimatedList from './AnimatedList'

import { collection,getDocs,getDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import loadingIcon from './loading.json'
import Lottie from "lottie-react";




export default function Bits(){
   
   const [username , setUsername] = useState('');
   const [cari , setCari] = useState('');
   const [data , setData] = useState([]);
   const [isActive , setIsActive] = useState(false);
   const [usernameHeader , setUsernameHeader] = useState('')

   const [listDataUserChat , setListDataUserChat] = useState([])
   
   function Login(){
      const alamat = doc(db,'userLogin',username);
      setDoc(alamat,{
         nama:username
      })
   }

  async function find(){
      const alamatGetData = collection(db,'userLogin');
      const ress = await getDocs(alamatGetData);
     
      ress.forEach((doc)=> {
         setData(prev => [...prev,{docId:doc.id}])
      })
   }


   function roomchat(teman){
      setIsActive(true)
      const find = listDataUserChat.find(item => item.namaTeman == teman);
      if(find){
         alert('nama sudah ada')
      }
      else{
         setListDataUserChat(prev => [...prev , {namaTeman:teman}])
      }
      
   }


   function chatUser(nama){
       setUsernameHeader(nama)
   }

   return(
      <div className="flex flex-col items-center">
         <div className="input">
           <input placeholder="username" onChange={(e)=> setUsername(e.target.value)}></input>
           <button onClick={()=> Login()}>Login</button>
         </div>

         <div>
            <div className="search user">
               <input placeholder="cari user" className="border" onChange={(e)=> setCari(e.target.value)}></input>
               <button onClick={()=> find()}>cari</button>
               {data.filter(item => item.docId == cari).map((item,index)=> (
                  <div key={index}>
                    <p onClick={()=> roomchat(item.docId)}>{item.docId}</p>
                  </div>
               ))}
            </div>
         </div>
          
         <div>
            <div className="panel-chat fixed left-[5vw] top-[20vh] z-999 ">
               <AnimatedList
                items={listDataUserChat.map((item,index)=>(
                  <div onClick={()=> chatUser(item.namaTeman)} key={index} className="bg-red-100 w-[60vw] h-[5vh]">
                    <p>{item.namaTeman}</p>
                  </div>
                ))}
                showGradients={true}
                enableArrowNavigation={true}
                displayScrollbar={true}
               />
            </div>
         </div>

         <div className="room-chat">
            <div>
               <p>{usernameHeader}</p>
            </div>
         </div>
        
      </div>
   )

}

