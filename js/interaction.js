// interaction.js
var tool='draw',isPointerDown=false,lastC=-1,lastR=-1;
var stampedSet=new Set(),stampStartC=-1,stampStartR=-1;
var longPressTimer=null,lpC=-1,lpR=-1;
var stampMode=false,STAMP_LONG_MS=550,stampLPTimer=null,undoPushed=false;
var dragMoveKey=null,dragMoveOrigin=null,dragMoveMode=false,DRAG_THRESHOLD=8;
var dragHighlightKey=null;
var isPinching=false,pinch0=0,pinchZoom0=1,pinchPanX0=0,pinchPanY0=0,pinchMid0X=0,pinchMid0Y=0;
var touchDrawStarted=false,touchStartX=0,touchStartY=0,DRAW_THRESHOLD=10;
var isPanMode=false,isPanning=false,_lastMouseX=0,_lastMouseY=0;
var touchPanActive=false,touchPanLastX=0,touchPanLastY=0;
var groupMap={},nextGid=1;
function mergeId(id){return id.replace(/\d+$/,'');}
function sameKind(a,b){return mergeId(a)===mergeId(b);}

// Undo/Redo
var undoStack=[],redoStack=[],MAX_UNDO=60;
function snapCells(){return{cells:JSON.parse(JSON.stringify(cells)),groupMap:JSON.parse(JSON.stringify(groupMap)),nextGid:nextGid};}
function pushUndo(){undoStack.push(snapCells());if(undoStack.length>MAX_UNDO)undoStack.shift();redoStack=[];updateUndoBtns();}
function undo(){if(!undoStack.length)return;redoStack.push(snapCells());var s=undoStack.pop();cells=s.cells;groupMap=s.groupMap;nextGid=s.nextGid;updateUndoBtns();scheduleRender();}
function redo(){if(!redoStack.length)return;undoStack.push(snapCells());var s=redoStack.pop();cells=s.cells;groupMap=s.groupMap;nextGid=s.nextGid;updateUndoBtns();scheduleRender();}
function updateUndoBtns(){var u=document.getElementById('btn-undo'),r=document.getElementById('btn-redo');if(u)u.disabled=!undoStack.length;if(r)r.disabled=!redoStack.length;}

// Merge
function recomputeGroups(c,r){
  var cell=getCell(c,r);if(!cell)return;
  var id=cell.id;if(isRoad(id)||isFlood(id))return;
  var tries=[[c,r,2,2],[c-1,r,2,2],[c,r-1,2,2],[c-1,r-1,2,2],[c,r,2,1],[c-1,r,2,1],[c,r,1,2],[c,r-1,1,2]];
  var best=null,bestGids=null;
  for(var ti=0;ti<tries.length;ti++){
    var t=tries[ti],minC=t[0],minR=t[1],w=t[2],h=t[3];
    if(minC<0||minR<0||minC+w>COLS||minR+h>ROWS)continue;
    var ok=true,cellList=[],hasCenter=false,involvedGids={};
    for(var dc=0;dc<w&&ok;dc++)for(var dr=0;dr<h&&ok;dr++){
      var mc=getCell(minC+dc,minR+dr);
      if(!mc||!sameKind(mc.id,id)){ok=false;break;}
      if(mc.gid)involvedGids[mc.gid]=1;
      cellList.push({c:minC+dc,r:minR+dr});
      if(minC+dc===c&&minR+dr===r)hasCenter=true;
    }
    if(!ok||!hasCenter||cellList.length<=1)continue;
    var maxInv=0;Object.keys(involvedGids).forEach(function(g){var grp=groupMap[g];if(grp&&grp.cells.length>maxInv)maxInv=grp.cells.length;});
    if(maxInv>0&&cellList.length<=maxInv)continue;
    if(!best||cellList.length>best.length){best=cellList;bestGids=involvedGids;}
  }
  if(!best)return;
  Object.keys(bestGids).forEach(function(gid){var grp=groupMap[gid];if(grp){grp.cells.forEach(function(p){var m=getCell(p.c,p.r);if(m)delete m.gid;});delete groupMap[gid];}});
  var ng='g'+(nextGid++);best.forEach(function(p){var m=getCell(p.c,p.r);if(m)m.gid=ng;});groupMap[ng]={cells:best,id:id};
  var bbox2={w:best.reduce(function(mx,p){return Math.max(mx,p.c);},best[0].c)-best.reduce(function(mn,p){return Math.min(mn,p.c);},best[0].c)+1,h:best.reduce(function(mx,p){return Math.max(mx,p.r);},best[0].r)-best.reduce(function(mn,p){return Math.min(mn,p.r);},best[0].r)+1};
  if(typeof triggerGroupFormed==='function')triggerGroupFormed(ng,bbox2.w+'×'+bbox2.h,best);
}
function _dissolveGroup(c,r){var mc=getCell(c,r);if(!mc||!mc.gid)return;var grp=groupMap[mc.gid];if(grp){grp.cells.forEach(function(p){var m=getCell(p.c,p.r);if(m)delete m.gid;});delete groupMap[mc.gid];}}
function clearAllCells(){cells={};groupMap={};nextGid=1;scheduleRender();}

