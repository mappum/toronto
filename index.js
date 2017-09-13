// load non-core operators
Object.assign(
  require('./src/operators.js').operators,
  require('./src/operators/def.js'))

module.exports = require('./src/main.js')
