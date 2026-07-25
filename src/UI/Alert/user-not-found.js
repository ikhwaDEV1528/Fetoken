'use client'


export function User_not_found ({params,state}) {
   

    if(!params) return;

    return (
        <main className={`fixed inset-0 bg-gray-300/70 flex flex-col items-center justify-center`}>
          <div className="bg-white min-h-50 rounded-lg min-w-sm lg:min-w-lg gap-10 flex flex-col items-center justify-center">
            <h1 className="text-[15px] text-red-500 font-bold">User tidak ditemukan!</h1>
            <button className="bg-blue-600 text-white font-extrabold px-4 py-1 rounded-md" onClick={()=> state(prev => ({...prev,isAlert:false}))}>Close</button>
          </div>
        </main>
    )
}