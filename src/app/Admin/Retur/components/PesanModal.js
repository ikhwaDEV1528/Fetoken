'use client';

import { useState, useEffect, useCallback } from "react";

// ============================================================================
// PANEL PESAN (pengganti alert): bottom sheet di HP, dialog di layar besar
// ============================================================================


export default function PesanModal({ pesan, label = 'Retur silang ditolak', onClose }) {
    const [tampil, setTampil] = useState(false);

    // animasi masuk
    useEffect(() => {
        const raf = requestAnimationFrame(() => setTampil(true));
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            cancelAnimationFrame(raf);
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    // animasi keluar, baru dilepas dari layar
    const tutup = useCallback(() => {
        setTampil(false);
        setTimeout(onClose, 250);
    }, [onClose]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') tutup(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [tutup]);

    // pecah teks BE: baris 1 = judul, "1. ..." = poin, sisanya = pengantar / penutup
    const baris = String(pesan || '').split('\n').map(s => s.trim()).filter(Boolean);
    const judul = baris[0] || '';
    const intro = [];
    const poin = [];
    const penutup = [];
    baris.slice(1).forEach((b) => {
        if (/^\d+\.\s/.test(b)) poin.push(b.replace(/^\d+\.\s*/, ''));
        else if (poin.length > 0) penutup.push(b);
        else intro.push(b);
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
            {/* latar gelap */}
            <div
                onClick={tutup}
                className={`absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] transition-opacity duration-300 ${tampil ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* panel */}
            <div
                className={`relative w-full md:max-w-lg max-h-[88dvh] flex flex-col bg-white rounded-t-[28px] md:rounded-3xl shadow-2xl
                    transition-all duration-300 ease-out
                    ${tampil
                        ? 'translate-y-0 opacity-100 md:scale-100'
                        : 'translate-y-full md:translate-y-4 opacity-0 md:scale-95'}`}
            >
                {/* handle (hanya HP) */}
                <div className="md:hidden flex justify-center pt-3">
                    <span className="h-1.5 w-11 rounded-full bg-slate-300" />
                </div>

                {/* isi */}
                <div className="overflow-y-auto px-5 sm:px-7 pt-5 pb-4">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0 h-14 w-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="8" r="3" />
                                <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
                                <circle cx="18" cy="9" r="2.2" />
                                <path d="M16.5 14.3c2.8.2 4.5 1.8 4.5 4.2" />
                            </svg>
                        </div>
                        <div className="min-w-0 pt-0.5">
                            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700">{label}</p>
                            <h3 className="mt-1 text-lg sm:text-xl font-extrabold leading-snug text-slate-900">{judul}</h3>
                        </div>
                    </div>

                    {intro.map((t, i) => (
                        <p key={`i${i}`} className="mt-4 text-[15px] leading-relaxed text-slate-700">{t}</p>
                    ))}

                    {poin.length > 0 && (
                        <ol className="mt-4 space-y-3">
                            {poin.map((t, i) => (
                                <li key={i} className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-3.5">
                                    <span className="shrink-0 h-7 w-7 rounded-lg bg-slate-900 text-white text-sm font-extrabold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                    <span className="text-[15px] leading-relaxed text-slate-800">{t}</span>
                                </li>
                            ))}
                        </ol>
                    )}

                    {penutup.length > 0 && (
                        <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
                            {penutup.map((t, i) => (
                                <p key={`p${i}`} className="text-[15px] font-semibold leading-relaxed text-amber-900">{t}</p>
                            ))}
                        </div>
                    )}
                </div>

                {/* tombol */}
                <div className="px-5 sm:px-7 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={tutup}
                        className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white text-base font-extrabold transition cursor-pointer"
                    >
                        Mengerti
                    </button>
                </div>
            </div>
        </div>
    );
}