// ── BOARD MODULE ─────────────────────────────────────────────────

// ── 3D WÜRFEL ────────────────────────────────────────────────
// Ziel-Rotationen um jede Seite nach vorne zu drehen
const CUBE_ROT={1:[0,0],2:[0,-90],3:[90,0],4:[-90,0],5:[0,90],6:[0,180]};
// Dot-Positionen [left%, top%] für jede Seitenzahl
const CUBE_DOTS={
  1:[[50,50]],
  2:[[72,28],[28,72]],
  3:[[72,28],[50,50],[28,72]],
  4:[[28,28],[72,28],[28,72],[72,72]],
  5:[[28,28],[72,28],[50,50],[28,72],[72,72]],
  6:[[28,18],[72,18],[28,50],[72,50],[28,82],[72,82]]
};
const CUBE_FACES=[{cls:'df-front',v:1},{cls:'df-right',v:2},{cls:'df-top',v:3},
                  {cls:'df-bot',v:4},{cls:'df-left',v:5},{cls:'df-back',v:6}];

let _cubeRx=0,_cubeRy=0; // akkumulierte Rotation verfolgen

function initCube(){
  const dd=document.getElementById('ddisp');
  if(!dd)return null;
  dd.innerHTML='';
  const wrap=document.createElement('div');
  wrap.className='dice3d-wrap';
  const cube=document.createElement('div');
  cube.id='cube3d';cube.className='dice3d';
  CUBE_FACES.forEach(({cls,v})=>{
    const face=document.createElement('div');
    face.className=`dice3d-face ${cls}`;
    CUBE_DOTS[v].forEach(([lx,ly])=>{
      const d=document.createElement('span');
      d.className='d';d.style.left=lx+'%';d.style.top=ly+'%';
      face.appendChild(d);
    });
    cube.appendChild(face);
  });
  wrap.appendChild(cube);dd.appendChild(wrap);
  _cubeRx=0;_cubeRy=0;
  return cube;
}

function setCubeRot(cube,rx,ry,transition){
  if(!cube)return;
  cube.style.transition=transition||'none';
  cube.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg)`;
}

// ── BOARD LAYOUT ────────────────────────────────────────────
// Logical canvas 400x450, snake path, circles
const CW=400,CH=355;
const FR=18; // field radius

// Column x positions for 7 cols
function cx(i){return 30+i*50+25;}
const RY=[42,112,182,252,322]; // row y values

// All 35 field positions [x,y]
const FP=[];
for(let i=0;i<7;i++) FP.push([cx(i),RY[0]]);          // row0 L→R: 0-6
for(let i=6;i>=0;i--) FP.push([cx(i),RY[1]]);          // row1 R→L: 7-13
for(let i=0;i<7;i++) FP.push([cx(i),RY[2]]);           // row2 L→R: 14-20
for(let i=6;i>=0;i--) FP.push([cx(i),RY[3]]);          // row3 R→L: 21-27
for(let i=0;i<7;i++) FP.push([cx(i),RY[4]]);           // row4 L→R: 28-34

// Field colors
const FC2={
  normal: {bg:'#15803d',bd:'#14532d',tx:'#fff'},
  schranke:{bg:'#7c3aed',bd:'#4c1d95',tx:'#fff',gl:'#a855f7'},
  arrow:  {bg:'#0284c7',bd:'#075985',tx:'#fff'},
  heraus: {bg:'#db2777',bd:'#9d174d',tx:'#fff',gl:'#fb7185'},
  schlA:  {bg:'#1d4ed8',bd:'#1e3a8a',tx:'#fff',gl:'#60a5fa'},
  schlB:  {bg:'#b91c1c',bd:'#7f1d1d',tx:'#fff',gl:'#f87171'},
  tausch: {bg:'#db2777',bd:'#9d174d',tx:'#fff',gl:'#fb7185'},
  ziel:   {bg:'#059669',bd:'#064e3b',tx:'#fff',gl:'#34d399'},
  ssp:    {bg:'#db2777',bd:'#9d174d',tx:'#fff',gl:'#fb7185'},
  takt:   {bg:'#db2777',bd:'#9d174d',tx:'#fff',gl:'#fb7185'},
  becher: {bg:'#b45309',bd:'#92400e',tx:'#fde68a',gl:'#fbbf24'},
};

// ── CANVAS ──────────────────────────────────────────────────
const cv=document.getElementById('cv');
const ctx=cv.getContext('2d');
let SC2=1; // canvas scale
function sizeCV(){
  const w=document.getElementById('board-wrap').offsetWidth||360;
  SC2=w/CW; cv.width=w; cv.height=Math.round(CH*SC2);
}
const sx=x=>x*SC2, sy=y=>y*SC2, sr=r=>r*SC2;

function lc(hex,a){
  let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const c=v=>Math.max(0,Math.min(255,v+a)).toString(16).padStart(2,'0');
  return`#${c(r)}${c(g)}${c(b)}`;
}

