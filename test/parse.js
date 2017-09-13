'use strict'

let test = require('tape')
let { parse } = require('..')

test('simple parsing', (t) => {
  function parseTest (name, input, expected) {
    t.test(`parse ${name}`, (t) => {
      let actual = parse(input)
      t.deepEqual(actual, expected, 'correct parser output')
      t.end()
    })
  }

  parseTest(
    'top-level immediate token',
    'foo',
    'foo')

  parseTest(
    'top-level parenthetic expression',
    '(foo bar)',
    [ 'foo', 'bar' ])

  parseTest(
    'top-level parenthetic expression with weird spacing',
    ' ( foo   bar  ) ',
    [ 'foo', 'bar' ])

  parseTest(
    'top-level array expression',
    '[foo bar baz]',
    [ '[]', 'foo', 'bar', 'baz' ])

  parseTest(
    'top-level array expression with weird spacing',
    ' [  foo  bar  baz ] ',
    [ '[]', 'foo', 'bar', 'baz' ])

  parseTest(
    'top-level object expression',
    '{foo: (bar) baz }',
    [ '{}', 'foo:', [ 'bar' ], 'baz' ])

  parseTest(
    'top-level object expression with weird spacing',
    ' {     foo:   (  bar  )      baz } ',
    [ '{}', 'foo:', [ 'bar' ], 'baz' ])

  parseTest(
    'nested parenthetic expression',
    '(foo (bar))',
    [ 'foo', [ 'bar' ] ])

  parseTest(
    'empty string',
    '',
    '')

  parseTest(
    'multiline expression',
    `
      (foo
        (bar (baz
          1
          2 3))
      )
    `,
    [ 'foo',
      [ 'bar',
        [ 'baz', '1', '2', '3' ] ] ])

  parseTest(
    'comments',
    `
    ; semicolon comment
    // slash slash comment
    (foo
      // (x y z)
      a b c)
    `,
    [ 'foo', 'a', 'b', 'c' ])

  parseTest(
    'shorthand prefixes',
    '(burrito $(taco) %(nacho <queso>))',
    [ 'burrito',
      [ 'eval', [ 'taco' ] ],
      [ 'list',
        [ 'nacho', [ 'escape', 'queso' ] ] ] ])

  parseTest(
    'strings',
    '(print "spaghetti" \'linguine\' `macaroni`)',
    [ 'print', '"spaghetti"', "'linguine'", '`macaroni`' ])

  t.end()
})
