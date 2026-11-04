// Le cinque cripte del laboratorio (Temp/Cripte-Lab/models.js su main), portate nel gioco.
// Tre modifiche rispetto all'originale, per il resto identico (si può risincronizzare):
//  1. nessun materiale vero: due etichette (solido / luce) che l'adattatore
//     (cryptModels.ts) traduce nei gruppi di geometria del gioco;
//  2. le superfici sottili (teli, anelli, piani, petali) hanno le due facce nella
//     geometria, perché i materiali del gioco sono a una faccia sola;
//  3. via createLandscape (serve solo al visualizzatore).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Same world convention as Necrothing: 1 unit = 1 cell, front = +Z.
// No game files are imported or changed; each generator returns a reusable Group.
export const PALETTE = {
  stone: '#656b73', dark: '#343943', pale: '#9a9690', marble: '#b9b3a7',
  soil: '#534238', grass: '#4a5f3f', moss: '#61745a', dry: '#8d805c',
  iron: '#252b32', wood: '#49372e', bone: '#c8c0ad', gold: '#b8935a',
  spectral: '#85c8ba', amber: '#f2ac58', purple: '#b398d0', black: '#161d21',
};
export const CRYPTS = [
  { id: 'zombie', name: 'Cripta degli Zombie', short: 'Zombie', subtitle: 'La lavanderia fangosa', accent: '#9dad73', description: 'Un cortile di lavoro disordinato: bucato rattoppato, una tinozza da bucato, carriola di terra e stivali sporchi tra le pozzanghere.', signature: 'Lavanderia fangosa · carriola · bucato rattoppato' },
  { id: 'ghost', name: 'Cripta dei Fantasmi', short: 'Fantasmi', subtitle: 'Il giardino del ricordo', accent: '#93c6c1', description: 'Un giardino silenzioso attorno a una vasca lunare, con panca curva, fiori pallidi, sonagli e candele. Il sentiero aggira l’acqua.', signature: 'Vasca lunare · panca curva · fiori del ricordo' },
  { id: 'skeleton', name: 'Cripta degli Scheletri', short: 'Scheletri', subtitle: 'Il concertino delle ossa', accent: '#c9bc99', description: 'Una piccola sala prove all’aperto: marimba d’ossa, tamburi, piatto e leggio su un pavimento a scacchi. Le ossa di ricambio aspettano nella cesta.', signature: 'Marimba d’ossa · batteria · leggio e pavimento a scacchi' },
  { id: 'nature', name: 'Cripta della Natura', short: 'Natura', subtitle: 'L’orto spontaneo', accent: '#9aab73', description: 'Un orto irregolare di funghi ed erbe: un’aiuola, un cerchio di funghi grandi, un tronco cavo, un’arnia e un traliccio vivo. I passi seguono sezioni di legno.', signature: 'Orto spontaneo · cerchio di funghi · arnia e tronco cavo' },
  { id: 'supernatural', name: 'Cripta Soprannaturale', short: 'Soprannaturale', subtitle: 'Il cerchio dell’altrove', accent: '#b59ac9', description: 'Un cortile rituale con un grande sigillo al centro, cristallo sospeso, menhir incisi, calderone e leggio per gli incantesimi.', signature: 'Sigillo centrale · menhir · cristallo sospeso e calderone' },
];
export const STATES = [{ id: 'clean', name: 'Integra' }, { id: 'dirty', name: 'Sporca' }, { id: 'broken', name: 'Rotta' }];
export const VARIANTS = {
  zombie: ['Casetta storta', 'Portico e comignolo', 'Ala laterale'],
  ghost: ['Cubo lunare', 'Torre del ricordo', 'Loggia degli spiriti'],
  skeleton: ['Campanile aperto', 'Tetto a timpano', 'Torre merlata'],
  nature: ['Dolmen frondoso', 'Arco di pietra', 'Dolmen dei funghi'],
  supernatural: ['Reliquiario a punta', 'Tempio a gradoni', 'Guglie rituali'],
};
const VARIANT_COLORS = {
  zombie:{crooked_roof_band:['#3b4352','#50584f','#514b46']},
  ghost:{terraced_tomb_lid:['#b0b7aa','#9eafa8','#beb7a7']},
  skeleton:{tower_crown:['#9f9c88','#92958c','#afa590']},
  nature:{living_dolmen_lid:['#617748','#4f6950','#77805a']},
  supernatural:{pointed_roof_facet:['#4b465e','#4a5267','#605369']},
};
export const ARCHITECTURES = {
  zombie: { id:'crooked-cottage', name:'Casetta col tetto storto' },
  ghost: { id:'terraced-cube', name:'Cubo terrazzato' },
  skeleton: { id:'ossuary-bell-tower', name:'Torre-ossario' },
  nature: { id:'open-asymmetric-dolmen', name:'Dolmen basso e aperto' },
  supernatural: { id:'pointed-octagonal-shrine', name:'Ottagono a punta' },
};

// Le due etichette di materiale: `userData.glow` dice in che gruppo finisce la geometria.
const MATS = { solid: new THREE.MeshBasicMaterial(), glow: new THREE.MeshBasicMaterial() };
MATS.glow.userData.glow = true;
function mat(key, glow = false) { return glow ? MATS.glow : MATS.solid; }
/** Superficie senza spessore: da disegnare da entrambi i lati. */
const SHEETS = new Set(['PlaneGeometry', 'RingGeometry', 'CircleGeometry', 'ShapeGeometry', 'BufferGeometry']);
function hash(x, y, z, seed = 0) { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453; return n - Math.floor(n); }
export function rng(seed = 1) { let t = seed; return () => { t += 0x6D2B79F5; let n = Math.imul(t ^ t >>> 15, 1 | t); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; }; }

class Builder {
  constructor(type, state, variant=1) {
    this.root = new THREE.Group(); this.root.name = `crypt_${type}_v${variant}_${state}`;
    this.type = type; this.state = state; this.variant=variant; this.dirty = state !== 'clean'; this.broken = state === 'broken';
    this.seed = CRYPTS.findIndex(c => c.id === type) * 101 + 23 + (variant-1)*911; this.random = rng(this.seed);
    this.root.userData = { type, state, variant, variantName: VARIANTS[type]?.[variant-1], footprint: [4, 5], front: '+Z', cellSize: 1, origin: 'ground-centre', courtyard: true, architecture: ARCHITECTURES[type]?.id, architectureName: ARCHITECTURES[type]?.name, revision: 7, style: 'Necrothing / Gothic low-poly' };
  }
  add(name, geo, color, p = [0,0,0], rot = [0,0,0], options = {}) {
    // il tipo si legge prima della conversione: toNonIndexed() crea sempre un BufferGeometry
    const sheet = (options.double ?? SHEETS.has(geo.type)) && !options.glow;
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    // All pieces use vertex colours; UVs are unnecessary and must not differ
    // between primitives and the custom cloth geometry when buckets are merged.
    g.deleteAttribute('uv');
    if (sheet) {
      // senza spessore: una copia con i triangoli rovesciati, così si vede da entrambi i lati
      g.deleteAttribute('normal');
      const p = g.attributes.position.array, q = new Float32Array(p.length);
      for (let i = 0; i < p.length; i += 9) { q.set(p.subarray(i, i + 3), i); q.set(p.subarray(i + 6, i + 9), i + 3); q.set(p.subarray(i + 3, i + 6), i + 6); }
      const back = new THREE.BufferGeometry(); back.setAttribute('position', new THREE.BufferAttribute(q, 3));
      const both = mergeGeometries([g, back]); g.dispose(); back.dispose(); g = both;
    }
    g.rotateX(rot[0]??0); g.rotateY(rot[1]??0); g.rotateZ(rot[2]??0); g.translate(...p);
    const pos = g.attributes.position;
    const jitter = options.jitter ?? .012;
    for (let i=0; i<pos.count; i++) {
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      pos.setXYZ(i,x+(hash(x,y,z,this.seed)-.5)*jitter,y+(hash(y,z,x,this.seed)-.5)*jitter*.7,z+(hash(z,x,y,this.seed)-.5)*jitter);
    }
    const colors = new Float32Array(pos.count*3), base = new THREE.Color(this.variant===1?color:(VARIANT_COLORS[this.type]?.[name]?.[this.variant-1]??color)), moss = new THREE.Color(PALETTE.moss), grime = new THREE.Color('#3d382c');
    const a=new THREE.Vector3(),bb=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
    for(let i=0;i<pos.count;i+=3) {
      a.fromBufferAttribute(pos,i);bb.fromBufferAttribute(pos,i+1);c.fromBufferAttribute(pos,i+2);
      const center=a.clone().add(bb).add(c).divideScalar(3);
      normal.subVectors(bb,a).cross(c.clone().sub(a)).normalize();
      const h=hash(center.x*4,center.y*4,center.z*4,this.seed);
      const vary=options.vary??.065;
      const col=base.clone().multiplyScalar(1+(h-.5)*2*vary);
      if(!options.glow) {
        col.multiplyScalar(.86+.14*THREE.MathUtils.clamp(center.y/1.5,0,1));
        if(this.dirty && !options.clean) {
          const patch=hash(Math.floor(center.x*5),Math.floor(center.y*4),Math.floor(center.z*5),this.seed);
          col.lerp(grime, (.10+(center.y<.55?.27:0)) + (patch>.62?.20:0));
          if(normal.y>.45 && patch>.35) col.lerp(moss,.37);
          if(this.broken) col.multiplyScalar(.87);
        }
      }
      for(let k=0;k<3;k++) col.toArray(colors,(i+k)*3);
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,mat('solid',options.glow,options.alpha??1));
    mesh.name=name; mesh.castShadow=!options.glow;mesh.receiveShadow=!options.glow; this.root.add(mesh);return mesh;
  }
  box(name,x,y,z,w,h,d,color,rot=[0,0,0],opts={}) { return this.add(name,new THREE.BoxGeometry(w,h,d),color,[x,y+h/2,z],rot,opts); }
  blob(name,x,y,z,rx,ry,rz,color,detail=0,opts={}) {const geo=new THREE.IcosahedronGeometry(1,detail);geo.scale(rx,ry,rz);return this.add(name,geo,color,[x,y,z],[0,0,0],{jitter:.025,...opts});}
  cyl(name,x,y,z,r0,r1,h,color,segments=7,rot=[0,0,0],opts={}) {return this.add(name,new THREE.CylinderGeometry(r1,r0,h,segments),color,[x,y+h/2,z],rot,opts);}
  beam(name,a,b,r,color,r2=r) { const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),d=v2.clone().sub(v1);const g=new THREE.CylinderGeometry(r2,r,d.length(),r<=.025?4:6);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));return this.add(name,g,color,v1.add(v2).multiplyScalar(.5).toArray()); }
  profile(name,points,depth,color,p=[0,0,0],rot=[0,0,0],opts={}) {
    const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1});g.translate(0,0,-depth/2);return this.add(name,g,color,p,rot,opts);
  }
  torus(name,x,y,z,r,t,color,rot=[0,0,0],arc=Math.PI*2,opts={}) {return this.add(name,new THREE.TorusGeometry(r,t,3,r<.12?8:r<.35?10:14,arc),color,[x,y,z],rot,opts);}
}

