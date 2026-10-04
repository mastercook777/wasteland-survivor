(() => {
'use strict';

// Original procedural soundtrack: compact, offline-friendly and designed for
// the game's rusty 16-bit road-RPG atmosphere. No recorded or third-party
// audio is required, so the installed PWA keeps the full soundtrack offline.
const AudioContextClass=window.AudioContext||window.webkitAudioContext;
const STORE_KEY='ws-audio-v1';
let prefs={muted:false,music:.58,sfx:.78};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(STORE_KEY)||'{}')}}catch(e){}

let ac=null,master=null,musicBus=null,sfxBus=null,compressor=null,noiseBuffer=null;
let unlocked=false,desiredScene='menu',sceneDetail={},trackKey='',step=0,nextStepTime=0;
const cooldown=new Map();

const P={
 menu:{bpm:88,root:40,drive:.42,lead:[12,null,7,null,10,null,7,null,12,null,14,null,10,7,null,null,12,null,7,null,10,null,5,null,7,null,10,null,7,5,null,null],bass:[0,null,0,null,-2,null,-2,null,-5,null,-5,null,-2,null,-2,null],drums:'slow'},
 route:{bpm:106,root:40,drive:.52,lead:[0,0,7,0,3,0,10,7,0,0,7,10,12,10,7,3,0,0,7,0,3,5,7,10,12,10,7,5,3,2,0,null],bass:[0,null,0,0,3,null,5,7,0,null,0,0,-2,null,-2,3],drums:'march'},
 road:{bpm:148,root:40,drive:.82,lead:[0,0,3,0,5,0,6,5,0,0,10,7,6,5,3,0,0,0,3,0,5,6,7,10,12,10,7,6,5,3,2,0],bass:[0,0,0,3,0,0,5,6,0,0,7,6,5,3,2,0],drums:'metal'},
 bossRoad:{bpm:158,root:38,drive:.9,lead:[0,0,1,0,6,5,3,1,0,0,8,6,5,3,1,0,0,1,3,5,6,8,9,8,6,5,3,1,0,-2,-4,-5],bass:[0,0,1,0,-5,-5,-4,-2,0,0,1,3,5,3,1,0],drums:'metal'},
 final:{bpm:166,root:38,drive:1,lead:[0,0,6,5,3,1,0,-2,0,0,8,6,5,3,1,0,12,12,9,8,6,5,3,1,0,1,3,5,6,8,9,11],bass:[0,0,-5,-5,0,1,3,5,0,0,-4,-4,1,0,-2,-4],drums:'metal'},
 scavengeGas:{bpm:118,root:40,drive:.60,lead:[0,null,3,0,null,5,6,null,0,null,3,5,6,5,3,null,0,null,7,6,null,5,3,null,0,null,-2,0,3,2,0,null],bass:[0,null,0,3,0,null,5,6,0,null,0,3,-2,null,-2,0],drums:'stalk'},
 scavengeClinic:{bpm:112,root:38,drive:.48,lead:[12,null,8,null,6,null,5,3,1,null,5,null,8,6,5,null,12,null,13,12,8,null,6,5,3,null,1,3,5,6,5,null],bass:[0,null,-4,null,-5,null,-2,null,0,null,1,null,-4,null,-5,null],drums:'stalk'},
 scavengeMotel:{bpm:122,root:42,drive:.58,lead:[0,null,4,5,7,null,5,4,0,null,4,5,9,7,5,null,0,null,-2,0,4,null,5,7,9,7,5,4,2,0,null,null],bass:[0,null,0,4,5,null,4,0,0,null,-2,0,5,null,4,0],drums:'stalk'},
 scavengeJunk:{bpm:126,root:40,drive:.70,lead:[0,0,3,null,5,6,5,3,0,0,7,null,10,7,6,5,0,0,3,null,5,6,7,10,12,10,7,6,5,3,2,0],bass:[0,0,3,null,0,0,5,6,0,0,7,null,5,3,2,0],drums:'metal'},
 town:{bpm:94,root:43,drive:.34,lead:[0,null,4,null,7,null,9,7,5,null,4,null,2,null,0,null,0,null,4,null,7,null,11,9,7,5,4,2,0,null,null,null],bass:[0,null,null,4,5,null,null,4,0,null,null,-3,-5,null,null,-1],drums:'brush'},
 event:{bpm:104,root:39,drive:.44,lead:[0,null,1,null,6,null,5,null,0,null,8,null,6,5,1,null,0,null,-2,null,1,null,3,null,6,5,3,1,0,null,null,null],bass:[0,null,-5,null,0,null,1,null,0,null,-4,null,-5,null,-2,null],drums:'pulse'},
 workshop:{bpm:82,root:40,drive:.27,lead:[0,null,null,7,null,null,10,null,12,null,10,null,7,null,3,null,0,null,null,5,null,null,8,null,10,null,8,null,5,3,2,null],bass:[0,null,null,null,3,null,null,null,5,null,null,null,3,null,-2,null],drums:'brush'},
 victory:{bpm:122,root:43,drive:.54,lead:[0,4,7,12,11,9,7,4,5,9,12,14,12,9,7,5,0,4,7,12,16,14,12,11,9,7,5,4,2,4,7,12],bass:[0,null,4,null,5,null,4,null,0,null,5,null,7,null,5,null],drums:'march'},
 defeat:{bpm:70,root:38,drive:.22,lead:[12,null,null,8,null,null,6,null,5,null,null,3,null,null,1,null,0,null,null,-4,null,null,-5,null,-7,null,null,-5,-4,null,null,null],bass:[0,null,null,null,-4,null,null,null,-5,null,null,null,-7,null,null,null],drums:'none'},
 garage:{bpm:92,root:40,drive:.38,lead:[0,null,3,5,7,null,10,7,0,null,3,5,6,5,3,null,0,null,-2,0,3,null,5,7,10,7,5,3,2,0,null,null],bass:[0,null,0,null,3,null,5,null,0,null,-2,null,-5,null,-2,null],drums:'brush'}
};

