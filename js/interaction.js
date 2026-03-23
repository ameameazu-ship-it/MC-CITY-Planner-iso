// interaction.js

var tool = 'draw';
var isPointerDown    = false;
var lastC=-1, lastR=-1;
var stampedSet       = new Set();
var stampStartC=-1,  stampStartR=-1;
var longPressTimer   = null, lpC=-1, lpR=-1;

// ── Pinch ─────────────────────────────────────────────────────────
var isPinching = false;
var pinch0=0, pinchZoom0=1, pinchPanX0=0, pinchPanY0=0;
var pinchMid0X=0, pinchMid0Y=0;

// ── Touch draw threshold ──────────────────────────────────────────
var touchDrawStarted=false, touchStartX=0, touchStartY=0;
var DRAW_THRESHOLD=10;

// ── Pan ───────────────────────────────────────────────────────────
var isPanMode=false, isPanning=false;
var panStartX=0, panStartY=0, panStartPX=0, panStartPY=0;

var undoStack=[], redoStack=[], MAX_UNDO=60;

// ── Undo/Redo ─────────────────────────────────────────────────────
function snapCells(){ return JSON.parse(JSON.stringify(cells)); }
function pushUndo(){
  undoStack.push(snapCells());
  if(undoStack.length>MAX_UNDO) undoStack.shift();
  redoStack=[]; updateUndoBtns();
}
function undo(){
  if(!undoStack.length) return;
  redoStack.push(snapCells()); cells=undoStack.pop();
  updateUndoBtns(); scheduleRender();
}
function redo(){
  if(!redoStack.length) return;
  undoStack.push(snapCells()); cells=redoStack.pop();
  updateUndoBtns(); scheduleRender();
}
function updateUndoBtns(){
  var u=document.getElementById('btn-undo'),r=document.getElementById('btn-redo');
  if(u) u.disabled=!undoStack.length;
  if(r) r.disabled=!redoStack.length;
}

// ── Place/Erase ───────────────────────────────────────────────────
function placeCell(c,r){
  if(!inGrid(c,r)) return;
  var k=ck(c,r), rid=resolveId(selectedId);
  if(cells[k]&&cells[k].id===rid) return;
  cells[k]={id:rid,dir:'none'};
  if(soundOn) playPlaceSound();
  scheduleRender();
}
function eraseCell(c,r){
  if(!inGrid(c,r)) return;
  var k=ck(c,r); if(!cells[k]) return;
  delete cells[k]; scheduleRender();
}
function floodFill(c,r){
  if(!inGrid(c,r)) return;
  var targetId=(cells[ck(c,r)]||{}).id||'__empty__';
  if(targetId===selectedId) return;
  pushUndo();
  var queue=[[c,r]],visited=new Set();
  while(queue.length){
    var cur=queue.shift(),kk=ck(cur[0],cur[1]);
    if(visited.has(kk)) continue; visited.add(kk);
    if(!inGrid(cur[0],cur[1])) continue;
    if(((cells[kk]||{}).id||'__empty__')!==targetId) continue;
    cells[kk]={id:resolveId(selectedId),dir:'none'};
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(function(d){ queue.push([cur[0]+d[0],cur[1]+d[1]]); });
  }
  scheduleRender();
}

