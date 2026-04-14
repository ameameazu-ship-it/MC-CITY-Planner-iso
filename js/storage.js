/**
 * storage.js
 * Save and load city maps using localStorage.
 * Slot key: "mcIso_map_<name>"
 */
var STORAGE_PREFIX = 'mcIso_map_';

function saveMap(name){
  if(!name) return false;
  var data = { v:1, cells:cells, ts:Date.now() };
  try {
    localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(data));
    return true;
  } catch(e){
    alert(typeof t==='function' ? t('save_fail') : '保存に失敗しました');
    return false;
  }
}

function loadMap(name){
  try {
    var raw = localStorage.getItem(STORAGE_PREFIX + name);
    if(!raw) return false;
    var data = JSON.parse(raw);
    cells = data.cells || {};
    // groupMapを再構築（グループ情報がない場合は空に）
    if(typeof groupMap !== 'undefined') groupMap = {};
    if(typeof nextGid !== 'undefined') nextGid = 1;
    scheduleRender();
    return true;
  } catch(e){ return false; }
}

function deleteMap(name){
  localStorage.removeItem(STORAGE_PREFIX + name);
}

function listMaps(){
  var maps = [];
  for(var i=0; i<localStorage.length; i++){
    var k = localStorage.key(i);
    if(k && k.startsWith(STORAGE_PREFIX)){
      try {
        var d = JSON.parse(localStorage.getItem(k));
        maps.push({ name: k.slice(STORAGE_PREFIX.length), ts: d.ts||0 });
      } catch(e){}
    }
  }
  maps.sort(function(a,b){ return b.ts - a.ts; });
  return maps;
}

function renderSlots(){
  var el = document.getElementById('field-slot-list'); if(!el) return;
  var maps = listMaps();
  if(!maps.length){
    el.innerHTML = '<div class="map-slot-empty">' + (typeof t==='function' ? t('no_saves') : '保存済みマップなし') + '</div>';
    return;
  }
  var loadLbl = typeof t==='function' ? t('load') : '読込';
  el.innerHTML = maps.map(function(m){
    var dt = m.ts ? new Date(m.ts).toLocaleString() : '';
    var esc = m.name.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    return '<div class="map-slot">' +
      '<div class="map-slot-info">' +
        '<div class="map-slot-name">'+m.name+'</div>' +
        '<div class="map-slot-date">'+dt+'</div>' +
      '</div>' +
      '<button class="map-load-btn" onclick="doLoadMap(\''+esc+'\')">'+loadLbl+'</button>' +
      '<button class="map-del-btn" onclick="doDeleteMap(\''+esc+'\')">🗑</button>' +
    '</div>';
  }).join('');
}

function doLoadMap(name){
  var msg = typeof t==='function' ? (name + t('confirm_load')) : (name + ' を読み込みますか？現在の作業は消えます。');
  if(!confirm(msg)) return;
  loadMap(name);
  closeSettings();
}

function doDeleteMap(name){
  var msg = typeof t==='function' ? (name + t('confirm_del')) : (name + ' を削除しますか？');
  if(!confirm(msg)) return;
  deleteMap(name);
  renderSlots();
}
