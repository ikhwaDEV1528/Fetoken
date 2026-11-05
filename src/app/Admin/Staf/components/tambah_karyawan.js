'use client'

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const ROLE_OPTIONS = [
    {
        value: 'Admin',
        label: 'Admin',
        desc: 'Akses penuh ke sistem',
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        ),
    },
    {
        value: 'Sales',
        label: 'Sales',
        desc: 'Input penjualan & pelanggan',
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        ),
    },
];

const INPUT_CLASS =
    'w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15';

const LABEL_CLASS = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';

export function Tambah_karyawan({ isOpen = false, setIsOpen, onSuccess }) {
    const [visible, setVisible] = useState(false); // untuk animasi masuk
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [roleOpen, setRoleOpen] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const [form, setForm] = useState({
        username: '',
        password: '',
        role: '',
        no_hp: '',
        alamat: '',
    });
    const roleRef = useRef(null);

    const tutup = () => {
        if (saving) return;
        setIsOpen?.(false)
    };

    // Animasi masuk
    useEffect(() => {
        if (!isOpen) {
            setVisible(false);
            return undefined;
        }
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, [isOpen]);

    // Kunci scroll body + tombol Esc
    useEffect(() => {
        if (!isOpen) return undefined;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (roleOpen) setRoleOpen(false);
                else tutup();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, roleOpen, saving]);

    // Tutup dropdown kalau klik di luar
    useEffect(() => {
        if (!roleOpen) return undefined;
        const onDown = (e) => {
            if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
        };
    }, [roleOpen]);

    if (!isOpen) return null;

    const setField = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const resetForm = () =>
        setForm({ username: '', password: '', role: '', no_hp: '', alamat: '' });

    const validasi = () => {
        if (!form.username.trim()) return 'Username wajib diisi';
        if (form.password.length < 6) return 'Password minimal 6 karakter';
        if (!form.role) return 'Pilih role terlebih dahulu';
        if (form.no_hp.length < 9) return 'No HP tidak valid';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const pesan = validasi();
        if (pesan) {
            setError(pesan);
            return;
        }

        setSaving(true);
        setError('');
        try {
            // Sesuaikan URL dengan route BE kamu
            await axios.post('/api-be/SERVER_ADMIN/TAMBAH_ADMIN', {
                username: form.username.trim(),
                password: form.password,
                role: form.role,
                no_hp: form.no_hp.trim(),
                alamat: form.alamat.trim(),
            });
            resetForm();
            onSuccess?.();
            setIsOpen?.(false);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Gagal menambah karyawan');
        } finally {
            setSaving(false);
        }
    };

    const roleTerpilih = ROLE_OPTIONS.find((r) => r.value === form.role);

    return (
        <div
            className="fixed inset-0 z-[999] flex items-end md:items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-tambah-karyawan"
        >
            {/* Backdrop */}
            <div
                onClick={tutup}
                className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'
                    }`}
            />

            {/* Sheet (HP) / Modal (desktop) */}
            <form
                onSubmit={handleSubmit}
                className={`relative w-full md:max-w-lg bg-white flex flex-col
                    rounded-t-3xl md:rounded-3xl shadow-2xl
                    max-h-[92dvh] md:max-h-[90vh]
                    transition-all duration-300 ease-out
                    ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full md:translate-y-6 opacity-0'}`}
            >
                {/* Handle bar (khas bottom sheet HP) */}
                <div className="md:hidden flex justify-center pt-2.5 pb-1">
                    <span className="h-1.5 w-10 rounded-full bg-slate-300" />
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-3 md:pt-6 pb-4 border-b border-slate-100">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 id="judul-tambah-karyawan" className="text-lg font-black text-slate-800 leading-tight">
                             Buat Akun Karyawan
                        </h2>
                        <p className="text-xs text-slate-500">Isi data karyawan baru</p>
                    </div>
                    <button
                        type="button"
                        onClick={tutup}
                        aria-label="Tutup"
                        className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Isi form (scroll di dalam kalau layar pendek) */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
                    {/* Username */}
                    <div>
                        <label htmlFor="tk-username" className={LABEL_CLASS}>Username</label>
                        <input
                            id="tk-username"
                            type="text"
                            value={form.username}
                            onChange={(e) => setField('username', e.target.value)}
                            placeholder="Contoh: budi_sales"
                            autoComplete="off"
                            autoCapitalize="none"
                            enterKeyHint="next"
                            className={INPUT_CLASS}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="tk-password" className={LABEL_CLASS}>Password</label>
                        <div className="relative">
                            <input
                                id="tk-password"
                                type={showPass ? 'text' : 'password'}
                                value={form.password}
                                onChange={(e) => setField('password', e.target.value)}
                                placeholder="Minimal 6 karakter"
                                autoComplete="new-password"
                                enterKeyHint="next"
                                className={`${INPUT_CLASS} pr-12`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass((s) => !s)}
                                aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg text-slate-400 hover:text-emerald-700 flex items-center justify-center"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    {showPass ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                    ) : (
                                        <>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </>
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Role: dropdown modern */}
                    <div ref={roleRef}>
                        <span className={LABEL_CLASS}>Role</span>
                        <button
                            type="button"
                            onClick={() => setRoleOpen((o) => !o)}
                            aria-haspopup="listbox"
                            aria-expanded={roleOpen}
                            className={`w-full min-h-12 rounded-xl border px-4 py-2 flex items-center gap-3 text-left transition active:scale-[0.99]
                                ${roleOpen
                                    ? 'bg-white border-emerald-500 ring-4 ring-emerald-500/15'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                        >
                            {roleTerpilih ? (
                                <>
                                    <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            {roleTerpilih.icon}
                                        </svg>
                                    </span>
                                    <span className="flex-1 text-base font-semibold text-slate-800">{roleTerpilih.label}</span>
                                </>
                            ) : (
                                <span className="flex-1 text-base text-slate-400">Pilih role...</span>
                            )}
                            <svg
                                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${roleOpen ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {roleOpen && (
                            <ul role="listbox" className="mt-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg space-y-1">
                                {ROLE_OPTIONS.map((opt) => {
                                    const aktif = form.role === opt.value;
                                    return (
                                        <li key={opt.value} role="option" aria-selected={aktif}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setField('role', opt.value);
                                                    setRoleOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition active:scale-[0.99]
                                                    ${aktif ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                                            >
                                                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border
                                                    ${aktif
                                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                                        : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                        {opt.icon}
                                                    </svg>
                                                </span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-sm font-bold text-slate-800">{opt.label}</span>
                                                    <span className="block text-xs text-slate-500">{opt.desc}</span>
                                                </span>
                                                {aktif && (
                                                    <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* No HP */}
                    <div>
                        <label htmlFor="tk-nohp" className={LABEL_CLASS}>No HP</label>
                        <input
                            id="tk-nohp"
                            type="tel"
                            inputMode="numeric"
                            value={form.no_hp}
                            onChange={(e) => setField('no_hp', e.target.value.replace(/\D/g, '').slice(0, 15))}
                            placeholder="08xxxxxxxxxx"
                            autoComplete="tel"
                            enterKeyHint="next"
                            className={`${INPUT_CLASS} font-mono`}
                        />
                    </div>

                    {/* Alamat */}
                    <div>
                        <label htmlFor="tk-alamat" className={LABEL_CLASS}>Alamat</label>
                        <textarea
                            id="tk-alamat"
                            rows={3}
                            value={form.alamat}
                            onChange={(e) => setField('alamat', e.target.value)}
                            placeholder="Alamat lengkap karyawan"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 outline-none resize-none transition focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                        />
                    </div>

                    {/* Pesan error */}
                    {error && (
                        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                            <svg className="w-5 h-5 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer tombol (nempel di bawah, aman untuk notch/home bar) */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white rounded-b-3xl">
                    <button
                        type="button"
                        onClick={tutup}
                        disabled={saving}
                        className="h-12 sm:px-6 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-sm hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="h-12 sm:px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {saving && (
                            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        )}
                        {saving ? 'Menyimpan...' : 'Simpan Karyawan'}
                    </button>
                </div>
            </form>
        </div>
    );
}