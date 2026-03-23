// interaction.js
// Handles all pointer input: draw/erase/fill, pinch zoom, two-finger pan,
// long-press context menu, undo/redo stack.

var tool = 'draw';
var isPointerDown = false;
var lastC=-1, lastR=-1;
var stampedSet = new Set();
var stampStartC=-1, stampStartR=-1;
var longPressTimer=null, lpC=-1, lpR=-1;

// ── Pinch state（非増分方式：ズレなし）──────────────────────────────
var isPinching    = false;
var pinch0        = 0;          // 開始時の指間距離
var pinchZoom0    = 1;          // 開始時のzoom
var pinchPanX0    = 0;          // 開始時のpanX
var pinchPanY0    = 0;          // 開始時のpanY
var pinchMid0X    = 0;          // 開始時の指中点（canvas座標）
var pinchMid0Y    = 0;

// ── Touch draw state（意図しない設置を防ぐ）───────────────────────
var touchDrawStarted = false;   // 閾値を超えてから描画開始
var touchStartX      = 0;       // タッチ開始位置（ページ座標）
var touchStartY      = 0;
var DRAW_THRESHOLD   = 10;      // px：これ以上動いたらドラッグ描画

// ── PC パンモード（btn-center を転用）─────────────────────────────
var isPanMode  = false;         // パンモードON/OFF
var isPanning  = false;
var panStartX  = 0, panStartY  = 0;
var panStartPX = 0, panStartPY = 0;

var undoStack=[], redoStack=[];
var MAX_UNDO=60;

// ── Undo / Redo ───────────────────────────────────────────────────
function snapCells(){ return JSON.parse(JSON.stringify(cells)); }

function pushUndo(){
  undoStack.push(snapCells());
  if(undoStack.length>MAX_UNDO) undoStack.shift();
  redoStack=[];
  updateUndoBtns();
}

function undo(){
  if(!undoStack.length) return;
  redoStack.push(snapCells());
  cells=undoStack.pop();
  updateUndoBtns();
  scheduleRender();
}

function redo(){
  if(!redoStack.length) return;
  undoStack.push(snapCells());
  cells=redoStack.pop();
  updateUndoBtns();
  scheduleRender();
}

function updateUndoBtns(){
  var u=document.getElementById('btn-undo'), r=document.getElementById('btn-redo');
  if(u) u.disabled=!undoStack.length;
  if(r) r.disabled=!redoStack.length;
}

// ── Place / Erase ─────────────────────────────────────────────────
function placeCell(c,r){
  if(!inGrid(c,r)) return;
  var k=ck(c,r);
  var rid=resolveId(selectedId);
  if(cells[k] && cells[k].id===rid) return;
  cells[k]={ id:rid, dir:'none' };
  if(soundOn) playPlaceSound();
  scheduleRender();
}

function eraseCell(c,r){
  if(!inGrid(c,r)) return;
  var k=ck(c,r);
  if(!cells[k]) return;
  delete cells[k];
  scheduleRender();
}

function floodFill(c,r){
  if(!inGrid(c,r)) return;
  var targetId = (cells[ck(c,r)]||{}).id||'__empty__';
  if(targetId===selectedId) return;
  pushUndo();
  var queue=[[c,r]], visited=new Set();
  while(queue.length){
    var cur=queue.shift();
    var kk=ck(cur[0],cur[1]);
    if(visited.has(kk)) continue;
    visited.add(kk);
    if(!inGrid(cur[0],cur[1])) continue;
    var curId=(cells[kk]||{}).id||'__empty__';
    if(curId!==targetId) continue;
    cells[kk]={id:resolveId(selectedId),dir:'none'};
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(function(d){
      queue.push([cur[0]+d[0],cur[1]+d[1]]);
    });
  }
  scheduleRender();
}

// ── Sound ─────────────────────────────────────────────────────────
var _audioCtx = null;
var _pendingSound = false;