// ── 修正1: 既存ブロックへの上書きを禁止 ─────────────────────────
// cells[k] が存在する場合はツールに関わらず配置不可。
// 「消す」で削除してから配置する運用に統一。
function placeCell(c,r){
  if(!inGrid(c,r))return false;
  var k=ck(c,r),rid=resolveId(selectedId);
  if(cells[k])return false;           // ← 変更点: 既存ブロックがあれば配置しない
  cells[k]={id:rid,dir:'none'};
  triggerBlockAnim(c,r);
  recomputeGroups(c,r);
  scheduleRender();
  return true;
}

function eraseCell(c,r){if(!inGrid(c,r))return;var k=ck(c,r);if(!cells[k])return;_dissolveGroup(c,r);delete cells[k];scheduleRender();}
function floodFill(c,r){
  if(!inGrid(c,r))return;
  var targetId=(cells[ck(c,r)]||{}).id||'__empty__';if(targetId===selectedId)return;
  pushUndo();var queue=[[c,r]],visited=new Set();
  while(queue.length){var cur=queue.shift(),kk=ck(cur[0],cur[1]);if(visited.has(kk))continue;visited.add(kk);if(!inGrid(cur[0],cur[1]))continue;if(((cells[kk]||{}).id||'__empty__')!==targetId)continue;cells[kk]={id:resolveId(selectedId),dir:'none'};[[0,-1],[0,1],[-1,0],[1,0]].forEach(function(d){queue.push([cur[0]+d[0],cur[1]+d[1]]);});}
  visited.forEach(function(kk){var p=kk.split(',');recomputeGroups(parseInt(p[0]),parseInt(p[1]));});scheduleRender();
}

// Drag Move
var dragTargetValid=false;
var dragTargetCells=[];

function _checkDragTarget(toC,toR){
  dragTargetCells=[];dragTargetValid=false;
  if(!dragMoveKey)return;
  var sp=dragMoveKey.split(','),srcC=parseInt(sp[0]),srcR=parseInt(sp[1]);
  var srcCell=getCell(srcC,srcR);if(!srcCell)return;
  var dc=toC-srcC,dr=toR-srcR,moveCells=[],gid=srcCell.gid;
  if(gid&&groupMap[gid])moveCells=groupMap[gid].cells.map(function(p){return{c:p.c,r:p.r};});
  else moveCells=[{c:srcC,r:srcR}];
  var destCells=moveCells.map(function(p){return{c:p.c+dc,r:p.r+dr};});
  dragTargetCells=destCells;
  for(var i=0;i<destCells.length;i++){if(!inGrid(destCells[i].c,destCells[i].r))return;}
  var srcKeys={};moveCells.forEach(function(p){srcKeys[ck(p.c,p.r)]=1;});
  for(var i=0;i<destCells.length;i++){var dk=ck(destCells[i].c,destCells[i].r);if(!srcKeys[dk]&&cells[dk])return;}
  dragTargetValid=true;
}
function _startDragMove(k,cx,cy){dragMoveKey=k;dragMoveOrigin={x:cx,y:cy};dragMoveMode=false;dragHighlightKey=k;dragTargetCells=[];dragTargetValid=false;scheduleRender();}

