

// 'use client'

// import { Konteks } from "@/GlobalNilai/Global"
// import { LoadingRequest } from "@/UI/Loading/LoadingRequest";
// import { TimeoutNotif } from "@/UI/timeoutNotif/timeoutNotif";
// import axios from "axios";
// import { Axis3D } from "lucide-react";
// import { useContext } from "react";

// export function EditBarang() {
//   const { DetailBarang, setDetailBarang, formEditBarang, setFormEditBarang, setBarang, setLoading, loading, auth } = useContext(Konteks);

//   // ==========================================
//   // KALKULASI REAL-TIME HPP & MODAL SATUAN
//   // ==========================================
//   const hargaDasar = parseFloat(formEditBarang.harga_dasar) || 0;
//   const discDist = parseFloat(formEditBarang.persentase_diskon_distributor) || 0;

//   // 1. Modal Bersih Karton (setelah diskon distributor)
//   const modalBersihKarton = hargaDasar - (hargaDasar * (discDist / 100));

//   // 2. Ambil total isi karton (default ke 1 jika tidak ada)
//   const totalPcsPerKarton = parseFloat(formEditBarang.list_satuan?.[0]?.rasio_ke_pcs) || 1;

//   // 3. HPP per PCS
//   const hppPerPcs = totalPcsPerKarton > 0 ? modalBersihKarton / totalPcsPerKarton : 0;

//   // 4. Cari Item PACK & PCS dari list_satuan
//   const packItem = formEditBarang.list_satuan?.find((item) => item?.level === 2 || item?.nama_satuan === 'PACK');
//   const pcsItem = formEditBarang.list_satuan?.find((item) => item?.level === 1 || item?.nama_satuan === 'PCS');

//   // 5. Hitung Modal per Satuan & Status Rugi Real-Time
//   const rasioPack = parseFloat(packItem?.rasio_ke_pcs) || 10; // Default rasio pack (misal 10 pcs)
//   const modalPack = hppPerPcs * rasioPack;
//   const isPackRugi = packItem?.harga_jual > 0 && packItem?.harga_jual < modalPack;

//   const rasioPcs = parseFloat(pcsItem?.rasio_ke_pcs) || 1;
//   const modalPcs = hppPerPcs * rasioPcs;
//   const isPcsRugi = pcsItem?.harga_jual > 0 && pcsItem?.harga_jual < modalPcs;

//   // ==========================================
//   // FUNGSI SIMPAN
//   // ==========================================
//   async function Simpan() {
//     if (!DetailBarang?.DataBarang) {
//       return alert('Sepertinya ada masalah: Data barang tidak ditemukan');
//     }

//     const fee = parseFloat(formEditBarang.persentase_fee_harga_jual) || 0;
//     const modalBersih = hargaDasar - (hargaDasar * (discDist / 100));
//     const hargaJualHitung = Math.round(modalBersih * (1 + (fee / 100)));
//     const marginHitung = Math.round(hargaJualHitung - modalBersih);

//     const payloadFormUser = {
//       ...formEditBarang,
//       harga_jual: hargaJualHitung,
//       margin: marginHitung
//     };
//     alert(JSON.stringify(payloadFormUser.list_satuan))

//     try {
//       setLoading(prev => ({ ...prev, loadingRequest: true }));

//       const API = '/api-be/SERVER_BARANG/UPDATE_BARANG';
//       const ress = await axios.put(
//         API,
//         { dataBarang: DetailBarang.DataBarang, formUser: payloadFormUser },
//         { withCredentials: true }
//       );

//       // Update State Barang
//       setBarang(prev => prev.map((item) => {
//         if (item.kode_barang === DetailBarang?.DataBarang?.kode_barang) {
//           return {
//             ...item,
//             harga_dasar: payloadFormUser.harga_dasar,
//             harga_jual_produk_ke_pelanggan: payloadFormUser.harga_jual,
//             margin: payloadFormUser.margin,
//             persentase_diskon_distributor: payloadFormUser.persentase_diskon_distributor,
//             persentase_fee_harga_jual: payloadFormUser.persentase_fee_harga_jual,
//             list_satuan: formEditBarang.list_satuan?.map(satuan => {
//               if (satuan.level === 3 || satuan.nama_satuan === 'KARTON') {
//                 return { ...satuan, harga_jual: hargaJualHitung };
//               }
//               return satuan;
//             }) || []
//           };
//         }
//         return item;
//       }));

//       // Reset Form & Tutup Modal
//       setFormEditBarang({
//         kode_barang: DetailBarang?.DataBarang?.kode_barang || "",
//         harga_dasar: "",
//         harga_jual: "",
//         margin: "",
//         persentase_diskon_distributor: "",
//         persentase_fee_harga_jual: "",
//         list_satuan: []
//       });



