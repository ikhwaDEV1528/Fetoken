'use client'

import { useContext, useEffect, useState } from "react";
import { Konteks } from "@/GlobalNilai/Global";
import { TimeoutNotif } from "@/UI/timeoutNotif/timeoutNotif";
import axios from "axios";

export function ListBelanjaBarang({ IsScroll }) {
  const { dataInputBarang, setDataInputBarang, faktur, setLoading, setFaktur, setInputCariSuplier, loading } = useContext(Konteks);

  // ==========================================
  // STATE MODAL POPUP OVERLAY & PENCARIAN BARANG (API PENJUALAN)
  // ==========================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputCari, setInputCari] = useState('');
  const [hasilCari, setHasilCari] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Helper untuk mendapatkan rasio satuan aktif (Beli)
  function getRasioAktif(item) {
    if (item.rasio_ke_pcs && Number(item.rasio_ke_pcs) > 0) {
      return Number(item.rasio_ke_pcs);
    }
    const satuanTerpilih = item.list_satuan?.find(
      (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(item.id_satuan)
    );
    if (satuanTerpilih) {
      return Number(satuanTerpilih.rasio_ke_pcs || satuanTerpilih.jumlah_konversi || 1);
    }
    if (item.list_satuan && item.list_satuan.length > 0) {
      return Number(item.list_satuan[0].rasio_ke_pcs || item.list_satuan[0].jumlah_konversi || 1);
    }
    return 1;
  }

  // Helper untuk mendapatkan rasio satuan bonus
  function getRasioBonus(item) {
    if (item.id_satuan_bonus) {
      const sb = item.list_satuan?.find(
        (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(item.id_satuan_bonus)
      );
      if (sb) return Number(sb.rasio_ke_pcs || sb.jumlah_konversi || 1);
    }
    return getRasioAktif(item);
  }

  // Helper: ambil satuan terbesar (rasio_ke_pcs tertinggi) sebagai satuan beli yang dikunci
  function getSatuanTerbesar(item) {
    const list = item?.list_satuan || [];
    if (list.length === 0) return null;
    return [...list].sort(
      (a, b) =>
        Number(b.rasio_ke_pcs || b.jumlah_konversi || 1) -
        Number(a.rasio_ke_pcs || a.jumlah_konversi || 1)
    )[0];
  }

  // Helper murni penentu harga beli dasar (Murni Modal, bukan Harga Jual)
  function dapatkanHargaBeliDasar(item, satuanTerpilih) {
    const rasio = Number(satuanTerpilih?.rasio_ke_pcs || satuanTerpilih?.jumlah_konversi || 1);

    if (item.harga_dasar && Number(item.harga_dasar) > 0) {
      const hd = Number(item.harga_dasar);
      if (satuanTerpilih && rasio > 1 && hd < (satuanTerpilih.harga_jual || 0) / 2) {
        return hd * rasio;
      }
      return hd;
    }

    if (satuanTerpilih?.harga_beli && Number(satuanTerpilih.harga_beli) > 0) {
      return Number(satuanTerpilih.harga_beli);
    }
    if (satuanTerpilih?.harga_modal && Number(satuanTerpilih.harga_modal) > 0) {
      return Number(satuanTerpilih.harga_modal);
    }

    return Number(item.harga_satuan || 0);
  }

  // ==========================================
  // CARI BARANG MENGGUNAKAN API PENJUALAN
  // ==========================================
  const handleCariBarang = async () => {
    if (!inputCari.trim()) return alert('Ketik nama atau kode barang terlebih dahulu!');
    setIsSearching(true);
    try {
      const API_PENJUALAN_CARI = '/api-be/SERVER_JUAL_BARANG/JUAL_BARANG';
      const res = await axios.get(API_PENJUALAN_CARI, { params: { input: inputCari } });
      const items = res.data?.Search || [];

      if (items.length === 0) {
        alert('Barang tidak ditemukan di database');
      }

      setHasilCari(items);
    } catch (err) {
      console.error('Gagal cari barang:', err);
      alert(err?.response?.data?.message || 'Gagal mengambil data barang dari server');
    } finally {
      setIsSearching(false);
    }
  };

  // 1. Tambah sebagai Barang Belanja Reguler (Harga Modal Aktif)
  const tambahBarangBelanjaReguler = (barangSelected) => {
    const barangAda = dataInputBarang?.ListPesanan?.find(
      (item) => item.kode_barang === barangSelected.kode_barang
    );

    if (barangAda) {
      const qtyBaru = Number(barangAda.jumlah || 0) + 1;
      tambah_jumlah_belanjaan({ target: { value: qtyBaru } }, barangAda);
    } else {
      const listSatuan = barangSelected.list_satuan || [];
      const def = [...listSatuan].sort(
        (a, b) => Number(b.rasio_ke_pcs || 1) - Number(a.rasio_ke_pcs || 1)
      )[0] || { id_satuan: null, nama_satuan: 'PCS', rasio_ke_pcs: 1 };

      const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
      const hargaBeliDefault = dapatkanHargaBeliDasar(barangSelected, def);
      const jumlah = 1;
      const idSat = def.id_satuan || def.id || def.nama_satuan;

      const itemBelanjaBaru = {
        kode_barang: barangSelected.kode_barang,
        nama_barang: barangSelected.nama_barang,
        status: barangSelected.status || 'RESTOK',
        stok_pcs: barangSelected.stok_pcs || 0,
        list_satuan: listSatuan,
        ada_fitur_bonus: barangSelected.ada_fitur_bonus ?? 1,

        id_satuan: idSat,
        nama_satuan: def.nama_satuan,
        rasio_ke_pcs: rasioKePcs,
        jumlah: jumlah,
        harga_satuan: hargaBeliDefault,
        persentase_diskon_distributor: 0,
        diskon_distributor_rp: 0,
        subtotal: hargaBeliDefault * jumlah,

        // Defaults Bonus
        qty_bonus: 0,
        id_satuan_bonus: idSat,
        nama_satuan_bonus: def.nama_satuan,
        rasio_bonus_ke_pcs: rasioKePcs
      };

      setDataInputBarang((prev) => ({
        ...prev,
        ListPesanan: [...(prev.ListPesanan || []), itemBelanjaBaru]
      }));
    }

    setIsModalOpen(false);
    setHasilCari([]);
    setInputCari('');
  };

  // 2. Tambah Barang Bonus (Otomatis Harga 0, Subtotal 0, Qty Beli 0, Qty Bonus 1)
  const tambahBarangBonus = (barangSelected) => {
    const barangAda = dataInputBarang?.ListPesanan?.find(
      (item) => item.kode_barang === barangSelected.kode_barang
    );

    if (barangAda) {
      const bonusBaru = Number(barangAda.qty_bonus || 0) + 1;
      ubah_bonus_belanjaan({ target: { value: bonusBaru } }, barangAda);
    } else {
      const listSatuan = barangSelected.list_satuan || [];
      const def = [...listSatuan].sort(
        (a, b) => Number(b.rasio_ke_pcs || 1) - Number(a.rasio_ke_pcs || 1)
      )[0] || { id_satuan: null, nama_satuan: 'PCS', rasio_ke_pcs: 1 };

      const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
      const idSat = def.id_satuan || def.id || def.nama_satuan;

      const itemBonusBaru = {
        kode_barang: barangSelected.kode_barang,
        nama_barang: barangSelected.nama_barang,
        status: barangSelected.status || 'RESTOK',
        stok_pcs: barangSelected.stok_pcs || 0,
        list_satuan: listSatuan,
        ada_fitur_bonus: 1,

        id_satuan: idSat,
        nama_satuan: def.nama_satuan,
        rasio_ke_pcs: rasioKePcs,
        jumlah: 0,
        harga_satuan: 0,
        persentase_diskon_distributor: 0,
        diskon_distributor_rp: 0,
        subtotal: 0,

        // Bonus Fields
        qty_bonus: 1,
        id_satuan_bonus: idSat,
        nama_satuan_bonus: def.nama_satuan,
        rasio_bonus_ke_pcs: rasioKePcs,
        is_bonus_luar: true
      };

      setDataInputBarang((prev) => ({
        ...prev,
        ListPesanan: [...(prev.ListPesanan || []), itemBonusBaru]
      }));
    }

    setIsModalOpen(false);
    setHasilCari([]);
    setInputCari('');
  };

  // ==========================================
  // AUTO SINKRONISASI SATUAN TERBESAR & HARGA PERTAMA KALI
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
          const def = [...item.list_satuan].sort(
            (a, b) => Number(b.rasio_ke_pcs || 1) - Number(a.rasio_ke_pcs || 1)
          )[0];

          const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
          const hargaBeliDefault = dapatkanHargaBeliDasar(item, def);
          const jumlah = Number(item.jumlah || 1);

          const persentaseDiskon = Number(item.persentase_diskon_distributor || 0);
          const diskonRpDefault = Math.round((hargaBeliDefault * persentaseDiskon) / 100);
          const hargaNett = Math.max(0, hargaBeliDefault - diskonRpDefault);

          const idSatuanResolved = def.id_satuan || def.id || def.nama_satuan;

          return {
            ...item,
            id_satuan: idSatuanResolved,
            nama_satuan: def.nama_satuan,
            rasio_ke_pcs: rasioKePcs,
            jumlah: jumlah,
            harga_satuan: hargaBeliDefault,
            persentase_diskon_distributor: persentaseDiskon,
            diskon_distributor_rp: diskonRpDefault,
            subtotal: hargaNett * jumlah,
            total_pcs_masuk: jumlah * rasioKePcs,
            id_satuan_bonus: item.id_satuan_bonus || idSatuanResolved,
            nama_satuan_bonus: item.nama_satuan_bonus || def.nama_satuan,
            rasio_bonus_ke_pcs: item.rasio_bonus_ke_pcs || rasioKePcs
          };
        }
        return item;
      })
    }));
  }, [dataInputBarang.ListPesanan]);

  // ==========================================
  // 1. HANDLER GANTI SATUAN BELANJA
  // ==========================================
  function ganti_satuan_belanja(idSatuanBaru, itemBelanjaan) {
    // LOCK: satuan beli selalu satuan terbesar, tidak boleh diganti
    const terbesar = getSatuanTerbesar(itemBelanjaan);
    if (terbesar) {
      const idTerbesar = terbesar.id_satuan || terbesar.id || terbesar.nama_satuan;
      if (String(idSatuanBaru) !== String(idTerbesar)) return;
    }

    const satuanTerpilih = itemBelanjaan.list_satuan?.find(
      (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(idSatuanBaru)
    );

    if (!satuanTerpilih) return;

    const rasioKePcs = Number(satuanTerpilih.rasio_ke_pcs || satuanTerpilih.jumlah_konversi || 1);
    const hargaSatuanBaru = dapatkanHargaBeliDasar(itemBelanjaan, satuanTerpilih);

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === itemBelanjaan.kode_barang) {
          const jumlah = Number(item.jumlah || 1);
          const persentaseDiskon = Number(item.persentase_diskon_distributor || 0);
          const diskonRp = Math.round((hargaSatuanBaru * persentaseDiskon) / 100);
          const hargaNett = Math.max(0, hargaSatuanBaru - diskonRp);

          return {
            ...item,
            id_satuan: satuanTerpilih.id_satuan || satuanTerpilih.id || satuanTerpilih.nama_satuan,
            nama_satuan: satuanTerpilih.nama_satuan,
            rasio_ke_pcs: rasioKePcs,
            harga_satuan: hargaSatuanBaru,
            diskon_distributor_rp: diskonRp,
            subtotal: hargaNett * jumlah
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
          const persentase = Number(item.persentase_diskon_distributor || 0);
          const diskonRp = Math.round((hargaBaru * persentase) / 100);
          const hargaNett = Math.max(0, hargaBaru - diskonRp);

          return {
            ...item,
            harga_satuan: hargaBaru,
            diskon_distributor_rp: diskonRp,
            subtotal: hargaNett * jumlah
          };
        }
        return item;
      })
    }));
  }

  // ==========================================
  // 2b. HANDLER DISKON DISTRIBUTOR (PERSEN %)
  // ==========================================
  function ubahDiskonPersen(e, itemBelanjaan) {
    const val = e.target.value;
    const persenBaru = val === "" ? "" : Number(val);

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === itemBelanjaan.kode_barang) {
          const harga = Number(item.harga_satuan || 0);
          const jumlah = Number(item.jumlah || 0);
          const p = Number(persenBaru || 0);
          const diskonRp = Math.round((harga * p) / 100);
          const hargaNett = Math.max(0, harga - diskonRp);

          return {
            ...item,
            persentase_diskon_distributor: persenBaru,
            diskon_distributor_rp: diskonRp,
            subtotal: hargaNett * jumlah
          };
        }
        return item;
      })
    }));
  }

  // ==========================================
  // 2c. HANDLER DISKON DISTRIBUTOR (NOMINAL RP)
  // ==========================================
  function ubahDiskonRp(e, itemBelanjaan) {
    const angkaMurni = e.target.value.replace(/\D/g, "");
    const diskonRpBaru = angkaMurni ? Number(angkaMurni) : 0;

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === itemBelanjaan.kode_barang) {
          const harga = Number(item.harga_satuan || 0);
          const jumlah = Number(item.jumlah || 0);
          const persenSesuaian = harga > 0 ? Number(((diskonRpBaru / harga) * 100).toFixed(2)) : 0;
          const hargaNett = Math.max(0, harga - diskonRpBaru);

          return {
            ...item,
            diskon_distributor_rp: diskonRpBaru,
            persentase_diskon_distributor: persenSesuaian,
            subtotal: hargaNett * jumlah
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
          const harga = Number(item.harga_satuan || 0);
          const qty = Number(jumlahBaru || 0);
          const diskonRp = Number(item.diskon_distributor_rp || 0);
          const hargaNett = Math.max(0, harga - diskonRp);

          return {
            ...item,
            jumlah: jumlahBaru,
            subtotal: hargaNett * qty
          };
        }
        return item;
      })
    }));
  }

  // ==========================================
  // 3b. HANDLER BONUS FLEKSIBEL (QTY & SATUAN BONUS)
  // ==========================================
  function ubah_bonus_belanjaan(e, itemBelanjaan) {
    const inputVal = e.target.value;
    const bonusBaru = inputVal === "" ? "" : Math.max(0, Math.floor(Number(inputVal)));

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) =>
        item.kode_barang === itemBelanjaan.kode_barang
          ? { ...item, qty_bonus: bonusBaru }
          : item
      )
    }));
  }

  function handleSatuanBonusChange(idSatuanBonus, itemBelanjaan) {
    const satuanBonusTerpilih = itemBelanjaan.list_satuan?.find(
      (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(idSatuanBonus)
    );

    if (!satuanBonusTerpilih) return;

    const rasioBonusBaru = Number(satuanBonusTerpilih.rasio_ke_pcs || satuanBonusTerpilih.jumlah_konversi || 1);

    setDataInputBarang((prev) => ({
      ...prev,
      ListPesanan: prev.ListPesanan.map((item) => {
        if (item.kode_barang === itemBelanjaan.kode_barang) {
          return {
            ...item,
            id_satuan_bonus: satuanBonusTerpilih.id_satuan || satuanBonusTerpilih.id || satuanBonusTerpilih.nama_satuan,
            nama_satuan_bonus: satuanBonusTerpilih.nama_satuan,
            rasio_bonus_ke_pcs: rasioBonusBaru
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
      ListPesanan: prev.ListPesanan.filter((item) => item.kode_barang !== itemBarangBelanja.kode_barang || item?.nama_barang !== itemBarangBelanja?.nama_barang)
    }));
  }

  // ==========================================
  // 4b. [HUTANG SUPPLIER] HANDLER PEMBAYARAN TOKO
  // ==========================================
  function ubahDibayar(e) {
    const angkaMurni = e.target.value.replace(/\D/g, "").slice(0, 12);
    setFaktur((prev) => ({ ...prev, dibayar: angkaMurni === "" ? "" : Number(angkaMurni) }));
  }

  function bayarLunas() {
    setFaktur((prev) => ({ ...prev, dibayar: totalDenganPpn, jatuh_tempo: "" }));
  }

  function hutangPenuh() {
    setFaktur((prev) => ({ ...prev, dibayar: 0 }));
  }

  function ubahJatuhTempo(e) {
    const nilai = e.target.value;
    setFaktur((prev) => ({ ...prev, jatuh_tempo: nilai }));
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
      if (item.is_bonus_luar || (harga === 0 && jumlah === 0 && Number(item.qty_bonus) > 0)) {
        return false;
      }
      return isNaN(jumlah) || jumlah <= 0 || isNaN(harga) || harga <= 0;
    });

    if (adaYangKosong) {
      return alert('Setiap barang belanja wajib memiliki Jumlah (Qty) dan Harga Beli lebih dari 0!');
    }

    const bonusTidakValid = dataInputBarang.ListPesanan.some((item) => {
      const b = Number(item.qty_bonus || 0);
      return isNaN(b) || b < 0 || !Number.isInteger(b);
    });
    if (bonusTidakValid) {
      return alert('Bonus harus angka bulat 0 atau lebih!');
    }

    const itemTanpaSatuan = dataInputBarang.ListPesanan.find(
      (item) => !item.id_satuan && !item.nama_satuan && item?.status == 'RESTOK'
    );
    if (itemTanpaSatuan) {
      return alert(`Satuan beli untuk "${itemTanpaSatuan.nama_barang || itemTanpaSatuan.kode_barang}" belum terpilih!`);
    }

    if (!Number.isInteger(dibayarAngka) || dibayarAngka < 0) {
      return alert('Nominal dibayar harus angka bulat 0 atau lebih!');
    }
    if (dibayarAngka > totalDenganPpn) {
      return alert(`Nominal dibayar (Rp ${dibayarAngka.toLocaleString('id-ID')}) tidak boleh melebihi total belanja (Rp ${totalDenganPpn.toLocaleString('id-ID')})!`);
    }

    const jatuhTempoKirim = sisaHutang > 0 ? String(faktur.jatuh_tempo || '').trim() : '';
    if (jatuhTempoKirim !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempoKirim) || Number.isNaN(new Date(jatuhTempoKirim).getTime())) {
        return alert('Format jatuh tempo tidak valid!');
      }
      const tglBelanja10 = String(faktur.tanggal_belanja || '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(tglBelanja10) && jatuhTempoKirim < tglBelanja10) {
        return alert('Jatuh tempo tidak boleh sebelum tanggal belanja!');
      }
    }

    if (sisaHutang > 0) {
      const lanjut = window.confirm(`Toko masih berhutang Rp ${sisaHutang.toLocaleString('id-ID')} ke supplier. Lanjutkan simpan?`);
      if (!lanjut) return;
    }

    const payloadListPesanan = dataInputBarang.ListPesanan.map((item) => {
      const def = item.list_satuan?.[0];
      const idSat = item.id_satuan || def?.id_satuan || def?.id || def?.nama_satuan;
      const idSatBonus = item.id_satuan_bonus || idSat;
      return {
        ...item,
        id_satuan: idSat,
        nama_satuan: item.nama_satuan || def?.nama_satuan,
        rasio_ke_pcs: item.rasio_ke_pcs || Number(def?.rasio_ke_pcs || def?.jumlah_konversi || 1),
        persentase_diskon_distributor: Number(item.persentase_diskon_distributor || 0),
        diskon_distributor_rp: Number(item.diskon_distributor_rp || 0),
        qty_bonus: Number(item.qty_bonus || 0),
        id_satuan_bonus: idSatBonus,
        nama_satuan_bonus: item.nama_satuan_bonus || item.nama_satuan || def?.nama_satuan,
        rasio_bonus_ke_pcs: item.rasio_bonus_ke_pcs || Number(item.rasio_ke_pcs || 1)
      };
    });

    try {
      setLoading(prev => ({ ...prev, loadingRequest: true }));
      const API_BELANJA_POST = '/api-be/SERVER_BELANJA_BARANG/BELANJA_BARANG';
      const ress = await axios.post(API_BELANJA_POST, {
        faktur: { ...faktur, dibayar: dibayarAngka, jatuh_tempo: jatuhTempoKirim },
        ListPesanan: payloadListPesanan,
      });

      tampilkanToast(ress.data.message, 'success');

      setFaktur((prev) => ({
        ...prev,
        no_faktur: '',
        diskon_faktur: 0,
        tanggal_belanja: '',
        dataSupplier: null,
        dibayar: '',
        jatuh_tempo: '',
      }));

      setDataInputBarang((prev) => ({
        ...prev,
        ListPesanan: [],
        ItemBarang: [],
      }));

      setInputCariSuplier('');
      alert('Transaksi Belanja Berhasil Disimpan!');

    } catch (err) {
      tampilkanToast(err?.response?.data?.message, 'error');

      if (err?.response?.status == 401 || err?.response?.status == 403) {
        setLoading(prev => ({ ...prev, timeout: true }));
        return;
      }

      alert(err?.response?.data?.message || 'Terjadi kesalahan sistem');

    } finally {
      setLoading(prev => ({ ...prev, loadingRequest: false }));
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
    }, 3000);
  }

  const subtotalSeluruhnya = dataInputBarang.ListPesanan?.reduce((acc, item) => {
    const harga = Number(item.harga_satuan || 0);
    const diskonRp = Number(item.diskon_distributor_rp || 0);
    const hargaNett = Math.max(0, harga - diskonRp);
    const qty = Number(item.jumlah || 0);
    return acc + (hargaNett * qty);
  }, 0) || 0;

  const totalAkhir = Math.max(0, subtotalSeluruhnya - (Number(faktur.diskon_faktur) || 0));
  const ppnPersen = parseFloat(String(faktur.ppn ?? '').replace('%', '').replace(',', '.')) || 0;
  const ppnNominal = Math.round((totalAkhir * ppnPersen) / 100);
  const totalDenganPpn = totalAkhir + ppnNominal;
  const dibayarAngka = Number(faktur.dibayar) || 0;
  const sisaHutang = Math.max(0, totalDenganPpn - dibayarAngka);
  const dibayarMelebihi = dibayarAngka > totalDenganPpn;
  const tanggalMinJatuhTempo = /^\d{4}-\d{2}-\d{2}/.test(String(faktur.tanggal_belanja || ''))
    ? String(faktur.tanggal_belanja).slice(0, 10)
    : undefined;

  if (loading.timeout) {
    return <TimeoutNotif isActive={true} />;
  }

  return (
    <main className="w-full max-w-7xl mx-auto px-3 py-4 sm:p-6 lg:p-8 bg-slate-100 min-h-screen font-sans space-y-6 pb-32">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Daftar Belanja
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium leading-snug">
            Periksa item, satuan, bonus & harga sebelum simpan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Cari & Tambah Barang</span>
          </button>

          <span className="text-xs sm:text-base bg-indigo-50 text-indigo-700 font-extrabold px-3.5 py-2 rounded-2xl shrink-0 border border-indigo-100/80">
            {dataInputBarang.ListPesanan?.length || 0} Item
          </span>
        </div>
      </div>

      {/* LIST STATE */}
      {!dataInputBarang.ListPesanan || dataInputBarang.ListPesanan.length === 0 ? (
        <div className=" bg-white border-2 border-dashed border-slate-300 rounded-3xl p-10 sm:p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto text-2xl font-black mb-4">
            0
          </div>
          <p className="text-lg font-bold text-slate-700">Belum ada barang di daftar belanja</p>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Cari dan pilih produk di atas untuk menambahkan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dataInputBarang.ListPesanan.map((item, index) => {
            const harga = Number(item.harga_satuan) || 0;
            const diskonRp = Number(item.diskon_distributor_rp) || 0;
            const hargaNett = Math.max(0, harga - diskonRp);
            const qty = Number(item.jumlah) || 0;
            const subtotal = hargaNett * qty;

            const rasioUtama = getRasioAktif(item);
            const rasioBonus = getRasioBonus(item);
            const bonus = Number(item.qty_bonus) || 0;
            const totalPcsMasuk = (qty * rasioUtama) + (bonus * rasioBonus);

            return (
              <div
                key={item.kode_barang || index}
                className={` ${item.is_bonus_luar ? 'bg-purple-50':'bg-white'}  min-w-full p-4 sm:p-6 w-full rounded-3xl border border-slate-200/90 shadow-sm space-y-4`}
              >
                {/* CONTAINER CARD UTAMA */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  
                  {/* BAGIAN KIRI: Info Barang, Satuan, Harga Satuan, & Bonus */}
                  <div className="space-y-3.5 flex-1 min-w-0">
                    
                    {/* Kode Barang Badge */}
                    <div className="flex items-center gap-2">
                      <span className="inline-block text-xs font-mono font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        #{item.kode_barang}
                      </span>
                      {item.is_bonus_luar && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-800 rounded-md border border-violet-200 uppercase">
                          Bonus Luar
                        </span>
                      )}
                    </div>

                    {/* Nama Barang */}
                    <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl leading-snug break-words">
                      {item.nama_barang}
                    </h3>

                    {/* Status / Stok Badge */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                          item.status === 'BARANG BARU'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.status === 'BARANG BARU' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        ></span>
                        {item.status || ' RESTOK'}
                      </span>
                    </div>

                    {/* Dropdown Satuan & Input Harga Beli */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1`}>
                        <label className="text-xs font-extrabold text-slate-600 block">Satuan Beli 🔒</label>
                        <select
                          value={
                            String(
                              item.id_satuan ??
                              item.list_satuan?.[0]?.id_satuan ??
                              item.list_satuan?.[0]?.id ??
                              item.list_satuan?.[0]?.nama_satuan ??
                              ''
                            )
                          }
                          onChange={(e) => ganti_satuan_belanja(e.target.value, item)}
                          disabled
                          title="Satuan beli dikunci ke satuan terbesar"
                          className="w-full h-12 px-3 text-sm font-bold text-slate-800 bg-slate-200 border border-slate-300 rounded-xl outline-none cursor-not-allowed opacity-80"
                        >
                          {item.list_satuan?.map((s, idx) => (
                            <option
                              key={s.id_satuan || s.id || `${s.nama_satuan}-${idx}`}
                              value={s.id_satuan || s.id || s.nama_satuan}
                            >
                              {s.nama_satuan} ({s.rasio_ke_pcs || s.jumlah_konversi || 1} PCS)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={` ${item.is_bonus_luar ? 'hidden':'block'} space-y-1`}>
                        <label className="text-xs font-extrabold text-slate-600 block">Harga Beli Satuan</label>
                        <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50 focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-600">
                          <span className="bg-slate-200 px-3 h-12 flex items-center text-xs text-slate-700 font-extrabold border-r border-slate-300">
                            Rp
                          </span>
                          <input
                            value={
                              item?.harga_satuan
                                ? Number(item.harga_satuan).toLocaleString('id-ID')
                                : ''
                            }
                            onChange={(e) => harga_satuan_belanja(e, item)}
                            placeholder="0"
                            type="text"
                            inputMode="numeric"
                            className="w-full h-12 px-3 text-base font-black text-slate-900 outline-none bg-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Box Bonus Gratis (Dengan Qty & Dropdown Satuan Bonus Fleksibel) */}
                    <div className={`${item.ada_fitur_bonus == 1 ? 'block':'hidden'} p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-purple-900">Bonus:</span>
                        <input
                          value={item.qty_bonus ?? ''}
                          onChange={(e) => ubah_bonus_belanjaan(e, item)}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder="0"
                          className="w-16 h-10 px-2 border border-purple-300 rounded-xl text-center text-sm font-black text-slate-900 bg-white outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <select
                          value={
                            String(
                              item.id_satuan_bonus ??
                              item.id_satuan ??
                              item.list_satuan?.[0]?.id_satuan ??
                              item.list_satuan?.[0]?.id ??
                              item.list_satuan?.[0]?.nama_satuan ??
                              ''
                            )
                          }
                          onChange={(e) => handleSatuanBonusChange(e.target.value, item)}
                          className="h-10 px-2 border border-purple-300 rounded-xl text-xs font-bold text-purple-900 bg-white outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                        >
                          {item.list_satuan?.map((s, idx) => (
                            <option
                              key={s.id_satuan || s.id || `${s.nama_satuan}-${idx}`}
                              value={s.id_satuan || s.id || s.nama_satuan}
                            >
                              {s.nama_satuan} ({s.rasio_ke_pcs || s.jumlah_konversi || 1} PCS)
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-xs font-extrabold text-purple-700 bg-purple-100/90 px-3 py-1 rounded-full">
                        Gratis
                      </span>
                    </div>
                  </div>

                  {/* BAGIAN KANAN: Qty, Disk (%), Disk (Rp), Subtotal & Tombol Hapus */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 sm:gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    
                    {/* Input Qty */}
                    <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1 text-center`}>
                      <label className="text-xs font-extrabold text-slate-500 block">Qty</label>
                      <input
                        value={item.jumlah || ''}
                        onChange={(e) => tambah_jumlah_belanjaan(e, item)}
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        min="0"
                        className="w-16 sm:w-20 h-12 border border-slate-300 rounded-xl text-center text-base font-black text-slate-900 outline-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>

                    {/* Input Disk (%) */}
                    <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1 text-center`}>
                      <label className="text-xs font-extrabold text-rose-500 block">Disk (%)</label>
                      <input
                        value={item.persentase_diskon_distributor ?? ''}
                        onChange={(e) => ubahDiskonPersen(e, item)}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0"
                        className="w-16 sm:w-20 h-12 border border-rose-200 bg-rose-50/50 rounded-xl text-center text-base font-black text-rose-900 outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </div>

                    {/* Input Disk (Rp) */}
                    <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1 text-center`}>
                      <label className="text-xs font-extrabold text-rose-500 block">Disk (Rp)</label>
                      <input
                        value={
                          item?.diskon_distributor_rp
                            ? Number(item.diskon_distributor_rp).toLocaleString('id-ID')
                            : ''
                        }
                        onChange={(e) => ubahDiskonRp(e, item)}
                        placeholder="0"
                        type="text"
                        inputMode="numeric"
                        className="w-24 sm:w-28 h-12 px-2 border border-rose-200 bg-rose-50/50 rounded-xl text-center text-base font-black text-rose-900 outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </div>

                    {/* Subtotal */}
                    <div className="space-y-1 text-right px-1 min-w-[110px]">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        SUBTOTAL
                      </span>
                      <span className="text-lg sm:text-xl font-black text-slate-900 block whitespace-nowrap">
                        Rp {subtotal.toLocaleString('id-ID')}
                      </span>
                      <span className="bg-green-50 text-green-900 text-[11px] font-extrabold block">
                        (+{totalPcsMasuk} PCS Masuk)
                      </span>
                    </div>

                    {/* Tombol Hapus */}
                    <button
                      type="button"
                      onClick={() => hapusItem(item)}
                      aria-label="Hapus item"
                      className="h-12 px-3.5 flex items-center justify-center gap-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-xl border border-rose-200 transition-all cursor-pointer text-sm font-extrabold shrink-0"
                    >
                      <span>🗑</span> Hapus
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PEMBAYARAN TOKO SECTION */}
      {dataInputBarang.ListPesanan?.length > 0 && (
        <section className="bg-white border border-slate-200/90 rounded-3xl shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Pembayaran ke Supplier
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
                Isi nominal yang dibayar toko sekarang. Sisanya dicatat sebagai hutang.
              </p>
            </div>
            <div>
              <span
                className={`inline-block shrink-0 text-xs sm:text-sm font-extrabold px-4 py-1.5 rounded-xl border-2 ${
                  sisaHutang > 0 && !dibayarMelebihi
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {sisaHutang > 0 && !dibayarMelebihi ? 'HUTANG' : 'LUNAS'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <label className="text-sm font-extrabold text-slate-800 block">
                Dibayar Toko Sekarang
              </label>
              <div
                className={`flex items-center border-2 rounded-2xl overflow-hidden bg-white h-14 sm:h-16 ${
                  dibayarMelebihi
                    ? 'border-rose-500 ring-4 ring-rose-500/20'
                    : 'border-slate-300 focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:border-emerald-600'
                }`}
              >
                <span className="bg-slate-100 px-4 h-full flex items-center text-base sm:text-lg text-slate-700 font-extrabold border-r-2 border-slate-300">
                  Rp
                </span>
                <input
                  value={
                    faktur.dibayar !== '' && faktur.dibayar != null
                      ? Number(faktur.dibayar).toLocaleString('id-ID')
                      : ''
                  }
                  onChange={ubahDibayar}
                  inputMode="numeric"
                  placeholder="0"
                  type="text"
                  className="w-full h-full px-3 text-xl sm:text-2xl font-black text-slate-900 outline-none bg-transparent"
                />
              </div>
              {dibayarMelebihi && (
                <p className="text-sm text-rose-600 font-bold">
                  Melebihi total belanja (Rp {totalDenganPpn.toLocaleString('id-ID')}).
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={bayarLunas}
                  className="h-12 sm:h-14 text-sm sm:text-base font-extrabold px-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
                >
                  Bayar Lunas
                </button>
                <button
                  type="button"
                  onClick={hutangPenuh}
                  className="h-12 sm:h-14 text-sm sm:text-base font-extrabold px-4 rounded-2xl border-2 border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                >
                  Hutang Semua
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-extrabold text-slate-800 block">
                Jatuh Tempo <span className="font-normal text-slate-500">(opsional)</span>
              </label>
              <input
                type="date"
                value={faktur.jatuh_tempo || ''}
                min={tanggalMinJatuhTempo}
                onChange={ubahJatuhTempo}
                disabled={sisaHutang <= 0}
                className="w-full h-14 sm:h-16 px-4 border-2 border-slate-300 rounded-2xl text-base sm:text-lg font-bold text-slate-900 outline-none bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
              />
            </div>
          </div>

          {/* SUMMARY BOX & TOMBOL PROSES */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
                Total Belanja + PPN:
              </span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 block">
                Rp {totalDenganPpn.toLocaleString('id-ID')}
              </span>
              {sisaHutang > 0 && (
                <span className="text-xs font-bold text-amber-700 block">
                  Sisa Hutang: Rp {sisaHutang.toLocaleString('id-ID')}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={proses}
              className="h-14 sm:h-16 px-8 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-base sm:text-lg rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>SIMPAN TRANSAKSI BELANJA</span>
            </button>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* FIXED INSET-0 POPUP MODAL PENCARIAN BARANG */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Cari & Tambah Barang Belanja
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih barang untuk dimasukkan sebagai item belanja atau bonus
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setHasilCari([]);
                  setInputCari('');
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form Input Cari dalam Modal */}
            <div className="p-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Ketik nama atau kode barang..."
                  value={inputCari}
                  onChange={(e) => setInputCari(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCariBarang();
                    }
                  }}
                  className="flex-1 h-11 px-3.5 text-sm font-semibold border border-slate-300 rounded-xl bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
                <button
                  type="button"
                  onClick={handleCariBarang}
                  disabled={isSearching}
                  className="px-6 h-11 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center"
                >
                  {isSearching ? 'Mencari...' : 'Cari'}
                </button>
              </div>
            </div>

            {/* List Hasil Pencarian dalam Modal */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {hasilCari.length > 0 ? (
                hasilCari.map((barang, idx) => (
                  <div
                    key={barang.kode_barang || idx}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-indigo-50/50 px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {barang.kode_barang}
                        </span>
                        <span className="text-xs font-semibold text-emerald-700">
                          Stok: {barang.stok_pcs || 0} PCS
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mt-1 truncate">
                        {barang.nama_barang}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => tambahBarangBonus(barang)}
                        className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                      >
                        + Bonus
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-1">
                  <p className="text-sm font-semibold">
                    {isSearching ? 'Sedang memuat data...' : 'Ketik nama barang dan klik Cari'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setHasilCari([]);
                  setInputCari('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Batal
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}




// // 'use client'

// // import { useContext, useEffect, useState } from "react";
// // import { Konteks } from "@/GlobalNilai/Global";
// // import { TimeoutNotif } from "@/UI/timeoutNotif/timeoutNotif";
// // import axios from "axios";

// // export function ListBelanjaBarang({ IsScroll }) {
// //   const { dataInputBarang, setDataInputBarang, faktur, setLoading, setFaktur, setInputCariSuplier, loading } = useContext(Konteks);

// //   // ==========================================
// //   // STATE MODAL POPUP OVERLAY & PENCARIAN BARANG (API PENJUALAN)
// //   // ==========================================
// //   const [isModalOpen, setIsModalOpen] = useState(false);
// //   const [inputCari, setInputCari] = useState('');
// //   const [hasilCari, setHasilCari] = useState([]);
// //   const [isSearching, setIsSearching] = useState(false);

// //   // Helper untuk mendapatkan rasio satuan aktif (Beli)
// //   function getRasioAktif(item) {
// //     if (item.rasio_ke_pcs && Number(item.rasio_ke_pcs) > 0) {
// //       return Number(item.rasio_ke_pcs);
// //     }
// //     const satuanTerpilih = item.list_satuan?.find(
// //       (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(item.id_satuan)
// //     );
// //     if (satuanTerpilih) {
// //       return Number(satuanTerpilih.rasio_ke_pcs || satuanTerpilih.jumlah_konversi || 1);
// //     }
// //     if (item.list_satuan && item.list_satuan.length > 0) {
// //       return Number(item.list_satuan[0].rasio_ke_pcs || item.list_satuan[0].jumlah_konversi || 1);
// //     }
// //     return 1;
// //   }

// //   // Helper untuk mendapatkan rasio satuan bonus
// //   function getRasioBonus(item) {
// //     if (item.id_satuan_bonus) {
// //       const sb = item.list_satuan?.find(
// //         (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(item.id_satuan_bonus)
// //       );
// //       if (sb) return Number(sb.rasio_ke_pcs || sb.jumlah_konversi || 1);
// //     }
// //     return getRasioAktif(item);
// //   }

// //   // Helper murni penentu harga beli dasar (Murni Modal, bukan Harga Jual)
// //   function dapatkanHargaBeliDasar(item, satuanTerpilih) {
// //     const rasio = Number(satuanTerpilih?.rasio_ke_pcs || satuanTerpilih?.jumlah_konversi || 1);

// //     if (item.harga_dasar && Number(item.harga_dasar) > 0) {
// //       const hd = Number(item.harga_dasar);
// //       if (satuanTerpilih && rasio > 1 && hd < (satuanTerpilih.harga_jual || 0) / 2) {
// //         return hd * rasio;
// //       }
// //       return hd;
// //     }

// //     if (satuanTerpilih?.harga_beli && Number(satuanTerpilih.harga_beli) > 0) {
// //       return Number(satuanTerpilih.harga_beli);
// //     }
// //     if (satuanTerpilih?.harga_modal && Number(satuanTerpilih.harga_modal) > 0) {
// //       return Number(satuanTerpilih.harga_modal);
// //     }

// //     return Number(item.harga_satuan || 0);
// //   }

// //   // ==========================================
// //   // CARI BARANG MENGGUNAKAN API PENJUALAN
// //   // ==========================================
// //   const handleCariBarang = async () => {
// //     if (!inputCari.trim()) return alert('Ketik nama atau kode barang terlebih dahulu!');
// //     setIsSearching(true);
// //     try {
// //       const API_PENJUALAN_CARI = '/api-be/SERVER_JUAL_BARANG/JUAL_BARANG';
// //       const res = await axios.get(API_PENJUALAN_CARI, { params: { input: inputCari } });
// //       const items = res.data?.Search || [];

// //       if (items.length === 0) {
// //         alert('Barang tidak ditemukan di database');
// //       }

// //       setHasilCari(items);
// //     } catch (err) {
// //       console.error('Gagal cari barang:', err);
// //       alert(err?.response?.data?.message || 'Gagal mengambil data barang dari server');
// //     } finally {
// //       setIsSearching(false);
// //     }
// //   };

// //   // 1. Tambah sebagai Barang Belanja Reguler (Harga Modal Aktif)
// //   const tambahBarangBelanjaReguler = (barangSelected) => {
// //     const barangAda = dataInputBarang?.ListPesanan?.find(
// //       (item) => item.kode_barang === barangSelected.kode_barang
// //     );

// //     if (barangAda) {
// //       const qtyBaru = Number(barangAda.jumlah || 0) + 1;
// //       tambah_jumlah_belanjaan({ target: { value: qtyBaru } }, barangAda);
// //     } else {
// //       const listSatuan = barangSelected.list_satuan || [];
// //       const def = [...listSatuan].sort(
// //         (a, b) => Number(b.rasio_ke_pcs || 1) - Number(a.rasio_ke_pcs || 1)
// //       )[0] || { id_satuan: null, nama_satuan: 'PCS', rasio_ke_pcs: 1 };

// //       const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
// //       const hargaBeliDefault = dapatkanHargaBeliDasar(barangSelected, def);
// //       const jumlah = 1;
// //       const idSat = def.id_satuan || def.id || def.nama_satuan;

// //       const itemBelanjaBaru = {
// //         kode_barang: barangSelected.kode_barang,
// //         nama_barang: barangSelected.nama_barang,
// //         status: barangSelected.status || 'RESTOK',
// //         stok_pcs: barangSelected.stok_pcs || 0,
// //         list_satuan: listSatuan,
// //         ada_fitur_bonus: barangSelected.ada_fitur_bonus ?? 1,

// //         id_satuan: idSat,
// //         nama_satuan: def.nama_satuan,
// //         rasio_ke_pcs: rasioKePcs,
// //         jumlah: jumlah,
// //         harga_satuan: hargaBeliDefault,
// //         persentase_diskon_distributor: 0,
// //         diskon_distributor_rp: 0,
// //         subtotal: hargaBeliDefault * jumlah,

// //         // Defaults Bonus
// //         qty_bonus: 0,
// //         id_satuan_bonus: idSat,
// //         nama_satuan_bonus: def.nama_satuan,
// //         rasio_bonus_ke_pcs: rasioKePcs
// //       };

// //       setDataInputBarang((prev) => ({
// //         ...prev,
// //         ListPesanan: [...(prev.ListPesanan || []), itemBelanjaBaru]
// //       }));
// //     }

// //     setIsModalOpen(false);
// //     setHasilCari([]);
// //     setInputCari('');
// //   };

// //   // 2. Tambah Barang Bonus (Otomatis Harga 0, Subtotal 0, Qty Beli 0, Qty Bonus 1)
// //   const tambahBarangBonus = (barangSelected) => {
// //     const barangAda = dataInputBarang?.ListPesanan?.find(
// //       (item) => item.kode_barang === barangSelected.kode_barang
// //     );

// //     if (barangAda) {
// //       const bonusBaru = Number(barangAda.qty_bonus || 0) + 1;
// //       ubah_bonus_belanjaan({ target: { value: bonusBaru } }, barangAda);
// //     } else {
// //       const listSatuan = barangSelected.list_satuan || [];
// //       const def = [...listSatuan].sort(
// //         (a, b) => Number(b.rasio_ke_pcs || 1) - Number(a.rasio_ke_pcs || 1)
// //       )[0] || { id_satuan: null, nama_satuan: 'PCS', rasio_ke_pcs: 1 };

// //       const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
// //       const idSat = def.id_satuan || def.id || def.nama_satuan;

// //       const itemBonusBaru = {
// //         kode_barang: barangSelected.kode_barang,
// //         nama_barang: barangSelected.nama_barang,
// //         status: barangSelected.status || 'RESTOK',
// //         stok_pcs: barangSelected.stok_pcs || 0,
// //         list_satuan: listSatuan,
// //         ada_fitur_bonus: 1,

// //         id_satuan: idSat,
// //         nama_satuan: def.nama_satuan,
// //         rasio_ke_pcs: rasioKePcs,
// //         jumlah: 0,
// //         harga_satuan: 0,
// //         persentase_diskon_distributor: 0,
// //         diskon_distributor_rp: 0,
// //         subtotal: 0,

// //         // Bonus Fields
// //         qty_bonus: 1,
// //         id_satuan_bonus: idSat,
// //         nama_satuan_bonus: def.nama_satuan,
// //         rasio_bonus_ke_pcs: rasioKePcs,
// //         is_bonus_luar: true
// //       };

// //       setDataInputBarang((prev) => ({
// //         ...prev,
// //         ListPesanan: [...(prev.ListPesanan || []), itemBonusBaru]
// //       }));
// //     }

// //     setIsModalOpen(false);
// //     setHasilCari([]);
// //     setInputCari('');
// //   };

// //   // ==========================================
// //   // AUTO SINKRONISASI SATUAN TERBESAR & HARGA PERTAMA KALI
// //   // ==========================================
// //   useEffect(() => {
// //     const adaYangBelumSinkron = dataInputBarang.ListPesanan?.some(
// //       (item) => !item.id_satuan && item.list_satuan?.length > 0
// //     );

// //     if (!adaYangBelumSinkron) return;

// //     setDataInputBarang((prev) => ({
// //       ...prev,
// //       ListPesanan: prev.ListPesanan.map((item) => {
// //         if (!item.id_satuan && item.list_satuan?.length > 0) {
// //           const def = [...item.list_satuan].sort(
// //             (a, b) => Number(b.rasio_ke_pcs || 1) - Number(a.rasio_ke_pcs || 1)
// //           )[0];

// //           const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
// //           const hargaBeliDefault = dapatkanHargaBeliDasar(item, def);
// //           const jumlah = Number(item.jumlah || 1);

// //           const persentaseDiskon = Number(item.persentase_diskon_distributor || 0);
// //           const diskonRpDefault = Math.round((hargaBeliDefault * persentaseDiskon) / 100);
// //           const hargaNett = Math.max(0, hargaBeliDefault - diskonRpDefault);

// //           const idSatuanResolved = def.id_satuan || def.id || def.nama_satuan;

// //           return {
// //             ...item,
// //             id_satuan: idSatuanResolved,
// //             nama_satuan: def.nama_satuan,
// //             rasio_ke_pcs: rasioKePcs,
// //             jumlah: jumlah,
// //             harga_satuan: hargaBeliDefault,
// //             persentase_diskon_distributor: persentaseDiskon,
// //             diskon_distributor_rp: diskonRpDefault,
// //             subtotal: hargaNett * jumlah,
// //             total_pcs_masuk: jumlah * rasioKePcs,
// //             id_satuan_bonus: item.id_satuan_bonus || idSatuanResolved,
// //             nama_satuan_bonus: item.nama_satuan_bonus || def.nama_satuan,
// //             rasio_bonus_ke_pcs: item.rasio_bonus_ke_pcs || rasioKePcs
// //           };
// //         }
// //         return item;
// //       })
// //     }));
// //   }, [dataInputBarang.ListPesanan]);

// //   // ==========================================
// //   // 1. HANDLER GANTI SATUAN BELANJA
// //   // ==========================================
// //   function ganti_satuan_belanja(idSatuanBaru, itemBelanjaan) {
// //     const satuanTerpilih = itemBelanjaan.list_satuan?.find(
// //       (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(idSatuanBaru)
// //     );

// //     if (!satuanTerpilih) return;

// //     const rasioKePcs = Number(satuanTerpilih.rasio_ke_pcs || satuanTerpilih.jumlah_konversi || 1);
// //     const hargaSatuanBaru = dapatkanHargaBeliDasar(itemBelanjaan, satuanTerpilih);

// //     setDataInputBarang((prev) => ({
// //       ...prev,
// //       ListPesanan: prev.ListPesanan.map((item) => {
// //         if (item.kode_barang === itemBelanjaan.kode_barang) {
// //           const jumlah = Number(item.jumlah || 1);
// //           const persentaseDiskon = Number(item.persentase_diskon_distributor || 0);
// //           const diskonRp = Math.round((hargaSatuanBaru * persentaseDiskon) / 100);
// //           const hargaNett = Math.max(0, hargaSatuanBaru - diskonRp);

// //           return {
// //             ...item,
// //             id_satuan: satuanTerpilih.id_satuan || satuanTerpilih.id || satuanTerpilih.nama_satuan,
// //             nama_satuan: satuanTerpilih.nama_satuan,
// //             rasio_ke_pcs: rasioKePcs,
// //             harga_satuan: hargaSatuanBaru,
// //             diskon_distributor_rp: diskonRp,
// //             subtotal: hargaNett * jumlah
// //           };
// //         }
// //         return item;
// //       })
// //     }));
// //   }

// //   // ==========================================
// //   // 2. HANDLER EDIT HARGA BELI PER SATUAN
// //   // ==========================================
// //   function harga_satuan_belanja(e, itemBelanjaan) {
// //     const angkaMurni = e.target.value.replace(/\D/g, "");
// //     const hargaBaru = angkaMurni ? Number(angkaMurni) : 0;

// //     setDataInputBarang((prev) => ({
// //       ...prev,
// //       ListPesanan: prev.ListPesanan.map((item) => {
// //         if (item.kode_barang === itemBelanjaan.kode_barang) {
// //           const jumlah = Number(item.jumlah || 0);
// //           const persentase = Number(item.persentase_diskon_distributor || 0);
// //           const diskonRp = Math.round((hargaBaru * persentase) / 100);
// //           const hargaNett = Math.max(0, hargaBaru - diskonRp);

// //           return {
// //             ...item,
// //             harga_satuan: hargaBaru,
// //             diskon_distributor_rp: diskonRp,
// //             subtotal: hargaNett * jumlah
// //           };
// //         }
// //         return item;
// //       })
// //     }));
// //   }

// //   // ==========================================
// //   // 2b. HANDLER DISKON DISTRIBUTOR (PERSEN %)
// //   // ==========================================
// //   function ubahDiskonPersen(e, itemBelanjaan) {
// //     const val = e.target.value;
// //     const persenBaru = val === "" ? "" : Number(val);

// //     setDataInputBarang((prev) => ({
// //       ...prev,
// //       ListPesanan: prev.ListPesanan.map((item) => {
// //         if (item.kode_barang === itemBelanjaan.kode_barang) {
// //           const harga = Number(item.harga_satuan || 0);
// //           const jumlah = Number(item.jumlah || 0);
// //           const p = Number(persenBaru || 0);
// //           const diskonRp = Math.round((harga * p) / 100);
// //           const hargaNett = Math.max(0, harga - diskonRp);

// //           return {
// //             ...item,
// //             persentase_diskon_distributor: persenBaru,
// //             diskon_distributor_rp: diskonRp,
// //             subtotal: hargaNett * jumlah
// //           };
// //         }
// //         return item;
// //       })
// //     }));
// //   }

// //   // ==========================================
// //   // 2c. HANDLER DISKON DISTRIBUTOR (NOMINAL RP)
// //   // ==========================================
// //   function ubahDiskonRp(e, itemBelanjaan) {
// //     const angkaMurni = e.target.value.replace(/\D/g, "");
// //     const diskonRpBaru = angkaMurni ? Number(angkaMurni) : 0;

// //     setDataInputBarang((prev) => ({
// //       ...prev,
// //       ListPesanan: prev.ListPesanan.map((item) => {
// //         if (item.kode_barang === itemBelanjaan.kode_barang) {
// //           const harga = Number(item.harga_satuan || 0);
// //           const jumlah = Number(item.jumlah || 0);
// //           const persenSesuaian = harga > 0 ? Number(((diskonRpBaru / harga) * 100).toFixed(2)) : 0;
// //           const hargaNett = Math.max(0, harga - diskonRpBaru);

// //           return {
// //             ...item,
// //             diskon_distributor_rp: diskonRpBaru,
// //             persentase_diskon_distributor: persenSesuaian,
// //             subtotal: hargaNett * jumlah
// //           };
// //         }
// //         return item;
// //       })
// //     }));
// //   }

// //   // ==========================================
// //   // 3. HANDLER EDIT QTY BELANJA
// //   // ==========================================
// //   function tambah_jumlah_belanjaan(e, itemBelanjaan) {
// //     const inputVal = e.target.value;
// //     const jumlahBaru = inputVal === "" ? "" : Number(inputVal);

// //     setDataInputBarang((prev) => ({
// //       ...prev,
// //       ListPesanan: prev.ListPesanan.map((item) => {
// //         if (item.kode_barang === itemBelanjaan.kode_barang) {
// //           const harga = Number(item.harga_satuan || 0);
// //           const qty = Number(jumlahBaru || 0);
// //           const diskonRp = Number(item.diskon_distributor_rp || 0);
// //           const hargaNett = Math.max(0, harga - diskonRp);

// //           return {
// //             ...item,
// //             jumlah: jumlahBaru,
// //             subtotal: hargaNett * qty
// //           };
// //         }
// //         return item;
// //       })
// //     }));
// //   }

// //   // ==========================================
// //   // 3b. HANDLER BONUS FLEKSIBEL (QTY & SATUAN BONUS)
// //   // ==========================================
// //   function ubah_bonus_belanjaan(e, itemBelanjaan) {
// //     const inputVal = e.target.value;
// //     const bonusBaru = inputVal === "" ? "" : Math.max(0, Math.floor(Number(inputVal)));

// //     setDataInputBarang((prev) => ({
// //       ...prev,
// //       ListPesanan: prev.ListPesanan.map((item) =>
// //         item.kode_barang === itemBelanjaan.kode_barang
// //           ? { ...item, qty_bonus: bonusBaru }
// //           : item
// //       )
// //     }));
// //   }

// //   function handleSatuanBonusChange(idSatuanBonus, itemBelanjaan) {
// //     const satuanBonusTerpilih = itemBelanjaan.list_satuan?.find(
// //       (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(idSatuanBonus)
// //     );

// //     if (!satuanBonusTerpilih) return;

// //     const rasioBonusBaru = Number(satuanBonusTerpilih.rasio_ke_pcs || satuanBonusTerpilih.jumlah_konversi || 1);

// //     setDataInputBarang((prev) => ({
// //       ...prev,
// //       ListPesanan: prev.ListPesanan.map((item) => {
// //         if (item.kode_barang === itemBelanjaan.kode_barang) {
// //           return {
// //             ...item,
// //             id_satuan_bonus: satuanBonusTerpilih.id_satuan || satuanBonusTerpilih.id || satuanBonusTerpilih.nama_satuan,
// //             nama_satuan_bonus: satuanBonusTerpilih.nama_satuan,
// //             rasio_bonus_ke_pcs: rasioBonusBaru
// //           };
// //         }
// //         return item;
// //       })
// //     }));
// //   }

// //   // ==========================================
// //   // 4. HANDLER HAPUS ITEM
// //   // ==========================================
// //   function hapusItem(itemBarangBelanja) {
// //     setDataInputBarang((prev) => ({
// //       ...prev,
// //       ListPesanan: prev.ListPesanan.filter((item) => item.kode_barang !== itemBarangBelanja.kode_barang || item?.nama_barang == itemBarangBelanja?.nama_barang)
// //     }));
// //   }

// //   // ==========================================
// //   // 4b. [HUTANG SUPPLIER] HANDLER PEMBAYARAN TOKO
// //   // ==========================================
// //   function ubahDibayar(e) {
// //     const angkaMurni = e.target.value.replace(/\D/g, "").slice(0, 12);
// //     setFaktur((prev) => ({ ...prev, dibayar: angkaMurni === "" ? "" : Number(angkaMurni) }));
// //   }

// //   function bayarLunas() {
// //     setFaktur((prev) => ({ ...prev, dibayar: totalDenganPpn, jatuh_tempo: "" }));
// //   }

// //   function hutangPenuh() {
// //     setFaktur((prev) => ({ ...prev, dibayar: 0 }));
// //   }

// //   function ubahJatuhTempo(e) {
// //     const nilai = e.target.value;
// //     setFaktur((prev) => ({ ...prev, jatuh_tempo: nilai }));
// //   }

// //   // ==========================================
// //   // 5. PROSES SIMPAN TRANSAKSI BELANJA
// //   // ==========================================
// //   async function proses() {
// //     if (!dataInputBarang?.ListPesanan || dataInputBarang.ListPesanan.length === 0) {
// //       return alert('List pesanan belanja masih kosong!');
// //     }

// //     const adaYangKosong = dataInputBarang.ListPesanan.some((item) => {
// //       const jumlah = Number(item.jumlah);
// //       const harga = Number(item.harga_satuan);
// //       if (item.is_bonus_luar || (harga === 0 && jumlah === 0 && Number(item.qty_bonus) > 0)) {
// //         return false;
// //       }
// //       return isNaN(jumlah) || jumlah <= 0 || isNaN(harga) || harga <= 0;
// //     });

// //     if (adaYangKosong) {
// //       return alert('Setiap barang belanja wajib memiliki Jumlah (Qty) dan Harga Beli lebih dari 0!');
// //     }

// //     const bonusTidakValid = dataInputBarang.ListPesanan.some((item) => {
// //       const b = Number(item.qty_bonus || 0);
// //       return isNaN(b) || b < 0 || !Number.isInteger(b);
// //     });
// //     if (bonusTidakValid) {
// //       return alert('Bonus harus angka bulat 0 atau lebih!');
// //     }

// //     const itemTanpaSatuan = dataInputBarang.ListPesanan.find(
// //       (item) => !item.id_satuan && !item.nama_satuan && item?.status == 'RESTOK'
// //     );
// //     if (itemTanpaSatuan) {
// //       return alert(`Satuan beli untuk "${itemTanpaSatuan.nama_barang || itemTanpaSatuan.kode_barang}" belum terpilih!`);
// //     }

// //     if (!Number.isInteger(dibayarAngka) || dibayarAngka < 0) {
// //       return alert('Nominal dibayar harus angka bulat 0 atau lebih!');
// //     }
// //     if (dibayarAngka > totalDenganPpn) {
// //       return alert(`Nominal dibayar (Rp ${dibayarAngka.toLocaleString('id-ID')}) tidak boleh melebihi total belanja (Rp ${totalDenganPpn.toLocaleString('id-ID')})!`);
// //     }

// //     const jatuhTempoKirim = sisaHutang > 0 ? String(faktur.jatuh_tempo || '').trim() : '';
// //     if (jatuhTempoKirim !== '') {
// //       if (!/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempoKirim) || Number.isNaN(new Date(jatuhTempoKirim).getTime())) {
// //         return alert('Format jatuh tempo tidak valid!');
// //       }
// //       const tglBelanja10 = String(faktur.tanggal_belanja || '').slice(0, 10);
// //       if (/^\d{4}-\d{2}-\d{2}$/.test(tglBelanja10) && jatuhTempoKirim < tglBelanja10) {
// //         return alert('Jatuh tempo tidak boleh sebelum tanggal belanja!');
// //       }
// //     }

// //     if (sisaHutang > 0) {
// //       const lanjut = window.confirm(`Toko masih berhutang Rp ${sisaHutang.toLocaleString('id-ID')} ke supplier. Lanjutkan simpan?`);
// //       if (!lanjut) return;
// //     }

// //     const payloadListPesanan = dataInputBarang.ListPesanan.map((item) => {
// //       const def = item.list_satuan?.[0];
// //       const idSat = item.id_satuan || def?.id_satuan || def?.id || def?.nama_satuan;
// //       const idSatBonus = item.id_satuan_bonus || idSat;
// //       return {
// //         ...item,
// //         id_satuan: idSat,
// //         nama_satuan: item.nama_satuan || def?.nama_satuan,
// //         rasio_ke_pcs: item.rasio_ke_pcs || Number(def?.rasio_ke_pcs || def?.jumlah_konversi || 1),
// //         persentase_diskon_distributor: Number(item.persentase_diskon_distributor || 0),
// //         diskon_distributor_rp: Number(item.diskon_distributor_rp || 0),
// //         qty_bonus: Number(item.qty_bonus || 0),
// //         id_satuan_bonus: idSatBonus,
// //         nama_satuan_bonus: item.nama_satuan_bonus || item.nama_satuan || def?.nama_satuan,
// //         rasio_bonus_ke_pcs: item.rasio_bonus_ke_pcs || Number(item.rasio_ke_pcs || 1)
// //       };
// //     });

// //     try {
// //       setLoading(prev => ({ ...prev, loadingRequest: true }));
// //       const API_BELANJA_POST = '/api-be/SERVER_BELANJA_BARANG/BELANJA_BARANG';
// //       const ress = await axios.post(API_BELANJA_POST, {
// //         faktur: { ...faktur, dibayar: dibayarAngka, jatuh_tempo: jatuhTempoKirim },
// //         ListPesanan: payloadListPesanan,
// //       });

// //       tampilkanToast(ress.data.message, 'success');

// //       setFaktur((prev) => ({
// //         ...prev,
// //         no_faktur: '',
// //         diskon_faktur: 0,
// //         tanggal_belanja: '',
// //         dataSupplier: null,
// //         dibayar: '',
// //         jatuh_tempo: '',
// //       }));

// //       setDataInputBarang((prev) => ({
// //         ...prev,
// //         ListPesanan: [],
// //         ItemBarang: [],
// //       }));

// //       setInputCariSuplier('');
// //       alert('Transaksi Belanja Berhasil Disimpan!');

// //     } catch (err) {
// //       tampilkanToast(err?.response?.data?.message, 'error');

// //       if (err?.response?.status == 401 || err?.response?.status == 403) {
// //         setLoading(prev => ({ ...prev, timeout: true }));
// //         return;
// //       }

// //       alert(err?.response?.data?.message || 'Terjadi kesalahan sistem');

// //     } finally {
// //       setLoading(prev => ({ ...prev, loadingRequest: false }));
// //     }
// //   }

// //   function tampilkanToast(message, type) {
// //     setLoading(prev => ({
// //       ...prev,
// //       toast: true,
// //       toastMessage: message,
// //       toastType: type
// //     }));

// //     setTimeout(() => {
// //       setLoading(prev => ({ ...prev, toast: false }));
// //     }, 3000);
// //   }

// //   const subtotalSeluruhnya = dataInputBarang.ListPesanan?.reduce((acc, item) => {
// //     const harga = Number(item.harga_satuan || 0);
// //     const diskonRp = Number(item.diskon_distributor_rp || 0);
// //     const hargaNett = Math.max(0, harga - diskonRp);
// //     const qty = Number(item.jumlah || 0);
// //     return acc + (hargaNett * qty);
// //   }, 0) || 0;

// //   const totalAkhir = Math.max(0, subtotalSeluruhnya - (Number(faktur.diskon_faktur) || 0));
// //   const ppnPersen = parseFloat(String(faktur.ppn ?? '').replace('%', '').replace(',', '.')) || 0;
// //   const ppnNominal = Math.round((totalAkhir * ppnPersen) / 100);
// //   const totalDenganPpn = totalAkhir + ppnNominal;
// //   const dibayarAngka = Number(faktur.dibayar) || 0;
// //   const sisaHutang = Math.max(0, totalDenganPpn - dibayarAngka);
// //   const dibayarMelebihi = dibayarAngka > totalDenganPpn;
// //   const tanggalMinJatuhTempo = /^\d{4}-\d{2}-\d{2}/.test(String(faktur.tanggal_belanja || ''))
// //     ? String(faktur.tanggal_belanja).slice(0, 10)
// //     : undefined;

// //   if (loading.timeout) {
// //     return <TimeoutNotif isActive={true} />;
// //   }

// //   return (
// //     <main className="w-full max-w-7xl mx-auto px-3 py-4 sm:p-6 lg:p-8 bg-slate-100 min-h-screen font-sans space-y-6 pb-32">
      
// //       {/* HEADER SECTION */}
// //       <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-4">
// //         <div className="min-w-0">
// //           <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
// //             Daftar Belanja
// //           </h2>
// //           <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium leading-snug">
// //             Periksa item, satuan, bonus & harga sebelum simpan
// //           </p>
// //         </div>

// //         <div className="flex items-center gap-2">
// //           <button
// //             type="button"
// //             onClick={() => setIsModalOpen(true)}
// //             className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
// //           >
// //             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
// //               <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
// //             </svg>
// //             <span>+ Cari & Tambah Barang</span>
// //           </button>

// //           <span className="text-xs sm:text-base bg-indigo-50 text-indigo-700 font-extrabold px-3.5 py-2 rounded-2xl shrink-0 border border-indigo-100/80">
// //             {dataInputBarang.ListPesanan?.length || 0} Item
// //           </span>
// //         </div>
// //       </div>

// //       {/* LIST STATE */}
// //       {!dataInputBarang.ListPesanan || dataInputBarang.ListPesanan.length === 0 ? (
// //         <div className=" bg-white border-2 border-dashed border-slate-300 rounded-3xl p-10 sm:p-16 text-center">
// //           <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto text-2xl font-black mb-4">
// //             0
// //           </div>
// //           <p className="text-lg font-bold text-slate-700">Belum ada barang di daftar belanja</p>
// //           <p className="text-sm sm:text-base text-slate-500 mt-1">Cari dan pilih produk di atas untuk menambahkan</p>
// //         </div>
// //       ) : (
// //         <div className="space-y-4">
// //           {dataInputBarang.ListPesanan.map((item, index) => {
// //             const harga = Number(item.harga_satuan) || 0;
// //             const diskonRp = Number(item.diskon_distributor_rp) || 0;
// //             const hargaNett = Math.max(0, harga - diskonRp);
// //             const qty = Number(item.jumlah) || 0;
// //             const subtotal = hargaNett * qty;

// //             const rasioUtama = getRasioAktif(item);
// //             const rasioBonus = getRasioBonus(item);
// //             const bonus = Number(item.qty_bonus) || 0;
// //             const totalPcsMasuk = (qty * rasioUtama) + (bonus * rasioBonus);

// //             return (
// //               <div
// //                 key={item.kode_barang || index}
// //                 className={` ${item.is_bonus_luar ? 'bg-purple-50':'bg-white'}  min-w-full p-4 sm:p-6 w-full rounded-3xl border border-slate-200/90 shadow-sm space-y-4`}
// //               >
// //                 {/* CONTAINER CARD UTAMA */}
// //                 <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  
// //                   {/* BAGIAN KIRI: Info Barang, Satuan, Harga Satuan, & Bonus */}
// //                   <div className="space-y-3.5 flex-1 min-w-0">
                    
// //                     {/* Kode Barang Badge */}
// //                     <div className="flex items-center gap-2">
// //                       <span className="inline-block text-xs font-mono font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
// //                         #{item.kode_barang}
// //                       </span>
// //                       {item.is_bonus_luar && (
// //                         <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-800 rounded-md border border-violet-200 uppercase">
// //                           Bonus Luar
// //                         </span>
// //                       )}
// //                     </div>

// //                     {/* Nama Barang */}
// //                     <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl leading-snug break-words">
// //                       {item.nama_barang}
// //                     </h3>

// //                     {/* Status / Stok Badge */}
// //                     <div>
// //                       <span
// //                         className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
// //                           item.status === 'BARANG BARU'
// //                             ? 'bg-amber-50 text-amber-700 border-amber-200'
// //                             : 'bg-emerald-50 text-emerald-700 border-emerald-200'
// //                         }`}
// //                       >
// //                         <span
// //                           className={`w-2 h-2 rounded-full ${
// //                             item.status === 'BARANG BARU' ? 'bg-amber-500' : 'bg-emerald-500'
// //                           }`}
// //                         ></span>
// //                         {item.status || ' RESTOK'}
// //                       </span>
// //                     </div>

// //                     {/* Dropdown Satuan & Input Harga Beli */}
// //                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
// //                       <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1`}>
// //                         <label className="text-xs font-extrabold text-slate-600 block">Satuan Beli</label>
// //                         <select
// //                           value={
// //                             String(
// //                               item.id_satuan ??
// //                               item.list_satuan?.[0]?.id_satuan ??
// //                               item.list_satuan?.[0]?.id ??
// //                               item.list_satuan?.[0]?.nama_satuan ??
// //                               ''
// //                             )
// //                           }
// //                           onChange={(e) => ganti_satuan_belanja(e.target.value, item)}
// //                           className="w-full h-12 px-3 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
// //                         >
// //                           {item.list_satuan?.map((s, idx) => (
// //                             <option
// //                               key={s.id_satuan || s.id || `${s.nama_satuan}-${idx}`}
// //                               value={s.id_satuan || s.id || s.nama_satuan}
// //                             >
// //                               {s.nama_satuan} ({s.rasio_ke_pcs || s.jumlah_konversi || 1} PCS)
// //                             </option>
// //                           ))}
// //                         </select>
// //                       </div>

// //                       <div className={` ${item.is_bonus_luar ? 'hidden':'block'} space-y-1`}>
// //                         <label className="text-xs font-extrabold text-slate-600 block">Harga Beli Satuan</label>
// //                         <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50 focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-600">
// //                           <span className="bg-slate-200 px-3 h-12 flex items-center text-xs text-slate-700 font-extrabold border-r border-slate-300">
// //                             Rp
// //                           </span>
// //                           <input
// //                             value={
// //                               item?.harga_satuan
// //                                 ? Number(item.harga_satuan).toLocaleString('id-ID')
// //                                 : ''
// //                             }
// //                             onChange={(e) => harga_satuan_belanja(e, item)}
// //                             placeholder="0"
// //                             type="text"
// //                             inputMode="numeric"
// //                             className="w-full h-12 px-3 text-base font-black text-slate-900 outline-none bg-transparent"
// //                           />
// //                         </div>
// //                       </div>
// //                     </div>

// //                     {/* Box Bonus Gratis (Dengan Qty & Dropdown Satuan Bonus Fleksibel) */}
// //                     <div className={`${item.ada_fitur_bonus == 1 ? 'block':'hidden'} p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3`}>
// //                       <div className="flex items-center gap-2 flex-wrap">
// //                         <span className="text-xs font-extrabold text-purple-900">Bonus:</span>
// //                         <input
// //                           value={item.qty_bonus ?? ''}
// //                           onChange={(e) => ubah_bonus_belanjaan(e, item)}
// //                           type="number"
// //                           inputMode="numeric"
// //                           min="0"
// //                           placeholder="0"
// //                           className="w-16 h-10 px-2 border border-purple-300 rounded-xl text-center text-sm font-black text-slate-900 bg-white outline-none focus:ring-2 focus:ring-purple-400"
// //                         />
// //                         <select
// //                           value={
// //                             String(
// //                               item.id_satuan_bonus ??
// //                               item.id_satuan ??
// //                               item.list_satuan?.[0]?.id_satuan ??
// //                               item.list_satuan?.[0]?.id ??
// //                               item.list_satuan?.[0]?.nama_satuan ??
// //                               ''
// //                             )
// //                           }
// //                           onChange={(e) => handleSatuanBonusChange(e.target.value, item)}
// //                           className="h-10 px-2 border border-purple-300 rounded-xl text-xs font-bold text-purple-900 bg-white outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
// //                         >
// //                           {item.list_satuan?.map((s, idx) => (
// //                             <option
// //                               key={s.id_satuan || s.id || `${s.nama_satuan}-${idx}`}
// //                               value={s.id_satuan || s.id || s.nama_satuan}
// //                             >
// //                               {s.nama_satuan} ({s.rasio_ke_pcs || s.jumlah_konversi || 1} PCS)
// //                             </option>
// //                           ))}
// //                         </select>
// //                       </div>
// //                       <span className="text-xs font-extrabold text-purple-700 bg-purple-100/90 px-3 py-1 rounded-full">
// //                         Gratis
// //                       </span>
// //                     </div>
// //                   </div>

// //                   {/* BAGIAN KANAN: Qty, Disk (%), Disk (Rp), Subtotal & Tombol Hapus */}
// //                   <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 sm:gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    
// //                     {/* Input Qty */}
// //                     <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1 text-center`}>
// //                       <label className="text-xs font-extrabold text-slate-500 block">Qty</label>
// //                       <input
// //                         value={item.jumlah || ''}
// //                         onChange={(e) => tambah_jumlah_belanjaan(e, item)}
// //                         type="number"
// //                         inputMode="numeric"
// //                         placeholder="0"
// //                         min="0"
// //                         className="w-16 sm:w-20 h-12 border border-slate-300 rounded-xl text-center text-base font-black text-slate-900 outline-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600"
// //                       />
// //                     </div>

// //                     {/* Input Disk (%) */}
// //                     <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1 text-center`}>
// //                       <label className="text-xs font-extrabold text-rose-500 block">Disk (%)</label>
// //                       <input
// //                         value={item.persentase_diskon_distributor ?? ''}
// //                         onChange={(e) => ubahDiskonPersen(e, item)}
// //                         type="number"
// //                         inputMode="decimal"
// //                         step="0.01"
// //                         placeholder="0"
// //                         className="w-16 sm:w-20 h-12 border border-rose-200 bg-rose-50/50 rounded-xl text-center text-base font-black text-rose-900 outline-none focus:ring-2 focus:ring-rose-400"
// //                       />
// //                     </div>

// //                     {/* Input Disk (Rp) */}
// //                     <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1 text-center`}>
// //                       <label className="text-xs font-extrabold text-rose-500 block">Disk (Rp)</label>
// //                       <input
// //                         value={
// //                           item?.diskon_distributor_rp
// //                             ? Number(item.diskon_distributor_rp).toLocaleString('id-ID')
// //                             : ''
// //                         }
// //                         onChange={(e) => ubahDiskonRp(e, item)}
// //                         placeholder="0"
// //                         type="text"
// //                         inputMode="numeric"
// //                         className="w-24 sm:w-28 h-12 px-2 border border-rose-200 bg-rose-50/50 rounded-xl text-center text-base font-black text-rose-900 outline-none focus:ring-2 focus:ring-rose-400"
// //                       />
// //                     </div>

// //                     {/* Subtotal */}
// //                     <div className="space-y-1 text-right px-1 min-w-[110px]">
// //                       <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
// //                         SUBTOTAL
// //                       </span>
// //                       <span className="text-lg sm:text-xl font-black text-slate-900 block whitespace-nowrap">
// //                         Rp {subtotal.toLocaleString('id-ID')}
// //                       </span>
// //                       <span className="bg-green-50 text-green-900 text-[11px] font-extrabold block">
// //                         (+{totalPcsMasuk} PCS Masuk)
// //                       </span>
// //                     </div>

// //                     {/* Tombol Hapus */}
// //                     <button
// //                       type="button"
// //                       onClick={() => hapusItem(item)}
// //                       aria-label="Hapus item"
// //                       className="h-12 px-3.5 flex items-center justify-center gap-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-xl border border-rose-200 transition-all cursor-pointer text-sm font-extrabold shrink-0"
// //                     >
// //                       <span>🗑</span> Hapus
// //                     </button>
// //                   </div>

// //                 </div>
// //               </div>
// //             );
// //           })}
// //         </div>
// //       )}

// //       {/* PEMBAYARAN TOKO SECTION */}
// //       {dataInputBarang.ListPesanan?.length > 0 && (
// //         <section className="bg-white border border-slate-200/90 rounded-3xl shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
// //           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
// //             <div className="min-w-0">
// //               <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
// //                 Pembayaran ke Supplier
// //               </h3>
// //               <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
// //                 Isi nominal yang dibayar toko sekarang. Sisanya dicatat sebagai hutang.
// //               </p>
// //             </div>
// //             <div>
// //               <span
// //                 className={`inline-block shrink-0 text-xs sm:text-sm font-extrabold px-4 py-1.5 rounded-xl border-2 ${
// //                   sisaHutang > 0 && !dibayarMelebihi
// //                     ? 'bg-amber-50 text-amber-800 border-amber-300'
// //                     : 'bg-emerald-50 text-emerald-800 border-emerald-300'
// //                 }`}
// //               >
// //                 {sisaHutang > 0 && !dibayarMelebihi ? 'HUTANG' : 'LUNAS'}
// //               </span>
// //             </div>
// //           </div>

// //           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
// //             <div className="lg:col-span-2 space-y-3">
// //               <label className="text-sm font-extrabold text-slate-800 block">
// //                 Dibayar Toko Sekarang
// //               </label>
// //               <div
// //                 className={`flex items-center border-2 rounded-2xl overflow-hidden bg-white h-14 sm:h-16 ${
// //                   dibayarMelebihi
// //                     ? 'border-rose-500 ring-4 ring-rose-500/20'
// //                     : 'border-slate-300 focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:border-emerald-600'
// //                 }`}
// //               >
// //                 <span className="bg-slate-100 px-4 h-full flex items-center text-base sm:text-lg text-slate-700 font-extrabold border-r-2 border-slate-300">
// //                   Rp
// //                 </span>
// //                 <input
// //                   value={
// //                     faktur.dibayar !== '' && faktur.dibayar != null
// //                       ? Number(faktur.dibayar).toLocaleString('id-ID')
// //                       : ''
// //                   }
// //                   onChange={ubahDibayar}
// //                   inputMode="numeric"
// //                   placeholder="0"
// //                   type="text"
// //                   className="w-full h-full px-3 text-xl sm:text-2xl font-black text-slate-900 outline-none bg-transparent"
// //                 />
// //               </div>
// //               {dibayarMelebihi && (
// //                 <p className="text-sm text-rose-600 font-bold">
// //                   Melebihi total belanja (Rp {totalDenganPpn.toLocaleString('id-ID')}).
// //                 </p>
// //               )}
// //               <div className="grid grid-cols-2 gap-3 pt-1">
// //                 <button
// //                   type="button"
// //                   onClick={bayarLunas}
// //                   className="h-12 sm:h-14 text-sm sm:text-base font-extrabold px-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
// //                 >
// //                   Bayar Lunas
// //                 </button>
// //                 <button
// //                   type="button"
// //                   onClick={hutangPenuh}
// //                   className="h-12 sm:h-14 text-sm sm:text-base font-extrabold px-4 rounded-2xl border-2 border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
// //                 >
// //                   Hutang Semua
// //                 </button>
// //               </div>
// //             </div>

// //             <div className="space-y-3">
// //               <label className="text-sm font-extrabold text-slate-800 block">
// //                 Jatuh Tempo <span className="font-normal text-slate-500">(opsional)</span>
// //               </label>
// //               <input
// //                 type="date"
// //                 value={faktur.jatuh_tempo || ''}
// //                 min={tanggalMinJatuhTempo}
// //                 onChange={ubahJatuhTempo}
// //                 disabled={sisaHutang <= 0}
// //                 className="w-full h-14 sm:h-16 px-4 border-2 border-slate-300 rounded-2xl text-base sm:text-lg font-bold text-slate-900 outline-none bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
// //               />
// //             </div>
// //           </div>

// //           {/* SUMMARY BOX & TOMBOL PROSES */}
// //           <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
// //             <div className="space-y-1">
// //               <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
// //                 Total Belanja + PPN:
// //               </span>
// //               <span className="text-2xl sm:text-3xl font-black text-slate-900 block">
// //                 Rp {totalDenganPpn.toLocaleString('id-ID')}
// //               </span>
// //               {sisaHutang > 0 && (
// //                 <span className="text-xs font-bold text-amber-700 block">
// //                   Sisa Hutang: Rp {sisaHutang.toLocaleString('id-ID')}
// //                 </span>
// //               )}
// //             </div>

// //             <button
// //               type="button"
// //               onClick={proses}
// //               className="h-14 sm:h-16 px-8 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-base sm:text-lg rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
// //             >
// //               <span>SIMPAN TRANSAKSI BELANJA</span>
// //             </button>
// //           </div>
// //         </section>
// //       )}

// //       {/* ========================================== */}
// //       {/* FIXED INSET-0 POPUP MODAL PENCARIAN BARANG */}
// //       {/* ========================================== */}
// //       {isModalOpen && (
// //         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
// //           <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            
// //             {/* Modal Header */}
// //             <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
// //               <div>
// //                 <h3 className="text-base sm:text-lg font-bold text-slate-900">
// //                   Cari & Tambah Barang Belanja
// //                 </h3>
// //                 <p className="text-xs text-slate-500 mt-0.5">
// //                   Pilih barang untuk dimasukkan sebagai item belanja atau bonus
// //                 </p>
// //               </div>

// //               <button
// //                 type="button"
// //                 onClick={() => {
// //                   setIsModalOpen(false);
// //                   setHasilCari([]);
// //                   setInputCari('');
// //                 }}
// //                 className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer font-bold"
// //               >
// //                 ✕
// //               </button>
// //             </div>

// //             {/* Form Input Cari dalam Modal */}
// //             <div className="p-4 border-b border-slate-100 bg-white shrink-0">
// //               <div className="flex gap-2">
// //                 <input
// //                   type="text"
// //                   autoFocus
// //                   placeholder="Ketik nama atau kode barang..."
// //                   value={inputCari}
// //                   onChange={(e) => setInputCari(e.target.value)}
// //                   onKeyDown={(e) => {
// //                     if (e.key === 'Enter') {
// //                       e.preventDefault();
// //                       handleCariBarang();
// //                     }
// //                   }}
// //                   className="flex-1 h-11 px-3.5 text-sm font-semibold border border-slate-300 rounded-xl bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
// //                 />
// //                 <button
// //                   type="button"
// //                   onClick={handleCariBarang}
// //                   disabled={isSearching}
// //                   className="px-6 h-11 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center"
// //                 >
// //                   {isSearching ? 'Mencari...' : 'Cari'}
// //                 </button>
// //               </div>
// //             </div>

// //             {/* List Hasil Pencarian dalam Modal */}
// //             <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
// //               {hasilCari.length > 0 ? (
// //                 hasilCari.map((barang, idx) => (
// //                   <div
// //                     key={barang.kode_barang || idx}
// //                     className="py-3 flex items-center justify-between gap-3 hover:bg-indigo-50/50 px-2 rounded-xl transition-colors"
// //                   >
// //                     <div className="min-w-0">
// //                       <div className="flex items-center gap-2">
// //                         <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
// //                           {barang.kode_barang}
// //                         </span>
// //                         <span className="text-xs font-semibold text-emerald-700">
// //                           Stok: {barang.stok_pcs || 0} PCS
// //                         </span>
// //                       </div>
// //                       <h4 className="font-bold text-slate-800 text-sm mt-1 truncate">
// //                         {barang.nama_barang}
// //                       </h4>
// //                     </div>

// //                     <div className="flex items-center gap-2 shrink-0">
// //                       <button
// //                         type="button"
// //                         onClick={() => tambahBarangBonus(barang)}
// //                         className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
// //                       >
// //                         + Bonus
// //                       </button>
// //                     </div>
// //                   </div>
// //                 ))
// //               ) : (
// //                 <div className="py-12 text-center text-slate-400 space-y-1">
// //                   <p className="text-sm font-semibold">
// //                     {isSearching ? 'Sedang memuat data...' : 'Ketik nama barang dan klik Cari'}
// //                   </p>
// //                 </div>
// //               )}
// //             </div>

// //             {/* Modal Footer */}
// //             <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
// //               <button
// //                 type="button"
// //                 onClick={() => {
// //                   setIsModalOpen(false);
// //                   setHasilCari([]);
// //                   setInputCari('');
// //                 }}
// //                 className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
// //               >
// //                 Batal
// //               </button>
// //             </div>

// //           </div>
// //         </div>
// //       )}

// //     </main>
// //   );
// // }


// 'use client'

// import { useContext, useEffect, useState } from "react";
// import { Konteks } from "@/GlobalNilai/Global";
// import { TimeoutNotif } from "@/UI/timeoutNotif/timeoutNotif";
// import axios from "axios";

// export function ListBelanjaBarang({ IsScroll }) {
//   const { dataInputBarang, setDataInputBarang, faktur, setLoading, setFaktur, setInputCariSuplier, loading } = useContext(Konteks);

//   // ==========================================
//   // STATE MODAL POPUP OVERLAY & PENCARIAN BARANG (API PENJUALAN)
//   // ==========================================
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [inputCari, setInputCari] = useState('');
//   const [hasilCari, setHasilCari] = useState([]);
//   const [isSearching, setIsSearching] = useState(false);

//   // Helper untuk mendapatkan rasio satuan aktif (Beli)
//   function getRasioAktif(item) {
//     if (item.rasio_ke_pcs && Number(item.rasio_ke_pcs) > 0) {
//       return Number(item.rasio_ke_pcs);
//     }
//     const satuanTerpilih = item.list_satuan?.find(
//       (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(item.id_satuan)
//     );
//     if (satuanTerpilih) {
//       return Number(satuanTerpilih.rasio_ke_pcs || satuanTerpilih.jumlah_konversi || 1);
//     }
//     if (item.list_satuan && item.list_satuan.length > 0) {
//       return Number(item.list_satuan[0].rasio_ke_pcs || item.list_satuan[0].jumlah_konversi || 1);
//     }
//     return 1;
//   }

//   // Helper untuk mendapatkan rasio satuan bonus
//   function getRasioBonus(item) {
//     if (item.id_satuan_bonus) {
//       const sb = item.list_satuan?.find(
//         (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(item.id_satuan_bonus)
//       );
//       if (sb) return Number(sb.rasio_ke_pcs || sb.jumlah_konversi || 1);
//     }
//     return getRasioAktif(item);
//   }

//   // Helper murni penentu harga beli dasar (Murni Modal, bukan Harga Jual)
//   function dapatkanHargaBeliDasar(item, satuanTerpilih) {
//     const rasio = Number(satuanTerpilih?.rasio_ke_pcs || satuanTerpilih?.jumlah_konversi || 1);

//     if (item.harga_dasar && Number(item.harga_dasar) > 0) {
//       const hd = Number(item.harga_dasar);
//       if (satuanTerpilih && rasio > 1 && hd < (satuanTerpilih.harga_jual || 0) / 2) {
//         return hd * rasio;
//       }
//       return hd;
//     }

//     if (satuanTerpilih?.harga_beli && Number(satuanTerpilih.harga_beli) > 0) {
//       return Number(satuanTerpilih.harga_beli);
//     }
//     if (satuanTerpilih?.harga_modal && Number(satuanTerpilih.harga_modal) > 0) {
//       return Number(satuanTerpilih.harga_modal);
//     }

//     return Number(item.harga_satuan || 0);
//   }

//   // ==========================================
//   // CARI BARANG MENGGUNAKAN API PENJUALAN
//   // ==========================================
//   const handleCariBarang = async () => {
//     if (!inputCari.trim()) return alert('Ketik nama atau kode barang terlebih dahulu!');
//     setIsSearching(true);
//     try {
//       const API_PENJUALAN_CARI = '/api-be/SERVER_JUAL_BARANG/JUAL_BARANG';
//       const res = await axios.get(API_PENJUALAN_CARI, { params: { input: inputCari } });
//       const items = res.data?.Search || [];

//       if (items.length === 0) {
//         alert('Barang tidak ditemukan di database');
//       }

//       setHasilCari(items);
//     } catch (err) {
//       console.error('Gagal cari barang:', err);
//       alert(err?.response?.data?.message || 'Gagal mengambil data barang dari server');
//     } finally {
//       setIsSearching(false);
//     }
//   };

//   // 1. Tambah sebagai Barang Belanja Reguler (Harga Modal Aktif)
//   const tambahBarangBelanjaReguler = (barangSelected) => {
//     const barangAda = dataInputBarang?.ListPesanan?.find(
//       (item) => item.kode_barang === barangSelected.kode_barang
//     );

//     if (barangAda) {
//       const qtyBaru = Number(barangAda.jumlah || 0) + 1;
//       tambah_jumlah_belanjaan({ target: { value: qtyBaru } }, barangAda);
//     } else {
//       const listSatuan = barangSelected.list_satuan || [];
//       const def = [...listSatuan].sort(
//         (a, b) => Number(b.rasio_ke_pcs || 1) - Number(a.rasio_ke_pcs || 1)
//       )[0] || { id_satuan: null, nama_satuan: 'PCS', rasio_ke_pcs: 1 };

//       const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
//       const hargaBeliDefault = dapatkanHargaBeliDasar(barangSelected, def);
//       const jumlah = 1;
//       const idSat = def.id_satuan || def.id || def.nama_satuan;

//       const itemBelanjaBaru = {
//         kode_barang: barangSelected.kode_barang,
//         nama_barang: barangSelected.nama_barang,
//         status: barangSelected.status || 'RESTOK',
//         stok_pcs: barangSelected.stok_pcs || 0,
//         list_satuan: listSatuan,
//         ada_fitur_bonus: barangSelected.ada_fitur_bonus ?? 1,

//         id_satuan: idSat,
//         nama_satuan: def.nama_satuan,
//         rasio_ke_pcs: rasioKePcs,
//         jumlah: jumlah,
//         harga_satuan: hargaBeliDefault,
//         persentase_diskon_distributor: 0,
//         diskon_distributor_rp: 0,
//         subtotal: hargaBeliDefault * jumlah,

//         // Defaults Bonus
//         qty_bonus: 0,
//         id_satuan_bonus: idSat,
//         nama_satuan_bonus: def.nama_satuan,
//         rasio_bonus_ke_pcs: rasioKePcs
//       };

//       setDataInputBarang((prev) => ({
//         ...prev,
//         ListPesanan: [...(prev.ListPesanan || []), itemBelanjaBaru]
//       }));
//     }

//     setIsModalOpen(false);
//     setHasilCari([]);
//     setInputCari('');
//   };

//   // 2. Tambah Barang Bonus (Otomatis Harga 0, Subtotal 0, Qty Beli 0, Qty Bonus 1)
//   const tambahBarangBonus = (barangSelected) => {
//     const barangAda = dataInputBarang?.ListPesanan?.find(
//       (item) => item.kode_barang === barangSelected.kode_barang
//     );

//     if (barangAda) {
//       const bonusBaru = Number(barangAda.qty_bonus || 0) + 1;
//       ubah_bonus_belanjaan({ target: { value: bonusBaru } }, barangAda);
//     } else {
//       const listSatuan = barangSelected.list_satuan || [];
//       const def = [...listSatuan].sort(
//         (a, b) => Number(b.rasio_ke_pcs || 1) - Number(a.rasio_ke_pcs || 1)
//       )[0] || { id_satuan: null, nama_satuan: 'PCS', rasio_ke_pcs: 1 };

//       const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
//       const idSat = def.id_satuan || def.id || def.nama_satuan;

//       const itemBonusBaru = {
//         kode_barang: barangSelected.kode_barang,
//         nama_barang: barangSelected.nama_barang,
//         status: barangSelected.status || 'RESTOK',
//         stok_pcs: barangSelected.stok_pcs || 0,
//         list_satuan: listSatuan,
//         ada_fitur_bonus: 1,

//         id_satuan: idSat,
//         nama_satuan: def.nama_satuan,
//         rasio_ke_pcs: rasioKePcs,
//         jumlah: 0,
//         harga_satuan: 0,
//         persentase_diskon_distributor: 0,
//         diskon_distributor_rp: 0,
//         subtotal: 0,

//         // Bonus Fields
//         qty_bonus: 1,
//         id_satuan_bonus: idSat,
//         nama_satuan_bonus: def.nama_satuan,
//         rasio_bonus_ke_pcs: rasioKePcs,
//         is_bonus_luar: true
//       };

//       setDataInputBarang((prev) => ({
//         ...prev,
//         ListPesanan: [...(prev.ListPesanan || []), itemBonusBaru]
//       }));
//     }

//     setIsModalOpen(false);
//     setHasilCari([]);
//     setInputCari('');
//   };

//   // ==========================================
//   // AUTO SINKRONISASI SATUAN TERBESAR & HARGA PERTAMA KALI
//   // ==========================================
//   useEffect(() => {
//     const adaYangBelumSinkron = dataInputBarang.ListPesanan?.some(
//       (item) => !item.id_satuan && item.list_satuan?.length > 0
//     );

//     if (!adaYangBelumSinkron) return;

//     setDataInputBarang((prev) => ({
//       ...prev,
//       ListPesanan: prev.ListPesanan.map((item) => {
//         if (!item.id_satuan && item.list_satuan?.length > 0) {
//           const def = [...item.list_satuan].sort(
//             (a, b) => Number(b.rasio_ke_pcs || 1) - Number(a.rasio_ke_pcs || 1)
//           )[0];

//           const rasioKePcs = Number(def.rasio_ke_pcs || def.jumlah_konversi || 1);
//           const hargaBeliDefault = dapatkanHargaBeliDasar(item, def);
//           const jumlah = Number(item.jumlah || 1);

//           const persentaseDiskon = Number(item.persentase_diskon_distributor || 0);
//           const diskonRpDefault = Math.round((hargaBeliDefault * persentaseDiskon) / 100);
//           const hargaNett = Math.max(0, hargaBeliDefault - diskonRpDefault);

//           const idSatuanResolved = def.id_satuan || def.id || def.nama_satuan;

//           return {
//             ...item,
//             id_satuan: idSatuanResolved,
//             nama_satuan: def.nama_satuan,
//             rasio_ke_pcs: rasioKePcs,
//             jumlah: jumlah,
//             harga_satuan: hargaBeliDefault,
//             persentase_diskon_distributor: persentaseDiskon,
//             diskon_distributor_rp: diskonRpDefault,
//             subtotal: hargaNett * jumlah,
//             total_pcs_masuk: jumlah * rasioKePcs,
//             id_satuan_bonus: item.id_satuan_bonus || idSatuanResolved,
//             nama_satuan_bonus: item.nama_satuan_bonus || def.nama_satuan,
//             rasio_bonus_ke_pcs: item.rasio_bonus_ke_pcs || rasioKePcs
//           };
//         }
//         return item;
//       })
//     }));
//   }, [dataInputBarang.ListPesanan]);

//   // ==========================================
//   // 1. HANDLER GANTI SATUAN BELANJA
//   // ==========================================
//   function ganti_satuan_belanja(idSatuanBaru, itemBelanjaan) {
//     const satuanTerpilih = itemBelanjaan.list_satuan?.find(
//       (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(idSatuanBaru)
//     );

//     if (!satuanTerpilih) return;

//     const rasioKePcs = Number(satuanTerpilih.rasio_ke_pcs || satuanTerpilih.jumlah_konversi || 1);
//     const hargaSatuanBaru = dapatkanHargaBeliDasar(itemBelanjaan, satuanTerpilih);

//     setDataInputBarang((prev) => ({
//       ...prev,
//       ListPesanan: prev.ListPesanan.map((item) => {
//         if (item.kode_barang === itemBelanjaan.kode_barang) {
//           const jumlah = Number(item.jumlah || 1);
//           const persentaseDiskon = Number(item.persentase_diskon_distributor || 0);
//           const diskonRp = Math.round((hargaSatuanBaru * persentaseDiskon) / 100);
//           const hargaNett = Math.max(0, hargaSatuanBaru - diskonRp);

//           return {
//             ...item,
//             id_satuan: satuanTerpilih.id_satuan || satuanTerpilih.id || satuanTerpilih.nama_satuan,
//             nama_satuan: satuanTerpilih.nama_satuan,
//             rasio_ke_pcs: rasioKePcs,
//             harga_satuan: hargaSatuanBaru,
//             diskon_distributor_rp: diskonRp,
//             subtotal: hargaNett * jumlah
//           };
//         }
//         return item;
//       })
//     }));
//   }

//   // ==========================================
//   // 2. HANDLER EDIT HARGA BELI PER SATUAN
//   // ==========================================
//   function harga_satuan_belanja(e, itemBelanjaan) {
//     const angkaMurni = e.target.value.replace(/\D/g, "");
//     const hargaBaru = angkaMurni ? Number(angkaMurni) : 0;

//     setDataInputBarang((prev) => ({
//       ...prev,
//       ListPesanan: prev.ListPesanan.map((item) => {
//         if (item.kode_barang === itemBelanjaan.kode_barang) {
//           const jumlah = Number(item.jumlah || 0);
//           const persentase = Number(item.persentase_diskon_distributor || 0);
//           const diskonRp = Math.round((hargaBaru * persentase) / 100);
//           const hargaNett = Math.max(0, hargaBaru - diskonRp);

//           return {
//             ...item,
//             harga_satuan: hargaBaru,
//             diskon_distributor_rp: diskonRp,
//             subtotal: hargaNett * jumlah
//           };
//         }
//         return item;
//       })
//     }));
//   }

//   // ==========================================
//   // 2b. HANDLER DISKON DISTRIBUTOR (PERSEN %)
//   // ==========================================
//   function ubahDiskonPersen(e, itemBelanjaan) {
//     const val = e.target.value;
//     const persenBaru = val === "" ? "" : Number(val);

//     setDataInputBarang((prev) => ({
//       ...prev,
//       ListPesanan: prev.ListPesanan.map((item) => {
//         if (item.kode_barang === itemBelanjaan.kode_barang) {
//           const harga = Number(item.harga_satuan || 0);
//           const jumlah = Number(item.jumlah || 0);
//           const p = Number(persenBaru || 0);
//           const diskonRp = Math.round((harga * p) / 100);
//           const hargaNett = Math.max(0, harga - diskonRp);

//           return {
//             ...item,
//             persentase_diskon_distributor: persenBaru,
//             diskon_distributor_rp: diskonRp,
//             subtotal: hargaNett * jumlah
//           };
//         }
//         return item;
//       })
//     }));
//   }

//   // ==========================================
//   // 2c. HANDLER DISKON DISTRIBUTOR (NOMINAL RP)
//   // ==========================================
//   function ubahDiskonRp(e, itemBelanjaan) {
//     const angkaMurni = e.target.value.replace(/\D/g, "");
//     const diskonRpBaru = angkaMurni ? Number(angkaMurni) : 0;

//     setDataInputBarang((prev) => ({
//       ...prev,
//       ListPesanan: prev.ListPesanan.map((item) => {
//         if (item.kode_barang === itemBelanjaan.kode_barang) {
//           const harga = Number(item.harga_satuan || 0);
//           const jumlah = Number(item.jumlah || 0);
//           const persenSesuaian = harga > 0 ? Number(((diskonRpBaru / harga) * 100).toFixed(2)) : 0;
//           const hargaNett = Math.max(0, harga - diskonRpBaru);

//           return {
//             ...item,
//             diskon_distributor_rp: diskonRpBaru,
//             persentase_diskon_distributor: persenSesuaian,
//             subtotal: hargaNett * jumlah
//           };
//         }
//         return item;
//       })
//     }));
//   }

//   // ==========================================
//   // 3. HANDLER EDIT QTY BELANJA
//   // ==========================================
//   function tambah_jumlah_belanjaan(e, itemBelanjaan) {
//     const inputVal = e.target.value;
//     const jumlahBaru = inputVal === "" ? "" : Number(inputVal);

//     setDataInputBarang((prev) => ({
//       ...prev,
//       ListPesanan: prev.ListPesanan.map((item) => {
//         if (item.kode_barang === itemBelanjaan.kode_barang) {
//           const harga = Number(item.harga_satuan || 0);
//           const qty = Number(jumlahBaru || 0);
//           const diskonRp = Number(item.diskon_distributor_rp || 0);
//           const hargaNett = Math.max(0, harga - diskonRp);

//           return {
//             ...item,
//             jumlah: jumlahBaru,
//             subtotal: hargaNett * qty
//           };
//         }
//         return item;
//       })
//     }));
//   }

//   // ==========================================
//   // 3b. HANDLER BONUS FLEKSIBEL (QTY & SATUAN BONUS)
//   // ==========================================
//   function ubah_bonus_belanjaan(e, itemBelanjaan) {
//     const inputVal = e.target.value;
//     const bonusBaru = inputVal === "" ? "" : Math.max(0, Math.floor(Number(inputVal)));

//     setDataInputBarang((prev) => ({
//       ...prev,
//       ListPesanan: prev.ListPesanan.map((item) =>
//         item.kode_barang === itemBelanjaan.kode_barang
//           ? { ...item, qty_bonus: bonusBaru }
//           : item
//       )
//     }));
//   }

//   function handleSatuanBonusChange(idSatuanBonus, itemBelanjaan) {
//     const satuanBonusTerpilih = itemBelanjaan.list_satuan?.find(
//       (s) => String(s.id_satuan || s.id || s.nama_satuan) === String(idSatuanBonus)
//     );

//     if (!satuanBonusTerpilih) return;

//     const rasioBonusBaru = Number(satuanBonusTerpilih.rasio_ke_pcs || satuanBonusTerpilih.jumlah_konversi || 1);

//     setDataInputBarang((prev) => ({
//       ...prev,
//       ListPesanan: prev.ListPesanan.map((item) => {
//         if (item.kode_barang === itemBelanjaan.kode_barang) {
//           return {
//             ...item,
//             id_satuan_bonus: satuanBonusTerpilih.id_satuan || satuanBonusTerpilih.id || satuanBonusTerpilih.nama_satuan,
//             nama_satuan_bonus: satuanBonusTerpilih.nama_satuan,
//             rasio_bonus_ke_pcs: rasioBonusBaru
//           };
//         }
//         return item;
//       })
//     }));
//   }

//   // ==========================================
//   // 4. HANDLER HAPUS ITEM
//   // ==========================================
//   function hapusItem(itemBarangBelanja) {
//     setDataInputBarang((prev) => ({
//       ...prev,
//       ListPesanan: prev.ListPesanan.filter((item) => item.kode_barang !== itemBarangBelanja.kode_barang || item?.nama_barang !== itemBarangBelanja?.nama_barang)
//     }));
//   }

//   // ==========================================
//   // 4b. [HUTANG SUPPLIER] HANDLER PEMBAYARAN TOKO
//   // ==========================================
//   function ubahDibayar(e) {
//     const angkaMurni = e.target.value.replace(/\D/g, "").slice(0, 12);
//     setFaktur((prev) => ({ ...prev, dibayar: angkaMurni === "" ? "" : Number(angkaMurni) }));
//   }

//   function bayarLunas() {
//     setFaktur((prev) => ({ ...prev, dibayar: totalDenganPpn, jatuh_tempo: "" }));
//   }

//   function hutangPenuh() {
//     setFaktur((prev) => ({ ...prev, dibayar: 0 }));
//   }

//   function ubahJatuhTempo(e) {
//     const nilai = e.target.value;
//     setFaktur((prev) => ({ ...prev, jatuh_tempo: nilai }));
//   }

//   // ==========================================
//   // 5. PROSES SIMPAN TRANSAKSI BELANJA
//   // ==========================================
//   async function proses() {
//     if (!dataInputBarang?.ListPesanan || dataInputBarang.ListPesanan.length === 0) {
//       return alert('List pesanan belanja masih kosong!');
//     }

//     const adaYangKosong = dataInputBarang.ListPesanan.some((item) => {
//       const jumlah = Number(item.jumlah);
//       const harga = Number(item.harga_satuan);
//       if (item.is_bonus_luar || (harga === 0 && jumlah === 0 && Number(item.qty_bonus) > 0)) {
//         return false;
//       }
//       return isNaN(jumlah) || jumlah <= 0 || isNaN(harga) || harga <= 0;
//     });

//     if (adaYangKosong) {
//       return alert('Setiap barang belanja wajib memiliki Jumlah (Qty) dan Harga Beli lebih dari 0!');
//     }

//     const bonusTidakValid = dataInputBarang.ListPesanan.some((item) => {
//       const b = Number(item.qty_bonus || 0);
//       return isNaN(b) || b < 0 || !Number.isInteger(b);
//     });
//     if (bonusTidakValid) {
//       return alert('Bonus harus angka bulat 0 atau lebih!');
//     }

//     const itemTanpaSatuan = dataInputBarang.ListPesanan.find(
//       (item) => !item.id_satuan && !item.nama_satuan && item?.status == 'RESTOK'
//     );
//     if (itemTanpaSatuan) {
//       return alert(`Satuan beli untuk "${itemTanpaSatuan.nama_barang || itemTanpaSatuan.kode_barang}" belum terpilih!`);
//     }

//     if (!Number.isInteger(dibayarAngka) || dibayarAngka < 0) {
//       return alert('Nominal dibayar harus angka bulat 0 atau lebih!');
//     }
//     if (dibayarAngka > totalDenganPpn) {
//       return alert(`Nominal dibayar (Rp ${dibayarAngka.toLocaleString('id-ID')}) tidak boleh melebihi total belanja (Rp ${totalDenganPpn.toLocaleString('id-ID')})!`);
//     }

//     const jatuhTempoKirim = sisaHutang > 0 ? String(faktur.jatuh_tempo || '').trim() : '';
//     if (jatuhTempoKirim !== '') {
//       if (!/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempoKirim) || Number.isNaN(new Date(jatuhTempoKirim).getTime())) {
//         return alert('Format jatuh tempo tidak valid!');
//       }
//       const tglBelanja10 = String(faktur.tanggal_belanja || '').slice(0, 10);
//       if (/^\d{4}-\d{2}-\d{2}$/.test(tglBelanja10) && jatuhTempoKirim < tglBelanja10) {
//         return alert('Jatuh tempo tidak boleh sebelum tanggal belanja!');
//       }
//     }

//     if (sisaHutang > 0) {
//       const lanjut = window.confirm(`Toko masih berhutang Rp ${sisaHutang.toLocaleString('id-ID')} ke supplier. Lanjutkan simpan?`);
//       if (!lanjut) return;
//     }

//     const payloadListPesanan = dataInputBarang.ListPesanan.map((item) => {
//       const def = item.list_satuan?.[0];
//       const idSat = item.id_satuan || def?.id_satuan || def?.id || def?.nama_satuan;
//       const idSatBonus = item.id_satuan_bonus || idSat;
//       return {
//         ...item,
//         id_satuan: idSat,
//         nama_satuan: item.nama_satuan || def?.nama_satuan,
//         rasio_ke_pcs: item.rasio_ke_pcs || Number(def?.rasio_ke_pcs || def?.jumlah_konversi || 1),
//         persentase_diskon_distributor: Number(item.persentase_diskon_distributor || 0),
//         diskon_distributor_rp: Number(item.diskon_distributor_rp || 0),
//         qty_bonus: Number(item.qty_bonus || 0),
//         id_satuan_bonus: idSatBonus,
//         nama_satuan_bonus: item.nama_satuan_bonus || item.nama_satuan || def?.nama_satuan,
//         rasio_bonus_ke_pcs: item.rasio_bonus_ke_pcs || Number(item.rasio_ke_pcs || 1)
//       };
//     });

//     try {
//       setLoading(prev => ({ ...prev, loadingRequest: true }));
//       const API_BELANJA_POST = '/api-be/SERVER_BELANJA_BARANG/BELANJA_BARANG';
//       const ress = await axios.post(API_BELANJA_POST, {
//         faktur: { ...faktur, dibayar: dibayarAngka, jatuh_tempo: jatuhTempoKirim },
//         ListPesanan: payloadListPesanan,
//       });

//       tampilkanToast(ress.data.message, 'success');

//       setFaktur((prev) => ({
//         ...prev,
//         no_faktur: '',
//         diskon_faktur: 0,
//         tanggal_belanja: '',
//         dataSupplier: null,
//         dibayar: '',
//         jatuh_tempo: '',
//       }));

//       setDataInputBarang((prev) => ({
//         ...prev,
//         ListPesanan: [],
//         ItemBarang: [],
//       }));

//       setInputCariSuplier('');
//       alert('Transaksi Belanja Berhasil Disimpan!');

//     } catch (err) {
//       tampilkanToast(err?.response?.data?.message, 'error');

//       if (err?.response?.status == 401 || err?.response?.status == 403) {
//         setLoading(prev => ({ ...prev, timeout: true }));
//         return;
//       }

//       alert(err?.response?.data?.message || 'Terjadi kesalahan sistem');

//     } finally {
//       setLoading(prev => ({ ...prev, loadingRequest: false }));
//     }
//   }

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

//   const subtotalSeluruhnya = dataInputBarang.ListPesanan?.reduce((acc, item) => {
//     const harga = Number(item.harga_satuan || 0);
//     const diskonRp = Number(item.diskon_distributor_rp || 0);
//     const hargaNett = Math.max(0, harga - diskonRp);
//     const qty = Number(item.jumlah || 0);
//     return acc + (hargaNett * qty);
//   }, 0) || 0;

//   const totalAkhir = Math.max(0, subtotalSeluruhnya - (Number(faktur.diskon_faktur) || 0));
//   const ppnPersen = parseFloat(String(faktur.ppn ?? '').replace('%', '').replace(',', '.')) || 0;
//   const ppnNominal = Math.round((totalAkhir * ppnPersen) / 100);
//   const totalDenganPpn = totalAkhir + ppnNominal;
//   const dibayarAngka = Number(faktur.dibayar) || 0;
//   const sisaHutang = Math.max(0, totalDenganPpn - dibayarAngka);
//   const dibayarMelebihi = dibayarAngka > totalDenganPpn;
//   const tanggalMinJatuhTempo = /^\d{4}-\d{2}-\d{2}/.test(String(faktur.tanggal_belanja || ''))
//     ? String(faktur.tanggal_belanja).slice(0, 10)
//     : undefined;

//   if (loading.timeout) {
//     return <TimeoutNotif isActive={true} />;
//   }

//   return (
//     <main className="w-full max-w-7xl mx-auto px-3 py-4 sm:p-6 lg:p-8 bg-slate-100 min-h-screen font-sans space-y-6 pb-32">
      
//       {/* HEADER SECTION */}
//       <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-4">
//         <div className="min-w-0">
//           <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
//             Daftar Belanja
//           </h2>
//           <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium leading-snug">
//             Periksa item, satuan, bonus & harga sebelum simpan
//           </p>
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             type="button"
//             onClick={() => setIsModalOpen(true)}
//             className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
//           >
//             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
//               <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
//             </svg>
//             <span>+ Cari & Tambah Barang</span>
//           </button>

//           <span className="text-xs sm:text-base bg-indigo-50 text-indigo-700 font-extrabold px-3.5 py-2 rounded-2xl shrink-0 border border-indigo-100/80">
//             {dataInputBarang.ListPesanan?.length || 0} Item
//           </span>
//         </div>
//       </div>

//       {/* LIST STATE */}
//       {!dataInputBarang.ListPesanan || dataInputBarang.ListPesanan.length === 0 ? (
//         <div className=" bg-white border-2 border-dashed border-slate-300 rounded-3xl p-10 sm:p-16 text-center">
//           <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto text-2xl font-black mb-4">
//             0
//           </div>
//           <p className="text-lg font-bold text-slate-700">Belum ada barang di daftar belanja</p>
//           <p className="text-sm sm:text-base text-slate-500 mt-1">Cari dan pilih produk di atas untuk menambahkan</p>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {dataInputBarang.ListPesanan.map((item, index) => {
//             const harga = Number(item.harga_satuan) || 0;
//             const diskonRp = Number(item.diskon_distributor_rp) || 0;
//             const hargaNett = Math.max(0, harga - diskonRp);
//             const qty = Number(item.jumlah) || 0;
//             const subtotal = hargaNett * qty;

//             const rasioUtama = getRasioAktif(item);
//             const rasioBonus = getRasioBonus(item);
//             const bonus = Number(item.qty_bonus) || 0;
//             const totalPcsMasuk = (qty * rasioUtama) + (bonus * rasioBonus);

//             return (
//               <div
//                 key={item.kode_barang || index}
//                 className={` ${item.is_bonus_luar ? 'bg-purple-50':'bg-white'}  min-w-full p-4 sm:p-6 w-full rounded-3xl border border-slate-200/90 shadow-sm space-y-4`}
//               >
//                 {/* CONTAINER CARD UTAMA */}
//                 <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  
//                   {/* BAGIAN KIRI: Info Barang, Satuan, Harga Satuan, & Bonus */}
//                   <div className="space-y-3.5 flex-1 min-w-0">
                    
//                     {/* Kode Barang Badge */}
//                     <div className="flex items-center gap-2">
//                       <span className="inline-block text-xs font-mono font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
//                         #{item.kode_barang}
//                       </span>
//                       {item.is_bonus_luar && (
//                         <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-800 rounded-md border border-violet-200 uppercase">
//                           Bonus Luar
//                         </span>
//                       )}
//                     </div>

//                     {/* Nama Barang */}
//                     <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl leading-snug break-words">
//                       {item.nama_barang}
//                     </h3>

//                     {/* Status / Stok Badge */}
//                     <div>
//                       <span
//                         className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
//                           item.status === 'BARANG BARU'
//                             ? 'bg-amber-50 text-amber-700 border-amber-200'
//                             : 'bg-emerald-50 text-emerald-700 border-emerald-200'
//                         }`}
//                       >
//                         <span
//                           className={`w-2 h-2 rounded-full ${
//                             item.status === 'BARANG BARU' ? 'bg-amber-500' : 'bg-emerald-500'
//                           }`}
//                         ></span>
//                         {item.status || ' RESTOK'}
//                       </span>
//                     </div>

//                     {/* Dropdown Satuan & Input Harga Beli */}
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
//                       <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1`}>
//                         <label className="text-xs font-extrabold text-slate-600 block">Satuan Beli</label>
//                         <select
//                           value={
//                             String(
//                               item.id_satuan ??
//                               item.list_satuan?.[0]?.id_satuan ??
//                               item.list_satuan?.[0]?.id ??
//                               item.list_satuan?.[0]?.nama_satuan ??
//                               ''
//                             )
//                           }
//                           onChange={(e) => ganti_satuan_belanja(e.target.value, item)}
//                           className="w-full h-12 px-3 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
//                         >
//                           {item.list_satuan?.map((s, idx) => (
//                             <option
//                               key={s.id_satuan || s.id || `${s.nama_satuan}-${idx}`}
//                               value={s.id_satuan || s.id || s.nama_satuan}
//                             >
//                               {s.nama_satuan} ({s.rasio_ke_pcs || s.jumlah_konversi || 1} PCS)
//                             </option>
//                           ))}
//                         </select>
//                       </div>

//                       <div className={` ${item.is_bonus_luar ? 'hidden':'block'} space-y-1`}>
//                         <label className="text-xs font-extrabold text-slate-600 block">Harga Beli Satuan</label>
//                         <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50 focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-600">
//                           <span className="bg-slate-200 px-3 h-12 flex items-center text-xs text-slate-700 font-extrabold border-r border-slate-300">
//                             Rp
//                           </span>
//                           <input
//                             value={
//                               item?.harga_satuan
//                                 ? Number(item.harga_satuan).toLocaleString('id-ID')
//                                 : ''
//                             }
//                             onChange={(e) => harga_satuan_belanja(e, item)}
//                             placeholder="0"
//                             type="text"
//                             inputMode="numeric"
//                             className="w-full h-12 px-3 text-base font-black text-slate-900 outline-none bg-transparent"
//                           />
//                         </div>
//                       </div>
//                     </div>

//                     {/* Box Bonus Gratis (Dengan Qty & Dropdown Satuan Bonus Fleksibel) */}
//                     <div className={`${item.ada_fitur_bonus == 1 ? 'block':'hidden'} p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3`}>
//                       <div className="flex items-center gap-2 flex-wrap">
//                         <span className="text-xs font-extrabold text-purple-900">Bonus:</span>
//                         <input
//                           value={item.qty_bonus ?? ''}
//                           onChange={(e) => ubah_bonus_belanjaan(e, item)}
//                           type="number"
//                           inputMode="numeric"
//                           min="0"
//                           placeholder="0"
//                           className="w-16 h-10 px-2 border border-purple-300 rounded-xl text-center text-sm font-black text-slate-900 bg-white outline-none focus:ring-2 focus:ring-purple-400"
//                         />
//                         <select
//                           value={
//                             String(
//                               item.id_satuan_bonus ??
//                               item.id_satuan ??
//                               item.list_satuan?.[0]?.id_satuan ??
//                               item.list_satuan?.[0]?.id ??
//                               item.list_satuan?.[0]?.nama_satuan ??
//                               ''
//                             )
//                           }
//                           onChange={(e) => handleSatuanBonusChange(e.target.value, item)}
//                           className="h-10 px-2 border border-purple-300 rounded-xl text-xs font-bold text-purple-900 bg-white outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
//                         >
//                           {item.list_satuan?.map((s, idx) => (
//                             <option
//                               key={s.id_satuan || s.id || `${s.nama_satuan}-${idx}`}
//                               value={s.id_satuan || s.id || s.nama_satuan}
//                             >
//                               {s.nama_satuan} ({s.rasio_ke_pcs || s.jumlah_konversi || 1} PCS)
//                             </option>
//                           ))}
//                         </select>
//                       </div>
//                       <span className="text-xs font-extrabold text-purple-700 bg-purple-100/90 px-3 py-1 rounded-full">
//                         Gratis
//                       </span>
//                     </div>
//                   </div>

//                   {/* BAGIAN KANAN: Qty, Disk (%), Disk (Rp), Subtotal & Tombol Hapus */}
//                   <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 sm:gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    
//                     {/* Input Qty */}
//                     <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1 text-center`}>
//                       <label className="text-xs font-extrabold text-slate-500 block">Qty</label>
//                       <input
//                         value={item.jumlah || ''}
//                         onChange={(e) => tambah_jumlah_belanjaan(e, item)}
//                         type="number"
//                         inputMode="numeric"
//                         placeholder="0"
//                         min="0"
//                         className="w-16 sm:w-20 h-12 border border-slate-300 rounded-xl text-center text-base font-black text-slate-900 outline-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600"
//                       />
//                     </div>

//                     {/* Input Disk (%) */}
//                     <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1 text-center`}>
//                       <label className="text-xs font-extrabold text-rose-500 block">Disk (%)</label>
//                       <input
//                         value={item.persentase_diskon_distributor ?? ''}
//                         onChange={(e) => ubahDiskonPersen(e, item)}
//                         type="number"
//                         inputMode="decimal"
//                         step="0.01"
//                         placeholder="0"
//                         className="w-16 sm:w-20 h-12 border border-rose-200 bg-rose-50/50 rounded-xl text-center text-base font-black text-rose-900 outline-none focus:ring-2 focus:ring-rose-400"
//                       />
//                     </div>

//                     {/* Input Disk (Rp) */}
//                     <div className={`${item.is_bonus_luar ? 'hidden':'block'} space-y-1 text-center`}>
//                       <label className="text-xs font-extrabold text-rose-500 block">Disk (Rp)</label>
//                       <input
//                         value={
//                           item?.diskon_distributor_rp
//                             ? Number(item.diskon_distributor_rp).toLocaleString('id-ID')
//                             : ''
//                         }
//                         onChange={(e) => ubahDiskonRp(e, item)}
//                         placeholder="0"
//                         type="text"
//                         inputMode="numeric"
//                         className="w-24 sm:w-28 h-12 px-2 border border-rose-200 bg-rose-50/50 rounded-xl text-center text-base font-black text-rose-900 outline-none focus:ring-2 focus:ring-rose-400"
//                       />
//                     </div>

//                     {/* Subtotal */}
//                     <div className="space-y-1 text-right px-1 min-w-[110px]">
//                       <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
//                         SUBTOTAL
//                       </span>
//                       <span className="text-lg sm:text-xl font-black text-slate-900 block whitespace-nowrap">
//                         Rp {subtotal.toLocaleString('id-ID')}
//                       </span>
//                       <span className="bg-green-50 text-green-900 text-[11px] font-extrabold block">
//                         (+{totalPcsMasuk} PCS Masuk)
//                       </span>
//                     </div>

//                     {/* Tombol Hapus */}
//                     <button
//                       type="button"
//                       onClick={() => hapusItem(item)}
//                       aria-label="Hapus item"
//                       className="h-12 px-3.5 flex items-center justify-center gap-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-xl border border-rose-200 transition-all cursor-pointer text-sm font-extrabold shrink-0"
//                     >
//                       <span>🗑</span> Hapus
//                     </button>
//                   </div>

//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* PEMBAYARAN TOKO SECTION */}
//       {dataInputBarang.ListPesanan?.length > 0 && (
//         <section className="bg-white border border-slate-200/90 rounded-3xl shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
//           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
//             <div className="min-w-0">
//               <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
//                 Pembayaran ke Supplier
//               </h3>
//               <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
//                 Isi nominal yang dibayar toko sekarang. Sisanya dicatat sebagai hutang.
//               </p>
//             </div>
//             <div>
//               <span
//                 className={`inline-block shrink-0 text-xs sm:text-sm font-extrabold px-4 py-1.5 rounded-xl border-2 ${
//                   sisaHutang > 0 && !dibayarMelebihi
//                     ? 'bg-amber-50 text-amber-800 border-amber-300'
//                     : 'bg-emerald-50 text-emerald-800 border-emerald-300'
//                 }`}
//               >
//                 {sisaHutang > 0 && !dibayarMelebihi ? 'HUTANG' : 'LUNAS'}
//               </span>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             <div className="lg:col-span-2 space-y-3">
//               <label className="text-sm font-extrabold text-slate-800 block">
//                 Dibayar Toko Sekarang
//               </label>
//               <div
//                 className={`flex items-center border-2 rounded-2xl overflow-hidden bg-white h-14 sm:h-16 ${
//                   dibayarMelebihi
//                     ? 'border-rose-500 ring-4 ring-rose-500/20'
//                     : 'border-slate-300 focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:border-emerald-600'
//                 }`}
//               >
//                 <span className="bg-slate-100 px-4 h-full flex items-center text-base sm:text-lg text-slate-700 font-extrabold border-r-2 border-slate-300">
//                   Rp
//                 </span>
//                 <input
//                   value={
//                     faktur.dibayar !== '' && faktur.dibayar != null
//                       ? Number(faktur.dibayar).toLocaleString('id-ID')
//                       : ''
//                   }
//                   onChange={ubahDibayar}
//                   inputMode="numeric"
//                   placeholder="0"
//                   type="text"
//                   className="w-full h-full px-3 text-xl sm:text-2xl font-black text-slate-900 outline-none bg-transparent"
//                 />
//               </div>
//               {dibayarMelebihi && (
//                 <p className="text-sm text-rose-600 font-bold">
//                   Melebihi total belanja (Rp {totalDenganPpn.toLocaleString('id-ID')}).
//                 </p>
//               )}
//               <div className="grid grid-cols-2 gap-3 pt-1">
//                 <button
//                   type="button"
//                   onClick={bayarLunas}
//                   className="h-12 sm:h-14 text-sm sm:text-base font-extrabold px-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
//                 >
//                   Bayar Lunas
//                 </button>
//                 <button
//                   type="button"
//                   onClick={hutangPenuh}
//                   className="h-12 sm:h-14 text-sm sm:text-base font-extrabold px-4 rounded-2xl border-2 border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
//                 >
//                   Hutang Semua
//                 </button>
//               </div>
//             </div>

//             <div className="space-y-3">
//               <label className="text-sm font-extrabold text-slate-800 block">
//                 Jatuh Tempo <span className="font-normal text-slate-500">(opsional)</span>
//               </label>
//               <input
//                 type="date"
//                 value={faktur.jatuh_tempo || ''}
//                 min={tanggalMinJatuhTempo}
//                 onChange={ubahJatuhTempo}
//                 disabled={sisaHutang <= 0}
//                 className="w-full h-14 sm:h-16 px-4 border-2 border-slate-300 rounded-2xl text-base sm:text-lg font-bold text-slate-900 outline-none bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
//               />
//             </div>
//           </div>

//           {/* SUMMARY BOX & TOMBOL PROSES */}
//           <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
//             <div className="space-y-1">
//               <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
//                 Total Belanja + PPN:
//               </span>
//               <span className="text-2xl sm:text-3xl font-black text-slate-900 block">
//                 Rp {totalDenganPpn.toLocaleString('id-ID')}
//               </span>
//               {sisaHutang > 0 && (
//                 <span className="text-xs font-bold text-amber-700 block">
//                   Sisa Hutang: Rp {sisaHutang.toLocaleString('id-ID')}
//                 </span>
//               )}
//             </div>

//             <button
//               type="button"
//               onClick={proses}
//               className="h-14 sm:h-16 px-8 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-base sm:text-lg rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
//             >
//               <span>SIMPAN TRANSAKSI BELANJA</span>
//             </button>
//           </div>
//         </section>
//       )}

//       {/* ========================================== */}
//       {/* FIXED INSET-0 POPUP MODAL PENCARIAN BARANG */}
//       {/* ========================================== */}
//       {isModalOpen && (
//         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
//           <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            
//             {/* Modal Header */}
//             <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
//               <div>
//                 <h3 className="text-base sm:text-lg font-bold text-slate-900">
//                   Cari & Tambah Barang Belanja
//                 </h3>
//                 <p className="text-xs text-slate-500 mt-0.5">
//                   Pilih barang untuk dimasukkan sebagai item belanja atau bonus
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={() => {
//                   setIsModalOpen(false);
//                   setHasilCari([]);
//                   setInputCari('');
//                 }}
//                 className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer font-bold"
//               >
//                 ✕
//               </button>
//             </div>

//             {/* Form Input Cari dalam Modal */}
//             <div className="p-4 border-b border-slate-100 bg-white shrink-0">
//               <div className="flex gap-2">
//                 <input
//                   type="text"
//                   autoFocus
//                   placeholder="Ketik nama atau kode barang..."
//                   value={inputCari}
//                   onChange={(e) => setInputCari(e.target.value)}
//                   onKeyDown={(e) => {
//                     if (e.key === 'Enter') {
//                       e.preventDefault();
//                       handleCariBarang();
//                     }
//                   }}
//                   className="flex-1 h-11 px-3.5 text-sm font-semibold border border-slate-300 rounded-xl bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
//                 />
//                 <button
//                   type="button"
//                   onClick={handleCariBarang}
//                   disabled={isSearching}
//                   className="px-6 h-11 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center"
//                 >
//                   {isSearching ? 'Mencari...' : 'Cari'}
//                 </button>
//               </div>
//             </div>

//             {/* List Hasil Pencarian dalam Modal */}
//             <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
//               {hasilCari.length > 0 ? (
//                 hasilCari.map((barang, idx) => (
//                   <div
//                     key={barang.kode_barang || idx}
//                     className="py-3 flex items-center justify-between gap-3 hover:bg-indigo-50/50 px-2 rounded-xl transition-colors"
//                   >
//                     <div className="min-w-0">
//                       <div className="flex items-center gap-2">
//                         <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
//                           {barang.kode_barang}
//                         </span>
//                         <span className="text-xs font-semibold text-emerald-700">
//                           Stok: {barang.stok_pcs || 0} PCS
//                         </span>
//                       </div>
//                       <h4 className="font-bold text-slate-800 text-sm mt-1 truncate">
//                         {barang.nama_barang}
//                       </h4>
//                     </div>

//                     <div className="flex items-center gap-2 shrink-0">
//                       <button
//                         type="button"
//                         onClick={() => tambahBarangBonus(barang)}
//                         className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
//                       >
//                         + Bonus
//                       </button>
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 <div className="py-12 text-center text-slate-400 space-y-1">
//                   <p className="text-sm font-semibold">
//                     {isSearching ? 'Sedang memuat data...' : 'Ketik nama barang dan klik Cari'}
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Modal Footer */}
//             <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
//               <button
//                 type="button"
//                 onClick={() => {
//                   setIsModalOpen(false);
//                   setHasilCari([]);
//                   setInputCari('');
//                 }}
//                 className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
//               >
//                 Batal
//               </button>
//             </div>

//           </div>
//         </div>
//       )}

//     </main>
//   );
// }