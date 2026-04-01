export function ProgressBar({ percent }: { percent: number }) {
  const color =
    percent === 100
      ? 'bg-success'
      : percent >= 50
        ? 'bg-accent'
        : percent > 0
          ? 'bg-warning'
          : 'bg-gray-200'

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-muted w-8 text-right">
        {percent}%
      </span>
    </div>
  )
}
