(() => {
  // 3R Halloween TV — seamless clip player.
  // Two video players take turns: while one plays, the next clip is already
  // loaded in the other, and they crossfade just before the current clip ends.
  // Clips are found automatically in assets/clips (file-name order); slides.js is a backup list.
  const REPO = 'ross680/Halloween-Board', FOLDER = 'assets/clips';
  const params = new URLSearchParams(location.search);
  const FADE = 0.8;                                             // crossfade seconds
  const imgSeconds = Math.max(5, Number(params.get('seconds')) || 15);
  const players = [document.getElementById('vidA'), document.getElementById('vidB')];
  const img = document.getElementById('img');
  const bar = document.querySelector('#progress span'), counter = document.getElementById('counter');
  const pauseBtn = document.getElementById('pause'), soundBtn = document.getElementById('sound');
  const isVideo = s => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(s);

  let slides = (window.SLIDES || []).slice();
  let i = 0, cur = 0, paused = false, muted = params.get('sound') !== '1';
  // single-player mode for TVs that can only decode one video at a time (?simple=1 forces it)
  let single = params.get('simple') === '1';
  let switching = false, imgTimer = null, imgStart = 0, imgElapsed = 0, failures = 0, retryTimer = null;

  const active = () => players[cur], standby = () => players[1 - cur];
  const idx = n => (n + slides.length) % slides.length;
  function setMuted(m){ muted = m; players.forEach(p => p.muted = m); soundBtn.textContent = m ? '🔇' : '🔊'; }
  setMuted(muted);

  // Load a clip into a player without playing it.
  function prep(p, src){ if (p.dataset.src !== src) { p.dataset.src = src; p.src = src; p.load(); } }
  function preloadNext(){ if (single) return; const s = slides[idx(i + 1)]; if (isVideo(s)) prep(standby(), s); }

  function play(p){
    return p.play().catch(() => { setMuted(true); return p.play(); }); // browsers block autoplay with sound
  }

  function show(n, fromEnd){
    if (!slides.length) return;
    clearTimeout(imgTimer);
    i = idx(n);
    const src = slides[i];
    counter.textContent = `${i + 1} / ${slides.length}`;
    if (isVideo(src) && single) {
      const p = active(); standby().pause(); standby().removeAttribute('src'); standby().classList.remove('on');
      p.classList.remove('on');
      setTimeout(() => {
        prep(p, src); p.currentTime = 0;
        play(p).then(() => { failures = 0; p.classList.add('on'); img.classList.remove('on'); switching = false; if (paused) p.pause(); })
          .catch(() => { switching = false; fail(); });
      }, 350);
    } else if (isVideo(src)) {
      const old = active(), nxt = standby();
      prep(nxt, src);
      nxt.currentTime = 0;
      play(nxt).then(() => {
        failures = 0;
        nxt.classList.add('on'); img.classList.remove('on');
        old.classList.remove('on');
        cur = 1 - cur;
        setTimeout(() => { old.pause(); switching = false; preloadNext(); }, FADE * 1000);
        if (paused) nxt.pause();
      }).catch(() => {
        // Second player couldn't start: this TV likely supports one video at a time. Switch modes and retry this clip.
        if (!single) { single = true; nxt.removeAttribute('src'); nxt.dataset.src = ''; nxt.load(); show(i); return; }
        switching = false; fail();
      });
    } else {
      const p = new Image();
      p.onload = () => {
        img.src = src; img.classList.add('on'); players.forEach(v => { v.classList.remove('on'); v.pause(); });
        failures = 0; switching = false; imgStart = performance.now(); imgElapsed = 0;
        if (!paused) imgTimer = setTimeout(() => show(i + 1), imgSeconds * 1000);
        preloadNext();
      };
      p.onerror = () => { switching = false; fail(); };
      p.src = src;
    }
  }
  function fail(){
    failures++;
    if (failures < slides.length) show(i + 1);
    else { failures = 0; clearTimeout(retryTimer); retryTimer = setTimeout(() => show(0), 60000); } // nothing loads (e.g. still publishing): retry in a minute
  }

  // Start the crossfade just before the active clip ends.
  players.forEach(p => {
    p.addEventListener('timeupdate', () => {
      if (p !== active() || switching || paused || !p.duration) return;
      if (p.duration - p.currentTime <= FADE) { switching = true; show(i + 1); }
    });
    p.addEventListener('ended', () => { if (p === active() && !switching) { switching = true; show(i + 1); } });
  });

  // Watchdog: if the playing clip freezes for 8s (stalled download, decoder hiccup), move on.
  let lastT = -1, stuck = 0;
  setInterval(() => {
    const s = slides[i]; if (!s || !isVideo(s) || paused || switching) { stuck = 0; return; }
    const t = active().currentTime;
    if (t === lastT) { if (++stuck >= 8) { stuck = 0; switching = true; show(i + 1); } } else stuck = 0;
    lastT = t;
  }, 1000);

  // Progress bar
  (function tick(){
    const s = slides[i];
    if (s && isVideo(s)) { const p = active(); bar.style.width = p.duration ? (100 * p.currentTime / p.duration) + '%' : '0%'; }
    else if (s && !paused) bar.style.width = Math.min(100, 100 * (imgElapsed + (performance.now() - imgStart) / 1000) / imgSeconds) + '%';
    requestAnimationFrame(tick);
  })();

  function togglePause(){
    paused = !paused;
    pauseBtn.textContent = paused ? '▶' : 'Ⅱ';
    if (isVideo(slides[i])) { paused ? active().pause() : active().play(); }
    else if (paused) { clearTimeout(imgTimer); imgElapsed += (performance.now() - imgStart) / 1000; }
    else { imgStart = performance.now(); imgTimer = setTimeout(() => show(i + 1), Math.max(0, imgSeconds - imgElapsed) * 1000); }
  }
  const skip = d => { if (!switching) { switching = true; show(i + d); } };
  document.getElementById('next').onclick = () => skip(1);
  document.getElementById('prev').onclick = () => skip(-1);
  pauseBtn.onclick = togglePause;
  soundBtn.onclick = () => setMuted(!muted);
  document.getElementById('full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'arrowright' || k === ' ') { e.preventDefault(); skip(1); }
    else if (k === 'arrowleft') skip(-1);
    else if (k === 'p') togglePause();
    else if (k === 'm') setMuted(!muted);
    else if (k === 'f') document.getElementById('full').click();
  });
  // First click/keypress anywhere unlocks sound if ?sound=1 was blocked by the browser.
  if (params.get('sound') === '1') addEventListener('pointerdown', () => setMuted(false), { once: true });

  // TV hardening: keep screen awake; reload every few hours to pick up new clips.
  const reloadHours = Math.max(1, Number(params.get('reload')) || 4);
  async function wake(){ try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) {} }
  wake(); document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  setTimeout(() => location.reload(), reloadHours * 3600 * 1000);

  async function discover(){
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FOLDER}?t=${Date.now()}`);
      if (!r.ok) throw 0;
      const found = (await r.json())
        .filter(f => f.type === 'file' && /\.(mp4|webm|mov|m4v|jpe?g|png|gif|webp)$/i.test(f.name))
        .map(f => FOLDER + '/' + f.name)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      if (found.length) slides = found;
    } catch (e) {}
    if (params.get('shuffle') === '1') slides.sort(() => Math.random() - 0.5);
    if (!slides.length) { counter.textContent = 'No clips yet'; counter.style.opacity = 1; return; }
    switching = true; show(0);
  }
  discover();
})();