function slab(b,name,x,y,z,w,h,d,color,ry=0) {
  const c=Math.min(.12,w*.18,d*.18), points=[[-w/2+c,-d/2],[w/2-c,-d/2],[w/2,-d/2+c],[w/2,d/2-c],[w/2-c,d/2],[-w/2+c,d/2],[-w/2,d/2-c],[-w/2,-d/2+c]];
  return b.profile(name,points,h,color,[x,y+h/2,z],[-Math.PI/2,ry,0]);
}
function groundRing(b,name,x,y,z,r,width,color,segments=12,arc=Math.PI*2,opts={}) {
  return b.add(name,new THREE.RingGeometry(r-width/2,r+width/2,segments,1,0,arc),color,[x,y,z],[-Math.PI/2,0,0],{jitter:0,...opts});
}
function groundStroke(b,name,a,c,y,width,color,opts={}) {
  const dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz),nx=-dz/length*width/2,nz=dx/length*width/2;
  const p=[a[0]+nx,y,a[1]+nz,a[0]-nx,y,a[1]-nz,c[0]+nx,y,c[1]+nz,c[0]+nx,y,c[1]+nz,a[0]-nx,y,a[1]-nz,c[0]-nx,y,c[1]-nz];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  return b.add(name,geometry,color,[0,0,0],[],{jitter:0,...opts});
}
function glow(b,name,x,y,z,color,r=.09) {
  // Opaque emissive geometry matches the game's glow bucket. Tiny transparent
  // halo shells doubled colour passes without adding a readable silhouette.
  b.blob(name,x,y,z,r,r*1.35,r,color,0,{glow:!b.broken});
}
function candle(b,x,y,z,color=PALETTE.amber) {
  b.cyl('candle_stone',x,y,z,.105,.09,.055,PALETTE.dark,7);
  b.cyl('wax',x,y+.05,z,.039,.032,.15,'#c7b28b',6);
  if(!b.broken) glow(b,'flame',x,y+.235,z,color,.032);
  else b.box('cold_wick',x,y+.20,z,.009,.025,.009,PALETTE.black);
}
function skull(b,x,y,z,s=.16,color=PALETTE.bone) {
  const small=s<.12;
  b.blob('skull',x,y+s*.25,z,s,s*.91,s*.73,color,small?0:1);
  b.box('jaw',x,y-s*.56,z+s*.10,s*1.05,s*.35,s*.97,color);
  for(const sx of [-1,1]) {
    if(small)b.add('eye_socket',new THREE.PlaneGeometry(s*.40,s*.42),PALETTE.black,[x+sx*s*.36,y+s*.31,z+s*.73],[],{jitter:0});
    else{b.blob('eye_socket',x+sx*s*.38,y+s*.31,z+s*.65,s*.25,s*.27,s*.1,PALETTE.black,0,{jitter:0});b.box('jaw_gap',x+sx*s*.21,y-s*.42,z+s*.61,s*.055,s*.15,s*.07,PALETTE.dark);}
  }
  if(!small)b.profile('nose',[[-s*.1,0],[s*.1,0],[0,s*.17]],.01,PALETTE.dark,[x,y-s*.05,z+s*.73]);
}
function turf(b) {
  slab(b,'earth_module',0,-.22,0,3.96,.18,4.96,PALETTE.soil);
  slab(b,'grass_module',0,-.044,0,3.96,.045,4.96,'#46553c');
  for(let i=0;i<12;i++) {
    const x=(b.random()-.5)*3.60,z=(b.random()-.5)*4.60;
    if(Math.abs(x)<1.1 && z<.2 || Math.abs(x)<.42 && z>0) continue;
    tuft(b,x,z,.08+b.random()*.07,false);
  }
}
function steps(b,w=.96) {
  for(let i=0;i<3;i++) slab(b,'entrance_step',0,.015+i*.075,.93-i*.19,w-i*.08,.10,.24,PALETTE.pale);
  b.box('chamber_floor',0,.17,-.05,w*.82,.055,1.25,PALETTE.black);
}
function darkDoor(b,w,h,y,z,color) {
  const p=[[-w/2,0],[w/2,0],[w/2,h*.82],[w*.32,h],[-w*.32,h],[-w/2,h*.82]];
  b.profile('recessed_chamber',p,.045,PALETTE.black,[0,y,z]);
  if(!b.broken) {
    const muted='#'+new THREE.Color(color).multiplyScalar(.33).getHexString();
    b.profile('light_in_chamber',p.map(([x,yy])=>[x*.69,yy*.78]),.012,muted,[0,y+.035,z+.027],[],{glow:true,jitter:0});
  }
}
function chamber(b,color,{width=1.85,height=1.15,depth=1.65}={}) {
  for(const sx of [-1,1])for(let row=0;row<3;row++) {
    if(b.broken&&sx===1&&row===2)continue;
    b.box('squared_chamber_wall',sx*(width/2-.13),.18+row*height/3,-.31,.27,height/3-.012,depth,color);
  }
  b.box('chamber_back',0,.18,-.31-depth/2+.09,width-.2,height,.18,color);
}
function portal(b,{color=PALETTE.pale,width=1.12,height=1.13,z=.63}={}) {
  for(const sx of [-1,1])for(let i=0;i<3;i++){
    if(b.broken&&sx===1&&i===2)continue;
    b.box('portal_jamb',sx*(width/2+.12),.18+i*height/3,z,.25,height/3-.014,.29,color);
  }
  for(let i=0;i<3;i++){
    if(b.broken&&i===2)continue;
    b.box('horizontal_lintel',(i-1)*(width+.5)/3,.18+height,z,(width+.5)/3-.012,.20,.35,color,[0,0,b.broken&&i===1?.08:0]);
  }
}
function tuft(b,x,z,h=.2,dry=false) {
  for(let i=0;i<4;i++) {
    const a=i*2.399; const dx=Math.cos(a)*.045,dz=Math.sin(a)*.045;
    const geo=new THREE.ConeGeometry(.027,h*(.7+i*.08),3);geo.translate(0,h*.38,0);geo.rotateZ(Math.cos(a)*.3);
    b.add('grass',geo,dry?'#8a8053':(i%2?'#65744a':'#4a603d'),[x+dx,.015,z+dz]);
  }
}
function mushroom(b,x,y,z,s=1,color='#99704b') {
  b.cyl('fungus_stem',x,y,z,.025*s,.018*s,.13*s,'#c3b39a',5);
  b.cyl('fungus_cap',x,y+.105*s,z,.09*s,.027*s,.07*s,color,7);
}
function leaf(b,x,y,z,s=.10,color=PALETTE.moss,rotation=0) {
  b.profile('leaf',[[0,-s*.65],[s*.48,0],[0,s],[-s*.48,0]],.012,color,[x,y,z],[.13,rotation,-.4]);
}
function vine(b,x,z,h,dead=false) {
  const col=dead?'#63513b':'#4b613f';
  for(let i=0;i<5;i++) {
    const yy=.08+i*h/5,xx=x+Math.sin(i*1.1)*.07;
    b.beam('ivy_stem',[xx,yy,z],[x+Math.sin((i+1)*1.1)*.07,yy+h/5,z],.016,col);
    leaf(b,xx+(i%2?.065:-.065),yy+.05,z+.016,.12,dead?'#776846':'#6b7b4c',i*.8);
  }
}
function crack(b,points,z,color='#25282a') {for(let i=1;i<points.length;i++)b.beam('fracture',[points[i-1][0],points[i-1][1],z],[points[i][0],points[i][1],z],.012,color,.006);}
function chain(b,a,bb,n=8) {
  const v=new THREE.Vector3(...a),end=new THREE.Vector3(...bb);
  for(let i=0;i<n;i++) {const p=v.clone().lerp(end,i/(n-1));p.y-=Math.sin(i/(n-1)*Math.PI)*.07;b.torus('chain_link',p.x,p.y,p.z,.055,.011,b.dirty?'#655540':PALETTE.iron,[0,i%2?Math.PI/2:0,0]);}
}
function cottageRoofHeight(x) {
  return x<-.14?2.10-(-.14-x)/.98*.59:2.10-(x+.14)/1.26*.59;
}
function cottageRoof(b) {
  const ridge=-.14;
  for(let side=0;side<2;side++)for(let col=0;col<4;col++){
    const edge=side?1.12:-1.12;
    const xa=edge+(ridge-edge)*(col/4),xb=edge+(ridge-edge)*((col+1)/4);
    const ya=cottageRoofHeight(xa),yb=cottageRoofHeight(xb);
    const shortened=b.broken&&side===1&&col>0;
    b.profile('crooked_roof_band',[[xa,ya],[xb,yb],[xb,yb-.065],[xa,ya-.065]],shortened?1.20:2.04,['#3b4352','#3e4655','#39414f','#414958'][col],[0,0,shortened?-.70:-.28],[],{vary:.018});
  }
  b.beam('crooked_ridge_beam',[ridge,2.125,-1.33],[ridge,2.125,.79],.036,'#706249');
  for(const z of[-1.32,.77])for(const edge of[-1.14,1.14]){
    if(b.broken&&z>0&&edge>0)continue;
    b.beam('roof_edge_timber',[edge,1.51,z],[ridge,2.10,z],.035,'#584e3c');
  }
  const gable=[[-.91,1.30],[.91,1.30],[.91,1.56],[ridge,2.05],[-.91,1.62]];
  b.profile('timbered_front_gable',b.broken?gable.slice(0,4):gable,.11,'#776c50',[0,0,.59]);
  b.profile('timbered_back_gable',gable,.10,'#62654e',[0,0,-1.10]);
  b.beam('gable_tie_beam',[-.92,1.51,.67],[.92,1.51,.67],.028,'#4f4537');
  b.box('gable_air_vent',ridge,1.65,.655,.22,.18,.018,PALETTE.black);
  for(let i=0;i<3;i++)b.box('vent_louver',ridge,1.68+i*.05,.677,.23,.022,.023,'#9a8c69');
  if(b.broken)b.box('fallen_roof_board',.66,.03,1.00,.43,.055,.25,'#62644d',[.10,.35,.05]);
}
function weather(b) {
  if(!b.dirty)return;
  const frontZ=b.type==='nature'?.83:b.type==='supernatural'?.95:.76;
  // Surface growth has real volume and a silhouette at the game's zoom level.
  for(const sx of [-1,1]) {
    for(let i=0;i<3;i++) {
      const yy=.22+i*.09;
      b.blob('damp_front_stone',sx*(.73+(i%2)*.07),yy,frontZ,.095+(i%2)*.025,.07,.012,i%2?'#43533b':'#55573d',0,{jitter:.01});
    }
  }
  if(b.type==='zombie'||b.type==='ghost'||b.type==='skeleton'){
    for(let i=0;i<6;i++) {
      const x=(i%2?1:-1)*(.30+(i%3)*.13),z=.1-Math.floor(i/2)*.25;
      if(b.type==='skeleton'&&Math.abs(x)>.45)continue;
      const height=b.type==='zombie'?cottageRoofHeight(x)+.025:b.type==='ghost'?1.59:2.47;
      b.blob('capstone_moss',x,height,z,.14,.018,.16,i%3?'#566b42':'#74814e',0,{jitter:.013});
    }
  }else if(b.type==='supernatural'){
    for(let i=0;i<4;i++){
      if(b.broken&&i<2)continue;
      const a=(i+.5)/8*Math.PI*2,x=Math.sin(a)*.62,z=-.35+Math.cos(a)*.62;
      b.blob('roof_lichen',x,1.75,z,.09,.018,.10,'#5a6249');
    }
  }else{
    for(let i=0;i<5;i++){
      const x=-.65+i*.20,z=-.40+(i%2)*.22;
      if(b.broken&&x>.10)continue;
      b.blob('withered_lid',x,1.48+x*.08,z,.16,.025,.16,'#7c7649');
      leaf(b,x,1.51+x*.08,z,.14,'#8a7751',i*.7);
    }
  }
  for(let i=0;i<16;i++) {
    const side=i%2?-1:1,x=side*(1.07+b.random()*.25),z=-1.15+b.random()*2.50;
    tuft(b,x,z,.19+b.random()*.16,i%4===0);
    if(i%3===0)b.blob('moss_patch',x,.035,z,.12,.024,.16,PALETTE.moss);
  }
  for(let i=0;i<14;i++) {const x=(b.random()-.5)*2.65,z=(b.random()-.5)*2.65;leaf(b,x,.025,z,.04+b.random()*.04,['#8d805c','#6b6242','#7d573b'][i%3],b.random()*6);}
  vine(b,-.83,frontZ+.015,.66,b.broken);vine(b,.94,-.25,.72,b.broken);
  // Visible cobweb over a front shoulder, not a floating square decal.
  const corner=[-.64,1.06,frontZ+.025], webColor='#9b9b84';
  for(let i=0;i<4;i++) {const a=i*Math.PI/6; b.beam('cobweb_spoke',corner,[corner[0]+Math.cos(a)*.25,corner[1]-Math.sin(a)*.25,corner[2]],.0025,webColor);}
  for(const k of [.45,.8])for(let i=0;i<3;i++){const a=i*Math.PI/6,bb=(i+1)*Math.PI/6;b.beam('cobweb_thread',[corner[0]+Math.cos(a)*.25*k,corner[1]-Math.sin(a)*.25*k,corner[2]],[corner[0]+Math.cos(bb)*.25*k,corner[1]-Math.sin(bb)*.25*k,corner[2]],.002,webColor);}
  if(!b.broken)return;
  for(let i=0;i<10;i++) {
    const x=(b.random()-.5)*2.20,z=.68+b.random()*.62,s=.065+b.random()*.09;
    b.blob('fallen_masonry',x,s*.55,z,s*1.3,s*.7,s,PALETTE.stone);
  }
  crack(b,[[-.88,.24],[-.79,.42],[-.85,.56],[-.76,.72]],frontZ+.025);
  crack(b,[[.73,.34],[.60,.57],[.66,.71],[.57,.87]],frontZ+.025);
  b.box('fallen_lintel',.65,.03,1.0,.53,.13,.18,PALETTE.pale,[.04,.4,.17]);
}

