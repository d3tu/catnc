export const enum State { IDLE, COMMENT, BUILD }

export type Token = [cmd: number, arg: number, eol: boolean]

export default function* lex(bytes: Uint8Array): Generator<Token> {
  const token: Token = [0, 0, false]

  let state = State.IDLE

  let cmd = 0
  let arg = 0
  let div = 0
  let neg = false

  for (const byte of bytes) {
    if (state === State.COMMENT) {
      if (byte === 10) state = State.IDLE
      continue
    }

    if (byte === 59) {
      if (state === State.BUILD) {
        token[0] = cmd
        token[1] = (neg ? -arg : arg) / (div || 1)
        token[2] = true
        yield token
      }

      state = State.COMMENT
      continue
    }

    if (byte === 10) {
      if (state === State.BUILD) {
        token[0] = cmd
        token[1] = (neg ? -arg : arg) / (div || 1)
        token[2] = true
        yield token
      }

      state = State.IDLE
      continue
    }


    if (byte === 32) continue

    if (state === State.BUILD) {
      if (byte === 45) {
        neg = true
        continue
      }

      if (byte === 46) {
        div = 1
        continue
      }

      const digit = byte - 48
      if (digit >= 0 && digit <= 9) {
        arg = arg * 10 + digit
        if (div) div *= 10
        continue
      }

      token[0] = cmd
      token[1] = (neg ? -arg : arg) / (div || 1)
      token[2] = false
      yield token
    }

    cmd = byte & ~32
    arg = 0
    div = 0
    neg = false
    state = State.BUILD
  }

  if (state === State.BUILD) {
    token[0] = cmd
    token[1] = (neg ? -arg : arg) / (div || 1)
    token[2] = true
    yield token
  }
}