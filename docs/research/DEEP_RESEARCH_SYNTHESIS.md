# Deep Research 統合サマリー

> 最終更新: 2026-09-06（Asia/Tokyo）  
> 対象: [`DR-1`](./DR-1_COMPETITOR_DEEP_RESEARCH.md)〜[`DR-5`](./DR-5_PERPLEXITY_DIFF_RESEARCH.md)、raw input [`../Perplexity-AI.md`](../Perplexity-AI.md)  
> 目的: 実装担当が長い調査文書を毎回読み直さず、採用済み判断・低信頼情報・次に使う根拠を迷わないようにする。

## 1. この文書の位置づけ

| 文書種別 | 役割 | 実装時の扱い |
|---|---|---|
| `docs/arch/` | 仕様正本 | 最優先で従う |
| `docs/planning/` | フェーズ/タスク単位の計画 | 対象タスクでは `arch` より具体的なら優先 |
| `docs/task-list.md` | 進捗の唯一の正本 | 状態・次タスク・証拠はここで確認 |
| 本ファイル | 調査結果の読み口 | 採用/不採用/要確認の入口。仕様変更は `arch` / 計画へ反映してから実装 |
| `DR-*` | 詳細証跡 | URL、clone SHA、読んだファイル、判断根拠を確認する時に読む |
| `docs/Perplexity-AI.md` | ユーザー追加の raw DeepResearch 入力 | 証跡そのものではなく、DR-5 で検証済みの入力として扱う |

## 2. Deep Research の成果物マップ

| 順 | 文書 | 主な用途 | 信頼度の見方 |
|---:|---|---|---|
| 1 | [`DR-1_COMPETITOR_DEEP_RESEARCH.md`](./DR-1_COMPETITOR_DEEP_RESEARCH.md) | Krunker / bloxd / Noa 系の初回棚卸し | 公式/clone/secondary を分離 |
| 2 | [`DR-2_ADDITIONAL_SOURCE_RESEARCH.md`](./DR-2_ADDITIONAL_SOURCE_RESEARCH.md) | bloxd 公式 Terms、Krunker direct API、Noa/Babylon peer mismatch | 公式 Terms と npm metadata を重視 |
| 3 | [`DR-3_DEEPER_COMPETITOR_RESEARCH.md`](./DR-3_DEEPER_COMPETITOR_RESEARCH.md) | Krunker UGC docs、Bloxdy code-api / texture-packs、authoritative netcode | Krunker docs は UGC API と core protocol を分ける |
| 4 | [`DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`](./DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) | Noa / voxel physics / input / mobile / QuickJS / glTF pipeline | clone SHA と license を必ず確認 |
| 5 | [`DR-5_PERPLEXITY_DIFF_RESEARCH.md`](./DR-5_PERPLEXITY_DIFF_RESEARCH.md) | Perplexity AI 調査との差分検証、古い cod-web 指摘の再分類 | 競合 live 解析由来は採用しない |

## 3. 採用済み・採用候補の確定事項

| 領域 | 結論 | 反映先 |
|---|---|---|
| プロダクト | Game Type は `voxel` / `fps` の 2 種。`official` / `ugc` は content source | [`../arch/product.md`](../arch/product.md), [`../arch/editor.md`](../arch/editor.md) |
| ルーティング | `/fps|voxel/{official|ugc}/<slug>` を基本階層にする | [`../arch/editor.md`](../arch/editor.md) |
| レンダラ | レンダラは自作せず Babylon.js。React は hub/HUD/menu | [`../arch/adr.md`](../arch/adr.md), [`../arch/client.md`](../arch/client.md) |
| voxel client | Noa engine 候補。server authority のため chunk loading は明示制御 | [`../arch/sim-profiles.md`](../arch/sim-profiles.md), [`../arch/api-sources.md`](../arch/api-sources.md) |
| voxel physics | `voxel-physics-engine` 候補。body-body collision は当面なし | [`../arch/adr.md`](../arch/adr.md), [`../arch/api-sources.md`](../arch/api-sources.md) |
| transport | Phase 0–8 は WebSocket のみ。WebTransport は Phase 9 条件付き | [`../arch/protocol.md`](../arch/protocol.md), [`../arch/adr.md`](../arch/adr.md) |
| protocol | 高頻度は手書き binary。制御のみ JSON | [`../arch/protocol.md`](../arch/protocol.md) |
| server authority | 位置・体力・score・hit は server authoritative | [`../arch/server.md`](../arch/server.md), [`../arch/engineering.md`](../arch/engineering.md) |
| UGC sandbox | QuickJS + `ctx` のみ。FS/fetch/global raw access を塞ぎ、timeout/memory limit を必須化 | [`../arch/ugc.md`](../arch/ugc.md), [`../arch/api-sources.md`](../arch/api-sources.md) |
| GLB pipeline | glTF Validator report、glTF Transform recipe、original/optimized hash を保存 | [`../arch/editor.md`](../arch/editor.md), [`../arch/api-sources.md`](../arch/api-sources.md) |
| matchmaker | HMAC seat reservation。Colyseus は思想参考で依存導入前提ではない | [`../arch/matchmaker.md`](../arch/matchmaker.md), [`../arch/api-sources.md`](../arch/api-sources.md) |
| scaling | Bun `reusePort` / Agones は将来候補。初期は 1 拠点・少数 room | [`../arch/api-sources.md`](../arch/api-sources.md), [`../arch/milestones.md`](../arch/milestones.md) |

