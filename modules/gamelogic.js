// ── GAME LOGIC MODULE ────────────────────────────────────────────

// Colored player name for info banner
function pn(p){return `<b style="color:${p.color}">${p.name}</b>`;}
function arrows(pos){let p=pos;for(let i=0;i<6;i++){if(ft(p)==='arrow'&&p<34)p++;else break;}return p;}

// Push anyone on Schrankenfeld (0) to Startteller (-1)
function clearSchranke(myIdx){
  G.players.forEach((p,i)=>{
    if(i===myIdx||p.pos!==0)return;
    startMoveAnim(0,-1,i);
    p.pos=-1; p.kickedToSchranke=false;
    addLog(`${p.name} vom Schrankenfeld auf den Startteller verdrängt!`);
    notify('↩','n_displaced',{n:{name:p.name,color:p.color},n2:{name:G.players[myIdx].name,color:G.players[myIdx].color}});
  });
}

function kick(myIdx,pos){
  G.players.forEach((p,i)=>{
    if(i===myIdx||p.pos!==pos||pos<0||p.quit)return;
    SFX.kick();
    const fromPos=p.pos;
    p.pos=0;
    p.kickedToSchranke=true;
    if(G.players[myIdx]?.stats)G.players[myIdx].stats.kicked++;
    if(p.stats)p.stats.gotKicked++;
    startMoveAnim(fromPos,0,i);
    addLog(`💥 ${p.name} rausgeschmissen → Schrankenfeld!`);
    notify('💥','n_kicked',{n:{name:p.name,color:p.color},n2:{name:G.players[myIdx].name,color:G.players[myIdx].color}});
  });
}

function moveTo(idx,rawPos){
  const p=G.players[idx];
  const fromPos=p.pos;
  let np=rawPos;
  if(p.pos<29&&np>=29)np=29;
  if(np>34)np=34;
  np=arrows(np);
  p.pos=np;
  startMoveAnim(fromPos,np,idx);
  kick(idx,np);
  if(np===0)clearSchranke(idx);
  return np;
}

function afterMove(idx){
  const p=G.players[idx];const ft_=ft(p.pos);
  if(p.pos===34){addLog(`🏆 ${p.name} am Zielfeld! 1 Wurf zum Sieg!`);
    notify('🏆','n_goal_next',{n:{name:p.name,color:p.color}});
    endPhase();return;}
  // Arrow field banner
  if(ft_==='arrow'){notify('➡','n_arrow',{n:{name:p.name,color:p.color}});}
  if(ft_==='schlB'){
    SFX.whoosh();
    const fp2=p.pos;p.pos=10;startSlingAnim(fp2,10,idx);kick(idx,10);addLog(`💫 ${p.name}→F10!`);
    notify('💫','n_sling_back',{n:{name:p.name,color:p.color}});
    endPhase();return;
  }
  if(ft_==='ssp'){
    const sspOpts=G.players.filter((_,i)=>i!==idx&&!G.players[i].quit&&G.players[i].pos>=0);
    if(sspOpts.length===0){notify('✂️','n_ssp_choose_no_opp',{n:{name:p.name,color:p.color}});endPhase();return;}
    notify('✂️','n_ssp_choose',{n:{name:p.name,color:p.color}});
    G.phase='effect';G.pending={type:'ssp_choose'};return;
  }
  if(ft_==='schlA'){endPhase();return;}
  if(ft_==='tausch'){notify('🔄','n_tausch_land',{n:{name:p.name,color:p.color}});G.phase='effect';G.pending={type:'tausch'};return;}
  if(ft_==='heraus'){notify('⚔','n_heraus_land',{n:{name:p.name,color:p.color}});G.phase='effect';G.pending={type:'heraus_choose'};return;}
  endPhase();
}

function endPhase(){G.phase='done';}

function advanceTurn(){
  G.notification=null;
  let ni=(G.turn+1)%G.players.length;
  let safety=0;
  while(G.players[ni].quit&&safety<G.players.length){ni=(ni+1)%G.players.length;safety++;}
  G.turn=ni;const np=G.players[ni];
  if(np.pos<0){G.phase='start_roll';}
  else if(np.pos===0&&np.kickedToSchranke){G.phase='roll';np.kickedToSchranke=false;}
  else if(np.pos===0){G.phase='schranken';}
  else{G.phase='roll';}
  G.rollsLeft=3;G.pending=null;
  addLog(`─ ${np.name} ist dran ─`);
}
