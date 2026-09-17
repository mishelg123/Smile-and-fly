import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <div id="gameView" class="app-view">
    <div class="game-shell">
      <header class="hud">
        <div>
          <p class="label">Selfie Flap</p>
          <h1>Smile and fly</h1>
        </div>

        <div class="hud-actions">
          <button id="leaderboardBtn" class="secondary compact" type="button">Leaderboard</button>
          <div class="scores">
            <div class="score-box">
              <span>Score</span>
              <strong id="score">0</strong>
            </div>
            <div class="score-box">
              <span>Best</span>
              <strong id="best-score">0</strong>
            </div>
          </div>
        </div>
      </header>

      <div class="game-stage">
        <canvas id="gameCanvas" width="420" height="700"></canvas>

        <div id="startOverlay" class="overlay visible">
          <div class="panel">
            <p class="eyebrow">Player profile</p>
            <h2>Who is flying?</h2>

            <label class="name-label" for="playerNameInput">Your name</label>
            <input id="playerNameInput" type="text" maxlength="14" placeholder="Enter your name" />

            <button id="startBtn" class="primary" type="button">Start flying</button>
          </div>
        </div>

        <div id="gameOverOverlay" class="overlay hidden">
          <div class="panel small">
            <p class="eyebrow">Round complete</p>
            <h2>Game Over</h2>
            <p class="summary">You scored <span id="finalScore">0</span> points</p>
            <button id="restartBtn" class="primary" type="button">Play again</button>
          </div>
        </div>
      </div>

      <p class="controls">Tap, click, or press space to flap</p>
    </div>
  </div>

  <div id="leaderboardView" class="app-view hidden">
    <div class="leaderboard-page">
      <header class="leaderboard-top">
        <div>
          <p class="label">Hall of fame</p>
          <h2>Top players</h2>
        </div>
        <button id="backToGameBtn" class="secondary" type="button">Back to game</button>
      </header>

      <div class="leaderboard-card">
        <div class="leaderboard-header">
          <h3>Best scores</h3>
          <span>Updated live</span>
        </div>
        <ol id="leaderboardPageList" class="leaderboard-list"></ol>
      </div>
    </div>
  </div>