function _doDragMove(toC,toR){
  if(!dragMoveKey)return;
  var sp=dragMoveKey.split(','),srcC=parseInt(sp[0]),srcR=parseInt(sp[1]);
  if(toC===srcC&&toR===srcR)return;
  var srcCell=getCell(srcC,srcR);if(!srcCell)return;
  var dc=toC-srcC,dr=toR-srcR,moveCells=[],gid=srcCell.gid;
  if(gid&&groupMap[gid])moveCells=groupMap[gid].cells.map(function(p){return{c:p.c,r:p.r};});
  else moveCells=[{c:srcC,r:srcR}];
  for(var i=0;i<moveCells.length;i++)if(!inGrid(moveCells[i].c+dc,moveCells[i].r+dr))return;
  var sk={};moveCells.forEach(function(p){sk[ck(p.c,p.r)]=1;});
  for(var i=0;i<moveCells.length;i++){var dk=ck(moveCells[i].c+dc,moveCells[i].r+dr);if(!sk[dk]&&cells[dk])return;}
  var moved=moveCells.map(function(p){var k=ck(p.c,p.r),cell=cells[k];delete cells[k];return{c:p.c,r:p.r,cell:cell};});
  if(gid&&groupMap[gid])delete groupMap[gid];
  moved.forEach(function(m){cells[ck(m.c+dc,m.r+dr)]={id:m.cell.id,dir:m.cell.dir||'none'};});
  moved.forEach(function(m){recomputeGroups(m.c+dc,m.r+dr);});
  dragMoveKey=ck(srcC+dc,srcR+dr);dragHighlightKey=dragMoveKey;scheduleRender();
}
function _endDragMove(){dragMoveKey=null;dragMoveOrigin=null;dragMoveMode=false;dragHighlightKey=null;dragTargetCells=[];dragTargetValid=false;}

// Audio
var _audioCtx=null,_didPlace=false,_placeCount=0;
function _getAudioCtx(){if(!_audioCtx){try{_audioCtx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}if(_audioCtx.state==='suspended')_audioCtx.resume();return _audioCtx;}

function _mcPlaceSound(pm){
  if(!soundOn)return;var ctx=_getAudioCtx();if(!ctx)return;pm=pm||1.0;
  try{var t=ctx.currentTime,out=ctx.createGain();out.gain.setValueAtTime(1,t);out.connect(ctx.destination);
    var bs=Math.floor(ctx.sampleRate*0.035),buf=ctx.createBuffer(1,bs,ctx.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<bs;i++)d[i]=(Math.random()*2-1);
    var n=ctx.createBufferSource();n.buffer=buf;var hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800*pm;hp.Q.value=0.8;
    var ng=ctx.createGain();ng.gain.setValueAtTime(0.18,t);ng.gain.exponentialRampToValueAtTime(0.001,t+0.03);
    n.connect(hp);hp.connect(ng);ng.connect(out);n.start(t);n.stop(t+0.035);
    var b=ctx.createOscillator();b.type='sine';b.frequency.setValueAtTime(600*pm,t);b.frequency.exponentialRampToValueAtTime(300*pm,t+0.04);
    var bg=ctx.createGain();bg.gain.setValueAtTime(0.14,t);bg.gain.exponentialRampToValueAtTime(0.001,t+0.04);
    b.connect(bg);bg.connect(out);b.start(t);b.stop(t+0.04);}catch(e){}
}

function _playLongPressSound(){
  if(!soundOn)return;var ctx=_getAudioCtx();if(!ctx)return;
  try{
    var t=ctx.currentTime,out=ctx.createGain();out.gain.setValueAtTime(1,t);out.connect(ctx.destination);
    var o=ctx.createOscillator();o.type='sine';
    o.frequency.setValueAtTime(65,t);o.frequency.exponentialRampToValueAtTime(28,t+0.35);
    var g=ctx.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1.0,t+0.01);g.gain.exponentialRampToValueAtTime(0.001,t+0.40);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+0.42);
    var o2=ctx.createOscillator();o2.type='sine';
    o2.frequency.setValueAtTime(32,t);o2.frequency.exponentialRampToValueAtTime(18,t+0.30);
    var g2=ctx.createGain();
    g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(0.55,t+0.012);g2.gain.exponentialRampToValueAtTime(0.001,t+0.35);
    o2.connect(g2);g2.connect(out);o2.start(t);o2.stop(t+0.36);
    var bs=Math.floor(ctx.sampleRate*0.05),buf=ctx.createBuffer(1,bs,ctx.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<bs;i++)d[i]=(Math.random()*2-1);
    var n=ctx.createBufferSource();n.buffer=buf;
    var lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=180;
    var ng=ctx.createGain();ng.gain.setValueAtTime(0.40,t);ng.gain.exponentialRampToValueAtTime(0.001,t+0.06);
    n.connect(lp);lp.connect(ng);ng.connect(out);n.start(t);n.stop(t+0.06);
  }catch(e){}
}

