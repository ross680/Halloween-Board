(() => {
  // Plays a mix of video clips (mp4/webm/mov) and images.
  // Videos play to the end, then advance. Images show for ?seconds= (default 15).
  // Clips are discovered automatically from assets/clips in the GitHub repo
  // (sorted by file name). slides.js is only a fallback if GitHub can't be reached.
  const REPO = 'ross680/Halloween-Board', FOLDER = 'assets/clips';
  let slides = (window.SLIDES || []).slice();
  const vid = document.getElementById('vid'), img = document.getElementById('img');
  const bar = document.querySelector('#progress span'), counter = document.getElementById('counter');
  const pauseBtn = document.getElementById('pause'), soundBtn = document.getElementById('sound');
  const params = new URLSearchParams(location.search);
  const imgSeconds = Math.max(5, Number(params.get('seconds')) || 15);
  const maxClip = Math.max(10, Number(params.get('maxclip')) || 60); // safety cap per clip
  let i = 0, timer = null, paused = false, failures = 0, raf = null, imgStart = 0, imgElapsed = 0;
  // Sound is ON by default (add ?mute=1 to start muted). If the TV browser blocks
  // autoplay with sound, it starts muted and the first click/key/tap turns sound on.
  vid.muted = params.get('mute') === '1';
  let wantSound = !vid.muted;
  soundBtn.textContent = vid.muted ? '🔇' : '🔊';
  const isVideo = s => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(s);

  function tick(){
    if (isVideo(slides[i])) {
      const d = vid.duration;
      bar.style.width = d ? (100 * vid.currentTime / d) + '%' : '0%';
    } else if (!paused) {
      const t = imgElapsed + (performance.now() - imgStart) / 1000;
      bar.style.width = Math.min(100, 100 * t / imgSeconds) + '%';
    }
    raf = requestAnimationFrame(tick);
  }
  // TV browsers leak memory when they play video after video, and eventually the page dies
  // (the image boards don't have this problem because pictures are light).
  // Fix: after every full loop, reload the page cleanly at the clip boundary to clear memory.
  const loopsBeforeReload = Math.max(1, Number(params.get('loops')) || 10);
  let loopsDone = 0;
  function next(){
    if (slides.length > 1 && i === slides.length - 1 && ++loopsDone >= loopsBeforeReload) { location.reload(); return; }
    show(i + 1);
  }
  function fail(){
    failures++;
    if (failures < slides.length) next();
    else { failures = 0; clearTimeout(timer); timer = setTimeout(() => show(0), 60000); } // nothing loaded (e.g. site still publishing): retry in a minute
  }
  function show(n){
    if (!slides.length) return;
    clearTimeout(timer);
    i = (n + slides.length) % slides.length;
    const src = slides[i];
    counter.textContent = `${i + 1} / ${slides.length}`;
    bar.style.width = '0%';
    if (isVideo(src)) {
      img.classList.remove('on');
      vid.onended = next;
      vid.onerror = fail;
      vid.pause(); vid.removeAttribute('src'); vid.load();   // free the previous clip's memory
      vid.src = src;
      vid.play().then(() => { failures = 0; vid.classList.add('on'); })
        .catch(() => { vid.muted = true; soundBtn.textContent = '🔇'; vid.play().then(() => vid.classList.add('on')).catch(fail); });
      timer = setTimeout(next, maxClip * 1000);
      if (paused) vid.pause();
    } else {
      vid.pause(); vid.removeAttribute('src'); vid.load(); vid.classList.remove('on');
      const p = new Image();
      p.onload = () => { img.src = src; img.classList.add('on'); failures = 0; imgStart = performance.now(); imgElapsed = 0; if (!paused) timer = setTimeout(next, imgSeconds * 1000); };
      p.onerror = fail;
      p.src = src;
    }
  }
  function togglePause(){
    paused = !paused;
    pauseBtn.textContent = paused ? '▶' : 'Ⅱ';
    if (isVideo(slides[i])) { paused ? vid.pause() : vid.play(); }
    else if (paused) { clearTimeout(timer); imgElapsed += (performance.now() - imgStart) / 1000; }
    else { imgStart = performance.now(); timer = setTimeout(next, Math.max(0, imgSeconds - imgElapsed) * 1000); }
  }
  document.getElementById('next').onclick = next;
  document.getElementById('prev').onclick = () => show(i - 1);
  pauseBtn.onclick = togglePause;
  soundBtn.onclick = (e) => { e.stopPropagation(); vid.muted = !vid.muted; wantSound = !vid.muted; soundBtn.textContent = vid.muted ? '🔇' : '🔊'; };
  const unlock = () => { if (wantSound && vid.muted) { vid.muted = false; soundBtn.textContent = '🔊'; } };
  addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
  document.getElementById('full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') show(i - 1);
    else if (e.key.toLowerCase() === 'p') togglePause();
    else if (e.key.toLowerCase() === 'm') soundBtn.click();
    else if (e.key.toLowerCase() === 'f') document.getElementById('full').click();
  });
  const reloadHours = Math.max(1, Number(params.get('reload')) || 4);
  async function wake(){ try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch(e){} }
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
    show(0);
  }
  // ---- Keep-alive: make sure the loop never stops ----
  // 1) If a clip freezes (no progress for 6s), skip to the next one.
  // 2) If the whole board has made no progress for 90s, reload the page.
  // 3) Reload when the TV's internet comes back. 4) Re-ask the TV to stay awake every minute.
  let lastT = -1, stillSecs = 0, lastProgress = Date.now();
  setInterval(() => {
    if (paused || !slides.length) { lastProgress = Date.now(); return; }
    if (isVideo(slides[i])) {
      const t = vid.currentTime;
      if (t !== lastT) { lastT = t; stillSecs = 0; lastProgress = Date.now(); }
      else if (++stillSecs >= 6) { stillSecs = 0; lastT = -1; next(); }
    } else lastProgress = Date.now();
    if (Date.now() - lastProgress > 90000) location.reload();
  }, 1000);
  addEventListener('online', () => location.reload());
  setInterval(wake, 60000);
  window.onerror = () => setTimeout(() => location.reload(), 10000);

  tick(); discover();
})();
