(() => {
  window.__aknPlayerCleanup?.();
  document.getElementById('akn-player')?.remove();
  const api = window.pywebview?.api;
  if (!api) return;

  const style = document.createElement('style');
  style.textContent = `
    #akn-player{position:fixed;right:20px;bottom:82px;z-index:2147483647;width:300px;color:#183547;font-family:"SF Pro Display","Segoe UI","Microsoft YaHei",sans-serif;letter-spacing:0}
    #akn-player *{box-sizing:border-box}#akn-player .pp-shell{overflow:hidden;border:1px solid rgba(255,255,255,.68);border-radius:18px;background:linear-gradient(145deg,rgba(246,251,252,.68),rgba(218,235,242,.42));box-shadow:0 18px 44px rgba(12,37,51,.2),inset 0 1px rgba(255,255,255,.88);backdrop-filter:blur(22px) saturate(155%);-webkit-backdrop-filter:blur(22px) saturate(155%)}
    .pp-main{height:64px;padding:8px 10px;display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:9px}.pp-button{width:36px;height:36px;padding:0;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.72);border-radius:11px;background:rgba(255,255,255,.34);box-shadow:inset 0 1px rgba(255,255,255,.72),0 4px 12px rgba(24,72,91,.08);color:#1b6078;cursor:pointer;transition:transform .16s ease,background .16s ease,box-shadow .16s ease,color .16s ease}.pp-button:hover{transform:translateY(-1px);background:rgba(255,255,255,.66);box-shadow:inset 0 1px white,0 7px 16px rgba(24,72,91,.13)}.pp-button:active{transform:translateY(0) scale(.95)}.pp-button:focus-visible{outline:2px solid rgba(8,127,140,.5);outline-offset:2px}.pp-icon{width:17px;height:17px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pp-play{color:white;border-color:rgba(255,255,255,.58);background:linear-gradient(135deg,rgba(5,151,155,.96),rgba(29,104,158,.92));box-shadow:inset 0 1px rgba(255,255,255,.42),0 7px 18px rgba(12,106,132,.24)}.pp-play:hover{background:linear-gradient(135deg,rgba(4,164,166,.98),rgba(28,113,169,.95))}.pp-play .pp-icon{width:18px;height:18px}.pp-info{min-width:0}.pp-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:700}.pp-time{margin-top:3px;color:#617786;font-size:10px}.pp-actions{display:flex;gap:5px}.pp-actions .pp-button{width:31px;height:31px}.pp-actions .pp-icon{width:15px;height:15px}
    .pp-progress-wrap{padding:0 24px 10px}.pp-progress{--pp-progress:0%;width:100%;height:14px;margin:-2px 0 0;display:block;appearance:none;-webkit-appearance:none;background:transparent;cursor:pointer}.pp-progress::-webkit-slider-runnable-track{height:3px;border-radius:99px;background:linear-gradient(90deg,rgba(18,139,151,.92) 0 var(--pp-progress),rgba(255,255,255,.56) var(--pp-progress) 100%)}.pp-progress::-webkit-slider-thumb{width:14px;height:14px;margin-top:-5.5px;border:2px solid rgba(255,255,255,.82);border-radius:50%;appearance:none;-webkit-appearance:none;background:#168995;box-shadow:0 2px 7px rgba(17,87,104,.22)}.pp-panel{display:none;padding:10px;border-top:1px solid rgba(255,255,255,.48)}#akn-player.open .pp-panel{display:block}.pp-toolbar{display:grid;grid-template-columns:31px 1fr 31px 31px;align-items:center;gap:7px}.pp-toolbar .pp-button{width:31px;height:31px}.pp-toolbar .pp-icon{width:15px;height:15px}.pp-volume{width:100%;accent-color:#168591}.pp-mode.active{color:white;background:linear-gradient(135deg,rgba(5,137,145,.92),rgba(30,106,153,.88))}.pp-list{max-height:150px;margin:9px 0 0;padding:0;overflow:auto;list-style:none}.pp-track{width:100%;height:34px;padding:0 9px;display:flex;align-items:center;gap:7px;border:0;border-radius:9px;background:transparent;color:#294758;font:12px inherit;text-align:left;cursor:pointer}.pp-track:hover,.pp-track.active{background:rgba(255,255,255,.45)}.pp-track.active{font-weight:700;color:#087f8c}.pp-dot{width:6px;height:6px;flex:none;border-radius:50%;background:currentColor}.pp-add{width:100%;height:34px;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px dashed rgba(30,93,114,.35);border-radius:9px;background:rgba(255,255,255,.22);color:#31566a;font:650 11px inherit;cursor:pointer;transition:background .16s ease,border-color .16s ease}.pp-add:hover{background:rgba(255,255,255,.46);border-color:rgba(8,127,140,.48)}.pp-add .pp-icon{width:14px;height:14px}.pp-file{display:none!important}
    body:has(.background-editor.open) #akn-player{display:none}@media(max-width:620px){#akn-player{right:12px;bottom:72px;width:min(300px,calc(100vw - 24px))}}
  `;
  document.head.appendChild(style);
  const iconPaths = {
    play:'<path d="m7 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
    pause:'<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
    previous:'<path d="M19 20 9 12l10-8v16Z"/><path d="M5 19V5"/>',
    next:'<path d="m5 4 10 8-10 8V4Z"/><path d="M19 5v14"/>',
    list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    volume:'<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    muted:'<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m22 9-6 6M16 9l6 6"/>',
    ordered:'<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h1v4M4 10h2M6 18H4c0-1.5 2-1.5 2-3a2 2 0 0 0-2-2"/>',
    shuffle:'<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    collapse:'<path d="m6 9 6 6 6-6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>'
  };
  const icon = name => `<svg class="pp-icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]}</svg>`;
  document.body.insertAdjacentHTML('beforeend', `
    <section id="akn-player" aria-label="音乐播放器"><div class="pp-shell">
      <div class="pp-main"><button class="pp-button pp-play" title="播放" aria-label="播放">${icon('play')}</button><div class="pp-info"><div class="pp-title">__DEFAULT_TRACK_NAME__</div><div class="pp-time">0:00 / 0:00</div></div><div class="pp-actions"><button class="pp-button pp-prev" title="上一首" aria-label="上一首">${icon('previous')}</button><button class="pp-button pp-next" title="下一首" aria-label="下一首">${icon('next')}</button><button class="pp-button pp-expand" title="展开播放列表" aria-label="展开播放列表">${icon('list')}</button></div></div>
      <div class="pp-progress-wrap"><input class="pp-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="播放进度"></div>
      <div class="pp-panel"><div class="pp-toolbar"><button class="pp-button pp-mute" title="静音" aria-label="静音">${icon('volume')}</button><input class="pp-volume" type="range" min="0" max="1" value="0.7" step="0.01" aria-label="音量"><button class="pp-button pp-mode" title="顺序播放" aria-label="播放模式">${icon('ordered')}</button><button class="pp-button pp-collapse" title="收起" aria-label="收起">${icon('collapse')}</button></div><ul class="pp-list"></ul><button class="pp-add" type="button">${icon('plus')}<span>添加本地 MP3</span></button><input class="pp-file" type="file" accept="audio/mpeg,.mp3" multiple></div>
    </div></section>`);

  const root = document.getElementById('akn-player');
  root.classList.remove('open');
  const $ = selector => root.querySelector(selector);
  const ui = {play:$('.pp-play'),title:$('.pp-title'),time:$('.pp-time'),progress:$('.pp-progress'),volume:$('.pp-volume'),mute:$('.pp-mute'),mode:$('.pp-mode'),list:$('.pp-list'),file:$('.pp-file')};
  let tracks = [], state = {track_id:'default',time:0,duration:0,volume:.7,muted:false,playing:false,shuffle:false}, polling = false, seeking = false, switching = false, pollTimer = null;
  const format = value => Number.isFinite(value) ? `${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}` : '0:00';

  const renderList = () => {
    ui.list.innerHTML = tracks.map(track=>`<li><button class="pp-track${track.id===state.track_id?' active':''}" data-id="${encodeURIComponent(track.id)}"><span class="pp-dot"></span><span>${String(track.name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span></button></li>`).join('');
  };

  const updateActiveTrack = () => {
    ui.list.querySelectorAll('.pp-track').forEach(btn => {
      btn.classList.toggle('active', decodeURIComponent(btn.dataset.id) === state.track_id);
    });
  };

  const renderProgress = () => {
    if (!seeking) {
      const progress = state.duration ? state.time / state.duration * 100 : 0;
      ui.progress.value = String(progress);
      ui.progress.style.setProperty('--pp-progress', `${progress}%`);
    }
    ui.time.textContent = `${format(state.time)} / ${format(state.duration)}`;
  };

  const renderControls = () => {
    const current = tracks.find(track => track.id === state.track_id);
    ui.title.textContent = current?.name || '__DEFAULT_TRACK_NAME__';
    ui.play.innerHTML = icon(state.playing ? 'pause' : 'play');
    ui.play.title = state.playing ? '暂停' : '播放';
    ui.play.setAttribute('aria-label', ui.play.title);
    const isMuted = state.muted || state.volume === 0;
    ui.mute.innerHTML = icon(isMuted ? 'muted' : 'volume');
    ui.mute.title = isMuted ? '取消静音' : '静音';
    ui.mute.setAttribute('aria-label', ui.mute.title);
    ui.mode.classList.toggle('active', state.shuffle);
    ui.mode.innerHTML = icon(state.shuffle ? 'shuffle' : 'ordered');
    ui.mode.title = state.shuffle ? '随机播放' : '顺序播放';
    ui.mode.setAttribute('aria-label', ui.mode.title);
    ui.volume.value = String(state.volume);
    updateActiveTrack();
  };

  const render = () => {
    renderControls();
    renderProgress();
  };

  const updatePolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refresh, state.playing ? 500 : 3000);
  };

  const refresh = async () => {
    if (polling) return;
    polling = true;
    try {
      const prev = state;
      state = await api.get_player_state();
      if (prev.playing !== state.playing || prev.track_id !== state.track_id || prev.muted !== state.muted || prev.shuffle !== state.shuffle) {
        renderControls();
        if (prev.playing !== state.playing) updatePolling();
      }
      renderProgress();
      if (state.duration && state.time >= state.duration - .3) await step(1);
    } finally {
      polling = false;
    }
  };

  const load = async id => {
    if (switching) return;
    switching = true;
    try {
      state = await api.player_load(id);
      render();
      updatePolling();
    } finally {
      switching = false;
    }
  };

  const step = async direction => {
    if (!tracks.length || switching) return;
    let index = tracks.findIndex(track => track.id === state.track_id);
    if (state.shuffle && tracks.length > 1) {
      let next = index;
      while (next === index) next = Math.floor(Math.random() * tracks.length);
      index = next;
    } else index = (index + direction + tracks.length) % tracks.length;
    await load(tracks[index].id);
  };

  ui.play.addEventListener('click', async () => {
    state = state.playing ? await api.player_pause() : await api.player_play();
    render();
    updatePolling();
  });
  $('.pp-prev').addEventListener('click', () => step(-1));
  $('.pp-next').addEventListener('click', () => step(1));
  $('.pp-expand').addEventListener('click', () => root.classList.toggle('open'));
  $('.pp-collapse').addEventListener('click', () => root.classList.remove('open'));

  ui.progress.addEventListener('input', () => {
    seeking = true;
    ui.progress.style.setProperty('--pp-progress', `${ui.progress.value}%`);
    ui.time.textContent = `${format(Number(ui.progress.value) / 100 * state.duration)} / ${format(state.duration)}`;
  });
  ui.progress.addEventListener('change', async () => {
    state = await api.player_seek(Number(ui.progress.value) / 100 * state.duration);
    seeking = false;
    render();
  });
  ui.volume.addEventListener('input', async () => {
    state = await api.player_set_volume(Number(ui.volume.value));
    renderControls();
  });
  ui.volume.addEventListener('change', () => api.save_player_state(state));
  ui.mute.addEventListener('click', async () => {
    state = await api.player_set_muted(!state.muted);
    renderControls();
  });
  ui.mode.addEventListener('click', async () => {
    state.shuffle = !state.shuffle;
    await api.save_player_state(state);
    renderControls();
  });

  ui.list.addEventListener('click', event => {
    const button = event.target.closest('[data-id]');
    if (button) load(decodeURIComponent(button.dataset.id));
  });
  $('.pp-add').addEventListener('click', () => { ui.file.value = ''; ui.file.click(); });
  ui.file.addEventListener('change', async () => {
    for (const file of ui.file.files || []) {
      if (file.size > 30 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.mp3')) continue;
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      tracks = await api.save_music_track(file.name, data);
    }
    renderList();
    renderControls();
  });

  window.__aknPlayerCleanup = () => { if (pollTimer) clearInterval(pollTimer); };
  Promise.all([api.get_music_tracks(), api.get_player_state()]).then(([savedTracks, savedState]) => {
    tracks = savedTracks;
    state = savedState;
    renderList();
    render();
    updatePolling();
  });
})();