function _playDropSound(){
  if(!soundOn)return;var ctx=_getAudioCtx();if(!ctx)return;
  try{
    var t=ctx.currentTime,out=ctx.createGain();out.gain.setValueAtTime(1,t);out.connect(ctx.destination);
    var o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(260,t);o.frequency.exponentialRampToValueAtTime(120,t+0.09);
    var g=ctx.createGain();g.gain.setValueAtTime(0.38,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.13);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+0.14);
    var bs=Math.floor(ctx.sampleRate*0.06),buf=ctx.createBuffer(1,bs,ctx.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<bs;i++)d[i]=(Math.random()*2-1);
    var n=ctx.createBufferSource();n.buffer=buf;
    var lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=600;
    var ng=ctx.createGain();ng.gain.setValueAtTime(0.12,t);ng.gain.exponentialRampToValueAtTime(0.001,t+0.06);
    n.connect(lp);lp.connect(ng);ng.connect(out);n.start(t);n.stop(t+0.06);
  }catch(e){}
}

function _playSingleSound(){_mcPlaceSound(0.92+Math.random()*0.16);}
var _stampPitches=[1.00,1.05,0.97,1.08,0.95,1.03,1.10,0.98];
function _playStampSound(){_mcPlaceSound(_stampPitches[_placeCount%_stampPitches.length]);}
function _playAndVibe(){if(stampMode){_playStampSound();_placeCount++;if(vibeOn&&navigator.vibrate)navigator.vibrate(8);}else{_playSingleSound();_placeCount=0;if(vibeOn&&navigator.vibrate)navigator.vibrate(18);}}
function vibrateShort(){if(vibeOn&&navigator.vibrate)navigator.vibrate(18);}
function vibrateLong(){if(vibeOn&&navigator.vibrate)navigator.vibrate(30);}

function clientToCell(cx,cy){var r=gc.getBoundingClientRect();return screenToCell(cx-r.left,cy-r.top);}
function ptDist(a,b){var dx=a.clientX-b.clientX,dy=a.clientY-b.clientY;return Math.sqrt(dx*dx+dy*dy);}
function ptMid(a,b){return{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2};}

function setTool(t2){tool=t2;['draw','erase','fill'].forEach(function(tt){var b=document.getElementById('tool-'+tt);if(b)b.classList.toggle('active',tt===t2);});}
function updateCursor(){if(!gc)return;gc.style.cursor=isPanning||touchPanActive?'grabbing':(isPanMode?'grab':'crosshair');}
function togglePanMode(){isPanMode=!isPanMode;var btn=document.getElementById('btn-center');if(btn)btn.classList.toggle('on',isPanMode);updateCursor();}

function initInteraction(){
  var wrap=document.getElementById('canvas-wrap');
  wrap.addEventListener('touchstart',onTouchStart,{passive:false});
  wrap.addEventListener('touchmove',onTouchMove,{passive:false});
  wrap.addEventListener('touchend',onTouchEnd,{passive:false});
  wrap.addEventListener('touchcancel',onTouchEnd,{passive:false});
  wrap.addEventListener('mousedown',onMouseDown);
  window.addEventListener('mousemove',onWindowMouseMove);
  window.addEventListener('mouseup',onWindowMouseUp);
  wrap.addEventListener('wheel',onWheel,{passive:false});
  document.getElementById('btn-undo').addEventListener('click',undo);
  document.getElementById('btn-redo').addEventListener('click',redo);
  document.getElementById('btn-zi').addEventListener('click',function(){zoomAround(cw/2,ch/2,1.2);scheduleRender();});
  document.getElementById('btn-zo').addEventListener('click',function(){zoomAround(cw/2,ch/2,0.83);scheduleRender();});
  document.getElementById('btn-center').addEventListener('click',togglePanMode);
  document.getElementById('tool-draw').addEventListener('click',function(){setTool('draw');});
  document.getElementById('tool-erase').addEventListener('click',function(){setTool('erase');});
  document.getElementById('tool-fill').addEventListener('click',function(){setTool('fill');});
  document.getElementById('sel-preview').addEventListener('click',openSheet);
  updateCursor();updateUndoBtns();
}