//       // Set pesan sukses ke state toast (jika state toast kamu menyimpan pesan)
//       const pesanSukses = 'Berhasil edit barang' + (ress.data.warning ? `\n${ress.data.warning}` : '');
//       tampilkanToast(pesanSukses, 'success');

//     } catch (err) {
//       const pesanGagal = err?.response?.data?.message || 'Internal server bermasalah coba lagi!';
//       tampilkanToast(pesanGagal, 'error');
//       if (err.response.status == 401 || 403) {
//         setLoading(prev => ({ ...prev, timeout: true }))
//       }
//     } finally {
//       // Matikan loading request
//       setLoading(prev => ({ ...prev, loadingRequest: false }));
//       setDetailBarang(prev => ({ ...prev, CloseEdit: false }));
//     }
//   }

//   // Helper Function untuk Handle Timer Toast secara terpisah
//   function tampilkanToast(message, type) {
//     setLoading(prev => ({
//       ...prev,
//       toast: true,
//       toastMessage: message,
//       toastType: type
//     }));

//     setTimeout(() => {
//       setLoading(prev => ({ ...prev, toast: false }));
//     }, 3000);
//   }

// async function OpenBonus(params) {
//   alert(JSON.stringify(params))
//   // 1. Destructuring dengan fallback objek kosong & optional chaining
//   const kode_barang = params?.kode_barang || formEditBarang?.kode_barang || DetailBarang?.DataBarang?.kode_barang;

//   if (!kode_barang) {
//     return alert('Kode barang wajib diisi!');
//   }

//   try {
//     // 2. Set loading jika menggunakan state global/local
//     if (setLoading) {
//       setLoading(prev => ({ ...prev, loadingRequest: true }));
//     }

//     const API = '/api-be/SERVER_BARANG/OPEN_BONUS';
//     const ress = await axios.put(API, { kode_barang }, { withCredentials: true });

//     // 3. Beri notifikasi ke user
//     if (typeof tampilkanToast === 'function') {
//       tampilkanToast(ress?.data?.message || 'Berhasil membuka bonus!', 'success');
//     } else {
//       alert(ress?.data?.message || 'Berhasil membuka bonus!');
//     }

//     setDetailBarang(prev => ({
//       ...prev,
//       DataBarang:{
//         ...prev.DataBarang,
//         ada_fitur_bonus:1
//       }
//     }))

//     return ress?.data;

//   } catch (err) {
//     const errorMsg = err?.response?.data?.message || 'Gagal membuka bonus barang';
    
//     if (typeof tampilkanToast === 'function') {
//       tampilkanToast(errorMsg, 'error');
//     } else {
//       alert(errorMsg);
//     }

//     // Handle session timeout jika ada
//     if (err?.response?.status === 401 || err?.response?.status === 403) {
//       window.location.href = err?.response?.data?.navigasi || '/';
//     }

//   } finally {
//     if (setLoading) {
//       setLoading(prev => ({ ...prev, loadingRequest: false }));
//     }
//   }
// }


// async function CloseBonus(params) {

//   // 1. Destructuring dengan fallback objek kosong & optional chaining
//   const kode_barang = params?.kode_barang || formEditBarang?.kode_barang || DetailBarang?.DataBarang?.kode_barang;

//   if (!kode_barang) {
//     return alert('Kode barang wajib diisi!');
//   }

//   try {
//     // 2. Set loading jika menggunakan state global/local
//     if (setLoading) {
//       setLoading(prev => ({ ...prev, loadingRequest: true }));
//     }

//     const API = '/api-be/SERVER_BARANG/CLOSE_BONUS';
//     const ress = await axios.put(API, { kode_barang }, { withCredentials: true });

//     // 3. Beri notifikasi ke user
//     if (typeof tampilkanToast === 'function') {
//       tampilkanToast(ress?.data?.message || 'Berhasil membuka bonus!', 'success');
//     } else {
//       alert(ress?.data?.message || 'Berhasil membuka bonus!');
//     }

//     setDetailBarang(prev => ({
//       ...prev,
//       DataBarang:{
//         ...prev.DataBarang,
//         ada_fitur_bonus:0
//       }
//     }))


//     return ress?.data;

  
//   } catch (err) {
//     const errorMsg = err?.response?.data?.message || 'Gagal membuka bonus barang';
    
//     if (typeof tampilkanToast === 'function') {
//       tampilkanToast(errorMsg, 'error');
//     } else {
//       alert(errorMsg);
//     }

//     // Handle session timeout jika ada
//     if (err?.response?.status === 401 || err?.response?.status === 403) {
//       window.location.href = err?.response?.data?.navigasi || '/';
//     }

