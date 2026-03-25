/**
 * iso-engine.js
 * Isometric coordinate math, drawing primitives, and the main render loop.
 */

// ── Global render state ──────────────────────────────────────────
var cells   = {};
var panX = 0, panY = 0, zoom = DEFAULT_ZOOM;
var nightMode = false;
var showGrid  = true;
var hoverC = -1, hoverR = -1;
var dirty = true;
var gc, ov, gctx, octx, cw, ch;

// ── Block placement animation ────────────────────────────────────
var blockAnims   = {};
var ANIM_DURATION = 480;

function triggerBlockAnim(c, r){
  blockAnims[ck(c,r)] = performance.now();
  dirty = false;
  scheduleRender();
}

function _popScale(t){
  if(t <= 0)   return 0;
  if(t >= 1)   return 1;
  if(t < 0.5){
    var u = t / 0.5;
    return 1.28 * u * u;
  } else {
    var u = (t - 0.5) / 0.5;
    return 1.28 - 0.28 * (1 - Math.pow(1 - u, 3));
  }
}

function getBlockScale(c, r){
  var key = ck(c,r);
  if(!blockAnims[key]) return 1;
  var elapsed = performance.now() - blockAnims[key];
  if(elapsed >= ANIM_DURATION){ delete blockAnims[key]; return 1; }
  return _popScale(elapsed / ANIM_DURATION);
}

// ── Drag flash animation ──────────────────────────────────────────
// 長押し成功時にブロックをゴールドで光らせるアニメ（バイブ代替）
var dragFlashAnims = {};   // ck(c,r) -> startTime
var DRAG_FLASH_DURATION = 420;  // ms

function triggerDragFlash(c, r){
  // グループ全体に適用
  var cell = getCell(c, r);
  if(!cell) return;
  var keys = [];
  if(cell.gid && typeof groupMap !== 'undefined' && groupMap[cell.gid]){
    groupMap[cell.gid].cells.forEach(function(pos){ keys.push(ck(pos.c, pos.r)); });
  } else {
    keys.push(ck(c, r));
  }
  var now = performance.now();
  keys.forEach(function(k){ dragFlashAnims[k] = now; });
  dirty = false;
  scheduleRender();
}

// フラッシュの輝度（0→1→0）
function _getDragFlash(c, r){
  var key = ck(c, r);
  if(!dragFlashAnims[key]) return 0;
  var elapsed = performance.now() - dragFlashAnims[key];
  if(elapsed >= DRAG_FLASH_DURATION){ delete dragFlashAnims[key]; return 0; }
  // 0→0.5で上昇、0.5→1で下降（鐘形）
  var t = elapsed / DRAG_FLASH_DURATION;
  return 1 - Math.abs(t * 2 - 1);  // 0→1→0
}

// ── Background theme ─────────────────────────────────────────────
var bgTheme = 'default';

var BG_THEMES = {
  'default': ['#0d0d12', '#05050a', '#1a1a22', '#10101a',
              'rgba(255,255,255,0.13)', '#0a0a2e', '#04041a'],
  'grass'  : ['#0e4020', '#061a08', '#2e5a30', '#0c2212',
              'rgba(255,255,255,0.12)', '#061428', '#030c10'],
  'desert' : ['#5a3010', '#2e1808', '#8c6030', '#5a3e1a',
              'rgba(0,0,0,0.20)', '#180e28', '#0c0814'],
  'snow'   : ['#4a7aaa', '#1e3a60', '#7aaccc', '#7aaac0',
              'rgba(20,50,90,0.30)', '#0c1e3e', '#060e22'],
  'ocean'  : ['#040e22', '#020810', '#0a3060', '#061838',
              'rgba(255,255,255,0.14)', '#020614', '#01030c'],
  'stone'  : ['#1e1e28', '#0c0c14', '#48485a', '#28283c',
              'rgba(255,255,255,0.11)', '#0e0e22', '#06060e']
};

function getBgPalette(){
  return BG_THEMES[bgTheme] || BG_THEMES['default'];
}

// ── Cell helpers ─────────────────────────────────────────────────
function ck(c,r){ return c+','+r; }
function inGrid(c,r){ return c>=0 && c<COLS && r>=0 && r<ROWS; }
function getCell(c,r){ return cells[ck(c,r)] || null; }

// ── ISO coordinate conversions ───────────────────────────────────
function cellToScreen(c,r){
  return {
    x: panX + (c - r) * HW * zoom,
    y: panY + (c + r) * HH * zoom
  };
}

