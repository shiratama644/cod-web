# 2026-10-04 dexie.js / IndexedDB フォールバック追加

## 依頼

「開発段階なのでもし DB がなかったとしても dexie.js を使って IndexedDB に
保存するようにしてください。」— サーバ側 DB(SQLite API)が使えない状況でも
ブラウザ側でロードアウトを失わないようにする。

## 実装

- `apps/web` に **dexie** を追加、ルート devDeps に **fake-indexeddb**(テスト用)。
- 新規 `apps/web/src/lib/loadout-store.ts`:
  - Dexie DB 名 `cod-web` / テーブル `loadouts`(id キー、id=1 の単一行)
  - `loadLoadouts(fetcher=fetch)`: API 優先 → 取得できたら IndexedDB へミラー
    (`source:'api'`)。API が null/HTTP エラー/不達なら IndexedDB(`'local'`)、
    どちらも無ければ `'none'`
  - `saveLoadouts(data, fetcher=fetch)`: **ローカルファースト**(先に IndexedDB へ put)
    → API PUT。戻り値 `'api'` / `'local'`(API 失敗だがローカル保全)/ `'error'`(両方失敗)
  - `clearLocalLoadouts()`: テスト・デバッグ用
  - SSR ガード: `typeof indexedDB === 'undefined'` なら Dexie を初期化しない
  - fetcher 引数は DI(テストでモック注入。既定は globalThis.fetch)
- `MainMenu.tsx`: fetch 直叩きを loadLoadouts/saveLoadouts へ置換。
  saveState に `'local'` を追加 — API 不達時は右上の同期表示が
  `SAVED (LOCAL)`(琥珀色・save アイコン)になる。成功時は従来どおり `SAVED`。
- README「ブラウザ側フォールバック」節、nextjs-frontend SKILL の DB 行を更新。
- cspell words: dexie / indexeddb。

## 検証

- 新規テスト `_tests_/apps/web/src/lib/loadout-store.test.ts`(9 本、fake-indexeddb/auto):
  API 成功 / HTTP 500 / ネットワーク断の保存 3 経路、読込の api・ミラー・
  ローカルフォールバック・none×2・上書きラウンドトリップ — 全 PASS
- biome / typecheck / cspell 0 issues / check:all 7/7(カバレッジ閾値 85% 維持)
- `next build` 成功 → preview(:4173)再起動で /api/health・/ 200 確認
- 制約: 実ブラウザでの IndexedDB 動作はプレビュー URL で目視可能
  (サーバを止めてもロードアウトが残り、表示が SAVED (LOCAL) になる)
