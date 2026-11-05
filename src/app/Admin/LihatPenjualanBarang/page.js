'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';
import { CEK_HAK_AKSES } from '@/app/Hooks/Hooks';
import { EditFaktur } from './components/EditFaktur';

/* =============================================================================
 * KONFIGURASI
 * ========================================================================== */

/** Jumlah faktur per halaman API. Dipakai juga untuk menentukan `hasMore`. */
const PAGE_SIZE = 10;

/**
 * Konfigurasi kertas cetak (Epson LX-300+II, continuous form 9.5" x 5.5").
 *
 * Nilai awal diukur dari hasil cetak contoh:
 *  - teks mulai ±12 mm dari tepi kiri kertas
 *  - tabel berakhir ±224 mm dari tepi kiri kertas
 *  - ukuran huruf ±9pt
 *
 * KALAU MASIH ADA YANG KEPOTONG / MAU DISESUAIKAN, ubah angka di sini:
 *  - Kepotong di KANAN  -> kecilkan `contentWidthMm` (208 -> 204 -> 200)
 *  - Kepotong di KIRI   -> besarkan `marginLeftMm` (12 -> 15)
 *  - Kepotong di ATAS   -> besarkan `marginTopMm`
 *  - Kepotong di BAWAH  -> besarkan `marginBottomMm` atau kecilkan `fontSizePt`
 *  - Teks mau lebih besar -> naikkan `fontSizePt` (9 -> 10)
 *
 * Paper Size di driver Epson harus 9.5 x 5.5 in (Half Page).
 * Di dialog print Chrome: Margins = None, Scale = 100, Headers and footers = off.
 */
// const PRINT_CONFIG = Object.freeze({
//   paperWidthMm: 241.3, // 9.5 inch
//   paperHeightMm: 139.7, // 5.5 inch
//   marginLeftMm: 5,
//   marginTopMm: 5,
//   marginBottomMm: 5,
//   contentWidthMm: 208, // lebar area faktur yang benar-benar dicetak
//   fontSizePt: 9,
// });

const PRINT_CONFIG = Object.freeze({
  paperWidthMm: 210,    // Mengikuti lebar kertas Fanfold kamu (210 mm / 21 cm)
  paperHeightMm: 305,   // Mengikuti tinggi kertas Fanfold kamu (305 mm / 30.5 cm)
  marginLeftMm: 3,     // Margin kiri
  marginRightMm: 3,    // Margin kanan
  marginTopMm: 5,      // Margin atas
  marginBottomMm: 5,   // Margin bawah
  contentWidthMm: 195, // LEBAR AMAN KONTEN: Maksimal 195 mm agar jarum printer tidak nabrak batas kanan!
  fontSizePt: 8.7,     // Ukuran font aman agar tabel muat sempurna
});

/* =============================================================================
 * HELPER
 * ========================================================================== */

/** Angka -> kalimat terbilang (Indonesia). Contoh: 46330 -> "Empat Puluh Enam Ribu Tiga Ratus Tiga Puluh". */
function terbilang(angka) {
  const n = Math.abs(Math.floor(Number(angka) || 0));
  if (n === 0) return 'Nol';

  const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  const convert = (x) => {
    if (x === 0) return '';
    if (x < 12) return huruf[x];
    if (x < 20) return `${huruf[x - 10]} Belas`;
    if (x < 100) return `${huruf[Math.floor(x / 10)]} Puluh ${convert(x % 10)}`.trim();
    if (x < 200) return `Seratus ${convert(x - 100)}`.trim();
    if (x < 1e3) return `${huruf[Math.floor(x / 100)]} Ratus ${convert(x % 100)}`.trim();
    if (x < 2e3) return `Seribu ${convert(x - 1e3)}`.trim();
    if (x < 1e6) return `${convert(Math.floor(x / 1e3))} Ribu ${convert(x % 1e3)}`.trim();
    if (x < 1e9) return `${convert(Math.floor(x / 1e6))} Juta ${convert(x % 1e6)}`.trim();
    if (x < 1e12) return `${convert(Math.floor(x / 1e9))} Milyar ${convert(x % 1e9)}`.trim();
    return `${convert(Math.floor(x / 1e12))} Triliun ${convert(x % 1e12)}`.trim();
  };

  return convert(n);
}

