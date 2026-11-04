import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { LightMapPainter, LIGHT_MAP_UNIFORMS, withLightMap } from '../Production/src/render/lightMap.ts';
import { radialGlowTexture } from '../Production/src/render/glowTexture.ts';
import { FireFlicker, seedFromPosition } from '../Production/src/view/FireFlicker.ts';
import { CRYPTS, STATES, ARCHITECTURES, VARIANTS, createCrypt, createLandscape } from './models.js';

const $ = (q) => document.querySelector(q);
const state={type:'zombie',condition:'clean',mode:'neighbourhood',night:false,rotations:Object.fromEntries(CRYPTS.map(c=>[c.id,0])),variants:Object.fromEntries(CRYPTS.map(c=>[c.id,1]))};
const stage=$('#stage'),canvas=$('#canvas');
let renderer,controls,camera,scene,world,sun,fill,ambient,ground,backdrop,lightMap,lightEffects,haloTexture;
let previewAnchors=[];
let labels=[],instances=[],selected=null,raf=0,awakeUntil=0,disposed=false;
const accents={clean:'Integra',dirty:'Sporca',broken:'Rotta'};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let press=null;
let statusTimer;
function notify(message){$('#status').textContent=message;$('#status').classList.add('visible');clearTimeout(statusTimer);statusTimer=setTimeout(()=>$('#status').classList.remove('visible'),3500);}

function disposeGroup(root){root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
function setLight(){
  if(state.night){scene.background.set('#151d29');scene.fog.color.set('#151d29');ambient.color.set('#5b6d92');ambient.groundColor.set('#191817');ambient.intensity=1.05;sun.intensity=.95;sun.color.set('#9db3e6');fill.intensity=.22;fill.color.set('#8f9fd0');backdrop.material.color.set('#26342d');renderer.toneMappingExposure=1.07;}
  else {scene.background.set('#344136');scene.fog.color.set('#344136');ambient.color.set('#e1ecd5');ambient.groundColor.set('#63553c');ambient.intensity=2.05;sun.intensity=2.6;sun.color.set('#ffebc9');fill.intensity=1.1;fill.color.set('#b4d0c6');backdrop.material.color.set('#3c4b3b');renderer.toneMappingExposure=1.05;}
  $('#light').setAttribute('aria-pressed',String(state.night));$('#light span').textContent=state.night?'Notte':'Giorno';$('#light').title=state.night?'Passa alla luce diurna':'Passa alla luce notturna';
  requestFrames();
}
function init(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color('#344136');scene.fog=new THREE.Fog('#344136',32,75);
  camera=new THREE.OrthographicCamera(-9,9,6,-6,.1,100);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.minPolarAngle=.32;controls.maxPolarAngle=Math.PI/2-.09;controls.minZoom=.35;controls.maxZoom=3.5;controls.enablePan=true;controls.screenSpacePanning=true;
  ambient=new THREE.HemisphereLight('#e1ecd5','#63553c',2.05);scene.add(ambient);
  sun=new THREE.DirectionalLight('#ffebc9',2.6);sun.position.set(-9,15,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:50});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
  fill=new THREE.DirectionalLight('#b4d0c6',1.1);fill.position.set(6,4,-7);scene.add(fill);
  backdrop=new THREE.Mesh(new THREE.PlaneGeometry(150,150),withLightMap(new THREE.MeshStandardMaterial({color:'#3c4b3b',roughness:1})));backdrop.rotation.x=-Math.PI/2;backdrop.position.y=-.39;backdrop.receiveShadow=true;scene.add(backdrop);
  world=new THREE.Group();world.name='crypt_lab';scene.add(world);
  lightEffects=new THREE.Group();scene.add(lightEffects);lightMap=new LightMapPainter(64);haloTexture=radialGlowTexture([[0,.2],[.3,.14],[.65,.04],[1,0]]);
  controls.addEventListener('change',()=>requestFrames());controls.addEventListener('start',()=>requestFrames(12000));controls.addEventListener('end',()=>requestFrames(1200));
  canvas.addEventListener('pointerdown',e=>{press={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',e=>{
    if(!press||Math.hypot(e.clientX-press.x,e.clientY-press.y)>5)return;press=null;
    if(state.mode!=='neighbourhood')return;
    const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(instances,true)[0];if(!hit)return;let root=hit.object;while(root.parent&& !root.userData.type)root=root.parent;if(root.userData.type){state.type=root.userData.type;selected=root;updateUI();requestFrames();}
  });
  new ResizeObserver(resize).observe(stage);window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;});
  setupUI();rebuild();setLight();resize();
  $('#loading').hidden=true;document.body.dataset.ready='true';
  window.cryptLab={
    setView(options={}){
      if(options.capture!==undefined)document.body.classList.toggle('capture',options.capture);
      if(options.mode)state.mode=options.mode;
      if(options.type)state.type=options.type;
      if(options.variant!==undefined)state.variants[state.type]=options.variant;
      if(options.state)state.condition=options.state;
      if(options.night!==undefined)state.night=options.night;
      rebuild();setLight();resize();draw();return snapshot();
    },
    snapshot,render:()=>{controls.update();draw();updateLabels();},
    lightingStatus:()=>({strength:LIGHT_MAP_UNIFORMS.uLightRect.value.w,anchors:previewAnchors.map(e=>({position:e.position.toArray(),visible:e.sprite.visible}))}),
    exportGLB:exportModel,renderShopIcon,
    createCrypt,
    measureModel(type,condition='clean',variant=1){
      const model=createCrypt(type,condition,{variant}),isolated=new THREE.Scene();
      isolated.add(model,new THREE.AmbientLight('#ffffff',1));
      model.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
      const checkCamera=new THREE.OrthographicCamera(-5,5,5,-5,.1,50);checkCamera.position.set(5,8,10);checkCamera.lookAt(0,1,0);
      const previousShadows=renderer.shadowMap.enabled,previousAutoReset=renderer.info.autoReset;
      try{
        renderer.shadowMap.enabled=false;renderer.info.autoReset=false;renderer.info.reset();renderer.render(isolated,checkCamera);
        return{type,state:condition,variant,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometryTriangles:model.userData.triangles};
      }finally{renderer.shadowMap.enabled=previousShadows;renderer.info.autoReset=previousAutoReset;disposeGroup(model);requestFrames();}
    },
    async screenshot(){await new Promise(r=>requestAnimationFrame(r));draw();return renderer.domElement.toDataURL('image/png');},
  };
}

