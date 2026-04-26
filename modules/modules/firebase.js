// ── FIREBASE MODULE ──────────────────────────────────────────────

// ── CHAT ────────────────────────────────────────────────────
let CHAT_LISTENER=null;
function listenChat(id){
  if(CHAT_LISTENER){CHAT_LISTENER();CHAT_LISTENER=null;}
  const ref=DB.ref('games/'+id+'/chatMsgs');
  const h=ref.on('value',snap=>{
    const v=snap.val();
    const msgs=v?Object.values(v).sort((a,b)=>a.ts-b.ts):[];
    renderChat(msgs);
  });
  CHAT_LISTENER=()=>ref.off('value',h);
}

function renderChat(msgs){
  const box=document.getElementById('chatbox');
  if(!box)return;
  const atBottom=box.scrollHeight-box.scrollTop<=box.clientHeight+40;
  box.innerHTML=msgs.map(m=>{
    const mine=MY_IDX!==null&&G&&G.players[MY_IDX]&&m.name===G.players[MY_IDX].name;
    const time=new Date(m.ts).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'});
    return`<div class="cmsg ${mine?'mine':'other'}">
      <div class="cmsg-name" style="color:${m.color}">${m.name} · ${time}</div>
      <div class="cmsg-bubble">${escHtml(m.text)}</div>
    </div>`;
  }).join('');
  if(atBottom||msgs.length<=1) box.scrollTop=box.scrollHeight;

  // Notifications for new messages
  const newCount=msgs.length;
  if(newCount>lastMsgCount){
    const newMsgs=msgs.slice(lastMsgCount);
    const myName=MY_IDX!==null&&G?G.players[MY_IDX]?.name:null;
    newMsgs.forEach(m=>{
      if(m.name===myName)return; // don't notify for own messages
      if(!isChatOpen()){
        unreadCount++;
        updateBadge();
        showToast(m);
        vibe(60);
      }
    });
  }
  lastMsgCount=newCount;
}

function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

async function sendChat(){
  const inp=document.getElementById('chat-input');
  const txt=inp.value.trim();
  if(!txt||!GAME_ID||MY_IDX===null||!G)return;
  const p=G.players[MY_IDX];
  inp.value='';
  vibe(20);
  await DB.ref('games/'+GAME_ID+'/chatMsgs').push({name:p.name,color:p.color,text:txt,ts:Date.now()});
}

function switchTab(tab){
  document.getElementById('log-panel').classList.toggle('hidden',tab!=='log');
  document.getElementById('chat-panel').classList.toggle('hidden',tab!=='chat');
  document.getElementById('tab-log').classList.toggle('active',tab==='log');
  document.getElementById('tab-chat').classList.toggle('active',tab==='chat');
  // Reset unread badge
  if(tab==='chat'){
    unreadCount=0;updateBadge();
    const toast=document.getElementById('chat-toast');
    if(toast)toast.classList.remove('show');
  }
  if(tab==='chat'){
    const box=document.getElementById('chatbox');
    if(box)setTimeout(()=>box.scrollTop=box.scrollHeight,50);
    document.getElementById('tab-chat').style.position='relative';
    document.getElementById('tab-chat').dataset.unread='';
  }
}

// ── CHAT NOTIFICATIONS ──────────────────────────────────────
let unreadCount=0;
let lastMsgCount=0;
let toastTimer=null;

function isChatOpen(){
  return !document.getElementById('chat-panel').classList.contains('hidden');
}

function updateBadge(){
  const tab=document.getElementById('tab-chat');
  if(!tab)return;
  // Remove old badge
  const old=tab.querySelector('.chat-badge');
  if(old)old.remove();
  if(unreadCount>0){
    const b=document.createElement('span');
    b.className='chat-badge';
    b.textContent=unreadCount>9?'9+':unreadCount;
    tab.appendChild(b);
  }
}

function showToast(msg){
  const toast=document.getElementById('chat-toast');
  const dot=document.getElementById('toast-dot');
  const nameEl=document.getElementById('toast-name');
  const msgEl=document.getElementById('toast-msg');
  if(!toast)return;
  dot.style.background=msg.color;
  nameEl.textContent=msg.name;
  msgEl.textContent=msg.text;
  toast.classList.add('show');
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'),3500);
}

function markChatUnread(){}  // replaced by renderChat logic

// ── GAME LISTENER ───────────────────────────────────────────
function listenGame(id){
  if(LISTENER){LISTENER();LISTENER=null;}
  const ref=DB.ref('games/'+id);
  const h=ref.on('value',snap=>{
    const v=snap.val();if(!v)return;
    // Separate chatMsgs, dice broadcasts and emotes from game state
    // (these have their own listeners and must not trigger updateUI/scheduleBotTurn)
    const {chatMsgs,dice,emotes,...gameState}=v;

    // Detect player movements for animation
    if(G&&G.players){
      gameState.players.forEach((pl,idx)=>{
        const oldPos=G.players[idx]?.pos;
        const newPos=pl.pos;
        if(oldPos!==undefined&&newPos!==oldPos){
          startMoveAnim(oldPos,newPos,idx);
        }
      });
    }
    const wasFinished=G&&G.winner>=0;
    G=gameState;
    updateUI();
    if(G.winner>=0){showWin();}
    else if(wasFinished&&G.winner<0){
      // New game started by host → close win screen + show banner
      document.getElementById('win-screen').classList.remove('show');
      showInfoBanner('🎮',t('n_new_round'),1500);
    }
  });
  LISTENER=()=>ref.off('value',h);
}

