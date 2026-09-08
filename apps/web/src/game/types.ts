import type * as THREE from 'three'

/** 3 次元位置・回転などに使う [x, y, z] タプル。 */
export type Vec3 = [number, number, number]

/** R3F の position prop は THREE.Vector3 由来の型を受け付ける。 */
export type Position = THREE.Vector3Tuple
