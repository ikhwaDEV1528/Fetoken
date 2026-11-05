// 'use client'

// import { Konteks } from "@/GlobalNilai/Global"
// import axios from "axios"
// import { useContext, useState } from "react"

// export function TambahProduk () {
//   const { DetailBarang, setDetailBarang, setDataInputBarang, faktur, setFaktur, inputCariSuplier, setInputCariSuplier } = useContext(Konteks)

//   const [formTambahBarang, setFormTambahBarang] = useState({
//     nama_barang: "",
//     satuan_terbesar: "KARTON", // BARU: Pilihan utama (KARTON / BALL)
//     harga_dasar: "",
//     persentase_diskon_distributor: '',
//     persentase_fee_harga_jual: "",
//     jumlah: 0,
//     isi_per_satuan_terbesar: "", // Menggantikan isi_per_karton
//     isi_per_pack: "",
//     harga_jual_pack: "",
//     harga_jual_pcs: "",
//   })

//   // ===== KALKULASI PREVIEW (real-time) =====
//   const hargaDasarNum = Number(formTambahBarang.harga_dasar) || 0;
//   const diskonDistNum = Number(formTambahBarang.persentase_diskon_distributor) || 0;
//   const feeNum = Number(formTambahBarang.persentase_fee_harga_jual) || 0;
//   const isiSatuanTerbesarNum = Number(formTambahBarang.isi_per_satuan_terbesar) || 0;
//   const isiPackNum = Number(formTambahBarang.isi_per_pack) || 0;

//   const modalBersih = hargaDasarNum - (hargaDasarNum * (diskonDistNum / 100));
//   const hargaJualSatuanTerbesar = Math.round(modalBersih * (1 + (feeNum / 100)));
//   const hppPerPcs = isiSatuanTerbesarNum > 0 ? modalBersih / isiSatuanTerbesarNum : 0;
//   const hppPerPack = isiPackNum > 0 ? hppPerPcs * isiPackNum : 0;

//   const hargaJualPackNum = Number(formTambahBarang.harga_jual_pack) || 0;
//   const hargaJualPcsNum = Number(formTambahBarang.harga_jual_pcs) || 0;

//   const warningPack = isiPackNum > 0 && hargaJualPackNum > 0 && hargaJualPackNum < hppPerPack;
//   const warningPcs = hargaJualPcsNum > 0 && hargaJualPcsNum < hppPerPcs;

//   function SimpanTambahProduk() {
//     // 1. Validasi input utama
//     if (!formTambahBarang.nama_barang || !formTambahBarang.harga_dasar) {
//       return alert('Nama barang dan harga dasar wajib diisi!');
//     }

//     // 2. Isi per Satuan Terbesar (Karton/Ball) WAJIB
//     if (!formTambahBarang.isi_per_satuan_terbesar || Number(formTambahBarang.isi_per_satuan_terbesar) <= 0) {
//       return alert(`Isi per ${formTambahBarang.satuan_terbesar} (jumlah pcs) wajib diisi untuk barang baru!`);
//     }

//     const jumlah_beli = Number(formTambahBarang.jumlah) || 0;
//     if (jumlah_beli <= 0) {
//       return alert(`Jumlah ${formTambahBarang.satuan_terbesar.toLowerCase()} yang dibeli wajib lebih dari 0!`);
//     }

//     // 3. Cek duplikasi nama barang di list pesanan
//     if (DetailBarang.ListPesanan?.some(item => item.nama_barang === formTambahBarang.nama_barang)) {
//       return alert('Sudah ada');
//     }

//     // 4. Susun list_satuan (Dinamis berdasarkan pilihan KARTON / BALL)
//     const list_satuan = [];

//     list_satuan.push({
//       nama_satuan: formTambahBarang.satuan_terbesar, // 'KARTON' atau 'BALL'
//       rasio_ke_pcs: isiSatuanTerbesarNum,
//       harga_jual: hargaJualSatuanTerbesar,
//       level: 3
//     });

//     if (isiPackNum > 0 && hargaJualPackNum > 0) {
//       list_satuan.push({
//         nama_satuan: 'PACK',
//         rasio_ke_pcs: isiPackNum,
//         harga_jual: hargaJualPackNum,
//         level: 2
//       });
//     }

