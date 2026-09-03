import { GameScene } from './GameScene'

/**
 * R3F シーンの中身。Canvas（レンダラー）の外側に置き、
 * WebGPU / WebGL2 どちらのバックエンドでも同一に動作する。
 *
 * Phase 1: ネットワーク位置同期（自プレイヤー予測＋リモート補間）。
 * 毎フレームの更新は useFrame 内で ref 直接更新（React state 非依存）。
 */
export function SceneContents() {
  return (
    <>
      <color attach="background" args={['#0b0e14']} />

      {/* 照明: 環境光＋平行光（影なし・軽量構成） */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 7]} intensity={1.4} />

      {/* ネットワークゲーム本体（マップ・自プレイヤー・リモートプレイヤー） */}
      <GameScene />
    </>
  )
}
