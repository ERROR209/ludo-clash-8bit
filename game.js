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
  placeTrap: () => { playTone(380, 'square', 0.07); playTone(520, 'square', 0.09, 0.05); },
  powerUp: () => { [523, 659, 784, 1046].forEach((f, i) => playTone(f, 'square', 0.1, i * 0.06, 0.15)); },
  bomb: () => { [220, 150, 95, 65].forEach((f, i) => playTone(f, 'sawtooth', 0.16, i * 0.07, 0.2)); },
  battleStart: () => {
    [220, 261, 329, 440, 392, 523, 659].forEach((f, i) => playTone(f, 'square', 0.09, i * 0.065, 0.13));
  },
  slash: () => {
    playTone(600, 'square', 0.05, 0, 0.14);
    playTone(150, 'sawtooth', 0.18, 0.04, 0.16);
  },
  smash: () => {
    playTone(110, 'sawtooth', 0.25, 0, 0.2);
    playTone(75, 'square', 0.28, 0.05, 0.2);
  },
  ult: () => {
    [330, 440, 554, 659, 880, 140, 90].forEach((f, i) => playTone(f, 'sawtooth', 0.14, i * 0.05, 0.22));
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
// 2. BOARD GEOMETRY, CLASSES & TILE POOL
// ==========================================
const COLORS = ['#dc2626', '#16a34a', '#eab308', '#2563eb'];
const LIGHT_COLORS = ['#fca5a5', '#86efac', '#fef08a', '#93c5fd'];
const COLOR_NAMES = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

const WARRIOR_CLASSES = [
  { name: 'KNIGHT',  hp: 105, atk: 0, heal: 18, ultName: 'DRAGON SLASH' },
  { name: 'NINJA',   hp: 100, atk: 5, heal: 16, ultName: 'SHADOW STORM' },
  { name: 'PALADIN', hp: 120, atk: -2,heal: 20, ultName: 'HOLY HAMMER' },
  { name: 'WIZARD',  hp: 95,  atk: 4, heal: 26, ultName: 'METEOR BLAST' }
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
const INITIAL_SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

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

function generateRandomHiddenTiles(existingMap = {}) {
  const candidates = [];
  for (let i = 0; i < 52; i++) {
    if (!INITIAL_SAFE_INDICES.includes(i) && !existingMap[i]) candidates.push(i);
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const map = { ...existingMap };
  candidates.slice(0, 8).forEach((trackIdx, i) => {
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
  turnCount: 1,
  dice: 1,
  phase: 'ROLL', // 'PLACE_TRAPS', 'MEMORIZE', 'ROLL', 'SELECT', 'ANIM', 'BATTLE'
  memorySeconds: 5,
  safeIndices: [...INITIAL_SAFE_INDICES],
  hiddenTiles: {},
  mysteryChestIdx: -1,
  suddenDeathEnabled: true,
  trapPlacingSeat: 0,
  trapsLeftToPlace: 0,
  battle: null
};

function createInitialState(playerConfigs, optTraps, optSuddenDeath) {
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
        kills: 0, // Kill-Evolution counter (0 = LVL 1, 1 = LVL 2, 2+ = LVL 3 BOSS)
        shield: false,
        rage: false
      }))
    })),
    turn: 0,
    turnCount: 1,
    dice: 1,
    phase: optTraps ? 'PLACE_TRAPS' : 'MEMORIZE',
    memorySeconds: 5,
    safeIndices: [...INITIAL_SAFE_INDICES],
    hiddenTiles: {},
    mysteryChestIdx: -1,
    suddenDeathEnabled: optSuddenDeath,
    trapPlacingSeat: 0,
    trapsLeftToPlace: 2,
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

  peer = new Peer('LUDOULTIMATE-' + code);
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
    hostConn = peer.connect('LUDOULTIMATE-' + code);
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
        if (state.phase === 'BATTLE' && !wasBattle) {
          SFX.battleStart();
          startBattleCanvasLoop();
        }
        renderAll();
      } else if (data.type === 'BATTLE_FX') {
        applyRemoteBattleFX(data.fx);
      } else if (data.type === 'EMOTE') {
        displayEmoteBubble(data.seat, data.emoji);
      }
    });
  });
}

