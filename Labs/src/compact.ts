// Lotto compatto 4 × 3: stessi corpi, annessi accostati e pochi elementi del cortile.
import { LP, type LPModel } from '../../Production/src/render/lowpoly/kit.ts';
import { decayLP } from '../../Production/src/render/lowpoly/lights.ts';
import { flower, grassTuft, hangingLantern, pumpkin } from '../../Production/src/render/lowpoly/details.ts';
import { LPC } from '../../Production/src/render/lowpoly/palette.ts';
import { beam, prof, cloth, torus, type CryptCtx } from '../../Production/src/render/lowpoly/cryptKit.ts';
import { BUILDINGS, slabBetween } from './cryptBuildings.ts';
import { fruitTree } from '../../Production/src/render/lowpoly/architecture.ts';
import { VILLAGE_BUILDINGS, type VillageFamily } from './villageHousesCompact.ts';
import type { Condition, LabCase } from './models.ts';
import { weatheredHouse } from './weathering.ts';

export function compact(item:LabCase, night:boolean, condition:Condition):LPModel {
  const v={type:`crypt_${item.family}`,variant:item.variant,seed:1,lit:night,dirty:condition==='dirty',broken:condition==='broken'};
  const lp=new LP(`lab-compact:${v.type}:${v.variant}:${v.seed}:${+v.dirty}${+v.broken}`);
  const c:CryptCtx={lp,v,family:item.family,variant:(item.variant+1) as 1|2|3,lit:night&&!v.broken};
  lp.push([0,0,-0.2]);
  if(item.family==='ghost') BUILDINGS.ghost(c); else VILLAGE_BUILDINGS[item.family as VillageFamily](c);
  weatheredHouse(c, true);
  lp.pop();
  // Conserviamo piccoli dettagli già presenti nei cortili originali, senza comprimere gli oggetti.
  if(item.family==='ghost') {
    pumpkin(lp,-0.95,0,0.6,0.12,true,c.lit,0.4,1,false);
    if(c.variant===1) {
      // Il laghetto e la panchina della prima variante, accostati alla casa.
      const x=1.08,z=1.04,r=0.28;
      for(let i=0;i<10;i++){const a=i*Math.PI*2/10;lp.blob(x+Math.cos(a)*(r+0.04),0.04,z+Math.sin(a)*(r+0.03),0.065,0.045,0.06,i%2?LPC.stone:LPC.stoneLight,{vary:0.1});}
      lp.cyl(x,0.01,z,r,r,0.035,12,v.broken?'#3d352a':'#2c4a50',{bucket:v.broken?'solid':'water',jitter:0});
      if(!v.broken) {lp.blob(x-0.08,0.055,z,0.09,0.012,0.07,LPC.leaf,{jitter:0});lp.blob(x+0.08,0.065,z+0.06,0.045,0.025,0.045,'#e7a6bf',{jitter:0});}
      for (let i=0;i<5;i++) flower(lp,-1.52+i*0.16,1.12,v.broken?LPC.dry:i%2?'#d6d7bf':'#c9a7e8',0.25);
      pumpkin(lp,-1.5,0,0.7,0.11,false,false);
    } else if(c.variant===2) {
      // Lo spaventapasseri-fantasma e le zucche del suo orto.
      lp.push([-1.3,0,0.9],0.25,0,v.broken?0.16:0);
      beam(lp,[0,0,0],[0,1.32,0],0.03,LPC.woodDark);
      beam(lp,[-0.3,1.02,0],[0.3,1.02,0],0.025,LPC.woodDark);
      lp.blob(0,1.23,0,0.15,0.18,0.14,'#e8ebe6',{detail:1,jitter:0.004});
      lp.cyl(0,0.68,0,0.21,0.12,0.49,8,'#e8ebe6',{vary:0.05});
      for(const sx of [-1,1])lp.blob(sx*0.055,1.27,0.13,0.02,0.03,0.01,'#1f2a2c',{jitter:0});
      lp.cyl(0,1.4,0,0.22,0.22,0.03,10,LPC.woodDark,{jitter:0});
      lp.cyl(0,1.43,0,0.1,0.02,0.25,8,LPC.woodDark,{jitter:0.004});lp.pop();
      lp.box(1.05,0,1.08,0.8,0.06,0.42,LPC.soil,{bevel:0.02,vary:0.1});
      for(const x of [0.78,1.03,1.28])pumpkin(lp,x,0.06,1.08,0.095,false,false);
    } else {
      // Un alberello e i fiori del frutteto della terza variante.
      fruitTree(lp,1.27,1.05,v.broken?'#6b5a3a':'#c8402e',0.65);
      for(let i=0;i<5;i++) flower(lp,-1.55+i*0.17,1.23,v.broken?LPC.dry:['#e7a6bf','#d6cdb9','#c9a7e8'][i%3],0.23);
      pumpkin(lp,-1.5,0,0.68,0.1,false,false);
    }
  } else if(item.family==='florist') {
    // L'aiuola e la carriola di fiori del giardino originale.
    lp.box(1.12,0,1.12,1.0,0.07,0.42,LPC.soil,{bevel:0.01});
    for(let i=0;i<6;i++) flower(lp,0.7+i*0.16,1.12,v.broken?LPC.dry:LPC.flowers[i%LPC.flowers.length],0.24);
    const x=-1.48,z=0.84;
    torus(lp,x,0.16,z-0.25,0.14,0.035,LPC.iron,[0,Math.PI/2,0]);
    for(const sx of [-1,1]) {
      beam(lp,[x+sx*0.2,0.25,z-0.25],[x+sx*0.2,0.36,z+0.2],0.022,'#6d5c44');
      beam(lp,[x+sx*0.2,0.36,z+0.2],[x+sx*0.2,0.42,z+0.53],0.022,'#9b8058');
      beam(lp,[x+sx*0.18,0.02,z+0.2],[x+sx*0.18,0.33,z+0.16],0.022,LPC.iron);
    }
    lp.box(x,0.3,z,0.46,0.16,0.48,'#6e775d',{bevel:0.01,vary:0.08});
    for(let i=0;i<6;i++)if(!v.broken||i%2===0)lp.blob(x-0.14+(i%3)*0.14,0.51,z-0.08+Math.floor(i/3)*0.16,0.065,0.055,0.065,v.broken?LPC.dry:LPC.flowers[i%LPC.flowers.length],{jitter:0.006});
  } else if(item.family==='rectory') {
    for(const x of [-1.48,-0.76]) beam(lp,[x,0,1.05],[x,0.95,1.05],0.025,LPC.woodDark);
    beam(lp,[-1.48,0.95,1.05],[-0.76,0.95,1.05],0.009,'#b4a78a');
    if(!v.broken) {
      prof(lp, [[-0.14,0],[-0.26,-0.12],[-0.2,-0.24],[-0.14,-0.18],[-0.2,-0.82],[0.2,-0.82],[0.14,-0.18],[0.2,-0.24],[0.26,-0.12],[0.14,0],[0.06,-0.05],[-0.06,-0.05]], 0.018, '#24252c', [-1.12,0.92,1.05], [0,-0.1,0.03], {ao:0.1});
      lp.box(-1.12,0.83,1.07,0.07,0.04,0.01,'#eeeae0',{jitter:0});
    } else cloth(lp,-1.12,0.04,0.9,0.4,0.5,'#24252c',{laid:true,ragged:true});
    // La vaschetta con il corvo e qualche giglio.
    const x=1.42,z=1.02;
    lp.lathe(x,0,z,[[0.14,0],[0.09,0.06],[0.06,0.45],[0.2,0.52],[0.24,0.6],[0,0.6]],9,LPC.stoneLight,{vary:0.05,ao:0.2});
    lp.cyl(x,0.6,z,0.2,0.2,0.012,9,v.broken?'#3d352a':LPC.water,{bucket:v.broken?'solid':'water',jitter:0});
    if(!v.broken){lp.blob(x+0.15,0.72,z,0.07,0.06,0.05,'#25272c',{jitter:0});lp.blob(x+0.1,0.77,z,0.04,0.04,0.04,'#25272c',{jitter:0});}
    for(let i=0;i<4;i++)flower(lp,0.65+i*0.15,1.2,v.broken?LPC.dry:'#eeeae0',0.28);
  } else if(item.family==='lamplighter') {
    // Il tavolino con la lanterna e la botte dell'olio.
    const x=1.3,z=1.03;
    lp.cyl(x,0,z,0.08,0.05,0.5,6,LPC.woodDark,{jitter:0});
    lp.cyl(x,0.5,z,0.27,0.27,0.04,10,LPC.wood,{vary:0.08});
    lp.box(x-0.05,0.54,z,0.11,0.17,0.11,c.lit?LPC.lantern:'#3c3a35',{bucket:c.lit?'glow':'solid',jitter:0});
    lp.box(x-0.05,0.71,z,0.13,0.025,0.13,LPC.iron,{jitter:0});
    if(c.lit)lp.light(x-0.05,0.65,z,LPC.lantern,0.5,2.4,0.2,0.2);
    lp.cyl(1.7,0,1.0,0.12,0.11,0.32,7,LPC.woodDark,{vary:0.08});
    lp.lathe(-1.58,0,0.86,[[0.17,0],[0.21,0.12],[0.22,0.25],[0.21,0.38],[0.17,0.5],[0,0.5]],10,'#6b5240',{vary:0.08,ao:0.2});
    hangingLantern(lp,-1.58,0.5+0.38*0.7,0.86,c.lit,0.7);
    for(const y of [0.08,0.42])torus(lp,-1.58,y,0.86,0.2,0.014,LPC.iron,[Math.PI/2,0,0]);
  } else {
    // Orto e sdraio del Mietitore in pensione.
    lp.box(1.2,0,1.08,0.7,0.07,0.43,LPC.soil,{bevel:0.01});
    for(const x of [0.98,1.2,1.42]) {beam(lp,[x,0.05,1.08],[x,0.55,1.08],0.012,'#b8a27c');lp.blob(x,0.35,1.08,0.1,0.15,0.1,v.broken?LPC.dry:LPC.leaf,{jitter:0.01});if(!v.broken)lp.blob(x,0.28,1.13,0.04,0.04,0.04,'#c8402e',{jitter:0});}
    lp.push([-1.16,0,1.0],0.2);
    if(!v.broken){
      for(const side of [-1,1]){beam(lp,[side*0.27,0,0.36],[side*0.27,0.72,-0.32],0.022,LPC.wood);beam(lp,[side*0.27,0,-0.16],[side*0.27,0.32,0.3],0.022,LPC.wood);}
      lp.push([0,0,0],Math.PI/2);
      for(let k=0;k<5;k++){const z=-0.2+k*0.1,col=k%2?'#d8cdb3':'#6a557a';slabBetween(c,[-0.3,0.33],[0,0.2],z,0.1,0.018,col);slabBetween(c,[0,0.2],[0.3,0.7],z,0.1,0.018,col);}lp.pop();
    } else {for(const side of [-1,1])beam(lp,[side*0.26,0.02,0.35],[side*0.3,0.05,-0.3],0.02,LPC.wood);cloth(lp,0,0.04,0,0.45,0.45,'#6a557a',{laid:true,ragged:true});}
    lp.pop();
    // La falce del Mietitore, appoggiata accanto alla sdraio anche nel lotto compatto.
    lp.push([-1.12, 0, 0.55], 0.15, 0, v.broken ? -0.65 : -0.12);
    beam(lp,[0,0,0],[0,1.22,0],0.024,'#6b5240');
    beam(lp,[0,0.68,0],[0.12,0.72,0],0.016,'#6b5240');
    prof(lp, [[0,0],[-0.25,-0.11],[-0.48,-0.1],[-0.56,-0.03],[-0.3,-0.03]], 0.02, '#8d969b', [0,1.2,0], [0,0,0], {ao:0});
    lp.pop();
    for(let i=0;i<3;i++)flower(lp,0.55+i*0.16,0.82,v.broken?LPC.dry:'#8f7aa8',0.26);
  }
  // Ciuffi dello stesso prato del gioco lungo i bordi, senza coprire l'ingresso.
  for(const [x,z] of [[-1.72,-1.15],[1.72,-1.15],[-1.72,1.26],[1.72,1.25],[-1.8,0.42],[1.8,0.42],[-0.62,1.3],[0.58,1.3]] as const) grassTuft(lp,x,z,0.8);
  decayLP(lp,v,3.4,2.4);
  return lp.build();
}
