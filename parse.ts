import lex from "./lex"

export const enum Code {
  G = 71,
  X = 88,
  Y = 89,
  I = 73,
  J = 74
}

export const enum Motion { Rapid, Linear, ArcCW, ArcCCW }

export type Vec2 = [x: number, y: number]
export type Move = [motion: Motion, from: Vec2, to: Vec2, center: Vec2]

export default function* parse(bytes: Uint8Array) {
  const move: Move = [Motion.Rapid, [NaN, NaN], [NaN, NaN], [NaN, NaN]]
  const from = move[1]
  const to = move[2]
  const center = move[3]

  let posX = 0, posY = 0
  let motion = Motion.Rapid

  let unit = 1
  let abs = true

  let lineX = NaN, lineY = NaN
  let lineI = NaN, lineJ = NaN

  for (const [letter, value, newLine] of lex(bytes)) {
    if (letter === Code.G) {
      if (value <= 3) motion = value
      else if (value === 20) unit = 25.4
      else if (value === 21) unit = 1
      else if (value === 90) abs = true
      else if (value === 91) abs = false
    }

    else if (letter === Code.X) lineX = value
    else if (letter === Code.Y) lineY = value
    else if (letter === Code.I) lineI = value
    else if (letter === Code.J) lineJ = value

    if (!newLine) continue

    if (lineX === lineX || lineY === lineY || lineI === lineI || lineJ === lineJ) {
      const newX = lineX === lineX ? (abs ? lineX * unit : posX + lineX * unit) : posX
      const newY = lineY === lineY ? (abs ? lineY * unit : posY + lineY * unit) : posY

      move[0] = motion

      from[0] = posX
      from[1] = posY

      to[0] = newX
      to[1] = newY

      if (motion === Motion.Rapid || motion === Motion.Linear) {
        center[0] = center[1] = NaN

        yield move
      }

      else if (lineI === lineI || lineJ === lineJ) {
        center[0] = posX + (lineI === lineI ? lineI : 0) * unit
        center[1] = posY + (lineJ === lineJ ? lineJ : 0) * unit

        yield move
      }

      posX = newX
      posY = newY
    }

    lineX = lineY = lineI = lineJ = NaN
  }
}