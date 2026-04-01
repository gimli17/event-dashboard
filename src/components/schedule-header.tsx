'use client'

import type { EventStatus } from '@/lib/types'

const filters: { label: string; value: EventStatus | 'all' }[] = [
  { label: 'All Events', value: 'all' },
  { label: 'Planning', value: 'planning' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Complete', value: 'complete' },
]

export function ScheduleHeader({
  onFilterChange,
  activeFilter,
}: {
  onFilterChange: (filter: EventStatus | 'all') => void
  activeFilter: EventStatus | 'all'
}) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            2026 Boulder Roots Music Fest
          </h1>
          <p className="text-muted text-sm mt-1">
            The BRMF Founders Experience — August 26–30, 2026
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === f.value
                ? 'bg-accent text-white'
                : 'bg-white border border-card-border text-muted hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </header>
  )
}