//   } finally {
//     if (setLoading) {
//       setLoading(prev => ({ ...prev, loadingRequest: false }));
//     }
//   }
// }




//   if (loading.timeout) {
//     return <TimeoutNotif isActive={true} />
//   }

//   return (
//     <>
//       <LoadingRequest />
//       <main className={`${DetailBarang.CloseEdit ? 'flex' : 'hidden'} fixed inset-0 z-50 items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 transition-all duration-300`}>
//         <div className="w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5 transition-all">

//           {/* Header Modal */}
//           <div className="border-b border-slate-100 bg-slate-50/80 px-5 sm:px-7 py-4 sm:py-5 shrink-0">
//             <div className="flex items-center justify-between gap-3">
//               <div className="min-w-0">
//                 <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 inline-block">
//                   Edit Data
//                 </span>
//                 <h1 className="mt-1.5 text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
//                   {DetailBarang?.DataBarang?.nama_barang || "Edit Barang"}
//                 </h1>
//               </div>
//               <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200/60">
//                 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                 </svg>
//               </div>
//             </div>
//             <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
//               Perbarui parameter harga dan potongan distributor barang.
//             </p>
//           </div>

//           {/* Body Modal (Scrollable) */}
//           <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1">

//             {/* Harga Dasar Karton */}
//             <div className="space-y-1.5">
//               <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
//                 Harga Dasar Karton <span className="text-rose-500 font-bold">*</span>
//               </label>
//               <div className="relative rounded-xl shadow-xs">
//                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
//                   <span className="text-sm font-bold text-slate-500">Rp</span>
//                 </div>
//                 <input
//                   onChange={(e) => setFormEditBarang(prev => ({ ...prev, harga_dasar: e.target.value }))}
//                   type="number"
//                   value={formEditBarang.harga_dasar || ""}
//                   placeholder="0"
//                   className="w-full h-12 rounded-2xl border border-slate-300 pl-11 pr-4 text-base sm:text-lg font-black text-slate-900 placeholder-slate-300 transition-all focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/80"
//                 />
//               </div>
//             </div>

//             <div className="h-px w-full bg-slate-100" />

//             {/* Discount & Fee Section */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div className="space-y-1.5">
//                 <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
//                   Diskon Distributor
//                 </label>
//                 <div className="relative rounded-xl shadow-xs">
//                   <input
//                     onChange={(e) => setFormEditBarang(prev => ({ ...prev, persentase_diskon_distributor: e.target.value }))}
//                     type="number"
//                     step="any"
//                     value={formEditBarang.persentase_diskon_distributor || ""}
//                     placeholder="0.00"
//                     className="w-full h-12 rounded-2xl border border-slate-300 pl-4 pr-10 text-base sm:text-lg font-bold text-slate-900 placeholder-slate-300 transition-all focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/80"
//                   />
//                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
//                     <span className="text-sm font-extrabold text-slate-500">%</span>
//                   </div>
//                 </div>
//               </div>
//  {DetailBarang?.DataBarang?.ada_fitur_bonus}
//               <div className="space-y-1.5">
//                 <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
//                   Fee
//                 </label>
//                 <div className="relative rounded-xl shadow-xs">
//                   <input
//                     onChange={(e) => setFormEditBarang(prev => ({ ...prev, persentase_fee_harga_jual: e.target.value }))}
//                     type="number"
//                     step="any"
//                     value={formEditBarang.persentase_fee_harga_jual || ""}
//                     placeholder="0.00"
//                     className="w-full h-12 rounded-2xl border border-slate-300 pl-4 pr-10 text-base sm:text-lg font-bold text-slate-900 placeholder-slate-300 transition-all focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/80"
//                   />
//                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
//                     <span className="text-sm font-extrabold text-slate-500">%</span>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Header & Informasi Karton */}
//             <div className="space-y-4 font-sans">
//               <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
//                 <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">
//                   Isi per Karton
//                 </span>
//                 <span className="text-sm sm:text-base font-black text-slate-900 bg-white px-3.5 py-1 rounded-xl shadow-xs border border-slate-200">
//                   {totalPcsPerKarton} PCS
//                 </span>
//               </div>

//               {/* Info Box: Modal per PCS */}
//               <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 sm:p-5 rounded-2xl space-y-1.5">
//                 <div className="flex items-center justify-between">
//                   <span className="text-xs sm:text-sm font-bold text-emerald-900">
//                     Harga Modal per PCS
//                   </span>
//                   <span className="text-lg sm:text-xl font-black text-emerald-700">
//                     Rp {Math.round(hppPerPcs).toLocaleString('id-ID')}
//                   </span>
//                 </div>
//                 <p className="text-xs text-emerald-700/90 leading-relaxed font-medium">
//                   *Dihitung otomatis dari harga dasar karton dikurangi diskon distributor dibagi jumlah PCS.
//                 </p>
//               </div>

