export function ProgressBar({ percent }: { percent: number }) {
  const color =
    percent === 100
      ? 'bg-success'
      : percent >= 50
        ? 'bg-accent'
        : percent > 0
          ? 'bg-warning'
          : 'bg-gray-300'

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted w-8 text-right">
        {percent}%
      </span>
    </div>
  )
}
