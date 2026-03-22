/**

- constants.js
- Block definitions, categories, and global config.
- 
- variants:[…] = 配置時にランダムでいずれかのIDが選ばれる。
- ```
               選択画面には先頭ブロック1つだけ表示。
  ```
- hidden:true    = 選択画面に表示しない（バリアント②③等）
  */

// ── Grid / ISO geometry ──────────────────────────────────────────
var COLS = 40, ROWS = 40;
var ISO_W = 64, ISO_H = 32;
var HW = ISO_W / 2, HH = ISO_H / 2;
var MIN_ZOOM = 0.3, MAX_ZOOM = 3.5;
var DEFAULT_ZOOM = 0.85;

var BLOCKS = {

// ── RESIDENTIAL ─────────────────────────────────────────────
house1:    {cat:‘r’, icon:‘🏠’, bh:34, variants:[‘house1’,‘house2’,‘house3’,‘house4’,‘house5’], name:{ja:‘家’,         en:‘House’,       zh:‘房屋’,   ko:‘집’}},
house2:    {cat:‘r’, icon:‘🏠’, bh:38, hidden:true, name:{ja:‘家②’,    en:‘House 2’,     zh:‘房屋②’, ko:‘집②’}},
house3:    {cat:‘r’, icon:‘🏠’, bh:42, hidden:true, name:{ja:‘家③’,    en:‘House 3’,     zh:‘房屋③’, ko:‘집③’}},
house4:    {cat:‘r’, icon:‘🏡’, bh:36, hidden:true, name:{ja:‘家④’,    en:‘House 4’,     zh:‘房屋④’, ko:‘집④’}},
house5:    {cat:‘r’, icon:‘🏡’, bh:44, hidden:true, name:{ja:‘家⑤’,    en:‘House 5’,     zh:‘房屋⑤’, ko:‘집⑤’}},

apt1:      {cat:‘r’, icon:‘🏢’, bh:58, variants:[‘apt1’,‘apt2’,‘apt3’], name:{ja:‘マンション’, en:‘Apartment’, zh:‘公寓’,   ko:‘아파트’}},
apt2:      {cat:‘r’, icon:‘🏢’, bh:70, hidden:true, name:{ja:‘マンション②’, en:‘Apt 2’,  zh:‘公寓②’, ko:‘아파트②’}},
apt3:      {cat:‘r’, icon:‘🏢’, bh:82, hidden:true, name:{ja:‘マンション③’, en:‘Apt 3’,  zh:‘公寓③’, ko:‘아파트③’}},

castle1:   {cat:‘r’, icon:‘🏰’, bh:52, variants:[‘castle1’,‘castle2’,‘castle3’], name:{ja:‘お城’,     en:‘Castle’,      zh:‘城堡’,   ko:‘성’}},
castle2:   {cat:‘r’, icon:‘🏰’, bh:60, hidden:true, name:{ja:‘お城②’,  en:‘Castle 2’,    zh:‘城堡②’, ko:‘성②’}},
castle3:   {cat:‘r’, icon:‘🏰’, bh:70, hidden:true, name:{ja:‘お城③’,  en:‘Castle 3’,    zh:‘城堡③’, ko:‘성③’}},

church1:   {cat:‘r’, icon:‘⛪’, bh:48, variants:[‘church1’,‘church2’,‘church3’], name:{ja:‘教会’,     en:‘Church’,      zh:‘教堂’,   ko:‘교회’}},
church2:   {cat:‘r’, icon:‘⛪’, bh:56, hidden:true, name:{ja:‘教会②’,  en:‘Church 2’,    zh:‘教堂②’, ko:‘교회②’}},
church3:   {cat:‘r’, icon:‘⛪’, bh:66, hidden:true, name:{ja:‘教会③’,  en:‘Church 3’,    zh:‘教堂③’, ko:‘교회③’}},

farm1:     {cat:‘r’, icon:‘🌾’, bh:26, variants:[‘farm1’,‘farm2’,‘farm3’], name:{ja:‘農場’,     en:‘Farm’,        zh:‘农场’,   ko:‘농장’}},
farm2:     {cat:‘r’, icon:‘🌾’, bh:30, hidden:true, name:{ja:‘農場②’,  en:‘Farm 2’,      zh:‘农场②’, ko:‘농장②’}},
farm3:     {cat:‘r’, icon:‘🌾’, bh:28, hidden:true, name:{ja:‘農場③’,  en:‘Farm 3’,      zh:‘农场③’, ko:‘농장③’}},

cobble:    {cat:‘r’, icon:‘🪨’, bh:3,  name:{ja:‘石畳’,    en:‘Cobble’,      zh:‘石板路’, ko:‘돌길’}},

// ── COMMERCIAL ──────────────────────────────────────────────
shop1:     {cat:‘c’, icon:‘🏪’, bh:36, variants:[‘shop1’,‘shop2’,‘shop3’], name:{ja:‘ショップ’,  en:‘Shop’,        zh:‘商店’,   ko:‘상점’}},
shop2:     {cat:‘c’, icon:‘🏪’, bh:42, hidden:true, name:{ja:‘ショップ②’, en:‘Shop 2’,   zh:‘商店②’, ko:‘상점②’}},
shop3:     {cat:‘c’, icon:‘🏪’, bh:38, hidden:true, name:{ja:‘ショップ③’, en:‘Shop 3’,   zh:‘商店③’, ko:‘상점③’}},

hotel1:    {cat:‘c’, icon:‘🏨’, bh:56, variants:[‘hotel1’,‘hotel2’,‘hotel3’], name:{ja:‘ホテル’,   en:‘Hotel’,       zh:‘酒店’,   ko:‘호텔’}},
hotel2:    {cat:‘c’, icon:‘🏨’, bh:68, hidden:true, name:{ja:‘ホテル②’, en:‘Hotel 2’,    zh:‘酒店②’, ko:‘호텔②’}},
hotel3:    {cat:‘c’, icon:‘🏨’, bh:78, hidden:true, name:{ja:‘ホテル③’, en:‘Hotel 3’,    zh:‘酒店③’, ko:‘호텔③’}},

factory1:  {cat:‘c’, icon:‘🏭’, bh:44, variants:[‘factory1’,‘factory2’,‘factory3’], name:{ja:‘工場’,     en:‘Factory’,     zh:‘工厂’,   ko:‘공장’}},
factory2:  {cat:‘c’, icon:‘🏭’, bh:52, hidden:true, name:{ja:‘工場②’,   en:‘Factory 2’,  zh:‘工厂②’, ko:‘공장②’}},
factory3:  {cat:‘c’, icon:‘🏭’, bh:60, hidden:true, name:{ja:‘工場③’,   en:‘Factory 3’,  zh:‘工厂③’, ko:‘공장③’}},

stadium:   {cat:‘c’, icon:‘🏟’, bh:38, name:{ja:‘競技場’,   en:‘Stadium’,    zh:‘体育场’, ko:‘경기장’}},

// ── PUBLIC ──────────────────────────────────────────────────
police:    {cat:‘p’, icon:‘🚓’, bh:40, name:{ja:‘警察署’,  en:‘Police’,      zh:‘警察局’, ko:‘경찰서’}},
fire:      {cat:‘p’, icon:‘🚒’, bh:40, name:{ja:‘消防署’,  en:‘Fire Stn’,    zh:‘消防站’, ko:‘소방서’}},

school1:   {cat:‘p’, icon:‘🏫’, bh:44, variants:[‘school1’,‘school2’,‘school3’], name:{ja:‘学校’,     en:‘School’,      zh:‘学校’,   ko:‘학교’}},
school2:   {cat:‘p’, icon:‘🏫’, bh:50, hidden:true, name:{ja:‘学校②’,  en:‘School 2’,    zh:‘学校②’, ko:‘학교②’}},
school3:   {cat:‘p’, icon:‘🏫’, bh:58, hidden:true, name:{ja:‘学校③’,  en:‘School 3’,    zh:‘学校③’, ko:‘학교③’}},

park1:     {cat:‘p’, icon:‘🌳’, bh:18, variants:[‘park1’,‘park2’,‘park3’], name:{ja:‘公園’,     en:‘Park’,        zh:‘公园’,   ko:‘공원’}},
park2:     {cat:‘p’, icon:‘🌳’, bh:22, hidden:true, name:{ja:‘公園②’,  en:‘Park 2’,      zh:‘公园②’, ko:‘공원②’}},
park3:     {cat:‘p’, icon:‘🌳’, bh:24, hidden:true, name:{ja:‘公園③’,  en:‘Park 3’,      zh:‘公园③’, ko:‘공원③’}},

hospital1: {cat:‘p’, icon:‘🏥’, bh:52, variants:[‘hospital1’,‘hospital2’,‘hospital3’], name:{ja:‘病院’,     en:‘Hospital’,    zh:‘医院’,   ko:‘병원’}},
hospital2: {cat:‘p’, icon:‘🏥’, bh:60, hidden:true, name:{ja:‘病院②’,  en:‘Hospital 2’,  zh:‘医院②’, ko:‘병원②’}},
hospital3: {cat:‘p’, icon:‘🏥’, bh:68, hidden:true, name:{ja:‘病院③’,  en:‘Hospital 3’,  zh:‘医院③’, ko:‘병원③’}},

museum1:   {cat:‘p’, icon:‘🏛’, bh:48, variants:[‘museum1’,‘museum2’,‘museum3’], name:{ja:‘博物館’,   en:‘Museum’,      zh:‘博物馆’, ko:‘박물관’}},
museum2:   {cat:‘p’, icon:‘🏛’, bh:56, hidden:true, name:{ja:‘博物館②’, en:‘Museum 2’,   zh:‘博物馆②’, ko:‘박물관②’}},
museum3:   {cat:‘p’, icon:‘🏛’, bh:64, hidden:true, name:{ja:‘博物館③’, en:‘Museum 3’,   zh:‘博物馆③’, ko:‘박물관③’}},

landmark1: {cat:‘p’, icon:‘🔺’, bh:70, name:{ja:‘ピラミッド’, en:‘Pyramid’,  zh:‘金字塔’, ko:‘피라미드’}},
landmark2: {cat:‘p’, icon:‘🗼’, bh:96, name:{ja:‘タワー’,  en:‘Tower’,       zh:‘高塔’,   ko:‘타워’}},
landmark3: {cat:‘p’, icon:‘🕌’, bh:56, name:{ja:‘モスク’,  en:‘Mosque’,      zh:‘清真寺’, ko:‘모스크’}},

// ── TRANSPORT ───────────────────────────────────────────────
road:      {cat:‘d’, icon:‘🛣’, bh:0,  road:1,          name:{ja:‘道路’,    en:‘Road’,      zh:‘道路’,   ko:‘도로’}},
highway:   {cat:‘d’, icon:‘🛤’, bh:0,  road:1, hw:1,    name:{ja:‘国道’,    en:‘Highway’,   zh:‘公路’,   ko:‘고속도로’}},

bridge1:   {cat:‘d’, icon:‘🌉’, bh:12, road:1, bridge:1, variants:[‘bridge1’,‘bridge2’,‘bridge3’], name:{ja:‘橋’,      en:‘Bridge’,    zh:‘桥’,     ko:‘다리’}},
bridge2:   {cat:‘d’, icon:‘🌉’, bh:16, road:1, bridge:1, hidden:true, name:{ja:‘橋②’,   en:‘Bridge 2’,  zh:‘桥②’,   ko:‘다리②’}},
bridge3:   {cat:‘d’, icon:‘🌉’, bh:20, road:1, bridge:1, hidden:true, name:{ja:‘橋③’,   en:‘Bridge 3’,  zh:‘桥③’,   ko:‘다리③’}},

hbridge1:  {cat:‘d’, icon:‘🌉’, bh:14, road:1, bridge:1, hw:1, variants:[‘hbridge1’,‘hbridge2’,‘hbridge3’], name:{ja:‘国道橋’, en:‘HwyBridge’, zh:‘高速桥’, ko:‘고속교’}},
hbridge2:  {cat:‘d’, icon:‘🌉’, bh:18, road:1, bridge:1, hw:1, hidden:true, name:{ja:‘国道橋②’, en:‘HwyBridge 2’, zh:‘高速桥②’, ko:‘고속교②’}},
hbridge3:  {cat:‘d’, icon:‘🌉’, bh:22, road:1, bridge:1, hw:1, hidden:true, name:{ja:‘国道橋③’, en:‘HwyBridge 3’, zh:‘高速桥③’, ko:‘고속교③’}},

rail:      {cat:‘d’, icon:‘🚆’, bh:2,  road:1, rail:1,  name:{ja:‘線路’,    en:‘Rail’,      zh:‘铁轨’,   ko:‘철로’}},

station1:  {cat:‘d’, icon:‘🚉’, bh:44, variants:[‘station1’,‘station2’,‘station3’], name:{ja:‘駅’,      en:‘Station’,   zh:‘车站’,   ko:‘역’}},
station2:  {cat:‘d’, icon:‘🚉’, bh:52, hidden:true, name:{ja:‘駅②’,  en:‘Station 2’,    zh:‘车站②’,  ko:‘역②’}},
station3:  {cat:‘d’, icon:‘🚉’, bh:60, hidden:true, name:{ja:‘駅③’,  en:‘Station 3’,    zh:‘车站③’,  ko:‘역③’}},

port1:     {cat:‘d’, icon:‘⚓’,  bh:30, variants:[‘port1’,‘port2’,‘port3’], name:{ja:‘港’,      en:‘Port’,      zh:‘港口’,   ko:‘항구’}},
port2:     {cat:‘d’, icon:‘⚓’,  bh:36, hidden:true, name:{ja:‘港②’,  en:‘Port 2’,       zh:‘港口②’,  ko:‘항구②’}},
port3:     {cat:‘d’, icon:‘⚓’,  bh:44, hidden:true, name:{ja:‘港③’,  en:‘Port 3’,       zh:‘港口③’,  ko:‘항구③’}},

airport1:  {cat:‘d’, icon:‘✈’,  bh:24, variants:[‘airport1’,‘airport2’,‘airport3’], name:{ja:‘空港’,    en:‘Airport’,   zh:‘机场’,   ko:‘공항’}},
airport2:  {cat:‘d’, icon:‘✈’,  bh:28, hidden:true, name:{ja:‘空港②’, en:‘Airport 2’,   zh:‘机场②’,  ko:‘공항②’}},
airport3:  {cat:‘d’, icon:‘✈’,  bh:32, hidden:true, name:{ja:‘空港③’, en:‘Airport 3’,   zh:‘机场③’,  ko:‘공항③’}},

// ── NATURE ──────────────────────────────────────────────────
water:     {cat:‘n’, icon:‘💧’, bh:1,  flood:1, name:{ja:‘水’,   en:‘Water’,    zh:‘水’,   ko:‘물’}},
grass:     {cat:‘n’, icon:‘🌿’, bh:2,  flood:1, name:{ja:‘芝生’, en:‘Grass’,    zh:‘草地’, ko:‘잔디’}},
forest:    {cat:‘n’, icon:‘🌲’, bh:30, flood:1, name:{ja:‘森’,   en:‘Forest’,   zh:‘森林’, ko:‘숲’}},
fountain:  {cat:‘n’, icon:‘⛲’, bh:24,           name:{ja:‘噴水’, en:‘Fountain’, zh:‘喷泉’, ko:‘분수’}},
flower:    {cat:‘n’, icon:‘🌸’, bh:6,  flood:1, name:{ja:‘花壇’, en:‘Flowers’,  zh:‘花坛’, ko:‘화단’}},
mountain:  {cat:‘n’, icon:‘⛰’, bh:54, flood:1, name:{ja:‘山’,   en:‘Mountain’, zh:‘山’,   ko:‘산’}},
volcano:   {cat:‘n’, icon:‘🌋’, bh:60, flood:1, name:{ja:‘火山’, en:‘Volcano’,  zh:‘火山’, ko:‘화산’}}
};

