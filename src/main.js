'use strict'

let parse = require('./parse.js')
let expand = require('./expand.js')
let operators = require('./operators.js')
let defaultTokenizers = require('./tokenizers.js')
let { scopedEval } = require('./common.js')

let opWrapperSymbol = Symbol('toronto_ops')
let defaultOps = function () {
  return operators(this || global)
}

function evalExpansion (code, ops = defaultOps(), tokenizers = defaultTokenizers) {
  if (Array.isArray(code)) {
    // called as template string tag
    code = String.raw(...Array.from(arguments))
    ops = defaultOps()
    tokenizers = defaultTokenizers
  }

  let list = parse(code, tokenizers)
  let js = expand.call(ops, list, ops)
  return scopedEval(js, ops)
}

module.exports = evalExpansion
module.exports.parse = function (code, tokenizers = defaultTokenizers) {
  return parse(code, tokenizers)
}
module.exports.expand = function (list, ops = defaultOps()) {
  return expand(list, ops)
}