function drawCircleField(x,y,r,f,lbl,hi){
  const px=sx(x),py=sy(y),pr=sr(r);
  // shadow
  ctx.fillStyle='rgba(0,0,0,.5)';
  ctx.beginPath();ctx.arc(px,py+sr(3),pr,0,Math.PI*2);ctx.fill();
  // glow
  if(hi||f.gl){ctx.shadowColor=hi?'#fff':f.gl;ctx.shadowBlur=sr(hi?16:8);}
  // gradient fill
  const g=ctx.createRadialGradient(px-pr*.3,py-pr*.35,0,px,py,pr);
  g.addColorStop(0,lc(f.bg,45));g.addColorStop(.55,f.bg);g.addColorStop(1,f.bd);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  // border
  ctx.strokeStyle=hi?'rgba(255,255,255,.9)':'rgba(255,255,255,.25)';
  ctx.lineWidth=sr(hi?2.5:1.2);
  ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.stroke();
  // shine
  ctx.fillStyle='rgba(255,255,255,.2)';
  ctx.beginPath();ctx.arc(px-pr*.22,py-pr*.3,pr*.42,0,Math.PI*2);ctx.fill();
  // label
  ctx.shadowBlur=0;
  if(lbl==='→'||lbl==='←'){
    // Draw directional arrow
    const dir=lbl==='→'?1:-1;
    const aw=sr(10),ah=sr(5);
    ctx.save();ctx.fillStyle=f.tx;ctx.strokeStyle=f.tx;ctx.lineWidth=sr(2);ctx.lineCap='round';
    // Arrow shaft
    ctx.beginPath();ctx.moveTo(px-dir*aw*.45,py);ctx.lineTo(px+dir*aw*.2,py);ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(px+dir*aw*.55,py);
    ctx.lineTo(px+dir*aw*.1,py-ah*.7);
    ctx.lineTo(px+dir*aw*.1,py+ah*.7);
    ctx.closePath();ctx.fill();
    ctx.restore();
  } else {
    const emoji=/\p{Emoji_Presentation}/u.test(lbl);
    ctx.font=`bold ${emoji?sr(12):sr(10)}px Arial`;
    ctx.fillStyle=f.tx;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(lbl,px,py);
  }
}

function drawLine(pts,col,dash,lw){
  if(pts.length<2)return;
  ctx.save();ctx.strokeStyle=col;ctx.lineWidth=sr(lw||2);
  if(dash)ctx.setLineDash([sr(7),sr(5)]);
  ctx.lineJoin='round';ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(sx(pts[0][0]),sy(pts[0][1]));
  pts.slice(1).forEach(p=>ctx.lineTo(sx(p[0]),sy(p[1])));
  ctx.stroke();ctx.setLineDash([]);ctx.restore();
}

function drawArrow(from,to,col){
  const ang=Math.atan2(to[1]-from[1],to[0]-from[0]);
  const L=sr(10);
  ctx.save();ctx.fillStyle=col;ctx.beginPath();
  ctx.moveTo(sx(to[0]),sy(to[1]));
  ctx.lineTo(sx(to[0])-L*Math.cos(ang-.45),sy(to[1])-L*Math.sin(ang-.45));
  ctx.lineTo(sx(to[0])-L*Math.cos(ang+.45),sy(to[1])-L*Math.sin(ang+.45));
  ctx.closePath();ctx.fill();ctx.restore();
}

