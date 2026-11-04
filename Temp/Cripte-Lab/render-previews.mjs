import { chromium } from '../Production/node_modules/playwright/index.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const root=dirname(fileURLToPath(import.meta.url));
await mkdir(resolve(root,'immagini'),{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1800,height:1100},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(resolve(root,'index.html')).href);await page.waitForFunction(()=>document.body.dataset.ready);
  if(await page.locator('body').getAttribute('data-ready')!=='true')throw new Error('La scena WebGL non è pronta.');
  await page.waitForTimeout(400);
  await page.screenshot({path:resolve(root,'immagini','00-laboratorio.png'),fullPage:true});
  await page.evaluate(()=>window.cryptLab.setView({mode:'neighbourhood',state:'clean',night:false,capture:true}));
  await page.waitForTimeout(250);await page.screenshot({path:resolve(root,'immagini','01-quartiere.png')});
  await page.evaluate(()=>window.cryptLab.setView({night:true}));
  await page.waitForTimeout(200);await page.screenshot({path:resolve(root,'immagini','02-quartiere-notte.png')});
  await page.setViewportSize({width:1800,height:1000});
  const ids=['zombie','ghost','skeleton','nature','supernatural'];
  for(let i=0;i<ids.length;i++){
    await page.evaluate(type=>window.cryptLab.setView({type,mode:'comparison',state:'clean',night:false,capture:true}),ids[i]);
    await page.waitForTimeout(180);await page.screenshot({path:resolve(root,'immagini',`${String(i+3).padStart(2,'0')}-${ids[i]}-stati.png`)});
  }
  await page.setViewportSize({width:1200,height:1200});
  for(let i=0;i<ids.length;i++){
    await page.evaluate(type=>window.cryptLab.setView({type,mode:'single',state:'clean',night:false,capture:true}),ids[i]);
    await page.waitForTimeout(150);await page.screenshot({path:resolve(root,'immagini',`${String(i+9).padStart(2,'0')}-${ids[i]}-cortile.png`)});
  }
  await page.setViewportSize({width:2000,height:1100});
  await page.evaluate(()=>window.cryptLab.setView({mode:'architecture',state:'clean',night:false,capture:true}));
  await page.waitForTimeout(200);await page.screenshot({path:resolve(root,'immagini','14-cinque-forme.png')});
  await page.setViewportSize({width:1800,height:1000});
  for(let i=0;i<ids.length;i++){
    await page.evaluate(type=>window.cryptLab.setView({type,mode:'variants',state:'clean',variant:1,night:false,capture:true}),ids[i]);
    await page.waitForTimeout(200);await page.screenshot({path:resolve(root,'immagini',`${String(i+15).padStart(2,'0')}-${ids[i]}-varianti.png`)});
  }
  for(let i=0;i<ids.length;i++){
    await page.evaluate(type=>window.cryptLab.setView({type,mode:'variants',state:'clean',variant:1,night:true,capture:true}),ids[i]);
    await page.waitForTimeout(250);await page.screenshot({path:resolve(root,'immagini',`${String(i+21).padStart(2,'0')}-${ids[i]}-notte.png`)});
  }
  await writeFile(resolve(root,'immagini','render-report.json'),JSON.stringify({errors,source:'Three.js WebGL / actual procedural geometry',capturedAt:new Date().toISOString()},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Rendering completati: laboratorio, quartiere, tre stati, dettagli e confronto delle cinque architetture.');
}finally{await browser.close();}
