export const INITIATIVES = {
  'brmf': {
    label: 'Boulder Roots Music Fest',
    shortLabel: 'Boulder Roots',
    color: 'bg-[#2a4e80]',
    textColor: 'text-[#2a4e80]',
    borderColor: 'border-[#2a4e80]',
    lightBg: 'bg-[#2a4e80]/10',
    description: 'The Founders Experience — August 26–30, 2026',
  },
  'bold-summit': {
    label: 'Bold Summit',
    shortLabel: 'Bold Summit',
    color: 'bg-[#d4a020]',
    textColor: 'text-[#d4a020]',
    borderColor: 'border-[#d4a020]',
    lightBg: 'bg-[#d4a020]/10',
    description: '3-day summit for bold conversations',
  },
  'ensuring-colorado': {
    label: 'Engage Colorado',
    shortLabel: 'Engage CO',
    color: 'bg-[#cc4444]',
    textColor: 'text-[#cc4444]',
    borderColor: 'border-[#cc4444]',
    lightBg: 'bg-[#cc4444]/10',
    description: 'Building a stronger Colorado community',
  },
  'investments': {
    label: 'Investments',
    shortLabel: 'Investments',
    color: 'bg-[#2a7d5c]',
    textColor: 'text-[#2a7d5c]',
    borderColor: 'border-[#2a7d5c]',
    lightBg: 'bg-[#2a7d5c]/10',
    description: 'Portfolio, diligence, and capital allocation',
  },
  'loud-bear': {
    label: 'Loud Bear',
    shortLabel: 'Loud Bear',
    color: 'bg-[#8b5a3c]',
    textColor: 'text-[#8b5a3c]',
    borderColor: 'border-[#8b5a3c]',
    lightBg: 'bg-[#8b5a3c]/10',
    description: 'Media, podcast, and social voice',
  },
} as const

export type InitiativeKey = keyof typeof INITIATIVES
export const ALL_INITIATIVE_KEYS = Object.keys(INITIATIVES) as InitiativeKey[]
