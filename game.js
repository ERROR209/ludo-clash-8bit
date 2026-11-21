// ==========================================
// 1. AUDIO & 8-BIT FIGHT MUSIC
// ==========================================
let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmInterval = null;

function playTone(freq, type = 'sine', duration = 0.1, delay = 0, vol = 0.12) {
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

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function startBattleBGM() {
  stopBattleBGM();
  if (!soundEnabled) return;
  const notes = [110, 146.8, 130.8, 164.8, 110, 196.0, 164.8, 146.8];
  let step = 0;
  bgmInterval = setInterval(() => {
    if (!soundEnabled || state.phase !== 'BATTLE') return;
    playTone(notes[step % notes.length], 'square', 0.11, 0, 0.05);
    step++;
  }, 150);
}

function stopBattleBGM() {
  if (bgmInterval) clearInterval(bgmInterval);
  bgmInterval = null;
}

const SFX = {
  dice:  () => { vibrate(20); [320, 460, 620].forEach((f, i) => playTone(f, 'triangle', 0.06, i * 0.04, 0.14)); },
  hop:   () => { vibrate(10); playTone(580, 'sine', 0.06, 0, 0.12); },
  safe:  () => { [523, 659, 784].forEach((f, i) => playTone(f, 'sine', 0.12, i * 0.06, 0.14)); },
  punch: () => { vibrate(35); playTone(220, 'square', 0.08, 0, 0.16); },
  kick:  () => { vibrate(55); playTone(140, 'sawtooth', 0.12, 0, 0.18); },
  beam:  () => { vibrate([60, 30, 90]); [440, 660, 880, 180].forEach((f, i) => playTone(f, 'sawtooth', 0.12, i * 0.04, 0.2)); },
  jump:  () => { playTone(320, 'sine', 0.09, 0, 0.1); playTone(520, 'sine', 0.09, 0.04, 0.1); },
  win:   () => { [523, 659, 784, 1046].forEach((f, i) => playTone(f, 'triangle', 0.15, i * 0.1, 0.16)); }
};

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-btn').innerText = soundEnabled ? '🔊' : '🔇';
  if (!soundEnabled) stopBattleBGM();
  else if (state.phase === 'BATTLE') startBattleBGM();
}

// ==========================================
// 2. BOARD GEOMETRY & TRACKS
// ==========================================
const COLORS = ['#dc2626', '#16a34a', '#eab308', '#2563eb'];
const HEX_COLORS = [0xdc2626, 0x16a34a, 0xeab308, 0x2563eb];
const COLOR_NAMES = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

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
const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

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

// ==========================================
// 3. THREE.JS 3D BOARD & PAWN ENGINE
// ==========================================
let scene, camera, renderer, raycaster, mouseVec;
let pawnMeshes = {}; // key: "pIdx-tIdx" -> THREE.Group
let cameraTopDown = false;
let hopState = null; // { pIdx, tIdx, lift }

