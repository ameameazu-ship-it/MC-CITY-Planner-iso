/**
 * roads-draw.js
 * Draws roads, highways, bridges, and railways in isometric view.
 * Roads auto-connect to neighbours and adapt their shape.
 */

// ── Neighbour detection ───────────────────────────────────────────
function roadNeighbours(c,r,id){
  var myHw = isHwy(id);
  // Returns {N,E,S,W} booleans - is there a matching road in that direction?
  function match(c2,r2){
    var cell=getCell(c2,r2);
    if(!cell) return false;
    if(!isRoad(cell.id)) return false;
    // Rail only connects to rail
    if(isRail(id) !== isRail(cell.id)) return false;
    return true;
  }
  return {
    N: match(c,r-1),
    S: match(c,r+1),
    W: match(c-1,r),
    E: match(c+1,r)
  };
}

// ── Road tile drawing ─────────────────────────────────────────────
function drawRoad(ctx,x,y,id,dir,b){
  var hw=HW*zoom, hh=HH*zoom;
  var nb = roadNeighbours( /* we need c,r here – pass via closure in main */ -1,-1, id);
  // Fallback: nb passed via _roadCtx set before call
  if(window._roadCtx){ nb=window._roadCtx.nb; }

  var isHW  = isHwy(id);
  var isBR  = isBridge(id);
  var isRL  = isRail(id);

  // Colours
  var surfC  = isRL  ? '#888090' :
               isHW  ? '#a09070' :
               isBR  ? '#c07060' : '#606060';
  var baseC  = isRL  ? '#6a6060' :
               isHW  ? '#807050' :
               isBR  ? '#7a3a2a' : '#484848';
  var lineC  = isRL  ? '#d0c8b0' :
               isHW  ? 'rgba(255,220,80,0.9)' :
               isBR  ? 'rgba(255,180,160,0.85)' : 'rgba(255,255,255,0.7)';

  // Ground tile (road surface)
  drawDiamond(ctx,x,y,surfC,null);

  // If bridge: draw side walls
  if(isBR){
    var bh=b.bh;
    // Left wall
    ctx.beginPath();
    ctx.moveTo(x,y); ctx.lineTo(x-hw,y+hh);
    ctx.lineTo(x-hw,y+hh+bh*zoom); ctx.lineTo(x,y+bh*zoom);
    ctx.closePath(); ctx.fillStyle=shadeC(baseC,0.7); ctx.fill();
    // Right wall
    ctx.beginPath();
    ctx.moveTo(x,y); ctx.lineTo(x+hw,y+hh);
    ctx.lineTo(x+hw,y+hh+bh*zoom); ctx.lineTo(x,y+bh*zoom);
    ctx.closePath(); ctx.fillStyle=shadeC(baseC,0.55); ctx.fill();
    // Re-draw top surface
    drawDiamond(ctx,x,y,surfC,null);
  }

  // Centre line(s)
  var cnt = nb.N||nb.S||nb.E||nb.W ? 0 : 1;
  // Determine orientation
  var horiz = (nb.E||nb.W) && !(nb.N||nb.S);
  var vert  = (nb.N||nb.S) && !(nb.E||nb.W);

  ctx.save();
  clipDiamond(ctx,x,y);
  ctx.strokeStyle=lineC;

  if(isRL){
    // Rail: two parallel lines
    ctx.lineWidth=Math.max(1,zoom*1.4);
    var offsets=[-0.22,0.22];
    offsets.forEach(function(off){
      ctx.beginPath();
      ctx.moveTo(x+off*hw,y+hh*(1-off));
      ctx.lineTo(x+off*hw,y+hh*(1+off));
      ctx.stroke();
    });
    // Cross-ties
    ctx.lineWidth=Math.max(1,zoom*1.2);
    for(var i=0;i<4;i++){
      var ty=y+hh*0.2+i*hh*0.4;
      ctx.beginPath();
      ctx.moveTo(x-hw*0.5,ty+hh*0.3);
      ctx.lineTo(x+hw*0.5,ty+hh*0.7);
      ctx.stroke();
    }
  } else {
    // Dashed centre line
    ctx.lineWidth=Math.max(0.8,zoom*1.2);
    ctx.setLineDash([6*zoom,5*zoom]);
    if(!horiz){
      // NS direction line
      ctx.beginPath(); ctx.moveTo(x,y+hh*0.1); ctx.lineTo(x,y+hh*1.9); ctx.stroke();
    }
    if(!vert){
      // EW direction line
      ctx.beginPath(); ctx.moveTo(x-hw*0.9,y+hh); ctx.lineTo(x+hw*0.9,y+hh); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.restore();

  // Night: street light glow at intersections
  if(nightMode && (nb.N||nb.S) && (nb.E||nb.W)){
    ctx.save();
    ctx.globalCompositeOperation='screen';
    var grd=ctx.createRadialGradient(x,y+hh,0,x,y+hh,20*zoom);
    grd.addColorStop(0,'rgba(255,200,100,0.3)');
    grd.addColorStop(1,'rgba(255,200,100,0)');
    ctx.fillStyle=grd; ctx.fillRect(x-20*zoom,y,40*zoom,hh*2);
    ctx.restore();
  }
}

// ── Register in DRAW_FNS ─────────────────────────────────────────
// (called from iso-engine.js drawBlock)
// We wrap so we can pass c,r context
function _makeRoadDrawer(c0,r0){
  return function(ctx,x,y,id,dir,b){
    window._roadCtx={ nb: roadNeighbours(c0,r0,id) };
    drawRoad(ctx,x,y,id,dir,b);
    window._roadCtx=null;
  };
}

// Patch iso-engine drawBlock to handle road specially
var _origDrawBlock = null;
function patchDrawBlock(){
  _origDrawBlock = drawBlock;
  drawBlock = function(ctx,c,r,x,y,id,dir){
    var b=BLOCKS[id]; if(!b) return;
    if(isRoad(id)){
      window._roadCtx={ nb: roadNeighbours(c,r,id) };
      drawRoad(ctx,x,y,id,dir,b);
      window._roadCtx=null;
    } else {
      var fn=DRAW_FNS[id] || drawGeneric;
      fn(ctx,x,y,id,dir,b);
    }
  };
}
