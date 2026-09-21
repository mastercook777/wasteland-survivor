(() => {
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
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

const C={bg:'#100f0b',panel:'#211f18',panel2:'#302b20',cream:'#f1e4c4',muted:'#9b927b',yellow:'#d9a52b',red:'#b94d37',green:'#708c55',blue:'#607d8d',teal:'#548c87',asphalt:'#302f2a',asphalt2:'#252620',sand:'#8b7655',sand2:'#695b45',outline:'#171812',white:'#f4ead2',gas:'#d7a12e',food:'#b86f43',scrap:'#9b9b91',med:'#bd5549',rust:'#8f4b32',dust:'#b79b6a',ink:'#15140f'};
const rnd=(a,b)=>Math.random()*(b-a)+a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=(x,y)=>{const m=Math.hypot(x,y)||1;return{x:x/m,y:y/m}};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const choice=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>[...a].sort(()=>Math.random()-.5);

const ITEM={
 pistol:{name:'9MM PISTOL',w:2,h:1,kind:'weapon',tag:'PST',color:'#a98554',sell:10,interval:.43,damage:1,range:220,speed:470,pellets:1},
 smg:{name:'SCRAP SMG',w:2,h:2,kind:'weapon',tag:'SMG',color:'#9f774c',sell:18,interval:.24,damage:1,range:205,speed:500,pellets:1},
 shotgun:{name:'SAWED-OFF',w:2,h:2,kind:'weapon',tag:'SG',color:'#8b6548',sell:22,interval:.82,damage:1,range:175,speed:430,pellets:5,spread:.34},
 rifle:{name:'SCOUT RIFLE',w:3,h:1,kind:'weapon',tag:'RFL',color:'#6f7658',sell:26,interval:.88,damage:2,range:360,speed:650,pellets:1},
 ammo:{name:'AMMO POUCH',w:1,h:2,kind:'support',tag:'AM',color:'#b28c45',sell:9},
 scope:{name:'OPTIC',w:1,h:1,kind:'support',tag:'OPT',color:'#6e8790',sell:12},
 apammo:{name:'AP ROUNDS',w:1,h:2,kind:'support',tag:'AP',color:'#897b59',sell:15},
 vest:{name:'KEVLAR VEST',w:2,h:2,kind:'armor',tag:'AR',color:'#567161',sell:16},
 medkit:{name:'FIELD MEDKIT',w:1,h:2,kind:'utility',tag:'MED',color:'#a94e45',sell:13},
 charm:{name:'LUCKY CHARM',w:1,h:1,kind:'trinket',tag:'★',color:'#7f6c91',sell:14},
 boots:{name:'RUNNER BOOTS',w:1,h:2,kind:'gear',tag:'BT',color:'#536c82',sell:12}
};
const VEH={
 mg:{name:'TWIN MACHINE GUN',w:2,h:1,kind:'weapon',tag:'MG',color:'#9a8456',sell:14},
 cannon:{name:'105MM CANNON',w:2,h:2,kind:'weapon',tag:'105',color:'#8b7450',sell:22},
 engine:{name:'V6 ENGINE',w:2,h:2,kind:'core',tag:'V6',color:'#58675c',sell:20},
 belt:{name:'BELT FEED',w:1,h:2,kind:'support',tag:'BELT',color:'#b28c45',sell:10},
 loader:{name:'AUTOLOADER',w:1,h:2,kind:'support',tag:'LOAD',color:'#6d7b73',sell:13},
 turbo:{name:'TURBO',w:1,h:2,kind:'support',tag:'T',color:'#657f91',sell:12},
 armor:{name:'ARMOR PLATE',w:2,h:1,kind:'armor',tag:'ARM',color:'#6a6d63',sell:11},
 fueltank:{name:'AUX FUEL TANK',w:2,h:1,kind:'utility',tag:'FUEL',color:'#9d8244',sell:14},
 rocket:{name:'ROCKET POD',w:2,h:1,kind:'weapon',tag:'RKT',color:'#8a5c4c',sell:18},
 emp:{name:'EMP COIL',w:2,h:1,kind:'weapon',tag:'EMP',color:'#5d8f91',sell:20},
 capacitor:{name:'CAPACITOR BANK',w:1,h:2,kind:'support',tag:'CAP',color:'#648a83',sell:13},
 flak:{name:'FLAK AUTOCANNON',w:2,h:1,kind:'weapon',tag:'FLK',color:'#8e7650',sell:18},
 arc:{name:'ARC EMITTER',w:2,h:1,kind:'weapon',tag:'ARC',color:'#5f8c9b',sell:21}
};
const EVOLUTIONS={
 pistol:[
  {id:'gunslinger',name:'GUNSLINGER',desc:'Fire rate +35% • damage -10%'},
  {id:'magnum',name:'MAGNUM',desc:'Damage +70% • fire rate -22%'}
 ],
 smg:[
  {id:'minigun',name:'MINIGUN',desc:'Fire rate +45% • damage -25%'},
  {id:'heavybolt',name:'HEAVY BOLT',desc:'Damage +55% • pierces 1 target'}
 ],
 shotgun:[
  {id:'scatter',name:'WIDE SCATTER',desc:'+3 pellets • wider spread • lower damage'},
  {id:'slug',name:'SLUG',desc:'Single heavy round • range +45%'}
 ],
 rifle:[
  {id:'rail',name:'RAIL SCOPE',desc:'Range +35% • pierces 2 targets'},
  {id:'hunter',name:'HUNTER',desc:'+75% damage vs elite / armored'}
 ]
};

const SITE={
 gas:{name:'ABANDONED GAS',short:'GAS STATION',icon:'G',focus:'FUEL / SCRAP',color:'#8f805f',loot:{gas:.44,food:.14,scrap:.30,med:.12},gear:.03,enemy:['melee','melee','gunner']},
 clinic:{name:'DESERT CLINIC',short:'CLINIC',icon:'+',focus:'MED / GEAR',color:'#77877d',loot:{gas:.07,food:.13,scrap:.22,med:.58},gear:.11,enemy:['gunner','grenadier','gunner','melee']},
 motel:{name:'SUNSET MOTEL',short:'MOTEL',icon:'M',focus:'FOOD / TRADE',color:'#8a6f59',loot:{gas:.11,food:.50,scrap:.25,med:.14},gear:.05,enemy:['melee','melee','grenadier']},
 junkyard:{name:'IRON GRAVEYARD',short:'JUNKYARD',icon:'J',focus:'SCRAP / MODULES',color:'#6c706a',loot:{gas:.16,food:.07,scrap:.63,med:.14},gear:.14,enemy:['gunner','melee','grenadier','gunner']}
};
const ROUTES=[
 {id:'old',name:'OLD HIGHWAY',risk:'STANDARD',bonus:'Balanced road',fuel:0,spawn:1},
 {id:'salt',name:'SALT FLATS',risk:'LEAN',bonus:'+2 fuel on arrival',fuel:1,spawn:.95},
 {id:'raider',name:'RAIDER CAUSEWAY',risk:'HIGH',bonus:'+2 salvage, better modules',fuel:2,spawn:1.22}
];

const WORLD_EVENTS=[
 {id:'convoy',name:'STRANDED CONVOY',short:'CONVOY',icon:'C',desc:'A merchant convoy sits dead on the shoulder. Their radiator is gone, but their cargo is intact.'},
 {id:'signal',name:'BLACK RADIO SIGNAL',short:'SIGNAL',icon:'?',desc:'A repeating distress signal comes from an abandoned relay tower. It could be bait. It could be treasure.'},
 {id:'mechanic',name:'LONE MECHANIC',short:'MECHANIC',icon:'W',desc:'A grease-covered mechanic waves you down beside a half-buried service truck.'},
 {id:'wreck',name:'FRESH WRECK',short:'WRECK',icon:'X',desc:'Smoke still rises from a raider wreck. Whoever won the fight left in a hurry.'}
];

const START_KITS=[
 {id:'gunslinger',name:'GUNSLINGER',desc:'Pistol + Ammo Pouch',cost:0},
 {id:'breacher',name:'BREACHER',desc:'Shotgun + Runner Boots',cost:2},
 {id:'hunter',name:'HUNTER',desc:'Scout Rifle + Optic',cost:2},
 {id:'mechanic',name:'MECHANIC',desc:'Pistol + Medkit • stronger vehicle supports',cost:2}
];
const CHASSIS=[
 {id:'junker',name:'JUNKER',desc:'Balanced',cost:0},
 {id:'scout',name:'SCOUT',desc:'Fast • light hull',cost:3},
 {id:'mule',name:'MULE',desc:'Big bay • high fuel',cost:3},
 {id:'bruiser',name:'BRUISER',desc:'Heavy hull • slower',cost:3}
];

let eventData=null;


function freshMeta(){return{
 nextId:3,nextVid:8,
 backpack:[{id:1,type:'pistol',level:1,gx:1,gy:1,locked:false},{id:2,type:'ammo',level:1,gx:3,gy:1,locked:false}],
 vehiclePack:[{id:1,type:'engine',level:1,gx:0,gy:1,locked:true},{id:2,type:'turbo',level:1,gx:2,gy:1},{id:3,type:'mg',level:1,gx:3,gy:0,locked:false},{id:4,type:'belt',level:1,gx:5,gy:0},{id:5,type:'cannon',level:1,gx:3,gy:2,locked:false},{id:6,type:'loader',level:1,gx:5,gy:2},{id:7,type:'armor',level:1,gx:0,gy:3}],
 pendingHaul:[],pendingVehicle:[],pack:{cols:6,rows:5,tier:1},vehicleGrid:{cols:6,rows:4,tier:1},
 roadLeg:1,runStep:0,selectedNode:null,mapChoices:[],arrived:false,credits:28,cargo:{gas:0,food:0,scrap:0,med:0},
 route:{...ROUTES[0]},town:{name:'RUSTWATER',demand:'med',locker:[],offerLeg:0,gearOffers:[],moduleOffers:[]},
 finalFlags:{mg:false,rocket:false,armor:false},runStats:{roadKills:0,scavKills:0,bosses:0,events:0},runEnded:null,pendingRoadEvent:null,nextSearchEffect:null,eventGap:0,chassis:'junker',
 vehicle:{name:'JUNKER MK.I',scrap:0,fuel:18,hull:null}
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

function activeWeapons(list,defs,max=2){
 return list.filter(i=>defs[i.type]?.kind==='weapon'&&i.gx!=null&&i.gy!=null)
  .sort((a,b)=>(a.gy-b.gy)||(a.gx-b.gx)||(a.id-b.id)).slice(0,max);
}
function weaponIsActive(it,list,defs,max=2){return activeWeapons(list,defs,max).some(x=>x.id===it.id)}
function weaponCount(list,defs,ignoreId=null){return list.filter(i=>i.id!==ignoreId&&defs[i.type]?.kind==='weapon').length}

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
 let s=meta.chassis==='scout'?{maxHull:6,maxFuel:22,speed:275,mgInterval:.22,flakCd:.82,arcCd:1.25,arcChains:3,cannonCd:3.15,rocketCount:0,rocketCd:3.55,empCount:0,empCd:5.2,empChains:1,armor:0,activeWeapons:[]}:
 meta.chassis==='mule'?{maxHull:8,maxFuel:34,speed:215,mgInterval:.22,flakCd:.82,arcCd:1.25,arcChains:3,cannonCd:3.15,rocketCount:0,rocketCd:3.55,empCount:0,empCd:5.2,empChains:1,armor:0,activeWeapons:[]}:
 meta.chassis==='bruiser'?{maxHull:12,maxFuel:22,speed:205,mgInterval:.22,flakCd:.82,arcCd:1.25,arcChains:3,cannonCd:3.15,rocketCount:0,rocketCd:3.55,empCount:0,empCd:5.2,empChains:1,armor:1,activeWeapons:[]}:
 {maxHull:8,maxFuel:24,speed:230,mgInterval:.22,flakCd:.82,arcCd:1.25,arcChains:3,cannonCd:3.15,rocketCount:0,rocketCd:3.55,empCount:0,empCd:5.2,empChains:1,armor:0,activeWeapons:[]};
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
  arr.push({id:'final-'+meta.roadLeg,type:'final',name:'RUST CATHEDRAL',short:'CATHEDRAL',icon:'Ω',focus:'FINAL ASSAULT',danger:3,special:true});
 }else if(bossDue){
  arr.push({id:'boss-'+meta.roadLeg,type:'boss',name:'IRON JACKAL',short:'IRON JACKAL',icon:'B',focus:'BOSS / RARE MODULE',danger:3,special:true});
  for(const t of types.slice(0,2))arr.push({id:t+'-'+meta.roadLeg+'-'+Math.random(),type:'scavenge',site:t,name:SITE[t].name,short:SITE[t].short,icon:SITE[t].icon,focus:SITE[t].focus,danger:2+Math.floor(Math.random()*2),special:Math.random()<.25});
 }else{
  if(townDue)arr.push({id:'town-'+meta.roadLeg,type:'town',name:'RUSTWATER',short:'RUSTWATER',icon:'T',focus:'TRADE / REPAIR',danger:0,special:false});
  const slots=3-arr.length;
  for(const t of types.slice(0,slots)){const danger=1+Math.floor(Math.random()*3);arr.push({id:t+'-'+meta.roadLeg+'-'+Math.random(),type:'scavenge',site:t,name:SITE[t].name,short:SITE[t].short,icon:SITE[t].icon,focus:SITE[t].focus,danger,special:Math.random()<.17});}
 }
 meta.mapChoices=shuffle(arr);
}
function selectNode(i){ensureChoices();meta.selectedNode=meta.mapChoices[i]||meta.mapChoices[0];save();}
function fuelCost(){const n=meta.selectedNode;if(!n)return 0;if(n.type==='town')return 2;if(n.type==='final')return 6+(meta.route.fuel||0);if(n.type==='boss')return 5+(meta.route.fuel||0);return 2+(n.danger||1)+(meta.route.fuel||0)}
function destinationName(){return meta.selectedNode?.name||'UNKNOWN'}
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
 roadGame={duration,time:duration,elapsed:0,scroll:0,spawn:.6,mine:4.8,boss:false,bossRoute,finalRoute,bossSpawned:false,bossDefeated:false,colossusY:-190,dry,cost,threat,build:vs,player:{x:270,y:800,w:52,h:78,hp:meta.vehicle.hull==null?vs.maxHull:Math.min(meta.vehicle.hull,vs.maxHull),max:vs.maxHull,speed:vs.speed*(dry?.76:1),inv:0,mg:0,flak:.55,arc:.8,cannon:.9,rocket:1.1,emp:1.6},enemies:[],bullets:[],enemyBullets:[],mines:[],strikes:[],barriers:[],barrierTimer:8.5,drops:[],fx:[],kills:0,scrap:0,fuel:0,repairs:0};
 state='roadcombat';
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
 roadGame.enemies.push({rid:Math.random().toString(36).slice(2),type,x:rnd(55,485),y:rnd(-160,-60),...cfg,maxHp:cfg.hp,shootCd:cfg.shoot*shootScale,sway:rnd(-1,1),ram:0,shootScale});
}
function spawnColossus(){
 const g=roadGame,phase=.35,parts=[
  {type:'col_armor',part:'armor',baseX:270,offY:-58,hp:55,w:110,h:72,shoot:99,score:8},
  {type:'col_mg',part:'mg',baseX:175,offY:8,hp:38,w:70,h:68,shoot:.34,score:8},
  {type:'col_rocket',part:'rocket',baseX:365,offY:8,hp:42,w:70,h:68,shoot:.88,score:8},
  {type:'col_engine',part:'engine',baseX:270,offY:78,hp:82,w:96,h:76,shoot:99,score:16}
 ];
 for(const q of parts)g.enemies.push({rid:Math.random().toString(36).slice(2),group:'colossus',sway:phase,spd:0,x:q.baseX,y:g.colossusY+q.offY,baseX:q.baseX,offY:q.offY,type:q.type,part:q.part,hp:q.hp,maxHp:q.hp,w:q.w,h:q.h,shoot:q.shoot,shootCd:q.shoot,ram:0,score:q.score,shootScale:1});
}
function roadTarget(g,p,max=520){
 const parts=g.enemies.filter(e=>e.group==='colossus'&&e.y<=p.y+20&&distance(p,e)<max);
 if(g.finalRoute&&parts.length){
  const armorAlive=parts.some(e=>e.part==='armor');let best=null,score=1e9;
  for(const e of parts){
   let s=Math.abs(e.x-p.x)*1.65+Math.abs(e.y-p.y)*.12;
   if(e.part==='engine'&&armorAlive)s+=180;
   if(p.x<205&&e.part==='mg')s-=120;
   if(p.x>335&&e.part==='rocket')s-=120;
   if(p.x>=205&&p.x<=335&&e.part==='armor')s-=90;
   if(s<score){score=s;best=e}
  }
  if(best)return best;
 }
 let t=null,b=1e9;for(const e of g.enemies){if(e.y>p.y+20)continue;const d=distance(p,e);if(d<max&&d<b){t=e;b=d}}return t;
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
 for(const e of chain){
  const mult=roadIsHeavy(e)?.35:1,damage=e.type==='bike'?2.4:e.type==='buggy'?2.0:1.55;
  e.hp-=damage*mult;e.disabled=Math.max(e.disabled||0,.22);g.fx.push({x:e.x,y:e.y,r:26,life:.16,color:C.teal});
 }
 for(let i=g.enemies.length-1;i>=0;i--)if(g.enemies[i].hp<=0)killRoad(i);
 notice=`ARC CHAIN ×${chain.length}`;noticeT=.45;return true;
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
 for(const e of hit){e.disabled=Math.max(e.disabled||0,e.group==='colossus'?1.8:2.8);e.hp-=.5;g.fx.push({x:e.x,y:e.y,r:42,life:.32,color:C.teal})}
 for(let i=g.enemies.length-1;i>=0;i--)if(g.enemies[i].hp<=0)killRoad(i);
 const centers=hit;
 g.enemyBullets=g.enemyBullets.filter(b=>!centers.some(e=>Math.hypot(b.x-e.x,b.y-e.y)<175));
 g.mines=g.mines.filter(m=>!centers.some(e=>Math.hypot(m.x-e.x,m.y-e.y)<135));
 if(g.strikes){const ids=new Set(hit.map(e=>e.rid));g.strikes=g.strikes.filter(st=>!ids.has(st.ownerId)&&!centers.some(e=>Math.hypot(st.x-e.x,st.y-e.y)<190));}
 notice=`EMP PULSE • ${hit.length} TARGET${hit.length>1?'S':''}`;noticeT=.8;return true;
}
function fireRoad(kind,target){
 const g=roadGame,p=g.player,cfg=kind==='mg'?{spd:840,dmg:1,r:5}:kind==='cannon'?{spd:720,dmg:8.5,r:10}:{spd:570,dmg:2.2,r:8};
 const sx=p.x,sy=p.y-38,aim=roadIntercept(target,sx,sy,cfg.spd,kind),n=norm(aim.x-sx,aim.y-sy);
 g.bullets.push({x:sx,y:sy,vx:n.x*cfg.spd,vy:n.y*cfg.spd,life:1.9,damage:cfg.dmg,kind,r:cfg.r,targetId:target.rid,homing:kind==='mg'?5.5:kind==='cannon'?9.5:12});
 if(kind==='cannon')g.fx.push({x:p.x,y:p.y-55,r:8,life:.18,color:C.yellow});
}
function hurtRoad(n){const p=roadGame.player;if(p.inv>0)return;p.hp-=n;p.inv=.45;roadGame.fx.push({x:p.x,y:p.y,r:35,life:.25,color:C.red});}
function killRoad(i){
 const g=roadGame,e=g.enemies[i];
 if(e.type==='dreadnought'){g.bossDefeated=true;meta.runStats.bosses++}
 if(e.group==='colossus'){
  if(e.part==='engine'){g.bossDefeated=true;meta.runStats.bosses++}
  else if(e.part==='mg'||e.part==='rocket'||e.part==='armor')meta.finalFlags[e.part]=true;
 }
 meta.runStats.roadKills++;g.kills+=e.score;g.fx.push({x:e.x,y:e.y,r:e.w*.7,life:.35,color:'#dd8040'});
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
 const pool=['belt','loader','turbo','armor','fueltank','rocket','emp','capacitor','flak','arc'],final=meta.selectedNode?.type==='final',boss=meta.selectedNode?.type==='boss',t=choice(pool),lv=boss?2:(meta.selectedNode?.danger===3&&Math.random()<.25?2:1);
 if(final){g.reward='armor';g.rewardLv=3;state='roadresult';save();return}
 meta.pendingVehicle.push(makeVehicle(t,lv));g.reward=t;g.rewardLv=lv;
 if(boss){meta.pendingVehicle.push(makeVehicle(choice(pool),2));meta.credits+=35}
 else if(meta.route.id==='raider'&&Math.random()<.55)meta.pendingVehicle.push(makeVehicle(choice(pool),1));
 state='roadresult';save();
}
function roadHitDamage(g,e,kind,base){
 let dmg=base*roadDamageMultiplier(kind,e);
 if(e.type==='col_engine'&&g.enemies.some(x=>x.type==='col_armor'))dmg*=.14;
 if(kind==='cannon')e.disabled=Math.max(e.disabled||0,e.group==='colossus'?.28:.55);
 e.hp-=dmg;return dmg;
}
function updateRoad(dt){const g=roadGame,p=g.player;g.elapsed+=dt;g.time=Math.max(0,g.duration-g.elapsed);g.scroll+=340*dt;g.spawn-=dt;g.mine-=dt;p.inv=Math.max(0,p.inv-dt);p.mg-=dt;p.flak-=dt;p.arc-=dt;p.cannon-=dt;p.rocket-=dt;p.emp-=dt;moveActor(p,dt,p.speed,38,502,155,900);
 const t=roadTarget(g,p,560);
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
 if(Math.abs(b.x-e.x)<e.w*.62+b.r&&Math.abs(b.y-e.y)<e.h*.58+b.r){
  hit=true;
  if(b.kind==='rocket'){
   const hx=e.x,hy=e.y,rad=b.splash||68;
   for(let k=g.enemies.length-1;k>=0;k--){const v=g.enemies[k];if(Math.hypot(v.x-hx,v.y-hy)<=rad){roadHitDamage(g,v,'rocket',b.damage);if(v.hp<=0)killRoad(k)}}
   g.fx.push({x:hx,y:hy,r:rad,life:.25,color:'#d97642'});
  }else{
   roadHitDamage(g,e,b.kind,b.damage);
   g.fx.push({x:b.x,y:b.y,r:b.kind==='cannon'?26:b.kind==='flak'?14:8,life:.18,color:b.kind==='cannon'?'#e0ad36':b.kind==='flak'?'#d9c084':C.yellow});
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
 if(!disabled)e.shootCd-=dt;e.ram-=dt;
 if(!disabled&&e.shootCd<=0&&e.y>80&&e.y<p.y-110&&e.type==='missilevan'){
  const leadX=clamp(p.x+(joy.dx||0)*55+rnd(-25,25),55,485),leadY=clamp(p.y+(joy.dy||0)*45+rnd(-18,18),180,900);
  g.strikes.push({x:leadX,y:leadY,r:64,t:1.15,damage:2,ownerId:e.rid});
  if(g.threat>1.32)g.strikes.push({x:clamp(leadX+rnd(-120,120),55,485),y:clamp(leadY+rnd(-100,100),180,900),r:52,t:1.35,damage:1,ownerId:e.rid});
  e.shootCd=e.shoot*e.shootScale*rnd(.92,1.12);
 }else if(!disabled&&e.shootCd<=0&&e.y>80&&e.y<p.y-110&&e.type!=='bike'&&e.type!=='col_armor'&&e.type!=='col_engine'){
 const a=Math.atan2(p.y-e.y,p.x-e.x),isMG=e.type==='col_mg',isRkt=e.type==='col_rocket',shots=isMG?5:isRkt?3:e.type==='dreadnought'?5:e.type==='wartruck'?3:1,spread=isRkt?.18:isMG?.095:.12,spd=isRkt?300:isMG?440:360,damage=isRkt?2:1;
 for(let q=0;q<shots;q++){const aa=a+(q-(shots-1)/2)*spread;g.enemyBullets.push({x:e.x,y:e.y+e.h*.35,vx:Math.cos(aa)*spd,vy:Math.sin(aa)*spd,life:isRkt?3.3:2.8,damage,heavy:isRkt})}
 e.shootCd=e.shoot*e.shootScale*(e.type==='wartruck'?.9:rnd(.9,1.15))
}if(Math.abs(e.x-p.x)<(e.w+p.w)*.42&&Math.abs(e.y-p.y)<(e.h+p.h)*.42&&e.ram<=0){hurtRoad(e.type==='truck'||e.type==='wartruck'?2:1);e.hp-=2;e.ram=.8;if(e.hp<=0){killRoad(i);continue}}if(e.y>1030)g.enemies.splice(i,1)}
 for(let i=g.enemyBullets.length-1;i>=0;i--){const b=g.enemyBullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.abs(b.x-p.x)<25+(b.heavy?5:0)&&Math.abs(b.y-p.y)<33+(b.heavy?5:0)){hurtRoad(b.damage||1);g.enemyBullets.splice(i,1);continue}if(b.life<=0||b.y>1000)g.enemyBullets.splice(i,1)}
 for(let i=g.strikes.length-1;i>=0;i--){
  const st=g.strikes[i];st.t-=dt;
  if(st.t<=0){if(Math.hypot(p.x-st.x,p.y-st.y)<st.r)hurtRoad(st.damage||2);g.fx.push({x:st.x,y:st.y,r:st.r,life:.32,color:'#cf6844'});g.strikes.splice(i,1)}
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
 if(g.mine<=0&&g.elapsed>7){g.mines.push({x:rnd(55,485),y:-25,r:16});if(g.threat>1.05&&g.elapsed/g.duration>.65&&Math.random()<Math.min(.4,(g.threat-1)*.8))g.mines.push({x:rnd(55,485),y:-70,r:16});g.mine=rnd(4.0,5.8)/g.threat}for(let i=g.mines.length-1;i>=0;i--){const m=g.mines[i];m.y+=210*dt;if(distance(m,p)<38){hurtRoad(2);g.fx.push({x:m.x,y:m.y,r:32,life:.3,color:'#db7c3f'});g.mines.splice(i,1);continue}if(m.y>990)g.mines.splice(i,1)}
 for(let i=g.drops.length-1;i>=0;i--){const d=g.drops[i];d.y+=145*dt;if(distance(d,p)<42){if(d.type==='scrap')g.scrap++;else if(d.type==='fuel')g.fuel++;else if(d.type==='repair'){const before=p.hp;p.hp=Math.min(p.max,p.hp+2);if(p.hp>before){g.repairs++;notice='FIELD REPAIR +2 HULL';noticeT=1.1}}g.drops.splice(i,1);continue}if(d.y>980)g.drops.splice(i,1)}for(let i=g.fx.length-1;i>=0;i--){g.fx[i].life-=dt;if(g.fx[i].life<=0)g.fx.splice(i,1)}
 if(g.bossRoute&&!g.bossSpawned&&g.elapsed>6){g.bossSpawned=true;g.boss=true;if(g.finalRoute)spawnColossus();else spawnRoadEnemy('dreadnought')}
 else if(!g.bossRoute&&!g.boss&&g.elapsed/g.duration>.76){g.boss=true;spawnRoadEnemy('boss')}
 if(g.spawn<=0){if(!g.bossRoute||!g.bossSpawned||g.enemies.filter(e=>e.group!=='colossus'&&e.type!=='dreadnought').length<(g.finalRoute?4:4)){spawnRoadEnemy();const extraChance=clamp((g.threat-.9)*.5,0,.30);if(!g.bossRoute&&g.elapsed/g.duration>.52&&Math.random()<extraChance)spawnRoadEnemy()}g.spawn=rnd(.95,1.35)/(meta.route.spawn||1)/g.threat}
 if(p.hp<=0){meta.arrived=false;finishRun(false);return}
 if(g.bossRoute&&g.bossDefeated){finishRoadSuccess();return}
 if(g.time<=0){if(g.bossRoute&&!g.bossDefeated){meta.arrived=false;finishRun(false);return}finishRoadSuccess();return}}

function buildSiteLayout(site,variant){const obs=[];const add=(x,y,w,h)=>obs.push({x,y,w,h});if(site==='gas'){add(75,170,155,70);add(310,160,135,55);add(110,350,120,55);add(320,360,100,85);add(90,560,52,105);add(398,560,52,105)}else if(site==='clinic'){add(68,170,130,58);add(340,160,125,58);add(205,310,130,50);add(72,460,145,62);add(325,470,142,62);add(208,635,125,52)}else if(site==='motel'){add(55,150,170,100);add(315,150,170,100);add(55,370,170,105);add(315,370,170,105);add(185,585,170,70)}else{add(65,160,80,130);add(190,190,145,65);add(390,145,80,145);add(75,410,130,70);add(290,370,155,80);add(170,600,95,80);add(350,610,100,75)}if(variant===1)for(const o of obs)o.x=540-o.x-o.w;if(variant===2)for(let i=0;i<obs.length;i++)if(i%2)obs[i].y+=55;return obs}
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
 const g=game,w=FINAL_WAVES[idx]||[];g.wave=idx+1;g.finalLabel=['OUTER YARD','WORKSHOP','COMMAND HALL'][idx]||'THE DRIVER';
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
 game={site:'junkyard',finalAssault:true,finalLabel:'OUTER YARD',wave:0,driverSpawned:false,driverDefeated:false,driverAdds1:false,driverAdds2:false,time:180,elapsed:0,worldH,cameraY:290,player:{x:270,y:1120,r:15,hp:b.maxHp,max:b.maxHp,speed:b.speed,inv:0,med:b.medCharges},build:b,obstacles,crates:[],loot:[],enemies:[],bullets:[],enemyBullets:[],grenades:[],fx:[],haul:[],weaponCd:b.weapons.map(w=>({...w,cd:rnd(0,.25)})),exit:{x:270,y:1180,progress:0},search:null,spawn:999,supportMg:.7,supportRocket:1.7};
 spawnFinalWave(0);state='finalassault';
}
function spawnDriverAdds(kind){
 const g=game,defs=kind===1?[{type:'armored',x:105,y:520},{type:'gunner',x:430,y:520},{type:'melee',x:270,y:600}]:
 [{type:'grenadier',x:105,y:420},{type:'armored',x:430,y:430},{type:'melee',x:190,y:560},{type:'melee',x:355,y:560}];
 for(const q of defs){let e=makeScavEnemy(q.type,q.x,q.y);let tries=0;while(!validScavSpawn(e)&&tries++<20){e.x=clamp(e.x+rnd(-30,30),45,495);e.y=clamp(e.y+rnd(-30,30),230,g.worldH-120)}if(validScavSpawn(e))g.enemies.push(e)}
 notice=kind===1?'DRIVER CALLS REINFORCEMENTS':'LAST STAND';noticeT=1.4;
}
function spawnDriver(){
 const g=game,e=makeScavEnemy('driver',270,255);g.driverSpawned=true;g.finalLabel='THE DRIVER';e.attackSeq=0;g.enemies.push(e);notice='THE DRIVER';noticeT=1.5;
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
 if(g.time<=0){notice='CATHEDRAL OVERRUN';noticeT=1;finishRun(false)}
}
function startScavenge(){
 const site=meta.selectedNode?.site||'gas',danger=meta.selectedNode?.danger||1,special=!!meta.selectedNode?.special,b=buildStats(),travelEffect=meta.nextSearchEffect;
 meta.nextSearchEffect=null;
 const worldH=1450,scaleY=1.35,yOffset=130;
 const rules={
  gas:{label:'FUEL CACHE',extraCrates:2,pressure:1},
  clinic:{label:'TRIAGE',extraCrates:0,pressure:1,med:1},
  motel:{label:'AMBUSH',extraCrates:1,pressure:1.28},
  junkyard:{label:'SALVAGE FIELD',extraCrates:0,pressure:1,moduleBoost:2}
 },baseRule=rules[site]||{label:'STANDARD',extraCrates:0,pressure:1},rule={...baseRule,pressure:(baseRule.pressure||1)*(travelEffect?.pressure||1)};
 const obstacles=buildSiteLayout(site,Math.floor(Math.random()*3)).map(o=>({...o,y:Math.round(o.y*scaleY+yOffset)}));
 game={site,danger,special,rule,effectLabel:travelEffect?.label||'',time:90,elapsed:0,worldH,cameraY:0,player:{x:270,y:1240,r:15,hp:Math.max(1,b.maxHp-(travelEffect?.hpLoss||0)),max:b.maxHp,speed:b.speed,inv:0,med:b.medCharges+(rule.med||0)},build:b,obstacles,crates:[],loot:[],enemies:[],bullets:[],enemyBullets:[],grenades:[],fx:[],haul:[],weaponCd:b.weapons.map(w=>({...w,cd:rnd(0,.25)})),exit:{x:270,y:1330,progress:0},search:null,spawn:.2};
 const spots=[[100,120],[270,135],[440,120],[105,300],[430,310],[90,690],[450,700],[270,530],[270,260]];
 shuffle(spots).slice(0,Math.min(spots.length,5+danger+(rule.extraCrates||0))).forEach((p,i)=>game.crates.push({x:p[0]+rnd(-12,12),y:Math.round(p[1]*scaleY+yOffset+rnd(-12,12)),opened:false,rare:special&&i===0,progress:0}));
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
function hurtPlayer(n){const p=game.player;if(p.inv>0)return;p.hp-=n;p.inv=.55;game.fx.push({x:p.x,y:p.y,r:28,life:.28,color:C.red});if(p.hp<=2&&p.med>0){p.med--;p.hp=Math.min(p.max,p.hp+2);notice='MEDKIT AUTO-USED';noticeT=1.2}}
function chooseLoot(){const w=SITE[game.site].loot,r=Math.random();let a=0;for(const k of ['gas','food','scrap','med']){a+=w[k];if(r<a)return k}return'scrap'}
function gearDrop(rare=false){const chance=.12+SITE[game.site].gear+game.build.luck+(rare?.35:0);if(Math.random()>chance)return null;const pool=['ammo','scope','apammo','vest','medkit','charm','boots','smg','shotgun','rifle'];return makeItem(choice(pool),rare&&Math.random()<.45?2:1)}
function openCrate(c){c.opened=true;const n=c.rare?3:1+Math.floor(Math.random()*2);for(let i=0;i<n;i++){const t=chooseLoot();meta.cargo[t]++;game.loot.push({x:c.x+rnd(-18,18),y:c.y+rnd(-18,18),type:t,life:1.2})}const g=gearDrop(c.rare);if(g)game.haul.push(g);if(game.site==='junkyard'&&Math.random()<(c.rare?.55:.12*(game.rule?.moduleBoost||1)))meta.pendingVehicle.push(makeVehicle(choice(['belt','loader','turbo','armor','fueltank','rocket','emp','capacitor','flak','arc']),c.rare&&Math.random()<.25?2:1));notice=c.rare?'RARE CACHE OPENED':'SUPPLIES SECURED';noticeT=.8;save()}
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
function fireScav(w,target){const p=game.player,base=Math.atan2(target.y-p.y,target.x-p.x);for(let i=0;i<w.pellets;i++){const a=base+(i-(w.pellets-1)/2)*(w.spread||0);game.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,life:w.range/w.speed,damage:w.damage,r:w.pellets>1?3:4,pierce:w.pierce||0,ap:w.ap||0,eliteBonus:w.eliteBonus||0,hitIds:[]})}}
function updateScavenge(dt){const g=game,p=g.player;g.elapsed+=dt;g.time=Math.max(0,(g.finalAssault?180:90)-g.elapsed);p.inv=Math.max(0,p.inv-dt);let mx=0,my=0;if(keys.has('a')||keys.has('arrowleft'))mx--;if(keys.has('d')||keys.has('arrowright'))mx++;if(keys.has('w')||keys.has('arrowup'))my--;if(keys.has('s')||keys.has('arrowdown'))my++;mx+=joy.dx;my+=joy.dy;if(Math.hypot(mx,my)>.08){const n=norm(mx,my);moveWithObstacles(p,n.x*p.speed*dt,n.y*p.speed*dt,p.r,g.obstacles,[28,512,170,g.worldH-90])}const cameraTarget=clamp(p.y-620,0,g.worldH-H);g.cameraY+=(cameraTarget-g.cameraY)*Math.min(1,dt*7);
 for(const w of g.weaponCd){w.cd-=dt;if(w.cd<=0){let t=null,b=1e9;for(const e of g.enemies){const d=distance(p,e);if(d<w.range&&d<b){b=d;t=e}}if(t){fireScav(w,t);w.cd=w.interval}}}
 for(let i=g.bullets.length-1;i>=0;i--){const b=g.bullets[i],ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=segmentHitsObstacle(ox,oy,b.x,b.y,g.obstacles,b.r);if(!hit)for(let j=g.enemies.length-1;j>=0;j--){
 const e=g.enemies[j];if((b.hitIds||[]).includes(e.eid))continue;
 if(distance(b,e)<e.r+b.r){
  let dmg=b.damage;
  if(e.type==='armored')dmg*=b.ap>0?1.15:.40;
  if(e.type==='driver'&&!meta.finalFlags.armor)dmg*=.55;
  if((e.type==='elite'||e.type==='armored'||e.type==='driver')&&b.eliteBonus)dmg*=1+b.eliteBonus;
  e.hp-=dmg;(b.hitIds||(b.hitIds=[])).push(e.eid);
  g.fx.push({x:b.x,y:b.y,r:7,life:.15,color:b.ap>0?C.teal:C.yellow});
  if(e.hp<=0){meta.runStats.scavKills++;if(e.type==='driver')g.driverDefeated=true;if(!g.finalAssault&&Math.random()<.08+g.build.luck){const gear=gearDrop(false);if(gear)g.haul.push(gear)}g.enemies.splice(j,1)}
  if((b.pierce||0)>0)b.pierce--;else hit=true;
  break
 }
}if(hit||b.life<=0)g.bullets.splice(i,1)}
 for(let i=g.enemies.length-1;i>=0;i--){
 const e=g.enemies[i],d=distance(e,p),bounds=[25,515,170,g.worldH-80];
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
 it.evolution=opts[index].id;evolutionChoice=null;notice=`EVOLVED: ${opts[index].name}`;noticeT=1.5;save();
}
function evolutionTap(p){
 if(!evolutionChoice)return false;
 if(p.y>=565&&p.y<=685&&p.x>=45&&p.x<=255){chooseEvolution(0);return true}
 if(p.y>=565&&p.y<=685&&p.x>=285&&p.x<=495){chooseEvolution(1);return true}
 return true;
}
function packDown(p){if(evolutionChoice){evolutionTap(p);return}const g=packGeom();if(p.x>=298&&p.x<=512&&p.y>=822&&p.y<=888){finishPack();return}let it=hitGridItem(p,meta.backpack,ITEM,g);if(it){packDrag={source:'grid',item:it,ox:p.x-(g.x+it.gx*g.cell),oy:p.y-(g.y+it.gy*g.cell),gx:it.gx,gy:it.gy,x:p.x,y:p.y};return}for(const c of packPendingCards())if(p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h){packDrag={source:'pending',item:c.it,ox:g.cell*.45,oy:g.cell*.45,x:p.x,y:p.y};return}}
function packUp(p){if(!packDrag)return;const g=packGeom(),it=packDrag.item,d=ITEM[it.type];const target=hitGridItem(p,meta.backpack,ITEM,g);if(target&&target.id!==it.id&&target.type===it.type&&(target.level||1)<3&&!it.locked){target.level++;if(packDrag.source==='grid')meta.backpack=meta.backpack.filter(x=>x.id!==it.id);else meta.pendingHaul=meta.pendingHaul.filter(x=>x.id!==it.id);notice=`FUSED ${d.name} → L${target.level}`;noticeT=1.5;if(target.level>=3&&ITEM[target.type].kind==='weapon'&&EVOLUTIONS[target.type]&&!target.evolution)evolutionChoice={itemId:target.id,type:target.type};packDrag=null;save();return}if(p.y>820&&p.x<245){if(it.locked){notice='STARTER ITEM LOCKED';noticeT=1}else{if(packDrag.source==='grid')meta.backpack=meta.backpack.filter(x=>x.id!==it.id);else meta.pendingHaul=meta.pendingHaul.filter(x=>x.id!==it.id);if(packReturn==='town'){const gain=d.sell*(it.level||1);meta.credits+=gain;notice=`SOLD +¢${gain}`}else notice='LEFT BEHIND';noticeT=1.2}packDrag=null;save();return}const gx=Math.floor((p.x-packDrag.ox-g.x+g.cell*.5)/g.cell),gy=Math.floor((p.y-packDrag.oy-g.y+g.cell*.5)/g.cell);if(packDrag.source==='pending'&&ITEM[it.type].kind==='weapon'&&weaponCount(meta.backpack,ITEM)>=2){notice='2 WEAPON CORES MAX';noticeT=1.2}
 else if(occupiedCanPlace(it,gx,gy,meta.backpack,ITEM,g.cols,g.rows,packDrag.source==='grid'?it.id:null)){it.gx=gx;it.gy=gy;if(packDrag.source==='pending'){meta.pendingHaul=meta.pendingHaul.filter(x=>x.id!==it.id);meta.backpack.push(it)}notice='BUILD UPDATED';noticeT=.7}else if(packDrag.source==='grid'){it.gx=packDrag.gx;it.gy=packDrag.gy}packDrag=null;save()}

function startVehicleBay(returnState='route'){vehicleReturn=returnState;vehicleDrag=null;state='vehicle'}
function vehicleCards(){const g=vehicleGeom(),y=Math.min(g.bottom+20,650);return meta.pendingVehicle.slice(0,4).map((it,i)=>({it,x:35+(i%2)*240,y:y+Math.floor(i/2)*72,w:225,h:58}))}
function vehicleDown(p){const g=vehicleGeom();if(p.x>=298&&p.x<=512&&p.y>=822&&p.y<=888){state=vehicleReturn;save();return}let it=hitGridItem(p,meta.vehiclePack,VEH,g);if(it){vehicleDrag={source:'grid',item:it,ox:p.x-(g.x+it.gx*g.cell),oy:p.y-(g.y+it.gy*g.cell),gx:it.gx,gy:it.gy,x:p.x,y:p.y};return}for(const c of vehicleCards())if(p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h){vehicleDrag={source:'pending',item:c.it,ox:g.cell*.45,oy:g.cell*.45,x:p.x,y:p.y};return}}
function vehicleUp(p){if(!vehicleDrag)return;const g=vehicleGeom(),it=vehicleDrag.item,d=VEH[it.type];const target=hitGridItem(p,meta.vehiclePack,VEH,g);if(target&&target.id!==it.id&&target.type===it.type&&(target.level||1)<3&&!it.locked){target.level++;if(vehicleDrag.source==='grid')meta.vehiclePack=meta.vehiclePack.filter(x=>x.id!==it.id);else meta.pendingVehicle=meta.pendingVehicle.filter(x=>x.id!==it.id);notice=`FUSED ${d.name} → L${target.level}`;noticeT=1.5;vehicleDrag=null;save();return}if(p.y>820&&p.x<245){if(it.locked){notice='CORE MODULE LOCKED';noticeT=1}else{if(vehicleDrag.source==='grid')meta.vehiclePack=meta.vehiclePack.filter(x=>x.id!==it.id);else meta.pendingVehicle=meta.pendingVehicle.filter(x=>x.id!==it.id);if(vehicleReturn==='town'){const gain=d.sell*(it.level||1);meta.credits+=gain;notice=`SOLD +¢${gain}`}else{meta.vehicle.scrap+=1;notice='+1 SALVAGE'}noticeT=1}vehicleDrag=null;save();return}const gx=Math.floor((p.x-vehicleDrag.ox-g.x+g.cell*.5)/g.cell),gy=Math.floor((p.y-vehicleDrag.oy-g.y+g.cell*.5)/g.cell);if(vehicleDrag.source==='pending'&&VEH[it.type].kind==='weapon'&&weaponCount(meta.vehiclePack,VEH)>=2){notice='2 HARDPOINTS MAX';noticeT=1.2}
 else if(occupiedCanPlace(it,gx,gy,meta.vehiclePack,VEH,g.cols,g.rows,vehicleDrag.source==='grid'?it.id:null)){it.gx=gx;it.gy=gy;if(vehicleDrag.source==='pending'){meta.pendingVehicle=meta.pendingVehicle.filter(x=>x.id!==it.id);meta.vehiclePack.push(it)}}else if(vehicleDrag.source==='grid'){it.gx=vehicleDrag.gx;it.gy=vehicleDrag.gy}vehicleDrag=null;save()}

function buildIdentity(){
 const ws=activeWeapons(meta.backpack,ITEM,2),e=ws.find(w=>w.evolution);if(e)return (EVOLUTIONS[e.type]?.find(x=>x.id===e.evolution)?.name||ITEM[e.type].name);
 return ws.map(w=>ITEM[w.type].name).join(' + ')||'UNARMED';
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
   if(meta.vehicle.fuel<4)return say('NEED 4 FUEL');
   meta.vehicle.fuel-=4;meta.credits+=45;meta.pendingHaul.push(makeItem(choice(['scope','apammo','medkit','boots']),2));say('CONVOY TRADE: BIG PAYOUT');
  }else{
   meta.vehicle.scrap+=3;meta.pendingHaul.push(makeItem(choice(['smg','shotgun','rifle']),2));meta.vehicle.hull=Math.max(1,h-2);
   meta.nextSearchEffect={pressure:1.20,extraEnemies:2,label:'CONVOY RETALIATION'};say('CARGO TAKEN • HULL -2');
  }
 }else if(id==='signal'){
  if(choiceIndex===0){
   meta.pendingHaul.push(makeItem(choice(['smg','shotgun','rifle']),Math.random()<.28?3:2));meta.credits+=20;
   meta.nextSearchEffect={hpLoss:2,pressure:1.38,extraEnemies:3,label:'SIGNAL AMBUSH'};say('CACHE FOUND • AMBUSH AHEAD');
  }else{
   meta.vehicle.fuel=Math.min(vs.maxFuel,meta.vehicle.fuel+4);meta.credits+=8;say('+4 FUEL • +¢8');
  }
 }else if(id==='mechanic'){
  if(choiceIndex===0){
   if(meta.credits<30)return say('NEED ¢30');
   meta.credits-=30;meta.vehicle.hull=vs.maxHull;meta.pendingVehicle.push(makeVehicle(choice(['belt','loader','turbo','armor','fueltank','emp','capacitor','flak','arc']),2));say('FULL OVERHAUL + LV2 MODULE');
  }else{
   meta.vehicle.scrap+=4;meta.vehicle.fuel=Math.max(0,meta.vehicle.fuel-2);
   meta.nextSearchEffect={pressure:1.18,extraEnemies:1,label:'NOISY SALVAGE'};say('+4 SALVAGE • FUEL -2');
  }
 }else if(id==='wreck'){
  if(choiceIndex===0){
   meta.pendingVehicle.push(makeVehicle(choice(['rocket','armor','fueltank','loader','belt','emp','capacitor','flak','arc']),2));meta.pendingHaul.push(makeItem(choice(['ammo','scope','apammo','vest']),2));
   meta.vehicle.hull=Math.max(1,h-3);meta.nextSearchEffect={pressure:1.25,extraEnemies:2,label:'RAIDER PURSUIT'};say('DOUBLE LOOT • HULL -3');
  }else{
   meta.credits+=28;meta.vehicle.fuel=Math.min(vs.maxFuel,meta.vehicle.fuel+1);say('+¢28 • +1 FUEL');
  }
 }
 meta.pendingRoadEvent=null;eventData=null;save();startScavenge();
}
function enterTown(){state='town';townPanel=null;townWorld={player:{x:270,y:790,r:14},near:null};meta.arrived=false;if(meta.town.offerLeg!==meta.roadLeg){meta.town.demand=choice(['gas','food','scrap','med']);meta.town.gearOffers=shuffle(['ammo','scope','apammo','vest','medkit','boots','smg','shotgun','rifle']).slice(0,3).map(type=>({type,cost:Math.round(ITEM[type].sell*1.8),sold:false}));meta.town.moduleOffers=shuffle(['belt','loader','turbo','armor','fueltank','rocket','emp','capacitor','flak','arc']).slice(0,3).map(type=>({type,credits:Math.round(VEH[type].sell*1.7),salvage:2+Math.floor(VEH[type].sell/10),sold:false}));meta.town.offerLeg=meta.roadLeg}save()}
function townPrice(t){const base={gas:5,food:4,scrap:6,med:9}[t];return Math.round(base*(meta.town.demand===t?1.7:1))}
function say(s){notice=s;noticeT=1.5}
const TOWN_SPOTS=[
 {id:'market',x:28,y:190,w:210,h:145,title:'SCRAP MARKET',sub:'SELL CARGO',sign:'¢'},
 {id:'fuel',x:302,y:180,w:210,h:150,title:'FUEL DEPOT',sub:'REFUEL JUNKER',sign:'F'},
 {id:'garage',x:22,y:395,w:225,h:155,title:'GARAGE',sub:'REPAIR / MODULES',sign:'W'},
 {id:'armory',x:305,y:390,w:215,h:155,title:'ARMORY',sub:'GEAR / PACK',sign:'G'},
 {id:'routes',x:36,y:610,w:170,h:105,title:'ROUTE BOARD',sub:'ROAD STYLE',sign:'R'},
 {id:'gate',x:390,y:620,w:120,h:105,title:'EAST GATE',sub:'LEAVE TOWN',sign:'→'}
];
function townSpotDistance(a,p){const cx=clamp(p.x,a.x,a.x+a.w),cy=clamp(p.y,a.y,a.y+a.h);return Math.hypot(p.x-cx,p.y-cy)}
function townNearest(){if(!townWorld)return null;let best=null,bd=999;for(const a of TOWN_SPOTS){const d=townSpotDistance(a,townWorld.player);if(d<bd){bd=d;best=a}}return bd<58?best:null}
function updateTown(dt){
 if(!townWorld||townPanel)return;const p=townWorld.player;let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+(joy.dx||0),dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+(joy.dy||0),m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}
 const speed=175,nx=clamp(p.x+dx*speed*dt,18,522),ny=clamp(p.y+dy*speed*dt,135,835);
 const blocked=(x,y)=>TOWN_SPOTS.some(a=>a.id!=='routes'&&a.id!=='gate'&&x>a.x-14&&x<a.x+a.w+14&&y>a.y-14&&y<a.y+a.h+14);
 if(!blocked(nx,p.y))p.x=nx;if(!blocked(p.x,ny))p.y=ny;townWorld.near=townNearest();
}
function townInteract(){if(townPanel||!townWorld)return;const a=townNearest();if(!a)return say('MOVE CLOSER');if(a.id==='gate'){completeDestination();state='route';townWorld=null}else townPanel=a.id}
function townTap(p){
 if(townPanel){townPanelTap(p);return}
 if(p.y<100&&p.x>390){startPack('town',false,[]);return}
 if(p.y>500){joyStart({pointerId:-99},p);return}
 const a=townNearest();if(a&&p.y>115&&p.y<500)townInteract();
}
function townCards(){return TOWN_SPOTS}
function townPanelTap(p){if(p.y<145&&p.x>450){townPanel=null;return}if(townPanel==='market'){const ts=['gas','food','scrap','med'];for(let i=0;i<4;i++){const y=220+i*95;if(p.y>=y&&p.y<=y+65){const t=ts[i];if(meta.cargo[t]<=0)return say('NOTHING TO SELL');const all=p.x>350,n=all?meta.cargo[t]:1;meta.cargo[t]-=n;meta.credits+=townPrice(t)*n;say(`SOLD ${n} ${t.toUpperCase()}`);save();return}}}if(townPanel==='fuel'){const cap=vehicleStats().maxFuel;if(p.y>360&&p.y<430){if(meta.cargo.gas>0&&meta.vehicle.fuel<cap){meta.cargo.gas--;meta.vehicle.fuel=Math.min(cap,meta.vehicle.fuel+3);say('+3 FUEL')}else say('NO CANISTER / TANK FULL')}if(p.y>460&&p.y<530){if(meta.credits>=5&&meta.vehicle.fuel<cap){meta.credits-=5;meta.vehicle.fuel++;say('+1 FUEL')}else say('CANNOT BUY')}if(p.y>560&&p.y<630){if(meta.credits>=22&&meta.vehicle.fuel<cap){meta.credits-=22;meta.vehicle.fuel=Math.min(cap,meta.vehicle.fuel+5);say('+5 FUEL')}else say('CANNOT BUY')}save();return}if(townPanel==='garage'){const vs=vehicleStats(),h=Math.min(meta.vehicle.hull??vs.maxHull,vs.maxHull);if(p.y>205&&p.y<270){if(h<vs.maxHull&&meta.credits>=6){meta.credits-=6;meta.vehicle.hull=h+1;say('HULL +1')}else say('NO REPAIR')}if(p.y>290&&p.y<355){const miss=vs.maxHull-h,cost=miss*6;if(miss&&meta.credits>=cost){meta.credits-=cost;meta.vehicle.hull=vs.maxHull;say('FULL REPAIR')}else say('NO REPAIR')}if(p.y>390&&p.y<455){if(meta.vehicleGrid.tier<3){const co=meta.vehicleGrid.tier===1?[40,4]:[70,7];if(meta.credits>=co[0]&&meta.vehicle.scrap>=co[1]){meta.credits-=co[0];meta.vehicle.scrap-=co[1];meta.vehicleGrid.tier++;if(meta.vehicleGrid.tier===2)meta.vehicleGrid.cols=7;else meta.vehicleGrid.rows=5;say('BAY EXPANDED')}else say('NEED MORE RESOURCES')}}if(p.y>500&&p.y<565){startVehicleBay('town');return}for(let i=0;i<3;i++){const y=610+i*75;if(p.y>=y&&p.y<=y+60){const o=meta.town.moduleOffers[i];if(o&&!o.sold&&meta.credits>=o.credits&&meta.vehicle.scrap>=o.salvage){meta.credits-=o.credits;meta.vehicle.scrap-=o.salvage;o.sold=true;meta.pendingVehicle.push(makeVehicle(o.type));say('MODULE BOUGHT')}else say('CANNOT BUY');save();return}}save();return}if(townPanel==='armory'){if(p.y>205&&p.y<270){if(meta.pack.tier<3){const cost=meta.pack.tier===1?35:60;if(meta.credits>=cost){meta.credits-=cost;meta.pack.tier++;if(meta.pack.tier===2)meta.pack.cols=7;else meta.pack.rows=6;say('PACK EXPANDED')}else say('NOT ENOUGH CREDITS')}}if(p.y>300&&p.y<365){startPack('town',false,[]);return}for(let i=0;i<3;i++){const y=435+i*90;if(p.y>=y&&p.y<=y+70){const o=meta.town.gearOffers[i];if(o&&!o.sold&&meta.credits>=o.cost){meta.credits-=o.cost;o.sold=true;meta.pendingHaul.push(makeItem(o.type));say('GEAR BOUGHT')}else say('CANNOT BUY');save();return}}save();return}if(townPanel==='routes'){for(let i=0;i<3;i++){const y=255+i*150;if(p.y>=y&&p.y<=y+110){meta.route={...ROUTES[i]};say(`${meta.route.name} SELECTED`);save();return}}}}

