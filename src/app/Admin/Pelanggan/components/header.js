'use client'

import React, { useContext, useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, X } from 'lucide-react';
import { Konteks } from '@/GlobalNilai/Global';
import { LoadingRequest } from '@/UI/Loading/LoadingRequest';

const DEBOUNCE_MS = 400;

export function HeaderPelanggan({ onTambahPelanggan }) {
    const router = useRouter();
    const { setDataPelanggan , setLoading} = useContext(Konteks);

    // input dikontrol supaya bisa di-reset lewat tombol X
    const [inputValue, setInputValue] = useState('');
    const searchTimerRef = useRef(null);

    // Header tidak lagi memanggil API. Tugasnya cuma menyimpan keyword ke context,
    // dan TablePelanggan yang bertanggung jawab penuh atas semua request data.
    const simpanKeyword = useCallback((keyword) => {
        setDataPelanggan(prev => {
            const base = (prev && !Array.isArray(prev)) ? prev : {};
            if (base.keyword === keyword) return prev;
            return { ...base, keyword };
        });
    }, [setDataPelanggan]);

    const cariPelanggan = (e) => {
        const val = e.target.value;
        setInputValue(val);

        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        const keyword = val.trim();

        // Dikosongkan: langsung kembali ke daftar penuh, tanpa menunggu debounce.
        if (keyword === '') {
            simpanKeyword('');
            return;
        }

        searchTimerRef.current = setTimeout(() => {
            simpanKeyword(keyword);
        }, DEBOUNCE_MS);
    };

    const resetPencarian = () => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        setInputValue('');
        simpanKeyword('');
    };

    const tambahPelanggan = () => {
        if (typeof onTambahPelanggan === 'function') {
            onTambahPelanggan();
            return;
        }

        setLoading(prev => ({
            ...prev,
             isTambahPelanggan:true
        }))
    };

    useEffect(() => {
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, []);

    return (
       <div className="sticky top-0 z-50 w-full">
  <LoadingRequest />

  <header className="relative w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200 pt-[env(safe-area-inset-top)]">
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4 space-y-3">

      {/* Baris Atas: Tombol Back, Judul & Tombol Tambah Pelanggan */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/Admin/Dashboard')}
            aria-label="Kembali ke dashboard"
            className="group flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-800 border border-slate-200/60 transition-all hover:bg-slate-200/80 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5] text-slate-800 transition-transform group-hover:-translate-x-0.5" />
          </button>

          {/* Separator Tipis Desktop */}
          <div className="hidden sm:block w-px h-8 bg-slate-200/80 shrink-0" />

          <h1 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 truncate">
            Pelanggan
          </h1>
        </div>

        <button
          type="button"
          onClick={tambahPelanggan}
          className="tambah-pelanggan bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm h-11 sm:h-12 px-4 sm:px-5 rounded-2xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <span className="tambah-pelanggan">+ Pelanggan Baru</span>
        </button>
      </div>

      {/* Baris Bawah: Input Pencarian Integrated Clean */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={cariPelanggan}
          aria-label="Cari pelanggan"
          placeholder="Cari nama, kode pelanggan, atau no HP..."
          className="w-full bg-slate-50/80 text-slate-900 placeholder:text-slate-400 text-base sm:text-sm font-semibold pl-11 pr-11 h-12 rounded-xl border border-slate-300 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
        {inputValue !== '' && (
          <button
            type="button"
            onClick={resetPencarian}
            aria-label="Hapus pencarian"
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 active:scale-90 cursor-pointer transition-all"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}
      </div>

    </div>
  </header>
</div>
    );
}
