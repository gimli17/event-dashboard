import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getTaskCount() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { count } = await supabase
    .from('master_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('initiative', 'investments')
    .is('deleted_at', null)
    .neq('status', 'complete')
  return count || 0
}

export default async function InvestmentsPage() {
  const activeCount = await getTaskCount()

  return (
    <>
      <Navbar initiative="investments" />

      <section className="bg-[#2a7d5c] text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight leading-none uppercase">
              Investments
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Portfolio, diligence, and capital allocation
            </p>
          </div>
          <SidebarButtons />
        </div>
      </section>

      <section className="bg-cream-dark border-b-2 border-black/10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-center gap-16">
          <div className="text-center">
            <p className="text-3xl font-bold text-[#2a7d5c]">{activeCount}</p>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Active Tasks</p>
          </div>
        </div>
      </section>

      <section className="bg-cream flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/investments/tasks" className="group">
              <div className="bg-[#2a7d5c] text-white px-6 h-28 flex items-center">
                <h2 className="text-sm font-bold tracking-widest uppercase">Tasks</h2>
              </div>
              <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-6 h-20 flex items-center bg-white group-hover:bg-cream-dark transition-colors">
                <p className="text-xs text-muted leading-relaxed">All Investments priorities and tasks</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Caruso Ventures &middot; Investments
        </p>
      </footer>
    </>
  )
}
