import { Sky } from '@react-three/drei'
import { GameScene } from './GameScene'

/**
 * R3F シーンの中身。Canvas（レンダラー）の外側に置き、
 * WebGPU / WebGL2 どちらのバックエンドでも同一に動作する。
 *
 * Phase 1: ネットワーク位置同期（自プレイヤー予測＋リモート補間）。
 * 毎フレームの更新は useFrame 内で ref 直接更新（React state 非依存）。
 *
 * 空: drei の <Sky />（物理ベースの大気散乱スカイドーム）。開発中に方向感・
 * 高低を掴みやすくするために導入。Sky のシェーダは空だけを描画し、シーンを
 * 照らさないので hemisphere/directional は別途必要。
 */
export function SceneContents() {
  return (
    <>
      {/* 空（ドーム）＋フォールバック背景色 */}
      <color attach="background" args={['#9ec9ef']} />
      <fog attach="fog" args={['#bfe0f5', 120, 400]} />
      <Sky distance={450} sunPosition={[40, 60, 20]} turbidity={6} rayleigh={1.2} />

      {/* 照明: 半球環境光（空↔地面）＋平行光（太陽）。影なし・軽量構成 */}
      <hemisphereLight args={['#cfe7ff', '#6b7280', 0.9]} />
      <directionalLight position={[40, 80, 20]} intensity={2.2} />

      {/* ネットワークゲーム本体（マップ・自プレイヤー・リモートプレイヤー） */}
      <GameScene />
    </>
  )
}