function launchOnlineMatch() {
  const members = window._lobbyMembers || [{ seat: 0, name: 'Host' }];
  const configs = [0, 1, 2, 3].map(seat => {
    const found = members.find(m => m.seat === seat);
    return { name: found ? found.name : `CPU ${seat+1}`, isBot: !found, active: true };
  });
  const optTraps = document.getElementById('opt-trap-placer').checked;
  const optSD = document.getElementById('opt-sudden-death').checked;
  gameMode = 'online';
  state = createInitialState(configs, optTraps, optSD);
  switchToGameScreen();
  beginMatchFlow();
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
  if (data.action === 'PLACE_TRAP' && state.phase === 'PLACE_TRAPS' && state.trapPlacingSeat === seat) {
    placeSecretTrapAt(seat, data.trackIdx);
  } else if (data.action === 'ROLL' && state.turn === seat && state.phase === 'ROLL') {
    executeRoll();
  } else if (data.action === 'MOVE' && state.turn === seat && state.phase === 'SELECT') {
    executeTokenMove(seat, data.tokenId);
  } else if (data.action === 'BATTLE_MOVE' && state.phase === 'BATTLE') {
    processBattleInput(seat, data.move);
  } else if (data.action === 'EMOTE') {
    displayEmoteBubble(seat, data.emoji);
    connections.forEach(c => { if (c.open) c.send({ type: 'EMOTE', seat, emoji: data.emoji }); });
  }
}

// ==========================================
// 5. LOCAL START, TRAP PLACER & MEMORY TIMER
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

  const optTraps = document.getElementById('opt-trap-placer').checked;
  const optSD = document.getElementById('opt-sudden-death').checked;
  state = createInitialState(configs, optTraps, optSD);
  switchToGameScreen();
  beginMatchFlow();
}

function switchToGameScreen() {
  document.getElementById('menu-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
}

function beginMatchFlow() {
  if (state.phase === 'PLACE_TRAPS') {
    state.trapPlacingSeat = 0;
    state.trapsLeftToPlace = 2;
    renderAll();
    broadcastState();
    autoPlaceBotTrapsIfNeeded();
  } else {
    state.hiddenTiles = generateRandomHiddenTiles({});
    startMemoryCountdown();
  }
}

function placeSecretTrapAt(seat, trackIdx) {
  if (state.phase !== 'PLACE_TRAPS' || state.trapPlacingSeat !== seat) return;
  if (INITIAL_SAFE_INDICES.includes(trackIdx) || state.hiddenTiles[trackIdx]) return;

  // Alternate between Bomb (-3) and Warp (Back to Start)
  const trapObj = (state.trapsLeftToPlace === 2)
    ? { type: 'bomb', icon: '💣', label: 'PLAYER BOMB -3!', bg: '#fed7aa', revealed: true, used: false, owner: seat }
    : { type: 'warp', icon: '🌀', label: 'PLAYER WARP TRAP!', bg: '#e9d5ff', revealed: true, used: false, owner: seat };

  state.hiddenTiles[trackIdx] = trapObj;
  state.trapsLeftToPlace -= 1;
  SFX.placeTrap();

  if (state.trapsLeftToPlace <= 0) {
    // Move to next active player
    let nextSeat = seat + 1;
    while (nextSeat < 4 && !state.players[nextSeat].active) nextSeat++;

    if (nextSeat >= 4) {
      // All players placed traps! Add random power-ups & start 5s Memory Scan!
      state.hiddenTiles = generateRandomHiddenTiles(state.hiddenTiles);
      startMemoryCountdown();
      return;
    } else {
      state.trapPlacingSeat = nextSeat;
      state.trapsLeftToPlace = 2;
    }
  }

  renderAll();
  broadcastState();
  autoPlaceBotTrapsIfNeeded();
}

function autoPlaceBotTrapsIfNeeded() {
  if (!isHost || state.phase !== 'PLACE_TRAPS') return;
  const seat = state.trapPlacingSeat;
  if (state.players[seat] && state.players[seat].isBot) {
    setTimeout(() => {
      if (state.phase !== 'PLACE_TRAPS' || state.trapPlacingSeat !== seat) return;
      let tries = 0;
      while (tries < 60) {
        const idx = Math.floor(Math.random() * 52);
        if (!INITIAL_SAFE_INDICES.includes(idx) && !state.hiddenTiles[idx]) {
          placeSecretTrapAt(seat, idx);
          break;
        }
        tries++;
      }
    }, 350);
  }
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
      Object.values(state.hiddenTiles).forEach(tile => { tile.revealed = false; });
      SFX.safe();
      state.phase = 'ROLL';
      showToast('🤫 TILES HIDDEN! ROLL DICE!');
      renderAll();
      broadcastState();
    }
  }, 1000);
}