function initThreeBoard() {
  const container = document.getElementById('three-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 18.5, 11.5);
  camera.lookAt(0, 0, 0.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(400, 400);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(8, 22, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Wooden Base Platform
  const woodGeo = new THREE.BoxGeometry(15.8, 0.8, 15.8);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 });
  const woodBase = new THREE.Mesh(woodGeo, woodMat);
  woodBase.position.y = -0.45;
  scene.add(woodBase);

  // Build 15x15 3D Grid Tiles
  const tileGeo = new THREE.BoxGeometry(0.94, 0.25, 0.94);

  for (let gx = 0; gx < 15; gx++) {
    for (let gy = 0; gy < 15; gy++) {
      let col = 0xf8fafc;
      if (gx < 6 && gy > 8) col = HEX_COLORS[0];
      else if (gx < 6 && gy < 6) col = HEX_COLORS[1];
      else if (gx > 8 && gy < 6) col = HEX_COLORS[2];
      else if (gx > 8 && gy > 8) col = HEX_COLORS[3];
      else if (gx >= 6 && gx <= 8 && gy >= 6 && gy <= 8) col = 0xfacc15;

      // Home stretches & start squares
      HOME_STRETCH.forEach((path, pIdx) => {
        if (path.some(([hx, hy]) => hx === gx && hy === gy)) col = HEX_COLORS[pIdx];
        const [sx, sy] = MAIN_TRACK[START_INDEX[pIdx]];
        if (sx === gx && sy === gy) col = HEX_COLORS[pIdx];
      });

      // Safe star tiles
      SAFE_INDICES.forEach(idx => {
        const [sx, sy] = MAIN_TRACK[idx];
        if (sx === gx && sy === gy && ![0,13,26,39].includes(idx)) col = 0x94a3b8;
      });

      // Inner white yard boxes
      if ((gx >= 1 && gx <= 4 && gy >= 10 && gy <= 13) ||
          (gx >= 1 && gx <= 4 && gy >= 1 && gy <= 4) ||
          (gx >= 10 && gx <= 13 && gy >= 1 && gy <= 4) ||
          (gx >= 10 && gx <= 13 && gy >= 10 && gy <= 13)) {
        col = 0xffffff;
      }

      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 });
      const tile = new THREE.Mesh(tileGeo, mat);
      tile.position.set(gx - 7, 0, gy - 7);
      tile.receiveShadow = true;
      scene.add(tile);
    }
  }

  // Create 3D Pawns for all 4 players
  for (let pIdx = 0; pIdx < 4; pIdx++) {
    for (let tIdx = 0; tIdx < 4; tIdx++) {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: HEX_COLORS[pIdx],
        roughness: 0.25,
        metalness: 0.15
      });

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 16), bodyMat);
      cone.position.y = 0.55;
      cone.castShadow = true;
      group.add(cone);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), bodyMat);
      head.position.y = 1.05;
      head.castShadow = true;
      group.add(head);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.38, 0.48, 20),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.16;
      ring.visible = false;
      ring.name = 'highlightRing';
      group.add(ring);

      group.userData = { pIdx, tIdx };
      scene.add(group);
      pawnMeshes[`${pIdx}-${tIdx}`] = group;
    }
  }

  raycaster = new THREE.Raycaster();
  mouseVec = new THREE.Vector2();

  renderer.domElement.addEventListener('pointerdown', onThreeBoardTap);

  function animateThree() {
    requestAnimationFrame(animateThree);
    syncThreePawns();
    renderer.render(scene, camera);
  }
  animateThree();
}

function toggleCameraView() {
  cameraTopDown = !cameraTopDown;
  document.getElementById('cam-btn').innerText = cameraTopDown ? '🎥 TOP' : '🎥 3D';
  if (cameraTopDown) {
    camera.position.set(0, 22, 0.1);
  } else {
    camera.position.set(0, 18.5, 11.5);
  }
  camera.lookAt(0, 0, 0.5);
}

function getGridCoordsForToken(pIdx, token) {
  if (token.steps === -1) {
    const [bx, by] = BASE_SPOTS[pIdx][token.id];
    return { gx: bx, gy: by, key: `B-${pIdx}-${token.id}` };
  }
  if (token.steps <= 50) {
    const gIdx = (START_INDEX[pIdx] + token.steps) % 52;
    const [gx, gy] = MAIN_TRACK[gIdx];
    return { gx, gy, key: `T-${gIdx}` };
  }
  const hIdx = Math.min(5, token.steps - 51);
  const [hx, hy] = HOME_STRETCH[pIdx][hIdx];
  return { gx: hx, gy: hy, key: `H-${pIdx}-${hIdx}` };
}

