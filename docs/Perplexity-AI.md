<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## 概要

bloxd.io は公式に通信プロトコル仕様を公開していません。以下は公開情報（開発者の発言・GitHub・求人/会社情報・公式Wiki等）から確認できる範囲です。なお利用規約ではゲームコードのリバースエンジニアリングやクライアント整合性保護の回避が明確に禁止（違反1件につき£25,000の支払い条項あり）なので、実際のパケット解析やクライアント解析は行っていません。[^1_25]

## クライアント側の技術

- ボクセルエンジンはオープンソースの **Noa engine**。作者Arthur Baker がこれを使って2021年に作成したと本人が語っており、noa のリポジトリにも「bloxd.io - multiplayer voxel games with editable worlds, by Arthur」として掲載されています。[^1_32]
- noa は **3D描画に Babylon.js（WebGL）** を使用しており、bloxd.io も「JavaScript と WebGL のフレームワークでブラウザタブ内で3Dを動かしている」と紹介されています（VIVERSE）。[^1_8]
- 同社の GitHub組織 Bloxdy には `voxel-physics-engine`（ボクセル物理）、`ent-comp`（軽量ECS）、`micro-game-shell`（tick/renderループ、pointerLock管理）、`game-inputs`、`nipplejs`（モバイル用仮想スティック）のフォークが並んでおり、noa系のECS＋独自物理という構成が読み取れます。[^1_11]
- 会社情報では **TypeScript / Node.js / React / WebGL / HTML5 / netcode** が技術キーワードとして挙げられています（Bloxd 公式LinkedIn）。UIはReact（トップページも「You need to enable JavaScript to run this app」というCRA系の表示）です。[^1_2]


## サーバー・通信モデル

- **サーバー権威型（server-authoritative）**。ワールド所有者が書くカスタムJSは**サーバー側で実行**され、状態変更はサーバーが検証します（bloxdy/code-api ドキュメント）。[^1_14]
- ゲームループは \*\*20 TPS（1tick = 50ms）\*\*で、`tick(ms)` コールバックが50msごとに呼ばれます（同上）。Minecraft と同じティックレートで、この周期がネットワーク同期の基本単位と考えられます。
- **ロビー／ルーム単位のインスタンス構成**。公式Wikiのエラー一覧に「Lobby creation failed. Too many rooms in creation」があり、ゲームモードごとに部屋を動的生成する方式であることが分かります（Bloxd.io Wiki: Errors）。[^1_39]
- **トランスポートは WebSocket（wss）とみて妥当**。切断時に表示されるコードが `Code: 1006` で、これは WebSocket の異常クローズコード（Abnormal Closure）そのものです（同Errorsページ）。WebRTC/UDP を使っている旨の公開情報はなく、学校ネットワークやプロキシ経由で繋がらない事例も TCP上のWebSocket と整合します。[^1_39]
- 入室時に**ボット判定を含む join 検証**があり、失敗すると「Failed to fully verify join. Code 2」となり、VPN利用時に出やすいとされています（同上）。つまりハンドシェイク段階で独自の検証ステップが挟まっています。
- スクリプト実行環境は**サンドボックス化**され、DOM操作と**外部ネットワークリクエストが禁止**、一部組み込み関数も制限（Bloxd Forge コーディングガイド）。ゲーム内コードからは独自の通信を張れません。[^1_4]
- Web配信は **Cloudflare** の背後（webrate のホスティング情報）。ゲーム用WebSocketサーバーは別インフラの可能性が高いですが、リージョン構成は非公開です。[^1_50]


## 未公開／不明な点

メッセージのシリアライズ形式（msgpack・protobuf・独自バイナリ等）、チャンク送信の圧縮方式、移動の予測・補間や rollback の有無、リージョン/マッチメイキングの実装、DBやバックエンドの詳細は公開情報が一切ありません。この辺りを確かめるにはクライアント解析が必要ですが、上記のとおり規約違反になります。

同じ構成を自分で作りたい場合は、noa + Babylon.js のクライアントに、Node.js（TypeScript）で20TPSの権威サーバー、`ws` か Colyseus/geckos.io でトランスポート、というのが最も近い再現になります。

<span style="display:none">[^1_1][^1_10][^1_12][^1_13][^1_15][^1_16][^1_17][^1_18][^1_19][^1_20][^1_21][^1_22][^1_23][^1_24][^1_26][^1_27][^1_28][^1_29][^1_3][^1_30][^1_31][^1_33][^1_34][^1_35][^1_36][^1_37][^1_38][^1_40][^1_41][^1_42][^1_43][^1_44][^1_45][^1_46][^1_47][^1_48][^1_49][^1_5][^1_51][^1_52][^1_53][^1_54][^1_55][^1_56][^1_57][^1_58][^1_59][^1_6][^1_60][^1_7][^1_9]</span>

<div align="center">⁂</div>

[^1_1]: https://greasyfork.org/en/scripts/575760-bloxd-io-killaura/code

[^1_2]: https://www.linkedin.com/company/bloxd

[^1_3]: https://www.similarweb.com/website/bloxd.io/

[^1_4]: https://www.bloxdforge.com/studio/wiki/guides/coding-guide

[^1_5]: https://bloxd-io.fandom.com/wiki/Code_Block

[^1_6]: https://bloxd.io/

[^1_7]: https://bloxd-io.fandom.com/wiki/Arthur_Baker

[^1_8]: https://news.viverse.com/post/bloxd-io-free-browser-game-on-viverse

[^1_9]: https://londonissue.co.uk/2025/06/12/bloxd-founder-arthur-baker-discusses-uk-gaming-industry-with-andy-ross-from-studio-vision-podcast/

[^1_10]: https://deepwiki.com/delfineonx/bloxd-codex

[^1_11]: https://github.com/Bloxdy

[^1_12]: https://www.crazygames.com/game/bloxdhop-io

[^1_13]: https://insanepowertrip.github.io/bloxdocs/bloxdocs.html

[^1_14]: https://deepwiki.com/bloxdy/code-api

[^1_15]: https://bloxd-io.fandom.com/wiki/FAQs

[^1_16]: https://www.reddit.com/r/bloxd/comments/1isc81c/need_help_to_set_up_a_proper_server/

[^1_17]: https://docsbot.ai/prompts/programming/bloxd-io-rtp-code

[^1_18]: https://www.youtube.com/watch?v=aNlXd7WuMgg

[^1_19]: https://www.youtube.com/watch?v=m8jSxCQPqtQ

[^1_20]: https://www.youtube.com/watch?v=LZ6pvERwb7o

[^1_21]: https://creators.spotify.com/pod/profile/andyrosspodcast/episodes/Arthur-Baker---Founder---Bloxd-e33fim7/bloxd.io

[^1_22]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients

[^1_23]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks/blob/main/Blackhole Client

[^1_24]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients?action=history

[^1_25]: https://bloxd.io/terms-of-service

[^1_26]: https://www.scribd.com/document/927502362/Message

[^1_27]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks

[^1_28]: https://bloxd-io.fandom.com/wiki/Versions

[^1_29]: https://webgamer.io/it/g/bloxd-io

[^1_30]: https://webgamer.io/vn/g/bloxd-io

[^1_31]: https://codepen.io/aditikchauhan/pen/KwKyzmK

[^1_32]: https://github.com/fenomas/noa

[^1_33]: https://github.com/websockets/ws

[^1_34]: https://docs.bloxroute.com/eth/streams/blocks-streams/newblock-stream

[^1_35]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

[^1_36]: https://docs.bloxroute.com/bsc-and-eth/streams/working-with-streams/creating-a-subscription/websocket

[^1_37]: https://bloxd-io.fandom.com/wiki/Unblocked_Domains

[^1_38]: https://www.reddit.com/r/bloxd/comments/1apri8x/bloxdio_not_working_why/

[^1_39]: https://bloxd-io.fandom.com/wiki/Errors

[^1_40]: https://websockets.readthedocs.io/en/stable/topics/proxies.html

[^1_41]: https://forum.babylonjs.com/t/nullengine-multiplayer-tutorial/1696

[^1_42]: https://www.docs.o3de.org/docs/user-guide/networking/multiplayer/

[^1_43]: https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html

[^1_44]: https://github.com/FlaxEngine/NetworkSample

[^1_45]: https://www.reddit.com/r/bloxd/comments/1bud0ly/any_reason_why_bloxd_is_laggy/

[^1_46]: https://betterroblox.com/answers/how-to-lower-ping-in-roblox

[^1_47]: https://devforum.roblox.com/t/server-region-prioritization-in-access-settings-for-lower-ping/3149268

[^1_48]: https://www.reddit.com/r/RobloxHelp/comments/1dl5g0v/how_do_i_pick_a_server_region_to_decrease_ping/

[^1_49]: https://www.ip-tracker.org/lookup.php?ip=Bloxd.io

[^1_50]: https://webrate.org/site/bloxd.io/

[^1_51]: https://scanner.pcrisk.com/scan-results/miniplay.com

[^1_52]: https://gist.github.com/garyblankenship/27a4c57eca4aa5d659ee3c509668b66d

[^1_53]: https://www.cloudflare.com/developer-platform/use-cases/hosting/

[^1_54]: https://www.similarweb.com/technology/

[^1_55]: https://www.similarweb.com/website/bloxd.io/competitors/

[^1_56]: https://endsights.com/roblox-creating-responsive-cheat-resistant-games-with-server-authority

[^1_57]: https://www.reddit.com/r/ROBLOXStudio/comments/1o6htu4/cheaters_beware_robloxs_native_anticheat_server/

[^1_58]: https://devforum.roblox.com/t/sync-server-authoritive-movement-anticheat-alpha/4027591

[^1_59]: https://create.roblox.com/docs/scripting/security/security-tactics

[^1_60]: https://gamineai.com/courses/multiplayer-battle-royale/lessons/lesson-13-anti-cheat-systems-security


---

## まず「TCPでも間に合う」理由

bloxd.io は 20 TPS（1tick = 50ms）で動いています（bloxdy/code-api）。これは Minecraft と同じ更新周期で、128tick の競技FPSとは要求が桁違いです。TCP の弱点は再送待ちで後続データが止まる head-of-line blocking ですが、これが問題になるのは「更新間隔 < RTT」の高頻度シューター寄りの設計で、Gaffer On Games の解説にある通り agar.io 世代からブラウザゲームは WebSocket/TCP で成立してきました。実務的な目安として、ブラウザクライアントやティックレート15Hz前後までは WebSocket、20Hz超のネイティブ物理ゲームは生UDP、という切り分けがバックエンド視点の比較記事でも示されています。ボクセルの建築・PvPは50msの粒度でほぼ違和感が出ないゾーンです。[^2_2][^2_3][^2_49]

## 滑らかさは「サーバーの速さ」ではなくクライアントで作る

20Hzのスナップショットがそのまま描画されたらガタガタになります。滑らかに見えるのは以下の古典的3点セットのおかげで、Valve の Source Multiplayer Networking が教科書です。[^2_16]

- **エンティティ補間**: 他プレイヤーは過去2スナップショット間を時間をずらして補間描画する。約1tick分（50〜100ms）の意図的な描画遅延を入れる代わりに、パケットが1つ遅れても破綻しない。TCPの遅延ジッタをこのバッファが吸収します。
- **クライアント側予測**: 自分の移動は入力した瞬間にローカル物理で先に進める。bloxd.io は noa 系の `voxel-physics-engine` をフォークしており（Bloxdy の GitHub）、クライアントとサーバーで同じ物理を回せる形になっています。[^2_46]
- **サーバー照合（reconciliation）**: サーバー権威なので、ズレたら権威状態へ補正。ブロック設置も「ローカルで即座標に置いて、サーバーが拒否したら戻す」楽観的更新が定石です。

つまり体感の滑らかさは、パケットの速さよりこのローカルシミュレーションの品質で決まります。

## 帯域を潰さないための削り方

大人数ルームで効くのは、送る量そのものを削る工夫です。

- **AOI / 関心管理**: ワールドをセルに分割し、そのプレイヤーの周辺セルの変化だけ送る。MMOでは基礎中の基礎のAOIアルゴリズムで、ボクセルゲームならチャンクがそのままセルになります。1000人が同一ワールドにいても、各自が受け取るのは近傍数十人分だけです。[^2_12]
- **差分（デルタ）圧縮**: 毎tickフルスナップショットは非現実的なので、前回確認済みスナップショットとの差分のみ送る。Quake 3 のプロトコルがこの方式の原点です。[^2_21]
- **バイナリ＋量子化**: JSONではなく固定レイアウトのバイナリ。座標をfloat64ではなく固定小数、向きを1バイト角度、ブロックIDをvarintなど。
- **tick単位のバッチ**: イベントごとに`send`せず、50msぶんの更新を1メッセージにまとめる。これが同時に TCP のパケット効率も稼ぎます。
- **チャンクは別レーン扱い**: 地形データは大きいので、優先度を落として時間分散送信する。Minecraft側でもチャンクパケットの分散送信が最適化の定番になっているのと同じ理屈です。[^2_34]


## TCP特有の詰め所

