'use client'


import { useState , useEffect } from "react";
import Image from "next/image";

export default function List_item(){
  
  const data = [
  {"nama_produk": "Kopi Susu Gula Aren", "harga": 18000, "deskripsi": "Perpaduan espresso espresso lokal premium dengan susu segar dan sirup gula aren asli.", "rating": 4.8},
  {"nama_produk": "Roti Bakar Bandung Cokelat Cheese", "harga": 22000, "deskripsi": "Roti bakar ukuran besar dengan isian cokelat lumer dan keju parut melimpah.", "rating": 4.6},
  {"nama_produk": "Kripik Singkong Pedas Jeruk", "harga": 15000, "deskripsi": "Keripik singkong renyah dengan bumbu cabai asli dan aroma daun jeruk yang segar.", "rating": 4.4},
  {"nama_produk": "Kaos Polos Cotton Combed 30s", "harga": 45000, "deskripsi": "Bahan katun 100% premium, adem, menyerap keringat, dan tidak mudah melar.", "rating": 4.7},
  {"nama_produk": "Botol Minum Tumblr Termos 500ml", "harga": 75000, "deskripsi": "Menjaga suhu air panas atau dingin hingga 12 jam. Desain minimalis elegan.", "rating": 4.5},
  {"nama_produk": "Sepatu Sneakers Kanvas Kasual", "harga": 149000, "deskripsi": "Sepatu kasual ringan dengan sol karet anti slip, cocok untuk kuliah dan jalan-jalan.", "rating": 4.3},
  {"nama_produk": "Tas Ransel Laptop Waterproof", "harga": 195000, "deskripsi": "Dilengkapi slot laptop hingga 15.6 inci dan bahan antiair untuk keamanan ekstra.", "rating": 4.6},
  {"nama_produk": "Dompet Kulit Pria Lipat Dua", "harga": 120000, "deskripsi": "Kulit sintetis premium dengan banyak slot kartu dan kompartemen uang kertas.", "rating": 4.4},
  {"nama_produk": "Casing HP Silikon Transparan", "harga": 12000, "deskripsi": "Case pelindung tipis dengan fitur anti-yellowing dan perlindungan sudut ekstra.", "rating": 4.2},
  {"nama_produk": "Lampu Meja Belajar LED Lipat", "harga": 65000, "deskripsi": "Kecerahan dapat diatur (3 tingkat) dan rechargeable menggunakan kabel USB.", "rating": 4.5},
  {"nama_produk": "Mouse Wireless Silent Click", "harga": 89000, "deskripsi": "Mouse tanpa kabel dengan teknologi silent klik agar tidak berisik saat kerja.", "rating": 4.6},
  {"nama_produk": "Keyboard Mekanikal RGB 60%", "harga": 349000, "deskripsi": "Keyboard compact dengan switch biru/merah yang responsif dan lampu latar RGB.", "rating": 4.7},
  {"nama_produk": "Headphone Bluetooth Over-Ear", "harga": 210000, "deskripsi": "Suara bass bertenaga, bantalan telinga empuk, dan baterai tahan hingga 20 jam.", "rating": 4.5},
  {"nama_produk": "Earphone TWS Bluetooth 5.3", "harga": 135000, "deskripsi": "Koneksi stabil tanpa delay, sangat cocok untuk mendengarkan musik atau gaming.", "rating": 4.4},
  {"nama_produk": "Kabel Data Fast Charging Type-C", "harga": 25000, "deskripsi": "Mendukung pengisian daya cepat hingga 3A dengan material nylon braided kuat.", "rating": 4.8},
  {"nama_produk": "Powerbank 10000mAh Dual Output", "harga": 115000, "deskripsi": "Desain slim, mudah dibawa ke dalam pesawat, dilengkapi indikator LED sisa baterai.", "rating": 4.6},
  {"nama_produk": "Sandal Selop Rumah Bulu Halus", "harga": 35000, "deskripsi": "Sandal dalam ruangan yang empuk, hangat, dan nyaman dipakai seharian.", "rating": 4.3},
  {"nama_produk": "Hijab Segiempat Paris Premium", "harga": 28000, "deskripsi": "Mudah dibentuk, tegak di dahi, tidak menerawang, tersedia dalam banyak warna.", "rating": 4.7},
  {"nama_produk": "Parfum Unisex EDT Scent 50ml", "harga": 99000, "deskripsi": "Aroma segar buah dan kayu yang tahan lama hingga 6-8 jam aktivitas luar ruangan.", "rating": 4.5},
  {"nama_produk": "Sabun Cuci Muka Jerawat Gel", "harga": 42000, "deskripsi": "Mengandung salicylic acid untuk meredakan kemerahan dan membersihkan pori-pori.", "rating": 4.4},
  {"nama_produk": "Serum Wajah Brightening Niacinamide", "harga": 68000, "deskripsi": "Membantu mencerahkan kulit kusam, memudarkan noda hitam, dan meratakan warna kulit.", "rating": 4.6},
  {"nama_produk": "Sunscreen Gel SPF 50 PA++++", "harga": 55000, "deskripsi": "Tabir surya berbahan dasar air yang ringan, cepat meresap tanpa efek whitecast.", "rating": 4.8},
  {"nama_produk": "Lilin Aromaterapi Lavender Soy", "harga": 49000, "deskripsi": "Terbuat dari lilin kedelai alami, memberikan efek relaksasi yang menenangkan.", "rating": 4.5},
  {"nama_produk": "Buku Agenda Jurnal Kulit A5", "harga": 58000, "deskripsi": "Kertas tebal tidak tembus tinta, dilengkapi tali pengikat dan pembatas buku.", "rating": 4.6},
  {"nama_produk": "Pena Gel Hitam Pack isi 12", "harga": 24000, "deskripsi": "Ketebalan garis 0.5mm, tinta mengalir lancar dan cepat kering, tidak bleber.", "rating": 4.7},
  {"nama_produk": "Gantungan Kunci Akrilik Custom", "harga": 15000, "deskripsi": "Bahan akrilik tebal cetak dua sisi dengan kualitas gambar tajam anti pudar.", "rating": 4.4},
  {"nama_produk": "Mug Keramik Custom Minimalis", "harga": 38000, "deskripsi": "Mug tahan panas, aman dimasukkan ke microwave, cocok untuk kado atau koleksi.", "rating": 4.5},
  {"nama_produk": "Kacamata Hitam Anti UV400", "harga": 85000, "deskripsi": "Lensa terpolarisasi yang melindungi mata dari silau matahari saat berkendara.", "rating": 4.3},
  {"nama_produk": "Jam Tangan Digital Sporty", "harga": 125000, "deskripsi": "Fitur lengkap: waterproof 50m, stopwatch, alarm, dan lampu latar malam.", "rating": 4.4},
  {"nama_produk": "Rak Sepatu Kain Portable 5 Susun", "harga": 69000, "deskripsi": "Mudah dirakit, rangka pipa besi kokoh, dilengkapi penutup debu resleting.", "rating": 4.2},
  {"nama_produk": "Panci Teflon Antilengket 22cm", "harga": 110000, "deskripsi": "Lapisan antilengket food grade berkualitas, panas merata, mudah dibersihkan.", "rating": 4.6},
  {"nama_produk": "Blender Portable Mini Juicer USB", "harga": 95000, "deskripsi": "Bikin jus segar di mana saja tinggal charge. Dilengkapi 4 mata pisau tajam.", "rating": 4.3},
  {"nama_produk": "Pisau Dapur Set Stainless Steel", "harga": 78000, "deskripsi": "Isi 5 pcs termasuk gunting dan talenan. Sangat tajam dan tahan karat.", "rating": 4.5},
  {"nama_produk": "Sapu dan Pengki Set Estetik", "harga": 52000, "deskripsi": "Desain tegak hemat tempat, bulu sapu halus efektif menyapu debu halus.", "rating": 4.4},
  {"nama_produk": "Handuk Mandi Dewasa Katun", "harga": 65000, "deskripsi": "Ukuran 70x140cm, daya serap air tinggi, lembut di kulit dan cepat kering.", "rating": 4.7},
  {"nama_produk": "Kemiri Goreng Asli Bumbu Dapur", "harga": 14000, "deskripsi": "Kemiri kupas pilihan yang sudah disangrai, siap pakai untuk menyedapkan masakan.", "rating": 4.6},
  {"nama_produk": "Madu Murni Alami 250gr", "harga": 85000, "deskripsi": "Madu hutan asli tanpa campuran gula, baik untuk menjaga imunitas tubuh.", "rating": 4.8},
  {"nama_produk": "Cokelat Batang Premium Dark 70%", "harga": 32000, "deskripsi": "Rasa cokelat hitam yang pekat dengan kadar gula rendah, cocok untuk diet.", "rating": 4.5},
  {"nama_produk": "Teh Hijau Celup Organik isi 25", "harga": 26000, "deskripsi": "Kaya antioksidan dengan rasa dan aroma teh hijau pegunungan yang menenangkan.", "rating": 4.6},
  {"nama_produk": "Matras Yoga Anti Slip TPE 6mm", "harga": 135000, "deskripsi": "Bahan TPE ramah lingkungan, empuk menjaga lutut, dan tidak licin saat berkeringat.", "rating": 4.7}
]


    return(

        <div className="container-list mt-20 flex flex-col w-full bg-white gap-5 px-3">

           <div className=" border-b-[1.9px]  border-dashed py-5 ">
              <p className="font-bold">Products Kenthu</p>
           </div>

           {data.map((item,index)=> (
            <div key={index} className="card_item flex border-b-2 justify-between border-dashed py-4">
                
               <div className="isi-card flex flex-col gap-2 w-[50%]">
                  <p className="font-bold text-gray-700 text-[15px]">{item.nama_produk}</p>
                  <p className="text-[13.5px] font-bold">⭐ {item.rating}</p>
                  <p className="text-[10px] text-gray-500">{item.deskripsi}</p>
                  <p className="font-bold">{item.harga.toLocaleString('id-ID', {currency:'IDR'})}</p>
               </div>

               <div className="">
                  <Image className="w-30 object-cover rounded-lg" width={400} height={40} src='/tujuh.jpeg'/>
                  <button className="bg-green-700 flex flex-col justify-center relative -top-4 left-3 z-100 items-center pb-1 text-white font-bold w-23 rounded-xl">Pesan</button>
               </div>
            </div>
           ))}
        </div>
    )
}