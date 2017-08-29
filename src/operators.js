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

function preserveTree (tree) {
  if (!Array.isArray(tree)) return tree
  let [ op, ...args ] = tree
  let output = [ JSON.stringify(op), ...args.map(preserveTree) ]
  return arrayToString.call(output)
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
  'func' (params, ...body) {
    if (!body) {
      body = params
      params = []
    }
    return `(function (${params.join(', ')}) { return (${body.join(', ')}) })`
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
    return `(${expressions.join(', ')})`
  },
  'macro' (...args) {
    return `((${Macro})(${operators.func(...args)}))`
  },
  '=' (name, value) {
    return `(${name} = ${value})`
  },
  'tree': Macro((tree) => preserveTree(tree))
}

let scopedOps = {
  'def' (name, value) {
    return `(this['${name}'] = ${value}, undefined)`
  },
  'get' (name) {
    return `(this['${name}'])`
  },
  'eval' (code) {
    let value = new Function(`return (${code})`).call(this)
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

  let wrapper = new Proxy(ctx, {})
  Object.setPrototypeOf(wrapper, clonedOperators)

  // bind scoped operators to context
  for (let operator in scopedOps) {
    clonedOperators[operator] = scopedOps[operator].bind(wrapper)
  }

  return wrapper
}

Object.assign(module.exports, { operators })
