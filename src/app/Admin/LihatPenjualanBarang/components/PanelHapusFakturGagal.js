'use client'

import { useEffect, useState } from 'react';

export function HapusFakturGagal({ open, onClose, noFaktur, alasan = [] }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!open) {
            setVisible(false);
            return undefined;
        }
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="judul-hapus-gagal"
        >
            <div
                onClick={onClose}
                className={`absolute inset-0 bg-emerald-950/55 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
            />

            <div
                className={`relative w-full md:max-w-md flex flex-col bg-emerald-50
                    rounded-t-[28px] md:rounded-2xl shadow-2xl
                    max-h-[88dvh] md:max-h-[85vh] overflow-hidden
                    transition-all duration-300 ease-out
                    ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full md:translate-y-4 opacity-0'}`}
            >
                <div className="md:hidden flex justify-center pt-2.5">
                    <span className="h-1.5 w-10 rounded-full bg-emerald-300" />
                </div>

                <div className="relative px-5 pt-4 md:pt-6 pb-4">
                    <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-600">
                        Penghapusan faktur
                    </p>
                    <h2 id="judul-hapus-gagal" className="mt-1 text-[22px] leading-tight font-extrabold text-emerald-950 pr-24">
                        Belum bisa dihapus
                    </h2>
                    <p className="mt-1.5 font-mono text-xs text-emerald-700 break-all pr-24">
                        {noFaktur}
                    </p>

                    <span
                        aria-hidden="true"
                        className="absolute right-4 top-5 md:top-7 -rotate-12 select-none rounded-md border-2 border-red-600/70 px-2.5 py-1 text-[11px] font-black tracking-[0.2em] text-red-600/80"
                    >
                        DITOLAK
                    </span>
                </div>

                <div className="mx-5 border-t border-dashed border-emerald-300" />

                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                    <p className="text-sm text-emerald-800">
                        {alasan.length > 1 ? `Ada ${alasan.length} alasan:` : 'Alasannya:'}
                    </p>

                    <ol className="mt-3 space-y-3">
                        {alasan.map((teks, i) => (
                            <li key={i} className="flex gap-3">
                                <span className="flex flex-col items-center">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                                        {i + 1}
                                    </span>
                                    {i < alasan.length - 1 && <span className="mt-1 w-px flex-1 bg-emerald-300" />}
                                </span>
                                <p className="pb-1 pt-0.5 text-[15px] leading-snug text-emerald-950">
                                    {teks}
                                </p>
                            </li>
                        ))}
                    </ol>

                    <p className="mt-4 rounded-xl bg-emerald-100 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-800">
                        Kalau faktur ini memang harus dibatalkan, selesaikan lewat retur atau refund.
                    </p>
                </div>

                <div className="px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-emerald-200 bg-emerald-50">
                    <button
                        type="button"
                        onClick={onClose}
                        autoFocus
                        className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white active:scale-[0.98] hover:bg-emerald-600 transition"
                    >
                        Mengerti
                    </button>
                </div>
            </div>
        </div>
    );
}