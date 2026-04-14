/**
 * iso-engine.js - with sink animation + drag flash
 */

var cells={},panX=0,panY=0,zoom=DEFAULT_ZOOM;
var nightMode=false,showGrid=true,hoverC=-1,hoverR=-1,dirty=true;
var gc,ov,gctx,octx,cw,ch;

// Block anim
var blockAnims={},ANIM_DURATION=480;
function triggerBlockAnim(c,r){blockAnims[ck(c,r)]=performance.now();_startRafLoop();}
function _popScale(t){if(t<=0)return 0;if(t>=1)return 1;if(t<0.5){var u=t/0.5;return 1.28*u*u;}else{var u=(t-0.5)/0.5;return 1.28-0.28*(1-Math.pow(1-u,3));}}
function getBlockScale(c,r){var key=ck(c,r);if(!blockAnims[key])return 1;var e=performance.now()-blockAnims[key];if(e>=ANIM_DURATION){delete blockAnims[key];return 1;}return _popScale(e/ANIM_DURATION);}

// ★ 沈み込みアニメ
// 長押し成功時：ブロックが少し下に沈んでから戻る（ゆっくり沈んで素早く戻る）
var sinkAnims={};        // ck -> startTime
var SINK_DURATION=450;   // ms
var SINK_DEPTH=0.65;     // セル高さに対する沈み込み量（約10px@zoom1.1）

function triggerSinkAnim(c,r){
  var cell=getCell(c,r);if(!cell)return;
  var targets=[];
  if(cell.gid&&typeof groupMap!=='undefined'&&groupMap[cell.gid]){
    groupMap[cell.gid].cells.forEach(function(p){targets.push(ck(p.c,p.r));});
  } else { targets.push(ck(c,r)); }
  var now=performance.now();
  targets.forEach(function(k){sinkAnims[k]=now;});
  _startRafLoop();
}

// 沈み込みオフセット（y方向ピクセル）を返す
// 0→最大沈み込み→0 の曲線（前半ゆっくり沈む、後半素早く戻る）
function getSinkOffset(c,r){
  var key=ck(c,r);if(!sinkAnims[key])return 0;
  var elapsed=performance.now()-sinkAnims[key];
  if(elapsed>=SINK_DURATION){delete sinkAnims[key];return 0;}
  var t=elapsed/SINK_DURATION;
  var offset;
  if(t<0.25){
    // 前半：素早く深く沈む（ease-in cubic）
    var u=t/0.25;
    offset=SINK_DEPTH*(u*u*u);
  } else {
    // 後半：ゆっくり戻る（ease-out quad）
    var u=(t-0.25)/0.75;
    offset=SINK_DEPTH*(1-u*u);
  }
  return offset * HH * zoom;  // ピクセル換算
}

// ★ グループ化アニメ（合体した瞬間だけ表示）
var groupFormedAnims={};       // gid -> {startTime, label, cells, id}
var GROUP_FORMED_DURATION=900; // ms：ラベルが消えるまでの時間

function triggerGroupFormed(gid, label, cells2){
  groupFormedAnims[gid]={
    startTime: performance.now(),
    label: label,
    cells: cells2.map(function(p){return{c:p.c,r:p.r};}),
    id: (cells2[0] && getCell(cells2[0].c,cells2[0].r)) ? getCell(cells2[0].c,cells2[0].r).id : ''
  };
  _startRafLoop();
}
// ★ ドロップ可否フィードバック（ふわっと上に消えるアニメ）
var dropFeedbackAnim=null;
var DROP_FEEDBACK_DURATION=700;

function triggerDropFeedback(label,c,r,color){
  var cell=getCell(c,r);
  var bh=cell&&BLOCKS[cell.id]?BLOCKS[cell.id].bh:30;
  var s=cellToScreen(c,r);
  dropFeedbackAnim={label:label,x:s.x,y:s.y-bh*zoom,color:color,startTime:performance.now()};
  _startRafLoop();
}

