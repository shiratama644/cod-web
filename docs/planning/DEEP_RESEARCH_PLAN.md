# Deep Research 計画: Krunker.io / bloxd.io の技術調査

> 対応 task-list ID: `DOC-6`（本計画） / 実調査 `DR-1` / 追加調査 `DR-2` / 追加深掘り `DR-3` / engine・UGC・asset pipeline 深掘り `DR-4` / Perplexity 差分検証 `DR-5`  
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠  
> 関連仕様: [`docs/arch/legal.md`](../arch/legal.md)、[`docs/arch/editor.md`](../arch/editor.md)、[`docs/arch/api-sources.md`](../arch/api-sources.md)  
> 重要: bloxd.io（ユーザー表記 Bloxed.io を含む）のライブサービスへ接続しての解析・リバースエンジニアリングは行わない。

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）
- `docs/task-list.md` で対象 DR タスクの状態を確認する（完了済みタスクを再実施しない）
- [`legal.md`](../arch/legal.md) の法務制約を再読する
- GitHub 上のコードを調べる場合は、GitHub の検索結果や Web UI の断片だけで判断せず、**実際に `git clone` してローカル checkout を作り、commit SHA を記録してから読む**
- 実調査前に、本計画 §4（禁止事項）と §7（停止条件）を再読する

## 2. 目的 (Why)

cod-web の `fps` / `voxel` / `official` / `ugc` / エディタ方針を固めるため、Krunker.io と bloxd.io の公開情報から、次を調査する。

| 領域 | 知りたいこと | cod-web への反映先 |
|---|---|---|
| ネットワーク | transport、tick / snapshot、補間、予測、マッチメイク、ルーム一覧、チャット、UGC 同期 | `protocol.md`, `server.md`, `matchmaker.md` |
| フロントエンド | 3D engine、UI framework、bundling、asset loading、input、mobile、HUD、settings | `client.md`, `editor.md`, `api-sources.md` |
| エディタ | Krunker 風 map editor、GLB/glTF 取り込み、公開/承認/バージョン管理、公式/UGC 階層 | `editor.md`, `ugc.md`, future Phase 8 plan |
| voxel 実装 | Noa 系、chunk、terrain generation、physics、ECS、mobile input | `sim-profiles.md`, `engineering.md` |
| 法務/運用 | 利用規約、アセット非流用、公開 API とリバースエンジニアリング境界 | `legal.md` |

## 3. 変更範囲 (Scope)

### 変更対象

- `docs/research/`（実調査結果の保存先。必要なら新設）
- `docs/planning/DEEP_RESEARCH_PLAN.md`（本計画）
- `docs/task-list.md`（`DOC-6` / `DR-1` / `DR-2` / `DR-3` / `DR-4` の状態）
- 調査で得た **実装に使える一般化知見**のみ、後続タスクで `docs/arch/` へ提案として反映

### 変更しない（境界外）

- Krunker / bloxd / Minecraft のコード・アセット・テクスチャ・モデル・音源・UI の流用
- bloxd.io ライブサービスへの接続解析、通信キャプチャ、minified production bundle の解析
- 実装コード変更（PH1-A 等）
- 既存の Phase 1 計画を、調査途中の仮説だけで書き換えること
- `.archive/` と過去 `.agent/logs/` の書き換え

## 4. 禁止事項

- **GitHub コード確認を Web UI / 検索スニペットだけで済ませない。** 必ず `git clone` し、`git remote -v` と `git rev-parse HEAD` を記録してから読む
- 読んでいないコード・ファイル・ドキュメントの内容に言及しない
- ライブサービスの WebSocket traffic / bundle / asset を解析して「プロトコル」として記録しない
- bloxd.io の利用規約に反するリバースエンジニアリングをしない
- 非公式ブログ・掲示板・Reddit を一次情報として扱わない（参考扱いにし、信頼度を下げる）
- 競合サービスの独自データ形式や数値を、そのまま cod-web 仕様として採用しない
- 調査と同じコミットで実装を始めない

## 5. 完了条件 (DoD)

### DOC-6（本計画）

- [ ] Deep Research の調査範囲・禁止事項・ソース優先順位が明文化されている
- [ ] GitHub コード確認時は clone + commit SHA 記録を必須と明記している
- [ ] `docs/task-list.md` に `DOC-6` と `DR-1` が登録されている
- [ ] Markdown relative link check が broken 0

