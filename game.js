// ==========================================
// 1. AUDIO + INDIAN MEME SOUNDBOARD ENGINE
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

const INDIAN_MEMES = [
  { file: 'sounds/chalaja.mp3',     text: 'CHALA JA BHOSDIKE! 😂',      voice: 'Chala jaa bhosdike!' },
  { file: 'sounds/maachudgayi.mp3', text: 'MAA CHUD GAYI ISKI TOH! 💀', voice: 'Maa chud gayi iski toh!' },
  { file: 'sounds/gaddari.mp3',     text: 'GADDARI KARBE!! 😡',         voice: 'Gaddari karbe teri behen ko!' },
  { file: 'sounds/lawde.mp3',       text: 'LAWDE LAG GAYE! 😭',         voice: 'Lawde lag gaye!' },
  { file: 'sounds/carry.mp3',       text: 'ABBE SAALE! 🔥',             voice: 'Abbe saale!' },
  { file: 'sounds/scout.mp3',       text: 'BHAI KYA KAR RAHA HAI TU?!', voice: 'Bhai kya kar raha hai tu!' },
  { file: 'sounds/khatam.mp3',      text: 'KHATAM! TATA! BYE BYE! 👋', voice: 'Khatam, tata, bye bye, gaya!' },
  { file: 'sounds/kaunhai.mp3',     text: 'KAUN HAIN YE LOG?! 🤔',      voice: 'Kaun hain ye log, kahan se aate hain!' },
  { file: 'sounds/moyemoye.mp3',    text: 'MOYE MOYE... 🎻',            voice: 'Moye moye!' },
  { file: 'sounds/emotional.mp3',   text: 'EMOTIONAL DAMAGE! 💥',       voice: 'Emotional damage!' }
];

function triggerIndianMemeSound() {
  if (!soundEnabled) return null;
  const meme = INDIAN_MEMES[Math.floor(Math.random() * INDIAN_MEMES.length)];

  const audio = new Audio(meme.file);
  audio.volume = 1.0;
  audio.play().catch(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(meme.voice);
      utter.lang = 'hi-IN';
      utter.rate = 1.15;
      utter.pitch = 1.05;
      window.speechSynthesis.speak(utter);
    }
  });

  return meme;
}

const SFX = {
  dice:  () => [340, 480, 640].forEach((f, i) => playTone(f, 'triangle', 0.06, i * 0.04, 0.14)),
  hop:   () => playTone(600, 'sine', 0.06, 0, 0.12),
  safe:  () => [523, 659, 784].forEach((f, i) => playTone(f, 'sine', 0.12, i * 0.06, 0.14)),
  chaos: () => [440, 587, 784, 1046].forEach((f, i) => playTone(f, 'square', 0.09, i * 0.05, 0.14)),
  bonk:  () => {
    playTone(520, 'square', 0.06, 0, 0.18);
    playTone(160, 'sawtooth', 0.22, 0.05, 0.22);
  },
  win:   () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => playTone(f, 'triangle', 0.15, i * 0.1, 0.16))
};

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-btn').innerText = soundEnabled ? '🔊' : '🔇';
}

// ==========================================
// 2. BOARD TRACKS & SECRET ITEM POOL
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

const SECRET_ITEM_POOL = [
  { type: 'BOOST', emoji: '⚡', bg: '#16a34a', toast: '⚡ SECRET BOOST +4 STEPS!' },
  { type: 'EXTRA', emoji: '🎲', bg: '#2563eb', toast: '🎲 SECRET EXTRA TURN!' },
  { type: 'BOMB',  emoji: '💣', bg: '#dc2626', toast: '💣 HIDDEN BOMB -3 STEPS!' },
  { type: 'WARP',  emoji: '🌀', bg: '#9333ea', toast: '🌀 SECRET WARP TO START!' }
];

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
// 3. THREE.JS AUTHENTIC LUDO KING 3D BOARD + SECRET ICONS
// ==========================================
let scene, boardGroup, camera, renderer, raycaster, mouseVec;
let pawnMeshes = {};
let chaosMeshes = {};
let cameraTopDown = false;
let hopState = null;

function createLudoBoardTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  const S = 1024 / 15;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1024, 1024);

  const bases = [
    [0, 9, COLORS[0]],
    [0, 0, COLORS[1]],
    [9, 0, COLORS[2]],
    [9, 9, COLORS[3]]
  ];
  bases.forEach(([gx, gy, col]) => {
    ctx.fillStyle = col;
    ctx.fillRect(gx * S, gy * S, 6 * S, 6 * S);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect((gx + 1) * S, (gy + 1) * S, 4 * S, 4 * S, 28);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    [[2,2],[3,2],[2,3],[3,3]].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.arc((gx + ox) * S + S / 2, (gy + oy) * S + S / 2, S * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    });
  });

  for (let gx = 0; gx < 15; gx++) {
    for (let gy = 0; gy < 15; gy++) {
      if ((gx < 6 && gy < 6) || (gx > 8 && gy < 6) || (gx < 6 && gy > 8) || (gx > 8 && gy > 8)) continue;
      if (gx >= 6 && gx <= 8 && gy >= 6 && gy <= 8) continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx * S, gy * S, S, S);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx * S, gy * S, S, S);
    }
  }

  HOME_STRETCH.forEach((path, pIdx) => {
    path.slice(0, 5).forEach(([gx, gy]) => {
      ctx.fillStyle = COLORS[pIdx];
      ctx.fillRect(gx * S + 2, gy * S + 2, S - 4, S - 4);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx * S, gy * S, S, S);
    });
    const [sx, sy] = MAIN_TRACK[START_INDEX[pIdx]];
    ctx.fillStyle = COLORS[pIdx];
    ctx.fillRect(sx * S + 2, sy * S + 2, S - 4, S - 4);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx * S, sy * S, S, S);
  });

  SAFE_INDICES.forEach(idx => {
    const [gx, gy] = MAIN_TRACK[idx];
    const isColoredStart = [0, 13, 26, 39].includes(idx);
    if (!isColoredStart) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(gx * S + 2, gy * S + 2, S - 4, S - 4);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx * S, gy * S, S, S);
    }
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isColoredStart ? '#ffffff' : '#0f172a';
    ctx.fillText('★', gx * S + S / 2, gy * S + S / 2 + 2);
  });

  const cx = 512, cy = 512;
  const x1 = 6 * S, y1 = 6 * S, x2 = 9 * S, y2 = 9 * S;
  const tris = [
    [[x1, y2], [x2, y2], COLORS[0]],
    [[x1, y1], [x1, y2], COLORS[1]],
    [[x1, y1], [x2, y1], COLORS[2]],
    [[x2, y1], [x2, y2], COLORS[3]]
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
    ctx.lineWidth = 4;
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

function makeEmojiSprite(emoji, bgColor) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(10, 10, 108, 108, 24);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.font = 'bold 68px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 68);

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.85, 0.85, 1);
  return sprite;
}

function initThreeBoard() {
  const container = document.getElementById('three-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  boardGroup = new THREE.Group();
  scene.add(boardGroup);

  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 18.5, 10.5);
  camera.lookAt(0, 0, 0.4);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(420, 420);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
  dirLight.position.set(6, 22, 10);
  scene.add(dirLight);

  const woodBase = new THREE.Mesh(
    new THREE.BoxGeometry(15.8, 0.7, 15.8),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 })
  );
  woodBase.position.y = -0.36;
  boardGroup.add(woodBase);

  const boardTex = createLudoBoardTexture();
  const boardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.15, 15),
    new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.3 })
  );
  boardMesh.position.y = 0.05;
  boardGroup.add(boardMesh);

  chaosMeshes = {};
  syncSecretMeshes();

  for (let pIdx = 0; pIdx < 4; pIdx++) {
    for (let tIdx = 0; tIdx < 4; tIdx++) {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: HEX_COLORS[pIdx], roughness: 0.22 });

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 18), bodyMat);
      cone.position.y = 0.58;
      group.add(cone);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), bodyMat);
      head.position.y = 1.08;
      group.add(head);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.54, 24),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.18;
      ring.visible = false;
      ring.name = 'highlightRing';
      group.add(ring);

      group.userData = { pIdx, tIdx };
      boardGroup.add(group);
      pawnMeshes[`${pIdx}-${tIdx}`] = group;
    }
  }

  raycaster = new THREE.Raycaster();
  mouseVec = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', onThreeBoardTap);

  let pulseTick = 0;
  function animateThree() {
    requestAnimationFrame(animateThree);
    pulseTick += 0.08;
    Object.values(chaosMeshes).forEach((spr, i) => {
      spr.position.y = 0.48 + Math.sin(pulseTick + i) * 0.12;
    });
    syncThreePawns();
    renderer.render(scene, camera);
  }
  animateThree();
}

