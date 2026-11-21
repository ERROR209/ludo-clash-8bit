// ==========================================
// 1. 8-BIT WEB AUDIO SYNTHESIZER (NO MP3s!)
// ==========================================
let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type = 'square', duration = 0.12, delay = 0) {
  if (!soundEnabled) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
}

const SFX = {
  dice: () => { [300, 450, 600, 750].forEach((f, i) => playTone(f, 'square', 0.05, i * 0.04)); },
  step: () => playTone(520, 'triangle', 0.06),
  power: () => { [523, 659, 784, 1046].forEach((f, i) => playTone(f, 'square', 0.09, i * 0.06)); },
  trap: () => { [300, 220, 150].forEach((f, i) => playTone(f, 'sawtooth', 0.12, i * 0.08)); },
  battleStart: () => { [220, 277, 330, 440, 330, 554].forEach((f, i) => playTone(f, 'square', 0.1, i * 0.07)); },
  hit: () => { playTone(140, 'sawtooth', 0.18); playTone(90, 'square', 0.2, 0.05); },
  miss: () => { playTone(400, 'triangle', 0.1); playTone(250, 'triangle', 0.15, 0.08); },
  guard: () => { [440, 660].forEach((f, i) => playTone(f, 'sine', 0.12, i * 0.07)); },
  win: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => playTone(f, 'square', 0.14, i * 0.1)); }
};

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-btn').innerText = soundEnabled ? '🔊' : '🔇';
}

// ==========================================
// 2. BOARD GEOMETRY & 8-BIT SPECIAL TILES
// ==========================================
const COLORS = ['#ef476f', '#06d6a0', '#ffd166', '#4cc9f0']; // 0:Red, 1:Green, 2:Yellow, 3:Blue
const COLOR_NAMES = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
const ROLES = [
  { name: 'KNIGHT', icon: '🗡️', hp: 105, atk: 0, heal: 15 },
  { name: 'RANGER', icon: '🏹', hp: 100, atk: 5, heal: 15 },
  { name: 'TANK',   icon: '🛡️', hp: 125, atk: -2, heal: 15 },
  { name: 'MAGE',   icon: '⚡', hp: 95,  atk: 3, heal: 25 }
];

// 52 outer track coordinates (15x15 grid, 0-indexed)
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

// Special 8-bit Power/Trap Tiles on main track
const SPECIAL_TILES = {
  3:  { type: 'turbo',  icon: '⚡', label: 'TURBO +3!' },
  10: { type: 'rage',   icon: '⚔️', label: 'RAGE ATK UP!' },
  16: { type: 'shield', icon: '🛡️', label: 'AEGIS SHIELD!' },
  23: { type: 'trap',   icon: '💣', label: 'GLITCH TRAP -2!' },
  29: { type: 'turbo',  icon: '⚡', label: 'TURBO +3!' },
  36: { type: 'rage',   icon: '⚔️', label: 'RAGE ATK UP!' },
  42: { type: 'shield', icon: '🛡️', label: 'AEGIS SHIELD!' },
  49: { type: 'trap',   icon: '💣', label: 'GLITCH TRAP -2!' }
};

const HOME_STRETCH = [
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], // Red
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],     // Green
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],     // Yellow
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]  // Blue
];

const BASE_SPOTS = [
  [[2,11],[3,11],[2,12],[3,12]], // Red
  [[2,2],[3,2],[2,3],[3,3]],     // Green
  [[11,2],[12,2],[11,3],[12,3]], // Yellow
  [[11,11],[12,11],[11,12],[12,12]] // Blue
];

// ==========================================
// 3. GAME STATE & MULTIPLAYER SYNC
// ==========================================
let gameMode = 'bot'; // 'bot', 'local', 'online'
let mySeat = 0;       // Which color I control (in online mode)
let isHost = true;
let peer = null;
let connections = [];
let hostConn = null;

let state = {
  players: [],
  turn: 0,
  dice: 0,
  phase: 'ROLL', // 'ROLL', 'SELECT', 'BATTLE', 'ANIM'
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
        steps: -1, // -1 = base, 0..50 = track, 51..55 = home stretch, 56 = finished
        role: tIdx,
        shield: false,
        rage: false
      }))
    })),
    turn: 0,
    dice: 0,
    phase: 'ROLL',
    battle: null
  };
}

