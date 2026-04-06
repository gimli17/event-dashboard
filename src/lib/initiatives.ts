export const INITIATIVES = {
  'brmf': {
    label: 'Boulder Roots Music Fest',
    shortLabel: 'Boulder Roots',
    color: 'bg-[#4080c4]',
    textColor: 'text-[#4080c4]',
    borderColor: 'border-[#4080c4]',
    lightBg: 'bg-[#4080c4]/10',
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
    label: 'Ensuring Colorado',
    shortLabel: 'Ensuring CO',
    color: 'bg-[#cc4444]',
    textColor: 'text-[#cc4444]',
    borderColor: 'border-[#cc4444]',
    lightBg: 'bg-[#cc4444]/10',
    description: 'Building a stronger Colorado community',
  },
} as const

export type InitiativeKey = keyof typeof INITIATIVES
export const ALL_INITIATIVE_KEYS = Object.keys(INITIATIVES) as InitiativeKey[]