### DR-1 / DR-2 / DR-3 / DR-4（実調査）

- [ ] Krunker.io / bloxd.io それぞれについて、ネットワーク・frontend・editor/UGC・法務制約を表で整理
- [ ] すべての主張に source 種別（official / cloned code / npm metadata / secondary）と URL または clone commit SHA が付いている
- [ ] GitHub repo を読んだ場合、clone path、remote URL、commit SHA、読んだファイル一覧を記録
- [ ] cod-web へ取り込める一般化パターンと、取り込まない/取り込めない事項を分離
- [ ] 仕様変更が必要な場合は、直接上書きせず提案リストにする

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Documentation | 必須 | 相対リンク broken 0、未読ファイルへの言及なし、source の URL / SHA がある |
| Legal check | 必須 | live service reverse engineering をしていない、アセット/コード流用がない |
| Reproducibility | 必須 | GitHub code は clone commit SHA で再現できる |
| Code tests | 原則不要 | 実装変更なし。コードを変えた場合のみ 4 検証 |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する。

- 調査に live service への接続、通信キャプチャ、production bundle 解析が必要になる
- 対象サイトの規約に反する可能性がある
- GitHub repo が巨大で clone できない、または license が不明で読む範囲に迷う
- 競合サービスの具体的な資産・コード・非公開 API を再利用したくなる
- 仕様書同士に矛盾が生じ、どちらを正とするか判断が必要になる

## 8. 完了時に行うこと

1. 調査メモの source table を自己レビュー
2. clone した repo の remote URL / commit SHA / 読んだファイル一覧を確認
3. Markdown relative link check
4. `docs/task-list.md` を証拠付きで更新
5. タスク ID を含む Conventional Commit
6. セッション固定ブランチへ push
7. 「採用候補 / 不採用 / 要確認」を分けて報告

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| DOC-6 | Deep Research 計画書作成 | 本ファイル、task-list 更新 | DOC-5 |
| DR-1A | 法務・ソース棚卸し | 調査対象 URL / repo / npm package 一覧、禁止事項チェック | DOC-6 |
| DR-1B | Krunker.io 公開情報調査 | network / frontend / editor / settings / UGC の調査メモ | DR-1A |
| DR-1C | bloxd.io / Noa 系公開情報調査 | voxel / Noa / physics / ECS / terrain / input の調査メモ | DR-1A |
| DR-1D | GitHub clone 監査 | clone した repo ごとの commit SHA、読んだファイル、API/設計メモ | DR-1A |
| DR-1E | cod-web への示唆整理 | 採用候補 / 不採用 / 要確認、仕様変更提案 | DR-1B〜D |
| DR-3A | ユーザー指示による追加 deep search | DR-3 文書、source inventory、採用候補/不採用/要確認 | DR-2 |
| DR-4A | ユーザー指示による engine / UGC / asset pipeline 追加 deep search | DR-4 文書、clone source inventory、Noa/QuickJS/glTF toolchain の採用候補/不採用/要確認 | DR-3 |
| DR-5A | ユーザー追加 Perplexity DeepResearch と既存 DR の差分検証 | DR-5 文書、差分分類、追加一次情報、現行コード指摘の再監査、採用/不採用/要確認 | DR-4 |

## 10. 調査プロトコル

### 10.1 ソース優先順位

| 優先 | 種別 | 扱い |
|---:|---|---|
| 1 | 公式ドキュメント / 公式 npm metadata / 公式 GitHub repo | 一次情報。URL と取得日を記録 |
| 2 | GitHub public repo の cloned code | 一次に近い。ただし必ず clone commit SHA と license を記録 |
| 3 | 公式ブログ / changelog / release note | 一次情報。バージョン差に注意 |
| 4 | 公開技術記事 / Reddit / forum / 動画 | 二次情報。仮説扱い。単独で断言しない |
| 5 | live service 観測 | 原則禁止。特に bloxd.io は行わない |

### 10.2 GitHub コード確認の必須手順

GitHub のコードを確認する場合は、次を必ず実行し、調査メモに記録する。

```bash
# 例。clone 先は workspace 外の scratch でもよいが、最終メモには path を残す
mkdir -p /tmp/cod-web-research
cd /tmp/cod-web-research
git clone <repo-url>
cd <repo>
git remote -v
git rev-parse HEAD
git log -1 --oneline
```

