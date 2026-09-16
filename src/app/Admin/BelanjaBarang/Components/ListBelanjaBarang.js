'use client'

import { useContext, useEffect } from "react";
import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";

export function ListBelanjaBarang ({ IsScroll }) {
  const { dataInputBarang, setDataInputBarang, faktur, setLoading, setFaktur, setInputCariSuplier } = useContext(Konteks);

  // Helper untuk mendapatkan rasio satuan aktif yang sedang dipilih
  function getRasioAktif(item) {
    if (item.rasio_ke_pcs && Number(item.rasio_ke_pcs) > 0) {
      return Number(item.rasio_ke_pcs);
    }
    // FIX #2: dibandingkan langsung (bukan dipaksa Number()), karena
    // untuk BARANG BARU id_satuan bisa berupa string nama_satuan
    // (misal 'PACK'), yang kalau di-Number() jadi NaN dan NaN !== NaN
    // (find selalu gagal).
    const satuanTerpilih = item.list_satuan?.find(
      (s) => (s.id_satuan || s.id || s.nama_satuan) === item.id_satuan
    );
    if (satuanTerpilih) {
      return Number(satuanTerpilih.rasio_ke_pcs || satuanTerpilih.jumlah_konversi || 1);
    }
    if (item.list_satuan && item.list_satuan.length > 0) {
      return Number(item.list_satuan[0].rasio_ke_pcs || item.list_satuan[0].jumlah_konversi || 1);
    }
    return 1;
  }

  // ==========================================
  // FIX UTAMA: Auto-sinkronkan id_satuan/nama_satuan/rasio_ke_pcs ke STATE
  // begitu ada item baru yang belum punya satuan terpilih secara eksplisit.
  //
  // FIX #1: fallback id_satuan sekarang ikut ke def.nama_satuan. Untuk
  // BARANG BARU, list_satuan tidak punya id_satuan/id (belum tersimpan
  // di DB), jadi tanpa fallback ini id_satuan tetap undefined setelah
  // "disinkronkan" -> kondisi !item.id_satuan tetap true selamanya ->
  // useEffect terus re-trigger -> infinite loop / "Maximum update depth".
  // ==========================================
  useEffect(() => {
    const adaYangBelumSinkron = dataInputBarang.ListPesanan?.some(
      (item) => !item.id_satuan && item.list_satuan?.length > 0
    );

    if (!adaYangBelumSinkron) return;

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (!item.id_satuan && item.list_satuan?.length > 0) {
          const def = item.list_satuan[0];
          const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
          const hargaBeliDefault = Number(def.harga_beli || def.harga_modal || item.harga_satuan || 0);
          const jumlah = Number(item.jumlah || 0);

          // FIX #1: fallback terakhir ke nama_satuan supaya id_satuan
          // selalu terisi nilai yang benar-benar berbeda dari undefined.
          const idSatuanResolved = def.id_satuan || def.id || def.nama_satuan;

          return {
            ...item,
            id_satuan: idSatuanResolved,
            nama_satuan: def.nama_satuan,
            rasio_ke_pcs: rasioKePcs,
            harga_satuan: item.harga_satuan || hargaBeliDefault,
            subtotal: (item.harga_satuan || hargaBeliDefault) * jumlah,
            total_pcs_masuk: jumlah * rasioKePcs
          };
        }
        return item;
      })
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInputBarang.ListPesanan]);

  // ==========================================
  // 1. HANDLER GANTI SATUAN BELANJA (KARTON/PACK/PCS)
  // ==========================================
  function ganti_satuan_belanja(idSatuanBaru, itemBelanjaan) {
    // FIX #2: dibandingkan langsung (bukan Number()), sama alasannya
    // seperti di getRasioAktif di atas.
    const satuanTerpilih = itemBelanjaan.list_satuan?.find(
      (s) => (s.id_satuan || s.id || s.nama_satuan) === idSatuanBaru
    );

    if (!satuanTerpilih) return;

    const rasioKePcs = Number(satuanTerpilih.rasio_ke_pcs || satuanTerpilih.jumlah_konversi || 1);
    const hargaBeliDefault = Number(satuanTerpilih.harga_beli || satuanTerpilih.harga_modal || itemBelanjaan.harga_satuan || 0);

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === itemBelanjaan.kode_barang) {
          const jumlah = Number(item.jumlah || 0);
          return {
            ...item,
            id_satuan: satuanTerpilih.id_satuan || satuanTerpilih.id || satuanTerpilih.nama_satuan,
            nama_satuan: satuanTerpilih.nama_satuan,
            rasio_ke_pcs: rasioKePcs,
            harga_satuan: hargaBeliDefault || item.harga_satuan,
            subtotal: (hargaBeliDefault || item.harga_satuan) * jumlah,
            total_pcs_masuk: jumlah * rasioKePcs
          };
        }
        return item;
      })
    }));
  }

  // ==========================================
  // 2. HANDLER EDIT HARGA BELI PER SATUAN
  // ==========================================
  function harga_satuan_belanja(e, itemBelanjaan) {
    const angkaMurni = e.target.value.replace(/\D/g, "");
    const hargaBaru = angkaMurni ? Number(angkaMurni) : 0;

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === itemBelanjaan.kode_barang) {
          const jumlah = Number(item.jumlah || 0);
          return {
            ...item,
            harga_satuan: hargaBaru,
            subtotal: hargaBaru * jumlah
          };
        }
        return item;
      })
    }));
  }

  // ==========================================
  // 3. HANDLER EDIT QTY BELANJA
  // ==========================================
  function tambah_jumlah_belanjaan(e, itemBelanjaan) {
    const inputVal = e.target.value;
    const jumlahBaru = inputVal === "" ? "" : Number(inputVal);

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === itemBelanjaan.kode_barang) {
          const rasio = getRasioAktif(item);
          const harga = Number(item.harga_satuan || 0);
          const qty = Number(jumlahBaru || 0);

          return {
            ...item,
            jumlah: jumlahBaru,
            subtotal: harga * qty,
            total_pcs_masuk: qty * rasio
          };
        }
        return item;
      })
    }));
  }

  // ==========================================
  // 4. HANDLER HAPUS ITEM
  // ==========================================
  function hapusItem(itemBarangBelanja) {
    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.filter((item) => item.kode_barang !== itemBarangBelanja.kode_barang)
    }));
  }

  // ==========================================
  // 5. PROSES SIMPAN TRANSAKSI BELANJA
  // ==========================================
  async function proses() {
    if (!dataInputBarang?.ListPesanan || dataInputBarang.ListPesanan.length === 0) {
      return alert('List pesanan belanja masih kosong!');
    }

    const adaYangKosong = dataInputBarang.ListPesanan.some((item) => {
      const jumlah = Number(item.jumlah);
      const harga = Number(item.harga_satuan);
      return isNaN(jumlah) || jumlah <= 0 || isNaN(harga) || harga <= 0;
    });

    if (adaYangKosong) {
      return alert('Setiap barang wajib memiliki Jumlah (Qty) dan Harga Beli lebih dari 0!');
    }

    const itemTanpaSatuan = dataInputBarang.ListPesanan.find(
      (item) => !item.id_satuan && !item.nama_satuan && item?.status == 'RESTOK'
    );
    if (itemTanpaSatuan) {
      return alert(`Satuan beli untuk "${itemTanpaSatuan.nama_barang || itemTanpaSatuan.kode_barang}" belum terpilih!`);
    }

    const payloadListPesanan = dataInputBarang.ListPesanan.map((item) => {
      if (item.id_satuan && item.rasio_ke_pcs) return item;
      const def = item.list_satuan?.[0];
      return {
        ...item,
        id_satuan: item.id_satuan || def?.id_satuan || def?.id || def?.nama_satuan,
        nama_satuan: item.nama_satuan || def?.nama_satuan,
        rasio_ke_pcs: item.rasio_ke_pcs || Number(def?.rasio_ke_pcs || def?.jumlah_konversi || 1),
      };
    });

    // FIX #4: baris debug (alert + return) yang bikin request nggak
    // pernah benar-benar terkirim ke BE sudah dihapus.
    try {
       setLoading(prev => ({
          ...prev,
          loadingRequest:true
        }))
      const API = '/api-be/SERVER_BELANJA_BARANG/BELANJA_BARANG';
      const ress = await axios.post(API, {
        faktur: faktur,
        ListPesanan: payloadListPesanan,
      });

      tampilkanToast(ress.data.message , 'success')

      setFaktur((prev) => ({
        ...prev,
        no_faktur: '',
        diskon_faktur: 0,
        tanggal_belanja: '',
        dataSupplier: null,
      }));

      setDataInputBarang((prev) => ({
        ...prev,
        ListPesanan: [],
        ItemBarang: [],
      }));

      setInputCariSuplier('');
      alert('Transaksi Belanja Berhasil Disimpan!');
    } catch (err) {
      tampilkanToast(err?.response?.data?.message, 'error')
    } finally{
       setLoading(prev => ({
          ...prev,
          loadingRequest:false
        }))
    }
  }

  function tampilkanToast(message, type) {
    setLoading(prev => ({ 
      ...prev, 
      toast: true,
      toastMessage: message,
      toastType: type
    }));

    setTimeout(() => {
      setLoading(prev => ({ ...prev, toast: false }));
    }, 2500);
  }

  const subtotalSeluruhnya = dataInputBarang.ListPesanan?.reduce(
    (acc, item) => acc + (Number(item.harga_satuan || 0) * Number(item.jumlah || 0)), 0
  ) || 0;

  const totalAkhir = Math.max(0, subtotalSeluruhnya - (Number(faktur.diskon_faktur) || 0));

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 bg-slate-50 min-h-screen font-sans">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Daftar Belanja</h2>
          <p className="text-xs text-slate-500 hidden sm:block">Periksa kembali item, satuan belanja & penyesuaian harga faktur</p>
        </div>
        <span className="text-xs bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-full border border-slate-300">
          {dataInputBarang.ListPesanan?.length || 0} Item
        </span>
      </div>

      {/* LIST STATE */}
      {!dataInputBarang.ListPesanan || dataInputBarang.ListPesanan.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center mb-6">
          <p className="text-sm font-semibold text-slate-500">Belum ada barang di daftar belanja</p>
          <p className="text-xs text-slate-400 mt-1">Cari dan pilih produk di atas untuk menambahkan</p>
        </div>
      ) : (
        <>
          {/* 1. MOBILE VIEW (CARD LAYOUT) */}
          <div className="block md:hidden space-y-3 mb-6">
            {dataInputBarang.ListPesanan.map((item) => {
              const subtotal = (Number(item.harga_satuan) || 0) * (Number(item.jumlah) || 0);
              const rasio = getRasioAktif(item);
              const totalPcsMasuk = (Number(item.jumlah) || 0) * rasio;

              return (
                <div key={item.kode_barang} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.status === 'BARANG BARU' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {item.status || 'RESTOK'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">#{item.kode_barang}</span>
                      </div>
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight">{item.nama_barang}</h3>
                    </div>

                    <button onClick={() => hapusItem(item)} className="text-slate-400 hover:text-rose-500 p-1.5">✕</button>
                  </div>

                  {/* Dropdown Satuan Belanja */}
       <div>
  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
    Satuan Beli
  </label>
  <select
    value={item.id_satuan ?? (item.list_satuan && (item.list_satuan[0]?.id_satuan || item.list_satuan[0]?.id || item.list_satuan[0]?.nama_satuan)) ?? ''}
    onChange={(e) => ganti_satuan_belanja(e.target.value, item)}
    className="w-full p-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none"
  >
    {item.list_satuan
      // FILTER: Cuma tampilkan satuan yang namanya KARTON, BALL, atau DUS
      ?.filter((s) => ['KARTON', 'BALL', 'DUS', 'BAL'].includes(s.nama_satuan?.toUpperCase()))
      .map((s, idx) => (
        <option key={s.id_satuan || s.id || `${s.nama_satuan}-${idx}`} value={s.id_satuan || s.id || s.nama_satuan}>
          {s.nama_satuan} ({s.rasio_ke_pcs || s.jumlah_konversi || 1} PCS)
        </option>
      ))}
  </select>
</div>

                  {/* Input Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Harga Beli Satuan</label>
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        <span className="bg-slate-100/80 px-2 py-1.5 text-xs text-slate-500 font-medium border-r border-slate-200">Rp</span>
                        <input
                          value={item.harga_satuan ? Number(item.harga_satuan).toLocaleString('id-ID') : ''}
                          onChange={(e) => harga_satuan_belanja(e, item)}
                          placeholder="0"
                          type="text"
                          className="w-full p-1.5 text-xs font-semibold text-slate-800 outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Qty Beli</label>
                      <input
                        value={item.jumlah || ''}
                        onChange={(e) => tambah_jumlah_belanjaan(e, item)}
                        type="number"
                        placeholder="0"
                        min="1"
                        className="w-full p-1.5 border border-slate-200 rounded-xl text-xs text-center font-bold text-slate-800 outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Footer Subtotal & Masuk Stok */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Stok Masuk: <b className="text-slate-800">{totalPcsMasuk} PCS</b>
                    </span>
                    <span className="text-sm font-bold text-slate-900">Rp {subtotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. DESKTOP VIEW (TABLE) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Produk</th>
                  <th className="p-4 w-44">Satuan Beli</th>
                  <th className="p-4 w-44">Harga Beli Satuan</th>
                  <th className="p-4 w-24 text-center">Qty Beli</th>
                  <th className="p-4 w-36">Subtotal</th>
                  <th className="p-4 w-28 text-center">Total Fisik</th>
                  <th className="p-4 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataInputBarang.ListPesanan.map((item) => {
                  const subtotal = (Number(item.harga_satuan) || 0) * (Number(item.jumlah) || 0);
                  const rasio = getRasioAktif(item);
                  const totalPcsMasuk = (Number(item.jumlah) || 0) * rasio;

                  return (
                    <tr key={item.kode_barang} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 leading-tight">{item.nama_barang}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{item.kode_barang}</p>
                      </td>

                      <td className="p-4">
                        <select
                          value={item.id_satuan ?? (item.list_satuan && (item.list_satuan[0]?.id_satuan || item.list_satuan[0]?.id || item.list_satuan[0]?.nama_satuan)) ?? ''}
                          onChange={(e) => ganti_satuan_belanja(e.target.value, item)}
                          className="w-full p-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                        >
                          {/* FIX #3: key & value desktop disamakan dengan mobile,
                              supaya barang baru (tanpa id_satuan/id) tidak
                              memicu duplicate-key warning & dropdown tetap jalan. */}
                          {item.list_satuan?.map((s, idx) => (
                            <option key={s.id_satuan || s.id || `${s.nama_satuan}-${idx}`} value={s.id_satuan || s.id || s.nama_satuan}>
                              {s.nama_satuan} / Ball ({s.rasio_ke_pcs || s.jumlah_konversi || 1} PCS)
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                          <span className="bg-slate-50 px-2 py-1.5 text-xs text-slate-400 font-semibold border-r border-slate-200">Rp</span>
                          <input
                            value={item.harga_satuan ? Number(item.harga_satuan).toLocaleString('id-ID') : ''}
                            onChange={(e) => harga_satuan_belanja(e, item)}
                            placeholder="0"
                            type="text"
                            className="w-full p-1.5 text-sm font-semibold outline-none text-slate-800"
                          />
                        </div>
                      </td>

                      <td className="p-4">
                        <input
                          value={item.jumlah || ''}
                          onChange={(e) => tambah_jumlah_belanjaan(e, item)}
                          type="number"
                          placeholder="0"
                          min="1"
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-sm text-center font-bold text-slate-800 outline-none"
                        />
                      </td>

                      <td className="p-4 font-black text-slate-800">
                        Rp {subtotal.toLocaleString('id-ID')}
                      </td>

                      <td className="p-4 text-center">
                        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">
                          +{totalPcsMasuk} PCS
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <button onClick={() => hapusItem(item)} className="text-slate-300 hover:text-red-600 transition-colors p-1">
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* SUMMARY BAR (STICKY BOTTOM) */}
      <div className={`${IsScroll || !dataInputBarang.ListPesanan?.length ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"} transition-opacity duration-400 ease-in-out sticky bottom-4 z-40 w-full max-w-7xl mx-auto sm:px-4`}>
        <div className="bg-emerald-600 text-white px-3 py-3 sm:px-5 sm:py-4 rounded-xl shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0 overflow-x-auto">
            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-100">Ringkasan</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-emerald-700/60 text-white border border-emerald-500/50 whitespace-nowrap">
                {dataInputBarang.ListPesanan?.length || 0} Item
              </span>
            </div>

            <div className="h-6 w-[1px] bg-emerald-500/60 shrink-0" />

            <div>
              <span className="block text-[9px] sm:text-[10px] font-medium text-emerald-100">Subtotal</span>
              <span className="text-xs sm:text-sm font-semibold text-white font-mono whitespace-nowrap">
                Rp {subtotalSeluruhnya.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="h-6 w-[1px] bg-emerald-500/60 shrink-0" />

            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-100">Total Akhir</span>
              <span className="text-sm sm:text-xl font-black text-white font-mono tracking-tight whitespace-nowrap">
                Rp {totalAkhir.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            onClick={proses}
            className="shrink-0 px-3.5 py-2 sm:px-6 sm:py-3 bg-white hover:bg-emerald-50 active:scale-95 text-emerald-700 font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-md cursor-pointer"
          >
            Simpan
          </button>
        </div>
      </div>
    </main>
  );
}