import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { getSponsors, getSponsorStats } from '@/lib/sponsor-data'
import { getTicketStats } from '@/lib/ticket-data'

export const dynamic = 'force-dynamic'

export default async function HubPage() {
  const [sponsors, ticketStats] = await Promise.all([getSponsors(), getTicketStats()])
  const stats = getSponsorStats(sponsors)

  return (
    <>
      <Navbar />

      <section className="bg-blue text-white py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight leading-none uppercase">
              Boulder Roots
            </h1>
            <p className="text-xs text-white/50 mt-1">
              The Founders Experience — August 26–30, 2026
            </p>
          </div>
          <SidebarButtons />
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
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-6 gap-3">
            {/* Group labels */}
            <div className="col-span-2 border-t-2 border-black/20 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Task Management</p>
            </div>
            <div className="col-span-2 border-t-2 border-black/20 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Program Details</p>
            </div>
            <div className="col-span-2 border-t-2 border-black/20 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">External Tools</p>
            </div>

            {/* Tiles */}
            <Tile title="Master Tasks" description="All BRMF priorities with owners and Dan's comments" href="/tasks" color="bg-red" />
            <Tile title="Event Schedule" description="Full festival timeline with task tracking per event" href="/schedule" color="bg-blue" />
            <Tile title="Bold Conversations" description="18 topics across 3 tracks with founder interest" href="/bold-conversations" color="bg-green" />
            <Tile title="Private Parties" description="9 sponsor event slots — claimed vs. open" href="/private-parties" color="bg-gold" />
            <Tile title="Sponsor Portal" description="Manage sponsors, tiers, and package selections" href="https://brmf-sponsor-portal.vercel.app/" color="bg-orange" external />
            <Tile title="Ticket Tracker" description="Live Eventbrite sales, revenue, and capacity" href="https://boulderrootstickettracker.vercel.app/" color="bg-black" external />
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

function Tile({ title, description, href, color, external }: {
  title: string
  description: string
  href: string
  color: string
  external?: boolean
}) {
  const inner = (
    <div className="group h-full flex flex-col">
      <div className={`${color} text-white px-6 h-36 flex items-center justify-between`}>
        <h2 className="text-base font-bold tracking-widest uppercase">{title}</h2>
        {external && <span className="text-xs font-bold tracking-widest uppercase opacity-50">{'\u2197'}</span>}
      </div>
      <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-6 h-24 flex items-center bg-white group-hover:bg-cream-dark transition-colors">
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  )

  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="col-span-1">{inner}</a>
  }

  return <Link href={href} className="col-span-1">{inner}</Link>
}
