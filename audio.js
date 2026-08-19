let _activeSfx = 0;
const MAX_SFX = 6; // max sons simultanés

function initAudio(){
  if(audioCtx) return;
  try {
    audioCtx = new AudioCtx();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.25;
    musicGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(audioCtx.destination);
  } catch(e) { audioEnabled=false; }
}

// Le téléphone met souvent l'audio en pause quand l'écran se verrouille ou
// qu'on change d'appli. Sans ça, la musique restait "endormie" au retour.
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='visible' && audioCtx && audioCtx.state==='suspended'){
    audioCtx.resume().then(()=>{
      if(audioEnabled && musicRunning===false){
        const gs=document.getElementById('gameScreen');
        playMusic(gs && gs.style.display==='block' ? 'battle' : 'menu');
      }
    }).catch(()=>{});
  }
});

// Réveille le contexte audio si le téléphone l'a mis en pause. C'était
// playMusic() qui s'en chargeait avant ; sans musique, il faut le faire ici
// sinon plus AUCUN son ne sort.
function ensureAudio(){
  if(!audioEnabled) return false;
  if(!audioCtx) initAudio();
  if(!audioCtx) return false;
  if(audioCtx.state==='suspended'){ try{ audioCtx.resume(); }catch(e){} }
  return true;
}

function playTone(freq, type, duration, gain=1, delay=0){
  if(!ensureAudio()) return;
  try {
    const osc=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    const flt=audioCtx.createBiquadFilter();
    flt.type='lowpass'; flt.frequency.value=3000;
    osc.connect(flt); flt.connect(g); g.connect(sfxGain);
    osc.type=type; osc.frequency.value=freq;
    const t=audioCtx.currentTime+delay;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(gain,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+duration);
    osc.start(t); osc.stop(t+duration+0.05);
  } catch(e){}
}

