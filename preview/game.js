(() => {
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
const REDUCED_MOTION=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const keys=new Set();
let last=performance.now();
let state='menu';
let game=null, roadGame=null;
let runSummary=null;
let packDrag=null, vehicleDrag=null;
let notice='',noticeT=0;
let townPanel=null;
let townWorld=null;
let restartConfirm=false;
let routeDepart=null;
let roadResultReveal=0;
let evolutionChoice=null;
let packReturn='route', packAdvance=true;
let vehicleReturn='route';
let joy={active:false,id:null,ox:0,oy:0,x:0,y:0,dx:0,dy:0};

const ART_SPRITES={
 junker:[0,0,160,190],bike:[180,0,120,190],truck:[320,0,160,190],missilevan:[500,0,170,190],wartruck:[690,0,190,190],
 survivor:[0,220,110,130],melee:[120,220,110,130],gunner:[240,220,110,130],grenadier:[360,220,110,130],sniper:[480,220,110,130],
 gas:[0,390,240,190],clinic:[260,390,240,190],motel:[520,390,240,190],junkyard:[780,390,240,190],
 dust:[0,650,220,130],explosion:[280,635,170,170]
};
const ART={img:new Image(),ready:false,error:false};
ART.img.onload=()=>{ART.ready=true;ART.error=false};
ART.img.onerror=()=>{ART.ready=false;ART.error=true};
ART.img.src=new URL('assets/art/combat-atlas.svg',document.baseURI).href+'?cb='+Date.now();
function drawArt(name,x,y,w,h,alpha=1){
 const r=ART_SPRITES[name];if(!ART.ready||!r)return false;
 ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(ART.img,r[0],r[1],r[2],r[3],x-w/2,y-h/2,w,h);ctx.restore();return true
}

const PROD_SOURCES={
 playerJunker:'assets/art/production/player_junker.webp',
 playerSurvivor:'assets/art/production/player_survivor.webp',
 playerBodyUpLeft:'assets/art/production/player_body_up_left_v2.webp',
 playerBodyUpRight:'assets/art/production/player_body_up_right_v2.webp',
 playerBodyDownLeft:'assets/art/production/player_body_down_left_v2.webp',
 playerBodyDownRight:'assets/art/production/player_body_down_right_v2.webp',
 playerWeaponRifle:'assets/art/production/player_weapon_rifle.webp',
 enemyBike:'assets/art/production/enemy_bike.webp',
 enemyBuggy:'assets/art/production/enemy_buggy_v1.webp',
 enemyTruck:'assets/art/production/enemy_truck_v2.webp',
 enemyWartruck:'assets/art/production/enemy_wartruck_v1.webp',
 enemyMissileVan:'assets/art/production/enemy_missile_van_v1.webp',
 enemyColossus:'assets/art/production/enemy_colossus_v1.webp',
 routeWasteland:'assets/art/production/route_wasteland_v1.webp',
 townRustwater:'assets/art/production/town_rustwater_v1.webp',
 siteGasStation:'assets/art/production/site_gas_station_v1.webp',
 siteClinic:'assets/art/production/site_clinic_v1.webp',
 siteMotel:'assets/art/production/site_motel_v1.webp',
 siteJunkyard:'assets/art/production/site_junkyard_v1.webp',
 propGasCover:'assets/art/production/prop_gas_cover_v1.webp',
 propGasPump:'assets/art/production/prop_gas_pump_v1.webp',
 propClinicCover:'assets/art/production/prop_clinic_cover_v1.webp',
 propMotelCover:'assets/art/production/prop_motel_cover_v1.webp',
 propJunkyardCover:'assets/art/production/prop_junkyard_cover_v1.webp',
 propJunkyardTireStack:'assets/art/production/prop_junkyard_tire_stack_v1.webp',
 propGasCache:'assets/art/production/prop_gas_cache_v1.webp',
 propClinicCache:'assets/art/production/prop_clinic_cache_v1.webp',
 propMotelCache:'assets/art/production/prop_motel_cache_v1.webp',
 propJunkyardCache:'assets/art/production/prop_junkyard_cache_v1.webp',
 lootGas:'assets/art/production/loot_gas_v1.webp',
 lootFood:'assets/art/production/loot_food_v1.webp',
 lootScrap:'assets/art/production/loot_scrap_v1.webp',
 lootMed:'assets/art/production/loot_med_v1.webp',
 enemyGunner:'assets/art/production/enemy_gunner_v1.webp',
 enemyMelee:'assets/art/production/enemy_melee_v1.webp',
 enemyGrenadier:'assets/art/production/enemy_grenadier_v1.webp',
 enemySniper:'assets/art/production/enemy_sniper_v1.webp',
 enemyArmored:'assets/art/production/enemy_armored_v1.webp',
 enemyElite:'assets/art/production/enemy_elite_v1.webp',
 enemyDriver:'assets/art/production/enemy_driver_v1.webp'
};
const PROD={};
for(const [key,src] of Object.entries(PROD_SOURCES)){
 const img=new Image();PROD[key]={img,ready:false,error:false};
 img.onload=()=>{PROD[key].ready=true;PROD[key].error=false};
 img.onerror=()=>{PROD[key].ready=false;PROD[key].error=true};
 img.src=new URL(src,document.baseURI).href+'?cb='+Date.now();
}
function drawProd(key,x,y,w,h,alpha=1){
 const a=PROD[key];if(!a?.ready)return false;
 ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(a.img,x-w/2,y-h/2,w,h);ctx.restore();return true
}

const C={bg:'#100f0b',panel:'#211f18',panel2:'#302b20',cream:'#f1e4c4',muted:'#9b927b',yellow:'#d9a52b',red:'#b94d37',green:'#708c55',blue:'#607d8d',teal:'#548c87',asphalt:'#302f2a',asphalt2:'#252620',sand:'#8b7655',sand2:'#695b45',outline:'#171812',white:'#f4ead2',gas:'#d7a12e',food:'#b86f43',scrap:'#9b9b91',med:'#bd5549',rust:'#8f4b32',dust:'#b79b6a',ink:'#15140f'};
const rnd=(a,b)=>Math.random()*(b-a)+a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=(x,y)=>{const m=Math.hypot(x,y)||1;return{x:x/m,y:y/m}};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const choice=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>[...a].sort(()=>Math.random()-.5);

const ITEM={
 pistol:{name:'9毫米手枪',w:2,h:1,kind:'weapon',tag:'手枪',color:'#a98554',sell:10,interval:.43,damage:1,range:220,speed:470,pellets:1},
 smg:{name:'废料冲锋枪',w:2,h:2,kind:'weapon',tag:'冲锋',color:'#9f774c',sell:18,interval:.24,damage:1,range:205,speed:500,pellets:1},
 shotgun:{name:'短管霰弹枪',w:2,h:2,kind:'weapon',tag:'霰弹',color:'#8b6548',sell:22,interval:.82,damage:1,range:175,speed:430,pellets:5,spread:.34},
 rifle:{name:'侦察步枪',w:3,h:1,kind:'weapon',tag:'步枪',color:'#6f7658',sell:26,interval:.88,damage:2,range:360,speed:650,pellets:1},
 ammo:{name:'弹药袋',w:1,h:2,kind:'support',tag:'弹药',color:'#b28c45',sell:9},
 scope:{name:'瞄准镜',w:1,h:1,kind:'support',tag:'瞄具',color:'#6e8790',sell:12},
 apammo:{name:'穿甲弹',w:1,h:2,kind:'support',tag:'穿甲',color:'#897b59',sell:15},
 vest:{name:'防弹背心',w:2,h:2,kind:'armor',tag:'护甲',color:'#567161',sell:16},
 medkit:{name:'战地医疗包',w:1,h:2,kind:'utility',tag:'医疗',color:'#a94e45',sell:13},
 charm:{name:'幸运护符',w:1,h:1,kind:'trinket',tag:'★',color:'#7f6c91',sell:14},
 boots:{name:'疾行战靴',w:1,h:2,kind:'gear',tag:'战靴',color:'#536c82',sell:12}
};
const VEH={
 mg:{name:'双联机枪',w:2,h:1,kind:'weapon',tag:'机枪',color:'#9a8456',sell:14},
 cannon:{name:'105毫米火炮',w:2,h:2,kind:'weapon',tag:'火炮',color:'#8b7450',sell:22},
 engine:{name:'六缸引擎',w:2,h:2,kind:'core',tag:'引擎',color:'#58675c',sell:20},
 belt:{name:'弹链供弹器',w:1,h:2,kind:'support',tag:'弹链',color:'#b28c45',sell:10},
 loader:{name:'自动装填机',w:1,h:2,kind:'support',tag:'装填',color:'#6d7b73',sell:13},
 turbo:{name:'涡轮增压器',w:1,h:2,kind:'support',tag:'涡轮',color:'#657f91',sell:12},
 armor:{name:'装甲板',w:2,h:1,kind:'armor',tag:'装甲',color:'#6a6d63',sell:11},
 fueltank:{name:'副油箱',w:2,h:1,kind:'utility',tag:'油箱',color:'#9d8244',sell:14},
 rocket:{name:'火箭巢',w:2,h:1,kind:'weapon',tag:'火箭',color:'#8a5c4c',sell:18},
 emp:{name:'电磁脉冲线圈',w:2,h:1,kind:'weapon',tag:'电磁',color:'#5d8f91',sell:20},
 capacitor:{name:'电容组',w:1,h:2,kind:'support',tag:'电容',color:'#648a83',sell:13},
 flak:{name:'高射机关炮',w:2,h:1,kind:'weapon',tag:'高射',color:'#8e7650',sell:18},
 arc:{name:'电弧发射器',w:2,h:1,kind:'weapon',tag:'电弧',color:'#5f8c9b',sell:21}
};
const GEAR_REWARD_POOL=['pistol','ammo','scope','apammo','vest','medkit','charm','boots','smg','shotgun','rifle'];
const VEH_REWARD_POOL=['mg','cannon','belt','loader','turbo','armor','fueltank','rocket','emp','capacitor','flak','arc'];
const SYNERGY_STYLE={
 rapid:{color:'#e2ad4e',label:'射速'},range:{color:'#69a8d8',label:'射程'},pierce:{color:'#d86b5e',label:'穿甲'},
 reload:{color:'#d98754',label:'装填'},electric:{color:'#69d7df',label:'电能'},drive:{color:'#7d9fe0',label:'动力'}
};
const ITEM_SYNERGY={ammo:'rapid',scope:'range',apammo:'pierce'};
const VEH_SYNERGY={belt:'rapid',mg:'rapid',flak:'rapid',loader:'reload',cannon:'reload',capacitor:'electric',emp:'electric',arc:'electric',turbo:'drive',engine:'drive'};
const EVOLUTIONS={
 pistol:[
  {id:'gunslinger',name:'快枪手',desc:'射速 +35% • 伤害 -10%'},
  {id:'magnum',name:'马格南',desc:'伤害 +70% • 射速 -22%'}
 ],
 smg:[
  {id:'minigun',name:'加特林',desc:'射速 +45% • 伤害 -25%'},
  {id:'heavybolt',name:'重型枪机',desc:'伤害 +55% • 穿透 1 个目标'}
 ],
 shotgun:[
  {id:'scatter',name:'广域散射',desc:'弹丸 +3 • 扩散更广 • 单发伤害降低'},
  {id:'slug',name:'独头弹',desc:'单枚重弹 • 射程 +45%'}
 ],
 rifle:[
  {id:'rail',name:'导轨瞄具',desc:'射程 +35% • 穿透 2 个目标'},
  {id:'hunter',name:'猎手',desc:'对精英与装甲敌人伤害 +75%'}
 ]
};

const SITE={
 gas:{name:'废弃加油站',short:'加油站',icon:'油',focus:'燃料 / 废料',color:'#8f805f',loot:{gas:.44,food:.14,scrap:.30,med:.12},gear:.03,enemy:['melee','melee','gunner']},
 clinic:{name:'荒漠诊所',short:'诊所',icon:'+',focus:'医疗 / 装备',color:'#77877d',loot:{gas:.07,food:.13,scrap:.22,med:.58},gear:.11,enemy:['gunner','grenadier','gunner','melee']},
 motel:{name:'落日旅馆',short:'旅馆',icon:'住',focus:'食物 / 交易',color:'#8a6f59',loot:{gas:.11,food:.50,scrap:.25,med:.14},gear:.05,enemy:['melee','melee','grenadier']},
 junkyard:{name:'钢铁坟场',short:'废车场',icon:'废',focus:'废料 / 模块',color:'#6c706a',loot:{gas:.16,food:.07,scrap:.63,med:.14},gear:.14,enemy:['gunner','melee','grenadier','gunner']}
};
const CARGO_NAME={gas:'燃料',food:'食物',scrap:'废料',med:'药品'};
const ROUTES=[
 {id:'old',name:'旧公路',risk:'标准',bonus:'路况与压力均衡',fuel:0,spawn:1},
 {id:'salt',name:'盐碱滩',risk:'节省',bonus:'抵达时燃料 +2',fuel:1,spawn:.95},
 {id:'raider',name:'掠夺者堤道',risk:'高危',bonus:'废料 +2，模块品质更高',fuel:2,spawn:1.22}
];

const WORLD_EVENTS=[
 {id:'convoy',name:'搁浅商队',short:'商队',icon:'商',desc:'一支商队瘫在路肩上。散热器已经报废，但货物仍完好无损。'},
 {id:'signal',name:'黑频信号',short:'信号',icon:'?',desc:'废弃中继塔不断重复求救信号。可能是陷阱，也可能藏着宝物。'},
 {id:'mechanic',name:'独行技师',short:'技师',icon:'修',desc:'一名满身油污的技师在半埋的维修车旁向你招手。'},
 {id:'wreck',name:'新鲜残骸',short:'残骸',icon:'残',desc:'掠夺者残骸仍在冒烟。胜者显然走得很匆忙。'}
];

const START_KITS=[
 {id:'gunslinger',name:'快枪手',desc:'手枪 + 弹药袋',cost:0},
 {id:'breacher',name:'破门者',desc:'霰弹枪 + 疾行战靴',cost:2},
 {id:'hunter',name:'猎手',desc:'侦察步枪 + 瞄准镜',cost:2},
 {id:'mechanic',name:'技师',desc:'手枪 + 医疗包 • 载具辅助更强',cost:2}
];
const CHASSIS=[
 {id:'junker',name:'破烂车',desc:'性能均衡',cost:0},
 {id:'scout',name:'侦察车',desc:'速度快 • 车体轻',cost:3},
 {id:'mule',name:'骡子',desc:'舱位大 • 油量高',cost:3},
 {id:'bruiser',name:'重锤',desc:'重装车体 • 速度较慢',cost:3}
];

let eventData=null;


function freshMeta(){return{
 nextId:3,nextVid:8,
 backpack:[{id:1,type:'pistol',level:1,gx:1,gy:1,locked:false},{id:2,type:'ammo',level:1,gx:3,gy:1,locked:false}],
 vehiclePack:[{id:1,type:'engine',level:1,gx:0,gy:1,locked:true},{id:2,type:'turbo',level:1,gx:2,gy:1},{id:3,type:'mg',level:1,gx:3,gy:0,locked:false},{id:4,type:'belt',level:1,gx:5,gy:0},{id:5,type:'cannon',level:1,gx:3,gy:2,locked:false},{id:6,type:'loader',level:1,gx:5,gy:2},{id:7,type:'armor',level:1,gx:0,gy:3}],
 pendingHaul:[],pendingVehicle:[],pack:{cols:6,rows:5,tier:1},vehicleGrid:{cols:6,rows:4,tier:1},
 roadLeg:1,runStep:0,selectedNode:null,mapChoices:[],arrived:false,credits:28,cargo:{gas:0,food:0,scrap:0,med:0},gearUpgradeGap:0,vehicleUpgradeGap:0,
 route:{...ROUTES[0]},town:{name:'锈水镇',demand:'med',locker:[],offerLeg:0,upgradeOfferLeg:0,gearOffers:[],moduleOffers:[]},
 finalFlags:{mg:false,rocket:false,armor:false},runStats:{roadKills:0,scavKills:0,bosses:0,events:0},runEnded:null,pendingRoadEvent:null,nextSearchEffect:null,eventGap:0,chassis:'junker',
 vehicle:{name:'破烂车 一型',scrap:0,fuel:18,hull:null}
}}
let profile={marks:0,runs:0,wins:0,selectedKit:'gunslinger',selectedChassis:'junker',unlockedKits:['gunslinger'],unlockedChassis:['junker']};
try{const p=localStorage.getItem('ws-meta-v012');if(p)profile={...profile,...JSON.parse(p)}}catch(e){}
function saveProfile(){try{localStorage.setItem('ws-meta-v012',JSON.stringify(profile))}catch(e){}}
function makeStartingMeta(){
 const m=freshMeta(),kit=profile.selectedKit||'gunslinger',ch=profile.selectedChassis||'junker';
 m.chassis=ch;
 if(kit==='breacher'){m.backpack=[{id:1,type:'shotgun',level:1,gx:1,gy:1,locked:false},{id:2,type:'boots',level:1,gx:3,gy:1,locked:false}]}
 else if(kit==='hunter'){m.backpack=[{id:1,type:'rifle',level:1,gx:1,gy:1,locked:false},{id:2,type:'scope',level:1,gx:4,gy:1,locked:false}]}
 else if(kit==='mechanic'){
  m.backpack=[{id:1,type:'pistol',level:1,gx:1,gy:1,locked:false},{id:2,type:'medkit',level:1,gx:3,gy:1,locked:false}];
  const ar=m.vehiclePack.find(x=>x.type==='armor'),tb=m.vehiclePack.find(x=>x.type==='turbo');if(ar)ar.level=2;if(tb)tb.level=2;
 }
 if(ch==='mule'){m.vehicleGrid.cols=7;m.vehicleGrid.tier=2;m.vehicle.fuel=24}
 return m;
}
let meta=freshMeta();
try{const s=localStorage.getItem('ws-portrait-v09');if(s){const o=JSON.parse(s);meta={...freshMeta(),...o,town:{...freshMeta().town,...o.town},vehicle:{...freshMeta().vehicle,...o.vehicle},pack:{...freshMeta().pack,...o.pack},vehicleGrid:{...freshMeta().vehicleGrid,...o.vehicleGrid},finalFlags:{...freshMeta().finalFlags,...o.finalFlags},runStats:{...freshMeta().runStats,...o.runStats}}}}catch(e){}
for(const it of meta.vehiclePack||[])if(VEH[it.type]?.kind==='weapon')it.locked=false;
for(const it of meta.backpack||[])if(it.type==='pistol')it.locked=false;
meta.eventGap=meta.eventGap||0;meta.runStats={roadKills:0,scavKills:0,bosses:0,events:0,...(meta.runStats||{})};

if((meta.mapChoices||[]).some(n=>n.type==='event')){meta.mapChoices=meta.mapChoices.filter(n=>n.type!=='event');if(meta.selectedNode?.type==='event')meta.selectedNode=null;}

if(meta.runEnded){runSummary=meta.runEnded;state='runsummary'}
function save(){try{localStorage.setItem('ws-portrait-v09',JSON.stringify(meta))}catch(e){}}
function resetSave(){meta=makeStartingMeta();game=null;roadGame=null;eventData=null;runSummary=null;packDrag=null;vehicleDrag=null;townPanel=null;restartConfirm=false;joyEnd();save();state='route';ensureChoices(true)}
function startNewRun(){resetSave()}

function touching(a,b,defs){const A=defs[a.type],B=defs[b.type];const xOverlap=a.gx<b.gx+B.w&&a.gx+A.w>b.gx;const yOverlap=a.gy<b.gy+B.h&&a.gy+A.h>b.gy;const vertical=(a.gx+A.w===b.gx||b.gx+B.w===a.gx)&&yOverlap;const horizontal=(a.gy+A.h===b.gy||b.gy+B.h===a.gy)&&xOverlap;return vertical||horizontal;}
function makeItem(type,level=1){return{id:meta.nextId++,type,level,gx:null,gy:null,locked:false}}
function makeVehicle(type,level=1){return{id:meta.nextVid++,type,level,gx:null,gy:null,locked:false}}
function upgradableWeaponTypes(list,defs){return[...new Set(list.filter(it=>!it.locked&&(it.level||1)<3&&defs[it.type]?.kind==='weapon').map(it=>it.type))]}
function pickUpgradeReward(base,list,defs,gapKey){
 const upgrades=upgradableWeaponTypes(list,defs),force=upgrades.length&&((meta[gapKey]||0)>=2||Math.random()<.42),type=force?choice(upgrades):choice(base);
 if(upgrades.includes(type))meta[gapKey]=0;else if(upgrades.length)meta[gapKey]=(meta[gapKey]||0)+1;return type
}
function shopOfferTypes(base,list,defs){
 const upgrades=upgradableWeaponTypes(list,defs),first=upgrades.length?choice(upgrades):null,rest=shuffle([...base]).filter(type=>type!==first);return first?[first,...rest].slice(0,3):rest.slice(0,3)
}
function fusionTarget(type,list){return list.find(it=>it.type===type&&!it.locked&&(it.level||1)<3)||null}

function activeWeapons(list,defs,max=2){
 return list.filter(i=>defs[i.type]?.kind==='weapon'&&i.gx!=null&&i.gy!=null)
  .sort((a,b)=>(a.gy-b.gy)||(a.gx-b.gx)||(a.id-b.id)).slice(0,max);
}
function weaponIsActive(it,list,defs,max=2){return activeWeapons(list,defs,max).some(x=>x.id===it.id)}
function weaponCount(list,defs,ignoreId=null){return list.filter(i=>i.id!==ignoreId&&defs[i.type]?.kind==='weapon').length}
function synergyRoles(it,defs){
 if(defs===VEH){const role=VEH_SYNERGY[it.type];return role?[role]:[]}
 if(defs===ITEM){if(ITEM[it.type]?.kind==='weapon')return['rapid','range','pierce'];const role=ITEM_SYNERGY[it.type];return role?[role]:[]}
 return[]
}
function synergyRoleLinked(it,role,list,defs){
 if(it.gx==null||it.gy==null)return false;const d=defs[it.type],source=d?.kind==='support';
 return list.some(other=>{
  if(other.id===it.id||other.gx==null||!synergyRoles(other,defs).includes(role)||!touching(it,other,defs))return false;
  const otherSource=defs[other.type]?.kind==='support';return source!==otherSource
 })
}
function drawSynergyFrame(it,x,y,w,h,defs,list,alpha=1){
 const roles=synergyRoles(it,defs);if(!roles.length)return;ctx.save();ctx.globalAlpha*=alpha;
 if(roles.length===1){const role=roles[0],linked=synergyRoleLinked(it,role,list,defs),style=SYNERGY_STYLE[role];ctx.strokeStyle=style.color;ctx.lineWidth=linked?4:2;ctx.shadowColor=style.color;ctx.shadowBlur=linked?12:0;roundRect(x+1,y+1,w-2,h-2,9,false,true)}
 else{
  const seg=(w-16)/roles.length;roles.forEach((role,i)=>{const linked=synergyRoleLinked(it,role,list,defs),style=SYNERGY_STYLE[role],sx=x+8+i*seg;ctx.strokeStyle=style.color;ctx.lineWidth=linked?4:2;ctx.shadowColor=style.color;ctx.shadowBlur=linked?10:0;ctx.beginPath();ctx.moveTo(sx,y+2);ctx.lineTo(sx+seg-3,y+2);ctx.stroke()})
 }
 ctx.restore()
}
function drawSynergyLegend(isPack){
 const roles=isPack?['rapid','range','pierce']:['rapid','reload','electric','drive'],labels=isPack?['射速','射程','穿甲']:['供弹','装填','电能','动力'],span=isPack?108:102,start=isPack?108:66,y=isPack?151:157;
 roles.forEach((role,i)=>{const x=start+i*span,style=SYNERGY_STYLE[role];ctx.fillStyle=style.color;roundRect(x,y-9,12,12,3,true,false);text(labels[i],x+19,y+2,10,C.muted,'left',800)})
}

function buildStats(){
 const result={maxHp:5,speed:168,luck:0,medCharges:0,weapons:[]};
 for(const it of meta.backpack){const d=ITEM[it.type],lv=it.level||1;if(it.type==='vest')result.maxHp+=lv;if(it.type==='boots')result.speed*=1+.07*lv;if(it.type==='charm')result.luck+=.09*lv;if(it.type==='medkit')result.medCharges+=lv;}
 for(const w of activeWeapons(meta.backpack,ITEM,2)){
  const d=ITEM[w.type],lv=w.level||1;
  let interval=d.interval*Math.pow(.90,lv-1),damage=d.damage+(lv-1)*.38,range=d.range*(1+.07*(lv-1)),pellets=d.pellets||1,spread=d.spread||0,pierce=0,ap=0,eliteBonus=0;
  for(const sup of meta.backpack.filter(i=>ITEM[i.type].kind==='support'&&touching(i,w,ITEM))){
   const sl=sup.level||1;
   if(sup.type==='ammo'){interval*=Math.max(.55,1-.18*sl);damage*=Math.max(.68,1-.08*sl)}
   if(sup.type==='scope'){range*=1+.20*sl;interval*=1+.06*sl}
   if(sup.type==='apammo'){damage*=1+.22*sl;interval*=1+.10*sl;ap+=sl}
  }
  if(lv>=3&&w.evolution){
   if(w.evolution==='gunslinger'){interval*=.65;damage*=.90}
   if(w.evolution==='magnum'){damage*=1.70;interval*=1.22}
   if(w.evolution==='minigun'){interval*=.55;damage*=.75}
   if(w.evolution==='heavybolt'){damage*=1.55;pierce=1}
   if(w.evolution==='scatter'){pellets+=3;spread=Math.max(spread,.48);damage*=.72}
   if(w.evolution==='slug'){pellets=1;spread=0;damage*=4.2;range*=1.45}
   if(w.evolution==='rail'){range*=1.35;pierce=2}
   if(w.evolution==='hunter'){eliteBonus=.75}
  }
  result.weapons.push({id:w.id,type:w.type,interval,damage,range,speed:d.speed,pellets,spread,pierce,ap,eliteBonus,cd:rnd(0,.15)});
 }
 return result;
}
function vehicleStats(){
 let s=meta.chassis==='scout'?{maxHull:6,maxFuel:22,speed:275,mgInterval:.22,flakCd:.82,arcCd:1.05,arcChains:4,cannonCd:3.15,rocketCount:0,rocketCd:3.55,empCount:0,empCd:4.6,empChains:2,armor:0,activeWeapons:[]}:
 meta.chassis==='mule'?{maxHull:8,maxFuel:34,speed:215,mgInterval:.22,flakCd:.82,arcCd:1.05,arcChains:4,cannonCd:3.15,rocketCount:0,rocketCd:3.55,empCount:0,empCd:4.6,empChains:2,armor:0,activeWeapons:[]}:
 meta.chassis==='bruiser'?{maxHull:12,maxFuel:22,speed:205,mgInterval:.22,flakCd:.82,arcCd:1.05,arcChains:4,cannonCd:3.15,rocketCount:0,rocketCd:3.55,empCount:0,empCd:4.6,empChains:2,armor:1,activeWeapons:[]}:
 {maxHull:8,maxFuel:24,speed:230,mgInterval:.22,flakCd:.82,arcCd:1.05,arcChains:4,cannonCd:3.15,rocketCount:0,rocketCd:3.55,empCount:0,empCd:4.6,empChains:2,armor:0,activeWeapons:[]};
 const active=activeWeapons(meta.vehiclePack,VEH,2);s.activeWeapons=active.map(i=>i.type);
 for(const it of meta.vehiclePack){const lv=it.level||1;if(it.type==='armor'){s.maxHull+=2*lv;s.armor+=lv}if(it.type==='fueltank')s.maxFuel+=8*lv;}
 const mg=active.find(i=>i.type==='mg'),flak=active.find(i=>i.type==='flak'),arc=active.find(i=>i.type==='arc'),cn=active.find(i=>i.type==='cannon'),rk=active.filter(i=>i.type==='rocket'),emp=active.find(i=>i.type==='emp'),en=meta.vehiclePack.find(i=>i.type==='engine');
 if(mg){for(const x of meta.vehiclePack.filter(i=>i.type==='belt'&&touching(i,mg,VEH)))s.mgInterval*=Math.max(.50,1-.14*(x.level||1));}
 if(flak){for(const x of meta.vehiclePack.filter(i=>i.type==='belt'&&touching(i,flak,VEH)))s.flakCd*=Math.max(.52,1-.13*(x.level||1));}
 if(arc){for(const x of meta.vehiclePack.filter(i=>i.type==='capacitor'&&touching(i,arc,VEH))){s.arcCd*=Math.max(.48,1-.16*(x.level||1));s.arcChains+=Math.min(3,x.level||1);}}
 if(cn){for(const x of meta.vehiclePack.filter(i=>i.type==='loader'&&touching(i,cn,VEH)))s.cannonCd*=Math.max(.50,1-.17*(x.level||1));}
 if(rk.length){s.rocketCount=rk.length;for(const r of rk)s.rocketCd*=Math.max(.60,1-.08*((r.level||1)-1));}
 if(emp){
  s.empCount=1;
  for(const x of meta.vehiclePack.filter(i=>i.type==='capacitor'&&touching(i,emp,VEH))){s.empCd*=Math.max(.48,1-.18*(x.level||1));s.empChains+=Math.min(2,x.level||1);}
 }
 if(en){for(const x of meta.vehiclePack.filter(i=>i.type==='turbo'&&touching(i,en,VEH)))s.speed*=1+.10*(x.level||1);}
 return s;
}

function ensureChoices(force=false){
 if(meta.mapChoices.length&&!force)return;
 const types=shuffle(Object.keys(SITE)),finalDue=meta.runStep>=9,townDue=meta.runStep>0&&meta.runStep%3===2,bossDue=meta.runStep>0&&meta.runStep%5===4,arr=[];
 if(finalDue){
  arr.push({id:'final-'+meta.roadLeg,type:'final',name:'锈蚀圣堂',short:'圣堂',icon:'Ω',focus:'最终突袭',danger:3,special:true});
 }else if(bossDue){
  arr.push({id:'boss-'+meta.roadLeg,type:'boss',name:'钢铁豺狼',short:'钢铁豺狼',icon:'首',focus:'首领 / 稀有模块',danger:3,special:true});
  for(const t of types.slice(0,2))arr.push({id:t+'-'+meta.roadLeg+'-'+Math.random(),type:'scavenge',site:t,name:SITE[t].name,short:SITE[t].short,icon:SITE[t].icon,focus:SITE[t].focus,danger:2+Math.floor(Math.random()*2),special:Math.random()<.25});
 }else{
  if(townDue)arr.push({id:'town-'+meta.roadLeg,type:'town',name:'锈水镇',short:'锈水镇',icon:'镇',focus:'交易 / 维修',danger:0,special:false});
  const slots=3-arr.length;
  for(const t of types.slice(0,slots)){const danger=1+Math.floor(Math.random()*3);arr.push({id:t+'-'+meta.roadLeg+'-'+Math.random(),type:'scavenge',site:t,name:SITE[t].name,short:SITE[t].short,icon:SITE[t].icon,focus:SITE[t].focus,danger,special:Math.random()<.17});}
 }
 meta.mapChoices=shuffle(arr);
}
function selectNode(i){ensureChoices();meta.selectedNode=meta.mapChoices[i]||meta.mapChoices[0];save();}
function fuelCost(){const n=meta.selectedNode;if(!n)return 0;if(n.type==='town')return 2;if(n.type==='final')return 6+(meta.route.fuel||0);if(n.type==='boss')return 5+(meta.route.fuel||0);return 2+(n.danger||1)+(meta.route.fuel||0)}
function destinationName(){return meta.selectedNode?.name||'未知地点'}
function completeDestination(){meta.arrived=false;meta.selectedNode=null;meta.mapChoices=[];meta.roadLeg++;meta.runStep++;ensureChoices(true);save();}

function roadThreat(){
 const step=meta.runStep||0,danger=Math.max(0,(meta.selectedNode?.danger||1)-1),route=meta.route.id==='raider'?.10:0;
 return clamp(.72+step*.09+danger*.065+route,.72,1.58);
}
function startRoad(){
 ensureChoices();if(!meta.selectedNode)selectNode(0);
 const vs=vehicleStats(),cost=fuelCost(),dry=meta.vehicle.fuel<cost,finalRoute=meta.selectedNode?.type==='final',bossRoute=meta.selectedNode?.type==='boss'||finalRoute,threat=finalRoute?1.52:bossRoute?Math.max(1.12,roadThreat()):roadThreat(),duration=finalRoute?75:bossRoute?70:(dry?55:45);
 meta.vehicle.fuel=Math.max(0,meta.vehicle.fuel-cost);
 if(finalRoute)meta.finalFlags={mg:false,rocket:false,armor:false};
 roadGame={duration,time:duration,elapsed:0,scroll:0,spawn:.6,mine:4.8,boss:false,bossRoute,finalRoute,bossSpawned:false,bossDefeated:false,victoryDelay:0,colossusY:-190,dry,cost,threat,build:vs,player:{x:270,y:800,w:52,h:78,hp:meta.vehicle.hull==null?vs.maxHull:Math.min(meta.vehicle.hull,vs.maxHull),max:vs.maxHull,speed:vs.speed*(dry?.76:1),inv:0,mg:0,flak:.55,arc:.8,cannon:.9,rocket:1.1,emp:1.6},enemies:[],bullets:[],enemyBullets:[],mines:[],strikes:[],barriers:[],barrierTimer:8.5,drops:[],fx:[],dust:[],debris:[],dustTimer:0,shake:0,kills:0,scrap:0,fuel:0,repairs:0};
 routeDepart={t:0,duration:REDUCED_MOTION?.18:.78,target:{...(routeNodePositions()[meta.mapChoices.findIndex(x=>x.id===meta.selectedNode?.id)]||{x:270,y:350})},name:meta.selectedNode?.short||destinationName()};
 state='routeleave';
 spawnRoadEnemy('bike');
 if(!bossRoute&&threat>=.92)spawnRoadEnemy('buggy');
}
function spawnRoadEnemy(force){
 if(!roadGame)return;
 const g=roadGame,maxEnemies=Math.round(8+g.threat*5);
 if(g.enemies.length>maxEnemies)return;
 const p=g.elapsed/g.duration;
 let type=force;
 if(!type){
  const mechChance=meta.runStep>=3?Math.min(.24,.11+(meta.runStep-3)*.025):0;
  if(Math.random()<mechChance)type='missilevan';
  else type=(p>.72&&Math.random()>(.94-g.threat*.08))?'truck':Math.random()<.48?'bike':'buggy';
 }
 if(type==='boss')type=g.threat<.9?'truck':'wartruck';
 const cfg=type==='dreadnought'?{hp:58,spd:28,w:118,h:150,shoot:.62,score:22}:type==='missilevan'?{hp:7,spd:58,w:62,h:86,shoot:2.55,score:5}:type==='bike'?{hp:2,spd:145,w:34,h:55,shoot:99,score:1}:type==='buggy'?{hp:4,spd:95,w:52,h:70,shoot:rnd(1.05,1.55),score:2}:type==='wartruck'?{hp:18,spd:48,w:82,h:110,shoot:.78,score:9}:{hp:9,spd:62,w:66,h:92,shoot:1.25,score:4};
 const shootScale=1.22/g.threat;
 roadGame.enemies.push({rid:Math.random().toString(36).slice(2),type,x:rnd(55,485),y:rnd(-160,-60),...cfg,maxHp:cfg.hp,shootCd:cfg.shoot*shootScale,sway:rnd(-1,1),ram:0,shootScale,dustTimer:rnd(0,.12)});
}
function spawnColossus(){
 const g=roadGame,phase=.35,parts=[
  {type:'col_armor',part:'armor',baseX:270,offY:-58,hp:55,w:110,h:72,shoot:99,score:8},
  {type:'col_mg',part:'mg',baseX:175,offY:8,hp:38,w:70,h:68,shoot:.34,score:8},
  {type:'col_rocket',part:'rocket',baseX:365,offY:8,hp:42,w:70,h:68,shoot:.88,score:8},
  {type:'col_engine',part:'engine',baseX:270,offY:118,hp:82,w:112,h:104,shoot:99,score:16}
 ];
 for(const q of parts)g.enemies.push({rid:Math.random().toString(36).slice(2),group:'colossus',sway:phase,spd:0,x:q.baseX,y:g.colossusY+q.offY,baseX:q.baseX,offY:q.offY,type:q.type,part:q.part,hp:q.hp,maxHp:q.hp,w:q.w,h:q.h,shoot:q.shoot,shootCd:q.shoot,ram:0,score:q.score,shootScale:1});
}
function roadTarget(g,p,max=520){
 const armorAlive=g.finalRoute&&g.enemies.some(e=>e.group==='colossus'&&e.part==='armor');
 let t=null,b=1e9;for(const e of g.enemies){
  if(e.y>p.y+20||armorAlive&&e.group==='colossus'&&e.part==='engine')continue;
  const d=distance(p,e);if(d<max&&d<b){t=e;b=d}
 }return t;
}
function roadIntercept(target,sx,sy,projSpeed,kind){
 const rx=target.x-sx,ry=target.y-sy,vx=target.vx||0,vy=target.vy||target.spd||0;
 const a=vx*vx+vy*vy-projSpeed*projSpeed,b=2*(rx*vx+ry*vy),c=rx*rx+ry*ry;
 let t=0,disc=b*b-4*a*c;
 if(Math.abs(a)<.0001){if(Math.abs(b)>.0001)t=Math.max(0,-c/b)}
 else if(disc>=0){const root=Math.sqrt(disc),t1=(-b-root)/(2*a),t2=(-b+root)/(2*a);const ts=[t1,t2].filter(x=>x>0);if(ts.length)t=Math.min(...ts)}
 const cap=kind==='mg'?.60:kind==='cannon'?.95:1.05,lead=kind==='mg'?.82:kind==='cannon'?1:.92;
 t=clamp(t*lead,0,cap);
 return{x:target.x+vx*t,y:target.y+vy*t};
}
function roadIsHeavy(e){return ['truck','wartruck','dreadnought','missilevan','col_armor','col_engine'].includes(e.type)}
function roadDamageMultiplier(kind,e){
 if(kind==='mg')return e.type==='bike'?1.75:e.type==='buggy'?1.35:roadIsHeavy(e)?.55:1;
 if(kind==='flak')return e.type==='bike'?1.55:e.type==='buggy'?1.35:roadIsHeavy(e)?.45:1;
 if(kind==='cannon')return roadIsHeavy(e)?1.65:e.type==='bike'?.72:1;
 if(kind==='rocket')return roadIsHeavy(e)?.58:1;
 return 1;
}
function fireRocketVolley(){
 const g=roadGame,p=g.player,candidates=g.enemies.filter(e=>e.y<p.y+20).sort((a,b)=>{
  const pa=roadIsHeavy(a)?1:0,pb=roadIsHeavy(b)?1:0;return pa-pb||distance(p,a)-distance(p,b)
 });
 if(!candidates.length)return;
 const targets=candidates.slice(0,5);
 for(let i=0;i<5;i++){
  const t=targets[i%targets.length],cfg={spd:575,dmg:2.55,r:7},sx=p.x+(i-2)*8,sy=p.y-38,aim=roadIntercept(t,sx,sy,cfg.spd,'rocket'),n=norm(aim.x-sx,aim.y-sy);
  g.bullets.push({x:sx,y:sy,vx:n.x*cfg.spd,vy:n.y*cfg.spd,life:2.15,damage:cfg.dmg,kind:'rocket',r:cfg.r,targetId:t.rid,homing:11.5,splash:82});
 }
}
function fireFlak(){
 const g=roadGame,p=g.player,cands=g.enemies.filter(e=>e.y<p.y+10&&p.y-e.y<430).sort((a,b)=>distance(p,a)-distance(p,b));
 if(!cands.length)return false;
 const center=cands[0],base=Math.atan2(center.y-p.y,center.x-p.x);
 for(let q=-2;q<=2;q++){
  const a=base+q*.115,spd=690;
  g.bullets.push({x:p.x,y:p.y-38,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:.72,damage:1.25,kind:'flak',r:5,pierce:1});
 }
 return true;
}
function fireArc(){
 const g=roadGame,p=g.player,first=g.enemies.filter(e=>e.y<p.y+30).sort((a,b)=>{
  const pa=(a.type==='bike'?0:a.type==='buggy'?1:a.type==='missilevan'?2:3),pb=(b.type==='bike'?0:b.type==='buggy'?1:b.type==='missilevan'?2:3);
  return pa-pb||distance(p,a)-distance(p,b)
 })[0];
 if(!first)return false;
 const chain=[first],rest=g.enemies.filter(e=>e!==first).sort((a,b)=>distance(first,a)-distance(first,b));
 for(const e of rest){if(chain.length>=g.build.arcChains)break;if(distance(chain[chain.length-1],e)<210||distance(first,e)<230)chain.push(e)}
 for(let i=0;i<chain.length;i++){
  const e=chain[i],mult=e.group==='colossus'?.50:roadIsHeavy(e)?.65:1,base=e.type==='bike'?3.4:e.type==='buggy'?3.0:e.type==='missilevan'?2.8:2.35,damage=base*mult*Math.max(.74,1-i*.07);
  e.hp-=damage;e.disabled=Math.max(e.disabled||0,roadIsHeavy(e)?.52:.34);g.fx.push({x:e.x,y:e.y,r:34,life:.28,total:.28,color:'#76e8ef',kind:'electricHit'});
 }
 g.fx.push({points:[{x:p.x,y:p.y-48},...chain.map(e=>({x:e.x,y:e.y}))],life:.30,total:.30,color:'#70e5ef',kind:'electricArc',seed:Math.random()*10});g.shake=Math.max(g.shake||0,1.8);
 for(let i=g.enemies.length-1;i>=0;i--)if(g.enemies[i].hp<=0)killRoad(i);
 notice=`电弧连锁 ×${chain.length} · 目标短暂瘫痪`;noticeT=.7;return true;
}
function fireEMP(){
 const g=roadGame,p=g.player;
 const priority=g.enemies.filter(e=>e.y<p.y+40).sort((a,b)=>{
  const pa=(a.type==='missilevan'?0:a.group==='colossus'?1:2),pb=(b.type==='missilevan'?0:b.group==='colossus'?1:2);
  return pa-pb||distance(p,a)-distance(p,b)
 })[0];
 if(!priority)return false;
 const hit=[priority],rest=g.enemies.filter(e=>e!==priority).sort((a,b)=>distance(priority,a)-distance(priority,b));
 for(const e of rest){if(hit.length>=1+(g.build.empChains||1))break;if(distance(priority,e)<185)hit.push(e)}
 for(const e of hit){const damage=e.group==='colossus'?.8:e.type==='missilevan'?3:e.type==='bike'?2:e.type==='buggy'?1.8:1.25;e.disabled=Math.max(e.disabled||0,e.group==='colossus'?2.2:3.4);e.hp-=damage;g.fx.push({x:e.x,y:e.y,r:48,life:.42,total:.42,color:'#65dce5',kind:'electricHit'})}
 for(let i=g.enemies.length-1;i>=0;i--)if(g.enemies[i].hp<=0)killRoad(i);
 const centers=hit;
 g.enemyBullets=g.enemyBullets.filter(b=>!centers.some(e=>Math.hypot(b.x-e.x,b.y-e.y)<220));
 g.mines=g.mines.filter(m=>!centers.some(e=>Math.hypot(m.x-e.x,m.y-e.y)<175));
 if(g.strikes){const ids=new Set(hit.map(e=>e.rid));g.strikes=g.strikes.filter(st=>!ids.has(st.ownerId)&&!centers.some(e=>Math.hypot(st.x-e.x,st.y-e.y)<220));}
 g.fx.push({x:p.x,y:p.y-35,r:300,life:.60,total:.60,color:'#65dce5',kind:'empWave'});g.fx.push({source:{x:p.x,y:p.y-48},targets:hit.map(e=>({x:e.x,y:e.y})),life:.38,total:.38,color:'#82eff4',kind:'empLink',seed:Math.random()*10});g.shake=Math.max(g.shake||0,3.2);
 notice=`电磁爆发 · 瘫痪 ${hit.length} 个目标`;noticeT=1;return true;
}
function fireRoad(kind,target){
 const g=roadGame,p=g.player,cfg=kind==='mg'?{spd:840,dmg:1,r:5}:kind==='cannon'?{spd:720,dmg:8.5,r:10}:{spd:570,dmg:2.2,r:8};
 const sx=p.x,sy=p.y-38,aim=roadIntercept(target,sx,sy,cfg.spd,kind),n=norm(aim.x-sx,aim.y-sy);
 g.bullets.push({x:sx,y:sy,vx:n.x*cfg.spd,vy:n.y*cfg.spd,life:1.9,damage:cfg.dmg,kind,r:cfg.r,targetId:target.rid,homing:kind==='mg'?5.5:kind==='cannon'?9.5:12});
 g.fx.push({x:p.x,y:p.y-54,r:kind==='cannon'?18:kind==='mg'?9:12,life:kind==='cannon'?.16:.1,color:kind==='cannon'?'#f0bd55':'#f4e0a1',kind:'muzzle'});
}
function hurtRoad(n){const p=roadGame.player;if(p.inv>0)return;p.hp-=n;p.inv=.45;roadGame.shake=Math.max(roadGame.shake||0,4);roadGame.fx.push({x:p.x,y:p.y,r:35,life:.25,color:C.red});}
function killRoad(i){
 const g=roadGame,e=g.enemies[i];
 if(e.type==='dreadnought'){g.bossDefeated=true;meta.runStats.bosses++}
 if(e.group==='colossus'){
  if(e.part==='engine'){g.bossDefeated=true;meta.runStats.bosses++}
  else if(e.part==='mg'||e.part==='rocket'||e.part==='armor')meta.finalFlags[e.part]=true;
 }
 if(g.bossRoute&&(e.type==='dreadnought'||e.part==='engine')){g.victoryDelay=.55;g.player.inv=Math.max(g.player.inv,.65);g.spawn=999}
 meta.runStats.roadKills++;g.kills+=e.score;g.fx.push({x:e.x,y:e.y,r:e.w*.78,life:.46,color:'#dd8040',kind:'explosion'});
 const blastShake=e.group==='colossus'?(e.part==='engine'?15:7):e.type==='dreadnought'?14:e.type==='wartruck'?10:e.type==='truck'||e.type==='missilevan'?6:0;
 g.shake=Math.max(g.shake||0,blastShake);
 const pieces=e.type==='bike'?4:e.type==='wartruck'||e.type==='dreadnought'?12:7;
 for(let n=0;n<pieces;n++)g.debris.push({x:e.x+rnd(-12,12),y:e.y+rnd(-8,8),vx:rnd(-150,150),vy:rnd(-170,-25),w:rnd(3,9),h:rnd(3,11),rot:rnd(0,6.28),spin:rnd(-8,8),life:rnd(.45,.95),color:Math.random()<.35?'#b65738':'#4d4638'});
 if(e.group!=='colossus'){
  const missing=1-g.player.hp/g.player.max,repairChance=.015+missing*.055;
  if(Math.random()<repairChance)g.drops.push({x:e.x,y:e.y,type:'repair'});
  else if(Math.random()<.55)g.drops.push({x:e.x,y:e.y,type:Math.random()<.72?'scrap':'fuel'});
 }
 g.enemies.splice(i,1);
}
function finishRoadSuccess(){
 const g=roadGame,p=g.player;meta.arrived=true;meta.vehicle.hull=Math.max(1,p.hp);
 meta.pendingRoadEvent=null;
 if(meta.selectedNode?.type==='scavenge'){
  meta.eventGap=(meta.eventGap||0)+1;
  const chance=clamp(.34+meta.runStep*.035,.34,.62),forced=meta.eventGap>=3;
  if(forced||Math.random()<chance){meta.pendingRoadEvent={id:choice(WORLD_EVENTS).id,forced};meta.eventGap=0}
 }
 const bf=meta.route.id==='salt'?2:0,bs=meta.route.id==='raider'?2:0;meta.vehicle.scrap+=g.scrap+bs;meta.vehicle.fuel=Math.min(g.build.maxFuel,meta.vehicle.fuel+g.fuel+bf);g.scrap+=bs;g.fuel+=bf;
 const pool=VEH_REWARD_POOL,final=meta.selectedNode?.type==='final',boss=meta.selectedNode?.type==='boss',t=pickUpgradeReward(pool,meta.vehiclePack,VEH,'vehicleUpgradeGap'),lv=boss?2:(meta.selectedNode?.danger===3&&Math.random()<.25?2:1);
 if(final){g.reward='armor';g.rewardLv=3;roadResultReveal=0;state='roadresult';save();return}
 meta.pendingVehicle.push(makeVehicle(t,lv));g.reward=t;g.rewardLv=lv;
 if(boss){meta.pendingVehicle.push(makeVehicle(pickUpgradeReward(pool,meta.vehiclePack,VEH,'vehicleUpgradeGap'),2));meta.credits+=35}
 else if(meta.route.id==='raider'&&Math.random()<.55)meta.pendingVehicle.push(makeVehicle(pickUpgradeReward(pool,meta.vehiclePack,VEH,'vehicleUpgradeGap'),1));
 roadResultReveal=0;state='roadresult';save();
}
function roadHitDamage(g,e,kind,base){
 let dmg=base*roadDamageMultiplier(kind,e);
 if(e.type==='col_engine'&&g.enemies.some(x=>x.type==='col_armor'))dmg*=.14;
 if(kind==='cannon')e.disabled=Math.max(e.disabled||0,e.group==='colossus'?.28:.55);
 e.hp-=dmg;return dmg;
}
function emitEnemyRoadDust(g,e,dt){
 if(e.group==='colossus'||e.y<110||e.y>H+e.h||g.dust.length>240||Math.hypot(e.vx||0,e.vy||0)<18)return;
 e.dustTimer=(e.dustTimer??0)-dt;
 if(e.dustTimer>0)return;
 const bike=e.type==='bike',buggy=e.type==='buggy',heavy=e.type==='wartruck'||e.type==='dreadnought';
 e.dustTimer=bike?.16:buggy?.10:heavy?.09:.12;
 const rearY=e.y-e.h*.43,spread=e.w*(bike?0:.3),baseR=bike?4:buggy?6:heavy?10:8;
 for(const side of bike?[0]:[-1,1])g.dust.push({x:e.x+side*spread+rnd(-3,3),y:rearY+rnd(-3,3),vx:(e.vx||0)*.2+side*rnd(12,28)+rnd(-8,8),vy:rnd(-10,25),r:baseR+rnd(0,4),life:rnd(.42,.65),alpha:heavy?rnd(.16,.22):buggy?rnd(.13,.19):rnd(.10,.17)});
}
function updateRoad(dt){const g=roadGame,p=g.player;g.elapsed+=dt;g.time=Math.max(0,g.duration-g.elapsed);g.scroll+=340*dt;g.spawn-=dt;g.mine-=dt;g.shake=Math.max(0,(g.shake||0)-dt*36);p.inv=Math.max(0,p.inv-dt);p.mg-=dt;p.flak-=dt;p.arc-=dt;p.cannon-=dt;p.rocket-=dt;p.emp-=dt;moveActor(p,dt,p.speed,38,502,155,900);
 g.dustTimer-=dt;
 if(g.dustTimer<=0){
  const steer=joy.dx||0,baseY=p.y+42;
  for(const side of [-1,1])g.dust.push({x:p.x+side*22,y:baseY+rnd(-2,7),vx:rnd(-28,28)-steer*55,vy:rnd(95,155),r:rnd(8,15),life:rnd(.42,.72),max:1,alpha:rnd(.16,.28)});
  if(Math.abs(steer)>.3)g.dust.push({x:p.x-steer*28,y:baseY+5,vx:-steer*rnd(65,105),vy:rnd(80,125),r:rnd(10,18),life:rnd(.48,.76),max:1,alpha:.24});
  g.dustTimer=.045;
 }
 for(let i=g.dust.length-1;i>=0;i--){const q=g.dust[i];q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.r+=28*dt;q.vx*=Math.pow(.35,dt);if(q.life<=0)g.dust.splice(i,1)}
 for(let i=g.debris.length-1;i>=0;i--){const q=g.debris[i];q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=180*dt;q.rot+=q.spin*dt;if(q.life<=0)g.debris.splice(i,1)}

 const t=roadTarget(g,p,g.finalRoute?660:560);
 if(t&&g.build.activeWeapons.includes('mg')&&p.mg<=0){fireRoad('mg',t);p.mg=g.build.mgInterval*(g.dry?1.35:1)}
 if(g.build.activeWeapons.includes('flak')&&p.flak<=0&&g.enemies.length){if(fireFlak())p.flak=g.build.flakCd}
 if(g.build.activeWeapons.includes('arc')&&p.arc<=0&&g.enemies.length){if(fireArc())p.arc=g.build.arcCd}
 if(t&&g.build.activeWeapons.includes('cannon')&&p.cannon<=0){fireRoad('cannon',t);p.cannon=g.build.cannonCd*(g.dry?1.18:1)}
 if(g.build.rocketCount&&p.rocket<=0&&g.enemies.length){fireRocketVolley();p.rocket=g.build.rocketCd}
 if(g.build.empCount&&p.emp<=0&&g.enemies.length){if(fireEMP())p.emp=g.build.empCd}
 for(let i=g.bullets.length-1;i>=0;i--){
 const b=g.bullets[i],target=g.enemies.find(e=>e.rid===b.targetId);
 if(target){
  const spd=Math.hypot(b.vx,b.vy)||1,aim=roadIntercept(target,b.x,b.y,spd,b.kind),want=norm(aim.x-b.x,aim.y-b.y),cur=norm(b.vx,b.vy),k=Math.min(1,(b.homing||0)*dt);
  const steer=norm(cur.x*(1-k)+want.x*k,cur.y*(1-k)+want.y*k);b.vx=steer.x*spd;b.vy=steer.y*spd;
 }
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;
 for(let j=g.enemies.length-1;j>=0;j--){
 const e=g.enemies[j];if((b.hitIds||[]).includes(e.rid))continue;
 if(target?.group==='colossus'&&e.group==='colossus'&&e.rid!==target.rid)continue;
 if(Math.abs(b.x-e.x)<e.w*.62+b.r&&Math.abs(b.y-e.y)<e.h*.58+b.r){
  hit=true;
  if(b.kind==='rocket'){
   const hx=e.x,hy=e.y,rad=b.splash||68;
   for(let k=g.enemies.length-1;k>=0;k--){const v=g.enemies[k];if(Math.hypot(v.x-hx,v.y-hy)<=rad){roadHitDamage(g,v,'rocket',b.damage);if(v.hp<=0)killRoad(k)}}
   g.fx.push({x:hx,y:hy,r:rad,life:.25,color:'#d97642',kind:'rocketImpact'});
  }else{
   roadHitDamage(g,e,b.kind,b.damage);
   g.fx.push({x:b.x,y:b.y,r:b.kind==='cannon'?26:b.kind==='flak'?14:8,life:.18,color:b.kind==='cannon'?'#e0ad36':b.kind==='flak'?'#d9c084':C.yellow,kind:'impact'});
   if(e.hp<=0)killRoad(j);
   if(b.kind==='flak'&&(b.pierce||0)>0){b.pierce--;hit=false;b.hitIds=b.hitIds||[];b.hitIds.push(e.rid);continue}
  }
  break
 }
}
 if(hit||b.life<=0||b.y<-60||b.y>1020||b.x<-40||b.x>580)g.bullets.splice(i,1)
}
 if(g.finalRoute&&g.bossSpawned&&!g.bossDefeated)g.colossusY=Math.min(255,g.colossusY+20*dt);
 for(let i=g.enemies.length-1;i>=0;i--){const e=g.enemies[i],ox=e.x,oy=e.y;
 e.disabled=Math.max(0,(e.disabled||0)-dt);const disabled=e.disabled>0;
 if(e.group==='colossus'){e.x=e.baseX+Math.sin(g.elapsed*1.25+e.sway)*(disabled?4:13);e.y=g.colossusY+e.offY}
 else{e.y+=e.spd*dt;if(!disabled)e.x+=Math.sin(g.elapsed*1.7+e.sway)*18*dt}
 const avx=(e.x-ox)/Math.max(dt,.001),avy=(e.y-oy)/Math.max(dt,.001);e.vx=(e.vx||0)*.55+avx*.45;e.vy=(e.vy||e.spd)*.55+avy*.45;
 emitEnemyRoadDust(g,e,dt);
 if(!disabled)e.shootCd-=dt;e.ram-=dt;
 if(!disabled&&e.shootCd<=0&&e.y>80&&e.y<p.y-110&&e.type==='missilevan'){
  const leadX=clamp(p.x+(joy.dx||0)*55+rnd(-25,25),55,485),leadY=clamp(p.y+(joy.dy||0)*45+rnd(-18,18),180,900);
  g.strikes.push({x:leadX,y:leadY,r:64,t:1.15,totalT:1.15,sx:e.x,sy:e.y+e.h*.2,damage:2,ownerId:e.rid});
  if(g.threat>1.32)g.strikes.push({x:clamp(leadX+rnd(-120,120),55,485),y:clamp(leadY+rnd(-100,100),180,900),r:52,t:1.35,totalT:1.35,sx:e.x,sy:e.y+e.h*.2,damage:1,ownerId:e.rid});
  e.shootCd=e.shoot*e.shootScale*rnd(.92,1.12);
 }else if(!disabled&&e.shootCd<=0&&e.y>80&&e.y<p.y-110&&e.type!=='bike'&&e.type!=='col_armor'&&e.type!=='col_engine'){
 const a=Math.atan2(p.y-e.y,p.x-e.x),isMG=e.type==='col_mg',isRkt=e.type==='col_rocket',shots=isMG?5:isRkt?3:e.type==='dreadnought'?5:e.type==='wartruck'?3:1,spread=isRkt?.18:isMG?.095:.12,spd=isRkt?300:isMG?440:360,damage=isRkt?2:1;
 for(let q=0;q<shots;q++){const aa=a+(q-(shots-1)/2)*spread;g.enemyBullets.push({x:e.x,y:e.y+e.h*.35,vx:Math.cos(aa)*spd,vy:Math.sin(aa)*spd,life:isRkt?3.3:2.8,damage,heavy:isRkt})}
 e.shootCd=e.shoot*e.shootScale*(e.type==='wartruck'?.9:rnd(.9,1.15))
}if(Math.abs(e.x-p.x)<(e.w+p.w)*.42&&Math.abs(e.y-p.y)<(e.h+p.h)*.42&&e.ram<=0){hurtRoad(e.type==='truck'||e.type==='wartruck'?2:1);e.hp-=2;e.ram=.8;if(e.hp<=0){killRoad(i);continue}}if(e.y>1030)g.enemies.splice(i,1)}
 for(let i=g.enemyBullets.length-1;i>=0;i--){const b=g.enemyBullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.abs(b.x-p.x)<25+(b.heavy?5:0)&&Math.abs(b.y-p.y)<33+(b.heavy?5:0)){hurtRoad(b.damage||1);g.enemyBullets.splice(i,1);continue}if(b.life<=0||b.y>1000)g.enemyBullets.splice(i,1)}
 for(let i=g.strikes.length-1;i>=0;i--){
  const st=g.strikes[i];st.t-=dt;
  if(st.t<=0){if(Math.hypot(p.x-st.x,p.y-st.y)<st.r)hurtRoad(st.damage||2);if(Math.hypot(p.x-st.x,p.y-st.y)<170)g.shake=Math.max(g.shake||0,5);g.fx.push({x:st.x,y:st.y,r:st.r,life:.32,color:'#cf6844',kind:'missileImpact'});g.strikes.splice(i,1)}
 }
 g.barrierTimer-=dt;
 if(g.threat>=.96&&g.elapsed>7&&g.barrierTimer<=0){
  const late=Math.max(0,meta.runStep-2),gapW=clamp(138-late*6-(g.finalRoute?18:0),86,138);
  g.barriers.push({y:-32,gapX:rnd(85,455),gapW,h:28,hit:false});
  g.barrierTimer=rnd(g.finalRoute?5.8:7.8,g.finalRoute?8.0:11.2);
 }
 for(let i=g.barriers.length-1;i>=0;i--){
  const br=g.barriers[i];br.y+=(g.finalRoute?285:255)*dt;
  if(!br.hit&&Math.abs(br.y-p.y)<(br.h+p.h)*.45){
   const left=br.gapX-br.gapW/2,right=br.gapX+br.gapW/2;
   if(p.x-p.w*.35<left||p.x+p.w*.35>right){hurtRoad(2);br.hit=true;g.fx.push({x:p.x,y:p.y,r:38,life:.3,color:C.red})}
  }
  if(br.y>1020)g.barriers.splice(i,1);
 }
 if(g.mine<=0&&g.elapsed>7){g.mines.push({x:rnd(55,485),y:-25,r:16});if(g.threat>1.05&&g.elapsed/g.duration>.65&&Math.random()<Math.min(.4,(g.threat-1)*.8))g.mines.push({x:rnd(55,485),y:-70,r:16});g.mine=rnd(4.0,5.8)/g.threat}for(let i=g.mines.length-1;i>=0;i--){const m=g.mines[i];m.y+=210*dt;if(distance(m,p)<38){hurtRoad(2);g.fx.push({x:m.x,y:m.y,r:32,life:.3,color:'#db7c3f',kind:'mineImpact'});g.mines.splice(i,1);continue}if(m.y>990)g.mines.splice(i,1)}
 for(let i=g.drops.length-1;i>=0;i--){const d=g.drops[i];d.y+=145*dt;if(distance(d,p)<42){if(d.type==='scrap')g.scrap++;else if(d.type==='fuel')g.fuel++;else if(d.type==='repair'){const before=p.hp;p.hp=Math.min(p.max,p.hp+2);if(p.hp>before){g.repairs++;notice='战地维修：车体 +2';noticeT=1.1}}g.drops.splice(i,1);continue}if(d.y>980)g.drops.splice(i,1)}for(let i=g.fx.length-1;i>=0;i--){g.fx[i].life-=dt;if(g.fx[i].life<=0)g.fx.splice(i,1)}
 if(g.bossRoute&&!g.bossSpawned&&g.elapsed>6){g.bossSpawned=true;g.boss=true;if(g.finalRoute)spawnColossus();else spawnRoadEnemy('dreadnought')}
 else if(!g.bossRoute&&!g.boss&&g.elapsed/g.duration>.76){g.boss=true;spawnRoadEnemy('boss')}
 if(g.spawn<=0){if(!g.bossRoute||!g.bossSpawned||g.enemies.filter(e=>e.group!=='colossus'&&e.type!=='dreadnought').length<(g.finalRoute?4:4)){spawnRoadEnemy();const extraChance=clamp((g.threat-.9)*.5,0,.30);if(!g.bossRoute&&g.elapsed/g.duration>.52&&Math.random()<extraChance)spawnRoadEnemy()}g.spawn=rnd(.95,1.35)/(meta.route.spawn||1)/g.threat}
 if(p.hp<=0){meta.arrived=false;finishRun(false);return}
 if(g.bossRoute&&g.bossDefeated){g.victoryDelay=Math.max(0,(g.victoryDelay||0)-dt);if(g.victoryDelay<=0)finishRoadSuccess();return}
 if(g.time<=0){if(g.bossRoute&&!g.bossDefeated){meta.arrived=false;finishRun(false);return}finishRoadSuccess();return}}

function buildSiteLayout(site,variant){
 const obs=[],add=(x,y,w,h,kind='cover')=>obs.push({x,y,w,h,kind});
 if(site==='gas'){
  add(40,145,200,145,'landmark');add(310,160,135,55);add(110,350,120,55);add(320,360,100,85);add(90,560,52,105);add(398,560,52,105);
 }else if(site==='clinic'){
  add(40,145,200,145,'landmark');add(340,160,125,58);add(205,310,130,50);add(72,460,145,62);add(325,470,142,62);add(208,635,125,52);
 }else if(site==='motel'){
  add(35,145,210,150,'landmark');add(315,150,170,100);add(55,370,170,105);add(315,370,170,105);add(185,585,170,70);
 }else{
  add(45,160,80,130);add(185,145,160,125,'landmark');add(415,145,80,145);add(75,410,130,70);add(290,370,155,80);add(170,600,95,80);add(350,610,100,75);
 }
 if(variant===1)for(const o of obs)o.x=540-o.x-o.w;
 if(variant===2)for(let i=0;i<obs.length;i++)if(i%2)obs[i].y+=55;
 // Landmarks need a real walkable lane between their collision box and the
 // world edge. Keep the art and solid footprint together instead of creating
 // a visually empty strip that still blocks the player.
 for(const o of obs)if(o.kind==='landmark')o.x=clamp(o.x,60,540-60-o.w);
 return obs;
}
const FINAL_WAVES=[
 [
  {type:'armored',x:105,y:900},{type:'armored',x:430,y:885},
  {type:'gunner',x:150,y:800},{type:'gunner',x:390,y:805},
  {type:'melee',x:220,y:850},{type:'melee',x:325,y:840}
 ],
 [
  {type:'grenadier',x:100,y:670},{type:'grenadier',x:440,y:675},
  {type:'armored',x:270,y:620},{type:'gunner',x:150,y:565},{type:'gunner',x:390,y:565},
  {type:'melee',x:215,y:700},{type:'melee',x:330,y:700}
 ],
 [
  {type:'sniper',x:95,y:335},{type:'sniper',x:445,y:345},
  {type:'grenadier',x:120,y:455},{type:'grenadier',x:420,y:455},
  {type:'armored',x:270,y:345},{type:'armored',x:270,y:515},
  {type:'gunner',x:180,y:420},{type:'gunner',x:360,y:420}
 ]
];
function spawnFinalWave(idx){
 const g=game,w=FINAL_WAVES[idx]||[];g.wave=idx+1;g.finalLabel=['外围庭院','维修工坊','指挥大厅'][idx]||'车手';
 for(const q of w){let e=makeScavEnemy(q.type,q.x,q.y);let tries=0;while(!validScavSpawn(e)&&tries++<20){e.x=clamp(e.x+rnd(-35,35),45,495);e.y=clamp(e.y+rnd(-35,35),230,g.worldH-120)}if(validScavSpawn(e))g.enemies.push(e)}
 notice=g.finalLabel;noticeT=1.4;
}
function startFinalBreach(){
 const b=buildStats(),worldH=1250;
 const obstacles=[
  {x:55,y:950,w:170,h:58},{x:320,y:940,w:165,h:58},
  {x:180,y:735,w:180,h:60},{x:55,y:570,w:145,h:62},{x:340,y:560,w:145,h:62},
  {x:205,y:380,w:130,h:65},{x:65,y:260,w:120,h:60},{x:355,y:255,w:120,h:60}
 ];
 game={site:'junkyard',finalAssault:true,finalLabel:'外围庭院',wave:0,driverSpawned:false,driverDefeated:false,driverAdds1:false,driverAdds2:false,time:180,elapsed:0,worldH,cameraY:290,player:{x:270,y:1120,r:15,hp:b.maxHp,max:b.maxHp,speed:b.speed,inv:0,med:b.medCharges,bodyDir:'upRight',pendingDir:null,dirHold:0,aimAngle:-Math.PI/2,lastAimAngle:-Math.PI/2},build:b,obstacles,crates:[],loot:[],enemies:[],bullets:[],enemyBullets:[],grenades:[],fx:[],haul:[],weaponCd:b.weapons.map(w=>({...w,cd:rnd(0,.25)})),exit:{x:270,y:1180,progress:0},search:null,spawn:999,supportMg:.7,supportRocket:1.7};
 spawnFinalWave(0);state='finalassault';
}
function spawnDriverAdds(kind){
 const g=game,defs=kind===1?[{type:'armored',x:105,y:520},{type:'gunner',x:430,y:520},{type:'melee',x:270,y:600}]:
 [{type:'grenadier',x:105,y:420},{type:'armored',x:430,y:430},{type:'melee',x:190,y:560},{type:'melee',x:355,y:560}];
 for(const q of defs){let e=makeScavEnemy(q.type,q.x,q.y);let tries=0;while(!validScavSpawn(e)&&tries++<20){e.x=clamp(e.x+rnd(-30,30),45,495);e.y=clamp(e.y+rnd(-30,30),230,g.worldH-120)}if(validScavSpawn(e))g.enemies.push(e)}
 notice=kind===1?'车手呼叫增援':'背水一战';noticeT=1.4;
}
function spawnDriver(){
 const g=game,e=makeScavEnemy('driver',270,255);g.driverSpawned=true;g.finalLabel='车手';e.attackSeq=0;g.enemies.push(e);notice='车手';noticeT=1.5;
}
function updateFinalAssaultStage(g,dt){
 if(!meta.finalFlags.mg){
  g.supportMg-=dt;
  if(g.supportMg<=0){const p=g.player,n=norm(p.x-270,p.y-185);g.enemyBullets.push({x:270,y:185,vx:n.x*390,vy:n.y*390,life:2.8,damage:1,support:true});g.supportMg=rnd(.48,.72)}
 }
 if(!meta.finalFlags.rocket){
  g.supportRocket-=dt;
  if(g.supportRocket<=0){const p=g.player,tx=clamp(p.x+rnd(-24,24),55,485),ty=clamp(p.y+rnd(-24,24),210,g.worldH-90);g.grenades.push({sx:270,sy:180,x:270,y:180,tx,ty,phase:'air',flight:0,duration:.9,fuse:.45,r:72,z:0,support:true,damage:3});g.supportRocket=rnd(1.8,2.35)}
 }
 if(!g.driverSpawned&&g.enemies.length===0){
  if(g.wave<3)spawnFinalWave(g.wave);
  else spawnDriver();
 }
 if(g.driverSpawned&&!g.driverDefeated){
  const d=g.enemies.find(e=>e.type==='driver');
  if(d&&!g.driverAdds1&&d.hp/d.max<=.68){g.driverAdds1=true;spawnDriverAdds(1)}
  if(d&&!g.driverAdds2&&d.hp/d.max<=.36){g.driverAdds2=true;spawnDriverAdds(2)}
 }
 if(g.driverDefeated){finishRun(true);return}
 if(g.time<=0){notice='圣堂防线失守';noticeT=1;finishRun(false)}
}
function startScavenge(){
 const site=meta.selectedNode?.site||'gas',danger=meta.selectedNode?.danger||1,special=!!meta.selectedNode?.special,b=buildStats(),travelEffect=meta.nextSearchEffect;
 meta.nextSearchEffect=null;
 const worldH=1450,scaleY=1.35,yOffset=130;
 const rules={
  gas:{label:'燃料储藏点',extraCrates:2,pressure:1},
  clinic:{label:'紧急救治',extraCrates:0,pressure:1,med:1},
  motel:{label:'伏击区',extraCrates:1,pressure:1.28},
  junkyard:{label:'回收场',extraCrates:0,pressure:1,moduleBoost:2}
 },baseRule=rules[site]||{label:'标准区域',extraCrates:0,pressure:1},rule={...baseRule,pressure:(baseRule.pressure||1)*(travelEffect?.pressure||1)};
 const obstacles=buildSiteLayout(site,Math.floor(Math.random()*3)).map(o=>({...o,y:Math.round(o.y*scaleY+yOffset)}));
 game={site,danger,special,rule,effectLabel:travelEffect?.label||'',time:90,elapsed:0,worldH,cameraY:0,player:{x:270,y:1240,r:15,hp:Math.max(1,b.maxHp-(travelEffect?.hpLoss||0)),max:b.maxHp,speed:b.speed,inv:0,med:b.medCharges+(rule.med||0),bodyDir:'upRight',pendingDir:null,dirHold:0,aimAngle:-Math.PI/2,lastAimAngle:-Math.PI/2},build:b,obstacles,crates:[],loot:[],enemies:[],bullets:[],enemyBullets:[],grenades:[],fx:[],haul:[],weaponCd:b.weapons.map(w=>({...w,cd:rnd(0,.25)})),exit:{x:270,y:1330,progress:0},search:null,spawn:.2};
 const spots=[[100,120],[270,135],[440,120],[105,300],[430,310],[90,690],[450,700],[270,530],[270,260],[270,400],[150,480],[390,490],[270,700],[270,760]];
 const clearSpots=shuffle(spots).map(([x,y])=>({x:x+rnd(-8,8),y:Math.round(y*scaleY+yOffset+rnd(-8,8))})).filter(p=>!obstacles.some(o=>collideCircleRect(p,26,o)));
 clearSpots.slice(0,Math.min(clearSpots.length,5+danger+(rule.extraCrates||0))).forEach((p,i)=>game.crates.push({...p,opened:false,rare:special&&i===0,progress:0}));
 for(let i=0;i<4+danger*2+(site==='motel'?2:0)+(travelEffect?.extraEnemies||0);i++)spawnScavEnemy();
 if(special)spawnScavEnemy('elite');
 game.cameraY=clamp(game.player.y-620,0,game.worldH-H);
 state='play';
}
function makeScavEnemy(type,x=rnd(60,480),y=rnd(250,game?.worldH?game.worldH-230:1200)){
 if(!type){
  const r=Math.random(),step=meta.runStep||0;
  if(step>=4&&r<.12)type='sniper';
  else if(step>=2&&r<.30)type='armored';
  else type=choice(SITE[game.site].enemy);
 }
 const e={eid:Math.random().toString(36).slice(2),type,x,y,cd:rnd(.4,1.2),inv:0,navSide:Math.random()<.5?-1:1,navHold:0};
 if(type==='melee')Object.assign(e,{hp:3,spd:74,r:15,color:'#78945f'});
 if(type==='gunner')Object.assign(e,{hp:4,spd:48,r:15,color:'#9b6d45'});
 if(type==='grenadier')Object.assign(e,{hp:5,spd:42,r:17,color:'#8d5d48'});
 if(type==='elite')Object.assign(e,{hp:12,spd:58,r:21,color:'#b34f3d'});
 if(type==='armored')Object.assign(e,{hp:10,spd:36,r:20,color:'#68736d'});
 if(type==='sniper')Object.assign(e,{hp:4,spd:30,r:15,color:'#64788c'});
 if(type==='driver')Object.assign(e,{hp:112,spd:74,r:23,color:'#b14f3f',boss:true});
 if(type!=='driver'){
  const late=Math.max(0,(meta.runStep||0)-4),hpScale=1+Math.min(.55,late*.09),spdScale=1+Math.min(.16,late*.025);
  e.hp=Math.ceil(e.hp*hpScale);e.spd*=spdScale;
 }
 e.max=e.hp;return e
}
function validScavSpawn(e){
 if(!game||e.x<35||e.x>505||e.y<190||e.y>game.worldH-110)return false;
 if(distance(e,game.player)<240||distance(e,game.exit)<100)return false;
 if(game.obstacles.some(o=>collideCircleRect(e,e.r+8,o)))return false;
 if(game.enemies.some(o=>distance(e,o)<e.r+o.r+18))return false;
 return true;
}
function spawnScavEnemy(type){
 if(game.enemies.length>18)return;
 let e=makeScavEnemy(type),chosen=e.type,tries=0;
 while(!validScavSpawn(e)&&tries++<80)e=makeScavEnemy(chosen);
 if(!validScavSpawn(e)){
  const spots=[[45,220],[495,220],[45,420],[495,420],[45,680],[495,680],[45,920],[495,920],[270,260]];
  for(const q of spots){const test=makeScavEnemy(chosen,q[0],q[1]);if(validScavSpawn(test)){e=test;break}}
 }
 if(validScavSpawn(e))game.enemies.push(e);
}
function collideCircleRect(p,r,o){const x=clamp(p.x,o.x,o.x+o.w),y=clamp(p.y,o.y,o.y+o.h);return Math.hypot(p.x-x,p.y-y)<r}
function moveWithObstacles(p,dx,dy,r,obs,bounds){const ox=p.x,oy=p.y;p.x+=dx;p.x=clamp(p.x,bounds[0],bounds[1]);if(obs.some(o=>collideCircleRect(p,r,o)))p.x=ox;p.y+=dy;p.y=clamp(p.y,bounds[2],bounds[3]);if(obs.some(o=>collideCircleRect(p,r,o)))p.y=oy}
function enemyStepClear(e,dx,dy,obs,bounds){
 const nx=clamp(e.x+dx,bounds[0],bounds[1]),ny=clamp(e.y+dy,bounds[2],bounds[3]);
 return !obs.some(o=>collideCircleRect({x:nx,y:ny},e.r,o));
}
function moveEnemySmart(e,tx,ty,dt,speed,obs,bounds){
 const dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy)||1,base=Math.atan2(dy,dx),step=speed*dt;
 const pref=e.navSide||1;
 const offsets=[0,pref*.45,-pref*.45,pref*.85,-pref*.85,pref*1.25,-pref*1.25,Math.PI];
 let best=null,bestScore=-1e9;
 for(const off of offsets){
  const a=base+off,mx=Math.cos(a)*step,my=Math.sin(a)*step;
  if(!enemyStepClear(e,mx,my,obs,bounds))continue;
  const nx=e.x+mx,ny=e.y+my,nd=Math.hypot(tx-nx,ty-ny);
  const alignment=Math.cos(off),score=-nd+alignment*28-Math.abs(off)*4;
  if(score>bestScore){bestScore=score;best={mx,my,off}}
 }
 if(best){
  e.x=clamp(e.x+best.mx,bounds[0],bounds[1]);e.y=clamp(e.y+best.my,bounds[2],bounds[3]);
  if(Math.abs(best.off)>.1){e.navSide=Math.sign(best.off)||pref;e.navHold=.55}else if((e.navHold||0)<=0)e.navSide=pref;
 }else{
  e.navSide=-(e.navSide||1);e.navHold=.7;
 }
 e.navHold=Math.max(0,(e.navHold||0)-dt);
}
function moveEnemyAwaySmart(e,tx,ty,dt,speed,obs,bounds){
 const dx=e.x-tx,dy=e.y-ty,d=Math.hypot(dx,dy)||1;
 moveEnemySmart(e,e.x+dx/d*180,e.y+dy/d*180,dt,speed,obs,bounds);
}
function moveActor(p,dt,speed,minX,maxX,minY,maxY){let mx=0,my=0;if(keys.has('a')||keys.has('arrowleft'))mx--;if(keys.has('d')||keys.has('arrowright'))mx++;if(keys.has('w')||keys.has('arrowup'))my--;if(keys.has('s')||keys.has('arrowdown'))my++;mx+=joy.dx;my+=joy.dy;if(Math.hypot(mx,my)>.08){const n=norm(mx,my);p.x+=n.x*speed*dt;p.y+=n.y*speed*dt}p.x=clamp(p.x,minX,maxX);p.y=clamp(p.y,minY,maxY)}
function hurtPlayer(n){const p=game.player;if(p.inv>0)return;p.hp-=n;p.inv=.55;game.fx.push({x:p.x,y:p.y,r:28,life:.28,color:C.red});if(p.hp<=2&&p.med>0){p.med--;p.hp=Math.min(p.max,p.hp+2);notice='已自动使用医疗包';noticeT=1.2}}
function chooseLoot(){const w=SITE[game.site].loot,r=Math.random();let a=0;for(const k of ['gas','food','scrap','med']){a+=w[k];if(r<a)return k}return'scrap'}
function gearDrop(rare=false){const chance=.12+SITE[game.site].gear+game.build.luck+(rare?.35:0);if(Math.random()>chance)return null;return makeItem(pickUpgradeReward(GEAR_REWARD_POOL,meta.backpack,ITEM,'gearUpgradeGap'),rare&&Math.random()<.45?2:1)}
function openCrate(c){
 c.opened=true;
 const n=c.rare?3:1+Math.floor(Math.random()*2);
 for(let i=0;i<n;i++){
  const t=chooseLoot();meta.cargo[t]++;
  game.loot.push({x:c.x+rnd(-18,18),y:c.y+rnd(-15,12),type:t,life:1.2,age:0})
 }
 game.fx.push({x:c.x,y:c.y,r:c.rare?36:28,life:.45,color:c.rare?'#ffe796':C.green,kind:'searchBurst'});
 const g=gearDrop(c.rare);if(g)game.haul.push(g);
 if(game.site==='junkyard'&&Math.random()<(c.rare?.55:.12*(game.rule?.moduleBoost||1)))meta.pendingVehicle.push(makeVehicle(pickUpgradeReward(VEH_REWARD_POOL,meta.vehiclePack,VEH,'vehicleUpgradeGap'),c.rare&&Math.random()<.25?2:1));
 notice=c.rare?'已开启稀有储藏箱':'补给已收入囊中';noticeT=.8;save()
}
function pointInObstacle(x,y,o,pad=0){return x>=o.x-pad&&x<=o.x+o.w+pad&&y>=o.y-pad&&y<=o.y+o.h+pad}
function segmentHitsObstacle(x1,y1,x2,y2,obstacles,pad=0){
 if(!obstacles?.length)return false;
 const d=Math.hypot(x2-x1,y2-y1),steps=Math.max(1,Math.ceil(d/8));
 for(let i=1;i<=steps;i++){const t=i/steps,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;if(obstacles.some(o=>pointInObstacle(x,y,o,pad)))return true}
 return false;
}
function grenadeLanding(e,p,obstacles){
 const maxRange=300,aim={x:p.x+rnd(-24,24),y:p.y+rnd(-24,24)},dx=aim.x-e.x,dy=aim.y-e.y,d=Math.hypot(dx,dy)||1,range=Math.min(maxRange,d),nx=dx/d,ny=dy/d;
 let tx=e.x+nx*range,ty=e.y+ny*range,lastX=e.x,lastY=e.y;
 const steps=Math.max(1,Math.ceil(range/10));
 for(let i=1;i<=steps;i++){const t=i/steps,x=e.x+(tx-e.x)*t,y=e.y+(ty-e.y)*t;if(obstacles.some(o=>pointInObstacle(x,y,o,8))){tx=lastX;ty=lastY;break}lastX=x;lastY=y}
 return{x:tx,y:ty};
}
function throwGrenade(e,p){
 const land=grenadeLanding(e,p,game.obstacles);
 game.grenades.push({sx:e.x,sy:e.y,x:e.x,y:e.y,tx:land.x,ty:land.y,phase:'air',flight:0,duration:.78,fuse:.55,r:54,z:0});
}
const SURVIVOR_BODY={
 // Opaque bounds (alpha >= 16) in the 128px source images. Keep feet on one
 // ground line and normalize visible height instead of scaling transparent margins.
 upLeft:{asset:'playerBodyUpLeft',box:[42,10,87,118],wx:-5,wy:-6},
 upRight:{asset:'playerBodyUpRight',box:[42,10,86,118],wx:5,wy:-6},
 downLeft:{asset:'playerBodyDownLeft',box:[40,10,88,118],wx:-2,wy:-4},
 downRight:{asset:'playerBodyDownRight',box:[40,10,87,118],wx:2,wy:-4}
};
const SURVIVOR_VISIBLE_HEIGHT=53;
const SURVIVOR_FOOT_Y=27;
function drawScavBody(p,cfg,alpha){
 const body=PROD[cfg.asset];if(!body?.ready)return false;
 const [left,top,right,bottom]=cfg.box;
 const scale=SURVIVOR_VISIBLE_HEIGHT/(bottom-top);
 const scaleX=scale*(cfg.widthScale||1);
 const x=p.x-(left+right)*.5*scaleX;
 const y=p.y+SURVIVOR_FOOT_Y-bottom*scale;
 ctx.save();ctx.globalAlpha=alpha;
 ctx.drawImage(body.img,x,y,body.img.naturalWidth*scaleX,body.img.naturalHeight*scale);
 ctx.restore();return true
}
function scavBodyDirFromVector(dx,dy,current='upRight'){
 const margin=Math.hypot(dx,dy)*.12;
 const left=dx<-margin?true:dx>margin?false:current.endsWith('Left');
 const up=dy<-margin?true:dy>margin?false:current.startsWith('up');
 return (up?'up':'down')+(left?'Left':'Right')
}
function updateScavFacing(p,mx,my,dt,target){
 let next=p.bodyDir||'upRight';
 if(target){
  const dx=target.x-p.x,dy=target.y-p.y;
  p.aimAngle=Math.atan2(dy,dx);p.lastAimAngle=p.aimAngle;
  next=scavBodyDirFromVector(dx,dy,p.bodyDir)
 }else if(Math.hypot(mx,my)>.08){
  next=scavBodyDirFromVector(mx,my,p.bodyDir);
  p.aimAngle=Math.atan2(my,mx);p.lastAimAngle=p.aimAngle
 }
 if(next!==p.bodyDir){
  if(p.pendingDir!==next){p.pendingDir=next;p.dirHold=.075}
  else{p.dirHold-=dt;if(p.dirHold<=0){p.bodyDir=next;p.pendingDir=null;p.dirHold=0}}
 }else{p.pendingDir=null;p.dirHold=0}
 if(p.aimAngle==null)p.aimAngle=p.lastAimAngle??-Math.PI/2
}
function drawScavWeapon(p,alpha=1){
 const a=PROD.playerWeaponRifle;if(!a?.ready)return false;
 const cfg=SURVIVOR_BODY[p.bodyDir||'upRight']||SURVIVOR_BODY.upRight;
 const angle=(p.aimAngle??p.lastAimAngle??-Math.PI/2)+Math.PI/2;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x+cfg.wx,p.y+cfg.wy);ctx.rotate(angle);
 const size=38;ctx.drawImage(a.img,-size/2,-size*.58,size,size);ctx.restore();return true
}
function fireScav(w,target){
 const p=game.player,base=Math.atan2(target.y-p.y,target.x-p.x),cfg=SURVIVOR_BODY[p.bodyDir||'upRight']||SURVIVOR_BODY.upRight;
 const recoil=w.pellets>1?5.5:w.damage>=2?4.5:w.interval<.3?2.6:3.4;
 p.recoilX=clamp((p.recoilX||0)-Math.cos(base)*recoil,-6.5,6.5);p.recoilY=clamp((p.recoilY||0)-Math.sin(base)*recoil,-6.5,6.5);
 const knock=w.pellets>1?10:w.damage>=2?9:w.interval<.3?5:7,stagger=w.pellets>1?.14:w.damage>=2?.12:.09;
 for(let i=0;i<w.pellets;i++){
  const a=base+(i-(w.pellets-1)/2)*(w.spread||0);
  game.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,life:w.range/w.speed,damage:w.damage,r:w.pellets>1?3:4,pierce:w.pierce||0,ap:w.ap||0,eliteBonus:w.eliteBonus||0,knock,stagger,hitIds:[]})
 }
 game.fx.push({x:p.x+(p.recoilX||0)+cfg.wx+Math.cos(base)*17,y:p.y+(p.recoilY||0)+cfg.wy+Math.sin(base)*17,r:9,life:.1,color:C.yellow,kind:'muzzle'})
}
const SCAV_STAGGER_IMMUNE=new Set(['armored','elite','driver']);
function updateScavenge(dt){const g=game,p=g.player;g.elapsed+=dt;g.time=Math.max(0,(g.finalAssault?180:90)-g.elapsed);p.inv=Math.max(0,p.inv-dt);const recoilReturn=Math.exp(-dt*15);p.recoilX=(p.recoilX||0)*recoilReturn;p.recoilY=(p.recoilY||0)*recoilReturn;let mx=0,my=0;if(keys.has('a')||keys.has('arrowleft'))mx--;if(keys.has('d')||keys.has('arrowright'))mx++;if(keys.has('w')||keys.has('arrowup'))my--;if(keys.has('s')||keys.has('arrowdown'))my++;mx+=joy.dx;my+=joy.dy;if(Math.hypot(mx,my)>.08){const n=norm(mx,my);moveWithObstacles(p,n.x*p.speed*dt,n.y*p.speed*dt,p.r,g.obstacles,[28,512,170,g.worldH-90])}
 const maxAimRange=Math.max(220,...g.weaponCd.map(w=>w.range||0));let facingTarget=null,facingDist=1e9;
 for(const e of g.enemies){const d=distance(p,e);if(d<maxAimRange&&d<facingDist){facingDist=d;facingTarget=e}}
 updateScavFacing(p,mx,my,dt,facingTarget);
 const cameraTarget=clamp(p.y-620,0,g.worldH-H);g.cameraY+=(cameraTarget-g.cameraY)*Math.min(1,dt*7);
 for(const w of g.weaponCd){w.cd-=dt;if(w.cd<=0){let t=null,b=1e9;for(const e of g.enemies){const d=distance(p,e);if(d<w.range&&d<b){b=d;t=e}}if(t){fireScav(w,t);w.cd=w.interval}}}
 for(let i=g.bullets.length-1;i>=0;i--){const b=g.bullets[i],ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=segmentHitsObstacle(ox,oy,b.x,b.y,g.obstacles,b.r);if(!hit)for(let j=g.enemies.length-1;j>=0;j--){
 const e=g.enemies[j];if((b.hitIds||[]).includes(e.eid))continue;
 if(distance(b,e)<e.r+b.r){
  let dmg=b.damage;
  if(e.type==='armored')dmg*=b.ap>0?1.15:.40;
  if(e.type==='driver'&&!meta.finalFlags.armor)dmg*=.55;
  if((e.type==='elite'||e.type==='armored'||e.type==='driver')&&b.eliteBonus)dmg*=1+b.eliteBonus;
  e.hp-=dmg;(b.hitIds||(b.hitIds=[])).push(e.eid);
   g.fx.push({x:b.x,y:b.y,r:7,life:.15,color:b.ap>0?C.teal:C.yellow,kind:'impact'});
  if(e.hp>0&&!SCAV_STAGGER_IMMUNE.has(e.type)){
   e.stun=Math.max(e.stun||0,b.stagger||.09);
   if((e.knockLock||0)<=0){const push=norm(b.vx,b.vy);moveWithObstacles(e,push.x*(b.knock||7),push.y*(b.knock||7),e.r,g.obstacles,[25,515,170,g.worldH-80]);e.knockLock=.07}
  }
  if(e.hp<=0){meta.runStats.scavKills++;if(e.type==='driver')g.driverDefeated=true;if(!g.finalAssault&&Math.random()<.08+g.build.luck){const gear=gearDrop(false);if(gear)g.haul.push(gear)}g.enemies.splice(j,1)}
  if((b.pierce||0)>0)b.pierce--;else hit=true;
  break
 }
}if(hit||b.life<=0)g.bullets.splice(i,1)}
 for(let i=g.enemies.length-1;i>=0;i--){
 const e=g.enemies[i],d=distance(e,p),bounds=[25,515,170,g.worldH-80];
 e.knockLock=Math.max(0,(e.knockLock||0)-dt);
 if((e.stun||0)>0){e.stun=Math.max(0,e.stun-dt);continue}
 e.cd-=dt;
 const blocked=segmentHitsObstacle(e.x,e.y,p.x,p.y,g.obstacles,e.r*.45);
 if(e.type==='driver'){
  const rage=e.hp/e.max<.38;
  if(rage){
   moveEnemySmart(e,p.x,p.y,dt,e.spd*2.35,g.obstacles,bounds);
   if(d<e.r+p.r+6&&e.cd<=0){hurtPlayer(2);e.cd=.48}
  }else{
   const desired=215;if(blocked||d>desired+35)moveEnemySmart(e,p.x,p.y,dt,e.spd,g.obstacles,bounds);else if(d<desired-45)moveEnemyAwaySmart(e,p.x,p.y,dt,e.spd,g.obstacles,bounds);
   if(e.cd<=0&&!blocked){
    e.attackSeq=(e.attackSeq||0)+1;
    if(e.attackSeq%3===0)throwGrenade(e,p);else{const n=norm(p.x-e.x,p.y-e.y);for(let q=-2;q<=2;q++){const a=Math.atan2(n.y,n.x)+q*.075;g.enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*370,vy:Math.sin(a)*370,life:2.3,damage:q===0?2:1})}}
    e.cd=rnd(.88,1.18)
   }
  }
 }else if(e.type==='melee'||e.type==='elite'||e.type==='armored'){
  moveEnemySmart(e,p.x,p.y,dt,e.spd,g.obstacles,bounds);
  if(d<e.r+p.r+4&&e.cd<=0){hurtPlayer(e.type==='elite'?2:1);e.cd=.9}
 }else{
  const desired=e.type==='sniper'?385:e.type==='gunner'?235:265;
  if(blocked||d>desired+35)moveEnemySmart(e,p.x,p.y,dt,e.spd,g.obstacles,bounds);
  else if(d<desired-45)moveEnemyAwaySmart(e,p.x,p.y,dt,e.spd,g.obstacles,bounds);
  else if((e.navHold||0)>0){
   const side=e.navSide||1,a=Math.atan2(p.y-e.y,p.x-e.x)+side*Math.PI/2;
   moveEnemySmart(e,e.x+Math.cos(a)*90,e.y+Math.sin(a)*90,dt,e.spd*.55,g.obstacles,bounds);
  }
  if(e.cd<=0&&!blocked){
   if(e.type==='gunner'||e.type==='sniper'){
    const n=norm(p.x-e.x,p.y-e.y),sn=e.type==='sniper';
    g.enemyBullets.push({x:e.x,y:e.y,vx:n.x*(sn?460:280),vy:n.y*(sn?460:280),life:sn?2.4:2.1,damage:sn?2:1,sniper:sn})
   }else if(d<=300)throwGrenade(e,p);
   e.cd=e.type==='sniper'?rnd(2.6,3.2):e.type==='gunner'?rnd(1.25,1.75):rnd(2.2,3.0)
  }
 }
}
 for(let i=g.enemyBullets.length-1;i>=0;i--){
 const b=g.enemyBullets[i],ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
 if(segmentHitsObstacle(ox,oy,b.x,b.y,g.obstacles,5)){g.enemyBullets.splice(i,1);continue}
 if(distance(b,p)<p.r+5){hurtPlayer(b.damage||1);g.enemyBullets.splice(i,1);continue}
 if(b.life<=0)g.enemyBullets.splice(i,1)
}
for(let i=g.grenades.length-1;i>=0;i--){
 const gr=g.grenades[i];
 if(gr.phase==='air'){
  gr.flight+=dt;const t=clamp(gr.flight/gr.duration,0,1);gr.x=gr.sx+(gr.tx-gr.sx)*t;gr.y=gr.sy+(gr.ty-gr.sy)*t;gr.z=Math.sin(Math.PI*t)*70;
  if(t>=1){gr.phase='fuse';gr.x=gr.tx;gr.y=gr.ty;gr.z=0}
 }else{
  gr.fuse-=dt;
  if(gr.fuse<=0){if(distance(gr,p)<gr.r)hurtPlayer(gr.damage||2);g.fx.push({x:gr.x,y:gr.y,r:gr.r,life:.35,color:'#dd6d43'});g.grenades.splice(i,1)}
 }
}
 for(let i=g.loot.length-1;i>=0;i--){const l=g.loot[i];l.age=(l.age||0)+dt;l.life-=dt;if(l.life<=0)g.loot.splice(i,1)}
 if(g.finalAssault){
  updateFinalAssaultStage(g,dt);
  for(let i=g.fx.length-1;i>=0;i--){g.fx[i].life-=dt;if(g.fx[i].life<=0)g.fx.splice(i,1)}
  if(p.hp<=0){finishRun(false)}
  return;
 }
 let active=null,best=999;for(const c of g.crates){if(c.opened)continue;const d=distance(p,c);if(d<58&&d<best){best=d;active=c}}for(const c of g.crates){if(c!==active)c.progress=0}if(active){active.progress+=dt/(active.rare?1.65:1.15);if(active.progress>=1)openCrate(active)}
 const ed=distance(p,g.exit);if(ed<65){g.exit.progress+=dt/1.0;if(g.exit.progress>=1){meta.pendingHaul=[...g.haul];state='pack';packReturn='route';packAdvance=true;packDrag=null;save();return}}else g.exit.progress=0;
 g.spawn-=dt;const pressure=g.elapsed>45?1.45:1;if(g.spawn<=0){spawnScavEnemy();if(g.elapsed>65&&Math.random()<.45)spawnScavEnemy();g.spawn=rnd(2.2,3.5)/pressure/(g.danger===3?1.3:1)/(g.rule?.pressure||1)}for(let i=g.fx.length-1;i>=0;i--){g.fx[i].life-=dt;if(g.fx[i].life<=0)g.fx.splice(i,1)}if(p.hp<=0){meta.pendingHaul=[];finishRun(false)}}

