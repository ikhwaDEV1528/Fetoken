'use client'

import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";
import { useContext } from "react";

export function EditPelanggan() {
  const { loading, setLoading, formPelanggan, setFormPelanggan ,setDataPelanggan } = useContext(Konteks);

  async function tambahPelanggan() {
    if (!formPelanggan?.nama_pelanggan || !formPelanggan?.no_hp || !formPelanggan?.alamat) {
      alert('Ada data yang belum diisi!');
      return;
    }

    try {
      const API = '/api-be/SERVER_PELANGGAN/EDIT_PELANGGAN';
      await axios.put(API, { form: formPelanggan });
      setDataPelanggan(prev => ({
        ...prev,
        masterPelanggan: prev?.masterPelanggan?.map(item => {
            if(item.kode_pelanggan == formPelanggan.kode_pelanggan){
                return {
                    ...item,
                    nama_pelanggan:formPelanggan.nama_pelanggan,
                    no_hp:formPelanggan.no_hp,
                    alamat:formPelanggan.alamat,
                    kode_pelanggan:formPelanggan.kode_pelanggan
                }
            }
            return item;
        })
      }))
      
      alert('Berhasil menyimpan data!');
      setLoading(prev => ({ ...prev, isEditPelanggan: false }));
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Terjadi kesalahan');
    }
  }

  return (
    <main
      className={`fixed inset-0 z-[999999] flex justify-end transition-all duration-300 ${
         loading?.isEditPelanggan
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none delay-100'
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={() => setLoading(prev => ({ ...prev, isEditPelanggan: false }))}
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          loading?.isEditPelanggan ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Panel Slide-in */}
      <div
        className={`relative w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between z-10 transition-transform duration-300 ease-in-out transform ${
          loading?.isEditPelanggan ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
            <button
              onClick={() => setLoading(prev => ({ ...prev, isEditPelanggan: false }))}
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-200 text-green-600 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-emerald-600">
              Edit Pelanggan
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Nama Pelanggan</label>
            <input
              value={formPelanggan?.nama_pelanggan || ''}
              onChange={(e) => setFormPelanggan(prev => ({ ...prev, nama_pelanggan: e.target.value }))}
              type="text"
              placeholder="Masukkan nama pelanggan"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Nomor Pelanggan</label>
            <input
              value={formPelanggan?.no_hp || ''}
              onChange={(e) => setFormPelanggan(prev => ({ ...prev, no_hp: e.target.value }))}
              type="tel"
              placeholder="Masukkan nomor HP/WA"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Alamat Pelanggan</label>
            <textarea
              value={formPelanggan?.alamat || ''}
              onChange={(e) => setFormPelanggan(prev => ({ ...prev, alamat: e.target.value }))}
              rows={3}
              placeholder="Masukkan alamat lengkap"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
            />
          </div>
        </div>

        <button
          onClick={tambahPelanggan}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
        >
          Simpan
        </button>
      </div>
    </main>
  );
}