function _tryInitAudio(){
  if(_audioCtx) return;
  try{ _audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
}

function _doPlaySound(){
  if(!_audioCtx) return;
  try{
    var osc=_audioCtx.createOscillator(), g=_audioCtx.createGain();
    osc.connect(g); g.connect(_audioCtx.destination);
    osc.frequency.value=440+Math.random()*160;
    g.gain.setValueAtTime(0.08,_audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,_audioCtx.currentTime+0.12);
    osc.start(); osc.stop(_audioCtx.currentTime+0.12);
  }catch(e){}
}

document.addEventListener('touchend', function(){
  _tryInitAudio();
  if(_pendingSound && soundOn){ _doPlaySound(); }
  _pendingSound = false;
}, {passive:true});
document.addEventListener('mouseup', function(){
  _tryInitAudio();
  if(_pendingSound && soundOn){ _doPlaySound(); }
  _pendingSound = false;
}, {passive:true});

function playPlaceSound(){ _pendingSound = true; }

// ── Vibrate ───────────────────────────────────────────────────────
function vibrateShort(){ if(vibeOn && navigator.vibrate) navigator.vibrate(18); }
function vibrateLong(){  if(vibeOn && navigator.vibrate) navigator.vibrate(30); }

// ── Pointer event helpers ─────────────────────────────────────────
function ptToCell(e){
  var rect=gc.getBoundingClientRect();
  var sx=e.clientX-rect.left, sy=e.clientY-rect.top;
  return screenToCell(sx,sy);
}

function ptDist(t1,t2){
  var dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY;
  return Math.sqrt(dx*dx+dy*dy);
}

function ptMid(t1,t2){
  return { x:(t1.clientX+t2.clientX)/2, y:(t1.clientY+t2.clientY)/2 };
}

// ── Tool selection ────────────────────────────────────────────────
function setTool(t2){
  tool=t2;
  ['draw','erase','fill'].forEach(function(tt){
    var btn=document.getElementById('tool-'+tt);
    if(btn) btn.classList.toggle('active',tt===t2);
  });
}

// ── Pan mode toggle（btn-center 転用）────────────────────────────
function togglePanMode(){
  isPanMode = !isPanMode;
  var btn = document.getElementById('btn-center');
  if(btn) btn.classList.toggle('on', isPanMode);
  // カーソル切り替え
  if(gc) gc.style.cursor = isPanMode ? 'grab' : 'crosshair';
}

// ── Init ──────────────────────────────────────────────────────────
function initInteraction(){
  var wrap=document.getElementById('canvas-wrap');

  wrap.addEventListener('touchstart', onTouchStart, {passive:false});
  wrap.addEventListener('touchmove',  onTouchMove,  {passive:false});
  wrap.addEventListener('touchend',   onTouchEnd,   {passive:false});
  wrap.addEventListener('touchcancel',onTouchEnd,   {passive:false});

  gc.addEventListener('mousedown',  onMouseDown);
  gc.addEventListener('mousemove',  onMouseMove);   // hover用
  gc.addEventListener('mouseleave', onMouseLeave);  // hover解除用
  gc.addEventListener('wheel',      onWheel, {passive:false});
  gc.addEventListener('auxclick',   function(e){ e.preventDefault(); });
  // パン中は document レベルで追跡（canvas外に出ても止まらない）
  document.addEventListener('mousemove', onDocMouseMove);
  document.addEventListener('mouseup',   onDocMouseUp);

  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-zi').addEventListener('click', function(){
    zoomAround(cw/2,ch/2,1.2); scheduleRender();
  });
  document.getElementById('btn-zo').addEventListener('click', function(){
    zoomAround(cw/2,ch/2,0.83); scheduleRender();
  });
  // btn-center → パンモードトグルに転用
  document.getElementById('btn-center').addEventListener('click', togglePanMode);

  document.getElementById('tool-draw').addEventListener('click',  function(){ setTool('draw');  });
  document.getElementById('tool-erase').addEventListener('click', function(){ setTool('erase'); });
  document.getElementById('tool-fill').addEventListener('click',  function(){ setTool('fill');  });

  document.getElementById('sel-preview').addEventListener('click', openSheet);

  gc.style.cursor = 'crosshair';
  updateUndoBtns();
}

// ── Touch handlers ────────────────────────────────────────────────
function onTouchStart(e){
  e.preventDefault();
  var touches=e.touches;

  // ─ 2本指：ピンチ開始 ─
  if(touches.length >= 2){
    cancelLongPress();
    // 描画中だった場合はキャンセル（undo対象にしない）
    isPointerDown      = false;
    touchDrawStarted   = false;
    stampedSet         = new Set();

    var rect  = gc.getBoundingClientRect();
    var d     = ptDist(touches[0], touches[1]);
    var mid   = ptMid(touches[0], touches[1]);

    isPinching   = true;
    pinch0       = d;
    pinchZoom0   = zoom;
    pinchPanX0   = panX;
    pinchPanY0   = panY;
    pinchMid0X   = mid.x - rect.left;
    pinchMid0Y   = mid.y - rect.top;
    return;
  }

  // ─ 1本指 ─
  isPinching = false;
  var t0 = touches[0];
  touchStartX = t0.clientX;
  touchStartY = t0.clientY;

  var cell = ptToCell(t0);
  hoverC=cell.c; hoverR=cell.r;
  scheduleRender();

  if(tool==='fill'){
    pushUndo(); floodFill(cell.c,cell.r); return;
  }

  lpC=cell.c; lpR=cell.r;
  longPressTimer=setTimeout(function(){
    if(getCell(lpC,lpR)){
      vibrateLong();
      openCtxMenu(lpC,lpR,t0.clientX,t0.clientY);
    }
    longPressTimer=null;
  }, 480);

  isPointerDown    = true;
  touchDrawStarted = false;   // まだ描画しない
  stampedSet       = new Set();
  stampStartC      = cell.c;
  stampStartR      = cell.r;
  // ★ここでは handleDraw を呼ばない
}