function packGeom(){const cell=Math.min(62,430/meta.pack.cols);const w=cell*meta.pack.cols;return{x:(W-w)/2,y:165,cell,cols:meta.pack.cols,rows:meta.pack.rows,bottom:165+cell*meta.pack.rows}}
function vehicleGeom(){const cell=Math.min(62,430/meta.vehicleGrid.cols);const w=cell*meta.vehicleGrid.cols;return{x:(W-w)/2,y:180,cell,cols:meta.vehicleGrid.cols,rows:meta.vehicleGrid.rows,bottom:180+cell*meta.vehicleGrid.rows}}
function occupiedCanPlace(item,gx,gy,list,defs,cols,rows,ignore){const d=defs[item.type];if(gx<0||gy<0||gx+d.w>cols||gy+d.h>rows)return false;for(const o of list){if(o.id===ignore)continue;const od=defs[o.type];if(gx<o.gx+od.w&&gx+d.w>o.gx&&gy<o.gy+od.h&&gy+d.h>o.gy)return false}return true}
function hitGridItem(p,list,defs,g){for(let i=list.length-1;i>=0;i--){const it=list[i],d=defs[it.type],x=g.x+it.gx*g.cell,y=g.y+it.gy*g.cell;if(p.x>=x&&p.x<=x+d.w*g.cell&&p.y>=y&&p.y<=y+d.h*g.cell)return it}return null}
function startPack(returnState='route',advance=false,haul=[]){meta.pendingHaul=haul.length?haul:meta.pendingHaul;packReturn=returnState;packAdvance=advance;packDrag=null;state='pack';if(!evolutionChoice){const u=meta.backpack.find(i=>(i.level||1)>=3&&ITEM[i.type]?.kind==='weapon'&&EVOLUTIONS[i.type]&&!i.evolution);if(u)evolutionChoice={itemId:u.id,type:u.type}}}
function finishPack(){meta.pendingHaul=[];if(packAdvance)completeDestination();state=packReturn;save()}
function packPendingCards(){const g=packGeom(),y=Math.min(g.bottom+20,650);return meta.pendingHaul.slice(0,4).map((it,i)=>({it,x:35+(i%2)*240,y:y+Math.floor(i/2)*72,w:225,h:58}))}

