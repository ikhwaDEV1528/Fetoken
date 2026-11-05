'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

/* ============================== API ============================== */
// Default memanggil /api/suppliers (same-origin). Kalau backend beda host,
// isi NEXT_PUBLIC_API_URL, mis. http://localhost:4000/api/suppliers
const API = '/api-be/SERVER_SUPLIER';
const PAGE_SIZE = 20;

class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request(url, init = {}) {
  const headers = { Accept: 'application/json' };
  if (init.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...init, headers, cache: 'no-store' });

  let body = null;
  try { body = await res.json(); } catch { /* body kosong */ }

  if (!res.ok) {
    throw new ApiError(res.status, body?.message ?? 'Terjadi kesalahan. Coba lagi.', body?.errors);
  }
  return body;
}

const fetchSuppliers = ({ q, cursor, signal }) => {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) params.set('cursor', String(cursor));
  if (q) params.set('q', q);
  return request(`${API}?${params.toString()}`, { signal });
};
const createSupplier = (input) => request(API, { method: 'POST', body: JSON.stringify(input) });
const updateSupplier = (id, input) => request(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(input) });

function formatDate(value) {
  if (!value) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : value;
}

/* ===================== Hook: infinite list (cursor) ===================== */
function mergeUnique(prev, next) {
  const seen = new Set(prev.map((i) => i.id));
  return [...prev, ...next.filter((i) => !seen.has(i.id))];
}