//     if (hargaJualPcsNum > 0) {
//       list_satuan.push({
//         nama_satuan: 'PCS',
//         rasio_ke_pcs: 1,
//         harga_jual: hargaJualPcsNum,
//         level: 1
//       });
//     }

//     // 5. Buat Objek Item Baru
//     const itemBaru = {
//       kode_barang: '', 
//       nama_barang: formTambahBarang.nama_barang,
//       id: formTambahBarang.satuan_terbesar, // Dinamis sesuai pilihan (KARTON/BALL)
//       nama_satuan: formTambahBarang.satuan_terbesar, // Dinamis sesuai pilihan (KARTON/BALL)
//       harga_satuan: hargaDasarNum,
//       persentase_diskon_distributor: diskonDistNum,
//       persentase_fee_harga_jual: feeNum,
//       jumlah: jumlah_beli,
//       rasio_ke_pcs: isiSatuanTerbesarNum,
//       list_satuan,
//       status: 'BARANG BARU'
//     };

//     // 6. Update State
//     setDataInputBarang(prev => ({
//       ...prev,
//       ListPesanan: [...(prev?.ListPesanan || []), itemBaru]
//     }));

//     // 7. Reset form
//     setFormTambahBarang({
//       nama_barang: '',
//       satuan_terbesar: 'KARTON',
//       harga_dasar: '',
//       persentase_diskon_distributor: '',
//       persentase_fee_harga_jual: '',
//       jumlah: 0,
//       isi_per_satuan_terbesar: '',
//       isi_per_pack: '',
//       harga_jual_pack: '',
//       harga_jual_pcs: '',
//     });

//     setDetailBarang(prev => ({
//       ...prev,
//       CloseTambahBarang: false
//     }));
//   }

//   function batal() {
//     setDetailBarang(prev => ({ ...prev, CloseTambahBarang: false }))
//   }

//   return (
//     <main className={` ${DetailBarang.CloseTambahBarang ? 'block' : 'hidden'} fixed z-999 inset-0 min-h-screen -top-20 bg-slate-100/80 pt-20 pb-12 px-4 sm:px-6 lg:px-8 overflow-y-auto`}>
//       <div className="max-w-2xl mx-auto">
//         <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden transition-all">

//           {/* Header */}
//           <header className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:px-8">
//             <div className="flex items-center gap-3">
//               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-emerald-600 font-bold border border-green-100">
//                 <i className="bi bi-box-seam text-lg"></i>
//               </div>
//               <div>
//                 <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
//                   Tambah Barang Baru
//                 </h1>
//                 <p className="text-xs text-slate-500 mt-0.5">
//                   Isi formulir di bawah ini untuk menambahkan komoditas ke sistem.
//                 </p>
//               </div>
//             </div>
//           </header>

//           {/* Form Content */}
//           <div className="p-6 sm:p-8 space-y-6">

//             {/* Informasi Utama Produk */}
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                   Nama Barang <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   value={formTambahBarang.nama_barang}
//                   onChange={(e) => setFormTambahBarang(prev => ({ ...prev, nama_barang: e.target.value }))}
//                   type="text"
//                   placeholder="Contoh: ALE-ALE ORANGE CUP 180ML"
//                   className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
//                 />
//               </div>

//               {/* BARU: Opsi Jenis Satuan Terbesar */}
//               <div>
//                 <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                   Satuan Terbesar <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={formTambahBarang.satuan_terbesar}
//                   onChange={(e) => setFormTambahBarang(prev => ({ ...prev, satuan_terbesar: e.target.value }))}
//                   className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium bg-white"
//                 >
//                   <option value="KARTON">KARTON</option>
//                   <option value="BALL">BALL</option>
//                 </select>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                     Jumlah {formTambahBarang.satuan_terbesar} Dibeli <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     value={formTambahBarang.jumlah}
//                     onChange={(e) => setFormTambahBarang(prev => ({ ...prev, jumlah: e.target.value }))}
//                     type="number"
//                     placeholder={`Contoh: 5 ${formTambahBarang.satuan_terbesar}`}
//                     className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                     Isi per {formTambahBarang.satuan_terbesar} (pcs) <span className="text-red-500">*</span>
//                   </label>
//                   <input
//                     value={formTambahBarang.isi_per_satuan_terbesar}
//                     onChange={(e) => setFormTambahBarang(prev => ({ ...prev, isi_per_satuan_terbesar: e.target.value }))}
//                     type="number"
//                     placeholder="Contoh: 24 PCS"
//                     className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
//                   />
//                   <p className="text-[11px] text-slate-400 mt-1">Wajib diisi — dipakai untuk hitung stok pcs & harga modal eceran.</p>
//                 </div>
//               </div>
//             </div>