function chooseEvolution(index){
 if(!evolutionChoice)return;
 const it=meta.backpack.find(x=>x.id===evolutionChoice.itemId),opts=EVOLUTIONS[evolutionChoice.type]||[];
 if(!it||!opts[index]){evolutionChoice=null;return}
 it.evolution=opts[index].id;evolutionChoice=null;notice=`进化完成：${opts[index].name}`;noticeT=1.5;save();
}
function evolutionTap(p){
 if(!evolutionChoice)return false;
 if(p.y>=565&&p.y<=685&&p.x>=45&&p.x<=255){chooseEvolution(0);return true}
 if(p.y>=565&&p.y<=685&&p.x>=285&&p.x<=495){chooseEvolution(1);return true}
 return true;
}
function packDown(p){if(evolutionChoice){evolutionTap(p);return}const g=packGeom();if(p.x>=298&&p.x<=512&&p.y>=822&&p.y<=888){finishPack();return}let it=hitGridItem(p,meta.backpack,ITEM,g);if(it){packDrag={source:'grid',item:it,ox:p.x-(g.x+it.gx*g.cell),oy:p.y-(g.y+it.gy*g.cell),gx:it.gx,gy:it.gy,x:p.x,y:p.y};return}for(const c of packPendingCards())if(p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h){packDrag={source:'pending',item:c.it,ox:g.cell*.45,oy:g.cell*.45,x:p.x,y:p.y};return}}
 function packUp(p){if(!packDrag)return;const g=packGeom(),it=packDrag.item,d=ITEM[it.type];const target=hitGridItem(p,meta.backpack,ITEM,g);if(target&&target.id!==it.id&&target.type===it.type&&(target.level||1)<3&&!it.locked){target.level++;if(packDrag.source==='grid')meta.backpack=meta.backpack.filter(x=>x.id!==it.id);else meta.pendingHaul=meta.pendingHaul.filter(x=>x.id!==it.id);notice=`已融合 ${d.name} → ${target.level}级`;noticeT=1.5;if(target.level>=3&&ITEM[target.type].kind==='weapon'&&EVOLUTIONS[target.type]&&!target.evolution)evolutionChoice={itemId:target.id,type:target.type};packDrag=null;save();return}if(p.y>820&&p.x<245){if(it.locked){notice='初始物品无法丢弃';noticeT=1}else{if(packDrag.source==='grid')meta.backpack=meta.backpack.filter(x=>x.id!==it.id);else meta.pendingHaul=meta.pendingHaul.filter(x=>x.id!==it.id);if(packReturn==='town'){const gain=d.sell*(it.level||1);meta.credits+=gain;notice=`已出售 +¢${gain}`}else notice='已留在原地';noticeT=1.2}packDrag=null;save();return}const gx=Math.floor((p.x-packDrag.ox-g.x+g.cell*.5)/g.cell),gy=Math.floor((p.y-packDrag.oy-g.y+g.cell*.5)/g.cell);if(packDrag.source==='pending'&&ITEM[it.type].kind==='weapon'&&weaponCount(meta.backpack,ITEM)>=2){notice='最多装备 2 个武器核心';noticeT=1.2}
 else if(occupiedCanPlace(it,gx,gy,meta.backpack,ITEM,g.cols,g.rows,packDrag.source==='grid'?it.id:null)){it.gx=gx;it.gy=gy;if(packDrag.source==='pending'){meta.pendingHaul=meta.pendingHaul.filter(x=>x.id!==it.id);meta.backpack.push(it)}notice='配置已更新';noticeT=.7}else if(packDrag.source==='grid'){it.gx=packDrag.gx;it.gy=packDrag.gy}packDrag=null;save()}

