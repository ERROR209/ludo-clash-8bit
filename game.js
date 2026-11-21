// ==========================================
// 1. AUDIO ENGINE (MODERN LUDO + 8-BIT BATTLE)
// ==========================================
let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type = 'sine', duration = 0.12, delay = 0, vol = 0.12) {
  if (!soundEnabled) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
}

const SFX = {
  dice: () => { [320, 420, 520, 640].forEach((f, i) => playTone(f, 'triangle', 0.06, i * 0.05, 0.14)); },
  hop:  () => playTone(580, 'sine', 0.07, 0, 0.15),
  safe: () => { [523, 659, 784].forEach((f, i) => playTone(f, 'sine', 0.14, i * 0.07, 0.14)); },
  tick: () => playTone(740, 'square', 0.06, 0, 0.1),
  powerUp: () => { [523, 659, 784, 1046].forEach((f, i) => playTone(f, 'square', 0.1, i * 0.06, 0.15)); },
  bomb: () => { [220, 150, 95, 65].forEach((f, i) => playTone(f, 'sawtooth', 0.16, i * 0.07, 0.2)); },
  battleStart: () => {
    const notes = [220, 261, 329, 440, 392, 523, 659];
    notes.forEach((f, i) => playTone(f, 'square', 0.09, i * 0.065, 0.13));
  },
  slash: () => {
    playTone(600, 'square', 0.05, 0, 0.14);
    playTone(150, 'sawtooth', 0.18, 0.04, 0.16);
  },
  smash: () => {
    playTone(110, 'sawtooth', 0.25, 0, 0.2);
    playTone(75, 'square', 0.28, 0.05, 0.2);
  },
  miss: () => {
    playTone(420, 'triangle', 0.08, 0, 0.12);
    playTone(240, 'triangle', 0.14, 0.07, 0.12);
  },
  guard: () => {
    [440, 554, 659].forEach((f, i) => playTone(f, 'square', 0.09, i * 0.06, 0.12));
  },
  win: () => {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => playTone(f, 'triangle', 0.16, i * 0.11, 0.16));
  }
};

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-btn').innerText = soundEnabled ? '🔊' : '🔇';
}

// ==========================================
// 2. LUDO KING BOARD & RANDOM HIDDEN TILES
// ==========================================
const COLORS = ['#dc2626', '#16a34a', '#eab308', '#2563eb'];
const LIGHT_COLORS = ['#fca5a5', '#86efac', '#fef08a', '#93c5fd'];
const COLOR_NAMES = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

const WARRIOR_CLASSES = [
  { name: 'KNIGHT', hp: 105, atk: 0, heal: 18 },
  { name: 'NINJA',  hp: 100, atk: 5, heal: 16 },
  { name: 'PALADIN',hp: 120, atk: -2,heal: 20 },
  { name: 'WIZARD', hp: 95,  atk: 4, heal: 26 }
];

const TILE_POOL = [
  { type: 'turbo',  icon: '⚡', label: 'TURBO BOOST +3!',   bg: '#fef08a' },
  { type: 'rage',   icon: '⚔️', label: 'RAGE ATK +15!',     bg: '#fecaca' },
  { type: 'shield', icon: '🛡️', label: 'AEGIS SHIELD!',     bg: '#bae6fd' },
  { type: 'bomb',   icon: '💣', label: 'BOMB TRAP -3!',     bg: '#fed7aa' },
  { type: 'warp',   icon: '🌀', label: 'WARP BACK TO START!', bg: '#e9d5ff' }
];

