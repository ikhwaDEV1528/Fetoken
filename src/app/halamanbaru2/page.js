'use client'
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import  './swipe.css'

export default function HalamanBaru2() {
  const [dataRender, setDataRender] = useState([]);
  const [dataProduk, setDataProduk] = useState([]);
  const [isCart, setIsCart] = useState([]);

  useEffect(() => {
    async function getDataProduk() {
      const alamat = doc(db, "produk", "ikhwan");
      const ress = await getDoc(alamat);
      if (ress.exists()) {
        const data = ress.data();
        setDataRender(data.totalCart);
        setIsCart(data.totalMenu);
        console.log(data);
      } else {
        console.log("belum ada data");
      }
    }
    getDataProduk();
  }, []);

  useEffect(() => {
    const API = "http://localhost:5000/api/daftar";
    axios
      .get(API)
      .then((ress) => {
        setDataProduk(ress.data);
      })
      .catch((err) => {
        alert("gagal" + err);
      });
  }, []);

  function Edit(index) {
    const salinanRender = [...dataRender];
    salinanRender[index] += 1;
    setDataRender(salinanRender);

    updateData(salinanRender);
  }

  async function updateData(salinanCart) {
    await updateDoc(doc(db, "produk", "ikhwan"), { totalCart: salinanCart });
  }

  function cart(index) {
    const salinanIsCart = [...isCart];
    salinanIsCart[index] = 1;
    setIsCart(salinanIsCart);

    updateIsCart(salinanIsCart);
  }

  async function updateIsCart(salinanIsCart) {
    await updateDoc(doc(db, "produk", "ikhwan"), { totalMenu: salinanIsCart });
  }

  return (
    <div>

      <div className="relative">
        {dataProduk.map((item, index) => (
          <div key={index}>
            <p>{item.nama}</p>
            <p>
              {dataRender[index]}{" "}
              <button onClick={() => cart(index)}>cart</button>
            </p>
            <button onClick={() => Edit(index)}>edit</button>
          </div>
        ))}
      </div>


      <div className="relative top-[-1000px] left-[300px] flex flex-col gap-[10px]">
        <div
          style={{
            display:
              isCart.reduce((acc, curr) => acc + curr, 0) !== 0
                ? "block"
                : "none",
          }}
        >
          <p className="bg-red-500 text-white w-5 h-5 flex justify-center items-center rounded-lg">
            {isCart.reduce((acc, curr) => acc + curr, 0)}
          </p>
        </div>
        {dataProduk.map((item, index) => (
          <div
            key={index}
            style={{ display: isCart[index] === 1 ? "block" : "none" }}
            className="bg-red-100"
          >
            <p>{item.nama}</p>
          </div>
        ))}
      </div>

  
     
    </div>
  );
}
