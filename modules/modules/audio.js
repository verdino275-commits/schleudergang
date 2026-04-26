// ── AUDIO MODULE ─────────────────────────────────────────────────

// ── SOUND ────────────────────────────────────────────────────
let _actx=null,sfxOn=localStorage.getItem('sg_sfx')!=='0',musOn=localStorage.getItem('sg_mus')!=='0';
let _musGain=null,_musNodes=[],_musGen=0,_musDuckTm=null,_musStarted=false;
let _musStyle=localStorage.getItem('sg_mus_style')||'ambient';

function _getCtx(){
  if(!_actx)_actx=new(window.AudioContext||window.webkitAudioContext)();
  if(_actx.state==='suspended')_actx.resume();
  return _actx;
}
function _duck(ms){
  if(!_musGain)return;
  const ctx=_getCtx();
  _musGain.gain.setTargetAtTime(0.025,ctx.currentTime,0.06);
  if(_musDuckTm)clearTimeout(_musDuckTm);
  _musDuckTm=setTimeout(()=>{if(_musGain)_musGain.gain.setTargetAtTime(musOn?0.13:0,_getCtx().currentTime,0.45);},ms||700);
}
function _tone(freq,type,dur,vol,delay){
  if(!sfxOn)return;
  const ctx=_getCtx(),o=ctx.createOscillator(),g=ctx.createGain();
  o.connect(g);g.connect(ctx.destination);
  o.type=type||'sine';o.frequency.setValueAtTime(freq,ctx.currentTime+(delay||0));
  g.gain.setValueAtTime(0,ctx.currentTime+(delay||0));
  g.gain.linearRampToValueAtTime(vol||0.25,ctx.currentTime+(delay||0)+0.01);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(delay||0)+dur);
  o.start(ctx.currentTime+(delay||0));o.stop(ctx.currentTime+(delay||0)+dur+0.06);
}
function _noise(dur,vol,delay){
  if(!sfxOn)return;
  try{
    const ctx=_getCtx(),len=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const src=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    f.type='bandpass';f.frequency.value=220;f.Q.value=0.6;
    src.buffer=buf;src.connect(f);f.connect(g);g.connect(ctx.destination);
    g.gain.setValueAtTime(vol||0.2,ctx.currentTime+(delay||0));
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(delay||0)+dur);
    src.start(ctx.currentTime+(delay||0));src.stop(ctx.currentTime+(delay||0)+dur+0.06);
  }catch{}
}
const SFX={
  diceRattle(){
    if(!sfxOn)return;_duck(1500);
    for(let i=0;i<7;i++){_noise(0.06,0.13,i*0.08);_tone(80+Math.random()*100,'square',0.05,0.07,i*0.08);}
  },
  diceHit(){
    if(!sfxOn)return;_duck(500);
    _noise(0.1,0.28);_tone(110,'square',0.07,0.2);_tone(70,'sine',0.2,0.14,0.06);
  },
  tick(){
    if(!sfxOn)return;
    _tone(540+Math.random()*200,'sine',0.055,0.09);
  },
  whoosh(){
    if(!sfxOn)return;_duck(1200);
    const ctx=_getCtx(),o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);o.type='sawtooth';
    o.frequency.setValueAtTime(900,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(65,ctx.currentTime+0.8);
    g.gain.setValueAtTime(0.28,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.9);
    o.start(ctx.currentTime);o.stop(ctx.currentTime+1.0);
  },
  kick(){
    if(!sfxOn)return;_duck(600);
    _noise(0.12,0.22,0.01);_tone(190,'square',0.09,0.22);_tone(90,'sine',0.18,0.16,0.06);
  },
  becher(){
    if(!sfxOn)return;_duck(450);
    _noise(0.06,0.26);_tone(370,'triangle',0.09,0.17,0.04);_tone(260,'triangle',0.09,0.12,0.11);
  },
  win(){
    if(!sfxOn)return;_duck(3500);
    [[523,0],[659,.18],[784,.34],[1047,.5],[784,.68],[1047,.82],[1319,.98]].forEach(([f,d])=>{
      _tone(f,'triangle',0.22,0.3,d);_tone(f/2,'sine',0.18,0.12,d);
    });
  },
  tausch(){
    if(!sfxOn)return;_duck(500);
    const ctx=_getCtx();
    [[300,750,0],[750,300,.22]].forEach(([f1,f2,delay])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);o.type='sine';
      o.frequency.setValueAtTime(f1,ctx.currentTime+delay);
      o.frequency.exponentialRampToValueAtTime(f2,ctx.currentTime+delay+0.18);
      g.gain.setValueAtTime(0.2,ctx.currentTime+delay);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay+0.2);
      o.start(ctx.currentTime+delay);o.stop(ctx.currentTime+delay+0.25);
    });
  },
  sspTick(){if(!sfxOn)return;_tone(880,'square',0.04,0.12);},
  sspWin(){
    if(!sfxOn)return;_duck(500);
    [[660,0.12,0.22,0],[880,0.14,0.28,0.1],[1047,0.17,0.32,0.22]].forEach(([f,d,v,t2])=>_tone(f,'triangle',d,v,t2));
  },
  sspLose(){
    if(!sfxOn)return;_duck(500);
    [[440,0.14,0.18,0],[330,0.17,0.18,0.12],[220,0.22,0.18,0.25]].forEach(([f,d,v,t2])=>_tone(f,'sawtooth',d,v,t2));
  },
  click(){if(!sfxOn)return;_tone(820,'sine',0.035,0.07);}
};

