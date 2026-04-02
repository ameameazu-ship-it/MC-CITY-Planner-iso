/**
 * roads-draw.js  v2.0
 * 等角投影の道路描画 — 接続対応・種別別マーキング・夜間街灯
 *
 * ■ タイル座標 (x,y) に対するスクリーン上のキーポイント
 *
 *           North (x, y)
 *          ╱              ╲
 *  mW(x-hw/2,y+hh/2)  mN(x+hw/2,y+hh/2)
 *        ╱    center(x,y+hh)    ╲
 *  West(x-hw,y+hh)  ┄┄┄┄  East(x+hw,y+hh)
 *        ╲    center(x,y+hh)    ╱
 *  mS(x-hw/2,y+3hh/2)  mE(x+hw/2,y+3hh/2)
 *          ╲              ╱
 *           South (x, y+2hh)
 *
 *   mN → N隣接 (c, r-1) への接続点  NE辺中点
 *   mE → E隣接 (c+1, r) への接続点  SE辺中点
 *   mS → S隣接 (c, r+1) への接続点  SW辺中点
 *   mW → W隣接 (c-1, r) への接続点  NW辺中点
 *
 * ■ 道路種別
 *   road     : 破線白センターライン（2車線道路）
 *   highway  : 実線黄2本センターライン（国道）
 *   cobble   : 石畳テクスチャ（目地グリッド）
 *   bridge*  : 路面+側壁（road/highwayどちらでも可）
 *   hbridge* : highway版橋
 *   rail     : 2本レール+枕木
 *
 * ■ constants.js への追加が必要な変更
 *   cobble に road:1 を追加すると隣接接続が有効になります:
 *     cobble: { cat:'r', icon:'🪨', bh:2, road:1, cobble:1, name:{...} }
 *   ※ road:1 なしでも描画は石畳テクスチャで行われますが、接続は無効です
 */

// ─────────────────────────────────────────────────────────────────
// 設定
// ─────────────────────────────────────────────────────────────────

var ROAD_LIGHT_INTERVAL = 4; // 夜間街灯の表示間隔（タイル数）

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
    // 石畳は石畳同士のみ接続
    if (cb)  return ccb;
    if (ccb) return false;
    if (!isRoad(cid)) return false;
    // 線路は線路同士のみ
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
// ジオメトリ補助関数
// ─────────────────────────────────────────────────────────────────

// タイルの接続点・中心座標を返す
function _rdPts(x, y, hw, hh) {
  return {
    cx: x,
    cy: y + hh,
    mN: { x: x + hw * 0.5, y: y + hh * 0.5 },
    mE: { x: x + hw * 0.5, y: y + hh * 1.5 },
    mS: { x: x - hw * 0.5, y: y + hh * 1.5 },
    mW: { x: x - hw * 0.5, y: y + hh * 0.5 }
  };
}

// 各道路軸に対する垂直単位ベクトル（2本線オフセット・テクスチャ用）
//   N-S軸方向 (-hw, hh) の垂直 = (hh,  hw) / len
//   E-W軸方向 ( hw, hh) の垂直 = (hh, -hw) / len
function _rdPerp(hw, hh) {
  var len = Math.sqrt(hw * hw + hh * hh);
  return {
    ns:  { dx: hh / len, dy:  hw / len },
    ew:  { dx: hh / len, dy: -hw / len },
    len: len
  };
}

// 1本の直線を描く（clipDiamond 後に呼ぶこと）
function _rdLine(ctx, ax, ay, bx, by) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

// 接続状況から「始点・終点」を決める共通ロジック
// 接続あり → 辺中点まで / 接続なし → センターまで
function _rdEnds(nb, p) {
  return {
    fromN: nb.N ? p.mN : { x: p.cx, y: p.cy },
    toS:   nb.S ? p.mS : { x: p.cx, y: p.cy },
    fromW: nb.W ? p.mW : { x: p.cx, y: p.cy },
    toE:   nb.E ? p.mE : { x: p.cx, y: p.cy }
  };
}

// ─────────────────────────────────────────────────────────────────
// 橋の側壁
// ─────────────────────────────────────────────────────────────────

