// ── ANIMATION MODULE ─────────────────────────────────────────────────

// ── DICE ─────────────────────────────────────────────────────
const FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
let diceIV=null;

// ── MOVE ANIMATION ──────────────────────────────────────────
let moveAnim=null,moveAnimRAF=null;
let moveAnimQueue=[];  // Queue for pending animations

// ── SCHLEUDER-ANIMATION ──────────────────────────────────────
let slingAnim=null,slingAnimRAF=null;

function startSlingAnim(fromField,toField,playerIdx){
  if(adminAutoPlay){renderBoard();return;}
  const p=G.players[playerIdx];
  slingAnim={
    playerIdx,fromField,toField,
    color:p.color,
    figure:p.figure||p.name[0].toUpperCase(),
    startTime:performance.now(),
    duration:1300,
    trail:[],
    phase:'fly',
    impactStart:0
  };
  if(!slingAnimRAF)slingAnimLoop();
}

function slingAnimLoop(){
  renderBoard();
  if(slingAnim){slingAnimRAF=requestAnimationFrame(slingAnimLoop);}
  else{slingAnimRAF=null;}
}

function renderSlingOverlay(){
  const a=slingAnim;if(!a)return;
  const now=performance.now();
  const[x0,y0]=FP[a.fromField];
  const[x2,y2]=FP[a.toField];
  // Bezier-Kontrollpunkt: Mittelpunkt hoch angehoben
  const cpx=(x0+x2)/2,cpy=(y0+y2)/2-105;

  if(a.phase==='fly'){
    const t=Math.min(1,(now-a.startTime)/a.duration);
    // Quadratische Bezier-Position
    const bx=(1-t)*(1-t)*x0+2*(1-t)*t*cpx+t*t*x2;
    const by=(1-t)*(1-t)*y0+2*(1-t)*t*cpy+t*t*y2;
    // Trail aktualisieren
    a.trail.push({x:bx,y:by,ts:now});
    if(a.trail.length>18)a.trail.shift();
    // Trail zeichnen
    a.trail.forEach((pt,i)=>{
      const age=i/a.trail.length;
      const alpha=(0.05+age*0.5)*0.8;
      const r=sr(7)*age;
      if(r<0.5)return;
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.shadowColor=a.color;ctx.shadowBlur=sr(10)*age;
      ctx.fillStyle=a.color;
      ctx.beginPath();ctx.arc(sx(pt.x),sy(pt.y),r,0,Math.PI*2);ctx.fill();
      ctx.restore();
    });
    // Figur zeichnen (skaliert: hebt ab, fliegt groß, landet)
    const scl=t<0.15?0.7+t/0.15*0.55:t>0.82?1.25-(t-0.82)/0.18*0.4:1.25;
    const pr=sr(12)*scl;
    const px_=sx(bx),py_=sy(by);
    ctx.save();
    ctx.shadowColor=a.color;ctx.shadowBlur=sr(22);
    ctx.fillStyle=a.color;ctx.beginPath();ctx.arc(px_,py_,pr,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=sr(1.8);
    ctx.beginPath();ctx.arc(px_,py_,pr,0,Math.PI*2);ctx.stroke();
    const isEmoji=/\p{Emoji_Presentation}/u.test(String(a.figure));
    ctx.font=`bold ${sr(isEmoji?13:9)}px Arial`;
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(a.figure,px_,py_);
    ctx.restore();
    if(t>=1){a.phase='impact';a.impactStart=now;}

  }else if(a.phase==='impact'){
    const el=now-a.impactStart,dur=520;
    const ti=Math.min(1,el/dur);
    const lx=sx(x2),ly=sy(y2);
    // Bounce: leichtes Aufhüpfen dann einpendeln
    const bOff=ti<0.28?-sr(14)*Math.sin(ti/0.28*Math.PI):0;
    // Figur
    const pr=sr(12);
    ctx.save();
    ctx.shadowColor=a.color;ctx.shadowBlur=sr(14);
    ctx.fillStyle=a.color;ctx.beginPath();ctx.arc(lx,ly+bOff,pr,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=sr(1.8);
    ctx.beginPath();ctx.arc(lx,ly+bOff,pr,0,Math.PI*2);ctx.stroke();
    const isEmoji2=/\p{Emoji_Presentation}/u.test(String(a.figure));
    ctx.font=`bold ${sr(isEmoji2?13:9)}px Arial`;
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(a.figure,lx,ly+bOff);
    ctx.restore();
    // Schockwelle 1 (Spielerfarbe)
    const r1=sr(FR)+sr(38)*Math.min(1,el/380);
    ctx.save();
    ctx.globalAlpha=Math.max(0,(1-el/380)*0.85);
    ctx.strokeStyle=a.color;ctx.lineWidth=sr(2.5)*(1-Math.min(1,el/380)*0.6);
    ctx.shadowColor=a.color;ctx.shadowBlur=sr(8);
    ctx.beginPath();ctx.arc(lx,ly,r1,0,Math.PI*2);ctx.stroke();
    ctx.restore();
    // Schockwelle 2 (Cyan, versetzt)
    if(el>90){
      const r2=sr(FR)+sr(22)*Math.min(1,(el-90)/280);
      ctx.save();
      ctx.globalAlpha=Math.max(0,(1-(el-90)/280)*0.55);
      ctx.strokeStyle='#06b6d4';ctx.lineWidth=sr(1.8);
      ctx.beginPath();ctx.arc(lx,ly,r2,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    if(ti>=1)slingAnim=null;
  }
}

// ── PULS-LOOP ────────────────────────────────────────────────
let _pulseRAF=null,_pulseT=0;
function _startPulseLoop(){
  if(_pulseRAF)return;
  function loop(t){
    if(!G||G.winner>=0){_pulseRAF=null;return;}
    _pulseRAF=requestAnimationFrame(loop);
    if(t-_pulseT<34)return; // ~30fps
    _pulseT=t;
    if(!moveAnim&&!moveAnimQueue.length&&!slingAnim)renderBoard();
  }
  _pulseRAF=requestAnimationFrame(loop);
}
function _stopPulseLoop(){
  if(_pulseRAF){cancelAnimationFrame(_pulseRAF);_pulseRAF=null;}
}

// ── KONFETTI ─────────────────────────────────────────────────
function startConfetti(winnerColor){
  // Altes Canvas entfernen falls vorhanden
  const old=document.getElementById('confetti-cv');if(old)old.remove();
  const ccv=document.createElement('canvas');
  ccv.id='confetti-cv';
  ccv.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:450;pointer-events:none';
  document.body.appendChild(ccv);
  ccv.width=window.innerWidth;ccv.height=window.innerHeight;
  const cctx=ccv.getContext('2d');
  const W=ccv.width,H=ccv.height;
  const COLS=[winnerColor,'#eab308','#ffffff','#a855f7','#06b6d4','#f97316','#fde68a'];
  const TOTAL=130;
  const START=performance.now(),FALL=4200,FADE=900;

  // Partikel erstellen
  const pts=Array.from({length:TOTAL},()=>({
    x:Math.random()*W,
    y:-10-Math.random()*H*0.5,     // gestaffelt über den oberen Rand verteilt
    vx:(Math.random()-0.5)*3.5,
    vy:1.5+Math.random()*3,
    rot:Math.random()*Math.PI*2,
    rs:(Math.random()-0.5)*0.18,   // Rotationsgeschwindigkeit
    w:6+Math.random()*9,
    h:3+Math.random()*5,
    col:COLS[Math.floor(Math.random()*COLS.length)],
    circle:Math.random()<0.25       // 25% Kreise, Rest Rechtecke
  }));

  function frame(){
    const elapsed=performance.now()-START;
    if(elapsed>FALL+FADE){ccv.remove();return;}
    cctx.clearRect(0,0,W,H);
    // Globales Fade-Out am Ende
    const alpha=elapsed>FALL?1-(elapsed-FALL)/FADE:1;
    cctx.globalAlpha=alpha;
    pts.forEach(p=>{
      // Physik
      p.vy+=0.07;              // Schwerkraft
      p.vx*=0.995;             // Luftreibung
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.rs;
      // Wrap horizontal
      if(p.x<-20)p.x=W+20;
      if(p.x>W+20)p.x=-20;
      if(p.y>H+20)return;       // unterhalb Viewport: überspringen
      cctx.save();
      cctx.translate(p.x,p.y);cctx.rotate(p.rot);
      cctx.fillStyle=p.col;
      if(p.circle){
        cctx.beginPath();cctx.arc(0,0,p.w/2,0,Math.PI*2);cctx.fill();
      }else{
        // Rechteck mit leichtem 3D-Effekt (gedunkelte Seite)
        cctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        cctx.fillStyle='rgba(0,0,0,.18)';
        cctx.fillRect(-p.w/2,0,p.w,p.h/2);
      }
      cctx.restore();
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── MOVE PATH HELPER ─────────────────────────────────────────
function getMovePath(from,to){
  if(from<0&&to<0)return[];
  if(from<0)return to>=0?[to]:[];
  if(to<0)return[from];
  if(from===to)return[from];
  // A-Feld → A-Feld: normal entlang der A-Felder
  if(from>=35&&from<=39&&to>=35&&to<=39){
    const path=[];
    for(let i=from;i<=to;i++)path.push(i);
    return path;
  }
  // Normaler Pfad
  const path=[];
  if(to>from){for(let i=from;i<=to;i++)path.push(i);}
  else{for(let i=from;i>=Math.max(0,to);i--)path.push(i);}
  return path;
}

function startMoveAnim(from,to,playerIdx){
  if(adminAutoPlay){renderBoard();return;}
  const path=getMovePath(from,to);
  if(path.length===0)return;
  const dur=Math.min(4000,Math.max(800,path.length*220));
  const anim={path,from,to,playerIdx,startTime:performance.now(),duration:dur};
  if(moveAnim){
    // Animation running - queue new one instead of replacing
    moveAnimQueue.push(anim);
  } else {
    moveAnim=anim;
    if(!moveAnimRAF)moveAnimLoop();
  }
}

function moveAnimLoop(){
  if(!moveAnim){
    // Check queue for next animation
    if(moveAnimQueue.length>0){
      moveAnim=moveAnimQueue.shift();
      moveAnim.startTime=performance.now(); // reset timing
      moveAnimRAF=requestAnimationFrame(moveAnimLoop);
    } else {
      moveAnimRAF=null;
      renderBoard();
      updateUI(); // UI-Refresh wenn alle Animationen fertig sind
      return;
    }
    renderBoard();
    return;
  }
  const elapsed=performance.now()-moveAnim.startTime;
  if(elapsed>=moveAnim.duration){
    moveAnim=null;
    // Immediately start next queued animation if any
    if(moveAnimQueue.length>0){
      moveAnim=moveAnimQueue.shift();
      moveAnim.startTime=performance.now();
    }
    renderBoard();
    if(moveAnim){
      moveAnimRAF=requestAnimationFrame(moveAnimLoop);
    } else {
      moveAnimRAF=null;
      updateUI(); // UI-Refresh wenn letzte Animation abgeschlossen
    }
    return;
  }
  // Tick-Sound pro Feld nur für eigene Figur
  if(moveAnim&&moveAnim.playerIdx===MY_IDX&&moveAnim.path.length>1){
    const _el=performance.now()-moveAnim.startTime;
    const _st=Math.min(moveAnim.path.length-1,Math.floor((_el/moveAnim.duration)*moveAnim.path.length));
    if(_st!==moveAnim._lastTick){moveAnim._lastTick=_st;SFX.tick();}
  }
  renderBoard();
  moveAnimRAF=requestAnimationFrame(moveAnimLoop);
}

let _diceRolling=false;

function showDiceZone(rollerName){
  const zone=document.getElementById('ddisp-zone');
  const cap =document.getElementById('ddisp-caption');
  if(!zone)return;
  if(cap) cap.textContent = rollerName ? `${rollerName} würfelt…` : '';
  zone.classList.add('active');
}
function hideDiceZone(delay=700){
  setTimeout(()=>{
    const zone=document.getElementById('ddisp-zone');
    const cap =document.getElementById('ddisp-caption');
    if(!zone)return;
    zone.classList.remove('active');
    if(cap) cap.textContent='';
  },delay);
}

function animDice(result,ms,cb,rollerName){
  if(adminAutoPlay){cb(result);return;}
  vibe(30);SFX.diceRattle();
  _diceRolling=true;
  if(diceIV){clearInterval(diceIV);diceIV=null;}
  showDiceZone(rollerName || (typeof G!=='undefined' && G.players && G.players[G.turn] && G.players[G.turn].name));
  const cube=initCube();
  let t=0;
  diceIV=setInterval(()=>{
    t+=55;
    _cubeRx+=28+Math.random()*32;
    _cubeRy+=35+Math.random()*38;
    setCubeRot(cube,_cubeRx,_cubeRy,'transform 0.07s ease');
    if(t>=ms){
      clearInterval(diceIV);diceIV=null;
      const[tx,ty]=CUBE_ROT[result];
      const finalX=Math.round(_cubeRx/360)*360+tx;
      const finalY=Math.round(_cubeRy/360)*360+ty;
      setCubeRot(cube,finalX,finalY,'transform .52s cubic-bezier(.18,.85,.28,1.05)');
      vibe([30,30,60]);SFX.diceHit();
      setTimeout(()=>{
        cube.classList.add('glow');
        setTimeout(()=>{if(cube)cube.classList.remove('glow');},260);
        _diceRolling=false;
        hideDiceZone(650);
        cb(result);
      },540);
    }
  },55);
}
