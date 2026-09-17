# DR-2: Additional Source Research

> Date: 2026-09-06(JST)  
> 関連: [`DR-1_COMPETITOR_DEEP_RESEARCH.md`](./DR-1_COMPETITOR_DEEP_RESEARCH.md)  
> 状態: 完了  
> 重要: 本追加調査でも live service への接続解析、通信キャプチャ、production bundle 解析、アセット/コード流用を行っていない。

## 1. 目的と範囲

DR-1 の「要確認」に残した項目のうち、公開情報だけで解消できるものを追加確認した。

| 対象 | 確認したいこと | 結果 |
|---|---|---|
| bloxd.io Terms | 公式 Terms of Service で reverse engineering 禁止を確認できるか | 公式 URL で確認できた |
| Krunker docs | UGC networking docs / NETWORK API の直接 URL が現在も取得できるか | 直接 URL で取得できた。versioned URL は確認できない |
| Noa / Babylon | `noa-engine@0.33.0` と Babylon 9 系の peer 互換性を公開 metadata で再確認できるか | semver 上は互換しない。Noa examples も Babylon 6 系前提 |
| Noa examples | Noa の peer dependency 運用と Vite 設定例を clone で確認できるか | clone して remote / HEAD / license / 読んだファイルを記録した |

## 2. Source Inventory

### 2.1 Web / documentation sources

| ID | 種別 | URL | 取得日 | 根拠として使った内容 | 信頼度 |
|---|---|---|---|---|---|
| BX-TOS-OFFICIAL | official terms | https://bloxd.io/terms-of-service | 2026-09-06 | Terms of Service。Cheating and Unfair Play と Software License and IP Restrictions に reverse engineer / decompile / disassemble / unauthorized access 禁止がある | 高 |
| BX-PRIVACY-OFFICIAL | official privacy | https://bloxd.io/privacy-policy | 2026-09-06 | Bloxd LTD、公式サイト / mobile apps での privacy scope、chat moderation、data retention 等 | 高 |
| KR-NET-DIRECT | official docs | https://docs.krunker.io/guides/multiplayer-networking | 2026-09-06 | client/server architecture、`GAME.NETWORK.send/broadcast`、rate limits、server authority | 高 |
| KR-API-NETWORK | official docs | https://docs.krunker.io/api/network | 2026-09-06 | NETWORK API の direct endpoint。`broadcast` と `send` の signature / availability / payload limit | 高 |
| NOA-NPM-LATEST | npm metadata | https://registry.npmjs.org/noa-engine/latest | 2026-09-06 | `noa-engine@0.33.0`、MIT、`peerDependencies: { "@babylonjs/core": "^6.1.0" }` | 高 |
| BABYLON-NPM-LATEST | npm metadata | https://registry.npmjs.org/@babylonjs/core/latest | 2026-09-06 | `@babylonjs/core@9.25.0`、Apache-2.0、ESM、`types: index.d.ts` | 高 |
| NOA-HISTORY | official source docs | https://raw.githubusercontent.com/fenomas/noa/master/docs/history.md | 2026-09-06 | Noa 0.33.0 の Babylon update、0.31.0 の Babylon 5 alpha、0.30.0 の tickRate semantics、0.29.0 の manual chunk loading | 高 |

### 2.2 Cloned repositories

| ID | Repo | Clone path | Remote URL | HEAD | License | 読んだファイル |
|---|---|---|---|---|---|---|
| CL-NOA-EX | noa-examples | `/tmp/cod-web-research/noa-examples` | `https://github.com/fenomas/noa-examples.git` | `f4e9c8d57386273b68b2ff713e200fd1a5b754b6` | ISC | `README.md`, `package.json`, `vite.config.js` |

## 3. Findings

### 3.1 bloxd.io Terms は公式 URL で確認できた

| 主張 | Source | 根拠 | cod-web 判断 |
|---|---|---|---|
| bloxd.io の Terms of Service は公式 `https://bloxd.io/terms-of-service` で取得できる | BX-TOS-OFFICIAL | ページ先頭に `Terms of Service`、`Last updated: July 15, 2025`、Bloxd LTD と記載 | DR-1 の secondary mirror 依存は不要になった。今後は公式 Terms を一次情報として使う |
| Cheating and Unfair Play は reverse engineer / unauthorized access を禁止している | BX-TOS-OFFICIAL | `trying to reverse engineer our game's code in any way`、`trying to gain unauthorised access to our systems` の禁止 | live service 接続解析・traffic capture・bundle 解析禁止を継続し、`docs/arch/legal.md` の根拠を公式 URL に更新する |
| Software License and IP Restrictions は game client の copy / modify / derivative works / reverse-engineer / decompile / disassemble 等を禁止している | BX-TOS-OFFICIAL | `You may not copy, modify, distribute, or create derivative works of the game client, or attempt to reverse-engineer, decompile, disassemble...` | 競合 client code / bundle / asset / UI の流用不可を再確認。公開 GitHub repo も license 不明なら設計観察に留める |
| Privacy Policy は公式 URL で取得でき、Bloxd LTD の data/privacy scope を示す | BX-PRIVACY-OFFICIAL | `Bloxd Privacy Policy`, `Last updated: 7/1/2026`, chat moderation / data retention | protocol 解析の根拠ではない。UGC/moderation/運用設計時の参考に留める |

### 3.2 Krunker docs は直接 URL が取得できたが versioned docs ではない