function syncThreePawns() {
  if (!state.players.length) return;
  const movable = (state.phase === 'SELECT') ? getMovableTokens(state.turn, state.dice).map(t => t.id) : [];

  const groups = {};
  state.players.forEach((p, pIdx) => {
    p.tokens.forEach(t => {
      const mesh = pawnMeshes[`${pIdx}-${t.id}`];
      if (!mesh) return;
      mesh.visible = p.active;
      if (!p.active) return;

      const pos = getGridCoordsForToken(pIdx, t);
      if (!groups[pos.key]) groups[pos.key] = [];
      groups[pos.key].push({ pIdx, t, mesh, gx: pos.gx, gy: pos.gy });
    });
  });

  const offsets = [
    [[0, 0]],
    [[-0.22, 0], [0.22, 0]],
    [[-0.22, -0.18], [0.22, -0.18], [0, 0.22]],
    [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]
  ];

  Object.values(groups).forEach(list => {
    const cnt = Math.min(4, list.length);
    const sc = cnt > 1 ? 0.72 : 1.0;
    list.forEach((item, idx) => {
      const [ox, oz] = offsets[cnt - 1][idx % 4];
      const isHop = hopState && hopState.pIdx === item.pIdx && hopState.tIdx === item.t.id;
      const targetX = (item.gx - 7) + ox;
      const targetZ = (item.gy - 7) + oz;
      const targetY = isHop ? 0.85 : 0;

      item.mesh.position.x += (targetX - item.mesh.position.x) * 0.35;
      item.mesh.position.z += (targetZ - item.mesh.position.z) * 0.35;
      item.mesh.position.y += (targetY - item.mesh.position.y) * 0.4;
      item.mesh.scale.set(sc, sc, sc);

      const ring = item.mesh.getObjectByName('highlightRing');
      if (ring) {
        ring.visible = (item.pIdx === state.turn && movable.includes(item.t.id));
      }
    });
  });
}

function onThreeBoardTap(e) {
  if (state.phase !== 'SELECT' || !canIControlCurrentTurn()) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseVec, camera);
  const candidates = [];
  const movable = getMovableTokens(state.turn, state.dice);
  movable.forEach(t => {
    const grp = pawnMeshes[`${state.turn}-${t.id}`];
    if (grp) candidates.push(...grp.children);
  });

  const hits = raycaster.intersectObjects(candidates);
  if (hits.length > 0) {
    const grp = hits[0].object.parent;
    const tId = grp.userData.tIdx;
    if (gameMode === 'online' && !isHost) sendActionToHost({ action: 'MOVE', tokenId: tId });
    else executeTokenMove(state.turn, tId);
  }
}

// ==========================================
// 4. GAME STATE & ONLINE PEERJS
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
  phase: 'ROLL',
  mysteryTiles: {},
  battle: null
};

function createInitialState(configs, fastStart, useTraps) {
  const mTiles = {};
  if (useTraps) {
    [4, 11, 17, 24, 30, 37, 43, 50].forEach((idx, i) => {
      mTiles[idx] = (i % 2 === 0) ? 'BOOST' : 'BOMB';
    });
  }
  return {
    players: configs.map((c, idx) => ({
      id: idx,
      name: c.name,
      isBot: c.isBot,
      active: c.active,
      tokens: [0, 1, 2, 3].map(tId => ({
        id: tId,
        steps: (fastStart && tId === 0) ? 0 : -1,
        kills: 0
      }))
    })),
    turn: 0,
    dice: 1,
    phase: 'ROLL',
    mysteryTiles: mTiles,
    battle: null
  };
}

function showOnlineLobby() {
  document.getElementById('online-panel').classList.remove('hidden');
}

function hostOnlineGame() {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  isHost = true;
  mySeat = 0;
  document.getElementById('host-info').classList.remove('hidden');
  document.getElementById('room-code-display').innerText = code;
  peer = new Peer('LUDO3D-' + code);
  const myName = document.getElementById('player-name').value.trim() || 'Host';
  let members = [{ seat: 0, name: myName }];

  peer.on('open', () => {
    document.getElementById('net-status').innerText = 'Room Ready!';
    document.getElementById('start-online-btn').classList.remove('hidden');
  });

  peer.on('connection', conn => {
    const seat = connections.length + 1;
    if (seat > 3) { conn.close(); return; }
    connections.push(conn);
    conn.on('data', d => {
      if (d.type === 'HELLO') {
        members.push({ seat, name: d.name });
        document.getElementById('lobby-players-list').innerText = members.map(m => m.name).join(', ');
        conn.send({ type: 'WELCOME', seat });
      } else if (d.type === 'ACTION') {
        handleRemoteAction(seat, d);
      }
    });
  });
  window._members = members;
}