function zombie(b) {
  chamber(b,'#62675a');steps(b);
  darkDoor(b,1.14,1.14,.18,.44,'#91b96c');
  portal(b,{color:'#878673',width:1.12,height:1.10});
  for(const sx of [-1,1]) {
    b.box('stone_footing',sx*.99,.10,-.30,.24,.34,1.43,'#5a6055');
    slab(b,'footing_cap',sx*.99,.44,-.30,.32,.10,1.50,'#777b69');
  }
  cottageRoof(b);
  b.profile('side_air_window',[[-.16,0],[.16,0],[.16,.30],[-.16,.30]],.022,b.broken?'#27392a':'#738a58',[.948,.72,-.25],[0,Math.PI/2,0],{glow:!b.broken});
  for(const z of[-.34,-.16])b.beam('side_window_bar',[.971,.73,z],[.971,1.01,z],.012,PALETTE.iron);
  b.beam('side_window_crossbar',[.972,.86,-.40],[.972,.86,-.10],.012,PALETTE.iron);
  for(let i=0;i<3;i++) b.box('sealed_plank',b.broken&&i===2?.38:0,.37+i*.20,.64,.94,.12,.075,b.dirty?'#61513c':'#80694c',[0,0,i===1?-.13:.08]);
  chain(b,[-.45,1.04,.76],[.43,.83,.76],8);
  b.torus('lock_ring',.14,.87,.79,.07,.017,PALETTE.iron);
  b.box('rusty_padlock',.14,.71,.8,.12,.14,.075,'#725738');
  // A hand pries up a side hatch; silhouette differs from any residential model.
  const hatch=slab(b,'side_hatch',-.84,.17,.56,.43,.10,.53,PALETTE.pale);
  hatch.rotation.z=-.25;
  b.beam('zombie_arm',[-.84,.20,.71],[-.89,.48,.80],.071,'#8c9b70',.057);
  b.blob('zombie_palm',-.88,.52,.80,.10,.11,.065,'#9bab7e');
  for(let i=0;i<4;i++)b.beam('zombie_finger',[-.95+i*.045,.54,.82],[-.97+i*.049,.67-(i===3?.04:0),.85],.018,'#a2b286',.013);
  for(const x of [-.49,.48])candle(b,x,.08,1.04,'#a7ca77');
  for(let i=0;i<4;i++)mushroom(b,-1.08,.07,-.8+i*.23,.6+i*.1,'#89905a');
  if(b.broken) {b.box('broken_plank',-.48,.06,1.12,.70,.07,.13,PALETTE.wood,[0,.7,.08]);crack(b,[[-.22,1.48],[-.11,1.40],[-.19,1.31]],.76);}
}
function ghost(b) {
  steps(b,.96);chamber(b,'#969e97',{height:1.08,width:1.92});
  darkDoor(b,1.12,1.13,.18,.40,'#365a51');
  portal(b,{color:'#c3c1b0',width:1.10,height:1.08,z:.58});
  // Quiet engraved doors; no character or face on the entrance.
  for(const sx of [-1,1]) {
    b.box('engraved_stone_door',sx*.235,.21,.47,.44,.91,.06,b.broken?'#515e57':'#718e82');
    b.box('door_inlay',sx*.235,.40,.507,.026,.54,.012,'#a9bba7');
    b.torus('stone_door_handle',sx*.075,.65,.52,.035,.008,PALETTE.marble);
  }
  for(let i=0;i<3;i++) {
    if(b.broken&&i===0)continue;
    slab(b,'terraced_tomb_lid',0,1.23+i*.115,-.31,2.16-i*.23,.12,1.91-i*.15,['#b0b7aa','#c2c4b2','#a3ada1'][i]);
  }
  for(const sx of [-1,1]) {
    const pts=[[sx*.80,.24],[sx*1.04,.24],[sx*1.04,1.30],[sx*.84,1.65],[sx*.80,1.15]];
    if(!(b.broken&&sx===1)) b.profile('carved_stone_veil',pts,.47,'#a8b2a7',[0,0,-.38]);
    else b.profile('fallen_stone_veil',pts.map(([x,y])=>[x*.48,y*.42]),.16,'#89928a',[.37,.04,.55],[Math.PI/2,0,.4]);
    b.box('low_side_sarcophagus',sx*.97,.12,-.03,.30,.25,1.64,'#7e8d84');
    slab(b,'side_sarcophagus_lid',sx*.97,.37,-.03,.38,.08,1.76,'#adb4a7');
    candle(b,sx*.99,.46,.55,'#88cbbb');
  }
  b.torus('moon_halo',0,1.75,-.77,.24,.035,b.broken?'#6b7670':'#a9c1b3');
  // A crescent uses an actual crescent profile, rather than a disk painted with a second disk.
  const moon=[];for(let i=0;i<=10;i++){const a=-Math.PI*.60+i/10*Math.PI*1.35;moon.push([Math.cos(a)*.19,Math.sin(a)*.19]);}for(let i=10;i>=0;i--){const a=-Math.PI*.64+i/10*Math.PI*1.43;moon.push([.085+Math.cos(a)*.12,Math.sin(a)*.15]);}
  b.profile('crescent',moon,.055,'#d3d1b8',[0,1.75,-.70]);
  if(b.broken)crack(b,[[.06,1.27],[-.07,1.18],[.04,.99]],.75);
}

function skeleton(b) {
  steps(b);chamber(b,'#5e6161',{height:1.25,width:1.55,depth:1.55});
  darkDoor(b,1.02,1.13,.18,.44,'#9b8557');
  portal(b,{color:'#aea58f',width:.96,height:1.10,z:.59});
  slab(b,'tower_middle_cornice',0,1.44,-.31,1.74,.15,1.78,'#969585');
  // A tall, open bell chamber makes this an ossuary tower in silhouette.
  for(const sx of[-1,1])for(const z of[.16,-.77]){
    if(b.broken&&sx===1&&z>0)continue;
    b.box('belfry_pedestal',sx*.47,1.59,z,.19,.12,.19,'#8a8979');
    b.beam('belfry_bone_column',[sx*.47,1.69,z],[sx*.47,2.30,z],.044,PALETTE.bone);
    for(const y of[1.69,2.28])b.blob('belfry_bone_joint',sx*.47,y,z,.077,.062,.069,PALETTE.bone);
  }
  for(const z of[.16,-.77])b.beam('belfry_crossbeam',[-.52,2.30,z],[.52,2.30,z],.050,'#b3aa93');
  for(let i=0;i<3;i++){
    if(b.broken&&i===2)continue;
    slab(b,'tower_crown',(i-1)*.45,2.31,-.31,.45,.16,1.40,'#9f9c88');
  }
  const bellProfile=[[0,0],[.18,0],[.20,.035],[.12,.15],[.07,.28],[0,.30]];
  b.add('ossuary_bell',new THREE.LatheGeometry(bellProfile.map(p=>new THREE.Vector2(...p)),9),'#95815b',[0,1.83,-.31]);
  b.beam('bell_hanger',[0,2.14,-.31],[0,2.30,-.31],.018,PALETTE.iron);
  b.blob('bell_clapper',0,1.84,-.31,.035,.07,.035,PALETTE.iron);
  for(let i=0;i<4;i++)b.blob('crown_vertebra',0,2.50+i*.064,-.31,.075,.045,.069,PALETTE.bone);
  skull(b,0,2.80,-.30,.095);
  for(const sx of[-1,1])b.cyl('tower_bone_finial',sx*.54,2.47,-.72,.035,.005,.20,PALETTE.bone,5);
  for(let k=0;k<4;k++) {
    for(const sx of [-1,1]) {
      if((k===0||k===3)&&!(b.broken&&k===0&&sx===1)) {
        b.beam('vertical_bone_pillar',[sx*.72,.25,.58-k*.42],[sx*.72,1.33,.58-k*.42],.045,PALETTE.bone);
        for(const yy of [.27,1.33])b.blob('bone_joint',sx*.72,yy,.58-k*.42,.08,.065,.07,PALETTE.bone);
      }
      b.box('ossuary_niche',sx*.98,.14,.30-k*.43,.30,.44,.29,PALETTE.dark);
      slab(b,'low_ossuary_wing_cap',sx*.98,.58,.30-k*.43,.37,.075,.31,'#8d907c');
      if(k===0) skull(b,sx*.98,.42,.47-k*.43,.10,'#aaa18c');
    }
  }
  b.beam('horizontal_femur',[-.68,1.53,.63],[.68,1.53,.63],.055,PALETTE.bone);
  for(let i=0;i<6;i++) {
    const x=-.43+i*.17;
    const top=1.23;
    if(b.broken&&i===4)continue;
    b.beam('iron_gate',[x,.23,.61],[x+(b.broken?.05:0),top,.61],.016,'#51534b');
  }
  for(const yy of [.40,.91])b.box('gate_rail',0,yy,.62,1.03,.03,.025,'#676052');
  skull(b,0,1.65,.57,.14);
  for(const x of [-1.05,1.05])candle(b,x,.06,.95);
  if(b.broken) {
    b.beam('fallen_rib',[-.72,.13,.82],[-.18,.11,1.26],.075,PALETTE.bone);
    skull(b,.65,.12,1.08,.13,'#b0a48d');
  }
}

