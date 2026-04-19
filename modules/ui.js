// ── UI MODULE ────────────────────────────────────────────────────

// ── INFO BANNER ─────────────────────────────────────────────
let bannerTimer=null;
let lastNotifTs=0;

// Show banner locally
function showInfoBanner(icon, text, duration=5000){
  const banner=document.getElementById('info-banner');
  const ibIcon=document.getElementById('ib-icon');
  const ibText=document.getElementById('ib-text');
  const ibBar=document.getElementById('ib-bar');
  if(!banner)return;
  ibIcon.textContent=icon;
  ibText.innerHTML=text;
  // Reset bar animation
  ibBar.style.animation='none';
  ibBar.offsetHeight; // reflow
  ibBar.style.animation=`bar-shrink ${duration/1000}s linear forwards`;
  banner.classList.add('show');
  if(bannerTimer)clearTimeout(bannerTimer);
  bannerTimer=setTimeout(()=>hideInfoBanner(),duration);
}

function hideInfoBanner(){
  const banner=document.getElementById('info-banner');
  if(banner)banner.classList.remove('show');
  if(bannerTimer){clearTimeout(bannerTimer);bannerTimer=null;}
}

// Build notification text locally in current player's language
function buildNotif(key,params){
  params=params||{};
  const n=params.n,n2=params.n2;
  const ph=n?`<b style="color:${n.color}">${n.name}</b>`:'';
  const p2h=n2?`<b style="color:${n2.color}">${n2.name}</b>`:'';
  const r1=params.r1||'',r2=params.r2||'';
  const s1=params.s1||'',s2=params.s2||'';
  switch(key){
    case 'n_displaced':       return n2?`${p2h} → ${ph} ${t('n_displaced')}`:`${ph} ${t('n_displaced')}`;
    case 'n_kicked':          return n2?`${p2h} 💥 ${ph} ${t('n_kicked')}`:`${ph} ${t('n_kicked')}`;
    case 'n_goal_next':       return `${ph} ${t('n_goal_next')}`;
    case 'n_arrow':           return `${t('n_arrow')} ${ph} ${t('n_arrow_forward')}`;
    case 'n_sling_back':      return `${ph} ${t('n_sling_back')}`;
    case 'n_ssp_choose':      return `${ph} ${t('n_ssp_choose')}`;
    case 'n_ssp_choose_no_opp': return `${ph} ${t('n_ssp_choose')} ${t('no_opponent')}`;
    case 'n_six_schranke':    return `${ph} ${t('n_six_schranke')}`;
    case 'n_back_start':      return `${ph} ${t('n_back_start')}`;
    case 'n_becher2goal':     return `${ph} ${t('n_becher2goal')}`;
    case 'n_becher1back':     return `${ph} ${t('n_becher1back')}`;
    case 'n_becher_wait':     return `${ph} ${t('n_becher_wait')}`;
    case 'win_msg':           return `🎉 ${ph} ${t('win_msg')}`;
    case 'n_tausch_done':     return `${ph} ↔ ${p2h} ${t('n_tausch_done')}`;
    case 'n_tausch_land':     return `${ph} ${t('n_tausch_land')}`;
    case 'n_heraus_land':     return `${ph} ${t('n_heraus_land')}`;
    case 'n_duel_challenge':  return `${ph} ${t('n_duel_challenge')}`;
    case 'n_duel_running':    return `${ph} ⚔ ${p2h} ${t('n_duel_running')}`;
    case 'n_duel_att_wins':   return `${ph} ${t('n_duel_wins')} ${p2h}! (${r1}:${r2}) – ${ph} ${t('n_duel_plus1')} ${p2h} ${t('n_duel_minus1')}`;
    case 'n_duel_def_wins':   return `${p2h} ${t('n_duel_wins')} ${ph}! (${r2}:${r1}) – ${p2h} ${t('n_duel_plus1')} ${ph} ${t('n_duel_minus1')}`;
    case 'n_duel_draw':       return `🤝 ${t('n_duel_draw')} (${r1}:${r2}) ${t('n_duel_reroll')}`;
    case 'n_quit':            return `${ph} ${t('n_quit')}`;
    case 'n_all_quit_win':    return `🎉 ${ph} ${t('n_all_quit_win')}`;
    case 'n_ssp_challenge':   return `${ph} ${t('n_ssp_challenge')}`;
    case 'n_ssp_reveal':      return `${ph} ${t('n_ssp_reveal')} ${s1} ${t('n_ssp_vs')} ${p2h} ${t('n_ssp_reveal')} ${s2}`;
    case 'n_ssp_win_chal':    return `${ph} (${s1}) ${t('n_ssp_win_chal')} ${p2h} (${s2})! ${ph} ${t('n_ssp_win_plus1')}`;
    case 'n_ssp_win_def':     return `${p2h} (${s2}) ${t('n_ssp_win_def')} ${ph} (${s1})! ${t('n_ssp_all_plus2')}`;
    case 'n_ssp_draw':        return `${t('n_ssp_draw')} ${ph} (${s1}) vs ${p2h} (${s2}) ${t('n_ssp_draw_retry')}`;
    case 'n_six_again':       return `${ph} ${t('n_six_again')}`;
    case 'n_new_round':       return t('n_new_round');
    default:                  return t(key);
  }
}

