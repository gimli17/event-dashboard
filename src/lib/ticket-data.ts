export interface TicketStats {
  totalSold: number
  totalCapacity: number
  totalRevenue: number
}

export async function getTicketStats(): Promise<TicketStats> {
  try {
    const res = await fetch('https://boulderrootstickettracker.vercel.app/api/tickets', {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Ticket API failed')

    const data = await res.json()
    const classes = data.ticketClasses || []

    let totalSold = 0
    let totalCapacity = 0
    let totalRevenue = 0

    for (const tc of classes) {
      const sold = tc.quantity_sold || 0
      const capacity = tc.quantity_total || 0
      const price = tc.cost?.major_value ? parseFloat(tc.cost.major_value) : 0

      totalSold += sold
      totalCapacity += capacity
      totalRevenue += sold * price
    }

    return { totalSold, totalCapacity, totalRevenue }
  } catch (e) {
    console.error('Failed to fetch ticket stats:', e)
    return { totalSold: 0, totalCapacity: 0, totalRevenue: 0 }
  }
}
