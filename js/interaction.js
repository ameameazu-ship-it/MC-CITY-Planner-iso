// interaction.js

var tool = 'draw';
var isPointerDown    = false;
var lastC=-1, lastR=-1;
var stampedSet       = new Set();
var stampStartC=-1,  stampStartR=-1;
var longPressTimer   = null, lpC=-1, lpR=-1;

// ── Stamp mode ────────────────────────────────────────────────────
var stampMode     = false;
var STAMP_LONG_MS = 550;
var stampLPTimer  = null;
var undoPushed    = false;

// ── Pinch ─────────────────────────────────────────────────────────
var isPinching = false;
var pinch0=0, pinchZoom0=1, pinchPanX0=0, pinchPanY0=0;
var pinchMid0X=0, pinchMid0Y=0;

// ── Touch draw threshold ──────────────────────────────────────────
var touchDrawStarted=false, touchStartX=0, touchStartY=0;
var DRAW_THRESHOLD=10;

// ── Pan ───────────────────────────────────────────────────────────
var isPanMode=false, isPanning=false;
var _lastMouseX=0, _lastMouseY=0;

// ── Group / Merge ─────────────────────────────────────────────────
var groupMap = {};   // gid -> { cells:[{c,r},...] }
var nextGid  = 1;

// IDの末尾数字を除いた「種別」を返す
// house1,house2,house3 → "house"
// apt1,apt2            → "apt"
// road,water           → "road","water"（数字なし→そのまま）
function mergeId(id){
  return id.replace(/\d+$/, '');
}

// 同種ブロックか（バリアント番号違いも同種）
function sameKind(idA, idB){
  return mergeId(idA) === mergeId(idB);
}

// ── Undo/Redo ─────────────────────────────────────────────────────
var undoStack=[], redoStack=[], MAX_UNDO=60;

function snapCells(){
  return {
    cells:    JSON.parse(JSON.stringify(cells)),
    groupMap: JSON.parse(JSON.stringify(groupMap)),
    nextGid:  nextGid
  };
}
function pushUndo(){
  undoStack.push(snapCells());
  if(undoStack.length>MAX_UNDO) undoStack.shift();
  redoStack=[]; updateUndoBtns();
}
function undo(){
  if(!undoStack.length) return;
  redoStack.push(snapCells());
  var snap=undoStack.pop();
  cells=snap.cells; groupMap=snap.groupMap; nextGid=snap.nextGid;
  updateUndoBtns(); scheduleRender();
}
function redo(){
  if(!redoStack.length) return;
  undoStack.push(snapCells());
  var snap=redoStack.pop();
  cells=snap.cells; groupMap=snap.groupMap; nextGid=snap.nextGid;
  updateUndoBtns(); scheduleRender();
}
function updateUndoBtns(){
  var u=document.getElementById('btn-undo'), r=document.getElementById('btn-redo');
  if(u) u.disabled=!undoStack.length;
  if(r) r.disabled=!redoStack.length;
}

// ── Merge logic ───────────────────────────────────────────────────
// ブロックを置いた/消した後に呼ぶ。
// 最大 2×2 まで同種ブロックをグループ化する。
function recomputeGroups(c, r){
  var cell = getCell(c, r);
  if(!cell) return;
  var id = cell.id;

  // 道路・flood系はグループ化しない
  if(isRoad(id) || isFlood(id)) return;

  // 試す矩形候補（大きい順）
  // [minC, minR, w, h]
  var tries = [
    [c,   r,   2, 2], [c-1, r,   2, 2],
    [c,   r-1, 2, 2], [c-1, r-1, 2, 2],
    [c,   r,   2, 1], [c-1, r,   2, 1],
    [c,   r,   1, 2], [c,   r-1, 1, 2]
  ];

  var best=null, bestGids=null;

  for(var ti=0; ti<tries.length; ti++){
    var t=tries[ti];
    var minC=t[0], minR=t[1], w=t[2], h=t[3];
    if(minC<0||minR<0||minC+w>COLS||minR+h>ROWS) continue;

    var ok=true, cellList=[], hasCenter=false, involvedGids={};

    for(var dc=0; dc<w&&ok; dc++){
      for(var dr=0; dr<h&&ok; dr++){
        var mc = getCell(minC+dc, minR+dr);
        // ★ sameKind() で house1/house2 も同種と判定
        if(!mc || !sameKind(mc.id, id)){
          ok=false; break;
        }
        if(mc.gid) involvedGids[mc.gid]=1;
        cellList.push({c:minC+dc, r:minR+dr});
        if(minC+dc===c && minR+dr===r) hasCenter=true;
      }
    }
    if(!ok || !hasCenter || cellList.length<=1) continue;

    // 既存グループより大きい候補のみ採用
    var maxInv=0;
    Object.keys(involvedGids).forEach(function(g){
      var grp=groupMap[g];
      if(grp && grp.cells.length>maxInv) maxInv=grp.cells.length;
    });
    if(maxInv>0 && cellList.length<=maxInv) continue;

    // より大きい候補を優先
    if(!best || cellList.length>best.length){
      best=cellList; bestGids=involvedGids;
    }
  }

  if(!best) return;  // 合体なし

  // 既存グループを解体
  Object.keys(bestGids).forEach(function(gid){
    var grp=groupMap[gid];
    if(grp){
      grp.cells.forEach(function(pos){
        var mc=getCell(pos.c, pos.r);
        if(mc) delete mc.gid;
      });
      delete groupMap[gid];
    }
  });

  // 新グループ形成
  var newGid='g'+(nextGid++);
  best.forEach(function(pos){
    var mc=getCell(pos.c, pos.r);
    if(mc) mc.gid=newGid;
  });
  groupMap[newGid]={ cells: best, id: id };
}

