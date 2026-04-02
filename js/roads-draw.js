/**
 * roads-draw.js  v3.0
 *
 * ■ タイル座標 (x,y) = cellToScreen の北頂点
 *
 *           N (x, y)
 *          ╱  ╲
 *   mW(x-hw/2,   mN(x+hw/2,
 *      y+hh/2)      y+hh/2)
 *    W(x-hw,  center  E(x+hw,
 *       y+hh)  (x,y+hh)  y+hh)
 *   mS(x-hw/2,   mE(x+hw/2,
 *      y+3hh/2)    y+3hh/2)
 *          ╲  ╱
 *           S (x, y+2hh)
 *
 * ■ 橋グレード
 *   G1 (1–2 タイル) : シンプル桁橋  ─ 薄いデッキ + ガードレール
 *   G2 (3–5 タイル) : 石造りアーチ橋 ─ 石畳面 + アーチ型欄干
 *   G3 (6+  タイル) : 吊り橋        ─ タワー + メインケーブル + ハンガー
 *
 * ■ スプライト移行ガイド
 *   各グレードの描画関数 drawBridgeTile_G1/G2/G3 の先頭に
 *   「// SPRITE HOOK」コメントを記載。
 *   移行時はそのブロックを drawImage() に置き換えるだけ。
 *   スパン検出・グレード判定ロジックは変更不要。
 */

// ─────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────

var RD_LIGHT_INTERVAL = 4;   // 夜間街灯の間隔 (タイル)
var BR_G2_MIN = 3;           // Grade 2 最小スパン
var BR_G3_MIN = 6;           // Grade 3 最小スパン
var BR_THICKNESS = 3;        // デッキ厚さ (zoom=1 基準 px)
var BR_RAIL_H = 4;           // ガードレール高さ (zoom=1 基準 px)
var BR_TOWER_H = 22;         // 吊り橋タワー高さ (zoom=1 基準 px)
var BR_CABLE_SAG = 0.45;     // ケーブルたわみ比率 (タワー高さに対する)

// ─────────────────────────────────────────────────────────────────
// 橋スパン検出
// ─────────────────────────────────────────────────────────────────

/**
 * getBridgeInfo(c, r, id)
 * 返り値: { dir:'ns'|'ew', span:N, pos:P }
 *   dir  = 支配的な方向 (スパンが長い方)
 *   span = そちらの方向の連続タイル数
 *   pos  = 当タイルのスパン内位置 (0 = 始端)
 */
function getBridgeInfo(c, r, id) {
  var hw = isHwy(id);

  function isSame(c2, r2) {
    if (!inGrid(c2, r2)) return false;
    var cell = getCell(c2, r2);
    if (!cell) return false;
    return isBridge(cell.id) && isHwy(cell.id) === hw;
  }

  // N-S方向のカウント
  var nsN = 0, nsS = 0;
  for (var i = 1; isSame(c, r - i); i++) nsN++;
  for (var i = 1; isSame(c, r + i); i++) nsS++;

  // E-W方向のカウント
  var ewW = 0, ewE = 0;
  for (var i = 1; isSame(c - i, r); i++) ewW++;
  for (var i = 1; isSame(c + i, r); i++) ewE++;

  var nsSpan = nsN + 1 + nsS;
  var ewSpan = ewW + 1 + ewE;

  if (nsSpan >= ewSpan) {
    return { dir: 'ns', span: nsSpan, pos: nsN };
  } else {
    return { dir: 'ew', span: ewSpan, pos: ewW };
  }
}

function getBridgeGrade(span) {
  if (span < BR_G2_MIN) return 1;
  if (span < BR_G3_MIN) return 2;
  return 3;
}

// ─────────────────────────────────────────────────────────────────
// 隣接タイル検出
// ─────────────────────────────────────────────────────────────────

function roadNeighbours(c, r, id) {
  var rl = isRail(id);
  var cb = !!(BLOCKS[id] && BLOCKS[id].cobble) || id === 'cobble';

  function match(c2, r2) {
    var cell = getCell(c2, r2);
    if (!cell) return false;
    var cid = cell.id;
    var ccb = !!(BLOCKS[cid] && BLOCKS[cid].cobble) || cid === 'cobble';
    if (cb)  return ccb;
    if (ccb) return false;
    if (!isRoad(cid)) return false;
    if (isRail(cid) !== rl) return false;
    return true;
  }

  return {
    N: match(c,     r - 1),
    E: match(c + 1, r    ),
    S: match(c,     r + 1),
    W: match(c - 1, r    )
  };
}