function screenToCell(sx, sy){
  var dx = (sx - panX) / (HW * zoom);
  var dy = (sy - panY) / (HH * zoom);
  return {
    c: Math.floor((dx + dy) / 2),
    r: Math.floor((dy - dx) / 2)
  };
}

function centerView(){
  var mid = cellToScreen(COLS/2, ROWS/2);
  panX += cw/2 - mid.x;
  panY += ch/2 - mid.y;
}

function zoomAround(cx, cy, factor){
  var nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
  panX = cx - (cx - panX) * (nz / zoom);
  panY = cy - (cy - panY) * (nz / zoom);
  zoom = nz;
}

// ── Draw: flat diamond tile ──────────────────────────────────────
function drawDiamond(ctx, x, y, fill, stroke, strokeW){
  var hw = HW*zoom, hh = HH*zoom;
  ctx.beginPath();
  ctx.moveTo(x,    y);
  ctx.lineTo(x+hw, y+hh);
  ctx.lineTo(x,    y+hh*2);
  ctx.lineTo(x-hw, y+hh);
  ctx.closePath();
  if(fill)  { ctx.fillStyle=fill;   ctx.fill(); }
  if(stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=strokeW||0.5; ctx.stroke(); }
}

function clipDiamond(ctx, x, y){
  var hw = HW*zoom, hh = HH*zoom;
  ctx.beginPath();
  ctx.moveTo(x,    y);
  ctx.lineTo(x+hw, y+hh);
  ctx.lineTo(x,    y+hh*2);
  ctx.lineTo(x-hw, y+hh);
  ctx.closePath();
  ctx.clip();
}

// ── Draw: isometric box ──────────────────────────────────────────
function isoBox(ctx, x, y, bh, tc, lc, rc){
  var hw=HW*zoom, hh=HH*zoom, zb=bh*zoom;
  ctx.beginPath();
  ctx.moveTo(x,    y-zb);
  ctx.lineTo(x-hw, y+hh-zb);
  ctx.lineTo(x-hw, y+hh*2);
  ctx.lineTo(x,    y+hh*2);
  ctx.closePath(); ctx.fillStyle=lc; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x,    y-zb);
  ctx.lineTo(x+hw, y+hh-zb);
  ctx.lineTo(x+hw, y+hh*2);
  ctx.lineTo(x,    y+hh*2);
  ctx.closePath(); ctx.fillStyle=rc; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x,    y-zb);
  ctx.lineTo(x+hw, y+hh-zb);
  ctx.lineTo(x,    y+hh*2-zb);
  ctx.lineTo(x-hw, y+hh-zb);
  ctx.closePath(); ctx.fillStyle=tc; ctx.fill();
}

// ── Draw: gable roof EW ──────────────────────────────────────────
function isoGableEW(ctx, x, y, bh, rh, tc, lc, rc){
  var hw=HW*zoom, hh=HH*zoom, zb=bh*zoom, zr=rh*zoom;
  var by=y-zb;
  var N={x:x,y:by}, E={x:x+hw,y:by+hh}, S={x:x,y:by+2*hh}, W={x:x-hw,y:by+hh};
  var RW={x:x-hw,y:by+hh-zr}, RE={x:x+hw,y:by+hh-zr};
  ctx.beginPath(); ctx.moveTo(W.x,W.y); ctx.lineTo(N.x,N.y); ctx.lineTo(RE.x,RE.y); ctx.lineTo(RW.x,RW.y); ctx.closePath(); ctx.fillStyle=lc; ctx.fill();
  ctx.beginPath(); ctx.moveTo(E.x,E.y); ctx.lineTo(S.x,S.y); ctx.lineTo(RW.x,RW.y); ctx.lineTo(RE.x,RE.y); ctx.closePath(); ctx.fillStyle=rc; ctx.fill();
  ctx.beginPath(); ctx.moveTo(N.x,N.y); ctx.lineTo(E.x,E.y); ctx.lineTo(RE.x,RE.y); ctx.closePath(); ctx.fillStyle=tc; ctx.fill();
  ctx.beginPath(); ctx.moveTo(S.x,S.y); ctx.lineTo(W.x,W.y); ctx.lineTo(RW.x,RW.y); ctx.closePath(); ctx.fillStyle=tc; ctx.fill();
}

