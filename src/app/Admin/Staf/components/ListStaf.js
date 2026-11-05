'use client'

import { Konteks } from "@/GlobalNilai/Global";
import { LoadingRequest } from "@/UI/Loading/LoadingRequest";
import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { HeaderStaf } from "./header";

export function ListStaf() {
    const [page, setPage] = useState(1);
    const [listStaf, setListStaf] = useState([]);
    const [hasMore, setHasMore] = useState(true); // Flag jika data sudah habis
    const { loading, setLoading } = useContext(Konteks);

    async function GET_ADMIN(currentPage) {
        setLoading(prev => ({
            ...prev,
            LoadingRequest: true
        }));

        try {
            const API = '/api-be/SERVER_ADMIN/GET_ADMIN';
            const ress = await axios.get(API, {
                params: { page: currentPage }
            });

            // Sesuaikan key dengan backend (contoh: ress.data.data atau ress.data.staf)
            const newStaf = ress.data.data || [];

            // Jika API mengembalikan array kosong, hentikan infinite scroll
            if (newStaf.length === 0) {
                setHasMore(false);
                return;
            }

            if (currentPage === 1) {
                setListStaf(newStaf);
            } else {
                // Spread operator (...) wajib untuk merge array
                setListStaf(prev => [...prev, ...newStaf]);
            }

        } catch (err) {
            alert(`ERROR: ` + (err?.response?.data?.message || err.message));
        } finally {
            setLoading(prev => ({
                ...prev,
                LoadingRequest: false
            }));
        }
    }

    // Effect khusus untuk Fetch Data berdasarkan Perubahan Page
    useEffect(() => {
        GET_ADMIN(page);
    }, [page]);

    // Effect khusus untuk Event Listener Scroll
    useEffect(() => {
        const handleScroll = () => {
            const isBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
            
            // Cek LoadingRequest (bukan object loading) dan flag hasMore
            if (isBottom && !loading?.LoadingRequest && hasMore) {
                setPage(prev => prev + 1);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loading?.LoadingRequest, hasMore]);

    return (
       <main className="min-h-screen bg-slate-50 p-3 sm:p-6 text-slate-800 font-sans">
    {/* Loading Indicator */}
    {loading?.LoadingRequest && <LoadingRequest />}

    <div className="max-w-6xl mx-auto space-y-4">
        {/* Header Clean Emerald */}
         

        {/* --- MOBILE VIEW: Native Card Layout (< md) --- */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
            {listStaf.map((item, index) => (
                <div 
                    key={item.id_admin || item.id || index}
                    className="bg-white border border-emerald-100/80 rounded-2xl p-4 shadow-sm space-y-2.5"
                >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center font-mono font-bold text-emerald-700 text-xs">
                                #{item.id_admin || index + 1}
                            </span>
                            <h2 className="font-bold text-slate-900 text-sm">
                                {item.username}
                            </h2>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 border border-emerald-200/60 text-emerald-700">
                            {item.role || 'Admin'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 text-xs">
                        <div>
                            <span className="text-slate-400 text-[10px] uppercase font-mono block">No HP</span>
                            <span className="text-slate-700 font-mono font-medium">{item.no_hp || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 text-[10px] uppercase font-mono block">Alamat</span>
                            <span className="text-slate-600 leading-relaxed">{item.alamat || '-'}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* --- DESKTOP VIEW: Clean Emerald Table (>= md) --- */}
        <div className="hidden md:block rounded-2xl border border-emerald-100 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-emerald-50/60 border-b border-emerald-100 text-emerald-900 uppercase font-mono text-[11px] tracking-wider">
                            <th className="py-3.5 px-5 font-bold">ID</th>
                            <th className="py-3.5 px-5 font-bold">Username</th>
                            <th className="py-3.5 px-5 font-bold">Role</th>
                            <th className="py-3.5 px-5 font-bold">No HP</th>
                            <th className="py-3.5 px-5 font-bold">Alamat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {listStaf.map((item, index) => (
                            <tr 
                                key={item.id_admin || item.id || index}
                                className="hover:bg-emerald-50/30 transition-colors"
                            >
                                <td className="py-3.5 px-5 font-mono text-emerald-700 font-bold text-xs">
                                    #{item.id_admin}
                                </td>
                                <td className="py-3.5 px-5 font-semibold text-slate-900">
                                    {item.username}
                                </td>
                                <td className="py-3.5 px-5">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 border border-emerald-200/80 text-emerald-800">
                                        {item.role || 'Admin'}
                                    </span>
                                </td>
                                <td className="py-3.5 px-5 font-mono text-slate-600 text-xs">
                                    {item.no_hp || '-'}
                                </td>
                                <td className="py-3.5 px-5 text-slate-500 max-w-sm truncate">
                                    {item.alamat || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</main>
    );
}