// ── Place/Erase ───────────────────────────────────────────────────
function placeCell(c, r){
  if(!inGrid(c,r)) return false;
  var k  = ck(c,r);
  var rid= resolveId(selectedId);

  // 同じIDが既にあればスキップ
  if(cells[k] && cells[k].id===rid) return false;

  // 既存セルのグループを解体
  _dissolveGroup(c, r);

  cells[k] = {id:rid, dir:'none'};
  triggerBlockAnim(c, r);
  recomputeGroups(c, r);
  scheduleRender();
  return true;
}

function eraseCell(c, r){
  if(!inGrid(c,r)) return;
  var k=ck(c,r);
  if(!cells[k]) return;
  _dissolveGroup(c, r);
  delete cells[k];
  scheduleRender();
}

// gid がついているセルのグループを解体するヘルパー
function _dissolveGroup(c, r){
  var mc = getCell(c, r);
  if(!mc || !mc.gid) return;
  var grp = groupMap[mc.gid];
  if(grp){
    grp.cells.forEach(function(pos){
      var m=getCell(pos.c, pos.r);
      if(m) delete m.gid;
    });
    delete groupMap[mc.gid];
  }
}

function clearAllCells(){
  cells={}; groupMap={}; nextGid=1;
  scheduleRender();
}

function floodFill(c, r){
  if(!inGrid(c,r)) return;
  var targetId=(cells[ck(c,r)]||{}).id||'__empty__';
  if(targetId===selectedId) return;
  pushUndo();
  var queue=[[c,r]], visited=new Set();
  while(queue.length){
    var cur=queue.shift(), kk=ck(cur[0],cur[1]);
    if(visited.has(kk)) continue; visited.add(kk);
    if(!inGrid(cur[0],cur[1])) continue;
    if(((cells[kk]||{}).id||'__empty__')!==targetId) continue;
    cells[kk]={id:resolveId(selectedId), dir:'none'};
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(function(d){ queue.push([cur[0]+d[0],cur[1]+d[1]]); });
  }
  visited.forEach(function(kk){
    var p=kk.split(','); recomputeGroups(parseInt(p[0]), parseInt(p[1]));
  });
  scheduleRender();
}

// ── Sound & Vibrate ──────────────────────────────────────────────
var _audioCtx=null, _didPlace=false, _placeCount=0;