var dragFlashCells=[],dragFlashStart=0,FLASH_DURATION=500,FLASH_PULSES=2;
function triggerDragFlash(c,r){
  var cell=getCell(c,r);if(!cell)return;
  var targets=[];
  if(cell.gid&&typeof groupMap!=='undefined'&&groupMap[cell.gid]){
    groupMap[cell.gid].cells.forEach(function(p){targets.push({c:p.c,r:p.r});});
  } else { targets.push({c:c,r:r}); }
  dragFlashCells=targets;dragFlashStart=performance.now();_startRafLoop();
}
function _getFlashAlpha(){
  if(!dragFlashCells.length)return 0;
  var elapsed=performance.now()-dragFlashStart;
  if(elapsed>=FLASH_DURATION){dragFlashCells=[];return 0;}
  var t=elapsed/FLASH_DURATION;
  return Math.max(0,Math.sin(t*Math.PI*FLASH_PULSES))*0.80;
}

// RAF loop
var _rafLoopRunning=false;
function _startRafLoop(){if(_rafLoopRunning)return;_rafLoopRunning=true;requestAnimationFrame(_rafLoop);}
function _rafLoop(){
  var needMore=Object.keys(blockAnims).length>0||Object.keys(sinkAnims).length>0||dragFlashCells.length>0||Object.keys(groupFormedAnims).length>0||dropFeedbackAnim!==null||(typeof lpCircle!=='undefined'&&lpCircle!==null)||(typeof stampCircle!=='undefined'&&stampCircle!==null)||lpRingAnim!==null;
  dirty=true;_renderNow();
  if(needMore)requestAnimationFrame(_rafLoop);else _rafLoopRunning=false;
}

// BG theme
var bgTheme='default';
var BG_THEMES={
  'default':['#0d0d12','#05050a','#1a1a22','#10101a','rgba(255,255,255,0.13)','#0a0a2e','#04041a'],
  'grass':['#0e4020','#061a08','#2e5a30','#0c2212','rgba(255,255,255,0.12)','#061428','#030c10'],
  'desert':['#5a3010','#2e1808','#8c6030','#5a3e1a','rgba(0,0,0,0.20)','#180e28','#0c0814'],
  'snow':['#4a7aaa','#1e3a60','#7aaccc','#7aaac0','rgba(20,50,90,0.30)','#0c1e3e','#060e22'],
  'ocean':['#040e22','#020810','#0a3060','#061838','rgba(255,255,255,0.14)','#020614','#01030c'],
  'stone':['#1e1e28','#0c0c14','#48485a','#28283c','rgba(255,255,255,0.11)','#0e0e22','#06060e']
};
function getBgPalette(){return BG_THEMES[bgTheme]||BG_THEMES['default'];}

function ck(c,r){return c+','+r;}
function inGrid(c,r){return c>=0&&c<COLS&&r>=0&&r<ROWS;}
function getCell(c,r){return cells[ck(c,r)]||null;}
function cellToScreen(c,r){return{x:panX+(c-r)*HW*zoom,y:panY+(c+r)*HH*zoom};}
function screenToCell(sx,sy){var dx=(sx-panX)/(HW*zoom),dy=(sy-panY)/(HH*zoom);return{c:Math.floor((dx+dy)/2),r:Math.floor((dy-dx)/2)};}
function centerView(){var mid=cellToScreen(COLS/2,ROWS/2);panX+=cw/2-mid.x;panY+=ch/2-mid.y;}
function zoomAround(cx,cy,factor){var nz=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,zoom*factor));panX=cx-(cx-panX)*(nz/zoom);panY=cy-(cy-panY)*(nz/zoom);zoom=nz;}