// ── MUSIK ────────────────────────────────────────────────────
function startMusic(){
  if(_musStarted||!musOn)return;
  _musStarted=true;
  const gen=++_musGen,ctx=_getCtx();
  _musGain=ctx.createGain();
  _musGain.gain.setValueAtTime(0,ctx.currentTime);
  _musGain.gain.linearRampToValueAtTime(_musStyle==='chiptune'?0.2:0.13,ctx.currentTime+2);
  _musGain.connect(ctx.destination);
  if(_musStyle==='chiptune')_playChiptune(gen);else _playAmbient(gen);
}

function _playAmbient(gen){
  const ctx=_getCtx();
  // Sustained ambient pads
  [130.8,196,261.6,329.6].forEach((freq,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=freq;o.detune.value=(i%2?5:-5);
    g.gain.value=0.18-i*0.03;
    o.connect(g);g.connect(_musGain);o.start(ctx.currentTime);
    const lfo=ctx.createOscillator(),lg=ctx.createGain();
    lfo.type='sine';lfo.frequency.value=0.12+i*0.028;lg.gain.value=0.055;
    lfo.connect(lg);lg.connect(g.gain);lfo.start(ctx.currentTime);
    _musNodes.push(o,lfo);
  });
  // Chill arpeggio melody
  const scale=[261.6,293.7,329.6,392,440,523.3,587.3,659.3];
  const pat=[0,2,4,7,5,4,2,0,1,3,5,7,6,4,3,1];
  let step=0;
  (function arp(){
    if(_musGen!==gen||!_musStarted)return;
    const c=_getCtx(),freq=scale[pat[step%pat.length]];
    const o=c.createOscillator(),g=c.createGain();
    o.type='triangle';o.frequency.value=freq;
    g.gain.setValueAtTime(0,c.currentTime);
    g.gain.linearRampToValueAtTime(0.26,c.currentTime+0.06);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.44);
    o.connect(g);if(_musGain)g.connect(_musGain);
    o.start(c.currentTime);o.stop(c.currentTime+0.55);
    step++;setTimeout(arp,510);
  })();
}