function root(b,points,thickness=.08,color='#6e5940') {
  for(let i=1;i<points.length;i++)b.beam('root',points[i-1],points[i],thickness*(1-i/(points.length+1)*.55),color,thickness*(1-i/(points.length+1)*.7));
}
function nature(b) {
  steps(b,.95);
  darkDoor(b,.93,.97,.18,.50,'#756f43');
  // Three irregular standing stones and open flanks, not a boxed chamber.
  b.profile('left_leaning_megalith',[[-1.01,.12],[-.61,.18],[-.58,1.21],[-.76,1.31],[-.98,1.20]],.43,'#92977b',[0,0,.58]);
  b.profile('right_leaning_megalith',[[.61,.18],[.99,.13],[1.04,1.40],[.78,1.47],[.66,1.31]],.44,'#818b70',[0,0,.56]);
  b.profile('rear_standing_stone',[[-.63,.10],[.60,.16],[.56,1.22],[-.38,1.30],[-.68,.92]],.32,'#747e64',[0,0,-.99]);
  for(const sx of[-1,1])b.blob('rear_support_boulder',sx*.86,.43,-.66,.28,.42,.34,'#7f896c',0);
  const caps=[
    [[-1.24,-.88],[-.50,-1.03],[.12,-.98],[.22,.90],[-.95,.84],[-1.35,.35]],
    [[.12,-.98],[.75,-.96],[1.27,-.45],[1.15,.78],[.22,.90]],
  ];
  caps.forEach((points,i)=>{
    if(b.broken&&i===1){b.blob('fallen_megalith_chunk',.90,.13,.22,.40,.13,.38,'#8c9276');return;}
    b.profile('irregular_dolmen_cap',points,.22,i?'#939b7b':'#a0a586',[0,1.35,-.30],[-Math.PI/2,0,.08]);
    b.profile('living_dolmen_lid',points.map(([x,z])=>[x*.965,z*.96]),.025,'#617748',[0,1.48,-.30],[-Math.PI/2,0,.08]);
  });
  for(const sx of [-1,1]) {
    root(b,[[sx*.45,1.49+sx*.036,.29],[sx*.76,1.42+sx*.06,.55],[sx*.89,.84,.79],[sx*.99,.25,.81],[sx*1.21,.05,1.03]],.072);
    root(b,[[sx*.77,.72,.59],[sx*1.03,.37,.28],[sx*1.28,.04,.34]],.067);
    root(b,[[sx*.40,1.49+sx*.03,.25],[sx*.67,1.49+sx*.05,-.27],[sx*.9,1.24,-.80],[sx*1.17,.1,-1.05]],.061);
    if(!(b.broken&&sx===1))root(b,[[sx*.70,1.49+sx*.05,.58],[sx*.36,1.51+sx*.03,.62],[sx*.04,1.49,.62]],.048);
    for(let i=0;i<3;i++)mushroom(b,sx*(.87+i*.10),.11,.68-i*.27,.8+i*.25,i%2?'#b68e4e':'#866849');
  }
  // Small roof sprout deliberately stays below a house-sized silhouette.
  const treeX=-.48;
  root(b,[[treeX,1.44,-.62],[treeX-.05,1.72,-.61],[treeX+.03,1.96,-.61]],.066);
  root(b,[[treeX-.02,1.73,-.61],[treeX-.28,1.91,-.56]],.034);
  if(!b.broken) {
    if(b.variant===2){
      for(let i=0;i<3;i++)b.cyl('pine_canopy',treeX,1.65+i*.17,-.60,.30-i*.055,.015,.43,'#405b3f',6);
    }else{
      b.blob('small_canopy',treeX+.05,1.98,-.60,.31,.23,.28,b.variant===3?'#84915b':'#687d4b');
      b.blob('small_canopy',treeX-.24,1.92,-.56,.22,.17,.20,b.variant===3?'#9a9865':'#7c8b55');
    }
    for(let i=0;i<9;i++){const x=(b.random()-.5)*1.5,z=-.8+b.random()*.7;leaf(b,x,1.49+x*.08,z,.12,'#829260',b.random()*5);}
  } else b.beam('snapped_branch',[treeX,1.87,-.61],[treeX+.19,1.92,-.51],.045,'#8e7955',.018);
  root(b,[[0,1.46,.63],[0,1.29,.68]],.015);
  b.profile('sprout_emblem',[[0,0],[.16,.16],[.15,.28],[.035,.21],[0,.05],[-.035,.21],[-.15,.28],[-.16,.16]],.026,'#c0b47b',[0,1.10,.69]);
  for(const x of [-.51,.51])candle(b,x,.11,1.11,'#e3bb70');
  if(b.broken) {b.box('split_root',.6,.04,.97,.62,.11,.12,'#5d4c38',[0,.5,.13]);crack(b,[[.76,1.22],[.79,1.09],[.74,.99]],.81);}
}

function supernatural(b) {
  steps(b,1.0);
  for(const[r,y,h,col]of[[1.10,.08,.20,'#454251'],[1.02,.28,.12,'#73697e']])b.cyl('octagonal_foundation',0,y,-.35,r,r,h,col,8,[0,Math.PI/8,0]);
  b.cyl('eight_sided_reliquary',0,.38,-.35,.91,.83,.96,'#5b5368',8,[0,Math.PI/8,0]);
  // Eight steep individual facets produce a pointed octagonal roof. Broken
  // facets are absent, exposing the chamber instead of recolouring the lid.
  for(let i=0;i<8;i++){
    if(b.broken&&i<2)continue;
    const a=i/8*Math.PI*2;
    b.add('pointed_roof_facet',new THREE.CylinderGeometry(.15,1.06,.83,1,1,true,a,Math.PI/4),['#4b465e','#534c65','#4f495f','#575068'][i%4],[0,1.805,-.35],[],{vary:.018});
    const p=[Math.sin(a)*1.07,1.39,-.35+Math.cos(a)*1.07],q=[Math.sin(a+Math.PI/4)*1.07,1.39,-.35+Math.cos(a+Math.PI/4)*1.07];
    b.beam('octagonal_eave',p,q,.027,'#9a849e');
    b.beam('roof_rib',[Math.sin(a)*.15,2.22,-.35+Math.cos(a)*.15],p,.016,'#93809d');
  }
  b.cyl('spire_collar',0,2.22,-.35,.16,.11,.12,'#9b879c',8);
  b.add('spire_point',new THREE.OctahedronGeometry(.14),b.broken?'#78677d':'#bea3d0',[0,2.49,-.35],[0,0,0],{glow:!b.broken});
  darkDoor(b,.99,1.08,.21,.65,'#a27bd0');
  const arc=[[-.66,.25],[-.66,1.05],[-.40,1.29],[.40,1.29],[.66,1.05],[.66,.25]];
  for(let i=1;i<arc.length;i++) {
    if(b.broken&&i===4)continue;
    const [ax,ay]=arc[i-1],[bx,by]=arc[i],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy),nx=-dy/L*.105,ny=dx/L*.105;
    b.profile('basalt_arch',[[ax+nx,ay+ny],[bx+nx,by+ny],[bx-nx,by-ny],[ax-nx,ay-ny]],.27,'#78717e',[0,0,.79]);
    if(!b.broken)b.beam('copper_inlay',[ax,ay,.936],[bx,by,.936],.014,'#b29b78');
  }
  for(const sx of [-1,1]) {
    b.profile('octagonal_flying_buttress',[[sx*.72,.30],[sx*1.10,.28],[sx*1.04,.58],[sx*.84,1.20]],.24,'#686071',[0,0,-.44]);
    candle(b,sx*.98,.15,.91,'#c098e4');
    b.box('stone_rune',sx*.93,.73,-.34,.06,.12,.024,b.broken?'#645968':'#b5a17b',[0,0,.45]);
  }
  b.torus('ritual_ring',0,2.49,-.48,.24,.026,'#9c8c75',[0,0,Math.PI/4],Math.PI*1.69);
  if(!b.broken) {
    for(const sx of [-1,1])b.add('floating_shard',new THREE.OctahedronGeometry(.065),'#ba99d1',[sx*.26,2.28,-.22],[0,.2,sx*.5],{glow:true});
  } else {
    b.add('fallen_keystone',new THREE.OctahedronGeometry(.15),'#75657c',[.20,.14,1.10],[.4,.4,.6]);
    b.box('fallen_obsidian',-.67,.03,.91,.48,.14,.23,'#4b4654',[.1,.5,-.1]);
  }
  // A precise carved seal inside the chamber.
  b.torus('inner_seal',0,.82,.73,.25,.016,b.broken?'#635871':'#a08cae',[0,0,0],Math.PI*2,{glow:!b.broken});
  b.profile('seal_diamond',[[0,-.18],[.11,0],[0,.18],[-.11,0]],.016,b.broken?'#635871':'#bca1d2',[0,.82,.75],[],{glow:!b.broken});
}

function removeParts(b,...names) {
  for(const child of [...b.root.children])if(names.includes(child.name)){
    b.root.remove(child);child.geometry?.dispose();
  }
}

