'use client'



export function TimeoutNotif({isActive = false}) {



    function backLogin(){
        isActive = false;
        window.location.href = '/'
    }


    return (
        <main className={`${isActive ? 'block':'hidden'} fixed inset-0 justify-center bg-emerald-700/90 z-50 flex flex-col items-center gap-4 py-10 px-6  shadow-lg-100 lg:inset-0 lg:justify-center lg:bg-gray-800/60`}>
            <img
                className="w-90 h-50 rounded-lg object-cover"
                src="/timeout.jpg"
                alt="Sesi Berakhir"
            />
            <span className="font-extrabold text-sm md:text-md text-center text-white lg:text-white">
                Sesi waktu habis, Silahkan login kembali,ya!
            </span>
            <button
                onClick={()=> backLogin()}
                type="button"
                className="bt-timeout w-xs h-10 bg-white active-scale-95 md:min-w-sm text-emerald-600 font-extrabold rounded-full transition-colors lg:max-w-lg cursor-pointer"
            >
                OKE
            </button>
        </main>
    )
}