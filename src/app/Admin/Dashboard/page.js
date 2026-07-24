'use client'

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Dashboard () {
    const Navigasi = useRouter();

    async function requestAdmin(params) {

        try {

           const API = 'https://token-phi-dun.vercel.app/server_login/test';
           const RES = await axios.get(API, {withCredentials:true});
           alert(JSON.stringify(RES.data.message));

        } catch (err) {

           if(err.response.status == 404) {
             alert('Silahkan login kembali!');
             return Navigasi.push('/')
           };

           alert(err.response.data.error)
        };
    };




    return (

        <main className="bg-green-500">
            INI HALAMAN ADMIN

            <button className="bg-red-400" onClick={requestAdmin}>REQ ADMIN</button>
        </main>
     )
}