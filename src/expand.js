'use strict'

module.exports = function expand (input, ops) {
  if (!Array.isArray(input)) {
    // static value, return it
    return input
  }

  // input is a list expression, get operator
  let [ operator, ...args ] = input
  if (Array.isArray(operator)) {
    // if operator is list, expand it
    operator = expand.call(ops, operator, ops)
  }
  let operatorFunc = ops[operator]

  let topLevelOp = ops.hasOwnProperty(operator)
  let isMacro = operatorFunc && operatorFunc['__toronto_macro__']
  if (operator !== 'eval' && !isMacro && (!operatorFunc || topLevelOp)) {
    // if op not defined, or if defined in top-level context,
    // use a dynamic call (call at js runtime)
    operatorFunc = ops['call']
    args = input
  }

  if (isMacro) {
    let a = operatorFunc(...args)
    // pass unexpanded args to macro
    return expand.call(ops, a, ops)
  }

  // recursively expand args then pass to operator function
  args = args.map((arg) => expand.call(ops, arg, ops))
  return operatorFunc(...args)
}
