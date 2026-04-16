/**
 * Gallery globe — Three.js textured sphere + graticule.
 * Optional runtime overrides: window.GLOBE_SPHERE_CONFIG in index.html (before this script).
 */
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// =============================================================================
// EDIT BELOW — all defaults in one place
// =============================================================================

/** Texture file relative to this module (code/gallery/…) */
const TEXTURE_PATH = './gallery/globe-portrait-square.png';

const GLOBE_DEFAULTS = {
  /** Log merged config to console */
  debug: false,

  /** Sphere radius in world units */
  radius: 0.48,

  /** Clear alpha so the page shows through around the sphere */
  transparentCanvas: true,

  /** Used when transparentCanvas is false */
  canvasBackground: 0xf8f8fa,

  fill: {
    enabled: true,
    color: 0xe8e8ec,
    opacity: 1,
  },

  texture: {
    enabled: true,
    /** Multiplies albedo; > 1 brightens the mapped image */
    brightness: 1.8,
    /**
     * UV scale: 1 = full image on the map. Below 1 crops toward center (zoom in); above 1 zooms out
     * (image smaller on sphere, edges clamp). mapRepeatX / mapRepeatY override per axis.
     */
    mapRepeat: 1.35,
    mapRepeatX: null,
    mapRepeatY: null,
    /** Extra UV offset after centering (texture space). Negative mapOffsetV nudges the image upward on the sphere. */
    mapOffsetU: 0,
    mapOffsetV: -0.059,
  },

  lines: {
    color: 0x343434,
    parallelCount: 12,
    poleMargin: 0.08,
    /** Set to a non-empty array to override parallelCount (latitudes in radians) */
    parallels: null,
    meridianCount: 9,
    segments: 112,
    /** Slightly >1 draws graticule in front of the sphere surface to reduce z-fighting (dotted/broken lines). */
    radiusScale: 1.0004,
  },

  /** Radians/sec about Y */
  rotationSpeed: 0.55,
  /** Starting yaw around Y (radians); π turns the texture 180° from the old default */
  initialRotationY: Math.PI,
  /** Fixed tilt around X before spin (radians) */
  tiltForward: 0.54,

  sphere: {
    widthSegments: 64,
    heightSegments: 48,
  },

  camera: {
    fov: 48,
    near: 0.05,
    far: 100,
    position: [0, 0.12, 1.28],
    lookAt: [0, 0, 0],
  },

  lights: {
    ambient: 0.72,
    key: { intensity: 1.38, position: [2.2, 2.8, 2.4] },
    fill: { intensity: 0.52, position: [-2.0, 0.2, -1.2] },
  },

  renderer: {
    maxPixelRatio: 2,
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
    toneMappingExposure: 1.08,
  },

  materials: {
    fill: {
      roughness: 0.9,
      metalness: 0,
    },
    textured: {
      roughness: 0.82,
      metalness: 0.02,
      anisotropyMax: 8,
    },
  },

  graticuleLine: {
    /** LineBasicMaterial only; most browsers ignore linewidth > 1 (use lines.color for emphasis). */
    linewidth: 1,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  },

  animation: {
    /** Cap per-frame delta (seconds) for stability after tab switch */
    maxDeltaSeconds: 0.1,
  },
};

// =============================================================================
// Config merge + runtime resolution (do not edit unless you know the flow)
// =============================================================================

