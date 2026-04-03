/**
 * particles.js  v2.0
 * 長押し成功時: 光の輪が円状に放射状に広がる衝撃波エフェクト
 *
 * index.html の </body> 直前に追加:
 *   <script src="js/particles.js"></script>
 * （iso-engine.js より後、interaction.js より前）
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

/**
 * triggerParticleBurst(c, r)
 * ブロック位置を中心に光の輪を放射状に展開する。
 */
function triggerParticleBurst(c,r){
  _ptSetup();

  var s=cellToScreen(c,r);
  var bh=0;
  var cell=getCell(c,r);
  if(cell&&BLOCKS[cell.id]){
    bh=(BLOCKS[cell.id].bh||0)*zoom;
    if(typeof BH_SCALE!=='undefined')bh*=BH_SCALE;
  }
  // ブロック上面中心
  var cx=s.x, cy=s.y+HH*zoom-bh*0.5;

  // 輪を3重で発火（少しずつ遅延・サイズ違い）
  var rings=[
    {delay:0,   maxR:68*zoom, dur:0.38, lw:3.5*zoom, col:'rgba(255,230,100,A)'},
    {delay:0.04, maxR:52*zoom, dur:0.32, lw:2.0*zoom, col:'rgba(255,255,200,A)'},
    {delay:0.10, maxR:38*zoom, dur:0.26, lw:1.2*zoom, col:'rgba(200,230,255,A)'}
  ];

  var now=performance.now();
  rings.forEach(function(def){
    _ptWaves.push({
      cx:cx, cy:cy,
      maxR:def.maxR,
      dur:def.dur,
      lw:def.lw,
      col:def.col,
      elapsed:-def.delay  // マイナスにしておいて delay 後に始まる
    });
  });

  // 中心フラッシュ（塗りつぶし円、即消え）
  _ptWaves.push({
    cx:cx, cy:cy,
    maxR:22*zoom,
    dur:0.18,
    lw:0,               // lw=0 で塗りつぶし円
    col:'rgba(255,245,180,A)',
    elapsed:0
  });

  if(!_ptRafId)_ptLoop();
}

function _ptLoop(ts){
  var now=ts||performance.now();
  var dt=Math.min((now-(_ptLast||now))/1000,0.05);
  _ptLast=now;

  _ptCtx.clearRect(0,0,_ptCanvas.width,_ptCanvas.height);

  var alive=false;
  for(var i=_ptWaves.length-1;i>=0;i--){
    var w=_ptWaves[i];
    w.elapsed+=dt;
    if(w.elapsed<0)continue;          // delay 中
    if(w.elapsed>=w.dur){_ptWaves.splice(i,1);continue;}

    alive=true;
    var t=w.elapsed/w.dur;            // 0→1

    // イージング: ease-out cubic（素早く広がって止まる）
    var et=1-Math.pow(1-t,3);
    var r=w.maxR*et;

    // 透明度: 序盤に一気に出て後半にフェードアウト
    var alpha=t<0.15?(t/0.15):Math.pow(1-t,1.6);
    alpha=Math.max(0,Math.min(1,alpha));

    var col=w.col.replace('A',alpha.toFixed(3));
    _ptCtx.beginPath();
    _ptCtx.arc(w.cx,w.cy,Math.max(0.5,r),0,Math.PI*2);

    if(w.lw===0){
      // 塗りつぶし円（中心フラッシュ）
      _ptCtx.fillStyle=col;
      _ptCtx.fill();
    } else {
      // リング（輪）
      _ptCtx.strokeStyle=col;
      _ptCtx.lineWidth=w.lw*(1-t*0.5);  // 広がるにつれ細くなる
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
