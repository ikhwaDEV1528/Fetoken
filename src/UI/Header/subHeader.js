'use client'

export function SubHeader({ title = '', subtitle = '', right = null , bg}) {
    const handleBack = () => {
        if (typeof window !== 'undefined') {
            window.history.back()
        }
    }

    return (
        <header className={`sticky top-0 z-40 w-full ${`bg-${bg}-600`} backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200 pt-[env(safe-area-inset-top)]`}>
            <div className="mx-auto flex h-16 sm:h-20 w-full max-w-6xl items-center gap-3 px-3.5 sm:px-6 lg:px-8">

                {/* Tombol Back Mobile-First Touch Friendly */}
                <button
                    type="button"
                    onClick={handleBack}
                    aria-label="Kembali"
                    className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-800 border border-slate-200/60 transition-all hover:bg-slate-200/80 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-12 sm:w-auto sm:gap-2 sm:rounded-2xl sm:pl-3.5 sm:pr-5 cursor-pointer"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-slate-800 transition-transform group-hover:-translate-x-0.5"
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    <span className="hidden text-sm font-extrabold text-slate-800 sm:inline">Kembali</span>
                </button>

                {/* Separator Tipis Desktop */}
                <div className="hidden sm:block w-px h-8 bg-slate-200/80 shrink-0" />

                {/* Judul & Subtitle */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                    {title && (
                        <h1 className="truncate text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                            {title}
                        </h1>
                    )}
                    {subtitle && (
                        <p className="truncate text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Slot Kanan (Aksi Tambahan) */}
                {right && (
                    <div className="flex shrink-0 items-center gap-2">
                        {right}
                    </div>
                )}

            </div>
        </header>
    )
}
