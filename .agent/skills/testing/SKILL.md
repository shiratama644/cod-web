---
name: testing
description: Vitest unit/coverageで意味あるテストを書くスキル。EM02で確立したinclude-all方針、handlers分離、babylonDepsファサード、mock戦略、threshold ratchet。
---

# Testing — 意味あるテストでcoverage 85%を達成するスキル

> 仕様正本: `docs/arch/engineering.md`（テスト最低ライン）、`docs/ops/quality-gates.md` §3  
> 計画: `docs/planning/PHASE01_5_PLAN.md` §10.1-10.2, `EM02_PLAN.md` §10.1-10.5

## 原則

- 数字稼ぎの浅い snapshot / render存在確認ではなく、壊れるとゲームが壊れる経路を優先
- import-only test、実装詳細だけのshallow test、難しいproduction fileの安易なexcludeをしない
- assertion弱体化をしない、意味あるテストのみ

## Coverage方針（EM02で確立）

### include-all方針

- `gameserver/index.ts` 0%、`BabylonGame.ts` 2%、`App.tsx` 0%も含めて85%を目指す
- テスト可能にリファクタ（handlers.ts分離、babylonDeps.ts分離）し、モックで意味あるテストを書く、除外で数字を作らない

### baseline → meaningful → ratchet

| Phase | Statements | Branches | Functions | Lines | Threshold |
|---|---|---:|---:|---:|---:|
| PH1.5-A baseline | 66.82% (725/1085) | 57.10% (225/394) | 64.43% (125/194) | 68.97% (696/1009) | 0% |
| PH1.5-B after | 79.17% (859/1085) | 73.85% (291/394) | 79.38% (154/194) | 80.77% (815/1009) | 79/73/79/80 |
| EM01 after | 81.22% (965/1188) | 76.02% (333/438) | 81.9% (172/210) | 82.8% (915/1105) | 79/73/79/80 |
| EM02 after | 95.12% (1151/1210) | 87.97% (395/449) | 90.7% (205/226) | 96.8% (1091/1127) | 85/85/85/85 |

### vitest.config.ts

```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'packages/protocol/src/**/*.{ts,tsx}',
        'packages/engine-core/src/**/*.{ts,tsx}',
        'packages/profile-fps/src/**/*.{ts,tsx}',
        'apps/web/src/**/*.{ts,tsx}',
        'apps/gameserver/src/**/*.{ts,tsx}',
      ],
      exclude: [
        'packages/**/dist/**',
        '**/*.d.ts',
        '**/vite-env.d.ts',
        // entrypoint / type-only / generated は理由付きで除外
      ],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
```

- reporterは `text-summary`, `json-summary`, `lcov` を基本、HTMLはローカル確認用
- coverage/ はartifact、Gitに入れない

## 低カバレッジファイルの改善パターン（EM02実績）

| File | Before | After | 方法 |
|---|---|---|---|
| `gameserver/index.ts` | 0% | ~80% | `handlers.ts`分離 + `index.test.ts`でBun.serveモック + ws handlers呼び出し + setInterval loop |
| `handlers.ts` | 新規 | 97.29% stmts, 91.66% branch | 純粋ハンドラ分離、open/message/drain/close/fetchをunitでテスト |
| `BabylonGame.ts` | 2.06% | 96.9% stmts, 90% branch | `babylonDeps.ts`ファサード分離 + `vi.mock`でWebGL非依存モック + lifecycle/remote mesh/grace/camera/resizeテスト |
| `App.tsx` | 0% | 100% | `App2.test.tsx`でGameCanvas/HUD/TouchControls/StartOverlayをモックしてApp統合テスト |
| `InputController.ts` | 72.02% | ~95% | WASD/矢印、Space/jump、joystick deadzone/normalize、pitch clamp、touch-ui target、pointer up、PointerLock、attach/detach |
| `types.ts` | 50% | 100% | `createSimWorld`テスト追加 |
| `quantize.ts` | 100% stmts, 66% branch | 100% | clamp分岐をテスト |
| `packer.ts` | 98.94% | 98.94% | readMessageType empty branch |

## モック戦略

### Bun.serveモック

```ts
vi.stubGlobal('Bun', {
  serve: vi.fn((opts) => {
    // opts.websocket.open/message/drain/closeを保存してテストから呼ぶ
    return { stop: vi.fn() };
  }),
});
```

### Babylonモック（jsdomでも動く）

```ts
vi.mock('@babylonjs/core/Engines/engine', () => ({
  Engine: vi.fn(() => ({
    setHardwareScalingLevel: vi.fn(),
    resize: vi.fn(),
    runRenderLoop: vi.fn(),
    stopRenderLoop: vi.fn(),
    getDeltaTime: vi.fn(()=>16),
    dispose: vi.fn(),
  })),
}));
vi.mock('../babylonDeps', () => ({
  createEngine: vi.fn(),
  createScene: vi.fn(),
  // ...
}));
```

### App.tsxモック

```ts
vi.mock('./game/GameCanvas', () => ({ default: vi.fn(() => <div data-testid="game-canvas" />) }));
vi.mock('./components/RendererHud', () => ({ default: () => <div /> }));
```

## 意味あるテストの例

- `Room.broadcastExcept` はexceptId以外に送ることを検証、単に呼ぶだけではない
- `Simulation` MAX_QUEUED_INPUTS超過は「古い入力が捨てられ遅延が防がれる」を検証
- `BabylonGame` grace期間は「mark不一致かつGRACE_MS超過でmeshがdisposeされる」を検証
- `InputController` deadzoneは中心ブレで斜めジグザグにならないことを検証

## 監査コマンド

```bash
bun run test:coverage  # Statements 95.12% / Branches 87.97% / Functions 90.7% / Lines 96.8%
bun run test:unit       # 30 files / 189 tests
```

## よくある失敗

- `any`濫用でカバレッジを稼ぐ → 禁止、biome-ignore + anyはprivate accessテストのみ許容、prodではany禁止
- `gameserver/index.ts` をimportするとBun server / setInterval起動 → handler抽出のseamが必要
- `App.tsx` のnull ref branchはjsdomでは再現しにくい → factory注入とplaceholderテストでカバー

## 関連

- `docs/ops/quality-gates.md` §3 Coverage gate
- `docs/planning/EM02_PLAN.md` §10.1-10.5
- `.agent/logs/2026-09-09_ph1-5-a-vitest-coverage-baseline.md`
- `.agent/logs/2026-09-09_ph1-5-b-meaningful-coverage.md`
- `.agent/logs/2026-09-21_em2-coverage-85.md`