//             <div className="h-px w-full bg-slate-100" />

//             {/* Kalkulasi Parameter Harga */}
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                   Harga Dasar Per {formTambahBarang.satuan_terbesar} <span className="text-red-500">*</span>
//                 </label>
//                 <div className="relative rounded-xl shadow-sm">
//                   <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
//                     <span className="text-xs font-semibold text-slate-400">Rp</span>
//                   </div>
//                   <input
//                     value={formTambahBarang.harga_dasar}
//                     onChange={(e) => setFormTambahBarang(prev => ({ ...prev, harga_dasar: e.target.value }))}
//                     type="number"
//                     placeholder={`30.000 Per ${formTambahBarang.satuan_terbesar}`}
//                     className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                     Diskon Distributor
//                   </label>
//                   <div className="relative rounded-xl shadow-sm">
//                     <input
//                       value={formTambahBarang.persentase_diskon_distributor}
//                       onChange={(e) => setFormTambahBarang(prev => ({ ...prev, persentase_diskon_distributor: e.target.value }))}
//                       type="number"
//                       step="any"
//                       placeholder="0.00%"
//                       className="w-full rounded-xl border border-slate-200 pl-4 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
//                     />
//                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
//                       <span className="text-xs font-bold text-slate-400">%</span>
//                     </div>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                     Fee Harga Jual
//                   </label>
//                   <div className="relative rounded-xl shadow-sm">
//                     <input
//                       value={formTambahBarang.persentase_fee_harga_jual}
//                       onChange={(e) => setFormTambahBarang(prev => ({ ...prev, persentase_fee_harga_jual: e.target.value }))}
//                       type="number"
//                       step="any"
//                       placeholder="0.00%"
//                       className="w-full rounded-xl border border-slate-200 pl-4 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
//                     />
//                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
//                       <span className="text-xs font-bold text-slate-400">%</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Preview kalkulasi */}
//               {hargaDasarNum > 0 && (
//                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
//                   <div className="flex justify-between text-xs">
//                     <span className="text-slate-500">Harga Jual {formTambahBarang.satuan_terbesar} (otomatis)</span>
//                     <span className="font-bold text-slate-800">Rp {hargaJualSatuanTerbesar.toLocaleString('id-ID')}</span>
//                   </div>
//                   {isiSatuanTerbesarNum > 0 && (
//                     <div className="flex justify-between text-xs">
//                       <span className="text-slate-500">Harga Modal per PCS</span>
//                       <span className="font-bold text-emerald-700">Rp {Math.round(hppPerPcs).toLocaleString('id-ID')}</span>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div className="h-px w-full bg-slate-100" />

