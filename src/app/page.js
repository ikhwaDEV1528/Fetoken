'use client'

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Login() {
  const [Form, setForm] = useState({
    username: '',
    email: ''
  });

  const Navigasi = useRouter();

  async function login(e) {
    // 💡 1. Tahan reload bawaan browser (kalau nanti dimasukkan ke <form>)
    if (e) e.preventDefault();

    try {
      const API = "https://token-awyaiyz75-ikhwan-mardityas-projects.vercel.app/server_login/login";
      
      const RES = await axios.post(API, {
        username: Form.username,
        email: Form.email,
      }, {
        withCredentials: true
      });

      const tujuanNavigasi = RES.data.navigasi;

      if (tujuanNavigasi) {
        // 💡 2. Pindahkan halaman DULUAN sebelum alert memblokir eksekusi
        Navigasi.push(tujuanNavigasi);
        
        // 💡 3. Refresh router agar Next.js membaca status Cookie baru dari backend
        Navigasi.refresh();
      } else {
        alert("Berhasil login, tapi data navigasi tidak ditemukan!");
      }

    } catch (err) {
      const pesanError = err.response?.data?.message || err.response?.data?.error || err.message || "Gagal terhubung ke server";
      alert(pesanError);
    }
  }

  return (
    <main style={{ padding: '20px' }}>
      {['username', 'email'].map((item, index) => (
        <div key={index} style={{ marginBottom: '10px' }}>
          <input 
            placeholder={`Masukan ${item}`}
            value={Form[item]}
            onChange={(e) => setForm(prev => ({
              ...prev,
              [item]: e.target.value
            }))}
          />
        </div>
      ))}

      <button onClick={login}>Login</button>
    </main>
  );
}