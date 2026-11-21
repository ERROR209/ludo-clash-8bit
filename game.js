// ==========================================
// 1. FUN SOUND EFFECTS
// ==========================================
let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type = 'sine', duration = 0.1, delay = 0, vol = 0.13) {
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
  dice:  () => [340, 480, 640].forEach((f, i) => playTone(f, 'triangle', 0.06, i * 0.04, 0.14)),
  hop:   () => playTone(600, 'sine', 0.06, 0, 0.12),
  safe:  () => [523, 659, 784].forEach((f, i) => playTone(f, 'sine', 0.12, i * 0.06, 0.14)),
  chaos: () => [440, 587, 784, 1046].forEach((f, i) => playTone(f, 'square', 0.09, i * 0.05, 0.14)),
  bonk:  () => {
    playTone(520, 'square', 0.06, 0, 0.18);
    playTone(160, 'sawtooth', 0.22, 0.05, 0.22);
    playTone(90, 'triangle', 0.25, 0.12, 0.22);
  },
  win:   () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => playTone(f, 'triangle', 0.15, i * 0.1, 0.16))
};

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-btn').innerText = soundEnabled ? '🔊' : '🔇';
}

// ==========================================
// 2. BOARD TRACKS & CONSTANTS
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
const CHAOS_INDICES = [4, 11, 17, 24, 30, 37, 43, 50];

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
let pawnMeshes = {};
let cameraTopDown = false;
let hopState = null;

function initThreeBoard() {
  const container = document.getElementById('three-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 18.5, 11.5);
  camera.lookAt(0, 0, 0.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(400, 400);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
  dirLight.position.set(8, 22, 10);
  scene.add(dirLight);

  const woodBase = new THREE.Mesh(
    new THREE.BoxGeometry(15.8, 0.8, 15.8),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 })
  );
  woodBase.position.y = -0.45;
  scene.add(woodBase);

  const tileGeo = new THREE.BoxGeometry(0.94, 0.25, 0.94);

  for (let gx = 0; gx < 15; gx++) {
    for (let gy = 0; gy < 15; gy++) {
      let col = 0xf8fafc;
      if (gx < 6 && gy > 8) col = HEX_COLORS[0];
      else if (gx < 6 && gy < 6) col = HEX_COLORS[1];
      else if (gx > 8 && gy < 6) col = HEX_COLORS[2];
      else if (gx > 8 && gy > 8) col = HEX_COLORS[3];
      else if (gx >= 6 && gx <= 8 && gy >= 6 && gy <= 8) col = 0xfacc15;

      HOME_STRETCH.forEach((path, pIdx) => {
        if (path.some(([hx, hy]) => hx === gx && hy === gy)) col = HEX_COLORS[pIdx];
        const [sx, sy] = MAIN_TRACK[START_INDEX[pIdx]];
        if (sx === gx && sy === gy) col = HEX_COLORS[pIdx];
      });

      SAFE_INDICES.forEach(idx => {
        const [sx, sy] = MAIN_TRACK[idx];
        if (sx === gx && sy === gy && ![0,13,26,39].includes(idx)) col = 0x94a3b8;
      });

      if (state.chaosEnabled) {
        CHAOS_INDICES.forEach(idx => {
          const [cx, cy] = MAIN_TRACK[idx];
          if (cx === gx && cy === gy) col = 0xc084fc; // Purple Lucky "?" Tile
        });
      }

      if ((gx >= 1 && gx <= 4 && gy >= 10 && gy <= 13) ||
          (gx >= 1 && gx <= 4 && gy >= 1 && gy <= 4) ||
          (gx >= 10 && gx <= 13 && gy >= 1 && gy <= 4) ||
          (gx >= 10 && gx <= 13 && gy >= 10 && gy <= 13)) {
        col = 0xffffff;
      }

      const tile = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 }));
      tile.position.set(gx - 7, 0, gy - 7);
      scene.add(tile);
    }
  }

  for (let pIdx = 0; pIdx < 4; pIdx++) {
    for (let tIdx = 0; tIdx < 4; tIdx++) {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: HEX_COLORS[pIdx], roughness: 0.25 });

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 16), bodyMat);
      cone.position.y = 0.55;
      group.add(cone);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), bodyMat);
      head.position.y = 1.05;
      group.add(head);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.38, 0.5, 20),
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
  camera.position.set(0, cameraTopDown ? 22 : 18.5, cameraTopDown ? 0.1 : 11.5);
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
      if (ring) ring.visible = (item.pIdx === state.turn && movable.includes(item.t.id));
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
  getMovableTokens(state.turn, state.dice).forEach(t => {
    const grp = pawnMeshes[`${state.turn}-${t.id}`];
    if (grp) candidates.push(...grp.children);
  });

  const hits = raycaster.intersectObjects(candidates);
  if (hits.length > 0) {
    const tId = hits[0].object.parent.userData.tIdx;
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
  chaosEnabled: true,
  clash: null
};