function joinOnlineGame() {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  if (code.length < 4) return;
  isHost = false;
  peer = new Peer();
  peer.on('open', () => {
    hostConn = peer.connect('LUDO3D-' + code);
    hostConn.on('open', () => {
      hostConn.send({ type: 'HELLO', name: document.getElementById('player-name').value.trim() || 'Guest' });
      document.getElementById('net-status').innerText = 'Connected! Waiting for Host...';
    });
    hostConn.on('data', d => {
      if (d.type === 'WELCOME') mySeat = d.seat;
      else if (d.type === 'SYNC') {
        gameMode = 'online';
        const wasBattle = (state.phase === 'BATTLE');
        state = d.state;
        switchToGameScreen();
        if (state.phase === 'BATTLE' && !wasBattle) launchRealtimeFight();
        updateHUD();
      }
    });
  });
}

function launchOnlineMatch() {
  const members = window._members || [{ seat: 0, name: 'Host' }];
  const configs = [0, 1, 2, 3].map(s => {
    const f = members.find(m => m.seat === s);
    return { name: f ? f.name : `CPU ${s+1}`, isBot: !f, active: true };
  });
  gameMode = 'online';
  state = createInitialState(configs, document.getElementById('opt-fast-start').checked, document.getElementById('opt-traps').checked);
  switchToGameScreen();
  updateHUD();
  broadcastState();
}

function broadcastState() {
  if (gameMode === 'online' && isHost) {
    connections.forEach(c => { if (c.open) c.send({ type: 'SYNC', state }); });
  }
}

function sendActionToHost(obj) {
  if (isHost) handleRemoteAction(mySeat, obj);
  else if (hostConn && hostConn.open) hostConn.send({ type: 'ACTION', ...obj });
}

function handleRemoteAction(seat, data) {
  if (data.action === 'ROLL' && state.turn === seat && state.phase === 'ROLL') executeRoll();
  else if (data.action === 'MOVE' && state.turn === seat && state.phase === 'SELECT') executeTokenMove(seat, data.tokenId);
}

function startLocalGame(mode) {
  gameMode = mode;
  isHost = true;
  mySeat = 0;
  const p1 = document.getElementById('player-name').value.trim() || 'YOU';
  const configs = mode === 'bot'
    ? [{ name: p1, isBot: false, active: true }, { name: 'CPU', isBot: true, active: true }, { name: '', isBot: false, active: false }, { name: '', isBot: false, active: false }]
    : [{ name: p1, isBot: false, active: true }, { name: 'PLAYER 2', isBot: false, active: true }, { name: '', isBot: false, active: false }, { name: '', isBot: false, active: false }];

  state = createInitialState(configs, document.getElementById('opt-fast-start').checked, document.getElementById('opt-traps').checked);
  switchToGameScreen();
  updateHUD();
}

function switchToGameScreen() {
  document.getElementById('menu-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
  if (!renderer) initThreeBoard();
}

// ==========================================
// 5. DICE & TOKEN MOVEMENT
// ==========================================
function canIControlCurrentTurn() {
  const cur = state.players[state.turn];
  if (!cur || cur.isBot) return false;
  return gameMode === 'local' || state.turn === mySeat;
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

    const valid = getMovableTokens(state.turn, roll);
    if (valid.length === 0) {
      updateHUD();
      broadcastState();
      showToast('NO MOVE!');
      setTimeout(() => nextTurn(false), 700);
    } else if (valid.length === 1) {
      state.phase = 'SELECT';
      updateHUD();
      setTimeout(() => executeTokenMove(state.turn, valid[0].id), 220);
    } else {
      state.phase = 'SELECT';
      updateHUD();
      broadcastState();
      if (state.players[state.turn].isBot) {
        setTimeout(() => executeTokenMove(state.turn, valid[0].id), 450);
      }
    }
  }, 380);
}