function useSuppliers(query) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // idle | loading | error
  const [hasMore, setHasMore] = useState(true);

  const queryRef = useRef(query);
  const cursorRef = useRef(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const errorRef = useRef(false);
  const genRef = useRef(0);
  const abortRef = useRef(null);

  const load = useCallback(async (reset) => {
    if (reset) {
      abortRef.current?.abort();
      genRef.current += 1;
      cursorRef.current = null;
      hasMoreRef.current = true;
      errorRef.current = false;
      loadingRef.current = false;
      setItems([]);
      setHasMore(true);
    } else if (loadingRef.current || !hasMoreRef.current || errorRef.current) {
      return;
    }

    const gen = genRef.current;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    loadingRef.current = true;
    setStatus('loading');

    try {
      const page = await fetchSuppliers({ q: queryRef.current, cursor: cursorRef.current, signal: ctrl.signal });
      if (gen !== genRef.current) return; // respons basi
      setItems((prev) => mergeUnique(prev, page.data));
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.hasMore;
      setHasMore(page.hasMore);
      loadingRef.current = false;
      setStatus('idle');
    } catch (err) {
      if (gen !== genRef.current) return;
      if (err?.name === 'AbortError') return;
      errorRef.current = true;
      loadingRef.current = false;
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    queryRef.current = query;
    load(true);
    return () => abortRef.current?.abort();
  }, [query, load]);

  const loadMore = useCallback(() => { load(false); }, [load]);
  const reload = useCallback(() => { load(true); }, [load]);
  const retry = useCallback(() => { errorRef.current = false; load(false); }, [load]);
  const replaceItem = useCallback((u) => setItems((p) => p.map((i) => (i.id === u.id ? u : i))), []);

  return { items, status, hasMore, loadMore, reload, retry, replaceItem };
}

/* ====================== Panel tambah / edit (dari kanan) ====================== */
const inputCls = (invalid) =>
  `mt-1.5 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
    invalid
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/30'
  }`;

function SupplierPanel({ open, supplier, onClose, onSaved }) {
  const [nama, setNama] = useState('');
  const [telepon, setTelepon] = useState('');
  const [alamat, setAlamat] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const namaRef = useRef(null);
  const teleponRef = useRef(null);
  const alamatRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setNama(supplier?.nama ?? '');
    setTelepon(supplier?.telepon ?? '');
    setAlamat(supplier?.alamat ?? '');
    setErrors({});
    setFormError(null);
    const t = setTimeout(() => namaRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [open, supplier]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    return () => prev?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFormError(null);

    const payload = { nama_supplier: nama.trim(), no_telepon: telepon.trim(), alamat: alamat.trim() };

    try {
      const res = supplier ? await updateSupplier(supplier.id, payload) : await createSupplier(payload);
      onSaved(res.data, supplier ? 'edit' : 'create', res.message);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors);
        if (err.errors.nama_supplier) namaRef.current?.focus();
        else if (err.errors.no_telepon) teleponRef.current?.focus();
        else if (err.errors.alamat) alamatRef.current?.focus();
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Data belum tersimpan. Periksa koneksi Anda lalu coba lagi.');
      }
    } finally {
      setSaving(false);
    }
  }

  const close = () => { if (!saving) onClose(); };

  return (
    <>
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-emerald-950/40 transition-opacity duration-300 motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-panel-title"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
          <h2 id="supplier-panel-title" className="text-lg font-semibold text-emerald-900">
            {supplier ? 'Edit supplier' : 'Tambah supplier'}
          </h2>
          <button
            type="button" onClick={close} aria-label="Tutup panel"
            className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {formError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div>
              <span className="block text-sm font-medium text-slate-700">Kode supplier</span>
              <p className="mt-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {supplier ? supplier.kode : 'Dibuat otomatis saat disimpan'}
              </p>
            </div>

            <div>
              <label htmlFor="f-nama" className="block text-sm font-medium text-slate-700">Nama supplier</label>
              <input
                id="f-nama" ref={namaRef} type="text" maxLength={100} value={nama}
                onChange={(e) => setNama(e.target.value)}
                aria-invalid={!!errors.nama_supplier}
                className={inputCls(!!errors.nama_supplier)}
              />
              {errors.nama_supplier && <p className="mt-1 text-xs text-red-600">{errors.nama_supplier[0]}</p>}
            </div>

            <div>
              <label htmlFor="f-telepon" className="block text-sm font-medium text-slate-700">Nomor telepon</label>
              <input
                id="f-telepon" ref={teleponRef} type="tel" inputMode="tel" maxLength={20} value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                aria-invalid={!!errors.no_telepon}
                className={inputCls(!!errors.no_telepon)}
              />
              {errors.no_telepon && <p className="mt-1 text-xs text-red-600">{errors.no_telepon[0]}</p>}
            </div>

            <div>
              <label htmlFor="f-alamat" className="block text-sm font-medium text-slate-700">Alamat</label>
              <textarea
                id="f-alamat" ref={alamatRef} rows={4} maxLength={500} value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                aria-invalid={!!errors.alamat}
                className={`${inputCls(!!errors.alamat)} resize-none`}
              />
              {errors.alamat && <p className="mt-1 text-xs text-red-600">{errors.alamat[0]}</p>}
            </div>
          </div>

          <div className="flex gap-3 border-t border-emerald-100 bg-white px-5 py-4">
            <button
              type="button" onClick={close} disabled={saving}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

/* ================================ Baris tabel ================================ */
const SupplierRow = memo(function SupplierRow({ item, onEdit }) {
  return (
    <tr className="transition-colors hover:bg-emerald-50/50">
      <td className="whitespace-nowrap px-4 py-3">
        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
          {item.kode ?? '-'}
        </span>
      </td>
      <td className="px-4 py-3 font-medium text-slate-900">{item.nama}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.telepon}</td>
      <td className="min-w-[16rem] px-4 py-3 text-slate-600">{item.alamat}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <button
          type="button" onClick={() => onEdit(item)} aria-label={`Edit ${item.nama}`}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Edit
        </button>
      </td>
    </tr>
  );
});

/* ================================== Halaman ================================== */
export default function SuppliersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const { items, status, hasMore, loadMore, reload, retry, replaceItem } = useSuppliers(query);

  const [panel, setPanel] = useState({ open: false, supplier: null });
  const [toast, setToast] = useState({ msg: '', visible: false });
  const toastTimer = useRef(null);
  const sentinelRef = useRef(null);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Infinite scroll (observer dibuat ulang tiap status/jumlah item berubah,
  // jadi kalau sentinel masih terlihat, halaman berikutnya tetap dimuat)
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) loadMore(); },
      { rootMargin: '300px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, status, items.length, loadMore]);

  const showToast = useCallback((msg) => {
    setToast({ msg, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const openCreate = useCallback(() => setPanel({ open: true, supplier: null }), []);
  const openEdit = useCallback((s) => setPanel({ open: true, supplier: s }), []);
  const closePanel = useCallback(() => setPanel((p) => ({ ...p, open: false })), []);

  const handleSaved = useCallback(
    (saved, mode, message) => {
      closePanel();
      if (mode === 'edit') {
        replaceItem(saved);
      } else {
        // Data baru ada paling atas: kosongkan pencarian lalu muat ulang dari awal
        setSearchInput('');
        if (query === '') reload();
        else setQuery('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      showToast(message);
    },
    [closePanel, query, reload, replaceItem, showToast],
  );

  const isEmpty = items.length === 0 && status === 'idle' && !hasMore;

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-emerald-900">Daftar supplier</h1>
            <p className="text-sm text-slate-500">Kelola data pemasok barang Anda.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3a6 6 0 104.47 10.03l3.25 3.25a.75.75 0 101.06-1.06l-3.25-3.25A6 6 0 009 3zM4.5 9a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" clipRule="evenodd" />
              </svg>
              <input
                type="search" maxLength={100} autoComplete="off" value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama, kode, atau telepon" aria-label="Cari supplier"
                className="w-full rounded-lg border border-emerald-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <button
              type="button" onClick={openCreate}
              className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Tambah supplier
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="overflow-x-auto rounded-xl border border-emerald-100">
          <table className="min-w-full divide-y divide-emerald-100 text-left text-sm">
            <thead className="bg-emerald-50 text-emerald-900">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Kode</th>
                <th scope="col" className="px-4 py-3 font-medium">Nama supplier</th>
                <th scope="col" className="px-4 py-3 font-medium">Telepon</th>
                <th scope="col" className="px-4 py-3 font-medium">Alamat</th>
                <th scope="col" className="px-4 py-3 font-medium">Dibuat</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => (
                <SupplierRow key={item.id} item={item} onEdit={openEdit} />
              ))}
            </tbody>
          </table>

          {isEmpty && (
            <div className="px-4 py-16 text-center">
              <p className="font-medium text-emerald-900">Supplier tidak ditemukan</p>
              <p className="mt-1 text-sm text-slate-500">
                {query
                  ? `Tidak ada hasil untuk "${query}". Coba kata kunci lain.`
                  : 'Belum ada supplier. Klik "Tambah supplier" untuk mulai.'}
              </p>
            </div>
          )}
        </div>

        <div className="py-6 text-center text-sm text-slate-500" aria-live="polite">
          {status === 'loading' && (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
              Memuat supplier...
            </span>
          )}
          {status === 'error' && (
            <span>
              <span className="text-red-600">Gagal memuat data. </span>
              <button type="button" onClick={retry} className="font-medium text-emerald-700 underline">Coba lagi</button>
            </span>
          )}
          {status === 'idle' && !hasMore && items.length > 0 && (
            <span>Semua supplier sudah ditampilkan ({items.length}).</span>
          )}
        </div>
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      </main>

      <SupplierPanel open={panel.open} supplier={panel.supplier} onClose={closePanel} onSaved={handleSaved} />

      <div
        role="status" aria-live="polite"
        className={`pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm text-white shadow-lg transition duration-300 ${
          toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {toast.msg}
      </div>
    </div>
  );
}
