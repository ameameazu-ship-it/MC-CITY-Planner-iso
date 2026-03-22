// ui.js
// Block-picker sheet, settings panel, context menu, language, night mode.

var lang = 'ja';
var currentCat = 'r';
var selectedId = 'house1';
var sheetOpen = false;
var soundOn = true, vibeOn = true;

// ── Language table ────────────────────────────────────────────────
var I18N = {
  ja:{
    draw:'描く', erase:'消す', fill:'塗り', list:'一覧',
    undo:'戻す', redo:'進む', center:'⌖中心', settings:'設定',
    save:'💾 保存', clear:'🗑 マップをクリア', close:'閉じる',
    confirm_clear:'マップをクリアしますか？',
    confirm_load:' を読み込みますか？現在の作業は消えます。',
    confirm_del:' を削除しますか？',
    no_saves:'保存済みマップなし', selected:'選択中',
    direction:'向き', auto:'自動', delete:'🗑 削除', save_ph:'マップ名...',
    s_night:'🌙 夜間モード', s_night_desc:'夜景・照明エフェクト',
    s_sound:'🔊 配置音',     s_sound_desc:'ブロック配置時の効果音',
    s_vibe:'📳 バイブ',      s_vibe_desc:'タップ時の振動フィードバック',
    s_grid:'⊞ グリッド',    s_grid_desc:'グリッド線の表示',
    s_lang:'🌐 言語',        s_lang_desc:'表示言語を選択',
    s_bg:'🎨 背景色',        s_bg_desc:'マップの地面・空の色'
  },
  en:{
    draw:'Draw', erase:'Erase', fill:'Fill', list:'List',
    undo:'Undo', redo:'Redo', center:'⌖Ctr', settings:'Settings',
    save:'💾 Save', clear:'🗑 Clear Map', close:'Close',
    confirm_clear:'Clear the map?',
    confirm_load:' — load this map? Current work will be lost.',
    confirm_del:' — delete?',
    no_saves:'No saved maps', selected:'Selected',
    direction:'Direction', auto:'Auto', delete:'🗑 Delete', save_ph:'Map name...',
    s_night:'🌙 Night Mode',  s_night_desc:'Night view & lighting effects',
    s_sound:'🔊 Sound',       s_sound_desc:'Sound effect on block placement',
    s_vibe:'📳 Vibrate',      s_vibe_desc:'Haptic feedback on tap',
    s_grid:'⊞ Grid',         s_grid_desc:'Show grid lines',
    s_lang:'🌐 Language',     s_lang_desc:'Select display language',
    s_bg:'🎨 Background',     s_bg_desc:'Ground & sky color of the map'
  },
  zh:{
    draw:'绘制', erase:'删除', fill:'填充', list:'列表',
    undo:'撤销', redo:'重做', center:'⌖中心', settings:'设置',
    save:'💾 保存', clear:'🗑 清除地图', close:'关闭',
    confirm_clear:'清除地图？',
    confirm_load:' — 加载此地图？当前内容将丢失。',
    confirm_del:' — 删除？',
    no_saves:'无保存地图', selected:'已选',
    direction:'方向', auto:'自动', delete:'🗑 删除', save_ph:'地图名...',
    s_night:'🌙 夜间模式',   s_night_desc:'夜景与照明效果',
    s_sound:'🔊 音效',       s_sound_desc:'放置方块时的音效',
    s_vibe:'📳 振动',        s_vibe_desc:'点按时的触觉反馈',
    s_grid:'⊞ 网格',        s_grid_desc:'显示网格线',
    s_lang:'🌐 语言',        s_lang_desc:'选择显示语言',
    s_bg:'🎨 背景色',        s_bg_desc:'地图的地面和天空颜色'
  },
  ko:{
    draw:'그리기', erase:'지우기', fill:'채우기', list:'목록',
    undo:'되돌리기', redo:'다시하기', center:'⌖중심', settings:'설정',
    save:'💾 저장', clear:'🗑 맵 지우기', close:'닫기',
    confirm_clear:'맵을 지울까요?',
    confirm_load:' — 이 맵을 불러올까요? 현재 작업이 사라집니다.',
    confirm_del:' — 삭제?',
    no_saves:'저장된 맵 없음', selected:'선택',
    direction:'방향', auto:'자동', delete:'🗑 삭제', save_ph:'맵 이름...',
    s_night:'🌙 야간 모드',  s_night_desc:'야경 및 조명 효과',
    s_sound:'🔊 효과음',     s_sound_desc:'블록 배치 시 효과음',
    s_vibe:'📳 진동',        s_vibe_desc:'탭 시 진동 피드백',
    s_grid:'⊞ 그리드',      s_grid_desc:'그리드 선 표시',
    s_lang:'🌐 언어',        s_lang_desc:'표시 언어 선택',
    s_bg:'🎨 배경색',        s_bg_desc:'맵의 지면·하늘 색상'
  },
  es:{
    draw:'Dibujar', erase:'Borrar', fill:'Rellenar', list:'Lista',
    undo:'Deshacer', redo:'Rehacer', center:'⌖Centro', settings:'Ajustes',
    save:'💾 Guardar', clear:'🗑 Limpiar mapa', close:'Cerrar',
    confirm_clear:'¿Limpiar el mapa?',
    confirm_load:' — ¿Cargar este mapa? Se perderá el trabajo actual.',
    confirm_del:' — ¿Eliminar?',
    no_saves:'Sin mapas guardados', selected:'Selec.',
    direction:'Dirección', auto:'Auto', delete:'🗑 Eliminar', save_ph:'Nombre del mapa...',
    s_night:'🌙 Modo noche',  s_night_desc:'Vista nocturna e iluminación',
    s_sound:'🔊 Sonido',      s_sound_desc:'Efecto al colocar bloques',
    s_vibe:'📳 Vibración',    s_vibe_desc:'Vibración táctil al tocar',
    s_grid:'⊞ Cuadrícula',   s_grid_desc:'Mostrar líneas de cuadrícula',
    s_lang:'🌐 Idioma',       s_lang_desc:'Seleccionar idioma',
    s_bg:'🎨 Fondo',          s_bg_desc:'Color del suelo y el cielo'
  },
  fr:{
    draw:'Dessiner', erase:'Effacer', fill:'Remplir', list:'Liste',
    undo:'Annuler', redo:'Refaire', center:'⌖Centre', settings:'Réglages',
    save:'💾 Enregistrer', clear:'🗑 Effacer la carte', close:'Fermer',
    confirm_clear:'Effacer la carte ?',
    confirm_load:' — Charger cette carte ? Le travail actuel sera perdu.',
    confirm_del:' — Supprimer ?',
    no_saves:'Aucune carte sauvegardée', selected:'Sélect.',
    direction:'Direction', auto:'Auto', delete:'🗑 Supprimer', save_ph:'Nom de la carte...',
    s_night:'🌙 Mode nuit',    s_night_desc:'Vue nocturne et effets lumineux',
    s_sound:'🔊 Son',          s_sound_desc:'Effet sonore lors du placement',
    s_vibe:'📳 Vibration',     s_vibe_desc:'Retour haptique au toucher',
    s_grid:'⊞ Grille',        s_grid_desc:'Afficher les lignes de grille',
    s_lang:'🌐 Langue',        s_lang_desc:'Sélectionner la langue',
    s_bg:'🎨 Fond',            s_bg_desc:'Couleur du sol et du ciel'
  },
  id:{
    draw:'Gambar', erase:'Hapus', fill:'Isi', list:'Daftar',
    undo:'Batal', redo:'Ulang', center:'⌖Pusat', settings:'Pengaturan',
    save:'💾 Simpan', clear:'🗑 Hapus Peta', close:'Tutup',
    confirm_clear:'Hapus peta?',
    confirm_load:' — Muat peta ini? Pekerjaan saat ini akan hilang.',
    confirm_del:' — Hapus?',
    no_saves:'Tidak ada peta tersimpan', selected:'Dipilih',
    direction:'Arah', auto:'Otomatis', delete:'🗑 Hapus', save_ph:'Nama peta...',
    s_night:'🌙 Mode Malam',   s_night_desc:'Tampilan malam & efek cahaya',
    s_sound:'🔊 Suara',        s_sound_desc:'Efek suara saat meletakkan blok',
    s_vibe:'📳 Getar',         s_vibe_desc:'Umpan balik getar saat mengetuk',
    s_grid:'⊞ Kisi',          s_grid_desc:'Tampilkan garis kisi',
    s_lang:'🌐 Bahasa',        s_lang_desc:'Pilih bahasa tampilan',
    s_bg:'🎨 Latar belakang',  s_bg_desc:'Warna tanah dan langit peta'
  },
  hi:{
    draw:'बनाएं', erase:'मिटाएं', fill:'भरें', list:'सूची',
    undo:'वापस', redo:'आगे', center:'⌖केंद्र', settings:'सेटिंग',
    save:'💾 सहेजें', clear:'🗑 मानचित्र साफ़ करें', close:'बंद करें',
    confirm_clear:'मानचित्र साफ़ करें?',
    confirm_load:' — यह मानचित्र लोड करें? वर्तमान कार्य खो जाएगा।',
    confirm_del:' — हटाएं?',
    no_saves:'कोई सहेजा मानचित्र नहीं', selected:'चुना',
    direction:'दिशा', auto:'स्वचालित', delete:'🗑 हटाएं', save_ph:'मानचित्र नाम...',
    s_night:'🌙 रात्रि मोड',   s_night_desc:'रात्रि दृश्य और प्रकाश प्रभाव',
    s_sound:'🔊 ध्वनि',        s_sound_desc:'ब्लॉक रखने पर ध्वनि प्रभाव',
    s_vibe:'📳 कंपन',          s_vibe_desc:'टैप पर कंपन प्रतिक्रिया',
    s_grid:'⊞ ग्रिड',         s_grid_desc:'ग्रिड रेखाएं दिखाएं',
    s_lang:'🌐 भाषा',          s_lang_desc:'प्रदर्शन भाषा चुनें',
    s_bg:'🎨 पृष्ठभूमि',      s_bg_desc:'मानचित्र की भूमि और आकाश का रंग'
  }
};

