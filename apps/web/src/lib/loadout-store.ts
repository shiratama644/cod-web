import Dexie, { type EntityTable } from 'dexie'
import type { SavedLoadouts } from './loadout'

/**
 * ロードアウト永続化ストア。
 *   1. まず /api/loadouts(サーバ側 SQLite)に保存/読込する
 *   2. API が使えない場合(サーバ未起動・DB 故障・オフライン等)は
 *      dexie.js 経由でブラウザの IndexedDB に保存する(開発段階のフォールバック)
 * 保存は常に IndexedDB へ先に書く(ローカルファースト)ため、API が落ちていても
 * データは失われない。読込は API を優先し、API に無ければ IndexedDB を見る。
 */

type LoadoutRow = { id: number; data: SavedLoadouts; updatedAt: number }

class LoadoutLocalDb extends Dexie {
  loadouts!: EntityTable<LoadoutRow, 'id'>

  constructor() {
    super('cod-web')
    this.version(1).stores({ loadouts: 'id' })
  }
}

let _localDb: LoadoutLocalDb | null = null

/** IndexedDB が使える環境(ブラウザ)でのみ Dexie を初期化する。SSR では null。 */
function getLocalDb(): LoadoutLocalDb | null {
  if (typeof indexedDB === 'undefined') return null
  if (!_localDb) _localDb = new LoadoutLocalDb()
  return _localDb
}

/** IndexedDB 上の保存データを消す(テスト・デバッグ用)。 */
export async function clearLocalLoadouts(): Promise<void> {
  await getLocalDb()?.loadouts.clear()
}

/** IndexedDB から読む(失敗したら null)。 */
async function readLocal(): Promise<SavedLoadouts | null> {
  try {
    const row = await getLocalDb()?.loadouts.get(1)
    return row?.data ?? null
  } catch {
    return null
  }
}

/** IndexedDB へ書く(成功したら true)。 */
async function writeLocal(data: SavedLoadouts): Promise<boolean> {
  try {
    const db = getLocalDb()
    if (!db) return false
    await db.loadouts.put({ id: 1, data, updatedAt: Date.now() })
    return true
  } catch {
    return false
  }
}

export type LoadResult = { data: SavedLoadouts | null; source: 'api' | 'local' | 'none' }

/**
 * ロードアウトを読み込む。API 優先・IndexedDB フォールバック。
 * API から取得できたらローカルにもミラーする(次回のオフライン読込用)。
 */
export async function loadLoadouts(fetcher: typeof fetch = fetch): Promise<LoadResult> {
  try {
    const r = await fetcher('/api/loadouts')
    if (r.ok) {
      const j = (await r.json()) as { data: SavedLoadouts | null }
      if (j.data) {
        void writeLocal(j.data)
        return { data: j.data, source: 'api' }
      }
    }
  } catch {
    // API 不達 → IndexedDB へフォールバック
  }
  const local = await readLocal()
  return local ? { data: local, source: 'local' } : { data: null, source: 'none' }
}

export type SaveResult = 'api' | 'local' | 'error'

/**
 * ロードアウトを保存する。IndexedDB へ先に書き、その後 API へ送る。
 *   - API 成功 → 'api'
 *   - API 失敗だが IndexedDB に書けた → 'local'(データは保全されている)
 *   - 両方失敗 → 'error'
 */
export async function saveLoadouts(
  data: SavedLoadouts,
  fetcher: typeof fetch = fetch,
): Promise<SaveResult> {
  const localOk = await writeLocal(data)
  try {
    const r = await fetcher('/api/loadouts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    if (r.ok) return 'api'
  } catch {
    // API 不達 → ローカル保存のみ
  }
  return localOk ? 'local' : 'error'
}