// Mirrors Production's bake.ts: transparent WebP, night lighting, grass
// island and the same bottom-centred crop; the full plot includes the yard.
function renderShopIcon(type,variant=1,S=320){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=S;
  const r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
  r.setClearColor(0x000000,0);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.3;
  const s=new THREE.Scene();s.add(new THREE.HemisphereLight('#a6add9','#2c2632',1.35));
  const moon=new THREE.DirectionalLight('#b4c6ee',1.5);moon.position.set(-5,8,4);const warm=new THREE.DirectionalLight('#ffc98a',.6);warm.position.set(5,3,6);s.add(moon,warm);
  const model=createCrypt(type,'clean',{variant});s.add(model);
  const oldStrength=LIGHT_MAP_UNIFORMS.uLightRect.value.w;LIGHT_MAP_UNIFORMS.uLightRect.value.w=0;
  for(const a of model.userData.lights){const l=new THREE.PointLight(a.color,a.intensity*3,a.range*1.2,1.5);l.position.fromArray(a.pos).multiplyScalar(.1);model.add(l);}
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  const rad=Math.max(Math.max(size.x,size.z)*.62+.35,size.y*.3);
  const soil=new THREE.Mesh(new THREE.CylinderGeometry(rad+.05,rad+.12,.12,12),new THREE.MeshStandardMaterial({color:'#3d302a',flatShading:true}));soil.position.set(c.x,-.33,c.z);s.add(soil);
  const grass=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad+.04,.06,12),new THREE.MeshStandardMaterial({color:'#3f5536',flatShading:true}));grass.position.set(c.x,-.24,c.z);s.add(grass);
  const light=new THREE.PointLight('#ffb766',2.2,rad*5,1.4);light.position.set(c.x+rad,.5,c.z+rad*1.4);s.add(light);
  const h=Math.max(size.y,rad*1.2),dist=Math.max(rad*2.4,h*1.25)/Math.tan(THREE.MathUtils.degToRad(14))*.55;
  const cam=new THREE.PerspectiveCamera(28,1,.1,80);cam.position.set(c.x+dist*.62,box.min.y+h*.5+dist*.55,c.z+dist*.62);cam.lookAt(c.x,box.min.y+h*.42,c.z);r.render(s,cam);
  const tmp=document.createElement('canvas');tmp.width=tmp.height=S;const ctx=tmp.getContext('2d');ctx.drawImage(canvas,0,0);const px=ctx.getImageData(0,0,S,S).data;
  let x0=S,y0=S,x1=-1,y1=-1;for(let y=0;y<S;y++)for(let x=0;x<S;x++)if(px[(y*S+x)*4+3]>8){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const out=document.createElement('canvas');out.width=out.height=S;if(x1>=0){const w=x1-x0+1,ht=y1-y0+1,pad=Math.round(S*.03),k=Math.min(1,(S-2*pad)/w,(S-2*pad)/ht);out.getContext('2d').drawImage(tmp,x0,y0,w,ht,(S-w*k)/2,S-pad-ht*k,w*k,ht*k);}
  const url=out.toDataURL('image/webp',.88);LIGHT_MAP_UNIFORMS.uLightRect.value.w=oldStrength;disposeGroup(model);soil.geometry.dispose();grass.geometry.dispose();soil.material.dispose();grass.material.dispose();r.dispose();r.forceContextLoss();return url;
}

