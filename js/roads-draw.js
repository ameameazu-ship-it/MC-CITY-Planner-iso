/**
 * roads-draw.js  v3.1
 * 修正: 橋の手すり・アーチを進行方向に沿うよう修正
 */

var RD_LIGHT_INTERVAL = 4;
var BR_G2_MIN   = 3;
var BR_G3_MIN   = 6;
var BR_THICKNESS = 3;
var BR_RAIL_H   = 5;
var BR_TOWER_H  = 22;
var BR_CABLE_SAG = 0.45;

function getBridgeInfo(c, r, id) {
  var hw = isHwy(id);
  function isSame(c2, r2) {
    if (!inGrid(c2, r2)) return false;
    var cell = getCell(c2, r2);
    if (!cell) return false;
    return isBridge(cell.id) && isHwy(cell.id) === hw;
  }
  var nsN=0, nsS=0, ewW=0, ewE=0;
  for (var i=1; isSame(c,   r-i); i++) nsN++;
  for (var i=1; isSame(c,   r+i); i++) nsS++;
  for (var i=1; isSame(c-i, r  ); i++) ewW++;
  for (var i=1; isSame(c+i, r  ); i++) ewE++;
  var nsSpan=nsN+1+nsS, ewSpan=ewW+1+ewE;
  if (nsSpan>=ewSpan) return {dir:'ns',span:nsSpan,pos:nsN};
  else                return {dir:'ew',span:ewSpan,pos:ewW};
}

function getBridgeGrade(span) {
  return span<BR_G2_MIN?1:span<BR_G3_MIN?2:3;
}

function roadNeighbours(c, r, id) {
  var rl=isRail(id), cb=!!(BLOCKS[id]&&BLOCKS[id].cobble)||id==='cobble';
  function match(c2,r2){
    var cell=getCell(c2,r2); if(!cell)return false;
    var cid=cell.id, ccb=!!(BLOCKS[cid]&&BLOCKS[cid].cobble)||cid==='cobble';
    if(cb)return ccb; if(ccb)return false; if(!isRoad(cid))return false;
    if(isRail(cid)!==rl)return false; return true;
  }
  return {N:match(c,r-1),E:match(c+1,r),S:match(c,r+1),W:match(c-1,r)};
}

function _rdPts(x,y,hw,hh){
  return {cx:x,cy:y+hh,mN:{x:x+hw*0.5,y:y+hh*0.5},mE:{x:x+hw*0.5,y:y+hh*1.5},mS:{x:x-hw*0.5,y:y+hh*1.5},mW:{x:x-hw*0.5,y:y+hh*0.5}};
}
function _rdPerp(hw,hh){
  var len=Math.sqrt(hw*hw+hh*hh);
  return {ns:{dx:hh/len,dy:hw/len},ew:{dx:hh/len,dy:-hw/len},len:len};
}
function _rdLine(ctx,ax,ay,bx,by){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();}
function _rdEnds(nb,p){
  return {fromN:nb.N?p.mN:{x:p.cx,y:p.cy},toS:nb.S?p.mS:{x:p.cx,y:p.cy},fromW:nb.W?p.mW:{x:p.cx,y:p.cy},toE:nb.E?p.mE:{x:p.cx,y:p.cy}};
}

function _rdRoad(ctx,x,y,hw,hh,nb){
  var p=_rdPts(x,y,hw,hh),hasNS=nb.N||nb.S,hasEW=nb.E||nb.W,ends=_rdEnds(nb,p);
  ctx.strokeStyle='rgba(255,255,255,0.80)';ctx.lineWidth=Math.max(0.7,zoom*1.1);ctx.setLineDash([5*zoom,4*zoom]);
  if(!hasNS&&!hasEW){_rdLine(ctx,p.mN.x,p.mN.y,p.mS.x,p.mS.y);_rdLine(ctx,p.mW.x,p.mW.y,p.mE.x,p.mE.y);}
  else{if(hasNS)_rdLine(ctx,ends.fromN.x,ends.fromN.y,ends.toS.x,ends.toS.y);if(hasEW)_rdLine(ctx,ends.fromW.x,ends.fromW.y,ends.toE.x,ends.toE.y);}
  ctx.setLineDash([]);
}