function _playChiptune(gen){
  // Chiptune-Bass (square, tiefer Puls)
  const bass=[130.8,130.8,146.8,130.8,174.6,174.6,164.8,146.8];
  let bi=0;
  (function bloop(){
    if(_musGen!==gen||!_musStarted)return;
    const c=_getCtx(),f=bass[bi%bass.length];
    const o=c.createOscillator(),g=c.createGain();
    o.type='square';o.frequency.value=f;
    g.gain.setValueAtTime(0.22,c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.18);
    o.connect(g);if(_musGain)g.connect(_musGain);
    o.start(c.currentTime);o.stop(c.currentTime+0.2);
    bi++;setTimeout(bloop,250);
  })();
  // Chiptune-Melodie (square, hoch)
  const mel=[523.3,587.3,659.3,784,659.3,587.3,523.3,523.3,
             698.5,784,880,784,698.5,659.3,587.3,523.3];
  let mi=0;
  (function mloop(){
    if(_musGen!==gen||!_musStarted)return;
    const c=_getCtx(),f=mel[mi%mel.length];
    const o=c.createOscillator(),g=c.createGain();
    o.type='square';o.frequency.value=f;
    g.gain.setValueAtTime(0.15,c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.22);
    o.connect(g);if(_musGain)g.connect(_musGain);
    o.start(c.currentTime);o.stop(c.currentTime+0.25);
    mi++;setTimeout(mloop,500);
  })();
  // Chiptune-Percussion (weißes Rauschen = Hi-Hat feel)
  (function hhat(){
    if(_musGen!==gen||!_musStarted)return;
    const c=_getCtx();
    const buf=c.createBuffer(1,c.sampleRate*0.04,c.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
    const src=c.createBufferSource(),g=c.createGain();
    src.buffer=buf;
    g.gain.setValueAtTime(0.07,c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.04);
    src.connect(g);if(_musGain)g.connect(_musGain);
    src.start(c.currentTime);
    setTimeout(hhat,250);
  })();
}

function stopMusic(){
  _musStarted=false;_musGen++;
  _musNodes.forEach(n=>{try{n.stop&&n.stop();}catch{}});
  _musNodes=[];
  if(_musGain){try{_musGain.disconnect();}catch{}_musGain=null;}
}
function toggleSfx(){
  sfxOn=!sfxOn;localStorage.setItem('sg_sfx',sfxOn?'1':'0');
  updateSndBtns();if(sfxOn)SFX.click();
}
function toggleMusic(){
  musOn=!musOn;localStorage.setItem('sg_mus',musOn?'1':'0');
  updateSndBtns();
  const vol=_musStyle==='chiptune'?0.2:0.13;
  if(musOn){if(!_musStarted)startMusic();else if(_musGain)_musGain.gain.setTargetAtTime(vol,_getCtx().currentTime,0.4);}
  else{if(_musGain)_musGain.gain.setTargetAtTime(0,_getCtx().currentTime,0.4);}
  if(sfxOn)SFX.click();
}
function switchMusicStyle(){
  _musStyle=_musStyle==='ambient'?'chiptune':'ambient';
  localStorage.setItem('sg_mus_style',_musStyle);
  updateSndBtns();
  if(musOn&&_musStarted){stopMusic();startMusic();}
  if(sfxOn)SFX.click();
}
function updateSndBtns(){
  const bs=document.getElementById('btn-snd'),bm=document.getElementById('btn-mus'),bs2=document.getElementById('btn-mus-style');
  const setIc=(el,ic)=>{if(!el)return;const s=el.querySelector('.smenu-ic');if(s)s.textContent=ic;else el.textContent=ic;};
  if(bs){setIc(bs,sfxOn?'🔊':'🔇');bs.classList.toggle('off',!sfxOn);}
  if(bm){setIc(bm,musOn?'🎵':'🔇');bm.classList.toggle('off',!musOn);}
  if(bs2){setIc(bs2,_musStyle==='chiptune'?'🎮':'🎵');bs2.title=_musStyle==='chiptune'?'Stil: Chiptune':'Stil: Ambient';}
}
function toggleSettingsMenu(ev){
  if(ev){ev.stopPropagation();}
  const m=document.getElementById('settings-menu');
  if(!m)return;
  m.classList.toggle('hidden');
}
function closeSettingsMenu(){
  const m=document.getElementById('settings-menu');
  if(m)m.classList.add('hidden');
}
document.addEventListener('click',e=>{
  const m=document.getElementById('settings-menu');
  if(!m||m.classList.contains('hidden'))return;
  if(!e.target.closest('.settings-wrap'))m.classList.add('hidden');
});
let _audioInited=false;
function _initAudio(){
  if(_audioInited)return;_audioInited=true;
  if(musOn)startMusic();
  updateSndBtns();
}
document.addEventListener('click',_initAudio,{once:true});
document.addEventListener('touchstart',_initAudio,{once:true,passive:true});
