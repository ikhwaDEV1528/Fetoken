'use client';

/**
 * Riwayat Retur Pembelian (retur ke supplier): Next.js (App Router), satu file, tanpa dependensi tambahan.
 * Letakkan di mis. app/retur-pembelian/riwayat/page.jsx
 *
 * Endpoint (app.use('/SERVER_RIWAYAT_RETUR_PEMBELIAN', RiwayatReturPembelian)):
 *   GET /riwayat   GET /summary   GET /riwayat/:id   GET /export/excel   GET /export/pdf
 *
 * Auth: sesuaikan getAuthHeaders() dengan cara login kamu.
 * CORS: kalau FE dan BE beda origin, di Express izinkan origin FE dan
 *       cors({ exposedHeaders: ['Content-Disposition'] }) supaya nama file export terbaca.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ───────────────────────── Konfigurasi ───────────────────────── */
const API_BASE = `/api-be/SERVER_RIWAYAT_RETUR_PEMBELIAN`;
const PAGE_SIZE = 20;

const getAuthHeaders = () => {
  try {
    const t = localStorage.getItem('token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
};

/* ───────────────────────── Util ───────────────────────── */
const rp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const nf = new Intl.NumberFormat('id-ID');
const fmtLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const jam = (s) => s.slice(11, 16);
const tglLabel = (s) => `${fmtShort.format(parseYmd(s.slice(0, 10)))}, ${jam(s)}`;

const PRESETS = [
  { id: 'today', label: 'Hari ini', range: () => { const t = new Date(); return [ymd(t), ymd(t)]; } },
  { id: 'yesterday', label: 'Kemarin', range: () => { const t = new Date(); t.setDate(t.getDate() - 1); return [ymd(t), ymd(t)]; } },
  { id: '7d', label: '7 hari', range: () => { const t = new Date(); const s = new Date(); s.setDate(s.getDate() - 6); return [ymd(s), ymd(t)]; } },
  { id: 'month', label: 'Bulan ini', range: () => { const t = new Date(); return [ymd(new Date(t.getFullYear(), t.getMonth(), 1)), ymd(new Date(t.getFullYear(), t.getMonth() + 1, 0))]; } },
  { id: 'lastmonth', label: 'Bulan lalu', range: () => { const t = new Date(); return [ymd(new Date(t.getFullYear(), t.getMonth() - 1, 1)), ymd(new Date(t.getFullYear(), t.getMonth(), 0))]; } },
  { id: 'all', label: 'Semua', range: () => ['', ''] },
  { id: 'custom', label: 'Pilih tanggal', range: null }
];

function rangeText(from, to) {
  if (!from && !to) return 'Semua tanggal';
  const f = (s) => fmtShort.format(parseYmd(s));
  if (from && to) return from === to ? f(from) : `${f(from)} – ${f(to)}`;
  return from ? `Sejak ${f(from)}` : `Sampai ${f(to)}`;
}

async function fetchApi(path, params, signal) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== '' && v != null) qs.set(k, String(v)); });
  const s = qs.toString();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}${s ? `?${s}` : ''}`, { headers: getAuthHeaders(), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.');
  }
  if (!res.ok) {
    let msg = 'Terjadi kesalahan. Silakan coba lagi.';
    try { msg = (await res.json()).message || msg; } catch { /* abaikan */ }
    throw new Error(msg);
  }
  return res;
}

/* ───────────────────────── Ikon ───────────────────────── */
const Svg = ({ children, size = 22, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
);
const IconCalendar = () => <Svg><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></Svg>;
const IconDownload = () => <Svg><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></Svg>;
const IconSearch = () => <Svg size={20}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
const IconClose = ({ size = 22 }) => <Svg size={size}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
const IconReturn = () => <Svg><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Svg>;
const IconBox = () => <Svg size={44} strokeWidth={1.6}><path d="M4 7l8-4 8 4v10l-8 4-8-4z" /><path d="M4 7l8 4 8-4M12 11v10" /></Svg>;
const IconSheet = () => <Svg><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8l4 4m0-4-4 4M8 16h8" /></Svg>;
const IconPdf = () => <Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></Svg>;

/* ───────────────────────── Sheet (bottom sheet di mobile, modal di desktop) ───────────────────────── */
function Sheet({ open, title, onClose, children, footer }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (prev && prev.focus) prev.focus();
    };
  }, [open, onClose]);

  return (
    <>
      <div className={`rr-backdrop${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`rr-sheet${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open}>
        <div className="rr-grab" />
        <div className="rr-sheet-head">
          <h2>{title}</h2>
          <button type="button" ref={closeRef} className="rr-icon-btn dark" onClick={onClose} aria-label="Tutup"><IconClose /></button>
        </div>
        <div className="rr-sheet-body">{open ? children : null}</div>
        {open && footer ? <div className="rr-sheet-foot">{footer}</div> : null}
      </div>
    </>
  );
}

/* Form rentang tanggal */
function DateForm({ initial, onApply, onReset }) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [err, setErr] = useState('');

  const apply = () => {
    if (!from && !to) return setErr('Isi minimal satu tanggal.');
    if (from && to && from > to) return setErr('Tanggal awal tidak boleh melebihi tanggal akhir.');
    return onApply(from, to);
  };

  return (
    <>
      <div className="rr-field-row">
        <div className="rr-field"><label htmlFor="rr-from">Dari tanggal</label>
          <input id="rr-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setErr(''); }} /></div>
        <div className="rr-field"><label htmlFor="rr-to">Sampai tanggal</label>
          <input id="rr-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setErr(''); }} /></div>
      </div>
      {err ? <p className="rr-err" role="alert">{err}</p> : null}
      <div className="rr-actions">
        <button type="button" className="rr-btn line" onClick={onReset}>Atur ulang</button>
        <button type="button" className="rr-btn primary" onClick={apply}>Terapkan</button>
      </div>
    </>
  );
}

/* Detail retur */
function DetailBody({ id }) {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ loading: true, error: '', data: null });
    fetchApi(`/riwayat/${id}`, null, ctrl.signal)
      .then((r) => r.json())
      .then((data) => setState({ loading: false, error: '', data }))
      .catch((e) => { if (e.name !== 'AbortError') setState({ loading: false, error: e.message, data: null }); });
    return () => ctrl.abort();
  }, [id]);

  if (state.loading) return <><div className="rr-skeleton" style={{ height: 120, marginBottom: 10 }} /><div className="rr-skeleton" /></>;
  if (state.error) return <div className="rr-state"><strong>Detail gagal dimuat</strong>{state.error}</div>;

  const { header: h, items } = state.data;
  return (
    <>
      <dl className="rr-dgrid">
        <div><dt>Tanggal</dt><dd>{tglLabel(h.tanggal_retur)}</dd></div>
        <div><dt>Metode</dt><dd>{h.metode_label}</dd></div>
        <div className="full"><dt>Supplier</dt><dd>{h.nama_supplier}</dd></div>
        <div className="full"><dt>Faktur pembelian</dt><dd>{h.no_faktur}</dd></div>
        {h.catatan ? <div className="full"><dt>Catatan</dt><dd>{h.catatan}</dd></div> : null}
      </dl>
      <p className="rr-sec">Barang diretur ({items.length})</p>
      <div className="rr-items">
        {items.map((i) => (
          <div className="rr-item" key={i.id}>
            <div className="t">{i.nama_barang}</div>
            <div className="m">
              {i.kode_barang} · {nf.format(i.qty_input)} {i.satuan_retur}
              {i.rasio_ke_pcs > 1 ? ` (${nf.format(i.qty_total_pcs)} pcs)` : ''}
              {i.kondisi_barang ? ` · ${i.kondisi_barang}` : ''}
            </div>
            {i.alasan_retur ? <div className="m">Alasan: {i.alasan_retur}</div> : null}
            <div className="r">
              <span className="num">{rp.format(i.harga_satuan)} / {i.satuan_retur}</span>
              <b className="num">{rp.format(i.subtotal_retur)}</b>
            </div>
          </div>
        ))}
      </div>
      <div className="rr-totals num">
        <div><span>DPP</span><span>{rp.format(h.dpp_total)}</span></div>
        <div><span>PPN{h.ppn_persen ? ` ${nf.format(h.ppn_persen)}%` : ''}</span><span>{rp.format(h.ppn_nominal)}</span></div>
        {h.jumlah_potong_hutang ? <div><span>Potong hutang</span><span>{rp.format(h.jumlah_potong_hutang)}</span></div> : null}
        {h.jumlah_refund_kas ? <div><span>Refund kas</span><span>{rp.format(h.jumlah_refund_kas)}</span></div> : null}
        <div className="grand"><span>Grand total</span><span>{rp.format(h.grand_total)}</span></div>
      </div>
    </>
  );
}

/* ───────────────────────── Halaman utama ───────────────────────── */
export default function RiwayatReturPembelianPage() {
  const [ready, setReady] = useState(false);
  const [preset, setPreset] = useState('month');
  const [range, setRange] = useState({ from: '', to: '' });
  const [metode, setMetode] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  const [rows, setRows] = useState([]);
  const [phase, setPhase] = useState('first'); // first | idle | more | error
  const [errMsg, setErrMsg] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState(null);

  const [sheet, setSheet] = useState(null);    // { type: 'date' | 'export' | 'detail', id? }
  const [exporting, setExporting] = useState('');
  const [toast, setToast] = useState({ msg: '', bad: false, show: false });

  const rootRef = useRef(null);
  const barRef = useRef(null);
  const sentinelRef = useRef(null);
  const loadMoreRef = useRef(null);
  const retryRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, bad = false) => {
    setToast({ msg, bad, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), bad ? 5000 : 2600);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const closeSheet = useCallback(() => setSheet(null), []);

  // Tanggal awal dihitung di client (hindari hydration mismatch karena zona waktu server)
  useEffect(() => {
    const [from, to] = PRESETS.find((p) => p.id === 'month').range();
    setRange({ from, to });
    setReady(true);
  }, []);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  // Posisi header tanggal menempel tepat di bawah app bar
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;
    const set = () => rootRef.current?.style.setProperty('--day-top', `${bar.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // Muat data: reset saat filter berubah, lalu halaman berikutnya via infinite scroll
  useEffect(() => {
    if (!ready) return undefined;

    const ctrl = new AbortController();
    const params = { from: range.from, to: range.to, metode, q };
    let cursor = null;
    let more = false;
    let busy = false;
    let failed = false;
    let loadedOnce = false;
    let dead = false;

    setRows([]); setHasMore(false); setErrMsg(''); setPhase('first');

    const checkSentinel = () => {
      const el = sentinelRef.current;
      if (!dead && !failed && el && el.getBoundingClientRect().top < window.innerHeight + 500) loadPage(false); // eslint-disable-line no-use-before-define
    };

    async function loadPage(first) {
      if (busy || dead || (!first && !more)) return;
      busy = true;
      setErrMsg('');
      setPhase(first ? 'first' : 'more');
      try {
        const res = await fetchApi('/riwayat', { ...params, limit: PAGE_SIZE, cursor: first ? '' : cursor }, ctrl.signal);
        const body = await res.json();
        if (dead) return;
        loadedOnce = true;
        setRows((prev) => (first ? body.data : [...prev, ...body.data]));
        cursor = body.next_cursor;
        more = body.has_more;
        setHasMore(more);
        setPhase('idle');
      } catch (e) {
        if (dead || e.name === 'AbortError') return;
        failed = true;
        setErrMsg(e.message);
        setPhase('error');
      } finally {
        busy = false;
        // Bila sentinel masih terlihat (layar tinggi / daftar pendek), langsung muat halaman berikutnya
        if (!dead && !failed && more) requestAnimationFrame(checkSentinel);
      }
    }

    loadMoreRef.current = () => { if (!failed) loadPage(false); };
    retryRef.current = () => { failed = false; loadPage(!loadedOnce); };

    fetchApi('/summary', params, ctrl.signal)
      .then((r) => r.json())
      .then((s) => { if (!dead) setSummary(s); })
      .catch((e) => { if (!dead && e.name !== 'AbortError') showToast(e.message, true); });
    loadPage(true);

    return () => {
      dead = true;
      ctrl.abort();
      loadMoreRef.current = null;
      retryRef.current = null;
    };
  }, [ready, range.from, range.to, metode, q, showToast]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) loadMoreRef.current?.();
    }, { rootMargin: '500px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const groups = useMemo(() => {
    const out = [];
    for (const r of rows) {
      const day = r.tanggal_retur.slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(r);
      else out.push({ day, items: [r] });
    }
    return out;
  }, [rows]);

  const applyPreset = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p.range) { setSheet({ type: 'date' }); return; }
    const [from, to] = p.range();
    setPreset(id);
    setRange({ from, to });
  };

  const resetAll = () => {
    setQInput(''); setQ(''); setMetode('');
    applyPreset('month');
  };

  const doExport = async (kind) => {
    if (exporting) return;
    setExporting(kind);
    try {
      const res = await fetchApi(`/export/${kind}`, { from: range.from, to: range.to, metode, q });
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const name = (cd.match(/filename="?([^";]+)"?/) || [])[1]
        || `riwayat-retur-pembelian_${range.from || 'awal'}_${range.to || 'akhir'}.${kind === 'excel' ? 'xlsx' : 'pdf'}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      closeSheet();
      showToast('File berhasil diunduh');
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setExporting('');
    }
  };

  const customLabel = preset === 'custom' ? rangeText(range.from, range.to) : 'Pilih tanggal';
  const isEmpty = ready && phase === 'idle' && rows.length === 0;

  const sheetTitle = sheet?.type === 'date' ? 'Rentang tanggal' : sheet?.type === 'export' ? 'Unduh laporan' : 'Detail retur';

  return (
    <div className="rr" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="rr-appbar" ref={barRef}>
        <div className="rr-appbar-row">
          <h1>Riwayat Retur Pembelian</h1>
          <button type="button" className="rr-icon-btn" onClick={() => setSheet({ type: 'date' })} aria-label="Atur rentang tanggal">
            <IconCalendar />{preset === 'custom' ? <span className="rr-dot" /> : null}
          </button>
          <button type="button" className="rr-icon-btn" onClick={() => setSheet({ type: 'export' })} aria-label="Unduh laporan"><IconDownload /></button>
        </div>
        <div className={`rr-search${qInput ? ' has-text' : ''}`}>
          <span className="s-ico"><IconSearch /></span>
          <input type="search" inputMode="search" enterKeyHint="search" autoComplete="off" value={qInput}
            onChange={(e) => setQInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            placeholder="Cari no. retur, no. faktur, atau supplier" aria-label="Cari retur" />
          <button type="button" className="clear" onClick={() => { setQInput(''); setQ(''); }} aria-label="Hapus pencarian"><IconClose size={20} /></button>
        </div>
      </header>

      <div className="rr-rail" role="group" aria-label="Rentang tanggal cepat">
        {PRESETS.map((p) => (
          <button type="button" key={p.id} className="rr-chip" aria-pressed={preset === p.id} onClick={() => applyPreset(p.id)}>
            {p.id === 'custom' ? customLabel : p.label}
          </button>
        ))}
      </div>

      {summary ? (
        <div className="rr-rail" role="group" aria-label="Metode penyelesaian" style={{ paddingTop: 8 }}>
          {[{ metode: '', label: 'Semua', jumlah: summary.semua_jumlah }, ...summary.per_metode].map((m) => (
            <button type="button" key={m.metode || 'all'} className="rr-chip" aria-pressed={metode === m.metode}
              onClick={() => setMetode(m.metode)}>
              {m.label}<span className="n num">{nf.format(m.jumlah)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="rr-wrap">
        {ready ? <p className="rr-period">Periode: {rangeText(range.from, range.to)}</p> : <p className="rr-period">&nbsp;</p>}

        <section className="rr-kpis" aria-live="polite">
          <div className="rr-kpi"><div className="l">Jumlah retur</div><div className="v num">{summary ? nf.format(summary.total_retur) : '-'}</div></div>
          <div className="rr-kpi primary"><div className="l">Total nilai retur</div><div className="v sm num">{summary ? rp.format(summary.total_nilai) : '-'}</div></div>
          <div className="rr-kpi"><div className="l">Rata-rata per retur</div>
            <div className="v sm num">{summary && summary.total_retur ? rp.format(Math.round(summary.total_nilai / summary.total_retur)) : '-'}</div></div>
        </section>

        <main>
          {groups.map((g) => (
            <section key={g.day}>
              <div className="rr-day">{fmtLong.format(parseYmd(g.day))}</div>
              <div className="rr-list">
                {g.items.map((r) => {
                  const alt = r.metode_penyelesaian !== 'POTONG_HUTANG';
                  return (
                    <button type="button" key={r.id} className="rr-card" onClick={() => setSheet({ type: 'detail', id: r.id })}
                      aria-label={`Detail retur ${r.no_retur}`}>
                      <span className="rr-avatar"><IconReturn /></span>
                      <span className="c-main">
                        <span className="c-title">{r.no_retur}</span>
                        <span className="c-sub">{r.nama_supplier}</span>
                        <span className="c-meta">{jam(r.tanggal_retur)} · {r.no_faktur}</span>
                      </span>
                      <span className="c-side">
                        <span className="c-amt num">{rp.format(r.grand_total)}</span>
                        <span className={`rr-badge${alt ? ' alt' : ''}`}>{r.metode_label}</span>
                        <span className="c-meta">{nf.format(r.jumlah_item)} item · {nf.format(r.total_pcs)} pcs</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </main>

        {phase === 'first' ? (
          <div className="rr-list" style={{ marginTop: 16 }}>{[0, 1, 2, 3, 4].map((i) => <div className="rr-skeleton" key={i} />)}</div>
        ) : null}
        {phase === 'more' ? <div className="rr-loadmore"><div className="rr-spinner" role="progressbar" aria-label="Memuat" /></div> : null}
        {phase === 'error' ? (
          <div className="rr-state"><strong>Data gagal dimuat</strong>{errMsg}
            <div><button type="button" className="rr-btn primary" onClick={() => retryRef.current?.()}>Coba lagi</button></div></div>
        ) : null}
        {isEmpty ? (
          <div className="rr-state"><IconBox />
            <strong>Belum ada retur pembelian</strong>
            {q ? 'Tidak ada hasil untuk pencarian ini. Coba kata kunci lain.' : 'Tidak ada retur pada rentang tanggal ini. Coba ubah tanggal.'}
            <div><button type="button" className="rr-btn ghost" onClick={resetAll}>Atur ulang filter</button></div></div>
        ) : null}
        {phase === 'idle' && rows.length > 0 && !hasMore ? <p className="rr-end">Semua {nf.format(rows.length)} retur sudah ditampilkan</p> : null}

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>

      <Sheet open={!!sheet} title={sheetTitle} onClose={closeSheet}>
        {sheet?.type === 'date' ? (
          <DateForm
            initial={range}
            onApply={(from, to) => { setPreset('custom'); setRange({ from, to }); closeSheet(); }}
            onReset={() => { applyPreset('month'); closeSheet(); }}
          />
        ) : null}

        {sheet?.type === 'export' ? (
          <>
            <p className="rr-hint">
              Sesuai filter saat ini: {rangeText(range.from, range.to)}
              {metode ? ` · ${metode.toLowerCase().replace(/_/g, ' ')}` : ''}{q ? ` · “${q}”` : ''}.
            </p>
            <button type="button" className="rr-opt" disabled={!!exporting} onClick={() => doExport('excel')}>
              <span className="rr-avatar"><IconSheet /></span>
              <span><b>{exporting === 'excel' ? 'Menyiapkan file…' : 'Excel (.xlsx)'}</b><span>Satu tabel lengkap: tanggal, supplier, barang, pcs, total retur, kondisi (bagus/rusak), keterangan. Bisa difilter</span></span>
            </button>
            <button type="button" className="rr-opt" disabled={!!exporting} onClick={() => doExport('pdf')}>
              <span className="rr-avatar"><IconPdf /></span>
              <span><b>{exporting === 'pdf' ? 'Menyiapkan file…' : 'PDF'}</b><span>Satu tabel yang sama, siap cetak (lanskap)</span></span>
            </button>
          </>
        ) : null}

        {sheet?.type === 'detail' ? <DetailBody key={sheet.id} id={sheet.id} /> : null}
      </Sheet>

      <div className={`rr-toast${toast.show ? ' show' : ''}${toast.bad ? ' bad' : ''}`} role="status">{toast.msg}</div>
    </div>
  );
}

/* ───────────────────────── Gaya (di-scope dengan .rr) ───────────────────────── */
const CSS = `
.rr{--em-950:#022c22;--em-800:#065f46;--em-700:#047857;--em-600:#059669;--em-500:#10b981;--em-200:#a7f3d0;--em-100:#d1fae5;--em-50:#ecfdf5;
  --ink:#0f172a;--ink-2:#334155;--muted:#64748b;--line:#e2e8f0;--bg:#f1f5f4;--card:#fff;--danger:#b91c1c;--warn:#b45309;--warn-bg:#fef3c7;
  --r-lg:16px;--r-md:12px;--day-top:128px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  background:var(--bg);color:var(--ink);font-size:15px;line-height:1.45;min-height:100dvh;
  padding-bottom:env(safe-area-inset-bottom,0px);-webkit-text-size-adjust:100%}
.rr *{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
.rr button,.rr input{font:inherit;color:inherit}
.rr button{cursor:pointer;border:0;background:none}
.rr :focus-visible{outline:3px solid var(--em-500);outline-offset:2px}
.rr .num{font-variant-numeric:tabular-nums}

.rr-appbar{position:sticky;top:0;z-index:20;background:var(--em-700);color:#fff;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 0}
.rr-appbar-row{max-width:880px;margin:0 auto;display:flex;align-items:center;gap:12px;min-height:44px}
.rr-appbar h1{font-size:19px;font-weight:650;flex:1;letter-spacing:-.01em}
.rr-icon-btn{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:inherit;position:relative}
.rr-icon-btn:active{background:rgba(255,255,255,.18)}
.rr-icon-btn.dark{color:var(--ink-2)}
.rr-icon-btn.dark:active{background:var(--em-50)}
.rr-dot{position:absolute;top:9px;right:9px;width:9px;height:9px;border-radius:50%;background:#fde68a;border:2px solid var(--em-700)}

.rr-search{max-width:880px;margin:4px auto 0;padding-bottom:12px;position:relative}
.rr-search input{width:100%;height:44px;border:0;border-radius:var(--r-md);padding:0 44px 0 42px;background:rgba(255,255,255,.96);color:var(--ink);font-size:16px}
.rr-search input::placeholder{color:var(--muted)}
.rr-search .s-ico{position:absolute;left:13px;top:12px;color:var(--muted);display:grid}
.rr-search .clear{position:absolute;right:2px;top:0;width:44px;height:44px;display:none;place-items:center;color:var(--muted)}
.rr-search.has-text .clear{display:grid}

.rr-rail{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:12px 16px 2px;max-width:880px;margin:0 auto;scroll-snap-type:x proximity}
.rr-rail::-webkit-scrollbar{display:none}
.rr-chip{flex:none;height:36px;padding:0 14px;border-radius:999px;background:var(--card)!important;border:1px solid var(--line)!important;
  font-size:14px;font-weight:550;color:var(--ink-2);scroll-snap-align:start;white-space:nowrap}
.rr-chip[aria-pressed="true"]{background:var(--em-700)!important;border-color:var(--em-700)!important;color:#fff}
.rr-chip .n{opacity:.7;margin-left:6px;font-weight:500}

.rr-wrap{max-width:880px;margin:0 auto;padding:0 16px}
.rr-period{margin:14px 0 8px;font-size:13px;color:var(--muted)}
.rr-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rr-kpi{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:14px 16px}
.rr-kpi.primary{background:var(--em-800);border-color:var(--em-800);color:#fff}
.rr-kpi .l{font-size:13px;color:var(--muted)}
.rr-kpi.primary .l{color:var(--em-200)}
.rr-kpi .v{font-size:21px;font-weight:700;letter-spacing:-.02em;margin-top:2px;overflow-wrap:anywhere}
.rr-kpi .v.sm{font-size:19px}

.rr-day{position:sticky;top:var(--day-top);z-index:5;margin:18px -16px 8px;padding:7px 16px;background:var(--bg);
  font-size:13px;font-weight:650;color:var(--em-800);border-bottom:1px solid var(--line)}
.rr-list{display:grid;gap:10px}
.rr-card{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;width:100%;text-align:left;
  background:var(--card)!important;border:1px solid var(--line)!important;border-radius:var(--r-lg);padding:12px 14px;min-height:76px}
.rr-card:active{background:var(--em-50)!important;border-color:var(--em-200)!important}
.rr-avatar{width:44px;height:44px;border-radius:12px;background:var(--em-100);color:var(--em-800);display:grid;place-items:center;flex:none}
.rr-card .c-main{min-width:0;display:block}
.rr-card .c-title{display:block;font-weight:650;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rr-card .c-sub{display:block;font-size:13px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rr-card .c-meta{display:block;font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rr-card .c-side{text-align:right;display:grid;gap:4px;justify-items:end}
.rr-card .c-amt{font-weight:700;font-size:15px}
.rr-badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600;background:var(--em-100);color:var(--em-800)}
.rr-badge.alt{background:var(--warn-bg);color:var(--warn)}

.rr-skeleton{height:76px;border-radius:var(--r-lg);background:linear-gradient(90deg,#e8eeec 25%,#f4f7f6 50%,#e8eeec 75%);background-size:200% 100%;animation:rr-sh 1.3s infinite linear}
@keyframes rr-sh{to{background-position:-200% 0}}
.rr-state{text-align:center;padding:36px 16px;color:var(--muted)}
.rr-state strong{display:block;color:var(--ink);font-size:16px;margin-bottom:4px}
.rr-state svg{color:var(--em-600);margin-bottom:10px}
.rr-state .rr-btn{margin-top:14px}
.rr-end{text-align:center;color:var(--muted);font-size:13px;padding:18px 0 28px}
.rr-loadmore{display:flex;justify-content:center;padding:14px 0 28px}
.rr-spinner{width:22px;height:22px;border-radius:50%;border:3px solid var(--em-100);border-top-color:var(--em-600);animation:rr-sp .8s linear infinite}
@keyframes rr-sp{to{transform:rotate(360deg)}}

.rr-btn{height:48px;padding:0 20px;border-radius:var(--r-md);font-weight:650;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.rr-btn.primary{background:var(--em-700)!important;color:#fff}
.rr-btn.primary:active{background:var(--em-800)!important}
.rr-btn.ghost{background:var(--em-50)!important;color:var(--em-800)}
.rr-btn.line{border:1px solid var(--line)!important;background:#fff!important;color:var(--ink-2)}
.rr button[disabled]{opacity:.6;pointer-events:none}

.rr-backdrop{position:fixed;inset:0;background:rgba(2,44,34,.5);z-index:50;opacity:0;pointer-events:none;transition:opacity .2s}
.rr-backdrop.open{opacity:1;pointer-events:auto}
.rr-sheet{position:fixed;left:0;right:0;bottom:0;z-index:51;background:var(--card);border-radius:22px 22px 0 0;max-height:88dvh;display:flex;flex-direction:column;
  transform:translateY(105%);visibility:hidden;transition:transform .28s cubic-bezier(.2,.8,.2,1),visibility 0s .28s;padding-bottom:env(safe-area-inset-bottom,0px)}
.rr-sheet.open{transform:none;visibility:visible;transition-delay:0s}
.rr-grab{width:40px;height:4px;border-radius:2px;background:#cbd5e1;margin:8px auto 0;flex:none}
.rr-sheet-head{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 20px;flex:none}
.rr-sheet-head h2{flex:1;font-size:18px;font-weight:700}
.rr-sheet-body{overflow-y:auto;padding:4px 20px 20px;overscroll-behavior:contain}
.rr-sheet-foot{display:flex;gap:10px;padding:12px 20px 16px;border-top:1px solid var(--line);flex:none}

.rr-field{display:grid;gap:6px;margin-bottom:14px}
.rr-field label{font-size:13px;font-weight:600;color:var(--ink-2)}
.rr-field input{height:48px;border:1px solid #cbd5e1;border-radius:var(--r-md);padding:0 12px;background:#fff;font-size:16px;width:100%;color:var(--ink)}
.rr-field input:focus{border-color:var(--em-600)}
.rr-field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rr-err{color:var(--danger);font-size:13px;margin:-6px 0 12px}
.rr-actions{display:flex;gap:10px}
.rr-actions .rr-btn{flex:1}
.rr-hint{color:var(--muted);margin-bottom:14px}

.rr-dgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;margin-bottom:16px}
.rr-dgrid dt{font-size:12.5px;color:var(--muted)}
.rr-dgrid dd{font-weight:600;overflow-wrap:anywhere}
.rr-dgrid .full{grid-column:1/-1}
.rr-sec{font-size:14px;font-weight:700;margin:4px 0}
.rr-items{display:grid;gap:8px;margin:6px 0 16px}
.rr-item{border:1px solid var(--line);border-radius:var(--r-md);padding:12px}
.rr-item .t{font-weight:650}
.rr-item .m{font-size:13px;color:var(--ink-2);margin-top:2px}
.rr-item .r{display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:13px;color:var(--muted)}
.rr-item .r b{color:var(--ink);font-size:14px}
.rr-totals{background:var(--em-50);border-radius:var(--r-md);padding:12px 14px;display:grid;gap:6px}
.rr-totals div{display:flex;justify-content:space-between;gap:12px;font-size:14px}
.rr-totals .grand{font-size:17px;font-weight:700;color:var(--em-800);border-top:1px solid var(--em-200);padding-top:8px;margin-top:2px}

.rr-opt{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:14px;border:1px solid var(--line)!important;border-radius:var(--r-md);margin-bottom:10px;min-height:64px}
.rr-opt:active{background:var(--em-50)!important}
.rr-opt b{display:block}
.rr-opt span span{font-size:13px;color:var(--muted)}

.rr-toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translate(-50%,30px);z-index:60;
  background:var(--em-950);color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;max-width:calc(100% - 32px);opacity:0;pointer-events:none;transition:.25s}
.rr-toast.show{opacity:1;transform:translate(-50%,0)}
.rr-toast.bad{background:var(--danger)}

@media (min-width:768px){
  .rr{font-size:15.5px}
  .rr-kpis{grid-template-columns:repeat(3,1fr)}
  .rr-list{grid-template-columns:1fr 1fr}
  .rr-sheet{left:50%;right:auto;bottom:auto;top:50%;width:min(560px,92vw);max-height:84vh;border-radius:22px;
    transform:translate(-50%,-46%) scale(.97);opacity:0;pointer-events:none;transition:transform .2s,opacity .2s,visibility 0s .2s}
  .rr-sheet.open{transform:translate(-50%,-50%);opacity:1;pointer-events:auto}
  .rr-grab{display:none}
  .rr-card:hover{border-color:var(--em-200)!important}
}
@media (prefers-reduced-motion:reduce){.rr *{animation:none!important;transition:none!important}}
`;