function playFreqSlide(f1,f2,type,dur,gain,delay=0){
  if(!ensureAudio()) return;
  try {
    const osc=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    osc.connect(g); g.connect(sfxGain);
    osc.type=type;
    const t=audioCtx.currentTime+delay;
    osc.frequency.setValueAtTime(f1,t);
    osc.frequency.exponentialRampToValueAtTime(f2,t+dur);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(gain,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    osc.start(t); osc.stop(t+dur+0.05);
  } catch(e){}
}

function playNoiseBurst(dur,gain,delay=0,freq=1000,q=1){
  if(!ensureAudio()) return;
  try {
    const buf=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*dur),audioCtx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const src=audioCtx.createBufferSource();
    const flt=audioCtx.createBiquadFilter();
    flt.type='bandpass'; flt.frequency.value=freq; flt.Q.value=q;
    const g=audioCtx.createGain();
    src.buffer=buf; src.connect(flt); flt.connect(g); g.connect(sfxGain);
    const t=audioCtx.currentTime+delay;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(gain,t+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.start(t); src.stop(t+dur+0.01);
  } catch(e){}
}

// === EFFETS SONORES PREMIUM ===
function sfxSpawn(type){
  if(!audioEnabled) return;
  initAudio();
  if(audioCtx.state==='suspended') audioCtx.resume();
  const s={
    knight:   ()=>{
      playFreqSlide(180,280,'sawtooth',0.12,0.45);
      playNoiseBurst(0.06,0.2,0.02,'700',2);
    },
    guardian: ()=>{
      playFreqSlide(160,240,'sawtooth',0.15,0.5);
      playFreqSlide(240,180,'sine',0.12,0.3,0.08);
      playNoiseBurst(0.1,0.25,0.05,'500',1.5);
    },
    cavalier: ()=>{
      // Galop de cheval
      for(let i=0;i<4;i++) playNoiseBurst(0.04,0.3,i*0.06,'400',1.5);
      playFreqSlide(300,500,'sawtooth',0.1,0.4,0.1);
    },
    archer:   ()=>{
      // Corde d'arc
      playFreqSlide(1200,300,'sine',0.18,0.35);
      playNoiseBurst(0.03,0.15,0,'4000',4);
    },
    mage:     ()=>{
      // Montée magique
      for(let i=0;i<6;i++) playFreqSlide(300+i*80,600+i*120,'sine',0.2,0.18,i*0.04);
      playNoiseBurst(0.15,0.12,0.2,'2000',2);
    },
    giant:    ()=>{
      // Tremblement de terre
      playFreqSlide(200,40,'sawtooth',0.35,0.7);
      playNoiseBurst(0.25,0.5,0.05,'150',0.6);
      playFreqSlide(100,30,'sine',0.3,0.5,0.1);
    },
    dragon:   ()=>{
      // Rugissement profond
      playFreqSlide(400,60,'sawtooth',0.4,0.8);
      playFreqSlide(200,40,'sawtooth',0.45,0.6,0.05);
      playNoiseBurst(0.3,0.4,0.1,'200',0.7);
      playFreqSlide(600,80,'square',0.2,0.3,0.15);
    },
    healer:   ()=>{
      // Clochettes magiques
      for(let i=0;i<5;i++) playFreqSlide(800+i*150,1200+i*100,'sine',0.25,0.2,i*0.05);
    },
    ninja:    ()=>{
      // Whoosh rapide
      playFreqSlide(2000,400,'sine',0.07,0.4);
      playNoiseBurst(0.04,0.2,0,'5000',5);
    },
    mole:     ()=>{
      // Creusement
      playFreqSlide(200,80,'sawtooth',0.25,0.6);
      playNoiseBurst(0.2,0.5,0.05,'300',1);
      playFreqSlide(150,60,'sine',0.3,0.4,0.1);
    },
    pyromancer:()=>{
      // Flamme qui s'allume
      playFreqSlide(150,600,'sawtooth',0.15,0.5);
      playFreqSlide(200,800,'sawtooth',0.12,0.4,0.05);
      playNoiseBurst(0.15,0.35,0.1,'600',1.5);
    },
    kamikaze: ()=>{
      // Cri de guerre
      playFreqSlide(300,900,'square',0.12,0.6);
      playFreqSlide(500,1100,'square',0.1,0.5,0.04);
      playNoiseBurst(0.06,0.3,0.08,'800',2);
    },
    sniper:   ()=>{
      // Rechargement
      playFreqSlide(2500,1000,'sine',0.06,0.35);
      playNoiseBurst(0.03,0.2,0.05,'6000',6);
      playFreqSlide(800,1200,'sine',0.08,0.2,0.08);
    },
    cryomancer:()=>{
      // Cristal de glace
      for(let i=0;i<6;i++) playFreqSlide(1200-i*50,900-i*80,'sine',0.22,0.18,i*0.04);
      playNoiseBurst(0.12,0.15,0.22,'3000',3);
    },
    electromancer:()=>{
      // Décharge électrique
      for(let i=0;i<8;i++) playTone(300+Math.random()*1200,'square',0.06,0.2,i*0.015);
      playNoiseBurst(0.12,0.4,0,'3000',2);
    },
  };
  if(s[type]) s[type]();
}

function sfxAttack(type){
  if(!audioEnabled||!audioCtx) return;
  const a={
    knight:   ()=>{
      playNoiseBurst(0.07,0.55,0,'900',2.5);
      playFreqSlide(350,180,'sawtooth',0.1,0.45);
    },
    guardian: ()=>{
      playNoiseBurst(0.09,0.65,0,'700',2);
      playFreqSlide(280,120,'sawtooth',0.12,0.5);
    },
    cavalier: ()=>{
      // Choc de lance
      playNoiseBurst(0.06,0.75,0,'700',2.5);
      playFreqSlide(500,150,'sawtooth',0.12,0.6);
      playNoiseBurst(0.08,0.3,0.03,'300',1);
    },
    archer:   ()=>{
      // Flèche qui vole
      playFreqSlide(1500,200,'sine',0.15,0.35);
      playNoiseBurst(0.05,0.25,0,'3000',4);
    },
    mage:     ()=>{
      // Explosion magique
      playFreqSlide(200,800,'sine',0.25,0.45);
      for(let i=0;i<4;i++) playTone(400+i*250,'sine',0.15,0.2,i*0.03);
      playNoiseBurst(0.12,0.2,0.1,'1500',2);
    },
    giant:    ()=>{
      // Écrasement
      playFreqSlide(300,40,'sawtooth',0.25,0.9);
      playNoiseBurst(0.18,0.8,0,'250',0.7);
      playFreqSlide(150,30,'sine',0.3,0.6,0.05);
    },
    dragon:   ()=>{
      // BOULE DE FEU ! Bruit de flammes + explosion
      playFreqSlide(600,80,'sawtooth',0.35,0.85);
      playNoiseBurst(0.3,0.7,0,'350',1);
      playFreqSlide(400,60,'sawtooth',0.4,0.6,0.06);
      playNoiseBurst(0.2,0.5,0.1,'600',1.5);
      // Crépitement final
      for(let i=0;i<5;i++) playNoiseBurst(0.04,0.25,0.15+i*0.04,'800',2);
    },
    healer:   ()=>{
      // Soin lumineux
      for(let i=0;i<5;i++) playFreqSlide(400+i*200,700+i*150,'sine',0.3,0.2,i*0.05);
    },
    ninja:    ()=>{
      // Kunai
      playFreqSlide(1800,300,'sawtooth',0.06,0.5);
      playNoiseBurst(0.04,0.45,0,'4000',5);
    },
    mole:     ()=>{
      // Morsure
      playFreqSlide(300,80,'sawtooth',0.18,0.7);
      playNoiseBurst(0.12,0.55,0,'400',1.5);
    },
    pyromancer:()=>{
      // Boule de feu (plus petit que dragon)
      playFreqSlide(500,100,'sawtooth',0.18,0.65);
      playNoiseBurst(0.18,0.5,0,'450',1.3);
      for(let i=0;i<3;i++) playNoiseBurst(0.05,0.2,0.1+i*0.04,'600',1.5);
    },
    kamikaze: ()=>{
      // EXPLOSION
      playFreqSlide(800,30,'sawtooth',0.3,1.0);
      playNoiseBurst(0.4,1.0,0,'300',0.8);
      playNoiseBurst(0.3,0.7,0.05,'600',1);
      playTone(40,'sine',0.5,0.8,0.02);
    },
    sniper:   ()=>{
      // BANG ! Son de fusil
      playNoiseBurst(0.025,0.9,0,'6000',6);
      playFreqSlide(4000,200,'sine',0.1,0.4);
      playNoiseBurst(0.1,0.3,0.02,'400',0.8);
    },
    cryomancer:()=>{
      // Blast de glace
      playNoiseBurst(0.2,0.6,0,'2000',2.5);
      for(let i=0;i<5;i++) playFreqSlide(1500-i*100,800-i*60,'sine',0.18,0.2,i*0.03);
    },
    electromancer:()=>{
      // Éclair
      for(let i=0;i<6;i++) playNoiseBurst(0.03,0.55,i*0.02,'4000',3);
      playFreqSlide(3000,200,'square',0.08,0.45);
    },
  };
  if(a[type]) a[type]();
}

function sfxHit(){
  if(!audioEnabled||!audioCtx) return;
  playNoiseBurst(0.06,0.4,0,'800',2);
  playFreqSlide(300,150,'sawtooth',0.08,0.35);
}

function sfxDeath(){
  if(!audioEnabled||!audioCtx) return;
  playFreqSlide(300,80,'sawtooth',0.2,0.5);
  playNoiseBurst(0.15,0.4,0,'400',1);
  playTone(60,'sine',0.3,0.3,0.1);
}

function sfxCastleHit(){
  if(!audioEnabled||!audioCtx) return;
  playFreqSlide(200,50,'sawtooth',0.3,0.8);
  playNoiseBurst(0.2,0.7,0,'150',0.5);
  playTone(40,'sine',0.4,0.6,0.05);
}

function sfxVictory(){
  if(!audioEnabled||!audioCtx) return;
  const mel=[523,659,784,880,1047,880,784,1047];
  mel.forEach((f,i)=>{ playTone(f,'triangle',0.4,0.5,i*0.12); playTone(f/2,'sine',0.5,0.2,i*0.12); });
  setTimeout(()=>{ playNoiseBurst(0.3,0.3,0,'2000',1); },900);
}

function sfxDefeat(){
  if(!audioEnabled||!audioCtx) return;
  const mel=[392,349,311,261];
  mel.forEach((f,i)=>{ playTone(f,'sine',0.6,0.5,i*0.25); playTone(f/2,'triangle',0.7,0.2,i*0.25); });
}

function sfxGold(){
  if(!audioEnabled||!audioCtx) return;
  playFreqSlide(800,1200,'sine',0.1,0.2);
  playTone(1600,'sine',0.08,0.15,0.08);
}

function sfxButton(){
  if(!audioEnabled||!audioCtx) return;
  playFreqSlide(400,600,'sine',0.08,0.15);
}

// === MUSIQUE ÉPIQUE PROCÉDURALE (sons propres, sans grésillements) ===
let musicNodes=[];
let musicRunning=false;
let _reverb=null;

function stopMusic(){
  musicRunning=false;
  musicNodes.forEach(n=>{ try{n.stop();}catch(e){} });
  musicNodes=[];
}

function playMusic(type='battle'){
  // Musique de fond désactivée (grésillements sur téléphone) — seuls les
  // effets sonores (sfxSpawn, sfxVictory, etc.) restent actifs.
  stopMusic();
  return;
}

function mf(midi){ return 440*Math.pow(2,(midi-69)/12); }

// Son de corde synthétique (additive synthesis) - AUCUN grésilllement
function str(freq, start, dur, vol){
  if(!audioCtx||!musicRunning) return;
  try{
    const harmonics=[[1,1],[2,0.45],[3,0.22]];
    harmonics.forEach(([h,hv])=>{
      const osc=audioCtx.createOscillator();
      const g=audioCtx.createGain();
      const flt=audioCtx.createBiquadFilter();
      flt.type='lowpass'; flt.frequency.value=Math.min(freq*h*2,3000); flt.Q.value=0.3;
      osc.connect(flt); flt.connect(g); g.connect(musicGain);
      if(_reverb) flt.connect(_reverb);
      osc.type='sine'; osc.frequency.value=freq*h;
      const t=audioCtx.currentTime+start;
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(vol*hv,t+0.01);
      g.gain.setValueAtTime(vol*hv,t+dur*0.6);
      g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      osc.start(t); osc.stop(t+dur+0.05);
      musicNodes.push(osc);
    });
  }catch(e){}
}

// Pad doux (sine pur, attaque lente)
function pad(freq, start, dur, vol){
  if(!audioCtx||!musicRunning) return;
  try{
    [1,2].forEach((h,i)=>{
      const osc=audioCtx.createOscillator();
      const g=audioCtx.createGain();
      const flt=audioCtx.createBiquadFilter();
      flt.type='lowpass'; flt.frequency.value=500/h; flt.Q.value=0.2;
      osc.connect(flt); flt.connect(g); g.connect(musicGain);
      if(_reverb) flt.connect(_reverb);
      osc.type='sine'; osc.frequency.value=freq*h;
      const t=audioCtx.currentTime+start;
      const v=vol/Math.pow(h,1.8);
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(v,t+0.35);
      g.gain.setValueAtTime(v,t+dur-0.35);
      g.gain.linearRampToValueAtTime(0,t+dur);
      osc.start(t); osc.stop(t+dur+0.05);
      musicNodes.push(osc);
    });
  }catch(e){}
}

// Kick propre
function kick(start,vol=0.7){
  if(!audioCtx||!musicRunning) return;
  try{
    const osc=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    osc.connect(g); g.connect(musicGain);
    osc.type='sine';
    const t=audioCtx.currentTime+start;
    osc.frequency.setValueAtTime(120,t);
    osc.frequency.exponentialRampToValueAtTime(35,t+0.1);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+0.003);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    osc.start(t); osc.stop(t+0.25);
    musicNodes.push(osc);
  }catch(e){}
}