function startVehicleBay(returnState='route'){vehicleReturn=returnState;vehicleDrag=null;state='vehicle'}
function vehicleCards(){const g=vehicleGeom(),y=Math.min(g.bottom+20,650);return meta.pendingVehicle.slice(0,4).map((it,i)=>({it,x:35+(i%2)*240,y:y+Math.floor(i/2)*72,w:225,h:58}))}
function vehicleDown(p){const g=vehicleGeom();if(p.x>=298&&p.x<=512&&p.y>=822&&p.y<=888){state=vehicleReturn;save();return}let it=hitGridItem(p,meta.vehiclePack,VEH,g);if(it){vehicleDrag={source:'grid',item:it,ox:p.x-(g.x+it.gx*g.cell),oy:p.y-(g.y+it.gy*g.cell),gx:it.gx,gy:it.gy,x:p.x,y:p.y};return}for(const c of vehicleCards())if(p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h){vehicleDrag={source:'pending',item:c.it,ox:g.cell*.45,oy:g.cell*.45,x:p.x,y:p.y};return}}
function vehicleUp(p){if(!vehicleDrag)return;const g=vehicleGeom(),it=vehicleDrag.item,d=VEH[it.type];const target=hitGridItem(p,meta.vehiclePack,VEH,g);if(target&&target.id!==it.id&&target.type===it.type&&(target.level||1)<3&&!it.locked){target.level++;if(vehicleDrag.source==='grid')meta.vehiclePack=meta.vehiclePack.filter(x=>x.id!==it.id);else meta.pendingVehicle=meta.pendingVehicle.filter(x=>x.id!==it.id);notice=`已融合 ${d.name} → ${target.level}级`;noticeT=1.5;vehicleDrag=null;save();return}if(p.y>820&&p.x<245){if(it.locked){notice='核心模块无法拆除';noticeT=1}else{if(vehicleDrag.source==='grid')meta.vehiclePack=meta.vehiclePack.filter(x=>x.id!==it.id);else meta.pendingVehicle=meta.pendingVehicle.filter(x=>x.id!==it.id);if(vehicleReturn==='town'){const gain=d.sell*(it.level||1);meta.credits+=gain;notice=`已出售 +¢${gain}`}else{meta.vehicle.scrap+=1;notice='废料 +1'}noticeT=1}vehicleDrag=null;save();return}const gx=Math.floor((p.x-vehicleDrag.ox-g.x+g.cell*.5)/g.cell),gy=Math.floor((p.y-vehicleDrag.oy-g.y+g.cell*.5)/g.cell);if(vehicleDrag.source==='pending'&&VEH[it.type].kind==='weapon'&&weaponCount(meta.vehiclePack,VEH)>=2){notice='最多装备 2 个武器挂点';noticeT=1.2}
 else if(occupiedCanPlace(it,gx,gy,meta.vehiclePack,VEH,g.cols,g.rows,vehicleDrag.source==='grid'?it.id:null)){it.gx=gx;it.gy=gy;if(vehicleDrag.source==='pending'){meta.pendingVehicle=meta.pendingVehicle.filter(x=>x.id!==it.id);meta.vehiclePack.push(it)}}else if(vehicleDrag.source==='grid'){it.gx=vehicleDrag.gx;it.gy=vehicleDrag.gy}vehicleDrag=null;save()}

