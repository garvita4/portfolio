import '/style.css'
import * as THREE from 'three'

// Basic Three.js setup
const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Temporary test object (we will replace this later)
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshNormalMaterial()
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Animation loop
const tick = () => {
  mesh.rotation.x += 0.01
  mesh.rotation.y += 0.01

  renderer.render(scene, camera)
  window.requestAnimationFrame(tick)
}

tick()