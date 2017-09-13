'use strict'

let parse = require('./parse.js')
let expand = require('./expand.js')
let defaultOperators = require('./operators.js')
let defaultTokenizers = require('./tokenizers.js')

let opWrapperSymbol = Symbol('toronto_ops')

function evalExpansion (code, ops = defaultOperators(this || global), tokenizers = defaultTokenizers) {
  if (Array.isArray(code)) {
    // called as template string tag
    code = String.raw(...Array.from(arguments))
    ops = defaultOperators(this || global)
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
    }, ctx)
  }

  let tree = parse(code, tokenizers)
  let js = expand.call(ops, tree, ops)
  if (ops === global) {

  } else {
    return new Function('ctx', `with (ctx) { return (${js}) }`).call(ops, ops)
  }
}

function attachMethods (obj, ctx = defaultOperators(this || global)) {
  return Object.assign(obj, {
    parse (code, tokenizers = defaultTokenizers) {
      return parse(code, tokenizers)
    },
    expand (tree, ops = ctx) {
      return expand(tree, ops)
    },
    operators: defaultOperators,
    tokenizers: defaultTokenizers
  })
}

module.exports = attachMethods(evalExpansion)
