import './style.css'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const createHeroScene = (canvas: HTMLCanvasElement, host: HTMLElement) => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0, 7.4)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // Studio lighting environment using PMREM
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmremGenerator.fromScene(room, 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.95
  room.dispose()
  pmremGenerator.dispose()

  // Real-time Studio Directional Lights for crisp specular ribbons and tactile edge rims
  // 1. Crisp key spotlight from top-right-front
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.8)
  keyLight.position.set(5.2, 6.2, 5.8)
  scene.add(keyLight)

  // 2. Cobalt rim light from behind-left (carves out silhouette bevels)
  const rimLight = new THREE.DirectionalLight(0x4068ff, 4.0)
  rimLight.position.set(-5.2, 3.0, -4.8)
  scene.add(rimLight)

  // 3. Soft neutral fill from front-left
  const fillLight = new THREE.DirectionalLight(0xedf2ff, 1.3)
  fillLight.position.set(-4.5, -1.8, 4.2)
  scene.add(fillLight)

  // 4. Subtle underfill bounce
  const bounceLight = new THREE.DirectionalLight(0xdde5ff, 0.8)
  bounceLight.position.set(1.5, -4.5, 2.0)
  scene.add(bounceLight)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55)
  scene.add(ambientLight)

  // Procedural soft contact shadow texture (subtle, clean, grounds the object)
  const createSoftShadowTexture = (): THREE.Texture => {
    const size = 512
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = size
    shadowCanvas.height = size
    const ctx = shadowCanvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      )
      gradient.addColorStop(0, 'rgba(10, 15, 30, 0.24)')
      gradient.addColorStop(0.28, 'rgba(10, 15, 30, 0.14)')
      gradient.addColorStop(0.58, 'rgba(10, 15, 30, 0.05)')
      gradient.addColorStop(0.85, 'rgba(10, 15, 30, 0.012)')
      gradient.addColorStop(1, 'rgba(10, 15, 30, 0)')

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
    }

    const texture = new THREE.CanvasTexture(shadowCanvas)
    texture.needsUpdate = true
    return texture
  }

  // Lusion Signature Tactile Materials:
  // 1. Pure Electric Cobalt Blue High-Gloss Lacquer (tuned for ACES tone mapping to stay true cobalt blue)
  const blueMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0648ff'),
    metalness: 0.05,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    ior: 1.52,
    sheen: 0.35,
    sheenRoughness: 0.22,
    sheenColor: new THREE.Color('#386eff'),
    envMapIntensity: 1.45,
  })

  // 2. Silky Ceramic Porcelain White (subtle warmth, pristine gloss)
  const whiteMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f8f9fd'),
    metalness: 0.02,
    roughness: 0.15,
    clearcoat: 0.95,
    clearcoatRoughness: 0.04,
    ior: 1.5,
    envMapIntensity: 1.3,
  })

  // 3. Mirror Obsidian Piano Black (sharp specular ribbons, zero muddiness)
  const blackMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#07080b'),
    metalness: 0.28,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    ior: 1.6,
    envMapIntensity: 1.4,
  })

  // 4. Chrome / Brushed Metal for coaxial socket contact pins
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e8ecf4'),
    metalness: 0.94,
    roughness: 0.14,
    envMapIntensity: 1.6,
  })

  // 5. Dark Titanium for white connector socket pins
  const darkTitaniumMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1f222b'),
    metalness: 0.88,
    roughness: 0.2,
    envMapIntensity: 1.25,
  })

  // Precision Lathed Modular Connector Arm Geometry (sleek, architectural proportions)
  const createArmGeometry = (radius = 0.33, length = 1.38) => {
    const points: THREE.Vector2[] = []
    const collarRadius = radius * 1.11
    const collarStart = length * 0.68
    const collarEnd = length * 0.82
    const rimLipRadius = radius * 0.6
    const socketDepth = 0.24

    // Smooth root blend into central hub
    points.push(new THREE.Vector2(0, 0))
    points.push(new THREE.Vector2(radius * 0.92, length * 0.14))
    points.push(new THREE.Vector2(radius, length * 0.28))

    // Shaft leading to modular collar
    points.push(new THREE.Vector2(radius, collarStart - 0.035))

    // Precision chamfered modular collar
    points.push(new THREE.Vector2(collarRadius, collarStart))
    points.push(new THREE.Vector2(collarRadius, collarEnd))
    points.push(new THREE.Vector2(radius, collarEnd + 0.035))

    // Shaft to tip rim
    points.push(new THREE.Vector2(radius, length - 0.065))

    // Smooth rounded outer rim fillet
    points.push(new THREE.Vector2(radius - 0.02, length - 0.015))
    points.push(new THREE.Vector2(radius - 0.055, length))

    // Flat socket rim lip
    points.push(new THREE.Vector2(rimLipRadius, length))

    // Recessed coaxial socket cavity (tactile modular plug socket)
    points.push(new THREE.Vector2(rimLipRadius - 0.02, length - 0.02))
    points.push(new THREE.Vector2(rimLipRadius - 0.025, length - socketDepth))
    points.push(new THREE.Vector2(0, length - socketDepth))

    const geometry = new THREE.LatheGeometry(points, 48)
    geometry.computeVertexNormals()
    return geometry
  }

  const createHubGeometry = (radius = 0.4) => {
    return new THREE.SphereGeometry(radius, 48, 36)
  }

  const createPinGeometry = (radius = 0.1, height = 0.2) => {
    return new THREE.CylinderGeometry(radius, radius, height, 32)
  }

  // Creates one complete 6-way modular connector piece with coaxial metallic socket pins
  const createModularPiece = (
    bodyMaterial: THREE.Material,
    pinMaterial: THREE.Material,
    scale = 1
  ) => {
    const group = new THREE.Group()
    const armGeom = createArmGeometry(0.33 * scale, 1.38 * scale)
    const hubGeom = createHubGeometry(0.4 * scale)
    const pinGeom = createPinGeometry(0.1 * scale, 0.2 * scale)

    const hub = new THREE.Mesh(hubGeom, bodyMaterial)
    hub.castShadow = true
    hub.receiveShadow = true
    group.add(hub)

    const armLength = 1.38 * scale
    const pinOffset = armLength - 0.13 * scale

    const orientations = [
      new THREE.Euler(0, 0, 0), // +Y
      new THREE.Euler(Math.PI, 0, 0), // -Y
      new THREE.Euler(0, 0, -Math.PI / 2), // +X
      new THREE.Euler(0, 0, Math.PI / 2), // -X
      new THREE.Euler(Math.PI / 2, 0, 0), // +Z
      new THREE.Euler(-Math.PI / 2, 0, 0), // -Z
    ]

    orientations.forEach((euler) => {
      const arm = new THREE.Mesh(armGeom, bodyMaterial)
      arm.rotation.copy(euler)
      arm.castShadow = true
      arm.receiveShadow = true
      group.add(arm)

      const pin = new THREE.Mesh(pinGeom, pinMaterial)
      const dir = new THREE.Vector3(0, 1, 0).applyEuler(euler)
      pin.position.copy(dir.clone().multiplyScalar(pinOffset))
      pin.rotation.copy(euler)
      pin.castShadow = true
      pin.receiveShadow = true
      group.add(pin)
    })

    return group
  }

  // Master assembly: A choreographed sculptural installation
  const assembly = new THREE.Group()
  const baseRotationX = -0.18
  const baseRotationY = 0.46
  assembly.rotation.set(baseRotationX, baseRotationY, 0)
  scene.add(assembly)

  // 1. Primary Hero Piece: Electric Cobalt Blue Cross
  const heroBlue = createModularPiece(blueMaterial, chromeMaterial, 1.0)
  heroBlue.rotation.set(0.32, 0.48, 0.14)
  assembly.add(heroBlue)

  // 2. Secondary Satellite Piece: Porcelain White Cross (nesting above-left)
  const satelliteWhite = createModularPiece(whiteMaterial, darkTitaniumMaterial, 0.52)
  satelliteWhite.position.set(-1.32, 1.22, -0.55)
  satelliteWhite.rotation.set(-0.46, 0.88, 0.42)
  assembly.add(satelliteWhite)

  // 3. Secondary Satellite Piece: Obsidian Piano Black Cross (nesting below-right)
  const satelliteBlack = createModularPiece(blackMaterial, chromeMaterial, 0.44)
  satelliteBlack.position.set(1.26, -1.08, 0.45)
  satelliteBlack.rotation.set(0.38, -0.68, -0.32)
  assembly.add(satelliteBlack)

  // 4. Subtle floating precision accents (depth, motion parallax, luxury studio craft)
  const ringGeom = new THREE.TorusGeometry(0.24, 0.032, 24, 48)
  const floatingRing = new THREE.Mesh(ringGeom, chromeMaterial)
  floatingRing.position.set(-1.08, -0.78, 0.62)
  floatingRing.rotation.set(Math.PI / 3, -0.25, 0.55)
  assembly.add(floatingRing)

  const pinAccentGeom = new THREE.CylinderGeometry(0.085, 0.085, 0.22, 32)
  const floatingPin = new THREE.Mesh(pinAccentGeom, darkTitaniumMaterial)
  floatingPin.position.set(0.96, 1.32, -0.42)
  floatingPin.rotation.set(0.65, 0.42, 0.85)
  assembly.add(floatingPin)

  // 5. Feathered contact shadow disk directly under the floating cluster
  const shadowTexture = createSoftShadowTexture()
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  })
  const shadowDisk = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.3), shadowMaterial)
  shadowDisk.rotation.x = -Math.PI / 2
  shadowDisk.position.set(0, -2.05, -0.2)
  assembly.add(shadowDisk)

  // Interactive state
  const pointerTarget = new THREE.Vector2()
  const pointer = new THREE.Vector2()
  let isDragging = false
  let prevPointerX = 0
  let prevPointerY = 0
  let dragVelocityX = 0
  let dragVelocityY = 0
  let manualRotX = 0
  let manualRotY = 0
  let baseX = 1.6
  let baseY = 0.02

  const onPointerMove = (event: PointerEvent) => {
    pointerTarget.set(
      (event.clientX / window.innerWidth - 0.5) * 2,
      (event.clientY / window.innerHeight - 0.5) * 2
    )

    if (isDragging) {
      const deltaX = (event.clientX - prevPointerX) * 0.005
      const deltaY = (event.clientY - prevPointerY) * 0.005
      dragVelocityX = deltaX
      dragVelocityY = deltaY
      manualRotY += deltaX
      manualRotX += deltaY
      prevPointerX = event.clientX
      prevPointerY = event.clientY
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    isDragging = true
    prevPointerX = event.clientX
    prevPointerY = event.clientY
    dragVelocityX = 0
    dragVelocityY = 0
  }

  const onPointerUp = () => {
    isDragging = false
  }

  const updateSize = () => {
    const width = host.clientWidth || window.innerWidth
    const height = host.clientHeight || window.innerHeight

    if (!width || !height) {
      return
    }

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)

    // Accurate perspective positioning based on camera frustum
    const vFovRad = (camera.fov * Math.PI) / 180
    const halfHeight = Math.tan(vFovRad / 2) * camera.position.z
    const halfWidth = halfHeight * camera.aspect

    if (camera.aspect >= 1.2 && width > 960) {
      // Desktop: positioned cleanly in the right half of the viewport
      baseX = halfWidth * 0.44
      baseY = -halfHeight * 0.05
      assembly.scale.setScalar(Math.min(0.95, halfHeight * 0.36))
    } else if (camera.aspect >= 0.85 && width > 760) {
      // Tablet / medium viewport
      baseX = halfWidth * 0.34
      baseY = 0
      assembly.scale.setScalar(Math.min(0.8, halfHeight * 0.33))
    } else {
      // Mobile: Crowned proudly in the upper hero area above copy
      baseX = 0
      baseY = halfHeight * 0.38
      assembly.scale.setScalar(Math.min(0.34, halfWidth * 0.25))
    }

    assembly.position.set(baseX, baseY, 0)
  }

  const resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(host)
  window.addEventListener('resize', updateSize, { passive: true })
  updateSize()

  const startTime = performance.now()

  const render = () => {
    const elapsed = (performance.now() - startTime) * 0.001

    // Smooth inertia decay on drag release
    if (!isDragging) {
      dragVelocityX *= 0.94
      dragVelocityY *= 0.94
      manualRotY += dragVelocityX
      manualRotX += dragVelocityY
    }

    pointer.lerp(pointerTarget, 0.045)

    // Slow, majestic continuous orbital rotation + subtle mouse tilt
    assembly.rotation.x =
      baseRotationX +
      manualRotX +
      Math.sin(elapsed * 0.2) * 0.045 +
      pointer.y * 0.15
    assembly.rotation.y =
      baseRotationY +
      elapsed * 0.13 +
      manualRotY +
      pointer.x * 0.3
    assembly.rotation.z = Math.sin(elapsed * 0.15) * 0.03

    // Subtle parallax translation
    assembly.position.x = baseX + pointer.x * 0.12
    assembly.position.y =
      baseY + Math.sin(elapsed * 0.75) * 0.05 - pointer.y * 0.08

    // Satellite harmonic floating breathing
    satelliteWhite.rotation.y = 0.88 + Math.sin(elapsed * 0.24) * 0.07
    satelliteWhite.position.y = 1.22 + Math.sin(elapsed * 0.55) * 0.035
    satelliteBlack.rotation.y = -0.68 + Math.cos(elapsed * 0.2 + 1.2) * 0.06
    satelliteBlack.position.y = -1.08 + Math.cos(elapsed * 0.5) * 0.03

    floatingRing.rotation.x += 0.005
    floatingRing.rotation.y += 0.007
    floatingPin.rotation.y += 0.006

    // Specular light tracking: keylight moves slightly with cursor to ripple highlights
    keyLight.position.x = 5.2 + pointer.x * 0.8
    keyLight.position.y = 6.2 - pointer.y * 0.6

    renderer.render(scene, camera)
  }

  const loop = () => {
    render()
    window.requestAnimationFrame(loop)
  }

  if (prefersReducedMotion) {
    render()
  } else {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    loop()
  }
}

