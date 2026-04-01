import { createClient } from '@supabase/supabase-js'

// Server-side only — service role key never exposed to browser
const sponsorSupabase = createClient(
  process.env.SPONSOR_PORTAL_URL || '',
  process.env.SPONSOR_PORTAL_SERVICE_KEY || ''
)

export interface Sponsor {
  id: string
  name: string
  tier_id: string | null
  amount: number | null
  brmf_priority: string | null
  founder_2025: boolean
  funnel_stage: number | null
  payment_status: string | null
  vip_day: string | null
  vip_party_name: string | null
  recognition_name: string | null
}

// Map vip_day codes to our event IDs
const vipDayToEventId: Record<string, string> = {
  'fri_300_500': 'fri-endeavor',
  'fri_415_615': 'sat-sponsor-late',  // Friday 4:15-6:15
  'sat_200_400_1': 'sat-sponsor-early',
  'sat_200_400_2': 'sat-sponsor-early',
  'sat_415_615_1': 'sat-sponsor-late',
  'sat_415_615_2': 'sat-sponsor-late',
  'sun_415_615': 'sun-sponsor',
}

export async function getSponsors(): Promise<Sponsor[]> {
  if (!process.env.SPONSOR_PORTAL_URL || !process.env.SPONSOR_PORTAL_SERVICE_KEY) {
    return []
  }

  try {
    const { data, error } = await sponsorSupabase
      .from('sponsors')
      .select('id, name, tier_id, amount, brmf_priority, founder_2025, funnel_stage, payment_status, vip_day, vip_party_name, recognition_name')
      .is('deleted_at', null)

    if (error) throw error
    return (data ?? []) as Sponsor[]
  } catch (e) {
    console.error('Failed to fetch sponsors:', e)
    return []
  }
}

export function getSponsorStats(sponsors: Sponsor[]) {
  const tiered = sponsors.filter((s) => s.tier_id)
  const withPayment = sponsors.filter((s) => s.payment_status && s.payment_status !== 'none')
  const founders2025 = sponsors.filter((s) => s.founder_2025)
  const withVip = sponsors.filter((s) => s.vip_day && s.vip_day.trim())

  const tierCounts: Record<string, number> = {}
  tiered.forEach((s) => {
    tierCounts[s.tier_id!] = (tierCounts[s.tier_id!] || 0) + 1
  })

  const totalRevenue = tiered.reduce((sum, s) => sum + (s.amount || 0), 0)

  return {
    total: sponsors.length,
    tiered: tiered.length,
    tierCounts,
    totalRevenue,
    withPayment: withPayment.length,
    founders2025: founders2025.length,
    withVip: withVip.length,
    vipSelections: withVip,
  }
}

export function mapVipToEvent(vipDay: string): string | null {
  return vipDayToEventId[vipDay] ?? null
}

// Returns a map of event_id -> sponsor name for events that have a confirmed sponsor
export function getSponsorsByEvent(sponsors: Sponsor[]): Record<string, { name: string; partyName: string | null; tier: string | null }> {
  const result: Record<string, { name: string; partyName: string | null; tier: string | null }> = {}

  for (const s of sponsors) {
    if (!s.vip_day || !s.vip_day.trim()) continue
    const eventId = vipDayToEventId[s.vip_day]
    if (eventId) {
      result[eventId] = {
        name: s.recognition_name || s.name,
        partyName: s.vip_party_name || null,
        tier: s.tier_id,
      }
    }
  }

  return result
}
