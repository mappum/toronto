'use strict'

module.exports = function expand (tree, macros) {
  let expansion = []
  for (let expression of tree) {
    if (!Array.isArray(expression)) {
      // static value
      expansion.push(expression)
    } else {
      // expandable expression
      let childExpansion = expand(expression, macros)
      if (expansion.length === 0) {
        // first list element,
        // JS code expansion gets evalled at expansion time
        childExpansion = eval(childExpansion)
      }
      expansion.push(childExpansion)
    }
  }
  let [ operator, ...args ] = expansion

  if (typeof operator === 'function') {
    // if operator expanded to a function,
    // this expression should be a call
    args.unshift(operator)
    operator = 'call'
  }
  let macro = macros[operator]
  if (!macro) throw Error(`macro "${operator}" not found`)
  return macro(...args)
}
