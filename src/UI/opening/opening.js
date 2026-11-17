'use client'

import { useEffect, useState } from 'react'
import StrokeText from '@/reactbits/stroketeks/StokeTeks'

const SHOW_MS = 3000 // lama splash tampil penuh
const FADE_MS = 700  // lama proses memudar

export function Opening({ children }) {
    const [phase, setPhase] = useState('show') // show -> fade -> gone

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('fade'), SHOW_MS)
        const t2 = setTimeout(() => setPhase('gone'), SHOW_MS + FADE_MS)
        return () => {
            clearTimeout(t1)
            clearTimeout(t2)
        }
    }, [])

    return (
        <>
            {/* Halaman utama sudah siap di belakang splash */}
            <div
                style={{
                    opacity: phase === 'show' ? 0 : 1,
                    transform: phase === 'show' ? 'scale(0.99)' : 'scale(1)',
                    transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
                }}
            >
                {children}
            </div>

            {phase !== 'gone' && (
                <main
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        background: '#ffffff',
                        opacity: phase === 'fade' ? 0 : 1,
                        transition: `opacity ${FADE_MS}ms ease`,
                        pointerEvents: phase === 'fade' ? 'none' : 'auto',
                    }}
                >
                    <img
                        src="/logo.jpg"
                        alt="Logo CV Putra Bakhti Pratama"
                        style={{
                            width: 'clamp(96px, 28vmin, 160px)',
                            height: 'auto',
                            transform: phase === 'fade' ? 'scale(1.06)' : 'scale(1)',
                            transition: `transform ${FADE_MS}ms ease`,
                        }}
                    />
                  

                    <StrokeText
                        text="CV Putra Bakhti Pratama"
                        strokeColor="#075a2b"
                        strokeStyle="solid"
                        strokeWidth={1.4}
                        dashLength={10}
                        drawDuration={1.6}
                        fillDelay={0.2}
                        stagger={0.05}
                        ease="power2.out"
                        trigger="mount"
                        fillMode="wipe"
                        wipeFrom="left"
                        fontSize={128}
                        fontWeight={800}
                        letterSpacing={-4}
                        marching={false}
                        hoverRedraw
                        shadow={false}
                        fontFamily="inherit"
                        reverse={false}
                    />
                </main>
            )}
        </>
    )
}