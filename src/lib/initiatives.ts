export const INITIATIVES = {
  'brmf': {
    label: 'Boulder Roots Music Fest',
    shortLabel: 'Boulder Roots',
    color: 'bg-[#4478b8]',
    textColor: 'text-[#4478b8]',
    borderColor: 'border-[#4478b8]',
    lightBg: 'bg-[#4478b8]/10',
    description: 'The Founders Experience — August 26–30, 2026',
  },
  'bold-summit': {
    label: 'Bold Summit',
    shortLabel: 'Bold Summit',
    color: 'bg-[#d4a838]',
    textColor: 'text-[#d4a838]',
    borderColor: 'border-[#d4a838]',
    lightBg: 'bg-[#d4a838]/10',
    description: '3-day summit for bold conversations',
  },
  'ensuring-colorado': {
    label: 'Ensuring Colorado',
    shortLabel: 'Ensuring CO',
    color: 'bg-[#c45858]',
    textColor: 'text-[#c45858]',
    borderColor: 'border-[#c45858]',
    lightBg: 'bg-[#c45858]/10',
    description: 'Building a stronger Colorado community',
  },
} as const

export type InitiativeKey = keyof typeof INITIATIVES
export const ALL_INITIATIVE_KEYS = Object.keys(INITIATIVES) as InitiativeKey[]
