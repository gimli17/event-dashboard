import { Navbar } from '@/components/navbar'
import { BackLink } from '@/components/back-link'
import { SidebarButtons } from '@/components/sidebar-buttons'
import { BulletinBoard } from '@/components/bulletin-board'

export const dynamic = 'force-dynamic'

export default function BoardPage() {
  return (
    <>
      <Navbar />
      <BulletinBoard />
    </>
  )
}