//             {/* SET HARGA JUAL ECERAN (opsional) */}
//             <div className="space-y-4">
//               <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
//                 Set Harga Jual Eceran <span className="text-slate-400 font-normal normal-case">(opsional)</span>
//               </h3>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                     Isi per Pack (pcs)
//                   </label>
//                   <input
//                     value={formTambahBarang.isi_per_pack}
//                     onChange={(e) => setFormTambahBarang(prev => ({ ...prev, isi_per_pack: e.target.value }))}
//                     type="number"
//                     placeholder="Contoh: 10"
//                     className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                     Harga Jual per Pack
//                   </label>
//                   <div className="relative rounded-xl shadow-sm">
//                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
//                       <span className="text-xs font-semibold text-slate-400">Rp</span>
//                     </div>
//                     <input
//                       value={formTambahBarang.harga_jual_pack}
//                       onChange={(e) => setFormTambahBarang(prev => ({ ...prev, harga_jual_pack: e.target.value }))}
//                       type="number"
//                       placeholder="0"
//                       className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:outline-none focus:ring-4 font-medium ${
//                         warningPack ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 focus:border-green-500 focus:ring-green-500/10'
//                       }`}
//                     />
//                   </div>
//                   {warningPack && (
//                     <p className="text-[11px] text-red-600 font-semibold mt-1">
//                       ⚠ Di bawah modal (Min: Rp {Math.round(hppPerPack).toLocaleString('id-ID')})
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                   Harga Jual per PCS
//                 </label>
//                 <div className="relative rounded-xl shadow-sm max-w-[calc(50%-0.5rem)]">
//                   <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
//                     <span className="text-xs font-semibold text-slate-400">Rp</span>
//                   </div>
//                   <input
//                     value={formTambahBarang.harga_jual_pcs}
//                     onChange={(e) => setFormTambahBarang(prev => ({ ...prev, harga_jual_pcs: e.target.value }))}
//                     type="number"
//                     placeholder="0"
//                     className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:outline-none focus:ring-4 font-medium ${
//                       warningPcs ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 focus:border-green-500 focus:ring-green-500/10'
//                     }`}
//                   />
//                 </div>
//                 {warningPcs && (
//                   <p className="text-[11px] text-red-600 font-semibold mt-1">
//                     ⚠ Di bawah modal (Min: Rp {Math.round(hppPerPcs).toLocaleString('id-ID')})
//                   </p>
//                 )}
//               </div>

//               <p className="text-[11px] text-slate-400">
//                 Kosongkan kalau barang ini tidak dijual eceran — baris {formTambahBarang.satuan_terbesar} tetap otomatis dibuat.
//               </p>
//             </div>

//           </div>

//           {/* Footer / Submit Buttons */}
//           <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-8">
//             <button
//               onClick={() => batal()}
//               type="button"
//               className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200/60 active:scale-95"
//             >
//               Batal
//             </button>
//             <button
//               onClick={() => SimpanTambahProduk()}
//               type="submit"
//               className="rounded-xl bg-green-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-green-500/30 transition-all hover:bg-green-700 active:scale-95"
//             >
//               Simpan Produk
//             </button>
//           </div>

//         </div>
//       </div>
//     </main>
//   )
// }



'use client'

import { Konteks } from "@/GlobalNilai/Global"
import axios from "axios"
import { useContext, useEffect, useState } from "react"