// ─────────────────────────────────────────────────────────────────
// ジオメトリ補助
// ─────────────────────────────────────────────────────────────────

function _rdPts(x, y, hw, hh) {
  return {
    cx: x,  cy: y + hh,
    mN: { x: x + hw * 0.5, y: y + hh * 0.5 },
    mE: { x: x + hw * 0.5, y: y + hh * 1.5 },
    mS: { x: x - hw * 0.5, y: y + hh * 1.5 },
    mW: { x: x - hw * 0.5, y: y + hh * 0.5 }
  };
}

function _rdPerp(hw, hh) {
  var len = Math.sqrt(hw * hw + hh * hh);
  return {
    ns:  { dx: hh / len, dy:  hw / len },
    ew:  { dx: hh / len, dy: -hw / len },
    len: len
  };
}

function _rdLine(ctx, ax, ay, bx, by) {
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
}

function _rdEnds(nb, p) {
  return {
    fromN: nb.N ? p.mN : { x: p.cx, y: p.cy },
    toS:   nb.S ? p.mS : { x: p.cx, y: p.cy },
    fromW: nb.W ? p.mW : { x: p.cx, y: p.cy },
    toE:   nb.E ? p.mE : { x: p.cx, y: p.cy }
  };
}

// ─────────────────────────────────────────────────────────────────
// 道路マーキング (clipDiamond 後に呼ぶ)
// ─────────────────────────────────────────────────────────────────

function _rdRoad(ctx, x, y, hw, hh, nb) {
  var p = _rdPts(x, y, hw, hh);
  var hasNS = nb.N || nb.S, hasEW = nb.E || nb.W;
  var ends  = _rdEnds(nb, p);
  ctx.strokeStyle = 'rgba(255,255,255,0.80)';
  ctx.lineWidth   = Math.max(0.7, zoom * 1.1);
  ctx.setLineDash([5 * zoom, 4 * zoom]);
  if (!hasNS && !hasEW) {
    _rdLine(ctx, p.mN.x, p.mN.y, p.mS.x, p.mS.y);
    _rdLine(ctx, p.mW.x, p.mW.y, p.mE.x, p.mE.y);
  } else {
    if (hasNS) _rdLine(ctx, ends.fromN.x, ends.fromN.y, ends.toS.x, ends.toS.y);
    if (hasEW) _rdLine(ctx, ends.fromW.x, ends.fromW.y, ends.toE.x, ends.toE.y);
  }
  ctx.setLineDash([]);
}

function _rdHighway(ctx, x, y, hw, hh, nb) {
  var p    = _rdPts(x, y, hw, hh);
  var perp = _rdPerp(hw, hh);
  var off  = zoom * 2.2;
  var hasNS = nb.N || nb.S, hasEW = nb.E || nb.W;
  var ends  = _rdEnds(nb, p);
  ctx.strokeStyle = 'rgba(255,215,50,0.95)';
  ctx.lineWidth   = Math.max(0.8, zoom * 1.2);
  ctx.setLineDash([]);
  for (var s = -1; s <= 1; s += 2) {
    if (hasNS || (!hasNS && !hasEW)) {
      _rdLine(ctx,
        ends.fromN.x + s*off*perp.ns.dx, ends.fromN.y + s*off*perp.ns.dy,
        ends.toS.x   + s*off*perp.ns.dx, ends.toS.y   + s*off*perp.ns.dy);
    }
    if (hasEW || (!hasNS && !hasEW)) {
      _rdLine(ctx,
        ends.fromW.x + s*off*perp.ew.dx, ends.fromW.y + s*off*perp.ew.dy,
        ends.toE.x   + s*off*perp.ew.dx, ends.toE.y   + s*off*perp.ew.dy);
    }
  }
}