function update(dt){noticeT=Math.max(0,noticeT-dt);if(state==='roadcombat')updateRoad(dt);else if(state==='play'||state==='finalassault')updateScavenge(dt);else if(state==='town')updateTown(dt)}

function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function joyStart(e,p){joy.active=true;joy.id=e.pointerId;joy.ox=p.x;joy.oy=p.y;joy.x=p.x;joy.y=p.y;joy.dx=joy.dy=0;canvas.setPointerCapture?.(e.pointerId)}
function joyMove(p){if(!joy.active)return;let dx=p.x-joy.ox,dy=p.y-joy.oy;const m=Math.hypot(dx,dy),max=62;if(m>max){dx=dx/m*max;dy=dy/m*max}joy.x=joy.ox+dx;joy.y=joy.oy+dy;joy.dx=dx/max;joy.dy=dy/max}
function joyEnd(){joy.active=false;joy.dx=joy.dy=0}

addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(state==='menu'&&(k==='enter'||k===' ')){state='route';ensureChoices()}else if(state==='route'&&(k==='enter'||k===' ')){if(!meta.selectedNode)selectNode(0);startRoad()}else if(state==='roadresult'&&(k==='enter'||k===' ')){if(meta.selectedNode?.type==='town')enterTown();else if(meta.selectedNode?.type==='boss'){completeDestination();state='route'}else if(meta.selectedNode?.type==='final')startFinalBreach();else if(meta.pendingRoadEvent)enterEvent();else startScavenge()}else if(state==='runsummary'&&(k==='enter'||k===' ')){state='garage'}else if(state==='garage'&&(k==='enter'||k===' ')){startNewRun()}else if((state==='roadfail'||state==='dead')&&(k==='enter'||k===' ')){finishRun(false)}else if(state==='route'&&(k==='b'||k==='i'))startPack('route',false,[]) ;else if(state==='route'&&k==='v')startVehicleBay('route')});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointerdown',e=>{const p=canvasPoint(e);if(state==='roadcombat'||state==='play'||state==='finalassault'){if(p.y>500)joyStart(e,p);return}if(state==='town'&&!townPanel){const near=townNearest();if(near&&p.x>=315&&p.x<=510&&p.y>=850&&p.y<=920){townInteract();return}if(p.y>500)joyStart(e,p);return}if(state==='menu'){state='route';ensureChoices();return}if(state==='route'){routeTap(p);return}if(state==='roadresult'){if(meta.selectedNode?.type==='town')enterTown();else if(meta.selectedNode?.type==='boss'){completeDestination();state='route'}else if(meta.selectedNode?.type==='final')startFinalBreach();else if(meta.pendingRoadEvent)enterEvent();else startScavenge();return}if(state==='event'){if(p.y>=430&&p.y<=555)resolveEvent(0);else if(p.y>=605&&p.y<=730)resolveEvent(1);return}if(state==='runsummary'){state='garage';return}if(state==='garage'){garageTap(p);return}if(state==='roadfail'||state==='dead'){finishRun(false);return}if(state==='pack'){packDown(p);return}if(state==='vehicle'){vehicleDown(p);return}if(state==='town'){townTap(p);return}});
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
function text(s,x,y,size=14,color=C.cream,align='left',weight=700){ctx.font=`${weight} ${size}px ui-monospace,monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);ctx.textAlign='left'}
function wrap(s,x,y,w,line=17,size=11,color=C.muted){ctx.font=`600 ${size}px ui-monospace,monospace`;ctx.fillStyle=color;const words=s.split(' ');let lineS='';for(const word of words){const test=lineS+word+' ';if(ctx.measureText(test).width>w){ctx.fillText(lineS,x,y);y+=line;lineS=word+' '}else lineS=test}ctx.fillText(lineS,x,y)}
function bar(x,y,w,h,v,color,bg='#3a3d31'){ctx.fillStyle=bg;roundRect(x,y,w,h,h/2,true,false);ctx.fillStyle=color;roundRect(x,y,w*clamp(v,0,1),h,h/2,true,false)}
function title(s,sub){text(s,28,56,28,C.cream,'left',900);if(sub)text(sub,29,80,10,C.muted,'left',700)}
function btn(x,y,w,h,label,enabled=true){ctx.fillStyle=enabled?C.yellow:'#3a3d31';roundRect(x,y,w,h,12,true,false);text(label,x+w/2,y+h/2+5,14,enabled?'#171912':'#777a6b','center',900)}
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
 const label=ART.ready?'SPRITES ON':ART.error?'SPRITES ERROR':'SPRITES LOADING';
 ctx.fillStyle='rgba(10,10,8,.86)';roundRect(398,8,132,26,7,true,false);
 text(label,464,26,8,ART.ready?C.green:ART.error?C.red:C.yellow,'center',900)
}
function drawNotice(){if(noticeT<=0)return;ctx.fillStyle='rgba(13,15,12,.92)';roundRect(85,865,370,42,12,true,false);text(notice,270,891,12,C.cream,'center',900)}
function drawJoy(){if(!joy.active)return;ctx.save();ctx.globalAlpha=.72;ctx.fillStyle='#151812';ctx.strokeStyle='rgba(239,232,207,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.ox,joy.oy,66,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=C.yellow;ctx.beginPath();ctx.arc(joy.x,joy.y,26,0,Math.PI*2);ctx.fill();ctx.restore()}

function drawMenu(){drawDunes();ctx.fillStyle='rgba(12,14,11,.25)';ctx.fillRect(0,0,W,H);text('WASTELAND',270,270,48,C.cream,'center',900);text('SURVIVOR',270,320,48,C.yellow,'center',900);text('PORTRAIT PROTOTYPE',270,360,12,C.muted,'center',800);drawVehicle(270,535,1.35,C.yellow);btn(85,720,370,72,'TAP TO START');text('ONE THUMB • BUILD • ROAD • SCAVENGE',270,825,10,C.muted,'center',800);text('v0.14.1 SECONDARY DIVERSITY',270,855,10,'#66695b','center',700)}
function drawRoute(){drawDunes();
 ctx.fillStyle='rgba(12,14,11,.58)';ctx.fillRect(0,0,W,H);
 ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle='#c49a58';ctx.lineWidth=1;for(let x=35;x<W;x+=47){ctx.beginPath();ctx.moveTo(x,155);ctx.lineTo(x-70,735);ctx.stroke()}for(let y=175;y<735;y+=54){ctx.beginPath();ctx.moveTo(18,y);ctx.lineTo(522,y+20);ctx.stroke()}ctx.restore();
 ctx.fillStyle='rgba(112,72,40,.20)';ctx.beginPath();ctx.moveTo(0,610);ctx.lineTo(145,570);ctx.lineTo(235,620);ctx.lineTo(355,565);ctx.lineTo(540,605);ctx.lineTo(540,760);ctx.lineTo(0,760);ctx.fill();title('THE ROAD',`LEG ${meta.roadLeg}  •  BUILD IDENTITY RUN`);const vs=vehicleStats();text(`PACK`,28,104,10,C.muted);text(`${meta.backpack.length}`,28,124,15,C.cream);text(`FUEL ${meta.vehicle.fuel}/${vs.maxFuel}`,155,104,10,C.muted);bar(155,113,120,9,meta.vehicle.fuel/vs.maxFuel,C.yellow);text(`HULL`,315,104,10,C.muted);bar(315,113,90,9,(meta.vehicle.hull??vs.maxHull)/vs.maxHull,C.green);text(`¢${meta.credits}`,505,120,15,C.yellow,'right',900);
 ensureChoices();const pos=routeNodePositions();ctx.strokeStyle='#575a4d';ctx.lineWidth=5;for(const p of pos){ctx.beginPath();ctx.moveTo(270,720);ctx.lineTo(p.x,p.y+35);ctx.stroke()}ctx.fillStyle='#34372d';ctx.beginPath();ctx.arc(270,720,34,0,6.28);ctx.fill();drawVehicle(270,720,.62,C.yellow);
 for(let i=0;i<meta.mapChoices.length;i++){const n=meta.mapChoices[i],p=pos[i],sel=meta.selectedNode?.id===n.id;ctx.fillStyle=sel?'#5a5032':'#292c24';ctx.strokeStyle=sel?C.yellow:'#5b5f50';ctx.lineWidth=sel?4:2;ctx.beginPath();ctx.arc(p.x,p.y,56,0,6.28);ctx.fill();ctx.stroke();text(n.icon,p.x,p.y+8,25,n.type==='town'?C.green:n.danger===3?C.red:C.cream,'center',900);text(n.short,p.x,p.y+82,11,sel?C.yellow:C.cream,'center',900);if(n.type!=='town')text('▲'.repeat(n.danger),p.x,p.y+100,9,n.danger===3?C.red:C.muted,'center',900)}
 const n=meta.selectedNode;ctx.fillStyle='#20231c';roundRect(30,760,480,68,14,true,false);if(n){text(n.name,48,785,15,C.cream,'left',900);text(n.type==='town'?'SAFE • TRADE / REPAIR':n.type==='event'?'ROADSIDE EVENT • CHOICE':n.type==='final'?'FINAL ASSAULT • NO TURNING BACK':n.type==='boss'?`${n.focus} • KILL REQUIRED`:`${n.focus} • DANGER ${n.danger}${n.special?' • RARE SIGNAL':''}`,48,808,10,n.type==='boss'||n.type==='final'?C.red:n.type==='event'||n.special?C.yellow:C.muted);text(`FUEL COST ${fuelCost()}`,480,796,12,meta.vehicle.fuel<fuelCost()?C.red:C.yellow,'right',900)}else text('TAP A NODE',270,800,14,C.muted,'center',900);btn(55,842,430,70,n?`DRIVE TO ${n.short}`:'SELECT A DESTINATION',!!n);text('PACK',65,66,10,C.muted,'center',900);text('RESTART',270,66,10,C.red,'center',900);text('VEHICLE',472,66,10,C.muted,'center',900);
 if(restartConfirm){
  ctx.fillStyle='rgba(8,9,7,.78)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#20231c';roundRect(45,360,450,310,18,true,false);
  text('RESTART RUN?',270,420,26,C.red,'center',900);
  wrap('This clears the current run, backpack, vehicle modules, credits and route progress.',90,465,360,22,12,C.muted);
  btn(65,565,190,65,'CANCEL');
  ctx.fillStyle=C.red;roundRect(285,565,190,65,12,true,false);text('RESET RUN',380,603,13,'#171912','center',900);
 }
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
 if(g.finalRoute&&g.bossSpawned&&!g.bossDefeated){ctx.fillStyle='#302923';roundRect(128,g.colossusY-95,284,255,24,true,false);ctx.fillStyle='#46372f';roundRect(155,g.colossusY-72,230,210,18,true,false);}ctx.save();ctx.strokeStyle='#b8aa72';ctx.lineWidth=5;ctx.setLineDash([35,38]);ctx.lineDashOffset=g.scroll%73;ctx.beginPath();ctx.moveTo(270,0);ctx.lineTo(270,H);ctx.stroke();ctx.restore();for(const br of g.barriers){
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
 text(d.type==='fuel'?'F':d.type==='repair'?'+':'S',d.x,d.y+4,10,'#171912','center',900)
}for(const e of g.enemies)drawEnemyVehicle(e);for(const b of g.bullets){ctx.fillStyle=b.kind==='cannon'?C.yellow:b.kind==='rocket'?'#df7c42':'#f1e6b3';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,6.28);ctx.fill();if(b.kind==='rocket'){ctx.strokeStyle='rgba(223,124,66,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r+4,0,6.28);ctx.stroke()}}for(const b of g.enemyBullets){ctx.fillStyle=b.sniper?'#d8d7c4':C.red;ctx.beginPath();ctx.arc(b.x,b.y,b.sniper?6:5,0,6.28);ctx.fill()}for(const f of g.fx){ctx.save();const a=clamp(f.life/.35,0,1),rr=f.r*(1-a);ctx.globalAlpha=a;ctx.strokeStyle=f.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y,rr,0,6.28);ctx.stroke();if(rr>18)drawArt('explosion',f.x,f.y,Math.min(115,rr*2.2),Math.min(115,rr*2.2),a*.7);ctx.restore()}drawArt('dust',p.x,p.y+54,155,80,.38);drawVehicle(p.x,p.y,1,p.inv>0&&Math.floor(performance.now()/80)%2?'#fff':C.yellow);ctx.fillStyle='rgba(18,20,16,.9)';roundRect(18,20,504,100,14,true,false);text(`${Math.ceil(g.time)}s`,36,60,28,g.time<10?C.red:C.cream,'left',900);text(destinationName(),36,85,11,C.muted);text(`FUEL -${g.cost}${g.dry?' • DRY RUN':''}`,500,58,11,g.dry?C.red:C.yellow,'right',900);bar(36,96,210,10,p.hp/p.max,p.hp/p.max>.4?C.green:C.red);text(`HULL ${p.hp}/${p.max}`,255,105,10,C.cream);bar(305,96,195,10,g.elapsed/g.duration,C.yellow);text(`THREAT ${Math.round(g.threat*100)}%`,500,105,9,g.threat>1.05?C.red:C.muted,'right',900);if(g.finalRoute&&g.bossSpawned&&!g.bossDefeated){
 text('THE COLOSSUS',270,150,17,C.red,'center',900);
 const lock=roadTarget(g,p,560);if(lock?.group==='colossus')text(`LOCK: ${lock.part.toUpperCase()}   •   LEFT MG / CENTER ARMOR / RIGHT RKT`,270,172,9,C.yellow,'center',800);
}else if(g.bossRoute&&g.bossSpawned&&!g.bossDefeated)text('IRON JACKAL',270,150,16,C.red,'center',900);else if(g.boss&&g.enemies.some(e=>e.type==='wartruck'))text('WAR TRUCK',270,150,15,C.red,'center',900);drawJoy()}
function drawVehicle(x,y,s=1,color=C.yellow){
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
function drawEnemyVehicle(e){
 const boss=e.type==='dreadnought',sc=e.group==='colossus'?1.05:boss?1.55:e.type==='wartruck'?1.2:e.type==='bike'?.72:.92;
 const key=e.type==='bike'?'bike':e.type==='missilevan'?'missilevan':e.type==='wartruck'||boss?'wartruck':e.type==='truck'?'truck':null;
 let art=false;
 if(key)art=drawArt(key,e.x,e.y,key==='bike'?80*sc:key==='wartruck'?126*sc:112*sc,key==='bike'?128*sc:138*sc,1);
 if(!art){
  const col=boss?'#4e3d36':e.type==='missilevan'?'#67536a':e.group==='colossus'?'#57433a':e.type==='wartruck'?'#6d594c':e.type==='truck'?'#75624c':e.type==='bike'?'#9a7049':'#806448';
  drawVehicle(e.x,e.y,sc,col)
 }
 if(e.group==='colossus')text(e.part==='mg'?'MG':e.part==='rocket'?'RKT':e.part==='armor'?'ARM':'ENG',e.x,e.y+5,10,C.yellow,'center',900);else if(e.type==='missilevan')text('MSL',e.x,e.y+7,9,C.yellow,'center',900);
 if((e.disabled||0)>0){ctx.strokeStyle=C.teal;ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,Math.max(e.w,e.h)*.42,0,6.28);ctx.stroke()}
 if(e.maxHp>4)bar(e.x-e.w*.45,e.y-e.h*.62,e.w*.9,boss||e.group==='colossus'?8:5,e.hp/e.maxHp,e.group==='colossus'?C.yellow:C.red)
}
function drawMine(m){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(m.x,m.y+6,m.r+5,8,0,0,6.28);ctx.fill();ctx.fillStyle='#24251f';ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,6.28);ctx.fill();ctx.strokeStyle='#aa503e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(m.x,m.y,m.r-5,0,6.28);ctx.stroke();ctx.fillStyle='#d39b3e';for(let a=0;a<6;a++){const q=a*Math.PI/3;ctx.fillRect(m.x+Math.cos(q)*(m.r-3)-2,m.y+Math.sin(q)*(m.r-3)-2,4,4)}}
function drawRoadResult(fail=false){drawDunes();ctx.fillStyle='rgba(11,13,10,.72)';ctx.fillRect(0,0,W,H);text(fail?'WRECKED':'DESTINATION REACHED',270,230,30,fail?C.red:C.yellow,'center',900);if(!fail){text(destinationName(),270,275,18,C.cream,'center',900);const rows=[['RAIDERS',roadGame.kills],['SALVAGE',roadGame.scrap],['FIELD REPAIRS',roadGame.repairs||0],['HULL',`${roadGame.player.hp}/${roadGame.player.max}`]];rows.forEach((r,i)=>{ctx.fillStyle='#24271f';roundRect(75,340+i*70,390,50,10,true,false);text(r[0],95,370,11,C.muted);text(String(r[1]),445,371,18,C.cream,'right',900)});if(meta.selectedNode?.type==='final'){
 ctx.fillStyle='#302f25';roundRect(75,640,390,90,12,true,false);text('COLOSSUS DISABLED',95,670,10,C.yellow,'left',900);
 text(`${meta.finalFlags.mg?'MG DOWN':'MG ACTIVE'} • ${meta.finalFlags.rocket?'RKT DOWN':'RKT ACTIVE'} • ${meta.finalFlags.armor?'ARMOR DOWN':'ARMOR ACTIVE'}`,95,700,10,C.cream,'left',900);
 }else{const d=VEH[roadGame.reward];ctx.fillStyle='#302f25';roundRect(75,640,390,90,12,true,false);text('MODULE SALVAGED',95,670,10,C.yellow,'left',900);text(`${d.name}  L${roadGame.rewardLv}`,95,700,15,C.cream,'left',900)}
 btn(75,790,390,70,meta.selectedNode?.type==='town'?'ENTER TOWN':meta.pendingRoadEvent?'ROADSIDE EVENT':meta.selectedNode?.type==='final'?'BREACH THE CATHEDRAL':meta.selectedNode?.type==='boss'?'CLAIM TROPHY':'GET OUT & SCAVENGE')}else{wrap('The Junker could not make the route. Your run continues from the road map for prototype testing.',80,360,380,22,13,C.muted);btn(75,640,390,70,'BACK TO ROAD MAP')}}

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
 for(let y=250;y<g.worldH;y+=620){
  const lx=site==='clinic'?390:site==='junkyard'?405:site==='motel'?135:site==='gas'?145:270;
  const lw=site==='junkyard'?205:site==='clinic'?205:210;
  if(!drawArt(site,lx,y+42,lw,162,.96)){
   if(site==='gas'){ctx.fillStyle='#4b3929';ctx.fillRect(25,y,150,72);ctx.fillStyle='#9d6e35';ctx.fillRect(38,y-18,124,24);text('GAS',100,y,11,'#211a12','center',900)}
   if(site==='clinic'){ctx.fillStyle='#55584d';ctx.fillRect(315,y,190,82)}
   if(site==='motel'){ctx.fillStyle='#59402f';ctx.fillRect(18,y,205,80)}
   if(site==='junkyard'){ctx.fillStyle='#71513b';ctx.fillRect(360,y+10,125,36)}
  }
 }
 for(const o of g.obstacles){
  ctx.fillStyle=g.finalAssault?'#4a3d35':SITE[g.site].color;roundRect(o.x,o.y,o.w,o.h,5,true,false);
  ctx.fillStyle='rgba(20,18,14,.34)';ctx.fillRect(o.x+7,o.y+7,o.w-14,o.h-14);
  ctx.strokeStyle='rgba(235,215,171,.14)';ctx.lineWidth=2;ctx.strokeRect(o.x+3,o.y+3,o.w-6,o.h-6);
  ctx.fillStyle='rgba(12,12,10,.22)';ctx.fillRect(o.x+o.w*.18,o.y+o.h*.18,Math.max(5,o.w*.12),Math.max(5,o.h*.12));
 }
 for(const c of g.crates){if(c.opened)continue;ctx.fillStyle=c.rare?C.yellow:'#755d3f';roundRect(c.x-17,c.y-15,34,30,5,true,false);ctx.strokeStyle=c.rare?'#fff0a0':'#9a805f';ctx.lineWidth=2;ctx.strokeRect(c.x-13,c.y-11,26,22);if(c.progress>0)bar(c.x-28,c.y-32,56,7,c.progress,c.rare?C.yellow:C.green)}
 for(const l of g.loot){ctx.fillStyle=l.type==='gas'?C.gas:l.type==='food'?C.food:l.type==='med'?C.med:C.scrap;ctx.beginPath();ctx.arc(l.x,l.y,7,0,6.28);ctx.fill()}
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
 for(const b of g.bullets){ctx.fillStyle='#f0e2a7';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,6.28);ctx.fill()}
 for(const b of g.enemyBullets){ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(b.x,b.y,5,0,6.28);ctx.fill()}
 for(const f of g.fx){ctx.save();const a=clamp(f.life/.35,0,1),rr=f.r*(1-a);ctx.globalAlpha=a;ctx.strokeStyle=f.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(f.x,f.y,rr,0,6.28);ctx.stroke();ctx.fillStyle=f.color;ctx.globalAlpha=a*.28;ctx.beginPath();ctx.arc(f.x,f.y,rr*.5,0,6.28);ctx.fill();ctx.restore()}
 drawExit(g.exit);drawSurvivor(p);ctx.restore();
 ctx.fillStyle='rgba(15,17,13,.92)';roundRect(18,18,504,110,14,true,false);
 text(g.finalAssault?'RUST CATHEDRAL • FINAL ASSAULT':SITE[g.site].name,34,48,16,C.cream,'left',900);text(`${Math.ceil(g.time)}s`,500,50,25,g.time<20?C.red:C.cream,'right',900);
 bar(34,66,210,10,p.hp/p.max,p.hp/p.max>.4?C.green:C.red);text(`HP ${p.hp}/${p.max}`,255,75,9,C.cream);
 text(`${g.build.weapons.length} WEAPONS`,34,105,10,C.yellow,'left',900);text(`NEW GEAR ${g.haul.length}`,500,105,10,C.cream,'right',900);
 if(g.finalAssault){text(g.finalLabel||'THE BREACH',270,148,12,g.driverSpawned?C.red:C.yellow,'center',900);if(g.driverSpawned){const d=g.enemies.find(e=>e.type==='driver');if(d)bar(95,163,350,10,d.hp/d.max,C.red)}}else if(g.special)text('RARE SIGNAL',270,148,12,C.yellow,'center',900);else text(g.effectLabel?`${g.rule?.label||''} • ${g.effectLabel}`:(g.rule?.label||''),270,148,9,g.effectLabel?C.red:C.muted,'center',900);
 drawJoy();drawNotice();
}
function drawSurvivor(p){
 ctx.save();if(p.inv>0&&Math.floor(performance.now()/70)%2)ctx.globalAlpha=.35;
 if(!drawArt('survivor',p.x,p.y,62,76,1)){ctx.fillStyle='#2d342d';ctx.beginPath();ctx.arc(p.x,p.y,p.r+4,0,6.28);ctx.fill();ctx.fillStyle='#cfad79';ctx.beginPath();ctx.arc(p.x,p.y-4,p.r-4,0,6.28);ctx.fill();ctx.fillStyle='#665841';ctx.fillRect(p.x-12,p.y+7,24,12)}
 ctx.restore()
}
function drawScavEnemy(e){
 const key=e.type==='gunner'?'gunner':e.type==='grenadier'?'grenadier':e.type==='sniper'?'sniper':e.type==='melee'?'melee':e.type==='elite'||e.type==='armored'||e.type==='driver'?'gunner':null;
 if(!drawArt(key,e.x,e.y,58,72,1)){ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,6.28);ctx.fill()}
 text(e.type==='gunner'?'G':e.type==='grenadier'?'!':e.type==='elite'?'E':e.type==='armored'?'A':e.type==='sniper'?'S':e.type==='driver'?'D':'',e.x,e.y+7,e.type==='driver'?11:8,'#171912','center',900);
 if(e.type!=='melee')bar(e.x-18,e.y-e.r-18,36,4,e.hp/e.max,C.red)
}
function drawExit(ex){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(ex.x,ex.y+20,62,14,0,0,6.28);ctx.fill();drawVehicle(ex.x,ex.y,.72,C.yellow);ctx.fillStyle='rgba(22,20,15,.9)';roundRect(ex.x-54,ex.y+45,108,25,6,true,false);text('EXTRACT',ex.x,ex.y+62,9,C.yellow,'center',900);if(ex.progress>0)bar(ex.x-55,ex.y+76,110,7,ex.progress,C.green)}

function drawGridScreen(kind){const isPack=kind==='pack',g=isPack?packGeom():vehicleGeom(),list=isPack?meta.backpack:meta.vehiclePack,defs=isPack?ITEM:VEH,pending=isPack?meta.pendingHaul:meta.pendingVehicle,drag=isPack?packDrag:vehicleDrag;drawDunes();ctx.fillStyle='rgba(12,14,11,.82)';ctx.fillRect(0,0,W,H);title(isPack?'BACKPACK':'VEHICLE BAY',isPack?'Fuse duplicates • supports reward adjacency':'2 hardpoints • CLEAR / ARMOR / SPLASH / CONTROL');if(isPack){const b=buildStats();text(`HP ${b.maxHp}   MOVE ${Math.round(b.speed)}   CORES ${b.weapons.length}/2`,270,118,11,C.cream,'center',800)}else{const v=vehicleStats();text(`HULL ${v.maxHull}   FUEL ${v.maxFuel}   HARDPOINTS ${v.activeWeapons.length}/2`,270,118,11,C.cream,'center',800)}ctx.fillStyle='#22251e';roundRect(g.x-10,g.y-10,g.cols*g.cell+20,g.rows*g.cell+20,14,true,false);for(let y=0;y<g.rows;y++)for(let x=0;x<g.cols;x++){ctx.fillStyle=(x+y)%2?'#303329':'#2b2f26';ctx.fillRect(g.x+x*g.cell+2,g.y+y*g.cell+2,g.cell-4,g.cell-4);ctx.strokeStyle='#42463a';ctx.strokeRect(g.x+x*g.cell+.5,g.y+y*g.cell+.5,g.cell-1,g.cell-1)}for(const it of list)drawGridItem(it,g.x+it.gx*g.cell,g.y+it.gy*g.cell,g.cell,defs,drag?.item.id===it.id);const cards=isPack?packPendingCards():vehicleCards();text(`NEW ${isPack?'GEAR':'MODULES'} ${pending.length}`,35,Math.min(g.bottom+8,640),11,C.muted,'left',900);for(const c of cards){const d=defs[c.it.type];ctx.fillStyle='#272a22';roundRect(c.x,c.y,c.w,c.h,9,true,false);ctx.fillStyle=d.color;roundRect(c.x+7,c.y+8,43,42,7,true,false);text(d.tag,c.x+28,c.y+34,10,'#171912','center',900);text(`${d.name} L${c.it.level||1}`,c.x+59,c.y+24,10,C.cream,'left',900);text(`${d.w}×${d.h}`,c.x+59,c.y+43,9,C.muted)}ctx.fillStyle='#5c302a';roundRect(28,822,215,66,12,true,false);text((isPack?packReturn:vehicleReturn)==='town'?'SELL':'DISCARD',135,861,13,'#e1c6b8','center',900);btn(298,822,214,66,(isPack?packReturn:vehicleReturn)==='town'?'BACK TO TOWN':'CONTINUE');if(drag)drawGridItem(drag.item,drag.x-drag.ox,drag.y-drag.oy,g.cell,defs,false,.8);if(isPack&&evolutionChoice)drawEvolutionModal();drawNotice()}
function drawEvolutionModal(){
 const it=meta.backpack.find(x=>x.id===evolutionChoice?.itemId);if(!it){evolutionChoice=null;return}
 const opts=EVOLUTIONS[evolutionChoice.type]||[];ctx.fillStyle='rgba(7,8,6,.86)';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#20231c';roundRect(28,310,484,420,18,true,false);
 text('LV.3 EVOLUTION',270,365,24,C.yellow,'center',900);text(ITEM[it.type].name,270,400,14,C.cream,'center',900);
 wrap('Choose one branch. This choice defines how the weapon behaves for the rest of the run.',72,438,396,20,11,C.muted);
 opts.slice(0,2).forEach((o,i)=>{const x=i===0?45:285;ctx.fillStyle='#303329';roundRect(x,565,210,120,14,true,false);ctx.strokeStyle=i===0?C.yellow:C.teal;ctx.lineWidth=2;roundRect(x,565,210,120,14,false,true);text(o.name,x+105,600,13,C.cream,'center',900);wrap(o.desc,x+18,628,174,18,9,C.muted)});
}
function drawGridItem(it,x,y,cell,defs,hidden=false,alpha=1){if(hidden)return;const d=defs[it.type],list=defs===ITEM?meta.backpack:meta.vehiclePack,active=d.kind!=='weapon'||weaponIsActive(it,list,defs,2);ctx.save();ctx.globalAlpha=alpha*(active?1:.38);ctx.fillStyle=d.color;roundRect(x+3,y+3,d.w*cell-6,d.h*cell-6,8,true,false);ctx.strokeStyle=it.locked?C.yellow:active?'rgba(255,255,255,.22)':C.red;ctx.lineWidth=it.locked?2:1;roundRect(x+3,y+3,d.w*cell-6,d.h*cell-6,8,false,true);text(d.tag,x+d.w*cell/2,y+d.h*cell/2+5,Math.min(15,cell*.24),'#171912','center',900);text(`L${it.level||1}`,x+8,y+d.h*cell-9,8,C.cream,'left',900);if(it.evolution)text(it.evolution.toUpperCase().slice(0,5),x+d.w*cell-7,y+13,7,C.yellow,'right',900);if(d.kind==='weapon'&&!active)text('OFF',x+d.w*cell-7,y+d.h*cell-9,7,C.red,'right',900);ctx.restore()}

function drawTown(){
 drawDunes();ctx.fillStyle='rgba(15,13,9,.32)';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#5b4d39';ctx.fillRect(0,125,W,735);
 ctx.fillStyle='rgba(33,29,22,.22)';for(let y=145;y<850;y+=58){ctx.fillRect(0,y,W,2)}
 ctx.fillStyle='#3d3428';ctx.fillRect(245,125,55,735);ctx.fillStyle='rgba(201,164,91,.16)';ctx.fillRect(269,125,4,735);
 for(const a of TOWN_SPOTS){
  if(a.id==='routes'){ctx.fillStyle='#312b21';ctx.fillRect(a.x+72,a.y-28,7,32);ctx.fillStyle='#6e5636';roundRect(a.x,a.y,a.w,a.h,4,true,false);ctx.strokeStyle='#b58a49';ctx.lineWidth=2;roundRect(a.x+8,a.y+8,a.w-16,a.h-16,2,false,true)}
  else if(a.id==='gate'){ctx.fillStyle='#28251e';ctx.fillRect(a.x,a.y+25,a.w,80);ctx.fillStyle='#9b773c';ctx.fillRect(a.x+10,a.y+30,8,65);ctx.fillRect(a.x+a.w-18,a.y+30,8,65);ctx.strokeStyle='#b6904d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(a.x+15,a.y+36);ctx.lineTo(a.x+a.w-15,a.y+36);ctx.stroke()}
  else{
   ctx.fillStyle='rgba(16,14,11,.35)';roundRect(a.x+7,a.y+10,a.w,a.h,7,true,false);
   ctx.fillStyle=a.id==='fuel'?'#5c4930':a.id==='garage'?'#48443a':a.id==='armory'?'#504235':'#5a4632';roundRect(a.x,a.y,a.w,a.h,6,true,false);
   ctx.fillStyle='#27251f';ctx.fillRect(a.x+12,a.y+58,a.w-24,a.h-70);
   ctx.fillStyle=a.id==='fuel'?C.yellow:a.id==='garage'?C.scrap:a.id==='armory'?C.red:C.rust;ctx.fillRect(a.x+14,a.y+12,a.w-28,34);
   text(a.title,a.x+a.w/2,a.y+35,11,'#17140f','center',900);
   ctx.fillStyle='#161612';ctx.fillRect(a.x+a.w*.38,a.y+a.h-50,a.w*.24,50);
   if(a.id==='fuel'){ctx.fillStyle='#8b6a38';ctx.fillRect(a.x+22,a.y+78,28,48);ctx.fillStyle='#171612';ctx.fillRect(a.x+29,a.y+86,14,13)}
   if(a.id==='garage'){ctx.strokeStyle='#9a8a67';ctx.lineWidth=4;ctx.beginPath();ctx.arc(a.x+45,a.y+91,19,0,6.28);ctx.stroke();ctx.beginPath();ctx.moveTo(a.x+45,a.y+67);ctx.lineTo(a.x+45,a.y+115);ctx.stroke()}
   if(a.id==='market'){ctx.fillStyle='#9a7846';ctx.fillRect(a.x+22,a.y+83,42,22);ctx.fillRect(a.x+75,a.y+74,34,31)}
  }
 }
 ctx.fillStyle='rgba(18,15,11,.55)';ctx.fillRect(0,125,W,34);text('RUSTWATER',24,148,16,C.cream,'left',900);text('SAFE ZONE',150,147,9,C.green,'left',900);
 const vs=vehicleStats();text(`¢${meta.credits}  FUEL ${meta.vehicle.fuel}/${vs.maxFuel}  S ${meta.vehicle.scrap}`,515,147,10,C.yellow,'right',900);
 drawVehicle(270,820,.66,C.yellow);
 if(townWorld){const p=townWorld.player;ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(p.x,p.y+11,15,6,0,0,6.28);ctx.fill();ctx.fillStyle=C.cream;ctx.beginPath();ctx.arc(p.x,p.y-5,7,0,6.28);ctx.fill();ctx.fillStyle='#5d6955';roundRect(p.x-8,p.y+2,16,22,5,true,false);ctx.fillStyle='#3a2f25';ctx.fillRect(p.x-9,p.y+22,7,13);ctx.fillRect(p.x+2,p.y+22,7,13)}
 const near=townNearest();if(near&&!townPanel){ctx.fillStyle='rgba(20,18,13,.94)';roundRect(88,742,364,54,10,true,false);text(near.title,270,764,11,C.cream,'center',900);text('IN RANGE',270,784,9,C.green,'center',900);ctx.fillStyle=C.yellow;roundRect(315,850,195,70,12,true,false);text(near.id==='gate'?'LEAVE TOWN':'INTERACT',412,892,13,C.ink,'center',900)}
 text('PACK',472,95,10,C.muted,'center',900);if(!near)text('MOVE WITH JOYSTICK • WALK UP TO A SHOP',270,895,9,C.muted,'center',700);
 if(!townPanel)drawJoy();if(townPanel)drawTownPanel();drawNotice()
}
function drawTownPanel(){ctx.fillStyle='rgba(8,9,7,.82)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#20231c';roundRect(18,110,504,800,18,true,false);text('×',488,145,25,C.cream,'center',900);if(townPanel==='market')drawMarket();if(townPanel==='fuel')drawFuel();if(townPanel==='garage')drawGarage();if(townPanel==='armory')drawArmory();if(townPanel==='routes')drawRoutes()}
function panelHead(a,b){text(a,42,160,24,C.yellow,'left',900);text(b,42,187,10,C.muted)}
function drawMarket(){panelHead('SCRAP MARKET',`Demand spike: ${meta.town.demand.toUpperCase()} pays +70%`);const ts=['gas','food','scrap','med'];for(let i=0;i<4;i++){const t=ts[i],y=220+i*95;ctx.fillStyle='#2b2e25';roundRect(42,y,456,65,10,true,false);text(`${t.toUpperCase()} ×${meta.cargo[t]}`,62,y+27,12,C.cream,'left',900);text(`¢${townPrice(t)} ea`,62,y+49,10,meta.town.demand===t?C.yellow:C.muted);text('SELL 1',350,y+29,10,C.cream,'center',900);text('ALL',455,y+29,10,C.yellow,'center',900)}}
function drawFuel(){panelHead('FUEL DEPOT','Fuel now determines route range and Dry Run risk.');const cap=vehicleStats().maxFuel;text(`${meta.vehicle.fuel}/${cap}`,270,265,42,C.yellow,'center',900);bar(90,290,360,18,meta.vehicle.fuel/cap,C.yellow);[['POUR CARGO CAN',`CARGO ${meta.cargo.gas}`,250],['BUY +1 FUEL','¢5',350],['BUY +5 FUEL','¢22',450]].forEach((r,i)=>{const y=360+i*100;ctx.fillStyle='#33372d';roundRect(85,y,370,70,12,true,false);text(r[0],270,y+29,13,C.cream,'center',900);text(r[1],270,y+52,10,C.yellow,'center',800)})}
function drawGarage(){panelHead('GARAGE','Repair, expand, buy modules.');const v=vehicleStats(),h=Math.min(meta.vehicle.hull??v.maxHull,v.maxHull);text(`HULL ${h}/${v.maxHull}`,55,235,13,C.cream,'left',900);bar(55,250,430,14,h/v.maxHull,h/v.maxHull>.4?C.green:C.red);[['REPAIR +1 • ¢6',220],['REPAIR ALL',305],[`EXPAND BAY ${meta.vehicleGrid.cols}×${meta.vehicleGrid.rows}`,390],['OPEN VEHICLE BAY',500]].forEach(r=>{ctx.fillStyle='#34382d';roundRect(55,r[1],430,60,10,true,false);text(r[0],270,r[1]+36,12,r[0].startsWith('OPEN')?C.yellow:C.cream,'center',900)});text('MODULE OFFERS',55,602,11,C.muted,'left',900);(meta.town.moduleOffers||[]).forEach((o,i)=>{const d=VEH[o.type],y=620+i*75;ctx.fillStyle='#2b2e25';roundRect(55,y,430,58,9,true,false);text(o.sold?'SOLD':d.name,75,y+24,11,o.sold?'#66695d':C.cream,'left',900);text(`¢${o.credits} + ${o.salvage}S`,75,y+45,9,C.yellow)})}
function drawArmory(){panelHead('ARMORY','Expand your pack or buy new build pieces.');ctx.fillStyle='#34382d';roundRect(55,210,430,60,10,true,false);text(`EXPAND PACK ${meta.pack.cols}×${meta.pack.rows}`,270,246,12,C.cream,'center',900);ctx.fillStyle='#34382d';roundRect(55,300,430,60,10,true,false);text(`OPEN BACKPACK • NEW ${meta.pendingHaul.length}`,270,336,12,C.yellow,'center',900);text('GEAR OFFERS',55,420,11,C.muted,'left',900);(meta.town.gearOffers||[]).forEach((o,i)=>{const d=ITEM[o.type],y=440+i*90;ctx.fillStyle='#2b2e25';roundRect(55,y,430,70,9,true,false);text(o.sold?'SOLD':d.name,75,y+29,12,o.sold?'#66695d':C.cream,'left',900);text(`¢${o.cost} • ${d.w}×${d.h}`,75,y+52,9,C.yellow)})}
function drawRoutes(){panelHead('ROUTE BOARD','Road style modifies fuel cost and combat pressure.');ROUTES.forEach((r,i)=>{const y=255+i*150,sel=meta.route.id===r.id;ctx.fillStyle=sel?'#4a4530':'#2b2e25';roundRect(55,y,430,110,12,true,false);ctx.strokeStyle=sel?C.yellow:'#4b5043';roundRect(55,y,430,110,12,false,true);text(r.name,75,y+35,14,sel?C.yellow:C.cream,'left',900);text(r.risk,455,y+35,10,r.risk==='HIGH'?C.red:C.muted,'right',900);wrap(r.bonus,75,y+63,350,17,10,C.muted)})}

function eventChoices(){
 const id=eventData?.id;
 if(id==='convoy')return[['HELP THE CONVOY','-4 fuel  →  +¢45 + Lv2 support'],['TAKE THE CARGO','+3 salvage + Lv2 weapon  •  Hull -2 + pursuit']];
 if(id==='signal')return[['ENTER THE RELAY','Lv2/3 weapon + ¢20  •  start search wounded + ambush'],['CUT POWER & LEAVE','+4 fuel + ¢8  •  no penalty']];
 if(id==='mechanic')return[['FULL OVERHAUL','-¢30  →  full Hull + Lv2 module'],['STRIP HIS RIG','+4 salvage  •  -2 fuel + louder search']];
 return[['STRIP IT CLEAN','Lv2 module + Lv2 gear  •  Hull -3 + pursuit'],['QUICK LOOT','+¢28 +1 fuel  •  leave now']];
}
function drawEvent(){
 drawDunes();ctx.fillStyle='rgba(10,12,9,.76)';ctx.fillRect(0,0,W,H);
 text('ON THE ROAD • BETWEEN STOPS',270,115,13,C.yellow,'center',900);text(eventData?.name||'UNKNOWN',270,180,28,C.cream,'center',900);
 wrap(eventData?.desc||'',65,245,410,24,13,C.muted);
 const cs=eventChoices();cs.forEach((c,i)=>{const y=430+i*175;ctx.fillStyle='#2a2d25';roundRect(55,y,430,125,14,true,false);ctx.strokeStyle=i===0?C.yellow:'#596052';ctx.lineWidth=2;roundRect(55,y,430,125,14,false,true);text(c[0],270,y+45,15,C.cream,'center',900);text(c[1],270,y+78,10,i===0?C.yellow:C.muted,'center',800)});
 text('The road takes something. Decide what you can afford.',270,820,10,C.muted,'center',700);drawNotice();
}
function drawRunSummary(){
 const r=runSummary||makeRunSummary(false);drawDunes();ctx.fillStyle='rgba(10,12,9,.80)';ctx.fillRect(0,0,W,H);
 text(r.victory?'RUN COMPLETE':'RUN ENDED',270,115,32,r.victory?C.yellow:C.red,'center',900);
 text(r.victory?'RUST CATHEDRAL FALLS':'THE WASTELAND WINS',270,150,11,C.muted,'center',800);
 ctx.fillStyle='#23261f';roundRect(45,205,450,420,18,true,false);
 text(r.build,270,250,22,C.cream,'center',900);text('FINAL BUILD',270,275,9,C.muted,'center',800);
 const kit=START_KITS.find(x=>x.id===r.kit)?.name||String(r.kit||'').toUpperCase(),ch=CHASSIS.find(x=>x.id===r.chassis)?.name||String(r.chassis||'').toUpperCase();
 text(`${kit} • ${ch} • ¢${r.credits}`,270,298,9,C.yellow,'center',800);
 const rows=[['LEGS',r.leg],['ROAD KILLS',r.roadKills],['ON-FOOT KILLS',r.scavKills],['EVENTS',r.events||0],['BOSSES',r.bosses],['BACKPACK',r.pack]];
 rows.forEach((x,i)=>{const y=335+i*43;text(x[0],75,y,10,C.muted);text(String(x[1]),465,y,13,C.cream,'right',900)});
 text('COLOSSUS PARTS',75,608,10,C.muted);text(`${r.flags.mg?'MG✓':'MG—'}  ${r.flags.rocket?'RKT✓':'RKT—'}  ${r.flags.armor?'ARM✓':'ARM—'}`,465,608,10,C.yellow,'right',900);
 text(`+${r.marksEarned||0} WASTELAND MARKS`,270,685,18,C.yellow,'center',900);
 btn(75,755,390,72,'ENTER GARAGE');
 text(`TOTAL MARKS ${profile.marks} • RUNS ${profile.runs} • WINS ${profile.wins}`,270,865,9,C.muted,'center',700);
}
function garageCards(defs,y0){
 return defs.map((d,i)=>({d,x:i%2===0?35:285,y:y0+Math.floor(i/2)*120,w:220,h:94}));
}
function drawGarageMeta(){
 drawDunes();ctx.fillStyle='rgba(11,13,10,.76)';ctx.fillRect(0,0,W,H);title('THE GARAGE',`WASTELAND MARKS ${profile.marks}`);
 text('STARTING KIT',35,130,11,C.yellow,'left',900);
 for(const c of garageCards(START_KITS,150)){const unlocked=profile.unlockedKits.includes(c.d.id),sel=profile.selectedKit===c.d.id;ctx.fillStyle=sel?'#4b452f':'#292c24';roundRect(c.x,c.y,c.w,c.h,12,true,false);ctx.strokeStyle=sel?C.yellow:'#505548';roundRect(c.x,c.y,c.w,c.h,12,false,true);text(c.d.name,c.x+14,c.y+28,12,unlocked?C.cream:C.muted,'left',900);text(c.d.desc,c.x+14,c.y+51,8,C.muted);text(unlocked?(sel?'SELECTED':'TAP TO SELECT'):`UNLOCK • ${c.d.cost} MARKS`,c.x+14,c.y+76,8,unlocked?C.yellow:C.red)}
 text('JUNKER CHASSIS',35,405,11,C.yellow,'left',900);
 for(const c of garageCards(CHASSIS,425)){const unlocked=profile.unlockedChassis.includes(c.d.id),sel=profile.selectedChassis===c.d.id;ctx.fillStyle=sel?'#4b452f':'#292c24';roundRect(c.x,c.y,c.w,c.h,12,true,false);ctx.strokeStyle=sel?C.yellow:'#505548';roundRect(c.x,c.y,c.w,c.h,12,false,true);text(c.d.name,c.x+14,c.y+28,12,unlocked?C.cream:C.muted,'left',900);text(c.d.desc,c.x+14,c.y+51,8,C.muted);text(unlocked?(sel?'SELECTED':'TAP TO SELECT'):`UNLOCK • ${c.d.cost} MARKS`,c.x+14,c.y+76,8,unlocked?C.yellow:C.red)}
 btn(75,775,390,72,'START NEW RUN');text('Unlock choices, not permanent damage bonuses.',270,880,9,C.muted,'center',700);drawNotice();
}
function garageTap(p){
 const handle=(cards,key,unlockedKey)=>{
  for(const c of cards)if(p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h){
   const list=profile[unlockedKey];if(list.includes(c.d.id)){profile[key]=c.d.id;saveProfile();notice=`${c.d.name} SELECTED`;noticeT=1;return true}
   if(profile.marks>=c.d.cost){profile.marks-=c.d.cost;list.push(c.d.id);profile[key]=c.d.id;saveProfile();notice=`${c.d.name} UNLOCKED`;noticeT=1}else{notice='NOT ENOUGH MARKS';noticeT=1}return true
  }return false;
 };
 if(handle(garageCards(START_KITS,150),'selectedKit','unlockedKits'))return;
 if(handle(garageCards(CHASSIS,425),'selectedChassis','unlockedChassis'))return;
 if(p.y>=775&&p.y<=847&&p.x>=75&&p.x<=465)startNewRun();
}
function draw(){ctx.clearRect(0,0,W,H);if(state==='menu')drawMenu();else if(state==='route')drawRoute();else if(state==='roadcombat')drawRoad();else if(state==='roadresult')drawRoadResult(false);else if(state==='roadfail')drawRoadResult(true);else if(state==='play'||state==='finalassault')drawScavenge();else if(state==='pack')drawGridScreen('pack');else if(state==='vehicle')drawGridScreen('vehicle');else if(state==='town')drawTown();else if(state==='event')drawEvent();else if(state==='runsummary')drawRunSummary();else if(state==='garage')drawGarageMeta();else if(state==='dead'){drawDunes();text('YOU DID NOT MAKE IT BACK',270,330,26,C.red,'center',900);wrap('New gear from this scavenging run was lost. Your persistent build remains for prototype testing.',75,390,390,22,13,C.muted);btn(75,600,390,70,'BACK TO ROAD MAP')}}

function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)}
ensureChoices();requestAnimationFrame(loop);
})();
