'use strict'

module.exports = function expand (input, ops) {
  if (!Array.isArray(input)) {
    // static value
    return input
  }

  // input is a list expression, get operator
  let [ operator, ...args ] = input
  let operatorFunc
  if (Array.isArray(operator)) {
    operatorFunc = eval(expand(operator, ops))
  } else {
    operatorFunc = ops[operator]
    if (!operatorFunc) {
      throw Error(`Operator "${operator}" not found`)
    }
  }

  let isMacro = operatorFunc['__toronto_macro__']
  if (isMacro) {
    let a = operatorFunc(...args)
    // pass unexpanded args to macro
    return expand(a, ops)
  }

  // recursively expand args then pass to operator function
  args = args.map((arg) => expand(arg, ops))
  return operatorFunc(...args)
}
