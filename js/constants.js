// constants.js
// Block definitions, categories, and global config.
//
// variants:[...] = 配置時にランダムでいずれかのIDが選ばれる。
//                  選択画面には先頭ブロック1つだけ表示。
// hidden:true    = 選択画面に表示しない（バリアント2・3等）

// ── Grid / ISO geometry ──────────────────────────────────────────
var COLS = 40, ROWS = 40;
var BH_SCALE = 0.5;  // 全建物の高さ倍率 (1.0 = 元の高さ、0.5 = 半分)

// ──────────────────────────────────────────────────────────────────
// 高さをさらに調整したい場合は BH_SCALE の値を変えるだけで全建物に反映。
// 例: 0.6 にすれば 60% の高さ、1.0 で元の高さに戻る。
var ISO_W = 56, ISO_H = 28;
var HW = ISO_W / 2, HH = ISO_H / 2;
var MIN_ZOOM = 0.3, MAX_ZOOM = 3.5;
var DEFAULT_ZOOM = 1.1;

var BLOCKS = {

  // ── RESIDENTIAL ──────────────────────────────────────────────
  house1:    {cat:'r', icon:'🏠', bh:33, variants:['house1','house2','house3','house4','house5'], name:{ja:'家',         en:'House',       zh:'房屋',   ko:'집'}},
  house2:    {cat:'r', icon:'🏠', bh:38, hidden:true, name:{ja:'家2',    en:'House 2',     zh:'房屋2', ko:'집2'}},
  house3:    {cat:'r', icon:'🏠', bh:42, hidden:true, name:{ja:'家3',    en:'House 3',     zh:'房屋3', ko:'집3'}},
  house4:    {cat:'r', icon:'🏡', bh:37, hidden:true, name:{ja:'家4',    en:'House 4',     zh:'房屋4', ko:'집4'}},
  house5:    {cat:'r', icon:'🏡', bh:43, hidden:true, name:{ja:'家5',    en:'House 5',     zh:'房屋5', ko:'집5'}},

  apt1:      {cat:'r', icon:'🏢', bh:58, variants:['apt1','apt2','apt3'], name:{ja:'マンション',   en:'Apartment', zh:'公寓',   ko:'아파트'}},
  apt2:      {cat:'r', icon:'🏢', bh:70, hidden:true, name:{ja:'マンション2', en:'Apt 2',      zh:'公寓2', ko:'아파트2'}},
  apt3:      {cat:'r', icon:'🏢', bh:82, hidden:true, name:{ja:'マンション3', en:'Apt 3',      zh:'公寓3', ko:'아파트3'}},

  castle1:   {cat:'r', icon:'🏰', bh:52, variants:['castle1','castle2','castle3'], name:{ja:'お城',     en:'Castle',      zh:'城堡',   ko:'성'}},
  castle2:   {cat:'r', icon:'🏰', bh:60, hidden:true, name:{ja:'お城2',  en:'Castle 2',    zh:'城堡2', ko:'성2'}},
  castle3:   {cat:'r', icon:'🏰', bh:70, hidden:true, name:{ja:'お城3',  en:'Castle 3',    zh:'城堡3', ko:'성3'}},

  church1:   {cat:'r', icon:'⛪', bh:48, variants:['church1','church2','church3'], name:{ja:'教会',     en:'Church',      zh:'教堂',   ko:'교회'}},
  church2:   {cat:'r', icon:'⛪', bh:57, hidden:true, name:{ja:'教会2',  en:'Church 2',    zh:'教堂2', ko:'교회2'}},
  church3:   {cat:'r', icon:'⛪', bh:67, hidden:true, name:{ja:'教会3',  en:'Church 3',    zh:'教堂3', ko:'교회3'}},

  farm1:     {cat:'r', icon:'🌾', bh:27, variants:['farm1','farm2','farm3'], name:{ja:'農場',     en:'Farm',        zh:'农场',   ko:'농장'}},
  farm2:     {cat:'r', icon:'🌾', bh:30, hidden:true, name:{ja:'農場2',  en:'Farm 2',      zh:'农场2', ko:'농장2'}},
  farm3:     {cat:'r', icon:'🌾', bh:28, hidden:true, name:{ja:'農場3',  en:'Farm 3',      zh:'农场3', ko:'농장3'}},

  cobble:    {cat:'r', icon:'🪨', bh:2,  name:{ja:'石畳',    en:'Cobble',      zh:'石板路', ko:'돌길'}},

  // ── COMMERCIAL ───────────────────────────────────────────────
  shop1:     {cat:'c', icon:'🏪', bh:37, variants:['shop1','shop2','shop3'], name:{ja:'ショップ',   en:'Shop',        zh:'商店',   ko:'상점'}},
  shop2:     {cat:'c', icon:'🏪', bh:42, hidden:true, name:{ja:'ショップ2', en:'Shop 2',    zh:'商店2', ko:'상점2'}},
  shop3:     {cat:'c', icon:'🏪', bh:38, hidden:true, name:{ja:'ショップ3', en:'Shop 3',    zh:'商店3', ko:'상점3'}},

  hotel1:    {cat:'c', icon:'🏨', bh:57, variants:['hotel1','hotel2','hotel3'], name:{ja:'ホテル',   en:'Hotel',       zh:'酒店',   ko:'호텔'}},
  hotel2:    {cat:'c', icon:'🏨', bh:68, hidden:true, name:{ja:'ホテル2', en:'Hotel 2',    zh:'酒店2', ko:'호텔2'}},
  hotel3:    {cat:'c', icon:'🏨', bh:78, hidden:true, name:{ja:'ホテル3', en:'Hotel 3',    zh:'酒店3', ko:'호텔3'}},

  factory1:  {cat:'c', icon:'🏭', bh:43, variants:['factory1','factory2','factory3'], name:{ja:'工場',     en:'Factory',     zh:'工厂',   ko:'공장'}},
  factory2:  {cat:'c', icon:'🏭', bh:52, hidden:true, name:{ja:'工場2',   en:'Factory 2',  zh:'工厂2', ko:'공장2'}},
  factory3:  {cat:'c', icon:'🏭', bh:60, hidden:true, name:{ja:'工場3',   en:'Factory 3',  zh:'工厂3', ko:'공장3'}},

  stadium:   {cat:'c', icon:'🏟', bh:38, name:{ja:'競技場',   en:'Stadium',    zh:'体育场', ko:'경기장'}},

  // ── PUBLIC ───────────────────────────────────────────────────
  police:    {cat:'p', icon:'🚓', bh:40, name:{ja:'警察署',  en:'Police',      zh:'警察局', ko:'경찰서'}},
  fire:      {cat:'p', icon:'🚒', bh:40, name:{ja:'消防署',  en:'Fire Stn',    zh:'消防站', ko:'소방서'}},

  school1:   {cat:'p', icon:'🏫', bh:43, variants:['school1','school2','school3'], name:{ja:'学校',     en:'School',      zh:'学校',   ko:'학교'}},
  school2:   {cat:'p', icon:'🏫', bh:50, hidden:true, name:{ja:'学校2',  en:'School 2',    zh:'学校2', ko:'학교2'}},
  school3:   {cat:'p', icon:'🏫', bh:58, hidden:true, name:{ja:'学校3',  en:'School 3',    zh:'学校3', ko:'학교3'}},

  park1:     {cat:'p', icon:'🌳', bh:18, variants:['park1','park2','park3'], name:{ja:'公園',     en:'Park',        zh:'公园',   ko:'공원'}},
  park2:     {cat:'p', icon:'🌳', bh:22, hidden:true, name:{ja:'公園2',  en:'Park 2',      zh:'公园2', ko:'공원2'}},
  park3:     {cat:'p', icon:'🌳', bh:23, hidden:true, name:{ja:'公園3',  en:'Park 3',      zh:'公园3', ko:'공원3'}},

  hospital1: {cat:'p', icon:'🏥', bh:52, variants:['hospital1','hospital2','hospital3'], name:{ja:'病院',     en:'Hospital',    zh:'医院',   ko:'병원'}},
  hospital2: {cat:'p', icon:'🏥', bh:60, hidden:true, name:{ja:'病院2',  en:'Hospital 2',  zh:'医院2', ko:'병원2'}},
  hospital3: {cat:'p', icon:'🏥', bh:68, hidden:true, name:{ja:'病院3',  en:'Hospital 3',  zh:'医院3', ko:'병원3'}},

  museum1:   {cat:'p', icon:'🏛', bh:48, variants:['museum1','museum2','museum3'], name:{ja:'博物館',   en:'Museum',      zh:'博物馆', ko:'박물관'}},
  museum2:   {cat:'p', icon:'🏛', bh:57, hidden:true, name:{ja:'博物館2', en:'Museum 2',   zh:'博物馆2', ko:'박물관2'}},
  museum3:   {cat:'p', icon:'🏛', bh:63, hidden:true, name:{ja:'博物館3', en:'Museum 3',   zh:'博物馆3', ko:'박물관3'}},

  landmark1: {cat:'p', icon:'🔺', bh:70, name:{ja:'ピラミッド', en:'Pyramid',  zh:'金字塔', ko:'피라미드'}},
  landmark2: {cat:'p', icon:'🗼', bh:97, name:{ja:'タワー',  en:'Tower',       zh:'高塔',   ko:'타워'}},
  landmark3: {cat:'p', icon:'🕌', bh:57, name:{ja:'モスク',  en:'Mosque',      zh:'清真寺', ko:'모스크'}},

  // ── TRANSPORT ────────────────────────────────────────────────
  road:      {cat:'d', icon:'🛣', bh:0,  road:1,              name:{ja:'道路',    en:'Road',      zh:'道路',   ko:'도로'}},
  highway:   {cat:'d', icon:'🛤', bh:0,  road:1, hw:1,        name:{ja:'国道',    en:'Highway',   zh:'公路',   ko:'고속도로'}},

  bridge1:   {cat:'d', icon:'🌉', bh:12, road:1, bridge:1, variants:['bridge1','bridge2','bridge3'], name:{ja:'橋',      en:'Bridge',    zh:'桥',     ko:'다리'}},
  bridge2:   {cat:'d', icon:'🌉', bh:17, road:1, bridge:1, hidden:true, name:{ja:'橋2',   en:'Bridge 2',  zh:'桥2',   ko:'다리2'}},
  bridge3:   {cat:'d', icon:'🌉', bh:20, road:1, bridge:1, hidden:true, name:{ja:'橋3',   en:'Bridge 3',  zh:'桥3',   ko:'다리3'}},

  hbridge1:  {cat:'d', icon:'🌉', bh:13, road:1, bridge:1, hw:1, variants:['hbridge1','hbridge2','hbridge3'], name:{ja:'国道橋',   en:'HwyBridge',   zh:'高速桥',   ko:'고속교'}},
  hbridge2:  {cat:'d', icon:'🌉', bh:18, road:1, bridge:1, hw:1, hidden:true, name:{ja:'国道橋2', en:'HwyBridge 2', zh:'高速桥2', ko:'고속교2'}},
  hbridge3:  {cat:'d', icon:'🌉', bh:22, road:1, bridge:1, hw:1, hidden:true, name:{ja:'国道橋3', en:'HwyBridge 3', zh:'高速桥3', ko:'고속교3'}},

  rail:      {cat:'d', icon:'🚆', bh:1,  road:1, rail:1,  name:{ja:'線路',    en:'Rail',      zh:'铁轨',   ko:'철로'}},

  station1:  {cat:'d', icon:'🚉', bh:43, variants:['station1','station2','station3'], name:{ja:'駅',      en:'Station',   zh:'车站',   ko:'역'}},
  station2:  {cat:'d', icon:'🚉', bh:52, hidden:true, name:{ja:'駅2',  en:'Station 2',    zh:'车站2',  ko:'역2'}},
  station3:  {cat:'d', icon:'🚉', bh:60, hidden:true, name:{ja:'駅3',  en:'Station 3',    zh:'车站3',  ko:'역3'}},

  port1:     {cat:'d', icon:'⚓',  bh:30, variants:['port1','port2','port3'], name:{ja:'港',      en:'Port',      zh:'港口',   ko:'항구'}},
  port2:     {cat:'d', icon:'⚓',  bh:37, hidden:true, name:{ja:'港2',  en:'Port 2',       zh:'港口2',  ko:'항구2'}},
  port3:     {cat:'d', icon:'⚓',  bh:43, hidden:true, name:{ja:'港3',  en:'Port 3',       zh:'港口3',  ko:'항구3'}},

  airport1:  {cat:'d', icon:'✈',  bh:23, variants:['airport1','airport2','airport3'], name:{ja:'空港',    en:'Airport',   zh:'机场',   ko:'공항'}},
  airport2:  {cat:'d', icon:'✈',  bh:28, hidden:true, name:{ja:'空港2', en:'Airport 2',   zh:'机场2',  ko:'공항2'}},
  airport3:  {cat:'d', icon:'✈',  bh:32, hidden:true, name:{ja:'空港3', en:'Airport 3',   zh:'机场3',  ko:'공항3'}},

  // ── NATURE ───────────────────────────────────────────────────
  water:     {cat:'n', icon:'💧', bh:1,  flood:1, name:{ja:'水',   en:'Water',    zh:'水',   ko:'물'}},
  grass:     {cat:'n', icon:'🌿', bh:1,  flood:1, name:{ja:'芝生', en:'Grass',    zh:'草地', ko:'잔디'}},
  forest:    {cat:'n', icon:'🌲', bh:30, flood:1, name:{ja:'森',   en:'Forest',   zh:'森林', ko:'숲'}},
  fountain:  {cat:'n', icon:'⛲', bh:23,           name:{ja:'噴水', en:'Fountain', zh:'喷泉', ko:'분수'}},
  flower:    {cat:'n', icon:'🌸', bh:7,  flood:1, name:{ja:'花壇', en:'Flowers',  zh:'花坛', ko:'화단'}},
  mountain:  {cat:'n', icon:'⛰', bh:53, flood:1, name:{ja:'山',   en:'Mountain', zh:'山',   ko:'산'}},
  volcano:   {cat:'n', icon:'🌋', bh:60, flood:1, name:{ja:'火山', en:'Volcano',  zh:'火山', ko:'화산'}}
};