- **`TCP_NODELAY`（Nagle無効）は必須**。小さいパケットを溜めて送る[Nagleのアルゴリズム](https://en.wikipedia.org/wiki/Nagle%27s_algorithm)は数十ms級の遅延を足すので、ゲームでは切ります。実際に有効化で体感が明確に改善した事例報告もあります。[^2_10]
- **バックプレッシャー管理**。回線が細いクライアントの送信キューが膨らむと遅延が雪だるま式に増えるので、閾値超えで低優先度更新を捨てるか切断する。bloxd.io が「ラグ状態と判定される前にキックする」挙動を持ち、切断時に WebSocket の異常終了コード `1006` を出すのは、この種の保護が働いた結果に見えます（Bloxd.io Wiki: Errors）。[^2_74]
- **ルームは重複購読を避けて1回だけシリアライズ**。同一チャンクを見ている全員に同じバイト列を再利用して送るのが、CPUを食わせないコツです。


## ルーム（ロビー）管理のスケール構造

bloxd.io は単一巨大ワールドではなく、**ゲームモードごとにロビー＝ルームインスタンスを動的生成**する構成です。エラー文に「Lobby creation failed. Too many rooms in creation」があり、部屋の同時生成数に上限とレート制限が入っていることが読み取れます（同Errorsページ）。

このモデルの利点は素直です。Node.js は1プロセス1スレッドなので、**1ルーム＝1イベントループ（プロセス／ワーカー）に閉じ込め、プロセスを横に並べる**だけでコア数ぶんスケールします。マッチメイキング用のプロセスがプレイヤーを空きルームに割り当て、満員なら新規ルームを立てる。OSSの Colyseus のルームモデルとスケーリング設計がまさにこの形で、ルーム間は状態を共有せず、レジストリ（Redis等）だけを共有します。TCPの接続数自体は epoll ベースなら数万接続でも問題にならず、ボトルネックは常に「1ルームのtick内でのCPU」です。[^2_26][^2_27]

その限界も観測されていて、「同じチャンク付近にプレイヤーが集まるほど重くなる」というプレイヤー側の報告は、AOIで参照数がO(n²)的に増えるルームCPU律速の典型症状です。さらに bloxd.io ではワールド所有者のカスタムJSも同じ50msのtick予算内でサーバー実行されるため（code-api）、重いスクリプトはそのルームの全員に直接効きます。だから外部ネットワークアクセスやDOM操作がサンドボックスで禁止され、コードブロックには文字数上限まで設けられているわけです。[^2_39][^2_49][^2_80]

## 自分で再現するなら

Rustでやるなら `axum` + `tokio-tungstenite` でWebSocket、ルームごとに `tokio::task` とチャンネル、状態は `bincode` かカスタムバイナリでデルタ送信、`set_nodelay(true)` を忘れずに。20Hzサーバー tick + クライアント側100ms補間バッファから始めれば、体感はほぼこの水準に届きます。将来的にHOL blockingを消したくなったら、WebTransport（HTTP/3のunreliable datagram）へ差し替える余地も残しておくと良いです。[^2_5]

<span style="display:none">[^2_1][^2_11][^2_13][^2_14][^2_15][^2_17][^2_18][^2_19][^2_20][^2_22][^2_23][^2_24][^2_25][^2_28][^2_29][^2_30][^2_31][^2_32][^2_33][^2_35][^2_36][^2_37][^2_38][^2_4][^2_40][^2_41][^2_42][^2_43][^2_44][^2_45][^2_47][^2_48][^2_50][^2_51][^2_52][^2_53][^2_54][^2_55][^2_56][^2_57][^2_58][^2_59][^2_6][^2_60][^2_61][^2_62][^2_63][^2_64][^2_65][^2_66][^2_67][^2_68][^2_69][^2_7][^2_70][^2_71][^2_72][^2_73][^2_75][^2_76][^2_77][^2_78][^2_79][^2_8][^2_81][^2_82][^2_83][^2_84][^2_85][^2_86][^2_87][^2_88][^2_89][^2_9][^2_90][^2_91][^2_92][^2_93][^2_94][^2_95]</span>

<div align="center">⁂</div>

[^2_1]: https://gamedev.net/forums/topic/700489-using-concurrent-tcpwebsockets-to-mitigate-head-of-line-blocking/

[^2_2]: https://just4programmers.com/websocket-vs-udp-multiplayer/

[^2_3]: https://gafferongames.com/post/why_cant_i_send_udp_packets_from_a_browser/

[^2_4]: https://gamedev.net/forums/topic/709444-can-i-make-websocket-multiplayer-games-for-any-genre/

[^2_5]: https://minhvo.is-a.dev/blogs/webtransport-low-latency-communication-for-games-and-media

[^2_6]: https://en.wikipedia.org/wiki/Nagle's_algorithm

[^2_7]: https://6it.dev/blog/tcp-peculiarities-as-applied-to-games-part-ii-1393

[^2_8]: https://www.speedguide.net/articles/gaming-tweaks-5812

[^2_9]: https://qiita.com/uturned0/items/3ab037d4d2d0500586f5

[^2_10]: https://gitlab.com/Mr_Goldberg/goldberg_emulator/-/issues/209

[^2_11]: https://www.cs.mcgill.ca/~jboula2/thesis.pdf

[^2_12]: https://dev.to/aceld/11-mmo-online-game-aoi-algorithm-l7d

[^2_13]: https://researchonline.ljmu.ac.uk/id/eprint/5111/1/DESE-2016-Accepted.pdf

[^2_14]: https://open.library.ubc.ca/media/stream/pdf/24/1.0051926/2

[^2_15]: https://www.semanticscholar.org/paper/Simulation-of-Area-of-Interest-Management-for-Games-Abdulazeez-Rhalibi/ec8b53abd76aa48c5d0f865e09a4d9a626907386

[^2_16]: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking

[^2_17]: https://developer.valvesoftware.com/wiki/Cl_interp_all

[^2_18]: https://jvm-gaming.org/t/entity-interpolation-client-side-prediction-where-to-begin-networking/59507

[^2_19]: https://nicolaschavez.com/projects/xrpg/

[^2_20]: https://developer.valvesoftware.com/wiki/Prediction

[^2_21]: https://www.jfedor.org/quake3/

[^2_22]: https://system-design.space/en/chapter/real-time-gaming-case/

[^2_23]: https://github.com/id-Software/Quake-III-Arena/blob/master/code/server/sv_snapshot.c

[^2_24]: https://fabiensanglard.net/quake3/network.php

[^2_25]: https://fouramgames.com/blog/unity-fps-sample

[^2_26]: https://docs.colyseus.io/room

[^2_27]: https://docs.colyseus.io/scalability

[^2_28]: https://colyseus.io/framework/

[^2_29]: https://docs.colyseus.io/server

[^2_30]: https://0-16-x.docs.colyseus.io/

[^2_31]: https://paper-chan.moe/paper-optimization/

[^2_32]: https://www.reddit.com/r/admincraft/comments/rmfrjo/118_chunk_lag_issues_tps_20/

[^2_33]: https://minecraft.fandom.com/wiki/Tick

[^2_34]: https://www.curseforge.com/minecraft/mc-mods/chunk-sending-forge-fabric

[^2_35]: https://forum.feed-the-beast.com/threads/1-7-10-cauldron-1-8-tick-dynamic-keep-your-server-running-at-20-tps.61903/

[^2_36]: https://greasyfork.org/en/scripts/575760-bloxd-io-killaura/code

[^2_37]: https://www.linkedin.com/company/bloxd

[^2_38]: https://www.similarweb.com/website/bloxd.io/

[^2_39]: https://www.bloxdforge.com/studio/wiki/guides/coding-guide

[^2_40]: https://bloxd-io.fandom.com/wiki/Code_Block

[^2_41]: https://bloxd.io/

[^2_42]: https://bloxd-io.fandom.com/wiki/Arthur_Baker

[^2_43]: https://news.viverse.com/post/bloxd-io-free-browser-game-on-viverse

[^2_44]: https://londonissue.co.uk/2025/06/12/bloxd-founder-arthur-baker-discusses-uk-gaming-industry-with-andy-ross-from-studio-vision-podcast/

[^2_45]: https://deepwiki.com/delfineonx/bloxd-codex

[^2_46]: https://github.com/Bloxdy

[^2_47]: https://www.crazygames.com/game/bloxdhop-io

[^2_48]: https://insanepowertrip.github.io/bloxdocs/bloxdocs.html

[^2_49]: https://deepwiki.com/bloxdy/code-api

[^2_50]: https://bloxd-io.fandom.com/wiki/FAQs

[^2_51]: https://www.reddit.com/r/bloxd/comments/1isc81c/need_help_to_set_up_a_proper_server/

[^2_52]: https://docsbot.ai/prompts/programming/bloxd-io-rtp-code

[^2_53]: https://www.youtube.com/watch?v=aNlXd7WuMgg

[^2_54]: https://www.youtube.com/watch?v=m8jSxCQPqtQ

[^2_55]: https://www.youtube.com/watch?v=LZ6pvERwb7o

[^2_56]: https://creators.spotify.com/pod/profile/andyrosspodcast/episodes/Arthur-Baker---Founder---Bloxd-e33fim7/bloxd.io

[^2_57]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients

[^2_58]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks/blob/main/Blackhole Client

[^2_59]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients?action=history

[^2_60]: https://bloxd.io/terms-of-service

[^2_61]: https://www.scribd.com/document/927502362/Message

[^2_62]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks

[^2_63]: https://bloxd-io.fandom.com/wiki/Versions

[^2_64]: https://webgamer.io/it/g/bloxd-io

[^2_65]: https://webgamer.io/vn/g/bloxd-io

[^2_66]: https://codepen.io/aditikchauhan/pen/KwKyzmK

[^2_67]: https://github.com/fenomas/noa

[^2_68]: https://github.com/websockets/ws

[^2_69]: https://docs.bloxroute.com/eth/streams/blocks-streams/newblock-stream

[^2_70]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

[^2_71]: https://docs.bloxroute.com/bsc-and-eth/streams/working-with-streams/creating-a-subscription/websocket

[^2_72]: https://bloxd-io.fandom.com/wiki/Unblocked_Domains

[^2_73]: https://www.reddit.com/r/bloxd/comments/1apri8x/bloxdio_not_working_why/

[^2_74]: https://bloxd-io.fandom.com/wiki/Errors

[^2_75]: https://websockets.readthedocs.io/en/stable/topics/proxies.html

[^2_76]: https://forum.babylonjs.com/t/nullengine-multiplayer-tutorial/1696

[^2_77]: https://www.docs.o3de.org/docs/user-guide/networking/multiplayer/

[^2_78]: https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html

[^2_79]: https://github.com/FlaxEngine/NetworkSample

[^2_80]: https://www.reddit.com/r/bloxd/comments/1bud0ly/any_reason_why_bloxd_is_laggy/

[^2_81]: https://betterroblox.com/answers/how-to-lower-ping-in-roblox

[^2_82]: https://devforum.roblox.com/t/server-region-prioritization-in-access-settings-for-lower-ping/3149268

[^2_83]: https://www.reddit.com/r/RobloxHelp/comments/1dl5g0v/how_do_i_pick_a_server_region_to_decrease_ping/

[^2_84]: https://www.ip-tracker.org/lookup.php?ip=Bloxd.io

[^2_85]: https://webrate.org/site/bloxd.io/

[^2_86]: https://scanner.pcrisk.com/scan-results/miniplay.com

[^2_87]: https://gist.github.com/garyblankenship/27a4c57eca4aa5d659ee3c509668b66d

[^2_88]: https://www.cloudflare.com/developer-platform/use-cases/hosting/

[^2_89]: https://www.similarweb.com/technology/

[^2_90]: https://www.similarweb.com/website/bloxd.io/competitors/

[^2_91]: https://endsights.com/roblox-creating-responsive-cheat-resistant-games-with-server-authority

[^2_92]: https://www.reddit.com/r/ROBLOXStudio/comments/1o6htu4/cheaters_beware_robloxs_native_anticheat_server/

[^2_93]: https://devforum.roblox.com/t/sync-server-authoritive-movement-anticheat-alpha/4027591

[^2_94]: https://create.roblox.com/docs/scripting/security/security-tactics

[^2_95]: https://gamineai.com/courses/multiplayer-battle-royale/lessons/lesson-13-anti-cheat-systems-security


---

# https://github.com/shiratama644/cod-web

このリポジトリを理解してどのような技術でTCP通信をしているか確認してください。そして、今までの話と比べて何が劣っているかなどを教えてください。

リポジトリを clone して `shared/protocol/`、`server/`、`src/game/net/` を全部読みました。Phase 1（位置同期）まで実装済みという状態ですね。

## このリポジトリのTCP通信の実体

| 層 | 実装 |
| :-- | :-- |
| トランスポート | Bun ネイティブ WebSocket（uWS コア、`:8080`）。`src/game/net/transport.ts` の `NetTransport` で抽象化し、WebTransport 差し替えを前提にしている |
| 高頻度パケット | 手書きバイナリ固定レイアウト（`DataView`・リトルエンディアン）。入力 12B、スナップショット 329B/20人 |
| レート | シム 60Hz、入力 C→S 60Hz、スナップショット S→C 30Hz、描画は可変 |
| 量子化 | 位置/速度 int16（0.01m 刻み）、yaw u16、pitch i8、move軸 i8 |
| 権威 | サーバー固定60Hzステップ + `shared/sim/movement.ts` の純粋関数を両側で共有 |
| クライアント | 予測 → `lastAckSeq` で未ack入力を replay して調停、リモートは100ms遅延で Lerp 補間 |
| 制御系 | `welcome` / `join` / `leave` はテキストJSON（信頼経路） |

特筆すべきは `GameClient.quantizeInput()` で、**送信バッファに encode してから decode し直した値で予測を回している**点です。生値で予測するとサーバー（decode後）と量子化誤差でズレる、という問題を正しく潰していて、これは前回話した「決定論の要」をきちんと実装できています。調停も無条件スナップではなく `RECONCILE_TOLERANCE = 0.25m` 以内は予測を維持する方式で、Valve のクライアント予測モデルの実務的な改良版です。入力を「最新1件上書き」ではなくFIFOキューにしてジャンプフラグの取りこぼしを防いでいるのも、TCPの順序保証を正しく活用した設計判断です。[^3_20]

正直、個人が3日で書いたPhase 1としては bloxd.io より丁寧な部分が多いです。20TPSではなく60Hz、量子化バイナリ、`_tests_/` に41件のテスト、と土台は上です。以下は「前回のbloxd.io/大規模の話と比べて劣る・欠けている点」です。

## 構造的に劣っている点

### 1. AOI（関心管理）が完全に無い

`server/net/snapshot.ts` は毎回**ルーム全員のフルスナップショット**を全員へ送ります。コメントにも「Phase 1 は AOI なし」と明記されています。20人固定なら 329B × 30Hz = 約9.9KB/s、サーバー送出合計 約193KB/s で問題ありませんが、\*\*人数のO(n²)\*\*なので100人で約5MB/s、これがそのまま壁になります。bloxd.io が数万人同時をさばけるのは、前回話したチャンク単位のAOI分割で各自の受信量を人数と無関係にしているからです。今の設計は `MAX_PLAYERS = 20` 前提で、しかも位置が int16（±327.67m）なのでマップサイズも構造的に上限があります。[^3_16]

### 2. デルタ圧縮が無い

止まっているプレイヤーの座標も毎tick丸ごと送っています。`lastAckSeq` は自分の入力ackにしか使っておらず、**スナップショットのベースライン ack が無い**ので Quake 3 方式のデルタ圧縮に進めません。実装するなら「クライアントが最後に受け取った serverTick」を上り方向に載せる必要があり、今のプロトコルには枠がありません。ここは Phase 1 の設計負債です。[^3_25]

### 3. ルームが1個・プロセスが1個

`server/index.ts` に `const room = new Room()` がモジュールスコープでハードコードされていて、マッチメイキングもルーム生成もありません。bloxd.io の「モードごとにルームを動的生成し、埋まったら新規作成、生成数に上限」という構造（Wikiのロビー作成エラーから読み取れるもの）や、Colyseus のルーム＋スケーリング設計に相当するものが未着手です。Bun は1プロセス1スレッドなので、現状は**マシンのコアが何個あっても1コアしか使えません**。[^3_31]

### 4. クロック同期・入力バッファ制御が無い

`Simulation.step()` は1tickにキュー先頭を必ず1つだけ消費し、空なら `idleInput` で進めます。ここに2つ穴があります。

- **キューが溜まり続ける**: クライアントのタイマーとサーバーの `setInterval` は必ず位相・周波数がズレるので、クライアントが僅かに速いだけでキューが単調増加し、入力遅延がじわじわ増えます（上限120 = 2秒分まで溜まる）。逆に遅ければ `idleInput` が入り、予測とサーバーが食い違って調停スナップが出ます。
- **ジッタバッファが無い**: TCPはバースト着信するので、遅延ゆらぎを吸収する1〜3tickの入力バッファと、キュー長を見て消費数を1/2に可変させる適応制御（あるいはサーバー時刻の配布とクライアント側のtick合わせ）が必要です。競技FPSではここの品質が体感を決めます。


### 5. TCP特有のチューニングが未確認

`Bun.serve` に `perMessageDeflate` の明示指定がありません。Bun のWebSocketドキュメントでは既定値が明記されていないので、**明示的に無効化しておくべき**です。329Bのバイナリを圧縮するとCPUを食うだけで、遅延も足します。TCP_NODELAY についても設定箇所が無く、uWS任せになっています。前回話した通り [Nagleのアルゴリズム](https://en.wikipedia.org/wiki/Nagle%27s_algorithm)が効くと数十ms級の遅延が乗るので、ここは実測で確認すべき最優先ポイントです。[^3_4]

### 6. バックプレッシャ制御が実質動いていない疑い

`server/index.ts` の `getBufferedAmount` が `(ws as unknown as { bufferedAmount?: number }).bufferedAmount ?? 0` になっています。Bun のドキュメントに `bufferedAmount` プロパティの記載はなく、バックプレッシャは `send()` の戻り値（`-1` = キュー済みだが詰まっている）と `backpressureLimit`（既定16MB）で扱う設計です。つまり**常に0が返り、`snapshot.ts` の間引き判定が一度も発火していない**可能性が高いです。しかも `peer.sendBinary()` は詰まりを `boolean` で返すのに、`snapshot.ts` は戻り値を捨てています。ここは実測ログを入れて確認する価値があります。[^3_4]

### 7. ゼロアロケーション方針が最後で崩れている

`snapshot.ts` はリングバッファ3本で `new` を避ける設計なのに、送信直前に `buffer.slice(0, bytes)` で**毎回新しい ArrayBuffer を確保**しています。さらに `encodeSnapshot` を受信者ごとにループ内で呼ぶので、20人なら同じ内容を20回シリアライズしています（`lastAckSeq` だけが人ごとに違うため）。前回話した「同じバイト列を再利用して送る」の逆で、30Hz × 20人 = 毎秒600回のアロケーションとエンコードです。`lastAckSeq` をスナップショット本体から外して別パケット or 全員分のack配列にすれば、1回エンコード＋`cork()` で配れます。クライアント側の `encodeAndSend` の `sendBuffer.slice(0, len)` も同じ問題です（60Hzで毎回12Bのアロケート）。

### 8. 検証が無く、悪意ある1パケットで落ちうる

`server/index.ts` の `message` ハンドラは**パケット長を検証せず** `decodeInput(view, 1)` を呼びます。type=1 の3バイトを投げると `getUint32` が `RangeError` を投げ、Bunのハンドラ内例外がプロセスに届けば全員が切断されます。加えて入力パケットのレート制限も、認証も、`seq` の妥当性以外のチート検証（速度・座標の飛び）もありません。前回のbloxd.io側では「join検証」「クライアント整合性保護」が入っていて、そこは実運用サービスとの差です。`INPUT_PACKET_BYTES` との長さ一致チェックとtry/catchは今すぐ入れるべきです。

### 9. 死んでいるコードと未接続機能

`server/net/lagcomp-store.ts` は実装済みですが、`Simulation` からも `index.ts` からも参照されておらず、**位置履歴が一度も記録されていません**。「器だけ用意」という意図は docs に書かれていますが、tick ごとの `record()` 呼び出しが無いので器としても機能していません。またハートビート/タイムアウトが無く、無反応クライアントを掃除できません。`nextPlayerId` は単調増加で、id が u16 なので長期稼働で 65535 を超えると衝突します。

### 10. HOL blocking への回答がまだ「将来WebTransport」

30Hzスナップショット＋60Hz入力をTCP1本に流しているので、パケットロス時は再送待ちで後続が全部止まります。bloxd.io の20Hzボクセルなら許容範囲でしたが、**競技FPSで60Hz入力はTCPが一番苦しい領域**です。WebSocket/UDP の使い分けの目安でも20Hz超の物理ゲームはUDP系推奨で、`NetTransport` 抽象を用意してあるのは正解ですが、WebTransport の datagramへの移行が完了するまではKrunker級の体感には届きません。`docs/TECH_SELECTION.md` は geckos.io（WebRTC）採用と書いてあるのに `AGENTS.md` は WebTransport 主・geckos.io 不採用と書いてあり、**ドキュメント間で方針が矛盾**したままなので、そこも整理が必要です。[^3_6][^3_9]

## 優先順位の提案

1. パケット長検証 + try/catch + 入力レート制限（落ちる穴を塞ぐ）
2. バックプレッシャ判定を `send()` の戻り値ベースに直す、`perMessageDeflate: false` を明示
3. サーバー時刻配布＋入力キュー長の適応制御（体感に直結、今の設計のままだと必ずジワジワ遅延する）
4. `lastAckSeq` をスナップショット本体から分離 → 1回エンコード＋`cork()`＋`slice()` 撤去
5. スナップショットに baseline tick の ack を追加してデルタ圧縮の枠を確保
6. Room の複数化＋プロセス分割、その後にAOI
7. WebTransport 実装（`NetTransport` の別実装として）

3〜5 は今のプロトコル定数を変える話なので、Phase 2に入る前、パケットレイアウトが固まる前にやるのが一番安いです。

<span style="display:none">[^3_1][^3_10][^3_11][^3_12][^3_13][^3_14][^3_15][^3_17][^3_18][^3_19][^3_2][^3_21][^3_22][^3_23][^3_24][^3_26][^3_27][^3_28][^3_29][^3_3][^3_30][^3_32][^3_33][^3_34][^3_35][^3_36][^3_37][^3_38][^3_39][^3_40][^3_41][^3_42][^3_43][^3_44][^3_45][^3_46][^3_47][^3_48][^3_49][^3_5][^3_50][^3_51][^3_52][^3_53][^3_54][^3_55][^3_56][^3_57][^3_58][^3_59][^3_60][^3_61][^3_62][^3_63][^3_64][^3_65][^3_66][^3_67][^3_68][^3_69][^3_7][^3_70][^3_71][^3_72][^3_73][^3_74][^3_75][^3_76][^3_77][^3_78][^3_79][^3_8][^3_80][^3_81][^3_82][^3_83][^3_84][^3_85][^3_86][^3_87][^3_88][^3_89][^3_90][^3_91][^3_92][^3_93][^3_94][^3_95][^3_96][^3_97][^3_98][^3_99]</span>

<div align="center">⁂</div>

[^3_1]: https://github.com/shiratama644/cod-web

[^3_2]: https://api.github.com/repos/shiratama644/cod-web

[^3_3]: https://api.github.com/repos/shiratama644/cod-web/git/trees/HEAD?recursive=1

[^3_4]: https://bun.com/docs/api/websockets

[^3_5]: https://gamedev.net/forums/topic/700489-using-concurrent-tcpwebsockets-to-mitigate-head-of-line-blocking/

[^3_6]: https://just4programmers.com/websocket-vs-udp-multiplayer/

[^3_7]: https://gafferongames.com/post/why_cant_i_send_udp_packets_from_a_browser/

[^3_8]: https://gamedev.net/forums/topic/709444-can-i-make-websocket-multiplayer-games-for-any-genre/

[^3_9]: https://minhvo.is-a.dev/blogs/webtransport-low-latency-communication-for-games-and-media

[^3_10]: https://en.wikipedia.org/wiki/Nagle's_algorithm

[^3_11]: https://6it.dev/blog/tcp-peculiarities-as-applied-to-games-part-ii-1393

[^3_12]: https://www.speedguide.net/articles/gaming-tweaks-5812

[^3_13]: https://qiita.com/uturned0/items/3ab037d4d2d0500586f5

[^3_14]: https://gitlab.com/Mr_Goldberg/goldberg_emulator/-/issues/209

[^3_15]: https://www.cs.mcgill.ca/~jboula2/thesis.pdf

[^3_16]: https://dev.to/aceld/11-mmo-online-game-aoi-algorithm-l7d

[^3_17]: https://researchonline.ljmu.ac.uk/id/eprint/5111/1/DESE-2016-Accepted.pdf

[^3_18]: https://open.library.ubc.ca/media/stream/pdf/24/1.0051926/2

[^3_19]: https://www.semanticscholar.org/paper/Simulation-of-Area-of-Interest-Management-for-Games-Abdulazeez-Rhalibi/ec8b53abd76aa48c5d0f865e09a4d9a626907386

[^3_20]: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking

[^3_21]: https://developer.valvesoftware.com/wiki/Cl_interp_all

[^3_22]: https://jvm-gaming.org/t/entity-interpolation-client-side-prediction-where-to-begin-networking/59507

[^3_23]: https://nicolaschavez.com/projects/xrpg/

[^3_24]: https://developer.valvesoftware.com/wiki/Prediction

[^3_25]: https://www.jfedor.org/quake3/

[^3_26]: https://system-design.space/en/chapter/real-time-gaming-case/

[^3_27]: https://github.com/id-Software/Quake-III-Arena/blob/master/code/server/sv_snapshot.c

[^3_28]: https://fabiensanglard.net/quake3/network.php

[^3_29]: https://fouramgames.com/blog/unity-fps-sample

[^3_30]: https://docs.colyseus.io/room

[^3_31]: https://docs.colyseus.io/scalability

[^3_32]: https://colyseus.io/framework/

[^3_33]: https://docs.colyseus.io/server

[^3_34]: https://0-16-x.docs.colyseus.io/

[^3_35]: https://paper-chan.moe/paper-optimization/

[^3_36]: https://www.reddit.com/r/admincraft/comments/rmfrjo/118_chunk_lag_issues_tps_20/

[^3_37]: https://minecraft.fandom.com/wiki/Tick

[^3_38]: https://www.curseforge.com/minecraft/mc-mods/chunk-sending-forge-fabric

[^3_39]: https://forum.feed-the-beast.com/threads/1-7-10-cauldron-1-8-tick-dynamic-keep-your-server-running-at-20-tps.61903/

[^3_40]: https://greasyfork.org/en/scripts/575760-bloxd-io-killaura/code

[^3_41]: https://www.linkedin.com/company/bloxd

[^3_42]: https://www.similarweb.com/website/bloxd.io/

[^3_43]: https://www.bloxdforge.com/studio/wiki/guides/coding-guide

[^3_44]: https://bloxd-io.fandom.com/wiki/Code_Block

[^3_45]: https://bloxd.io/

[^3_46]: https://bloxd-io.fandom.com/wiki/Arthur_Baker

[^3_47]: https://news.viverse.com/post/bloxd-io-free-browser-game-on-viverse

[^3_48]: https://londonissue.co.uk/2025/06/12/bloxd-founder-arthur-baker-discusses-uk-gaming-industry-with-andy-ross-from-studio-vision-podcast/

[^3_49]: https://deepwiki.com/delfineonx/bloxd-codex

[^3_50]: https://github.com/Bloxdy

[^3_51]: https://www.crazygames.com/game/bloxdhop-io

[^3_52]: https://insanepowertrip.github.io/bloxdocs/bloxdocs.html

[^3_53]: https://deepwiki.com/bloxdy/code-api

[^3_54]: https://bloxd-io.fandom.com/wiki/FAQs

[^3_55]: https://www.reddit.com/r/bloxd/comments/1isc81c/need_help_to_set_up_a_proper_server/

[^3_56]: https://docsbot.ai/prompts/programming/bloxd-io-rtp-code

[^3_57]: https://www.youtube.com/watch?v=aNlXd7WuMgg

[^3_58]: https://www.youtube.com/watch?v=m8jSxCQPqtQ

[^3_59]: https://www.youtube.com/watch?v=LZ6pvERwb7o

[^3_60]: https://creators.spotify.com/pod/profile/andyrosspodcast/episodes/Arthur-Baker---Founder---Bloxd-e33fim7/bloxd.io

[^3_61]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients

[^3_62]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks/blob/main/Blackhole Client

[^3_63]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients?action=history

[^3_64]: https://bloxd.io/terms-of-service

[^3_65]: https://www.scribd.com/document/927502362/Message

[^3_66]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks

[^3_67]: https://bloxd-io.fandom.com/wiki/Versions

[^3_68]: https://webgamer.io/it/g/bloxd-io

[^3_69]: https://webgamer.io/vn/g/bloxd-io

[^3_70]: https://codepen.io/aditikchauhan/pen/KwKyzmK

[^3_71]: https://github.com/fenomas/noa

[^3_72]: https://github.com/websockets/ws

[^3_73]: https://docs.bloxroute.com/eth/streams/blocks-streams/newblock-stream

[^3_74]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

[^3_75]: https://docs.bloxroute.com/bsc-and-eth/streams/working-with-streams/creating-a-subscription/websocket

[^3_76]: https://bloxd-io.fandom.com/wiki/Unblocked_Domains

[^3_77]: https://www.reddit.com/r/bloxd/comments/1apri8x/bloxdio_not_working_why/

[^3_78]: https://bloxd-io.fandom.com/wiki/Errors

[^3_79]: https://websockets.readthedocs.io/en/stable/topics/proxies.html

[^3_80]: https://forum.babylonjs.com/t/nullengine-multiplayer-tutorial/1696

[^3_81]: https://www.docs.o3de.org/docs/user-guide/networking/multiplayer/

[^3_82]: https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html

[^3_83]: https://github.com/FlaxEngine/NetworkSample

[^3_84]: https://www.reddit.com/r/bloxd/comments/1bud0ly/any_reason_why_bloxd_is_laggy/

[^3_85]: https://betterroblox.com/answers/how-to-lower-ping-in-roblox

[^3_86]: https://devforum.roblox.com/t/server-region-prioritization-in-access-settings-for-lower-ping/3149268

[^3_87]: https://www.reddit.com/r/RobloxHelp/comments/1dl5g0v/how_do_i_pick_a_server_region_to_decrease_ping/

[^3_88]: https://www.ip-tracker.org/lookup.php?ip=Bloxd.io

[^3_89]: https://webrate.org/site/bloxd.io/

[^3_90]: https://scanner.pcrisk.com/scan-results/miniplay.com

[^3_91]: https://gist.github.com/garyblankenship/27a4c57eca4aa5d659ee3c509668b66d

[^3_92]: https://www.cloudflare.com/developer-platform/use-cases/hosting/

[^3_93]: https://www.similarweb.com/technology/

[^3_94]: https://www.similarweb.com/website/bloxd.io/competitors/

[^3_95]: https://endsights.com/roblox-creating-responsive-cheat-resistant-games-with-server-authority

[^3_96]: https://www.reddit.com/r/ROBLOXStudio/comments/1o6htu4/cheaters_beware_robloxs_native_anticheat_server/

[^3_97]: https://devforum.roblox.com/t/sync-server-authoritive-movement-anticheat-alpha/4027591

[^3_98]: https://create.roblox.com/docs/scripting/security/security-tactics

[^3_99]: https://gamineai.com/courses/multiplayer-battle-royale/lessons/lesson-13-anti-cheat-systems-security


---

## 全体構成

Krunker.io は「単一のWebアプリ」ではなく、役割ごとにドメインを分けた構成になっています。実際にmitmproxyで通信を観測した解析記事では、`krunker.io`（ゲームコード本体）、`assets.krunker.io`（テクスチャ・モデル配信）、`matchmaker.krunker.io`（ゲーム検索用のREST API）の3つに分かれていると報告されています（jakob.space の解析記事）。実ゲームサーバーはさらに別で、WebSocketの接続先は `wss://ip_86421626fc9fc3dcb4c875aeebb3780a.krunker.io/ws` のような、IPをハッシュ化したサブドメイン形式になっており、その先はVultrを指していたと報告されています（r/KrunkerIO のサーバー構成スレッド）。フロントのWebサイト側はexpress、配信前段にCloudflareが入っています（同スレッド）。[^4_45][^4_65]

## マッチメイキングAPI

これは唯一、外部から仕様がほぼ丸見えになっている部分です。

`https://matchmaker.krunker.io/game-list?hostname=krunker.io` にGETすると、稼働中の全ゲームがJSON配列で返ります。実レスポンスは次の形です（matchmaker.krunker.io/game-list）:[^4_43]

```json
{"games":[
 ["SV:l4vj4","us-ca-sv",0,8,{"cm":0,"c":0,"i":"Lostworld","m":7,"v":"3jG7h2nAvr595bBgWtxxT9IAPfX47yp8","g":0},117],
 ["FRA:nvt8d","de-fra",1,8,{"c":0,"m":34,"v":"3jG7h2nAvr595bBgWtxxT9IAPfX47yp8","g":10,"cm":0,"i":"HQ"},6]
]}
```

タプル構造は `[ゲームID(リージョンプレフィックス:短縮ID), サブリージョン識別子, 現在人数, 最大人数, メタデータ, 追加値]` で、メタデータの `i` がマップ名、`m` がゲームモード番号、`v` がクライアントとサーバのバージョン照合用ハッシュ、`c`/`cm`/`g` がカスタム・競技フラグ類と読めます。`v` が全ゲームで共通なのがポイントで、これでバージョン不一致クライアントの接続を弾いています。

実際の入室は別エンドポイントで、Stack Overflowに残っている実URLから引数構成が分かります（Stack Overflow の質問）:[^4_50]

```
https://matchmaker.krunker.io/seek-game
  ?hostname=krunker.io
  &region=us-ca-sv
  &game=SV%3A4jve9
  &autoChangeGame=false
  &validationToken=QR6beUGVKUKkzwIsKhbKXyaJaZtKmPN8Rwgykea5l5FkES04b6h1RHuBkaUMFnu%2B
  &dataQuery=%7B%7D
```

`validationToken` が肝で、ブラウザ以外から直接叩けないようになっています。リージョンは13あり、FRA/SV/SYD/TOK/MIA/SIN/NY/DAL/BRA/IND/BHN/AFR などが列挙されています（Krunker Wiki の Settings）。なお後のアップデートで、旧リージョンは「サブリージョン」に格下げされ、より広域のリージョンへ統合されました（r/KrunkerIO のサーバー統合解説）。上のJSONで `"SV:l4vj4"` と `"us-ca-sv"` が併記されているのはこの名残です。[^4_53][^4_57]

つまり **マッチメイカー = HTTP/REST、ゲーム = WebSocket** という完全分離型です。ロビーの検索・作成はステートレスなHTTPでCloudflare越しにさばき、実プレイだけを専用ゲームサーバープロセスに繋ぐ。これは前回話した bloxd.io のロビー/インスタンス方式と同じ発想です。

## ゲーム内プロトコル

ここが一番厄介で、**意図的に解析不能にされています**。

解析記事によれば、ゲーム本体のコードは外部JSファイルではなく、HTML末尾の巨大なインライン `<script>` に埋め込まれています。その中央に巨大なBase64ブロブがあり、デコードするとWebAssemblyバイナリでした。`strings` をかけると、この部分が **Rustで書かれている** ことが分かり、さらに解析者への敵対的な文字列まで仕込まれていたとのことです（jakob.space）。[^4_65]

そのWASMの役割は物理演算でも描画でもなく、**実行時にJavaScriptを復号・生成すること**でした。生成されたコードは `"SOURCE"` という疑似ファイルに入り、`eval` でもscriptタグ挿入でもなく `Function` コンストラクタ経由で実行されます。しかも生成されるJSは実行のたびに変数名が変わり、`getStringFromWasm()` の引数リストも毎回異なります。さらにWASMは生成した `Function` の `toString()` を検査して、フックされていないかを確認しています（同記事）。

コミュニティのアンチチート解説でも、Krunkerは途中のパッチでアンチチート判定をWASM側へ移し、**そのWASMをサーバー側が検証する**と記されています（hrt/AnticheatJS）。加えて、意図的に例外を発生させてスタックトレース中のゲームファイル名・パス・行番号を照合する、ロード済みの `game.XfsD.js` と同じURLへXHRを投げて改変を検出する、といった多層の検査が挙げられています（同）。[^4_63]

したがって、**ゲーム内パケットのフォーマット（バイナリかmsgpackか、パケットIDの割り当て、圧縮の有無）は公開情報として存在しません**。KrunkerWSInspector のようなWS観測ツールは存在しましたが2022年にアーカイブ済みで、フォーマット仕様書は残っていません（KrunkerWSInspector）。[^4_11]

一方、**ソーシャルサービス側のWebSocketだけは仕様が判明しています**。`wss://social.krunker.io/ws` に `Origin: https://krunker.io` 付きで接続し、`binaryType = "arraybuffer"`、ペイロードは **msgpack**（msgpack-lite）でエンコードされた配列です（hitthemoney の Gist）:[^4_7]

```
["pi"]                          → ["po"]            (ping/pong)
["r","profile","<user>",null]   → ["0","profile",...] (プロフィール要求)
["cpt"]                         → ["cptR","<token>",0,0] (hCaptcha)
```

Originが違うと `["error","Y8S Error"]` が返ります。ゲーム本体も同じ「msgpack配列 + 短い文字列オペコード」系である可能性は高いですが、これは推測であって確認された事実ではありません。

## 送信レートとtickrate

クライアント→サーバの入力送信は `clientSendRate` という定数で制御され、押下中のボタン（移動・射撃）が一定間隔で送られていると記述されています（hrt/AnticheatJS）。逆に言えば、Krunkerも **入力だけを送る server-authoritative 型** です。同ドキュメントには、この送信バッファを保持してから一括送信するfake lag、バッファを大きく改変することでサーバーを停止させられた脆弱性（1.5.4で緩和、1.5.6で修正）まで記録されていて、少なくとも当時は入力パケットの長さ・内容の検証が甘かったことが窺えます。[^4_63]

tickrateの歴史は荒れています。2019年時点では「459日間8tickのまま」という苦情スレッドが立ち（[r/KrunkerIO の8tick告発](https://www.reddit.com/r/KrunkerIO/comments/ctu0yb/friendly_reminder_that_krunker_servers_have_been_8_tickrate_for_459/)）、2020年半ばに「最低でも30tickであることが確認された」うえ、パケット送信頻度を上げる **high tickrate 設定** が追加されました（philzgoodman の2020年中頃レポート）。ただしこの設定は帯域消費が増えるため、環境によっては切ったほうが良いとも書かれています（同サイトの設定ガイド）。公式チェンジログにも「より高いtickrateの専用サーバーを追加予定」「開発者アカウント向けにtickrateコマンドを追加（改善とテスト中）」という記述があります（Krunker Wiki の Change Log）。[^4_39][^4_69][^4_70]

**つまり、tickrateはサーバー個体ごとに可変で、クライアント側で受信頻度を選べる設計**になっています。これは固定20TPSの bloxd.io、固定30Hz送信の cod-web とは異なる、より運用寄りのアプローチです。

## MOD向けネットワークAPI

Krunkerが自ら公開している唯一の通信仕様が、KrunkScript のネットワークAPIです。クライアント実行とサーバー実行のコンテキストが明確に分かれ、スコア・体力・オーナーシップはサーバー権威です（公式のマルチプレイヤーネットワーキングガイド）。[^4_13]

```
GAME.NETWORK.send(id, data[, playerID])
GAME.NETWORK.broadcast(id, data)
onNetworkMessage(str id, obj data[, str playerID])
```

ここで注目すべきは公開されている**レート制限値**です（NETWORK API リファレンス）:[^4_16]


| 項目 | 制限 |
| :-- | :-- |
| メッセージID長 | 10文字 |
| データサイズ | 2000バイト |
| broadcast | 10メッセージ/秒 |
| サーバー→クライアント（ユーザーあたり） | 20メッセージ/秒 |
| クライアント→サーバー | 40メッセージ/秒 |

`broadcast` はレート超過時に `false` を返します。**上限を超えたら例外を投げるのではなく戻り値で知らせる**という設計です。これは、あなたの cod-web で `sendBinary()` のbool戻り値を `snapshot.ts` が捨てていた問題とちょうど対になる話で、「送信APIの戻り値は必ず見る」という前提でAPIが設計されています。

## クライアント側の技術

レンダリングは Three.js、それ以外は独自の「Krunker Engine」で、WASMは**ソースコード保護とチート最小化のため**に使われていると開発側が説明しています（r/KrunkerIO のエンジン質問スレッド）。ただしこの回答では「C++もRustも使っていない」とされている一方、実バイナリの `strings` からはRustの痕跡が出ています（jakob.space）。時期の違いか、回答が正確でなかったかのどちらかで、ここは断定できません。[^4_1][^4_65]

その他、howler.js（音声）、tween.js、nipplejs（モバイル仮想スティック）、zip.js が読み込まれており（同記事）、現在の技術検出では Howler.js 2.2.3、core-js、Chart.js、hCaptcha、Cloudflare、各種広告SDKが挙がっています（AwesomeTechStack の解析）。開発者は Sidney de Vries、初版は2018年5月20日（ioground の歴史記事）、その後 FRVR に買収されています（Beyond Games の報道）。[^4_4][^4_24][^4_28]

## 3者比較

| 項目 | Krunker.io | bloxd.io | cod-web |
| :-- | :-- | :-- | :-- |
| 描画 | Three.js + 独自エンジン | Babylon.js（Noaエンジン） | 自作 |
| 通信 | WebSocket（ゲーム内仕様非公開） | WebSocket | Bun WebSocket |
| シリアライズ | 不明（social側はmsgpack） | 非公開 | 自作バイナリ DataView |
| tick | 可変・8→30以上、high tickrate設定あり | 20TPS固定 | 60Hz sim / 30Hz送信 |
| マッチメイキング | 独立REST API + validationToken | ロビー/インスタンス | 単一Room固定 |
| リージョン | 13拠点 | 非公開 | なし |
| コード保護 | WASMによる実行時JS生成 + 難読化 + サーバ検証 | サンドボックス化スクリプトAPI | なし |
| レート制限 | MOD APIで明示（40/20/10 msg/s） | スクリプト16k文字制限 | なし |

cod-web と比較したときに、Krunker から取り込める価値が高いのは次の3点です。

**1. マッチメイカーの分離**。現状の `const room = new Room()` 固定を、`game-list` / `seek-game` 相当のHTTPエンドポイントに置き換えれば、ゲームサーバープロセスを水平に増やせます。Krunkerの `v`（バージョンハッシュ）に相当する値を返すようにすれば、古いクライアントの接続も同時に弾けます。

**2. 明示的なレート制限とバイト上限**。Krunkerは「クライアント→サーバ40msg/s、データ2000バイト」を公開仕様として持っています。cod-web は入力12B・60Hz送信なので、`60msg/s` かつ `12バイト固定長` という上限を接続ごとに強制するだけで、以前指摘した「3バイトパケットで `getUint32` が RangeError を投げる」問題と、Krunker自身が食らった「バッファ改変によるサーバー停止」の両方を同時に潰せます。

**3. tickrateのクライアント選択**。Krunkerの high tickrate 設定は、帯域とスムーズさのトレードオフをユーザーに委ねる仕組みです。cod-web の30Hz固定スナップショットも、`welcome` メッセージのネゴシエーションで15Hz/30Hzを選ばせるようにしておくと、後でAOIやデルタ圧縮を入れる際の土台になります。

なお、Krunkerのゲーム内プロトコルそのものは、クライアント改変を検出してサーバー側で検証する仕組みが動いているため、実際に接続して解析することは規約・技術の両面で推奨できません。ここで挙げたのは、すべて既に公開されている解析記事・公式ドキュメント・コミュニティ報告に基づく内容です。

<span style="display:none">[^4_10][^4_100][^4_101][^4_102][^4_103][^4_104][^4_105][^4_106][^4_107][^4_108][^4_109][^4_110][^4_111][^4_112][^4_113][^4_114][^4_115][^4_116][^4_117][^4_118][^4_119][^4_12][^4_120][^4_121][^4_122][^4_123][^4_124][^4_125][^4_126][^4_127][^4_128][^4_129][^4_130][^4_131][^4_132][^4_133][^4_134][^4_135][^4_136][^4_137][^4_138][^4_139][^4_14][^4_140][^4_141][^4_142][^4_143][^4_144][^4_145][^4_146][^4_147][^4_148][^4_149][^4_15][^4_150][^4_151][^4_152][^4_153][^4_154][^4_155][^4_156][^4_157][^4_158][^4_159][^4_160][^4_161][^4_162][^4_163][^4_164][^4_165][^4_166][^4_167][^4_168][^4_169][^4_17][^4_170][^4_171][^4_172][^4_173][^4_174][^4_175][^4_176][^4_177][^4_18][^4_19][^4_2][^4_20][^4_21][^4_22][^4_23][^4_25][^4_26][^4_27][^4_29][^4_3][^4_30][^4_31][^4_32][^4_33][^4_34][^4_35][^4_36][^4_37][^4_38][^4_40][^4_41][^4_42][^4_44][^4_46][^4_47][^4_48][^4_49][^4_5][^4_51][^4_52][^4_54][^4_55][^4_56][^4_58][^4_59][^4_6][^4_60][^4_61][^4_62][^4_64][^4_66][^4_67][^4_68][^4_71][^4_72][^4_73][^4_74][^4_75][^4_76][^4_77][^4_78][^4_79][^4_8][^4_80][^4_81][^4_82][^4_83][^4_84][^4_85][^4_86][^4_87][^4_88][^4_89][^4_9][^4_90][^4_91][^4_92][^4_93][^4_94][^4_95][^4_96][^4_97][^4_98][^4_99]</span>

<div align="center">⁂</div>

[^4_1]: https://www.reddit.com/r/KrunkerIO/comments/13wh4q8/does_anyone_know_with_what_the_3d_game_engine_the/

[^4_2]: https://greasyfork.org/en/scripts/565051-krunker-io-aimbot-esp-wireframe/code

[^4_3]: https://github.com/MasterP-kr/Krunker-ThreeJS-Tools

[^4_4]: https://awesometechstack.com/analysis/website/krunker.io

[^4_5]: https://greasyfork.org/en/scripts/432453-krunker-io-aimbot-esp/code

[^4_6]: https://greasyfork.org/en/scripts/517983-optimized-krunker-io-aimbot-esp/code

[^4_7]: https://gist.github.com/hitthemoney/a5b7707417c2ba2b2f3303f35135bf3e

[^4_8]: https://pastebin.com/Lmhk9AfK

[^4_9]: https://stackoverflow.com/questions/66966044/set-websocket-origin-header-in-javascript

[^4_10]: https://www.scribd.com/document/700400002/Copy-And-Paste-For-Tampermonkey-And-VIolent-Monkey

[^4_11]: https://github.com/Dennetix/KrunkerWSInspector

[^4_12]: https://socket.io/docs/v3/custom-parser/

[^4_13]: https://docs.krunker.io/guides/multiplayer-networking

[^4_14]: https://docs.krunker.io/api

[^4_15]: https://steamcommunity.com/app/1408720

[^4_16]: https://docs.krunker.io/api/network

[^4_17]: https://github.com/N4Gaming/Krunker-Codes/blob/master/krunker hacks code.txt

[^4_18]: https://github.com/uNetworking/uWebSockets.js/

[^4_19]: https://gist.github.com/hitthemoney/a5b7707417c2ba2b2f3303f35135bf3e?permalink_comment_id=4644343

[^4_20]: https://github.com/uNetworking/uWebSockets.js/discussions/46

[^4_21]: https://gist.github.com/hitthemoney/a5b7707417c2ba2b2f3303f35135bf3e?permalink_comment_id=4107749

[^4_22]: https://github.com/uNetworking/uWebSockets

[^4_23]: https://github.com/uNetworking/uWebSockets.js/blob/master/README.md

[^4_24]: https://ioground.com/blog/the-history-behind-krunker-io

[^4_25]: https://www.youtube.com/watch?v=I9O0Zmiy0hQ

[^4_26]: https://medium.com/@ItsHooper/innovating-play-how-sidney-de-vries-shaped-the-future-of-real-time-gaming-3c313c56a1ec

[^4_27]: https://www.reddit.com/r/KrunkerIO/comments/17vf9b6/breaking_into_video_game_journalism_questions/

[^4_28]: https://www.beyondgames.biz/22353/frvr-acquires-popular-free-to-play-shooter-krunker/

[^4_29]: https://www.youtube.com/watch?v=GCs2Ezyx08s

[^4_30]: https://www.reddit.com/r/KrunkerIO/comments/9y372h/voice_chat/

[^4_31]: https://github.com/janstuemmel/webrtc-voice-demo

[^4_32]: https://dev.to/shynsec/i-built-a-private-voice-chat-app-because-i-was-done-giving-discord-my-conversations-1h8h

[^4_33]: https://www.pubnub.com/blog/building-a-webrtc-video-and-voice-chat-application/

[^4_34]: https://docs.krunker.io/api/mods

[^4_35]: https://github.com/kiprasvitas/Krunker-API

[^4_36]: https://docs.krunker.io/hooks/client

[^4_37]: https://support.kraken.com/articles/360043283472-websocket-api-v1-v2-recommended-python-library-and-usage-examples

[^4_38]: https://www.reddit.com/r/KrunkerIO/comments/ctu0yb/friendly_reminder_that_krunker_servers_have_been/

[^4_39]: https://www.philzgoodman.com/krunkerio-guides/what-its-like-playing-krunker-in-mid-2020-plus-my-updated-settings

[^4_40]: https://www.reddit.com/r/KrunkerIO/comments/1crmy6l/krunker_netcode_analysis/

[^4_41]: https://docs.unity3d.com/Packages/com.unity.netcode@1.0/api/Unity.NetCode.ClientServerTickRate.html

[^4_42]: https://docs-multiplayer.unity3d.com/netcode/1.1.0/reference/glossary/ticks-and-update-rates/

[^4_43]: https://matchmaker.krunker.io/game-list?hostname=krunker.io

[^4_44]: https://www.reddit.com/r/KrunkerIO/comments/17wuj0m/i_wrote_a_basic_krunker_api/

[^4_45]: https://www.reddit.com/r/KrunkerIO/comments/bvlrin/does_someone_know_what_server_architecture_the/

[^4_46]: https://github.com/fasetto/krunker.io

[^4_47]: https://github.com/KraXen72/crankshaft

[^4_48]: https://krunker.io/

[^4_49]: https://www.reddit.com/r/KrunkerIO/comments/cvhowo/add_a_find_new_game_option/

[^4_50]: https://stackoverflow.com/questions/64917891/why-cant-i-fetch-a-webpage-with-nodejs-and-node-fetch

[^4_51]: https://krunker.io/games.html

[^4_52]: https://www.reddit.com/r/KrunkerIO/comments/biq9ak/discord_bot/

[^4_53]: https://krunkerio.fandom.com/wiki/Settings

[^4_54]: https://namu.wiki/w/Krunker

[^4_55]: https://en.namu.wiki/w/Krunker

[^4_56]: https://krunker.io/docs/versions.txt

[^4_57]: https://www.reddit.com/r/KrunkerIO/comments/15yi0vn/explaining_the_servers_merging_in_krunkers_latest/

[^4_58]: https://kour.fandom.com/wiki/Server_Finder

[^4_59]: https://www.reddit.com/r/Games/comments/5u9q7x/for_honor_preliminary_netcode_analysis/

[^4_60]: https://www.reddit.com/r/Unity3D/comments/1mk972v/tutorial_unity_netcode_authoritative_movement/

[^4_61]: https://www.reddit.com/r/Blackops4/comments/9qkode/everything_you_need_to_know_about_tick_rate_lag/

[^4_62]: https://discussions.unity.com/t/a-proper-way-to-implement-client-side-interpolation-when-you-know-the-servers-tick-rate/929099

[^4_63]: https://github.com/hrt/AnticheatJS/blob/master/README.md

[^4_64]: https://github.com/hrt/AnticheatJS

[^4_65]: https://jakob.space/blog/browser-games-aren-t-an-easy-target.html

[^4_66]: https://www.reddit.com/r/KrunkerIO/comments/11tzng0/what_anticheat_does_krunker_uses/

[^4_67]: https://github.com/ideklmao12/KrunkerBypass

[^4_68]: https://javascriptobfuscator.com/protect-html5-game-javascript.aspx

[^4_69]: https://www.philzgoodman.com/krunkerio-guides/best-krunker-settings

[^4_70]: https://krunkerio.fandom.com/wiki/Change_Log

[^4_71]: https://krunker.io/docs/settings.txt

[^4_72]: https://krunkerio.fandom.com/wiki/Change_Log_V2

[^4_73]: https://krunkerio.fandom.com/wiki/Custom_Games

[^4_74]: https://www.youtube.com/watch?v=cx8dzxnitzM

[^4_75]: https://www.gamepur.com/guides/how-to-create-a-server-in-krunker

[^4_76]: https://krunkerio.fandom.com/wiki/Competitive_Games

[^4_77]: https://www.youtube.com/watch?v=NT1tNjGLlrs

[^4_78]: https://krunker.io/editor.html

[^4_79]: https://github.com/shiratama644/cod-web

[^4_80]: https://api.github.com/repos/shiratama644/cod-web

[^4_81]: https://api.github.com/repos/shiratama644/cod-web/git/trees/HEAD?recursive=1

[^4_82]: https://bun.com/docs/api/websockets

[^4_83]: https://gamedev.net/forums/topic/700489-using-concurrent-tcpwebsockets-to-mitigate-head-of-line-blocking/

[^4_84]: https://just4programmers.com/websocket-vs-udp-multiplayer/

[^4_85]: https://gafferongames.com/post/why_cant_i_send_udp_packets_from_a_browser/

[^4_86]: https://gamedev.net/forums/topic/709444-can-i-make-websocket-multiplayer-games-for-any-genre/

[^4_87]: https://minhvo.is-a.dev/blogs/webtransport-low-latency-communication-for-games-and-media

[^4_88]: https://en.wikipedia.org/wiki/Nagle's_algorithm

[^4_89]: https://6it.dev/blog/tcp-peculiarities-as-applied-to-games-part-ii-1393

[^4_90]: https://www.speedguide.net/articles/gaming-tweaks-5812

[^4_91]: https://qiita.com/uturned0/items/3ab037d4d2d0500586f5

[^4_92]: https://gitlab.com/Mr_Goldberg/goldberg_emulator/-/issues/209

[^4_93]: https://www.cs.mcgill.ca/~jboula2/thesis.pdf

[^4_94]: https://dev.to/aceld/11-mmo-online-game-aoi-algorithm-l7d

[^4_95]: https://researchonline.ljmu.ac.uk/id/eprint/5111/1/DESE-2016-Accepted.pdf

[^4_96]: https://open.library.ubc.ca/media/stream/pdf/24/1.0051926/2

[^4_97]: https://www.semanticscholar.org/paper/Simulation-of-Area-of-Interest-Management-for-Games-Abdulazeez-Rhalibi/ec8b53abd76aa48c5d0f865e09a4d9a626907386

[^4_98]: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking

[^4_99]: https://developer.valvesoftware.com/wiki/Cl_interp_all

[^4_100]: https://jvm-gaming.org/t/entity-interpolation-client-side-prediction-where-to-begin-networking/59507

[^4_101]: https://nicolaschavez.com/projects/xrpg/

[^4_102]: https://developer.valvesoftware.com/wiki/Prediction

[^4_103]: https://www.jfedor.org/quake3/

[^4_104]: https://system-design.space/en/chapter/real-time-gaming-case/

[^4_105]: https://github.com/id-Software/Quake-III-Arena/blob/master/code/server/sv_snapshot.c

[^4_106]: https://fabiensanglard.net/quake3/network.php

[^4_107]: https://fouramgames.com/blog/unity-fps-sample

[^4_108]: https://docs.colyseus.io/room

[^4_109]: https://docs.colyseus.io/scalability

[^4_110]: https://colyseus.io/framework/

[^4_111]: https://docs.colyseus.io/server

[^4_112]: https://0-16-x.docs.colyseus.io/

[^4_113]: https://paper-chan.moe/paper-optimization/

[^4_114]: https://www.reddit.com/r/admincraft/comments/rmfrjo/118_chunk_lag_issues_tps_20/

[^4_115]: https://minecraft.fandom.com/wiki/Tick

[^4_116]: https://www.curseforge.com/minecraft/mc-mods/chunk-sending-forge-fabric

[^4_117]: https://forum.feed-the-beast.com/threads/1-7-10-cauldron-1-8-tick-dynamic-keep-your-server-running-at-20-tps.61903/

[^4_118]: https://greasyfork.org/en/scripts/575760-bloxd-io-killaura/code

[^4_119]: https://www.linkedin.com/company/bloxd

[^4_120]: https://www.similarweb.com/website/bloxd.io/

[^4_121]: https://www.bloxdforge.com/studio/wiki/guides/coding-guide

[^4_122]: https://bloxd-io.fandom.com/wiki/Code_Block

[^4_123]: https://bloxd.io/

[^4_124]: https://bloxd-io.fandom.com/wiki/Arthur_Baker

[^4_125]: https://news.viverse.com/post/bloxd-io-free-browser-game-on-viverse

[^4_126]: https://londonissue.co.uk/2025/06/12/bloxd-founder-arthur-baker-discusses-uk-gaming-industry-with-andy-ross-from-studio-vision-podcast/

[^4_127]: https://deepwiki.com/delfineonx/bloxd-codex

[^4_128]: https://github.com/Bloxdy

[^4_129]: https://www.crazygames.com/game/bloxdhop-io

[^4_130]: https://insanepowertrip.github.io/bloxdocs/bloxdocs.html

[^4_131]: https://deepwiki.com/bloxdy/code-api

[^4_132]: https://bloxd-io.fandom.com/wiki/FAQs

[^4_133]: https://www.reddit.com/r/bloxd/comments/1isc81c/need_help_to_set_up_a_proper_server/

[^4_134]: https://docsbot.ai/prompts/programming/bloxd-io-rtp-code

[^4_135]: https://www.youtube.com/watch?v=aNlXd7WuMgg

[^4_136]: https://www.youtube.com/watch?v=m8jSxCQPqtQ

[^4_137]: https://www.youtube.com/watch?v=LZ6pvERwb7o

[^4_138]: https://creators.spotify.com/pod/profile/andyrosspodcast/episodes/Arthur-Baker---Founder---Bloxd-e33fim7/bloxd.io

[^4_139]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients

[^4_140]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks/blob/main/Blackhole Client

[^4_141]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients?action=history

[^4_142]: https://bloxd.io/terms-of-service

[^4_143]: https://www.scribd.com/document/927502362/Message

[^4_144]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks

[^4_145]: https://bloxd-io.fandom.com/wiki/Versions

[^4_146]: https://webgamer.io/it/g/bloxd-io

[^4_147]: https://webgamer.io/vn/g/bloxd-io

[^4_148]: https://codepen.io/aditikchauhan/pen/KwKyzmK

[^4_149]: https://github.com/fenomas/noa

[^4_150]: https://github.com/websockets/ws

[^4_151]: https://docs.bloxroute.com/eth/streams/blocks-streams/newblock-stream

[^4_152]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

[^4_153]: https://docs.bloxroute.com/bsc-and-eth/streams/working-with-streams/creating-a-subscription/websocket

[^4_154]: https://bloxd-io.fandom.com/wiki/Unblocked_Domains

[^4_155]: https://www.reddit.com/r/bloxd/comments/1apri8x/bloxdio_not_working_why/

[^4_156]: https://bloxd-io.fandom.com/wiki/Errors

[^4_157]: https://websockets.readthedocs.io/en/stable/topics/proxies.html

[^4_158]: https://forum.babylonjs.com/t/nullengine-multiplayer-tutorial/1696

[^4_159]: https://www.docs.o3de.org/docs/user-guide/networking/multiplayer/

[^4_160]: https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html

[^4_161]: https://github.com/FlaxEngine/NetworkSample

[^4_162]: https://www.reddit.com/r/bloxd/comments/1bud0ly/any_reason_why_bloxd_is_laggy/

[^4_163]: https://betterroblox.com/answers/how-to-lower-ping-in-roblox

[^4_164]: https://devforum.roblox.com/t/server-region-prioritization-in-access-settings-for-lower-ping/3149268

[^4_165]: https://www.reddit.com/r/RobloxHelp/comments/1dl5g0v/how_do_i_pick_a_server_region_to_decrease_ping/

[^4_166]: https://www.ip-tracker.org/lookup.php?ip=Bloxd.io

[^4_167]: https://webrate.org/site/bloxd.io/

[^4_168]: https://scanner.pcrisk.com/scan-results/miniplay.com

[^4_169]: https://gist.github.com/garyblankenship/27a4c57eca4aa5d659ee3c509668b66d

[^4_170]: https://www.cloudflare.com/developer-platform/use-cases/hosting/

[^4_171]: https://www.similarweb.com/technology/

[^4_172]: https://www.similarweb.com/website/bloxd.io/competitors/

[^4_173]: https://endsights.com/roblox-creating-responsive-cheat-resistant-games-with-server-authority

[^4_174]: https://www.reddit.com/r/ROBLOXStudio/comments/1o6htu4/cheaters_beware_robloxs_native_anticheat_server/

[^4_175]: https://devforum.roblox.com/t/sync-server-authoritive-movement-anticheat-alpha/4027591

[^4_176]: https://create.roblox.com/docs/scripting/security/security-tactics

[^4_177]: https://gamineai.com/courses/multiplayer-battle-royale/lessons/lesson-13-anti-cheat-systems-security


---

## 結論から言うと、違います

2つの点で読み替えがずれています。

**1. レイヤーが違う**

あの40msg/s・2000Bは、KrunkScript の `GAME.NETWORK.send()` / `broadcast()` という**MOD開発者向けチャネル**の制限です（[NETWORK API リファレンス](https://docs.krunker.io/api/network)）。プレイヤーの移動・射撃・スナップショットといったコアの通信は、これとは別のエンジン内部プロトコルで流れていて、そちらは `clientSendRate` という別の定数で制御されています（[hrt/AnticheatJS](https://github.com/hrt/AnticheatJS/blob/master/README.md)）。

つまり Krunker 本体は「40msg/s・2000B」の中で動いているのではなく、**その上に追加でMODが乗る分の予算**として40/2000が切られている、という関係です。cod-web の入力パケットやスナップショットに直接対応する数字ではありません。

**2. 上限であって設計値ではない**

40msg/s も 2000B も「これを超えたら拒否する」という天井です。掛け算すると 40 × 2000 = 80 KB/s になりますが、これは「MODが最悪ここまで使える」という値であって、「40Hzで2KB送る想定」ではありません。実際のMODは1秒に数回、数十バイト送る程度が普通です。

## cod-web の実測と並べると

| 方向 | cod-web の実際 | Krunker MOD APIの上限 |
| :-- | :-- | :-- |
| C→S | 12 B × 60Hz = **720 B/s** | 40 msg/s（サイズ上限2000B） |
| S→C | 329 B × 30Hz = **9.87 KB/s** | 20 msg/s／ユーザー |

サイズ面では cod-web は桁違いに小さく、2000B制限には全く触れません。逆に**頻度は超えています**（入力60 > 40、スナップショット30 > 20）。ただしこれも「Krunkerのコアが20Hzで動いている」という意味ではなく、MODチャネルにその頻度を許していないというだけです。

## 実際に持ち帰るべきもの

数値そのものではなく、**「上限を仕様として明文化して、サーバ側で強制する」という設計姿勢**のほうです。cod-web に落とすなら、Krunkerの数字を借りるのではなく自分のプロトコルから導出します。

```
入力パケット: 長さ == 12 B 固定（それ以外は即切断）
入力レート:  60 msg/s + 余裕 → 90 msg/s を超えたら切断
```

前回指摘した「3バイトのtype=1パケットで `getUint32` が RangeError を投げる」問題は、この長さチェック1行で消えます。Krunker自身も、入力バッファを大きく改変されてサーバーを停止させられる脆弱性を踏んでいて、1.5.6でようやく修正しています（[hrt/AnticheatJS](https://github.com/hrt/AnticheatJS/blob/master/README.md)）。**固定長プロトコルなら固定長を検証する**、というだけの話ですが、これが抜けていると同じ穴が空きます。

もし cod-web に将来MOD機構を載せるなら、そのときこそ Krunker の40/2000がそのまま参考になります。コア通信とMOD通信を別レートで管理し、MOD側は超過時に例外ではなく `false` を返す、という分離の仕方です。

<span style="display:none">[^5_1][^5_10][^5_100][^5_11][^5_12][^5_13][^5_14][^5_15][^5_16][^5_17][^5_18][^5_19][^5_2][^5_20][^5_21][^5_22][^5_23][^5_24][^5_25][^5_26][^5_27][^5_28][^5_29][^5_3][^5_30][^5_31][^5_32][^5_33][^5_34][^5_35][^5_36][^5_37][^5_38][^5_39][^5_4][^5_40][^5_41][^5_42][^5_43][^5_44][^5_45][^5_46][^5_47][^5_48][^5_49][^5_5][^5_50][^5_51][^5_52][^5_53][^5_54][^5_55][^5_56][^5_57][^5_58][^5_59][^5_6][^5_60][^5_61][^5_62][^5_63][^5_64][^5_65][^5_66][^5_67][^5_68][^5_69][^5_7][^5_70][^5_71][^5_72][^5_73][^5_74][^5_75][^5_76][^5_77][^5_78][^5_79][^5_8][^5_80][^5_81][^5_82][^5_83][^5_84][^5_85][^5_86][^5_87][^5_88][^5_89][^5_9][^5_90][^5_91][^5_92][^5_93][^5_94][^5_95][^5_96][^5_97][^5_98][^5_99]</span>

<div align="center">⁂</div>

[^5_1]: https://krunker.io/editor.html

[^5_2]: https://github.com/shiratama644/cod-web

[^5_3]: https://api.github.com/repos/shiratama644/cod-web

[^5_4]: https://api.github.com/repos/shiratama644/cod-web/git/trees/HEAD?recursive=1

[^5_5]: https://bun.com/docs/api/websockets

[^5_6]: https://gamedev.net/forums/topic/700489-using-concurrent-tcpwebsockets-to-mitigate-head-of-line-blocking/

[^5_7]: https://just4programmers.com/websocket-vs-udp-multiplayer/

[^5_8]: https://gafferongames.com/post/why_cant_i_send_udp_packets_from_a_browser/

[^5_9]: https://gamedev.net/forums/topic/709444-can-i-make-websocket-multiplayer-games-for-any-genre/

[^5_10]: https://minhvo.is-a.dev/blogs/webtransport-low-latency-communication-for-games-and-media

[^5_11]: https://en.wikipedia.org/wiki/Nagle's_algorithm

[^5_12]: https://6it.dev/blog/tcp-peculiarities-as-applied-to-games-part-ii-1393

[^5_13]: https://www.speedguide.net/articles/gaming-tweaks-5812

[^5_14]: https://qiita.com/uturned0/items/3ab037d4d2d0500586f5

[^5_15]: https://gitlab.com/Mr_Goldberg/goldberg_emulator/-/issues/209

[^5_16]: https://www.cs.mcgill.ca/~jboula2/thesis.pdf

[^5_17]: https://dev.to/aceld/11-mmo-online-game-aoi-algorithm-l7d

[^5_18]: https://researchonline.ljmu.ac.uk/id/eprint/5111/1/DESE-2016-Accepted.pdf

[^5_19]: https://open.library.ubc.ca/media/stream/pdf/24/1.0051926/2

[^5_20]: https://www.semanticscholar.org/paper/Simulation-of-Area-of-Interest-Management-for-Games-Abdulazeez-Rhalibi/ec8b53abd76aa48c5d0f865e09a4d9a626907386

[^5_21]: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking

[^5_22]: https://developer.valvesoftware.com/wiki/Cl_interp_all

[^5_23]: https://jvm-gaming.org/t/entity-interpolation-client-side-prediction-where-to-begin-networking/59507

[^5_24]: https://nicolaschavez.com/projects/xrpg/

[^5_25]: https://developer.valvesoftware.com/wiki/Prediction

[^5_26]: https://www.jfedor.org/quake3/

[^5_27]: https://system-design.space/en/chapter/real-time-gaming-case/

[^5_28]: https://github.com/id-Software/Quake-III-Arena/blob/master/code/server/sv_snapshot.c

[^5_29]: https://fabiensanglard.net/quake3/network.php

[^5_30]: https://fouramgames.com/blog/unity-fps-sample

[^5_31]: https://docs.colyseus.io/room

[^5_32]: https://docs.colyseus.io/scalability

[^5_33]: https://colyseus.io/framework/

[^5_34]: https://docs.colyseus.io/server

[^5_35]: https://0-16-x.docs.colyseus.io/

[^5_36]: https://paper-chan.moe/paper-optimization/

[^5_37]: https://www.reddit.com/r/admincraft/comments/rmfrjo/118_chunk_lag_issues_tps_20/

[^5_38]: https://minecraft.fandom.com/wiki/Tick

[^5_39]: https://www.curseforge.com/minecraft/mc-mods/chunk-sending-forge-fabric

[^5_40]: https://forum.feed-the-beast.com/threads/1-7-10-cauldron-1-8-tick-dynamic-keep-your-server-running-at-20-tps.61903/

[^5_41]: https://greasyfork.org/en/scripts/575760-bloxd-io-killaura/code

[^5_42]: https://www.linkedin.com/company/bloxd

[^5_43]: https://www.similarweb.com/website/bloxd.io/

[^5_44]: https://www.bloxdforge.com/studio/wiki/guides/coding-guide

[^5_45]: https://bloxd-io.fandom.com/wiki/Code_Block

[^5_46]: https://bloxd.io/

[^5_47]: https://bloxd-io.fandom.com/wiki/Arthur_Baker

[^5_48]: https://news.viverse.com/post/bloxd-io-free-browser-game-on-viverse

[^5_49]: https://londonissue.co.uk/2025/06/12/bloxd-founder-arthur-baker-discusses-uk-gaming-industry-with-andy-ross-from-studio-vision-podcast/

[^5_50]: https://deepwiki.com/delfineonx/bloxd-codex

[^5_51]: https://github.com/Bloxdy

[^5_52]: https://www.crazygames.com/game/bloxdhop-io

[^5_53]: https://insanepowertrip.github.io/bloxdocs/bloxdocs.html

[^5_54]: https://deepwiki.com/bloxdy/code-api

[^5_55]: https://bloxd-io.fandom.com/wiki/FAQs

[^5_56]: https://www.reddit.com/r/bloxd/comments/1isc81c/need_help_to_set_up_a_proper_server/

[^5_57]: https://docsbot.ai/prompts/programming/bloxd-io-rtp-code

[^5_58]: https://www.youtube.com/watch?v=aNlXd7WuMgg

[^5_59]: https://www.youtube.com/watch?v=m8jSxCQPqtQ

[^5_60]: https://www.youtube.com/watch?v=LZ6pvERwb7o

[^5_61]: https://creators.spotify.com/pod/profile/andyrosspodcast/episodes/Arthur-Baker---Founder---Bloxd-e33fim7/bloxd.io

[^5_62]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients

[^5_63]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks/blob/main/Blackhole Client

[^5_64]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients?action=history

[^5_65]: https://bloxd.io/terms-of-service

[^5_66]: https://www.scribd.com/document/927502362/Message

[^5_67]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks

[^5_68]: https://bloxd-io.fandom.com/wiki/Versions

[^5_69]: https://webgamer.io/it/g/bloxd-io

[^5_70]: https://webgamer.io/vn/g/bloxd-io

[^5_71]: https://codepen.io/aditikchauhan/pen/KwKyzmK

[^5_72]: https://github.com/fenomas/noa

[^5_73]: https://github.com/websockets/ws

[^5_74]: https://docs.bloxroute.com/eth/streams/blocks-streams/newblock-stream

[^5_75]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

[^5_76]: https://docs.bloxroute.com/bsc-and-eth/streams/working-with-streams/creating-a-subscription/websocket

[^5_77]: https://bloxd-io.fandom.com/wiki/Unblocked_Domains

[^5_78]: https://www.reddit.com/r/bloxd/comments/1apri8x/bloxdio_not_working_why/

[^5_79]: https://bloxd-io.fandom.com/wiki/Errors

[^5_80]: https://websockets.readthedocs.io/en/stable/topics/proxies.html

[^5_81]: https://forum.babylonjs.com/t/nullengine-multiplayer-tutorial/1696

[^5_82]: https://www.docs.o3de.org/docs/user-guide/networking/multiplayer/

[^5_83]: https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html

[^5_84]: https://github.com/FlaxEngine/NetworkSample

[^5_85]: https://www.reddit.com/r/bloxd/comments/1bud0ly/any_reason_why_bloxd_is_laggy/

[^5_86]: https://betterroblox.com/answers/how-to-lower-ping-in-roblox

[^5_87]: https://devforum.roblox.com/t/server-region-prioritization-in-access-settings-for-lower-ping/3149268

[^5_88]: https://www.reddit.com/r/RobloxHelp/comments/1dl5g0v/how_do_i_pick_a_server_region_to_decrease_ping/

[^5_89]: https://www.ip-tracker.org/lookup.php?ip=Bloxd.io

[^5_90]: https://webrate.org/site/bloxd.io/

[^5_91]: https://scanner.pcrisk.com/scan-results/miniplay.com

[^5_92]: https://gist.github.com/garyblankenship/27a4c57eca4aa5d659ee3c509668b66d

[^5_93]: https://www.cloudflare.com/developer-platform/use-cases/hosting/

[^5_94]: https://www.similarweb.com/technology/

[^5_95]: https://www.similarweb.com/website/bloxd.io/competitors/

[^5_96]: https://endsights.com/roblox-creating-responsive-cheat-resistant-games-with-server-authority

[^5_97]: https://www.reddit.com/r/ROBLOXStudio/comments/1o6htu4/cheaters_beware_robloxs_native_anticheat_server/

[^5_98]: https://devforum.roblox.com/t/sync-server-authoritive-movement-anticheat-alpha/4027591

[^5_99]: https://create.roblox.com/docs/scripting/security/security-tactics

[^5_100]: https://gamineai.com/courses/multiplayer-battle-royale/lessons/lesson-13-anti-cheat-systems-security


---

## 「滑らかさ」を3つに分解する

Krunker が滑らかに感じられる理由は1つではなく、独立した3つの遅延を全部削っているからです。混ぜて考えると必ず詰まります。


| 層 | 何が支配的か | 目標 |
| :-- | :-- | :-- |
| 描画FPS | ドローコール数、フィルレート、GC | 常時144以上（最低でも60を割らない） |
| 入力遅延 | ポインタロック、コンポジット、vsync | 入力→画面まで2フレーム以内 |
| ネットワーク | 補間バッファ、予測、tick | 他プレイヤーが等速で動いて見える |

cod-web はすでに3層目（予測＋巻き戻し＋100ms補間）が入っているので、実は残り2つのほうが「Krunkerっぽさ」への寄与が大きいです。

## Krunkerの設計思想は「全部切れる」

Krunker が公開しているデフォルト設定ファイルを見ると、思想が露骨に分かります（krunker.io/docs/settings.txt）。[^6_41]

```
resolution,0.6          ← 解像度スケール。デフォルトで既に60%
antiAlias,false         ← AAはデフォルトOFF
shaderRendering,false   ← シェーダ描画OFF
shadowsDynamic,false    ← 動的影OFF（静的影は残す）
softShad,false
highResShad,false
ssao,false
bloom,false
reflection,0
renderDist,100          ← 描画距離
particlesDist,160
lowSpec,false
noTex,false             ← テクスチャ完全OFFのオプションまである
updateRate,0            ← ネットワーク更新レートすらユーザー設定
lagComp,1
```

**デフォルトが既に低品質側に倒れている**のが最重要ポイントです。「まず動く、その上で盛れる人は盛る」。しかも `noTex`（テクスチャなし）や `lowSpec` のような、普通のゲームなら用意しない極端な逃げ道まで用意されています。ローエンドのIntel内蔵GPUノートで遊ばれることが前提の設計です（r/KrunkerIO のパフォーマンススレッド）。[^6_7]

OSS FPSを作るなら、**設定項目を先に設計してから描画機能を足す**のが正解です。「あとで設定にする」は絶対に間に合いません。

## ドローコールを100未満に

Three.js で60FPSを割る原因は、ほぼ例外なく三角形数ではなくドローコール数です。GPUは「何個の三角形か」より「何回描けと言われたか」を気にします（Hon Tran の Three.js 最適化ガイド）。実践的な目標値として **1フレームあたり100ドローコール未満**、繰り返しオブジェクトは `InstancedMesh`、形状が異なるものは `BatchedMesh`、静的ジオメトリはマージ、マテリアルは共有、が挙げられています（Utsubo の Three.js ベストプラクティス100選）。[^6_1][^6_3]

Krunkerのボクセル的なローポリ・単色調のアートスタイルは、見た目の趣味である以前に**マテリアル共有とジオメトリマージを最大化するための制約**です。マップ全体をテクスチャアトラス1枚＋マージ済みジオメトリ数個にすれば、静的地形のドローコールは一桁になります。

具体的な優先順位:

1. マップ静的部分を1マテリアルにマージ（ドローコールが数百→数個）
2. プレイヤー・弾・パーティクルを `InstancedMesh` 化
3. 動的影は完全に捨てて、ライトマップかシンプルなAO項をベイク
4. ポストプロセスはデフォルトOFF、`EffectComposer` 自体を遅延ロード

実際、全キャラを1つの `InstancedMesh` にマージして頂点IDでパーツを分けることで、大群衆を1ドローコールで描く事例が報告されています（Three.js フォーラムの事例）。[^6_4]

## 入力遅延を削る3つのAPI

ここは知っているかどうかだけの差で、実装コストがほぼゼロなのに効きます。

**1. Pointer Lock の raw input**

`requestPointerLock()` はデフォルトでOSのマウス加速が乗った値を返します。FPSでは致命的なので、加速を切った生の移動量を要求します（MDN の requestPointerLock、Pointer Lock 2.0 仕様）。[^6_18][^6_19]

```js
canvas.requestPointerLock({ unadjustedMovement: true });
```

**2. desynchronized canvas**

`getContext()` に `desynchronized: true` を渡すと、通常のDOM更新機構を迂回して、可能な限りコンポジット処理をスキップします。環境によってはキャンバスのバッファがディスプレイコントローラへ直接送られます（Chrome 開発者ブログの解説）。WebGLではフレーム間クリアによるちらつきが出ることがあるので `preserveDrawingBuffer: true` を併用します（同記事）。[^6_11]

```js
const gl = canvas.getContext('webgl2', {
  desynchronized: true,
  preserveDrawingBuffer: true,
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance',
});
// 実際に効いたか確認
gl.getContextAttributes().desynchronized;
```

`powerPreference: 'high-performance'` は、ラップトップの内蔵GPUではなく専用GPUを使わせるヒントです（toji.dev の WebGPU/WebGL 比較）。指定しないとdGPU搭載機でiGPUに落とされます。[^6_31]

**3. 入力読み取りを描画直前に**

`mousemove` を蓄積して `requestAnimationFrame` の**先頭**でまとめて消費し、その同じフレームでカメラ回転を反映してから描画します。イベント側で直接カメラを動かすと、1フレーム分遅れることがあります。

## GCを1フレームも起こさない

JavaScript製ゲームで「たまにカクつく」原因のほぼ全てがGCです。60FPSなら1フレーム16ms、そこにGCの100ms超の停止が入れば6フレーム飛びます（Construct の低ガベージJS記事）。[^6_28]

目指すのは**通常フレーム中に何も生成しない**状態です。同記事が挙げる具体策:

- `arr = []` ではなく `arr.length = 0`（前者は毎回新配列を作りゴミになる）
- `slice()` / `substr` は新しいオブジェクトを返すので毎フレーム呼ばない
- `{x, y}` のようなベクトルオブジェクトを返さず、`getX()` / `getY()` に分ける
- コールバック関数は起動時に1度だけ作って使い回す
- オブジェクトプール（フリーキャッシュ）を用意する

**cod-web に直接刺さる話**です。以前指摘した `buffer.slice(0, bytes)` を送信ごとに呼んでいる箇所は、20人 × 30Hz で毎秒600個の `ArrayBuffer` を捨てています。`slice` をやめて事前確保した `Uint8Array` のサブビューを使い回すだけで、GC圧が消えます。エンティティも `{x, y, z}` の配列ではなく `Float32Array` の SoA（Structure of Arrays）に寄せるのが定石です（r/gamedev の2000エンティティ実装記録）。[^6_26]

## ネットワーク側の詰め方

cod-web の 100ms 補間バッファは、30Hz送信（33ms間隔）に対しては安全側すぎます。Valve の解説では 20 snapshot/s（50ms間隔）に対して描画時刻を50msずらすのが基本で、これは**1パケットロスまで耐えられる最小値**という考え方です（Source Multiplayer Networking）。[^6_21]

つまり `補間遅延 = パケット間隔 × 2` が出発点です。30Hz なら 66ms。100ms から 66ms に下げるだけで、体感の「他プレイヤーが過去にいる感」が3割減ります。さらに、直近のパケット到着ジッタを測って動的に伸縮させるのが理想です。

Krunker が `updateRate` と `lagComp` をユーザー設定として露出しているのは（settings.txt）、この値に唯一の正解がないからです。回線の良い人は短く、悪い人は長く。**ここもハードコードせず設定にする**。[^6_41]

## OSSとして作るなら

```
必須（これがないと「滑らか」にならない）
  □ 全描画機能のON/OFF設定を最初に設計
  □ 解像度スケール（0.5〜1.0）
  □ ドローコール100未満（マージ＋Instancing）
  □ desynchronized + preserveDrawingBuffer + high-performance
  □ unadjustedMovement のポインタロック
  □ ゲームループ内ゼロアロケーション
  □ 補間遅延 = パケット間隔 × 2、可変

あると差がつく
  □ FPS/ping/ドローコールの常時表示HUD（自分のデバッグ用にもなる）
  □ マップのライトマップベイク
  □ 動的解像度（フレーム時間が閾値を超えたら自動で解像度を下げる）
```

技術選定としては、cod-web の Bun + TypeScript + 自作バイナリプロトコルという土台はそのままで良いと思います。Krunker が独自エンジン＋WASM難読化に走ったのはクローズドソースかつチート対策が死活問題だからで、OSSなら真似する必要がありません。むしろ**サーバ権威をきちんと作り込むこと**が唯一のチート対策になります。Krunker 自身、クライアント側の検査を何層積んでもバイパスされ続けてきた経緯があります（[hrt/AnticheatJS](https://github.com/hrt/AnticheatJS/blob/master/README.md)）。

最後に実務的な注意として、Krunker のマップ・武器モデル・音源・UIアセットは著作物なので、インスパイア元にするのは構いませんがアセットの流用はしないでください。ローポリ路線は自分で描いても再現できます。

もし cod-web に上記を実際に組み込む作業を進めるなら、まずどこから手を付けるか決めましょうか。個人的には「GCゼロ化 → 入力遅延3点 → 描画設定の器を作る」の順が、コード量あたりの体感改善が一番大きいと思います。

<span style="display:none">[^6_10][^6_100][^6_101][^6_102][^6_103][^6_104][^6_105][^6_106][^6_107][^6_108][^6_109][^6_110][^6_111][^6_112][^6_113][^6_114][^6_115][^6_116][^6_117][^6_118][^6_119][^6_12][^6_120][^6_121][^6_122][^6_123][^6_124][^6_125][^6_126][^6_127][^6_128][^6_129][^6_13][^6_130][^6_131][^6_132][^6_133][^6_134][^6_135][^6_136][^6_137][^6_138][^6_139][^6_14][^6_140][^6_15][^6_16][^6_17][^6_2][^6_20][^6_22][^6_23][^6_24][^6_25][^6_27][^6_29][^6_30][^6_32][^6_33][^6_34][^6_35][^6_36][^6_37][^6_38][^6_39][^6_40][^6_42][^6_43][^6_44][^6_45][^6_46][^6_47][^6_48][^6_49][^6_5][^6_50][^6_51][^6_52][^6_53][^6_54][^6_55][^6_56][^6_57][^6_58][^6_59][^6_6][^6_60][^6_61][^6_62][^6_63][^6_64][^6_65][^6_66][^6_67][^6_68][^6_69][^6_70][^6_71][^6_72][^6_73][^6_74][^6_75][^6_76][^6_77][^6_78][^6_79][^6_8][^6_80][^6_81][^6_82][^6_83][^6_84][^6_85][^6_86][^6_87][^6_88][^6_89][^6_9][^6_90][^6_91][^6_92][^6_93][^6_94][^6_95][^6_96][^6_97][^6_98][^6_99]</span>

<div align="center">⁂</div>

[^6_1]: https://www.hontran.dev/blog/three-js-performance-optimization

[^6_2]: https://www.intelligentgraphicandcode.com/development/threejs-interfaces/performance

[^6_3]: https://www.utsubo.com/blog/threejs-best-practices-100-tips

[^6_4]: https://discourse.threejs.org/t/one-draw-call-massive-crowd-performance-engineering-in-three-js/89928

[^6_5]: https://medium.com/@pailhead011/instancing-with-three-js-36b4b62bc127

[^6_6]: https://www.smarter.com/fun/optimize-krunker-io-settings-smoother-performance

[^6_7]: https://www.reddit.com/r/KrunkerIO/comments/eazxfm/performance_tips/

[^6_8]: https://pandafreegames.net/games/webgl-3d-browser-games/

[^6_9]: https://krunker.io/docs/versions.txt

[^6_10]: https://arcadino.com/game/krunker-io/

[^6_11]: https://developer.chrome.com/blog/desynchronized

[^6_12]: https://github.com/whatwg/html/issues/5466

[^6_13]: https://groups.google.com/a/chromium.org/g/blink-dev/c/nxjWgMIeC1Q/m/LyC1sle2BQAJ

[^6_14]: https://github.com/mrdoob/three.js/issues/16684

[^6_15]: https://blog.chromium.org/2019/05/chrome-75-beta-low-latency-canvas.html

[^6_16]: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API

[^6_17]: https://www.testmuai.com/learning-hub/pointer-lock-api-browser-support/

[^6_18]: https://w3c.github.io/pointerlock/

[^6_19]: https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock

[^6_20]: https://app.cinevva.com/tutorials/pointer-lock-fps

[^6_21]: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking

[^6_22]: https://blog.csdn.net/u011643833/article/details/77848012

[^6_23]: https://developer.valvesoftware.com/wiki/Zh/Source_Multiplayer_Networking

[^6_24]: https://developer.valvesoftware.com/wiki/Interpolation

[^6_25]: https://www.reddit.com/r/gamedev/comments/10g3ytt/is_it_common_practice_to_dynamically_change_the/

[^6_26]: https://www.reddit.com/r/gamedev/comments/1rppw1p/devlog_1_running_2k_entities_in_a_js_bullethell/

[^6_27]: https://www.realkaytse.site/blog/designing-interactive-backgrounds

[^6_28]: https://www.construct.net/en/blogs/construct-official-blog-1/write-low-garbage-real-time-761

[^6_29]: https://www.gamedev.net/articles/programming/general-and-gameplay-programming/writing-fast-javascript-for-games-interactive-applications-r3516/

[^6_30]: https://stackoverflow.com/questions/54541311/prevent-javascript-from-releasing-arrays-to-the-garbage-collector

[^6_31]: https://toji.dev/webgpu-best-practices/webgl-performance-comparison.html

[^6_32]: https://react-unity-webgl.dev/docs/api/webgl-rendering-context

[^6_33]: https://www.mysimulator.uk/content/references/webgl-cheatsheet.html

[^6_34]: https://api.playcanvas.com/engine/classes/WebglGraphicsDevice.html

[^6_35]: https://www.cnblogs.com/onsummer/p/webgl-vs-webgpu-2-initialization.html

[^6_36]: https://gafferongames.com/post/snapshot_compression/

[^6_37]: https://gafferongames1.rssing.com/chan-4129531/all_p3.html

[^6_38]: https://beefed.ai/en/replication-strategies-action-multiplayer

[^6_39]: https://github.com/gafferongames/gafferongames/blob/master/content/post/snapshot_interpolation.md

[^6_40]: https://mightyprofessionalgaming.com/tutorials/netcode-from-scratch.html

[^6_41]: https://krunker.io/docs/settings.txt

[^6_42]: https://krunker.io/editor.html

[^6_43]: https://github.com/shiratama644/cod-web

[^6_44]: https://api.github.com/repos/shiratama644/cod-web

[^6_45]: https://api.github.com/repos/shiratama644/cod-web/git/trees/HEAD?recursive=1

[^6_46]: https://bun.com/docs/api/websockets

[^6_47]: https://gamedev.net/forums/topic/700489-using-concurrent-tcpwebsockets-to-mitigate-head-of-line-blocking/

[^6_48]: https://just4programmers.com/websocket-vs-udp-multiplayer/

[^6_49]: https://gafferongames.com/post/why_cant_i_send_udp_packets_from_a_browser/

[^6_50]: https://gamedev.net/forums/topic/709444-can-i-make-websocket-multiplayer-games-for-any-genre/

[^6_51]: https://minhvo.is-a.dev/blogs/webtransport-low-latency-communication-for-games-and-media

[^6_52]: https://en.wikipedia.org/wiki/Nagle's_algorithm

[^6_53]: https://6it.dev/blog/tcp-peculiarities-as-applied-to-games-part-ii-1393

[^6_54]: https://www.speedguide.net/articles/gaming-tweaks-5812

[^6_55]: https://qiita.com/uturned0/items/3ab037d4d2d0500586f5

[^6_56]: https://gitlab.com/Mr_Goldberg/goldberg_emulator/-/issues/209

[^6_57]: https://www.cs.mcgill.ca/~jboula2/thesis.pdf

[^6_58]: https://dev.to/aceld/11-mmo-online-game-aoi-algorithm-l7d

[^6_59]: https://researchonline.ljmu.ac.uk/id/eprint/5111/1/DESE-2016-Accepted.pdf

[^6_60]: https://open.library.ubc.ca/media/stream/pdf/24/1.0051926/2

[^6_61]: https://www.semanticscholar.org/paper/Simulation-of-Area-of-Interest-Management-for-Games-Abdulazeez-Rhalibi/ec8b53abd76aa48c5d0f865e09a4d9a626907386

[^6_62]: https://developer.valvesoftware.com/wiki/Cl_interp_all

[^6_63]: https://jvm-gaming.org/t/entity-interpolation-client-side-prediction-where-to-begin-networking/59507

[^6_64]: https://nicolaschavez.com/projects/xrpg/

[^6_65]: https://developer.valvesoftware.com/wiki/Prediction

[^6_66]: https://www.jfedor.org/quake3/

[^6_67]: https://system-design.space/en/chapter/real-time-gaming-case/

[^6_68]: https://github.com/id-Software/Quake-III-Arena/blob/master/code/server/sv_snapshot.c

[^6_69]: https://fabiensanglard.net/quake3/network.php

[^6_70]: https://fouramgames.com/blog/unity-fps-sample

[^6_71]: https://docs.colyseus.io/room

[^6_72]: https://docs.colyseus.io/scalability

[^6_73]: https://colyseus.io/framework/

[^6_74]: https://docs.colyseus.io/server

[^6_75]: https://0-16-x.docs.colyseus.io/

[^6_76]: https://paper-chan.moe/paper-optimization/

[^6_77]: https://www.reddit.com/r/admincraft/comments/rmfrjo/118_chunk_lag_issues_tps_20/

[^6_78]: https://minecraft.fandom.com/wiki/Tick

[^6_79]: https://www.curseforge.com/minecraft/mc-mods/chunk-sending-forge-fabric

[^6_80]: https://forum.feed-the-beast.com/threads/1-7-10-cauldron-1-8-tick-dynamic-keep-your-server-running-at-20-tps.61903/

[^6_81]: https://greasyfork.org/en/scripts/575760-bloxd-io-killaura/code

[^6_82]: https://www.linkedin.com/company/bloxd

[^6_83]: https://www.similarweb.com/website/bloxd.io/

[^6_84]: https://www.bloxdforge.com/studio/wiki/guides/coding-guide

[^6_85]: https://bloxd-io.fandom.com/wiki/Code_Block

[^6_86]: https://bloxd.io/

[^6_87]: https://bloxd-io.fandom.com/wiki/Arthur_Baker

[^6_88]: https://news.viverse.com/post/bloxd-io-free-browser-game-on-viverse

[^6_89]: https://londonissue.co.uk/2025/06/12/bloxd-founder-arthur-baker-discusses-uk-gaming-industry-with-andy-ross-from-studio-vision-podcast/

[^6_90]: https://deepwiki.com/delfineonx/bloxd-codex

[^6_91]: https://github.com/Bloxdy

[^6_92]: https://www.crazygames.com/game/bloxdhop-io

[^6_93]: https://insanepowertrip.github.io/bloxdocs/bloxdocs.html

[^6_94]: https://deepwiki.com/bloxdy/code-api

[^6_95]: https://bloxd-io.fandom.com/wiki/FAQs

[^6_96]: https://www.reddit.com/r/bloxd/comments/1isc81c/need_help_to_set_up_a_proper_server/

[^6_97]: https://docsbot.ai/prompts/programming/bloxd-io-rtp-code

[^6_98]: https://www.youtube.com/watch?v=aNlXd7WuMgg

[^6_99]: https://www.youtube.com/watch?v=m8jSxCQPqtQ

[^6_100]: https://www.youtube.com/watch?v=LZ6pvERwb7o

[^6_101]: https://creators.spotify.com/pod/profile/andyrosspodcast/episodes/Arthur-Baker---Founder---Bloxd-e33fim7/bloxd.io

[^6_102]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients

[^6_103]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks/blob/main/Blackhole Client

[^6_104]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients?action=history

[^6_105]: https://bloxd.io/terms-of-service

[^6_106]: https://www.scribd.com/document/927502362/Message

[^6_107]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks

[^6_108]: https://bloxd-io.fandom.com/wiki/Versions

[^6_109]: https://webgamer.io/it/g/bloxd-io

[^6_110]: https://webgamer.io/vn/g/bloxd-io

[^6_111]: https://codepen.io/aditikchauhan/pen/KwKyzmK

[^6_112]: https://github.com/fenomas/noa

[^6_113]: https://github.com/websockets/ws

[^6_114]: https://docs.bloxroute.com/eth/streams/blocks-streams/newblock-stream

[^6_115]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

[^6_116]: https://docs.bloxroute.com/bsc-and-eth/streams/working-with-streams/creating-a-subscription/websocket

[^6_117]: https://bloxd-io.fandom.com/wiki/Unblocked_Domains

[^6_118]: https://www.reddit.com/r/bloxd/comments/1apri8x/bloxdio_not_working_why/

[^6_119]: https://bloxd-io.fandom.com/wiki/Errors

[^6_120]: https://websockets.readthedocs.io/en/stable/topics/proxies.html

[^6_121]: https://forum.babylonjs.com/t/nullengine-multiplayer-tutorial/1696

[^6_122]: https://www.docs.o3de.org/docs/user-guide/networking/multiplayer/

[^6_123]: https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html

[^6_124]: https://github.com/FlaxEngine/NetworkSample

[^6_125]: https://www.reddit.com/r/bloxd/comments/1bud0ly/any_reason_why_bloxd_is_laggy/

[^6_126]: https://betterroblox.com/answers/how-to-lower-ping-in-roblox

[^6_127]: https://devforum.roblox.com/t/server-region-prioritization-in-access-settings-for-lower-ping/3149268

[^6_128]: https://www.reddit.com/r/RobloxHelp/comments/1dl5g0v/how_do_i_pick_a_server_region_to_decrease_ping/

[^6_129]: https://www.ip-tracker.org/lookup.php?ip=Bloxd.io

[^6_130]: https://webrate.org/site/bloxd.io/

[^6_131]: https://scanner.pcrisk.com/scan-results/miniplay.com

[^6_132]: https://gist.github.com/garyblankenship/27a4c57eca4aa5d659ee3c509668b66d

[^6_133]: https://www.cloudflare.com/developer-platform/use-cases/hosting/

[^6_134]: https://www.similarweb.com/technology/

[^6_135]: https://www.similarweb.com/website/bloxd.io/competitors/

[^6_136]: https://endsights.com/roblox-creating-responsive-cheat-resistant-games-with-server-authority

[^6_137]: https://www.reddit.com/r/ROBLOXStudio/comments/1o6htu4/cheaters_beware_robloxs_native_anticheat_server/

[^6_138]: https://devforum.roblox.com/t/sync-server-authoritive-movement-anticheat-alpha/4027591

[^6_139]: https://create.roblox.com/docs/scripting/security/security-tactics

[^6_140]: https://gamineai.com/courses/multiplayer-battle-royale/lessons/lesson-13-anti-cheat-systems-security


---

## 結論から言うと、半分賛成

「自作エンジン」という言葉が2つの全く違う意味を含んでいるので、そこを分けたほうがいいです。

- **レンダラ（WebGLラッパー、シーングラフ、マテリアル、シャドウ）を書く** → 正直やめたほうがいい
- **プラットフォーム層（ハブ、ルーム管理、ネットコード、ゲームモードAPI）を書く** → これは自作以外に選択肢がない

あなたが作りたいものの価値は完全に後者にあります。そして重要なのは、**インスパイア元の2つとも前者を作っていない**ことです。

## 先行例が作らなかったもの

bloxd.io は Arthur Baker が Noa という実験的ボクセルエンジンの上に構築していて、Noa 自体は描画を Babylon.js に丸投げしています。Babylon は peer dependency として参照されているだけです（fenomas/noa、noa-examples の README）。同じ Noa 上に Mojang の Minecraft Classic も載っています。[^7_21][^7_25]

Krunker も同様で、シーン描画は Three.js、それ以外だけが独自の「Krunker Engine」だと開発側が明言しています（[r/KrunkerIO のエンジン質問スレッド](https://www.reddit.com/r/KrunkerIO/comments/13wh4q8/does_anyone_know_with_what_the_3d_game_engine_the/)）。

つまり両者とも、**描画は既製品、その上の「複数のゲームを載せる仕組み」だけを自作**しています。これは偶然ではなく、そこが差別化ポイントだからです。

## 作る／借りるの線引き

| 層 | 判断 | 理由 |
| :-- | :-- | :-- |
| WebGLレンダラ、シーングラフ | 借りる | Three.js か Babylon.js。ここを自作しても誰も得しない |
| 物理・当たり判定 | 自作（薄く） | ネットコードと決定論を共有する必要がある。既製の物理エンジンは決定論的でないことが多い |
| ECS / 固定タイムステップ | 自作（薄く） | cod-web の `shared/sim/movement.ts` が既にこれ |
| ネットコード（プロトコル、予測、補間、AOI） | 自作 | 既にある。ここは資産 |
| ハブ・マッチメイカー・ルーム寿命管理 | **自作** | ここが製品そのもの |
| ゲームモードAPI | **自作** | ここが一番難しく、一番価値がある |

「自作エンジン」と呼ぶべきなのは下3つです。Three.js を使うことは自作エンジンであることと矛盾しません。

## ハブとルームの構成

Krunker のマッチメイカーがそのまま参考になります。実際に叩けるので構造が見えます（[matchmaker.krunker.io/game-list](https://matchmaker.krunker.io/game-list?hostname=krunker.io)）。

```
[ブラウザ] ──HTTP──> [マッチメイカー]  ステートレス、Cloudflare配下
                          │  GET /game-list        → 全ルーム一覧
                          │  POST /seek-game       → 入室チケット発行
                          ▼
                     [Redis / KV]  ルーム台帳
                          ▲
                          │ 定期ハートビート（自ノードのルーム一覧を登録）
[ゲームノード] × N ───────┘   東京 / フランクフルト / ...
     └ 1プロセス = 1CPUコア
        └ Room × M （各ルームが独立したtickループを持つ）

[ブラウザ] ──WSS──> 割り当てられたゲームノードへ直接接続
```

ポイントが3つあります。

**1. マッチメイカーはゲームサーバではない**

ルーム一覧の閲覧は完全にステートレスなHTTPで、CDNキャッシュも効きます。ハブ画面が何千人に見られてもゲームサーバには一切負荷がかかりません。

**2. 入室チケット**

Krunker の `seek-game` は `validationToken` を返し、これがないとWS接続が通りません。Colyseus では同じ概念を「seat reservation（座席予約）」と呼んでいて、マッチメイカーが席を確保してからクライアントが接続します（Colyseus のマッチメイカーAPI）。**満室のルームに同時に10人が押し寄せる競合**を防ぐために必須です。cod-web のように直接WSに繋ぐ設計だと、ここで必ず破綻します。[^7_4]

**3. ノードとルームの分離**

Colyseus はスケール時に `driver`（ルーム台帳のストレージ）と `presence`（プロセス間通信）を分離する構成を取ります（Colyseus のスケーラビリティ解説）。この2つを Redis にすれば、ゲームノードは何台でも増やせます。[^7_1]

Bun での実装は素直です。`Bun.serve()` の `reusePort` オプションで1つのポートを複数プロセスで共有し、CPUコア数だけプロセスを起動できます（Bun のクラスタガイド）。Worker API もありますが、まだ実験的（特に終了処理）と明記されているので、当面はプロセス分割のほうが安全です（Bun の Workers ドキュメント）。[^7_12][^7_14]

将来的に本格運用するなら Agones のような Kubernetes ベースのゲームサーバ割り当て基盤もありますが（Agones の Fleet 仕様）、最初は完全にオーバーキルです。[^7_6]

## 本当の難所はゲームモードAPI

ここが「エンジンを作る」の実体です。そして最大の設計判断は**誰がゲームを書くのか**。

bloxd.io は、ユーザーが書いたコードをサーバ側で実行する方式です。DOMなし、外部ネットワークアクセスなし、16,000文字制限という強いサンドボックスがかかっています（bloxdforge のコーディングガイド）。[^7_72]

Krunker の KrunkScript は、クライアント実行とサーバ実行のコンテキストを明示的に分け、スコア・体力・所有権はサーバ権威です。通信は `GAME.NETWORK.send()` / `broadcast()` に限定され、メッセージID10文字・データ2000B・broadcast 10msg/s といった上限が仕様として公開されています（[KrunkScript の NETWORK API](https://docs.krunker.io/api/network)）。

**推奨する進め方**は、最初は素の TypeScript モジュールとして書き、ただし**インターフェースだけは後でサンドボックス化できる形にしておく**ことです。

```ts
// gamemodes/bedwars/index.ts
export default defineGameMode({
  id: 'bedwars',
  displayName: 'ベッドウォーズ',
  maxPlayers: 16,
  tickRate: 20,

  onRoomCreate(ctx) { /* ... */ },
  onPlayerJoin(ctx, player) { /* ... */ },
  onTick(ctx, dt) { /* ... */ },
  onPlayerDamage(ctx, victim, attacker, amount) { /* ... */ },
});
```

守るべき制約は次の3つです。

- ゲームモードは `ctx` 以外からエンジン内部に触れない（グローバル参照禁止）
- 外部 import 禁止、I/O 禁止
- エンジンとのやり取りは全てメッセージまたは `ctx` 経由

この規律を最初から守っていれば、後で QuickJS の WASM サンドボックスに載せ替えるのはほぼ機械的な作業になります（sebastianwessel/quickjs。Bun でも動作します）。逆に、最初に自由に書かせてしまうと UGC 対応は永遠に不可能になります。[^7_16]

## 一番踏みやすい地雷

**パラダイムの異なるゲームを1つのエンジンに混ぜること**です。

bloxd.io の全モードはボクセル世界の派生、Krunker の全モードは同じFPS移動の派生で、どちらも**移動と物理は完全に共通**です。これは手抜きではなく、そうしないと予測・巻き戻し・補間が全部モードごとに再実装になるからです。

なので「ハブから色んなゲーム」の"色んな"は、**ルールと勝利条件とオブジェクトの違い**であって、**移動モデルの違いではない**、と最初に決めてください。ボクセル建築とFPS射撃を混ぜたいなら、`stepPlayer` に「ブロック設置/破壊できるFPS移動」という単一のモデルを作り、全モードがそれを共有する形にします。

## 現実的なマイルストーン

```
1. cod-web の Room を「複数生成できるもの」にする（設定を引数に）
2. ゲームモードAPIのインターフェースを1本だけ定義し、既存のFFAを移植
3. マッチメイカーを別プロセスで作る（/game-list と /seek-game）
4. ハブUI（ルーム一覧、フィルタ、参加ボタン）
5. 2つ目のゲームモードを追加 ← ここでAPIの設計ミスが全部露見する
6. APIを直す（必ず1回は作り直しになる）
7. マルチノード対応（Redis台帳 + ハートビート）
8. UGC対応（サンドボックス）※やるなら
```

**5番が最重要**です。2つ目のモードを作るまで、ゲームモードAPIが正しいかどうかは絶対に分かりません。なので1つ目のモードは可能な限り雑に作って、早く2つ目に到達してください。

ひとつ設計を進める上で決めておきたいことがあるので、確認させてください。

<span style="display:none">[^7_10][^7_100][^7_101][^7_102][^7_103][^7_104][^7_105][^7_106][^7_107][^7_108][^7_109][^7_11][^7_110][^7_111][^7_112][^7_113][^7_114][^7_115][^7_116][^7_117][^7_118][^7_119][^7_120][^7_121][^7_122][^7_123][^7_124][^7_125][^7_126][^7_127][^7_13][^7_15][^7_17][^7_18][^7_19][^7_2][^7_20][^7_22][^7_23][^7_24][^7_26][^7_27][^7_28][^7_29][^7_3][^7_30][^7_31][^7_32][^7_33][^7_34][^7_35][^7_36][^7_37][^7_38][^7_39][^7_40][^7_41][^7_42][^7_43][^7_44][^7_45][^7_46][^7_47][^7_48][^7_49][^7_5][^7_50][^7_51][^7_52][^7_53][^7_54][^7_55][^7_56][^7_57][^7_58][^7_59][^7_60][^7_61][^7_62][^7_63][^7_64][^7_65][^7_66][^7_67][^7_68][^7_69][^7_7][^7_70][^7_71][^7_73][^7_74][^7_75][^7_76][^7_77][^7_78][^7_79][^7_8][^7_80][^7_81][^7_82][^7_83][^7_84][^7_85][^7_86][^7_87][^7_88][^7_89][^7_9][^7_90][^7_91][^7_92][^7_93][^7_94][^7_95][^7_96][^7_97][^7_98][^7_99]</span>

<div align="center">⁂</div>

[^7_1]: https://docs.colyseus.io/scalability

[^7_2]: https://docs.colyseus.io/deployment/scalability

[^7_3]: https://0-15-x.docs.colyseus.io/server/

[^7_4]: https://docs.colyseus.io/matchmaker

[^7_5]: https://docs.colyseus.io/room

[^7_6]: https://agones.dev/site/docs/reference/fleet/

[^7_7]: https://agones.dev/site/docs/reference/gameserverallocation/

[^7_8]: https://agones.dev/site/docs/reference/agones_crd_api_reference/

[^7_9]: https://agones.dev/site/docs/getting-started/create-fleet/

[^7_10]: https://agones.dev/site/docs/guides/fleet-updates/

[^7_11]: https://bun.com/blog/bun-v1.4

[^7_12]: https://bun.com/docs/runtime/workers

[^7_13]: https://bun.com/reference/node/worker_threads

[^7_14]: https://bun.com/guides/http/cluster

[^7_15]: https://elysiajs.com/patterns/deploy

[^7_16]: https://github.com/sebastianwessel/quickjs

[^7_17]: https://jsr.io/@sebastianwessel/quickjs

[^7_18]: https://www.langchain.com/blog/running-untrusted-agent-code-without-a-sandbox

[^7_19]: https://news.ycombinator.com/item?id=40896873

[^7_20]: https://github.com/only-cliches/quickjs-worker

[^7_21]: https://github.com/fenomas/noa

[^7_22]: https://github.com/study-game-engines/noa

[^7_23]: https://forum.babylonjs.com/t/fastest-physics-engine/5772

[^7_24]: https://github.com/study-game-engines/noa-examples/blob/master/README.md

[^7_25]: https://github.com/fenomas/noa-examples

[^7_26]: https://beyond-sandbox.gitbook.io/realitysdk

[^7_27]: https://shapes.inc/bloxdworldcoder

[^7_28]: https://www.sandbox.game/en/blog/introducing-the-sandbox-game-maker-011-update-the-next-evolution-of-user-generated-content-in-the-sandbox/3432/

[^7_29]: https://serialized.net/2020/09/multiplayer/

[^7_30]: https://docs.mod.io/cppsdk

[^7_31]: https://krunker.io/docs/settings.txt

[^7_32]: https://krunker.io/editor.html

[^7_33]: https://github.com/shiratama644/cod-web

[^7_34]: https://api.github.com/repos/shiratama644/cod-web

[^7_35]: https://api.github.com/repos/shiratama644/cod-web/git/trees/HEAD?recursive=1

[^7_36]: https://bun.com/docs/api/websockets

[^7_37]: https://gamedev.net/forums/topic/700489-using-concurrent-tcpwebsockets-to-mitigate-head-of-line-blocking/

[^7_38]: https://just4programmers.com/websocket-vs-udp-multiplayer/

[^7_39]: https://gafferongames.com/post/why_cant_i_send_udp_packets_from_a_browser/

[^7_40]: https://gamedev.net/forums/topic/709444-can-i-make-websocket-multiplayer-games-for-any-genre/

[^7_41]: https://minhvo.is-a.dev/blogs/webtransport-low-latency-communication-for-games-and-media

[^7_42]: https://en.wikipedia.org/wiki/Nagle's_algorithm

[^7_43]: https://6it.dev/blog/tcp-peculiarities-as-applied-to-games-part-ii-1393

[^7_44]: https://www.speedguide.net/articles/gaming-tweaks-5812

[^7_45]: https://qiita.com/uturned0/items/3ab037d4d2d0500586f5

[^7_46]: https://gitlab.com/Mr_Goldberg/goldberg_emulator/-/issues/209

[^7_47]: https://www.cs.mcgill.ca/~jboula2/thesis.pdf

[^7_48]: https://dev.to/aceld/11-mmo-online-game-aoi-algorithm-l7d

[^7_49]: https://researchonline.ljmu.ac.uk/id/eprint/5111/1/DESE-2016-Accepted.pdf

[^7_50]: https://open.library.ubc.ca/media/stream/pdf/24/1.0051926/2

[^7_51]: https://www.semanticscholar.org/paper/Simulation-of-Area-of-Interest-Management-for-Games-Abdulazeez-Rhalibi/ec8b53abd76aa48c5d0f865e09a4d9a626907386

[^7_52]: https://developer.valvesoftware.com/wiki/Cl_interp_all

[^7_53]: https://jvm-gaming.org/t/entity-interpolation-client-side-prediction-where-to-begin-networking/59507

[^7_54]: https://nicolaschavez.com/projects/xrpg/

[^7_55]: https://developer.valvesoftware.com/wiki/Prediction

[^7_56]: https://www.jfedor.org/quake3/

[^7_57]: https://system-design.space/en/chapter/real-time-gaming-case/

[^7_58]: https://github.com/id-Software/Quake-III-Arena/blob/master/code/server/sv_snapshot.c

[^7_59]: https://fabiensanglard.net/quake3/network.php

[^7_60]: https://fouramgames.com/blog/unity-fps-sample

[^7_61]: https://colyseus.io/framework/

[^7_62]: https://docs.colyseus.io/server

[^7_63]: https://0-16-x.docs.colyseus.io/

[^7_64]: https://paper-chan.moe/paper-optimization/

[^7_65]: https://www.reddit.com/r/admincraft/comments/rmfrjo/118_chunk_lag_issues_tps_20/

[^7_66]: https://minecraft.fandom.com/wiki/Tick

[^7_67]: https://www.curseforge.com/minecraft/mc-mods/chunk-sending-forge-fabric

[^7_68]: https://forum.feed-the-beast.com/threads/1-7-10-cauldron-1-8-tick-dynamic-keep-your-server-running-at-20-tps.61903/

[^7_69]: https://greasyfork.org/en/scripts/575760-bloxd-io-killaura/code

[^7_70]: https://www.linkedin.com/company/bloxd

[^7_71]: https://www.similarweb.com/website/bloxd.io/

[^7_72]: https://www.bloxdforge.com/studio/wiki/guides/coding-guide

[^7_73]: https://bloxd-io.fandom.com/wiki/Code_Block

[^7_74]: https://bloxd.io/

[^7_75]: https://bloxd-io.fandom.com/wiki/Arthur_Baker

[^7_76]: https://news.viverse.com/post/bloxd-io-free-browser-game-on-viverse

[^7_77]: https://londonissue.co.uk/2025/06/12/bloxd-founder-arthur-baker-discusses-uk-gaming-industry-with-andy-ross-from-studio-vision-podcast/

[^7_78]: https://deepwiki.com/delfineonx/bloxd-codex

[^7_79]: https://github.com/Bloxdy

[^7_80]: https://www.crazygames.com/game/bloxdhop-io

[^7_81]: https://insanepowertrip.github.io/bloxdocs/bloxdocs.html

[^7_82]: https://deepwiki.com/bloxdy/code-api

[^7_83]: https://bloxd-io.fandom.com/wiki/FAQs

[^7_84]: https://www.reddit.com/r/bloxd/comments/1isc81c/need_help_to_set_up_a_proper_server/

[^7_85]: https://docsbot.ai/prompts/programming/bloxd-io-rtp-code

[^7_86]: https://www.youtube.com/watch?v=aNlXd7WuMgg

[^7_87]: https://www.youtube.com/watch?v=m8jSxCQPqtQ

[^7_88]: https://www.youtube.com/watch?v=LZ6pvERwb7o

[^7_89]: https://creators.spotify.com/pod/profile/andyrosspodcast/episodes/Arthur-Baker---Founder---Bloxd-e33fim7/bloxd.io

[^7_90]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients

[^7_91]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks/blob/main/Blackhole Client

[^7_92]: https://bloxd-io-fan.fandom.com/wiki/Hacking_Clients?action=history

[^7_93]: https://bloxd.io/terms-of-service

[^7_94]: https://www.scribd.com/document/927502362/Message

[^7_95]: https://github.com/HoaxCheatsNetwork/Bloxd.io-Hacks

[^7_96]: https://bloxd-io.fandom.com/wiki/Versions

[^7_97]: https://webgamer.io/it/g/bloxd-io

[^7_98]: https://webgamer.io/vn/g/bloxd-io

[^7_99]: https://codepen.io/aditikchauhan/pen/KwKyzmK

[^7_100]: https://github.com/websockets/ws

[^7_101]: https://docs.bloxroute.com/eth/streams/blocks-streams/newblock-stream

[^7_102]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

[^7_103]: https://docs.bloxroute.com/bsc-and-eth/streams/working-with-streams/creating-a-subscription/websocket

[^7_104]: https://bloxd-io.fandom.com/wiki/Unblocked_Domains

[^7_105]: https://www.reddit.com/r/bloxd/comments/1apri8x/bloxdio_not_working_why/

[^7_106]: https://bloxd-io.fandom.com/wiki/Errors

[^7_107]: https://websockets.readthedocs.io/en/stable/topics/proxies.html

[^7_108]: https://forum.babylonjs.com/t/nullengine-multiplayer-tutorial/1696

[^7_109]: https://www.docs.o3de.org/docs/user-guide/networking/multiplayer/

[^7_110]: https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html

[^7_111]: https://github.com/FlaxEngine/NetworkSample

[^7_112]: https://www.reddit.com/r/bloxd/comments/1bud0ly/any_reason_why_bloxd_is_laggy/

[^7_113]: https://betterroblox.com/answers/how-to-lower-ping-in-roblox

[^7_114]: https://devforum.roblox.com/t/server-region-prioritization-in-access-settings-for-lower-ping/3149268

[^7_115]: https://www.reddit.com/r/RobloxHelp/comments/1dl5g0v/how_do_i_pick_a_server_region_to_decrease_ping/

[^7_116]: https://www.ip-tracker.org/lookup.php?ip=Bloxd.io

[^7_117]: https://webrate.org/site/bloxd.io/

[^7_118]: https://scanner.pcrisk.com/scan-results/miniplay.com

[^7_119]: https://gist.github.com/garyblankenship/27a4c57eca4aa5d659ee3c509668b66d

[^7_120]: https://www.cloudflare.com/developer-platform/use-cases/hosting/

[^7_121]: https://www.similarweb.com/technology/

[^7_122]: https://www.similarweb.com/website/bloxd.io/competitors/

[^7_123]: https://endsights.com/roblox-creating-responsive-cheat-resistant-games-with-server-authority

[^7_124]: https://www.reddit.com/r/ROBLOXStudio/comments/1o6htu4/cheaters_beware_robloxs_native_anticheat_server/

[^7_125]: https://devforum.roblox.com/t/sync-server-authoritive-movement-anticheat-alpha/4027591

[^7_126]: https://create.roblox.com/docs/scripting/security/security-tactics

[^7_127]: https://gamineai.com/courses/multiplayer-battle-royale/lessons/lesson-13-anti-cheat-systems-security


---

# ゲームモード（ルームの中身）は誰が作る想定ですか？: 将来的にユーザーにも作らせたい

ゲームモード間で共有する移動・物理モデルはどれにしますか？: ボクセル＋FPS移動の統合（bloxd寄り）
レンダリングは何を使いますか？: Babylon.js

選択に沿って設計書をまとめました。リポジトリに `ARCHITECTURE.md` として置ける形にしてあります。

## 特に重要な3点

**1. cod-web は React Three Fiber だった**

`package.json` を確認したところ、`@react-three/fiber` 9.7 / `three` 0.185 / `three-mesh-bvh` を使っています。Babylon.js への移行は `src/game/scene/*` と `src/game/renderer/*` の全破棄を意味します。

ただし **`shared/protocol/*`、`src/game/net/*`、`server/*` は無傷で持ち込めます**。予測・巻き戻し・補間・トランスポート抽象はレンダラ非依存なので、一番苦労した部分は捨てずに済みます。

なお、R3F を捨てるのは損失ではありません。ボクセル世界はチャンクメッシュが常時生成・破棄されるので、React の再調整を通すのは純粋なオーバーヘッドです。Babylon の命令的APIならこの問題が構造的に起きません。React は HUD とハブUI に限定します。

**2. voxel-physics-engine はサーバでも動く**

これが今回の調査で一番大きな発見でした。この物理エンジンが必要とするのは `(x,y,z) => boolean` という抽象関数だけで、Babylon にも DOM にも依存しません（fenomas/voxel-physics-engine）。つまり **Bun サーバ上で同じコードを実行できる**ので、cod-web の「クライアント・サーバ共有シミュレーション」構造をボクセルでもそのまま維持できます。[^8_2]

一方で制約もあります。剛体同士の衝突は非対応（剛体 対 固体ボクセルのみ）なので、**プレイヤー同士がすり抜けます**。FPSとして許容するか自前でAABB押し出しを足すか、フェーズ2で決める必要があります。

**3. Noa にはネットワーク機能が一切ない**

bloxd.io も CityCraft.io も VoxelSrv も、全員ネットコードは自前です（fenomas/noa）。Noa は「ローカルのボクセル世界＋描画＋物理」までしか面倒を見ません。[^8_1]

そのため `manuallyControlChunkLoading: true` が初日から必須になります。これを有効にしないと Noa がクライアント側で勝手に地形生成してしまい、サーバ権威が成立しません。

## UGC を選んだことの影響

いま TypeScript 直 import で書いても構いませんが、**5つの規律を初日から守る**必要があります。`ctx` 以外に触らない、import 禁止、I/O 禁止、例外ではなく戻り値で失敗を返す、`async` 禁止。これさえ守れば、後で QuickJS の WASM サンドボックス（[sebastianwessel/quickjs](https://github.com/sebastianwessel/quickjs)、Bun対応）へ載せ替えるのは機械的作業になります。

具体的には `PlayerRef` を全て `readonly` にして、変更は `ctx.setHealth(p, hp)` のように必ず `ctx` 経由にします。サンドボックス化すると `PlayerRef` は境界を越えてコピーされる値になるため、直接代入は原理的に反映されません。最初からその制約下で書いておくと移行コストがゼロです。

## 進め方

設計書ではフェーズ0〜8に分けましたが、**フェーズ5（2つ目のゲームモードを作る）が最重要**です。ゲームモードAPIが正しいかどうかは、2つ目を作るまで原理的に分かりません。なので1つ目のFFAは可能な限り雑に作って、早くそこに到達してください。フェーズ6で1回作り直すのは予定に入れてあります。

そしてフェーズ0（入力パケットの長さ検証、バックプレッシャ修正など）は、Babylon移行より先にやってください。1〜2日で終わりますし、後回しにすると必ず戻ってくる部分です。

次はフェーズ0の具体的なパッチを書きましょうか。それともフェーズ1のBabylon移行の骨組みから始めますか。

<span style="display:none">[^8_3][^8_4]</span>

<div align="center">⁂</div>

[^8_1]: https://github.com/fenomas/noa

[^8_2]: https://github.com/fenomas/voxel-physics-engine

[^8_3]: https://github.com/fenomas/noa-examples

[^8_4]: https://github.com/fenomas/ent-comp


---

# えっとこれからは別のAIで作業をするので、設計書をより深くしてください。また、ボクセルFPSですが、ハブからType: boxel, fpsの2種類のタイプがありboxelならBloxd.ioでfpsならKrunker.ioのように全く異なるタイプのゲームが混在することが可能にしてほしいです。ハブにゲームが2つしかないわけではなく種類が2種類ということです。

設計書を更新しました。トランスポート方針を「現在は WebSocket のみ、将来 WebTransport 対応」という形で明文化してあります。

## 追記した内容

新設した §5.8「トランスポート方針とロードマップ」が中心です。

- **5.8.1 現在の方針** — WebSocket（TCP）のみ。UDP / WebRTC DataChannel / geckos.io / WebTransport はすべて「今は使わない」と表にして明示。実装AIがトランスポートの再検討を勝手に始めないよう「議論を始めないこと」と指示を入れました
- **5.8.2 TCP の弱点をアプリ層で緩和** — HOLブロッキング対策（断片化・送信優先度・`perMessageDeflate: false`・`ws.send()` の戻り値監視・`ws.cork()`・補間遅延）を対策表に整理
- **5.8.3 将来移行を前提とした備え** — `NetTransport` インターフェースの完全なコードと `Channel` enum（Reliable / Unreliable / Bulk）を掲載。WebSocket 実装では Channel は実質何もしませんが、移行時に「Reliable→双方向ストリーム、Unreliable→Datagram、Bulk→単方向ストリーム」の機械的な対応付けだけで済むように今から守らせます。加えて `seq` 欠落検出（現在はデッドコードだが必ず書く）、QUIC Datagram の 1200 バイト方針、`Hello` パケットに認証を寄せる（Cookie / ヘッダ / URL に載せない）ことを規定
- **5.8.4 移行の判断条件** — 3条件すべて充足時のみ着手。特に「実測で TCP 再送起因の遅延スパイクが主要ボトルネックと特定されている」ことを必須にし、AOI もデルタ圧縮も未実装の段階で UDP に逃げるのは誤りだと明記
- **§0.1 に絶対ルール6を追加**、**ADR-005 を書き換え**（WebSocket 実装は移行後も永久に削除しない、フォールバックが恒久的に必須）、**フェーズ9を新設**（条件付き・時期未定、改善が確認できなければ撤退する完了条件付き）

根拠は Bun v1.3.14 のリリースノート（HTTP/3 は Highly experimental、WebSocket over HTTP/3 は未対応で `server.upgrade()` が `false`、WebTransport は別プロジェクト）と Bun の WebSocket ドキュメント（`send()` の戻り値 `-1` / `0` の意味）です。[^9_11][^9_17]

<span style="display:none">[^9_1][^9_10][^9_12][^9_13][^9_14][^9_15][^9_16][^9_18][^9_19][^9_2][^9_20][^9_21][^9_22][^9_23][^9_24][^9_25][^9_26][^9_27][^9_28][^9_29][^9_3][^9_30][^9_31][^9_32][^9_33][^9_34][^9_35][^9_36][^9_37][^9_38][^9_39][^9_4][^9_40][^9_41][^9_42][^9_43][^9_44][^9_5][^9_6][^9_7][^9_8][^9_9]</span>

<div align="center">⁂</div>

[^9_1]: https://forum.babylonjs.com/t/understanding-instances-draw-calls/23232

[^9_2]: https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances

[^9_3]: https://forum.babylonjs.com/t/more-objects-more-draw-calls-more-performance-loss/36009

[^9_4]: https://forum.babylonjs.com/t/mesh-with-thin-instance-slower-than-with-full-vertices/46756

[^9_5]: https://forum.babylonjs.com/t/rendering-performance-issues/43140

[^9_6]: https://doc.babylonjs.com/features/featuresDeepDive/mesh/mergeMeshes

[^9_7]: https://forum.babylonjs.com/t/best-practices-for-optimizing-babylon-js-scenes-not-just-on-lower-end-devices/58688

[^9_8]: https://doc.babylonjs.com/typedoc/classes/BABYLON.Mesh

[^9_9]: https://forum.babylonjs.com/t/fps-drops-dramatically-when-having-large-amount-of-meshes-instancing-is-not-suitable-for-this-case/47139

[^9_10]: https://blog.raananweber.com/2015/09/03/scene-optimization-in-babylon-js/

[^9_11]: https://bun.com/docs/runtime/http/websockets

[^9_12]: https://bun.com/reference/bun/ServerWebSocket

[^9_13]: https://bun.com/guides/websocket/pubsub

[^9_14]: https://bun.com/docs/guides/websocket/pubsub

[^9_15]: https://bun.com/reference/bun/WebSocketHandler

[^9_16]: https://github.com/oven-sh/bun/issues/13656

[^9_17]: https://bun.com/blog/bun-v1.3.14

[^9_18]: https://bun.com/docs/runtime/http/server

[^9_19]: https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API

[^9_20]: https://developer.mozilla.org/en-US/docs/Web/API/WebTransport

[^9_21]: https://doc.babylonjs.com/typedoc/classes/BABYLON.GLTFFileLoader

[^9_22]: https://doc.babylonjs.com/typedoc/classes/BABYLON.GLTFLoaderOptions

[^9_23]: https://doc.babylonjs.com/features/featuresDeepDive/crowdNavigation/createNavMesh/

[^9_24]: https://forum.babylonjs.com/t/i-have-a-lot-of-gltf-models-after-loading-fps-is-very-low-only-3fps-how-to-tune/21438

[^9_25]: https://doc.babylonjs.com/typedoc/classes/BABYLON.GLTF2.GLTFLoader

[^9_26]: https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene

[^9_27]: https://forum.babylonjs.com/t/performance-what-is-eating-up-frametime-in-this-scene-with-only-simple-3d-hexagon-meshes/25196

[^9_28]: https://forum.babylonjs.com/t/how-to-optimize-a-scene-with-10k-mesh-instances/8634/4

[^9_29]: https://forum.babylonjs.com/t/how-to-optimize-a-scene-with-10k-mesh-instances/8634

[^9_30]: https://forum.babylonjs.com/t/how-and-when-to-use-mesh-freezeworldmatrix/13906/9

[^9_31]: https://github.com/vitejs/vite/discussions/17730

[^9_32]: https://quasar.dev/quasar-cli-vite/lazy-loading/

[^9_33]: https://github.com/vitejs/vite/discussions/17730\&rut=2bdb21cf12c06ec2b574248bf32a27881a52c503188ed75595d726b67f7104a8

[^9_34]: https://medium.com/@akashsdas_dev/code-splitting-in-react-w-vite-eae8a9c39f6e

[^9_35]: https://github.com/vitejs/vite/discussions/8617

[^9_36]: https://doc.babylonjs.com/features/featuresDeepDive/physics/characterController/

[^9_37]: https://babylonjs.medium.com/character-controller-with-physics-v2-1df5d8b0d244

[^9_38]: https://www.abratabia.com/babylonjs/physics-with-havok.php

[^9_39]: https://forum.babylonjs.com/t/character-controller-and-havok-collisions/42083

[^9_40]: https://forum.babylonjs.com/t/havok-first-person-controller-with-jumping-and-ramps/52945

[^9_41]: https://github.com/fenomas/noa

[^9_42]: https://github.com/fenomas/voxel-physics-engine

[^9_43]: https://github.com/fenomas/noa-examples

[^9_44]: https://github.com/fenomas/ent-comp


---

# テストファイルは全く同じディレクトリ構造の_tests_フォルダにいれるようにしてください。またそれが完了次第、完全なドキュメントのレビューをしてください。

<span style="display:none">[^10_1][^10_10][^10_11][^10_12][^10_13][^10_14][^10_15][^10_16][^10_17][^10_18][^10_19][^10_2][^10_20][^10_21][^10_22][^10_23][^10_24][^10_25][^10_26][^10_27][^10_28][^10_29][^10_3][^10_30][^10_31][^10_32][^10_33][^10_34][^10_35][^10_36][^10_37][^10_38][^10_39][^10_4][^10_40][^10_41][^10_42][^10_43][^10_44][^10_5][^10_6][^10_7][^10_8][^10_9]</span>

<div align="center">⁂</div>

[^10_1]: https://forum.babylonjs.com/t/understanding-instances-draw-calls/23232

[^10_2]: https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances

[^10_3]: https://forum.babylonjs.com/t/more-objects-more-draw-calls-more-performance-loss/36009

[^10_4]: https://forum.babylonjs.com/t/mesh-with-thin-instance-slower-than-with-full-vertices/46756

[^10_5]: https://forum.babylonjs.com/t/rendering-performance-issues/43140

[^10_6]: https://doc.babylonjs.com/features/featuresDeepDive/mesh/mergeMeshes

[^10_7]: https://forum.babylonjs.com/t/best-practices-for-optimizing-babylon-js-scenes-not-just-on-lower-end-devices/58688

[^10_8]: https://doc.babylonjs.com/typedoc/classes/BABYLON.Mesh

[^10_9]: https://forum.babylonjs.com/t/fps-drops-dramatically-when-having-large-amount-of-meshes-instancing-is-not-suitable-for-this-case/47139

[^10_10]: https://blog.raananweber.com/2015/09/03/scene-optimization-in-babylon-js/

[^10_11]: https://bun.com/docs/runtime/http/websockets

[^10_12]: https://bun.com/reference/bun/ServerWebSocket

[^10_13]: https://bun.com/guides/websocket/pubsub

[^10_14]: https://bun.com/docs/guides/websocket/pubsub

[^10_15]: https://bun.com/reference/bun/WebSocketHandler

[^10_16]: https://github.com/oven-sh/bun/issues/13656

[^10_17]: https://bun.com/blog/bun-v1.3.14

[^10_18]: https://bun.com/docs/runtime/http/server

[^10_19]: https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API

[^10_20]: https://developer.mozilla.org/en-US/docs/Web/API/WebTransport

[^10_21]: https://doc.babylonjs.com/typedoc/classes/BABYLON.GLTFFileLoader

[^10_22]: https://doc.babylonjs.com/typedoc/classes/BABYLON.GLTFLoaderOptions

[^10_23]: https://doc.babylonjs.com/features/featuresDeepDive/crowdNavigation/createNavMesh/

[^10_24]: https://forum.babylonjs.com/t/i-have-a-lot-of-gltf-models-after-loading-fps-is-very-low-only-3fps-how-to-tune/21438

[^10_25]: https://doc.babylonjs.com/typedoc/classes/BABYLON.GLTF2.GLTFLoader

[^10_26]: https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene

[^10_27]: https://forum.babylonjs.com/t/performance-what-is-eating-up-frametime-in-this-scene-with-only-simple-3d-hexagon-meshes/25196

[^10_28]: https://forum.babylonjs.com/t/how-to-optimize-a-scene-with-10k-mesh-instances/8634/4

[^10_29]: https://forum.babylonjs.com/t/how-to-optimize-a-scene-with-10k-mesh-instances/8634

[^10_30]: https://forum.babylonjs.com/t/how-and-when-to-use-mesh-freezeworldmatrix/13906/9

[^10_31]: https://github.com/vitejs/vite/discussions/17730

[^10_32]: https://quasar.dev/quasar-cli-vite/lazy-loading/

[^10_33]: https://github.com/vitejs/vite/discussions/17730\&rut=2bdb21cf12c06ec2b574248bf32a27881a52c503188ed75595d726b67f7104a8

[^10_34]: https://medium.com/@akashsdas_dev/code-splitting-in-react-w-vite-eae8a9c39f6e

[^10_35]: https://github.com/vitejs/vite/discussions/8617

[^10_36]: https://doc.babylonjs.com/features/featuresDeepDive/physics/characterController/

[^10_37]: https://babylonjs.medium.com/character-controller-with-physics-v2-1df5d8b0d244

[^10_38]: https://www.abratabia.com/babylonjs/physics-with-havok.php

[^10_39]: https://forum.babylonjs.com/t/character-controller-and-havok-collisions/42083

[^10_40]: https://forum.babylonjs.com/t/havok-first-person-controller-with-jumping-and-ramps/52945

[^10_41]: https://github.com/fenomas/noa

[^10_42]: https://github.com/fenomas/voxel-physics-engine

[^10_43]: https://github.com/fenomas/noa-examples

[^10_44]: https://github.com/fenomas/ent-comp