function drawDiamond(ctx,x,y,fill,stroke,strokeW){var hw=HW*zoom,hh=HH*zoom;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+hw,y+hh);ctx.lineTo(x,y+hh*2);ctx.lineTo(x-hw,y+hh);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke&&strokeW!==0){ctx.strokeStyle=stroke;ctx.lineWidth=strokeW||0.5;ctx.stroke();}}
function clipDiamond(ctx,x,y){var hw=HW*zoom,hh=HH*zoom;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+hw,y+hh);ctx.lineTo(x,y+hh*2);ctx.lineTo(x-hw,y+hh);ctx.closePath();ctx.clip();}
function isoBox(ctx,x,y,bh,tc,lc,rc){var hw=HW*zoom,hh=HH*zoom,zb=bh*zoom;ctx.beginPath();ctx.moveTo(x,y-zb);ctx.lineTo(x-hw,y+hh-zb);ctx.lineTo(x-hw,y+hh*2);ctx.lineTo(x,y+hh*2);ctx.closePath();ctx.fillStyle=lc;ctx.fill();ctx.beginPath();ctx.moveTo(x,y-zb);ctx.lineTo(x+hw,y+hh-zb);ctx.lineTo(x+hw,y+hh*2);ctx.lineTo(x,y+hh*2);ctx.closePath();ctx.fillStyle=rc;ctx.fill();ctx.beginPath();ctx.moveTo(x,y-zb);ctx.lineTo(x+hw,y+hh-zb);ctx.lineTo(x,y+hh*2-zb);ctx.lineTo(x-hw,y+hh-zb);ctx.closePath();ctx.fillStyle=tc;ctx.fill();}
function isoGableEW(ctx,x,y,bh,rh,tc,lc,rc){var hw=HW*zoom,hh=HH*zoom,zb=bh*zoom,zr=rh*zoom,by=y-zb;var N={x:x,y:by},E={x:x+hw,y:by+hh},S={x:x,y:by+2*hh},W={x:x-hw,y:by+hh},RW={x:x-hw,y:by+hh-zr},RE={x:x+hw,y:by+hh-zr};ctx.beginPath();ctx.moveTo(W.x,W.y);ctx.lineTo(N.x,N.y);ctx.lineTo(RE.x,RE.y);ctx.lineTo(RW.x,RW.y);ctx.closePath();ctx.fillStyle=lc;ctx.fill();ctx.beginPath();ctx.moveTo(E.x,E.y);ctx.lineTo(S.x,S.y);ctx.lineTo(RW.x,RW.y);ctx.lineTo(RE.x,RE.y);ctx.closePath();ctx.fillStyle=rc;ctx.fill();ctx.beginPath();ctx.moveTo(N.x,N.y);ctx.lineTo(E.x,E.y);ctx.lineTo(RE.x,RE.y);ctx.closePath();ctx.fillStyle=tc;ctx.fill();ctx.beginPath();ctx.moveTo(S.x,S.y);ctx.lineTo(W.x,W.y);ctx.lineTo(RW.x,RW.y);ctx.closePath();ctx.fillStyle=tc;ctx.fill();}
function isoGableNS(ctx,x,y,bh,rh,tc,lc,rc){var hw=HW*zoom,hh=HH*zoom,zb=bh*zoom,zr=rh*zoom,by=y-zb;var N={x:x,y:by},E={x:x+hw,y:by+hh},S={x:x,y:by+2*hh},W={x:x-hw,y:by+hh},RN={x:x,y:by-zr},RS={x:x,y:by+2*hh-zr};ctx.beginPath();ctx.moveTo(W.x,W.y);ctx.lineTo(N.x,N.y);ctx.lineTo(RN.x,RN.y);ctx.lineTo(RS.x,RS.y);ctx.closePath();ctx.fillStyle=lc;ctx.fill();ctx.beginPath();ctx.moveTo(E.x,E.y);ctx.lineTo(S.x,S.y);ctx.lineTo(RS.x,RS.y);ctx.lineTo(RN.x,RN.y);ctx.closePath();ctx.fillStyle=rc;ctx.fill();ctx.beginPath();ctx.moveTo(N.x,N.y);ctx.lineTo(E.x,E.y);ctx.lineTo(RN.x,RN.y);ctx.closePath();ctx.fillStyle=tc;ctx.fill();ctx.beginPath();ctx.moveTo(S.x,S.y);ctx.lineTo(W.x,W.y);ctx.lineTo(RS.x,RS.y);ctx.closePath();ctx.fillStyle=tc;ctx.fill();}
function isoHipRoof(ctx,x,y,bh,rh,lc,rc){var hw=HW*zoom,hh=HH*zoom,zb=bh*zoom,zr=rh*zoom,by=y-zb;var N={x:x,y:by},E={x:x+hw,y:by+hh},S={x:x,y:by+2*hh},W={x:x-hw,y:by+hh},tip={x:x,y:by-zr};ctx.beginPath();ctx.moveTo(N.x,N.y);ctx.lineTo(E.x,E.y);ctx.lineTo(tip.x,tip.y);ctx.closePath();ctx.fillStyle=rc;ctx.fill();ctx.beginPath();ctx.moveTo(E.x,E.y);ctx.lineTo(S.x,S.y);ctx.lineTo(tip.x,tip.y);ctx.closePath();ctx.fillStyle=rc;ctx.fill();ctx.beginPath();ctx.moveTo(S.x,S.y);ctx.lineTo(W.x,W.y);ctx.lineTo(tip.x,tip.y);ctx.closePath();ctx.fillStyle=lc;ctx.fill();ctx.beginPath();ctx.moveTo(W.x,W.y);ctx.lineTo(N.x,N.y);ctx.lineTo(tip.x,tip.y);ctx.closePath();ctx.fillStyle=lc;ctx.fill();}
function isoCylinder(ctx,x,y,bh,r,tc,bc){var zb=bh*zoom,zr=r*zoom,hh=HH*zoom,cx2=x,cy2=y+hh;ctx.save();var grad=ctx.createLinearGradient(cx2-zr,cy2,cx2+zr,cy2);grad.addColorStop(0,shadeC(bc,0.55));grad.addColorStop(0.4,bc);grad.addColorStop(1,shadeC(bc,0.72));ctx.beginPath();ctx.ellipse(cx2,cy2-zb,zr,zr*0.5,0,0,Math.PI*2);ctx.fillStyle=tc;ctx.fill();ctx.beginPath();ctx.rect(cx2-zr,cy2-zb,zr*2,zb);ctx.fillStyle=grad;ctx.fill();ctx.beginPath();ctx.ellipse(cx2,cy2,zr,zr*0.5,0,Math.PI,0);ctx.fillStyle=shadeC(bc,0.7);ctx.fill();ctx.restore();}
function winL(ctx,x,y,zbh,u,v,wu,vh,c){var hw=HW*zoom,hh=HH*zoom,ax=x-hw,ay=y+hh;ctx.beginPath();ctx.moveTo(ax+u*hw,ay-u*hh-v*zbh);ctx.lineTo(ax+(u+wu)*hw,ay-(u+wu)*hh-v*zbh);ctx.lineTo(ax+(u+wu)*hw,ay-(u+wu)*hh-(v+vh)*zbh);ctx.lineTo(ax+u*hw,ay-u*hh-(v+vh)*zbh);ctx.closePath();ctx.fillStyle=c;ctx.fill();}
function winR(ctx,x,y,zbh,u,v,wu,vh,c){var hw=HW*zoom,hh=HH*zoom;ctx.beginPath();ctx.moveTo(x+u*hw,y+u*hh-v*zbh);ctx.lineTo(x+(u+wu)*hw,y+(u+wu)*hh-v*zbh);ctx.lineTo(x+(u+wu)*hw,y+(u+wu)*hh-(v+vh)*zbh);ctx.lineTo(x+u*hw,y+u*hh-(v+vh)*zbh);ctx.closePath();ctx.fillStyle=c;ctx.fill();}
function shadeC(hex,f){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return '#'+[r,g,b].map(function(v){return Math.round(Math.max(0,Math.min(255,v*f))).toString(16).padStart(2,'0');}).join('');}
function mixC(a,b,t){var ar=parseInt(a.slice(1,3),16),ag=parseInt(a.slice(3,5),16),ab_=parseInt(a.slice(5,7),16),br=parseInt(b.slice(1,3),16),bg=parseInt(b.slice(3,5),16),bb=parseInt(b.slice(5,7),16);return '#'+[ar+(br-ar)*t,ag+(bg-ag)*t,ab_+(bb-ab_)*t].map(function(v){return Math.round(v).toString(16).padStart(2,'0');}).join('');}
function groupBBox(c2){var minC=c2[0].c,maxC=c2[0].c,minR=c2[0].r,maxR=c2[0].r;for(var i=1;i<c2.length;i++){if(c2[i].c<minC)minC=c2[i].c;if(c2[i].c>maxC)maxC=c2[i].c;if(c2[i].r<minR)minR=c2[i].r;if(c2[i].r>maxR)maxR=c2[i].r;}return{minC:minC,maxC:maxC,minR:minR,maxR:maxR,w:maxC-minC+1,h:maxR-minR+1};}

