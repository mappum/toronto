'use strict'

let { createCharReader } = require('./common.js')

function readToken (nextChar, rewind, tokenizers, ...extraArgs) {
  let reader = createCharReader(nextChar, rewind)
  for (let read of tokenizers) {
    let value = read(reader.nextChar, reader.rewind, tokenizers, ...extraArgs)
    if (value != null) return value
    reader.reset()
  }
  throw Error('Could not parse token')
}

function parse (code, tokenizers) {
  code = code.trim()
  let cursor = 0
  let nextChar = () => code[cursor++]
  let rewind = (n = 1) => cursor -= n
  let tree = [ 'do' ]
  while (cursor < code.length) {
    tree.push(readToken(nextChar, rewind, tokenizers))
  }
  return tree
}

module.exports = parse
module.exports.readToken = readToken
