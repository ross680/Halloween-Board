(() => {
  // Shop-TV board. One video element is reused for every clip. Cards are HTML.
  // The media list comes from clips.json (regenerated in CI). slides.js is the
  // same list, used when that file can't be fetched. There is no GitHub API call.
  const params = new URLSearchParams(location.search);
  const num = (key, fallback, min, max) => {
    if (!params.has(key)) return fallback;
    const n = Number(params.get(key));
    if (!isNaN(n) && isFinite(n)) {
      if (n < min) return min;
      if (max != null && n > max) return max;
      return n;
    }
    return fallback;
  };

  const imgSeconds = num('seconds', 15, 5);
  const maxClip = num('maxclip', 60, 10);
  const stallSeconds = num('stall', 20, 5);
  const watchdogSeconds = num('watchdog', 90, 20);
  const loopsBeforeReload = num('loops', 0, 0);
  const reloadHours = num('reload', 0, 0);
  const nightlyOn = params.get('nightly') !== '0';
  const nightlyHour = num('athour', 3, 0, 23);
  const fresh = params.get('fresh') === '1';
  const debug = params.get('debug') === '1';
  const settings = window.BOARD_SETTINGS || {};
  const schedule = window.BOARD_SCHEDULE;

  const stage = document.getElementById('stage');
  const vid = document.getElementById('vid');
  const img = document.getElementById('img');
  const card = document.getElementById('card');
  const fx = document.getElementById('fx');
  const bar = document.querySelector('#progress span');
  const counter = document.getElementById('counter');
  const pauseBtn = document.getElementById('pause');
  const soundBtn = document.getElementById('sound');

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  if (!store.get('hb_since')) store.set('hb_since', String(Date.now()));
  store.set('hb_loads', String((Number(store.get('hb_loads')) || 0) + 1));

  // Sound is on unless ?mute=1. If the TV blocks audible autoplay, playback
  // continues muted and the first tap/key turns sound back on.
  vid.muted = params.get('mute') === '1';
  let wantSound = !vid.muted;
  let triedMuted = false;
  soundBtn.textContent = vid.muted ? '🔇' : '🔊';

  const isVideoSrc = s => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(s || '');
  let slides = [];
  let board = null;
  let parts = null;
  let i = 0;
  let generation = 0;
  let expectedSrc = '';
  let paused = false;
  let failures = 0;
  let loopsDone = 0;
  let boundaryReload = '';
  let reloading = false;
  let failedGen = -1;
  let timer = null;
  let stallTimer = null;
  let deadline = 0;
  let lastGood = Date.now();
  let lastMediaTime = -1;
  let sawFrame = false;
  let imgStart = 0;
  let imgElapsed = 0;
  let atmosphere = '';
  const booted = Date.now();

  const note = msg => store.set('hb_err', new Date().toLocaleTimeString() + ' ' + msg);

  function kindOf(slide) {
    if (!slide) return 'card';
    if (slide.kind) return slide.kind;
    if (typeof slide === 'string') return isVideoSrc(slide) ? 'video' : 'image';
    if (slide.src) return isVideoSrc(slide.src) ? 'video' : 'image';
    return 'card';
  }
  function srcOf(slide) {
    if (!slide) return '';
    return typeof slide === 'string' ? slide : (slide.src || '');
  }
  function labelOf(slide) {
    if (!slide) return '';
    if (typeof slide === 'string') return slide;
    return slide.label || srcOf(slide) || 'slide';
  }
  function secondsOf(slide) {
    if (slide && slide.card && slide.card.seconds) return slide.card.seconds;
    return imgSeconds;
  }

  function releaseVideo() {
    // Detach the decoder before the next clip. Handlers ignore this moment
    // because expectedSrc is cleared first: an empty load must not count as a
    // failed clip (some TV browsers fire error when src is removed).
    expectedSrc = '';
    vid.onended = null;
    try { vid.pause(); } catch (e) {}
    vid.removeAttribute('src');
    try { vid.load(); } catch (e) {}
    vid.classList.remove('on');
  }

  function releaseImage() {
    img.onload = null;
    img.onerror = null;
    img.classList.remove('on');
    img.removeAttribute('src');
  }

  function releaseCard() {
    card.className = '';
    card.textContent = '';
  }

  function clearClipTimers() {
    clearTimeout(timer);
    clearTimeout(stallTimer);
    timer = null;
    stallTimer = null;
  }

  function armStall(gen) {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      if (gen !== generation || paused) return;
      recover('stalled ' + labelOf(slides[i]));
    }, stallSeconds * 1000);
  }

  function armMax(gen, ms) {
    clearTimeout(timer);
    if (ms < 0) ms = 0;
    deadline = Date.now() + ms;
    timer = setTimeout(() => { if (gen === generation) advance(gen); }, ms);
  }

  function playClip(gen) {
    let ret;
    try { ret = vid.play(); } catch (e) { ret = Promise.reject(e); }
    // Older TV browsers return undefined from play(). Calling .then on that
    // threw, window.onerror reloaded the page, and the board crash-looped.
    Promise.resolve(ret).then(() => {
      if (gen !== generation) return;
      vid.classList.add('on');
      lastGood = Date.now();
    }).catch(() => {
      if (gen !== generation) return;
      if (!vid.muted && !triedMuted) {
        triedMuted = true;
        vid.muted = true;
        soundBtn.textContent = '🔇';
        playClip(gen);
        return;
      }
      recover('playback rejected ' + labelOf(slides[i]));
    });
  }

  function goTo(n) {
    if (fresh && slides.length > 1) {
      const next = ((n % slides.length) + slides.length) % slides.length;
      store.set('hb_next', String(next));
      location.replace(location.pathname + location.search);
      return;
    }
    show(n);
  }

  function advance(gen) {
    if (gen != null && gen !== generation) return;
    if (!slides.length) return;
    if (boundaryReload) { safeReload(boundaryReload, false); return; }
    if (loopsBeforeReload > 0 && slides.length > 1 && i === slides.length - 1) {
      loopsDone += 1;
      if (loopsDone >= loopsBeforeReload) { safeReload('loop reset', false); return; }
    }
    goTo(i + 1);
  }

  function safeReload(reason, failure) {
    if (reloading) return;
    note(reason);
    const last = Number(store.get('hb_reload_at')) || 0;
    // A clip that kills the page must not reboot the TV every few seconds.
    if (failure && Date.now() - last < 180000) {
      clearClipTimers();
      failures = 0;
      timer = setTimeout(() => show(0), 60000);
      return;
    }
    reloading = true;
    store.set('hb_reload_at', String(Date.now()));
    store.set('hb_reason', reason);
    if (slides.length) store.set('hb_next', String((i + 1) % slides.length));
    location.reload();
  }

  function recover(reason) {
    // error and play() rejection can both fire for one bad file. Count that
    // once, and skip on a later turn so we never re-enter show() mid-load.
    const gen = generation;
    if (failedGen === gen || reloading) return;
    failedGen = gen;
    note(reason);
    setTimeout(() => {
      if (generation !== gen || reloading) return;
      if (boundaryReload) { safeReload(boundaryReload, false); return; }
      failures += 1;
      if (!slides.length) return;
      if (failures >= slides.length) {
        failures = 0;
        safeReload('watchdog ' + reason, true);
        return;
      }
      goTo(i + 1);
    }, 0);
  }

  function setAtmosphere(theme) {
    if (atmosphere === theme) return;
    atmosphere = theme;
    if (stage.dataset.theme) stage.classList.remove('theme-' + stage.dataset.theme);
    stage.dataset.theme = theme;
    stage.classList.add('theme-' + theme);
    fx.textContent = '';
    const kind = {
      boiler: 'ember',
      christmas: 'snow',
      newyear: 'spark',
      thanksgiving: 'leaf',
      valentines: 'heart',
      stpatricks: 'clover',
      july4: 'star'
    }[theme];
    if (!kind) return;
    let n;
    for (n = 0; n < 14; n++) {
      const el = document.createElement('span');
      el.className = 'bit ' + kind;
      el.style.left = ((n * 7) % 96) + '%';
      el.style.animationDuration = (10 + (n % 7)) + 's';
      el.style.animationDelay = (-n * 0.7) + 's';
      el.style.fontSize = (22 + (n % 4) * 6) + 'px';
      if (kind === 'heart') el.textContent = '\u2665';
      fx.appendChild(el);
    }
  }

  function fillCard(slide) {
    const data = slide.card || {};
    const theme = slide.theme || 'shop';
    card.className = 'on theme-' + theme;
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    const art = document.createElement('div');
    art.className = 'art';
    art.innerHTML = (window.BOARD_ART && window.BOARD_ART[theme]) || (window.BOARD_ART && window.BOARD_ART.shop) || '';
    const copy = document.createElement('div');
    copy.className = 'copy';

    const brandline = document.createElement('div');
    brandline.className = 'brandline';
    const mark = document.createElement('div');
    mark.className = 'mark';
    mark.textContent = '3R';
    const brand = document.createElement('div');
    brand.className = 'brand';
    brand.textContent = 'Plumbing & Mechanical';
    brandline.appendChild(mark);
    brandline.appendChild(brand);

    const kicker = document.createElement('p');
    kicker.className = 'kicker';
    kicker.textContent = data.kicker || '';

    const title = document.createElement('h1');
    let titleText = data.title || '';
    if (parts && titleText.indexOf('{year}') !== -1) {
      const year = parts.month === 12 ? parts.year + 1 : parts.year;
      titleText = titleText.split('{year}').join(String(year));
    }
    title.textContent = titleText;

    copy.appendChild(brandline);
    copy.appendChild(kicker);
    copy.appendChild(title);
    if (data.lines && data.lines.length) {
      const ul = document.createElement('ul');
      ul.className = 'lines';
      let n;
      for (n = 0; n < data.lines.length; n++) {
        const li = document.createElement('li');
        li.textContent = data.lines[n];
        ul.appendChild(li);
      }
      copy.appendChild(ul);
    } else if (data.body) {
      const p = document.createElement('p');
      p.className = 'lead';
      p.textContent = data.body;
      copy.appendChild(p);
    }
    const foot = document.createElement('p');
    foot.className = 'cardfoot';
    foot.textContent = data.foot || '3R Plumbing & Mechanical';
    copy.appendChild(foot);

    card.appendChild(scrim);
    card.appendChild(art);
    card.appendChild(copy);
  }

  function show(n) {
    if (!slides.length) return;
    let gen;
    try {
      gen = ++generation;
      clearClipTimers();
      releaseImage();
      releaseVideo();
      releaseCard();
      i = ((n % slides.length) + slides.length) % slides.length;
      const slide = slides[i];
      const kind = kindOf(slide);
      const src = srcOf(slide);
      counter.textContent = (i + 1) + ' / ' + slides.length;
      bar.style.width = '0%';
      lastMediaTime = -1;
      sawFrame = false;
      stage.classList.toggle('media', kind !== 'card');
      setAtmosphere(kind === 'card' ? (slide.theme || 'shop') : ((board && board.theme) || 'shop'));
      if (kind === 'video') {
        expectedSrc = src;
        vid.onended = () => {
          if (generation !== gen) return;
          if ((vid.getAttribute('src') || '') !== expectedSrc) return;
          failures = 0;
          lastGood = Date.now();
          advance(gen);
        };
        vid.onerror = () => {
          const current = vid.getAttribute('src') || '';
          if (!current || current !== expectedSrc || generation !== gen) return;
          recover('could not load ' + current);
        };
        vid.ontimeupdate = () => {
          if (paused || generation !== gen) return;
          if (vid.currentTime > lastMediaTime + 0.2) {
            lastMediaTime = vid.currentTime;
            lastGood = Date.now();
            failures = 0;
            armStall(gen);
            if (!sawFrame && vid.currentTime > 1) {
              if (vid.videoWidth > 0) sawFrame = true;
              else recover('no frames ' + src);
            }
          }
        };
        vid.src = src;
        playClip(gen);
        armMax(gen, maxClip * 1000);
        armStall(gen);
        if (paused) vid.pause();
      } else if (kind === 'image') {
        img.onload = () => {
          if (generation !== gen) return;
          img.classList.add('on');
          failures = 0;
          lastGood = Date.now();
          imgStart = performance.now();
          imgElapsed = 0;
          if (!paused) armMax(gen, imgSeconds * 1000);
        };
        img.onerror = () => { if (generation === gen) recover('could not load ' + src); };
        img.src = src;
      } else {
        fillCard(slide);
        failures = 0;
        lastGood = Date.now();
        imgStart = performance.now();
        imgElapsed = 0;
        if (!paused) armMax(gen, secondsOf(slide) * 1000);
      }
    } catch (e) {
      note('show failed ' + (e && e.message ? e.message : e));
      recover('show failed');
    }
  }

  function togglePause() {
    paused = !paused;
    pauseBtn.textContent = paused ? '\u25b6' : '\u2161';
    const gen = generation;
    if (paused) {
      clearClipTimers();
      if (kindOf(slides[i]) === 'video') { try { vid.pause(); } catch (e) {} }
      else imgElapsed += (performance.now() - imgStart) / 1000;
      return;
    }
    if (kindOf(slides[i]) === 'video') {
      playClip(gen);
      armMax(gen, Math.max(0, deadline - Date.now()));
      armStall(gen);
    } else {
      imgStart = performance.now();
      armMax(gen, Math.max(0, secondsOf(slides[i]) - imgElapsed) * 1000);
    }
  }

  document.getElementById('next').onclick = () => advance(generation);
  document.getElementById('prev').onclick = () => show(i - 1);
  pauseBtn.onclick = togglePause;
  soundBtn.onclick = (e) => {
    e.stopPropagation();
    vid.muted = !vid.muted;
    wantSound = !vid.muted;
    triedMuted = vid.muted;
    soundBtn.textContent = vid.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    if (!vid.muted && kindOf(slides[i]) === 'video') playClip(generation);
  };
  const unlock = () => {
    if (wantSound && vid.muted) {
      vid.muted = false;
      triedMuted = false;
      soundBtn.textContent = '\uD83D\uDD0A';
    }
  };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);
  document.getElementById('full').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };
  addEventListener('keydown', e => {
    const key = (e.key || '').toLowerCase();
    if (key === 'arrowright' || key === ' ') { e.preventDefault(); advance(generation); }
    else if (key === 'arrowleft') show(i - 1);
    else if (key === 'p') togglePause();
    else if (key === 'm') soundBtn.click();
    else if (key === 'f') document.getElementById('full').click();
  });

  function requestBoundaryReload(reason) {
    boundaryReload = reason;
    // Don't wait on a clip that will never end.
    setTimeout(() => { if (boundaryReload) safeReload(reason, false); }, (maxClip + 15) * 1000);
  }

  function msUntilHour(hour) {
    const now = new Date();
    const next = new Date(now.getTime());
    next.setHours(hour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
  }

  if (nightlyOn) setTimeout(() => requestBoundaryReload('nightly'), msUntilHour(nightlyHour));
  if (reloadHours > 0) setTimeout(() => requestBoundaryReload('scheduled'), reloadHours * 3600 * 1000);

  async function wake() {
    try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) {}
  }
  wake();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  setInterval(wake, 60000);

  // A shop Wi-Fi blip retries the clip that failed. It does not reload the page.
  addEventListener('online', () => {
    if (Date.now() - booted < 5000 || paused || !slides.length) return;
    if (kindOf(slides[i]) === 'video' && (vid.error || vid.networkState === 3)) show(i);
  });

  // Log script errors. Reloading here caused a reboot loop when play() threw.
  // The watchdog below reloads only if the loop itself has stopped.
  window.onerror = (m) => { note('error: ' + m); };

  setInterval(() => {
    if (!slides.length) return;
    if (paused || document.hidden) { lastGood = Date.now(); return; }
    if (kindOf(slides[i]) === 'video') {
      const d = vid.duration;
      bar.style.width = (d && isFinite(d)) ? (100 * vid.currentTime / d) + '%' : '0%';
    } else {
      const total = secondsOf(slides[i]);
      const t = imgElapsed + (performance.now() - imgStart) / 1000;
      bar.style.width = Math.min(100, 100 * t / total) + '%';
    }
  }, 250);

  setInterval(() => {
    if (paused || !slides.length || document.hidden || reloading) {
      lastGood = Date.now();
      return;
    }
    if (Date.now() - lastGood > watchdogSeconds * 1000) {
      lastGood = Date.now();
      recover('no progress');
    }
  }, 5000);

  if (debug) {
    const dbg = document.createElement('div');
    dbg.style.cssText = 'position:fixed;left:10px;top:10px;z-index:9;background:rgba(0,0,0,.75);color:#ff7a1a;font:14px monospace;padding:8px 10px;border-radius:6px;white-space:pre';
    document.body.appendChild(dbg);
    setInterval(() => {
      const up = Math.round((Date.now() - Number(store.get('hb_since'))) / 60000);
      const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'n/a';
      dbg.textContent = 'theme: ' + (board ? board.theme : '')
        + '\nrunning: ' + up + ' min'
        + '\npage loads: ' + store.get('hb_loads')
        + '\nclip: ' + (slides.length ? (i + 1) + '/' + slides.length : '0')
        + '\nmemory: ' + mem
        + '\nlast problem: ' + (store.get('hb_err') || 'none');
    }, 1000);
  }

  function normalize(list) {
    const out = [];
    if (!list || !list.length) return out;
    let n;
    for (n = 0; n < list.length; n++) {
      const item = list[n];
      const src = typeof item === 'string' ? item : (item && item.src);
      if (typeof src === 'string' && src) out.push(src);
    }
    return out;
  }

  function readMedia(data) {
    const themes = {};
    if (!data) return themes;
    if (Array.isArray(data)) {
      themes.halloween = normalize(data);
      return themes;
    }
    const bag = data.themes ? data.themes : (Array.isArray(data.clips) ? null : data);
    if (data.themes || (!data.clips && bag)) {
      let key;
      for (key in bag) {
        if (Array.isArray(bag[key])) themes[key] = normalize(bag[key]);
      }
      if (data.themes || themes.halloween) return themes;
    }
    if (Array.isArray(data.clips)) themes.halloween = normalize(data.clips);
    return themes;
  }

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), ms);
      promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
  }

  function nyParts(date) {
    try {
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: settings.timezone || 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const bits = fmt.formatToParts(date);
      const grab = type => {
        let n;
        for (n = 0; n < bits.length; n++) if (bits[n].type === type) return Number(bits[n].value);
        return 0;
      };
      return { year: grab('year'), month: grab('month'), day: grab('day') };
    } catch (e) {
      return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
    }
  }

  function previewParts() {
    const raw = params.get('date');
    if (!raw) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  function mediaSlides(theme, media) {
    const list = (media && media[theme]) || [];
    const out = [];
    let n;
    for (n = 0; n < list.length; n++) {
      const src = list[n];
      out.push({
        kind: isVideoSrc(src) ? 'video' : 'image',
        src: src,
        theme: theme,
        label: src
      });
    }
    return out;
  }

  function cardSlides(theme) {
    const list = (window.BOARD_CARDS && window.BOARD_CARDS[theme]) || [];
    const out = [];
    let n;
    for (n = 0; n < list.length; n++) {
      out.push({
        kind: 'card',
        theme: theme,
        card: list[n],
        label: list[n].title || theme
      });
    }
    return out;
  }

  function interleave(main, extra, every) {
    if (!extra.length || !main.length) return main.slice();
    const out = [];
    const step = every > 0 ? every : 2;
    let e = 0;
    let n;
    for (n = 0; n < main.length; n++) {
      out.push(main[n]);
      if ((n + 1) % step === 0) {
        out.push(extra[e % extra.length]);
        e++;
      }
    }
    return out;
  }

  function buildSlides(choice, media) {
    let main;
    // Halloween stays a straight clip reel. No cards, no boiler slides.
    if (choice.theme === 'halloween') main = mediaSlides('halloween', media);
    else main = cardSlides(choice.theme).concat(mediaSlides(choice.theme, media));
    if (choice.mixBoiler && choice.theme !== 'boiler') {
      const boiler = cardSlides('boiler').concat(mediaSlides('boiler', media));
      main = interleave(main, boiler, settings.boilerMixEvery || 2);
    }
    if (!main.length) {
      main = [{
        kind: 'card',
        theme: choice.theme,
        label: 'No slides yet',
        card: {
          kicker: '3R',
          title: 'No slides in this theme yet',
          body: 'Drop MP4s or images into this theme\u2019s folder and update the playlist.',
          foot: '3R Plumbing & Mechanical'
        }
      }];
    }
    return main;
  }

  async function loadMedia() {
    let media = readMedia(window.SLIDES || {});
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const killer = ctrl ? setTimeout(() => ctrl.abort(), 4000) : null;
    try {
      const r = await withTimeout(fetch('clips.json', {
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined
      }), 4000);
      if (!r.ok) throw new Error('status ' + r.status);
      const parsed = readMedia(await r.json());
      let any = false;
      let key;
      for (key in parsed) {
        if (parsed[key] && parsed[key].length) any = true;
      }
      // An empty manifest still wins when the file loaded, so a theme with
      // only cards is not replaced by a stale slides.js full of clips.
      if (any || (parsed && parsed.halloween)) media = parsed;
    } catch (e) {
      note('using slides.js');
    } finally {
      if (killer) clearTimeout(killer);
    }
    return media;
  }

  loadMedia().then(media => {
    parts = previewParts() || nyParts(new Date());
    const forced = (params.get('theme') || '').toLowerCase();
    if (forced && schedule && schedule.describe) {
      board = schedule.describe(forced, parts);
      if (!board) note('unknown theme ' + forced);
    }
    if (!board) board = schedule ? schedule.resolve(parts) : { theme: 'halloween', mixBoiler: false, label: 'Halloween' };
    slides = buildSlides(board, media);
    window.__board = {
      theme: board.theme,
      label: board.label,
      mixBoiler: board.mixBoiler,
      date: parts,
      slides: slides.map(s => ({ kind: s.kind, theme: s.theme, label: s.label }))
    };
    if (params.get('shuffle') === '1') slides.sort(() => Math.random() - 0.5);
    document.title = '3R ' + (board.label || 'Shop TV');
    if (!slides.length) {
      counter.textContent = 'No slides yet';
      counter.style.opacity = 1;
      return;
    }
    let start = 0;
    if (params.has('slide')) {
      const q = Number(params.get('slide'));
      if (isFinite(q)) start = Math.max(1, q) - 1;
    } else {
      const raw = store.get('hb_next');
      if (raw) {
        const n = Number(raw);
        if (isFinite(n) && n >= 0) start = n % slides.length;
        store.set('hb_next', '');
      }
    }
    show(start);
  });
})();