function _rdHighway(ctx,x,y,hw,hh,nb){
  var p=_rdPts(x,y,hw,hh),perp=_rdPerp(hw,hh),off=zoom*2.2,hasNS=nb.N||nb.S,hasEW=nb.E||nb.W,ends=_rdEnds(nb,p);
  ctx.strokeStyle='rgba(255,215,50,0.95)';ctx.lineWidth=Math.max(0.8,zoom*1.2);ctx.setLineDash([]);
  for(var s=-1;s<=1;s+=2){
    if(hasNS||(!hasNS&&!hasEW))_rdLine(ctx,ends.fromN.x+s*off*perp.ns.dx,ends.fromN.y+s*off*perp.ns.dy,ends.toS.x+s*off*perp.ns.dx,ends.toS.y+s*off*perp.ns.dy);
    if(hasEW||(!hasNS&&!hasEW))_rdLine(ctx,ends.fromW.x+s*off*perp.ew.dx,ends.fromW.y+s*off*perp.ew.dy,ends.toE.x+s*off*perp.ew.dx,ends.toE.y+s*off*perp.ew.dy);
  }
}

function _rdCobble(ctx,x,y,hw,hh){
  var sz=Math.max(3,zoom*6.5),perp=_rdPerp(hw,hh),len=perp.len,cx=x,cy=y+hh,n=Math.ceil(len/sz)+3;
  ctx.strokeStyle='rgba(50,35,25,0.38)';ctx.lineWidth=Math.max(0.4,zoom*0.7);ctx.setLineDash([]);
  for(var i=-n;i<=n;i++){var px=cx+i*sz*perp.ew.dx,py=cy+i*sz*perp.ew.dy;_rdLine(ctx,px-hw,py-hh,px+hw,py+hh);}
  for(var j=-n;j<=n;j++){var bo=(j%2!==0)?sz*0.5:0,px2=cx+j*sz*perp.ns.dx+bo*hw/len,py2=cy+j*sz*perp.ns.dy+bo*hh/len;_rdLine(ctx,px2+hw,py2-hh,px2-hw,py2+hh);}
}

function _rdRail(ctx,x,y,hw,hh,nb){
  var p=_rdPts(x,y,hw,hh),perp=_rdPerp(hw,hh),rOff=zoom*3.5,tHx=zoom*4.8,tc=5;
  var hasNS=nb.N||nb.S,hasEW=nb.E||nb.W,iso=!hasNS&&!hasEW;
  var fromN=nb.N?p.mN:(iso?p.mN:{x:p.cx,y:p.cy}),toS=nb.S?p.mS:(iso?p.mS:{x:p.cx,y:p.cy});
  var fromW=nb.W?p.mW:{x:p.cx,y:p.cy},toE=nb.E?p.mE:{x:p.cx,y:p.cy};
  ctx.strokeStyle='rgba(140,110,80,0.82)';ctx.lineWidth=Math.max(0.8,zoom*1.3);ctx.setLineDash([]);
  for(var t=0;t<tc;t++){var f=(t+0.5)/tc;
    if(hasNS||iso){var tx=fromN.x+(toS.x-fromN.x)*f,ty=fromN.y+(toS.y-fromN.y)*f;_rdLine(ctx,tx+tHx*perp.ns.dx,ty+tHx*perp.ns.dy,tx-tHx*perp.ns.dx,ty-tHx*perp.ns.dy);}
    if(hasEW){var tx2=fromW.x+(toE.x-fromW.x)*f,ty2=fromW.y+(toE.y-fromW.y)*f;_rdLine(ctx,tx2+tHx*perp.ew.dx,ty2+tHx*perp.ew.dy,tx2-tHx*perp.ew.dx,ty2-tHx*perp.ew.dy);}
  }
  ctx.strokeStyle='rgba(205,190,170,0.92)';ctx.lineWidth=Math.max(0.7,zoom*1.0);
  for(var s=-1;s<=1;s+=2){
    if(hasNS||iso)_rdLine(ctx,fromN.x+s*rOff*perp.ns.dx,fromN.y+s*rOff*perp.ns.dy,toS.x+s*rOff*perp.ns.dx,toS.y+s*rOff*perp.ns.dy);
    if(hasEW)_rdLine(ctx,fromW.x+s*rOff*perp.ew.dx,fromW.y+s*rOff*perp.ew.dy,toE.x+s*rOff*perp.ew.dx,toE.y+s*rOff*perp.ew.dy);
  }
}

