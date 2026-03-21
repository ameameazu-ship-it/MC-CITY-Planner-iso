/**
 * blocks-draw.js
 * Per-block Canvas drawing functions.
 * Each function signature: fn(ctx, x, y, id, dir, blockDef)
 * x,y = north-vertex of ground tile in canvas px.
 */

// ── House variants ───────────────────────────────────────────────
function drawHouse1(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  isoBox(ctx,x,y,bh,'#e8c87a','#d4956a','#b87850');
  // windows L
  winL(ctx,x,y,zb,0.2,0.35,0.25,0.3,nightMode?'#ffe080':'#7ab0d8');
  winL(ctx,x,y,zb,0.55,0.35,0.25,0.3,nightMode?'#ffe080':'#7ab0d8');
  // windows R
  winR(ctx,x,y,zb,0.2,0.35,0.25,0.3,nightMode?'#ffe080':'#7ab0d8');
  // Gable roof
  isoGableEW(ctx,x,y,bh,14,'#c0392b','#a93226','#922b21');
}

function drawHouse2(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  isoBox(ctx,x,y,bh,'#f0d8a0','#c8a878','#a88050');
  winL(ctx,x,y,zb,0.15,0.30,0.20,0.28,nightMode?'#ffe080':'#8ac0e8');
  winL(ctx,x,y,zb,0.45,0.30,0.20,0.28,nightMode?'#ffe080':'#8ac0e8');
  winR(ctx,x,y,zb,0.25,0.30,0.20,0.28,nightMode?'#ffe080':'#8ac0e8');
  winR(ctx,x,y,zb,0.55,0.30,0.20,0.28,nightMode?'#ffe080':'#8ac0e8');
  isoGableNS(ctx,x,y,bh,16,'#8b4513','#7a3d10','#6b340e');
}

function drawHouse3(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  // Slightly larger yellow brick
  isoBox(ctx,x,y,bh,'#deb887','#c49a6c','#a87850');
  winL(ctx,x,y,zb,0.15,0.28,0.22,0.30,nightMode?'#ffe080':'#a0c8e0');
  winR(ctx,x,y,zb,0.18,0.28,0.22,0.30,nightMode?'#ffe080':'#a0c8e0');
  winR(ctx,x,y,zb,0.50,0.28,0.22,0.30,nightMode?'#ffe080':'#a0c8e0');
  isoHipRoof(ctx,x,y,bh,18,'#6b4226','#8b5a3c');
}

function drawHouse4(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  // Blue-grey modern house
  isoBox(ctx,x,y,bh,'#b0c4de','#8090a8','#607090');
  winL(ctx,x,y,zb,0.20,0.32,0.26,0.32,nightMode?'#ffe080':'#c8e0f0');
  winR(ctx,x,y,zb,0.20,0.32,0.26,0.32,nightMode?'#ffe080':'#c8e0f0');
  winR(ctx,x,y,zb,0.52,0.32,0.26,0.32,nightMode?'#ffe080':'#c8e0f0');
  // Flat roof + low parapet
  isoBox(ctx,x,y-bh*zoom,4,'#7a9aac','#5a7a8c','#4a6a7c');
}

function drawHouse5(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  // Two-tone cottage
  isoBox(ctx,x,y,bh,'#f5f0e8','#ddd0bc','#c0b09a');
  winL(ctx,x,y,zb,0.12,0.28,0.24,0.30,nightMode?'#ffe080':'#88b8d0');
  winL(ctx,x,y,zb,0.46,0.28,0.24,0.30,nightMode?'#ffe080':'#88b8d0');
  winR(ctx,x,y,zb,0.15,0.28,0.24,0.30,nightMode?'#ffe080':'#88b8d0');
  isoGableEW(ctx,x,y,bh,18,'#4a7a4a','#3a6a3a','#2e5a2e');
}