const canvas = document.querySelector<HTMLCanvasElement>('canvas.webgl')
const hero = canvas?.parentElement

if (canvas && hero) {
  createHeroScene(canvas, hero)
}

const menu = document.querySelector<HTMLElement>('.menu-overlay')
const menuButton = document.querySelector<HTMLButtonElement>('.menu-btn')
const menuClose = document.querySelector<HTMLButtonElement>('.menu-close')
const menuLinks = menu?.querySelectorAll<HTMLAnchorElement>('.menu-nav a')
const header = document.querySelector<HTMLElement>('.site-header')
const contact = document.querySelector<HTMLElement>('.contact')

let lenis: Lenis | null = null

if (!prefersReducedMotion) {
  lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    touchMultiplier: 1.1,
  })
}

const setMenu = (open: boolean, restoreFocus = true) => {
  if (!menu || !menuButton) {
    return
  }

  menu.classList.toggle('is-open', open)
  menu.setAttribute('aria-hidden', String(!open))
  menu.inert = !open
  menuButton.setAttribute('aria-expanded', String(open))
  document.documentElement.classList.toggle('menu-open', open)

  if (open) {
    lenis?.stop()

    if (menuLinks && !prefersReducedMotion) {
      gsap.fromTo(
        menuLinks,
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.07, delay: 0.12 }
      )
    }

    window.requestAnimationFrame(() => menuClose?.focus({ preventScroll: true }))
  } else {
    lenis?.start()

    if (restoreFocus) {
      menuButton.focus({ preventScroll: true })
    }
  }
}

