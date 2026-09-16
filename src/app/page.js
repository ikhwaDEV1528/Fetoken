'use client'

import { useState } from "react";
import axios from "axios";
import { User_not_found } from "@/UI/Alert/user-not-found";

export default function Login(value_kompo) {
  const [Form, setForm] = useState({
    username: '',
    password: ''
  });

  const [Option, setOption] = useState({
    isloading: false,
    isAlert: false,
  });

  const [focusedInput, setFocusedInput] = useState(null);

  async function login(e) {
    if (e) e.preventDefault();
    setOption(prev => ({ ...prev, isloading: true }));

    try {
      const API = "/api-be/AUTH/LOGIN";
      const RES = await axios.post(API, {
        username: Form.username,
        password: Form.password,
      }, {
        withCredentials: true
      });
     
      const targetNavigasi = RES.data.navigasi;
      window.location.href = targetNavigasi;
       alert('Berhasil')
    } catch (err) {
      setOption(prev => ({ ...prev, isloading: false }));
      if (err.response?.data?.status == 404) {
        setOption(prev => ({ ...prev, isAlert: true }));
        return;
      }
      const pesanError = err.response?.data?.message || err.response?.data?.error || err.message || "Gagal terhubung ke server";
      alert(pesanError);
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-between items-center px-6 py-12 bg-slate-50/50 text-slate-800 antialiased">
      {/* Header Brand */}
      <div className="w-full max-w-sm flex justify-between items-center text-xs tracking-wider uppercase font-medium text-slate-400">
        <span>Aplikasi</span>
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      </div>

      {/* Main Form Section */}
      <div className="w-full max-w-sm my-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Selamat datang<span className="text-blue-600">.</span>
          </h1>
          <p className="text-sm text-slate-500">
            Masukan kredensial akun Anda untuk melanjutkan.
          </p>
        </div>

        <form onSubmit={login} className="space-y-5">
          {/* Input Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 tracking-wide uppercase">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={Form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                onFocus={() => setFocusedInput('username')}
                onBlur={() => setFocusedInput(null)}
                placeholder="nama_pengguna"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 ease-out"
              />
            </div>
          </div>

          {/* Input Email */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-slate-600 tracking-wide uppercase">
                Password
              </label>
              <a 
                href="#forgot" 
                className="text-xs text-slate-400 hover:text-blue-600 transition-colors duration-150"
              >
                Lupa email?
              </a>
            </div>
            <div className="relative">
              <input
                type="password"
                value={Form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                placeholder="Masukan password"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 ease-out"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={Option.isloading}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-medium text-sm rounded-xl transition-all duration-200 ease-out shadow-sm flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {Option.isloading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <svg 
                  className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Hak Cipta Dilindungi.
      </div>

      {/* Alert Component */}
      {Option.isAlert && (
        <User_not_found params={Option.isAlert} state={setOption} />
      )}
    </main>
  );
}