// Snare propre
function snare(start,vol=0.22){
  if(!audioCtx||!musicRunning) return;
  try{
    const len=Math.floor(audioCtx.sampleRate*0.1);
    const buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    const src=audioCtx.createBufferSource();
    const flt=audioCtx.createBiquadFilter();
    flt.type='bandpass'; flt.frequency.value=2800; flt.Q.value=0.7;
    const g=audioCtx.createGain();
    src.buffer=buf; src.connect(flt); flt.connect(g); g.connect(musicGain);
    const t=audioCtx.currentTime+start;
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.1);
    src.start(t); src.stop(t+0.11);
    musicNodes.push(src);
    // ton corps
    const osc=audioCtx.createOscillator();
    const g2=audioCtx.createGain();
    osc.connect(g2); g2.connect(musicGain);
    osc.type='triangle'; osc.frequency.value=200;
    g2.gain.setValueAtTime(vol*0.35,t);
    g2.gain.exponentialRampToValueAtTime(0.001,t+0.05);
    osc.start(t); osc.stop(t+0.06);
    musicNodes.push(osc);
  }catch(e){}
}

// Hi-hat propre
function hat(start,vol=0.05,open=false){
  if(!audioCtx||!musicRunning) return;
  try{
    const dur=open?0.14:0.035;
    const len=Math.floor(audioCtx.sampleRate*dur);
    const buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    const src=audioCtx.createBufferSource();
    const flt=audioCtx.createBiquadFilter();
    flt.type='highpass'; flt.frequency.value=9000;
    const g=audioCtx.createGain();
    src.buffer=buf; src.connect(flt); flt.connect(g); g.connect(musicGain);
    const t=audioCtx.currentTime+start;
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.start(t); src.stop(t+dur+0.01);
    musicNodes.push(src);
  }catch(e){}
}

