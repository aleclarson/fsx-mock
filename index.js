
const path = require('path')
const fs = require('fsx')

// The mock will use the actual method if necessary.
const {
  exists,
  isDir, readDir,
  isFile, readFile,
  isLink, readLink, readLinks,
} = fs

// TODO: Implement these when they're needed.
const unimplemented = [
  'exists', 'writeLink', 'rename', 'copy', 'watch'
]

exports.install = function(cwd = process.cwd()) {

  // Flat map of dirs to file names
  const dirs = Object.create(null)

  // Flat map of paths to file contents
  const files = Object.create(null)

  // Flat map of "deleted" paths
  const deleted = Object.create(null)

  // Ensure root exists.
  dirs[cwd] = readDir(cwd)

  // Revert any changes.
  fs.reset = (name) => {
    if (typeof name == 'string') {
      const file = getPath(name)
      const names = dirs[file]
      if (names) {
        names.forEach(name => {
          fs.reset(path.join(file, name))
        })
        delete dirs[file]
      } else {
        delete files[file]
        delete deleted[file]
      }
    } else {
      exports.install(cwd)
    }
  }

  fs.isDir = (name) => {
    const dir = getPath(name)
    if (deleted[dir]) return false
    if (Array.isArray(dirs[dir])) return true
    return files[dir] == null && isDir(dir)
  }

  fs.readDir = (name) => {
    const dir = getPath(name)
    if (typeof files[dir] == 'string') {
      uhoh(`Expected a directory: '${name}'`, 'DIR_NOT_FOUND')
    }
    if (deleted[dir]) {
      uhoh(`Cannot use \`readDir\` on a non-existent path: '${name}'`, 'DIR_NOT_FOUND')
    }
    return dirs[dir] || readDir(dir)
  }

  fs.writeDir = (name) => {
    const dir = getPath(name)
    if (!fs.isDir(dir)) {
      createDir(dir)
    }
  }

  // NOTE: Removing real directories is simulated.
  fs.removeDir = (name) => {
    const dir = getPath(name)
    if (fs.isDir(dir)) {
      const names = dirs[dir] || readDir(dir)
      names.slice().forEach(name => {
        const file = path.join(dir, name)
        if (fs.isDir(file)) {
          fs.removeDir(file)
        } else {
          fs.removeFile(file)
        }
      })
      if (exists(dir)) {
        deleted[dir] = true
      }
      removePath(dir)
      delete dirs[dir]
    } else if (exists(dir)) {
      uhoh(`Expected a directory: '${name}'`, 'DIR_NOT_FOUND')
    } else {
      uhoh(`Cannot use \`removeDir\` on a non-existent path: '${name}'`, 'DIR_NOT_FOUND')
    }
  }

  fs.isFile = (name) => {
    const file = getPath(name)
    if (deleted[file]) return false
    if (typeof files[file] == 'string') return true
    return dirs[file] == null && isFile(file)
  }

  // TODO: Support encoding
  fs.readFile = (name) => {
    const file = getPath(name)
    if (Array.isArray(dirs[file])) {
      uhoh(`Cannot use \`readFile\` on a directory: '${name}'`, 'FILE_NOT_FOUND')
    }
    if (deleted[file]) {
      uhoh(`Cannot use \`readFile\` on a non-existent path: '${name}'`, 'FILE_NOT_FOUND')
    }
    const content = files[file]
    if (typeof content == 'string') {
      return content
    }
    return readFile(file)
  }

  fs.writeFile = (name, content) => {
    const file = getPath(name)
    if (fs.isDir(file)) {
      uhoh(`Cannot use \`writeFile\` on a directory: '${name}'`, 'PATH_EXISTS')
    }
    if (typeof files[file] != 'string') {
      addPath(file)
    }
    files[file] = String(content)
  }

  fs.append = (name, content) => {
    const file = getPath(name)
    if (fs.isDir(file)) {
      uhoh(`Cannot use \`append\` on a directory: '${name}'`, 'PATH_EXISTS')
    }
    if (typeof files[file] != 'string') {
      addPath(file)
    }
    const prev = fs.isFile(file) ? fs.readFile(file) : ''
    files[file] = prev + content
  }

  // NOTE: Removing real files is simulated.
  fs.removeFile = (name) => {
    const file = getPath(name)
    if (exists(file)) {
      if (fs.isDir(file)) {
        uhoh(`Cannot use \`removeFile\` on a directory: '${name}'`, 'FILE_NOT_FOUND')
      }
      deleted[file] = true
    } else if (typeof files[file] != 'string') {
      uhoh(`Cannot use \`removeFile\` on a non-existent path: '${name}'`, 'FILE_NOT_FOUND')
    }
    removePath(file)
    delete files[file]
  }

  fs.isLink = (name) => {
    const file = getPath(name)
    if (deleted[file]) return false
    return isMocked(file) ? false : isLink(file)
  }

  fs.readLink = (name) => {
    const file = getPath(name)
    if (deleted[file]) return name
    return isMocked(file) ? name : readLink(file)
  }

  fs.readLinks = (name) => {
    const file = getPath(name)
    if (deleted[file]) return name
    return isMocked(file) ? name : readLinks(file)
  }

  return fs

  function isMocked(path) {
    return files[path] != null || dirs[path] != null
  }

  function getPath(name) {
    return path.isAbsolute(name) ? name : path.resolve(cwd, name)
  }

  // Add a path to its parent directory.
  function addPath(file) {
    const dir = path.dirname(file)
    const names = dirs[dir] || createDir(dir)
    const name = file.slice(dir.length + 1)
    if (names.indexOf(name) == -1) {
      names.push(name)
      delete deleted[file]
    }
  }

  // Remove a path from its parent directory.
  function removePath(file) {
    const dir = path.dirname(file)
    const names = dirs[dir] || createDir(dir)
    names.splice(names.indexOf(path.basename(file)), 1)
  }

  // NOTE: This function assumes `path` does not exist in `dirs` yet.
  function createDir(dir) {
    let names
    if (exists(dir)) {
      names = readDir(dir).filter(name => {
        const file = path.join(dir, name)
        return !deleted[file]
      })
    } else {
      names = []
    }
    addPath(dir)
    dirs[dir] = names
    return names
  }
}

function uhoh(msg, code) {
  const e = Error(msg)
  if (code) e.code = code
  Error.captureStackTrace(e, uhoh)
  throw e
}