function getMovableTokens(pIdx, dice) {
  return state.players[pIdx].tokens.filter(t => {
    if (t.steps === 56) return false;
    if (t.steps === -1) return dice === 6;
    return t.steps + dice <= 56;
  });
}

function nextTurn(bonus) {
  if (!bonus) {
    do {
      state.turn = (state.turn + 1) % 4;
    } while (!state.players[state.turn].active);
  }
  state.phase = 'ROLL';
  updateHUD();
  broadcastState();

  if (isHost && state.players[state.turn].isBot) {
    setTimeout(executeRoll, 600);
  }
}

function executeTokenMove(pIdx, tokenId) {
  const token = state.players[pIdx].tokens[tokenId];
  const dice = state.dice;
  state.phase = 'ANIM';

  if (token.steps === -1) {
    token.steps = 0;
    hopState = { pIdx, tIdx: tokenId };
    SFX.hop();
    setTimeout(() => {
      hopState = null;
      finishMove(pIdx, token, dice);
    }, 240);
    return;
  }

  let left = dice;
  const iv = setInterval(() => {
    token.steps += 1;
    left -= 1;
    hopState = { pIdx, tIdx: tokenId };
    SFX.hop();
    setTimeout(() => { hopState = null; }, 90);

    if (left <= 0) {
      clearInterval(iv);
      setTimeout(() => finishMove(pIdx, token, dice), 180);
    }
  }, 145);
}

function finishMove(pIdx, token, dice) {
  if (token.steps === 56) {
    SFX.safe();
    showToast('👑 HOME! BONUS ROLL!');
    if (state.players[pIdx].tokens.every(t => t.steps === 56)) {
      SFX.win();
      document.getElementById('winner-title').innerText = `${state.players[pIdx].name} WINS!`;
      document.getElementById('winner-modal').classList.remove('hidden');
      return;
    }
    nextTurn(true);
    return;
  }

  if (token.steps <= 50) {
    const gIdx = (START_INDEX[pIdx] + token.steps) % 52;
    if (state.mysteryTiles[gIdx]) {
      const m = state.mysteryTiles[gIdx];
      delete state.mysteryTiles[gIdx];
      if (m === 'BOOST') {
        token.steps = Math.min(55, token.steps + 3);
        showToast('⚡ TURBO +3 STEPS!');
      } else {
        token.steps = Math.max(0, token.steps - 3);
        showToast('💣 BOMB -3 STEPS!');
      }
    }

    const finalGIdx = (START_INDEX[pIdx] + token.steps) % 52;
    if (!SAFE_INDICES.includes(finalGIdx)) {
      const enemy = findEnemyAt(pIdx, finalGIdx);
      if (enemy) {
        startRealtimeClash(pIdx, token.id, enemy.pIdx, enemy.token.id);
        return;
      }
    } else {
      SFX.safe();
    }
  }

  nextTurn(dice === 6);
}

function findEnemyAt(myP, gIdx) {
  for (let p = 0; p < 4; p++) {
    if (p === myP || !state.players[p].active) continue;
    for (let t of state.players[p].tokens) {
      if (t.steps >= 0 && t.steps <= 50 && ((START_INDEX[p] + t.steps) % 52) === gIdx) {
        return { pIdx: p, token: t };
      }
    }
  }
  return null;
}

// ==========================================
// 6. REAL-TIME 2D STREET FIGHTER ARENA
// ==========================================
let fightLoopId = null;
let fightTimerId = null;
let fightState = null;

function startRealtimeClash(atkP, atkT, defP, defT) {
  state.phase = 'BATTLE';
  state.battle = { atkP, atkT, defP, defT };
  broadcastState();
  launchRealtimeFight();
}