function _rdLight(ctx,c,r,x,y,hw,hh,nb){
  var hasNS=nb.N||nb.S,hasEW=nb.E||nb.W;
  var show=(hasNS&&hasEW)||(hasNS&&r%RD_LIGHT_INTERVAL===0)||(hasEW&&c%RD_LIGHT_INTERVAL===0);
  if(!show)return;
  var glR=26*zoom;ctx.save();ctx.globalCompositeOperation='screen';
  var grd=ctx.createRadialGradient(x,y+hh-4*zoom,0,x,y+hh-4*zoom,glR);
  grd.addColorStop(0,'rgba(255,225,130,0.62)');grd.addColorStop(0.35,'rgba(255,200,80,0.28)');grd.addColorStop(1,'rgba(255,170,40,0.00)');
  ctx.fillStyle=grd;ctx.fillRect(x-glR,y+hh-glR-4*zoom,glR*2,glR*2);ctx.restore();
}

function _brSurf(id){return isHwy(id)?'#484848':'#5e5e5e';}

function _drawDeckThickness(ctx,x,y,hw,hh,surfC){
  var T=BR_THICKNESS*zoom;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-hw,y+hh);ctx.lineTo(x-hw,y+hh+T);ctx.lineTo(x,y+T);ctx.closePath();ctx.fillStyle=shadeC(surfC,0.60);ctx.fill();
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+hw,y+hh);ctx.lineTo(x+hw,y+hh+T);ctx.lineTo(x,y+T);ctx.closePath();ctx.fillStyle=shadeC(surfC,0.48);ctx.fill();
}

function _cableH(t,tH,sag){return tH-sag*4*t*(1-t);}
function _brT(pos,span){return (span<=1)?0:pos/(span-1);}

// ガードレール共通: from→to (進行方向) に平行に両サイド手すりを描く
function _drawRails(ctx,from,to,pd,halfW,railH,railC,postC){
  ctx.setLineDash([]);
  for(var s=-1;s<=1;s+=2){
    var ox=s*halfW*pd.dx,oy=s*halfW*pd.dy;
    var fx=from.x+ox,fy=from.y+oy,tx=to.x+ox,ty=to.y+oy;
    ctx.strokeStyle=railC;ctx.lineWidth=Math.max(0.7,zoom*1.0);
    ctx.beginPath();ctx.moveTo(fx,fy-railH);ctx.lineTo(tx,ty-railH);ctx.stroke();
    ctx.lineWidth=Math.max(0.5,zoom*0.7);
    for(var k=0;k<3;k++){
      var t2=(k+0.5)/3,px2=fx+(tx-fx)*t2,py2=fy+(ty-fy)*t2;
      ctx.strokeStyle=postC;ctx.beginPath();ctx.moveTo(px2,py2);ctx.lineTo(px2,py2-railH);ctx.stroke();
    }
  }
}

// Grade 1
function drawBridgeTile_G1(ctx,x,y,hw,hh,id,spanInfo){
  var surfC=_brSurf(id),isNS=spanInfo.dir==='ns',perp=_rdPerp(hw,hh),p=_rdPts(x,y,hw,hh),railH=BR_RAIL_H*zoom;
  drawDiamond(ctx,x,y,surfC,null);_drawDeckThickness(ctx,x,y,hw,hh,surfC);
  ctx.save();clipDiamond(ctx,x,y);
  var nb={N:isNS,S:isNS,E:!isNS,W:!isNS};
  if(isHwy(id))_rdHighway(ctx,x,y,hw,hh,nb);else _rdRoad(ctx,x,y,hw,hh,nb);
  ctx.restore();
  _drawRails(ctx,isNS?p.mN:p.mW,isNS?p.mS:p.mE,isNS?perp.ns:perp.ew,hw*0.42,railH,'#b4b4b4','#c0c0c0');
}

