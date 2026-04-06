import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getInitiativeCounts() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('master_tasks')
    .select('initiative, status')
    .is('deleted_at', null)

  const counts: Record<string, { active: number; total: number }> = {
    'brmf': { active: 0, total: 0 },
    'bold-summit': { active: 0, total: 0 },
    'ensuring-colorado': { active: 0, total: 0 },
  }
  if (data) {
    for (const t of data as { initiative: string; status: string }[]) {
      const key = t.initiative || 'brmf'
      if (!counts[key]) counts[key] = { active: 0, total: 0 }
      counts[key].total++
      if (t.status !== 'complete') counts[key].active++
    }
  }
  return counts
}

export default async function HubPage() {
  const counts = await getInitiativeCounts()
  const totalActive = Object.values(counts).reduce((sum, c) => sum + c.active, 0)

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-[#f0ede8]">
        {/* Header */}
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
          <h1 className="text-5xl font-bold tracking-tight text-[#1a1a1a]">
            Caruso Ventures
          </h1>
          <p className="text-base text-[#8b7e6a] mt-2">
            {totalActive} active tasks across all initiatives
          </p>
        </div>

        {/* Initiative cards */}
        <div className="max-w-6xl mx-auto px-6 pb-10">
          <div className="grid grid-cols-3 gap-5">
            <InitiativeCard
              title="Boulder Roots Music Fest"
              shortTitle="Boulder Roots"
              tag="MUSIC FEST"
              description="The Founders Experience — August 26-30, 2026"
              href="/brmf"
              bgColor="bg-[#c8d5e2]"
              activeTasks={counts['brmf']?.active || 0}
              totalTasks={counts['brmf']?.total || 0}
            />
            <InitiativeCard
              title="Bold Summit"
              shortTitle="Bold Summit"
              tag="3-DAY SUMMIT"
              description="Bold conversations shaping the future"
              href="/bold-summit"
              bgColor="bg-[#cddcc5]"
              activeTasks={counts['bold-summit']?.active || 0}
              totalTasks={counts['bold-summit']?.total || 0}
            />
            <InitiativeCard
              title="Ensuring Colorado"
              shortTitle="Ensuring Colorado"
              tag="COMMUNITY"
              description="Building a stronger Colorado community"
              href="/ensuring-colorado"
              bgColor="bg-[#e8cfc4]"
              activeTasks={counts['ensuring-colorado']?.active || 0}
              totalTasks={counts['ensuring-colorado']?.total || 0}
            />
          </div>
        </div>

        {/* Hub tools */}
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8b7e6a] mb-4">Hub Tools</p>
          <div className="grid grid-cols-4 gap-4">
            <HubTile title="All Tasks" count={totalActive} href="/tasks" />
            <HubTile title="Team Workspace" subtitle="Review queue" href="/team" />
            <HubTile title="Board" subtitle="Team notes" href="/board" />
            <HubTile title="Social" subtitle="Content" href="/social" />
          </div>
        </div>
      </div>

      <footer className="bg-[#1a1a1a] text-white/30 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Caruso Ventures &middot; 2026
        </p>
      </footer>
    </>
  )
}

function InitiativeCard({ title, shortTitle, tag, description, href, bgColor, activeTasks, totalTasks }: {
  title: string
  shortTitle: string
  tag: string
  description: string
  href: string
  bgColor: string
  activeTasks: number
  totalTasks: number
}) {
  return (
    <Link href={href} className="group">
      <div className={`${bgColor} rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}>
        {/* Top section with large number */}
        <div className="px-7 pt-7 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-2">{tag}</p>
              <h2 className="text-2xl font-bold text-[#1a1a1a] leading-tight">{shortTitle}</h2>
            </div>
            <span className="text-4xl font-bold text-black/20">{activeTasks}</span>
          </div>
        </div>
        {/* Bottom section */}
        <div className="px-7 pb-7">
          <p className="text-sm text-black/50 leading-relaxed mb-5">{description}</p>
          <div className="flex items-center justify-between border-t border-black/10 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">{totalTasks} tasks</span>
            <span className="text-xs font-bold text-black/40 group-hover:text-black transition-colors">View &rarr;</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function HubTile({ title, count, subtitle, href }: {
  title: string
  count?: number
  subtitle?: string
  href: string
}) {
  return (
    <Link href={href} className="group">
      <div className="bg-white rounded-xl px-5 py-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <h3 className="text-sm font-bold text-[#1a1a1a] tracking-wide">{title}</h3>
        {count !== undefined && (
          <p className="text-2xl font-bold text-purple mt-2">{count}</p>
        )}
        {subtitle && (
          <p className="text-xs text-[#8b7e6a] mt-1">{subtitle}</p>
        )}
      </div>
    </Link>
  )
}
