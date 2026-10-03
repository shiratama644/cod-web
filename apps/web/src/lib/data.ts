export type StatKey = 'damage' | 'fireRate' | 'accuracy' | 'mobility' | 'range' | 'control'

export const STAT_LABELS: Record<StatKey, string> = {
  damage: 'DAMAGE',
  fireRate: 'FIRE RATE',
  accuracy: 'ACCURACY',
  mobility: 'MOBILITY',
  range: 'RANGE',
  control: 'CONTROL',
}

export type Weapon = {
  id: string
  name: string
  type: string
  level: number
  stats: Record<StatKey, number>
}

export const WEAPONS: Weapon[] = [
  {
    id: 'm4',
    name: 'M4',
    type: 'ASSAULT RIFLE',
    level: 150,
    stats: { damage: 52, fireRate: 68, accuracy: 70, mobility: 60, range: 58, control: 72 },
  },
  {
    id: 'ak117',
    name: 'AK117',
    type: 'ASSAULT RIFLE',
    level: 150,
    stats: { damage: 55, fireRate: 72, accuracy: 66, mobility: 62, range: 54, control: 64 },
  },
  {
    id: 'dlq33',
    name: 'DL Q33',
    type: 'SNIPER RIFLE',
    level: 90,
    stats: { damage: 92, fireRate: 22, accuracy: 60, mobility: 38, range: 88, control: 45 },
  },
  {
    id: 'qq9',
    name: 'QQ9',
    type: 'SMG',
    level: 110,
    stats: { damage: 44, fireRate: 82, accuracy: 58, mobility: 80, range: 36, control: 60 },
  },
  {
    id: 'rus79u',
    name: 'RUS-79U',
    type: 'SMG',
    level: 120,
    stats: { damage: 48, fireRate: 76, accuracy: 62, mobility: 78, range: 40, control: 66 },
  },
]

export const SECONDARIES = ['J358', 'MW11', 'Shorty', 'Crossbow', '.50 GS']
export const LETHALS = ['Frag Grenade', 'Semtex', 'Thermite', 'Molotov', 'Trip Mine']
export const TACTICALS = ['Flashbang', 'Concussion', 'Smoke', 'Stim', 'Gas Grenade']
export const OPERATOR_SKILLS = [
  'Death Machine',
  'War Machine',
  'Purifier',
  'Transform Shield',
  'Kinetic Armor',
  'Gravity Spikes',
]
export const PERKS_RED = ['Lightweight', 'Agile', 'Skulker', 'Martyrdom', 'Restore']
export const PERKS_GREEN = ['Toughness', 'Ghost', 'Quick Fix', 'Hardline', 'Fast Recover']
export const PERKS_BLUE = ['Dead Silence', 'Amped', 'Tracker', 'Alert', 'Engineer']

export type SlotKey =
  | 'muzzle'
  | 'barrel'
  | 'optic'
  | 'stock'
  | 'laser'
  | 'underbarrel'
  | 'ammo'
  | 'grip'
  | 'perk'

export type Attachment = { id: string; name: string; mods: Partial<Record<StatKey, number>> }

export const ATTACHMENT_SLOTS: {
  key: SlotKey
  label: string
  icon: string
  pos: { x: number; y: number }
}[] = [
  { key: 'optic', label: 'OPTIC', icon: 'center_focus_strong', pos: { x: 44, y: 8 } },
  { key: 'barrel', label: 'BARREL', icon: 'straighten', pos: { x: 66, y: 8 } },
  { key: 'muzzle', label: 'MUZZLE', icon: 'blur_on', pos: { x: 86, y: 30 } },
  { key: 'laser', label: 'LASER', icon: 'flare', pos: { x: 86, y: 62 } },
  { key: 'underbarrel', label: 'UNDERBARREL', icon: 'front_hand', pos: { x: 64, y: 82 } },
  { key: 'ammo', label: 'AMMUNITION', icon: 'bolt', pos: { x: 44, y: 82 } },
  { key: 'grip', label: 'REAR GRIP', icon: 'pan_tool', pos: { x: 24, y: 82 } },
  { key: 'stock', label: 'STOCK', icon: 'chair', pos: { x: 4, y: 46 } },
  { key: 'perk', label: 'PERK', icon: 'military_tech', pos: { x: 22, y: 8 } },
]