function _rdCobble(ctx, x, y, hw, hh) {
  var sz   = Math.max(3, zoom * 6.5);
  var perp = _rdPerp(hw, hh);
  var len  = perp.len;
  var cx   = x, cy = y + hh;
  var n    = Math.ceil(len / sz) + 3;
  ctx.strokeStyle = 'rgba(50,35,25,0.38)';
  ctx.lineWidth   = Math.max(0.4, zoom * 0.7);
  ctx.setLineDash([]);
  for (var i = -n; i <= n; i++) {
    var px = cx + i * sz * perp.ew.dx, py = cy + i * sz * perp.ew.dy;
    _rdLine(ctx, px - hw, py - hh, px + hw, py + hh);
  }
  for (var j = -n; j <= n; j++) {
    var boff = (j % 2 !== 0) ? sz * 0.5 : 0;
    var px2  = cx + j * sz * perp.ns.dx + boff * hw / len;
    var py2  = cy + j * sz * perp.ns.dy + boff * hh / len;
    _rdLine(ctx, px2 + hw, py2 - hh, px2 - hw, py2 + hh);
  }
}

function _rdRail(ctx, x, y, hw, hh, nb) {
  var p        = _rdPts(x, y, hw, hh);
  var perp     = _rdPerp(hw, hh);
  var rOff     = zoom * 3.5;
  var tieHalf  = zoom * 4.8;
  var tieCount = 5;
  var hasNS = nb.N || nb.S, hasEW = nb.E || nb.W;
  var isolated = !hasNS && !hasEW;
  var fromN = nb.N ? p.mN : (isolated ? p.mN : { x: p.cx, y: p.cy });
  var toS   = nb.S ? p.mS : (isolated ? p.mS : { x: p.cx, y: p.cy });
  var fromW = nb.W ? p.mW : { x: p.cx, y: p.cy };
  var toE   = nb.E ? p.mE : { x: p.cx, y: p.cy };
  var drawNS = hasNS || isolated, drawEW = hasEW;

  ctx.strokeStyle = 'rgba(140,110,80,0.82)';
  ctx.lineWidth   = Math.max(0.8, zoom * 1.3);
  ctx.setLineDash([]);
  for (var t = 0; t < tieCount; t++) {
    var frac = (t + 0.5) / tieCount;
    if (drawNS) {
      var tx = fromN.x + (toS.x - fromN.x) * frac;
      var ty = fromN.y + (toS.y - fromN.y) * frac;
      _rdLine(ctx, tx+tieHalf*perp.ns.dx, ty+tieHalf*perp.ns.dy, tx-tieHalf*perp.ns.dx, ty-tieHalf*perp.ns.dy);
    }
    if (drawEW) {
      var tx2 = fromW.x + (toE.x - fromW.x) * frac;
      var ty2 = fromW.y + (toE.y - fromW.y) * frac;
      _rdLine(ctx, tx2+tieHalf*perp.ew.dx, ty2+tieHalf*perp.ew.dy, tx2-tieHalf*perp.ew.dx, ty2-tieHalf*perp.ew.dy);
    }
  }

  ctx.strokeStyle = 'rgba(205,190,170,0.92)';
  ctx.lineWidth   = Math.max(0.7, zoom * 1.0);
  for (var s = -1; s <= 1; s += 2) {
    if (drawNS) _rdLine(ctx, fromN.x+s*rOff*perp.ns.dx, fromN.y+s*rOff*perp.ns.dy, toS.x+s*rOff*perp.ns.dx, toS.y+s*rOff*perp.ns.dy);
    if (drawEW) _rdLine(ctx, fromW.x+s*rOff*perp.ew.dx, fromW.y+s*rOff*perp.ew.dy, toE.x+s*rOff*perp.ew.dx, toE.y+s*rOff*perp.ew.dy);
  }
}

// ─────────────────────────────────────────────────────────────────
// 夜間街灯グロー
// ─────────────────────────────────────────────────────────────────

