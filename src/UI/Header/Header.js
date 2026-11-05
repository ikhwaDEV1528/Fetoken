'use client'

import Image from "next/image";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileAccordion, setMobileAccordion] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  // Struktur Menu Dropdown
  const menuList = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'bi bi-house-door-fill',
      path: '/Admin/Dashboard',
      type: 'link',
    },
    {
      id: 'barang',
      label: 'Barang',
      icon: 'bi bi-basket3',
      type: 'dropdown',
      children: [
        { label: 'Daftar Barang', subLabel: 'Lihat & kelola inventaris barang', icon: 'bi bi-list-ul', path: '/Admin/Barang' },
        { label: 'Stok Opname Barang', subLabel: 'Monitoring log pergerakan stok', icon: 'bi bi-box-seam', path: '/Admin/StokOpname' },
        { label: 'Stok log', subLabel: 'Riwayat barang masuk & keluar', icon: 'bi bi-box-seam', path: '/Admin/Stoklog' },
        { label: 'Barang rusak', subLabel: 'Riwayat barang rusak', icon: 'bi bi-box-seam', path: '/Admin/BarangRusak' },
      ],
    },
    {
      id: 'user',
      label: '  User',
      icon: 'bi bi-person-gear',
      type: 'dropdown',
      children: [
        { label: 'Karyawan', subLabel: 'Lihat & kelola inventaris barang', icon: 'bi bi-people-fill', path: '/Admin/Staf' },
        { label: 'Pelanggan', subLabel: 'Monitoring log pergerakan stok', icon: 'bi bi-box-seam', path: '/Admin/Pelanggan' },
        { label: 'Supplier', subLabel: 'Monitoring log pergerakan stok', icon: 'bi bi-box-seam', path: '/Admin/Supplier' },
      ],
    },
    {
      id: 'transaksi',
      label: 'Transaksi Barang',
      icon: 'bi bi-cart-plus',
      type: 'dropdown',
      children: [
        { label: 'Penjualan Barang', subLabel: 'Kasir & pencatatan penjualan', icon: 'bi bi-cash-coin', path: '/Admin/Penjualan' },
        { label: 'Belanja Barang', subLabel: 'Pembelian stok & supplier', icon: 'bi bi-cart-plus', path: '/Admin/BelanjaBarang' },
      ],
    },
    {
      id: 'faktur dan Surat jalan',
      label: 'Faktur dan Surat jalan',
      icon: 'bi bi-receipt',
      type: 'dropdown',
      children: [
        { label: 'Faktur Penjualan Barang', subLabel: 'Kasir & pencatatan penjualan', icon: 'bi bi-receipt', path: '/Admin/LihatPenjualanBarang' },
        { label: 'Faktur Belanja Barang', subLabel: 'Pembelian stok & supplier', icon: 'bi bi-receipt', path: '/Admin/LihatPembelianBarang' },
        { label: 'Surat jalan', subLabel: 'Surat jalan pengiriman', icon: 'bi bi-receipt', path: '/Admin/SuratJalan' },
      ],
    },
    {
      id: 'laporan',
      label: 'Laporan keuangan',
      icon: 'bi bi-stickies',
      type: 'dropdown',
      children: [
        { label: 'Ringkasan Laporan/ Laba penjualan', subLabel: 'Laporan penjualan & checkout', icon: 'bi bi-file-earmark-text', path: '/Admin/Lapkeu' },
        { label: 'Piutang Pelanggan', subLabel: 'Laporan hutang pelanggan', icon: 'bi bi-file-earmark-text', path: '/Admin/Piutang' },
        { label: 'Hutang Toko', subLabel: 'Laporan Hutang Toko CV Putra Bakhti Pratama', icon: 'bi bi-file-earmark-text', path: '/Admin/HutangToko' },
        { label: 'Oprasional', subLabel: 'Laporan beban operasional', icon: 'bi bi-file-earmark-text', path: '/Admin/Oprasional' },
        { label: 'Penjualan Sales', subLabel: 'Laporan omset penjualan sales', icon: 'bi bi-file-earmark-text', path: '/Admin/PenjualanSales' },
        { label: 'Refund', subLabel: 'Kewajiban Toko untuk membayar kembalian pelanggan', icon: 'bi bi-file-earmark-text', path: '/Admin/Refund' },
        { label: 'Tagihan Sales', subLabel: 'Tagihan sales', icon: 'bi bi-file-earmark-text', path: '/Admin/LaporanSales' }
      ],
    },
    {
      id: 'ppn',
      label: 'Laporan PPN (Pajak)',
      icon: 'bi bi-bank2',
      type: 'dropdown',
      children: [
        { label: 'Rekap PPN (Pajak)', subLabel: 'Kasir & pencatatan penjualan', icon: 'bi bi-bank2', path: '/Admin/RekapPajak' },
      ],
    },
    {
      id: 'Retur',
      label: 'Retur',
      icon: 'bi bi-recycle',
      type: 'dropdown',
      children: [
        {
          type: 'group',
          label: 'Penjualan',
          items: [
            { label: 'Buat Retur Penjualan', subLabel: 'Kasir & pencatatan penjualan', icon: 'bi bi-plus-circle', path: '/Admin/Retur' },
            { label: 'Riwayat Retur Penjualan', subLabel: 'Daftar retur dari pelanggan', icon: 'bi bi-clock-history', path: '/Admin/RiwayatReturPenjualan' },
          ]
        },
        {
          type: 'group',
          label: 'Pembelian',
          items: [
            { label: 'Buat Retur Pembelian', subLabel: 'Pembelian stok & supplier', icon: 'bi bi-plus-circle', path: '/Admin/ReturBelanja' },
            { label: 'Riwayat Retur Pembelian', subLabel: 'Daftar retur ke supplier', icon: 'bi bi-clock-history', path: '/Admin/RiwayatReturPembelian' },
          ]
        }
      ],
    },
  ];

  function navigasi(valueRoute) {
    router.push(valueRoute);
  }

  async function Logout() {
    try {
      const API = '/api-be/AUTH/LOGOUT';
      const ress = await axios.delete(API);
      alert(ress.data?.message || "Berhasil logout");
      window.location.href = ress.data?.navigasi || '/';
    } catch (err) {
      alert(err.message || "Gagal logout");
    }
  }

  function openMenu(id) {
    clearTimeout(closeTimer.current);
    setOpenDropdown(id);
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  }

  // Fungsi Helper untuk merender item anak (agar kode lebih rapi)
  const renderDropdownItem = (child, idx) => {
    const isActive = pathname === child.path;
    return (
      <button
        key={idx}
        onClick={() => {
          navigasi(child.path);
          setOpenDropdown(null);
          setIsMobileMenuOpen(false); // Menutup menu mobile juga (jika aktif)
        }}
        className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-colors group ${isActive ? 'bg-emerald-50/80' : 'hover:bg-slate-50'}`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-600'}`}>
          <i className={`${child.icon} text-sm`}></i>
        </div>
        <div>
          <div className={`text-xs font-bold ${isActive ? 'text-emerald-600' : 'text-slate-800 group-hover:text-emerald-600'}`}>
            {child.label}
          </div>
          <div className="text-[11px] text-slate-400 font-medium leading-snug">
            {child.subLabel}
          </div>
        </div>
      </button>
    );
  };

  const renderMobileDropdownItem = (child, idx) => {
    const isActive = pathname === child.path;
    return (
      <button
        key={idx}
        onClick={() => {
          navigasi(child.path);
          setIsMobileMenuOpen(false);
        }}
        className={`w-full text-left flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'}`}
      >
        <i className={`${child.icon} text-sm ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}></i>
        <span>{child.label}</span>
      </button>
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full rounded-b-[28px] bg-gradient-to-b from-emerald-600 to-emerald-700 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? "shadow-lg shadow-emerald-900/30" : "shadow-sm shadow-emerald-900/10"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[70px] gap-3">

          {/* SISI KIRI */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="group flex items-center gap-3 shrink-0 -ml-1.5 pl-1.5 pr-2.5 py-1.5 rounded-2xl active:scale-[0.97] active:bg-white/15 hover:bg-white/10 transition-all duration-150"
            >
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0">
                <div className="relative w-full h-full overflow-hidden rounded-full ring-2 ring-white/25 shadow-md">
                  <Image alt="Profile Avatar" className="object-cover" fill src={'/tujuh.jpeg'} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-300 opacity-60" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-400 ring-2 ring-emerald-700" />
                </span>
              </div>

              <div className="flex flex-col min-w-0 items-start">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white leading-none truncate">
                  ikhwan
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1 h-1 rounded-full bg-lime-300 shrink-0" />
                  <span className="text-[10px] font-semibold text-emerald-50/90 tracking-wide truncate">
                    CV Putra Bakhti Pratama
                  </span>
                </div>
              </div>
              <i className="bi bi-chevron-down text-[11px] text-emerald-100/70 shrink-0 hidden sm:block group-hover:text-white transition-colors" />
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 bg-black/10 p-1.5 rounded-2xl border border-white/10 shrink-0">
              {menuList.map((menu) => {
                if (menu.type === 'link') {
                  const isActive = pathname === menu.path;
                  return (
                    <button
                      key={menu.id}
                      onClick={() => navigasi(menu.path)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 ${isActive ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-50/90 hover:text-white hover:bg-white/10'}`}
                    >
                      <i className={`${menu.icon} text-sm ${isActive ? 'text-emerald-600' : 'text-emerald-200'}`}></i>
                      <span className="whitespace-nowrap">{menu.label}</span>
                    </button>
                  );
                }

                // Cek apakah ada child path (termasuk yang di dalam grup) yang aktif
                const isChildActive = menu.children.some(child => 
                  child.type === 'group' 
                    ? child.items.some(item => item.path === pathname)
                    : child.path === pathname
                );
                
                const isOpen = openDropdown === menu.id;

                return (
                  <div
                    key={menu.id}
                    className="relative"
                    onMouseEnter={() => openMenu(menu.id)}
                    onMouseLeave={scheduleClose}
                  >
                    <button
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${isOpen || isChildActive ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-50/90 hover:text-white hover:bg-white/10'}`}
                    >
                      <i className={`${menu.icon} text-sm ${isChildActive || isOpen ? 'text-emerald-600' : 'text-emerald-200'}`}></i>
                      <span className="whitespace-nowrap">{menu.label}</span>
                      <i className={`bi bi-chevron-down text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {/* Dropdown Card */}
                    <div
                      className={`absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xl shadow-slate-900/10 z-50 origin-top transition-all duration-150 ${isOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"}`}
                    >
                      {menu.children.map((child, idx) => {
                        // Merender grup jika tipenya group
                        if (child.type === 'group') {
                          return (
                            <div key={`group-${idx}`} className={`${idx !== 0 ? 'mt-2 pt-2 border-t border-slate-100' : ''}`}>
                              <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {child.label}
                              </div>
                              {child.items.map((item, i) => renderDropdownItem(item, i))}
                            </div>
                          );
                        }
                        // Merender list biasa
                        return renderDropdownItem(child, idx);
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right Action Tools & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="h-5 w-px bg-white/20 mx-0.5 hidden sm:block"></div>
            <button
              onClick={Logout}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-rose-500/90 active:scale-95 border border-white/15 px-3.5 py-2 rounded-xl transition-all duration-150"
            >
              <i className="bi bi-box-arrow-right text-sm"></i>
              <span>Logout</span>
            </button>

            {/* Mobile/Tablet Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="p-2.5 w-10 h-10 grid place-items-center text-white active:bg-white/20 active:scale-90 rounded-full lg:hidden transition-all duration-150"
            >
              <i className={`bi ${isMobileMenuOpen ? 'bi-x-lg' : 'bi-list'} text-xl`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay mobile */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ top: "var(--header-h, 64px)" }}
        aria-hidden="true"
      />

      {/* Mobile Navigation Drawer */}
      <div
        className={`lg:hidden absolute left-0 right-0 top-full bg-white rounded-b-[28px] shadow-2xl shadow-slate-900/20 overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${isMobileMenuOpen ? "max-h-[calc(100vh-64px)] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div
          className="px-4 pt-3 pb-6 space-y-2 overflow-y-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)", maxHeight: "calc(100vh - 64px)" }}
        >
          {menuList.map((menu) => {
            if (menu.type === 'link') {
              const isActive = pathname === menu.path;
              return (
                <button
                  key={menu.id}
                  onClick={() => { navigasi(menu.path); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <i className={`${menu.icon} text-base ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}></i>
                  <span>{menu.label}</span>
                </button>
              );
            }

            const isAccordionOpen = mobileAccordion === menu.id;

            return (
              <div key={menu.id} className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60">
                <button
                  onClick={() => setMobileAccordion(isAccordionOpen ? null : menu.id)}
                  className="w-full flex items-center justify-between p-3.5 text-sm font-bold text-slate-700 active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <i className={`${menu.icon} text-base text-emerald-600`}></i>
                    <span>{menu.label}</span>
                  </div>
                  <i className={`bi bi-chevron-down text-xs transition-transform duration-200 ${isAccordionOpen ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`}></i>
                </button>

                <div className={`bg-white border-t border-slate-100 transition-[max-height] duration-200 ease-out overflow-hidden ${isAccordionOpen ? "max-h-[800px]" : "max-h-0"}`}>
                  <div className="px-2 pb-2 pt-1 space-y-1">
                    {menu.children.map((child, idx) => {
                      if (child.type === 'group') {
                        return (
                          <div key={`mob-group-${idx}`} className={`${idx !== 0 ? 'mt-3 pt-2 border-t border-slate-100' : 'mt-1'}`}>
                             <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {child.label}
                             </div>
                             {child.items.map((item, i) => renderMobileDropdownItem(item, i))}
                          </div>
                        )
                      }
                      return renderMobileDropdownItem(child, idx);
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Session Active
            </span>
            <button
              onClick={Logout}
              className="text-xs font-semibold text-white bg-rose-500 active:bg-rose-600 active:scale-95 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
            >
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}