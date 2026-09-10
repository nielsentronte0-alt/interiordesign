/* =====================================================================
   Happy 2nd Monthsary — script.js
   Vanilla JS, no dependencies. Works from file:// with no server.

   Sections
     1. CONFIG            – the only thing you need to edit
     2. Utilities
     3. Environment & DOM refs
     4. State machine     – landing → countdown → finale (+ replay)
     5. Background layer  – motes / bokeh / sparkles on a canvas
     6. Audio engine      – Web Audio: chimes, chord, ambient pad, mute
     7. Sprite factory    – procedurally drawn flowers, hearts, confetti…
     8. Particle system   – burst physics, shockwaves, trails, petal rain
     9. Card & notes choreography
    10. Event wiring      – tilt, buttons, keyboard, resize, visibility
    11. Main loop & init
   ===================================================================== */

/* =====================================================================
   1. CONFIG  — edit these values to personalise the page.
      Anywhere you write {partner} or {sender} the names below are used.

      HOW TO EDIT SAFELY: keep each piece of text inside its "quotes",
      and keep the comma at the end of the line. Apostrophes (I'm, you're)
      are fine; just don't type a " inside the text itself.
   ===================================================================== */
const CONFIG = {
  // Names
  partnerName: "My Love",          // shown under the title and at the top of the letter
  senderName: "Me",                // ← your name; the letter is signed "With all my heart, <your name>"

  // Landing text
  title: "Happy 2nd Monthsary",
  subtitle: "Two months of us, and every day still feels like the first.",

  // The button. Keep it short.
  buttonText: "Click or open this",
  buttonHint: "a little something is waiting inside",   // small line under the button, shown exactly as you type it ("" to hide)

  // Countdown
  countdownSeconds: 10,
  countdownCaption: "something is blooming for you…",

  // The letter inside the card
  letter: {
    // the space before ❤️ is a non-breaking space, so the heart never wraps
    // onto a line of its own on a phone
    heading: "Happy monthsary, langga! ❤️",
    paragraphs: [
      "I'm very happy that I got to know you, and I will always love you. Even though sometimes our energy doesn't match, I will always do my best. I love you, and I'm sorry for the things I've done and for the times I made you feel upset or annoyed.",
      "I will always miss you, langga. Amping permi, and timan-e akong gi-sulti nimo nga ayaw kaayog focus nato. I know you already understand that, but please focus on yourself too. I hope we will both win in life someday. I'm always here, loving you and supporting you. You’re also one of the reasons why I’m working hard because you’re always pushing me and helping me become a better man. I may not be the perfect man for you, but I promise I’ll always try to be better for you. I may make mistakes and disappoint you sometimes, but I will never stop caring, loving, and choosing you.",
      "I miss you so much, langga. I just want to say that I love you so much."
    ],
    closing: "Happy 2nd monthsary, my love. I'm sorry for everything. ❤️",
    signature: "With all my heart, {sender}"
  },

  // Short handwritten notes that float in around the card during the finale.
  // Up to 10 are shown on a computer; on a phone only the FIRST 5 or 6 fit,
  // so put your favourites first.
  floatingNotes: [
    "two months of us",
    "you're my favourite notification",
    "forever & always",
    "my safe place",
    "still my favourite hello",
    "every day, I'd pick you",
    "home is wherever you are",
    "my best decision",
    "you + me",
    "to many more"
  ],

  // The two of you, standing around the letter in the finale.
  // Add, remove or reorder these lines freely — the first picture takes the
  // spot above the card, then they fill in down its left and right sides.
  // Anything that has no room outside joins the little keepsake strip at the
  // end of the letter instead. To add one of your own, put the picture in the
  // "stickers" folder and write its file name and its real pixel size here.
  showStickers: true,        // false hides every picture and gives the notes their old space back
  stickerCaption: "us, in every mood",   // the line under the strip inside the letter ("" to hide)
  stickers: [
    { file: "stickers/side-by-side.webp",    w: 329, h: 620, alt: "The two of us standing side by side" },
    { file: "stickers/piggyback.webp",       w: 477, h: 620, alt: "You on my back, holding flowers" },
    { file: "stickers/hand-in-hand.webp",    w: 465, h: 620, alt: "The two of us walking hand in hand" },
    { file: "stickers/hug-from-behind.webp", w: 294, h: 620, alt: "Me hugging you from behind" },
    { file: "stickers/carry.webp",           w: 484, h: 620, alt: "Me carrying you in my arms" }
  ],

  // Audio
  music: true,     // background music

  // Your song. It starts the moment the button is clicked and keeps playing
  // through the countdown and the finale. Put the file in the same folder as
  // index.html and write its exact file name here.
  // Leave it as "" to use the built-in soft synth music instead.
  musicFile: "libu-libong-buwan-uuwian-kyle-raphael-official-music-video_lWqNEHor.mp3",
  musicVolume: 0.6,      // 0 = silent, 1 = full volume
  musicFadeIn: 2.5,      // seconds for the song to fade up

  sounds: true     // countdown chimes, click sounds, burst whoosh
};