// ★ 長押し進捗円：ブロックの上（指の上）に大きく表示
function _drawProgressCircle(obj){
  if(!obj) return false;
  var elapsed=performance.now()-obj.startTime;
  if(elapsed>=obj.duration){ return false; }
  var prog=Math.min(1,elapsed/obj.duration);
  var s=cellToScreen(obj.c,obj.r);
  // ブロックの高さ分上にずらして「指の上」に表示
  var b=BLOCKS[obj.id]||null;
  var bh=b?b.bh:30;
  var cx2=s.x;
  var cy2=s.y - bh*zoom - 18*zoom;  // ブロック屋根のさらに上
  var radius=(obj.rad||32)*zoom;
  var startAngle=-Math.PI/2;
  var endAngle=startAngle+Math.PI*2*prog;
  gctx.save();
  gctx.lineCap='round';
  // 背景リング（半透明黒）
  gctx.beginPath();gctx.arc(cx2,cy2,radius,0,Math.PI*2);
  gctx.strokeStyle='rgba(0,0,0,0.30)';gctx.lineWidth=7*zoom;gctx.stroke();
  // 進捗弧（カラー）
  if(prog>0.01){
    gctx.beginPath();gctx.arc(cx2,cy2,radius,startAngle,endAngle);
    gctx.strokeStyle=obj.color;gctx.lineWidth=5*zoom;gctx.stroke();
  }
  gctx.restore();
  return prog<1;
}

