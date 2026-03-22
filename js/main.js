// main.js
// App entry point: canvas setup, resize handling, DOMContentLoaded init.

function resizeCanvas(){
  var wrap = document.getElementById('canvas-wrap');
  cw = wrap.clientWidth;
  ch = wrap.clientHeight;
  gc.width = cw; gc.height = ch;
  ov.width = cw; ov.height = ch;
  scheduleRender();
}

function init(){
  gc    = document.getElementById('gc');
  ov    = document.getElementById('ov');
  gctx  = gc.getContext('2d');
  octx  = ov.getContext('2d');
  cw    = gc.clientWidth;
  ch    = gc.clientHeight;
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

  // 夜間モード デフォルトON
  nightMode = true;
  var nightBtn = document.getElementById('settings-night');
  if(nightBtn){
    nightBtn.classList.add('on');
    nightBtn.textContent = 'ON';
  }
  document.body.classList.add('night-mode');

  // First render
  scheduleRender();

  window.addEventListener('resize', resizeCanvas);
}

document.addEventListener('DOMContentLoaded', init);
