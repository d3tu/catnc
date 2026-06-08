import parse, { Motion } from "./parse"

export default function gen(bytes: Uint8Array) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  const parts = []

  const expand = (x: number, y: number) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  for (const [motion, [x0, y0], [x1, y1], [cx, cy]] of parse(bytes)) {
    if (motion === Motion.Rapid) parts.push(`M ${x1} ${-y1}`)
    else {
      if (parts.length === 0) {
        parts.push(`M ${x0} ${-y0}`)
      }

      expand(x0, -y0)
      expand(x1, -y1)
      
      if (motion === Motion.Linear) parts.push(`L ${x1} ${-y1}`)
      else {
        const i = cx - x0
        const j = cy - y0
        const r = Math.sqrt(i * i + j * j)
        const isCW = motion === Motion.ArcCW
        const sweep = isCW ? 1 : 0
        const cross = i * (y1 - cy) - j * (x1 - cx)
        const large = (isCW ? cross <= 0 : cross >= 0) ? 1 : 0

        if (x0 === x1 && y0 === y1) {
          parts.push(`A ${r} ${r} 0 0 ${sweep} ${x0 + 2 * i} ${-(y0 + 2 * j)}`)
          parts.push(`A ${r} ${r} 0 0 ${sweep} ${x0} ${-y0}`)
        } else {
          parts.push(`A ${r} ${r} 0 ${large} ${sweep} ${x1} ${-y1}`)
        }

        const sign = isCW ? 1 : -1
        for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]] as const) {
          const x = cx + dx
          const y = cy + dy
          const cross1 = ((-i * dy) - (-j * dx)) * sign <= 0
          const cross2 = (dx * ((y1 - cy)) - dy * (x1 - cx)) * sign <= 0
          if (large === 0 ? cross1 && cross2 : cross1 || cross2) expand(x, -y)
        }
      }
    }
  }

  return {
    path: parts.join('\n'),
    bounds: minX === Infinity ? { minX: 0, minY: 0, maxX: 0, maxY: 0 } : { minX, minY, maxX, maxY }
  }
}