export const ATTACHMENTS: Record<SlotKey, Attachment[]> = {
  muzzle: [
    { id: 'mz1', name: 'OWC Light Suppressor', mods: { range: -4, control: 3 } },
    { id: 'mz2', name: 'Monolithic Suppressor', mods: { range: 6, mobility: -4, control: 4 } },
    { id: 'mz3', name: 'RTC Compensator', mods: { control: 8, accuracy: 2 } },
  ],
  barrel: [
    { id: 'br1', name: 'MIP Light Barrel', mods: { mobility: 6, range: -3 } },
    { id: 'br2', name: 'OWC Marksman', mods: { range: 10, accuracy: 6, mobility: -8 } },
    { id: 'br3', name: 'YKM Integral Suppressor', mods: { range: 4, control: 5, mobility: -3 } },
  ],
  optic: [
    { id: 'op1', name: 'Red Dot Sight 1', mods: { accuracy: 4 } },
    { id: 'op2', name: 'Holographic Sight', mods: { accuracy: 5, mobility: -1 } },
    { id: 'op3', name: '3x Tactical Scope', mods: { accuracy: 8, range: 4, mobility: -4 } },
  ],
  stock: [
    { id: 'st1', name: 'No Stock', mods: { mobility: 10, control: -8, accuracy: -5 } },
    { id: 'st2', name: 'YKM Combat Stock', mods: { accuracy: 6, mobility: -3 } },
    { id: 'st3', name: 'RTC Steady Stock', mods: { control: 6, accuracy: 4, mobility: -5 } },
  ],
  laser: [
    { id: 'ls1', name: 'OWC Laser - Tactical', mods: { accuracy: 7, mobility: -2 } },
    { id: 'ls2', name: 'MIP Laser 5mW', mods: { mobility: 4, accuracy: 2 } },
  ],
  underbarrel: [
    { id: 'ub1', name: 'Operator Foregrip', mods: { control: 8, mobility: -3 } },
    { id: 'ub2', name: 'Strike Foregrip', mods: { accuracy: 5, control: 3 } },
    { id: 'ub3', name: 'Merc Foregrip', mods: { control: 5, mobility: 2 } },
  ],
  ammo: [
    { id: 'am1', name: 'Extended Mag A', mods: { mobility: -3, fireRate: 2 } },
    { id: 'am2', name: 'Large Extended Mag B', mods: { mobility: -6, fireRate: 3 } },
    { id: 'am3', name: 'Fast Reload', mods: { mobility: 3, fireRate: 4 } },
  ],
  grip: [
    { id: 'gp1', name: 'Granulated Grip Tape', mods: { control: 5 } },
    { id: 'gp2', name: 'Stippled Grip Tape', mods: { mobility: 4, accuracy: 2 } },
  ],
  perk: [
    { id: 'pk1', name: 'FMJ', mods: { damage: 6 } },
    { id: 'pk2', name: 'Sleight of Hand', mods: { fireRate: 5, mobility: 2 } },
    { id: 'pk3', name: 'Long Shot', mods: { range: 8, damage: 3 } },
  ],
}

export const MAX_ATTACHMENTS = 5

export type ClassLoadout = {
  name: string
  primary: string // weapon id
  secondary: string
  lethal: string
  tactical: string
  skill: string
  perks: [string, string, string]
  attachments: Partial<Record<SlotKey, string>>
}

