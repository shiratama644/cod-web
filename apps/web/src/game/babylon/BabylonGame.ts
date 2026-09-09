/**
 * BabylonGame — Babylon.js の命令型シーン。
 *
 * React から 3D を切り離し、canvas・Engine・Scene・mesh を Babylon 側で所有する。
 * ネットワーク/予測/補間は既存 GameClient をそのまま使い、描画ループから毎フレーム
 * `client.frame(dtSec)` と mesh/camera の直接更新だけを行う。
 */

import { Engine } from '@babylonjs/core/Engines/engine'
import type { EngineOptions } from '@babylonjs/core/Engines/thinEngine.pure'
import { Scene } from '@babylonjs/core/scene'
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import type { Mesh as BabylonMesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { DEFAULT_OBSTACLES } from '@cod/profile-fps/sim/collisionWorld'
import { PLAYER_HEIGHT } from '@cod/profile-fps/sim/movement'
import { gameStoreApi } from '@/store/gameStore'
import type { InputController } from '../input/InputController'
import { GameClient } from '../net/GameClient'

const GRACE_MS = 600
const CAMERA_BACKWARD_YAW = Math.PI

interface RemoteMesh {
  mesh: BabylonMesh
  lastSeenMs: number
  mark: number
}

export class BabylonGame {
  private readonly engine: Engine
  private readonly scene: Scene
  private readonly camera: FreeCamera
  private readonly client = new GameClient()
  private readonly remotes = new Map<number, RemoteMesh>()
  private readonly cameraPosition = new Vector3()
  private readonly remotePosition = new Vector3()
  private readonly resize = () => this.engine.resize()
  private frameMark = 0
  private disposed = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly input: InputController,
  ) {
    const options: EngineOptions = {
      alpha: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false,
      failIfMajorPerformanceCaveat: false,
      powerPreference: 'high-performance',
    }

    this.engine = new Engine(canvas, false, options, false)
    this.engine.setHardwareScalingLevel(1)
    this.scene = new Scene(this.engine)
    this.scene.clearColor = new Color4(0.64, 0.81, 0.95, 1)
    this.camera = new FreeCamera('player-camera', new Vector3(0, PLAYER_HEIGHT, -4), this.scene)
    this.camera.minZ = 0.05
    this.camera.maxZ = 600
    this.scene.activeCamera = this.camera

    this.createLighting()
    this.createStaticMap()
  }

  start(): void {
    this.input.attach(this.canvas)
    this.client.setInput(this.input)
    this.client.onStatusChange = (status) => {
      console.log(`[net] ${status}`)
      gameStoreApi.getState().setConnectionStatus(status)
    }
    this.client.connect()
    gameStoreApi.getState().setRenderer('babylon-webgl')

    window.addEventListener('resize', this.resize)
    this.engine.runRenderLoop(() => {
      if (this.disposed) return
      this.input.consumeLookDelta()
      const dtSec = Math.min(this.engine.getDeltaTime() / 1000, 0.1)
      this.client.frame(dtSec)
      this.renderPlayers(performance.now())
      this.scene.render()
    })
  }

  private createLighting(): void {
    const hemi = new HemisphericLight('sky-light', new Vector3(0, 1, 0), this.scene)
    hemi.intensity = 0.95
    hemi.groundColor = new Color3(0.45, 0.52, 0.38)

    const sun = new DirectionalLight('sun', new Vector3(-0.72, -0.46, -0.5), this.scene)
    sun.position = new Vector3(34, 22, 24)
    sun.intensity = 1.8
  }

  private createStaticMap(): void {
    const groundMaterial = new StandardMaterial('ground-material', this.scene)
    groundMaterial.diffuseColor = new Color3(0.49, 0.6, 0.37)
    groundMaterial.specularColor = Color3.Black()
    groundMaterial.freeze()

    const obstacleMaterial = new StandardMaterial('obstacle-material', this.scene)
    obstacleMaterial.diffuseColor = new Color3(0.6, 0.54, 0.43)
    obstacleMaterial.specularColor = Color3.Black()
    obstacleMaterial.freeze()

    const ground = MeshBuilder.CreateBox('ground', { width: 400, height: 1, depth: 400 }, this.scene)
    ground.position.y = -0.5
    ground.material = groundMaterial
    ground.freezeWorldMatrix()

    for (const o of DEFAULT_OBSTACLES) {
      const obstacle = MeshBuilder.CreateBox(
        `obstacle-${o.cx}-${o.cy}-${o.cz}`,
        { width: o.sizeX, height: o.sizeY, depth: o.sizeZ },
        this.scene,
      )
      obstacle.position.set(o.cx, o.cy, o.cz)
      obstacle.material = obstacleMaterial
      obstacle.freezeWorldMatrix()
    }
  }

  private createRemoteMesh(id: number): RemoteMesh {
    const material = new StandardMaterial(`remote-material-${id}`, this.scene)
    material.diffuseColor = new Color3(1, 0.35, 0.35)
    material.specularColor = Color3.Black()
    material.freeze()

    const mesh = MeshBuilder.CreateCapsule(
      `remote-${id}`,
      { radius: 0.4, height: PLAYER_HEIGHT, tessellation: 8, subdivisions: 4 },
      this.scene,
    )
    mesh.material = material
    return { mesh, lastSeenMs: 0, mark: 0 }
  }

  private renderPlayers(nowMs: number): void {
    this.frameMark++

    const self = this.client.renderSelf(nowMs)
    if (self) {
      const eye = self.y + PLAYER_HEIGHT - 0.2
      this.cameraPosition.set(self.x, eye, self.z)
      this.camera.position.copyFrom(this.cameraPosition)
      this.camera.rotation.set(self.pitch, self.yaw + CAMERA_BACKWARD_YAW, 0)
    }

    this.client.remotes.forEach((player, id) => {
      let entry = this.remotes.get(id)
      if (!entry) {
        entry = this.createRemoteMesh(id)
        this.remotes.set(id, entry)
      }
      entry.lastSeenMs = nowMs
      entry.mark = this.frameMark
      this.remotePosition.set(player.x, player.y + PLAYER_HEIGHT / 2, player.z)
      entry.mesh.position.copyFrom(this.remotePosition)
      entry.mesh.rotation.y = player.yaw
    })

    for (const [id, entry] of this.remotes) {
      if (entry.mark !== this.frameMark && nowMs - entry.lastSeenMs > GRACE_MS) {
        entry.mesh.dispose(false, true)
        this.remotes.delete(id)
      }
    }
  }

  dispose(): void {
    this.disposed = true
    window.removeEventListener('resize', this.resize)
    this.engine.stopRenderLoop()
    this.input.dispose()
    this.client.dispose()
    gameStoreApi.getState().setConnectionStatus('disconnected')
    this.scene.dispose()
    this.engine.dispose()
  }
}