function launchRealtimeFight() {
  const b = state.battle;
  const splash = document.getElementById('vs-splash');
  document.getElementById('vs-atk-banner').innerText = `${COLOR_NAMES[b.atkP]} FIGHTER`;
  document.getElementById('vs-atk-banner').style.background = COLORS[b.atkP];
  document.getElementById('vs-def-banner').innerText = `${COLOR_NAMES[b.defP]} FIGHTER`;
  document.getElementById('vs-def-banner').style.background = COLORS[b.defP];
  splash.classList.remove('hidden');

  setTimeout(() => {
    splash.classList.add('hidden');
    document.getElementById('battle-modal').classList.remove('hidden');
    document.getElementById('atk-name').innerText = COLOR_NAMES[b.atkP];
    document.getElementById('def-name').innerText = COLOR_NAMES[b.defP];

    fightState = {
      timeLeft: 15,
      p1: { x: 80, y: 150, vy: 0, hp: 100, rage: 0, dir: 1, atkTimer: 0, atkType: '', left: false, right: false },
      p2: { x: 260, y: 150, vy: 0, hp: 100, rage: 0, dir: -1, atkTimer: 0, atkType: '', left: false, right: false },
      beams: [],
      sparks: []
    };

    startBattleBGM();
    if (fightTimerId) clearInterval(fightTimerId);
    fightTimerId = setInterval(() => {
      if (!fightState) return;
      fightState.timeLeft -= 1;
      document.getElementById('battle-timer').innerText = `TIME: ${fightState.timeLeft}`;
      if (fightState.timeLeft <= 0) {
        concludeRealtimeFight(fightState.p1.hp >= fightState.p2.hp);
      }
    }, 1000);

    if (fightLoopId) cancelAnimationFrame(fightLoopId);
    function loop() {
      if (state.phase !== 'BATTLE' || !fightState) return;
      updateFightPhysics();
      drawFightStage();
      fightLoopId = requestAnimationFrame(loop);
    }
    loop();
  }, 950);
}

function getControlledFighter() {
  if (!fightState || !state.battle) return null;
  const b = state.battle;
  if (gameMode === 'local') {
    // In local 2P, whoever initiated or whichever player is human
    return !state.players[b.atkP].isBot ? fightState.p1 : fightState.p2;
  }
  if (mySeat === b.atkP) return fightState.p1;
  if (mySeat === b.defP) return fightState.p2;
  return null;
}

function setFightInput(dir, active) {
  const f = getControlledFighter();
  if (!f) return;
  f[dir] = active;
  if (active) f.dir = (dir === 'left') ? -1 : 1;
}

function triggerFightJump() {
  const f = getControlledFighter();
  if (!f || f.y < 150) return;
  f.vy = -10.5;
  SFX.jump();
}

function triggerFightAttack(type) {
  const f = getControlledFighter();
  if (!f || f.atkTimer > 0) return;
  executeFighterStrike(f, f === fightState.p1 ? fightState.p2 : fightState.p1, type, f === fightState.p1 ? COLORS[state.battle.atkP] : COLORS[state.battle.defP]);
}

function executeFighterStrike(attacker, defender, type, color) {
  if (type === 'beam') {
    if (attacker.rage < 100) return;
    attacker.rage = 0;
    attacker.atkType = 'beam';
    attacker.atkTimer = 14;
    SFX.beam();
    fightState.beams.push({
      x: attacker.x + attacker.dir * 20,
      y: attacker.y - 24,
      vx: attacker.dir * 8,
      owner: attacker,
      color
    });
    return;
  }

  attacker.atkType = type;
  attacker.atkTimer = 10;
  type === 'punch' ? SFX.punch() : SFX.kick();

  const reach = type === 'kick' ? 46 : 38;
  const dist = Math.abs(attacker.x - defender.x);
  const yDiff = Math.abs(attacker.y - defender.y);

  if (dist <= reach && yDiff <= 30) {
    const dmg = type === 'kick' ? 16 : 11;
    defender.hp = Math.max(0, defender.hp - dmg);
    attacker.rage = Math.min(100, attacker.rage + 28);
    defender.x = Math.max(25, Math.min(315, defender.x + attacker.dir * 18));

    for (let i = 0; i < 10; i++) {
      fightState.sparks.push({
        x: defender.x, y: defender.y - 24,
        vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.8) * 6,
        color: '#facc15', life: 12
      });
    }
  }
}

