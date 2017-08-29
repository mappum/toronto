'use strict'

let { createCharReader } = require('./common.js')
let { readToken } = require('./parse.js')

let noop = (v) => v

function isWhitespace (str) {
  return str.match(/\s/)
}

// generates a tokenizer which has a start sequence,
// read child tokens, and has an end sequence
function recursive (isStart, isEnd, transform = noop) {
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
      if (wrappedIsEnd()) return transform(value)
      let child = readToken(nextChar, rewind, tokenizers, wrappedIsEnd)
      if (child) value.push(child)
    }
  }
}

// returns a recursive tokenizer which has an opening
// bracket char and a closing bracket char
function bracketed (open, close, transform = noop) {
  return recursive(
    (nextChar) => nextChar() === open,
    (nextChar) => nextChar() === close,
    transform
  )
}

// wraps a tokenizer to first check for a prefix string
function prefixed (prefix, tokenizer, transform = noop) {
  return function readPrefixed (nextChar, ...extraArgs) {
    // check if token starts with prefix
    for (let i = 0; i < prefix.length; i++) {
      if (nextChar() !== prefix[i]) return null
    }

    // read child token
    let value = tokenizer(nextChar, ...extraArgs)
    if (value) value = transform(value)
    return value
  }
}

let list = bracketed('(', ')')

function prefixAlias (prefix, operator) {
  return prefixed(prefix, list, (...args) => [ operator, ...args ])
}

function prefixAliasFlat (prefix, operator) {
  return prefixed(prefix, list, (args) => [ operator, ...args ])
}

function nullLine (nextChar) {
  // read until newline
  let char
  do { char = nextChar() } while (char && char !== '\n')
  return [ 'eval', 'undefined' ]
}

let tokenizers = [
  // comments
  prefixed(';', nullLine),
  prefixed('//', nullLine),

  // normal list
  // (a b c) -> [a b c]
  list,

  // list prefixed with '$' (to eval at expansion-time)
  // $(+ 5 5) -> [eval [+ 5 5]]
  prefixAlias('$', 'eval'),

  // list prefixed with '%' (preserve syntax tree/list, don't expand)
  // %(+ 5 5) -> [tree [+ 5 5]] -> [ '+', 5, 5 ]
  prefixAlias('%', 'list'),

  // list prefixed with '.' (call)
  // .(Math.sin 3.14) -> [call Math.sin 3.14]
  prefixAliasFlat('.', 'call'),

  // array
  // [ 1 2 3 ] -> [ 1, 2, 3 ]
  bracketed('[', ']', (args) => [ '[]', ...args ]),

  // escape expression (escape can be used by macros such as 'list')
  // <foo> -> [escape foo]
  bracketed('<', '>', (args) => [ 'escape', ...args ]),

  // JS object
  // { foo: bar baz } -> { foo: bar, baz: baz }
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
