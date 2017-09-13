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

function mapIterator (iterator, func) {
  let output = []
  for (let value of iterator) {
    output.push(func(value))
  }
  return output
}

function Macro (func) {
  func['__toronto_macro__'] = true
  return func
}

function arrayToString () {
  return `[${this.join(',')}]`
}

function variadicBinaryOperator (operator) {
  return (...args) => `(${args.join(` ${operator} `)})`
}

function notUndefined (value) {
  return value !== undefined &&
    value !== '(undefined)' &&
    value !== 'undefined'
}

function escapeTemplateString (str) {
  return str.replace(/`/g, '\\`')
}

function commaList (list) {
  return list.join(', ')
}

function preserveList (list) {
  if (!Array.isArray(list)) return JSON.stringify(list)
  let [ op, ...args ] = list
  // special escape operator
  if (op === 'escape') return args[0]
  return arrayToString.call(list.map(preserveList))
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

let operators = {
  'map' (iterator, func) {
    return `(${mapIterator.toString()})(${iterator}, ${func})`
  },
  '=>' (args, expression) {
    return `(${commaList(args)}) => (${expression})`
  },
  'range' (...args) {
    return `(${range.toString()})(${commaList(args)})`
  },
  '?' (cond, a, b = undefined) {
    return `(${cond} ? ${a} : ${b})`
  },
  '!' (expression) {
    return `!(${expression})`
  },
  'print' (...args) {
    return `(console.log(${commaList(args)}))`
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
    return `${commaList(args)}`
  },
  'func' (params, ...body) {
    if (!body) {
      body = params
      params = []
    }
    return `(function func (${commaList(params)}) { return (${commaList(body)}) })`
  },
  'async' (params, ...body) {
    if (!body) {
      body = params
      params = []
    }
    return `(async function _async (${commaList(params)}) { return (${commaList(body)}) })`
  },
  'call' (func, ...args) {
    return `((${func})(${commaList(args)}))`
  },
  'toArray' (iterator) {
    return `(Array.from(${iterator}))`
  },
  '.' (...args) {
    return `(${args.join('.')})`
  },
  '[]' (...args) {
    args.toString = arrayToString
    return args
  },
  '{}' (...args) {
    let json = ''
    for (let i = 0; i < args.length;) {
      let key, value
      let [ a, b ] = [ args[i], args[i + 1] ]
      let isKey = a[a.length - 1] === ':'
      if (isKey) {
        key = a
        value = b
        i += 2
      } else {
        key = a + ':'
        value = a
        i += 1
      }
      json += `  ${key} ${value},\n`
    }
    return `{\n${json}}`
  },
  'do' (...expressions) {
    expressions = expressions.filter(notUndefined)
    if (expressions.length === 0) {
      expressions.push('undefined')
    }
    return `(${commaList(expressions)})`
  },
  'asyncdo' (...expressions) {
    return `(async function asyncdo () { return (${commaList(expressions)}) })().catch(function (err) { throw err })`
  },
  'macro' (...args) {
    return `((${Macro})(${operators.func(...args)}))`
  },
  '=' (name, value) {
    return `(${name} = ${value})`
  },
  'list': Macro(preserveList),
  'escape' (value) {
    throw Error('"escape" operator used outside of an escapable macro')
  }
}

let scopedOps = {
  'def' (name, value) {
    return `(this['${name}'] = ${value}, undefined)`
  },
  'get' (name) {
    return `(this['${name}'])`
  },
  'eval' (code) {
    let value = new Function('ctx', `with (ctx) { return (${code}) }`).call(this, this)
    if (value === undefined) return '(undefined)'
    return value
  }
}

Object.assign(
  operators,
  arithmetic,
  logical,
  bitwise)

// exported value can be used as the collection of operators,
// or can be called to create a scope for 'def', etc.
module.exports = function wrapContext (ctx = {}) {
  let clonedOperators = Object.assign({}, operators)

  let wrapper = new Proxy(ctx, {
    get (target, property, receiver) {
      return clonedOperators[property] || target[property]
    }
  })

  // bind scoped operators to context
  for (let operator in scopedOps) {
    clonedOperators[operator] = scopedOps[operator].bind(wrapper)
  }

  return wrapper
}

Object.assign(module.exports, { operators })
