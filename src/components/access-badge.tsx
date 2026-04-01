import type { AccessLevel } from '@/lib/types'

const styles: Record<AccessLevel, string> = {
  founders: 'bg-accent-glow text-accent border-accent/20',
  'founders-premium': 'bg-info-light text-info border-info/20',
  'all-access': 'bg-muted/10 text-muted border-muted/20',
  'sponsor-private': 'bg-warning-light text-warning border-warning/20',
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
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${styles[access]}`}
    >
      {labels[access]}
    </span>
  )
}