// Sync notification to Firebase → all players resolve in their own language
function notify(icon,key,params){
  if(!G)return;
  G.notification={icon,key,params:params||{},ts:Date.now()};
  showInfoBanner(icon,buildNotif(key,params));
}

// ── MAIN UI ─────────────────────────────────────────────────
function updateUI(){
  if(!G)return;
  renderBoard();
  if(G&&G.startedAt&&!timerInterval)startGameTimer();
  // Refresh figure grid if open
  if(document.getElementById('figure-screen')?.classList.contains('show'))renderFigureGrid();
  // Show figure picker if player hasn't chosen yet
  if(MY_IDX!==null&&G&&G.players[MY_IDX]&&!G.players[MY_IDX].figure&&G.winner<0&&!document.getElementById('figure-screen')?.classList.contains('show')){
    showFigurePicker(MY_IDX,null);
  }
  // Ensure stats exist on all players (safety for old Firebase states)
  if(G&&G.players)G.players.forEach(p=>{if(!p.stats)p.stats={kicked:0,gotKicked:0,duelsWon:0,duelsLost:0,tausch:0,sspWon:0,sspLost:0,sixes:0};});
  // Resolve SSP when both have picked - challenger's device executes
  if(G.pending?.type==='ssp_pick'&&G.pending.chalPick!=null&&G.pending.defPick!=null&&(MY_IDX===G.turn||(isBotDriver()&&isBot(G.turn)))){
    resolveSSP();
  }
  if(G.notification&&G.notification.ts>lastNotifTs){
    lastNotifTs=G.notification.ts;
    showInfoBanner(G.notification.icon, buildNotif(G.notification.key||'', G.notification.params||{}));
  }
  document.getElementById('pbar').innerHTML=G.players.map((p,i)=>{
    const isMe=i===MY_IDX,isActive=i===G.turn&&!p.quit;
    const qStyle=p.quit?'opacity:.35;filter:grayscale(1);':'';
    return`<div class="chip${isActive?' active':''}${isMe?' me':''}" id="chip-${i}" style="border-color:${p.color};${qStyle}">
      <div class="cfig">${p.figure||p.name[0].toUpperCase()}</div>
      <div><div class="cname">${p.name}${isMe?' 👤':''}${G.winner===i?' 🏆':''}${p.quit?' 🏳':''}${isBot(i)?' 🤖':''}</div>
      <div class="cpos">${p.quit?'Aufgegeben':fn(p.pos)}</div></div></div>`;
  }).join('');
  // Show/hide quit button
  const qBtn=document.getElementById('btn-quit');
  if(qBtn){const myP=MY_IDX!==null?G.players[MY_IDX]:null;qBtn.style.display=(myP&&!myP.quit&&G.winner<0)?'':'none';}
  const logEl=document.getElementById('logbox');
  const wasAtBottom=logEl.scrollHeight-logEl.scrollTop<=logEl.clientHeight+40;
  logEl.innerHTML=[...G.log].reverse().map((l,i)=>`<div class="le${i===G.log.length-1?' log-new':''}">${l}</div>`).join('');
  if(wasAtBottom)logEl.scrollTop=logEl.scrollHeight;
  const myQuit=MY_IDX!==null&&G.players[MY_IDX]?.quit;
  const isMyTurn=G.turn===MY_IDX&&!myQuit;
  const isAnimating=!!(moveAnim||moveAnimQueue.length>0);
  const isSSPDefender=(G.pending?.type==='ssp_pick'||G.pending?.type==='ssp_reveal')&&(G.pending.defender===MY_IDX||(isBotDriver()&&isBot(G.pending.defender)))&&!myQuit;
  const isSSPReveal=G.pending?.type==='ssp_reveal';
  const isTaktRespondent=G.pending?.type==='takt_challenge'&&MY_IDX!==null&&MY_IDX!==G.pending.challenger&&!myQuit&&(G.players[MY_IDX]?.pos||0)>=1&&G.pending.responses?.[MY_IDX]==null;
  const hasBotTaktRespondent=isBotDriver()&&G.pending?.type==='takt_challenge'&&G.players.some((p,i)=>i!==G.pending.challenger&&isBot(i)&&!p.quit&&(p.pos||0)>=1&&G.pending.responses?.[i]==null);
  // Warte-Box anzeigen wenn: nicht mein Zug, oder Animation läuft (mein Zug aber noch animiert)
  document.getElementById('waiting-box').classList.toggle('hidden',(isMyTurn&&!isAnimating)||G.phase==='done'||myQuit||isSSPDefender||isSSPReveal||isTaktRespondent);
  // Aktions-Box ausblenden während Animation läuft
  document.getElementById('abox').classList.toggle('hidden',(!isMyTurn&&G.phase!=='done'&&!isSSPDefender&&!isSSPReveal&&!isTaktRespondent)||myQuit||isAnimating);
  if(isAnimating&&isMyTurn){
    document.getElementById('waiting-msg').textContent='⏳ …';
    return;
  }
  if(!isMyTurn&&G.phase!=='done'){
    const pen=G.pending;
    if(pen&&pen.type==='heraus_roll'){
      const att=G.players[G.turn],def=G.players[pen.defender];
      document.getElementById('waiting-msg').innerHTML=`⚔ <b>${att.name}</b> ${t('challenges')} <b style="color:${def.color}">${def.name}</b>!`;
    }else if(pen&&pen.type==='ssp_choose'){
      document.getElementById('waiting-msg').innerHTML=`✂️ <b>${G.players[G.turn].name}</b> ${t('choosing_opponent')}…`;
    }else if(pen&&pen.type==='ssp_pick'){
      const myP=MY_IDX===pen?.defender?'Du bist herausgefordert!':'Duell läuft…';
      document.getElementById('waiting-msg').innerHTML=`${STEIN_EMOJI} SSP: ${myP}`;
    }else if(pen&&pen.type==='ssp_reveal'){
      const ce2=SSP_EMOJI[pen.chalPick],de2=SSP_EMOJI[pen.defPick];
      document.getElementById('waiting-msg').innerHTML=`${ce2} vs ${de2} – Ergebnis folgt…`;
    }else if(pen&&pen.type==='heraus_choose'){
      document.getElementById('waiting-msg').innerHTML=`⚔ <b>${G.players[G.turn].name}</b> ${t('choosing_opponent')}…`;
    }else if(pen&&pen.type==='takt_set'){
      const ch=G.players[pen.challenger];
      document.getElementById('waiting-msg').innerHTML=`🎯 <b style="color:${ch.color}">${ch.name}</b> spielt Taktfeld…`;
    }else if(pen&&pen.type==='takt_challenge'){
      const done=Object.keys(pen.responses||{}).length,need=pen.needed;
      document.getElementById('waiting-msg').innerHTML=`🎯 Taktfeld läuft… (${done}/${need} gespielt)`;
    }else{
      document.getElementById('waiting-msg').textContent=`${t('waiting_for')} ${G.players[G.turn].name}…`;
    }
    if(isBotDriver()&&isBotTurn()&&G.winner<0) scheduleBotTurn();
    if(isSSPDefender||isSSPReveal||isTaktRespondent||hasBotTaktRespondent) renderActions();
    return;
  }
  const abox=document.getElementById('abox');
  if(abox){
    if(isMyTurn&&G.phase!=='done'){abox.classList.add('my-turn');}
    else{abox.classList.remove('my-turn');}
  }
  if(isMyTurn||isSSPDefender||isSSPReveal||isTaktRespondent)renderActions();
  // Bot trigger for done phase or my turn
  if(isBotDriver()&&isBotTurn()&&G.winner<0){
    scheduleBotTurn();
  }
  // Bot as SSP defender - always check, regardless of whose turn it is
  if(isBotDriver()&&G.pending?.type==='ssp_pick'&&G.winner<0){
    const defIdx=G.pending.defender;
    if(isBot(defIdx)&&G.pending.defPick==null) scheduleBotDefenderPick();
  }
}

