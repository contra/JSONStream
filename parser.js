module.exports = function (stream) {
  const parser = new Parser()
  parser.onValue = function (value) {
    if (!this.root) stream.root = value

    if (!path) return

    let i = 0 // iterates on path
    let j = 0 // iterates on stack
    let emitKey = false
    let emitPath = false
    while (i < path.length) {
      let key = path[i]
      let c
      j++

      if (key && !key.recurse) {
        c = j === this.stack.length ? this : this.stack[j]
        if (!c) return
        if (!check(key, c.key)) {
          setHeaderFooter(c.key, value)
          return
        }
        emitKey = !!key.emitKey
        emitPath = !!key.emitPath
        i++
      } else {
        i++
        let nextKey = path[i]
        if (!nextKey) return
        while (true) {
          c = j === this.stack.length ? this : this.stack[j]
          if (!c) return
          if (check(nextKey, c.key)) {
            i++
            if (!Object.isFrozen(this.stack[j])) this.stack[j].value = null
            break
          } else {
            setHeaderFooter(c.key, value)
          }
          j++
        }
      }
    }

    // emit header
    if (header) {
      stream.emit('header', header)
      header = false
    }
    if (j !== this.stack.length) return

    count++
    let actualPath = this.stack
      .slice(1)
      .map(function (element) {
        return element.key
      })
      .concat([this.key])
    let data = value
    if (null != data)
      if (null != (data = map ? map(data, actualPath) : data)) {
        if (emitKey || emitPath) {
          data = { value: data }
          if (emitKey) data['key'] = this.key
          if (emitPath) data['path'] = actualPath
        }

        stream.push(data)
      }
    if (this.value) delete this.value[this.key]
    for (let k in this.stack) if (!Object.isFrozen(this.stack[k])) this.stack[k].value = null
  }
  parser._onToken = parser.onToken

  parser.onToken = function (token, value) {
    parser._onToken(token, value)
    if (this.stack.length === 0) {
      if (stream.root) {
        if (!path) stream.push(stream.root)
        count = 0
        stream.root = null
      }
    }
  }

  parser.onError = function (err) {
    if (err.message.indexOf('at position') > -1) err.message = 'Invalid JSON (' + err.message + ')'
    stream.emit('error', err)
  }
  return parser
}