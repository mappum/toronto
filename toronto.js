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

const macros = {
  '+' (...args) {
    return '(' + args.join(' + ') + ')'
  },
  '-' (...args) {
    if (args.length === 1) args.unshift('0') // handle single args (`(- 5)` should be -5)
    return '(' + args.join(' - ') + ')'
  },
  '%' (a, b) {
    return `(${a} % ${b})`
  },
  'map' (func, iterator) {
    return `(${mapIterator.toString()})(${func}, ${iterator})`
  },
  '=>' (arg, expression) {
    return `(${arg}) => (${expression})`
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
  'macro' (name, func) {
    defaultMacros[name] = eval(func)
  },
  'toArray' (iterator) {
    return `(Array.from(${iterator}))`
  },
  '.' (...args) {
    return `(${args.join('.')})`
  },
  '[]' (...args) {
    return args
  }
}