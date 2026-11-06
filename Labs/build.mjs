import { build } from '../Production/node_modules/esbuild/lib/main.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
await build({entryPoints:[path.join(here,'src/app.ts')],outfile:path.join(here,'app.js'),bundle:true,format:'iife',platform:'browser',target:'es2020',nodePaths:[path.join(here,'../Production/node_modules')],plugins:[{name:'ignore-game-css',setup(build){build.onLoad({filter:/\.css$/},()=>({contents:'',loader:'css'}));}}],logLevel:'info'});
