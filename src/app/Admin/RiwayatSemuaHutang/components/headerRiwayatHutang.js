"use client"





export function HeaderHutangSupplier () {


    return (
        <header className="flex justify-between">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-slate-800 transition-transform group-hover:-translate-x-0.5"
                onClick={()=> window.navigation.back()}
            >
                <path d="M15 18l-6-6 6-6" />
            </svg>

          
        </header>
    )
}