function updateFightPhysics() {
  const { p1, p2 } = fightState;
  const b = state.battle;

  // Bot AI for CPU fighter
  if (state.players[b.defP].isBot) runFighterBotAI(p2, p1, COLORS[b.defP]);
  if (state.players[b.atkP].isBot) runFighterBotAI(p1, p2, COLORS[b.atkP]);

  [p1, p2].forEach(p => {
    if (p.left) { p.x -= 3.4; p.dir = -1; }
    if (p.right) { p.x += 3.4; p.dir = 1; }
    p.x = Math.max(25, Math.min(315, p.x));

    p.y += p.vy;
    if (p.y < 150) p.vy += 0.65;
    else { p.y = 150; p.vy = 0; }

    if (p.atkTimer > 0) p.atkTimer--;
  });

  // Auto-face opponent when idle
  if (!p1.left && !p1.right) p1.dir = (p2.x >= p1.x) ? 1 : -1;
  if (!p2.left && !p2.right) p2.dir = (p1.x >= p2.x) ? 1 : -1;

  // Update Energy Beams
  fightState.beams.forEach(bm => {
    bm.x += bm.vx;
    const target = (bm.owner === p1) ? p2 : p1;
    if (Math.abs(bm.x - target.x) < 22 && Math.abs(bm.y - (target.y - 24)) < 26) {
      target.hp = Math.max(0, target.hp - 28);
      bm.hit = true;
      SFX.kick();
    }
  });
  fightState.beams = fightState.beams.filter(bm => !bm.hit && bm.x > 0 && bm.x < 340);

  // Update UI Bars
  document.getElementById('atk-hp-bar').style.width = `${p1.hp}%`;
  document.getElementById('def-hp-bar').style.width = `${p2.hp}%`;
  document.getElementById('atk-rage-bar').style.width = `${p1.rage}%`;
  document.getElementById('def-rage-bar').style.width = `${p2.rage}%`;

  const myF = getControlledFighter();
  document.getElementById('btn-beam').disabled = !myF || myF.rage < 100;

  if (p1.hp <= 0 || p2.hp <= 0) {
    concludeRealtimeFight(p2.hp <= 0);
  }
}

function runFighterBotAI(bot, target, col) {
  const dist = target.x - bot.x;
  bot.left = dist < -32;
  bot.right = dist > 32;
  if (Math.random() < 0.03 && bot.y >= 150) bot.vy = -10.5;
  if (bot.atkTimer <= 0) {
    if (bot.rage >= 100) executeFighterStrike(bot, target, 'beam', col);
    else if (Math.abs(dist) < 42 && Math.random() < 0.14) {
      executeFighterStrike(bot, target, Math.random() < 0.5 ? 'punch' : 'kick', col);
    }
  }
}

function concludeRealtimeFight(attackerWon) {
  if (!fightState) return;
  fightState = null;
  clearInterval(fightTimerId);
  cancelAnimationFrame(fightLoopId);
  stopBattleBGM();

  const b = state.battle;
  document.getElementById('battle-log').innerText = attackerWon ? 'K.O.! ATTACKER WINS!' : 'K.O.! DEFENDER SURVIVED!';

  setTimeout(() => {
    document.getElementById('battle-modal').classList.add('hidden');
    if (attackerWon) {
      state.players[b.defP].tokens[b.defT].steps = -1;
      state.battle = null;
      nextTurn(true);
    } else {
      state.players[b.atkP].tokens[b.atkT].steps = -1;
      state.battle = null;
      nextTurn(false);
    }
  }, 900);
}