function _rdBridgeWalls(ctx, x, y, hw, hh, bh, surfC) {
  var zb = bh * zoom;
  // 左壁（North〜West面）
  ctx.beginPath();
  ctx.moveTo(x,      y       ); ctx.lineTo(x - hw, y + hh      );
  ctx.lineTo(x - hw, y + hh + zb); ctx.lineTo(x,  y + zb);
  ctx.closePath();
  ctx.fillStyle = shadeC(surfC, 0.65);
  ctx.fill();
  // 右壁（North〜East面）
  ctx.beginPath();
  ctx.moveTo(x,      y       ); ctx.lineTo(x + hw, y + hh      );
  ctx.lineTo(x + hw, y + hh + zb); ctx.lineTo(x,  y + zb);
  ctx.closePath();
  ctx.fillStyle = shadeC(surfC, 0.50);
  ctx.fill();
}

// ─────────────────────────────────────────────────────────────────
// 道路: 白破線センターライン
// ─────────────────────────────────────────────────────────────────

function _rdRoad(ctx, x, y, hw, hh, nb) {
  var p     = _rdPts(x, y, hw, hh);
  var hasNS = nb.N || nb.S;
  var hasEW = nb.E || nb.W;
  var ends  = _rdEnds(nb, p);

  ctx.strokeStyle = 'rgba(255,255,255,0.80)';
  ctx.lineWidth   = Math.max(0.7, zoom * 1.1);
  ctx.setLineDash([5 * zoom, 4 * zoom]);

  if (!hasNS && !hasEW) {
    // 孤立タイル: 全軸に破線（小さな十字）
    _rdLine(ctx, p.mN.x, p.mN.y, p.mS.x, p.mS.y);
    _rdLine(ctx, p.mW.x, p.mW.y, p.mE.x, p.mE.y);
  } else {
    // N-S軸（片側のみ接続の場合はセンターまで）
    if (hasNS) _rdLine(ctx, ends.fromN.x, ends.fromN.y, ends.toS.x, ends.toS.y);
    // E-W軸
    if (hasEW) _rdLine(ctx, ends.fromW.x, ends.fromW.y, ends.toE.x, ends.toE.y);
  }

  ctx.setLineDash([]);
}

// ─────────────────────────────────────────────────────────────────
// 国道: 黄色2本実線センターライン
// ─────────────────────────────────────────────────────────────────