// Small, named architectural variations. The family silhouette and scale stay
// recognisable; broken versions retain their particular roof feature.
function buildingVariant(b) {
  if(b.variant===1)return;
  if(b.type==='zombie') {
    if(b.variant===2){
      const x=.60,z=-.81;
      b.box('variant_chimney',x,1.68,z,.27,.50,.29,'#77736a');
      b.box('chimney_cap',x,2.18,z,.34,.10,.36,'#4b4c4b');
      for(const y of[1.80,1.96,2.10])b.box('chimney_course',x,y,z+.15,.27,.017,.012,'#575952');
      if(b.broken)b.box('fallen_chimney_brick',.93,.04,.78,.22,.09,.14,'#6f6e64',[0,.3,.05]);
    }else{
      const x=-.14,z=-.78;
      slab(b,'roof_lantern_foot',x,2.06,z,.29,.09,.30,'#5d5c52');
      b.box('roof_lantern_glass',x,2.17,z,.18,.25,.18,b.broken?'#414943':'#bfac71',[],{glow:!b.broken});
      for(const sx of[-1,1])for(const sz of[-1,1])b.beam('roof_lantern_frame',[x+sx*.095,2.15,z+sz*.095],[x+sx*.095,2.43,z+sz*.095],.012,PALETTE.iron);
      b.cyl('roof_lantern_hat',x,2.42,z,.20,.015,.14,PALETTE.iron,4,[0,Math.PI/4,0]);
    }
  }else if(b.type==='ghost'){
    removeParts(b,'moon_halo','crescent');
    if(b.variant===2){
      for(const sx of[-1,1]){
        slab(b,'variant_spire_foot',sx*.60,1.56,-.69,.30,.09,.30,'#a9b4aa');
        b.profile('variant_moon_spire',[[sx*.48,0],[sx*.72,0],[sx*.66,.31],[sx*.60,.52],[sx*.54,.31]],.20,'#c6c9b7',[0,1.64,-.69]);
      }
      b.torus('variant_moon_medallion',0,1.74,-.68,.16,.022,'#bfcbb8');
    }else{
      b.cyl('variant_moon_brazier_base',0,1.56,-.70,.22,.16,.14,'#a3afa5',8);
      b.cyl('variant_moon_brazier_bowl',0,1.70,-.70,.16,.24,.11,'#bec7b4',8);
      if(!b.broken)glow(b,'variant_moon_flame',0,1.86,-.70,'#92caba',.09);
      for(const sx of[-1,1])candle(b,sx*.62,1.55,-.65,PALETTE.spectral);
    }
  }else if(b.type==='skeleton'){
    if(b.variant===2){
      b.beam('variant_banner_pole',[.55,2.44,.03],[.55,b.broken?2.76:3.00,.03],.025,PALETTE.bone);
      fabric(b,'variant_bone_banner',.78,b.broken?2.72:2.97,.04,.38,.34,'#817a6e',{ragged:b.dirty});
      b.beam('banner_crossbone_a',[.69,b.broken?2.58:2.83,.07],[.87,b.broken?2.42:2.67,.07],.018,PALETTE.bone);
      b.beam('banner_crossbone_b',[.87,b.broken?2.58:2.83,.07],[.69,b.broken?2.42:2.67,.07],.018,PALETTE.bone);
    }else{
      removeParts(b,'ossuary_bell','bell_hanger','bell_clapper');
      const profile=[[0,0],[.13,0],[.14,.025],[.09,.11],[.05,.20],[0,.22]];
      for(const x of[-.22,.22]){
        b.add('variant_small_bell',new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),7),'#9e8a64',[x,1.87,-.31]);
        b.beam('variant_bell_hanger',[x,2.09,-.31],[x,2.30,-.31],.014,PALETTE.iron);
        b.blob('variant_bell_clapper',x,1.86,-.31,.028,.045,.028,PALETTE.iron);
      }
    }
  }else if(b.type==='nature'){
    if(b.variant===2){
      for(const x of[-.82,.72])if(!(b.broken&&x>0))b.blob('variant_mossy_capstone',x,1.50+x*.08,-.12,.19,.035,.21,'#6e8054');
      for(let i=0;i<3;i++)mushroom(b,-1.05+i*.13,.05,.98,.75,'#ae9160');
    }else{
      for(const [x,z,s]of[[-.98,.05,.95],[-.70,.02,1.25],[.60,-.46,.90]])if(!(b.broken&&x>0))mushroom(b,x,1.48+x*.08,z,s,'#b19465');
      for(let i=0;i<3;i++)leaf(b,.75+i*.10,.18+i*.10,.80,.12,'#84925d',i*.8);
    }
  }else{
    removeParts(b,'ritual_ring');
    if(b.variant===2){
      for(const sx of[-1,1]){
        b.beam('variant_horn_base',[sx*.12,2.22,-.40],[sx*.33,2.37,-.40],.044,'#aaa0a3');
        b.beam('variant_horn_tip',[sx*.33,2.37,-.40],[sx*.35,2.66,-.40],.035,'#aaa0a3',.009);
      }
    }else{
      const star=[[0,.23],[.06,.06],[.23,0],[.06,-.06],[0,-.23],[-.06,-.06],[-.23,0],[-.06,.06]];
      b.profile('variant_spire_star',star,.045,b.broken?'#796b80':'#c6a9d9',[0,2.58,-.48],[],{glow:!b.broken});
      for(const sx of[-1,1])b.add('variant_spire_crystal',new THREE.OctahedronGeometry(.075),b.broken?'#796b80':'#aa94c6',[sx*.32,2.31,-.28],[],{glow:!b.broken});
    }
  }
}

// Stronger, low-poly changes to volume and silhouette; all share the same lot.
function silhouetteVariant(b) {
  if(b.variant===1)return;
  if(b.type==='zombie'){
    if(b.variant===2){
      for(const x of[-.72,.72])b.box('porch_post',x,.17,1.04,.10,1.10,.10,'#554b3b');
      b.profile('porch_canopy',[[-.90,0],[.90,0],[.78,.18],[-.78,.18]],.53,'#626d56',[0,1.27,.95],[-.13,0,0]);
      b.box('porch_fascia',0,1.20,1.22,1.77,.14,.08,'#776a53');
    }else{
      b.box('side_wing',1.13,.14,-.28,.58,.79,1.06,'#737766');
      slab(b,'side_wing_roof',1.13,.93,-.28,.72,.16,1.20,'#555d57');
      b.box('side_wing_door',1.13,.23,.26,.37,.55,.035,'#403d33');
      b.beam('side_wing_plank',[.96,.62,.29],[1.29,.32,.29],.035,'#978465');
    }
  }else if(b.type==='ghost'){
    if(b.variant===2){
      b.cyl('spectral_tower',0,1.57,-.29,.49,.43,.46,'#afbeb4',8,[0,Math.PI/8,0]);
      b.cyl('spectral_tower_cap',0,2.03,-.29,.54,.38,.14,'#d0d4c2',8,[0,Math.PI/8,0]);
      if(!b.broken)b.torus('spectral_tower_halo',0,2.31,-.29,.19,.025,'#d6dbbf');
    }else{
      for(const x of[-.78,.78]){
        b.box('spirit_loggia_column',x,.14,.93,.14,1.07,.14,'#b8c3b4');
        slab(b,'spirit_loggia_cap',x,1.21,.93,.23,.09,.23,'#d0d3c2');
      }
      b.beam('spirit_loggia_crossbeam',[-.85,1.35,.93],[.85,1.35,.93],.065,'#b9c6b6');
      for(const x of[-.53,0,.53])b.blob('spirit_loggia_pendant',x,1.19,.94,.055,.11,.055,'#b1d0be');
    }
  }else if(b.type==='skeleton'){
    if(b.variant===2){
      removeParts(b,'tower_crown','tower_bone_finial','crown_vertebra');
      b.profile('ossuary_gable',[[-.70,0],[.70,0],[0,.49]],.95,'#858679',[0,2.30,-.31]);
      b.beam('gable_left_trim',[-.70,2.30,.18],[0,2.79,.18],.032,PALETTE.bone);
      b.beam('gable_right_trim',[0,2.79,.18],[.70,2.30,.18],.032,PALETTE.bone);
    }else{
      removeParts(b,'tower_bone_finial','crown_vertebra');
      for(const x of[-.53,0,.53])for(const z of[-.77,.15]){
        if(b.broken&&x>0&&z>0)continue;
        b.box('ossuary_merlon',x,2.47,z,.23,.28,.23,'#b5ac94');
      }
      b.beam('tower_skull_pole',[0,2.46,-.31],[0,2.76,-.31],.045,PALETTE.bone);
    }
  }else if(b.type==='nature'){
    if(b.variant===2){
      for(const x of[-1.14,1.14])b.profile('standing_arch_stone',[[-.17,0],[.17,0],[.15,.94],[-.11,1.02]],.25,'#858e72',[x,.15,.78]);
      if(!b.broken)b.profile('standing_arch_lintel',[[-1.29,0],[1.29,0],[1.18,.23],[-1.12,.21]],.30,'#9ba181',[0,1.13,.78]);
      else b.box('fallen_arch_lintel',.75,.05,1.11,.65,.16,.20,'#899273',[0,.30,.1]);
    }else{
      removeParts(b,'small_canopy');
      if(!b.broken){
        b.cyl('great_mushroom_stem',-.48,1.70,-.62,.12,.10,.38,'#c1b48b',7);
        b.cyl('great_mushroom_cap',-.48,2.03,-.62,.48,.19,.22,'#ae855f',9);
        for(const [x,z]of[[-.73,-.64],[-.38,-.75],[-.51,-.37]])b.blob('great_mushroom_spot',x,2.23,z,.06,.018,.05,'#e0d5af');
      }
      b.blob('side_mushroom_boulder',1.15,.35,-.15,.24,.35,.30,'#89937a');
    }
  }else{
    if(b.variant===2){
      removeParts(b,'pointed_roof_facet','octagonal_eave','roof_rib');
      for(const [r,y,h]of[[1.05,1.37,.18],[.84,1.55,.18],[.63,1.73,.18],[.42,1.91,.22]])b.cyl('ritual_roof_step',0,y,-.35,r,r*.93,h,'#696277',8,[0,Math.PI/8,0]);
    }else{
      for(const x of[-.94,.94]){
        b.profile('ritual_buttress',[[x-.15,.18],[x+.15,.18],[x+.10,1.43],[x,1.69],[x-.10,1.43]],.23,'#817289',[0,0,.63]);
        if(!b.broken)b.add('buttress_crystal',new THREE.OctahedronGeometry(.09),'#b49aca',[x,1.70,.63],[],{glow:true});
      }
    }
  }
}

function fabric(b,name,x,y,z,w,h,color,{ragged=false,rotate=0,laid=false}={}) {
  // Folded, double-sided cloth made from 12 triangles; not a flat door decal.
  const vertices=[],indices=[];
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
    const xx=(col/3-.5)*w,fray=ragged&&row===2?(col%2?-.08:.03):0;
    vertices.push(xx,-row/2*h+fray,Math.sin(col*2.2+row*.6)*.035+row*.009);
  }
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){const a=row*4+col;indices.push(a,a+4,a+1,a+1,a+4,a+5);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);
  return b.add(name,geo,color,[x,y,z],[laid?-Math.PI/2:0,rotate,0],{jitter:.003});
}

