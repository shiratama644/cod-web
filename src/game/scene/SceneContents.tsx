import type { InputController } from '../input/InputController'
import { GameScene } from './GameScene'
import { Skybox } from './Skybox'

/**
 * R3F シーンの中身。Canvas（レンダラー）の外側に置き、
 * WebGPU / WebGL2 どちらのバックエンドでも同一に動作する。
 *
 * Phase 1: ネットワーク位置同期（自プレイヤー予測＋リモート補間）。
 * 毎フレームの更新は useFrame 内で ref 直接更新（React state 非依存）。
 *
 * 空: WebGPU でも壊れないよう Canvas テクスチャの Equirectangular 空
 * （<Skybox />）。drei <Sky> は GLSL ShaderMaterial のため WebGPU で白箱化する。
 * 影: Canvas 側で shadows を有効化し、directionalLight が shadow を投影する。
 */
export function SceneContents({ input }: { input: InputController }) {
  return (
    <>
      {/* 空（Canvas テクスチャ・WebGPU/WebGL2 両対応）＋遠景フォグ */}
      <Skybox />
      <fog attach="fog" args={['#cfe6f7', 90, 320]} />

      {/* 照明: 半球環境光（空↔地面）＋太陽平行光（影付き） */}
      <hemisphereLight args={['#cfe7ff', '#8a9a78', 1.05]} />
      {/* 空の太陽位置（方位角 0.44π・高度 ~29°）に合わせて配置し原点を照らす */}
      <directionalLight
        position={[34, 22, 24]}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0004}
      />

      {/* ネットワークゲーム本体（マップ・自プレイヤー・リモートプレイヤー） */}
      <GameScene input={input} />
    </>
  )
}