// Format ribuan titik untuk input rupiah (tampilan saja, state tetap angka murni)
function formatTitik(v) {
  if (v === '' || v === null || v === undefined) return ''
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function bersihkanAngka(v) {
  return String(v).replace(/\D/g, '')
}

export function TambahProduk () {
  const { DetailBarang, setDetailBarang, setDataInputBarang, faktur, setFaktur, inputCariSuplier, setInputCariSuplier } = useContext(Konteks)

  const [formTambahBarang, setFormTambahBarang] = useState({
    nama_barang: "",
    satuan_terbesar: "KARTON", // BARU: Pilihan utama (KARTON / BALL)
    harga_dasar: "",
    persentase_diskon_distributor: '',
    persentase_fee_harga_jual: "",
    jumlah: 0,
    isi_per_satuan_terbesar: "", // Menggantikan isi_per_karton
    isi_per_pack: "",
    harga_jual_pack: "",
    harga_jual_pcs: "",
  })

  // ===== KALKULASI PREVIEW (real-time) =====
  const hargaDasarNum = Number(formTambahBarang.harga_dasar) || 0;
  const diskonDistNum = Number(formTambahBarang.persentase_diskon_distributor) || 0;
  const feeNum = Number(formTambahBarang.persentase_fee_harga_jual) || 0;
  const isiSatuanTerbesarNum = Number(formTambahBarang.isi_per_satuan_terbesar) || 0;
  const isiPackNum = Number(formTambahBarang.isi_per_pack) || 0;

  const modalBersih = hargaDasarNum - (hargaDasarNum * (diskonDistNum / 100));
  const hargaJualSatuanTerbesar = Math.round(modalBersih * (1 + (feeNum / 100)));
  const hppPerPcs = isiSatuanTerbesarNum > 0 ? modalBersih / isiSatuanTerbesarNum : 0;
  const hppPerPack = isiPackNum > 0 ? hppPerPcs * isiPackNum : 0;

  const hargaJualPackNum = Number(formTambahBarang.harga_jual_pack) || 0;
  const hargaJualPcsNum = Number(formTambahBarang.harga_jual_pcs) || 0;

  const warningPack = isiPackNum > 0 && hargaJualPackNum > 0 && hargaJualPackNum < hppPerPack;
  const warningPcs = hargaJualPcsNum > 0 && hargaJualPcsNum < hppPerPcs;

  // ===== KONVERSI FEE: PERSEN <-> RUPIAH (khusus tampilan FE, yang disimpan tetap persentase) =====
  // Basis fee = modalBersih (harga dasar setelah diskon distributor), sama seperti rumus hargaJualSatuanTerbesar
  const [feeRupiahInput, setFeeRupiahInput] = useState('')
  const [feeTerakhir, setFeeTerakhir] = useState('persen') // input fee mana yang terakhir diketik: 'persen' | 'rupiah'

  const feeRupiahTampil = feeTerakhir === 'rupiah'
    ? feeRupiahInput
    : (modalBersih > 0 && formTambahBarang.persentase_fee_harga_jual !== ''
      ? String(Math.round(modalBersih * feeNum / 100))
      : '')

  function hitungPersenDariRupiah(rupiah) {
    const r = parseFloat(rupiah)
    if (!(modalBersih > 0) || isNaN(r)) return ''
    return String(Math.round((r / modalBersih) * 100 * 10000) / 10000)
  }

  function gantiFeeRupiah(value) {
    setFeeTerakhir('rupiah')
    setFeeRupiahInput(value)
    setFormTambahBarang(prev => ({ ...prev, persentase_fee_harga_jual: hitungPersenDariRupiah(value) }))
  }

  // Kalau harga dasar / diskon distributor berubah saat fee diinput dalam rupiah, persen ikut menyesuaikan
  useEffect(() => {
    if (feeTerakhir === 'rupiah') {
      setFormTambahBarang(prev => ({ ...prev, persentase_fee_harga_jual: hitungPersenDariRupiah(feeRupiahInput) }))
    }
  }, [modalBersih])

  function SimpanTambahProduk() {
    // 1. Validasi input utama
    if (!formTambahBarang.nama_barang || !formTambahBarang.harga_dasar) {
      return alert('Nama barang dan harga dasar wajib diisi!');
    }

    // 2. Isi per Satuan Terbesar (Karton/Ball) WAJIB
    if (!formTambahBarang.isi_per_satuan_terbesar || Number(formTambahBarang.isi_per_satuan_terbesar) <= 0) {
      return alert(`Isi per ${formTambahBarang.satuan_terbesar} (jumlah pcs) wajib diisi untuk barang baru!`);
    }

    const jumlah_beli = Number(formTambahBarang.jumlah) || 0;
    if (jumlah_beli <= 0) {
      return alert(`Jumlah ${formTambahBarang.satuan_terbesar.toLowerCase()} yang dibeli wajib lebih dari 0!`);
    }

    // 3. Cek duplikasi nama barang di list pesanan
    if (DetailBarang.ListPesanan?.some(item => item.nama_barang === formTambahBarang.nama_barang)) {
      return alert('Sudah ada');
    }

    // 4. Susun list_satuan (Dinamis berdasarkan pilihan KARTON / BALL)
    const list_satuan = [];

    list_satuan.push({
      nama_satuan: formTambahBarang.satuan_terbesar, // 'KARTON' atau 'BALL'
      rasio_ke_pcs: isiSatuanTerbesarNum,
      harga_jual: hargaJualSatuanTerbesar,
      level: 3
    });

    if (isiPackNum > 0 && hargaJualPackNum > 0) {
      list_satuan.push({
        nama_satuan: 'PACK',
        rasio_ke_pcs: isiPackNum,
        harga_jual: hargaJualPackNum,
        level: 2
      });
    }

    if (hargaJualPcsNum > 0) {
      list_satuan.push({
        nama_satuan: 'PCS',
        rasio_ke_pcs: 1,
        harga_jual: hargaJualPcsNum,
        level: 1
      });
    }

    // 5. Buat Objek Item Baru
    const itemBaru = {
      kode_barang: '', 
      nama_barang: formTambahBarang.nama_barang,
      id: formTambahBarang.satuan_terbesar, // Dinamis sesuai pilihan (KARTON/BALL)
      nama_satuan: formTambahBarang.satuan_terbesar, // Dinamis sesuai pilihan (KARTON/BALL)
      harga_satuan: hargaDasarNum,
      persentase_diskon_distributor: diskonDistNum,
      persentase_fee_harga_jual: feeNum,
      jumlah: jumlah_beli,
      rasio_ke_pcs: isiSatuanTerbesarNum,
      list_satuan,
      status: 'BARANG BARU'
    };

    // 6. Update State
    setDataInputBarang(prev => ({
      ...prev,
      ListPesanan: [...(prev?.ListPesanan || []), itemBaru]
    }));

    // 7. Reset form
    setFormTambahBarang({
      nama_barang: '',
      satuan_terbesar: 'KARTON',
      harga_dasar: '',
      persentase_diskon_distributor: '',
      persentase_fee_harga_jual: '',
      jumlah: 0,
      isi_per_satuan_terbesar: '',
      isi_per_pack: '',
      harga_jual_pack: '',
      harga_jual_pcs: '',
    });
    setFeeRupiahInput('');
    setFeeTerakhir('persen');

    setDetailBarang(prev => ({
      ...prev,
      CloseTambahBarang: false
    }));
  }

  function batal() {
    setDetailBarang(prev => ({ ...prev, CloseTambahBarang: false }))
  }

  return (
    <main className={` ${DetailBarang.CloseTambahBarang ? 'block' : 'hidden'} fixed z-999 inset-0 min-h-screen -top-20 bg-slate-100/80 pt-20 pb-12 px-4 sm:px-6 lg:px-8 overflow-y-auto`}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden transition-all">

          {/* Header */}
          <header className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-emerald-600 font-bold border border-green-100">
                <i className="bi bi-box-seam text-lg"></i>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                  Tambah Barang Baru
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi formulir di bawah ini untuk menambahkan komoditas ke sistem.
                </p>
              </div>
            </div>
          </header>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-6">

            {/* Informasi Utama Produk */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Barang <span className="text-red-500">*</span>
                </label>
                <input
                  value={formTambahBarang.nama_barang}
                  onChange={(e) => setFormTambahBarang(prev => ({ ...prev, nama_barang: e.target.value }))}
                  type="text"
                  placeholder="Contoh: ALE-ALE ORANGE CUP 180ML"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                />
              </div>

              {/* BARU: Opsi Jenis Satuan Terbesar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Satuan Terbesar <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTambahBarang.satuan_terbesar}
                  onChange={(e) => setFormTambahBarang(prev => ({ ...prev, satuan_terbesar: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium bg-white"
                >
                  <option value="KARTON">KARTON</option>
                  <option value="BALL">BALL</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jumlah {formTambahBarang.satuan_terbesar} Dibeli <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formTambahBarang.jumlah}
                    onChange={(e) => setFormTambahBarang(prev => ({ ...prev, jumlah: e.target.value }))}
                    type="number"
                    placeholder={`Contoh: 5 ${formTambahBarang.satuan_terbesar}`}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Isi per {formTambahBarang.satuan_terbesar} (pcs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formTambahBarang.isi_per_satuan_terbesar}
                    onChange={(e) => setFormTambahBarang(prev => ({ ...prev, isi_per_satuan_terbesar: e.target.value }))}
                    type="number"
                    placeholder="Contoh: 24 PCS"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Wajib diisi — dipakai untuk hitung stok pcs & harga modal eceran.</p>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-slate-100" />

            {/* Kalkulasi Parameter Harga */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Harga Dasar Per {formTambahBarang.satuan_terbesar} <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <span className="text-xs font-semibold text-slate-400">Rp</span>
                  </div>
                  <input
                    value={formatTitik(formTambahBarang.harga_dasar)}
                    onChange={(e) => setFormTambahBarang(prev => ({ ...prev, harga_dasar: bersihkanAngka(e.target.value) }))}
                    type="text"
                    inputMode="numeric"
                    placeholder={`30.000 Per ${formTambahBarang.satuan_terbesar}`}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Diskon Distributor
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      value={formTambahBarang.persentase_diskon_distributor}
                      onChange={(e) => setFormTambahBarang(prev => ({ ...prev, persentase_diskon_distributor: e.target.value }))}
                      type="number"
                      step="any"
                      placeholder="0.00%"
                      className="w-full rounded-xl border border-slate-200 pl-4 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fee Harga Jual
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      value={formTambahBarang.persentase_fee_harga_jual}
                      onChange={(e) => { setFeeTerakhir('persen'); setFormTambahBarang(prev => ({ ...prev, persentase_fee_harga_jual: e.target.value })) }}
                      type="number"
                      step="any"
                      placeholder="0.00%"
                      className="w-full rounded-xl border border-slate-200 pl-4 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>

                {/* Fee Harga Jual dalam Rupiah (saling konversi dengan persen) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fee Harga Jual (Rp)
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <span className="text-xs font-semibold text-slate-400">Rp</span>
                    </div>
                    <input
                      value={formatTitik(feeRupiahTampil)}
                      onChange={(e) => gantiFeeRupiah(bersihkanAngka(e.target.value))}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Isi harga dasar dulu. Persen dan rupiah saling menyesuaikan.</p>
                </div>
              </div>

              {/* Preview kalkulasi */}
              {hargaDasarNum > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Harga Jual {formTambahBarang.satuan_terbesar} (otomatis)</span>
                    <span className="font-bold text-slate-800">Rp {hargaJualSatuanTerbesar.toLocaleString('id-ID')}</span>
                  </div>
                  {isiSatuanTerbesarNum > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Harga Modal per PCS</span>
                      <span className="font-bold text-emerald-700">Rp {Math.round(hppPerPcs).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-px w-full bg-slate-100" />

            {/* SET HARGA JUAL ECERAN (opsional) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Set Harga Jual Eceran <span className="text-slate-400 font-normal normal-case">(opsional)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Isi per Pack (pcs)
                  </label>
                  <input
                    value={formTambahBarang.isi_per_pack}
                    onChange={(e) => setFormTambahBarang(prev => ({ ...prev, isi_per_pack: e.target.value }))}
                    type="number"
                    placeholder="Contoh: 10"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Harga Jual per Pack
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <span className="text-xs font-semibold text-slate-400">Rp</span>
                    </div>
                    <input
                      value={formatTitik(formTambahBarang.harga_jual_pack)}
                      onChange={(e) => setFormTambahBarang(prev => ({ ...prev, harga_jual_pack: bersihkanAngka(e.target.value) }))}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:outline-none focus:ring-4 font-medium ${
                        warningPack ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 focus:border-green-500 focus:ring-green-500/10'
                      }`}
                    />
                  </div>
                  {warningPack && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">
                      ⚠ Di bawah modal (Min: Rp {Math.round(hppPerPack).toLocaleString('id-ID')})
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Harga Jual per PCS
                </label>
                <div className="relative rounded-xl shadow-sm max-w-[calc(50%-0.5rem)]">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <span className="text-xs font-semibold text-slate-400">Rp</span>
                  </div>
                  <input
                    value={formatTitik(formTambahBarang.harga_jual_pcs)}
                    onChange={(e) => setFormTambahBarang(prev => ({ ...prev, harga_jual_pcs: bersihkanAngka(e.target.value) }))}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 transition-all focus:outline-none focus:ring-4 font-medium ${
                      warningPcs ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 focus:border-green-500 focus:ring-green-500/10'
                    }`}
                  />
                </div>
                {warningPcs && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1">
                    ⚠ Di bawah modal (Min: Rp {Math.round(hppPerPcs).toLocaleString('id-ID')})
                  </p>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Kosongkan kalau barang ini tidak dijual eceran — baris {formTambahBarang.satuan_terbesar} tetap otomatis dibuat.
              </p>
            </div>

          </div>

          {/* Footer / Submit Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-8">
            <button
              onClick={() => batal()}
              type="button"
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200/60 active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={() => SimpanTambahProduk()}
              type="submit"
              className="rounded-xl bg-green-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-green-500/30 transition-all hover:bg-green-700 active:scale-95"
            >
              Simpan Produk
            </button>
          </div>

        </div>
      </div>
    </main>
  )
}