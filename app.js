(() => {
  // Shop-TV playlist. One video element is reused for every clip. The playlist
  // comes from clips.json (regenerated in CI from assets/clips). slides.js is
  // the same list, used when that file can't be fetched. There is no GitHub API
  // call: an unattended TV was burning the unauthenticated rate limit and then
  // playing a stale fallback.
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

  const vid = document.getElementById('vid');
  const img = document.getElementById('img');
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

  const isVideo = s => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(s);
  let slides = [];
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
  const booted = Date.now();

  const note = msg => store.set('hb_err', new Date().toLocaleTimeString() + ' ' + msg);

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
      recover('stalled ' + (slides[i] || ''));
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
      recover('playback rejected ' + (slides[i] || ''));
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

  function show(n) {
    if (!slides.length) return;
    let gen;
    try {
      gen = ++generation;
      clearClipTimers();
      releaseImage();
      releaseVideo();
      i = ((n % slides.length) + slides.length) % slides.length;
      const src = slides[i];
      counter.textContent = (i + 1) + ' / ' + slides.length;
      bar.style.width = '0%';
      lastMediaTime = -1;
      sawFrame = false;
      if (isVideo(src)) {
        expectedSrc = src;
        vid.onended = () => {
          if (generation !== gen) return;
          if ((vid.getAttribute('src') || '') !== expectedSrc) return;
          failures = 0;
          lastGood = Date.now();
          advance(gen);
        };
        vid.onerror = () => {
          // Ignore the error some browsers emit while the previous clip is released.
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
      } else {
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
      }
    } catch (e) {
      note('show failed ' + (e && e.message ? e.message : e));
      recover('show failed');
    }
  }

  function togglePause() {
    paused = !paused;
    pauseBtn.textContent = paused ? '▶' : 'Ⅱ';
    const gen = generation;
    if (paused) {
      clearClipTimers();
      if (isVideo(slides[i])) { try { vid.pause(); } catch (e) {} }
      else imgElapsed += (performance.now() - imgStart) / 1000;
      return;
    }
    if (isVideo(slides[i])) {
      playClip(gen);
      armMax(gen, Math.max(0, deadline - Date.now()));
      armStall(gen);
    } else {
      imgStart = performance.now();
      armMax(gen, Math.max(0, imgSeconds - imgElapsed) * 1000);
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
    soundBtn.textContent = vid.muted ? '🔇' : '🔊';
    if (!vid.muted) playClip(generation);
  };
  const unlock = () => {
    if (wantSound && vid.muted) {
      vid.muted = false;
      triedMuted = false;
      soundBtn.textContent = '🔊';
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

  // A shop Wi-Fi "online" blip used to reload the page immediately. That looked
  // like a crash and, with the old GitHub lookup, ate the API rate limit.
  // Retry only the clip that actually failed to load.
  addEventListener('online', () => {
    if (Date.now() - booted < 5000 || paused || !slides.length) return;
    if (isVideo(slides[i]) && (vid.error || vid.networkState === 3)) show(i);
  });

  // Log script errors. Reloading here caused a reboot loop when play() threw.
  // The watchdog below reloads only if the loop itself has stopped.
  window.onerror = (m) => { note('error: ' + m); };

  setInterval(() => {
    if (!slides.length) return;
    if (paused || document.hidden) { lastGood = Date.now(); return; }
    if (isVideo(slides[i])) {
      const d = vid.duration;
      bar.style.width = (d && isFinite(d)) ? (100 * vid.currentTime / d) + '%' : '0%';
    } else if (img.classList.contains('on')) {
      const t = imgElapsed + (paused ? 0 : (performance.now() - imgStart) / 1000);
      bar.style.width = Math.min(100, 100 * t / imgSeconds) + '%';
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

  let dbg = null;
  if (debug) {
    dbg = document.createElement('div');
    dbg.style.cssText = 'position:fixed;left:10px;top:10px;z-index:9;background:rgba(0,0,0,.75);color:#ff7a1a;font:14px monospace;padding:8px 10px;border-radius:6px;white-space:pre';
    document.body.appendChild(dbg);
    setInterval(() => {
      const up = Math.round((Date.now() - Number(store.get('hb_since'))) / 60000);
      const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'n/a';
      dbg.textContent = 'mode: ' + (fresh ? 'fresh' : 'normal')
        + '\nrunning: ' + up + ' min'
        + '\npage loads: ' + store.get('hb_loads')
        + '\nclip: ' + (slides.length ? (i + 1) + '/' + slides.length : '0')
        + '\nmemory: ' + mem
        + '\nlast problem: ' + (store.get('hb_err') || 'none');
    }, 1000);
  }

  function normalize(list) {
    const out = [];
    for (let n = 0; n < list.length; n++) {
      const item = list[n];
      const src = typeof item === 'string' ? item : (item && item.src);
      if (typeof src === 'string' && src) out.push(src);
    }
    return out;
  }

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), ms);
      promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
  }

  async function loadPlaylist() {
    const fallback = normalize(window.SLIDES || []);
    // Don't let a hung manifest request keep the TV on a black screen.
    // AbortController is missing on some older TV browsers, so the timer
    // stands on its own and playback falls back to slides.js.
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const killer = ctrl ? setTimeout(() => ctrl.abort(), 4000) : null;
    try {
      const r = await withTimeout(fetch('clips.json', {
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined
      }), 4000);
      if (!r.ok) throw new Error('status ' + r.status);
      const data = await r.json();
      const list = normalize(Array.isArray(data) ? data : (data && data.clips) || []);
      if (list.length) return list;
    } catch (e) {
      note('using slides.js');
    } finally {
      if (killer) clearTimeout(killer);
    }
    return fallback;
  }

  loadPlaylist().then(list => {
    slides = list;
    if (params.get('shuffle') === '1') slides.sort(() => Math.random() - 0.5);
    if (!slides.length) {
      counter.textContent = 'No clips yet';
      counter.style.opacity = 1;
      return;
    }
    let start = 0;
    const raw = store.get('hb_next');
    if (raw) {
      const n = Number(raw);
      if (isFinite(n) && n >= 0) start = n % slides.length;
      store.set('hb_next', '');
    }
    show(start);
  });
})();