// ── Apartment variants ───────────────────────────────────────────
function drawApt(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var col = id==='apt1'?'#607890': id==='apt2'?'#4a6a80':'#3a5a70';
  isoBox(ctx,x,y,bh,shadeC(col,1.3),col,shadeC(col,0.75));
  // Multiple window rows
  var rows = id==='apt1'?3: id==='apt2'?4:5;
  var wc=nightMode?'#ffe080':'#aad0f0';
  for(var row=0;row<rows;row++){
    var vv=0.15+(row/rows)*0.72;
    winL(ctx,x,y,zb,0.18,vv,0.20,0.10,wc);
    winL(ctx,x,y,zb,0.52,vv,0.20,0.10,wc);
    winR(ctx,x,y,zb,0.18,vv,0.20,0.10,wc);
    winR(ctx,x,y,zb,0.52,vv,0.20,0.10,wc);
  }
  // Flat roof
  isoBox(ctx,x,y-zb,5,shadeC(col,0.9),shadeC(col,0.7),shadeC(col,0.55));
}

// ── Castle variants ──────────────────────────────────────────────
function drawCastle(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  var stone='#8a8a7a', stoneL=shadeC(stone,0.8), stoneR=shadeC(stone,0.65);
  isoBox(ctx,x,y,bh,stone,stoneL,stoneR);
  // Arrow-slit windows
  var wc='#1a1a28';
  winL(ctx,x,y,zb,0.30,0.50,0.08,0.20,wc);
  winR(ctx,x,y,zb,0.30,0.50,0.08,0.20,wc);
  winR(ctx,x,y,zb,0.60,0.50,0.08,0.20,wc);
  // Battlements: small boxes on roof line
  var batt=['#7a7a6a','#6a6a5a','#5a5a4a'];
  for(var i=0;i<3;i++){
    var off=(i-1)*hw*0.28;
    isoBox(ctx,x+off,y-zb,7,batt[0],batt[1],batt[2]);
  }
  // Corner tower (for castle3)
  if(id==='castle3'){
    isoCylinder(ctx,x+hw*0.5,y-zb+hh*0.5,bh*0.5,7,shadeC(stone,1.1),stone);
  }
}

// ── Church variants ──────────────────────────────────────────────
function drawChurch(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  isoBox(ctx,x,y,bh,'#f0ece4','#d8d0c4','#c0b8ac');
  winL(ctx,x,y,zb,0.25,0.30,0.15,0.30,'#6a8aaa');
  winR(ctx,x,y,zb,0.30,0.30,0.15,0.30,'#6a8aaa');
  // Gable
  isoGableEW(ctx,x,y,bh,id==='church1'?12:id==='church2'?16:20,'#888898','#6a6a78','#5a5a68');
  // Steeple (extra height)
  var stH = id==='church1'?22:id==='church2'?30:40;
  var hw=HW*zoom,hh=HH*zoom;
  isoBox(ctx,x,y-zb,stH,'#aaaabc','#888898','#6a6a78');
  // Cross at tip
  ctx.save();
  ctx.strokeStyle=nightMode?'#fff8c0':'#d4c0a0';
  ctx.lineWidth=Math.max(1,1.5*zoom);
  var tipY=y-zb-(stH+8)*zoom;
  ctx.beginPath(); ctx.moveTo(x,tipY); ctx.lineTo(x,tipY+8*zoom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-4*zoom,tipY+3*zoom); ctx.lineTo(x+4*zoom,tipY+3*zoom); ctx.stroke();
  ctx.restore();
}

// ── Farm variants ────────────────────────────────────────────────
function drawFarm(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  // Ground (fields)
  drawDiamond(ctx,x,y, id==='farm3'?'#8a6a30':'#7a9a40', null);
  // Field stripes
  ctx.save();
  clipDiamond(ctx,x,y);
  ctx.strokeStyle=id==='farm3'?'#a08040':'#5a8030';
  ctx.lineWidth=Math.max(1,zoom*1.5);
  for(var i=0;i<4;i++){
    var ty=y+(hh*0.35)+i*(hh*0.38);
    ctx.beginPath(); ctx.moveTo(x-hw*0.8,ty); ctx.lineTo(x+hw*0.8,ty); ctx.stroke();
  }
  ctx.restore();
  // Barn
  var bx=id==='farm1'?x-hw*0.2:id==='farm2'?x+hw*0.15:x;
  isoBox(ctx,bx,y,bh,'#e8c060','#c89040','#a07030');
  isoGableEW(ctx,bx,y,bh,12,'#8b3a2a','#7a2a1e','#681e16');
}

