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
    .eq('initiative', 'bold-summit')
    .is('deleted_at', null)
    .neq('status', 'complete')
  return count || 0
}

export default async function BoldSummitPage() {
  const activeCount = await getTaskCount()

  return (
    <>
      <Navbar initiative="bold-summit" />

      <section className="bg-[#d4a020] text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight leading-none uppercase">
              Bold Summit
            </h1>
            <p className="text-xs text-white/50 mt-1">
              3-day summit for bold conversations
            </p>
          </div>
          <SidebarButtons />
        </div>
      </section>

      <section className="bg-cream-dark border-b-2 border-black/10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-center gap-16">
          <div className="text-center">
            <p className="text-3xl font-bold text-[#d4a020]">{activeCount}</p>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Active Tasks</p>
          </div>
        </div>
      </section>

      <section className="bg-cream flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-3 gap-3">
            <Link href="/bold-summit/tasks" className="group">
              <div className="bg-[#d4a020] text-white px-6 h-28 flex items-center">
                <h2 className="text-sm font-bold tracking-widest uppercase">Tasks</h2>
              </div>
              <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-6 h-20 flex items-center bg-white group-hover:bg-cream-dark transition-colors">
                <p className="text-xs text-muted leading-relaxed">All Bold Summit priorities and tasks</p>
              </div>
            </Link>
            <Link href="/bold-summit/schedule" className="group">
              <div className="bg-[#c89820] text-white px-6 h-28 flex items-center">
                <h2 className="text-sm font-bold tracking-widest uppercase">Event Schedule</h2>
              </div>
              <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-6 h-20 flex items-center bg-white group-hover:bg-cream-dark transition-colors">
                <p className="text-xs text-muted leading-relaxed">Full schedule with clickable events &amp; task tracking</p>
              </div>
            </Link>
            <a href="https://creators-website-alpha.vercel.app/" target="_blank" rel="noopener noreferrer" className="group">
              <div className="bg-[#b88818] text-white px-6 h-28 flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-widest uppercase">Website</h2>
                <span className="text-xs font-bold tracking-widest uppercase opacity-50">&nearr;</span>
              </div>
              <div className="border-l-2 border-r-2 border-b-2 border-black/10 px-6 h-20 flex items-center bg-white group-hover:bg-cream-dark transition-colors">
                <p className="text-xs text-muted leading-relaxed">Bold Summit external site</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">
          Caruso Ventures &middot; Bold Summit
        </p>
      </footer>
    </>
  )
}