// ==========================================
// 6. LIVE EMOTES
// ==========================================
function sendEmote(emoji) {
  const senderSeat = (gameMode === 'local') ? state.turn : mySeat;
  if (gameMode === 'online' && !isHost) {
    sendActionToHost({ action: 'EMOTE', emoji });
  } else {
    displayEmoteBubble(senderSeat, emoji);
    if (gameMode === 'online' && isHost) {
      connections.forEach(c => { if (c.open) c.send({ type: 'EMOTE', seat: senderSeat, emoji }); });
    }
  }
}

function displayEmoteBubble(seat, emoji) {
  const el = document.getElementById(`emote-${seat}`);
  if (!el) return;
  el.innerText = emoji;
  el.classList.remove('hidden');
  playTone(680, 'sine', 0.08, 0, 0.08);
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 2000);
}

// ==========================================
// 7. 3D DICE, MYSTERY CHESTS & SUDDEN DEATH
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
    if (gIdx !== -1 && !state.safeIndices.includes(gIdx) && findEnemyAtGlobalIndex(pIdx, gIdx)) {
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
    state.turnCount += 1;
    handleWorldEvents();
  }
  state.phase = 'ROLL';
  renderAll();
  broadcastState();

  if (isHost && state.players[state.turn].isBot) {
    setTimeout(executeRoll, 700);
  }
}

