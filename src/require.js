let Module = require('module')
let fs = require('fs')
let path = require('path')
let vm = require('vm')
let { expand, parse } = require('./main.js')

module.exports = function (toPath) {
  let filename = path.resolve(toPath)
  let dirname = path.dirname(filename)

  let toCode = fs.readFileSync(filename, 'utf8')
  let jsCode = expand(parse(toCode))
  let wrapper = Module.wrap(jsCode)

  let compiledWrapper = vm.runInThisContext(wrapper, {
    filename,
    lineOffset: 0,
    displayErrors: true
  })

  let _require = (modulePath) =>
    require(path.join(dirname, modulePath))

  let module = { exports: {} }
  compiledWrapper.call(
    module.exports, module.exports,
    _require, module,
    filename, dirname)
  return module.exports
}
