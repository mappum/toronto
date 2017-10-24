'use strict'

// lets you read chars, and optionally reset the cursor to where it was before reading
function createCharReader (nextChar, rewind) {
  let charsRead = 0
  return {
    nextChar () {
      charsRead += 1
      return nextChar()
    },
    reset () {
      rewind(charsRead)
      charsRead = 0
    },
    rewind (n = 1) {
      rewind(n)
      charsRead -= n
    }
  }
}

function scopedEval (code, ctx) {
  return (function (code) {
    'use strict'
    return eval(code)
  }).call(ctx, code)
}

module.exports = {
  createCharReader,
  scopedEval
}
