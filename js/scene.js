/**
 * scene.js — Уникальные 3D-сцены для каждого типа страницы
 *
 * Canvas #scene-canvas фиксирован в position:fixed и всегда на фоне.
 * Тип сцены определяется по document.body.dataset.page:
 *   home     → Волновая сетка → Сфера → Тор → Разлёт + переливание цвета
 *   work     → Двойная спираль ДНК
 *   cases    → Граф узлов (полный)
 *   case     → Граф узлов (облегчённый)
 *   articles → Поток частиц снизу вверх (полный)
 *   article  → Поток частиц (облегчённый)
 */
(function () {
  'use strict';

  const canvas = document.getElementById('scene-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // ─── Renderer ─────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  camera.position.z = 420;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ─── Утилиты ──────────────────────────────────────────────────────────────
  function lerp(a, b, t)         { return a + (b - a) * t; }
  function clamp(v, lo, hi)      { return Math.max(lo, Math.min(hi, v)); }
  function smoothstep(t)         { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  const mobile = window.innerWidth < 768;

  // ─── Цветовая палитра Dala ────────────────────────────────────────────────
  const COL_DARK   = new THREE.Color('#3d1e08'); // тёмно-коричневый
  const COL_COPPER = new THREE.Color('#c4763a'); // медный
  const COL_AMBER  = new THREE.Color('#e8874a'); // янтарный
  const COL_BRIGHT = new THREE.Color('#f5a96c'); // светлый янтарь (для пиков переливания)
  const COL_BLUE   = new THREE.Color('#8ab5c4'); // голубой (ступеньки ДНК)

  // ─── Роутинг: выбор сцены по data-page ───────────────────────────────────
  const PAGE = document.body.dataset.page || 'home';

  const sceneMap = {
    home:     initHome,
    work:     initWork,
    cases:    initCases,
    case:     initCase,
    articles: initArticles,
    article:  initArticle,
  };

  const animateFn = (sceneMap[PAGE] || initHome)();

  // ─── RAF loop ─────────────────────────────────────────────────────────────
  (function loop() {
    requestAnimationFrame(loop);
    animateFn();
  })();


  // ══════════════════════════════════════════════════════════════════════════
  // СЦЕНА: HOME — Волновая сетка → Сфера → Тор → Разлёт + переливание
  // ══════════════════════════════════════════════════════════════════════════
  function initHome() {
    const COLS   = mobile ? 32 : 58;
    const ROWS   = mobile ? 24 : 44;
    const COUNT  = COLS * ROWS;
    const GRID_W = 580, GRID_H = 450;
    const WAVE_AMP  = 48;
    const WAVE_FREQ = 0.015;
    const WAVE_SPD  = 0.00055; // время движется медленно, пульс по x180
    const SPHERE_R  = 215;
    const TOR_R     = 180, TOR_r = 60; // большой и малый радиус тора

    // ─── Базовые позиции сетки ────────────────────────────────────────────
    const baseX = new Float32Array(COUNT);
    const baseY = new Float32Array(COUNT);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col;
        baseX[i] = (col / (COLS - 1) - 0.5) * GRID_W;
        baseY[i] = (row / (ROWS - 1) - 0.5) * GRID_H;
      }
    }

    // ─── Целевые позиции: сфера ────────────────────────────────────────────
    const sphX = new Float32Array(COUNT);
    const sphY = new Float32Array(COUNT);
    const sphZ = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = SPHERE_R * (0.88 + 0.12 * Math.random());
      sphX[i] = r * Math.sin(phi) * Math.cos(theta);
      sphY[i] = r * Math.sin(phi) * Math.sin(theta);
      sphZ[i] = r * Math.cos(phi);
    }

    // ─── Целевые позиции: тор ─────────────────────────────────────────────
    const torX = new Float32Array(COUNT);
    const torY = new Float32Array(COUNT);
    const torZ = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const u = (i / COUNT) * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      torX[i] = (TOR_R + TOR_r * Math.cos(v)) * Math.cos(u);
      torY[i] = (TOR_R + TOR_r * Math.cos(v)) * Math.sin(u);
      torZ[i] = TOR_r * Math.sin(v);
    }

    // ─── Целевые позиции: разлёт (scatter) ────────────────────────────────
    const scaX = new Float32Array(COUNT);
    const scaY = new Float32Array(COUNT);
    const scaZ = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 350 + Math.random() * 150;
      scaX[i] = r * Math.sin(phi) * Math.cos(theta);
      scaY[i] = r * Math.sin(phi) * Math.sin(theta);
      scaZ[i] = r * Math.cos(phi);
    }

    // ─── Geometry + Material ──────────────────────────────────────────────
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

    const tmp = new THREE.Color();

    // ─── Mouse ────────────────────────────────────────────────────────────
    let mxRaw = 0, myRaw = 0, mxL = 0, myL = 0;
    let tRX = 0, tRY = 0, cRX = 0, cRY = 0;

    document.addEventListener('mousemove', e => {
      mxRaw = (e.clientX / window.innerWidth  - 0.5) * GRID_W;
      myRaw = -(e.clientY / window.innerHeight - 0.5) * GRID_H;
      tRX   = (e.clientY / window.innerHeight - 0.5) * 0.20;
      tRY   = (e.clientX / window.innerWidth  - 0.5) * 0.30;
    });

    // ─── Scroll → morph (4 стадии на 7 viewport-высот) ──────────────────
    let scrollP = 0;
    window.addEventListener('scroll', () => {
      // 7 vh = полный цикл морфинга — переходы растянуты по всей длине скролла
      scrollP = clamp(window.scrollY / (window.innerHeight * 7), 0, 1);
    }, { passive: true });

    // Текущие (инерционные) значения морфа — lerp догоняет target с задержкой
    let curSph = 0, curTor = 0, curSca = 0;

    let time = 0;

    return function animate() {
      time += WAVE_SPD;

      mxL += (mxRaw - mxL) * 0.05;
      myL += (myRaw - myL) * 0.05;
      cRX += (tRX - cRX) * 0.04;
      cRY += (tRY - cRY) * 0.04;

      // Целевые значения по scroll:
      // 0.00-0.15 GRID → без морфа
      // 0.15-0.55 grid → sphere
      // 0.50-0.80 sphere → torus (с перекрытием для органичности)
      // 0.76-1.00 torus → scatter
      const tgtSph = smoothstep(clamp((scrollP - 0.15) / 0.40, 0, 1));
      const tgtTor = smoothstep(clamp((scrollP - 0.50) / 0.30, 0, 1));
      const tgtSca = smoothstep(clamp((scrollP - 0.76) / 0.24, 0, 1));

      // Инерция: анимация плавно догоняет target (~0.8 сек при 60fps)
      curSph += (tgtSph - curSph) * 0.06;
      curTor += (tgtTor - curTor) * 0.06;
      curSca += (tgtSca - curSca) * 0.06;

      const morphSphere  = curSph;
      const morphTorus   = curTor;
      const morphScatter = curSca;

      // Переливание цвета: медленная пульсация (полный цикл ~1 сек при WAVE_SPD=0.00055*180≈0.1 рад/кадр)
      const pulse = (Math.sin(time * 180) + 1) * 0.5;

      // Наклон сцены по мыши (гасится при морфинге)
      const dominantMorph = Math.max(morphSphere, morphTorus);
      mesh.rotation.x = cRX * (1 - dominantMorph * 0.8);
      mesh.rotation.y = cRY * (1 - dominantMorph * 0.8);

      // Авто-вращение сферы и тора
      if (morphSphere > 0.05) mesh.rotation.y += 0.003 * morphSphere * (1 - morphTorus);
      if (morphTorus  > 0.05) mesh.rotation.y += 0.002 * morphTorus;

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const bx = baseX[i], by = baseY[i];

        // Волна по Z
        const wave = Math.sin(bx * WAVE_FREQ + time * 1.4)
                   * Math.cos(by * WAVE_FREQ * 0.85 + time)
                   * WAVE_AMP;

        // Рябь от курсора (только в режиме сетки)
        const dx = bx - mxL, dy = by - myL;
        const distSq = dx * dx + dy * dy;
        const ripple = Math.exp(-distSq * 0.000016)
                     * 26
                     * Math.sin(Math.sqrt(distSq) * 0.033 - time * 6)
                     * (1 - morphSphere);

        const gz = wave + ripple;

        // Интерполяция: grid → sphere → torus → scatter
        let px = lerp(bx,    sphX[i], morphSphere);
        let py = lerp(by,    sphY[i], morphSphere);
        let pz = lerp(gz,    sphZ[i], morphSphere);
        px = lerp(px, torX[i], morphTorus);
        py = lerp(py, torY[i], morphTorus);
        pz = lerp(pz, torZ[i], morphTorus);
        px = lerp(px, scaX[i], morphScatter);
        py = lerp(py, scaY[i], morphScatter);
        pz = lerp(pz, scaZ[i], morphScatter);

        positions[i3]     = px;
        positions[i3 + 1] = py;
        positions[i3 + 2] = pz;

        // Цвет: глубина Z + переливание (pulse смещает весь облак к янтарю)
        const zNorm    = clamp((pz / WAVE_AMP + 1) * 0.5, 0, 1);
        const colorMix = zNorm * (0.5 + pulse * 0.5);

        if (colorMix > 0.65) {
          tmp.lerpColors(COL_AMBER, COL_BRIGHT, (colorMix - 0.65) / 0.35);
        } else if (colorMix > 0.35) {
          tmp.lerpColors(COL_COPPER, COL_AMBER, (colorMix - 0.35) / 0.30);
        } else {
          tmp.lerpColors(COL_DARK, COL_COPPER, colorMix / 0.35);
        }

        colors[i3]     = tmp.r;
        colors[i3 + 1] = tmp.g;
        colors[i3 + 2] = tmp.b;
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate    = true;
      renderer.render(scene, camera);
    };
  }


  // ══════════════════════════════════════════════════════════════════════════
  // СЦЕНА: WORK — Двойная спираль ДНК
  // ══════════════════════════════════════════════════════════════════════════
  function initWork() {
    const N       = mobile ? 60 : 120; // точек на цепь
    const HELIX_R = 100;  // радиус спирали
    const HELIX_H = 380;  // полная высота
    const TURNS   = 4;    // количество витков

    const group = new THREE.Group();
    scene.add(group);

    // Строим одну цепь спирали
    function buildChain(phaseOffset) {
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const t     = i / (N - 1);
        const angle = t * TURNS * Math.PI * 2 + phaseOffset;
        pos[i * 3]     = HELIX_R * Math.cos(angle);
        pos[i * 3 + 1] = (t - 0.5) * HELIX_H;
        pos[i * 3 + 2] = HELIX_R * Math.sin(angle);
        // Медный цвет с небольшой вариацией к янтарю
        const c = COL_COPPER.clone().lerp(COL_AMBER, Math.random() * 0.4);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      return { pos, col };
    }

    const chainA = buildChain(0);
    const chainB = buildChain(Math.PI);

    // Points для каждой цепи
    function makePoints(chain) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(chain.pos.slice(), 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(chain.col.slice(), 3));
      const mat = new THREE.PointsMaterial({
        size: mobile ? 3 : 4.5, vertexColors: true,
        transparent: true, opacity: 0.85, sizeAttenuation: true,
      });
      return new THREE.Points(geo, mat);
    }

    group.add(makePoints(chainA));
    group.add(makePoints(chainB));

    // Ступеньки — LineSegments соединяют A и B каждые ~5 точек
    const STEP   = mobile ? 4 : 5;
    const stepsN = Math.floor(N / STEP);
    const stepPos = new Float32Array(stepsN * 6);
    for (let s = 0; s < stepsN; s++) {
      const i = s * STEP;
      stepPos[s * 6]     = chainA.pos[i * 3];
      stepPos[s * 6 + 1] = chainA.pos[i * 3 + 1];
      stepPos[s * 6 + 2] = chainA.pos[i * 3 + 2];
      stepPos[s * 6 + 3] = chainB.pos[i * 3];
      stepPos[s * 6 + 4] = chainB.pos[i * 3 + 1];
      stepPos[s * 6 + 5] = chainB.pos[i * 3 + 2];
    }
    const stepGeo = new THREE.BufferGeometry();
    stepGeo.setAttribute('position', new THREE.BufferAttribute(stepPos, 3));
    group.add(new THREE.LineSegments(stepGeo, new THREE.LineBasicMaterial({
      color: COL_BLUE, transparent: true, opacity: 0.55,
    })));

    camera.position.z = 520;

    return function animate() {
      group.rotation.y += 0.004;
      renderer.render(scene, camera);
    };
  }


  // ══════════════════════════════════════════════════════════════════════════
  // СЦЕНА: CASES / CASE — Граф узлов (Node Graph)
  // ══════════════════════════════════════════════════════════════════════════
  function initNodeGraph(nodeCount, lineDistSq, opacity) {
    const COUNT    = nodeCount;
    const BOUND_R  = 260; // узлы не выходят за эту сферу

    const px = new Float32Array(COUNT);
    const py = new Float32Array(COUNT);
    const pz = new Float32Array(COUNT);
    const vx = new Float32Array(COUNT);
    const vy = new Float32Array(COUNT);
    const vz = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = BOUND_R * (0.3 + 0.7 * Math.random());
      px[i] = r * Math.sin(phi) * Math.cos(theta);
      py[i] = r * Math.sin(phi) * Math.sin(theta);
      pz[i] = r * Math.cos(phi);
      vx[i] = (Math.random() - 0.5) * 0.12;
      vy[i] = (Math.random() - 0.5) * 0.12;
      vz[i] = (Math.random() - 0.5) * 0.12;
    }

    // ─── Узлы ─────────────────────────────────────────────────────────────
    const nodePos = new Float32Array(COUNT * 3);
    const nodeCol = new Float32Array(COUNT * 3);
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
    nodeGeo.setAttribute('color',    new THREE.BufferAttribute(nodeCol, 3));
    const nodeMat = new THREE.PointsMaterial({
      size: mobile ? 3.5 : 5.5, vertexColors: true,
      transparent: true, opacity: opacity, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(nodeGeo, nodeMat));

    // ─── Линии ────────────────────────────────────────────────────────────
    const MAX_SEGS = COUNT * COUNT; // с запасом
    const linePos  = new Float32Array(MAX_SEGS * 6);
    const lineGeo  = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: COL_COPPER, transparent: true, opacity: opacity * 0.5,
    });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    const tmp = new THREE.Color();
    let time  = 0;

    return function animate() {
      time += 0.008;

      // Движение и отражение узлов
      for (let i = 0; i < COUNT; i++) {
        px[i] += vx[i]; py[i] += vy[i]; pz[i] += vz[i];
        const dist = Math.sqrt(px[i] * px[i] + py[i] * py[i] + pz[i] * pz[i]);
        if (dist > BOUND_R) {
          const nx = px[i] / dist, ny = py[i] / dist, nz = pz[i] / dist;
          const dot = vx[i] * nx + vy[i] * ny + vz[i] * nz;
          vx[i] -= 2 * dot * nx;
          vy[i] -= 2 * dot * ny;
          vz[i] -= 2 * dot * nz;
        }
        const i3 = i * 3;
        nodePos[i3] = px[i]; nodePos[i3 + 1] = py[i]; nodePos[i3 + 2] = pz[i];

        // Пульсирующий цвет узла
        const pulse = (Math.sin(time * 2 + i * 0.3) + 1) * 0.5;
        tmp.lerpColors(COL_COPPER, COL_BRIGHT, pulse);
        nodeCol[i3] = tmp.r; nodeCol[i3 + 1] = tmp.g; nodeCol[i3 + 2] = tmp.b;
      }

      // Обновление линий по дистанции
      let segs = 0;
      for (let a = 0; a < COUNT - 1; a++) {
        for (let b = a + 1; b < COUNT; b++) {
          const dx = px[a] - px[b], dy = py[a] - py[b], dz = pz[a] - pz[b];
          if (dx * dx + dy * dy + dz * dz < lineDistSq && segs < MAX_SEGS - 1) {
            const l = segs * 6;
            linePos[l]     = px[a]; linePos[l + 1] = py[a]; linePos[l + 2] = pz[a];
            linePos[l + 3] = px[b]; linePos[l + 4] = py[b]; linePos[l + 5] = pz[b];
            segs++;
          }
        }
      }
      lineGeo.setDrawRange(0, segs * 2);

      nodeGeo.attributes.position.needsUpdate = true;
      nodeGeo.attributes.color.needsUpdate    = true;
      lineGeo.attributes.position.needsUpdate = true;

      scene.rotation.y += 0.0008;
      renderer.render(scene, camera);
    };
  }

  function initCases() { return initNodeGraph(mobile ? 40 : 80, 120 * 120, 0.70); }
  function initCase()   { return initNodeGraph(mobile ? 22 : 45, 100 * 100, 0.38); }


  // ══════════════════════════════════════════════════════════════════════════
  // СЦЕНА: ARTICLES / ARTICLE — Поток частиц снизу вверх
  // ══════════════════════════════════════════════════════════════════════════
  function initParticleStream(count, opacity) {
    const COUNT   = count;
    const FIELD_W = 640;
    const FIELD_H = 480;
    const TOP     =  FIELD_H * 0.5;
    const BOTTOM  = -FIELD_H * 0.5;

    const pos   = new Float32Array(COUNT * 3);
    const col   = new Float32Array(COUNT * 3);
    const vyArr = new Float32Array(COUNT); // скорость по Y
    const phase = new Float32Array(COUNT); // фаза горизонтального дрейфа

    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * FIELD_W;
      pos[i * 3 + 1] = BOTTOM + Math.random() * (TOP - BOTTOM); // случайный старт
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      vyArr[i] = 0.38 + Math.random() * 0.28;
      phase[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: mobile ? 1.6 : 2.2, vertexColors: true,
      transparent: true, opacity: opacity, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(geo, mat));

    const tmp = new THREE.Color();
    let time  = 0;

    return function animate() {
      time += 0.006;

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        // Движение вверх + лёгкий синусоидальный дрейф по X
        pos[i3]     += Math.sin(time * 0.3 + phase[i]) * 0.1;
        pos[i3 + 1] += vyArr[i];

        // Телепорт снизу при достижении верхней границы
        if (pos[i3 + 1] > TOP) {
          pos[i3 + 1] = BOTTOM;
          pos[i3]     = (Math.random() - 0.5) * FIELD_W;
        }

        // Цвет: медный внизу → тёмный вверху (фейд)
        const yNorm = clamp((pos[i3 + 1] - BOTTOM) / (TOP - BOTTOM), 0, 1);
        tmp.lerpColors(COL_AMBER, COL_DARK, yNorm);
        col[i3] = tmp.r; col[i3 + 1] = tmp.g; col[i3 + 2] = tmp.b;
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate    = true;
      renderer.render(scene, camera);
    };
  }

  function initArticles() { return initParticleStream(mobile ? 120 : 200, 0.65); }
  function initArticle()  { return initParticleStream(mobile ? 70  : 120, 0.38); }

})();
