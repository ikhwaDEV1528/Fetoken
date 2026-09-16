'use client'

import Image from "next/image";
import axios from "axios";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

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
        {
          label: 'Daftar Barang',
          subLabel: 'Lihat & kelola inventaris barang',
          icon: 'bi bi-list-ul',
          path: '/Admin/Barang',
        },
        {
          label: 'Stok Opname Barang',
          subLabel: 'Monitoring log pergerakan stok',
          icon: 'bi bi-box-seam',
          path: '/User/profil',
        },
      ],
    },
    {
      id: 'transaksi',
      label: 'Transaksi Barang',
      icon: 'bi bi-cart-plus',
      type: 'dropdown',
      children: [
        {
          label: 'Penjualan Barang',
          subLabel: 'Kasir & pencatatan penjualan',
          icon: 'bi bi-cart-plus',
          path: '/Admin/Penjualan',
        },
        {
          label: 'Belanja Barang',
          subLabel: 'Pembelian stok & supplier',
          icon: 'bi bi-cash-coin',
          path: '/Admin/BelanjaBarang',
        },
      ],
    },
    {
      id: 'faktur transaksi barang',
      label: 'Faktur Transaksi Barang',
      icon: 'bi bi-cart-plus',
      type: 'dropdown',
      children: [
        {
          label: 'Faktur Penjualan Barang',
          subLabel: 'Kasir & pencatatan penjualan',
          icon: 'bi bi-cart-plus',
          path: '/Admin/LihatPenjualanBarang',
        },
        {
          label: 'Faktur Belanja Barang',
          subLabel: 'Pembelian stok & supplier',
          icon: 'bi bi-cash-coin',
          path: '/Admin/LihatPembelianBarang',
        },
      ],
    },
    {
      id: 'laporan',
      label: 'Laporan',
      icon: 'bi bi-stickies',
      type: 'dropdown',
      children: [
        {
          label: 'Ringkasan Laporan/ Laba penjualan',
          subLabel: 'Laporan penjualan & checkout',
          icon: 'bi bi-file-earmark-text',
          path: '/User/Checkout',
        }, 
        {
          label: 'Piutang Pelanggan',
          subLabel: 'Laporan penjualan & checkout',
          icon: 'bi bi-file-earmark-text',
          path: '/User/Checkout',
        },
         {
          label: 'Oprasional',
          subLabel: 'Laporan penjualan & checkout',
          icon: 'bi bi-file-earmark-text',
          path: '/User/Checkout',
        },
         {
          label: 'Return Barang',
          subLabel: 'Laporan penjualan & checkout',
          icon: 'bi bi-file-earmark-text',
          path: '/User/Checkout',
        },
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

  return (
<header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md antialiased shadow-sm transition-all">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16 gap-4">
      
      {/* Logo & Brand Identity */}
<div className="group flex items-center gap-3 shrink-0 pl-1 pr-2.5 py-1 rounded-xl hover:bg-slate-50 transition-colors duration-200 cursor-pointer">
  <div className="relative w-9 h-9 shrink-0">
    <div className="relative w-full h-full overflow-hidden rounded-xl ring-1 ring-slate-900/10 group-hover:ring-emerald-500/30 transition-all duration-200">
      <Image
        alt="Profile Avatar"
        className="object-cover"
        fill
        src={'/tujuh.jpeg'}
      />
    </div>
    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
  </div>

  <div className="flex flex-col min-w-0">
    <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 leading-none truncate">
      ikhwan
    </span>
    <div className="flex items-center gap-1 mt-1">
      <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
      <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase truncate">
        CV Putra Bakhti Pratama
      </span>
    </div>
  </div>

  <svg
    className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors duration-200 shrink-0 hidden sm:block"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
  </svg>
</div>

      {/* Desktop Navigation Menu: Sekarang aktif mulai breakpoint lg (1024px+) */}
      <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 shrink-0">
        {menuList.map((menu) => {
          if (menu.type === 'link') {
            const isActive = pathname === menu.path;
            return (
              <button
                key={menu.id}
                onClick={() => navigasi(menu.path)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <i className={`${menu.icon} text-sm ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}></i>
                <span className="whitespace-nowrap">{menu.label}</span>
              </button>
            );
          }

          const isChildActive = menu.children.some((child) => child.path === pathname);

          return (
            <div
              key={menu.id}
              className="relative"
              onMouseEnter={() => setOpenDropdown(menu.id)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  openDropdown === menu.id || isChildActive
                    ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <i className={`${menu.icon} text-sm ${isChildActive || openDropdown === menu.id ? 'text-emerald-600' : 'text-slate-400'}`}></i>
                <span className="whitespace-nowrap">{menu.label}</span>
                <i className={`bi bi-chevron-down text-[10px] transition-transform duration-200 ${openDropdown === menu.id ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`}></i>
              </button>

              {/* Dropdown Card */}
              {openDropdown === menu.id && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xl z-50">
                  {menu.children.map((child, idx) => {
                    const isActive = pathname === child.path;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          navigasi(child.path);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-colors group ${
                          isActive ? 'bg-emerald-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-600'
                        }`}>
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
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Right Action Tools & Logout */}
      <div className="flex items-center gap-2">
        
        <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

        <button 
          onClick={Logout}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all"
        >
          <i className="bi bi-box-arrow-right text-sm"></i>
          <span>Logout</span>
        </button>

        {/* Mobile/Tablet Toggle Button: Tampil di bawah lg (<1024px) */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
          aria-label="Toggle Navigation"
        >
          <i className={`bi ${isMobileMenuOpen ? 'bi-x-lg' : 'bi-list'} text-xl`}></i>
        </button>
      </div>
    </div>
  </div>

  {/* Mobile/Tablet Navigation Drawer: Menangani layar sampai dengan <1024px */}
  {isMobileMenuOpen && (
    <div className="lg:hidden border-t border-slate-100 bg-white/95 px-4 pt-2 pb-4 shadow-xl space-y-2">
      {menuList.map((menu) => {
        if (menu.type === 'link') {
          const isActive = pathname === menu.path;
          return (
            <button
              key={menu.id}
              onClick={() => {
                navigasi(menu.path);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                  : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <i className={`${menu.icon} text-base ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}></i>
              <span>{menu.label}</span>
            </button>
          );
        }

        const isAccordionOpen = openDropdown === menu.id;

        return (
          <div key={menu.id} className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60">
            <button
              onClick={() => setOpenDropdown(isAccordionOpen ? null : menu.id)}
              className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <i className={`${menu.icon} text-base text-emerald-600`}></i>
                <span>{menu.label}</span>
              </div>
              <i className={`bi bi-chevron-down text-xs transition-transform duration-200 ${isAccordionOpen ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`}></i>
            </button>

            {isAccordionOpen && (
              <div className="px-2 pb-2 space-y-1 bg-white pt-1 border-t border-slate-100">
                {menu.children.map((child, idx) => {
                  const isActive = pathname === child.path;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        navigasi(child.path);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-50'
                      }`}
                    >
                      <i className={`${child.icon} text-sm ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}></i>
                      <span>{child.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Session Active</span>
        <button 
          onClick={Logout}
          className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  )}
</header>
  );
}