// ── 修正2: 移動モード発動時にスタンプタイマーをキャンセル ────────
function _onLongPress(c,r,clientX,clientY){
  if(!getCell(c,r))return;
  // ブロックあり → 移動モード。スタンプタイマーは不要なのでキャンセル。
  if(stampLPTimer){clearTimeout(stampLPTimer);stampLPTimer=null;}
  _playLongPressSound();
  if(vibeOn&&navigator.vibrate)navigator.vibrate(30);
  pushUndo();
  _startDragMove(ck(c,r),clientX,clientY);
  if(typeof triggerDragFlash==='function')triggerDragFlash(c,r);
  if(typeof triggerSinkAnim==='function')triggerSinkAnim(c,r);
  if(typeof triggerParticleBurst==='function')triggerParticleBurst(c,r);
}

function _onStampReady(c,r){
  if(vibeOn&&navigator.vibrate)navigator.vibrate([30,60,30]);
  _playAndVibe();
  if(typeof triggerStampBurst==='function')triggerStampBurst(c,r);
}

// ── 修正3: スタンプタイマーは空きマスのときのみ開始 ─────────────
// ブロックがあるマスを長押し → 移動モードのみ（スタンプは起動しない）
// ブロックがないマスを長押し → スタンプモードのみ（移動は_onLongPressで弾かれる）
function _startStampTimer(c,r){
  if(getCell(c,r))return;   // ← 既存ブロックあり = スタンプタイマー不要
  var _sc=c,_sr=r;
  stampLPTimer=setTimeout(function(){
    stampMode=true;
    _onStampReady(_sc,_sr);
    stampLPTimer=null;
  },STAMP_LONG_MS);
}

function onTouchStart(e){
  e.preventDefault();
  var ts=e.touches;
  if(ts.length>=2){
    cancelLongPress();isPointerDown=false;touchDrawStarted=false;
    touchPanActive=false;
    stampedSet=new Set();_endDragMove();
    var rect=gc.getBoundingClientRect(),d=ptDist(ts[0],ts[1]),mid=ptMid(ts[0],ts[1]);
    isPinching=true;pinch0=d;pinchZoom0=zoom;pinchPanX0=panX;pinchPanY0=panY;
    pinchMid0X=mid.x-rect.left;pinchMid0Y=mid.y-rect.top;
    return;
  }
  isPinching=false;
  var t0=ts[0];touchStartX=t0.clientX;touchStartY=t0.clientY;
  if(isPanMode){
    touchPanActive=true;touchPanLastX=t0.clientX;touchPanLastY=t0.clientY;
    updateCursor();return;
  }
  touchPanActive=false;
  var cell=clientToCell(t0.clientX,t0.clientY);hoverC=cell.c;hoverR=cell.r;scheduleRender();
  if(tool==='fill'){pushUndo();floodFill(cell.c,cell.r);return;}
  lpC=cell.c;lpR=cell.r;
  longPressTimer=setTimeout(function(){longPressTimer=null;_onLongPress(lpC,lpR,touchStartX,touchStartY);},480);
  isPointerDown=true;touchDrawStarted=false;stampedSet=new Set();stampStartC=cell.c;stampStartR=cell.r;
  if(tool==='draw'){
    stampMode=false;
    _startStampTimer(cell.c,cell.r);  // ← 修正3を使用
  }
}

