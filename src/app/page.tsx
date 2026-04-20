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
    'investments': { active: 0, total: 0 },
    'loud-bear': { active: 0, total: 0 },
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

      <div className="min-h-screen bg-cream">
        {/* Hero — bold graphic header */}
        <div className="bg-purple-dark text-white">
          <div className="max-w-screen-2xl mx-auto px-8 py-14 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/40 mb-3">Operations Hub</p>
              <h1 className="text-6xl font-bold uppercase tracking-tight">
                Caruso Ventures
              </h1>
            </div>
            <div className="text-right flex items-end gap-6">
              <SidebarButtons />
              <div>
                <p className="text-5xl font-bold">{totalActive}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mt-1">Active Tasks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Initiative cards — bold color blocks */}
        <div className="max-w-screen-2xl mx-auto px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0">
            {/* Boulder Roots */}
            <Link href="/brmf" className="group">
              <div className="bg-[#2a4e80] text-white h-full">
                <div className="px-6 pt-7 pb-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/50 mb-4">Music Fest</p>
                  <h2 className="text-2xl font-bold uppercase tracking-tight leading-[0.95] mb-5 whitespace-nowrap">
                    Boulder Roots
                  </h2>
                  <p className="text-[11px] text-white/60 leading-relaxed">The Founders Experience<br />August 26–30, 2026</p>
                </div>
                <div className="px-6 py-4 border-t border-white/20 flex items-center justify-between">
                  <span className="text-xs font-bold">{counts['brmf']?.active || 0} tasks</span>
                  <span className="text-xs font-bold opacity-50 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </div>
              </div>
            </Link>

            {/* Bold Summit */}
            <Link href="/bold-summit" className="group">
              <div className="bg-[#d4a020] text-white h-full">
                <div className="px-6 pt-7 pb-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/50 mb-4">3-Day Summit</p>
                  <h2 className="text-2xl font-bold uppercase tracking-tight leading-[0.95] mb-5 whitespace-nowrap">
                    Bold Summit
                  </h2>
                  <p className="text-[11px] text-white/60 leading-relaxed">Bold conversations<br />shaping the future</p>
                </div>
                <div className="px-6 py-4 border-t border-white/20 flex items-center justify-between">
                  <span className="text-xs font-bold">{counts['bold-summit']?.active || 0} tasks</span>
                  <span className="text-xs font-bold opacity-50 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </div>
              </div>
            </Link>

            {/* Engage Colorado */}
            <Link href="/ensuring-colorado" className="group">
              <div className="bg-[#cc4444] text-white h-full">
                <div className="px-6 pt-7 pb-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/50 mb-4">Community</p>
                  <h2 className="text-2xl font-bold uppercase tracking-tight leading-[0.95] mb-5 whitespace-nowrap">
                    Engage Colorado
                  </h2>
                  <p className="text-[11px] text-white/60 leading-relaxed">Building a stronger<br />Colorado community</p>
                </div>
                <div className="px-6 py-4 border-t border-white/20 flex items-center justify-between">
                  <span className="text-xs font-bold">{counts['ensuring-colorado']?.active || 0} tasks</span>
                  <span className="text-xs font-bold opacity-50 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </div>
              </div>
            </Link>

            {/* Investments */}
            <Link href="/investments" className="group">
              <div className="bg-[#2a7d5c] text-white h-full">
                <div className="px-6 pt-7 pb-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/50 mb-4">Capital</p>
                  <h2 className="text-2xl font-bold uppercase tracking-tight leading-[0.95] mb-5 whitespace-nowrap">
                    Investments
                  </h2>
                  <p className="text-[11px] text-white/60 leading-relaxed">Portfolio, diligence,<br />capital allocation</p>
                </div>
                <div className="px-6 py-4 border-t border-white/20 flex items-center justify-between">
                  <span className="text-xs font-bold">{counts['investments']?.active || 0} tasks</span>
                  <span className="text-xs font-bold opacity-50 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </div>
              </div>
            </Link>

            {/* Loud Bear */}
            <Link href="/loud-bear" className="group">
              <div className="bg-[#8b5a3c] text-white h-full">
                <div className="px-6 pt-7 pb-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/50 mb-4">Media</p>
                  <h2 className="text-2xl font-bold uppercase tracking-tight leading-[0.95] mb-5 whitespace-nowrap">
                    Loud Bear
                  </h2>
                  <p className="text-[11px] text-white/60 leading-relaxed">Podcast, social,<br />and media voice</p>
                </div>
                <div className="px-6 py-4 border-t border-white/20 flex items-center justify-between">
                  <span className="text-xs font-bold">{counts['loud-bear']?.active || 0} tasks</span>
                  <span className="text-xs font-bold opacity-50 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Hub tools — graphic grid */}
        <div className="max-w-screen-2xl mx-auto px-8 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-black">
            <Link href="/tasks" className="group md:border-r-2 border-black">
              <div className="bg-[#333333] text-white px-6 py-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/60">Hub</p>
                <h3 className="text-lg font-bold uppercase tracking-tight mt-1">Master Task List</h3>
              </div>
              <div className="bg-white px-6 py-4 group-hover:bg-cream-dark transition-colors">
                <p className="text-xl font-bold">{totalActive}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted mt-0.5">across initiatives</p>
              </div>
            </Link>
            <Link href="/team" className="group md:border-r-2 border-black">
              <div className="bg-[#8855c0] text-white px-6 py-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/60">Hub</p>
                <h3 className="text-lg font-bold uppercase tracking-tight mt-1">Team Workspace</h3>
              </div>
              <div className="bg-white px-6 py-4 group-hover:bg-cream-dark transition-colors">
                <p className="text-xs font-bold text-muted leading-relaxed">Dan&apos;s dashboard,<br />review queue &amp; team</p>
              </div>
            </Link>
            <Link href="/board" className="group">
              <div className="bg-[#d08535] text-white px-6 py-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/60">Hub</p>
                <h3 className="text-lg font-bold uppercase tracking-tight mt-1">Bulletin Board</h3>
              </div>
              <div className="bg-white px-6 py-4 group-hover:bg-cream-dark transition-colors">
                <p className="text-xs font-bold text-muted leading-relaxed">Team notes &amp;<br />collaboration</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <footer className="bg-black text-white/30 text-center py-8">
        <p className="text-[10px] font-bold tracking-[0.4em] uppercase">
          Caruso Ventures &middot; 2026
        </p>
      </footer>
    </>
  )
}