function t(k){ return (I18N[lang] || I18N.ja)[k] || k; }

// ブロック名取得：その言語になければen→jaの順でフォールバック
function bname(b){ return b.name[lang] || b.name.en || b.name.ja; }

// ── applyLang ─────────────────────────────────────────────────────
function applyLang(newLang){
  lang = newLang;

  // lang buttons highlight
  document.querySelectorAll('.lang-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.lang === lang);
  });

  // ── Top bar ──
  var elUndo = document.getElementById('lbl-undo');       if(elUndo)     elUndo.textContent     = t('undo');
  var elRedo = document.getElementById('lbl-redo');       if(elRedo)     elRedo.textContent     = t('redo');
  var elCtr  = document.getElementById('lbl-center');     if(elCtr)      elCtr.textContent      = t('center');
  var elSet  = document.getElementById('lbl-settings');   if(elSet)      elSet.textContent      = t('settings');

  // ── Bottom bar (span.bb-lbl) ──
  var elDraw  = document.getElementById('lbl-draw');   if(elDraw)  elDraw.textContent  = t('draw');
  var elErase = document.getElementById('lbl-erase');  if(elErase) elErase.textContent = t('erase');
  var elFill  = document.getElementById('lbl-fill');   if(elFill)  elFill.textContent  = t('fill');
  var elList  = document.getElementById('lbl-list');   if(elList)  elList.textContent  = t('list');

  // ── Settings panel labels & descriptions ──
  setText('lbl-s-night',  t('s_night'));       setText('desc-s-night',  t('s_night_desc'));
  setText('lbl-s-sound',  t('s_sound'));       setText('desc-s-sound',  t('s_sound_desc'));
  setText('lbl-s-vibe',   t('s_vibe'));        setText('desc-s-vibe',   t('s_vibe_desc'));
  setText('lbl-s-grid',   t('s_grid'));        setText('desc-s-grid',   t('s_grid_desc'));
  setText('lbl-s-bg',     t('s_bg'));          setText('desc-s-bg',     t('s_bg_desc'));
  setText('lbl-s-lang',   t('s_lang'));        setText('desc-s-lang',   t('s_lang_desc'));

  var ph = document.getElementById('field-name-input'); if(ph) ph.placeholder = t('save_ph');
  setText('settings-save',  t('save'));
  setText('settings-clear', t('clear'));
  setText('settings-close', t('close'));

  // ── Context menu ──
  setText('ctx-auto',   t('auto'));
  setText('ctx-delete', t('delete'));

  // ── sel-label（現在選択中ブロック名を新言語で表示）──
  var selLabel = document.getElementById('sel-label');
  if(selLabel){
    var selBlock = BLOCKS[selectedId];
    selLabel.textContent = selBlock ? bname(selBlock) : t('selected');
  }

  rebuildSheet();
}

