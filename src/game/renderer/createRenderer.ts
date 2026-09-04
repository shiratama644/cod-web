import { WebGLRenderer } from 'three'
import { WebGPURenderer, type WebGPURendererParameters } from 'three/webgpu'

/**
 * アクティブな描画バックエンド。
 * - `webgpu`: WebGPU が利用可能（最優先）
 * - `webgl2`: WebGPU 不在・初期化失敗時のフォールバック（全端末 60FPS の基準）
 */
export type RendererBackend = 'webgpu' | 'webgl2'

export interface CreatedRenderer {
  renderer: WebGPURenderer | WebGLRenderer
  backend: RendererBackend
}

/**
 * 実行環境が WebGPU を利用できるか（navigator.gpu + adapter 取得）。
 * 非ブラウザ（jsdom 等）では安全に false を返す。
 */
export async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.gpu) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return Boolean(adapter)
  } catch {
    return false
  }
}

/**
 * R3F の <Canvas gl> に渡すレンダラーファクトリ。
 *
 * 方針（docs/arch/tech-stack.md、P0-D）:
 *   1. WebGPU を最優先。`navigator.gpu` が使えれば `three/webgpu` の WebGPURenderer を初期化。
 *   2. WebGPU が無い / init に失敗した環境では WebGL2（WebGLRenderer）へ自動フォールバック。
 *
 * WebGL2 を「全端末 60FPS」の基準とし、WebGPU 固有機能（Compute / TSL）は
 * WebGL2 で欠落しない範囲で後続フェーズに段階導入する。
 *
 * 引数には R3F が渡すレンダラー初期化プロパティ（canvas を含む）をそのまま受け取る。
 */
export async function createRenderer(
  props: WebGPURendererParameters = {},
): Promise<CreatedRenderer> {
  if (await detectWebGPU()) {
    try {
      const renderer = new WebGPURenderer({
        antialias: true,
        // WebGPU が有効な環境でも強制的に WebGL を使いたいテスト/デバッグ時は true。
        forceWebGL: false,
        ...props,
      })
      await renderer.init()
      return { renderer, backend: 'webgpu' }
    } catch (error) {
      console.warn('[renderer] WebGPU init failed, falling back to WebGL2:', error)
    }
  }

  // フォールバック: WebGL2。WebGPU 固有プロパティ（context 等）は渡さないこと。
  // R3F は実 DOM の <canvas> を渡すため、ここでは HTMLCanvasElement として扱う。
  const canvas = props.canvas as HTMLCanvasElement | undefined
  const renderer = new WebGLRenderer({ antialias: true, canvas })
  return { renderer, backend: 'webgl2' }
}