function _rdHighway(ctx, x, y, hw, hh, nb) {
  var p     = _rdPts(x, y, hw, hh);
  var perp  = _rdPerp(hw, hh);
  var off   = zoom * 2.2; // 2本線の中心からの半オフセット
  var hasNS = nb.N || nb.S;
  var hasEW = nb.E || nb.W;
  var ends  = _rdEnds(nb, p);

  ctx.strokeStyle = 'rgba(255,215,50,0.95)';
  ctx.lineWidth   = Math.max(0.8, zoom * 1.2);
  ctx.setLineDash([]);

  // 孤立タイル
  if (!hasNS && !hasEW) {
    var s0, ox0, oy0;
    for (s0 = -1; s0 <= 1; s0 += 2) {
      ox0 = s0 * off * perp.ns.dx; oy0 = s0 * off * perp.ns.dy;
      _rdLine(ctx, p.mN.x+ox0, p.mN.y+oy0, p.mS.x+ox0, p.mS.y+oy0);
      ox0 = s0 * off * perp.ew.dx; oy0 = s0 * off * perp.ew.dy;
      _rdLine(ctx, p.mW.x+ox0, p.mW.y+oy0, p.mE.x+ox0, p.mE.y+oy0);
    }
    return;
  }

  // 各軸に2本ずつ描画（±off でオフセット）
  var s, onx, ony, oex, oey;
  for (s = -1; s <= 1; s += 2) {
    if (hasNS) {
      onx = s * off * perp.ns.dx; ony = s * off * perp.ns.dy;
      _rdLine(ctx,
        ends.fromN.x + onx, ends.fromN.y + ony,
        ends.toS.x   + onx, ends.toS.y   + ony);
    }
    if (hasEW) {
      oex = s * off * perp.ew.dx; oey = s * off * perp.ew.dy;
      _rdLine(ctx,
        ends.fromW.x + oex, ends.fromW.y + oey,
        ends.toE.x   + oex, ends.toE.y   + oey);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// 石畳: 等角グリッドテクスチャ（目地線）
//
// E-W方向の線 ＋ N-S方向の線 を交互にずらして石畳パターンを生成。
// clipDiamond で菱形にクリップされるため、長めに描いてよい。
// ─────────────────────────────────────────────────────────────────

function _rdCobble(ctx, x, y, hw, hh) {
  var sz   = Math.max(3, zoom * 6.5); // 石1個の目安サイズ
  var perp = _rdPerp(hw, hh);
  var len  = perp.len;
  var cx   = x, cy = y + hh;
  var n    = Math.ceil(len / sz) + 3; // 十分な本数（クリップで見切られる）

  ctx.strokeStyle = 'rgba(50, 35, 25, 0.38)';
  ctx.lineWidth   = Math.max(0.4, zoom * 0.7);
  ctx.setLineDash([]);

  var i, j, px, py, boff, px2, py2;

  // ── E-W方向の目地線
  //    ・線の向き: (hw, hh)  すなわち E-W軸方向
  //    ・タイル方向: perp.ew = E-W軸の垂直 = (hh,-hw)/len
  for (i = -n; i <= n; i++) {
    px = cx + i * sz * perp.ew.dx;
    py = cy + i * sz * perp.ew.dy;
    // E-W方向に長い線（菱形クリップが整形する）
    _rdLine(ctx, px - hw, py - hh, px + hw, py + hh);
  }

  // ── N-S方向の目地線（交互半ピッチずらしてレンガ調に）
  //    ・線の向き: (-hw, hh)  すなわち N-S軸方向
  //    ・タイル方向: perp.ns = N-S軸の垂直 = (hh,hw)/len
  //    ・ずれ方向: E-W方向 (hw,hh)/len
  for (j = -n; j <= n; j++) {
    boff = (j % 2 !== 0) ? sz * 0.5 : 0; // 交互オフセット
    px2  = cx + j * sz * perp.ns.dx + boff * hw / len;
    py2  = cy + j * sz * perp.ns.dy + boff * hh / len;
    // N-S方向に長い線
    _rdLine(ctx, px2 + hw, py2 - hh, px2 - hw, py2 + hh);
  }
}

// ─────────────────────────────────────────────────────────────────
// 線路: 2本レール + 枕木
// ─────────────────────────────────────────────────────────────────

function _rdRail(ctx, x, y, hw, hh, nb) {
  var p        = _rdPts(x, y, hw, hh);
  var perp     = _rdPerp(hw, hh);
  var rOff     = zoom * 3.5; // レール間ハーフオフセット
  var tieHalf  = zoom * 4.8; // 枕木の半幅
  var tieCount = 5;

  var hasNS    = nb.N || nb.S;
  var hasEW    = nb.E || nb.W;
  var isolated = !hasNS && !hasEW;

  // 孤立時はN-S方向で描画
  var fromN = nb.N ? p.mN : (isolated ? p.mN : { x: p.cx, y: p.cy });
  var toS   = nb.S ? p.mS : (isolated ? p.mS : { x: p.cx, y: p.cy });
  var fromW = nb.W ? p.mW : { x: p.cx, y: p.cy };
  var toE   = nb.E ? p.mE : { x: p.cx, y: p.cy };

  var drawNS = hasNS || isolated;
  var drawEW = hasEW;

  // ── 枕木（先に描いてレールが上に来るようにする）
  ctx.strokeStyle = 'rgba(140,110,80,0.82)';
  ctx.lineWidth   = Math.max(0.8, zoom * 1.3);
  ctx.setLineDash([]);

  var t, frac, tx, ty;
  for (t = 0; t < tieCount; t++) {
    frac = (t + 0.5) / tieCount;
    if (drawNS) {
      tx = fromN.x + (toS.x - fromN.x) * frac;
      ty = fromN.y + (toS.y - fromN.y) * frac;
      _rdLine(ctx,
        tx + tieHalf * perp.ns.dx, ty + tieHalf * perp.ns.dy,
        tx - tieHalf * perp.ns.dx, ty - tieHalf * perp.ns.dy);
    }
    if (drawEW) {
      tx = fromW.x + (toE.x - fromW.x) * frac;
      ty = fromW.y + (toE.y - fromW.y) * frac;
      _rdLine(ctx,
        tx + tieHalf * perp.ew.dx, ty + tieHalf * perp.ew.dy,
        tx - tieHalf * perp.ew.dx, ty - tieHalf * perp.ew.dy);
    }
  }

  // ── レール本体（枕木より後で描画 → 上に重なる）
  ctx.strokeStyle = 'rgba(205,190,170,0.92)';
  ctx.lineWidth   = Math.max(0.7, zoom * 1.0);

  var s, onx, ony, oex, oey;
  for (s = -1; s <= 1; s += 2) {
    if (drawNS) {
      onx = s * rOff * perp.ns.dx; ony = s * rOff * perp.ns.dy;
      _rdLine(ctx, fromN.x+onx, fromN.y+ony, toS.x+onx, toS.y+ony);
    }
    if (drawEW) {
      oex = s * rOff * perp.ew.dx; oey = s * rOff * perp.ew.dy;
      _rdLine(ctx, fromW.x+oex, fromW.y+oey, toE.x+oex, toE.y+oey);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// 夜間街灯グロー
//   ・交差点（NS＋EW 両方あり）: 常時表示
//   ・直線路: ROAD_LIGHT_INTERVAL タイル毎に表示
// ─────────────────────────────────────────────────────────────────

function _rdLight(ctx, c, r, x, y, hw, hh, nb) {
  var hasNS = nb.N || nb.S;
  var hasEW = nb.E || nb.W;

  var show = (hasNS && hasEW)
          || (hasNS && r % ROAD_LIGHT_INTERVAL === 0)
          || (hasEW && c % ROAD_LIGHT_INTERVAL === 0);
  if (!show) return;

  var cx  = x, cy = y + hh;
  var glR = 26 * zoom;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  var grd = ctx.createRadialGradient(cx, cy - 4*zoom, 0, cx, cy - 4*zoom, glR);
  grd.addColorStop(0,    'rgba(255,225,130,0.62)');
  grd.addColorStop(0.35, 'rgba(255,200, 80,0.28)');
  grd.addColorStop(1,    'rgba(255,170, 40,0.00)');
  ctx.fillStyle = grd;
  ctx.fillRect(cx - glR, cy - glR - 4*zoom, glR * 2, glR * 2);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// メイン描画関数
//   ctx  : CanvasRenderingContext2D
//   c, r : グリッド座標
//   x, y : スクリーン座標（cellToScreen の結果）
//   id   : ブロックID
// ─────────────────────────────────────────────────────────────────

function drawRoad(ctx, c, r, x, y, id) {
  var hw  = HW * zoom;
  var hh  = HH * zoom;
  var nb  = roadNeighbours(c, r, id);
  var HWY = isHwy(id);
  var BR  = isBridge(id);
  var RL  = isRail(id);
  var CB  = !!(BLOCKS[id] && BLOCKS[id].cobble) || id === 'cobble';
  var b   = BLOCKS[id] || {};

  // ── 路面カラー決定 ──────────────────────────────────────────
  var surfC;
  if      (RL)  surfC = '#706868';
  else if (CB)  surfC = '#8c7c6c';
  else if (HWY) surfC = '#484848';
  else          surfC = '#5e5e5e';
  if (BR)       surfC = HWY ? '#585040' : '#545454';

  // ── 路面ダイヤモンド ────────────────────────────────────────
  drawDiamond(ctx, x, y, surfC, null);

  // ── 橋の側壁 ────────────────────────────────────────────────
  if (BR && b.bh) {
    _rdBridgeWalls(ctx, x, y, hw, hh, b.bh, surfC);
    drawDiamond(ctx, x, y, surfC, null); // 上面を再描画
  }

  // ── マーキング（ダイヤモンドでクリップ）──────────────────
  ctx.save();
  clipDiamond(ctx, x, y);

  if (RL)       _rdRail(ctx,    x, y, hw, hh, nb);
  else if (CB)  _rdCobble(ctx,  x, y, hw, hh);
  else if (HWY) _rdHighway(ctx, x, y, hw, hh, nb);
  else          _rdRoad(ctx,    x, y, hw, hh, nb);

  ctx.restore();

  // ── 夜間街灯グロー ──────────────────────────────────────────
  if (nightMode && !RL) {
    _rdLight(ctx, c, r, x, y, hw, hh, nb);
  }
}

// ─────────────────────────────────────────────────────────────────
// drawBlock パッチ
//   iso-engine.js の drawBlock を上書きし、道路を専用ルーターで描画する。
//   main.js の初期化処理（init または DOMContentLoaded）内で
//   patchDrawBlock() を呼び出してください。
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
