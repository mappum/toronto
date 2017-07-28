'use strict'

let test = require('tape')
let { parse } = require('..')

test('parse with default tokenizers', (t) => {
  t.test('parse top-level immediate token', (t) => {
    let tree = parse('foo')
    t.equal(tree, 'foo', 'correct tree')
    t.end()
  })

  t.test('parse top-level parenthetic expression', (t) => {
    let tree = parse('(foo bar)')
    t.deepEqual(tree, [ 'foo', 'bar' ], 'correct tree')
    t.end()
  })

  t.test('parse top-level square bracket expression', (t) => {
    let tree = parse('[foo bar]')
    t.deepEqual(tree, [ '[]', 'foo', 'bar' ], 'correct tree')
    t.end()
  })

  t.test('parse nested parenthetic expression', (t) => {
    let tree = parse('(foo (bar))')
    t.deepEqual(tree, [ 'foo', [ 'bar' ] ], 'correct tree')
    t.end()
  })

  t.test('parse empty string', (t) => {
    let tree = parse('')
    t.equal(tree, '', 'correct tree')
    t.end()
  })

  t.end()
})
