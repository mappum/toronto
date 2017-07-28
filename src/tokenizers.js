'use strict'

let { createCharReader } = require('./common.js')
let { readToken } = require('./parse.js')

let noop = (v) => v

function isWhitespace (str) {
  return str.match(/\s/)
}

// generates a tokenizer which has a start sequence,
// read child tokens, and has an end sequence
function recursive (isStart, isEnd, toValue = noop) {
  return function readRecursive (nextChar, rewind, tokenizers) {
    if (!isStart(nextChar, rewind)) return null

    let value = []

    // calls isEnd, and rewinds cursor if result is false
    let wrappedIsEnd = (reset) => {
      let reader = createCharReader(nextChar, rewind)
      let end = isEnd(reader.nextChar, reader.rewind)
      if (!end || reset) reader.reset()
      return end
    }

    // read children until we reach the end of this token
    while (true) {
      if (wrappedIsEnd()) return toValue(value)
      let child = readToken(nextChar, rewind, tokenizers, wrappedIsEnd)
      if (child) value.push(child)
    }
  }
}

// returns a recursive tokenizer which has an opening
// bracket char and a closing bracket char
function bracketed (open, close, toValue) {
  return recursive(
    (nextChar) => nextChar() === open,
    (nextChar) => nextChar() === close,
    toValue
  )
}

let tokenizers = [
  // paranthetic expressions
  bracketed('(', ')'),
  // square bracket vectors
  bracketed('[', ']', (args) => [ '[]', ...args ]),
  // JS object
  bracketed('{', '}', (args) => [ '{}', ...args ]),
  // js strings (single-quoted or double-quoted)
  function string (nextChar) {
    let quote = nextChar()
    if (quote !== "'" && quote !== '"') return null
    let value = ''
    let escaped = false
    while (true) {
      let char = nextChar()
      if (!char) {
        let type = quote === '"' ? 'double' : 'single'
        throw Error(`unterminated ${type}-quoted string`)
      }
      if (!escaped && char === '\\') {
        escaped = true
      } else if (!escaped && char === quote) {
        return quote + value + quote
      } else if (escaped) {
        escaped = false
      }
      value += char
    }
  },
  // all other tokens (identitifiers, numbers, etc),
  // separated by whitespace
  function immediate (nextChar, rewind, _, isParentEnd) {
    let value = ''
    while (true) {
      if (isParentEnd && isParentEnd(true)) {
        return value
      }
      let char = nextChar()
      if (!char || isWhitespace(char)) return value
      value += char
    }
  }
]

module.exports = Object.assign(tokenizers, {
  recursive,
  bracketed
})