function setText(id, str){
  var el = document.getElementById(id); if(el) el.textContent = str;
}

// ── Sheet ─────────────────────────────────────────────────────────
function buildSheet(){
  var tabs = document.getElementById('sheet-tabs');
  var grid = document.getElementById('block-grid');
  if(!tabs || !grid) return;
  tabs.innerHTML = CATS.map(function(c){
    return '<button class="s-tab' + (c.id === currentCat ? ' active' : '') + '" data-cat="' + c.id + '">'
      + c.icon + ' ' + bname(c) + '</button>';
  }).join('');
  tabs.querySelectorAll('.s-tab').forEach(function(btn){
    btn.addEventListener('click', function(){ switchCat(btn.dataset.cat); });
  });
  renderCat(currentCat);
}

function rebuildSheet(){ buildSheet(); }

function switchCat(catId){
  currentCat = catId;
  document.querySelectorAll('.s-tab').forEach(function(b){
    b.classList.toggle('active', b.dataset.cat === catId);
  });
  renderCat(catId);
}

function renderCat(catId){
  var grid = document.getElementById('block-grid'); if(!grid) return;
  var ids = Object.keys(BLOCKS).filter(function(id){
    return BLOCKS[id].cat === catId && !BLOCKS[id].hidden;
  });
  grid.innerHTML = ids.map(function(id){
    var b = BLOCKS[id];
    return '<button class="block-btn' + (id === selectedId ? ' selected' : '') + '" data-id="' + id + '">'
      + (b.icon || '?') + '<span class="block-label">' + bname(b) + '</span></button>';
  }).join('');
  grid.querySelectorAll('.block-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ selectBlock(btn.dataset.id); });
  });
}

