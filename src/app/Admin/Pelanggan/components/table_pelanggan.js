'use client'

import { Konteks } from "@/GlobalNilai/Global";
import axios from "axios";
import { MessageCircle, RefreshCw } from "lucide-react";
import { useContext, useEffect, useRef, useState, useCallback } from "react";

const API_LIST = '/api-be/SERVER_PELANGGAN/GET_PELANGGAN';
const API_CARI = '/api-be/SERVER_PELANGGAN/CARI_PELANGGAN';

function formatNomorWA(noHp) {
    let angka = String(noHp).replace(/\D/g, '');
    if (!angka) return null;
    if (angka.startsWith('0')) angka = '62' + angka.slice(1);
    else if (!angka.startsWith('62')) angka = '62' + angka;
    return angka;
}

export function TablePelanggan() {
    const { dataPelanggan, setDataPelanggan, setFormPelanggan, setLoading } = useContext(Konteks);

    const keyword = typeof dataPelanggan?.keyword === 'string' ? dataPelanggan.keyword : '';

    const [page, setPage] = useState(1);
    const [totalPage, setTotalPage] = useState(1);
    const [loadingPelanggan, setLoadingPelanggan] = useState(true);
    const [error, setError] = useState(null);
    const [sudahFetch, setSudahFetch] = useState(false);

    // Reset halaman saat keyword berubah, dilakukan saat render (bukan di effect)
    // supaya effect fetch di bawah sudah melihat page = 1 dan tidak fetch dua kali.
    const [keywordTerakhir, setKeywordTerakhir] = useState(keyword);
    if (keywordTerakhir !== keyword) {
        setKeywordTerakhir(keyword);
        setPage(1);
        setTotalPage(1);
    }

    const isFetchingRef = useRef(false);
    const reqIdRef = useRef(0);
    const abortRef = useRef(null);

    // Dipakai observer supaya observer tidak perlu dibuat ulang tiap page berubah.
    const pageRef = useRef(page);
    const totalPageRef = useRef(totalPage);
    pageRef.current = page;
    totalPageRef.current = totalPage;

    const observerTarget = useRef(null);

    const listPelanggan = Array.isArray(dataPelanggan?.masterPelanggan)
        ? dataPelanggan.masterPelanggan
        : [];

    const handleHubungiWA = (noHp) => {
        const nomor = formatNomorWA(noHp);
        if (!nomor) return;
        window.open(`https://wa.me/${nomor}`, '_blank', 'noopener,noreferrer');
    };

    const ambilData = useCallback(async (targetPage, kataKunci) => {
        // Batalkan request sebelumnya; response lama tidak boleh menimpa yang baru.
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const reqId = ++reqIdRef.current;
        isFetchingRef.current = true;
        setLoadingPelanggan(true);
        setError(null);

        try {
            const isCari = kataKunci !== '';
            const ress = await axios.get(isCari ? API_CARI : API_LIST, {
                params: isCari
                    ? { inputCariPelanggan: kataKunci, page: targetPage }
                    : { page: targetPage },
                signal: controller.signal,
            });

            // Response basi (keyword/page sudah berubah) -> abaikan.
            if (reqId !== reqIdRef.current) return;

            const hasil = (isCari ? ress?.data?.data : ress?.data?.pelanggan) || [];
            setTotalPage(ress?.data?.pagination?.total_pages || 1);

            setDataPelanggan(prev => {
                const base = (prev && !Array.isArray(prev)) ? prev : {};
                const sebelumnya = Array.isArray(base.masterPelanggan) ? base.masterPelanggan : [];
                return {
                    ...base,
                    masterPelanggan: targetPage === 1 ? hasil : [...sebelumnya, ...hasil],
                };
            });
        } catch (err) {
            if (axios.isCancel(err) || err?.name === 'CanceledError') return;
            if (reqId !== reqIdRef.current) return;
            console.error("Gagal mengambil data pelanggan:", err);
            setError('Data pelanggan gagal dimuat. Periksa koneksi lalu coba lagi.');
        } finally {
            if (reqId === reqIdRef.current) {
                isFetchingRef.current = false;
                setLoadingPelanggan(false);
                setSudahFetch(true);
            }
        }
    }, [setDataPelanggan]);

    useEffect(() => {
        ambilData(page, keyword);
    }, [page, keyword, ambilData]);

    // Hentikan request yang masih jalan saat komponen dilepas.
    useEffect(() => {
        return () => {
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    // Sentinel selalu ada di DOM, jadi observer cukup dibuat sekali.
    useEffect(() => {
        const target = observerTarget.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting) return;
                if (isFetchingRef.current) return;
                if (pageRef.current >= totalPageRef.current) return;
                setPage(prev => prev + 1);
            },
            { threshold: 0, rootMargin: '200px' }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, []);

    const adaHalamanLain = page < totalPage;
    const listKosong = listPelanggan.length === 0;


    function editPelanggan(itemPelanggan) {
        setLoading(prev => ({
            ...prev,
            isEditPelanggan: true
        }))


        setFormPelanggan(prev => ({
            ...prev,
            nama_pelanggan: itemPelanggan.nama_pelanggan,
            alamat: itemPelanggan.alamat,
            no_hp: itemPelanggan.no_hp,
            kode_pelanggan: itemPelanggan.kode_pelanggan
        }))
    }


    async function block(itemPelanggan) {
        const kode_pelanggan = itemPelanggan.kode_pelanggan;
        const nama_pelanggan = itemPelanggan.nama_pelanggan;

        if (!kode_pelanggan || kode_pelanggan == "" || nama_pelanggan == "" || !nama_pelanggan) {
            return alert('KODE PELANGGAN KOSONG!')
        };



        try {
            const API = '/api-be/SERVER_PELANGGAN/BLOCK_PELANGGAN';
            const ress = await axios.put(API, { kode_pelanggan: kode_pelanggan, nama_pelanggan: nama_pelanggan })


            setDataPelanggan(prev => ({
                ...prev,
                masterPelanggan: prev?.masterPelanggan?.map(item => {
                    if (item.kode_pelanggan == itemPelanggan.kode_pelanggan) {
                        return {
                            ...item,
                            block: 1 || '1'
                        }

                    }
                    return item;
                })
            }))

        } catch (err) {
            alert(`ERROR: ` + err?.response?.data?.message)
        }
    }




    async function unblock(itemPelanggan) {
        const kode_pelanggan = itemPelanggan.kode_pelanggan;
        const nama_pelanggan = itemPelanggan.nama_pelanggan;

        if (!kode_pelanggan || kode_pelanggan == "" || nama_pelanggan == "" || !nama_pelanggan) {
            return alert('KODE PELANGGAN KOSONG!')
        };


        try {
            const API = '/api-be/SERVER_PELANGGAN/UNBLOCK_PELANGGAN';
            const ress = await axios.put(API, { kode_pelanggan: kode_pelanggan, nama_pelanggan: nama_pelanggan })


            setDataPelanggan(prev => ({
                ...prev,
                masterPelanggan: prev?.masterPelanggan?.map(item => {
                    if (item.kode_pelanggan == itemPelanggan.kode_pelanggan) {
                        return {
                            ...item,
                            block: 0 || '0'
                        }

                    }
                    return item;
                })
            }));

        } catch (err) {
            alert(`ERROR: ` + err?.response?.data?.message)
        }
    }

    return (
        <main className="w-full max-w-4xl mx-auto flex flex-col gap-3 p-3 sm:p-4 pb-12">
            <div className="flex flex-col gap-2.5">
                {listPelanggan.map((item, index) => {
                    // Variabel pembantu tanpa mengubah logika asli kamu
                    const isBlocked = Number(item?.block) == 1 || item?.block == true;

                    return (
                        <div
                            key={`${item?.id ?? item?.kode_pelanggan ?? 'pelanggan'}-${index}`}
                            className={`${isBlocked
                                    ? 'bg-red-50/60 border-red-200 shadow-red-100/50'
                                    : 'bg-white border-slate-200/70'
                                } relative group rounded-3xl border shadow-[0_1px_2px_rgba(15,23,42,0.04)] active:scale-[0.985] transition-all duration-150 overflow-hidden flex flex-col justify-between`}
                        >
                            {/* BADGE LABEL BLOCK (Tampil hanya jika di-block) */}
                            {isBlocked && (
                                <div className="bg-red-500 text-white px-3 py-1.5 flex items-center justify-between gap-2 shadow-inner">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <i className="bi bi-exclamation-triangle-fill text-xs shrink-0"></i>
                                        <span className="text-[11px] font-semibold tracking-wide truncate">
                                            Pelanggan ini di-block & tidak bisa belanja!
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600/80 px-1.5 py-0.5 rounded shrink-0">
                                        Blocked
                                    </span>
                                </div>
                            )}

                            {/* Header card: avatar + nama + kode, aksi WA */}
                            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                                <div className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 font-bold text-base transition-colors ${isBlocked
                                        ? 'bg-red-100 border border-red-200 text-red-700'
                                        : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                                    }`}>
                                    {(item.nama_pelanggan || "?").trim().charAt(0).toUpperCase()}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900 text-[15px] leading-snug truncate">
                                        {item.nama_pelanggan}
                                    </p>
                                    <p className="font-mono text-[10.5px] font-bold text-[#006E44] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 inline-block mt-1">
                                        {item.kode_pelanggan}
                                    </p>
                                </div>

                                {item.no_hp && (
                                    <button
                                        type="button"
                                        onClick={() => handleHubungiWA(item.no_hp)}
                                        aria-label={`Hubungi ${item.nama_pelanggan || 'pelanggan'} lewat WhatsApp`}
                                        className="w-10 h-10 shrink-0 rounded-full bg-emerald-500 active:bg-emerald-600 active:scale-90 grid place-items-center shadow-sm shadow-emerald-900/20 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
                                    >
                                        <i className="bi bi-whatsapp text-white text-base"></i>
                                    </button>
                                )}
                            </div>

                            {/* Detail alamat & no hp */}
                            <div className="px-4 pb-3 flex flex-col gap-2 flex-1">
                                <div className="flex items-start gap-2.5">
                                    <span className="w-6 h-6 rounded-full bg-slate-50 grid place-items-center shrink-0 mt-0.5 border border-slate-100">
                                        <i className="bi bi-geo-alt text-slate-400 text-[11px]"></i>
                                    </span>
                                    <p className={`text-[13px] leading-relaxed pt-0.5 ${!item?.alamat || item?.alamat === "" ? 'text-red-500 font-medium' : 'text-slate-700'}`}>
                                        {item.alamat || 'Alamat belum diisi'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-full bg-slate-50 grid place-items-center shrink-0 border border-slate-100">
                                        <i className="bi bi-telephone text-slate-400 text-[11px]"></i>
                                    </span>
                                    <p className={`text-[13px] font-mono ${!item?.no_hp || item?.no_hp === "" ? 'text-red-500 font-medium' : 'text-slate-700'}`}>
                                        {item.no_hp || 'Nomor HP belum diisi'}
                                    </p>
                                </div>
                            </div>

                            {/* Action bar bawah */}
                            <div className={`grid grid-cols-2 border-t ${isBlocked ? 'border-red-200/80 bg-red-100/30' : 'border-slate-100'}`}>
                                <button
                                    onClick={() => editPelanggan(item)}
                                    className="edit-pelanggan flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold text-emerald-700 active:bg-emerald-50 active:scale-95 transition-all duration-150 border-r border-slate-200/60"
                                >
                                    <i className="bi bi-pencil text-[13px]"></i>
                                    Edit
                                </button>

                                {/* Tombol Block (Logika Asli) */}
                                <button
                                    onClick={() => block(item)}
                                    className={`${Number(item.block) == 1 || item.block == true ? 'hidden' : 'flex'} items-center justify-center gap-1.5 py-3 text-[13px] font-semibold text-red-600 active:bg-red-50 transition-colors duration-150`}
                                >
                                    <i className="bi bi-slash-circle text-[13px]"></i>
                                    Block
                                </button>

                                {/* Tombol Buka Block (Logika Asli) */}
                                <button
                                    onClick={() => unblock(item)}
                                    className={`${Number(item.block) == 0 || item.block == false ? 'hidden' : 'flex'} items-center justify-center gap-1.5 py-3 text-[13px] font-semibold text-amber-700 bg-amber-50/50 hover:bg-amber-100/80 active:bg-amber-100 transition-colors duration-150`}
                                >
                                    <i className="bi bi-check-circle text-[13px]"></i>
                                    Buka Block
                                </button>
                            </div>
                        </div>
                    );
                })}

                {error && listKosong && (
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/70 text-center flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 grid place-items-center">
                            <i className="bi bi-exclamation-triangle text-red-500 text-lg"></i>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">{error}</p>
                        <button
                            type="button"
                            onClick={() => ambilData(page, keyword)}
                            className="flex items-center gap-2 text-sm font-semibold text-white bg-[#006E44] px-4 py-2.5 rounded-2xl active:scale-95 shadow-sm shadow-emerald-900/20 transition-all cursor-pointer"
                        >
                            <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                            Coba lagi
                        </button>
                    </div>
                )}

                {!error && listKosong && !sudahFetch && (
                    <div className="flex flex-col gap-2.5" aria-hidden="true">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="bg-white p-4 rounded-3xl border border-slate-200/70 flex flex-col gap-3 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-slate-100 shrink-0" />
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <div className="h-4 w-28 bg-slate-100 rounded-lg" />
                                        <div className="h-3 w-16 bg-slate-100 rounded-md" />
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded" />
                                <div className="h-3 w-2/3 bg-slate-100 rounded" />
                            </div>
                        ))}
                    </div>
                )}

                {!error && listKosong && sudahFetch && !loadingPelanggan && (
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/70 text-center flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 grid place-items-center">
                            <i className="bi bi-people text-slate-400 text-lg"></i>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">
                            {keyword
                                ? `Tidak ada pelanggan yang cocok dengan "${keyword}".`
                                : 'Belum ada pelanggan. Tambahkan lewat tombol Pelanggan Baru.'}
                        </p>
                    </div>
                )}
            </div>

            {error && !listKosong && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => ambilData(page, keyword)}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                        Gagal memuat halaman berikutnya. Coba lagi
                    </button>
                </div>
            )}

            <div ref={observerTarget} className="h-1 w-full" />

            {loadingPelanggan && !listKosong && (
                <div className="flex justify-center items-center py-3">
                    <p className="text-xs font-semibold text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#006E44] animate-ping" />
                        Memuat data...
                    </p>
                </div>
            )}

            {!loadingPelanggan && !error && !adaHalamanLain && listPelanggan.length > 0 && (
                <p className="text-center text-xs text-slate-400 font-medium pt-1">
                    Semua data sudah ditampilkan
                </p>
            )}
        </main>

    );
}