function handleWorldEvents() {
  // Spawn Mystery Chest every 6 turns
  if (state.turnCount % 6 === 0 && state.mysteryChestIdx === -1) {
    const idx = Math.floor(Math.random() * 52);
    if (!state.safeIndices.includes(idx)) {
      state.mysteryChestIdx = idx;
      showToast('🎁 MYSTERY CHEST SPAWNED!');
    }
  }

  // Sudden Death: Remove Safe Stars starting Turn 20!
  if (state.suddenDeathEnabled && state.turnCount >= 20 && state.turnCount % 4 === 0) {
    if (state.safeIndices.length > 0) {
      state.safeIndices.pop();
      SFX.bomb();
      showToast('⚠️ SUDDEN DEATH: SAFE STAR LOST!');
    }
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

  const gIdx = getGlobalTrackIndex(pIdx, token.steps);

  // Check Mystery Chest Pickup
  if (gIdx !== -1 && gIdx === state.mysteryChestIdx) {
    state.mysteryChestIdx = -1;
    SFX.powerUp();
    token.shield = true;
    token.rage = true;
    showToast('🎁 CHEST: SHIELD + RAGE + BONUS ROLL!');
    renderAll();
    broadcastState();
    setTimeout(() => nextTurn(true), 800);
    return;
  }

  // Check Hidden Trap or Power-Up Tile
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
      token.steps = 0;
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
    if (state.safeIndices.includes(gIdx)) {
      SFX.safe();
    } else {
      const enemy = findEnemyAtGlobalIndex(pIdx, gIdx);
      if (enemy) {
        if (enemy.token.shield) {
          enemy.token.shield = false;
          SFX.guard();
          showToast('🛡️ AEGIS SHIELD BLOCKED!');
          token.steps = -1;
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
// 8. 8-BIT BATTLE (KILL-EVOLUTION + RAGE ULT + COUNTER-CRIT)
// ==========================================
let battleAnimId = null;
let battleVisual = {
  tick: 0,
  atkOffsetX: 0,
  defOffsetX: 0,
  atkFlash: 0,
  defFlash: 0,
  ultFlash: 0,
  sparks: [],
  floatingText: null
};

function startEightBitBattle(atkP, atkT, defP, defT) {
  SFX.battleStart();
  const aToken = state.players[atkP].tokens[atkT];
  const dToken = state.players[defP].tokens[defT];
  const aClass = WARRIOR_CLASSES[aToken.role];
  const dClass = WARRIOR_CLASSES[dToken.role];

  // Kill-Evolution Stat Scaling!
  const aLvlBonusHp = Math.min(2, aToken.kills) * 25;
  const dLvlBonusHp = Math.min(2, dToken.kills) * 25;

  const atkMax = aClass.hp + 10 + aLvlBonusHp;
  const defMax = dClass.hp + dLvlBonusHp;

  state.phase = 'BATTLE';
  state.battle = {
    atkP, atkT, defP, defT,
    atkHp: atkMax, atkMax,
    defHp: defMax, defMax,
    atkRageMeter: aToken.rage ? 50 : 0,
    defRageMeter: dToken.rage ? 50 : 0,
    atkRageBuff: aToken.rage,
    defRageBuff: dToken.rage,
    atkCounterReady: false,
    defCounterReady: false,
    activeFighter: atkP,
    atkGuard: false,
    defGuard: false,
    log: `${COLOR_NAMES[atkP]} LVL${Math.min(3, aToken.kills+1)} vs ${COLOR_NAMES[defP]} LVL${Math.min(3, dToken.kills+1)}!`
  };

  aToken.rage = false;
  dToken.rage = false;

  battleVisual = { tick: 0, atkOffsetX: 0, defOffsetX: 0, atkFlash: 0, defFlash: 0, ultFlash: 0, sparks: [], floatingText: null };
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
    battleVisual.atkOffsetX = 72;
    setTimeout(() => { battleVisual.atkOffsetX = 0; }, 250);
  } else if (fx.dash === 'def') {
    battleVisual.defOffsetX = -72;
    setTimeout(() => { battleVisual.defOffsetX = 0; }, 250);
  }
  if (fx.flash === 'def') battleVisual.defFlash = 10;
  if (fx.flash === 'atk') battleVisual.atkFlash = 10;
  if (fx.ultFlash) battleVisual.ultFlash = 12;
  if (fx.sparks) spawnHitSparks(fx.sparks.x, fx.sparks.y, fx.sparks.color, fx.sparks.count || 14);
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
  const lvlAtkBonus = (actorToken.kills >= 2) ? 10 : (actorToken.kills === 1 ? 5 : 0);
  const rageBuffBonus = (isAtkTurn ? b.atkRageBuff : b.defRageBuff) ? 15 : 0;

  let fx = { dash: isAtkTurn ? 'atk' : 'def' };
  if (isAtkTurn) battleVisual.atkOffsetX = 72;
  else battleVisual.defOffsetX = -72;
  setTimeout(() => {
    battleVisual.atkOffsetX = 0;
    battleVisual.defOffsetX = 0;
  }, 250);

  let msg = '';

  if (move === 'ult') {
    const curRage = isAtkTurn ? b.atkRageMeter : b.defRageMeter;
    if (curRage < 100) return;

    if (isAtkTurn) b.atkRageMeter = 0; else b.defRageMeter = 0;
    let dmg = 75 + lvlAtkBonus + rageBuffBonus;
    if (isAtkTurn && b.defGuard) { dmg = Math.floor(dmg * 0.5); b.defGuard = false; }
    if (!isAtkTurn && b.atkGuard) { dmg = Math.floor(dmg * 0.5); b.atkGuard = false; }

    battleVisual.ultFlash = 12;
    fx.ultFlash = true;
    fx.sfx = 'ult';
    fx.shake = true;
    SFX.ult();
    triggerArenaShake();

    if (isAtkTurn) {
      b.defHp = Math.max(0, b.defHp - dmg);
      battleVisual.defFlash = 12;
      spawnHitSparks(225, 95, '#facc15', 28);
      spawnFloatingText(`ULT -${dmg}!`, 225, 55, '#facc15');
      fx.flash = 'def';
      fx.sparks = { x: 225, y: 95, color: '#facc15', count: 28 };
      fx.float = { text: `ULT -${dmg}!`, x: 225, y: 55, color: '#facc15' };
    } else {
      b.atkHp = Math.max(0, b.atkHp - dmg);
      battleVisual.atkFlash = 12;
      spawnHitSparks(95, 95, '#facc15', 28);
      spawnFloatingText(`ULT -${dmg}!`, 95, 55, '#facc15');
      fx.flash = 'atk';
      fx.sparks = { x: 95, y: 95, color: '#facc15', count: 28 };
      fx.float = { text: `ULT -${dmg}!`, x: 95, y: 55, color: '#facc15' };
    }
    msg = `🔥 ${wClass.ultName}! ${dmg} ULTIMATE DMG!`;

  } else if (move === 'slash' || move === 'smash') {
    const isSmash = (move === 'smash');
    if (isSmash && Math.random() < 0.30) {
      SFX.miss();
      fx.sfx = 'miss';
      msg = `${COLOR_NAMES[seat]} used HEAVY HIT... MISSED!`;
      const tx = isAtkTurn ? 225 : 95;
      spawnFloatingText('MISS!', tx, 65, '#facc15');
      fx.float = { text: 'MISS!', x: tx, y: 65, color: '#facc15' };
      if (isAtkTurn) { b.defGuard = false; b.atkCounterReady = false; }
      else { b.atkGuard = false; b.defCounterReady = false; }
    } else {
      let dmg = isSmash
        ? 50 + Math.floor(Math.random() * 11) + wClass.atk + lvlAtkBonus + rageBuffBonus
        : 26 + Math.floor(Math.random() * 9) + wClass.atk + lvlAtkBonus + rageBuffBonus;

      // Guard Counter-Crit Bonus on Slash!
      let isCounter = false;
      if (!isSmash && isAtkTurn && b.atkCounterReady) {
        dmg = Math.floor(dmg * 1.5);
        b.atkCounterReady = false;
        isCounter = true;
      } else if (!isSmash && !isAtkTurn && b.defCounterReady) {
        dmg = Math.floor(dmg * 1.5);
        b.defCounterReady = false;
        isCounter = true;
      }

      // Check Enemy Guard & Trigger Enemy Counter-Crit!
      if (isAtkTurn && b.defGuard) {
        dmg = Math.floor(dmg * 0.3);
        b.defGuard = false;
        b.defCounterReady = true;
      } else if (!isAtkTurn && b.atkGuard) {
        dmg = Math.floor(dmg * 0.3);
        b.atkGuard = false;
        b.atkCounterReady = true;
      }

      // Build Limit Break Rage Meters (+35% attacker, +45% defender)
      if (isAtkTurn) {
        b.defHp = Math.max(0, b.defHp - dmg);
        b.atkRageMeter = Math.min(100, b.atkRageMeter + 35);
        b.defRageMeter = Math.min(100, b.defRageMeter + 45);
        battleVisual.defFlash = 10;
        spawnHitSparks(225, 100, COLORS[seat], 14);
        spawnFloatingText(isCounter ? `COUNTER -${dmg}!` : `-${dmg}`, 225, 60, isCounter ? '#38bdf8' : '#ef4444');
        fx.flash = 'def';
        fx.sparks = { x: 225, y: 100, color: COLORS[seat], count: 14 };
        fx.float = { text: isCounter ? `COUNTER -${dmg}!` : `-${dmg}`, x: 225, y: 60, color: isCounter ? '#38bdf8' : '#ef4444' };
      } else {
        b.atkHp = Math.max(0, b.atkHp - dmg);
        b.defRageMeter = Math.min(100, b.defRageMeter + 35);
        b.atkRageMeter = Math.min(100, b.atkRageMeter + 45);
        battleVisual.atkFlash = 10;
        spawnHitSparks(95, 100, COLORS[seat], 14);
        spawnFloatingText(isCounter ? `COUNTER -${dmg}!` : `-${dmg}`, 95, 60, isCounter ? '#38bdf8' : '#ef4444');
        fx.flash = 'atk';
        fx.sparks = { x: 95, y: 100, color: COLORS[seat], count: 14 };
        fx.float = { text: isCounter ? `COUNTER -${dmg}!` : `-${dmg}`, x: 95, y: 60, color: isCounter ? '#38bdf8' : '#ef4444' };
      }

      isSmash ? SFX.smash() : SFX.slash();
      fx.sfx = isSmash ? 'smash' : 'slash';
      fx.shake = true;
      msg = isCounter
        ? `⚡ COUNTER-CRIT! ${COLOR_NAMES[seat]} dealt ${dmg} DMG!`
        : (isSmash ? `💥 CRITICAL HIT! ${dmg} DMG!` : `${COLOR_NAMES[seat]} slashed for ${dmg} DMG!`);
      triggerArenaShake();
    }
  } else if (move === 'guard') {
    SFX.guard();
    fx.sfx = 'guard';
    if (isAtkTurn) {
      b.atkGuard = true;
      b.atkHp = Math.min(b.atkMax, b.atkHp + wClass.heal);
      b.atkRageMeter = Math.min(100, b.atkRageMeter + 20);
      spawnFloatingText(`+${wClass.heal} HP`, 95, 60, '#4ade80');
      fx.float = { text: `+${wClass.heal} HP`, x: 95, y: 60, color: '#4ade80' };
    } else {
      b.defGuard = true;
      b.defHp = Math.min(b.defMax, b.defHp + wClass.heal);
      b.defRageMeter = Math.min(100, b.defRageMeter + 20);
      spawnFloatingText(`+${wClass.heal} HP`, 225, 60, '#4ade80');
      fx.float = { text: `+${wClass.heal} HP`, x: 225, y: 60, color: '#4ade80' };
    }
    msg = `${COLOR_NAMES[seat]} raised GUARD (+${wClass.heal} HP)!`;
  }

  b.log = msg;
  broadcastBattleFX(fx);

  // Check K.O. & Kill-Evolution Level Up!
  if (b.defHp <= 0 || b.atkHp <= 0) {
    const attackerWon = (b.defHp <= 0);
    const winnerToken = attackerWon
      ? state.players[b.atkP].tokens[b.atkT]
      : state.players[b.defP].tokens[b.defT];
    winnerToken.kills += 1;
    const newLvl = Math.min(3, winnerToken.kills + 1);

    b.log = attackerWon
      ? `K.O.! ${COLOR_NAMES[b.atkP]} EVOLVED TO LVL ${newLvl}!`
      : `K.O.! ${COLOR_NAMES[b.defP]} DEFENDED & EVOLVED TO LVL ${newLvl}!`;
    renderAll();
    broadcastState();

    setTimeout(() => {
      stopBattleCanvasLoop();
      if (attackerWon) {
        const loser = state.players[b.defP].tokens[b.defT];
        loser.steps = -1;
        loser.kills = 0; // Reset loser evolution on death
        state.battle = null;
        nextTurn(true);
      } else {
        const loser = state.players[b.atkP].tokens[b.atkT];
        loser.steps = -1;
        loser.kills = 0;
        state.battle = null;
        nextTurn(false);
      }
    }, 1500);
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
      const b = state.battle;
      const isAtk = (activeP === b.atkP);
      const rage = isAtk ? b.atkRageMeter : b.defRageMeter;
      if (rage >= 100) {
        processBattleInput(activeP, 'ult');
        return;
      }
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
// 9. PIXEL-ART WARRIOR RENDERER (WITH EVOLUTION)
// ==========================================
const bCanvas = document.getElementById('battle-canvas');
const bCtx = bCanvas.getContext('2d');

function spawnHitSparks(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    battleVisual.sparks.push({
      x, y,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.8) * 8,
      color: i % 2 === 0 ? '#facc15' : color,
      life: 18
    });
  }
}

function spawnFloatingText(text, x, y, color) {
  battleVisual.floatingText = { text, x, y, color, life: 30 };
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
  bCtx.fillRect(0, 0, 320, 165);

  bCtx.fillStyle = '#312e81';
  for (let i = 0; i < 320; i += 32) {
    bCtx.fillRect(i + 4, 28, 16, 92);
  }

  bCtx.fillStyle = '#374151';
  bCtx.fillRect(0, 118, 320, 47);
  bCtx.fillStyle = '#facc15';
  bCtx.fillRect(0, 118, 320, 4);

  bCtx.fillStyle = '#1f2937';
  for (let x = 0; x < 320; x += 20) {
    bCtx.fillRect(x, 128, 10, 10);
    bCtx.fillRect(x + 10, 144, 10, 10);
  }

  const bob = Math.sin(battleVisual.tick * 0.15) * 2;

  const aToken = state.players[b.atkP].tokens[b.atkT];
  if (battleVisual.atkFlash > 0) battleVisual.atkFlash--;
  if (battleVisual.atkFlash % 2 === 0) {
    drawPixelWarrior(85 + battleVisual.atkOffsetX, 114 + bob, COLORS[b.atkP], LIGHT_COLORS[b.atkP], aToken, true, b.atkGuard, b.atkRageBuff);
  }

  const dToken = state.players[b.defP].tokens[b.defT];
  if (battleVisual.defFlash > 0) battleVisual.defFlash--;
  if (battleVisual.defFlash % 2 === 0) {
    drawPixelWarrior(235 + battleVisual.defOffsetX, 114 - bob, COLORS[b.defP], LIGHT_COLORS[b.defP], dToken, false, b.defGuard, b.defRageBuff);
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
    bCtx.font = 'bold 11px "Press Start 2P", monospace';
    bCtx.textAlign = 'center';
    bCtx.fillStyle = '#000';
    bCtx.fillText(ft.text, ft.x + 2, ft.y + 2);
    bCtx.fillStyle = ft.color;
    bCtx.fillText(ft.text, ft.x, ft.y);
    ft.y -= 0.7;
    ft.life--;
    if (ft.life <= 0) battleVisual.floatingText = null;
  }

  // Ultimate Screen Flash
  if (battleVisual.ultFlash > 0) {
    bCtx.fillStyle = `rgba(254, 240, 138, ${battleVisual.ultFlash / 16})`;
    bCtx.fillRect(0, 0, 320, 165);
    battleVisual.ultFlash--;
  }
}

function drawPixelWarrior(cx, footY, mainColor, trimColor, token, facingRight, hasGuard, hasRage) {
  const P = 4;
  const x0 = Math.round(cx);
  const y0 = Math.round(footY);
  const roleIdx = token.role;
  const kills = token.kills || 0;

  const px = (gx, gy, w, h, col) => {
    bCtx.fillStyle = col;
    const drawX = facingRight ? (x0 + gx * P) : (x0 - (gx + w) * P);
    bCtx.fillRect(drawX, y0 + gy * P, w * P, h * P);
  };

  // LVL 3 Boss Flame Aura
  if (kills >= 2) {
    bCtx.fillStyle = 'rgba(250, 204, 21, 0.35)';
    bCtx.fillRect(x0 - 26, y0 - 76, 52, 76);
  }

  bCtx.fillStyle = 'rgba(0,0,0,0.45)';
  bCtx.fillRect(x0 - 18, y0 - 2, 36, 5);

  px(-4, -2, 3, 2, '#111827');
  px(1,  -2, 3, 2, '#111827');

  // Armor (Golden Chestplate if LVL 2+)
  px(-4, -7, 8, 5, mainColor);
  px(-2, -6, 4, 3, kills >= 1 ? '#facc15' : trimColor);
  px(-6, -7, 2, 6, kills >= 2 ? '#facc15' : '#1e293b');

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

  // Floating Golden Crown above head if Evolved (LVL 2+)
  if (kills >= 1) {
    px(-3, -20, 6, 2, '#facc15');
    px(-3, -21, 1, 1, '#facc15');
    px(0,  -21, 1, 1, '#facc15');
    px(2,  -21, 1, 1, '#facc15');
  }

  if (roleIdx === 3) {
    px(5, -13, 2, 12, '#92400e');
    px(4, -15, 4, 3, '#38bdf8');
  } else {
    px(5, -6, 3, 2, '#facc15');
    px(7, -12, 2, 7, (hasRage || kills >= 2) ? '#ef4444' : '#f8fafc');
    px(7, -14, 2, 2, '#facc15');
  }

  if (hasGuard) {
    bCtx.strokeStyle = '#38bdf8';
    bCtx.lineWidth = 3;
    bCtx.strokeRect(x0 - 24, y0 - 74, 48, 76);
  }
}

// ==========================================
// 10. LUDO KING CANVAS BOARD & GLOSSY PINS
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

  // Active Safe Stars (shrinks in Sudden Death!)
  (state.safeIndices || []).forEach(idx => {
    const [gx, gy] = MAIN_TRACK[idx];
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = [0, 13, 26, 39].includes(idx) ? '#ffffff' : '#64748b';
    ctx.fillText('★', gx * CELL + CELL / 2, gy * CELL + CELL / 2 + 1);
  });

  // Hidden Tiles (visible during PLACE_TRAPS, 5s MEMORIZE, or when triggered)
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

  // Mystery Chest Drop
  if (state.mysteryChestIdx !== -1 && MAIN_TRACK[state.mysteryChestIdx]) {
    const [cx, cy] = MAIN_TRACK[state.mysteryChestIdx];
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx * CELL + 2, cy * CELL + 2, CELL - 4, CELL - 4);
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎁', cx * CELL + CELL / 2, cy * CELL + CELL / 2 + 1);
  }

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

      if (t.shield) {
        ctx.beginPath();
        ctx.arc(x, y - 2, 17, 0, Math.PI * 2);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }

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
      ctx.strokeStyle = (t.kills >= 1) ? '#facc15' : '#ffffff';
      ctx.stroke();

      // Evolution Crown Badge on Evolved Tokens!
      if (t.kills >= 1) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(t.kills >= 2 ? '👑' : '⭐', x, y - 2);
      } else {
        ctx.beginPath();
        ctx.arc(x, y - 2, 5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[pIdx];
        ctx.fill();
      }
    });
  });
}

