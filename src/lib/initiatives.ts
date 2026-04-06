export const INITIATIVES = {
  'brmf': {
    label: 'Boulder Roots Music Fest',
    shortLabel: 'BRMF',
    color: 'bg-red',
    textColor: 'text-red',
    borderColor: 'border-red',
    lightBg: 'bg-red/10',
    description: 'The Founders Experience — August 26–30, 2026',
  },
  'bold-summit': {
    label: 'Bold Summit',
    shortLabel: 'Bold Summit',
    color: 'bg-green',
    textColor: 'text-green',
    borderColor: 'border-green',
    lightBg: 'bg-green/10',
    description: '3-day summit for bold conversations',
  },
  'ensuring-colorado': {
    label: 'Ensuring Colorado',
    shortLabel: 'Ensuring CO',
    color: 'bg-blue',
    textColor: 'text-blue',
    borderColor: 'border-blue',
    lightBg: 'bg-blue/10',
    description: 'Building a stronger Colorado community',
  },
} as const

export type InitiativeKey = keyof typeof INITIATIVES
export const ALL_INITIATIVE_KEYS = Object.keys(INITIATIVES) as InitiativeKey[]
