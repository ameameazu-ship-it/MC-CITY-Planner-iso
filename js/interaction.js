// interaction.js

var tool = 'draw';
var isPointerDown    = false;
var lastC=-1, lastR=-1;
var stampedSet       = new Set();
var stampStartC=-1,  stampStartR=-1;
var longPressTimer   = null, lpC=-1, lpR=-1;

// ── Stamp mode（長押しで連続配置ON）─────────────────────────────
var stampMode        = false;   // 長押しで解放された連続配置モード
var STAMP_LONG_MS    = 550;     // 長押し判定 ms（コンテキストより少し短め）
var stampLPTimer     = null;    // スタンプ用長押しタイマー
var undoPushed       = false;   // 1配置セッションで1回だけpushUndoを呼ぶフラグ

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
  triggerBlockAnim(c,r);
  scheduleRender();
  return true; // 実際に置けた
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

// ── Sound & Vibrate ──────────────────────────────────────────────
var _audioCtx   = null;
var _didPlace   = false;
var _placeCount = 0;    // 連続配置カウント（音のピッチに使う）

function _getAudioCtx(){
  if(!_audioCtx){
    try{ _audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; }
  }
  if(_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

// 単発配置音：コツン（短く乾いた木の音）
function _playSingleSound(){
  if(!soundOn) return;
  var ctx = _getAudioCtx(); if(!ctx) return;
  try{
    var t = ctx.currentTime;
    // 低めのパーカッシブな音（木ブロックを置く感じ）
    var osc = ctx.createOscillator();
    var g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.10);
  }catch(e){}
}

// 連続配置音：テンポよく上がっていく短い音（くどくない）
// _placeCount に応じてピッチが少し上がる（気持ちいいスケール感）
var _stampNotes = [261, 294, 330, 349, 392, 440, 494, 523]; // Cメジャースケール
function _playStampSound(){
  if(!soundOn) return;
  var ctx = _getAudioCtx(); if(!ctx) return;
  try{
    var t    = ctx.currentTime;
    var note = _stampNotes[_placeCount % _stampNotes.length];
    var osc  = ctx.createOscillator();
    var g    = ctx.createGain();
    osc.type = 'triangle';  // 柔らかい音色
    osc.frequency.setValueAtTime(note, t);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.08);
  }catch(e){}
}

function _playAndVibe(){
  if(stampMode){
    _playStampSound();
    _placeCount++;
    if(vibeOn && navigator.vibrate) navigator.vibrate(8);  // 連続は短く
  } else {
    _playSingleSound();
    _placeCount = 0;  // 単発でリセット
    if(vibeOn && navigator.vibrate) navigator.vibrate(18);
  }
}

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

  // mousedown は canvas-wrap に登録
  wrap.addEventListener('mousedown', onMouseDown);
  // mousemove / mouseup は window に登録（canvas外でも追跡）
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup',   onWindowMouseUp);
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

  // スタンプモード長押し判定（描画ツールのみ）
  if(tool==='draw'){
    stampMode=false;
    stampLPTimer=setTimeout(function(){
      stampMode=true;
      if(vibeOn&&navigator.vibrate) navigator.vibrate([30,60,30]);
      _playAndVibe();
      stampLPTimer=null;
    }, STAMP_LONG_MS);
  }
}
function onTouchMove(e){
  e.preventDefault();
  var ts=e.touches;
  if(ts.length>=2&&isPinching){
    var rect=gc.getBoundingClientRect(), d=ptDist(ts[0],ts[1]), mid=ptMid(ts[0],ts[1]);
    var midX=mid.x-rect.left, midY=mid.y-rect.top;
    var newZoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,pinchZoom0*Math.pow(d/pinch0,0.50)));
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
  touchDrawStarted=true;
  if(stampMode) stampedSet = new Set();
  _didPlace = false;
  handleDraw(cell.c,cell.r);
  if(_didPlace) _playAndVibe();
  _didPlace = false;
}
function onTouchEnd(e){
  e.preventDefault();
  if(isPinching){ if(e.touches.length<2){ isPinching=false; isPointerDown=false; touchDrawStarted=false; hoverC=-1; hoverR=-1; scheduleRender(); } return; }
  cancelLongPress();
  if(stampLPTimer){ clearTimeout(stampLPTimer); stampLPTimer=null; }
  _didPlace = false;
  if(isPointerDown){
    if(!touchDrawStarted&&!stampMode){
      handleDraw(stampStartC,stampStartR);
    }
    commitStamp();
  }
  // ここは確実に touchend（gesture）内 → 音・バイブを鳴らす
  if(_didPlace) _playAndVibe();
  _didPlace = false;
  if(!stampMode) _placeCount=0;
  isPointerDown=false; touchDrawStarted=false; stampMode=false; _placeCount=0; hoverC=-1; hoverR=-1; scheduleRender();
}

