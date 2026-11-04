import { chromium } from '../Production/node_modules/playwright/index.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const root=dirname(fileURLToPath(import.meta.url));
const dir=resolve(root,'icone-bottega');await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1200,height:1700},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(resolve(root,'index.html')).href);await page.waitForFunction(()=>document.body.dataset.ready);
  if(await page.locator('body').getAttribute('data-ready')!=='true')throw new Error('WebGL non disponibile');
  const families=[['zombie','Zombie'],['ghost','Fantasmi'],['skeleton','Scheletri'],['nature','Natura'],['supernatural','Soprannaturale']];
  const icons=[];
  for(const [id,name]of families)for(const variant of[1,2,3]){
    const data=await page.evaluate(({id,variant})=>window.cryptLab.renderShopIcon(id,variant,320),{id,variant});
    if(!data.startsWith('data:image/webp;base64,'))throw new Error('Icona WebP non generata');
    const file=`cripta-${id}-v${variant}.webp`;
    await writeFile(resolve(dir,file),Buffer.from(data.split(',')[1],'base64'));icons.push({id,name,variant,file,data});
  }
  if(errors.length)throw new Error(errors.join('\n'));
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#202a21;color:#eee8d8;font-family:Arial,sans-serif;padding:28px 50px}h1{font:32px Georgia;margin:0 0 5px}p{font-size:12px;color:#bdc5af;margin:0 0 18px}.row{display:grid;grid-template-columns:150px repeat(3,1fr);height:285px;border-top:1px solid #59634d;align-items:end}.name{align-self:center;font:21px Georgia}.item{text-align:center;font-size:11px;letter-spacing:.12em;color:#b5bca9}.item img{display:block;width:255px;height:255px;object-fit:contain;margin:auto}.item span{display:block;padding-bottom:10px}</style><h1>Anteprime per la bottega</h1><p>WebP 320 × 320 · fondo trasparente · rendering dei modelli reali</p>${families.map(([id,name])=>`<div class="row"><div class="name">${name}</div>${icons.filter(i=>i.id===id).map(i=>`<div class="item"><img src="${i.data}"><span>VARIANTE 0${i.variant}</span></div>`).join('')}</div>`).join('')}`);
  await page.screenshot({path:resolve(root,'immagini','20-icone-bottega.png'),fullPage:true});
  await writeFile(resolve(dir,'manifest.json'),JSON.stringify({width:320,height:320,format:'webp',background:'transparent',state:'clean',icons:icons.map(({id,name,variant,file})=>({id,name,variant,file}))},null,2));
  console.log('Generate 15 icone WebP e la tavola di confronto.');
}finally{await browser.close();}