const MAIN_TRACK = [
  [6,13],[6,12],[6,11],[6,10],[6,9],
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  [0,7],
  [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  [7,0],
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  [14,7],
  [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
  [7,14],
  [6,14]
];

const START_INDEX = [0, 13, 26, 39];
const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

const HOME_STRETCH = [
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
];

const BASE_SPOTS = [
  [[2,11],[3,11],[2,12],[3,12]],
  [[2,2],[3,2],[2,3],[3,3]],
  [[11,2],[12,2],[11,3],[12,3]],
  [[11,11],[12,11],[11,12],[12,12]]
];

// Generate 10 completely random hidden traps & power-ups every match
function generateRandomHiddenTiles() {
  const candidates = [];
  for (let i = 0; i < 52; i++) {
    if (!SAFE_TRACK_INDICES.includes(i)) candidates.push(i);
  }
  // Fisher-Yates shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const selected = candidates.slice(0, 10);
  const map = {};
  selected.forEach((trackIdx, i) => {
    const item = TILE_POOL[i % TILE_POOL.length];
    map[trackIdx] = { ...item, revealed: true, used: false };
  });
  return map;
}

// ==========================================
// 3. GAME STATE & MULTIPLAYER SYNC
// ==========================================
let gameMode = 'bot';
let mySeat = 0;
let isHost = true;
let peer = null;
let connections = [];
let hostConn = null;

let state = {
  players: [],
  turn: 0,
  dice: 1,
  phase: 'MEMORIZE', // 'MEMORIZE', 'ROLL', 'SELECT', 'ANIM', 'BATTLE'
  memorySeconds: 5,
  hiddenTiles: {},
  battle: null
};

function createInitialState(playerConfigs) {
  return {
    players: playerConfigs.map((cfg, pIdx) => ({
      id: pIdx,
      name: cfg.name,
      isBot: cfg.isBot,
      active: cfg.active,
      tokens: [0, 1, 2, 3].map(tIdx => ({
        id: tIdx,
        steps: -1,
        role: tIdx,
        shield: false,
        rage: false
      }))
    })),
    turn: 0,
    dice: 1,
    phase: 'MEMORIZE',
    memorySeconds: 5,
    hiddenTiles: generateRandomHiddenTiles(),
    battle: null
  };
}

// ==========================================
// 4. ONLINE LOBBY (PEERJS)
// ==========================================
function showOnlineLobby() {
  document.getElementById('online-panel').classList.remove('hidden');
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 4; i++) res += chars[Math.floor(Math.random() * chars.length)];
  return res;
}

function hostOnlineGame() {
  const code = generateCode();
  isHost = true;
  mySeat = 0;
  document.getElementById('host-info').classList.remove('hidden');
  document.getElementById('room-code-display').innerText = code;
  document.getElementById('net-status').innerText = 'Creating Room...';

  peer = new Peer('LUDOKING8BIT-' + code);
  const myName = document.getElementById('player-name').value.trim() || 'Host';
  let lobbyMembers = [{ seat: 0, name: myName }];

  peer.on('open', () => {
    document.getElementById('net-status').innerText = 'Share code with up to 3 friends!';
    document.getElementById('start-online-btn').classList.remove('hidden');
  });

  peer.on('connection', conn => {
    if (connections.length >= 3) { conn.close(); return; }
    const assignedSeat = connections.length + 1;
    connections.push(conn);

    conn.on('data', data => {
      if (data.type === 'HELLO') {
        lobbyMembers.push({ seat: assignedSeat, name: data.name || `P${assignedSeat+1}` });
        document.getElementById('lobby-players-list').innerText =
          'Joined: ' + lobbyMembers.map(m => m.name).join(', ');
        conn.send({ type: 'WELCOME', seat: assignedSeat });
      } else if (data.type === 'ACTION') {
        handleRemoteAction(assignedSeat, data);
      }
    });
  });

  window._lobbyMembers = lobbyMembers;
}

function joinOnlineGame() {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  if (code.length < 4) return;
  isHost = false;
  document.getElementById('net-status').innerText = 'Connecting to ' + code + '...';

  peer = new Peer();
  peer.on('open', () => {
    hostConn = peer.connect('LUDOKING8BIT-' + code);
    hostConn.on('open', () => {
      const myName = document.getElementById('player-name').value.trim() || 'Guest';
      hostConn.send({ type: 'HELLO', name: myName });
      document.getElementById('net-status').innerText = 'Connected! Waiting for Host...';
    });

    hostConn.on('data', data => {
      if (data.type === 'WELCOME') {
        mySeat = data.seat;
      } else if (data.type === 'SYNC') {
        gameMode = 'online';
        const wasBattle = (state.phase === 'BATTLE');
        state = data.state;
        switchToGameScreen();
        // Everyone sees the 8-bit battle screen live!
        if (state.phase === 'BATTLE' && !wasBattle) {
          SFX.battleStart();
          startBattleCanvasLoop();
        }
        renderAll();
      } else if (data.type === 'BATTLE_FX') {
        // Sync visual hit sparks & floating numbers across all screens
        applyRemoteBattleFX(data.fx);
      }
    });
  });
}

function launchOnlineMatch() {
  const members = window._lobbyMembers || [{ seat: 0, name: 'Host' }];
  const configs = [0, 1, 2, 3].map(seat => {
    const found = members.find(m => m.seat === seat);
    return {
      name: found ? found.name : `CPU ${seat+1}`,
      isBot: !found,
      active: true
    };
  });
  gameMode = 'online';
  state = createInitialState(configs);
  switchToGameScreen();
  startMemoryCountdown();
}

function broadcastState() {
  if (gameMode === 'online' && isHost) {
    connections.forEach(c => { if (c.open) c.send({ type: 'SYNC', state }); });
  }
}

function broadcastBattleFX(fx) {
  if (gameMode === 'online' && isHost) {
    connections.forEach(c => { if (c.open) c.send({ type: 'BATTLE_FX', fx }); });
  }
}

function sendActionToHost(actionObj) {
  if (isHost) handleRemoteAction(mySeat, actionObj);
  else if (hostConn && hostConn.open) hostConn.send({ type: 'ACTION', ...actionObj });
}

function handleRemoteAction(seat, data) {
  if (data.action === 'ROLL' && state.turn === seat && state.phase === 'ROLL') executeRoll();
  else if (data.action === 'MOVE' && state.turn === seat && state.phase === 'SELECT') executeTokenMove(seat, data.tokenId);
  else if (data.action === 'BATTLE_MOVE' && state.phase === 'BATTLE') processBattleInput(seat, data.move);
}

// ==========================================
// 5. LOCAL / BOT START & 5-SEC MEMORY TIMER
// ==========================================
function startLocalGame(mode) {
  gameMode = mode;
  isHost = true;
  mySeat = 0;
  const p1 = document.getElementById('player-name').value.trim() || 'YOU';
  const configs = mode === 'bot'
    ? [
        { name: p1, isBot: false, active: true },
        { name: 'COMPUTER', isBot: true, active: true },
        { name: 'OFF', isBot: false, active: false },
        { name: 'OFF', isBot: false, active: false }
      ]
    : [
        { name: p1, isBot: false, active: true },
        { name: 'PLAYER 2', isBot: false, active: true },
        { name: 'OFF', isBot: false, active: false },
        { name: 'OFF', isBot: false, active: false }
      ];

  state = createInitialState(configs);
  switchToGameScreen();
  startMemoryCountdown();
}

function switchToGameScreen() {
  document.getElementById('menu-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
}

function startMemoryCountdown() {
  state.phase = 'MEMORIZE';
  state.memorySeconds = 5;
  renderAll();
  broadcastState();

  const timer = setInterval(() => {
    state.memorySeconds -= 1;
    if (state.memorySeconds > 0) {
      SFX.tick();
      renderAll();
      broadcastState();
    } else {
      clearInterval(timer);
      // Hide all un-triggered tiles!
      Object.values(state.hiddenTiles).forEach(tile => {
        tile.revealed = false;
      });
      SFX.safe();
      state.phase = 'ROLL';
      showToast('🤫 TILES HIDDEN! GAME ON!');
      renderAll();
      broadcastState();
    }
  }, 1000);
}

// ==========================================
// 6. 3D DICE & LUDO KING STEP-BY-STEP MOVEMENT
// ==========================================
function canIControlCurrentTurn() {
  const curP = state.players[state.turn];
  if (!curP || curP.isBot) return false;
  if (gameMode === 'local') return true;
  return state.turn === mySeat;
}

function handleDiceClick() {
  if (state.phase !== 'ROLL' || !canIControlCurrentTurn()) return;
  if (gameMode === 'online' && !isHost) {
    sendActionToHost({ action: 'ROLL' });
    return;
  }
  executeRoll();
}

function executeRoll() {
  SFX.dice();
  const cube = document.getElementById('cube-dice');
  cube.classList.add('rolling');
  state.phase = 'ANIM';

  setTimeout(() => {
    cube.classList.remove('rolling');
    const roll = Math.floor(Math.random() * 6) + 1;
    state.dice = roll;

    const validTokens = getMovableTokens(state.turn, roll);
    if (validTokens.length === 0) {
      renderAll();
      broadcastState();
      showToast('NO MOVE!');
      setTimeout(() => nextTurn(false), 850);
    } else if (validTokens.length === 1) {
      state.phase = 'SELECT';
      renderAll();
      broadcastState();
      setTimeout(() => executeTokenMove(state.turn, validTokens[0].id), 300);
    } else {
      state.phase = 'SELECT';
      renderAll();
      broadcastState();
      if (state.players[state.turn].isBot) {
        const pick = chooseSmartBotToken(state.turn, validTokens, roll);
        setTimeout(() => executeTokenMove(state.turn, pick.id), 550);
      }
    }
  }, 420);
}

function chooseSmartBotToken(pIdx, validTokens, roll) {
  for (let t of validTokens) {
    const nextStep = t.steps === -1 ? 0 : t.steps + roll;
    const gIdx = getGlobalTrackIndex(pIdx, nextStep);
    if (gIdx !== -1 && !SAFE_TRACK_INDICES.includes(gIdx) && findEnemyAtGlobalIndex(pIdx, gIdx)) {
      return t;
    }
  }
  const baseToken = validTokens.find(t => t.steps === -1);
  if (baseToken) return baseToken;
  return validTokens[0];
}

function getMovableTokens(pIdx, dice) {
  return state.players[pIdx].tokens.filter(t => {
    if (t.steps === 56) return false;
    if (t.steps === -1) return dice === 6;
    return t.steps + dice <= 56;
  });
}

function nextTurn(bonusRoll) {
  if (!bonusRoll) {
    do {
      state.turn = (state.turn + 1) % 4;
    } while (!state.players[state.turn].active);
  }
  state.phase = 'ROLL';
  renderAll();
  broadcastState();

  if (isHost && state.players[state.turn].isBot) {
    setTimeout(executeRoll, 700);
  }
}

function getGlobalTrackIndex(pIdx, steps) {
  if (steps < 0 || steps > 50) return -1;
  return (START_INDEX[pIdx] + steps) % 52;
}

function executeTokenMove(pIdx, tokenId) {
  const player = state.players[pIdx];
  const token = player.tokens[tokenId];
  const dice = state.dice;
  if (token.steps === -1 && dice !== 6) return;
  if (token.steps >= 0 && token.steps + dice > 56) return;

  state.phase = 'ANIM';

  if (token.steps === -1) {
    token.steps = 0;
    SFX.hop();
    renderAll();
    broadcastState();
    setTimeout(() => finishTokenMove(pIdx, token, dice), 260);
    return;
  }

  let stepsLeft = dice;
  const hopInterval = setInterval(() => {
    token.steps += 1;
    stepsLeft -= 1;
    SFX.hop();
    renderAll();
    broadcastState();

    if (stepsLeft <= 0) {
      clearInterval(hopInterval);
      setTimeout(() => finishTokenMove(pIdx, token, dice), 200);
    }
  }, 150);
}

function finishTokenMove(pIdx, token, dice) {
  const player = state.players[pIdx];

  // Reached Home Center
  if (token.steps === 56) {
    SFX.safe();
    showToast('👑 HOME! BONUS ROLL');
    if (player.tokens.every(t => t.steps === 56)) {
      declareWinner(pIdx);
      return;
    }
    nextTurn(true);
    return;
  }

  // Check Hidden Trap or Power-Up Tile!
  const gIdx = getGlobalTrackIndex(pIdx, token.steps);
  if (gIdx !== -1 && state.hiddenTiles[gIdx] && !state.hiddenTiles[gIdx].used) {
    const hTile = state.hiddenTiles[gIdx];
    hTile.revealed = true;
    hTile.used = true;
    showToast(`${hTile.icon} ${hTile.label}`);

    if (hTile.type === 'turbo') {
      SFX.powerUp();
      token.steps = Math.min(55, token.steps + 3);
    } else if (hTile.type === 'rage') {
      SFX.powerUp();
      token.rage = true;
    } else if (hTile.type === 'shield') {
      SFX.powerUp();
      token.shield = true;
    } else if (hTile.type === 'bomb') {
      SFX.bomb();
      token.steps = Math.max(0, token.steps - 3);
    } else if (hTile.type === 'warp') {
      SFX.bomb();
      token.steps = 0; // Warped back to own start tile!
    }

    renderAll();
    broadcastState();
    setTimeout(() => resolveSquareCollision(pIdx, token, dice), 700);
    return;
  }

  resolveSquareCollision(pIdx, token, dice);
}

function resolveSquareCollision(pIdx, token, dice) {
  const gIdx = getGlobalTrackIndex(pIdx, token.steps);
  if (gIdx !== -1) {
    if (SAFE_TRACK_INDICES.includes(gIdx)) {
      SFX.safe();
    } else {
      const enemy = findEnemyAtGlobalIndex(pIdx, gIdx);
      if (enemy) {
        // Check if Defender has Aegis Shield from hidden tile!
        if (enemy.token.shield) {
          enemy.token.shield = false;
          SFX.guard();
          showToast('🛡️ AEGIS SHIELD BLOCKED!');
          token.steps = -1; // Attacker sent back!
          renderAll();
          broadcastState();
          setTimeout(() => nextTurn(false), 900);
          return;
        }
        startEightBitBattle(pIdx, token.id, enemy.pIdx, enemy.token.id);
        return;
      }
    }
  }
  nextTurn(dice === 6);
}

function findEnemyAtGlobalIndex(myPIdx, gIdx) {
  for (let p = 0; p < 4; p++) {
    if (p === myPIdx || !state.players[p].active) continue;
    for (let t of state.players[p].tokens) {
      if (getGlobalTrackIndex(p, t.steps) === gIdx) {
        return { pIdx: p, token: t };
      }
    }
  }
  return null;
}

// ==========================================
// 7. 8-BIT PIXEL CHARACTER BATTLE (ALL SCREENS)
// ==========================================
let battleAnimId = null;
let battleVisual = {
  tick: 0,
  atkOffsetX: 0,
  defOffsetX: 0,
  atkFlash: 0,
  defFlash: 0,
  sparks: [],
  floatingText: null
};

function startEightBitBattle(atkP, atkT, defP, defT) {
  SFX.battleStart();
  const aToken = state.players[atkP].tokens[atkT];
  const dToken = state.players[defP].tokens[defT];
  const aClass = WARRIOR_CLASSES[aToken.role];
  const dClass = WARRIOR_CLASSES[dToken.role];

  const atkMax = aClass.hp + 10;
  const defMax = dClass.hp;

  state.phase = 'BATTLE';
  state.battle = {
    atkP, atkT, defP, defT,
    atkHp: atkMax, atkMax,
    defHp: defMax, defMax,
    atkRage: aToken.rage,
    defRage: dToken.rage,
    activeFighter: atkP,
    atkGuard: false,
    defGuard: false,
    log: `${COLOR_NAMES[atkP]} ${aClass.name} vs ${COLOR_NAMES[defP]} ${dClass.name}!`
  };

  // Consume rage buffs into this battle
  aToken.rage = false;
  dToken.rage = false;

  battleVisual = { tick: 0, atkOffsetX: 0, defOffsetX: 0, atkFlash: 0, defFlash: 0, sparks: [], floatingText: null };
  startBattleCanvasLoop();
  renderAll();
  broadcastState();
  checkBotBattleTurn();
}

function submitBattleMove(move) {
  if (state.phase !== 'BATTLE' || !state.battle) return;
  const b = state.battle;
  if (gameMode === 'online' && !isHost) {
    if (mySeat === b.activeFighter) sendActionToHost({ action: 'BATTLE_MOVE', move });
    return;
  }
  if (gameMode === 'online' && mySeat !== b.activeFighter) return;
  processBattleInput(b.activeFighter, move);
}

function applyRemoteBattleFX(fx) {
  if (fx.dash === 'atk') {
    battleVisual.atkOffsetX = 68;
    setTimeout(() => { battleVisual.atkOffsetX = 0; }, 240);
  } else if (fx.dash === 'def') {
    battleVisual.defOffsetX = -68;
    setTimeout(() => { battleVisual.defOffsetX = 0; }, 240);
  }
  if (fx.flash === 'def') battleVisual.defFlash = 10;
  if (fx.flash === 'atk') battleVisual.atkFlash = 10;
  if (fx.sparks) spawnHitSparks(fx.sparks.x, fx.sparks.y, fx.sparks.color);
  if (fx.float) spawnFloatingText(fx.float.text, fx.float.x, fx.float.y, fx.float.color);
  if (fx.sfx && SFX[fx.sfx]) SFX[fx.sfx]();
  if (fx.shake) triggerArenaShake();
}

function processBattleInput(seat, move) {
  const b = state.battle;
  if (!b || b.activeFighter !== seat) return;

  const isAtkTurn = (seat === b.atkP);
  const actorToken = state.players[seat].tokens[isAtkTurn ? b.atkT : b.defT];
  const wClass = WARRIOR_CLASSES[actorToken.role];
  const rageBonus = (isAtkTurn ? b.atkRage : b.defRage) ? 15 : 0;

  let fx = { dash: isAtkTurn ? 'atk' : 'def' };
  if (isAtkTurn) battleVisual.atkOffsetX = 68;
  else battleVisual.defOffsetX = -68;
  setTimeout(() => {
    battleVisual.atkOffsetX = 0;
    battleVisual.defOffsetX = 0;
  }, 240);

  let msg = '';
  if (move === 'slash' || move === 'smash') {
    const isSmash = (move === 'smash');
    if (isSmash && Math.random() < 0.30) {
      SFX.miss();
      fx.sfx = 'miss';
      msg = `${COLOR_NAMES[seat]} used HEAVY HIT... MISSED!`;
      const tx = isAtkTurn ? 225 : 95;
      spawnFloatingText('MISS!', tx, 65, '#facc15');
      fx.float = { text: 'MISS!', x: tx, y: 65, color: '#facc15' };
      if (isAtkTurn) b.defGuard = false; else b.atkGuard = false;
    } else {
      let dmg = isSmash
        ? 50 + Math.floor(Math.random() * 11) + wClass.atk + rageBonus
        : 26 + Math.floor(Math.random() * 9) + wClass.atk + rageBonus;
      if (isAtkTurn && b.defGuard) { dmg = Math.floor(dmg * 0.3); b.defGuard = false; }
      if (!isAtkTurn && b.atkGuard) { dmg = Math.floor(dmg * 0.3); b.atkGuard = false; }

      if (isAtkTurn) {
        b.defHp = Math.max(0, b.defHp - dmg);
        battleVisual.defFlash = 10;
        spawnHitSparks(225, 100, COLORS[seat]);
        spawnFloatingText(`-${dmg}`, 225, 60, '#ef4444');
        fx.flash = 'def';
        fx.sparks = { x: 225, y: 100, color: COLORS[seat] };
        fx.float = { text: `-${dmg}`, x: 225, y: 60, color: '#ef4444' };
      } else {
        b.atkHp = Math.max(0, b.atkHp - dmg);
        battleVisual.atkFlash = 10;
        spawnHitSparks(95, 100, COLORS[seat]);
        spawnFloatingText(`-${dmg}`, 95, 60, '#ef4444');
        fx.flash = 'atk';
        fx.sparks = { x: 95, y: 100, color: COLORS[seat] };
        fx.float = { text: `-${dmg}`, x: 95, y: 60, color: '#ef4444' };
      }

      isSmash ? SFX.smash() : SFX.slash();
      fx.sfx = isSmash ? 'smash' : 'slash';
      fx.shake = true;
      msg = isSmash
        ? `CRITICAL HIT! ${COLOR_NAMES[seat]} dealt ${dmg} DMG!`
        : `${COLOR_NAMES[seat]} slashed for ${dmg} DMG!`;
      triggerArenaShake();
    }
  } else if (move === 'guard') {
    SFX.guard();
    fx.sfx = 'guard';
    if (isAtkTurn) {
      b.atkGuard = true;
      b.atkHp = Math.min(b.atkMax, b.atkHp + wClass.heal);
      spawnFloatingText(`+${wClass.heal} HP`, 95, 60, '#4ade80');
      fx.float = { text: `+${wClass.heal} HP`, x: 95, y: 60, color: '#4ade80' };
    } else {
      b.defGuard = true;
      b.defHp = Math.min(b.defMax, b.defHp + wClass.heal);
      spawnFloatingText(`+${wClass.heal} HP`, 225, 60, '#4ade80');
      fx.float = { text: `+${wClass.heal} HP`, x: 225, y: 60, color: '#4ade80' };
    }
    msg = `${COLOR_NAMES[seat]} used GUARD (+${wClass.heal} HP)!`;
  }

  b.log = msg;
  broadcastBattleFX(fx);

  // Check KO
  if (b.defHp <= 0 || b.atkHp <= 0) {
    const attackerWon = (b.defHp <= 0);
    b.log = attackerWon
      ? `K.O.! ${COLOR_NAMES[b.atkP]} captured ${COLOR_NAMES[b.defP]}'s token!`
      : `K.O.! ${COLOR_NAMES[b.defP]} defeated the attacker!`;
    renderAll();
    broadcastState();

    setTimeout(() => {
      stopBattleCanvasLoop();
      if (attackerWon) {
        state.players[b.defP].tokens[b.defT].steps = -1;
        state.battle = null;
        nextTurn(true);
      } else {
        state.players[b.atkP].tokens[b.atkT].steps = -1;
        state.battle = null;
        nextTurn(false);
      }
    }, 1450);
    return;
  }

  b.activeFighter = isAtkTurn ? b.defP : b.atkP;
  renderAll();
  broadcastState();
  checkBotBattleTurn();
}

function checkBotBattleTurn() {
  if (!isHost || state.phase !== 'BATTLE' || !state.battle) return;
  const activeP = state.battle.activeFighter;
  if (state.players[activeP].isBot) {
    setTimeout(() => {
      if (!state.battle) return;
      const moves = ['slash', 'slash', 'smash', 'guard'];
      processBattleInput(activeP, moves[Math.floor(Math.random() * moves.length)]);
    }, 900);
  }
}

function triggerArenaShake() {
  const arena = document.getElementById('battle-arena');
  arena.classList.remove('hit-shake');
  void arena.offsetWidth;
  arena.classList.add('hit-shake');
}

// ==========================================
// 8. PIXEL-ART WARRIOR RENDERER (8-BIT STAGE)
// ==========================================
const bCanvas = document.getElementById('battle-canvas');
const bCtx = bCanvas.getContext('2d');

function spawnHitSparks(x, y, color) {
  for (let i = 0; i < 14; i++) {
    battleVisual.sparks.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.8) * 7,
      color: i % 2 === 0 ? '#facc15' : color,
      life: 16
    });
  }
}

