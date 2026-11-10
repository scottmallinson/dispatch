// The package is ESM, but Electron's preload script must be CommonJS.
// tsc emits the Electron code into dist-electron, so mark that folder as CommonJS.
import { writeFileSync } from 'node:fs';

writeFileSync('dist-electron/package.json', `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
