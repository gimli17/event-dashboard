export function SponsorshipBadge({
  available,
  sponsorName,
}: {
  available: boolean
  sponsorName: string | null
}) {
  if (sponsorName) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-accent/20 bg-accent-glow text-accent px-2 py-0.5 text-[10px] font-bold">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        {sponsorName}
      </span>
    )
  }

  if (available) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-success/20 bg-success-light text-success px-2 py-0.5 text-[10px] font-bold">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
        </span>
        Open for Sponsorship
      </span>
    )
  }

  return null
}