if (menu) {
  menu.inert = true
}

menuButton?.addEventListener('click', () => setMenu(true))
menuClose?.addEventListener('click', () => setMenu(false))

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.classList.contains('is-open')) {
    setMenu(false)
  }
})

const updateHeaderTheme = () => {
  if (!header || !contact) {
    return
  }

  const headerHeight = header.offsetHeight || 80
  const contactBounds = contact.getBoundingClientRect()
  const isInverted = contactBounds.top <= headerHeight && contactBounds.bottom > 0
  header.classList.toggle('is-inverted', isInverted)
}

window.addEventListener('scroll', updateHeaderTheme, { passive: true })
window.addEventListener('resize', updateHeaderTheme)
updateHeaderTheme()

document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href')

    if (!href || href === '#') {
      return
    }

    const target = document.querySelector<HTMLElement>(href)

    if (!target) {
      return
    }

    event.preventDefault()

    if (menu?.classList.contains('is-open')) {
      setMenu(false, false)
    }

    if (lenis) {
      lenis.scrollTo(target, { duration: 1.2 })
    } else {
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    }
  })
})

if (!prefersReducedMotion) {
  gsap.registerPlugin(ScrollTrigger)

  lenis?.on('scroll', () => ScrollTrigger.update())

  if (lenis) {
    gsap.ticker.add((time) => {
      lenis?.raf(time * 1000)
    })
    gsap.ticker.lagSmoothing(0)
  }

  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
    gsap.fromTo(
      element,
      { y: 34, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.05,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 90%',
          once: true,
        },
      }
    )
  })
}
