(() => {
  if (window.__fjnuLoginGlass) return;
  window.__fjnuLoginGlass = true;

  const native = {
    button: document.querySelector('#dl'),
    username: document.querySelector('#yhm'),
    password: document.querySelector('#mm'),
    captcha: document.querySelector('#yzm'),
    captchaImage: document.querySelector('#yzmPic'),
  };
  for (const value of Object.values(native)) if (!value) return;

  const officialPage = document.createElement('div');
  officialPage.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:900px;overflow:hidden;visibility:hidden;pointer-events:none';
  while (document.body.firstChild) officialPage.appendChild(document.body.firstChild);
  document.body.appendChild(officialPage);

  const officialTips = officialPage.querySelector('#tips')?.textContent?.trim() || '';
  const normalizeServerMessage = value => /账号|帐号|用户|密码/.test(value)
    ? '账号或密码错误'
    : value;

  document.documentElement.style.background = '#d8e3e9';
  document.body.insertAdjacentHTML('beforeend', `
    <style>
      :root{color-scheme:light;--ink:#142b3c;--muted:#5d7485;--line:rgba(255,255,255,.62);--glass:rgba(242,249,252,.42);--accent:#087f8c}
      *{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:"SF Pro Display","Segoe UI","Microsoft YaHei",sans-serif;color:var(--ink);letter-spacing:0}
      body{min-height:100vh;overflow:auto;background:#d8e3e9}
      .scene{position:relative;isolation:isolate;min-height:100vh;overflow:hidden;background-color:#d8d0c5;background-image:url('__BACKGROUND_IMAGE__');background-position:center 31%;background-size:cover;background-repeat:no-repeat}
      .scene::before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(90deg,rgba(14,37,48,.14),rgba(236,240,237,.02) 52%,rgba(241,222,213,.06))}
      .scene::after{content:"";position:absolute;inset:-20%;z-index:-1;background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.24) 44%,transparent 61%);transform:translateX(-30%);animation:glide 12s ease-in-out infinite alternate;pointer-events:none}
      @keyframes glide{to{transform:translateX(28%)}}
      .glass{position:relative;overflow:hidden;border:1px solid var(--line);background:linear-gradient(145deg,rgba(255,255,255,.36),rgba(225,241,247,.14));box-shadow:0 20px 55px rgba(14,45,62,.17),inset 0 1px 0 rgba(255,255,255,.85),inset 0 -1px 0 rgba(255,255,255,.14);backdrop-filter:blur(22px) saturate(155%);-webkit-backdrop-filter:blur(22px) saturate(155%)}
      .glass::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.42),transparent 34%,transparent 68%,rgba(255,255,255,.2));mix-blend-mode:screen}
      .left-rail{position:absolute;top:24px;bottom:24px;left:24px;width:min(390px,calc(100vw - 48px));display:flex;flex-direction:column;justify-content:space-between;gap:18px}.identity{width:100%;padding:21px 24px 23px;border-radius:22px;color:white;background:linear-gradient(155deg,rgba(5,36,54,.38),rgba(8,60,72,.12));border-color:rgba(255,255,255,.42)}
      .brand{position:relative;display:flex;align-items:center;gap:14px;font-weight:700;font-size:18px;text-shadow:0 2px 12px rgba(0,0,0,.24)}
      .brand img{width:48px;height:48px;border-radius:50%;object-fit:cover;background:white;border:1px solid rgba(255,255,255,.82);box-shadow:0 8px 24px rgba(0,0,0,.15)}
      .copy{position:relative;padding:20px 0 0}.copy small{display:none}.copy h1{margin:0 0 9px;font-size:29px;line-height:1.2;font-weight:650}.copy p{max-width:310px;margin:0;color:rgba(240,252,255,.84);font-size:13px;line-height:1.55}
      .foot{display:none}.login-side{width:100%;padding:0}.login-panel{width:100%;padding:28px;border-radius:22px}
      .login-panel h2{position:relative;margin:0;font-size:27px;font-weight:650}.login-panel>p{position:relative;margin:8px 0 22px;color:var(--muted);font-size:13px}
      .field{position:relative;margin-bottom:13px}.field label{display:block;margin:0 0 6px;font-size:12px;font-weight:650;color:#304b5e}.input-shell{height:46px;border-radius:14px;border:1px solid rgba(255,255,255,.68);background:rgba(255,255,255,.26);box-shadow:inset 0 1px 0 rgba(255,255,255,.88),0 7px 20px rgba(30,71,88,.05);transition:.2s}
      .input-shell:focus-within{border-color:rgba(20,143,151,.55);box-shadow:0 0 0 4px rgba(23,147,153,.12),inset 0 1px 0 white;background:rgba(255,255,255,.56)}
      input[type=text],input[type=password]{width:100%;height:100%;border:0;background:transparent;padding:0 15px;color:var(--ink);font:15px inherit;outline:0}
      .captcha-row{display:grid;grid-template-columns:1fr 112px;gap:9px}.captcha-image{width:112px;height:46px;border-radius:14px;border:1px solid rgba(255,255,255,.68);object-fit:fill;background:rgba(255,255,255,.3);box-shadow:inset 0 1px white;cursor:pointer}.hint{margin-top:6px;color:var(--muted);font-size:11px}.remember{position:relative;display:flex;align-items:center;gap:8px;margin:17px 0;color:#405b6c;font-size:13px;cursor:pointer}.remember input{width:16px;height:16px;accent-color:var(--accent)}.submit{position:relative;width:100%;height:48px;border:1px solid rgba(255,255,255,.62);border-radius:15px;color:white;background:linear-gradient(135deg,rgba(6,139,146,.88),rgba(32,108,154,.8));box-shadow:0 11px 26px rgba(13,105,128,.21),inset 0 1px rgba(255,255,255,.44);font:700 14px inherit;cursor:pointer;transition:transform .2s,filter .2s}
      .submit:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.05)}.submit:disabled{cursor:wait;opacity:.88}
      .submit-content{display:inline-flex;align-items:center;justify-content:center;gap:10px}.spinner{display:none;width:18px;height:18px;border:2px solid rgba(255,255,255,.35);border-top-color:white;border-radius:50%;animation:spin .75s linear infinite}.submit.loading .spinner{display:block}@keyframes spin{to{transform:rotate(360deg)}}
      .message{position:relative;min-height:19px;margin-top:13px;color:#a43b35;font-size:13px;text-align:center}
      #background-file{display:none!important}
      .background-customize{position:absolute;right:24px;bottom:24px;z-index:3;height:46px;padding:0 17px;border-radius:15px;color:white;border:1px solid rgba(255,255,255,.62);background:linear-gradient(145deg,rgba(11,39,52,.42),rgba(225,241,247,.18));box-shadow:0 16px 38px rgba(14,45,62,.16),inset 0 1px rgba(255,255,255,.72);backdrop-filter:blur(22px) saturate(155%);-webkit-backdrop-filter:blur(22px) saturate(155%);font:650 13px inherit;cursor:pointer;display:flex;align-items:center;gap:9px}.background-customize:hover{background:linear-gradient(145deg,rgba(11,39,52,.52),rgba(225,241,247,.26))}.picture-icon{position:relative;width:18px;height:15px;border:1.7px solid currentColor;border-radius:3px}.picture-icon::before{content:"";position:absolute;width:4px;height:4px;right:2px;top:2px;border-radius:50%;background:currentColor}.picture-icon::after{content:"";position:absolute;left:2px;right:2px;bottom:2px;height:7px;background:linear-gradient(135deg,transparent 36%,currentColor 37% 52%,transparent 53%),linear-gradient(45deg,transparent 44%,currentColor 45% 61%,transparent 62%)}
      .background-editor{position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(10,25,34,.45);backdrop-filter:blur(14px) saturate(125%);-webkit-backdrop-filter:blur(14px) saturate(125%)}.background-editor.open{display:flex}.crop-dialog{width:min(940px,calc(100vw - 48px));max-height:calc(100vh - 48px);overflow:auto;padding:22px;border-radius:22px;color:var(--ink);background:linear-gradient(145deg,rgba(245,250,252,.74),rgba(218,235,242,.48));display:flex;flex-direction:column;gap:16px}.crop-header{position:relative;display:flex;align-items:start;justify-content:space-between;gap:18px}.crop-header h2{margin:0;font-size:22px}.crop-header p{margin:5px 0 0;color:var(--muted);font-size:12px}.crop-close{width:38px;height:38px;flex:none;border:1px solid rgba(255,255,255,.75);border-radius:12px;background:rgba(255,255,255,.35);color:#27475a;font:25px/1 inherit;cursor:pointer}.crop-stage{position:relative;flex:none;align-self:center;overflow:hidden;border-radius:15px;background:#17232a;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4);cursor:grab;touch-action:none}.crop-stage.dragging{cursor:grabbing}.crop-stage img{position:absolute;max-width:none;user-select:none;pointer-events:none}.crop-stage::after{content:"";position:absolute;inset:0;pointer-events:none;border:1px solid rgba(255,255,255,.74);border-radius:15px;box-shadow:inset 0 0 40px rgba(3,17,23,.12)}.crop-controls{position:relative;display:flex;align-items:center;gap:12px}.crop-controls label{font-size:13px;font-weight:650}.crop-controls input{flex:1;accent-color:var(--accent)}.crop-actions{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px}.crop-actions-left,.crop-actions-right{display:flex;gap:9px}.crop-button{height:42px;padding:0 16px;border-radius:13px;border:1px solid rgba(255,255,255,.7);background:rgba(255,255,255,.34);color:#294758;font:650 13px inherit;cursor:pointer}.crop-button.primary{min-width:108px;color:white;background:linear-gradient(135deg,rgba(6,139,146,.92),rgba(32,108,154,.88))}.crop-button:disabled{opacity:.62;cursor:wait}.crop-message{position:relative;min-height:17px;color:#a43b35;font-size:12px;text-align:center}
      @media(max-height:760px){.copy{display:none}.identity{padding:16px 20px}}
      @media(max-width:820px){.scene{min-height:100vh;background-position:56% 34%}.left-rail{top:14px;bottom:14px;left:14px;width:min(360px,calc(100vw - 28px))}.identity{padding:17px}.brand{font-size:15px}.brand img{width:40px;height:40px}.copy{display:none}.login-panel{padding:23px}.background-customize{right:14px;bottom:14px}.crop-dialog{width:calc(100vw - 28px);padding:16px}.crop-actions{align-items:stretch;flex-direction:column}.crop-actions-left,.crop-actions-right{display:grid;grid-template-columns:1fr 1fr}.crop-button{padding:0 11px}}
    </style>
    <main class="scene"><div class="left-rail">
      <section class="identity glass">
        <div class="brand"><img src="__UNIVERSITY_LOGO__" alt="福建师范大学校徽"><span>福建师范大学</span></div>
        <div class="copy"><small>ACADEMIC RECORD</small><h1>教务成绩查询</h1><p>连接学校官方教学管理平台，查看课程成绩、学分与绩点记录。</p></div>
        <div class="foot">教学管理信息服务平台</div>
      </section>
      <section class="login-side">
        <form class="login-panel glass" id="custom-login">
          <h2>账号登录</h2><p>使用教务系统账号继续</p>
          <div class="field"><label for="custom-username">账号</label><div class="input-shell"><input id="custom-username" type="text" autocomplete="username" required></div></div>
          <div class="field"><label for="custom-password">密码</label><div class="input-shell"><input id="custom-password" type="password" autocomplete="current-password" required></div></div>
          <div class="field"><label for="custom-captcha">验证码</label><div class="captcha-row"><div class="input-shell"><input id="custom-captcha" type="text" autocomplete="off" required></div><img id="custom-captcha-image" class="captcha-image" alt="点击刷新验证码"></div><div class="hint">点击验证码可刷新</div></div>
          <label class="remember"><input id="custom-remember" type="checkbox">记住账号和密码</label>
          <button class="submit" type="submit"><span class="submit-content"><span class="spinner"></span><span class="submit-label">登录并查询成绩</span></span></button>
          <div class="message" id="custom-message" role="alert"></div>
        </form>
      </section>
    </div><button class="background-customize" id="background-customize" type="button" title="选择并裁切自定义背景"><span class="picture-icon" aria-hidden="true"></span><span>自定义背景</span></button></main>
    <input id="background-file" type="file" accept="image/jpeg,image/png,image/webp" hidden>
    <div class="background-editor" id="background-editor" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <section class="crop-dialog glass">
        <header class="crop-header"><div><h2 id="crop-title">裁切背景图片</h2><p>拖动图片调整位置，使用滑杆或滚轮缩放</p></div><button class="crop-close" id="crop-close" type="button" title="关闭" aria-label="关闭">×</button></header>
        <div class="crop-stage" id="crop-stage"><img id="crop-image" alt="待裁切背景预览" draggable="false"></div>
        <div class="crop-controls"><label for="crop-zoom">缩放</label><input id="crop-zoom" type="range" min="1" max="3" value="1" step="0.01"></div>
        <div class="crop-message" id="crop-message" role="alert"></div>
        <footer class="crop-actions"><div class="crop-actions-left"><button class="crop-button" id="crop-reselect" type="button">重新选图</button><button class="crop-button" id="crop-reset" type="button">恢复默认</button></div><div class="crop-actions-right"><button class="crop-button" id="crop-cancel" type="button">取消</button><button class="crop-button primary" id="crop-apply" type="button">应用背景</button></div></footer>
      </section>
    </div>`);

  const username = document.querySelector('#custom-username');
  const password = document.querySelector('#custom-password');
  const captcha = document.querySelector('#custom-captcha');
  const captchaImage = document.querySelector('#custom-captcha-image');
  const remember = document.querySelector('#custom-remember');
  const submit = document.querySelector('.submit');
  const submitLabel = document.querySelector('.submit-label');
  const message = document.querySelector('#custom-message');
  const scene = document.querySelector('.scene');
  const backgroundButton = document.querySelector('#background-customize');
  const backgroundFile = document.querySelector('#background-file');
  const editor = document.querySelector('#background-editor');
  const cropStage = document.querySelector('#crop-stage');
  const cropImage = document.querySelector('#crop-image');
  const cropZoom = document.querySelector('#crop-zoom');
  const cropMessage = document.querySelector('#crop-message');
  const cropApply = document.querySelector('#crop-apply');

  if (officialTips) {
    message.textContent = normalizeServerMessage(officialTips);
    sessionStorage.removeItem('fjnu-login-pending');
  }
  let tipChecks = 0;
  const returnedTipCheck = setInterval(() => {
    const returnedMessage = officialPage.querySelector('#tips')?.textContent?.trim();
    if (returnedMessage) {
      message.textContent = normalizeServerMessage(returnedMessage);
      sessionStorage.removeItem('fjnu-login-pending');
      clearInterval(returnedTipCheck);
    } else if (++tipChecks >= 20) {
      clearInterval(returnedTipCheck);
    }
  }, 150);

  const crop = {naturalWidth:0,naturalHeight:0,baseScale:1,zoom:1,offsetX:0,offsetY:0,dragging:false,startX:0,startY:0,startOffsetX:0,startOffsetY:0};
  const clampCrop = () => {
    const width=crop.naturalWidth*crop.baseScale*crop.zoom;
    const height=crop.naturalHeight*crop.baseScale*crop.zoom;
    crop.offsetX=Math.max((cropStage.clientWidth-width)/2,Math.min((width-cropStage.clientWidth)/2,crop.offsetX));
    crop.offsetY=Math.max((cropStage.clientHeight-height)/2,Math.min((height-cropStage.clientHeight)/2,crop.offsetY));
  };
  const drawCrop = () => {
    const width=crop.naturalWidth*crop.baseScale*crop.zoom;
    const height=crop.naturalHeight*crop.baseScale*crop.zoom;
    clampCrop();
    cropImage.style.width=`${width}px`;
    cropImage.style.height=`${height}px`;
    cropImage.style.left=`${(cropStage.clientWidth-width)/2+crop.offsetX}px`;
    cropImage.style.top=`${(cropStage.clientHeight-height)/2+crop.offsetY}px`;
  };
  const sizeCropStage = () => {
    const ratio=window.innerWidth/window.innerHeight;
    const maxWidth=Math.min(860,window.innerWidth-96);
    const maxHeight=Math.min(500,window.innerHeight-320);
    let width=maxWidth;
    let height=width/ratio;
    if(height>maxHeight){height=maxHeight;width=height*ratio}
    cropStage.style.width=`${Math.max(320,width)}px`;
    cropStage.style.height=`${Math.max(205,height)}px`;
    if(crop.naturalWidth){crop.baseScale=Math.max(cropStage.clientWidth/crop.naturalWidth,cropStage.clientHeight/crop.naturalHeight);drawCrop()}
  };
  const closeEditor = () => {editor.classList.remove('open');cropMessage.textContent='';crop.dragging=false};
  const openImage = source => {
    cropImage.onload=()=>{crop.naturalWidth=cropImage.naturalWidth;crop.naturalHeight=cropImage.naturalHeight;crop.zoom=1;crop.offsetX=0;crop.offsetY=0;cropZoom.value='1';editor.classList.add('open');sizeCropStage();drawCrop()};
    cropImage.onerror=()=>{cropMessage.textContent='无法读取这张图片，请选择其他文件'};
    cropImage.src=source;
  };

  const selectBackgroundFile = () => {backgroundFile.value='';backgroundFile.click()};
  backgroundButton.addEventListener('click',selectBackgroundFile);
  backgroundFile.addEventListener('change',()=>{
    const file=backgroundFile.files?.[0];
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>30*1024*1024){message.textContent='请选择不超过 30 MB 的 JPG、PNG 或 WebP 图片';backgroundFile.value='';return}
    const reader=new FileReader();
    reader.onload=()=>openImage(reader.result);
    reader.onerror=()=>{message.textContent='读取图片失败，请重新选择'};
    reader.readAsDataURL(file);
  });
  cropStage.addEventListener('pointerdown',event=>{crop.dragging=true;crop.startX=event.clientX;crop.startY=event.clientY;crop.startOffsetX=crop.offsetX;crop.startOffsetY=crop.offsetY;cropStage.classList.add('dragging');cropStage.setPointerCapture(event.pointerId)});
  cropStage.addEventListener('pointermove',event=>{if(!crop.dragging)return;crop.offsetX=crop.startOffsetX+event.clientX-crop.startX;crop.offsetY=crop.startOffsetY+event.clientY-crop.startY;drawCrop()});
  const finishDrag=()=>{crop.dragging=false;cropStage.classList.remove('dragging')};
  cropStage.addEventListener('pointerup',finishDrag);cropStage.addEventListener('pointercancel',finishDrag);
  cropZoom.addEventListener('input',()=>{crop.zoom=Number(cropZoom.value);drawCrop()});
  cropStage.addEventListener('wheel',event=>{event.preventDefault();crop.zoom=Math.max(1,Math.min(3,crop.zoom+(event.deltaY<0?.08:-.08)));cropZoom.value=String(crop.zoom);drawCrop()},{passive:false});
  document.querySelector('#crop-close').addEventListener('click',closeEditor);
  document.querySelector('#crop-cancel').addEventListener('click',closeEditor);
  document.querySelector('#crop-reselect').addEventListener('click',selectBackgroundFile);
  document.querySelector('#crop-reset').addEventListener('click',async()=>{try{const defaultBackground=await window.pywebview?.api?.reset_background();scene.style.backgroundImage=`url('${defaultBackground}')`;backgroundFile.value='';closeEditor()}catch(error){cropMessage.textContent='恢复默认背景失败'}});
  cropApply.addEventListener('click',async()=>{
    if(!crop.naturalWidth)return;
    cropApply.disabled=true;cropApply.textContent='正在应用';cropMessage.textContent='';
    const displayScale=crop.baseScale*crop.zoom;
    const shownWidth=crop.naturalWidth*displayScale;
    const shownHeight=crop.naturalHeight*displayScale;
    const sourceX=((shownWidth-cropStage.clientWidth)/2-crop.offsetX)/displayScale;
    const sourceY=((shownHeight-cropStage.clientHeight)/2-crop.offsetY)/displayScale;
    const sourceWidth=cropStage.clientWidth/displayScale;
    const sourceHeight=cropStage.clientHeight/displayScale;
    const pixelRatio=Math.min(window.devicePixelRatio||1,2);
    const output=document.createElement('canvas');
    output.width=Math.min(2560,Math.round(window.innerWidth*pixelRatio));
    output.height=Math.round(output.width/(window.innerWidth/window.innerHeight));
    const context=output.getContext('2d',{alpha:false});
    context.drawImage(cropImage,sourceX,sourceY,sourceWidth,sourceHeight,0,0,output.width,output.height);
    const dataUrl=output.toDataURL('image/jpeg',.9);
    try{await window.pywebview?.api?.save_background(dataUrl);scene.style.backgroundImage=`url('${dataUrl}')`;backgroundFile.value='';closeEditor()}catch(error){cropMessage.textContent='保存背景失败，请重试'}finally{cropApply.disabled=false;cropApply.textContent='应用背景'}
  });
  editor.addEventListener('click',event=>{if(event.target===editor)closeEditor()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&editor.classList.contains('open'))closeEditor()});
  window.addEventListener('resize',()=>{if(editor.classList.contains('open'))sizeCropStage()});

  captchaImage.src = native.captchaImage.src;
  captchaImage.addEventListener('click', () => {
    native.captchaImage.click();
    setTimeout(() => { captchaImage.src = native.captchaImage.src; captcha.value = ''; }, 100);
  });

  window.pywebview?.api?.get_saved_credentials().then(saved => {
    if (!saved) return;
    username.value = saved.username || '';
    if (saved.password) { password.value = saved.password; remember.checked = true; }
  });

  document.querySelector('#custom-login').addEventListener('submit', async event => {
    event.preventDefault();
    if (!username.value || !password.value || !captcha.value) return;
    submit.disabled = true;
    submit.classList.add('loading');
    submitLabel.textContent = '正在登录并加载成绩';
    message.textContent = '';
    sessionStorage.setItem('fjnu-login-pending','1');
    const api = window.pywebview?.api;
    if (api) await Promise.all([
      api.save_login(username.value, password.value, remember.checked),
      api.begin_login(),
    ]);
    native.username.value = username.value;
    native.password.value = password.value;
    native.password.type = 'password';
    native.captcha.value = captcha.value;
    native.button.click();

  });
})();