// Board Click: Handles Trap Placement OR Token Selection
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (600 / rect.width);
  const clickY = (e.clientY - rect.top) * (600 / rect.height);

  // 1. Secret Trap Placement Click
  if (state.phase === 'PLACE_TRAPS') {
    const canPlace = (gameMode === 'local') || (mySeat === state.trapPlacingSeat);
    if (!canPlace) return;
    const gx = Math.floor(clickX / CELL);
    const gy = Math.floor(clickY / CELL);
    const trackIdx = MAIN_TRACK.findIndex(([tx, ty]) => tx === gx && ty === gy);
    if (trackIdx !== -1) {
      if (gameMode === 'online' && !isHost) {
        sendActionToHost({ action: 'PLACE_TRAP', trackIdx });
      } else {
        placeSecretTrapAt(state.trapPlacingSeat, trackIdx);
      }
    }
    return;
  }

  // 2. Token Selection Click
  if (state.phase !== 'SELECT' || !canIControlCurrentTurn()) return;
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
  const memBanner = document.getElementById('memory-banner');
  if (state.phase === 'PLACE_TRAPS') {
    memBanner.classList.remove('hidden');
    const pName = state.players[state.trapPlacingSeat]?.name || 'PLAYER';
    memBanner.innerText = `💣 ${pName}: TAP ${state.trapsLeftToPlace} TRACK TILES!`;
  } else if (state.phase === 'MEMORIZE') {
    memBanner.classList.remove('hidden');
    memBanner.innerText = `👁️ MEMORIZE ALL TILES! ${state.memorySeconds}s`;
  } else {
    memBanner.classList.add('hidden');
  }

  document.getElementById('turn-counter-pill').innerText = `T${state.turnCount}`;

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
    const killsCount = p.tokens.reduce((acc, t) => acc + t.kills, 0);
    document.getElementById(`pscore-${idx}`).innerText = `🏠${homeCount}/4 | ⚔️${killsCount}`;
  });

  const curP = state.players[state.turn];
  document.getElementById('turn-indicator').innerText = `${curP.name}'S TURN`;

  const cube = document.getElementById('cube-dice');
  cube.className = `cube show-${state.dice}`;

  const hint = document.getElementById('action-hint');
  if (state.phase === 'PLACE_TRAPS') hint.innerText = 'HIDE TRAPS!';
  else if (state.phase === 'MEMORIZE') hint.innerText = 'MEMORIZE!';
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
  const aToken = state.players[b.atkP].tokens[b.atkT];
  const dToken = state.players[b.defP].tokens[b.defT];
  const aClass = WARRIOR_CLASSES[aToken.role];
  const dClass = WARRIOR_CLASSES[dToken.role];

  const isParticipant = (gameMode === 'local') || (mySeat === b.atkP || mySeat === b.defP);
  document.getElementById('battle-header-text').innerText =
    isParticipant ? '★ 8-BIT CLASH ARENA ★' : '👁️ LIVE SPECTATING CLASH 👁️';

  document.getElementById('atk-name').innerText = `${COLOR_NAMES[b.atkP]} L${Math.min(3, aToken.kills+1)}`;
  document.getElementById('atk-hp-bar').style.width = `${(b.atkHp / b.atkMax) * 100}%`;
  document.getElementById('atk-rage-bar').style.width = `${b.atkRageMeter}%`;
  document.getElementById('atk-hp-text').innerText = `HP ${b.atkHp} | RAGE ${b.atkRageMeter}%`;

  document.getElementById('def-name').innerText = `${COLOR_NAMES[b.defP]} L${Math.min(3, dToken.kills+1)}`;
  document.getElementById('def-hp-bar').style.width = `${(b.defHp / b.defMax) * 100}%`;
  document.getElementById('def-rage-bar').style.width = `${b.defRageMeter}%`;
  document.getElementById('def-hp-text').innerText = `HP ${b.defHp} | RAGE ${b.defRageMeter}%`;

  document.getElementById('battle-log').innerText = b.log;

  const activePlayerObj = state.players[b.activeFighter];
  const canControlBattle = !activePlayerObj.isBot &&
    (gameMode === 'local' || mySeat === b.activeFighter);

  const isAtkActive = (b.activeFighter === b.atkP);
  const myRage = isAtkActive ? b.atkRageMeter : b.defRageMeter;
  const myCounter = isAtkActive ? b.atkCounterReady : b.defCounterReady;
  const activeClass = isAtkActive ? aClass : dClass;

  document.getElementById('slash-label').innerText = myCounter ? '⚡ COUNTER!' : '⚔️ SLASH';
  document.getElementById('ult-sub').innerText = myRage >= 100 ? activeClass.ultName : `${myRage}% RAGE`;

  document.querySelectorAll('.arcade-btn').forEach(btn => {
    if (btn.id === 'btn-ult') {
      btn.disabled = !canControlBattle || (myRage < 100);
    } else {
      btn.disabled = !canControlBattle;
    }
  });
}

function showToast(text) {
  const toast = document.getElementById('toast-banner');
  toast.innerText = text;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 1150);
}

function declareWinner(pIdx) {
  SFX.win();
  document.getElementById('winner-title').innerText = `${state.players[pIdx].name} WINS!`;
  document.getElementById('winner-modal').classList.remove('hidden');
}

renderAll();
