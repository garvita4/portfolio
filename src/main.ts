import './style.css'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const createHeroScene = (canvas: HTMLCanvasElement, host: HTMLElement) => {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(0, 0, 6.4)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmremGenerator.fromScene(room, 0.06)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.85
  room.dispose()
  pmremGenerator.dispose()

  const group = new THREE.Group()
  group.rotation.set(-0.16, 0.28, 0)
  scene.add(group)

  const knotGeometry = new THREE.TorusKnotGeometry(1.04, 0.31, 220, 36, 2, 3)
  const knotMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1a2ffb'),
    metalness: 0.18,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.35,
  })
  const knot = new THREE.Mesh(knotGeometry, knotMaterial)
  group.add(knot)

  const ringGeometry = new THREE.TorusGeometry(1.86, 0.008, 8, 180)
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x08080a,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.rotation.set(Math.PI / 2.6, 0.35, 0)
  group.add(ring)

  const blueRingGeometry = new THREE.TorusGeometry(2.12, 0.006, 8, 180)
  const blueRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x1a2ffb,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  })
  const blueRing = new THREE.Mesh(blueRingGeometry, blueRingMaterial)
  blueRing.rotation.set(Math.PI / 1.75, -0.3, 0.4)
  group.add(blueRing)

  const particleCount = 120
  const particlePositions = new Float32Array(particleCount * 3)

  for (let index = 0; index < particleCount; index += 1) {
    const radius = 1.6 + Math.random() * 1.9
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    particlePositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    particlePositions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    particlePositions[index * 3 + 2] = radius * Math.cos(phi)
  }

  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))

  const particleMaterial = new THREE.PointsMaterial({
    color: 0x1a2ffb,
    size: 0.026,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const particles = new THREE.Points(particleGeometry, particleMaterial)
  group.add(particles)

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4)
  keyLight.position.set(4, 6, 5)
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0x6d7bff, 4.2)
  rimLight.position.set(-5, -2, -4)
  scene.add(rimLight)

  const pointerTarget = new THREE.Vector2()
  const pointer = new THREE.Vector2()
  let baseX = 0
  let baseY = 0

  const onPointerMove = (event: PointerEvent) => {
    pointerTarget.set(
      (event.clientX / window.innerWidth - 0.5) * 2,
      (event.clientY / window.innerHeight - 0.5) * 2
    )
  }

  const updateSize = () => {
    const width = host.clientWidth
    const height = host.clientHeight

    if (!width || !height) {
      return
    }

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)

    if (width > 980) {
      baseX = 1.62
      baseY = 0.04
      group.scale.setScalar(1)
    } else if (width > 640) {
      baseX = 0.92
      baseY = 0.22
      group.scale.setScalar(0.84)
    } else {
      baseX = 0.46
      baseY = 0.46
      group.scale.setScalar(0.7)
    }

    group.position.set(baseX, baseY, 0)
  }

  const resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(host)
  updateSize()

  const clock = new THREE.Clock()

  const render = () => {
    const elapsed = clock.getElapsedTime()

    pointer.lerp(pointerTarget, 0.045)

    knot.rotation.x = elapsed * 0.11 + pointer.y * 0.26
    knot.rotation.y = elapsed * 0.17 + pointer.x * 0.42
    group.rotation.z = Math.sin(elapsed * 0.32) * 0.045
    group.position.x = baseX + pointer.x * 0.14
    group.position.y = baseY + Math.sin(elapsed * 0.9) * 0.055 + pointer.y * -0.08
    ring.rotation.z = elapsed * 0.05
    blueRing.rotation.z = -elapsed * 0.04
    particles.rotation.y = -elapsed * 0.025
    particles.rotation.x = pointer.y * 0.08

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

  document.fonts.ready.then(() => ScrollTrigger.refresh())
}