function selectBlock(id){
  selectedId = id;
  var b = BLOCKS[id]; if(!b) return;
  var icon  = document.getElementById('sel-icon');  if(icon)  icon.textContent  = b.icon || '?';
  var label = document.getElementById('sel-label'); if(label) label.textContent = bname(b);
  document.querySelectorAll('.block-btn').forEach(function(btn){
    btn.classList.toggle('selected', btn.dataset.id === id);
  });
  closeSheet();
}

function openSheet(){
  sheetOpen = true;
  var pb = document.getElementById('parts-btn');
  if(pb){
    pb.classList.remove('popping');
    void pb.offsetWidth;
    pb.classList.add('popping');
    pb.classList.add('sheet-open');
  }
  document.getElementById('sheet').classList.add('open');
  document.getElementById('sheet-backdrop').style.display = 'block';
  if(pb) pb.classList.add('open-state');
}

// iOSはtouchstartでアニメーションを直接発火
function initPartsPopOnTouch(){
  var pb = document.getElementById('parts-btn');
  if(!pb) return;
  pb.addEventListener('touchstart', function(){
    pb.classList.remove('popping');
    void pb.offsetWidth;
    pb.classList.add('popping');
  }, {passive:true});
}

function closeSheet(){
  sheetOpen = false;
  var pb = document.getElementById('parts-btn');
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('sheet-backdrop').style.display = 'none';
  if(pb) pb.classList.remove('open-state');
  setTimeout(function(){
    if(pb) pb.classList.remove('sheet-open');
  }, 320);
}

function toggleSheet(){ sheetOpen ? closeSheet() : openSheet(); }

// ── Settings ──────────────────────────────────────────────────────
function openSettings(){
  renderSlots();
  document.getElementById('settings-panel').style.display = 'block';
  document.getElementById('settings-backdrop').style.display = 'block';
}

function closeSettings(){
  document.getElementById('settings-panel').style.display = 'none';
  document.getElementById('settings-backdrop').style.display = 'none';
}

// ── Context Menu ──────────────────────────────────────────────────
var ctxC = -1, ctxR = -1;

function openCtxMenu(c, r, screenX, screenY){
  ctxC = c; ctxR = r;
  var cell = getCell(c, r); if(!cell) return;
  var menu = document.getElementById('ctx-menu');
  menu.style.left = Math.min(screenX, window.innerWidth - 180) + 'px';
  menu.style.top  = Math.max(10, screenY - 80) + 'px';
  menu.classList.add('show');
  var curDir = cell.dir || 'none';
  menu.querySelectorAll('.ctx-dir-btn').forEach(function(b){
    b.classList.toggle('active-dir', b.dataset.dir === curDir);
  });
  var titleEl = document.getElementById('ctx-title');
  if(titleEl) titleEl.textContent = (BLOCKS[cell.id] ? bname(BLOCKS[cell.id]) : '');
}

function closeCtxMenu(){ document.getElementById('ctx-menu').classList.remove('show'); }

