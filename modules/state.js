// ── STATE MODULE ─────────────────────────────────────────────────

// ── FIREBASE ────────────────────────────────────────────────
const FIREBASE_CONFIG={apiKey:"AIzaSyAIJjxk5kxZ4rTxZ-MVXruFAo6AsW4CpzU",authDomain:"schleudergang-bcd3b.firebaseapp.com",databaseURL:"https://schleudergang-bcd3b-default-rtdb.europe-west1.firebasedatabase.app",projectId:"schleudergang-bcd3b",storageBucket:"schleudergang-bcd3b.firebasestorage.app",messagingSenderId:"969783189863",appId:"1:969783189863:web:f568cf5f53b9a750ac0fc2"};
const CFG_OK=!!(FIREBASE_CONFIG.apiKey&&FIREBASE_CONFIG.databaseURL);
var DB=null;
if(CFG_OK){firebase.initializeApp(FIREBASE_CONFIG);DB=firebase.database();}

// ── CONSTANTS ───────────────────────────────────────────────
const PCOLS=['#ef4444','#22c55e','#eab308','#a78bfa','#f97316'];
const FTYPE={0:'schranke',4:'arrow',5:'takt',7:'heraus',10:'schlA',11:'arrow',14:'tausch',16:'ssp',17:'arrow',22:'schlB',23:'arrow',29:'becher',30:'becher',31:'becher',32:'becher',33:'becher',34:'ziel'};
const FLBL=['S','1','2','3','→','🎯','6','⚔','8','9','🔵','←','12','13','🔄','15','✂','→','18','19','20','21','🔴','←','24','25','26','27','28','B1','B2','B3','B4','B5','🏆'];
function ft(p){return FTYPE[p]||'normal';}
function fn(p){if(p<0)return'Start';if(p===0)return'Schranke';if(p>=29&&p<=33)return`B${p-28}`;if(p===34)return'Ziel🏆';return`F${p}`;}
function _d6base(){return Math.floor(Math.random()*6)+1;}
function genId(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function vibe(ms=40){try{navigator.vibrate&&navigator.vibrate(ms);}catch{}}

// ── STATE ────────────────────────────────────────────────────
var G=null,GAME_ID=null,MY_IDX=null,LISTENER=null;
function newState(names){
  return{players:names.map((n,i)=>({name:n,color:PCOLS[i],pos:-1,visitedSchlB:false,kickedToSchranke:false,quit:false,figure:null,
      stats:{kicked:0,gotKicked:0,duelsWon:0,duelsLost:0,tausch:0,sspWon:0,sspLost:0,sixes:0}})),
    turn:0,phase:'start_roll',rollsLeft:3,pending:null,winner:-1,notification:null,startedAt:Date.now(),
    log:[`Spiel gestartet! ${names[0]} beginnt.`]};
}
function addLog(m){G.log.unshift(m);}
async function push(){
  if(!DB||!GAME_ID)return;
  const state=JSON.parse(JSON.stringify(G));
  // Use update to preserve chatMsgs sibling node
  await DB.ref('games/'+GAME_ID).update(state);
}
