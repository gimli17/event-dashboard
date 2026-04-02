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
  add_recog_category: string | null
  add_recog_detail: string | null
}

// Map vip_day codes from sponsor portal to our event IDs
// Actual private party slots:
// Fri 5:00-6:30 (Endeavor) | Sat 2:00-4:00 (x2) | Sat 4:15-6:15 (x2) | Sun 2:00-4:00 (x2) | Sun 4:15-6:15 (x2)
const vipDayToEventId: Record<string, string> = {
  'fri_415_615': 'fri-endeavor',       // Endeavor's Friday slot (portal code doesn't match time but maps here)
  'fri_500_630': 'fri-endeavor',
  'sat_200_400': 'sat-sponsor-early',
  'sat_200_400_1': 'sat-sponsor-early',
  'sat_200_400_2': 'sat-sponsor-early',
  'sat_415_615': 'sat-sponsor-late',
  'sat_415_615_1': 'sat-sponsor-late',
  'sat_415_615_2': 'sat-sponsor-late',
  'sun_200_400': 'sun-sponsor-early',
  'sun_200_400_1': 'sun-sponsor-early',
  'sun_200_400_2': 'sun-sponsor-early',
  'sun_415_615': 'sun-sponsor',
  'sun_415_615_1': 'sun-sponsor',
  'sun_415_615_2': 'sun-sponsor',
}

// Map add_recog_detail (Founders Experience event sponsorship) to our event IDs
const recogDetailToEventId: Record<string, string> = {
  'opening_night': 'thu-opening',
  'cocktail_gathering': 'fri-cocktail',
  'friday_headliner': 'fri-headliner',
  'saturday_headliner': 'sat-headliner',
  'sunday_headliner': 'sun-headliner',
  'after_party_friday': 'fri-afterparty',
  'after_party_saturday': 'sat-afterparty',
  'film_evening': 'wed-film',
  'founders_lounge': 'weekend-lounge',
}

export async function getSponsors(): Promise<Sponsor[]> {
  if (!process.env.SPONSOR_PORTAL_URL || !process.env.SPONSOR_PORTAL_SERVICE_KEY) {
    return []
  }

  try {
    const { data, error } = await sponsorSupabase
      .from('sponsors')
      .select('id, name, tier_id, amount, brmf_priority, founder_2025, funnel_stage, payment_status, vip_day, vip_party_name, recognition_name, add_recog_category, add_recog_detail')
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
    // Check VIP day selections (private party slots)
    if (s.vip_day && s.vip_day.trim()) {
      const eventId = vipDayToEventId[s.vip_day]
      if (eventId) {
        result[eventId] = {
          name: s.recognition_name || s.name,
          partyName: s.vip_party_name || null,
          tier: s.tier_id,
        }
      }
    }

    // Check Founders Experience event sponsorship (add_recog_detail)
    if (s.add_recog_detail && s.add_recog_detail.trim()) {
      const eventId = recogDetailToEventId[s.add_recog_detail]
      if (eventId) {
        result[eventId] = {
          name: s.recognition_name || s.name,
          partyName: null,
          tier: s.tier_id,
        }
      }
    }
  }

  return result
}
