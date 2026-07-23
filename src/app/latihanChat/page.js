'use client'

import { useState , useEffect, cloneElement } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore";
import { setDoc ,doc,addDoc} from "firebase/firestore";

export default function Chat(){
const [username , setUsername] = useState('');
const [password , setPassword] = useState('');
const [inputChat , setInputChat] = useState('');
const [inputSomeone , setChatSomeone] = useState('');
const [data , setData] = useState([]);
const [data2 , setData2] = useState([]);


function Login(){
 setDoc(doc(db,'chats', username),{idUser:username});
}


async function sendChat() {
  const alamat = collection(db,'chats','haidar', 'haidar dengan ikhwan')
  await addDoc(alamat, {
    text: inputChat,
    sender: username,
    createdAt: new Date()
  })
}


useEffect(()=> {
 async function getPesan() {
   const alamatHaidar = collection(db,'chats','haidar','haidar dengan ikhwan');
   const alamatIkhwan =  collection(db,'chats', 'ikhwan' , 'chat dengan aini');
   const ress = await getDocs(alamatIkhwan);
   const querySnapshot = await getDocs(alamatHaidar);
  
   let pesan = [];
   let pesanIkhwan = [];

   querySnapshot.forEach(doc => {
     pesan.push({text:doc.data().text,pengirim:doc.data().sender,name:doc.id});
     pesanIkhwan.push({text:doc.data().text,pengirim:doc.data().sender,nama:doc.id})
     console.log(pesan);
     setData(pesan);
     setData2(pesanIkhwan)
   });

}
getPesan();

},[inputChat])

 

    return(
        <main>

           <div className="main-container-input">
              <input placeholder="username" onChange={(e)=> setUsername(e.target.value)}></input>
              <input placeholder="password" onChange={(e)=> setPassword(e.target.value)}></input>
              <input onChange={(e)=> setChatSomeone(e.target.value)} placeholder="someone"></input>
              <button onClick={()=> Login()}>LOGIN</button>
           </div>

           <div className="room-chat relative top-50 left-0 flex flex-col bg-blue-100 h-100">
              
              <div className="show-chat z-999">
                 {data.map((item,index) => (
                     <div key={index}>
                        <p>from {item.pengirim} :{item.text}</p>
                        <p>NAMA :{item.name}</p>
                     </div>
                  ))}

                  {data2.map((item,index) => (
                     <div key={index}>
                        <p>nama :{item.nama}</p>
                     </div>
                  ))}
              </div>

              <div className="container-input relative top-60 left-40">
                 <input className="absolute top-20" placeholder="masukan text chat" onChange={(e)=> setInputChat(e.target.value)}></input>
                 <button className="absolute top-10 left-10" onClick={()=> sendChat()}>kirim</button>
              </div>

           </div>

        </main>
    )
}