function spawnFloatingText(text, x, y, color) {
  battleVisual.floatingText = { text, x, y, color, life: 28 };
}

function startBattleCanvasLoop() {
  if (battleAnimId) cancelAnimationFrame(battleAnimId);
  function loop() {
    if (state.phase !== 'BATTLE' || !state.battle) return;
    battleVisual.tick++;
    drawPixelBattleStage();
    battleAnimId = requestAnimationFrame(loop);
  }
  loop();
}

function stopBattleCanvasLoop() {
  if (battleAnimId) cancelAnimationFrame(battleAnimId);
  battleAnimId = null;
}

function drawPixelBattleStage() {
  const b = state.battle;
  if (!b) return;

  bCtx.fillStyle = '#1e1b4b';
  bCtx.fillRect(0, 0, 320, 170);

  bCtx.fillStyle = '#312e81';
  for (let i = 0; i < 320; i += 32) {
    bCtx.fillRect(i + 4, 30, 16, 95);
  }

  bCtx.fillStyle = '#374151';
  bCtx.fillRect(0, 122, 320, 48);
  bCtx.fillStyle = '#facc15';
  bCtx.fillRect(0, 122, 320, 4);

  bCtx.fillStyle = '#1f2937';
  for (let x = 0; x < 320; x += 20) {
    bCtx.fillRect(x, 132, 10, 10);
    bCtx.fillRect(x + 10, 148, 10, 10);
  }

  const bob = Math.sin(battleVisual.tick * 0.15) * 2;

  const aToken = state.players[b.atkP].tokens[b.atkT];
  if (battleVisual.atkFlash > 0) battleVisual.atkFlash--;
  if (battleVisual.atkFlash % 2 === 0) {
    drawPixelWarrior(
      85 + battleVisual.atkOffsetX,
      118 + bob,
      COLORS[b.atkP],
      LIGHT_COLORS[b.atkP],
      aToken.role,
      true,
      b.atkGuard,
      b.atkRage
    );
  }

  const dToken = state.players[b.defP].tokens[b.defT];
  if (battleVisual.defFlash > 0) battleVisual.defFlash--;
  if (battleVisual.defFlash % 2 === 0) {
    drawPixelWarrior(
      235 + battleVisual.defOffsetX,
      118 - bob,
      COLORS[b.defP],
      LIGHT_COLORS[b.defP],
      dToken.role,
      false,
      b.defGuard,
      b.defRage
    );
  }

  battleVisual.sparks.forEach(s => {
    bCtx.fillStyle = s.color;
    bCtx.fillRect(Math.round(s.x), Math.round(s.y), 4, 4);
    s.x += s.vx;
    s.y += s.vy;
    s.life--;
  });
  battleVisual.sparks = battleVisual.sparks.filter(s => s.life > 0);

  if (battleVisual.floatingText) {
    const ft = battleVisual.floatingText;
    bCtx.font = 'bold 12px "Press Start 2P", monospace';
    bCtx.textAlign = 'center';
    bCtx.fillStyle = '#000';
    bCtx.fillText(ft.text, ft.x + 2, ft.y + 2);
    bCtx.fillStyle = ft.color;
    bCtx.fillText(ft.text, ft.x, ft.y);
    ft.y -= 0.7;
    ft.life--;
    if (ft.life <= 0) battleVisual.floatingText = null;
  }
}

