#!node

// Read in the type definitions from all modules in the runtime and the runtime's own types
// Naively aggregates types and writes them to disk.

const fs = require('fs');

// A list of all the installed modules' folder names.
// Does not include system pallets because Apps already supports them.
// Redundant with construct_runtime!
const modules = [
	"crowdfunding",
	"governance",
	"sense",
	"uniq",
	"hypaspace",
	// "airdrop",
	// "currencies",
	// "horizon",
	// "payment"
]

// Types that are native to the runtime itself (ie come from lib.rs)
const runtimeOwnTypes = {
  "Address": "MultiAddress",
  "LookupSource": "MultiAddress",
  "AccountInfo": "AccountInfoWithDualRefCount",
  "AccountInfoWithDualRefCount": {
    "nonce": "Index",
    "consumers": "RefCount",
    "providers": "RefCount",
    "data": "AccountData"
  }
}

// Loop through all modules aggregating types
let finalTypes = runtimeOwnTypes;
let moduleTypes;
for (let dirname of modules) {
	let path = `./modules/${dirname}/types.json`;
	moduleTypes = JSON.parse(fs.readFileSync(path, 'utf8'));
	finalTypes = {...finalTypes, ...moduleTypes};
}

// Write output to disk
fs.writeFileSync("types.json", JSON.stringify(finalTypes, null, 2), 'utf8');
