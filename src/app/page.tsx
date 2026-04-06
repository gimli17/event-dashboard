import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { SidebarButtons } from '@/components/sidebar-buttons'
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

      <section className="bg-purple-dark text-white py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight leading-none uppercase">
              Caruso Ventures
            </h1>
            <p className="text-sm text-white/50 mt-2 tracking-wide">
              Operations Hub &middot; {totalActive} active tasks across all initiatives
            </p>
          </div>
          <SidebarButtons />
        </div>
      </section>

      <section className="bg-cream flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Initiative cards */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <InitiativeCard
              title="Boulder Roots Music Fest"
              shortTitle="Boulder Roots"
              description="The Founders Experience — August 26-30, 2026"
              href="/brmf"
              color="bg-blue"
              borderColor="border-blue"
              activeTasks={counts['brmf']?.active || 0}
              totalTasks={counts['brmf']?.total || 0}
            />
            <InitiativeCard
              title="Bold Summit"
              shortTitle="Bold Summit"
              description="3-day summit for bold conversations"
              href="/bold-summit"
              color="bg-green"
              borderColor="border-green"
              activeTasks={counts['bold-summit']?.active || 0}
              totalTasks={counts['bold-summit']?.total || 0}
            />
            <InitiativeCard
              title="Ensuring Colorado"
              shortTitle="Ensuring CO"
              description="Building a stronger Colorado community"
              href="/ensuring-colorado"
              color="bg-red"
              borderColor="border-red"
              activeTasks={counts['ensuring-colorado']?.active || 0}
              totalTasks={counts['ensuring-colorado']?.total || 0}
            />
          </div>

          {/* Hub-level tools */}
          <div className="border-t-2 border-black/20 pt-3 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Hub Tools</p>
          </div>
          <div className="grid grid-cols-4 gap-3 items-stretch">
            <HubTile title="All Tasks" description="Unified task list across all initiatives" href="/tasks" color="bg-black" />
            <HubTile title="Team Workspace" description="Dan's dashboard, review queue, and team views" href="/team" color="bg-purple" />
            <HubTile title="Board" description="Bulletin board for team notes and collaboration" href="/board" color="bg-gold" />
            <HubTile title="Social" description="Social media workspace and content library" href="/social" color="bg-orange" />
          </div>
        </div>
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Caruso Ventures &middot; 2026
        </p>
      </footer>
    </>
  )
}

function InitiativeCard({ title, shortTitle, description, href, color, borderColor, activeTasks, totalTasks }: {
  title: string
  shortTitle: string
  description: string
  href: string
  color: string
  borderColor: string
  activeTasks: number
  totalTasks: number
}) {
  return (
    <Link href={href} className="group">
      <div className={`border-2 ${borderColor} bg-white hover:bg-cream-dark transition-colors`}>
        <div className={`${color} text-white px-6 py-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-widest uppercase">{shortTitle}</h2>
            <span className="text-2xl font-bold">{activeTasks}</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest opacity-60 mt-1">active tasks</p>
        </div>
        <div className="px-6 py-5">
          <h3 className="text-sm font-bold tracking-wider uppercase mb-1">{title}</h3>
          <p className="text-xs text-muted leading-relaxed">{description}</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{totalTasks} total tasks</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue group-hover:text-red transition-colors">View Dashboard &rarr;</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function HubTile({ title, description, href, color }: {
  title: string
  description: string
  href: string
  color: string
}) {
  return (
    <Link href={href} className="group h-full">
      <div className="h-full flex flex-col">
        <div className={`${color} text-white px-5 py-4 flex items-center justify-between`}>
          <h2 className="text-xs font-bold tracking-widest uppercase">{title}</h2>
        </div>
        <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-5 py-4 bg-white group-hover:bg-cream-dark transition-colors flex-1 flex items-center">
          <p className="text-xs text-muted leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  )
}