function zombieLaundry(b) {
  const y=b.broken?.81:1.15,z=.72;
  for(const x of [-1.56,-.53]) {
    const topX=b.broken&&x>-.6?x+.15:x,topY=b.broken&&x>-.6?.72:1.22;
    b.beam('clothesline_post',[x,.02,z],[topX,topY,z],.032,b.type==='ghost'?'#8d9687':PALETTE.wood,.025);
    slab(b,'line_post_foot',x,.01,z,.16,.07,.16,PALETTE.dark);
  }
  for(let i=0;i<6;i++){
    const x=-1.56+i*1.03/6,xx=-1.56+(i+1)*1.03/6;
    const curve=t=>y+.045-Math.sin(t*Math.PI)*(b.broken?.15:.07);
    b.beam('washing_rope',[x,curve(i/6),z],[xx,curve((i+1)/6),z],.009,'#b4a78a');
  }
  b.profile('patched_shirt',[[-.12,0],[-.23,-.09],[-.18,-.20],[-.12,-.16],[-.12,-.46],[.13,-.46],[.13,-.16],[.19,-.20],[.24,-.09],[.12,0],[.06,-.04],[-.05,-.04]],.018,'#8e9470',[-1.29,y,z],[0,-.12,.06]);
  b.box('shirt_patch',-1.29,y-.34,z+.025,.10,.09,.012,'#b3a17d',[0,0,-.12]);
  b.profile('hanging_trousers',[[-.15,0],[.15,0],[.17,-.47],[.035,-.49],[0,-.19],[-.035,-.49],[-.17,-.47]],.018,'#666e66',[-.80,y-.015,z],[0,.08,-.07]);
  for(const x of [-1.41,-1.18,-.91,-.68])b.box('wood_clothes_peg',x,y-.015,z+.01,.022,.07,.036,'#b39b76');
  if(b.broken)fabric(b,'fallen_linen',-1.14,.05,1.60,.44,.44,'#817b66',{ragged:true,laid:true});
}

function courtyardFence(b) {
  const wood=b.type==='zombie'||b.type==='nature',bone=b.type==='skeleton';
  const color=wood?b.type==='nature'?'#79654a':'#6f5a42':bone?PALETTE.bone:PALETTE.iron;
  const segments=[[-1.82,-2.27,1.82,-2.27],[-1.82,-2.27,-1.82,2.27],[1.82,-2.27,1.82,2.27],[-1.82,2.27,-.50,2.27],[.50,2.27,1.82,2.27]];
  const corners=[[-1.82,-2.27],[1.82,-2.27],[-1.82,2.27],[1.82,2.27],[-.50,2.27],[.50,2.27]];
  for(let i=0;i<corners.length;i++) {
    const [x,z]=corners[i];
    b.box('fence_post',x,.02,z,.115,.58,.115,color,[0,0,b.broken&&i===3?.24:0]);
    if(bone){if(i>=2)skull(b,x,.66,z+.01,.095);else b.blob('bone_post_cap',x,.64,z,.075,.055,.06,PALETTE.bone);}
    else if(wood)b.profile('fence_post_point',[[-.065,0],[.065,0],[0,.12]],.12,color,[x,.58,z]);
    else {
      b.add('fence_finial',new THREE.OctahedronGeometry(b.type==='supernatural'?.09:.055),b.type==='supernatural'?'#a48aaf':'#a4afa0',[x,.66,z]);
      if(b.type==='supernatural')b.box('basalt_post_foot',x,.02,z,.22,.23,.22,'#514958');
    }
  }
  segments.forEach(([ax,az,bx,bz],side)=>{
    const len=Math.hypot(bx-ax,bz-az),count=Math.round(len/(wood?.35:.38));
    for(const yy of [.21,.43]) {
      const midX=(ax+bx)/2,midZ=(az+bz)/2;
      if(b.broken&&side===4){b.beam('snapped_fence_rail',[ax,yy,az],[midX,yy-.14,midZ],.025,color);continue;}
      b.beam('fence_rail',[ax,yy,az],[bx,yy,bz],wood?.025:bone?.032:.018,color);
    }
    for(let i=1;i<count;i++) {
      if(b.broken&&(side===1&&i>count-4||side===4&&i%3!==0))continue;
      const t=i/count,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
      const h=(b.type==='zombie'?.38+hash(x,0,z)*.16:.49);
      if(b.type==='zombie') {
        b.profile('wood_fence_picket',[[-.062,0],[.062,0],[.062,h-.07],[0,h],[-.062,h-.07]],.060,color,[x,.02,z],[0,Math.abs(ax-bx)<.1?Math.PI/2:0,(hash(x,1,z)-.5)*.13]);
      }else if(b.type==='nature'){
        b.beam('woven_fence_stake',[x,.02,z],[x+.02,h+.05,z],.023,color);
        if(i%2===0)b.beam('woven_branch',[x-.04,.10,z],[x+.05,.51,z+.025],.012,'#94805b');
      }else if(bone){
        b.beam('bone_fence_picket',[x,.08,z],[x,.52,z],.025,color);
        if(i%2===0)b.blob('bone_fence_knuckle',x,.53,z,.045,.032,.038,PALETTE.bone);
      }else{
        b.beam('iron_fence_picket',[x,.06,z],[x,.53,z],.014,color);
        if(i%2===0){const tip=new THREE.OctahedronGeometry(.045);tip.scale(.72,1.45,.4);b.add('iron_spear_tip',tip,b.type==='supernatural'?'#8c778e':'#778274',[x,.56,z]);}
      }
    }
  });
  // Open gate swings inward along the left side of the unobstructed path.
  for(const z of [1.69,2.24])b.beam('open_gate_stile',[-.48,.07,z],[-.48,.50,z],.023,color);
  for(const yy of [.17,.44])b.beam('open_gate_rail',[-.48,yy,1.69],[-.48,yy,2.24],.020,color);
  b.beam('gate_diagonal',[-.48,.17,1.70],[-.48,.44,2.23],.016,color);
  if(b.broken){b.box('fallen_fence_fragment',1.28,.03,1.96,.66,.065,.09,color,[.02,.35,.05]);b.box('fallen_fence_fragment',1.33,.03,1.77,.45,.055,.08,color,[0,-.5,.03]);}
}

function washTub(b,x,z,{stone=false,color='#6d6759'}={}) {
  const profile=[[0,.02],[.17,.02],[.21,.09],[.25,.31],[.22,.34],[.195,.28],[.16,.09],[0,.09]];
  b.add('wash_basin',new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),9),stone?'#9da897':color,[x,.01,z]);
  b.cyl('basin_water',x,.19,z,.185,.185,.012,b.broken?'#4f5143':stone?'#6c9e91':'#6f775c',9,[],{glow:stone&&!b.broken});
  if(!stone)for(const yy of [.12,.27])b.torus('tub_iron_hoop',x,yy,z,.217,.014,PALETTE.iron,[Math.PI/2,0,0]);
}
function yardGround(b) {
  if(b.type==='zombie') {
    for(const[x,z,rx,rz]of[[-.96,1.46,.66,.49],[1.02,1.48,.52,.55],[.49,.54,.28,.32]])b.blob('mud_patch',x,.008,z,rx,.014,rz,b.dirty?'#3c3b29':'#4b4932',1,{jitter:.012});
    for(let i=0;i<9;i++) {
      const x=Math.sin(i*1.1)*.09;
      slab(b,'uneven_workyard_step',x,.015,.35+i*.23,.55,.055,.18,i%2?'#8b8b75':'#696d60',Math.sin(i)*.08);
    }
  }else if(b.type==='ghost'){
    const route=[[0,2.27],[.35,2.02],[.64,1.72],[.72,1.39],[.70,1.06],[.56,.72],[.28,.42],[0,.22]];
    route.forEach(([x,z],i)=>slab(b,'curved_garden_step',x,.015,z,.36,.045,.26,i%2?'#a7afa0':'#929d8b',i*.16));
  }else if(b.type==='skeleton'){
    slab(b,'music_stage_base',0,.012,1.14,3.05,.04,1.90,'#5a5a4f');
    for(let row=0;row<3;row++)for(let col=0;col<4;col++) {
      if(b.broken&&row===2&&col===3)continue;
      slab(b,'stage_checker_tile',-1.125+col*.75,.05,.48+row*.62,.73,.018,.59,(row+col)%2?'#676c60':'#a6a38e');
    }
    for(const z of [.18,2.19,2.40])slab(b,'stage_entry_step',0,.01,z,.68,.055,.18,'#8f907f');
  }else if(b.type==='nature'){
    [[0,2.25],[-.14,1.98],[-.16,1.63],[.06,1.29],[.02,.94],[-.07,.59],[0,.28]].forEach(([x,z],i)=>{
      const r=i%2?.18:.21;b.cyl('wood_round_step',x,.012,z,r,r,.055,'#a08a60',9);
      groundRing(b,'tree_ring',x,.072,z,r*.57,.012,'#746245',10);
    });
  }else{
    slab(b,'octagonal_ritual_dais',0,.01,1.18,1.94,.065,1.91,'#554e62');
    for(const r of [.69,.77])groundRing(b,'central_ward_circle',0,.092,1.18,r,.018,b.broken?'#746476':'#ba9ecd',16,Math.PI*2,{glow:!b.broken});
    const pts=Array.from({length:6},(_,i)=>[Math.sin(i/6*Math.PI*2)*.59,Math.cos(i/6*Math.PI*2)*.59+1.18]);
    for(let i=0;i<6;i++)groundStroke(b,'inscribed_sigil',pts[i],pts[(i+2)%6],.095,.016,b.broken?'#796d75':'#b59ac9');
    for(const z of [.21,2.20,2.38])slab(b,'basalt_entry_step',0,.01,z,.58,.055,.19,'#74697e');
  }
}

function zombieYard(b) {
  zombieLaundry(b);washTub(b,-1.10,1.57);
  b.box('wash_board',-1.12,.15,1.58,.22,.38,.04,'#9e8966',[.40,0,-.08]);
  for(let i=0;i<4;i++)b.box('wash_board_rib',-1.12,.24+i*.055,1.65,.18,.018,.018,'#625d4b');
  const x=1.03,z=1.17;
  b.torus('wheelbarrow_wheel',x,.18,z-.39,.16,.04,PALETTE.iron,[0,Math.PI/2,0]);
  for(const sx of [-1,1]) {
    b.beam('barrow_frame',[x+sx*.23,.27,z-.31],[x+sx*.23,.40,z+.32],.025,'#6d5c44');
    if(!(b.broken&&sx===1))b.beam('barrow_handle',[x+sx*.23,.40,z+.24],[x+sx*.23,.48,z+.77],.025,'#9b8058');
    b.beam('barrow_leg',[x+sx*.20,.03,z+.28],[x+sx*.20,.37,z+.23],.025,PALETTE.iron);
    b.box('barrow_side',x+sx*.28,.36,z,.055,.20,.67,'#6e775d',[0,0,sx*-.15]);
  }
  for(const dz of [-.31,.31])b.box('barrow_end',x,.36,z+dz,.55,.20,.045,'#85846a');
  b.box('barrow_soil',x,.35,z,.51,.14,.60,'#514630');
  for(let i=0;i<5;i++)b.blob('barrow_soil_heap',x+Math.sin(i*2)*.14,.51,z+Math.cos(i*2)*.14,.16,.09,.17,'#67543a');
  for(const [xx,zz]of[[.58,.43],[.78,.35]]) {b.box('muddy_boot',xx,.02,zz,.11,.19,.16,'#454b3e');b.box('boot_toe',xx,.02,zz+.08,.12,.07,.13,'#454b3e');}
  b.beam('shovel_handle',[1.49,.03,.43],[1.37,.95,.29],.020,'#a18b62');
  b.profile('shovel_blade',[[-.085,0],[.085,0],[.07,-.15],[0,-.21],[-.07,-.15]],.025,'#6b6f68',[1.49,.22,.44]);
  b.root.userData.courtyardObjects=['patched-laundry','wash-tub-and-washboard','soil-wheelbarrow','muddy-boots','shovel','mud-patches'];
}

