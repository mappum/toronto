'use strict'

let parse = require('./src/parse.js')
let expand = require('./src/expand.js')
let bracketize = require('./src/bracketize.js')
let defaultOperators = require('./src/operators.js')
let defaultTokenizers = require('./src/tokenizers.js')

let opWrapperSymbol = Symbol('toronto_ops')

function evalExpansion (code, ops, tokenizers = defaultTokenizers) {
  if (Array.isArray(code)) {
    // called as template string tag
    code = String.raw(...Array.from(arguments))
    ops = defaultOperators()
    tokenizers = defaultTokenizers
  } else if (typeof code === 'object') {
    // return eval function, bound to context object
    let ctx = code
    if (!ctx[opWrapperSymbol]) {
      ctx[opWrapperSymbol] = defaultOperators(ctx)
    }
    ops = ctx[opWrapperSymbol]
    return attachMethods(function evalExpansionCtx (code) {
      if (Array.isArray(code)) {
        code = String.raw(...Array.from(arguments))
      }
      return evalExpansion.call(ops, code, ops, tokenizers)
    })
  }

  let tree = parse(code, tokenizers)
  let js = expand.call(ops, tree, ops)
  return new Function(js).call(ops)
}

function attachMethods (obj, ctx) {
  return Object.assign(obj, {
    parse (code, tokenizers = defaultTokenizers) {
      return parse(code, tokenizers)
    },
    expand (tree, ops = (ctx || defaultOperators({}))) {
      return expand(tree, ops)
    },
    bracketize,
    operators: defaultOperators,
    tokenizers: defaultTokenizers
  })
}

module.exports = attachMethods(evalExpansion)