function _getAudioCtx(){
  if(!_audioCtx){
    try{ _audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; }
  }
  if(_audioCtx.state==='suspended') _audioCtx.resume();
  return _audioCtx;
}
function _mcPlaceSound(pitchMult){
  if(!soundOn) return;
  var ctx=_getAudioCtx(); if(!ctx) return;
  pitchMult=pitchMult||1.0;
  try{
    var t=ctx.currentTime;
    var out=ctx.createGain(); out.gain.setValueAtTime(1.0,t); out.connect(ctx.destination);
    var bufSize=Math.floor(ctx.sampleRate*0.035);
    var buf=ctx.createBuffer(1,bufSize,ctx.sampleRate);
    var data=buf.getChannelData(0);
    for(var i=0;i<bufSize;i++) data[i]=(Math.random()*2-1);
    var noise=ctx.createBufferSource(); noise.buffer=buf;
    var hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1800*pitchMult; hp.Q.value=0.8;
    var ng=ctx.createGain(); ng.gain.setValueAtTime(0.18,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.03);
    noise.connect(hp); hp.connect(ng); ng.connect(out); noise.start(t); noise.stop(t+0.035);
    var body=ctx.createOscillator(); body.type='sine';
    body.frequency.setValueAtTime(600*pitchMult,t); body.frequency.exponentialRampToValueAtTime(300*pitchMult,t+0.04);
    var bg=ctx.createGain(); bg.gain.setValueAtTime(0.14,t); bg.gain.exponentialRampToValueAtTime(0.001,t+0.04);
    body.connect(bg); bg.connect(out); body.start(t); body.stop(t+0.04);
  }catch(e){}
}
function _playSingleSound(){ _mcPlaceSound(0.92+Math.random()*0.16); }
var _stampPitches=[1.00,1.05,0.97,1.08,0.95,1.03,1.10,0.98];
function _playStampSound(){ _mcPlaceSound(_stampPitches[_placeCount%_stampPitches.length]); }
function _playAndVibe(){
  if(stampMode){ _playStampSound(); _placeCount++; if(vibeOn&&navigator.vibrate) navigator.vibrate(8); }
  else{ _playSingleSound(); _placeCount=0; if(vibeOn&&navigator.vibrate) navigator.vibrate(18); }
}
function vibrateShort(){ if(vibeOn&&navigator.vibrate) navigator.vibrate(18); }
function vibrateLong(){  if(vibeOn&&navigator.vibrate) navigator.vibrate(30); }

// ── Coords ────────────────────────────────────────────────────────
function clientToCell(cx,cy){
  var r=gc.getBoundingClientRect();
  return screenToCell(cx-r.left, cy-r.top);
}
function ptDist(a,b){ var dx=a.clientX-b.clientX,dy=a.clientY-b.clientY; return Math.sqrt(dx*dx+dy*dy); }
function ptMid(a,b){ return {x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2}; }

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
  gc.style.cursor=isPanning?'grabbing':(isPanMode?'grab':'crosshair');
}

// ── Pan mode toggle ───────────────────────────────────────────────
function togglePanMode(){
  isPanMode=!isPanMode;
  var btn=document.getElementById('btn-center');
  if(btn) btn.classList.toggle('on',isPanMode);
  updateCursor();
}

