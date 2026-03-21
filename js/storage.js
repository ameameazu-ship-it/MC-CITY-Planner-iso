/**
 * storage.js
 * Save and load city maps using localStorage.
 * Slot key: "mcIso_map_<name>"
 */

var STORAGE_PREFIX = 'mcIso_map_';

function saveMap(name){
  if(!name) return false;
  var data = {
    v:1,
    cells: cells,
    ts: Date.now()
  };
  try {
    localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(data));
    return true;
  } catch(e){
    alert('保存に失敗しました（容量不足の可能性があります）');
    return false;
  }
}

function loadMap(name){
  try {
    var raw = localStorage.getItem(STORAGE_PREFIX + name);
    if(!raw) return false;
    var data = JSON.parse(raw);
    cells = data.cells || {};
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
    el.innerHTML='<div class="map-slot-empty">保存済みマップなし</div>'; return;
  }
  el.innerHTML = maps.map(function(m){
    var dt = m.ts ? new Date(m.ts).toLocaleString() : '';
    var esc = m.name.replace(/"/g,'&quot;');
    return '<div class="map-slot">' +
      '<div class="map-slot-info"><div class="map-slot-name">'+m.name+'</div><div class="map-slot-date">'+dt+'</div></div>' +
      '<button class="map-load-btn" onclick="doLoadMap(\''+esc+'\')">読込</button>' +
      '<button class="map-del-btn" onclick="doDeleteMap(\''+esc+'\')">🗑</button>' +
    '</div>';
  }).join('');
}

function doLoadMap(name){
  if(!confirm(name + ' を読み込みますか？現在の作業は消えます。')) return;
  loadMap(name);
  closeSettings();
}

function doDeleteMap(name){
  if(!confirm(name + ' を削除しますか？')) return;
  deleteMap(name);
  renderSlots();
}
