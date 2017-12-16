
# fsx-mock v0.0.1

This library provides an in-memory layer on top of an actual
filesystem. The methods of [`fsx`](https://github.com/aleclarson/fsx)
are replaced with functions that operate on the in-memory filesystem,
though the actual filesystem may be accessed (but never mutated).

### Features

- All changes are only accessible using this library.
- Real files/directories can be "removed", but in reality, they
are left untouched.
- Errors are the same as using the real API (including error codes).
- Call the `reset` method to revert all changes!

Check out [`fsx`](https://github.com/aleclarson/fsx) for details on the API.

### Usage

```js
const mockFs = require('fsx-mock')

// If no working directory is passed, `process.cwd()` is used.
const fs = mockFs.install('/path/to/cwd')

// Non-absolute paths are resolved relative to the working directory.
fs.writeFile('foo', 'hello world')

// This will equal true.
fs.readFile('/path/to/cwd/foo') == 'hello world'

// Revert all changes.
fs.reset()

// This will now throw an error.
fs.readFile('foo')
```