//               {/* Dynamic Inputs: Harga Eceran (Pack & PCS) */}
//               <div className="space-y-3 pt-3 border-t border-slate-100">
//                 <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
//                   Set Harga Jual Eceran
//                 </label>

//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
//                   {/* Input Pack (Level 2) */}
//                   <div className="space-y-1.5">
//                     <span className="text-xs font-bold text-slate-500 uppercase block">Harga jual per Pack</span>
//                     <div className="relative">
//                       <span className="absolute left-3.5 top-3.5 text-sm font-bold text-slate-500">Rp</span>
//                       <input
//                         type="number"
//                         placeholder="0"
//                         value={packItem?.harga_jual || ''}
//                         onChange={(e) => setFormEditBarang(prev => ({
//                           ...prev,
//                           list_satuan: (prev.list_satuan || []).map(item => {
//                             if (!item) return item;
//                             if (item.level === 2 || item.nama_satuan === 'PACK') {
//                               return {
//                                 ...item,
//                                 id: item.id || item.id_satuan,
//                                 harga_jual: Number(e.target.value) || 0
//                               };
//                             }
//                             return item;
//                           })
//                         }))}
//                         className={`w-full h-12 pl-11 pr-3 text-base font-bold text-slate-900 border rounded-2xl outline-none transition-all ${isPackRugi
//                           ? 'bg-rose-50 border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-200'
//                           : 'bg-slate-50/80 border-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
//                           }`}
//                       />
//                     </div>
//                     {/* Warning Real-time PACK */}
//                     {isPackRugi && (
//                       <p className="text-xs font-bold text-rose-600 mt-1 bg-rose-50 p-2 rounded-xl border border-rose-200 animate-pulse">
//                         ⚠️ Di bawah modal (Min: Rp {Math.ceil(modalPack).toLocaleString('id-ID')})
//                       </p>
//                     )}
//                   </div>

//                   {/* Input PCS (Level 1) */}
//                   <div className="space-y-1.5">
//                     <span className="text-xs font-bold text-slate-500 uppercase block">Harga jual per PCS</span>
//                     <div className="relative">
//                       <span className="absolute left-3.5 top-3.5 text-sm font-bold text-slate-500">Rp</span>
//                       <input
//                         type="number"
//                         placeholder="0"
//                         value={pcsItem?.harga_jual || ''}
//                         onChange={(e) => setFormEditBarang(prev => ({
//                           ...prev,
//                           list_satuan: (prev.list_satuan || []).map(item => {
//                             if (!item) return item;
//                             if (item.level === 1 || item.nama_satuan === 'PCS') {
//                               return {
//                                 ...item,
//                                 id: item.id || item.id_satuan,
//                                 harga_jual: Number(e.target.value) || 0
//                               };
//                             }
//                             return item;
//                           })
//                         }))}
//                         className={`w-full h-12 pl-11 pr-3 text-base font-bold text-slate-900 border rounded-2xl outline-none transition-all ${isPcsRugi
//                           ? 'bg-rose-50 border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-200'
//                           : 'bg-slate-50/80 border-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
//                           }`}
//                       />
//                     </div>
//                     {/* Warning Real-time PCS */}
//                     {isPcsRugi && (
//                       <p className="text-xs font-bold text-rose-600 mt-1 bg-rose-50 p-2 rounded-xl border border-rose-200 animate-pulse">
//                         ⚠️ Di bawah modal (Min: Rp {Math.ceil(modalPcs).toLocaleString('id-ID')})
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>

//           </div>



//           {/* Footer Modal Action Buttons */}


//           <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 sm:px-7 py-4 shrink-0">
          
//             <button onClick={()=> OpenBonus(formEditBarang.kode_barang)} className={`${DetailBarang.DataBarang?.ada_fitur_bonus == 0 ? 'block':'hidden'} bg-purple-100 text-purple-900 rounded-md p-2 font-extrabold hover:bg-purple-200`}>Terapkan Bonus</button>
//             <button onClick={()=> CloseBonus(formEditBarang.kode_barang)} className={`${DetailBarang.DataBarang?.ada_fitur_bonus == 1 ? 'block':'hidden'} bg-orange-100 text-orange-900 rounded-md p-2 font-extrabold hover:bg-orange-200`}>Hentikan Bonus</button>
//             <div className="flex">
//               <button
//                 onClick={() => setDetailBarang(prev => ({ ...prev, CloseEdit: false }))}
//                 type="button"
//                 className="h-12 px-5 rounded-2xl text-xs sm:text-sm font-bold text-slate-600 transition-all hover:bg-slate-200/80 active:scale-95 cursor-pointer"
//               >
//                 Batal
//               </button>
              
