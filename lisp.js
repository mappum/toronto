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
    i -= 1 // re-emit first char
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
      peek().push(readToken())
    }
  }

  // if there is only one top-level expression, it should be the root
  if (tree.length === 1) tree = tree[0]

  return tree
}

console.log(JSON.stringify(parse(`
  (foo 1 2
    (+ 3 4 (- 5))
    (+ 1 2))
`), null, '  '))
