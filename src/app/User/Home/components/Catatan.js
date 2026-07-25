'use client'




export function Catatan () {


    return (
        <main className="w-full mt-2 px-1 flex flex-col">
          <textarea className="border-1 w-full px-2 py-2" rows={4} placeholder="Bagikan moment Anda , Tulis sekarang juga!"></textarea>
          <div className="flex justify-between px-4 py-2">
            <p></p>
            <button className="bg-pink-500 text-white rounded-xl font-bold px-5 py-1">Posting</button>
          </div>
        </main>
    )
}