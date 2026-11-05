'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { CEK_HAK_AKSES } from '@/app/Hooks/Hooks';

const LIMIT = 10;

const rupiah = (n) => `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;

const formatTanggal = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatWaktu = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID');
};

/**
 * Ubah item dari BE menjadi baris tampilan.
 * - Row bonus murni (format baru)  -> 1 baris BONUS
 * - Row lama (beli + bonus 1 row)  -> dipecah jadi baris beli + baris BONUS
 */
function bangunBaris(items = []) {
  const rows = [];
  for (const item of items) {
    const jumlah = Number(item.jumlah) || 0;
    const qtyBonus = Number(item.qty_bonus) || 0;

    if (item.is_bonus) {
      rows.push({ key: `${item.id}-bonus`, isBonus: true, ...item, qty: qtyBonus });
      continue;
    }

    rows.push({ key: `${item.id}-beli`, isBonus: false, ...item, qty: jumlah });

    if (qtyBonus > 0) {
      rows.push({ key: `${item.id}-bonus-lama`, isBonus: true, ...item, qty: qtyBonus });
    }
  }
  return rows;
}

function BadgeBonus() {
  return (
    <span className="inline-block rounded border border-slate-400 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-slate-700">
      Bonus
    </span>
  );
}

function FakturCard({ faktur, printId, onCetak }) {
  const diskon = Number(faktur.diskon) || 0;

  const subtotalKotor =
    faktur.subtotal != null && faktur.subtotal !== ''
      ? Number(faktur.subtotal)
      : Number(faktur.total_harga) + diskon;

  const ppnPersen = Number(faktur.ppn_persen) || 0;
  const ppnNominal = Number(faktur.ppn_nominal) || 0;

  const dppTotal =
    faktur.dpp_total != null && faktur.dpp_total !== ''
      ? Number(faktur.dpp_total)
      : subtotalKotor - diskon;

  const totalAkhir =
    faktur.grand_total != null && faktur.grand_total !== ''
      ? Number(faktur.grand_total)
      : Number(faktur.total_harga);

  const baris = useMemo(() => bangunBaris(faktur.items), [faktur.items]);

  // Saat mencetak 1 faktur, faktur lain disembunyikan
  const sembunyikanSaatCetak = printId && printId !== faktur.id;

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none ${
        sembunyikanSaatCetak ? 'print:hidden' : ''
      }`}
    >
      {/* Kop faktur */}
      <div className="border-b border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Supplier
            </p>
            <h3 className="mt-1 break-words text-lg font-bold uppercase text-slate-900 sm:text-xl">
              {faktur.nama_supplier}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">ID Supplier: #{faktur.supplier_id}</p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              No. Faktur
            </p>
            <p className="mt-1 break-all font-mono text-base font-bold text-slate-900 sm:text-lg">
              {faktur.no_faktur}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{formatTanggal(faktur.tanggal_belanja)}</p>
            <button
              type="button"
              onClick={() => onCetak(faktur.id)}
              className="mt-3 inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-100 active:scale-95 print:hidden"
            >
              Cetak
            </button>
          </div>
        </div>
      </div>

      {/* Tabel (tablet, desktop, dan saat cetak) */}
      <div className="hidden overflow-x-auto md:block print:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
              <th className="w-12 px-4 py-3 text-left font-semibold">No</th>
              <th className="px-4 py-3 text-left font-semibold">Barang</th>
              <th className="px-4 py-3 text-center font-semibold">Qty</th>
              <th className="px-4 py-3 text-right font-semibold">Harga</th>
              <th className="px-4 py-3 text-right font-semibold">Diskon</th>
              <th className="px-4 py-3 text-right font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {baris.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Tidak ada item pada faktur ini.
                </td>
              </tr>
            )}
            {baris.map((row, idx) => (
              <tr
                key={row.key}
                className={`print:break-inside-avoid ${row.isBonus ? 'bg-slate-50' : ''}`}
              >
                <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{row.nama_barang}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    {row.kode_barang}
                    {row.status ? ` · ${row.status}` : ''}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                  {row.qty} {row.satuan || ''}
                </td>

                {row.isBonus ? (
                  <td colSpan={3} className="px-4 py-3 text-center">
                    <BadgeBonus />
                  </td>
                ) : (
                  <>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                      {rupiah(row.harga_satuan)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                      {Number(row.persentase_diskon_distributor) || 0}%
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {rupiah(row.subtotal)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Daftar item (mobile, tidak ikut tercetak) */}
      <ul className="divide-y divide-slate-100 md:hidden print:hidden">
        {baris.length === 0 && (
          <li className="px-4 py-6 text-center text-slate-400">Tidak ada item pada faktur ini.</li>
        )}
        {baris.map((row) => (
          <li key={row.key} className={`space-y-2 p-4 ${row.isBonus ? 'bg-slate-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-base font-semibold leading-snug text-slate-900">
                  {row.nama_barang}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {row.kode_barang}
                  {row.status ? ` · ${row.status}` : ''}
                </p>
              </div>
              {row.isBonus && <BadgeBonus />}
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              {row.isBonus ? (
                <span className="font-semibold text-slate-700">
                  {row.qty} {row.satuan || ''}
                </span>
              ) : (
                <span className="text-slate-600">
                  {rupiah(row.harga_satuan)} × <strong className="text-slate-900">{row.qty}</strong>{' '}
                  {row.satuan || ''}
                  {Number(row.persentase_diskon_distributor) > 0 &&
                    ` (disk. ${Number(row.persentase_diskon_distributor)}%)`}
                </span>
              )}
              {!row.isBonus && (
                <span className="font-mono text-base font-bold text-slate-900">
                  {rupiah(row.subtotal)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Ringkasan */}
      <div className="flex flex-col gap-4 border-t border-slate-200 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6 print:flex-row print:break-inside-avoid">
        <p className="text-xs text-slate-400">Dibuat: {formatWaktu(faktur.created_at)}</p>

        <dl className="w-full space-y-2 text-sm sm:w-80">
          <div className="flex justify-between text-slate-600">
            <dt>Subtotal</dt>
            <dd className="font-mono text-slate-900">{rupiah(subtotalKotor)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Diskon</dt>
            <dd className="font-mono text-slate-900">- {rupiah(diskon)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>DPP</dt>
            <dd className="font-mono text-slate-900">{rupiah(dppTotal)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>PPN ({ppnPersen}%)</dt>
            <dd className="font-mono text-slate-900">+ {rupiah(ppnNominal)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-300 pt-3">
            <dt className="text-sm font-bold uppercase tracking-wider text-slate-900">Total</dt>
            <dd className="font-mono text-lg font-bold text-slate-900">{rupiah(totalAkhir)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export default function FakturList() {
  const [tanggalMulai, setTanggalMulai] = useState('2026-09-01');
  const [tanggalSelesai, setTanggalSelesai] = useState('2026-09-30');
  const [fakturList, setFakturList] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [printId, setPrintId] = useState(null);

  const observerRef = useRef(null);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const filterRef = useRef({ tanggalMulai, tanggalSelesai });

  const fetchPage = useCallback(async (reset = false) => {
    if (loadingRef.current && !reset) return;

    const requestId = ++requestIdRef.current;
    const pageToLoad = reset ? 1 : pageRef.current;

    loadingRef.current = true;
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: body } = await axios.get('/api-be/SERVER_BELANJA_BARANG/FAKTUR_BELANJA', {
        params: { ...filterRef.current, page: pageToLoad }
      });

      // Abaikan respons lama jika sudah ada request yang lebih baru (mis. filter diganti)
      if (requestId !== requestIdRef.current) return;

      if (!body?.success) {
        setHasMore(false);
        return;
      }

      const newData = Array.isArray(body.data) ? body.data : [];
      const totalPages = Number(body.pagination?.total_pages);
      const adaLagi = Number.isFinite(totalPages)
        ? pageToLoad < totalPages
        : newData.length >= LIMIT;

      setFakturList((prev) => (reset ? newData : [...prev, ...newData]));
      setHasMore(adaLagi);
      pageRef.current = pageToLoad + 1;
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Gagal mengambil data faktur:', error?.response?.data || error.message);
      setErrorMsg(error?.response?.data?.message || 'Gagal memuat faktur. Silakan coba lagi.');
      // Hentikan observer agar tidak looping saat error
      setHasMore(false);
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();

    if (tanggalMulai > tanggalSelesai) {
      setErrorMsg('Tanggal mulai tidak boleh setelah tanggal selesai.');
      return;
    }

    filterRef.current = { tanggalMulai, tanggalSelesai };
    pageRef.current = 1;
    setFakturList([]);
    setHasMore(true);
    fetchPage(true);
  };

  // Cetak 1 faktur: sembunyikan faktur lain, lalu buka dialog cetak
  const handleCetak = useCallback((id) => {
    setPrintId(id);
    setTimeout(() => window.print(), 150);
  }, []);

  useEffect(() => {
    const reset = () => setPrintId(null);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const node = observerRef.current;
    if (!node || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchPage(false);
      },
      { rootMargin: '200px', threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, fakturList.length]);

  return (
    <CEK_HAK_AKSES>
      <div className="min-h-screen bg-slate-100 pb-20 font-sans text-slate-800 antialiased print:min-h-0 print:bg-white print:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] print:hidden">
          <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              aria-label="Kembali"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-800 transition active:scale-95 hover:bg-slate-100"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Laporan Pembelian
              </p>
              <h1 className="truncate text-lg font-bold leading-tight text-slate-900">
                Faktur Belanja Barang
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl space-y-5 px-4 py-5 sm:px-6 print:max-w-none print:space-y-0 print:p-0">
          {/* Filter */}
          <form
            onSubmit={handleFilter}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5 print:hidden"
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Tanggal Mulai
              </span>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Tanggal Selesai
              </span>
              <input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-xl bg-slate-900 px-8 text-base font-bold text-white transition active:scale-95 hover:bg-slate-800 disabled:opacity-60"
            >
              Cari Faktur
            </button>
          </form>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 print:hidden"
            >
              {errorMsg}
            </div>
          )}

          {/* Daftar faktur */}
          <div className="space-y-5 print:space-y-0">
            {fakturList.map((faktur) => (
              <FakturCard
                key={faktur.id}
                faktur={faktur}
                printId={printId}
                onCetak={handleCetak}
              />
            ))}
          </div>

          {/* Sentinel infinite scroll */}
          <div ref={observerRef} className="py-8 text-center text-sm text-slate-500 print:hidden">
            {loading && <p className="animate-pulse">Memuat faktur...</p>}
            {!loading && !hasMore && fakturList.length > 0 && (
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Akhir daftar faktur
              </p>
            )}
            {!loading && !hasMore && fakturList.length === 0 && !errorMsg && (
              <p>Data faktur tidak ditemukan.</p>
            )}
          </div>
        </main>
      </div>
    </CEK_HAK_AKSES>
  );
}