export const DEFAULT_CLASSES: ClassLoadout[] = [
  {
    name: 'ASSAULT',
    primary: 'm4',
    secondary: 'J358',
    lethal: 'Frag Grenade',
    tactical: 'Flashbang',
    skill: 'Death Machine',
    perks: ['Lightweight', 'Toughness', 'Dead Silence'],
    attachments: { muzzle: 'mz2', barrel: 'br2', underbarrel: 'ub1', stock: 'st2', ammo: 'am1' },
  },
  {
    name: 'RUSH',
    primary: 'qq9',
    secondary: 'Shorty',
    lethal: 'Semtex',
    tactical: 'Stim',
    skill: 'Kinetic Armor',
    perks: ['Agile', 'Quick Fix', 'Amped'],
    attachments: { laser: 'ls1', stock: 'st1', ammo: 'am3' },
  },
  {
    name: 'SNIPER',
    primary: 'dlq33',
    secondary: 'MW11',
    lethal: 'Trip Mine',
    tactical: 'Smoke',
    skill: 'Purifier',
    perks: ['Skulker', 'Ghost', 'Alert'],
    attachments: { optic: 'op3', barrel: 'br2' },
  },
  {
    name: 'SUPPORT',
    primary: 'ak117',
    secondary: 'Crossbow',
    lethal: 'Thermite',
    tactical: 'Concussion',
    skill: 'Transform Shield',
    perks: ['Restore', 'Hardline', 'Engineer'],
    attachments: { optic: 'op2', underbarrel: 'ub2' },
  },
  {
    name: 'FLANKER',
    primary: 'rus79u',
    secondary: '.50 GS',
    lethal: 'Molotov',
    tactical: 'Gas Grenade',
    skill: 'Gravity Spikes',
    perks: ['Lightweight', 'Ghost', 'Dead Silence'],
    attachments: { muzzle: 'mz1', laser: 'ls2' },
  },
]

export function computeStats(c: ClassLoadout): {
  base: Record<StatKey, number>
  final: Record<StatKey, number>
} {
  const w = WEAPONS.find((x) => x.id === c.primary) ?? WEAPONS[0]
  const final = { ...w.stats }
  ;(Object.keys(c.attachments) as SlotKey[]).forEach((slot) => {
    const att = ATTACHMENTS[slot].find((a) => a.id === c.attachments[slot])
    if (!att) return
    ;(Object.keys(att.mods) as StatKey[]).forEach((k) => {
      final[k] = Math.max(0, Math.min(100, final[k] + (att.mods[k] ?? 0)))
    })
  })
  return { base: w.stats, final }
}

export const MODES = {
  MP: [
    {
      id: 'frontline',
      name: 'FRONTLINE',
      map: 'STANDOFF',
      desc: "6v6 · Respawn at your team's base",
    },
    {
      id: 'tdm',
      name: 'TEAM DEATHMATCH',
      map: 'NUKETOWN',
      desc: '6v6 · First team to 50 kills wins',
    },
    {
      id: 'hardpoint',
      name: 'HARDPOINT',
      map: 'RAID',
      desc: '6v6 · Capture and hold the rotating zone',
    },
    {
      id: 'snd',
      name: 'SEARCH & DESTROY',
      map: 'CROSSFIRE',
      desc: '5v5 · No respawns, plant or defuse',
    },
    {
      id: 'domination',
      name: 'DOMINATION',
      map: 'FIRING RANGE',
      desc: '6v6 · Capture and hold 3 flags',
    },
  ],
  BR: [
    { id: 'isolated', name: 'ISOLATED', map: 'ISOLATED', desc: 'Squad · 100 players' },
    { id: 'blackout', name: 'BLACKOUT', map: 'BLACKOUT', desc: 'Duo · 100 players' },
    { id: 'alcatraz', name: 'ALCATRAZ', map: 'ALCATRAZ', desc: 'Quad · Respawn enabled' },
  ],
  ZM: [
    { id: 'undead', name: 'UNDEAD SIEGE', map: 'TUNISIA', desc: 'Co-op · Survive 5 nights' },
    { id: 'shi', name: 'SHI NO NUMA', map: 'SHI NO NUMA', desc: 'Co-op · Round based' },
  ],
} as const

export type ModeTab = keyof typeof MODES
