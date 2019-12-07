const TILE_SIZE = 48
const MAP_NUM_ROWS = 11
const MAP_NUM_COLS = 15

const WINDOW_WIDTH = MAP_NUM_COLS * TILE_SIZE
const WINDOW_HEIGHT = MAP_NUM_ROWS * TILE_SIZE

const FOV_ANGLE = 60 * (Math.PI / 180)
const DIST_PROJ_PLANE = (WINDOW_WIDTH / 2) / Math.tan(FOV_ANGLE / 2)

const WALL_STRIP_WIDTH = 1
const NUM_RAYS = WINDOW_WIDTH / WALL_STRIP_WIDTH

const DIRECTION = {
  left: -1,
  none: 0,
  right: 1
}

const MINIMAP_SCALE_FACTOR = 0.2

class Grid {
  #map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ]

  isCollides(obj) {
    if (!obj || !Number.isFinite(obj.x) || !Number.isFinite(obj.y)) {
      throw new Error('[isCollides] Invalid object provided! {obj}', obj)
    }

    if (obj.x < 0 || obj.x > WINDOW_WIDTH || obj.y < 0 || obj.y > WINDOW_HEIGHT) {
      return true
    }

    const x = Math.floor(obj.x / TILE_SIZE)
    const y = Math.floor(obj.y / TILE_SIZE)

    return this.#map[y][x] === 1
  }

  render() {
    for (let i = 0; i < MAP_NUM_ROWS; i++) {
      const y = i * TILE_SIZE
      for (let j = 0; j < MAP_NUM_COLS; j++) {
        const x = j * TILE_SIZE
        const color = this.#map[i][j] === 1 ? '#222' : '#fff'
        stroke('#222')
        fill(color)
        rect(...applyScaleFactor(x, y, TILE_SIZE, TILE_SIZE))
        noStroke()
      }
    }
  }
}

class Player {
  x = WINDOW_WIDTH / 2
  y = WINDOW_HEIGHT / 2
  radius = 8
  turnDirection = DIRECTION.none
  walkDirection = DIRECTION.none
  rotationAngle = Math.PI / 2
  moveSpeed = 40
  rotationSpeed = 2 * (Math.PI / 2)

  level = null

  constructor(level) {
    this.level = level
  }

  update() {
    const dt = deltaTime / 1000
    this.rotationAngle += (this.turnDirection * this.rotationSpeed * dt)
    const step = this.walkDirection * this.moveSpeed
    const x = this.x + (Math.cos(this.rotationAngle) * step) * dt
    const y = this.y + (Math.sin(this.rotationAngle) * step) * dt

    if (!this.level || !this.level.isCollides({ x, y })) {
      this.x = x
      this.y = y
    }
  }

  render() {
    fill('#f00')
    circle(...applyScaleFactor(this.x, this.y, this.radius))
    // stroke('#f00')
    // line(...applyScaleFactor(
    //   this.x,
    //   this.y,
    //   this.x + (Math.cos(this.rotationAngle) * 12),
    //   this.y + (Math.sin(this.rotationAngle) * 12)
    // ))
    // noStroke()
  }
}

class Ray {
  pivot = null
  angle = null
  wallHitX = 0
  wallHitY = 0
  distance = 0

  isFacingDown = null
  isFacingLeft = null

  constructor(pivot, angle) {
    if (!pivot || !Number.isFinite(angle)) {
      throw new Error('No pivot/angle provided, {pivot}/{angle}:', pivot, angle)
    }
    this.pivot = pivot
    this.angle = normalizeAngle(angle)

    this.isFacingDown = this.angle > 0 && this.angle < Math.PI
    this.isFacingLeft = this.angle > Math.PI / 2 && this.angle < Math.PI * 1.5
  }

