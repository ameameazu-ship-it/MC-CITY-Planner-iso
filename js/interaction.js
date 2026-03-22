// interaction.js
// Handles all pointer input: draw/erase/fill, pinch zoom, two-finger pan,
// long-press context menu, undo/redo stack.

var tool = 'draw';
var isPointerDown = false;
var lastC=-1, lastR=-1;
var stampedSet = new Set();
var stampStartC=-1, stampStartR=-1;
var longPressTimer=null, lpC=-1, lpR=-1;
var isPinching=false, pinch0=0, pPanX0=0, pPanY0=0, pinchMidX=0, pinchMidY=0;
var isTfPan=false, tf0X=0, tf0Y=0, tfPX0=0, tfPY0=0;
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
var _audioReady = false;

// document全体の最初のpointerdownでAudioContextをunlock（最も確実な方法）
function _unlockAudio(){
  if(_audioReady) return;
  try{
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _audioCtx.resume().then(function(){ _audioReady = true; });
  }catch(e){}
}
document.addEventListener('pointerdown', _unlockAudio, {once:true});
document.addEventListener('touchend',    _unlockAudio, {once:true});

function playPlaceSound(){
  if(!_audioReady || !_audioCtx) return;
  try {
    var osc = _audioCtx.createOscillator(), g = _audioCtx.createGain();
    osc.connect(g); g.connect(_audioCtx.destination);
    osc.frequency.value = 440 + Math.random() * 160;
    g.gain.setValueAtTime(0.08, _audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.12);
    osc.start(); osc.stop(_audioCtx.currentTime + 0.12);
  } catch(e){}
}

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

// ── Canvas pointer events ─────────────────────────────────────────
function initInteraction(){
  var wrap=document.getElementById('canvas-wrap');

  // Touch events
  wrap.addEventListener('touchstart', onTouchStart, {passive:false});
  wrap.addEventListener('touchmove',  onTouchMove,  {passive:false});
  wrap.addEventListener('touchend',   onTouchEnd,   {passive:false});
  wrap.addEventListener('touchcancel',onTouchEnd,   {passive:false});

  // Mouse events (desktop)
  gc.addEventListener('mousedown',  onMouseDown);
  gc.addEventListener('mousemove',  onMouseMove);
  gc.addEventListener('mouseup',    onMouseUp);
  gc.addEventListener('mouseleave', onMouseUp);
  gc.addEventListener('wheel',      onWheel, {passive:false});

  // Toolbar buttons
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-zi').addEventListener('click', function(){ zoomAround(cw/2,ch/2,1.25); scheduleRender(); });
  document.getElementById('btn-zo').addEventListener('click', function(){ zoomAround(cw/2,ch/2,0.8);  scheduleRender(); });
  document.getElementById('btn-center').addEventListener('click', function(){ centerView(); scheduleRender(); });

  document.getElementById('tool-draw').addEventListener('click',  function(){ setTool('draw');  });
  document.getElementById('tool-erase').addEventListener('click', function(){ setTool('erase'); });
  document.getElementById('tool-fill').addEventListener('click',  function(){ setTool('fill');  });

  // sel-preview click → open sheet
  document.getElementById('sel-preview').addEventListener('click', openSheet);

  updateUndoBtns();
}

// ── Touch handlers ────────────────────────────────────────────────
function onTouchStart(e){
  e.preventDefault();
  var touches=e.touches;

  if(touches.length===2){
    cancelLongPress();
    isPointerDown=false;
    var d=ptDist(touches[0],touches[1]);
    var mid=ptMid(touches[0],touches[1]);
    var rect=gc.getBoundingClientRect();
    pinchMidX=mid.x-rect.left; pinchMidY=mid.y-rect.top;
    pinch0=d; pPanX0=panX; pPanY0=panY;
    isPinching=true; isTfPan=true;
    tf0X=mid.x; tf0Y=mid.y; tfPX0=panX; tfPY0=panY;
    return;
  }

  isPinching=false; isTfPan=false;
  var t0=touches[0];
  var cell=ptToCell(t0);
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
  },480);

  isPointerDown=true;
  stampStartC=cell.c; stampStartR=cell.r;
  stampedSet=new Set();
  handleDraw(cell.c,cell.r);
}

function onTouchMove(e){
  e.preventDefault();
  var touches=e.touches;

  if(touches.length===2 && isPinching){
    var d=ptDist(touches[0],touches[1]);
    var mid=ptMid(touches[0],touches[1]);
    var rect=gc.getBoundingClientRect();
    var mx=mid.x-rect.left, my=mid.y-rect.top;
    zoomAround(pinchMidX,pinchMidY, d/pinch0);
    pinch0=d;
    panX=tfPX0+(mid.x-tf0X);
    panY=tfPY0+(mid.y-tf0Y);
    tf0X=mid.x; tf0Y=mid.y; tfPX0=panX; tfPY0=panY;
    scheduleRender();
    return;
  }

  cancelLongPress();
  if(!isPointerDown || touches.length!==1) return;
  var cell=ptToCell(touches[0]);
  hoverC=cell.c; hoverR=cell.r;
  handleDraw(cell.c,cell.r);
}

function onTouchEnd(e){
  e.preventDefault();
  isPinching=false; isTfPan=false;
  cancelLongPress();
  if(isPointerDown){ commitStamp(); }
  isPointerDown=false;
  hoverC=-1; hoverR=-1;
  scheduleRender();
}

// ── Mouse handlers ────────────────────────────────────────────────
function onMouseDown(e){
  if(e.button!==0) return;
  var cell=screenToCell(e.offsetX,e.offsetY);
  if(tool==='fill'){ pushUndo(); floodFill(cell.c,cell.r); return; }
  isPointerDown=true;
  stampStartC=cell.c; stampStartR=cell.r;
  stampedSet=new Set();
  handleDraw(cell.c,cell.r);
}

function onMouseMove(e){
  var cell=screenToCell(e.offsetX,e.offsetY);
  hoverC=cell.c; hoverR=cell.r;
  if(isPointerDown) handleDraw(cell.c,cell.r);
  scheduleRender();
}

function onMouseUp(e){
  if(isPointerDown){ commitStamp(); }
  isPointerDown=false;
}

function onWheel(e){
  e.preventDefault();
  var rect=gc.getBoundingClientRect();
  var f=e.deltaY<0?1.12:0.89;
  zoomAround(e.clientX-rect.left,e.clientY-rect.top,f);
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
