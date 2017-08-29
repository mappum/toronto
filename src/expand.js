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
    let expansion = expand.call(ops, operator, ops)
    operatorFunc = new Function(expansion).bind(ops)
  } else {
    operatorFunc = ops[operator]
    if (!operatorFunc) {
      // if not defined, fall back to dynamic call
      operatorFunc = ops['call']
      args = input
    }
  }

  let isMacro = !!operatorFunc['__toronto_macro__']
  if (isMacro) {
    let a = operatorFunc(...args)
    // pass unexpanded args to macro
    return expand.call(ops, a, ops)
  }

  // recursively expand args then pass to operator function
  args = args.map((arg) => expand(arg, ops))
  return operatorFunc(...args)
}
