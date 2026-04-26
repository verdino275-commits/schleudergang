// ── BOT MODULE ───────────────────────────────────────────────────

let adminAutoPlay=false;

function isBot(idx){
  if(adminAutoPlay)return true; // Im Schnelldurchlauf sind alle Spieler Bots
  if(!G||!G.players[idx])return false;
  return /^bot/i.test(G.players[idx].name.trim());
}

function assignBotFigures(){
  if(!G||!DB||!GAME_ID)return;
  const taken=G.players.filter(p=>p.figure).map(p=>p.figure);
  const avail=FIGURES.filter(f=>!taken.includes(f));
  G.players.forEach((p,i)=>{
    if(isBot(i)&&!p.figure&&avail.length>0){
      const fig=avail.splice(Math.floor(Math.random()*avail.length),1)[0];
      DB.ref('games/'+GAME_ID+'/players/'+i+'/figure').set(fig);
    }
  });
}

function isBotTurn(){
  return G&&G.winner<0&&isBot(G.turn);
}

// Erster nicht-aufgegebener Mensch übernimmt Bot-Steuerung.
// Fallback auf Spieler 0 wenn nur noch Bots übrig sind.
function isBotDriver(){
  if(adminAutoPlay)return true;
  if(!G)return MY_IDX===0;
  const firstHuman=G.players.findIndex((p,i)=>!p.quit&&!isBot(i));
  if(firstHuman===-1)return MY_IDX===0;
  return MY_IDX===firstHuman;
}

// Pick strongest opponent (highest pos), excluding self and quit players
function strongestOpponent(){
  let best=-1,bestPos=-99;
  G.players.forEach((p,i)=>{
    if(i===G.turn||p.quit)return;
    if(p.pos>bestPos){bestPos=p.pos;best=i;}
  });
  return best;
}

let botTimer=null;
let botDefTimer=null;
let botWatchdog=null;

function startBotWatchdog(){
  if(botWatchdog)return;
  botWatchdog=setInterval(()=>{
    if(!G||G.winner>=0){clearInterval(botWatchdog);botWatchdog=null;return;}
    if(isBotDriver()&&isBotTurn()&&!botTimer&&!_diceRolling&&!moveAnim&&!(moveAnimQueue&&moveAnimQueue.length)){
      console.warn('[Watchdog] Bot stuck, forcing trigger');
      runBotTurn();
    }
    if(isBotDriver()&&G.pending?.type==='ssp_pick'&&!botDefTimer){
      const defIdx=G.pending.defender;
      if(isBot(defIdx)&&G.pending.defPick==null){
        console.warn('[Watchdog] Bot defender stuck');
        const syms=['stein','schere','papier'];
        G.pending.defPick=syms[Math.floor(Math.random()*3)];
        push();
      }
    }
  },3000);
}

function scheduleBotDefenderPick(){
  if(botDefTimer)return;
  botDefTimer=setTimeout(()=>{
    botDefTimer=null;
    if(!G||!G.pending||G.pending.type!=='ssp_pick')return;
    const defIdx=G.pending.defender;
    if(!isBot(defIdx)||G.pending.defPick!=null)return;
    const syms=['stein','schere','papier'];
    const pick=syms[Math.floor(Math.random()*3)];
    G.pending.defPick=pick;
    push();
  },adminAutoPlay?10:250);
}

function scheduleBotTurn(){
  if(botTimer)return;
  // Don't schedule while a dice roll or move animation is still running —
  // the listenGame listener fires on /dice and /emotes sub-node writes and
  // would otherwise stack up new bot rolls during an in-progress animation.
  if(_diceRolling||moveAnim||(moveAnimQueue&&moveAnimQueue.length)){
    botTimer=setTimeout(()=>{botTimer=null;scheduleBotTurn();},300);
    return;
  }
  botTimer=setTimeout(()=>{botTimer=null;runBotTurn();},adminAutoPlay?10:250);
}

function runBotTurn(){
  if(!G||!isBotTurn()||!isBotDriver())return;
  const phase=G.phase;
  const pen=G.pending;

  if(phase==='done'){onNextTurn();return;}

  if(phase==='start_roll'){onStartRoll();return;}
  if(phase==='schranken'){onSchrankenRoll();return;}
  if(phase==='roll'){
    if(G.players[G.turn].pos===34){onWinRoll();}
    else{onRoll();}
    return;
  }
  if(phase==='becher'){onBecherRoll();return;}

  if(phase==='effect'&&pen){
    if(pen.type==='tausch'){
      const opp=strongestOpponent();
      if(opp>=0)onTausch(opp);
      else onSkip();
      return;
    }
    if(pen.type==='heraus_choose'){
      const opp=strongestOpponent();
      if(opp>=0)onHC(opp);
      else onSkip();
      return;
    }
    if(pen.type==='heraus_wette'&&pen.chalPick==null){
      const picks=['hoch','niedrig'];
      pen.chalPick=picks[Math.floor(Math.random()*2)];
      push();
      return;
    }
    if(pen.type==='heraus_roll'){onHD();return;}
    if(pen.type==='ssp_choose'){
      const opp=strongestOpponent();
      if(opp>=0)onSSPChoose(opp);
      else onSkip();
      return;
    }
    if(pen.type==='ssp_pick'){
      const botNeedsChalPick=isBot(G.turn)&&pen.chalPick==null;
      const botNeedsDefPick=isBot(pen.defender)&&pen.defPick==null;
      if(botNeedsChalPick||botNeedsDefPick){
        const syms=['stein','schere','papier'];
        onSSPPick(syms[Math.floor(Math.random()*3)]);
      }
      return;
    }
    if(pen.type==='ssp_reveal'){
      // Wait for setTimeout in resolveSSP - do nothing
      return;
    }
    if(pen.type==='takt_result'){
      // Driver already scheduled endPhase via setTimeout in resolveTakt - do nothing
      return;
    }
    if(pen.type==='takt_set'&&pen.challengerScore==null){
      setTimeout(()=>{
        if(!G||!G.pending||G.pending.type!=='takt_set') return;
        const score=Math.floor(30+Math.random()*55);
        submitTaktScoreAsBot(G.pending.challenger,score,'set');
      },adminAutoPlay?50:800);
      return;
    }
  }
}

function scheduleBotWettePick(defIdx){
  setTimeout(()=>{
    if(!G||!G.pending||G.pending.type!=='heraus_wette')return;
    if(!isBot(defIdx)||G.pending.defPick!=null)return;
    const picks=['hoch','niedrig'];
    G.pending.defPick=picks[Math.floor(Math.random()*2)];
    push();
  },adminAutoPlay?10:500);
}

let _botTaktTimers={};
function scheduleBotTaktResponse(botIdx){
  if(_botTaktTimers[botIdx]) return;
  _botTaktTimers[botIdx]=setTimeout(()=>{
    delete _botTaktTimers[botIdx];
    if(!G||!G.pending||G.pending.type!=='takt_challenge') return;
    if((G.pending.responses||{})[botIdx]!=null) return;
    const score=Math.floor(30+Math.random()*55);
    submitTaktScoreAsBot(botIdx,score,'challenge');
  },adminAutoPlay?50:600);
}
