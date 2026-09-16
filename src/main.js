import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <div class="game-shell">
    <header class="hud">
      <div>
        <p class="label">Selfie Flap</p>
        <h1>Smile and fly</h1>
      </div>
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
    </header>

    <div class="game-stage">
      <canvas id="gameCanvas" width="420" height="700"></canvas>

      <div id="startOverlay" class="overlay hidden">
        <div class="panel">
          <p class="eyebrow">Player loaded</p>
          <h2>Ready to fly</h2>
          <p class="summary">Tap to start the run with your custom player.</p>
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

const state = {
  playing: false,
  started: false,
  gameOver: false,
  score: 0,
  bestScore: Number(localStorage.getItem('selfieFlapBest') || 0),
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
  cameraStream: null,
}

bestScoreEl.textContent = state.bestScore

function loadDefaultPlayerImage() {
  const img = new Image()
  img.onload = () => {
    state.selfieImage = img
    state.started = false
    state.playing = false
    state.gameOver = false
    state.score = 0
    scoreEl.textContent = '0'
    state.bird.y = 320
    state.bird.velocity = 0
    state.pipes = []
    state.spawnTimer = 90
    gameOverOverlay.classList.add('hidden')
    startOverlay.classList.add('hidden')
    render()
  }
  img.src = '/player.jpg'
}

function beginRun() {
  if (!state.selfieImage) {
    startOverlay.classList.remove('hidden')
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
    localStorage.setItem('selfieFlapBest', String(state.bestScore))
    bestScoreEl.textContent = state.bestScore
  }
  finalScoreEl.textContent = state.score
  gameOverOverlay.classList.remove('hidden')
}

function flap() {
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

function distanceToRect(pointX, pointY, rectX, rectY, rectW, rectH) {
  const nearestX = Math.max(rectX, Math.min(pointX, rectX + rectW))
  const nearestY = Math.max(rectY, Math.min(pointY, rectY + rectH))
  const dx = pointX - nearestX
  const dy = pointY - nearestY
  return Math.sqrt(dx * dx + dy * dy)
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

  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(x - 9, y - 7, 3, 0, Math.PI * 2)
  ctx.arc(x + 9, y - 7, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y + 8, 7, 0, Math.PI)
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

restartBtn.addEventListener('click', () => {
  if (state.selfieImage) {
    beginRun()
  } else {
    loadDefaultPlayerImage()
    gameOverOverlay.classList.add('hidden')
  }
})

startBtn.addEventListener('click', () => {
  if (!state.selfieImage) {
    loadDefaultPlayerImage()
  }
  beginRun()
})

window.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button') || event.target.closest('label') || event.target.closest('input')) {
    return
  }
  flap()
})

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault()
    flap()
  }
})

scoreEl.textContent = '0'
bestScoreEl.textContent = String(state.bestScore)
loadDefaultPlayerImage()
render()
