import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { getSponsors, getSponsorStats } from '@/lib/sponsor-data'
import { getTicketStats } from '@/lib/ticket-data'

export const dynamic = 'force-dynamic'

const modules = [
  {
    title: 'Event Schedule',
    description: 'Full festival timeline — Wed through Sun with task tracking per event',
    href: '/schedule',
    color: 'bg-blue',
  },
  {
    title: 'Master Tasks',
    description: 'All BRMF priorities — ultra-high to backlog — with owners and Dan\'s comments',
    href: '/tasks',
    color: 'bg-red',
  },
  {
    title: 'Bold Conversations',
    description: '18 topics across 3 tracks — Health, Culture, Tech — with founder interest signals',
    href: '/bold-conversations',
    color: 'bg-green',
  },
  {
    title: 'Private Parties',
    description: '9 sponsor event slots across Fri–Sun — see which are claimed, which are open',
    href: '/private-parties',
    color: 'bg-gold',
  },
  {
    title: 'Sponsor Portal',
    description: 'Manage sponsors, tiers, packages, and event selections',
    href: 'https://brmf-sponsor-portal.vercel.app/',
    color: 'bg-orange',
    external: true,
  },
  {
    title: 'Ticket Tracker',
    description: 'Live Eventbrite ticket sales, revenue, and capacity tracking',
    href: 'https://boulderrootstickettracker.vercel.app/',
    color: 'bg-black',
    external: true,
  },
]

export default async function HubPage() {
  const [sponsors, ticketStats] = await Promise.all([getSponsors(), getTicketStats()])
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

      {/* Key metrics */}
      <section className="bg-cream-dark border-b-2 border-black/10">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-center gap-16">
          <div className="text-center">
            <p className="text-3xl font-bold text-green">
              {stats.totalRevenue > 0 ? `$${(stats.totalRevenue / 1000).toFixed(0)}K` : '$0'}
            </p>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Sponsor Revenue</p>
          </div>
          <div className="w-px h-12 bg-black/10" />
          <div className="text-center">
            <p className="text-3xl font-bold">
              {ticketStats.totalSold > 0 ? ticketStats.totalSold : '\u2014'}
            </p>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Tickets Sold</p>
          </div>
          <div className="w-px h-12 bg-black/10" />
          <div className="text-center">
            <p className="text-3xl font-bold text-blue">
              {ticketStats.totalRevenue > 0 ? `$${ticketStats.totalRevenue.toLocaleString()}` : '\u2014'}
            </p>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Ticket Revenue</p>
          </div>
        </div>
      </section>

      <section className="bg-cream flex-1">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid gap-5 sm:grid-cols-2">
            {modules.map((mod) => {
              const isExternal = (mod as { external?: boolean }).external
              const inner = (
                <div className="group h-full">
                  <div className={`${mod.color} text-white px-6 py-4 flex items-center justify-between`}>
                    <h2 className="text-sm font-bold tracking-widest uppercase">{mod.title}</h2>
                    {isExternal && (
                      <span className="text-[9px] font-bold tracking-widest uppercase opacity-50">External</span>
                    )}
                  </div>
                  <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-6 py-5 bg-white group-hover:bg-cream-dark transition-colors">
                    <p className="text-sm text-muted leading-relaxed">{mod.description}</p>
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
