'use strict'

function * range (min = 0, max) {
  if (max == null) {
    max = min
    min = 0
  }
  for (let i = min; i < max; i++) {
    yield i
  }
}

function mapIterator (func, iterator) {
  let output = []
  for (let value of iterator) {
    output.push(func(value))
  }
  return output
}

function variadicBinaryOperator (operator) {
  return (...args) => `(${args.join(` ${operator} `)})`
}

let arithmetic = {
  '+': variadicBinaryOperator('+'),
  '-' (...args) {
    if (args.length === 1) args.unshift('0') // handle single args (`(- 5)` should be -5)
    return '(' + args.join(' - ') + ')'
  },
  '*': variadicBinaryOperator('*'),
  '/': variadicBinaryOperator('/'),
  '%': variadicBinaryOperator('%')
}

let logical = {
  'or': variadicBinaryOperator('||'),
  'and': variadicBinaryOperator('&&'),
  'not': (value) => `(!(${value}))`
}

let bitwise = {
  'bor': variadicBinaryOperator('|'),
  'band': variadicBinaryOperator('&'),
  'xor': variadicBinaryOperator('^'),
  'bnot': (value) => `(~(${value}))`
}

let macros = {
  'map' (func, iterator) {
    return `(${mapIterator.toString()})(${func}, ${iterator})`
  },
  '=>' (args, expression) {
    if (Array.isArray(args)) args = args.join(', ')
    return `(${args}) => (${expression})`
  },
  'range' (...args) {
    return `(${range.toString()})(${args.join(', ')})`
  },
  '?' (cond, a, b = undefined) {
    return `(${cond} ? ${a} : ${b})`
  },
  '!' (expression) {
    return `!(${expression})`
  },
  'print' (...args) {
    return `(console.log(${args.join(', ')}))`
  },
  'cond' (...args) {
    let output = ''
    let hasElse = args.length % 2 === 1
    let elseValue = hasElse ? args[args.length - 1] : 'undefined'
    let last = true
    for (let i = args.length - 2 - (hasElse ? 1 : 0); i >= 0; i -= 2) {
      let condition = args[i]
      let value = args[i + 1]
      output = `(${condition} ? ${value} : ${last ? elseValue : output})`
      last = false
    }
    return output
  },
  'or' (a, b) {
    return `(${a} || ${b})`
  },
  ',' (...args) {
    return `${args.join(', ')}`
  },
  'func' (params, body) {
    if (!body) {
      body = params
      params = []
    }
    if (!Array.isArray(params)) {
      throw Error('function parameters must be a vector')
    }
    return eval(`(function (${params.join(', ')}) { return ${body} })`)
  },
  'call' (func, ...args) {
    return `((${func})(${args.join(', ')}))`
  },
  'toArray' (iterator) {
    return `(Array.from(${iterator}))`
  },
  '.' (...args) {
    return `(${args.join('.')})`
  },
  '[]' (...args) {
    return args
  },
  '{}' (...args) {
    let json = ''
    for (let i = 0; i < args.length; i += 2) {
      let key = args[i]
      let value = args[i + 1]
      // ensure keys are followed by colons
      if (value === ':' && key[key.length - 1] !== ':') {
        key = key + ':'
        value = args[i + 2]
        i += 1
      } else if (key[key.length - 1] !== ':') {
        throw Error('Expected JS object key to end with ":"')
      }
      // make sure we don't get mistake keys for values
      if (value[value.length - 1] === ':') {
        throw Error('Expected JS object value to not end with ":"')
      }
      json += `  ${key} ${value},\n`
    }
    return `{\n${json}\n}`
  },
  'do' (...expressions) {
    return '((function () {\n  ' +
      expressions.join(';\n  ') +
      ';\n})())'
  }
}

let scopedMacros = {
  'def' (name, value) {
    return `(this['${name}'] = ${value})`
  }
}

Object.assign(
  macros,
  arithmetic,
  logical,
  bitwise)

// exported value can be used as the collection of macros,
// or can be called to create a scope for 'def', etc.
module.exports = function createMacroContext (ctx = {}) {
  // clone then re-assign to assure ctx overrides defaults
  let cloned = Object.assign({}, ctx)

  // bind scoped macros to context
  let boundScopedMacros = {}
  for (let operator in scopedMacros) {
    boundScopedMacros[operator] = scopedMacros[operator].bind(ctx)
  }

  return Object.assign(ctx, macros, boundScopedMacros, cloned)
}

Object.assign(module.exports, { macros })
