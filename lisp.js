function parse (code) {
  code = code.trim().replace(/\n/g, '')

  let tree = []
  let stack = []
  let i = 0

  let peek = () => stack[stack.length - 1]

  function * chars () {
    while (i < code.length) yield code[i++]
  }

  function readToken () {
    let start = i
    let length = 0
    for (let char of chars()) {
      if (char === ' ' || char === ')') {
        if (char === ')') i -= 1 // re-emit bracket
        return code.slice(start, start + length)
      }
      length++
    }
  }

  for (let char of chars()) {
    if (char === '(') {
      // start of an expression
      let parent = peek()
      let expression = []
      stack.push(expression)
      if (parent) parent.push(expression)
    } else if (char === ')') {
      // end of expression
      let expression = stack.pop()
      if (stack.length === 0) tree.push(expression)
    } else if (char === ' ') {
      // end of token, no-op
    } else {
      // token separator
      i -= 1 // re-emit token's first char
      peek().push(readToken())
    }
  }

  // if there is only one top-level expression, it should be the root
  if (tree.length === 1) tree = tree[0]

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

function lisp (code, macros = defaultMacros) {
  let tree = parse(code)
  let js = transform(tree, macros)
  return eval(js)
}

// let tree = parse(`
//   (foo 1 2
//     (+ 3 4 (- 5))
//     (+ 1 2))
// `)
// let tree = parse(`
//   (map
//     (=> i
//       (print
//         (? (% i 15)
//         (? (% i 3)
//         (? (% i 5) i 'buzz') 'fizz') 'fizzbuzz')))
//     (range 1 101))
// `)
// let tree = parse(`
//   (map
//     (=> i
//       (print (cond
//         (! (% i 15)) 'fizzbuzz'
//         (! (% i 3)) 'fizz'
//         (! (% i 5)) 'buzz'
//         i)))
//     (range 1 101))
// `)
// let tree = parse(`
//   (map
//     (=> i
//       (print (or (+
//         (? (% i 3) '' 'fizz')
//         (? (% i 5) '' 'buzz'))
//         i)))
//     (range 1 101))
// `)
lisp(`
  (macro *
    (func (call args join '*')))
`)

console.log(lisp(`
  (* 1 2 3)
`))
