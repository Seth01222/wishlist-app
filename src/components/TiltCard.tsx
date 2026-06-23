'use client'

import { useRef, MouseEvent, ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  intensity?: number  // degrees of tilt, default 8
}

export default function TiltCard({ children, className = '', intensity = 8 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const sheen = useRef<HTMLDivElement>(null)

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width   // 0→1
    const y = (e.clientY - r.top)  / r.height  // 0→1
    const tx = (0.5 - y) * intensity
    const ty = (x - 0.5) * intensity
    el.style.transform = `perspective(900px) rotateX(${tx}deg) rotateY(${ty}deg) scale3d(1.025,1.025,1.025)`
    if (sheen.current) {
      sheen.current.style.opacity = '1'
      sheen.current.style.background =
        `radial-gradient(circle at ${x*100}% ${y*100}%, rgba(255,255,255,0.14) 0%, transparent 65%)`
    }
  }

  function onLeave() {
    if (ref.current) {
      ref.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
    }
    if (sheen.current) sheen.current.style.opacity = '0'
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative ${className}`}
      style={{
        transition: 'transform 0.18s cubic-bezier(0.23, 1, 0.32, 1)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      {/* Sheen overlay — follows cursor */}
      <div
        ref={sheen}
        className="absolute inset-0 rounded-2xl pointer-events-none z-10 opacity-0"
        style={{ transition: 'opacity 0.25s ease' }}
      />
      {children}
    </div>
  )
}
