---
name: import-boundaries
description: Biome noRestrictedImports/noPrivateImportsでレイヤー境界を守るスキル。L1/L2/Appsの依存方向、@cod/webの禁止、workspace:*の使い方。
---

# Import Boundaries — レイヤー境界を守るスキル

> 仕様正本: `docs/arch/architecture.md`（レイヤー図・依存方向）、`docs/arch/engineering.md`（import境界）、`biome.json`  
> 計画: `docs/planning/PHASE01_PLAN.md` PH1-B, `PHASE02_PLAN.md` PH2-A/B, `EM01_PLAN.md`

## レイヤー定義

```
L1: @cod/engine-core / @cod/protocol / @cod/gamemode-api
  ↑ L1はL2を知らない、@cod/profile-* import禁止、type分岐禁止
L2: @cod/profile-fps / @cod/profile-voxel (将来)
  ↑ L2はL1を実装してよい
Apps: @cod/web / @cod/gameserver (executable)
  ↑ AppsはL2のcreateFpsSimProfile()を唯一の入口に
```

## Biome設定（正本はbiome.json）

```json
{
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": {
              "@cod/profile-fps": {
                "message": "engine-coreからprofile-fps import禁止、SimProfile contract経由"
              },
              "@cod/engine-core/src": {
                "message": "private import禁止、package export経由"
              }
            }
          }
        },
        "noPrivateImports": {
          "level": "error"
        }
      },
      "suspicious": {
        "noConsole": {
          "level": "error",
          "options": {
            "allow": ["warn", "error"]
          }
        }
      }
    }
  },
  "overrides": [
    {
      "include": ["apps/web/src/**/*"],
      "linter": {
        "rules": {
          "style": {
            "noRestrictedImports": {
              "options": {
                "paths": {
                  "@cod/engine-core": {
                    "message": "webからはengine-core直接import禁止、profile-like seam経由"
                  }
                }
              }
            }
          },
          "suspicious": {
            "noConsole": {
              "level": "error"
            }
          }
        }
      }
    },
    {
      "include": ["apps/web/src/game/babylon/**/*", "apps/web/src/game/net/**/*"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsole": { "level": "error" }
          }
        }
      }
    }
  ]
}
```

- `architecture.md` の `noRestrictedImports` は意図、実設定上は `linter.rules.style.noRestrictedImports` 配下に置く（PLAT-1R知見）
- 公式URL: https://biomejs.dev/linter/rules/no-restricted-imports/javascript/ / https://biomejs.dev/linter/rules/no-private-imports/javascript/

## 依存方向ルール

| From | To | OK? | 理由 |
|---|---|:---:|---|
| engine-core | profile-fps | ❌ | L1はL2を知らない |
| profile-fps | engine-core/profile/SimProfile | ✅ | L2がL1 contract実装 |
| gameserver | profile-fps | ✅ | executableはL2入口を使ってよい、ただし低レベルfps関数ではなく `createFpsSimProfile()` を唯一の入口に |
| web | engine-core | ❌ | Biomeで禁止、profile-like seam経由 |
| web | profile-fps | ✅ | `createFpsSimProfile()` 経由 |
| engine-core | engine-core/src/private | ❌ | private import禁止、export経由 |

## 実装パターン

### PH2-B: profile-fpsがSimProfile実装

```ts
// packages/profile-fps/src/simProfile.ts
import type { SimProfile } from '@cod/engine-core/profile/SimProfile';

export function createFpsSimProfile(deps?: { createWorld?: () => World }): SimProfile {
  // ...
}
```

### PH2-C: gameserver注入

```ts
// apps/gameserver/src/index.ts
import { createFpsSimProfile } from '@cod/profile-fps';
const room = new Room({ profile: createFpsSimProfile() });
```

- `buildServerWorld` / `stepPlayer` 直接importではなく `createFpsSimProfile()` 経由

### PH2-D: web注入（Biome回避）

```ts
// apps/web/src/game/client/GameClient.ts
// @cod/engine-core 直接import禁止のため、ローカルにprofile-like interface定義
interface ProfileLike {
  typeSpec: { simHz: number };
  createWorld: () => World;
  step: (world: World, dt: number) => void;
}

class GameClient {
  constructor(
    private transport: NetTransport,
    private profile: ProfileLike = createFpsSimProfile() as unknown as ProfileLike
  ) {}
}
```

## Workspace参照

- Bun workspacesは root `package.json` の `workspaces` と `workspace:*` で足りる（PLAT-1R）
- `catalog` / self-contained workspacesは公式docsにあるがPH1-Aでは単純な `workspaces` 配列で十分
- 未確認のcatalogは使わない方が安全

```json
// root package.json
{
  "workspaces": ["packages/*", "apps/*"],
  "dependencies": {
    "@cod/protocol": "workspace:*"
  }
}
```

## 監査コマンド

```bash
bun run lint  # biome checkで境界違反検出
grep -R "from '@cod/profile-fps'" packages/engine-core --include="*.ts"  # 0件であること
grep -R "from '@cod/engine-core'" apps/web/src --include="*.ts" | grep -v "profile-like\|test\|mock"
cat biome.json | grep -A5 noRestrictedImports
```

## よくある失敗

- `engine-core/package.json` に `./profile/*` exportを追加しないと外部から `@cod/engine-core/profile/SimProfile` を参照しづらい（PH2-A知見）
- `@babylonjs/core@9.25.0` の `EngineOptions` は `@babylonjs/core/Engines/engine` から再exportされていない、`thinEngine.pure` からimportする必要がある（PH1-D知見）
- `apps/web` から R3F/drei/Three sceneを削除しても `@cod/profile-fps` のserver/client共通衝突判定は `three` / `three-mesh-bvh` を使い続ける、描画ではなく衝突用なので削除対象外（PH1-D知見）

## 関連

- `docs/arch/architecture.md` §レイヤー図
- `docs/arch/engineering.md` §import境界
- `biome.json` 正本
- `.agent/logs/2026-09-08_ph1-b-import-boundaries.md`
- `.agent/logs/2026-09-17_ph2-a-sim-profile-contract-type-specs.md`
- `.agent/logs/2026-09-17_ph2-b-fps-sim-profile.md`
- `.agent/logs/2026-09-17_ph2-c-gameserver-profile-injection.md`
- `.agent/logs/2026-09-17_ph2-d-web-client-profile-injection.md`
