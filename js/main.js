/* =========================================================
   Visit Ljubač — interakcije i animacije
   GSAP + ScrollTrigger + SplitText, Lenis (desktop)
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const CFG = window.VL_CONFIG || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const motion = !!(G && ST) && !reduced;
  if (!motion) root.classList.add('no-motion');
  if (G && ST) G.registerPlugin(ST);
  if (G && window.SplitText) G.registerPlugin(window.SplitText);
  window.VL_OK = true;

  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls = 'i') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;
  const pad2 = n => String(n).padStart(2, '0');
  const hdrH = () => parseFloat(getComputedStyle(root).getPropertyValue('--hdr')) || 64;

  /* ---------- Datumi (hrvatski) ---------- */
  const MONTHS = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'];
  const MONTHS_GEN = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];
  const MONTHS_SHORT = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'];
  const WEEKDAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const sameDay = (a, b) => !!(a && b && a.getTime() === b.getTime());
  const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const nightsBetween = (a, b) => Math.round((b - a) / 864e5);
  const fmtLong = d => `${d.getDate()}. ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}.`;
  const fmtShort = d => `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  const guestsText = n => `${n} ${plural(n, 'gost', 'gosta', 'gostiju')}`;
  const nightsText = n => `${n} ${plural(n, 'noćenje', 'noćenja', 'noćenja')}`;

  /* =========================================================
     GLATKO SKROLANJE (Lenis, samo desktop)
     ========================================================= */
  let lenis = null;
  if (motion && finePointer && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: false });
    lenis.on('scroll', ST.update);
    G.ticker.add(t => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  if (motion) ST.config({ ignoreMobileResize: true });

  function scrollToEl(el, offset) {
    const off = offset == null ? -(hdrH() + 8) : offset;
    if (el === 'top') {
      if (lenis) lenis.scrollTo(0, { duration: 1.6 });
      else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.5 });
    else {
      const y = el.getBoundingClientRect().top + window.scrollY + off;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  // Zaključavanje scrolla (modali, izbornik)
  let locks = 0, lockY = 0;
  function lockScroll(on) {
    if (on) {
      if (locks++ > 0) return;
      if (lenis) { lenis.stop(); return; }
      lockY = window.scrollY;
      Object.assign(document.body.style, { position: 'fixed', top: `-${lockY}px`, left: '0', right: '0', width: '100%' });
    } else {
      if (locks === 0 || --locks > 0) return;
      if (lenis) { lenis.start(); return; }
      Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' });
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

  /* ---------- Gumbi: tekst koji se kotrlja ---------- */
  $$('[data-roll]').forEach(btn => {
    const tn = Array.from(btn.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
    if (!tn) return;
    const t = tn.textContent.trim();
    const roll = document.createElement('span');
    roll.className = 'roll';
    roll.innerHTML = `<span>${esc(t)}</span><span aria-hidden="true">${esc(t)}</span>`;
    tn.replaceWith(roll);
  });

  /* =========================================================
     LOADER
     ========================================================= */
  const countEl = $('.loader__count b');
  let shown = 0;
  const heroImg = $('.hero__bw');
  const imgReady = new Promise(r => {
    if (!heroImg || heroImg.complete) return r();
    heroImg.addEventListener('load', r, { once: true });
    heroImg.addEventListener('error', r, { once: true });
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const minTime = new Promise(r => setTimeout(r, reduced ? 0 : 1900));
  const countTo = target => new Promise(res => {
    const step = () => {
      shown += Math.max(1, Math.round((target - shown) * 0.08));
      if (shown >= target) shown = target;
      if (countEl) countEl.textContent = shown;
      shown < target ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
  countTo(72);
  Promise.all([minTime, Promise.race([Promise.all([imgReady, fontsReady]), new Promise(r => setTimeout(r, 3500))])])
    .then(() => countTo(100))
    .then(() => setTimeout(ready, 150));

  function ready() {
    if (root.classList.contains('is-ready')) return;
    root.classList.remove('is-loading');
    root.classList.add('is-ready');
    setTimeout(() => { const l = $('#loader'); if (l) l.remove(); }, 1400);
    heroIntro();
    if (motion) setTimeout(() => ST.refresh(), 200);
  }

  /* =========================================================
     HEADER + IZBORNIK
     ========================================================= */
  const hdr = $('#hdr');
  const hero = $('.hero');
  const dock = $('#dock');
  let heroP = 0, lastY = window.scrollY, menuOpen = false, ticking = false;
  const zones = $$('[data-header]');

  function headerUpdate() {
    const y = window.scrollY;
    const line = hdrH() / 2;
    const heroEnd = hero.offsetTop + hero.offsetHeight - window.innerHeight;
    let theme = '';
    if (y < heroEnd + 10 && heroP > 0.32) theme = 'dark';
    for (const z of zones) {
      const r = z.getBoundingClientRect();
      if (r.top <= line && r.bottom >= line) { theme = z.dataset.header; break; }
    }
    hdr.classList.toggle('is-dark', theme === 'dark');
    hdr.classList.toggle('is-red', theme === 'red');
    hdr.classList.toggle('is-solid', y > heroEnd - 10);
    hdr.classList.toggle('show-logo', !motion || y > window.innerHeight * 0.28);
    if (!menuOpen) {
      if (y > lastY + 4 && y > heroEnd + 200) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y <= heroEnd + 200) hdr.classList.remove('is-hidden');
    }
    lastY = y;
    const bookR = $('#rezervacija').getBoundingClientRect();
    const footR = $('.foot').getBoundingClientRect();
    const inBook = bookR.top < window.innerHeight * 0.7 && bookR.bottom > 0;
    const inFoot = footR.top < window.innerHeight;
    dock.classList.toggle('is-visible', y > heroEnd + 120 && !inBook && !inFoot);
    ticking = false;
  }
  const requestHeader = () => { if (!ticking) { ticking = true; requestAnimationFrame(headerUpdate); } };
  addEventListener('scroll', requestHeader, { passive: true });
  addEventListener('resize', requestHeader, { passive: true });
  headerUpdate();

  const burger = $('#burger');
  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Zatvori izbornik' : 'Otvori izbornik');
    $('#menu').setAttribute('aria-hidden', String(!open));
    lockScroll(open);
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));

  // Sidrene poveznice → glatki scroll
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = id === '#top' ? 'top' : $(id);
    if (!target) return;
    e.preventDefault();
    const go = () => scrollToEl(target, id === '#rezervacija' && window.innerWidth < 1000 ? -(hdrH() + 8) : undefined);
    if (menuOpen) { setMenu(false); setTimeout(go, 60); } else go();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  // Aktivna poveznica u navigaciji
  const navLinks = $$('.hdr__nav a');
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) navIO.observe(s); });

  /* =========================================================
     HERO — prozor koji se širi u cijeli ekran
     ========================================================= */
  const sticky = $('.hero__sticky');
  const win = $('.hero__win');
  const brand = $('.hero__brand');
  const sticker = $('.hero__sticker');

  // Početni položaj "prozora" ispod velikog logotipa
  const W0 = { w: 0, h: 0, y: 0 };
  function layoutWin() {
    if (!motion) return;
    const sw = sticky.clientWidth, sh = sticky.clientHeight;
    const bb = brand.offsetTop + brand.offsetHeight;
    const room = sh - bb;
    const mobile = window.innerWidth < 700;
    W0.w = mobile ? sw * 0.72 : Math.min(sw * 0.38, 520);
    const hint = 96; // prostor za "Skrolajte" pri dnu
    W0.h = Math.max(150, Math.min(mobile ? sh * 0.36 : Math.min(sh * 0.4, 400), room - hint - 40));
    W0.y = bb + (room - hint) / 2 + 14;
    sticky.style.setProperty('--ww', W0.w + 'px');
    sticky.style.setProperty('--wh', W0.h + 'px');
    sticky.style.setProperty('--wy', W0.y + 'px');
  }

  let heroTl = null;
  function setupHero() {
    if (!motion) return;
    layoutWin();
    G.set(win, { xPercent: -50, yPercent: -50, rotation: -3 });
    const imgs = $$('.hero__win img');
    const lines = $$('.hero__title .ln > span');
    G.set(lines, { yPercent: 115 });
    G.set(['.hero__kicker', '.hero__foot'], { autoAlpha: 0, y: 30 });

    heroTl = G.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.9, invalidateOnRefresh: true,
        onRefreshInit: layoutWin,
        onUpdate: s => { heroP = s.progress; requestHeader(); }
      }
    });
    heroTl
      .fromTo(win,
        { width: () => W0.w, height: () => W0.h, top: () => W0.y, rotation: -3, borderRadius: 24 },
        { width: () => sticky.clientWidth, height: () => sticky.clientHeight, top: () => sticky.clientHeight / 2, rotation: 0, borderRadius: 0, ease: 'power2.inOut', duration: 0.5, immediateRender: true }, 0)
      .fromTo(imgs, { scale: 1.28 }, { scale: 1, duration: 0.58, ease: 'power1.out' }, 0)
      .fromTo('.hero__color', { opacity: 0 }, { opacity: 1, duration: 0.34 }, 0.08)
      .fromTo(brand, { yPercent: 0, autoAlpha: 1 }, { yPercent: -18, autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0)
      .fromTo(sticker, { scale: 1, rotation: 0, autoAlpha: 1 }, { scale: 0.4, autoAlpha: 0, rotation: 60, duration: 0.18 }, 0)
      .fromTo(['.hero__hint', '.hero__coords'], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.08 }, 0)
      .fromTo('.hero__shade', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.34)
      .fromTo('.hero__kicker', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.14, ease: 'power2.out' }, 0.5)
      .fromTo(lines, { yPercent: 115 }, { yPercent: 0, duration: 0.26, stagger: 0.07, ease: 'power3.out' }, 0.52)
      .fromTo('.hero__foot', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.16, ease: 'power2.out' }, 0.74)
      .to({}, { duration: 0.1 });
  }

  function heroIntro() {
    $$('.hero__logo').forEach(l => l.classList.add('is-in'));
    if (!motion) return;
    const tl = G.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(win, { y: 120, scale: 0.8, autoAlpha: 0, duration: 1.4 }, 0.35)
      .from(sticker, { scale: 0, rotation: -120, duration: 1.1, ease: 'back.out(2)' }, 0.9)
      .from('.hero__meta span', { y: 16, autoAlpha: 0, stagger: 0.06, duration: 0.9 }, 0.8)
      .from(['.hero__hint', '.hero__coords'], { autoAlpha: 0, duration: 1 }, 1.1);
  }

  /* =========================================================
     TRAKA — brzina ovisi o skrolanju
     ========================================================= */
  function setupBand() {
    const track = $('.band__track');
    if (!motion) return;
    const loop = G.to(track, { xPercent: -50, ease: 'none', duration: 26, repeat: -1 });
    const skew = G.quickTo(track, 'skewX', { duration: 0.4, ease: 'power3' });
    let dir = 1;
    ST.create({
      trigger: '.band', start: 'top bottom', end: 'bottom top',
      onUpdate(self) {
        const v = self.getVelocity();
        dir = self.direction;
        const speed = Math.min(6, 1 + Math.abs(v) / 350);
        G.to(loop, { timeScale: dir * speed, duration: 0.25, overwrite: true, onComplete: () => G.to(loop, { timeScale: dir, duration: 1.2 }) });
        skew(G.utils.clamp(-8, 8, v / -250));
      },
      onLeave: () => skew(0), onLeaveBack: () => skew(0)
    });
  }

  /* =========================================================
     REVEAL ANIMACIJE
     ========================================================= */
  function setupReveals() {
    if (!motion) return;
    const Split = window.SplitText;
    if (Split) {
      $$('[data-lines]').forEach(el => {
        Split.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'ln-split', autoSplit: true,
          onSplit(self) {
            return G.from(self.lines, {
              yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.09,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true }
            });
          }
        });
      });
      const man = $('.manifesto');
      if (man) {
        const sp = Split.create(man, { type: 'words', wordsClass: 'word' });
        G.to(sp.words, {
          color: (i, w) => (w.closest('em') ? '#e5212d' : '#0b0b0b'),
          stagger: 0.12, ease: 'none',
          scrollTrigger: { trigger: man, start: 'top 80%', end: 'bottom 45%', scrub: true }
        });
      }
    }

    G.set('[data-fade]', { y: 44, autoAlpha: 0 });
    ST.batch('[data-fade]', {
      start: 'top 92%', once: true,
      onEnter: els => G.to(els, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: true })
    });

    // Paralaksa slike priče
    const sImg = $('.story__frame img');
    if (sImg) {
      G.fromTo(sImg, { yPercent: -7, scale: 1.16 }, {
        yPercent: 7, scale: 1.16, ease: 'none',
        scrollTrigger: { trigger: '.story__frame', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }
  }

  // Brojači
  const fmtNum = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const countIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, dur = reduced ? 1 : 2200, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = fmtNum(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  if (!reduced) $$('[data-count]').forEach(el => countIO.observe(el));

  // Fotografije dobivaju boju kad ih pogledate
  $$('.slider').forEach(s => s.classList.add('bloom'));
  const bloomIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-color');
    bloomIO.unobserve(e.target);
  }), { threshold: 0.35 });
  const observeBloom = (ctx = document) => $$('.bloom:not(.is-color)', ctx).forEach(el => bloomIO.observe(el));
  observeBloom();

  /* =========================================================
     SMJEŠTAJ — kartice koje se slažu
     ========================================================= */
  const stack = $('#stack');
  const cards = $$('.card', stack);
  let stackTriggers = [];
  function buildStack() {
    stackTriggers.forEach(t => t.kill());
    stackTriggers = [];
    cards.forEach(c => { c.style.removeProperty('--dim'); c.style.transform = ''; });
    const top = hdrH() + 14;
    const avail = window.innerHeight - top - 12;
    const fits = cards.every(c => c.offsetHeight <= avail);
    stack.classList.toggle('no-stack', !fits);
    if (!motion || !fits) return;
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const tw = G.to(card, {
        scale: 0.9, '--dim': 0.55, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: `top ${top}px`, scrub: true }
      });
      stackTriggers.push(tw.scrollTrigger);
    });
  }

  /* ---------- Slideri + lightbox ---------- */
  const Lightbox = (() => {
    const lb = $('#lightbox');
    const track = $('.lightbox__track', lb);
    const title = $('.lightbox__title', lb);
    const count = $('.lightbox__count', lb);
    let items = [], idx = 0, lastFocus = null;
    const update = () => {
      idx = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      count.textContent = `${pad2(idx + 1)} / ${pad2(items.length)}`;
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
    const count = $('.slider__count', sl);
    const bar = $('.slider__bar i', sl);
    const btns = $$('.slider__btn', sl);
    let idx = 0;
    bar.style.setProperty('--w', (100 / n) + '%');
    const update = () => {
      idx = Math.min(n - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
      count.textContent = `${pad2(idx + 1)} / ${pad2(n)}`;
      bar.style.setProperty('--x', (idx * 100) + '%');
      btns[0].disabled = idx === 0;
      btns[1].disabled = idx === n - 1;
    };
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    btns.forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      track.scrollBy({ left: +b.dataset.dir * track.clientWidth, behavior: 'smooth' });
    }));
    update();
    const open = i => Lightbox.open(figs.map(f => {
      const im = $('img', f);
      return { src: im.dataset.full || im.getAttribute('src'), alt: im.alt };
    }), i, sl.dataset.gallery);
    track.addEventListener('click', e => { if (e.target.tagName === 'IMG') open(idx); });
    const card = sl.closest('.card');
    const gb = card && $('[data-open-gallery]', card);
    if (gb) gb.addEventListener('click', () => open(idx));
  });

  /* =========================================================
     DOŽIVLJAJI — horizontalni scroll
     ========================================================= */
  function setupExp() {
    if (!motion) return;
    const exp = $('.exp');
    const track = $('.exp__track');
    const bar = $('.exp__progress i');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    G.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: exp, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true,
        onRefreshInit: () => { exp.style.height = (dist() + window.innerHeight) + 'px'; },
        onUpdate: s => { bar.style.transform = `scaleX(${s.progress})`; }
      }
    });
  }

  /* =========================================================
     CJENIK — slika prati kursor
     ========================================================= */
  function setupFloat() {
    if (!finePointer || reduced || !G) return;
    const fl = $('.float-img');
    const img = $('img', fl);
    const xTo = G.quickTo(fl, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = G.quickTo(fl, 'y', { duration: 0.6, ease: 'power3' });
    const rTo = G.quickTo(fl, 'rotation', { duration: 0.8, ease: 'power3' });
    let lx = 0;
    $$('.prow').forEach(row => {
      const pre = new Image(); pre.src = row.dataset.img;
      row.addEventListener('mouseenter', () => { img.src = row.dataset.img; fl.classList.add('is-on'); });
      row.addEventListener('mouseleave', () => fl.classList.remove('is-on'));
      row.addEventListener('mousemove', e => {
        xTo(e.clientX - 130 + (e.clientX > innerWidth / 2 ? -180 : 180));
        yTo(e.clientY - 162);
        rTo(G.utils.clamp(-10, 10, (e.clientX - lx) * 0.6));
        lx = e.clientX;
      });
    });
  }

  /* =========================================================
     KURSOR OZNAKA + MAGNETSKI GUMBI + SRCA
     ========================================================= */
  function setupCursor() {
    if (!finePointer || reduced || !G) return;
    root.classList.add('has-cursor');
    const c = $('.cursor');
    const label = $('.cursor__label', c);
    G.set(c, { x: -200, y: -200 });
    const xTo = G.quickTo(c, 'x', { duration: 0.45, ease: 'power3' });
    const yTo = G.quickTo(c, 'y', { duration: 0.45, ease: 'power3' });
    addEventListener('mousemove', e => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { label.textContent = el.dataset.cursor; c.classList.add('is-on'); });
      el.addEventListener('mouseleave', () => c.classList.remove('is-on'));
    });
    // iznad gumba unutar zone sakrij oznaku
    $$('[data-cursor] button, [data-cursor] a').forEach(b => {
      b.addEventListener('mouseenter', () => c.classList.remove('is-on'));
      b.addEventListener('mouseleave', () => c.classList.add('is-on'));
    });
    $$('[data-magnetic]').forEach(el => {
      const mx = G.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const my = G.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.25);
        my((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('mouseleave', () => { mx(0); my(0); });
    });
  }

  function burst(x, y) {
    if (!G || reduced) return;
    for (let i = 0; i < 9; i++) {
      const h = document.createElement('span');
      h.className = 'burst';
      h.innerHTML = icon('heart', 'i i--fill');
      document.body.appendChild(h);
      const a = (-90 + (Math.random() - 0.5) * 150) * Math.PI / 180;
      const d = 50 + Math.random() * 70;
      G.set(h, { x, y, scale: 0.4 + Math.random() * 0.5, rotation: (Math.random() - 0.5) * 40 });
      G.to(h, {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 20, rotation: (Math.random() - 0.5) * 90,
        opacity: 0, duration: 0.9 + Math.random() * 0.4, ease: 'power2.out', onComplete: () => h.remove()
      });
    }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-burst]');
    if (b) burst(e.clientX || b.getBoundingClientRect().left + b.offsetWidth / 2, e.clientY || b.getBoundingClientRect().top);
  });

  /* =========================================================
     OKOLICA — tabovi + karta
     ========================================================= */
  const tabs = $$('.tabs [role="tab"]');
  const pill = $('.tabs__pill');
  const placePill = b => { pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  tabs.forEach(b => b.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t === b)));
    placePill(b);
    $$('[data-panel]').forEach(p => {
      const on = p.dataset.panel === b.dataset.tab;
      p.hidden = !on;
      if (on) {
        p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering');
        p.scrollLeft = 0;
        observeBloom(p);
        if (motion) ST.refresh();
      }
    });
  }));
  const syncPill = () => { const a = tabs.find(t => t.getAttribute('aria-selected') === 'true'); if (a) placePill(a); };
  fontsReady.then(syncPill);
  addEventListener('resize', syncPill, { passive: true });
  syncPill();

  const CAMP = [44.271815, 15.289499], TREE = [44.26170002, 15.31384756];
  function mapFallback() {
    $('#map').innerHTML = `<iframe title="Karta — Visit Ljubač" src="https://www.google.com/maps?q=${CAMP.join(',')}&z=14&output=embed" style="border:0;width:100%;height:100%;position:absolute;inset:0;filter:grayscale(1)" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }
  function initMap() {
    const L = window.L;
    if (!L) return mapFallback();
    const el = $('#map');
    el.innerHTML = '';
    const map = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19
    }).addTo(map);
    const mk = (ll, label) => L.marker(ll, {
      icon: L.divIcon({ className: 'pin', html: `<svg class="pin__heart"><use href="#i-heart"/></svg><span class="pin__label">${label}</span>`, iconSize: [0, 0] })
    }).addTo(map);
    mk(CAMP, 'Glamping kamp · Parcele');
    mk(TREE, 'Kućice na drvetu');
    const p = el.clientWidth < 500 ? 50 : 110;
    map.fitBounds([CAMP, TREE], { padding: [p, p], maxZoom: 14 });
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
  }, { rootMargin: '600px 0px' });
  mapIO.observe($('#map'));

  /* =========================================================
     RECENZIJE
     ========================================================= */
  (function reviews() {
    const box = $('#rev');
    const items = $$('.rev__item', box);
    const barsWrap = $('.rev__bars');
    const bars = $$('i', barsWrap);
    const countB = $('.reviews__count b');
    const n = items.length;
    let idx = 0;
    const splits = [];
    if (motion && window.SplitText) {
      items.forEach((it, k) => { splits[k] = window.SplitText.create($('blockquote', it), { type: 'words', mask: 'words' }); });
    }
    function show(k, dir = 1) {
      items[idx].classList.remove('is-active');
      idx = (k + n) % n;
      const it = items[idx];
      it.classList.add('is-active');
      countB.textContent = pad2(idx + 1);
      bars.forEach((b, j) => {
        b.classList.toggle('is-done', j < idx);
        b.classList.remove('is-active');
      });
      void barsWrap.offsetWidth;
      bars[idx].classList.add('is-active');
      if (splits[idx]) {
        G.fromTo(splits[idx].words, { yPercent: 105 * dir }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.012, overwrite: true });
        G.fromTo($('figcaption', it), { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, delay: 0.25, ease: 'expo.out' });
      }
    }
    bars.forEach(b => b.addEventListener('animationend', () => { if (b.classList.contains('is-active')) show(idx + 1); }));
    $$('[data-rev]').forEach(b => b.addEventListener('click', () => show(idx + +b.dataset.rev, +b.dataset.rev)));
    // pauza izvan ekrana / na hover
    new IntersectionObserver(([e]) => barsWrap.classList.toggle('is-paused', !e.isIntersecting), { threshold: 0.2 }).observe(box);
    if (finePointer) {
      box.addEventListener('mouseenter', () => barsWrap.classList.add('is-paused'));
      box.addEventListener('mouseleave', () => barsWrap.classList.remove('is-paused'));
    }
    // swipe
    let sx = null, sy = null;
    box.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    box.addEventListener('pointerup', e => {
      if (sx == null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      sx = null;
    });
    if (reduced) barsWrap.classList.add('is-paused');
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
      const t = today();
      const left = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() - t.getDate();
      this.view = new Date(t.getFullYear(), t.getMonth() + (left < 8 ? 1 : 0), 1);
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
      const m = this.view;
      let html = `<div class="cal__head"><span class="cal__title">${MONTHS[m.getMonth()]} ${m.getFullYear()}.</span>
        <div class="cal__nav">
          <button type="button" data-nav="-1" aria-label="Prethodni mjesec" ${m <= minView ? 'disabled' : ''}>${icon('arrow-l')}</button>
          <button type="button" data-nav="1" aria-label="Sljedeći mjesec" ${m >= maxView ? 'disabled' : ''}>${icon('arrow')}</button>
        </div></div>
        <div class="cal__week">${WEEKDAYS.map(d => `<span>${d}</span>`).join('')}</div><div class="cal__grid">`;
      const offset = (m.getDay() + 6) % 7;
      for (let i = 0; i < offset; i++) html += '<span></span>';
      const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const dt = new Date(m.getFullYear(), m.getMonth(), d);
        html += `<button type="button" data-date="${toISO(dt)}" ${dt < t ? 'disabled' : ''} aria-label="${d}. ${MONTHS_GEN[m.getMonth()]} ${m.getFullYear()}.">${d}</button>`;
      }
      this.el.innerHTML = html + '</div>';
      this.paint();
    }
    paint() {
      const { from, to } = state;
      const h = this.hover, t = today();
      $$('[data-date]', this.el).forEach(b => {
        const d = fromISO(b.dataset.date);
        const isS = sameDay(d, from);
        const previewEnd = !to && from && h && h > from;
        const isE = sameDay(d, to) || (previewEnd && sameDay(d, h));
        b.classList.toggle('is-start', isS);
        b.classList.toggle('is-end', !!isE);
        b.classList.toggle('has-end', !!(isS && (to || previewEnd)));
        b.classList.toggle('in-range', !!(from && to && d > from && d < to));
        b.classList.toggle('in-preview', !!(previewEnd && d > from && d < h));
        b.classList.toggle('is-pending', !!(isS && !to));
        b.classList.toggle('is-today', sameDay(d, t));
        b.setAttribute('aria-pressed', String(isS || sameDay(d, to)));
      });
    }
    onClick(e) {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        this.view = new Date(this.view.getFullYear(), this.view.getMonth() + +nav.dataset.nav, 1);
        this.render();
        return;
      }
      const b = e.target.closest('[data-date]');
      if (!b || b.disabled) return;
      const d = fromISO(b.dataset.date);
      if (!state.from || state.to || d <= state.from) setState({ from: d, to: null });
      else setState({ to: d });
    }
  }
  const cals = $$('[data-calendar]').map(el => new RangeCal(el));
  subs.push(() => cals.forEach(c => c.paint()));

  function renderBindings() {
    const s = STAYS[state.stay];
    const { from, to, guests } = state;
    const n = from && to ? nightsBetween(from, to) : 0;
    $$('[data-bind="guests"]').forEach(el => { el.textContent = guests; });
    $$('[data-bind="nights"]').forEach(el => { el.textContent = n ? nightsText(n) : from ? 'odaberite odlazak' : ''; });
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
    $$('input[name="stay"]').forEach(r => { r.checked = r.value === state.stay; });
    $$('input[name="extra"]').forEach(c => { c.checked = state.extras.has(c.value); });
  }
  subs.push(renderBindings);
  renderBindings();

  $$('[data-stepper]').forEach(st => st.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (b) setState({ guests: Math.max(1, Math.min(MAX_GUESTS, state.guests + +b.dataset.step)) });
  }));
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

  const widget = $('#widget');
  const flashWidget = () => { widget.classList.remove('is-flash'); void widget.offsetWidth; widget.classList.add('is-flash'); };
  const goToWidget = () => { scrollToEl(widget, -(hdrH() + 12)); setTimeout(flashWidget, 900); };

  widget.addEventListener('submit', e => {
    e.preventDefault();
    if (!state.from || !state.to) {
      toast(state.from ? 'Odaberite datum odlaska' : 'Odaberite datum dolaska i odlaska');
      scrollToEl($('.calendar', widget), -(window.innerHeight * 0.25));
      return;
    }
    window.open(bookingUrl(), '_blank', 'noopener');
  });
  $$('[data-book]').forEach(b => b.addEventListener('click', () => { setState({ stay: b.dataset.book }); goToWidget(); }));
  $$('[data-extra]').forEach(b => b.addEventListener('click', () => {
    const ex = new Set(state.extras);
    ex.add(b.dataset.extra);
    setState({ extras: ex });
    toast(`♥ Dodano: ${EXTRAS[b.dataset.extra]}`);
    goToWidget();
  }));

  const inqToggle = $('#inquiryToggle');
  const inquiry = $('#inquiry');
  inqToggle.addEventListener('click', () => {
    const open = inquiry.hidden;
    inquiry.hidden = !open;
    inqToggle.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => $('#fName').focus({ preventScroll: true }), 50);
    if (motion) ST.refresh();
  });
  function inquiryText() {
    const s = STAYS[state.stay];
    const { from, to, guests } = state;
    const f = id => $(id).value.trim();
    const lines = ['Pozdrav,', '', 'zanima me boravak u Visit Ljubač:', '', `• Smještaj: ${s.name}`];
    if (from && to) lines.push(`• Dolazak: ${fmtLong(from)}`, `• Odlazak: ${fmtLong(to)} (${nightsText(nightsBetween(from, to))})`);
    else lines.push('• Datumi: fleksibilni / još nisu odabrani');
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
      location.href = `mailto:${CFG.email || 'visitljubac@ulixtravel.com'}?subject=${encodeURIComponent('Upit za rezervaciju — ' + STAYS[state.stay].name)}&body=${encodeURIComponent(text)}`;
    }
    toast('♥ Poruka je spremna — samo je pošaljite');
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
  const paragraphs = t => (Array.isArray(t) ? t : String(t || '').split(/\n\s*\n/))
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
      return { id: 'sheet' + k, datum: g('datum'), naslov: g('naslov'), kategorija: g('kategorija'), sazetak: g('sazetak'), tekst: g('tekst'), slika: g('slika'), facebook: g('facebook') };
    }).filter(it => it.naslov);
  }

  const feed = $('#feed');
  const moreBtn = $('#feedMore');
  const fbUrl = CFG.facebookUrl || 'https://www.facebook.com/';
  $$('[data-fb-link]').forEach(a => { a.href = fbUrl; });
  let news = [], filter = 'sve', shownN = 7;

  async function loadNews() {
    let items = [];
    try { items = (await (await fetch('data/novosti.json', { cache: 'no-cache' })).json()).novosti || []; } catch (e) { /* nema lokalnih novosti */ }
    if (CFG.newsSheetCsv) {
      try { items = items.concat(fromSheet(await (await fetch(CFG.newsSheetCsv, { cache: 'no-cache' })).text())); } catch (e) { /* tablica nedostupna */ }
    }
    items.forEach((it, k) => { it.id = it.id || 'n' + k; it._d = parseDate(it.datum); it._c = normCat(it.kategorija); });
    return items.sort((a, b) => b._d - a._d);
  }
  function card(it, k, featured) {
    const excerpt = it.sazetak || String(Array.isArray(it.tekst) ? it.tekst[0] : it.tekst || '').slice(0, 220);
    return `<article class="post${featured ? ' post--featured' : ''}" tabindex="0" role="button" data-id="${esc(it.id)}" style="--i:${k}" aria-label="${esc(it.naslov)}">
      <div class="post__img bloom">${it.slika ? `<img src="${esc(it.slika)}" alt="" loading="lazy" decoding="async">` : ''}${it.facebook ? `<span class="post__fb mono">${icon('facebook', 'i i--fill')} Facebook</span>` : ''}</div>
      <div class="post__body">
        <p class="post__meta mono"><span class="post__tag">${CATS[it._c]}</span><time datetime="${toISO(it._d)}">${fmtLong(it._d)}</time></p>
        <h3 class="post__title">${esc(it.naslov)}</h3>
        <p class="post__excerpt">${esc(excerpt)}</p>
        <span class="post__more">Pročitaj više ${icon('arrow')}</span>
      </div>
    </article>`;
  }
  const fbCard = () => `<div class="post post--cta" style="--i:7">
      <svg class="act__heart"><use href="#i-heart"/></svg>
      <div><h3>Budite prvi koji saznaju novosti</h3><p>Fotografije, događanja i posebne ponude iz Ljubača — pridružite se našoj zajednici na Facebooku.</p></div>
      <a class="btn btn--white" href="${esc(fbUrl)}" target="_blank" rel="noopener">${icon('facebook', 'i i--fill')} Pratite nas</a>
    </div>`;
  function renderFeed() {
    const list = news.filter(it => filter === 'sve' || it._c === filter);
    const vis = list.slice(0, shownN);
    feed.innerHTML = list.length
      ? vis.map((it, k) => card(it, k, k === 0 && filter === 'sve')).join('') + fbCard()
      : '<p class="feed__empty">Trenutno nema objava u ovoj kategoriji.</p>';
    moreBtn.hidden = list.length <= shownN;
    observeBloom(feed);
    if (motion) ST.refresh();
  }
  loadNews().then(items => { news = items; renderFeed(); });
  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    $$('.filters button').forEach(x => x.classList.toggle('is-active', x === b));
    filter = b.dataset.filter;
    shownN = 7;
    renderFeed();
  }));
  moreBtn.addEventListener('click', () => { shownN += 6; renderFeed(); });

  const modal = $('#article');
  let modalFocus = null;
  function openArticle(it) {
    modalFocus = document.activeElement;
    const img = $('.modal__img img', modal);
    $('.modal__img', modal).hidden = !it.slika;
    if (it.slika) { img.src = it.slika; img.alt = it.naslov; }
    $('.modal__meta', modal).innerHTML = `<span class="post__tag">${CATS[it._c]}</span><time>${fmtLong(it._d)}</time>`;
    $('.modal__title', modal).textContent = it.naslov;
    $('.modal__text', modal).innerHTML = paragraphs(it.tekst || it.sazetak);
    const links = (it.poveznice || []).map(l => `<a class="btn btn--line btn--sm" href="${esc(l.url)}" ${/^https?:/.test(l.url) ? 'target="_blank" rel="noopener"' : ''}>${esc(l.naziv)} ${icon('external')}</a>`).join('');
    $('.modal__actions', modal).innerHTML =
      (it.facebook ? `<a class="btn btn--dark btn--sm" href="${esc(it.facebook)}" target="_blank" rel="noopener">${icon('facebook', 'i i--fill')} Objava na Facebooku</a>` : '') +
      links + `<a class="btn btn--red btn--sm" href="#rezervacija" data-close>Rezervirajte boravak</a>`;
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
    e.preventDefault();
    e.stopPropagation();
    const href = c.getAttribute('href');
    if (href && href.startsWith('#')) closeArticle(() => scrollToEl($(href)));
    else closeArticle();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeArticle(); });
  feed.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    const p = e.target.closest('.post[data-id]');
    if (!p) return;
    const it = news.find(n => n.id === p.dataset.id);
    if (it) openArticle(it);
  });
  feed.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.post[data-id]')) { e.preventDefault(); e.target.click(); }
  });

  // Veliki logo u podnožju — slova izranjaju kad dođu u vidno polje
  const footLogo = $('.foot__logo');
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    o.disconnect();
    footLogo.classList.add('is-in');
    setTimeout(() => footLogo.classList.add('is-done'), 2200);
  }, { threshold: 0.3 }).observe(footLogo);

  /* =========================================================
     POKRETANJE
     ========================================================= */
  const yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  if (motion) {
    setupHero();
    setupBand();
    fontsReady.then(() => {
      setupReveals();
      setupExp();
      buildStack();
      ST.refresh();
    });
    let rw = window.innerWidth;
    addEventListener('resize', () => {
      if (Math.abs(window.innerWidth - rw) < 2) return; // iOS: ignoriraj promjenu visine trake
      rw = window.innerWidth;
      buildStack();
      ST.refresh();
    });
    addEventListener('load', () => { buildStack(); ST.refresh(); });
  } else {
    buildStack();
  }
  setupFloat();
  setupCursor();
})();