function setDir(dir){
  if(!inGrid(ctxC, ctxR)) return;
  var cell = getCell(ctxC, ctxR); if(!cell) return;
  pushUndo();
  cell.dir = dir;
  closeCtxMenu();
  scheduleRender();
}

function ctxDelete(){
  if(!inGrid(ctxC, ctxR)) return;
  pushUndo();
  delete cells[ck(ctxC, ctxR)];
  closeCtxMenu();
  scheduleRender();
}

// ── Night Mode ────────────────────────────────────────────────────
function toggleNight(){
  nightMode = !nightMode;
  var btn = document.getElementById('settings-night');
  if(btn){
    btn.classList.toggle('on', nightMode);
    btn.textContent = nightMode ? 'ON' : 'OFF';
  }
  document.body.classList.toggle('night-mode', nightMode);
  scheduleRender();
}

// ── Background Color Switcher ─────────────────────────────────────
var BG_KEY = 'mc_planner_bg';

function applyBg(bg){
  // 既存の bg-xxx クラスを全除去してから付与
  var classes = Array.from(document.body.classList);
  classes.forEach(function(cls){
    if(cls.startsWith('bg-')) document.body.classList.remove(cls);
  });
  document.body.classList.add('bg-' + bg);

  // スウォッチの active 更新
  document.querySelectorAll('.bg-swatch').forEach(function(b){
    b.classList.toggle('active', b.dataset.bg === bg);
  });

  // キャンバス再描画
  if(typeof scheduleRender === 'function') scheduleRender();
}

function initBgSwatches(){
  // 保存済み設定を復元（なければ default）
  var saved = localStorage.getItem(BG_KEY) || 'default';
  applyBg(saved);

  document.querySelectorAll('.bg-swatch').forEach(function(btn){
    btn.addEventListener('click', function(){
      var bg = btn.dataset.bg;
      applyBg(bg);
      localStorage.setItem(BG_KEY, bg);
    });
  });
}

// ── Toggle helpers ────────────────────────────────────────────────
function bindToggle(id, onCb){
  var btn = document.getElementById(id); if(!btn) return;
  btn.addEventListener('click', function(){
    btn.classList.toggle('on');
    var isOn = btn.classList.contains('on');
    btn.textContent = isOn ? 'ON' : 'OFF';
    onCb(isOn);
  });
}

// ── Init UI ───────────────────────────────────────────────────────
// 安全なaddEventListener：要素がnullでもクラッシュしない
function on(id, ev, fn){
  var el = document.getElementById(id);
  if(el) el.addEventListener(ev, fn);
}

function initUI(){
  buildSheet();

  on('parts-btn',          'click', toggleSheet);
  on('sheet-backdrop',     'click', closeSheet);
  on('btn-settings',       'click', openSettings);
  on('settings-backdrop',  'click', closeSettings);
  on('settings-close',     'click', closeSettings);

  document.querySelectorAll('.lang-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ applyLang(btn.dataset.lang); });
  });

  on('settings-save', 'click', function(){
    var name = (document.getElementById('field-name-input').value || '').trim();
    if(!name){ alert(t('save_ph')); return; }
    if(saveMap(name)){
      renderSlots();
      document.getElementById('field-name-input').value = '';
    }
  });

  on('settings-clear', 'click', function(){
    if(!confirm(t('confirm_clear'))) return;
    cells = {};
    closeSettings();
    scheduleRender();
  });

  // 夜間モード（設定パネル内）
  on('settings-night', 'click', toggleNight);

  bindToggle('settings-sound', function(v){ soundOn = v; });
  bindToggle('settings-vibe',  function(v){ vibeOn  = v; });
  bindToggle('settings-grid',  function(v){ showGrid = v; scheduleRender(); });

  // 背景色スウォッチ
  initBgSwatches();

  // コンテキストメニュー
  document.querySelectorAll('.ctx-dir-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ setDir(btn.dataset.dir); });
  });
  on('ctx-delete', 'click', ctxDelete);
  on('ctx-close',  'click', closeCtxMenu);

  // iOS touch対応
  initPartsPopOnTouch();

  // 上部バーボタンのクリックアニメーション（iOS含む）
  document.querySelectorAll('.tb-btn').forEach(function(btn){
    function pop(){
      btn.classList.remove('popping');
      void btn.offsetWidth;
      btn.classList.add('popping');
    }
    btn.addEventListener('touchstart', pop, {passive:true});
    btn.addEventListener('mousedown',  pop);
  });
}
