import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { getSponsors, getSponsorStats } from '@/lib/sponsor-data'

export const dynamic = 'force-dynamic'

const modules = [
  {
    title: 'Event Schedule',
    description: 'Full festival timeline with task tracking per event',
    href: '/schedule',
    color: 'bg-blue',
  },
  {
    title: 'Master Tasks',
    description: 'All BRMF priorities with status, owners, and Dan\'s comments',
    href: '/tasks',
    color: 'bg-red',
  },
  {
    title: 'Bold Conversations',
    description: 'Topics, tracks, and founder interest signals',
    href: '/bold-conversations',
    color: 'bg-green',
  },
  {
    title: 'Pending Activities',
    description: 'All incomplete event tasks ranked by priority',
    href: '/pending',
    color: 'bg-orange',
  },
  {
    title: 'Sponsor Portal',
    description: 'Manage sponsors, tiers, and package selections',
    href: 'https://brmf-sponsor-portal.vercel.app/',
    color: 'bg-gold',
    external: true,
  },
  {
    title: 'Ticket Tracker',
    description: 'Live ticket sales and revenue tracking',
    href: 'https://boulderrootstickettracker.vercel.app/',
    color: 'bg-black',
    external: true,
  },
]

export default async function HubPage() {
  const sponsors = await getSponsors()
  const stats = getSponsorStats(sponsors)

  return (
    <>
      <Navbar />

      <section className="bg-blue text-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-white/50 mb-4">
            Operations Portal
          </p>
          <h1 className="text-6xl sm:text-8xl font-bold tracking-tight leading-none uppercase">
            Boulder Roots
          </h1>
          <p className="text-sm text-white/50 mt-4 max-w-lg">
            The Founders Experience — August 26–30, 2026
          </p>
        </div>
      </section>

      {/* Sponsor stats bar */}
      {stats.total > 0 && (
        <section className="bg-cream-dark border-b-2 border-black/10">
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted uppercase tracking-wider font-bold">Sponsors</p>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div>
              <p className="text-xl font-bold">{stats.tiered}</p>
              <p className="text-xs text-muted uppercase tracking-wider font-bold">With Tier</p>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div>
              <p className="text-xl font-bold text-green">${(stats.totalRevenue / 1000).toFixed(0)}K</p>
              <p className="text-xs text-muted uppercase tracking-wider font-bold">Committed</p>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div>
              <p className="text-xl font-bold">{stats.withPayment}</p>
              <p className="text-xs text-muted uppercase tracking-wider font-bold">Payments</p>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div>
              <p className="text-xl font-bold">{stats.founders2025}</p>
              <p className="text-xs text-muted uppercase tracking-wider font-bold">2025 Founders</p>
            </div>
            <div className="w-px h-8 bg-black/10" />
            {Object.entries(stats.tierCounts).sort((a, b) => b[1] - a[1]).map(([tier, count]) => (
              <div key={tier}>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted uppercase tracking-wider font-bold">{tier}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-cream flex-1">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => {
              const isExternal = (mod as { external?: boolean }).external
              const inner = (
                <div className="group h-full">
                  <div className={`${mod.color} text-white px-5 py-3 flex items-center justify-between`}>
                    <h2 className="text-xs font-bold tracking-widest uppercase">{mod.title}</h2>
                    {isExternal && (
                      <span className="text-[9px] font-bold tracking-widest uppercase opacity-50">External</span>
                    )}
                  </div>
                  <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-5 py-4 bg-white group-hover:bg-cream-dark transition-colors">
                    <p className="text-xs text-muted">{mod.description}</p>
                  </div>
                </div>
              )

              if (isExternal) {
                return (
                  <a key={mod.title} href={mod.href} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                )
              }

              return (
                <Link key={mod.title} href={mod.href}>
                  {inner}
                </Link>
              )
            })}
          </div>

        </div>
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Boulder Roots Music Fest &middot; 2026
        </p>
      </footer>
    </>
  )
}
