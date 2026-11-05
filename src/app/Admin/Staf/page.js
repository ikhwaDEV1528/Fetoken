'use client'

import { useState } from "react"
import { HeaderStaf } from "./components/header.js"
import { ListStaf } from "./components/ListStaf.js"

export default function Staf() {
    const [refreshKey, setRefreshKey] = useState(0)

    return (
        <main>
            <HeaderStaf onSuccess={() => setRefreshKey((k) => k + 1)} />
            <ListStaf key={refreshKey} />
        </main>
    )
}