// ── Cobble ───────────────────────────────────────────────────────
function drawCobble(ctx,x,y,id,dir,b){
  var hw=HW*zoom,hh=HH*zoom;
  drawDiamond(ctx,x,y,'#7a7070',null);
  // Draw cobblestone texture
  ctx.save();
  clipDiamond(ctx,x,y);
  ctx.strokeStyle='rgba(60,50,50,0.5)';
  ctx.lineWidth=Math.max(0.5,zoom*0.8);
  var stones=[[0.25,0.5],[0.65,0.35],[0.45,0.75],[0.15,0.72],[0.75,0.65]];
  stones.forEach(function(s){
    var sx=x+(s[0]-0.5)*hw*2, sy=y+hh+s[1]*hh;
    ctx.beginPath();
    ctx.ellipse(sx,sy,hw*0.12*zoom,hh*0.18*zoom,0,0,Math.PI*2);
    ctx.stroke();
  });
  ctx.restore();
}

// ── Shop variants ────────────────────────────────────────────────
function drawShop(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  var pal = id==='shop1'?['#f0a830','#d08020','#b06010']:
            id==='shop2'?['#e05050','#c04040','#a03030']:
                         ['#50a0d0','#3880b0','#286090'];
  isoBox(ctx,x,y,bh,pal[0],pal[1],pal[2]);
  // Shop window (large)
  winL(ctx,x,y,zb,0.10,0.10,0.55,0.55,nightMode?'rgba(255,200,100,0.5)':'rgba(200,230,255,0.6)');
  winR(ctx,x,y,zb,0.10,0.10,0.55,0.55,nightMode?'rgba(255,200,100,0.5)':'rgba(200,230,255,0.6)');
  // Awning
  isoBox(ctx,x,y-bh*0.5*zoom,5,shadeC(pal[0],1.2),shadeC(pal[1],1.2),shadeC(pal[2],1.2));
  // Sign
  winR(ctx,x,y,zb,0.20,0.72,0.60,0.15,nightMode?'#ffff80':'#fff8d0');
}

// ── Hotel variants ───────────────────────────────────────────────
function drawHotel(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var col = id==='hotel1'?'#5a6a7a': id==='hotel2'?'#4a5a6a':'#7a6a5a';
  isoBox(ctx,x,y,bh,shadeC(col,1.4),col,shadeC(col,0.75));
  var rows=id==='hotel1'?3:id==='hotel2'?5:7;
  var wc=nightMode?'#ffe080':'#aad0f0';
  for(var i=0;i<rows;i++){
    var vv=0.12+(i/rows)*0.74;
    winL(ctx,x,y,zb,0.20,vv,0.22,0.09,wc);
    winL(ctx,x,y,zb,0.56,vv,0.22,0.09,wc);
    winR(ctx,x,y,zb,0.20,vv,0.22,0.09,wc);
    winR(ctx,x,y,zb,0.56,vv,0.22,0.09,wc);
  }
  // Roof penthouse
  isoBox(ctx,x,y-zb,id==='hotel3'?12:8,shadeC(col,1.0),shadeC(col,0.8),shadeC(col,0.6));
  // Entrance canopy
  isoBox(ctx,x,y-bh*0.12*zoom,4,shadeC(col,1.6),shadeC(col,1.3),shadeC(col,1.1));
}