/** Format angka ke locale Indonesia, aman untuk null/undefined/NaN. */
const formatAngka = (value) => (Number(value) || 0).toLocaleString('id-ID');

/** Format tanggal "15 Okt 2026". Mengembalikan "-" jika kosong/tidak valid. */
function formatTanggal(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Syarat pembayaran dihitung dari selisih tanggal faktur & jatuh tempo, mis. "NET 12". */
function hitungSyaratPembayaran(tglFaktur, jatuhTempo) {
  if (!tglFaktur || !jatuhTempo) return '-';
  const start = new Date(tglFaktur);
  const end = new Date(jatuhTempo);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-';
  const selisihHari = Math.round((end - start) / 86400000);
  return selisihHari > 0 ? `NET ${selisihHari}` : '-';
}

/**
 * CSS khusus cetak.
 *
 * Prinsip:
 *  1. `@page` ukuran kertas eksplisit + margin 0 -> header/footer browser tidak muncul.
 *  2. Margin dibuat lewat padding; lebar area cetak PASTI (mm), tanpa transform/scale.
 *  3. Font ukuran pt tetap, tidak bergantung ukuran layar.
 *  4. Background dimatikan supaya tidak jadi pola titik-titik di printer dot matrix.
 *  5. Jarak vertikal dirapatkan supaya muat di tinggi kertas 5.5".
 */
function buildPageStyle(config) {
  const { paperWidthMm, paperHeightMm, marginLeftMm, marginTopMm, marginBottomMm, contentWidthMm, fontSizePt } = config;
  const marginRightMm = Math.max(paperWidthMm - marginLeftMm - contentWidthMm, 0);

  return `
    @page {
      size: ${paperWidthMm}mm ${paperHeightMm}mm;
      margin: 0;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${paperWidthMm}mm !important;
        height: auto !important;
        background: #fff !important;
      }

      .faktur-print-root {
        width: ${paperWidthMm}mm !important;
        min-width: 0 !important;
        max-width: none !important;
        margin: 0 !important;
        padding: ${marginTopMm}mm ${marginRightMm}mm ${marginBottomMm}mm ${marginLeftMm}mm !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        border: 0 !important;
        box-shadow: none !important;
      }

      .faktur-print-root,
      .faktur-print-root * {
        font-family: Arial, Tahoma, 'MS Sans Serif', sans-serif !important;
        font-size: ${fontSizePt}pt !important;
        line-height: 1.2 !important;
        color: #000 !important;
        background: transparent !important;
        box-shadow: none !important;
        -webkit-print-color-adjust: economy;
        print-color-adjust: economy;
        font-weight: 600 !important; /* Ketebalan sedang pas, tidak meleber */
      }

      .faktur-print-root .faktur-title   { font-size: ${fontSizePt + 6}pt !important; }
      .faktur-print-root .faktur-no      { font-size: ${fontSizePt + 3}pt !important; }
      .faktur-print-root .faktur-address { font-size: ${Math.max(fontSizePt - 1, 7)}pt !important; line-height: 1.15 !important; }
      .faktur-print-root .faktur-legend  { background: #fff !important; }

      /* Jarak vertikal dirapatkan khusus saat cetak */
      .faktur-print-root .faktur-header-gap  { margin-bottom: 3mm !important; }
      .faktur-print-root .faktur-section-gap { margin-top: 0 !important; margin-bottom: 2mm !important; }
      .faktur-print-root .faktur-bottom-stack > * + * { margin-top: 2mm !important; }
      .faktur-print-root .faktur-sign-area   { padding-top: 0 !important; }
      .faktur-print-root .faktur-sign-gap    { height: 9mm !important; }
      .faktur-print-root .faktur-keterangan  { min-height: 10mm !important; padding: 1mm 1.5mm !important; }

      .faktur-print-root table {
        width: 100% !important;
        table-layout: fixed !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
      }
      .faktur-print-root th,
      .faktur-print-root td {
        padding: 0.6mm 1.5mm !important;
        overflow-wrap: anywhere;
      }
      .faktur-print-root thead { display: table-header-group; }
      .faktur-print-root tr,
      .faktur-print-root .faktur-avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;
}

const PAGE_STYLE = buildPageStyle(PRINT_CONFIG);

/* =============================================================================
 * KOMPONEN: CARD FAKTUR
 * ========================================================================== */

const FakturPenjualanCard = memo(function FakturPenjualanCard({ faktur }) {
  const printRef = useRef(null);
  const [isOpenEditFaktur, setIsOpenEditFaktur] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const keteranganAwal = faktur.keterangan === 'Belum ada keterangan' ? '' : (faktur.keterangan || '');
  const [keterangan, setKeterangan] = useState(keteranganAwal);
  const [editKeterangan, setEditKeterangan] = useState(false);
  const [draft, setDraft] = useState(keteranganAwal);
  const batalRef = useRef(false);



  const simpanKeterangan = async () => {
    setEditKeterangan(false);

    if (batalRef.current) {
      batalRef.current = false;
      setDraft(keterangan);
      return;
    }

    const baru = draft.trim();
    if (baru === keterangan) return;

    const lama = keterangan;
    setKeterangan(baru);

    try {
      await axios.post('/api-be/SERVER_FAKTUR/UBAH_KETERANGAN_FAKTUR', {
        no_faktur: faktur.no_faktur,
        keterangan: baru,
      });
      alert('Berhasil edit keterangan!')
    } catch (error) {
      setKeterangan(lama);
      setDraft(lama);
      if (error?.response?.status === 403) {
        alert('Hanya admin yang boleh mengubah keterangan');
      } else {
        console.error('Gagal menyimpan keterangan:', error?.response?.data || error.message);
        alert('Gagal menyimpan keterangan');
      }
    }
  };




  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Faktur-Penjualan-${faktur.no_faktur}`,
    pageStyle: PAGE_STYLE,
    onPrintError: (location, error) => {
      console.error(`Gagal mencetak faktur (${location}):`, error);
    },
  });

  const editFaktur = useCallback((item) => {
    setIsOpenEditFaktur(true);
    setCurrentItem(item);
  }, []);

  // Hitung subtotal, diskon, PPN, dan total akhir
  const { totalBelanja, diskonFaktur, ppnPersen, ppnNominal, grandTotal } = useMemo(() => {
    const subtotal = faktur.items?.reduce((acc, item) => acc + (Number(item.total_harga) || 0), 0) || 0;
    const diskon = Number(faktur.diskon) || 0;
    const persen = Number(faktur.ppn) || 0; // <-- ganti kalau nama field PPN di API berbeda
    const dasar = subtotal - diskon;
    const nominal = Math.round((dasar * persen) / 100);
    return {
      totalBelanja: subtotal,
      diskonFaktur: diskon,
      ppnPersen: persen,
      ppnNominal: nominal,
      grandTotal: dasar + nominal,
    };
  }, [faktur.items, faktur.diskon, faktur.ppn]);

  const syaratPembayaran = hitungSyaratPembayaran(faktur.tgl_faktur, faktur.jatuhtempo_faktur);

  return (
    <div className="bg-white border border-gray-300 rounded-md shadow-md my-6 overflow-hidden">
      {/* Di layar kecil, faktur discroll horizontal supaya tata letaknya tidak rusak */}
      <div className="overflow-x-auto">
        {/* Area faktur: ini yang dicetak. Ukuran cetak diatur penuh oleh PAGE_STYLE */}
        <div
          ref={printRef}
          className="faktur-print-root min-w-[760px] p-6 sm:p-8 bg-white text-black font-mono text-[13px] leading-snug"
        >
          {/* Header Atas: Perusahaan & No SI/Faktur */}
          <div className="faktur-header-gap flex  items-start gap-35 mb-6">

            <div className="min-w-0">
              <h1 className="faktur-title text-4xl font-bold tracking-wide uppercase text-black">
                CV. PUTRA BAKTI PRATAMA
              </h1>
              <p className="faktur-address text-[11px] text-gray-800 leading-tight max-w-sm mt-1">
                Jl. Letjen Sutoyo No. 8 RT. 001 RW. 015<br />
                Kab. Brebes Jawa Tengah<br />
                Indonesia
              </p>
            </div>

            <div className="text-right min-w-0">
              <h2 className="faktur-no text-lg font-bold tracking-tight text-black break-all">
                No.{faktur.no_faktur}
              </h2>
            </div>
          </div>

          {/* Informasi Meta & Kepada / Tanggal / Sales */}
          <div className="faktur-section-gap flex flex-wrap gap-8 mb-4 text-[12px]">
            {/* Kolom Kiri: Kepada */}
            <div className="min-w-[180px] flex flex-col ">
              <div className="flex">
                <span className="font-semibold">Kepada :</span>
              </div>
              <div className="font-bold uppercase mt-0.5 break-words">
                {faktur.nama_pelanggan}
              </div>
              <div className='mt-2 flex gap-1 '>
                <p className='font-bold'>Alamat: </p>
                <p>{faktur.alamat_pelanggan || 'Belum ada alamat'}</p>
              </div>
            </div>

            {/* Kolom Tengah: Tanggal & Jatuh Tempo */}
            <div className="space-y-0.5">
              <div className="flex gap-2">
                <span className="font-semibold whitespace-nowrap min-w-[75px]">Tanggal:</span>
                <span className="whitespace-nowrap">{formatTanggal(faktur.tgl_faktur)}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold whitespace-nowrap min-w-[75px]">Jatuh Tempo:</span>
                <span className="whitespace-nowrap">{formatTanggal(faktur.jatuhtempo_faktur)}</span>
              </div>
            </div>

            {/* Kolom Kanan: Syarat Pembayaran, Pengiriman, Sales */}
            <div className="space-y-0.5 ml-2">
              <div className="flex gap-2">
                <span className="font-semibold whitespace-nowrap min-w-[10px]">Syarat Bayar:</span>
                <span className="uppercase whitespace-nowrap">{syaratPembayaran}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold whitespace-nowrap min-w-[10px]">Tgl Pengiriman:</span>
                <span className="whitespace-nowrap">{formatTanggal(faktur.tgl_pengiriman)}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-semibold whitespace-nowrap min-w-[10px]">Sales:</span>
                <span className="uppercase">{faktur.sales || '-'}</span>
              </div>
            </div>
          </div>

          {/* Tabel Barang */}
          {/* Tabel Barang */}
          <div className="faktur-section-gap max-w-157 mb-4 pl-0.5">
            <table className="w-full table-fixed border-separate border-spacing-0 border-t border-r border-black text-[25px]">
              <thead>
                <tr className="text-center font-bold text-[11px] leading-none">
                  <th className="border-l border-b border-black py-0.5 px-1 w-[14%] whitespace-nowrap tracking-tighter">Kode Barang</th>
                  <th className="border-l border-b border-black py-0.5 px-1 w-[34%] whitespace-nowrap tracking-tighter">Nama Barang</th>
                  <th className="border-l border-b border-black py-0.5 px-1 w-[10%] whitespace-nowrap tracking-tighter">Satuan</th>
                  <th className="border-l border-b border-black py-0.5 px-1 w-[15%] whitespace-nowrap tracking-tighter">@Harga</th>
                  <th className="border-l border-b border-black py-0.5 px-1 w-[15%] whitespace-nowrap tracking-tighter">Diskon</th>
                  <th className="border-l border-b border-black py-0.5 px-1 w-[16%] text-right whitespace-nowrap tracking-tighter">Total Harga</th>
                </tr>
              </thead>
              <tbody>
                {faktur.items?.map((item, idx) => {
                  // Cek apakah item ini barang bonus (harga = 0)
                  const isBonus = Number(item.harga_jual || 0) === 0 && Number(item.total_harga || 0) === 0;
                  const formatSatuan = (s) => (s === 'KARTON' ? 'KRT' : s === 'PACK' ? 'PK' : 'PCS');

                  return (
                    <tr
                      key={item.id_detail || idx}
                      role="button"
                      tabIndex={0}
                      onClick={() => editFaktur(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          editFaktur(item);
                        }
                      }}
                      className="hover:bg-gray-100 focus:bg-gray-100 focus:outline-none cursor-pointer"
                    >
                      {/* KODE BARANG */}
                      <td className="border-l border-b border-black py-1 px-2 font-mono break-words">
                        {item.kode_barang}
                      </td>

                      {/* NAMA BARANG */}
                      <td className="border-l border-b border-black py-1 px-2 uppercase font-medium break-words">
                        <div>{item.nama_barang}</div>
                      </td>

                      {/* QTY & SATUAN */}
                      <td className="border-l border-b border-black py-1 px-2 text-center uppercase">
                        {item.jumlah_keluar || item.jumlah || item?.qty_bonus} {formatSatuan(item.satuan)}
                      </td>

                      {/* JIKA BONUS: GABUNGKAN 3 KOLOM HARGA JADI 1 KOTAK TANPA GARIS PEMBATAS */}
                      {isBonus ? (
                        <td
                          colSpan={3}
                          className="border-l border-b border-black py-1 px-2 text-center font-bold tracking-widest"
                        >
                          BONUS
                        </td>
                      ) : (
                        <>
                          <td className="border-l border-b border-black py-1 px-2 text-right whitespace-nowrap">
                            {formatAngka(item.harga_jual)}
                          </td>
                          <td className="border-l border-b border-black py-1 px-2 text-[25px] text-center">
                            {formatAngka(item.diskon)}
                          </td>
                          <td className="border-l border-b border-black py-1 px-2 text-right font-medium whitespace-nowrap">
                            {formatAngka(item.total_harga)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* <hr className="w-full border-black my-2" /> */}
          </div>



          {/* Terbilang */}
          <div className="faktur-section-gap mb-3 mt-20 max-w-md text-[16px]">
            <span className="">Terbilang : </span>
            <span>{terbilang(grandTotal)} Rupiah</span>
          </div>

          {/* Section Bawah: Keterangan, Tanda Tangan & Total Box */}
          <div className="faktur-avoid-break max-w-sm mt-6 grid grid-cols-13 gap-13 items-start">
            {/* Sisi Kiri: Box Keterangan + Tanda Tangan */}
            <div className="faktur-bottom-stack col-span-7 max-w-sm space-y-6">
              {/* Box Keterangan */}
              {/* Box Keterangan */}
              <div
                className="faktur-keterangan border border-black p-2 min-h-[50px] relative"
                onClick={() => {
                  if (!editKeterangan) {
                    setDraft(keterangan);
                    setEditKeterangan(true);
                  }
                }}
                title="Klik untuk ubah keterangan"
              >
                <span className="faktur-legend absolute -top-2.5 left-2 bg-white px-1 text-[11px]">
                  Keterangan :
                </span>

                {editKeterangan ? (
                  <textarea
                    autoFocus
                    rows={2}
                    value={draft}
                    placeholder="Tulis keterangan..."
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={simpanKeterangan}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        batalRef.current = true;
                        e.target.blur();
                      }
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) e.target.blur();
                    }}
                    className="w-full text-[12px] break-words outline-none resize-none block"
                  />
                ) : (
                  <p className="text-[12px] break-words">{keterangan}</p>
                )}
              </div>

              {/* Area Tanda Tangan */}
              <div className="faktur-sign-area grid grid-cols-2 text-center text-[12px] pt-4">
                <div>
                  <p>Disiapkan Oleh</p>
                  <div className="faktur-sign-gap h-14" aria-hidden="true" />
                  <p className="font-bold uppercase break-words">({faktur.nama_admin || '..........'})</p>
                </div>
                <div>
                  <p>Penerima</p>
                  <div className="faktur-sign-gap h-14" aria-hidden="true" />
                  <p className="font-bold uppercase break-words">({faktur.nama_pelanggan || '..........'})</p>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Box Ringkasan Total */}
            {/* Sisi Kanan: Box Ringkasan Total */}
            <div className="col-span-5 flex justify-end">
              {/* Lebar dikunci w-[65mm] dan diberi ml-auto */}
              <table className="max-w-[65mm] border-collapse border border-black text-[12px] ml-auto">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="py-1 px-2 font-semibold border-r border-black w-[45%]">Sub Total</td>
                    <td className="py-1 px-2 text-right font-bold whitespace-nowrap">{formatAngka(totalBelanja)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="py-1 px-2 font-semibold border-r border-black">Diskon</td>
                    <td className="py-1 px-2 text-right font-bold whitespace-nowrap">{formatAngka(diskonFaktur)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="py-1 px-2 font-semibold border-r border-black">PPN ({ppnPersen}%)</td>
                    <td className="py-1 px-2 text-right font-bold whitespace-nowrap">{formatAngka(ppnNominal)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-1.5 px-2 font-bold border-r border-black">Total</td>
                    <td className="py-1.5 px-2 text-right font-extrabold text-[12px] whitespace-nowrap">
                      {formatAngka(grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>

      {/* Dialog edit: sengaja di luar area cetak supaya tidak ikut tercetak */}
      <EditFaktur
        faktur={currentItem}
        open={isOpenEditFaktur}
        setOpen={setIsOpenEditFaktur}
        no_faktur={faktur.no_faktur}
      />

      {/* Tombol Print Outside Sheet */}
      <div className="p-3 bg-gray-100 border-t border-gray-300 flex justify-end">
        <button
          type="button"
          onClick={() => handlePrint()}
          className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded transition flex items-center justify-center gap-2 shadow"
        >
          <span>🖨️ Cetak Nota/Faktur Penjualan</span>
        </button>
      </div>
    </div>
  );
});

/* =============================================================================
 * HALAMAN UTAMA
 * ========================================================================== */

export default function LihatPenjualanBarang() {
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [fakturList, setFakturList] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const observerRef = useRef(null);
  // Ref dipakai agar callback fetch stabil (tidak dibuat ulang tiap page/loading berubah)
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);

  const fetchFaktur = useCallback(
    async (isNewFilter = false) => {
      if (!tanggalMulai || !tanggalSelesai) return;
      if (loadingRef.current && !isNewFilter) return;

      // Filter baru membatalkan hasil request lama yang masih berjalan
      const requestId = ++requestIdRef.current;
      loadingRef.current = true;
      setLoading(true);

      const currentPage = isNewFilter ? 1 : pageRef.current;

      try {
        const response = await axios.get('/api-be/SERVER_JUAL_BARANG/AMBIL_FAKTUR_PENJUALAN', {
          params: {
            tanggalMulai,
            tanggalSelesai,
            page: currentPage,
          },
        });

        if (requestId !== requestIdRef.current) return;

        const newItems = response.data?.data || [];

        if (isNewFilter) {
          setFakturList(newItems);
        } else {
          setFakturList((prev) => [...prev, ...newItems]);
        }
        pageRef.current = currentPage + 1;
        setHasMore(newItems.length >= PAGE_SIZE);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        console.error('Gagal mengambil data faktur penjualan:', error?.response?.data || error.message);
        setHasMore(false);
      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [tanggalMulai, tanggalSelesai]
  );

  const handleFilter = (e) => {
    e.preventDefault();
    fetchFaktur(true);
  };

  useEffect(() => {
    const target = observerRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchFaktur(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchFaktur, hasMore]);

  return (
    <CEK_HAK_AKSES>
      <div className="max-w-5xl mx-auto p-3 sm:p-6 bg-slate-100 min-h-screen">
        <div className="mb-6 sm:mb-8 flex items-start gap-3 sm:gap-4">
          {/* Tombol Back */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50/60 active:scale-95 transition-all duration-150 shrink-0 mt-0.5 cursor-pointer"
            title="Kembali"
            aria-label="Kembali"
          >
            <svg
              className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Icon Badge + Title */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight leading-tight">
                  FAKTUR PENJUALAN BARANG
                </h1>
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                  Laporan
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Laporan data penjualan dan piutang pelanggan
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleFilter}
          className="bg-white p-4 rounded-xl shadow-sm border border-slate-300 mb-8 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4"
        >
          <div className="w-full sm:w-auto">
            <label htmlFor="tanggal-mulai" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Tanggal Mulai
            </label>
            <input
              id="tanggal-mulai"
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="w-full sm:w-auto border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-emerald-600 font-medium text-slate-700"
              required
            />
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="tanggal-selesai" className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Tanggal Selesai
            </label>
            <input
              id="tanggal-selesai"
              type="date"
              value={tanggalSelesai}
              min={tanggalMulai || undefined}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className="w-full sm:w-auto border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-emerald-600 font-medium text-slate-700"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition shadow-sm"
          >
            Cari Penjualan
          </button>
        </form>

        <div className="space-y-8">
          {fakturList.map((faktur) => (
            <FakturPenjualanCard key={faktur.no_faktur} faktur={faktur} />
          ))}
        </div>

        <div ref={observerRef} className="py-8 text-center text-sm font-medium text-slate-500">
          {loading && <p className="animate-pulse">Memuat faktur penjualan berikutnya...</p>}
          {!loading && !hasMore && fakturList.length > 0 && (
            <p className="text-xs text-slate-400 uppercase tracking-widest">— Akhir Dari Dokumen Penjualan —</p>
          )}
          {!loading && fakturList.length === 0 && (
            <p className="text-slate-500">Pilih rentang tanggal dan klik cari untuk menampilkan data.</p>
          )}
        </div>
      </div>
    </CEK_HAK_AKSES>
  );
}