function onTouchMove(e){
  e.preventDefault();
  var ts=e.touches;
  if(ts.length>=2&&isPinching){
    var rect=gc.getBoundingClientRect(),d=ptDist(ts[0],ts[1]),mid=ptMid(ts[0],ts[1]);
    var midX=mid.x-rect.left,midY=mid.y-rect.top;
    var nz=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,pinchZoom0*Math.pow(d/pinch0,0.50)));
    var zr=nz/pinchZoom0;
    panX=midX-(pinchMid0X-pinchPanX0)*zr;panY=midY-(pinchMid0Y-pinchPanY0)*zr;zoom=nz;scheduleRender();return;
  }
  if(touchPanActive&&ts.length===1){
    var t0=ts[0];
    var dx=t0.clientX-touchPanLastX,dy=t0.clientY-touchPanLastY;
    panX+=dx;panY+=dy;touchPanLastX=t0.clientX;touchPanLastY=t0.clientY;
    scheduleRender();return;
  }
  cancelLongPress();
  if(!isPointerDown||ts.length!==1)return;
  var t0=ts[0];
  if(dragMoveKey){
    var dx=t0.clientX-dragMoveOrigin.x,dy=t0.clientY-dragMoveOrigin.y;
    if(!dragMoveMode&&Math.sqrt(dx*dx+dy*dy)>DRAG_THRESHOLD){
      dragMoveMode=true;closeCtxMenu();
      if(stampLPTimer){clearTimeout(stampLPTimer);stampLPTimer=null;}
    }
    if(dragMoveMode){
      var cell=clientToCell(t0.clientX,t0.clientY);
      hoverC=cell.c;hoverR=cell.r;_checkDragTarget(cell.c,cell.r);_doDragMove(cell.c,cell.r);
    }
    scheduleRender();return;
  }
  var dx2=t0.clientX-touchStartX,dy2=t0.clientY-touchStartY;
  var cell=clientToCell(t0.clientX,t0.clientY);hoverC=cell.c;hoverR=cell.r;
  if(!touchDrawStarted&&Math.sqrt(dx2*dx2+dy2*dy2)<DRAW_THRESHOLD){scheduleRender();return;}
  touchDrawStarted=true;if(stampMode)stampedSet=new Set();
  _didPlace=false;handleDraw(cell.c,cell.r);if(_didPlace)_playAndVibe();_didPlace=false;
}

function onTouchEnd(e){
  e.preventDefault();
  if(touchPanActive){touchPanActive=false;updateCursor();return;}
  if(isPinching){
    if(e.touches.length<2){isPinching=false;isPointerDown=false;touchDrawStarted=false;hoverC=-1;hoverR=-1;scheduleRender();}
    return;
  }
  cancelLongPress();if(stampLPTimer){clearTimeout(stampLPTimer);stampLPTimer=null;}
  if(dragMoveKey){
    if(dragMoveMode){
      _playDropSound();if(vibeOn&&navigator.vibrate)navigator.vibrate(18);
      var _dk=dragMoveKey.split(','),_dc=parseInt(_dk[0]),_dr=parseInt(_dk[1]);
      if(typeof triggerDropFeedback==='function'){
        if(dragTargetValid)triggerDropFeedback('OK!',_dc,_dr,'#50ff70');
        else triggerDropFeedback('✕',_dc,_dr,'#ff5555');
      }
    }else{
      if(undoStack.length)undoStack.pop();updateUndoBtns();
      var parts=dragMoveKey.split(',');
      openCtxMenu(parseInt(parts[0]),parseInt(parts[1]),touchStartX,touchStartY);
    }
    _endDragMove();isPointerDown=false;touchDrawStarted=false;stampMode=false;_placeCount=0;hoverC=-1;hoverR=-1;scheduleRender();return;
  }
  _didPlace=false;
  if(isPointerDown){if(!touchDrawStarted&&!stampMode)handleDraw(stampStartC,stampStartR);commitStamp();}
  if(_didPlace)_playAndVibe();_didPlace=false;if(!stampMode)_placeCount=0;
  isPointerDown=false;touchDrawStarted=false;stampMode=false;_placeCount=0;hoverC=-1;hoverR=-1;scheduleRender();
}

function onMouseDown(e){
  if(e.button===1||(e.button===0&&isPanMode)){e.preventDefault();isPanning=true;_lastMouseX=e.clientX;_lastMouseY=e.clientY;updateCursor();return;}
  if(e.button!==0)return;
  var cell=clientToCell(e.clientX,e.clientY);
  if(tool==='fill'){pushUndo();floodFill(cell.c,cell.r);return;}
  isPointerDown=true;stampStartC=cell.c;stampStartR=cell.r;stampedSet=new Set();
  if(getCell(cell.c,cell.r)){longPressTimer=setTimeout(function(){longPressTimer=null;_onLongPress(cell.c,cell.r,e.clientX,e.clientY);},480);}
  handleDraw(cell.c,cell.r);
  if(tool==='draw'){
    stampMode=false;
    _startStampTimer(cell.c,cell.r);  // ← 修正3を使用
  }
}

