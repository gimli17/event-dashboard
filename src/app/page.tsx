import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { getSponsors, getSponsorStats } from '@/lib/sponsor-data'
import { getTicketStats } from '@/lib/ticket-data'

export const dynamic = 'force-dynamic'

export default async function HubPage() {
  const [sponsors, ticketStats] = await Promise.all([getSponsors(), getTicketStats()])
  const stats = getSponsorStats(sponsors)

  return (
    <>
      <Navbar />

      <section className="bg-blue text-white py-20">
        <div className="max-w-6xl mx-auto px-6">
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
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-center gap-16">
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
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-3 items-stretch">
            {/* Task Management */}
            <div className="flex gap-3 flex-1 border-r-2 border-black/10 pr-3">
              <div className="flex-1"><Tile title="Master Tasks" href="/tasks" color="bg-red" label="Tasks" /></div>
              <div className="flex-1"><Tile title="Event Schedule" href="/schedule" color="bg-blue" label="Schedule" /></div>
            </div>
            {/* Program Details */}
            <div className="flex gap-3 flex-1 border-r-2 border-black/10 pr-3">
              <div className="flex-1"><Tile title="Bold Conversations" href="/bold-conversations" color="bg-green" label="Topics" /></div>
              <div className="flex-1"><Tile title="Private Parties" href="/private-parties" color="bg-gold" label="Sponsors" /></div>
            </div>
            {/* External */}
            <div className="flex gap-3 flex-1">
              <div className="flex-1"><Tile title="Sponsor Portal" href="https://brmf-sponsor-portal.vercel.app/" color="bg-orange" external label="External" /></div>
              <div className="flex-1"><Tile title="Ticket Tracker" href="https://boulderrootstickettracker.vercel.app/" color="bg-black" external label="External" /></div>
            </div>
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

function Tile({ title, href, color, external, label }: {
  title: string
  href: string
  color: string
  external?: boolean
  label?: string
}) {
  const inner = (
    <div className="group h-full">
      <div className={`${color} text-white px-4 py-3`}>
        <h2 className="text-xs font-bold tracking-widest uppercase leading-tight">{title}</h2>
      </div>
      <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-4 py-2.5 bg-white group-hover:bg-cream-dark transition-colors">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
          {external ? 'External \u2197' : label || 'View'}
        </p>
      </div>
    </div>
  )

  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
  }

  return <Link href={href}>{inner}</Link>
}