// ====== MUSIQUE DE MENU DOUCE ET MYSTÉRIEUSE ======
function scheduleMenuMusic(){
  if(!musicRunning) return;
  const B=60/85; // 85 BPM - calme

  // Mélodie douce en cordes
  const mel=[
    [mf(64),0],[mf(67),B],[mf(69),B*2],[mf(71),B*3],
    [mf(72),B*4],[mf(71),B*5],[mf(69),B*6],[mf(67),B*7],
    [mf(64),B*8],[mf(62),B*9],[mf(64),B*10],[mf(67),B*11],
    [mf(69),B*12],[mf(71),B*13],[mf(72),B*15],
  ];
  mel.forEach(([f,t])=>str(f,t,B*1.3,0.18));

  // Arpèges doux (2ème moitié)
  [mf(52),mf(55),mf(59),mf(64),mf(67),mf(64),mf(59),mf(55),
   mf(50),mf(53),mf(57),mf(62),mf(65),mf(62),mf(57),mf(53)
  ].forEach((f,i)=>str(f,B*8+i*B*0.5,B*0.55,0.1));

  // Pad de fond
  [[mf(40),mf(47),mf(52)],[mf(38),mf(45),mf(50)],
   [mf(36),mf(43),mf(48)],[mf(38),mf(45),mf(52)]
  ].forEach((c,ci)=>c.forEach(f=>pad(f,ci*B*4,B*4.3,0.07)));

  // Basse douce
  [mf(28),mf(26),mf(24),mf(26)].forEach((f,i)=>str(f,i*B*4,B*3.5,0.14));

  const timer=setTimeout(()=>{ if(musicRunning) scheduleMenuMusic(); },(B*16+0.5)*1000);
  musicNodes.push({stop:()=>clearTimeout(timer)});
}