// ── EMOTES ───────────────────────────────────────────────────
let EMOTE_LISTENER=null,_emoteCd=false;

function listenEmotes(id){
  if(EMOTE_LISTENER){EMOTE_LISTENER();EMOTE_LISTENER=null;}
  if(!DB)return;
  const ref=DB.ref('games/'+id+'/emotes');
  // Veraltete Einträge beim Start bereinigen
  ref.once('value',snap=>{
    const now=Date.now();
    snap.forEach(c=>{if(now-c.val().ts>6000)c.ref.remove();});
  });
  const h=ref.on('child_added',snap=>{
    const v=snap.val();
    if(!v||!G)return;
    if(Date.now()-v.ts>5000)return; // veraltete ignorieren
    showEmoteBubble(v.sender,v.emote,snap.ref);
    // Sender löscht seinen Eintrag nach 5s
    if(v.sender===MY_IDX)setTimeout(()=>snap.ref.remove().catch(()=>{}),5000);
  });
  EMOTE_LISTENER=()=>ref.off('child_added',h);
}

function toggleEmotePanel(){
  if(_emoteCd)return;
  document.getElementById('emote-panel')?.classList.toggle('open');
}

function sendEmote(emoji){
  if(_emoteCd||!GAME_ID||MY_IDX===null||!G||!G.players[MY_IDX]||G.players[MY_IDX].quit)return;
  document.getElementById('emote-panel')?.classList.remove('open');
  DB.ref('games/'+GAME_ID+'/emotes').push({sender:MY_IDX,emote:emoji,ts:Date.now()});
  // Cooldown 3s
  _emoteCd=true;
  const fab=document.getElementById('emote-fab');
  if(fab){fab.classList.add('cd');fab.textContent='⏳';}
  setTimeout(()=>{
    _emoteCd=false;
    const f=document.getElementById('emote-fab');
    if(f){f.classList.remove('cd');f.textContent='😄';}
  },3000);
}

function showEmoteBubble(senderIdx,emoji){
  if(!G||senderIdx<0||senderIdx>=G.players.length)return;
  const p=G.players[senderIdx];
  const bub=document.createElement('div');
  bub.className='emote-bubble';
  bub.style.borderColor=p.color;
  bub.style.border=`1.5px solid ${p.color}`;
  bub.innerHTML=`<span>${emoji}</span><span class="eb-name" style="color:${p.color}">${escHtml(p.name)}</span>`;
  document.body.appendChild(bub);
  // Position über dem Spieler-Chip ermitteln (nach Render)
  requestAnimationFrame(()=>{
    const chip=document.getElementById('chip-'+senderIdx);
    if(chip){
      const r=chip.getBoundingClientRect();
      const bw=bub.offsetWidth||90;
      const left=Math.max(8,Math.min(window.innerWidth-bw-8,r.left+(r.width-bw)/2));
      bub.style.left=left+'px';
      bub.style.top=Math.max(8,r.top-bub.offsetHeight-8)+'px';
    }else{
      // Fallback: unten Mitte
      bub.style.left=Math.max(8,(window.innerWidth-90)/2)+'px';
      bub.style.top=(window.innerHeight-160)+'px';
    }
  });
  // 2s sichtbar, dann Fade-out
  setTimeout(()=>{
    bub.classList.add('fading');
    bub.addEventListener('animationend',()=>bub.remove(),{once:true});
  },2000);
}

// Panel schließen bei Klick außerhalb
document.addEventListener('click',e=>{
  const p=document.getElementById('emote-panel');
  const f=document.getElementById('emote-fab');
  if(p?.classList.contains('open')&&!p.contains(e.target)&&e.target!==f)
    p.classList.remove('open');
});

// ── DICE BROADCAST ──────────────────────────────────────────
let DICE_LISTENER=null,_lastDiceTs=0;

// Würfelergebnis an alle Mitspieler broadcasten + lokal animieren
function _broadcastRoll(result,ms,cb){
  // Firebase-Event setzen (nicht bei adminAutoPlay/Bot-Schnelldurchlauf)
  if(!adminAutoPlay&&DB&&GAME_ID&&MY_IDX!==null){
    DB.ref('games/'+GAME_ID+'/dice').set({result,roller:MY_IDX,ms,ts:Date.now()}).catch(()=>{});
  }
  animDice(result,ms,cb);
}

// Listener: Andere Clients animieren wenn jemand anderes würfelt
function listenDice(id){
  if(DICE_LISTENER){DICE_LISTENER();DICE_LISTENER=null;}
  if(!DB)return;
  const ref=DB.ref('games/'+id+'/dice');
  const h=ref.on('value',snap=>{
    const v=snap.val();
    if(!v)return;
    if(v.roller===MY_IDX)return;      // Eigenes Würfeln läuft lokal
    if(v.ts<=_lastDiceTs)return;      // Bereits animiert
    if(Date.now()-v.ts>4000)return;   // Zu altes Event ignorieren
    _lastDiceTs=v.ts;
    animDice(v.result,v.ms||700,()=>{}); // Nur visuell, kein Spiellogik-Callback
  });
  DICE_LISTENER=()=>ref.off('value',h);
}
