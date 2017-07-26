'use strict'

let parse = require('./parse.js')
let expand = require('./expand.js')
let defaultMacros = require('./macros.js')
let defaultTokenizers = require('./tokenizers.js')

function evalExpansion (code, macros, tokenizers = defaultTokenizers) {
  let ctx = this === global ? {} : this
  if (!macros) macros = defaultMacros(ctx)

  if (Array.isArray(code)) {
    // called as template string tag
    code = String.raw(...Array.from(arguments))
    macros = defaultMacros(ctx)
    tokenizers = defaultTokenizers
  } else if (typeof code === 'object') {
    // return eval function, bound to context object
    ctx = code
    macros = defaultMacros(ctx)
    return attachMethods(function evalExpansionCtx (code) {
      return evalExpansion.call(ctx, code, macros, tokenizers)
    })
  }

  let tree = parse(code, tokenizers)
  let js = expand(tree, macros)
  return new Function('ctx', `
    with (ctx) { return (${js}) }
  `).call(ctx, ctx)
}

function attachMethods (obj) {
  return Object.assign(obj, {
    parse (code, tokenizers = defaultTokenizers) {
      return parse(code, tokenizers)
    },
    expand (tree, macros = defaultMacros({})) {
      return expand(tree, macros)
    },
    macros: defaultMacros,
    tokenizers: defaultTokenizers
  })
}

module.exports = attachMethods(evalExpansion)
