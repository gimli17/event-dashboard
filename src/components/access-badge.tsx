import type { AccessLevel } from '@/lib/types'

const styles: Record<AccessLevel, string> = {
  founders: 'bg-purple-100 text-purple-700',
  'founders-premium': 'bg-indigo-100 text-indigo-700',
  'all-access': 'bg-blue-100 text-blue-700',
  'sponsor-private': 'bg-amber-100 text-amber-700',
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[access]}`}
    >
      {labels[access]}
    </span>
  )
}
