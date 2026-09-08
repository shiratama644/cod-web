import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * 空（Skybox）。
 *
 * drei の <Sky> は GLSL の ShaderMaterial を使うため、WebGPU レンダラー
 * （WebGPU 対応端末＝最近のスマホや PC で優先される）では正しく描画されず
 * 「白い箱」になってしまう。そこで **2D Canvas で空を描き、それを
 * Equirectangular テクスチャにして scene.background に貼る** 方式にする。
 * CanvasTexture は標準マテリアルと同じテクスチャパスを通るので
 * **WebGPU / WebGL2 どちらでも同じ青空が映る**（外部アセット不要・軽量）。
 *
 * 天頂（濃い青）→ 地平（明るい水色）の縦グラデーションに、太陽の光の玉と
 * 柔らかい光輪、薄い雲を数枚描く。
 */
export function Skybox() {
  const texture = useMemo(() => createSkyTexture(), [])

  return <primitive object={texture} attach="background" />
}

/** 2D Canvas に空を描いて Equirectangular テクスチャを作る。 */
function createSkyTexture(): THREE.CanvasTexture {
  const w = 1024
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // 極端なフォールバック（通常は起きない）。単色テクスチャを返す。
    const tex = new THREE.CanvasTexture(canvas)
    tex.mapping = THREE.EquirectangularReflectionMapping
    return tex
  }

  // ── 空のグラデーション（天頂＝上 y=0 が濃い青、地平＝下が明るい） ──
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0.0, '#2f7fd4') // 天頂（濃い青）
  sky.addColorStop(0.45, '#6fb1ec')
  sky.addColorStop(0.72, '#a9d4f7')
  sky.addColorStop(0.86, '#d8ecfb')
  sky.addColorStop(1.0, '#eef7ff') // 地平（ほぼ白）
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // ── 太陽（equirect 上の位置） ──
  // シーンの directionalLight（影を落とす太陽）の方向と同じ方位・高度に置く。
  // 光の位置 [34,22,24] を正規化した方向を equirect の UV へ変換:
  //   u = 0.5 + atan2(z, x) / 2π, v = 0.5 − asin(y) / π（v=0 が天頂）
  const sunDir = new THREE.Vector3(34, 22, 24).normalize()
  const sunX = (0.5 + Math.atan2(sunDir.z, sunDir.x) / (2 * Math.PI)) * w
  const sunY = (0.5 - Math.asin(THREE.MathUtils.clamp(sunDir.y, -1, 1)) / Math.PI) * h
  // 外側の柔らかい光輪
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 150)
  glow.addColorStop(0.0, 'rgba(255, 250, 220, 0.95)')
  glow.addColorStop(0.25, 'rgba(255, 244, 190, 0.55)')
  glow.addColorStop(1.0, 'rgba(255, 244, 190, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320)
  // 太陽本体
  const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 26)
  disc.addColorStop(0.0, '#ffffff')
  disc.addColorStop(0.7, '#fff6d8')
  disc.addColorStop(1.0, 'rgba(255, 246, 216, 0)')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2)
  ctx.fill()

  // ── 薄い雲（白い半透明の楕円をいくつか、地平寄りに散らす） ──
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  for (let i = 0; i < 14; i++) {
    const cx = rand() * w
    const cy = h * (0.42 + rand() * 0.3)
    const rx = 40 + rand() * 90
    const ry = 10 + rand() * 18
    // 雲をいくつかの重なる円でふんわり描く
    for (let j = 0; j < 5; j++) {
      const ox = (rand() - 0.5) * rx * 1.6
      const oy = (rand() - 0.5) * ry
      const r = (0.5 + rand() * 0.8) * ry * 1.4
      ctx.globalAlpha = 0.12 + rand() * 0.12
      ctx.beginPath()
      ctx.ellipse(cx + ox, cy + oy, rx * (0.5 + rand() * 0.5), r, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