// Grade 2
function drawBridgeTile_G2(ctx,x,y,hw,hh,id,spanInfo){
  var surfC=isHwy(id)?'#5a5040':'#8c7c6c',wallC=shadeC(surfC,0.68),archC=shadeC(surfC,0.55);
  var isNS=spanInfo.dir==='ns',perp=_rdPerp(hw,hh),p=_rdPts(x,y,hw,hh);
  var railH=(BR_RAIL_H+2)*zoom,T=(BR_THICKNESS+2)*zoom;
  drawDiamond(ctx,x,y,surfC,null);
  ctx.save();clipDiamond(ctx,x,y);_rdCobble(ctx,x,y,hw,hh);ctx.restore();
  if(isHwy(id)){ctx.save();clipDiamond(ctx,x,y);_rdHighway(ctx,x,y,hw,hh,{N:isNS,S:isNS,E:!isNS,W:!isNS});ctx.restore();}
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-hw,y+hh);ctx.lineTo(x-hw,y+hh+T);ctx.lineTo(x,y+T);ctx.closePath();ctx.fillStyle=wallC;ctx.fill();
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+hw,y+hh);ctx.lineTo(x+hw,y+hh+T);ctx.lineTo(x,y+T);ctx.closePath();ctx.fillStyle=archC;ctx.fill();
  ctx.strokeStyle='rgba(40,28,14,0.30)';ctx.lineWidth=Math.max(0.4,zoom*0.6);
  for(var li=1;li<=2;li++){var lf=li/3;ctx.beginPath();ctx.moveTo(x-hw*lf,y+hh*lf);ctx.lineTo(x-hw*lf,y+hh*lf+T);ctx.stroke();ctx.beginPath();ctx.moveTo(x+hw*lf,y+hh*lf);ctx.lineTo(x+hw*lf,y+hh*lf+T);ctx.stroke();}
  var from=isNS?p.mN:p.mW,to=isNS?p.mS:p.mE,pd=isNS?perp.ns:perp.ew,halfW=hw*0.44,archH=railH+4*zoom;
  ctx.setLineDash([]);
  for(var s=-1;s<=1;s+=2){
    var ox=s*halfW*pd.dx,oy=s*halfW*pd.dy,fx=from.x+ox,fy=from.y+oy,tx2=to.x+ox,ty2=to.y+oy,mx=(fx+tx2)/2,my=(fy+ty2)/2;
    ctx.strokeStyle='#a09070';ctx.lineWidth=Math.max(1.2,zoom*1.6);
    ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-railH);ctx.stroke();
    ctx.beginPath();ctx.moveTo(tx2,ty2);ctx.lineTo(tx2,ty2-railH);ctx.stroke();
    ctx.strokeStyle='#c0a880';ctx.lineWidth=Math.max(0.8,zoom*1.1);
    ctx.beginPath();ctx.moveTo(fx,fy-railH);ctx.quadraticCurveTo(mx,my-archH,tx2,ty2-railH);ctx.stroke();
  }
}

