/**
 * nature-draw.js
 * Draws natural tiles: water, grass, forest, mountain, volcano, flowers.
 * Flood-fill tiles connect seamlessly with neighbours.
 */

// ── Water ─────────────────────────────────────────────────────────
function drawWater(ctx,x,y,id,dir,b){
  var hw=HW*zoom, hh=HH*zoom;
  // Animated-look via static gradient
  var gc=ctx.createLinearGradient(x-hw,y,x+hw,y+hh*2);
  if(nightMode){
    gc.addColorStop(0,'#0a1a3a'); gc.addColorStop(0.5,'#0e2248'); gc.addColorStop(1,'#0a1a3a');
  } else {
    gc.addColorStop(0,'#2070c0'); gc.addColorStop(0.5,'#2878d0'); gc.addColorStop(1,'#1860b0');
  }
  drawDiamond(ctx,x,y,gc,null);
  // Ripple lines
  ctx.save(); clipDiamond(ctx,x,y);
  ctx.strokeStyle=nightMode?'rgba(80,120,200,0.4)':'rgba(150,210,255,0.5)';
  ctx.lineWidth=Math.max(0.6,zoom*0.9);
  [0.3,0.6,0.85].forEach(function(t){
    ctx.beginPath();
    ctx.moveTo(x-hw*t,y+hh+hh*0.3*(t-0.5));
    ctx.bezierCurveTo(
      x-hw*t*0.3,y+hh*(1-t*0.3),
      x+hw*t*0.3,y+hh*(1-t*0.3),
      x+hw*t,y+hh+hh*0.3*(t-0.5)
    );
    ctx.stroke();
  });
  ctx.restore();
  // Night: moonlight shimmer
  if(nightMode){
    ctx.save(); ctx.globalAlpha=0.15;
    ctx.fillStyle='#8090d0';
    ctx.beginPath(); ctx.arc(x+hw*0.2,y+hh,3*zoom,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── Grass ─────────────────────────────────────────────────────────
function drawGrass(ctx,x,y,id,dir,b){
  var hw=HW*zoom, hh=HH*zoom;
  drawDiamond(ctx,x,y,nightMode?'#1a3015':'#3a7a28',null);
  // Grass tufts
  ctx.save(); clipDiamond(ctx,x,y);
  ctx.strokeStyle=nightMode?'rgba(40,90,30,0.7)':'rgba(80,160,50,0.6)';
  ctx.lineWidth=Math.max(0.5,zoom*0.8);
  var pts=[[0.1,0.55],[0.35,0.32],[0.6,0.68],[0.8,0.45],[0.5,0.8]];
  pts.forEach(function(p){
    var px=x+(p[0]-0.5)*hw*2, py=y+hh*0.3+p[1]*hh*1.4;
    for(var i=-1;i<=1;i++){
      ctx.beginPath(); ctx.moveTo(px+i*2*zoom,py); ctx.lineTo(px+i*1.5*zoom,py-5*zoom); ctx.stroke();
    }
  });
  ctx.restore();
}

// ── Forest ────────────────────────────────────────────────────────
function drawForest(ctx,x,y,id,dir,b){
  var hw=HW*zoom, hh=HH*zoom;
  // Ground
  drawDiamond(ctx,x,y,nightMode?'#102010':'#2a5a20',null);
  // 3 trees per tile
  var treePos=[[x-hw*0.3,y+hh*0.5],[x+hw*0.25,y+hh*0.4],[x-hw*0.05,y+hh*1.1]];
  treePos.forEach(function(tp,i){
    var tx=tp[0], ty=tp[1];
    var th=b.bh*(0.8+i*0.15)*zoom;
    // Trunk
    ctx.save(); ctx.fillStyle='#6a4020';
    ctx.fillRect(tx-zoom*1.2,ty-th*0.4,zoom*2.4,th*0.4); ctx.restore();
    // Canopy layers
    var cc=nightMode?'#163810':'#2d7020';
    var cc2=nightMode?'#1e4a18':'#3a8828';
    [0, -th*0.22, -th*0.44].forEach(function(oy,li){
      var r2=(0.38-li*0.08)*th;
      ctx.save(); ctx.fillStyle=li%2===0?cc:cc2;
      ctx.beginPath(); ctx.ellipse(tx,ty-th*0.3+oy,r2,r2*0.6,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
  });
}

// ── Flower ────────────────────────────────────────────────────────
function drawFlower(ctx,x,y,id,dir,b){
  var hw=HW*zoom, hh=HH*zoom;
  drawDiamond(ctx,x,y,nightMode?'#1a2a18':'#3a6a30',null);
  ctx.save(); clipDiamond(ctx,x,y);
  var colors=['#ff6080','#ff8030','#ffe040','#60c060','#8080ff'];
  var pts=[[0.2,0.4],[0.5,0.25],[0.75,0.55],[0.35,0.75],[0.65,0.8]];
  pts.forEach(function(p,i){
    var px=x+(p[0]-0.5)*hw*2, py=y+hh*0.2+p[1]*hh*1.6;
    var r=Math.max(2,3*zoom);
    ctx.fillStyle=nightMode?shadeC(colors[i],0.6):colors[i];
    ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
    // Petals
    for(var a=0;a<5;a++){
      var ang=a/5*Math.PI*2;
      ctx.beginPath();
      ctx.arc(px+Math.cos(ang)*r*1.5,py+Math.sin(ang)*r*0.8,r*0.6,0,Math.PI*2);
      ctx.fill();
    }
  });
  ctx.restore();
}

// ── Mountain ──────────────────────────────────────────────────────
function drawMountain(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom, hh=HH*zoom;
  // Base
  drawDiamond(ctx,x,y,nightMode?'#2a3020':'#4a6038',null);
  // Mountain body: two flanks + peak
  var tip={x:x, y:y-zb};
  var N={x:x,y:y}, E={x:x+hw,y:y+hh}, S={x:x,y:y+hh*2}, W={x:x-hw,y:y+hh};
  // NE face
  ctx.beginPath(); ctx.moveTo(N.x,N.y); ctx.lineTo(E.x,E.y); ctx.lineTo(tip.x,tip.y); ctx.closePath();
  ctx.fillStyle=nightMode?'#3a4a38':'#6a7860'; ctx.fill();
  // SE face
  ctx.beginPath(); ctx.moveTo(E.x,E.y); ctx.lineTo(S.x,S.y); ctx.lineTo(tip.x,tip.y); ctx.closePath();
  ctx.fillStyle=nightMode?'#2a3828':'#505848'; ctx.fill();
  // SW face
  ctx.beginPath(); ctx.moveTo(S.x,S.y); ctx.lineTo(W.x,W.y); ctx.lineTo(tip.x,tip.y); ctx.closePath();
  ctx.fillStyle=nightMode?'#303830':'#585a50'; ctx.fill();
  // NW face
  ctx.beginPath(); ctx.moveTo(W.x,W.y); ctx.lineTo(N.x,N.y); ctx.lineTo(tip.x,tip.y); ctx.closePath();
  ctx.fillStyle=nightMode?'#3a4840':'#607058'; ctx.fill();
  // Snow cap (top 20%)
  var snowY=y-zb*0.78;
  var sw=hw*0.28, sh=hh*0.28;
  ctx.save(); ctx.fillStyle=nightMode?'#c0c8d0':'#eff4f8';
  ctx.beginPath();
  ctx.moveTo(x,y-zb); // peak
  ctx.lineTo(x+sw,snowY+sh); ctx.lineTo(x,snowY+sh*2); ctx.lineTo(x-sw,snowY+sh);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ── Volcano ───────────────────────────────────────────────────────
function drawVolcano(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom, hh=HH*zoom;
  drawDiamond(ctx,x,y,nightMode?'#301010':'#503020',null);
  var tip={x:x, y:y-zb};
  var N={x:x,y:y}, E={x:x+hw,y:y+hh}, S={x:x,y:y+hh*2}, W={x:x-hw,y:y+hh};
  // Dark body
  ctx.beginPath(); ctx.moveTo(N.x,N.y); ctx.lineTo(E.x,E.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle='#4a3020'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(E.x,E.y); ctx.lineTo(S.x,S.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle='#382818'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(S.x,S.y); ctx.lineTo(W.x,W.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle='#402a18'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(W.x,W.y); ctx.lineTo(N.x,N.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle='#4c3020'; ctx.fill();
  // Crater
  ctx.save(); ctx.fillStyle='#1a0808';
  ctx.beginPath(); ctx.ellipse(x,y-zb+3*zoom,hw*0.22,hh*0.22,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  // Lava glow in crater
  ctx.save(); ctx.fillStyle='#d04010';
  ctx.beginPath(); ctx.ellipse(x,y-zb+3*zoom,hw*0.14,hh*0.14,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  // Lava flows
  ctx.save();
  ctx.strokeStyle='#c03010'; ctx.lineWidth=Math.max(1.5,zoom*2);
  [[0.2,0.4],[0.7,0.3],[-0.3,0.5]].forEach(function(f){
    ctx.beginPath();
    ctx.moveTo(x,y-zb+3*zoom);
    ctx.quadraticCurveTo(x+f[0]*hw,y-zb*f[1],x+f[0]*hw*1.5,y-zb*(f[1]-0.3)+hh);
    ctx.stroke();
  });
  ctx.restore();
  // Smoke puff at tip
  ctx.save(); ctx.globalAlpha=0.5;
  ctx.fillStyle=nightMode?'#404040':'#808080';
  for(var i=0;i<3;i++){
    ctx.beginPath(); ctx.arc(x+(i-1)*5*zoom,y-zb-8*zoom-i*4*zoom,5*zoom,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ── Register nature blocks in DRAW_FNS ───────────────────────────
// Called from main.js after all scripts load
function registerNatureFns(){
  DRAW_FNS.water    = drawWater;
  DRAW_FNS.grass    = drawGrass;
  DRAW_FNS.forest   = drawForest;
  DRAW_FNS.flower   = drawFlower;
  DRAW_FNS.mountain = drawMountain;
  DRAW_FNS.volcano  = drawVolcano;
  // park already in blocks-draw.js; fountain already there too
}
