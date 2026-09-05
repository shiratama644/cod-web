# Phase 0: 現行コードの穴（長さ検証・fuzz・backpressure・slice）

> 対応 task-list ID: `PLAT-0`（本計画） / 実装 `PH0-A` … `PH0-F`（docs/task-list.md）
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠
> 仕様正本: [`docs/arch/milestones.md`](../arch/milestones.md) フェーズ 0、[`protocol.md`](../arch/protocol.md)、[`server.md`](../arch/server.md)、[`engineering.md`](../arch/engineering.md)

## 1. 開始前確認

- ブランチはセッション固定。着手時に `git status` / `git log -5` を確認し、未コミット変更があれば停止する
- 依存: DOC-1 / DOC-2 / DOC-3 / LIC-1 は完了。本計画（PLAT-0）が実装の前提
- 関連仕様: milestones フェーズ 0、protocol（Input 16B・固定長切断・`send()` 戻り値）、server（Bun.serve オプション・レート制限）、engineering（fuzz 100 万・固定長 ±1）、product（lagcomp の扱い）、adr.md（ADR-004 / 005）
- 本計画の §5 と §7 を再読してから実装サブタスクに入る

## 2. 目的 (Why)

Babylon 移行（フェーズ 1）より前に、現行 bun WS 権威サーバが **短い・壊れたパケットでプロセスを落とさない**こと、および **公式 `ws.send` の背圧**に合わせることを保証する。

現行コードで確認した穴（計画時点）:

| 穴 | 現行 | 理想（フェーズ 0） |
|---|---|---|
| Input 長 | type 込み **13B**（`INPUT_PACKET_BYTES === 13`） | **16B 固定**。不一致は切断 1002 |
| 境界 | `decodeInput` が `getUint32` を無検査。短いバッファは RangeError | `BinaryReader` 不足なら `ProtocolError`。プロセスは落ちない |
| handleMessage | `server/index.ts` の `message` に try/catch なし | 全体 try/catch |
| 入力レート | 制限なし | 90/s 超で切断 |
| 背圧 | 存在しない `ws.bufferedAmount` を読む。`send` の -1/0 を使わない | `send()` が -1 ならスナップショット間引き、0 なら切断 |
| WS オプション | 未設定（idleTimeout 既定 120 等） | `idleTimeout: 30`, `sendPings: true`, `perMessageDeflate: false`, `backpressureLimit: 1MB`, `closeOnBackpressureLimit: true` |
| コピー | `buffer.slice` / `ArrayBuffer#slice`（`toArrayBuffer`・snapshot 送信・クライアント送信） | `subarray()`（コピーしない） |
| lagcomp | `LagCompStore.record()` がどこからも呼ばれない | **毎ティック `record()`**、または削除 |

**DoD（milestones）:** 100 万 fuzz で落ちない。固定長 ±1 で切断。

## 3. 変更範囲 (Scope)

変更対象:

- `shared/protocol/` — Input 16B、PacketType Input=`0x10`、BinaryReader、定数コメント（欠ファイル `server-authority.md` / `networking.md` への参照を protocol.md へ）
- `server/index.ts` — WS オプション、message の長さ検証・try/catch・レート制限、`toArrayBuffer` の subarray、`send()` 戻り値
- `server/room/Room.ts` — `Peer` から `getBufferedAmount` を外し、`sendBinary` は送信結果（-1/0/正）を扱う
- `server/net/snapshot.ts` — 背圧を `send()` 戻り値で判定。送信は `subarray`
- `server/sim/Simulation.ts` + `server/net/lagcomp-store.ts` — 毎ティック `record()`（採用する場合）。窓は protocol の 500ms
- `src/game/net/GameClient.ts` — 16B 送信。`slice` → 送信長の `subarray`（必要ならビュー）
- `_tests_/` — packer / snapshot / Room / 新規 fuzz・固定長・レート・send 戻り値

変更しない（境界外）:

- Babylon / R3F シーン削除 / モノレポ（フェーズ 1）
- SimProfile 分離（フェーズ 2）
- Snapshot ワイヤレイアウト（現行 type+tick+ack+16B/人）。ヘッダ 16B 化・entity 17B・`vy` 削除は今やらない（ADR 未決 B）
- Hello チケット HMAC、マッチメイカー、マルチルーム（フェーズ 4）
- `NetTransport` の Channel 先頭 1B、`webtransport.ts`（ADR-005 の「最初から」はフェーズ 1 以降の再設計で入れる。本フェーズは現行 WS の穴だけ）
- AOI、FireAction、チャンク、UGC
- クライアント予測を rAF から setInterval へ戻すこと（マイルストーンに無い）
- 入力キュー上限 120 → 32（server.md）。今はやらない
- OPEN-A（`dtMs` の単位）。本フェーズは **現行どおり u16 に載せる整数**を維持し、`dtMs > 500` は clamp（切断しない）。単位の公式決定はしない
- `.archive/` と過去ログ

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- `docs/arch/adr.md` に反する実装をしない（WT / geckos / 生 UDP を足さない。R3F で新規 3D を足さない）
- L1 に `if (type === 'voxel' | 'fps')` を書かない（本フェーズは単一 FPS のまま。タイプ分岐を新設しない）
- 存在しない Bun API（`bufferedAmount` 等）を使わない。`send()` の意味は公式どおり -1 / 0 / 1+
- fuzz を通すためだけのテスト削除・アサーション緩和
- Input 16B と無関係な Snapshot レイアウト変更
- `dtMs` を ×10 にも ms にも「決定した」と書かない（OPEN-A）

強制されていないこと（本フェーズでやらない）: Channel バイト、Hello 認証、モノレポ、Babylon。

## 5. 完了条件 (DoD)

フェーズ全体（PH0-F 完了時）:

- [ ] Input は 16 バイト。長さ 15 および 17 でサーバが切断（1002）
- [ ] moveX/Z の量子化値が -100..100 の外なら切断
- [ ] 短バッファ・ランダム 100 万パケットで **プロセスが落ちない**（ProtocolError または切断）
- [ ] 入力 90/s 超で切断（テストで再現）
- [ ] `send()` が -1 のときそのクライアントのスナップショットをスキップ。0 のとき切断。`getBufferedAmount` / `bufferedAmount` がコードに残らない
- [ ] `perMessageDeflate: false` ほか §2 の WS オプションが `Bun.serve` に明示
- [ ] ホットパスのパケット送信が `slice` コピーでない（`subarray`）
- [ ] lagcomp は毎ティック記録されている、またはモジュールごと削除されている（どちらか一方。混在禁止）
- [ ] `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` 全 pass
- [ ] `docs/task-list.md` の状態・進捗・証拠を更新
- [ ] タスク範囲外のファイル（`.archive/` を含む）に意図しない変更がない

各サブタスクのコミット単位でも 4 検証（または docs のみならリンク整合）。

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | 必須 | BinaryReader 不足バイト。Input 16B 往復。±1 バイトで切断相当の結果。move 範囲外。dtMs>500 clamp。90/s 超。`send` モックが -1 でスキップ・0 で切断。lagcomp `record` 呼び出し（残す場合）。fuzz 100 万（node 環境、固定シード可） |
| Component (testing-library) | しない | HUD は対象外 |
| E2E (Playwright / CI) | しない | `test:e2e` 未導入。捏造しない |
| 実環境 | しない（本フェーズ） | 2 タブ位置同期は旧 P1-G のまま「実環境検証待ち」。16B 化後の目視はフェーズ 1 前に任意 |

fuzz は Sandbox で Vitest として走らせる。1e6 は数秒〜十数秒を想定。タイムアウトしたら分割またはイテレーション数を計画書改訂（勝手に 1000 に減らして DoD 達成としない）。

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:

- 仕様書（本計画・arch・AGENTS.md・skills）同士に、本計画 §11 で解消していない矛盾がある
- task-list.md 記載の変更範囲を超える変更が必要
- 破壊的変更が必要（例: Snapshot ワイヤを 16B Input 以外の理由で変える）
- ユーザー判断が必要な設計論点に到達した（OPEN-A を「決定」したくなる、lagcomp 削除 vs 記録で製品影響が出る、など）
- 開始時点で作業ツリーに未確認の変更がある
- Bun の `send()` / `idleTimeout` 等について公式と arch が食い違い、arch を書き換えないと進めない

## 8. 完了時に行うこと

1. 差分を自己レビュー（`bufferedAmount`・`slice`・13B・MSG_C2S_INPUT===1 の残存を grep）
2. 4 検証を実行
3. `docs/task-list.md` を更新
4. タスク ID を含むコミット（例: `fix(PH0-A): 16-byte input and bounds-checked reader`）
5. 証拠中心の完了報告（fuzz 件数、±1 テスト名）
6. フェーズ 0 完了時は `docs/planning/complete/PHASE00_COMPLETE.md`（任意。task-list の証拠が正）

## 9. サブタスク分割

1 サブタスク = 1 commit。順序固定。

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| PH0-A | BinaryReader + Input 16B + 長さ/範囲で切断 | `shared/protocol/*`、server `message`、GameClient 送信、packer テスト | PLAT-0 |
| PH0-B | 入力レート制限 90/s | トークンバケット（ティックまたは wall 基準をテスト可能に）、超過で切断 | PH0-A |
| PH0-C | Bun WS オプション + `send()` -1/0 | `server/index.ts`、Peer、SnapshotBroadcaster、snapshot テスト | PH0-A |
| PH0-D | `slice` → `subarray` | `toArrayBuffer`、snapshot 送信、GameClient `encodeAndSend` | PH0-C |
| PH0-E | lagcomp 毎ティック `record()` | Simulation.step から呼ぶ。窓 500ms。テスト。**削除を選ぶならこの ID で削除に切り替え、理由を task-list に書く** | PH0-A |
| PH0-F | DoD: 100 万 fuzz + 固定長 ±1 | `_tests_/shared/protocol` または `_tests_/server`。プロセス非クラッシュ | PH0-A〜E |

推奨実装順: A → C と B は A の後なら並列にしない（進行中は 1 件）。A → B → C → D → E → F。

## 10. 設計詳細・仕様

### 10.1 Input 16B（PH0-A）

protocol.md どおり:

```
0  u8   type = 0x10
1  u8   reserved = 0
2  u32  seq
6  i8   moveX   -100..100 → -1..1
7  i8   moveZ
8  u16  yaw     0..65535 → 0..2π
10 i16  pitch   -16384..16384 → -π/2..π/2
12 u16  buttons
14 u16  dtMs
```

- `MSG_C2S_INPUT` を `1` から `0x10` に変える（ワイヤ破壊。クライントとサーバを同じコミットで）
- 現行 `flags: u8` は `buttons: u16` に拡張。bit0 jump / bit1 crouch は維持。bit9–15 が非 0 なら不正記録（切断は protocol に無いので **記録のみ**。ロガーが無ければテスト可能なカウンタ）
- move 量子化: 現行は -127..127 スケール。理想は -100..100。**encode は -100..100 にクランプして書き、decode 後 -1..1。受信値が -100..100 の外なら切断**
- pitch は i8 から i16 へ
- 長さ ≠ 16 は切断 1002。空バッファも 1002（server.md）
- Snapshot の type バイト（現行 `2`）は変えない

`dtMs`: 現行クライアントは `Math.round(1000/60)` を載せる。本フェーズもそれを続ける。`> 500` は clamp。OPEN-A は触らない。

### 10.2 BinaryReader（PH0-A）

