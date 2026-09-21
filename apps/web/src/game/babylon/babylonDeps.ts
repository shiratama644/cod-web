/**
 * Babylon.js の依存を集約し、テスト時に差し替え可能にするためのファサード。
 * 本番では実際の Babylon クラスを生成する。テストではこのモジュールを vi.mock して
 * WebGL 非依存のモックを返す。
 */

import { Engine } from '@babylonjs/core/Engines/engine'
import type { EngineOptions } from '@babylonjs/core/Engines/thinEngine.pure'
import { Scene } from '@babylonjs/core/scene'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh as BabylonMesh } from '@babylonjs/core/Meshes/mesh'

export function createEngine(canvas: HTMLCanvasElement, options: EngineOptions): Engine {
  return new Engine(canvas, false, options, false)
}

export function createScene(engine: Engine): Scene {
  return new Scene(engine)
}

export function createFreeCamera(name: string, pos: Vector3, scene: Scene): FreeCamera {
  return new FreeCamera(name, pos, scene)
}

export function createHemisphericLight(name: string, dir: Vector3, scene: Scene): HemisphericLight {
  return new HemisphericLight(name, dir, scene)
}

export function createDirectionalLight(name: string, dir: Vector3, scene: Scene): DirectionalLight {
  return new DirectionalLight(name, dir, scene)
}

export function createBox(name: string, opts: { width: number; height: number; depth: number }, scene: Scene): BabylonMesh {
  return MeshBuilder.CreateBox(name, opts, scene) as BabylonMesh
}

export function createCapsule(
  name: string,
  opts: { radius: number; height: number; tessellation: number; subdivisions: number },
  scene: Scene,
): BabylonMesh {
  return MeshBuilder.CreateCapsule(name, opts, scene) as BabylonMesh
}

export function createStandardMaterial(name: string, scene: Scene): StandardMaterial {
  return new StandardMaterial(name, scene)
}

export function createColor3(r: number, g: number, b: number): Color3 {
  return new Color3(r, g, b)
}

export function createColor4(r: number, g: number, b: number, a: number): Color4 {
  return new Color4(r, g, b, a)
}

export function createVector3(x = 0, y = 0, z = 0): Vector3 {
  return new Vector3(x, y, z)
}

export { Color3, Color4, Vector3 }
