'use client'
import { Fragment, useEffect, useState } from 'react';

/**
 * Halaman "Riwayat Stok Barang".
 * Cara pakai:  <StokLog />   atau   <StokLog apiUrl="/api-be/SERVER_FAKTUR/STOK_LOG" />
 * Hanya butuh React. Kalau API-mu butuh token, tambahkan di objek `headers` pada fetch.
 */

const API_URL_DEFAULT = '/api-be/SERVER_STOK_LOG/STOK_LOG';

const JENIS = {
  PEMBELIAN: 'Belanja barang',
  PENJUALAN: 'Penjualan',
  RETUR_PENJUALAN: 'Retur dari pelanggan',
  RETUR_BELANJA: 'Retur ke supplier',
  STOK_OPNAME: 'Stok Opname',
  PENYESUAIAN: 'Ubah Faktur penjualan',
  // BARANG_RUSAK: 'Barang rusak',
  LEGACY: 'Data lama'
};

const PERIODE = [
  { id: 'semua', label: 'Semua waktu' },
  { id: 'hari_ini', label: 'Hari ini' },
  { id: '7', label: '7 hari terakhir' },
  { id: '30', label: '30 hari terakhir' }
];

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const angka = (n) => Number(n || 0).toLocaleString('id-ID');
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function rentang(id) {
  const sampai = ymd(new Date());
  if (id === 'hari_ini') return [sampai, sampai];
  if (id === '7' || id === '30') {
    const d = new Date();
    d.setDate(d.getDate() - (Number(id) - 1));
    return [ymd(d), sampai];
  }
  return ['', ''];
}

function formatWaktu(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(s || '');
  if (!m) return { tanggal: s || '-', jam: '' };
  return { tanggal: `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}`, jam: `${m[4]}.${m[5]}` };
}

function ceritakan(r) {
  const n = angka(Math.abs(r.qty_perubahan));
  if (r.arah === 'MASUK') return `Stok bertambah ${n} pcs, dari ${angka(r.stok_awal)} menjadi ${angka(r.stok_akhir)}.`;
  if (r.arah === 'KELUAR') return `Stok berkurang ${n} pcs, dari ${angka(r.stok_awal)} menjadi ${angka(r.stok_akhir)}.`;
  return `Stok tidak berubah, tetap ${angka(r.stok_akhir)} pcs.`;
}

function daftarHalaman(sekarang, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const s = new Set([1, total, sekarang - 1, sekarang, sekarang + 1]);
  if (sekarang <= 3) [2, 3, 4].forEach((n) => s.add(n));
  if (sekarang >= total - 2) [total - 1, total - 2, total - 3].forEach((n) => s.add(n));
  const urut = [...s].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const hasil = [];
  urut.forEach((n, i) => {
    if (i > 0 && n - urut[i - 1] > 1) hasil.push(`gap-${i}`);
    hasil.push(n);
  });
  return hasil;
}

function Pagination({ page, totalPages, onChange, disabled }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="sl-pager" aria-label="Pilih halaman">
      <button type="button" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
        Sebelumnya
      </button>
      {daftarHalaman(page, totalPages).map((n) =>
        typeof n === 'number' ? (
          <button
            key={n}
            type="button"
            className={n === page ? 'on' : ''}
            aria-current={n === page ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ) : (
          <span key={n} className="gap" aria-hidden="true">…</span>
        )
      )}
      <button type="button" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>
        Berikutnya
      </button>
    </nav>
  );
}

