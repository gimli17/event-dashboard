import type { AccessLevel } from '@/lib/types'

const styles: Record<AccessLevel, string> = {
  founders: 'bg-violet-50 text-violet-600 border-violet-100',
  'founders-premium': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'all-access': 'bg-sky-50 text-sky-600 border-sky-100',
  'sponsor-private': 'bg-amber-50 text-amber-600 border-amber-100',
}

const labels: Record<AccessLevel, string> = {
  founders: 'Founders',
  'founders-premium': 'Founders + Premium',
  'all-access': 'All Access',
  'sponsor-private': 'Sponsor Private',
}

export function AccessBadge({ access }: { access: AccessLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${styles[access]}`}
    >
      {labels[access]}
    </span>
  )
}
