/**
 * particles.js — Волновая сетка → морфинг в сферу при скролле
 * Сетка покрывает весь hero, при скролле точки "всасываются" в сферу
 */
(function () {
  'use strict';

  const canvas = document.getElementById('particles-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // ─── Renderer ─────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  camera.position.z = 420;

  // ─── Параметры ────────────────────────────────────────────────
  const mobile = window.innerWidth < 768;
  const COLS  = mobile ? 32 : 58;
  const ROWS  = mobile ? 24 : 44;
  const COUNT = COLS * ROWS;

  // Сетка чуть шире viewport чтобы покрывать края
  const GRID_W    = 580;
  const GRID_H    = 450;
  const WAVE_AMP  = 48;   // амплитуда волны по Z
  const WAVE_FREQ = 0.015; // пространственная частота
  const WAVE_SPD  = 0.00055;
  const SPHERE_R  = 215;

  // ─── Базовые позиции сетки ────────────────────────────────────
  const baseX = new Float32Array(COUNT);
  const baseY = new Float32Array(COUNT);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      baseX[i] = (c / (COLS - 1) - 0.5) * GRID_W;
      baseY[i] = (r / (ROWS - 1) - 0.5) * GRID_H;
    }
  }

  // ─── Целевые позиции сферы ────────────────────────────────────
  const sphX = new Float32Array(COUNT);
  const sphY = new Float32Array(COUNT);
  const sphZ = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    // Немного вариативный радиус — сфера с "пушистостью"
    const r     = SPHERE_R * (0.88 + 0.12 * Math.random());
    sphX[i] = r * Math.sin(phi) * Math.cos(theta);
    sphY[i] = r * Math.sin(phi) * Math.sin(theta);
    sphZ[i] = r * Math.cos(phi);
  }

  // ─── Geometry + Material ──────────────────────────────────────
  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

  const mat = new THREE.PointsMaterial({
    size: mobile ? 1.8 : 2.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });

  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);

  // ─── Цветовая схема (по глубине Z) ───────────────────────────
  const COL_BRIGHT = new THREE.Color('#e8874a'); // amber  — ближние
  const COL_MID    = new THREE.Color('#c4763a'); // copper — средние
  const COL_DARK   = new THREE.Color('#3d1e08'); // dark   — дальние
  const tmp = new THREE.Color();

  // ─── Mouse ────────────────────────────────────────────────────
  let mxRaw = 0, myRaw = 0;
  let mxL   = 0, myL   = 0; // lerped
  let tRX = 0, tRY = 0;     // target tilt
  let cRX = 0, cRY = 0;     // current tilt (lerped)

  document.addEventListener('mousemove', e => {
    // Координаты в THREE-space для ripple-эффекта
    mxRaw =  (e.clientX / window.innerWidth  - 0.5) * GRID_W;
    myRaw = -(e.clientY / window.innerHeight - 0.5) * GRID_H;
    // Угол наклона сцены
    tRX   =  (e.clientY / window.innerHeight - 0.5) * 0.20;
    tRY   =  (e.clientX / window.innerWidth  - 0.5) * 0.30;
  });

  // ─── Scroll → morph ───────────────────────────────────────────
  let scrollP = 0;
  const heroVisual = canvas.closest('.hero-visual') || canvas.parentElement;

  window.addEventListener('scroll', () => {
    scrollP = Math.min(window.scrollY / window.innerHeight, 1);
    // Fade начинается после 40% скролла
    const fade = Math.max((scrollP - 0.4) / 0.6, 0);
    mat.opacity            = 0.9 * (1 - fade);
    heroVisual.style.opacity = String(1 - fade * 1.1);
  }, { passive: true });

  // ─── Resize ───────────────────────────────────────────────────
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // ─── Utils ────────────────────────────────────────────────────
  function lerp(a, b, t)    { return a + (b - a) * t; }
  // Плавная кривая ease in-out
  function smoothstep(t)    { return t * t * (3 - 2 * t); }

  // ─── Loop ─────────────────────────────────────────────────────
  let time = 0;

  function animate() {
    requestAnimationFrame(animate);
    time += WAVE_SPD;

    // Lerp мышь
    mxL += (mxRaw - mxL) * 0.05;
    myL += (myRaw - myL) * 0.05;
    cRX += (tRX - cRX) * 0.04;
    cRY += (tRY - cRY) * 0.04;

    // Морф: 0→1 за первые 55% скролла, потом зафиксировано
    const morphP = smoothstep(Math.min(scrollP / 0.55, 1));

    // Наклон по мыши (гасится по мере морфа)
    mesh.rotation.x = cRX * (1 - morphP * 0.8);
    mesh.rotation.y = cRY * (1 - morphP * 0.8);

    // Медленное вращение сферы когда morphP > 0
    if (morphP > 0.05) {
      mesh.rotation.y += 0.003 * morphP;
    }

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const bx = baseX[i];
      const by = baseY[i];

      // Волна по оси Z
      const wave = Math.sin(bx * WAVE_FREQ + time * 1.4)
                 * Math.cos(by * WAVE_FREQ * 0.85 + time)
                 * WAVE_AMP;

      // Рябь от курсора (только в режиме сетки)
      const dx    = bx - mxL;
      const dy    = by - myL;
      const distSq = dx * dx + dy * dy;
      const ripple = Math.exp(-distSq * 0.000016)
                   * 26
                   * Math.sin(Math.sqrt(distSq) * 0.033 - time * 6)
                   * (1 - morphP);

      // Позиции grid (волна + рябь)
      const gz = wave + ripple;

      // Морфинг grid → sphere
      positions[i3]     = lerp(bx,     sphX[i], morphP);
      positions[i3 + 1] = lerp(by,     sphY[i], morphP);
      positions[i3 + 2] = lerp(gz,     sphZ[i], morphP);

      // Цвет по глубине Z
      const zNorm = Math.max(0, Math.min(1, (positions[i3 + 2] / WAVE_AMP + 1) * 0.5));
      if (zNorm > 0.58) {
        tmp.lerpColors(COL_MID, COL_BRIGHT, (zNorm - 0.58) / 0.42);
      } else {
        tmp.lerpColors(COL_DARK, COL_MID, zNorm / 0.58);
      }
      colors[i3]     = tmp.r;
      colors[i3 + 1] = tmp.g;
      colors[i3 + 2] = tmp.b;
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate    = true;
    renderer.render(scene, camera);
  }

  animate();
})();
