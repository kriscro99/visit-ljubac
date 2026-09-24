/* =========================================================
   Visit Ljubač — interakcije
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const CFG = window.VL_CONFIG || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  window.VL_OK = true;

  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = id => `<svg><use href="#i-${id}"/></svg>`;

  /* ---------- Datumi (hrvatski) ---------- */
  const MONTHS = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'];
  const MONTHS_GEN = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];
  const MONTHS_SHORT = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'];
  const WEEKDAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
  const pad = n => String(n).padStart(2, '0');
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const nightsBetween = (a, b) => Math.round((b - a) / 864e5);
  const fmtLong = d => `${d.getDate()}. ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}.`;
  const fmtShort = d => `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;

  // 1 gost, 2–4 gosta, 5+ gostiju (11–14 gostiju)
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  const guestsText = n => `${n} ${plural(n, 'gost', 'gosta', 'gostiju')}`;
  const nightsText = n => `${n} ${plural(n, 'noćenje', 'noćenja', 'noćenja')}`;

  /* ---------- Zaključavanje scrolla (iOS) ---------- */
  let locks = 0, lockY = 0;
  function lockScroll(on) {
    const b = document.body.style;
    if (on) {
      if (locks++ === 0) {
        lockY = window.scrollY;
        Object.assign(b, { position: 'fixed', top: `-${lockY}px`, left: '0', right: '0', width: '100%' });
      }
    } else if (locks > 0 && --locks === 0) {
      Object.assign(b, { position: '', top: '', left: '', right: '', width: '' });
      window.scrollTo({ top: lockY, behavior: 'instant' });
    }
  }

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3200);
  }

  /* =========================================================
     LOADER + HERO
     ========================================================= */
  $$('.hero__title .word').forEach((w, i) => w.style.setProperty('--d', (0.5 + i * 0.075).toFixed(3)));

  function ready() {
    if (root.classList.contains('is-ready')) return;
    root.classList.remove('is-loading');
    root.classList.add('is-ready');
    setTimeout(() => { const l = $('#loader'); if (l) l.remove(); }, 1500);
    startHero();
  }
  const heroImg = $('.hero__slide.is-active img');
  const imgLoaded = new Promise(r => {
    if (!heroImg || heroImg.complete) return r();
    heroImg.addEventListener('load', r, { once: true });
    heroImg.addEventListener('error', r, { once: true });
  });
  Promise.all([
    new Promise(r => setTimeout(r, reduced ? 0 : 1250)),
    Promise.race([imgLoaded, new Promise(r => setTimeout(r, 3200))])
  ]).then(ready);

  function startHero() {
    const slides = $$('.hero__slide');
    const dots = $$('.hero__dots button');
    const DUR = 7000;
    root.style.setProperty('--dur', DUR + 'ms');
    let i = 0, timer;

    // Učitaj ostale slajdove tek nakon prvog prikaza
    setTimeout(() => {
      slides.forEach(s => {
        $$('source[data-srcset]', s).forEach(el => { el.srcset = el.dataset.srcset; });
        $$('img[data-src]', s).forEach(img => { img.src = img.dataset.src; });
      });
    }, 600);

    function go(n) {
      if (n === i) return;
      const prev = slides[i];
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(() => prev.classList.remove('is-leaving'), 1900);
      dots[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active');
      dots[i].classList.add('is-active');
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (!reduced) timer = setTimeout(() => go(i + 1), DUR);
    }
    dots.forEach((d, n) => d.addEventListener('click', () => go(n)));
    schedule();
  }

  /* Krijesnice u heroju */
  (function fireflies() {
    const c = $('.hero__fireflies');
    if (!c || reduced) return;
    const ctx = c.getContext('2d');
    let w = 0, h = 0, parts = [], running = false, raf;
    const N = innerWidth < 700 ? 16 : 32;
    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const make = (fromBottom) => ({
      x: Math.random() * w,
      y: fromBottom ? h + 10 : h * 0.3 + Math.random() * h * 0.7,
      r: 0.7 + Math.random() * 1.7,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.12 - Math.random() * 0.32,
      p: Math.random() * Math.PI * 2,
      s: 0.008 + Math.random() * 0.02
    });
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx + Math.sin(p.p) * 0.18;
        p.y += p.vy;
        p.p += p.s;
        if (p.y < -12 || p.x < -12 || p.x > w + 12) Object.assign(p, make(true));
        const a = 0.28 + Math.sin(p.p * 2.2) * 0.28;
        const R = p.r * 6;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        g.addColorStop(0, `rgba(255,220,150,${a + 0.25})`);
        g.addColorStop(0.25, `rgba(255,190,110,${a * 0.6})`);
        g.addColorStop(1, 'rgba(255,190,110,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    resize();
    parts = Array.from({ length: N }, () => make(false));
    addEventListener('resize', resize, { passive: true });
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; tick(); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(c);
  })();

  /* =========================================================
     HEADER, IZBORNIK, SCROLL
     ========================================================= */
  const header = $('#header');
  const progress = $('.progress span');
  const dock = $('#dock');
  const hero = $('.hero');
  let menuOpen = false, popOpen = false, lastY = window.scrollY, ticking = false;
  let bookInView = false, footInView = false;

  const burger = $('#burger');
  function setMenu(open) {
    menuOpen = open;
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Zatvori izbornik' : 'Otvori izbornik');
    $('#menu').setAttribute('aria-hidden', String(!open));
    lockScroll(open);
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  $$('#menu a').forEach(a => a.addEventListener('click', () => { if (menuOpen) setMenu(false); }));

  // Paralaksa
  const para = $$('[data-parallax]').map(el => ({ el, k: parseFloat(el.dataset.parallax) || 0 }));
  function parallax() {
    if (reduced) return;
    const vh = innerHeight, m = innerWidth < 700 ? 0.6 : 1;
    for (const p of para) {
      const r = p.el.parentElement.getBoundingClientRect();
      if (r.bottom < -150 || r.top > vh + 150) continue;
      const c = r.top + r.height / 2 - vh / 2;
      p.el.style.transform = `translate3d(0, ${(-c * p.k * m).toFixed(1)}px, 0)`;
    }
  }

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (!menuOpen) header.classList.toggle('is-hidden', y > lastY + 2 && y > 480 && !popOpen);
    if (y < lastY - 2) header.classList.remove('is-hidden');
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    dock.classList.toggle('is-visible', y > hero.offsetHeight * 0.7 && !bookInView && !footInView);
    parallax();
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();

  new IntersectionObserver(es => es.forEach(e => {
    if (e.target.id === 'rezervacija') bookInView = e.isIntersecting;
    else footInView = e.isIntersecting;
    onScroll();
  }), { rootMargin: '0px 0px -30% 0px' }).observe($('#rezervacija'));
  new IntersectionObserver(([e]) => { footInView = e.isIntersecting; onScroll(); }).observe($('.footer'));

  // Aktivna poveznica u navigaciji
  const navLinks = $$('.nav a');
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) navIO.observe(s); });

  /* =========================================================
     REVEAL ANIMACIJE
     ========================================================= */
  // Razdvajanje naslova na riječi
  $$('[data-split]').forEach(el => {
    let wi = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--wi', wi++);
            w.append(inner);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  });

  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    revealIO.unobserve(e.target);
  }), { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  $$('[data-reveal], [data-split]').forEach(el => revealIO.observe(el));

  // Brojači
  const fmtNum = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const countIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, dur = reduced ? 1 : 2000, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = fmtNum(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  // Magnetski gumbi
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* =========================================================
     GALERIJE (slider + lightbox)
     ========================================================= */
  const Lightbox = (() => {
    const lb = $('#lightbox');
    const track = $('.lightbox__track', lb);
    const title = $('.lightbox__title', lb);
    const count = $('.lightbox__count', lb);
    let items = [], idx = 0, lastFocus = null;
    const update = () => {
      idx = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      count.textContent = `${idx + 1} / ${items.length}`;
    };
    const go = d => track.scrollBy({ left: d * track.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    const onKey = e => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    function open(list, i, name) {
      items = list;
      lastFocus = document.activeElement;
      track.innerHTML = items.map((it, k) => `<figure><img src="${esc(it.src)}" alt="${esc(it.alt)}" ${Math.abs(k - i) > 1 ? 'loading="lazy"' : ''} decoding="async"></figure>`).join('');
      title.textContent = name || '';
      lb.hidden = false;
      lockScroll(true);
      requestAnimationFrame(() => { track.scrollLeft = i * track.clientWidth; update(); });
      document.addEventListener('keydown', onKey);
      $('.lightbox__close', lb).focus({ preventScroll: true });
    }
    function close() {
      lb.hidden = true;
      track.innerHTML = '';
      lockScroll(false);
      document.removeEventListener('keydown', onKey);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    $('.lightbox__close', lb).addEventListener('click', close);
    $('.lightbox__nav--prev', lb).addEventListener('click', () => go(-1));
    $('.lightbox__nav--next', lb).addEventListener('click', () => go(1));
    return { open };
  })();

  $$('[data-slider]').forEach(sl => {
    const track = $('.slider__track', sl);
    const figs = $$('figure', track);
    const n = figs.length;
    const dotsWrap = $('.slider__dots', sl);
    dotsWrap.innerHTML = figs.map(() => '<i></i>').join('');
    const dots = $$('i', dotsWrap);
    const count = $('.slider__count', sl);
    const prev = $('.slider__btn--prev', sl);
    const next = $('.slider__btn--next', sl);
    let idx = 0;
    const update = () => {
      idx = Math.min(n - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === idx));
      count.textContent = `${idx + 1} / ${n}`;
      prev.disabled = idx === 0;
      next.disabled = idx === n - 1;
    };
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    prev.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: track.clientWidth, behavior: 'smooth' }));
    update();

    const open = i => Lightbox.open(figs.map(f => {
      const im = $('img', f);
      return { src: im.dataset.full || im.getAttribute('src'), alt: im.alt };
    }), i, sl.dataset.gallery);
    $('.slider__zoom', sl).addEventListener('click', () => open(idx));
    track.addEventListener('click', e => { if (e.target.tagName === 'IMG') open(idx); });
    const stay = sl.closest('.stay');
    const btn = stay && $('[data-open-gallery]', stay);
    if (btn) btn.addEventListener('click', () => open(0));
  });

  /* =========================================================
     DOŽIVLJAJI — slika prati kursor
     ========================================================= */
  if (finePointer && !reduced) {
    const fl = $('.acts__float');
    const img = $('img', fl);
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, on = false, looping = false;
    const loop = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      fl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${((tx - x) * 0.04).toFixed(2)}deg)`;
      if (on || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) requestAnimationFrame(loop);
      else looping = false;
    };
    $$('.acts li').forEach(li => {
      const pre = new Image(); pre.src = li.dataset.img;
      li.addEventListener('mouseenter', e => {
        img.src = li.dataset.img;
        if (!on) { x = tx; y = ty; }
        on = true;
        fl.classList.add('is-on');
        if (!looping) { looping = true; requestAnimationFrame(loop); }
      });
      li.addEventListener('mouseleave', () => { on = false; fl.classList.remove('is-on'); });
    });
    addEventListener('mousemove', e => {
      tx = e.clientX + (e.clientX > innerWidth / 2 ? -170 : 170);
      ty = e.clientY;
    }, { passive: true });
  }

  /* =========================================================
     OKOLICA — tabovi + karta
     ========================================================= */
  const tabs = $$('.tabs [role="tab"]');
  const pill = $('.tabs__pill');
  const placePill = b => { pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft}px)`; };
  tabs.forEach(b => b.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t === b)));
    placePill(b);
    $$('[data-panel]').forEach(p => {
      const on = p.dataset.panel === b.dataset.tab;
      p.hidden = !on;
      if (on) {
        $$('[data-reveal]', p).forEach(el => el.classList.add('is-in'));
        p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering');
        p.scrollLeft = 0;
      }
    });
  }));
  const syncPill = () => { const a = tabs.find(t => t.getAttribute('aria-selected') === 'true'); if (a) placePill(a); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(syncPill);
  addEventListener('resize', syncPill, { passive: true });
  syncPill();

  const CAMP = [44.271815, 15.289499], TREE = [44.26170002, 15.31384756];
  function mapFallback() {
    $('#map').innerHTML = `<iframe title="Karta — Visit Ljubač" src="https://www.google.com/maps?q=${CAMP.join(',')}&z=14&output=embed" style="border:0;width:100%;height:100%;position:absolute;inset:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }
  function initMap() {
    const L = window.L;
    if (!L) return mapFallback();
    const el = $('#map');
    el.innerHTML = '';
    const map = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);
    const mk = (ll, label, cls) => L.marker(ll, {
      icon: L.divIcon({ className: 'pin ' + cls, html: `<span class="pin__dot"></span><span class="pin__label">${label}</span>`, iconSize: [0, 0] })
    }).addTo(map);
    mk(CAMP, 'Glamping kamp · Parcele', 'pin--camp');
    mk(TREE, 'Kućice na drvetu', 'pin--tree');
    const pad = el.clientWidth < 500 ? 40 : 90;
    map.fitBounds([CAMP, TREE], { padding: [pad, pad], maxZoom: 14 });
  }
  const mapIO = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    mapIO.disconnect();
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.append(css);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = () => { try { initMap(); } catch (err) { mapFallback(); } };
    s.onerror = mapFallback;
    document.head.append(s);
  }, { rootMargin: '500px 0px' });
  mapIO.observe($('#map'));

  /* =========================================================
     RECENZIJE — carousel
     ========================================================= */
  (function reviews() {
    const rt = $('.reviews__track');
    const step = () => { const r = $('.review', rt); return r ? r.offsetWidth + 18 : 300; };
    let auto = !reduced, inView = false;
    const stop = () => { auto = false; };
    $$('[data-rev]').forEach(b => b.addEventListener('click', () => {
      stop();
      rt.scrollBy({ left: +b.dataset.rev * step(), behavior: 'smooth' });
    }));
    ['pointerdown', 'touchstart', 'wheel'].forEach(ev => rt.addEventListener(ev, stop, { passive: true }));
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }).observe(rt);
    setInterval(() => {
      if (!auto || !inView || document.hidden) return;
      const end = rt.scrollLeft + rt.clientWidth >= rt.scrollWidth - 10;
      rt.scrollTo({ left: end ? 0 : rt.scrollLeft + step(), behavior: 'smooth' });
    }, 5200);
  })();

  /* =========================================================
     REZERVACIJA — stanje, kalendar, upit
     ========================================================= */
  const STAYS = {
    bell: { name: 'Glamping Bell Tent West', slug: 'ljubac-glamping-bell-tent-west-robinson', max: 4 },
    tree: { name: 'Kućica na drvetu', slug: 'treehouses-ljubac-glamping-robinson', max: 5 },
    pitch: { name: 'Parcela za šator', slug: 'tent-pitch-ljubac', max: 3 }
  };
  const EXTRAS = { sauna: 'Mobilna sauna', sup: 'SUP daske', transfer: 'Transfer', bungee: 'Bungee jumping' };
  const MAX_GUESTS = 12;
  const state = { stay: 'bell', from: null, to: null, guests: 2, extras: new Set() };
  const subs = [];
  const setState = patch => { Object.assign(state, patch); subs.forEach(f => f()); };

  class RangeCal {
    constructor(el) {
      this.el = el;
      this.months = +el.dataset.months || 1;
      const t = today();
      // Pri kraju mjeseca odmah prikaži sljedeći
      const left = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() - t.getDate();
      this.view = new Date(t.getFullYear(), t.getMonth() + (left < 8 && this.months === 1 ? 1 : 0), 1);
      this.hover = null;
      el.addEventListener('click', e => this.onClick(e));
      if (finePointer) {
        el.addEventListener('mouseover', e => {
          const b = e.target.closest('[data-date]');
          const h = b && !b.disabled ? fromISO(b.dataset.date) : null;
          if (!sameDay(h, this.hover)) { this.hover = h; this.paint(); }
        });
        el.addEventListener('mouseleave', () => { this.hover = null; this.paint(); });
      }
      this.render();
    }
    render() {
      const t = today();
      const minView = new Date(t.getFullYear(), t.getMonth(), 1);
      const maxView = new Date(t.getFullYear(), t.getMonth() + 18, 1);
      const v = this.view;
      const title = m => `${MONTHS[m.getMonth()]} ${m.getFullYear()}.`;
      let html = `<div class="cal__head"><span class="cal__title">${this.months === 1 ? title(v) : 'Dolazak — odlazak'}</span>
        <div class="cal__nav">
          <button type="button" data-nav="-1" aria-label="Prethodni mjesec" ${v <= minView ? 'disabled' : ''}>${icon('arrow-l')}</button>
          <button type="button" data-nav="1" aria-label="Sljedeći mjesec" ${v >= maxView ? 'disabled' : ''}>${icon('arrow-r')}</button>
        </div></div><div class="cal__months">`;
      for (let k = 0; k < this.months; k++) {
        const m = new Date(v.getFullYear(), v.getMonth() + k, 1);
        html += `<div class="cal__month">${this.months > 1 ? `<div class="cal__month-title">${title(m)}</div>` : ''}
          <div class="cal__week">${WEEKDAYS.map(d => `<span>${d}</span>`).join('')}</div><div class="cal__grid">`;
        const offset = (m.getDay() + 6) % 7;
        for (let i = 0; i < offset; i++) html += '<span></span>';
        const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= days; d++) {
          const dt = new Date(m.getFullYear(), m.getMonth(), d);
          html += `<button type="button" data-date="${toISO(dt)}" ${dt < t ? 'disabled' : ''} aria-label="${d}. ${MONTHS_GEN[m.getMonth()]} ${m.getFullYear()}.">${d}</button>`;
        }
        html += '</div></div>';
      }
      this.el.innerHTML = html + '</div>';
      this.paint();
    }
    paint() {
      const { from, to } = state;
      const h = this.hover;
      const t = today();
      $$('[data-date]', this.el).forEach(b => {
        const d = fromISO(b.dataset.date);
        const isS = sameDay(d, from);
        const previewEnd = !to && from && h && h > from;
        const isE = sameDay(d, to) || (previewEnd && sameDay(d, h));
        b.classList.toggle('is-start', !!isS);
        b.classList.toggle('is-end', !!isE);
        b.classList.toggle('has-end', !!(isS && (to || previewEnd)));
        b.classList.toggle('in-range', !!(from && to && d > from && d < to));
        b.classList.toggle('in-preview', !!(previewEnd && d > from && d < h));
        b.classList.toggle('is-pending', !!(isS && !to));
        b.classList.toggle('is-today', sameDay(d, t));
        b.setAttribute('aria-pressed', String(!!(isS || sameDay(d, to))));
      });
    }
    showDate(d) {
      if (!d) return;
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      const last = new Date(this.view.getFullYear(), this.view.getMonth() + this.months - 1, 1);
      if (first < this.view || first > last) { this.view = first; this.render(); }
    }
    onClick(e) {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const v = this.view;
        this.view = new Date(v.getFullYear(), v.getMonth() + +nav.dataset.nav, 1);
        this.render();
        return;
      }
      const b = e.target.closest('[data-date]');
      if (!b || b.disabled) return;
      const d = fromISO(b.dataset.date);
      if (!state.from || state.to || d <= state.from) setState({ from: d, to: null });
      else setState({ to: d });
      this.el.dispatchEvent(new CustomEvent('pick', { bubbles: true }));
    }
  }

  const cals = $$('[data-calendar]').map(el => new RangeCal(el));
  subs.push(() => cals.forEach(c => c.paint()));

  // Povezivanje prikaza
  function renderBindings() {
    const s = STAYS[state.stay];
    const { from, to, guests } = state;
    const n = from && to ? nightsBetween(from, to) : 0;
    const rangeTxt = from && to
      ? `${fmtShort(from)} – ${fmtShort(to)} ${to.getFullYear()}.`
      : from ? `${fmtShort(from)} → odlazak?` : 'Odaberite datume';
    $$('[data-bind="range"]').forEach(el => { el.textContent = rangeTxt; });
    $$('[data-bind="guests"]').forEach(el => { el.textContent = guests; });
    $$('[data-bind="nights"]').forEach(el => {
      el.textContent = n ? nightsText(n) : from ? 'Odaberite datum odlaska' : (el.tagName === 'EM' ? '' : 'Odaberite datum dolaska');
    });
    $$('[data-bind="stayName"]').forEach(el => { el.textContent = s.name; });
    $$('[data-bind="summary"]').forEach(el => {
      el.textContent = from && to
        ? `${fmtShort(from)} – ${fmtShort(to)} ${to.getFullYear()}. · ${nightsText(n)} · ${guestsText(guests)}`
        : `Odaberite datume dolaska i odlaska · ${guestsText(guests)}`;
    });
    const warn = $('[data-bind="warn"]');
    if (guests > s.max) {
      warn.hidden = false;
      warn.textContent = `${s.name} prima do ${s.max} ${plural(s.max, 'gosta', 'gosta', 'gostiju')} po jedinici — za ${guestsText(guests)} odabrat ćete više jedinica u sljedećem koraku.`;
    } else warn.hidden = true;
    $$('[data-stepper]').forEach(st => {
      $('[data-step="-1"]', st).disabled = guests <= 1;
      $('[data-step="1"]', st).disabled = guests >= MAX_GUESTS;
    });
    const qs = $('#quickStay');
    if (qs.value !== state.stay) qs.value = state.stay;
    $$('input[name="stay"]').forEach(r => { r.checked = r.value === state.stay; });
    $$('input[name="extra"]').forEach(c => { c.checked = state.extras.has(c.value); });
  }
  subs.push(renderBindings);
  renderBindings();

  $$('[data-stepper]').forEach(st => st.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    setState({ guests: Math.max(1, Math.min(MAX_GUESTS, state.guests + +b.dataset.step)) });
  }));
  $('#quickStay').addEventListener('change', e => setState({ stay: e.target.value }));
  $$('input[name="stay"]').forEach(r => r.addEventListener('change', () => { if (r.checked) setState({ stay: r.value }); }));
  $$('input[name="extra"]').forEach(c => c.addEventListener('change', () => {
    const ex = new Set(state.extras);
    c.checked ? ex.add(c.value) : ex.delete(c.value);
    setState({ extras: ex });
  }));

  function bookingUrl() {
    const s = STAYS[state.stay];
    let url = (CFG.bookingBase || 'https://www.visitljubac.com/hr/properties/') + s.slug;
    if (state.from && state.to) url += `?a=${toISO(state.from)}&d=${toISO(state.to)}&na=${state.guests}`;
    return url;
  }
  function openBooking() {
    window.open(bookingUrl(), '_blank', 'noopener');
  }

  // Popover s kalendarom u heroju
  const pop = $('#quickPop');
  const quickDates = $('#quickDates');
  const setPop = open => {
    popOpen = open;
    pop.classList.toggle('is-open', open);
    quickDates.setAttribute('aria-expanded', String(open));
    if (open) { const c = cals.find(c => c.el.dataset.calendar === 'quick'); if (c) c.showDate(state.from); }
  };
  quickDates.addEventListener('click', e => { e.stopPropagation(); setPop(!popOpen); });
  $('[data-close-pop]').addEventListener('click', () => setPop(false));
  pop.addEventListener('click', e => e.stopPropagation());
  pop.addEventListener('pick', () => { if (state.from && state.to) setTimeout(() => setPop(false), 450); });
  document.addEventListener('click', () => { if (popOpen) setPop(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (popOpen) setPop(false); if (menuOpen) setMenu(false); } });

  $('#quick').addEventListener('submit', e => {
    e.preventDefault();
    if (!state.from || !state.to) { setPop(true); toast('Odaberite datum dolaska i odlaska'); return; }
    openBooking();
  });

  const widget = $('#widget');
  const flashWidget = () => { widget.classList.remove('is-flash'); void widget.offsetWidth; widget.classList.add('is-flash'); };
  const goToWidget = () => {
    widget.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    setTimeout(flashWidget, 700);
  };

  widget.addEventListener('submit', e => {
    e.preventDefault();
    if (!state.from || !state.to) {
      toast(state.from ? 'Odaberite datum odlaska' : 'Odaberite datum dolaska i odlaska');
      const c = $('.calendar', widget);
      c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    openBooking();
  });

  // Gumbi "Rezerviraj" kod smještaja
  $$('[data-book]').forEach(b => b.addEventListener('click', () => {
    setState({ stay: b.dataset.book });
    goToWidget();
  }));
  // Dodatne usluge
  $$('[data-extra]').forEach(b => b.addEventListener('click', () => {
    const ex = new Set(state.extras);
    ex.add(b.dataset.extra);
    setState({ extras: ex });
    toast(`Dodano uz rezervaciju: ${EXTRAS[b.dataset.extra]}`);
    goToWidget();
  }));

  // Upit
  const inqToggle = $('#inquiryToggle');
  const inquiry = $('#inquiry');
  inqToggle.addEventListener('click', () => {
    const open = inquiry.hidden;
    inquiry.hidden = !open;
    inqToggle.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => $('#fName').focus({ preventScroll: true }), 50);
  });

  function inquiryText() {
    const s = STAYS[state.stay];
    const { from, to, guests } = state;
    const f = id => $(id).value.trim();
    const lines = ['Pozdrav,', '', 'zanima me boravak u Visit Ljubač:', '', `• Smještaj: ${s.name}`];
    if (from && to) {
      lines.push(`• Dolazak: ${fmtLong(from)}`, `• Odlazak: ${fmtLong(to)} (${nightsText(nightsBetween(from, to))})`);
    } else lines.push('• Datumi: fleksibilni / još nisu odabrani');
    lines.push(`• Broj gostiju: ${guests}`);
    if (state.extras.size) lines.push(`• Dodatne usluge: ${[...state.extras].map(x => EXTRAS[x]).join(', ')}`);
    if (f('#fMsg')) lines.push('', f('#fMsg'));
    lines.push('', `Ime: ${f('#fName')}`);
    if (f('#fPhone')) lines.push(`Telefon: ${f('#fPhone')}`);
    if (f('#fEmail')) lines.push(`E-mail: ${f('#fEmail')}`);
    return lines.join('\n');
  }
  $$('[data-send]').forEach(b => b.addEventListener('click', () => {
    if (!$('#fName').value.trim()) { toast('Upišite svoje ime'); $('#fName').focus(); return; }
    const email = $('#fEmail').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Provjerite e-mail adresu'); $('#fEmail').focus(); return; }
    const text = inquiryText();
    if (b.dataset.send === 'wa') {
      window.open(`https://wa.me/${(CFG.phone || '+385916179002').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    } else {
      const subject = `Upit za rezervaciju — ${STAYS[state.stay].name}`;
      location.href = `mailto:${CFG.email || 'visitljubac@ulixtravel.com'}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    }
    toast('Poruka je spremna — samo je pošaljite ✓');
  }));

  /* =========================================================
     NOVOSTI — news feed
     ========================================================= */
  const CATS = { obavijest: 'Obavijest', dogadanje: 'Događanje', prica: 'Priča' };
  const normCat = c => {
    const s = String(c || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace('đ', 'd');
    if (s.includes('dog')) return 'dogadanje';
    if (s.includes('pri')) return 'prica';
    return 'obavijest';
  };
  const parseDate = v => {
    if (!v) return new Date(0);
    let m = String(v).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], m[2] - 1, +m[3]);
    m = String(v).trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    if (m) return new Date(+m[3], m[2] - 1, +m[1]);
    const d = new Date(v);
    return isNaN(d) ? new Date(0) : d;
  };
  const paragraphs = t => (Array.isArray(t) ? t : String(t || '').split(/\n\s*\n|\r\n\s*\r\n/))
    .map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${esc(p).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>')}</p>`)
    .join('');

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function fromSheet(csv) {
    const rows = parseCSV(csv).filter(r => r.some(c => c.trim()));
    if (rows.length < 2) return [];
    const head = rows[0].map(h => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    const col = name => head.findIndex(h => h.startsWith(name));
    const ix = { datum: col('datum'), naslov: col('naslov'), kategorija: col('kategor'), sazetak: col('sazet'), tekst: col('tekst'), slika: col('slika'), facebook: col('facebook') };
    return rows.slice(1).map((r, k) => {
      const g = key => (ix[key] >= 0 ? (r[ix[key]] || '').trim() : '');
      return { id: 'fb' + k, datum: g('datum'), naslov: g('naslov'), kategorija: g('kategorija'), sazetak: g('sazetak'), tekst: g('tekst'), slika: g('slika'), facebook: g('facebook') };
    }).filter(it => it.naslov);
  }

  const feed = $('#feed');
  const moreBtn = $('#feedMore');
  let news = [], filter = 'sve', shown = 7;

  async function loadNews() {
    let items = [];
    try {
      const r = await fetch('data/novosti.json', { cache: 'no-cache' });
      const j = await r.json();
      items = j.novosti || [];
    } catch (e) { /* bez lokalnih novosti */ }
    if (CFG.newsSheetCsv) {
      try {
        const t = await (await fetch(CFG.newsSheetCsv, { cache: 'no-cache' })).text();
        items = items.concat(fromSheet(t));
      } catch (e) { /* tablica nedostupna */ }
    }
    items.forEach((it, k) => {
      it.id = it.id || 'n' + k;
      it._d = parseDate(it.datum);
      it._c = normCat(it.kategorija);
    });
    return items.sort((a, b) => b._d - a._d);
  }

  const fbUrl = CFG.facebookUrl || 'https://www.facebook.com/';
  $$('[data-fb-link]').forEach(a => { a.href = fbUrl; });

  function card(it, k, featured) {
    const excerpt = it.sazetak || String(Array.isArray(it.tekst) ? it.tekst[0] : it.tekst || '').slice(0, 220);
    return `<article class="post${featured ? ' post--featured' : ''}" tabindex="0" role="button" data-id="${esc(it.id)}" style="--i:${k}" aria-label="${esc(it.naslov)}">
      <div class="post__img">${it.slika ? `<img src="${esc(it.slika)}" alt="" loading="lazy" decoding="async">` : ''}
        ${it.facebook ? `<span class="post__fb">${icon('facebook')} Facebook</span>` : ''}</div>
      <div class="post__body">
        <p class="post__meta"><span class="tag ${it._c === 'dogadanje' ? 'tag--sun' : 'tag--sea'}">${CATS[it._c]}</span><time datetime="${toISO(it._d)}">${fmtLong(it._d)}</time></p>
        <h3 class="post__title">${esc(it.naslov)}</h3>
        <p class="post__excerpt">${esc(excerpt)}</p>
        <span class="post__more">Pročitaj više ${icon('arrow-r')}</span>
      </div>
    </article>`;
  }
  const fbCard = () => `<div class="post post--fbcta" style="--i:8">
      <span class="fbicon">${icon('facebook')}</span>
      <div><h3>Budite prvi koji saznaju novosti</h3><p style="margin-top:10px">Fotografije, događanja i posebne ponude iz Ljubača — pridružite se našoj zajednici na Facebooku.</p></div>
      <a class="btn btn--fb" href="${esc(fbUrl)}" target="_blank" rel="noopener">${icon('facebook')} Pratite nas</a>
    </div>`;

  function renderFeed() {
    const list = news.filter(it => filter === 'sve' || it._c === filter);
    const vis = list.slice(0, shown);
    feed.innerHTML = list.length
      ? vis.map((it, k) => card(it, k, k === 0 && filter === 'sve')).join('') + fbCard()
      : `<p class="feed__empty">Trenutno nema objava u ovoj kategoriji.</p>`;
    moreBtn.hidden = list.length <= shown;
  }
  loadNews().then(items => { news = items; renderFeed(); });

  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    $$('.filters button').forEach(x => x.classList.toggle('is-active', x === b));
    filter = b.dataset.filter;
    shown = 7;
    renderFeed();
  }));
  moreBtn.addEventListener('click', () => { shown += 6; renderFeed(); });

  // Modal članka
  const modal = $('#article');
  let modalFocus = null;
  function openArticle(it) {
    modalFocus = document.activeElement;
    const img = $('.modal__img img', modal);
    $('.modal__img', modal).hidden = !it.slika;
    if (it.slika) { img.src = it.slika; img.alt = it.naslov; }
    $('.modal__meta', modal).innerHTML = `<span class="tag ${it._c === 'dogadanje' ? 'tag--sun' : 'tag--sea'}">${CATS[it._c]}</span><time>${fmtLong(it._d)}</time>`;
    $('.modal__title', modal).textContent = it.naslov;
    $('.modal__text', modal).innerHTML = paragraphs(it.tekst || it.sazetak);
    const links = (it.poveznice || []).map(l => `<a class="btn btn--line btn--sm" href="${esc(l.url)}" ${/^https?:/.test(l.url) ? 'target="_blank" rel="noopener"' : ''}>${esc(l.naziv)} ${icon('external')}</a>`).join('');
    $('.modal__actions', modal).innerHTML =
      (it.facebook ? `<a class="btn btn--fb btn--sm" href="${esc(it.facebook)}" target="_blank" rel="noopener">${icon('facebook')} Pogledaj objavu na Facebooku</a>` : '') +
      links + `<a class="btn btn--sun btn--sm" href="#rezervacija" data-close>Rezervirajte boravak ${icon('arrow-r')}</a>`;
    modal.hidden = false;
    $('.modal__scroll', modal).scrollTop = 0;
    lockScroll(true);
    $('.modal__close', modal).focus({ preventScroll: true });
  }
  function closeArticle(then) {
    if (modal.hidden || modal.classList.contains('is-closing')) return;
    modal.classList.add('is-closing');
    setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove('is-closing');
      lockScroll(false);
      if (typeof then === 'function') then();
      else if (modalFocus) modalFocus.focus({ preventScroll: true });
    }, reduced ? 10 : 430);
  }
  modal.addEventListener('click', e => {
    const c = e.target.closest('[data-close]');
    if (!c) return;
    const href = c.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      closeArticle(() => $(href).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
    } else closeArticle();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeArticle(); });

  feed.addEventListener('click', e => {
    const p = e.target.closest('.post[data-id]');
    if (!p) return;
    const it = news.find(n => n.id === p.dataset.id);
    if (it) openArticle(it);
  });
  feed.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.post[data-id]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  /* ---------- Ostalo ---------- */
  const yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
