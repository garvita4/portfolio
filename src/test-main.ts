import {
  ACESFilmicToneMapping,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

type CameraPoint = {
  scroll: number
  x: number
  look: number
}

type GalleryState = {
  camX: number
  look: number
  pointerX: number
  pointerY: number
  time: number
  delta: number
  compact: boolean
}

type StationHandle = {
  x: number
  group: Group
  baseScale: number
  active: number
  update: (time: number, motion: number) => void
}

const query = <T extends Element>(selector: string): T => {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element as T;
};
var clamp = MathUtils.clamp;
var lerp = MathUtils.lerp;
var damp = (current: number, target: number, lambda: number, delta: number): number => lerp(current, target, 1 - Math.exp(-lambda * delta));
var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
var canvas = query<HTMLCanvasElement>(".webgl");
var contactSection = query<HTMLElement>("#contact");
var cursorDot = query<HTMLElement>(".cursor-dot");
var cursorRing = query<HTMLElement>(".cursor-ring");
var scrollProgress = query<HTMLElement>("#scroll-progress");
var sceneSections = Array.from(document.querySelectorAll<HTMLElement>("[data-cam-x]"));
var cameraPoints: CameraPoint[] = [];
var galleryUpdate: ((state: GalleryState) => void) | null = null;
var getMaxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
var buildCameraPath = (): void => {
  const maxScroll = getMaxScroll();
  cameraPoints = sceneSections.map((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    const center = top + element.offsetHeight * 0.5 - window.innerHeight * 0.5;
    return {
      scroll: clamp(center, 0, maxScroll),
      x: Number(element.dataset.camX ?? 0),
      look: Number(element.dataset.camLook ?? 0)
    };
  });
};
var sampleCamera = (scrollY: number): { x: number; look: number } => {
  if (cameraPoints.length === 0) {
    return { x: 0, look: 0 };
  }
  const first = cameraPoints[0];
  if (scrollY <= first.scroll) {
    return { x: first.x, look: first.look };
  }
  const last = cameraPoints[cameraPoints.length - 1];
  if (scrollY >= last.scroll) {
    return { x: last.x, look: last.look };
  }
  for (let index = 0; index < cameraPoints.length - 1; index += 1) {
    const start = cameraPoints[index];
    const end = cameraPoints[index + 1];
    if (scrollY >= start.scroll && scrollY <= end.scroll) {
      const span = Math.max(1, end.scroll - start.scroll);
      const progress = clamp((scrollY - start.scroll) / span, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      return {
        x: lerp(start.x, end.x, eased),
        look: lerp(start.look, end.look, eased)
      };
    }
  }
  return { x: last.x, look: last.look };
};
var initGallery = (): ((state: GalleryState) => void) => {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const scene = new Scene();
  const paper = new Color(15790586);
  scene.background = paper;
  scene.fog = new FogExp2(paper, 0.0125);
  const camera = new PerspectiveCamera(
    36,
    window.innerWidth / window.innerHeight,
    0.1,
    240
  );
  camera.position.set(0, 2.2, 9.6);
  const pmremGenerator = new PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  scene.environment = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
  scene.environmentIntensity = 0.82;
  roomEnvironment.dispose();
  pmremGenerator.dispose();
  const hemisphere = new HemisphereLight(16777215, 14210510, 1.55);
  scene.add(hemisphere);
  const lightRig = new Group();
  scene.add(lightRig);
  const keyLight = new DirectionalLight(16777215, 3.7);
  keyLight.position.set(4.5, 11, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(window.innerWidth < 820 ? 1024 : 2048, window.innerWidth < 820 ? 1024 : 2048);
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 38;
  keyLight.shadow.bias = -4e-4;
  keyLight.shadow.normalBias = 0.04;
  lightRig.add(keyLight, keyLight.target);
  const fillLight = new DirectionalLight(9544447, 2.1);
  fillLight.position.set(-7, 5, 5);
  lightRig.add(fillLight, fillLight.target);
  const rimLight = new DirectionalLight(16765117, 1.8);
  rimLight.position.set(2, 4, -8);
  lightRig.add(rimLight, rimLight.target);
  const ground = new Mesh(
    new PlaneGeometry(280, 70),
    new MeshStandardMaterial({
      color: 15198449,
      roughness: 1,
      metalness: 0
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.55;
  ground.receiveShadow = true;
  scene.add(ground);
  const mesh = (geometry: BufferGeometry, material: Material): Mesh => {
    const object = new Mesh(geometry, material);
    object.castShadow = true;
    object.receiveShadow = true;
    return object;
  };
  const chrome = new MeshPhysicalMaterial({
    color: 16777215,
    metalness: 1,
    roughness: 0.11,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    iridescence: 1,
    iridescenceIOR: 1.35,
    iridescenceThicknessMinimum: 100,
    iridescenceThicknessMaximum: 520,
    envMapIntensity: 1.35
  });
  const chromeBlue = chrome.clone();
  chromeBlue.color.set(14476031);
  const blackChrome = new MeshPhysicalMaterial({
    color: 328968,
    metalness: 1,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2
  });
  const blueShell = new MeshPhysicalMaterial({
    color: 1716219,
    metalness: 0.3,
    roughness: 0.26,
    clearcoat: 0.9,
    clearcoatRoughness: 0.16
  });
  const keyMaterial = new MeshPhysicalMaterial({
    color: 15987176,
    metalness: 0.04,
    roughness: 0.34,
    clearcoat: 0.55
  });
  const darkMaterial = new MeshPhysicalMaterial({
    color: 1184538,
    metalness: 0.5,
    roughness: 0.26,
    clearcoat: 0.8
  });
  const aluminium = new MeshPhysicalMaterial({
    color: 14145490,
    metalness: 0.9,
    roughness: 0.22,
    clearcoat: 0.75
  });
  const screenMaterial = new MeshStandardMaterial({
    color: 12713728,
    emissive: 5995520,
    emissiveIntensity: 1.1,
    roughness: 0.4
  });
  const orangeScreen = new MeshStandardMaterial({
    color: 16739125,
    emissive: 7021568,
    emissiveIntensity: 0.9,
    roughness: 0.4
  });
  const createPlinth = (color: number): Group => {
    const group = new Group();
    const base = mesh(
      new CylinderGeometry(3.05, 3.05, 1, 96),
      new MeshPhysicalMaterial({
        color,
        metalness: 0.12,
        roughness: 0.3,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2
      })
    );
    base.position.y = -1.05;
    const top = mesh(
      new CylinderGeometry(2.72, 2.72, 0.06, 96),
      new MeshPhysicalMaterial({
        color: 15790586,
        metalness: 0.1,
        roughness: 0.4,
        clearcoat: 0.55
      })
    );
    top.position.y = -0.52;
    const ring = new Mesh(
      new RingGeometry(2.75, 2.8, 96),
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: DoubleSide
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.488;
    group.add(base, top, ring);
    return group;
  };
  const stations: StationHandle[] = [];
  const addStation = (
    x: number,
    color: number,
    group: Group,
    y: number,
    baseScale: number,
    update: (time: number, motion: number) => void,
  ): void => {
    const plinth = createPlinth(color);
    plinth.position.x = x;
    scene.add(plinth);
    group.position.set(x, y, 0);
    group.scale.setScalar(baseScale);
    scene.add(group);
    stations.push({ x, group, baseScale, active: 0, update });
  };
  const bloomGroup = new Group();
  const bloomPetals = new Group();
  const bloomCore = mesh(new IcosahedronGeometry(0.52, 5), chrome);
  bloomPetals.add(bloomCore);
  const petalCount = 11;
  for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
    const angle = petalIndex / petalCount * Math.PI * 2;
    const points = [];
    for (let step = 0; step <= 22; step += 1) {
      const t = step / 22;
      const spread = 0.34 + 2.2 * Math.sin(t * Math.PI * 0.9);
      const twist = angle + t * 1.15;
      points.push(
        new Vector3(
          Math.cos(twist) * spread,
          -0.95 + t * 2.15,
          Math.sin(twist) * spread
        )
      );
    }
    const curve = new CatmullRomCurve3(points);
    const tube = mesh(
      new TubeGeometry(curve, 64, 0.083, 12, false),
      petalIndex % 3 === 0 ? chromeBlue : chrome
    );
    bloomPetals.add(tube);
    const tip = mesh(new SphereGeometry(0.105, 20, 20), chrome);
    tip.position.copy(points[points.length - 1]);
    bloomPetals.add(tip);
  }
  bloomCore.position.y = -0.15;
  bloomGroup.add(bloomPetals);
  const baseRing = mesh(new TorusGeometry(0.92, 0.032, 12, 96), chrome);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = -0.9;
  bloomGroup.add(baseRing);
  const orbitGroup = new Group();
  const orbitGeometry = new SphereGeometry(0.115, 20, 20);
  for (let orbitIndex = 0; orbitIndex < 5; orbitIndex += 1) {
    const orbitAngle = orbitIndex / 5 * Math.PI * 2;
    const orbiter = mesh(orbitGeometry, orbitIndex % 2 === 0 ? chromeBlue : chrome);
    orbiter.position.set(
      Math.cos(orbitAngle) * (1.95 + orbitIndex * 0.09),
      0.15 + Math.sin(orbitAngle * 2) * 0.32,
      Math.sin(orbitAngle) * (1.95 + orbitIndex * 0.09)
    );
    orbitGroup.add(orbiter);
  }
  bloomGroup.add(orbitGroup);
  addStation(0, 1716219, bloomGroup, 1.35, 1, (time, motion) => {
    const t = time * motion;
    bloomPetals.rotation.y = t * 0.055;
    bloomPetals.rotation.x = Math.sin(t * 0.22) * 0.035;
    bloomCore.rotation.y = t * 0.2;
    orbitGroup.rotation.y = -t * 0.12;
  });
  const keyboardGroup = new Group();
  const keyboardHalfGeometry = new RoundedBoxGeometry(2.05, 0.22, 1.35, 5, 0.09);
  const keyboardWristGeometry = new RoundedBoxGeometry(2.05, 0.11, 0.56, 4, 0.08);
  const keyGeometry = new RoundedBoxGeometry(0.24, 0.09, 0.23, 3, 0.03);
  for (const side of [-1, 1]) {
    const half = new Group();
    const base = mesh(keyboardHalfGeometry, blueShell);
    half.add(base);
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const key = mesh(keyGeometry, keyMaterial);
        key.position.set((column - 2.5) * 0.3, 0.145, (row - 1.5) * 0.27);
        key.castShadow = false;
        half.add(key);
      }
    }
    const wrist = mesh(keyboardWristGeometry, darkMaterial);
    wrist.position.set(0, -0.02, 0.97);
    half.add(wrist);
    half.position.x = side * 1.18;
    half.rotation.z = side * -0.12;
    half.rotation.y = side * 0.12;
    keyboardGroup.add(half);
  }
  keyboardGroup.rotation.x = 0.08;
  addStation(11, 1716219, keyboardGroup, 0.62, 1.2, (time, motion) => {
    const t = time * motion;
    keyboardGroup.rotation.y = -0.04 + Math.sin(t * 0.32) * 0.08;
    keyboardGroup.rotation.x = 0.08 + Math.sin(t * 0.27) * 0.018;
  });
  const roadsGroup = new Group();
  const slab = mesh(
    new RoundedBoxGeometry(3.8, 0.16, 2.55, 5, 0.08),
    new MeshPhysicalMaterial({
      color: 1053210,
      metalness: 0.58,
      roughness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15
    })
  );
  slab.position.y = -0.2;
  roadsGroup.add(slab);
  const contourPositions = [];
  for (let x = -1.7; x <= 1.7; x += 0.34) {
    contourPositions.push(x, 0.012, -1.15, x, 0.012, 1.15);
  }
  for (let z = -1.1; z <= 1.1; z += 0.28) {
    contourPositions.push(-1.7, 0.012, z, 1.7, 0.012, z);
  }
  const contourGeometry = new BufferGeometry();
  contourGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(contourPositions, 3)
  );
  const contours = new LineSegments(
    contourGeometry,
    new LineBasicMaterial({
      color: 10200264,
      transparent: true,
      opacity: 0.34
    })
  );
  roadsGroup.add(contours);
  const routeGroup = new Group();
  routeGroup.position.y = 0.08;
  const routeSpecs = [
    {
      color: 1716219,
      points: [
        [-1.65, -0.95],
        [-1.1, -0.25],
        [-0.55, 0.15],
        [0.05, -0.35],
        [0.72, 0.55],
        [1.62, 0.15]
      ]
    },
    {
      color: 16739125,
      points: [
        [-1.55, 0.92],
        [-0.92, 0.2],
        [-0.18, 0.62],
        [0.52, 0.05],
        [1.45, -0.78]
      ]
    },
    {
      color: 12713728,
      points: [
        [-1.2, 1.02],
        [-0.38, 0.78],
        [0.12, 0.18],
        [0.88, -0.12],
        [1.5, -0.88]
      ]
    }
  ];
  for (const route of routeSpecs) {
    const points = route.points.map(
      ([x, z], index) => new Vector3(x, 0.025 + Math.sin(index * 1.7) * 0.04, z)
    );
    const curve = new CatmullRomCurve3(points);
    const line = new Mesh(
      new TubeGeometry(curve, 90, 0.022, 6, false),
      new MeshBasicMaterial({ color: route.color })
    );
    routeGroup.add(line);
    for (const point of [points[0], points[points.length - 1]]) {
      const marker = new Mesh(
        new SphereGeometry(0.055, 16, 16),
        new MeshBasicMaterial({ color: route.color })
      );
      marker.position.copy(point);
      routeGroup.add(marker);
    }
  }
  roadsGroup.add(routeGroup);
  addStation(23, 16739125, roadsGroup, 0.92, 1, (time, motion) => {
    const t = time * motion;
    roadsGroup.rotation.y = Math.sin(t * 0.25) * 0.16;
    routeGroup.position.y = 0.08 + Math.sin(t * 0.7) * 0.018;
  });
  const voidGroup = new Group();
  const voidCore = mesh(new IcosahedronGeometry(1.24, 1), blackChrome);
  const voidWireMaterial = new LineBasicMaterial({
    color: 16731201,
    transparent: true,
    opacity: 0.88
  });
  const voidWire = new LineSegments(
    new EdgesGeometry(new IcosahedronGeometry(1.7, 1)),
    voidWireMaterial
  );
  const orbitRingA = new Mesh(
    new TorusGeometry(2.08, 0.018, 10, 160),
    new MeshBasicMaterial({ color: 16731201 })
  );
  orbitRingA.rotation.x = Math.PI / 2.55;
  orbitRingA.rotation.z = 0.22;
  const orbitRingB = new Mesh(
    new TorusGeometry(2.32, 0.012, 10, 160),
    new MeshBasicMaterial({ color: 9147319, transparent: true, opacity: 0.7 })
  );
  orbitRingB.rotation.x = Math.PI / 3.1;
  orbitRingB.rotation.y = 0.7;
  voidGroup.add(voidCore, voidWire, orbitRingA, orbitRingB);
  addStation(35, 16731201, voidGroup, 1.18, 1, (time, motion) => {
    const t = time * motion;
    voidCore.rotation.y = t * 0.22;
    voidCore.rotation.x = t * 0.09;
    voidWire.rotation.y = -t * 0.15;
    orbitRingA.rotation.z = 0.22 + t * 0.09;
    orbitRingB.rotation.y = 0.7 - t * 0.06;
  });
  const synthGroup = new Group();
  const synthModuleGeometry = new RoundedBoxGeometry(2.9, 0.52, 1.8, 5, 0.12);
  const knobGeometry = new CylinderGeometry(0.1, 0.1, 0.1, 24);
  const displayGeometry = new RoundedBoxGeometry(0.88, 0.22, 0.025, 4, 0.025);
  for (let moduleIndex = 0; moduleIndex < 3; moduleIndex += 1) {
    const module = mesh(
      synthModuleGeometry,
      moduleIndex === 1 ? darkMaterial : aluminium
    );
    module.position.y = moduleIndex * 0.63;
    synthGroup.add(module);
    for (let knobIndex = 0; knobIndex < 4; knobIndex += 1) {
      const knob = mesh(knobGeometry, darkMaterial);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(-1.02 + knobIndex * 0.46, moduleIndex * 0.63 + 0.04, 0.93);
      knob.castShadow = false;
      synthGroup.add(knob);
    }
    if (moduleIndex === 1) {
      const display = new Mesh(displayGeometry, screenMaterial);
      display.position.set(0.7, moduleIndex * 0.63 + 0.03, 0.925);
      synthGroup.add(display);
    }
    if (moduleIndex === 2) {
      const indicator = new Mesh(displayGeometry, orangeScreen);
      indicator.scale.set(0.48, 0.6, 1);
      indicator.position.set(-0.76, moduleIndex * 0.63 + 0.03, 0.925);
      synthGroup.add(indicator);
    }
  }
  addStation(47, 12713728, synthGroup, 0.55, 1, (time, motion) => {
    const t = time * motion;
    synthGroup.rotation.y = -0.15 + Math.sin(t * 0.3) * 0.075;
    synthGroup.rotation.x = 0.02 + Math.sin(t * 0.25) * 0.012;
  });
  const resize = () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    keyLight.shadow.mapSize.set(
      window.innerWidth < 820 ? 1024 : 2048,
      window.innerWidth < 820 ? 1024 : 2048
    );
    keyLight.shadow.map?.dispose();
    keyLight.shadow.map = null;
  };
  window.addEventListener("resize", resize);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    document.body.classList.add("no-webgl");
  });
  return (state: GalleryState): void => {
    const { camX, look, pointerX, pointerY, time, delta, compact } = state;
    const motion = prefersReducedMotion ? 0 : 1;
    const fov = compact ? 42 : 36;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const cameraY = compact ? 2.42 : 2.2;
    const lookY = compact ? -3.8 : 0.92;
    const cameraZ = compact ? 18.5 : 9.6;
    const parallax = compact || prefersReducedMotion ? 0 : 1;
    camera.position.x = camX + pointerX * 0.42 * parallax;
    camera.position.y = cameraY + pointerY * 0.12 * parallax;
    camera.position.z = cameraZ;
    camera.lookAt(camX + (compact ? 0 : look), lookY, 0);
    lightRig.position.x = camX;
    for (const station of stations) {
      const distance = Math.abs(camX - station.x);
      const target = 1 - clamp(distance / 7, 0, 1);
      station.active = damp(station.active, target, 4, delta);
      station.group.scale.setScalar(station.baseScale * (1 + station.active * 0.028));
      station.update(time, motion);
    }
    renderer.render(scene, camera);
  };
};
try {
  galleryUpdate = initGallery();
} catch {
  document.body.classList.add("no-webgl");
}
buildCameraPath();
window.addEventListener("load", buildCameraPath);
window.addEventListener("resize", buildCameraPath);
document.fonts.ready.then(buildCameraPath);
if ("ResizeObserver" in window) {
  const pathObserver = new ResizeObserver(buildCameraPath);
  pathObserver.observe(document.body);
}
var revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
);
for (const element of document.querySelectorAll(".reveal")) {
  revealObserver.observe(element);
}
var revealSite = () => {
  window.requestAnimationFrame(() => document.body.classList.add("is-ready"));
};
Promise.race([
  document.fonts.ready,
  new Promise((resolve) => window.setTimeout(resolve, 1e3))
]).then(revealSite);
if (finePointer && !coarsePointer) {
  const pointerState = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    ringX: window.innerWidth / 2,
    ringY: window.innerHeight / 2,
    hasMoved: false
  };
  window.addEventListener("pointermove", (event) => {
    pointerState.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerState.y = -(event.clientY / window.innerHeight - 0.5) * 2;
    pointerState.targetX = event.clientX;
    pointerState.targetY = event.clientY;
    pointerState.hasMoved = true;
    document.body.classList.add("has-pointer");
    cursorDot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  });
  document.documentElement.addEventListener("mouseleave", () => {
    document.body.classList.remove("has-pointer");
  });
  const labelFor = (element: HTMLElement): string => {
    const href = element.getAttribute("href") ?? "";
    if (element.dataset.cursor) return element.dataset.cursor;
    if (href.startsWith("mailto:")) return "Write";
    if (href === "#top") return "Top";
    if (href.startsWith("#")) return "Go";
    return "Open";
  };
  for (const element of document.querySelectorAll<HTMLElement>("a, button")) {
    element.addEventListener("mouseenter", () => {
      cursorRing.dataset.label = labelFor(element);
      cursorRing.classList.add("has-label");
    });
    element.addEventListener("mouseleave", () => {
      cursorRing.classList.remove("has-label");
    });
  }
  const cursorLoop = () => {
    window.requestAnimationFrame(cursorLoop);
    if (!pointerState.hasMoved) return;
    pointerState.ringX = damp(pointerState.ringX, pointerState.targetX, 15, 1 / 60);
    pointerState.ringY = damp(pointerState.ringY, pointerState.targetY, 15, 1 / 60);
    cursorRing.style.transform = `translate3d(${pointerState.ringX}px, ${pointerState.ringY}px, 0)`;
  };
  cursorLoop();
}
var previousTime = performance.now();
var smoothScroll = window.scrollY;
var pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
if (finePointer && !coarsePointer) {
  window.addEventListener("pointermove", (event) => {
    pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.targetY = -(event.clientY / window.innerHeight - 0.5) * 2;
  });
}
var frame = (now: number): void => {
  window.requestAnimationFrame(frame);
  const delta = Math.min((now - previousTime) / 1e3, 0.05);
  previousTime = now;
  const targetScroll = window.scrollY;
  smoothScroll = prefersReducedMotion ? targetScroll : damp(smoothScroll, targetScroll, 10, delta);
  if (finePointer && !coarsePointer && !prefersReducedMotion) {
    pointer.x = damp(pointer.x, pointer.targetX, 5, delta);
    pointer.y = damp(pointer.y, pointer.targetY, 5, delta);
  } else {
    pointer.x = 0;
    pointer.y = 0;
  }
  const cameraState = sampleCamera(smoothScroll);
  const compact = window.innerWidth <= 820;
  if (galleryUpdate) {
    galleryUpdate({
      camX: cameraState.x,
      look: cameraState.look,
      pointerX: pointer.x,
      pointerY: pointer.y,
      time: now / 1e3,
      delta,
      compact
    });
  }
  const maxScroll = getMaxScroll();
  const progress = maxScroll > 0 ? clamp(smoothScroll / maxScroll, 0, 1) : 0;
  scrollProgress.style.transform = `scaleY(${progress})`;
  document.body.classList.toggle(
    "is-dark",
    contactSection.getBoundingClientRect().top < 80
  );
};
window.requestAnimationFrame(frame);
