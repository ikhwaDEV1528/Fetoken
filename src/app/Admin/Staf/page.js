'use client'

import { useState } from "react"
import { HeaderStaf } from "./components/header.js"
import { ListStaf } from "./components/ListStaf.js"
import { CEK_HAK_AKSES } from "@/app/Hooks/Hooks.js"

export default function Staf() {
    const [refreshKey, setRefreshKey] = useState(0)

    return (
        <CEK_HAK_AKSES>
        <main>
            <HeaderStaf onSuccess={() => setRefreshKey((k) => k + 1)} />
            <ListStaf key={refreshKey} />
        </main>
        </CEK_HAK_AKSES>
    )
}