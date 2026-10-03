import { type ClassLoadout, DEFAULT_CLASSES } from './data'

/** /api/loadouts に永続化されるペイロード。 */
export type SavedLoadouts = { classes: ClassLoadout[]; equipped: number }

/** Merge a persisted class with defaults so malformed/legacy data can never crash the UI. */
export function sanitizeClass(raw: unknown, fallback: ClassLoadout): ClassLoadout {
  if (typeof raw !== 'object' || raw === null) return fallback
  const r = raw as Partial<Record<keyof ClassLoadout, unknown>>
  const str = (v: unknown, d: string) => (typeof v === 'string' && v.length > 0 ? v : d)
  const perksRaw = Array.isArray(r.perks) ? r.perks : []
  const perks = fallback.perks.map((d, i) => str(perksRaw[i], d)) as [string, string, string]
  const attachments: ClassLoadout['attachments'] = {}
  if (typeof r.attachments === 'object' && r.attachments !== null) {
    for (const [k, v] of Object.entries(r.attachments)) {
      if (typeof v === 'string') attachments[k as keyof ClassLoadout['attachments']] = v
    }
  }
  return {
    name: str(r.name, fallback.name),
    primary: str(r.primary, fallback.primary),
    secondary: str(r.secondary, fallback.secondary),
    lethal: str(r.lethal, fallback.lethal),
    tactical: str(r.tactical, fallback.tactical),
    skill: str(r.skill, fallback.skill),
    perks,
    attachments,
  }
}

/** classes をフィールド単位で検証し、equipped を配列範囲内にクランプする。 */
export function sanitizeSaved(data: SavedLoadouts): SavedLoadouts {
  const classes = data.classes.map((c, i) =>
    sanitizeClass(c, DEFAULT_CLASSES[i % DEFAULT_CLASSES.length]),
  )
  const max = classes.length - 1
  const eq = Number.isInteger(data.equipped) ? Math.min(Math.max(data.equipped, 0), max) : 0
  return { classes, equipped: eq }
}
