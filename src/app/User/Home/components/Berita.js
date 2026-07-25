'use client'
import Image from "next/image"

export function Berita () {

   
   const Data = [
    {logo:'/foto_pp.jpeg' , nama:'Kreator Magang' , tag:'#VirayFypToktok2026k' , postingan:'/vidio.mp4',deskripsi:'Makan enak ditemani dengan dede wulan imup yang cantik,gemash dan lucuu semuanya pokoknya!'},
        {logo:'/foto_pp.jpeg' , nama:'Kreator Magang' , tag:'#VirayFypToktok2026k' , postingan:'/game.png',deskripsi:'Makan enak ditemani dengan dede wulan imup yang cantik,gemash dan lucuu semuanya pokoknya!'},
            {logo:'/foto_pp.jpeg' , nama:'Kreator Magang' , tag:'#VirayFypToktok2026k' , postingan:'/codingan.png',deskripsi:'Makan enak ditemani dengan dede wulan imup yang cantik,gemash dan lucuu semuanya pokoknya!'},
                {logo:'/foto_pp.jpeg' , nama:'Kreator Magang' , tag:'#VirayFypToktok2026k' , postingan:'/bakhti.png',deskripsi:'Makan enak ditemani dengan dede wulan imup yang cantik,gemash dan lucuu semuanya pokoknya!'},
                    {logo:'/foto_pp.jpeg' , nama:'Kreator Magang' , tag:'#VirayFypToktok2026k' , postingan:'/tujuh.jpeg',deskripsi:'Makan enak ditemani dengan dede wulan imup yang cantik,gemash dan lucuu semuanya pokoknya!'}
   ]


    return (
        <main className="main-conatiner flex flex-col gap-0 ">
           {Data.map((item,index)=> (
            <div className="card-content px-0 border-1 flex flex-col gap-2" key={index}>

              <div className="header-berita flex gap-2 font-bold py-2 px-2">
                <img className="image-berita rounded-full h-12 w-12" src={item.logo}></img>
                 <p className="border-b-2">{item.nama}</p>
              </div>

              <div className="px-2">
                <p>{item.deskripsi}</p>
              </div>

              <div className="text-blue-600 px-2">
                <p>{item.tag}</p>
              </div>

              <div className="w-full">
                {item.postingan.split(".")[1] == 'mp4' ? <video autoPlay={true} loop  className="w-full" src={item.postingan}></video> : <img className="w-full" src={item.postingan}/>}
              </div>

              <div className="flex gap-5 py-3 px-2">
                <p>Like</p>
                <p>Coments</p>
                <p>Share</p>
              </div>
            </div>
           ))}
        </main>
    )
}