function drawPixelWarrior(cx, footY, mainColor, trimColor, roleIdx, facingRight, hasGuard, hasRage) {
  const P = 4;
  const x0 = Math.round(cx);
  const y0 = Math.round(footY);

  const px = (gx, gy, w, h, col) => {
    bCtx.fillStyle = col;
    const drawX = facingRight ? (x0 + gx * P) : (x0 - (gx + w) * P);
    bCtx.fillRect(drawX, y0 + gy * P, w * P, h * P);
  };

  bCtx.fillStyle = 'rgba(0,0,0,0.45)';
  bCtx.fillRect(x0 - 18, y0 - 2, 36, 5);

  px(-4, -2, 3, 2, '#111827');
  px(1,  -2, 3, 2, '#111827');

  px(-4, -7, 8, 5, mainColor);
  px(-2, -6, 4, 3, trimColor);
  px(-6, -7, 2, 6, '#1e293b');

  px(-4, -12, 8, 5, '#fed7aa');
  px(1, -10, 2, 2, '#0f172a');

  if (roleIdx === 0) {
    px(-5, -14, 10, 3, '#cbd5e1');
    px(-2, -16, 4, 2, mainColor);
  } else if (roleIdx === 1) {
    px(-5, -13, 10, 2, mainColor);
    px(-7, -12, 2, 3, trimColor);
  } else if (roleIdx === 2) {
    px(-5, -14, 10, 3, '#facc15');
    px(-3, -16, 6, 2, mainColor);
  } else {
    px(-6, -13, 12, 2, mainColor);
    px(-4, -16, 8, 3, mainColor);
    px(-2, -18, 4, 2, '#facc15');
  }

  if (roleIdx === 3) {
    px(5, -13, 2, 12, '#92400e');
    px(4, -15, 4, 3, '#38bdf8');
  } else {
    px(5, -6, 3, 2, '#facc15');
    px(7, -12, 2, 7, hasRage ? '#ef4444' : '#f8fafc');
    px(7, -14, 2, 2, hasRage ? '#facc15' : '#93c5fd');
  }

  if (hasGuard) {
    bCtx.strokeStyle = '#38bdf8';
    bCtx.lineWidth = 3;
    bCtx.strokeRect(x0 - 24, y0 - 74, 48, 76);
  }
}