function renderBoard(){
  ctx.clearRect(0,0,cv.width,cv.height);
  // BG
  const bg=ctx.createRadialGradient(cv.width*.4,cv.height*.35,0,cv.width*.5,cv.height*.5,cv.width*.9);
  bg.addColorStop(0,'#160830');bg.addColorStop(1,'#06010f');
  ctx.fillStyle=bg;ctx.fillRect(0,0,cv.width,cv.height);

  // Main path connectors
  for(let i=0;i<34;i++) drawLine([FP[i],FP[i+1]],'rgba(180,140,255,.32)',false,3);

  // Row turn connectors highlight
  [[6,7],[13,14],[20,21],[27,28]].forEach(([a,b])=>
    drawLine([FP[a],FP[b]],'rgba(180,140,255,.48)',false,3));

  // Field circles
  const curPos=G?G.players[G.turn]?.pos:-1;
  for(let p=0;p<35;p++){
    const[x,y]=FP[p];const ftype=ft(p);const f=FC2[ftype]||FC2.normal;
    drawCircleField(x,y,FR,f,FLBL[p],p===curPos);
  }
  // Move animation overlay – sequential pulse, 3 sec total
  if(moveAnim){
    const elapsed=performance.now()-moveAnim.startTime;
    const t=Math.min(1,elapsed/moveAnim.duration);
    const path=moveAnim.path;
    const n=path.length;
    path.forEach((fi,i)=>{
      if(fi<0||fi>=FP.length)return;
      const[fx,fy]=FP[fi];
      const slotCenter=(i+0.5)/n;
      const slotHW=0.5/n;
      const dist=Math.abs(t-slotCenter);
      let alpha=0;
      // Only light up if animation has reached this field's window (no early glow)
      if(dist<slotHW && t>=i/n) alpha=Math.pow(Math.cos(dist/slotHW*Math.PI*0.5),2);
      if(alpha>0.01){
        const px=sx(fx),py=sy(fy),pr=sr(FR);
        const pColor=(G&&G.players[moveAnim.playerIdx])?G.players[moveAnim.playerIdx].color:'#ffe066';
        ctx.save();
        // Bright outer glow ring in player color
        ctx.globalAlpha=alpha;
        ctx.shadowColor=pColor;ctx.shadowBlur=sr(36);
        ctx.strokeStyle=pColor;ctx.lineWidth=sr(5);
        ctx.beginPath();ctx.arc(px,py,pr+sr(5),0,Math.PI*2);ctx.stroke();
        ctx.shadowBlur=0;
        // Bright fill overlay over field in player color
        ctx.globalAlpha=alpha*0.55;
        ctx.fillStyle=pColor;
        ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill();
        ctx.restore();
      }
    });
  }

  // Start plates (players not yet on board)
  if(G){
    G.players.forEach((p,i)=>{
      if(p.pos>=0)return;
      const px=sx(12),py=sy(42+i*28);const pr=sr(11);
      ctx.shadowColor=p.color;ctx.shadowBlur=sr(8);
      ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=sr(1.5);
      ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.stroke();
      ctx.font=`bold ${sr(9)}px Arial`;ctx.fillStyle='#fff';
      ctx.textAlign='center';ctx.textBaseline='middle';
      if(p.figure){ctx.font=`bold ${sr(11)}px Arial`;ctx.fillText(p.figure,px,py);}else{ctx.fillText(p.name[0].toUpperCase(),px,py);}
    });
    ctx.fillStyle='rgba(255,255,255,.25)';ctx.font=`bold ${sr(7.5)}px Arial`;
    ctx.textAlign='center';ctx.fillText('START',sx(12),sy(18));

    // Player tokens on board
    // During animation: move the animated player's token along the path
    let animVisualPos = {};
    // Queued animations: show player at START position until their turn
    moveAnimQueue.forEach(qa=>{
      if(qa.path.length>0) animVisualPos[qa.playerIdx]=qa.path[0];
    });
    // Current animation: move token to currently lit field
    if(moveAnim){
      const elapsed=performance.now()-moveAnim.startTime;
      const tAnim=Math.min(1,elapsed/moveAnim.duration);
      const path=moveAnim.path;
      const n=path.length;
      let bestField=path[0], bestAlpha=0;
      path.forEach((fi,i)=>{
        const slotCenter=(i+0.5)/n;
        const slotHW=0.5/n;
        const dist=Math.abs(tAnim-slotCenter);
        if(dist<slotHW){
          const alpha=Math.pow(Math.cos(dist/slotHW*Math.PI*0.5),2);
          if(alpha>bestAlpha){bestAlpha=alpha;bestField=fi;}
        }
      });
      // Only override to currently lit field (not start) once animation is past first slot
      if(tAnim>0.001) animVisualPos[moveAnim.playerIdx]=bestField;
      else animVisualPos[moveAnim.playerIdx]=path[0];
    }

    const pm={};
    G.players.forEach((p,i)=>{
      if(p.pos<0)return;
      if(slingAnim&&slingAnim.playerIdx===i)return; // wird von renderSlingOverlay gezeichnet
      const drawPos = (animVisualPos[i]!==undefined) ? animVisualPos[i] : p.pos;
      if(drawPos<0)return;
      if(!pm[drawPos])pm[drawPos]=[];
      pm[drawPos].push(i);
    });
    Object.entries(pm).forEach(([pos,idxs])=>{
      const[x,y]=FP[+pos]||FP[0];
      idxs.forEach((pi,ii)=>{
        const p=G.players[pi];
        const off=(ii-(idxs.length-1)/2)*sr(14);
        const px=sx(x)+off,py=sy(y);const pr=sr(11);
        ctx.shadowColor=p.color;ctx.shadowBlur=sr(10);
        ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill();
        ctx.shadowBlur=0;
        ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=sr(1.8);
        ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.stroke();
        if(p.figure){ctx.font=`bold ${sr(12)}px Arial`;ctx.fillStyle='#fff';ctx.fillText(p.figure,px,py);}else{ctx.font=`bold ${sr(9)}px Arial`;ctx.fillStyle='#fff';ctx.fillText(p.name[0].toUpperCase(),px,py);}
        // Puls-Ring für aktiven Spieler
        if(G&&pi===G.turn&&!slingAnim){
          const pulse=0.28+0.28*Math.sin(performance.now()/420);
          ctx.save();ctx.globalAlpha=pulse;
          ctx.strokeStyle=p.color;ctx.lineWidth=sr(2.8);
          ctx.shadowColor=p.color;ctx.shadowBlur=sr(16);
          ctx.beginPath();ctx.arc(px,py,pr+sr(7),0,Math.PI*2);ctx.stroke();
          ctx.restore();
        }
      });
    });
    // Schleuder-Bogen-Animation über allem
    if(slingAnim)renderSlingOverlay();
  }
}