function onTouchMove(e){
  e.preventDefault();
  var touches=e.touches;

  // ─ 2本指ピンチ ─
  if(touches.length >= 2 && isPinching){
    var rect  = gc.getBoundingClientRect();
    var d     = ptDist(touches[0], touches[1]);
    var mid   = ptMid(touches[0], touches[1]);
    var midX  = mid.x - rect.left;
    var midY  = mid.y - rect.top;

    // 非増分方式：開始時の状態から一発計算（ズレなし）
    var rawScale = d / pinch0;
    // 感度を抑える：べき乗でダンプ
    var scale    = Math.pow(rawScale, 0.75);
    var newZoom  = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchZoom0 * scale));

    // 開始時の指中点が現在の指中点に来るように pan を計算
    var zr = newZoom / pinchZoom0;
    panX = midX - (pinchMid0X - pinchPanX0) * zr;
    panY = midY - (pinchMid0Y - pinchPanY0) * zr;
    zoom = newZoom;

    scheduleRender();
    return;
  }

  cancelLongPress();
  if(!isPointerDown || touches.length !== 1) return;

  var t0  = touches[0];
  var dx  = t0.clientX - touchStartX;
  var dy  = t0.clientY - touchStartY;
  var dist= Math.sqrt(dx*dx+dy*dy);

  var cell=ptToCell(t0);
  hoverC=cell.c; hoverR=cell.r;

  // 閾値未満はまだ描画しない
  if(!touchDrawStarted && dist < DRAW_THRESHOLD){
    scheduleRender();
    return;
  }

  touchDrawStarted = true;
  handleDraw(cell.c, cell.r);
}

function onTouchEnd(e){
  e.preventDefault();

  // ピンチ終了（片方の指を離した）
  if(isPinching){
    if(e.touches.length < 2){
      isPinching       = false;
      isPointerDown    = false;
      touchDrawStarted = false;
      hoverC=-1; hoverR=-1;
      scheduleRender();
    }
    return;
  }

  cancelLongPress();

  if(isPointerDown){
    if(!touchDrawStarted){
      // タップ：その場に1個設置
      handleDraw(stampStartC, stampStartR);
    }
    commitStamp();
  }

  isPointerDown    = false;
  touchDrawStarted = false;
  hoverC=-1; hoverR=-1;
  scheduleRender();
}

// ── Mouse handlers ────────────────────────────────────────────────
function onMouseDown(e){
  // 中クリック or パンモード → パン開始
  if(e.button===1 || (e.button===0 && isPanMode)){
    e.preventDefault();
    isPanning  = true;
    panStartX  = e.clientX; panStartY  = e.clientY;
    panStartPX = panX;      panStartPY = panY;
    if(gc) gc.style.cursor = 'grabbing';
    return;
  }
  if(e.button!==0) return;

  var cell=screenToCell(e.offsetX,e.offsetY);
  if(tool==='fill'){ pushUndo(); floodFill(cell.c,cell.r); return; }
  isPointerDown=true;
  stampStartC=cell.c; stampStartR=cell.r;
  stampedSet=new Set();
  handleDraw(cell.c,cell.r);
}

function onMouseMove(e){
  // gc上のhover & 描画（パンはonDocMouseMoveが担当）
  var cell=screenToCell(e.offsetX,e.offsetY);
  hoverC=cell.c; hoverR=cell.r;
  if(isPointerDown) handleDraw(cell.c,cell.r);
  scheduleRender();
}

function onMouseUp(e){
  // gc上でのマウスアップ：描画終了のみ担当
  if(isPointerDown){ commitStamp(); }
  isPointerDown=false;
}

function onMouseLeave(e){
  // パン中はdocumentが拾うのでここでは止めない
  if(!isPanning){
    if(isPointerDown){ commitStamp(); }
    isPointerDown=false;
  }
  hoverC=-1; hoverR=-1;
  scheduleRender();
}

// ── Document-level pan handlers（canvas外でも動作）────────────────
function onDocMouseMove(e){
  if(!isPanning) return;
  panX = panStartPX + (e.clientX - panStartX) * 0.88;
  panY = panStartPY + (e.clientY - panStartY) * 0.88;
  scheduleRender();
}

function onDocMouseUp(e){
  if(!isPanning) return;
  isPanning = false;
  if(gc) gc.style.cursor = isPanMode ? 'grab' : 'crosshair';
}

function onWheel(e){
  e.preventDefault();
  var rect=gc.getBoundingClientRect();
  // 感度を下げる（1.12→1.08 / 0.89→0.93）
  var f = e.deltaY < 0 ? 1.08 : 0.93;
  zoomAround(e.clientX-rect.left, e.clientY-rect.top, f);
  scheduleRender();
}

// ── Draw logic ────────────────────────────────────────────────────
function handleDraw(c,r){
  if(!inGrid(c,r)) return;
  var k=ck(c,r);
  if(stampedSet.has(k)) return;
  stampedSet.add(k);

  if(tool==='draw'){
    if(stampedSet.size===1) pushUndo();
    placeCell(c,r);
  } else if(tool==='erase'){
    if(stampedSet.size===1) pushUndo();
    eraseCell(c,r);
  }
  lastC=c; lastR=r;
}

function commitStamp(){ stampedSet=new Set(); }

function cancelLongPress(){
  if(longPressTimer){ clearTimeout(longPressTimer); longPressTimer=null; }
}
