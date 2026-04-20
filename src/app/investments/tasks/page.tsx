import { Navbar } from '@/components/navbar'
import { BackLink } from '@/components/back-link'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { MasterTaskList } from '@/components/master-task-list'

export const dynamic = 'force-dynamic'

export default function InvestmentsTasksPage() {
  return (
    <>
      <Navbar initiative="investments" />
      <section className="bg-[#2a7d5c] text-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">Investments Tasks</h1>
          </div>
          <SidebarButtons />
        </div>
      </section>
      <section className="bg-cream flex-1">
        <MasterTaskList initiative="investments" />
      </section>
      <footer className="bg-black text-white/40 text-center py-8">
        <p className="text-xs font-bold tracking-widest uppercase">Caruso Ventures &middot; Investments</p>
      </footer>
    </>
  )
}
