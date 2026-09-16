'use client'

import { Konteks } from "@/GlobalNilai/Global"
import { useContext } from "react"

export function ListPesanan() {
  const { dataInputBarang, setDataInputBarang } = useContext(Konteks);

  // ==========================================
  // 1. HANDLER GANTI SATUAN (KARTON/PACK/PCS)
  // ==========================================
  function ganti_satuan(idSatuanBaru, itemPesanan) {
    const satuanTerpilih = itemPesanan.list_satuan?.find(
      (s) => Number(s.id_satuan || s.id) === Number(idSatuanBaru)
    );

    if (!satuanTerpilih) return;

    // Hitung ulang kebutuhan stok fisik (PCS)
    const totalPcsDibutuhkan = Number(itemPesanan.jumlah) * Number(satuanTerpilih.rasio_ke_pcs);

    // Cek kecukupan stok fisik (stok_pcs)
    if (totalPcsDibutuhkan > Number(itemPesanan.stok_pcs)) {
      alert(`Stok tidak mencukupi! Stok fisik tersedia: ${itemPesanan.stok_pcs} PCS. Pilih satuan atau jumlah lebih kecil.`);
      return;
    }

    // Update state item
    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === itemPesanan.kode_barang) {
          const hargaBaru = Number(satuanTerpilih.harga_jual) || 0;
          return {
            ...item,
            id_satuan: satuanTerpilih.id_satuan || satuanTerpilih.id,
            nama_satuan: satuanTerpilih.nama_satuan,
            harga_satuan: hargaBaru,
            rasio_ke_pcs: Number(satuanTerpilih.rasio_ke_pcs),
            subtotal: hargaBaru * Number(item.jumlah || 0)
          };
        }
        return item;
      })
    }));
  }

  // ==========================================
  // 2. HANDLER EDIT JUMLAH PESANAN (QTY)
  // ==========================================
  function edit_jumlah_pesanan(e, itemPesanan) {
    const inputVal = e.target.value;
    const jumlahBaru = inputVal === "" ? "" : Number(inputVal);

    // Jika diisi 0, hapus dari list
    if (jumlahBaru !== "" && jumlahBaru === 0) {
      return hapus(itemPesanan);
    }

    // Pengecekan Stok Konversi: Qty * Rasio <= Stok PCS
    const totalPcsDibutuhkan = Number(jumlahBaru) * Number(itemPesanan.rasio_ke_pcs || 1);

    if (jumlahBaru !== "" && totalPcsDibutuhkan > Number(itemPesanan.stok_pcs)) {
      alert(`Jumlah melebihi stok! Maksimal pembelian untuk satuan ${itemPesanan.nama_satuan} adalah ${Math.floor(itemPesanan.stok_pcs / itemPesanan.rasio_ke_pcs)}.`);
      return;
    }

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === itemPesanan.kode_barang) {
          return {
            ...item,
            jumlah: jumlahBaru,
            subtotal: Number(item.harga_satuan || 0) * (Number(jumlahBaru) || 0)
          };
        }
        return item;
      })
    }));
  }

  // ==========================================
  // 3. HANDLER HAPUS PESANAN
  // ==========================================
  function hapus(itemParams) {
    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.filter(
        (item) => item.kode_barang !== itemParams.kode_barang
      )
    }));
  }

  // Hitung Total Belanja Keseluruhan
  const totalSeluruhPesanan = dataInputBarang?.ListPesanan?.reduce(
    (acc, item) => acc + (Number(item.subtotal) || 0), 0
  ) || 0;

  return (
    <main className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
      {/* Card Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header Section */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 truncate">Daftar Pesanan</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">Atur satuan dan jumlah barang transaksi</p>
          </div>
          <span className="shrink-0 px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            {dataInputBarang?.ListPesanan?.length ?? 0} Item
          </span>
        </div>

        {/* Scrollable List Items */}
        <div className="max-h-[400px] overflow-y-auto divide-y flex flex-col gap-5 divide-slate-100 p-2 sm:p-4">
          {dataInputBarang?.ListPesanan?.length > 0 ? (
            dataInputBarang.ListPesanan.map((item, index) => (
              <div 
                key={item.kode_barang || index} 
                className="p-3 sm:p-4 rounded-lg hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
              >
                {/* Info Barang & Dropdown Satuan */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-5">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 shrink-0">
                      {item.kode_barang}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-800  leading-snug break-words">
                    {item.nama_barang}
                    <p className={` ${item.stok_pcs > 10 ? 'text-green-600':'text-red-500 animate-pulse'} mt-1 text-[12px]`}>Stok: {item.stok_pcs} pcs</p>
                  </h3>

                 
                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-xs font-medium text-slate-400">Satuan:</label>
                    <select
                      value={item.id_satuan}
                      onChange={(e) => ganti_satuan(e.target.value, item)}
                      className="px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                    >
                      {item.list_satuan?.map((satuan) => (
                        <option key={satuan.id_satuan || satuan.id} value={satuan.id_satuan || satuan.id}>
                          {satuan.nama_satuan} ({satuan.jumlah_konversi || satuan.rasio_ke_pcs || 1} PCS) - Rp {Number(satuan.harga_jual).toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 shrink-0">
                  
                 
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500 sm:hidden">Qty:</label>
                    <input 
                      type="number"
                      min="1"
                      value={item.jumlah}
                      onChange={(e) => edit_jumlah_pesanan(e, item)}
                      placeholder="Qty"
                      className="w-16 sm:w-20 px-2 py-1.5 text-sm font-semibold text-center text-slate-800 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Subtotal Item */}
                  <div className="text-right min-w-[85px] sm:min-w-[100px]">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Subtotal</span>
                    <span className="text-sm font-bold text-slate-900 block truncate">
                      Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Tombol Hapus */}
                  <button 
                    type="button"
                    onClick={() => hapus(item)}
                    className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors shrink-0 cursor-pointer"
                  >
                    Hapus
                  </button>

                </div>
              </div>
            ))
          ) : (
            /* Empty State */
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                0
              </div>
              <p className="text-sm font-medium text-slate-500">Belum ada pesanan</p>
              <p className="text-xs text-slate-400">Tambahkan barang dari menu pencarian</p>
            </div>
          )}
        </div>

        {/* Footer Summary Total Belanja */}
        {dataInputBarang?.ListPesanan?.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">Total Pembayaran</span>
            <span className="text-lg font-black text-emerald-600">
              Rp {totalSeluruhPesanan.toLocaleString('id-ID')}
            </span>
          </div>
        )}

      </div>
    </main>
  );
}