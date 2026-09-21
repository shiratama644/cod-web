---
name: input-accumulation
description: Pointer Lock、raw mouse、WASD、joystick、InputControllerの蓄積/消費パターンとjsdom限界のスキル。
---

# Input Accumulation — 入力蓄積とPointer Lockスキル

> 仕様正本: `docs/arch/protocol.md`（Input 16B）、`docs/arch/engineering.md`  
> ログ: `.agent/logs/2026-09-08_ph1-e-input-accumulation.md`、PH1-F

## Pointer Lock正しい使い方

```ts
function requestLock(el: Element) {
  // 戻り値をPromiseと決め打ちして.catch()しない、旧式はvoidを返す
  const ret = el.requestPointerLock({ unadjustedMovement: true } as any);
  if (ret instanceof Promise) {
    ret.catch(() => {}); // 失敗は無視、fallbackは別経路
  }
}
```

- `Element.requestPointerLock()` は現行TS DOM libでは `Promise<void>` だが、実ブラウザには旧式のvoid戻り値が残り得る
- raw mouse未対応fallbackはMDN例どおり `NotSupportedError` を通常Pointer Lockへ戻す経路に限定
- `SecurityError` 等はユーザージェスチャ不足など通常fallbackでも解決しない可能性

```ts
try {
  await canvas.requestPointerLock({ unadjustedMovement: true } as any);
} catch (e: any) {
  if (e?.name === 'NotSupportedError') {
    // raw mouse非対応、通常Pointer Lockへfallback
    await canvas.requestPointerLock();
  }
}
```

## InputControllerパターン（EM02で95%達成）

### 蓄積/消費

```ts
class InputController {
  private moveX = 0; // -1..1
  private moveZ = 0;
  private yawDelta = 0;
  private pitchDelta = 0;
  private buttons = 0;

  onMouseMove(e: MouseEvent) {
    if (document.pointerLockElement !== this.canvas) return;
    this.yawDelta += e.movementX * SENSITIVITY;
    this.pitchDelta += e.movementY * SENSITIVITY;
  }

  consume(): DecodedInput {
    const input = {
      moveX: quantizeMove(this.moveX),
      moveZ: quantizeMove(this.moveZ),
      yaw: this.yawDelta,
      pitch: clamp(this.pitchDelta, -89, 89),
      buttons: this.buttons,
      dtMs: this.dtMs,
    };
    this.yawDelta = 0; // 消費後クリア
    this.pitchDelta = 0;
    return input;
  }
}
```

### WASD / 矢印 / Space

- WASDと矢印両対応、Spaceはjump
- 同時押しは加算、normalizeしてdeadzone超えを判定

### Joystick

- deadzone 0.2、中心ブレで斜めジグザグにならないよう `Math.hypot(x,y) < deadzone` は0扱い
- normalize: `len>1 ? x/len : x`

### Touch UI

- `touch-ui` targetはHUDのボタン、pointer upで離す
- attach/detachでイベント登録/解除

## jsdom限界

- Pointer Lock実ブラウザ挙動やraw mouse成否は確認できない
- unitでは呼び出し順とdelta蓄積/消費ロジックだけ検証
- `document.pointerLockElement` はjsdomでモック

```ts
Object.defineProperty(document, 'pointerLockElement', { value: canvas, writable: true });
```

## 量子化（protocol.md）

- moveX/Z i8: -127..127に量子化
- yaw u16: 0-2π → 0-65535
- pitch i8: -89..89
- dtMs u16: ms、clamp 500ms

## 関連

- `apps/web/src/game/input/InputController.ts`
- `docs/arch/protocol.md` §Input
- `.agent/logs/2026-09-08_ph1-e-input-accumulation.md`