// ★ 長押し完了時：放射状に広がって消えるリングアニメ
var lpRingAnim=null;   // {x,y,startTime,color}
var LP_RING_DURATION=400;

function triggerLpRing(c,r,color){
  var b=BLOCKS[getCell(c,r)&&getCell(c,r).id]||null;
  var bh=b?b.bh:30;
  var s=cellToScreen(c,r);
  lpRingAnim={x:s.x, y:s.y-bh*zoom-18*zoom, startTime:performance.now(), color:color||'#f5c842'};
  _startRafLoop();
}

function _drawLpRing(){
  if(!lpRingAnim) return false;
  var elapsed=performance.now()-lpRingAnim.startTime;
  if(elapsed>=LP_RING_DURATION){lpRingAnim=null;return false;}
  var t=elapsed/LP_RING_DURATION;
  // 広がりながらフェードアウト
  var alpha=Math.max(0,1-t);
  var radius=(32+60*t)*zoom;
  gctx.save();
  gctx.globalAlpha=alpha;
  gctx.beginPath();gctx.arc(lpRingAnim.x,lpRingAnim.y,radius,0,Math.PI*2);
  gctx.strokeStyle=lpRingAnim.color;
  gctx.lineWidth=Math.max(1,(4*(1-t))*zoom);
  gctx.stroke();
  gctx.restore();
  return true;
}

