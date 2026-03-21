/**
 * ui.js
 * Block-picker sheet, settings panel, context menu, language, night mode.
 */

var lang = 'ja';
var currentCat = 'r';
var selectedId = 'house1';
var sheetOpen = false;
var soundOn = true, vibeOn = true;

// ── Language ─────────────────────────────────────────────────────
var I18N = {
  ja:{ draw:'描く', erase:'消す', fill:'塗り', list:'一覧', undo:'↩戻す', redo:'↪進む', center:'⌖中心', night:'🌙夜', settings:'⚙設定', save:'💾 保存', clear:'🗑 マップをクリア', close:'閉じる', confirm_clear:'マップをクリアしますか？', confirm_load:' を読み込みますか？現在の作業は消えます。', confirm_del:' を削除しますか？', grid:'⊞ グリッド', sound:'🔊 配置音', vibe:'📳 バイブ', lang_label:'🌐 言語', no_saves:'保存済みマップなし', selected:'選択中', direction:'向き', auto:'自動', delete:'🗑 削除', save_ph:'マップ名...'},
  en:{ draw:'Draw', erase:'Erase', fill:'Fill', list:'List', undo:'↩Undo', redo:'↪Redo', center:'⌖Ctr', night:'🌙Night', settings:'⚙Config', save:'💾 Save', clear:'🗑 Clear Map', close:'Close', confirm_clear:'Clear the map?', confirm_load:' — load this map? Current work will be lost.', confirm_del:' — delete?', grid:'⊞ Grid', sound:'🔊 Sound', vibe:'📳 Vibrate', lang_label:'🌐 Language', no_saves:'No saved maps', selected:'Selected', direction:'Direction', auto:'Auto', delete:'🗑 Delete', save_ph:'Map name...'},
  zh:{ draw:'绘制', erase:'删除', fill:'填充', list:'列表', undo:'↩撤销', redo:'↪重做', center:'⌖中心', night:'🌙夜晚', settings:'⚙设置', save:'💾 保存', clear:'🗑 清除地图', close:'关闭', confirm_clear:'清除地图？', confirm_load:' — 加载此地图？', confirm_del:' — 删除？', grid:'⊞ 网格', sound:'🔊 音效', vibe:'📳 振动', lang_label:'🌐 语言', no_saves:'无保存地图', selected:'已选', direction:'方向', auto:'自动', delete:'🗑 删除', save_ph:'地图名...'},
  ko:{ draw:'그리기', erase:'지우기', fill:'채우기', list:'목록', undo:'↩되돌리기', redo:'↪다시하기', center:'⌖중심', night:'🌙밤', settings:'⚙설정', save:'💾 저장', clear:'🗑 맵 지우기', close:'닫기', confirm_clear:'맵을 지울까요？', confirm_load:' — 이 맵을 불러올까요？', confirm_del:' — 삭제？', grid:'⊞ 그리드', sound:'🔊 효과음', vibe:'📳 진동', lang_label:'🌐 언어', no_saves:'저장된 맵 없음', selected:'선택', direction:'방향', auto:'자동', delete:'🗑 삭제', save_ph:'맵 이름...'}
};
function t(k){ return (I18N[lang]||I18N.ja)[k]||k; }