function ghostYard(b) {
  const x=-.56,z=1.16;
  const profile=[[0,.015],[.54,.015],[.64,.07],[.66,.19],[.57,.22],[.53,.11],[0,.11]];
  b.add('moon_reflection_pool',new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),16,0,b.broken?Math.PI*1.75:Math.PI*2),'#a8b4a0',[x,.01,z]);
  b.cyl('still_pool_water',x,b.broken?.06:.13,z,.535,.535,.012,b.broken?'#4a554b':'#719f96',16,[],{glow:!b.broken});
  if(!b.broken){groundRing(b,'quiet_ripple',x,.153,z,.24,.012,'#a0c6b5',12,Math.PI*1.75,{glow:true});glow(b,'pool_mote',x-.13,.26,z+.08,'#afd7c7',.026);}
  for(let i=0;i<3;i++){
    const a=(i-1)*.40,xx=.62+Math.cos(a)*.76,zz=1.20+Math.sin(a)*.76;
    b.box('curved_bench_leg',xx,.02,zz,.14,.29,.16,'#889785');
    if(b.broken&&i===2){slab(b,'fallen_bench_seat',xx-.15,.04,zz+.18,.30,.065,.40,'#9fa993',.4);continue;}
    slab(b,'curved_bench_seat',xx,.31,zz,.30,.09,.39,'#bdc4af',a);
  }
  fabric(b,'folded_mourning_cloth',1.34,.415,1.11,.20,.20,'#b9c8b9',{laid:true,ragged:b.dirty});
  b.beam('chime_tree_stem',[-1.38,.01,.28],[-1.38,1.17,.28],.018,PALETTE.iron);
  b.torus('chime_crown',-1.38,1.06,.28,.19,.014,'#9bab97');
  for(let i=0;i<3;i++) {
    const xx=-1.52+i*.14,yy=.67+(i%2)*.11;
    if(b.broken&&i===2){b.cyl('fallen_chime',-1.35,.02,.50,.03,.022,.18,'#9aab94',6,[0,0,Math.PI/2]);continue;}
    b.beam('silver_chime_string',[xx,1.06,.28],[xx,yy+.12,.28],.003,'#b1bda5');
    b.cyl('silver_wind_chime',xx,yy-.07,.28,.026,.020,.19,'#b4c4af',6);
  }
  for(let i=0;i<5;i++){
    const xx=1.02+(i%3)*.18,zz=.20+Math.floor(i/3)*.15,yy=.18+(i%2)*.055;
    b.beam('moon_flower_stem',[xx,.02,zz],[xx,yy,zz],.008,b.broken?'#847b58':'#657d58');
    const points=[];for(let j=0;j<10;j++){const a=j/10*Math.PI*2,r=j%2?.022:.059;points.push(Math.sin(a)*r,Math.cos(a)*r);}
    const shape=new THREE.Shape();for(let j=0;j<10;j++){const px=points[j*2],py=points[j*2+1];if(j===0)shape.moveTo(px,py);else shape.lineTo(px,py);}shape.closePath();
    b.add('moon_flower_petals',new THREE.ShapeGeometry(shape),b.broken?'#a19b7b':'#d6d7bf',[xx,yy,zz],[-Math.PI/2,0,i*.35],{jitter:0});
    b.add('flower_centre',new THREE.CircleGeometry(.012,5),'#baaf7e',[xx,yy+.003,zz],[-Math.PI/2,0,0],{jitter:0});
  }
  for(const[xx,zz,h]of[[-1.25,1.98,0],[-1.43,1.90,.04],[-1.10,2.08,0]])candle(b,xx,h,zz,PALETTE.spectral);
  b.root.userData.courtyardObjects=['round-moon-pool','curved-stone-bench','silver-chime-tree','white-moon-flowers','candle-cluster'];
}

function skeletonYard(b) {
  const x=-.91,z=.85;
  for(const sx of [-1,1])for(const sz of [-1,1])b.beam('marimba_cross_leg',[x+sx*.46,.06,z+sz*.25],[x-sx*.43,.52,z+sz*.25],.025,'#80735b');
  for(const zz of [z-.22,z+.22])b.beam('marimba_key_rail',[x-.55,.52,zz],[x+.55,.52,zz],.027,PALETTE.wood);
  for(let i=0;i<7;i++){
    const xx=x-.48+i*.16,half=.31-i*.018;
    if(b.broken&&i===2)continue;
    b.beam('marimba_bone_key',[xx,.56,z-half],[xx,.56,z+half],.035,PALETTE.bone);
    for(const zz of[z-half,z+half])b.blob('marimba_bone_joint',xx,.56,zz,.049,.025,.041,PALETTE.bone);
  }
  for(const xx of[-1.11,-.74]){b.beam('bone_mallet',[xx,.59,z-.05],[xx+.13,.60,z+.19],.012,'#756449');b.blob('mallet_head',xx+.13,.61,z+.19,.042,.032,.04,PALETTE.bone);}
  for(const[xx,zz,r,h]of[[.91,1.00,.28,.44],[.58,.61,.16,.46],[1.20,.64,.17,.50]]){
    b.cyl('ossuary_drum_shell',xx,.07,zz,r,r,h,'#70604b',10);
    b.cyl('drum_skin',xx,.07+h,zz,r*.94,r*.94,.018,b.broken?'#847b63':'#c3b99c',10);
    for(const yy of[.10,.06+h])b.torus('drum_iron_rim',xx,yy,zz,r,.017,PALETTE.iron,[Math.PI/2,0,0]);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;b.beam('drum_tension',[xx+Math.cos(a)*r,.11,zz+Math.sin(a)*r],[xx+Math.cos(a)*r,.04+h,zz+Math.sin(a)*r],.008,'#b5a88a');}
    if(b.broken)b.profile('torn_drum_skin',[[0,0],[.13,.02],[-.03,.10]],.005,'#373932',[xx,.101+h,zz],[-Math.PI/2,0,0]);
  }
  b.beam('cymbal_stand',[1.39,.06,1.27],[b.broken?1.50:1.39,b.broken?.56:.87,1.27],.014,PALETTE.iron);
  b.cyl('brass_cymbal',b.broken?1.50:1.39,b.broken?.56:.87,1.27,.24,.06,.043,'#ad9461',12,b.broken?[.35,0,.12]:[0,0,0]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;b.beam('cymbal_tripod',[1.39,.24,1.27],[1.39+Math.cos(a)*.20,.05,1.27+Math.sin(a)*.20],.014,PALETTE.iron);}
  b.cyl('drummer_stool',.91,.07,.34,.15,.15,.26,'#89816b',8);
  const musicX=-.78,musicZ=1.63;
  b.beam('music_stand', [musicX,.06,musicZ],[musicX,b.broken?.20:.69,musicZ],.020,PALETTE.iron);
  if(b.broken){
    slab(b,'fallen_music_desk',musicX,.07,musicZ+.18,.40,.035,.29,PALETTE.iron,.15);
    slab(b,'fallen_sheet_music',musicX,.11,musicZ+.18,.33,.008,.23,'#a59b7d',.15);
  }else{
    b.box('music_desk',musicX,.71,musicZ,.40,.29,.027,PALETTE.iron,[-.16,0,0]);
    b.box('sheet_music',musicX,.734,musicZ+.025,.33,.23,.008,'#cec4a6');
    for(let i=0;i<4;i++)b.box('music_staff_line',musicX,.765+i*.045,musicZ+.036,.27,.004,.005,'#65614e');
    for(let i=0;i<3;i++){const xx=musicX-.09+i*.09;b.blob('music_note',xx,.80+(i%2)*.045,musicZ+.043,.015,.010,.005,'#514e41');}
  }
  b.box('spare_bone_crate',-1.38,.06,.22,.35,.17,.29,'#726449');
  for(let i=0;i<3;i++)b.beam('spare_marimba_bone',[-1.48+i*.09,.25,.13],[-1.42+i*.09,.27,.37],.022,PALETTE.bone);
  b.root.userData.courtyardObjects=['bone-marimba','ossuary-drum-kit','brass-cymbal','sheet-music-stand','checkerboard-stage','spare-bone-crate'];
}

function natureYard(b) {
  const x=-1.05,z=.80;
  b.box('garden_bed_soil',x,.015,z,.82,.12,1.05,'#544735');
  for(const sx of[-1,1])b.box('rough_planter_side',x+sx*.43,.02,z,.055,.22,1.14,'#746344');
  for(const zz of[z-.55,z+.55])b.box('rough_planter_end',x,.02,zz,.89,.22,.055,'#8a7950');
  for(let i=0;i<6;i++){
    const xx=x-.20+(i%2)*.38,zz=z-.31+Math.floor(i/2)*.32;
    if(i%2)mushroom(b,xx,.15,zz,.95,'#a98d5b');
    else for(let j=0;j<5;j++)leaf(b,xx+Math.sin(j*2)*.055,.24+j*.015,zz+Math.cos(j*2)*.04,.14,b.broken?'#9d8e5d':'#789153',j*.6);
  }
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2,xx=.93+Math.cos(a)*.43,zz=1.58+Math.sin(a)*.40;
    if(b.broken&&i===1){b.cyl('fallen_mushroom_cap',xx,.025,zz,.16,.05,.10,'#89704c',7,[.23,0,.19]);continue;}
    mushroom(b,xx,.02,zz,1.7+(i%3)*.26,i%2?'#b7a06c':'#8d7554');
    tuft(b,xx+.07,zz-.09,.17,b.dirty);
  }
  const stumpX=1.21,stumpZ=.37,h=b.broken?.28:.44;
  b.cyl('hollow_stump',stumpX,.02,stumpZ,.25,.20,h,'#776044',9);
  b.cyl('hollow_stump_cut',stumpX,h+.02,stumpZ,.18,.18,.018,'#aa9264',9);
  b.cyl('stump_hollow',stumpX,h+.041,stumpZ,.105,.105,.009,'#493d2d',9);
  groundRing(b,'stump_growth_ring',stumpX,h+.050,stumpZ,.15,.012,'#766144',10);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;root(b,[[stumpX+Math.cos(a)*.12,.15,stumpZ+Math.sin(a)*.12],[stumpX+Math.cos(a)*.32,.02,stumpZ+Math.sin(a)*.32]],.038);}
  for(let i=0;i<5;i++)b.cyl('woven_beehive',-1.19,.03+i*.075,1.89,.25-i*.025,.24-i*.025,.08,'#b49b65',10);
  b.box('beehive_entrance',-1.19,.13,2.15,.11,.055,.012,'#4a4430');
  slab(b,'beehive_foot',-1.19,.012,1.89,.56,.06,.54,'#746449');
  root(b,[[1.55,.02,.22],[1.57,.45,.26],[1.53,.92,.44],[1.31,1.16,.65],[1.17,1.18,.78]],.025);
  root(b,[[1.53,.30,.46],[1.53,.72,.65],[1.30,1.08,.80]],.022);
  for(let i=0;i<8;i++)leaf(b,1.49-i*.03,.42+i*.09,.30+i*.06,.13,b.broken?'#8a7b54':'#708a50',i*.6);
  b.cyl('watering_can',-.64,.02,1.62,.11,.11,.22,'#6d826c',8);
  b.beam('watering_can_spout',[-.55,.16,1.62],[-.35,.24,1.62],.020,'#8a9b7b');
  b.torus('watering_can_handle',-.76,.18,1.62,.10,.016,'#8a9b7b');
  b.root.userData.courtyardObjects=['asymmetric-vegetable-bed','large-mushroom-circle','hollow-tree-stump','woven-beehive','living-twig-trellis','watering-can'];
}