/* Everything below is wrapped so nothing leaks except CONFIG and `app`. */
window.app = (function () {
  'use strict';

  /* ===================================================================
     2. Utilities
     =================================================================== */
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  /** Frame-rate independent exponential smoothing. */
  const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
  /** Replace {partner} / {sender} tokens in CONFIG strings. */
  const fill = (s) => String(s == null ? '' : s)
    .replace(/\{partner\}/g, CONFIG.partnerName)
    .replace(/\{sender\}/g, CONFIG.senderName);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(c) {
    const h = (v) => ('0' + clamp(Math.round(v), 0, 255).toString(16)).slice(-2);
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }
  function mixRgb(a, b, t) {
    return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
  }
  function rgba(c, a) { return 'rgba(' + (c.r | 0) + ',' + (c.g | 0) + ',' + (c.b | 0) + ',' + a + ')'; }
  /** shade(c, k): k<0 darkens towards black, k>0 lightens towards white */
  function shade(c, k) {
    return k < 0 ? mixRgb(c, { r: 0, g: 0, b: 0 }, -k) : mixRgb(c, { r: 255, g: 255, b: 255 }, k);
  }

  /* ===================================================================
     3. Environment & DOM refs
     =================================================================== */
  const query = new URLSearchParams(location.search);
  const mq = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false });
  const reducedMQ = mq('(prefers-reduced-motion: reduce)');

  const env = {
    reduced: query.get('reduced') === '1' || reducedMQ.matches,
    dpr: Math.min(2, window.devicePixelRatio || 1),
    w: window.innerWidth,
    h: window.innerHeight,
    // Short side, so a phone held in landscape still counts as a phone.
    mobile: Math.min(window.innerWidth, window.innerHeight) < 720
  };
  if (env.reduced) document.documentElement.classList.add('reduced');

  const $ = (id) => document.getElementById(id);
  const dom = {
    body: document.body,
    stage: $('stage'),
    landing: $('landing'),
    countdown: $('countdown'),
    finale: $('finale'),
    tilt: $('tilt'),
    titleText: $('titleText'),
    titleGlow: $('titleGlow'),
    accentText: $('accentText'),
    subtitle: $('subtitle'),
    openBtn: $('openBtn'),
    btnLabel: $('btnLabel'),
    ctaHint: $('ctaHint'),
    countNum: $('countNum'),
    countCaption: $('countCaption'),
    aura2: $('aura2'),
    auraRing: $('auraRing'),
    pulse: $('pulse'),
    bloom: $('bloom'),
    notes: $('notes'),
    stickerLayer: $('stickerLayer'),
    keepsake: $('keepsake'),
    keepsakeRow: $('keepsakeRow'),
    keepsakeCap: $('keepsakeCap'),
    envelope: $('envelope'),
    cardScene: $('cardScene'),
    card: $('card'),
    cardScroll: $('cardScroll'),
    cardHeading: $('cardHeading'),
    cardBody: $('cardBody'),
    cardClosing: $('cardClosing'),
    cardSignature: $('cardSignature'),
    replayBtn: $('replayBtn'),
    muteBtn: $('muteBtn'),
    muteIcon: $('muteIcon'),
    soundHint: $('soundHint'),
    srStatus: $('srStatus'),
    bgCanvas: $('bgCanvas'),
    fxCanvas: $('fxCanvas')
  };

  function announce(text) { if (dom.srStatus) dom.srStatus.textContent = text; }

  /* ===================================================================
     4. State machine
     =================================================================== */
  const app = {
    phase: null,
    timers: [],
    time: 0,          // seconds since start (pauses when hidden)
    running: false
  };

  /** setTimeout that is cancelled automatically on the next phase change. */
  function after(ms, fn) {
    const id = setTimeout(fn, ms);
    app.timers.push(id);
    return id;
  }
  function clearTimers() {
    for (let i = 0; i < app.timers.length; i++) clearTimeout(app.timers[i]);
    app.timers.length = 0;
  }

  /**
   * settle(el, ms, cls): after `ms` (the transition's expected end) add a
   * "settled" class that disables transitions on `el`, pinning its final
   * state. No-op visually in a normal browser; keeps things honest if the
   * animation clock stalls. stage() starts a new transition stage: it lifts
   * the settle, applies the class, and re-arms the settle for that stage.
   */
  const settleTimers = new WeakMap(); // el → { [cls]: timerId } (weak: notes are replaced on relayout)
  function settle(el, ms, cls) {
    cls = cls || 'settled';
    let m = settleTimers.get(el);
    if (!m) { m = {}; settleTimers.set(el, m); }
    if (m[cls]) clearTimeout(m[cls]);
    m[cls] = after(ms, () => { el.classList.add(cls); m[cls] = 0; });
  }
  function stage(el, cls, ms) {
    const m = settleTimers.get(el);
    if (m && m.settled) { clearTimeout(m.settled); m.settled = 0; }
    el.classList.remove('settled');
    el.classList.add(cls);
    settle(el, ms);
  }

  /**
   * animateOr(el, keyframes, opts, fallbackCls): a one-shot Web Animation
   * (no style reads, no reflow tricks). Older engines fall back to
   * re-triggering a CSS class.
   */
  function animateOr(el, keyframes, opts, fallbackCls) {
    if (el.animate) {
      try { el.animate(keyframes, opts); return; } catch (e) { /* fall through */ }
    }
    el.classList.remove(fallbackCls);
    void el.offsetWidth;
    el.classList.add(fallbackCls);
  }

  /* ---------- Tiny tween engine (transform + opacity, stepped by the main loop) ---------- */
  const tweens = [];
  function tween(el, dur, fn, done) { tweens.push({ el: el, t: 0, dur: dur, fn: fn, done: done || null }); }
  function updateTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = tw.t >= tw.dur ? 1 : tw.t / tw.dur;
      tw.fn(tw.el, k);
      if (k >= 1) {
        tweens[i] = tweens[tweens.length - 1];
        tweens.pop();
        if (tw.done) tw.done(tw.el);
      }
    }
  }
  function cancelTweens(el) {
    for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].el === el) { tweens[i] = tweens[tweens.length - 1]; tweens.pop(); }
  }
  const easeOutBack = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
  const easeInCubic = (k) => k * k * k;

  /** Cross-fades between phase sections (simultaneous: no dark gap). */
  const PHASE_MS = 2300;
  function switchSection(from, to, opts) {
    opts = opts || {};
    if (from) {
      // must match .phase.is-leaving-fast { --t-phase } in style.css, or the
      // settle class would cut the fade short
      const leaveMs = opts.fast ? 2000 : PHASE_MS;
      from.classList.remove('settled', 'is-active', 'enter-delayed');
      from.classList.add(opts.fast ? 'is-leaving-fast' : 'is-leaving');
      after(leaveMs + 100, () => { from.classList.remove('is-leaving', 'is-leaving-fast'); from.classList.add('settled'); });
    }
    to.classList.remove('is-leaving', 'is-leaving-fast');
    to.classList.toggle('enter-delayed', !!opts.delayed);
    stage(to, 'is-active', PHASE_MS + (opts.delayed ? 350 : 0) + 100);
  }

  function goTo(phase, opts) {
    opts = opts || {};
    const prev = app.phase;
    clearTimers();
    app.phase = phase;
    // Drop the "pin the finished crossfade" class BEFORE the phase attribute
    // changes, otherwise the background snaps instead of fading on Replay.
    dom.body.classList.remove('bg-settled');
    dom.body.setAttribute('data-phase', phase);
    if (phase === 'landing') enterLanding(prev, opts);
    else if (phase === 'countdown') enterCountdown(prev, opts);
    else if (phase === 'finale') enterFinale(prev, opts);
  }

  /* ---------- Landing ---------- */
  function enterLanding(prev, opts) {
    const from = prev === 'finale' ? dom.finale : prev === 'countdown' ? dom.countdown : null;
    countdown.active = false;
    // when replaying, let the card ride the finale's fade-out instead of vanishing at the click
    if (prev === 'finale') after(PHASE_MS + 150, resetFinaleDom); else resetFinaleDom();
    resetCountdownDom();
    dom.openBtn.classList.remove('is-pressed');
    dom.openBtn.disabled = false;
    tilt.reset();
    // Restart the landing entrance animations
    dom.landing.classList.remove('is-settled');
    restartAnimations(dom.landing);
    switchSection(from, dom.landing, { delayed: !!from });
    bg.warm = 0;
    bg.sparkleRate = env.reduced ? 0.6 : (env.mobile ? 1.6 : 3);
    if (opts.instant) instantShow(dom.landing);
    announce(fill(CONFIG.title) + ', ' + fill(CONFIG.partnerName) + '.');
    // entrance finished (last element: cta-wrap at 1.55s + 1.2s) — plus crossfade delay when replaying
    after((from ? 600 : 0) + 2900, () => dom.landing.classList.add('is-settled'));
  }

  /* ---------- Countdown ---------- */
  const COUNT_COLS = { gold: hexToRgb('#ffd166'), pink: hexToRgb('#ff2d95'), red: hexToRgb('#ff2d55') };
  const CHIME_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
  /** Clocked from the main loop (wall-clock seconds) so it pauses with the tab. */
  const countdown = { active: false, n: 0, total: 10, acc: 0 };

  function countColour(t) { // t: 0 at start → 1 at final tick
    return t < 0.5 ? mixRgb(COUNT_COLS.gold, COUNT_COLS.pink, t * 2) : mixRgb(COUNT_COLS.pink, COUNT_COLS.red, (t - 0.5) * 2);
  }
  function countProgress(n) { return countdown.total <= 1 ? 1 : (countdown.total - n) / (countdown.total - 1); }

  function enterCountdown(prev, opts) {
    ensureSprites();
    const from = prev === 'landing' ? dom.landing : null;
    switchSection(from, dom.countdown, { delayed: !!from });
    if (opts.instant) instantShow(dom.countdown);
    resetCountdownDom();
    countdown.total = clamp(Math.round(CONFIG.countdownSeconds) || 10, 1, 60);
    countdown.n = countdown.total;
    countdown.active = false;
    announce('Countdown started.');
    after(opts.instant ? 400 : 1100, () => {
      countdown.acc = 0;
      countdown.active = true;
      showNumber(countdown.n, countProgress(countdown.n), countdown.n === 1);
    });
  }

  /** Called every frame with the real elapsed seconds (capped). One tick per frame at most. */
  function updateCountdown(elapsed) {
    if (!countdown.active) return;
    countdown.acc += elapsed;
    if (countdown.acc < 1) return;
    countdown.acc -= 1;
    countdown.n -= 1;
    if (countdown.n <= 0) {
      // 0 → immediate hand-off to the finale burst
      countdown.active = false;
      audio.finalChord();
      rushOutNumber();   // the "1" flies past the viewer as the burst takes over
      goTo('finale');
      return;
    }
    showNumber(countdown.n, countProgress(countdown.n), countdown.n === 1);
  }

  function showNumber(n, t, isLast) {
    const col = countColour(t);
    dom.countdown.style.setProperty('--count-col', rgbToHex(col));
    // exit the previous number: scale up + fade
    const prevNum = dom.countNum.querySelector('.num.in');
    if (prevNum) {
      prevNum.classList.remove('in');
      cancelTweens(prevNum);
      tween(prevNum, 0.85, (el2, k) => {
        const e = easeOutCubic(k);
        el2.style.transform = 'scale(' + (1 + e).toFixed(3) + ')';
        el2.style.opacity = (1 - e).toFixed(3);
      }, (el2) => { if (el2.parentNode) el2.parentNode.removeChild(el2); });
    }
    const el = document.createElement('span');
    el.className = 'num in';
    // Each number owns its tick colour, so no per-frame custom-property
    // interpolation is needed on the big blurred-shadow layers.
    el.style.setProperty('--count-col', rgbToHex(col));
    el.textContent = String(n);
    el.style.opacity = '0';
    el.style.transform = 'scale(0.25) translateY(20px)';
    dom.countNum.appendChild(el);
    tween(el, 0.75, (el2, k) => {
      const e = easeOutBack(k);
      el2.style.transform = 'scale(' + (0.25 + 0.75 * e).toFixed(3) + ') translateY(' + (20 * (1 - e)).toFixed(1) + 'px)';
      el2.style.opacity = Math.min(1, k * 2.5).toFixed(3);
    });
    // aura pulse + expanding ring (Web Animations: no reflow inside the loop)
    animateOr(dom.aura2, [
      { transform: 'translate(-50%, -50%) scale(0.85)', opacity: 0.7 },
      { transform: 'translate(-50%, -50%) scale(1.35)', opacity: 0.1 }
    ], { duration: 900, easing: 'ease-out' }, 'tick');
    animateOr(dom.auraRing, [
      { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0.9 },
      { transform: 'translate(-50%, -50%) scale(1.9)', opacity: 0 }
    ], { duration: 1000, easing: 'ease-out' }, 'tick');
    // background intensifies with each tick
    if (!env.reduced) {
      const strength = 0.14 + 0.36 * t;
      dom.pulse.style.setProperty('--pulse-col', rgba(col, 0.9));
      dom.pulse.style.setProperty('--pulse-max', strength.toFixed(2));
      animateOr(dom.pulse, [
        { opacity: 0, transform: 'scale(0.85)' },
        { opacity: strength, transform: 'scale(1)', offset: 0.18 },
        { opacity: 0, transform: 'scale(1.25)' }
      ], { duration: 900, easing: 'ease-out' }, 'tick');
    }
    bg.pulse = 1;
    const cx = env.w / 2, cy = env.h / 2 - (env.mobile ? 8 : 20);
    particles.sparkRing(cx, cy, env.reduced ? 10 : 34, sparkColourFor(t), 180, 520);
    const stepIndex = Math.min(CHIME_STEPS.length - 1, Math.round(t * 9));
    audio.chime(523.25 * Math.pow(2, CHIME_STEPS[stepIndex] / 12), isLast ? 0.16 : 0.1);
  }

  /** The last number rushes towards the viewer. Driven from the final tick itself,
      so a frame hitch can never drop it between a timer and clearTimers(). */
  function rushOutNumber() {
    const el = dom.countNum.querySelector('.num.in');
    if (!el) return;
    el.classList.remove('in');
    cancelTweens(el);
    tween(el, 1.2, (el2, k) => {
      const e = easeInCubic(k);
      el2.style.transform = 'scale(' + (1 + 3 * e).toFixed(3) + ')';
      el2.style.opacity = (1 - k).toFixed(3);
    }, (el2) => { if (el2.parentNode) el2.parentNode.removeChild(el2); });
  }

  function sparkColourFor(t) { return t < 0.35 ? 'gold' : t < 0.7 ? 'pink' : 'red'; }

  function resetCountdownDom() {
    const nums = dom.countNum.querySelectorAll('.num');
    for (let i = 0; i < nums.length; i++) cancelTweens(nums[i]);
    dom.countNum.textContent = '';
    dom.countdown.style.setProperty('--count-col', '#ffd166');
  }

  /* ---------- Finale ---------- */
  function enterFinale(prev, opts) {
    ensureSprites();
    const from = prev === 'countdown' ? dom.countdown : prev === 'landing' ? dom.landing : null;
    countdown.active = false;
    switchSection(from, dom.finale, { fast: true });
    if (opts.instant) instantShow(dom.finale);
    // Burst immediately — the countdown section zooms away beneath it
    startBurst();
    audio.startMusic();
    if (!audio.active() && (CONFIG.music || CONFIG.sounds)) dom.soundHint.classList.add('is-visible');
    choreographFinale();
    announce('A card is opening for you.');
    dom.body.classList.remove('bg-settled');
    after(3400, () => dom.body.classList.add('bg-settled')); // lighting crossfade (≤3.2s) complete
  }

  function startBurst() {
    const cx = env.w / 2, cy = env.h / 2;
    const base = env.mobile ? 300 : 620;
    const count = env.reduced ? Math.round(base * 0.3) : base;
    particles.burst(cx, cy, count);
    animateOr(dom.bloom, [
      { opacity: 0, transform: 'scale(0.1)' },
      { opacity: 1, transform: 'scale(0.6)', offset: 0.12 },
      { opacity: 0, transform: 'scale(3.4)' }
    ], { duration: 1400, easing: 'ease-out' }, 'go');
    audio.whoosh();
    bg.warm = 1;
  }

  function instantShow(section) {
    dom.stage.classList.add('no-anim');
    void dom.stage.offsetWidth;
    section.classList.add('is-active');
    after(60, () => dom.stage.classList.remove('no-anim'));
  }

  function restartAnimations(section) {
    const animated = section.querySelectorAll('.word, .accent, .subtitle-wrap, .cta-wrap');
    for (let i = 0; i < animated.length; i++) animated[i].style.animation = 'none';
    void section.offsetWidth;
    for (let i = 0; i < animated.length; i++) animated[i].style.animation = '';
  }

  /* ===================================================================
     5. Background layer — soft motes, bokeh, faint geometry, sparkles
     =================================================================== */
  const bgCtx = dom.bgCanvas.getContext('2d');
  const fxCtx = dom.fxCanvas.getContext('2d');

  const bg = {
    motes: [],
    shapes: [],
    sparkles: [],
    pulse: 0,        // countdown tick pulse (decays)
    warm: 0,         // 0 cool → 1 warm (finale)
    warmNow: 0,
    sparkleRate: 3,  // sparkles spawned per second near the title (landing)
    sparkleAcc: 0,
    sprites: null
  };

  function makeRadialSprite(size, stops) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (let i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function makeStarSprite(size, colour) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const glow = g.createRadialGradient(r, r, 0, r, r, r);
    glow.addColorStop(0, rgba(colour, 0.9));
    glow.addColorStop(0.35, rgba(colour, 0.25));
    glow.addColorStop(1, rgba(colour, 0));
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);
    g.translate(r, r);
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      g.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
      g.lineTo(Math.cos(a + Math.PI / 4) * r * 0.16, Math.sin(a + Math.PI / 4) * r * 0.16);
    }
    g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.fill();
    return c;
  }

  function initBackground() {
    bg.sprites = {
      motes: [
        makeRadialSprite(64, [[0, 'rgba(255,143,200,0.9)'], [0.4, 'rgba(255,143,200,0.25)'], [1, 'rgba(255,143,200,0)']]),
        makeRadialSprite(64, [[0, 'rgba(199,125,255,0.9)'], [0.4, 'rgba(199,125,255,0.25)'], [1, 'rgba(199,125,255,0)']]),
        makeRadialSprite(64, [[0, 'rgba(125,249,255,0.85)'], [0.4, 'rgba(125,249,255,0.2)'], [1, 'rgba(125,249,255,0)']]),
        makeRadialSprite(64, [[0, 'rgba(255,209,102,0.9)'], [0.4, 'rgba(255,209,102,0.25)'], [1, 'rgba(255,209,102,0)']]),
        makeRadialSprite(64, [[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.2)'], [1, 'rgba(255,255,255,0)']])
      ],
      stars: [
        makeStarSprite(40, hexToRgb('#ffd166')),
        makeStarSprite(40, hexToRgb('#ff8fc8')),
        makeStarSprite(40, hexToRgb('#7df9ff'))
      ]
    };
    const n = env.reduced ? 18 : (env.mobile ? 34 : 70);
    bg.motes.length = 0;
    for (let i = 0; i < n; i++) bg.motes.push(newMote(true));
    bg.shapes.length = 0;
    const ns = env.reduced ? 4 : (env.mobile ? 6 : 12);
    for (let i = 0; i < ns; i++) {
      bg.shapes.push({
        x: Math.random(), y: Math.random(), r: rand(18, 70), rot: rand(0, TAU), rotV: rand(-0.15, 0.15),
        vy: rand(-8, -2), kind: Math.random() < 0.5 ? 0 : 1, a: rand(0.04, 0.09)
      });
    }
  }

  function newMote(anywhere) {
    const depth = rand(0.3, 1);
    return {
      x: Math.random() * env.w,
      y: anywhere ? Math.random() * env.h : env.h + 40,
      s: rand(10, 46) * depth,
      vy: -rand(6, 22) * depth,
      swayA: rand(8, 30), swayF: rand(0.2, 0.6), ph: rand(0, TAU),
      a: rand(0.18, 0.55) * depth,
      tw: rand(0.5, 1.6),
      sp: (Math.random() * bg.sprites.motes.length) | 0
    };
  }

  function updateBackground(dt) {
    bg.pulse = Math.max(0, bg.pulse - dt * 1.6);
    bg.warmNow = damp(bg.warmNow, bg.warm, 0.8, dt);
    const speedMul = 1 + bg.pulse * 2.2;
    const list = bg.motes;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      m.y += m.vy * speedMul * dt;
      m.ph += dt * m.swayF;
      if (m.y < -60) list[i] = newMote(false);
    }
    for (let i = 0; i < bg.shapes.length; i++) {
      const s = bg.shapes[i];
      s.rot += s.rotV * dt;
      s.y += (s.vy / env.h) * dt;
      if (s.y < -0.1) { s.y = 1.1; s.x = Math.random(); }
    }
    // sparkles / tiny hearts around the title on the landing
    if (app.phase === 'landing' && !env.reduced) {
      bg.sparkleAcc += dt * bg.sparkleRate;
      while (bg.sparkleAcc >= 1) {
        bg.sparkleAcc -= 1;
        if (bg.sparkles.length < 40) {
          const cx = env.w / 2, cy = env.h * 0.42;
          bg.sparkles.push({
            x: cx + rand(-1, 1) * Math.min(env.w * 0.42, 520),
            y: cy + rand(-1, 1) * Math.min(env.h * 0.22, 190),
            vy: -rand(8, 26), vx: rand(-6, 6),
            life: 0, max: rand(2, 4),
            s: rand(8, 22), rot: rand(0, TAU), rotV: rand(-1, 1),
            heart: Math.random() < 0.3, sp: (Math.random() * 3) | 0
          });
        }
      }
    }
    for (let i = bg.sparkles.length - 1; i >= 0; i--) {
      const s = bg.sparkles[i];
      s.life += dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.rotV * dt;
      if (s.life >= s.max) { bg.sparkles[i] = bg.sparkles[bg.sparkles.length - 1]; bg.sparkles.pop(); }
    }
  }

  function drawBackground() {
    const g = bgCtx, dpr = env.dpr, W = env.w, H = env.h, t = app.time;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const warmMix = bg.warmNow;
    const alphaBoost = 1 + bg.pulse * 0.9;
    // motes
    const sprites = bg.sprites.motes;
    for (let i = 0; i < bg.motes.length; i++) {
      const m = bg.motes[i];
      const tw = 0.6 + 0.4 * Math.sin(t * m.tw + m.ph * 3);
      g.globalAlpha = Math.min(1, m.a * tw * alphaBoost * (1 - warmMix * 0.35));
      const x = m.x + Math.sin(m.ph) * m.swayA;
      const sp = warmMix > 0.5 && (i % 3 === 0) ? sprites[3] : sprites[m.sp];
      g.drawImage(sp, x - m.s / 2, m.y - m.s / 2, m.s, m.s);
    }
    // faint geometry
    g.globalAlpha = 1;
    g.lineWidth = 1;
    for (let i = 0; i < bg.shapes.length; i++) {
      const s = bg.shapes[i];
      const x = s.x * W, y = s.y * H;
      g.strokeStyle = 'rgba(255,255,255,' + (s.a * (1 + bg.pulse)).toFixed(3) + ')';
      g.beginPath();
      if (s.kind === 0) {
        g.arc(x, y, s.r, 0, TAU);
      } else {
        const c = Math.cos(s.rot) * s.r, sn = Math.sin(s.rot) * s.r;
        g.moveTo(x + c, y + sn); g.lineTo(x - sn, y + c); g.lineTo(x - c, y - sn); g.lineTo(x + sn, y - c); g.closePath();
      }
      g.stroke();
    }
    // sparkles near the title
    const stars = bg.sprites.stars;
    const heartSprite = sprites_ ? sprites_.heartsSmall : null;
    for (let i = 0; i < bg.sparkles.length; i++) {
      const s = bg.sparkles[i];
      const k = s.life / s.max;
      const a = k < 0.2 ? k / 0.2 : k > 0.7 ? (1 - k) / 0.3 : 1;
      const sc = s.s * (0.8 + 0.3 * Math.sin(t * 6 + s.rot * 4));
      g.globalAlpha = a * 0.9;
      const cs = Math.cos(s.rot), sn = Math.sin(s.rot);
      if (s.heart && heartSprite) {
        const sp = heartSprite[s.sp % heartSprite.length];
        const k2 = sc / sp.w;
        g.setTransform(dpr * cs * k2, dpr * sn * k2, -dpr * sn * k2, dpr * cs * k2, dpr * s.x, dpr * s.y);
        g.drawImage(sp.canvas, -sp.hw, -sp.hh, sp.w, sp.h);
      } else {
        const sp = stars[s.sp];
        const k2 = sc / 40;
        g.setTransform(dpr * cs * k2, dpr * sn * k2, -dpr * sn * k2, dpr * cs * k2, dpr * s.x, dpr * s.y);
        g.drawImage(sp, -20, -20, 40, 40);
      }
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
  }

  /* ===================================================================
     6. Audio engine — everything synthesized, created only on a gesture
     =================================================================== */
  const audio = (function () {
    let ctx = null, master = null, sfx = null, musicBus = null, noiseBuf = null;
    let muted = false;
    let wantMusic = false;
    let onUnlocked = null;
    const music = { playing: false, voices: [], filter: null, lfo: null, gain: null, chordIdx: 0, nextChord: 0, nextPluck: 0 };

    try { muted = localStorage.getItem('monthsary-muted') === '1'; } catch (e) { muted = false; }

    // Warm progression: Dmaj7 · Bm7 · Gmaj7 · A(add9) — MIDI note numbers
    const CHORDS = [[50, 57, 61, 64], [47, 54, 57, 62], [43, 50, 54, 59], [45, 52, 55, 61]];
    const CHORD_LEN = 7.5;    // seconds each chord sounds
    const CHORD_XFADE = 2.4;  // overlap between consecutive chords (crossfade, no pitch glide)
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

    function create() {
      if (ctx) return true;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        // Only build the context after a genuine user gesture (a scripted click is not one);
        // creating it earlier makes Chrome log an autoplay warning and leaves it suspended anyway.
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(ctx.destination);
        sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
        musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
        // one second of white noise for the whoosh
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        return true;
      } catch (e) {
        ctx = null;
        return false;
      }
    }

    /** Called on user gestures. Safe to call repeatedly. */
    function unlock() {
      songRetry();                   // independent of the Web Audio context
      if (!create()) return;
      try {
        // 'interrupted' (iOS Safari, e.g. after a call) also needs resuming.
        if (ctx.state !== 'running') {
          const p = ctx.resume();
          if (p && p.then) p.then(onReady, function () {});
          else onReady();
        } else onReady();
      } catch (e) { /* ignore */ }
    }
    function onReady() {
      if (!ready()) return;
      if (onUnlocked) onUnlocked();
      if (wantMusic && !music.playing) startMusic();
    }
    /** A gesture arrived: retry a song play that autoplay policy refused. */
    function songRetry() {
      if (wantMusic && song && song.paused) songPlay();
    }
    function ready() { return !!ctx && ctx.state === 'running'; }

    /* ----- sound effects ----- */
    function chime(freq, vol) {
      if (!CONFIG.sounds || !ready()) return;
      try {
        const t = ctx.currentTime;
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator(), g = ctx.createGain();
        o1.type = 'triangle'; o1.frequency.value = freq;
        o2.type = 'sine'; o2.frequency.value = freq * 2.01;
        o3.type = 'sine'; o3.frequency.value = freq * 0.5;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o1.connect(g); o2.connect(g); o3.connect(g); g.connect(sfx);
        o1.start(t); o2.start(t); o3.start(t); o1.stop(t + 0.65); o2.stop(t + 0.65); o3.stop(t + 0.65);
      } catch (e) { /* ignore */ }
    }
    function finalChord() {
      if (!CONFIG.sounds || !ready()) return;
      try {
        const t = ctx.currentTime;
        const notes = [74, 78, 81, 86, 62]; // D5 F#5 A5 D6 + D4
        for (let i = 0; i < notes.length; i++) {
          const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
          o.type = i === 4 ? 'sine' : 'triangle'; o.frequency.value = mtof(notes[i]);
          o2.type = 'sine'; o2.frequency.value = mtof(notes[i]) * 2;
          const st = t + i * 0.05;
          g.gain.setValueAtTime(0.0001, st);
          g.gain.exponentialRampToValueAtTime(i === 4 ? 0.12 : 0.08, st + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, st + 3.2);
          o.connect(g); o2.connect(g); g.connect(sfx);
          o.start(st); o2.start(st); o.stop(st + 3.3); o2.stop(st + 3.3);
        }
      } catch (e) { /* ignore */ }
    }
    function pop() {
      if (!CONFIG.sounds || !ready()) return;
      try {
        const t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(620, t);
        o.frequency.exponentialRampToValueAtTime(180, t + 0.14);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.18);
        // sparkle
        const o3 = ctx.createOscillator(), g3 = ctx.createGain();
        o3.type = 'triangle'; o3.frequency.value = 1568;
        g3.gain.setValueAtTime(0.0001, t + 0.03);
        g3.gain.exponentialRampToValueAtTime(0.05, t + 0.04);
        g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o3.connect(g3); g3.connect(sfx); o3.start(t + 0.03); o3.stop(t + 0.55);
      } catch (e) { /* ignore */ }
    }
    function whoosh() {
      if (!CONFIG.sounds || !ready()) return;
      try {
        const t = ctx.currentTime;
        const src = ctx.createBufferSource(); src.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
        bp.frequency.setValueAtTime(180, t);
        bp.frequency.exponentialRampToValueAtTime(2400, t + 0.5);
        bp.frequency.exponentialRampToValueAtTime(400, t + 1.4);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
        src.connect(bp); bp.connect(g); g.connect(sfx);
        src.start(t); src.stop(t + 1.6);
        // a soft shimmer swell
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1760, t + 0.8);
        og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.05, t + 0.3); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        o.connect(og); og.connect(sfx); o.start(t); o.stop(t + 1.3);
      } catch (e) { /* ignore */ }
    }

    /* ----- ambient music: detuned pad → lowpass with a slow LFO, chords crossfade ----- */
    function voice(type, freq, detune, vol, t, dest) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq; o.detune.value = detune;
      // attack over the crossfade, sustain, then release exactly while the next chord attacks
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + CHORD_XFADE);
      g.gain.setValueAtTime(vol, t + CHORD_LEN - CHORD_XFADE);
      g.gain.exponentialRampToValueAtTime(0.0001, t + CHORD_LEN);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + CHORD_LEN + 0.1);
      music.voices.push({ o: o, end: t + CHORD_LEN + 0.2 });
    }
    /** Spawns a fresh set of voices for the next chord; the previous set fades out on its own envelope. */
    function playChord(t) {
      const chord = CHORDS[music.chordIdx];
      for (let i = 0; i < chord.length; i++) {
        const f = mtof(chord[i]);
        const vol = i === 0 ? 0.11 : 0.075;
        voice('sawtooth', f, -7, vol * 0.75, t, music.filter);
        voice('triangle', f, 6, vol, t, music.filter);
      }
      voice('sine', mtof(chord[0] - 12), 0, 0.09, t, music.gain);   // sub
      music.chordIdx = (music.chordIdx + 1) % CHORDS.length;
      music.nextChord = t + CHORD_LEN - CHORD_XFADE;
      // prune finished voices
      for (let i = music.voices.length - 1; i >= 0; i--) if (music.voices[i].end < t) { music.voices[i] = music.voices[music.voices.length - 1]; music.voices.pop(); }
    }

    /* ----- Song file -----
       Played through a plain <audio> element rather than the Web Audio graph:
       a local file opened from file:// is treated as cross-origin, so routing
       it through createMediaElementSource() would silence it. That means its
       volume is handled here instead of by the master gain. */
    let song = null, songWant = 0;   // songWant: volume we are fading towards

    function songEl() {
      if (song || !CONFIG.musicFile) return song;
      try {
        song = new Audio(CONFIG.musicFile);
        song.loop = true;
        song.preload = 'auto';
        song.volume = 0;
        song.muted = muted;
        song.addEventListener('error', function () { song = null; });   // fall back to the synth pad
        // the song counts as "sound is on", so the tap-for-sound hint can go
        song.addEventListener('playing', function () { if (onUnlocked) onUnlocked(); });
      } catch (e) { song = null; }
      return song;
    }

    /** Try to play the song; browsers only allow this from a user gesture. */
    function songPlay() {
      const s = songEl();
      if (!s) return false;
      songWant = clamp(CONFIG.musicVolume == null ? 0.6 : CONFIG.musicVolume, 0, 1);
      try {
        const p = s.play();
        if (p && p.catch) p.catch(function () { /* no gesture yet — retried on unlock() */ });
      } catch (e) { /* ignore */ }
      return true;
    }

    /** Called every frame: eases the song volume towards its target. */
    function songFade(dt) {
      if (!song) return;
      const rate = 1 / Math.max(0.2, CONFIG.musicFadeIn || 2.5);
      const target = songWant;
      if (song.volume < target) song.volume = Math.min(target, song.volume + rate * dt);
      else if (song.volume > target) {
        song.volume = Math.max(target, song.volume - rate * 1.6 * dt);
        if (song.volume <= 0.0005 && !songWant) { try { song.pause(); } catch (e) { /* ignore */ } }
      }
    }

    function startMusic() {
      if (!CONFIG.music) return;
      wantMusic = true;
      if (songPlay()) return;        // a real song file replaces the synth pad
      if (!ready()) return;          // will start on unlock()
      if (music.playing) return;
      try {
        const t = ctx.currentTime;
        music.gain = ctx.createGain(); music.gain.gain.value = 1; music.gain.connect(musicBus);
        music.filter = ctx.createBiquadFilter(); music.filter.type = 'lowpass';
        music.filter.frequency.value = 560; music.filter.Q.value = 0.6;
        music.filter.connect(music.gain);
        music.lfo = ctx.createOscillator(); music.lfo.type = 'sine'; music.lfo.frequency.value = 0.07;
        const lfoGain = ctx.createGain(); lfoGain.gain.value = 170;
        music.lfo.connect(lfoGain); lfoGain.connect(music.filter.frequency); music.lfo.start(t);
        music.voices.length = 0;
        music.chordIdx = 0;
        music.playing = true;
        playChord(t);
        music.nextPluck = t + 2.5;
        musicBus.gain.cancelScheduledValues(t);
        musicBus.gain.setValueAtTime(0.0001, t);
        musicBus.gain.exponentialRampToValueAtTime(0.5, t + 3.2);   // fades in over ~3s
      } catch (e) { music.playing = false; }
    }

    function stopMusic() {
      wantMusic = false;
      songWant = 0;                  // songFade() pauses it once it reaches 0
      if (!music.playing || !ctx) return;
      try {
        const t = ctx.currentTime;
        musicBus.gain.cancelScheduledValues(t);
        musicBus.gain.setValueAtTime(Math.max(0.0001, musicBus.gain.value), t);
        musicBus.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        const voices = music.voices.slice();
        const lfo = music.lfo, gain = music.gain;
        setTimeout(function () {
          for (let i = 0; i < voices.length; i++) { try { voices[i].o.stop(); } catch (e) { /* already stopped */ } }
          try { if (lfo) lfo.stop(); if (gain) gain.disconnect(); } catch (e) { /* ignore */ }
        }, 2000);
        music.voices.length = 0;
        music.playing = false;
      } catch (e) { music.playing = false; }
    }

    /** Called every frame: fades the song and schedules synth chords/plucks. */
    function tick(dt) {
      songFade(dt || 0);
      if (!music.playing || !ctx) return;
      const t = ctx.currentTime;
      if (t >= music.nextChord - 0.05) playChord(Math.max(t, music.nextChord));
      if (t >= music.nextPluck - 0.15) {
        music.nextPluck = t + pick([0.5, 0.5, 0.75, 1, 1.5]);
        const chord = CHORDS[(music.chordIdx + CHORDS.length - 1) % CHORDS.length];
        if (Math.random() < 0.7) pluck(mtof(pick(chord) + pick([12, 12, 24])), music.nextPluck - 0.4);
      }
    }
    function pluck(freq, when) {
      try {
        const st = Math.max(when, ctx.currentTime + 0.02);
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        o2.type = 'triangle'; o2.frequency.value = freq; o2.detune.value = 4;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.075, st + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 1.6);
        o.connect(g); o2.connect(g); g.connect(musicBus);
        o.start(st); o2.start(st); o.stop(st + 1.7); o2.stop(st + 1.7);
      } catch (e) { /* ignore */ }
    }

    function setMuted(m) {
      muted = m;
      try { localStorage.setItem('monthsary-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
      if (song) song.muted = m;      // the song sits outside the Web Audio graph
      if (master && ctx) {
        try {
          const t = ctx.currentTime;
          master.gain.cancelScheduledValues(t);
          master.gain.setValueAtTime(master.gain.value, t);
          master.gain.linearRampToValueAtTime(m ? 0 : 1, t + 0.25);
        } catch (e) { /* ignore */ }
      }
    }
    function isMuted() { return muted; }
    /** Is anything actually able to make sound right now? */
    function active() { return ready() || !!(song && !song.paused); }
    /** Read-only snapshot, handy for checking the song from the console. */
    function status() {
      return {
        muted: muted, ctx: ctx ? ctx.state : 'none', synthPad: music.playing,
        song: song ? {
          src: (song.currentSrc || song.src || '').split('/').pop(),
          paused: song.paused, elMuted: song.muted, volume: Math.round(song.volume * 100) / 100,
          target: songWant, time: Math.round(song.currentTime * 10) / 10,
          duration: isFinite(song.duration) ? Math.round(song.duration) : null,
          readyState: song.readyState, error: song.error ? song.error.code : null
        } : null
      };
    }

    return { unlock: unlock, ready: ready, active: active, status: status,
             chime: chime, finalChord: finalChord, pop: pop, whoosh: whoosh,
             startMusic: startMusic, stopMusic: stopMusic, tick: tick, setMuted: setMuted, isMuted: isMuted,
             onUnlocked: function (fn) { onUnlocked = fn; } };
  })();

  /* ===================================================================
     7. Sprite factory — every flower is drawn with béziers once, then
        cached (with a baked glow halo) in an offscreen canvas.
     =================================================================== */
  const RES = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)); // sprite resolution multiplier
  let sprites_ = null;

  /**
   * makeSprite(size, glow, draw)
   *   size: logical diameter of the artwork
   *   glow: { c: rgb, a: alpha, r: radius multiplier } baked halo under the art
   *   draw(g, R): draws centred at 0,0 within radius R
   * Returned w/h are CSS px; drawImage() is always given dw/dh so DPR never matters.
   */
  function makeSprite(size, glow, draw) {
    // Pad only as far as the glow halo actually reaches (+3px for the
    // anti-aliased edge), instead of a flat 55% of transparent pixels.
    const pad = Math.ceil(size * 0.5 * (((glow && glow.r) || 1) - 1)) + 3;
    const full = size + pad * 2;
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(full * RES);
    const g = c.getContext('2d');
    g.scale(RES, RES);
    g.translate(full / 2, full / 2);
    if (glow) {
      const r = size * 0.5 * (glow.r || 1.6);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, r);
      grd.addColorStop(0, rgba(glow.c, glow.a));
      grd.addColorStop(0.45, rgba(glow.c, glow.a * 0.35));
      grd.addColorStop(1, rgba(glow.c, 0));
      g.fillStyle = grd;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    }
    draw(g, size * 0.5);
    return { canvas: c, w: full, h: full, hw: full / 2, hh: full / 2 };
  }

  /* --- petal primitives --- */
  function teardropPath(g, L, W) { // base at origin, tip at (0,-L)
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-W * 1.05, -L * 0.15, -W * 0.95, -L * 0.72, 0, -L);
    g.bezierCurveTo(W * 0.95, -L * 0.72, W * 1.05, -L * 0.15, 0, 0);
    g.closePath();
  }
  function notchedPetalPath(g, L, W) { // cherry-blossom petal with a notched tip
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-W * 0.9, -L * 0.2, -W * 1.05, -L * 0.72, -W * 0.42, -L * 0.98);
    g.quadraticCurveTo(-W * 0.14, -L * 0.92, 0, -L * 0.8);
    g.quadraticCurveTo(W * 0.14, -L * 0.92, W * 0.42, -L * 0.98);
    g.bezierCurveTo(W * 1.05, -L * 0.72, W * 0.9, -L * 0.2, 0, 0);
    g.closePath();
  }
  function leafPath(g, L, W) { // pointed ellipse (sunflower ray / orchid sepal)
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-W, -L * 0.3, -W * 0.7, -L * 0.85, 0, -L);
    g.bezierCurveTo(W * 0.7, -L * 0.85, W, -L * 0.3, 0, 0);
    g.closePath();
  }
  function heartPath(g, R) {
    g.beginPath();
    g.moveTo(0, R * 0.95);
    g.bezierCurveTo(-R * 1.15, R * 0.15, -R * 1.05, -R * 0.75, -R * 0.5, -R * 0.75);
    g.bezierCurveTo(-R * 0.2, -R * 0.75, 0, -R * 0.45, 0, -R * 0.3);
    g.bezierCurveTo(0, -R * 0.45, R * 0.2, -R * 0.75, R * 0.5, -R * 0.75);
    g.bezierCurveTo(R * 1.05, -R * 0.75, R * 1.15, R * 0.15, 0, R * 0.95);
    g.closePath();
  }

  /* --- drawers --- */
  function drawRosePetal(g, R, col) {
    g.save();
    g.translate(0, R * 0.9);
    g.rotate(rand(-0.15, 0.15));
    const grad = g.createLinearGradient(0, 0, 0, -R * 1.9);
    grad.addColorStop(0, rgba(shade(col, -0.5), 1));
    grad.addColorStop(0.5, rgba(col, 1));
    grad.addColorStop(1, rgba(shade(col, 0.3), 1));
    teardropPath(g, R * 1.9, R * 0.95);
    g.fillStyle = grad; g.fill();
    // concave shading
    const inner = g.createRadialGradient(-R * 0.25, -R * 0.85, R * 0.05, 0, -R * 0.95, R * 1.1);
    inner.addColorStop(0, 'rgba(255,255,255,0.28)');
    inner.addColorStop(0.55, 'rgba(255,255,255,0)');
    inner.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = inner; g.fill();
    // curled edge highlight
    g.beginPath();
    g.moveTo(-R * 0.6, -R * 0.5);
    g.quadraticCurveTo(-R * 0.35, -R * 1.4, R * 0.02, -R * 1.85);
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = R * 0.09; g.lineCap = 'round'; g.stroke();
    // central vein
    g.beginPath();
    g.moveTo(0, -R * 0.05);
    g.quadraticCurveTo(R * 0.08, -R * 0.9, 0, -R * 1.45);
    g.strokeStyle = rgba(shade(col, -0.4), 0.5); g.lineWidth = R * 0.05; g.stroke();
    g.restore();
  }

  function drawRoseBloom(g, R, col) {
    const layers = [[1, 9, 0], [0.76, 7, 0.4], [0.52, 5, 0.9], [0.3, 3, 1.5]];
    for (let l = 0; l < layers.length; l++) {
      const rr = R * layers[l][0], n = layers[l][1], off = layers[l][2];
      const c = shade(col, -0.05 * l);
      for (let k = 0; k < n; k++) {
        const a = k / n * TAU + off;
        g.save();
        g.rotate(a);
        g.translate(0, rr * 0.55);
        const grad = g.createLinearGradient(0, rr * 0.5, 0, -rr * 0.6);
        grad.addColorStop(0, rgba(shade(c, 0.25), 1));
        grad.addColorStop(0.6, rgba(c, 1));
        grad.addColorStop(1, rgba(shade(c, -0.55), 1));
        teardropPath(g, rr * 1.05, rr * 0.62);
        g.fillStyle = grad; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = rr * 0.05; g.stroke();
        g.restore();
      }
    }
    const core = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.22);
    core.addColorStop(0, rgba(shade(col, -0.75), 1)); core.addColorStop(1, rgba(shade(col, -0.2), 1));
    g.fillStyle = core; g.beginPath(); g.arc(0, 0, R * 0.22, 0, TAU); g.fill();
  }

  function drawBlossom(g, R, col) {
    const centre = hexToRgb('#e0447a');
    for (let i = 0; i < 5; i++) {
      g.save();
      g.rotate(i / 5 * TAU);
      const grad = g.createRadialGradient(0, 0, R * 0.05, 0, -R * 0.4, R * 0.95);
      grad.addColorStop(0, rgba(shade(centre, 0.35), 1));
      grad.addColorStop(0.35, rgba(col, 1));
      grad.addColorStop(1, rgba(shade(col, 0.4), 1));
      notchedPetalPath(g, R, R * 0.48);
      g.fillStyle = grad; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = R * 0.035; g.stroke();
      g.restore();
    }
    // stamens
    g.lineWidth = R * 0.03;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + 0.2, len = R * rand(0.28, 0.42);
      g.strokeStyle = rgba(shade(centre, -0.2), 0.9);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * len, Math.sin(a) * len); g.stroke();
      g.fillStyle = '#ffe08a';
      g.beginPath(); g.arc(Math.cos(a) * len, Math.sin(a) * len, R * 0.045, 0, TAU); g.fill();
    }
    g.fillStyle = rgba(shade(centre, -0.1), 1);
    g.beginPath(); g.arc(0, 0, R * 0.1, 0, TAU); g.fill();
  }

  function drawOrchid(g, R, col) {
    const lipCol = hexToRgb('#ff2d95');
    const spot = shade(hexToRgb('#8e1c6a'), -0.1);
    // sepals: top, lower-left, lower-right (narrow)
    const sepals = [-Math.PI / 2, -Math.PI / 2 + 2.1, -Math.PI / 2 - 2.1];
    for (let i = 0; i < sepals.length; i++) {
      g.save(); g.rotate(sepals[i] + Math.PI / 2);
      const grad = g.createLinearGradient(0, 0, 0, -R);
      grad.addColorStop(0, rgba(shade(col, -0.2), 1)); grad.addColorStop(1, rgba(shade(col, 0.25), 1));
      leafPath(g, R, R * 0.28); g.fillStyle = grad; g.fill();
      g.strokeStyle = rgba(shade(col, -0.35), 0.5); g.lineWidth = R * 0.03; g.stroke();
      g.restore();
    }
    // petals: upper-left / upper-right (wide, rounded)
    const petals = [-Math.PI / 2 - 1.05, -Math.PI / 2 + 1.05];
    for (let i = 0; i < petals.length; i++) {
      g.save(); g.rotate(petals[i] + Math.PI / 2);
      const grad = g.createRadialGradient(0, 0, R * 0.05, 0, -R * 0.45, R * 0.8);
      grad.addColorStop(0, rgba(shade(col, -0.15), 1)); grad.addColorStop(0.6, rgba(col, 1)); grad.addColorStop(1, rgba(shade(col, 0.35), 1));
      teardropPath(g, R * 0.9, R * 0.55); g.fillStyle = grad; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = R * 0.03; g.stroke();
      // spots
      g.fillStyle = rgba(spot, 0.55);
      for (let k = 0; k < 6; k++) {
        g.beginPath(); g.arc(rand(-R * 0.25, R * 0.25), -rand(R * 0.15, R * 0.55), R * rand(0.025, 0.05), 0, TAU); g.fill();
      }
      g.restore();
    }
    // lip (labellum) at the bottom: ruffled rounded shape
    g.save();
    g.translate(0, R * 0.12);
    const lipGrad = g.createRadialGradient(0, R * 0.1, R * 0.05, 0, R * 0.3, R * 0.65);
    lipGrad.addColorStop(0, rgba(shade(lipCol, 0.1), 1)); lipGrad.addColorStop(1, rgba(shade(lipCol, -0.35), 1));
    g.beginPath();
    g.moveTo(0, -R * 0.05);
    g.bezierCurveTo(-R * 0.55, -R * 0.1, -R * 0.62, R * 0.55, -R * 0.2, R * 0.62);
    g.quadraticCurveTo(0, R * 0.5, R * 0.2, R * 0.62);
    g.bezierCurveTo(R * 0.62, R * 0.55, R * 0.55, -R * 0.1, 0, -R * 0.05);
    g.closePath();
    g.fillStyle = lipGrad; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = R * 0.03; g.stroke();
    // throat
    const th = g.createRadialGradient(0, R * 0.08, 0, 0, R * 0.08, R * 0.22);
    th.addColorStop(0, 'rgba(255,224,138,1)'); th.addColorStop(1, 'rgba(255,224,138,0)');
    g.fillStyle = th; g.beginPath(); g.arc(0, R * 0.08, R * 0.22, 0, TAU); g.fill();
    g.fillStyle = rgba(spot, 0.8);
    g.beginPath(); g.arc(-R * 0.09, R * 0.22, R * 0.035, 0, TAU); g.fill();
    g.beginPath(); g.arc(R * 0.09, R * 0.22, R * 0.035, 0, TAU); g.fill();
    g.restore();
    // column
    g.fillStyle = rgba(shade(col, 0.5), 1);
    g.beginPath(); g.arc(0, -R * 0.05, R * 0.09, 0, TAU); g.fill();
  }

  function drawSunflower(g, R, col) {
    const base = hexToRgb('#f08a1d');
    const n = 20;
    for (let layer = 1; layer >= 0; layer--) {
      const rr = layer ? R * 0.92 : R;
      for (let i = 0; i < n; i++) {
        g.save();
        g.rotate(i / n * TAU + (layer ? Math.PI / n : 0));
        const grad = g.createLinearGradient(0, 0, 0, -rr);
        grad.addColorStop(0, rgba(shade(base, layer ? -0.35 : -0.1), 1));
        grad.addColorStop(0.55, rgba(shade(col, layer ? -0.2 : 0), 1));
        grad.addColorStop(1, rgba(shade(col, layer ? 0 : 0.35), 1));
        leafPath(g, rr, rr * 0.14);
        g.fillStyle = grad; g.fill();
        if (!layer) {
          g.beginPath(); g.moveTo(0, -rr * 0.35); g.lineTo(0, -rr * 0.9);
          g.strokeStyle = rgba(shade(base, -0.3), 0.45); g.lineWidth = rr * 0.02; g.stroke();
        }
        g.restore();
      }
    }
    const cr = R * 0.4;
    const core = g.createRadialGradient(0, 0, 0, 0, 0, cr);
    core.addColorStop(0, '#3a1d08'); core.addColorStop(0.8, '#5c2f10'); core.addColorStop(1, '#8a4a16');
    g.fillStyle = core; g.beginPath(); g.arc(0, 0, cr, 0, TAU); g.fill();
    // phyllotaxis seed pattern
    for (let k = 0; k < 90; k++) {
      const r = cr * 0.95 * Math.sqrt(k / 90), a = k * 2.39996;
      g.fillStyle = k % 2 ? 'rgba(255,190,90,0.35)' : 'rgba(30,12,4,0.55)';
      g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, cr * 0.06, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(255,209,102,0.5)'; g.lineWidth = R * 0.03;
    g.beginPath(); g.arc(0, 0, cr, 0, TAU); g.stroke();
  }

  function drawHeart(g, R, col) {
    heartPath(g, R);
    const grad = g.createRadialGradient(-R * 0.35, -R * 0.45, R * 0.05, 0, 0, R * 1.3);
    grad.addColorStop(0, rgba(shade(col, 0.55), 1));
    grad.addColorStop(0.45, rgba(col, 1));
    grad.addColorStop(1, rgba(shade(col, -0.45), 1));
    g.fillStyle = grad; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = R * 0.06; g.stroke();
    // gloss
    g.save();
    g.translate(-R * 0.42, -R * 0.5); g.rotate(-0.6);
    g.beginPath(); g.ellipse(0, 0, R * 0.22, R * 0.12, 0, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
    g.restore();
  }

  function drawConfetti(g, R, col, square) {
    const w = square ? R * 1.1 : R * 0.55, h = square ? R * 1.1 : R * 1.9;
    const grad = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    grad.addColorStop(0, rgba(shade(col, -0.25), 1));
    grad.addColorStop(0.5, rgba(shade(col, 0.55), 1));
    grad.addColorStop(1, rgba(col, 1));
    g.fillStyle = grad;
    g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
    g.strokeRect(-w / 2, -h / 2, w, h);
  }

  function drawLetter(g, R) {
    const w = R * 1.9, h = R * 1.3;
    g.save();
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(-w / 2 + R * 0.08, -h / 2 + R * 0.12, w, h);
    const paper = g.createLinearGradient(0, -h / 2, 0, h / 2);
    paper.addColorStop(0, '#fff8ec'); paper.addColorStop(1, '#f1dfc7');
    g.fillStyle = paper; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(160,110,60,0.5)'; g.lineWidth = R * 0.04; g.strokeRect(-w / 2, -h / 2, w, h);
    // flap
    g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(0, h * 0.12); g.lineTo(w / 2, -h / 2);
    g.strokeStyle = 'rgba(160,110,60,0.6)'; g.lineWidth = R * 0.05; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
    // seal
    g.translate(0, h * 0.02);
    g.scale(0.28, 0.28);
    heartPath(g, R);
    const sg = g.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R * 1.2);
    sg.addColorStop(0, '#ff7d97'); sg.addColorStop(1, '#b3122a');
    g.fillStyle = sg; g.fill();
    g.restore();
  }

  function drawSpark(g, R, col) {
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, R);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, rgba(col, 0.9));
    grad.addColorStop(1, rgba(col, 0));
    g.fillStyle = grad; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  }

  function buildSprites() {
    const P = {
      rose: ['#c1121f', '#e5383b', '#ff2d55', '#b5179e', '#d90452', '#ff2d95'],
      blossom: ['#ffd1e3', '#ffb7d5', '#ffc8dd', '#ffe0ec', '#ffa3c7'],
      orchid: ['#c77dff', '#9d4edd', '#e0aaff', '#f8f0ff', '#ff8fc8'],
      sunflower: ['#ffd166', '#ffca3a', '#f5c26b', '#ffdd7a'],
      heart: ['#ff2d95', '#ff2d55', '#ffd166', '#ff5fa2', '#ff8fc8'],
      confetti: ['#ffd166', '#ff5fa2', '#7df9ff', '#c77dff', '#ffffff', '#ff2d95'],
      spark: { gold: '#ffd166', pink: '#ff5fa2', red: '#ff2d55', cyan: '#7df9ff', violet: '#c77dff', white: '#ffffff' }
    };
    const S = { rose: [], bloom: [], blossom: [], orchid: [], sunflower: [], heart: [], heartsSmall: [], confetti: [], letter: [], spark: {} };
    P.rose.forEach((h) => { const c = hexToRgb(h); S.rose.push(makeSprite(40, { c: c, a: 0.5, r: 1.5 }, (g, R) => drawRosePetal(g, R * 0.6, c))); });
    ['#d90452', '#ff2d55', '#ff5fa2'].forEach((h) => { const c = hexToRgb(h); S.bloom.push(makeSprite(62, { c: c, a: 0.55, r: 1.5 }, (g, R) => drawRoseBloom(g, R * 0.95, c))); });
    P.blossom.forEach((h) => { const c = hexToRgb(h); S.blossom.push(makeSprite(46, { c: hexToRgb('#ff8fc8'), a: 0.5, r: 1.5 }, (g, R) => drawBlossom(g, R * 0.95, c))); });
    P.orchid.forEach((h) => { const c = hexToRgb(h); S.orchid.push(makeSprite(50, { c: hexToRgb('#c77dff'), a: 0.5, r: 1.5 }, (g, R) => drawOrchid(g, R * 0.95, c))); });
    P.sunflower.forEach((h) => { const c = hexToRgb(h); S.sunflower.push(makeSprite(58, { c: c, a: 0.55, r: 1.5 }, (g, R) => drawSunflower(g, R * 0.95, c))); });
    P.heart.forEach((h) => { const c = hexToRgb(h); S.heart.push(makeSprite(34, { c: c, a: 0.6, r: 1.7 }, (g, R) => drawHeart(g, R * 0.8, c))); });
    ['#ff8fc8', '#ff5fa2', '#ffd166'].forEach((h) => { const c = hexToRgb(h); S.heartsSmall.push(makeSprite(20, { c: c, a: 0.7, r: 1.8 }, (g, R) => drawHeart(g, R * 0.7, c))); });
    P.confetti.forEach((h, i) => { const c = hexToRgb(h); S.confetti.push(makeSprite(28, { c: c, a: 0.4, r: 1.3 }, (g, R) => drawConfetti(g, R, c, i % 3 === 2))); });
    for (let i = 0; i < 2; i++) S.letter.push(makeSprite(40, { c: hexToRgb('#ffd166'), a: 0.45, r: 1.5 }, (g, R) => drawLetter(g, R * 0.85)));
    Object.keys(P.spark).forEach((k) => { const c = hexToRgb(P.spark[k]); S.spark[k] = makeSprite(14, null, (g, R) => drawSpark(g, R, c)); });
    return S;
  }

  function ensureSprites() { if (!sprites_) sprites_ = buildSprites(); return sprites_; }

  /* ===================================================================
     8. Particle system — burst, shockwave rings, additive sparks,
        trails, petal rain. One flat array, swap-pop removal, pooling.
     =================================================================== */
  const particles = (function () {
    const G = 420;                 // gravity px/s²
    const list = [];               // sprite particles
    const sparks = [];             // additive glints
    const rings = [];              // shockwave rings
    const pool = [];
    const emitters = [];
    const state = { trail: 0, rain: 0, rainAcc: 0, max: 1000, maxSparks: 400, fade: 1, fading: false, dirty: true };

    // Type definitions: sprite set, physics character, lifetime
    const TYPES = {
      rose:      { set: 'rose',      w: 22, drag: [1.7, 2.5], gm: [0.35, 0.6],  life: [4.5, 8],   sc: [0.7, 1.25], sway: [25, 60], flip: [2.5, 7] },
      bloom:     { set: 'bloom',     w: 2,  drag: [1.2, 1.6], gm: [0.75, 0.95], life: [4, 6.5],   sc: [0.8, 1.15], sway: [10, 25], flip: [1.2, 3] },
      blossom:   { set: 'blossom',   w: 17, drag: [1.8, 2.6], gm: [0.35, 0.55], life: [4.5, 8],   sc: [0.65, 1.15], sway: [25, 55], flip: [2, 6] },
      orchid:    { set: 'orchid',    w: 13, drag: [1.5, 2.2], gm: [0.45, 0.65], life: [4.5, 7.5], sc: [0.7, 1.15], sway: [20, 45], flip: [1.8, 5] },
      sunflower: { set: 'sunflower', w: 9,  drag: [1.2, 1.7], gm: [0.6, 0.8],   life: [4, 6.5],   sc: [0.7, 1.1],  sway: [12, 30], flip: [1.5, 4] },
      heart:     { set: 'heart',     w: 14, drag: [1.3, 1.9], gm: [0.5, 0.75],  life: [4, 7],     sc: [0.7, 1.3],  sway: [15, 40], flip: [1.5, 5] },
      confetti:  { set: 'confetti',  w: 17, drag: [2.4, 3.2], gm: [0.25, 0.45], life: [5, 9],     sc: [0.7, 1.2],  sway: [30, 70], flip: [4, 10] },
      letter:    { set: 'letter',    w: 6,  drag: [1.3, 1.8], gm: [0.7, 0.9],   life: [4, 6],     sc: [0.75, 1.1], sway: [10, 25], flip: [1.5, 4] }
    };
    const TYPE_KEYS = Object.keys(TYPES);
    const TOTAL_W = TYPE_KEYS.reduce((s, k) => s + TYPES[k].w, 0);
    const RAIN_TYPES = ['rose', 'rose', 'blossom', 'blossom', 'orchid', 'heart', 'confetti'];

    function pickType() {
      let r = Math.random() * TOTAL_W;
      for (let i = 0; i < TYPE_KEYS.length; i++) {
        r -= TYPES[TYPE_KEYS[i]].w;
        if (r <= 0) return TYPE_KEYS[i];
      }
      return 'rose';
    }

    function alloc() { return pool.pop() || {}; }

    function spawn(typeKey, x, y, vx, vy, opts) {
      if (list.length >= state.max) {
        // recycle the oldest particle instead of refusing the new one
        pool.push(list[0]);
        list[0] = list[list.length - 1];
        list.pop();
      }
      const T = TYPES[typeKey];
      const S = ensureSprites();
      const p = alloc();
      p.sp = pick(S[T.set]);
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.z = rand(0.6, 1.4);
      p.scale = rand(T.sc[0], T.sc[1]) * (opts && opts.scale ? opts.scale : 1);
      p.drag = rand(T.drag[0], T.drag[1]);
      p.gm = rand(T.gm[0], T.gm[1]);
      p.rot = rand(0, TAU);
      p.rotV = rand(-7, 7);
      p.rotBase = rand(-1.6, 1.6);
      p.flip = rand(0, TAU);
      p.flipV = rand(T.flip[0], T.flip[1]) * (Math.random() < 0.5 ? -1 : 1);
      p.flipBase = rand(0.8, 2.2) * (p.flipV < 0 ? -1 : 1);
      p.swayA = rand(T.sway[0], T.sway[1]);
      p.swayF = rand(1.2, 3.2);
      p.swayP = rand(0, TAU);
      p.life = 0;
      p.max = rand(T.life[0], T.life[1]) * (opts && opts.lifeMul ? opts.lifeMul : 1);
      p.alpha = 0;
      list.push(p);
      state.dirty = true;
      return p;
    }

    function spawnSpark(x, y, vx, vy, colour, life, size) {
      if (sparks.length >= state.maxSparks) return;
      const S = ensureSprites();
      sparks.push({ sp: S.spark[colour] || S.spark.gold, x: x, y: y, vx: vx, vy: vy, life: 0, max: life, s: size });
      state.dirty = true;
    }

    /** The grand burst: three overlapping waves over ~0.8s, spark glints and two shockwave rings */
    function burst(cx, cy, count) {
      const scale = clamp(Math.min(env.w, env.h) / 820, 0.55, 1.15);
      state.fade = 1; state.fading = false;
      emitters.push({ x: cx, y: cy, left: count * 0.58, rate: count * 0.58 / 0.28, min: 420 * scale, max: 1180 * scale, up: 360 * scale, t: 0 });
      emitters.push({ x: cx, y: cy, left: count * 0.28, rate: count * 0.28 / 0.35, min: 240 * scale, max: 760 * scale, up: 240 * scale, t: -0.18 });
      emitters.push({ x: cx, y: cy, left: count * 0.14, rate: count * 0.14 / 0.5, min: 110 * scale, max: 460 * scale, up: 200 * scale, t: -0.45 });
      const ns = env.reduced ? 40 : (env.mobile ? 120 : 220);
      const cols = ['gold', 'pink', 'white', 'cyan', 'violet', 'red'];
      for (let i = 0; i < ns; i++) {
        const a = Math.random() * TAU, sp = rand(300, 1400) * scale;
        spawnSpark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp - 120 * scale, cols[i % cols.length], rand(0.5, 1.4), rand(6, 16));
      }
      rings.length = 0;
      if (!env.reduced) {
        rings.push({ x: cx, y: cy, t: 0, max: 1.1, w: 3, col: 'rgba(255,230,170,1)' });
        rings.push({ x: cx, y: cy, t: -0.18, max: 1.4, w: 1.5, col: 'rgba(255,143,200,1)' });
      }
      state.trail = env.reduced ? 0 : 1;
      state.rain = env.reduced ? 0.5 : (env.mobile ? 1.4 : 2.6);
      state.dirty = true;
    }

    /** A ring of glints — used for each countdown tick */
    function sparkRing(cx, cy, n, colour, minV, maxV) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.1, 0.1), sp = rand(minV, maxV);
        spawnSpark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, colour, rand(0.5, 0.9), rand(5, 12));
      }
    }

    /** Hearts popping out of the button on click */
    function heartPop(cx, cy) {
      // Re-opening while the previous finale is still fading out would draw
      // these hearts at the fade's alpha and cull them early — start clean.
      if (state.fading) clear();
      const n = env.reduced ? 8 : 26;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + rand(-1.4, 1.4), sp = rand(160, 460);
        const p = spawn(Math.random() < 0.75 ? 'heart' : 'confetti', cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, { scale: 0.6, lifeMul: 0.3 });
        if (p) { p.gm = 0.9; p.drag = 1.6; }
      }
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * TAU, sp = rand(120, 520);
        spawnSpark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp - 80, pick(['gold', 'pink', 'white']), rand(0.4, 0.9), rand(4, 10));
      }
    }

    function emitFrom(e, dt) {
      let n = Math.min(e.left, Math.ceil(e.rate * dt));
      e.left -= n;
      while (n-- > 0) {
        const a = Math.random() * TAU;
        const k = Math.pow(Math.random(), 0.6);
        const sp = lerp(e.min, e.max, k);
        const type = pickType();
        const p = spawn(type, e.x + rand(-6, 6), e.y + rand(-6, 6), Math.cos(a) * sp, Math.sin(a) * sp - rand(0.2, 1) * e.up);
        if (p) {
          // nearer particles fly a touch faster; spin scales with launch speed
          p.vx *= lerp(0.85, 1.15, (p.z - 0.6) / 0.8);
          p.vy *= lerp(0.85, 1.15, (p.z - 0.6) / 0.8);
          p.rotV = rand(-12, 12) * k;
        }
      }
    }

    /** Fade everything out over ~2s (used when replaying), then drop it. */
    function fadeOut() { state.fading = true; state.rain = 0; }

    function active() {
      return list.length > 0 || sparks.length > 0 || rings.length > 0 || emitters.length > 0 || state.rain > 0 || state.trail > 0.01;
    }

    function update(dt) {
      if (!active()) return;
      if (state.fading) {
        state.fade -= dt / 2;
        if (state.fade <= 0) { clear(); return; }
      }
      // emitters
      for (let i = emitters.length - 1; i >= 0; i--) {
        const e = emitters[i];
        e.t += dt;
        if (e.t >= 0) emitFrom(e, dt);
        if (e.left <= 0) { emitters[i] = emitters[emitters.length - 1]; emitters.pop(); }
      }
      // petal rain
      if (state.rain > 0 && app.phase === 'finale') {
        state.rainAcc += state.rain * dt;
        while (state.rainAcc >= 1) {
          state.rainAcc -= 1;
          const p = spawn(pick(RAIN_TYPES), rand(-20, env.w + 20), -60, rand(-30, 30), rand(20, 70), { lifeMul: 1.6 });
          if (p) { p.rotV = rand(-2, 2); p.gm *= 0.8; }
        }
      }
      state.trail = Math.max(0, state.trail - dt / 1.9);
      const H = env.h + 120, XMIN = -220, XMAX = env.w + 220;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life += dt;
        if (p.life >= p.max || p.y > H || p.x < XMIN || p.x > XMAX) {
          pool.push(p);
          list[i] = list[list.length - 1];
          list.pop();
          continue;
        }
        const dragK = p.drag * dt;
        p.vx -= p.vx * dragK;
        p.vy -= p.vy * dragK;
        p.vy += G * p.gm * dt;
        p.swayP += p.swayF * dt;
        p.x += (p.vx + Math.sin(p.swayP) * p.swayA) * dt;
        p.y += (p.vy + Math.cos(p.swayP * 0.5) * p.swayA * 0.25) * dt;
        // spin decays from the launch tumble towards a gentle drift
        p.rotV += (p.rotBase - p.rotV) * Math.min(1, dt * 0.9);
        p.flipV += (p.flipBase - p.flipV) * Math.min(1, dt * 0.6);
        p.rot += p.rotV * dt;
        p.flip += p.flipV * dt;
        const k = p.life / p.max;
        const fadeIn = Math.min(1, p.life / 0.12);
        const fadeOutK = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
        p.alpha = fadeIn * fadeOutK * fadeOutK;
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.max) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); continue; }
        s.vx -= s.vx * 2.2 * dt; s.vy -= s.vy * 2.2 * dt; s.vy += 160 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].t += dt;
        if (rings[i].t > rings[i].max) { rings[i] = rings[rings.length - 1]; rings.pop(); }
      }
      state.dirty = true;
    }

    function draw() {
      if (!state.dirty) return;              // canvas is already clean and nothing moved
      const g = fxCtx, dpr = env.dpr, W = env.w, H = env.h;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (state.trail > 0.01) {
        // partial clear leaves fading ghosts behind fast particles (trail effect)
        g.globalCompositeOperation = 'destination-out';
        g.globalAlpha = lerp(1, 0.28, state.trail);
        g.fillStyle = '#000';
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
      } else {
        g.clearRect(0, 0, W, H);
      }
      const fade = state.fade;
      // sprite particles
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (p.alpha <= 0.01) continue;
        const sp = p.sp;
        const s = p.scale * p.z;
        const fx = Math.cos(p.flip);
        const cr = Math.cos(p.rot), sr = Math.sin(p.rot);
        // M = R(rot) · S(fx·s, s): rotation plus a "flip in depth" squash along local x
        g.setTransform(dpr * cr * fx * s, dpr * sr * fx * s, -dpr * sr * s, dpr * cr * s, dpr * p.x, dpr * p.y);
        g.globalAlpha = p.alpha * fade * (fx < 0 ? 0.82 : 1) * (0.7 + 0.3 * Math.min(1, p.z));
        g.drawImage(sp.canvas, -sp.hw, -sp.hh, sp.w, sp.h);
      }
      // additive glints + shockwave rings
      if (sparks.length || rings.length) {
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < sparks.length; i++) {
          const s = sparks[i];
          const k = s.life / s.max;
          const a = k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9;
          const sc = s.s * (1.3 - k * 0.8) / 14;
          g.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * s.x, dpr * s.y);
          g.globalAlpha = a * fade;
          g.drawImage(s.sp.canvas, -s.sp.hw, -s.sp.hh, s.sp.w, s.sp.h);
        }
        if (rings.length) {
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          const R = Math.max(W, H) * 0.75;
          for (let i = 0; i < rings.length; i++) {
            const r = rings[i];
            if (r.t < 0) continue;
            const k = r.t / r.max;
            g.globalAlpha = (1 - k) * 0.8 * fade;
            g.strokeStyle = r.col;
            g.lineWidth = r.w * (1 + k * 4);
            g.beginPath(); g.arc(r.x, r.y, 20 + R * (1 - Math.pow(1 - k, 3)), 0, TAU); g.stroke();
          }
        }
        g.globalCompositeOperation = 'source-over';
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 1;
      // once everything is gone and the trail has faded, one last clear then idle
      state.dirty = list.length > 0 || sparks.length > 0 || rings.length > 0 || state.trail > 0.01;
    }

    function clear() {
      for (let i = 0; i < list.length; i++) pool.push(list[i]);
      list.length = 0; sparks.length = 0; emitters.length = 0; rings.length = 0;
      state.rain = 0; state.trail = 0; state.fade = 1; state.fading = false;
      fxCtx.setTransform(1, 0, 0, 1, 0, 0);
      fxCtx.globalCompositeOperation = 'source-over';
      fxCtx.globalAlpha = 1;
      fxCtx.clearRect(0, 0, dom.fxCanvas.width, dom.fxCanvas.height);
      state.dirty = false;
    }

    return { burst: burst, sparkRing: sparkRing, heartPop: heartPop, update: update, draw: draw, clear: clear, fadeOut: fadeOut,
             state: state, count: () => list.length };
  })();

  /* ===================================================================
     9. Card & notes choreography
     =================================================================== */
  function fillCardContent() {
    const L = CONFIG.letter;
    dom.cardHeading.textContent = fill(L.heading);
    dom.cardBody.textContent = '';
    for (let i = 0; i < L.paragraphs.length; i++) {
      const p = document.createElement('p');
      p.className = 'card-line';
      p.textContent = fill(L.paragraphs[i]);
      dom.cardBody.appendChild(p);
    }
    dom.cardClosing.textContent = fill(L.closing);
    dom.cardSignature.textContent = fill(L.signature);
    const lines = dom.card.querySelectorAll('.card-line');
    for (let i = 0; i < lines.length; i++) lines[i].style.setProperty('--i', i);
    return lines.length;
  }

  /* -------------------------------------------------------------------
     The couple stickers — placed from MEASURED geometry, like the notes.

     Every position below is derived from the card's real box, the mute button,
     the sound hint, the Replay button and the viewport, and each candidate is
     then checked against all of them before it is used. Nothing is placed on a
     percentage and hoped for.

     Four arrangements, chosen by the room the screen actually leaves:

       ring    – the five circles, literally: one standing above the letter and
                 two down each side (1440x900, 1920x1080). Where the band above
                 the card is too shallow for a figure that still reads as a
                 person, the crown steps out and the five spread down the two
                 gutters instead (1280x720, 1366x768, 1024x768).
       row     – no gutters, but tall bands above and below the card: three
                 stand above the letter and two below it (tablet portrait).
       corner  – no gutters and no band above: the two of them stand at the foot
                 of the letter, on the Replay button's own measured baseline,
                 one either side of it (phone portrait).
       keepsake– whoever is left gathers INSIDE the letter, in a framed strip
                 after the sign-off, and scrolls with the words.

     The letter itself always opens exactly as it did before: the card is never
     moved or resized, and the keepsake strip is only ever added when the letter
     ALREADY scrolls, so it can never turn a comfortable card into a scrolling
     one or make the scroll cue appear where it never was.
     ------------------------------------------------------------------- */
  const STK = {
    MIN_H: 96,        // a full-body couple below ~90px is mush
    MIN_TIGHT: 84,    // …the floor at the foot of the letter, where 96 fits nowhere.
                      // Below this the band is so shallow that the notes would have
                      // nowhere left either, and the whole family goes inside instead.
    MAX_H: 208,       // above this they start to compete with the letter
    CARD_GAP: 16,     // clearance kept from the card
    TIGHT_GAP: 10,    // …at the foot of the letter, where every pixel counts
    UI_GAP: 14,       // clearance kept from the mute button / hint / Replay
    EDGE: 10,         // clearance kept from the left/right/bottom viewport edge
    TOP_EDGE: 4,      // …and from the top, which has no controls in the middle
    REPLAY_RISE: 16,  // .replay sits 16px lower while hidden — reserve its final box
    ROT_PAD: 8,       // each figure is tilted ~2°, which grows its box a few px
    NOTE_PAD: 10,     // extra breathing room between a figure and a floating note
    CROWN_RATIO: 0.68,// the figure above the card may read as standing further
                      // back, but never so much smaller that it looks wrong
    BAND_MIN: 150,    // narrower than this and the far field cannot hold a note
    NOTE_ROOM: 96,    // and a pocket between two figures needs this much height
    CARD_SHARE: 0.34  // a figure never grows past this share of the letter's height
  };
  /** Distance from the card's edge to a figure's CENTRE line minus half its
      width: the gap the reader sees stays CARD_GAP once the tilt slack is
      taken off it. */
  const STK_OFF = STK.CARD_GAP + STK.ROT_PAD / 2;
  /** How wide the field beyond a column of figures is left for the notes.
      The planner and the note slots MUST agree on this, or the planner
      approves a height whose band the notes then find too narrow to use. */
  function bandBeyond(gutter, figW) { return gutter - STK_OFF - figW - STK.EDGE - 26; }

  const stickers = {
    items: [], boxes: [], noteSlots: null, band: 0, on: false,
    mode: 'off', sig: '', outside: 0, inside: 0
  };

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  }
  function grow(b, m) { return { l: b.l - m, t: b.t - m, r: b.r + m, b: b.b + m, w: b.w + m * 2, h: b.h + m * 2 }; }
  function hits(a, b) { return !(a.r <= b.l || a.l >= b.r || a.b <= b.t || a.t >= b.b); }
  function boxAt(cx, cy, w, h) { return { l: cx - w / 2, t: cy - h / 2, r: cx + w / 2, b: cy + h / 2, w: w, h: h }; }
  /** A slot's real footprint: the picture plus the slack its hand-placed tilt adds. */
  function slotBox(s) { return boxAt(s.x, s.y, s.w + STK.ROT_PAD, s.h + STK.ROT_PAD); }

  /** Build the figures once, at start-up, so they are decoded long before the
      finale opens. They live on the absolute layer until a plan moves them. */
  function buildStickers() {
    const list = CONFIG.showStickers === false ? [] : (CONFIG.stickers || []);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (!s || !s.file) continue;
      const el = document.createElement('div');
      el.className = 'sticker';
      el.hidden = true;
      el.style.setProperty('--r', (i % 2 ? 1.7 : -1.9).toFixed(1) + 'deg');    // hand-placed tilt
      el.style.setProperty('--rf', (i % 2 ? -1.1 : 1.3).toFixed(1) + 'deg');   // idle sway
      el.style.setProperty('--d', (6.2 + i * 0.65).toFixed(1) + 's');          // idle period
      const inner = document.createElement('span');
      inner.className = 'sticker-float';
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.draggable = false;
      const w = +s.w > 0 ? +s.w : 0, h = +s.h > 0 ? +s.h : 0;
      if (w && h) { img.width = w; img.height = h; }
      // `ar` drives every width in the placement maths: these drawings run from
      // 0.47 to 0.78 wide per unit of height, so one shared box would squash them.
      const item = {
        el: el, img: img, idx: stickers.items.length, ok: true, measured: false,
        ar: w && h ? w / h : 0.72,
        alt: s.alt ? String(s.alt) : 'A drawing of the two of us'
      };
      img.addEventListener('load', function () {
        // The letter grows as a keepsake picture decodes, so the "there is more
        // to read" cue has to be asked again.
        if (app.phase === 'finale') updateScrollCue();
        if (item.measured || !img.naturalWidth || !img.naturalHeight) return;
        item.measured = true;
        const ar = img.naturalWidth / img.naturalHeight;
        if (Math.abs(ar - item.ar) > 0.005) { item.ar = ar; relayoutFinale(); }
      });
      // A missing file simply drops out of the composition instead of leaving a hole.
      img.addEventListener('error', function () { item.ok = false; el.hidden = true; relayoutFinale(); });
      img.src = s.file;
      inner.appendChild(img);
      el.appendChild(inner);
      dom.stickerLayer.appendChild(el);
      stickers.items.push(item);
    }
  }

  /** Is this candidate box clear of the card, the controls and the edges? */
  function fitsBox(b, sp, gap) {
    if (b.l < STK.EDGE || b.t < STK.TOP_EDGE || b.r > sp.vw - STK.EDGE || b.b > sp.vh - STK.EDGE) return false;
    if (hits(b, grow(sp.card, gap == null ? STK.CARD_GAP : gap))) return false;
    for (let i = 0; i < sp.ui.length; i++) if (hits(b, sp.ui[i])) return false;
    return true;
  }

  /** n figures of height h spread down a column, with equal gaps above,
      between and below them. Returns the centre of each and the gap size. */
  function columnYs(n, top, bottom, h) {
    if (n <= 0) return { ys: [], gap: bottom - top };
    const free = (bottom - top) - n * h;
    if (free < 0) return null;
    const g = free / (n + 1);
    const ys = [];
    for (let i = 0; i < n; i++) ys.push(top + g * (i + 1) + h * i + h / 2);
    return { ys: ys, gap: g };
  }

  /** One attempt at the ring: `crown` above the card, nL down the left gutter,
      nR down the right. Steps the height down until every box validates. */
  function buildRing(use, sp, h0, crown, nL, nR, crownRoom) {
    const card = sp.card;
    const colTop = STK.TOP_EDGE, colBot = sp.vh - STK.EDGE;
    for (let h = Math.round(h0); h >= STK.MIN_H; h -= 6) {
      const colL = columnYs(nL, colTop, colBot, h);
      const colR = columnYs(nR, colTop, colBot, h);
      if (!colL || !colR) continue;
      const slots = [];
      let k = 0;
      if (crown) {
        const it = use[0];
        const ch = Math.min(h, crownRoom);
        if (ch < STK.MIN_H) continue;
        slots.push({ it: it, h: ch, w: ch * it.ar, x: card.l + card.w / 2, y: card.t - STK_OFF - ch / 2 });
        k = 1;
      }
      // A half-step of stagger between the two columns, so four figures read as
      // people standing around a letter rather than as symmetrical wallpaper.
      const shift = (nL === nR && nL > 1) ? Math.min(24, colR.gap * 0.4) : 0;
      for (let i = 0; i < nL; i++, k++) {
        const it = use[k], w = h * it.ar;
        slots.push({ it: it, h: h, w: w, x: card.l - STK_OFF - w / 2, y: colL.ys[i] });
      }
      for (let i = 0; i < nR; i++, k++) {
        const it = use[k], w = h * it.ar;
        slots.push({ it: it, h: h, w: w, x: card.r + STK_OFF + w / 2, y: colR.ys[i] + shift });
      }
      let ok = true;
      for (let i = 0; i < slots.length; i++) if (!fitsBox(slotBox(slots[i]), sp)) { ok = false; break; }
      if (!ok) continue;
      return {
        mode: 'ring', slots: slots, h: h, crown: crown,
        colGapL: colL.gap, colGapR: colR.gap, colL: colL, colR: colR, shift: shift
      };
    }
    return null;
  }

  /** The gutters beside the card. Seats as many figures as can stand there at a
      readable height while still leaving the notes a pocket in the same field. */
  function planRing(items, sp) {
    const card = sp.card;
    const gutter = Math.min(card.l, sp.vw - card.r);
    const colW = gutter - STK.EDGE - STK_OFF;                  // room for a picture
    const colH = (sp.vh - STK.EDGE) - STK.TOP_EDGE;
    if (colW < STK.MIN_H * 0.45 || colH < STK.MIN_H) return null;
    // Height the band above the card can give a figure standing there.
    const crownRoom = card.t - STK_OFF - STK.ROT_PAD / 2 - STK.TOP_EDGE;
    // Narrowest first: in a thin gutter the narrow drawings are the ones that
    // can still stand tall, so they are the ones that get a seat.
    const narrow = items.slice().sort(function (a, b) { return a.ar - b.ar; });
    for (let place = items.length; place >= 1; place--) {
      let use = place === items.length ? items.slice() : narrow.slice(0, place);
      use.sort(function (a, b) { return a.idx - b.idx; });   // keep the letter's own order
      let widest = 0;
      for (let i = 0; i < use.length; i++) if (use[i].ar > widest) widest = use[i].ar;
      if (colW < STK.MIN_H * widest) continue;
      const crowns = (place >= 3 && place % 2 === 1 && crownRoom >= STK.MIN_H) ? [1, 0] : [0];
      for (let c = 0; c < crowns.length; c++) {
        const crown = crowns[c];
        const rest = place - crown;
        const nL = Math.ceil(rest / 2), nR = rest - nL;
        const nMax = Math.max(nL, nR, 1);
        if (nMax > 4) continue;
        let hi = Math.min(STK.MAX_H, Math.max(card.h * STK.CARD_SHARE, 150), colW / widest,
                          (colH - (nMax + 1) * 16) / nMax);
        if (crown) hi = Math.min(hi, Math.min(crownRoom, STK.MAX_H) / STK.CROWN_RATIO);
        // The notes were on this page first, so a height is only allowed if it
        // still leaves them somewhere in the same field to live: either an outer
        // band beyond the figures, or a pocket between two of them.
        let h = 0;
        for (let t = Math.floor(hi); t >= STK.MIN_H; t -= 3) {
          const bandW = bandBeyond(gutter, t * widest);
          const pocket = (colH - nMax * t) / (nMax + 1);
          if (bandW >= STK.BAND_MIN || pocket >= STK.NOTE_ROOM) { h = t; break; }
        }
        if (!h) continue;
        const plan = buildRing(use, sp, h, crown, nL, nR, crownRoom);
        if (plan) return plan;
      }
    }
    return null;
  }

  /** A centred row of figures standing on one baseline. */
  function packRow(list, h, cx, top, maxW) {
    const gap = Math.round(h * 0.1);
    const ws = [];
    let total = gap * (list.length - 1);
    for (let i = 0; i < list.length; i++) { const w = h * list[i].ar; ws.push(w); total += w; }
    if (total > maxW) return null;
    const out = [];
    let x = cx - total / 2;
    for (let i = 0; i < list.length; i++) {
      out.push({ it: list[i], h: h, w: ws[i], x: x + ws[i] / 2, y: top + h / 2 });
      x += ws[i] + gap;
    }
    out.span = { l: cx - total / 2, r: cx + total / 2 };
    return out;
  }

  /** No gutters, but tall bands above AND below the card (tablet portrait). */
  function planRow(items, sp) {
    if (items.length < 2) return null;
    const card = sp.card;
    const topRoom = card.t - STK_OFF - STK.ROT_PAD / 2 - STK.TOP_EDGE;
    const floor = Math.min(sp.rep.t - STK.UI_GAP, sp.vh - STK.EDGE);
    const botRoom = floor - (card.b + STK_OFF) - STK.ROT_PAD / 2;
    if (topRoom < STK.MIN_H || botRoom < STK.MIN_H) return null;
    const nTop = Math.min(3, Math.ceil(items.length / 2));
    const upper = items.slice(0, nTop), lower = items.slice(nTop, nTop + 3);
    if (!lower.length) return null;
    const cx = card.l + card.w / 2, maxW = sp.vw - STK.EDGE * 2 - 8;
    const top = Math.min(STK.MAX_H, topRoom, botRoom);
    for (let h = Math.round(top); h >= STK.MIN_H; h -= 5) {
      const a = packRow(upper, h, cx, card.t - STK_OFF - h, maxW);
      const b = packRow(lower, h, cx, card.b + STK_OFF, maxW);
      if (!a || !b) continue;
      const all = a.concat(b);
      let ok = true;
      for (let i = 0; i < all.length; i++) if (!fitsBox(slotBox(all[i]), sp)) { ok = false; break; }
      if (ok) return { mode: 'row', slots: all, h: h, upper: a, lower: b };
    }
    return null;
  }

  /** The foot of the letter: one figure either side of the Replay button,
      standing on the button's own measured baseline — which is where the safe
      area already put it, so this inherits the safe area for free. */
  function planCorner(items, sp) {
    const card = sp.card;
    const rep = sp.rep;
    const floor = Math.min(rep.b, sp.vh - STK.EDGE);
    const ceiling = card.b + STK.TIGHT_GAP + STK.ROT_PAD / 2;
    const band = floor - STK.ROT_PAD / 2 - ceiling;
    if (band < STK.MIN_TIGHT) return null;
    const availL = (rep.l - STK.UI_GAP) - STK.EDGE - STK.ROT_PAD;
    const availR = (sp.vw - STK.EDGE) - (rep.r + STK.UI_GAP) - STK.ROT_PAD;
    const narrow = items.slice().sort(function (a, b) { return a.ar - b.ar; });
    for (let n = Math.min(2, narrow.length); n >= 1; n--) {
      const use = narrow.slice(0, n);
      use.sort(function (a, b) { return a.idx - b.idx; });
      const sides = n === 2 ? [availL, availR] : [Math.max(availL, availR)];
      let h = Math.min(STK.MAX_H, band);
      for (let i = 0; i < n; i++) h = Math.min(h, sides[i] / use[i].ar);
      h = Math.floor(h);
      for (; h >= STK.MIN_TIGHT; h -= 4) {
        const slots = [];
        for (let i = 0; i < n; i++) {
          const w = h * use[i].ar;
          const left = n === 2 ? i === 0 : availL >= availR;
          const x = left ? STK.EDGE + STK.ROT_PAD / 2 + w / 2 : sp.vw - STK.EDGE - STK.ROT_PAD / 2 - w / 2;
          slots.push({ it: use[i], h: h, w: w, x: x, y: floor - STK.ROT_PAD / 2 - h / 2 });
        }
        let ok = true;
        for (let i = 0; i < slots.length; i++) if (!fitsBox(slotBox(slots[i]), sp, STK.TIGHT_GAP)) { ok = false; break; }
        if (ok) return { mode: 'corner', slots: slots, h: h };
      }
    }
    return null;
  }

  /* ---- The keepsake strip inside the letter ----
     Deal the pictures into contiguous rows and take the split whose SHARED row
     height is tallest: the fullest row then spans the column exactly and the
     others centre under it at the same height, so every pair keeps its own
     aspect with no letterbox and no distortion. */
  function bestSplit(ars, k, availW, gap) {
    const n = ars.length;
    if (k > n || k < 1) return null;
    let best = null;
    const rows = [];
    function score() {
      let h = Infinity;
      for (let i = 0; i < rows.length; i++) {
        let s = 0;
        for (let j = 0; j < rows[i].length; j++) s += rows[i][j];
        const rh = (availW - (rows[i].length - 1) * gap) / s;
        if (rh < h) h = rh;
      }
      if (!best || h > best) best = h;
    }
    (function rec(start, left) {
      if (left === 1) { rows.push(ars.slice(start)); score(); rows.pop(); return; }
      for (let end = start + 1; end <= n - (left - 1); end++) {
        rows.push(ars.slice(start, end));
        rec(end, left - 1);
        rows.pop();
      }
    })(0, k);
    return best;
  }

  /** Size and fill the strip. Re-measured up to three times, because giving the
      pictures a height can make the letter overflow, and the scrollbar that
      then appears narrows the very column they have to fit into. */
  function fillKeepsake(list) {
    dom.keepsake.hidden = false;
    dom.keepsakeCap.textContent = fill(CONFIG.stickerCaption || '');
    for (let i = 0; i < list.length; i++) {
      list[i].el.hidden = false;
      list[i].img.alt = list[i].alt;
      if (list[i].el.parentNode !== dom.keepsakeRow) dom.keepsakeRow.appendChild(list[i].el);
    }
    const ars = [];
    for (let i = 0; i < list.length; i++) ars.push(list[i].ar);
    let h = STK.MIN_TIGHT, lastW = -1;
    for (let pass = 0; pass < 3; pass++) {
      const availW = Math.max(120, dom.keepsakeRow.clientWidth || 240);
      const gap = clamp(Math.round(availW * 0.035), 8, 18);
      // keep the strip inside one screenful of the letter, so the last thing
      // the reader scrolls to is never a cropped face
      const capH = Math.max(150, dom.cardScroll.clientHeight * 0.6);
      // Try every row count and keep the one that renders the pictures largest,
      // where each is capped both by the strip's own height budget and by the
      // widest they may stand. A single row wins any near-tie, so the strip
      // stays as compact as it can while still reading well.
      const hs = [];
      let bestH = 0;
      for (let k = 1; k <= ars.length; k++) {
        // -4: a hair of slack, so the row that was computed to fit really does
        // and a rounded-up pixel cannot bounce the last picture onto its own line
        const raw = bestSplit(ars, k, availW - 4, gap);
        if (raw == null) break;
        const hh = Math.min(raw, STK.MAX_H, (capH - (k - 1) * gap) / k);
        hs.push(hh);
        if (hh > bestH) bestH = hh;
      }
      for (let k = 0; k < hs.length; k++) if (hs[k] >= bestH * 0.88) { bestH = hs[k]; break; }
      if (!(bestH > 0)) bestH = Math.max(56, (capH - (ars.length - 1) * gap) / ars.length);
      h = Math.round(bestH);
      dom.keepsakeRow.style.setProperty('--sgap', gap + 'px');
      for (let i = 0; i < list.length; i++) list[i].el.style.setProperty('--h', h + 'px');
      if (availW === lastW) break;
      lastW = availW;
    }
    return h;
  }

  /**
   * Place every figure and publish the boxes they occupy (stickers.boxes), so
   * the floating notes can be measured against them. Returns a signature that
   * changes whenever the arrangement changes, so a resize only rebuilds the
   * notes when it actually has to.
   */
  function layoutStickers() {
    const items = [];
    for (let i = 0; i < stickers.items.length; i++) if (stickers.items[i].ok) items.push(stickers.items[i]);
    stickers.boxes = [];
    stickers.noteSlots = null;
    stickers.band = 0;
    stickers.outside = 0;
    stickers.inside = 0;
    stickers.on = false;
    if (!items.length || app.phase !== 'finale') {
      stickers.mode = 'off';
      stickers.sig = 'off';
      dom.keepsake.hidden = true;
      return stickers.sig;
    }
    // Park everything back on the absolute layer BEFORE measuring: a left-over
    // keepsake strip would change the very letter height we are about to read.
    for (let i = 0; i < items.length; i++) {
      items[i].el.hidden = true;
      items[i].img.alt = '';
      if (items[i].el.parentNode !== dom.stickerLayer) dom.stickerLayer.appendChild(items[i].el);
    }
    dom.keepsake.hidden = true;

    // .card-scene is the card's untransformed layout box. The card itself is
    // mid-unfold (rotateX) while this runs, so its own rect is a squashed lie.
    const card = rectOf(dom.cardScene);
    const rep = rectOf(dom.replayBtn);
    // While hidden the Replay button sits REPLAY_RISE lower than where it lands;
    // reserve the box it will actually occupy, so the arrangement comes out the
    // same whether it is measured before or after the button appears.
    if (!dom.replayBtn.classList.contains('is-visible')) { rep.t -= STK.REPLAY_RISE; rep.b -= STK.REPLAY_RISE; }
    // The "tap anywhere for sound" hint only holds its corner while it is
    // showing; once a tap has unlocked the audio it can never come back during
    // this finale, so that corner is free again.
    const ui = [grow(rectOf(dom.muteBtn), STK.UI_GAP), grow(rep, STK.UI_GAP)];
    if (dom.soundHint.classList.contains('is-visible')) ui.push(grow(rectOf(dom.soundHint), STK.UI_GAP));
    const sp = { vw: env.w, vh: env.h, card: card, rep: rep, ui: ui };
    const letterScrolls = dom.cardScroll.scrollHeight - dom.cardScroll.clientHeight > 4;

    const ring = planRing(items, sp);
    const row = planRow(items, sp);
    let plan = ring;
    // Where both work, take the one that seats more of them; a tie goes to the
    // ring, because that is the shape the drawing asked for.
    if (row && (!ring || row.slots.length > ring.slots.length)) plan = row;
    if (!plan) plan = planCorner(items, sp);

    const slay = rectOf(dom.stickerLayer);
    let sig = (plan ? plan.mode : 'none') + '|' + Math.round(card.t) + '|' + Math.round(card.h) + '|';
    const seated = {};
    if (plan) {
      for (let i = 0; i < plan.slots.length; i++) {
        const s = plan.slots[i], el = s.it.el;
        el.hidden = false;
        el.style.setProperty('--sx', Math.round(s.x - slay.l) + 'px');
        el.style.setProperty('--sy', Math.round(s.y - slay.t) + 'px');
        el.style.setProperty('--h', Math.round(s.h) + 'px');
        seated[s.it.idx] = true;
        // published for the note layout, padded for the idle float
        stickers.boxes.push(grow(slotBox(s), STK.NOTE_PAD));
        sig += Math.round(s.x) + ',' + Math.round(s.y) + ',' + Math.round(s.h) + ';';
      }
      stickers.outside = plan.slots.length;
      stickers.noteSlots = noteCandidates(plan, sp, rectOf(dom.notes));
    }
    // Only once figures really are standing outside does the note layout change
    // at all. With nobody out there the original hand-placed slot tables are
    // used exactly as they always were, so a screen that has no room beside the
    // letter keeps precisely the finale it had before. When the couple ARE out
    // there the notes are fitted instead of dealt, so they also have to be told
    // about the card and the controls — with small pads, because the original
    // slots already clear those boxes and a fat pad would throw away notes that
    // were never in anybody's way.
    if (plan) {
      stickers.on = true;
      stickers.boxes.push(grow(card, 4));
      stickers.boxes.push(grow(rectOf(dom.muteBtn), 4));
      stickers.boxes.push(grow(rep, 4));
      if (dom.soundHint.classList.contains('is-visible')) stickers.boxes.push(rectOf(dom.soundHint));
    } else {
      stickers.boxes = [];
    }
    dom.notes.style.setProperty('--note-band', Math.max(120, stickers.band) + 'px');
    sig += '|b' + Math.round(stickers.band);

    // Whoever is left gathers inside the letter — but only when the letter
    // already scrolls, so this can never make a comfortable card start to.
    const rest = [];
    for (let i = 0; i < items.length; i++) if (!seated[items[i].idx]) rest.push(items[i]);
    if (rest.length && letterScrolls) {
      stickers.inside = rest.length;
      sig += 'in' + rest.length + ':' + Math.round(fillKeepsake(rest));
    }
    stickers.mode = plan ? plan.mode : (stickers.inside ? 'keepsake' : 'none');
    stickers.sig = sig;
    return sig;
  }

  /* ---- Where the notes go once the couple are standing there ----
     A candidate list in the empty pockets the figures leave, written in pixels
     relative to the note layer. Every one of them is still measured against the
     figures, the card, the controls and the other notes before it is used, so a
     candidate is an offer, never a promise. */
  function noteCandidates(plan, sp, lay) {
    const out = [];
    const card = sp.card;
    const px = (v) => Math.round(v) + 'px';
    const add = (x, y, band) => { out.push([px(x - lay.l), px(y - lay.t), band ? 1 : 0]); };
    const colTop = STK.TOP_EDGE, colBot = sp.vh - STK.EDGE;

    if (plan.mode === 'ring') {
      const cxL = (STK.EDGE + card.l) / 2, cxR = (card.r + sp.vw - STK.EDGE) / 2;
      const cx = card.l + card.w / 2;
      const cols = [];
      let figW = 0;
      for (let i = 0; i < plan.slots.length; i++) {
        const s = plan.slots[i];
        if (s.y < card.t && Math.abs(s.x - cx) < 4) continue;      // the crown
        if (s.w > figW) figW = s.w;
        cols.push(s);
      }
      // 1. the pockets between the figures, in the gutter they stand in
      const pockets = [[], []];
      for (let side = 0; side < 2; side++) {
        const mine = [];
        for (let i = 0; i < cols.length; i++) if ((side === 0) === (cols[i].x < cx)) mine.push(cols[i]);
        mine.sort(function (a, b) { return a.y - b.y; });
        let prev = colTop;
        for (let i = 0; i <= mine.length; i++) {
          const next = i < mine.length ? mine[i].y - mine[i].h / 2 - STK.NOTE_PAD : colBot;
          if (next - prev >= 58) pockets[side].push((prev + next) / 2);
          if (i < mine.length) prev = mine[i].y + mine[i].h / 2 + STK.NOTE_PAD;
        }
      }
      const nP = Math.max(pockets[0].length, pockets[1].length);
      for (let i = 0; i < nP; i++) {
        if (i < pockets[0].length) add(cxL, pockets[0][i], false);
        if (i < pockets[1].length) add(cxR, pockets[1][i], false);
      }
      // 2. the far field beyond the figures, where the words wrap into a column.
      //    Measured from each side's OWN free strip and inset, so a wrapped note
      //    at its full width still cannot lean back into a figure.
      let inL = 0, inR = 0;
      for (let i = 0; i < cols.length; i++) {
        const s2 = cols[i];
        if (s2.x < cx) inL = Math.max(inL, card.l - (s2.x - s2.w / 2));
        else inR = Math.max(inR, (s2.x + s2.w / 2) - card.r);
      }
      const bandW = Math.round(Math.min(bandBeyond(card.l, inL - STK_OFF),
                                        bandBeyond(sp.vw - card.r, inR - STK_OFF)));
      // the notes are written a little narrower than their band, so the tilt and
      // the idle drift can never lean one of them back into a figure
      stickers.band = clamp(bandW - 18, 0, 300);
      if (bandW >= STK.BAND_MIN) {
        const bxL = STK.EDGE + 13 + bandW / 2;
        const bxR = sp.vw - STK.EDGE - 13 - bandW / 2;
        const ys = [0.17, 0.41, 0.65, 0.89];
        for (let i = 0; i < ys.length; i++) {
          const y = colTop + (colBot - colTop) * ys[i];
          add(bxR, y, true); add(bxL, y, true);
        }
      }
      // 3. the band above the card, when no one is standing in it
      if (!plan.crown && card.t >= 74) add(cx, card.t / 2, false);
      // 4. and the band below it, either side of the Replay button
      if (Math.min(sp.rep.t, sp.vh) - card.b >= 74) {
        const y = (card.b + Math.min(sp.rep.t, sp.vh)) / 2;
        add(card.l * 0.5, y, false);
        add((card.r + sp.vw) / 2, y, false);
      }
    } else if (plan.mode === 'row') {
      const up = plan.upper, lo = plan.lower;
      const rows = [
        { y: up[0].y, h: up[0].h, l: up.span.l, r: up.span.r },
        { y: lo[0].y, h: lo[0].h, l: lo.span.l, r: lo.span.r }
      ];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.l - STK.EDGE >= 64) add((STK.EDGE + r.l) / 2, r.y, false);
        if (sp.vw - STK.EDGE - r.r >= 64) add((r.r + sp.vw - STK.EDGE) / 2, r.y, false);
      }
      // above the upper row and below the lower one, if either band is deep enough
      const topFree = up[0].y - up[0].h / 2 - STK.NOTE_PAD - colTop;
      if (topFree >= 58) {
        const y = colTop + topFree / 2;
        add(sp.vw * 0.24, y, false); add(sp.vw * 0.7, y, false);
      }
      const lowB = lo[0].y + lo[0].h / 2 + STK.NOTE_PAD;
      const botFree = Math.min(sp.rep.t, colBot) - lowB;
      if (botFree >= 58) {
        const y = lowB + botFree / 2;
        add(sp.vw * 0.16, y, false); add(sp.vw * 0.74, y, false);
      }
    } else if (plan.mode === 'corner') {
      // The couple are at the foot of the letter, so the whole band above it is
      // free — except where the top bar is. Each column asks the mute button and
      // the sound hint how far down THEY reach at that x, then stacks as many
      // rows of notes as the rest of the band will hold.
      const bar = [];
      if (dom.soundHint.classList.contains('is-visible')) bar.push(rectOf(dom.soundHint));
      bar.push(rectOf(dom.muteBtn));
      const halfW = sp.vw * 0.14, rowH = 54, bot = card.t - 6;
      const xs = [0.17, 0.5, 0.83];
      const rows = [];
      for (let i = 0; i < xs.length; i++) {
        const x = sp.vw * xs[i];
        let top = colTop;
        for (let k = 0; k < bar.length; k++) {
          if (x + halfW > bar[k].l && x - halfW < bar[k].r) top = Math.max(top, bar[k].b + 6);
        }
        const n = Math.floor((bot - top) / rowH);
        for (let r = 0; r < n; r++) rows.push([x, top + (bot - top) * (r + 0.5) / n, r]);
      }
      rows.sort(function (a2, b2) { return a2[2] - b2[2]; });   // top row of each column first
      for (let i = 0; i < rows.length; i++) add(rows[i][0], rows[i][1], false);
      // and the sliver between the letter and the Replay button — in the gap the
      // two of them leave between themselves, measured from where they stand
      const top2 = card.b + STK.TIGHT_GAP, bot2 = Math.min(sp.rep.t, colBot);
      if (bot2 - top2 >= 52) {
        let gl = STK.EDGE, gr = sp.vw - STK.EDGE;
        for (let i = 0; i < plan.slots.length; i++) {
          const s2 = plan.slots[i];
          if (s2.x < sp.vw / 2) gl = Math.max(gl, s2.x + s2.w / 2 + STK.NOTE_PAD);
          else gr = Math.min(gr, s2.x - s2.w / 2 - STK.NOTE_PAD);
        }
        if (gr - gl >= 90) add((gl + gr) / 2, (top2 + bot2) / 2, false);
      }
    }

    // Backfill: a coarse grid over the whole frame, offered last. Every one of
    // these is still measured against the card, the figures, the controls and
    // the notes already placed, so this can only ever put a note somewhere that
    // was genuinely empty — it is what keeps the count up when the hand-placed
    // pockets run out.
    const gx = [0.06, 0.26, 0.5, 0.74, 0.94], gy = [0.07, 0.21, 0.35, 0.5, 0.64, 0.78, 0.92];
    const grid = [];
    for (let i = 0; i < gx.length; i++) {
      for (let j = 0; j < gy.length; j++) {
        const x = sp.vw * gx[i], y = sp.vh * gy[j];
        if (x > card.l - 8 && x < card.r + 8 && y > card.t - 8 && y < card.b + 8) continue;
        grid.push([x, y, Math.abs(x - (card.l + card.w / 2)) + Math.abs(y - (card.t + card.h / 2))]);
      }
    }
    grid.sort(function (a, b) { return b[2] - a[2]; });   // outermost first
    for (let i = 0; i < grid.length; i++) add(grid[i][0], grid[i][1], false);
    return out;
  }

  /** Reveal one figure by index (they are never rebuilt, only re-placed). */
  function revealSticker(i) {
    const it = stickers.items[i];
    if (!it || !it.ok || it.el.hidden) return;
    if (it.el.parentNode === dom.keepsakeRow && !dom.keepsake.classList.contains('is-in')) {
      stage(dom.keepsake, 'is-in', env.reduced ? 700 : 1200);
    }
    stage(it.el, 'is-in', env.reduced ? 700 : 1400);
  }

  /* Note slots: percent positions (centre of the note) that stay clear of the card,
     the mute button (top-right) and the replay button (bottom-centre). */
  const SLOTS_WIDE = [[13, 12], [86, 24], [13, 40], [87, 44], [14, 70], [86, 72], [50, 7], [15, 92], [85, 92], [20, 55]];
  // no top-centre slot: that row belongs to the sound hint / mute bar
  const SLOTS_NARROW = [[25, 11], [77, 15], [50, 84], [18, 86], [82, 86]];
  // Short screens (landscape phones): the card fills the height, so notes only
  // fit in the gutters beside it.
  // top row starts below the 48px mute/sound-hint bar
  const SLOTS_SIDE = [[6, 30], [94, 30], [6, 55], [94, 55], [6, 80], [94, 80]];

  /** Pick a slot set from the space actually left around the card, not width alone. */
  function noteLayout() {
    const cardW = Math.min(620, env.w * 0.92);
    const gutter = (env.w - cardW) / 2;
    if (env.h < 560) return gutter < 90 ? 'none' : 'side';
    if (env.mobile) return 'narrow';
    return gutter < 200 ? 'narrow' : 'wide';
  }

  /** Render notes into the given slot list.
      A slot is [x, y] in percent, or ['<n>px', '<n>px', 1] for the measured
      pocket slots the sticker layout hands over. `texts` defaults to the CONFIG
      notes in order (favourites first); `angles` to a fresh random tilt. */
  function renderNotes(slots, layout, texts, angles) {
    dom.notes.textContent = '';
    const list = texts || (CONFIG.floatingNotes || []).slice(0, slots.length);
    const tones = ['', 'pink', 'violet'];
    const els = [];
    for (let i = 0; i < list.length && i < slots.length; i++) {
      const el = document.createElement('span');
      el.className = 'note ' + tones[i % 3] + (layout === 'side' ? ' side' : '') + (slots[i][2] ? ' band' : '');
      const inner = document.createElement('span');
      inner.className = 'note-float';
      inner.textContent = fill(list[i]);
      el.appendChild(inner);
      el.style.setProperty('--x', typeof slots[i][0] === 'number' ? slots[i][0] + '%' : slots[i][0]);
      el.style.setProperty('--y', typeof slots[i][1] === 'number' ? slots[i][1] + '%' : slots[i][1]);
      el.style.setProperty('--r', (angles ? angles[i] : rand(-9, 9)).toFixed(1) + 'deg');
      inner.style.setProperty('--d', rand(5, 8).toFixed(1) + 's');
      dom.notes.appendChild(el);
      els.push(el);
    }
    return els;
  }

  /* ---- Fitting the notes around the figures ----
     Once the couple are standing there the free space is a set of pockets, so
     the notes are no longer "one slot per note". Each note is measured ONCE —
     unrotated, in the variant it will be drawn in — and everything after that
     is arithmetic, so there is no measure/reflow loop. Two passes: favourites
     first get the best pocket they fit, then any pocket still empty is offered
     to whatever is left, which is how the short notes end up in the tight
     corners instead of leaving them bare. */

  /** Hand-picked tilts for the fitted notes — scattered, but never random. */
  const NOTE_TILT = [-5.5, 4.5, -3.5, 6, -6, 3, -4.5, 5.5, -2.5, 4, -5, 3.5];

  function anchorAt(v, total) {
    if (typeof v === 'number') return total * v / 100;
    const n = parseFloat(v);
    return String(v).indexOf('%') >= 0 ? total * n / 100 : n;
  }

  /** Measure the notes as they will be drawn, with no tilt and no entrance. */
  function measureNotes(texts, layout, band) {
    const slots = [], zero = [];
    for (let i = 0; i < texts.length; i++) { slots.push(band ? ['50%', '50%', 1] : [50, 50]); zero.push(0); }
    const els = renderNotes(slots, layout, texts, zero);
    dom.notes.classList.add('is-measuring');
    const out = [];
    for (let i = 0; i < els.length; i++) {
      const r = rectOf(els[i]);
      // a nowrap note's ink can run well past the right edge of its own box
      out.push({ w: r.w, h: r.h, ink: Math.max(r.w, els[i].scrollWidth) });
    }
    dom.notes.classList.remove('is-measuring');
    return out;
  }

  /** Where a note would really land: CSS clamps, ink overflow, tilt, idle float. */
  function noteBox(slot, size, angle, lay) {
    const left = lay.l + clamp(anchorAt(slot[0], lay.w), 8, lay.w - 8);
    const top = lay.t + clamp(anchorAt(slot[1], lay.h), 28, lay.h - 28);
    const w = Math.max(size.w, size.ink), h = size.h;
    const sin = Math.abs(Math.sin(angle * Math.PI / 180));
    const dx = h * sin + 4, dy = w * sin + 4;      // the slack the tilt adds
    return {
      l: left - size.w / 2 - dx - 4,               // 4 / 6 / 12: the idle float's travel
      t: top - h / 2 - dy - 12,
      r: left - size.w / 2 + w + dx + 6,
      b: top + h / 2 + dy + 4
    };
  }

  function noteFits(b, forb, placed, lay) {
    if (b.l < lay.l + 4 || b.t < lay.t + 4 || b.r > lay.r - 4 || b.b > lay.b - 4) return false;
    for (let i = 0; i < forb.length; i++) if (hits(b, forb[i])) return false;
    for (let i = 0; i < placed.length; i++) if (hits(b, placed[i].box)) return false;
    return true;
  }

  /** Fill the pockets the figures leave, favourites first. */
  function placeNotesMeasured(slots, layout) {
    const texts = (CONFIG.floatingNotes || []).slice(0, 12);
    if (!texts.length || !slots.length) { dom.notes.textContent = ''; return []; }
    // A fixed, gentler tilt than the hand-placed slots use. Gentler because every
    // degree of it grows the box that has to be squeezed past a figure, and on a
    // phone that is the difference between a note finding a home and staying at
    // home. Fixed because the tilt then decides nothing: the same screen gets the
    // same arrangement every single time it is opened, instead of a lottery over
    // which of the last two notes fits.
    const angles = [];
    for (let i = 0; i < texts.length; i++) angles.push(NOTE_TILT[i % NOTE_TILT.length]);
    const size = [measureNotes(texts, layout, false), measureNotes(texts, layout, true)];
    const lay = rectOf(dom.notes);
    /** Fill the pockets, then keep whichever of the two orders seats more of the
        notes. Greedy is order-dependent — a favourite claiming a tight pocket
        early can cost two later notes their homes — and since everything here is
        arithmetic on one set of measurements, running it both ways is free.
          'notes' : every note in turn takes the best pocket it fits (favourites
                    get first refusal, which is the order CONFIG promises);
          'slots' : every pocket in turn takes the first note that fits it.
        Ties go to 'notes', so the favourites keep their advantage. */
    function fill(byNote, straighten) {
      const usedNote = [], usedSlot = [], placed = [];
      // Try a note in a slot, standing it a little straighter if its full tilt is
      // what puts it over the edge: a tilted note claims a noticeably taller box
      // than the same words set level, and in a narrow pocket that is exactly the
      // difference between a note being shown and being dropped.
      const tryPut = (n, s) => {
        const sz = size[slots[s][2] ? 1 : 0][n];
        for (let k = 0; k <= (straighten ? 2 : 0); k++) {
          const a2 = angles[n] * (1 - k * 0.5);
          const b2 = noteBox(slots[s], sz, a2, lay);
          if (noteFits(b2, stickers.boxes, placed, lay)) return { box: b2, a: a2 };
        }
        return null;
      };
      const put = (n, s, r) => { usedSlot[s] = 1; usedNote[n] = 1; placed.push({ s: s, n: n, box: r.box, a: r.a }); };
      if (byNote) {
        for (let n = 0; n < texts.length; n++) {
          for (let s = 0; s < slots.length; s++) {
            if (usedSlot[s]) continue;
            const r = tryPut(n, s);
            if (r) { put(n, s, r); break; }
          }
        }
      }
      // …and then (or only) each pocket still empty takes whoever is still at home
      for (let s = 0; s < slots.length; s++) {
        if (usedSlot[s]) continue;
        for (let n = 0; n < texts.length; n++) {
          if (usedNote[n]) continue;
          const r = tryPut(n, s);
          if (r) { put(n, s, r); break; }
        }
      }
      return placed;
    }
    // Four cheap deterministic attempts, keep the fullest. Straightening a note
    // lets it into a pocket it would otherwise miss, but a note that squeezes in
    // early can block two later ones, so which of the four wins genuinely varies
    // by screen — and running all of them is only arithmetic on one measurement.
    let placed = fill(true, false);
    const tries = [fill(false, false), fill(true, true), fill(false, true)];
    for (let i = 0; i < tries.length; i++) if (tries[i].length > placed.length) placed = tries[i];
    placed.sort(function (a, b) { return a.n - b.n; });
    const fs = [], ft = [], fa = [];
    for (let i = 0; i < placed.length; i++) {
      fs.push(slots[placed[i].s]); ft.push(texts[placed[i].n]); fa.push(placed[i].a);
    }
    return renderNotes(fs, layout, ft, fa);
  }

  function buildNotes() {
    const layout = noteLayout();
    let slots = layout === 'none' ? [] : layout === 'side' ? SLOTS_SIDE : layout === 'narrow' ? SLOTS_NARROW : SLOTS_WIDE;
    if (layout === 'wide') {
      // The one centred slot sits above the card, so it only works when the
      // band between the top bar and the card is genuinely tall enough
      // (it is not on a 720px-high laptop).
      const cardH = dom.card.offsetHeight || env.h * 0.7;
      const cardTop = (env.h - cardH) / 2;
      if (env.h * 0.07 + 34 >= cardTop) slots = slots.filter((s) => s[0] !== 50);
    }
    // With no figures on the page the original slot-per-note layout stands
    // exactly as it always was; with them, the measured pockets come first and
    // the original slots stay on as backfill for whatever they still allow.
    if (!stickers.on) {
      dom.notes.textContent = '';
      const plain = renderNotes(slots, layout);
      dom.notes.dataset.layout = layout;
      return plain;
    }
    const els = placeNotesMeasured((stickers.noteSlots || []).concat(slots), layout);
    dom.notes.dataset.layout = layout;
    return els;
  }

  /** Re-place the figures and re-slot the notes after a resize or a rotation,
      keeping whatever was already shown visible. */
  function relayoutFinale() {
    if (app.phase !== 'finale') return;
    const prevSig = stickers.sig;
    layoutStickers();
    if (dom.notes.dataset.layout === noteLayout() && stickers.sig === prevSig) return;
    const shown = [];
    const old = dom.notes.querySelectorAll('.note');
    for (let i = 0; i < old.length; i++) shown.push(old[i].classList.contains('is-in'));
    const els = buildNotes();
    for (let i = 0; i < els.length; i++) if (shown[i] || (shown.length && i >= shown.length && shown[shown.length - 1])) els[i].classList.add('is-in', 'settled');
  }

  /** Show a "there is more below" cue when the letter overflows the card (phones, short screens). */
  function updateScrollCue() {
    const sc = dom.cardScroll;
    const more = sc.scrollHeight - sc.clientHeight > 4 && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 6;
    dom.card.classList.toggle('can-scroll', more);
  }

  function choreographFinale() {
    const lineCount = fillCardContent();
    // The figures go first: they are placed from the card's measured box, and
    // the note slots are then fitted into the room they leave.
    layoutStickers();
    buildNotes();
    // Reveal notes by index at fire time: a resize/rotation rebuilds the note
    // elements, so a captured reference would be detached and never show.
    const noteCount = (CONFIG.floatingNotes || []).length;
    const stickerCount = stickers.items.length;
    const revealNote = (i) => { const n = dom.notes.children[i]; if (n) stage(n, 'is-in', env.reduced ? 700 : 1450); };
    const env_ = dom.envelope, card = dom.card;
    env_.className = 'envelope';
    card.classList.remove('is-open', 'is-revealed', 'settled', 'lines-settled');
    dom.cardScroll.scrollTop = 0;
    dom.replayBtn.classList.remove('is-visible', 'settled');
    const linesMs = lineCount * 220 + 800;   // matches .card-line transition-delay steps + duration

    if (env.reduced) {
      after(900, () => stage(card, 'is-open', 1000));
      after(1200, () => { card.classList.add('is-revealed'); settle(card, lineCount * 80 + 600, 'lines-settled'); });
      after(2400, () => stage(dom.replayBtn, 'is-visible', 1000));
      after(1250, relayoutFinale);   // one last look at the settled letter before they walk in
      for (let i = 0; i < noteCount; i++) after(1600 + i * 250, () => revealNote(i));
      for (let i = 0; i < stickerCount; i++) after(1500 + i * 160, () => revealSticker(i));
      after(1200 + lineCount * 80 + 600, updateScrollCue);
      return;
    }
    // Envelope: appear → flap opens → letter rises → envelope falls away while the card unfolds.
    // The first lines of the letter appear while the card is still settling, so it is never an empty panel.
    after(700, () => stage(env_, 's0', 650));
    after(1250, () => stage(env_, 's1', 1050));
    after(1900, () => stage(env_, 's2', 1150));
    after(2500, () => { stage(env_, 's3', 850); stage(card, 'is-open', 1750); audio.pop(); });
    after(2600, () => { card.classList.add('is-revealed'); settle(card, linesMs, 'lines-settled'); });
    after(2600 + linesMs, updateScrollCue);
    after(3400, () => env_.classList.add('done'));
    after(2600 + linesMs - 200, () => stage(dom.replayBtn, 'is-visible', 1000));
    for (let i = 0; i < noteCount; i++) after(2600 + i * 330, () => revealNote(i));
    // One last measurement once the card has finished unfolding, then the two
    // of them arrive — last, in front of an open letter.
    after(2900, relayoutFinale);
    for (let i = 0; i < stickerCount; i++) after(3050 + i * 240, () => revealSticker(i));
  }

  function resetFinaleDom() {
    dom.envelope.className = 'envelope';
    dom.card.classList.remove('is-open', 'is-revealed', 'settled', 'lines-settled', 'can-scroll');
    dom.replayBtn.classList.remove('is-visible', 'settled');
    dom.soundHint.classList.remove('is-visible');
    dom.bloom.classList.remove('go');
    const notes = dom.notes.querySelectorAll('.note');
    for (let i = 0; i < notes.length; i++) notes[i].classList.remove('is-in', 'settled');
    for (let i = 0; i < stickers.items.length; i++) stickers.items[i].el.classList.remove('is-in', 'settled');
    dom.keepsake.classList.remove('is-in', 'settled');
  }

  function replay() {
    if (app.phase !== 'finale') return;
    audio.pop();
    // With a song file the music keeps playing across Replay (restarting a
    // real track mid-song feels wrong); only the synth pad is stopped.
    if (!CONFIG.musicFile) audio.stopMusic();
    particles.fadeOut();
    dom.replayBtn.classList.remove('is-visible');
    dom.soundHint.classList.remove('is-visible');
    goTo('landing');
  }

  /* ===================================================================
     10. Event wiring — tilt, buttons, keyboard, resize, visibility
     =================================================================== */
  /** Pointer tilt (mouse / pen), smoothed with damp(); a gentle idle drift when
      the pointer is quiet or on touch devices. Per-event pointerType means a
      touch-screen laptop still tilts with its mouse. */
  const tilt = { tx: 0, ty: 0, rx: 0, ry: 0, pointer: false, lastMove: -10, applied: '' };

  function onPointerMove(e) {
    if (e.pointerType === 'touch' || env.reduced || app.phase !== 'landing') return;
    const nx = (e.clientX / env.w) * 2 - 1, ny = (e.clientY / env.h) * 2 - 1;
    tilt.tx = -ny * 7;
    tilt.ty = nx * 9;
    tilt.pointer = true;
    tilt.lastMove = app.time;
  }
  function onPointerLeave() { tilt.tx = 0; tilt.ty = 0; tilt.pointer = false; }

  function updateTilt(dt) {
    if (env.reduced) return;
    const leaving = dom.landing.classList.contains('is-leaving');
    let tx = tilt.tx, ty = tilt.ty;
    if (app.phase !== 'landing') { tx = 0; ty = 0; }
    else if (!(tilt.pointer && app.time - tilt.lastMove < 2.5)) {
      tx = Math.sin(app.time * 0.55) * 3.2;   // idle auto-tilt
      ty = Math.cos(app.time * 0.42) * 4.5;
    }
    if (app.phase !== 'landing' && !leaving && Math.abs(tilt.rx) < 0.01 && Math.abs(tilt.ry) < 0.01) return;
    tilt.rx = damp(tilt.rx, tx, 5, dt);
    tilt.ry = damp(tilt.ry, ty, 5, dt);
  }
  function applyTilt() {
    if (env.reduced) return;
    let v;
    if (Math.abs(tilt.rx) < 0.01 && Math.abs(tilt.ry) < 0.01) v = '';
    else v = 'rotateX(' + tilt.rx.toFixed(2) + 'deg) rotateY(' + tilt.ry.toFixed(2) + 'deg)';
    if (v !== tilt.applied) { tilt.applied = v; dom.tilt.style.transform = v; }
  }
  tilt.reset = function () { tilt.tx = 0; tilt.ty = 0; tilt.pointer = false; };

  function onOpenClick(e) {
    if (app.phase !== 'landing' || dom.openBtn.classList.contains('is-pressed')) return;
    ensureSprites();
    audio.unlock();
    audio.pop();
    // the song starts here, on the click itself, and carries through the
    // countdown into the finale
    audio.startMusic();
    const rect = dom.openBtn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    // ripple from the pointer position (centre for keyboard activation)
    const face = dom.openBtn.querySelector('.btn-face');
    const rip = document.createElement('span');
    rip.className = 'ripple';
    const fromPointer = e && e.clientX && e.clientY;
    rip.style.left = (fromPointer ? e.clientX - rect.left : rect.width / 2) + 'px';
    rip.style.top = (fromPointer ? e.clientY - rect.top : rect.height / 2) + 'px';
    face.appendChild(rip);
    setTimeout(() => { if (rip.parentNode) rip.parentNode.removeChild(rip); }, 900);
    particles.heartPop(cx, cy);
    dom.openBtn.classList.add('is-pressed');
    bg.pulse = 1;
    after(420, () => goTo('countdown'));
  }

  function setMuteUI() {
    const m = audio.isMuted();
    dom.muteBtn.classList.toggle('is-muted', m);
    dom.muteBtn.setAttribute('aria-pressed', m ? 'true' : 'false');
    dom.muteBtn.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
    dom.muteIcon.textContent = m ? '🔇' : '🔊';
  }
  function toggleMute() {
    audio.unlock();
    audio.setMuted(!audio.isMuted());
    setMuteUI();
    announce(audio.isMuted() ? 'Sound off.' : 'Sound on.');
    if (!audio.isMuted()) audio.pop();
  }

  let resizeTimer = 0;
  function resizeCanvases() {
    env.w = window.innerWidth; env.h = window.innerHeight;
    env.mobile = Math.min(env.w, env.h) < 720;
    env.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(env.w * env.dpr)), h = Math.max(1, Math.round(env.h * env.dpr));
    if (dom.bgCanvas.width !== w || dom.bgCanvas.height !== h) { dom.bgCanvas.width = w; dom.bgCanvas.height = h; }
    if (dom.fxCanvas.width !== w || dom.fxCanvas.height !== h) { dom.fxCanvas.width = w; dom.fxCanvas.height = h; particles.state.dirty = true; }
    // keep motes on screen without re-randomising them
    for (let i = 0; i < bg.motes.length; i++) { bg.motes[i].x = clamp(bg.motes[i].x, 0, env.w); }
  }
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resizeCanvases(); relayoutFinale(); if (app.phase === 'finale') updateScrollCue(); }, 150);
  }

  function onVisibility() {
    if (document.hidden) { stopLoop(); return; }
    // The loop may never have been stopped (page was loaded in a hidden tab),
    // so always re-base the clock or the first visible frame swallows the
    // whole hidden duration in one step.
    lastT = lastStep = performance.now();
    startLoop();
  }

  function firstGesture() { audio.unlock(); }

  function onKeyDown(e) {
    const tag = e.target && e.target.tagName;
    if (tag && /^(input|textarea|select)$/i.test(tag)) return;
    if (e.key === 'm' || e.key === 'M') { toggleMute(); return; }
    // Enter / Space anywhere on the landing opens the gift (buttons handle their own keys)
    if ((e.key === 'Enter' || e.key === ' ') && app.phase === 'landing' && (tag !== 'BUTTON')) {
      e.preventDefault();
      onOpenClick(null);
    }
  }

  function wireEvents() {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('mouseleave', onPointerLeave);
    dom.openBtn.addEventListener('click', onOpenClick);
    // Hold the icon wiggle / shimmer until the current cycle finishes, so
    // moving the pointer away eases out instead of snapping to rest.
    const btnIcon = dom.openBtn.querySelector('.btn-icon');
    const heat = () => dom.openBtn.classList.add('is-hot');
    const cool = () => {
      if (!btnIcon) { dom.openBtn.classList.remove('is-hot'); return; }
      btnIcon.addEventListener('animationiteration', () => dom.openBtn.classList.remove('is-hot'), { once: true });
    };
    dom.openBtn.addEventListener('pointerenter', heat);
    dom.openBtn.addEventListener('focus', heat);
    dom.openBtn.addEventListener('pointerleave', cool);
    dom.openBtn.addEventListener('blur', cool);
    dom.replayBtn.addEventListener('click', replay);
    dom.muteBtn.addEventListener('click', toggleMute);
    dom.cardScroll.addEventListener('scroll', updateScrollCue, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointerdown', firstGesture, { passive: true });
    window.addEventListener('touchstart', firstGesture, { passive: true });
    // On touch, user activation is only granted at pointerup/touchend, so a
    // down-only listener would need a second tap before audio can start.
    window.addEventListener('pointerup', firstGesture, { passive: true });
    window.addEventListener('touchend', firstGesture, { passive: true });
    window.addEventListener('keydown', firstGesture);
    window.addEventListener('keydown', onKeyDown);
    audio.onUnlocked(() => dom.soundHint.classList.remove('is-visible'));
    // The letter's height depends on the webfonts, and the figures are placed
    // from the letter's box: when a font lands late (or never, offline) the
    // arrangement is simply measured again. A no-op outside the finale.
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(relayoutFinale, function () {});
    }
    if (reducedMQ && typeof reducedMQ.addEventListener === 'function') {
      reducedMQ.addEventListener('change', (e) => {
        env.reduced = e.matches || query.get('reduced') === '1';
        document.documentElement.classList.toggle('reduced', env.reduced);
      });
    }
  }

  /* ===================================================================
     11. Main loop — one rAF, dt-based physics in sub-steps of ≤ 50 ms,
     paused when hidden. A cheap stall watchdog (one interval) keeps
     simulation time honest if rAF stops being delivered while the page
     is visible (throttled or headless environments).
     =================================================================== */
  let rafId = 0, lastT = 0, lastStep = 0, stallTimer = 0;
  const STEP = 0.05, MAX_SUBSTEPS = 4;   // never simulate more than 200 ms per frame

  function step(now) {
    let dt = (now - lastT) / 1000;
    lastT = now;
    lastStep = now;
    if (!(dt > 0)) dt = 0;
    const elapsed = Math.min(dt, 1);               // wall-clock step for the countdown
    let n = Math.ceil(dt / STEP);
    if (n < 1) n = 1;
    if (n > MAX_SUBSTEPS) n = MAX_SUBSTEPS;
    const h = Math.min(STEP, dt / n);
    for (let i = 0; i < n; i++) {
      app.time += h;
      updateBackground(h);
      particles.update(h);
      updateTweens(h);
      updateTilt(h);
    }
    updateCountdown(elapsed);
    drawBackground();
    particles.draw();
    applyTilt();
    audio.tick(elapsed);
  }
  function frame() {
    rafId = requestAnimationFrame(frame);
    // performance.now() rather than the rAF timestamp so the watchdog and the
    // frame loop always read the same clock
    step(performance.now());
  }
  function onStall() {
    if (!app.running || document.hidden) return;
    const now = performance.now();
    if (now - lastStep > 100) step(now);
  }
  function startLoop() {
    if (app.running) return;
    app.running = true;
    lastT = lastStep = performance.now();
    rafId = requestAnimationFrame(frame);
    stallTimer = setInterval(onStall, 120);
  }
  function stopLoop() {
    if (!app.running) return;
    app.running = false;
    cancelAnimationFrame(rafId);
    clearInterval(stallTimer);
  }

  /* ---------- Init ---------- */
  function renderStaticText() {
    // Title words (staggered entrance) + glow copy
    dom.titleText.textContent = '';
    dom.titleGlow.textContent = '';
    const words = fill(CONFIG.title).split(' ');
    for (let i = 0; i < words.length; i++) {
      const w = document.createElement('span');
      w.className = 'word';
      w.style.setProperty('--i', i);
      w.textContent = words[i];
      dom.titleText.appendChild(w);
      if (i < words.length - 1) dom.titleText.appendChild(document.createTextNode(' '));
      const g = w.cloneNode(true);
      dom.titleGlow.appendChild(g);
      if (i < words.length - 1) dom.titleGlow.appendChild(document.createTextNode(' '));
    }
    dom.accentText.textContent = fill(CONFIG.partnerName);
    dom.subtitle.textContent = fill(CONFIG.subtitle);
    dom.btnLabel.textContent = fill(CONFIG.buttonText);
    dom.ctaHint.textContent = fill(CONFIG.buttonHint);
    dom.countCaption.textContent = fill(CONFIG.countdownCaption);
    document.title = fill(CONFIG.title) + ' — ' + fill(CONFIG.partnerName);
  }

  function init() {
    renderStaticText();
    resizeCanvases();
    initBackground();
    buildStickers();   // built (and decoded) now, placed when the finale opens
    setMuteUI();
    wireEvents();
    startLoop();

    const phase = query.get('phase');
    if (phase === 'countdown' || phase === 'finale') {
      dom.landing.classList.remove('is-active');
      goTo(phase, { instant: true });
    } else {
      goTo('landing', { instant: true });
      // Pre-build the flower sprites while the landing plays so the burst is instant later
      after(900, ensureSprites);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { goTo: goTo, replay: replay, get phase() { return app.phase; },
           particles: () => particles.count(), audio: () => audio.status(),
           stickers: () => ({ mode: stickers.mode, outside: stickers.outside, inside: stickers.inside,
                              band: Math.round(stickers.band), slots: stickers.noteSlots ? stickers.noteSlots.length : 0 }) };
})();
