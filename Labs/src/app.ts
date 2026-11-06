import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VOX } from '../../Production/src/render/types.ts';
import type { LPModel } from '../../Production/src/render/lowpoly/kit.ts';
import { cases, original, proposed, reference, type Condition } from './models.ts';
import { compact } from './compact.ts';
import { lpIconUrl } from '../../Production/src/ui/lpIcons.ts';

const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=$<HTMLCanvasElement>('#canvas'), refCanvas=$<HTMLCanvasElement>('#ref-canvas');
let selected=0, night=false, condition:Condition='intact', grid=true, angle='front', compactLot=true, rotation=0;
const refs={keeper:[4,4],gravedigger:[4,3],shop:[3,3]} as const;
type Ref=keyof typeof refs;
const materials:Record<string,THREE.Material>={solid:new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}),glow:new THREE.MeshBasicMaterial({vertexColors:true}),water:new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.8}),ghost:new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.7,flatShading:true}),gloss:new THREE.MeshPhongMaterial({vertexColors:true,shininess:40})};
type View={renderer:THREE.WebGLRenderer;scene:THREE.Scene;camera:THREE.OrthographicCamera;controls:OrbitControls; content:THREE.Group; canvas:HTMLCanvasElement; reference:boolean};
function makeView(element:HTMLCanvasElement, isReference:boolean):View {
 const renderer=new THREE.WebGLRenderer({canvas:element,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);camera.position.set(8,7,11);
 const controls=new OrbitControls(camera,element);controls.target.set(0,.6,0);controls.enablePan=false;controls.enableDamping=false;controls.minZoom=.65;controls.maxZoom=2.5;controls.maxPolarAngle=1.48;controls.update();
 const content=new THREE.Group();scene.add(content);const view={renderer,scene,camera,controls,content,canvas:element,reference:isReference};controls.addEventListener('change',()=>render(view));new ResizeObserver(()=>resize(view)).observe(element);return view;
}
const view=makeView(canvas,false), refView=makeView(refCanvas,true);
function addModel(parent:THREE.Object3D,model:LPModel,x:number){
 const group=new THREE.Group();group.position.x=x;
 for(const [bucket,geometry] of Object.entries(model.geometries)){if(!geometry)continue;const mesh=new THREE.Mesh(geometry,materials[bucket]??materials.solid);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
 if(night) for(const a of model.lights.slice(0,4)){const l=new THREE.PointLight(a.color,a.intensity,Math.min(a.range,4),2);l.position.set(a.pos[0]*VOX,a.pos[1]*VOX,a.pos[2]*VOX);group.add(l);}
 parent.add(group);
}
function lot(parent:THREE.Object3D,x:number,w:number,d:number){
 const g=new THREE.Group();g.position.x=x;parent.add(g);
 const base=new THREE.Mesh(new THREE.BoxGeometry(w,.14,d),new THREE.MeshLambertMaterial({color:night?'#4c593c':'#8a9a6d'}));base.position.y=-.09;base.receiveShadow=true;g.add(base);
 if(!grid)return;
 const positions:number[]=[];
 for(let i=0;i<=w;i++){const px=-w/2+i;positions.push(px,.002,-d/2,px,.002,d/2);}
 for(let j=0;j<=d;j++){const z=-d/2+j;positions.push(-w/2,.002,z,w/2,.002,z);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:night?'#a5b38d':'#5e6d4d',transparent:true,opacity:.55})));
 const front=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w/2,.018,d/2),new THREE.Vector3(w/2,.018,d/2)]);g.add(new THREE.Line(front,new THREE.LineBasicMaterial({color:0xead6a1})));
}
function clear(v:View){v.content.traverse(o=>{if(o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Line){o.geometry.dispose(); if(o.material && !Object.values(materials).includes(o.material as THREE.Material)) {if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}}});v.content.clear();v.scene.children.filter(o=>o instanceof THREE.Light).forEach(o=>v.scene.remove(o));}
function populate(v:View){
 clear(v);v.scene.background=new THREE.Color(night?'#303c36':'#bdc5ad');
 v.scene.add(new THREE.HemisphereLight(night?'#a2b5c6':'#e9f0df',night?'#414036':'#69604b',night?1.15:1.5));
 const sun=new THREE.DirectionalLight(night?'#b5c6d9':'#ffead0',night?1.15:2.1);sun.position.set(-5,10,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12});sun.shadow.bias=-.0003;v.scene.add(sun);
 if(v.reference){const id=$<HTMLSelectElement>('#reference').value as Ref;const [w,d]=refs[id];lot(v.content,0,w,d);addModel(v.content,reference(id,night),0);}
 else{const item=cases[selected];lot(v.content,-3.05,4,5);addModel(v.content,original(item,night,condition),-3.05);const g=new THREE.Group();g.position.x=3.05;g.rotation.y=-rotation*Math.PI/2;v.content.add(g);lot(g,0,compactLot?4:5,compactLot?3:4);addModel(g,compactLot?compact(item,night,condition):proposed(item,night,condition),0);}
 resize(v);
}
function render(v:View){v.renderer.render(v.scene,v.camera);}
function resize(v:View){const w=v.canvas.clientWidth,h=v.canvas.clientHeight;if(!w||!h)return;v.renderer.setSize(w,h,false);const span=8.7,aspect=w/h;v.camera.left=-span*aspect/2;v.camera.right=span*aspect/2;v.camera.top=span/2;v.camera.bottom=-span/2;v.camera.updateProjectionMatrix();render(v);}
function applyAngle(v:View){v.camera.position.set(...(angle==='top'?[0,20,.01] as [number,number,number]:[8,7,11] as [number,number,number]));v.controls.target.set(0,.6,0);v.camera.zoom=1;v.camera.updateProjectionMatrix();v.controls.update();}
function update(){const item=cases[selected];const [w,d]=compactLot?[4,3]:[5,4];$('#proposal-size').textContent=rotation%2?`${d} × ${w} celle`:`${w} × ${d} celle`;$<HTMLButtonElement>('#rotate-proposal').dataset.rotation=String(rotation);$('#title').textContent=item.name;$('#detail').textContent=item.detail;document.querySelectorAll<HTMLButtonElement>('.case').forEach((b,i)=>{b.classList.toggle('active',i===selected);b.setAttribute('aria-pressed',String(i===selected));});populate(view);populate(refView);}
$<HTMLElement>('.rotate-icon').style.backgroundImage=lpIconUrl('rotate');
$<HTMLButtonElement>('#rotate-proposal').addEventListener('click',()=>{rotation=(rotation+1)%4;update();});
$('#cases').innerHTML=cases.map((c,i)=>`<button class="case" data-index="${i}" aria-pressed="${i===0}">${c.name}</button>`).join('');
document.querySelectorAll<HTMLButtonElement>('.case').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.index);update();}));
document.querySelectorAll<HTMLButtonElement>('.mode').forEach(b=>b.addEventListener('click',()=>{night=b.dataset.mode==='night';document.documentElement.dataset.mode=night?'night':'day';document.querySelectorAll<HTMLButtonElement>('.mode').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b));});update();}));
document.querySelectorAll<HTMLButtonElement>('.angle').forEach(b=>b.addEventListener('click',()=>{angle=b.dataset.angle!;document.querySelectorAll<HTMLButtonElement>('.angle').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b));});applyAngle(view);applyAngle(refView);}));
$<HTMLSelectElement>('#lot-size').addEventListener('change',e=>{compactLot=(e.target as HTMLSelectElement).value==='compact';update();});
$<HTMLSelectElement>('#condition').addEventListener('change',e=>{condition=(e.target as HTMLSelectElement).value as Condition;update();});
$<HTMLSelectElement>('#reference').addEventListener('change',()=>populate(refView));
$<HTMLInputElement>('#grid').addEventListener('change',e=>{grid=(e.target as HTMLInputElement).checked;update();});
update();applyAngle(view);applyAngle(refView);(window as any).__labsReady=true;

(window as any).__labsBounds=()=>cases.flatMap(item=>(['intact','dirty','broken'] as Condition[]).flatMap(condition=>(['large','compact'] as const).map(size=>{const model=size==='compact'?compact(item,false,condition):proposed(item,false,condition);const box=new THREE.Box3();for(const geometry of Object.values(model.geometries)){if(!geometry)continue;geometry.computeBoundingBox();if(geometry.boundingBox)box.union(geometry.boundingBox);geometry.dispose();}return {id:item.id,condition,size,min:box.min.toArray(),max:box.max.toArray()};})));