// ── Draw: gable roof NS ──────────────────────────────────────────
function isoGableNS(ctx, x, y, bh, rh, tc, lc, rc){
  var hw=HW*zoom, hh=HH*zoom, zb=bh*zoom, zr=rh*zoom;
  var by=y-zb;
  var N={x:x,y:by}, E={x:x+hw,y:by+hh}, S={x:x,y:by+2*hh}, W={x:x-hw,y:by+hh};
  var RN={x:x,y:by-zr}, RS={x:x,y:by+2*hh-zr};
  ctx.beginPath(); ctx.moveTo(W.x,W.y); ctx.lineTo(N.x,N.y); ctx.lineTo(RN.x,RN.y); ctx.lineTo(RS.x,RS.y); ctx.closePath(); ctx.fillStyle=lc; ctx.fill();
  ctx.beginPath(); ctx.moveTo(E.x,E.y); ctx.lineTo(S.x,S.y); ctx.lineTo(RS.x,RS.y); ctx.lineTo(RN.x,RN.y); ctx.closePath(); ctx.fillStyle=rc; ctx.fill();
  ctx.beginPath(); ctx.moveTo(N.x,N.y); ctx.lineTo(E.x,E.y); ctx.lineTo(RN.x,RN.y); ctx.closePath(); ctx.fillStyle=tc; ctx.fill();
  ctx.beginPath(); ctx.moveTo(S.x,S.y); ctx.lineTo(W.x,W.y); ctx.lineTo(RS.x,RS.y); ctx.closePath(); ctx.fillStyle=tc; ctx.fill();
}