// ====== MUSIQUE DE BATAILLE ÉPIQUE (132 BPM, propre et entraînante) ======
function scheduleBattleMusic(){
  if(!musicRunning) return;
  const B=60/132;
  const BARS=8;

  // Batterie
  for(let bar=0;bar<BARS;bar++){
    const o=bar*B*4;
    kick(o,0.72); kick(o+B*2,0.65);
    if(bar%2===1) kick(o+B*3.5,0.42);
    snare(o+B,0.25); snare(o+B*3,0.25);
    for(let h=0;h<8;h++) hat(o+h*B*0.5,0.052+(h%2===0?0.012:0));
    if(bar%2===1) hat(o+B*3.75,0.065,true);
    if(bar===3||bar===7){
      for(let f=0;f<4;f++) snare(o+B*4-B*0.5+f*B*0.125,0.14+f*0.035);
    }
  }

  // Basse mélodique (cordes, très propre)
  [
    [mf(33),0,B*1.8],[mf(36),B*2,B*1.8],
    [mf(31),B*4,B*1.8],[mf(33),B*6,B*1.8],
    [mf(33),B*8,B*0.9],[mf(35),B*9,B*0.9],
    [mf(36),B*10,B*1.8],[mf(38),B*12,B*1.8],
    [mf(36),B*14,B*0.9],[mf(33),B*15,B*0.9],
  ].forEach(([f,t,d])=>{ str(f,t,d,0.2); str(f/2,t,d,0.1); });

  // Mélodie principale épique (cordes synthétiques pures)
  [
    [mf(64),0,B*0.45],[mf(67),B*0.5,B*0.45],[mf(69),B,B*0.45],
    [mf(71),B*1.5,B*0.45],[mf(72),B*2,B*1.8],
    [mf(74),B*4,B*0.45],[mf(72),B*4.5,B*0.45],[mf(71),B*5,B*0.45],
    [mf(69),B*5.5,B*0.45],[mf(67),B*6,B*1.8],
    [mf(72),B*8,B*0.45],[mf(74),B*8.5,B*0.45],[mf(76),B*9,B*1.8],
    [mf(74),B*11,B*0.45],[mf(72),B*11.5,B*0.45],
    [mf(71),B*12,B*0.45],[mf(69),B*12.5,B*0.45],[mf(67),B*13,B*2.8],
  ].forEach(([f,t,d])=>str(f,t,d,0.15));

  // Cuivres (triangle très filtré = son de cor doux)
  [
    [mf(52),B*2,B*1.6,0.07],[mf(55),B*4,B*1.6,0.07],
    [mf(57),B*6,B*1.6,0.07],[mf(52),B*8,B*3.5,0.09],
    [mf(60),B*12,B*1.6,0.08],[mf(57),B*14,B*1.6,0.08],
  ].forEach(([f,t,d,v])=>{
    str(f*1.5,t,d,v*0.6);
    pad(f,t,d,v*0.5);
  });

  // Accords pad épiques
  [[mf(40),mf(47),mf(52),mf(55)],[mf(38),mf(45),mf(50),mf(53)],
   [mf(36),mf(43),mf(48),mf(52)],[mf(38),mf(45),mf(52),mf(57)]
  ].forEach((chord,ci)=>chord.forEach(f=>pad(f,ci*B*8,B*8+0.1,0.065)));

  // Contre-mélodie (mesures 5-8)
  [
    [mf(60),B*8,B*0.9],[mf(59),B*9,B*0.9],[mf(57),B*10,B*0.9],
    [mf(55),B*11,B*0.9],[mf(57),B*12,B*0.9],[mf(59),B*13,B*0.9],
    [mf(60),B*14,B*1.8],
  ].forEach(([f,t,d])=>str(f,t,d,0.09));

  const timer=setTimeout(()=>{ if(musicRunning) scheduleBattleMusic(); },(B*4*BARS+0.3)*1000);
  musicNodes.push({stop:()=>clearTimeout(timer)});
}