function buildIdentity(){
 const ws=activeWeapons(meta.backpack,ITEM,2),e=ws.find(w=>w.evolution);if(e)return (EVOLUTIONS[e.type]?.find(x=>x.id===e.evolution)?.name||ITEM[e.type].name);
 return ws.map(w=>ITEM[w.type].name).join(' + ')||'徒手';
}
function makeRunSummary(victory){return{victory,leg:meta.roadLeg,roadKills:meta.runStats.roadKills||0,scavKills:meta.runStats.scavKills||0,bosses:meta.runStats.bosses||0,events:meta.runStats.events||0,build:buildIdentity(),credits:meta.credits,pack:meta.backpack.length,vehicle:meta.vehiclePack.length,kit:profile.selectedKit||'gunslinger',chassis:meta.chassis||profile.selectedChassis||'junker',flags:{...meta.finalFlags}}}
function finishRun(victory){
 if(state==='runsummary')return;
 runSummary=makeRunSummary(victory);runSummary.marksEarned=victory?3:1;
 profile.runs++;if(victory)profile.wins++;profile.marks+=runSummary.marksEarned;saveProfile();
 meta.runEnded={...runSummary};state='runsummary';save();
}
function enterEvent(){
 const def=WORLD_EVENTS.find(x=>x.id===meta.pendingRoadEvent?.id)||WORLD_EVENTS[0];
 eventData={...def};state='event';save();
}
function resolveEvent(choiceIndex){
 const id=eventData?.id,vs=vehicleStats(),h=Math.min(meta.vehicle.hull??vs.maxHull,vs.maxHull);meta.runStats.events=(meta.runStats.events||0)+1;
 if(id==='convoy'){
 if(choiceIndex===0){
   if(meta.vehicle.fuel<4)return say('需要 4 点燃料');
   meta.vehicle.fuel-=4;meta.credits+=45;meta.pendingHaul.push(makeItem(choice(['scope','apammo','medkit','boots']),2));say('商队交易：丰厚回报');
  }else{
   meta.vehicle.scrap+=3;meta.pendingHaul.push(makeItem(choice(['smg','shotgun','rifle']),2));meta.vehicle.hull=Math.max(1,h-2);
   meta.nextSearchEffect={pressure:1.20,extraEnemies:2,label:'商队报复'};say('已夺取货物 • 车体 -2');
  }
 }else if(id==='signal'){
  if(choiceIndex===0){
   meta.pendingHaul.push(makeItem(choice(['smg','shotgun','rifle']),Math.random()<.28?3:2));meta.credits+=20;
   meta.nextSearchEffect={hpLoss:2,pressure:1.38,extraEnemies:3,label:'信号伏击'};say('发现储藏点 • 前方有伏击');
  }else{
   meta.vehicle.fuel=Math.min(vs.maxFuel,meta.vehicle.fuel+4);meta.credits+=8;say('燃料 +4 • ¢ +8');
  }
 }else if(id==='mechanic'){
  if(choiceIndex===0){
   if(meta.credits<30)return say('需要 ¢30');
   meta.credits-=30;meta.vehicle.hull=vs.maxHull;meta.pendingVehicle.push(makeVehicle(choice(['belt','loader','turbo','armor','fueltank','emp','capacitor','flak','arc']),2));say('全面检修 + 2级模块');
  }else{
   meta.vehicle.scrap+=4;meta.vehicle.fuel=Math.max(0,meta.vehicle.fuel-2);
   meta.nextSearchEffect={pressure:1.18,extraEnemies:1,label:'高噪回收'};say('废料 +4 • 燃料 -2');
  }
 }else if(id==='wreck'){
  if(choiceIndex===0){
   meta.pendingVehicle.push(makeVehicle(choice(['rocket','armor','fueltank','loader','belt','emp','capacitor','flak','arc']),2));meta.pendingHaul.push(makeItem(choice(['ammo','scope','apammo','vest']),2));
   meta.vehicle.hull=Math.max(1,h-3);meta.nextSearchEffect={pressure:1.25,extraEnemies:2,label:'掠夺者追击'};say('双份战利品 • 车体 -3');
  }else{
   meta.credits+=28;meta.vehicle.fuel=Math.min(vs.maxFuel,meta.vehicle.fuel+1);say('¢ +28 • 燃料 +1');
  }
 }
 meta.pendingRoadEvent=null;eventData=null;save();startScavenge();
}
function enterTown(){state='town';townPanel=null;townWorld={player:{x:270,y:790,r:14,bodyDir:'upRight',pendingDir:null,dirHold:0,aimAngle:-Math.PI/2,lastAimAngle:-Math.PI/2},near:null};meta.arrived=false;if(meta.town.offerLeg!==meta.roadLeg||meta.town.upgradeOfferLeg!==meta.roadLeg){meta.town.demand=choice(['gas','food','scrap','med']);meta.town.gearOffers=shopOfferTypes(GEAR_REWARD_POOL,meta.backpack,ITEM).map(type=>({type,cost:Math.round(ITEM[type].sell*1.8),sold:false}));meta.town.moduleOffers=shopOfferTypes(VEH_REWARD_POOL,meta.vehiclePack,VEH).map(type=>({type,credits:Math.round(VEH[type].sell*1.7),salvage:2+Math.floor(VEH[type].sell/10),sold:false}));meta.town.offerLeg=meta.roadLeg;meta.town.upgradeOfferLeg=meta.roadLeg}save()}
function townPrice(t){const base={gas:5,food:4,scrap:6,med:9}[t];return Math.round(base*(meta.town.demand===t?1.7:1))}
function say(s){notice=s;noticeT=1.5}
const TOWN_SPOTS=[
 {id:'market',x:28,y:190,w:210,h:145,title:'废料市场',sub:'出售货物',sign:'¢'},
 {id:'fuel',x:302,y:180,w:210,h:150,title:'燃料站',sub:'补充燃料',sign:'油'},
 {id:'garage',x:22,y:395,w:225,h:155,title:'修车厂',sub:'维修 / 模块',sign:'修'},
 {id:'armory',x:305,y:390,w:215,h:155,title:'军械库',sub:'装备 / 背包',sign:'械'},
 {id:'routes',x:36,y:610,w:170,h:105,title:'路线牌',sub:'道路风格',sign:'路'},
 {id:'gate',x:390,y:620,w:120,h:105,title:'东门',sub:'离开城镇',sign:'→'}
];
function townSpotDistance(a,p){const cx=clamp(p.x,a.x,a.x+a.w),cy=clamp(p.y,a.y,a.y+a.h);return Math.hypot(p.x-cx,p.y-cy)}
function townNearest(){if(!townWorld)return null;let best=null,bd=999;for(const a of TOWN_SPOTS){const d=townSpotDistance(a,townWorld.player);if(d<bd){bd=d;best=a}}return bd<58?best:null}
function updateTown(dt){
 if(!townWorld||townPanel)return;const p=townWorld.player;let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+(joy.dx||0),dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+(joy.dy||0),m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}
 const speed=175,nx=clamp(p.x+dx*speed*dt,18,522),ny=clamp(p.y+dy*speed*dt,135,835);
 const blocked=(x,y)=>TOWN_SPOTS.some(a=>a.id!=='routes'&&a.id!=='gate'&&x>a.x-14&&x<a.x+a.w+14&&y>a.y-14&&y<a.y+a.h+14);
 if(!blocked(nx,p.y))p.x=nx;if(!blocked(p.x,ny))p.y=ny;townWorld.near=townNearest();
 updateScavFacing(p,dx,dy,dt,null);
}
function townInteract(){if(townPanel||!townWorld)return;const a=townNearest();if(!a)return say('再靠近一点');if(a.id==='gate'){completeDestination();state='route';townWorld=null}else townPanel=a.id}
function townTap(p){
 if(townPanel){townPanelTap(p);return}
 if(p.x>=430&&p.y>=105&&p.y<=145){startPack('town',false,[]);return}
 if(p.y>500){joyStart({pointerId:-99},p);return}
 const a=townNearest();if(a&&p.y>115&&p.y<500)townInteract();
}
function townCards(){return TOWN_SPOTS}
function townPanelTap(p){
 if(p.y<165&&p.x>450){townPanel=null;return}
 if(townPanel==='market'){
  const ts=['gas','food','scrap','med'];for(let i=0;i<4;i++){const y=218+i*95;if(p.y>=y&&p.y<=y+74&&p.x>=305){const t=ts[i];if(meta.cargo[t]<=0)return say('没有可出售的货物');const all=p.x>=400,n=all?meta.cargo[t]:1;meta.cargo[t]-=n;meta.credits+=townPrice(t)*n;say(`已出售 ${n} 份${CARGO_NAME[t]}`);save();return}}
 }
 if(townPanel==='fuel'){
  const cap=vehicleStats().maxFuel;if(p.y>360&&p.y<432){if(meta.cargo.gas>0&&meta.vehicle.fuel<cap){meta.cargo.gas--;meta.vehicle.fuel=Math.min(cap,meta.vehicle.fuel+3);say('燃料 +3')}else say('没有油罐 / 油箱已满')}if(p.y>460&&p.y<532){if(meta.credits>=5&&meta.vehicle.fuel<cap){meta.credits-=5;meta.vehicle.fuel++;say('燃料 +1')}else say('无法购买')}if(p.y>560&&p.y<632){if(meta.credits>=22&&meta.vehicle.fuel<cap){meta.credits-=22;meta.vehicle.fuel=Math.min(cap,meta.vehicle.fuel+5);say('燃料 +5')}else say('无法购买')}save();return
 }
 if(townPanel==='garage'){
  const vs=vehicleStats(),h=Math.min(meta.vehicle.hull??vs.maxHull,vs.maxHull);if(p.y>=270&&p.y<=332){if(h<vs.maxHull&&meta.credits>=6){meta.credits-=6;meta.vehicle.hull=h+1;say('车体 +1')}else say('无需维修')}if(p.y>=345&&p.y<=407){const miss=vs.maxHull-h,cost=miss*6;if(miss&&meta.credits>=cost){meta.credits-=cost;meta.vehicle.hull=vs.maxHull;say('车体已完全修复')}else say('无法维修')}if(p.y>=420&&p.y<=482){if(meta.vehicleGrid.tier<3){const co=meta.vehicleGrid.tier===1?[40,4]:[70,7];if(meta.credits>=co[0]&&meta.vehicle.scrap>=co[1]){meta.credits-=co[0];meta.vehicle.scrap-=co[1];meta.vehicleGrid.tier++;if(meta.vehicleGrid.tier===2)meta.vehicleGrid.cols=7;else meta.vehicleGrid.rows=5;say('载具舱已扩建')}else say('资源不足')}}if(p.y>=495&&p.y<=557){startVehicleBay('town');return}for(let i=0;i<3;i++){const y=595+i*75;if(p.y>=y&&p.y<=y+62){const o=meta.town.moduleOffers[i];if(o&&!o.sold&&meta.credits>=o.credits&&meta.vehicle.scrap>=o.salvage){meta.credits-=o.credits;meta.vehicle.scrap-=o.salvage;o.sold=true;meta.pendingVehicle.push(makeVehicle(o.type));say('已购买模块')}else say('无法购买');save();return}}save();return
 }
 if(townPanel==='armory'){
  if(p.y>205&&p.y<270){if(meta.pack.tier<3){const cost=meta.pack.tier===1?35:60;if(meta.credits>=cost){meta.credits-=cost;meta.pack.tier++;if(meta.pack.tier===2)meta.pack.cols=7;else meta.pack.rows=6;say('背包已扩容')}else say('信用点不足')}}if(p.y>300&&p.y<365){startPack('town',false,[]);return}for(let i=0;i<3;i++){const y=435+i*90;if(p.y>=y&&p.y<=y+72){const o=meta.town.gearOffers[i];if(o&&!o.sold&&meta.credits>=o.cost){meta.credits-=o.cost;o.sold=true;meta.pendingHaul.push(makeItem(o.type));say('已购买装备')}else say('无法购买');save();return}}save();return
 }
 if(townPanel==='routes'){for(let i=0;i<3;i++){const y=255+i*150;if(p.y>=y&&p.y<=y+116){meta.route={...ROUTES[i]};say(`已选择${meta.route.name}`);save();return}}}
}

function update(dt){
 noticeT=Math.max(0,noticeT-dt);
 if(state==='routeleave'&&routeDepart){routeDepart.t+=dt;if(routeDepart.t>=routeDepart.duration){routeDepart=null;state='roadcombat'}}
 else if(state==='roadresult')roadResultReveal=Math.min(1,roadResultReveal+dt*2.4);
 else if(state==='roadcombat')updateRoad(dt);
 else if(state==='play'||state==='finalassault')updateScavenge(dt);
 else if(state==='town')updateTown(dt)
}

function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function joyStart(e,p){joy.active=true;joy.id=e.pointerId;joy.ox=p.x;joy.oy=p.y;joy.x=p.x;joy.y=p.y;joy.dx=joy.dy=0;canvas.setPointerCapture?.(e.pointerId)}
function joyMove(p){if(!joy.active)return;let dx=p.x-joy.ox,dy=p.y-joy.oy;const m=Math.hypot(dx,dy),max=62;if(m>max){dx=dx/m*max;dy=dy/m*max}joy.x=joy.ox+dx;joy.y=joy.oy+dy;joy.dx=dx/max;joy.dy=dy/max}
function joyEnd(){joy.active=false;joy.dx=joy.dy=0}

addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(state==='menu'&&(k==='enter'||k===' ')){state='route';ensureChoices()}else if(state==='route'&&(k==='enter'||k===' ')){if(!meta.selectedNode)selectNode(0);startRoad()}else if(state==='roadresult'&&(k==='enter'||k===' ')){if(meta.selectedNode?.type==='town')enterTown();else if(meta.selectedNode?.type==='boss'){completeDestination();state='route'}else if(meta.selectedNode?.type==='final')startFinalBreach();else if(meta.pendingRoadEvent)enterEvent();else startScavenge()}else if(state==='runsummary'&&(k==='enter'||k===' ')){state='garage'}else if(state==='garage'&&(k==='enter'||k===' ')){startNewRun()}else if((state==='roadfail'||state==='dead')&&(k==='enter'||k===' ')){finishRun(false)}else if(state==='route'&&(k==='b'||k==='i'))startPack('route',false,[]) ;else if(state==='route'&&k==='v')startVehicleBay('route')});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointerdown',e=>{
 const p=canvasPoint(e);
 if(state==='roadcombat'||state==='play'||state==='finalassault'){if(p.y>500)joyStart(e,p);return}
 if(state==='town'&&!townPanel){if(p.x>=430&&p.y>=105&&p.y<=145){startPack('town',false,[]);return}const near=townNearest();if(near&&p.x>=315&&p.x<=510&&p.y>=850&&p.y<=920){townInteract();return}if(p.y>500)joyStart(e,p);return}
 if(state==='menu'){state='route';ensureChoices();return}
 if(state==='route'){routeTap(p);return}
 if(state==='roadresult'){
  if(p.x>=75&&p.x<=465&&p.y>=728&&p.y<=798){startVehicleBay('roadresult');return}
  if(p.x<75||p.x>465||p.y<805||p.y>884)return;
  if(meta.selectedNode?.type==='town')enterTown();else if(meta.selectedNode?.type==='boss'){completeDestination();state='route'}else if(meta.selectedNode?.type==='final')startFinalBreach();else if(meta.pendingRoadEvent)enterEvent();else startScavenge();return
 }
 if(state==='event'){if(p.y>=430&&p.y<=555)resolveEvent(0);else if(p.y>=605&&p.y<=730)resolveEvent(1);return}
 if(state==='runsummary'){state='garage';return}
 if(state==='garage'){garageTap(p);return}
 if(state==='roadfail'||state==='dead'){finishRun(false);return}
 if(state==='pack'){packDown(p);return}
 if(state==='vehicle'){vehicleDown(p);return}
 if(state==='town'){townTap(p);return}
});
canvas.addEventListener('pointermove',e=>{const p=canvasPoint(e);if(joy.active&&(e.pointerId===joy.id||joy.id===-99))joyMove(p);if(packDrag){packDrag.x=p.x;packDrag.y=p.y}if(vehicleDrag){vehicleDrag.x=p.x;vehicleDrag.y=p.y}});
canvas.addEventListener('pointerup',e=>{const p=canvasPoint(e);if(joy.active&&e.pointerId===joy.id)joyEnd();if(state==='pack')packUp(p);if(state==='vehicle')vehicleUp(p)});
canvas.addEventListener('pointercancel',joyEnd);

function routeTap(p){
 if(restartConfirm){
  if(p.y>=565&&p.y<=630&&p.x>=65&&p.x<=255){restartConfirm=false;return}
  if(p.y>=565&&p.y<=630&&p.x>=285&&p.x<=475){resetSave();return}
  return;
 }
 ensureChoices();
 if(p.y<105&&p.x>=205&&p.x<=335){restartConfirm=true;return}
 const pos=routeNodePositions();for(let i=0;i<pos.length;i++){const a=pos[i];if(Math.hypot(p.x-a.x,p.y-a.y)<60){selectNode(i);return}}if(p.y>835&&p.x>55&&p.x<485){if(!meta.selectedNode)selectNode(0);startRoad();return}if(p.y<105&&p.x<165)startPack('route',false,[]);else if(p.y<105&&p.x>375)startVehicleBay('route')}
function routeNodePositions(){const n=meta.mapChoices.length;return n===1?[{x:270,y:355}]:n===3?[{x:105,y:430},{x:270,y:325},{x:435,y:430}]:[{x:175,y:380},{x:365,y:380}]}