function snapshot(){return{...state,models:instances.map(o=>({type:o.userData.type,state:o.userData.state,variant:o.userData.variant,variantName:o.userData.variantName,lights:o.userData.lights,triangles:o.userData.triangles,meshes:o.children.length,bounds:o.userData.bounds,position:o.position.toArray(),rotation:o.rotation.y})),renderer:renderer.info.render};}
function label(text,small,p){const node=document.createElement('div');node.className='scene-label';const name=document.createElement('span');name.textContent=text;node.append(name);if(small){const sub=document.createElement('small');sub.textContent=small;node.append(sub);}$('#labels').append(node);labels.push({node,p:new THREE.Vector3(...p)});}

function rebuild(){
  backdrop.position.y=state.mode==='architecture'?0:-.39;
  for(const child of [...world.children]){world.remove(child);disposeGroup(child);}instances=[];selected=null;labels=[];$('#labels').replaceChildren();
  for(const sprite of [...lightEffects.children]){lightEffects.remove(sprite);sprite.material.dispose();}previewAnchors=[];
  const type=CRYPTS.find(c=>c.id===state.type);
  const place=(id,condition,p,rot=0,variant=state.variants[id])=>{const group=createCrypt(id,condition,{buildingOnly:state.mode==='architecture',variant});group.position.set(...p);group.rotation.y=rot;world.add(group);instances.push(group);if(id===state.type&&condition===state.condition&&variant===state.variants[id])selected=group;return group;};
  if(state.mode==='architecture'){
    const angle=Math.atan2(5.6,18.5);
    CRYPTS.forEach((c,i)=>{const offset=(i-2)*2.85,x=offset*Math.cos(angle),z=-offset*Math.sin(angle);place(c.id,state.condition,[x,0,z]);label(c.short.toUpperCase(),ARCHITECTURES[c.id].name,[x,-.05,z+1.70]);});
    $('#capture-heading h2').textContent='Cinque modi di abitare l’aldilà';$('#capture-heading p').textContent='Casetta storta · cubo terrazzato · torre-ossario · dolmen aperto · ottagono a punta';
  }else if(state.mode==='neighbourhood'){
    world.add(createLandscape());
    const arrangement=[[-5.05,0,-3.10,0],[0,0,-3.10,0],[5.05,0,-3.10,0],[-6.75,0,3.10,0],[6.75,0,3.10,0]];
    CRYPTS.forEach((c,i)=>{const [x,y,z,rot]=arrangement[i];place(c.id,state.condition,[x,y,z],rot+state.rotations[c.id]);label(c.short.toUpperCase(),null,[x,.08,z+2.82]);});
    $('#capture-heading h2').textContent='Piccole faccende dell’aldilà';$('#capture-heading p').textContent='Lavanderia · giardino del ricordo · musica · orto · rituali — lotti di 4 × 5 celle';
  }else if(state.mode==='comparison'){
    const angle=Math.atan2(5.6,18.5);
    STATES.forEach((s,i)=>{const offset=(i-1)*6.0,x=offset*Math.cos(angle),z=-offset*Math.sin(angle);place(state.type,s.id,[x,0,z],state.rotations[state.type]);label(s.name.toUpperCase(),i===0?'CRIPTA E CORTILE CURATI':i===1?'MUSCHIO, ERBACCE, OGGETTI LOGORI':'CROLLI, RECINTI, LUCI SPENTE',[x,-.05,z+3.12]);});
    $('#capture-heading h2').textContent=type.name;$('#capture-heading p').textContent=ARCHITECTURES[type.id].name+' · '+type.signature;
  }else if(state.mode==='variants'){
    const angle=Math.atan2(5.6,18.5);
    VARIANTS[state.type].forEach((name,i)=>{const offset=(i-1)*6.0,x=offset*Math.cos(angle),z=-offset*Math.sin(angle);place(state.type,state.condition,[x,0,z],state.rotations[state.type],i+1);label('VARIANTE 0'+(i+1),name.toUpperCase(),[x,-.05,z+3.12]);});
    $('#capture-heading h2').textContent=type.name;$('#capture-heading p').textContent='Tre varianti · '+accents[state.condition];
  }else{
    place(state.type,state.condition,[0,0,0],state.rotations[state.type]);
    $('#capture-heading h2').textContent=type.name;$('#capture-heading p').textContent=ARCHITECTURES[type.id].name+' · '+type.signature+' · '+accents[state.condition];
  }
  for(const group of instances){group.updateMatrixWorld(true);for(const anchor of group.userData.lights){
    const position=new THREE.Vector3().fromArray(anchor.pos).multiplyScalar(.1).applyMatrix4(group.matrixWorld);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTexture,color:anchor.color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sprite.scale.setScalar(.5+anchor.halo*1.6);lightEffects.add(sprite);
    previewAnchors.push({anchor,position,sprite,flicker:new FireFlicker(seedFromPosition(position.x,position.y,position.z),anchor.flicker,1,0)});
  }}
  resetCamera();updateUI();requestFrames(600);
}
function resetCamera(){
  const aspect=stage.clientWidth/Math.max(1,stage.clientHeight),capturing=document.body.classList.contains('capture');
  let span;
  if(state.mode==='architecture'){span=Math.max(3.25,8.4/aspect);controls.target.set(0,.90,-.15);camera.position.set(5.6,8.5,18.5);}
  else if(state.mode==='neighbourhood'){span=Math.max(9.0,13.5/aspect);controls.target.set(0,.1,.1);camera.position.set(13.5,16.5,25);}
  else if(state.mode==='comparison'||state.mode==='variants'){span=Math.max(5.2,9.4/aspect);controls.target.set(0,.43,.05);camera.position.set(5.6,9.5,18.5);}
  else{span=Math.max(3.05,3.45/aspect);controls.target.set(0,capturing?.70:.43,0);camera.position.set(5,7.0,8);}
  if(capturing&&(state.mode==='comparison'||state.mode==='variants'))controls.target.y=.68;
  camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.zoom=1;camera.updateProjectionMatrix();controls.update();requestFrames(500);
}
function resize(){if(!renderer)return;renderer.setSize(stage.clientWidth,stage.clientHeight,false);resetCamera();updateLabels();}
function requestFrames(duration=250){awakeUntil=Math.max(awakeUntil,performance.now()+duration);if(!raf)raf=requestAnimationFrame(frame);}
function draw(){
  if(state.night){
    const time=performance.now()/1000,toCamera=camera.getWorldDirection(new THREE.Vector3()).negate(),color=new THREE.Color();lightMap.begin();
    for(const e of previewAnchors){const f=e.flicker.value(time);color.set(e.anchor.color).multiplyScalar(Math.min(1,e.anchor.intensity)*f);lightMap.add(e.position.x,e.position.y-e.anchor.pos[1]*.1,e.position.z,e.anchor.range*.65,color);e.sprite.visible=true;e.sprite.material.opacity=Math.min(1,e.anchor.intensity*1.4)*f*.7*.6;e.sprite.position.copy(e.position).addScaledVector(toCamera,e.sprite.scale.x*.3);}
    lightMap.render(renderer,0,0,32,1);
  }else{lightMap.off();for(const e of previewAnchors)e.sprite.visible=false;}
  renderer.render(scene,camera);
}
function frame(){raf=0;if(disposed||document.hidden)return;controls.update();draw();updateLabels();if(state.night||performance.now()<awakeUntil)raf=requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestFrames();});
function updateLabels(){for(const{node,p}of labels){const v=p.clone().project(camera);node.style.left=`${(v.x*.5+.5)*stage.clientWidth}px`;node.style.top=`${(-v.y*.5+.5)*stage.clientHeight}px`;node.hidden=v.z>1||v.z<-1;}}
function updateUI(){
  const info=CRYPTS.find(c=>c.id===state.type);
  $('#selected-index').textContent=String(CRYPTS.indexOf(info)+1).padStart(2,'0');$('#selected-name').textContent=info.name;$('#selected-signature').textContent=ARCHITECTURES[info.id].name+' · '+VARIANTS[info.id][state.variants[info.id]-1];$('#description').textContent=info.description;document.documentElement.style.setProperty('--accent',info.accent);
  document.querySelectorAll('[data-type]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.type===state.type));});
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
  document.querySelectorAll('[data-variant]').forEach(b=>{const n=Number(b.dataset.variant);b.textContent=`${n} · ${VARIANTS[info.id][n-1]}`;b.setAttribute('aria-pressed',String(n===state.variants[info.id]));});
  document.querySelectorAll('[data-state]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.state===state.condition));b.disabled=state.mode==='comparison';});
  $('.states').classList.toggle('comparing',state.mode==='comparison');
  $('#scene-name').textContent=state.mode==='architecture'?`Le cinque architetture · ${accents[state.condition].toLowerCase()}`:state.mode==='neighbourhood'?`Il quartiere delle cinque cripte · ${accents[state.condition].toLowerCase()}`:state.mode==='comparison'?`${info.name} · i tre stati`:state.mode==='variants'?`${info.name} · tre varianti`:`${info.name} · variante ${state.variants[info.id]} · ${accents[state.condition].toLowerCase()}`;
  $('#rotate').disabled=state.mode==='architecture';$('#rotate').title=`Ruota ${info.name.toLowerCase()} di 90 gradi`;
  $('#download').innerHTML=state.mode==='architecture'?'Esporta edificio <span>↗</span>':'Esporta GLB <span>↗</span>';
}
function setupUI(){
  CRYPTS.forEach((c,i)=>{const button=document.createElement('button');button.dataset.type=c.id;button.setAttribute('aria-pressed',String(c.id===state.type));button.innerHTML=`<span class="num">0${i+1}</span><strong>${c.short}</strong><small>${c.subtitle}</small>`;button.addEventListener('click',()=>{state.type=c.id;if(state.mode==='neighbourhood')state.mode='single';rebuild();});$('#families').append(button);});
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;rebuild();}));
  document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>{state.condition=b.dataset.state;rebuild();}));
  document.querySelectorAll('[data-variant]').forEach(b=>b.addEventListener('click',()=>{state.variants[state.type]=Number(b.dataset.variant);rebuild();}));
  $('#light').addEventListener('click',()=>{state.night=!state.night;setLight();});
  $('#home').addEventListener('click',resetCamera);
  $('#rotate').addEventListener('click',()=>{state.rotations[state.type]=(state.rotations[state.type]+Math.PI/2)%(Math.PI*2);rebuild();});
  $('#zoom-in').addEventListener('click',()=>{camera.zoom=Math.min(controls.maxZoom,camera.zoom*1.2);camera.updateProjectionMatrix();requestFrames();});
  $('#zoom-out').addEventListener('click',()=>{camera.zoom=Math.max(controls.minZoom,camera.zoom/1.2);camera.updateProjectionMatrix();requestFrames();});
  $('#download').addEventListener('click',()=>exportModel());
  $('.wordmark').addEventListener('click',e=>{e.preventDefault();state.mode='neighbourhood';rebuild();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').textContent='Il contesto grafico è stato interrotto. Ricarica la pagina per riaprire il laboratorio.';$('#error').hidden=false;});
}
async function exportModel({all=false,download=true}={}){
  const group=all?world:selected;
  if(!group)return;
  const copy=group.clone(true);if(!all){copy.position.set(0,0,0);copy.rotation.set(0,0,0);}
  try{
    const buffer=await new GLTFExporter().parseAsync(copy,{binary:true,onlyVisible:true});
    if(download){const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download=all?'necrothing_quartiere_cripte.glb':`cripta_${state.type}_v${selected.userData.variant}_${selected.userData.state}.glb`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Modello GLB esportato. Scala: 1 unità = 1 cella.');}
    return buffer;
  }catch(error){console.error(error);notify('Non è stato possibile esportare il modello.');throw error;}
}
try{init();}catch(error){console.error(error);$('#loading').hidden=true;$('#error').hidden=false;document.body.dataset.ready='error';}