//               <button
//                 onClick={() => Simpan()}
//                 type="button"
//                 className="h-12 px-7 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center"
//               >
//                 Simpan Perubahan
//               </button>
//             </div>
//           </div>
//         </div>


//       </main>
//     </>
//   )
// }


'use client'

import { Konteks } from "@/GlobalNilai/Global"
import { LoadingRequest } from "@/UI/Loading/LoadingRequest";
import { TimeoutNotif } from "@/UI/timeoutNotif/timeoutNotif";
import axios from "axios";
import { Axis3D } from "lucide-react";
import { useContext, useState } from "react";

export function EditBarang() {
  const { DetailBarang, setDetailBarang, formEditBarang, setFormEditBarang, setBarang, setLoading, loading, auth } = useContext(Konteks);

  // ==========================================
  // KALKULASI REAL-TIME HPP & MODAL SATUAN
  // ==========================================
  const hargaDasar = parseFloat(formEditBarang.harga_dasar) || 0;
  const discDist = parseFloat(formEditBarang.persentase_diskon_distributor) || 0;

  // 1. Modal Bersih Karton (setelah diskon distributor)
  const modalBersihKarton = hargaDasar - (hargaDasar * (discDist / 100));

  // ==========================================
  // FEE RUPIAH (terhubung dua arah dengan persentase_fee_harga_jual)
  // Sumber kebenaran tetap persentase, rupiah hanya turunan.
  // ==========================================
  const [editingFeeRupiah, setEditingFeeRupiah] = useState(false);
  const [feeRupiahText, setFeeRupiahText] = useState('');

  const feePersen = parseFloat(formEditBarang.persentase_fee_harga_jual) || 0;
  const feeRupiahHitung = Math.round(modalBersihKarton * (feePersen / 100));
  const feeRupiahTampil = editingFeeRupiah
    ? feeRupiahText
    : (feePersen ? String(feeRupiahHitung) : '');

  function handleFeeRupiah(e) {
    const val = e.target.value;
    setFeeRupiahText(val);

    if (val === '') {
      setFormEditBarang(prev => ({ ...prev, persentase_fee_harga_jual: '' }));
      return;
    }
    if (modalBersihKarton <= 0) return;

    // rupiah -> persen (6 desimal supaya selisih rupiah tidak terasa)
    const pct = Math.round(((parseFloat(val) || 0) / modalBersihKarton) * 100 * 1e6) / 1e6;
    setFormEditBarang(prev => ({ ...prev, persentase_fee_harga_jual: String(pct) }));
  }

  // 2. Ambil total isi karton (default ke 1 jika tidak ada)
  const totalPcsPerKarton = parseFloat(formEditBarang.list_satuan?.[0]?.rasio_ke_pcs) || 1;

  // 3. HPP per PCS
  const hppPerPcs = totalPcsPerKarton > 0 ? modalBersihKarton / totalPcsPerKarton : 0;

  // 4. Cari Item PACK & PCS dari list_satuan
  const packItem = formEditBarang.list_satuan?.find((item) => item?.level === 2 || item?.nama_satuan === 'PACK');
  const pcsItem = formEditBarang.list_satuan?.find((item) => item?.level === 1 || item?.nama_satuan === 'PCS');

  // 5. Hitung Modal per Satuan & Status Rugi Real-Time
  const rasioPack = parseFloat(packItem?.rasio_ke_pcs) || 10; // Default rasio pack (misal 10 pcs)
  const modalPack = hppPerPcs * rasioPack;
  const isPackRugi = packItem?.harga_jual > 0 && packItem?.harga_jual < modalPack;

  const rasioPcs = parseFloat(pcsItem?.rasio_ke_pcs) || 1;
  const modalPcs = hppPerPcs * rasioPcs;
  const isPcsRugi = pcsItem?.harga_jual > 0 && pcsItem?.harga_jual < modalPcs;

  // ==========================================
  // FUNGSI SIMPAN
  // ==========================================
  async function Simpan() {
    if (!DetailBarang?.DataBarang) {
      return alert('Sepertinya ada masalah: Data barang tidak ditemukan');
    }

    const fee = parseFloat(formEditBarang.persentase_fee_harga_jual) || 0;
    const modalBersih = hargaDasar - (hargaDasar * (discDist / 100));
    const hargaJualHitung = Math.round(modalBersih * (1 + (fee / 100)));
    const marginHitung = Math.round(hargaJualHitung - modalBersih);

    const payloadFormUser = {
      ...formEditBarang,
      harga_jual: hargaJualHitung,
      margin: marginHitung
    };
    alert(JSON.stringify(payloadFormUser.list_satuan))

    try {
      setLoading(prev => ({ ...prev, loadingRequest: true }));

      const API = '/api-be/SERVER_BARANG/UPDATE_BARANG';
      const ress = await axios.put(
        API,
        { dataBarang: DetailBarang.DataBarang, formUser: payloadFormUser },
        { withCredentials: true }
      );

      // Update State Barang
      setBarang(prev => prev.map((item) => {
        if (item.kode_barang === DetailBarang?.DataBarang?.kode_barang) {
          return {
            ...item,
            harga_dasar: payloadFormUser.harga_dasar,
            harga_jual_produk_ke_pelanggan: payloadFormUser.harga_jual,
            margin: payloadFormUser.margin,
            persentase_diskon_distributor: payloadFormUser.persentase_diskon_distributor,
            persentase_fee_harga_jual: payloadFormUser.persentase_fee_harga_jual,
            list_satuan: formEditBarang.list_satuan?.map(satuan => {
              if (satuan.level === 3 || satuan.nama_satuan === 'KARTON') {
                return { ...satuan, harga_jual: hargaJualHitung };
              }
              return satuan;
            }) || []
          };
        }
        return item;
      }));

      // Reset Form & Tutup Modal
      setFormEditBarang({
        kode_barang: DetailBarang?.DataBarang?.kode_barang || "",
        harga_dasar: "",
        harga_jual: "",
        margin: "",
        persentase_diskon_distributor: "",
        persentase_fee_harga_jual: "",
        list_satuan: []
      });



      // Set pesan sukses ke state toast (jika state toast kamu menyimpan pesan)
      const pesanSukses = 'Berhasil edit barang' + (ress.data.warning ? `\n${ress.data.warning}` : '');
      tampilkanToast(pesanSukses, 'success');

    } catch (err) {
      const pesanGagal = err?.response?.data?.message || 'Internal server bermasalah coba lagi!';
      tampilkanToast(pesanGagal, 'error');
      if (err.response.status == 401 || 403) {
        setLoading(prev => ({ ...prev, timeout: true }))
      }
    } finally {
      // Matikan loading request
      setLoading(prev => ({ ...prev, loadingRequest: false }));
      setDetailBarang(prev => ({ ...prev, CloseEdit: false }));
    }
  }

  // Helper Function untuk Handle Timer Toast secara terpisah
  function tampilkanToast(message, type) {
    setLoading(prev => ({
      ...prev,
      toast: true,
      toastMessage: message,
      toastType: type
    }));

    setTimeout(() => {
      setLoading(prev => ({ ...prev, toast: false }));
    }, 3000);
  }

async function OpenBonus(params) {

  // 1. Destructuring dengan fallback objek kosong & optional chaining
  const kode_barang = params?.kode_barang || formEditBarang?.kode_barang || DetailBarang?.DataBarang?.kode_barang;

  if (!kode_barang) {
    return alert('Kode barang wajib diisi!');
  }

  try {
    // 2. Set loading jika menggunakan state global/local
    if (setLoading) {
      setLoading(prev => ({ ...prev, loadingRequest: true }));
    }

    const API = '/api-be/SERVER_BARANG/OPEN_BONUS';
    const ress = await axios.put(API, { kode_barang }, { withCredentials: true });

    // 3. Beri notifikasi ke user
    if (typeof tampilkanToast === 'function') {
      tampilkanToast(ress?.data?.message || 'Berhasil membuka bonus!', 'success');
    } else {
      alert(ress?.data?.message || 'Berhasil membuka bonus!');
    }

    setDetailBarang(prev => ({
      ...prev,
      DataBarang:{
        ...prev.DataBarang,
        ada_fitur_bonus:1
      }
    }))

    return ress?.data;

  } catch (err) {
    const errorMsg = err?.response?.data?.message || 'Gagal membuka bonus barang';
    
    if (typeof tampilkanToast === 'function') {
      tampilkanToast(errorMsg, 'error');
    } else {
      alert(errorMsg);
    }

    // Handle session timeout jika ada
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      window.location.href = err?.response?.data?.navigasi || '/';
    }

  } finally {
    if (setLoading) {
      setLoading(prev => ({ ...prev, loadingRequest: false }));
    }
  }
}