// ── Category list (ordered for sheet tabs) ──────────────────────
var CATS = [
{id:‘r’, icon:‘🏠’, name:{ja:‘住居’,   en:‘Homes’,      zh:‘住宅’, ko:‘주거’}},
{id:‘c’, icon:‘🏪’, name:{ja:‘商業’,   en:‘Commerce’,   zh:‘商业’, ko:‘상업’}},
{id:‘p’, icon:‘🏛’, name:{ja:‘公共’,   en:‘Public’,     zh:‘公共’, ko:‘공공’}},
{id:‘d’, icon:‘🛣’, name:{ja:‘道路’,   en:‘Transport’,  zh:‘交通’, ko:‘교통’}},
{id:‘n’, icon:‘🌲’, name:{ja:‘自然’,   en:‘Nature’,     zh:‘自然’, ko:‘자연’}}
];

// ── Utility flags ────────────────────────────────────────────────
function isRoad(id)  { return !!(BLOCKS[id] && BLOCKS[id].road); }
function isFlood(id) { return !!(BLOCKS[id] && BLOCKS[id].flood); }
function isBridge(id){ return !!(BLOCKS[id] && BLOCKS[id].bridge); }
function isRail(id)  { return !!(BLOCKS[id] && BLOCKS[id].rail); }
function isHwy(id)   { return !!(BLOCKS[id] && BLOCKS[id].hw); }
function isNature(id){ return !!(BLOCKS[id] && BLOCKS[id].cat === ‘n’); }

function blockName(id, lng) {
var b = BLOCKS[id]; if (!b) return id;
return (b.name[lng] || b.name.ja || id);
}

// ── Variant resolver ─────────────────────────────────────────────
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