function buildConfig() {
  const o =
    typeof window !== 'undefined' && window.GLOBE_SPHERE_CONFIG
      ? window.GLOBE_SPHERE_CONFIG
      : {};

  const mergedTexture = { ...GLOBE_DEFAULTS.texture, ...(o.texture || {}) };
  if (mergedTexture.url == null || mergedTexture.url === '') {
    mergedTexture.url = new URL(TEXTURE_PATH, import.meta.url).href;
  } else if (typeof mergedTexture.url === 'string') {
    mergedTexture.url = resolveTextureUrl(mergedTexture.url);
  }

  return {
    ...GLOBE_DEFAULTS,
    ...o,
    fill: { ...GLOBE_DEFAULTS.fill, ...(o.fill || {}) },
    lines: { ...GLOBE_DEFAULTS.lines, ...(o.lines || {}) },
    texture: mergedTexture,
    sphere: { ...GLOBE_DEFAULTS.sphere, ...(o.sphere || {}) },
    camera: { ...GLOBE_DEFAULTS.camera, ...(o.camera || {}) },
    lights: { ...GLOBE_DEFAULTS.lights, ...(o.lights || {}) },
    renderer: { ...GLOBE_DEFAULTS.renderer, ...(o.renderer || {}) },
    materials: {
      fill: { ...GLOBE_DEFAULTS.materials.fill, ...(o.materials?.fill || {}) },
      textured: { ...GLOBE_DEFAULTS.materials.textured, ...(o.materials?.textured || {}) },
    },
    graticuleLine: { ...GLOBE_DEFAULTS.graticuleLine, ...(o.graticuleLine || {}) },
    animation: { ...GLOBE_DEFAULTS.animation, ...(o.animation || {}) },
    transparentCanvas:
      o.transparentCanvas !== undefined ? o.transparentCanvas : GLOBE_DEFAULTS.transparentCanvas,
  };
}

function applyTextureMapZoom(tex, tcfg) {
  const base =
    typeof tcfg.mapRepeat === 'number' && !Number.isNaN(tcfg.mapRepeat) ? tcfg.mapRepeat : 1;
  const rx = tcfg.mapRepeatX != null ? tcfg.mapRepeatX : base;
  const ry = tcfg.mapRepeatY != null ? tcfg.mapRepeatY : base;
  const ou = tcfg.mapOffsetU != null ? tcfg.mapOffsetU : 0;
  const ov = tcfg.mapOffsetV != null ? tcfg.mapOffsetV : 0;
  tex.repeat.set(rx, ry);
  tex.offset.set((1 - rx) / 2 + ou, (1 - ry) / 2 + ov);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
}

function resolveTextureUrl(pathOrUrl) {
  if (
    typeof pathOrUrl === 'string' &&
    (pathOrUrl.startsWith('http:') ||
      pathOrUrl.startsWith('https:') ||
      pathOrUrl.startsWith('data:') ||
      pathOrUrl.startsWith('blob:'))
  ) {
    return pathOrUrl;
  }
  try {
    return new URL(pathOrUrl, window.location.href).href;
  } catch {
    return pathOrUrl;
  }
}

const CONFIG = buildConfig();

function getParallelLatitudes(lines) {
  if (Array.isArray(lines.parallels) && lines.parallels.length > 0) {
    return lines.parallels;
  }
  const n = Math.max(1, lines.parallelCount ?? 12);
  const margin = lines.poleMargin ?? 0.08;
  const halfPi = Math.PI / 2;
  const lo = -halfPi + margin;
  const hi = halfPi - margin;
  if (n === 1) {
    return [(lo + hi) / 2];
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(lo + (i / (n - 1)) * (hi - lo));
  }
  return out;
}

function buildGraticuleGroup(lineRadius, colorHex) {
  const g = new THREE.Group();
  const gl = CONFIG.graticuleLine;
  const mat = new THREE.LineBasicMaterial({
    color: colorHex,
    linewidth: gl.linewidth != null ? gl.linewidth : 1,
    transparent: true,
    opacity: 1,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: gl.polygonOffsetFactor,
    polygonOffsetUnits: gl.polygonOffsetUnits,
  });
  const seg = CONFIG.lines.segments;

  for (const lat of getParallelLatitudes(CONFIG.lines)) {
    const pts = [];
    const cl = Math.cos(lat);
    const sl = Math.sin(lat);
    for (let i = 0; i <= seg; i++) {
      const phi = (i / seg) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          lineRadius * cl * Math.cos(phi),
          lineRadius * sl,
          lineRadius * cl * Math.sin(phi)
        )
      );
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    g.add(new THREE.LineLoop(geom, mat));
  }

  const m = CONFIG.lines.meridianCount;
  for (let k = 0; k < m; k++) {
    const phi0 = (k / m) * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          lineRadius * Math.sin(t) * Math.cos(phi0),
          lineRadius * Math.cos(t),
          lineRadius * Math.sin(t) * Math.sin(phi0)
        )
      );
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    g.add(new THREE.LineLoop(geom, mat));
  }

  return g;
}