`

const canvas = document.querySelector('#gameCanvas')
const ctx = canvas.getContext('2d')
const scoreEl = document.querySelector('#score')
const bestScoreEl = document.querySelector('#best-score')
const finalScoreEl = document.querySelector('#finalScore')
const startOverlay = document.querySelector('#startOverlay')
const gameOverOverlay = document.querySelector('#gameOverOverlay')
const restartBtn = document.querySelector('#restartBtn')
const startBtn = document.querySelector('#startBtn')
const playerNameInput = document.querySelector('#playerNameInput')
const leaderboardPageList = document.querySelector('#leaderboardPageList')
const gameView = document.querySelector('#gameView')
const leaderboardView = document.querySelector('#leaderboardView')
const leaderboardBtn = document.querySelector('#leaderboardBtn')
const backToGameBtn = document.querySelector('#backToGameBtn')

const STORAGE_KEYS = {
  playerName: 'selfieFlapPlayerName',
  bestScore: 'selfieFlapBest',
  leaderboard: 'selfieFlapLeaderboard',
}

const state = {
  playing: false,
  started: false,
  gameOver: false,
  score: 0,
  bestScore: Number(localStorage.getItem(STORAGE_KEYS.bestScore) || 0),
  playerName: localStorage.getItem(STORAGE_KEYS.playerName) || 'Player',
  selfieImage: null,
  bird: {
    x: 120,
    y: 320,
    radius: 28,
    velocity: 0,
  },
  pipes: [],
  lastTimestamp: 0,
  spawnTimer: 0,
  groundHeight: 88,
}

function showGameView() {
  gameView.classList.remove('hidden')
  leaderboardView.classList.add('hidden')
}

function showLeaderboardView() {
  leaderboardView.classList.remove('hidden')
  gameView.classList.add('hidden')
  renderLeaderboard()
}

function isStartScreenVisible() {
  return !startOverlay.classList.contains('hidden')
}

bestScoreEl.textContent = state.bestScore
playerNameInput.value = state.playerName

function getLeaderboard() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.leaderboard) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function renderLeaderboard() {
  const leaderboard = [...getLeaderboard()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  leaderboardPageList.innerHTML = leaderboard.length
    ? leaderboard.map((entry, index) => `
        <li>
          <span class="rank">#${index + 1}</span>
          <span class="name">${entry.name}</span>
          <span class="score">${entry.score}</span>
        </li>
      `).join('')
    : '<li class="empty">No scores yet</li>'
}

function savePlayerScore(score) {
  const name = (state.playerName || 'Player').trim().slice(0, 14) || 'Player'
  const leaderboard = getLeaderboard()
  const existingIndex = leaderboard.findIndex((entry) => entry.name.toLowerCase() === name.toLowerCase())
  const updatedScore = Number(score) || 0

  if (existingIndex >= 0) {
    leaderboard[existingIndex].score = Math.max(Number(leaderboard[existingIndex].score) || 0, updatedScore)
  } else {
    leaderboard.push({ name, score: updatedScore })
  }

  const finalBoard = leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(finalBoard))
  renderLeaderboard()
}

function loadDefaultPlayerImage(onReady) {
  if (state.selfieImage) {
    if (typeof onReady === 'function') onReady()
    return
  }

  const img = new Image()
  img.onload = () => {
    state.selfieImage = img
    render()
    if (typeof onReady === 'function') onReady()
  }
  img.src = '/player.jpg'
}

function beginRun() {
  if (!state.selfieImage) {
    loadDefaultPlayerImage(() => beginRun())
    return
  }

  state.score = 0
  scoreEl.textContent = '0'
  state.bird.y = 320
  state.bird.velocity = 0
  state.pipes = []
  state.spawnTimer = 90
  state.started = false
  state.playing = true
  state.gameOver = false
  gameOverOverlay.classList.add('hidden')
  startOverlay.classList.add('hidden')
  state.lastTimestamp = 0
  requestAnimationFrame(gameLoop)
}

function endRun() {
  if (state.gameOver) return

  state.playing = false
  state.gameOver = true

  if (state.score > state.bestScore) {
    state.bestScore = state.score
    localStorage.setItem(STORAGE_KEYS.bestScore, String(state.bestScore))
    bestScoreEl.textContent = state.bestScore
  }

  savePlayerScore(state.score)
  finalScoreEl.textContent = state.score
  gameOverOverlay.classList.remove('hidden')
}

function flap() {
  if (leaderboardView.classList.contains('hidden') === false) return

  if (!state.selfieImage) {
    loadDefaultPlayerImage()
    return
  }

  if (!state.started && !state.gameOver) {
    state.started = true
    state.playing = true
    state.bird.velocity = -7.5
    state.lastTimestamp = 0
    requestAnimationFrame(gameLoop)
    return
  }

  if (state.gameOver) {
    beginRun()
    return
  }

  state.bird.velocity = -7.5
}

function pipeGap() {
  return 170 + Math.random() * 50
}

function createPipe() {
  const width = 72
  const gap = pipeGap()
  const minTop = 110
  const maxTop = canvas.height - state.groundHeight - gap - 130
  const topHeight = minTop + Math.random() * Math.max(1, maxTop - minTop)

  state.pipes.push({
    x: canvas.width + 20,
    width,
    gap,
    topHeight,
    scored: false,
  })
}

function hitPipe(pipe) {
  const birdLeft = state.bird.x - state.bird.radius
  const birdRight = state.bird.x + state.bird.radius
  const birdTop = state.bird.y - state.bird.radius
  const birdBottom = state.bird.y + state.bird.radius

  const topRect = {
    x: pipe.x,
    y: 0,
    w: pipe.width,
    h: pipe.topHeight,
  }
  const bottomY = pipe.topHeight + pipe.gap
  const bottomRect = {
    x: pipe.x,
    y: bottomY,
    w: pipe.width,
    h: canvas.height - state.groundHeight - bottomY,
  }

  const collideTop = birdRight > topRect.x && birdLeft < topRect.x + topRect.w && birdBottom > topRect.y && birdTop < topRect.h
  const collideBottom = birdRight > bottomRect.x && birdLeft < bottomRect.x + bottomRect.w && birdBottom > bottomRect.y && birdTop < bottomRect.y + bottomRect.h

  return collideTop || collideBottom
}

function update(dt) {
  state.bird.velocity += 0.38 * dt
  state.bird.y += state.bird.velocity * dt

  state.spawnTimer -= dt
  if (state.spawnTimer <= 0) {
    createPipe()
    state.spawnTimer = 95
  }

  state.pipes.forEach((pipe) => {
    pipe.x -= 3.3 * dt

    if (!pipe.scored && pipe.x + pipe.width < state.bird.x) {
      pipe.scored = true
      state.score += 1
      scoreEl.textContent = String(state.score)
    }

    if (hitPipe(pipe)) {
      endRun()
    }
  })

  state.pipes = state.pipes.filter((pipe) => pipe.x + pipe.width > -20)

  if (state.bird.y - state.bird.radius <= 0) {
    state.bird.y = state.bird.radius
    state.bird.velocity = 0
  }

  if (state.bird.y + state.bird.radius >= canvas.height - state.groundHeight) {
    state.bird.y = canvas.height - state.groundHeight - state.bird.radius
    endRun()
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, '#7dd3fc')
  sky.addColorStop(0.7, '#d7f3ff')
  sky.addColorStop(1, '#fef3c7')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.arc(330, 100, 40, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  for (const cloud of [
    { x: 70, y: 110, w: 56, h: 26 },
    { x: 220, y: 170, w: 70, h: 28 },
    { x: 320, y: 230, w: 58, h: 22 },
  ]) {
    ctx.beginPath()
    ctx.arc(cloud.x, cloud.y, cloud.h / 2, 0, Math.PI * 2)
    ctx.arc(cloud.x + cloud.w * 0.2, cloud.y - 12, cloud.h / 2, 0, Math.PI * 2)
    ctx.arc(cloud.x + cloud.w * 0.55, cloud.y - 8, cloud.h / 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGround() {
  ctx.fillStyle = '#65a30d'
  ctx.fillRect(0, canvas.height - state.groundHeight, canvas.width, state.groundHeight)
  ctx.fillStyle = '#a3e635'
  ctx.fillRect(0, canvas.height - state.groundHeight, canvas.width, 12)

  for (let x = 0; x < canvas.width + 30; x += 25) {
    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(x, canvas.height - state.groundHeight + 16, 12, 8)
  }
}

function drawPipe(pipe) {
  const topHeight = pipe.topHeight
  const bottomY = pipe.topHeight + pipe.gap
  const pipeColor = '#16a34a'

  ctx.fillStyle = pipeColor
  ctx.fillRect(pipe.x, 0, pipe.width, topHeight)
  ctx.fillRect(pipe.x - 8, topHeight - 22, pipe.width + 16, 22)

  ctx.fillStyle = '#22c55e'
  ctx.fillRect(pipe.x, bottomY, pipe.width, canvas.height - state.groundHeight - bottomY)
  ctx.fillRect(pipe.x - 8, bottomY, pipe.width + 16, 22)
}

function drawSelfieBird() {
  const { x, y, radius } = state.bird

  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.clip()

  if (state.selfieImage) {
    ctx.drawImage(state.selfieImage, x - radius, y - radius, radius * 2, radius * 2)
  } else {
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }

  ctx.restore()

  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, radius - 2, 0, Math.PI * 2)
  ctx.stroke()
}

function render() {
  drawBackground()
  state.pipes.forEach(drawPipe)
  drawGround()
  drawSelfieBird()
}

function gameLoop(timestamp) {
  if (!state.playing) return

  if (!state.lastTimestamp) {
    state.lastTimestamp = timestamp
  }

  const dt = Math.min((timestamp - state.lastTimestamp) / 16.67, 1.8)
  state.lastTimestamp = timestamp

  update(dt)
  render()

  if (state.playing) {
    requestAnimationFrame(gameLoop)
  }
}

startBtn.addEventListener('click', () => {
  const enteredName = playerNameInput.value.trim()
  if (!enteredName) {
    playerNameInput.focus()
    return
  }

  state.playerName = enteredName
  localStorage.setItem(STORAGE_KEYS.playerName, state.playerName)
  playerNameInput.value = state.playerName

  if (!state.selfieImage) {
    loadDefaultPlayerImage(() => beginRun())
    return
  }

  beginRun()
})

leaderboardBtn.addEventListener('click', showLeaderboardView)
backToGameBtn.addEventListener('click', showGameView)

restartBtn.addEventListener('click', () => {
  if (state.selfieImage) {
    beginRun()
  } else {
    loadDefaultPlayerImage(() => beginRun())
    gameOverOverlay.classList.add('hidden')
  }
})

window.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button') || event.target.closest('label') || event.target.closest('input')) {
    return
  }

  if (leaderboardView.classList.contains('hidden') && !isStartScreenVisible()) {
    event.preventDefault()
    flap()
  }
})

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault()
    if (leaderboardView.classList.contains('hidden') && !isStartScreenVisible()) {
      flap()
    }
  }
})

window.addEventListener('dblclick', (event) => {
  event.preventDefault()
})

window.addEventListener('touchstart', (event) => {
  if (event.touches.length > 1) {
    event.preventDefault()
  }
}, { passive: false })

scoreEl.textContent = '0'
bestScoreEl.textContent = String(state.bestScore)
renderLeaderboard()
loadDefaultPlayerImage()
render()