- `DataView` ラッパ。`u8/u16/u32/i8/i16` を読む前に残バイトを確認
- 不足は throw `ProtocolError`（既存の RangeError でプロセス死を置換）
- `decodeInput` / `decodeSnapshot` / `readMessageType` は Reader 経由。Snapshot は長さ不正でも **落とさない**（入力と違い切断対象の固定長表に無い）。不足なら ProtocolError を握り、そのパケットを捨てる

### 10.3 レート制限（PH0-B）

server.md: input perSec 90, burst 20。超過は即切断。トークンバケット。テストは仮想時計または連続 200 入力で再現する。

### 10.4 背圧（PH0-C）

公式: `send` は -1（キュー済み・背圧）、0（破棄）、1+（バイト）。

- `Peer.sendBinary` は bun の戻り値をそのまま返す（boolean やぎではない）
- Snapshot: -1 ならそのクライアントをスキップ（最新のみ、次ティックで再送）。0 なら切断
- `getBufferedAmount` 削除。テストの `bufferAmount` は `sendBinary` が -1 を返すスタブに置換
- `maxPayloadLength: 64 * 1024` も server.md どおり明示してよい（禁止されていない）

### 10.5 subarray（PH0-D）

- Bun の WS メッセージが `Uint8Array` のとき `buf.buffer.slice(...)` はコピー。`subarray` の underlying を DataView するか、offset+length 付き DataView
- 送信はリングバッファの `Uint8Array.subarray(0, bytes)`。`ArrayBuffer.slice` 禁止
- クライアント `sendBuffer.slice(0, len)` も同様。`NetTransport.sendBinary` が `ArrayBufferView` を受けられるなら型を広げる（Channel は足さない）

### 10.6 lagcomp（PH0-E）

既定: **残して毎ティック記録**。`LAGCOMP_HISTORY_MS` を 100 → 500（protocol の巻き戻し窓）。`shift()` はホットパスだがフェーズ 0 ではリング化まで強制しない（ゼロアロケ完全化はフェーズ 1+）。テストで `step()` 後に履歴が 1 件以上あること。

削除に切り替えるのは「記録するとティック予算を明らかに超える」と測定できた場合のみ。そのときはユーザーに確認（§7）。

### 10.7 fuzz（PH0-F）

- 長さ 0..64 のランダムバイト、type を 0x10 に固定したもの、15/16/17B の境界を含む
- サーバの `message` 相当関数をソケット無しで呼ぶ（Room をテスト用に抽出してもよい）
- 例外が ProtocolError / 切断以外で外に出ない
- 固定長表のうち **本フェーズで実装する Input と Ping は Ping 未実装**なので ±1 は Input のみ必須。BlockAction / FireAction / ReloadAction は未実装のためテストしない（捏造しない）

## 11. リスク・Gotchas

- **ADR-005 vs フェーズ 0:** ADR は Channel / Hello 認証を「最初から」と言う。milestones フェーズ 0 は現行穴リスト。**本計画は milestones の箇条書きを範囲とする。** Hello はフェーズ 4、Channel はフェーズ 1 の NetTransport 再設計。これは範囲の切り方であり、ADR を覆す実装ではない
- bun の `ws.send` に `bufferedAmount` は無い。Peer のキャストを残すと再発する
- 16B 化はワイヤ破壊。途中のコミットでクライアントだけ古い 13B を送ると接続不能。PH0-A は client+server+tests を同時に
- `decodeInput(view, 1)` のオフセット前提が reserved バイト導入で崩れる。Reader は type 込み先頭から読む方が安全
- fuzz 1e6 が CI で重い場合は `it` タイムアウトを延ばす。件数は減らさない
- 現行 `constants.ts` が欠ファイルを正本として引用している。PH0-A でコメントだけ protocol.md に直す（仕様変更ではない）

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| PH0-A | | | |
| PH0-B | | | |
| PH0-C | | | |
| PH0-D | | | |
| PH0-E | | | |
| PH0-F | | | |