| 主張 | Source | 根拠 | cod-web 判断 |
|---|---|---|---|
| `guides/multiplayer-networking` は現在も直接取得できる | KR-NET-DIRECT | client/server architecture、server authority、send/broadcast、Network Limits を取得 | DR-1 の Krunker UGC networking 根拠は有効 |
| `api/network` は direct endpoint として取得できる | KR-API-NETWORK | NETWORK API の methods / signatures / max 2000 characters が取得できる | 今後は guide URL と API URL の両方を source table に載せると再確認しやすい |
| docs URL に version pin / commit SHA は確認できない | KR-NET-DIRECT, KR-API-NETWORK | 取得ページ上に version selector / immutable permalink は見当たらない | 実装判断へ反映する前に再取得する。競合数値は cod-web 仕様へ直輸入しない |

### 3.3 `noa-engine@0.33.0` と Babylon 9 系は semver 上 peer mismatch

| 主張 | Source | 根拠 | cod-web 判断 |
|---|---|---|---|
| `noa-engine@0.33.0` は `@babylonjs/core` peer として `^6.1.0` を要求する | NOA-NPM-LATEST | npm metadata の `peerDependencies` | `@babylonjs/core@9.x` と同時導入する場合は、package manager の peer warning だけでなく実行時 smoke test が必要 |
| `@babylonjs/core` latest は `9.25.0` | BABYLON-NPM-LATEST | npm metadata の `version`, `license`, `types`, `type` | Phase 1 の FPS Babylon 導入は Babylon 9 系で進め、Noa 導入は Phase 7 で別検証に分ける |
| Noa history は 0.33.0 で `Babylon version updated`、0.31.0 で Babylon 5 alpha への移動を記録している | NOA-HISTORY | history の 0.33.0 / 0.31.0 entries | Noa が Babylon major 更新に追随する可能性はあるが、現行 npm peer は 6 系。9 系対応済みとは断定しない |
| `noa-examples@0.33.0` も `@babylonjs/core: ^6.1.0` を dependency にしている | CL-NOA-EX | cloned `package.json` | Noa 0.33 の examples は Babylon 6 系前提として扱う |
| Noa examples は Vite 設定で `@babylonjs/core` を dedupe し、Babylon chunk を manual chunk 化している | CL-NOA-EX | cloned `vite.config.js` | Voxel 導入時は duplicate Babylon を避け、chunk 分割と bundle size を確認する候補 |
| Noa examples README は Babylon を peer dependency として、game world 側で `@babylonjs/core` を宣言する設計を説明している | CL-NOA-EX | cloned `README.md` | cod-web で Noa を使う場合も Babylon version ownership は app 側に置く。ただし 9 系 compat は検証完了まで未確定 |

## 4. DR-1 要確認の解消状況

| DR-1 要確認 | DR-2 結果 | 状態 |
|---|---|---|
| bloxd terms の公式出典 | `https://bloxd.io/terms-of-service` で確認できた | 解消 |
| Krunker / bloxd docs URL 安定性 | Krunker の direct docs URL と bloxd Terms / Privacy は取得できた。ただし immutable/versioned permalink は確認できない | 部分解消。反映前再取得を継続 |
| `noa-engine@0.33.0` と Babylon 9 系 peer mismatch | npm metadata と examples clone で、現行公開情報は Babylon 6 系前提と確認 | 解消。ただし実動作互換は Phase 7 smoke test 待ち |
| Noa / micro-game-shell loop ownership | examples の Vite / peer dependency 運用は確認したが、loop ownership の実装詳細は DR-1 の clone 結果どおり導入時検証が必要 | 継続 |
| UGC sandbox の言語/API | 今回の追加調査対象外。Phase 8 計画時に ask_user | 継続 |

## 5. 採用候補 / 不採用 / 要確認

### 5.1 採用候補

| 優先 | パターン | 根拠 | 反映候補 |
|---:|---|---|---|
| 高 | bloxd 関連の法務根拠は公式 Terms URL を使い、secondary mirror を一次根拠にしない | BX-TOS-OFFICIAL | `legal.md`, future research |
| 高 | Noa 導入は Babylon 9 系 FPS 導入と同じタスクに混ぜず、Phase 7 で smoke test + peer warning + bundle 重複確認を行う | NOA-NPM-LATEST, BABYLON-NPM-LATEST, CL-NOA-EX | Phase 7 planning |
| 中 | voxel client bundle は Babylon chunk 分割と dedupe を確認する | CL-NOA-EX | Phase 7 build verification |
| 中 | Krunker UGC networking は guide URL と API URL の両方を根拠に残す | KR-NET-DIRECT, KR-API-NETWORK | future UGC docs |

### 5.2 不採用 / 採用不可

| 項目 | 理由 |
|---|---|
| bloxd.io live client / server / bundle の解析 | 公式 Terms が reverse engineering / decompile / unauthorized access を禁止している |
| Noa + Babylon 9 系を互換確認なしで本線導入 | semver 上 peer が `^6.1.0` であり、examples も Babylon 6 系前提 |
| Krunker docs の network limits を cod-web の確定値として直輸入 | docs は UGC API の制限であり、cod-web の負荷特性・サーバ実装とは別 |

### 5.3 要確認

| 項目 | 確認タイミング |
|---|---|
| Noa + Babylon 9 系の実動作 smoke test | Phase 7 着手前 |
| Noa internal loop と cod-web platform loop の所有権 | Phase 7 計画時 |
| UGC sandbox の言語/API と公開範囲 | Phase 8 計画時に ask_user |
| Krunker docs の versioned permalink / changelog source | UGC docs 反映時 |

## 6. 完了チェック

- [x] bloxd Terms の公式 URL を確認した
- [x] Krunker networking guide と NETWORK API direct URL を確認した
- [x] Noa / Babylon の npm metadata と Noa history を再確認した
- [x] Noa examples は clone path、remote URL、commit SHA、license、読んだファイル一覧を記録した
- [x] live service 接続解析、通信キャプチャ、production bundle 解析を行っていない
- [x] 採用候補、不採用、要確認を分けた
