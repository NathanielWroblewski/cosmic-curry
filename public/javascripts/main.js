import Vector from './models/vector.js'
import FourByFour from './models/four_by_four.js'
import Camera from './models/orthographic.js'
import angles from './isomorphisms/angles.js'
import renderCircle from './views/circle.js'
import renderCube from './views/cube.js'
import renderLine from './views/line.js'
import renderPolygon from './views/polygon.js'
import { seed, noise } from './utilities/noise.js'
import { stableSort, remap, grid, cube } from './utilities/index.js'
import { COLORS } from './constants/colors.js'
import { NOISE_RANGE, COLOR_RANGE, RADIUS, RESOLUTIONS, FPS } from './constants/dimensions.js'

// Copyright (c) 2020 Nathaniel Wroblewski
// I am making my contributions/submissions to this project solely in my personal
// capacity and am not conveying any rights to any intellectual property of any
// third parties.

const canvas = document.querySelector('.canvas')
const context = canvas.getContext('2d')
const { sin, cos } = Math

const perspective = FourByFour
  .identity()
  .rotX(angles.toRadians(120))
  .rotZ(angles.toRadians(0))

const camera = new Camera({
  position: Vector.from([0,0,0]),
  direction: Vector.zeroes(),
  up: Vector.from([0, 1, 0]),
  width: canvas.width,
  height: canvas.height,
  zoom: 0.04
})

const lines = []
const faces = []
const points = []

const znoise = (x, y, time, resolution) => (
  remap(noise(x * resolution, y * resolution, time), [-1, 1], NOISE_RANGE)
)

seed(Math.random())

const from = Vector.from([0, 0])
const to = Vector.from([90, 360])
const by = Vector.from([10, 10])
const spread = ((to.y - from.y) / by.y) + 1
const r = RADIUS

// time
let t = 0
let Δt = 0.02

// initialize points, lines, faces
grid({ from, to, by }, ([degtheta, degphi]) => {
  const subθ = angles.toRadians((degtheta - by[0] * 0.5))
  const supθ = angles.toRadians((degtheta + by[0] * 0.5))
  const subφ = angles.toRadians((degphi - by[1] * 0.5))
  const supφ = angles.toRadians((degphi + by[1] * 0.5))

  const rsinsubθ = r * sin(subθ)
  const rsinsupθ = r * sin(supθ)
  const rcossubθ = r * cos(subθ)
  const rcossupθ = r * cos(supθ)

  const sinsubφ = sin(subφ)
  const sinsupφ = sin(supφ)
  const cossubφ = cos(subφ)
  const cossupφ = cos(supφ)

  const i = points.length

  const vertices = [
    Vector.from([
      rsinsubθ * cossupφ,
      rsinsubθ * sinsupφ,
      rcossubθ
    ]),
    Vector.from([
      rsinsubθ * cossubφ,
      rsinsubθ * sinsubφ,
      rcossubθ
    ]),
    Vector.from([
      rsinsupθ * cossupφ,
      rsinsupθ * sinsupφ,
      rcossupθ
    ]),
    Vector.from([
      rsinsupθ * cossubφ,
      rsinsupθ * sinsubφ,
      rcossupθ
    ]),
  ]

  vertices.forEach(([x, y, z]) => {
    points.push(
      z > 0 ? Vector.from([x, y, znoise(x, y, t, RESOLUTIONS[0])]) : vertex
    )
  })

  faces.push([i, i + 1, i + 3, i + 2])

  // lines.push([i, i+1])
  // lines.push([i+1, i+3])

  vertices.forEach(vertex => points.push(vertex))

  if (degtheta === to.x - by.x) {
    lines.push([i + 3, i + 5])
    lines.push([i + 4, i + 5])
    lines.push([i + 2, i + 3])
  } else {
    lines.push([i + 4, i + 5])
    lines.push([i + 5, i + 7])
  }
  // faces.push(degtheta === 80 ? [i+2, i+3, i+5, i+4] : [i+4, i+5, i+7, i+6]
})

let resolutionIndex = 0

const threshold = lines.length - spread * 3 + 2

const render = () => {
  const halftime = 0.5 * t
  const opacity = 0.5 * Math.sin(halftime) + 0.5 // remap sin(x) to (0, 1)
  const resolutionIndex = Math.round(0.5 * Math.sin((halftime + 1.6) / 2) + 0.5)
  const resolution = RESOLUTIONS[resolutionIndex]

  perspective.rotZ(0.002)

  context.clearRect(0, 0, 600, 600)

  // draw hemisphere
  lines.forEach(([fromIndex, toIndex], i) => {
    const from = points[fromIndex]
    const to = points[toIndex]

    if (i > threshold && to.z > 0 && ![1].includes(i % 3)) {
      context.globalAlpha = opacity
    }

    renderLine(
      context,
      camera.project(from.transform(perspective)),
      camera.project(to.transform(perspective)),
      '#aaaaaa'
    )

    context.globalAlpha = 1
  })

  // draw noise plane
  context.globalAlpha = opacity

  faces.forEach(face => {
    let minz = 100
    const pts = face.map(index => {
      const vertex = points[index]

      if (vertex.z < minz) minz = vertex.z

      return camera.project(vertex.transform(perspective))
    })

    const colorIndex = Math.floor(remap(minz, COLOR_RANGE, [0, COLORS.length]))
    const color = COLORS[Math.max(colorIndex, 9)]

    renderPolygon(context, pts, color, COLORS[COLORS.length - colorIndex])
  })

  context.globalAlpha = 1

  // update noise
  for (let i = 0; i < points.length; i += 8) {
    const vertices = [points[i], points[i + 1], points[i + 2], points[i + 3]]

    vertices.map(([x, y, z], j) => {
      points[i + j] = Vector.from([x, y, znoise(x, y, t, resolution)])
    })
  }

  t += Δt
}

let prevTick = 0

const step = () => {
  window.requestAnimationFrame(step)

  const now = Math.round(FPS * Date.now() / 1000)
  if (now === prevTick) return
  prevTick = now

  render()
}

step()
