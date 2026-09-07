(() => {
  if (window.__aknUiHelperLoaded) return;
  window.__aknUiHelperLoaded = true;

  const api = window.pywebview?.api;

  // 默认 UI 配置
  const defaultSettings = {
    accent_color: '#087f8c',
    glass_blur: 22,
    glass_opacity: 0.42,
    bg_dim: 0.15,
    show_player: true,
  };

  let initialConfig = null;
  try {
    initialConfig = JSON.parse('__UI_SETTINGS_JSON__');
  } catch (e) {
    initialConfig = null;
  }

  let settings = Object.assign({}, defaultSettings, initialConfig || {});

  // 辅助颜色换算
  const hexToRgb = hex => {
    let c = hex.replace(/^#/, '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };

  const hexToRgba = (hex, alpha) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const shiftHex = (hex, dr, dg, db) => {
    const { r, g, b } = hexToRgb(hex);
    const nr = clamp(r + dr, 0, 255);
    const ng = clamp(g + dg, 0, 255);
    const nb = clamp(b + db, 0, 255);
    return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
  };

  // 应用 CSS 变量到根节点
  const applySettings = s => {
    const root = document.documentElement;
    const accent = s.accent_color || defaultSettings.accent_color;
    const accentAlt = shiftHex(accent, 20, -18, 12);
    const accentGradient = `linear-gradient(135deg, ${accent} 0%, ${accentAlt} 100%)`;
    const accentHover = `linear-gradient(135deg, ${shiftHex(accent, 15, 15, 15)} 0%, ${shiftHex(accentAlt, 15, 15, 15)} 100%)`;
    const opacity = clamp(Number(s.glass_opacity ?? defaultSettings.glass_opacity), 0.15, 0.85);
    const blur = clamp(Number(s.glass_blur ?? defaultSettings.glass_blur), 0, 40);
    const bgDim = clamp(Number(s.bg_dim ?? defaultSettings.bg_dim), 0, 0.75);

    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-alt', accentAlt);
    root.style.setProperty('--accent-gradient', accentGradient);
    root.style.setProperty('--accent-hover', accentHover);
    root.style.setProperty('--accent-glow', hexToRgba(accent, 0.28));
    root.style.setProperty('--glass-blur', `${blur}px`);
    root.style.setProperty('--glass-opacity', String(opacity));
    root.style.setProperty('--glass-bg', `linear-gradient(145deg, rgba(255,255,255,${opacity}), rgba(225,241,247,${Math.max(0.08, opacity * 0.42).toFixed(2)}))`);
    root.style.setProperty('--bg-dim', String(bgDim));
    root.style.setProperty('--bg-dim-color', `rgba(10, 25, 34, ${bgDim})`);

    // 控制音乐播放器显示/隐藏
    const playerEl = document.getElementById('akn-player');
    if (playerEl) {
      playerEl.style.display = s.show_player ? '' : 'none';
    }

    // 动态调整背景遮罩层
    let dimEl = document.getElementById('akn-global-dim');
    if (!dimEl) {
      dimEl = document.createElement('div');
      dimEl.id = 'akn-global-dim';
      dimEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;transition:background .2s ease;';
      document.body.prepend(dimEl);
    }
    dimEl.style.background = `rgba(10, 25, 34, ${bgDim})`;

    // 触发全局事件通知其他模块
    window.dispatchEvent(new CustomEvent('akn-ui-changed', { detail: s }));
  };

  // 初始即刻应用
  applySettings(settings);

  // 从后端异步同步配置
  if (api?.get_ui_settings) {
    api.get_ui_settings().then(backendSettings => {
      if (backendSettings) {
        settings = Object.assign({}, defaultSettings, backendSettings);
        applySettings(settings);
        syncFormValues();
      }
    }).catch(() => {});
  }

  // 注入 UI 面板样式
  const style = document.createElement('style');
  style.id = 'akn-ui-styles';
  style.textContent = `
    /* 自定义 UI 抽屉面板与动画 */
    #akn-ui-backdrop{position:fixed;inset:0;z-index:2147483645;background:rgba(8,18,25,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .25s cubic-bezier(.2,.8,.2,1)}
    #akn-ui-backdrop.open{opacity:1;pointer-events:auto}
    #akn-ui-drawer{position:fixed;top:0;right:0;bottom:0;z-index:2147483646;width:min(420px,100vw);box-sizing:border-box;display:flex;flex-direction:column;background:linear-gradient(155deg,rgba(247,251,253,.84),rgba(224,239,246,.66));border-left:1px solid rgba(255,255,255,.75);box-shadow:-16px 0 45px rgba(10,34,48,.18),inset 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(28px) saturate(160%);-webkit-backdrop-filter:blur(28px) saturate(160%);transform:translateX(105%);transition:transform .3s cubic-bezier(.16,1,.3,1);color:#142b3c;font-family:"SF Pro Display","Segoe UI","Microsoft YaHei",sans-serif;letter-spacing:0}
    #akn-ui-drawer.open{transform:translateX(0)}
    #akn-ui-drawer *{box-sizing:border-box}
    
    .aui-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,.5)}
    .aui-title{display:flex;align-items:center;gap:10px}
    .aui-title-icon{font-size:20px;line-height:1}
    .aui-title h3{margin:0;font-size:18px;font-weight:700;color:#133246}
    .aui-title small{display:block;margin-top:2px;font-size:11px;color:#5c7484}
    .aui-close{width:34px;height:34px;padding:0;border:1px solid rgba(255,255,255,.75);border-radius:11px;background:rgba(255,255,255,.4);box-shadow:inset 0 1px white;color:#2c5064;font-size:20px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .18s,transform .18s}
    .aui-close:hover{background:rgba(255,255,255,.75);transform:scale(1.05)}

    .aui-body{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:22px}
    .aui-section{display:flex;flex-direction:column;gap:11px}
    .aui-sec-head{display:flex;align-items:center;justify-content:space-between}
    .aui-sec-title{font-size:13px;font-weight:700;color:#28485c;display:flex;align-items:center;gap:6px}
    .aui-val-badge{font-size:11px;font-weight:650;color:var(--accent);padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.7)}

    /* 颜色选择器 */
    .aui-colors{display:grid;grid-template-columns:repeat(7,1fr);gap:9px}
    .aui-color-btn{width:100%;aspect-ratio:1;border-radius:50%;border:2.5px solid white;box-shadow:0 3px 10px rgba(14,47,62,.15);cursor:pointer;position:relative;transition:transform .18s,box-shadow .18s}
    .aui-color-btn:hover{transform:scale(1.12);box-shadow:0 5px 14px rgba(14,47,62,.25)}
    .aui-color-btn.active{outline:2.5px solid var(--accent);outline-offset:2px}
    .aui-custom-color-wrap{grid-column:span 7;display:flex;align-items:center;gap:10px;margin-top:4px;padding:9px 12px;border-radius:13px;background:rgba(255,255,255,.36);border:1px solid rgba(255,255,255,.65)}
    .aui-custom-color-wrap label{font-size:12px;font-weight:650;color:#355366;flex:1}
    .aui-color-input{width:36px;height:28px;padding:0;border:1px solid rgba(255,255,255,.8);border-radius:8px;background:none;cursor:pointer}
    .aui-hex-text{font-size:12px;font-family:monospace;color:#274355;font-weight:600}

    /* 滑块与控件 */
    .aui-slider-row{display:flex;flex-direction:column;gap:5px}
    .aui-slider{width:100%;height:16px;appearance:none;-webkit-appearance:none;background:transparent;cursor:pointer}
    .aui-slider::-webkit-slider-runnable-track{height:5px;border-radius:99px;background:rgba(255,255,255,.65);box-shadow:inset 0 1px 2px rgba(0,0,0,.08)}
    .aui-slider::-webkit-slider-thumb{width:17px;height:17px;margin-top:-6px;border-radius:50%;appearance:none;-webkit-appearance:none;background:var(--accent);border:2px solid white;box-shadow:0 2px 7px rgba(15,64,82,.25);transition:transform .15s}
    .aui-slider::-webkit-slider-thumb:hover{transform:scale(1.15)}
    .aui-hint{font-size:11px;color:#678092;margin-top:-2px}

    /* 快捷功能按钮组 */
    .aui-btn-group{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .aui-btn{height:40px;padding:0 13px;border-radius:12px;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.4);box-shadow:inset 0 1px white,0 3px 10px rgba(22,66,85,.06);color:#214459;font:650 12px inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:all .18s}
    .aui-btn:hover{background:rgba(255,255,255,.72);transform:translateY(-1px);box-shadow:inset 0 1px white,0 5px 14px rgba(22,66,85,.12)}
    .aui-btn.primary{grid-column:span 2;color:white;border-color:rgba(255,255,255,.5);background:var(--accent-gradient);box-shadow:0 6px 18px var(--accent-glow),inset 0 1px rgba(255,255,255,.45)}
    .aui-btn.primary:hover{filter:brightness(1.05)}

    /* 复选框/开关 */
    .aui-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:13px;background:rgba(255,255,255,.36);border:1px solid rgba(255,255,255,.65);cursor:pointer}
    .aui-toggle-row span{font-size:13px;font-weight:650;color:#274558}
    .aui-toggle-row input{width:18px;height:18px;accent-color:var(--accent);cursor:pointer}

    .aui-foot{padding:16px 22px;border-top:1px solid rgba(255,255,255,.5);display:flex;gap:10px}
    .aui-foot .aui-btn{flex:1}

    /* 隐藏状态 */
    #akn-player.hidden-by-ui-settings{display:none!important}
  `;
  document.head.appendChild(style);

  // 预设主题色列表
  const presetColors = [
    { name: '默认湖蓝', hex: '#087f8c' },
    { name: '翡翠碧绿', hex: '#0d9488' },
    { name: '星空湛蓝', hex: '#2563eb' },
    { name: '晨曦珊瑚', hex: '#ea580c' },
    { name: '幻夜紫罗', hex: '#7c3aed' },
    { name: '樱花粉红', hex: '#db2777' },
    { name: '极简暗灰', hex: '#334155' }
  ];

  // 构建抽屉 DOM 结构
  const backdrop = document.createElement('div');
  backdrop.id = 'akn-ui-backdrop';

  const drawer = document.createElement('aside');
  drawer.id = 'akn-ui-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', '自定义界面设置');

  drawer.innerHTML = `
    <header class="aui-head">
      <div class="aui-title">
        <span class="aui-title-icon">🎨</span>
        <div>
          <h3>自定义界面风格</h3>
          <small>快捷键：Ctrl + U 或 F4</small>
        </div>
      </div>
      <button class="aui-close" id="aui-btn-close" type="button" title="关闭" aria-label="关闭">×</button>
    </header>

    <div class="aui-body">
      <!-- 1. 主题色 -->
      <section class="aui-section">
        <div class="aui-sec-head">
          <span class="aui-sec-title">🎨 主题强调色</span>
          <span class="aui-val-badge" id="aui-color-name">湖蓝</span>
        </div>
        <div class="aui-colors" id="aui-color-presets">
          ${presetColors.map(c => `<button class="aui-color-btn" type="button" data-color="${c.hex}" data-name="${c.name}" style="background:${c.hex}" title="${c.name}"></button>`).join('')}
          <div class="aui-custom-color-wrap">
            <label for="aui-custom-color">自定义取色：</label>
            <span class="aui-hex-text" id="aui-hex-display">#087F8C</span>
            <input class="aui-color-input" id="aui-custom-color" type="color" value="${settings.accent_color}">
          </div>
        </div>
      </section>

      <!-- 2. 毛玻璃质感 -->
      <section class="aui-section">
        <div class="aui-sec-head">
          <span class="aui-sec-title">🪟 毛玻璃模糊度</span>
          <span class="aui-val-badge" id="aui-blur-val">${settings.glass_blur}px</span>
        </div>
        <div class="aui-slider-row">
          <input class="aui-slider" id="aui-slider-blur" type="range" min="0" max="40" step="1" value="${settings.glass_blur}">
          <div class="aui-hint">0px 为纯透，40px 为强磨砂质感</div>
        </div>
      </section>

      <section class="aui-section">
        <div class="aui-sec-head">
          <span class="aui-sec-title">❄️ 卡片不透明度</span>
          <span class="aui-val-badge" id="aui-opacity-val">${Math.round(settings.glass_opacity * 100)}%</span>
        </div>
        <div class="aui-slider-row">
          <input class="aui-slider" id="aui-slider-opacity" type="range" min="0.15" max="0.85" step="0.01" value="${settings.glass_opacity}">
          <div class="aui-hint">数值越大卡片底色越实，文本对比度更高</div>
        </div>
      </section>

      <section class="aui-section">
        <div class="aui-sec-head">
          <span class="aui-sec-title">🌓 背景遮罩深度</span>
          <span class="aui-val-badge" id="aui-dim-val">${Math.round(settings.bg_dim * 100)}%</span>
        </div>
        <div class="aui-slider-row">
          <input class="aui-slider" id="aui-slider-dim" type="range" min="0" max="0.75" step="0.01" value="${settings.bg_dim}">
          <div class="aui-hint">背景图片过亮或反差大时，建议调高遮罩暗度</div>
        </div>
      </section>

      <!-- 3. 背景管理 -->
      <section class="aui-section">
        <div class="aui-sec-head">
          <span class="aui-sec-title">🖼️ 背景与壁纸管理</span>
        </div>
        <div class="aui-btn-group">
          <button class="aui-btn" id="aui-btn-change-bg" type="button">🖼️ 更换背景图片/视频</button>
          <button class="aui-btn" id="aui-btn-reset-bg" type="button">🔄 恢复默认壁纸</button>
        </div>
        <input id="aui-global-bg-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/ogg" style="display:none!important">
      </section>

      <!-- 4. 常驻音乐播放器开关 -->
      <section class="aui-section">
        <label class="aui-toggle-row">
          <span>🎵 显示常驻音乐播放器</span>
          <input id="aui-chk-player" type="checkbox" ${settings.show_player ? 'checked' : ''}>
        </label>
      </section>
    </div>

    <footer class="aui-foot">
      <button class="aui-btn" id="aui-btn-reset" type="button">🔄 恢复默认风格</button>
      <button class="aui-btn primary" id="aui-btn-done" type="button">✓ 完成</button>
    </footer>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  // 元素选择器缓存
  const elBlurSlider = drawer.querySelector('#aui-slider-blur');
  const elBlurVal = drawer.querySelector('#aui-blur-val');
  const elOpacitySlider = drawer.querySelector('#aui-slider-opacity');
  const elOpacityVal = drawer.querySelector('#aui-opacity-val');
  const elDimSlider = drawer.querySelector('#aui-slider-dim');
  const elDimVal = drawer.querySelector('#aui-dim-val');
  const elCustomColor = drawer.querySelector('#aui-custom-color');
  const elHexDisplay = drawer.querySelector('#aui-hex-display');
  const elColorName = drawer.querySelector('#aui-color-name');
  const elColorPresets = drawer.querySelectorAll('.aui-color-btn');
  const elChkPlayer = drawer.querySelector('#aui-chk-player');
  const elGlobalBgFile = drawer.querySelector('#aui-global-bg-file');

  // 同步面板表单控件显示
  const syncFormValues = () => {
    elBlurSlider.value = String(settings.glass_blur);
    elBlurVal.textContent = `${settings.glass_blur}px`;

    elOpacitySlider.value = String(settings.glass_opacity);
    elOpacityVal.textContent = `${Math.round(settings.glass_opacity * 100)}%`;

    elDimSlider.value = String(settings.bg_dim);
    elDimVal.textContent = `${Math.round(settings.bg_dim * 100)}%`;

    elCustomColor.value = settings.accent_color;
    elHexDisplay.textContent = settings.accent_color.toUpperCase();

    const matched = presetColors.find(c => c.hex.toLowerCase() === settings.accent_color.toLowerCase());
    elColorName.textContent = matched ? matched.name : '自定义';
    elColorPresets.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color.toLowerCase() === settings.accent_color.toLowerCase());
    });

    elChkPlayer.checked = Boolean(settings.show_player);
  };

  syncFormValues();

  // 保存设置防抖函数
  let saveTimer = null;
  const triggerSave = () => {
    applySettings(settings);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      api?.save_ui_settings?.(settings).catch(() => {});
    }, 280);
  };

  // 面板打开与关闭
  const openPanel = () => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  };

  const closePanel = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
  };

  const togglePanel = () => {
    if (drawer.classList.contains('open')) closePanel();
    else openPanel();
  };

  // 暴露全局调用接口
  window.__aknOpenUiPanel = openPanel;
  window.__aknCloseUiPanel = closePanel;
  window.__aknToggleUiPanel = togglePanel;

  // 绑定基础事件
  backdrop.addEventListener('click', closePanel);
  drawer.querySelector('#aui-btn-close').addEventListener('click', closePanel);
  drawer.querySelector('#aui-btn-done').addEventListener('click', closePanel);

  // 预设主题色点击
  elColorPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      settings.accent_color = btn.dataset.color;
      syncFormValues();
      triggerSave();
    });
  });

  // 自定义颜色选择
  elCustomColor.addEventListener('input', e => {
    settings.accent_color = e.target.value;
    syncFormValues();
    triggerSave();
  });

  // 模糊度滑块
  elBlurSlider.addEventListener('input', e => {
    settings.glass_blur = Number(e.target.value);
    elBlurVal.textContent = `${settings.glass_blur}px`;
    triggerSave();
  });

  // 透明度滑块
  elOpacitySlider.addEventListener('input', e => {
    settings.glass_opacity = Number(e.target.value);
    elOpacityVal.textContent = `${Math.round(settings.glass_opacity * 100)}%`;
    triggerSave();
  });

  // 遮罩暗度滑块
  elDimSlider.addEventListener('input', e => {
    settings.bg_dim = Number(e.target.value);
    elDimVal.textContent = `${Math.round(settings.bg_dim * 100)}%`;
    triggerSave();
  });

  // 播放器开关
  elChkPlayer.addEventListener('change', e => {
    settings.show_player = e.target.checked;
    triggerSave();
  });

  // 恢复默认风格
  drawer.querySelector('#aui-btn-reset').addEventListener('click', async () => {
    settings = Object.assign({}, defaultSettings);
    syncFormValues();
    applySettings(settings);
    if (api?.reset_ui_settings) {
      await api.reset_ui_settings();
    }
  });

  // 背景更换逻辑
  drawer.querySelector('#aui-btn-change-bg').addEventListener('click', () => {
    // 若在登录页且已有裁切器，优先唤醒登录页裁切选择
    const loginFileInput = document.getElementById('background-file');
    if (loginFileInput) {
      loginFileInput.click();
      closePanel();
      return;
    }
    // 成绩页直接使用全局背景选择
    elGlobalBgFile.click();
  });

  // 全局背景文件选择响应（主要服务成绩页）
  elGlobalBgFile.addEventListener('change', async () => {
    const file = elGlobalBgFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;
      try {
        await api?.save_background?.(dataUrl);
        // 更新当前页面背景
        const gradePage = document.getElementById('fjnu-grades');
        const gradeVideo = document.getElementById('fjnu-grades-video');
        if (dataUrl.startsWith('data:video/')) {
          if (gradeVideo) {
            gradeVideo.src = dataUrl;
            gradeVideo.style.display = 'block';
            gradeVideo.play().catch(() => {});
          }
          if (gradePage) gradePage.style.backgroundImage = 'none';
        } else {
          if (gradeVideo) gradeVideo.style.display = 'none';
          if (gradePage) gradePage.style.backgroundImage = `url("${dataUrl}")`;
        }
      } catch (err) {
        alert('背景设置失败：' + (err.message || err));
      }
    };
    reader.readAsDataURL(file);
    elGlobalBgFile.value = '';
    closePanel();
  });

  // 恢复默认背景
  drawer.querySelector('#aui-btn-reset-bg').addEventListener('click', async () => {
    if (confirm('确定恢复默认背景壁纸吗？')) {
      try {
        const defaultUri = await api?.reset_background?.();
        const gradePage = document.getElementById('fjnu-grades');
        const gradeVideo = document.getElementById('fjnu-grades-video');
        const loginScene = document.querySelector('.scene');
        const loginVideo = document.getElementById('scene-video');

        if (gradeVideo) gradeVideo.style.display = 'none';
        if (loginVideo) loginVideo.style.display = 'none';

        if (gradePage && defaultUri) gradePage.style.backgroundImage = `url("${defaultUri}")`;
        if (loginScene && defaultUri) loginScene.style.backgroundImage = `url("${defaultUri}")`;
      } catch (e) {}
    }
  });

  // 全局按键监听：Ctrl + U 或 F4
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey && e.key.toLowerCase() === 'u') || e.key === 'F4') {
      e.preventDefault();
      togglePanel();
    } else if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closePanel();
    }
  });

  // 自动挂接各页面的触发按键（防重绑）
  const attachTriggers = () => {
    // 1. 登录页独立「自定义 UI」按键
    let uiBtn = document.getElementById('ui-customize-btn');
    const bgCustBtn = document.getElementById('background-customize');
    if (!uiBtn && bgCustBtn) {
      uiBtn = document.createElement('button');
      uiBtn.id = 'ui-customize-btn';
      uiBtn.className = 'action-btn';
      uiBtn.type = 'button';
      uiBtn.title = '自定义界面风格 (Ctrl+U / F4)';
      uiBtn.innerHTML = '<span style="font-size:16px;">🎨</span><span>自定义 UI</span>';
      bgCustBtn.parentNode.insertBefore(uiBtn, bgCustBtn.nextSibling);
    }
    if (uiBtn && !uiBtn.__aknBound) {
      uiBtn.__aknBound = true;
      uiBtn.onclick = e => {
        e.preventDefault();
        openPanel();
      };
    }

    // 2. 成绩页按键
    const gradeHeader = document.querySelector('.fg-top');
    const refreshBtn = document.getElementById('fg-refresh');
    if (gradeHeader && refreshBtn && !document.getElementById('fg-ui-settings-btn')) {
      const uiBtn = document.createElement('button');
      uiBtn.id = 'fg-ui-settings-btn';
      uiBtn.className = 'fg-refresh';
      uiBtn.type = 'button';
      uiBtn.title = '自定义界面风格 (Ctrl+U / F4)';
      uiBtn.innerHTML = '🎨';
      uiBtn.style.marginRight = '8px';
      uiBtn.onclick = () => openPanel();
      refreshBtn.parentNode.insertBefore(uiBtn, refreshBtn);
    }
  };

  // 页面加载完成后立即尝试挂接，并观察 DOM
  attachTriggers();
  new MutationObserver(attachTriggers).observe(document.body, { childList: true, subtree: true });
})();