function renderActions(){
  const p=G.players[G.turn];
  document.getElementById('tlabel').innerHTML=`<span style="color:${p.color}">●</span> <b>${p.name}</b> – ${t('you_are_up')}`;
  const ab=document.getElementById('abtns'),dd=document.getElementById('ddisp');
  if(G.phase==='done'){onNextTurn();return;}
  if(G.phase==='start_roll'){dd.textContent='🎲';ab.innerHTML=`<button class="bbtn purple dice" onclick="onStartRoll()">${t('need_six')}<br><small style="opacity:.7;font-size:.82em">${G.rollsLeft} ${G.rollsLeft===1?t('tries'):t('tries_pl')}</small></button>`;return;}
  if(G.phase==='schranken'){dd.textContent='🎲';ab.innerHTML=`<div class="msg">${t('schranke_rule')}</div><button class="bbtn orange dice" onclick="onSchrankenRoll()">${t('roll_dice')}</button>`;return;}
  if(G.phase==='roll'){
    if(p.pos===34){dd.textContent='🏆';ab.innerHTML=`<div class="msg">${t('goal_field')}</div><button class="bbtn green dice" onclick="onWinRoll()">${t('win_roll')}</button>`;return;}
    dd.textContent='🎲';ab.innerHTML=`<button class="bbtn purple dice" onclick="onRoll()">${t('roll_dice')}</button>`;return;}
  if(G.phase==='becher'){dd.textContent='🎲';const ex=p.pos===33?t('becher_rule_b5'):t('becher_rule');ab.innerHTML=`<div class="msg">${t('becher_field')} ${ex}</div><button class="bbtn orange dice" onclick="onBecherRoll()">${t('roll_becher')}</button>`;return;}
  if(G.phase==='effect'&&G.pending){
    const pen=G.pending;
    if(pen.type==='tausch'){
      const opts=G.players.map((pl,i)=>i!==G.turn&&pl.pos>=0?`<button class="cbtn" onclick="onTausch(${i})" style="border-color:${pl.color}"><span style="color:${pl.color}">●</span> <b>${pl.name}</b><small>${fn(pl.pos)}</small></button>`:'').join('');
      ab.innerHTML=`<div class="msg">${t('tausch_msg')}</div><div class="choices">${opts||'<div class="msg">Kein Gegner.</div>'}</div>`;
      if(!opts)ab.innerHTML+=`<button class="bbtn purple" onclick="onSkip()">OK</button>`;return;}
    if(pen.type==='ssp_choose'){dd.innerHTML=`<span style="font-size:.55em;letter-spacing:2px">${STEIN_EMOJI} ✂️ 📄</span>`;
      const so=G.players.map((pl,i)=>i!==G.turn&&!pl.quit&&pl.pos>=0?`<button class="cbtn" onclick="onSSPChoose(${i})" style="border-color:${pl.color}"><span style="color:${pl.color}">●</span> <b>${pl.name}</b><small>${fn(pl.pos)}</small></button>`:'').join('');
      ab.innerHTML=`<div class="msg">${t('ssp_choose_msg')}</div><div class="choices">${so||'<div class="msg">Kein Gegner.</div>'}</div>`;
      if(!so)ab.innerHTML+=`<button class="bbtn purple" onclick="onSkip()">OK</button>`;return;}
    if(pen.type==='ssp_reveal'){dd.innerHTML=`<span style="font-size:.55em;letter-spacing:2px">${STEIN_EMOJI} ✂️ 📄</span>`;
      const ce=SSP_EMOJI[pen.chalPick],de=SSP_EMOJI[pen.defPick];
      const att2=G.players[G.turn],def2=G.players[pen.defender];
      let resultHTML='<div style="font-size:.72em;color:#6b7280;margin-top:6px">⏳ Ergebnis folgt…</div>';
      if(pen.outcome==='chal_wins'){
        resultHTML=`<div style="margin-top:8px"><span style="font-size:1.6em">✅</span><br><span style="color:#22c55e;font-weight:700;font-size:.9em">${att2.name} gewinnt +1 Feld!</span></div>`;
      }else if(pen.outcome==='def_wins'){
        resultHTML=`<div style="margin-top:8px"><span style="font-size:1.6em">✅</span><br><span style="color:#22c55e;font-weight:700;font-size:.9em">${def2.name} gewinnt – alle anderen +2!</span></div>`;
      }else if(pen.outcome==='draw'){
        resultHTML=`<div style="margin-top:8px"><span style="font-size:1.4em">🤝</span><br><span style="color:#eab308;font-weight:700;font-size:.9em">Unentschieden!</span></div>`;
      }
      ab.innerHTML=`<div style="text-align:center;padding:10px 0">
        <div style="font-size:3em;margin-bottom:4px">${ce} <span style="font-size:.6em;color:#9ca3af">vs</span> ${de}</div>
        <div style="font-size:.82em;color:#c4b5fd">${att2.name} vs ${def2.name}</div>
        ${resultHTML}
      </div>`;return;}
    if(pen.type==='ssp_pick'){dd.innerHTML=`<span style="font-size:.55em;letter-spacing:2px">${STEIN_EMOJI} ✂️ 📄</span>`;
      const amChal=G.turn===MY_IDX,amDef=pen.defender===MY_IDX;
      const myPick=amChal?pen.chalPick:amDef?pen.defPick:null;
      if((amChal||amDef)&&myPick==null){
        ab.innerHTML=`<div class="msg">${t('ssp_pick_msg')}</div>
          <div class="choices" style="grid-template-columns:1fr 1fr 1fr">
            <button class="cbtn" onclick="onSSPPick('stein')" style="font-size:1.8em;padding:14px 6px">${STEIN_EMOJI}<br><small>${t('stein')}</small></button>
            <button class="cbtn" onclick="onSSPPick('schere')" style="font-size:1.8em;padding:14px 6px">✂️<br><small>${t('schere')}</small></button>
            <button class="cbtn" onclick="onSSPPick('papier')" style="font-size:1.8em;padding:14px 6px">📄<br><small>${t('papier')}</small></button>
          </div>`;return;}
      ab.innerHTML=`<div class="msg">${t('ssp_wait')}</div>`;return;}
    if(pen.type==='heraus_choose'){
      const opts=G.players.map((pl,i)=>i!==G.turn&&pl.pos>=0?`<button class="cbtn" onclick="onHC(${i})" style="border-color:${pl.color}"><span style="color:${pl.color}">●</span> <b>${pl.name}</b><small>${fn(pl.pos)}</small></button>`:'').join('');
      ab.innerHTML=`<div class="msg">${t('heraus_msg')}</div><div class="choices">${opts||'<div class="msg">Kein Gegner.</div>'}</div>`;
      if(!opts)ab.innerHTML+=`<button class="bbtn purple" onclick="onSkip()">OK</button>`;return;}
    if(pen.type==='heraus_roll'){
      const def=G.players[pen.defender];
      ab.innerHTML=`<div class="msg">⚔ Duell: <b>${p.name}</b> vs <span style="color:${def.color}"><b>${def.name}</b></span></div><button class="bbtn red dice" onclick="onHD()">⚔ Duell!</button>`;return;}
    if(pen.type==='takt_set'){
      if(G.turn===MY_IDX){
        ab.innerHTML=`<div class="msg">🎯 Stoppe die Leiste so nah an der Mitte wie möglich!</div><div class="takt-bar-wrap"><div class="takt-bar"><div class="takt-needle" id="takt-needle"></div></div></div><button class="bbtn orange" onclick="onTaktStop()">🎯 STOPP!</button>`;
        setTimeout(()=>{ if(!_taktActive) startTaktBar(); },0);
      } else {
        const ch=G.players[pen.challenger];
        ab.innerHTML=`<div class="msg">🎯 <span style="color:${ch.color}">${ch.name}</span> spielt… alle spielen danach!</div>`;
      }
      return;
    }
    if(pen.type==='takt_challenge'){
      const ch=G.players[pen.challenger];
      if(MY_IDX!==pen.challenger&&(pen.responses||{})[MY_IDX]==null){
        ab.innerHTML=`<div class="msg">🎯 <b><span style="color:${ch.color}">${ch.name}</span></b> hat <span style="color:#fbbf24;font-size:1.1em"><b>${pen.challengerScore}</b></span> Punkte – kannst du das schlagen?</div><div class="takt-bar-wrap"><div class="takt-bar"><div class="takt-needle" id="takt-needle"></div></div></div><button class="bbtn orange" onclick="onTaktStop()">🎯 STOPP!</button>`;
        setTimeout(()=>{ if(!_taktActive) startTaktBar(); },0);
        if(MY_IDX!==null&&isBot(MY_IDX)) scheduleBotTaktResponse(MY_IDX);
      } else {
        const done=Object.keys(pen.responses||{}).length, need=pen.needed;
        ab.innerHTML=`<div class="msg">⏳ Warte auf andere Spieler… (${done}/${need})</div>`;
      }
      // Schedule bot respondents (only driver does this)
      if(isBotDriver()){
        G.players.forEach((_,i)=>{
          if(i!==pen.challenger&&isBot(i)&&(pen.responses||{})[i]==null&&!G.players[i].quit&&G.players[i].pos>=1)
            scheduleBotTaktResponse(i);
        });
      }
      return;
    }
    if(pen.type==='takt_result'){
      const cp=G.players[pen.challenger];
      const sorted=[...pen.results].sort((a,b)=>b.score-a.score);
      const rows=sorted.map(r=>{
        const pl=G.players[r.idx];
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.15)">
          <span style="font-size:1.3em">${pl.figure||'●'}</span>
          <span style="color:${pl.color};font-weight:bold;flex:1">${pl.name}</span>
          <span style="font-size:1.1em;font-weight:bold;color:${r.won?'#4ade80':'#f87171'}">${r.score} Pkt</span>
          <span style="font-size:1.2em">${r.won?'✅':'❌'}</span>
        </div>`;
      }).join('');
      ab.innerHTML=`<div style="text-align:center;font-weight:bold;margin-bottom:6px">🎯 ${cp.figure||'●'} <span style="color:${cp.color}">${cp.name}</span>: <span style="color:#fbbf24">${pen.challengerScore} Pkt</span> (Ziel)</div>${rows}`;
      return;
    }
  }
}

function showWin(){
  adminAutoPlay=false; // Schnelldurchlauf beenden
  stopGameTimer();
  _stopPulseLoop();
  if(G.winner===MY_IDX)SFX.win();
  startConfetti(G.players[G.winner].color);
  document.getElementById('wmsg').textContent=`${G.players[G.winner].name} ${t('win_msg')}`;
  renderWinActions();
  document.getElementById('win-screen').classList.add('show');
  vibe([100,50,100,50,200]);
  // Show stats automatically after 1.5 seconds
  setTimeout(()=>showStats(),1500);
}

function renderWinActions(){
  const el=document.getElementById('win-actions');
  if(!el)return;
  // Find active player 1 (index 0, or next non-quit if 0 quit)
  const host=G.players.find((p,i)=>!p.quit)||G.players[0];
  const hostIdx=G.players.indexOf(host);
  const isHost=MY_IDX===hostIdx;
  if(isHost){
    el.innerHTML=`
      <button class="bbtn purple" onclick="onStartRematch()">${t('play_again')}</button>
      <button class="bbtn green" onclick="newGame()" style="margin-top:6px">${t('main_menu')}</button>`;
  } else {
    el.innerHTML=`
      <div style="color:#9ca3af;font-size:.85em;padding:10px 0">${t('waiting_for')} ${host.name}…</div>
      <button class="bbtn green" onclick="newGame()" style="margin-top:6px">${t('main_menu')}</button>`;
  }
}