function applyLang(newLang){
  lang = newLang;
  // Update static text
  document.querySelectorAll('.lang-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.lang===lang); });
  var bb = { 'tool-draw':'draw','tool-erase':'erase','tool-fill':'fill' };
  Object.entries(bb).forEach(function(e){ var el=document.getElementById(e[0]); if(el) el.firstChild.textContent=t(e[1]); });
  document.getElementById('btn-undo').textContent=t('undo');
  document.getElementById('btn-redo').textContent=t('redo');
  document.getElementById('btn-center').textContent=t('center');
  document.getElementById('btn-night').textContent=t('night');
  document.getElementById('btn-settings').textContent=t('settings');
  var ph=document.getElementById('field-name-input'); if(ph) ph.placeholder=t('save_ph');
  var savebtn=document.getElementById('settings-save'); if(savebtn) savebtn.textContent=t('save');
  var clearbtn=document.getElementById('settings-clear'); if(clearbtn) clearbtn.textContent=t('clear');
  var closebtn=document.getElementById('settings-close'); if(closebtn) closebtn.textContent=t('close');
  rebuildSheet();
}

// ── Sheet ─────────────────────────────────────────────────────────
function buildSheet(){
  var tabs = document.getElementById('sheet-tabs');
  var grid = document.getElementById('block-grid');
  if(!tabs||!grid) return;
  tabs.innerHTML = CATS.map(function(c){
    return '<button class="s-tab'+(c.id===currentCat?' active':'')+'" data-cat="'+c.id+'">'
      +c.icon+' '+(c.name[lang]||c.name.ja)+'</button>';
  }).join('');
  tabs.querySelectorAll('.s-tab').forEach(function(btn){
    btn.addEventListener('click',function(){ switchCat(btn.dataset.cat); });
  });
  renderCat(currentCat);
}

function rebuildSheet(){ buildSheet(); }

function switchCat(catId){
  currentCat = catId;
  document.querySelectorAll('.s-tab').forEach(function(b){ b.classList.toggle('active', b.dataset.cat===catId); });
  renderCat(catId);
}

function renderCat(catId){
  var grid = document.getElementById('block-grid'); if(!grid) return;
  var ids = Object.keys(BLOCKS).filter(function(id){ return BLOCKS[id].cat===catId; });
  grid.innerHTML = ids.map(function(id){
    var b = BLOCKS[id];
    return '<button class="block-btn'+(id===selectedId?' selected':'')+'" data-id="'+id+'">'
      +(b.icon||'?')+'<span class="block-label">'+(b.name[lang]||b.name.ja)+'</span></button>';
  }).join('');
  grid.querySelectorAll('.block-btn').forEach(function(btn){
    btn.addEventListener('click',function(){ selectBlock(btn.dataset.id); });
  });
}

function selectBlock(id){
  selectedId = id;
  var b = BLOCKS[id]; if(!b) return;
  // Update preview
  var icon = document.getElementById('sel-icon'); if(icon) icon.textContent=b.icon||'?';
  var label= document.getElementById('sel-label'); if(label) label.textContent=b.name[lang]||b.name.ja;
  // Refresh grid highlight
  document.querySelectorAll('.block-btn').forEach(function(btn){ btn.classList.toggle('selected', btn.dataset.id===id); });
  closeSheet();
}

function openSheet(){
  sheetOpen=true;
  document.getElementById('sheet').classList.add('open');
  document.getElementById('sheet-backdrop').style.display='block';
  document.getElementById('parts-btn').classList.add('open-state');
}

function closeSheet(){
  sheetOpen=false;
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('sheet-backdrop').style.display='none';
  document.getElementById('parts-btn').classList.remove('open-state');
}

function toggleSheet(){ sheetOpen ? closeSheet() : openSheet(); }

// ── Settings ──────────────────────────────────────────────────────
function openSettings(){
  renderSlots();
  document.getElementById('settings-panel').style.display='block';
  document.getElementById('settings-backdrop').style.display='block';
}

function closeSettings(){
  document.getElementById('settings-panel').style.display='none';
  document.getElementById('settings-backdrop').style.display='none';
}

// ── Context Menu ──────────────────────────────────────────────────
var ctxC=-1, ctxR=-1;

function openCtxMenu(c,r,screenX,screenY){
  ctxC=c; ctxR=r;
  var cell=getCell(c,r); if(!cell) return;
  var menu=document.getElementById('ctx-menu');
  // Position
  menu.style.left=Math.min(screenX,window.innerWidth-180)+'px';
  menu.style.top =Math.max(10,screenY-80)+'px';
  menu.classList.add('show');
  // Update active direction button
  var curDir=cell.dir||'none';
  menu.querySelectorAll('.ctx-dir-btn').forEach(function(b){
    b.classList.toggle('active-dir', b.dataset.dir===curDir);
  });
  document.getElementById('ctx-title').textContent = BLOCKS[cell.id]?(BLOCKS[cell.id].name[lang]||''):'';
}

function closeCtxMenu(){ document.getElementById('ctx-menu').classList.remove('show'); }

function setDir(dir){
  if(!inGrid(ctxC,ctxR)) return;
  var cell=getCell(ctxC,ctxR); if(!cell) return;
  pushUndo();
  cell.dir=dir;
  closeCtxMenu();
  scheduleRender();
}

function ctxDelete(){
  if(!inGrid(ctxC,ctxR)) return;
  pushUndo();
  delete cells[ck(ctxC,ctxR)];
  closeCtxMenu();
  scheduleRender();
}

// ── Night Mode ────────────────────────────────────────────────────
function toggleNight(){
  nightMode=!nightMode;
  var btn=document.getElementById('btn-night');
  if(btn){ btn.classList.toggle('on',nightMode); btn.textContent=nightMode?'☀昼':'🌙夜'; }
  document.body.classList.toggle('night-mode',nightMode);
  scheduleRender();
}

// ── Toggle helpers ────────────────────────────────────────────────
function bindToggle(id, onCb){
  var btn=document.getElementById(id); if(!btn) return;
  btn.addEventListener('click',function(){
    btn.classList.toggle('on');
    onCb(btn.classList.contains('on'));
  });
}

// ── Init UI ───────────────────────────────────────────────────────
function initUI(){
  buildSheet();

  document.getElementById('parts-btn').addEventListener('click',toggleSheet);
  document.getElementById('sheet-backdrop').addEventListener('click',closeSheet);
  document.getElementById('btn-settings').addEventListener('click',openSettings);
  document.getElementById('settings-backdrop').addEventListener('click',closeSettings);
  document.getElementById('settings-close').addEventListener('click',closeSettings);

  document.querySelectorAll('.lang-btn').forEach(function(btn){
    btn.addEventListener('click',function(){ applyLang(btn.dataset.lang); });
  });

  document.getElementById('settings-save').addEventListener('click',function(){
    var name=(document.getElementById('field-name-input').value||'').trim();
    if(!name){ alert('名前を入力してください'); return; }
    if(saveMap(name)){ renderSlots(); document.getElementById('field-name-input').value=''; }
  });

  document.getElementById('settings-clear').addEventListener('click',function(){
    if(!confirm(t('confirm_clear'))) return;
    cells={}; closeSettings(); scheduleRender();
  });

  bindToggle('settings-sound', function(v){ soundOn=v; });
  bindToggle('settings-vibe',  function(v){ vibeOn=v; });
  bindToggle('settings-grid',  function(v){ showGrid=v; scheduleRender(); });

  document.getElementById('btn-night').addEventListener('click', toggleNight);

  // Context menu buttons
  document.querySelectorAll('.ctx-dir-btn').forEach(function(btn){
    btn.addEventListener('click',function(){ setDir(btn.dataset.dir); });
  });
  document.getElementById('ctx-delete').addEventListener('click', ctxDelete);
  document.getElementById('ctx-close').addEventListener('click', closeCtxMenu);
}