// Grade 3
function drawBridgeTile_G3(ctx,x,y,hw,hh,id,spanInfo){
  var surfC=_brSurf(id),cableC=isHwy(id)?'rgba(255,210,60,0.92)':'rgba(210,210,210,0.92)';
  var towC=isHwy(id)?'#7a6838':'#686868',isNS=spanInfo.dir==='ns';
  var perp=_rdPerp(hw,hh),p=_rdPts(x,y,hw,hh);
  var tH=BR_TOWER_H*zoom,sag=tH*BR_CABLE_SAG,pos=spanInfo.pos,span=spanInfo.span;
  var isStart=pos===0,isEnd=pos===span-1;
  drawDiamond(ctx,x,y,surfC,null);_drawDeckThickness(ctx,x,y,hw,hh,surfC);
  ctx.save();clipDiamond(ctx,x,y);
  var nb={N:isNS,S:isNS,E:!isNS,W:!isNS};
  if(isHwy(id))_rdHighway(ctx,x,y,hw,hh,nb);else _rdRoad(ctx,x,y,hw,hh,nb);
  ctx.restore();
  if(isStart||isEnd){
    var tw=Math.max(2,zoom*2.5),tbx=p.cx,tby=p.cy,top_y=tby-tH;
    ctx.fillStyle=towC;ctx.beginPath();ctx.moveTo(tbx,tby);ctx.lineTo(tbx-tw,tby-tw*0.5);ctx.lineTo(tbx-tw,top_y-tw*0.5);ctx.lineTo(tbx,top_y);ctx.closePath();ctx.fill();
    ctx.fillStyle=shadeC(towC,0.75);ctx.beginPath();ctx.moveTo(tbx,tby);ctx.lineTo(tbx+tw,tby-tw*0.5);ctx.lineTo(tbx+tw,top_y-tw*0.5);ctx.lineTo(tbx,top_y);ctx.closePath();ctx.fill();
    ctx.fillStyle=shadeC(towC,1.3);ctx.beginPath();ctx.moveTo(tbx,top_y);ctx.lineTo(tbx+tw,top_y-tw*0.5);ctx.lineTo(tbx,top_y-tw);ctx.lineTo(tbx-tw,top_y-tw*0.5);ctx.closePath();ctx.fill();
    ctx.strokeStyle=shadeC(towC,1.1);ctx.lineWidth=Math.max(0.8,zoom*1.0);ctx.beginPath();ctx.moveTo(tbx-tw*1.6,top_y+tH*0.35-tw*0.5);ctx.lineTo(tbx+tw*1.6,top_y+tH*0.35-tw*0.5);ctx.stroke();
    if(nightMode){ctx.save();ctx.globalCompositeOperation='screen';var glr=ctx.createRadialGradient(tbx,top_y,0,tbx,top_y,10*zoom);glr.addColorStop(0,'rgba(255,230,120,0.70)');glr.addColorStop(1,'rgba(255,200,60,0.00)');ctx.fillStyle=glr;ctx.fillRect(tbx-10*zoom,top_y-10*zoom,20*zoom,20*zoom);ctx.restore();}
  }
  var entPt=isNS?p.mN:p.mW,extPt=isNS?p.mS:p.mE;
  var t_ent=(pos-0.5)/(span-1),t_ext=(pos+0.5)/(span-1);
  if(isStart)t_ent=0;if(isEnd)t_ext=1;
  var h_ent=_cableH(t_ent,tH,sag),h_ext=_cableH(t_ext,tH,sag);
  ctx.strokeStyle=cableC;ctx.lineWidth=Math.max(0.8,zoom*1.2);ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(entPt.x,entPt.y-h_ent);ctx.lineTo(extPt.x,extPt.y-h_ext);ctx.stroke();
  if(!isStart&&!isEnd){var t_mid=_brT(pos,span),h_mid=_cableH(t_mid,tH,sag);ctx.strokeStyle=cableC.replace('0.92','0.55');ctx.lineWidth=Math.max(0.5,zoom*0.7);ctx.beginPath();ctx.moveTo(p.cx,p.cy-h_mid);ctx.lineTo(p.cx,p.cy);ctx.stroke();}
  if(isStart||isEnd){var ancPt=isStart?entPt:extPt,anch=isStart?h_ent:h_ext;ctx.fillStyle=towC;ctx.beginPath();ctx.arc(ancPt.x,ancPt.y-anch,zoom*2.0,0,Math.PI*2);ctx.fill();}
  _drawRails(ctx,isNS?p.mN:p.mW,isNS?p.mS:p.mE,isNS?perp.ns:perp.ew,hw*0.38,Math.max(1.5,zoom*2.0),'rgba(180,180,180,0.70)','rgba(180,180,180,0.70)');
}

function drawRoad(ctx,c,r,x,y,id){
  var hw=HW*zoom,hh=HH*zoom,BR=isBridge(id),RL=isRail(id),CB=!!(BLOCKS[id]&&BLOCKS[id].cobble)||id==='cobble';
  if(BR){
    var info=getBridgeInfo(c,r,id),grade=getBridgeGrade(info.span);
    if(grade===1)drawBridgeTile_G1(ctx,x,y,hw,hh,id,info);
    else if(grade===2)drawBridgeTile_G2(ctx,x,y,hw,hh,id,info);
    else drawBridgeTile_G3(ctx,x,y,hw,hh,id,info);
    if(nightMode&&grade<3)_rdLight(ctx,c,r,x,y,hw,hh,{N:true,S:true,E:false,W:false});
    return;
  }
  var surfC=RL?'#706868':CB?'#8c7c6c':isHwy(id)?'#484848':'#5e5e5e';
  drawDiamond(ctx,x,y,surfC,null);
  var nb=roadNeighbours(c,r,id);
  ctx.save();clipDiamond(ctx,x,y);
  if(RL)_rdRail(ctx,x,y,hw,hh,nb);
  else if(CB)_rdCobble(ctx,x,y,hw,hh);
  else if(isHwy(id))_rdHighway(ctx,x,y,hw,hh,nb);
  else _rdRoad(ctx,x,y,hw,hh,nb);
  ctx.restore();
  if(nightMode&&!RL)_rdLight(ctx,c,r,x,y,hw,hh,nb);
}

function patchDrawBlock(){
  var _orig=drawBlock;
  drawBlock=function(ctx,c,r,x,y,id,dir){
    var b=BLOCKS[id];if(!b)return;
    if(isRoad(id)||id==='cobble'||(b&&b.cobble)){drawRoad(ctx,c,r,x,y,id);}
    else{_orig(ctx,c,r,x,y,id,dir);}
  };
}