// === EFFETS SONORES PREMIUM ===
function sfxSpawn(type){
  if(!audioEnabled) return;
  initAudio();
  if(audioCtx.state==='suspended') audioCtx.resume();
  const s={
    knight:   ()=>{
      playFreqSlide(180,280,'sawtooth',0.12,0.45);
      playNoiseBurst(0.06,0.2,0.02,'700',2);
    },
    guardian: ()=>{
      playFreqSlide(160,240,'sawtooth',0.15,0.5);
      playFreqSlide(240,180,'sine',0.12,0.3,0.08);
      playNoiseBurst(0.1,0.25,0.05,'500',1.5);
    },
    cavalier: ()=>{
      // Galop de cheval
      for(let i=0;i<4;i++) playNoiseBurst(0.04,0.3,i*0.06,'400',1.5);
      playFreqSlide(300,500,'sawtooth',0.1,0.4,0.1);
    },
    archer:   ()=>{
      // Corde d'arc
      playFreqSlide(1200,300,'sine',0.18,0.35);
      playNoiseBurst(0.03,0.15,0,'4000',4);
    },
    mage:     ()=>{
      // Montée magique
      for(let i=0;i<6;i++) playFreqSlide(300+i*80,600+i*120,'sine',0.2,0.18,i*0.04);
      playNoiseBurst(0.15,0.12,0.2,'2000',2);
    },
    giant:    ()=>{
      // Tremblement de terre
      playFreqSlide(200,40,'sawtooth',0.35,0.7);
      playNoiseBurst(0.25,0.5,0.05,'150',0.6);
      playFreqSlide(100,30,'sine',0.3,0.5,0.1);
    },
    dragon:   ()=>{
      // Rugissement profond
      playFreqSlide(400,60,'sawtooth',0.4,0.8);
      playFreqSlide(200,40,'sawtooth',0.45,0.6,0.05);
      playNoiseBurst(0.3,0.4,0.1,'200',0.7);
      playFreqSlide(600,80,'square',0.2,0.3,0.15);
    },
    healer:   ()=>{
      // Clochettes magiques
      for(let i=0;i<5;i++) playFreqSlide(800+i*150,1200+i*100,'sine',0.25,0.2,i*0.05);
    },
    ninja:    ()=>{
      // Whoosh rapide
      playFreqSlide(2000,400,'sine',0.07,0.4);
      playNoiseBurst(0.04,0.2,0,'5000',5);
    },
    mole:     ()=>{
      // Creusement
      playFreqSlide(200,80,'sawtooth',0.25,0.6);
      playNoiseBurst(0.2,0.5,0.05,'300',1);
      playFreqSlide(150,60,'sine',0.3,0.4,0.1);
    },
    pyromancer:()=>{
      // Flamme qui s'allume
      playFreqSlide(150,600,'sawtooth',0.15,0.5);
      playFreqSlide(200,800,'sawtooth',0.12,0.4,0.05);
      playNoiseBurst(0.15,0.35,0.1,'600',1.5);
    },
    kamikaze: ()=>{
      // Cri de guerre
      playFreqSlide(300,900,'square',0.12,0.6);
      playFreqSlide(500,1100,'square',0.1,0.5,0.04);
      playNoiseBurst(0.06,0.3,0.08,'800',2);
    },
    sniper:   ()=>{
      // Rechargement
      playFreqSlide(2500,1000,'sine',0.06,0.35);
      playNoiseBurst(0.03,0.2,0.05,'6000',6);
      playFreqSlide(800,1200,'sine',0.08,0.2,0.08);
    },
    cryomancer:()=>{
      // Cristal de glace
      for(let i=0;i<6;i++) playFreqSlide(1200-i*50,900-i*80,'sine',0.22,0.18,i*0.04);
      playNoiseBurst(0.12,0.15,0.22,'3000',3);
    },
    electromancer:()=>{
      // Décharge électrique
      for(let i=0;i<8;i++) playTone(300+Math.random()*1200,'square',0.06,0.2,i*0.015);
      playNoiseBurst(0.12,0.4,0,'3000',2);
    },
  };
  if(s[type]) s[type]();
}