記録する項目:

| 項目 | 必須 |
|---|---|
| repo URL | 必須 |
| clone path | 必須 |
| commit SHA | 必須 |
| license | 必須。不明なら不明と書く |
| 読んだファイル一覧 | 必須 |
| その repo から得た事実 | 必須。推測と分ける |
| cod-web に採用する/しない | 必須 |

注意:

- GitHub search の snippet、ブラウザ上の数行表示、README だけで「実装はこう」と断言しない
- clone 後も、読んでいないファイルの内容に言及しない
- submodule / generated bundle / minified code は、license と意図を確認できない限り根拠にしない

### 10.3 Krunker.io 調査項目

| 領域 | 質問 |
|---|---|
| ネットワーク | 公開情報から transport / tick / snapshot / interpolation / prediction / matchmaker / editor publish flow を推定できるか |
| フロントエンド | 3D engine、UI、settings、bundle 分割、input、mobile 対応の公開情報はあるか |
| エディタ | map editor の機能、GLB/glTF import/export、spawn/zone/logic、公開/承認/バージョン管理の公開情報はあるか |
| UGC | KrunkScript / custom games / rate limit / sandbox 境界に相当する公開 docs はあるか |
| 法務 | 使ってよいのは思想・一般化パターンだけ。asset / code / private protocol は使わない |

### 10.4 bloxd.io / Noa 系調査項目

| 領域 | 質問 |
|---|---|
| voxel engine | Noa engine、Babylon、chunk、world origin、render loop の公開仕様 |
| physics/ECS/input | `voxel-physics-engine`, `ent-comp`, `micro-game-shell`, `game-inputs`, `nipplejs` の API / license / maintenance 状況 |
| terrain | Minecraft 風 terrain generation を独自実装するための一般パターン（noise, biome, cave, ore, structure） |
| network | 公開 docs / OSS から分かる範囲のみ。live bloxd.io traffic は調べない |
| editor/UGC | world editing, scripting, sandbox, moderation の公開情報 |

## 11. リスク・Gotchas

- bloxd.io は利用規約で reverse engineering を禁じているため、ライブサービス解析はしない。
- Krunker.io も private protocol / production bundle 解析は避け、公開 docs と合法的に読める OSS / npm metadata に限定する。
- 「似ているから同じはず」と書かない。source が無い推測は仮説として扱う。
- GitHub repo を clone しても、その repo が実サービス本体とは限らない。対象・version・license を必ず確認する。
- 競合の数値をそのまま DoD にしない。cod-web の予算・フェーズ計画に翻訳する。

## 12. 実績と証拠（実施後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| DOC-6 | 本コミット | markdown link check | Deep Research 計画。GitHub clone + SHA 記録を必須化 |
| DR-1 | 本コミット | markdown link check | `docs/research/DR-1_COMPETITOR_DEEP_RESEARCH.md`。Krunker / bloxd / Noa 系 clone SHA・読んだファイル一覧を記録。live service 解析なし |
| DR-2 | 本コミット | markdown link check | `docs/research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md`。bloxd 公式 Terms、Krunker direct API URL、Noa/Babylon peer mismatch、Noa examples clone SHA を追加確認。live service 解析なし |
| DR-3 | 本コミット | markdown link check | `docs/research/DR-3_DEEPER_COMPETITOR_RESEARCH.md`。`web_search` depth 3 で Krunker direct API、bloxd code-api 追加 docs、texture-packs、authoritative netcode を追加確認。live service 解析なし |
| DR-4 | 本コミット | markdown link check | `docs/research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`。`web_search` depth 3 と public GitHub clone で Noa 系 engine、voxel physics、input/mobile、QuickJS sandbox、glTF validation/optimization pipeline を追加確認。live service 解析なし |
| DR-5 | 本コミット | markdown link check | `docs/research/DR-5_PERPLEXITY_DIFF_RESEARCH.md`。`docs/Perplexity-AI.md` 全体と DR-1〜DR-4 を照合し、Bun/Colyseus/Krunker settings/Babylon/MDN/Agones 等を `web_search` depth 3 と fetch で追加確認。競合 live endpoint / production bundle 解析なし |
