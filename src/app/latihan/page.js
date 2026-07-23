'use client'

import { useState,useEffect } from "react"
import axios from "axios"
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import { createSlice } from "@reduxjs/toolkit";
import { configureStore } from "@reduxjs/toolkit";
import { Kurale } from "next/font/google";
import { useDispatch, useSelector } from "react-redux";

const slice1 = createSlice({
  initialState:{data1:10,data2:20},
   reducers:{
    Tambah:(state,nilai)=>{
      state.data2 += nilai.payload
    },
    Kurang:(state,nilai)=> {
      state.data2 -= nilai.payload
    }
  }
})

export const {Tambah,Kurang} = slice1.actions;

const toko = configureStore({
  reducer:{
    wadahSlice1: slice1.reducer,
    wadahSlice2: slice1.reducer
  }
})

const jalankan = useDispatch()
const nilai = useSelector(state => state.wadahSlice2.data2)



export default function Latihan(){

    const [data,setdata] = useState([])
    const [input,setinput] = useState('');

    


    return(
        <div>
           <button onClick={()=> addTicket()}>addtiket</button>
           <button onClick={()=> jalankan(Tambah(10))}></button>
        </div>
    )
}