"use client";

// Komponen dashboard: Ringkasan Penjualan & Pembelian.
// Isi: kartu angka (Penjualan & Pembelian) + grafik batang berbasis Recharts.
// Butuh dependensi: npm i recharts

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = "/api-be/";
const TZ = "Asia/Jakarta";
const AUTO_REFRESH_MS = 60_000;

const WARNA_JUAL = "#1d4ed8"; // blue-700
const WARNA_BELI = "#94a3b8"; // slate-400

const FILTER = [
  { kunci: "hari_ini", label: "Hari Ini" },
  { kunci: "7_hari", label: "7 Hari" },
  { kunci: "30_hari", label: "30 Hari" },
];

/* -------------------------------- Formatter -------------------------------- */

const rupiahFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const rupiah = (n) => rupiahFmt.format(Number(n) || 0);
const angkaFmt = new Intl.NumberFormat("id-ID");

// Angka utama: di atas 1 miliar diringkas supaya tidak melebar di kolom sempit.
const rupiahUtama = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) {
    return `Rp ${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  }
  return rupiah(v);
};

// Label sumbu Y: 1,5 jt / 250 rb / 2 M
const ringkas = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const f = (x) => x.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (a >= 1e9) return `${f(v / 1e9)} M`;
  if (a >= 1e6) return `${f(v / 1e6)} jt`;
  if (a >= 1e3) return `${f(v / 1e3)} rb`;
  return String(v);
};

const tgl = (ymd, opsi) =>
  new Date(`${ymd}T00:00:00+07:00`).toLocaleDateString("id-ID", { timeZone: TZ, ...opsi });

const tanggalPanjang = (ymd) =>
  tgl(ymd, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const tanggalPendek = (ymd) => tgl(ymd, { day: "numeric", month: "short" });
const tanggalRingkas = (ymd) =>
  tgl(ymd, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/* ------------------------------- Komponen UI ------------------------------- */

function IkonRefresh({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function Tren({ persen, pembanding, netral = false }) {
  if (persen === null || persen === undefined) {
    return (
      <span className="font-medium text-slate-500" title="Belum ada data pembanding">
        Baru
      </span>
    );
  }
  if (persen === 0) {
    return <span className="font-medium text-slate-500">0%</span>;
  }
  const naik = persen > 0;
  const warna = netral ? "text-slate-700" : naik ? "text-green-700" : "text-red-700";
  return (
    <span className={`font-medium tabular-nums ${warna}`} title={`Dibanding ${pembanding}`}>
      {naik ? "▲" : "▼"} {Math.abs(persen).toLocaleString("id-ID")}%
    </span>
  );
}

function Metrik({ label, labelSisa, data, pembanding, netral }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className="mt-0.5 break-words text-lg font-bold leading-snug text-slate-900 tabular-nums sm:text-xl"
        title={rupiah(data.total)}
      >
        {rupiahUtama(data.total)}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        <Tren persen={data.perubahan.total_pct} pembanding={pembanding} netral={netral} />
        <span> · {angkaFmt.format(data.jumlah)} faktur</span>
      </p>
      {data.retur > 0 && (
        <p className="mt-0.5 break-words text-sm text-slate-500">
          Retur{" "}
          <span className="font-medium tabular-nums text-red-700">−{rupiah(data.retur)} (Tidak termasuk PPN)</span>
        </p>
      )}
      <p className="mt-0.5 break-words text-sm text-slate-500">
        {labelSisa}{" "}
        <span
          className={`tabular-nums ${data.sisa > 0 ? "font-medium text-amber-700" : "text-slate-700"}`}
        >
          {rupiah(data.sisa)}
        </span>
      </p>
    </div>
  );
}

/* --------------------------------- Grafik ---------------------------------- */

function TooltipGrafik({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const selisih = d.penjualan - d.pembelian;

  return (
    <div className="min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-lg">
      <p className="font-semibold text-slate-900">{tanggalPanjang(d.tanggal)}</p>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-start justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: WARNA_JUAL }} />
            Penjualan
          </span>
          <span className="text-right">
            <span className="block font-semibold tabular-nums text-slate-900">
              {rupiah(d.penjualan)}
            </span>
            <span className="block text-xs text-slate-500">
              {angkaFmt.format(d.jumlah_penjualan)} faktur
            </span>
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: WARNA_BELI }} />
            Pembelian
          </span>
          <span className="text-right">
            <span className="block font-semibold tabular-nums text-slate-900">
              {rupiah(d.pembelian)}
            </span>
            <span className="block text-xs text-slate-500">
              {angkaFmt.format(d.jumlah_pembelian)} faktur
            </span>
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-100 pt-2">
        <span className="text-slate-600">Selisih</span>
        <span
          className={`font-semibold tabular-nums ${
            selisih >= 0 ? "text-green-700" : "text-red-700"
          }`}
        >
          {selisih >= 0 ? "+" : "−"}
          {rupiah(Math.abs(selisih))}
        </span>
      </div>
    </div>
  );
}

function Grafik({ tren }) {
  const banyak = tren.length;
  const data = tren.map((d) => ({ ...d, label: tanggalPendek(d.tanggal) }));

  return (
    <div className="px-2 pb-3 pt-3 sm:px-4">
      <div
        className="h-64 w-full"
        role="img"
        aria-label="Grafik batang penjualan dan pembelian per hari"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap={banyak > 14 ? "15%" : "25%"}
          >
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              tick={{ fontSize: 12, fill: "#64748b" }}
              interval="preserveStartEnd"
              minTickGap={banyak > 7 ? 16 : 4}
            />
            <YAxis
              width={52}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickFormatter={ringkas}
              allowDecimals={false}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Tooltip
              content={<TooltipGrafik />}
              cursor={{ fill: "#f1f5f9" }}
              wrapperStyle={{ outline: "none", zIndex: 10 }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />
            <Bar
              dataKey="penjualan"
              name="Penjualan"
              fill={WARNA_JUAL}
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
              isAnimationActive={false}
            />
            <Bar
              dataKey="pembelian"
              name="Pembelian"
              fill={WARNA_BELI}
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Rangka() {
  return (
    <div className="animate-pulse border-t border-slate-200" role="status" aria-label="Memuat data">
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <div className="h-4 w-16 rounded bg-slate-200" />
            <div className="h-6 w-full max-w-[8rem] rounded bg-slate-200" />
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-4 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="h-64 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function PesanError({ pesan, onUlang }) {
  return (
    <div role="alert" className="border-t border-slate-200 px-4 py-5 text-center">
      <p className="text-sm font-semibold text-slate-900">Data tidak dapat dimuat</p>
      <p className="mt-1 text-sm text-slate-500">{pesan}</p>
      <button
        type="button"
        onClick={onUlang}
        className="mt-3 h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-800 active:bg-slate-100"
      >
        Coba lagi
      </button>
    </div>
  );
}

/* --------------------------------- Komponen --------------------------------- */

export function DashboardMonitoringPage({ className = "" }) {
  const [periode, setPeriode] = useState("hari_ini");
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [menyegarkan, setMenyegarkan] = useState(false);
  // false saat SSR & render pertama client -> atribut dinamis (disabled) identik di kedua sisi,
  // sehingga tidak memicu hydration mismatch.
  const [siap, setSiap] = useState(false);
  const ctrlRef = useRef(null);

  useEffect(() => {
    setSiap(true);
  }, []);

  const muat = useCallback(async (kunci, { senyap = false } = {}) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    if (senyap) setMenyegarkan(true);
    else setState((s) => ({ ...s, status: "loading", error: "" }));

    try {
      const { data: json } = await axios.get("/SERVER_DASH/monitoring", {
        baseURL: API_URL,
        params: { periode: kunci },
        withCredentials: true,
        signal: ctrl.signal,
      });
      if (!json?.success) {
        throw new Error(json?.message || "Gagal memuat data.");
      }
      setState({ status: "success", data: json.data, error: "" });
    } catch (err) {
      // Request yang sengaja dibatalkan (ganti periode / unmount) bukan error.
      if (axios.isCancel(err)) return;

      const pesan = err.response
        ? err.response.data?.message || `Gagal memuat data (kode ${err.response.status}).`
        : err.request
        ? "Tidak dapat terhubung ke server."
        : err.message || "Terjadi kesalahan jaringan.";

      // Refresh senyap yang gagal tidak menimpa data yang sudah tampil.
      setState((s) =>
        senyap && s.data ? s : { status: "error", data: null, error: pesan }
      );
    } finally {
      if (ctrlRef.current === ctrl) setMenyegarkan(false);
    }
  }, []);

  // Muat saat periode berganti.
  useEffect(() => {
    muat(periode);
    return () => ctrlRef.current?.abort();
  }, [periode, muat]);

  // Auto-refresh berkala (hanya saat tab terlihat).
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) muat(periode, { senyap: true });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [periode, muat]);

  const { status, data, error } = state;

  const rentang = data
    ? data.periode.hari === 1
      ? tanggalRingkas(data.periode.sampai)
      : `${tanggalPendek(data.periode.dari)} – ${tanggalPendek(data.periode.sampai)}`
    : "Memuat data…";

  return (
    <section
      className={`w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 ${className}`}
      aria-label="Ringkasan penjualan dan pembelian"
    >
      {/* Judul + refresh */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">Penjualan &amp; Pembelian</h2>
          <p className="truncate text-sm text-slate-500">{rentang}</p>
        </div>
        <button
          type="button"
          onClick={() => muat(periode, { senyap: true })}
          disabled={siap && (menyegarkan || status === "loading")}
          aria-label="Segarkan data"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 active:bg-slate-100 disabled:opacity-50"
        >
          <IkonRefresh className={`h-5 w-5 ${menyegarkan ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter periode */}
      <div
        role="tablist"
        aria-label="Filter periode"
        className="mx-4 mb-3 mt-3 grid grid-cols-3 rounded-lg bg-slate-100 p-0.5"
      >
        {FILTER.map((f) => {
          const aktif = f.kunci === periode;
          return (
            <button
              key={f.kunci}
              type="button"
              role="tab"
              aria-selected={aktif}
              onClick={() => setPeriode(f.kunci)}
              className={`h-10 rounded-md text-sm font-medium ${
                aktif ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {status === "loading" && <Rangka />}

      {status === "error" && <PesanError pesan={error} onUlang={() => muat(periode)} />}

      {status === "success" && data && (
        <>
          <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200">
            <Metrik
              label="Penjualan"
              labelSisa="Total Piutang (Termasuk PPN, jika ada)"
              data={data.penjualan}
              pembanding={data.periode.pembanding}
            />
            <Metrik
              label="Pembelian"
              labelSisa="Hutang"
              data={data.pembelian}
              pembanding={data.periode.pembanding}
              netral
            />
          </div>

          {data.tren?.length > 0 && (
            <div className="border-t border-slate-200">
              <Grafik tren={data.tren} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