function _rdLight(ctx, c, r, x, y, hw, hh, nb) {
  var hasNS = nb.N || nb.S, hasEW = nb.E || nb.W;
  var show = (hasNS && hasEW)
          || (hasNS && r % RD_LIGHT_INTERVAL === 0)
          || (hasEW && c % RD_LIGHT_INTERVAL === 0);
  if (!show) return;
  var glR = 26 * zoom;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  var grd = ctx.createRadialGradient(x, y + hh - 4*zoom, 0, x, y + hh - 4*zoom, glR);
  grd.addColorStop(0,    'rgba(255,225,130,0.62)');
  grd.addColorStop(0.35, 'rgba(255,200, 80,0.28)');
  grd.addColorStop(1,    'rgba(255,170, 40,0.00)');
  ctx.fillStyle = grd;
  ctx.fillRect(x - glR, y + hh - glR - 4*zoom, glR * 2, glR * 2);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 橋 共通ユーティリティ
// ─────────────────────────────────────────────────────────────────

function _brSurf(id) {
  if (isHwy(id)) return '#484848';
  return '#5e5e5e';
}

/**
 * デッキ厚さ: 地上への薄い下向きエッジ (BR_THICKNESS px)
 * ─ 地面より大きく沈まない小さな厚み表現
 */
function _drawDeckThickness(ctx, x, y, hw, hh, surfC) {
  var T = BR_THICKNESS * zoom;
  var lc = shadeC(surfC, 0.60);
  var rc = shadeC(surfC, 0.48);
  // NW エッジ
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x - hw, y + hh);
  ctx.lineTo(x - hw, y + hh + T); ctx.lineTo(x, y + T);
  ctx.closePath(); ctx.fillStyle = lc; ctx.fill();
  // NE エッジ
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + hw, y + hh);
  ctx.lineTo(x + hw, y + hh + T); ctx.lineTo(x, y + T);
  ctx.closePath(); ctx.fillStyle = rc; ctx.fill();
}

/**
 * ケーブル高さ h(t): 放物線 (両端 = tH、中央 = tH * (1-sag))
 */
function _cableH(t, tH, sag) {
  return tH - sag * 4 * t * (1 - t);
}

/**
 * スパン上での当タイルの正規化位置 t を計算
 * pos=0 で t=0、pos=span-1 で t=1
 */
function _brT(pos, span) {
  return (span <= 1) ? 0 : pos / (span - 1);
}

// ─────────────────────────────────────────────────────────────────
// Grade 1: シンプル桁橋 (スパン 1–2)
// ─────────────────────────────────────────────────────────────────
/*
 * ── SPRITE HOOK: Grade 1 ────────────────────────────────────────
 * スプライトシート移行時、この関数本体を以下に置き換える:
 *
 *   var sec = spanInfo.pos === 0 && spanInfo.span > 1 ? 'START'
 *           : spanInfo.pos === spanInfo.span - 1 && spanInfo.span > 1 ? 'END'
 *           : 'MID';
 *   var key = 'G1_' + spanInfo.dir.toUpperCase() + '_' + sec;
 *   // SPRITES[key] = { sx, sy, sw, sh } (スプライトシート座標)
 *   ctx.drawImage(BRIDGE_SHEET, SPRITES[key].sx, SPRITES[key].sy,
 *                 SPRITES[key].sw, SPRITES[key].sh,
 *                 x - hw, y, hw * 2, hh * 2);
 * ────────────────────────────────────────────────────────────────
 */
function drawBridgeTile_G1(ctx, x, y, hw, hh, id, spanInfo) {
  var surfC = _brSurf(id);
  var railH = BR_RAIL_H * zoom;

  // デッキ面
  drawDiamond(ctx, x, y, surfC, null);
  _drawDeckThickness(ctx, x, y, hw, hh, surfC);

  // マーキング
  ctx.save();
  clipDiamond(ctx, x, y);
  var nsFake = spanInfo.dir === 'ns';
  var fakNb = { N: nsFake, S: nsFake, E: !nsFake, W: !nsFake };
  if (isHwy(id)) _rdHighway(ctx, x, y, hw, hh, fakNb);
  else            _rdRoad(ctx, x, y, hw, hh, fakNb);
  ctx.restore();

  // ── ガードレール支柱 (上方向) ────────────────────────────────
  ctx.strokeStyle = '#b0b0b0';
  ctx.lineWidth   = Math.max(0.8, zoom * 1.0);
  ctx.setLineDash([]);

  // NW エッジ (上)
  ctx.beginPath();
  ctx.moveTo(x - hw, y + hh); ctx.lineTo(x, y);
  ctx.stroke();
  // NE エッジ (上)
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + hw, y + hh);
  ctx.stroke();

  // 支柱 (3本/辺)
  var steps = [0.25, 0.5, 0.75];
  ctx.lineWidth = Math.max(0.5, zoom * 0.8);
  steps.forEach(function(t) {
    // NW辺
    var px1 = x - hw * t, py1 = y + hh * t;
    ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px1, py1 - railH); ctx.stroke();
    // NE辺
    var px2 = x + hw * t, py2 = y + hh * t;
    ctx.beginPath(); ctx.moveTo(px2, py2); ctx.lineTo(px2, py2 - railH); ctx.stroke();
  });

  // 上弦材 (支柱頂点を結ぶ)
  ctx.lineWidth = Math.max(0.6, zoom * 0.9);
  ctx.beginPath();
  ctx.moveTo(x - hw, y + hh - railH); ctx.lineTo(x, y - railH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - railH); ctx.lineTo(x + hw, y + hh - railH);
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────
// Grade 2: 石造りアーチ橋 (スパン 3–5)
// ─────────────────────────────────────────────────────────────────
/*
 * ── SPRITE HOOK: Grade 2 ────────────────────────────────────────
 * スプライトシート移行時、この関数本体を以下に置き換える:
 *   (G1 と同様、sec = START / MID / END で振り分ける)
 *   var key = 'G2_' + spanInfo.dir.toUpperCase() + '_' + sec;
 *   ctx.drawImage(BRIDGE_SHEET, SPRITES[key].sx, SPRITES[key].sy,
 *                 SPRITES[key].sw, SPRITES[key].sh,
 *                 x - hw, y, hw * 2, hh * 2);
 * ────────────────────────────────────────────────────────────────
 */