// ── Mouse ────────────────────────────────────────────────────────
// 差分方式（delta）で pan を実装
var _lastMouseX = 0, _lastMouseY = 0;

function onMouseDown(e){
  // パンモード or 中クリック → pan 開始
  if(e.button===1 || (e.button===0 && isPanMode)){
    e.preventDefault();
    isPanning   = true;
    _lastMouseX = e.clientX;
    _lastMouseY = e.clientY;
    updateCursor();
    return;
  }
  if(e.button!==0) return;
  // 描画
  var cell=clientToCell(e.clientX,e.clientY);
  if(tool==='fill'){ pushUndo(); floodFill(cell.c,cell.r); return; }
  isPointerDown=true; stampStartC=cell.c; stampStartR=cell.r;
  stampedSet=new Set();
  // 最初の1個を置く
  handleDraw(cell.c,cell.r);
  // スタンプモード長押し判定
  if(tool==='draw'){
    stampMode = false;
    stampLPTimer = setTimeout(function(){
      stampMode = true;
      if(vibeOn && navigator.vibrate) navigator.vibrate([30,60,30]);
      _playAndVibe();
      stampLPTimer = null;
    }, STAMP_LONG_MS);
  }
}

function onWindowMouseMove(e){
  if(isPanning){
    var dx = e.clientX - _lastMouseX;
    var dy = e.clientY - _lastMouseY;
    panX += dx * 0.55;
    panY += dy * 0.55;
    _lastMouseX = e.clientX;
    _lastMouseY = e.clientY;
    render();   // 直接呼び出しで確実に再描画
    return;
  }
  // hover・描画（canvas内のみ）
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
  if(isPointerDown){
    if(stampMode) stampedSet = new Set();
    _didPlace = false;
    handleDraw(cell.c,cell.r);
    if(_didPlace) _playAndVibe();
    _didPlace = false;
  }
  scheduleRender();
}

function onWindowMouseUp(e){
  if(stampLPTimer){ clearTimeout(stampLPTimer); stampLPTimer=null; }
  stampMode=false;
  if(isPanning){
    isPanning=false;
    updateCursor();
    return;
  }
  _didPlace = false;
  if(isPointerDown){ commitStamp(); }
  // mouseup も gesture → 音・バイブ
  if(_didPlace) _playAndVibe();
  _didPlace = false;
  _placeCount = 0;
  isPointerDown=false;
}

function onWheel(e){
  e.preventDefault();
  var rect=gc.getBoundingClientRect();
  zoomAround(e.clientX-rect.left, e.clientY-rect.top, e.deltaY<0?1.05:0.96);
  scheduleRender();
}

// ── Draw logic ────────────────────────────────────────────────────
function handleDraw(c,r){
  if(!inGrid(c,r)) return;
  var k=ck(c,r);
  if(tool==='draw' && !stampMode && stampedSet.size >= 1) return;
  if(stampedSet.has(k)) return;
  stampedSet.add(k);
  if(!undoPushed){ pushUndo(); undoPushed=true; }
  var placed = false;
  if(tool==='draw')        placed = placeCell(c,r);
  else if(tool==='erase'){ eraseCell(c,r); placed=true; }
  if(placed) _didPlace = true;  // gesture側で音・バイブを鳴らすためのフラグ
  lastC=c; lastR=r;
}
function commitStamp(){ stampedSet=new Set(); undoPushed=false; }
function cancelLongPress(){ if(longPressTimer){ clearTimeout(longPressTimer); longPressTimer=null; } }
