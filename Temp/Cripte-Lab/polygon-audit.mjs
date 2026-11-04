import { build } from '../Production/node_modules/esbuild/lib/main.js';
import { resolveLowpoly } from '../Production/src/render/lowpoly/index.ts';
import { LOWPOLY_MATERIALS } from '../Production/src/render/modelCache.ts';
import { CATALOG } from '../Production/src/game/catalog.ts';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=dirname(fileURLToPath(import.meta.url));
const baselineMode=process.argv.includes('--baseline');
const temp=await mkdtemp(join(tmpdir(),'necrothing-polygons-'));

function triangles(g){return (g.index?.count??g.attributes.position.count)/3;}
function geometryMetrics(g){return{triangles:triangles(g),vertices:g.attributes.position.count,bufferBytes:Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength??0)};}
function meshMetrics(model){
  const result={triangles:0,vertices:0,bufferBytes:0,meshes:0,baseColorPassDraws:0,submittedTriangles:0,sections:{}};
  model.traverse(o=>{
    if(!o.isMesh)return;
    const stats=geometryMetrics(o.geometry);for(const key of ['triangles','vertices','bufferBytes'])result[key]+=stats[key];result.meshes++;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    const passes=materials.reduce((n,m)=>n+(m.transparent&&m.side===2&&!m.forceSinglePass?2:1),0);
    result.baseColorPassDraws+=passes;result.submittedTriangles+=stats.triangles*passes;
    const name=o.userData.section??'merged';const sub=result.sections[name]??={triangles:0,parts:0};sub.triangles+=stats.triangles;sub.parts++;
  });
  return result;
}
function dispose(model){model.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
const nf=n=>new Intl.NumberFormat('it-IT',{useGrouping:'always'}).format(Math.round(n));

try{
  const bundled=await build({entryPoints:[resolve(root,'models.js')],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',nodePaths:[resolve(root,'../Production/node_modules')]});
  const modulePath=join(temp,'models.mjs');await writeFile(modulePath,bundled.outputFiles[0].text);
  const {createCrypt,CRYPTS,STATES}=await import(pathToFileURL(modulePath).href);
  const models=[];
  for(const crypt of CRYPTS)for(const variant of [1,2,3])for(const state of STATES){
    const full=createCrypt(crypt.id,state.id,{variant}),raw=createCrypt(crypt.id,state.id,{merge:false,variant}),building=createCrypt(crypt.id,state.id,{buildingOnly:true,variant});
    const metrics=meshMetrics(full),parts=meshMetrics(raw),buildingMetrics=meshMetrics(building);
    const expensiveParts=raw.children.filter(o=>o.isMesh).map(o=>({name:o.name,section:o.userData.section,triangles:triangles(o.geometry)})).sort((a,b)=>b.triangles-a.triangles).slice(0,12);
    models.push({id:crypt.id,name:crypt.name,variant,variantName:full.userData.variantName,state:state.id,footprint:[4,5],full:metrics,building:buildingMetrics,sections:parts.sections,sourceParts:parts.meshes,expensiveParts});
    [full,raw,building].forEach(dispose);
  }
  const names={shop:'Bottega',keeper_house:'Casa del Custode',gravedigger_house:'Casa del becchino',mausoleum:'Mausoleo'};
  const references=[];
  for(const[id,name]of Object.entries(names))for(const state of STATES)for(const seed of[0,1]){
    const dirty=state.id!=='clean',broken=state.id==='broken';
    const key=`p:${id}:0:${seed}:${+dirty}${+broken}${+!broken}`;
    const model=resolveLowpoly(key)();const metrics={triangles:0,vertices:0,bufferBytes:0,baseColorPassDraws:0};
    for(const[bucket,g]of Object.entries(model.geometries)){
      if(!g)continue;const stats=geometryMetrics(g);for(const k of ['triangles','vertices','bufferBytes'])metrics[k]+=stats[k];
      const material=LOWPOLY_MATERIALS[bucket];
      metrics.baseColorPassDraws+=material.transparent&&material.side===2&&!material.forceSinglePass?2:1;g.dispose();
    }
    references.push({id,name,state:state.id,seed,variant:0,footprint:CATALOG[id].footprint,...metrics});
  }
  const current={capturedAt:new Date().toISOString(),scope:'Static generated geometry. Counts are triangles, not quads. Prototype full includes its ground, fence and courtyard props; buildingOnly excludes those. Production resolveLowpoly includes the standard weathering layer.',drawCallScope:'Estimated base colour pass draws, counting transparent DoubleSide materials twice. Excludes shadows, environment and extra game effects; not an FPS benchmark.',models,references};
  try{const verification=JSON.parse(await readFile(resolve(root,'verification.json'),'utf8'));if(verification.revision===7&&verification.result==='passed')current.webglColorPassMeasurements=verification.colorPassMeasurements;}catch{}
  if(baselineMode){await writeFile(resolve(root,'polygon-baseline.json'),JSON.stringify(current,null,2));console.log('Baseline salvata in Cripte-Lab/polygon-baseline.json.');}
  else{
    const baseline=JSON.parse(await readFile(resolve(root,'polygon-baseline.json'),'utf8'));
    const comparisons=models.filter(m=>m.variant===1).map(m=>{const before=baseline.models.find(b=>b.id===m.id&&b.state===m.state);return{id:m.id,name:m.name,state:m.state,before:before.full.triangles,after:m.full.triangles,reductionPercent:(1-m.full.triangles/before.full.triangles)*100,drawsBefore:before.full.baseColorPassDraws,drawsAfter:m.full.baseColorPassDraws,bufferBytesBefore:before.full.bufferBytes,bufferBytesAfter:m.full.bufferBytes};});
    await writeFile(resolve(root,'polygon-report.json'),JSON.stringify({...current,baselineCapturedAt:baseline.capturedAt,comparisons},null,2));
    let markdown='# Cripte — geometrie e confronto con il gioco\n\nConteggi dei generatori effettivi, espressi in **triangoli**. I lotti delle cripte sono 4 × 5 celle e comprendono terreno, recinto e oggetti. La colonna «edificio» li esclude. Il confronto usa le geometrie statiche della Production attuale, variante 0 e semi 0/1; include il degrado standard.\n\n## Riferimenti del gioco\n\n| Modello | Celle | Integro, triangoli | Sporco, triangoli | Rotto, triangoli | Draw stimati, integro |\n| --- | --- | ---: | ---: | ---: | ---: |\n';
    for(const[id,name]of Object.entries(names)){
      const rows=references.filter(r=>r.id===id),range=state=>{const v=rows.filter(r=>r.state===state).map(r=>r.triangles);return Math.min(...v)===Math.max(...v)?nf(v[0]):`${nf(Math.min(...v))}–${nf(Math.max(...v))}`;};
      markdown+=`| ${name} | ${rows[0].footprint.join(' × ')} | ${range('clean')} | ${range('dirty')} | ${range('broken')} | ${rows.find(r=>r.state==='clean').baseColorPassDraws} |\n`;
    }
    markdown+='\n## Cripte integre: prima e dopo, variante 1\n\n| Famiglia | Edificio attuale | Lotto prima | Lotto dopo | Riduzione | Draw prima → dopo |\n| --- | ---: | ---: | ---: | ---: | ---: |\n';
    for(const m of models.filter(m=>m.state==='clean'&&m.variant===1)){const c=comparisons.find(c=>c.id===m.id&&c.state==='clean');markdown+=`| ${m.name} | ${nf(m.building.triangles)} | ${nf(c.before)} | ${nf(c.after)} | ${c.reductionPercent.toFixed(1)}% | ${c.drawsBefore} → ${c.drawsAfter} |\n`;}
    markdown+='\n## Tutte le varianti, gli stati e le componenti\n\n| Famiglia | Variante | Stato | Edificio | Recinto | Oggetti | Terreno e percorsi | Degrado aggiunto | Lotto | Vertici nei buffer | Buffer KiB |\n| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n';
    for(const m of models){const s=k=>m.sections[k]?.triangles??0;markdown+=`| ${m.name} | ${m.variant}: ${m.variantName} | ${m.state} | ${nf(s('building'))} | ${nf(s('fence'))} | ${nf(s('props'))} | ${nf(s('ground'))} | ${nf(s('weather'))} | ${nf(m.full.triangles)} | ${nf(m.full.vertices)} | ${(m.full.bufferBytes/1024).toFixed(1)} |\n`;}
    markdown+='\n## Lettura dei numeri\n\n- Un quadrilatero normalmente diventa due triangoli. Qui non si sommano «facce» di tipo diverso.\n- Il numero di vertici è quello realmente conservato nei buffer, comprese le duplicazioni necessarie per normali piatte e colori per faccia.\n- I draw sono stimati per il passaggio colore, a modello interamente visibile: non includono ombre, effetti aggiunti dal gioco, personaggi o terreno del quartiere. Il batching della scena può cambiare il totale.\n- Buffer KiB conta position, normal, color e indici delle geometrie; esclude materiali, texture, temporanei del generatore e copie interne al driver.\n- Questi valori misurano geometria e invii di disegno, non gli FPS su un telefono.\n';
    if(current.webglColorPassMeasurements)markdown+='\nLa verifica in Chromium/WebGL, con ogni lotto isolato e ombre disattivate, conferma i conteggi: **2 draw call** per i lotti integri e sporchi, **1** per quelli rotti. Ogni triangolo del modello viene inviato una volta nel passaggio colore. I risultati sono anche in `verification.json`.\n';
    await writeFile(resolve(root,'polygon-report.md'),markdown);
    const csv=['family,variant,state,building_triangles,fence_triangles,props_triangles,ground_triangles,weather_triangles,total_triangles,vertices,buffer_bytes,base_colour_draws'];
    for(const m of models)csv.push([m.id,m.variant,m.state,m.sections.building?.triangles??0,m.sections.fence?.triangles??0,m.sections.props?.triangles??0,m.sections.ground?.triangles??0,m.sections.weather?.triangles??0,m.full.triangles,m.full.vertices,m.full.bufferBytes,m.full.baseColorPassDraws].join(','));
    await writeFile(resolve(root,'polygon-report.csv'),csv.join('\n')+'\n');
    console.log('Report salvati: polygon-report.md, .json e .csv.');
  }
  for(const m of models.filter(m=>m.state==='clean'))console.log(JSON.stringify({id:m.id,total:m.full.triangles,building:m.building.triangles,draws:m.full.baseColorPassDraws,sections:m.sections}));
}finally{await rm(temp,{recursive:true,force:true});}