async function CloseBonus(params) {

  // 1. Destructuring dengan fallback objek kosong & optional chaining
  const kode_barang = params?.kode_barang || formEditBarang?.kode_barang || DetailBarang?.DataBarang?.kode_barang;

  if (!kode_barang) {
    return alert('Kode barang wajib diisi!');
  }

  try {
    // 2. Set loading jika menggunakan state global/local
    if (setLoading) {
      setLoading(prev => ({ ...prev, loadingRequest: true }));
    }

    const API = '/api-be/SERVER_BARANG/CLOSE_BONUS';
    const ress = await axios.put(API, { kode_barang }, { withCredentials: true });

    // 3. Beri notifikasi ke user
    if (typeof tampilkanToast === 'function') {
      tampilkanToast(ress?.data?.message || 'Berhasil membuka bonus!', 'success');
    } else {
      alert(ress?.data?.message || 'Berhasil membuka bonus!');
    }

    setDetailBarang(prev => ({
      ...prev,
      DataBarang:{
        ...prev.DataBarang,
        ada_fitur_bonus:0
      }
    }))


    return ress?.data;

  
  } catch (err) {
    const errorMsg = err?.response?.data?.message || 'Gagal membuka bonus barang';
    
    if (typeof tampilkanToast === 'function') {
      tampilkanToast(errorMsg, 'error');
    } else {
      alert(errorMsg);
    }

    // Handle session timeout jika ada
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      window.location.href = err?.response?.data?.navigasi || '/';
    }

  } finally {
    if (setLoading) {
      setLoading(prev => ({ ...prev, loadingRequest: false }));
    }
  }
}




  if (loading.timeout) {
    return <TimeoutNotif isActive={true} />
  }

  return (
    <>
      <LoadingRequest />
      <main className={`${DetailBarang.CloseEdit ? 'flex' : 'hidden'} fixed inset-0 z-50 items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 transition-all duration-300`}>
        <div className="w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5 transition-all">

          {/* Header Modal */}
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 sm:px-7 py-4 sm:py-5 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 inline-block">
                  Edit Data
                </span>
                <h1 className="mt-1.5 text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                  {DetailBarang?.DataBarang?.nama_barang || "Edit Barang"}
                </h1>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200/60">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              Perbarui parameter harga dan potongan distributor barang.
            </p>
          </div>

          {/* Body Modal (Scrollable) */}
          <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1">

            {/* Harga Dasar Karton */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Harga Dasar Karton <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="text-sm font-bold text-slate-500">Rp</span>
                </div>
                <input
                  onChange={(e) => setFormEditBarang(prev => ({ ...prev, harga_dasar: e.target.value }))}
                  type="number"
                  value={formEditBarang.harga_dasar || ""}
                  placeholder="0"
                  className="w-full h-12 rounded-2xl border border-slate-300 pl-11 pr-4 text-base sm:text-lg font-black text-slate-900 placeholder-slate-300 transition-all focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/80"
                />
              </div>
            </div>

            <div className="h-px w-full bg-slate-100" />

            {/* Discount & Fee Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Diskon Distributor
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <input
                    onChange={(e) => setFormEditBarang(prev => ({ ...prev, persentase_diskon_distributor: e.target.value }))}
                    type="number"
                    step="any"
                    value={formEditBarang.persentase_diskon_distributor || ""}
                    placeholder="0.00"
                    className="w-full h-12 rounded-2xl border border-slate-300 pl-4 pr-10 text-base sm:text-lg font-bold text-slate-900 placeholder-slate-300 transition-all focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/80"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <span className="text-sm font-extrabold text-slate-500">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex gap-5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Fee:  <p className="text-red-500 font-bold">{' '} { Number(formEditBarang.persentase_fee_harga_jual).toFixed(2) || ""}%</p>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <input
                    onChange={(e) => setFormEditBarang(prev => ({ ...prev, persentase_fee_harga_jual: e.target.value }))}
                    type="number"
                    step="any"
                    value={formEditBarang.persentase_fee_harga_jual  || ""}
                    placeholder="0.00"
                    className="w-full h-12 rounded-2xl border border-slate-300 pl-4 pr-10 text-base sm:text-lg font-bold text-slate-900 placeholder-slate-300 transition-all focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/80"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <span className="text-sm font-extrabold text-slate-500">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee dalam Rupiah (tersambung dengan Fee %) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Fee (Rupiah)
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="text-sm font-bold text-slate-500">Rp</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={modalBersihKarton <= 0}
                  value={feeRupiahTampil}
                  onFocus={() => {
                    setFeeRupiahText(feePersen ? String(feeRupiahHitung) : '');
                    setEditingFeeRupiah(true);
                  }}
                  onBlur={() => setEditingFeeRupiah(false)}
                  onChange={handleFeeRupiah}
                  placeholder="0"
                  className="w-full h-12 rounded-2xl border border-slate-300 pl-11 pr-4 text-base sm:text-lg font-bold text-slate-900 placeholder-slate-300 transition-all focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/80 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <p className="text-xs font-medium text-slate-500">
                {modalBersihKarton <= 0
                  ? 'Isi harga dasar karton dulu.'
                  : 'Terhubung dengan Fee (%): ubah salah satu, yang lain ikut menyesuaikan.'}
              </p>
            </div>

            {/* Header & Informasi Karton */}
            <div className="space-y-4 font-sans">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Isi per Karton
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 bg-white px-3.5 py-1 rounded-xl shadow-xs border border-slate-200">
                  {totalPcsPerKarton} PCS
                </span>
              </div>

              {/* Info Box: Modal per PCS */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 sm:p-5 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-emerald-900">
                    Harga Modal per PCS
                  </span>
                  <span className="text-lg sm:text-xl font-black text-emerald-700">
                    Rp {Math.round(hppPerPcs).toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-xs text-emerald-700/90 leading-relaxed font-medium">
                  *Dihitung otomatis dari harga dasar karton dikurangi diskon distributor dibagi jumlah PCS.
                </p>
              </div>

              {/* Dynamic Inputs: Harga Eceran (Pack & PCS) */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                  Set Harga Jual Eceran
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Input Pack (Level 2) */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase block">Harga jual per Pack</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-sm font-bold text-slate-500">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={packItem?.harga_jual || ''}
                        onChange={(e) => setFormEditBarang(prev => ({
                          ...prev,
                          list_satuan: (prev.list_satuan || []).map(item => {
                            if (!item) return item;
                            if (item.level === 2 || item.nama_satuan === 'PACK') {
                              return {
                                ...item,
                                id: item.id || item.id_satuan,
                                harga_jual: Number(e.target.value) || 0
                              };
                            }
                            return item;
                          })
                        }))}
                        className={`w-full h-12 pl-11 pr-3 text-base font-bold text-slate-900 border rounded-2xl outline-none transition-all ${isPackRugi
                          ? 'bg-rose-50 border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-200'
                          : 'bg-slate-50/80 border-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                          }`}
                      />
                    </div>
                    {/* Warning Real-time PACK */}
                    {isPackRugi && (
                      <p className="text-xs font-bold text-rose-600 mt-1 bg-rose-50 p-2 rounded-xl border border-rose-200 animate-pulse">
                        ⚠️ Di bawah modal (Min: Rp {Math.ceil(modalPack).toLocaleString('id-ID')})
                      </p>
                    )}
                  </div>

                  {/* Input PCS (Level 1) */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase block">Harga jual per PCS</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-sm font-bold text-slate-500">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={pcsItem?.harga_jual || ''}
                        onChange={(e) => setFormEditBarang(prev => ({
                          ...prev,
                          list_satuan: (prev.list_satuan || []).map(item => {
                            if (!item) return item;
                            if (item.level === 1 || item.nama_satuan === 'PCS') {
                              return {
                                ...item,
                                id: item.id || item.id_satuan,
                                harga_jual: Number(e.target.value) || 0
                              };
                            }
                            return item;
                          })
                        }))}
                        className={`w-full h-12 pl-11 pr-3 text-base font-bold text-slate-900 border rounded-2xl outline-none transition-all ${isPcsRugi
                          ? 'bg-rose-50 border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-200'
                          : 'bg-slate-50/80 border-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                          }`}
                      />
                    </div>
                    {/* Warning Real-time PCS */}
                    {isPcsRugi && (
                      <p className="text-xs font-bold text-rose-600 mt-1 bg-rose-50 p-2 rounded-xl border border-rose-200 animate-pulse">
                        ⚠️ Di bawah modal (Min: Rp {Math.ceil(modalPcs).toLocaleString('id-ID')})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>



          {/* Footer Modal Action Buttons */}


          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 sm:px-7 py-4 shrink-0">
          
            <button onClick={()=> OpenBonus(formEditBarang.kode_barang)} className={`${DetailBarang.DataBarang?.ada_fitur_bonus == 0 ? 'block':'hidden'} bg-purple-100 text-purple-900 rounded-md p-2 font-extrabold hover:bg-purple-200`}>Terapkan Bonus</button>
            <button onClick={()=> CloseBonus(formEditBarang.kode_barang)} className={`${DetailBarang.DataBarang?.ada_fitur_bonus == 1 ? 'block':'hidden'} bg-orange-100 text-orange-900 rounded-md p-2 font-extrabold hover:bg-orange-200`}>Hentikan Bonus</button>
            <div className="flex">
              <button
                onClick={() => setDetailBarang(prev => ({ ...prev, CloseEdit: false }))}
                type="button"
                className="h-12 px-5 rounded-2xl text-xs sm:text-sm font-bold text-slate-600 transition-all hover:bg-slate-200/80 active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              
              <button
                onClick={() => Simpan()}
                type="button"
                className="h-12 px-7 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>


      </main>
    </>
  )
}
