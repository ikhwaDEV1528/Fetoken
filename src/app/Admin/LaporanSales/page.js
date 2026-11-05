'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/* ============================================================
 * Konstanta & Helper
 * ============================================================ */
const API_BASE = '/api-be/SERVER_LAPORAN_SALES';
const COMPANY_NAME = 'CV PUTRA BHAKTI PRATAMA';

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

/** Tanggal lokal perangkat (YYYY-MM-DD) - bukan UTC, supaya tidak mundur 1 hari di WIB. */
const todayLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const formatTanggalID = (iso) => {
  if (!iso) return '-';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatJatuhTempo = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  const overdue = d.getTime() < new Date(`${todayLocal()}T00:00:00`).getTime();
  return {
    label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    overdue,
  };
};

const safeFileName = (s) => String(s || '').trim().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');

/** Fetch dengan timeout, abort eksternal, dan parsing error yang konsisten. */
async function apiFetch(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  let timedOut = false;
  const { signal: outerSignal, ...rest } = options;

  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* respons bukan JSON */
    }
    if (!res.ok || !json || json.success === false) {
      throw new Error(json?.message || `Permintaan gagal (${res.status})`);
    }
    return json;
  } catch (err) {
    if (timedOut) throw new Error('Koneksi terlalu lama. Periksa jaringan lalu coba lagi.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ============================================================
 * Komponen kecil
 * ============================================================ */
function StatusBadge({ status }) {
  const cls =
    status === 'LUNAS'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'PARTIAL'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-rose-100 text-rose-800';
  return (
    <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-md text-[11px] font-bold ${cls}`}>
      {status}
    </span>
  );
}

/** Input nominal Rupiah: keypad angka di HP, pemisah ribuan otomatis, tidak ada bug "05". */
function CurrencyInput({ value, onChange, ariaLabel, className = '' }) {
  const display = value ? Number(value).toLocaleString('id-ID') : '';
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      placeholder="0"
      aria-label={ariaLabel}
      value={display}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
        onChange(digits === '' ? 0 : Number(digits));
      }}
      className={`min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-right text-base font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm ${className}`}
    />
  );
}

/* ============================================================
 * Halaman Utama
 * ============================================================ */
export default function DCRManagementPage() {
  // State Form Header
  const [tanggal, setTanggal] = useState(todayLocal());
  const [salesList, setSalesList] = useState([]);
  const [selectedSales, setSelectedSales] = useState('');
  const [areaPenjualan, setAreaPenjualan] = useState('');

  // State Filtering & Master Data Faktur
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');

  // State Items Terpilih di Tabel Penagihan DCR
  const [selectedItems, setSelectedItems] = useState([]);

  // State Rekap Uang
  const [uangDisetorkan, setUangDisetorkan] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // State UI
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', msg }
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null); // { no_bayar, total }

  const printRef = useRef(null);
  const invoiceAbortRef = useRef(null);
  const submittingRef = useRef(false);
  const toastTimerRef = useRef(null);

  /* ---------- Toast ---------- */
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  /* ---------- 1. Fetch daftar Sales saat mount ---------- */
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const json = await apiFetch(`${API_BASE}/sales`, { signal: controller.signal });
        setSalesList(json.data || []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Gagal memuat list sales:', err);
        showToast('error', 'Gagal memuat daftar sales. Muat ulang halaman.');
      }
    })();
    return () => controller.abort();
  }, [showToast]);

  /* ---------- 2. Debounce pencarian (kurangi beban server) ---------- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ---------- 3. Fetch faktur piutang (anti race-condition via AbortController) ---------- */
  const fetchInvoices = useCallback(async () => {
    invoiceAbortRef.current?.abort();
    const controller = new AbortController();
    invoiceAbortRef.current = controller;

    setLoadingInvoices(true);
    setInvoiceError('');
    try {
      const queryParams = new URLSearchParams({ sales: selectedSales, search: debouncedSearch });
      const json = await apiFetch(`${API_BASE}/invoices?${queryParams.toString()}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setAvailableInvoices(json.data || []);
      setHasMore(Boolean(json.has_more));
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Gagal memuat faktur piutang:', err);
      setInvoiceError(err.message || 'Gagal memuat faktur piutang.');
    } finally {
      if (invoiceAbortRef.current === controller) setLoadingInvoices(false);
    }
  }, [selectedSales, debouncedSearch]);

  useEffect(() => {
    fetchInvoices();
    return () => invoiceAbortRef.current?.abort();
  }, [fetchInvoices]);

  /* ---------- 4. Tambah faktur ke tabel penagihan ---------- */
  const handleAddInvoice = (inv) => {
    setSelectedItems((prev) => {
      if (prev.some((item) => item.no_faktur === inv.no_faktur)) return prev;
      const sisa = Number(inv.sisa_piutang) || 0;
      return [
        ...prev,
        {
          no_faktur: inv.no_faktur,
          nama_toko: inv.nama_toko || 'Toko Umum',
          total_tagihan: sisa,
          uang_ditagih: sisa, // Default diisi lunas
          status: 'LUNAS',
        },
      ];
    });
  };

  /* ---------- 5. Update uang ditagih (dinamis) ---------- */
  const handleUangDitagihChange = (noFaktur, val) => {
    const rawVal = Number(val) || 0;
    setSelectedItems((prev) =>
      prev.map((target) => {
        if (target.no_faktur !== noFaktur) return target;
        const totalTagihan = target.total_tagihan;
        const nominalValid = Math.min(Math.max(0, rawVal), totalTagihan);
        const sisa = totalTagihan - nominalValid;

        let statusCalc = 'PIUTANG';
        if (nominalValid === 0) statusCalc = 'BELUM BAYAR';
        else if (sisa === 0) statusCalc = 'LUNAS';
        else statusCalc = 'PARTIAL';

        return { ...target, uang_ditagih: nominalValid, status: statusCalc };
      })
    );
  };

  /* ---------- 6. Hapus faktur dari tabel ---------- */
  const handleRemoveItem = (noFaktur) => {
    setSelectedItems((prev) => prev.filter((i) => i.no_faktur !== noFaktur));
  };

  /* ---------- 7. Nilai kalkulasi real-time ---------- */
  const totalTagihanAll = useMemo(
    () => selectedItems.reduce((acc, curr) => acc + curr.total_tagihan, 0),
    [selectedItems]
  );

  const totalUangDitagihAll = useMemo(
    () => selectedItems.reduce((acc, curr) => acc + curr.uang_ditagih, 0),
    [selectedItems]
  );

  const totalSisaPiutangAll = useMemo(
    () => totalTagihanAll - totalUangDitagihAll,
    [totalTagihanAll, totalUangDitagihAll]
  );

  const uangDipegangSales = useMemo(
    () => Math.max(0, totalUangDitagihAll - Number(uangDisetorkan || 0)),
    [totalUangDitagihAll, uangDisetorkan]
  );

  const tokoBelumLunasCount = useMemo(
    () => selectedItems.filter((i) => i.status !== 'LUNAS').length,
    [selectedItems]
  );

  const setoranMelebihi = Number(uangDisetorkan || 0) > totalUangDitagihAll;
  const canSubmit =
    !submitting && selectedItems.length > 0 && totalUangDitagihAll > 0 && !setoranMelebihi;

  /* ---------- 8. Reset form ---------- */
  const handleResetForm = () => {
    setSelectedItems([]);
    setUangDisetorkan(0);
    setKeterangan('');
    setSearchQuery('');
    setDebouncedSearch('');
  };

  /* ---------- 9. Peringatan sebelum menutup tab bila ada data belum disimpan ---------- */
  useEffect(() => {
    if (selectedItems.length === 0) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [selectedItems.length]);

  /* ---------- 10. Tutup dialog konfirmasi dengan tombol Esc ---------- */
  useEffect(() => {
    if (!confirmOpen) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape' && !submittingRef.current) setConfirmOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [confirmOpen]);

  /* ---------- 11. Submit setoran DCR ke backend ---------- */
  const handleSubmitDCR = () => {
    if (selectedItems.length === 0) {
      showToast('error', 'Tabel rincian penagihan masih kosong!');
      return;
    }
    if (totalUangDitagihAll <= 0) {
      showToast('error', 'Isi nominal uang ditagih minimal pada satu faktur.');
      return;
    }
    if (setoranMelebihi) {
      showToast('error', 'Uang disetorkan melebihi total uang ditagih.');
      return;
    }
    setConfirmOpen(true);
  };

  const executeSubmit = async () => {
    if (submittingRef.current) return; // cegah double-submit
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        tanggal_bayar: tanggal,
        catatan: keterangan,
        sales: selectedSales,
        area: areaPenjualan,
        uang_disetorkan: Number(uangDisetorkan || 0),
        items: selectedItems
          .filter((item) => item.uang_ditagih > 0)
          .map((item) => ({
            no_faktur: item.no_faktur,
            uang_ditagih: item.uang_ditagih,
          })),
      };

      const json = await apiFetch(
        `${API_BASE}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        30000
      );

      setConfirmOpen(false);
      setSuccessInfo({ no_bayar: json.data?.no_bayar, total: json.data?.total_bayar });
      handleResetForm();
      fetchInvoices();
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error submitting DCR:', err);
      setConfirmOpen(false);
      showToast('error', err.message || 'Terjadi kesalahan jaringan.');
      fetchInvoices(); // data faktur mungkin sudah berubah (dipakai user lain)
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  /* ---------- 12. Cetak PDF (native print) ---------- */
  const handlePrintPDF = () => {
    if (selectedItems.length === 0) {
      showToast('error', 'Tidak ada data penagihan untuk dicetak!');
      return;
    }
    window.print();
  };

  /* ---------- 13. Ekspor Excel (rapi, berformat, formula hidup) ---------- */
  const handleExportExcel = async () => {
    if (selectedItems.length === 0) {
      showToast('error', 'Tidak ada data penagihan untuk diekspor!');
      return;
    }
    if (exporting) return;
    setExporting(true);

    try {
      const mod = await import('exceljs'); // dimuat saat dibutuhkan (hemat bundle & memori)
      const ExcelJS = mod.default || mod;

      const GREEN_DARK = 'FF064E3B';
      const GREEN = 'FF065F46';
      const GREEN_SOFT = 'FFECFDF5';
      const GRAY_LINE = 'FFCBD5E1';
      const GRAY_BG = 'FFE2E8F0';
      const FONT = 'Calibri';

      const thin = { style: 'thin', color: { argb: GRAY_LINE } };
      const boxBorder = { top: thin, left: thin, bottom: thin, right: thin };
      const rpFmt = '"Rp" #,##0;[Red]-"Rp" #,##0;"Rp" 0';

      const wb = new ExcelJS.Workbook();
      wb.creator = COMPANY_NAME;
      wb.created = new Date();

      const ws = wb.addWorksheet('DCR', {
        views: [{ showGridLines: false }],
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          horizontalCentered: true,
          margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
        },
      });
      ws.columns = [
        { width: 6 },
        { width: 34 },
        { width: 24 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
        { width: 16 },
      ];
      ws.headerFooter.oddFooter = '&L&8Dicetak: &D &T&R&8Halaman &P dari &N';

      // Helper: merge + isi + style sebuah range, border diterapkan ke seluruh sel
      const putMerged = (range, value, style = {}) => {
        ws.mergeCells(range);
        const [start, end] = range.split(':');
        const cell = ws.getCell(start);
        cell.value = value;
        const { font, alignment, fill, border, numFmt } = style;
        const cols = 'ABCDEFG';
        const r1 = parseInt(start.slice(1), 10);
        const r2 = parseInt(end.slice(1), 10);
        for (let r = r1; r <= r2; r += 1) {
          for (let c = cols.indexOf(start[0]); c <= cols.indexOf(end[0]); c += 1) {
            const target = ws.getCell(`${cols[c]}${r}`);
            if (fill) target.fill = fill;
            if (border) target.border = border;
          }
        }
        if (font) cell.font = { name: FONT, ...font };
        if (alignment) cell.alignment = alignment;
        if (numFmt) cell.numFmt = numFmt;
        return cell;
      };
      const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

      // ---- Judul ----
      putMerged('A1:G1', 'DAILY COLLECTION REPORT (DCR)', {
        font: { size: 16, bold: true, color: { argb: GREEN_DARK } },
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
      ws.getRow(1).height = 30;
      putMerged('A2:G2', COMPANY_NAME, {
        font: { size: 11, bold: true, color: { argb: GREEN } },
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
      ws.getRow(2).height = 20;
      for (let c = 1; c <= 7; c += 1) {
        ws.getRow(3).getCell(c).border = { bottom: { style: 'medium', color: { argb: GREEN } } };
      }
      ws.getRow(3).height = 6;

      // ---- Metadata ----
      const metaRows = [
        ['Tanggal', formatTanggalID(tanggal)],
        ['Nama Sales', selectedSales || 'Semua Sales'],
        ['Area Penjualan', areaPenjualan || '-'],
      ];
      metaRows.forEach(([label, val], i) => {
        const r = 4 + i;
        putMerged(`A${r}:B${r}`, label, {
          font: { bold: true, color: { argb: GREEN_DARK } },
          alignment: { vertical: 'middle' },
        });
        putMerged(`C${r}:G${r}`, `: ${val}`, { font: { bold: false }, alignment: { vertical: 'middle' } });
        ws.getRow(r).height = 18;
      });
      ws.getRow(7).height = 8;

      // ---- Section A: tabel rincian ----
      const HEADER_ROW = 8;
      const headers = ['No.', 'Nama Toko', 'No. Faktur', 'Total Tagihan', 'Uang Ditagih', 'Sisa Piutang', 'Status'];
      const headerRow = ws.getRow(HEADER_ROW);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = solid(GREEN);
        cell.alignment = {
          horizontal: i >= 3 && i <= 5 ? 'right' : 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = boxBorder;
      });
      headerRow.height = 26;
      ws.pageSetup.printTitlesRow = `${HEADER_ROW}:${HEADER_ROW}`;

      const firstData = HEADER_ROW + 1;
      selectedItems.forEach((item, idx) => {
        const r = firstData + idx;
        const row = ws.getRow(r);
        const sisa = item.total_tagihan - item.uang_ditagih;
        const zebra = idx % 2 === 1 ? solid(GREEN_SOFT) : null;

        row.getCell(1).value = idx + 1;
        row.getCell(2).value = item.nama_toko;
        row.getCell(3).value = item.no_faktur;
        row.getCell(4).value = item.total_tagihan;
        row.getCell(5).value = item.uang_ditagih;
        row.getCell(6).value = { formula: `D${r}-E${r}`, result: sisa };
        row.getCell(7).value = item.status;

        for (let c = 1; c <= 7; c += 1) {
          const cell = row.getCell(c);
          cell.font = { name: FONT, size: 11 };
          cell.border = boxBorder;
          if (zebra) cell.fill = zebra;
          cell.alignment = { vertical: 'middle', wrapText: c === 2 };
        }
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(3).font = { name: 'Consolas', size: 10 };
        [4, 5, 6].forEach((c) => {
          row.getCell(c).numFmt = rpFmt;
          row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' };
        });
        row.getCell(6).font = { name: FONT, size: 11, bold: true };

        const st = row.getCell(7);
        const palette =
          item.status === 'LUNAS'
            ? { bg: 'FFD1FAE5', fg: 'FF065F46' }
            : item.status === 'PARTIAL'
            ? { bg: 'FFFEF3C7', fg: 'FF92400E' }
            : { bg: 'FFFFE4E6', fg: 'FF9F1239' };
        st.fill = solid(palette.bg);
        st.font = { name: FONT, size: 10, bold: true, color: { argb: palette.fg } };
        st.alignment = { horizontal: 'center', vertical: 'middle' };

        row.height = item.nama_toko && item.nama_toko.length > 34 ? 32 : 20;
      });

      const lastData = firstData + selectedItems.length - 1;
      const totalRowIdx = lastData + 1;
      putMerged(`A${totalRowIdx}:C${totalRowIdx}`, 'TOTAL', {
        font: { bold: true, size: 11 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: solid(GRAY_BG),
        border: { ...boxBorder, top: { style: 'medium', color: { argb: GREEN } } },
      });
      [
        ['D', totalTagihanAll],
        ['E', totalUangDitagihAll],
        ['F', totalSisaPiutangAll],
      ].forEach(([col, result]) => {
        const cell = ws.getCell(`${col}${totalRowIdx}`);
        cell.value = { formula: `SUM(${col}${firstData}:${col}${lastData})`, result };
        cell.numFmt = rpFmt;
        cell.font = { name: FONT, bold: true, size: 11 };
        cell.fill = solid(GRAY_BG);
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.border = { ...boxBorder, top: { style: 'medium', color: { argb: GREEN } } };
      });
      const gCell = ws.getCell(`G${totalRowIdx}`);
      gCell.fill = solid(GRAY_BG);
      gCell.border = { ...boxBorder, top: { style: 'medium', color: { argb: GREEN } } };
      ws.getRow(totalRowIdx).height = 24;

      // ---- Section B: rekapitulasi uang ----
      let r = totalRowIdx + 2;
      putMerged(`A${r}:G${r}`, 'B. REKAPITULASI UANG', {
        font: { bold: true, size: 12, color: { argb: GREEN_DARK } },
        alignment: { vertical: 'middle' },
        border: { bottom: { style: 'medium', color: { argb: GREEN } } },
      });
      ws.getRow(r).height = 22;
      r += 1;

      const rekapStart = r;
      const rekap = [
        ['Total Uang Ditagih', { formula: `E${totalRowIdx}`, result: totalUangDitagihAll }, true],
        ['Total Uang Disetorkan ke Kantor', Number(uangDisetorkan || 0), true],
        [
          'Uang Masih Dipegang Sales',
          { formula: `MAX(0,D${rekapStart}-D${rekapStart + 1})`, result: uangDipegangSales },
          true,
        ],
        ['Jumlah Toko Ditagih', selectedItems.length, false],
        ['Jumlah Toko Belum Lunas', tokoBelumLunasCount, false],
      ];
      rekap.forEach(([label, val, isMoney], i) => {
        const rr = rekapStart + i;
        putMerged(`A${rr}:C${rr}`, label, {
          font: { bold: true },
          alignment: { vertical: 'middle', indent: 1 },
          fill: i % 2 === 0 ? solid(GREEN_SOFT) : undefined,
          border: boxBorder,
        });
        putMerged(`D${rr}:E${rr}`, val, {
          font: { bold: true, size: 11 },
          alignment: { horizontal: 'right', vertical: 'middle' },
          fill: i % 2 === 0 ? solid(GREEN_SOFT) : undefined,
          border: boxBorder,
          numFmt: isMoney ? rpFmt : '#,##0',
        });
        ws.getRow(rr).height = 20;
      });
      r = rekapStart + rekap.length + 1;

      // ---- Section C: keterangan ----
      putMerged(`A${r}:G${r}`, 'C. KETERANGAN', {
        font: { bold: true, size: 12, color: { argb: GREEN_DARK } },
        alignment: { vertical: 'middle' },
        border: { bottom: { style: 'medium', color: { argb: GREEN } } },
      });
      ws.getRow(r).height = 22;
      r += 1;
      const ket = keterangan.trim() || '-';
      const ketLines = ket.split('\n').reduce((acc, ln) => acc + Math.max(1, Math.ceil(ln.length / 95)), 0);
      putMerged(`A${r}:G${r}`, ket, {
        alignment: { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 },
        border: boxBorder,
      });
      ws.getRow(r).height = Math.max(36, ketLines * 15 + 8);
      r += 2;

      // ---- Tanda tangan ----
      putMerged(`A${r}:C${r}`, 'Dibuat oleh,\nSales', {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      });
      putMerged(`E${r}:G${r}`, 'Diperiksa oleh,\nAdmin / Keuangan', {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      });
      ws.getRow(r).height = 34;
      ws.getRow(r + 1).height = 56;
      putMerged(`A${r + 2}:C${r + 2}`, `( ${selectedSales || '........................'} )`, {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
      putMerged(`E${r + 2}:G${r + 2}`, '( ........................ )', {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
      ws.getRow(r + 2).height = 20;

      ws.pageSetup.printArea = `A1:G${r + 2}`;

      // ---- Tulis & unduh ----
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DCR_${safeFileName(selectedSales) || 'Semua_Sales'}_${tanggal}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Gagal ekspor Excel:', err);
      showToast('error', 'Gagal membuat file Excel. Coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  /* ============================================================
   * Render
   * ============================================================ */
  const inputCls =
    'w-full min-h-[44px] bg-slate-50 border border-slate-300 rounded-lg px-3 text-base sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none';

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-800 px-3 pt-3 pb-40 sm:p-6 md:pb-8 lg:p-8 print:bg-white print:p-0">
      {/* CSS Print: dokumen resmi A4 yang rapi */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          html,
          body {
            background: #fff !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-row-group;
          }
          tr,
          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Toast notifikasi */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`no-print fixed inset-x-3 top-3 z-[60] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl sm:inset-x-auto sm:right-6 sm:top-6 sm:w-96 ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-700'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.msg}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Tutup notifikasi"
              className="-m-2 p-2 text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Banner sukses */}
      {successInfo && (
        <div className="no-print mx-auto mb-4 max-w-5xl rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-emerald-900">Setoran berhasil disimpan</p>
              <p className="mt-1 text-sm text-emerald-800">
                No. Setoran <span className="font-mono font-bold">{successInfo.no_bayar}</span>
                {successInfo.total ? <> • Total {rupiah(successInfo.total)}</> : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessInfo(null)}
              aria-label="Tutup"
              className="-m-2 p-2 text-emerald-700 hover:text-emerald-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Kontainer dokumen */}
      <div
        id="print-area"
        ref={printRef}
        className="mx-auto max-w-5xl rounded-2xl border border-emerald-100 bg-white p-4 shadow-xl sm:p-8 print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none"
      >
        {/* Header dokumen */}
        <div className="mb-6 border-b-2 border-emerald-600 pb-5">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-emerald-950 sm:text-2xl">
                Daily Collection Report (DCR)
              </h1>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">{COMPANY_NAME}</p>
            </div>

            {/* Tombol aksi atas (tidak ikut dicetak) */}
            <div className="no-print grid w-full grid-cols-3 gap-2 md:w-auto">
              <button
                type="button"
                onClick={handleResetForm}
                className="min-h-[44px] rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition active:scale-[0.98] hover:bg-slate-200 sm:text-sm"
              >
                Kosongkan
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                className="min-h-[44px] rounded-lg bg-emerald-100 px-3 text-xs font-semibold text-emerald-800 transition active:scale-[0.98] hover:bg-emerald-200 disabled:opacity-60 sm:text-sm"
              >
                {exporting ? 'Membuat…' : 'Ekspor Excel'}
              </button>
              <button
                type="button"
                onClick={handlePrintPDF}
                className="min-h-[44px] rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white shadow-md transition active:scale-[0.98] hover:bg-emerald-800 sm:text-sm"
              >
                Cetak / PDF
              </button>
            </div>
          </div>

          {/* Input metadata (layar) */}
          <div className="no-print mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="dcr-tanggal" className="mb-1 block text-xs font-bold uppercase text-emerald-900">
                Tanggal
              </label>
              <input
                id="dcr-tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="dcr-sales" className="mb-1 block text-xs font-bold uppercase text-emerald-900">
                Nama Sales
              </label>
              <select
                id="dcr-sales"
                value={selectedSales}
                onChange={(e) => setSelectedSales(e.target.value)}
                className={inputCls}
              >
                <option value="">-- Semua Sales --</option>
                {salesList.map((s) => (
                  <option key={s.id_admin} value={s.username}>
                    {s.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dcr-area" className="mb-1 block text-xs font-bold uppercase text-emerald-900">
                Area Penjualan
              </label>
              <input
                id="dcr-area"
                type="text"
                placeholder="Misal: Bekasi Utara"
                value={areaPenjualan}
                onChange={(e) => setAreaPenjualan(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Metadata (khusus cetak) */}
          <div className="mt-4 hidden grid-cols-3 gap-4 text-sm print:grid">
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-900">Tanggal</p>
              <p className="font-semibold">{formatTanggalID(tanggal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-900">Nama Sales</p>
              <p className="font-semibold">{selectedSales || 'Semua Sales'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-900">Area Penjualan</p>
              <p className="font-semibold">{areaPenjualan || '-'}</p>
            </div>
          </div>
        </div>

        {/* Pencarian & tambah faktur (tidak ikut dicetak) */}
        <div className="no-print mb-8 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 sm:p-5">
          <label htmlFor="dcr-search" className="mb-2 block text-xs font-bold uppercase text-emerald-950">
            Cari Faktur Piutang
          </label>
          <input
            id="dcr-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Ketik nama toko atau nomor faktur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-3 min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
          />

          <div className="max-h-[22rem] space-y-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-72">
            {loadingInvoices ? (
              <p className="py-2 text-xs italic text-slate-500">Memuat data faktur...</p>
            ) : invoiceError ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs font-semibold text-rose-700">{invoiceError}</p>
                <button
                  type="button"
                  onClick={fetchInvoices}
                  className="min-h-[40px] shrink-0 rounded-md bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Coba lagi
                </button>
              </div>
            ) : availableInvoices.length === 0 ? (
              <p className="py-2 text-xs italic text-slate-500">Tidak ada faktur piutang ditemukan.</p>
            ) : (
              availableInvoices.map((inv) => {
                const isAdded = selectedItems.some((i) => i.no_faktur === inv.no_faktur);
                const jt = formatJatuhTempo(inv.jatuhtempo_faktur);
                return (
                  <div
                    key={inv.no_faktur}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{inv.nama_toko || 'Toko Umum'}</p>
                      <p className="truncate font-mono text-xs text-slate-500">{inv.no_faktur}</p>
                      <p className="mt-0.5 text-xs">
                        <span className="font-semibold text-emerald-700">
                          {rupiah(inv.sisa_piutang)}
                        </span>
                        {jt && (
                          <span className={`ml-2 ${jt.overdue ? 'font-bold text-rose-600' : 'text-slate-500'}`}>
                            {jt.overdue ? 'Lewat tempo ' : 'Tempo '}
                            {jt.label}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddInvoice(inv)}
                      className={`min-h-[44px] min-w-[84px] shrink-0 rounded-lg px-4 text-xs font-bold transition active:scale-[0.97] ${
                        isAdded
                          ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                          : 'bg-emerald-600 text-white shadow hover:bg-emerald-700'
                      }`}
                    >
                      {isAdded ? 'Terpilih' : 'Tambah'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
          {hasMore && !loadingInvoices && (
            <p className="mt-2 text-[11px] font-semibold text-amber-700">
              Menampilkan 100 faktur teratas. Persempit pencarian untuk hasil lebih spesifik.
            </p>
          )}
          <p className="mt-3 text-[11px] italic text-slate-500">
            * Hanya faktur yang masih memiliki sisa piutang (&gt; 0) yang ditampilkan dalam sistem.
          </p>
        </div>

        {/* SECTION A: RINCIAN PENAGIHAN */}
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-950 sm:text-base">
            A. Rincian Penagihan
          </h2>

          {selectedItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm italic text-slate-400">
              Belum ada faktur dipilih. Cari faktur di atas lalu tekan Tambah.
            </div>
          )}

          {/* Tampilan kartu (mobile) */}
          {selectedItems.length > 0 && (
            <div className="space-y-3 md:hidden print:hidden">
              {selectedItems.map((item, index) => {
                const sisa = item.total_tagihan - item.uang_ditagih;
                return (
                  <div key={item.no_faktur} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {index + 1}. {item.nama_toko}
                        </p>
                        <p className="font-mono text-xs text-slate-500">{item.no_faktur}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-slate-500">Total Tagihan</dt>
                        <dd className="font-bold text-slate-800">{rupiah(item.total_tagihan)}</dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-slate-500">Sisa Piutang</dt>
                        <dd className="font-bold text-rose-700">{rupiah(sisa)}</dd>
                      </div>
                    </dl>

                    <div className="mt-3">
                      <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
                        Uang Ditagih
                      </label>
                      <div className="flex items-center gap-2">
                        <CurrencyInput
                          value={item.uang_ditagih}
                          onChange={(v) => handleUangDitagihChange(item.no_faktur, v)}
                          ariaLabel={`Uang ditagih ${item.nama_toko}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleUangDitagihChange(item.no_faktur, item.total_tagihan)}
                          className="min-h-[44px] shrink-0 rounded-lg bg-emerald-100 px-3 text-xs font-bold text-emerald-800 active:scale-[0.97]"
                        >
                          Lunas
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.no_faktur)}
                          aria-label={`Hapus ${item.nama_toko}`}
                          className="min-h-[44px] shrink-0 rounded-lg bg-rose-50 px-3 text-xs font-bold text-rose-600 active:scale-[0.97]"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-xl bg-slate-100 p-3 text-xs font-bold text-slate-900">
                <div className="flex justify-between">
                  <span className="uppercase">Total Tagihan</span>
                  <span>{rupiah(totalTagihanAll)}</span>
                </div>
                <div className="mt-1 flex justify-between text-emerald-700">
                  <span className="uppercase">Total Ditagih</span>
                  <span>{rupiah(totalUangDitagihAll)}</span>
                </div>
                <div className="mt-1 flex justify-between text-rose-700">
                  <span className="uppercase">Total Sisa</span>
                  <span>{rupiah(totalSisaPiutangAll)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tabel (tablet/desktop & cetak) */}
          {selectedItems.length > 0 && (
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 shadow-sm md:block print:block print:overflow-visible print:rounded-none print:shadow-none">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-white font-bold uppercase text-white">
                    <th className="border-b border-emerald-900 p-3 text-center">No.</th>
                    <th className="border-b border-emerald-900 p-3">Nama Toko</th>
                    <th className="border-b border-emerald-900 p-3">No. Faktur</th>
                    <th className="border-b border-emerald-900 p-3 text-right">Total Tagihan</th>
                    <th className="border-b border-emerald-900 p-3 text-right">Uang Ditagih</th>
                    <th className="border-b border-emerald-900 p-3 text-right">Sisa Piutang</th>
                    <th className="border-b border-emerald-900 p-3 text-center">Status</th>
                    <th className="no-print border-b border-emerald-900 p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {selectedItems.map((item, index) => {
                    const sisa = item.total_tagihan - item.uang_ditagih;
                    return (
                      <tr key={item.no_faktur} className="transition hover:bg-slate-50/80">
                        <td className="p-3 text-center font-bold text-slate-600">{index + 1}</td>
                        <td className="p-3 font-semibold text-slate-900">{item.nama_toko}</td>
                        <td className="p-3 font-mono text-xs text-slate-600">{item.no_faktur}</td>
                        <td className="whitespace-nowrap p-3 text-right text-slate-800">
                          {rupiah(item.total_tagihan)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="no-print ml-auto w-36">
                            <CurrencyInput
                              value={item.uang_ditagih}
                              onChange={(v) => handleUangDitagihChange(item.no_faktur, v)}
                              ariaLabel={`Uang ditagih ${item.nama_toko}`}
                            />
                          </div>
                          <span className="hidden whitespace-nowrap font-bold print:inline">
                            {rupiah(item.uang_ditagih)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-3 text-right font-bold text-slate-700">
                          {rupiah(sisa)}
                        </td>
                        <td className="p-3 text-center">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="no-print p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.no_faktur)}
                            className="min-h-[40px] rounded-md px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-800"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                    <td colSpan={3} className="p-3 uppercase">
                      Total
                    </td>
                    <td className="whitespace-nowrap p-3 text-right text-emerald-950">
                      {rupiah(totalTagihanAll)}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right text-emerald-700">
                      {rupiah(totalUangDitagihAll)}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right text-rose-700">
                      {rupiah(totalSisaPiutangAll)}
                    </td>
                    <td className="p-3" />
                    <td className="no-print p-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* SECTION B: REKAPITULASI UANG */}
        <div className="avoid-break mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-950 sm:text-base">
            B. Rekapitulasi Uang
          </h2>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-900">Total Uang Ditagih</p>
              <p className="mt-1 text-lg font-black text-emerald-700">{rupiah(totalUangDitagihAll)}</p>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                setoranMelebihi ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
              }`}
            >
              <label htmlFor="dcr-setor" className="mb-1 block text-xs font-bold uppercase text-slate-700">
                Total Uang Disetorkan ke Toko 
              </label>
              <div className="no-print">
                <CurrencyInput
                  value={uangDisetorkan}
                  onChange={(v) => setUangDisetorkan(v)}
                  ariaLabel="Total uang disetorkan ke kantor"
                  className="!text-slate-900"
                />
                {setoranMelebihi && (
                  <p className="mt-1 text-xs font-semibold text-rose-600">
                    Melebihi total uang ditagih ({rupiah(totalUangDitagihAll)}).
                  </p>
                )}
              </div>
              <p className="hidden text-lg font-black text-slate-900 print:block">{rupiah(uangDisetorkan)}</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-900">Uang Masih Dipegang Sales</p>
              <p className="mt-1 text-lg font-black text-amber-700">{rupiah(uangDipegangSales)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-xs font-bold uppercase text-slate-700">Jumlah Toko Ditagih</span>
              <span className="text-base font-black text-slate-900">{selectedItems.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-xs font-bold uppercase text-slate-700">Jumlah Toko Belum Lunas</span>
              <span className="text-base font-black text-rose-700">{tokoBelumLunasCount}</span>
            </div>
          </div>
        </div>

        {/* SECTION C: KETERANGAN */}
        <div className="avoid-break mb-10">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-emerald-950 sm:text-base">
            C. Keterangan
          </h2>
          <textarea
            rows={3}
            maxLength={200}
            placeholder="Tambahkan catatan khusus penagihan jika ada..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="no-print w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
          />
          <p className="hidden min-h-[3rem] whitespace-pre-wrap text-sm print:block">{keterangan || '-'}</p>
        </div>

        {/* SECTION D: TANDA TANGAN */}
        <div className="avoid-break border-t border-slate-200 pt-6">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <p className="mb-16 text-xs font-bold uppercase text-slate-700">
                Dibuat oleh,
                <br />
                Sales
              </p>
              <p className="inline-block max-w-full truncate border-t border-slate-400 px-4 pt-1 text-sm font-bold text-slate-900 sm:px-8">
                ({selectedSales || '........................'})
              </p>
            </div>
            <div>
              <p className="mb-16 text-xs font-bold uppercase text-slate-700">
                Diperiksa oleh,
                <br />
                Admin / Keuangan
              </p>
              <p className="inline-block border-t border-slate-400 px-4 pt-1 text-sm font-bold text-slate-900 sm:px-8">
                (........................)
              </p>
            </div>
          </div>
        </div>

        {/* Tombol simpan (tablet/desktop) */}
        <div className="no-print mt-8 hidden justify-end border-t border-slate-200 pt-6 md:flex">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmitDCR}
            className="rounded-xl bg-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-800 disabled:bg-slate-300"
          >
            {submitting ? 'Memproses Setoran...' : 'Simpan Transaksi Setoran DCR'}
          </button>
        </div>
      </div>

      {/* Bilah aksi bawah (khusus mobile, seperti aplikasi native) */}
      <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pt-2 shadow-[0_-6px_16px_rgba(0,0,0,0.08)] backdrop-blur pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-slate-500">
              {selectedItems.length} faktur • Total ditagih
            </p>
            <p className="truncate text-base font-black text-emerald-700">{rupiah(totalUangDitagihAll)}</p>
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmitDCR}
            className="min-h-[48px] shrink-0 rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:bg-slate-300"
          >
            {submitting ? 'Memproses…' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Dialog konfirmasi (bottom sheet di mobile, modal di layar lebar) */}
      {confirmOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dcr-confirm-title"
          onClick={() => !submitting && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="dcr-confirm-title" className="text-base font-black text-emerald-950">
              Simpan setoran penagihan?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Data akan tercatat dan sisa piutang faktur akan diperbarui. Tindakan ini tidak dapat dibatalkan.
            </p>

            <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Jumlah faktur</dt>
                <dd className="font-bold">{selectedItems.filter((i) => i.uang_ditagih > 0).length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Total ditagih</dt>
                <dd className="font-bold text-emerald-700">{rupiah(totalUangDitagihAll)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Disetorkan ke kantor</dt>
                <dd className="font-bold">{rupiah(uangDisetorkan)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Masih dipegang sales</dt>
                <dd className="font-bold text-amber-700">{rupiah(uangDipegangSales)}</dd>
              </div>
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="min-h-[48px] rounded-xl bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={executeSubmit}
                className="min-h-[48px] rounded-xl bg-emerald-700 text-sm font-bold text-white shadow-md hover:bg-emerald-800 disabled:bg-slate-300"
              >
                {submitting ? 'Menyimpan…' : 'Ya, simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
