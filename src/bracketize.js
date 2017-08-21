'use strict'

function getIndentationLevel (line) {
  let level = 0
  for (let char of line) {
    if (char === ' ') {
      level += 1
    } else if (char === '\t') {
      throw Error('Indentation must use spaces!')
    } else {
      return level
    }
  }
}

function readLine (nextChar) {
  let line = ''
  let char
  do {
    char = nextChar()
    if (char === '\n') {
      return line
    }
    line += char
  } while (char != null)
}

function bracketize (code, brackets) {
  let output = []
  let stack = []

  let cursor = 0
  let nextChar = () => code[cursor++]

  let peek = () => stack[stack.length - 1]
  let prevLevel = () => peek().level || 0

  // iterate through each line to build hierarchy
  while (cursor < code.length) {
    let line = readLine(nextChar)
    if (!line) continue
    let trimmed = line.trim()
    if (!trimmed) continue

    let level = getIndentationLevel(line)

    let node = { code: trimmed, level, children: [] }
    if (stack.length === 0) {
      // first expression, no-op
    } else if (level > prevLevel()) {
      // indented, child expression
      peek().children.push(node)
    } else if (level === prevLevel()) {
      // same indentation, sibling expression
      stack.pop()
      peek().children.push(node)
    } else if (level < prevLevel()) {
      // unindented, subling of ancestor
      while (peek().level > level) stack.pop()
      stack.pop()
      peek().children.push(node)
    }
    stack.push(node)
  }

  // traverse tree of lines, and add brackets
  function traverse (node) {
    let indent = ' '.repeat(node.level)
    let hasChildren = node.children.length !== 0
    let end = !hasChildren ? ')' : ''
    output.push(`${indent}(${node.code}${end}`)
    for (let child of node.children) {
      traverse(child)
    }
    if (hasChildren) {
      output[output.length - 1] += ')'
    }
  }

  traverse(stack[0])
  return output.join('\n')
}

module.exports = bracketize