// ==========================================
// 9. LUDO KING CANVAS BOARD & GLOSSY PINS
// ==========================================
const canvas = document.getElementById('ludo-canvas');
const ctx = canvas.getContext('2d');
const CELL = 40;

function renderAll() {
  drawLudoKingBoard();
  drawLudoKingTokens();
  updateHUD();
  updateBattleModal();
}

function drawLudoKingBoard() {
  ctx.clearRect(0, 0, 600, 600);

  drawBaseQuadrant(0, 9, COLORS[0]);
  drawBaseQuadrant(0, 0, COLORS[1]);
  drawBaseQuadrant(9, 0, COLORS[2]);
  drawBaseQuadrant(9, 9, COLORS[3]);

  for (let gx = 0; gx < 15; gx++) {
    for (let gy = 0; gy < 15; gy++) {
      if ((gx < 6 && gy < 6) || (gx > 8 && gy < 6) || (gx < 6 && gy > 8) || (gx > 8 && gy > 8)) continue;
      if (gx >= 6 && gx <= 8 && gy >= 6 && gy <= 8) continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(gx * CELL, gy * CELL, CELL, CELL);
    }
  }

  HOME_STRETCH.forEach((path, pIdx) => {
    path.slice(0, 5).forEach(([gx, gy]) => {
      ctx.fillStyle = COLORS[pIdx];
      ctx.fillRect(gx * CELL + 1, gy * CELL + 1, CELL - 2, CELL - 2);
    });
    const [sx, sy] = MAIN_TRACK[START_INDEX[pIdx]];
    ctx.fillStyle = COLORS[pIdx];
    ctx.fillRect(sx * CELL + 1, sy * CELL + 1, CELL - 2, CELL - 2);
  });

  // Safe Stars
  SAFE_TRACK_INDICES.forEach(idx => {
    const [gx, gy] = MAIN_TRACK[idx];
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = [0, 13, 26, 39].includes(idx) ? '#ffffff' : '#64748b';
    ctx.fillText('★', gx * CELL + CELL / 2, gy * CELL + CELL / 2 + 1);
  });

  // Draw Hidden Tiles ONLY during 5s Memory Reveal OR when triggered!
  Object.entries(state.hiddenTiles || {}).forEach(([idx, tile]) => {
    if (!tile.revealed) return;
    const [gx, gy] = MAIN_TRACK[idx];
    ctx.fillStyle = tile.bg;
    ctx.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);

    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tile.icon, gx * CELL + CELL / 2, gy * CELL + CELL / 2 + 1);
  });

  // Center Crown Triangles
  const cx = 300, cy = 300;
  const tris = [
    [[240,360],[360,360], COLORS[0]],
    [[240,240],[240,360], COLORS[1]],
    [[240,240],[360,240], COLORS[2]],
    [[360,240],[360,360], COLORS[3]]
  ];
  tris.forEach(([p1, p2, col]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawBaseQuadrant(gx, gy, color) {
  ctx.fillStyle = color;
  ctx.fillRect(gx * CELL, gy * CELL, 6 * CELL, 6 * CELL);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect((gx + 1) * CELL, (gy + 1) * CELL, 4 * CELL, 4 * CELL, 16);
  ctx.fill();

  const offsets = [[2,2],[3,2],[2,3],[3,3]];
  offsets.forEach(([ox, oy]) => {
    ctx.beginPath();
    ctx.arc((gx + ox) * CELL + CELL / 2, (gy + oy) * CELL + CELL / 2, 14, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

function getTokenPixelCoords(pIdx, token) {
  if (token.steps === -1) {
    const [bx, by] = BASE_SPOTS[pIdx][token.id];
    return { x: bx * CELL + CELL / 2, y: by * CELL + CELL / 2 };
  }
  if (token.steps <= 50) {
    const gIdx = getGlobalTrackIndex(pIdx, token.steps);
    const [gx, gy] = MAIN_TRACK[gIdx];
    return { x: gx * CELL + CELL / 2, y: gy * CELL + CELL / 2 };
  }
  const hIdx = Math.min(5, token.steps - 51);
  const [hx, hy] = HOME_STRETCH[pIdx][hIdx];
  return { x: hx * CELL + CELL / 2, y: hy * CELL + CELL / 2 };
}

function drawLudoKingTokens() {
  const movable = (state.phase === 'SELECT') ? getMovableTokens(state.turn, state.dice).map(t => t.id) : [];

  state.players.forEach((p, pIdx) => {
    if (!p.active) return;
    p.tokens.forEach(t => {
      const { x, y } = getTokenPixelCoords(pIdx, t);
      const isHighlight = (pIdx === state.turn && movable.includes(t.id));

      if (isHighlight) {
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Aegis Shield Aura on Token
      if (t.shield) {
        ctx.beginPath();
        ctx.arc(x, y - 2, 17, 0, Math.PI * 2);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }

      // Rage Attack Aura on Token
      if (t.rage) {
        ctx.beginPath();
        ctx.arc(x, y - 2, 17, 0, Math.PI * 2);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.ellipse(x, y + 10, 11, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();

      const grad = ctx.createRadialGradient(x - 4, y - 6, 2, x, y, 15);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, LIGHT_COLORS[pIdx]);
      grad.addColorStop(1, COLORS[pIdx]);

      ctx.beginPath();
      ctx.arc(x, y - 2, 13, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y - 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[pIdx];
      ctx.fill();
    });
  });
}

canvas.addEventListener('click', (e) => {
  if (state.phase !== 'SELECT' || !canIControlCurrentTurn()) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (600 / rect.width);
  const clickY = (e.clientY - rect.top) * (600 / rect.height);

  const movable = getMovableTokens(state.turn, state.dice);
  for (let t of movable) {
    const { x, y } = getTokenPixelCoords(state.turn, t);
    if (Math.hypot(clickX - x, clickY - y) <= 25) {
      if (gameMode === 'online' && !isHost) sendActionToHost({ action: 'MOVE', tokenId: t.id });
      else executeTokenMove(state.turn, t.id);
      break;
    }
  }
});

function updateHUD() {
  // Memory Banner Update
  const memBanner = document.getElementById('memory-banner');
  if (state.phase === 'MEMORIZE') {
    memBanner.classList.remove('hidden');
    memBanner.innerText = `👁️ MEMORIZE TILES! ${state.memorySeconds}s`;
  } else {
    memBanner.classList.add('hidden');
  }

  state.players.forEach((p, idx) => {
    const card = document.getElementById(`pcard-${idx}`);
    if (!p.active) {
      card.style.visibility = 'hidden';
      return;
    }
    card.style.visibility = 'visible';
    card.classList.toggle('active-turn', state.turn === idx);
    document.getElementById(`pname-${idx}`).innerText = p.name;
    const homeCount = p.tokens.filter(t => t.steps === 56).length;
    document.getElementById(`pscore-${idx}`).innerText = `Home: ${homeCount}/4`;
  });

  const curP = state.players[state.turn];
  document.getElementById('turn-indicator').innerText = `${curP.name}'S TURN`;

  const cube = document.getElementById('cube-dice');
  cube.className = `cube show-${state.dice}`;

  const hint = document.getElementById('action-hint');
  if (state.phase === 'MEMORIZE') hint.innerText = 'MEMORIZE!';
  else if (state.phase === 'ROLL') hint.innerText = canIControlCurrentTurn() ? 'TAP DICE' : 'WAITING...';
  else if (state.phase === 'SELECT') hint.innerText = 'PICK TOKEN';
  else hint.innerText = 'MOVING...';
}

function updateBattleModal() {
  const modal = document.getElementById('battle-modal');
  if (state.phase !== 'BATTLE' || !state.battle) {
    modal.classList.add('hidden');
    return;
  }
  modal.classList.remove('hidden');
  const b = state.battle;
  const aClass = WARRIOR_CLASSES[state.players[b.atkP].tokens[b.atkT].role];
  const dClass = WARRIOR_CLASSES[state.players[b.defP].tokens[b.defT].role];

  const isParticipant = (gameMode === 'local') || (mySeat === b.atkP || mySeat === b.defP);
  document.getElementById('battle-header-text').innerText =
    isParticipant ? '★ 8-BIT CLASH ARENA ★' : '👁️ LIVE SPECTATING CLASH 👁️';

  document.getElementById('atk-name').innerText = `${COLOR_NAMES[b.atkP]} ${aClass.name}`;
  document.getElementById('atk-hp-bar').style.width = `${(b.atkHp / b.atkMax) * 100}%`;
  document.getElementById('atk-hp-text').innerText = `HP ${b.atkHp}/${b.atkMax}`;

  document.getElementById('def-name').innerText = `${COLOR_NAMES[b.defP]} ${dClass.name}`;
  document.getElementById('def-hp-bar').style.width = `${(b.defHp / b.defMax) * 100}%`;
  document.getElementById('def-hp-text').innerText = `HP ${b.defHp}/${b.defMax}`;

  document.getElementById('battle-log').innerText = b.log;

  const activePlayerObj = state.players[b.activeFighter];
  const canControlBattle = !activePlayerObj.isBot &&
    (gameMode === 'local' || mySeat === b.activeFighter);

  document.querySelectorAll('.arcade-btn').forEach(btn => {
    btn.disabled = !canControlBattle;
  });
}

function showToast(text) {
  const toast = document.getElementById('toast-banner');
  toast.innerText = text;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 1100);
}

function declareWinner(pIdx) {
  SFX.win();
  document.getElementById('winner-title').innerText = `${state.players[pIdx].name} WINS!`;
  document.getElementById('winner-modal').classList.remove('hidden');
}

renderAll();
