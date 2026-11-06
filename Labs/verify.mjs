import { chromium } from '../Production/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:1100},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(resolve('Labs/index.html')).href);await page.waitForFunction(()=>window.__labsReady===true,{timeout:30000});
const bounds=await page.evaluate(()=>window.__labsBounds());
for(const b of bounds){if(b.min[0]<(b.size==='compact'?-2.01:-2.51)||b.max[0]>(b.size==='compact'?2.01:2.51)||b.min[2]<(b.size==='compact'?-1.51:-2.01)||b.max[2]>(b.size==='compact'?1.51:2.01)) throw new Error(`Fuori dal lotto: ${b.id} (${b.condition}): ${JSON.stringify(b)}`);}
console.log('Ingombri verificati: 7 proposte × 3 stati × 2 lotti, seed 1.');
for(const label of ['Casa infestata · I','Casa infestata · II','Casa infestata · III','Serra del fioraio','Canonica','Casa del lampionaio','Casetta del Mietitore']){
 await page.getByRole('button',{name:label,exact:true}).click();
 for(const state of ['intact','dirty','broken']){await page.locator('#condition').selectOption(state);if(await page.locator('#title').textContent()!==label)throw new Error('Selezione errata: '+label);}
 await page.locator('#condition').selectOption('intact');
 const slug=label.toLowerCase().replaceAll(' ','-').replaceAll('·-','').replaceAll('à','a');
 await page.locator('.comparison').screenshot({path:`Labs/immagini/${slug}.png`});
 await page.locator('#rotate-proposal').click();
 if(await page.locator('#proposal-size').textContent()!=='3 × 4 celle') throw new Error('Lotto ruotato errato: '+label);
 await page.locator('#rotate-proposal').click();
 if(await page.locator('#rotate-proposal').getAttribute('data-rotation')!=='2') throw new Error('Rotazione errata: '+label);
 await page.locator('.comparison').screenshot({path:`Labs/immagini/retro-${slug}.png`});
 await page.locator('#rotate-proposal').click();await page.locator('#rotate-proposal').click();
}
await page.locator('#lot-size').selectOption('large');
if(await page.locator('#proposal-size').textContent()!=='5 × 4 celle') throw new Error('Lotto precedente non disponibile');
await page.locator('#lot-size').selectOption('compact');
await page.getByRole('button',{name:'☾ Notte'}).click();await page.getByRole('button',{name:'Dall’alto'}).click();await page.locator('.comparison').screenshot({path:'Labs/immagini/griglia-notte.png'});
await page.locator('#reference').selectOption('gravedigger');await page.locator('#reference').selectOption('shop');await page.locator('#grid').uncheck();
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);if(await page.locator('body').evaluate(e=>e.scrollWidth>innerWidth)) throw new Error('Overflow orizzontale della pagina mobile');
if(errors.length)throw new Error(errors.join('\n'));
console.log('Sette modelli, tre stati, illuminazione, griglia, viste, riferimenti e viewport mobile verificati.');await browser.close();
