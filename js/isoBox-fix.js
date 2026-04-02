// ════════════════════════════════════════════════════════════════
// iso-engine.js  修正箇所 — isoBox の壁が地面下に出る問題の修正
// ════════════════════════════════════════════════════════════════
//
// 【原因】
//   旧コードの左壁・右壁の底辺が (x, y+hh*2) と (x±hw, y+hh*2) —
//   つまりタイルの「南頂点」まで延びていた。
//   南頂点はタイルの最も手前下の点であり、壁をここまで延ばすと
//   等角投影の見た目として「地面を突き抜けている」ように見える。
//
// 【修正内容】
//   左壁 (NW面) の底辺 → 西頂点 (x-hw, y+hh) と 北頂点 (x, y)
//   右壁 (NE面) の底辺 → 東頂点 (x+hw, y+hh) と 北頂点 (x, y)
//
//   これにより壁はタイルの NW / NE エッジだけを覆い、
//   SW / SE の部分は隣タイルの地面がペインターズアルゴリズムで
//   上書きするため、見た目上は建物が地面に正しく接地する。
//
// 【交換方法】
//   iso-engine.js 内の function isoBox(...){ ... } を
//   以下のコードに全文置き換えてください。
//
// ════════════════════════════════════════════════════════════════

function isoBox(ctx,x,y,bh,tc,lc,rc){
  var hw=HW*zoom,hh=HH*zoom,zb=bh*zoom;

  // 左壁 (NW面): 北頂点・西頂点を底辺とする正しいアイソメ四辺形
  ctx.beginPath();
  ctx.moveTo(x,y-zb);
  ctx.lineTo(x-hw,y+hh-zb);
  ctx.lineTo(x-hw,y+hh);   // ← 旧: y+hh*2 (南頂点) → 修正: y+hh (西頂点)
  ctx.lineTo(x,y);          // ← 旧: y+hh*2            → 修正: y   (北頂点)
  ctx.closePath();
  ctx.fillStyle=lc;
  ctx.fill();

  // 右壁 (NE面)
  ctx.beginPath();
  ctx.moveTo(x,y-zb);
  ctx.lineTo(x+hw,y+hh-zb);
  ctx.lineTo(x+hw,y+hh);   // ← 旧: y+hh*2 → 修正: y+hh (東頂点)
  ctx.lineTo(x,y);          // ← 旧: y+hh*2 → 修正: y   (北頂点)
  ctx.closePath();
  ctx.fillStyle=rc;
  ctx.fill();

  // 天面 (ダイヤモンド): zb 分だけ上にシフトした菱形 — 変更なし
  ctx.beginPath();
  ctx.moveTo(x,y-zb);
  ctx.lineTo(x+hw,y+hh-zb);
  ctx.lineTo(x,y+hh*2-zb);
  ctx.lineTo(x-hw,y+hh-zb);
  ctx.closePath();
  ctx.fillStyle=tc;
  ctx.fill();
}