function initGlobe(container) {
  const R = CONFIG.radius;
  const lineR = R * CONFIG.lines.radiusScale;
  const matFill = CONFIG.materials.fill;
  const matTex = CONFIG.materials.textured;
  const rnd = CONFIG.renderer;
  const anim = CONFIG.animation;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    1,
    CONFIG.camera.near,
    CONFIG.camera.far
  );
  camera.position.set(...CONFIG.camera.position);
  camera.lookAt(...CONFIG.camera.lookAt);

  const renderer = new THREE.WebGLRenderer({
    antialias: rnd.antialias,
    alpha: rnd.alpha,
    premultipliedAlpha: rnd.premultipliedAlpha,
    powerPreference: rnd.powerPreference,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, rnd.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = rnd.toneMappingExposure;
  if (CONFIG.transparentCanvas) {
    renderer.setClearColor(0x000000, 0);
  } else {
    renderer.setClearColor(CONFIG.canvasBackground, 1);
  }
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.background = 'transparent';

  const root = new THREE.Group();
  root.rotation.x = CONFIG.tiltForward;
  const startYaw = CONFIG.initialRotationY ?? 0;
  root.rotation.y = startYaw;
  scene.add(root);

  const sphereGeom = new THREE.SphereGeometry(
    R,
    CONFIG.sphere.widthSegments,
    CONFIG.sphere.heightSegments
  );

  const fillColor = new THREE.Color(CONFIG.fill.color);
  const baseMat = new THREE.MeshStandardMaterial({
    color: fillColor,
    roughness: matFill.roughness,
    metalness: matFill.metalness,
    transparent: CONFIG.fill.opacity < 1,
    opacity: CONFIG.fill.opacity,
  });

  const sphereMesh = new THREE.Mesh(sphereGeom, baseMat);
  root.add(sphereMesh);

  if (CONFIG.texture.enabled && CONFIG.texture.url) {
    const loader = new THREE.TextureLoader();
    loader.load(
      CONFIG.texture.url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(
          matTex.anisotropyMax,
          renderer.capabilities.getMaxAnisotropy()
        );
        applyTextureMapZoom(tex, CONFIG.texture);
        sphereMesh.material.dispose();
        const b = CONFIG.texture.brightness != null ? CONFIG.texture.brightness : 1;
        sphereMesh.material = new THREE.MeshStandardMaterial({
          map: tex,
          color: new THREE.Color(b, b, b),
          roughness: matTex.roughness,
          metalness: matTex.metalness,
          transparent: true,
          depthWrite: true,
        });
        if (CONFIG.debug) {
          console.log('[globe-sphere-three] texture loaded', CONFIG.texture.url);
        }
      },
      undefined,
      (err) => {
        console.warn('[globe-sphere-three] texture failed; keeping fill material', err);
      }
    );
  }

  const graticule = buildGraticuleGroup(lineR, CONFIG.lines.color);
  root.add(graticule);

  const amb = new THREE.AmbientLight(0xffffff, CONFIG.lights.ambient);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff, CONFIG.lights.key.intensity);
  key.position.set(...CONFIG.lights.key.position);
  scene.add(key);
  const fillLt = new THREE.DirectionalLight(0xffffff, CONFIG.lights.fill.intensity);
  fillLt.position.set(...CONFIG.lights.fill.position);
  scene.add(fillLt);

  let lastT = performance.now();
  let angle = startYaw;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionOk = !reducedMotion.matches;
  reducedMotion.addEventListener('change', () => {
    motionOk = !reducedMotion.matches;
  });

  function resize() {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastT) / 1000, anim.maxDeltaSeconds);
    lastT = now;
    if (motionOk) {
      angle += CONFIG.rotationSpeed * dt;
      root.rotation.y = angle;
    }
    renderer.render(scene, camera);
  }

  resize();
  requestAnimationFrame(tick);

  const ro = new ResizeObserver(resize);
  ro.observe(container);

  if (CONFIG.debug) {
    console.log('[globe-sphere-three] CONFIG', CONFIG);
  }
}

document.querySelectorAll('[data-globe-sphere-three]').forEach((el) => {
  initGlobe(el);
});
