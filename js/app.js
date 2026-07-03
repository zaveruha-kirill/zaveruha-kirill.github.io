/**
 * app.js — Loader, cursor, nav, hamburger, reveal animations
 */
(function () {

  // ─── Loader ────────────────────────────────────────────────
  const loader  = document.getElementById('loader');
  const counter = document.querySelector('.loader-counter');
  if (loader) {
    let v = 0;
    const iv = setInterval(() => {
      v += Math.random() * 9 + 3;
      if (v > 100) v = 100;
      if (counter) counter.textContent = Math.floor(v) + '%';
      if (v >= 100) {
        clearInterval(iv);
        setTimeout(() => {
          loader.classList.add('hide');
          document.body.style.overflow = '';
          triggerHero();
        }, 300);
      }
    }, 40);
  }

  // ─── Cursor (desktop only) ─────────────────────────────────
  if (!matchMedia('(pointer:coarse)').matches) {
    const dot  = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (dot && ring) {
      let cx = 0, cy = 0, tx = 0, ty = 0, started = false;

      document.addEventListener('mousemove', e => {
        tx = e.clientX; ty = e.clientY;
        dot.style.transform = `translate(${tx}px,${ty}px)`;
        if (!started) {
          // Инициализируем ring в позиции курсора, чтобы не прыгал из (0,0)
          cx = tx; cy = ty;
          started = true;
          dot.style.opacity  = '1';
          ring.style.opacity = '1';
        }
      });

      (function loop() {
        cx += (tx - cx) * 0.10;
        cy += (ty - cy) * 0.10;
        ring.style.transform = `translate(${cx}px,${cy}px)`;
        requestAnimationFrame(loop);
      })();

      document.querySelectorAll('a,button,.service-card,.work-row,.work-card').forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('active'));
        el.addEventListener('mouseleave', () => ring.classList.remove('active'));
      });
    }
  }

  // ─── Nav scroll ────────────────────────────────────────────
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ─── Hamburger + mobile overlay ────────────────────────────
  if (nav) {
    const depth = (location.pathname.replace(/\/$/, '').match(/\//g) || []).length - 1;
    const home  = depth > 0 ? '../'.repeat(depth) : './';

    if (!nav.querySelector('.nav-burger')) {
      const btn = document.createElement('button');
      btn.className = 'nav-burger';
      btn.setAttribute('aria-label', 'Меню');
      ['', '', ''].forEach(() => {
        const s = document.createElement('span');
        btn.appendChild(s);
      });
      nav.appendChild(btn);
    }

    if (!document.querySelector('.nav-mobile')) {
      const ov = document.createElement('div');
      ov.className = 'nav-mobile';

      [
        [home + 'work/', 'Работы'],
        [home + 'cases/', 'Кейсы'],
        [home + '#services', 'Услуги'],
        [home + 'articles/', 'Статьи'],
        [home + '#contact', 'Контакт'],
      ].forEach(([href, label]) => {
        const a = document.createElement('a');
        a.href = href; a.textContent = label;
        ov.appendChild(a);
      });

      const sub = document.createElement('div');
      sub.className = 'nav-mobile-sub';
      [
        ['https://t.me/zaveruhakirill', 'Telegram'],
        ['tel:+79994437291', '+7 999 443-72-91'],
      ].forEach(([href, label]) => {
        const a = document.createElement('a');
        a.href = href; a.textContent = label;
        if (href.startsWith('http')) a.target = '_blank';
        sub.appendChild(a);
      });
      ov.appendChild(sub);
      document.body.appendChild(ov);
    }

    const burger  = nav.querySelector('.nav-burger');
    const mobileNav = document.querySelector('.nav-mobile');

    const toggle = open => {
      burger.classList.toggle('open', open);
      mobileNav.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };

    burger.addEventListener('click', () => toggle(!burger.classList.contains('open')));
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  }

  // ─── IntersectionObserver reveals ─────────────────────────
  // Fallback: без IntersectionObserver показываем весь контент сразу
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-re], .work-row').forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;

        if (e.target.classList.contains('work-list')) {
          e.target.querySelectorAll('.work-row').forEach((row, i) => {
            setTimeout(() => row.classList.add('in'), i * 80);
          });
        } else {
          e.target.classList.add('in');
        }
        io.unobserve(e.target);
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('[data-re]').forEach(el => io.observe(el));
    document.querySelectorAll('.work-list').forEach(el => io.observe(el));
  }

  // ─── Hero entrance ─────────────────────────────────────────
  function triggerHero() {
    document.querySelectorAll('.hero-eyebrow, .hero h1, .hero-body, .btn-primary').forEach((el, i) => {
      el.style.transition = `opacity .9s cubic-bezier(.16,1,.3,1) ${i * 0.13}s,
                              transform .9s cubic-bezier(.16,1,.3,1) ${i * 0.13}s`;
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    });
  }

  // Если лоадер отсутствует — сразу показать hero
  if (!loader) triggerHero();

})();
