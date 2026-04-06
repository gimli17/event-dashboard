'use client'

import { useRouter } from 'next/navigation'

export function BackLink({ label = 'Back' }: { href?: string; label?: string }) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-white transition-colors"
    >
      <span>&larr;</span> {label}
    </button>
  )
}
