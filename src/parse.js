'use strict'

let { createCharReader } = require('./common.js')

// Reads a single token, based on the given tokenizers.
// Tokenizers are functions which take in `nextChar` and `rewind` functions,
// return null if the cursor is not at a valid instance of this token,
// and return the token value if the cursor is at a valid instance.
function readToken (nextChar, rewind, tokenizers, ...extraArgs) {
  let reader = createCharReader(nextChar, rewind)
  for (let read of tokenizers) {
    let value = read(reader.nextChar, reader.rewind, tokenizers, ...extraArgs)
    if (value !== undefined) return value
    reader.reset()
  }
  throw Error('Could not parse token')
}

// takes in a code string and outputs a list
function parse (code, tokenizers) {
  code = code.trim()
  if (!code) return code // pass-through empty strings

  let cursor = 0
  let nextChar = () => code[cursor++]
  let rewind = (n = 1) => { cursor -= n }

  // wrap multiple top-level expressions with 'do' expression
  let list = [ 'do' ]
  while (cursor < code.length) {
    let token = readToken(nextChar, rewind, tokenizers)
    if (token) list.push(token)
  }

  // if only one top-level expression, don't wrap with 'do'
  if (list.length === 2) return list[1]

  return list
}

module.exports = parse
module.exports.readToken = readToken
