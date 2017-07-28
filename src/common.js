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

module.exports = { createCharReader }