function sfxAttack(type){
  if(!audioEnabled||!audioCtx) return;
  const a={
    knight:   ()=>{
      playNoiseBurst(0.07,0.55,0,'900',2.5);
      playFreqSlide(350,180,'sawtooth',0.1,0.45);
    },
    guardian: ()=>{
      playNoiseBurst(0.09,0.65,0,'700',2);
      playFreqSlide(280,120,'sawtooth',0.12,0.5);
    },
    cavalier: ()=>{
      // Choc de lance
      playNoiseBurst(0.06,0.75,0,'700',2.5);
      playFreqSlide(500,150,'sawtooth',0.12,0.6);
      playNoiseBurst(0.08,0.3,0.03,'300',1);
    },
    archer:   ()=>{
      // Flèche qui vole
      playFreqSlide(1500,200,'sine',0.15,0.35);
      playNoiseBurst(0.05,0.25,0,'3000',4);
    },
    mage:     ()=>{
      // Explosion magique
      playFreqSlide(200,800,'sine',0.25,0.45);
      for(let i=0;i<4;i++) playTone(400+i*250,'sine',0.15,0.2,i*0.03);
      playNoiseBurst(0.12,0.2,0.1,'1500',2);
    },
    giant:    ()=>{
      // Écrasement
      playFreqSlide(300,40,'sawtooth',0.25,0.9);
      playNoiseBurst(0.18,0.8,0,'250',0.7);
      playFreqSlide(150,30,'sine',0.3,0.6,0.05);
    },
    dragon:   ()=>{
      // BOULE DE FEU ! Bruit de flammes + explosion
      playFreqSlide(600,80,'sawtooth',0.35,0.85);
      playNoiseBurst(0.3,0.7,0,'350',1);
      playFreqSlide(400,60,'sawtooth',0.4,0.6,0.06);
      playNoiseBurst(0.2,0.5,0.1,'600',1.5);
      // Crépitement final
      for(let i=0;i<5;i++) playNoiseBurst(0.04,0.25,0.15+i*0.04,'800',2);
    },
    healer:   ()=>{
      // Soin lumineux
      for(let i=0;i<5;i++) playFreqSlide(400+i*200,700+i*150,'sine',0.3,0.2,i*0.05);
    },
    ninja:    ()=>{
      // Kunai
      playFreqSlide(1800,300,'sawtooth',0.06,0.5);
      playNoiseBurst(0.04,0.45,0,'4000',5);
    },
    mole:     ()=>{
      // Morsure
      playFreqSlide(300,80,'sawtooth',0.18,0.7);
      playNoiseBurst(0.12,0.55,0,'400',1.5);
    },
    pyromancer:()=>{
      // Boule de feu (plus petit que dragon)
      playFreqSlide(500,100,'sawtooth',0.18,0.65);
      playNoiseBurst(0.18,0.5,0,'450',1.3);
      for(let i=0;i<3;i++) playNoiseBurst(0.05,0.2,0.1+i*0.04,'600',1.5);
    },
    kamikaze: ()=>{
      // EXPLOSION
      playFreqSlide(800,30,'sawtooth',0.3,1.0);
      playNoiseBurst(0.4,1.0,0,'300',0.8);
      playNoiseBurst(0.3,0.7,0.05,'600',1);
      playTone(40,'sine',0.5,0.8,0.02);
    },
    sniper:   ()=>{
      // BANG ! Son de fusil
      playNoiseBurst(0.025,0.9,0,'6000',6);
      playFreqSlide(4000,200,'sine',0.1,0.4);
      playNoiseBurst(0.1,0.3,0.02,'400',0.8);
    },
    cryomancer:()=>{
      // Blast de glace
      playNoiseBurst(0.2,0.6,0,'2000',2.5);
      for(let i=0;i<5;i++) playFreqSlide(1500-i*100,800-i*60,'sine',0.18,0.2,i*0.03);
    },
    electromancer:()=>{
      // Éclair
      for(let i=0;i<6;i++) playNoiseBurst(0.03,0.55,i*0.02,'4000',3);
      playFreqSlide(3000,200,'square',0.08,0.45);
    },
  };
  if(a[type]) a[type]();
}