function render(){if(!dirty)return;_renderNow();}
function _renderNow(){
  if(!gctx)return;
  gctx.clearRect(0,0,cw,ch);
  var pal=getBgPalette();
  if(nightMode){var sky=gctx.createLinearGradient(0,0,0,ch);sky.addColorStop(0,pal[5]||shadeC(pal[0],0.28));sky.addColorStop(1,pal[6]||shadeC(pal[1],0.22));gctx.fillStyle=sky;gctx.fillRect(0,0,cw,ch);}
  else{var sky2=gctx.createLinearGradient(0,0,0,ch);sky2.addColorStop(0,pal[0]);sky2.addColorStop(1,pal[1]);gctx.fillStyle=sky2;gctx.fillRect(0,0,cw,ch);}
  var tileList=[];for(var r2=0;r2<ROWS;r2++)for(var c2=0;c2<COLS;c2++)tileList.push([c2,r2]);
  tileList.sort(function(a,b){return(a[0]+a[1])-(b[0]+b[1]);});

  // Pass 1: 地面
  tileList.forEach(function(cr){
    var c=cr[0],r=cr[1],s=cellToScreen(c,r);
    var gfill=nightMode?pal[3]:pal[2];
    var ng=(bgTheme==='snow')?'rgba(30,70,120,0.35)':'rgba(255,255,255,0.09)';
    var gstroke=showGrid?(nightMode?ng:pal[4]):null;
    var gstrokeW=showGrid?0.5:0;
    if(showGrid){
      drawDiamond(gctx,s.x,s.y,gfill,gstroke,gstrokeW);
    } else {
      // グリッドOFF時：タイル間の隙間をなくすため1px大きく描画
      var hw2=HW*zoom+0.75, hh2=HH*zoom+0.75;
      gctx.beginPath();
      gctx.moveTo(s.x,    s.y);
      gctx.lineTo(s.x+hw2,s.y+hh2);
      gctx.lineTo(s.x,    s.y+hh2*2);
      gctx.lineTo(s.x-hw2,s.y+hh2);
      gctx.closePath();
      gctx.fillStyle=gfill; gctx.fill();
    }
  });

  // Pass 2: ブロック（ゴーストスキップ・固定サイズはスケーリング）
  tileList.forEach(function(cr){
    var c=cr[0],r=cr[1],cell=getCell(c,r); if(!cell) return;
    if(cell.ghost) return; // ゴーストはアンカーで描画済みのためスキップ

    var b=BLOCKS[cell.id];
    var gW=(b&&b.gridW)||1, gH=(b&&b.gridH)||1;
    var s=cellToScreen(c,r);
    var sinkY=getSinkOffset(c,r);
    var drawY=s.y+sinkY;
    var animScale=getBlockScale(c,r);

    if(gW>1||gH>1){
      // 固定サイズブロック：フットプリント中央を軸に拡大描画
      var midC=c+(gW-1)/2, midR=r+(gH-1)/2;
      var midS=cellToScreen(midC,midR);
      var blockScale=Math.sqrt(gW*gH);
      var pivotX=midS.x, pivotY=midS.y+HH*zoom+sinkY;
      gctx.save();
      gctx.translate(pivotX,pivotY);
      gctx.scale(blockScale*animScale,blockScale*animScale);
      gctx.translate(-pivotX,-pivotY);
      drawBlock(gctx,c,r,s.x,drawY,cell.id,cell.dir);
      gctx.restore();
    } else if(animScale!==1){
      var cx2=s.x,cy2=drawY+HH*zoom;
      gctx.save();gctx.translate(cx2,cy2);gctx.scale(animScale,animScale);gctx.translate(-cx2,-cy2);
      drawBlock(gctx,c,r,s.x,drawY,cell.id,cell.dir);gctx.restore();
    } else {
      drawBlock(gctx,c,r,s.x,drawY,cell.id,cell.dir);
    }
  });

  // ── Pass 3: グループ化アニメ（合体した瞬間だけラベル表示）────
  // ドラッグ中（dragMoveKey がある間）は一切表示しない
  var now3=performance.now();
  var activeFlash=false;
  var isDragging=(typeof dragMoveKey!=='undefined'&&dragMoveKey!==null);

  if(!isDragging){
    Object.keys(groupFormedAnims).forEach(function(gid){
      var anim=groupFormedAnims[gid];
    var anim=groupFormedAnims[gid];
    var elapsed=now3-anim.startTime;
    if(elapsed>=GROUP_FORMED_DURATION){ delete groupFormedAnims[gid]; return; }
    activeFlash=true;
    var t=elapsed/GROUP_FORMED_DURATION;
    // フェード：0→0.3で出現、0.3→1.0で消える
    var alpha = t<0.3 ? (t/0.3) : (1-(t-0.3)/0.7);
    alpha = Math.max(0,Math.min(1,alpha));

    // 枠（合体したセルを一瞬ゴールドで囲む）
    anim.cells.forEach(function(pos){
      var s=cellToScreen(pos.c,pos.r);
      drawDiamond(gctx,s.x,s.y,
        'rgba(245,200,66,'+(alpha*0.35)+')',
        'rgba(245,200,66,'+alpha+')', 2.5);
    });

    // ラベル（グループ中央・上に浮かび上がる）
    var cells2=anim.cells;
    var minC=cells2[0].c,maxC=cells2[0].c,minR=cells2[0].r,maxR=cells2[0].r;
    for(var i=1;i<cells2.length;i++){if(cells2[i].c<minC)minC=cells2[i].c;if(cells2[i].c>maxC)maxC=cells2[i].c;if(cells2[i].r<minR)minR=cells2[i].r;if(cells2[i].r>maxR)maxR=cells2[i].r;}
    var midC=(minC+maxC)/2, midR=(minR+maxR)/2;
    var midS=cellToScreen(midC,midR);
    // 上に浮かび上がるオフセット
    var floatY = -20*zoom * (t<0.3 ? t/0.3 : 1.0);
    var bh=BLOCKS[anim.id]?BLOCKS[anim.id].bh:30;
    var lx=midS.x, ly=midS.y-bh*zoom+floatY;
    var fs=Math.max(11,Math.min(20,zoom*15));
    gctx.save();
    gctx.globalAlpha=alpha;
    gctx.font='bold '+fs+'px sans-serif';
    gctx.textAlign='center'; gctx.textBaseline='bottom';
    var tw=gctx.measureText(anim.label).width;
    gctx.fillStyle='rgba(0,0,0,0.75)';
    gctx.fillRect(lx-tw/2-5,ly-fs-3,tw+10,fs+6);
    gctx.fillStyle='#f5c842';
    gctx.fillText(anim.label,lx,ly);
    gctx.restore();
  });
  } // end !isDragging
  if(activeFlash) _startRafLoop();

  // Pass 4: ドラッグフラッシュ
  var fa=_getFlashAlpha();
  if(fa>0&&dragFlashCells.length>0){
    dragFlashCells.forEach(function(pos){
      var s=cellToScreen(pos.c,pos.r);
      drawDiamond(gctx,s.x,s.y,'rgba(255,220,50,'+fa+')',null);
      drawDiamond(gctx,s.x,s.y,null,'rgba(255,255,255,'+(fa*0.9)+')',2.5);
    });
  }

  // ── Pass 5: ドラッグ移動先の可否表示 ─────────────────────────
  if(typeof dragMoveMode!=='undefined'&&dragMoveMode&&
     typeof dragTargetCells!=='undefined'&&dragTargetCells.length>0){
    var isValid=(typeof dragTargetValid!=='undefined')&&dragTargetValid;
    // ドラッグ中：色枠のみ（ラベルなし）
    dragTargetCells.forEach(function(pos){
      if(!inGrid(pos.c,pos.r)) return;
      var s=cellToScreen(pos.c,pos.r);
      if(isValid){
        drawDiamond(gctx,s.x,s.y,'rgba(60,220,80,0.30)','rgba(60,220,80,0.85)',2.5);
      } else {
        drawDiamond(gctx,s.x,s.y,'rgba(255,50,50,0.30)','rgba(255,50,50,0.85)',2.5);
      }
    });
  } else if(typeof dragHighlightKey!=='undefined'&&dragHighlightKey&&!(typeof dragMoveMode!=='undefined'&&dragMoveMode)){
    // ドラッグ準備中（まだ動かしていない）：オレンジハイライト
    var dp=dragHighlightKey.split(','),dhC=parseInt(dp[0]),dhR=parseInt(dp[1]);
    var dhCell=getCell(dhC,dhR),dhKeys=[];
    if(dhCell&&dhCell.gid&&typeof groupMap!=='undefined'&&groupMap[dhCell.gid])groupMap[dhCell.gid].cells.forEach(function(p){dhKeys.push({c:p.c,r:p.r});});
    else dhKeys.push({c:dhC,r:dhR});
    dhKeys.forEach(function(pos){var s=cellToScreen(pos.c,pos.r);drawDiamond(gctx,s.x,s.y,'rgba(255,200,50,0.25)','rgba(255,200,50,0.90)',2.2);});
  }

  // ── Pass 6: ドロップ後フィードバック（ふわっと上に消える）────
  if(dropFeedbackAnim){
    var dfa=dropFeedbackAnim;
    var dfElapsed=performance.now()-dfa.startTime;
    if(dfElapsed>=DROP_FEEDBACK_DURATION){
      dropFeedbackAnim=null;
    } else {
      var dft=dfElapsed/DROP_FEEDBACK_DURATION;
      // フェード＋上に浮かぶ：0→0.2で出現、0.2→1.0で消えながら上昇
      var dfAlpha=dft<0.2?(dft/0.2):(1-(dft-0.2)/0.8);
      dfAlpha=Math.max(0,dfAlpha);
      var dfFloatY=-35*zoom*dft;  // 上に35px浮かぶ
      var dfs=Math.max(14,Math.min(24,zoom*18));
      gctx.save();
      gctx.globalAlpha=dfAlpha;
      gctx.font='bold '+dfs+'px sans-serif';
      gctx.textAlign='center'; gctx.textBaseline='bottom';
      var dftw=gctx.measureText(dfa.label).width;
      var dfx=dfa.x, dfy=dfa.y+dfFloatY;
      gctx.fillStyle='rgba(0,0,0,0.70)';
      gctx.fillRect(dfx-dftw/2-8,dfy-dfs-3,dftw+16,dfs+8);
      gctx.fillStyle=dfa.color;
      gctx.fillText(dfa.label,dfx,dfy);
      gctx.restore();
    }
  }

  // Hover
  if(hoverC>=0&&hoverR>=0&&inGrid(hoverC,hoverR)){var hs=cellToScreen(hoverC,hoverR);drawDiamond(gctx,hs.x,hs.y,'rgba(245,200,66,0.18)','rgba(245,200,66,0.7)',1.5);}

  // Pass 7: 長押し進捗円 + 完了リングアニメ（ドラッグ中は非表示）
  var isDragging2=(typeof dragMoveKey!=='undefined'&&dragMoveKey!==null);
  if(!isDragging2){
    var lpcAlive=(typeof lpCircle!=='undefined')&&_drawProgressCircle(lpCircle);
    var spcAlive=(typeof stampCircle!=='undefined')&&_drawProgressCircle(stampCircle);
    var ringAlive=_drawLpRing();
    if(lpcAlive||spcAlive||ringAlive) _startRafLoop();
  }

  dirty=false;
}

function scheduleRender(){
  dirty=true;
  if(!_rafLoopRunning)requestAnimationFrame(function(){if(dirty)_renderNow();});
}

function drawBlock(ctx,c,r,x,y,id,dir){var b=BLOCKS[id];if(!b)return;var fn=DRAW_FNS[id]||DRAW_FNS['_cat_'+b.cat]||drawGeneric;fn(ctx,x,y,id,dir,b);}
function drawGeneric(ctx,x,y,id,dir,b){var bh=b.bh||30;isoBox(ctx,x,y,bh,'#3a5a4a','#2a4a38','#1e3028');var hh=HH*zoom,fs=Math.max(8,Math.min(22,zoom*18));ctx.save();ctx.font=fs+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.icon||'?',x,y-bh*zoom+hh*0.5);ctx.restore();}
