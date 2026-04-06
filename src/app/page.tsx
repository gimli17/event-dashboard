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

      <div className="min-h-screen bg-[#1a1a1a]">
        {/* Header */}
        <div className="max-w-6xl mx-auto px-8 pt-14 pb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 mb-3">Operations Hub</p>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Caruso Ventures
          </h1>
          <p className="text-sm text-white/40 mt-3">{totalActive} active tasks across all initiatives</p>
        </div>

        {/* Initiative cards */}
        <div className="max-w-6xl mx-auto px-8 pb-10">
          <div className="grid grid-cols-3 gap-5">
            <InitiativeCard
              shortTitle="Boulder Roots"
              tag="Music Fest"
              description="The Founders Experience — August 26–30, 2026"
              href="/brmf"
              bgColor="bg-[#c4cfe0]"
              btnColor="bg-[#1e3a5f]"
              activeTasks={counts['brmf']?.active || 0}
              totalTasks={counts['brmf']?.total || 0}
            />
            <InitiativeCard
              shortTitle="Bold Summit"
              tag="3-Day Summit"
              description="Bold conversations shaping the future"
              href="/bold-summit"
              bgColor="bg-[#b8ccb0]"
              btnColor="bg-[#1a4d3a]"
              activeTasks={counts['bold-summit']?.active || 0}
              totalTasks={counts['bold-summit']?.total || 0}
            />
            <InitiativeCard
              shortTitle="Ensuring Colorado"
              tag="Community"
              description="Building a stronger Colorado community"
              href="/ensuring-colorado"
              bgColor="bg-[#e0b8b0]"
              btnColor="bg-[#8b2a2a]"
              activeTasks={counts['ensuring-colorado']?.active || 0}
              totalTasks={counts['ensuring-colorado']?.total || 0}
            />
          </div>
        </div>

        {/* Hub tools */}
        <div className="max-w-6xl mx-auto px-8 pb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 mb-4">Hub Tools</p>
          <div className="grid grid-cols-4 gap-4">
            <HubTile title="All Tasks" detail={`${totalActive} active`} href="/tasks" bgColor="bg-[#d4c5a0]" />
            <HubTile title="Team Workspace" detail="Reviews & team" href="/team" bgColor="bg-[#c4b8d8]" />
            <HubTile title="Board" detail="Team notes" href="/board" bgColor="bg-[#a8bfb0]" />
            <HubTile title="Social" detail="Content library" href="/social" bgColor="bg-[#d8b8a8]" />
          </div>
        </div>
      </div>

      <footer className="bg-[#111] text-white/20 text-center py-8">
        <p className="text-[10px] font-bold tracking-[0.4em] uppercase">
          Caruso Ventures &middot; 2026
        </p>
      </footer>
    </>
  )
}

function InitiativeCard({ shortTitle, tag, description, href, bgColor, btnColor, activeTasks, totalTasks }: {
  shortTitle: string
  tag: string
  description: string
  href: string
  bgColor: string
  btnColor: string
  activeTasks: number
  totalTasks: number
}) {
  return (
    <Link href={href} className="group">
      <div className={`${bgColor} rounded-2xl p-7 flex flex-col h-full transition-transform duration-200 hover:-translate-y-1`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-5">{tag}</p>

        <h2 className="text-2xl font-bold text-[#1a1a1a] leading-tight mb-3">
          {shortTitle}
        </h2>

        <p className="text-sm text-black/50 leading-relaxed mb-8 flex-1">{description}</p>

        <p className="text-sm font-bold text-[#1a1a1a] mb-6">
          {activeTasks} active &middot; {totalTasks} total
        </p>

        <div className="flex items-center gap-3">
          <span className={`${btnColor} text-white text-xs font-bold px-5 py-2.5 rounded-full`}>
            View dashboard
          </span>
          <span className="text-xs font-bold text-black/40 group-hover:text-black/70 transition-colors">
            Read more
          </span>
        </div>
      </div>
    </Link>
  )
}

function HubTile({ title, detail, href, bgColor }: {
  title: string
  detail: string
  href: string
  bgColor: string
}) {
  return (
    <Link href={href} className="group">
      <div className={`${bgColor} rounded-xl px-6 py-5 transition-transform duration-200 hover:-translate-y-1`}>
        <h3 className="text-base font-bold text-[#1a1a1a]">{title}</h3>
        <p className="text-xs text-black/40 mt-1">{detail}</p>
      </div>
    </Link>
  )
}