// ── Draw: hip roof ───────────────────────────────────────────────
function isoHipRoof(ctx, x, y, bh, rh, lc, rc){
  var hw=HW*zoom, hh=HH*zoom, zb=bh*zoom, zr=rh*zoom;
  var by=y-zb;
  var N={x:x,y:by}, E={x:x+hw,y:by+hh}, S={x:x,y:by+2*hh}, W={x:x-hw,y:by+hh};
  var tip={x:x,y:by-zr};
  ctx.beginPath(); ctx.moveTo(N.x,N.y); ctx.lineTo(E.x,E.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle=rc; ctx.fill();
  ctx.beginPath(); ctx.moveTo(E.x,E.y); ctx.lineTo(S.x,S.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle=rc; ctx.fill();
  ctx.beginPath(); ctx.moveTo(S.x,S.y); ctx.lineTo(W.x,W.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle=lc; ctx.fill();
  ctx.beginPath(); ctx.moveTo(W.x,W.y); ctx.lineTo(N.x,N.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle=lc; ctx.fill();
}

// ── Draw: cylinder ───────────────────────────────────────────────
function isoCylinder(ctx, x, y, bh, r, tc, bc){
  var zb=bh*zoom, zr=r*zoom, hh=HH*zoom;
  var cx2=x, cy2=y+hh;
  ctx.save();
  var grad=ctx.createLinearGradient(cx2-zr,cy2,cx2+zr,cy2);
  grad.addColorStop(0, shadeC(bc,0.55));
  grad.addColorStop(0.4, bc);
  grad.addColorStop(1, shadeC(bc,0.72));
  ctx.beginPath(); ctx.ellipse(cx2,cy2-zb,zr,zr*0.5,0,0,Math.PI*2); ctx.fillStyle=tc; ctx.fill();
  ctx.beginPath(); ctx.rect(cx2-zr,cy2-zb,zr*2,zb); ctx.fillStyle=grad; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx2,cy2,zr,zr*0.5,0,Math.PI,0); ctx.fillStyle=shadeC(bc,0.7); ctx.fill();
  ctx.restore();
}

// ── Window helpers ────────────────────────────────────────────────
function winL(ctx, x, y, zbh, u, v, wu, vh, c){
  var hw=HW*zoom, hh=HH*zoom;
  var ax=x-hw, ay=y+hh;
  ctx.beginPath();
  ctx.moveTo(ax+u*hw,      ay-u*hh      -v*zbh);
  ctx.lineTo(ax+(u+wu)*hw, ay-(u+wu)*hh -v*zbh);
  ctx.lineTo(ax+(u+wu)*hw, ay-(u+wu)*hh -(v+vh)*zbh);
  ctx.lineTo(ax+u*hw,      ay-u*hh      -(v+vh)*zbh);
  ctx.closePath(); ctx.fillStyle=c; ctx.fill();
}

function winR(ctx, x, y, zbh, u, v, wu, vh, c){
  var hw=HW*zoom, hh=HH*zoom;
  ctx.beginPath();
  ctx.moveTo(x+u*hw,       y+u*hh       -v*zbh);
  ctx.lineTo(x+(u+wu)*hw,  y+(u+wu)*hh  -v*zbh);
  ctx.lineTo(x+(u+wu)*hw,  y+(u+wu)*hh  -(v+vh)*zbh);
  ctx.lineTo(x+u*hw,       y+u*hh       -(v+vh)*zbh);
  ctx.closePath(); ctx.fillStyle=c; ctx.fill();
}

// ── Colour utilities ─────────────────────────────────────────────
function shadeC(hex, f){
  var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return '#'+[r,g,b].map(function(v){ return Math.round(Math.max(0,Math.min(255,v*f))).toString(16).padStart(2,'0'); }).join('');
}

function mixC(a,b,t){
  var ar=parseInt(a.slice(1,3),16),ag=parseInt(a.slice(3,5),16),ab_=parseInt(a.slice(5,7),16);
  var br=parseInt(b.slice(1,3),16),bg=parseInt(b.slice(3,5),16),bb=parseInt(b.slice(5,7),16);
  return '#'+[ar+(br-ar)*t,ag+(bg-ag)*t,ab_+(bb-ab_)*t].map(function(v){ return Math.round(v).toString(16).padStart(2,'0'); }).join('');
}

// ── グループのバウンディングボックスを計算 ───────────────────────
function groupBBox(cells2){
  var minC=cells2[0].c, maxC=cells2[0].c, minR=cells2[0].r, maxR=cells2[0].r;
  for(var i=1;i<cells2.length;i++){
    if(cells2[i].c<minC) minC=cells2[i].c; if(cells2[i].c>maxC) maxC=cells2[i].c;
    if(cells2[i].r<minR) minR=cells2[i].r; if(cells2[i].r>maxR) maxR=cells2[i].r;
  }
  return {minC:minC, maxC:maxC, minR:minR, maxR:maxR, w:maxC-minC+1, h:maxR-minR+1};
}

// ── Main render ──────────────────────────────────────────────────
function render(){
  if(!gctx) return;
  gctx.clearRect(0,0,cw,ch);

  var pal = getBgPalette();

  if(nightMode){
    var sky=gctx.createLinearGradient(0,0,0,ch);
    sky.addColorStop(0, pal[5]||shadeC(pal[0],0.28));
    sky.addColorStop(1, pal[6]||shadeC(pal[1],0.22));
    gctx.fillStyle=sky; gctx.fillRect(0,0,cw,ch);
  } else {
    var sky2=gctx.createLinearGradient(0,0,0,ch);
    sky2.addColorStop(0, pal[0]); sky2.addColorStop(1, pal[1]);
    gctx.fillStyle=sky2; gctx.fillRect(0,0,cw,ch);
  }

  var tileList=[];
  for(var r2=0;r2<ROWS;r2++){
    for(var c2=0;c2<COLS;c2++) tileList.push([c2,r2]);
  }
  tileList.sort(function(a,b){ return (a[0]+a[1])-(b[0]+b[1]); });

  // ── Pass 1: 地面 ─────────────────────────────────────────────
  tileList.forEach(function(cr){
    var c=cr[0], r=cr[1];
    var s=cellToScreen(c,r);
    var gfill  = nightMode ? pal[3] : pal[2];
    var nightGrid = (bgTheme==='snow') ? 'rgba(30,70,120,0.35)' : 'rgba(255,255,255,0.09)';
    var gstroke = showGrid ? (nightMode ? nightGrid : pal[4]) : null;
    drawDiamond(gctx, s.x, s.y, gfill, gstroke, 0.5);
  });

  // ── Pass 2: ブロック ─────────────────────────────────────────
  tileList.forEach(function(cr){
    var c=cr[0], r=cr[1];
    var cell=getCell(c,r); if(!cell) return;
    var s=cellToScreen(c,r);
    var scale=getBlockScale(c,r);
    if(scale !== 1){
      var cx2=s.x, cy2=s.y+HH*zoom;
      gctx.save();
      gctx.translate(cx2,cy2); gctx.scale(scale,scale); gctx.translate(-cx2,-cy2);
      drawBlock(gctx,c,r,s.x,s.y,cell.id,cell.dir);
      gctx.restore();
    } else {
      drawBlock(gctx,c,r,s.x,s.y,cell.id,cell.dir);
    }
  });

  // ── Pass 3: グループ枠・サイズラベル ─────────────────────────
  if(typeof groupMap !== 'undefined'){
    var drawnGids={};
    tileList.forEach(function(cr){
      var c=cr[0], r=cr[1];
      var cell=getCell(c,r); if(!cell||!cell.gid) return;
      if(drawnGids[cell.gid]) return;
      drawnGids[cell.gid]=true;
      var grp=groupMap[cell.gid]; if(!grp||grp.cells.length<2) return;

      grp.cells.forEach(function(pos){
        var s=cellToScreen(pos.c,pos.r);
        drawDiamond(gctx,s.x,s.y,null,'rgba(245,200,66,0.80)',2.0);
      });

      var bbox=groupBBox(grp.cells);
      var frontS=cellToScreen(bbox.minC+bbox.w-1,bbox.minR+bbox.h-1);
      var bh=BLOCKS[grp.id]?BLOCKS[grp.id].bh:30;
      var labelX=frontS.x, labelY=frontS.y-bh*zoom-4*zoom;
      var fs=Math.max(9,Math.min(15,zoom*11));
      var lbl=bbox.w+'×'+bbox.h;
      gctx.save();
      gctx.font='bold '+fs+'px sans-serif'; gctx.textAlign='center'; gctx.textBaseline='bottom';
      var tw=gctx.measureText(lbl).width;
      gctx.fillStyle='rgba(0,0,0,0.70)'; gctx.fillRect(labelX-tw/2-3,labelY-fs-2,tw+6,fs+4);
      gctx.fillStyle='#f5c842'; gctx.fillText(lbl,labelX,labelY);
      gctx.restore();
    });
  }

  // ── Pass 4: ドラッグフラッシュ（バイブ代替ビジュアル）────────
  var hasFlash = Object.keys(dragFlashAnims).length > 0;
  if(hasFlash){
    tileList.forEach(function(cr){
      var c=cr[0], r=cr[1];
      var flash = _getDragFlash(c,r);
      if(flash <= 0) return;
      var s=cellToScreen(c,r);
      // ゴールドの強い輝き（鐘形フェード）
      var alpha = flash * 0.70;
      drawDiamond(gctx, s.x, s.y, 'rgba(255,220,60,'+alpha+')', 'rgba(255,255,255,'+(flash*0.9)+')', 2.5);
    });
  }

  // ── Pass 5: ドラッグ中ハイライト（移動先を常時点灯）────────
  if(typeof dragHighlightKey !== 'undefined' && dragHighlightKey){
    var dhParts=dragHighlightKey.split(',');
    var dhC=parseInt(dhParts[0]), dhR=parseInt(dhParts[1]);
    var dhCell=getCell(dhC,dhR);
    var dhKeys=[];
    if(dhCell&&dhCell.gid&&typeof groupMap!=='undefined'&&groupMap[dhCell.gid]){
      groupMap[dhCell.gid].cells.forEach(function(pos){ dhKeys.push({c:pos.c,r:pos.r}); });
    } else {
      dhKeys.push({c:dhC,r:dhR});
    }
    dhKeys.forEach(function(pos){
      var s=cellToScreen(pos.c,pos.r);
      drawDiamond(gctx,s.x,s.y,'rgba(255,200,50,0.22)','rgba(255,200,50,0.85)',2.2);
    });
  }

  // Hover highlight
  if(hoverC>=0 && hoverR>=0 && inGrid(hoverC,hoverR)){
    var hs=cellToScreen(hoverC,hoverR);
    drawDiamond(gctx,hs.x,hs.y,'rgba(245,200,66,0.18)','rgba(245,200,66,0.7)',1.5);
  }

  dirty=false;

  // アニメーション継続チェック
  var needLoop = Object.keys(blockAnims).length > 0 || Object.keys(dragFlashAnims).length > 0;
  if(needLoop) requestAnimationFrame(render);
}

function scheduleRender(){
  if(!dirty){ dirty=true; requestAnimationFrame(render); }
}

// ── dispatch to per-block draw functions ─────────────────────────
function drawBlock(ctx, c, r, x, y, id, dir){
  var b=BLOCKS[id]; if(!b) return;
  var fn=DRAW_FNS[id] || DRAW_FNS['_cat_'+b.cat] || drawGeneric;
  fn(ctx, x, y, id, dir, b);
}

// ── Generic fallback ─────────────────────────────────────────────
function drawGeneric(ctx, x, y, id, dir, b){
  var bh=b.bh||30;
  isoBox(ctx,x,y,bh,'#3a5a4a','#2a4a38','#1e3028');
  var hh=HH*zoom;
  var fs=Math.max(8,Math.min(22,zoom*18));
  ctx.save();
  ctx.font=fs+'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(b.icon||'?', x, y-bh*zoom+hh*0.5);
  ctx.restore();
}