// ── Init ──────────────────────────────────────────────────────────
function initInteraction(){
  var wrap=document.getElementById('canvas-wrap');
  wrap.addEventListener('touchstart', onTouchStart, {passive:false});
  wrap.addEventListener('touchmove',  onTouchMove,  {passive:false});
  wrap.addEventListener('touchend',   onTouchEnd,   {passive:false});
  wrap.addEventListener('touchcancel',onTouchEnd,   {passive:false});
  wrap.addEventListener('mousedown',  onMouseDown);
  window.addEventListener('mousemove',onWindowMouseMove);
  window.addEventListener('mouseup',  onWindowMouseUp);
  wrap.addEventListener('wheel', onWheel, {passive:false});

  document.getElementById('btn-undo').addEventListener('click',undo);
  document.getElementById('btn-redo').addEventListener('click',redo);
  document.getElementById('btn-zi').addEventListener('click',function(){ zoomAround(cw/2,ch/2,1.2); scheduleRender(); });
  document.getElementById('btn-zo').addEventListener('click',function(){ zoomAround(cw/2,ch/2,0.83); scheduleRender(); });
  document.getElementById('btn-center').addEventListener('click',togglePanMode);
  document.getElementById('tool-draw').addEventListener('click',  function(){ setTool('draw'); });
  document.getElementById('tool-erase').addEventListener('click', function(){ setTool('erase'); });
  document.getElementById('tool-fill').addEventListener('click',  function(){ setTool('fill'); });
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
  if(tool==='draw'){
    stampMode=false;
    stampLPTimer=setTimeout(function(){
      stampMode=true;
      if(vibeOn&&navigator.vibrate) navigator.vibrate([30,60,30]);
      _playAndVibe(); stampLPTimer=null;
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
  if(stampMode) stampedSet=new Set();
  _didPlace=false;
  handleDraw(cell.c,cell.r);
  if(_didPlace) _playAndVibe();
  _didPlace=false;
}

function onTouchEnd(e){
  e.preventDefault();
  if(isPinching){
    if(e.touches.length<2){ isPinching=false; isPointerDown=false; touchDrawStarted=false; hoverC=-1; hoverR=-1; scheduleRender(); }
    return;
  }
  cancelLongPress();
  if(stampLPTimer){ clearTimeout(stampLPTimer); stampLPTimer=null; }
  _didPlace=false;
  if(isPointerDown){
    if(!touchDrawStarted&&!stampMode) handleDraw(stampStartC,stampStartR);
    commitStamp();
  }
  if(_didPlace) _playAndVibe();
  _didPlace=false;
  if(!stampMode) _placeCount=0;
  isPointerDown=false; touchDrawStarted=false; stampMode=false; _placeCount=0;
  hoverC=-1; hoverR=-1; scheduleRender();
}

// ── Mouse ─────────────────────────────────────────────────────────
function onMouseDown(e){
  if(e.button===1||(e.button===0&&isPanMode)){
    e.preventDefault();
    isPanning=true; _lastMouseX=e.clientX; _lastMouseY=e.clientY;
    updateCursor(); return;
  }
  if(e.button!==0) return;
  var cell=clientToCell(e.clientX,e.clientY);
  if(tool==='fill'){ pushUndo(); floodFill(cell.c,cell.r); return; }
  isPointerDown=true; stampStartC=cell.c; stampStartR=cell.r;
  stampedSet=new Set();
  handleDraw(cell.c,cell.r);
  if(tool==='draw'){
    stampMode=false;
    stampLPTimer=setTimeout(function(){
      stampMode=true;
      if(vibeOn&&navigator.vibrate) navigator.vibrate([30,60,30]);
      _playAndVibe(); stampLPTimer=null;
    }, STAMP_LONG_MS);
  }
}

function onWindowMouseMove(e){
  if(isPanning){
    var dx=e.clientX-_lastMouseX, dy=e.clientY-_lastMouseY;
    panX+=dx*0.55; panY+=dy*0.55;
    _lastMouseX=e.clientX; _lastMouseY=e.clientY;
    render(); return;
  }
  var rect=gc.getBoundingClientRect();
  var inside=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
  if(!inside){
    if(hoverC>=0){ hoverC=-1; hoverR=-1; scheduleRender(); }
    if(isPointerDown){ commitStamp(); isPointerDown=false; }
    return;
  }
  var cell=clientToCell(e.clientX,e.clientY);
  hoverC=cell.c; hoverR=cell.r;
  if(isPointerDown){
    if(stampMode) stampedSet=new Set();
    _didPlace=false;
    handleDraw(cell.c,cell.r);
    if(_didPlace) _playAndVibe();
    _didPlace=false;
  }
  scheduleRender();
}

function onWindowMouseUp(e){
  if(stampLPTimer){ clearTimeout(stampLPTimer); stampLPTimer=null; }
  stampMode=false;
  if(isPanning){ isPanning=false; updateCursor(); return; }
  _didPlace=false;
  if(isPointerDown) commitStamp();
  if(_didPlace) _playAndVibe();
  _didPlace=false; _placeCount=0; isPointerDown=false;
}

function onWheel(e){
  e.preventDefault();
  var rect=gc.getBoundingClientRect();
  zoomAround(e.clientX-rect.left, e.clientY-rect.top, e.deltaY<0?1.05:0.96);
  scheduleRender();
}

// ── Draw logic ────────────────────────────────────────────────────
function handleDraw(c, r){
  if(!inGrid(c,r)) return;
  var k=ck(c,r);
  if(tool==='draw'&&!stampMode&&stampedSet.size>=1) return;
  if(stampedSet.has(k)) return;
  stampedSet.add(k);
  if(!undoPushed){ pushUndo(); undoPushed=true; }
  var placed=false;
  if(tool==='draw')        placed=placeCell(c,r);
  else if(tool==='erase'){ eraseCell(c,r); placed=true; }
  if(placed) _didPlace=true;
  lastC=c; lastR=r;
}
function commitStamp(){ stampedSet=new Set(); undoPushed=false; }
function cancelLongPress(){ if(longPressTimer){ clearTimeout(longPressTimer); longPressTimer=null; } }
