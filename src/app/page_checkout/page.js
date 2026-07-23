'use client'

import {usestate , useEffect}  from 'react';
import Headers from '@/components/Headers';
import List_item from '@/components/List_produk';



export default function page_checkut(){




    return(
        <main className='container flex flex-col min-w-screen bg-gray-100'>
           <Headers/>
           <List_item/>
        </main>
    )
}