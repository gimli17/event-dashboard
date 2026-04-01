export function ProgressBar({ percent }: { percent: number }) {
  const color =
    percent === 100
      ? 'bg-success'
      : percent >= 50
        ? 'bg-accent'
        : percent > 0
          ? 'bg-warning'
          : 'bg-muted/20'

  return (
    <div className="flex items-center gap-3">
      <div className="h-1 flex-1 rounded-full bg-divider">
        <div
          className={`h-1 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-muted w-8 text-right">
        {percent}%
      </span>
    </div>
  )
}