const fCanvas = document.getElementById('battle-canvas');
const fCtx = fCanvas.getContext('2d');

function drawFightStage() {
  if (!fightState || !state.battle) return;
  fCtx.fillStyle = '#0f172a';
  fCtx.fillRect(0, 0, 340, 190);

  // Retro Temple Background
  fCtx.fillStyle = '#1e293b';
  for (let x = 15; x < 340; x += 55) fCtx.fillRect(x, 30, 26, 120);

  // Arena Floor
  fCtx.fillStyle = '#334155';
  fCtx.fillRect(0, 150, 340, 40);
  fCtx.fillStyle = '#facc15';
  fCtx.fillRect(0, 150, 340, 3);

  drawArcadeFighter(fightState.p1, COLORS[state.battle.atkP]);
  drawArcadeFighter(fightState.p2, COLORS[state.battle.defP]);

  fightState.beams.forEach(bm => {
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(bm.x - 10, bm.y - 6, 20, 12);
    fCtx.strokeStyle = bm.color;
    fCtx.lineWidth = 3;
    fCtx.strokeRect(bm.x - 10, bm.y - 6, 20, 12);
  });

  fightState.sparks.forEach(s => {
    fCtx.fillStyle = s.color;
    fCtx.fillRect(s.x, s.y, 4, 4);
    s.x += s.vx;
    s.y += s.vy;
    s.life--;
  });
  fightState.sparks = fightState.sparks.filter(s => s.life > 0);
}

function drawArcadeFighter(f, color) {
  const x = Math.round(f.x);
  const y = Math.round(f.y);
  const d = f.dir;

  // Shadow
  fCtx.fillStyle = 'rgba(0,0,0,0.45)';
  fCtx.fillRect(x - 14, 148, 28, 5);

  // Legs
  fCtx.fillStyle = '#0f172a';
  fCtx.fillRect(x - 9, y - 14, 6, 14);
  if (f.atkTimer > 0 && f.atkType === 'kick') {
    fCtx.fillStyle = '#facc15';
    fCtx.fillRect(d > 0 ? x + 4 : x - 28, y - 16, 24, 7);
  } else {
    fCtx.fillRect(x + 3, y - 14, 6, 14);
  }

  // Torso
  fCtx.fillStyle = color;
  fCtx.fillRect(x - 11, y - 34, 22, 20);

  // Head & Bandana
  fCtx.fillStyle = '#fed7aa';
  fCtx.fillRect(x - 9, y - 48, 18, 14);
  fCtx.fillStyle = '#facc15';
  fCtx.fillRect(x - 10, y - 46, 20, 4);

  // Punch Fist
  if (f.atkTimer > 0 && f.atkType === 'punch') {
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(d > 0 ? x + 10 : x - 28, y - 30, 18, 8);
  }
}

// ==========================================
// 7. HUD & TOASTS
// ==========================================
function updateHUD() {
  state.players.forEach((p, idx) => {
    const card = document.getElementById(`pcard-${idx}`);
    if (!p.active) { card.style.visibility = 'hidden'; return; }
    card.style.visibility = 'visible';
    card.classList.toggle('active-turn', state.turn === idx);
    document.getElementById(`pname-${idx}`).innerText = p.name;
    const home = p.tokens.filter(t => t.steps === 56).length;
    document.getElementById(`pscore-${idx}`).innerText = `🏠${home}/4`;
  });

  const cur = state.players[state.turn];
  document.getElementById('turn-indicator').innerText = `${cur.name}'S TURN`;
  document.getElementById('cube-dice').className = `cube show-${state.dice}`;

  const hint = document.getElementById('action-hint');
  if (state.phase === 'ROLL') hint.innerText = canIControlCurrentTurn() ? 'TAP DICE' : 'WAITING';
  else if (state.phase === 'SELECT') hint.innerText = 'TAP 3D PAWN';
  else hint.innerText = 'MOVING';
}

function showToast(msg) {
  const t = document.getElementById('toast-banner');
  t.innerText = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 1100);
}
