import { Box, Ground } from './Objects'

/**
 * R3F シーンの中身。Canvas（レンダラー）の外側に置き、
 * WebGPU / WebGL2 どちらのバックエンドでも同一に動作する。
 *
 * P0-D: カメラ・ライト・地面・オブジェクトの最小構成。
 * 毎フレームの更新（ゲームループ）は P0-E でオブジェクト側に実装する。
 */
export function SceneContents() {
  return (
    <>
      <color attach="background" args={['#0b0e14']} />

      {/* 照明: 環境光＋平行光（影なし・軽量構成） */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 7]} intensity={1.4} />

      {/* 地面 */}
      <Ground />

      {/* 動作確認用オブジェクト（P0-E で回転ループを付与） */}
      <Box position={[0, 1, 0]} />
    </>
  )
}