function Rincian({ r }) {
  // 1. Buat teks penanda bonus jika qty_bonus > 0
  const bonusTeks = r.qty_bonus > 0 ? ` (+ ${angka(r.qty_bonus)} ${r.satuan_input} Bonus)` : '';

  const butir = [
    ['Kondisi barang', r.kondisi === 'BAGUS' ? 'Bagus' : r.kondisi === 'RUSAK' ? 'Rusak' : r.kondisi === 'KADALUARSA' ? 'Kedaluwarsa' : r.kondisi],
    r.satuan_input && r.satuan_input !== 'PCS' && r.qty_input != null
      ? ['Diinput sebagai', `${angka(r.qty_input)} ${r.satuan_input}${bonusTeks}`] : null, // <-- Tempelkan bonusTeks di sini
    r.referensi_no ? ['Nomor dokumen', r.referensi_no] : null,
    r.keterangan ? ['Catatan', r.keterangan] : null,
    ' ',
    r.dibuat_oleh ? ['Dicatat oleh', r.dibuat_oleh] : null
  ].filter(Boolean);

  return (
    <div className="sl-rincian">
      <p className="sl-cerita">{ceritakan(r)}</p>
      <dl>
        {butir.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

export default function StokLog({ apiUrl = API_URL_DEFAULT }) {
  const [cariInput, setCariInput] = useState('');
  const [cari, setCari] = useState('');
  const [jenis, setJenis] = useState('');
  const [arah, setArah] = useState('');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [barang, setBarang] = useState(null); // { kode, nama }
  const [urut, setUrut] = useState('terbaru');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [muatUlang, setMuatUlang] = useState(0);
  const [terbuka, setTerbuka] = useState({});

  // Tunggu pengguna selesai mengetik sebelum mencari
  useEffect(() => {
    const t = setTimeout(() => {
      setCari(cariInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [cariInput]);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ page, limit, urut });
    if (cari) params.set('q', cari);
    if (jenis) params.set('jenis', jenis);
    if (arah) params.set('arah', arah);
    if (dari) params.set('dari', dari);
    if (sampai) params.set('sampai', sampai);
    if (barang) params.set('kode_barang', barang.kode);

    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await fetch(`${apiUrl}?${params.toString()}`, {
          signal: ctrl.signal,
          headers: { Accept: 'application/json' }
        });
        let json = null;
        try { json = await res.json(); } catch { /* bukan JSON */ }
        if (!res.ok) throw new Error(json?.message || 'Riwayat stok belum bisa dimuat.');
        if (!json || !Array.isArray(json.data) || !json.pagination) {
          throw new Error('Data dari server tidak sesuai format yang diharapkan.');
        }
        setHasil(json);
        setTerbuka({});
        const tp = json.pagination.total_pages;
        if (tp > 0 && page > tp) setPage(tp);
      } catch (e) {
        if (e.name === 'AbortError') return;
        setError(
          e instanceof TypeError
            ? 'Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.'
            : e.message || 'Riwayat stok belum bisa dimuat.'
        );
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [apiUrl, page, limit, urut, cari, jenis, arah, dari, sampai, barang, muatUlang]);

  const ubah = (setter) => (nilai) => { setter(nilai); setPage(1); };

  const pilihPeriode = (id) => {
    const [d, s] = rentang(id);
    setDari(d); setSampai(s); setPage(1);
  };
  const periodeAktif = PERIODE.find((p) => {
    const [d, s] = rentang(p.id);
    return d === dari && s === sampai;
  })?.id;

  const adaFilter = Boolean(cariInput || jenis || arah || dari || sampai || barang);
  const resetFilter = () => {
    setCariInput(''); setCari(''); setJenis(''); setArah('');
    setDari(''); setSampai(''); setBarang(null); setUrut('terbaru'); setPage(1);
  };

  const rows = hasil?.data || [];
  const pg = hasil?.pagination;
  const rk = hasil?.ringkasan;
  const awal = pg && pg.total > 0 ? (pg.page - 1) * pg.limit + 1 : 0;
  const akhir = pg ? Math.min(pg.page * pg.limit, pg.total) : 0;

  return (
    <section className="sl" aria-busy={loading}>

      <style>{CSS}</style>

      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">

          {/* SISI KIRI: Tombol Kembali (<) & Judul Header */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => window.history.back()}
              aria-label="Kembali"
              className="group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 active:scale-95 transition-all duration-150 shrink-0 cursor-pointer border border-slate-200/60"
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] text-slate-800 transition-transform group-hover:-translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="hidden sm:block w-px h-8 bg-slate-200 shrink-0" />

            {/* Judul & Deskripsi */}
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 truncate leading-snug">
                Riwayat stok barang
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-0.5">
                Setiap kali stok bertambah atau berkurang, kejadiannya dicatat di sini.
              </p>
            </div>
          </div>

        </div>
      </header>

      <div className="sl-sum" aria-live="polite">
        <div><span>Jumlah catatan</span><strong>{angka(pg?.total)}</strong></div>
        <div className="masuk"><span>Barang masuk</span><strong>+{angka(rk?.total_masuk_pcs)} pcs</strong></div>
        <div className="keluar"><span>Barang keluar</span><strong>-{angka(rk?.total_keluar_pcs)} pcs</strong></div>
        <p>Angka di atas mengikuti filter yang sedang dipilih.</p>
      </div>

      <div className="sl-filter">
        <label className="sl-cari">
          <span>Cari barang atau nomor faktur</span>
          <input
            type="search"
            value={cariInput}
            onChange={(e) => setCariInput(e.target.value)}
            placeholder="Contoh: Indomie, AAO016K, INV-2610"
            maxLength={100}
          />
        </label>

        <div className="sl-chips" role="group" aria-label="Pilih periode">
          {PERIODE.map((p) => (
            <button
              key={p.id}
              type="button"
              className={periodeAktif === p.id ? 'on' : ''}
              onClick={() => pilihPeriode(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="sl-grid">
          <label>
            <span>Jenis kejadian</span>
            <select value={jenis} onChange={(e) => ubah(setJenis)(e.target.value)}>
              <option value="">Semua kejadian</option>
              {Object.entries(JENIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>
            <span>Arah stok</span>
            <select value={arah} onChange={(e) => ubah(setArah)(e.target.value)}>
              <option value="">Masuk dan keluar</option>
              <option value="MASUK">Hanya masuk</option>
              <option value="KELUAR">Hanya keluar</option>
            </select>
          </label>
          <label>
            <span>Dari tanggal</span>
            <input type="date" value={dari} max={sampai || undefined} onChange={(e) => ubah(setDari)(e.target.value)} />
          </label>
          <label>
            <span>Sampai tanggal</span>
            <input type="date" value={sampai} min={dari || undefined} onChange={(e) => ubah(setSampai)(e.target.value)} />
          </label>
          <label>
            <span>Urutan</span>
            <select value={urut} onChange={(e) => ubah(setUrut)(e.target.value)}>
              <option value="terbaru">Terbaru dulu</option>
              <option value="terlama">Terlama dulu</option>
            </select>
          </label>
        </div>

        {(barang || adaFilter) && (
          <div className="sl-aktif">
            {barang && (
              <span className="tag">
                Hanya barang: {barang.nama || barang.kode}
                <button type="button" aria-label="Lepas filter barang" onClick={() => ubah(setBarang)(null)}>×</button>
              </span>
            )}
            {adaFilter && (
              <button type="button" className="link" onClick={resetFilter}>Hapus semua filter</button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="sl-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setMuatUlang((n) => n + 1)}>Coba lagi</button>
        </div>
      )}

      {!error && !hasil && loading && <div className="sl-skel" aria-label="Memuat data"><i /><i /><i /><i /></div>}

      {!error && hasil && rows.length === 0 && !loading && (
        <div className="sl-kosong">
          <h2>{adaFilter ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan stok'}</h2>
          <p>
            {adaFilter
              ? 'Coba ganti kata pencarian atau perluas rentang tanggal.'
              : 'Catatan akan muncul otomatis setelah ada penjualan, belanja, atau koreksi stok.'}
          </p>
          {adaFilter && <button type="button" onClick={resetFilter}>Hapus semua filter</button>}
        </div>
      )}

      {!error && rows.length > 0 && (
        <div className={`sl-tablewrap${loading ? ' muat' : ''}`}>
          <table className="sl-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Barang</th>
                <th>Kejadian</th>
                <th>Perubahan</th>
                <th>Stok</th>
                <th><span className="sr">Rincian</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const w = formatWaktu(r.tanggal);
                const buka = Boolean(terbuka[r.id_stok]);
                const tanda = r.arah === 'MASUK' ? '+' : r.arah === 'KELUAR' ? '-' : '';
                return (
                  <Fragment key={r.id_stok}>
                    <tr className={` sl-row `}>
                      <td data-label="Waktu"><b>{w.tanggal}</b><small>{w.jam}</small></td>
                      <td data-label="Barang">
                        <span>
                          <button
                            type="button"
                            className="nama"
                            title="Lihat riwayat barang ini saja"
                            onClick={() => ubah(setBarang)({ kode: r.kode_barang, nama: r.nama_barang })}
                          >
                            {r.nama_barang || 'Barang tanpa nama'}
                          </button>
                          <small>{r.kode_barang}</small>
                        </span>
                      </td>
                      <td data-label="Kejadian">
                        <span>
                          <em className="badge">{JENIS[r.jenis_transaksi] || r.jenis_transaksi}</em>
                          {r.referensi_no && <small>{r.referensi_no}</small>}
                        </span>
                      </td>
                      <td data-label="Perubahan">
                        <strong className={`delta ${r.arah.toLowerCase()}`}>
                          {tanda}{angka(Math.abs(r.qty_perubahan))} pcs
                        </strong>
                      </td>
                      <td data-label="Stok">
                        <span className="stok">{angka(r.stok_awal)} <i aria-label="menjadi">→</i> <b>{angka(r.stok_akhir)}</b></span>
                      </td>
                      <td className="aksi">
                        <button
                          type="button"
                          className="link"
                          aria-expanded={buka}
                          onClick={() => setTerbuka((t) => ({ ...t, [r.id_stok]: !t[r.id_stok] }))}
                        >
                          {buka ? 'Tutup rincian' : 'Lihat rincian'}
                        </button>
                      </td>
                    </tr>
                    {buka && (
                      <tr className="sl-detailrow">
                        <td colSpan={6} className="sl-detailcell"><Rincian r={r} /></td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!error && pg && pg.total > 0 && (
        <footer className="sl-foot">
          <p aria-live="polite">Menampilkan {angka(awal)}–{angka(akhir)} dari {angka(pg.total)} catatan</p>
          <label className="sl-limit">
            <span>Baris per halaman</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <Pagination page={pg.page} totalPages={pg.total_pages} disabled={loading} onChange={setPage} />
        </footer>
      )}
    </section>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.sl{--bg:white;--surface:#fff;--ink:#172a36;--muted:#5b6e7a;--line:#d5e0e6;--accent:#1d5c8c;
 --masuk:#0b7a5e;--masuk-bg:#e1f4ee;--keluar:#b3233f;--keluar-bg:#fce8ec;
 font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);background:var(--bg);
 padding:24px clamp(12px,3vw,32px) 40px;min-height:100%;box-sizing:border-box;line-height:1.5}
@media (prefers-color-scheme:dark){.sl{--bg:#0f1a21;--surface:#16242d;--ink:#e6eef2;--muted:#93a7b3;--line:#2a3e4a;--accent:#6db3e8;
 --masuk:#4fd1a8;--masuk-bg:#12362d;--keluar:#ff8da1;--keluar-bg:#3c1822}}
.sl *{box-sizing:border-box}
.sl h1{font-size:clamp(22px,3vw,28px);margin:0 0 4px;font-weight:800;letter-spacing:-.01em}
.sl-head p{margin:0;color:var(--muted);max-width:62ch}
.sl small{display:block;color:var(--muted);font-size:12.5px}
.sl button,.sl select,.sl input{font:inherit;color:inherit}
.sl :focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:6px}
.sl-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0 16px}
.sl-sum>div{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}
.sl-sum span{color:var(--muted);font-size:13.5px}
.sl-sum strong{font-size:clamp(18px,2.6vw,24px);font-weight:800}
.sl-sum .masuk{border-left:5px solid var(--masuk)} .sl-sum .masuk strong{color:var(--masuk)}
.sl-sum .keluar{border-left:5px solid var(--keluar)} .sl-sum .keluar strong{color:var(--keluar)}
.sl-sum p{grid-column:1/-1;margin:0;color:var(--muted);font-size:13px}
.sl-filter{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:14px}
.sl label{display:flex;flex-direction:column;gap:4px;font-size:13.5px;font-weight:600}
.sl label span{color:var(--muted);font-weight:500}
.sl input,.sl select{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 11px;min-height:42px;width:100%}
.sl-cari input{font-size:16px}
.sl-chips{display:flex;flex-wrap:wrap;gap:8px}
.sl-chips button{border:1px solid var(--line);background:transparent;border-radius:999px;padding:7px 14px;cursor:pointer;font-size:14px}
.sl-chips button.on{background:green;border-color:var(--accent);color:#fff}
.sl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.sl-aktif{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.sl .tag{background:var(--masuk-bg);color:var(--masuk);border-radius:999px;padding:4px 6px 4px 12px;font-size:14px;font-weight:600;display:inline-flex;gap:6px;align-items:center}
.sl .tag button{border:0;background:transparent;cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;color:inherit}
.sl .link{border:0;background:transparent;color:var(--accent);cursor:pointer;text-decoration:underline;padding:4px 2px;font-size:14px}
.sl-error,.sl-kosong{margin-top:16px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:24px;text-align:center}
.sl-error{border-color:var(--keluar);background:var(--keluar-bg)}
.sl-error p{margin:0 0 12px;font-weight:600}
.sl-kosong h2{margin:0 0 4px;font-size:18px} .sl-kosong p{margin:0 0 12px;color:var(--muted)}
.sl-error button,.sl-kosong button{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:10px 18px;cursor:pointer;font-weight:600}
.sl-skel{margin-top:16px;display:grid;gap:10px}
.sl-skel i{display:block;height:64px;border-radius:12px;background:var(--surface);border:1px solid var(--line);animation:slp 1.4s ease-in-out infinite}
@keyframes slp{50%{opacity:.5}}
@media (prefers-reduced-motion:reduce){.sl-skel i{animation:none}}
.sl-tablewrap{margin-top:16px;background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow-x:auto;transition:opacity .15s}
.sl-tablewrap.muat{opacity:.55;pointer-events:none}
.sl-table{width:100%;border-collapse:collapse;min-width:760px}
.sl-table th{text-align:left;font-size:13px;color:var(--muted);font-weight:600;padding:12px 14px;border-bottom:1px solid var(--line)}
.sl-table td{padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}
.sl-table tr:last-child td{border-bottom:0}
.sl-table .nama{border:0;background:transparent;padding:0;font-weight:700;text-align:left;cursor:pointer;color:var(--ink);text-decoration:underline dotted var(--muted);text-underline-offset:3px}
.sl-table .nama:hover{color:var(--accent)}
.sl .badge{font-style:normal;display:inline-block;border:1px solid var(--line);border-radius:6px;padding:2px 9px;font-size:13px;font-weight:600;margin-bottom:2px}
.sl .delta{font-size:17px;font-weight:800;white-space:nowrap;display:inline-block;border-radius:8px;padding:2px 10px}
.sl .delta.masuk{color:var(--masuk);background:var(--masuk-bg)}
.sl .delta.keluar{color:var(--keluar);background:var(--keluar-bg)}
.sl .delta.tetap{color:var(--muted);background:var(--bg)}
.sl .stok{white-space:nowrap} .sl .stok i{font-style:normal;color:var(--muted)} .sl .stok b{font-weight:800}
.sl .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.sl .aksi{white-space:nowrap}
.sl-detailcell{background:var(--bg)}
.sl-rincian .sl-cerita{margin:0 0 10px;font-weight:600}
.sl-rincian dl{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px 20px}
.sl-rincian dt{font-size:12.5px;color:var(--muted)} .sl-rincian dd{margin:0;font-weight:600;word-break:break-word}
.sl-foot{margin-top:16px;display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between}
.sl-foot p{margin:0;color:var(--muted)}
.sl-limit{flex-direction:row!important;align-items:center;gap:8px!important} .sl-limit select{width:auto}
.sl-pager{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.sl-pager button{min-width:40px;min-height:40px;padding:0 12px;border:1px solid var(--line);background:var(--surface);border-radius:8px;cursor:pointer}
.sl-pager button.on{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}
.sl-pager button:disabled{opacity:.45;cursor:not-allowed}
.sl-pager .gap{color:var(--muted);padding:0 4px}
@media (max-width:760px){
 .sl-sum{grid-template-columns:1fr}
 .sl-tablewrap{background:transparent;border:0;overflow:visible}
 .sl-table{min-width:0}
 .sl-table thead{display:none}
 .sl-table,.sl-table tbody,.sl-table tr,.sl-table td{display:block;width:100%}
 .sl-table tr.sl-row{background:var(--surface);border:1px solid var(--line);border-radius:12px;margin-top:12px;padding:6px 14px}
 .sl-table tr.sl-row td{border:0;padding:6px 0;display:flex;justify-content:space-between;gap:16px;text-align:right}
 .sl-table tr.sl-row td::before{content:attr(data-label);color:var(--muted);font-weight:500;text-align:left;flex:none}
 .sl-table tr.sl-row td.aksi{justify-content:flex-end;border-top:1px solid var(--line);margin-top:4px;padding-top:8px}
 .sl-table tr.sl-row td.aksi::before{content:none}
 .sl-detailrow{border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:6px}
 .sl-detailcell{display:block;padding:14px;border:0}
}
`;
