(() => {
'use strict';

// Original procedural soundtrack inspired by the broad musical vocabulary of
// classic wasteland road RPGs: western melody, rock momentum, blues colour and
// occasional jazz harmony. Every motif here is newly composed for this game.
const AudioContextClass=window.AudioContext||window.webkitAudioContext;
const STORE_KEY='ws-audio-v1';
let prefs={muted:false,music:.62,sfx:.78};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(STORE_KEY)||'{}')}}catch(e){}

let ac=null,master=null,musicBus=null,melodyBus=null,rhythmBus=null,drumBus=null,sfxBus=null,compressor=null,noiseBuffer=null;
let unlocked=false,desiredScene='menu',sceneDetail={},trackKey='',step=0,nextStepTime=0,leadNotesPlayed=0;
const cooldown=new Map();

function phrase(...bars){
 const out=[];
 bars.join(' ').trim().split(/\s+/).forEach(token=>{
  const [rawPitch,rawLen='1']=token.split('/'),len=Math.max(1,Number(rawLen)||1);
  out.push(rawPitch==='r'?null:{pitch:Number(rawPitch),len});
  for(let i=1;i<len;i++)out.push(null);
 });
 return out;
}

const P={
 menu:{bpm:84,root:40,drive:.34,timbre:'whistle',duet:7,chords:[0,-5,-2,-7,0,-5,3,-2],drums:'slow',lead:phrase(
  '12/4 10/2 7/2 5/4 7/2 10/2','12/6 14/2 12/4 10/2 7/2','5/4 7/2 10/2 12/4 10/2 7/2','5/6 3/2 2/2 3/2 0/4')},
 route:{bpm:104,root:40,drive:.52,timbre:'guitar',duet:7,chords:[0,3,-2,-5,0,3,-7,-2],drums:'march',lead:phrase(
  '0/3 3/1 5/4 7/3 5/1 3/4','0/2 3/2 5/2 7/2 10/4 7/2 5/2','3/3 5/1 7/4 12/4 10/2 7/2','5/2 3/2 2/2 3/2 0/6 r/2')},
 road:{bpm:142,root:40,drive:.78,timbre:'guitar',duet:7,chords:[0,-2,3,-5,0,-2,-7,-5],drums:'metal',lead:phrase(
  '0/2 3/2 5/4 7/2 10/2 7/4','5/2 7/2 10/2 12/4 10/2 7/2 5/2','3/2 5/2 7/4 10/2 12/2 15/4','14/2 12/2 10/2 7/2 5/2 3/2 2/2 0/2')},
 bossRoad:{bpm:152,root:38,drive:.88,timbre:'guitar',duet:6,chords:[0,1,-5,-4,0,1,3,-2],drums:'metal',lead:phrase(
  '0/2 1/2 6/4 5/2 3/2 1/4','0/2 3/2 6/2 8/2 9/4 8/2 6/2','5/2 6/2 8/4 12/2 9/2 8/4','6/2 5/2 3/2 1/2 0/2 -2/2 -4/2 -5/2')},
 final:{bpm:160,root:38,drive:.96,timbre:'guitar',duet:6,chords:[0,-5,1,-4,0,3,-2,-5],drums:'metal',lead:phrase(
  '0/2 6/2 5/2 3/2 1/2 3/2 5/4','6/2 8/2 9/4 8/2 6/2 5/4','12/3 9/1 8/2 6/2 5/2 3/2 1/4','0/2 1/2 3/2 5/2 6/2 8/2 9/2 11/2')},
 scavengeGas:{bpm:112,root:40,drive:.5,timbre:'whistle',duet:7,chords:[0,3,-5,-2,0,-7,-5,-2],drums:'stalk',lead:phrase(
  '0/4 3/2 5/2 6/4 5/2 3/2','0/4 7/2 6/2 5/4 3/2 0/2','r/2 3/2 5/4 7/2 10/2 7/4','6/2 5/2 3/2 2/2 0/6 r/2')},
 scavengeClinic:{bpm:108,root:38,drive:.4,timbre:'organ',duet:3,chords:[0,-4,-5,-2,0,1,-4,-5],drums:'stalk',lead:phrase(
  '12/4 8/4 6/2 5/2 3/4','1/4 5/4 8/2 6/2 5/4','12/4 13/2 12/2 8/4 6/2 5/2','3/4 1/2 3/2 5/2 6/2 5/4')},
 scavengeMotel:{bpm:116,root:42,drive:.46,timbre:'organ',duet:4,chords:[0,4,5,4,0,-2,5,4],drums:'stalk',lead:phrase(
  '0/4 4/2 5/2 7/4 5/2 4/2','0/4 4/2 5/2 9/4 7/2 5/2','r/2 -2/2 0/4 4/2 5/2 7/4','9/2 7/2 5/2 4/2 2/2 0/4 r/2')},
 scavengeJunk:{bpm:124,root:40,drive:.68,timbre:'guitar',duet:7,chords:[0,3,-2,-5,0,-7,-5,-2],drums:'metal',lead:phrase(
  '0/2 3/2 5/4 6/2 5/2 3/4','0/2 7/2 10/4 7/2 6/2 5/4','3/2 5/2 6/2 7/2 10/4 12/4','10/2 7/2 6/2 5/2 3/2 2/2 0/4')},
 town:{bpm:92,root:43,drive:.28,timbre:'organ',duet:4,chords:[0,4,5,4,0,-3,-5,-1],drums:'brush',lead:phrase(
  '0/4 4/2 7/2 9/4 7/2 5/2','4/4 2/2 0/2 4/4 7/4','11/4 9/2 7/2 5/4 4/2 2/2','0/6 2/2 4/2 2/2 0/4')},
 event:{bpm:100,root:39,drive:.36,timbre:'whistle',duet:6,chords:[0,1,-5,-4,0,-4,-5,-2],drums:'pulse',lead:phrase(
  '0/4 1/2 6/2 5/4 1/4','0/4 8/2 6/2 5/2 3/2 1/4','r/2 -2/2 1/4 3/2 6/2 5/4','3/2 1/2 0/6 r/6')},
 workshop:{bpm:80,root:40,drive:.22,timbre:'organ',duet:7,chords:[0,3,5,3,0,-2,-5,-2],drums:'brush',lead:phrase(
  '0/6 7/2 10/4 7/4','3/6 5/2 8/4 5/4','0/4 5/4 10/4 8/4','5/4 3/2 2/2 0/6 r/2')},
 victory:{bpm:118,root:43,drive:.5,timbre:'guitar',duet:4,chords:[0,4,5,7,0,5,7,0],drums:'march',lead:phrase(
  '0/2 4/2 7/2 12/4 11/2 9/2 7/2','5/2 9/2 12/2 14/4 12/2 9/2 7/2','0/2 4/2 7/2 12/2 16/2 14/2 12/2 11/2','9/2 7/2 5/2 4/2 7/2 9/2 12/4')},
 defeat:{bpm:68,root:38,drive:.18,timbre:'whistle',duet:3,chords:[0,-4,-5,-7,0,-4,-5,-7],drums:'none',lead:phrase(
  '12/6 8/2 6/6 5/2','3/6 1/2 0/8','r/2 -4/6 -5/4 -7/4','-5/4 -4/4 0/8')},
 garage:{bpm:90,root:40,drive:.32,timbre:'guitar',duet:7,chords:[0,3,5,3,0,-2,-5,-2],drums:'brush',lead:phrase(
  '0/4 3/2 5/2 7/4 10/2 7/2','0/4 3/2 5/2 6/4 5/2 3/2','r/2 -2/2 0/4 3/2 5/2 7/4','10/2 7/2 5/2 3/2 2/2 0/4 r/2')}
};

