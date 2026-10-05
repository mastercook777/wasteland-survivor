(() => {
'use strict';

// A28 keeps town loadout screens on the town score and layers licensed samples with procedural SFX.
// Music and SFX credits and licenses are documented in MUSIC-CREDITS.md and SFX-CREDITS.md.
const AudioContextClass=window.AudioContext||window.webkitAudioContext;
const STORE_KEY='ws-audio-v3';
const SFX_OUTPUT=3.2;
let prefs={muted:false,music:.40,sfx:1};
try{
 const legacy=JSON.parse(localStorage.getItem('ws-audio-v2')||localStorage.getItem('ws-audio-v1')||'{}');
 const stored=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
 if(typeof legacy.muted==='boolean')prefs.muted=legacy.muted;
 prefs={...prefs,...stored}
}catch(e){}

const TRACKS={
 menu:{src:'assets/music/menu_un_desert.mp3',gain:.58},
 route:{src:'assets/music/route_cowboy.mp3',gain:.56},
 road:{src:'assets/music/road_battle.ogg',gain:.48},
 scavenge:{src:'assets/music/scavenge_battle.ogg',gain:.50},
 final:{src:'assets/music/final_battle.mp3',gain:.47},
 event:{src:'assets/music/event_tension.mp3',gain:.52},
 workshop:{src:'assets/music/workshop_funk.mp3',gain:.50},
 victory:{src:'assets/music/victory_theme.ogg',gain:.52},
 defeat:{src:'assets/music/defeat_theme.ogg',gain:.50,loop:false}
};

const SFX_SAMPLES={
 pistol:{src:'assets/sfx/pistol_9mm.mp3',gain:.095},
 smg:{src:'assets/sfx/smg_9mm.mp3',gain:.080},
 shotgun:{src:'assets/sfx/shotgun_12ga.mp3',gain:.120},
 rifle556:{src:'assets/sfx/rifle_556.mp3',gain:.090},
 rifle762:{src:'assets/sfx/rifle_762.mp3',gain:.105},
 rocket:{src:'assets/sfx/missile.wav',gain:.100},
 electric:{src:'assets/sfx/electric_hit.wav',gain:.090},
 explosion:{src:'assets/sfx/explosion.wav',gain:.120}
};

let ac=null,master=null,sfxBus=null,compressor=null,noiseBuffer=null;
let unlocked=false,desiredScene='menu',sceneDetail={},trackKey='menu',currentKey='',currentMusic=null,fadeToken=0;
let duckFactor=1,duckTimer=0,duckReleaseToken=0,duckEvents=0;
const players=new Map(),cooldown=new Map();
const sampleBuffers=new Map(),sampleLoading=new Map();
let sampleFailures=0,lastSample='none';

function savePrefs(){try{localStorage.setItem(STORE_KEY,JSON.stringify(prefs))}catch(e){}}
function midi(n){return 440*Math.pow(2,(n-69)/12)}
function getPlayer(key){
 if(players.has(key))return players.get(key);
 const spec=TRACKS[key]||TRACKS.menu,a=new Audio(new URL(spec.src,document.baseURI).href);
 a.loop=spec.loop!==false;a.preload='metadata';a.playsInline=true;a.volume=0;
 for(const event of ['playing','pause','waiting','error'])a.addEventListener(event,updateButton);
 players.set(key,a);return a;
}
function loadSample(key){
 if(sampleBuffers.has(key))return Promise.resolve(sampleBuffers.get(key));
 if(sampleLoading.has(key))return sampleLoading.get(key);
 const spec=SFX_SAMPLES[key];if(!spec||!ac)return Promise.resolve(null);
 const request=fetch(new URL(spec.src,document.baseURI).href,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error(`SFX ${r.status}`);return r.arrayBuffer()}).then(data=>ac.decodeAudioData(data)).then(buffer=>{sampleBuffers.set(key,buffer);updateButton();return buffer}).catch(()=>{sampleFailures++;updateButton();return null});
 sampleLoading.set(key,request);return request
}
function primeSamples(){Object.keys(SFX_SAMPLES).forEach(loadSample)}
function playSample(key,t,level=1,rate=1,delay=0){
 const buffer=sampleBuffers.get(key),spec=SFX_SAMPLES[key];if(!buffer||!spec||!ac)return false;
 const src=ac.createBufferSource(),g=ac.createGain(),start=t+delay,actualRate=Math.max(.35,rate*(.985+Math.random()*.03)),duration=buffer.duration/actualRate,peak=Math.max(.0002,spec.gain*level);
 src.buffer=buffer;src.playbackRate.value=actualRate;src.connect(g);g.connect(sfxBus);
 g.gain.setValueAtTime(peak,start);g.gain.setValueAtTime(peak,start+Math.max(.005,duration-.025));g.gain.exponentialRampToValueAtTime(.0001,start+duration);
 src.start(start);lastSample=key;updateButton();return true
}
function targetVolume(key){return prefs.muted?0:Math.min(1,prefs.music*(TRACKS[key]?.gain||.5)*duckFactor)}
function duckMusic(factor=.5,duration=240){
 if(!currentMusic||prefs.muted)return;
 duckReleaseToken++;duckFactor=Math.min(duckFactor,factor);duckEvents++;
 currentMusic.volume=Math.min(currentMusic.volume,targetVolume(currentKey));
 clearTimeout(duckTimer);updateButton();
 duckTimer=setTimeout(()=>{
  duckFactor=1;const token=++duckReleaseToken,a=currentMusic,start=a?.volume||0,began=performance.now();
  function release(now){
   if(token!==duckReleaseToken||!a||a!==currentMusic||a.paused)return;
   const p=Math.min(1,(now-began)/260),smooth=p*p*(3-2*p);
   a.volume=start+(targetVolume(currentKey)-start)*smooth;updateButton();
   if(p<1)requestAnimationFrame(release)
  }
  requestAnimationFrame(release)
 },duration)
}
async function switchMusic(key){
 trackKey=TRACKS[key]?key:'menu';updateButton();
 if(!unlocked||prefs.muted)return;
 const next=getPlayer(trackKey);
 if(next===currentMusic){
  if(next.paused)try{await next.play()}catch(e){}
  next.volume=targetVolume(trackKey);updateButton();return;
 }
 const token=++fadeToken,starts=new Map();
 players.forEach((a,k)=>{if(a!==next)starts.set(a,a.volume)});
 currentMusic=next;currentKey=trackKey;
 if(next.paused){next.currentTime=0;next.volume=0;try{await next.play()}catch(e){updateButton();return}}
 const start=performance.now(),duration=700;
 function fade(now){
  if(token!==fadeToken)return;
  const p=Math.min(1,(now-start)/duration),smooth=p*p*(3-2*p);
  next.volume=targetVolume(trackKey)*smooth;
  starts.forEach((volume,a)=>{a.volume=Math.max(0,volume*(1-smooth))});
  if(p<1)requestAnimationFrame(fade);else players.forEach(a=>{if(a!==next){a.pause();a.volume=0}});
  updateButton();
 }
 requestAnimationFrame(fade)
}
function resolveScene(name,detail={}){
 if(name==='town')return'menu';
 if(name==='finalassault')return'final';
 if(name==='routeleave')return'workshop';
 if(name==='roadcombat')return detail.final||detail.boss?'final':'road';
 if(name==='play')return'scavenge';
 if(name==='event')return'event';
 if(name==='pack'||name==='vehicle')return detail.returnState==='town'?'menu':'workshop';
 if(name==='garage')return'workshop';
 if(name==='roadresult')return'workshop';
 if(name==='roadfail'||name==='dead')return'defeat';
 if(name==='runsummary')return detail.victory?'victory':'defeat';
 if(name==='route')return'route';
 return'menu'
}
function sync(name,detail={}){
 desiredScene=name;sceneDetail=detail;const next=resolveScene(name,detail);
 if(next===trackKey){updateButton();return}switchMusic(next)
}

function ensure(){
 if(ac||!AudioContextClass)return !!ac;
 ac=new AudioContextClass();master=ac.createGain();sfxBus=ac.createGain();compressor=ac.createDynamicsCompressor();
 compressor.threshold.value=-16;compressor.knee.value=16;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.2;
 sfxBus.gain.value=prefs.sfx;master.gain.value=prefs.muted?0:SFX_OUTPUT;sfxBus.connect(compressor);compressor.connect(master);master.connect(ac.destination);
 const len=Math.max(1,Math.floor(ac.sampleRate*.5));noiseBuffer=ac.createBuffer(1,len,ac.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 primeSamples();
 return true
}
async function unlock(){
 if(!ensure())return false;
 try{if(ac.state!=='running')await ac.resume();unlocked=ac.state==='running'}catch(e){unlocked=false}
 if(unlocked&&!prefs.muted)await switchMusic(trackKey||resolveScene(desiredScene));
 updateButton();return unlocked
}
function env(g,t,a,d,peak){g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)}
function tone(freq,t,d=.12,type='square',level=.05,bus=sfxBus,filter=3000,detune=0){
 if(!ac)return;const o=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;f.type='lowpass';f.frequency.value=filter;f.Q.value=.7;o.connect(f);f.connect(g);g.connect(bus);env(g,t,.008,d,level);o.start(t);o.stop(t+d+.035)
}
function noise(t,d,level,bus=sfxBus,filter=1800,type='bandpass'){
 if(!ac)return;const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuffer;f.type=type;f.frequency.value=filter;f.Q.value=.75;s.connect(f);f.connect(g);g.connect(bus);env(g,t,.002,d,level);s.start(t);s.stop(t+d+.025)
}
function allow(name,seconds){const now=ac?.currentTime||performance.now()/1000,last=cooldown.get(name)||-99;if(now-last<seconds)return false;cooldown.set(name,now);return true}
function sweep(t,start,end,d=.12,type='square',level=.08){if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(start,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+d);o.connect(g);g.connect(sfxBus);env(g,t,.002,d,level);o.start(t);o.stop(t+d+.03)}
function sfx(name,opt={}){
 if(!unlocked||prefs.muted||!ac)return;const t=ac.currentTime+.006;
 const cd={ui:.035,select:.05,pistol:.07,shot:.07,smg:.055,rifle:.18,shotgun:.20,'vehicle-mg':.065,mg:.065,flak:.14,cannon:.30,rocket:.28,arc:.18,electric:.18,emp:.30,impact:.045,explosion:.09,hurt:.18,pickup:.08,error:.16,confirm:.08}[name]||.02;if(!allow(name,cd))return;
 const indicator=document.getElementById('audio-toggle');if(indicator)indicator.dataset.lastSfx=name;
 const duck={ui:[.72,100],select:[.62,150],confirm:[.56,220],error:[.50,220],engine:[.52,350],pistol:[.42,210],shot:[.42,210],smg:[.46,160],rifle:[.28,350],shotgun:[.23,420],'vehicle-mg':[.40,170],mg:[.40,170],flak:[.24,390],cannon:[.18,580],rocket:[.28,470],arc:[.30,330],electric:[.30,330],emp:[.20,540],impact:[.55,140],hurt:[.26,430],pickup:[.60,180],rare:[.38,520],heal:[.50,280],search:[.62,180],victory:[.34,650],defeat:[.34,650],whoosh:[.55,220]}[name];
 if(name==='explosion')duckMusic(opt.big?.22:.30,opt.big?560:420);else if(duck)duckMusic(duck[0],duck[1]);
 if(name==='ui'){tone(620,t,.035,'square',.035,sfxBus,2600);return}
 if(name==='select'){tone(520,t,.045,'square',.045,sfxBus,2800);tone(780,t+.035,.05,'square',.035,sfxBus,3200);return}
 if(name==='confirm'){tone(523,t,.055,'square',.045,sfxBus,3000);tone(659,t+.05,.055,'square',.045,sfxBus,3200);tone(784,t+.10,.08,'square',.05,sfxBus,3400);return}
 if(name==='error'){sweep(t,190,105,.13,'sawtooth',.065);return}
 if(name==='engine'){noise(t,.34,.055,sfxBus,430,'lowpass');sweep(t,48,105,.38,'sawtooth',.07);return}
 if(name==='pistol'||name==='shot'){playSample('pistol',t,1,1.02);noise(t,.055,.036,sfxBus,2400);tone(128,t,.055,'square',.028,sfxBus,1700);return}
 if(name==='smg'){playSample('smg',t,.92,1.06);noise(t,.038,.030,sfxBus,3400);tone(185,t,.035,'square',.022,sfxBus,2400);return}
 if(name==='rifle'){playSample('rifle762',t,1.12,.94);noise(t,.085,.045,sfxBus,1900);sweep(t,118,52,.11,'sawtooth',.038);return}
 if(name==='shotgun'){playSample('shotgun',t,1.08,.90);noise(t,.16,.075,sfxBus,1250);sweep(t,92,35,.18,'sawtooth',.055);return}
 if(name==='vehicle-mg'||name==='mg'){playSample('rifle556',t,.95,.97);noise(t,.052,.040,sfxBus,2900);tone(145,t,.045,'square',.030,sfxBus,1900);return}
 if(name==='flak'){playSample('shotgun',t,.72,1.10);playSample('rifle556',t,.64,.91,.035);noise(t,.14,.075,sfxBus,1050);sweep(t,128,38,.16,'sawtooth',.055);return}
 if(name==='cannon'){playSample('rifle762',t,.90,.70);playSample('explosion',t,1.12,.64,.018);noise(t,.28,.105,sfxBus,420,'lowpass');sweep(t,78,24,.34,'sawtooth',.080);return}
 if(name==='rocket'){playSample('rocket',t,1,.98);noise(t,.20,.048,sfxBus,1200);sweep(t,320,82,.28,'sawtooth',.040);return}
 if(name==='arc'||name==='electric'){playSample('electric',t,.88,1.14);sweep(t,150,1800,.14,'square',.045);tone(1380,t+.055,.065,'square',.026,sfxBus,5200);noise(t,.15,.035,sfxBus,4800,'highpass');return}
 if(name==='emp'){playSample('electric',t,1.05,.72);tone(58,t,.28,'sine',.070,sfxBus,540);tone(116,t+.045,.24,'triangle',.050,sfxBus,900);noise(t,.30,.055,sfxBus,760,'lowpass');sweep(t,95,820,.24,'sine',.040);return}
 if(name==='impact'){const heavy=['cannon','rocket','flak'].includes(opt.kind);noise(t,heavy?.08:.045,heavy?.060:.040,sfxBus,heavy?980:2400,heavy?'lowpass':'bandpass');if(heavy)tone(88,t,.08,'triangle',.032,sfxBus,900);return}
 if(name==='explosion'){playSample('explosion',t,opt.big?1.25:.92,opt.big?.78:1);noise(t,.28,opt.big?.13:.085,sfxBus,opt.big?380:620,'lowpass');sweep(t,opt.big?76:102,25,opt.big?.32:.21,'sawtooth',opt.big?.090:.060);return}
 if(name==='hurt'){noise(t,.11,.08,sfxBus,950);sweep(t,150,65,.13,'square',.075);return}
 if(name==='pickup'){tone(880,t,.05,'square',.045,sfxBus,3500);tone(1320,t+.045,.09,'square',.04,sfxBus,4200);return}
 if(name==='rare'){[0,4,7,12].forEach((n,i)=>tone(midi(72+n),t+i*.055,.11,'square',.045,sfxBus,4300));return}
 if(name==='heal'){[0,3,7].forEach((n,i)=>tone(midi(67+n),t+i*.05,.12,'triangle',.05,sfxBus,3500));return}
 if(name==='search'){noise(t,.07,.04,sfxBus,2800);tone(330,t,.09,'square',.028,sfxBus,2000);return}
 if(name==='victory'){[0,4,7,12].forEach((n,i)=>tone(midi(67+n),t+i*.09,.22,'square',.06,sfxBus,3900));return}
 if(name==='defeat'){[0,-2,-5,-12].forEach((n,i)=>tone(midi(55+n),t+i*.11,.28,'sawtooth',.045,sfxBus,1700));return}
 if(name==='whoosh'){noise(t,.18,.045,sfxBus,1100,'bandpass');sweep(t,160,420,.16,'triangle',.035)}
}
function setMuted(value){
 prefs.muted=!!value;savePrefs();fadeToken++;
 if(ensure()){master.gain.setTargetAtTime(prefs.muted?0:SFX_OUTPUT,ac.currentTime,.035)}
 if(prefs.muted){players.forEach(a=>{a.pause();a.volume=0})}else unlock().then(()=>switchMusic(trackKey));
 updateButton()
}
function toggle(){setMuted(!prefs.muted);if(!prefs.muted)sfx('confirm')}
function updateButton(){
 const b=document.getElementById('audio-toggle');if(!b)return;
 const label=!unlocked?'播放音乐和音效':prefs.muted?'开启音乐和音效':'关闭音乐和音效';
 b.textContent=prefs.muted?'♪×':'♪';b.classList.toggle('muted',prefs.muted);b.setAttribute('aria-label',label);b.title=label;
 b.dataset.track=currentKey||trackKey;b.dataset.scene=desiredScene;b.dataset.audioState=!unlocked?'locked':currentMusic&&!currentMusic.paused?'running':'ready';b.dataset.arrangement='hybrid-weapon-sfx-a28';b.dataset.musicSource=currentMusic?new URL(currentMusic.src).pathname.split('/').pop():'pending';b.dataset.musicVolume=(currentMusic?.volume||0).toFixed(3);b.dataset.musicTarget=targetVolume(currentKey||trackKey).toFixed(3);b.dataset.sfxOutput=(prefs.sfx*SFX_OUTPUT).toFixed(2);b.dataset.sfxSamples=`${sampleBuffers.size}/${Object.keys(SFX_SAMPLES).length}`;b.dataset.sfxSampleFailures=String(sampleFailures);b.dataset.lastSample=lastSample;b.dataset.duck=duckFactor.toFixed(2);b.dataset.duckEvents=String(duckEvents)
}
function bind(){
 const b=document.getElementById('audio-toggle');if(b)b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(!unlocked){unlock();return}toggle()});
 const gestureUnlock=e=>{if(e.target?.closest?.('#audio-toggle'))return;window.removeEventListener('pointerdown',gestureUnlock,true);unlock()};
 updateButton();window.addEventListener('pointerdown',gestureUnlock,true);window.addEventListener('keydown',unlock,{once:true,capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){players.forEach(a=>a.pause());if(ac)ac.suspend()}else if(!prefs.muted)unlock()})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
window.GameAudio={unlock,sync,sfx,toggle,setMuted,get muted(){return prefs.muted},get scene(){return desiredScene},get track(){return trackKey},get samples(){return{ready:sampleBuffers.size,total:Object.keys(SFX_SAMPLES).length,failures:sampleFailures,last:lastSample}},get mix(){return{music:prefs.music,sfx:prefs.sfx*SFX_OUTPUT,duck:duckFactor,volume:currentMusic?.volume||0}}};
})();
