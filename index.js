let noop = (v) => v

function isWhitespace (str) {
  return str.match(/\s/)
}

// lets you read chars, and optionally reset the cursor to where it was before reading
function createCharReader (nextChar, rewind) {
  let charsRead = 0
  return {
    nextChar () {
      charsRead += 1
      return nextChar()
    },
    reset () {
      rewind(charsRead)
      charsRead = 0
    },
    rewind (n = 1) {
      rewind(n)
      charsRead -= n
    }
  }
}

function recursiveTokenizer (isStart, isEnd, toValue = noop) {
  return function readRecursive (nextChar, rewind, tokenizers) {
    if (!isStart(nextChar, rewind)) return null

    let value = []

    // calls isEnd, and rewinds cursor if result is false
    let wrappedIsEnd = (reset) => {
      let reader = createCharReader(nextChar, rewind)
      let end = isEnd(reader.nextChar, reader.rewind)
      if (!end || reset) reader.reset()
      return end
    }

    // read children until we reach the end of this token
    while (true) {
      if (wrappedIsEnd()) return toValue(value)
      let child = readToken(nextChar, rewind, tokenizers, wrappedIsEnd)
      if (child) value.push(child)
    }
  }
}

function readToken (nextChar, rewind, tokenizers, ...extraArgs) {
  let reader = createCharReader(nextChar, rewind)
  for (let read of tokenizers) {
    let value = read(reader.nextChar, reader.rewind, tokenizers, ...extraArgs)
    if (value != null) return value
    reader.reset()
  }
  throw Error('Could not parse token')
}

function bracketed (open, close, toValue) {
  return recursiveTokenizer(
    (nextChar) => nextChar() === open,
    (nextChar) => nextChar() === close,
    toValue
  )
}

let defaultTokenizers = [
  bracketed('(', ')'),
  bracketed('[', ']', (args) => [ 'vec', ...args ]),
  function immediate (nextChar, rewind, _, isParentEnd) {
    let value = ''
    while (true) {
      if (isParentEnd && isParentEnd(true)) {
        return value
      }
      let char = nextChar()
      if (!char || isWhitespace(char)) return value
      value += char
    }
  }
]

function parse (code, tokenizers = defaultTokenizers) {
  let cursor = 0
  let nextChar = () => code[cursor++]
  let rewind = (n = 1) => cursor -= n
  return readToken(nextChar, rewind, tokenizers)
}

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

const defaultMacros = {
  '+' (...args) {
    return '(' + args.join(' + ') + ')'
  },
  '-' (...args) {
    args.unshift('0') // handle single args (`(- 5)` should be -5)
    return '(' + args.join(' - ') + ')'
  },
  '%' (a, b) {
    return `(${a} % ${b})`
  },
  'map' (func, iterator) {
    return `mapIterator(${func}, ${iterator})`
  },
  '=>' (arg, expression) {
    return `(${arg}) => (${expression})`
  },
  'range' (...args) {
    return `range(${args.join(', ')})`
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
  'func' (body) {
    return `(function (...args) { return (${body}) })`
  },
  'call' (obj, method, ...args) {
    return `(${obj}.${method}(${args.join(', ')}))`
  },
  'macro' (name, func) {
    defaultMacros[name] = eval(func)
  },
  'toArray' (iterator) {
    return `(Array.from(${iterator}))`
  }
}

function transform (tree, macros = defaultMacros) {
  let [ operator, ...expressions ] = tree
  let args = []
  for (let expression of expressions) {
    if (!Array.isArray(expression)) {
      // static token
      args.push(expression)
    } else {
      // transformable expression
      args.push(transform(expression, macros))
    }
  }
  let macro = macros[operator]
  if (!macro) throw Error(`macro "${operator}" not found`)
  return macro(...args)
}

function evalLisp (code, macros = defaultMacros, tokenizers = defaultTokenizers) {
  if (Array.isArray(code)) {
    // called as template string tag
    code = String.raw(...Array.from(arguments))
    macros = defaultMacros
    tokenizers = defaultTokenizers
  }

  let tree = parse(code, tokenizers)
  let js = `
    (function () {
      ${range.toString()};
      ${mapIterator.toString()};
      return ${transform(tree, macros)}
    })()
  `
  return eval(js)
}

module.exports = evalLisp
module.exports.parse = parse
module.exports.transform = transform
module.exports.defaultMacros = defaultMacros
module.exports.defaultTokenizers = defaultTokenizers