function roundRect(x,y,w,h,r,fill=true,stroke=false){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill)ctx.fill();if(stroke)ctx.stroke()}
const FONT_STACK='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif';
function text(s,x,y,size=14,color=C.cream,align='left',weight=700){ctx.font=`${weight} ${size}px ${FONT_STACK}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);ctx.textAlign='left'}
const UI={caption:12,body:14,label:16,button:16,heading:28};
function fitText(s,x,y,maxWidth,size=14,minSize=11,color=C.cream,align='left',weight=700){
 let value=String(s),px=size;ctx.font=`${weight} ${px}px ${FONT_STACK}`;
 while(px>minSize&&ctx.measureText(value).width>maxWidth){px--;ctx.font=`${weight} ${px}px ${FONT_STACK}`}
 if(ctx.measureText(value).width>maxWidth){let clipped=value;while(clipped.length>1&&ctx.measureText(`${clipped}…`).width>maxWidth)clipped=clipped.slice(0,-1);value=`${clipped}…`}
 text(value,x,y,px,color,align,weight);return px
}
function wrap(s,x,y,w,line=20,size=UI.caption,color=C.muted,maxLines=99,weight=600){
 ctx.font=`${weight} ${size}px ${FONT_STACK}`;ctx.fillStyle=color;const value=String(s),cjk=/[\u3400-\u9fff]/.test(value),words=cjk?Array.from(value):value.split(' '),gap=cjk?'':' ',lines=[];let lineS='';
 for(const word of words){const test=lineS+word+gap;if(lineS&&ctx.measureText(test).width>w){lines.push(lineS.trimEnd());lineS=word+gap}else lineS=test}if(lineS)lines.push(lineS.trimEnd());
 const visible=lines.slice(0,maxLines);if(lines.length>maxLines){let last=visible[maxLines-1];while(last.length>1&&ctx.measureText(`${last}…`).width>w)last=last.slice(0,-1);visible[maxLines-1]=`${last}…`}
 visible.forEach((value,i)=>ctx.fillText(value,x,y+i*line));return visible.length
}
function bar(x,y,w,h,v,color,bg='#3a3d31'){ctx.fillStyle=bg;roundRect(x,y,w,h,h/2,true,false);ctx.fillStyle=color;roundRect(x,y,w*clamp(v,0,1),h,h/2,true,false)}
function title(s,sub){text(s,28,56,UI.heading,C.cream,'left',900);if(sub)fitText(sub,29,82,360,UI.caption,11,C.muted,'left',700)}
function btn(x,y,w,h,label,enabled=true){ctx.fillStyle=enabled?C.yellow:'#3a3d31';roundRect(x,y,w,h,12,true,false);fitText(label,x+w/2,y+h/2+6,w-24,UI.button,13,enabled?'#171912':'#777a6b','center',900)}
function uiPill(x,y,w,label,color=C.teal,textColor=C.cream){ctx.fillStyle=color;roundRect(x,y,w,24,7,true,false);fitText(label,x+w/2,y+17,w-12,11,10,textColor,'center',900)}
function drawDunes(){
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#342c20');sky.addColorStop(.48,'#5b4b35');sky.addColorStop(1,'#211e17');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='rgba(226,177,94,.10)';ctx.beginPath();ctx.arc(425,125,92,0,6.28);ctx.fill();
 ctx.fillStyle='#463c2c';ctx.beginPath();ctx.moveTo(0,330);ctx.lineTo(78,268);ctx.lineTo(142,304);ctx.lineTo(218,236);ctx.lineTo(304,300);ctx.lineTo(382,252);ctx.lineTo(540,322);ctx.lineTo(540,470);ctx.lineTo(0,470);ctx.fill();
 ctx.fillStyle='#342f25';ctx.beginPath();ctx.moveTo(0,410);ctx.quadraticCurveTo(125,345,260,408);ctx.quadraticCurveTo(410,478,540,385);ctx.lineTo(540,H);ctx.lineTo(0,H);ctx.fill();
 ctx.strokeStyle='rgba(226,190,119,.12)';ctx.lineWidth=2;for(let i=0;i<8;i++){const y=470+i*70;ctx.beginPath();ctx.moveTo(0,y);ctx.quadraticCurveTo(150,y-28,300,y+8);ctx.quadraticCurveTo(430,y+34,540,y-4);ctx.stroke()}
 ctx.fillStyle='rgba(16,15,11,.16)';for(let x=18;x<W;x+=83){ctx.fillRect(x,545+(x%5)*43,2,18+(x%4)*8)}
 ctx.fillStyle='rgba(17,16,12,.34)';ctx.fillRect(28,385,5,92);ctx.fillRect(505,360,4,118);
 ctx.strokeStyle='rgba(222,179,94,.18)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(30,407);ctx.lineTo(105,392);ctx.lineTo(180,407);ctx.stroke();
 ctx.fillStyle='rgba(188,92,50,.14)';ctx.fillRect(390,332,58,7);ctx.fillRect(400,339,4,40);
}
function drawArtStatus(){
 if(!location.pathname.includes('/preview/'))return;
 const keys=['playerJunker','playerBodyUpLeft','playerBodyUpRight','playerBodyDownLeft','playerBodyDownRight','playerWeaponRifle','enemyBike','enemyBuggy','enemyTruck','enemyWartruck','enemyMissileVan','enemyColossus','routeWasteland','townRustwater','siteGasStation','siteClinic','siteMotel','siteJunkyard','propGasCover','propGasPump','propClinicCover','propMotelCover','propJunkyardCover','propJunkyardTireStack','enemyGunner','enemyMelee','enemyGrenadier','enemySniper','enemyArmored','enemyElite','enemyDriver'];
 const ready=keys.every(k=>PROD[k]?.ready),error=keys.some(k=>PROD[k]?.error);
 const label=ready?'美术已就绪':error?'美术加载失败':'美术加载中';
 ctx.fillStyle='rgba(10,10,8,.86)';roundRect(386,8,144,26,7,true,false);
 fitText(label,458,27,126,10,9,ready?C.green:error?C.red:C.yellow,'center',900)
}
function drawNotice(){if(noticeT<=0)return;ctx.fillStyle='rgba(13,22,21,.96)';roundRect(75,858,390,50,12,true,false);fitText(notice,270,889,350,UI.body,12,C.cream,'center',900)}
function drawJoy(){if(!joy.active)return;ctx.save();ctx.globalAlpha=.72;ctx.fillStyle='#151812';ctx.strokeStyle='rgba(239,232,207,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.ox,joy.oy,66,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=C.yellow;ctx.beginPath();ctx.arc(joy.x,joy.y,26,0,Math.PI*2);ctx.fill();ctx.restore()}

function drawMenu(){drawDunes();ctx.fillStyle='rgba(12,14,11,.25)';ctx.fillRect(0,0,W,H);text('废土',270,270,48,C.cream,'center',900);text('幸存者',270,320,48,C.yellow,'center',900);text('竖屏原型版',270,360,UI.body,C.muted,'center',800);drawVehicle(270,535,1.35,C.yellow);btn(85,720,370,72,'点击开始');text('单手操作 • 构筑 • 公路 • 搜刮',270,825,UI.caption,C.muted,'center',800);text('初始武器升级与城镇 UI • A21',270,856,UI.caption,'#777b6c','center',700)}
function drawProdCover(key,x,y,w,h,alpha=1){
 const a=PROD[key];if(!a?.ready)return false;const iw=a.img.naturalWidth||a.img.width,ih=a.img.naturalHeight||a.img.height;if(!iw||!ih)return false;
 const scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale,sx=(iw-sw)/2,sy=(ih-sh)/2;
 ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(a.img,sx,sy,sw,sh,x-w/2,y-h/2,w,h);ctx.restore();return true
}
const ROUTE_NODE_ART={gas:'siteGasStation',clinic:'siteClinic',motel:'siteMotel',junkyard:'siteJunkyard'};
function routeNodeArt(n){return n?.type==='town'?'townRustwater':n?.type==='boss'||n?.type==='final'?'enemyColossus':ROUTE_NODE_ART[n?.site]||'siteJunkyard'}
function drawRouteBackdrop(){
 ctx.save();ctx.filter='saturate(.38) brightness(.72) contrast(.92)';const ok=drawProd('routeWasteland',270,480,540,960,1);ctx.restore();if(!ok)drawDunes();
 const cool=ctx.createLinearGradient(0,120,0,820);cool.addColorStop(0,'rgba(24,36,39,.34)');cool.addColorStop(.55,'rgba(25,38,39,.25)');cool.addColorStop(1,'rgba(16,24,25,.42)');ctx.fillStyle=cool;ctx.fillRect(0,0,W,H)
}
function routeNodeColor(n){return n?.type==='town'?C.green:n?.type==='boss'||n?.type==='final'?C.red:n?.special?'#ba8a42':n?.danger>=3?'#a95a4a':n?.danger===2?'#9a7a48':'#7d8b89'}
function drawRouteNodeCard(n,p,selected){
 const w=132,h=96,color=routeNodeColor(n),accent=selected?'#79c8c1':color,pulse=selected&&!REDUCED_MOTION?1.5+Math.sin(performance.now()/180)*.7:2;
 ctx.save();roundRect(p.x-w/2,p.y-h/2,w,h,12,false,false);ctx.clip();ctx.fillStyle='#172022';ctx.fillRect(p.x-w/2,p.y-h/2,w,h);
 ctx.save();ctx.filter='saturate(.55) brightness(.76)';if(!drawProdCover(routeNodeArt(n),p.x,p.y-14,w,64,.92)){ctx.fillStyle='#263033';ctx.fillRect(p.x-w/2,p.y-h/2,w,62);text(n.icon,p.x,p.y-8,24,C.cream,'center',900)}ctx.restore();
 ctx.fillStyle='rgba(13,19,20,.97)';ctx.fillRect(p.x-w/2,p.y+10,w,38);ctx.fillStyle='rgba(0,0,0,.24)';ctx.fillRect(p.x-w/2,p.y-4,w,14);ctx.restore();
 ctx.strokeStyle=selected?accent:'rgba(168,184,181,.72)';ctx.lineWidth=selected?4:2;roundRect(p.x-w/2,p.y-h/2,w,h,12,false,true);
 if(selected){ctx.save();ctx.globalAlpha=.48;ctx.strokeStyle=accent;ctx.lineWidth=pulse;roundRect(p.x-w/2-5,p.y-h/2-5,w+10,h+10,15,false,true);ctx.restore()}
 fitText(n.short,p.x,p.y+36,w-18,14,12,selected?accent:C.cream,'center',900);
 const badge=n.type==='town'?'安全区':n.type==='boss'?'首领':n.type==='final'?'最终战':n.special?'稀有':`危险 ${n.danger}`;uiPill(p.x-w/2+7,p.y-h/2+7,58,badge,color,'#f3ead3')
}
function drawRoute(departing=false){
 drawRouteBackdrop();
 const top=ctx.createLinearGradient(0,0,0,160);top.addColorStop(0,'rgba(12,13,10,.92)');top.addColorStop(1,'rgba(12,13,10,.10)');ctx.fillStyle=top;ctx.fillRect(0,0,W,170);
 const bottom=ctx.createLinearGradient(0,675,0,960);bottom.addColorStop(0,'rgba(12,13,10,0)');bottom.addColorStop(.28,'rgba(12,13,10,.78)');bottom.addColorStop(1,'rgba(12,13,10,.98)');ctx.fillStyle=bottom;ctx.fillRect(0,675,W,285);
 title('荒野公路',`第 ${meta.roadLeg} 段  •  选择下一站`);const vs=vehicleStats();
 ctx.fillStyle='rgba(16,23,23,.92)';roundRect(18,94,504,52,12,true,false);text(`背包 ${meta.backpack.length}`,34,126,UI.caption,C.cream);text(`燃料 ${meta.vehicle.fuel}/${vs.maxFuel}`,151,112,UI.caption,C.muted);bar(151,120,118,10,meta.vehicle.fuel/vs.maxFuel,C.yellow);text('车体',304,112,UI.caption,C.muted);bar(304,120,94,10,(meta.vehicle.hull??vs.maxHull)/vs.maxHull,C.green);text(`¢${meta.credits}`,505,128,16,C.yellow,'right',900);
 ensureChoices();const pos=routeNodePositions(),origin={x:270,y:708};
 for(let i=0;i<pos.length;i++){const p=pos[i],n=meta.mapChoices[i],sel=meta.selectedNode?.id===n.id;ctx.save();ctx.strokeStyle=sel?'rgba(111,200,193,.95)':'rgba(32,45,47,.78)';ctx.lineWidth=sel?6:4;ctx.setLineDash(sel?[18,10]:[]);ctx.lineDashOffset=sel&&!REDUCED_MOTION?-(performance.now()/42)%28:0;ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.bezierCurveTo(origin.x,610,p.x,555,p.x,p.y+44);ctx.stroke();ctx.restore()}
 ctx.fillStyle='rgba(28,27,22,.78)';ctx.beginPath();ctx.ellipse(origin.x,origin.y+6,45,24,0,0,6.28);ctx.fill();
 if(!departing)drawVehicle(origin.x,origin.y,.62,C.yellow);
 for(let i=0;i<meta.mapChoices.length;i++)drawRouteNodeCard(meta.mapChoices[i],pos[i],meta.selectedNode?.id===meta.mapChoices[i].id);
 const n=meta.selectedNode;ctx.fillStyle='rgba(20,29,30,.96)';roundRect(30,754,480,74,14,true,false);ctx.strokeStyle=n?'rgba(111,200,193,.58)':'rgba(132,151,148,.30)';roundRect(30,754,480,74,14,false,true);
 if(n){fitText(n.name,48,781,310,18,15,C.cream,'left',900);fitText(n.type==='town'?'安全区 • 交易 / 维修':n.type==='final'?'最终突袭 • 无法回头':n.type==='boss'?`${n.focus} • 必须击杀`:`${n.focus} • 危险 ${n.danger}${n.special?' • 稀有信号':''}`,48,808,335,UI.caption,11,n.type==='boss'||n.type==='final'?C.red:n.special?C.yellow:C.muted,'left',700);text(`燃料 -${fuelCost()}`,480,798,14,meta.vehicle.fuel<fuelCost()?C.red:C.yellow,'right',900)}else text('点击地图上的地点',270,798,UI.label,C.muted,'center',900);
 btn(55,842,430,70,departing?`正在驶向${n?.short||''}`:n?`驶向${n.short}`:'选择目的地',!!n&&!departing);text('背包',65,68,UI.caption,C.muted,'center',900);text('重开',270,68,UI.caption,C.red,'center',900);text('载具',472,68,UI.caption,C.muted,'center',900);
 if(restartConfirm){ctx.fillStyle='rgba(8,9,7,.82)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#20231c';roundRect(45,360,450,310,18,true,false);text('重新开始本轮？',270,420,26,C.red,'center',900);wrap('这会清除当前轮次、背包、载具模块、信用点和路线进度。',90,465,360,22,12,C.muted);btn(65,565,190,65,'取消');ctx.fillStyle=C.red;roundRect(285,565,190,65,12,true,false);text('确认重开',380,603,13,'#171912','center',900)}
}
function drawRouteDeparture(){
 drawRoute(true);if(!routeDepart)return;const q=clamp(routeDepart.t/routeDepart.duration,0,1),e=q*q*(3-2*q),bend=Math.sin(e*Math.PI)*46;
 const x=270+(routeDepart.target.x-270)*e+bend*Math.sign(routeDepart.target.x-270),y=708+(routeDepart.target.y-708)*e;
 drawVehicle(x,y,.62-.10*e,C.yellow);ctx.fillStyle=`rgba(12,13,10,${clamp((q-.72)/.28,0,1)})`;ctx.fillRect(0,0,W,H);if(q>.72)text(`驶向${routeDepart.name}`,270,480,22,C.yellow,'center',900)
}

const COLOSSUS_DAMAGE_LAYERS=new Map();
function punchColossusPart(c,x,y,rx,ry,seed){
 c.save();c.translate(x,y);c.rotate((seed-.5)*.12);c.fillStyle='#000';
 c.beginPath();c.ellipse(0,0,rx,ry,0,0,6.28);c.fill();
 for(let i=0;i<8;i++){
  const a=i*6.28/8+seed*1.7,r=1+(i%3)*.055;
  c.beginPath();c.ellipse(Math.cos(a)*rx*.72*r,Math.sin(a)*ry*.72*r,rx*.28,ry*.24,a,0,6.28);c.fill()
 }
 c.restore()
}
function colossusDamageLayer(){
 const a=PROD.enemyColossus;if(!a?.ready)return null;
 const f=meta.finalFlags||{},key=`${+!!f.armor}${+!!f.mg}${+!!f.rocket}`;
 if(COLOSSUS_DAMAGE_LAYERS.has(key))return COLOSSUS_DAMAGE_LAYERS.get(key);
 const layer=document.createElement('canvas');layer.width=384;layer.height=576;
 const c=layer.getContext('2d');c.drawImage(a.img,0,0,384,576);c.globalCompositeOperation='destination-out';
 if(f.armor)punchColossusPart(c,192,166,68,40,.25);
 if(f.mg)punchColossusPart(c,48,270,42,60,.7);
 if(f.rocket)punchColossusPart(c,336,270,42,60,.35);
 COLOSSUS_DAMAGE_LAYERS.set(key,layer);return layer
}
function drawColossusWreck(x,y,rx,ry,seed){
 ctx.save();ctx.translate(x,y);ctx.rotate((seed-.5)*.1);
 ctx.fillStyle='rgba(17,15,12,.92)';ctx.beginPath();
 for(let i=0;i<12;i++){const a=i*6.28/12,r=i%2?.76:1,px=Math.cos(a)*rx*r,py=Math.sin(a)*ry*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(101,78,57,.96)';ctx.lineWidth=3;
 for(let i=-1;i<=1;i++){const px=i*rx*.28;ctx.beginPath();ctx.moveTo(px-rx*.08,-ry*.72);ctx.lineTo(px+rx*.04,-ry*.08);ctx.lineTo(px-rx*.02,ry*.66);ctx.stroke()}
 ctx.fillStyle='rgba(76,55,42,.95)';ctx.fillRect(-rx*.7,-ry*.12,rx*.32,ry*.22);ctx.fillRect(rx*.34,ry*.2,rx*.3,ry*.18);
 ctx.fillStyle='rgba(211,92,43,.68)';for(let i=0;i<3;i++){const a=seed*8+i*2.3;ctx.beginPath();ctx.arc(Math.cos(a)*rx*.46,Math.sin(a)*ry*.4,2+i%2,0,6.28);ctx.fill()}
 ctx.restore()
}
function drawColossusSmoke(x,y,rx,seed){
 const t=performance.now()*.00032+seed*4;ctx.save();
 for(let i=0;i<3;i++){const phase=t+i*.72,fade=.18-i*.035;ctx.fillStyle=`rgba(22,20,17,${fade})`;ctx.beginPath();ctx.ellipse(x+Math.sin(phase*2.1)*rx*.26,y-16-i*13-(phase%1)*7,rx*(.34+i*.08),9+i*3,0,0,6.28);ctx.fill()}
 ctx.restore()
}
function drawColossus(g){
 const x=270,y=g.colossusY+20;
 ctx.fillStyle='rgba(12,11,9,.42)';ctx.beginPath();ctx.ellipse(x,g.colossusY+195,101,8,0,0,6.28);ctx.fill();
 if(meta.finalFlags.armor)drawColossusWreck(270,g.colossusY-58,44,27,.25);
 const layer=colossusDamageLayer();
 if(layer)ctx.drawImage(layer,x-125,y-187.5,250,375);
 else{
  ctx.fillStyle='#302923';roundRect(128,g.colossusY-95,284,255,24,true,false);ctx.fillStyle='#46372f';roundRect(155,g.colossusY-72,230,210,18,true,false)
 }
 if(meta.finalFlags.armor)drawColossusSmoke(270,g.colossusY-58,42,.25);
 if(meta.finalFlags.mg)drawColossusSmoke(175,g.colossusY+8,28,.7);
 if(meta.finalFlags.rocket)drawColossusSmoke(365,g.colossusY+8,28,.35)
}
function drawRoad(){const g=roadGame,p=g.player;
 ctx.fillStyle='#806747';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#4e4434';ctx.fillRect(0,0,18,H);ctx.fillRect(522,0,18,H);
 ctx.fillStyle=C.asphalt;ctx.fillRect(18,0,504,H);
 ctx.fillStyle='rgba(205,176,112,.09)';for(let y=-80+(g.scroll%140);y<H;y+=140){ctx.fillRect(42,y,70,3);ctx.fillRect(418,y+55,62,3)}
 ctx.strokeStyle='rgba(13,14,11,.35)';ctx.lineWidth=3;for(let y=-120+(g.scroll%190);y<H;y+=190){ctx.beginPath();ctx.moveTo(115,y);ctx.lineTo(145,y+38);ctx.lineTo(128,y+68);ctx.stroke();ctx.beginPath();ctx.moveTo(400,y+70);ctx.lineTo(375,y+108);ctx.stroke()}
 ctx.fillStyle='#b9a56b';ctx.fillRect(18,0,5,H);ctx.fillRect(517,0,5,H);
 ctx.save();ctx.globalAlpha=.35;for(let y=-100+(g.scroll%170);y<H;y+=170){ctx.fillStyle='#9a7448';ctx.fillRect(2,y,14,48);ctx.fillRect(524,y+82,14,38);ctx.fillStyle='#2b2922';ctx.fillRect(5,y-10,5,18);ctx.fillRect(530,y+68,5,18)}ctx.restore();
 ctx.strokeStyle='rgba(222,195,137,.13)';ctx.lineWidth=2;for(let y=-60+(g.scroll%115);y<H;y+=115){ctx.beginPath();ctx.moveTo(30,y);ctx.lineTo(78,y+30);ctx.stroke();ctx.beginPath();ctx.moveTo(510,y+45);ctx.lineTo(468,y+72);ctx.stroke()}
 ctx.save();ctx.strokeStyle='#b8aa72';ctx.lineWidth=5;ctx.setLineDash([35,38]);ctx.lineDashOffset=g.scroll%73;ctx.beginPath();ctx.moveTo(270,0);ctx.lineTo(270,H);ctx.stroke();ctx.restore();for(const br of g.barriers){
 ctx.fillStyle='#6b553e';ctx.fillRect(18,br.y,Math.max(0,br.gapX-br.gapW/2-18),br.h);
 ctx.fillRect(br.gapX+br.gapW/2,br.y,Math.max(0,522-(br.gapX+br.gapW/2)),br.h);
 ctx.fillStyle=C.yellow;for(let x=28;x<512;x+=42){if(x>br.gapX-br.gapW/2-18&&x<br.gapX+br.gapW/2)continue;ctx.fillRect(x,br.y+5,22,5)}
}
for(const st of g.strikes){
 ctx.save();ctx.globalAlpha=.18+.28*(1-clamp(st.t/1.35,0,1));ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,6.28);ctx.fill();
 ctx.globalAlpha=1;ctx.strokeStyle=C.red;ctx.lineWidth=3;ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,6.28);ctx.stroke();text('!',st.x,st.y+7,18,C.red,'center',900);ctx.restore();
}
for(const m of g.mines)drawMine(m);for(const d of g.drops){
 ctx.fillStyle=d.type==='fuel'?C.gas:d.type==='repair'?C.green:C.scrap;
 ctx.beginPath();ctx.arc(d.x,d.y,12,0,6.28);ctx.fill();
 text(d.type==='fuel'?'油':d.type==='repair'?'+':'废',d.x,d.y+4,10,'#171912','center',900)
}drawRoadAtmosphere(g);if(g.finalRoute&&g.bossSpawned&&!g.bossDefeated)drawColossus(g);
 for(const e of g.enemies)drawEnemyVehicle(e);
 for(const st of g.strikes)drawRoadStrikeMissile(st);
 for(const b of g.bullets)drawRoadProjectile(b);
 for(const b of g.enemyBullets)drawEnemyRoadProjectile(b);
 for(const f of g.fx)drawRoadFX(f);
 drawVehicle(p.x,p.y,1,p.inv>0&&Math.floor(performance.now()/80)%2?'#fff':C.yellow);ctx.fillStyle='rgba(18,24,22,.94)';roundRect(18,20,504,108,14,true,false);text(`${Math.ceil(g.time)}秒`,36,60,28,g.time<10?C.red:C.cream,'left',900);fitText(destinationName(),36,88,260,13,12,C.muted,'left',800);fitText(`燃料 -${g.cost}${g.dry?' · 燃料不足':''}`,500,58,220,13,11,g.dry?C.red:C.yellow,'right',900);bar(36,100,210,11,p.hp/p.max,p.hp/p.max>.4?C.green:C.red);text(`车体 ${p.hp}/${p.max}`,255,110,UI.caption,C.cream);bar(305,100,195,11,g.elapsed/g.duration,C.yellow);text(`威胁 ${Math.round(g.threat*100)}%`,500,111,11,g.threat>1.05?C.red:C.muted,'right',900);if(g.finalRoute&&g.bossSpawned&&!g.bossDefeated){
 text('巨像',270,150,17,C.red,'center',900);
 const lock=roadTarget(g,p,660);if(lock?.group==='colossus')fitText(`锁定：${lock.part==='engine'?'核心':lock.part==='armor'?'装甲':lock.part==='rocket'?'火箭巢':'机枪'} · 左机枪 / 中装甲 / 右火箭`,270,172,470,11,10,C.yellow,'center',800);
}else if(g.bossRoute&&g.bossSpawned&&!g.bossDefeated)text('钢铁豺狼',270,150,16,C.red,'center',900);else if(g.boss&&g.enemies.some(e=>e.type==='wartruck'))text('战争卡车',270,150,15,C.red,'center',900);drawJoy()}
function drawVehicle(x,y,s=1,color=C.yellow,production=true){
 if(production&&drawProd('playerJunker',x,y,116*s,118*s,color==='#fff'?.45:1))return;
 if(drawArt('junker',x,y,122*s,145*s,color==='#fff'?.45:1))return;
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,39,38,13,0,0,6.28);ctx.fill();
 ctx.fillStyle='#141410';roundRect(-34,-43,68,86,7,true,false);
 ctx.fillStyle='#39382f';roundRect(-28,-39,56,78,5,true,false);
 ctx.fillStyle=color;ctx.globalAlpha=.72;roundRect(-23,-32,46,62,4,true,false);ctx.globalAlpha=1;
 ctx.fillStyle='#262820';roundRect(-17,-18,34,27,3,true,false);
 ctx.fillStyle='#12130f';ctx.fillRect(-13,-14,26,15);
 ctx.fillStyle='#8f754d';ctx.fillRect(-4,-60,8,40);ctx.fillStyle='#d0aa50';ctx.fillRect(-7,-61,14,7);
 ctx.fillStyle='#11120f';ctx.fillRect(-38,-30,11,23);ctx.fillRect(27,-30,11,23);ctx.fillRect(-38,12,11,23);ctx.fillRect(27,12,11,23);
 ctx.fillStyle='#6c5639';ctx.fillRect(-31,-3,8,22);ctx.fillRect(23,-3,8,22);
 ctx.strokeStyle='#171813';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-22,18);ctx.lineTo(22,18);ctx.stroke();
 ctx.fillStyle='#b34e31';ctx.fillRect(-20,30,9,5);ctx.fillRect(11,30,9,5);
 ctx.fillStyle='#c5a45a';ctx.fillRect(-24,-35,7,5);ctx.fillRect(17,-35,7,5);
 ctx.strokeStyle='rgba(242,228,196,.28)';ctx.lineWidth=1;roundRect(-23,-32,46,62,4,false,true);ctx.restore()
}
function drawDisabledField(e){
 const r=Math.max(e.w,e.h)*.44,phase=performance.now()*.006;ctx.save();ctx.globalAlpha=.72+.20*Math.sin(phase*3);ctx.strokeStyle='#66dce6';ctx.lineWidth=3;ctx.setLineDash([8,7]);ctx.lineDashOffset=-phase*14;ctx.beginPath();ctx.arc(e.x,e.y,r,0,6.28);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#d5fbff';ctx.lineWidth=2;
 for(let i=0;i<4;i++){const a=phase+i*1.57,a2=a+.30;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*r*.55,e.y+Math.sin(a)*r*.55);ctx.lineTo(e.x+Math.cos(a2)*r*.82,e.y+Math.sin(a2)*r*.82);ctx.lineTo(e.x+Math.cos(a+.12)*r,e.y+Math.sin(a+.12)*r);ctx.stroke()}
 ctx.restore()
}
function drawEnemyVehicle(e){
 if(e.group==='colossus'){
  text(e.part==='mg'?'机':e.part==='rocket'?'箭':e.part==='armor'?'甲':'核',e.x,e.y+5,10,C.yellow,'center',900);
  if((e.disabled||0)>0)drawDisabledField(e);
  bar(e.x-e.w*.45,e.y-e.h*.62,e.w*.9,8,e.hp/e.maxHp,C.yellow);return
 }
 const boss=e.type==='dreadnought',sc=e.group==='colossus'?1.05:boss?1.55:e.type==='wartruck'?1.2:e.type==='bike'?.72:.92;
 const key=e.type==='bike'?'bike':e.type==='missilevan'?'missilevan':e.type==='wartruck'||boss?'wartruck':e.type==='truck'?'truck':null;
 let art=false;
 if(e.type==='bike')art=drawProd('enemyBike',e.x,e.y,78*sc,81*sc,1);
 else if(e.type==='buggy')art=drawProd('enemyBuggy',e.x,e.y,66,76,1);
 else if(e.type==='truck')art=drawProd('enemyTruck',e.x,e.y,106*sc,104*sc,1);
 else if(e.type==='missilevan')art=drawProd('enemyMissileVan',e.x,e.y,96,96,1);
 else if(e.type==='wartruck'||boss)art=drawProd('enemyWartruck',e.x,e.y,boss?178:130,boss?174:128,1);
 if(!art&&key)art=drawArt(key,e.x,e.y,key==='bike'?80*sc:key==='wartruck'?126*sc:112*sc,key==='bike'?128*sc:138*sc,1);
 if(!art){
  const col=boss?'#4e3d36':e.type==='missilevan'?'#67536a':e.group==='colossus'?'#57433a':e.type==='wartruck'?'#6d594c':e.type==='truck'?'#75624c':e.type==='bike'?'#9a7049':'#806448';
  drawVehicle(e.x,e.y,sc,col,false)
 }
 if(e.type==='missilevan'&&!PROD.enemyMissileVan.ready)text('导弹',e.x,e.y+7,9,C.yellow,'center',900);
 if((e.disabled||0)>0)drawDisabledField(e);
 if(e.maxHp>4)bar(e.x-e.w*.45,e.y-e.h*.62,e.w*.9,boss||e.group==='colossus'?8:5,e.hp/e.maxHp,e.group==='colossus'?C.yellow:C.red)
}
function drawRoadAtmosphere(g){
 for(const q of g.dust||[]){const a=clamp(q.life/.72,0,1)*q.alpha;ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#c7ab77';ctx.beginPath();ctx.ellipse(q.x,q.y,q.r*1.45,q.r*.72,0,0,6.28);ctx.fill();ctx.globalAlpha=a*.55;ctx.fillStyle='#e0c998';ctx.beginPath();ctx.ellipse(q.x-4,q.y-2,q.r*.75,q.r*.36,0,0,6.28);ctx.fill();ctx.restore()}
 for(const q of g.debris||[]){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.globalAlpha=clamp(q.life/.8,0,1);ctx.fillStyle=q.color;ctx.fillRect(-q.w/2,-q.h/2,q.w,q.h);ctx.restore()}
}
function drawMissileGlyph(x,y,vx,vy,hostile=false,scale=1){
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(vy,vx)+Math.PI/2);ctx.scale(scale,scale);
 ctx.lineCap='round';ctx.strokeStyle=hostile?'rgba(196,75,48,.42)':'rgba(225,177,81,.42)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(0,26);ctx.stroke();
 ctx.fillStyle='#f2bd67';ctx.beginPath();ctx.moveTo(0,17);ctx.lineTo(-3,8);ctx.lineTo(3,8);ctx.closePath();ctx.fill();
 ctx.fillStyle='#171b18';ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(4,-7);ctx.lineTo(4,6);ctx.lineTo(8,10);ctx.lineTo(3,9);ctx.lineTo(-3,9);ctx.lineTo(-8,10);ctx.lineTo(-4,6);ctx.lineTo(-4,-7);ctx.closePath();ctx.fill();
 ctx.fillStyle=hostile?'#bd6243':'#c5ad75';ctx.fillRect(-3,-7,6,13);ctx.fillStyle='#f5e2ab';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(3,-7);ctx.lineTo(-3,-7);ctx.closePath();ctx.fill();ctx.restore();
}
function drawRoadProjectile(b){
 if(b.kind==='rocket'){drawMissileGlyph(b.x,b.y,b.vx,b.vy);return}
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);ctx.lineCap='round';
 if(b.kind==='cannon'){
  ctx.strokeStyle='rgba(225,145,55,.4)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(0,24);ctx.stroke();
  ctx.fillStyle='#171a16';ctx.fillRect(-5,-9,10,18);ctx.fillStyle='#c9a35b';ctx.fillRect(-3,-7,6,12);ctx.fillStyle='#fff0b8';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(4,-7);ctx.lineTo(-4,-7);ctx.closePath();ctx.fill();
 }else{
  const flak=b.kind==='flak';ctx.strokeStyle=flak?'rgba(237,207,126,.45)':'rgba(242,220,159,.48)';ctx.lineWidth=flak?3:4;ctx.beginPath();ctx.moveTo(0,4);ctx.lineTo(0,flak?14:18);ctx.stroke();
  ctx.fillStyle=flak?'#efc96b':'#fff1c0';ctx.beginPath();ctx.ellipse(0,-2,flak?2:2.5,flak?5:7,0,0,6.28);ctx.fill();
 }
 ctx.restore();
}
function drawEnemyRoadProjectile(b){
 if(b.heavy){drawMissileGlyph(b.x,b.y,b.vx,b.vy,true,.8);return}
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);ctx.lineCap='round';ctx.strokeStyle='rgba(190,60,43,.48)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,4);ctx.lineTo(0,18);ctx.stroke();ctx.fillStyle='#ef8b59';ctx.beginPath();ctx.ellipse(0,-2,3,7,0,0,6.28);ctx.fill();ctx.fillStyle='#ffe2aa';ctx.fillRect(-1,-7,2,5);ctx.restore();
}
function drawRoadStrikeMissile(st){
 if(st.sx==null||st.sy==null)return;
 const progress=clamp(1-st.t/(st.totalT||1.15),0,1),arc=70;
 const x=st.sx+(st.x-st.sx)*progress,y=st.sy+(st.y-st.sy)*progress-Math.sin(Math.PI*progress)*arc;
 const vx=st.x-st.sx,vy=st.y-st.sy-Math.cos(Math.PI*progress)*Math.PI*arc;
 drawMissileGlyph(x,y,vx,vy,true,.92);
}
function drawLightningSegment(a,b,color,alpha,seed=0){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,steps=Math.max(5,Math.ceil(len/34)),phase=performance.now()*.035+seed;
 const trace=()=>{ctx.beginPath();ctx.moveTo(a.x,a.y);for(let i=1;i<steps;i++){const q=i/steps,wobble=Math.sin(phase+i*2.37+seed)*7+Math.sin(phase*.63+i*4.1)*3;ctx.lineTo(a.x+dx*q+nx*wobble,a.y+dy*q+ny*wobble)}ctx.lineTo(b.x,b.y)};
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=alpha*.32;ctx.strokeStyle=color;ctx.lineWidth=10;trace();ctx.stroke();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=3.2;trace();ctx.stroke();ctx.globalAlpha=alpha*.92;ctx.strokeStyle='#e9feff';ctx.lineWidth=1.2;trace();ctx.stroke();ctx.restore()
}
function drawRoadFX(f){
 if(f.kind==='electricArc'||f.kind==='empLink'){
  const total=f.total||.3,t=clamp(f.life/total,0,1),alpha=Math.sin(Math.PI*Math.min(1,(1-t)*1.8))*.45+t*.75;
  if(f.kind==='electricArc'){for(let i=1;i<f.points.length;i++)drawLightningSegment(f.points[i-1],f.points[i],f.color,alpha,(f.seed||0)+i*2.1)}
  else for(let i=0;i<f.targets.length;i++)drawLightningSegment(f.source,f.targets[i],f.color,alpha,(f.seed||0)+i*1.7);
  return
 }
 if(f.kind==='empWave'){
  const total=f.total||.6,progress=1-clamp(f.life/total,0,1),r=f.r*(.12+.88*progress),fade=1-progress;ctx.save();ctx.translate(f.x,f.y);const glow=ctx.createRadialGradient(0,0,0,0,0,r);glow.addColorStop(0,`rgba(210,252,255,${.20*fade})`);glow.addColorStop(.55,`rgba(80,205,220,${.10*fade})`);glow.addColorStop(1,'rgba(40,130,150,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r,0,6.28);ctx.fill();for(let q=0;q<3;q++){const rr=Math.max(4,r-q*24);ctx.globalAlpha=fade*(1-q*.22);ctx.strokeStyle=q===0?'#d9fcff':'#58d1dc';ctx.lineWidth=q===0?3:2;ctx.beginPath();ctx.ellipse(0,0,rr,rr*.46,0,0,6.28);ctx.stroke()}ctx.restore();return
 }
 const duration=f.kind==='explosion'?.46:f.kind==='missileImpact'?.32:f.kind==='rocketImpact'?.25:f.kind==='impact'?.18:f.kind==='muzzle'?(f.r>=18?.16:.1):f.kind==='emp'?(f.r<30?.16:.32):.35;
 const t=clamp(f.life/duration,0,1),rr=Math.max(2,f.r*(.2+(1-t)*.9));
 ctx.save();ctx.translate(f.x,f.y);
 if(f.kind==='muzzle'){
  ctx.globalAlpha=t;ctx.fillStyle='#f7d889';ctx.beginPath();ctx.moveTo(0,-f.r);ctx.lineTo(f.r*.55,0);ctx.lineTo(0,f.r*.48);ctx.lineTo(-f.r*.55,0);ctx.closePath();ctx.fill();ctx.fillStyle='#fff0bd';ctx.beginPath();ctx.arc(0,0,f.r*.28,0,6.28);ctx.fill();
 }else if(f.kind==='emp'||f.kind==='electricHit'){
  ctx.globalAlpha=t*.24;ctx.fillStyle='#61d7df';ctx.beginPath();ctx.arc(0,0,rr*.9,0,6.28);ctx.fill();ctx.globalAlpha=t*.92;ctx.strokeStyle='#72e4ec';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,rr,0,6.28);ctx.stroke();ctx.strokeStyle='#e2fdff';ctx.lineWidth=2;for(let i=0;i<7;i++){const a=i*6.28/7+performance.now()*.009;ctx.beginPath();ctx.moveTo(Math.cos(a)*rr*.35,Math.sin(a)*rr*.35);ctx.lineTo(Math.cos(a+.22)*rr*.68,Math.sin(a+.22)*rr*.68);ctx.lineTo(Math.cos(a-.08)*rr,Math.sin(a-.08)*rr);ctx.stroke()}
 }else if(f.kind==='explosion'||f.kind==='rocketImpact'||f.kind==='missileImpact'||f.kind==='mineImpact'){
  ctx.globalAlpha=t*.4;ctx.fillStyle='#24231e';ctx.beginPath();ctx.arc(0,0,rr*.9,0,6.28);ctx.fill();
  ctx.globalAlpha=t*.72;ctx.fillStyle='#d96f37';ctx.beginPath();ctx.arc(0,0,rr*.65,0,6.28);ctx.fill();
  ctx.fillStyle='#f1ba5b';ctx.beginPath();ctx.arc(0,0,rr*.38,0,6.28);ctx.fill();
  ctx.fillStyle='#ffedbc';ctx.beginPath();ctx.arc(0,0,Math.max(2,rr*.15),0,6.28);ctx.fill();
  ctx.strokeStyle=f.color;ctx.lineWidth=3;ctx.globalAlpha=t*.75;ctx.beginPath();ctx.arc(0,0,rr,0,6.28);ctx.stroke();
  ctx.strokeStyle='#edaa57';ctx.lineWidth=2;for(let i=0;i<6;i++){const a=i*Math.PI/3+f.x*.01;ctx.beginPath();ctx.moveTo(Math.cos(a)*rr*.7,Math.sin(a)*rr*.7);ctx.lineTo(Math.cos(a)*rr*1.2,Math.sin(a)*rr*1.2);ctx.stroke()}
 }else{
  ctx.globalAlpha=t*.8;ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,rr,0,6.28);ctx.stroke();
  ctx.fillStyle='#fff1c4';ctx.beginPath();ctx.arc(0,0,Math.max(2,rr*.22),0,6.28);ctx.fill();
  for(let i=0;i<4;i++){const a=i*Math.PI/2+f.y*.01;ctx.beginPath();ctx.moveTo(Math.cos(a)*rr*.55,Math.sin(a)*rr*.55);ctx.lineTo(Math.cos(a)*rr*1.35,Math.sin(a)*rr*1.35);ctx.stroke()}
 }
 ctx.restore()
}
function drawMine(m){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(m.x,m.y+6,m.r+5,8,0,0,6.28);ctx.fill();ctx.fillStyle='#24251f';ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,6.28);ctx.fill();ctx.strokeStyle='#aa503e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(m.x,m.y,m.r-5,0,6.28);ctx.stroke();ctx.fillStyle='#d39b3e';for(let a=0;a<6;a++){const q=a*Math.PI/3;ctx.fillRect(m.x+Math.cos(q)*(m.r-3)-2,m.y+Math.sin(q)*(m.r-3)-2,4,4)}}
function drawRoadResult(fail=false){
 drawRouteBackdrop();ctx.fillStyle='rgba(11,18,19,.82)';ctx.fillRect(0,0,W,H);
 if(!fail){
  const reveal=roadResultReveal*roadResultReveal*(3-2*roadResultReveal);ctx.save();ctx.globalAlpha=reveal;ctx.translate(0,(1-reveal)*24);
  drawRouteNodeCard(meta.selectedNode||{type:'scavenge',site:'junkyard',short:'目的地',danger:1},{x:270,y:150},true);
  text('已抵达目的地',270,245,28,C.yellow,'center',900);text(destinationName(),270,278,16,C.cream,'center',900);
  const rows=[['击杀',roadGame.kills],['废料',roadGame.scrap],['战地维修',roadGame.repairs||0],['车体',`${roadGame.player.hp}/${roadGame.player.max}`]];rows.forEach((r,i)=>{ctx.fillStyle='rgba(30,39,38,.96)';roundRect(75,330+i*66,390,50,10,true,false);ctx.fillStyle=i===3?C.green:C.yellow;ctx.fillRect(75,330+i*66,5,50);text(r[0],98,361+i*66,UI.body,C.muted);text(String(r[1]),444,362+i*66,19,C.cream,'right',900)});
  if(meta.selectedNode?.type==='final'){ctx.fillStyle='rgba(39,47,44,.97)';roundRect(75,620,390,90,12,true,false);text('巨像已瘫痪',95,650,UI.caption,C.yellow,'left',900);fitText(`${meta.finalFlags.mg?'机枪已毁':'机枪完好'} • ${meta.finalFlags.rocket?'火箭已毁':'火箭完好'} • ${meta.finalFlags.armor?'装甲已毁':'装甲完好'}`,95,681,350,UI.body,11,C.cream,'left',800)}
  else{const d=VEH[roadGame.reward];ctx.fillStyle='rgba(39,47,44,.97)';roundRect(75,620,390,90,12,true,false);text('已回收模块',95,650,UI.caption,C.yellow,'left',900);fitText(`${d.name}  ${roadGame.rewardLv}级`,95,682,340,UI.label,13,C.cream,'left',900)}
  ctx.fillStyle='#31575a';roundRect(75,735,390,56,12,true,false);ctx.strokeStyle='rgba(132,217,208,.72)';roundRect(75,735,390,56,12,false,true);text('整备车辆',270,759,UI.label,'#d9f0ec','center',900);text('安装刚获得的模块',270,781,11,'#b8d5d0','center',700);
  btn(75,812,390,64,meta.selectedNode?.type==='town'?'进入城镇':meta.pendingRoadEvent?'处理路边事件':meta.selectedNode?.type==='final'?'攻入圣堂':meta.selectedNode?.type==='boss'?'领取战利品':'下车搜刮');ctx.restore()
 }else{
  drawVehicle(270,190,.85,C.red);text('载具损毁',270,300,30,C.red,'center',900);wrap('破烂车没能跑完这段路。原型测试中可从路线图继续本轮。',80,360,380,22,13,C.muted);btn(75,640,390,70,'返回路线图')
 }
}

function drawScavProjectile(b,hostile=false){
 const color=hostile?(b.sniper?'#f2d6bd':'#df6b51'):(b.ap>0?'#a2e0ca':'#f4e5b6');
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);ctx.lineCap='round';
 ctx.strokeStyle=hostile?'rgba(175,58,43,.44)':b.ap>0?'rgba(95,191,166,.43)':'rgba(241,222,160,.43)';ctx.lineWidth=b.sniper?4:3;ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(0,b.sniper?20:14);ctx.stroke();
 ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,-2,b.sniper?3:2.5,b.sniper?8:6,0,0,6.28);ctx.fill();ctx.restore();
}
function drawScavFX(f){
 const duration=f.kind==='muzzle'?.1:f.kind==='searchBurst'?.45:f.r>18?.35:.15,t=clamp(f.life/duration,0,1),rr=Math.max(2,f.r*(.3+1-t));
 ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha=t;
 if(f.kind==='muzzle'){
  ctx.fillStyle='#f8d989';ctx.beginPath();ctx.moveTo(0,-f.r);ctx.lineTo(f.r*.65,0);ctx.lineTo(0,f.r);ctx.lineTo(-f.r*.65,0);ctx.closePath();ctx.fill();ctx.fillStyle='#fff6cd';ctx.beginPath();ctx.arc(0,0,2,0,6.28);ctx.fill();
 }else if(f.kind==='searchBurst'){
  ctx.globalAlpha=t*.72;ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,5,rr,rr*.46,0,0,6.28);ctx.stroke();
  for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.globalAlpha=t*(i%2?.55:.85);ctx.fillStyle=i%2?'#f5e5b9':f.color;ctx.beginPath();ctx.arc(Math.cos(a)*rr*.9,Math.sin(a)*rr*.42-4,2.2,0,6.28);ctx.fill()}
 }else{
  if(f.r>18){ctx.globalAlpha=t*.45;ctx.fillStyle='#46382c';ctx.beginPath();ctx.arc(0,0,rr*.8,0,6.28);ctx.fill();ctx.globalAlpha=t*.75;ctx.fillStyle='#df874c';ctx.beginPath();ctx.arc(0,0,rr*.45,0,6.28);ctx.fill()}
  ctx.globalAlpha=t;ctx.strokeStyle=f.color;ctx.lineWidth=f.r>18?3:2;ctx.beginPath();ctx.arc(0,0,rr,0,6.28);ctx.stroke();
  for(let i=0;i<4;i++){const a=i*Math.PI/2+f.x*.01;ctx.beginPath();ctx.moveTo(Math.cos(a)*rr*.6,Math.sin(a)*rr*.6);ctx.lineTo(Math.cos(a)*rr*1.45,Math.sin(a)*rr*1.45);ctx.stroke()}
 }
 ctx.restore();
}
const SITE_STRUCTURE_ART={gas:'siteGasStation',clinic:'siteClinic',motel:'siteMotel',junkyard:'siteJunkyard'};
// Normalized opaque bounds (alpha >= 16) of the 256x192 landmark sources.
// Shadows use the visible feet rather than the larger transparent image box.
const SITE_STRUCTURE_BOUNDS={gas:[.031,.042,.969,.958],clinic:[.031,.083,.969,.911],motel:[.031,.063,.969,.938],junkyard:[.031,.099,.969,.901]};
const SITE_COVER_ART={gas:'propGasCover',clinic:'propClinicCover',motel:'propMotelCover',junkyard:'propJunkyardCover',final:'propJunkyardCover'};
const SITE_CACHE_ART={gas:'propGasCache',clinic:'propClinicCache',motel:'propMotelCache',junkyard:'propJunkyardCache',final:'propJunkyardCache'};
const SITE_CACHE_SIZE={gas:[42,34],clinic:[40,36],motel:[44,34],junkyard:[46,34],final:[46,34]};
const LOOT_ART={gas:'lootGas',food:'lootFood',scrap:'lootScrap',med:'lootMed'};
function drawScavCache(c,site){
 const [w,h]=SITE_CACHE_SIZE[site]||SITE_CACHE_SIZE.junkyard,pulse=.5+.5*Math.sin(performance.now()/170+c.x);
 ctx.fillStyle='rgba(13,12,10,.35)';ctx.beginPath();ctx.ellipse(c.x,c.y+h*.34,w*.42,5,0,0,6.28);ctx.fill();
 if(c.rare){ctx.save();ctx.globalAlpha=.18+pulse*.12;ctx.fillStyle='#f5cd65';ctx.beginPath();ctx.ellipse(c.x,c.y+2,w*.66,h*.54,0,0,6.28);ctx.fill();ctx.globalAlpha=.65;ctx.strokeStyle='#ffe59a';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(c.x,c.y+3,w*.57,h*.44,0,0,6.28);ctx.stroke();ctx.restore()}
 if(!drawProd(SITE_CACHE_ART[site]||SITE_CACHE_ART.junkyard,c.x,c.y,w,h,1)){
  ctx.fillStyle=c.rare?C.yellow:'#755d3f';roundRect(c.x-w/2,c.y-h/2,w,h,5,true,false);ctx.strokeStyle=c.rare?'#fff0a0':'#9a805f';ctx.lineWidth=2;ctx.strokeRect(c.x-w*.38,c.y-h*.34,w*.76,h*.68)
 }
 if(c.progress>0)bar(c.x-28,c.y-h/2-15,56,7,c.progress,c.rare?C.yellow:C.green)
}
function drawScavLoot(l){
 const rise=Math.min(14,(l.age||0)*17),y=l.y-rise,born=clamp((l.age||0)/.13,0,1),fade=clamp(l.life/.24,0,1),size=19*(.72+.28*born);
 ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='rgba(15,14,11,.3)';ctx.beginPath();ctx.ellipse(l.x,l.y+7,8,3,0,0,6.28);ctx.fill();
 ctx.shadowColor=l.type==='gas'?C.gas:l.type==='food'?C.food:l.type==='med'?C.med:C.scrap;ctx.shadowBlur=7;
 if(!drawProd(LOOT_ART[l.type],l.x,y,size,size,fade)){ctx.fillStyle=ctx.shadowColor;ctx.beginPath();ctx.arc(l.x,y,7,0,6.28);ctx.fill()}
 ctx.restore()
}
function drawScavCover(o,site){
 const x=o.x,y=o.y,w=o.w,h=o.h;
 ctx.fillStyle='rgba(18,16,13,.28)';ctx.beginPath();ctx.ellipse(x+w/2,y+h*.84,w*.46,Math.max(6,h*.18),0,0,6.28);ctx.fill();
 const tall=h>w*1.1,key=tall&&site==='gas'?'propGasPump':tall&&(site==='junkyard'||site==='final')?'propJunkyardTireStack':SITE_COVER_ART[site];
 if(key&&drawProd(key,x+w/2,y+h/2,w,h,1))return;
 ctx.fillStyle=site==='clinic'?'#77796b':site==='motel'?'#74523e':site==='junkyard'?'#575a51':'#806c48';roundRect(x,y,w,h,6,true,false);
 ctx.strokeStyle='#282720';ctx.lineWidth=3;roundRect(x+1,y+1,w-2,h-2,6,false,true);
 if(site==='gas'){
  if(h>w){ctx.fillStyle='#b99850';roundRect(x+7,y+8,w-14,h-16,5,true,false);ctx.fillStyle='#343a32';ctx.fillRect(x+13,y+20,w-26,23);ctx.fillStyle='#c65d3f';ctx.fillRect(x+15,y+h-30,w-30,9)}
  else{ctx.fillStyle='#4c4e3c';roundRect(x+10,y+8,w-20,h-16,10,true,false);ctx.strokeStyle='#bca567';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+18,y+h*.38);ctx.lineTo(x+w-18,y+h*.38);ctx.stroke();ctx.fillStyle='#c98142';for(let i=0;i<3;i++)ctx.fillRect(x+17+i*(w-34)/3,y+h-18,Math.max(8,(w-48)/3),6)}
 }else if(site==='clinic'){
  ctx.fillStyle='#a3a58c';roundRect(x+9,y+8,w-18,h-16,4,true,false);ctx.fillStyle='#696d60';ctx.fillRect(x+12,y+h*.55,w-24,5);ctx.fillStyle='#a04c42';ctx.fillRect(x+w*.5-4,y+13,8,25);ctx.fillRect(x+w*.5-13,y+22,26,7);ctx.strokeStyle='#45483d';ctx.lineWidth=2;ctx.strokeRect(x+7,y+7,w-14,h-14);
 }else if(site==='motel'){
  ctx.fillStyle='#9b6546';roundRect(x+9,y+8,w-18,h-16,4,true,false);ctx.strokeStyle='#3c2d24';ctx.lineWidth=5;for(let i=1;i<4;i++){const yy=y+i*h/4;ctx.beginPath();ctx.moveTo(x+10,yy);ctx.lineTo(x+w-10,yy-7);ctx.stroke()}ctx.fillStyle='#d6a15a';ctx.fillRect(x+15,y+13,Math.min(21,w*.2),7);
 }else{
  ctx.fillStyle='#77786b';ctx.beginPath();ctx.moveTo(x+8,y+h-9);ctx.lineTo(x+14,y+19);ctx.lineTo(x+w*.42,y+8);ctx.lineTo(x+w*.65,y+25);ctx.lineTo(x+w-10,y+10);ctx.lineTo(x+w-8,y+h-8);ctx.fill();ctx.strokeStyle='#342f29';ctx.lineWidth=4;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x+12,y+26+i*18);ctx.lineTo(x+w-11,y+14+i*18);ctx.stroke()}ctx.fillStyle='#b36e3f';ctx.fillRect(x+w*.33,y+h*.55,Math.max(9,w*.25),8);
 }
 ctx.fillStyle='rgba(245,222,174,.20)';ctx.fillRect(x+10,y+7,Math.max(8,w*.34),3);
}
function drawSiteStructure(o,site){
 const x=o.x+o.w/2,y=o.y+o.h/2,b=SITE_STRUCTURE_BOUNDS[site]||[0,0,1,1],visibleW=o.w*(b[2]-b[0]),groundY=o.y+o.h*b[3]-1;
 ctx.fillStyle='rgba(18,16,13,.36)';ctx.beginPath();ctx.ellipse(x,groundY,visibleW*.46,Math.max(6,o.h*.045),0,0,6.28);ctx.fill();
 if(!drawProd(SITE_STRUCTURE_ART[site],x,y,o.w,o.h,1)&&!drawArt(site,x,y,o.w,o.h,1))drawScavCover(o,site);
}
function drawScavenge(){
 const g=game,p=g.player,cam=g.cameraY||0,site=g.finalAssault?'final':g.site;
 const ground=site==='clinic'?'#756d5b':site==='motel'?'#806a4d':site==='junkyard'?'#625d50':site==='gas'?'#796a50':'#51483e';
 ctx.fillStyle=ground;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(0,-cam);
 ctx.fillStyle=ground;ctx.fillRect(0,0,W,g.worldH);
 ctx.strokeStyle='rgba(40,32,22,.16)';ctx.lineWidth=2;for(let y=75;y<g.worldH;y+=95){ctx.beginPath();ctx.moveTo(0,y);ctx.quadraticCurveTo(130,y-16,270,y+5);ctx.quadraticCurveTo(420,y+22,540,y-7);ctx.stroke()}
 for(let y=140;y<g.worldH;y+=260){const shift=(y/260%2)*85;ctx.fillStyle='rgba(30,27,21,.22)';ctx.fillRect(24+shift,y,42,4);ctx.fillRect(430-shift*.35,y+78,58,5);ctx.fillStyle='rgba(207,173,105,.10)';ctx.fillRect(100+shift*.4,y+135,72,3)}
 if(site==='gas'){ctx.fillStyle='rgba(73,47,30,.34)';for(let y=260;y<g.worldH;y+=520){ctx.fillRect(72,y,155,9);ctx.fillRect(312,y+145,128,7)}}
 if(site==='clinic'){ctx.fillStyle='rgba(210,215,190,.09)';for(let y=190;y<g.worldH;y+=470){ctx.fillRect(38,y,180,38);ctx.fillRect(335,y+160,130,26)}}
 if(site==='motel'){ctx.fillStyle='rgba(112,48,35,.18)';for(let y=210;y<g.worldH;y+=500){ctx.fillRect(45,y,210,12);ctx.fillRect(300,y+115,165,10)}}
 if(site==='junkyard'){ctx.strokeStyle='rgba(33,31,27,.34)';ctx.lineWidth=5;for(let y=180;y<g.worldH;y+=330){ctx.beginPath();ctx.moveTo(20,y);ctx.lineTo(120,y+35);ctx.lineTo(205,y-5);ctx.stroke();ctx.beginPath();ctx.moveTo(350,y+95);ctx.lineTo(505,y+55);ctx.stroke()}}
 for(const o of g.obstacles){
  if(o.kind==='landmark')drawSiteStructure(o,site);
  else drawScavCover(o,site);
 }
 for(const c of g.crates)if(!c.opened)drawScavCache(c,site);
 for(const l of g.loot)drawScavLoot(l);
 for(const gr of g.grenades){
 ctx.save();
 if(gr.phase==='air'){
  ctx.globalAlpha=.22;ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(gr.tx,gr.ty,gr.r,0,6.28);ctx.fill();
  ctx.globalAlpha=.45;ctx.fillStyle='#171912';ctx.beginPath();ctx.ellipse(gr.x,gr.y+5,8,4,0,0,6.28);ctx.fill();
  ctx.globalAlpha=1;ctx.fillStyle='#4b5043';ctx.beginPath();ctx.arc(gr.x,gr.y-gr.z*.45,7,0,6.28);ctx.fill();
  ctx.strokeStyle='#c9b86e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(gr.sx,gr.sy);ctx.quadraticCurveTo((gr.sx+gr.tx)/2,(gr.sy+gr.ty)/2-70,gr.tx,gr.ty);ctx.stroke();
 }else{
  ctx.globalAlpha=.22+.25*Math.sin(performance.now()/70);ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(gr.x,gr.y,gr.r,0,6.28);ctx.fill();
  ctx.globalAlpha=1;ctx.strokeStyle=C.red;ctx.lineWidth=3;ctx.beginPath();ctx.arc(gr.x,gr.y,gr.r,0,6.28);ctx.stroke();
  ctx.fillStyle='#4b5043';ctx.beginPath();ctx.arc(gr.x,gr.y,7,0,6.28);ctx.fill();
 }
 ctx.restore();
}
 for(const e of g.enemies)drawScavEnemy(e);
 for(const b of g.bullets)drawScavProjectile(b);
 for(const b of g.enemyBullets)drawScavProjectile(b,true);
 for(const f of g.fx)drawScavFX(f);
 drawExit(g.exit);drawSurvivor(p);ctx.restore();
 ctx.fillStyle='rgba(15,22,20,.94)';roundRect(18,18,504,112,14,true,false);
 text(g.finalAssault?'锈蚀圣堂 • 最终突袭':SITE[g.site].name,34,48,16,C.cream,'left',900);text(`${Math.ceil(g.time)}秒`,500,50,25,g.time<20?C.red:C.cream,'right',900);
 bar(34,67,210,11,p.hp/p.max,p.hp/p.max>.4?C.green:C.red);text(`生命 ${p.hp}/${p.max}`,255,77,11,C.cream);
 text(`${g.build.weapons.length} 件武器`,34,108,UI.caption,C.yellow,'left',900);text(`新装备 ${g.haul.length}`,500,108,UI.caption,C.cream,'right',900);
 if(g.finalAssault){text(g.finalLabel||'突破口',270,150,UI.body,g.driverSpawned?C.red:C.yellow,'center',900);if(g.driverSpawned){const d=g.enemies.find(e=>e.type==='driver');if(d)bar(95,165,350,11,d.hp/d.max,C.red)}}else if(g.special)text('稀有信号',270,150,UI.body,C.yellow,'center',900);else fitText(g.effectLabel?`${g.rule?.label||''} · ${g.effectLabel}`:(g.rule?.label||''),270,150,430,11,10,g.effectLabel?C.red:C.muted,'center',900);
 drawJoy();drawNotice();
}
function drawSurvivor(p){
 const flash=p.inv>0&&Math.floor(performance.now()/70)%2?.35:1;
 const cfg=SURVIVOR_BODY[p.bodyDir||'upRight']||SURVIVOR_BODY.upRight;
 const weaponBehind=Math.sin(p.aimAngle??-Math.PI/2)<-.18;
 ctx.save();ctx.translate(p.recoilX||0,p.recoilY||0);
 ctx.save();ctx.globalAlpha=flash*.28;ctx.fillStyle='#16140f';ctx.beginPath();ctx.ellipse(p.x,p.y+18,19,8,0,0,6.28);ctx.fill();ctx.restore();
 if(weaponBehind)drawScavWeapon(p,flash);
 if(!drawScavBody(p,cfg,flash)){
  ctx.save();ctx.globalAlpha=flash;
  if(!drawProd('playerSurvivor',p.x,p.y,56,58,1)&&!drawArt('survivor',p.x,p.y,62,76,1)){ctx.fillStyle='#2d342d';ctx.beginPath();ctx.arc(p.x,p.y,p.r+4,0,6.28);ctx.fill()}
  ctx.restore()
 }
 if(!weaponBehind)drawScavWeapon(p,flash);
 ctx.restore()
}
const SCAV_ENEMY_SPRITES={gunner:['enemyGunner',72],melee:['enemyMelee',72],grenadier:['enemyGrenadier',72],sniper:['enemySniper',72],armored:['enemyArmored',80],elite:['enemyElite',84],driver:['enemyDriver',104]};
function drawScavEnemy(e){
 const key=e.type==='gunner'?'gunner':e.type==='sniper'?'sniper':e.type==='melee'?'melee':e.type==='elite'||e.type==='armored'||e.type==='driver'?'gunner':null;
 const sprite=SCAV_ENEMY_SPRITES[e.type],hasProd=!!(sprite&&drawProd(sprite[0],e.x,e.y,sprite[1],sprite[1],1));
 if(!hasProd&&!(key&&drawArt(key,e.x,e.y,58,72,1))){
  ctx.fillStyle='#171812';ctx.beginPath();ctx.arc(e.x,e.y,e.r+3,0,6.28);ctx.fill();
  ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,6.28);ctx.fill();
  if(e.type==='grenadier'){ctx.fillStyle='#626b45';ctx.beginPath();ctx.arc(e.x-14,e.y-13,7,0,6.28);ctx.fill();ctx.strokeStyle='#e7c772';ctx.lineWidth=2;ctx.stroke()}
 }
 if(!hasProd)text(e.type==='gunner'?'枪':e.type==='grenadier'?'爆':e.type==='elite'?'精':e.type==='armored'?'甲':e.type==='sniper'?'狙':e.type==='driver'?'首':'',e.x,e.y+7,e.type==='driver'?11:8,'#171912','center',900);
 if(e.type!=='melee'&&e.type!=='driver')bar(e.x-18,e.y-e.r-18,36,4,e.hp/e.max,C.red)
}
function drawExit(ex){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(ex.x,ex.y+20,62,14,0,0,6.28);ctx.fill();drawVehicle(ex.x,ex.y,.72,C.yellow);ctx.fillStyle='rgba(18,28,26,.94)';roundRect(ex.x-58,ex.y+43,116,30,7,true,false);text('撤离',ex.x,ex.y+64,11,C.yellow,'center',900);if(ex.progress>0)bar(ex.x-55,ex.y+78,110,8,ex.progress,C.green)}

function drawGridScreen(kind){
 const isPack=kind==='pack',g=isPack?packGeom():vehicleGeom(),list=isPack?meta.backpack:meta.vehiclePack,defs=isPack?ITEM:VEH,pending=isPack?meta.pendingHaul:meta.pendingVehicle,drag=isPack?packDrag:vehicleDrag;drawDunes();ctx.fillStyle='rgba(12,14,11,.84)';ctx.fillRect(0,0,W,H);
 title(isPack?'背包':'载具舱','同色外框相邻，可获得对应增益');
 ctx.fillStyle='rgba(28,38,35,.88)';roundRect(75,96,390,38,10,true,false);
 if(isPack){const b=buildStats();text(`生命 ${b.maxHp}`,140,121,UI.caption,C.cream,'center',800);text(`移速 ${Math.round(b.speed)}`,270,121,UI.caption,C.cream,'center',800);text(`武器 ${b.weapons.length}/2`,400,121,UI.caption,C.cream,'center',800)}else{const v=vehicleStats();text(`车体 ${v.maxHull}`,140,121,UI.caption,C.cream,'center',800);text(`燃料 ${v.maxFuel}`,270,121,UI.caption,C.cream,'center',800);text(`挂点 ${v.activeWeapons.length}/2`,400,121,UI.caption,C.cream,'center',800)}
 drawSynergyLegend(isPack);
 ctx.fillStyle='#222b29';roundRect(g.x-10,g.y-10,g.cols*g.cell+20,g.rows*g.cell+20,14,true,false);for(let y=0;y<g.rows;y++)for(let x=0;x<g.cols;x++){ctx.fillStyle=(x+y)%2?'#303a36':'#2a332f';ctx.fillRect(g.x+x*g.cell+2,g.y+y*g.cell+2,g.cell-4,g.cell-4);ctx.strokeStyle='#46524d';ctx.strokeRect(g.x+x*g.cell+.5,g.y+y*g.cell+.5,g.cell-1,g.cell-1)}
 for(const it of list)drawGridItem(it,g.x+it.gx*g.cell,g.y+it.gy*g.cell,g.cell,defs,drag?.item.id===it.id);
 const cards=isPack?packPendingCards():vehicleCards(),headingY=Math.min(g.bottom+8,640);text(`待处理${isPack?'装备':'模块'}  ${pending.length}`,35,headingY,UI.body,C.muted,'left',900);
 for(const c of cards){const d=defs[c.it.type];ctx.fillStyle='#252e2b';roundRect(c.x,c.y,c.w,c.h,9,true,false);drawSynergyFrame(c.it,c.x,c.y,c.w,c.h,defs,list,.9);ctx.fillStyle=d.color;roundRect(c.x+7,c.y+8,43,42,7,true,false);fitText(d.tag,c.x+28,c.y+34,36,11,10,'#171912','center',900);fitText(`${d.name} ${c.it.level||1}级`,c.x+59,c.y+25,c.w-68,13,11,C.cream,'left',900);text(`${d.w}×${d.h} 格`,c.x+59,c.y+46,11,C.muted)}
 ctx.fillStyle='#663a32';roundRect(28,822,215,66,12,true,false);text((isPack?packReturn:vehicleReturn)==='town'?'出售':'丢弃',135,862,UI.label,'#f0d9ce','center',900);btn(298,822,214,66,(isPack?packReturn:vehicleReturn)==='town'?'返回城镇':'继续');if(drag)drawGridItem(drag.item,drag.x-drag.ox,drag.y-drag.oy,g.cell,defs,false,.8);if(isPack&&evolutionChoice)drawEvolutionModal();drawNotice()
}
function drawEvolutionModal(){
 const it=meta.backpack.find(x=>x.id===evolutionChoice?.itemId);if(!it){evolutionChoice=null;return}
 const opts=EVOLUTIONS[evolutionChoice.type]||[];ctx.fillStyle='rgba(7,8,6,.86)';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#20231c';roundRect(28,310,484,420,18,true,false);
 text('3级进化',270,365,24,C.yellow,'center',900);text(ITEM[it.type].name,270,400,14,C.cream,'center',900);
 wrap('选择一个进化分支。本轮余下时间里，这件武器将按该方向作战。',72,438,396,20,11,C.muted);
 opts.slice(0,2).forEach((o,i)=>{const x=i===0?45:285;ctx.fillStyle='#303936';roundRect(x,565,210,120,14,true,false);ctx.strokeStyle=i===0?C.yellow:C.teal;ctx.lineWidth=2;roundRect(x,565,210,120,14,false,true);fitText(o.name,x+105,601,176,15,12,C.cream,'center',900);wrap(o.desc,x+18,630,174,18,11,C.muted,2)});
}
function drawGridItem(it,x,y,cell,defs,hidden=false,alpha=1){if(hidden)return;const d=defs[it.type],list=defs===ITEM?meta.backpack:meta.vehiclePack,active=d.kind!=='weapon'||weaponIsActive(it,list,defs,2),w=d.w*cell,h=d.h*cell;ctx.save();ctx.globalAlpha=alpha*(active?1:.38);ctx.fillStyle=d.color;roundRect(x+3,y+3,w-6,h-6,8,true,false);ctx.strokeStyle=it.locked?C.yellow:active?'rgba(255,255,255,.28)':C.red;ctx.lineWidth=it.locked?2:1;roundRect(x+3,y+3,w-6,h-6,8,false,true);drawSynergyFrame(it,x+2,y+2,w-4,h-4,defs,list,1);fitText(d.tag,x+w/2,y+h/2+5,w-16,Math.min(16,cell*.26),11,'#171912','center',900);text(`${it.level||1}级`,x+8,y+h-10,10,C.cream,'left',900);if(it.evolution)fitText((EVOLUTIONS[it.type]?.find(x=>x.id===it.evolution)?.name||'进化').slice(0,5),x+w-7,y+14,w-16,10,9,C.yellow,'right',900);if(d.kind==='weapon'&&!active)text('停用',x+w-7,y+h-10,10,C.red,'right',900);ctx.restore()}

function drawTown(){
 drawDunes();const hasTownArt=drawProd('townRustwater',270,480,540,960,1);
 if(!hasTownArt){ctx.fillStyle='#5b4d39';ctx.fillRect(0,125,W,735);ctx.fillStyle='#3d3428';ctx.fillRect(245,125,55,735)}
 const near=townNearest();
 for(const a of TOWN_SPOTS){
  ctx.fillStyle='rgba(14,20,19,.90)';roundRect(a.x+8,a.y+8,a.w-16,32,7,true,false);
  fitText(a.title,a.x+a.w/2,a.y+30,a.w-34,UI.caption,11,near?.id===a.id?C.yellow:C.cream,'center',900);
  if(near?.id===a.id){ctx.strokeStyle=C.yellow;ctx.lineWidth=2;roundRect(a.x,a.y,a.w,a.h,8,false,true)}
 }
 ctx.fillStyle='rgba(14,20,19,.94)';roundRect(12,42,516,62,12,true,false);text('锈水镇',28,70,18,C.cream,'left',900);uiPill(108,52,64,'安全区','#385b47','#d9ead8');
 const vs=vehicleStats();fitText(`¢${meta.credits}  ·  燃料 ${meta.vehicle.fuel}/${vs.maxFuel}  ·  废料 ${meta.vehicle.scrap}`,512,94,300,UI.caption,11,C.yellow,'right',900);
 drawVehicle(270,820,.66,C.yellow);
 if(townWorld)drawSurvivor(townWorld.player);
 if(near&&!townPanel){ctx.fillStyle='rgba(16,24,23,.96)';roundRect(88,734,364,66,12,true,false);text(near.title,270,762,UI.label,C.cream,'center',900);text(near.sub||'已进入交互范围',270,785,UI.caption,C.green,'center',800);ctx.fillStyle=C.yellow;roundRect(315,850,195,70,12,true,false);text(near.id==='gate'?'离开城镇':'互动',412,892,UI.label,C.ink,'center',900)}
 uiPill(440,112,72,'背包','#26322f',C.cream);if(!near)text('拖动摇杆移动 · 靠近建筑互动',270,896,UI.caption,C.muted,'center',700);
 if(!townPanel)drawJoy();if(townPanel)drawTownPanel();drawNotice()
}
function drawTownPanel(){ctx.fillStyle='rgba(8,12,11,.86)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#1d2927';roundRect(18,94,504,824,18,true,false);ctx.fillStyle='#34423e';roundRect(462,111,44,44,12,true,false);text('×',484,142,25,C.cream,'center',900);if(townPanel==='market')drawMarket();if(townPanel==='fuel')drawFuel();if(townPanel==='garage')drawGarage();if(townPanel==='armory')drawArmory();if(townPanel==='routes')drawRoutes()}
function panelHead(a,b){text(a,42,150,26,C.yellow,'left',900);fitText(b,42,182,405,UI.caption,11,C.muted,'left',700)}
function drawMarket(){
 panelHead('废料市场',`今日高价：${CARGO_NAME[meta.town.demand]}，售价提升 70%`);const ts=['gas','food','scrap','med'];for(let i=0;i<4;i++){const t=ts[i],y=218+i*95,demand=meta.town.demand===t;ctx.fillStyle=demand?'#344139':'#293330';roundRect(42,y,456,74,11,true,false);text(`${CARGO_NAME[t]} ×${meta.cargo[t]}`,62,y+29,UI.label,C.cream,'left',900);text(`单价 ¢${townPrice(t)}`,62,y+55,UI.caption,demand?C.yellow:C.muted);ctx.fillStyle='#40504b';roundRect(305,y+11,88,52,10,true,false);text('出售 1',349,y+43,UI.caption,C.cream,'center',900);ctx.fillStyle=demand?'#8d6b25':'#59634f';roundRect(400,y+11,86,52,10,true,false);text('全出售',443,y+43,UI.caption,demand?'#fff1c7':C.cream,'center',900)}
}
function drawFuel(){
 panelHead('燃料站','补给燃料，避免在公路上因缺油承受额外风险');const cap=vehicleStats().maxFuel;text(`${meta.vehicle.fuel}/${cap}`,270,265,42,C.yellow,'center',900);text('当前燃料',270,292,UI.caption,C.muted,'center',800);bar(90,307,360,18,meta.vehicle.fuel/cap,C.yellow);
 [['倒入货运油罐',`持有油罐 ${meta.cargo.gas}`],['购买 1 点燃料','花费 ¢5'],['购买 5 点燃料','花费 ¢22']].forEach((r,i)=>{const y=360+i*100;ctx.fillStyle='#303b37';roundRect(85,y,370,72,12,true,false);text(r[0],270,y+31,UI.label,C.cream,'center',900);text(r[1],270,y+56,UI.caption,C.yellow,'center',800)})
}
function drawGarage(){
 panelHead('修车厂','购买模块后，用同色外框相邻激活增益');const v=vehicleStats(),h=Math.min(meta.vehicle.hull??v.maxHull,v.maxHull);ctx.fillStyle='#27312e';roundRect(55,200,430,56,10,true,false);text(`车体 ${h}/${v.maxHull}`,75,233,UI.body,C.cream,'left',900);bar(185,218,280,16,h/v.maxHull,h/v.maxHull>.4?C.green:C.red);
 [['维修 +1 · ¢6',270],['完全修复',345],[`扩建载具舱 ${meta.vehicleGrid.cols}×${meta.vehicleGrid.rows}`,420],['打开载具舱',495]].forEach((r,i)=>{ctx.fillStyle=i===3?'#31575a':'#303b37';roundRect(55,r[1],430,62,10,true,false);fitText(r[0],270,r[1]+38,390,UI.label,13,i===3?'#d9f0ec':C.cream,'center',900)});text('可购买模块',55,580,UI.body,C.muted,'left',900);(meta.town.moduleOffers||[]).forEach((o,i)=>{const d=VEH[o.type],y=595+i*75,it={id:-100-i,type:o.type,gx:null,gy:null},fuse=fusionTarget(o.type,meta.vehiclePack);ctx.fillStyle='#293330';roundRect(55,y,430,62,9,true,false);drawSynergyFrame(it,55,y,430,62,VEH,meta.vehiclePack,o.sold?.35:1);fitText(o.sold?'已售出':d.name,75,y+27,245,UI.body,12,o.sold?'#6e776f':C.cream,'left',900);text(`¢${o.credits} + ${o.salvage} 废料`,75,y+50,11,C.yellow);const roles=synergyRoles(it,VEH),hint=fuse?`可融合→${(fuse.level||1)+1}级`:roles.length?SYNERGY_STYLE[roles[0]].label:'';if(hint)fitText(hint,395,y+53,92,10,9,fuse?C.yellow:SYNERGY_STYLE[roles[0]].color,'center',900);uiPill(397,y+19,72,o.sold?'售罄':'购买',o.sold?'#404642':'#59634f',o.sold?C.muted:C.cream)})
}
function drawArmory(){
 panelHead('军械库','同色外框相邻，让武器获得射速、射程或穿甲增益');ctx.fillStyle='#303b37';roundRect(55,205,430,65,10,true,false);text(`扩充背包 ${meta.pack.cols}×${meta.pack.rows}`,270,245,UI.label,C.cream,'center',900);ctx.fillStyle='#31575a';roundRect(55,300,430,65,10,true,false);text(`打开背包 · 待处理 ${meta.pendingHaul.length}`,270,340,UI.label,'#d9f0ec','center',900);text('可购买装备',55,422,UI.body,C.muted,'left',900);(meta.town.gearOffers||[]).forEach((o,i)=>{const d=ITEM[o.type],y=435+i*90,it={id:-200-i,type:o.type,gx:null,gy:null},fuse=fusionTarget(o.type,meta.backpack);ctx.fillStyle='#293330';roundRect(55,y,430,72,9,true,false);drawSynergyFrame(it,55,y,430,72,ITEM,meta.backpack,o.sold?.35:1);fitText(o.sold?'已售出':d.name,75,y+31,245,UI.label,12,o.sold?'#6e776f':C.cream,'left',900);text(`¢${o.cost} · 占用 ${d.w}×${d.h}`,75,y+57,UI.caption,C.yellow);const roles=synergyRoles(it,ITEM),hint=fuse?`可融合→${(fuse.level||1)+1}级`:roles.length>1?'可受增益':roles.length?SYNERGY_STYLE[roles[0]].label:'';if(hint)fitText(hint,395,y+61,92,10,9,fuse?C.yellow:roles.length>1?C.muted:SYNERGY_STYLE[roles[0]].color,'center',900);uiPill(397,y+24,72,o.sold?'售罄':'购买',o.sold?'#404642':'#59634f',o.sold?C.muted:C.cream)})
}
function drawRoutes(){
 panelHead('路线牌','选择公路风格，改变油耗与战斗压力');ROUTES.forEach((r,i)=>{const y=255+i*150,sel=meta.route.id===r.id;ctx.fillStyle=sel?'#3d493e':'#293330';roundRect(55,y,430,116,12,true,false);ctx.strokeStyle=sel?C.yellow:'#52605a';ctx.lineWidth=sel?3:1;roundRect(55,y,430,116,12,false,true);fitText(r.name,75,y+38,260,18,15,sel?C.yellow:C.cream,'left',900);fitText(r.risk,455,y+38,120,UI.caption,11,r.id==='raider'?C.red:C.muted,'right',900);wrap(r.bonus,75,y+70,350,20,UI.caption,C.muted,2)})
}

function eventChoices(){
 const id=eventData?.id;
 if(id==='convoy')return[['帮助商队','燃料 -4 → ¢ +45、2级辅助件'],['夺走货物','废料 +3、2级武器 • 车体 -2、触发追击']];
 if(id==='signal')return[['进入中继站','2/3级武器、¢ +20 • 负伤开局、触发伏击'],['切断电源并离开','燃料 +4、¢ +8 • 无惩罚']];
 if(id==='mechanic')return[['全面检修','¢ -30 → 修满车体、2级模块'],['拆掉他的车','废料 +4 • 燃料 -2、提高搜刮压力']];
 return[['彻底拆解','2级模块、2级装备 • 车体 -3、触发追击'],['快速搜刮','¢ +28、燃料 +1 • 立即离开']];
}
function drawEvent(){
 drawRouteBackdrop();ctx.fillStyle='rgba(10,17,18,.82)';ctx.fillRect(0,0,W,H);
 const icon={convoy:'商',signal:'讯',mechanic:'修',wreck:'残'}[eventData?.id]||'?';ctx.fillStyle='#3e3525';ctx.beginPath();ctx.arc(270,105,42,0,6.28);ctx.fill();ctx.strokeStyle=C.yellow;ctx.lineWidth=3;ctx.beginPath();ctx.arc(270,105,42,0,6.28);ctx.stroke();text(icon,270,116,25,C.yellow,'center',900);
 text('公路事件 · 两站之间',270,174,UI.body,C.yellow,'center',900);fitText(eventData?.name||'未知事件',270,217,440,29,22,C.cream,'center',900);
 ctx.fillStyle='rgba(30,40,37,.96)';roundRect(45,250,450,120,15,true,false);ctx.fillStyle=C.yellow;ctx.fillRect(45,250,5,120);wrap(eventData?.desc||'',72,286,395,23,UI.body,C.muted,3);
 const cs=eventChoices();cs.forEach((c,i)=>{const y=430+i*175;ctx.fillStyle=i===0?'rgba(61,61,43,.97)':'rgba(36,46,43,.97)';roundRect(55,y,430,125,14,true,false);ctx.strokeStyle=i===0?C.yellow:'#60746d';ctx.lineWidth=2;roundRect(55,y,430,125,14,false,true);ctx.fillStyle=i===0?C.yellow:'#60746d';roundRect(70,y+18,38,38,9,true,false);text(String(i+1),89,y+44,UI.label,'#171912','center',900);fitText(c[0],125,y+45,325,UI.label,14,C.cream,'left',900);wrap(c[1],125,y+78,325,19,UI.caption,i===0?C.yellow:C.muted,2,800)});
 text('选择你承担得起的代价',270,820,UI.caption,C.muted,'center',700);drawNotice();
}
function drawRunSummary(){
 const r=runSummary||makeRunSummary(false);drawDunes();ctx.fillStyle='rgba(10,12,9,.80)';ctx.fillRect(0,0,W,H);
 text(r.victory?'本轮完成':'本轮结束',270,115,32,r.victory?C.yellow:C.red,'center',900);
 text(r.victory?'锈蚀圣堂已经陷落':'废土再次获胜',270,152,UI.body,C.muted,'center',800);
 ctx.fillStyle='#23261f';roundRect(45,205,450,420,18,true,false);
 fitText(r.build,270,250,370,22,16,C.cream,'center',900);text('最终构筑',270,278,UI.caption,C.muted,'center',800);
 const kit=START_KITS.find(x=>x.id===r.kit)?.name||String(r.kit||'').toUpperCase(),ch=CHASSIS.find(x=>x.id===r.chassis)?.name||String(r.chassis||'').toUpperCase();
 fitText(`${kit} · ${ch} · ¢${r.credits}`,270,304,370,UI.caption,11,C.yellow,'center',800);
 const rows=[['路段',r.leg],['公路击杀',r.roadKills],['徒步击杀',r.scavKills],['事件',r.events||0],['首领',r.bosses],['背包物品',r.pack]];
 rows.forEach((x,i)=>{const y=342+i*43;text(x[0],75,y,UI.caption,C.muted);text(String(x[1]),465,y,15,C.cream,'right',900)});
 text('巨像部件',75,614,UI.caption,C.muted);fitText(`${r.flags.mg?'机枪✓':'机枪—'}  ${r.flags.rocket?'火箭✓':'火箭—'}  ${r.flags.armor?'装甲✓':'装甲—'}`,465,614,300,UI.caption,11,C.yellow,'right',900);
 text(`废土印记 +${r.marksEarned||0}`,270,685,18,C.yellow,'center',900);
 btn(75,755,390,72,'进入车库');
 text(`总印记 ${profile.marks} · 轮次 ${profile.runs} · 胜利 ${profile.wins}`,270,868,UI.caption,C.muted,'center',700);
}
function garageCards(defs,y0){
 return defs.map((d,i)=>({d,x:i%2===0?35:285,y:y0+Math.floor(i/2)*120,w:220,h:94}));
}
function drawGarageMeta(){
 drawDunes();ctx.fillStyle='rgba(11,13,10,.76)';ctx.fillRect(0,0,W,H);title('车库',`废土印记 ${profile.marks}`);
 text('初始套装',35,132,UI.body,C.yellow,'left',900);
 for(const c of garageCards(START_KITS,150)){const unlocked=profile.unlockedKits.includes(c.d.id),sel=profile.selectedKit===c.d.id;ctx.fillStyle=sel?'#3d493e':'#293330';roundRect(c.x,c.y,c.w,c.h,12,true,false);ctx.strokeStyle=sel?C.yellow:'#52605a';roundRect(c.x,c.y,c.w,c.h,12,false,true);fitText(c.d.name,c.x+14,c.y+29,c.w-28,UI.body,12,unlocked?C.cream:C.muted,'left',900);fitText(c.d.desc,c.x+14,c.y+53,c.w-28,11,10,C.muted,'left',700);fitText(unlocked?(sel?'已选择':'点击选择'):`解锁 · ${c.d.cost} 印记`,c.x+14,c.y+79,c.w-28,11,10,unlocked?C.yellow:C.red,'left',900)}
 text('破烂车底盘',35,407,UI.body,C.yellow,'left',900);
 for(const c of garageCards(CHASSIS,425)){const unlocked=profile.unlockedChassis.includes(c.d.id),sel=profile.selectedChassis===c.d.id;ctx.fillStyle=sel?'#3d493e':'#293330';roundRect(c.x,c.y,c.w,c.h,12,true,false);ctx.strokeStyle=sel?C.yellow:'#52605a';roundRect(c.x,c.y,c.w,c.h,12,false,true);fitText(c.d.name,c.x+14,c.y+29,c.w-28,UI.body,12,unlocked?C.cream:C.muted,'left',900);fitText(c.d.desc,c.x+14,c.y+53,c.w-28,11,10,C.muted,'left',700);fitText(unlocked?(sel?'已选择':'点击选择'):`解锁 · ${c.d.cost} 印记`,c.x+14,c.y+79,c.w-28,11,10,unlocked?C.yellow:C.red,'left',900)}
 btn(75,775,390,72,'开始新一轮');text('解锁新选择，不提供永久伤害加成',270,882,UI.caption,C.muted,'center',700);drawNotice();
}
function garageTap(p){
 const handle=(cards,key,unlockedKey)=>{
  for(const c of cards)if(p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h){
   const list=profile[unlockedKey];if(list.includes(c.d.id)){profile[key]=c.d.id;saveProfile();notice=`已选择${c.d.name}`;noticeT=1;return true}
   if(profile.marks>=c.d.cost){profile.marks-=c.d.cost;list.push(c.d.id);profile[key]=c.d.id;saveProfile();notice=`已解锁${c.d.name}`;noticeT=1}else{notice='废土印记不足';noticeT=1}return true
  }return false;
 };
 if(handle(garageCards(START_KITS,150),'selectedKit','unlockedKits'))return;
 if(handle(garageCards(CHASSIS,425),'selectedChassis','unlockedChassis'))return;
 if(p.y>=775&&p.y<=847&&p.x>=75&&p.x<=465)startNewRun();
}
function draw(){
 ctx.clearRect(0,0,W,H);
 const shake=state==='roadcombat'&&!REDUCED_MOTION?(roadGame?.shake||0):0;
 if(shake>0){ctx.fillStyle=C.asphalt;ctx.fillRect(0,0,W,H);ctx.save();const phase=performance.now();ctx.translate(Math.sin(phase*.083)*shake,Math.sin(phase*.117+1.2)*shake*.65)}
 if(state==='menu')drawMenu();else if(state==='route')drawRoute();else if(state==='routeleave')drawRouteDeparture();else if(state==='roadcombat')drawRoad();else if(state==='roadresult')drawRoadResult(false);else if(state==='roadfail')drawRoadResult(true);else if(state==='play'||state==='finalassault')drawScavenge();else if(state==='pack')drawGridScreen('pack');else if(state==='vehicle')drawGridScreen('vehicle');else if(state==='town')drawTown();else if(state==='event')drawEvent();else if(state==='runsummary')drawRunSummary();else if(state==='garage')drawGarageMeta();else if(state==='dead'){drawDunes();text('你没能活着回来',270,330,26,C.red,'center',900);wrap('本次搜刮获得的新装备已经遗失。原型测试中，你的长期构筑仍会保留。',75,390,390,22,13,C.muted);btn(75,600,390,70,'返回路线图')}
 if(shake>0)ctx.restore();
}

function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();drawArtStatus();requestAnimationFrame(loop)}
ensureChoices();requestAnimationFrame(loop);
})();
