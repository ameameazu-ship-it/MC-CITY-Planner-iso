// main.js
// App entry point: canvas setup, resize handling, DOMContentLoaded init.

function resizeCanvas(){
  var wrap = document.getElementById('canvas-wrap');
  cw = wrap.offsetWidth;
  ch = wrap.offsetHeight;
  gc.width  = cw; gc.height  = ch;
  gc.style.width  = cw + 'px'; gc.style.height  = ch + 'px';
  ov.width  = cw; ov.height  = ch;
  ov.style.width  = cw + 'px'; ov.style.height  = ch + 'px';
  scheduleRender();
}

function init(){
  gc    = document.getElementById('gc');
  ov    = document.getElementById('ov');
  gctx  = gc.getContext('2d');
  octx  = ov.getContext('2d');
  cw    = gc.offsetWidth;
  ch    = gc.offsetHeight;
  resizeCanvas();

  // Patch drawBlock to handle roads properly (from roads-draw.js)
  patchDrawBlock();

  // Register nature draw functions
  registerNatureFns();

  // Initial pan: centre the grid
  zoom = DEFAULT_ZOOM;
  panX = 0; panY = 0;
  centerView();

  // Init subsystems
  initUI();
  initInteraction();

  // 夜間モード デフォルトOFF
  nightMode = false;
  var nightBtn = document.getElementById('settings-night');
  if(nightBtn){
    nightBtn.classList.remove('on');
    nightBtn.textContent = 'OFF';
  }
  document.body.classList.remove('night-mode');

  // First render：dirty初期値がtrueのためscheduleRenderが機能しない問題を回避
  dirty = false;
  scheduleRender();

  window.addEventListener('resize', resizeCanvas);
}

document.addEventListener('DOMContentLoaded', init);
