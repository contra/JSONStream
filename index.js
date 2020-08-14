const Parser = require('jsonparse')
const through2 = require('through2')

exports.parse = function (path, map) {
  let header, footer
  const parser = new Parser()
  const stream = through2.obj(function (chunk, enc, cb) {
    if (typeof chunk === 'string') chunk = Buffer.from(chunk)
    parser.write(chunk)
    cb()
  }, function (cb) {
    if (header) stream.emit('header', header)
    if (footer) stream.emit('footer', footer)

    if (parser.tState != Parser.C.START || parser.stack.length > 0) {
      cb(new Error('Incomplete JSON'))
      return
    }
    cb()
  })

  if ('string' === typeof path)
    path = path.split('.').map(function (e) {
      if (e === '$*') return { emitKey: true }
      else if (e === '*') return true
      else if (e === '')
        // '..'.split('.') returns an empty string
        return { recurse: true }
      else return e
    })

  let count = 0, _key
  if (!path || !path.length) path = null

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
    stream.destroy(err)
  }

  return stream

  function setHeaderFooter(key, value) {
    // header has not been emitted yet
    if (header !== false) {
      header = header || {}
      header[key] = value
    }

    // footer has not been emitted yet but header has
    if (footer !== false && header === false) {
      footer = footer || {}
      footer[key] = value
    }
  }
}

function check(x, y) {
  if ('string' === typeof x) return y == x
  else if (x && 'function' === typeof x.exec) return x.exec(y)
  else if ('boolean' === typeof x || 'object' === typeof x) return x
  else if ('function' === typeof x) return x(y)
  return false
}

exports.stringify = function (op, sep, cl, indent) {
  indent = indent || 0
  if (op === false) {
    op = ''
    sep = '\n'
    cl = ''
  } else if (op == null) {
    op = '[\n'
    sep = '\n,\n'
    cl = '\n]\n'
  }

  //else, what ever you like

  let first = true
  let anyData = false

  const stream = through2.obj(function (data, _, cb) {
    anyData = true
    let json
    try {
      json = JSON.stringify(data, null, indent)
    } catch (err) {
      return cb(err)
    }
    if (first) {
      first = false
      cb(null, (typeof op === 'function' ? op() : op) + json)
    } else {
      cb(null, sep + json)
    }
  }, function (cb) {
    if (!anyData) this.push(op)
    if (typeof cl === 'function') {
      cl((err, res) => {
        if (err) return cb(err)
        this.push(res)
        cb()
      })
      return
    }
    this.push(cl)
    cb()
  })

  return stream
}

exports.stringifyObject = function (op, sep, cl, indent) {
  indent = indent || 0
  if (op === false) {
    op = ''
    sep = '\n'
    cl = ''
  } else if (op == null) {
    op = '{\n'
    sep = '\n,\n'
    cl = '\n}\n'
  }

  let first = true
  let anyData = false
  const stream = through2.obj(function (data, enc, cb) {
    anyData = true
    let json
    try {
      json = JSON.stringify(data[0]) + ':' + JSON.stringify(data[1], null, indent)
    } catch (err) {
      return cb(err)
    }
    if (first) {
      first = false
      cb(null, (typeof op === 'function' ? op() : op) + json)
    } else {
      cb(null, sep + json)
    }
  }, function (cb) {
    if (!anyData) this.push(op)
    if (typeof cl === 'function') {
      cl((err, res) => {
        if (err) return cb(err)
        this.push(res)
        cb()
      })
      return
    }
    this.push(cl)
    cb()
  })

  return stream
}