function savePrefs(){try{localStorage.setItem(STORE_KEY,JSON.stringify(prefs))}catch(e){}}
function midi(n){return 440*Math.pow(2,(n-69)/12)}
function makeCurve(amount=26){const n=256,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=(Math.PI+amount)*x/(Math.PI+amount*Math.abs(x))}return c}
function ensure(){
 if(ac||!AudioContextClass)return !!ac;
 ac=new AudioContextClass();master=ac.createGain();musicBus=ac.createGain();melodyBus=ac.createGain();rhythmBus=ac.createGain();drumBus=ac.createGain();sfxBus=ac.createGain();compressor=ac.createDynamicsCompressor();
 compressor.threshold.value=-15;compressor.knee.value=16;compressor.ratio.value=3;compressor.attack.value=.008;compressor.release.value=.24;
 musicBus.gain.value=prefs.music;melodyBus.gain.value=1;rhythmBus.gain.value=.72;drumBus.gain.value=.52;sfxBus.gain.value=prefs.sfx;master.gain.value=prefs.muted?0:.88;
 melodyBus.connect(musicBus);rhythmBus.connect(musicBus);drumBus.connect(musicBus);
 const echoSend=ac.createGain(),echo=ac.createDelay(.5),echoWet=ac.createGain();echoSend.gain.value=.16;echo.delayTime.value=.21;echoWet.gain.value=.15;melodyBus.connect(echoSend);echoSend.connect(echo);echo.connect(echoWet);echoWet.connect(musicBus);
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
function sustainEnv(g,t,d,peak){
 const attack=Math.min(.035,d*.16),release=Math.min(.16,d*.3),hold=Math.max(t+attack+.01,t+d-release);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(peak*.72,Math.min(hold,t+attack+.09));g.gain.setValueAtTime(peak*.72,hold);g.gain.exponentialRampToValueAtTime(.0001,t+d)
}
function tone(freq,t,d=.12,type='square',level=.05,bus=rhythmBus,filter=3000,detune=0){
 if(!ac)return;const o=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;f.type='lowpass';f.frequency.value=filter;f.Q.value=.7;o.connect(f);f.connect(g);g.connect(bus);env(g,t,.008,d,level);o.start(t);o.stop(t+d+.035)
}
function leadVoice(freq,t,d,timbre='guitar',level=.085){
 if(!ac)return;const mix=ac.createGain(),f=ac.createBiquadFilter(),g=ac.createGain(),lfo=ac.createOscillator(),vib=ac.createGain();
 const shapes=timbre==='whistle'?['triangle','sine']:timbre==='organ'?['square','triangle']:['sawtooth','triangle'];
 f.type='lowpass';f.frequency.value=timbre==='guitar'?2400:3600;f.Q.value=timbre==='guitar'?1.4:.75;mix.gain.value=timbre==='guitar'?.42:.55;
 lfo.frequency.value=timbre==='whistle'?5.4:4.7;vib.gain.value=timbre==='guitar'?4.5:7;lfo.connect(vib);
 shapes.forEach((type,i)=>{const o=ac.createOscillator();o.type=type;o.frequency.value=freq;o.detune.value=i?5:-3;vib.connect(o.detune);o.connect(mix);o.start(t);o.stop(t+d+.05)});
 mix.connect(f);f.connect(g);g.connect(melodyBus);sustainEnv(g,t,d,level);lfo.start(t);lfo.stop(t+d+.05)
}
function guitar(freq,t,d=.12,level=.045){
 if(!ac)return;const mix=ac.createGain(),sh=ac.createWaveShaper(),f=ac.createBiquadFilter(),g=ac.createGain();sh.curve=makeCurve(28);sh.oversample='2x';f.type='lowpass';f.frequency.value=1700;f.Q.value=1.1;
 for(const detune of [-6,6]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=freq;o.detune.value=detune;o.connect(mix);o.start(t);o.stop(t+d+.045)}
 mix.gain.value=.36;mix.connect(sh);sh.connect(f);f.connect(g);g.connect(rhythmBus);env(g,t,.006,d,level)
}
function noise(t,d,level,bus=sfxBus,filter=1800,type='bandpass'){
 if(!ac)return;const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuffer;f.type=type;f.frequency.value=filter;f.Q.value=.75;s.connect(f);f.connect(g);g.connect(bus);env(g,t,.002,d,level);s.start(t);s.stop(t+d+.025)
}
function kick(t,level=.07){if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(135,t);o.frequency.exponentialRampToValueAtTime(43,t+.085);o.connect(g);g.connect(drumBus);env(g,t,.002,.11,level);o.start(t);o.stop(t+.14)}
function snare(t,level=.045){noise(t,.09,level,drumBus,1750,'bandpass');tone(185,t,.05,'triangle',level*.25,drumBus,1100)}
function hat(t,level=.014){noise(t,.03,level,drumBus,7200,'highpass')}
function drumStep(style,s,t){
 if(style==='none')return;
 if(style==='slow'){if(s%8===0)kick(t,.052);if(s%16===8)snare(t,.032);if(s%4===0)hat(t,.007);return}
 if(style==='brush'){if(s%8===0)kick(t,.045);if(s%8===4)snare(t,.027);if(s%2===0)hat(t,.007);return}
 if(style==='pulse'){if(s%8===0)kick(t,.052);if(s%4===2)hat(t,.01);if(s%16===12)snare(t,.03);return}
 if(style==='stalk'){if(s%8===0)kick(t,.058);if(s%8===4)snare(t,.035);if(s%2===0)hat(t,.011);return}
 if(style==='march'){if(s%8===0||s%16===6)kick(t,.063);if(s%8===4)snare(t,.038);if(s%2===0)hat(t,.011);return}
 if(style==='metal'){if(s%4===0||s%16===2||s%16===10)kick(t,.07);if(s%8===4)snare(t,.045);hat(t,s%2?.011:.016)}
}
function arrangeHarmony(track,s,t,unit){
 const chord=track.chords[Math.floor(s/8)%track.chords.length];
 if(s%4===0){
  tone(midi(track.root-12+chord),t,unit*3.25,'square',.032+track.drive*.012,rhythmBus,650);
  if(track.drive>.42){guitar(midi(track.root+chord),t,unit*2.6,.025+track.drive*.014);guitar(midi(track.root+chord+7),t,unit*2.2,.014+track.drive*.008)}
 }else if(track.drive<.45&&s%4===2){
  tone(midi(track.root+12+chord+7),t,unit*1.4,'triangle',.018,rhythmBus,2400)
 }
}
function scheduleStep(track,s,t){
 const unit=60/track.bpm/4,note=track.lead[s%track.lead.length];
 drumStep(track.drums,s,t);arrangeHarmony(track,s,t,unit);
 if(note){
  const duration=Math.max(unit*.9,unit*note.len*.88),freq=midi(track.root+12+note.pitch),level=.068+track.drive*.025;
  leadVoice(freq,t,duration,track.timbre,level);leadNotesPlayed++;
  if(s>=32&&track.duet!=null)leadVoice(midi(track.root+12+note.pitch-track.duet),t+unit*.035,duration*.92,track.timbre,level*.42)
 }
}
function scheduler(){
 if(!unlocked||!ac||ac.state!=='running'||prefs.muted)return;
 const track=P[trackKey]||P.menu;if(!nextStepTime)nextStepTime=ac.currentTime+.05;
 while(nextStepTime<ac.currentTime+.13){scheduleStep(track,step,nextStepTime);nextStepTime+=60/track.bpm/4;step=(step+1)%64}
 updateButton();
}
function resolveScene(name,detail){
 if(name==='roadcombat'||name==='routeleave')return detail.final?'final':detail.boss?'bossRoad':'road';
 if(name==='play')return detail.site==='clinic'?'scavengeClinic':detail.site==='motel'?'scavengeMotel':detail.site==='junkyard'?'scavengeJunk':'scavengeGas';
 if(name==='finalassault')return'final';if(name==='route')return'route';if(name==='town')return'town';if(name==='event')return'event';
 if(name==='pack'||name==='vehicle')return'workshop';if(name==='roadresult')return'victory';if(name==='roadfail'||name==='dead')return'defeat';
 if(name==='runsummary')return detail.victory?'victory':'defeat';if(name==='garage')return'garage';return'menu'
}
function sync(name,detail={}){
 desiredScene=name;sceneDetail=detail;const next=resolveScene(name,detail);if(next===trackKey)return;trackKey=next;step=0;leadNotesPlayed=0;if(ac)nextStepTime=ac.currentTime+.08;updateButton()
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
function setMuted(value){prefs.muted=!!value;savePrefs();if(ensure()){const t=ac.currentTime;master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(prefs.muted?0:.88,t,.035);if(!prefs.muted){unlock();nextStepTime=ac.currentTime+.07}}updateButton()}
function toggle(){setMuted(!prefs.muted);if(!prefs.muted)sfx('confirm')}
function updateButton(){const b=document.getElementById('audio-toggle');if(!b)return;b.textContent=prefs.muted?'♪×':'♪';b.classList.toggle('muted',prefs.muted);b.setAttribute('aria-label',prefs.muted?'开启音乐和音效':'关闭音乐和音效');b.title=prefs.muted?'开启音乐和音效':'关闭音乐和音效';b.dataset.track=trackKey||'pending';b.dataset.audioState=ac?.state||'locked';b.dataset.arrangement='melodic-a24';b.dataset.leadNotes=String(leadNotesPlayed)}
function bind(){const b=document.getElementById('audio-toggle');if(b)b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();unlock().then(toggle)});updateButton();window.addEventListener('pointerdown',unlock,{once:true,capture:true});window.addEventListener('keydown',unlock,{once:true,capture:true});document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend();else if(!prefs.muted)unlock()})}
setInterval(scheduler,25);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
window.GameAudio={unlock,sync,sfx,toggle,setMuted,get muted(){return prefs.muted},get scene(){return desiredScene},get track(){return trackKey}};
})();