function onWindowMouseMove(e){
  if(isPanning){
    var dx=e.clientX-_lastMouseX,dy=e.clientY-_lastMouseY;
    panX+=dx;panY+=dy;_lastMouseX=e.clientX;_lastMouseY=e.clientY;render();return;
  }
  var rect=gc.getBoundingClientRect();
  var inside=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
  if(dragMoveKey){
    var dx=e.clientX-dragMoveOrigin.x,dy=e.clientY-dragMoveOrigin.y;
    if(!dragMoveMode&&Math.sqrt(dx*dx+dy*dy)>DRAG_THRESHOLD){
      dragMoveMode=true;closeCtxMenu();
      if(stampLPTimer){clearTimeout(stampLPTimer);stampLPTimer=null;}
    }
    if(dragMoveMode&&inside){
      var cell=clientToCell(e.clientX,e.clientY);
      hoverC=cell.c;hoverR=cell.r;_checkDragTarget(cell.c,cell.r);_doDragMove(cell.c,cell.r);
    }
    scheduleRender();return;
  }
  if(!inside){
    if(hoverC>=0){hoverC=-1;hoverR=-1;scheduleRender();}
    if(isPointerDown){commitStamp();isPointerDown=false;}return;
  }
  var cell=clientToCell(e.clientX,e.clientY);hoverC=cell.c;hoverR=cell.r;
  if(isPointerDown){
    if(stampMode)stampedSet=new Set();
    _didPlace=false;handleDraw(cell.c,cell.r);if(_didPlace)_playAndVibe();_didPlace=false;
  }
  scheduleRender();
}

function onWindowMouseUp(e){
  cancelLongPress();if(stampLPTimer){clearTimeout(stampLPTimer);stampLPTimer=null;}stampMode=false;
  if(isPanning){isPanning=false;updateCursor();return;}
  if(dragMoveKey){
    if(dragMoveMode){
      _playDropSound();if(vibeOn&&navigator.vibrate)navigator.vibrate(18);
      var _mk=dragMoveKey.split(','),_mc=parseInt(_mk[0]),_mr=parseInt(_mk[1]);
      if(typeof triggerDropFeedback==='function'){
        if(dragTargetValid)triggerDropFeedback('OK!',_mc,_mr,'#50ff70');
        else triggerDropFeedback('✕',_mc,_mr,'#ff5555');
      }
    }else{
      if(undoStack.length)undoStack.pop();updateUndoBtns();
      var parts=dragMoveKey.split(',');
      var c=parseInt(parts[0]),r=parseInt(parts[1]);
      if(getCell(c,r))openCtxMenu(c,r,e.clientX,e.clientY);
    }
    _endDragMove();isPointerDown=false;return;
  }
  _didPlace=false;if(isPointerDown)commitStamp();if(_didPlace)_playAndVibe();_didPlace=false;_placeCount=0;isPointerDown=false;
}

function onWheel(e){e.preventDefault();var rect=gc.getBoundingClientRect();zoomAround(e.clientX-rect.left,e.clientY-rect.top,e.deltaY<0?1.05:0.96);scheduleRender();}

function handleDraw(c,r){
  if(!inGrid(c,r))return;var k=ck(c,r);
  if(tool==='draw'&&!stampMode&&stampedSet.size>=1)return;
  if(stampedSet.has(k))return;stampedSet.add(k);
  if(!undoPushed){pushUndo();undoPushed=true;}
  var placed=false;
  if(tool==='draw')placed=placeCell(c,r);
  else if(tool==='erase'){eraseCell(c,r);placed=true;}
  if(placed)_didPlace=true;lastC=c;lastR=r;
}
function commitStamp(){stampedSet=new Set();undoPushed=false;}
function cancelLongPress(){if(longPressTimer){clearTimeout(longPressTimer);longPressTimer=null;}}
