const fs = require('fs')

// files which need a regular version bump
const bump_files = [
	'bin/nodes/subzero/cli/Cargo.toml',
	'bin/runtimes/alphaville/Cargo.toml'
]
// files which need different bumps
const conf_files = [
	'bin/runtimes/alphaville/src/lib.rs'
]

fs.readFile(someFile, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  var result = data.replace(/string to be replaced/g, 'replacement');

  fs.writeFile(someFile, result, 'utf8', function (err) {
     if (err) return console.log(err);
  });
});