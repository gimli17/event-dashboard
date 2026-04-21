import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { getSponsors, getSponsorStats } from '@/lib/sponsor-data'
import { getTicketStats } from '@/lib/ticket-data'

export const dynamic = 'force-dynamic'

export default async function BrmfPage() {
  const [sponsors, ticketStats] = await Promise.all([getSponsors(), getTicketStats()])
  const stats = getSponsorStats(sponsors)

  return (
    <>
      <Navbar initiative="brmf" />

      <section className="bg-[#2a4e80] text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight leading-none uppercase">
              Boulder Roots Music Fest
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
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Project Management */}
          <div className="border-t-2 border-black/20 pt-2 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Project Management</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-10">
            <Tile title="Tasks" description="All Boulder Roots priorities with owners and Dan's comments" href="/brmf/tasks" color="bg-[#2a4e80]" />
            <Tile title="Milestones" description="Track key milestones and progress toward launch" href="/brmf/milestones" color="bg-[#2a4e80]" />
            <Tile title="Event Schedule" description="Full festival timeline with task tracking per event" href="/schedule" color="bg-[#2a4e80]" />
          </div>

          {/* Sub-Pages */}
          <div className="border-t-2 border-black/20 pt-2 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Sub-Pages</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-10">
            <Tile title="Bold Conversations" description="18 topics across 3 tracks with founder interest" href="/bold-conversations" color="bg-[#3568a0]" />
            <Tile title="Private Parties" description="9 sponsor event slots — claimed vs. open" href="/private-parties" color="bg-[#3568a0]" />
          </div>

          {/* External Links */}
          <div className="border-t-2 border-black/20 pt-2 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">External Links</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Tile title="Sponsor Portal" description="Manage sponsors, tiers, and package selections" href="https://brmf-sponsor-portal.vercel.app/" color="bg-[#1e3560]" external />
            <Tile title="Ticket Tracker" description="Live Eventbrite sales, revenue, and capacity" href="https://boulderrootstickettracker.vercel.app/" color="bg-[#1e3560]" external />
          </div>
        </div>
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Caruso Ventures &middot; Boulder Roots Music Fest 2026
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
      <div className={`${color} text-white px-6 h-28 flex items-center justify-between`}>
        <h2 className="text-sm font-bold tracking-widest uppercase">{title}</h2>
        {external && <span className="text-xs font-bold tracking-widest uppercase opacity-50">&nearr;</span>}
      </div>
      <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-6 h-20 flex items-center bg-white group-hover:bg-cream-dark transition-colors">
        <p className="text-xs text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  )

  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
  }
  return <Link href={href}>{inner}</Link>
}
