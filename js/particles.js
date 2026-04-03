/**
 * particles.js  v2.1
 *
 * triggerParticleBurst(c, r)  -- 長押し移動モード: ゴールドの衝撃波
 * triggerStampBurst(c, r)     -- 長押しスタンプモード: 緑の二重パルス
 */

var _ptCanvas=null,_ptCtx=null,_ptWaves=[],_ptRafId=null,_ptLast=0;

function _ptSetup(){
  if(_ptCanvas)return;
  _ptCanvas=document.createElement('canvas');
  _ptCanvas.style.cssText='position:absolute;top:0;left:0;pointer-events:none;z-index:10';
  var wrap=document.getElementById('canvas-wrap')||document.body;
  wrap.style.position=wrap.style.position||'relative';
  wrap.appendChild(_ptCanvas);
  _ptCtx=_ptCanvas.getContext('2d');
  _ptResize();
  window.addEventListener('resize',_ptResize);
}

function _ptResize(){
  if(!_ptCanvas)return;
  var wrap=document.getElementById('canvas-wrap')||document.body;
  _ptCanvas.width =wrap.offsetWidth ||window.innerWidth;
  _ptCanvas.height=wrap.offsetHeight||window.innerHeight;
}

// ── スクリーン座標取得 ────────────────────────────────────────────
function _ptCenter(c,r){
  var s=cellToScreen(c,r);
  var bh=0,cell=getCell(c,r);
  if(cell&&BLOCKS[cell.id]){
    bh=(BLOCKS[cell.id].bh||0)*zoom;
    if(typeof BH_SCALE!=='undefined')bh*=BH_SCALE;
  }
  return {x:s.x, y:s.y+HH*zoom-bh*0.5};
}

// ── 波形を追加 ───────────────────────────────────────────────────
function _ptAddWave(cx,cy,maxR,dur,lw,col,delay){
  _ptWaves.push({cx:cx,cy:cy,maxR:maxR,dur:dur,lw:lw,col:col,elapsed:-(delay||0)});
}

// ── 移動モード: ゴールド衝撃波 ───────────────────────────────────
function triggerParticleBurst(c,r){
  _ptSetup();
  var p=_ptCenter(c,r),cx=p.x,cy=p.y;
  _ptAddWave(cx,cy,68*zoom,0.38,3.5*zoom,'rgba(255,230,100,A)',0);
  _ptAddWave(cx,cy,52*zoom,0.32,2.0*zoom,'rgba(255,255,200,A)',0.04);
  _ptAddWave(cx,cy,38*zoom,0.26,1.2*zoom,'rgba(200,230,255,A)',0.10);
  // 中心フラッシュ (lw=0 で塗りつぶし)
  _ptAddWave(cx,cy,22*zoom,0.18,0,      'rgba(255,245,180,A)',0);
  if(!_ptRafId)_ptLoop();
}

// ── スタンプモード: 緑の二重パルス ──────────────────────────────
// 特徴: 移動より小さく・速く・2回パルス（連続配置のリズム感）
function triggerStampBurst(c,r){
  _ptSetup();
  var p=_ptCenter(c,r),cx=p.x,cy=p.y;

  // 1パルス目
  _ptAddWave(cx,cy,48*zoom,0.28,3.0*zoom,'rgba(80,255,160,A)', 0);
  _ptAddWave(cx,cy,34*zoom,0.22,1.8*zoom,'rgba(160,255,220,A)',0.03);
  // 中心フラッシュ
  _ptAddWave(cx,cy,16*zoom,0.14,0,       'rgba(180,255,210,A)',0);

  // 2パルス目（少し遅れて追いかける）
  _ptAddWave(cx,cy,40*zoom,0.24,2.2*zoom,'rgba(60,220,140,A)', 0.15);
  _ptAddWave(cx,cy,28*zoom,0.20,1.2*zoom,'rgba(140,255,200,A)',0.18);

  if(!_ptRafId)_ptLoop();
}

// ── レンダーループ ────────────────────────────────────────────────
function _ptLoop(ts){
  var now=ts||performance.now();
  var dt=Math.min((now-(_ptLast||now))/1000,0.05);
  _ptLast=now;
  _ptCtx.clearRect(0,0,_ptCanvas.width,_ptCanvas.height);

  var alive=false;
  for(var i=_ptWaves.length-1;i>=0;i--){
    var w=_ptWaves[i];
    w.elapsed+=dt;
    if(w.elapsed<0)continue;
    if(w.elapsed>=w.dur){_ptWaves.splice(i,1);continue;}
    alive=true;

    var t=w.elapsed/w.dur;
    var et=1-Math.pow(1-t,3);          // ease-out cubic
    var r=w.maxR*et;
    var alpha=t<0.15?(t/0.15):Math.pow(1-t,1.6);
    alpha=Math.max(0,Math.min(1,alpha));

    var col=w.col.replace('A',alpha.toFixed(3));
    _ptCtx.beginPath();
    _ptCtx.arc(w.cx,w.cy,Math.max(0.5,r),0,Math.PI*2);
    if(w.lw===0){
      _ptCtx.fillStyle=col; _ptCtx.fill();
    } else {
      _ptCtx.strokeStyle=col;
      _ptCtx.lineWidth=w.lw*(1-t*0.5);
      _ptCtx.stroke();
    }
  }

  if(alive){
    _ptRafId=requestAnimationFrame(_ptLoop);
  } else {
    _ptRafId=null;
    _ptCtx.clearRect(0,0,_ptCanvas.width,_ptCanvas.height);
  }
}