function supernaturalYard(b) {
  for(const[x,z,h,angle]of[[-1.30,.40,.84,-.10],[1.21,.42,1.03,.07],[1.36,1.89,.63,.16]]){
    const height=b.broken?h*.65:h;
    b.profile('rune_menhir',[[-.15,0],[.17,0],[.15,height*.80],[.03,height],[-.12,height*.88]],.22,'#5c5269',[x,.03,z],[0,angle,b.broken?.19:0]);
    b.profile('carved_menhir_rune',[[0,-.10],[.065,0],[0,.10],[-.065,0]],.01,b.broken?'#877387':'#ba9acd',[x,height*.54,z+.13],[],{glow:!b.broken});
  }
  const crystal=new THREE.OctahedronGeometry(.27);crystal.scale(.75,1.65,.75);
  b.add(b.broken?'fallen_focal_crystal':'floating_focal_crystal',crystal,b.broken?'#76617f':'#c3a3df',[0,b.broken?.20:.99,1.18],b.broken?[.3,0,1.2]:[0,.30,0],{glow:!b.broken});
  if(!b.broken)for(let i=0;i<3;i++){const a=i*Math.PI*2/3;b.add('orbiting_crystal',new THREE.OctahedronGeometry(.06),'#a585bd',[Math.cos(a)*.36,.77+Math.sin(a)*.08,1.18+Math.sin(a)*.29],[0,0,.4],{glow:true});}
  const x=-1.22,z=1.84;
  const profile=[[0,0],[.10,0],[.27,.08],[.31,.29],[.25,.42],[.20,.43],[.23,.35],[.24,.16],[.10,.07],[0,.07]];
  b.add('ritual_cauldron',new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),9),'#514653',[x,.07,z]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;b.beam('cauldron_leg',[x+Math.cos(a)*.18,.02,z+Math.sin(a)*.18],[x+Math.cos(a)*.13,.19,z+Math.sin(a)*.13],.027,PALETTE.iron);}
  b.cyl('cauldron_brew',x,.43,z,.204,.204,.015,b.broken?'#4e3f52':'#b28bca',9,[],{glow:!b.broken});
  if(!b.broken)for(let i=0;i<3;i++)glow(b,'brew_mote',x+Math.sin(i*2)*.11,.59+i*.12,z,'#b993d3',.025-i*.004);
  b.profile('spell_lectern_support',[[-.12,0],[.12,0],[.09,.57],[-.09,.57]],.20,'#817181',[-1.25,.02,.89]);
  slab(b,'spell_lectern_top',-1.25,.58,.89,.46,.07,.35,'#9c8a9d',.1);
  for(const sx of[-1,1])slab(b,'open_spellbook',-1.25+sx*.10,.66,.89,.19,.035,.28,'#bcb096',sx*.08);
  for(let i=0;i<3;i++)b.box('book_glyph',-1.27,.70,.80+i*.07,.07,.007,.025,'#696153');
  for(const[xx,zz,col]of[[-1.60,.51,'#817391'],[1.46,1.27,'#75928a']]){
    b.cyl('alchemist_bottle',xx,.02,zz,.06,.045,.22,col,7);
    b.cyl('bottle_cork',xx,.24,zz,.028,.028,.04,'#a58c66',5);
  }
  b.root.userData.courtyardObjects=['large-ritual-circle','floating-central-crystal','three-rune-menhirs','cauldron','spellbook-lectern','potion-bottles'];
}

function yardProps(b) {
  const themes={zombie:['muddy-laundry',zombieYard],ghost:['moon-memorial-garden',ghostYard],skeleton:['bone-music-stage',skeletonYard],nature:['wild-forager-garden',natureYard],supernatural:['central-ritual-court',supernaturalYard]};
  const [layout,build]=themes[b.type];b.root.userData.courtyardLayout=layout;section(b,'ground',()=>yardGround(b));section(b,'props',()=>{build(b);courtyardVariant(b);});
}

function courtyardVariant(b) {
  if(b.variant===1)return;
  if(b.type==='zombie'){
    const color=b.variant===2?'#746348':'#65584b';
    b.box('variant_tool_crate',1.47,.02,.20,.23,.19,.22,color);
    for(const y of[.08,.17])b.box('crate_binding',1.47,y,.318,.24,.022,.012,PALETTE.wood);
    if(b.variant===3)b.box('variant_folded_cloth',1.47,.22,.20,.20,.055,.17,'#9b9a79');
  }else if(b.type==='ghost'){
    if(b.variant===2)candle(b,1.50,.02,1.88,PALETTE.spectral);
    else{
      b.cyl('variant_memorial_stone',-1.48,.02,.82,.12,.09,.29,'#a7b6aa',7);
      b.torus('variant_memorial_moon',-1.48,.43,.82,.10,.013,'#d3d3ba');
    }
  }else if(b.type==='skeleton'){
    b.cyl('variant_yard_drum',1.52,.02,1.86,.14,.14,.22,b.variant===2?'#756650':'#918570',7);
    b.cyl('variant_yard_drum_skin',1.52,.24,1.86,.13,.13,.012,PALETTE.bone,7);
  }else if(b.type==='nature'){
    for(let i=0;i<(b.variant===2?2:3);i++)mushroom(b,-1.55+i*.10,.02,.17,.65,b.variant===2?'#a5895c':'#c0a46f');
  }else{
    b.cyl('variant_ritual_pedestal',1.53,.02,1.57,.10,.08,.18,'#776a7a',6);
    if(b.variant===2)candle(b,1.53,.20,1.57,'#bb96cf');
    else b.add('variant_yard_shard',new THREE.OctahedronGeometry(.095),b.broken?'#756578':'#ae95bd',[1.53,.30,1.57],[0,.2,.1],{glow:!b.broken});
  }
  b.root.userData.courtyardObjects.push(`variant-${b.variant}-detail`);
}

function section(b,name,build) {
  const start=b.root.children.length;build();
  for(const child of b.root.children.slice(start))child.userData.section=name;
}

function courtyard(b) {
  const start=b.root.children.length;section(b,'fence',()=>courtyardFence(b));yardProps(b);
  section(b,'weather',()=>{if(b.dirty)for(let i=0;i<14;i++){
    const x=(i%2?1:-1)*(.77+b.random()*.8),z=.26+b.random()*1.83;
    tuft(b,x,z,.14+b.random()*.12,i%3===0);if(i%3===0)leaf(b,x,.025,z,.07,'#8a7756',i);
  }});
  for(const child of b.root.children.slice(start))child.name='courtyard_'+child.name;
}

/** Three independent states; no textures, network requests, or game globals. */
export function createCrypt(type='zombie',state='clean',{merge=true,buildingOnly=false,variant=1}={}) {
  if(!CRYPTS.some(c=>c.id===type))throw new Error(`Unknown crypt type: ${type}`);
  if(!STATES.some(s=>s.id===state))throw new Error(`Unknown crypt state: ${state}`);
  if(!Number.isInteger(variant)||variant<1||variant>3)throw new Error(`Unknown crypt variant: ${variant}`);
  const b=new Builder(type,state,variant);if(!buildingOnly)section(b,'ground',()=>turf(b));
  const buildingStart=b.root.children.length;
  section(b,'building',()=>{({zombie,ghost,skeleton,nature,supernatural})[type](b);buildingVariant(b);silhouetteVariant(b);});section(b,'weather',()=>weather(b));
  // The tomb occupies the rear half; the forward half is a genuine usable yard.
  if(buildingOnly){b.root.userData.courtyard=false;b.root.userData.component='architecture';}
  else{for(const child of b.root.children.slice(buildingStart))child.position.z-=.85;courtyard(b);}
  // Game-compatible LightAnchor: pos in design units (VOX=.1), range in world
  // units. A small fixed set avoids creating one source for every tiny candle.
  const source={
    zombie:[[-.49,.32,1.04,'#a7ca77',.52,3,.24,.5,'building'],[.48,.32,1.04,'#a7ca77',.52,3,.24,.5,'building']],
    ghost:[[.99,.76,.55,'#88cbbb',.60,3.3,.18,.6,'building'],[-.56,.26,1.16,'#a0d3c4',.48,2.7,.12,.45,'yard']],
    skeleton:[[-1.05,.30,.95,'#f2ac58',.52,3,.25,.5,'building'],[1.05,.30,.95,'#f2ac58',.52,3,.25,.5,'building']],
    nature:[[-.51,.35,1.11,'#e3bb70',.52,3,.25,.5,'building'],[.51,.35,1.11,'#e3bb70',.52,3,.25,.5,'building']],
    supernatural:[[0,1.0,1.18,'#bca1d2',.70,4,.16,.7,'yard'],[0,2.49,-.35,'#bea3d0',.52,3,.12,.5,'building']],
  }[type];
  b.root.userData.lights=b.broken?[]:source.filter(a=>!buildingOnly||a[8]==='building').map(([x,y,z,color,intensity,range,flicker,halo,area])=>({pos:[x*10,y*10,(z-(area==='building'&&!buildingOnly?.85:0))*10],color,intensity,range,flicker,halo}));
  if(merge) consolidate(b.root);
  const box=new THREE.Box3().setFromObject(b.root);
  b.root.userData.bounds={min:box.min.toArray(),max:box.max.toArray()};
  let triangles=0;b.root.traverse(o=>{if(o.isMesh)triangles+=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;});
  b.root.userData.triangles=triangles;return b.root;
}

// One mesh per material bucket, like the game's low-poly kit. The source
// generator still exposes named parts via {merge:false} for editing.
function consolidate(root) {
  const buckets=new Map();
  for(const m of [...root.children])if(m.isMesh){const list=buckets.get(m.material)??[];list.push(m);buckets.set(m.material,list);}
  for(const [material,list] of buckets) {
    if(list.length<2)continue;
    const geos=list.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});
    const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());
    const mesh=new THREE.Mesh(geometry,material);mesh.name=material.transparent?'spectral_details':'stone_and_details';mesh.castShadow=!material.transparent;mesh.receiveShadow=!material.transparent;
    list.forEach(m=>{root.remove(m);m.geometry.dispose();});root.add(mesh);
  }
}