function sfxHit(){
  if(!audioEnabled||!audioCtx) return;
  playNoiseBurst(0.06,0.4,0,'800',2);
  playFreqSlide(300,150,'sawtooth',0.08,0.35);
}

function sfxDeath(){
  if(!audioEnabled||!audioCtx) return;
  playFreqSlide(300,80,'sawtooth',0.2,0.5);
  playNoiseBurst(0.15,0.4,0,'400',1);
  playTone(60,'sine',0.3,0.3,0.1);
}

function sfxCastleHit(){
  if(!audioEnabled||!audioCtx) return;
  playFreqSlide(200,50,'sawtooth',0.3,0.8);
  playNoiseBurst(0.2,0.7,0,'150',0.5);
  playTone(40,'sine',0.4,0.6,0.05);
}

function sfxVictory(){
  if(!audioEnabled||!audioCtx) return;
  const mel=[523,659,784,880,1047,880,784,1047];
  mel.forEach((f,i)=>{ playTone(f,'triangle',0.4,0.5,i*0.12); playTone(f/2,'sine',0.5,0.2,i*0.12); });
  setTimeout(()=>{ playNoiseBurst(0.3,0.3,0,'2000',1); },900);
}

function sfxDefeat(){
  if(!audioEnabled||!audioCtx) return;
  const mel=[392,349,311,261];
  mel.forEach((f,i)=>{ playTone(f,'sine',0.6,0.5,i*0.25); playTone(f/2,'triangle',0.7,0.2,i*0.25); });
}

function sfxGold(){
  if(!audioEnabled||!audioCtx) return;
  playFreqSlide(800,1200,'sine',0.1,0.2);
  playTone(1600,'sine',0.08,0.15,0.08);
}

function sfxButton(){
  if(!audioEnabled||!audioCtx) return;
  playFreqSlide(400,600,'sine',0.08,0.15);
}

// Bouton mute
function toggleAudio(){
  audioEnabled=!audioEnabled;
  if(audioEnabled){ 
    if(document.getElementById('gameScreen')?.style.display==='block') playMusic('battle');
    else playMusic('menu');
  } else { stopMusic(); }
  const btn=document.getElementById('muteBtn');
  if(btn) btn.textContent=audioEnabled?'🔊':'🔇';
}