// ── Sound ─────────────────────────────────────────────────────────
var _audioCtx=null,_pendingSound=false;
function _tryInitAudio(){ if(_audioCtx) return; try{ _audioCtx=new(window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
function _doPlaySound(){
  if(!_audioCtx) return;
  try{
    var osc=_audioCtx.createOscillator(),g=_audioCtx.createGain();
    osc.connect(g); g.connect(_audioCtx.destination);
    osc.frequency.value=440+Math.random()*160;
    g.gain.setValueAtTime(0.08,_audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,_audioCtx.currentTime+0.12);
    osc.start(); osc.stop(_audioCtx.currentTime+0.12);
  }catch(e){}
}
document.addEventListener('touchend',function(){ _tryInitAudio(); if(_pendingSound&&soundOn)_doPlaySound(); _pendingSound=false; },{passive:true});
document.addEventListener('mouseup', function(){ _tryInitAudio(); if(_pendingSound&&soundOn)_doPlaySound(); _pendingSound=false; },{passive:true});
function playPlaceSound(){ _pendingSound=true; }

// ── Vibrate ───────────────────────────────────────────────────────
function vibrateShort(){ if(vibeOn&&navigator.vibrate) navigator.vibrate(18); }
function vibrateLong(){  if(vibeOn&&navigator.vibrate) navigator.vibrate(30); }

// ── Coords ────────────────────────────────────────────────────────
function clientToCell(cx,cy){
  var r=gc.getBoundingClientRect();
  return screenToCell(cx-r.left, cy-r.top);
}
function ptDist(a,b){ var dx=a.clientX-b.clientX,dy=a.clientY-b.clientY; return Math.sqrt(dx*dx+dy*dy); }
function ptMid(a,b){ return {x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}; }

// ── Tool ──────────────────────────────────────────────────────────
function setTool(t2){
  tool=t2;
  ['draw','erase','fill'].forEach(function(tt){
    var b=document.getElementById('tool-'+tt); if(b) b.classList.toggle('active',tt===t2);
  });
}

// ── Cursor ────────────────────────────────────────────────────────
function updateCursor(){
  if(!gc) return;
  gc.style.cursor = isPanning ? 'grabbing' : (isPanMode ? 'grab' : 'crosshair');
}

// ── Pan mode toggle ────────────────────────────────────────────────
function togglePanMode(){
  isPanMode=!isPanMode;
  var btn=document.getElementById('btn-center');
  if(btn) btn.classList.toggle('on',isPanMode);
  updateCursor();
}

// ── Init ──────────────────────────────────────────────────────────
function initInteraction(){
  var wrap=document.getElementById('canvas-wrap');

  // タッチ
  wrap.addEventListener('touchstart',onTouchStart,{passive:false});
  wrap.addEventListener('touchmove', onTouchMove, {passive:false});
  wrap.addEventListener('touchend',  onTouchEnd,  {passive:false});
  wrap.addEventListener('touchcancel',onTouchEnd, {passive:false});

  // マウス：全て window に登録（要素を問わず確実に動作）
  window.addEventListener('mousedown', onWindowMouseDown);
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup',   onWindowMouseUp);
  // wheel は wrap（スクロール防止のため）
  wrap.addEventListener('wheel', onWheel, {passive:false});

  // ツールバー
  document.getElementById('btn-undo').addEventListener('click',undo);
  document.getElementById('btn-redo').addEventListener('click',redo);
  document.getElementById('btn-zi').addEventListener('click',function(){ zoomAround(cw/2,ch/2,1.2); scheduleRender(); });
  document.getElementById('btn-zo').addEventListener('click',function(){ zoomAround(cw/2,ch/2,0.83); scheduleRender(); });
  document.getElementById('btn-center').addEventListener('click',togglePanMode);
  document.getElementById('tool-draw').addEventListener('click',  function(){ setTool('draw');  });
  document.getElementById('tool-erase').addEventListener('click', function(){ setTool('erase'); });
  document.getElementById('tool-fill').addEventListener('click',  function(){ setTool('fill');  });
  document.getElementById('sel-preview').addEventListener('click',openSheet);

  updateCursor();
  updateUndoBtns();
}

// ── Touch ─────────────────────────────────────────────────────────
function onTouchStart(e){
  e.preventDefault();
  var ts=e.touches;
  if(ts.length>=2){
    cancelLongPress(); isPointerDown=false; touchDrawStarted=false; stampedSet=new Set();
    var rect=gc.getBoundingClientRect(), d=ptDist(ts[0],ts[1]), mid=ptMid(ts[0],ts[1]);
    isPinching=true; pinch0=d; pinchZoom0=zoom; pinchPanX0=panX; pinchPanY0=panY;
    pinchMid0X=mid.x-rect.left; pinchMid0Y=mid.y-rect.top;
    return;
  }
  isPinching=false;
  var t0=ts[0]; touchStartX=t0.clientX; touchStartY=t0.clientY;
  var cell=clientToCell(t0.clientX,t0.clientY);
  hoverC=cell.c; hoverR=cell.r; scheduleRender();
  if(tool==='fill'){ pushUndo(); floodFill(cell.c,cell.r); return; }
  lpC=cell.c; lpR=cell.r;
  longPressTimer=setTimeout(function(){
    if(getCell(lpC,lpR)){ vibrateLong(); openCtxMenu(lpC,lpR,t0.clientX,t0.clientY); }
    longPressTimer=null;
  },480);
  isPointerDown=true; touchDrawStarted=false; stampedSet=new Set();
  stampStartC=cell.c; stampStartR=cell.r;
}
function onTouchMove(e){
  e.preventDefault();
  var ts=e.touches;
  if(ts.length>=2&&isPinching){
    var rect=gc.getBoundingClientRect(), d=ptDist(ts[0],ts[1]), mid=ptMid(ts[0],ts[1]);
    var midX=mid.x-rect.left, midY=mid.y-rect.top;
    var newZoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,pinchZoom0*Math.pow(d/pinch0,0.75)));
    var zr=newZoom/pinchZoom0;
    panX=midX-(pinchMid0X-pinchPanX0)*zr; panY=midY-(pinchMid0Y-pinchPanY0)*zr; zoom=newZoom;
    scheduleRender(); return;
  }
  cancelLongPress();
  if(!isPointerDown||ts.length!==1) return;
  var t0=ts[0], dx=t0.clientX-touchStartX, dy=t0.clientY-touchStartY;
  var cell=clientToCell(t0.clientX,t0.clientY);
  hoverC=cell.c; hoverR=cell.r;
  if(!touchDrawStarted&&Math.sqrt(dx*dx+dy*dy)<DRAW_THRESHOLD){ scheduleRender(); return; }
  touchDrawStarted=true; handleDraw(cell.c,cell.r);
}
function onTouchEnd(e){
  e.preventDefault();
  if(isPinching){ if(e.touches.length<2){ isPinching=false; isPointerDown=false; touchDrawStarted=false; hoverC=-1; hoverR=-1; scheduleRender(); } return; }
  cancelLongPress();
  if(isPointerDown){ if(!touchDrawStarted) handleDraw(stampStartC,stampStartR); commitStamp(); }
  isPointerDown=false; touchDrawStarted=false; hoverC=-1; hoverR=-1; scheduleRender();
}

// ── Mouse（全て window レベル）────────────────────────────────────
function _isOnCanvas(e){
  // クリック位置が canvas-wrap 内かどうか
  var wrap=document.getElementById('canvas-wrap');
  return wrap && wrap.contains(e.target);
}

function onWindowMouseDown(e){
  if(e.button!==0 && e.button!==1) return;

  // パンモード or 中クリック（canvas上のみ）
  if(e.button===1 || (e.button===0 && isPanMode)){
    if(!_isOnCanvas(e)) return;
    e.preventDefault();
    isPanning  = true;
    panStartX  = e.clientX;
    panStartY  = e.clientY;
    panStartPX = panX;
    panStartPY = panY;
    updateCursor();
    return;
  }

  // 描画モード（canvas上のみ）
  if(!_isOnCanvas(e)) return;
  if(e.button!==0) return;
  var cell=clientToCell(e.clientX,e.clientY);
  if(tool==='fill'){ pushUndo(); floodFill(cell.c,cell.r); return; }
  isPointerDown=true; stampStartC=cell.c; stampStartR=cell.r;
  stampedSet=new Set(); handleDraw(cell.c,cell.r);
}

function onWindowMouseMove(e){
  if(isPanning){
    panX = panStartPX + (e.clientX - panStartX) * 0.88;
    panY = panStartPY + (e.clientY - panStartY) * 0.88;
    // scheduleRenderではなくrender()直呼び（確実に再描画）
    dirty = false;
    scheduleRender();
    return;
  }
  // canvas外ならhover解除
  var rect=gc.getBoundingClientRect();
  var inside = e.clientX>=rect.left && e.clientX<=rect.right &&
               e.clientY>=rect.top  && e.clientY<=rect.bottom;
  if(!inside){
    if(hoverC>=0){ hoverC=-1; hoverR=-1; scheduleRender(); }
    if(isPointerDown){ commitStamp(); isPointerDown=false; }
    return;
  }
  var cell=clientToCell(e.clientX,e.clientY);
  hoverC=cell.c; hoverR=cell.r;
  if(isPointerDown) handleDraw(cell.c,cell.r);
  scheduleRender();
}

function onWindowMouseUp(e){
  if(isPanning){
    isPanning=false;
    updateCursor();
    return;
  }
  if(isPointerDown){ commitStamp(); }
  isPointerDown=false;
}

function onWheel(e){
  e.preventDefault();
  var rect=gc.getBoundingClientRect();
  zoomAround(e.clientX-rect.left, e.clientY-rect.top, e.deltaY<0?1.08:0.93);
  scheduleRender();
}

// ── Draw logic ────────────────────────────────────────────────────
function handleDraw(c,r){
  if(!inGrid(c,r)) return;
  var k=ck(c,r); if(stampedSet.has(k)) return;
  stampedSet.add(k);
  if(tool==='draw'){ if(stampedSet.size===1) pushUndo(); placeCell(c,r); }
  else if(tool==='erase'){ if(stampedSet.size===1) pushUndo(); eraseCell(c,r); }
  lastC=c; lastR=r;
}
function commitStamp(){ stampedSet=new Set(); }
function cancelLongPress(){ if(longPressTimer){ clearTimeout(longPressTimer); longPressTimer=null; } }