## 4. 採用しない / 低信頼として隔離する情報

| 情報 | 理由 | 扱い |
|---|---|---|
| Krunker live matchmaker endpoint の形、WSS subdomain hashing、validationToken 詳細 | 非公式/過去観測/競合 live endpoint 解析に近い | 実装に使わない。seat reservation の一般概念だけ採用 |
| Krunker social WebSocket / msgpack 推測 | 公式 docs で未確認 | 採用しない |
| Krunker client-side WASM / obfuscation / anti-cheat 具体手法 | reverse-engineering / cheat 文脈。安全・法務上の地雷 | 「client を信用しない」という教訓だけ採用 |
| bloxd live WebSocket / Cloudflare / lobby error 推測 | live service 観測が必要で禁止境界に近い | 採用しない |
| bloxd 20TPS 断定 | `Bloxdy/code-api` README だけでは確認できず、二次情報が混じる | cod-web の tick は独自に決める |
| 競合の UI / asset / texture / model / code | ライセンス・商標・著作権リスク | 流用禁止 |
| DR 内の二次記事だけで得た数値 | version / 実測条件が不明 | 参考止まり。DoD にしない |

## 5. 現行 cod-web の再分類（Perplexity 指摘後）

| 項目 | 現状 | 次に使う判断 |
|---|---|---|
| Input 16B | Phase 0 で修正済み | PH1-C の Channel 追加時も本体 16B を維持 |
| 長さ/境界チェック | `BinaryReader` / `decodeInput` で修正済み | 既存テストを移植して維持 |
| input rate limit | 90/s burst 20 実装済み | タイプ別 rate limit は後続で拡張 |
| Bun WS backpressure | `send()` 戻り値で処理済み | `bufferedAmount` を server API として使わない |
| `subarray` | hot path 送信で使用済み | `slice` 回帰を避ける |
| lagcomp record | 毎 tick record 済み | hit rewind 判定は Phase 7 以降 |
| AOI | 未実装 | Phase 7 の主要課題 |
| delta snapshot | 未実装 | Phase 7 の主要課題 |
| matchmaker / room registry | 未実装 | Phase 4 の主要課題 |
| TimeSync | 未実装 | Phase 4/7 で検討 |
| zero allocation | 一部未達 (`map`, array 化など) | Phase 1/7 で段階改善 |

## 6. 次タスクへ渡す優先順位

| 優先 | タスク | 実装前に読むもの |
|---:|---|---|
| 1 | PH1-A: bun workspaces + fps 系へ移動 | [`../planning/HANDOFF.md`](../planning/HANDOFF.md), [`../planning/PHASE01_PLAN.md`](../planning/PHASE01_PLAN.md), [`../arch/architecture.md`](../arch/architecture.md) |
| 2 | PH1-B: dependency rules | [`../arch/api-sources.md`](../arch/api-sources.md) の Biome 行 |
| 3 | PH1-C: Channel 頭 1B | [`../arch/protocol.md`](../arch/protocol.md), [`DR-5`](./DR-5_PERPLEXITY_DIFF_RESEARCH.md) の現行再監査 |
| 4 | PH1-D/E: Babylon + input | [`../arch/client.md`](../arch/client.md), [`../arch/api-sources.md`](../arch/api-sources.md) の Babylon/Canvas/Pointer Lock 行 |
| 5 | Phase 4/7 planning | [`DR-5`](./DR-5_PERPLEXITY_DIFF_RESEARCH.md) の Colyseus/Bun reusePort/Agones/AOI/delta 整理 |

## 7. 読み方の推奨

通常の実装では、長い DR-1〜DR-5 を全て再読しない。次の順で読む。

1. [`../task-list.md`](../task-list.md) で現在の状態を確認
2. [`../planning/HANDOFF.md`](../planning/HANDOFF.md) で次作業の注意を確認
3. 対象フェーズの計画書を読む
4. 本ファイルで調査結論の入口を確認
5. 必要な根拠だけ該当 DR / [`../arch/api-sources.md`](../arch/api-sources.md) へ取りに行く

ただし、ユーザーが「全体を理解して」と明示したファイルは、必ずそのファイル全体を読む。