function createInitialState(configs, fastStart, chaosEnabled) {
  return {
    players: configs.map((c, idx) => ({
      id: idx,
      name: c.name,
      isBot: c.isBot,
      active: c.active,
      tokens: [0, 1, 2, 3].map(tId => ({
        id: tId,
        steps: (fastStart && tId === 0) ? 0 : -1
      }))
    })),
    turn: 0,
    dice: 1,
    phase: 'ROLL',
    chaosEnabled,
    clash: null
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
  peer = new Peer('LUDOPARTY-' + code);
  const myName = document.getElementById('player-name').value.trim() || 'Host';
  let members = [{ seat: 0, name: myName }];

  peer.on('open', () => {
    document.getElementById('net-status').innerText = 'Room Ready! Share code!';
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
    hostConn = peer.connect('LUDOPARTY-' + code);
    hostConn.on('open', () => {
      hostConn.send({ type: 'HELLO', name: document.getElementById('player-name').value.trim() || 'Guest' });
      document.getElementById('net-status').innerText = 'Connected! Waiting for Host...';
    });
    hostConn.on('data', d => {
      if (d.type === 'WELCOME') mySeat = d.seat;
      else if (d.type === 'SYNC') {
        gameMode = 'online';
        const wasClash = (state.phase === 'CLASH');
        state = d.state;
        switchToGameScreen();
        if (state.phase === 'CLASH' && !wasClash && state.clash) playFunnyClashCutscene(state.clash);
        updateHUD();
      } else if (d.type === 'EMOTE') {
        showEmoteBubble(d.seat, d.emoji);
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
  state = createInitialState(configs, document.getElementById('opt-fast-start').checked, document.getElementById('opt-chaos').checked);
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
  else if (data.action === 'EMOTE') {
    showEmoteBubble(seat, data.emoji);
    connections.forEach(c => { if (c.open) c.send({ type: 'EMOTE', seat, emoji: data.emoji }); });
  }
}

function startLocalGame(mode) {
  gameMode = mode;
  isHost = true;
  mySeat = 0;
  const p1 = document.getElementById('player-name').value.trim() || 'YOU';
  const configs = mode === 'bot'
    ? [{ name: p1, isBot: false, active: true }, { name: 'CPU', isBot: true, active: true }, { name: '', isBot: false, active: false }, { name: '', isBot: false, active: false }]
    : [{ name: p1, isBot: false, active: true }, { name: 'PLAYER 2', isBot: false, active: true }, { name: '', isBot: false, active: false }, { name: '', isBot: false, active: false }];

  state = createInitialState(configs, document.getElementById('opt-fast-start').checked, document.getElementById('opt-chaos').checked);
  switchToGameScreen();
  updateHUD();
}

function switchToGameScreen() {
  document.getElementById('menu-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
  if (!renderer) initThreeBoard();
}

// ==========================================
// 5. LIVE EMOTES
// ==========================================
function sendEmote(emoji) {
  const seat = (gameMode === 'local') ? state.turn : mySeat;
  if (gameMode === 'online' && !isHost) {
    sendActionToHost({ action: 'EMOTE', emoji });
  } else {
    showEmoteBubble(seat, emoji);
    if (gameMode === 'online' && isHost) {
      connections.forEach(c => { if (c.open) c.send({ type: 'EMOTE', seat, emoji }); });
    }
  }
}

function showEmoteBubble(seat, emoji) {
  const el = document.getElementById(`emote-${seat}`);
  if (!el) return;
  el.innerText = emoji;
  el.classList.remove('hidden');
  playTone(720, 'sine', 0.08, 0, 0.09);
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 1800);
}

// ==========================================
// 6. DICE, TOKEN MOVEMENT & LUCKY CHAOS TILES
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
      setTimeout(() => nextTurn(false), 650);
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
  }, 360);
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
    }, 220);
    return;
  }

  let left = dice;
  const iv = setInterval(() => {
    token.steps += 1;
    left -= 1;
    hopState = { pIdx, tIdx: tokenId };
    SFX.hop();
    setTimeout(() => { hopState = null; }, 85);

    if (left <= 0) {
      clearInterval(iv);
      setTimeout(() => finishMove(pIdx, token, dice), 160);
    }
  }, 140);
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

    // LUCKY "?" CHAOS TILE EVENT!
    if (state.chaosEnabled && CHAOS_INDICES.includes(gIdx)) {
      SFX.chaos();
      const rollChaos = Math.floor(Math.random() * 4);
      if (rollChaos === 0) {
        token.steps = Math.min(55, token.steps + 4);
        showToast('🚀 ROCKET BOOST +4!');
      } else if (rollChaos === 1) {
        token.steps = Math.max(0, token.steps - 2);
        showToast('🍌 BANANA SLIP -2!');
      } else if (rollChaos === 2) {
        showToast('🎲 LUCKY EXTRA TURN!');
        nextTurn(true);
        return;
      } else {
        // Swap with an active opponent token on track!
        const swappable = findAnyOpponentOnTrack(pIdx);
        if (swappable) {
          const myOld = token.steps;
          token.steps = swappable.token.steps;
          swappable.token.steps = myOld;
          showToast(`🔄 SWAPPED WITH ${COLOR_NAMES[swappable.pIdx]}!`);
        } else {
          token.steps = Math.min(55, token.steps + 3);
          showToast('⚡ SPEED SURGE +3!');
        }
      }
    }

    const finalGIdx = (START_INDEX[pIdx] + token.steps) % 52;
    if (!SAFE_INDICES.includes(finalGIdx)) {
      const enemy = findEnemyAt(pIdx, finalGIdx);
      if (enemy) {
        triggerInstantFunnyClash(pIdx, token.id, enemy.pIdx, enemy.token.id, dice);
        return;
      }
    } else {
      SFX.safe();
    }
  }

  nextTurn(dice === 6);
}