  cast(columnId) {
    // TODO: Reuse as a single function.
    const getHorizontalIntersection = () => {
      let xintercept, yintercept
      let xstep, ystep

      // Horizontal intersection

      // y-coordinate of closest horizontal grid intersection
      yintercept = Math.floor(this.pivot.y / TILE_SIZE) * TILE_SIZE
      yintercept += this.isFacingDown ? TILE_SIZE : 0

      // x-coordinate of closest horizontal grid intersection
      xintercept = this.pivot.x + (yintercept - this.pivot.y) / Math.tan(this.angle)

      // Calculate the increment xstep and ystep
      ystep = TILE_SIZE * (this.isFacingDown ? 1 : -1)
      xstep = Math.abs(TILE_SIZE / Math.tan(this.angle)) * (this.isFacingLeft ? -1 : 1)

      let nextIntersectX = xintercept
      let nextIntersectY = yintercept

      // Make sure to verify the first row and remove 1 pixel.
      // Otherwise will start from the second row.
      if (!this.isFacingDown) {
        nextIntersectY -= 1
      }

      while (nextIntersectX >= 0 && nextIntersectX <= WINDOW_WIDTH && nextIntersectY >= 0 && nextIntersectY <= WINDOW_HEIGHT) {
        if (grid.isCollides({ x: nextIntersectX, y: nextIntersectY })) {
          // return { x: nextIntersectX, y: nextIntersectY }
          break
        } else {
          nextIntersectX += xstep
          nextIntersectY += ystep
        }
      }

      return { x: nextIntersectX, y: nextIntersectY }
      // return null
    }

    const getVerticalIntersection = () => {
      let xintercept, yintercept
      let xstep, ystep

      // Vertical intersection

      // x-coordinate of closest vertical grid intersection
      xintercept = Math.floor(this.pivot.x / TILE_SIZE) * TILE_SIZE
      xintercept += this.isFacingLeft ? 0 : TILE_SIZE

      // y-coordinate of closest vertical grid intersection
      yintercept = this.pivot.y + (xintercept - this.pivot.x) * Math.tan(this.angle)

      // Calculate the increment xstep and ystep
      xstep = TILE_SIZE * (this.isFacingLeft ? -1 : 1)
      ystep = Math.abs(TILE_SIZE * Math.tan(this.angle)) * (this.isFacingDown ? 1 : -1)

      let nextIntersectX = xintercept
      let nextIntersectY = yintercept

      // Make sure to verify the first column and remove 1 pixel.
      // Otherwise will start from the second column.
      if (this.isFacingLeft) {
        nextIntersectX -= 1
      }

      while (nextIntersectX >= 0 && nextIntersectX <= WINDOW_WIDTH && nextIntersectY >= 0 && nextIntersectY <= WINDOW_HEIGHT) {
        if (grid.isCollides({ x: nextIntersectX, y: nextIntersectY })) {
          // return { x: nextIntersectX, y: nextIntersectY }
          break
        } else {
          nextIntersectX += xstep
          nextIntersectY += ystep
        }
      }

      return { x: nextIntersectX, y: nextIntersectY }
      // return null
    }

    const hRes = getHorizontalIntersection()
    const vRes = getVerticalIntersection()
    const hDist = hRes ? distanceBetweenPoints(this.pivot, hRes) : null
    const vDist = vRes ? distanceBetweenPoints(this.pivot, vRes) : null

    // Only store smallest distances.
    this.wallHitX = hDist > vDist ? vRes.x : hRes.x
    this.wallHitY = hDist > vDist ? vRes.y : hRes.y
    this.distance = hDist > vDist ? vDist : hDist
    // console.log('wallHit{XY}', this.wallHitX, this.wallHitY, this.distance)
  }

  render() {
    stroke('rgba(255, 0, 0, 0.4)')
    line(...applyScaleFactor(this.pivot.x, this.pivot.y, this.wallHitX, this.wallHitY))
    noStroke()
  }
}

const grid = new Grid()
const player = new Player(grid)
let rays = []

function renderProjectedWalls() {
  for (let i = 0; i < NUM_RAYS; i++) {
    const r = rays[i]
    const dist = r.distance

    const wallStripHeight = (TILE_SIZE / dist) * DIST_PROJ_PLANE

    fill('#fff')
    rect(
      i * WALL_STRIP_WIDTH,
      (WINDOW_HEIGHT / 2) - (wallStripHeight / 2),
      WALL_STRIP_WIDTH,
      wallStripHeight
    )
  }
}

function applyScaleFactor(...args) {
  return args.map(v => v * MINIMAP_SCALE_FACTOR)
}

function normalizeAngle(angle) {
  angle = angle % (2 * Math.PI)

  return angle < 0 ? (angle + Math.PI * 2) : angle
}

function distanceBetweenPoints(o, t) {
  if (!o || !t) {
    throw new Error('[distanceBetweenPoints] Invalid arguments provided! {o}, {t}', o, t)
  }

  return Math.sqrt(Math.pow(t.x - o.x, 2) + Math.pow(t.y - o.y, 2))
}

function castAllRays() {
  let columnId = 0

  let angle = player.rotationAngle - (FOV_ANGLE / 2)
  rays = []

  for (let i = 0; i < NUM_RAYS; i++) {
    const ray = new Ray(player, angle)
    ray.cast(columnId)
    rays.push(ray)

    angle += FOV_ANGLE / NUM_RAYS

    columnId++
  }
}

function setup() {
  createCanvas(WINDOW_WIDTH, WINDOW_HEIGHT)
}

function keyPressed() {
  if (keyCode === UP_ARROW) player.walkDirection = 1
  else if (keyCode === DOWN_ARROW) player.walkDirection = -1
  else if (keyCode === RIGHT_ARROW) player.turnDirection = 1
  else if (keyCode === LEFT_ARROW) player.turnDirection = -1
}

function keyReleased() {
  if (keyCode === UP_ARROW || keyCode === DOWN_ARROW) player.walkDirection = 0
  else if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) player.turnDirection = 0
}

function update() {
  player.update()
  castAllRays()
}

function draw() {
    clear('#212121')
    update()

    renderProjectedWalls()

    grid.render()
    for (let i = 0, raysLen = rays.length; i < raysLen; i++) {
      rays[i].render()
    }

    player.render()
  }