function drawBridgeTile_G2(ctx, x, y, hw, hh, id, spanInfo) {
  var surfC = isHwy(id) ? '#5a5040' : '#8c7c6c';
  var wallC = shadeC(surfC, 0.68);
  var archC = shadeC(surfC, 0.55);
  var railH = (BR_RAIL_H + 2) * zoom;
  var T     = (BR_THICKNESS + 2) * zoom;

  // デッキ面 (石畳テクスチャ)
  drawDiamond(ctx, x, y, surfC, null);
  ctx.save();
  clipDiamond(ctx, x, y);
  _rdCobble(ctx, x, y, hw, hh);
  ctx.restore();

  // 石造りデッキ厚さ
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x - hw, y + hh);
  ctx.lineTo(x - hw, y + hh + T); ctx.lineTo(x, y + T);
  ctx.closePath(); ctx.fillStyle = wallC; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + hw, y + hh);
  ctx.lineTo(x + hw, y + hh + T); ctx.lineTo(x, y + T);
  ctx.closePath(); ctx.fillStyle = archC; ctx.fill();

  // 石目線 (デッキ厚さのブロック目地)
  ctx.strokeStyle = 'rgba(40,28,14,0.30)';
  ctx.lineWidth   = Math.max(0.4, zoom * 0.6);
  for (var li = 1; li <= 2; li++) {
    var lf = li / 3;
    ctx.beginPath();
    ctx.moveTo(x - hw * lf, y + hh * lf);
    ctx.lineTo(x - hw * lf, y + hh * lf + T);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + hw * lf, y + hh * lf);
    ctx.lineTo(x + hw * lf, y + hh * lf + T);
    ctx.stroke();
  }

  // アーチ型石欄干 (上向き)
  ctx.lineWidth   = Math.max(1.2, zoom * 1.6);
  ctx.strokeStyle = '#a09070';
  ctx.setLineDash([]);

  var arcRise = railH + 2 * zoom;
  // NW欄干
  ctx.beginPath();
  ctx.moveTo(x - hw, y + hh); ctx.lineTo(x, y);
  ctx.stroke();
  // NE欄干
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + hw, y + hh);
  ctx.stroke();

  // アーチリブ (欄干上端のカーブ)
  ctx.lineWidth = Math.max(0.8, zoom * 1.0);
  ctx.strokeStyle = '#c0a880';
  // NW アーチ
  ctx.beginPath();
  ctx.moveTo(x - hw, y + hh - railH);
  ctx.quadraticCurveTo(x - hw * 0.5, y + hh * 0.5 - arcRise, x, y - railH);
  ctx.stroke();
  // NE アーチ
  ctx.beginPath();
  ctx.moveTo(x, y - railH);
  ctx.quadraticCurveTo(x + hw * 0.5, y + hh * 0.5 - arcRise, x + hw, y + hh - railH);
  ctx.stroke();

  // ハイウェイ黄線
  if (isHwy(id)) {
    ctx.save();
    clipDiamond(ctx, x, y);
    var nsFake = spanInfo.dir === 'ns';
    _rdHighway(ctx, x, y, hw, hh, { N: nsFake, S: nsFake, E: !nsFake, W: !nsFake });
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────
// Grade 3: 吊り橋 (スパン 6+)
// ─────────────────────────────────────────────────────────────────
/*
 * ── SPRITE HOOK: Grade 3 ────────────────────────────────────────
 * スプライトシート移行時:
 *   タワー (START/END タイル) と デッキ (MID タイル) で
 *   別スプライトを使う:
 *     'G3_NS_TOWER_S' / 'G3_NS_TOWER_E' (始端・終端タワー付きタイル)
 *     'G3_NS_MID'                        (デッキのみ: ケーブル・ハンガー)
 *   ケーブル・ハンガーはコード描画のまま残すことも可。
 * ────────────────────────────────────────────────────────────────
 */
function drawBridgeTile_G3(ctx, x, y, hw, hh, id, spanInfo) {
  var surfC  = _brSurf(id);
  var cableC = isHwy(id) ? 'rgba(255,210,60,0.92)' : 'rgba(210,210,210,0.92)';
  var towC   = isHwy(id) ? '#7a6838' : '#686868';
  var tH     = BR_TOWER_H * zoom;
  var sag    = tH * BR_CABLE_SAG;
  var pos    = spanInfo.pos;
  var span   = spanInfo.span;
  var isNS   = spanInfo.dir === 'ns';

  // ── デッキ面
  drawDiamond(ctx, x, y, surfC, null);
  _drawDeckThickness(ctx, x, y, hw, hh, surfC);

  // ── マーキング (clipDiamond 内)
  ctx.save();
  clipDiamond(ctx, x, y);
  var fakNb = { N: isNS, S: isNS, E: !isNS, W: !isNS };
  if (isHwy(id)) _rdHighway(ctx, x, y, hw, hh, fakNb);
  else            _rdRoad(ctx, x, y, hw, hh, fakNb);
  ctx.restore();

  // ── タワー (始端/終端タイルのみ)
  var isStart = (pos === 0);
  var isEnd   = (pos === span - 1);

  if (isStart || isEnd) {
    var tw  = Math.max(2, zoom * 2.5);
    // タワー基部 = タイル中心
    var tbx = x, tby = y + hh;
    var top_y = tby - tH;

    // タワー柱 (NW面 + NE面)
    ctx.fillStyle = towC;
    ctx.beginPath();
    ctx.moveTo(tbx, tby); ctx.lineTo(tbx - tw, tby - tw * 0.5);
    ctx.lineTo(tbx - tw, top_y - tw * 0.5); ctx.lineTo(tbx, top_y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = shadeC(towC, 0.75);
    ctx.beginPath();
    ctx.moveTo(tbx, tby); ctx.lineTo(tbx + tw, tby - tw * 0.5);
    ctx.lineTo(tbx + tw, top_y - tw * 0.5); ctx.lineTo(tbx, top_y);
    ctx.closePath(); ctx.fill();
    // タワー天板
    ctx.fillStyle = shadeC(towC, 1.3);
    ctx.beginPath();
    ctx.moveTo(tbx, top_y); ctx.lineTo(tbx + tw, top_y - tw * 0.5);
    ctx.lineTo(tbx, top_y - tw); ctx.lineTo(tbx - tw, top_y - tw * 0.5);
    ctx.closePath(); ctx.fill();
    // 横梁
    ctx.strokeStyle = shadeC(towC, 1.1);
    ctx.lineWidth   = Math.max(0.8, zoom * 1.0);
    ctx.beginPath();
    ctx.moveTo(tbx - tw * 1.6, top_y + tH * 0.35 - tw * 0.5);
    ctx.lineTo(tbx + tw * 1.6, top_y + tH * 0.35 - tw * 0.5);
    ctx.stroke();
    // ナイトグロー (タワー灯)
    if (nightMode) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      var glr = ctx.createRadialGradient(tbx, top_y, 0, tbx, top_y, 10 * zoom);
      glr.addColorStop(0, 'rgba(255,230,120,0.70)');
      glr.addColorStop(1, 'rgba(255,200,60,0.00)');
      ctx.fillStyle = glr;
      ctx.fillRect(tbx - 10*zoom, top_y - 10*zoom, 20*zoom, 20*zoom);
      ctx.restore();
    }
  }

  // ── メインケーブル & ハンガー
  // 当タイルの進入・退出エッジ中点を求める
  // (mN/mS = NS橋のケーブル通過点、mW/mE = EW橋)
  var p     = _rdPts(x, y, hw, hh);
  var entPt = isNS ? p.mN : p.mW;
  var extPt = isNS ? p.mS : p.mE;

  // 正規化 t (0=始端, 1=終端) を進入・退出エッジで計算
  var t_ent = (pos - 0.5) / (span - 1);
  var t_ext = (pos + 0.5) / (span - 1);
  // 始端: t_ent=0、終端: t_ext=1 にクランプ
  if (pos === 0)        t_ent = 0;
  if (pos === span - 1) t_ext = 1;

  var h_ent = _cableH(t_ent, tH, sag);
  var h_ext = _cableH(t_ext, tH, sag);

  // ケーブル描画
  ctx.strokeStyle = cableC;
  ctx.lineWidth   = Math.max(0.8, zoom * 1.2);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(entPt.x, entPt.y - h_ent);
  ctx.lineTo(extPt.x, extPt.y - h_ext);
  ctx.stroke();

  // ハンガー (非タワータイル)
  if (!isStart && !isEnd) {
    var t_mid = _brT(pos, span);
    var h_mid = _cableH(t_mid, tH, sag);
    ctx.strokeStyle = cableC.replace('0.92', '0.55');
    ctx.lineWidth   = Math.max(0.5, zoom * 0.7);
    ctx.beginPath();
    ctx.moveTo(p.cx, p.cy - h_mid);
    ctx.lineTo(p.cx, p.cy);
    ctx.stroke();
  }

  // ケーブル固定プレート (始端・終端)
  if (isStart || isEnd) {
    var ancPt = isStart ? entPt : extPt;
    var anch  = isStart ? h_ent : h_ext;
    ctx.fillStyle = towC;
    ctx.beginPath();
    ctx.arc(ancPt.x, ancPt.y - anch, zoom * 2.0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────────────
// メイン描画ディスパッチャ
// ─────────────────────────────────────────────────────────────────

function drawRoad(ctx, c, r, x, y, id) {
  var hw  = HW * zoom;
  var hh  = HH * zoom;
  var BR  = isBridge(id);
  var RL  = isRail(id);
  var CB  = !!(BLOCKS[id] && BLOCKS[id].cobble) || id === 'cobble';

  if (BR) {
    // ── 橋 ──────────────────────────────────────────────────────
    var info  = getBridgeInfo(c, r, id);
    var grade = getBridgeGrade(info.span);
    if      (grade === 1) drawBridgeTile_G1(ctx, x, y, hw, hh, id, info);
    else if (grade === 2) drawBridgeTile_G2(ctx, x, y, hw, hh, id, info);
    else                  drawBridgeTile_G3(ctx, x, y, hw, hh, id, info);

    // 夜間橋灯 (G3 はタワー灯で対応済みなので G1/G2 のみ)
    if (nightMode && grade < 3) {
      _rdLight(ctx, c, r, x, y, hw, hh, { N: true, S: true, E: false, W: false });
    }
    return;
  }

  // ── 一般道路・線路・石畳 ──────────────────────────────────────
  var surfC;
  if      (RL) surfC = '#706868';
  else if (CB) surfC = '#8c7c6c';
  else if (isHwy(id)) surfC = '#484848';
  else         surfC = '#5e5e5e';

  drawDiamond(ctx, x, y, surfC, null);

  var nb = roadNeighbours(c, r, id);

  ctx.save();
  clipDiamond(ctx, x, y);
  if      (RL) _rdRail(ctx,    x, y, hw, hh, nb);
  else if (CB) _rdCobble(ctx,  x, y, hw, hh);
  else if (isHwy(id)) _rdHighway(ctx, x, y, hw, hh, nb);
  else         _rdRoad(ctx,    x, y, hw, hh, nb);
  ctx.restore();

  if (nightMode && !RL) _rdLight(ctx, c, r, x, y, hw, hh, nb);
}

// ─────────────────────────────────────────────────────────────────
// drawBlock パッチ
//   main.js の初期化時に patchDrawBlock() を呼び出すこと。
// ─────────────────────────────────────────────────────────────────

function patchDrawBlock() {
  var _orig = drawBlock;
  drawBlock = function(ctx, c, r, x, y, id, dir) {
    var b = BLOCKS[id];
    if (!b) return;
    if (isRoad(id) || id === 'cobble' || (b && b.cobble)) {
      drawRoad(ctx, c, r, x, y, id);
    } else {
      _orig(ctx, c, r, x, y, id, dir);
    }
  };
}