// ==========================================
// 4. LOBBY & PEERJS ONLINE SETUP
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
  document.getElementById('net-status').innerText = 'Creating 8-Bit Room...';

  peer = new Peer('LUDO8BIT-' + code);
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
    hostConn = peer.connect('LUDO8BIT-' + code);
    hostConn.on('open', () => {
      const myName = document.getElementById('player-name').value.trim() || 'Guest';
      hostConn.send({ type: 'HELLO', name: myName });
      document.getElementById('net-status').innerText = 'Connected! Waiting for host to start...';
    });

    hostConn.on('data', data => {
      if (data.type === 'WELCOME') {
        mySeat = data.seat;
      } else if (data.type === 'SYNC') {
        gameMode = 'online';
        state = data.state;
        switchToGameScreen();
        renderAll();
      }
    });
  });
}

function launchOnlineMatch() {
  const members = window._lobbyMembers || [{ seat: 0, name: 'Host' }];
  const configs = [0, 1, 2, 3].map(seat => {
    const found = members.find(m => m.seat === seat);
    return {
      name: found ? found.name : `BOT ${seat+1}`,
      isBot: !found,
      active: true
    };
  });
  gameMode = 'online';
  state = createInitialState(configs);
  switchToGameScreen();
  broadcastState();
  renderAll();
}

function broadcastState() {
  if (gameMode === 'online' && isHost) {
    connections.forEach(c => { if (c.open) c.send({ type: 'SYNC', state }); });
  }
}

function sendActionToHost(actionObj) {
  if (isHost) {
    handleRemoteAction(mySeat, actionObj);
  } else if (hostConn && hostConn.open) {
    hostConn.send({ type: 'ACTION', ...actionObj });
  }
}

function handleRemoteAction(seat, data) {
  if (data.action === 'ROLL' && state.turn === seat && state.phase === 'ROLL') {
    executeRoll();
  } else if (data.action === 'MOVE' && state.turn === seat && state.phase === 'SELECT') {
    executeTokenMove(seat, data.tokenId);
  } else if (data.action === 'BATTLE_MOVE' && state.phase === 'BATTLE') {
    processBattleInput(seat, data.move);
  }
}

