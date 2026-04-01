export function SponsorshipBadge({
  available,
  sponsorName,
}: {
  available: boolean
  sponsorName: string | null
}) {
  if (sponsorName) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-light text-accent px-2.5 py-0.5 text-xs font-medium">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Sponsored by {sponsorName}
      </span>
    )
  }

  if (available) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-light text-success px-2.5 py-0.5 text-xs font-medium animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-success" />
        Open for Sponsorship
      </span>
    )
  }

  return null
}
