function isWhitespace (str) {
  return str.match(/\s/)
}

let immediateTokenizer = {
  name: 'immediate',
  isStart (nextChar, isParentEnd) {
    while (true) {
      let char = nextChar()
      if (isWhitespace(char) || isParentEnd()) return true
    }
  },
  isEnd: () => true
}

let defaultTokenizers = [
  {
    name: 'expression',
    isStart: (nextChar) => nextChar() === '(',
    isEnd: (nextChar) => nextChar() === ')',
    toValue: (...args) => args
  }, {
    name: 'squareBracketList',
    isStart: (nextChar) => nextChar() === '[',
    isEnd: (nextChar) => nextChar() === ']',
    toValue: (...args) => [ 'vec', ...args ]
  },
  immediateTokenizer
]

function parse (code, tokenizers = defaultTokenizers) {
  code = code.trim().replace(/\n/g, '')

  let tree = []
  let stack = []
  let peek = () => stack[stack.length - 1]
  let i = 0
  let nextChar = () => code[i++]
  let isParentEnd = () => {
    if (stack.length === 0) return i >= code.length
    let cursor = i
    let isEnd = peek().tokenizer.isEnd(nextChar)
    i = cursor
    return isEnd
  }

  function readToken () {
    // terminate token currently being read
    let start = i
    if (peek() && peek().tokenizer.isEnd(nextChar)) {
      let { tokenizer, children, start } = stack.pop()

      let value
      if (tokenizer === immediateTokenizer) {
        // special case: token is immediate value
        value = code.slice(start, i).trim()
        if (!value) return
      } else {
        value = tokenizer.toValue(...children)
      }

      if (stack.length === 0) {
        // top-level token, this is the root of the tree
        tree = value
      } else {
        // child token, push to parent
        peek().children.push(value)
      }

      return
    } else {
      // reset cursor from before irrelevant `isEnd` call
      i = start
    }

    // push new tokens on the stack
    for (let tokenizer of tokenizers) {
      let start = i
      if (!tokenizer.isStart(nextChar, isParentEnd)) {
        i = start // reset cursor
        continue
      }
      stack.push({ tokenizer, start })
      if (tokenizer !== immediateTokenizer) {
        peek().children = []
      }
      return
    }
  }

  while (i < code.length) {
    readToken()
  }
  if (stack.length > 0) readToken()

  return tree
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
  'foo' (a, b, c, d) {
    return `console.log(${a} + ${b}, ${c} + ${d})`
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
