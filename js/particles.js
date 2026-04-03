/**
 * particles.js
 * 長押し成功時の光パーティクル演出
 *
 * index.html に以下を追加してください（iso-engine.js の後）:
 *   <script src="js/particles.js"></script>
 *
 * interaction.js の _onLongPress から
 *   triggerParticleBurst(c, r)
 * を呼び出すことで発動します。
 */

// ── オーバーレイCanvas セットアップ ──────────────────────────────
var _ptCanvas = null, _ptCtx = null;
var _ptParticles = [];
var _ptRafId = null;

function _ptSetup() {
  if (_ptCanvas) return;
  _ptCanvas = document.createElement('canvas');
  _ptCanvas.style.cssText = [
    'position:absolute', 'top:0', 'left:0',
    'pointer-events:none', 'z-index:10'
  ].join(';');
  var wrap = document.getElementById('canvas-wrap') || document.body;
  wrap.style.position = wrap.style.position || 'relative';
  wrap.appendChild(_ptCanvas);
  _ptCtx = _ptCanvas.getContext('2d');
  _ptResize();
  window.addEventListener('resize', _ptResize);
}

function _ptResize() {
  if (!_ptCanvas) return;
  var wrap = document.getElementById('canvas-wrap') || document.body;
  _ptCanvas.width  = wrap.offsetWidth  || window.innerWidth;
  _ptCanvas.height = wrap.offsetHeight || window.innerHeight;
}

// ── パーティクル生成 ─────────────────────────────────────────────
/**
 * triggerParticleBurst(c, r)
 * グリッド座標 (c, r) のブロック位置から光を飛び散らせる。
 * interaction.js の _onLongPress から呼び出す。
 */
function triggerParticleBurst(c, r) {
  _ptSetup();

  // ブロックのスクリーン座標（iso-engine.js の cellToScreen を使用）
  var s  = cellToScreen(c, r);
  var bh = 0;
  var cell = getCell(c, r);
  if (cell && BLOCKS[cell.id]) {
    bh = (BLOCKS[cell.id].bh || 0) * zoom;
    if (typeof BH_SCALE !== 'undefined') bh *= BH_SCALE;
  }
  var cx = s.x;
  var cy = s.y + HH * zoom - bh;  // ブロック上面の中心あたり

  // パーティクル色テーブル（ゴールド〜白〜水色）
  var colors = [
    'rgba(255,230,80,A)',
    'rgba(255,255,180,A)',
    'rgba(255,200,60,A)',
    'rgba(220,240,255,A)',
    'rgba(180,220,255,A)',
    'rgba(255,255,255,A)'
  ];

  var count = 18;
  for (var i = 0; i < count; i++) {
    var angle  = (Math.PI * 2 / count) * i + Math.random() * 0.4;
    var speed  = (1.8 + Math.random() * 2.8) * zoom;
    var size   = (1.8 + Math.random() * 2.4) * zoom;
    var life   = 0.55 + Math.random() * 0.35;  // 秒
    var col    = colors[Math.floor(Math.random() * colors.length)];
    var shape  = Math.random() < 0.5 ? 'circle' : 'star';

    _ptParticles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - speed * 0.3,  // 少し上向きバイアス
      size: size,
      maxSize: size * (1.6 + Math.random()),
      life: life,
      maxLife: life,
      color: col,
      shape: shape,
      gravity: 0.08 * zoom
    });
  }

  // 中心フラッシュ（大きな円がすぐ消える）
  _ptParticles.push({
    x: cx, y: cy,
    vx: 0, vy: 0,
    size: 4 * zoom,
    maxSize: 28 * zoom,
    life: 0.25,
    maxLife: 0.25,
    color: 'rgba(255,240,160,A)',
    shape: 'flash',
    gravity: 0
  });

  if (!_ptRafId) _ptLoop();
}

// ── レンダーループ ────────────────────────────────────────────────
var _ptLast = 0;

function _ptLoop(ts) {
  var now = ts || performance.now();
  var dt  = Math.min((now - (_ptLast || now)) / 1000, 0.05);
  _ptLast = now;

  _ptCtx.clearRect(0, 0, _ptCanvas.width, _ptCanvas.height);

  var alive = false;
  for (var i = _ptParticles.length - 1; i >= 0; i--) {
    var p = _ptParticles[i];
    p.life -= dt;
    if (p.life <= 0) { _ptParticles.splice(i, 1); continue; }
    alive = true;

    var t     = 1 - p.life / p.maxLife;  // 0→1
    var alpha = p.life / p.maxLife;       // 1→0
    var sz    = p.size + (p.maxSize - p.size) * t;

    // 位置更新
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.94;
    p.vy *= 0.94;

    var col = p.color.replace('A', alpha.toFixed(3));
    _ptCtx.fillStyle = col;

    if (p.shape === 'flash') {
      // 中心フラッシュ: 大きな円
      _ptCtx.beginPath();
      _ptCtx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      _ptCtx.fill();

    } else if (p.shape === 'circle') {
      // 丸いパーティクル
      _ptCtx.beginPath();
      _ptCtx.arc(p.x, p.y, sz * 0.5, 0, Math.PI * 2);
      _ptCtx.fill();

    } else {
      // 星形パーティクル
      _ptStar(_ptCtx, p.x, p.y, 4, sz * 0.55, sz * 0.25,
              t * Math.PI * 3);  // 回転
    }
  }

  if (alive) {
    _ptRafId = requestAnimationFrame(_ptLoop);
  } else {
    _ptRafId = null;
    _ptCtx.clearRect(0, 0, _ptCanvas.width, _ptCanvas.height);
  }
}

// ── 星形描画ヘルパー ─────────────────────────────────────────────
function _ptStar(ctx, x, y, points, outer, inner, rotation) {
  ctx.beginPath();
  for (var i = 0; i < points * 2; i++) {
    var r   = i % 2 === 0 ? outer : inner;
    var ang = (Math.PI / points) * i + rotation;
    if (i === 0) ctx.moveTo(x + r * Math.cos(ang), y + r * Math.sin(ang));
    else         ctx.lineTo(x + r * Math.cos(ang), y + r * Math.sin(ang));
  }
  ctx.closePath();
  ctx.fill();
}