// ── Factory variants ─────────────────────────────────────────────
function drawFactory(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom;
  isoBox(ctx,x,y,bh,'#c0b090','#a09070','#807050');
  // Industrial windows (horizontal slits)
  var rows=2;
  for(var i=0;i<rows;i++){
    var vv=0.25+i*0.35;
    winL(ctx,x,y,zb,0.10,vv,0.70,0.10,'#3a4a5a');
    winR(ctx,x,y,zb,0.10,vv,0.70,0.10,'#3a4a5a');
  }
  // Chimney(s)
  var nchi=id==='factory1'?1:id==='factory2'?2:3;
  for(var j=0;j<nchi;j++){
    var cx=x+(j-(nchi-1)/2)*hw*0.45;
    isoCylinder(ctx,cx,y-zb+8*zoom,bh*0.6,7,'#888880','#606058');
    // smoke puff
    if(nightMode){
      ctx.save(); ctx.globalAlpha=0.25;
      ctx.fillStyle='#cccccc';
      ctx.beginPath(); ctx.arc(cx,y-zb-bh*0.65*zoom,8*zoom,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
}

// ── Stadium ──────────────────────────────────────────────────────
function drawStadium(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  // Oval base
  isoBox(ctx,x,y,bh,'#90b060','#708040','#506030');
  // Inner field (green diamond)
  var s=cellToScreen(0,0); // re-use draw coords
  ctx.save();
  clipDiamond(ctx,x,y-zb);
  drawDiamond(ctx,x,y-zb,'#60a040',null);
  ctx.restore();
  // Stands (left and right walls, lighter)
  ctx.save();
  ctx.fillStyle='rgba(200,200,180,0.4)';
  ctx.fillRect(x-hw,y-zb,hw,hh*2);
  ctx.restore();
}

// ── Police / Fire ────────────────────────────────────────────────
function drawEmergency(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var col=id==='police'?'#3a4a8a':'#8a3a3a';
  var colL=id==='police'?'#2a3a7a':'#7a2a2a';
  var colR=id==='police'?'#1a2a6a':'#6a1a1a';
  isoBox(ctx,x,y,bh,shadeC(col,1.5),colL,colR);
  winL(ctx,x,y,zb,0.15,0.30,0.28,0.32,nightMode?'#ffe080':'#9ab0d0');
  winR(ctx,x,y,zb,0.15,0.30,0.28,0.32,nightMode?'#ffe080':'#9ab0d0');
  // Flag on roof
  var hw=HW*zoom,hh=HH*zoom;
  ctx.save();
  ctx.strokeStyle=nightMode?'#888':'#555';
  ctx.lineWidth=Math.max(1,zoom);
  ctx.beginPath(); ctx.moveTo(x,y-zb-2*zoom); ctx.lineTo(x,y-zb-12*zoom); ctx.stroke();
  ctx.fillStyle=id==='police'?'#2060d0':'#d02020';
  ctx.fillRect(x,y-zb-12*zoom,8*zoom,5*zoom);
  ctx.restore();
  isoGableEW(ctx,x,y,bh,10,shadeC(col,1.2),shadeC(col,0.9),shadeC(col,0.7));
}

// ── School variants ──────────────────────────────────────────────
function drawSchool(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  isoBox(ctx,x,y,bh,'#f0e8c0','#d8c898','#c0a878');
  var rows=id==='school1'?1:id==='school2'?2:3;
  var wc=nightMode?'#ffe080':'#90c0e0';
  for(var i=0;i<rows;i++){
    var vv=0.18+(i*0.28);
    winL(ctx,x,y,zb,0.12,vv,0.28,0.16,wc);
    winL(ctx,x,y,zb,0.50,vv,0.28,0.16,wc);
    winR(ctx,x,y,zb,0.12,vv,0.28,0.16,wc);
    winR(ctx,x,y,zb,0.50,vv,0.28,0.16,wc);
  }
  isoGableEW(ctx,x,y,bh,12,'#8a7a5a','#7a6a4a','#6a5a3a');
}

// ── Park variants ────────────────────────────────────────────────
function drawPark(ctx,x,y,id,dir,b){
  var hw=HW*zoom,hh=HH*zoom;
  // Grass base
  drawDiamond(ctx,x,y,nightMode?'#1a3018':'#3a7a30',null);
  // Trees
  var trees=id==='park1'?[[0,0]]:id==='park2'?[[-0.3,0],[0.3,0]]:[[0,-0.3],[-0.4,0.3],[0.4,0.2]];
  trees.forEach(function(t){
    var tx=x+t[0]*hw, ty=y+hh+t[1]*hh;
    // trunk
    ctx.save(); ctx.fillStyle='#7a5030';
    ctx.fillRect(tx-zoom,ty-b.bh*zoom+2*zoom,zoom*2,b.bh*zoom*0.5); ctx.restore();
    // canopy
    ctx.save(); ctx.fillStyle=nightMode?'#1a5020':'#3a9030';
    ctx.beginPath(); ctx.arc(tx,ty-b.bh*zoom+2*zoom,7*zoom,0,Math.PI*2); ctx.fill(); ctx.restore();
  });
}

// ── Hospital variants ────────────────────────────────────────────
function drawHospital(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  isoBox(ctx,x,y,bh,'#f0f0f0','#d0d0d0','#b0b0b0');
  var rows=id==='hospital1'?2:id==='hospital2'?3:4;
  var wc=nightMode?'#ffe080':'#90c0e0';
  for(var i=0;i<rows;i++){
    var vv=0.15+(i/(rows))*0.68;
    winL(ctx,x,y,zb,0.12,vv,0.22,0.10,wc);
    winL(ctx,x,y,zb,0.44,vv,0.22,0.10,wc);
    winR(ctx,x,y,zb,0.12,vv,0.22,0.10,wc);
    winR(ctx,x,y,zb,0.44,vv,0.22,0.10,wc);
  }
  // Red cross on roof
  var hw=HW*zoom,hh=HH*zoom;
  ctx.save();
  ctx.fillStyle='#d02020';
  ctx.fillRect(x-1.5*zoom,y-zb-10*zoom,3*zoom,10*zoom);
  ctx.fillRect(x-5*zoom,y-zb-7*zoom,10*zoom,3*zoom);
  ctx.restore();
  // Flat roof
  isoBox(ctx,x,y-zb,5,'#ddd','#bbb','#999');
}

// ── Museum variants ──────────────────────────────────────────────
function drawMuseum(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  isoBox(ctx,x,y,bh,'#d4c8b0','#b8a890','#9a8c78');
  winL(ctx,x,y,zb,0.20,0.28,0.22,0.35,'#6080a0');
  winR(ctx,x,y,zb,0.20,0.28,0.22,0.35,'#6080a0');
  // Pillars (left face)
  ctx.save();
  ctx.strokeStyle=shadeC('#c8b898',0.8); ctx.lineWidth=Math.max(1,zoom*1.5);
  [0.15,0.40,0.65,0.90].forEach(function(u){
    ctx.beginPath();
    ctx.moveTo(x-hw+u*hw, y+hh-u*hh);
    ctx.lineTo(x-hw+u*hw, y+hh-u*hh-zb);
    ctx.stroke();
  });
  ctx.restore();
  // Pediment (gable front)
  isoGableEW(ctx,x,y,bh,14,'#c8b898','#a8987a','#8a7a60');
}

// ── Landmarks ────────────────────────────────────────────────────
function drawLandmark1(ctx,x,y,id,dir,b){ // Pyramid
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  // Ground base
  drawDiamond(ctx,x,y,'#d4b060',null);
  // Pyramid faces
  var tip={x:x,y:y-zb};
  var N={x:x,y:y},E={x:x+hw,y:y+hh},S={x:x,y:y+hh*2},W={x:x-hw,y:y+hh};
  ctx.beginPath(); ctx.moveTo(N.x,N.y); ctx.lineTo(E.x,E.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle='#d4a030'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(E.x,E.y); ctx.lineTo(S.x,S.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle='#b88020'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(S.x,S.y); ctx.lineTo(W.x,W.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle='#c89028'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(W.x,W.y); ctx.lineTo(N.x,N.y); ctx.lineTo(tip.x,tip.y); ctx.closePath(); ctx.fillStyle='#e0b040'; ctx.fill();
  // Cap stone
  ctx.save(); ctx.fillStyle='#fff8c0';
  ctx.beginPath(); ctx.arc(tip.x,tip.y,3*zoom,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawLandmark2(ctx,x,y,id,dir,b){ // Tower (Eiffel-style)
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  // Lattice legs
  ctx.save();
  ctx.strokeStyle='#8a7a5a'; ctx.lineWidth=Math.max(1.5,zoom*2);
  var legW=hw*0.4;
  // 4 legs converging to top
  [[x-legW,y+hh],[x+legW,y+hh],[x-legW/2,y+hh*0.5],[x+legW/2,y+hh*0.5]].forEach(function(from,i){
    ctx.beginPath(); ctx.moveTo(from[0],from[1]); ctx.lineTo(x,y-zb*0.8); ctx.stroke();
  });
  // Cross beams
  [0.3,0.55,0.78].forEach(function(t){
    var ty=y+hh-t*zb;
    var wx=legW*(1-t);
    ctx.beginPath(); ctx.moveTo(x-wx,ty+wx*0.5); ctx.lineTo(x+wx,ty+wx*0.5); ctx.stroke();
  });
  ctx.restore();
  // Top spire
  ctx.save(); ctx.fillStyle='#7a6a4a';
  ctx.beginPath(); ctx.moveTo(x,y-zb); ctx.lineTo(x-3*zoom,y-zb+8*zoom); ctx.lineTo(x+3*zoom,y-zb+8*zoom); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawLandmark3(ctx,x,y,id,dir,b){ // Mosque
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  isoBox(ctx,x,y,bh,'#e8dcc8','#c8bca8','#a89c88');
  // Arched windows
  winL(ctx,x,y,zb,0.20,0.25,0.22,0.38,'#6090b0');
  winR(ctx,x,y,zb,0.20,0.25,0.22,0.38,'#6090b0');
  // Dome
  ctx.save();
  ctx.fillStyle='#70a080';
  ctx.beginPath(); ctx.ellipse(x,y-zb,hw*0.45,hh*1.2,0,Math.PI,0); ctx.fill();
  ctx.fillStyle=shadeC('#70a080',0.8);
  ctx.beginPath(); ctx.ellipse(x,y-zb,hw*0.45,hh*1.2,0,0,Math.PI); ctx.fill();
  ctx.restore();
  // Minarets
  [x-hw*0.6,x+hw*0.6].forEach(function(mx){
    isoCylinder(ctx,mx,y-zb+hh,bh*0.55,5,'#c8d8c0','#90a088');
  });
}

// ── Station variants ─────────────────────────────────────────────
function drawStation(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  isoBox(ctx,x,y,bh,'#e0d8c8','#c0b8a8','#a09888');
  winL(ctx,x,y,zb,0.15,0.22,0.28,0.35,'#8090a8');
  winR(ctx,x,y,zb,0.15,0.22,0.28,0.35,'#8090a8');
  isoGableEW(ctx,x,y,bh,16,'#707880','#505860','#404850');
  // Platform
  drawDiamond(ctx,x+hw*0.5,y+hh,'#b0a090',null);
  // Clock on side
  ctx.save();
  ctx.fillStyle='#f0f0e0'; ctx.strokeStyle='#808080'; ctx.lineWidth=zoom;
  ctx.beginPath(); ctx.arc(x+hw*0.5,y-zb*0.5,4*zoom,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ── Port variants ────────────────────────────────────────────────
function drawPort(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  // Pier base
  drawDiamond(ctx,x,y,'#8a7860',null);
  // Warehouse
  isoBox(ctx,x-hw*0.2,y,bh,'#d0c0a0','#b09880','#907860');
  // Crane arm
  ctx.save();
  ctx.strokeStyle='#808090'; ctx.lineWidth=Math.max(1.5,zoom*1.8);
  ctx.beginPath();
  ctx.moveTo(x+hw*0.5,y-zb);
  ctx.lineTo(x+hw*0.5,y-zb-20*zoom);
  ctx.lineTo(x+hw*1.2,y-zb-20*zoom);
  ctx.stroke();
  // Hanging cable
  ctx.strokeStyle='#606070'; ctx.lineWidth=zoom;
  ctx.beginPath(); ctx.moveTo(x+hw*1.2,y-zb-20*zoom); ctx.lineTo(x+hw*1.2,y-zb-6*zoom); ctx.stroke();
  ctx.restore();
  // Anchor icon
  ctx.save(); ctx.font=Math.max(10,zoom*14)+'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('⚓',x+hw*0.5,y-zb-5*zoom);
  ctx.restore();
}

// ── Airport variants ─────────────────────────────────────────────
function drawAirport(ctx,x,y,id,dir,b){
  var bh=b.bh, zb=bh*zoom;
  var hw=HW*zoom,hh=HH*zoom;
  // Terminal
  isoBox(ctx,x,y,bh,'#d0dce8','#a8b8c8','#8898a8');
  // Glass front
  winL(ctx,x,y,zb,0.05,0.08,0.86,0.55,'rgba(180,210,240,0.5)');
  // Control tower
  isoBox(ctx,x+hw*0.6,y-zb+hh,bh*0.8,'#c0c8d0','#9098a0','#707880');
  // Runway marker
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,0.2)';
  ctx.fillRect(x-hw*0.1,y+hh*1.5,hw*0.2,hh*0.5);
  ctx.restore();
  // Plane icon
  ctx.save(); ctx.font=Math.max(10,zoom*12)+'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('✈',x,y-zb-8*zoom);
  ctx.restore();
}

// ── Fountain ─────────────────────────────────────────────────────
function drawFountain(ctx,x,y,id,dir,b){
  var zb=b.bh*zoom, hw=HW*zoom, hh=HH*zoom;
  // Pool
  drawDiamond(ctx,x,y,nightMode?'#1a3050':'#2060a0','rgba(100,160,200,0.5)',1);
  // Basin
  isoBox(ctx,x,y,8,'#9ab0c0','#7a9090','#5a7070');
  // Water spout (cylinder)
  isoCylinder(ctx,x,y-8*zoom,b.bh*0.5,4,'#80c0e0','#5090b0');
  // Spray
  ctx.save(); ctx.globalAlpha=0.6; ctx.fillStyle='#a0d0f0';
  for(var i=0;i<5;i++){
    var ang=i*Math.PI*0.4;
    var dx=Math.cos(ang)*8*zoom, dy=Math.sin(ang)*4*zoom-zb;
    ctx.beginPath(); ctx.arc(x+dx,y+dy,2*zoom,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ── DRAW_FNS dispatch table ───────────────────────────────────────
var DRAW_FNS = {
  house1: drawHouse1, house2: drawHouse2, house3: drawHouse3,
  house4: drawHouse4, house5: drawHouse5,
  apt1:   drawApt, apt2:   drawApt, apt3:   drawApt,
  castle1:drawCastle, castle2:drawCastle, castle3:drawCastle,
  church1:drawChurch, church2:drawChurch, church3:drawChurch,
  farm1:  drawFarm, farm2:  drawFarm, farm3:  drawFarm,
  cobble: drawCobble,
  shop1:  drawShop, shop2:  drawShop, shop3:  drawShop,
  hotel1: drawHotel, hotel2: drawHotel, hotel3: drawHotel,
  factory1:drawFactory, factory2:drawFactory, factory3:drawFactory,
  stadium: drawStadium,
  police:  drawEmergency, fire: drawEmergency,
  school1:drawSchool, school2:drawSchool, school3:drawSchool,
  park1:  drawPark, park2:  drawPark, park3:  drawPark,
  hospital1:drawHospital, hospital2:drawHospital, hospital3:drawHospital,
  museum1:drawMuseum, museum2:drawMuseum, museum3:drawMuseum,
  landmark1:drawLandmark1, landmark2:drawLandmark2, landmark3:drawLandmark3,
  station1:drawStation, station2:drawStation, station3:drawStation,
  port1:  drawPort, port2:  drawPort, port3:  drawPort,
  airport1:drawAirport, airport2:drawAirport, airport3:drawAirport,
  fountain:drawFountain
};