function toggleCameraView() {
  cameraTopDown = !cameraTopDown;
  document.getElementById('cam-btn').innerText = cameraTopDown ? '🎥 TOP' : '🎥 3D';
  if (cameraTopDown) {
    camera.position.set(0, 22.5, 0.05);
    camera.lookAt(0, 0, 0);
  } else {
    camera.position.set(0, 18.5, 10.5);
    camera.lookAt(0, 0, 0.4);
  }
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

function syncSecretMeshes() {
  if (!boardGroup) return;
  const activeItems = state.secretItems || [];
  const viewerSeat = (gameMode === 'local') ? state.turn : (mySeat || 0);

  Object.keys(chaosMeshes).forEach(id => {
    const found = activeItems.find(it => it.id === id && !it.used);
    if (!found) {
      boardGroup.remove(chaosMeshes[id]);
      delete chaosMeshes[id];
    }
  });

  activeItems.forEach(item => {
    if (item.used) return;
    let spr = chaosMeshes[item.id];
    if (!spr) {
      spr = makeEmojiSprite(item.emoji, item.bg);
      const [gx, gy] = MAIN_TRACK[item.trackIdx];
      spr.position.set(gx - 7, 0.48, gy - 7);
      boardGroup.add(spr);
      chaosMeshes[item.id] = spr;
    }
    spr.visible = (item.owner === viewerSeat);
  });
}

function syncThreePawns() {
  if (boardGroup) boardGroup.rotation.y = -(mySeat || 0) * (Math.PI / 2);
  syncSecretMeshes();
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
// 4. GAME STATE & ONLINE PEERJS (ANTI-DUPLICATE JOIN)
// ==========================================
let gameMode = 'bot';
let mySeat = 0;
let isHost = true;
let peer = null;
let connections = [];
let hostConn = null;
let isJoining = false;
const CLIENT_UUID = 'DEV-' + Math.random().toString(36).substring(2, 10);

let state = {
  players: [],
  turn: 0,
  dice: 1,
  phase: 'ROLL',
  chaosEnabled: true,
  secretItems: [],
  clash: null
};

function generateSecretItemsForPlayers(configs, chaosEnabled) {
  if (!chaosEnabled) return [];
  const available = [];
  for (let i = 0; i < 52; i++) {
    if (!SAFE_INDICES.includes(i)) available.push(i);
  }
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  const items = [];
  let cursor = 0;
  configs.forEach((cfg, seat) => {
    if (!cfg.active) return;
    const shuffledPool = [...SECRET_ITEM_POOL].sort(() => Math.random() - 0.5);
    shuffledPool.forEach((tpl, idx) => {
      if (cursor >= available.length) return;
      items.push({
        id: `S-${seat}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        owner: seat,
        trackIdx: available[cursor++],
        type: tpl.type,
        emoji: tpl.emoji,
        bg: tpl.bg,
        toast: tpl.toast,
        used: false
      });
    });
  });
  return items;
}

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
    secretItems: generateSecretItemsForPlayers(configs, chaosEnabled),
    clash: null
  };
}

function showOnlineLobby() {
  document.getElementById('online-panel').classList.remove('hidden');
}

function hostOnlineGame() {
  if (peer) return;
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  isHost = true;
  mySeat = 0;
  document.getElementById('host-info').classList.remove('hidden');
  document.getElementById('room-code-display').innerText = code;
  peer = new Peer('LUDOPARTY-' + code);
  const myName = document.getElementById('player-name').value.trim() || 'Host';
  let members = [{ seat: 0, name: myName, uuid: CLIENT_UUID }];

  peer.on('open', () => {
    document.getElementById('net-status').innerText = 'Room Ready! Share code!';
    document.getElementById('start-online-btn').classList.remove('hidden');
  });

  peer.on('connection', conn => {
    conn.on('data', d => {
      if (d.type === 'HELLO') {
        const existing = members.find(m => m.uuid === d.uuid);
        if (existing) {
          conn.send({ type: 'WELCOME', seat: existing.seat });
          return;
        }
        if (members.length >= 4) {
          conn.send({ type: 'FULL' });
          setTimeout(() => conn.close(), 200);
          return;
        }
        const seat = members.length;
        connections.push(conn);
        members.push({ seat, name: d.name, uuid: d.uuid });
        document.getElementById('lobby-players-list').innerText =
          'Joined (' + members.length + '/4): ' + members.map(m => m.name).join(', ');
        conn.send({ type: 'WELCOME', seat });
      } else if (d.type === 'ACTION') {
        const sender = members.find(m => m.uuid === d.uuid);
        const seat = sender ? sender.seat : 1;
        handleRemoteAction(seat, d);
      }
    });
  });
  window._members = members;
}

function joinOnlineGame() {
  if (isJoining || (hostConn && hostConn.open)) return;
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  if (code.length < 4) return;

  isJoining = true;
  isHost = false;
  const joinBtn = document.querySelector('.join-bar button');
  if (joinBtn) joinBtn.disabled = true;
  document.getElementById('net-status').innerText = 'Connecting to ' + code + '...';

  if (peer) peer.destroy();
  peer = new Peer();
  peer.on('open', () => {
    hostConn = peer.connect('LUDOPARTY-' + code);
    hostConn.on('open', () => {
      hostConn.send({
        type: 'HELLO',
        uuid: CLIENT_UUID,
        name: document.getElementById('player-name').value.trim() || 'Guest'
      });
      document.getElementById('net-status').innerText = 'Connected! Waiting for Host...';
    });
    hostConn.on('data', d => {
      if (d.type === 'WELCOME') {
        mySeat = d.seat;
        document.getElementById('net-status').innerText =
          'Joined as ' + COLOR_NAMES[mySeat] + '! Waiting for Host...';
      } else if (d.type === 'FULL') {
        document.getElementById('net-status').innerText = 'Room is Full (4/4)!';
        isJoining = false;
        if (joinBtn) joinBtn.disabled = false;
      } else if (d.type === 'SYNC') {
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
    hostConn.on('error', () => {
      isJoining = false;
      if (joinBtn) joinBtn.disabled = false;
      document.getElementById('net-status').innerText = 'Connection failed. Try again.';
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
  else if (hostConn && hostConn.open) hostConn.send({ type: 'ACTION', uuid: CLIENT_UUID, ...obj });
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

// ==========================================
// 6. DICE, TOKEN MOVEMENT & SECRET POWER-UPS
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

    const landedItem = (state.secretItems || []).find(it => !it.used && it.trackIdx === gIdx);
    if (landedItem) {
      landedItem.used = true;
      SFX.chaos();
      const ownerLabel = landedItem.owner === pIdx ? 'YOUR' : `${COLOR_NAMES[landedItem.owner]}'S`;
      showToast(`${ownerLabel} ${landedItem.toast}`);

      if (landedItem.type === 'BOOST') {
        token.steps = Math.min(55, token.steps + 4);
      } else if (landedItem.type === 'BOMB') {
        token.steps = Math.max(0, token.steps - 3);
      } else if (landedItem.type === 'WARP') {
        token.steps = 0;
      } else if (landedItem.type === 'EXTRA') {
        nextTurn(true);
        return;
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
// 7. FLIPNOTE ANIME STICKMAN CLASH CUTSCENES + MEME AUDIO
// ==========================================
const STICKMAN_FINISHERS = [
  { id: 'HAMMER_100T',  title: '★ 100t HAMMER SMASH! ★',   caption: 'SQUASHED FLAT BY 100 TONS!' },
  { id: 'SPEAR_SLAM',   title: '★ METEOR SPEAR DIVE! ★',   caption: 'CRATER IMPACT!! BACK TO BASE!' },
  { id: 'GUN_BARRAGE',  title: '★ RAPID ANIME BARRAGE! ★', caption: 'BLASTED INTO ORBIT!!' },
  { id: 'FIRE_TRIDENT', title: '★ FLAME & TRIDENT COMBO! ★', caption: 'LAUNCHED OUT OF THE ARENA!' }
];

function playAnimeImpactSFX(step) {
  if (!soundEnabled) return;
  if (step === 'dash') {
    playTone(320, 'triangle', 0.08, 0, 0.14);
  } else if (step === 'hit') {
    playTone(540, 'square', 0.05, 0, 0.18);
    playTone(130, 'sawtooth', 0.2, 0.03, 0.24);
  } else if (step === 'shot') {
    playTone(880, 'square', 0.04, 0, 0.14);
    playTone(260, 'sawtooth', 0.05, 0.01, 0.14);
  } else if (step === 'boom') {
    [180, 120, 80, 55].forEach((f, i) => playTone(f, 'sawtooth', 0.22, i * 0.05, 0.25));
  }
}

function triggerInstantFunnyClash(atkP, atkT, defP, defT, dice) {
  const meme = triggerIndianMemeSound();
  const memeText = meme ? meme.text : 'GOTI CUT!!';

  if (Math.random() < 0.70) {
    SFX.bonk();
    showToast(`${COLOR_NAMES[atkP]}: ${memeText}`);
    state.players[defP].tokens[defT].steps = -1;
    broadcastState();
    setTimeout(() => nextTurn(true), 650);
    return;
  }

  const attackerWins = Math.random() < 0.80;
  const gagIdx = Math.floor(Math.random() * STICKMAN_FINISHERS.length);

  state.phase = 'CLASH';
  state.clash = { atkP, atkT, defP, defT, attackerWins, gagIdx, memeText };
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
  }, 2650);
}

function drawStickman(ctx, x, y, dir, pose, strokeCol, badgeCol, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale);
  ctx.strokeStyle = strokeCol;
  ctx.fillStyle = strokeCol;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (pose === 'flat') {
    ctx.beginPath();
    ctx.ellipse(0, -3, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = badgeCol;
    ctx.fillRect(-10, -6, 20, 3);
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.arc(0, -36, 8, 0, Math.PI * 2);
  if (pose === 'victim' || pose === 'air') ctx.fill();
  else ctx.stroke();

  ctx.fillStyle = badgeCol;
  ctx.fillRect(-7, -42, 14, 4);

  ctx.beginPath();
  if (pose === 'run') {
    ctx.moveTo(-3, -28); ctx.lineTo(4, -14);
    ctx.moveTo(4, -14); ctx.lineTo(14, 0);
    ctx.moveTo(4, -14); ctx.lineTo(-10, -4);
    ctx.moveTo(0, -24); ctx.lineTo(14, -22);
    ctx.moveTo(0, -24); ctx.lineTo(-12, -18);
  } else if (pose === 'jump') {
    ctx.moveTo(0, -28); ctx.lineTo(0, -14);
    ctx.moveTo(0, -14); ctx.lineTo(10, -6);
    ctx.moveTo(0, -14); ctx.lineTo(-8, -4);
    ctx.moveTo(0, -25); ctx.lineTo(12, -38);
    ctx.moveTo(0, -25); ctx.lineTo(-12, -34);
  } else if (pose === 'air') {
    ctx.moveTo(0, -28); ctx.lineTo(-12, -18);
    ctx.moveTo(-12, -18); ctx.lineTo(-22, -24);
    ctx.moveTo(-12, -18); ctx.lineTo(-18, -10);
    ctx.moveTo(-4, -24); ctx.lineTo(8, -32);
  } else if (pose === 'gun') {
    ctx.moveTo(-4, -28); ctx.lineTo(-2, -14);
    ctx.moveTo(-2, -14); ctx.lineTo(10, 0);
    ctx.moveTo(-2, -14); ctx.lineTo(-12, 0);
    ctx.moveTo(-3, -25); ctx.lineTo(14, -32);
    ctx.stroke();
    ctx.fillStyle = strokeCol;
    ctx.fillRect(12, -37, 11, 5);
    ctx.fillRect(12, -33, 4, 6);
    ctx.restore();
    return;
  } else {
    ctx.moveTo(0, -28); ctx.lineTo(0, -13);
    ctx.moveTo(0, -13); ctx.lineTo(8, 0);
    ctx.moveTo(0, -13); ctx.lineTo(-8, 0);
    ctx.moveTo(0, -24); ctx.lineTo(10, -16);
    ctx.moveTo(0, -24); ctx.lineTo(-10, -16);
  }
  ctx.stroke();
  ctx.restore();
}

function playFunnyClashCutscene(clash) {
  const modal = document.getElementById('clash-modal');
  modal.classList.remove('hidden');

  const gag = STICKMAN_FINISHERS[clash.gagIdx];
  const winnerP = clash.attackerWins ? clash.atkP : clash.defP;
  const loserP  = clash.attackerWins ? clash.defP : clash.atkP;

  document.getElementById('clash-title').innerText = gag.title;
  document.getElementById('clash-caption').innerText =
    clash.memeText
      ? clash.memeText
      : (clash.attackerWins
          ? `${COLOR_NAMES[winnerP]} WRECKED ${COLOR_NAMES[loserP]}! ${gag.caption}`
          : `REVERSAL! ${COLOR_NAMES[winnerP]} COUNTERED ${COLOR_NAMES[loserP]}!`);

  const c = document.getElementById('clash-canvas');
  const cx = c.getContext('2d');
  let f = 0;

  playAnimeImpactSFX('dash');

  const anim = setInterval(() => {
    f++;
    if (f > 54) { clearInterval(anim); return; }

    const isImpactInvert =
      (gag.id === 'HAMMER_100T' && (f === 26 || f === 27)) ||
      (gag.id === 'SPEAR_SLAM'  && (f === 24 || f === 25 || f === 26)) ||
      (gag.id === 'GUN_BARRAGE' && (f === 22 || f === 28 || f === 34 || f >= 46)) ||
      (gag.id === 'FIRE_TRIDENT'&& (f === 20 || f === 32));

    const bg = isImpactInvert ? '#090d16' : '#f8fafc';
    const fg = isImpactInvert ? '#f8fafc' : '#090d16';

    cx.fillStyle = bg;
    cx.fillRect(0, 0, 320, 170);

    cx.strokeStyle = fg;
    cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(0, 145);
    cx.lineTo(320, 145);
    cx.stroke();

    const winCol = COLORS[winnerP];
    const loseCol = COLORS[loserP];

    if (gag.id === 'HAMMER_100T') {
      if (f === 26) playAnimeImpactSFX('hit');
      const wx = f < 16 ? 60 + f * 7 : 172;
      const wy = f < 16 ? 145 : (f < 26 ? 145 - Math.sin(((f - 16) / 10) * Math.PI) * 65 : 145);
      const loserPose = f >= 26 ? 'flat' : 'victim';

      drawStickman(cx, 225, 145, -1, loserPose, fg, loseCol);
      drawStickman(cx, wx, wy, 1, f < 26 ? 'jump' : 'run', fg, winCol);

      if (f >= 16) {
        cx.save();
        cx.translate(wx + 24, wy - 18);
        cx.rotate(f < 26 ? -0.9 : 0.05);
        cx.strokeStyle = fg;
        cx.lineWidth = 4;
        cx.beginPath(); cx.moveTo(-18, 0); cx.lineTo(25, 0); cx.stroke();
        cx.fillStyle = fg;
        cx.fillRect(14, -26, 36, 52);
        cx.fillStyle = bg;
        cx.font = 'bold 10px "Press Start 2P", monospace';
        cx.textAlign = 'center';
        cx.fillText('100t', 32, 4);
        cx.restore();
      }
      if (f >= 26 && f < 38) {
        cx.strokeStyle = fg;
        cx.beginPath();
        cx.moveTo(185, 145); cx.lineTo(165, 125);
        cx.moveTo(265, 145); cx.lineTo(285, 125);
        cx.stroke();
      }
    } else if (gag.id === 'SPEAR_SLAM') {
      if (f === 24) playAnimeImpactSFX('hit');
      if (f < 24) {
        const diveT = f / 24;
        const wx = 90 + diveT * 120;
        const wy = 25 + diveT * 115;
        drawStickman(cx, 220, 145, -1, 'victim', fg, loseCol);
        drawStickman(cx, wx, wy, 1, 'jump', fg, winCol);
        cx.strokeStyle = fg;
        cx.lineWidth = 3;
        cx.beginPath();
        cx.moveTo(wx - 15, wy - 45);
        cx.lineTo(wx + 24, wy - 5);
        cx.stroke();
      } else {
        const fly = (f - 24) * 11;
        drawStickman(cx, 210, 145, 1, 'run', fg, winCol);
        drawStickman(cx, 230 + fly, 130 - fly * 0.9, -1, 'air', fg, loseCol);
        cx.strokeStyle = fg;
        cx.lineWidth = 3;
        for (let i = -3; i <= 3; i++) {
          cx.beginPath();
          cx.moveTo(215, 145);
          cx.lineTo(215 + i * 18, 145 - (4 - Math.abs(i)) * 16);
          cx.stroke();
        }
      }
    } else if (gag.id === 'GUN_BARRAGE') {
      if (f === 18 || f === 24 || f === 30 || f === 36) playAnimeImpactSFX('shot');
      if (f === 46) playAnimeImpactSFX('boom');

      drawStickman(cx, 68, 145, 1, f >= 14 ? 'gun' : 'run', fg, winCol);

      const lx = f < 14 ? 210 : Math.min(285, 210 + (f - 14) * 2.5);
      const ly = f < 14 ? 145 : Math.max(32, 145 - (f - 14) * 3.5);
      if (f < 46) {
        drawStickman(cx, lx, ly, -1, f < 14 ? 'victim' : 'air', fg, loseCol);
      }

      if (f >= 16 && f < 46 && f % 2 === 0) {
        cx.strokeStyle = fg;
        cx.lineWidth = 2.5;
        cx.beginPath();
        cx.moveTo(92, 110);
        cx.lineTo(lx - 8, ly - 20 + (Math.random() - 0.5) * 14);
        cx.stroke();
        cx.beginPath();
        cx.arc(94, 110, 8, 0, Math.PI * 2);
        cx.stroke();
      }

      if (f >= 46) {
        const rad = (f - 45) * 26;
        cx.strokeStyle = fg;
        cx.lineWidth = 5;
        cx.beginPath();
        cx.arc(265, 45, rad, 0, Math.PI * 2);
        cx.stroke();
      }
    } else {
      if (f === 20 || f === 32) playAnimeImpactSFX('hit');
      const wx = f < 18 ? 60 + f * 7 : 186;
      const ly = f < 20 ? 145 : (f < 32 ? 145 - (f - 20) * 6 : 73 - (f - 32) * 8);
      const lx = f < 32 ? 215 : 215 + (f - 32) * 10;

      drawStickman(cx, wx, 145, 1, f < 20 ? 'run' : 'jump', fg, winCol);
      drawStickman(cx, lx, ly, -1, f < 20 ? 'victim' : 'air', fg, loseCol);

      if (f >= 16 && f < 28) {
        cx.strokeStyle = fg;
        cx.lineWidth = 2.5;
        cx.beginPath();
        cx.moveTo(wx + 12, 120);
        cx.lineTo(wx + 24, 98);
        cx.lineTo(wx + 32, 112);
        cx.lineTo(wx + 38, 92);
        cx.stroke();
      }

      if (f >= 28) {
        cx.strokeStyle = fg;
        cx.lineWidth = 3;
        cx.beginPath();
        cx.moveTo(wx + 8, 122);
        cx.lineTo(wx + 58, 86);
        cx.moveTo(wx + 58, 86); cx.lineTo(wx + 70, 74);
        cx.moveTo(wx + 52, 82); cx.lineTo(wx + 64, 70);
        cx.moveTo(wx + 62, 92); cx.lineTo(wx + 74, 80);
        cx.stroke();
      }
    }
  }, 48);
}

// ==========================================
// 8. PER-PLAYER PERSPECTIVE HUD & TOASTS
// ==========================================
function getVisualSlotForSeat(seat) {
  return (seat - (mySeat || 0) + 4) % 4;
}

function showEmoteBubble(seat, emoji) {
  const slot = getVisualSlotForSeat(seat);
  const el = document.getElementById(`emote-${slot}`);
  if (!el) return;
  el.innerText = emoji;
  el.classList.remove('hidden');
  playTone(720, 'sine', 0.08, 0, 0.09);
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 1800);
}

function updateHUD() {
  const LETTERS = ['R', 'G', 'Y', 'B'];
  state.players.forEach((p, seat) => {
    const slot = getVisualSlotForSeat(seat);
    const card = document.getElementById(`pcard-${slot}`);
    if (!p.active) { card.style.visibility = 'hidden'; return; }
    card.style.visibility = 'visible';
    card.classList.toggle('active-turn', state.turn === seat);

    const avatar = card.querySelector('.lk-avatar');
    if (avatar) {
      avatar.style.background = COLORS[seat];
      avatar.innerText = LETTERS[seat];
    }
    document.getElementById(`pname-${slot}`).innerText = p.name;
    const home = p.tokens.filter(t => t.steps === 56).length;
    document.getElementById(`pscore-${slot}`).innerText = `🏠${home}/4`;
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
