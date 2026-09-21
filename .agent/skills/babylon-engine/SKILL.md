---
name: babylon-engine
description: Babylon.js Engine初期化とR3F排除、EngineOptions型解決、babylonDepsファサード、リサイズ/破棄の実装スキル。
---

# Babylon Engine — Engine初期化とR3F排除スキル

> 仕様正本: `docs/arch/tech-stack.md`、`docs/arch/adr.md` ADR-013, `docs/planning/PHASE01_PLAN.md` PH1-D  
> ログ: `.agent/logs/2026-09-08_ph1-d-babylon-engine.md`

## R3F排除（PH1-Dで確立）

- `apps/web` から R3F / drei / Three scene を削除しても、`@cod/profile-fps` のserver/client共通衝突判定は `three` / `three-mesh-bvh` を使い続ける
- 描画ではなくprofile-fpsの衝突用なのでPH1-Dの削除対象外
- 現行コードの bun WS / `_tests_/` / Vite `allowedHosts` / `ws.send` 戻り値はスキルに残し、R3F/WebGPUは破棄対象・真似しないと明記

## EngineOptions型解決

- `@babylonjs/core@9.25.0` の `EngineOptions` は `@babylonjs/core/Engines/engine` からは再exportされていない
- 型は `@babylonjs/core/Engines/thinEngine.pure` からimportする必要があった

```ts
import type { EngineOptions } from '@babylonjs/core/Engines/thinEngine.pure';
import { Engine } from '@babylonjs/core/Engines/engine';
```

- `EngineOptions` は `WebGLContextAttributes` を継承しているため `alpha` / `antialias` / `premultipliedAlpha` / `powerPreference` などは型で通る
- 計画どおり `desynchronized` / `preserveDrawingBuffer` はPH1-Dでは渡していない（typedocに無く、ChromeはCanvas context attributesとして説明）
- 型に無いkeyをinventしない、installed `.d.ts` を再確認

```ts
const engineOptions: EngineOptions = {
  antialias: true,
  alpha: false,
  premultipliedAlpha: false,
  powerPreference: 'high-performance',
};
```

## babylonDepsファサード（EM02で確立）

- `BabylonGame.ts` 2% → 96.9% 達成のため、Babylon依存を `babylonDeps.ts` に分離
- テストでは `vi.mock('../babylonDeps')` でWebGL非依存モック

```ts
// babylonDeps.ts
export function createEngine(canvas: HTMLCanvasElement, options: EngineOptions) {
  return new Engine(canvas, true, options);
}
export function createScene(engine: Engine) { return new Scene(engine); }
// ...
```

## lifecycle / resize / dispose

```ts
class BabylonGame {
  start(canvas: HTMLCanvasElement) {
    this.engine = createEngine(canvas, options);
    this.scene = createScene(this.engine);
    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener('resize', this.onResize);
  }
  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.scene?.dispose();
    this.engine?.dispose();
  }
  private onResize = () => this.engine?.resize();
}
```

- React側は `useEffect` でlifecycleだけ同期（React公式はuseEffectを外部システムとの同期に使うHookと説明、Babylon runtimeはimperative system）

## よくある失敗

- `Engine` を毎フレームnew: 禁止、startで1回
- `runRenderLoop` を2重登録: stopRenderLoopで解除
- jsdomでWebGL実描画確認: できない、factory seam + mockで検証
- `desynchronized` / `preserveDrawingBuffer` を型に無いのに渡す: PH1-Dでは渡さない

## 関連

- `apps/web/src/game/babylon/BabylonGame.ts`
- `apps/web/src/game/babylon/babylonDeps.ts`
- `.agent/logs/2026-09-08_ph1-d-babylon-engine.md`
- `.agent/logs/2026-09-09_ph1-f-hud-network-path.md`