// ── Category list (ordered for sheet tabs) ───────────────────────
var CATS = [
  {id:'r', icon:'🏠', name:{ja:'住居',   en:'Homes',      zh:'住宅', ko:'주거'}},
  {id:'c', icon:'🏪', name:{ja:'商業',   en:'Commerce',   zh:'商业', ko:'상업'}},
  {id:'p', icon:'🏛', name:{ja:'公共',   en:'Public',     zh:'公共', ko:'공공'}},
  {id:'d', icon:'🛣', name:{ja:'道路',   en:'Transport',  zh:'交通', ko:'교통'}},
  {id:'n', icon:'🌲', name:{ja:'自然',   en:'Nature',     zh:'自然', ko:'자연'}}
];

// ── Utility flags ─────────────────────────────────────────────────
function isRoad(id)   { return !!(BLOCKS[id] && BLOCKS[id].road); }
function isFlood(id)  { return !!(BLOCKS[id] && BLOCKS[id].flood); }
function isBridge(id) { return !!(BLOCKS[id] && BLOCKS[id].bridge); }
function isRail(id)   { return !!(BLOCKS[id] && BLOCKS[id].rail); }
function isHwy(id)    { return !!(BLOCKS[id] && BLOCKS[id].hw); }
function isNature(id) { return !!(BLOCKS[id] && BLOCKS[id].cat === 'n'); }

function blockName(id, lng) {
  var b = BLOCKS[id];
  if (!b) return id;
  return (b.name[lng] || b.name.ja || id);
}

// ── Variant resolver ──────────────────────────────────────────────
// 配置時に呼ぶ。variants があればランダムに1つ返す。
// interaction.js の placeCell() 内で使用する。
function resolveId(id) {
  var b = BLOCKS[id];
  if (b && b.variants && b.variants.length > 1) {
    var v = b.variants;
    return v[Math.floor(Math.random() * v.length)];
  }
  return id;
}
