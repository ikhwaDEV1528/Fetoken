'use client'

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks";
import { Header } from "@/UI/Header/Header";
import { Berita } from "@/app/User/Home/components/Berita";
import { Catatan } from "./Components/Catatan";
import { DashboardMonitoringPage } from "./Components/jumlahJualdanBeli";
import { TimeoutNotif } from "@/UI/timeoutNotif/timeoutNotif";


export default function Dashboard() {
  const Navigasi = useRouter();


  return (
    <CEK_HAK_AKSES>

      <main className="">

        <Header />
        <div className="px-2">
          <Catatan />
          <DashboardMonitoringPage/>
        </div>

        <TimeoutNotif />

      </main>
    </CEK_HAK_AKSES>

  )
}