// ==========================================
// 5. LOCAL / BOT START
// ==========================================
function startLocalGame(mode) {
  gameMode = mode;
  isHost = true;
  mySeat = 0;
  const p1 = document.getElementById('player-name').value.trim() || 'YOU';
  const configs = mode === 'bot'
    ? [
        { name: p1, isBot: false, active: true },
        { name: '8-BIT BOT', isBot: true, active: true },
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
  renderAll();
}

function switchToGameScreen() {
  document.getElementById('menu-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
}

// ==========================================
// 6. DICE & TURN ENGINE
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
  const diceBtn = document.getElementById('dice-btn');
  diceBtn.classList.add('rolling');
  state.phase = 'ANIM';

  setTimeout(() => {
    diceBtn.classList.remove('rolling');
    const roll = Math.floor(Math.random() * 6) + 1;
    state.dice = roll;

    const validTokens = getMovableTokens(state.turn, roll);
    if (validTokens.length === 0) {
      state.phase = 'ANIM';
      renderAll();
      broadcastState();
      showToast('NO VALID MOVE!');
      setTimeout(() => nextTurn(false), 900);
    } else if (validTokens.length === 1) {
      state.phase = 'SELECT';
      renderAll();
      broadcastState();
      setTimeout(() => executeTokenMove(state.turn, validTokens[0].id), 350);
    } else {
      state.phase = 'SELECT';
      renderAll();
      broadcastState();
      if (state.players[state.turn].isBot) {
        const pick = validTokens[Math.floor(Math.random() * validTokens.length)];
        setTimeout(() => executeTokenMove(state.turn, pick.id), 600);
      }
    }
  }, 320);
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
  state.dice = 0;
  renderAll();
  broadcastState();

  if (isHost && state.players[state.turn].isBot) {
    setTimeout(executeRoll, 750);
  }
}

// ==========================================
// 7. TOKEN MOVEMENT & SPECIAL TILES
// ==========================================
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
  SFX.step();

  if (token.steps === -1) {
    token.steps = 0;
  } else {
    token.steps += dice;
  }

  renderAll();
  broadcastState();

  setTimeout(() => {
    // Check Home Finish
    if (token.steps === 56) {
      SFX.power();
      showToast('🏠 TOKEN HOME! +1 ROLL');
      if (player.tokens.every(t => t.steps === 56)) {
        declareWinner(pIdx);
        return;
      }
      nextTurn(true);
      return;
    }

    // Check Special 8-Bit Tile
    const gIdx = getGlobalTrackIndex(pIdx, token.steps);
    if (gIdx !== -1 && SPECIAL_TILES[gIdx]) {
      const sp = SPECIAL_TILES[gIdx];
      showToast(`${sp.icon} ${sp.label}`);
      if (sp.type === 'turbo') {
        SFX.power();
        token.steps = Math.min(55, token.steps + 3);
      } else if (sp.type === 'rage') {
        SFX.power();
        token.rage = true;
      } else if (sp.type === 'shield') {
        SFX.power();
        token.shield = true;
      } else if (sp.type === 'trap') {
        SFX.trap();
        token.steps = Math.max(0, token.steps - 2);
      }
      renderAll();
      broadcastState();
    }

    // Check Collision / 8-Bit Battle
    const finalGIdx = getGlobalTrackIndex(pIdx, token.steps);
    if (finalGIdx !== -1 && !SAFE_TRACK_INDICES.includes(finalGIdx)) {
      const enemy = findEnemyAtGlobalIndex(pIdx, finalGIdx);
      if (enemy) {
        if (enemy.token.shield) {
          enemy.token.shield = false;
          SFX.guard();
          showToast('🛡️ SHIELD BLOCKED ATTACK!');
          token.steps = -1; // Attacker bounced back!
          renderAll();
          broadcastState();
          setTimeout(() => nextTurn(false), 900);
          return;
        }
        startEightBitBattle(pIdx, token.id, enemy.pIdx, enemy.token.id);
        return;
      }
    }

    nextTurn(dice === 6);
  }, 300);
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
// 8. 8-BIT MINI-BATTLE SYSTEM
// ==========================================
function startEightBitBattle(atkP, atkT, defP, defT) {
  SFX.battleStart();
  const aToken = state.players[atkP].tokens[atkT];
  const dToken = state.players[defP].tokens[defT];
  const aRole = ROLES[aToken.role];
  const dRole = ROLES[dToken.role];

  const atkMax = aRole.hp + 10; // Attacker initiative bonus
  const defMax = dRole.hp;

  state.phase = 'BATTLE';
  state.battle = {
    atkP, atkT, defP, defT,
    atkHp: atkMax, atkMax,
    defHp: defMax, defMax,
    atkRage: aToken.rage,
    defRage: dToken.rage,
    activeFighter: atkP, // Attacker strikes first
    atkGuard: false,
    defGuard: false,
    log: `${COLOR_NAMES[atkP]} (${aRole.name}) ambushed ${COLOR_NAMES[defP]} (${dRole.name})!`
  };

  // Consume one-time rage buff into battle
  aToken.rage = false;
  dToken.rage = false;

  renderAll();
  broadcastState();
  checkBotBattleTurn();
}

function submitBattleMove(move) {
  if (state.phase !== 'BATTLE' || !state.battle) return;
  const b = state.battle;
  if (gameMode === 'online' && !isHost) {
    if (mySeat === b.activeFighter) {
      sendActionToHost({ action: 'BATTLE_MOVE', move });
    }
    return;
  }
  if (gameMode === 'online' && mySeat !== b.activeFighter) return;
  processBattleInput(b.activeFighter, move);
}

function processBattleInput(seat, move) {
  const b = state.battle;
  if (!b || b.activeFighter !== seat) return;

  const isAtkTurn = (seat === b.atkP);
  const actorToken = state.players[seat].tokens[isAtkTurn ? b.atkT : b.defT];
  const role = ROLES[actorToken.role];
  const rageBonus = (isAtkTurn ? b.atkRage : b.defRage) ? 14 : 0;

  let msg = '';
  if (move === 'slash') {
    let dmg = 25 + Math.floor(Math.random() * 8) + role.atk + rageBonus;
    if (isAtkTurn && b.defGuard) { dmg = Math.floor(dmg * 0.3); b.defGuard = false; }
    if (!isAtkTurn && b.atkGuard) { dmg = Math.floor(dmg * 0.3); b.atkGuard = false; }
    if (isAtkTurn) b.defHp = Math.max(0, b.defHp - dmg);
    else b.atkHp = Math.max(0, b.atkHp - dmg);
    SFX.hit();
    msg = `${COLOR_NAMES[seat]} used SLASH for ${dmg} DMG!`;
  } else if (move === 'smash') {
    if (Math.random() < 0.30) {
      SFX.miss();
      msg = `${COLOR_NAMES[seat]} used SMASH... MISSED!`;
      if (isAtkTurn) b.defGuard = false; else b.atkGuard = false;
    } else {
      let dmg = 48 + Math.floor(Math.random() * 11) + role.atk + rageBonus;
      if (isAtkTurn && b.defGuard) { dmg = Math.floor(dmg * 0.3); b.defGuard = false; }
      if (!isAtkTurn && b.atkGuard) { dmg = Math.floor(dmg * 0.3); b.atkGuard = false; }
      if (isAtkTurn) b.defHp = Math.max(0, b.defHp - dmg);
      else b.atkHp = Math.max(0, b.atkHp - dmg);
      SFX.hit();
      msg = `CRITICAL SMASH! ${dmg} MASSIVE DMG!`;
    }
  } else if (move === 'guard') {
    SFX.guard();
    if (isAtkTurn) {
      b.atkGuard = true;
      b.atkHp = Math.min(b.atkMax, b.atkHp + role.heal);
    } else {
      b.defGuard = true;
      b.defHp = Math.min(b.defMax, b.defHp + role.heal);
    }
    msg = `${COLOR_NAMES[seat]} raised GUARD & healed +${role.heal} HP!`;
  }

  b.log = msg;
  triggerArenaShake();

  // Check Battle KO
  if (b.defHp <= 0 || b.atkHp <= 0) {
    const attackerWon = (b.defHp <= 0);
    b.log = attackerWon
      ? `🏆 ${COLOR_NAMES[b.atkP]} WON! Enemy token captured!`
      : `🛡️ ${COLOR_NAMES[b.defP]} DEFENDED! Attacker sent back!`;
    renderAll();
    broadcastState();

    setTimeout(() => {
      if (attackerWon) {
        state.players[b.defP].tokens[b.defT].steps = -1;
        state.battle = null;
        nextTurn(true); // Bonus roll for capture!
      } else {
        state.players[b.atkP].tokens[b.atkT].steps = -1;
        state.battle = null;
        nextTurn(false);
      }
    }, 1300);
    return;
  }

  // Switch active fighter
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
      const pick = moves[Math.floor(Math.random() * moves.length)];
      processBattleInput(activeP, pick);
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
// 9. CANVAS RENDERING & UI SYNC
// ==========================================
const canvas = document.getElementById('ludo-canvas');
const ctx = canvas.getContext('2d');
const CELL = 40; // 600 / 15

function renderAll() {
  drawBoard();
  drawTokens();
  updateHUD();
  updateBattleModal();
}

function drawBoard() {
  ctx.clearRect(0, 0, 600, 600);

  // Base Quadrants
  drawBaseBox(0, 9, COLORS[0]);   // Red (Bottom-Left)
  drawBaseBox(0, 0, COLORS[1]);   // Green (Top-Left)
  drawBaseBox(9, 0, COLORS[2]);   // Yellow (Top-Right)
  drawBaseBox(9, 9, COLORS[3]);   // Blue (Bottom-Right)

  // Grid cells
  for (let gx = 0; gx < 15; gx++) {
    for (let gy = 0; gy < 15; gy++) {
      if ((gx < 6 && gy < 6) || (gx > 8 && gy < 6) || (gx < 6 && gy > 8) || (gx > 8 && gy > 8)) continue;
      if (gx >= 6 && gx <= 8 && gy >= 6 && gy <= 8) continue;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(gx * CELL, gy * CELL, CELL, CELL);
    }
  }

  // Colored Home Stretches & Start Squares
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
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('★', gx * CELL + CELL / 2, gy * CELL + CELL / 2);
  });

  // Special 8-Bit Power/Trap Tiles
  Object.entries(SPECIAL_TILES).forEach(([idx, sp]) => {
    const [gx, gy] = MAIN_TRACK[idx];
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(gx * CELL + 3, gy * CELL + 3, CELL - 6, CELL - 6);
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sp.icon, gx * CELL + CELL / 2, gy * CELL + CELL / 2);
  });

  // Center Home Triangles
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
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
  });
}