function savePrefs(){try{localStorage.setItem(STORE_KEY,JSON.stringify(prefs))}catch(e){}}
function midi(n){return 440*Math.pow(2,(n-69)/12)}
function makeCurve(amount=26){const n=256,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=(Math.PI+amount)*x/(Math.PI+amount*Math.abs(x))}return c}
function ensure(){
 if(ac||!AudioContextClass)return !!ac;
 ac=new AudioContextClass();master=ac.createGain();musicBus=ac.createGain();sfxBus=ac.createGain();compressor=ac.createDynamicsCompressor();
 compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=5;compressor.attack.value=.004;compressor.release.value=.2;
 musicBus.gain.value=prefs.music;sfxBus.gain.value=prefs.sfx;master.gain.value=prefs.muted?0:.9;
 musicBus.connect(compressor);sfxBus.connect(compressor);compressor.connect(master);master.connect(ac.destination);
 const len=Math.max(1,Math.floor(ac.sampleRate*.5));noiseBuffer=ac.createBuffer(1,len,ac.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 return true;
}
async function unlock(){
 if(!ensure())return false;
 try{if(ac.state!=='running')await ac.resume();unlocked=ac.state==='running'}catch(e){unlocked=false}
 if(unlocked&&!nextStepTime)nextStepTime=ac.currentTime+.06;
 updateButton();return unlocked;
}
function env(g,t,a,d,peak){g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)}
function tone(freq,t,d=.12,type='square',level=.05,bus=musicBus,filter=3000,detune=0){
 if(!ac)return;const o=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;f.type='lowpass';f.frequency.value=filter;f.Q.value=.7;o.connect(f);f.connect(g);g.connect(bus);env(g,t,.008,d,level);o.start(t);o.stop(t+d+.035)
}
function guitar(freq,t,d=.12,level=.045){
 if(!ac)return;const mix=ac.createGain(),sh=ac.createWaveShaper(),f=ac.createBiquadFilter(),g=ac.createGain();sh.curve=makeCurve(32);sh.oversample='2x';f.type='lowpass';f.frequency.value=1850;f.Q.value=1.1;
 for(const detune of [-7,7]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=freq;o.detune.value=detune;o.connect(mix);o.start(t);o.stop(t+d+.045)}
 mix.gain.value=.42;mix.connect(sh);sh.connect(f);f.connect(g);g.connect(musicBus);env(g,t,.006,d,level)
}
function noise(t,d,level,bus=sfxBus,filter=1800,type='bandpass'){
 if(!ac)return;const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuffer;f.type=type;f.frequency.value=filter;f.Q.value=.75;s.connect(f);f.connect(g);g.connect(bus);env(g,t,.002,d,level);s.start(t);s.stop(t+d+.025)
}
function kick(t,level=.14){if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(145,t);o.frequency.exponentialRampToValueAtTime(43,t+.09);o.connect(g);g.connect(musicBus);env(g,t,.002,.12,level);o.start(t);o.stop(t+.15)}
function snare(t,level=.075){noise(t,.10,level,musicBus,1750,'bandpass');tone(185,t,.055,'triangle',level*.32,musicBus,1200)}
function hat(t,level=.025){noise(t,.035,level,musicBus,7200,'highpass')}
function drumStep(style,s,t){
 if(style==='none')return;
 if(style==='slow'){if(s%8===0)kick(t,.09);if(s%16===8)snare(t,.05);if(s%4===0)hat(t,.012);return}
 if(style==='brush'){if(s%8===0)kick(t,.075);if(s%8===4)snare(t,.04);if(s%2===0)hat(t,.012);return}
 if(style==='pulse'){if(s%8===0)kick(t,.09);if(s%4===2)hat(t,.018);if(s%16===12)snare(t,.045);return}
 if(style==='stalk'){if(s%8===0)kick(t,.11);if(s%8===4)snare(t,.06);hat(t,s%2?.018:.026);return}
 if(style==='march'){if(s%8===0||s%16===6)kick(t,.12);if(s%8===4)snare(t,.065);if(s%2===0)hat(t,.02);return}
 if(style==='metal'){if(s%4===0||s%16===2||s%16===10)kick(t,.14);if(s%8===4)snare(t,.085);hat(t,s%2?.026:.034)}
}
function scheduleStep(track,s,t){
 const beat=60/track.bpm,dur=beat*.19,li=track.lead[s%track.lead.length],bi=track.bass[s%track.bass.length];
 drumStep(track.drums,s,t);
 if(bi!=null){tone(midi(track.root-12+bi),t,beat*.42,'square',.035+track.drive*.014,musicBus,700);if(track.drive>.55)guitar(midi(track.root+bi),t,beat*.24,.018+track.drive*.015)}
 if(li!=null){const f=midi(track.root+12+li);tone(f,t,dur,track.drive>.55?'square':'triangle',.025+track.drive*.025,musicBus,track.drive>.7?2300:3400);if(track.drive>.75&&s%4===0)tone(f*2,t,dur*.65,'square',.008,musicBus,2600,4)}
}
function scheduler(){
 if(!unlocked||!ac||ac.state!=='running'||prefs.muted)return;
 const track=P[trackKey]||P.menu;if(!nextStepTime)nextStepTime=ac.currentTime+.05;
 while(nextStepTime<ac.currentTime+.13){scheduleStep(track,step,nextStepTime);nextStepTime+=60/track.bpm/4;step=(step+1)%64}
}
function resolveScene(name,detail){
 if(name==='roadcombat'||name==='routeleave')return detail.final?'final':detail.boss?'bossRoad':'road';
 if(name==='play')return detail.site==='clinic'?'scavengeClinic':detail.site==='motel'?'scavengeMotel':detail.site==='junkyard'?'scavengeJunk':'scavengeGas';
 if(name==='finalassault')return'final';if(name==='route')return'route';if(name==='town')return'town';if(name==='event')return'event';
 if(name==='pack'||name==='vehicle')return'workshop';if(name==='roadresult')return'victory';if(name==='roadfail'||name==='dead')return'defeat';
 if(name==='runsummary')return detail.victory?'victory':'defeat';if(name==='garage')return'garage';return'menu'
}
function sync(name,detail={}){
 desiredScene=name;sceneDetail=detail;const next=resolveScene(name,detail);if(next===trackKey)return;trackKey=next;step=0;if(ac)nextStepTime=ac.currentTime+.08;updateButton()
}
function allow(name,seconds){const now=ac?.currentTime||performance.now()/1000,last=cooldown.get(name)||-99;if(now-last<seconds)return false;cooldown.set(name,now);return true}
function sweep(t,start,end,d=.12,type='square',level=.08){if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(start,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+d);o.connect(g);g.connect(sfxBus);env(g,t,.002,d,level);o.start(t);o.stop(t+d+.03)}
function sfx(name,opt={}){
 if(!unlocked||prefs.muted||!ac)return;const t=ac.currentTime+.006;
 const cd={ui:.035,select:.05,shot:.055,mg:.075,impact:.045,explosion:.09,hurt:.18,pickup:.08,error:.16,confirm:.08}[name]||.02;if(!allow(name,cd))return;
 const indicator=document.getElementById('audio-toggle');if(indicator)indicator.dataset.lastSfx=name;
 if(name==='ui'){tone(620,t,.035,'square',.035,sfxBus,2600);return}
 if(name==='select'){tone(520,t,.045,'square',.045,sfxBus,2800);tone(780,t+.035,.05,'square',.035,sfxBus,3200);return}
 if(name==='confirm'){tone(523,t,.055,'square',.045,sfxBus,3000);tone(659,t+.05,.055,'square',.045,sfxBus,3200);tone(784,t+.10,.08,'square',.05,sfxBus,3400);return}
 if(name==='error'){sweep(t,190,105,.13,'sawtooth',.065);return}
 if(name==='engine'){noise(t,.34,.055,sfxBus,430,'lowpass');sweep(t,48,105,.38,'sawtooth',.07);return}
 if(name==='mg'||name==='shot'){noise(t,name==='mg'?.045:.07,name==='mg'?.065:.085,sfxBus,name==='mg'?2600:1800);sweep(t,name==='mg'?165:120,name==='mg'?92:58,name==='mg'?.055:.09,'square',name==='mg'?.045:.065);return}
 if(name==='shotgun'){noise(t,.14,.14,sfxBus,1500);sweep(t,105,42,.14,'sawtooth',.09);return}
 if(name==='cannon'){noise(t,.24,.18,sfxBus,520,'lowpass');sweep(t,95,30,.24,'sawtooth',.13);return}
 if(name==='rocket'){noise(t,.18,.08,sfxBus,900);sweep(t,520,115,.22,'sawtooth',.06);return}
 if(name==='electric'){sweep(t,120,1350,.12,'square',.055);noise(t,.16,.055,sfxBus,4500,'highpass');return}
 if(name==='impact'){noise(t,.045,.045,sfxBus,2100);return}
 if(name==='explosion'){noise(t,.28,opt.big?.19:.12,sfxBus,opt.big?420:650,'lowpass');sweep(t,opt.big?82:105,28,opt.big?.30:.20,'sawtooth',opt.big?.12:.075);return}
 if(name==='hurt'){noise(t,.11,.08,sfxBus,950);sweep(t,150,65,.13,'square',.075);return}
 if(name==='pickup'){tone(880,t,.05,'square',.045,sfxBus,3500);tone(1320,t+.045,.09,'square',.04,sfxBus,4200);return}
 if(name==='rare'){[0,4,7,12].forEach((n,i)=>tone(midi(72+n),t+i*.055,.11,'square',.045,sfxBus,4300));return}
 if(name==='heal'){[0,3,7].forEach((n,i)=>tone(midi(67+n),t+i*.05,.12,'triangle',.05,sfxBus,3500));return}
 if(name==='search'){noise(t,.07,.04,sfxBus,2800);tone(330,t,.09,'square',.028,sfxBus,2000);return}
 if(name==='victory'){[0,4,7,12].forEach((n,i)=>tone(midi(67+n),t+i*.09,.22,'square',.06,sfxBus,3900));return}
 if(name==='defeat'){[0,-2,-5,-12].forEach((n,i)=>tone(midi(55+n),t+i*.11,.28,'sawtooth',.045,sfxBus,1700));return}
 if(name==='whoosh'){noise(t,.18,.045,sfxBus,1100,'bandpass');sweep(t,160,420,.16,'triangle',.035)}
}
function setMuted(value){prefs.muted=!!value;savePrefs();if(ensure()){const t=ac.currentTime;master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(prefs.muted?0:.9,t,.035);if(!prefs.muted){unlock();nextStepTime=ac.currentTime+.07}}updateButton()}
function toggle(){setMuted(!prefs.muted);if(!prefs.muted)sfx('confirm')}
function updateButton(){const b=document.getElementById('audio-toggle');if(!b)return;b.textContent=prefs.muted?'♪×':'♪';b.classList.toggle('muted',prefs.muted);b.setAttribute('aria-label',prefs.muted?'开启音乐和音效':'关闭音乐和音效');b.title=prefs.muted?'开启音乐和音效':'关闭音乐和音效';b.dataset.track=trackKey||'pending';b.dataset.audioState=ac?.state||'locked'}
function bind(){const b=document.getElementById('audio-toggle');if(b)b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();unlock().then(toggle)});updateButton();window.addEventListener('pointerdown',unlock,{once:true,capture:true});window.addEventListener('keydown',unlock,{once:true,capture:true});document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend();else if(!prefs.muted)unlock()})}
setInterval(scheduler,25);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
window.GameAudio={unlock,sync,sfx,toggle,setMuted,get muted(){return prefs.muted},get scene(){return desiredScene},get track(){return trackKey}};
})();