function findAnyOpponentOnTrack(myP) {
  for (let p = 0; p < 4; p++) {
    if (p === myP || !state.players[p].active) continue;
    for (let t of state.players[p].tokens) {
      if (t.steps > 2 && t.steps <= 48) return { pIdx: p, token: t };
    }
  }
  return null;
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
// 7. INSTANT 3-SECOND FUNNY 8-BIT CLASH CUTSCENE
// ==========================================
const FUNNY_GAGS = [
  { name: 'FRYING PAN BONK!', caption: 'CLANG!! Sent flying back to base!' },
  { name: 'MEGA FIREBALL!',   caption: 'BOOM!! Roasted to crispy pixels!' },
  { name: 'GIANT HAMMER!',    caption: 'SQUASH!! Flattened like a pancake!' }
];

function triggerInstantFunnyClash(atkP, atkT, defP, defT, dice) {
  // Attacker has 75% advantage, Defender has 25% lucky dodge chance!
  const attackerWins = Math.random() < 0.75;
  const gagIdx = Math.floor(Math.random() * FUNNY_GAGS.length);

  state.phase = 'CLASH';
  state.clash = { atkP, atkT, defP, defT, attackerWins, gagIdx };
  broadcastState();
  playFunnyClashCutscene(state.clash);

  setTimeout(() => {
    document.getElementById('clash-modal').classList.add('hidden');
    if (attackerWins) {
      state.players[defP].tokens[defT].steps = -1;
      state.clash = null;
      nextTurn(true);
    } else {
      state.players[atkP].tokens[atkT].steps = -1;
      state.clash = null;
      nextTurn(dice === 6);
    }
  }, 2400);
}

function playFunnyClashCutscene(clash) {
  const modal = document.getElementById('clash-modal');
  modal.classList.remove('hidden');

  const gag = FUNNY_GAGS[clash.gagIdx];
  const winnerP = clash.attackerWins ? clash.atkP : clash.defP;
  const loserP  = clash.attackerWins ? clash.defP : clash.atkP;

  document.getElementById('clash-title').innerText = `★ ${gag.name} ★`;
  document.getElementById('clash-caption').innerText =
    clash.attackerWins
      ? `${COLOR_NAMES[winnerP]} BONKED ${COLOR_NAMES[loserP]}! ${gag.caption}`
      : `PLOT TWIST! ${COLOR_NAMES[winnerP]} REVERSED ${COLOR_NAMES[loserP]}!`;

  const c = document.getElementById('clash-canvas');
  const cx = c.getContext('2d');
  let frame = 0;

  const anim = setInterval(() => {
    frame++;
    if (frame > 45) { clearInterval(anim); return; }

    cx.fillStyle = '#0f172a';
    cx.fillRect(0, 0, 320, 170);
    cx.fillStyle = '#334155';
    cx.fillRect(0, 135, 320, 35);
    cx.fillStyle = '#facc15';
    cx.fillRect(0, 135, 320, 3);

    const hitFrame = 18;
    const atkX = frame < hitFrame ? 75 + frame * 5 : 155;
    const defX = frame < hitFrame ? 225 : 225 + (frame - hitFrame) * 9;
    const defY = frame < hitFrame ? 135 : 135 - (frame - hitFrame) * 7;

    if (frame === hitFrame) SFX.bonk();

    // Draw Winner Warrior
    drawMiniPixelHero(cx, atkX, 135, COLORS[winnerP], true, frame >= hitFrame);

    // Draw Flying Loser Warrior
    drawMiniPixelHero(cx, defX, defY, COLORS[loserP], false, false);

    // Comic "BONK!" Starburst at impact
    if (frame >= hitFrame && frame < hitFrame + 14) {
      cx.fillStyle = '#facc15';
      cx.font = 'bold 16px "Press Start 2P", monospace';
      cx.textAlign = 'center';
      cx.fillText('BONK!!', 190, 75 - (frame - hitFrame));
    }
  }, 45);
}

function drawMiniPixelHero(ctx, x, y, color, isWinner, swinging) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - 10, y - 14, 7, 14);
  ctx.fillRect(x + 3, y - 14, 7, 14);

  ctx.fillStyle = color;
  ctx.fillRect(x - 12, y - 36, 24, 22);

  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(x - 10, y - 52, 20, 16);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(x - 11, y - 50, 22, 5);

  if (isWinner) {
    ctx.fillStyle = '#facc15';
    if (swinging) {
      ctx.fillRect(x + 12, y - 32, 28, 10);
    } else {
      ctx.fillRect(x + 12, y - 56, 10, 28);
    }
  }
}

// ==========================================
// 8. HUD & TOASTS
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
  setTimeout(() => t.classList.add('hidden'), 1200);
}