function drawBaseBox(gx, gy, color) {
  ctx.fillStyle = color;
  ctx.fillRect(gx * CELL, gy * CELL, 6 * CELL, 6 * CELL);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect((gx + 1) * CELL, (gy + 1) * CELL, 4 * CELL, 4 * CELL);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect((gx + 1) * CELL, (gy + 1) * CELL, 4 * CELL, 4 * CELL);
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

function drawTokens() {
  const movable = (state.phase === 'SELECT') ? getMovableTokens(state.turn, state.dice).map(t => t.id) : [];

  state.players.forEach((p, pIdx) => {
    if (!p.active) return;
    p.tokens.forEach(t => {
      const { x, y } = getTokenPixelCoords(pIdx, t);
      const isHighlight = (pIdx === state.turn && movable.includes(t.id));

      // Glow ring if movable
      if (isHighlight) {
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
        ctx.fill();
      }

      // Shield aura
      if (t.shield) {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Main Token Disc
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[pIdx];
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = t.rage ? '#ff0055' : '#0f172a';
      ctx.stroke();

      // Role Icon
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ROLES[t.role].icon, x, y + 1);
    });
  });
}

// Canvas Click to Select Token
canvas.addEventListener('click', (e) => {
  if (state.phase !== 'SELECT' || !canIControlCurrentTurn()) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = 600 / rect.width;
  const scaleY = 600 / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  const movable = getMovableTokens(state.turn, state.dice);
  for (let t of movable) {
    const { x, y } = getTokenPixelCoords(state.turn, t);
    if (Math.hypot(clickX - x, clickY - y) <= 24) {
      if (gameMode === 'online' && !isHost) {
        sendActionToHost({ action: 'MOVE', tokenId: t.id });
      } else {
        executeTokenMove(state.turn, t.id);
      }
      break;
    }
  }
});

function updateHUD() {
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
    document.getElementById(`pscore-${idx}`).innerText = `🏠 ${homeCount}/4`;
  });

  const curP = state.players[state.turn];
  document.getElementById('turn-indicator').innerText = `${curP.name}'S TURN`;
  document.getElementById('dice-btn').innerText = state.dice > 0 ? state.dice : '🎲';

  const hint = document.getElementById('action-hint');
  if (state.phase === 'ROLL') hint.innerText = canIControlCurrentTurn() ? 'Tap Dice!' : 'Waiting...';
  else if (state.phase === 'SELECT') hint.innerText = 'Tap glowing token';
  else hint.innerText = '...';
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
  const aRole = ROLES[aToken.role];
  const dRole = ROLES[dToken.role];

  document.getElementById('atk-role').innerText = aRole.name;
  document.getElementById('atk-sprite').innerText = aRole.icon;
  document.getElementById('atk-name').innerText = state.players[b.atkP].name;
  document.getElementById('atk-hp-bar').style.width = `${(b.atkHp / b.atkMax) * 100}%`;
  document.getElementById('atk-hp-text').innerText = `${b.atkHp}/${b.atkMax}`;

  document.getElementById('def-role').innerText = dRole.name;
  document.getElementById('def-sprite').innerText = dRole.icon;
  document.getElementById('def-name').innerText = state.players[b.defP].name;
  document.getElementById('def-hp-bar').style.width = `${(b.defHp / b.defMax) * 100}%`;
  document.getElementById('def-hp-text').innerText = `${b.defHp}/${b.defMax}`;

  document.getElementById('battle-log').innerText = b.log;

  const activePlayerObj = state.players[b.activeFighter];
  const canControlBattle = !activePlayerObj.isBot &&
    (gameMode === 'local' || mySeat === b.activeFighter);

  document.getElementById('battle-subtitle').innerText =
    canControlBattle ? 'YOUR MOVE!' : `${activePlayerObj.name} IS CHOOSING...`;

  document.querySelectorAll('.move-btn').forEach(btn => {
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

// Initial draw
renderAll();
