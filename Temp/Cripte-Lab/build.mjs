import { build } from '../Production/node_modules/esbuild/lib/main.js';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root=dirname(fileURLToPath(import.meta.url));
const result=await build({entryPoints:[resolve(root,'app.js')],bundle:true,write:false,format:'iife',target:'es2020',minify:true,legalComments:'inline',nodePaths:[resolve(root,'../Production/node_modules')]});
const template=await readFile(resolve(root,'template.html'),'utf8');
const css=await readFile(resolve(root,'styles.css'),'utf8');
const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
await writeFile(resolve(root,'index.html'),template.replace('/* INLINE_STYLES */',()=>css).replace('/* INLINE_SCRIPT */',()=>js));
await copyFile(resolve(root,'../Production/node_modules/three/LICENSE'),resolve(root,'THREE-LICENSE.txt'));
console.log('Creato Cripte-Lab/index.html: HTML autonomo, senza richieste di rete.');
