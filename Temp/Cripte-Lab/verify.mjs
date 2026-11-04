import { chromium } from '../Production/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';

const root=dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],requests=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1040},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(pathToFileURL(resolve(root,'index.html')).href);await page.waitForFunction(()=>document.body.dataset.ready);assert.equal(await page.locator('body').getAttribute('data-ready'),'true',errors.join('\n')||'WebGL initialization failed');
  const models=await page.evaluate(()=>{
    const report=[];
    for(const type of ['zombie','ghost','skeleton','nature','supernatural'])for(const variant of [1,2,3])for(const state of ['clean','dirty','broken']){
      const model=window.cryptLab.createCrypt(type,state,{variant});let finite=true,meshes=0,lit=false;
      model.traverse(o=>{if(!o.isMesh)return;meshes++;for(const attr of Object.values(o.geometry.attributes))for(const n of attr.array)if(!Number.isFinite(n))finite=false;if(o.material.isMeshBasicMaterial)lit=true;});
      report.push({...model.userData,finite,meshes,lit});model.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
    }
    return report;
  });
  assert.equal(models.length,45);
  for(const m of models){assert.ok(m.finite,`${m.type}/${m.state}: invalid geometry`);assert.ok(m.triangles>100);assert.deepEqual(m.footprint,[4,5]);assert.ok(m.bounds.min[0]>-2.01&&m.bounds.max[0]<2.01,`${m.type}: X footprint`);assert.ok(m.bounds.min[2]>-2.51&&m.bounds.max[2]<2.51,`${m.type}: Z footprint`);assert.equal(m.courtyard,true);assert.ok(m.courtyardObjects.length>=4);assert.equal(m.lights.length,m.state==='broken'?0:2);for(const a of m.lights){assert.equal(a.pos.length,3);assert.ok(a.pos.every(Number.isFinite));assert.ok(a.range>0&&a.intensity>0&&a.halo>0);}if(m.state==='broken')assert.equal(m.lit,false,'Broken crypt must not emit light');}
  const colorPassMeasurements=await page.evaluate(()=>['zombie','ghost','skeleton','nature','supernatural'].flatMap(type=>[1,2,3].flatMap(variant=>['clean','dirty','broken'].map(state=>window.cryptLab.measureModel(type,state,variant)))));
  for(const row of colorPassMeasurements){assert.equal(row.triangles,row.geometryTriangles,'An isolated colour pass submits the model geometry once');assert.ok(row.drawCalls<=2,`${row.type}/${row.state}: at most two colour-pass draw calls`);}
  const heights=models.filter(m=>m.state==='clean').map(m=>m.bounds.max[1]);assert.ok(Math.max(...heights)-Math.min(...heights)>.7,'Architectures must differ in their physical height');
  await page.locator('[data-mode="architecture"]').click();const architectureView=await page.evaluate(()=>window.cryptLab.snapshot());assert.equal(architectureView.models.length,5);assert.ok(await page.locator('#rotate').isDisabled());
  await page.locator('[data-type="ghost"]').click();assert.equal((await page.evaluate(()=>window.cryptLab.snapshot())).type,'ghost');
  await page.locator('[data-mode="single"]').click();assert.equal((await page.evaluate(()=>window.cryptLab.snapshot())).mode,'single');
  await page.locator('[data-variant="2"]').click();assert.equal((await page.evaluate(()=>window.cryptLab.snapshot())).models[0].variant,2);
  await page.locator('[data-state="dirty"]').click();assert.equal((await page.evaluate(()=>window.cryptLab.snapshot())).models[0].state,'dirty');
  await page.locator('[data-mode="variants"]').click();assert.deepEqual((await page.evaluate(()=>window.cryptLab.snapshot())).models.map(m=>m.variant),[1,2,3]);
  await page.locator('[data-variant="3"]').click();await page.locator('[data-mode="single"]').click();assert.equal((await page.evaluate(()=>window.cryptLab.snapshot())).models[0].variant,3);
  const before=(await page.evaluate(()=>window.cryptLab.snapshot())).models[0].rotation;const lightBefore=(await page.evaluate(()=>window.cryptLab.lightingStatus())).anchors[0].position;await page.locator('#rotate').click();const after=(await page.evaluate(()=>window.cryptLab.snapshot())).models[0].rotation;const lightAfter=(await page.evaluate(()=>window.cryptLab.lightingStatus())).anchors[0].position;assert.ok(Math.abs(after-before-Math.PI/2)<1e-6);assert.ok(Math.abs(lightAfter[0]-lightBefore[2])<1e-6&&Math.abs(lightAfter[2]+lightBefore[0])<1e-6,'Light anchors rotate with the model');
  await page.locator('[data-mode="comparison"]').click();assert.equal((await page.evaluate(()=>window.cryptLab.snapshot())).models.length,3);assert.equal(await page.locator('[data-state="dirty"]').isDisabled(),true);
  await page.locator('#light').click();assert.equal((await page.evaluate(()=>window.cryptLab.snapshot())).night,true);
  await page.waitForTimeout(100);const nightLights=await page.evaluate(()=>window.cryptLab.lightingStatus());assert.equal(nightLights.anchors.length,4);assert.ok(nightLights.strength>0);assert.ok(nightLights.anchors.every(a=>a.visible));
  const glb=await page.evaluate(async()=>Array.from(new Uint8Array(await window.cryptLab.exportGLB({download:false}))));
  const buffer=Buffer.from(glb);assert.equal(buffer.readUInt32LE(0),0x46546c67);assert.equal(buffer.readUInt32LE(4),2);assert.equal(buffer.readUInt32LE(8),buffer.length);
  const jsonLength=buffer.readUInt32LE(12);const gltf=JSON.parse(buffer.subarray(20,20+jsonLength).toString());assert.ok(gltf.meshes.length>0);assert.ok(gltf.nodes.some(n=>n.extras?.footprint?.[0]===4&&n.extras?.courtyard&&n.extras?.variant===3&&n.extras?.lights?.length===2));
  await page.evaluate(()=>window.cryptLab.setView({type:'zombie',state:'clean',mode:'neighbourhood',night:false}));
  const downloadEvent=page.waitForEvent('download');await page.locator('#download').click();assert.ok((await downloadEvent).suggestedFilename().endsWith('.glb'));
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile overflow');
  await page.locator('[data-type="nature"]').click();await page.waitForTimeout(120);await page.evaluate(()=>document.querySelector('#status').hidden=true);await page.screenshot({path:resolve(root,'immagini','08-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith('file:')),'Standalone HTML must not require the network');
  await writeFile(resolve(root,'verification.json'),JSON.stringify({result:'passed',revision:7,checks:['45 family/variant/state combinations with finite geometry','4 × 5 footprint including courtyard in all states','Distinct architecture heights','Five-building architecture comparison','Courtyard inventory in every family','Broken lights off','Actual isolated WebGL colour-pass triangles','At most two actual colour-pass draw calls per lot','Family/state/variant/view controls','90° rotation','Day/night','GLB binary header and variant metadata','GLB download','390px mobile viewport without overflow','Standalone file without network requests'],colorPassMeasurements,models:models.map(({type,state,variant,variantName,triangles,meshes,bounds,architecture,architectureName,courtyardObjects,courtyardLayout})=>({type,state,variant,variantName,triangles,meshes,bounds,architecture,architectureName,courtyardObjects,courtyardLayout})),pageErrors:errors},null,2));
  console.log(`Verifica completata: 45 combinazioni, ingombri, controlli, GLB e mobile. Triangoli: ${Math.min(...models.map(m=>m.triangles))}–${Math.max(...models.map(m=>m.triangles))}.`);
}finally{await browser.close();}
