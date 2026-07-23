'use client'

import { useState } from "react";
import axios from "axios";

export default function Login() {
  const [Form, setForm] = useState({
    username: '',
    email: ''
  });

  async function login(e) {
    if (e) e.preventDefault();

    try {
      const API = "https://token-phi-dun.vercel.app/server_login/login";
      
      const RES = await axios.post(API, {
        username: Form.username,
        email: Form.email,
      }, {
        withCredentials: true
      });

      // 💡 Gunakan jalur huruf kecil untuk route standar Next.js
      const targetNavigasi = RES.data.navigasi == '/User/Home' ? '/User/Home' : '/Admin/Dashboard';

      // 💡 HARD REDIRECT: Memaksa browser pindah halaman + membawa cookie login terbaru
      window.location.href = targetNavigasi;

    } catch (err) {
      const pesanError = err.response?.data?.message || err.response?.data?.error || err.message || "Gagal terhubung ke server";
      alert(err + 'login');
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